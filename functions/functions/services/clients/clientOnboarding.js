"use strict";

/**
 * services/clients/clientOnboarding.js — CODEX S52.61 Phase 1 + resolved
 * Phase 2 slice ("Add Client" across suites).
 *
 * The single, vertical-agnostic "add client" capability described in
 * CODEX-S52.61-Add-Client-Across-Suites.md §3: Contacts integration +
 * portal-access provisioning + e-signature gating + (where required) KYC
 * gating, wired to CODEX S52.62's verified-identity mechanism for the
 * natural-person case (S52.62 §1.5).
 *
 * Reuses, does not rebuild:
 *   - services/contacts/contactsService.js — same contact-creation logic
 *     `/contacts:add` uses.
 *   - services/esign/esignService.js — `handleESignSend` (native track) for
 *     the disclosure/agreement step.
 *   - services/identity/identitySession.js — extracted Stripe Identity
 *     session creation, same `identityDocId` correlation the webhook uses.
 *   - services/identity/verifiedIdentityResolution.js — untouched. This
 *     module never computes an HMAC itself; it only reacts to
 *     `verifiedIdentityId` once the webhook (index.js) has already resolved
 *     it and calls `onIdentityVerifiedForContact` here.
 *   - services/clients/clientPortalInvite.js — invite/account-access,
 *     modeled on services/magicLink.js.
 *
 * State machine (per Contacts row's `onboarding` field):
 *   status: "pending" -> "active" | "abandoned"
 *   esignStatus: "not_sent" -> "sent" -> "completed"
 *   kycStatus: "not_required" | "not_started" -> "pending" -> "verified" | "failed" | "start_failed"
 *   "active" requires esignStatus === "completed" AND
 *     (kycStatus === "not_required" OR kycStatus === "verified").
 *   "abandoned" is a lazily-computed terminal state (no cron): any read that
 *   touches a stale "pending" onboarding older than ABANDON_WINDOW_MS flips
 *   it, and a subsequent addClient() call resets a fresh attempt rather than
 *   reusing a dead one forever (CODEX S52.61 §3 partial/failed-onboarding
 *   gap).
 *
 * Every state transition writes a real audit entry to the `auditTrail`
 * collection — the same collection/shape already used elsewhere in this
 * codebase (index.js:14544 etc., services/ir/advisorFlow.js) — not a new
 * format.
 */

const admin = require("firebase-admin");
const { findExistingContactInTxn, buildContactDoc } = require("../contacts/contactsService");

function getDb() {
  return admin.firestore();
}
function ts() {
  try {
    return admin.firestore.FieldValue.serverTimestamp();
  } catch (e) {
    return new Date();
  }
}

const ABANDON_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// CODEX S52.61 §3, Decided (2026-08-22, Sean): KYC required for MSR
// (borrower) and DPP (the manufacturer's authorized signer) — optional /
// staff-discretion everywhere else in this task's scope.
const MANDATORY_KYC_WORKER_SLUGS = new Set(["msr-servicing-001", "eu-passport-registry-001"]);

const VERTICAL_BY_WORKER_SLUG = {
  "re-escrow-001": "title_re",
  "law-landuse-001": "title_re",
  "re-title-search-001": "title_re",
  "re-defect-tracker-001": "title_re",
  "msr-servicing-001": "msr",
  "eu-passport-registry-001": "dpp",
};

// CODEX S52.61 §5, Decided (2026-08-22, Sean): a distinct, platform-level
// consent for cross-tenant identity resolution, bundled into the KYC step
// itself via the e-signed disclosure — only relevant for verticals where
// KYC actually applies (no verifiedIdentityId is ever created otherwise).
const CROSS_TENANT_CONSENT_TEXT =
  "By signing below, you also consent to SOCIII's verified-identity cross-tenant resolution: a one-time " +
  "biometric identity check performed by our verification provider (Stripe Identity) is used to compute a " +
  "cryptographic hash of your verified legal name, date of birth, and document number. SOCIII stores only " +
  "that hash — never biometric data, never the raw name/DOB/document values — and may use it to recognize " +
  "that the same real person has separately, independently verified with other SOCIII-powered businesses, " +
  "without ever sharing your data between them. [PLACEHOLDER wording — recorded per CODEX S52.62 §1.5/§4 " +
  "item 9; pending real legal review before this exact language ships to a real client.]";

