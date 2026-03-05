/**
 * TitleApp — Stripe Launch Setup
 *
 * Run in TEST mode first:
 *   STRIPE_SECRET_KEY=sk_test_xxx node setupStripe_v2.js
 * Then LIVE:
 *   STRIPE_SECRET_KEY=sk_live_xxx node setupStripe_v2.js
 *
 * PRICING (confirmed Session 25):
 *   Free     — Vault, basic Pilot Suite (logbook/currency)
 *   $29/mo   — Tier 1 workers, Pilot Pro
 *   $49/mo   — Tier 2 workers, Pilot Pro+
 *   $79/mo   — Tier 3 premium/regulated workers
 *   $49/yr   — Creator License (waived via DEV100 before July 1 2026)
 *
 * STUDENT PILOT:
 *   Free while enrolled (annual re-verify via STUDENT coupon, 12-month renewable)
 *   Gate: student ID photo + school name (honor system, spot check)
 *   Graduation: GRADPILOT 3-month grace → $29/mo
 *
 * VOLUME DISCOUNTS (programmatic, webhooks.js):
 *   3+ workers → 10% off (VOLUME3)
 *   5-10       → 20% off (VOLUME5)
 *   10+        → 30% off (VOLUME10)
 *
 * DEV REV SHARE: 75% developer / 25% TitleApp — in webhooks.js via Stripe Connect
 *
 * SAFE TO RE-RUN — checks metadata tags before creating, skips if exists.
 */

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('ERROR: Set STRIPE_SECRET_KEY env var first.');
  process.exit(1);
}
const IS_LIVE = process.env.STRIPE_SECRET_KEY.startsWith('sk_live');
console.log(`\n  Mode: ${IS_LIVE ? 'LIVE' : 'TEST'}\n`);

// Fill these in from Stripe dashboard before running
const ARCHIVE_PRODUCT_IDS = [
  // 'prod_xxx', // Digital Worker - Starter $9/mo
  // 'prod_xxx', // Digital Worker - Professional $29/mo
  // 'prod_xxx', // Digital Worker - Business $49/mo
  // 'prod_xxx', // Digital Worker - Enterprise $79/mo
];

