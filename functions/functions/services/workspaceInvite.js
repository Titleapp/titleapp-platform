/**
 * workspaceInvite.js — Workspace member invite email delivery (CODEX 50.10-T2)
 *
 * Sends a SendGrid email when a workspace admin invites a teammate. The email
 * pattern mirrors services/magicLink.js but is intentionally separate so the
 * two flows do not share state, sender identity, or template logic.
 *
 * Called from /v1/workspace:invite in functions/index.js after the invite doc
 * is created. Failures are surfaced to the caller so the admin can copy the
 * invite URL out of the response and share manually.
 */

"use strict";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

const APP_BASE_URL = "https://app.titleapp.ai";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "member") return "Member";
  if (role === "viewer") return "Viewer";
  return "Member";
}

function buildHtml({ inviterName, workspaceName, role, token }) {
  const url = `${APP_BASE_URL}/join/${token}`;
  const r = roleLabel(role);
  const i = escapeHtml(inviterName || "A teammate");
  const w = escapeHtml(workspaceName || "Workspace");
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827; max-width:560px; margin:0 auto; padding:24px;">
    <p>Hi,</p>
    <p><strong>${i}</strong> has invited you to join <strong>${w}</strong> on TitleApp as a <strong>${r}</strong>.</p>
    <p style="margin: 24px 0;">
      <a href="${url}"
         style="display:inline-block; padding:12px 24px; background:#7c3aed; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px;">
        Accept invitation
      </a>
    </p>
    <p style="color:#6b7280; font-size:14px;">Or copy this link into your browser:<br/>
      <a href="${url}" style="color:#7c3aed;">${url}</a>
    </p>
    <p style="color:#6b7280; font-size:14px;">This invitation expires in 14 days.</p>
    <p style="margin-top: 32px; color:#6b7280; font-size:14px;">— Alex<br/>TitleApp</p>
  </body>
</html>`;
}

/**
 * Send a workspace invite email.
 *
 * @param {object} args
 * @param {string} args.to — recipient email (already validated and lowercased)
 * @param {string} args.inviterName — display name of the admin who created the invite
 * @param {string} args.workspaceName — name snapshot from the tenant doc
 * @param {("admin"|"member"|"viewer")} args.role — assigned role
 * @param {string} args.token — invite token (32-char hex)
 * @returns {Promise<boolean>} true on success; throws on SendGrid failure
 */
async function sendWorkspaceInviteEmail({ to, inviterName, workspaceName, role, token }) {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured");
  }
  if (!to || !token) throw new Error("Missing required field: to or token");

  const subject = `${inviterName || "A teammate"} invited you to ${workspaceName || "a workspace"}`;
  const htmlBody = buildHtml({ inviterName, workspaceName, role, token });

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
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`SendGrid ${res.status}: ${errText.slice(0, 200)}`);
  }
  return true;
}

module.exports = { sendWorkspaceInviteEmail, APP_BASE_URL };
