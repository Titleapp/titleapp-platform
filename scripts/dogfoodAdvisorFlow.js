"use strict";

/**
 * Dogfood test of the full advisor flow.
 *   1. initiateAdvisorFlow      — creates advisor record + sends magic-link email
 *   2. mark KYC approved        — bypasses Stripe Identity for the test
 *   3. startAdvisorSigning      — sends the Dropbox Sign packet
 *
 * Usage:
 *   export APOLLO_API_KEY=...   # not needed but env consistency
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   node scripts/dogfoodAdvisorFlow.js
 */

const path = require("path");
process.env.GCLOUD_PROJECT = "title-app-alpha";

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

// Override module env so when we require advisorFlow, the SendGrid + DBX Sign
// env vars are populated from Firebase secrets we already fetched earlier.
// (advisorFlow reads them at call time, so setting them here works.)
// If env isn't set, advisorFlow logs and continues — the magic link will still
// be created in Firestore but the email send is skipped.

const FUNCTIONS_DIR = path.join(__dirname, "..", "functions", "functions");
process.chdir(FUNCTIONS_DIR); // ensure relative requires inside services/ resolve

const advisorFlow = require(path.join(FUNCTIONS_DIR, "services", "ir", "advisorFlow"));

const TEST_EMAIL = "seanlcombs@gmail.com";
const TEST_NAME = "Sean Combs (dogfood)";
const TEST_EQUITY = "2.0%";
const TEST_ROLE = "Dogfood Test Advisor";
const INVITED_BY = "fPlJ76VM5kQaEtxlMVifVlzeOmq1"; // Sean's UID from prior memory

(async () => {
  console.log("STEP 1 — initiateAdvisorFlow");
  const init = await advisorFlow.initiateAdvisorFlow({
    advisorId: null,
    email: TEST_EMAIL,
    name: TEST_NAME,
    equityPct: TEST_EQUITY,
    advisorRole: TEST_ROLE,
    invitedBy: INVITED_BY,
  });
  console.log("  result:", JSON.stringify(init, null, 2));

  if (!init.ok) {
    console.error("FAIL — initiate did not return ok");
    process.exit(1);
  }
  const advisorId = init.advisorId;

  console.log("\nSTEP 2 — auto-approve KYC for the test");
  await admin.firestore().collection("advisors").doc(advisorId).update({
    kycStatus: "approved",
    verifiedName: TEST_NAME,
    verifiedAddress: "1810 E Sahara Ave Ste 75942, Las Vegas NV 89104",
    termsAcknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
    kycApprovedBy: "dogfood-script",
    kycApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("  KYC marked approved.");

  console.log("\nSTEP 3 — startAdvisorSigning (forces Dropbox Sign packet)");
  const sig = await advisorFlow.startAdvisorSigning({
    advisorId,
    advisorAddress: "1810 E Sahara Ave Ste 75942, Las Vegas NV 89104",
    uid: INVITED_BY,
    force: true,
  });
  console.log("  result:", JSON.stringify(sig, null, 2));

  console.log("\n========================================");
  console.log("DONE — check seanlcombs@gmail.com:");
  console.log(`  1. SOCIII invite email (magic link to /onboard/advisor)`);
  console.log(`  2. Dropbox Sign email (the actual signature packet)`);
  console.log("");
  console.log(`Magic link: ${init.magicLinkUrl}`);
  console.log(`Advisor ID: ${advisorId}`);
  console.log(`Signature request ID: ${sig.requestId || "(see result above)"}`);
  console.log("========================================");
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
