/**
 * createConnectAccount.js — Creator Stripe Connect Express onboarding.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

async function createConnectAccount(req, res) {
  const db = getDb();
  const stripe = getStripe();

  const { userId, email, returnUrl, refreshUrl } = req.body || {};
  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
  const userData = userSnap.data();

  // Check if already has Connect account
  if (userData.stripeConnectAccountId) {
    // Generate new account link for existing account
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeConnectAccountId,
      refresh_url: refreshUrl || "https://titleapp.ai?connect=refresh",
      return_url: returnUrl || "https://titleapp.ai?connect=success",
      type: "account_onboarding",
    });
    return res.json({
      ok: true,
      accountId: userData.stripeConnectAccountId,
      onboardingUrl: accountLink.url,
      existing: true,
    });
  }

  // Create Express Connect account
  const account = await stripe.accounts.create({
    type: "express",
    email: email || userData.email,
    metadata: { userId },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: { interval: "weekly", weekly_anchor: "friday" },
      },
    },
  });

  // Store on user doc
  await userRef.set(
    { stripeConnectAccountId: account.id },
    { merge: true }
  );

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: refreshUrl || "https://titleapp.ai?connect=refresh",
    return_url: returnUrl || "https://titleapp.ai?connect=success",
    type: "account_onboarding",
  });

  await logActivity(
    "system",
    `Creator Connect account created: ${userData.email}`,
    "info",
    { userId, accountId: account.id }
  );

  return res.json({
    ok: true,
    accountId: account.id,
    onboardingUrl: accountLink.url,
  });
}

module.exports = { createConnectAccount };
