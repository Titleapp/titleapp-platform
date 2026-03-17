/**
 * pricingAudit.js — 34.1 Pricing Audit and Floor Enforcement
 *
 * Queries Firestore workers for invalid prices ($9/$14/$19),
 * migrates to approved tiers, and adds bogoEligible flag.
 *
 * Migration rules:
 *   $9  → Free ($0)
 *   $14 → $29
 *   $19 → $29
 *
 * Also sets bogoEligible: true for platform-built workers
 * (creatorId === 'titleapp-platform'), false for creator-built.
 *
 * Deployed as Cloud Function: POST /admin/pricingAudit
 * Requires: x-admin-key header matching ADMIN_KEY env var
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const PRICE_MIGRATION = {
  9:  0,   // $9 → Free
  14: 29,  // $14 → $29
  19: 29,  // $19 → $29
};

const APPROVED_PRICES = [0, 29, 49, 79];

async function runPricingAudit(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  const dryRun = req.query.dryRun === "true";
  const db = getDb();

  const report = {
    dryRun,
    totalAudited: 0,
    alreadyCorrect: 0,
    migrated: { from9: 0, from14: 0, from19: 0 },
    flaggedForReview: [],
    bogoSet: { platform: 0, creator: 0 },
    details: [],
  };

  try {
    // ── 1. Audit `workers` collection (creator workers) ──
    const workersSnap = await db.collection("workers").get();
    for (const doc of workersSnap.docs) {
      const data = doc.data();
      report.totalAudited++;

      const price = data.monthlyPrice || data.price || data.pricingTier || 0;
      const numPrice = Number(price);
      const isPlatform = data.creatorId === "titleapp-platform";

      // Check for invalid price
      if (PRICE_MIGRATION[numPrice] !== undefined) {
        const newPrice = PRICE_MIGRATION[numPrice];
        report.details.push({
          id: doc.id,
          name: data.name || data.title || "unnamed",
          vertical: data.vertical || "unknown",
          oldPrice: numPrice,
          newPrice,
          collection: "workers",
          action: `$${numPrice} → $${newPrice}`,
        });

        if (numPrice === 9) report.migrated.from9++;
        else if (numPrice === 14) report.migrated.from14++;
        else if (numPrice === 19) report.migrated.from19++;

        if (!dryRun) {
          await doc.ref.update({
            monthlyPrice: newPrice,
            pricingTier: newPrice === 0 ? 0 : newPrice === 29 ? 1 : newPrice === 49 ? 2 : 3,
            _priceMigratedFrom: numPrice,
            _priceMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
            bogoEligible: isPlatform,
          });
        }
      } else if (!APPROVED_PRICES.includes(numPrice) && numPrice > 0) {
        // Unknown price — flag for manual review
        report.flaggedForReview.push({
          id: doc.id,
          name: data.name || data.title || "unnamed",
          vertical: data.vertical || "unknown",
          price: numPrice,
          collection: "workers",
        });
      } else {
        // Already correct
        report.alreadyCorrect++;

        // Always enforce bogoEligible based on creatorId — never trust existing value
        const correctBogo = isPlatform;
        if (data.bogoEligible !== correctBogo && !dryRun) {
          await doc.ref.update({ bogoEligible: correctBogo });
          if (!correctBogo && data.bogoEligible === true) {
            report.details.push({
              id: doc.id,
              name: data.name || data.title || "unnamed",
              collection: "workers",
              action: "bogoEligible: true → false (non-platform creator)",
            });
          }
        }
      }

      // Count bogo
      if (isPlatform) report.bogoSet.platform++;
      else report.bogoSet.creator++;
    }

    // ── 2. Audit `raasCatalog` collection ──
    const catalogSnap = await db.collection("raasCatalog").get();
    for (const doc of catalogSnap.docs) {
      const data = doc.data();
      report.totalAudited++;

      const priceTier = data.price_tier || "FREE";
      const numPrice = parseInt(String(priceTier).replace(/[^0-9]/g, ""), 10) || 0;

      if (PRICE_MIGRATION[numPrice] !== undefined) {
        const newPrice = PRICE_MIGRATION[numPrice];
        const newTierDisplay = newPrice === 0 ? "FREE" : `$${newPrice}`;

        report.details.push({
          id: doc.id,
          name: data.name || "unnamed",
          vertical: data.vertical || "unknown",
          oldPrice: numPrice,
          newPrice,
          collection: "raasCatalog",
          action: `$${numPrice} → ${newTierDisplay}`,
        });

        if (numPrice === 9) report.migrated.from9++;
        else if (numPrice === 14) report.migrated.from14++;
        else if (numPrice === 19) report.migrated.from19++;

        if (!dryRun) {
          await doc.ref.update({
            price_tier: newTierDisplay,
            _priceMigratedFrom: priceTier,
            _priceMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } else if (!APPROVED_PRICES.includes(numPrice) && numPrice > 0) {
        report.flaggedForReview.push({
          id: doc.id,
          name: data.name || "unnamed",
          vertical: data.vertical || "unknown",
          price: numPrice,
          collection: "raasCatalog",
        });
      } else {
        report.alreadyCorrect++;
      }
    }

    // ── 3. Audit `digitalWorkers` collection ──
    const dwSnap = await db.collection("digitalWorkers").get();
    for (const doc of dwSnap.docs) {
      const data = doc.data();
      report.totalAudited++;

      const numPrice = data.pricing_tier !== undefined ? Number(data.pricing_tier) : 0;

      if (PRICE_MIGRATION[numPrice] !== undefined) {
        const newPrice = PRICE_MIGRATION[numPrice];
        report.details.push({
          id: doc.id,
          name: data.display_name || data.name || "unnamed",
          vertical: data.vertical || "unknown",
          oldPrice: numPrice,
          newPrice,
          collection: "digitalWorkers",
          action: `$${numPrice} → $${newPrice}`,
        });

        if (numPrice === 9) report.migrated.from9++;
        else if (numPrice === 14) report.migrated.from14++;
        else if (numPrice === 19) report.migrated.from19++;

        if (!dryRun) {
          await doc.ref.update({
            pricing_tier: newPrice,
            _priceMigratedFrom: numPrice,
            _priceMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } else {
        report.alreadyCorrect++;
      }
    }

    console.log("[pricingAudit] Report:", JSON.stringify(report, null, 2));
    return res.json({ ok: true, ...report });
  } catch (e) {
    console.error("[pricingAudit] Error:", e);
    return res.status(500).json({ ok: false, error: e.message, code: "INTERNAL_ERROR" });
  }
}

module.exports = { runPricingAudit };
