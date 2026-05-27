"use strict";

/**
 * One-shot smoke test for the IR Phase 1 signing stack.
 *
 * Calls signatureService.sendSignaturePacket with role=investor (default), which:
 *   1. Pulls the role's template ID from env (DROPBOX_SIGN_TEMPLATE_*)
 *   2. Fires Dropbox Sign send_with_template with two signers
 *      (recipient + SOCIII Company countersigner) and merge fields
 *   3. Persists a signatureRequest record so the webhook can route the signed PDF
 *
 * testMode defaults ON (set HELLOSIGN_TEST_MODE=0 to send a real billable request).
 * In test mode, recipient MUST equal the Dropbox Sign account-holder email
 * (seanlcombs@gmail.com), so we use Sean for both signer slots.
 *
 * Usage:
 *   ROLE=investor node scripts/smokeTestSafeSigning.js          # default
 *   ROLE=nda node scripts/smokeTestSafeSigning.js
 *   ROLE=advisor node scripts/smokeTestSafeSigning.js
 *
 *   Required env: HELLOSIGN_API_KEY, HELLOSIGN_CLIENT_ID, and the template
 *   env var for the chosen role.
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
if (!admin.apps.length) admin.initializeApp();

const signatureService = require(path.join(__dirname, "..", "functions", "functions", "services", "signatureService"));

const ROLE = process.env.ROLE || "investor";

const ROLE_VARS = {
  investor: {
    label: "SAFE Agreement",
    templateEnv: "DROPBOX_SIGN_TEMPLATE_INVESTOR_SAFE",
    vars: {
      investmentAmount: 1,
      valuationCap: 10000000,
      sharesIssued: 1,
      agreementDate: new Date().toISOString().slice(0, 10),
      companyName: "SOCIII, Inc.",
      companyState: "Delaware",
    },
  },
  advisor: {
    label: "Advisor Agreement",
    templateEnv: "DROPBOX_SIGN_TEMPLATE_ADVISOR_WARRANT",
    vars: {
      equityPct: process.env.SMOKE_EQUITY_PCT || "15.0%",
      advisorAddress: process.env.SMOKE_ADVISOR_ADDRESS || "[Address on file]",
      vestingMonths: Number(process.env.SMOKE_VESTING_MONTHS || 24),
      cliffMonths: Number(process.env.SMOKE_CLIFF_MONTHS || 0),
      agreementDate: new Date().toISOString().slice(0, 10),
    },
  },
  nda: {
    label: "Mutual NDA",
    templateEnv: "DROPBOX_SIGN_TEMPLATE_NDA",
    vars: {
      counterpartyCompany: "Smoke Test Co.",
      companyName: "SOCIII, Inc.",
      agreementDate: new Date().toISOString().slice(0, 10),
    },
  },
};

(async () => {
  const cfg = ROLE_VARS[ROLE];
  if (!cfg) {
    console.error(`Unknown ROLE=${ROLE}. Choose one of: ${Object.keys(ROLE_VARS).join(", ")}`);
    process.exit(2);
  }

  console.log(`\n=== IR Phase 1 — ${cfg.label} smoke test (role=${ROLE}) ===\n`);
  console.log("Template:", process.env[cfg.templateEnv] ? `${process.env[cfg.templateEnv].slice(0, 12)}...` : "MISSING");
  console.log("API key:  ", process.env.HELLOSIGN_API_KEY ? `${process.env.HELLOSIGN_API_KEY.slice(0, 10)}...` : "MISSING");
  console.log("Test mode:", process.env.HELLOSIGN_TEST_MODE !== "0" ? "ON (won't bill against your plan)" : "OFF (live)");
  console.log();

  const result = await signatureService.sendSignaturePacket({
    role: ROLE,
    recipientEmail: process.env.SMOKE_RECIPIENT_EMAIL || "seanlcombs@gmail.com",  // test mode requires account-holder email
    recipientName: process.env.SMOKE_RECIPIENT_NAME || "Test Advisor",
    vars: cfg.vars,
    tenantId: "ws_1779846027006_hc71aw",     // SOCIII workspace
    userId: "WResykI56hW16silsOtvlw1UjJK2",   // Sean's UID
    metadata: {
      source: "smoke-test",
      fundraiseId: "sociii-pre-seed-2026",
      isTestInvestor: true,
    },
  });

  console.log("Result:");
  console.log(JSON.stringify(result, null, 2));

  if (result.ok) {
    console.log(`\n✓ Signature request sent — recipient + SOCIII Company countersigner`);
    console.log(`  Internal request ID:    ${result.requestId}`);
    console.log(`  Dropbox Sign request:   ${result.hellosignRequestId}`);
    console.log(`\nCheck seanlcombs@gmail.com inbox for the Dropbox Sign email (subject: "${cfg.label}").`);
    console.log(`After the first signer signs, the Company countersigner will get the next email.`);
  } else {
    console.log(`\n✗ Send failed: ${result.error}`);
    if (result.instructions) console.log(`  ${result.instructions}`);
  }
  process.exit(result.ok ? 0 : 1);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
