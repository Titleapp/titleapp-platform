// scripts/test50_5RevenueAttribution.js — CODEX 50.5 helper unit tests
//
// Exercises computeRevenueAttribution() against all D2 cases without hitting
// real Firestore (uses an admin SDK pointing at a deterministic mock).
//
// Cases covered:
//   1. System event (no worker) → all attribution null/zero, basis preserved.
//   2. Free-tier event → share zero, basis "free".
//   3. TitleApp original worker → creator_id = "titleapp-platform", share = 0.
//   4. Creator-authored, no fork → full 20% to creator.
//   5. Forked from TitleApp original → 20% to forker, no parent.
//   6. Forked from Creator-authored → 14% to forker (70% × 20%) + 6% to parent (30% × 20%).
//   7. Deleted creator → creator_status reflects "deleted".
//
// Usage:
//   cd functions/functions
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
//     NODE_PATH=./node_modules \
//     node ../../scripts/test50_5RevenueAttribution.js

const path = require("path");

// Stub firebase-admin so the helper can be loaded without initializing a real
// Firestore connection. The helper queries `workers/{id}` etc; we hand it a
// fake collection that returns prepared docs.
const fakeDocs = {
  workers: {},
  digitalWorkers: {},
  raasCatalog: {},
  users: {},
};

function makeFakeDb() {
  return {
    collection(name) {
      const store = fakeDocs[name] || {};
      return {
        doc(id) {
          return {
            get: async () => ({
              exists: !!store[id],
              id,
              data: () => store[id] || null,
            }),
          };
        },
      };
    },
  };
}

const Module = require("module");
const origRequire = Module.prototype.require;
let helperOverrides = {};

Module.prototype.require = function (id) {
  if (id === "firebase-admin") {
    const fake = origRequire.call(this, "firebase-admin");
    return new Proxy(fake, {
      get(target, prop) {
        if (prop === "firestore") {
          const fn = () => makeFakeDb();
          fn.FieldValue = { serverTimestamp: () => "FAKE_TS" };
          fn.Timestamp = { now: () => ({ _ts: Date.now() }) };
          return fn;
        }
        return target[prop];
      },
    });
  }
  if (id === "../config/pricing" && helperOverrides.pricing) {
    return helperOverrides.pricing;
  }
  return origRequire.call(this, id);
};

// Load the helper after the require shim is in place.
const { computeRevenueAttribution, TITLEAPP_PLATFORM_CREATOR } = require(
  path.join(__dirname, "..", "functions", "functions", "billing", "recordUsageEvent")
);
const pricing = require(path.join(__dirname, "..", "functions", "functions", "config", "pricing"));

// ── Test harness ─────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function clearFakes() {
  for (const k of Object.keys(fakeDocs)) fakeDocs[k] = {};
}

