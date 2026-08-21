// fixTitlePersonalVaultValues.js — backfill valueUsd on Sarah Garris's
// personal Vault records (tenantId "vault", userId "demo-title-admin-001").
//
// Sean, 2026-08-20: "Personal VAULT not really populated and the assets
// aren't driving the headline valuations." Root cause, confirmed two ways:
//   1. VaultDashboard.jsx never queried the dtcs collection at all -- fixed
//      in code (now uses useDtcCatalog(), computes a real net-worth headline
//      and four-pillar counts).
//   2. None of these 8 personal-vault DTC docs have valueUsd set, so even
//      with the UI fixed there is nothing to sum. This script backfills it.
//
// These 8 docs already exist live (orphaned from a seed script that predates
// the current codebase -- nothing in the repo creates "vault-title-*" ids
// anymore) so this only patches the missing field, it does not create or
// delete records.
//
// Idempotent — safe to run more than once.
//
// Run from functions/functions/:
//   node scripts/demo/fixTitlePersonalVaultValues.js
"use strict";

const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const UID = "demo-title-admin-001";

// Credentials and health records intentionally get no valueUsd -- they are
// not asset-value-bearing types (see ASSET_CLASS_OF in useDtcCatalog.js).
// 313 Mayfair Dr matches the purchase price on title_order_001 (ABC-2026-0031)
// -- Sarah's own home purchase, working its way through her own company's
// title order. 1142 Cedar Ridge Ln is a second, separate property (rental).
const VALUES = {
  "vault-title-asset-001": 24_500,   // 2023 Toyota Camry
  "vault-title-asset-002": 18_750,   // First Bank of Texas — Checking + Savings
  "vault-title-prop-001": 285_000,   // 313 Mayfair Dr — matches title_order_001 purchase price
  "vault-title-prop-002": 198_000,   // 1142 Cedar Ridge Ln — rental property
};

(async () => {
  console.log("═══ fixTitlePersonalVaultValues.js ═══\n");
  const snap = await db.collection("dtcs").where("userId", "==", UID).where("tenantId", "==", "vault").get();
  if (snap.empty) {
    console.log("No personal-vault DTCs found for", UID);
    process.exit(0);
  }
  for (const doc of snap.docs) {
    const valueUsd = VALUES[doc.id];
    if (valueUsd == null) {
      console.log(`  · ${doc.id}: no value assigned (credential/health record — expected)`);
      continue;
    }
    await doc.ref.update({ valueUsd });
    console.log(`  ✓ ${doc.id}: valueUsd -> $${valueUsd.toLocaleString()}`);
  }
  console.log("\n═══ Done ═══");
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
