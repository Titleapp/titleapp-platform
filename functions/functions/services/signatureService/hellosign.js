// services/signatureService/hellosign.js
// Generalized HelloSign (Dropbox Sign) API wrapper.
// Extracted from signatures/createSignatureRequest.js.
// Uses raw fetch() with Basic Auth — no SDK dependency.

const HELLOSIGN_BASE = "https://api.hellosign.com/v3";

/**
 * Return API keys from environment, or null if not configured.
 * Callers fall back to typed consent when null.
 */
function getKeys() {
  const apiKey = process.env.HELLOSIGN_API_KEY;
  const clientId = process.env.HELLOSIGN_CLIENT_ID;
  if (!apiKey || !clientId) return null;
  return { apiKey, clientId };
}

function getAuthHeader(apiKey) {
  return "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
}

/**
 * Create an embedded signature request via HelloSign API.
 * Returns { signatureRequestId, signatures, signUrls } or null if keys missing.
 */
async function createEmbeddedRequest({ title, subject, message, signers, metadata, testMode }) {
  const keys = getKeys();
  if (!keys) return null; // Caller falls back to typed consent

  const response = await fetch(`${HELLOSIGN_BASE}/signature_request/create_embedded`, {
    method: "POST",
    headers: {
      "Authorization": getAuthHeader(keys.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: keys.clientId,
      title,
      subject,
      message,
      signers: signers.map((s, i) => ({
        email_address: s.email,
        name: s.name,
        order: s.order != null ? s.order : i,
      })),
      metadata: metadata || {},
      test_mode: testMode ? 1 : 0,
    }),
  });

  const result = await response.json();
  if (!result.signature_request) {
    throw new Error(result.error?.error_msg || "HelloSign API error");
  }

  const sigReq = result.signature_request;

  // Get embedded sign URLs for each signer
  const signUrls = {};
  for (const sig of sigReq.signatures || []) {
    const embedResp = await fetch(`${HELLOSIGN_BASE}/embedded/sign_url/${sig.signature_id}`, {
      headers: { "Authorization": getAuthHeader(keys.apiKey) },
    });
    const embedResult = await embedResp.json();
    signUrls[sig.signer_email_address] = embedResult.embedded?.sign_url || null;
  }

  return {
    signatureRequestId: sigReq.signature_request_id,
    signatures: sigReq.signatures || [],
    signUrls,
  };
}

/**
 * Get an embedded sign URL for a specific signature ID.
 * Returns the URL string or null.
 */
async function getEmbedSignUrl(signatureId) {
  const keys = getKeys();
  if (!keys) return null;

  const resp = await fetch(`${HELLOSIGN_BASE}/embedded/sign_url/${signatureId}`, {
    headers: { "Authorization": getAuthHeader(keys.apiKey) },
  });
  const result = await resp.json();
  return result.embedded?.sign_url || null;
}

/**
 * Cancel a signature request.
 */
async function cancelRequest(signatureRequestId) {
  const keys = getKeys();
  if (!keys) return null;

  await fetch(`${HELLOSIGN_BASE}/signature_request/cancel/${signatureRequestId}`, {
    method: "POST",
    headers: { "Authorization": getAuthHeader(keys.apiKey) },
  });
  return { ok: true };
}

module.exports = {
  getKeys,
  createEmbeddedRequest,
  getEmbedSignUrl,
  cancelRequest,
};
