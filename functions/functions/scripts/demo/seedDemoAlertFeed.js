/**
 * seedDemoAlertFeed.js — seed alertFeed items for demo personas
 *
 * Seeds realistic operating-feed alerts for:
 *   - Sean's DEMO SPACE (uid: WResykI56hW16silsOtvlw1UjJK2)
 *   - Dr. Chen education persona (same uid, different alert types)
 *
 * Usage: node scripts/demo/seedDemoAlertFeed.js
 * Run from: functions/functions/
 */

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

// Demo space uid from memory
const DEMO_UID = "WResykI56hW16silsOtvlw1UjJK2";

const now = admin.firestore.Timestamp.now();
function daysAgo(n) {
  return admin.firestore.Timestamp.fromMillis(now.toMillis() - n * 86400000);
}
function hoursAgo(n) {
  return admin.firestore.Timestamp.fromMillis(now.toMillis() - n * 3600000);
}

const ALERTS = [
  // --- Education / Dr. Chen persona ---
  {
    ikey: "edu-ferpa-audit-due",
    title: "FERPA audit documentation due",
    body: "Annual FERPA compliance review is due in 12 days. Student data access log needs to be compiled.",
    action_hint: "Ask the FERPA & Privacy Compliance worker to generate the access log",
    severity: "amber",
    source: "worker",
    source_label: "FERPA Compliance",
    resolved: false,
    createdAt: daysAgo(1),
  },
  {
    ikey: "edu-student-eval-pending",
    title: "3 student evaluations awaiting review",
    body: "Clinical evaluations for Johnson, Martinez, and Patel submitted by instructors — awaiting Dr. Chen sign-off.",
    action_hint: "Open Student Evaluation worker to review and sign",
    severity: "red",
    source: "worker",
    source_label: "Student Evaluation",
    resolved: false,
    createdAt: hoursAgo(3),
  },
  {
    ikey: "edu-lms-sync-stalled",
    title: "ATI content sync stalled",
    body: "ATI LTI sync has not run in 48 hours. 2 course assignments may be missing from student records.",
    action_hint: "Check LMS Administration worker for connection status",
    severity: "amber",
    source: "system",
    source_label: "LMS Admin",
    resolved: false,
    createdAt: daysAgo(2),
  },
  {
    ikey: "edu-ce-renewal-nurse",
    title: "CE renewal: 4 nurses expire this quarter",
    body: "Johnson CE expires Aug 15 · Martinez expires Aug 22 · Chen-Torres expires Sep 1 · Patel expires Sep 14",
    action_hint: "Open CE Tracker to see full renewal pipeline",
    severity: "amber",
    source: "worker",
    source_label: "CE Tracker",
    resolved: false,
    createdAt: daysAgo(3),
  },
  {
    ikey: "edu-vault-signed-transcript",
    title: "Signed transcript anchored to Vault",
    body: "Maya Rodriguez's official nursing transcript — signed by Dr. Chen 2026-07-07 — is permanently on record.",
    action_hint: "View in Vault → Education",
    severity: "green",
    source: "worker",
    source_label: "Vault",
    resolved: false,
    createdAt: daysAgo(2),
  },

  // --- Spine / general business ---
  {
    ikey: "re-lease-expiring-main",
    title: "Lease expiring in 30 days — 204 Main St",
    body: "Unit 2A lease expires Aug 8. Tenant has not responded to renewal offer sent June 28.",
    action_hint: "Open Property Manager → Lease-Up to follow up",
    severity: "amber",
    source: "worker",
    source_label: "Property Manager",
    resolved: false,
    createdAt: daysAgo(1),
  },
  {
    ikey: "acct-invoice-overdue",
    title: "Invoice #2847 overdue — $4,200",
    body: "Client: Meadow Creek Partners. Due June 30. 9 days past due, no payment confirmed.",
    action_hint: "Ask Accounting to send a payment reminder",
    severity: "red",
    source: "worker",
    source_label: "Accounting",
    resolved: false,
    createdAt: hoursAgo(6),
  },
  {
    ikey: "hr-onboard-incomplete",
    title: "New hire onboarding incomplete",
    body: "Sofia Reyes — I-9 verification and benefits enrollment both pending. Start date July 14.",
    action_hint: "Open HR worker to see checklist",
    severity: "amber",
    source: "worker",
    source_label: "HR & People",
    resolved: false,
    createdAt: daysAgo(2),
  },
  {
    ikey: "esign-advisory-pending",
    title: "Advisor agreement awaiting signature",
    body: "Ruthie Clearwater's RSPA and Advisor Agreement sent June 18 — still pending her signature.",
    action_hint: "Follow up or void + reissue",
    severity: "amber",
    source: "worker",
    source_label: "IR Worker",
    resolved: false,
    createdAt: daysAgo(3),
  },
  {
    ikey: "marketing-campaign-live",
    title: "Campaign 'Education GTM' live — 2,840 opens",
    body: "Investor outreach batch — 513 contacts · 2,840 opens · 47 clicks · 0 unsubscribes so far.",
    action_hint: "View in Marketing worker → Campaigns",
    severity: "green",
    source: "worker",
    source_label: "Marketing",
    resolved: false,
    createdAt: daysAgo(1),
  },
];

async function seed() {
  const ref = db.collection("alertFeed").doc(DEMO_UID).collection("items");

  // Check existing
  const existing = await ref.get();
  const existingIkeys = new Set(existing.docs.map(d => d.data().ikey).filter(Boolean));

  let added = 0;
  let skipped = 0;

  for (const alert of ALERTS) {
    if (existingIkeys.has(alert.ikey)) {
      console.log(`  skip (exists): ${alert.ikey}`);
      skipped++;
      continue;
    }
    await ref.doc(alert.ikey).set({
      ...alert,
      updatedAt: now,
    });
    console.log(`  added [${alert.severity}]: ${alert.title}`);
    added++;
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped for uid=${DEMO_UID}`);
}

seed().catch(e => { console.error(e); process.exit(1); });
