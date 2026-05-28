"use strict";

/**
 * services/ir/advisorFlow.js — IR Phase 2 advisor orchestration
 *
 * Advisor flow state machine:
 *   created → identity_pending → identity_complete →
 *   signature_pending → signature_complete → closed
 *
 * Mirrors investorFlow.js. Anchored on advisors/{advisorId}.
 *
 * Three external systems:
 *   1. Stripe Identity (services/identity/stripeIdentity.js) — KYC free to advisor
 *   2. Dropbox Sign (services/signatureService) — role=advisor template
 *   3. SOCIII Vault — Advisor Agreement PDF + investor deck link
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const OFFICE_HOURS_BOOKING_URL =
  process.env.OFFICE_HOURS_BOOKING_URL || "https://cal.com/sociii/office-hours";

// Deck URL must be explicitly configured (env var) or it stays null and the UI/email
// hides the link entirely. Prior default pointed at app.sociii.ai which does not resolve.
const INVESTOR_DECK_URL = process.env.SOCIII_INVESTOR_DECK_URL || null;

// Advisor magic-link TTL. 7 days so first-time advisors (Kent, etc.) aren't expired by
// the time they get back to their inbox. Tokens are still single-use.
const ADVISOR_MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const VALID_STEPS = [
  "created",
  "identity_pending",
  "identity_complete",
  "signature_pending",
  "signature_complete",
  "closed",
];

async function _getAdvisor(advisorId) {
  const ref = getDb().collection("advisors").doc(advisorId);
  const snap = await ref.get();
  if (!snap.exists) return { ref, data: null };
  return { ref, data: snap.data() };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 0 — INITIATE
// ═══════════════════════════════════════════════════════════════

async function initiateAdvisorFlow(input) {
  const {
    advisorId: requestedAdvisorId = null,
    email,
    name,
    equityPct,
    vestingMonths = 24,
    cliffMonths = 6,
    advisorRole = null,
    invitedBy = null,
  } = input || {};

  const db = getDb();

  // Resume-first: try advisorId, then email. Only validate inputs if we're creating fresh.
  let advisorId = null;
  let existingData = null;
  if (requestedAdvisorId) {
    const byIdSnap = await db.collection("advisors").doc(requestedAdvisorId).get();
    if (byIdSnap.exists) {
      advisorId = requestedAdvisorId;
      existingData = byIdSnap.data();
    }
  }
  if (!advisorId && email) {
    const byEmailSnap = await db.collection("advisors")
      .where("email", "==", email.toLowerCase()).limit(1).get();
    if (!byEmailSnap.empty) {
      advisorId = byEmailSnap.docs[0].id;
      existingData = byEmailSnap.docs[0].data();
    }
  }

  if (!advisorId) {
    if (!email || !name) {
      throw new Error("initiateAdvisorFlow: email and name required to create a new advisor");
    }
    if (equityPct == null) {
      throw new Error("initiateAdvisorFlow: equityPct required to create a new advisor");
    }
    advisorId = `adv_${crypto.randomBytes(8).toString("hex")}`;
    await db.collection("advisors").doc(advisorId).set({
      advisorId,
      email: email.toLowerCase(),
      name,
      equityPct: String(equityPct),
      vestingMonths: Number(vestingMonths),
      cliffMonths: Number(cliffMonths),
      advisorRole,
      kycStatus: "not_submitted",
      flowStep: "created",
      invitedBy,
      invitedAt: ts(),
      created_at: ts(),
      updated_at: ts(),
    });
  } else if (existingData) {
    // Resume: surface useful state on the response (no writes).
    console.log(`[advisorFlow] initiate resume — advisor ${advisorId} kyc=${existingData.kycStatus} step=${existingData.flowStep}`);
  }

  // Resume mode: pull email/name/equityPct from existing doc if not supplied.
  const effectiveEmail = (email || existingData?.email || "").toLowerCase();
  const effectiveName = name || existingData?.name || "";
  const effectiveEquityPct = equityPct != null ? equityPct : existingData?.equityPct;
  const effectiveAdvisorRole = advisorRole || existingData?.advisorRole || null;

  if (!effectiveEmail) {
    throw new Error("initiateAdvisorFlow: cannot resume — advisor has no email on file");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + ADVISOR_MAGIC_LINK_TTL_MS);

  await db.collection("magicLinks").doc(tokenId).set({
    token,
    email: effectiveEmail,
    role: "advisor",
    advisorId,
    workerId: null,
    workerSlug: null,
    createdAt: now,
    expiresAt,
    usedAt: null,
    used: false,
  });

  const baseUrl = process.env.SOCIII_APP_BASE_URL || "https://title-app-alpha.web.app";
  const magicUrl = `${baseUrl}/auth/magic?token=${token}&role=advisor&advisor=${encodeURIComponent(advisorId)}`;

  let emailQueued = false;
  try {
    if (process.env.SENDGRID_API_KEY) {
      const sgResp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: effectiveEmail, name: effectiveName }] }],
          from: { email: "sean@sociii.ai", name: "Sean Combs — SOCIII" },
          reply_to: { email: "sean@sociii.ai", name: "Sean Combs" },
          subject: "Your SOCIII advisor invitation",
          content: [{
            type: "text/html",
            value: _advisorInviteEmail({ name: effectiveName, magicUrl, equityPct: effectiveEquityPct, advisorRole: effectiveAdvisorRole, deckUrl: INVESTOR_DECK_URL }),
          }],
          // SendGrid click-tracking rewrites links through url813.sociii.ai which
          // lacks HTTPS. Chrome shows a "Not Secure" warning that breaks the flow
          // for non-technical advisors. Keep the magic link raw.
          tracking_settings: {
            click_tracking: { enable: false, enable_text: false },
            open_tracking: { enable: false },
          },
        }),
      });
      emailQueued = sgResp.ok;
      if (!sgResp.ok) {
        const errText = await sgResp.text().catch(() => "");
        console.warn(`[advisorFlow] SendGrid invite send returned ${sgResp.status}: ${errText.slice(0, 200)}`);
      }
    } else {
      console.warn("[advisorFlow] SENDGRID_API_KEY not set — invite email NOT sent. Magic link:", magicUrl);
    }
  } catch (e) {
    console.error("[advisorFlow] invite email send threw:", e.message);
  }

  await db.collection("messages").add({
    channel: "email",
    direction: "outbound",
    from: "sean@sociii.ai",
    to: effectiveEmail,
    subject: "Your SOCIII advisor invitation",
    purpose: "ir_advisor_invite",
    advisorId,
    magicLinkTokenId: tokenId,
    delivered: emailQueued,
    timestamp: ts(),
  });

  return {
    ok: true,
    advisorId,
    magicLinkUrl: magicUrl,
    emailQueued,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STATE MACHINE
// ═══════════════════════════════════════════════════════════════

async function markStepComplete(advisorId, step, extra = {}) {
  if (!VALID_STEPS.includes(step)) {
    throw new Error(`markStepComplete: invalid step ${step}`);
  }
  const { ref, data } = await _getAdvisor(advisorId);
  if (!data) throw new Error(`advisor ${advisorId} not found`);

  await ref.set({
    flowStep: step,
    [`flowStep_${step}_at`]: ts(),
    updated_at: ts(),
    ...extra,
  }, { merge: true });

  return { ok: true, advisorId, step };
}

async function onMagicLinkClick({ advisorId }) {
  if (!advisorId) throw new Error("onMagicLinkClick: advisorId required");
  const { data } = await _getAdvisor(advisorId);
  if (!data) throw new Error(`advisor ${advisorId} not found`);

  const kyc = data.kycStatus || "not_submitted";
  const flowStep = data.flowStep || "created";

  if (kyc !== "approved") {
    return { ok: true, step: "identity_pending", advisor: _publicAdvisor(data) };
  }
  if (flowStep === "signature_complete" || flowStep === "closed") {
    return {
      ok: true,
      step: flowStep,
      advisor: _publicAdvisor(data),
      advisorDocumentRef: data.advisorDocumentRef || null,
      officeHoursUrl: OFFICE_HOURS_BOOKING_URL,
      deckUrl: INVESTOR_DECK_URL,
    };
  }
  if (flowStep === "signature_pending") {
    return {
      ok: true,
      step: "signature_pending",
      advisor: _publicAdvisor(data),
      signatureRequestId: data.signatureRequestId || null,
      hellosignRequestId: data.hellosignRequestId || null,
    };
  }
  return { ok: true, step: "identity_complete", advisor: _publicAdvisor(data) };
}

function _publicAdvisor(d) {
  const tsToIso = (v) => (v && typeof v.toDate === "function" ? v.toDate().toISOString() : (v || null));
  return {
    advisorId: d.advisorId,
    email: d.email,
    name: d.name,
    flowStep: d.flowStep || "created",
    kycStatus: d.kycStatus || "not_submitted",
    equityPct: d.equityPct || null,
    vestingMonths: d.vestingMonths || 24,
    cliffMonths: d.cliffMonths || 6,
    advisorRole: d.advisorRole || null,
    termsAcknowledgedAt: tsToIso(d.termsAcknowledgedAt),
    verifiedAddress: d.verifiedAddress || null,
    verifiedName: d.verifiedName || null,
    stripeIdentitySessionId: d.stripeIdentitySessionId || null,
    stripeIdentityStatus: d.stripeIdentityStatus || null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 1 — START STRIPE IDENTITY
// ═══════════════════════════════════════════════════════════════

async function startIdentityVerification({ advisorId, uid, returnUrl = null }) {
  const { data } = await _getAdvisor(advisorId);
  if (!data) throw new Error(`advisor ${advisorId} not found`);

  if (!data.termsAcknowledgedAt) {
    throw new Error("startIdentityVerification: terms must be acknowledged before identity verification");
  }

  const { createIdentitySession } = require("../identity/stripeIdentity");
  const result = await createIdentitySession({
    uid,
    advisorId,
    returnUrl,
    email: data.email,
    name: data.name,
  });

  await markStepComplete(advisorId, "identity_pending", {
    stripeIdentitySessionId: result.sessionId,
  });

  return result;
}

// Records the recipient's consent to proposed terms (deck/role/equity).
// Must complete before identity verification can begin.
async function acknowledgeTerms({ advisorId, uid = null, userAgent = null, ip = null }) {
  if (!advisorId) throw new Error("acknowledgeTerms: advisorId required");
  const { ref, data } = await _getAdvisor(advisorId);
  if (!data) throw new Error(`advisor ${advisorId} not found`);

  if (data.termsAcknowledgedAt) {
    return { ok: true, alreadyAcknowledged: true, termsAcknowledgedAt: data.termsAcknowledgedAt };
  }

  const dealTerms = {
    equityPct: data.equityPct || null,
    vestingMonths: data.vestingMonths || 24,
    cliffMonths: data.cliffMonths || 6,
    advisorRole: data.advisorRole || null,
  };

  await ref.set({
    termsAcknowledgedAt: ts(),
    termsAcknowledgedBy: uid || null,
    termsAcknowledgedUserAgent: userAgent || null,
    termsAcknowledgedIp: ip || null,
    termsAcknowledgedDealTerms: dealTerms,
    updated_at: ts(),
  }, { merge: true });

  await getDb().collection("auditTrail").add({
    type: "ir_advisor_terms_acknowledged",
    advisorId,
    uid: uid || null,
    dealTerms,
    userAgent,
    ip,
    at: ts(),
  });

  return { ok: true, advisorId, dealTerms };
}

// Recovery path: pulls current Stripe verification session status and writes back.
// Used as a fallback when the Stripe webhook fails to flip the advisor doc.
async function syncKycFromStripe({ advisorId }) {
  if (!advisorId) throw new Error("syncKycFromStripe: advisorId required");
  const { ref, data } = await _getAdvisor(advisorId);
  if (!data) throw new Error(`advisor ${advisorId} not found`);

  const sessionId = data.stripeIdentitySessionId;
  if (!sessionId) {
    return { ok: true, kycStatus: data.kycStatus || "not_submitted", note: "no_session_yet" };
  }

  const { syncIdentitySessionToEntity } = require("../identity/stripeIdentity");
  const result = await syncIdentitySessionToEntity({ sessionId, advisorId });
  console.log(`[advisorFlow] syncKycFromStripe advisor=${advisorId} session=${sessionId} status=${result?.status}`);
  return result;
}

// ═══════════════════════════════════════════════════════════════
//  STEP 2 — START ADVISOR SIGNING
// ═══════════════════════════════════════════════════════════════

async function startAdvisorSigning({ advisorId, advisorAddress, uid = null, force = false }) {
  const { ref, data } = await _getAdvisor(advisorId);
  if (!data) throw new Error(`advisor ${advisorId} not found`);
  if (data.kycStatus !== "approved") {
    throw new Error("startAdvisorSigning: identity verification not complete");
  }
  if (force) {
    console.log(`[advisorFlow] startAdvisorSigning FORCE — advisor=${advisorId} priorRequestId=${data.signatureRequestId || "(none)"} priorHellosign=${data.hellosignRequestId || "(none)"}`);
  }

  // Prefer the Stripe Identity verified address (set by the webhook handler).
  // Caller-supplied advisorAddress overrides it (e.g., advisor edits in UI).
  const resolvedAddress = advisorAddress
    || data.verifiedAddress
    || data.advisorAddress
    || "[Address on file]";
  const resolvedName = data.verifiedName || data.name;

  if (advisorAddress) {
    await ref.set({ advisorAddress, updated_at: ts() }, { merge: true });
  }

  const sigService = require("../signatureService");
  const result = await sigService.sendSignaturePacket({
    role: "advisor",
    recipientEmail: data.email,
    recipientName: resolvedName,
    vars: {
      advisorAddress: resolvedAddress,
      equityPct: data.equityPct,
      vestingMonths: data.vestingMonths,
      cliffMonths: data.cliffMonths,
      agreementDate: new Date().toISOString().slice(0, 10),
    },
    tenantId: "sociii-platform",
    userId: uid || null,
    metadata: {
      advisorId,
      role: "advisor",
    },
  });

  if (!result.ok) {
    console.error(`[advisorFlow] startAdvisorSigning FAILED advisor=${advisorId} recipient=${data.email} error=${result.error} missingEnv=${result.missingEnv || "(none)"}`);
    return result;
  }

  console.log(`[advisorFlow] startAdvisorSigning OK advisor=${advisorId} recipient=${data.email} hellosignRequestId=${result.hellosignRequestId} sigRequestId=${result.requestId}`);

  await markStepComplete(advisorId, "signature_pending", {
    signatureRequestId: result.requestId,
    hellosignRequestId: result.hellosignRequestId,
  });

  return {
    ok: true,
    requestId: result.requestId,
    hellosignRequestId: result.hellosignRequestId,
    recipientEmail: data.email,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 3 — POST-SIGNATURE HOOK
// ═══════════════════════════════════════════════════════════════

async function onSignaturePacketSigned({ requestId, hellosignRequestId, metadata, finalHash }) {
  const { advisorId } = metadata || {};
  if (!advisorId) {
    console.warn("[advisorFlow.onSignaturePacketSigned] missing advisorId metadata", { requestId });
    return { ok: false, reason: "missing_metadata" };
  }

  const db = getDb();
  const { ref: advRef, data: advisor } = await _getAdvisor(advisorId);
  if (!advisor) {
    console.warn("[advisorFlow.onSignaturePacketSigned] advisor not found", { advisorId });
    return { ok: false, reason: "advisor_not_found" };
  }

  // 1. Fetch signed PDF + persist
  let advisorDocumentRef = null;
  try {
    const hellosign = require("../signatureService/hellosign");
    const signedFile = await hellosign.getSignedFile(hellosignRequestId);
    if (signedFile && signedFile.buffer) {
      const bucket = admin.storage().bucket();
      const storagePath = `advisorAgreements/${advisorId}/Advisor_${requestId}.pdf`;
      await bucket.file(storagePath).save(signedFile.buffer, {
        metadata: { contentType: "application/pdf" },
      });
      advisorDocumentRef = {
        storagePath,
        bucket: bucket.name,
        contentType: "application/pdf",
        size: signedFile.buffer.length,
      };
    }
  } catch (e) {
    console.error("[advisorFlow] failed to fetch/store signed PDF:", e.message);
  }

  // 2. Vault write
  const vaultDocId = `advisor_${advisorId}_${requestId}`;
  const advisorMetadata = {
    type: "advisor_agreement",
    advisorId,
    equityPct: advisor.equityPct || null,
    vestingMonths: advisor.vestingMonths || 24,
    cliffMonths: advisor.cliffMonths || 6,
    advisorRole: advisor.advisorRole || null,
    executedAt: new Date().toISOString(),
    signatureRequestId: requestId,
    hellosignRequestId,
    blockchainFinalHash: finalHash || null,
    storageRef: advisorDocumentRef,
    advisorName: advisor.name,
    advisorEmail: advisor.email,
  };

  try {
    await db.doc(`vaults/sociii-platform/documents/${vaultDocId}`).set({
      ...advisorMetadata,
      addedAt: ts(),
    }, { merge: true });
    await advRef.set({
      advisorDocumentRef,
      advisorVaultDocId: vaultDocId,
      advisorExecutedAt: ts(),
      advisorMetadata,
      kycStatus: "approved",
      flowStep: "signature_complete",
      status: "closed",
      closedAt: ts(),
      updated_at: ts(),
    }, { merge: true });
  } catch (e) {
    console.error("[advisorFlow] Vault write failed:", e.message);
  }

  // 3. Confirmation email with deck link
  try {
    if (process.env.SENDGRID_API_KEY) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: advisor.email, name: advisor.name }] }],
          from: { email: "sean@sociii.ai", name: "Sean Combs — SOCIII" },
          reply_to: { email: "sean@sociii.ai", name: "Sean Combs" },
          subject: "Welcome to the SOCIII advisor team",
          content: [{
            type: "text/html",
            value: _advisorWelcomeEmail({ name: advisor.name, deckUrl: INVESTOR_DECK_URL, officeHoursUrl: OFFICE_HOURS_BOOKING_URL }),
          }],
        }),
      });
    }
  } catch (e) {
    console.error("[advisorFlow] welcome email failed:", e.message);
  }

  await db.collection("auditTrail").add({
    type: "ir_advisor_agreement_executed",
    advisorId,
    requestId,
    finalHash: finalHash || null,
    at: ts(),
  });

  return { ok: true, advisorId, vaultDocId, advisorDocumentRef };
}

// ═══════════════════════════════════════════════════════════════
//  STATUS
// ═══════════════════════════════════════════════════════════════

async function getStatus({ advisorId }) {
  if (!advisorId) throw new Error("getStatus: advisorId required");
  const { data } = await _getAdvisor(advisorId);
  if (!data) return { ok: false, error: "advisor_not_found" };
  return {
    ok: true,
    advisor: _publicAdvisor(data),
    flowStep: data.flowStep || "created",
    kycStatus: data.kycStatus || "not_submitted",
    advisorDocumentRef: data.advisorDocumentRef || null,
    advisorVaultDocId: data.advisorVaultDocId || null,
    officeHoursUrl: OFFICE_HOURS_BOOKING_URL,
    deckUrl: INVESTOR_DECK_URL,
    closedAt: data.closedAt || null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function _advisorInviteEmail({ name, magicUrl, equityPct, advisorRole, deckUrl }) {
  const firstName = (name || "").split(" ")[0] || "there";
  const roleLine = advisorRole
    ? `<p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Advisor role: <strong>${advisorRole}</strong>.</p>`
    : "";
  const deckLine = deckUrl
    ? `<p style="font-size: 14px; color: #64748b; line-height: 1.6;">Investor deck: <a href="${deckUrl}" style="color: #7C3AED;">view the SOCIII pre-seed deck</a>.</p>`
    : "";
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7C3AED;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi ${firstName},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    You're invited to join SOCIII as an advisor. Proposed terms: <strong>${equityPct}</strong> equity, vesting over the standard schedule.
  </p>
  ${roleLine}
  <div style="margin: 28px 0; padding: 20px 24px; background: #f8fafc; border-left: 4px solid #7C3AED; border-radius: 6px;">
    <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #1a202c;">
      Your Advisor Agreement is on its way from Dropbox Sign.
    </p>
    <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
      Look for a separate email from <strong>hellosign.com</strong> or <strong>dropboxsign.com</strong> in your inbox (check spam if you don't see it). That's the email to open and sign. No action needed on this email — it's just a heads-up.
    </p>
  </div>
  ${deckLine}
  <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin-top: 28px;">
    Need to check your status after signing? <a href="${magicUrl}" style="color: #94a3b8; text-decoration: underline;">View your onboarding portal</a> (link valid for 7 days). Reply to this email with any questions.
  </p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. | Collaborative Intelligence</p>
  </div>
</div>`;
}

function _advisorWelcomeEmail({ name, deckUrl, officeHoursUrl }) {
  const firstName = (name || "").split(" ")[0] || "there";
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7C3AED;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Welcome, ${firstName}.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    Your Advisor Agreement is fully executed and a copy lives in your SOCIII Vault.
  </p>
  ${deckUrl ? `<p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    <a href="${deckUrl}" style="color: #7C3AED;">SOCIII pre-seed deck</a> — share it with investors in your network when you're ready.
  </p>` : ""}
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    Book office hours: <a href="${officeHoursUrl}" style="color: #7C3AED;">${officeHoursUrl}</a>
  </p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. | Collaborative Intelligence</p>
  </div>
</div>`;
}

module.exports = {
  initiateAdvisorFlow,
  onMagicLinkClick,
  markStepComplete,
  acknowledgeTerms,
  startIdentityVerification,
  syncKycFromStripe,
  startAdvisorSigning,
  onSignaturePacketSigned,
  getStatus,
  VALID_STEPS,
  INVESTOR_DECK_URL,
  OFFICE_HOURS_BOOKING_URL,
};
