/**
 * confirmReceipts.js — periodic upgrade pass for pending OpenTimestamps receipts.
 *
 * Bitcoin anchoring is asynchronous — OpenTimestamps issues a calendar-
 * server receipt immediately but the Bitcoin block attestation lands
 * 1-6 hours later. This job runs every 6 hours, walks pending batches,
 * calls OpenTimestamps.upgrade() on each, and writes the upgraded
 * receipt + confirmation timestamp when Bitcoin attestation is available.
 *
 * Also retries OTS submission for batches where the original submit
 * failed (opentimestampsReceipt: null, opentimestampsError: set).
 */

const admin = require("firebase-admin");
const { upgradeOpenTimestamps, submitToOpenTimestamps } = require("./dailyBatchAnchor");

function getDb() { return admin.firestore(); }

async function runConfirmReceipts() {
  const db = getDb();
  const pending = await db.collection("dtcAnchorBatches")
    .where("opentimestampsConfirmedAt", "==", null)
    .get();

  if (pending.empty) {
    console.log("[confirmReceipts] no pending batches");
    return { upgraded: 0, retried: 0, errors: 0 };
  }

  let upgraded = 0, retried = 0, errors = 0;

  for (const doc of pending.docs) {
    const data = doc.data();
    try {
      // Retry path: original submit failed, no receipt at all.
      if (!data.opentimestampsReceipt && data.merkleRoot) {
        const receipt = await submitToOpenTimestamps(data.merkleRoot);
        await doc.ref.update({
          opentimestampsReceipt: receipt,
          opentimestampsSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
          opentimestampsError: null,
        });
        retried++;
        continue;
      }

      // Upgrade path: receipt exists, try to attach Bitcoin attestation.
      const result = await upgradeOpenTimestamps(data.opentimestampsReceipt);
      if (result.upgraded) {
        await doc.ref.update({
          opentimestampsReceipt: result.receiptB64,
          opentimestampsConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        upgraded++;
        console.log(`[confirmReceipts] batch ${doc.id} confirmed`);
      }
    } catch (e) {
      errors++;
      console.error(`[confirmReceipts] batch ${doc.id} failed: ${e.message}`);
      // Persist the error but don't block other batches.
      await doc.ref.update({ opentimestampsError: e.message || String(e) });
    }
  }

  console.log(`[confirmReceipts] upgraded=${upgraded} retried=${retried} errors=${errors}`);
  return { upgraded, retried, errors };
}

module.exports = { runConfirmReceipts };
