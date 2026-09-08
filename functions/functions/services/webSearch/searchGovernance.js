"use strict";

/**
 * CODEX S52.66 Phase 1.5 (2026-09-07) — governance layer for the general
 * `web_search` / `fetch_url` tools that are pushed into EVERY worker's tool
 * list unconditionally (functions/functions/index.js). Those tools existed
 * already (real Brave/Wikipedia/HN search, real unrestricted fetch) but had
 * ZERO consent gate, ZERO SSRF protection on fetch_url, ZERO cost tracking,
 * and ZERO RAAS governance beyond a one-line tool description — this file is
 * the real enforcement Sean asked for, on top of what already existed.
 *
 * Three real, code-enforced mechanisms live here, matched to what this
 * codebase's request architecture can actually enforce (one HTTP request per
 * user chat turn; a tool call gets exactly one follow-up model completion in
 * the SAME request):
 *
 *   1. Per-use consent gate (askThenConfirm). A tool call arrives with
 *      `userConfirmed` unset/false the first time. The handler records an
 *      "ask" doc in Firestore and returns a tool_result telling the model to
 *      ask the human and stop — critically, the caller must build that
 *      follow-up completion WITHOUT `tools`, so the model cannot chain
 *      straight into a confirmed call inside the same request. That makes a
 *      real human turn (a genuinely new HTTP request) structurally required
 *      before `userConfirmed:true` can ever be honored — not just an
 *      instruction the model could ignore. See verifyAndConsumeConsent().
 *   2. Real per-tenant daily cap (checkDailyCap) so a runaway loop or a
 *      chatty user can't rack up unbounded search cost — separate from and
 *      in addition to per-call billing.
 *   3. SSRF guard for fetch_url (assertPublicUrl), reusing the same
 *      DNS-resolution + private/link-local/cloud-metadata IP rejection Phase
 *      1's secureFetch.js already implements — fetch_url had none of this
 *      despite being a real, unrestricted, model-triggerable URL fetch
 *      reachable by every worker in production today.
 *
 * Billing hooks into the EXISTING services/billing/dataFee.js universal
 * data-fee system (recordDataFee) rather than inventing a new one.
 */

const admin = require("firebase-admin");
const crypto = require("crypto");
const { assertPublicHostname } = require("../webFetch/secureFetch");

const ASK_TTL_MS = 15 * 60 * 1000; // 15 min — stale asks can't be replayed long after context has moved on.
const DAILY_CAP_PER_TENANT = 40; // conservative default; raise once real usage/cost patterns are known.

function getDb() { return admin.firestore(); }

function normalizeKey(toolName, input) {
  if (toolName === "web_search") return String(input?.query || "").trim().toLowerCase();
  if (toolName === "fetch_url") return String(input?.url || "").trim();
  return JSON.stringify(input || {});
}

function askDocRef(db, { tenantId, workerSlug, userId }) {
  const id = `${tenantId || "personal"}_${workerSlug}_${userId}`.replace(/[/]/g, "_");
  return db.collection("webToolConsentAsks").doc(id);
}

/**
 * Record that the worker is asking the human for permission for a specific
 * tool call. Called when userConfirmed is not (yet) true. Overwrites any
 * prior ask for this tenant/worker/user (only the most recent ask is valid —
 * asking again about something new invalidates an old pending ask).
 */
async function recordAsk({ tenantId, workerSlug, userId, toolName, input }) {
  const db = getDb();
  const ref = askDocRef(db, { tenantId, workerSlug, userId });
  const key = normalizeKey(toolName, input);
  await ref.set({
    toolName,
    key,
    input: input || {},
    askedAt: Date.now(),
  });
  return { key };
}

/**
 * Verify a userConfirmed:true call against a real, prior, matching ask —
 * and consume it (single-use) so it can't be replayed for a later, different
 * query. Returns { ok:true } only if a genuine prior ask exists, matches this
 * exact tool+input, and hasn't expired.
 */
async function verifyAndConsumeConsent({ tenantId, workerSlug, userId, toolName, input }) {
  const db = getDb();
  const ref = askDocRef(db, { tenantId, workerSlug, userId });
  const key = normalizeKey(toolName, input);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { ok: false, reason: "no_prior_ask" };
      const data = snap.data();
      if (data.toolName !== toolName) return { ok: false, reason: "tool_mismatch" };
      if (data.key !== key) return { ok: false, reason: "input_changed" };
      if (Date.now() - (data.askedAt || 0) > ASK_TTL_MS) return { ok: false, reason: "expired" };
      tx.delete(ref); // single-use — a fresh ask is required for the next call.
      return { ok: true };
    });
  } catch (e) {
    console.warn("[searchGovernance] verifyAndConsumeConsent failed, failing closed:", e.message);
    return { ok: false, reason: "error" };
  }
}