// Real per-vertical legal drafting is explicitly out of scope for this pass
// (CODEX S52.61 §5, §6 item 4) — these are clearly-labeled functional
// placeholders so the e-signature MECHANISM (send/track/gate) is real.
const DISCLOSURE_TEMPLATES = {
  title_re: {
    title: "Title & Real Estate Services Engagement Letter",
    body: (clientName, workspaceName) =>
      `[PLACEHOLDER TEMPLATE — NOT REVIEWED BY COUNSEL, CODEX S52.61 §5]\n\n` +
      `This engagement letter confirms that ${workspaceName || "the title company"} will act on behalf of ` +
      `${clientName} in connection with the referenced real estate transaction, including title search, escrow, ` +
      `and related services as applicable. By signing, you authorize ${workspaceName || "the title company"} to ` +
      `access transaction-related records on your behalf and to communicate with you through the SOCIII client ` +
      `portal.\n\nReal engagement-letter language for this vertical needs actual legal drafting before this is ` +
      `used with a real client — this is a functional placeholder so the e-signature mechanism can be tested end ` +
      `to end.`,
  },
  msr: {
    title: "Loan Servicing Portal Access & Borrower Authorization",
    body: (clientName) =>
      `[PLACEHOLDER TEMPLATE — NOT REVIEWED BY COUNSEL, CODEX S52.61 §5]\n\n` +
      `This authorization confirms that ${clientName}, as borrower, consents to receive loan servicing ` +
      `communications and self-service portal access (payoff requests, hardship/NOE-RFI submissions, ` +
      `cease-communication requests) through SOCIII on behalf of the servicer. Real loan-servicing-authorization ` +
      `language needs actual legal/compliance drafting (this vertical carries the platform's heaviest regulatory ` +
      `load, CODEX S52.61 §4.2) before this is used with a real borrower — this is a functional placeholder so ` +
      `the e-signature and KYC-gating mechanism can be tested end to end.\n\n${CROSS_TENANT_CONSENT_TEXT}`,
  },
  dpp: {
    title: "DPP Consulting & Data Processing Agreement",
    body: (clientName) =>
      `[PLACEHOLDER TEMPLATE — NOT REVIEWED BY COUNSEL, CODEX S52.61 §5]\n\n` +
      `This agreement confirms that the undersigned, as authorized representative of ${clientName}, engages ` +
      `Volta Advisory / SOCIII to prepare EU Digital Product Passport records on the manufacturer's behalf, and ` +
      `authorizes the consultant to process the manufacturer's product data for that purpose. Real DPP ` +
      `consulting/data-processing agreement language needs actual legal drafting before this is used with a real ` +
      `manufacturer client — this is a functional placeholder so the e-signature and KYC-gating mechanism can be ` +
      `tested end to end. This signature identifies the authorized signer as an individual, per CODEX S52.62 ` +
      `§1.5 — it does not itself verify the manufacturer as an organization.\n\n${CROSS_TENANT_CONSENT_TEXT}`,
  },
  generic: {
    title: "Client Engagement & Portal Access Agreement",
    body: (clientName, workspaceName) =>
      `[PLACEHOLDER TEMPLATE — NOT REVIEWED BY COUNSEL, CODEX S52.61 §5]\n\n` +
      `This agreement confirms that ${clientName} engages ${workspaceName || "this business"} for services and ` +
      `consents to receive communications and portal access through SOCIII. Real per-vertical agreement language ` +
      `needs actual legal drafting — this is a functional placeholder so the e-signature mechanism can be tested ` +
      `end to end.`,
  },
};

function determineVertical(workerSlugs) {
  for (const slug of workerSlugs || []) {
    if (VERTICAL_BY_WORKER_SLUG[slug]) return VERTICAL_BY_WORKER_SLUG[slug];
  }
  return "generic";
}

function isKycMandatory(workerSlugs) {
  return (workerSlugs || []).some((s) => MANDATORY_KYC_WORKER_SLUGS.has(s));
}

