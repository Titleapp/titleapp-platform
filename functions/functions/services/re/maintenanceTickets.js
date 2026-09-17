"use strict";

/**
 * maintenanceTickets.js — CODEX 90: real-estate property-operations
 * consolidation (tenant/field-tech/GM maintenance workflow).
 *
 * This is the "buildable now" piece of CODEX 90 — the internal
 * tenant->GM/field-tech maintenance loop, deliberately NOT the buyer/lessor
 * walkthrough or building-inspector flows (those stay unbuilt pending the
 * security review CODEX 90 flags as unresolved — see that doc's Open
 * Decisions #4/#5), and NOT a new role hierarchy (flagged there as
 * cross-vertical platform work needing broader sign-off, Open Decision #6/#7
 * area).
 *
 * Schema consolidation per CODEX 90 §4: adopts the existing
 * tenants/{scopeId}/maintenanceTickets/{id} shape (matches the CODEX 27
 * schema already seeded for the RE demo tenant) as canonical, deprecating
 * the API-key-gated top-level `maintenance` collection/route and the three
 * canvases' local-only state. The one real fix CODEX 90 called out: photo
 * fields store a Storage objectId (functions/functions/lib/storage), NOT a
 * URL — Storage's signed URLs expire after 1 hour, so a raw URL saved here
 * would silently rot. Resolve to a fresh URL at read time via
 * storageService.download().
 */

const admin = require("firebase-admin");
const storageService = require("../../lib/storage");

function getDb() { return admin.firestore(); }

function ticketsRef(db, scopeId) {
  return db.collection("tenants").doc(scopeId).collection("maintenanceTickets");
}

function resolveScopeId({ userId, tenantId }) {
  return tenantId || userId;
}

/**
 * Create a maintenance ticket. Optional photo (base64) is persisted to
 * Storage immediately, same pattern as aviation's squawk-photo capability
 * (functions/functions/services/mx/aircraftRecords.js) — the objectId is
 * stored, not a URL.
 */
async function handleCreateMaintenanceTicket(req, res, ctx) {
  const body = req.body || {};
  if (!body.description) return res.status(400).json({ ok: false, error: "description required" });

  const db = getDb();
  const scopeId = resolveScopeId(ctx);

  let photoObjectId = null;
  if (body.photoBase64) {
    try {
      const buffer = Buffer.from(body.photoBase64, "base64");
      const mimeType = String(body.photoMimeType || "image/jpeg");
      const upload = await storageService.upload({
        uid: ctx.userId,
        orgId: ctx.tenantId || null,
        scope: ctx.tenantId ? "business" : "personal",
        subdir: "re-maintenance",
        filename: `mx_${Date.now()}.${mimeType === "image/png" ? "png" : "jpg"}`,
        buffer,
        mimeType,
        createdByWorker: "re-maintenance",
        tags: body.unitId ? [String(body.unitId), "maintenance-issue-photo"] : ["maintenance-issue-photo"],
      });
      if (upload.ok) photoObjectId = upload.objectId;
      else console.warn("[maintenanceTickets] issue-photo persistence failed:", upload.error);
    } catch (e) {
      console.warn("[maintenanceTickets] issue-photo persistence threw:", e.message);
    }
  }

  const doc = {
    assetId: String(body.assetId || "").slice(0, 100) || null,
    unitId: String(body.unitId || "").slice(0, 50) || null,
    status: "open",
    reportedAt: admin.firestore.FieldValue.serverTimestamp(),
    reportedBy: String(body.reportedBy || "").slice(0, 200) || null,
    reportedByUserId: ctx.userId || null,
    description: String(body.description).slice(0, 2000),
    category: String(body.category || "Other").slice(0, 50),
    severityReported: String(body.severityReported || "normal").slice(0, 20),
    photosIssue: photoObjectId ? [photoObjectId] : [],
    photosResolution: [],
    assignedTo: null,
    assignedBy: null,
    assignedAt: null,
    targetResolutionDate: null,
    resolutionDescription: null,
    completedAt: null,
    completedBy: null,
    costEstimate: null,
    tenantId: scopeId,
    source: body.source === "pm_dashboard" ? "pm_dashboard" : "tenant_portal",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await ticketsRef(db, scopeId).add(doc);
  return res.json({ ok: true, ticketId: ref.id, photoObjectId });
}

/**
 * List tickets for the current scope. No role-based filtering beyond
 * tenant scoping yet — CODEX 90's per-unit/per-role scoping (Open Decision
 * area §2.6) is explicitly flagged as separate, not-yet-built platform work.
 * Every member of the tenant sees every ticket for now, same as everywhere
 * else on the platform pending that work.
 */
async function handleListMaintenanceTickets(req, res, ctx) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const statusFilter = req.query?.status ? String(req.query.status) : null;

  let q = ticketsRef(db, scopeId);
  if (statusFilter) q = q.where("status", "==", statusFilter);
  const snap = await q.orderBy("createdAt", "desc").limit(100).get();

  const tickets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return res.json({ ok: true, tickets, count: tickets.length });
}

/**
 * Assign, update status, or resolve a ticket (GM/field-tech side). Optional
 * resolution photo, same Storage-backed pattern as the issue photo.
 */
async function handleUpdateMaintenanceTicket(req, res, ctx) {
  const body = req.body || {};
  if (!body.ticketId) return res.status(400).json({ ok: false, error: "ticketId required" });

  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const ref = ticketsRef(db, scopeId).doc(body.ticketId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "ticket not found" });

  const update = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (body.assignedTo) {
    update.assignedTo = String(body.assignedTo).slice(0, 200);
    update.assignedBy = ctx.userId || null;
    update.assignedAt = admin.firestore.FieldValue.serverTimestamp();
    update.status = "assigned";
  }
  if (body.status) {
    update.status = String(body.status).slice(0, 20);
  }
  if (body.targetResolutionDate) update.targetResolutionDate = body.targetResolutionDate;
  if (body.costEstimate != null) update.costEstimate = Number(body.costEstimate);

  if (body.resolutionDescription) {
    update.resolutionDescription = String(body.resolutionDescription).slice(0, 2000);
  }

  if (body.resolutionPhotoBase64) {
    try {
      const buffer = Buffer.from(body.resolutionPhotoBase64, "base64");
      const mimeType = String(body.resolutionPhotoMimeType || "image/jpeg");
      const upload = await storageService.upload({
        uid: ctx.userId,
        orgId: ctx.tenantId || null,
        scope: ctx.tenantId ? "business" : "personal",
        subdir: "re-maintenance",
        filename: `mx_resolution_${Date.now()}.${mimeType === "image/png" ? "png" : "jpg"}`,
        buffer,
        mimeType,
        createdByWorker: "re-maintenance",
        tags: ["maintenance-resolution-photo"],
      });
      if (upload.ok) {
        update.photosResolution = admin.firestore.FieldValue.arrayUnion(upload.objectId);
      } else {
        console.warn("[maintenanceTickets] resolution-photo persistence failed:", upload.error);
      }
    } catch (e) {
      console.warn("[maintenanceTickets] resolution-photo persistence threw:", e.message);
    }
  }

  if (body.markComplete) {
    update.status = "completed";
    update.completedAt = admin.firestore.FieldValue.serverTimestamp();
    update.completedBy = ctx.userId || null;
  }

  await ref.update(update);
  return res.json({ ok: true, ticketId: body.ticketId });
}

module.exports = {
  handleCreateMaintenanceTicket,
  handleListMaintenanceTickets,
  handleUpdateMaintenanceTicket,
};