/**
 * Real per-tenant (or per-user for personal-vault workers) daily cap,
 * Firestore-transaction-backed so it survives cold starts and concurrent
 * requests, same pattern as Phase 1's per-domain rate limit.
 */
async function checkDailyCap({ tenantId, userId }) {
  const db = getDb();
  const day = new Date().toISOString().slice(0, 10);
  const key = `${tenantId || userId || "unknown"}_${day}`;
  const ref = db.collection("webToolDailyUsage").doc(key);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = snap.exists ? (snap.data().count || 0) : 0;
      if (count >= DAILY_CAP_PER_TENANT) {
        return { ok: false, count, limit: DAILY_CAP_PER_TENANT };
      }
      tx.set(ref, { count: count + 1, day, tenantId: tenantId || null, userId: userId || null, updatedAt: Date.now() }, { merge: true });
      return { ok: true, count: count + 1, limit: DAILY_CAP_PER_TENANT };
    });
  } catch (e) {
    console.warn("[searchGovernance] checkDailyCap failed, failing OPEN (non-fatal usage cap):", e.message);
    return { ok: true, count: null, limit: DAILY_CAP_PER_TENANT, degraded: true };
  }
}

/**
 * SSRF guard for fetch_url — this tool had NONE of Phase 1's protections
 * (no allowlist by design, since it's a general "read any public URL" tool,
 * but that makes the SSRF guard non-optional). Rejects non-http(s), rejects
 * hostnames that resolve to private/loopback/link-local/cloud-metadata IPs.
 */
async function assertPublicUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (e) {
    throw new Error(`Malformed URL: ${e.message}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Only http/https URLs are permitted (got "${parsed.protocol}").`);
  }
  // BUG FOUND BY LIVE TEST (2026-09-07): isPrivateOrLinkLocalIp() is written
  // to fail closed on anything that isn't a valid dotted-decimal/IPv6 string
  // (secureFetch.js's own comment: "malformed -> reject closed") — it expects
  // an already-resolved IP, never a hostname. Calling it directly on
  // parsed.hostname here rejected EVERY normal domain name (e.g.
  // "www.henderson-county.com" splits into 3 non-numeric parts, so the
  // 4-part dotted-decimal check fails and it's treated as "malformed" and
  // blocked) — this would have made fetch_url non-functional for ~100% of
  // real URLs. Removed: assertPublicHostname() below already does a real DNS
  // lookup and applies isPrivateOrLinkLocalIp() only to the resolved IP
  // address(es), which correctly covers a literal-IP hostname too (Node's
  // dns.lookup() resolves a literal IP to itself, no network call needed).
  await assertPublicHostname(parsed.hostname);
  return parsed;
}

/**
 * Strip likely prompt-injection directive lines from a search snippet before
 * it reaches the model. Brave/Wikipedia/HN return structured JSON snippets,
 * not raw HTML, so the injection surface is much smaller than Phase 1's
 * page-fetch case — this is a best-effort heuristic filter, NOT a substitute
 * for the ws-untrusted-content hard_stop in web_search_governance_v1.json,
 * which is the real defense (treat all of it as data, never instructions).
 */
function sanitizeSnippet(text) {
  if (!text) return text;
  let out = text.replace(/[​-‏‪-‮﻿]/g, ""); // zero-width/bidi-override chars
  out = out.replace(/^(system|assistant|user)\s*:\s*/gim, ""); // fake role markers at line start
  return out;
}

/**
 * Awaited audit log — scoped (query/url + tenant/worker/user + timestamp),
 * not a full result archive. Awaited deliberately (Phase 1's fire-and-forget
 * audit write was found to be silently droppable on a frozen container).
 */
async function auditLog({ tenantId, userId, workerSlug, toolName, detail }) {
  try {
    await getDb().collection("webToolAuditLog").add({
      tenantId: tenantId || null,
      userId: userId || null,
      workerSlug: workerSlug || null,
      toolName,
      detail: String(detail || "").slice(0, 500),
      at: Date.now(),
    });
  } catch (e) {
    console.warn("[searchGovernance] audit log write failed:", e.message);
  }
}

module.exports = {
  recordAsk,
  verifyAndConsumeConsent,
  checkDailyCap,
  assertPublicUrl,
  sanitizeSnippet,
  auditLog,
  DAILY_CAP_PER_TENANT,
};
