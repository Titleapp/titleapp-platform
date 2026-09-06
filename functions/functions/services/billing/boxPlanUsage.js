"use strict";

/**
 * boxPlanUsage.js — CODEX 76, corrected scope (2026-08-28).
 *
 * What CODEX 76 originally assumed vs. what's actually true, verified this
 * session before writing any code (same discipline as CODEX 79/81 — don't
 * build on a stale citation):
 *
 *   - `billing/trackUsage.js` is DEAD CODE. Nothing in this codebase calls
 *     `trackUsage()`. It was never the real per-call overage checkpoint.
 *   - `billing/usageProcessor.js`'s `processUsageEvents` is real and live
 *     (runs hourly), but it's scoped to Document Control events (e-signature,
 *     blockchain records) — a different subsystem entirely, unrelated to AI
 *     chat/tutoring usage.
 *   - Box-plan SEAT COUNT overage (more active students than the included 5)
 *     is already real and already institution-billed: `seatSync.js` pushes
 *     the tenant's active-member count to a tiered Stripe seat price on the
 *     TENANT's own subscription, quarterly. That part of "institution pays,
 *     not the individual" already works.
 *   - What does NOT exist anywhere: any tracking of AI-interaction VOLUME
 *     per student/tenant for Box-plan tenants. A tenant with 5 included
 *     students who each send 10,000 messages a month has that entirely
 *     absorbed into the flat $99 + seat fee today, with zero visibility and
 *     zero cost containment. This is the actual version of Sean's worry
 *     ("success with students = financial risk") — not seat growth, which
 *     is already handled, but interaction VOLUME within existing seats.
 *
 * What this module ships: VISIBILITY, not automated billing. Records
 * interaction counts per tenant and reports actual-vs-included usage to the
 * tenant's contact monthly (CODEX 76 §4 — "heavy usage is success, framed
 * positively, never a surprise"). It does NOT charge Stripe. Automating that
 * requires a real Stripe metered price (none exists in config/stripeBoxes.js
 * today) and an explicit rate decision from Sean — not something to wire
 * silently into live billing for existing paying tenants. See CODEX 76 §5
 * for exactly what's still open before that's safe to build.
 */

const admin = require("firebase-admin");
const pricing = require("../../config/pricing");

function monthKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Best-effort, non-blocking. Called once per chat turn for every tenant —
 * deliberately does NOT check box-plan status first (that would cost an
 * extra Firestore read on every chat message just to decide whether to
 * write a cheap counter doc). Box-plan filtering happens at report time
 * instead (§ generateMonthlyReports), against the much smaller list of
 * actual box-plan tenants.
 */
async function recordInteraction(db, tenantId) {
  if (!tenantId) return;
  try {
    const key = monthKey();
    await db.collection("boxPlanUsage").doc(`${tenantId}_${key}`).set({
      tenantId,
      monthKey: key,
      totalInteractions: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error("[boxPlanUsage] recordInteraction failed (non-blocking):", err.message);
  }
}

/**
 * Compute one tenant's actual-vs-included usage for a given month.
 * Allowance math sourced from config/pricing.js's businessInABox/education
 * blocks (includedStudents/includedSeats × includedCreditsPerStudent/Seat)
 * — CODEX 76's intended source of truth for the allowance numbers. Note:
 * this is NOT necessarily wired to the live Stripe price in
 * config/stripeBoxes.js yet (§ header above) — this function computes the
 * number, it does not charge anyone.
 */
async function computeTenantUsage(db, tenantDoc, key) {
  const tenantId = tenantDoc.id;
  const t = tenantDoc.data();
  const planType = t.boxPlanType === "education" ? "education" : "businessInABox";
  const cfg = pricing[planType] || pricing.businessInABox;

  const memSnap = await db.collection("memberships")
    .where("tenantId", "==", tenantId).where("status", "==", "active").get();
  const activeMembers = Math.max(1, memSnap.size);

  const includedPerMember = planType === "education" ? cfg.includedCreditsPerStudent : cfg.includedCreditsPerSeat;
  const includedTotal = activeMembers * (includedPerMember || 0);

  const usageSnap = await db.collection("boxPlanUsage").doc(`${tenantId}_${key}`).get();
  const actualTotal = usageSnap.exists ? (usageSnap.data().totalInteractions || 0) : 0;

  const perOverageUnit = planType === "education" ? cfg.perActiveStudentMonthly : cfg.perActiveSeatMonthly;
  const overageUnits = Math.max(0, actualTotal - includedTotal);
  // Rough, visibility-only estimate — NOT a real Stripe-metered rate, since
  // no per-interaction overage price exists yet. Framed as "if this were
  // billed at the per-seat overage rate," not as an actual charge.
  const estimatedOverageAmount = includedPerMember
    ? round2((overageUnits / includedPerMember) * (perOverageUnit || 0))
    : 0;

  return {
    tenantId,
    monthKey: key,
    planType,
    activeMembers,
    includedTotal,
    actualTotal,
    overageUnits,
    estimatedOverageAmount,
    billingEmail: t.billingEmail || t.contactEmail || null,
    tenantName: t.name || tenantId,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

module.exports = { recordInteraction, computeTenantUsage, monthKey };
