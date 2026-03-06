#!/usr/bin/env node
/**
 * seedDataFeeRegistry.js — Seed external API provider cost registry
 *
 * Populates data_fee_registry collection with known providers and their
 * current costs. Every external API call MUST have a matching entry here
 * or it will be blocked by dataFeeMiddleware.
 *
 * Usage:
 *   cd functions/functions
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json node scripts/seedDataFeeRegistry.js
 */

"use strict";

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

function getDb() { return admin.firestore(); }

const { dataFeeMarkupMultiplier } = require("../config/pricing");

const PROVIDERS = [
  {
    id: "attom",
    provider: "attom",
    display_name: "ATTOM Property Data",
    endpoint_pattern: "api.attomdata.com/*",
    current_cost_usd: 0.25,
    markup_multiplier: dataFeeMarkupMultiplier,
    notes: "ATTOM standard property pull. Review quarterly.",
  },
  {
    id: "nemsis",
    provider: "nemsis",
    display_name: "NEMSIS EMS Registry",
    endpoint_pattern: "nemsis.org/*",
    current_cost_usd: 0.15,
    markup_multiplier: dataFeeMarkupMultiplier,
    notes: "NEMSIS validation for EMS ePCR workers.",
  },
];

async function seed() {
  const db = getDb();
  const batch = db.batch();

  for (const p of PROVIDERS) {
    const ref = db.collection("data_fee_registry").doc(p.id);
    batch.set(ref, {
      provider: p.provider,
      display_name: p.display_name,
      endpoint_pattern: p.endpoint_pattern,
      current_cost_usd: p.current_cost_usd,
      markup_multiplier: p.markup_multiplier,
      charge_to_user: +(p.current_cost_usd * p.markup_multiplier).toFixed(4),
      last_reviewed: admin.firestore.FieldValue.serverTimestamp(),
      notes: p.notes,
    }, { merge: true });
  }

  await batch.commit();
  console.log(`Seeded ${PROVIDERS.length} providers into data_fee_registry`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
