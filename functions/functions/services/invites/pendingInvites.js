"use strict";

/**
 * services/invites/pendingInvites.js
 *
 * Pre-creation of invite records at the time we invite someone (advisor,
 * investor, creator) — BEFORE they sign up.
 *
 * This is Phase 1 of the workspace-at-invite architecture decision (2026-05-29).
 * See memory/project_magic_link_lands_in_workspace.md for context.
 *
 * What this does:
 *   - Records a pending invite keyed by email
 *   - Captures the obligations the invitee will have (terms / ID / signature /
 *     activation) so they can be surfaced as canvas cards once their workspace
 *     materializes
 *   - Provides a lookup-by-email API so the sign-up flow can detect pending
 *     invites and pre-populate workspace state
 *
 * What this does NOT do (Phase 2+):
 *   - Materialize the workspace at sign-up time (markInviteClaimed scaffolded
 *     here but the sign-up flow doesn't call it yet)
 *   - Render the obligation cards in the canvas (frontend work)
 *   - Replace the existing magicLink flow (parallel for now; magic link still
 *     drops users at /auth/magic, which redirects to /onboard/* until Phase 4
 *     deprecates that path)
 *
 * Schema: pendingInvites/{inviteId}
 *   - inviteId, email, role, entityType, entityId, invitedBy, invitedAt
 *   - pendingObligations: [{ id, type, label, action, worker, completedAt }]
 *   - status: "pending" | "claimed" | "expired"
 *   - claimedAt, claimedByUserId, claimedWorkspaceId
 *   - expiresAt (default +30 days)
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const VALID_ROLES = ["creator", "advisor", "investor", "warrant_holder"];

/**
 * Default pending obligation lists per role. Each obligation declares which
 * worker is responsible for resolving it, so the canvas card pattern can
 * surface them under the correct worker context.
 */
const DEFAULT_OBLIGATIONS = {
  creator: [
    { id: "accept-license", type: "click_through", label: "Accept the SOCIII Creator License", action: "creator:step:accept_terms", worker: "platform-creators" },
    { id: "verify-identity", type: "stripe_identity", label: "Verify your identity (Stripe Identity)", action: "creator:step:start_identity", worker: "platform-creators" },
    { id: "activate-license", type: "subscription", label: "Activate your Creator License", action: "creator:step:start_subscription", worker: "platform-creators" },
  ],
  advisor: [
    { id: "acknowledge-terms", type: "click_through", label: "Acknowledge advisor terms", action: "ir:advisor:step:acknowledge_terms", worker: "hr-people" },
    { id: "verify-identity", type: "stripe_identity", label: "Verify your identity (Stripe Identity)", action: "ir:advisor:step:start_identity", worker: "hr-people" },
    { id: "sign-agreement", type: "dropbox_sign", label: "Sign your Advisor Agreement", action: "ir:advisor:step:start_signature", worker: "hr-people" },
  ],
  investor: [
    { id: "verify-identity", type: "stripe_identity", label: "Verify your identity (Stripe Identity)", action: "ir:investor:step:start_identity", worker: "fundraise" },
    { id: "sign-safe", type: "dropbox_sign", label: "Sign your SAFE", action: "ir:investor:step:start_safe_signing", worker: "fundraise" },
  ],
  warrant_holder: [
    { id: "verify-identity", type: "stripe_identity", label: "Verify your identity (Stripe Identity)", action: "ir:warrant:step:start_identity", worker: "fundraise" },
    { id: "sign-warrant", type: "dropbox_sign", label: "Sign your Warrant Agreement", action: "ir:warrant:step:start_signature", worker: "fundraise" },
  ],
};

/**
 * Record a pending invite. Idempotent on (email, role, entityId) — if the
 * same triple already has a pending invite, we update it rather than
 * create a duplicate.
 *
 * @param {object} input
 * @param {string} input.email       — required; lowercased
 * @param {string} input.role        — one of VALID_ROLES
 * @param {string} input.entityId    — advisorId / creatorId / investorId
 * @param {string} [input.entityType] — defaults to role
 * @param {string} [input.name]      — friendly display name
 * @param {string} [input.invitedBy] — uid of inviter
 * @param {array}  [input.pendingObligations] — override the default obligations
 * @param {object} [input.context]   — freeform per-role context (vertical, equity, amount, etc.)
 *
 * @returns {Promise<{ok, inviteId}>}
 */