function approx(a, b, tol = 0.0001) {
  return Math.abs(a - b) <= tol;
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}\n      ${e.message}`);
    failed++;
    failures.push({ name, error: e.message });
  }
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}
function assertApprox(actual, expected, msg) {
  if (!approx(actual, expected)) throw new Error(`${msg}: got ${actual}, expected ≈ ${expected}`);
}

// ── Tests ────────────────────────────────────────────────────

(async () => {
  console.log("CODEX 50.5 — computeRevenueAttribution unit tests\n");

  await test("system event (no worker, no basis) returns billing_period only", async () => {
    clearFakes();
    const r = await computeRevenueAttribution({ revenueBasis: "system", timestamp: new Date("2026-05-15T12:00:00Z") });
    assertEq(r.creator_id, null, "creator_id");
    assertEq(r.creator_share_amount, 0, "share");
    assertEq(r.revenue_basis, "system", "basis");
    assertEq(r.billing_period, "2026-05", "billing_period");
  });

  await test("free-tier event preserves basis and zeroes share", async () => {
    clearFakes();
    const r = await computeRevenueAttribution({
      workerId: "any",
      revenueBasis: "free",
      revenueAmount: 100, // ignored for free
      timestamp: new Date("2026-04-01T00:00:00Z"),
    });
    assertEq(r.creator_share_amount, 0, "share");
    assertEq(r.revenue_amount, 0, "revenue_amount overridden");
    assertEq(r.revenue_basis, "free", "basis");
  });

  await test("TitleApp original worker → creator_id=titleapp-platform, share=0", async () => {
    clearFakes();
    fakeDocs.workers["w_titleapp"] = { creatorId: TITLEAPP_PLATFORM_CREATOR };
    const r = await computeRevenueAttribution({
      workerId: "w_titleapp",
      revenueBasis: "credit_pack",
      revenueAmount: 0.10, // 10 cents
    });
    assertEq(r.creator_id, TITLEAPP_PLATFORM_CREATOR, "creator_id");
    assertEq(r.creator_share_amount, 0, "platform share is zero");
    assertEq(r.creator_status, "platform", "platform status");
  });

  await test("Creator-authored, no fork → 20% share to creator", async () => {
    clearFakes();
    fakeDocs.workers["w_creator"] = { creatorId: "uid_alice" };
    fakeDocs.users["uid_alice"] = { stripeConnectAccountId: "acct_alice" };
    const r = await computeRevenueAttribution({
      workerId: "w_creator",
      revenueBasis: "credit_pack",
      revenueAmount: 1.00, // $1.00
    });
    assertEq(r.creator_id, "uid_alice", "creator_id");
    assertApprox(r.creator_share_amount, 0.20, "share = 20%");
    assertEq(r.parent_creator_id, null, "no parent");
    assertEq(r.creator_status, "active", "active");
  });

  await test("Forked from TitleApp original → 20% to forker, no parent share", async () => {
    clearFakes();
    fakeDocs.workers["w_source_titleapp"] = { creatorId: TITLEAPP_PLATFORM_CREATOR };
    fakeDocs.workers["w_fork"] = { creatorId: "uid_bob", forkedFrom: "w_source_titleapp", forkedFromCollection: "workers" };
    fakeDocs.users["uid_bob"] = {};
    const r = await computeRevenueAttribution({
      workerId: "w_fork",
      revenueBasis: "credit_pack",
      revenueAmount: 1.00,
    });
    assertEq(r.creator_id, "uid_bob", "forker creator");
    assertApprox(r.creator_share_amount, 0.20, "full 20% to forker");
    assertEq(r.parent_creator_id, null, "TitleApp originals get no parent payout");
    assertApprox(r.parent_share_amount, 0, "parent share = 0");
    assertEq(r.forkedFrom, "w_source_titleapp", "forkedFrom snapshotted");
  });

  await test("Forked from Creator-authored → 14% forker / 6% parent (70/30 of 20%)", async () => {
    clearFakes();
    fakeDocs.workers["w_alice_original"] = { creatorId: "uid_alice" };
    fakeDocs.workers["w_bob_fork"] = { creatorId: "uid_bob", forkedFrom: "w_alice_original", forkedFromCollection: "workers" };
    fakeDocs.users["uid_alice"] = {};
    fakeDocs.users["uid_bob"] = {};
    const r = await computeRevenueAttribution({
      workerId: "w_bob_fork",
      revenueBasis: "credit_pack",
      revenueAmount: 1.00,
    });
    assertEq(r.creator_id, "uid_bob", "forker creator");
    assertApprox(r.creator_share_amount, 0.14, "forker share = 70% × 20%");
    assertEq(r.parent_creator_id, "uid_alice", "parent = original creator");
    assertApprox(r.parent_share_amount, 0.06, "parent share = 30% × 20%");
  });

  await test("Two-level fork attributes parent to immediate forker (D2)", async () => {
    clearFakes();
    fakeDocs.workers["w_alice"] = { creatorId: "uid_alice" };
    fakeDocs.workers["w_bob_fork"] = { creatorId: "uid_bob", forkedFrom: "w_alice", forkedFromCollection: "workers" };
    fakeDocs.workers["w_carol_fork"] = { creatorId: "uid_carol", forkedFrom: "w_bob_fork", forkedFromCollection: "workers" };
    fakeDocs.users["uid_bob"] = {};
    fakeDocs.users["uid_carol"] = {};
    const r = await computeRevenueAttribution({
      workerId: "w_carol_fork",
      revenueBasis: "credit_pack",
      revenueAmount: 1.00,
    });
    assertEq(r.creator_id, "uid_carol", "current forker");
    assertEq(r.parent_creator_id, "uid_bob", "parent = level-1 forker, NOT original");
  });

  await test("Deleted creator → creator_status='deleted'", async () => {
    clearFakes();
    fakeDocs.workers["w_alice"] = { creatorId: "uid_alice" };
    fakeDocs.users["uid_alice"] = { deleted_at: "2026-04-01T00:00:00Z" };
    const r = await computeRevenueAttribution({
      workerId: "w_alice",
      revenueBasis: "credit_pack",
      revenueAmount: 1.00,
    });
    assertEq(r.creator_status, "deleted", "deleted status");
    assertApprox(r.creator_share_amount, 0.20, "share still computed for cycle-close to escheat");
  });

  await test("billing_period rolls to month boundary", async () => {
    clearFakes();
    fakeDocs.workers["w"] = { creatorId: "uid_a" };
    fakeDocs.users["uid_a"] = {};
    const r = await computeRevenueAttribution({
      workerId: "w",
      revenueBasis: "credit_pack",
      revenueAmount: 0.50,
      timestamp: new Date("2026-12-31T23:59:59Z"),
    });
    assertEq(r.billing_period, "2026-12", "december billing period");
  });

  await test("subscription_prorata revenue derived from creditCost+tier", async () => {
    clearFakes();
    fakeDocs.workers["w"] = { creatorId: "uid_a" };
    fakeDocs.users["uid_a"] = {};
    // Pro tier: $29/month, 500 credits → $0.058/credit. 5 credits → $0.29.
    const r = await computeRevenueAttribution({
      workerId: "w",
      revenueBasis: "subscription_prorata",
      tier: "tier1",
      creditCost: 5,
    });
    assertApprox(r.revenue_amount, 0.29, "5 credits × $0.058");
    assertApprox(r.creator_share_amount, 0.058, "20% of $0.29");
  });

  await test("parent_interaction_id passes through", async () => {
    clearFakes();
    fakeDocs.workers["w"] = { creatorId: TITLEAPP_PLATFORM_CREATOR };
    const r = await computeRevenueAttribution({
      workerId: "w",
      revenueBasis: "credit_pack",
      revenueAmount: 0.10,
      parentInteractionId: "pii_test_123",
    });
    assertEq(r.parent_interaction_id, "pii_test_123", "id propagated");
  });

  console.log(`\n== Results ==`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  ${f.name}: ${f.error}`);
  }
  process.exit(failed > 0 ? 1 : 0);
})();
