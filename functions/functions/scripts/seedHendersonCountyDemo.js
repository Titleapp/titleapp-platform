#!/usr/bin/env node
/**
 * seedHendersonCountyDemo.js — Seed Athens TX / Henderson County demo title orders
 * for the Attorneys Title Company of Henderson County pitch (Troy Garris, Chad Hardgrave).
 *
 * Usage (from functions/functions/):
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json node scripts/seedHendersonCountyDemo.js
 *
 * Idempotent: scoped to DEMO SPACE tenant; merge:true on worker docs.
 */

"use strict";

if (process.env.FIRESTORE_EMULATOR_HOST === "undefined") delete process.env.FIRESTORE_EMULATOR_HOST;

const path = require("path");
const admin = require(path.join(__dirname, "..", "node_modules", "firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const DEMO_TENANT_ID = "ws_1781920656122_tl9dhn"; // Sean's DEMO SPACE tenant

// Athens TX (Henderson County seat) demo addresses
const HENDERSON_ORDERS = [
  {
    address: "303 E Tyler St, Athens, TX 75751",
    buyerName: "James & Rebecca Caldwell",
    sellerName: "First National Properties LLC",
    purchasePrice: 425000,
    orderType: "purchase",
    label: "Downtown Athens commercial — clean chain",
    riskScore: 12,
    status: "commitment_issued",
  },
  {
    address: "1205 W Corsicana St, Athens, TX 75751",
    buyerName: "David Morales",
    sellerName: "Patricia Ann Sullivan",
    purchasePrice: 285000,
    orderType: "purchase",
    label: "SFR — prior lien demo (shows curative workflow)",
    riskScore: 38,
    status: "defect_review",
  },
  {
    address: "901 N Prairieville St, Athens, TX 75751",
    buyerName: "Refi Demo — Benchmark Mortgage",
    sellerName: null,
    purchasePrice: null,
    orderType: "refi",
    label: "Refi — Chad Hardgrave / Benchmark Mortgage connection demo",
    riskScore: 8,
    status: "search_complete",
  },
];

const CHAIN_EVENTS = {
  ownership: (orderId) => ({
    type: "title.ownership_found",
    authoredBy: "pipeline",
    source: "ATTOM",
    data: {
      currentOwner: "Patricia Ann Sullivan",
      ownershipType: "fee simple",
      vestingDeed: "Warranty Deed",
      deedBook: "425",
      deedPage: "118",
      recordedDate: "2018-03-15",
      county: "Henderson County",
      state: "TX",
    },
    immutable: true,
  }),
  lienClean: (orderId) => ({
    type: "title.lien_found",
    authoredBy: "pipeline",
    source: "ATTOM",
    data: {
      openMortgages: 0,
      judgmentLiens: 0,
      taxLiens: 0,
      mechanicsLiens: 0,
      summary: "No open liens found.",
    },
    immutable: true,
  }),
  lienWithDefect: (orderId) => ({
    type: "title.lien_found",
    authoredBy: "pipeline",
    source: "ATTOM",
    data: {
      openMortgages: 1,
      judgmentLiens: 0,
      taxLiens: 0,
      mechanicsLiens: 1,
      openMortgageDetail: "First lien — Benchmark Mortgage, original principal $198,000, approx payoff $172,400",
      mechanicsLienDetail: "Mechanics lien filed 2024-11-02, claimant: Athens HVAC Services LLC, amount $4,200",
      summary: "Open first mortgage + mechanics lien — curative action required.",
    },
    immutable: true,
  }),
  taxCurrent: (orderId) => ({
    type: "title.tax_status_found",
    authoredBy: "pipeline",
    source: "ATTOM",
    data: {
      taxYear: 2025,
      taxesPaid: true,
      taxesDue: 0,
      assessedValue: 268000,
      taxRate: 1.84,
      county: "Henderson County",
      status: "Current",
    },
    immutable: true,
  }),
  defectMechanicsLien: (orderId) => ({
    type: "title.defect_logged",
    authoredBy: "ai",
    validated: true,
    severity: "P1",
    category: "lien",
    description: "Mechanics lien filed by Athens HVAC Services LLC ($4,200) — must be released or bonded over before commitment can issue.",
    suggestedCure: "Obtain release from Athens HVAC Services LLC or escrow 150% of lien amount pending release.",
    evidence: [],
    curativeStatus: "open",
    immutable: true,
  }),
};

async function appendEvent(orderRef, payload) {
  const eventRef = orderRef.collection("events").doc();
  await eventRef.set({
    ...payload,
    eventId: eventRef.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return eventRef.id;
}

async function run() {
  console.log("\n=== Seed Henderson County / Athens TX Demo Orders ===\n");
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const demo of HENDERSON_ORDERS) {
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
      status: demo.status,
      riskScore: demo.riskScore,
      county: "Henderson County",
      state: "TX",
      jurisdiction: "TX",
      titleCompany: "Attorneys Title Company of Henderson County",
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    // Seed chain events based on order type
    if (demo.orderType !== "refi") {
      const ownerEventId = await appendEvent(orderRef, CHAIN_EVENTS.ownership(orderId));
      const taxEventId = await appendEvent(orderRef, CHAIN_EVENTS.taxCurrent(orderId));

      if (demo.riskScore > 20) {
        // Defect demo — mechanics lien + open mortgage
        const lienEventId = await appendEvent(orderRef, CHAIN_EVENTS.lienWithDefect(orderId));
        const defectPayload = {
          ...CHAIN_EVENTS.defectMechanicsLien(orderId),
          evidence: [
            { eventId: lienEventId, description: "ATTOM lien data confirming mechanics lien" },
          ],
        };
        await appendEvent(orderRef, defectPayload);
      } else {
        await appendEvent(orderRef, CHAIN_EVENTS.lienClean(orderId));
      }
    } else {
      // Refi — just ownership + tax
      await appendEvent(orderRef, CHAIN_EVENTS.ownership(orderId));
      await appendEvent(orderRef, CHAIN_EVENTS.taxCurrent(orderId));
    }

    console.log(`✅ ${orderId} — ${demo.label}`);
    console.log(`   Address: ${demo.address}`);
    console.log(`   Status: ${demo.status} | Risk: ${demo.riskScore}`);
    console.log(`   Portal: /portal?company=attorneys-title&persona=buyer&orderId=${orderId}\n`);
  }

  console.log("Done. 3 Henderson County demo orders created.\n");
  process.exit(0);
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
