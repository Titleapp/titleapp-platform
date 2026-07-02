// Seed a clean demo title-abstract record for the Meadow Creek workspace.
// Property: 3825 S Mason St, Fort Collins CO — illustrative commercial parcel.
// Run: node functions/functions/scripts/demo/seedTitleAbstract.js
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const TENANT = "ws_1781920656122_tl9dhn";

const OLD_ID = `${TENANT}__ta-lahaina-30pihaa`;
const ABSTRACT = {
  tenantId: TENANT, demo: true,
  abstract_id: "ta-meadowcreek-3825mason",
  property_address: "3825 S Mason St, Fort Collins, CO 80525",
  county: "Larimer", state: "CO",
  apn: "97152-04-018",
  legal_description: "Lot 4, Block 2, Harmony Technology Park Filing No. 3, Larimer County, Colorado; as shown on the Final Plat recorded in Reception No. 2004-0041872.",
  land_area_sqft: 18750, // ~0.43 acre commercial lot
  zoning: "C-C (Community Commercial)",
  current_owner: "Meadow Creek Properties LLC",
  vesting: "Meadow Creek Properties LLC, a Colorado limited liability company",
  assessed_value_usd: 1_240_000,
  chain_of_title: [
    { date: "2003-09-15", grantor: "Harmony Tech Park LLC", grantee: "Clearwater Medical Group LLC", instrument: "Warranty Deed", doc_number: "2003-0104821" },
    { date: "2011-04-01", grantor: "Clearwater Medical Group LLC", grantee: "Meadow Creek Properties LLC", instrument: "Warranty Deed", doc_number: "2011-0039745" },
  ],
  liens_encumbrances: [
    { type: "Property tax", holder: "Larimer County Treasurer", amount_usd: 0, recorded: "2026-01-01", status: "Current — paid through 2026 H1" },
  ],
  easements: [
    { type: "Utility easement", description: "10-ft along south lot line in favor of Poudre Valley REA for electric service." },
    { type: "Access easement", description: "Shared ingress/egress from S Mason St, 24-ft wide, per Reception No. 2004-0041873." },
  ],
  exceptions: [
    "Taxes for the current half-year not yet due or payable.",
    "Rights of parties in possession not shown by the public records.",
    "Easements, claims of easements, or encumbrances not shown by the public records.",
    "Title to all minerals/metals reserved per Colorado statute.",
  ],
  tax_status: "Current (paid through 2026 H1)",
  examiner: "SOCIII Title Abstract Worker",
  abstract_prepared: "2026-06-30",
  disclaimer: "Demo abstract — illustrative title record for the Meadow Creek workspace. Not a title commitment or legal opinion.",
};

(async () => {
  // Remove the old Lahaina record if it exists
  try { await db.collection("title_abstracts").doc(OLD_ID).delete(); } catch { /* fine */ }
  await db.collection("title_abstracts").doc(`${TENANT}__${ABSTRACT.abstract_id}`).set(ABSTRACT, { merge: true });
  const snap = await db.collection("title_abstracts").where("tenantId", "==", TENANT).get();
  console.log(`✓ seeded title_abstracts: ${snap.size} record(s) — ${ABSTRACT.property_address} · APN ${ABSTRACT.apn}`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
