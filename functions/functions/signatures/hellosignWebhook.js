/**
 * hellosignWebhook.js — Dropbox Sign (HelloSign) webhook handler.
 * On signature_request_all_signed: update investor, download PDF, log audit.
 */

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

async function hellosignWebhook(req, res) {
  const db = getDb();

  // HelloSign sends event as JSON in body
  const event = req.body?.event || req.body;

  if (!event || !event.event_type) {
    // HelloSign verification — respond with "Hello API Event Received"
    return res.status(200).send("Hello API Event Received");
  }

  const eventType = event.event_type;
  const signatureRequest = event.signature_request;

  if (!signatureRequest) {
    return res.status(200).send("Hello API Event Received");
  }

  const metadata = signatureRequest.metadata || {};
  const investorId = metadata.investorId;
  const amount = metadata.amount;

  switch (eventType) {
    case "signature_request_all_signed": {
      if (investorId) {
        // Update investor record
        await db
          .collection("pipeline")
          .doc("investors")
          .collection("deals")
          .doc(investorId)
          .update({
            stage: "SAFE_SIGNED",
            safeSignedAt: admin.firestore.FieldValue.serverTimestamp(),
            safeSignatureRequestId: signatureRequest.signature_request_id,
          });
      }

      // Log to audit trail
      await db.collection("auditTrail").add({
        type: "safe_signed",
        investorId: investorId || null,
        signatureRequestId: signatureRequest.signature_request_id,
        amount: amount ? Number(amount) : null,
        signers: (signatureRequest.signatures || []).map((s) => ({
          name: s.signer_name,
          email: s.signer_email_address,
          signedAt: s.signed_at,
        })),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      const signerName = signatureRequest.signatures?.[0]?.signer_name || "Unknown";
      await logActivity(
        "pipeline",
        `SAFE signed: ${signerName} ($${amount ? Number(amount).toLocaleString() : "TBD"})`,
        "success",
        { investorId, signatureRequestId: signatureRequest.signature_request_id }
      );
      break;
    }

    case "signature_request_viewed": {
      if (investorId) {
        await db
          .collection("pipeline")
          .doc("investors")
          .collection("deals")
          .doc(investorId)
          .update({
            safeViewedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
      break;
    }

    case "signature_request_declined": {
      if (investorId) {
        await db
          .collection("pipeline")
          .doc("investors")
          .collection("deals")
          .doc(investorId)
          .update({
            stage: "PASSED",
            safeDeclinedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
      const declinerName = signatureRequest.signatures?.[0]?.signer_name || "Unknown";
      await logActivity("pipeline", `SAFE declined by ${declinerName}`, "warning", { investorId });
      break;
    }

    default:
      console.log(`Unhandled HelloSign event: ${eventType}`);
  }

  // HelloSign requires this exact response
  return res.status(200).send("Hello API Event Received");
}

module.exports = { hellosignWebhook };