async function recordPendingInvite(input) {
  const {
    email,
    role,
    entityId,
    entityType = null,
    name = null,
    invitedBy = null,
    pendingObligations = null,
    context = null,
  } = input || {};

  if (!email) throw new Error("recordPendingInvite: email required");
  if (!role || !VALID_ROLES.includes(role)) {
    throw new Error(`recordPendingInvite: role must be one of ${VALID_ROLES.join(", ")}`);
  }
  if (!entityId) throw new Error("recordPendingInvite: entityId required");

  const normalizedEmail = String(email).toLowerCase().trim();
  const db = getDb();

  // Idempotency check — look for an existing pending invite for the same triple.
  const existingSnap = await db.collection("pendingInvites")
    .where("email", "==", normalizedEmail)
    .where("role", "==", role)
    .where("entityId", "==", entityId)
    .limit(1)
    .get();

  const obligations = Array.isArray(pendingObligations) && pendingObligations.length > 0
    ? pendingObligations
    : (DEFAULT_OBLIGATIONS[role] || []).map(o => ({ ...o, completedAt: null }));

  const now = Date.now();
  const expiresAt = new Date(now + DEFAULT_TTL_MS).toISOString();

  if (!existingSnap.empty) {
    const ref = existingSnap.docs[0].ref;
    const update = {
      name: name || existingSnap.docs[0].data().name || null,
      invitedBy: invitedBy || existingSnap.docs[0].data().invitedBy || null,
      pendingObligations: obligations,
      context: context || existingSnap.docs[0].data().context || null,
      expiresAt,
      updatedAt: ts(),
    };
    await ref.update(update);
    return { ok: true, inviteId: existingSnap.docs[0].id, existed: true };
  }

  const inviteId = `inv_${crypto.randomBytes(8).toString("hex")}`;
  await db.collection("pendingInvites").doc(inviteId).set({
    inviteId,
    email: normalizedEmail,
    role,
    entityType: entityType || role,
    entityId,
    name: name || null,
    invitedBy,
    invitedAt: ts(),
    pendingObligations: obligations,
    context: context || null,
    status: "pending",
    claimedAt: null,
    claimedByUserId: null,
    claimedWorkspaceId: null,
    expiresAt,
    createdAt: ts(),
    updatedAt: ts(),
  });

  return { ok: true, inviteId, existed: false };
}

/**
 * Find the most recent pending (unclaimed, unexpired) invite for an email.
 * Used by the sign-up flow once Phase 2 lands.
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findPendingInviteByEmail(email) {
  if (!email) return null;
  const normalizedEmail = String(email).toLowerCase().trim();
  const nowIso = new Date().toISOString();

  const snap = await getDb().collection("pendingInvites")
    .where("email", "==", normalizedEmail)
    .where("status", "==", "pending")
    .limit(10)
    .get();

  if (snap.empty) return null;

  // Filter out expired in code (Firestore can't compound the where clauses
  // without an index we haven't added yet). Return the most recent.
  const live = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => !d.expiresAt || d.expiresAt > nowIso)
    .sort((a, b) => {
      const ta = a.invitedAt?.seconds || 0;
      const tb = b.invitedAt?.seconds || 0;
      return tb - ta;
    });

  return live[0] || null;
}

/**
 * List ALL pending invites for an email (e.g. someone invited as both
 * advisor and investor). Used by the canvas to render multiple
 * obligation card sets if the user wears multiple hats.
 */
async function listPendingInvitesByEmail(email) {
  if (!email) return [];
  const normalizedEmail = String(email).toLowerCase().trim();
  const nowIso = new Date().toISOString();

  const snap = await getDb().collection("pendingInvites")
    .where("email", "==", normalizedEmail)
    .limit(20)
    .get();

  if (snap.empty) return [];

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.status === "pending" && (!d.expiresAt || d.expiresAt > nowIso))
    .sort((a, b) => {
      const ta = a.invitedAt?.seconds || 0;
      const tb = b.invitedAt?.seconds || 0;
      return tb - ta;
    });
}

/**
 * List invites claimed by a given user (any status — pending obligations
 * may still exist on claimed invites until each obligation is marked
 * complete). Used by the workspace canvas to render obligation cards for
 * the signed-in user without needing the email at query time.
 *
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
async function listInvitesByUserId(uid) {
  if (!uid) return [];
  const snap = await getDb().collection("pendingInvites")
    .where("claimedByUserId", "==", uid)
    .limit(20)
    .get();

  if (snap.empty) return [];

  const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const enriched = await Promise.all(raw.map(d => enrichInviteWithEntityState(d)));

  return enriched
    .filter(d => Array.isArray(d.pendingObligations) && d.pendingObligations.some(o => !o.completedAt))
    .sort((a, b) => {
      const ta = a.claimedAt?.seconds || a.invitedAt?.seconds || 0;
      const tb = b.claimedAt?.seconds || b.invitedAt?.seconds || 0;
      return tb - ta;
    });
}

/**
 * Compute obligation completion from the actual entity record (advisor /
 * investor / creator / warrant) so the canvas banner reflects the truth
 * even when the step action updates only the entity, not the invite
 * (TC-010). Mutates the obligations array on the passed invite and
 * returns it.
 */
