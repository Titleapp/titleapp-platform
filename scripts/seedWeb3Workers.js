/**
 * seedWeb3Workers.js — Seed all 13 Web3 workers to Firestore
 *
 * Reads the Web3 catalog JSON and writes each worker to
 * digitalWorkers/{slug} with W3-specific governance fields.
 *
 * Uses merge: true — safe to re-run without overwriting subscriber data.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *     node scripts/seedWeb3Workers.js
 */

"use strict";

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "title-app-alpha" });
}
const db = admin.firestore();

// Slug map — must match workerSync.js MARKETPLACE_SLUG_MAP
const SLUG_MAP = {
  "W3-001": "w3-token-economics",
  "W3-002": "w3-nft-launch",
  "W3-003": "w3-regulatory-framing",
  "W3-004": "w3-smart-contract-audit",
  "W3-005": "w3-treasury-reporter",
  "W3-006": "w3-governance-docs",
  "W3-007": "w3-telegram-community",
  "W3-008": "w3-social-narrative",
  "W3-009": "w3-sentiment-monitor",
  "W3-010": "w3-community-ir",
  "W3-011": "w3-alex-web3",
  "W3-012": "w3-token-code-generator",
  "W3-013": "w3-contract-auditor",
};

// Document control gates — per prompt spec
const DOC_CONTROL_OVERRIDES = {
  "W3-003": {
    requiresOperatorDocs: true,
    requiredDocTypes: ["legal_counsel_acknowledgment"],
    advisoryWithoutDocs: false,
    blockWithoutDocs: true,
  },
  "W3-006": {
    requiresOperatorDocs: true,
    requiredDocTypes: ["white_paper"],
    advisoryWithoutDocs: true,
    blockWithoutDocs: false,
  },
  "W3-007": {
    requiresOperatorDocs: true,
    requiredDocTypes: ["project_knowledge_base"],
    advisoryWithoutDocs: true,
    blockWithoutDocs: false,
  },
  "W3-008": {
    requiresOperatorDocs: true,
    requiredDocTypes: ["brand_guidelines"],
    advisoryWithoutDocs: true,
    blockWithoutDocs: false,
  },
  "W3-010": {
    requiresOperatorDocs: true,
    requiredDocTypes: ["project_docs"],
    advisoryWithoutDocs: true,
    blockWithoutDocs: false,
  },
  "W3-012": {
    requiresOperatorDocs: false,
    requiredDocTypes: [],
    advisoryWithoutDocs: true,
    blockWithoutDocs: false,
  },
  "W3-013": {
    requiresOperatorDocs: false,
    requiredDocTypes: ["developer_review_acknowledgment"],
    advisoryWithoutDocs: false,
    blockWithoutDocs: true,
  },
};

const W3_LANGUAGES = ["en", "es", "pt", "fr", "de", "it", "zh", "ja", "ko", "ar"];

async function seed() {
  const catalogPath = path.resolve(__dirname, "../functions/functions/services/alex/catalogs/web3.json");

  if (!fs.existsSync(catalogPath)) {
    console.error("Web3 catalog not found:", catalogPath);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const workers = catalog.workers || [];

  console.log(`Seeding ${workers.length} Web3 workers to Firestore digitalWorkers/...`);

  const batch = db.batch();
  let count = 0;

  for (const w of workers) {
    const slug = SLUG_MAP[w.id];
    if (!slug) {
      console.warn(`  SKIP: No slug mapping for ${w.id}`);
      continue;
    }

    const ref = db.collection("digitalWorkers").doc(slug);

    // Default document control
    const docControl = DOC_CONTROL_OVERRIDES[w.id] || {
      requiresOperatorDocs: false,
      requiredDocTypes: [],
      advisoryWithoutDocs: true,
      blockWithoutDocs: false,
    };

    const record = {
      // Identity
      id: slug,
      workerId: w.id,
      name: w.name,
      shortName: (w.name || "").substring(0, 30),

      // Classification
      vertical: "web3",
      suite: w.suite || "W3",
      phase: w.phase || null,
      status: "live",
      tags: w.tags || [],

      // Content
      description: w.description || "",
      shortDescription: (w.description || "").substring(0, 100),

      // Pricing
      price: (w.pricing && w.pricing.monthly) || 0,
      priceDisplay: `$${(w.pricing && w.pricing.monthly) || 0}/mo`,
      trialDays: 14,

      // W3 Governance — ALL Web3 workers
      requiresTeamVerification: true,
      requiresProjectAttestation: true,
      idCheckRequired: true,
      presaleGate: false,
      languages: W3_LANGUAGES,

      // Document Control — per worker
      documentControl: docControl,

      // Value bucket
      valueBucket: w.valueBucket || [],

      // Builder info
      creatorId: "titleapp-platform",
      creatorName: "TitleApp",

      // Timestamps
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(ref, record, { merge: true });
    count++;
    console.log(`  ${w.id} → digitalWorkers/${slug} ($${record.price}/mo) [blockWithoutDocs: ${docControl.blockWithoutDocs}]`);
  }

  await batch.commit();
  console.log(`\nDone. Seeded ${count} Web3 workers to Firestore.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
