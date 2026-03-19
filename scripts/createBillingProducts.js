#!/usr/bin/env node
/**
 * createBillingProducts.js — One-time Stripe product + price creation.
 *
 * Creates 5 billing products:
 *   1. Signature Overage ($1.00/unit)
 *   2. Blockchain Record Overage ($1.00/unit)
 *   3. Balance Top-Up $100
 *   4. Balance Top-Up $500
 *   5. Balance Top-Up $1,000
 *
 * Usage:
 *   cd ~/titleapp-platform
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/createBillingProducts.js
 *
 * Copy the output price IDs into functions/functions/config/pricing.js → stripeProducts
 */

"use strict";

const Stripe = require("stripe");

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Missing STRIPE_SECRET_KEY env var.");
  console.error("Usage: STRIPE_SECRET_KEY=sk_live_xxx node scripts/createBillingProducts.js");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

async function main() {
  const results = {};

  // ── 1. Signature Overage ──────────────────────────────────────
  console.log("Creating: TitleApp Signature Overage...");
  const sigProduct = await stripe.products.create({
    name: "TitleApp Signature Overage",
    metadata: { type: "signature_overage", version: "1" },
  });
  const sigPrice = await stripe.prices.create({
    product: sigProduct.id,
    unit_amount: 100, // $1.00
    currency: "usd",
    billing_scheme: "per_unit",
  });
  results.signatureOverage = sigPrice.id;
  console.log(`  Product: ${sigProduct.id}`);
  console.log(`  Price:   ${sigPrice.id}  ($1.00/unit)`);

  // ── 2. Blockchain Record Overage ──────────────────────────────
  console.log("Creating: TitleApp Blockchain Record...");
  const bcProduct = await stripe.products.create({
    name: "TitleApp Blockchain Record",
    metadata: { type: "blockchain_overage", version: "1" },
  });
  const bcPrice = await stripe.prices.create({
    product: bcProduct.id,
    unit_amount: 100, // $1.00
    currency: "usd",
    billing_scheme: "per_unit",
  });
  results.blockchainOverage = bcPrice.id;
  console.log(`  Product: ${bcProduct.id}`);
  console.log(`  Price:   ${bcPrice.id}  ($1.00/unit)`);

  // ── 3. Balance Top-Up $100 ────────────────────────────────────
  console.log("Creating: TitleApp Balance Top-Up $100...");
  const topUp100Product = await stripe.products.create({
    name: "TitleApp Balance Top-Up $100",
    metadata: { type: "balance_topup", amount: "100" },
  });
  const topUp100Price = await stripe.prices.create({
    product: topUp100Product.id,
    unit_amount: 10000, // $100.00
    currency: "usd",
    billing_scheme: "per_unit",
  });
  results.topUp100 = topUp100Price.id;
  console.log(`  Product: ${topUp100Product.id}`);
  console.log(`  Price:   ${topUp100Price.id}  ($100.00)`);

  // ── 4. Balance Top-Up $500 ────────────────────────────────────
  console.log("Creating: TitleApp Balance Top-Up $500...");
  const topUp500Product = await stripe.products.create({
    name: "TitleApp Balance Top-Up $500",
    metadata: { type: "balance_topup", amount: "500" },
  });
  const topUp500Price = await stripe.prices.create({
    product: topUp500Product.id,
    unit_amount: 50000, // $500.00
    currency: "usd",
    billing_scheme: "per_unit",
  });
  results.topUp500 = topUp500Price.id;
  console.log(`  Product: ${topUp500Product.id}`);
  console.log(`  Price:   ${topUp500Price.id}  ($500.00)`);

  // ── 5. Balance Top-Up $1,000 ──────────────────────────────────
  console.log("Creating: TitleApp Balance Top-Up $1,000...");
  const topUp1000Product = await stripe.products.create({
    name: "TitleApp Balance Top-Up $1,000",
    metadata: { type: "balance_topup", amount: "1000" },
  });
  const topUp1000Price = await stripe.prices.create({
    product: topUp1000Product.id,
    unit_amount: 100000, // $1,000.00
    currency: "usd",
    billing_scheme: "per_unit",
  });
  results.topUp1000 = topUp1000Price.id;
  console.log(`  Product: ${topUp1000Product.id}`);
  console.log(`  Price:   ${topUp1000Price.id}  ($1,000.00)`);

  // ── Summary ───────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("Copy these into config/pricing.js → stripeProducts:");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  stripeProducts: {`);
  console.log(`    signatureOverage: '${results.signatureOverage}',`);
  console.log(`    blockchainOverage: '${results.blockchainOverage}',`);
  console.log(`    topUp100: '${results.topUp100}',`);
  console.log(`    topUp500: '${results.topUp500}',`);
  console.log(`    topUp1000: '${results.topUp1000}',`);
  console.log(`  },`);
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
