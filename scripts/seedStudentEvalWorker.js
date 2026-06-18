"use strict";

/**
 * Seed the Student Evaluation Worker (Ruthie Clearwater, nursing) into Firestore
 * so it (a) appears + is selectable, (b) renders its designed canvas, and (c) is
 * grounded for chat. Designed canvas lives in apps/business/src/components/canvas/
 * learningCanvasData.js (resolves via getRECanvas → RealEstateWorkerCanvas, the
 * shared designed-canvas renderer). Substrate spec: docs/learning-record-substrate.md
 *
 * Writes:
 *   - digitalWorkers/student-eval-001  → catalog (selectable + canvas)
 *   - workers/student-eval-001         → creator dashboard
 *   - workerSystemPrompts/student-eval-001 → chat grounding (evidence-first)
 *
 * Usage:
 *   node scripts/seedStudentEvalWorker.js            # dry run
 *   node scripts/seedStudentEvalWorker.js --apply    # write
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2"; // platform owner (creator_id for now; Ruthie linked later)
const SLUG = "student-eval-001";
const NAME = "Student Evaluation";

const SUMMARY =
  "Reads a student's learning record (courses, assessments, clinical hours, competency check-offs) and turns it into an evidence-first evaluation: mastery by objective, at-risk areas, clinical-hours progress, competencies met/remaining, and a readiness estimate. Built for nursing programs; generalizes to any education + professional CE.";

const SYSTEM_PROMPT = `You are the Student Evaluation Worker — a learning-record analyst for nursing and education programs (creator: Ruthie Clearwater).

WHAT YOU DO
You READ a student's learning record from the Vault — a DTC (enrollment/credential anchor) plus an append-only, typed logbook of events: assessments (quiz/exam/assignment), clinical_hours, competency check-offs, ce_activity. You do NOT own or create that record; you are a vault-adjacent reader. You compute, evidence-first:
- Mastery by learning objective (which topics are strong vs weak).
- At-risk flags (objectives below the on-track threshold).
- Clinical-hours progress vs the program requirement.
- Competencies met / needing remediation / remaining.
- A readiness / NCLEX estimate — ALWAYS disclosed as an estimate, never a guarantee.
- A targeted study plan tied to the weak objectives.

HARD RULES
- Evidence-first (EH-01): every insight must cite the logbook entries that support it. NEVER invent a grade, an hour, or a competency. If data is missing, say so plainly and say what to add (LMS import via Canvas/Blackboard, or preceptor/instructor attestation for clinical hours and competencies).
- FERPA: student education records are protected. Only discuss the student whose record is loaded; never compare or leak across students.
- Green = on track, Yellow = at risk / remediate, Red = not met. Use plain English.

BETA / SAMPLE
This worker is in development. The on-screen canvas currently shows SAMPLE nursing data (clearly badged) until the student's real record is loaded from the Vault. Tell the user this honestly — do not present sample figures as their real results.`;

function digitalWorkerDoc() {
  return {
    slug: SLUG,
    catalogId: "STUDENT-EVAL-001",
    catalog_id: "STUDENT-EVAL-001",
    display_name: NAME,
    name: NAME,
    short_description: SUMMARY.slice(0, 280),
    headline: SUMMARY.slice(0, 140),
    description: SUMMARY,
    worker_type: "worker",
    vertical: "Education",
    suite: "Education",
    status: "beta",
    beta: true,
    price: 0,
    pricing: { monthly: 0, free_worker: true },
    pricing_tier: 0,
    creator: "ruthie-clearwater",
    creator_id: SEAN_UID,
    emits: [],
    accepts: [],
    canvasTabs: [], // designed canvas renders its own internal tab bar
    canvasDesigned: true,
    landing_page_slug: `workers/${SLUG}`,
    workspaceLaunchPage: { tagline: NAME, whatYoullHave: "", quickStartPrompts: [], activeSubstrateFeatures: [] },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    _seededBy: "scripts/seedStudentEvalWorker.js",
  };
}

function creatorWorkerDoc() {
  return {
    creator_id: SEAN_UID,
    displayCreator: "Ruthie Clearwater",
    workerId: "STUDENT-EVAL-001",
    slug: SLUG,
    name: NAME,
    short_description: SUMMARY.slice(0, 280),
    vertical: "Education",
    suite: "Education",
    status: "beta",
    beta: true,
    published: true,
    canvasTabs: [],
    canvasDesigned: true,
    emits: [],
    accepts: [],
    builtIn: "repo",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    _seededBy: "scripts/seedStudentEvalWorker.js",
  };
}

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — seeding ${SLUG} (creator_id=${SEAN_UID})`);
  console.log(`  digitalWorkers/${SLUG} + workers/${SLUG} + workerSystemPrompts/${SLUG} (${SYSTEM_PROMPT.length} char prompt)`);
  if (APPLY) {
    await db.doc(`digitalWorkers/${SLUG}`).set(digitalWorkerDoc(), { merge: true });
    await db.doc(`workers/${SLUG}`).set(creatorWorkerDoc(), { merge: true });
    await db.doc(`workerSystemPrompts/${SLUG}`).set({
      slug: SLUG, systemPrompt: SYSTEM_PROMPT,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), _seededBy: "scripts/seedStudentEvalWorker.js",
    }, { merge: true });
    console.log("✅ wrote 3 docs");
  } else {
    console.log("DRY RUN — re-run with --apply to write.");
  }
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
