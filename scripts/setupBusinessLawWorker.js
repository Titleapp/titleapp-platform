/**
 * setupBusinessLawWorker.js
 *
 * Bootstrap script for the Business Law / Paralegal worker (BIZ-LAW-001).
 *
 * Modes:
 *   --worker           Upsert the digitalWorkers/business-law document.
 *   --list-tenants     List workspaces (tenants) the caller belongs to.
 *                      Requires --uid <FIREBASE_UID>.
 *   --subscribe        Subscribe a tenant to the Business Law worker.
 *                      Requires --tenant <TENANT_ID>.
 *   --wind-down        Seed TitleApp LLC wind-down obligations into the
 *                      customObligations collection for the target tenant.
 *                      Requires --tenant <TENANT_ID>.
 *
 * All modes can be combined in one invocation. Example for end-to-end:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/setupBusinessLawWorker.js \
 *       --worker --subscribe --wind-down --tenant <titleapp-llc-tenant-id>
 *
 * Idempotent — uses { merge: true } and existence checks so it's safe to re-run.
 */

// Resolve firebase-admin from the functions package (the only node_modules
// install in this repo). Scripts in /scripts/ run from the repo root.
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const WORKER_SLUG = "business-law";
const WORKER_CATALOG_ID = "BIZ-LAW-001";

const WORKER_DOC = {
  id: WORKER_SLUG,
  worker_id: WORKER_SLUG,
  catalogSlug: WORKER_SLUG,
  catalogId: WORKER_CATALOG_ID,
  name: "Business Law",
  shortName: "Business Law",
  display_name: "Business Law",

  vertical: "legal",
  suite: "Legal",
  category: "Legal",
  industry: "legal",
  state: null,
  tags: ["legal", "paralegal", "entity-lifecycle", "signatures", "audit-trail", "governance"],

  description:
    "Paralegal-grade business law worker. Generates entity documents (formation, governance, dissolution), " +
    "tracks filings + deadlines with the SoS, orchestrates signatures via Dropbox Sign, and stores everything " +
    "with an audit trail. Operates under user-counsel attestation — TitleApp is a platform, not a law firm.",
  shortDescription:
    "Entity docs + filings + signatures + audit trail. Counsel-attested.",
  tagline: "Your paralegal who never misses a filing.",
  capabilitySummary:
    "Document templates (Action by Written Consent, Certificate of Cancellation, Promissory Notes, " +
    "Creditor Notice, Operating Agreement, Officer Consent, Board Consent). Signature orchestration " +
    "(Dropbox Sign). Filing deadline tracker (Delaware SoS, BOI, foreign quals). Audit trail with " +
    "Coinbase Base anchor when online. Multi-entity: one worker handles every company you're in.",

  price: 0,
  pricing_tier: 0,
  priceDisplay: "Free",
  trialDays: 0,

  status: "live",
  featured: false,
  published: true,

  subscriberCount: 0,
  totalRevenue: 0,
  rating: null,
  reviewCount: 0,

  creatorId: "sociii-internal",
  creatorName: "SOCIII",
  cloneOf: null,

  type: "platform-adjacent",
  workerType: "legal-paralegal",
  temporalType: "always_on",

  raasConfigId: null,

  // canvasTabs are picked up by the canvasTabs.js helper (see SPINE-style
  // entry added there). Leaving null here lets the generator fill defaults.
  canvasTabs: null,

  marketing: {
    landingPageCopy: null,
    linkedInPost: null,
    tiktokScript: null,
    googleAdsKeywords: null,
    emailSequence: null,
    generatedAt: null,
  },

  createdAt: ts(),
  updatedAt: ts(),
};

