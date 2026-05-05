// scripts/migrateSubscriptionsToOwnerType.js — CODEX 49.32 backfill
//
// Adds the new ownerType / ownerId discriminator fields to existing
// subscriptions/* docs so resolveSubscription stops falling through to legacy
// userId lookups. Safe to re-run; idempotent — only writes when ownerType is
// missing.
//
// Per spec § 8 the migration distinguishes four cases by querying the user's
// active memberships:
//   A. 0 active memberships              → user-scope (ownerType:"user")
//   B. 1 active membership, role=admin   → tenant-scope (ownerType:"tenant")
//   C. 1 active membership, role=member  → user-scope (member doesn't own tenant subs)
//                or  role=viewer            (or use --force-tenant to override per-row)
//   D. >1 active admin memberships       → AMBIGUOUS, do not auto-migrate.
//                                          Log each candidate; rerun with
//                                          --user <uid> --force-tenant <tenantId>
//                                          to resolve.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
//     node scripts/migrateSubscriptionsToOwnerType.js [--dry-run]
//                                                     [--user <uid>]
//                                                     [--force-tenant <tenantId>]
//                                                     [--limit <n>]
//
// Examples:
//   # Dry run across the whole collection
//   node scripts/migrateSubscriptionsToOwnerType.js --dry-run
//
//   # Migrate one user's subs
//   node scripts/migrateSubscriptionsToOwnerType.js --user fPlJ76VM5kQaEtxlMVifVlzeOmq1
//
//   # Resolve a Case D ambiguity by forcing a tenant assignment
//   node scripts/migrateSubscriptionsToOwnerType.js --user fPlJ... --force-tenant ws_acme

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'title-app-alpha' });
const db = admin.firestore();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const userIdx = args.indexOf('--user');
const targetUser = userIdx >= 0 ? args[userIdx + 1] : null;
const forceTenantIdx = args.indexOf('--force-tenant');
const forceTenant = forceTenantIdx >= 0 ? args[forceTenantIdx + 1] : null;
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

if (forceTenant && !targetUser) {
  console.error('ERROR: --force-tenant requires --user <uid>');
  process.exit(1);
}

async function loadActiveMemberships(uid) {
  const snap = await db.collection('memberships')
    .where('userId', '==', uid)
    .where('status', '==', 'active')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function classify(memberships, force) {
  if (force) return { case: 'F', ownerType: 'tenant', ownerId: force };

  const adminMemberships = memberships.filter(m => m.role === 'admin');

  if (memberships.length === 0) {
    return { case: 'A', ownerType: 'user', ownerId: null };
  }
  if (memberships.length === 1) {
    const m = memberships[0];
    if (m.role === 'admin') return { case: 'B', ownerType: 'tenant', ownerId: m.tenantId };
    return { case: 'C', ownerType: 'user', ownerId: null };
  }
  if (adminMemberships.length === 1) {
    return { case: 'B', ownerType: 'tenant', ownerId: adminMemberships[0].tenantId };
  }
  if (adminMemberships.length > 1) {
    return {
      case: 'D',
      ownerType: null,
      ownerId: null,
      candidateTenantIds: adminMemberships.map(m => m.tenantId),
    };
  }
  // Multiple memberships, none admin → user-scope.
  return { case: 'C', ownerType: 'user', ownerId: null };
}

async function main() {
  console.log(`migrateSubscriptionsToOwnerType.js — ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (targetUser) console.log(`Restricted to user: ${targetUser}`);
  if (forceTenant) console.log(`Force tenant assignment: ${forceTenant}`);
  if (limit) console.log(`Limit: ${limit} docs`);
  console.log('');

  let query = db.collection('subscriptions');
  if (targetUser) query = query.where('userId', '==', targetUser);
  if (limit) query = query.limit(limit);

  const snap = await query.get();
  console.log(`Found ${snap.size} subscription docs to inspect.\n`);

  const counts = { skipped: 0, A: 0, B: 0, C: 0, D: 0, F: 0, errored: 0 };
  const ambiguous = [];

  // Cache memberships per user to avoid duplicate queries.
  const membershipCache = new Map();

  for (const doc of snap.docs) {
    const data = doc.data();

    // Idempotent — skip if already migrated.
    if (data.ownerType && data.ownerId) {
      counts.skipped++;
      continue;
    }

    const uid = data.userId;
    if (!uid) {
      console.warn(`[skip] ${doc.id} has no userId field — cannot classify`);
      counts.errored++;
      continue;
    }

    let memberships;
    if (membershipCache.has(uid)) {
      memberships = membershipCache.get(uid);
    } else {
      memberships = await loadActiveMemberships(uid);
      membershipCache.set(uid, memberships);
    }

    const force = (forceTenant && uid === targetUser) ? forceTenant : null;
    const classification = classify(memberships, force);

    if (classification.case === 'D') {
      counts.D++;
      ambiguous.push({
        docId: doc.id,
        userId: uid,
        workerId: data.workerId || data.slug || '?',
        candidateTenantIds: classification.candidateTenantIds,
      });
      continue;
    }

    counts[classification.case]++;

    const newOwnerType = classification.ownerType;
    const newOwnerId = classification.ownerId || uid;

    const update = {
      ownerType: newOwnerType,
      ownerId: newOwnerId,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      migrationCase: classification.case,
    };

    if (dryRun) {
      console.log(`[dry] ${doc.id} (${data.workerId || data.slug || '?'}, user ${uid.slice(0, 8)}…) → case ${classification.case}, ownerType=${newOwnerType}, ownerId=${newOwnerId === uid ? '<userId>' : newOwnerId}`);
    } else {
      try {
        await doc.ref.update(update);
        console.log(`[ok ] ${doc.id} → case ${classification.case}, ownerType=${newOwnerType}, ownerId=${newOwnerId === uid ? '<userId>' : newOwnerId}`);
      } catch (e) {
        console.error(`[err] ${doc.id} update failed:`, e.message);
        counts.errored++;
      }
    }
  }

  console.log('\n== Summary ==');
  console.log(`Already migrated (skipped):   ${counts.skipped}`);
  console.log(`Case A (no memberships):      ${counts.A} → user`);
  console.log(`Case B (single admin):        ${counts.B} → tenant`);
  console.log(`Case C (member/viewer):       ${counts.C} → user`);
  console.log(`Case F (forced):              ${counts.F} → tenant (manual)`);
  console.log(`Case D (ambiguous, deferred): ${counts.D}`);
  console.log(`Errored:                      ${counts.errored}`);

  if (ambiguous.length > 0) {
    console.log('\n== Ambiguous (Case D) — manual review needed ==');
    for (const row of ambiguous) {
      console.log(`  user=${row.userId} sub=${row.docId} worker=${row.workerId} candidates=[${row.candidateTenantIds.join(', ')}]`);
    }
    console.log('\nResolve by re-running with:');
    console.log('  node scripts/migrateSubscriptionsToOwnerType.js --user <uid> --force-tenant <tenantId>');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
