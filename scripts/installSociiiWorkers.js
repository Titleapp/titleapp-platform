"use strict";

/**
 * Install (subscribe) SOCIII's own workspace to the workers it needs to
 * run the company. Skips Stripe — these are founder-internal subscriptions,
 * not paying customers.
 *
 * Workers installed:
 *   - BANK-FUND-001 / fundraise (Investor Relations) — Kent's outbound + investor pipeline
 *   - PLAT-IR-CAP-TABLE (if exists) — cap table
 *   - GOV-RECORDS (if exists) — secretary of state / corporate records
 *
 * Subscription shape mirrors POST /v1/worker:subscribe at index.js:6487-6615
 * but writes directly to Firestore.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/installSociiiWorkers.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/installSociiiWorkers.js --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");

const TENANT_ID = "ws_1779846027006_hc71aw";  // SOCIII, Inc. workspace
const OWNER_UID = "WResykI56hW16silsOtvlw1UjJK2"; // Sean's UID (admin of SOCIII workspace)

// Workers to install. Add or remove as needed.
const TARGETS = [
  { slug: "fundraise", workerId: "BANK-FUND-001", label: "Investor Relations" },
];

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — install workers for tenant ${TENANT_ID}\n`);

  for (const target of TARGETS) {
    console.log(`Worker: ${target.label} (${target.workerId})`);

    // Resolve digitalWorkers doc by slug first, then by workerId
    let workerDoc = null;
    const bySlug = await db.doc(`digitalWorkers/${target.slug}`).get();
    if (bySlug.exists) workerDoc = { ...bySlug.data(), workerId: bySlug.id };
    if (!workerDoc) {
      const byId = await db.doc(`digitalWorkers/${target.workerId}`).get();
      if (byId.exists) workerDoc = { ...byId.data(), workerId: byId.id };
    }
    if (!workerDoc) {
      console.log(`  ✗ Not found in digitalWorkers (looked up by slug "${target.slug}" and id "${target.workerId}")\n`);
      continue;
    }
    console.log(`  ✓ Found in marketplace as ${workerDoc.workerId} (${workerDoc.name || workerDoc.display_name})`);

    // Check existing subscription (tenant-scope)
    const existing = await db.collection("subscriptions")
      .where("ownerType", "==", "tenant")
      .where("ownerId", "==", TENANT_ID)
      .where("workerId", "==", workerDoc.workerId)
      .where("trialStatus", "in", ["trial_active", "active", "TRIAL_ACTIVE", "ACTIVE"])
      .limit(1)
      .get();
    if (!existing.empty) {
      console.log(`  ↺ Already subscribed (subscriptionId=${existing.docs[0].id})\n`);
      continue;
    }

    if (!APPLY) {
      console.log(`  + WOULD create subscription + vault entry + welcome message\n`);
      continue;
    }

    // Create the subscription, vault entry, and welcome message in a batch.
    const subRef = db.collection("subscriptions").doc();
    const vaultRef = db.doc(`vaults/${OWNER_UID}/workers/${workerDoc.workerId}`);
    const msgRef = db.collection("workerMessages").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const batch = db.batch();
    batch.set(subRef, {
      ownerType: "tenant",
      ownerId: TENANT_ID,
      userId: OWNER_UID,
      workerId: workerDoc.workerId,
      slug: workerDoc.slug || target.slug,
      workerName: workerDoc.name || workerDoc.display_name || target.label,
      trialStatus: "trial_active",
      trialStartedAt: now,
      trialEndsAt: null,  // founder-internal, no expiry
      createdAt: now,
      source: "founder-internal:installSociiiWorkers",
    });
    batch.set(vaultRef, {
      workerId: workerDoc.workerId,
      workerName: workerDoc.name || workerDoc.display_name || target.label,
      slug: workerDoc.slug || target.slug,
      subscriptionId: subRef.id,
      addedAt: now,
      source: "founder-internal",
    });
    batch.set(msgRef, {
      userId: OWNER_UID,
      workerId: workerDoc.workerId,
      direction: "worker_to_user",
      message: `Hi, I'm ${workerDoc.name || target.label}. I'm ready to help. What would you like to start with?`,
      createdAt: now,
      read: false,
    });
    await batch.commit();

    console.log(`  ✓ Subscribed (subscriptionId=${subRef.id})\n`);
  }

  if (!APPLY) console.log("(dry run — pass --apply to write)\n");
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
