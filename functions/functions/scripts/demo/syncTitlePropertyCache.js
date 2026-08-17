// Sync propertyCache/{addressKey} for the 3 real titleOrders docs (tenant
// demo-attorneys-title-001) so any worker doing a property lookup on these
// addresses sees the SAME narrative (buyer, seller, price, defect status)
// as the title orders themselves — instead of the generic, uncoordinated
// fabricated data bulkPullPropertyCache.js wrote for these same 3 addresses
// as part of its general 50-property demo pool.
//
// Idempotent — overwrites whatever propertyCache doc currently exists at
// each address's normalized key.
//
// Run from functions/functions/:
//   node scripts/demo/syncTitlePropertyCache.js
"use strict";

const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const { normalizeAddressKey } = require(path.resolve(__dirname, "../../services/re/liveLookup"));

const TITLE_TENANT = "demo-attorneys-title-001";
const DISCLAIMER = "SAMPLE — FOR DEMONSTRATION ONLY — NOT A RECORDED DOCUMENT — NOT VALID FOR ANY TRANSACTION";
const money = (cents) => cents == null ? null : "$" + Math.round(cents / 100).toLocaleString();

function buildAttom(order) {
  return {
    address: order.address,
    apn: order.parcelId,
    propType: "sfr",
    yearBuilt: null,
    lotSizeAcres: null,
    bldgSqft: null,
    lat: null, lng: null,
    owner: order.sellerName ? null : (order.buyerName || null), // refi with no sale: buyer is current owner
    county: order.county + " County",
    state: order.state,
    zoning: null,
    lastSaleAmt: order.purchasePrice || null,
    lastSaleDate: order.status === "search_complete" || order.status === "commitment_issued" ? order.openedDate : null,
    salesHistory: order.purchasePrice ? [
      { date: order.openedDate, amount: order.purchasePrice, grantor: order.sellerName, grantee: order.buyerName },
    ] : [],
    source: "title-order-sync",
    titleOrderId: order.id,
  };
}

function buildCanvasSpec(order, attom) {
  const casRed = order.defectCount > 0 ? 1 : 0;
  const chainLinks = attom.salesHistory.map((s) => ({
    band: "GREEN",
    date: s.date, amount: s.amount ? money(s.amount) : null,
    grantor: s.grantor, grantee: s.grantee,
    docType: "Warranty Deed", instrument: order.parcelId,
    note: null,
  }));
  if (order.defectCount > 0 && order.defectNote) {
    chainLinks.push({
      band: "RED", date: null, amount: null,
      grantor: null, grantee: null,
      docType: "Open item", instrument: order.parcelId,
      note: order.defectNote,
    });
  }

  const facts = [
    { label: "APN / Parcel", value: order.parcelId, band: "WHITE" },
    { label: "County", value: attom.county, band: "WHITE" },
    { label: "Order type", value: order.orderType, band: "WHITE" },
  ];
  if (order.purchasePrice) facts.push({ label: "Purchase price", value: money(order.purchasePrice), band: "GREEN" });
  if (order.loanAmount) facts.push({ label: "Loan amount", value: money(order.loanAmount), band: "WHITE" });

  return {
    title: order.address,
    subtitle: `${order.parcelId} · ${order.orderType} · Title order record`,
    disclaimer: DISCLAIMER,
    demo: true,
    cas: { RED: casRed, YELLOW: 0, BLUE: 1, WHITE: facts.length, GREEN: order.purchasePrice ? 1 : 0 },
    tabs: [
      {
        id: "subject", label: "Subject property",
        blocks: [
          { type: "map", address: order.address, mapType: "satellite" },
          { type: "streetview", address: order.address },
          { type: "kpis", items: facts },
        ],
      },
      {
        id: "chain", label: "Chain of title",
        blocks: [
          { type: "prose", items: [{ band: "WHITE", title: "SAMPLE — NOT A RECORDED DOCUMENT", body: DISCLAIMER }] },
          { type: "chain", title: "Recorded transfers", links: chainLinks },
        ],
      },
      {
        id: "title-search", label: "Title search",
        blocks: [
          { type: "heroes", items: [
            { band: casRed > 0 ? "RED" : "GREEN",
              title: casRed > 0 ? "Open item — review required" : "Clear title — no exceptions",
              detail: order.notes },
          ] },
          ...(order.defectCount > 0 ? [{ type: "flags", items: [
            { band: "RED", label: "Title defect", detail: order.defectNote },
          ] }] : []),
        ],
      },
      {
        id: "deal-screen", label: "Deal screen",
        blocks: [
          { type: "prose", items: [{ band: "WHITE", title: "Data source", body: `Synced from title order ${order.id} — buyer/seller/price/defect status match the order exactly, not generic demo filler.` }] },
        ],
      },
    ],
  };
}

async function run() {
  const snap = await db.collection("titleOrders").where("tenantId", "==", TITLE_TENANT).get();
  console.log(`Found ${snap.size} title orders for ${TITLE_TENANT}.`);
  for (const doc of snap.docs) {
    const order = doc.data();
    const attom = buildAttom(order);
    const canvasSpec = buildCanvasSpec(order, attom);
    const addressKey = normalizeAddressKey(order.address);
    await db.collection("propertyCache").doc(addressKey).set({
      address: order.address,
      addressKey,
      demo: true,
      attom,
      canvasSpec,
      cachedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "title-order-sync",
    });
    console.log(`  ✓ ${addressKey}  (order ${order.id}, defectCount=${order.defectCount})`);
  }
  console.log("\nDone.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
