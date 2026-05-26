#!/usr/bin/env node
/**
 * portStripeToSociii.js — Create canonical SOCIII Stripe catalog.
 *
 * One-shot script that creates all products, prices, and billing meters on the
 * SOCIII Stripe account. Does NOT read from TitleApp — the canonical product
 * list is declared in this file (deduplicated, named per current brand).
 *
 * Usage:
 *   # Dry-run (prints what would be created):
 *   STRIPE_SOCIII_KEY=sk_live_xxx node scripts/portStripeToSociii.js --dry-run
 *
 *   # Real run:
 *   STRIPE_SOCIII_KEY=sk_live_xxx node scripts/portStripeToSociii.js
 *
 * Output:
 *   - scripts/output/sociii-stripe-catalog-<timestamp>.json   (full log)
 *   - Paste-ready stripeProducts {} block printed at end → copy into
 *     functions/functions/config/pricing.js
 */

"use strict";

const path = require("path");
const fs = require("fs");
// Stripe is loaded lazily inside main() after the key is captured.

const DRY_RUN = process.argv.includes("--dry-run");

function promptHiddenKey() {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("Not a TTY — set STRIPE_SOCIII_KEY env var or run interactively."));
      return;
    }
    process.stdout.write("Paste SOCIII Stripe secret key (input hidden), then press Enter: ");
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let buf = "";
    const onData = (ch) => {
      ch = String(ch);
      for (const c of ch) {
        const code = c.charCodeAt(0);
        if (code === 13 || code === 10) { // Enter
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(buf);
          return;
        } else if (code === 3) { // Ctrl+C
          process.stdout.write("\n");
          process.exit(130);
        } else if (code === 127 || code === 8) { // backspace
          if (buf.length > 0) buf = buf.slice(0, -1);
        } else if (code >= 32) {
          buf += c;
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

let stripe; // initialized in main() after key is captured

// ── Canonical SOCIII catalog ──────────────────────────────────────────

const CATALOG = {
  // Per-worker subscriptions
  workerTiers: [
    { name: "Digital Worker: Tier 1", cents: 2900, credits: 500,  sku: "worker_tier_1" },
    { name: "Digital Worker: Tier 2", cents: 4900, credits: 1500, sku: "worker_tier_2" },
    { name: "Digital Worker: Tier 3", cents: 7900, credits: 3000, sku: "worker_tier_3" },
  ],
  // $99/mo Business in a Box kits
  kits: [
    { name: "Startup Kit",                          slug: "startup_kit" },
    { name: "Real Estate Property Manager Kit",     slug: "re_property_manager_kit" },
    { name: "Real Estate Brokerage Kit",            slug: "re_brokerage_kit" },
    { name: "Real Estate Developer Kit",            slug: "re_developer_kit" },
    { name: "Aviation Operator Kit (Part 135/91)",  slug: "aviation_operator_kit" },
    { name: "Auto Dealer Kit",                      slug: "auto_dealer_kit" },
    { name: "Title & Escrow Kit",                   slug: "title_escrow_kit" },
    { name: "Government Kit",                       slug: "government_kit" },
    { name: "Web3 Kit",                             slug: "web3_kit" },
    { name: "Law Firm Kit",                         slug: "law_firm_kit" },
    { name: "Investment Firm Kit",                  slug: "investment_firm_kit" },
  ],
  // All Access / Enterprise — every worker, prorated creator share
  allAccess: { name: "All Access", cents: 29900, sku: "all_access" },
  // Other subscriptions
  vault: { name: "Vault", cents: 0, sku: "vault_platform_included" },
  creatorLicense: { name: "Creator License", cents: 4900, sku: "creator_license", interval: "year" },
  // Credits (one product, 4 prices: 3 top-ups + metered overage)
  credits: {
    name: "Credits",
    description: "Inference credit top-ups and metered overage",
    topUps: [
      { cents: 500,  nickname: "$5 top-up" },
      { cents: 1500, nickname: "$15 top-up" },
      { cents: 5000, nickname: "$50 top-up" },
    ],
    meteredOverage: { unit_cents: 2, nickname: "Metered overage ($0.02/credit)" }, // $0.02 per credit
  },
  // Balance top-ups (separate product line — larger amounts)
  balanceTopUps: [
    { name: "Balance Top-Up $100",   cents: 10000  },
    { name: "Balance Top-Up $500",   cents: 50000  },
    { name: "Balance Top-Up $1,000", cents: 100000 },
  ],
  // Usage overages (metered)
  usageOverages: [
    { name: "Signature Overage",  unit_cents: 100, sku: "signature_overage",  meterEvent: "signature_requests_overage" },
    { name: "Blockchain Record",  unit_cents: 100, sku: "blockchain_overage", meterEvent: "blockchain_records_overage" },
  ],
  // Identity (one $2 standard + 3 subsidized free)
  identity: [
    { name: "Identity Check - Standard", cents: 200, sku: "identity_check_standard", role: "standard" },
    { name: "Identity Check - Investor", cents: 0,   sku: "identity_check_investor", role: "investor" },
    { name: "Identity Check - Creator",  cents: 0,   sku: "identity_check_creator",  role: "creator"  },
    { name: "Identity Check - Advisor",  cents: 0,   sku: "identity_check_advisor",  role: "advisor"  },
  ],
  // Billing meters
  meters: [
    { display: "Inference credits overage", event_name: "inference_credits_overage" },
    { display: "Audit trail records",       event_name: "audit_trail_records"       },
    { display: "Signature requests overage", event_name: "signature_requests_overage" },
    { display: "Blockchain records overage", event_name: "blockchain_records_overage" },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────

const results = {
  account: null,
  meters: {},
  products: {},
  prices: {},
  // Convenience block for config/pricing.js
  stripeProducts: {},
};

async function verifyAccount() {
  const acct = await stripe.accounts.retrieve();
  results.account = { id: acct.id, name: acct.business_profile?.name || acct.settings?.dashboard?.display_name };
  console.log(`Connected to Stripe account: ${results.account.id} (${results.account.name || "unnamed"})`);
  if (acct.id === "acct_1T1JdQH3orVQEXOA") {
    console.error("ERROR: Connected to TitleApp account, not SOCIII. Aborting.");
    process.exit(1);
  }
}

async function createMeter(m) {
  if (DRY_RUN) {
    console.log(`  [dry] meter ${m.event_name}`);
    return { id: `meter_dry_${m.event_name}` };
  }
  const meter = await stripe.billing.meters.create({
    display_name: m.display,
    event_name: m.event_name,
    default_aggregation: { formula: "sum" },
    customer_mapping: { type: "by_id", event_payload_key: "stripe_customer_id" },
    value_settings: { event_payload_key: "value" },
  });
  console.log(`  meter ${m.event_name} → ${meter.id}`);
  return meter;
}

async function createProduct(name, metadata) {
  if (DRY_RUN) {
    console.log(`  [dry] product "${name}"`);
    return { id: `prod_dry_${(metadata.sku || metadata.slug || name).replace(/\W+/g, "_")}` };
  }
  const product = await stripe.products.create({ name, metadata });
  console.log(`  product "${name}" → ${product.id}`);
  return product;
}

async function createRecurringPrice(productId, cents, interval = "month", nickname = null, meta = {}) {
  if (DRY_RUN) {
    console.log(`    [dry] recurring price ${cents}¢/${interval} on ${productId}`);
    return { id: `price_dry_${productId}_${cents}_${interval}` };
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: cents,
    currency: "usd",
    recurring: { interval },
    ...(nickname ? { nickname } : {}),
    metadata: meta,
  });
  console.log(`    price ${cents}¢/${interval} → ${price.id}`);
  return price;
}

async function createOneTimePrice(productId, cents, nickname = null, meta = {}) {
  if (DRY_RUN) {
    console.log(`    [dry] one-time price ${cents}¢ on ${productId}`);
    return { id: `price_dry_${productId}_${cents}_once` };
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: cents,
    currency: "usd",
    ...(nickname ? { nickname } : {}),
    metadata: meta,
  });
  console.log(`    price ${cents}¢ one-time → ${price.id}`);
  return price;
}

async function createMeteredPrice(productId, unitCents, meterId, nickname = null) {
  if (DRY_RUN) {
    console.log(`    [dry] metered price ${unitCents}¢/unit on ${productId} → meter ${meterId}`);
    return { id: `price_dry_${productId}_${unitCents}_metered` };
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitCents,
    currency: "usd",
    billing_scheme: "per_unit",
    recurring: { interval: "month", usage_type: "metered", meter: meterId },
    ...(nickname ? { nickname } : {}),
  });
  console.log(`    metered price ${unitCents}¢/unit → ${price.id}`);
  return price;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSOCIII Stripe catalog port — ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  let key = process.env.STRIPE_SOCIII_KEY;
  if (!key) {
    key = await promptHiddenKey();
  }
  if (!key || !key.startsWith("sk_")) {
    console.error("Invalid key (must start with sk_). Got something of length", (key || "").length);
    process.exit(1);
  }
  const Stripe = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "stripe"));
  stripe = new Stripe(key, { apiVersion: "2024-06-20" });

  await verifyAccount();

  // 1. Billing meters (must exist before metered prices reference them)
  console.log("\n── Billing meters ──");
  for (const m of CATALOG.meters) {
    const meter = await createMeter(m);
    results.meters[m.event_name] = meter.id;
  }

  // 2. Per-worker subscriptions
  console.log("\n── Per-worker subscriptions ──");
  for (const t of CATALOG.workerTiers) {
    const product = await createProduct(t.name, { sku: t.sku, credits_included: String(t.credits) });
    const price = await createRecurringPrice(product.id, t.cents, "month", null, { sku: t.sku });
    results.products[t.sku] = product.id;
    results.prices[t.sku] = price.id;
    results.stripeProducts[t.sku] = price.id;
  }

  // 3. Kits (all $99/mo)
  console.log("\n── Kits (Business in a Box) ──");
  for (const k of CATALOG.kits) {
    const product = await createProduct(k.name, { sku: "kit", kit_slug: k.slug, bundle: "true" });
    const price = await createRecurringPrice(product.id, 9900, "month", null, { kit_slug: k.slug });
    results.products[`kit_${k.slug}`] = product.id;
    results.prices[`kit_${k.slug}`] = price.id;
    results.stripeProducts[`kit_${k.slug}`] = price.id;
  }

  // 4. All Access
  console.log("\n── All Access ──");
  const allAccessProd = await createProduct(CATALOG.allAccess.name, {
    sku: CATALOG.allAccess.sku,
    bundle: "true",
    note: "every worker, prorated creator share",
  });
  const allAccessPrice = await createRecurringPrice(allAccessProd.id, CATALOG.allAccess.cents, "month");
  results.products.all_access = allAccessProd.id;
  results.prices.all_access = allAccessPrice.id;
  results.stripeProducts.all_access = allAccessPrice.id;

  // 5. Vault (platform-included, $0/mo)
  console.log("\n── Vault ──");
  const vaultProd = await createProduct(CATALOG.vault.name, {
    sku: CATALOG.vault.sku,
    platform_included: "true",
  });
  const vaultPrice = await createRecurringPrice(vaultProd.id, 0, "month");
  results.products.vault = vaultProd.id;
  results.prices.vault = vaultPrice.id;
  results.stripeProducts.vault = vaultPrice.id;

  // 6. Creator License ($49/yr)
  console.log("\n── Creator License ──");
  const clProd = await createProduct(CATALOG.creatorLicense.name, { sku: CATALOG.creatorLicense.sku });
  const clPrice = await createRecurringPrice(clProd.id, CATALOG.creatorLicense.cents, "year");
  results.products.creator_license = clProd.id;
  results.prices.creator_license = clPrice.id;
  results.stripeProducts.creator_license = clPrice.id;

  // 7. Credits (3 top-ups + metered overage)
  console.log("\n── Credits ──");
  const creditsProd = await createProduct(CATALOG.credits.name, {
    sku: "credits",
    description: CATALOG.credits.description,
  });
  results.products.credits = creditsProd.id;
  for (const tu of CATALOG.credits.topUps) {
    const p = await createOneTimePrice(creditsProd.id, tu.cents, tu.nickname);
    const key = `credits_topup_${tu.cents}`;
    results.prices[key] = p.id;
    results.stripeProducts[key] = p.id;
  }
  // Metered overage → references inference meter
  const inferenceMeter = results.meters.inference_credits_overage;
  const meteredOveragePrice = await createMeteredPrice(
    creditsProd.id,
    CATALOG.credits.meteredOverage.unit_cents,
    inferenceMeter,
    CATALOG.credits.meteredOverage.nickname,
  );
  results.prices.credits_metered_overage = meteredOveragePrice.id;
  results.stripeProducts.credits_metered_overage = meteredOveragePrice.id;

  // 8. Balance Top-Ups ($100/$500/$1000)
  console.log("\n── Balance Top-Ups ──");
  for (const tu of CATALOG.balanceTopUps) {
    const sku = `topup_${tu.cents / 100}`;
    const product = await createProduct(tu.name, { sku, type: "balance_topup", amount: String(tu.cents) });
    const price = await createOneTimePrice(product.id, tu.cents);
    results.products[sku] = product.id;
    results.prices[sku] = price.id;
    results.stripeProducts[sku] = price.id;
  }

  // 9. Usage overages (metered: signature, blockchain)
  console.log("\n── Usage overages ──");
  for (const o of CATALOG.usageOverages) {
    const product = await createProduct(o.name, { sku: o.sku });
    const meterId = results.meters[o.meterEvent];
    const price = await createMeteredPrice(product.id, o.unit_cents, meterId);
    results.products[o.sku] = product.id;
    results.prices[o.sku] = price.id;
    results.stripeProducts[o.sku] = price.id;
  }

  // 10. Identity Checks (standard $2 + 3 subsidized $0)
  console.log("\n── Identity Checks ──");
  for (const id of CATALOG.identity) {
    const product = await createProduct(id.name, {
      sku: id.sku,
      type: id.cents === 0 ? "identity_kyc_subsidized" : "identity_kyc",
      subject_role: id.role,
    });
    const price = await createOneTimePrice(product.id, id.cents);
    results.products[id.sku] = product.id;
    results.prices[id.sku] = price.id;
    results.stripeProducts[id.sku] = price.id;
  }

  // ── Write log ──
  const outDir = path.join(__dirname, "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(outDir, `sociii-stripe-catalog-${stamp}.json`);
  fs.writeFileSync(logFile, JSON.stringify(results, null, 2));
  console.log(`\nLog written: ${logFile}`);

  // ── Print paste-ready stripeProducts block ──
  console.log("\n═══════════════════════════════════════════════════");
  console.log("Paste this into functions/functions/config/pricing.js → stripeProducts:");
  console.log("═══════════════════════════════════════════════════");
  console.log("  stripeProducts: {");
  for (const [k, v] of Object.entries(results.stripeProducts)) {
    console.log(`    ${k}: '${v}',`);
  }
  console.log("  },");
  console.log("═══════════════════════════════════════════════════");
  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  if (err.raw) console.error(err.raw);
  process.exit(1);
});
