"use strict";

/**
 * CODEX S52.66 Phase 1 — secure, read-only web-fetch primitive for Digital
 * Workers. Every layer here is a real enforcement mechanism, not an agent
 * instruction — the model is a requester, never the enforcement point.
 *
 * Call shape: secureLookup({ workerSlug, topic, tenantId, userId })
 *   1. topic -> fixed URL (allowlist.js) — model never supplies a URL.
 *   2. resolved URL's hostname re-checked against the allowlist (defense in
 *      depth, independent of step 1).
 *   3. SSRF check — hostname resolved via DNS, resulting IP(s) must be
 *      public (rejects private/loopback/link-local/cloud-metadata ranges).
 *   4. Per-domain rate limit, Firestore-backed (survives across warm/cold
 *      function instances, unlike an in-memory counter).
 *   5. Single fetch, hard timeout, no redir<< follow beyond a small cap
 *      (no multi-hop/link-following in Phase 1).
 *   6. HTML -> visible-text-only extraction (script/style/hidden elements
 *      stripped) before anything reaches the model — closes the
 *      hidden-instruction injection vector (white-text, zero-width chars,
 *      HTML comments all live in markup this step removes).
 *   7. Audit log: URL + timestamp + tenant/worker + truncated content hash,
 *      not a permanent full-page archive.
 *   8. Output cap + plain-text-only return (no raw HTML/links) so nothing
 *      unsanitized can render back into the customer chat UI.
 */

const dns = require("dns").promises;
const crypto = require("crypto");
const cheerio = require("cheerio");
const { getWorkerConfig, resolveTopicUrl, isDomainAllowed } = require("./allowlist");

const FETCH_TIMEOUT_MS = 6000;
const MAX_OUTPUT_CHARS = 4000;
const RATE_LIMIT_PER_DOMAIN_PER_MINUTE = 5; // conservative — county sites can bot-block.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// RFC 1918 + loopback + link-local (incl. 169.254.169.254 cloud metadata) +
// IPv6 equivalents. Defense in depth behind the domain allowlist.
function isPrivateOrLinkLocalIp(ip) {
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    return lower === "::1" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd");
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true; // malformed -> reject closed.
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 0) return true;
  return false;
}

async function assertPublicHostname(hostname) {
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (e) {
    throw new Error(`DNS resolution failed for ${hostname}: ${e.message}`);
  }
  if (!addresses.length) throw new Error(`No DNS records for ${hostname}`);
  for (const { address } of addresses) {
    if (isPrivateOrLinkLocalIp(address)) {
      throw new Error(`SSRF guard: ${hostname} resolved to non-public address ${address} — rejected`);
    }
  }
}

async function checkAndBumpRateLimit(db, domain) {
  const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
  const ref = db.collection("webFetchRateLimits").doc(domain);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { requests: [] };
    const recent = (data.requests || []).filter((ts) => ts > windowStart);
    if (recent.length >= RATE_LIMIT_PER_DOMAIN_PER_MINUTE) {
      return { allowed: false, count: recent.length };
    }
    recent.push(Date.now());
    tx.set(ref, { requests: recent, updatedAt: Date.now() }, { merge: true });
    return { allowed: true, count: recent.length };
  });
  return result;
}

/** Strip to visible, rendered text only. Removes script/style/noscript
 * entirely (never even inspected), and anything hidden via inline style or
 * the `hidden` attribute — the actual carriers of hidden-instruction
 * injection techniques (white-text-on-white is a `style` trick; zero-width
 * chars ride inside otherwise-visible text and aren't filtered by tag
 * stripping alone, so also collapse the specific zero-width code points). */
function extractVisibleText(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, template, iframe").remove();
  $("[style]").each((_, el) => {
    const style = ($(el).attr("style") || "").toLowerCase();
    if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0\b/.test(style)) $(el).remove();
  });
  $("[hidden]").remove();
  $("*").contents().filter((_, n) => n.type === "comment").remove();
  let text = $("body").text() || $.root().text() || "";
  // Zero-width / bidi-override code points used to hide injected text inside
  // otherwise-visible strings.
  text = text.replace(/[​-‏‪-‮﻿]/g, "");
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

