"use strict";

/**
 * Clean test for Phase 2 workspace-at-invite.
 *
 * Resets aspensean's advisor record + pendingInvite to a pristine state,
 * fires a fresh advisor invite, prints the new magic link.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   export SENDGRID_API_KEY=<from firebase secrets>
 *   node scripts/cleanTestWorkspaceInvite.js
 */

const path = require("path");
process.env.GCLOUD_PROJECT = "title-app-alpha";

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const FUNCTIONS_DIR = path.join(__dirname, "..", "functions", "functions");
process.chdir(FUNCTIONS_DIR);

const advisorFlow = require(path.join(FUNCTIONS_DIR, "services", "ir", "advisorFlow"));

(async () => {
  const db = admin.firestore();

  console.log("\n=== Clean test: aspensean@gmail.com advisor flow ===\n");

  // 1. Reset advisor record so all obligations are genuinely open
  const ADVISOR_ID = "adv_a6702cc819e40f23";
  console.log(`Step 1: resetting advisor ${ADVISOR_ID} to created state`);
  await db.collection("advisors").doc(ADVISOR_ID).update({
    flowStep: "created",
    kycStatus: "not_submitted",
    termsAcknowledgedAt: null,
    signatureRequestId: null,
    hellosignRequestId: null,
    advisorDocumentRef: null,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("  advisor reset");

  // 2. Reset pendingInvite to pending status so verify re-claims
  console.log("\nStep 2: resetting pendingInvite to pending");
  const invSnap = await db.collection("pendingInvites")
    .where("email", "==", "aspensean@gmail.com")
    .where("role", "==", "advisor")
    .limit(5)
    .get();

  for (const d of invSnap.docs) {
    await d.ref.update({
      status: "pending",
      claimedAt: null,
      claimedByUserId: null,
      claimedWorkspaceId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  reset ${d.id} → status=pending`);
  }

  // 3. Invalidate prior magic links for this advisor (best-effort)
  console.log("\nStep 3: invalidating prior magic links");
  const linkSnap = await db.collection("magicLinks")
    .where("role", "==", "advisor")
    .where("advisorId", "==", ADVISOR_ID)
    .limit(20)
    .get();
  for (const d of linkSnap.docs) {
    await d.ref.update({ used: true, usedAt: admin.firestore.Timestamp.now() });
  }
  console.log(`  invalidated ${linkSnap.size} prior link(s)`);

  // 4. Fire fresh invite (generates new magic link, sends new email)
  console.log("\nStep 4: firing fresh advisor invite");
  const result = await advisorFlow.initiateAdvisorFlow({
    advisorId: ADVISOR_ID,
    email: "aspensean@gmail.com",
    name: "Aspen Combs",
    equityPct: 0.5,
    vestingMonths: 24,
    cliffMonths: 3,
    advisorRole: "test_advisor",
    invitedBy: "sean_clean_test",
  });
  console.log("  Result:", JSON.stringify(result, null, 2));

  // 5. Verify final state
  console.log("\nStep 5: verifying clean state");
  const advAfter = (await db.collection("advisors").doc(ADVISOR_ID).get()).data();
  console.log(`  advisor: flowStep=${advAfter.flowStep} kycStatus=${advAfter.kycStatus}`);

  const invAfter = await db.collection("pendingInvites")
    .where("email", "==", "aspensean@gmail.com")
    .where("role", "==", "advisor")
    .limit(5)
    .get();
  invAfter.forEach(d => {
    const data = d.data();
    console.log(`  invite ${d.id}: status=${data.status} obligations=${(data.pendingObligations || []).length} open=${(data.pendingObligations || []).filter(o => !o.completedAt).length}`);
  });

  console.log("\n=== Done. Clean magic link sent to aspensean@gmail.com ===\n");
  process.exit(0);
})().catch(e => {
  console.error("\nFATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
