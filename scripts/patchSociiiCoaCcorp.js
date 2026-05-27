"use strict";

/**
 * Patch SOCIII Inc. Chart of Accounts with C-corp accounts that were added
 * to the saas-startup template AFTER SOCIII already applied it.
 *
 * Adds (if not already present by code):
 *   1010 Holding / Savings Cash (asset)
 *   2100 Deferred Revenue (liability)
 *   2500 Federal Income Tax Payable (liability)
 *   2510 State Income Tax Payable (liability)
 *   2600 Notes Payable — Founder / Insider Loans (liability)
 *   3010 Additional Paid-In Capital (APIC) (equity)
 *   3100 Retained Earnings (equity)
 *
 * Does NOT touch existing 3000 (still "Owner Contributions" — user can
 * rename via UI to "Common Stock" without losing history) or 6100
 * (still "Founder Comp / Owner Draw" — user can rename to "Officer
 * Compensation" via UI).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/patchSociiiCoaCcorp.js <tenantId>          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/patchSociiiCoaCcorp.js <tenantId> --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const tenantId = process.argv[2];
const APPLY = process.argv.includes("--apply");

if (!tenantId || tenantId.startsWith("--")) {
  console.error("Usage: node scripts/patchSociiiCoaCcorp.js <tenantId> [--apply]");
  process.exit(1);
}

const NEW_ACCOUNTS = [
  { code: "1010", name: "Holding / Savings Cash", type: "asset" },
  { code: "2100", name: "Deferred Revenue", type: "liability" },
  { code: "2500", name: "Federal Income Tax Payable", type: "liability" },
  { code: "2510", name: "State Income Tax Payable", type: "liability" },
  { code: "2600", name: "Notes Payable — Founder / Insider Loans", type: "liability" },
  { code: "3010", name: "Additional Paid-In Capital (APIC)", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
];

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — patching CoA for tenant ${tenantId}\n`);

  const existing = await db.collection("coaAccounts")
    .where("tenantId", "==", tenantId)
    .where("status", "==", "active")
    .get();

  const existingCodes = new Set();
  existing.docs.forEach(d => {
    const c = d.data().code;
    if (c) existingCodes.add(String(c));
  });

  console.log(`Found ${existing.size} active accounts for ${tenantId}.`);
  console.log(`Existing codes: ${[...existingCodes].sort().join(", ")}\n`);

  const toAdd = NEW_ACCOUNTS.filter(a => !existingCodes.has(a.code));
  const skipped = NEW_ACCOUNTS.filter(a => existingCodes.has(a.code));

  if (skipped.length) {
    console.log("Already present (skipping):");
    skipped.forEach(a => console.log(`  ${a.code}  ${a.name}`));
    console.log();
  }

  if (!toAdd.length) {
    console.log("Nothing to add. Done.");
    process.exit(0);
  }

  console.log(`Will add ${toAdd.length} new accounts:`);
  toAdd.forEach(a => console.log(`  + ${a.code}  ${a.name}  (${a.type})`));
  console.log();

  if (!APPLY) {
    console.log("(dry run — pass --apply to write)\n");
    process.exit(0);
  }

  const batch = db.batch();
  toAdd.forEach(a => {
    const ref = db.collection("coaAccounts").doc();
    batch.set(ref, {
      tenantId,
      code: a.code,
      name: a.name,
      type: a.type,
      monthlyCapCents: null,
      source: "patch:c-corp-2026-05-26",
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "system:patch",
    });
  });
  await batch.commit();

  console.log(`DONE — added ${toAdd.length} accounts to tenant ${tenantId}.`);
  console.log(`\nNext: in the UI, rename 3000 "Owner Contributions" → "Common Stock"`);
  console.log(`and rename 6100 "Founder Comp / Owner Draw" → "Officer Compensation".\n`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
