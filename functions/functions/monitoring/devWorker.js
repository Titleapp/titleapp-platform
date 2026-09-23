"use strict";

// ----------------------------------------------------------------------------
// Dev — the back-of-house IT/ops worker (CODEX 100)
// ----------------------------------------------------------------------------
// Not a new monitoring system — an extension of the existing
// workerCanary.js/chatCanary.js pattern (findings shape, health doc, history
// collection, de-duplicated alerting), with a worker identity on top so it
// registers in digitalWorkers like Ivy/Max/Jordan instead of being a silent
// cron job. Per CODEX 100's own explicit correction: every check here is
// DETERMINISTIC CODE with a defined pass/fail condition — no LLM judging
// findings or freely generating fixes. A future persona layer may narrate
// these findings in Dev's voice for the staff meeting; it does not decide
// what they are.
//
// REAL INCIDENT, 2026-09-23, caught by the first live scheduled run under
// Dev's new dedicated read-only service account (see CODEX 100 changelog):
// this module used to write its own results directly (healthRef.set(),
// devFindings.add()) and call sendAlerts() (Twilio/SendGrid). Once Dev
// actually ran under `dev-worker-readonly` (datastore.viewer only, no
// Secret Manager bindings), the real 08:00 UTC scheduled run threw
// PERMISSION_DENIED — the read-only IAM fact CODEX 100 asked for was
// real, and this module hadn't been redesigned around it yet. Fixed: this
// file is now READ-ONLY, full stop — it computes findings and hands the
// result to recordFindings(), which POSTs to a narrow internal endpoint
// hosted by `api` (broader identity, has the Twilio/SendGrid secrets) that
// does the actual writing and alerting. Dev diagnoses; it does not persist
// or notify — a second instance of the same principle CODEX 100 already
// applied to `proposedFix` (templated, not freely generated).
//
// A related, subtler fix: capabilityGates.js's rate-limiter-live and
// correction-protocol-auto-suspend predicates prove themselves by writing
// then deleting real test documents (deliberately — see that file's own
// header on why a stub returning `true` must be indistinguishable from
// nothing). Executing those predicates from HERE, under a read-only
// identity, would throw a permission error that looks exactly like "the
// safeguard is broken" — a false alarm baked into Dev's own design, not a
// real finding. Fixed: for those two specifically, this module checks the
// predicate isn't an obvious hardcoded stub (source-shape check) instead
// of executing it. The other two predicates (disclosure-footer,
// task-canary) are genuinely read-only and are still actually executed.
//
// Write target, confirmed (red-team round 4 asked): both predicates write
// only to a disposable doc keyed by a reserved test slug that can never
// collide with a real persona ("gate-self-test-rate-limiter" /
// "gate-self-test-correction", not ivy/max/jordan/etc.) —
// personaEmailSafety/{testSlug} and, for the correction predicate,
// personaEmailCorrections docs it deletes by id immediately after. Nothing
// here touches real config or a real persona's state. The scenario this
// check exists to catch (IAM quietly loosened) makes the write briefly
// succeed instead of throwing, but even then it's a disposable test doc
// under test-only ids, cleaned up in the same call — functionally inert
// either way, not a risk to production state.
//
// v1 checks (CODEX 100, in priority order):
//   1. Gate-registry integrity — see above for the read-only redesign.
//   2. Gmail watch health — active/expired/expiring, cross-checked against
//      an approximate read-only gate-pass signal from check 1.
//   3. Pending moderation-queue age (pendingPersonaEmailApprovals).
//   4a. personaEmailApprovalExpirySweep heartbeat — the sweep is now a
//      safety-critical fail-safe (expires stuck approvals unsent), so it
//      gets the same "silence isn't green" treatment Dev applies to itself.
//   5. workerCanary.js's current reds/warns, surfaced for visibility only —
//      NOT re-alerted (workerCanary already pages for its own reds; paging
//      twice for the same incident is exactly what CODEX 100 flags to avoid).
// Explicitly NOT built here (see CODEX 100 for why): #4 config/dependency
// existence (moved to deploy-time validation), #6 permission drift
// (blocked on the enforcement build). #7 (watching Dev itself) lives in
// workerCanary.js, not here — Dev cannot be the only thing checking Dev.
// ----------------------------------------------------------------------------

const admin = require("firebase-admin");

const HEALTH_DOC = "config/devHealth";

const EXPECTED_GATE_IDS = [
  "rate-limiter-live",
  "disclosure-footer-enforced-in-code",
  "correction-protocol-auto-suspend",
  "task-canary-passing",
];

