/**
 * migrateUserSchema.js — 46.3 USER-001 one-time migration
 *
 * Backfills firstName, avatarInitials, activeProfileId on all existing user docs.
 * Run once after deploying functions.
 *
 * Usage:
 *   cd ~/titleapp-platform/functions/functions
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *     node scripts/migrateUserSchema.js
 */

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'title-app-alpha' });
const db = admin.firestore();

function deriveFields(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const firstName = parts[0];
  const avatarInitials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
  return { firstName, avatarInitials };
}

async function migrate() {
  const snap = await db.collection('users').get();
  let updated = 0, skipped = 0, errors = 0;

  for (const doc of snap.docs) {
    const d = doc.data();

    // Skip if all three fields already exist
    if (d.firstName && d.avatarInitials && d.activeProfileId) {
      console.log('SKIP (already migrated):', doc.id, d.email || 'no email');
      skipped++;
      continue;
    }

    const update = { activeProfileId: 'default' };
    const derived = d.name ? deriveFields(d.name) : null;
    if (derived) {
      update.firstName = derived.firstName;
      update.avatarInitials = derived.avatarInitials;
    } else {
      console.log('NOTE (no name field):', doc.id, d.email || 'no email', '— activeProfileId only');
    }

    try {
      await doc.ref.update(update);
      console.log('UPDATED:', doc.id, d.email || 'no email', JSON.stringify(update));
      updated++;
    } catch (e) {
      console.error('ERROR:', doc.id, e.message);
      errors++;
    }
  }

  console.log('\n--- Migration complete ---');
  console.log('Updated:', updated);
  console.log('Skipped:', skipped);
  console.log('Errors:', errors);
  process.exit(errors > 0 ? 1 : 0);
}

migrate();
