"use strict";
/**
 * Canvas Event Emitter — CODEX 49.5 Phase C
 * Emits real-time events for canvas: document.created, document.updated,
 * project.milestone, worker.thinking, worker.complete.
 * Projects stored in /projects/{projectId}.
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }

/**
 * Emit a canvas event — writes to /canvasEvents/{eventId}.
 * Canvas frontend subscribes via onSnapshot.
 * @param {string} uid — user receiving the event
 * @param {string} eventType — document.created | document.updated | project.milestone | worker.thinking | worker.complete
 * @param {object} payload — event-specific data
 */
async function emit(uid, eventType, payload = {}) {
  const db = getDb();
  const eventId = `evt_${crypto.randomBytes(8).toString("hex")}`;
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.doc(`canvasEvents/${eventId}`).set({
    eventId,
    uid,
    eventType,
    payload,
    createdAt: now,
    // TTL — events older than 24h can be cleaned up
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return { ok: true, eventId };
}

/**
 * Create a project.
 * @param {object} opts — { uid, orgId, workerSlug, title }
 * @returns {{ ok, projectId }}
 */
async function createProject({ uid, orgId, workerSlug, title }) {
  const db = getDb();
  const projectId = `proj_${crypto.randomBytes(8).toString("hex")}`;
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.doc(`projects/${projectId}`).set({
    projectId,
    ownerUid: uid,
    orgId: orgId || null,
    workerSlug: workerSlug || null,
    title,
    status: "active",
    documentIds: [],
    milestones: [],
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });

  // Emit project created event
  await emit(uid, "project.created", { projectId, title, workerSlug });

  return { ok: true, projectId };
}

/**
 * List projects for a user.
 */
async function listProjects(uid, { workerSlug, status = "active", limit: lim = 20 } = {}) {
  const db = getDb();
  let q = db.collection("projects")
    .where("ownerUid", "==", uid)
    .where("status", "==", status)
    .orderBy("lastActivityAt", "desc")
    .limit(lim);

  if (workerSlug) {
    q = db.collection("projects")
      .where("ownerUid", "==", uid)
      .where("workerSlug", "==", workerSlug)
      .where("status", "==", status)
      .orderBy("lastActivityAt", "desc")
      .limit(lim);
  }

  const snap = await q.get();
  const projects = snap.docs.map(d => {
    const data = d.data();
    return {
      projectId: data.projectId,
      title: data.title,
      workerSlug: data.workerSlug,
      status: data.status,
      documentCount: (data.documentIds || []).length,
      milestoneCount: (data.milestones || []).length,
      lastActivityAt: data.lastActivityAt,
      createdAt: data.createdAt,
    };
  });

  return { ok: true, projects, total: projects.length };
}

/**
 * Add a document to a project.
 */
async function addDocumentToProject(uid, projectId, objectId) {
  const db = getDb();
  const doc = await db.doc(`projects/${projectId}`).get();
  if (!doc.exists) return { ok: false, error: "not_found" };

  const data = doc.data();
  if (data.ownerUid !== uid) return { ok: false, error: "forbidden" };

  await db.doc(`projects/${projectId}`).update({
    documentIds: admin.firestore.FieldValue.arrayUnion(objectId),
    lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Emit event
  await emit(uid, "document.created", { projectId, objectId });

  return { ok: true };
}

/**
 * Add a milestone to a project.
 */
async function addMilestone(uid, projectId, { label, documentId }) {
  const db = getDb();
  const doc = await db.doc(`projects/${projectId}`).get();
  if (!doc.exists) return { ok: false, error: "not_found" };

  const data = doc.data();
  if (data.ownerUid !== uid) return { ok: false, error: "forbidden" };

  const milestone = {
    label,
    documentId: documentId || null,
    completedAt: new Date().toISOString(),
  };

  await db.doc(`projects/${projectId}`).update({
    milestones: admin.firestore.FieldValue.arrayUnion(milestone),
    lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Emit event
  await emit(uid, "project.milestone", { projectId, milestone });

  return { ok: true, milestone };
}

/**
 * Emit worker status events (thinking, complete).
 */
async function emitWorkerStatus(uid, workerSlug, status, payload = {}) {
  return emit(uid, `worker.${status}`, { workerSlug, ...payload });
}

module.exports = {
  emit,
  createProject,
  listProjects,
  addDocumentToProject,
  addMilestone,
  emitWorkerStatus,
};
