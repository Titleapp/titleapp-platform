"use strict";

/**
 * capabilityGates.js — machine-readable, code-enforced pre-activation gates.
 *
 * Built 2026-09-22, revised same day after two rounds of red-team review.
 * History (round 1): put the "activated without gates met" check inside Dev,
 * which only runs after the fact — detection, not prevention. Fixed: the
 * gate moved into the activation function itself (assertGatesPass, called
 * from watchMailbox() in services/social/gmail.js).
 *
 * Round 2 found the fix was still "checked once at activation," not held
 * continuously, and that a predicate returning a stubbed `true` would be
 * indistinguishable from a real pass. Both addressed here:
 *
 * 1. Continuous enforcement — checkGatesStatus() (non-throwing) is meant to
 *    be called on every send AND on every inbound Pub/Sub message, not just
 *    at activation. A caller that gets a failure back is expected to
 *    actively call this capability's stop mechanism (e.g. gmail.js's
 *    stopWatch()), not just decline to proceed this one time — a Gmail
 *    watch persists up to ~7 days on its own even if nothing renews it, so
 *    "decline to renew" does not turn anything off by itself.
 * 2. Tamper detection — this file hashes its own source at call time and
 *    compares it against CAPABILITY_GATES_APPROVED_HASH (an env var, so the
 *    approved value lives outside the file being checked — no circularity).
 *    A mismatch fails every gate for every capability, regardless of what
 *    any individual predicate returns — an edited-but-unapproved version of
 *    this file is exactly the bypass this exists to catch, and predicate
 *    logic can't be trusted to catch tampering with itself.
 *
 * Updating the approved hash is a deliberate, visible action (see
 * `npm run gates:approve` note below) — never automatic, never silent.
 */

const fs = require("fs");
const crypto = require("crypto");

// Each predicate below does a LIVE functional self-test against a disposable
// "gate-self-test-*" workerSlug — never a real persona — and cleans up
// after itself. This is deliberate: a predicate that only checks "does the
// module exist" would pass the moment a file is created, whether or not it
// actually does anything. Exercising the real mechanism (Firestore writes,
// actual enforcement) is the "real, checkable condition" this file's own
// design principle requires — a stub that hard-returns `true` is the exact
// failure mode round-2 red-team flagged tamper detection to catch, but a
// predicate that never actually calls the code it's checking is a softer
// version of the same problem.
const CAPABILITY_GATES = {
  "persona-email-inbound-listener": [
    {
      id: "rate-limiter-live",
      description: "A live per-persona outbound rate limiter / circuit breaker exists and is enforced in the send path.",
      check: async () => {
        try {
          const { assertWithinLimit, safetyRef } = require("../services/communications/personaSendRateLimiter");
          const testSlug = "gate-self-test-rate-limiter";
          await safetyRef(testSlug).delete().catch(() => {});
          await assertWithinLimit(testSlug); // happy path: fresh persona is allowed to send
          await safetyRef(testSlug).set({ suspended: true, suspendedReason: "capabilityGates self-test" }, { merge: true });
          let threwWhenSuspended = false;
          try { await assertWithinLimit(testSlug); } catch { threwWhenSuspended = true; }
          await safetyRef(testSlug).delete().catch(() => {});
          if (!threwWhenSuspended) {
            return { pass: false, reason: "personaSendRateLimiter did not block a suspended persona — enforcement is not real." };
          }
          return { pass: true };
        } catch (e) {
          // code carried through so a caller (devWorker.js) can classify a
          // PERMISSION_DENIED failure by the actual gRPC/HTTP status rather
          // than string-matching e.message, which can drift silently across
          // client library versions.
          return { pass: false, reason: `rate limiter self-test failed: ${e.message}`, code: e.code };
        }
      },
    },
    {
      id: "disclosure-footer-enforced-in-code",
      description: "The exact decided AI-disclosure footer is appended by code inside sendEmail() itself — not sampled from recent output, and not left to model memory.",
      check: async () => {
        try {
          const { buildDisclosureFooter, DISCLOSURE_MARKER } = require("../config/personaEmailIdentities");
          const footer = buildDisclosureFooter("platform-marketing");
          if (footer !== "Ivy is SOCIII's AI marketing worker. This note was drafted by her and reviewed by a human before sending.") {
            return { pass: false, reason: `buildDisclosureFooter produced unexpected text: "${footer}"` };
          }
          if (!footer.includes(DISCLOSURE_MARKER)) {
            return { pass: false, reason: "DISCLOSURE_MARKER is not actually present in the persona's own footer text — the idempotency check in gmail.js would never fire, risking a doubled footer." };
          }
          const fs = require("fs");
          const path = require("path");
          const src = fs.readFileSync(path.join(__dirname, "..", "services", "social", "gmail.js"), "utf8");
          const fnStart = src.indexOf("async function sendEmail(");
          const fnEnd = src.indexOf("\nasync function watchMailbox(");
          if (fnStart === -1 || fnEnd === -1 || fnEnd < fnStart) {
            return { pass: false, reason: "could not locate sendEmail()'s function body in gmail.js to verify the footer call site." };
          }
          if (!src.slice(fnStart, fnEnd).includes("buildDisclosureFooter(personaSlug)")) {
            return { pass: false, reason: "sendEmail() no longer calls buildDisclosureFooter — footer enforcement may have been removed or moved out of the send path." };
          }
          return { pass: true };
        } catch (e) {
          return { pass: false, reason: `disclosure footer self-test failed: ${e.message}` };
        }
      },
    },
    {
      id: "correction-protocol-auto-suspend",
      description: "A discovered bad send auto-suspends that persona's sending on that channel pending review, and a manual call is what resumes it.",
      check: async () => {
        try {
          const { reportBadSend, resumeSending } = require("../services/communications/personaEmailCorrection");
          const { safetyRef } = require("../services/communications/personaSendRateLimiter");
          const admin = require("firebase-admin");
          const testSlug = "gate-self-test-correction";
          await safetyRef(testSlug).delete().catch(() => {});
          const suspendResult = await reportBadSend({ workerSlug: testSlug, reportedBy: "capabilityGates-self-test", description: "capabilityGates self-test" });
          const afterSuspend = await safetyRef(testSlug).get();
          const resumeResult = await resumeSending({ workerSlug: testSlug, resumedBy: "capabilityGates-self-test" });
          const afterResume = await safetyRef(testSlug).get();
          await safetyRef(testSlug).delete().catch(() => {});
          await admin.firestore().collection("personaEmailCorrections").doc(suspendResult.eventId).delete().catch(() => {});
          await admin.firestore().collection("personaEmailCorrections").doc(resumeResult.eventId).delete().catch(() => {});
          if (!afterSuspend.exists || afterSuspend.data().suspended !== true) {
            return { pass: false, reason: "reportBadSend did not actually set suspended=true on the safety doc." };
          }
          if (!afterResume.exists || afterResume.data().suspended !== false) {
            return { pass: false, reason: "resumeSending did not actually clear the suspension." };
          }
          return { pass: true };
        } catch (e) {
          // See rate-limiter-live's matching comment — code carried through
          // for the same reason.
          return { pass: false, reason: `correction protocol self-test failed: ${e.message}`, code: e.code };
        }
      },
    },
    {
      id: "task-canary-passing",
      description: "A task-level canary (real end-to-end task, not just structural wiring) is passing for the specific persona being activated (Ivy first).",
      check: async () => {
        try {
          const { getRecordedStatus } = require("../monitoring/personaTaskCanary");
          return await getRecordedStatus("platform-marketing");
        } catch (e) {
          return { pass: false, reason: `task canary status check failed: ${e.message}` };
        }
      },
    },
  ],
};

