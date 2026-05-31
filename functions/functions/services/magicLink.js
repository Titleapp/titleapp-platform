/**
 * magicLink.js — Magic Link Generation, Delivery & Authentication
 *
 * Subscriber sign-up flow for Worker Share landing.
 * No password, no OAuth — email-only magic link.
 *
 * Flow:
 *   1. Recipient enters email in chat → POST /v1/magic-link:send
 *   2. SendGrid delivers magic link email (15-min expiry)
 *   3. Recipient clicks link → GET /v1/magic-link:verify?token=xxx
 *   4. Token validated, Firebase Auth custom token returned, session created
 *   5. Trial starts on successful authentication
 *
 * Firestore: magicLinks/{tokenId}
 */

"use strict";

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const MAGIC_LINK_EXPIRY_MINUTES = 60;

// ═══════════════════════════════════════════════════════════════
//  EMAIL
// ═══════════════════════════════════════════════════════════════

async function sendEmail({ to, subject, htmlBody }) {
  if (!SENDGRID_API_KEY) {
    console.warn("[magicLink] SENDGRID_API_KEY not set — skipping email");
    return false;
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alex@sociii.ai", name: "SOCIII" },
      reply_to: { email: "support@sociii.ai", name: "SOCIII Support" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[magicLink] SendGrid error:", res.status, errText);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  GENERATE & SEND MAGIC LINK
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a magic link and send it to the recipient.
 * POST /v1/magic-link:send
 * Body: { email, workerId, workerSlug, workerName, creatorName }
 *
 * No auth required — this is the sign-up entry point.
 */
async function sendMagicLink(req, res) {
  const db = getDb();
  const { email, workerId, workerSlug, workerName, creatorName, preAuthUid } = req.body || {};

  if (!email) return res.status(400).json({ ok: false, error: "email required" });
  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: "Invalid email format" });
  }

  // Rate limit: max 3 magic links per email per hour
  const oneHourAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const recentLinks = await db.collection("magicLinks")
    .where("email", "==", email.toLowerCase())
    .where("createdAt", ">", oneHourAgo)
    .get();

  if (recentLinks.size >= 3) {
    return res.status(429).json({ ok: false, error: "Too many magic links sent. Please wait and try again.", code: "RATE_LIMITED" });
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000
  );

  // Store token
  await db.collection("magicLinks").doc(tokenId).set({
    token,
    email: email.toLowerCase(),
    workerId,
    workerSlug: workerSlug || null,
    workerName: workerName || null,
    creatorName: creatorName || null,
    preAuthUid: preAuthUid || null,
    createdAt: now,
    expiresAt,
    usedAt: null,
    used: false,
  });

  // Build magic link URL
  const baseUrl = "https://app.sociii.ai";
  const magicUrl = `${baseUrl}/auth/magic?token=${token}&worker=${workerSlug || workerId}`;

  // Send email
  const displayName = workerName || "your AI worker";
  const sent = await sendEmail({
    to: email,
    subject: `Here's your access to ${displayName}`,
    htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    Tap the button below to access <strong>${displayName}</strong>${creatorName ? ` from ${creatorName}` : ""}.
  </p>
  <div style="margin: 32px 0;">
    <a href="${magicUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: white; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600;">
      Open ${displayName}
    </a>
  </div>
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    This link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes and can only be used once.
  </p>
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    If you didn't request this, you can safely ignore this email.
  </p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. | Your Data Is Always Yours.</p>
  </div>
</div>`,
  });

  if (!sent) {
    // Clean up token if email failed
    await db.collection("magicLinks").doc(tokenId).delete();
    return res.status(500).json({ ok: false, error: "Failed to send magic link email" });
  }

  return res.json({
    ok: true,
    message: "Magic link sent",
    expiresInMinutes: MAGIC_LINK_EXPIRY_MINUTES,
  });
}

// ═══════════════════════════════════════════════════════════════
//  VERIFY MAGIC LINK TOKEN
// ═══════════════════════════════════════════════════════════════

/**
 * Verify a magic link token and authenticate the user.
 * POST /v1/magic-link:verify
 * Body: { token }
 *
 * Returns Firebase custom token for client-side signInWithCustomToken.
 * Creates user account if none exists.
 * Starts trial on the associated worker.
 */
async function verifyMagicLink(req, res) {
  const db = getDb();
  const { token } = req.body || {};

  if (!token) return res.status(400).json({ ok: false, error: "token required" });

  // Look up token by hash
  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const linkRef = db.collection("magicLinks").doc(tokenId);
  const linkSnap = await linkRef.get();

  if (!linkSnap.exists) {
    return res.status(404).json({ ok: false, error: "Invalid or expired link" });
  }

  const linkData = linkSnap.data();

  // Check if already used
  if (linkData.used) {
    return res.status(410).json({ ok: false, error: "This link has already been used" });
  }

  // Check expiry
  const now = Date.now();
  const expiresMs = linkData.expiresAt._seconds
    ? linkData.expiresAt._seconds * 1000
    : linkData.expiresAt.toMillis ? linkData.expiresAt.toMillis() : new Date(linkData.expiresAt).getTime();

  if (now > expiresMs) {
    return res.status(410).json({ ok: false, error: "This link has expired. Please request a new one." });
  }

  // Mark token as used
  await linkRef.update({
    used: true,
    usedAt: admin.firestore.Timestamp.now(),
  });

  const email = linkData.email;

  // Find or create Firebase Auth user
  // If preAuthUid is present (anonymous session), upgrade it instead of creating new
  let uid;
  const preAuthUid = linkData.preAuthUid || null;

  if (preAuthUid) {
    try {
      const existingUser = await admin.auth().getUser(preAuthUid);
      // Upgrade anonymous user — add email, keep same UID
      if (!existingUser.email) {
        await admin.auth().updateUser(preAuthUid, { email, emailVerified: true });
        console.log(`[magic-link:verify] Upgraded anonymous user ${preAuthUid} with email ${email}`);
      }
      uid = preAuthUid;

      // Update Firestore user doc
      await db.collection("users").doc(uid).set({
        email,
        upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "magic_link_upgrade",
        sourceWorkerId: linkData.workerId,
        sourceWorkerSlug: linkData.workerSlug || null,
      }, { merge: true });
    } catch (upgradeErr) {
      console.warn("[magic-link:verify] Could not upgrade pre-auth user, falling through:", upgradeErr.message);
      // Fall through to normal find-or-create flow
    }
  }

  if (!uid) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      uid = userRecord.uid;
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        const newUser = await admin.auth().createUser({
          email,
          emailVerified: true,
        });
        uid = newUser.uid;

        await db.collection("users").doc(uid).set({
          email,
          activeProfileId: 'default',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: "magic_link",
          sourceWorkerId: linkData.workerId,
          sourceWorkerSlug: linkData.workerSlug || null,
        }, { merge: true });
      } else {
        throw e;
      }
    }
  }

  // Start trial on the worker (skip for role-scoped magic links — e.g. IR investor
  // invites carry role + fundraiseId but no workerId).
  let trialResult = null;
  if (linkData.workerId) {
    const { startTrial } = require("./workerTrial");
    trialResult = await startTrial(uid, linkData.workerId);
  }

  // IR investor magic link: stamp the Firebase Auth uid onto the investor record
  // so downstream /v1/ir:investor:step calls can authenticate via Stripe Identity.
  if (linkData.role === "investor" && linkData.fundraiseId && linkData.investorId) {
    try {
      await db.collection("fundraises").doc(linkData.fundraiseId)
        .collection("investors").doc(linkData.investorId).set({
          uid,
          magicLinkVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    } catch (e) {
      console.error("[magic-link:verify] failed to stamp uid on investor record:", e.message);
    }
  }

  // IR advisor magic link: same pattern — stamp uid on advisor record.
  if (linkData.role === "advisor" && linkData.advisorId) {
    try {
      await db.collection("advisors").doc(linkData.advisorId).set({
        uid,
        magicLinkVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error("[magic-link:verify] failed to stamp uid on advisor record:", e.message);
    }
  }

  // Transfer guest subscriptions to real UID
  const guestId = req.body.guestId;
  let transferred = 0;
  if (guestId) {
    try {
      const guestUid = `guest-${guestId}`;
      const guestSubs = await db.collection("subscriptions")
        .where("userId", "==", guestUid)
        .where("status", "==", "active")
        .get();

      for (const subDoc of guestSubs.docs) {
        const sub = subDoc.data();
        // Check if user already has this worker
        const existing = await db.collection("subscriptions")
          .where("userId", "==", uid)
          .where("workerId", "==", sub.workerId)
          .where("status", "==", "active")
          .limit(1).get();
        if (existing.empty) {
          // Transfer subscription
          await subDoc.ref.update({ userId: uid });
          // Transfer vault entry
          const vaultSnap = await db.doc(`vaults/${guestUid}/workers/${sub.workerId}`).get();
          if (vaultSnap.exists) {
            await db.doc(`vaults/${uid}/workers/${sub.workerId}`).set(vaultSnap.data());
            await vaultSnap.ref.delete();
          }
          transferred++;
        } else {
          // Duplicate — delete guest subscription
          await subDoc.ref.delete();
          await db.doc(`vaults/${guestUid}/workers/${sub.workerId}`).delete();
        }
      }
      if (transferred > 0) {
        console.log(`[magic-link:verify] Transferred ${transferred} guest subscriptions from ${guestUid} to ${uid}`);
      }
    } catch (transferErr) {
      console.warn("[magic-link:verify] Guest subscription transfer failed:", transferErr.message);
    }
  }

  // Claim any pending invites for this email — workspace-at-invite Phase 2.
  // The pendingInvites surface keys by email; once we know the uid, link them
  // so the workspace canvas can render obligation cards on first login.
  //
  // S51.43.7 — TC-047 fix: also mint an "entitled" membership on the inviting
  // tenant so App.jsx tenant resolution lands the user in that workspace
  // (instead of their personal vault). Entitled is a limited role — they can
  // see and complete obligations, but don't get full admin/owner access.
  let claimedInvites = [];
  try {
    const {
      listPendingInvitesByEmail,
      markInviteClaimed,
    } = require("./invites/pendingInvites");
    const invites = await listPendingInvitesByEmail(email);

    // Helper: resolve the tenant a given invite belongs to by looking up the
    // associated entity (advisor / investor / warrant_holder / creator).
    // Falls back to "sociii-platform" since SOCIII is currently the only
    // tenant sending invites. When multi-tenant ships, pendingInvite itself
    // should carry tenantId; for now this lookup is honest about state.
    async function resolveInviteTenantId(invite) {
      try {
        if (invite.role === "advisor" && invite.entityId) {
          const snap = await db.collection("advisors").doc(invite.entityId).get();
          return snap.exists ? (snap.data().tenantId || "sociii-platform") : "sociii-platform";
        }
        if (invite.role === "investor" && invite.entityId && invite.context?.fundraiseId) {
          const snap = await db.collection("fundraises").doc(invite.context.fundraiseId).get();
          return snap.exists ? (snap.data().tenantId || "sociii-platform") : "sociii-platform";
        }
        if (invite.role === "warrant_holder" && invite.entityId) {
          const snap = await db.collection("warrants").doc(invite.entityId).get();
          return snap.exists ? (snap.data().tenantId || "sociii-platform") : "sociii-platform";
        }
      } catch (_) { /* fall through to default */ }
      return "sociii-platform";
    }

    // Upsert an entitled membership idempotently — skip if (uid, tenantId)
    // already exists in any role, so we never downgrade an existing admin/
    // owner to entitled.
    const grantedTenantIds = new Set();
    async function ensureEntitledMembership(tenantId) {
      if (!tenantId || grantedTenantIds.has(tenantId)) return;
      grantedTenantIds.add(tenantId);
      try {
        const existing = await db.collection("memberships")
          .where("userId", "==", uid)
          .where("tenantId", "==", tenantId)
          .where("status", "==", "active")
          .limit(1)
          .get();
        if (!existing.empty) return; // Already a member of any role — don't overwrite.
        await db.collection("memberships").add({
          userId: uid,
          tenantId,
          role: "entitled",
          status: "active",
          source: "magic_link_invite",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[magic-link:verify] minted entitled membership uid=${uid} tenantId=${tenantId}`);
      } catch (memErr) {
        console.warn(`[magic-link:verify] entitled membership write failed for ${tenantId}:`, memErr.message);
      }
    }

    for (const invite of invites) {
      try {
        const inviteTenantId = await resolveInviteTenantId(invite);
        await ensureEntitledMembership(inviteTenantId);
        await markInviteClaimed(invite.inviteId, { userId: uid, workspaceId: inviteTenantId });
        claimedInvites.push({
          inviteId: invite.inviteId,
          role: invite.role,
          entityId: invite.entityId,
          tenantId: inviteTenantId,
          worker: invite.pendingObligations?.[0]?.worker || null,
          obligationCount: (invite.pendingObligations || []).filter(o => !o.completedAt).length,
        });
      } catch (claimErr) {
        console.warn(`[magic-link:verify] could not claim invite ${invite.inviteId}:`, claimErr.message);
      }
    }
  } catch (inviteErr) {
    console.warn("[magic-link:verify] pendingInvites lookup failed:", inviteErr.message);
  }

  // Generate Firebase custom token
  const customToken = await admin.auth().createCustomToken(uid);

  return res.json({
    ok: true,
    customToken,
    uid,
    email,
    workerId: linkData.workerId,
    workerSlug: linkData.workerSlug,
    trial: trialResult,
    transferred,
    pendingInvites: claimedInvites,
  });
}

module.exports = {
  sendMagicLink,
  verifyMagicLink,
};
