"use strict";

/**
 * Port contacts from one workspace (tenant) to another.
 *
 * Use case: Sean's LinkedIn contacts live in the TitleApp AI workspace.
 * Now that SOCIII Inc. exists as its own workspace/tenant, copy the
 * contacts so Kent (and the IR/Fundraise worker) can run outreach with
 * Apollo enrichment billed against SOCIII Inc.'s data-fee meter.
 *
 * Provenance preservation:
 *   - target contact gets a `ported_from` block (source_tenant_id,
 *     source_contact_id, ported_at, ported_by_uid)
 *   - source contact gets a `ported_to[<target_tenant_id>] = <new id>` mark
 *     so re-running the script is idempotent
 *   - `enrichment_history[]` is preserved on the copy — prior Apollo spend
 *     stays attributed to whoever paid for it (paid_by_tenant_id)
 *   - new enrichment under SOCIII will append fresh history rows with
 *     paid_by_tenant_id = <sociii-tenant-id>
 *
 * Usage:
 *
 *   # 1. Find your tenant IDs (lists every workspace your UID is a member of)
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *   USER_UID=<sean-firebase-uid> \
 *   node scripts/portContactsToSociii.js --list
 *
 *   # 2. Dry-run port (no writes — shows what would happen)
 *   GOOGLE_APPLICATION_CREDENTIALS=... \
 *   FROM_TENANT_ID=<titleapp-tenant-id> \
 *   TO_TENANT_ID=<sociii-tenant-id> \
 *   PORTED_BY_UID=<sean-uid> \
 *   node scripts/portContactsToSociii.js
 *
 *   # 3. Apply (write)
 *   ... node scripts/portContactsToSociii.js --apply
 *
 * Idempotent: re-running skips any contact already ported (tracked via
 *   ported_to.<target_tenant_id> on the source contact).
 *
 * Dedupe: skips target writes if a contact with the same primary email
 *   already exists in the target tenant.
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const LIST_MODE = process.argv.includes("--list");
const APPLY = process.argv.includes("--apply");

async function resolveUid() {
  let uid = process.env.USER_UID;
  if (uid) return uid;
  const email = process.env.USER_EMAIL;
  if (!email) return null;
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Resolved ${email} → UID ${user.uid}\n`);
    return user.uid;
  } catch (e) {
    console.error(`ERROR: could not find Firebase user for email ${email}: ${e.message}`);
    process.exit(1);
  }
}

async function listMode() {
  const uid = await resolveUid();
  if (!uid) {
    console.error("ERROR: --list mode requires USER_UID or USER_EMAIL env var");
    console.error("       e.g. USER_EMAIL=sean@titleapp.ai node scripts/portContactsToSociii.js --list");
    process.exit(1);
  }
  const snap = await db.collection("memberships").where("userId", "==", uid).get();
  if (snap.empty) {
    console.log(`No memberships found for UID ${uid}`);
    process.exit(0);
  }
  console.log(`\nWorkspaces for UID ${uid}:\n`);
  for (const m of snap.docs) {
    const data = m.data();
    const tenantId = data.tenantId;
    let name = "(unknown)";
    let workerCount = 0;
    try {
      const tDoc = await db.collection("tenants").doc(tenantId).get();
      if (tDoc.exists) name = tDoc.data().name || tDoc.data().displayName || "(unnamed)";
    } catch (_) {}
    try {
      const cSnap = await db.collection("contacts").where("tenantId", "==", tenantId).limit(1000).count().get();
      workerCount = cSnap.data().count;
    } catch (_) {}
    console.log(`  tenantId: ${tenantId}`);
    console.log(`    name:     ${name}`);
    console.log(`    role:     ${data.role || "(no role)"}`);
    console.log(`    contacts: ${workerCount}`);
    console.log("");
  }
  process.exit(0);
}

async function portMode() {
  const FROM_TENANT_ID = process.env.FROM_TENANT_ID;
  const TO_TENANT_ID = process.env.TO_TENANT_ID;
  let PORTED_BY_UID = process.env.PORTED_BY_UID;

  if (!FROM_TENANT_ID || !TO_TENANT_ID) {
    console.error("ERROR: set FROM_TENANT_ID and TO_TENANT_ID env vars");
    console.error("       (run with --list first to find them)");
    process.exit(1);
  }
  if (!PORTED_BY_UID) {
    PORTED_BY_UID = await resolveUid();
  }
  if (!PORTED_BY_UID) {
    console.error("ERROR: set PORTED_BY_UID (or USER_EMAIL) env var — for provenance trail");
    process.exit(1);
  }
  if (FROM_TENANT_ID === TO_TENANT_ID) {
    console.error("ERROR: FROM and TO tenant IDs are the same");
    process.exit(1);
  }

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — port contacts`);
  console.log(`  FROM: ${FROM_TENANT_ID}`);
  console.log(`  TO:   ${TO_TENANT_ID}`);
  console.log(`  BY:   ${PORTED_BY_UID}\n`);

  const sourceSnap = await db.collection("contacts").where("tenantId", "==", FROM_TENANT_ID).get();
  console.log(`Source tenant contacts: ${sourceSnap.size}`);

  const liveSource = sourceSnap.docs.filter(d => (d.data().status || "active") !== "deleted");
  console.log(`  active (not soft-deleted): ${liveSource.length}`);

  const alreadyPorted = liveSource.filter(d => {
    const data = d.data();
    return data.ported_to && data.ported_to[TO_TENANT_ID];
  });
  console.log(`  already ported to target: ${alreadyPorted.length}`);

  const toPort = liveSource.filter(d => {
    const data = d.data();
    return !(data.ported_to && data.ported_to[TO_TENANT_ID]);
  });
  console.log(`  pending port: ${toPort.length}\n`);

  const targetEmailsSnap = await db.collection("contacts").where("tenantId", "==", TO_TENANT_ID).get();
  const targetEmails = new Set();
  for (const d of targetEmailsSnap.docs) {
    const e = (d.data().email || d.data().primary_email || "").toLowerCase().trim();
    if (e) targetEmails.add(e);
  }
  console.log(`Target tenant already has ${targetEmailsSnap.size} contacts (${targetEmails.size} with email)\n`);

  let willWrite = 0;
  let willSkipDupe = 0;
  const samplePreview = [];
  for (const d of toPort) {
    const data = d.data();
    const email = (data.email || data.primary_email || "").toLowerCase().trim();
    if (email && targetEmails.has(email)) {
      willSkipDupe += 1;
      continue;
    }
    willWrite += 1;
    if (samplePreview.length < 5) {
      samplePreview.push({
        sourceId: d.id,
        name: data.name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || "(no name)",
        email: email || "(none)",
        company: data.company || data.enrichment?.company || "(none)",
      });
    }
  }
  console.log(`Plan:`);
  console.log(`  will copy:           ${willWrite}`);
  console.log(`  will skip (dupe by email in target): ${willSkipDupe}\n`);

  if (samplePreview.length) {
    console.log(`Sample preview (first ${samplePreview.length}):`);
    for (const s of samplePreview) {
      console.log(`  - ${s.name.padEnd(30)} ${s.email.padEnd(35)} ${s.company}`);
    }
    console.log("");
  }

  if (!APPLY) {
    console.log("DRY RUN — no writes performed. Pass --apply to execute.\n");
    process.exit(0);
  }

  if (willWrite === 0) {
    console.log("Nothing to write.");
    process.exit(0);
  }

  let written = 0;
  let sourceMarked = 0;
  let skipped = 0;

  for (let i = 0; i < toPort.length; i += 200) {
    const slice = toPort.slice(i, i + 200);
    const batch = db.batch();
    let batchOps = 0;

    for (const sourceDoc of slice) {
      const sourceData = sourceDoc.data();
      const email = (sourceData.email || sourceData.primary_email || "").toLowerCase().trim();
      if (email && targetEmails.has(email)) {
        skipped += 1;
        continue;
      }

      const targetRef = db.collection("contacts").doc();
      const portedAt = admin.firestore.FieldValue.serverTimestamp();

      const newDoc = {
        ...sourceData,
        tenantId: TO_TENANT_ID,
        workspaces: Array.isArray(sourceData.workspaces)
          ? Array.from(new Set([...sourceData.workspaces.filter(w => w !== FROM_TENANT_ID), TO_TENANT_ID]))
          : [TO_TENANT_ID],
        ported_from: {
          source_tenant_id: FROM_TENANT_ID,
          source_contact_id: sourceDoc.id,
          ported_at: new Date().toISOString(),
          ported_by_uid: PORTED_BY_UID,
        },
        created_at: portedAt,
        updated_at: portedAt,
      };
      delete newDoc.ported_to;

      batch.set(targetRef, newDoc);

      batch.update(sourceDoc.ref, {
        [`ported_to.${TO_TENANT_ID}`]: {
          target_contact_id: targetRef.id,
          ported_at: new Date().toISOString(),
          ported_by_uid: PORTED_BY_UID,
        },
        updated_at: portedAt,
      });

      batchOps += 2;
      written += 1;
      sourceMarked += 1;

      if (email) targetEmails.add(email);
    }

    if (batchOps > 0) {
      await batch.commit();
      console.log(`  committed batch: +${batchOps / 2} contacts (running total: ${written})`);
    }
  }

  console.log(`\nDONE`);
  console.log(`  written to target:  ${written}`);
  console.log(`  source marked:      ${sourceMarked}`);
  console.log(`  skipped (dupe):     ${skipped}`);
  console.log("");
  process.exit(0);
}

(async () => {
  if (LIST_MODE) {
    await listMode();
  } else {
    await portMode();
  }
})().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
