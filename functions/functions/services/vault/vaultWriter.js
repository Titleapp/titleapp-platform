"use strict";

/**
 * vaultWriter.js — the server-side API a Digital Worker uses to WRITE to the
 * Vault: mint a record (DTC) and append events to its append-only logbook.
 *
 * This is the foundation for "workers update real records" (#60) — education
 * (student academic records), aviation (aircraft MX + pilot currency logs),
 * real estate (property/title records). It mirrors the /v1/dtc:create and
 * /v1/logbook:append routes EXACTLY (same schema, same modification-authority
 * gate, same contentHash) so HTTP and worker writes are interchangeable — and
 * adds two things the routes don't have:
 *   1. vault_writes PERMISSION enforcement — a worker may only mint/append a
 *      record type it declared in its schema's vault_writes (or "*").
 *   2. createdByWorker provenance on every event, so the logbook shows which
 *      worker acted (the VaultDTCs logbook viewer already renders this).
 *
 * INVARIANT: records are never overwritten. To "update" a record you APPEND an
 * event to its logbook. Mint once; append forever.
 */

const admin = require("firebase-admin");

function db() { return admin.firestore(); }

// A worker's declared write permissions. Accepts either the synced array
// (dtc.vault_writes) or the authoring shape (worker.vault.writes). "*" = any.
function declaredWrites(worker) {
  if (!worker) return [];
  if (Array.isArray(worker.vault_writes)) return worker.vault_writes;
  if (worker.vault && Array.isArray(worker.vault.writes)) return worker.vault.writes;
  return [];
}

function workerCanWrite(worker, type) {
  const w = declaredWrites(worker);
  return w.includes("*") || w.includes(type);
}

/**
 * Mint a new Vault record (DTC) + its creation logbook event.
 *
 * @param {object} a
 * @param {string} a.userId        owner uid (the record belongs to them)
 * @param {string|null} a.tenantId workspace/persona ("vault" for personal)
 * @param {string} a.type          DTC type — must be in the worker's vault_writes
 * @param {object} a.metadata      record metadata (must include a title)
 * @param {string[]} [a.fileIds]
 * @param {object} [a.worker]      the calling worker (for permission + provenance)
 * @param {string} [a.createdByWorker] worker slug/name stamped on the event
 * @returns {Promise<{ok, dtcId?, contentHash?, error?}>}
 */
