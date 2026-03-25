"use strict";

/**
 * guestLeadRecovery.js — Cart Abandonment Recovery for Guest Leads
 *
 * Runs daily at 9 AM HST. Finds guestLeads where:
 *   - converted === false
 *   - capturedAt > 24 hours ago
 *   - recoveryEmailSent !== true
 *
 * Sends recovery email via SendGrid and marks recoveryEmailSent = true.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

async function guestLeadRecovery() {
  const db = getDb();
  const now = Date.now();
  const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

  // Query leads that haven't converted and haven't been emailed yet
  const leadsSnap = await db.collection("guestLeads")
    .where("converted", "==", false)
    .where("capturedAt", "<=", twentyFourHoursAgo)
    .limit(200)
    .get();

  if (leadsSnap.empty) {
    console.log("[guestLeadRecovery] No leads to recover");
    return { ok: true, sent: 0 };
  }

  const { sendViaSendGrid } = require("../services/marketingService/emailNotify");
  let sent = 0;
  let skipped = 0;

  for (const doc of leadsSnap.docs) {
    const lead = doc.data();

    // Skip if already sent recovery email
    if (lead.recoveryEmailSent) { skipped++; continue; }

    // Only send to emails (not phone numbers)
    const contact = (lead.contact || "").trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    if (!isEmail) { skipped++; continue; }

    const workerSlug = lead.workerSlug || "";
    const vertical = lead.vertical || "";
    const workerName = workerSlug
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase()) || "your Digital Worker";

    const recoveryUrl = `https://app.titleapp.ai/meet-alex?vertical=${encodeURIComponent(vertical)}&worker=${encodeURIComponent(workerSlug)}&utm_source=recovery&utm_medium=email`;

    try {
      await sendViaSendGrid({
        to: contact,
        subject: `Your ${workerName} session is waiting`,
        htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    You tried <strong>${workerName}</strong> on TitleApp yesterday.
  </p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    Your session is still saved. Start your 14-day free trial and pick up right where you left off.
  </p>
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    No credit card needed today.
  </p>
  <div style="margin: 32px 0;">
    <a href="${recoveryUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: white; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600;">
      Continue with ${workerName}
    </a>
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">TitleApp LLC | Your Data Is Always Yours.</p>
  </div>
</div>`,
      });

      await doc.ref.update({
        recoveryEmailSent: true,
        recoveryEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      sent++;
    } catch (err) {
      console.error(`[guestLeadRecovery] Failed to send to ${contact}:`, err.message);
    }
  }

  console.log(`[guestLeadRecovery] Done: ${sent} sent, ${skipped} skipped`);
  return { ok: true, sent, skipped };
}

module.exports = { guestLeadRecovery };
