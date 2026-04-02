#!/usr/bin/env node
/**
 * fix-subscription-status.js — Bulk fix subscriptions with missing or 'unknown' trialStatus
 *
 * Usage:
 *   cd functions/functions
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *     node scripts/fix-subscription-status.js
 */

"use strict";

const admin = require("firebase-admin");
const { TRIAL_ACTIVE, TRIAL_EXPIRED, normalizeLegacyStatus } = require("../config/subscriptionStatus");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "title-app-alpha" });
}

const db = admin.firestore();

async function fixSubscriptionStatus() {
  console.log("[fix-subscription-status] Starting bulk fix...\n");

  const snap = await db.collection("subscriptions").get();
  console.log(`Found ${snap.size} total subscription documents\n`);

  let fixed = 0;
  let skipped = 0;
  let expired = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const ts = data.trialStatus;

    // Skip if trialStatus is already a known valid value
    if (ts && ts !== "unknown" && ts !== "") {
      skipped++;
      continue;
    }

    // Determine correct trialStatus
    let newStatus;
    const trialExpiry = data.trialEndsAt;

    if (trialExpiry) {
      // Has expiry — check if still valid
      const expiryMs = trialExpiry.toMillis ? trialExpiry.toMillis()
        : trialExpiry._seconds ? trialExpiry._seconds * 1000
        : new Date(trialExpiry).getTime();

      if (expiryMs > Date.now()) {
        newStatus = data.status ? normalizeLegacyStatus(data.status) : TRIAL_ACTIVE;
      } else {
        newStatus = TRIAL_EXPIRED;
        expired++;
      }
    } else {
      // No expiry — free worker, set active
      newStatus = data.status ? normalizeLegacyStatus(data.status) : TRIAL_ACTIVE;
    }

    try {
      const update = { trialStatus: newStatus };
      if (!data.trialStartedAt) {
        update.trialStartedAt = data.createdAt || admin.firestore.FieldValue.serverTimestamp();
      }
      await doc.ref.update(update);
      fixed++;
      console.log(`  Fixed: ${doc.id} | userId=${data.userId} | workerId=${data.workerId} | ${ts || "(missing)"} → ${newStatus}`);
    } catch (err) {
      errors++;
      console.error(`  ERROR: ${doc.id} — ${err.message}`);
    }
  }

  console.log(`\n[fix-subscription-status] Done.`);
  console.log(`  Fixed:   ${fixed}`);
  console.log(`  Skipped: ${skipped} (already had valid trialStatus)`);
  console.log(`  Expired: ${expired} (set to trial_expired)`);
  console.log(`  Errors:  ${errors}`);

  // Verify sean@homdao.io subscriptions
  console.log(`\n--- Verifying sean@homdao.io ---`);
  const usersSnap = await db.collection("users")
    .where("email", "==", "sean@homdao.io")
    .limit(1)
    .get();

  if (!usersSnap.empty) {
    const uid = usersSnap.docs[0].id;
    const seanSubs = await db.collection("subscriptions")
      .where("userId", "==", uid)
      .get();
    console.log(`  UID: ${uid}`);
    console.log(`  Subscriptions: ${seanSubs.size}`);
    for (const s of seanSubs.docs) {
      const d = s.data();
      console.log(`    ${s.id} | ${d.workerId || d.slug} | trialStatus=${d.trialStatus}`);
    }
  } else {
    console.log("  User not found — checking by UID in subscriptions...");
  }

  process.exit(0);
}

fixSubscriptionStatus().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