// These predicates prove themselves via real Firestore writes (by design —
// see capabilityGates.js). Dev's identity is deliberately read-only, so it
// cannot safely re-execute them; a permission error here would be a false
// alarm, not a real finding.
const WRITE_BASED_PREDICATE_IDS = new Set(["rate-limiter-live", "correction-protocol-auto-suspend"]);

function looksLikeHardcodedStub(fn) {
  if (typeof fn !== "function") return true; // not even a function — worse than a stub
  const stripped = fn.toString().replace(/\s+/g, " ").trim();
  // A predicate whose entire body is just a static pass:true literal, with
  // no awaiting or branching, is exactly the "stubbed true" failure mode
  // round-2 red-team flagged tamper detection to catch. Checks both an
  // explicit `return { pass: true }` (function body) and arrow-shorthand
  // implicit return `=> ({ pass: true })` — caught a real gap in testing:
  // the first version only matched `return {...}` and completely missed
  // `async () => ({ pass: true })`, a very natural way to write a quick
  // stub, so this is a secondary heuristic layered on top of hash-pinning
  // (the real defense), not the sole one — proportionate, not adversarial-proof.
  const isTrivialReturn = /return\s*\{\s*pass:\s*true\s*\}\s*;?\s*\}?\s*$/.test(stripped)
    || /=>\s*\(\s*\{\s*pass:\s*true\s*\}\s*\)\s*;?\s*$/.test(stripped);
  return isTrivialReturn && !/await|if\s*\(/.test(stripped);
}

// A write-based predicate run under Dev's read-only identity is expected
// to fail with a permission-denied-flavored error — that's the healthy
// outcome, not a false alarm.
//
// 2026-09-23 — red-team round 4 correction (external review): the first
// version of this classified purely by matching e.message text, which
// drifts silently if a future GCP client library version or API response
// shape changes the wording — a real denial could stop matching (weakening
// the signal) or, worse, some unrelated error could start matching
// (masking a real problem). Fixed: capabilityGates.js's two write-based
// predicates now carry the raw e.code through in their returned {pass,
// reason, code}, and this checks that actual gRPC/HTTP status (7 /
// "permission-denied" / "PERMISSION_DENIED") first. String-matching on the
// message stays only as a fallback for the case where no usable code
// survived (e.g. a caught-and-restringified error) — a weaker signal, kept
// for coverage, not the primary classification.
function isPermissionDenied(x) {
  const code = x && x.code;
  const normalizedCode = String(code || "").toLowerCase().replace(/_/g, "-");
  if (code === 7 || code === "7" || normalizedCode === "permission-denied") return true;
  const text = (x && x.reason) || (x && x.message) || (typeof x === "string" ? x : "");
  return /permission.?denied|insufficient permission|access denied/i.test(String(text || ""));
}

