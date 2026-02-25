#!/usr/bin/env node
/**
 * Seed investor data room documents and raise config via Firestore.
 * For file uploads, use the deployed UI (InvestorDataRoom drag-and-drop).
 *
 * Run from functions/functions/: node ../../scripts/upload-investor-docs.js
 */

const admin = require("firebase-admin");

// Use Firebase emulator or production Firestore
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TENANT_ID = "titleapp-investor";

async function main() {
  // Seed raise config
  console.log("Checking raise config...");
  const configDoc = await db.collection("config").doc("raise").get();
  if (!configDoc.exists) {
    console.log("Seeding raise config...");
    await db.collection("config").doc("raise").set({
      active: true,
      instrument: "Post-Money SAFE",
      raiseAmount: 1070000,
      valuationCap: 15000000,
      discount: 0.20,
      minimumInvestment: 1000,
      proRata: true,
      proRataNote: "Yes — all investors",
      fundingPortal: {
        name: "Wefunder",
        url: "https://wefunder.com/titleapp",
        regulation: "Reg CF",
      },
      conversionScenarios: [
        { exitValuation: 30000000, multiple: "2.0x" },
        { exitValuation: 50000000, multiple: "3.3x" },
        { exitValuation: 75000000, multiple: "5.0x" },
        { exitValuation: 100000000, multiple: "6.7x" },
        { exitValuation: 150000000, multiple: "10.0x" },
      ],
      runway: {
        netProceeds: 803000,
        monthlyBurn: 27800,
        zeroRevenueMonths: 28,
        withRevenueMonths: "33+",
        cashFlowPositiveTarget: "mid-2027",
      },
      team: [
        { name: "Sean Lee Combs", role: "CEO", note: "Product + vision" },
        { name: "Kent Redwine", role: "CFO", note: "Finance + operations" },
        { name: "Kim Ellen Bennett", role: "GovTech Lead", note: "Public sector" },
        { name: "Vishal Kumar", role: "Frontend Engineer", note: "React + UI" },
        { name: "Manpreet Kaur", role: "Backend Engineer", note: "Cloud + AI" },
      ],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: "seed-script",
    });
    console.log("Raise config seeded.");
  } else {
    console.log("Raise config already exists, skipping.");
  }

  // Seed data room document metadata (files to be uploaded via UI)
  console.log("\nSeeding data room document entries...");
  const docs = [
    { name: "TitleApp Executive Summary", category: "Pitch Deck", accessLevel: "public", sizeBytes: 29595 },
    { name: "TitleApp Pitch Deck", category: "Pitch Deck", accessLevel: "prospect", sizeBytes: 772839 },
    { name: "TitleApp Business Plan (Feb 2026)", category: "Financials", accessLevel: "verified", sizeBytes: 50722 },
  ];

  for (const doc of docs) {
    // Check if already exists
    const existing = await db.collection("dataRoomDocs")
      .where("tenantId", "==", TENANT_ID)
      .where("name", "==", doc.name)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`  "${doc.name}" already exists, skipping.`);
      continue;
    }

    const ref = await db.collection("dataRoomDocs").add({
      tenantId: TENANT_ID,
      name: doc.name,
      category: doc.category,
      accessLevel: doc.accessLevel,
      storagePath: null,
      url: null,
      contentType: null,
      sizeBytes: doc.sizeBytes,
      views: 0,
      lastViewedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  Created: "${doc.name}" (${doc.accessLevel}) → ${ref.id}`);
  }

  console.log("\nDone. Upload actual files via InvestorDataRoom UI or firebase console.");
  process.exit(0);
}

main().catch(e => {
  console.error("Script failed:", e);
  process.exit(1);
});
