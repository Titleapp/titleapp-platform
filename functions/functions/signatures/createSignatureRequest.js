/**
 * createSignatureRequest.js — Generate SAFE agreement + send for signing.
 * Uses Dropbox Sign (HelloSign) API if configured, falls back to typed consent.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function createSignatureRequest(req, res) {
  const db = getDb();
  const { investorId, investorName, investorEmail, amount, returnUrl } = req.body || {};

  if (!investorId || !investorEmail || !amount) {
    return res.status(400).json({ ok: false, error: "investorId, investorEmail, and amount required" });
  }

  const hellosignKey = process.env.HELLOSIGN_API_KEY;
  const hellosignClientId = process.env.HELLOSIGN_CLIENT_ID;

  if (hellosignKey && hellosignClientId) {
    // Dropbox Sign (HelloSign) API
    try {
      const response = await fetch("https://api.hellosign.com/v3/signature_request/create_embedded", {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${hellosignKey}:`).toString("base64"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: hellosignClientId,
          title: `SAFE Agreement — ${investorName || investorEmail}`,
          subject: `TitleApp SAFE Agreement — $${Number(amount).toLocaleString()}`,
          message: `Please review and sign the SAFE agreement for your $${Number(amount).toLocaleString()} investment in TitleApp.`,
          signers: [
            {
              email_address: investorEmail,
              name: investorName || investorEmail,
              order: 0,
            },
          ],
          metadata: {
            investorId,
            amount: String(amount),
          },
          test_mode: 1, // Remove in production
        }),
      });

      const result = await response.json();

      if (result.signature_request) {
        const sigRequest = result.signature_request;
        const signatureId = sigRequest.signatures?.[0]?.signature_id;

        // Get embedded sign URL
        let signUrl = null;
        if (signatureId) {
          const embedResp = await fetch(`https://api.hellosign.com/v3/embedded/sign_url/${signatureId}`, {
            headers: {
              "Authorization": "Basic " + Buffer.from(`${hellosignKey}:`).toString("base64"),
            },
          });
          const embedResult = await embedResp.json();
          signUrl = embedResult.embedded?.sign_url;
        }

        // Update investor record
        await db.collection("pipeline").doc("investors").collection("deals").doc(investorId).update({
          stage: "SAFE_SENT",
          safeSignatureRequestId: sigRequest.signature_request_id,
          safeAmount: amount,
          safeSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await logActivity("pipeline", `SAFE sent for signing: ${investorName} ($${Number(amount).toLocaleString()})`, "success");

        return res.json({
          ok: true,
          method: "hellosign",
          signatureRequestId: sigRequest.signature_request_id,
          signUrl,
        });
      }

      throw new Error(result.error?.error_msg || "HelloSign API error");
    } catch (err) {
      console.error("HelloSign error:", err.message);
      // Fall through to typed consent
    }
  }

  // Fallback: Typed-name consent
  const consentId = `consent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await db.collection("pipeline").doc("investors").collection("deals").doc(investorId).update({
    stage: "SAFE_SENT",
    safeConsentId: consentId,
    safeAmount: amount,
    safeSentAt: admin.firestore.FieldValue.serverTimestamp(),
    safeMethod: "typed_consent",
  });

  await logActivity(
    "pipeline",
    `SAFE consent request created: ${investorName || investorEmail} ($${Number(amount).toLocaleString()}) — typed consent fallback`,
    "info"
  );

  return res.json({
    ok: true,
    method: "typed_consent",
    consentId,
    message: "Dropbox Sign not configured. Using typed-name consent fallback.",
  });
}

module.exports = { createSignatureRequest };
