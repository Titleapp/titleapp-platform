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

/**
 * Download the final signed PDF for a completed signature request.
 * Returns a Buffer or null if keys missing / request not ready.
 *
 * Uses /signature_request/files/{id}?file_type=pdf which returns the PDF
 * bytes directly when the request is completed.
 */
async function getSignedFile(signatureRequestId) {
  const keys = getKeys();
  if (!keys) return null;

  const resp = await fetch(
    `${HELLOSIGN_BASE}/signature_request/files/${signatureRequestId}?file_type=pdf`,
    { headers: { "Authorization": getAuthHeader(keys.apiKey) } }
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HelloSign getSignedFile ${resp.status}: ${text.slice(0, 200)}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  return { buffer: buf, contentType: "application/pdf" };
}

/**
 * Send a signature request using a pre-uploaded template.
 *
 * @param {object} input
 * @param {string} input.templateId       — Dropbox Sign template ID (required)
 * @param {string} input.title
 * @param {string} input.subject
 * @param {string} input.message
 * @param {Array<{role,email,name}>} input.signers
 * @param {object} input.customFields     — merge field name → value map
 * @param {object} input.metadata
 * @param {boolean} input.testMode
 *
 * Returns { signatureRequestId, signatures, signUrls } or throws.
 * Returns null only if API keys are missing (caller may fall back).
 */
async function sendWithTemplate({
  templateId,
  title,
  subject,
  message,
  signers,
  customFields,
  metadata,
  testMode,
}) {
  const keys = getKeys();
  if (!keys) return null;
  if (!templateId) throw new Error("sendWithTemplate: templateId required");

  // Dropbox Sign expects signers keyed by role name.
  const signersPayload = (signers || []).map((s) => ({
    role: s.role,
    email_address: s.email,
    name: s.name,
  }));

  // Custom fields use array form: [{ name, value, editor?, required? }]
  const customFieldsPayload = Object.entries(customFields || {}).map(([name, value]) => ({
    name,
    value: value == null ? "" : String(value),
  }));

  const requestBody = {
    template_ids: [templateId],
    title,
    subject,
    message,
    signers: signersPayload,
    custom_fields: customFieldsPayload,
    metadata: metadata || {},
    test_mode: testMode ? 1 : 0,
  };

  console.log(`[hellosign.sendWithTemplate] POST template=${templateId} test_mode=${requestBody.test_mode} signers=${signersPayload.map((s) => `${s.role}:${s.email_address}`).join(", ")}`);

  const response = await fetch(`${HELLOSIGN_BASE}/signature_request/send_with_template`, {
    method: "POST",
    headers: {
      "Authorization": getAuthHeader(keys.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();

  if (!result.signature_request) {
    const errorMsg = result.error?.error_msg || `HelloSign template send failed (${response.status})`;
    console.error(`[hellosign.sendWithTemplate] FAILED status=${response.status} error=${JSON.stringify(result.error)} fullBody=${JSON.stringify(result).slice(0, 1000)}`);
    const err = new Error(errorMsg);
    err.dropboxSignError = result.error || null;
    err.dropboxSignStatus = response.status;
    throw err;
  }
  const sigReq = result.signature_request;

  console.log(`[hellosign.sendWithTemplate] OK signatureRequestId=${sigReq.signature_request_id} signatures=${(sigReq.signatures || []).map((s) => `${s.signer_role}:${s.signer_email_address}(${s.signature_id})`).join(", ")}`);

  // Email-only flow — no embedded sign URLs. Returning an empty signUrls map
  // keeps the caller surface identical to createEmbeddedRequest().
  return {
    signatureRequestId: sigReq.signature_request_id,
    signatures: sigReq.signatures || [],
    signUrls: {},
  };
}

module.exports = {
  getKeys,
  createEmbeddedRequest,
  getEmbedSignUrl,
  cancelRequest,
  getSignedFile,
  sendWithTemplate,
};
