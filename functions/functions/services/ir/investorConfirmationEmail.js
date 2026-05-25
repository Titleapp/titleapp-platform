"use strict";

/**
 * services/ir/investorConfirmationEmail.js — IR Phase 1
 *
 * Post-signing confirmation email. Sent after the SAFE is fully executed
 * and the document is stored in Vault.
 *
 * Phase 1 status: CODED but will bounce. SendGrid sociii.ai domain auth is
 * pending a multi-day clock. Do not block downstream pipeline on send
 * success — investor record is already marked closed at the call site.
 *
 * TODO: manual test after SendGrid domain auth completes. Confirm
 *   - PDF attachment renders (Storage signed URL)
 *   - Office hours link routes to OFFICE_HOURS_BOOKING_URL
 *   - "Q3 2026 shareholder update — date TBA" line is replaced once cal exists
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const OFFICE_HOURS_BOOKING_URL =
  process.env.OFFICE_HOURS_BOOKING_URL || "https://cal.com/sociii/office-hours";

async function _getSignedSafeUrl(safeDocumentRef) {
  if (!safeDocumentRef || !safeDocumentRef.storagePath) return null;
  try {
    const bucket = admin.storage().bucket(safeDocumentRef.bucket || undefined);
    const [url] = await bucket.file(safeDocumentRef.storagePath).getSignedUrl({
      action: "read",
      // 30 days — investor can re-download from the email link.
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    return url;
  } catch (e) {
    console.error("[investorConfirmationEmail] signed URL failed:", e.message);
    return null;
  }
}

async function sendInvestorConfirmation({ fundraiseId, investorId, requestId = null }) {
  if (!fundraiseId || !investorId) {
    throw new Error("sendInvestorConfirmation: fundraiseId and investorId required");
  }
  const db = getDb();
  const invSnap = await db.collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId).get();
  if (!invSnap.exists) {
    throw new Error(`investor ${investorId} not found`);
  }
  const investor = invSnap.data();

  const signedUrl = await _getSignedSafeUrl(investor.safeDocumentRef);

  const firstName = (investor.name || "").split(" ")[0] || "there";
  const amountStr = investor.commitment_amount
    ? `$${Number(investor.commitment_amount).toLocaleString()}`
    : "your committed amount";
  const sharesStr = investor.sharesIssued
    ? `${Number(investor.sharesIssued).toLocaleString()} shares`
    : "your shares";

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7C3AED;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">${firstName},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    Your SAFE for ${amountStr} into SOCIII pre-seed is fully executed.
    On conversion you'll receive ${sharesStr} at a $10M post-money cap.
  </p>
  ${signedUrl ? `
  <div style="margin: 24px 0;">
    <a href="${signedUrl}" style="display: inline-block; padding: 12px 28px; background: #7C3AED; color: white; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600;">
      Download your executed SAFE
    </a>
  </div>
  <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
    This download link is valid for 30 days. The document is also archived in
    your SOCIII Vault under "SAFE Agreements".
  </p>` : `
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    Your executed SAFE is archived in your SOCIII Vault under "SAFE Agreements".
  </p>`}
  <h3 style="font-size: 16px; color: #1a202c; margin-top: 32px;">What's next</h3>
  <ul style="font-size: 15px; color: #1a202c; line-height: 1.7;">
    <li>Wire instructions arrive separately within 1 business day.</li>
    <li>Office hours every week — book a slot at <a href="${OFFICE_HOURS_BOOKING_URL}" style="color: #7C3AED;">${OFFICE_HOURS_BOOKING_URL}</a>.</li>
    <li>Next shareholder update: <strong>Q3 2026 — date TBA</strong>.</li>
  </ul>
  <p style="font-size: 15px; color: #1a202c; line-height: 1.6; margin-top: 24px;">
    Thank you for backing SOCIII at this stage.
  </p>
  <p style="font-size: 15px; color: #1a202c; line-height: 1.6;">— Sean</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. | 1810 E Sahara Ave STE 75942, Las Vegas NV 89104</p>
  </div>
</div>`;

  const apiKey = process.env.SENDGRID_API_KEY;
  let delivered = false;
  if (apiKey) {
    try {
      const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: investor.email, name: investor.name }] }],
          from: { email: "sean@sociii.ai", name: "Sean Combs — SOCIII" },
          reply_to: { email: "sean@sociii.ai", name: "Sean Combs" },
          subject: "Your SOCIII SAFE is executed",
          content: [{ type: "text/html", value: htmlBody }],
        }),
      });
      delivered = resp.ok;
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.warn(`[investorConfirmationEmail] SendGrid returned ${resp.status}: ${errText.slice(0, 200)}`);
      }
    } catch (e) {
      console.error("[investorConfirmationEmail] send threw:", e.message);
    }
  } else {
    console.warn("[investorConfirmationEmail] SENDGRID_API_KEY not set — confirmation NOT sent for", investorId);
  }

  // Audit + message log regardless of delivery outcome.
  await db.collection("messages").add({
    channel: "email",
    direction: "outbound",
    from: "sean@sociii.ai",
    to: investor.email,
    subject: "Your SOCIII SAFE is executed",
    purpose: "ir_investor_confirmation",
    fundraiseId,
    investorId,
    signatureRequestId: requestId,
    delivered,
    timestamp: ts(),
  });

  return { ok: true, delivered };
}

module.exports = { sendInvestorConfirmation, OFFICE_HOURS_BOOKING_URL };