async function enrichInviteWithEntityState(invite) {
  if (!invite || !invite.role || !invite.entityId) return invite;
  const obligations = Array.isArray(invite.pendingObligations) ? invite.pendingObligations : [];
  if (obligations.length === 0) return invite;

  const db = getDb();
  const collMap = { advisor: "advisors", investor_pre_safe_signed: "investors", warrant_holder: "warrants", creator: "creators" };
  // Map known roles to (collection, doneCheckers)
  let entity = null;
  try {
    if (invite.role === "advisor") {
      const snap = await db.collection("advisors").doc(invite.entityId).get();
      entity = snap.exists ? snap.data() : null;
    } else if (invite.role === "investor") {
      // investors live under fundraises/{fundraiseId}/investors/{investorId}.
      // The pendingInvite's context.fundraiseId tells us which fundraise.
      const fundraiseId = invite.context?.fundraiseId;
      if (fundraiseId) {
        const snap = await db.collection("fundraises").doc(fundraiseId)
          .collection("investors").doc(invite.entityId).get();
        entity = snap.exists ? snap.data() : null;
      }
    } else if (invite.role === "warrant_holder") {
      const snap = await db.collection("warrants").doc(invite.entityId).get();
      entity = snap.exists ? snap.data() : null;
    } else if (invite.role === "creator") {
      const snap = await db.collection("creators").doc(invite.entityId).get();
      entity = snap.exists ? snap.data() : null;
    }
  } catch (_) { /* fall through with entity=null */ }

  if (!entity) return invite;

  const tsToIso = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    if (v._seconds) return new Date(v._seconds * 1000).toISOString();
    return null;
  };

  // Per-role obligation completion map. Each entry maps obligation.id → an
  // entity-state predicate that decides whether to set completedAt.
  const completionMap = {
    advisor: {
      "acknowledge-terms": () => tsToIso(entity.termsAcknowledgedAt) || (entity.flowStep && ["identity_pending","identity_complete","signature_pending","signature_complete","closed"].includes(entity.flowStep) ? new Date().toISOString() : null),
      "verify-identity": () => entity.kycStatus === "approved" ? (tsToIso(entity.kycApprovedAt) || new Date().toISOString()) : null,
      "sign-agreement": () => ["signature_complete","closed"].includes(entity.flowStep) ? (tsToIso(entity.signatureCompletedAt) || new Date().toISOString()) : null,
    },
    investor: {
      "verify-identity": () => entity.kycStatus === "approved" ? new Date().toISOString() : null,
      // signature_complete is what onSignaturePacketSigned actually writes (matches advisor flow).
      // Keep legacy safe_signed/safe_complete for compat with older docs. TC-027.
      "sign-safe": () => ["signature_complete","safe_signed","safe_complete","closed"].includes(entity.flowStep) ? new Date().toISOString() : null,
    },
    warrant_holder: {
      "verify-identity": () => entity.kycStatus === "approved" ? new Date().toISOString() : null,
      "sign-warrant": () => ["signature_complete","closed"].includes(entity.flowStep) ? new Date().toISOString() : null,
    },
    creator: {
      "accept-license": () => tsToIso(entity.agreementAcceptedAt),
      "verify-identity": () => entity.kycStatus === "approved" ? new Date().toISOString() : null,
      "activate-license": () => entity.subscriptionStatus === "active" ? new Date().toISOString() : null,
    },
  };

  const checks = completionMap[invite.role] || {};
  invite.pendingObligations = obligations.map(o => {
    if (o.completedAt) return o;
    const check = checks[o.id];
    if (!check) return o;
    const completedAt = check();
    return completedAt ? { ...o, completedAt } : o;
  });
  return invite;
}

/**
 * Get a single invite by id (Phase 2 canvas reads). Enriches obligations
 * with entity-derived completion state — the truth source is the entity
 * doc, not the pendingInvite write log.
 */
async function getInviteById(inviteId) {
  if (!inviteId) return null;
  const snap = await getDb().collection("pendingInvites").doc(inviteId).get();
  if (!snap.exists) return null;
  const invite = { id: snap.id, ...snap.data() };
  return await enrichInviteWithEntityState(invite);
}

/**
 * Mark an invite as claimed. Phase 2 sign-up flow will call this once
 * it materializes the workspace.
 */
async function markInviteClaimed(inviteId, { userId, workspaceId }) {
  if (!inviteId) throw new Error("markInviteClaimed: inviteId required");
  if (!userId) throw new Error("markInviteClaimed: userId required");

  await getDb().collection("pendingInvites").doc(inviteId).update({
    status: "claimed",
    claimedAt: ts(),
    claimedByUserId: userId,
    claimedWorkspaceId: workspaceId || null,
    updatedAt: ts(),
  });

  return { ok: true };
}

/**
 * Mark an individual obligation as completed (e.g., user accepted terms,
 * verified identity, etc.). Returns the updated invite.
 */
async function markObligationComplete(inviteId, obligationId) {
  if (!inviteId) throw new Error("markObligationComplete: inviteId required");
  if (!obligationId) throw new Error("markObligationComplete: obligationId required");

  const ref = getDb().collection("pendingInvites").doc(inviteId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`invite ${inviteId} not found`);

  const data = snap.data();
  const obligations = (data.pendingObligations || []).map(o =>
    o.id === obligationId ? { ...o, completedAt: new Date().toISOString() } : o
  );

  await ref.update({
    pendingObligations: obligations,
    updatedAt: ts(),
  });

  return { ok: true, obligations };
}

module.exports = {
  recordPendingInvite,
  findPendingInviteByEmail,
  listPendingInvitesByEmail,
  listInvitesByUserId,
  getInviteById,
  markInviteClaimed,
  markObligationComplete,
  VALID_ROLES,
  DEFAULT_OBLIGATIONS,
};
