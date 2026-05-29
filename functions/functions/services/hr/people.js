"use strict";

/**
 * hr/people.js — Unified roster aggregator for HR worker.
 *
 * HR is the unifying surface across people types:
 *   - employees     (W-2 employees, future)
 *   - contractors   (1099, future)
 *   - advisors      (read from advisors/ collection — owned by IR advisorFlow.js)
 *   - digital_workers (read from hrSchedules where memberType=digital_worker)
 *
 * For now the canonical sources of truth are:
 *   - advisors/         (services/ir/advisorFlow.js writes here)
 *   - hrSchedules/      (services/hr/schedule.js writes here)
 *
 * Future: hrEmployees/ + hrContractors/ collections when those flows ship.
 *
 * This module does NOT mutate state — pure read + aggregate.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  ROSTER
// ═══════════════════════════════════════════════════════════════

/**
 * List everyone the tenant treats as "people" — humans + digital workers.
 *
 * Returns:
 *   {
 *     summary: { humans, digital, advisors, employees, contractors, total },
 *     people: [
 *       { id, type, name, email, role, status, onboardingStep?, kycStatus? }
 *     ]
 *   }
 */
async function listPeople(tenantId, { type = null } = {}) {
  if (!tenantId) throw new Error("listPeople: tenantId required");
  const db = getDb();
  const people = [];

  // Advisors — global collection, filtered by tenant if invitedBy/tenantId field present.
  // For SOCIII Day-0 we treat the platform tenant as the owner of all advisors.
  if (!type || type === "advisor") {
    const advisorSnap = await db.collection("advisors").limit(500).get();
    advisorSnap.forEach(doc => {
      const d = doc.data();
      people.push({
        id: d.advisorId || doc.id,
        type: "advisor",
        name: d.name || null,
        email: d.email || null,
        role: d.advisorRole || "Advisor",
        status: d.flowStep || "created",
        equityPct: d.equityPct || null,
        kycStatus: d.kycStatus || "not_submitted",
        invitedAt: d.invitedAt || null,
      });
    });
  }

  // HR schedules — humans + digital workers tracked for coverage.
  if (!type || type === "human" || type === "digital_worker") {
    const schedSnap = await db.collection("tenants").doc(tenantId)
      .collection("hrSchedules").limit(500).get();
    schedSnap.forEach(doc => {
      const d = doc.data();
      if (type && d.memberType !== type) return;
      people.push({
        id: d.memberId,
        type: d.memberType, // "human" or "digital_worker"
        name: d.name || null,
        email: null,
        role: d.role || null,
        status: d.status || "active",
        onCall: !!d.onCall,
        timezone: d.timezone || null,
      });
    });
  }

  const summary = {
    humans: people.filter(p => p.type === "human").length,
    digital: people.filter(p => p.type === "digital_worker").length,
    advisors: people.filter(p => p.type === "advisor").length,
    employees: people.filter(p => p.type === "employee").length,
    contractors: people.filter(p => p.type === "contractor").length,
    total: people.length,
  };

  return { summary, people };
}

// ═══════════════════════════════════════════════════════════════
//  ONBOARDING PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Show in-flight onboardings across all people types.
 * Currently pulls from advisors/ (anyone not in flowStep=closed).
 */
async function listOnboardings(tenantId) {
  const db = getDb();
  const items = [];

  const advisorSnap = await db.collection("advisors").limit(200).get();
  advisorSnap.forEach(doc => {
    const d = doc.data();
    const step = d.flowStep || "created";
    if (step === "closed") return; // skip closed
    items.push({
      id: d.advisorId || doc.id,
      type: "advisor",
      name: d.name || null,
      email: d.email || null,
      step,
      kycStatus: d.kycStatus || "not_submitted",
      invitedAt: d.invitedAt || null,
      role: d.advisorRole || "Advisor",
    });
  });

  // Sort: earliest invited first.
  items.sort((a, b) => {
    const ta = a.invitedAt?.seconds || 0;
    const tb = b.invitedAt?.seconds || 0;
    return ta - tb;
  });

  return { items, count: items.length };
}

// ═══════════════════════════════════════════════════════════════
//  COMPLIANCE OBLIGATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the set of open HR compliance obligations for the tenant.
 *
 * V1 implementation: structural surface only. Returns ruleset + per-person
 * obligation status pulled from advisors collection. Real evaluation against
 * tenant state (headcount triggers, deadline windows, doc presence) is a
 * follow-up — for now we list what's required so the canvas can render and
 * the user/counsel can see the surface.
 */
async function getComplianceStatus(tenantId) {
  const db = getDb();

  // Pull the ruleset for citation/labels.
  // Note: we don't load the JSON at runtime here — the canvas can request the
  // ruleset directly via /v1/raas:ruleset:get if it needs full text.
  const obligations = [];

  // Advisor pipeline obligations — anyone past invited but not closed has KYC + signing gates.
  const advisorSnap = await db.collection("advisors").limit(200).get();
  advisorSnap.forEach(doc => {
    const d = doc.data();
    const step = d.flowStep || "created";
    if (step === "closed") return;

    // KYC obligation (Stripe Identity, free for advisors).
    if (d.kycStatus !== "verified") {
      obligations.push({
        type: "identity_verification",
        severity: "hard_stop",
        memberId: d.advisorId || doc.id,
        memberName: d.name || d.email,
        memberType: "advisor",
        action: "Run Stripe Identity verification",
        ruleCite: "SOCIII advisor onboarding policy",
      });
    }

    // Signature obligation.
    if (d.kycStatus === "verified" && step !== "signature_complete" && step !== "closed") {
      obligations.push({
        type: "advisor_agreement_signature",
        severity: "hard_stop",
        memberId: d.advisorId || doc.id,
        memberName: d.name || d.email,
        memberType: "advisor",
        action: "Send / complete advisor agreement signing packet",
        ruleCite: "Cap-table integrity",
      });
    }
  });

  return {
    rulesetId: "platform_hr_compliance_v1",
    obligationsCount: obligations.length,
    obligations,
  };
}

module.exports = {
  listPeople,
  listOnboardings,
  getComplianceStatus,
};
