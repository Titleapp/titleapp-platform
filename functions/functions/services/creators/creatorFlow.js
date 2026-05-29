"use strict";

/**
 * services/creators/creatorFlow.js — SOCIII creator track onboarding.
 *
 * Creator flow state machine:
 *   created → terms_pending → terms_accepted →
 *   identity_pending → identity_complete →
 *   subscription_pending → subscription_active → closed
 *
 * Differs from advisor/investor:
 *   - No Dropbox Sign (click-through agreement instead)
 *   - Creator pays Stripe Identity fee (~$2) — first 100 waived via FIRST100
 *   - Stripe subscription $49/yr (FIRST100 waives first year)
 *   - No equity / no warrant — economic terms are revenue share (75% sub / 20% inference margin)
 *
 * Anchored on creators/{creatorId}.
 *
 * Three external systems:
 *   1. Stripe Identity (services/identity/stripeIdentity.js)
 *   2. Stripe Subscriptions (services/stripeSubscriptions or direct)
 *   3. SOCIII Vault — Creator License Agreement (versioned text doc)
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

const {
  emailFrame,
  signatureBlock,
  sectionHeading,
  paragraph,
  confidentialityFooter,
  brandLink,
} = require("../_shared/outreachTemplates");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

// 7 days so a creator who clicks through from a tweet doesn't expire before they finish.
const CREATOR_MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const WHITEPAPER_URL = process.env.SOCIII_WHITEPAPER_URL || "https://sociii.ai/whitepaper";
const CREATOR_GUIDE_URL = process.env.SOCIII_CREATOR_GUIDE_URL || "https://sociii.ai/creators";

// Current creator license version + flat text. Update CREATOR_LICENSE_VERSION when terms change;
// click-through acceptance records the version so we can audit who agreed to what.
const CREATOR_LICENSE_VERSION = "v1-2026-05-29";
const CREATOR_LICENSE_PRICE_YEARLY_USD = 49;
const FIRST_HUNDRED_PROMO_CODE = "FIRST100";

const VALID_STEPS = [
  "created",
  "terms_pending",
  "terms_accepted",
  "identity_pending",
  "identity_complete",
  "subscription_pending",
  "subscription_active",
  "closed",
];

async function _getCreator(creatorId) {
  const ref = getDb().collection("creators").doc(creatorId);
  const snap = await ref.get();
  if (!snap.exists) return { ref, data: null };
  return { ref, data: snap.data() };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 0 — INITIATE
// ═══════════════════════════════════════════════════════════════

async function initiateCreatorFlow(input) {
  const {
    creatorId: requestedCreatorId = null,
    email,
    name,
    vertical = null,
    promoCode = null,
    invitedBy = null,
  } = input || {};

  const db = getDb();

  // Resume-first: try creatorId, then email.
  let creatorId = null;
  let existingData = null;
  if (requestedCreatorId) {
    const byIdSnap = await db.collection("creators").doc(requestedCreatorId).get();
    if (byIdSnap.exists) {
      creatorId = requestedCreatorId;
      existingData = byIdSnap.data();
    }
  }
  if (!creatorId && email) {
    const byEmailSnap = await db.collection("creators")
      .where("email", "==", email.toLowerCase()).limit(1).get();
    if (!byEmailSnap.empty) {
      creatorId = byEmailSnap.docs[0].id;
      existingData = byEmailSnap.docs[0].data();
    }
  }

  const firstHundred = String(promoCode || "").toUpperCase() === FIRST_HUNDRED_PROMO_CODE;

  if (!creatorId) {
    if (!email || !name) {
      throw new Error("initiateCreatorFlow: email and name required to create a new creator");
    }
    creatorId = `cre_${crypto.randomBytes(8).toString("hex")}`;
    await db.collection("creators").doc(creatorId).set({
      creatorId,
      email: email.toLowerCase(),
      name,
      vertical,
      firstHundred,
      promoCode: promoCode || null,
      kycStatus: "not_submitted",
      subscriptionStatus: "not_started",
      agreementVersion: null,
      agreementAcceptedAt: null,
      flowStep: "created",
      invitedBy,
      invitedAt: ts(),
      created_at: ts(),
      updated_at: ts(),
    });
  } else if (existingData && firstHundred && !existingData.firstHundred) {
    // Allow upgrading to FIRST100 if they re-enter with the code.
    await db.collection("creators").doc(creatorId).update({
      firstHundred: true,
      promoCode: promoCode,
      updated_at: ts(),
    });
  }

  const effectiveEmail = (email || existingData?.email || "").toLowerCase();
  const effectiveName = name || existingData?.name || "";
  const effectiveVertical = vertical || existingData?.vertical || null;
  const effectiveFirstHundred = firstHundred || existingData?.firstHundred || false;

  if (!effectiveEmail) {
    throw new Error("initiateCreatorFlow: cannot resume — creator has no email on file");
  }

  // Magic link
  const token = crypto.randomBytes(32).toString("hex");
  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + CREATOR_MAGIC_LINK_TTL_MS);

  await db.collection("magicLinks").doc(tokenId).set({
    token,
    email: effectiveEmail,
    role: "creator",
    creatorId,
    workerId: null,
    workerSlug: null,
    createdAt: now,
    expiresAt,
    usedAt: null,
    used: false,
  });

  const baseUrl = process.env.SOCIII_APP_BASE_URL || "https://title-app-alpha.web.app";
  const magicUrl = `${baseUrl}/auth/magic?token=${token}&role=creator&creator=${encodeURIComponent(creatorId)}`;

  // Mark flow step (idempotent — set even on resume)
  await db.collection("creators").doc(creatorId).update({
    flowStep: "terms_pending",
    flowStep_terms_pending_at: ts(),
    updated_at: ts(),
  });

  // Send email
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
          subject: `Welcome to SOCIII Creators, ${(effectiveName || "").split(" ")[0] || "friend"}`,
          content: [{
            type: "text/html",
            value: _creatorInviteEmail({
              name: effectiveName,
              magicUrl,
              vertical: effectiveVertical,
              firstHundred: effectiveFirstHundred,
              whitepaperUrl: WHITEPAPER_URL,
              creatorGuideUrl: CREATOR_GUIDE_URL,
            }),
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
        console.warn(`[creatorFlow] SendGrid invite send returned ${sgResp.status}: ${errText.slice(0, 200)}`);
      }
    } else {
      console.warn("[creatorFlow] SENDGRID_API_KEY not set — invite email NOT sent. Magic link:", magicUrl);
    }
  } catch (e) {
    console.error("[creatorFlow] invite email send threw:", e.message);
  }

  await db.collection("messages").add({
    channel: "email",
    direction: "outbound",
    from: "sean@sociii.ai",
    to: effectiveEmail,
    subject: `Welcome to SOCIII Creators, ${(effectiveName || "").split(" ")[0] || "friend"}`,
    purpose: "creator_invite",
    creatorId,
    magicLinkTokenId: tokenId,
    delivered: emailQueued,
    timestamp: ts(),
  });

  // Phase 1 of workspace-at-invite architecture (2026-05-29): record the
  // pending invite so the sign-up flow can later detect it by email and
  // pre-populate the new workspace's canvas with obligation cards.
  // Non-blocking — log on failure but don't break the invite.
  try {
    const { recordPendingInvite } = require("../invites/pendingInvites");
    await recordPendingInvite({
      email: effectiveEmail,
      role: "creator",
      entityId: creatorId,
      name: effectiveName,
      invitedBy,
      context: {
        vertical: effectiveVertical,
        firstHundred: effectiveFirstHundred,
        creatorLicenseVersion: CREATOR_LICENSE_VERSION,
      },
    });
  } catch (e) {
    console.warn("[creatorFlow] pendingInvite record failed (non-blocking):", e.message);
  }

  return {
    ok: true,
    creatorId,
    magicLinkUrl: magicUrl,
    emailQueued,
    firstHundred: effectiveFirstHundred,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STATE MACHINE
// ═══════════════════════════════════════════════════════════════

async function onMagicLinkClick({ creatorId }) {
  if (!creatorId) throw new Error("onMagicLinkClick: creatorId required");
  const { data } = await _getCreator(creatorId);
  if (!data) throw new Error(`creator ${creatorId} not found`);

  const kyc = data.kycStatus || "not_submitted";
  const sub = data.subscriptionStatus || "not_started";
  const flowStep = data.flowStep || "created";

  if (flowStep === "closed" || sub === "active") {
    return { ok: true, step: "closed", creator: _publicCreator(data) };
  }
  if (sub === "pending") {
    return { ok: true, step: "subscription_pending", creator: _publicCreator(data) };
  }
  if (kyc === "approved") {
    return { ok: true, step: "identity_complete", creator: _publicCreator(data) };
  }
  if (data.agreementAcceptedAt) {
    return { ok: true, step: "identity_pending", creator: _publicCreator(data) };
  }
  return { ok: true, step: "terms_pending", creator: _publicCreator(data) };
}

function _publicCreator(d) {
  const tsToIso = (v) => (v && typeof v.toDate === "function" ? v.toDate().toISOString() : (v || null));
  return {
    creatorId: d.creatorId,
    email: d.email,
    name: d.name,
    vertical: d.vertical || null,
    firstHundred: !!d.firstHundred,
    flowStep: d.flowStep || "created",
    kycStatus: d.kycStatus || "not_submitted",
    subscriptionStatus: d.subscriptionStatus || "not_started",
    agreementVersion: d.agreementVersion || null,
    agreementAcceptedAt: tsToIso(d.agreementAcceptedAt),
    stripeIdentitySessionId: d.stripeIdentitySessionId || null,
    stripeIdentityStatus: d.stripeIdentityStatus || null,
    stripeSubscriptionId: d.stripeSubscriptionId || null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 1 — ACCEPT TERMS (CLICK-THROUGH)
// ═══════════════════════════════════════════════════════════════

async function acceptTerms({ creatorId, uid, userAgent = null, ip = null }) {
  if (!creatorId) throw new Error("acceptTerms: creatorId required");
  const { ref, data } = await _getCreator(creatorId);
  if (!data) throw new Error(`creator ${creatorId} not found`);

  await ref.set({
    agreementVersion: CREATOR_LICENSE_VERSION,
    agreementAcceptedAt: ts(),
    agreementAcceptedBy: uid || null,
    agreementUserAgent: userAgent,
    agreementIp: ip,
    flowStep: "terms_accepted",
    flowStep_terms_accepted_at: ts(),
    updated_at: ts(),
  }, { merge: true });

  return { ok: true, agreementVersion: CREATOR_LICENSE_VERSION };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 2 — STRIPE IDENTITY
// ═══════════════════════════════════════════════════════════════

async function startIdentityVerification({ creatorId, uid, returnUrl = null }) {
  const { data } = await _getCreator(creatorId);
  if (!data) throw new Error(`creator ${creatorId} not found`);

  if (!data.agreementAcceptedAt) {
    throw new Error("startIdentityVerification: terms must be accepted before identity verification");
  }

  const { createIdentitySession } = require("../identity/stripeIdentity");
  const result = await createIdentitySession({
    uid,
    creatorId,
    returnUrl,
    metadata: {
      flow: "creator",
      creatorId,
      firstHundred: String(!!data.firstHundred),
    },
  });

  await getDb().collection("creators").doc(creatorId).update({
    stripeIdentitySessionId: result.sessionId || null,
    stripeIdentityStatus: "requires_input",
    kycStatus: "submitted",
    flowStep: "identity_pending",
    flowStep_identity_pending_at: ts(),
    updated_at: ts(),
  });

  return { ok: true, identitySession: result };
}

async function syncKycFromStripe({ creatorId }) {
  const { data } = await _getCreator(creatorId);
  if (!data) throw new Error(`creator ${creatorId} not found`);

  if (!data.stripeIdentitySessionId) {
    return { ok: true, status: data.kycStatus || "not_submitted", note: "no session yet" };
  }

  const { getIdentitySession } = require("../identity/stripeIdentity");
  const session = await getIdentitySession(data.stripeIdentitySessionId);
  const stripeStatus = session?.status || "unknown";

  const newKyc = stripeStatus === "verified" ? "approved" :
                 stripeStatus === "requires_input" ? "submitted" :
                 stripeStatus === "canceled" ? "rejected" : "submitted";

  const update = {
    stripeIdentityStatus: stripeStatus,
    kycStatus: newKyc,
    updated_at: ts(),
  };

  if (newKyc === "approved" && data.flowStep !== "subscription_active" && data.flowStep !== "closed") {
    update.flowStep = "identity_complete";
    update.flowStep_identity_complete_at = ts();
  }

  await getDb().collection("creators").doc(creatorId).update(update);

  return { ok: true, status: newKyc, stripeStatus };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 3 — STRIPE SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════

async function startSubscription({ creatorId, uid, returnUrl = null }) {
  const { data } = await _getCreator(creatorId);
  if (!data) throw new Error(`creator ${creatorId} not found`);

  if (data.kycStatus !== "approved") {
    throw new Error("startSubscription: identity verification must be complete first");
  }

  // FIRST100 waives the first year — set as active immediately, mark waiver.
  if (data.firstHundred) {
    const now = new Date();
    const oneYearOut = new Date(now);
    oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

    await getDb().collection("creators").doc(creatorId).update({
      subscriptionStatus: "active",
      subscriptionWaiverApplied: "FIRST100",
      subscriptionStartedAt: ts(),
      subscriptionRenewsAt: oneYearOut.toISOString(),
      flowStep: "subscription_active",
      flowStep_subscription_active_at: ts(),
      updated_at: ts(),
    });
    return {
      ok: true,
      waiver: "FIRST100",
      subscriptionStatus: "active",
      renewsAt: oneYearOut.toISOString(),
    };
  }

  // Otherwise — kick off Stripe Checkout for $49/yr.
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    console.warn("[creatorFlow] STRIPE_SECRET_KEY not set — cannot start paid subscription");
    return { ok: false, error: "stripe_not_configured" };
  }

  const Stripe = require("stripe");
  const stripe = new Stripe(stripeSecret);

  const baseUrl = process.env.SOCIII_APP_BASE_URL || "https://title-app-alpha.web.app";
  const successUrl = returnUrl || `${baseUrl}/onboard/creator?creatorId=${encodeURIComponent(creatorId)}&checkout=success`;
  const cancelUrl = `${baseUrl}/onboard/creator?creatorId=${encodeURIComponent(creatorId)}&checkout=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: data.email,
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: "SOCIII Creator License",
          description: "Annual license to publish AI workers in the SOCIII marketplace",
        },
        unit_amount: CREATOR_LICENSE_PRICE_YEARLY_USD * 100,
        recurring: { interval: "year" },
      },
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      flow: "creator",
      creatorId,
    },
  });

  await getDb().collection("creators").doc(creatorId).update({
    subscriptionStatus: "pending",
    stripeCheckoutSessionId: session.id,
    flowStep: "subscription_pending",
    flowStep_subscription_pending_at: ts(),
    updated_at: ts(),
  });

  return { ok: true, checkoutUrl: session.url, checkoutSessionId: session.id };
}

async function onSubscriptionActivated({ creatorId, stripeSubscriptionId = null }) {
  const { ref, data } = await _getCreator(creatorId);
  if (!data) throw new Error(`creator ${creatorId} not found`);

  await ref.set({
    subscriptionStatus: "active",
    stripeSubscriptionId: stripeSubscriptionId || data.stripeSubscriptionId || null,
    subscriptionStartedAt: ts(),
    flowStep: "subscription_active",
    flowStep_subscription_active_at: ts(),
    updated_at: ts(),
  }, { merge: true });

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
//  STATUS
// ═══════════════════════════════════════════════════════════════

async function getStatus({ creatorId }) {
  const { data } = await _getCreator(creatorId);
  if (!data) return { ok: false, error: "not_found" };
  return {
    ok: true,
    creator: _publicCreator(data),
    creatorLicenseVersion: CREATOR_LICENSE_VERSION,
    priceYearlyUsd: CREATOR_LICENSE_PRICE_YEARLY_USD,
    whitepaperUrl: WHITEPAPER_URL,
    creatorGuideUrl: CREATOR_GUIDE_URL,
  };
}

// ═══════════════════════════════════════════════════════════════
//  EMAIL TEMPLATE — uses shared outreachTemplates
// ═══════════════════════════════════════════════════════════════

function _creatorInviteEmail({ name, magicUrl, vertical, firstHundred, whitepaperUrl, creatorGuideUrl }) {
  const firstName = (name || "").split(" ")[0] || "friend";
  const verticalSentence = vertical
    ? ` Your background in <strong>${vertical}</strong> is exactly the kind of domain depth the marketplace is built around.`
    : "";
  const priceSentence = firstHundred
    ? `As one of our first 100 creators, your first year is on us — the FIRST100 code is already applied to your account.`
    : `The Creator License is $${CREATOR_LICENSE_PRICE_YEARLY_USD}/year, billed annually. That covers your publishing rights, runtime allocation, and revenue-share access.`;

  const body = `
${paragraph(`${firstName},`)}

${paragraph(`Welcome to SOCIII Creators. You're being invited because the marketplace lives or dies on people like you — practitioners with twenty years of hard-won judgment in a specific domain, who can capture that judgment as a working AI worker other people can rent.${verticalSentence}`)}

${paragraph(`The economics are simple: you keep <strong>75% of every subscription</strong> to your workers and <strong>20% margin on inference</strong>. We handle the platform, payments, compliance, audit, and distribution. You bring the expertise and the worker logic. ${priceSentence}`)}

${sectionHeading("What happens next")}

${paragraph(`<strong>1. A quick click-through agreement.</strong> Open ${brandLink(magicUrl, "your private creator portal")} (valid for 7 days). The Creator License is plain-English and click-through — no Dropbox Sign, no lawyers required to read it.`)}

${paragraph(`<strong>2. A 30-second identity check.</strong> Stripe Identity verifies you are who you say you are. This keeps the marketplace KYC-clean and protects creators' revenue against impersonation. ${firstHundred ? "Your ID verification fee is also covered by FIRST100." : "The ID check has a small fee from Stripe that you cover at checkout."}`)}

${paragraph(`<strong>3. Build your first worker.</strong> Once verified, you'll have publishing rights. ${brandLink(creatorGuideUrl, "The creator guide")} walks through worker structure, RAAS rules, canvas tabs, and demo fixtures. ${brandLink(whitepaperUrl, "The SOCIII whitepaper")} is the architectural deep-dive when you want to understand why the platform is structured the way it is.`)}

${paragraph(`Reply to this email with anything — questions, pushback on terms, scheduling — and we'll move at whatever pace works for you.`)}

${signatureBlock()}
`;

  return emailFrame(body) + confidentialityFooter("general");
}

module.exports = {
  initiateCreatorFlow,
  onMagicLinkClick,
  acceptTerms,
  startIdentityVerification,
  syncKycFromStripe,
  startSubscription,
  onSubscriptionActivated,
  getStatus,
  VALID_STEPS,
  CREATOR_LICENSE_VERSION,
  CREATOR_LICENSE_PRICE_YEARLY_USD,
  FIRST_HUNDRED_PROMO_CODE,
};
