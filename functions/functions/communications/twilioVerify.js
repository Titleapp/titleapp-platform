/**
 * twilioVerify.js — Wrapper around Twilio Verify API.
 *
 * Uses Twilio's managed verification service. No toll-free number required,
 * no A2P 10DLC, no Trust Hub dependency. Twilio handles SMS delivery from
 * their own number pool. ~$0.05 per verification.
 *
 * Reads:
 *   TWILIO_ACCOUNT_SID         — AC...
 *   TWILIO_AUTH_TOKEN          — secret
 *   TWILIO_VERIFY_SERVICE_SID  — VA...
 */

"use strict";

const VERIFY_BASE = "https://verify.twilio.com/v2";

function getAuth() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !serviceSid) {
    throw new Error("Twilio Verify not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID)");
  }
  return {
    sid,
    serviceSid,
    basic: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
  };
}

async function sendVerification(phone, channel = "sms") {
  const { serviceSid, basic } = getAuth();
  const url = `${VERIFY_BASE}/Services/${serviceSid}/Verifications`;
  const params = new URLSearchParams({ To: phone, Channel: channel });
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: basic, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || `Twilio Verify send failed (${res.status})`);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data; // { sid, status: 'pending', to, channel, ... }
}

async function checkVerification(phone, code) {
  const { serviceSid, basic } = getAuth();
  const url = `${VERIFY_BASE}/Services/${serviceSid}/VerificationCheck`;
  const params = new URLSearchParams({ To: phone, Code: String(code) });
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: basic, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || `Twilio Verify check failed (${res.status})`);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data; // { sid, status: 'approved'|'pending'|'canceled', valid: bool, ... }
}

module.exports = { sendVerification, checkVerification };