// LLC wind-down obligations — derived from
//   ~/Downloads/LLC-Wind-Down-Filing-Tracker-2026-05-26.txt
//
// T+0 etc. are anchored on the Consent execution date. For seeding purposes
// we assume Consent fully executed 2026-05-29 (target window 2026-05-28 to
// 2026-05-30). Sean can adjust by editing the obligation doc once Consent
// fully signs.
//
// All dates use ISO YYYY-MM-DD. Keys are stable so completions match against
// them on idempotent re-runs.
function llcWindDownObligations({ tenantId, consentExecuted = "2026-05-29" }) {
  const base = new Date(consentExecuted + "T00:00:00Z");
  const addDays = (n) => {
    const d = new Date(base.getTime());
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  return [
    {
      obligationKey: "llc_wind_down:consent_circulate",
      label: "Circulate Action by Written Consent",
      detail:
        "Send Action by Written Consent of the Managing Members via DocuSign to Kent + Mike. " +
        "Target: within 24-48 hrs of Kent + Mike confirming.",
      dueDate: addDays(0),
      severity: "amber",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:consent_fully_executed",
      label: "Confirm Consent fully executed by all 3 Managing Members",
      detail:
        "Sean + Kent + Mike signatures captured. Store fully-executed PDF in Drive: " +
        "/TitleApp LLC/Wind-Down/Action-by-Written-Consent-EXECUTED.pdf",
      dueDate: addDays(2),
      severity: "amber",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:creditor_notice_mailed",
      label: "Mail + email creditor notice to known claimants",
      detail:
        "Send Notice to Vendors/Creditors by both email AND U.S. mail to known creditors " +
        "(vendors with unpaid invoices, Allen Overy Shearman Sterling, registered agent file copy). " +
        "Keep delivery receipts. Same day as Consent fully executed.",
      dueDate: addDays(3),
      severity: "red",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:rosenberg_note_signed",
      label: "Rosenberg note signed + assignment to SOCIII Inc.",
      detail:
        "Formalize Rosenberg loan as promissory note (4% per annum, no personal guaranty, " +
        "optional Series Seed conversion). Get Rosenberg consent to assignment to SOCIII Inc. " +
        "MUST be done BEFORE creditor notice mailed — otherwise Rosenberg appears as LLC creditor.",
      dueDate: addDays(2),
      severity: "red",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:newspaper_notice_optional",
      label: "Optional: Publish creditor notice in DE newspaper (unknown claimants)",
      detail:
        "Belt-and-suspenders publication in newspaper of general circulation in New Castle County, " +
        "Delaware. Not strictly required for LLCs under § 18-804 but cleaner closure.",
      dueDate: addDays(3),
      severity: "green",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:de_franchise_2025",
      label: "DE franchise tax due ($300 flat for 2025)",
      detail:
        "Delaware LLC franchise tax — $300 flat for calendar year 2025. Pay before Cancellation " +
        "so registered agent (Corporation Trust Company) isn't stuck with an open balance.",
      dueDate: "2026-06-01",
      severity: "red",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:rosenberg_q1_interest",
      label: "First quarterly interest payment to Rosenberg (4% / quarter)",
      detail:
        "Schedule first quarterly interest payment under formalized note. " +
        "Pay from SOCIII Inc. operating account (post-assignment), not LLC.",
      dueDate: addDays(33),
      severity: "amber",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:claims_bar_date",
      label: "Claims bar date — 120 days after notice (6 Del. C. § 18-804)",
      detail:
        "Any creditor claim arriving after this date is barred. Begin final winding-up steps: " +
        "reconcile timely claims, pay or make reasonable provision for all known liabilities, " +
        "close Company bank accounts, file Certificate of Cancellation.",
      dueDate: addDays(120),
      severity: "red",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:cert_of_cancellation",
      label: "File DE Certificate of Cancellation (Form CERT-CANC, ~$200)",
      detail:
        "Filed with Delaware Secretary of State under 6 Del. C. § 18-203 once claims window " +
        "closes and liabilities are resolved. Use Form CERT-CANC. Fee approximately $200.",
      dueDate: addDays(125),
      severity: "amber",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:final_1065",
      label: "File final federal Form 1065 partnership return",
      detail:
        "Final federal Form 1065 partnership return with final K-1s to Sean, Kent, Mike. " +
        "Short-year return due 15th day of 3rd month after dissolution-effective date.",
      dueDate: "2027-03-15",
      severity: "amber",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:final_k1s",
      label: "Distribute final K-1s to Sean, Kent, Mike",
      detail:
        "Final K-1s incorporated into each Member's 2026 personal returns.",
      dueDate: "2027-04-15",
      severity: "amber",
      kind: "wind_down_step",
    },
    {
      obligationKey: "llc_wind_down:records_retention_review",
      label: "Records retention review (3yr + 1 day post-Cancellation)",
      detail:
        "Per 6 Del. C. § 18-804(b)(3), keep LLC books + records for at least 3 years past " +
        "Cancellation. Calendar a destroy-or-archive review for 2029-09 once cancellation date " +
        "is locked.",
      dueDate: "2029-09-30",
      severity: "green",
      kind: "wind_down_step",
    },
  ].map(o => ({
    ...o,
    tenantId,
    createdByWorker: WORKER_SLUG,
    completed: false,
    completedAt: null,
    createdAt: ts(),
    updatedAt: ts(),
  }));
}

async function upsertWorkerDoc() {
  console.log(`[setup] Upserting digitalWorkers/${WORKER_SLUG}...`);
  await db.collection("digitalWorkers").doc(WORKER_SLUG).set(WORKER_DOC, { merge: true });
  console.log(`[setup] Worker doc upserted (${WORKER_CATALOG_ID})`);
}

async function listTenants(uid) {
  if (!uid) throw new Error("--list-tenants requires --uid <FIREBASE_UID>");
  console.log(`[setup] Listing workspaces for uid=${uid}...`);
  const snap = await db.collection("memberships").where("uid", "==", uid).get();
  if (snap.empty) {
    console.log("  (no memberships found)");
    return;
  }
  // Hydrate tenant docs for friendly names.
  const tenantIds = [...new Set(snap.docs.map(d => d.data().tenantId).filter(Boolean))];
  const tenants = await Promise.all(
    tenantIds.map(tid => db.collection("tenants").doc(tid).get().then(t => ({ id: tid, data: t.exists ? t.data() : null })))
  );
  for (const t of tenants) {
    const name = t.data?.name || t.data?.companyName || t.data?.displayName || "(unnamed)";
    console.log(`  ${t.id.padEnd(36)}  ${name}`);
  }
}

async function subscribeTenant(tenantId) {
  if (!tenantId) throw new Error("--subscribe requires --tenant <TENANT_ID>");
  console.log(`[setup] Subscribing tenant=${tenantId} to ${WORKER_SLUG}...`);
  // Avoid duplicate active subscription.
  const existing = await db.collection("subscriptions")
    .where("ownerType", "==", "tenant")
    .where("ownerId", "==", tenantId)
    .where("workerId", "==", WORKER_SLUG)
    .where("trialStatus", "in", ["active", "trialing"])
    .limit(1)
    .get();
  if (!existing.empty) {
    console.log(`  Already subscribed (subscriptionId=${existing.docs[0].id})`);
    return;
  }
  const ref = await db.collection("subscriptions").add({
    ownerType: "tenant",
    ownerId: tenantId,
    userId: null,
    workerId: WORKER_SLUG,
    slug: WORKER_SLUG,
    workerName: "Business Law",
    trialStatus: "active",
    trialStartedAt: ts(),
    trialEndsAt: null,
    createdAt: ts(),
  });
  console.log(`  Subscribed (subscriptionId=${ref.id})`);
}

async function seedWindDown(tenantId, consentExecuted) {
  if (!tenantId) throw new Error("--wind-down requires --tenant <TENANT_ID>");
  console.log(`[setup] Seeding LLC wind-down obligations into tenant=${tenantId} (consent=${consentExecuted || "default 2026-05-29"})...`);
  const obligations = llcWindDownObligations({ tenantId, consentExecuted: consentExecuted || undefined });
  const batch = db.batch();
  for (const o of obligations) {
    const ref = db.collection("customObligations").doc(`${tenantId}__${o.obligationKey}`);
    batch.set(ref, o, { merge: true });
  }
  await batch.commit();
  console.log(`  Seeded ${obligations.length} wind-down obligations`);
}

async function main() {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  const arg = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };

  if (args.length === 0 || has("--help") || has("-h")) {
    console.log(`
Business Law worker setup — bootstrap script.

Usage:
  --worker                       Upsert the Business Law worker doc.
  --list-tenants --uid <UID>     List workspaces for a user.
  --subscribe --tenant <TID>     Subscribe a tenant to Business Law.
  --wind-down --tenant <TID>     Seed TitleApp LLC wind-down obligations.

Combine flags for end-to-end:
  node scripts/setupBusinessLawWorker.js --worker --subscribe --wind-down --tenant <TID>
`);
    process.exit(0);
  }

  if (has("--worker")) await upsertWorkerDoc();
  if (has("--list-tenants")) await listTenants(arg("--uid"));
  if (has("--subscribe")) await subscribeTenant(arg("--tenant"));
  if (has("--wind-down")) await seedWindDown(arg("--tenant"), arg("--consent-date"));

  console.log("[setup] Done.");
}

main().catch((err) => {
  console.error("[setup] Failed:", err);
  process.exit(1);
});
