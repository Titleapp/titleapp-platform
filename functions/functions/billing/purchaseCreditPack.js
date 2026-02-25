/**
 * purchaseCreditPack.js — One-time purchase of AI credit packs via Stripe Checkout.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

const PACK_MAP = {
  500: "creditPack500",
  2000: "creditPack2000",
  10000: "creditPack10000",
};

async function purchaseCreditPack(req, res) {
  const db = getDb();
  const stripe = getStripe();

  const { userId, credits, successUrl, cancelUrl } = req.body || {};
  if (!userId || !credits) {
    return res.status(400).json({ ok: false, error: "userId and credits required" });
  }

  const packKey = PACK_MAP[credits];
  if (!packKey) {
    return res.status(400).json({ ok: false, error: "Invalid credit pack. Choose 500, 2000, or 10000." });
  }

  // Get price ID from config
  const configSnap = await db.collection("config").doc("stripe").get();
  const config = configSnap.exists ? configSnap.data() : {};
  const priceId = config.prices?.[packKey];
  if (!priceId) {
    return res.status(500).json({ ok: false, error: "Credit pack price not configured" });
  }

  // Get or create Stripe customer
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
  const userData = userSnap.data();
  let customerId = userData.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email,
      metadata: { userId },
    });
    customerId = customer.id;
    await db.collection("users").doc(userId).set(
      { stripeCustomerId: customerId },
      { merge: true }
    );
  }

  // Create Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, credits: String(credits), type: "credit_pack" },
    success_url: successUrl || "https://titleapp.ai?credits=success",
    cancel_url: cancelUrl || "https://titleapp.ai?credits=cancel",
  });

  return res.json({ ok: true, checkoutUrl: session.url, sessionId: session.id });
}

module.exports = { purchaseCreditPack };
