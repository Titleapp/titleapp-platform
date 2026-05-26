/**
 * otpAuth.js — SMS OTP authentication via Twilio Verify API.
 *
 * Twilio Verify owns code generation, expiry, rate-limiting, and SMS delivery.
 * This module is responsible for:
 *   - Triggering Verify send
 *   - Confirming Verify check
 *   - Creating/finding Firebase Auth user on success
 *   - Returning a custom token the client exchanges for a session
 */

"use strict";

const admin = require("firebase-admin");
const { sendVerification, checkVerification } = require("../communications/twilioVerify");

const PHONE_RE = /^\+[1-9]\d{1,14}$/;

function getDb() { return admin.firestore(); }

/**
 * POST /v1/auth:sendOtp — Trigger Twilio Verify SMS to phone.
 */
async function sendOtp(req, res) {
  const { phone } = req.body || {};

  if (!phone || !PHONE_RE.test(phone)) {
    return res.status(400).json({ ok: false, error: "Valid phone in E.164 format required (e.g. +15551234567)" });
  }

  try {
    const result = await sendVerification(phone, "sms");
    return res.json({ ok: true, status: result.status, expiresInMinutes: 10 });
  } catch (e) {
    console.error("[otpAuth] Verify send failed:", e.message, "code=", e.code);
    // Twilio code 60200 = invalid parameter; 60203 = max send attempts reached
    if (e.code === 60203) {
      return res.status(429).json({ ok: false, error: "Too many verification attempts. Try again later." });
    }
    return res.status(500).json({ ok: false, error: "Failed to send verification code" });
  }
}

/**
 * POST /v1/auth:verifyOtp — Confirm code with Twilio Verify, mint Firebase custom token.
 */
async function verifyOtp(req, res) {
  const db = getDb();
  const body = req.body || {};
  const { phone, utmAttribution } = body;
  const code = body.code || body.otp; // frontend may send either field name

  if (!phone || !code) {
    return res.status(400).json({ ok: false, error: "phone and code required" });
  }
  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ ok: false, error: "Phone must be in E.164 format" });
  }

  // Confirm with Twilio Verify
  let verifyResult;
  try {
    verifyResult = await checkVerification(phone, code);
  } catch (e) {
    console.error("[otpAuth] Verify check failed:", e.message, "code=", e.code);
    // Twilio code 60202 = max check attempts; 20404 = not found / expired
    if (e.code === 60202) {
      return res.status(429).json({ ok: false, error: "Too many attempts. Request a new code." });
    }
    if (e.code === 20404) {
      return res.status(400).json({ ok: false, error: "Code expired or not found. Request a new one." });
    }
    return res.status(500).json({ ok: false, error: "Verification failed" });
  }

  if (verifyResult.status !== "approved" || verifyResult.valid !== true) {
    return res.status(400).json({ ok: false, error: "Invalid code" });
  }

  // Find or create Firebase Auth user by phone
  let uid;
  try {
    const userRecord = await admin.auth().getUserByPhoneNumber(phone);
    uid = userRecord.uid;
    // UTM attribution — write-once for existing users
    if (utmAttribution && (utmAttribution.source || utmAttribution.medium || utmAttribution.campaign)) {
      const existingDoc = await db.collection("users").doc(uid).get();
      if (existingDoc.exists && !existingDoc.data().utmAttribution) {
        await db.collection("users").doc(uid).update({
          utmAttribution: {
            source: utmAttribution.source || "",
            medium: utmAttribution.medium || "",
            campaign: utmAttribution.campaign || "",
            content: utmAttribution.content || "",
            capturedAt: utmAttribution.capturedAt || new Date().toISOString(),
          },
        });
      }
    }
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      const newUser = await admin.auth().createUser({ phoneNumber: phone });
      uid = newUser.uid;
      const newUserDoc = {
        phone,
        tier: "free",
        activeProfileId: "default",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        authMethod: "phone",
      };
      if (utmAttribution && (utmAttribution.source || utmAttribution.medium || utmAttribution.campaign)) {
        newUserDoc.utmAttribution = {
          source: utmAttribution.source || "",
          medium: utmAttribution.medium || "",
          campaign: utmAttribution.campaign || "",
          content: utmAttribution.content || "",
          capturedAt: utmAttribution.capturedAt || new Date().toISOString(),
        };
      }
      await db.collection("users").doc(uid).set(newUserDoc, { merge: true });

      // Auto-grant Alex entitlement — free for every user from signup
      await db.collection("users").doc(uid).collection("entitlements").doc("alex").set({
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "signup_bonus",
        version: "1.0",
      });
    } else {
      throw e;
    }
  }

  const customToken = await admin.auth().createCustomToken(uid);
  return res.json({ ok: true, customToken, uid });
}

module.exports = { sendOtp, verifyOtp };
