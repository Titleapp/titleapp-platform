#!/usr/bin/env node
/**
 * seedTitleProductionSuite.js — Register title production suite workers
 * and seed 4 Austin TX demo addresses with title orders.
 *
 * Usage:
 *   cd /Users/seancombs/titleapp-platform
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json node /tmp/seedTitleProductionSuite.js
 *
 * Or with firebase-admin from functions:
 *   cd functions/functions
 *   GOOGLE_APPLICATION_CREDENTIALS=... node /tmp/seedTitleProductionSuite.js
 *
 * Idempotent: merge:true on all writes.
 */

"use strict";

// Ensure emulator host is not set to the string "undefined"
if (process.env.FIRESTORE_EMULATOR_HOST === "undefined") delete process.env.FIRESTORE_EMULATOR_HOST;

const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "title-app-alpha" });
}
const db = admin.firestore();

const DEMO_TENANT_ID = "ws_1781920656122_tl9dhn"; // Sean's DEMO SPACE tenant

// ─── 1. Title Production Suite worker catalog entries ─────────────────────────

const TITLE_WORKERS = [
  {
    worker_id: "re-title-search-001",
    name: "Title Search",
    vertical: "real-estate",
    suite: "title",
    price_tier: "$79",
    revenue_model: "per_transaction",
    status: "active",
    short_description: "Full chain-of-title search with ATTOM data — ownership, liens, mortgages, tax status, and risk score. Writes immutable chain events per TX RAAS rules.",
    credit_cost: 10,
    visibility: "org-only",
    emits: "chain-of-title/v1",
    accepts: "address, parcel-bundle/v1",
    tags: ["title", "texas", "real-estate", "chain-of-title"],
    jurisdiction: "TX",
    codex: "48",
  },
  {
    worker_id: "re-commitment-001",
    name: "Commitment Engine",
    vertical: "real-estate",
    suite: "title",
    price_tier: "$49",
    revenue_model: "per_transaction",
    status: "active",
    short_description: "Issues the title commitment (Schedule A + B-1 + B-2) from the chain-of-title bundle. TDI rate compliance built-in.",
    credit_cost: 8,
    visibility: "org-only",
    emits: "title-commitment/v1",
    accepts: "chain-of-title/v1",
    tags: ["title", "texas", "commitment", "schedule-b"],
    jurisdiction: "TX",
    codex: "48",
  },
  {
    worker_id: "re-defect-tracker-001",
    name: "Defect Tracker",
    vertical: "real-estate",
    suite: "title",
    price_tier: "$49",
    revenue_model: "per_transaction",
    status: "active",
    short_description: "Logs and classifies title defects (P0/P1/P2) with curative action steps. P0 defects block final commitment until cured.",
    credit_cost: 5,
    visibility: "org-only",
    emits: "defect-report/v1",
    accepts: "chain-of-title/v1, title-commitment/v1",
    tags: ["title", "texas", "defects", "curative"],
    jurisdiction: "TX",
    codex: "48",
  },
  {
    worker_id: "re-escrow-001",
    name: "Escrow Manager",
    vertical: "real-estate",
    suite: "title",
    price_tier: "$79",
    revenue_model: "per_transaction",
    status: "active",
    short_description: "Manages escrow, wire instructions with dual-channel verification, funds tracking, and closing disclosure. Wet close enforcement built-in (TX-T-005).",
    credit_cost: 10,
    visibility: "org-only",
    emits: "settlement-statement/v1",
    accepts: "title-commitment/v1",
    tags: ["title", "texas", "escrow", "wire-fraud"],
    jurisdiction: "TX",
    codex: "48",
  },
  {
    worker_id: "re-underwriting-001",
    name: "Underwriting Review",
    vertical: "real-estate",
    suite: "title",
    price_tier: "$99",
    revenue_model: "per_transaction",
    status: "active",
    short_description: "Underwriter review and approval for title policy issuance. Signs off on final commitment after all P0 defects are cured.",
    credit_cost: 15,
    visibility: "org-only",
    emits: "underwriting-approval/v1",
    accepts: "title-commitment/v1, defect-report/v1",
    tags: ["title", "texas", "underwriting", "policy"],
    jurisdiction: "TX",
    codex: "48",
  },
];

// ─── 2. Demo addresses — 4 Austin TX properties ───────────────────────────────

