"use strict";
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() { return admin.firestore(); }

const PROMO_CODES = [
  { code: "AUTOLAUNCH", discount: 100, type: "percent", duration: "repeating", duration_in_months: 2, description: "First 2 months free — auto dealer workers", vertical: "auto" },
  { code: "TITLELAUNCH", discount: 100, type: "percent", duration: "repeating", duration_in_months: 2, description: "First 2 months free — title/escrow workers", vertical: "title-escrow" },
  { code: "PMLAUNCH", discount: 100, type: "percent", duration: "repeating", duration_in_months: 2, description: "First 2 months free — property management workers", vertical: "property-management" },
  { code: "PILOT3FREE", discount: 100, type: "percent", duration: "repeating", duration_in_months: 3, description: "First 3 months free — Pilot Pro", vertical: "pilot" },
  { code: "DEV100", discount: 100, type: "percent", duration: "repeating", duration_in_months: 3, description: "100 days free — Developer Platform", vertical: "developers" },
  { code: "FOUNDER100", discount: 100, type: "percent", duration: "repeating", duration_in_months: 6, description: "Founder — 6 months free on all products", vertical: null },
  { code: "EARLYBIRD50", discount: 50, type: "percent", duration: "repeating", duration_in_months: 6, description: "Early bird — 50% off for 6 months", vertical: null },
  { code: "COMEBACK20", discount: 20, type: "percent", duration: "repeating", duration_in_months: 3, description: "Welcome back — 20% off for 3 months", vertical: null },
  { code: "DEMO30", discount: 100, type: "percent", duration: "repeating", duration_in_months: 1, description: "Post-demo — 1 month free", vertical: null },
];

exports.setupPromoCodes = onRequest({ cors: true }, async (req, res) => {
  try {
    const { secret } = req.body || {};
    if (secret !== "titleapp-seed-2026") {
      return res.status(403).json({ ok: false, error: "Invalid secret" });
    }

    const db = getDb();

    // Idempotency check
    const configDoc = await db.doc("config/promoCodes").get();
    if (configDoc.exists && configDoc.data().initialized) {
      return res.json({ ok: true, message: "Promo codes already initialized", codes: configDoc.data().codes });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ ok: false, error: "STRIPE_SECRET_KEY not configured" });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const created = [];

    for (const promo of PROMO_CODES) {
      // Create Stripe Coupon
      const couponParams = {
        name: promo.code,
        percent_off: promo.type === "percent" ? promo.discount : undefined,
        duration: promo.duration,
        duration_in_months: promo.duration === "repeating" ? promo.duration_in_months : undefined,
        metadata: { code: promo.code, vertical: promo.vertical || "all" },
      };

      const coupon = await stripe.coupons.create(couponParams);

      // Also create a Promotion Code in Stripe so customers can enter the code at checkout
      const promoCodeObj = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code: promo.code,
        active: true,
      });

      // Write to Firestore
      await db.doc(`promoCodes/${promo.code}`).set({
        stripeId: coupon.id,
        stripePromoCodeId: promoCodeObj.id,
        discount: promo.discount,
        type: promo.type,
        duration: promo.duration,
        duration_in_months: promo.duration_in_months || null,
        description: promo.description,
        active: true,
        redemptionCount: 0,
        vertical: promo.vertical,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      created.push(promo.code);
      console.log(`Created promo code: ${promo.code} (coupon: ${coupon.id})`);
    }

    // Save config
    await db.doc("config/promoCodes").set({
      initialized: true,
      codes: created,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, created });
  } catch (err) {
    console.error("setupPromoCodes error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