async function writeAudit({ db, type, tenantId, contactId, actorUid, details }) {
  await (db || getDb()).collection("auditTrail").add({
    type,
    tenantId: tenantId || null,
    contactId: contactId || null,
    actorUid: actorUid || null,
    details: details || null,
    at: ts(),
  });
}

// ---------------------------------------------------------------
// addClient — the shared capability, §3
// ---------------------------------------------------------------

/**
 * @param {object} params
 * @param {FirebaseFirestore.Firestore} [params.db]
 * @param {{tenantId:string, userId:string}} params.ctx
 * @param {string|null} [params.contactId] — pick an existing contact instead of creating one
 * @param {string} [params.name]
 * @param {string} [params.first_name]
 * @param {string} [params.last_name]
 * @param {string} [params.email]
 * @param {string} [params.phone]
 * @param {string} [params.company]
 * @param {string} [params.title]
 * @param {string[]} params.workerSlugs — which worker(s) to grant portal access to
 * @param {boolean} [params.kycRequired=false] — staff-discretion opt-in for non-mandatory verticals
 * @param {string} [params.source="clients:add"]
 */
async function addClient({ db, ctx, contactId = null, name, first_name, last_name, email, phone, company, title, workerSlugs, kycRequired = false, source = "clients:add" }) {
  const database = db || getDb();
  const tenantId = ctx.tenantId;
  const actorUid = ctx.userId;
  if (!tenantId) throw Object.assign(new Error("tenantId required"), { statusCode: 400 });
  if (!Array.isArray(workerSlugs) || workerSlugs.length === 0) {
    throw Object.assign(new Error("workerSlugs required (at least one)"), { statusCode: 400 });
  }
  if (!contactId && !email && !phone) {
    throw Object.assign(new Error("contactId, or email/phone for a new contact, required"), { statusCode: 400 });
  }

  const effectiveKycRequired = !!kycRequired || isKycMandatory(workerSlugs);
  const vertical = determineVertical(workerSlugs);

  // ---- Transaction: idempotent contact + membership resolution ----
  // Firestore transactions require every read before every write, so ID
  // allocation for a possibly-new contact (`.doc()`, no network op) happens
  // before the membership lookup read, which happens before any writes.
  const txnResult = await database.runTransaction(async (txn) => {
    let contactSnap = null;
    if (contactId) {
      const ref = database.collection("contacts").doc(contactId);
      const snap = await txn.get(ref);
      if (!snap.exists || snap.data().tenantId !== tenantId) {
        throw Object.assign(new Error("contact not found in this tenant"), { statusCode: 404 });
      }
      contactSnap = snap;
    } else {
      contactSnap = await findExistingContactInTxn({ txn, db: database, tenantId, email, phone });
    }

    const isNewContact = !contactSnap;
    const contactRef = isNewContact ? database.collection("contacts").doc() : contactSnap.ref;

    // Membership idempotency read — one client membership per (contactId, tenantId).
    const memQuery = database.collection("memberships")
      .where("tenantId", "==", tenantId)
      .where("contactId", "==", contactRef.id)
      .where("role", "==", "client")
      .limit(1);
    const memSnap = await txn.get(memQuery);

    // ---- All reads done — writes only from here ----
    let contactData;
    if (isNewContact) {
      const baseDoc = buildContactDoc({
        tenantId,
        userId: actorUid,
        b: { name, first_name, last_name, email, phone, company, title, intent: "client_onboarding" },
      });
      contactData = {
        ...baseDoc,
        onboarding: {
          status: "pending",
          kycRequired: effectiveKycRequired,
          kycStatus: effectiveKycRequired ? "not_started" : "not_required",
          esignStatus: "not_sent",
          esignRequestId: null,
          vertical,
          workerSlugs,
          startedAt: ts(),
          lastActivityAt: ts(),
          activatedAt: null,
          abandonedAt: null,
        },
      };
      txn.set(contactRef, contactData);
    } else {
      contactData = contactSnap.data();
      const existingOnboarding = contactData.onboarding || null;
      const now = Date.now();
      const startedAtMs = existingOnboarding?.startedAt?.toMillis?.() || 0;
      const isAbandoned = existingOnboarding
        && existingOnboarding.status === "pending"
        && startedAtMs
        && (now - startedAtMs) > ABANDON_WINDOW_MS;

      let onboarding;
      if (!existingOnboarding || isAbandoned) {
        // No prior onboarding attempt, or the previous one went stale —
        // start (or restart) a fresh attempt rather than reusing a dead one
        // forever (CODEX S52.61 §3 partial/failed-onboarding gap).
        onboarding = {
          status: "pending",
          kycRequired: effectiveKycRequired,
          kycStatus: effectiveKycRequired ? "not_started" : "not_required",
          esignStatus: "not_sent",
          esignRequestId: null,
          vertical,
          workerSlugs: Array.from(new Set([...(existingOnboarding?.workerSlugs || []), ...workerSlugs])),
          startedAt: ts(),
          lastActivityAt: ts(),
          activatedAt: null,
          abandonedAt: null,
        };
      } else {
        // Already active, or still in-flight and not abandoned — idempotent
        // merge: this is "grant additional worker access to an EXISTING
        // client," not a duplicate onboarding (CODEX S52.61 §3, Decided).
        onboarding = {
          ...existingOnboarding,
          workerSlugs: Array.from(new Set([...(existingOnboarding.workerSlugs || []), ...workerSlugs])),
          lastActivityAt: ts(),
        };
      }
      txn.set(contactRef, { onboarding, updated_at: ts() }, { merge: true });
      contactData = { ...contactData, onboarding };
    }

    let membershipRef, membershipIsNew;
    if (memSnap.empty) {
      membershipRef = database.collection("memberships").doc();
      membershipIsNew = true;
      // Deliberately NOT status:"active" — see file header. A generic
      // "active" would satisfy middleware/membershipCheck.js's
      // enforceRoleGate() (unknown roles default to viewer-rank) and would
      // also surface this client in GET /workspace:members's staff roster.
      // "client_pending"/"client_active"/"client_revoked" keep this
      // capability's access model fully separate from staff membership
      // semantics while still using the same collection/field shape.
      txn.set(membershipRef, {
        userId: contactData.uid || null,
        tenantId,
        role: "client",
        status: "client_pending",
        contactId: contactRef.id,
        workerSlugs: contactData.onboarding.workerSlugs,
        createdAt: ts(),
        createdVia: source,
      });
    } else {
      membershipRef = memSnap.docs[0].ref;
      membershipIsNew = false;
      const existingMem = memSnap.docs[0].data();
      const mergedSlugs = Array.from(new Set([...(existingMem.workerSlugs || []), ...workerSlugs]));
      txn.set(membershipRef, {
        workerSlugs: mergedSlugs,
        status: existingMem.status === "client_active" ? "client_active" : existingMem.status,
        updatedAt: ts(),
      }, { merge: true });
    }

    return {
      contactId: contactRef.id,
      isNewContact,
      onboarding: contactData.onboarding,
      contactEmail: contactData.email || null,
      contactName: contactData.name || null,
      membershipId: membershipRef.id,
      membershipIsNew,
    };
  });

  await writeAudit({
    db: database, type: "client_onboarding_started", tenantId, contactId: txnResult.contactId, actorUid,
    details: { workerSlugs, kycRequired: effectiveKycRequired, vertical, isNewContact: txnResult.isNewContact },
  });

  // ---- Post-transaction side effects (Firebase Auth / SendGrid / e-sign) ----
  // Deliberately outside the Firestore transaction (none of this is a
  // Firestore op, and transactions may retry on contention — retrying a
  // Stripe/SendGrid call as a side effect of that would be wrong). Only
  // kick these off when the disclosure hasn't been sent yet — an idempotent
  // retry, or a call that's really "grant this active client more worker
  // access," must not re-send the disclosure or re-invite them.
  //
  // NOTE (documented, narrow residual gap): two truly concurrent addClient()
  // calls for the SAME brand-new email could both observe esignStatus
  // "not_sent" and both reach this branch before either's side effects
  // complete, sending two disclosure emails. The transaction above still
  // guarantees only ONE Contacts row and ONE membership are ever created —
  // the invariant this codex is most concerned about — a duplicate
  // notification email in that narrow window is a much lower-severity
  // residual risk, consistent with this codebase's existing tolerance
  // elsewhere (e.g. magicLink.js's rate limiting is coarse, not lock-based).
  if (txnResult.onboarding.esignStatus !== "not_sent") {
    return {
      ok: true,
      contactId: txnResult.contactId,
      membershipId: txnResult.membershipId,
      onboarding: txnResult.onboarding,
      idempotent: true,
    };
  }

  if (!txnResult.contactEmail) {
    await writeAudit({
      db: database, type: "client_onboarding_blocked_no_email", tenantId, contactId: txnResult.contactId, actorUid,
      details: {},
    });
    return {
      ok: true,
      contactId: txnResult.contactId,
      membershipId: txnResult.membershipId,
      onboarding: txnResult.onboarding,
      warning: "No email on file — disclosure/portal invite not sent. Add an email to this contact to continue onboarding.",
      idempotent: false,
    };
  }

  // Ensure a Firebase Auth account exists for this client — needed both as
  // the KYC session's `uid` (identityDocId correlation) and the
  // membership's eventual `userId`.
  let uid = null;
  try {
    const existing = await admin.auth().getUserByEmail(txnResult.contactEmail);
    uid = existing.uid;
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      const created = await admin.auth().createUser({
        email: txnResult.contactEmail,
        emailVerified: false,
        displayName: txnResult.contactName || undefined,
      });
      uid = created.uid;
    } else {
      console.warn("[clientOnboarding] Firebase Auth lookup failed (non-fatal):", e.message);
    }
  }
  if (uid) {
    await stampClientUid({ db: database, tenantId, contactId: txnResult.contactId, uid });
  }

  let esignResult = null;
  try {
    esignResult = await sendDisclosureForSignature({
      db: database,
      tenantId,
      actorUid,
      contactId: txnResult.contactId,
      contactEmail: txnResult.contactEmail,
      contactName: txnResult.contactName,
      vertical,
      kycRequired: effectiveKycRequired,
    });
  } catch (esignErr) {
    console.error("[clientOnboarding] esign send failed:", esignErr.message);
    await writeAudit({ db: database, type: "client_esign_send_failed", tenantId, contactId: txnResult.contactId, actorUid, details: { error: esignErr.message } });
  }

  let inviteResult = null;
  try {
    const { sendClientPortalInvite } = require("./clientPortalInvite");
    const tenantSnap = await database.collection("tenants").doc(tenantId).get();
    const workspaceName = tenantSnap.exists ? (tenantSnap.data().name || null) : null;
    inviteResult = await sendClientPortalInvite({
      db: database,
      tenantId,
      contactId: txnResult.contactId,
      email: txnResult.contactEmail,
      name: txnResult.contactName,
      workspaceName,
      workerSlugs: txnResult.onboarding.workerSlugs,
      invitedBy: actorUid,
      esignSigningUrl: esignResult?.signingUrl || null,
    });
  } catch (inviteErr) {
    console.warn("[clientOnboarding] portal invite send failed (non-fatal):", inviteErr.message);
  }

  return {
    ok: true,
    contactId: txnResult.contactId,
    membershipId: txnResult.membershipId,
    onboarding: { ...txnResult.onboarding, esignStatus: esignResult ? "sent" : txnResult.onboarding.esignStatus },
    kycRequired: effectiveKycRequired,
    esign: esignResult ? { requestId: esignResult.requestId, track: esignResult.track } : null,
    invite: inviteResult ? { emailed: inviteResult.emailed } : null,
    idempotent: false,
  };
}

