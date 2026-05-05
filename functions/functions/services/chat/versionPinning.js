/**
 * versionPinning.js — CODEX 50.11 Layer A.
 *
 * Captures worker_version on every chatSessions and messageEvents doc at
 * write time. Future feedback events (per-message thumbs, improvement
 * requests, audit replays) need to know which version of the worker the
 * user was reacting to. Without this snapshot, feedback is unmoored.
 *
 * v1: every worker has worker_version: "v1" because the digitalWorkers
 * schema doesn't yet carry a version field. v1.1 beta channel work
 * introduces digitalWorkers/{slug}.version for real; this helper picks
 * up the field automatically when it appears.
 *
 * Triggers (registered in index.js):
 *   onDocumentCreated chatSessions/{sessionId}     → onChatSessionCreate
 *   onDocumentCreated messageEvents/{eventId}      → onMessageEventCreate
 *
 * Both triggers are idempotent and no-op when worker_version is already
 * set (so a writer that snapshots inline isn't double-written).
 */

const admin = require("firebase-admin");

const DEFAULT_WORKER_VERSION = "v1";

function getDb() { return admin.firestore(); }

/**
 * Read worker_version from digitalWorkers/{slug}. Returns DEFAULT_WORKER_VERSION
 * when the worker doc doesn't exist or doesn't have a version field.
 */
async function snapshotForSlug(workerSlug) {
  if (!workerSlug || workerSlug === "chief-of-staff") return DEFAULT_WORKER_VERSION;
  try {
    const doc = await getDb().doc(`digitalWorkers/${workerSlug}`).get();
    if (doc.exists) {
      const v = doc.data()?.version;
      if (typeof v === "string" && v.length > 0) return v;
    }
  } catch (e) {
    console.warn(`[versionPinning] worker version read failed for ${workerSlug}: ${e.message}`);
  }
  return DEFAULT_WORKER_VERSION;
}

/**
 * Resolve the worker slug from a session document. Different code paths
 * use different field names; this normalizes them.
 */
function workerSlugFromSession(data) {
  if (!data) return null;
  return data.workerSlug
    || data.selectedWorker
    || data.worker?.slug
    || data.workerId
    || data.state?.selectedWorker
    || null;
}

/**
 * Trigger handler for chatSessions/{sessionId} create.
 */
async function onChatSessionCreate(event) {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  if (data?.worker_version) return; // already snapshotted by writer

  const workerSlug = workerSlugFromSession(data);
  const version = await snapshotForSlug(workerSlug);
  await snap.ref.update({ worker_version: version });
}

/**
 * Trigger handler for messageEvents/{eventId} create. Inherits the
 * version from the parent session if available; falls back to direct
 * worker lookup.
 */
async function onMessageEventCreate(event) {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  if (data?.worker_version) return;

  let version = null;

  // Path 1: inherit from parent session.
  const sessionId = data?.sessionId;
  if (sessionId) {
    try {
      const sess = await getDb().doc(`chatSessions/${sessionId}`).get();
      if (sess.exists) version = sess.data()?.worker_version || null;
    } catch (e) { /* fall through */ }
  }

  // Path 2: lookup from worker slug if event carries it.
  if (!version) {
    const workerSlug = data?.workerSlug || data?.selectedWorker || null;
    version = await snapshotForSlug(workerSlug);
  }

  await snap.ref.update({ worker_version: version });
}

module.exports = {
  DEFAULT_WORKER_VERSION,
  snapshotForSlug,
  workerSlugFromSession,
  onChatSessionCreate,
  onMessageEventCreate,
};
