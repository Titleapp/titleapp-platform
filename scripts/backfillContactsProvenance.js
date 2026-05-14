"use strict";

/**
 * Backfill source_member_uid + imported_at + enrichment_history[] on
 * every contact in a tenant. Required for the ownership/value-add policy
 * (S50.23) so existing contacts have the same provenance footprint as
 * new writes — when Kent leaves, member-imported vs. platform-enriched
 * fields can be distinguished.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... TENANT_ID=ws_... SOURCE_MEMBER_UID=4WHj... \
 *     node scripts/backfillContactsProvenance.js          # dry run
 *
 *   ... node scripts/backfillContactsProvenance.js --apply  # write
 *
 * Idempotent — only writes when fields are missing.
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const TENANT_ID = process.env.TENANT_ID;
const SOURCE_MEMBER_UID = process.env.SOURCE_MEMBER_UID;
if (!TENANT_ID) { console.error("ERROR: set TENANT_ID env var"); process.exit(1); }
if (!SOURCE_MEMBER_UID) { console.error("ERROR: set SOURCE_MEMBER_UID env var"); process.exit(1); }

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — backfill provenance for tenant=${TENANT_ID}, source_member_uid=${SOURCE_MEMBER_UID}\n`);

  const snap = await db.collection("contacts").where("tenantId", "==", TENANT_ID).get();
  console.log(`Total contacts in tenant: ${snap.size}`);

  const missing = snap.docs.filter(d => {
    const data = d.data();
    return !data.source_member_uid || !data.imported_at || !Array.isArray(data.enrichment_history);
  });
  console.log(`Missing provenance fields: ${missing.length}`);
  console.log(`Already backfilled: ${snap.size - missing.length}\n`);

  if (!missing.length) { console.log("Nothing to do."); process.exit(0); }

  if (!APPLY) {
    console.log(`(dry run — pass --apply to write to ${missing.length} contacts)\n`);
    process.exit(0);
  }

  let written = 0;
  for (let i = 0; i < missing.length; i += 450) {
    const slice = missing.slice(i, i + 450);
    const batch = db.batch();
    for (const d of slice) {
      const data = d.data();
      const patch = {};
      if (!data.source_member_uid) patch.source_member_uid = SOURCE_MEMBER_UID;
      // Fall back to created_at when present so we preserve the real
      // import time. If neither exists, use serverTimestamp — the actual
      // import predates this run, but a timestamp on file is still better
      // than null for downstream filters.
      if (!data.imported_at) {
        patch.imported_at = data.created_at || admin.firestore.FieldValue.serverTimestamp();
      }
      if (!Array.isArray(data.enrichment_history)) patch.enrichment_history = [];
      patch.provenance_backfilled_at = admin.firestore.FieldValue.serverTimestamp();
      batch.update(d.ref, patch);
      written += 1;
    }
    await batch.commit();
    console.log(`  committed ${written}/${missing.length}`);
  }

  console.log(`\nDONE — backfilled ${written} contacts.\n`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