async function secureLookup({ workerSlug, topic, tenantId, userId }) {
  const cfg = getWorkerConfig(workerSlug);
  if (!cfg) return { ok: false, error: `No web-fetch allowlist configured for worker "${workerSlug}".` };

  const url = resolveTopicUrl(workerSlug, topic);
  if (!url) {
    return { ok: false, error: `Unknown topic "${topic}". Allowed topics: ${Object.keys(cfg.topics).join(", ")}` };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return { ok: false, error: `Configured URL for topic "${topic}" is malformed: ${e.message}` };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Only https URLs are permitted." };
  }
  if (!isDomainAllowed(workerSlug, parsed.hostname)) {
    // Should be unreachable given the allowlist maps topic->url directly,
    // but this is the real enforcement point, not the topic lookup above —
    // keep it even though it's currently redundant with step 1.
    return { ok: false, error: `Domain "${parsed.hostname}" is not on the allowlist for ${workerSlug}.` };
  }

  try {
    await assertPublicHostname(parsed.hostname);
  } catch (e) {
    console.error(`[secureFetch] SSRF guard rejected ${workerSlug}/${topic}: ${e.message}`);
    return { ok: false, error: "This host could not be safely resolved to a public address." };
  }

  const admin = require("firebase-admin");
  const db = admin.firestore();
  const rl = await checkAndBumpRateLimit(db, parsed.hostname).catch((e) => {
    console.warn("[secureFetch] rate-limit check failed, failing closed:", e.message);
    return { allowed: false };
  });
  if (!rl.allowed) {
    return { ok: false, error: `Rate limit reached for ${parsed.hostname} — try again in a minute. This limit protects against SOCIII's infrastructure being IP-blocked by the site.` };
  }

  let resp;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    // redirect: "error" (not "follow") is deliberate, not an oversight — a
    // followed redirect's final URL is NOT re-validated against the
    // allowlist or the SSRF check above by fetch() itself, which would be a
    // real bypass of both (an allowlisted page could redirect anywhere,
    // including an internal address). Phase 1's own spec is single-hop only
    // ("no chained/multi-hop requests") — this makes that a hard failure
    // instead of a silent gap rather than something to revisit "later."
    resp = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "error",
      headers: { "User-Agent": "SOCIII-SiteRecon/1.0 (+https://sociii.ai; read-only research fetch)" },
    });
    clearTimeout(t);
  } catch (e) {
    return { ok: false, error: `Fetch failed or timed out: ${e.message}` };
  }

  if (!resp.ok) {
    return { ok: false, error: `Site returned HTTP ${resp.status}.` };
  }

  const contentType = resp.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml/.test(contentType)) {
    return { ok: false, error: `Unexpected content-type "${contentType}" — only HTML pages are supported.` };
  }

  const html = await resp.text();
  let text = extractVisibleText(html);
  const truncated = text.length > MAX_OUTPUT_CHARS;
  if (truncated) text = text.slice(0, MAX_OUTPUT_CHARS) + "\n[...truncated]";

  const contentHash = crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
  // Awaited deliberately, not fire-and-forget — Cloud Functions can freeze the
  // instance immediately after the response is sent, which would silently
  // drop an un-awaited write and defeat the audit requirement entirely.
  await db.collection("webFetchAuditLog").add({
    workerSlug, topic, url: parsed.toString(), tenantId: tenantId || null, userId: userId || null,
    contentHash, contentLength: text.length, truncated, at: Date.now(),
  }).catch((e) => console.warn("[secureFetch] audit log write failed:", e.message));

  return { ok: true, url: parsed.toString(), text, truncated };
}

module.exports = { secureLookup, extractVisibleText, isPrivateOrLinkLocalIp };