const PRODUCTS = [
  {
    tag: 'worker_tier_1',
    name: 'Digital Worker — $29',
    description: 'Entry-level workers. Single-function, minimal regulatory layer. Examples: notification workers, document fetchers, crew housing coordinator, NOTAM intelligence.',
    prices: [
      { nickname: 'Worker $29/mo',  unit_amount: 2900,  currency: 'usd', interval: 'month' },
      { nickname: 'Worker $290/yr', unit_amount: 29000, currency: 'usd', interval: 'year'  },
    ],
    metadata: { titleapp_product: 'worker_tier_1' },
  },
  {
    tag: 'worker_tier_2',
    name: 'Digital Worker — $49',
    description: 'Mid-complexity workers. Multi-step workflows, moderate regulatory layer. Examples: FRAT, training records, medical tracker, post-flight debrief, charter quoting.',
    prices: [
      { nickname: 'Worker $49/mo',  unit_amount: 4900,  currency: 'usd', interval: 'month' },
      { nickname: 'Worker $490/yr', unit_amount: 49000, currency: 'usd', interval: 'year'  },
    ],
    metadata: { titleapp_product: 'worker_tier_2' },
  },
  {
    tag: 'worker_tier_3',
    name: 'Digital Worker — $79',
    description: 'Premium workers. Mission-critical, deep regulatory compliance, multi-system integrations. Examples: Mission Builder & Dispatch, Duty Time Enforcer, Medevac Billing, AI Safety Officer.',
    prices: [
      { nickname: 'Worker $79/mo',  unit_amount: 7900,  currency: 'usd', interval: 'month' },
      { nickname: 'Worker $790/yr', unit_amount: 79000, currency: 'usd', interval: 'year'  },
    ],
    metadata: { titleapp_product: 'worker_tier_3' },
  },
  {
    tag: 'pilot_free',
    name: 'Pilot Suite — Free',
    description: 'Free forever. Manual logbook, currency & medical tracker, PDF export. No credit card.',
    prices: [
      { nickname: 'Pilot Free', unit_amount: 0, currency: 'usd', interval: 'month' },
    ],
    metadata: { titleapp_product: 'pilot_free' },
  },
  {
    tag: 'pilot_pro',
    name: 'Pilot Suite — Pro ($29)',
    description: 'Blockchain-verified logbook, ForeFlight auto-import, PRIA-ready export, 1 aircraft CoPilot, AI oral exam prep, WINGS integration.',
    prices: [
      { nickname: 'Pilot Pro $29/mo',  unit_amount: 2900,  currency: 'usd', interval: 'month' },
      { nickname: 'Pilot Pro $290/yr', unit_amount: 29000, currency: 'usd', interval: 'year'  },
    ],
    metadata: { titleapp_product: 'pilot_pro' },
  },
  {
    tag: 'pilot_pro_plus',
    name: 'Pilot Suite — Pro+ ($49)',
    description: 'Everything in Pro + unlimited aircraft profiles, personal flight planning & weather, personal FRAT, Alex personal aviation assistant.',
    prices: [
      { nickname: 'Pilot Pro+ $49/mo',  unit_amount: 4900,  currency: 'usd', interval: 'month' },
      { nickname: 'Pilot Pro+ $490/yr', unit_amount: 49000, currency: 'usd', interval: 'year'  },
    ],
    metadata: { titleapp_product: 'pilot_pro_plus' },
  },
  {
    tag: 'developer_platform',
    name: 'Developer Platform — Creator License',
    description: 'Annual license to build and publish Digital Workers. Includes Worker #1 pipeline, RAAS builder tools, sandbox, 75% revenue share. $2 Identity Check required separately.',
    prices: [
      { nickname: 'Creator License $49/yr', unit_amount: 4900, currency: 'usd', interval: 'year' },
    ],
    metadata: { titleapp_product: 'developer_platform' },
  },
];

