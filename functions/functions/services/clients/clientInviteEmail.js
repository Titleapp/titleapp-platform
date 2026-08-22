"use strict";

/**
 * clientInviteEmail.js — Client portal invite email delivery (CODEX S52.61)
 *
 * Mirrors services/workspaceInvite.js's SendGrid pattern exactly, but kept
 * separate: a client is not a workspace teammate (no admin/member/viewer
 * role choice, scoped to specific worker portal access instead), and this
 * lands on /join-client/:token rather than /join/:token so the frontend can
 * route it to the client-onboarding signup flow instead of the teammate one.
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const APP_BASE_URL = "https://app.sociii.ai";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml({ inviterName, workspaceName, token }) {
  const url = `${APP_BASE_URL}/join-client/${token}`;
  const i = escapeHtml(inviterName || "Your onboarding contact");
  const w = escapeHtml(workspaceName || "Workspace");
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827; max-width:560px; margin:0 auto; padding:24px;">
    <p>Hi,</p>
    <p><strong>${i}</strong> has invited you to set up your client portal with <strong>${w}</strong>.</p>
    <p style="margin: 24px 0;">
      <a href="${url}"
         style="display:inline-block; padding:12px 24px; background:#7c3aed; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px;">
        Set up my portal access
      </a>
    </p>
    <p style="color:#6b7280; font-size:14px;">Or copy this link into your browser:<br/>
      <a href="${url}" style="color:#7c3aed;">${url}</a>
    </p>
    <p style="color:#6b7280; font-size:14px;">This invitation expires in 30 days. If you also received a separate document to review and sign, that's a required part of onboarding — please complete both.</p>
    <p style="margin-top: 32px; color:#6b7280; font-size:14px;">— Alex<br/>SOCIII</p>
  </body>
</html>`;
}

/**
 * @param {object} args
 * @param {string} args.to
 * @param {string} args.inviterName
 * @param {string} args.workspaceName
 * @param {string} args.token
 */
async function sendClientPortalInviteEmail({ to, inviterName, workspaceName, token }) {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured");
  }
  if (!to || !token) throw new Error("Missing required field: to or token");

  const subject = `${inviterName || "Your onboarding contact"} invited you to ${workspaceName || "your client portal"}`;
  const htmlBody = buildHtml({ inviterName, workspaceName, token });

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alex@sociii.ai", name: "Alex — SOCIII" },
      reply_to: { email: "support@sociii.ai", name: "SOCIII Support" },
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

module.exports = { sendClientPortalInviteEmail, APP_BASE_URL };