// ── Check 1: gate-registry integrity (read-only redesign) ──
async function checkGateRegistryIntegrity() {
  const findings = [];
  let CAPABILITY_GATES, checkIntegrity;
  try {
    ({ CAPABILITY_GATES, checkIntegrity } = require("../config/capabilityGates"));
  } catch (e) {
    return { findings: [{ severity: "red", scope: "gate-registry", id: "capabilityGates", reason: `capabilityGates.js failed to load: ${e.message}` }], approxGatesAllow: false };
  }

  const integrity = checkIntegrity(); // pure hash comparison, no Firestore I/O — safe to run
  if (!integrity.ok) {
    findings.push({ severity: "red", scope: "gate-registry", id: "tamper-detection", reason: integrity.reason });
    return { findings, approxGatesAllow: false }; // tampered file — nothing else it says can be trusted
  }

  const gates = CAPABILITY_GATES["persona-email-inbound-listener"];
  if (!Array.isArray(gates) || gates.length === 0) {
    findings.push({ severity: "red", scope: "gate-registry", id: "persona-email-inbound-listener", reason: "no gates registered for this capability — an ungated capability id, or the registry entry was removed" });
    return { findings, approxGatesAllow: false };
  }

  const byId = Object.fromEntries(gates.map((g) => [g.id, g]));
  let approxGatesAllow = true;
  for (const expected of EXPECTED_GATE_IDS) {
    const gate = byId[expected];
    if (!gate) {
      findings.push({ severity: "red", scope: "gate-registry", id: expected, reason: `expected safeguard gate "${expected}" is missing from the registry` });
      approxGatesAllow = false;
      continue;
    }
    if (WRITE_BASED_PREDICATE_IDS.has(expected)) {
      // 2026-09-23 — red-team correction (external review of CODEX 100):
      // the original version of this branch avoided executing these
      // predicates at all (shape-check only), reasoning a write attempt
      // under Dev's restricted identity would throw a false-alarm-looking
      // permission error. That reasoning had it backwards. A write attempt
      // getting PERMISSION_DENIED under Dev's restricted identity isn't a
      // false alarm — it's the expected, correct outcome, and a stronger
      // proof of "read-only is real" than a source-shape heuristic ever
      // was. So: actually run the predicate. If it reports pass:true
      // anyway, that's not healthy — a genuine predicate's write cannot
      // succeed under Dev's viewer-only role, so pass:true here means
      // either the predicate is stubbed/fake or Dev's own IAM restriction
      // has been silently loosened. Either way, real tamper evidence, and
      // now caught by actually exercising the mechanism instead of
      // guessing from its source text. The shape check stays too, as a
      // cheap secondary signal — defense in depth, not a replacement.
      if (looksLikeHardcodedStub(gate.check)) {
        findings.push({ severity: "red", scope: "gate-registry", id: expected, reason: `predicate "${expected}" looks like a hardcoded stub (trivial return, no real logic) — possible tamper` });
        approxGatesAllow = false;
        continue;
      }
      try {
        const result = await gate.check();
        if (result.pass) {
          findings.push({ severity: "red", scope: "gate-registry", id: expected, reason: `predicate "${expected}" returned pass:true under Dev's read-only identity — its self-test writes should be impossible to succeed here. Either the predicate is stubbed, or Dev's IAM restriction has been loosened. Real tamper evidence.` });
          approxGatesAllow = false;
        } else if (!isPermissionDenied(result)) {
          // Failed, but not for the expected reason — ambiguous, not
          // necessarily tamper (could be a real transient issue), but
          // worth a human look since it didn't fail the way it should.
          findings.push({ severity: "warn", scope: "gate-registry", id: expected, reason: `predicate "${expected}" failed for a reason other than the expected permission denial: ${result.reason}` });
        }
        // else: failed with a permission-denied status — the expected,
        // healthy outcome. No finding.
      } catch (e) {
        if (!isPermissionDenied(e)) {
          findings.push({ severity: "warn", scope: "gate-registry", id: expected, reason: `predicate "${expected}" threw an unexpected (non-permission) error: ${e.message}` });
        }
      }
      continue;
    }
    // Genuinely read-only predicates — safe to actually execute.
    try {
      const result = await gate.check();
      if (!result.pass) approxGatesAllow = false;
    } catch (e) {
      findings.push({ severity: "red", scope: "gate-registry", id: expected, reason: `predicate threw: ${e.message}` });
      approxGatesAllow = false;
    }
  }

  return { findings, approxGatesAllow };
}

// ── Check 2: Gmail watch health, cross-checked against an approximate,
// read-only gate-pass signal from check 1 ──
async function checkGmailWatchHealth(db, approxGatesAllow) {
  const findings = [];
  const snap = await db.doc("config/gmailPersonaWatchState").get();
  const state = snap.exists ? snap.data() : null;
  const isActive = !!(state && state.active === true);

  if (!isActive) {
    if (approxGatesAllow) {
      // Not a bug: gates passing doesn't mean the deliberate manual
      // activation step (OAuth connect + startPersonaWatch) has happened.
      findings.push({ severity: "warn", scope: "gmail-watch", id: "no-watch-gates-allow", reason: "capability gates pass but no persona-email inbound watch is currently active — expected until the manual activation step is taken, not itself a fault" });
    }
    return findings; // no watch, gates don't allow one — correct, no finding
  }

  // A watch IS active — the more serious branch.
  if (!approxGatesAllow) {
    findings.push({ severity: "red", scope: "gmail-watch", id: "watch-active-gates-failing", reason: "a persona-email inbound watch is ACTIVE despite the gate registry currently appearing to fail — the registry may have been bypassed" });
  }

  if (state.expiration) {
    const expMs = Number(state.expiration);
    const hoursLeft = (expMs - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 0) {
      findings.push({ severity: "red", scope: "gmail-watch", id: "watch-expired", reason: `watch expiration passed ${Math.abs(hoursLeft).toFixed(1)}h ago and was not renewed` });
    } else if (hoursLeft < 24) {
      findings.push({ severity: "warn", scope: "gmail-watch", id: "watch-expiring-soon", reason: `watch expires in ${hoursLeft.toFixed(1)}h — confirm the renewal job isn't paused` });
    }
  } else {
    findings.push({ severity: "warn", scope: "gmail-watch", id: "no-expiration-recorded", reason: "watch is marked active but no expiration was recorded" });
  }
  return findings;
}

