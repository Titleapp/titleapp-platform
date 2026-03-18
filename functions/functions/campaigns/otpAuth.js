/**
 * otpAuth.js — SMS OTP authentication endpoints.
 * 6-digit code, 10-min expiry, rate limit 3/hr per phone.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const PHONE_RE = /^\+[1-9]\d{1,14}$/;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SENDS_PER_HOUR = 3;
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * POST /v1/auth:sendOtp — Send a 6-digit OTP via SMS.
 */
async function sendOtp(req, res) {
  const db = getDb();
  const { phone } = req.body || {};

  if (!phone || !PHONE_RE.test(phone)) {
    return res.status(400).json({ ok: false, error: "Valid phone in E.164 format required (e.g. +15551234567)" });
  }

  // Normalize phone as doc ID (replace + with _)
  const phoneDocId = phone.replace("+", "_");
  const otpRef = db.collection("otpCodes").doc(phoneDocId);
  const otpSnap = await otpRef.get();
  const existing = otpSnap.exists ? otpSnap.data() : null;

  // Rate limit: 3 sends per hour
  if (existing && Array.isArray(existing.sendHistory)) {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentSends = existing.sendHistory.filter(ts => {
      const t = ts.toMillis ? ts.toMillis() : ts;
      return t > oneHourAgo;
    });
    if (recentSends.length >= MAX_SENDS_PER_HOUR) {
      return res.status(429).json({ ok: false, error: "Too many OTP requests. Try again in an hour." });
    }
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = Date.now();

  // Store OTP
  await otpRef.set({
    code,
    phone,
    createdAt: admin.firestore.Timestamp.fromMillis(now),
    expiresAt: admin.firestore.Timestamp.fromMillis(now + OTP_EXPIRY_MS),
    attempts: 0,
    verified: false,
    verifiedAt: null,
    sendHistory: admin.firestore.FieldValue.arrayUnion(admin.firestore.Timestamp.fromMillis(now)),
  }, { merge: true });

  // Send via Twilio
  const { sendSMSDirect } = require("../communications/twilioHelper");
  try {
    await sendSMSDirect(phone, `Your TitleApp code is: ${code}. Expires in 10 minutes.`);
  } catch (e) {
    console.error("[otpAuth] SMS send failed:", e.message);
    return res.status(500).json({ ok: false, error: "Failed to send verification code" });
  }

  return res.json({ ok: true, expiresInMinutes: 10 });
}

/**
 * POST /v1/auth:verifyOtp — Verify OTP code, return Firebase custom token.
 */
async function verifyOtp(req, res) {
  const db = getDb();
  const { phone, code } = req.body || {};

  if (!phone || !code) {
    return res.status(400).json({ ok: false, error: "phone and code required" });
  }

  const phoneDocId = phone.replace("+", "_");
  const otpRef = db.collection("otpCodes").doc(phoneDocId);
  const otpSnap = await otpRef.get();

  if (!otpSnap.exists) {
    return res.status(400).json({ ok: false, error: "No OTP found. Request a new code." });
  }

  const otpData = otpSnap.data();

  // Check expiry
  const expiresAt = otpData.expiresAt.toMillis ? otpData.expiresAt.toMillis() : otpData.expiresAt;
  if (Date.now() > expiresAt) {
    return res.status(400).json({ ok: false, error: "Code expired. Request a new one." });
  }

  // Check attempts
  if ((otpData.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    return res.status(429).json({ ok: false, error: "Too many attempts. Request a new code." });
  }

  // Check code
  if (otpData.code !== String(code).trim()) {
    await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    return res.status(400).json({ ok: false, error: "Invalid code" });
  }

  // Mark verified
  await otpRef.update({
    verified: true,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Find or create Firebase Auth user by phone
  let uid;
  try {
    const userRecord = await admin.auth().getUserByPhoneNumber(phone);
    uid = userRecord.uid;
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      const newUser = await admin.auth().createUser({ phoneNumber: phone });
      uid = newUser.uid;
      // Create user doc
      await db.collection("users").doc(uid).set({
        phone,
        tier: "free",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        authMethod: "phone",
      }, { merge: true });
    } else {
      throw e;
    }
  }

  // Create custom token
  const customToken = await admin.auth().createCustomToken(uid);

  return res.json({ ok: true, customToken, uid });
}

module.exports = { sendOtp, verifyOtp };