// ─── Tamper detection ────────────────────────────────────────────────
// Hash this file's own source, excluding nothing (the approved hash lives
// in an env var, never in this file, so there's no self-reference to
// exclude). Recomputed on every check — cheap, and correctness matters
// more than the sub-millisecond cost.
function selfHash() {
  const src = fs.readFileSync(__filename, "utf8");
  return crypto.createHash("sha256").update(src).digest("hex");
}

function checkIntegrity() {
  const approved = process.env.CAPABILITY_GATES_APPROVED_HASH;
  const current = selfHash();
  if (!approved) {
    return { ok: false, reason: "CAPABILITY_GATES_APPROVED_HASH is not set — no approved version on record, so nothing can be trusted as reviewed. Fail closed." };
  }
  if (approved !== current) {
    return { ok: false, reason: `capabilityGates.js does not match the last human-approved hash (expected ${approved.slice(0, 12)}…, got ${current.slice(0, 12)}…) — an unreviewed change to the safety-critical file itself. Fail closed regardless of what any predicate returns.` };
  }
  return { ok: true, hash: current };
}

/**
 * Non-throwing status check — the primitive for continuous enforcement.
 * Callers on a live/recurring path (send, inbound webhook, renewal) should
 * call this every time, not just once at activation, and react to a
 * failure by actively disabling the capability (e.g. calling stopWatch()),
 * not merely by not proceeding this one time.
 */
async function checkGatesStatus(capabilityId) {
  const integrity = checkIntegrity();
  if (!integrity.ok) {
    return { allPass: false, tampered: true, failed: [{ id: "file-integrity", reason: integrity.reason }] };
  }

  const gates = CAPABILITY_GATES[capabilityId];
  if (!gates) {
    return { allPass: false, tampered: false, failed: [{ id: "unregistered-capability", reason: `No gates registered for "${capabilityId}" — an ungated capability id is treated as blocked, not as "no gates needed."` }] };
  }

  const results = await Promise.all(gates.map(async (g) => ({ id: g.id, ...(await g.check()) })));
  const failed = results.filter((r) => !r.pass);
  return { allPass: failed.length === 0, tampered: false, failed };
}

/** Throws if any registered gate for `capabilityId` doesn't pass. Call this at activation; call checkGatesStatus() (non-throwing) for continuous/runtime checks that need to react rather than just abort. */
async function assertGatesPass(capabilityId) {
  const status = await checkGatesStatus(capabilityId);
  if (!status.allPass) {
    const lines = status.failed.map((f) => `  - ${f.id}: ${f.reason}`).join("\n");
    throw new Error(`Capability "${capabilityId}" is blocked — ${status.failed.length} gate(s) not met:\n${lines}`);
  }
}

module.exports = { CAPABILITY_GATES, assertGatesPass, checkGatesStatus, checkIntegrity, selfHash };
