// scripts/migrateChatFilesToStorageObjects.js — 49.27 backfill
//
// Copies metadata from the legacy `files` collection (chat uploads pre-49.27)
// into the canonical `storageObjects` collection so the Vault UI can see them.
//
// Safe to re-run — skips any record whose storagePath already has a
// storageObjects entry. The Cloud Storage blobs are NOT moved; storageObjects
// just points at the existing `uploads/{userId}/...` paths.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
//     node scripts/migrateChatFilesToStorageObjects.js [--user <uid>] [--dry-run] [--limit <n>]

const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp({ projectId: 'title-app-alpha' });
const db = admin.firestore();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const userIdx = args.indexOf('--user');
const targetUser = userIdx >= 0 ? args[userIdx + 1] : null;
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

function newObjectId() {
  return `doc_${crypto.randomBytes(12).toString('hex')}`;
}

async function alreadyMigrated(storagePath) {
  if (!storagePath) return false;
  const snap = await db.collection('storageObjects')
    .where('storagePath', '==', storagePath)
    .limit(1)
    .get();
  return !snap.empty;
}

async function migrate() {
  let query = db.collection('files');
  if (targetUser) query = query.where('userId', '==', targetUser);
  if (limit) query = query.limit(limit);

  const snap = await query.get();
  console.log(`Found ${snap.size} legacy files records${targetUser ? ` for user ${targetUser}` : ''}.`);

  let migrated = 0;
  let skippedExisting = 0;
  let skippedInvalid = 0;
  let batches = [db.batch()];
  let batchCount = 0;

  for (const doc of snap.docs) {
    const f = doc.data();
    const storagePath = f.storagePath;

    if (!storagePath || !f.userId) {
      skippedInvalid++;
      continue;
    }

    // Idempotency check — skip if storageObjects already has this path
    if (await alreadyMigrated(storagePath)) {
      skippedExisting++;
      continue;
    }

    const objectId = newObjectId();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const record = {
      objectId,
      ownerUid: f.userId,
      orgId: null,
      scope: 'personal',
      storagePath,
      filename: f.name || storagePath.split('/').pop() || 'file',
      mimeType: f.contentType || 'application/octet-stream',
      sizeBytes: f.size || 0,
      version: 1,
      createdByWorker: null,
      parentProjectId: null,
      tags: [
        'migrated:from-files',
        `tenant:${f.tenantId || 'default'}`,
        'source:chat',
      ],
      accessList: [{ uid: f.userId, permission: 'admin' }],
      status: 'active',
      createdAt: f.createdAt || now,
      updatedAt: now,
      legacyFileId: doc.id,
    };

    if (dryRun) {
      console.log(`[dry-run] would create storageObjects/${objectId} for legacy files/${doc.id} (${record.filename})`);
    } else {
      batches[batches.length - 1].set(db.doc(`storageObjects/${objectId}`), record);
      batchCount++;
      if (batchCount >= 490) {
        batches.push(db.batch());
        batchCount = 0;
      }
    }
    migrated++;
  }

  if (!dryRun) {
    for (const b of batches) await b.commit();
  }

  console.log('--- migration summary ---');
  console.log(`migrated:         ${migrated}`);
  console.log(`skipped (exists): ${skippedExisting}`);
  console.log(`skipped (bad):    ${skippedInvalid}`);
  console.log(`mode:             ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
}

migrate().then(() => process.exit(0)).catch(e => {
  console.error('migration failed:', e);
  process.exit(1);
});