const DEMO_ORDERS = [
  {
    address: "1008 W 22nd St, Austin, TX 78705",
    buyerName: "Alex Rivera",
    sellerName: "Margaret Chen",
    purchasePrice: 650000,
    orderType: "purchase",
    label: "West Campus SFR — clean demo",
  },
  {
    address: "2400 E Cesar Chavez St, Austin, TX 78702",
    buyerName: "Marcus Johnson",
    sellerName: "Bluestone Capital LLC",
    purchasePrice: 895000,
    orderType: "purchase",
    label: "East Austin commercial — possible lien demo",
  },
  {
    address: "4701 Guadalupe St, Austin, TX 78751",
    buyerName: "Refi Demo Client",
    sellerName: null,
    purchasePrice: null,
    orderType: "refi",
    label: "Hyde Park refi — mortgage history demo",
  },
  {
    address: "1100 Congress Ave, Austin, TX 78701",
    buyerName: null,
    sellerName: null,
    purchasePrice: null,
    orderType: "search-only",
    label: "Downtown commercial search-only",
  },
];

async function run() {
  const now = admin.firestore.FieldValue.serverTimestamp();

  // 1. Register workers in raasCatalog
  console.log("Registering title suite workers in raasCatalog...");
  for (const w of TITLE_WORKERS) {
    await db.collection("raasCatalog").doc(w.worker_id).set({
      ...w,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    // Also register in digitalWorkers collection (the live runtime collection)
    await db.collection("digitalWorkers").doc(w.worker_id).set({
      ...w,
      display_name: w.name,
      tagline: w.short_description,
      description: w.short_description,
      tenantId: "platform",
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    console.log(`  ✓ ${w.worker_id} — ${w.name}`);
  }

  // 2. Seed demo title orders (without running real ATTOM — just the order shell)
  console.log("\nSeeding demo title orders in DEMO SPACE...");
  for (const demo of DEMO_ORDERS) {
    const orderRef = db.collection("titleOrders").doc();
    const orderId = orderRef.id;

    await orderRef.set({
      orderId,
      tenantId: DEMO_TENANT_ID,
      address: demo.address,
      buyerName: demo.buyerName,
      sellerName: demo.sellerName,
      purchasePrice: demo.purchasePrice ? demo.purchasePrice * 100 : null,
      orderType: demo.orderType,
      status: "search_complete",
      riskScore: 15,
      chainEventCount: 5,
      defectCount: 0,
      demoLabel: demo.label,
      seeded: true,
      createdAt: now,
      updatedAt: now,
    });

    // Seed a minimal chain event
    await db.collection("titleOrders").doc(orderId).collection("events").add({
      type: "title.order_opened",
      address: demo.address,
      orderType: demo.orderType,
      openedBy: "demo-seed",
      tenantId: DEMO_TENANT_ID,
      eventId: "seed-event-001",
      createdAt: now,
      immutable: true,
    });

    // Seed an ownership event
    await db.collection("titleOrders").doc(orderId).collection("events").add({
      type: "title.ownership_found",
      sourceRef: "attom:saleshistory/detail",
      grantee: demo.buyerName || "Current Owner",
      grantor: demo.sellerName || "Prior Owner",
      saleDate: "2021-03-15",
      saleAmount: demo.purchasePrice ? demo.purchasePrice * 100 : 500000 * 100,
      docType: "Warranty Deed",
      instrumentNo: `2021-${Math.floor(Math.random() * 999999).toString().padStart(6, "0")}`,
      address: demo.address,
      createdAt: now,
      immutable: true,
    });

    // Seed a lien event
    await db.collection("titleOrders").doc(orderId).collection("events").add({
      type: "title.lien_found",
      sourceRef: "attom:property/mortgagehistory",
      lienType: "mortgage",
      lender: "Wells Fargo Bank NA",
      originalAmount: demo.purchasePrice ? Math.round(demo.purchasePrice * 0.8) * 100 : 400000 * 100,
      recordDate: "2021-03-15",
      maturityDate: "2051-04-01",
      lienStatus: "open",
      instrumentNo: `DOT-2021-${Math.floor(Math.random() * 999999).toString().padStart(6, "0")}`,
      address: demo.address,
      createdAt: now,
      immutable: true,
    });

    // Seed a tax status event
    await db.collection("titleOrders").doc(orderId).collection("events").add({
      type: "title.tax_status_found",
      sourceRef: "attom:property/detail",
      taxYear: 2024,
      annualTax: 12400,
      assessedValue: demo.purchasePrice ? demo.purchasePrice * 0.9 * 100 : 450000 * 100,
      taxDelinquent: false,
      address: demo.address,
      createdAt: now,
      immutable: true,
    });

    console.log(`  ✓ Order ${orderId.slice(0, 8)}... — ${demo.label}`);
  }

  console.log("\nDone. Title Production Suite seeded successfully.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
