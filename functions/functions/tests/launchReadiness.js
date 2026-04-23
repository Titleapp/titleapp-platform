"use strict";
/**
 * launchReadiness.js — CODEX 49.4 Launch Readiness Test
 * Validates all foundation services are wired correctly.
 * Run: GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json node functions/functions/tests/launchReadiness.js
 */

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });

const db = admin.firestore();

let passed = 0;
let failed = 0;

function ok(label) { passed++; console.log(`  ✓ ${label}`); }
function fail(label, err) { failed++; console.error(`  ✗ ${label}: ${err}`); }

async function testOnboardingService() {
  console.log("\n── Onboarding Service ──");
  try {
    const svc = require("../services/onboardingService");
    if (typeof svc.setupBusiness !== "function") throw new Error("setupBusiness not exported");
    ok("setupBusiness exported");
    if (typeof svc.importContacts !== "function") throw new Error("importContacts not exported");
    ok("importContacts exported");
    if (typeof svc.setupAlexBriefing !== "function") throw new Error("setupAlexBriefing not exported");
    ok("setupAlexBriefing exported");

    // Validate required field check
    const r = await svc.setupBusiness("test-readiness", {});
    if (!r.ok && r.error) ok("setupBusiness rejects empty name");
    else fail("setupBusiness validation", "should reject empty name");
  } catch (e) {
    fail("onboardingService load", e.message);
  }
}

async function testWorkerRecommendations() {
  console.log("\n── Worker Recommendations ──");
  try {
    const svc = require("../services/workerRecommendations");
    if (typeof svc.getIndustryWorkers !== "function") throw new Error("getIndustryWorkers not exported");
    ok("getIndustryWorkers exported");
    if (typeof svc.getFeaturedWorkers !== "function") throw new Error("getFeaturedWorkers not exported");
    ok("getFeaturedWorkers exported");

    // Test no-vertical industry
    const r = await svc.getIndustryWorkers("other");
    if (r.ok && r.workers.length === 0) ok("'other' returns empty (no vertical)");
    else fail("'other' industry", "should return empty");

    // Test valid industry
    const r2 = await svc.getIndustryWorkers("auto-dealer", { limit: 3 });
    if (r2.ok) ok(`auto-dealer returns ${r2.workers.length} workers (vertical: ${r2.vertical})`);
    else fail("auto-dealer query", r2.error || "unexpected failure");
  } catch (e) {
    fail("workerRecommendations load", e.message);
  }
}

async function testSocialService() {
  console.log("\n── Social Service ──");
  try {
    const svc = require("../services/socialService");
    if (typeof svc.saveDraft !== "function") throw new Error("saveDraft not exported");
    ok("saveDraft exported");
    if (typeof svc.listDrafts !== "function") throw new Error("listDrafts not exported");
    ok("listDrafts exported");
    if (typeof svc.approveDraft !== "function") throw new Error("approveDraft not exported");
    ok("approveDraft exported");
    if (typeof svc.rejectDraft !== "function") throw new Error("rejectDraft not exported");
    ok("rejectDraft exported");
    if (typeof svc.postViaUnified !== "function") throw new Error("postViaUnified not exported");
    ok("postViaUnified exported");
  } catch (e) {
    fail("socialService load", e.message);
  }
}

async function testEmailMarketingService() {
  console.log("\n── Email Marketing Service ──");
  try {
    const svc = require("../services/emailService/marketingCampaigns");
    if (typeof svc.createContactList !== "function") throw new Error("createContactList not exported");
    ok("createContactList exported");
    if (typeof svc.sendMarketingEmail !== "function") throw new Error("sendMarketingEmail not exported");
    ok("sendMarketingEmail exported");
    if (typeof svc.getCampaignStats !== "function") throw new Error("getCampaignStats not exported");
    ok("getCampaignStats exported");
  } catch (e) {
    fail("emailMarketingService load", e.message);
  }
}

async function testFirestoreCollections() {
  console.log("\n── Firestore Collections ──");
  try {
    const snap = await db.collection("digitalWorkers").where("status", "==", "live").limit(1).get();
    if (!snap.empty) ok(`digitalWorkers collection has live workers`);
    else fail("digitalWorkers", "no live workers found");
  } catch (e) {
    fail("Firestore read", e.message);
  }
}

async function testRouteWiring() {
  console.log("\n── Route Wiring (index.js) ──");
  try {
    const indexSrc = require("fs").readFileSync(require("path").join(__dirname, "../index.js"), "utf8");
    const routes = [
      "onboarding:setupBusiness",
      "onboarding:importContacts",
      "recommendations:industry",
      "recommendations:featured",
      "marketing:saveDraft",
      "marketing:listDrafts",
      "marketing:approveDraft",
      "marketing:rejectDraft",
      "marketing:postSocial",
      "marketing:distributePR",
      "marketing:createEmailCampaign",
      "marketing:campaignStats",
    ];
    for (const r of routes) {
      if (indexSrc.includes(`"/${r}"`)) ok(`route /${r} wired`);
      else fail(`route /${r}`, "not found in index.js");
    }
  } catch (e) {
    fail("route wiring check", e.message);
  }
}

(async () => {
  console.log("=== CODEX 49.4 Launch Readiness Test ===");

  await testOnboardingService();
  await testWorkerRecommendations();
  await testSocialService();
  await testEmailMarketingService();
  await testFirestoreCollections();
  await testRouteWiring();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
})();
