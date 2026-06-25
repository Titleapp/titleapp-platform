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

// staff_credentials.role → display label
const ROLE_LABELS = {
  dvm_owner: "Owner · Lead Veterinarian",
  dvm_associate: "Associate Veterinarian",
  cvt_head: "Certified Vet Technician",
  vet_tech_trainee: "Veterinary Assistant",
  office_manager: "Practice Manager",
};

// Tenant scoping for the (global, un-tenanted) advisors collection: an advisor
// belongs to a tenant only if its inviter is a member of that tenant. Prevents
// SOCIII advisors (Kent, Eric) from leaking into customer HR (Sean, 2026-06-25).
async function tenantMemberUids(tenantId) {
  const snap = await getDb().collection("memberships").where("tenantId", "==", tenantId).limit(500).get();
  const uids = new Set();
  snap.forEach(d => { const u = d.data().userId; if (u) uids.add(u); });
  return uids;
}

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

  // Humans — sourced from the tenant's staff_credentials (the SAME single
  // source of truth the Staff Credentials worker uses). Tenant-scoped.
  if (!type || type === "human") {
    const staffSnap = await db.collection("staff_credentials").where("tenantId", "==", tenantId).limit(200).get();
    staffSnap.forEach(doc => {
      const d = doc.data();
      people.push({
        id: d.staff_id || doc.id,
        type: "human",
        name: d.full_name || null,
        email: d.email || null,
        role: ROLE_LABELS[d.role] || d.role || null,
        status: "active",
      });
    });
  }

  // Digital workers — tracked in hrSchedules for coverage.
  if (!type || type === "digital_worker") {
    const schedSnap = await db.collection("tenants").doc(tenantId)
      .collection("hrSchedules").where("memberType", "==", "digital_worker").limit(200).get();
    schedSnap.forEach(doc => {
      const d = doc.data();
      people.push({ id: d.memberId, type: "digital_worker", name: d.name || null, role: d.role || null, status: d.status || "active" });
    });
  }

  // Advisors — ONLY this tenant's (inviter is a member). No cross-tenant leak.
  if (!type || type === "advisor") {
    const memberUids = await tenantMemberUids(tenantId);
    if (memberUids.size) {
      const advisorSnap = await db.collection("advisors").limit(500).get();
      advisorSnap.forEach(doc => {
        const d = doc.data();
        if (!d.invitedBy || !memberUids.has(d.invitedBy)) return;
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
  }

  const summary = {
    humans: people.filter(p => p.type === "human").length,
    digital: people.filter(p => p.type === "digital_worker").length,
    advisors: people.filter(p => p.type === "advisor").length,
    employees: 0,
    contractors: 0,
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

  // Tenant onboardings — staff in training or with an in-progress credential
  // (e.g. Alex Torres mid-CVT-exam-prep). Real, tenant-scoped.
  const staffSnap = await db.collection("staff_credentials").where("tenantId", "==", tenantId).limit(200).get();
  staffSnap.forEach(doc => {
    const d = doc.data();
    const inProgress = Array.isArray(d.credentials) && d.credentials.find(c => c.status === "in_progress");
    const isTrainee = (d.role || "").includes("trainee");
    if (inProgress || isTrainee) {
      items.push({
        id: d.staff_id || doc.id,
        type: "human",
        name: d.full_name || null,
        role: ROLE_LABELS[d.role] || d.role || null,
        step: "in_training",
        note: inProgress ? inProgress.credential_name : "Onboarding in progress",
      });
    }
  });

  // Advisors mid-flow — tenant-scoped (no cross-tenant leak).
  const memberUids = await tenantMemberUids(tenantId);
  if (memberUids.size) {
    const advisorSnap = await db.collection("advisors").limit(200).get();
    advisorSnap.forEach(doc => {
      const d = doc.data();
      if (!d.invitedBy || !memberUids.has(d.invitedBy)) return;
      const step = d.flowStep || "created";
      if (step === "closed") return;
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
  }

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
  const obligations = [];

  // Credential-based obligations from the tenant's staff_credentials — real and
  // tenant-scoped (Alex Torres' overdue OSHA = hard-stop; DEA / CVT expiring =
  // soft-flag). Single source of truth shared with the Staff Credentials worker.
  const staffSnap = await db.collection("staff_credentials").where("tenantId", "==", tenantId).limit(200).get();
  staffSnap.forEach(doc => {
    const d = doc.data();
    (d.credentials || []).forEach(c => {
      if (c.status === "overdue") {
        obligations.push({
          type: "credential_overdue", severity: "hard_stop",
          memberId: d.staff_id, memberName: d.full_name, memberType: "human",
          action: `Renew ${c.credential_name} (overdue)`, ruleCite: c.issuing_body || "credentialing",
        });
      } else if (c.status === "expiring_soon") {
        obligations.push({
          type: "credential_expiring", severity: "soft_flag",
          memberId: d.staff_id, memberName: d.full_name, memberType: "human",
          action: `${c.credential_name} expires${c.days_remaining != null ? ` in ${c.days_remaining}d` : " soon"}`,
          ruleCite: c.issuing_body || "credentialing",
        });
      }
    });
  });

  // Advisor obligations — tenant-scoped (no cross-tenant leak).
  const memberUids = await tenantMemberUids(tenantId);
  if (memberUids.size) {
    const advisorSnap = await db.collection("advisors").limit(200).get();
    advisorSnap.forEach(doc => {
      const d = doc.data();
      if (!d.invitedBy || !memberUids.has(d.invitedBy)) return;
      const step = d.flowStep || "created";
      if (step === "closed") return;
      if (d.kycStatus !== "verified") {
        obligations.push({ type: "identity_verification", severity: "hard_stop", memberId: d.advisorId || doc.id, memberName: d.name || d.email, memberType: "advisor", action: "Run Stripe Identity verification", ruleCite: "SOCIII advisor onboarding policy" });
      }
      if (d.kycStatus === "verified" && step !== "signature_complete") {
        obligations.push({ type: "advisor_agreement_signature", severity: "hard_stop", memberId: d.advisorId || doc.id, memberName: d.name || d.email, memberType: "advisor", action: "Send / complete advisor agreement signing packet", ruleCite: "Cap-table integrity" });
      }
    });
  }

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
