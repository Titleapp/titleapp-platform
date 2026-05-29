"use strict";

/**
 * Dogfood test for creator flow.
 * Fires a real invite email to aspensean@gmail.com using the warm 4-section
 * template via the shared outreachTemplates library.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   export SENDGRID_API_KEY=<from firebase functions:secrets:access>
 *   node scripts/dogfoodCreatorFlow.js
 */

const path = require("path");
process.env.GCLOUD_PROJECT = "title-app-alpha";

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const FUNCTIONS_DIR = path.join(__dirname, "..", "functions", "functions");
process.chdir(FUNCTIONS_DIR);

const creatorFlow = require(path.join(FUNCTIONS_DIR, "services", "creators", "creatorFlow"));

const TEST_EMAIL = "aspensean@gmail.com";
const TEST_NAME = "Sean Lee";
const TEST_VERTICAL = "Aviation";
const TEST_PROMO = "FIRST100";
const INVITED_BY = "fPlJ76VM5kQaEtxlMVifVlzeOmq1";

(async () => {
  console.log(`\nDogfood — initiating creator flow for ${TEST_EMAIL}\n`);
  console.log(`  name:      ${TEST_NAME}`);
  console.log(`  vertical:  ${TEST_VERTICAL}`);
  console.log(`  promoCode: ${TEST_PROMO} (waives first year + ID fee)\n`);

  const result = await creatorFlow.initiateCreatorFlow({
    creatorId: null,
    email: TEST_EMAIL,
    name: TEST_NAME,
    vertical: TEST_VERTICAL,
    promoCode: TEST_PROMO,
    invitedBy: INVITED_BY,
  });

  console.log("Result:", JSON.stringify(result, null, 2));

  if (!result.ok) {
    console.error("\nFAIL — initiate did not return ok");
    process.exit(1);
  }

  if (!result.emailQueued) {
    console.warn("\nWARN — email was not queued. Check SENDGRID_API_KEY.");
  } else {
    console.log("\n✅ Email queued via SendGrid (HTTP 2xx).");
    console.log("   Check aspensean@gmail.com inbox + spam.");
    console.log("   Magic link in email →", result.magicLinkUrl);
  }

  process.exit(0);
})().catch(e => {
  console.error("\nFATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
