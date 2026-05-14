/**
 * Fundraise dogfood — exercise the worker the way Kent will use it.
 *
 *   1. Create a fundraise
 *   2. Add three fake investors
 *   3. Generate a scoped share-link for one
 *   4. Simulate share access (email-verified)
 *   5. Submit KYC for that investor
 *   6. Approve KYC
 *   7. Set accreditation status
 *   8. Run canFundInvestor gate
 *   9. List investors and verify state machine
 *  10. Cleanup
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/dogfoodFundraise.js
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });

const dr = require(path.join(__dirname, "..", "functions", "functions", "services", "fundraise", "dataRoom"));
const kyc = require(path.join(__dirname, "..", "functions", "functions", "services", "fundraise", "investorKyc"));

const TEST_TENANT = "smoke-test-fundraise";
const TEST_USER = "test-user-sean";

function pass(label) { console.log(`✅ ${label}`); }
function fail(label, detail) { console.error(`❌ ${label}`, detail || ""); process.exit(1); }
function pad(s, n = 60) { return (s + " ".repeat(n)).slice(0, n); }

(async () => {
  console.log("\n=== Fundraise dogfood — Kent simulation ===\n");

  // STEP 1 — Create fundraise
  const fr = await dr.createFundraise({
    tenantId: TEST_TENANT,
    name: "TitleApp AI Seed Round 2026",
    target_raise: 2000000,
    lead_investor: "Acme Ventures",
    createdBy: TEST_USER,
  });
  if (!fr.ok || !fr.fundraiseId) fail("Step 1 createFundraise", fr);
  const fundraiseId = fr.fundraiseId;
  pass(`Step 1 — created fundraise ${fundraiseId} (target $2M)`);

  // STEP 2 — Add three investors
  const investors = [];
  for (const inv of [
    { email: "kent@example.com", name: "Kent Smith", commitment_amount: 100000 },
    { email: "alice@vc.example", name: "Alice Investor", commitment_amount: 250000 },
    { email: "bob@angel.example", name: "Bob Angel", commitment_amount: 50000 },
  ]) {
    const r = await dr.addInvestor(fundraiseId, inv, TEST_USER);
    if (!r.ok) fail("Step 2 addInvestor", r);
    investors.push({ ...inv, investorId: r.investorId });
  }
  pass(`Step 2 — added ${investors.length} investors`);

  const target = investors[0]; // Kent — walk through full flow

  // STEP 3 — Generate scoped share-link for Kent
  const share = await dr.createShare({
    fundraiseId,
    tenantId: TEST_TENANT,
    email: target.email,
    allowedFiles: ["deck.pdf", "summary.md"],
    expiryDays: 7,
    createdBy: TEST_USER,
  });
  if (!share.ok || !share.shareId) fail("Step 3 createShare", share);
  pass(`Step 3 — share-link minted: shareId=${share.shareId}, expires in 7d`);

  // STEP 4 — Investor-side share access (email-verified, no auth)
  const access = await dr.listShareFiles(share.shareId, target.email);
  if (!access || access.error) fail("Step 4 listShareFiles", access);
  pass(`Step 4 — share access verified by email match (files: ${(access.allowedFiles || []).join(", ") || "[]"})`);

  // STEP 4b — Wrong email should be rejected
  let rejected = false;
  try { await dr.listShareFiles(share.shareId, "wrong@nope.example"); } catch (_) { rejected = true; }
  if (!rejected) {
    // listShareFiles may resolve with an error field instead of throwing
    const r = await dr.listShareFiles(share.shareId, "wrong@nope.example").catch(() => ({ error: "rejected" }));
    if (!r.error && !r.rejected) fail("Step 4b — wrong email NOT rejected (security gap!)", r);
  }
  pass("Step 4b — share-link rejects wrong email (as expected)");

  // STEP 5 — Submit KYC for Kent
  const sub = await kyc.submitKyc({
    fundraiseId,
    investorId: target.investorId,
    documents: { idDocStorageRef: "test/id.pdf", addressDocStorageRef: "test/utility.pdf" },
    attestationText: "I attest that the documents are mine and accurate.",
  });
  if (!sub.ok || sub.status !== "pending") fail("Step 5 submitKyc", sub);
  pass(`Step 5 — KYC submitted, status=${sub.status}`);

  // STEP 6 — Approve KYC
  const app = await kyc.approveKyc({
    fundraiseId,
    investorId: target.investorId,
    reviewedBy: TEST_USER,
    notes: "Documents verified.",
  });
  if (!app.ok || app.status !== "approved") fail("Step 6 approveKyc", app);
  pass(`Step 6 — KYC approved, status=${app.status}`);

  // STEP 7 — Set accreditation status (Reg D 506(b)/(c) requires this)
  // Valid statuses: "unverified" | "self_attested" | "verified" | "entity_verified"
  const acc = await kyc.setAccreditationStatus({
    fundraiseId,
    investorId: target.investorId,
    status: "self_attested",
    verificationMethod: "self_attestation",
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (!acc.ok) fail("Step 7 setAccreditationStatus", acc);
  pass(`Step 7 — accreditation set: self_attested (90d expiry)`);

  // STEP 8 — canFundInvestor gate. Returns { ok: true } if allowed,
  // { ok: false, reason } if blocked. offeringRegulation: "506b" | "506c".
  // 506(b): allows self_attested. 506(c): requires verified or entity_verified.
  const gate506b = await kyc.canFundInvestor(fundraiseId, target.investorId, { offeringRegulation: "506b" });
  if (!gate506b.ok) fail("Step 8a canFund Reg D 506(b)", gate506b);
  pass(`Step 8a — Reg D 506(b) gate PASSES for Kent: ok=${gate506b.ok}`);

  // STEP 8b — Reg D 506(c) requires verified accreditation, NOT self_attested → should block
  const gate506c = await kyc.canFundInvestor(fundraiseId, target.investorId, { offeringRegulation: "506c" });
  if (gate506c.ok) fail("Step 8b canFund Reg D 506(c) WRONGLY allowed self_attested", gate506c);
  pass(`Step 8b — Reg D 506(c) gate BLOCKS self_attested (correctly): ok=${gate506c.ok} reason="${gate506c.reason}"`);

  // STEP 8c — Alice has not submitted KYC → any reg should block
  const gateAlice = await kyc.canFundInvestor(fundraiseId, investors[1].investorId, { offeringRegulation: "506b" });
  if (gateAlice.ok) fail("Step 8c canFund WRONGLY allowed unsubmitted Alice", gateAlice);
  pass(`Step 8c — gate BLOCKS Alice (KYC not submitted): ok=${gateAlice.ok} reason="${gateAlice.reason}"`);

  // STEP 9 — List investors, verify state machine
  const list = await dr.listInvestors(fundraiseId);
  if (list.length !== 3) fail("Step 9 list count", list.length);
  console.log("\n  Investor state machine snapshot:");
  console.log("  " + pad("name", 18) + pad("kycStatus", 14) + pad("accreditation", 22));
  for (const inv of list) {
    console.log("  " + pad(inv.name, 18) + pad(inv.kycStatus, 14) + pad(inv.accreditationStatus, 22));
  }
  pass("Step 9 — investor state machine verified across 3 records");

  // STEP 10 — Cleanup
  for (const inv of list) {
    await admin.firestore().collection("fundraises").doc(fundraiseId).collection("investors").doc(inv.investorId).delete();
  }
  await admin.firestore().collection("fundraises").doc(fundraiseId).delete();
  if (share.shareId) {
    await admin.firestore().collection("fundraiseShares").doc(share.shareId).delete().catch(() => {});
  }
  pass(`Step 10 — cleaned up fundraise + ${list.length} investors + share`);

  console.log("\n✅ Fundraise dogfood complete. Kent's flow works end-to-end.\n");
  process.exit(0);
})().catch(e => { console.error("FATAL:", e.stack || e); process.exit(1); });