const COUPONS = [
  // Vertical launch
  { id: 'AUTOLAUNCH',  name: 'Auto Dealer Launch — 2 months free',           percent_off: 100, duration: 'repeating', duration_in_months: 2, redeem_by: unixDate('2026-03-23'), metadata: { titleapp_promo: 'launch', vertical: 'auto' } },
  { id: 'TITLELAUNCH', name: 'Title/Escrow Launch — 2 months free',           percent_off: 100, duration: 'repeating', duration_in_months: 2, redeem_by: unixDate('2026-03-23'), metadata: { titleapp_promo: 'launch', vertical: 'title_escrow' } },
  { id: 'PMLAUNCH',    name: 'Property Management Launch — 2 months free',    percent_off: 100, duration: 'repeating', duration_in_months: 2, redeem_by: unixDate('2026-03-23'), metadata: { titleapp_promo: 'launch', vertical: 'property_management' } },
  { id: 'PILOT3FREE',  name: 'Pilot Pro — 3 months free',                     percent_off: 100, duration: 'repeating', duration_in_months: 3, redeem_by: unixDate('2026-04-09'), metadata: { titleapp_promo: 'launch', vertical: 'pilot' } },
  // Developer
  { id: 'DEV100',      name: 'Developer Launch — Creator License free thru July 1 2026', percent_off: 100, duration: 'once', redeem_by: unixDate('2026-07-01'), metadata: { titleapp_promo: 'dev_launch', note: 'Waives $49/yr only. $2 ID Check always required. Restrict to developer_platform price in dashboard.' } },
  // Student pilot — programmatic only
  { id: 'STUDENT',     name: 'Student Pilot — Free while enrolled',           percent_off: 100, duration: 'repeating', duration_in_months: 12, metadata: { titleapp_promo: 'student', note: 'Applied by studentVerification.js. Renewed annually on re-verify.' } },
  { id: 'GRADPILOT',   name: 'Pilot Graduation Gift — 3 months free',         percent_off: 100, duration: 'repeating', duration_in_months: 3,  metadata: { titleapp_promo: 'graduation', note: 'Applied by Alex when student year expires without re-verify.' } },
  // Founder / relationship
  { id: 'FOUNDER100',  name: 'Founder Access — Free forever',                 percent_off: 100, duration: 'forever', max_redemptions: 1, metadata: { titleapp_promo: 'founder', note: 'Template. Duplicate per person in Stripe dashboard for Scott, investors, etc.' } },
  // General
  { id: 'EARLYBIRD50', name: 'Early Bird — 50% off for 6 months',             percent_off: 50,  duration: 'repeating', duration_in_months: 6, metadata: { titleapp_promo: 'earlybird' } },
  { id: 'COMEBACK20',  name: 'Win-Back — 20% off for 3 months',               percent_off: 20,  duration: 'repeating', duration_in_months: 3, metadata: { titleapp_promo: 'winback', note: 'Auto-triggered by dunning.js on subscription.deleted.' } },
  { id: 'DEMO30',      name: 'Post-Demo — 1 month free',                      percent_off: 100, duration: 'repeating', duration_in_months: 1, metadata: { titleapp_promo: 'demo', note: 'Sean sends manually after live demos.' } },
  // CFI/CFII Academy Instructor
  { id: 'CFIACADEMY',  name: 'CFI/CFII Academy Instructor — Free Pro+ while on staff', percent_off: 100, duration: 'repeating', duration_in_months: 12, metadata: { titleapp_promo: 'cfi_academy', note: 'Applied by cfiVerification.js. Requires cert number + academy employee ID. Annual re-verify. Applies to pilot_pro_plus only.' } },
  { id: 'CFIPRO',      name: 'CFI Transition — 3 months free on departure',    percent_off: 100, duration: 'repeating', duration_in_months: 3,  metadata: { titleapp_promo: 'cfi_transition', note: 'Applied when CFI does not re-verify academy employment. Alex email: congrats on next chapter.' } },
  // Volume — programmatic only, never published
  { id: 'VOLUME3',     name: 'Volume — 3+ workers (10% off)',                  percent_off: 10,  duration: 'forever', metadata: { titleapp_promo: 'volume', threshold: '3', note: 'Programmatic only. webhooks.js applies/removes.' } },
  { id: 'VOLUME5',     name: 'Volume — 5-10 workers (20% off)',                percent_off: 20,  duration: 'forever', metadata: { titleapp_promo: 'volume', threshold: '5', note: 'Programmatic only. Replaces VOLUME3.' } },
  { id: 'VOLUME10',    name: 'Volume — 10+ workers (30% off)',                 percent_off: 30,  duration: 'forever', metadata: { titleapp_promo: 'volume', threshold: '10', note: 'Programmatic only. Replaces VOLUME5.' } },
];

function unixDate(dateStr) {
  return Math.floor(new Date(dateStr + 'T23:59:59Z').getTime() / 1000);
}

