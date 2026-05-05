/**
 * CODEX 50.13 Step 2 — DTC schema migration to v2.
 *
 * Adds the seven fields the architectural principle requires (CODEX 50.13
 * + 50.14) to every existing DTC. Idempotent — re-running is a no-op once
 * a DTC has all seven fields.
 *
 *   version                          int       1
 *   parent_dtc_id                    str|null  null
 *   modification_authority           string    owner_only | workspace_role:admin
 *   chain_anchor_status              string    hash_only
 *   chain                            str|null  null
 *   credentialing_projection_schema  str|null  null
 *   contentHash                      str|null  null   (populated by 50.14 hash anchor service)
 *
 * modification_authority decision:
 *   - tenantId === userId         → owner_only (personal-context DTC)
 *   - tenantId is a workspace ID  → workspace_role:admin (tenant-context DTC)
 *   - tenantId missing            → owner_only (treat as personal)
 *
 * Run:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrateDtcSchemaV2.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrateDtcSchemaV2.js --apply  (write)
 */

const admin = require("/Users/seancombs/titleapp-platform/functions/functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const DRY = !process.argv.includes("--apply");

function defaultModAuthority(dtc) {
  const { userId, tenantId } = dtc;
  if (!tenantId) return "owner_only";
  if (tenantId === userId) return "owner_only";
  return "workspace_role:admin";
}

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — DTC schema v2 migration\n`);

  const snap = await db.collection("dtcs").get();
  console.log(`Scanning ${snap.size} dtcs/* docs...\n`);

  let touched = 0, skipped = 0;
  const dispositions = { owner_only: 0, "workspace_role:admin": 0 };

  for (const doc of snap.docs) {
    const dtc = doc.data();
    const updates = {};

    if (dtc.version === undefined) updates.version = 1;
    if (dtc.parent_dtc_id === undefined) updates.parent_dtc_id = null;
    if (dtc.modification_authority === undefined) {
      updates.modification_authority = defaultModAuthority(dtc);
    }
    if (dtc.chain_anchor_status === undefined) updates.chain_anchor_status = "hash_only";
    if (dtc.chain === undefined) updates.chain = null;
    if (dtc.credentialing_projection_schema === undefined) {
      updates.credentialing_projection_schema = null;
    }
    if (dtc.contentHash === undefined) updates.contentHash = null;

    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }

    if (updates.modification_authority) {
      dispositions[updates.modification_authority] =
        (dispositions[updates.modification_authority] || 0) + 1;
    }

    const fieldList = Object.keys(updates).join(", ");
    console.log(`  ${doc.id.padEnd(28)}  +${Object.keys(updates).length} fields  [${updates.modification_authority || "—"}]  (${fieldList})`);
    if (!DRY) await doc.ref.update(updates);
    touched++;
  }

  console.log();
  console.log(`Touched: ${touched}    Skipped (already migrated): ${skipped}`);
  console.log(`modification_authority breakdown:`, dispositions);
  console.log(`\n${DRY ? "DRY RUN — no writes performed. Re-run with --apply." : "Done."}\n`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
