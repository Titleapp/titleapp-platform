const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");

/**
 * CODEX 50.15 P0-1 — Segments collection.
 *
 * Segments are workspace-scoped saved queries against contacts. The
 * Marketing worker references segments by name when targeting campaigns.
 *
 * Schema:
 *   segments/{segmentId}
 *     tenantId, slug, name, description?,
 *     query: { contact_tier?, lifecycle_stage?, lead_score_min?, segments_contain?, source_primary?, custom_filters? }
 *     created_at, created_by, last_evaluated_at?, last_count?
 *
 * Materialized membership lives on contact docs in their `segments` array
 * (denormalized for cheap queries — the Marketing worker reads contacts
 * filtered by `segments array-contains`).
 */

const router = express.Router();
function getDb() { return admin.firestore(); }

function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

// GET /v1/workspaces/:workspace_id/segments
router.get("/:workspace_id/segments", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const snap = await getDb().collection("segments")
      .where("tenantId", "==", workspace_id)
      .orderBy("created_at", "desc")
      .limit(100)
      .get();
    const segments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data: segments, total: segments.length });
  } catch (err) {
    console.error("GET /segments error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/segments
// Body: { name, description?, query: { contact_tier?, lifecycle_stage?, lead_score_min?, source_primary?, custom_filters? } }
router.post("/:workspace_id/segments", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { name, description, query } = req.body;
    if (!name) {
      return res.status(400).json({ error: { code: "bad_request", message: "name is required", status: 400 } });
    }
    const slug = slugify(name);
    const ref = await getDb().collection("segments").add({
      tenantId: workspace_id,
      slug,
      name,
      description: description || null,
      query: query || {},
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: req.apiKey ? req.apiKey.user_id : null,
      last_evaluated_at: null,
      last_count: null,
    });
    res.status(201).json({ data: { id: ref.id, slug } });
  } catch (err) {
    console.error("POST /segments error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// PUT /v1/workspaces/:workspace_id/segments/:segmentId
router.put("/:workspace_id/segments/:segmentId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, segmentId } = req.params;
    const docRef = getDb().collection("segments").doc(segmentId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({ error: { code: "not_found", message: "Segment not found", status: 404 } });
    }
    const allowed = ["name", "description", "query"];
    const updates = {};
    for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
    updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
    await docRef.update(updates);
    res.json({ data: { id: segmentId, ...updates } });
  } catch (err) {
    console.error("PUT /segments error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// DELETE /v1/workspaces/:workspace_id/segments/:segmentId
router.delete("/:workspace_id/segments/:segmentId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, segmentId } = req.params;
    const docRef = getDb().collection("segments").doc(segmentId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({ error: { code: "not_found", message: "Segment not found", status: 404 } });
    }
    await docRef.delete();
    res.json({ data: { id: segmentId, deleted: true } });
  } catch (err) {
    console.error("DELETE /segments error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/segments/:segmentId/evaluate
// Recomputes membership: walks contacts matching the saved query, updates
// each contact's `segments` array to include this segment slug. Cheap
// alternative to a real query engine — slower than indexed reads but
// matches the volume profile of v1 launch (small workspaces).
router.post("/:workspace_id/segments/:segmentId/evaluate", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, segmentId } = req.params;
    const docRef = getDb().collection("segments").doc(segmentId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({ error: { code: "not_found", message: "Segment not found", status: 404 } });
    }
    const seg = doc.data();
    const slug = seg.slug;
    const query = seg.query || {};

    // Build the contacts query
    // CODEX 50.18: support persona_tier (cross-persona match via tiers_index)
    // alongside the legacy contact_tier (matches primary persona only).
    let q = getDb().collection("contacts").where("tenantId", "==", workspace_id);
    if (query.persona_tier) q = q.where("tiers_index", "array-contains", query.persona_tier);
    else if (query.contact_tier) q = q.where("contact_tier", "==", query.contact_tier);
    if (query.lifecycle_stage) q = q.where("lifecycle_stage", "==", query.lifecycle_stage);
    if (query.source_primary) q = q.where("source.primary", "==", query.source_primary);

    const snap = await q.limit(1000).get();
    let matched = 0;
    let batch = getDb().batch();
    let batchCount = 0;
    for (const c of snap.docs) {
      const data = c.data();
      // Apply lead_score_min and custom_filters in JS
      if (query.lead_score_min !== undefined && (data.lead_score || 0) < query.lead_score_min) continue;
      if (Array.isArray(query.custom_filters)) {
        let pass = true;
        for (const f of query.custom_filters) {
          const v = (data[f.field] !== undefined) ? data[f.field] : null;
          if (f.op === "eq" && v !== f.value) { pass = false; break; }
          if (f.op === "ne" && v === f.value) { pass = false; break; }
          if (f.op === "in" && !Array.isArray(f.value) || !f.value.includes(v)) { pass = false; break; }
        }
        if (!pass) continue;
      }
      const existing = Array.isArray(data.segments) ? data.segments : [];
      if (!existing.includes(slug)) {
        batch.update(c.ref, {
          segments: admin.firestore.FieldValue.arrayUnion(slug),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (++batchCount >= 450) { await batch.commit(); batch = getDb().batch(); batchCount = 0; }
      }
      matched++;
    }
    if (batchCount > 0) await batch.commit();

    await docRef.update({
      last_evaluated_at: admin.firestore.FieldValue.serverTimestamp(),
      last_count: matched,
    });

    res.json({ data: { segmentId, slug, matched } });
  } catch (err) {
    console.error("POST /segments/evaluate error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
