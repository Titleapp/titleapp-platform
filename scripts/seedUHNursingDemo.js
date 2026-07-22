"use strict";

/**
 * Seed the University of Hawaiʻi at Mānoa School of Nursing demo workspace.
 *
 * Idempotent: uses set({ merge: false }) with explicit doc IDs.
 *
 * Writes:
 *   tenants/demo-uh-nursing                                       (1 doc)
 *   digitalWorkers/{slug}                                         (5 docs)
 *   tenants/demo-uh-nursing/nursingStudents/{id}                  (5 docs)
 *   tenants/demo-uh-nursing/nursingCourses/{id}                   (2 docs)
 *   tenants/demo-uh-nursing/nursingInstructors/{id}               (2 docs)
 *   tenants/demo-uh-nursing/nursingCompetencies/{id}              (3 docs)
 *                                                           Total: 18 docs
 *
 * Usage:
 *   node scripts/seedUHNursingDemo.js            # dry run
 *   node scripts/seedUHNursingDemo.js --apply    # write to Firestore
 */

const path = require("path");
const admin = require(
  path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin")
);
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp;

const APPLY = process.argv.includes("--apply");
const TENANT_ID = "demo-uh-nursing";

// ── Tenant ────────────────────────────────────────────────────────────────────

const TENANT_DOC = {
  tenantId: TENANT_ID,
  name: "UH Mānoa · School of Nursing & Dental Hygiene",
  slug: TENANT_ID,
  demoMode: true,
  mintingExempt: true,
  vertical: "education",
  suite: "Clinical Programs",
  createdAt: ts(),
  plan: "demo",
};

// ── Digital Workers ───────────────────────────────────────────────────────────

const WORKERS = [
  {
    slug: "uh-nursing-records-001",
    name: "Student Record Worker",
    persona: "Kaia",
    description: "Manages immutable learning records for every enrolled student — clinical hours, grades, competencies, and instructor attestations. CCNE-compliant.",
  },
  {
    slug: "uh-nursing-courses-001",
    name: "Course Delivery Worker",
    persona: "Kaia",
    description: "Tracks two active nursing courses (NUR 280 Foundations, NUR 440 Complex Care) with live ATI score simulation via LTI 1.3.",
  },
  {
    slug: "uh-nursing-tutor-001",
    name: "AI Tutor Worker",
    persona: "Kaia",
    description: "Nurse-specific AI tutor mapped to NCLEX-PN/RN competency domains — prepares students without grading them.",
  },
  {
    slug: "uh-nursing-comms-001",
    name: "Interdisciplinary Comms Worker",
    persona: "Kaia",
    description: "Faculty and clinical supervisor coordination — competency attestations, preceptor evaluations, and pending sign-off queue.",
  },
  {
    slug: "uh-nursing-accreditation-001",
    name: "Accreditation & Compliance Worker",
    persona: "Kaia",
    description: "CCNE reporting dashboard — cohort NCLEX readiness, clinical hours summary, and audit-ready export for CCNE site visits.",
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
    id: "student-keala-akana",
    name: "Keala Akana",
    status: "ready",
    clinicalHours: 495,
    clinicalHoursRequired: 500,
    atiScore: 92,
    coursesComplete: 6,
    notes: "Top of cohort; NCLEX readiness benchmarks exceeded across all 8 domains; strong candidate for clinical honors track",
  },
  {
    id: "student-pua-manuia",
    name: "Pua Manuia",
    status: "on-track",
    clinicalHours: 322,
    clinicalHoursRequired: 500,
    atiScore: 79,
    coursesComplete: 3,
    notes: "Steady progression; NUR 440 Complex Care in progress",
  },
  {
    id: "student-kai-fernandez",
    name: "Kai Fernandez",
    status: "on-track",
    clinicalHours: 288,
    clinicalHoursRequired: 500,
    atiScore: 76,
    coursesComplete: 3,
    notes: "Preceptor evaluation pending from Prof. Lani Moku",
  },
  {
    id: "student-hana-yoshida",
    name: "Hana Yoshida",
    status: "at-risk",
    clinicalHours: 145,
    clinicalHoursRequired: 500,
    atiScore: 62,
    coursesComplete: 1,
    notes: "Hours deficit — 355 hours below minimum; competency 2A unsigned; advising appointment scheduled",
  },
  {
    id: "student-mele-kahananui",
    name: "Mele Kahananui",
    status: "on-track",
    clinicalHours: 355,
    clinicalHoursRequired: 500,
    atiScore: 83,
    coursesComplete: 4,
    notes: "",
  },
];

// ── Courses ───────────────────────────────────────────────────────────────────

