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

const INVESTOR_DECK_URL = process.env.SOCIII_INVESTOR_DECK_URL || null;
const WHITEPAPER_URL = process.env.SOCIII_WHITEPAPER_URL || "https://sociii.ai/whitepaper";
const DATA_ROOM_URL = process.env.SOCIII_DATA_ROOM_URL || null;

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

  const baseUrl = process.env.SOCIII_APP_BASE_URL || "https://title-app-alpha.web.app";
  const magicUrl = `${baseUrl}/auth/magic?token=${token}&role=investor&fundraise=${encodeURIComponent(fundraiseId)}&investor=${encodeURIComponent(investorId)}`;

  // Pull the real valuation cap from the fundraise so the email + SAFE packet
  // match the founder-declared terms. Falls back to DEFAULT_VALUATION_CAP if
  // the fundraise doesn't have one set. P0 — hardcoding $10M would have
  // shipped wrong terms to real investors.
  let fundraiseValuationCap = DEFAULT_VALUATION_CAP;
  try {
    const frSnap = await db.collection("fundraises").doc(fundraiseId).get();
    if (frSnap.exists && frSnap.data().valuation_cap) {
      fundraiseValuationCap = Number(frSnap.data().valuation_cap);
    }
  } catch (_) { /* fall back to default */ }

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
          // Subject avoids "Welcome to" / "pre-seed access" phrasing — those
          // trigger Gmail's Promotions classifier (TC-020). Personal-sounding
          // lead-with-first-name reads as correspondence, lands in Primary.
          subject: `${(name || "").split(" ")[0] || "Hello"} — SOCIII intro`,
          content: [{
            type: "text/html",
            value: _investorInviteEmail({ name, magicUrl, investmentAmount, valuationCap: fundraiseValuationCap, deckUrl: INVESTOR_DECK_URL, whitepaperUrl: WHITEPAPER_URL, dataRoomUrl: DATA_ROOM_URL }),
          }],
          tracking_settings: {
            click_tracking: { enable: false, enable_text: false },
            open_tracking: { enable: false },
          },
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

  // Phase 1 of workspace-at-invite (2026-05-29): record pending invite so the
  // sign-up flow can later detect it by email and pre-populate the workspace's
  // canvas with obligation cards (verify ID / sign SAFE).
  // Non-blocking.
  try {
    const { recordPendingInvite } = require("../invites/pendingInvites");
    await recordPendingInvite({
      email,
      role: "investor",
      entityId: investorId,
      name,
      invitedBy: null,
      context: {
        fundraiseId,
        investmentAmount,
      },
    });
  } catch (e) {
    console.warn("[investorFlow] pendingInvite record failed (non-blocking):", e.message);
  }

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
  force = false,
}) {
  const { ref, data } = await _getInvestor(fundraiseId, investorId);
  if (!data) throw new Error(`investor ${investorId} not found`);
  // Fall back to the commitment_amount stamped on the investor doc when the
  // caller doesn't supply investmentAmount. The workspace banner fires this
  // action without amount context (TC-023) — but the amount was set when the
  // investor was first added or invited. Explicit caller-supplied amount
  // still wins (e.g., founder revises terms mid-flow).
  if (!investmentAmount || investmentAmount < 100) {
    investmentAmount = Number(data.commitment_amount || 0);
  }
  if (!investmentAmount || investmentAmount < 100) {
    throw new Error("startSafeSigning: investmentAmount must be >= 100 (caller did not provide and investor.commitment_amount is missing or below threshold)");
  }
  if (data.kycStatus !== "approved") {
    throw new Error("startSafeSigning: identity verification not complete");
  }
  // Idempotency guard (mirrors advisorFlow.startAdvisorSigning) — if a SAFE
  // packet already exists, don't fire a new one. Clicking "Sign SAFE" again
  // should refresh status, not create a duplicate packet that overwrites the
  // active hellosignRequestId. See TC-019.
  if (!force && data.hellosignRequestId && (data.flowStep === "signature_pending" || data.flowStep === "signature_complete" || data.flowStep === "closed")) {
    console.log(`[investorFlow] startSafeSigning — packet already exists, deferring to sync (investor=${investorId}, flowStep=${data.flowStep}, hellosign=${data.hellosignRequestId})`);
    return syncSignatureFromDropboxSign({ fundraiseId, investorId });
  }

  // Pull the cap from the fundraise doc so it matches what the founder
  // declared (e.g., SOCIII Seed Round = $25M). Fall back to DEFAULT only if
  // the doc is missing valuation_cap. Real investors must see the actual cap
  // on their SAFE — hardcoding $10M was a P0 bug.
  let valuationCap = DEFAULT_VALUATION_CAP;
  try {
    const frSnap = await getDb().collection("fundraises").doc(fundraiseId).get();
    if (frSnap.exists && frSnap.data().valuation_cap) {
      valuationCap = Number(frSnap.data().valuation_cap);
    }
  } catch (_) { /* fall back to default */ }
  const sharesIssued = _calcSharesIssued(investmentAmount, valuationCap);

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

function _investorInviteEmail({ name, magicUrl, investmentAmount, valuationCap, deckUrl, whitepaperUrl, dataRoomUrl }) {
  const firstName = (name || "").split(" ")[0] || "friend";
  const capDisplay = valuationCap
    ? (valuationCap >= 1_000_000 ? `$${(valuationCap / 1_000_000).toFixed(0)}M` : `$${Number(valuationCap).toLocaleString()}`)
    : "$10M";
  const amountSentence = investmentAmount
    ? ` Based on our conversation, we've reserved a <strong>$${Number(investmentAmount).toLocaleString()}</strong> allocation in your name on the round; nothing's locked until you sign.`
    : "";
  const deckLine = deckUrl
    ? `<a href="${deckUrl}" style="color: #7C3AED; text-decoration: underline;">the SOCIII pre-seed deck</a>`
    : `the SOCIII pre-seed deck (we'll follow up with the link directly)`;
  const whitepaperLine = whitepaperUrl
    ? ` and <a href="${whitepaperUrl}" style="color: #7C3AED; text-decoration: underline;">the SOCIII whitepaper</a>`
    : "";
  const dataRoomLine = dataRoomUrl
    ? ` The full data room (financials, cap table, formation docs, patent family) is at <a href="${dataRoomUrl}" style="color: #7C3AED; text-decoration: underline;">your scoped link</a>, accessible once ID verification is complete.`
    : ` The data room link will appear in your portal as soon as ID verification is complete.`;
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 40px 20px; color: #1a202c;">
  <div style="margin-bottom: 28px;">
    <span style="font-size: 22px; font-weight: 700; color: #7C3AED; letter-spacing: -0.5px;">SOCIII</span>
  </div>

  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">${firstName},</p>

  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
    Genuinely grateful you're considering coming in on this round. SOCIII is the digital-worker platform we wish had existed when we were running operations across title, aviation, and auto — and the pre-seed window is when the people closest to us get the chance to be part of it from Day 0.${amountSentence}
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
    The round is structured as a SAFE at a ${capDisplay} post-money cap. Each $1 invested converts to one share on the priced round, which keeps the math clean and the cap table tidy.
  </p>

  <h3 style="font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 32px 0 12px 0;">What happens next</h3>

  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
    <strong>1. A quick identity check.</strong> Click <a href="${magicUrl}" style="color: #7C3AED; text-decoration: underline;">your private investor portal</a> to run a 30-second ID verification through Stripe Identity. SOCIII covers the verification fee. This is the gate that keeps the cap table KYC-clean for the priced round downstream — no Reg D headaches when we close.
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
    <strong>2. The materials.</strong> I'll follow up directly with ${deckLine}${whitepaperLine} as soon as your ID verifies. The deck is the 12-slide version of the thesis; the whitepaper is the architectural deep-dive when you want to go a layer down on patents, RAAS, and the cross-vertical roll-out.${dataRoomLine}
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
    <strong>3. The SAFE.</strong> When you're ready, a Dropbox Sign packet will land in your inbox with the SAFE. <strong>Heads up:</strong> it'll come <em>from me</em> — "Sean Lee Combs (SOCIII), via Dropbox Sign" — not from a generic hellosign address. My signature is queued right behind yours, so it closes the moment you're done.
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin: 24px 0 16px 0;">
    If you want to talk through any of this live, book a slot at <a href="${OFFICE_HOURS_BOOKING_URL}" style="color: #7C3AED;">SOCIII office hours</a> or just reply to this email. Truly happy to take it at whatever pace works for you.
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 4px 0;">Talk soon,</p>
  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;"><strong>Sean Lee Combs</strong><br/>
    <span style="color: #64748b;">Founder, SOCIII</span>
  </p>

  <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0;">
      SOCIII, Inc. — Collaborative Intelligence. This invitation and the linked materials are confidential and intended only for the named recipient. Nothing herein constitutes an offer to sell or solicitation to buy securities; any such offer is made solely through the executed SAFE and accompanying disclosures.
    </p>
  </div>
</div>`;
}

// Recovery path mirroring advisorFlow.syncKycFromStripe (TC-018) — pulls
// current Stripe Identity session status and writes back to investor doc.
// Used as fallback when the Stripe webhook fails to flip the entity.
async function syncKycFromStripe({ fundraiseId = DEFAULT_FUNDRAISE_ID, investorId }) {
  if (!investorId) throw new Error("syncKycFromStripe: investorId required");
  const { data } = await _getInvestor(fundraiseId, investorId);
  if (!data) throw new Error(`investor ${investorId} not found`);

  const sessionId = data.stripeIdentitySessionId;
  if (!sessionId) {
    return { ok: true, kycStatus: data.kycStatus || "not_submitted", note: "no_session_yet" };
  }

  const { syncIdentitySessionToEntity } = require("../identity/stripeIdentity");
  const result = await syncIdentitySessionToEntity({ sessionId, fundraiseId, investorId });
  console.log(`[investorFlow] syncKycFromStripe investor=${investorId} session=${sessionId} status=${result?.status}`);
  return result;
}

// Recovery path mirroring advisorFlow.syncSignatureFromDropboxSign (TC-019).
// Pulls current Dropbox Sign signature_request state and replays
// onSignaturePacketSigned when complete. Used both as the idempotency-guard
// fallback in startSafeSigning and as the banner-side defensive auto-sync.
async function syncSignatureFromDropboxSign({ fundraiseId = DEFAULT_FUNDRAISE_ID, investorId }) {
  if (!investorId) throw new Error("syncSignatureFromDropboxSign: investorId required");
  const { data } = await _getInvestor(fundraiseId, investorId);
  if (!data) throw new Error(`investor ${investorId} not found`);

  if (data.flowStep === "signature_complete" || data.flowStep === "closed") {
    return { ok: true, flowStep: data.flowStep, note: "already_complete" };
  }
  const dbxSignRequestId = data.hellosignRequestId;
  if (!dbxSignRequestId) {
    return { ok: true, flowStep: data.flowStep, note: "no_signature_request_yet" };
  }

  const hellosign = require("../signatureService/hellosign");
  const sigReq = await hellosign.getSignatureRequest(dbxSignRequestId);
  if (!sigReq) {
    return { ok: true, flowStep: data.flowStep, note: "hellosign_keys_missing" };
  }
  console.log(`[investorFlow] syncSignatureFromDropboxSign investor=${investorId} request=${dbxSignRequestId} is_complete=${sigReq.is_complete}`);
  if (!sigReq.is_complete) {
    return {
      ok: true,
      flowStep: data.flowStep,
      note: "not_yet_signed",
      signers: sigReq.signatures?.map(s => ({ email: s.signer_email_address, signed: !!s.signed_at })),
    };
  }

  await onSignaturePacketSigned({
    requestId: data.signatureRequestId || dbxSignRequestId,
    hellosignRequestId: dbxSignRequestId,
    metadata: { fundraiseId, investorId },
    finalHash: null,
  });
  return { ok: true, flowStep: "signature_complete", note: "synced_from_dropbox_sign" };
}

module.exports = {
  initiateInvestorFlow,
  onMagicLinkClick,
  markStepComplete,
  startIdentityVerification,
  syncKycFromStripe,
  startSafeSigning,
  syncSignatureFromDropboxSign,
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
