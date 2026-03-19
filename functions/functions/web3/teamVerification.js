"use strict";

/**
 * teamVerification.js — Web3 Team Verification Flow
 *
 * Handles the W3-specific team verification pipeline:
 *   1. Project owner starts attestation → web3Projects/{projectId} created
 *   2. Owner submits 3 attestations → stored in Document Control
 *   3. Owner invites team members → magic link email sent
 *   4. Public team roster → verified members viewable by anyone
 *
 * Firestore:
 *   web3Projects/{projectId}
 *   web3Projects/{projectId}/teamMembers/{email-hash}
 *   documentControl/{projectId}/documents/{docId}
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function generateProjectId() {
  return "w3p_" + crypto.randomBytes(12).toString("hex");
}

function generateDocId() {
  return "dc_" + crypto.randomBytes(12).toString("hex");
}

function hashEmail(email) {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 16);
}

async function sendInviteEmail({ to, projectName, inviteUrl }) {
  if (!SENDGRID_API_KEY) {
    console.warn("[teamVerification] SENDGRID_API_KEY not set — skipping email");
    return false;
  }

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
  <div style="background: #1e1b4b; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <span style="color: #ffffff; font-size: 18px; font-weight: 600;">TitleApp</span>
  </div>
  <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 15px;">You have been invited to join the team for <strong>${projectName}</strong> on TitleApp.</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 15px;">As part of the Web3 Suite onboarding, all team members must complete identity verification.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${inviteUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">Accept Invitation</a>
    </div>
    <p style="margin: 0; color: #6b7280; font-size: 13px;">This link expires in 7 days.</p>
  </div>
  <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">TitleApp — Digital Workers for Web3</p>
</div>`.trim();

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
      reply_to: { email: "support@titleapp.ai", name: "TitleApp Support" },
      subject: `You're invited to ${projectName} on TitleApp`,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });

  if (!res.ok) {
    console.error("[teamVerification] SendGrid error:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /v1/web3:startAttestation
 * Unauthenticated — creates a new Web3 project record.
 */
