"use strict";

/**
 * Seed the Makai School of Nursing demo workspace into Firestore.
 *
 * Idempotent: uses set({ merge: false }) with explicit doc IDs so re-running
 * resets every document to a clean, known state.
 *
 * Writes:
 *   tenants/demo-makai-nursing                                      (1 doc)
 *   digitalWorkers/{slug}                                           (5 docs)
 *   tenants/demo-makai-nursing/nursingStudents/{id}                 (6 docs)
 *   tenants/demo-makai-nursing/nursingCourses/{id}                  (2 docs)
 *   tenants/demo-makai-nursing/nursingInstructors/{id}              (2 docs)
 *   tenants/demo-makai-nursing/nursingCompetencies/{id}             (3 docs)
 *                                                              Total: 19 docs
 *
 * Usage:
 *   node scripts/seedMakaiNursingDemo.js            # dry run
 *   node scripts/seedMakaiNursingDemo.js --apply    # write to Firestore
 */

const path = require("path");
const admin = require(
  path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin")
);
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp;

const APPLY = process.argv.includes("--apply");
const TENANT_ID = "demo-makai-nursing";

// ── Tenant ────────────────────────────────────────────────────────────────────

const TENANT_DOC = {
  tenantId: TENANT_ID,
  name: "Makai School of Nursing",
  slug: TENANT_ID,
  demoMode: true,
  mintingExempt: true,
  vertical: "education",
  suite: "Clinical Programs",
  createdAt: ts(),
  plan: "demo",
  billing: {
    humanSupportSubsidized: true,
    humanSupportSubsidizedUntil: new Date("2026-12-31"),
    humanSupportSubsidizedReason: "Makai/UH pilot",
  },
};

// ── Digital Workers ───────────────────────────────────────────────────────────

const WORKERS = [
  {
    slug: "nursing-records-001",
    name: "Student Record Worker",
    persona: "Kaia",
    description:
      "Manages immutable learning records for every enrolled student — clinical hours, grades, competencies, and instructor attestations.",
  },
  {
    slug: "nursing-courses-001",
    name: "Course Delivery Worker",
    persona: "Kaia",
    description:
      "Tracks two active nursing courses (NSG 201 Fundamentals, NSG 312 Pharmacology) with live ATI score simulation.",
  },
  {
    slug: "nursing-tutor-001",
    name: "AI Tutor Worker",
    persona: "Kaia",
    description:
      "Nurse-specific AI tutor mapped to NCLEX-PN/RN competency domains — prepares students without grading them.",
  },
  {
    slug: "nursing-comms-001",
    name: "Interdisciplinary Comms Worker",
    persona: "Kaia",
    description:
      "Faculty and clinical supervisor coordination — competency attestations, preceptor evaluations, and pending sign-off queue.",
  },
  {
    slug: "nursing-accreditation-001",
    name: "Accreditation & Compliance Worker",
    persona: "Kaia",
    description:
      "ACEN/CCNE reporting dashboard — cohort NCLEX readiness, clinical hours summary, and audit-ready export.",
  },
];

function workerDoc(w) {
  return {
    workerId: w.slug,
    slug: w.slug,
    name: w.name,
    vertical: "education",
    suite: "Clinical Programs",
    tenantId: TENANT_ID,
    status: "live",
    visibility: "org-only",
    persona: w.persona,
    description: w.description,
    demoMode: true,
  };
}

// ── Students ──────────────────────────────────────────────────────────────────