/**
 * Send the vertical-appropriate disclosure via esignService.js's own send
 * path (native track — reuses the exact send/track/gate mechanism, not a
 * new one). Calls `handleESignSend` directly with a minimal fake
 * req/res, which is the cleanest reuse without modifying that module
 * (esignService.js is HTTP-shaped, not a pure function).
 */
async function sendDisclosureForSignature({ db, tenantId, actorUid, contactId, contactEmail, contactName, vertical, kycRequired }) {
  const database = db || getDb();
  const template = DISCLOSURE_TEMPLATES[vertical] || DISCLOSURE_TEMPLATES.generic;
  const tenantSnap = await database.collection("tenants").doc(tenantId).get();
  const workspaceName = tenantSnap.exists ? (tenantSnap.data().name || null) : null;
  const bodyText = template.body(contactName || "Client", workspaceName);

  const { handleESignSend } = require("../esign/esignService");

  const fakeReq = {
    body: {
      title: template.title,
      signers: [{ email: contactEmail, name: contactName || contactEmail }],
      message: bodyText,
      metadata: {
        clientOnboarding: true,
        contactId,
        tenantId,
        kycRequired: !!kycRequired,
      },
    },
  };
  let statusCode = 200;
  let result = null;
  const fakeRes = {
    status(code) { statusCode = code; return this; },
    json(obj) { result = obj; return obj; },
  };

  await handleESignSend(fakeReq, fakeRes, { userId: actorUid, tenantId });
  if (!result || result.ok !== true) {
    throw new Error((result && result.error) || `esign send failed (status ${statusCode})`);
  }

  await database.collection("contacts").doc(contactId).set({
    onboarding: { esignStatus: "sent", esignRequestId: result.requestId },
    updated_at: ts(),
  }, { merge: true });
  await writeAudit({ db: database, type: "client_esign_sent", tenantId, contactId, actorUid, details: { requestId: result.requestId, track: result.track, vertical } });

  return { requestId: result.requestId, track: result.track, signingUrl: (result.signingLinks && result.signingLinks[0]?.signingUrl) || null };
}

