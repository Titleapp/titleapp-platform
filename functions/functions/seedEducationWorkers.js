#!/usr/bin/env node
/**
 * Seed education vertical workers into Firestore digitalWorkers collection.
 * Run: node /tmp/seedEducationWorkers.js
 * Idempotent — skips docs where slug already exists.
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "title-app-alpha" });
}
const db = admin.firestore();

const WORKERS = [
  {
    id: "edu-curriculum",
    slug: "edu-curriculum",
    name: "Curriculum Designer",
    description: "Course mapping, learning objective alignment, scope-and-sequence planning, and accreditation-ready curriculum documentation.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-assessment",
    slug: "edu-assessment",
    name: "Assessment & Grading",
    description: "Rubric builder, formative and summative assessment design, auto-scoring setup, and grade-book integration.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-advising",
    slug: "edu-advising",
    name: "Academic Advising",
    description: "Degree-plan auditing, course sequencing recommendations, prerequisite tracking, and student goal alignment.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-enrollment",
    slug: "edu-enrollment",
    name: "Enrollment & Admissions",
    description: "Application pipeline management, eligibility screening, waitlist coordination, and onboarding checklist generation.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-ferpa",
    slug: "edu-ferpa",
    name: "FERPA & Privacy Compliance",
    description: "Student data audit, consent tracking, disclosure log, and FERPA incident response workflow.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-parent-comms",
    slug: "edu-parent-comms",
    name: "Parent & Family Communication",
    description: "Progress report generation, family meeting scheduling, alert drafting, and communication audit log.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-student-success",
    slug: "edu-student-success",
    name: "Student Success Coach",
    description: "Early-alert system for at-risk students, intervention tracking, coaching session notes, and outcome reporting.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-outcomes",
    slug: "edu-outcomes",
    name: "Student Outcome Analytics",
    description: "Cohort pass-rate dashboards, NCLEX/board-exam outcome tracking, program effectiveness reporting, and accreditor-ready exports.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-lms-admin",
    slug: "edu-lms-admin",
    name: "LMS Administration",
    description: "Course creation workflows, user enrollment, LTI integrations (Canvas, ATI, Blackboard), and usage analytics.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
  {
    id: "edu-ce-tracker",
    slug: "edu-ce-tracker",
    name: "Continuing Education Tracker",
    description: "License renewal deadlines, CE hour logging, provider verification, and board-submission packet generation.",
    vertical: "education",
    suite: "Education",
    status: "coming_soon",
    price: 0,
    isPublic: true,
  },
];

// Patch existing education workers to ensure correct vertical/suite tags + status
const EXISTING_PATCHES = [
  { id: "nursing-ce-001", vertical: "education", suite: "Education", status: "live" },
  { id: "clinical-eval-001", vertical: "education", suite: "Education", status: "live" },
  { id: "staff-credentials-001", vertical: "education", suite: "Education", status: "live" },
  { id: "student-evaluation", vertical: "education", suite: "Education", status: "live" },
  { id: "student-transcript-001", vertical: "education", suite: "Education", status: "live" },
];

async function seed() {
  const col = db.collection("digitalWorkers");
  let added = 0, skipped = 0;

  // Patch existing
  for (const p of EXISTING_PATCHES) {
    try {
      await col.doc(p.id).set(p, { merge: true });
      console.log(`  Patched ${p.id}`);
    } catch (e) {
      console.log(`  Skip patch ${p.id}: ${e.message}`);
    }
  }

  // Seed new
  for (const w of WORKERS) {
    const snap = await col.doc(w.id).get();
    if (snap.exists) {
      // Update vertical/suite but don't overwrite other fields
      await col.doc(w.id).set({ vertical: w.vertical, suite: w.suite }, { merge: true });
      console.log(`  Already exists — updated tags: ${w.id}`);
      skipped++;
      continue;
    }
    await col.doc(w.id).set({
      ...w,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "seed:education-vertical",
    });
    console.log(`  Added: ${w.name} [${w.status}]`);
    added++;
  }

  console.log(`\nDone. Added: ${added}, Updated: ${skipped}`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
