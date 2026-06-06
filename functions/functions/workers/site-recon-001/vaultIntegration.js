"use strict";

/**
 * SITE-RECON-001 — Vault DTC logbook bridge (Build Step 8)
 *
 * Spec §8: every pull writes a parcel logbook entry in Vault DTC; batched
 * pulls write one entry per parcel in the manifest.
 *
 * The repo's Vault model (from /logbook:append + /dtc:create in index.js):
 * logbook entries are DTC-ANCHORED — `logbookEntries` docs carry a required
 * dtcId and increment the parent DTC's logbookCount. There is no
 * freestanding logbook endpoint. So the bridge is:
 *   getOrCreateParcelDtc (per APN, per user) → append entry → bump count.
 *
 * Policy (Sean, 2026-06-06): workers MAY auto-create parcel DTCs. Parcel
 * DTCs are factual public-record containers, not ownership claims — the
 * user-facing dtc:create ID-verification gate covers user-asserted records.
 *
 * Failure posture: SOFT. The PLAT-008 anchor is the evidence; the Vault
 * logbook is the projection. Vault failures log + surface
 * vaultStatus:"unavailable" and never block the operation.
 */

const admin = require("firebase-admin");
const { contentHash } = require("../../services/anchor/hashAnchor");

const WORKER_ID = "site-recon-001";

function getDb() { return admin.firestore(); }

/**
 * Find the user's parcel DTC for this APN, or create it (full v2 schema,
 * matching the dtc:create route's record shape).
 */
async function getOrCreateParcelDtc({ apn, address1, address2, attomId }, ctx) {
  const db = getDb();
  const existing = await db.collection("dtcs")
    .where("userId", "==", ctx.userId)
    .where("type", "==", "parcel")
    .where("metadata.apn", "==", apn)
    .limit(1)
    .get();
  if (!existing.empty) return { dtcId: existing.docs[0].id, created: false, title: existing.docs[0].data()?.metadata?.title };

  const createdAtDate = new Date();
  const createdAtIso = createdAtDate.toISOString();
  const isPersonal = !ctx.tenantId || ctx.tenantId === ctx.userId || ctx.tenantId === "vault" || ctx.tenantId === "personal";
  const title = [address1, address2].filter(Boolean).join(", ") || `Parcel ${apn}`;
  const dtcRecord = {
    userId: ctx.userId,
    tenantId: ctx.tenantId || null,
    type: "parcel",
    metadata: { title, apn, address1: address1 || null, address2: address2 || null, attomId: attomId ?? null, source: WORKER_ID },
    fileIds: [],
    blockchainProof: null,
    logbookCount: 0,
    version: 1,
    parent_dtc_id: null,
    modification_authority: isPersonal ? "owner_only" : "workspace_role:admin",
    chain_anchor_status: "hash_only",
    chain: null,
    credentialing_projection_schema: null,
    batchId: null,
    createdAt: admin.firestore.Timestamp.fromDate(createdAtDate),
  };
  dtcRecord.contentHash = contentHash({ ...dtcRecord, createdAt: createdAtIso });
  const ref = await db.collection("dtcs").add(dtcRecord);
  return { dtcId: ref.id, created: true, title };
}

/**
 * Bridge one audit record into the parcel's DTC logbook.
 *
 * @param {object} auditRecord  { execution_type, timestamp, receiptId, txHash, metadata }
 * @param {object} parcelRef    { apn, address1, address2, attomId }
 * @param {object} ctx          { userId, tenantId }
 * @returns {{ ok, entryId?, dtcId?, error? }}  — never throws.
 */
async function createVaultLogbookEntry(auditRecord, parcelRef, ctx) {
  try {
    const apn = parcelRef?.apn || parcelRef?.attomId || null;
    if (!apn) return { ok: false, error: "no_parcel_identifier" };
    const db = getDb();
    const { dtcId, title } = await getOrCreateParcelDtc({ ...parcelRef, apn: String(apn) }, ctx);
    const ref = await db.collection("logbookEntries").add({
      dtcId,
      userId: ctx.userId,
      tenantId: ctx.tenantId || null,
      dtcTitle: title || `Parcel ${apn}`,
      entryType: auditRecord.execution_type,
      data: {
        evidence: {
          receiptId: auditRecord.receiptId || null,
          txHash: auditRecord.txHash || null,
          anchoredAt: auditRecord.timestamp || null,
          metadata: auditRecord.metadata || null,
        },
        source: WORKER_ID,
      },
      files: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("dtcs").doc(dtcId).update({
      logbookCount: admin.firestore.FieldValue.increment(1),
    });
    return { ok: true, entryId: ref.id, dtcId };
  } catch (e) {
    console.warn(`[${WORKER_ID}] vault logbook entry failed (soft):`, e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Batch path (spec §8): one logbook entry PER PARCEL in the manifest, all
 * referencing the single batch receipt. Chunked; per-parcel soft failure.
 *
 * @returns {{ status: "ok"|"partial"|"unavailable", entries: number }}
 */
async function createVaultLogbookEntriesForBatch(auditRecord, parcelManifest, ctx) {
  const CHUNK = 10;
  let okCount = 0;
  const manifest = Array.isArray(parcelManifest) ? parcelManifest : [];
  for (let i = 0; i < manifest.length; i += CHUNK) {
    const results = await Promise.all(
      manifest.slice(i, i + CHUNK).map((p) =>
        createVaultLogbookEntry(
          { ...auditRecord, metadata: { batchId: auditRecord.metadata?.parcelRefBatch?.batchId || null, verdict: p.verdict, blockerCode: p.blockerCode || null } },
          p,
          ctx
        )
      )
    );
    okCount += results.filter((r) => r.ok).length;
  }
  const status = okCount === manifest.length ? "ok" : okCount > 0 ? "partial" : "unavailable";
  return { status, entries: okCount };
}

module.exports = { createVaultLogbookEntry, createVaultLogbookEntriesForBatch, getOrCreateParcelDtc };