// ---------------------------------------------------------------
// Stamping the client's Firebase uid onto contact + membership once known
// (called eagerly from addClient(), and defensively from
// clientPortalInvite.js's redeem path in case an account was created there
// instead — e.g. an invite created before the uid existed for any reason).
// ---------------------------------------------------------------
async function stampClientUid({ db, tenantId, contactId, uid }) {
  const database = db || getDb();
  await database.collection("contacts").doc(contactId).set({ uid, updated_at: ts() }, { merge: true });
  const memSnap = await database.collection("memberships")
    .where("tenantId", "==", tenantId)
    .where("contactId", "==", contactId)
    .where("role", "==", "client")
    .limit(1)
    .get();
  if (!memSnap.empty) {
    await memSnap.docs[0].ref.set({ userId: uid, updatedAt: ts() }, { merge: true });
  }
}

// ---------------------------------------------------------------
// Disclosure-signed hook — called from esignService.js's native-signing
// completion path (handleESignSign) when the signed request's metadata
// carries `clientOnboarding: true`. Guarded by that metadata flag so this
// never engages for any other esign use on the platform.
// ---------------------------------------------------------------
async function onDisclosureSigned({ db, tenantId, contactId, kycRequired, signedAt }) {
  const database = db || getDb();
  const ref = database.collection("contacts").doc(contactId);
  await ref.set({ onboarding: { esignStatus: "completed" }, updated_at: ts() }, { merge: true });
  await writeAudit({ db: database, type: "client_esign_completed", tenantId, contactId, actorUid: null, details: {} });

  if (kycRequired) {
    const snap = await ref.get();
    const contact = snap.data() || {};
    if (contact.uid) {
      try {
        const { createIdentitySessionForUid } = require("../identity/identitySession");
        const session = await createIdentitySessionForUid({
          db: database,
          uid: contact.uid,
          tenantId,
          purpose: "client_onboarding",
          identityConsent: {
            accepted: true,
            acceptedAt: signedAt || new Date().toISOString(),
            text: "Consented via e-signed onboarding disclosure (CODEX S52.61 §5 bundled consent)",
          },
        });
        await ref.set({
          onboarding: { kycStatus: "pending", kycSessionId: session.sessionId, kycVerificationUrl: session.url || null },
          updated_at: ts(),
        }, { merge: true });
        await writeAudit({ db: database, type: "client_kyc_session_started", tenantId, contactId, actorUid: null, details: { sessionId: session.sessionId } });
      } catch (kycErr) {
        console.error("[clientOnboarding] KYC session kickoff failed:", kycErr.message);
        await ref.set({ onboarding: { kycStatus: "start_failed" }, updated_at: ts() }, { merge: true });
        await writeAudit({ db: database, type: "client_kyc_session_failed", tenantId, contactId, actorUid: null, details: { error: kycErr.message } });
      }
    } else {
      console.warn(`[clientOnboarding] disclosure signed for contact ${contactId} but no uid on file — cannot start KYC`);
    }
  }

  return refreshClientOnboardingStatus({ db: database, tenantId, contactId });
}

