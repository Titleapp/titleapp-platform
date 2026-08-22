"use strict";

/**
 * tenantIntegrationMigration.js — shared helper for the uid-only → uid+tenant
 * migration of Google integration docs (Gmail / Drive / Calendar).
 *
 * BUG (fixed 2026-08-22): Gmail/Drive/Calendar OAuth tokens were stored at
 * users/{uid}/integrations/{provider} — keyed by Firebase Auth uid ONLY, with
 * no tenant/workspace awareness. Because switching between workspaces under
 * one real login is the same uid, any workspace the signed-in user could
 * access could read/send/search from the SAME connected Google account —
 * including workspaces where the user never connected it themselves. Fixed
 * by moving storage to users/{uid}/workspaces/{tenantId}/integrations/{provider}
 * (the same per-(user,tenant) doc shape already used elsewhere in this
 * codebase, e.g. users/{uid}/workspaces/{tenantId} for membership context).
 *
 * MIGRATION BEHAVIOR — conservative by design. It must never silently
 * disconnect a real, already-working Google connection, and it must never
 * reproduce the original bug by fanning the same legacy connection out to
 * every tenant automatically:
 *
 *   1. Look up the new tenant-scoped doc first. If connected there, use it —
 *      no legacy lookup needed at all.
 *   2. Otherwise check the legacy uid-only doc.
 *      - Not connected there either → nothing to migrate, report disconnected.
 *      - Already claimed by a DIFFERENT tenantId (legacyData.migratedToTenantId
 *        set and != this tenantId) → refuse the fallback. This tenant must
 *        connect fresh. This is what prevents the bug from reproducing itself
 *        under the new scheme.
 *      - Unclaimed, or already claimed by THIS SAME tenantId → copy the
 *        legacy doc's fields into the new tenant-scoped doc, and stamp the
 *        legacy doc with migratedToTenantId so no OTHER tenant can silently
 *        inherit it later.
 *
 * The legacy doc is intentionally never deleted by this helper. Any other,
 * not-yet-updated code path that still reads the legacy uid-only doc directly
 * keeps working exactly as it did before this fix — no regression, no risk of
 * losing a real token. (Known, accepted limitation: those direct-legacy-read
 * paths remain cross-tenant-shared until they're migrated onto this same
 * pattern; they were not part of this fix's scope.)
 */

/**
 * @param {object} opts
 * @param {FirebaseFirestore.DocumentReference} opts.newRef - tenant-scoped doc
 * @param {FirebaseFirestore.DocumentReference} opts.legacyRef - old uid-only doc
 * @param {(data: object) => boolean} opts.isConnected - true if a doc's data represents a live connection
 * @param {string} opts.tenantId - the tenant context currently asking
 * @returns {Promise<{snap: FirebaseFirestore.DocumentSnapshot, migrated: boolean}>}
 */
async function resolveTenantIntegrationDoc({ newRef, legacyRef, isConnected, tenantId }) {
  if (!tenantId) throw new Error("resolveTenantIntegrationDoc requires tenantId");

  const newSnap = await newRef.get();
  if (newSnap.exists && isConnected(newSnap.data())) {
    return { snap: newSnap, migrated: false };
  }

  const legacySnap = await legacyRef.get();
  if (!legacySnap.exists || !isConnected(legacySnap.data())) {
    return { snap: newSnap, migrated: false }; // nothing usable anywhere
  }

  const legacyData = legacySnap.data();
  const claimedBy = legacyData.migratedToTenantId || null;
  if (claimedBy && claimedBy !== tenantId) {
    // Already migrated into a different tenant context — do not share further.
    return { snap: newSnap, migrated: false };
  }

  const { migratedToTenantId, ...tokenFields } = legacyData;
  await newRef.set(tokenFields, { merge: true });
  if (claimedBy !== tenantId) {
    await legacyRef.set({ migratedToTenantId: tenantId }, { merge: true }).catch(() => {});
    console.log(`[tenant-integration-migration] ${legacyRef.path} claimed by tenant=${tenantId}, copied to ${newRef.path}`);
  }
  const freshSnap = await newRef.get();
  return { snap: freshSnap, migrated: true };
}

/**
 * Collection-level variant — used for the Gmail "extra accounts" subcollection,
 * where there's no single doc to resolve, but a whole set of docs keyed by
 * accountId. Same claim semantics per-doc.
 */
async function resolveTenantIntegrationCollection({ newColl, legacyColl, isConnected, tenantId }) {
  if (!tenantId) throw new Error("resolveTenantIntegrationCollection requires tenantId");

  const newSnap = await newColl.get();
  if (!newSnap.empty) return newSnap;

  const legacySnap = await legacyColl.get();
  if (legacySnap.empty) return newSnap;

  const db = newColl.firestore;
  const batch = db.batch();
  let anyCopied = false;
  for (const d of legacySnap.docs) {
    const data = d.data();
    if (!isConnected(data)) continue;
    const claimedBy = data.migratedToTenantId || null;
    if (claimedBy && claimedBy !== tenantId) continue; // claimed by a different tenant — skip
    const { migratedToTenantId, ...fields } = data;
    batch.set(newColl.doc(d.id), fields, { merge: true });
    if (claimedBy !== tenantId) batch.set(d.ref, { migratedToTenantId: tenantId }, { merge: true });
    anyCopied = true;
  }
  if (anyCopied) {
    await batch.commit();
    console.log(`[tenant-integration-migration] ${legacyColl.path} claimed by tenant=${tenantId}, copied to ${newColl.path}`);
  }
  return await newColl.get();
}

module.exports = { resolveTenantIntegrationDoc, resolveTenantIntegrationCollection };