const COURSES = [
  {
    id: "nur-280",
    code: "NUR 280",
    name: "Foundations of Professional Nursing",
    source: "OpenStax Nursing: Fundamentals, 2023, CC BY 4.0",
    currentWeek: 8,
    totalWeeks: 16,
    enrolledStudents: [
      "student-keala-akana",
      "student-pua-manuia",
      "student-kai-fernandez",
      "student-hana-yoshida",
      "student-mele-kahananui",
    ],
  },
  {
    id: "nur-440",
    code: "NUR 440",
    name: "Complex Care Nursing",
    source: "OpenStax Nursing: Pharmacology, 2023, CC BY 4.0",
    currentWeek: 4,
    totalWeeks: 14,
    enrolledStudents: [
      "student-keala-akana",
      "student-pua-manuia",
      "student-mele-kahananui",
    ],
  },
];

// ── Instructors ───────────────────────────────────────────────────────────────

const INSTRUCTORS = [
  {
    id: "instructor-noa-kahananui",
    name: "Dr. Noa Kahananui",
    role: "Course Lead",
    course: "NUR 280",
  },
  {
    id: "instructor-lani-moku",
    name: "Prof. Lani Moku",
    role: "Clinical Coordinator",
    course: "NUR 440",
  },
];

// ── Competencies ──────────────────────────────────────────────────────────────

const COMPETENCIES = [
  {
    id: "comp-keala-3a",
    studentId: "student-keala-akana",
    competency: "3A - Sterile field preparation",
    status: "verified",
    attestedBy: "instructor-noa-kahananui",
    attestedAt: "2026-06-20",
    notes: "Precise technique; zero breaks in field across three observed procedures",
  },
  {
    id: "comp-keala-5c",
    studentId: "student-keala-akana",
    competency: "5C - Wound care and dressing change",
    status: "verified",
    attestedBy: "instructor-lani-moku",
    attestedAt: "2026-07-05",
    notes: "Thorough assessment; escalated erythema appropriately; charted correctly",
  },
  {
    id: "comp-hana-2a",
    studentId: "student-hana-yoshida",
    competency: "2A - Medication verification protocol",
    status: "pending",
    attestedBy: null,
    notes: "Awaiting instructor sign-off — 9 days pending",
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

(async () => {
  const mode = APPLY ? "APPLYING" : "DRY RUN";
  console.log(`\n${mode} — UH Mānoa School of Nursing demo seed`);
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

  await db.doc(`tenants/${TENANT_ID}`).set(TENANT_DOC, { merge: false });
  console.log(`  tenants/${TENANT_ID} ✓`);
  written++;

  for (const w of WORKERS) {
    await db.doc(`digitalWorkers/${w.slug}`).set(workerDoc(w), { merge: false });
    console.log(`  digitalWorkers/${w.slug} ✓`);
    written++;
  }

  const studentsRef = db.collection(`tenants/${TENANT_ID}/nursingStudents`);
  for (const s of STUDENTS) {
    await studentsRef.doc(s.id).set({ ...s, tenantId: TENANT_ID }, { merge: false });
    console.log(`  tenants/${TENANT_ID}/nursingStudents/${s.id} ✓`);
    written++;
  }

  const coursesRef = db.collection(`tenants/${TENANT_ID}/nursingCourses`);
  for (const c of COURSES) {
    await coursesRef.doc(c.id).set({ ...c, tenantId: TENANT_ID }, { merge: false });
    console.log(`  tenants/${TENANT_ID}/nursingCourses/${c.id} ✓`);
    written++;
  }

  const instructorsRef = db.collection(`tenants/${TENANT_ID}/nursingInstructors`);
  for (const i of INSTRUCTORS) {
    await instructorsRef.doc(i.id).set({ ...i, tenantId: TENANT_ID }, { merge: false });
    console.log(`  tenants/${TENANT_ID}/nursingInstructors/${i.id} ✓`);
    written++;
  }

  const competenciesRef = db.collection(`tenants/${TENANT_ID}/nursingCompetencies`);
  for (const c of COMPETENCIES) {
    await competenciesRef.doc(c.id).set({ ...c, tenantId: TENANT_ID }, { merge: false });
    console.log(`  tenants/${TENANT_ID}/nursingCompetencies/${c.id} ✓`);
    written++;
  }

  console.log(`\n=== UH MĀNOA NURSING DEMO READY ===`);
  console.log(`Wrote ${written} docs across 6 collections/subcollections:`);
  console.log(`  1  tenant doc         tenants/${TENANT_ID}`);
  console.log(`  ${WORKERS.length}  digital workers    digitalWorkers/uh-nursing-{type}-001`);
  console.log(`  ${STUDENTS.length}  students           tenants/${TENANT_ID}/nursingStudents`);
  console.log(`  ${COURSES.length}  courses            tenants/${TENANT_ID}/nursingCourses`);
  console.log(`  ${INSTRUCTORS.length}  instructors        tenants/${TENANT_ID}/nursingInstructors`);
  console.log(`  ${COMPETENCIES.length}  competencies       tenants/${TENANT_ID}/nursingCompetencies`);

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