// ── Check 3: pending moderation-queue age ──
async function checkPendingApprovalAge(db) {
  const findings = [];
  const nowMs = Date.now();
  let snap;
  try {
    snap = await db.collection("pendingPersonaEmailApprovals").where("status", "==", "pending").get();
  } catch (e) {
    return [{ severity: "red", scope: "moderation-queue", id: "read-failed", reason: `pendingPersonaEmailApprovals read failed: ${e.message}` }];
  }
  snap.forEach((doc) => {
    const d = doc.data();
    const createdMs = d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : null;
    if (!createdMs) {
      findings.push({ severity: "warn", scope: "moderation-queue", id: doc.id, reason: "pending approval has no createdAt timestamp" });
      return;
    }
    const ageHours = (nowMs - createdMs) / (1000 * 60 * 60);
    if (ageHours >= 48) {
      findings.push({ severity: "red", scope: "moderation-queue", id: doc.id, reason: `pending ${ageHours.toFixed(0)}h without a decision (red past 48h) — no backup approver decided yet, see CODEX 100` });
    } else if (ageHours >= 24) {
      findings.push({ severity: "warn", scope: "moderation-queue", id: doc.id, reason: `pending ${ageHours.toFixed(0)}h without a decision` });
    }
  });
  return findings;
}

// ── Check: ask_worker usage rollup ──
// CODEX 102 Part 1, point 6: "a visible rollup of usage... readable by Dev,
// extending Dev's existing 'Dev cannot be the only thing checking Dev'
// pattern, so a volume spike or a suspicious cross-silo fishing pattern is
// actually detectable in one place." Deterministic, no LLM judgment — a
// simple per-tenant volume threshold over alexAskWorkerLog, same as every
// other check in this file.
const ASK_WORKER_VOLUME_WINDOW_HOURS = 24;
const ASK_WORKER_VOLUME_WARN_THRESHOLD = 20; // well above one hour's 10-call budget — signals sustained use, not a single burst
async function checkAskWorkerVolume(db) {
  const cutoff = new Date(Date.now() - ASK_WORKER_VOLUME_WINDOW_HOURS * 3600000);
  let snap;
  try {
    snap = await db.collection("alexAskWorkerLog").where("createdAt", ">=", cutoff).get();
  } catch (e) {
    return [{ severity: "warn", scope: "ask-worker", id: "read-failed", reason: `alexAskWorkerLog read failed: ${e.message}` }];
  }
  const byTenant = {};
  snap.forEach((doc) => {
    const d = doc.data();
    const t = d.tenantId || "unknown";
    if (!byTenant[t]) byTenant[t] = { total: 0, pasted: 0 };
    byTenant[t].total++;
    if (d.pastedContentFlag) byTenant[t].pasted++;
  });
  const findings = [];
  for (const [tenantId, stats] of Object.entries(byTenant)) {
    if (stats.total >= ASK_WORKER_VOLUME_WARN_THRESHOLD) {
      findings.push({ severity: "warn", scope: "ask-worker", id: `volume-${tenantId}`, reason: `tenant ${tenantId} made ${stats.total} ask_worker calls in the last ${ASK_WORKER_VOLUME_WINDOW_HOURS}h (${stats.pasted} pasted-content-flagged) — worth a look for over-reliance or a fishing pattern` });
    }
  }
  return findings;
}

// ── Check: expiry-sweep heartbeat ──
// personaEmailApprovalExpirySweep (personaEmailReplyPipeline.js) is now the
// fail-safe standing between "an approval sits forever" and "safe default:
// expires unsent." Red-team round 4: that fail-safe needs the same "silence
// must not read as green" heartbeat treatment Dev applies to itself (see
// workerCanary.js) — nothing else was confirming it's still running on its
// 6h schedule.
const EXPIRY_SWEEP_STALE_MS = 8 * 60 * 60 * 1000; // 6h schedule + 2h slack before alarming
async function checkExpirySweepHeartbeat(db) {
  const snap = await db.doc("config/personaEmailExpirySweepHealth").get();
  if (!snap.exists) {
    // Not a bug: expected until the sweep's first scheduled run has fired
    // (e.g. right after this was deployed).
    return [{ severity: "warn", scope: "expiry-sweep", id: "no-heartbeat-yet", reason: "personaEmailApprovalExpirySweep has never recorded a heartbeat — expected until its first scheduled run, not itself a fault" }];
  }
  const d = snap.data();
  const lastRunMs = d.lastRunAtMs;
  if (!lastRunMs) {
    return [{ severity: "warn", scope: "expiry-sweep", id: "heartbeat-missing-timestamp", reason: "expiry-sweep heartbeat doc exists but has no lastRunAtMs" }];
  }
  const ageMs = Date.now() - lastRunMs;
  if (ageMs > EXPIRY_SWEEP_STALE_MS) {
    return [{ severity: "red", scope: "expiry-sweep", id: "stale-heartbeat", reason: `personaEmailApprovalExpirySweep last ran ${(ageMs / 3600000).toFixed(1)}h ago (scheduled every 6h) — the fail-safe against stuck pending approvals may not be running` }];
  }
  return [];
}

