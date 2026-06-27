// Seed a real title-abstract record for the demo: 30 Pihaa Street, Lahaina HI
// (Maui). Grounds the title-abstract-001 worker chat + canvas in a tenant
// Firestore record (not a fixture). Idempotent. Demo data — clearly marked.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const TENANT = "ws_1781920656122_tl9dhn";

const ABSTRACT = {
  tenantId: TENANT, demo: true,
  abstract_id: "ta-lahaina-30pihaa",
  property_address: "30 Pihaa Street, Lahaina, HI 96761",
  county: "Maui", island: "Maui", state: "HI",
  tmk: "(2) 4-6-012:045",
  legal_description: "Lot 45, Block 12, Pihaa Subdivision Unit 2, as shown on File Plan 1187, Maui County; being a portion of Royal Patent 1234, Land Commission Award 5678 to the original awardee.",
  land_area_sqft: 8276, // ~0.19 acre
  zoning: "R-2 Residential",
  current_owner: "Kahale Family Revocable Living Trust",
  vesting: "Trustee(s) of the Kahale Family Revocable Living Trust dated March 3, 2014",
  assessed_value_usd: 985000,
  chain_of_title: [
    { date: "1998-05-12", grantor: "Pihaa Land Co., LLC", grantee: "Robert & Marie Kahale", instrument: "Warranty Deed", doc_number: "98-073145" },
    { date: "2014-03-21", grantor: "Robert & Marie Kahale", grantee: "Kahale Family Revocable Living Trust", instrument: "Quitclaim Deed (to trust)", doc_number: "2014-013902" },
  ],
  liens_encumbrances: [
    { type: "Mortgage", holder: "Bank of Hawaii", amount_usd: 412000, recorded: "2019-08-02", doc_number: "2019-118334", status: "Open" },
    { type: "Property tax", holder: "County of Maui", amount_usd: 0, recorded: "2026-01-01", status: "Current — paid through 2026 H1" },
  ],
  easements: [
    { type: "Utility easement", description: "5-ft along rear lot line in favor of Maui Electric Co." },
    { type: "Access easement", description: "Shared driveway, makai 10 ft, recorded File Plan 1187." },
  ],
  exceptions: [
    "Taxes for the current half-year not yet due or payable.",
    "Mineral and water rights reserved to the State of Hawaii.",
    "Title to all minerals/metals and any easements per Royal Patent 1234.",
  ],
  tax_status: "Current (paid through 2026 H1)",
  examiner: "SOCIII Title Abstract Worker",
  abstract_prepared: "2026-06-26",
  disclaimer: "Demo abstract — illustrative title record for the Meadow Creek workspace. Not a title commitment or legal opinion.",
};

(async () => {
  await db.collection("title_abstracts").doc(`${TENANT}__${ABSTRACT.abstract_id}`).set(ABSTRACT, { merge: true });
  const snap = await db.collection("title_abstracts").where("tenantId", "==", TENANT).get();
  console.log(`✓ seeded title_abstracts: ${snap.size} record(s) — ${ABSTRACT.property_address} · TMK ${ABSTRACT.tmk}`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
