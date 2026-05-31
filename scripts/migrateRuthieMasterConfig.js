/**
 * Import Ruthie Clearwater's Master Config Sheet → Firestore.
 *
 * Source: ~/Downloads/_Master Config Sheet.xlsx
 * Destination: tenants/<TENANT>/nurseEdu/{courses,slos,sites,instructors,
 *              cohorts,reflectionTemplates,students,observations,grades}
 *
 * Plus: a Student DTC for each demo student with logbook entries representing
 * their journey across NURS 210 → 220 → 230 → 320 → 360.
 *
 * Usage:
 *   node scripts/migrateRuthieMasterConfig.js                       # dry-run
 *   node scripts/migrateRuthieMasterConfig.js --apply               # write to Firestore
 *
 *   Override destination tenant: TENANT=<id> node scripts/migrateRuthieMasterConfig.js --apply
 *   Default tenant: "clearwater-nursing"
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
const xlsx = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "xlsx"));

admin.initializeApp({ projectId: "title-app-alpha" });

const APPLY = process.argv.includes("--apply");
const EXPORT_JSON = process.argv.includes("--export-json");
const JSON_OUT_PATH = path.join(__dirname, "..", "creators", "ruthie", "nursing-education-001", "data.json");
const TENANT = process.env.TENANT || "clearwater-nursing";
const SHEET_PATH = "/Users/seancombs/Downloads/_Master Config Sheet.xlsx";
const RUTHIE_EMAIL = "ruthiec@hawaii.edu";
const RUTHIE_USER_ID = "ruthie-clearwater-001"; // placeholder until real auth user resolves

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Accumulator for JSON export
const exported = {
  tenant: { id: TENANT, name: "Clearwater Nursing Education", vertical: "education", jurisdiction: "us-hi", role: ["creator", "business"] },
  courses: [],
  slos: [],
  reflectionTemplates: [],
  sites: [],
  instructors: [],
  cohorts: [],
  students: [],
  logbookEntries: [],
};

function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function safeJson(s) {
  if (s == null) return null;
  if (typeof s === "object") return s;
  if (typeof s !== "string" || !s.trim()) return null;
  try { return JSON.parse(s); } catch (_) { return null; }
}

function parseSheet(name, ws) {
  const json = xlsx.utils.sheet_to_json(ws, { defval: null });
  console.log(`  ${name}: ${json.length} rows`);
  return json;
}

async function writeOrLog(collection, docId, data) {
  if (APPLY) {
    await db.collection(collection).doc(docId).set(data, { merge: true });
  }
}

async function main() {
  console.log(`\nRuthie Master Config → Firestore migration`);
  console.log(`  Source: ${SHEET_PATH}`);
  console.log(`  Tenant: ${TENANT}`);
  console.log(`  Mode:   ${APPLY ? "APPLY (writing)" : "DRY-RUN (read-only)"}`);
  console.log("");

  const wb = xlsx.readFile(SHEET_PATH);
  const sheets = {
    Courses:           parseSheet("Courses", wb.Sheets["Courses"]),
    SLOs:              parseSheet("SLOs", wb.Sheets["SLOs"]),
    Reflections:       parseSheet("Reflections", wb.Sheets["Reflections"]),
    Sites:             parseSheet("Sites", wb.Sheets["Sites"]),
    Instructors:       parseSheet("Instructors", wb.Sheets["Instructors"]),
    Cohorts:           parseSheet("Cohorts", wb.Sheets["Cohorts"]),
    GlobalAdmins:      parseSheet("GlobalAdmins", wb.Sheets["GlobalAdmins"]),
  };

  // 1. Ensure tenant exists (idempotent)
  // Clearwater Nursing serves TWO roles for Ruthie:
  //   (a) Creator space — she authors the nursing-education-001 worker here
  //   (b) Business space — she operates the worker for her nursing program,
  //       enrolling students who get entitled memberships back to this tenant
  // Same dual creator+business pattern as IR (fundraise) and HR workers.
  const tenantRef = db.collection("tenants").doc(TENANT);
  if (APPLY) {
    await tenantRef.set({
      name: "Clearwater Nursing Education",
      vertical: "education",
      jurisdiction: "us-hi",
      ownerEmail: RUTHIE_EMAIL,
      ownerUserId: RUTHIE_USER_ID,
      createdAt: FieldValue.serverTimestamp(),
      activeWorkers: ["nursing-education-001"],
      role: ["creator", "business"], // dual: creator authors worker, business operates it
    }, { merge: true });
  }
  console.log(`Tenant doc: tenants/${TENANT} (creator + business)`);

  // Helper: collection ref under tenant
  const sub = (name) => db.collection(`tenants/${TENANT}/nurseEdu/data/${name}`);

  // 2. Courses
  let courseCount = 0;
  for (const row of sheets.Courses) {
    if (!row.CourseCode) continue;
    const courseId = slug(row.CourseCode);
    const data = {
      courseCode: row.CourseCode,
      courseName: row.CourseName,
      status: row.Status || "active",
      sloCount: Number(row.SLOCount) || 0,
      entryRequirements: safeJson(row.EntryRequirements),
      reflectionStructure: safeJson(row.ReflectionStructure),
      coreValuesOverride: safeJson(row.CoreValuesOverride),
      sourceRow: row,
    };
    if (APPLY) await sub("courses").doc(courseId).set(data, { merge: true });
    exported.courses.push({ id: courseId, ...data });
    courseCount++;
  }
  console.log(`Courses: ${courseCount}`);

  // 3. SLOs
  let sloCount = 0;
  for (const row of sheets.SLOs) {
    if (!row.CourseCode || row.SLONumber == null) continue;
    const sloId = `${slug(row.CourseCode)}-${String(row.SLONumber).replace(/\./g, "-")}`;
    const data = {
      courseCode: row.CourseCode,
      sloNumber: String(row.SLONumber),
      title: row.Title,
      shortTitle: row.ShortTitle,
      criteria: safeJson(row.Criteria) || row.Criteria,
    };
    if (APPLY) await sub("slos").doc(sloId).set(data, { merge: true });
    exported.slos.push({ id: sloId, ...data });
    sloCount++;
  }
  console.log(`SLOs: ${sloCount}`);

  // 4. Reflection templates
  let reflCount = 0;
  for (const row of sheets.Reflections) {
    if (!row.CourseCode || row.SLONumber == null) continue;
    const id = `${slug(row.CourseCode)}-${String(row.SLONumber).replace(/\./g, "-")}`;
    const data = {
      courseCode: row.CourseCode,
      sloNumber: String(row.SLONumber),
      focus: row.Focus,
      questions: safeJson(row.Questions) || row.Questions,
      requiredFor: safeJson(row.RequiredFor) || row.RequiredFor,
      subcategories: safeJson(row.Subcategories) || row.Subcategories,
      closingPrompts: safeJson(row.ClosingPrompts) || row.ClosingPrompts,
    };
    if (APPLY) await sub("reflectionTemplates").doc(id).set(data, { merge: true });
    exported.reflectionTemplates.push({ id, ...data });
    reflCount++;
  }
  console.log(`Reflection templates: ${reflCount}`);

  // 5. Sites
  let siteCount = 0;
  for (const row of sheets.Sites) {
    if (!row.CourseCode || !row.SiteName) continue;
    const id = `${slug(row.CourseCode)}-${slug(row.SiteName)}`;
    const data = {
      courseCode: row.CourseCode,
      siteName: row.SiteName,
      category: row.Category,
      label: row.Label,
      instructorList: safeJson(row.InstructorList) || [],
      status: row.Status || "active",
    };
    if (APPLY) await sub("sites").doc(id).set(data, { merge: true });
    exported.sites.push({ id, ...data });
    siteCount++;
  }
  console.log(`Sites: ${siteCount}`);

  // 6. Instructors
  let instCount = 0;
  for (const row of sheets.Instructors) {
    if (!row.Email) continue;
    const id = slug(row.Email);
    const data = {
      firstName: row.FirstName,
      lastName: row.LastName,
      email: row.Email,
      courseCode: row.CourseCode,
      siteName: row.SiteName,
      status: row.Status || "active",
    };
    if (APPLY) await sub("instructors").doc(id).set(data, { merge: true });
    exported.instructors.push({ id, ...data });
    instCount++;
  }
  console.log(`Instructors: ${instCount}`);

  // 7. Cohorts
  let cohortCount = 0;
  for (const row of sheets.Cohorts) {
    if (!row.CohortName) continue;
    const id = slug(row.CohortName);
    const data = {
      cohortName: row.CohortName,
      sheetIdLegacy: row.SheetID,
      status: row.Status || "active",
    };
    if (APPLY) await sub("cohorts").doc(id).set(data, { merge: true });
    exported.cohorts.push({ id, ...data });
    cohortCount++;
  }
  console.log(`Cohorts: ${cohortCount}`);

  // 8. Demo students (8 total — represent ASN20 cohort diversity)
  // IMPORTANT: These are isDemo:true placeholders. Real student onboarding follows
  // the same entitled-membership pattern we ship for advisors/investors:
  //   1. Ruthie (or program admin) sends invite via Nursing Education worker
  //      → POST /v1/nurse-edu:student:invite { email, displayName, cohort }
  //   2. Backend creates pendingInvite + sends magic-link email (services/ir
  //      advisor invite pattern; new services/nurseEdu module for HR-style flow)
  //   3. Student clicks link → AuthMagic verifies → entitled membership minted
  //      with role="student", tenantId=clearwater-nursing
  //   4. Stripe Identity KYC required before student DTC is minted in their
  //      personal Vault (verified once, valid 1 year per platform rule)
  //   5. Student DTC (type: educational-record) minted in their My Vault —
  //      every reflection/observation/grade-lock becomes a logbook entry on it
  //   6. Student sees "Clearwater Nursing" in workspace switcher + their
  //      student DTC in personal Vault
  // Cross-references: feedback_kyc_user_level_one_year.md, project_worker_001_
  //   tenant_user_pattern.md, IR advisor invite at services/ir/advisorFlow.js
  const demoStudents = [
    { id: "stu_sarah",   name: "Sarah K.",    email: "demo+sarah@clearwater-nursing.test",   cohort: "asn20", initials: "SK", color: "#7C3AED", course: "NURS 230", site: "Clinical",         status: "On track" },
    { id: "stu_maya",    name: "Maya L.",     email: "demo+maya@clearwater-nursing.test",    cohort: "asn20", initials: "ML", color: "#DB2777", course: "NURS 220", site: "Medical-Surgical", status: "Behind",  flag: "Behind on reflections — last submission 12 days ago" },
    { id: "stu_james",   name: "James C.",    email: "demo+james@clearwater-nursing.test",   cohort: "asn20", initials: "JC", color: "#0EA5E9", course: "NURS 220", site: "Medical-Surgical", status: "Flagged", flag: "Strong reflections, struggling with delegation (SLO 4)" },
    { id: "stu_aaron",   name: "Aaron R.",    email: "demo+aaron@clearwater-nursing.test",   cohort: "asn20", initials: "AR", color: "#16A34A", course: "NURS 320", site: "MMMG",             status: "On track" },
    { id: "stu_priya",   name: "Priya T.",    email: "demo+priya@clearwater-nursing.test",   cohort: "asn20", initials: "PT", color: "#F59E0B", course: "NURS 220", site: "Simulation",       status: "On track", note: "Top of cohort" },
    { id: "stu_emi",     name: "Emi W.",      email: "demo+emi@clearwater-nursing.test",     cohort: "asn20", initials: "EW", color: "#06B6D4", course: "NURS 230", site: "ER",               status: "On track" },
    { id: "stu_kainoa",  name: "Kainoa P.",   email: "demo+kainoa@clearwater-nursing.test",  cohort: "asn20", initials: "KP", color: "#8B5CF6", course: "NURS 320", site: "Peds MCE 1",       status: "On track" },
    { id: "stu_leilani", name: "Leilani O.",  email: "demo+leilani@clearwater-nursing.test", cohort: "asn20", initials: "LO", color: "#EC4899", course: "NURS 320", site: "Hospice",          status: "On track", note: "Strong on family care" },
  ];

  for (const s of demoStudents) {
    const studentData = {
      studentId: s.id,
      displayName: s.name,
      email: s.email,
      cohort: s.cohort,
      initials: s.initials,
      colorAccent: s.color,
      currentCourse: s.course,
      currentSite: s.site,
      progressStatus: s.status,
      flag: s.flag || null,
      note: s.note || null,
      enrolledISO: "2025-08-26",
      status: "active",
      isDemo: true,
      // Real-student onboarding fields (null on demo, filled when real student onboards):
      identityVerifiedISO: null,        // Stripe Identity timestamp
      studentDtcId: null,                // DTC minted in student's personal Vault
      entitledMembershipId: null,        // membership doc that grants Clearwater Nursing access
      inviteSentISO: null,
    };
    if (APPLY) await sub("students").doc(s.id).set(studentData, { merge: true });
    exported.students.push(studentData);
  }
  console.log(`Demo students: ${demoStudents.length} (isDemo:true — replace via /v1/nurse-edu:student:invite flow)`);

  // Onboarding queue placeholder — empty until real students get invited
  if (APPLY) {
    await db.doc(`tenants/${TENANT}/nurseEdu/onboarding`).set({
      pendingInvites: [],
      readyForKyc: [],
      readyForDtcMint: [],
      _note: "Real student onboarding pipeline: invite → identity-verify (Stripe Identity) → mint educational-record DTC in student's personal Vault → entitled membership to tenants/clearwater-nursing. Mirror of services/ir/advisorFlow.js, port to services/nurseEdu/studentFlow.js.",
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  console.log(`Onboarding queue scaffolded (pending services/nurseEdu/studentFlow.js port)`);

  // 9. Sarah's 8-month journey — MULTI-DIMENSIONAL events.
  // Includes ALL the dimensions instructors actually use to recommend
  // "continue / counsel / redirect" — not just SLO rubric scores. This is
  // the architectural insight from Sean 2026-05-30: Ruthie's original model
  // was rubric-only, but real instructor recommendations rest on:
  //   1. Competency (SLO observations) — Ruthie's original layer
  //   2. Professionalism (showed up prepared, communicated respectfully)
  //   3. Attendance (shifts attended / missed / late)
  //   4. Clinical incidents (med errors, near-misses, safety events)
  //   5. Reflective practice (the reflection submissions)
  // The byzantine university system is TRYING to generate this data;
  // most programs rely on instructor gut. SOCIII makes it explicit + auditable.
  const sarahEntries = [
    { date: "2025-09-02", course: "NURS 210", site: "Hale Makua (LTC)",    type: "attendance.recorded",  status: "present", instructor: "Dr. Wendy Dahmen", note: "First clinical day — on time, prepared." },
    { date: "2025-09-04", course: "NURS 210", site: "Hale Makua (LTC)",    sloNum: "7.0", type: "reflection.submitted", title: "First LTC shift — patient with mid-stage dementia" },
    { date: "2025-09-11", course: "NURS 210", site: "Hale Makua (LTC)",    sloNum: "8.0", type: "reflection.submitted", title: "Therapeutic communication with non-verbal patient" },
    { date: "2025-09-18", course: "NURS 210", site: "Hale Makua (LTC)",    sloNum: "7.0", type: "slo.observed", instructor: "Dr. Wendy Dahmen", score: 3, note: "Competent — task completion solid; building confidence with families." },
    { date: "2025-09-25", course: "NURS 210", site: "Hale Makua (LTC)",    type: "professionalism.observed", instructor: "Dr. Wendy Dahmen", score: 4, dimension: "communication", note: "De-escalated agitated patient family member with empathy and clarity." },
    { date: "2025-10-09", course: "NURS 210", site: "Hale Makua (LTC)",    type: "attendance.recorded",  status: "absent", instructor: "Dr. Wendy Dahmen", note: "Called in sick — documented per program policy, not pattern." },
    { date: "2025-10-23", course: "NURS 210", site: "Kula Hospital (LTC)", sloNum: "6.0", type: "reflection.submitted", title: "Resource access for uninsured family" },
    { date: "2025-11-13", course: "NURS 210", site: "Kula Hospital (LTC)", type: "incident.recorded", severity: "near-miss", instructor: "Dr. Wendy Dahmen", note: "Caught own error before administering wrong dose. Self-reported. Good clinical judgment under pressure — counted as STRENGTH not failure." },
    { date: "2025-12-04", course: "NURS 210", site: null,                   sloNum: null,  type: "grade.locked", instructor: "Dr. Wendy Dahmen", grade: "B+", note: "Locked end-of-semester; consistent reflective practice + strong professionalism + perfect attendance pattern.", chainAnchor: "0x4f2e...a1b3" },
    { date: "2026-01-22", course: "NURS 220", site: "Medical-Surgical",    sloNum: "1.0", type: "reflection.submitted", title: "Ethical dilemma — patient refusing pain medication" },
    { date: "2026-02-05", course: "NURS 220", site: "Medical-Surgical",    sloNum: "1.0", type: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 4, note: "Proficient — strong ethical reasoning; pushed back appropriately on team decision." },
    { date: "2026-02-19", course: "NURS 220", site: "Medical-Surgical",    sloNum: "9.0", type: "reflection.submitted", title: "Care plan for post-op patient with complications" },
    { date: "2026-03-12", course: "NURS 220", site: "Simulation",          sloNum: "4.0", type: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 2, note: "Beginner — hesitant to delegate; works through it with debrief." },
    { date: "2026-03-26", course: "NURS 220", site: "Medical-Surgical",    type: "professionalism.observed", instructor: "Dr. Ruthie Clearwater", score: 5, dimension: "team", note: "Took initiative to brief next shift on patient priorities — beyond what assignment required." },
    { date: "2026-04-09", course: "NURS 220", site: "Medical-Surgical",    sloNum: "4.0", type: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 3, note: "Competent — delegated wound care to LPN appropriately, followed up." },
    { date: "2026-04-23", course: "NURS 220", site: "Medical-Surgical",    type: "incident.recorded", severity: "documentation", instructor: "Dr. Ruthie Clearwater", note: "Late charting on med pass — patient unaffected, addressed in shift huddle. Pattern check at end of term." },
    { date: "2026-05-15", course: "NURS 220", site: null,                   sloNum: null,  type: "grade.locked", instructor: "Dr. Ruthie Clearwater", grade: "A-", note: "Strong growth across leadership + judgment. Professionalism trending up. Locked end-of-semester.", chainAnchor: "0x7a3f...e91c" },
    { date: "2026-05-28", course: "NURS 230", site: "Clinical",             sloNum: "9.0", type: "reflection.submitted", title: "Triage decision-making in fast-paced ER environment" },
  ];

  let entryCount = 0;
  for (let i = 0; i < sarahEntries.length; i++) {
    const e = sarahEntries[i];
    const entryId = `stu_sarah_${String(i + 1).padStart(3, "0")}`;
    const data = {
      ...e,
      studentId: "stu_sarah",
      sequence: i + 1,
      isDemo: true,
      createdAt: new Date(e.date + "T16:00:00Z"),
    };
    if (APPLY) await sub("logbookEntries").doc(entryId).set(data, { merge: true });
    exported.logbookEntries.push({ entryId, ...data, createdAt: e.date });
    entryCount++;
  }
  console.log(`Sarah's logbook entries: ${entryCount}`);

  // 10. Maya + James — sparse entries to flag patterns
  const otherEntries = [
    { id: "stu_maya_001",  studentId: "stu_maya",  date: "2026-04-29", course: "NURS 220", site: "Medical-Surgical", sloNum: "8.0", type: "reflection.submitted", title: "Patient family meeting — managing emotional load (overdue grading)" },
    { id: "stu_james_001", studentId: "stu_james", date: "2026-02-19", course: "NURS 220", site: "Medical-Surgical", sloNum: "4.0", type: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 2, note: "Beginner — hesitant to delegate medication pass during full assignment; defaulted to doing everything himself." },
    { id: "stu_james_002", studentId: "stu_james", date: "2026-03-05", course: "NURS 220", site: "Simulation",       sloNum: "4.0", type: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 2, note: "Beginner — froze when sim instructor introduced second admission; needed prompt to call for help." },
    { id: "stu_james_003", studentId: "stu_james", date: "2026-04-09", course: "NURS 220", site: "Medical-Surgical", sloNum: "4.0", type: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 3, note: "Competent — delegated vitals to LPN; followed up appropriately." },
  ];
  for (const e of otherEntries) {
    const { id, ...payload } = e;
    if (APPLY) await sub("logbookEntries").doc(id).set({ ...payload, isDemo: true, createdAt: new Date(payload.date + "T16:00:00Z") }, { merge: true });
    exported.logbookEntries.push({ entryId: id, ...payload, isDemo: true, createdAt: payload.date });
  }
  console.log(`Maya + James entries: ${otherEntries.length}`);

  // 11. Ruthie as workspace owner + instructor membership
  if (APPLY) {
    await db.collection("memberships").doc(`${TENANT}_${RUTHIE_USER_ID}`).set({
      tenantId: TENANT,
      userId: RUTHIE_USER_ID,
      email: RUTHIE_EMAIL,
      role: "admin",
      status: "active",
      displayName: "Dr. Ruthie Clearwater",
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  console.log(`Membership: Ruthie as admin on ${TENANT}`);

  console.log("\n" + (APPLY ? "✅ APPLIED" : "(dry-run — re-run with --apply to write)"));
  console.log(`Tenant ID: ${TENANT}`);

  if (EXPORT_JSON || !APPLY) {
    const fs = require("fs");
    fs.writeFileSync(JSON_OUT_PATH, JSON.stringify(exported, null, 2));
    console.log(`JSON snapshot: ${JSON_OUT_PATH}`);
  }
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
