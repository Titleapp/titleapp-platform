#!/usr/bin/env node
"use strict";

/**
 * capabilityGates.test.js — red-team round 2, point #3: CI negative tests.
 * No test framework is configured anywhere in this codebase (per
 * CLAUDE.md), so this is plain Node assertions, run directly:
 *   node functions/functions/config/capabilityGates.test.js
 *
 * UPDATED once safeguards #1-3 (rate limiter, disclosure footer, correction
 * protocol) were actually built: this file's original version asserted
 * every predicate fails closed unconditionally, which stopped being true
 * the moment those three were real — a test that never updates to match
 * reality isn't testing anything anymore, it's just asserting its own
 * staleness. Per this file's own original header: "as each safeguard
 * actually gets built, its test here must be updated to break the
 * prerequisite and re-assert false" — done below per predicate.
 *
 * Each of the three built predicates does a LIVE functional self-test
 * against a Firestore-backed mechanism (see capabilityGates.js), so this
 * test performs real Firestore writes to disposable "test-*" doc paths
 * (never a real persona slug) and cleans up after itself. It needs
 * firebase-admin credentials that can reach the real project — same ADC
 * setup already used by the one-off scripts in functions/functions/scripts/.
 */

const assert = require("assert");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const { CAPABILITY_GATES, checkGatesStatus, selfHash } = require("./capabilityGates");
const { assertWithinLimit, safetyRef } = require("../services/communications/personaSendRateLimiter");
const { buildDisclosureFooter } = require("../config/personaEmailIdentities");
const { reportBadSend } = require("../services/communications/personaEmailCorrection");

async function main() {
  let failures = 0;
  const check = (label, fn) => {
    try { fn(); console.log(`  ok — ${label}`); }
    catch (e) { failures++; console.error(`  FAIL — ${label}: ${e.message}`); }
  };
  const checkAsync = async (label, fn) => {
    try { await fn(); console.log(`  ok — ${label}`); }
    catch (e) { failures++; console.error(`  FAIL — ${label}: ${e.message}`); }
  };

  console.log("capabilityGates.test.js");

  // ── Built safeguards: predicates must now genuinely pass ──────────────
  const gates = CAPABILITY_GATES["persona-email-inbound-listener"];
  const byId = Object.fromEntries(gates.map((g) => [g.id, g]));

  const rateLimiterResult = await byId["rate-limiter-live"].check();
  check("rate-limiter-live now passes (real mechanism, self-verified)", () =>
    assert.strictEqual(rateLimiterResult.pass, true, `expected pass:true, got ${JSON.stringify(rateLimiterResult)}`));

  const footerResult = await byId["disclosure-footer-enforced-in-code"].check();
  check("disclosure-footer-enforced-in-code now passes (real mechanism, self-verified)", () =>
    assert.strictEqual(footerResult.pass, true, `expected pass:true, got ${JSON.stringify(footerResult)}`));

  const correctionResult = await byId["correction-protocol-auto-suspend"].check();
  check("correction-protocol-auto-suspend now passes (real mechanism, self-verified)", () =>
    assert.strictEqual(correctionResult.pass, true, `expected pass:true, got ${JSON.stringify(correctionResult)}`));

  // task-canary-passing is a status the canary schedule writes over time —
  // this test only asserts the predicate returns a well-formed result, not
  // a fixed direction, since whether it's actually passing changes as the
  // real Ivy canary runs (or doesn't).
  const taskCanaryResult = await byId["task-canary-passing"].check();
  check("task-canary-passing returns a well-formed result", () => {
    assert.strictEqual(typeof taskCanaryResult.pass, "boolean");
    if (!taskCanaryResult.pass) assert.ok(taskCanaryResult.reason && taskCanaryResult.reason.length > 5, "reason missing when failing");
  });
  console.log(`  (info) task-canary-passing currently: ${taskCanaryResult.pass} ${taskCanaryResult.reason || ""}`);

  // ── Negative-path proofs: each mechanism must actually be able to fail ──
  // (proves the predicates aren't just checking "did the file get created")

  await checkAsync("personaSendRateLimiter actually blocks a suspended persona (not just the gate's own self-test)", async () => {
    const slug = "test-rate-limiter-negative";
    await safetyRef(slug).delete().catch(() => {});
    await safetyRef(slug).set({ suspended: true, suspendedReason: "ci negative test" });
    let threw = false;
    try { await assertWithinLimit(slug); } catch { threw = true; }
    await safetyRef(slug).delete().catch(() => {});
    assert.strictEqual(threw, true, "assertWithinLimit did not throw for a suspended persona");
  });

  await checkAsync("personaSendRateLimiter actually blocks over the daily cap", async () => {
    const slug = "test-rate-limiter-cap";
    await safetyRef(slug).delete().catch(() => {});
    await safetyRef(slug).set({ dayKey: new Date().toISOString().slice(0, 10), sentToday: 999, perDayOverride: 1 });
    let threw = false;
    try { await assertWithinLimit(slug); } catch { threw = true; }
    await safetyRef(slug).delete().catch(() => {});
    assert.strictEqual(threw, true, "assertWithinLimit did not enforce perDayOverride");
  });

  check("buildDisclosureFooter throws for an unregistered persona slug (can't silently produce a wrong-but-plausible footer)", () => {
    assert.throws(() => buildDisclosureFooter("__not_a_real_persona__"));
  });

  await checkAsync("reportBadSend refuses a vague report with no description", async () => {
    let threw = false;
    try { await reportBadSend({ workerSlug: "test-correction-negative", reportedBy: "ci-test" }); }
    catch { threw = true; }
    assert.strictEqual(threw, true, "reportBadSend did not require a description");
  });

  // ── Tamper detection (unchanged — independent of what predicates return) ──
  process.env.CAPABILITY_GATES_APPROVED_HASH = selfHash();
  const status = await checkGatesStatus("persona-email-inbound-listener");
  check("overall status is not reported as tampered when hash matches", () => assert.strictEqual(status.tampered, false));

  process.env.CAPABILITY_GATES_APPROVED_HASH = "0".repeat(64);
  const tamperedStatus = await checkGatesStatus("persona-email-inbound-listener");
  check("mismatched approved hash is reported as tampered", () => assert.strictEqual(tamperedStatus.tampered, true));
  check("mismatched approved hash fails allPass", () => assert.strictEqual(tamperedStatus.allPass, false));

  delete process.env.CAPABILITY_GATES_APPROVED_HASH;
  const missingHashStatus = await checkGatesStatus("persona-email-inbound-listener");
  check("missing approved hash env var fails closed", () => assert.strictEqual(missingHashStatus.allPass, false));

  const unregistered = await checkGatesStatus("some-capability-nobody-registered");
  check("unregistered capability id fails closed", () => assert.strictEqual(unregistered.allPass, false));

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("capabilityGates.test.js crashed:", e);
  process.exit(1);
});
