/**
 * setupVerticalBoxProducts.js — One-time setup: creates a distinct Stripe
 * Product+Price pair per Business/Academia Stack vertical, for sales
 * reporting/management clarity (Sean, 2026-08-22) — same $99/mo base +
 * per-seat/per-student shape as the generic businessInABox/academiaInABox
 * plans, just billed under their own Product per vertical instead of one
 * shared generic Product.
 *
 * POST /setupVerticalBoxProducts with { secret: "titleapp-seed-2026" }
 * Idempotent per call — always creates fresh (no pre-check), so only run
 * once; if run twice you'll get duplicate Stripe Products. Returns the
 * created IDs so they can be hand-written into config/stripeBoxes.js.
 */

const Stripe = require("stripe");
const pricing = require("../config/pricing");

// Business-shape verticals: $99/mo base + $5/seat beyond the 5 included.
const BUSINESS_VERTICALS = [
  { key: "msr-in-a-box", name: "SOCIII MSR Business Stack", description: "Mortgage servicing compliance stack — Dana (MSR Servicing & Compliance) plus Business in a Box workers." },
  { key: "title-in-a-box", name: "SOCIII Title & Real Estate Business Stack", description: "Title search, escrow, and real estate workers plus Business in a Box." },
  { key: "dpp-in-a-box", name: "SOCIII DPP Business Stack", description: "EU Digital Product Passport compliance stack plus Business in a Box." },
  { key: "aviation-in-a-box", name: "SOCIII Aviation Business Stack", description: "Flight ops, MX, dispatch, and training workers plus Business in a Box." },
];

// Academia-shape verticals: $99/mo base + $5/student beyond the 5 included.
const ACADEMIA_VERTICALS = [
  { key: "nursing-in-a-box", name: "SOCIII Nursing Academia Stack", description: "Nursing clinical education and competency tracking plus Academia in a Box." },
  { key: "education-in-a-box", name: "SOCIII K-12 Education Academia Stack", description: "K-12 classroom AI tutoring plus Academia in a Box." },
];

async function setupVerticalBoxProducts(req, res) {
  const body = req.body || {};
  if (body.secret !== "titleapp-seed-2026") {
    return res.status(403).json({ ok: false, error: "Unauthorized" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ ok: false, error: "STRIPE_SECRET_KEY not configured" });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const results = {};

  // Idempotent by product name — a prior partial run (e.g. failed mid-way on
  // a later price) can leave an orphaned Product from an earlier vertical;
  // skip re-creating any product whose exact name already exists rather than
  // duplicating it.
  async function findExistingProduct(name) {
    const existing = await stripe.products.search({ query: `name:"${name}" AND active:"true"` });
    return existing.data[0] || null;
  }

  try {
    for (const v of BUSINESS_VERTICALS) {
      const already = await findExistingProduct(v.name);
      if (already) {
        console.warn(`[setupVerticalBoxProducts] "${v.name}" already exists (${already.id}) — skipping, resolve manually if it's an orphaned partial run`);
        results[v.key] = { productId: already.id, skipped: true };
        continue;
      }
      const product = await stripe.products.create({ name: v.name, description: v.description });
      const basePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: pricing.businessInABox.basePriceMonthly * 100,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { vertical: v.key, tier: "base" },
      });
      const seatPrice = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        recurring: { interval: "month" },
        billing_scheme: "tiered",
        tiers_mode: "graduated",
        tiers: [
          { up_to: pricing.businessInABox.includedSeats, unit_amount: 0 },
          { up_to: "inf", unit_amount: pricing.businessInABox.perActiveSeatMonthly * 100 },
        ],
        metadata: { vertical: v.key, tier: "seat" },
      });
      results[v.key] = { productId: product.id, basePriceId: basePrice.id, seatPriceId: seatPrice.id };
    }

    for (const v of ACADEMIA_VERTICALS) {
      const already = await findExistingProduct(v.name);
      if (already) {
        console.warn(`[setupVerticalBoxProducts] "${v.name}" already exists (${already.id}) — skipping, resolve manually if it's an orphaned partial run`);
        results[v.key] = { productId: already.id, skipped: true };
        continue;
      }
      const product = await stripe.products.create({ name: v.name, description: v.description });
      const basePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: pricing.education.basePriceMonthly * 100,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { vertical: v.key, tier: "base" },
      });
      const studentPrice = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        recurring: { interval: "month" },
        billing_scheme: "tiered",
        tiers_mode: "graduated",
        tiers: [
          { up_to: pricing.education.includedStudents, unit_amount: 0 },
          { up_to: "inf", unit_amount: pricing.education.perActiveStudentMonthly * 100 },
        ],
        metadata: { vertical: v.key, tier: "student" },
      });
      results[v.key] = { productId: product.id, basePriceId: basePrice.id, seatPriceId: studentPrice.id };
    }

    return res.json({ ok: true, results });
  } catch (e) {
    console.error("[setupVerticalBoxProducts] error:", e.message);
    return res.status(500).json({ ok: false, error: e.message, partialResults: results });
  }
}

module.exports = { setupVerticalBoxProducts };
