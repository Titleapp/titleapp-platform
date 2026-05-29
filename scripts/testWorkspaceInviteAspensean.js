"use strict";

/**
 * One-shot — fire a fresh advisor invite to aspensean@gmail.com so we can
 * test the Phase 2 workspace-at-invite flow end-to-end. Uses the same
 * direct-call pattern as scripts/forceSyncHrFundraise.js to bypass HTTP auth.
 *
 * What this exercises:
 *   - initiateAdvisorFlow → recordPendingInvite (sets up obligations)
 *   - magic-link email send (SendGrid)
 *   - on click → magic-link:verify claims invite + returns metadata
 *   - AuthMagic redirect → /?worker=hr-people&invite=<id>
 *   - WorkspaceObligationsBanner renders 3 obligation cards
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   node scripts/testWorkspaceInviteAspensean.js
 */

const path = require("path");
process.env.GCLOUD_PROJECT = "title-app-alpha";

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const FUNCTIONS_DIR = path.join(__dirname, "..", "functions", "functions");
process.chdir(FUNCTIONS_DIR);

const advisorFlow = require(path.join(FUNCTIONS_DIR, "services", "ir", "advisorFlow"));

(async () => {
  console.log("\nFiring advisor invite to aspensean@gmail.com for Phase 2 dogfood\n");

  const result = await advisorFlow.initiateAdvisorFlow({
    email: "aspensean@gmail.com",
    name: "Aspen Combs",
    equityPct: 0.5,
    vestingMonths: 24,
    cliffMonths: 3,
    advisorRole: "test_advisor",
    invitedBy: "sean_dogfood_phase2",
  });

  console.log("Result:", JSON.stringify(result, null, 2));

  // Verify pendingInvites populated
  const db = admin.firestore();
  const snap = await db.collection("pendingInvites")
    .where("email", "==", "aspensean@gmail.com")
    .where("role", "==", "advisor")
    .limit(5)
    .get();

  console.log(`\n${snap.size} pendingInvite(s) for aspensean@gmail.com (advisor):`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`  - ${d.id} status=${data.status} obligations=${(data.pendingObligations || []).length} entityId=${data.entityId}`);
    (data.pendingObligations || []).forEach(o => {
      console.log(`     · ${o.id} (${o.type}) → ${o.worker} · ${o.label}`);
    });
  });

  console.log("\nMagic link sent. Check aspensean@gmail.com inbox.");
  console.log("On click, should land at: /?worker=hr-people&invite=<id> with obligation banner.\n");
  process.exit(0);
})().catch(e => {
  console.error("\nFATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
