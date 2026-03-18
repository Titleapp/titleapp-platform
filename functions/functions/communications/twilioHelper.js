/**
 * twilioHelper.js — Shared Twilio SMS send function.
 * Pure send — no req/res, no Firestore logging.
 * Used by sendSMS.js, otpAuth.js, and messageProcessor.js.
 */

"use strict";

async function sendSMSDirect(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio not configured");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "SMS send failed");
  }
  return result;
}

module.exports = { sendSMSDirect };
