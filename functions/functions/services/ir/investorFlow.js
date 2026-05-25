"use strict";

/**
 * services/ir/investorFlow.js — IR Phase 1 orchestration
 *
 * Investor flow state machine:
 *   created → identity_pending → identity_complete →
 *   signature_pending → signature_complete → closed
 *
 * The flow is anchored on a fundraise investor record at
 *   fundraises/{fundraiseId}/investors/{investorId}
 *
 * It coordinates three external systems:
 *   1. Stripe Identity (services/identity/stripeIdentity.js)
 *   2. Dropbox Sign (services/signatureService/sendSignaturePacket)
 *   3. SOCIII Vault (vaults/{uid}/documents) + Drive write deferred to Phase 5
 *
 * Phase 1 hard constraints:
 *   - Email sends are CODED but will bounce until SendGrid sociii.ai domain
 *     auth lands. Do not block on email — log a TODO.
 *   - No SMS — that's Phase 2.
 *   - SAFE valuation cap is hard-coded to $10M post-money with 10M authorized
 *     shares so each $1 invested = 1 share (per Storyhouse walkthrough spec).
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const DEFAULT_FUNDRAISE_ID = "sociii-pre-seed-2026";
const DEFAULT_VALUATION_CAP = 10_000_000;
const DEFAULT_AUTHORIZED_SHARES = 10_000_000;
const OFFICE_HOURS_BOOKING_URL =
  process.env.OFFICE_HOURS_BOOKING_URL || "https://cal.com/sociii/office-hours";

const VALID_STEPS = [
  "created",
  "identity_pending",
  "identity_complete",
  "signature_pending",
  "signature_complete",
  "closed",
];

function _calcSharesIssued(investmentAmount, valuationCap = DEFAULT_VALUATION_CAP, authorizedShares = DEFAULT_AUTHORIZED_SHARES) {
  if (!investmentAmount || investmentAmount <= 0) return 0;
  // shares = investmentAmount / (valuationCap / authorizedShares)
  // With defaults: each $1 = 1 share.
  return Math.round((Number(investmentAmount) * authorizedShares) / Number(valuationCap));
}

async function _getInvestor(fundraiseId, investorId) {
  const ref = getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId);
  const snap = await ref.get();
  if (!snap.exists) return { ref, data: null };
  return { ref, data: snap.data() };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 0 — INITIATE
// ═══════════════════════════════════════════════════════════════

/**
 * Create the investor record (if needed) and send the magic-link invite.
 *
 * @param {object} input
 * @param {string} input.email
 * @param {string} input.name
 * @param {number} [input.investmentAmount]   — optional commitment at invite time
 * @param {string} [input.fundraiseId]        — defaults to DEFAULT_FUNDRAISE_ID
 * @param {string} [input.invitedBy]          — uid of the inviter (Sean/Kent/Alex)
 *
 * @returns {Promise<{ok, investorId, fundraiseId, magicLinkUrl?, emailQueued}>}
 */
