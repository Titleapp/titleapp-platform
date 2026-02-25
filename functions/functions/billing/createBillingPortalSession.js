/**
 * createBillingPortalSession.js — Returns Stripe billing portal URL.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

async function createBillingPortalSession(req, res) {
  const db = getDb();
  const stripe = getStripe();

  const { userId, returnUrl } = req.body || {};
  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }

  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const customerId = userSnap.data().stripeCustomerId;
  if (!customerId) {
    return res.status(400).json({ ok: false, error: "No Stripe customer linked" });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || "https://titleapp.ai",
  });

  return res.json({ ok: true, url: session.url });
}

module.exports = { createBillingPortalSession };
