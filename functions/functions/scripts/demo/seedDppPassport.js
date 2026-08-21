"use strict";
// seedDppPassport.js — real Digital Product Passport data for the end-consumer
// portal (Sean, 2026-08-20: "the DPP could have two use cases (one the end
// consumer as I think that was the whole purpose of the law)"). Confirmed
// via direct Firestore query: productPassports, dpp, digitalProductPassports
// all had zero docs before this — built from scratch, not a gap-fill.
//
// Story: Volta Advisory (Elise Moreau's consulting firm, the real "traitly"
// demo tenant) manages EU DPP compliance FOR brand clients — Elise's own
// business relationship with her clients is a separate B2B/operator-side
// thing, not built here. This is one of those clients' actual products,
// as an end shopper would see it after scanning the garment tag.
//
// Idempotent — safe to run more than once.
//
// Run from functions/functions/:
//   node scripts/demo/seedDppPassport.js
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const PASSPORT_ID = "nordholm-overshirt-014";

(async () => {
  console.log("═══ seedDppPassport.js ═══\n");

  await db.collection("productPassports").doc(PASSPORT_ID).set({
    tenantId: "demo-volta-advisory-001", // compliance managed by Volta Advisory — not shown to the consumer
    brandName: "Nordholm",
    productName: "Merino Wool Overshirt",
    category: "Apparel — Outerwear",
    sku: "NH-OS-2026-014",
    materials: [
      { name: "Merino wool", percent: 78, origin: "New Zealand" },
      { name: "Recycled polyester lining", percent: 22, origin: "Portugal" },
    ],
    manufacturing: {
      facility: "Coimbra Textile Works",
      country: "Portugal",
      certifications: ["OEKO-TEX Standard 100", "GOTS"],
    },
    careInstructions: "Machine wash cold on gentle cycle. Lay flat to dry. Do not bleach. Cool iron if needed.",
    carbonFootprintKgCO2e: 4.2,
    recyclability: {
      recyclable: true,
      instructions: "Return to any Nordholm store for the take-back program, or recycle through your local textile collection.",
    },
    complianceStandard: "EU Ecodesign for Sustainable Products Regulation (ESPR) — Digital Product Passport, textiles pilot",
    registeredAt: "2026-05-14",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`  ✓ productPassports/${PASSPORT_ID} — Nordholm Merino Wool Overshirt`);

  console.log("\n═══ Done ═══");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