// ── Check 5: surface workerCanary's current reds/warns for visibility ──
// Marked `surfaced: true` so the recorder excludes these from Dev's OWN
// alert trigger — workerCanary.js already pages for its own reds; this is
// visibility in one place, not a second alert path for the same incident.
async function surfaceWorkerCanaryFindings(db) {
  const snap = await db.doc("config/workerHealth").get();
  if (!snap.exists) return [];
  const d = snap.data();
  return (d.reds || []).map((r) => ({
    severity: "red", scope: `worker-canary:${r.scope}`, id: r.id, reason: r.reason, surfaced: true,
  }));
}

/**
 * Persist + alert — routed through a narrow internal endpoint hosted by
 * `api` (broader identity, has Secret-Manager-bound Twilio/SendGrid
 * creds), never done in-process here. Dev's own identity has no write
 * access and no notification secrets, on purpose.
 *
 * Hits the direct Cloud Run URL, NOT the Cloudflare Frontdoor — caught in
 * testing: the Frontdoor doesn't forward the custom x-dev-worker-secret
 * header (it only passes through a known allowlist), so the secret never
 * arrived and every call 403'd with "invalid or missing secret" even
 * though both sides had the identical env var. Same reason the existing
 * gmail-persona-watch-renewal scheduler job also hits the direct
 * api-feyfibglbq-uc.a.run.app URL instead of the Frontdoor — this is the
 * established pattern for machine-to-machine internal calls in this
 * codebase, not a new workaround.
 */
async function recordFindings(payload) {
  const url = "https://api-feyfibglbq-uc.a.run.app/v1/internal/dev-worker/record-findings";
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-dev-worker-secret": process.env.DEV_WORKER_INTERNAL_SECRET || "" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`recordFindings: internal endpoint returned ${resp.status}: ${text.slice(0, 300)}`);
  }
  return await resp.json();
}

async function runDevChecks(opts = {}) {
  const db = admin.firestore();
  const nowMs = Date.now();

  const { findings: registryFindings, approxGatesAllow } = await checkGateRegistryIntegrity();
  const watchFindings = await checkGmailWatchHealth(db, approxGatesAllow);
  const queueFindings = await checkPendingApprovalAge(db);
  const sweepFindings = await checkExpirySweepHeartbeat(db);
  const askWorkerFindings = await checkAskWorkerVolume(db);
  const surfacedFindings = await surfaceWorkerCanaryFindings(db);

  const ownFindings = [...registryFindings, ...watchFindings, ...queueFindings, ...sweepFindings, ...askWorkerFindings];
  const allFindings = [...ownFindings, ...surfacedFindings];

  const reds = allFindings.filter((f) => f.severity === "red");
  const warns = allFindings.filter((f) => f.severity === "warn");
  const status = reds.length ? "red" : (warns.length ? "yellow" : "green");
  const ownReds = reds.filter((r) => !r.surfaced);
  const ownStatus = ownReds.length ? "red" : "green";

  const payload = {
    status, ownStatus, redCount: reds.length, warnCount: warns.length,
    reds, warns, ownReds,
    findings: allFindings,
    checkedAtMs: nowMs,
    noAlerts: !!opts.noAlerts,
  };

  const result = await recordFindings(payload);
  console.log("[devWorker]", JSON.stringify({ status: result.status, redCount: result.redCount, warnCount: result.warnCount, alertReason: result.alertReason }));
  return result;
}

module.exports = { runDevChecks, HEALTH_DOC, checkGateRegistryIntegrity, checkGmailWatchHealth, checkPendingApprovalAge, checkExpirySweepHeartbeat, checkAskWorkerVolume, surfaceWorkerCanaryFindings, looksLikeHardcodedStub, isPermissionDenied };
