"use strict";
// seedMsrServicing.js — CODEX S52.60, Phase 1. Registers the MSR Servicing &
// Compliance Worker and seeds a demo licensee (placeholder name "Meridian
// Loan Servicing" — Mike's real entity name is a Sean's-call open question,
// trivial to rename once known) with demo loan/licensing/audit data.
//
// All loan data below is clearly fictional, seeded to exercise the
// msr_servicing_v1.json ruleset's hard stops and soft flags — not real
// borrower data. Federal citations only (CODEX S52.60 §2); no state rules.
//
// Idempotent — safe to run more than once.
//
// Run from functions/functions/:
//   node scripts/demo/seedMsrServicing.js
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TENANT_ID = "demo-meridian-servicing-001";
const WORKER_SLUG = "msr-servicing-001";
const COMPLIANCE_OFFICER_UID = "demo-msr-compliance-001";
const BORROWER_UID = "demo-msr-borrower-001";

const daysAgo = (n) => {
  const d = new Date("2026-08-21T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};
const daysFromNow = (n) => {
  const d = new Date("2026-08-21T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  console.log("═══ seedMsrServicing.js — CODEX S52.60 ═══\n");

  // ── 1. Register the worker ──────────────────────────────────────────
  await db.collection("digitalWorkers").doc(WORKER_SLUG).set({
    worker_id: WORKER_SLUG,
    name: "MSR Servicing & Compliance",
    display_name: "MSR Servicing & Compliance",
    persona_name: "Dana",
    short_description: "Reg X/Reg Z servicing compliance engine — early intervention, loss mitigation, error resolution, escrow, force-placed insurance, payment crediting. Federal rules only, Phase 1 (CODEX S52.60).",
    description: "Automates mortgage servicing compliance against 8 independently-verified federal citations (12 CFR 1024.17/.35/.36/.37/.39/.41(c), 12 CFR 1026.36(c)(1)(i)/.41). Never issues a loss-mitigation decision itself (human call), never fabricates a compliance deadline, blocks force-placed insurance charges and escrow overcharges that violate the cap. State-law layer intentionally not included yet — see CODEX S52.60 §7.",
    vertical: "mortgage-servicing",
    codex: "S52.60",
    tagline: "Reg X/Reg Z servicing compliance, federal rules only — every rule cited, nothing invented.",
    tags: ["msr", "mortgage-servicing", "compliance", "reg-x", "reg-z", "respa", "tila"],
    revenue_model: "per_transaction",
    price_tier: "TBD",
    suite: "mortgage-servicing",
    tenantId: "platform",
    status: "active",
    visibility: "org-only",
    canvasTabs: [
      { id: "portfolio", label: "Portfolio", signal: "card:msr-portfolio", default: true, order: 0 },
      { id: "delinquency-queue", label: "Delinquency Queue", signal: "card:msr-delinquency-queue", order: 1 },
      { id: "loss-mitigation", label: "Loss Mitigation", signal: "card:msr-loss-mitigation", order: 2 },
      { id: "error-resolution", label: "NOE / RFI Tracker", signal: "card:msr-error-resolution", order: 3 },
      { id: "escrow", label: "Escrow", signal: "card:msr-escrow", order: 4 },
      { id: "licensing", label: "State Licensing", signal: "card:msr-licensing", order: 5 },
      { id: "audit-log", label: "Compliance Audit Log", signal: "card:msr-audit-log", order: 6 },
    ],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`  ✓ digitalWorkers/${WORKER_SLUG} — Dana, MSR Servicing & Compliance`);

  // ── 2. Demo licensee tenant ──────────────────────────────────────────
  await db.collection("tenants").doc(TENANT_ID).set({
    id: TENANT_ID,
    type: "org",
    vertical: "mortgage-servicing",
    name: "Meridian Loan Servicing", // placeholder — rename once Mike's real entity name is set (CODEX S52.60 §8)
    tagline: "Mortgage servicing, done by the rules.",
    status: "active",
    plan: "business",
    activeWorkers: [WORKER_SLUG, "platform-accounting", "platform-hr", "platform-marketing", "platform-contacts"],
    chiefOfStaff: { enabled: true, name: "Alex", unlockedAt: new Date().toISOString() },
    isDemo: true,
  }, { merge: true });
  console.log(`  ✓ tenants/${TENANT_ID} — Meridian Loan Servicing (placeholder name)`);

  await db.collection("memberships").doc(`${COMPLIANCE_OFFICER_UID}_${TENANT_ID}`).set({
    userId: COMPLIANCE_OFFICER_UID, uid: COMPLIANCE_OFFICER_UID, tenantId: TENANT_ID,
    role: "admin", status: "active", isDemo: true,
  }, { merge: true });
  console.log(`  ✓ memberships — compliance officer admin`);

  // ── 3. Demo loans — each exercises a different rule ─────────────────
  const loans = [
    {
      id: "msr-loan-001",
      borrowerUid: BORROWER_UID,
      borrowerName: "Denise Okafor",
      propertyAddress: "1420 Willow Bend Ct, Round Rock, TX 78681",
      upb: 284500,
      status: "delinquent",
      delinquencyStartDate: daysAgo(34), // 2 days from the day-36 live-contact trigger
      liveContactLoggedAt: null,
      writtenNoticeLoggedAt: null,
      ceaseCommunication: false,
      escrowAnnualTotal: 9600,
      escrowShortage: 0,
      hasActiveForbearance: false,
    },
    {
      id: "msr-loan-002",
      borrowerUid: null,
      borrowerName: "Marcus Whitfield",
      propertyAddress: "88 Fentress Ln, Cedar Park, TX 78613",
      upb: 198750,
      status: "delinquent",
      delinquencyStartDate: daysAgo(44), // 1 day from the day-45 written-notice trigger
      liveContactLoggedAt: daysAgo(8),
      writtenNoticeLoggedAt: null,
      ceaseCommunication: false,
      escrowAnnualTotal: 7200,
      escrowShortage: 900, // > one month's deposit (600) — trips msr-escrow-shortage-threshold
      hasActiveForbearance: false,
    },
    {
      id: "msr-loan-003",
      borrowerUid: null,
      borrowerName: "Priya Subramaniam",
      propertyAddress: "672 Lantana Ridge, Georgetown, TX 78628",
      upb: 341200,
      status: "current",
      delinquencyStartDate: null,
      liveContactLoggedAt: null,
      writtenNoticeLoggedAt: null,
      ceaseCommunication: true, // FDCPA hard stop test case
      escrowAnnualTotal: 11400,
      escrowShortage: 0,
      hasActiveForbearance: false,
      // Force-placed insurance self-service story (borrower capability #2) —
      // Priya is "current" status, so this gives her a second, distinct
      // storyline instead of piling onto the two delinquent loans above.
      forcePlacedInsuranceActive: true,
      forcePlacedNoticeDate: daysAgo(20),
    },
  ];
  for (const loan of loans) {
    const { id, ...data } = loan;
    await db.collection("msrLoans").doc(id).set({ ...data, tenantId: TENANT_ID, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log(`  ✓ msrLoans/${id} — ${loan.borrowerName}, ${loan.status}`);
  }

  // ── 4. NOE/RFI tracker — one approaching deadline ───────────────────
  await db.collection("msrLoans").doc("msr-loan-002").collection("errorRequests").doc("noe-001").set({
    type: "notice_of_error",
    subject: "Disputed late fee assessed during active forbearance review",
    receivedDate: daysAgo(28),
    acknowledgedDate: daysAgo(27),
    responseDeadline: daysFromNow(2), // within the 3-business-day soft-flag window
    responseLogged: false,
    tenantId: TENANT_ID,
  }, { merge: true });
  console.log(`  ✓ msrLoans/msr-loan-002/errorRequests/noe-001 — response due in 2 days, not yet logged`);

  // ── 4b. Loss mitigation — one hardship request in progress ───────────
  // Fixed doc id, replacing the ad hoc test entry created while QA-testing
  // the borrower portal's live submit flow (real write, real uid, just not
  // demo-polished copy) — this is that same real flow, seeded cleanly.
  // Document checklist (borrower capability #3) backfilled onto the existing
  // seeded request. Note: re-running this script resets documentsSubmitted to
  // [] (Firestore merge:true replaces array fields wholesale, it doesn't
  // union them) — same as every other seed field here, this script always
  // resets the demo back to its scripted starting state.
  const REQUIRED_HARDSHIP_DOCUMENTS = [
    "Hardship affidavit or explanation letter",
    "Two most recent pay stubs or proof of income",
    "Most recent bank statement",
    "Most recent tax return (if self-employed)",
  ];
  await db.collection("msrLoans").doc("msr-loan-001").collection("hardshipRequests").doc("hardship-001").set({
    reason: "Reduced work hours since June due to a schedule change at my employer — asking about a temporary repayment plan to catch up.",
    status: "submitted",
    documentsRequired: REQUIRED_HARDSHIP_DOCUMENTS,
    documentsSubmitted: [],
    submittedByUid: BORROWER_UID,
    tenantId: TENANT_ID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`  ✓ msrLoans/msr-loan-001/hardshipRequests/hardship-001 — Denise Okafor, submitted`);

  // ── 5. State licensing tracker — schema populated, one demo state ───
  await db.collection("tenants").doc(TENANT_ID).collection("msrLicensing").doc("TX").set({
    state: "TX",
    licenseStatus: "active",
    licenseNumber: "MSR-TX-2026-04471",
    renewalDate: "2027-03-01",
    heightenedScrutiny: false, // placeholder — real state-enforcement-posture tracking is Phase 3, not sourced yet
    tenantId: TENANT_ID,
  }, { merge: true });
  console.log(`  ✓ tenants/${TENANT_ID}/msrLicensing/TX — active, renews 2027-03-01`);

  // ── 6. Compliance audit events — append-only, a few seed entries ───
  const events = [
    { id: "evt-001", loanId: "msr-loan-001", type: "rule_check", ruleId: "msr-early-intervention-two-triggers", outcome: "flagged", note: "Live-contact deadline in 2 days, not yet logged.", occurredAt: daysAgo(1) },
    { id: "evt-002", loanId: "msr-loan-002", type: "rule_check", ruleId: "msr-escrow-shortage-threshold", outcome: "flagged", note: "Escrow shortage $900 exceeds one month's deposit ($600).", occurredAt: daysAgo(3) },
    { id: "evt-003", loanId: "msr-loan-003", type: "rule_check", ruleId: "msr-cease-communication-respected", outcome: "blocked", note: "Outreach attempt blocked — active cease-communication flag on file.", occurredAt: daysAgo(5) },
  ];
  for (const e of events) {
    const { id, ...data } = e;
    await db.collection("msrComplianceEvents").doc(id).set({ ...data, tenantId: TENANT_ID, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log(`  ✓ msrComplianceEvents/${id} — ${e.ruleId}: ${e.outcome}`);
  }

  console.log("\n═══ Done ═══");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