const STUDENTS = [
  {
    id: "student-jordan-chen",
    name: "Jordan Chen",
    status: "at-risk",
    clinicalHours: 187,
    clinicalHoursRequired: 500,
    atiScore: 68,
    coursesComplete: 1,
    notes:
      "Behind on clinical hours; 2 unsigned competencies (Competency 3A, 4B); needs preceptor follow-up",
  },
  {
    id: "student-maya-kahale",
    name: "Maya Kahale",
    status: "on-track",
    clinicalHours: 312,
    clinicalHoursRequired: 500,
    atiScore: 78,
    coursesComplete: 3,
    notes: "Pharmacology module in progress; strong trajectory",
  },
  {
    id: "student-leilani-akana",
    name: "Leilani Akana",
    status: "ready",
    clinicalHours: 498,
    clinicalHoursRequired: 500,
    atiScore: 91,
    coursesComplete: 6,
    notes:
      "High NCLEX readiness indicators; all competencies signed; clinical hours nearly complete",
  },
  {
    id: "student-noah-ferreira",
    name: "Noah Ferreira",
    status: "on-track",
    clinicalHours: 298,
    clinicalHoursRequired: 500,
    atiScore: 74,
    coursesComplete: 3,
    notes: "Preceptor evaluation pending from Prof. Rodrigues",
  },
  {
    id: "student-aiko-tanaka",
    name: "Aiko Tanaka",
    status: "on-track",
    clinicalHours: 341,
    clinicalHoursRequired: 500,
    atiScore: 81,
    coursesComplete: 4,
    notes: "",
  },
  {
    id: "student-marcus-webb",
    name: "Marcus Webb",
    status: "at-risk",
    clinicalHours: 120,
    clinicalHoursRequired: 500,
    atiScore: 59,
    coursesComplete: 1,
    notes:
      "Extended leave; return plan active; needs comprehensive catch-up plan",
  },
  {
    id: "student-sara-kahele",
    name: "Sara Kahele",
    status: "ready",
    clinicalHours: 486,
    clinicalHoursRequired: 500,
    atiScore: 88,
    coursesComplete: 5,
    notes:
      "Consistently high performer; strong clinical judgment across all rotations; exceeds NCLEX readiness benchmarks; vault record complete",
  },
];

// ── Courses ───────────────────────────────────────────────────────────────────

const COURSES = [
  {
    id: "nsg-201",
    code: "NSG 201",
    name: "Fundamentals of Nursing Care",
    source: "OpenStax Nursing: Fundamentals, 2023, CC BY 4.0",
    currentWeek: 6,
    totalWeeks: 16,
    enrolledStudents: [
      "student-jordan-chen",
      "student-maya-kahale",
      "student-leilani-akana",
      "student-noah-ferreira",
      "student-aiko-tanaka",
      "student-marcus-webb",
    ],
  },
  {
    id: "nsg-312",
    code: "NSG 312",
    name: "Clinical Pharmacology",
    source: "OpenStax Nursing: Pharmacology, 2023, CC BY 4.0",
    currentWeek: 3,
    totalWeeks: 14,
    enrolledStudents: [
      "student-maya-kahale",
      "student-leilani-akana",
      "student-noah-ferreira",
      "student-aiko-tanaka",
    ],
  },
];

// ── Instructors ───────────────────────────────────────────────────────────────

const INSTRUCTORS = [
  {
    id: "instructor-kealani-moku",
    name: "Dr. Kealani Moku",
    role: "Course Lead",
    course: "NSG 201",
  },
  {
    id: "instructor-ana-rodrigues",
    name: "Prof. Ana Rodrigues",
    role: "Clinical Coordinator",
    course: "NSG 312",
  },
];

// ── Competencies ──────────────────────────────────────────────────────────────