async function run() {
  const manifest = { products: {}, prices: {}, coupons: {} };
  const errors = [];

  // Archive
  if (ARCHIVE_PRODUCT_IDS.length > 0) {
    console.log('Archiving stale products...');
    for (const id of ARCHIVE_PRODUCT_IDS) {
      try {
        await stripe.products.update(id, { active: false });
        console.log(`  Archived ${id}`);
      } catch (e) {
        errors.push({ step: 'archive', id, error: e.message });
        console.log(`  ${id}: ${e.message}`);
      }
    }
  } else {
    console.log('No products to archive yet — add IDs to ARCHIVE_PRODUCT_IDS when ready\n');
  }

  // Products + prices
  console.log('Products and prices...');
  for (const p of PRODUCTS) {
    try {
      const existing = await stripe.products.search({ query: `metadata['titleapp_product']:'${p.tag}'` });
      let product = existing.data.length > 0 ? existing.data[0] : await stripe.products.create({ name: p.name, description: p.description, metadata: p.metadata });
      const isNew = existing.data.length === 0;
      console.log(`  ${isNew ? 'NEW' : 'EXISTS'} ${p.name} (${product.id})`);
      manifest.products[p.tag] = product.id;

      for (const pr of p.prices) {
        const existingPrices = await stripe.prices.list({ product: product.id, active: true });
        const already = existingPrices.data.find(ep => ep.unit_amount === pr.unit_amount && ep.recurring?.interval === pr.interval);
        if (already) {
          console.log(`    EXISTS ${pr.nickname} (${already.id})`);
          manifest.prices[`${p.tag}_${pr.interval}`] = already.id;
        } else {
          const c = await stripe.prices.create({ product: product.id, nickname: pr.nickname, unit_amount: pr.unit_amount, currency: pr.currency, recurring: { interval: pr.interval } });
          console.log(`    NEW ${pr.nickname} ${(pr.unit_amount/100).toFixed(0)}/${pr.interval} (${c.id})`);
          manifest.prices[`${p.tag}_${pr.interval}`] = c.id;
        }
      }
    } catch (e) {
      errors.push({ step: 'product', name: p.name, error: e.message });
      console.log(`  FAILED ${p.name}: ${e.message}`);
    }
  }

  // Coupons
  console.log('\nCoupons...');
  for (const c of COUPONS) {
    try {
      try {
        const ex = await stripe.coupons.retrieve(c.id);
        console.log(`  EXISTS ${c.id}`);
        manifest.coupons[c.id] = ex.id;
        continue;
      } catch (_) {}
      const data = { id: c.id, name: c.name, percent_off: c.percent_off, duration: c.duration, metadata: c.metadata };
      if (c.duration_in_months) data.duration_in_months = c.duration_in_months;
      if (c.redeem_by) data.redeem_by = c.redeem_by;
      if (c.max_redemptions) data.max_redemptions = c.max_redemptions;
      await stripe.coupons.create(data);
      console.log(`  NEW ${c.id} — ${c.name}`);
      manifest.coupons[c.id] = c.id;
    } catch (e) {
      errors.push({ step: 'coupon', id: c.id, error: e.message });
      console.log(`  FAILED ${c.id}: ${e.message}`);
    }
  }

  // Output
  console.log('\n\n======================================================');
  console.log('MANIFEST — add to Firebase env / .env');
  console.log('======================================================\n');
  Object.entries(manifest.products).forEach(([k,v]) => console.log(`STRIPE_PRODUCT_${k.toUpperCase()}=${v}`));
  console.log('');
  Object.entries(manifest.prices).forEach(([k,v]) => console.log(`STRIPE_PRICE_${k.toUpperCase()}=${v}`));
  console.log('\n// Coupons use their code IDs directly — no env vars needed');

  if (errors.length) { console.log('\nERRORS:'); errors.forEach(e => console.log(`  ${JSON.stringify(e)}`)); }
  else console.log('\nClean run.');

  console.log(`
======================================================
T2 FOLLOW-UP (Claude Code)
======================================================
[ ] Stripe Connect — enable + build services/stripe/connect.js
    Developer onboarding: bank account + W-9 via SignatureService
    webhooks.js: on invoice.paid -> transfer 75% net to developer Connect account

[ ] Volume discount logic in webhooks.js:
    on invoice.paid -> count active worker_tier_* subs for customer
    >=10 -> apply VOLUME10, remove others
    >=5  -> apply VOLUME5, remove others
    >=3  -> apply VOLUME3, remove others
    <3   -> remove all volume coupons

[ ] Student verification — services/studentVerification.js: DONE

[ ] CFI/CFII verification — services/cfiVerification.js: DONE

[ ] DEV100 coupon -> restrict to developer_platform price in Stripe dashboard
    (Coupons -> DEV100 -> edit -> Applies to -> select Creator License price)

[ ] Archive old products — add prod_xxx IDs to ARCHIVE_PRODUCT_IDS, re-run

[ ] Stripe webhook endpoint:
    URL: https://api.titleapp.ai/webhooks/stripe
    Events: checkout.session.completed, invoice.paid, invoice.payment_failed,
    customer.subscription.updated, customer.subscription.deleted,
    identity.verification_session.verified
`);
}

run().catch(e => { console.error(e); process.exit(1); });