// ---------------------------------------------------------------
// Identity-verified hook — called from index.js's Stripe Identity webhook
// extension once CODEX S52.62's findOrCreateVerifiedIdentity() has resolved
// a verifiedIdentityId for purpose === "client_onboarding". This is the
// "wire the webhook-side identity verification back to the specific
// Contacts row" piece CODEX S52.61 §3 calls out explicitly.
// ---------------------------------------------------------------
async function onIdentityVerifiedForContact({ db, uid, tenantId, verifiedIdentityId }) {
  const database = db || getDb();
  const snap = await database.collection("contacts")
    .where("tenantId", "==", tenantId)
    .where("uid", "==", uid)
    .limit(1)
    .get();
  if (snap.empty) {
    console.warn(`[clientOnboarding] no contact found for uid on identity verification (tenantId=${tenantId})`);
    return { ok: false, reason: "contact_not_found" };
  }
  const doc = snap.docs[0];
  await doc.ref.set({
    verifiedIdentityId: verifiedIdentityId || null,
    onboarding: { kycStatus: verifiedIdentityId ? "verified" : "failed" },
    updated_at: ts(),
  }, { merge: true });
  await writeAudit({
    db: database, type: "client_kyc_verified", tenantId, contactId: doc.id, actorUid: null,
    details: { hasVerifiedIdentityId: !!verifiedIdentityId },
  });
  return refreshClientOnboardingStatus({ db: database, tenantId, contactId: doc.id });
}

