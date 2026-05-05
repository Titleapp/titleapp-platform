/**
 * improvementRequests.js — CODEX 50.11 Layer C.
 *
 * Domain experts (Kent — finance, Ruthie — healthcare) and subscribers
 * can file specific improvements against any worker. Worker owners
 * triage from a creator-facing queue. Approved requests transition into
 * 'approved_into_beta' (v1.1 beta channel picks them up); declined
 * requests can be resubmitted.
 *
 * State machine (mirrors idVerification.js):
 *   open → in_review → approved_into_beta (terminal for the request)
 *                    → declined → open (resubmit allowed)
 *
 * Firestore: improvementRequests/{requestId} — see schema in 50.11 spec.
 *
 * Ownership semantics:
 *   - submitter (any authenticated user) creates the request and may
 *     resubmit after declined.
 *   - workerOwner (the creator of the targeted worker) reads, transitions
 *     status (in_review, approved_into_beta, declined).
 *   - platform admins (admins/{uid}) can read/transition across all
 *     owners — for moderation. v1 doesn't expose this in routes; admins
 *     touch via Firestore directly.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const VALID_SEVERITY = new Set(["my_opinion", "important", "urgent_regulatory_or_safety"]);
const VALID_TRANSITIONS = {
  open: ["in_review", "declined"],
  in_review: ["approved_into_beta", "declined"],
  declined: ["open"],
  approved_into_beta: [], // terminal
};

async function getWorkerOwner(workerSlug) {
  const doc = await getDb().doc(`digitalWorkers/${workerSlug}`).get();
  if (!doc.exists) return null;
  return doc.data().creatorId || null;
}

async function getDomainExpertBadge(uid) {
  // Domain expert role lookup — extension of admins/{uid} per 50.11 v1.1
  // design intent. Until v1.1 ships, this returns null and submitterRole
  // defaults to 'subscriber'.
  try {
    const doc = await getDb().doc(`admins/${uid}`).get();
    if (!doc.exists) return null;
    const domains = doc.data()?.domains;
    if (Array.isArray(domains) && domains.length > 0) return domains;
    return null;
  } catch (e) { return null; }
}

/**
 * Create a new improvement request.
 * Body: { workerSlug, severity, title, description, attachments?: storageObjectId[] }
 */
async function createRequest(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { workerSlug, severity, title, description, attachments } = req.body || {};

  if (!workerSlug || !title || !description) {
    return res.status(400).json({ ok: false, error: "workerSlug, title, description required" });
  }
  if (!VALID_SEVERITY.has(severity || "my_opinion")) {
    return res.status(400).json({ ok: false, error: "invalid severity" });
  }

  const workerOwnerId = await getWorkerOwner(workerSlug);
  if (!workerOwnerId) {
    return res.status(404).json({ ok: false, error: "worker not found" });
  }

  // Determine submitter role + domain badge.
  let submitterRole = "subscriber";
  let domainExpertBadge = null;
  if (uid === workerOwnerId) {
    submitterRole = "owner";
  } else {
    const domains = await getDomainExpertBadge(uid);
    if (domains && domains.length > 0) {
      submitterRole = "domain_expert";
      domainExpertBadge = domains[0]; // primary domain; full list stored separately
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection("improvementRequests").add({
    workerSlug,
    workerOwnerId,
    submitterId: uid,
    submitterRole,
    domainExpertBadge,
    severity: severity || "my_opinion",
    title: String(title).slice(0, 200),
    description: String(description).slice(0, 4000),
    attachments: Array.isArray(attachments) ? attachments.slice(0, 10) : [],
    status: "open",
    statusHistory: [{ status: "open", at: new Date().toISOString(), byUid: uid, note: "created" }],
    createdAt: now,
    updatedAt: now,
  });

  return res.json({ ok: true, requestId: ref.id });
}

/**
 * List improvement requests scoped to either workerOwnerId (creator's
 * inbound queue) or submitterId (user's outbound).
 */
async function listRequests(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { workerOwnerId, submitterId, status: statusFilter } = req.query || {};

  let q = db.collection("improvementRequests");
  let scopeOk = false;

  if (workerOwnerId) {
    if (workerOwnerId !== uid) {
      // Allow only owners to read their own queue — admins gate v1.1.
      return res.status(403).json({ ok: false, error: "cannot read another owner's queue" });
    }
    q = q.where("workerOwnerId", "==", workerOwnerId);
    scopeOk = true;
  } else if (submitterId) {
    if (submitterId !== uid) {
      return res.status(403).json({ ok: false, error: "cannot read another submitter's requests" });
    }
    q = q.where("submitterId", "==", submitterId);
    scopeOk = true;
  }

  if (!scopeOk) {
    return res.status(400).json({ ok: false, error: "must specify workerOwnerId or submitterId" });
  }

  if (statusFilter) q = q.where("status", "==", statusFilter);
  q = q.orderBy("createdAt", "desc").limit(100);

  const snap = await q.get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Sort by domain-expert badge first, then severity, then recency. The
  // recency ordering is preserved by the query; this just promotes
  // expert + severity to the top.
  const severityRank = { urgent_regulatory_or_safety: 3, important: 2, my_opinion: 1 };
  items.sort((a, b) => {
    const aExpert = a.submitterRole === "domain_expert" ? 1 : 0;
    const bExpert = b.submitterRole === "domain_expert" ? 1 : 0;
    if (aExpert !== bExpert) return bExpert - aExpert;
    const aSev = severityRank[a.severity] || 0;
    const bSev = severityRank[b.severity] || 0;
    if (aSev !== bSev) return bSev - aSev;
    return 0; // already ordered by createdAt desc
  });

  return res.json({ ok: true, items });
}

/**
 * Transition status. Owners can transition; submitter can transition
 * only declined → open (resubmit).
 */
async function transitionStatus(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { requestId, toStatus, note } = req.body || {};

  if (!requestId || !toStatus) {
    return res.status(400).json({ ok: false, error: "requestId, toStatus required" });
  }

  const ref = db.collection("improvementRequests").doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) {
    return res.status(404).json({ ok: false, error: "request not found" });
  }
  const doc = snap.data();
  const fromStatus = doc.status || "open";
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    return res.status(400).json({ ok: false, error: `cannot transition ${fromStatus} → ${toStatus}` });
  }

  // Authorization: owner can do any allowed transition. Submitter can
  // only do declined → open.
  const isOwner = doc.workerOwnerId === uid;
  const isSubmitter = doc.submitterId === uid;
  const submitterAllowed = fromStatus === "declined" && toStatus === "open" && isSubmitter;
  if (!isOwner && !submitterAllowed) {
    return res.status(403).json({ ok: false, error: "not authorized to transition" });
  }

  const historyEntry = {
    status: toStatus,
    at: new Date().toISOString(),
    byUid: uid,
    note: note ? String(note).slice(0, 500) : null,
  };
  await ref.update({
    status: toStatus,
    statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true, status: toStatus });
}

module.exports = { createRequest, listRequests, transitionStatus };