async function initiateInvestorFlow(input) {
  const {
    email,
    name,
    investmentAmount = null,
    fundraiseId = DEFAULT_FUNDRAISE_ID,
    invitedBy = null,
  } = input || {};

  if (!email || !name) {
    throw new Error("initiateInvestorFlow: email and name required");
  }

  const db = getDb();

  // Reuse existing investor record if one exists for this email + fundraise.
  let investorId = null;
  const existingSnap = await db.collection("fundraises").doc(fundraiseId)
    .collection("investors").where("email", "==", email.toLowerCase()).limit(1).get();
  if (!existingSnap.empty) {
    investorId = existingSnap.docs[0].id;
  } else {
    investorId = `inv_${crypto.randomBytes(8).toString("hex")}`;
    await db.collection("fundraises").doc(fundraiseId)
      .collection("investors").doc(investorId).set({
        investorId,
        email: email.toLowerCase(),
        name,
        commitment_amount: investmentAmount,
        kycStatus: "not_submitted",
        accreditationStatus: "unverified",
        flowStep: "created",
        invitedBy,
        invitedAt: ts(),
        created_at: ts(),
        updated_at: ts(),
      });
  }

  // Issue a magic link with role=investor so the landing page knows which
  // post-login surface to render. We do this directly here rather than calling
  // /v1/magic-link:send because that endpoint requires a workerId; investor
  // sign-in is platform-scoped, not worker-scoped.
  const token = crypto.randomBytes(32).toString("hex");
  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 60 * 60 * 1000);

  await db.collection("magicLinks").doc(tokenId).set({
    token,
    email: email.toLowerCase(),
    role: "investor",
    fundraiseId,
    investorId,
    workerId: null,
    workerSlug: null,
    createdAt: now,
    expiresAt,
    usedAt: null,
    used: false,
  });

  const baseUrl = "https://app.sociii.ai";
  const magicUrl = `${baseUrl}/auth/magic?token=${token}&role=investor&fundraise=${encodeURIComponent(fundraiseId)}&investor=${encodeURIComponent(investorId)}`;

  // ── Email send (Phase 1: coded but will bounce) ─────────────
  // TODO: manual test after SendGrid sociii.ai domain auth completes. Until
  // then this call is intentionally fire-and-forget; we log the URL so Sean
  // can ship it to Storyhouse manually for the 5/28 walkthrough.
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
          personalizations: [{ to: [{ email, name }] }],
          from: { email: "sean@sociii.ai", name: "Sean Combs — SOCIII" },
          reply_to: { email: "sean@sociii.ai", name: "Sean Combs" },
          subject: "Your SOCIII investor access",
          content: [{
            type: "text/html",
            value: _investorInviteEmail({ name, magicUrl, investmentAmount }),
          }],
        }),
      });
      emailQueued = sgResp.ok;
      if (!sgResp.ok) {
        const errText = await sgResp.text().catch(() => "");
        console.warn(`[investorFlow] SendGrid invite send returned ${sgResp.status}: ${errText.slice(0, 200)}`);
      }
    } else {
      console.warn("[investorFlow] SENDGRID_API_KEY not set — invite email NOT sent. Magic link:", magicUrl);
    }
  } catch (e) {
    console.error("[investorFlow] invite email send threw:", e.message);
  }

  // Log to messages/ for audit trail regardless of delivery status.
  await db.collection("messages").add({
    channel: "email",
    direction: "outbound",
    from: "sean@sociii.ai",
    to: email,
    subject: "Your SOCIII investor access",
    purpose: "ir_investor_invite",
    fundraiseId,
    investorId,
    magicLinkTokenId: tokenId,
    delivered: emailQueued,
    timestamp: ts(),
  });

  return {
    ok: true,
    investorId,
    fundraiseId,
    magicLinkUrl: magicUrl,
    emailQueued,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STEP STATE MACHINE
// ═══════════════════════════════════════════════════════════════

async function markStepComplete(fundraiseId, investorId, step, extra = {}) {
  if (!VALID_STEPS.includes(step)) {
    throw new Error(`markStepComplete: invalid step ${step}`);
  }
  const { ref, data } = await _getInvestor(fundraiseId, investorId);
  if (!data) throw new Error(`investor ${investorId} not found in ${fundraiseId}`);

  await ref.set({
    flowStep: step,
    [`flowStep_${step}_at`]: ts(),
    updated_at: ts(),
    ...extra,
  }, { merge: true });

  return { ok: true, fundraiseId, investorId, step };
}

/**
 * Resolve next-step state after the investor clicks their magic link OR
 * polls the flow status. This is the central state machine — it returns
 * what the UI should render next.
 *
 * Returns one of:
 *   { step: "identity_pending", identitySession: {...} }
 *   { step: "identity_complete_signature_pending" }
 *   { step: "signature_pending", signatureRequestId, hellosignRequestId }
 *   { step: "signature_complete", safeDocumentRef }
 *   { step: "closed" }
 */
async function onMagicLinkClick({ fundraiseId = DEFAULT_FUNDRAISE_ID, investorId }) {
  if (!investorId) throw new Error("onMagicLinkClick: investorId required");
  const { data } = await _getInvestor(fundraiseId, investorId);
  if (!data) throw new Error(`investor ${investorId} not found in ${fundraiseId}`);

  const kyc = data.kycStatus || "not_submitted";
  const flowStep = data.flowStep || "created";

  if (kyc !== "approved") {
    return { ok: true, step: "identity_pending", investor: _publicInvestor(data) };
  }
  if (flowStep === "signature_complete" || flowStep === "closed") {
    return {
      ok: true,
      step: flowStep,
      investor: _publicInvestor(data),
      safeDocumentRef: data.safeDocumentRef || null,
      officeHoursUrl: OFFICE_HOURS_BOOKING_URL,
    };
  }
  if (flowStep === "signature_pending") {
    return {
      ok: true,
      step: "signature_pending",
      investor: _publicInvestor(data),
      signatureRequestId: data.signatureRequestId || null,
      hellosignRequestId: data.hellosignRequestId || null,
    };
  }
  // KYC approved but no signature yet — UI should ask for investment amount.
  return { ok: true, step: "identity_complete", investor: _publicInvestor(data) };
}

function _publicInvestor(d) {
  return {
    investorId: d.investorId,
    email: d.email,
    name: d.name,
    flowStep: d.flowStep || "created",
    kycStatus: d.kycStatus || "not_submitted",
    commitment_amount: d.commitment_amount || null,
    sharesIssued: d.sharesIssued || null,
    valuationCap: d.valuationCap || DEFAULT_VALUATION_CAP,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 1 — START STRIPE IDENTITY
// ═══════════════════════════════════════════════════════════════

async function startIdentityVerification({
  fundraiseId = DEFAULT_FUNDRAISE_ID,
  investorId,
  uid,
  returnUrl = null,
}) {
  const { data } = await _getInvestor(fundraiseId, investorId);
  if (!data) throw new Error(`investor ${investorId} not found`);

  const { createIdentitySession } = require("../identity/stripeIdentity");
  const result = await createIdentitySession({
    uid,
    fundraiseId,
    investorId,
    returnUrl,
    email: data.email,
    name: data.name,
  });

  await markStepComplete(fundraiseId, investorId, "identity_pending", {
    stripeIdentitySessionId: result.sessionId,
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
//  STEP 2 — START SAFE SIGNING
// ═══════════════════════════════════════════════════════════════

async function startSafeSigning({
  fundraiseId = DEFAULT_FUNDRAISE_ID,
  investorId,
  investmentAmount,
  uid = null,
}) {
  if (!investmentAmount || investmentAmount < 100) {
    throw new Error("startSafeSigning: investmentAmount must be >= 100");
  }
  const { ref, data } = await _getInvestor(fundraiseId, investorId);
  if (!data) throw new Error(`investor ${investorId} not found`);
  if (data.kycStatus !== "approved") {
    throw new Error("startSafeSigning: identity verification not complete");
  }

  const sharesIssued = _calcSharesIssued(investmentAmount);
  const valuationCap = DEFAULT_VALUATION_CAP;

  // Stamp investment terms onto the investor record BEFORE sending the packet
  // so the webhook handler can read them when it writes to Vault.
  await ref.set({
    commitment_amount: Number(investmentAmount),
    valuationCap,
    sharesIssued,
    updated_at: ts(),
  }, { merge: true });

  const sigService = require("../signatureService");
  const result = await sigService.sendSignaturePacket({
    role: "investor",
    recipientEmail: data.email,
    recipientName: data.name,
    vars: {
      investmentAmount,
      valuationCap,
      sharesIssued,
      agreementDate: new Date().toISOString().slice(0, 10),
    },
    tenantId: "sociii-platform",
    userId: uid || null,
    metadata: {
      fundraiseId,
      investorId,
    },
  });

  if (!result.ok) {
    return result;
  }

  await markStepComplete(fundraiseId, investorId, "signature_pending", {
    signatureRequestId: result.requestId,
    hellosignRequestId: result.hellosignRequestId,
  });

  return {
    ok: true,
    requestId: result.requestId,
    hellosignRequestId: result.hellosignRequestId,
    sharesIssued,
    valuationCap,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 3 — POST-SIGNATURE HOOK (called from signatureService webhook)
// ═══════════════════════════════════════════════════════════════

/**
 * Called by signatureService when signature_request_all_signed fires
 * and the request metadata.role === "investor".
 *
 * Side effects:
 *   1. Fetch signed PDF from Dropbox Sign
 *   2. Store via signatureService/storage helper (Vault write)
 *   3. Write SAFE metadata to vaults/{tenantId}/documents
 *   4. Send confirmation email (will bounce — see TODO)
 *   5. Mark investor flowStep=signature_complete, status=closed
 */
async function onSignaturePacketSigned({
  requestId,
  hellosignRequestId,
  metadata,
  finalHash,
}) {
  const { fundraiseId, investorId } = metadata || {};
  if (!fundraiseId || !investorId) {
    console.warn("[investorFlow.onSignaturePacketSigned] missing fundraiseId/investorId metadata", { requestId });
    return { ok: false, reason: "missing_metadata" };
  }

  const db = getDb();
  const { ref: invRef, data: investor } = await _getInvestor(fundraiseId, investorId);
  if (!investor) {
    console.warn("[investorFlow.onSignaturePacketSigned] investor not found", { fundraiseId, investorId });
    return { ok: false, reason: "investor_not_found" };
  }

  // ── 1. Fetch signed PDF + persist to Cloud Storage ─────────
  let safeDocumentRef = null;
  try {
    const hellosign = require("../signatureService/hellosign");
    const signedFile = await hellosign.getSignedFile(hellosignRequestId);
    if (signedFile && signedFile.buffer) {
      const bucket = admin.storage().bucket();
      const storagePath = `safeAgreements/${fundraiseId}/${investorId}/SAFE_${requestId}.pdf`;
      await bucket.file(storagePath).save(signedFile.buffer, {
        metadata: { contentType: "application/pdf" },
      });
      safeDocumentRef = {
        storagePath,
        bucket: bucket.name,
        contentType: "application/pdf",
        size: signedFile.buffer.length,
      };
    }
  } catch (e) {
    console.error("[investorFlow] failed to fetch/store signed PDF:", e.message);
  }

  // ── 2. Write to SOCIII Vault ────────────────────────────────
  // Per CLAUDE.md the user's Vault lives at vaults/{uid}/documents. For the
  // SOCIII fundraise this is the platform Vault (tenant = sociii-platform).
  // Investor-side Drive write is deferred to Phase 5.
  const vaultDocId = `safe_${investorId}_${requestId}`;
  const safeMetadata = {
    type: "safe_agreement",
    fundraiseId,
    investorId,
    investmentAmount: investor.commitment_amount || null,
    valuationCap: investor.valuationCap || DEFAULT_VALUATION_CAP,
    sharesIssued: investor.sharesIssued || null,
    executedAt: new Date().toISOString(),
    signatureRequestId: requestId,
    hellosignRequestId,
    blockchainFinalHash: finalHash || null,
    storageRef: safeDocumentRef,
    investorName: investor.name,
    investorEmail: investor.email,
  };

  try {
    await db.doc(`vaults/sociii-platform/documents/${vaultDocId}`).set({
      ...safeMetadata,
      addedAt: ts(),
    }, { merge: true });
    // Also drop a pointer into the fundraise's investor doc for quick reads.
    await invRef.set({
      safeDocumentRef: safeDocumentRef,
      safeVaultDocId: vaultDocId,
      safeExecutedAt: ts(),
      safeMetadata,
      kycStatus: "approved", // ensure idempotent — already approved by now
      flowStep: "signature_complete",
      status: "closed",
      closedAt: ts(),
      updated_at: ts(),
    }, { merge: true });
  } catch (e) {
    console.error("[investorFlow] Vault write failed:", e.message);
  }

  // ── 3. Send confirmation email (coded; will bounce until DNS lands) ──
  // TODO: manual test after SendGrid sociii.ai domain auth completes.
  try {
    const { sendInvestorConfirmation } = require("./investorConfirmationEmail");
    await sendInvestorConfirmation({ fundraiseId, investorId, requestId });
  } catch (e) {
    console.error("[investorFlow] confirmation email failed:", e.message);
  }

  // ── 4. Audit trail row ──────────────────────────────────────
  await db.collection("auditTrail").add({
    type: "ir_investor_safe_executed",
    fundraiseId,
    investorId,
    requestId,
    finalHash: finalHash || null,
    at: ts(),
  });

  return { ok: true, fundraiseId, investorId, vaultDocId, safeDocumentRef };
}

// ═══════════════════════════════════════════════════════════════
//  STATUS — read-only snapshot
// ═══════════════════════════════════════════════════════════════

async function getStatus({ fundraiseId = DEFAULT_FUNDRAISE_ID, investorId }) {
  if (!investorId) throw new Error("getStatus: investorId required");
  const { data } = await _getInvestor(fundraiseId, investorId);
  if (!data) return { ok: false, error: "investor_not_found" };
  return {
    ok: true,
    investor: _publicInvestor(data),
    flowStep: data.flowStep || "created",
    kycStatus: data.kycStatus || "not_submitted",
    safeDocumentRef: data.safeDocumentRef || null,
    safeVaultDocId: data.safeVaultDocId || null,
    officeHoursUrl: OFFICE_HOURS_BOOKING_URL,
    closedAt: data.closedAt || null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function _investorInviteEmail({ name, magicUrl, investmentAmount }) {
  const firstName = (name || "").split(" ")[0] || "there";
  const amountLine = investmentAmount
    ? `<p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Indicated commitment: <strong>$${Number(investmentAmount).toLocaleString()}</strong>.</p>`
    : "";
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7C3AED;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi ${firstName},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    Use the link below to verify identity and sign your SAFE for SOCIII's pre-seed round.
  </p>
  ${amountLine}
  <div style="margin: 32px 0;">
    <a href="${magicUrl}" style="display: inline-block; padding: 14px 32px; background: #7C3AED; color: white; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600;">
      Open investor access
    </a>
  </div>
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    This link expires in 60 minutes. If it does, reply and we'll send a new one.
  </p>
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    Questions: book a slot at <a href="${OFFICE_HOURS_BOOKING_URL}" style="color: #7C3AED;">SOCIII office hours</a>.
  </p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. | Collaborative Intelligence</p>
  </div>
</div>`;
}

module.exports = {
  initiateInvestorFlow,
  onMagicLinkClick,
  markStepComplete,
  startIdentityVerification,
  startSafeSigning,
  onSignaturePacketSigned,
  getStatus,
  // exports for tests / chat-engine integration
  _calcSharesIssued,
  DEFAULT_FUNDRAISE_ID,
  DEFAULT_VALUATION_CAP,
  DEFAULT_AUTHORIZED_SHARES,
  OFFICE_HOURS_BOOKING_URL,
  VALID_STEPS,
};
