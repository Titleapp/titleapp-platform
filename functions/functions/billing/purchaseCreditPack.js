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

  const { userId, credits, successUrl, cancelUrl, tenantId } = req.body || {};
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

  // 49.32 — tenant-pool top-up. When tenantId is provided AND caller is admin
  // of that tenant, charge the tenant's Stripe customer and credit the tenant pool.
  // Otherwise fall through to the user-pool flow.
  const tenantCtx = tenantId && tenantId !== "vault" && tenantId !== "personal" && !String(tenantId).startsWith("guest-") ? tenantId : null;
  if (tenantCtx) {
    try {
      const { enforceRoleGate } = require("../middleware/membershipCheck");
      const gate = await enforceRoleGate(userId, tenantCtx, "admin");
      if (!gate.ok) {
        return res.status(403).json({ ok: false, error: "tenant_admin_required", currentRole: gate.role });
      }
    } catch (gateErr) {
      console.warn("[purchaseCreditPack] role gate failed:", gateErr.message);
      return res.status(500).json({ ok: false, error: "Role check failed" });
    }

    const tenantSnap = await db.collection("tenants").doc(tenantCtx).get();
    const tenantData = tenantSnap.exists ? tenantSnap.data() : {};
    let customerId = tenantData.stripeCustomerId;

    // Verify the stored tenant customer still exists in the current Stripe mode.
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (verifyErr) {
        if (verifyErr.code === "resource_missing") {
          console.warn(`[purchaseCreditPack] tenant stripe customer ${customerId} not found in current mode, recreating`);
          customerId = null;
        } else {
          throw verifyErr;
        }
      }
    }

    if (!customerId) {
      // Fresh tenant Stripe customer per Q1 decision (CODEX 49.32).
      const userSnap = await db.collection("users").doc(userId).get();
      const adminEmail = userSnap.exists ? (userSnap.data().email || tenantData.billingEmail || "") : (tenantData.billingEmail || "");
      const customer = await stripe.customers.create({
        email: adminEmail,
        name: tenantData.name || `Workspace ${tenantCtx}`,
        metadata: { tenantId: tenantCtx, billingAdminUid: userId },
      });
      customerId = customer.id;
      await db.collection("tenants").doc(tenantCtx).set(
        { stripeCustomerId: customerId, billingAdminUid: userId, billingEmail: adminEmail, billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, tenantId: tenantCtx, credits: String(credits), type: "credit_pack", scope: "tenant" },
      success_url: successUrl || "https://sociii.ai?credits=success",
      cancel_url: cancelUrl || "https://sociii.ai?credits=cancel",
    });
    return res.json({ ok: true, checkoutUrl: session.url, sessionId: session.id, scope: "tenant" });
  }

  // Personal Vault path — original flow.
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
  const userData = userSnap.data();
  let customerId = userData.stripeCustomerId;

  // Verify the stored customer still exists in the current Stripe mode.
  // When the deployment toggles between live and sandbox (or keys rotate),
  // a customer created in the other mode returns resource_missing. Recreate
  // transparently rather than 500-ing the user.
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch (verifyErr) {
      if (verifyErr.code === "resource_missing") {
        console.warn(`[purchaseCreditPack] stripe customer ${customerId} not found in current mode, recreating`);
        customerId = null;
      } else {
        throw verifyErr;
      }
    }
  }

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
    metadata: { userId, credits: String(credits), type: "credit_pack", scope: "user" },
    success_url: successUrl || "https://sociii.ai?credits=success",
    cancel_url: cancelUrl || "https://sociii.ai?credits=cancel",
  });

  return res.json({ ok: true, checkoutUrl: session.url, sessionId: session.id, scope: "user" });
}

module.exports = { purchaseCreditPack };