// ---------------------------------------------------------------
// refreshClientOnboardingStatus — the pull-based reconciliation path
// (same idiom as stripeIdentity.js's syncIdentitySessionToEntity): recompute
// and, if the gates are satisfied, flip status -> "active" and the
// membership -> "client_active". Also lazily resolves abandonment. Called
// after esign completion, after KYC verification, and (for BoldSign-track
// disclosures, which have no webhook today — same pre-existing gap
// handleBoldSignDocumentStatus's poll-only pattern already has) can be
// called manually/on a poll.
// ---------------------------------------------------------------
async function refreshClientOnboardingStatus({ db, tenantId, contactId }) {
  const database = db || getDb();
  const ref = database.collection("contacts").doc(contactId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: "not_found" };
  const contact = snap.data();
  const onboarding = contact.onboarding;
  if (!onboarding) return { ok: false, reason: "no_onboarding" };
  if (onboarding.status === "active" || onboarding.status === "abandoned") {
    return { ok: true, status: onboarding.status, changed: false };
  }

  const startedAtMs = onboarding.startedAt?.toMillis?.() || 0;
  if (startedAtMs && (Date.now() - startedAtMs) > ABANDON_WINDOW_MS) {
    await ref.set({ onboarding: { status: "abandoned", abandonedAt: ts() } }, { merge: true });
    await writeAudit({ db: database, type: "client_onboarding_abandoned", tenantId, contactId, actorUid: null, details: { windowMs: ABANDON_WINDOW_MS } });
    return { ok: true, status: "abandoned", changed: true };
  }

  const esignDone = onboarding.esignStatus === "completed";
  const kycDone = onboarding.kycStatus === "not_required" || onboarding.kycStatus === "verified";
  if (esignDone && kycDone) {
    await ref.set({ onboarding: { status: "active", activatedAt: ts(), lastActivityAt: ts() } }, { merge: true });
    const memSnap = await database.collection("memberships")
      .where("tenantId", "==", tenantId).where("contactId", "==", contactId).where("role", "==", "client").limit(1).get();
    if (!memSnap.empty) {
      await memSnap.docs[0].ref.set({ status: "client_active", updatedAt: ts() }, { merge: true });
    }
    await writeAudit({
      db: database, type: "client_access_granted", tenantId, contactId, actorUid: null,
      details: { workerSlugs: onboarding.workerSlugs, vertical: onboarding.vertical },
    });
    return { ok: true, status: "active", changed: true };
  }

  return { ok: true, status: onboarding.status, changed: false };
}

