/**
 * setupStripeProducts.js — One-time setup: creates Stripe products/prices
 * and stores IDs in Firestore config/stripe.
 *
 * POST /setupStripeProducts with { secret: "titleapp-seed-2026" }
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");

async function setupStripeProducts(req, res) {
  const body = req.body || {};
  if (body.secret !== "titleapp-seed-2026") {
    return res.status(403).json({ ok: false, error: "Unauthorized" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ ok: false, error: "STRIPE_SECRET_KEY not configured" });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const db = admin.firestore();

  // Check if already configured
  const existingConfig = await db.collection("config").doc("stripe").get();
  if (existingConfig.exists && existingConfig.data().products) {
    return res.json({
      ok: true,
      message: "Stripe products already configured",
      config: existingConfig.data(),
    });
  }

  // Create products
  const workspacePro = await stripe.products.create({
    name: "TitleApp Pro Workspace",
    description: "Full workspace with enforcement engine, audit trail, and marketplace publishing.",
  });

  const workspaceEnterprise = await stripe.products.create({
    name: "TitleApp Enterprise Workspace",
    description: "Enterprise workspace with dedicated support, SLA, and custom rules.",
  });

  const usageCredits = await stripe.products.create({
    name: "TitleApp AI Credits",
    description: "AI usage credits for TitleApp platform.",
  });

  // Create prices
  const proMonthly = await stripe.prices.create({
    product: workspacePro.id,
    unit_amount: 900, // $9.00
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "pro", billing: "monthly" },
  });

  const proAnnual = await stripe.prices.create({
    product: workspacePro.id,
    unit_amount: 8100, // $81.00 (25% discount)
    currency: "usd",
    recurring: { interval: "year" },
    metadata: { tier: "pro", billing: "annual" },
  });

  const enterpriseMonthly = await stripe.prices.create({
    product: workspaceEnterprise.id,
    unit_amount: 29900, // $299.00
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "enterprise", billing: "monthly" },
  });

  const usageMetered = await stripe.prices.create({
    product: usageCredits.id,
    unit_amount: 1, // $0.01
    currency: "usd",
    recurring: { interval: "month", usage_type: "metered" },
    metadata: { type: "overage" },
  });

  const creditPack500 = await stripe.prices.create({
    product: usageCredits.id,
    unit_amount: 500, // $5.00
    currency: "usd",
    metadata: { type: "credit_pack", credits: "500" },
  });

  const creditPack2000 = await stripe.prices.create({
    product: usageCredits.id,
    unit_amount: 1500, // $15.00 (25% bonus)
    currency: "usd",
    metadata: { type: "credit_pack", credits: "2000" },
  });

  const creditPack10000 = await stripe.prices.create({
    product: usageCredits.id,
    unit_amount: 5000, // $50.00 (50% bonus)
    currency: "usd",
    metadata: { type: "credit_pack", credits: "10000" },
  });

  // Store config in Firestore
  const config = {
    products: {
      workspacePro: workspacePro.id,
      workspaceEnterprise: workspaceEnterprise.id,
      usageCredits: usageCredits.id,
    },
    prices: {
      proMonthly: proMonthly.id,
      proAnnual: proAnnual.id,
      enterpriseMonthly: enterpriseMonthly.id,
      usageMetered: usageMetered.id,
      creditPack500: creditPack500.id,
      creditPack2000: creditPack2000.id,
      creditPack10000: creditPack10000.id,
    },
    tiers: {
      free: {
        name: "Free",
        monthlyCredits: 50,
        maxWorkers: 1,
        features: ["basic_workspace", "marketplace_browse"],
      },
      pro: {
        name: "Pro",
        monthlyCredits: 500,
        maxWorkers: 10,
        features: [
          "full_workspace",
          "enforcement_engine",
          "audit_trail",
          "marketplace_publish",
        ],
      },
      enterprise: {
        name: "Enterprise",
        monthlyCredits: 10000,
        maxWorkers: -1,
        features: [
          "everything",
          "dedicated_support",
          "sla",
          "custom_rules",
          "api_access",
        ],
      },
    },
    usage: {
      overageRate: 0.01,
      hardCapMultiplier: 5,
      warningThreshold: 0.8,
    },
    connect: {
      platformFeePercent: 25,
      creatorPayoutSchedule: "weekly",
      payoutDelay: 7,
    },
    createdAt: new Date().toISOString(),
  };

  await db.collection("config").doc("stripe").set(config);

  return res.json({ ok: true, config });
}

module.exports = { setupStripeProducts };