async function handleStartAttestation(req, res, { body, jsonError }) {
  const { projectName, ownerEmail } = body || {};

  if (!projectName || typeof projectName !== "string" || projectName.trim().length < 2) {
    return jsonError(res, 400, "Project name is required (min 2 characters)");
  }
  if (!ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return jsonError(res, 400, "Valid email is required");
  }

  const db = getDb();
  const projectId = generateProjectId();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("web3Projects").doc(projectId).set({
    projectId,
    projectName: projectName.trim().substring(0, 200),
    ownerEmail: ownerEmail.toLowerCase().trim(),
    vertical: "web3",
    status: "attestation_pending",
    attestationCompleted: false,
    teamVerificationCompleted: false,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`[web3:startAttestation] Project created: ${projectId} for ${ownerEmail}`);

  return res.json({
    ok: true,
    projectId,
    attestationUrl: `https://titleapp.ai/web3/attest/${projectId}`,
  });
}

/**
 * POST /v1/web3:submitAttestation
 * Unauthenticated — submits the 3 required attestations.
 */
async function handleSubmitAttestation(req, res, { body, jsonError }) {
  const { projectId, attestations } = body || {};

  if (!projectId) return jsonError(res, 400, "projectId is required");
  if (!attestations || typeof attestations !== "object") {
    return jsonError(res, 400, "attestations object is required");
  }

  const { noFinancialReturns, tradingCardsNotInvestments, legalCounselReviewed } = attestations;

  if (noFinancialReturns !== true) {
    return jsonError(res, 400, "Must attest: noFinancialReturns");
  }
  if (tradingCardsNotInvestments !== true) {
    return jsonError(res, 400, "Must attest: tradingCardsNotInvestments");
  }
  if (legalCounselReviewed !== true) {
    return jsonError(res, 400, "Must attest: legalCounselReviewed");
  }

  const db = getDb();
  const projectRef = db.collection("web3Projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    return jsonError(res, 404, "Project not found");
  }

  const project = projectSnap.data();
  if (project.attestationCompleted) {
    return res.json({ ok: true, message: "Attestation already completed", nextStep: "identity_verification" });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const docId = generateDocId();

  // Store attestation in Document Control
  await db.collection("documentControl").doc(projectId)
    .collection("documents").doc(docId).set({
      docId,
      projectId,
      docType: "ProjectAttestation",
      fileName: "web3_project_attestation.json",
      status: "active",
      attestations: {
        noFinancialReturns: true,
        tradingCardsNotInvestments: true,
        legalCounselReviewed: true,
      },
      attestedBy: project.ownerEmail,
      attestedAt: admin.firestore.Timestamp.now(),
      blockchainEnabled: true,
      createdAt: now,
      updatedAt: now,
    });

  // Update project status
  await projectRef.update({
    status: "attestation_completed",
    attestationCompleted: true,
    attestationDocId: docId,
    attestedAt: now,
    updatedAt: now,
  });

  console.log(`[web3:submitAttestation] Attestation completed for project ${projectId}`);

  return res.json({
    ok: true,
    docId,
    nextStep: "identity_verification",
  });
}

/**
 * POST /v1/web3:inviteTeamMember
 * Authenticated — project owner invites a team member.
 */
async function handleInviteTeamMember(req, res, { body, user, jsonError }) {
  const { projectId, email, role } = body || {};

  if (!projectId) return jsonError(res, 400, "projectId is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError(res, 400, "Valid team member email is required");
  }
  if (!role || typeof role !== "string") {
    return jsonError(res, 400, "Role is required");
  }

  const db = getDb();
  const projectRef = db.collection("web3Projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    return jsonError(res, 404, "Project not found");
  }

  const project = projectSnap.data();

  // Verify caller is project owner (match by email from Firebase Auth)
  const callerEmail = (user.email || "").toLowerCase().trim();
  if (callerEmail !== project.ownerEmail) {
    return jsonError(res, 403, "Only the project owner can invite team members");
  }

  if (!project.attestationCompleted) {
    return jsonError(res, 400, "Project attestation must be completed before inviting team members");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailHash = hashEmail(normalizedEmail);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const inviteId = "inv_" + crypto.randomBytes(8).toString("hex");

  // Create team member record
  await projectRef.collection("teamMembers").doc(emailHash).set({
    email: normalizedEmail,
    role: role.trim().substring(0, 100),
    inviteId,
    verificationStatus: "invited",
    invitedAt: now,
    invitedBy: user.uid,
    verifiedAt: null,
    jurisdiction: null,
    updatedAt: now,
  }, { merge: true });

  // Send invite email
  const inviteUrl = `https://titleapp.ai/web3/join/${projectId}?invite=${inviteId}`;
  await sendInviteEmail({
    to: normalizedEmail,
    projectName: project.projectName,
    inviteUrl,
  });

  console.log(`[web3:inviteTeamMember] Invited ${normalizedEmail} to project ${projectId} as ${role}`);

  return res.json({ ok: true, inviteId });
}

/**
 * GET /v1/web3:teamRoster?projectId={id}
 * Public — returns verified team members only.
 */
async function handleTeamRoster(req, res, { jsonError }) {
  const projectId = (req.query || {}).projectId || "";

  if (!projectId) return jsonError(res, 400, "projectId query parameter is required");

  const db = getDb();
  const projectRef = db.collection("web3Projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    return jsonError(res, 404, "Project not found");
  }

  const project = projectSnap.data();

  // Only return verified team members
  const membersSnap = await projectRef.collection("teamMembers")
    .where("verificationStatus", "==", "verified")
    .get();

  const members = membersSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      name: d.displayName || null,
      role: d.role || null,
      verificationDate: d.verifiedAt ? d.verifiedAt.toDate().toISOString() : null,
      jurisdiction: d.jurisdiction || null,
    };
  });

  return res.json({
    ok: true,
    projectName: project.projectName,
    attestationCompleted: project.attestationCompleted || false,
    teamMembers: members,
  });
}

module.exports = {
  handleStartAttestation,
  handleSubmitAttestation,
  handleInviteTeamMember,
  handleTeamRoster,
};