const COMPETENCIES = [
  {
    id: "comp-jordan-3a",
    studentId: "student-jordan-chen",
    competency: "3A - Sterile field preparation",
    status: "pending",
    attestedBy: null,
    notes: "Awaiting instructor sign-off",
  },
  {
    id: "comp-jordan-4b",
    studentId: "student-jordan-chen",
    competency: "4B - IV catheter insertion",
    status: "pending",
    attestedBy: null,
    notes: "Awaiting preceptor evaluation",
  },
  {
    id: "comp-leilani-6a",
    studentId: "student-leilani-akana",
    competency: "6A - Patient discharge teaching",
    status: "verified",
    attestedBy: "instructor-kealani-moku",
    attestedAt: "2026-07-01",
    notes: "Demonstrated excellent patient communication",
  },
  {
    id: "comp-sara-2a",
    studentId: "student-sara-kahele",
    competency: "2A - Medication administration safety",
    status: "verified",
    attestedBy: "instructor-kealani-moku",
    attestedAt: "2026-06-12",
    notes: "Perfect 5-rights technique; zero errors across 3 observed administrations",
  },
  {
    id: "comp-sara-4b",
    studentId: "student-sara-kahele",
    competency: "4B - IV catheter insertion",
    status: "verified",
    attestedBy: "instructor-ana-rodrigues",
    attestedAt: "2026-06-28",
    notes: "First-attempt success; demonstrated sterile technique and patient communication",
  },
  {
    id: "comp-sara-5c",
    studentId: "student-sara-kahele",
    competency: "5C - Wound care and dressing change",
    status: "verified",
    attestedBy: "instructor-kealani-moku",
    attestedAt: "2026-07-10",
    notes: "Thorough assessment; clean technique; documented and charted correctly",
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

(async () => {
  const mode = APPLY ? "APPLYING" : "DRY RUN";
  console.log(`\n${mode} — Makai School of Nursing demo seed`);
  console.log(`  tenant: tenants/${TENANT_ID}`);
  console.log(`  workers: ${WORKERS.length} digitalWorkers docs`);
  console.log(`  students: ${STUDENTS.length} docs in nursingStudents subcollection`);
  console.log(`  courses: ${COURSES.length} docs in nursingCourses subcollection`);
  console.log(`  instructors: ${INSTRUCTORS.length} docs in nursingInstructors subcollection`);
  console.log(`  competencies: ${COMPETENCIES.length} docs in nursingCompetencies subcollection`);
  const total = 1 + WORKERS.length + STUDENTS.length + COURSES.length + INSTRUCTORS.length + COMPETENCIES.length;
  console.log(`  total: ${total} docs\n`);

  if (!APPLY) {
    console.log("DRY RUN — re-run with --apply to write to Firestore.");
    process.exit(0);
  }

  let written = 0;

  // 1. Tenant
  await db.doc(`tenants/${TENANT_ID}`).set(TENANT_DOC, { merge: false });
  console.log(`  tenants/${TENANT_ID} ✓`);
  written++;

  // 2. Digital Workers
  for (const w of WORKERS) {
    await db.doc(`digitalWorkers/${w.slug}`).set(workerDoc(w), { merge: false });
    console.log(`  digitalWorkers/${w.slug} ✓`);
    written++;
  }

  // 3. Students (subcollection under tenant)
  const studentsRef = db.collection(`tenants/${TENANT_ID}/nursingStudents`);
  for (const s of STUDENTS) {
    await studentsRef.doc(s.id).set({ ...s, tenantId: TENANT_ID }, { merge: false });
    console.log(`  tenants/${TENANT_ID}/nursingStudents/${s.id} ✓`);
    written++;
  }

  // 4. Courses (subcollection under tenant)
  const coursesRef = db.collection(`tenants/${TENANT_ID}/nursingCourses`);
  for (const c of COURSES) {
    await coursesRef.doc(c.id).set({ ...c, tenantId: TENANT_ID }, { merge: false });
    console.log(`  tenants/${TENANT_ID}/nursingCourses/${c.id} ✓`);
    written++;
  }

  // 5. Instructors (subcollection under tenant)
  const instructorsRef = db.collection(`tenants/${TENANT_ID}/nursingInstructors`);
  for (const i of INSTRUCTORS) {
    await instructorsRef.doc(i.id).set({ ...i, tenantId: TENANT_ID }, { merge: false });
    console.log(`  tenants/${TENANT_ID}/nursingInstructors/${i.id} ✓`);
    written++;
  }

  // 6. Competencies (subcollection under tenant)
  const competenciesRef = db.collection(`tenants/${TENANT_ID}/nursingCompetencies`);
  for (const c of COMPETENCIES) {
    await competenciesRef.doc(c.id).set({ ...c, tenantId: TENANT_ID }, { merge: false });
    console.log(`  tenants/${TENANT_ID}/nursingCompetencies/${c.id} ✓`);
    written++;
  }

  console.log(`\n=== MAKAI NURSING DEMO READY ===`);
  console.log(`Wrote ${written} docs across 6 collections/subcollections:`);
  console.log(`  1  tenant doc         tenants/${TENANT_ID}`);
  console.log(`  ${WORKERS.length}  digital workers    digitalWorkers/{slug}`);
  console.log(`  ${STUDENTS.length}  students           tenants/${TENANT_ID}/nursingStudents`);
  console.log(`  ${COURSES.length}  courses            tenants/${TENANT_ID}/nursingCourses`);
  console.log(`  ${INSTRUCTORS.length}  instructors        tenants/${TENANT_ID}/nursingInstructors`);
  console.log(`  ${COMPETENCIES.length}  competencies       tenants/${TENANT_ID}/nursingCompetencies`);

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