// ---------------------------------------------------------------
// revokeClientAccess — §3 Decided/Tier 2. Writes its OWN distinct audit
// event type ("client_access_revoked"), never just a mutated status field.
// ---------------------------------------------------------------
async function revokeClientAccess({ db, ctx, contactId, workerSlugs = null, reason = null }) {
  const database = db || getDb();
  const tenantId = ctx.tenantId;
  const actorUid = ctx.userId;
  if (!tenantId) throw Object.assign(new Error("tenantId required"), { statusCode: 400 });
  if (!contactId) throw Object.assign(new Error("contactId required"), { statusCode: 400 });

  const memSnap = await database.collection("memberships")
    .where("tenantId", "==", tenantId).where("contactId", "==", contactId).where("role", "==", "client").limit(1).get();
  if (memSnap.empty) {
    throw Object.assign(new Error("no client membership found for this contact"), { statusCode: 404 });
  }
  const memRef = memSnap.docs[0].ref;
  const mem = memSnap.docs[0].data();
  const existingSlugs = mem.workerSlugs || [];
  const revokeAll = !Array.isArray(workerSlugs) || workerSlugs.length === 0;
  const revokedSlugs = revokeAll ? existingSlugs : existingSlugs.filter((s) => workerSlugs.includes(s));
  const remainingSlugs = revokeAll ? [] : existingSlugs.filter((s) => !workerSlugs.includes(s));

  await memRef.set({
    workerSlugs: remainingSlugs,
    status: remainingSlugs.length === 0 ? "client_revoked" : "client_active",
    updatedAt: ts(),
  }, { merge: true });

  // MSR note (CODEX S52.61 §3, §4.2): a loan payoff or servicing transfer is
  // conceptually the trigger for this on that vertical (RESPA/Reg X
  // servicing-transfer handling of a borrower's portal access). Detecting
  // that event automatically is out of scope for this pass — this endpoint
  // is the real, callable, correctly-audited revocation mechanism a future
  // servicing-transfer trigger would call.
  await writeAudit({
    db: database, type: "client_access_revoked", tenantId, contactId, actorUid,
    details: { revokedWorkerSlugs: revokedSlugs, remainingWorkerSlugs: remainingSlugs, reason: reason || null, fullRevocation: remainingSlugs.length === 0 },
  });

  return {
    ok: true,
    contactId,
    membershipId: memRef.id,
    revokedWorkerSlugs: revokedSlugs,
    remainingWorkerSlugs: remainingSlugs,
    status: remainingSlugs.length === 0 ? "client_revoked" : "client_active",
  };
}

async function getClientOnboardingStatus({ db, tenantId, contactId }) {
  const database = db || getDb();
  const snap = await database.collection("contacts").doc(contactId).get();
  if (!snap.exists || snap.data().tenantId !== tenantId) return { ok: false, reason: "not_found" };
  const contact = snap.data();
  return { ok: true, contactId, onboarding: contact.onboarding || null, verifiedIdentityId: contact.verifiedIdentityId || null };
}

/**
 * What the signed-in client's own account is entitled to, for the portal
 * side (generalizes the hardcoded PERSONAS-map pattern CODEX S52.62 §2
 * documented as demo-only — this is the real, per-client version of it).
 */
async function getClientPortalAccess({ db, tenantId, uid }) {
  const database = db || getDb();
  const snap = await database.collection("memberships")
    .where("tenantId", "==", tenantId).where("userId", "==", uid).where("role", "==", "client").limit(1).get();
  if (snap.empty) return { ok: true, hasAccess: false, workerSlugs: [] };
  const mem = snap.docs[0].data();
  return { ok: true, hasAccess: mem.status === "client_active", status: mem.status, workerSlugs: mem.workerSlugs || [] };
}

module.exports = {
  MANDATORY_KYC_WORKER_SLUGS,
  VERTICAL_BY_WORKER_SLUG,
  DISCLOSURE_TEMPLATES,
  determineVertical,
  isKycMandatory,
  addClient,
  stampClientUid,
  onDisclosureSigned,
  onIdentityVerifiedForContact,
  refreshClientOnboardingStatus,
  revokeClientAccess,
  getClientOnboardingStatus,
  getClientPortalAccess,
};
