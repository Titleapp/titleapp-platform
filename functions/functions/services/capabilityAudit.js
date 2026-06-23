"use strict";

/**
 * capabilityAudit.js — Surface 4 (CODEX 2026-06-22): the moat / sale memo.
 *
 * The audit found that contracts/capabilities.json (the declared permission
 * matrix) is NEVER read at runtime, and `auditLedger` (the structured
 * capability-invocation ledger) is written by exactly one TEST stub. So the
 * headline moat claim — "every governed action records who did what, under which
 * verdict, append-only" — was not actually wired. This module turns it on:
 *
 *   - loadCapabilities()  reads the registry that ships INSIDE the function
 *     package (functions/functions/contracts/capabilities.json, kept in sync
 *     with the canonical repo-root contracts/capabilities.json by a firebase
 *     predeploy hook — root is the single source of truth).
 *   - checkCapability()   SHADOW-mode registry check (red-team RT2: log what we
 *     WOULD block before we enforce). Never blocks yet — it records the verdict.
 *   - recordInvocation()  writes a REAL auditLedger entry (isTestAnchor:false)
 *     with caller identity, capability id, input/output SHA-256 hashes, and the
 *     registry verdict. This is the artifact an acquirer / Anthropic actually
 *     inspects.
 */

const admin = require("firebase-admin");
const { sha256 } = require("./signatureService/blockchain");

let _caps = null;

function loadCapabilities() {
  if (_caps) return _caps;
  let data = null;
  try {
    // Runtime copy bundled with the function (see firebase.json predeploy).
    data = require("../contracts/capabilities.json");
  } catch (e) {
    console.warn("[capabilityAudit] capabilities.json not bundled with function:", e.message);
  }
  const list = data && Array.isArray(data.capabilities) ? data.capabilities : [];
  const byId = {};
  for (const c of list) byId[c.id] = c;
  _caps = {
    byId,
    callerTypes: (data && data.callerTypes) || [],
    count: list.length,
    loaded: !!data,
    version: (data && data.version) || null,
  };
  return _caps;
}

function db() { return admin.firestore(); }

function hash(v) {
  try { return sha256(JSON.stringify(v === undefined ? null : v)); } catch (_) { return null; }
}

/**
 * SHADOW-mode registry check. Returns { found, allowed, wouldBlock, reason, capability }.
 * `allowed` is always true for now — we record what we *would* block so we can
 * verify the matrix is correct before flipping enforcement on (RT2).
 */
function checkCapability(capabilityId, { callerType } = {}) {
  const caps = loadCapabilities();
  const cap = caps.byId[capabilityId];
  if (!cap) {
    return { found: false, allowed: true, wouldBlock: false, reason: "capability not declared in registry (ungoverned)", capability: null };
  }
  let wouldBlock = false, reason = null;
  if (callerType && Array.isArray(cap.allowedCallers) && cap.allowedCallers.length && !cap.allowedCallers.includes(callerType)) {
    wouldBlock = true;
    reason = `caller '${callerType}' not in allowedCallers [${cap.allowedCallers.join(", ")}]`;
  }
  return { found: true, allowed: true, wouldBlock, reason, capability: cap };
}

/**
 * Write a REAL capability-invocation record to auditLedger (not the test stub).
 * Best-effort: never throws into the caller — audit must not break the action.
 */
async function recordInvocation({ capabilityId, tenantId, userId, callerType, input, output, rulesVerdict, extra }) {
  try {
    const check = checkCapability(capabilityId, { callerType });
    const cap = check.capability;
    const ref = db().collection("auditLedger").doc();
    await ref.set({
      actionId: ref.id,
      capabilityId,
      capabilityClass: cap ? cap.class || null : null,
      actionType: capabilityId,
      tenantId: tenantId || null,
      userId: userId || null,
      callerType: callerType || "human",
      inputHash: hash(input),
      outputHash: hash(output),
      registryFound: check.found,
      verdict: { allowed: check.allowed, wouldBlock: check.wouldBlock, reason: check.reason || null },
      enforcementMode: "shadow",
      rulesVerdict: rulesVerdict || null,
      ...(extra && typeof extra === "object" ? { meta: extra } : {}),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isTestAnchor: false,
    });
    if (check.wouldBlock) {
      console.warn(`[capabilityAudit] SHADOW would-block ${capabilityId}: ${check.reason}`);
    }
    return { recorded: true, actionId: ref.id, wouldBlock: check.wouldBlock, registryFound: check.found };
  } catch (e) {
    console.warn(`[capabilityAudit] recordInvocation failed for ${capabilityId}:`, e.message);
    return { recorded: false, error: e.message };
  }
}

module.exports = { loadCapabilities, checkCapability, recordInvocation };
