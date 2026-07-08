"use strict";
/**
 * Seed aviation (missing MX/Crew/Safety workers) + eCommerce vertical.
 * Run: node seedAviationAndEcom.js
 * Idempotent — merges tags on existing docs, only creates new ones.
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "title-app-alpha" });
}
const db = admin.firestore();

// ─── Aviation workers to seed ─────────────────────────────────────────────────
// These match slugs from services/alex/catalogs/aviation.json.
// Existing workers get vertical/suite tag patches; new ones are fully seeded.

const AVIATION_NEW = [
  {
    id: "crew-scheduling-roster",
    slug: "crew-scheduling-roster",
    name: "Crew Scheduling & Roster",
    description: "FAR 117/135 duty-time compliant crew scheduling, reserve callout, swap management, and monthly roster generation.",
    vertical: "aviation",
    suite: "Aviation",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "maintenance-work-order-logbook",
    slug: "maintenance-work-order-logbook",
    name: "MX Work Order & Logbook",
    description: "Aircraft maintenance work order creation, tech-log entries, sign-off workflows, and 8130-3 tag tracking. FAA-compliant append-only records.",
    vertical: "aviation",
    suite: "Aviation",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "flight-duty-time-enforcer",
    slug: "flight-duty-time-enforcer",
    name: "Flight & Duty Time Enforcer",
    description: "Real-time FAR 117 / Part 135 duty-time tracking. Flags limit violations before scheduling. Auto-generates WOCL alerts and rest-period summaries.",
    vertical: "aviation",
    suite: "Aviation",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "flight-risk-assessment-frat",
    slug: "flight-risk-assessment-frat",
    name: "Flight Risk Assessment (FRAT)",
    description: "Pre-flight risk scoring across weather, crew currency, aircraft status, and route complexity. Produces a Go/No-Go brief with mitigation steps.",
    vertical: "aviation",
    suite: "Aviation",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "charter-quoting-engine",
    slug: "charter-quoting-engine",
    name: "Charter Quoting Engine",
    description: "Mission cost estimation, quote generation, and margin analysis for on-demand charter operations. Integrates fuel pricing and crew cost.",
    vertical: "aviation",
    suite: "Aviation",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "safety-reporting-sms",
    slug: "safety-reporting-sms",
    name: "Safety Reporting (SMS)",
    description: "Anonymous hazard reporting, safety assurance dashboards, corrective action tracking, and ASAP/VDRP program support.",
    vertical: "aviation",
    suite: "Aviation",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "component-life-tracker",
    slug: "component-life-tracker",
    name: "Component & Life Tracker",
    description: "Time-since-new, time-since-overhaul, and calendar-limit tracking for life-limited parts. Surfaces upcoming hard limits with 30/60/90-day alerts.",
    vertical: "aviation",
    suite: "Aviation",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "parts-inventory-manager",
    slug: "parts-inventory-manager",
    name: "Parts & Inventory Manager",
    description: "Parts traceability, serviceable tag tracking, minimum-stock alerts, and AOG procurement workflow for Part 145 repair stations.",
    vertical: "aviation",
    suite: "Aviation",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
];

// Patch existing aviation workers to ensure vertical/suite tags are correct
const AVIATION_PATCHES = [
  { id: "ad-sb-compliance-tracker" },
  { id: "ai-training-courseware" },
  { id: "airport-helipad-intelligence" },
  { id: "aviation-daily-ops" },
  { id: "aviation-dispatch-board" },
  { id: "weight-balance-calculator" },
  { id: "aircraft-status-mel" },
  { id: "alex-aviation-cos" },
  { id: "av-copilot-001" },
  { id: "av-mx-001" },
  { id: "av-dispatch-001" },
  { id: "accounts-receivable-billing" },
  { id: "notam-intelligence" },
  { id: "weather-intelligence" },
].map((p) => ({ ...p, vertical: "aviation", suite: "Aviation" }));

// ─── eCommerce workers ────────────────────────────────────────────────────────

const ECOM_WORKERS = [
  {
    id: "ecom-dpp",
    slug: "ecom-dpp",
    name: "Digital Product Passport (DPP)",
    description: "EU Battery Regulation (2023/1542) compliant DPP creation, QR-code anchoring, and audit trail. Mandatory by 2027 for batteries sold in the EU.",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "live",
    price: 0,
    isPublic: true,
  },
  {
    id: "ecom-product-catalog",
    slug: "ecom-product-catalog",
    name: "Product & Catalog Manager",
    description: "Product data enrichment, SEO-optimized descriptions, category taxonomy management, and cross-channel sync (Shopify, Amazon, WooCommerce).",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "ecom-order-ops",
    slug: "ecom-order-ops",
    name: "Order Operations",
    description: "Order routing, fulfillment exception handling, carrier tracking, and SLA monitoring. Flags at-risk orders before they miss ship dates.",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "ecom-customer-service",
    slug: "ecom-customer-service",
    name: "Customer Service AI",
    description: "Drafts order-status replies, return authorizations, and escalation summaries. Trained on your store's policies and tone-of-voice.",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "ecom-inventory",
    slug: "ecom-inventory",
    name: "Inventory Intelligence",
    description: "Reorder-point alerts, dead-stock identification, demand forecasting, and supplier lead-time tracking across warehouses.",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "ecom-returns",
    slug: "ecom-returns",
    name: "Returns & Refunds Handler",
    description: "RMA processing, refund policy enforcement, restocking decisions, and returns analytics by SKU and root cause.",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "ecom-marketing",
    slug: "ecom-marketing",
    name: "eCommerce Marketing",
    description: "Product launch copy, email campaign sequences, abandoned-cart flows, and paid-ad briefs. Integrates with Shopify and Klaviyo.",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "ecom-revenue-analytics",
    slug: "ecom-revenue-analytics",
    name: "Revenue Analytics",
    description: "GMV, AOV, CAC, LTV dashboards by channel, cohort, and product. Surfaces margin by SKU and flags pricing outliers.",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "ecom-supplier-compliance",
    slug: "ecom-supplier-compliance",
    name: "Supplier & Compliance Monitor",
    description: "Supplier audit tracking, certificate-of-conformance management, REACH/RoHS/DPP compliance checks, and country-of-origin documentation.",
    vertical: "ecommerce",
    suite: "eCommerce",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
];

async function seed() {
  const col = db.collection("digitalWorkers");
  let added = 0, patched = 0;

  // Patch existing aviation workers
  for (const p of AVIATION_PATCHES) {
    try {
      const snap = await col.doc(p.id).get();
      if (snap.exists) {
        await col.doc(p.id).set({ vertical: "aviation", suite: "Aviation" }, { merge: true });
        console.log(`  Patched aviation: ${p.id}`);
        patched++;
      }
    } catch (e) {
      console.log(`  Skip aviation patch ${p.id}: ${e.message}`);
    }
  }

  // Seed new aviation workers
  for (const w of AVIATION_NEW) {
    const snap = await col.doc(w.id).get();
    if (snap.exists) {
      await col.doc(w.id).set({ vertical: "aviation", suite: "Aviation" }, { merge: true });
      console.log(`  Already exists, patched: ${w.id}`);
      patched++;
      continue;
    }
    await col.doc(w.id).set({ ...w, createdAt: admin.firestore.FieldValue.serverTimestamp(), source: "seed:aviation-suite" });
    console.log(`  Added aviation: ${w.name} [${w.status}]`);
    added++;
  }

  // Seed eCommerce workers
  for (const w of ECOM_WORKERS) {
    const snap = await col.doc(w.id).get();
    if (snap.exists) {
      await col.doc(w.id).set({ vertical: "ecommerce", suite: "eCommerce" }, { merge: true });
      console.log(`  Already exists, patched: ${w.id}`);
      patched++;
      continue;
    }
    await col.doc(w.id).set({ ...w, createdAt: admin.firestore.FieldValue.serverTimestamp(), source: "seed:ecommerce-suite" });
    console.log(`  Added ecom: ${w.name} [${w.status}]`);
    added++;
  }

  console.log(`\nDone. Added: ${added}, Patched: ${patched}`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
