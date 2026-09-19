"use strict";

// Per-client sending-domain authentication (SPF/DKIM) — CODEX 94 §3.6.
//
// Real gap this fixes: sendMarketingEmail() (marketingCampaigns.js) defaults
// to sending from alex@sociii.ai unless a caller overrides fromEmail. For a
// real client (e.g. Attorneys Title), referral-partner emails need to look
// like they're from the client's own business, not SOCIII's assistant — and
// sending from an arbitrary custom address that isn't authenticated in
// SendGrid gets flagged as spoofed by receiving mail servers. This is the
// real fix: SendGrid's own Domain Authentication API generates the actual
// DNS records (CNAMEs for SPF + two DKIM selectors) the client needs to add
// to their own domain's DNS before SOCIII can legitimately send as them.
//
// Real SendGrid endpoints (confirmed against Twilio/SendGrid's own API docs
// 2026-09-19, not assumed):
//   POST   /v3/whitelabel/domains            — create + get DNS records back
//   POST   /v3/whitelabel/domains/{id}/validate — check if DNS records are live

const admin = require("firebase-admin");
function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_BASE = "https://api.sendgrid.com/v3";

async function sgFetch(path, method, body) {
  if (!SENDGRID_API_KEY) throw new Error("SendGrid API key not configured");
  const resp = await fetch(`${SENDGRID_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.errors?.[0]?.message || `SendGrid HTTP ${resp.status}`);
  }
  return data;
}

/**
 * Start domain authentication for a tenant's own sending domain.
 * Stores the SendGrid domain id + returned DNS records on the tenant so
 * status can be checked later without re-calling SendGrid. Idempotent-ish:
 * calling again for the same domain creates a new SendGrid domain record
 * (SendGrid doesn't offer a clean upsert here) — callers should check
 * getDomainAuthStatus() first and only call this once per real domain.
 *
 * @param {string} tenantId
 * @param {string} domain - e.g. "attorneystitleathens.com" (no protocol, no subdomain path)
 * @returns {Promise<{ok:boolean, dnsRecords?:Array<{type:string,host:string,data:string}>, sendgridDomainId?:number, error?:string}>}
 */
async function startDomainAuthentication(tenantId, domain) {
  if (!tenantId) return { ok: false, error: "Missing tenantId" };
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return { ok: false, error: "Missing or invalid domain" };
  }

  let result;
  try {
    result = await sgFetch("/whitelabel/domains", "POST", {
      domain,
      automatic_security: true, // let SendGrid manage SPF too — simpler DNS instructions for a non-technical client
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }

  const dns = result.dns || {};
  const dnsRecords = Object.values(dns)
    .filter(r => r && r.host && r.data)
    .map(r => ({ type: (r.type || "CNAME").toUpperCase(), host: r.host, data: r.data }));

  await getDb().doc(`tenants/${tenantId}`).set({
    emailSendingDomain: {
      domain,
      sendgridDomainId: result.id,
      dnsRecords,
      verified: !!result.valid,
      status: "pending_dns",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  return { ok: true, dnsRecords, sendgridDomainId: result.id };
}

/**
 * Re-check whether a tenant's DNS records have actually propagated and
 * SendGrid considers the domain verified. Call this after the client says
 * they've added the DNS records — don't poll automatically, this is a
 * human-initiated "check now" action.
 *
 * @param {string} tenantId
 * @returns {Promise<{ok:boolean, verified?:boolean, error?:string}>}
 */
async function checkDomainAuthentication(tenantId) {
  const tenantSnap = await getDb().doc(`tenants/${tenantId}`).get();
  const record = tenantSnap.data()?.emailSendingDomain;
  if (!record?.sendgridDomainId) return { ok: false, error: "No domain authentication started for this tenant yet" };

  let result;
  try {
    result = await sgFetch(`/whitelabel/domains/${record.sendgridDomainId}/validate`, "POST");
  } catch (err) {
    return { ok: false, error: err.message };
  }

  const verified = !!(result.valid ?? result.validation_results?.mail_cname?.valid);
  await getDb().doc(`tenants/${tenantId}`).set({
    emailSendingDomain: { verified, status: verified ? "verified" : "pending_dns" },
  }, { merge: true });

  return { ok: true, verified };
}

/**
 * The real fix for sendMarketingEmail()'s alex@sociii.ai default — returns
 * a client-domain from/reply-to pair if the tenant has a VERIFIED
 * authenticated domain, or null if not (caller should fall back to the
 * existing alex@sociii.ai default, not fail).
 *
 * @param {string} tenantId
 * @param {string} [localPart] - defaults to "hello"
 * @returns {Promise<{fromEmail:string, fromName:string} | null>}
 */
async function getVerifiedSendingIdentity(tenantId, localPart = "hello") {
  const tenantSnap = await getDb().doc(`tenants/${tenantId}`).get();
  const data = tenantSnap.data();
  const record = data?.emailSendingDomain;
  if (!record?.verified || !record.domain) return null;
  return { fromEmail: `${localPart}@${record.domain}`, fromName: data.name || data.workspaceName || record.domain };
}

module.exports = { startDomainAuthentication, checkDomainAuthentication, getVerifiedSendingIdentity };