async function mintDtc({ userId, tenantId = null, type, metadata, fileIds = [], worker = null, createdByWorker = null }) {
  if (!userId || !type || !metadata) return { ok: false, error: "userId, type, and metadata are required" };
  if (worker && !workerCanWrite(worker, type)) {
    return { ok: false, error: `worker not permitted to write type "${type}" (declare it in vault_writes)` };
  }

  // Personal vault uses tenantId "vault" (not the uid), so recognize it
  // explicitly — otherwise a personal record would be classed as a workspace
  // and lose owner-only protection. (The /v1/dtc:create route has the older
  // narrower check; fixed here for #60.)
  const isPersonal = !tenantId || tenantId === userId || tenantId === "vault" || tenantId === "personal";
  const createdAtDate = new Date();
  const createdAtTimestamp = admin.firestore.Timestamp.fromDate(createdAtDate);
  const createdAtIso = createdAtDate.toISOString();

  const dtcRecord = {
    userId,
    tenantId,
    type,
    metadata,
    fileIds: fileIds || [],
    blockchainProof: null,
    logbookCount: 0,
    version: 1,
    parent_dtc_id: null,
    modification_authority: isPersonal ? "owner_only" : "workspace_role:admin",
    chain_anchor_status: "hash_only",
    chain: null,
    credentialing_projection_schema: null,
    batchId: null,
    source: createdByWorker || (worker && (worker.slug || worker.worker_id)) || "worker",
    createdAt: createdAtTimestamp,
  };

  try {
    const { contentHash } = require("../anchor/hashAnchor");
    dtcRecord.contentHash = contentHash({ ...dtcRecord, createdAt: createdAtIso });
  } catch (e) {
    // Hash anchor is best-effort here; never block the mint on it.
    console.warn("[vaultWriter] contentHash failed:", e.message);
  }

  const ref = await db().collection("dtcs").add(dtcRecord);

  // Creation event (append-only). Keeps logbookCount honest from the start.
  await db().collection("logbookEntries").add({
    dtcId: ref.id,
    userId,
    tenantId,
    dtcTitle: metadata.title || metadata.name || type,
    entryType: "creation",
    data: { description: `Record created${createdByWorker ? ` by ${createdByWorker}` : ""}` },
    files: [],
    ...(createdByWorker ? { createdByWorker } : {}),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await ref.update({ logbookCount: 1 });

  return { ok: true, dtcId: ref.id, contentHash: dtcRecord.contentHash || null };
}

/**
 * Append an event to a record's logbook. This is how a worker "updates" a
 * record — append-only, never overwrite. Enforces the DTC's modification
 * authority (owner_only → creator; workspace_role:<role> → role gate) exactly
 * like /v1/logbook:append.
 *
 * @param {object} a
 * @param {string} a.userId        the acting user (must satisfy the DTC's auth)
 * @param {string} a.dtcId
 * @param {string} a.entryType     e.g. "reflection.submitted", "inspection", "ad_complied"
 * @param {object} a.data          event payload (include a `description`)
 * @param {string[]} [a.files]
 * @param {object} [a.worker]
 * @param {string} [a.createdByWorker]
 * @returns {Promise<{ok, entryId?, error?, code?}>}
 */
async function appendEvent({ userId, dtcId, entryType, data, files = [], worker = null, createdByWorker = null }) {
  if (!userId || !dtcId || !entryType || !data) return { ok: false, error: "userId, dtcId, entryType, and data are required" };

  const dtcDoc = await db().collection("dtcs").doc(dtcId).get();
  if (!dtcDoc.exists) return { ok: false, error: "DTC not found", code: "not_found" };
  const dtcData = dtcDoc.data();

  // Optional worker-permission check against the record's type.
  if (worker && dtcData.type && !workerCanWrite(worker, dtcData.type)) {
    return { ok: false, error: `worker not permitted to write type "${dtcData.type}"`, code: "forbidden" };
  }

  // Modification-authority gate (mirrors /v1/logbook:append).
  const auth = dtcData.modification_authority || "owner_only";
  let allowed = false;
  if (auth === "owner_only") {
    allowed = dtcData.userId === userId;
  } else if (auth.startsWith("workspace_role:")) {
    const role = auth.slice("workspace_role:".length);
    if (!dtcData.tenantId) {
      allowed = dtcData.userId === userId;
    } else {
      try {
        const { enforceRoleGate } = require("../../middleware/membershipCheck");
        const gate = await enforceRoleGate(userId, dtcData.tenantId, role);
        allowed = gate.ok;
      } catch (e) {
        console.warn("[vaultWriter] role gate failed:", e.message);
        allowed = false;
      }
    }
  }
  if (!allowed) return { ok: false, error: "Insufficient permission to append to this DTC", code: "forbidden" };

  const ref = await db().collection("logbookEntries").add({
    dtcId,
    userId,
    tenantId: dtcData.tenantId || null,
    dtcTitle: dtcData.metadata?.title || dtcData.metadata?.name || "Untitled",
    entryType,
    data,
    files: Array.isArray(files) ? files : [],
    ...(createdByWorker ? { createdByWorker } : {}),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db().collection("dtcs").doc(dtcId).update({
    logbookCount: admin.firestore.FieldValue.increment(1),
  });

  return { ok: true, entryId: ref.id };
}

module.exports = { mintDtc, appendEvent, workerCanWrite, declaredWrites };
