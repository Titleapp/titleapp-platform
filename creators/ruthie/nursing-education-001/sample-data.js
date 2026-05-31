/**
 * Sample data for the nursing-education-001 worker.
 *
 * All courses, SLOs, sites, and reflection structures are pulled verbatim from
 * Ruthie Clearwater's Master Config Sheet (sociii drive, original Google Sheet
 * id 1JDNoga4dsJ3MDMhgUaTvHhxmit71ypYLD7dax0Hzf54). Student names are placeholder
 * personas for demo until Ruthie picks a real student to feature as "Sarah."
 */

export const COURSES = [
  { code: "NURS 210", name: "Health Promotion Across the Lifespan", sloCount: 9, status: "active" },
  { code: "NURS 220", name: "Health & Illness I",                   sloCount: 9, status: "active" },
  { code: "NURS 230", name: "Clinical Immersion I",                  sloCount: 9, status: "active" },
  { code: "NURS 320", name: "Family Nursing",                        sloCount: 9, status: "active" },
  { code: "NURS 360", name: "Complex Care",                          sloCount: 9, status: "active" },
];

// SLOs lifted directly from her sheet — these are her ANA Standards mapping
export const SLOS_NURS_220 = [
  { num: "1.0", short: "Ethics",        title: "Utilize ANA Standards of Practice and Code of Ethics" },
  { num: "2.0", short: "Reflection",    title: "Develop a structured plan to reflect on personal nursing process" },
  { num: "3.0", short: "Evidence",      title: "Choose reliable sources of information to support nursing care decisions" },
  { num: "4.0", short: "Leadership",    title: "Specify nursing care situations requiring delegation and leadership" },
  { num: "5.0", short: "Teamwork",      title: "Practice in the role of professional nurse as part of the healthcare team" },
  { num: "6.0", short: "Resources",     title: "Identify factors that influence access and continuity of healthcare" },
  { num: "7.0", short: "Client Care",   title: "Deliver client-centered care" },
  { num: "8.0", short: "Communication", title: "Use therapeutic communication skills with clients and families" },
  { num: "9.0", short: "Judgment",      title: "Develop a plan of care incorporating evidence-based strategies" },
];

export const SLOS_NURS_320 = [
  { num: "1.0", short: "Ethics",        title: "Apply the ANA Code of Ethics to care of families" },
  { num: "2.0", short: "Reflection",    title: "Reflect on nursing practice in managing care" },
  { num: "3.0", short: "Evidence",      title: "Seek information to develop plans of nursing care" },
  { num: "4.0", short: "Leadership",    title: "Apply basic leadership skills in the care of families" },
  { num: "5.0", short: "Teamwork",      title: "Practice as a member of a multi-disciplinary team" },
  { num: "6.0", short: "Resources",     title: "Recognize benefits and limitations of community support" },
  { num: "7.0", short: "Family Care",   title: "Deliver family centered care" },
  { num: "8.0", short: "Communication", title: "Demonstrate therapeutic communication skills" },
  { num: "9.0", short: "Judgment",      title: "Implement plans of care based on assessments" },
];

export const CLINICAL_SITES = {
  "NURS 210": ["Hale Makua (LTC)", "Kula Hospital (LTC)"],
  "NURS 220": ["Medical-Surgical", "Simulation"],
  "NURS 320": ["MMMG", "Peds MCE 1", "Peds MCE 2", "Clinical", "ER", "Hospice", "MNWH", "Simulation - MNWH"],
};

export const TANNER_FRAMEWORK = {
  name: "Tanner Clinical Judgment Framework",
  phases: [
    { key: "noticing",     label: "Noticing",     prompt: "What did you notice in this situation?" },
    { key: "interpreting", label: "Interpreting", prompt: "What standard, expectation, or guidance helped you make sense of it?" },
    { key: "responding",   label: "Responding",   prompt: "How did you act?" },
    { key: "reflecting",   label: "Reflecting",   prompt: "What did you learn, and what would you do differently?" },
  ],
  reflectionStructure: [
    { step: 1, label: "Scenario Description", guidance: "Briefly describe the patient, setting, date, and your role." },
    { step: 2, label: "Analysis",             guidance: "Explain what you noticed, what guidance helped you understand, and what you did. Use Tanner: Noticing → Interpreting → Responding → Reflecting." },
    { step: 3, label: "Evaluation",           guidance: "Reflect on the patient's response, your learning, and what you would do differently next time." },
    { step: 4, label: "Future Goal",          guidance: "Identify one small, realistic next step for improvement. Address all 6 Closing Prompts." },
  ],
};

export const COHORTS = [
  { name: "Faculty Playground", status: "active", studentCount: 0, sheetIdLegacy: "1TqTXIo6yeE_wDSu-6FZHo3eq0aJN_ocE5OvxfJpElBQ" },
  { name: "ASN20",              status: "active", studentCount: 0, sheetIdLegacy: "1bs_-hn7E2TFevHlRHDONeN_gWZr3Gcbx1Ns5EHbDDO0" },
];

// Demo personas — to be replaced with Ruthie's chosen real student for "Sarah"
export const DEMO_STUDENTS = [
  {
    id: "stu_sarah",
    name: "Sarah K.",
    cohort: "ASN20",
    enrolledISO: "2025-08-26",
    currentCourse: "NURS 230",
    coursesTaken: ["NURS 210", "NURS 220"],
    journey: [
      { dateISO: "2025-09-04", course: "NURS 210", site: "Hale Makua (LTC)",   sloNum: "7.0", event: "reflection.submitted", title: "First LTC shift — patient with mid-stage dementia" },
      { dateISO: "2025-09-11", course: "NURS 210", site: "Hale Makua (LTC)",   sloNum: "8.0", event: "reflection.submitted", title: "Therapeutic communication with non-verbal patient" },
      { dateISO: "2025-09-18", course: "NURS 210", site: "Hale Makua (LTC)",   sloNum: "7.0", event: "slo.observed", instructor: "Dr. Wendy Dahmen", score: 3, note: "Competent — task completion solid; building confidence with families" },
      { dateISO: "2025-10-23", course: "NURS 210", site: "Kula Hospital (LTC)",sloNum: "6.0", event: "reflection.submitted", title: "Resource access for uninsured family" },
      { dateISO: "2025-12-04", course: "NURS 210", site: null,                  sloNum: null,  event: "grade.locked", instructor: "Dr. Wendy Dahmen", grade: "B+", note: "Locked end-of-semester; consistent reflective practice" },
      { dateISO: "2026-01-22", course: "NURS 220", site: "Medical-Surgical",   sloNum: "1.0", event: "reflection.submitted", title: "Ethical dilemma — patient refusing pain medication" },
      { dateISO: "2026-02-05", course: "NURS 220", site: "Medical-Surgical",   sloNum: "1.0", event: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 4, note: "Proficient — strong ethical reasoning; pushed back appropriately on team decision" },
      { dateISO: "2026-02-19", course: "NURS 220", site: "Medical-Surgical",   sloNum: "9.0", event: "reflection.submitted", title: "Care plan for post-op patient with complications" },
      { dateISO: "2026-03-12", course: "NURS 220", site: "Simulation",         sloNum: "4.0", event: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 2, note: "Beginner — hesitant to delegate; works through it with debrief" },
      { dateISO: "2026-04-09", course: "NURS 220", site: "Medical-Surgical",   sloNum: "4.0", event: "slo.observed", instructor: "Dr. Ruthie Clearwater", score: 3, note: "Competent — delegated wound care to LPN appropriately, followed up" },
      { dateISO: "2026-05-15", course: "NURS 220", site: null,                  sloNum: null,  event: "grade.locked", instructor: "Dr. Ruthie Clearwater", grade: "A-", note: "Strong growth across leadership and judgment. Locked end-of-semester." },
      { dateISO: "2026-05-28", course: "NURS 230", site: "Clinical",            sloNum: "9.0", event: "reflection.submitted", title: "Triage decision-making in fast-paced ER environment" },
    ],
  },
  {
    id: "stu_maya",
    name: "Maya L.",
    cohort: "ASN20",
    enrolledISO: "2025-08-26",
    currentCourse: "NURS 220",
    coursesTaken: ["NURS 210"],
    flag: "Behind on reflections — last submission 12 days ago. Consider check-in.",
  },
  {
    id: "stu_james",
    name: "James C.",
    cohort: "ASN20",
    enrolledISO: "2025-08-26",
    currentCourse: "NURS 220",
    coursesTaken: ["NURS 210"],
    flag: "Strong reflections, struggling with delegation (SLO 4) — pattern across 3 observations.",
  },
];

// Audit trail sample — shows what faculty see when they click "show me the receipts"
export const AUDIT_TRAIL_SAMPLE = [
  { tsISO: "2026-05-15T16:42:11Z", actor: "Dr. Ruthie Clearwater (verified)", action: "grade.locked",          target: "Sarah K. / NURS 220 / final",   chainAnchorHash: "0x7a3f...e91c", verified: true  },
  { tsISO: "2026-05-15T16:42:11Z", actor: "system",                            action: "chain.anchor.confirmed", target: "0x7a3f...e91c",                  chainAnchorHash: "0x7a3f...e91c", verified: true  },
  { tsISO: "2026-05-15T16:48:09Z", actor: "Dr. Ruthie Clearwater (verified)", action: "grade.unlock_attempted", target: "Sarah K. / NURS 220 / final",   chainAnchorHash: null,            verified: false, rejectReason: "Locked grades are immutable. Audit log entry preserved." },
  { tsISO: "2026-05-20T09:14:33Z", actor: "Sarah K. (verified)",                action: "record.exported",        target: "Sarah K. / full record",         chainAnchorHash: null,            verified: true, note: "FERPA portable export, signed for student" },
  { tsISO: "2026-05-21T11:02:17Z", actor: "Dr. Wendy Dahmen (verified)",        action: "reflection.read",        target: "Sarah K. / NURS 220 / SLO 1.0", chainAnchorHash: null,            verified: true  },
];

// What the canvas shows for each tab — wired by tab id
export const SAMPLE_CANVAS_PAYLOADS = {
  "students": {
    title: "Students — your active cohort",
    subtitle: `Sample data · ${DEMO_STUDENTS.length} students across ASN20`,
    fields: [
      { label: "Active",                 value: String(DEMO_STUDENTS.length) },
      { label: "Behind this week",       value: "1" },
      { label: "Reflections to grade",   value: "4" },
      { label: "Locked grades this term", value: "1" },
    ],
    students: DEMO_STUDENTS,
  },
  "journey": {
    title: "Sarah K. — longitudinal journey",
    subtitle: "Sample data · 8 months across NURS 210 → NURS 220 → NURS 230",
    student: DEMO_STUDENTS[0],
  },
  "reflections": {
    title: "Reflections inbox",
    subtitle: "Sample data · Tanner framework rendering",
    framework: TANNER_FRAMEWORK,
    pending: 4,
    items: [
      { student: "Sarah K.",  course: "NURS 230", slo: "9.0", submittedISO: "2026-05-28", title: "Triage decision-making in fast-paced ER environment" },
      { student: "Maya L.",   course: "NURS 220", slo: "8.0", submittedISO: "2026-05-26", title: "Patient family meeting — managing emotional load" },
      { student: "James C.",  course: "NURS 220", slo: "4.0", submittedISO: "2026-05-25", title: "Delegating wound care under time pressure" },
    ],
  },
  "slos": {
    title: "SLOs — rubric library",
    subtitle: "Sample data · NURS 220 + NURS 320 (you have all 5 courses defined)",
    courses: [
      { code: "NURS 220", slos: SLOS_NURS_220 },
      { code: "NURS 320", slos: SLOS_NURS_320 },
    ],
  },
  "cohorts": {
    title: "Cohorts",
    subtitle: "Sample data · 2 active",
    cohorts: COHORTS,
  },
  "audit": {
    title: "Audit Trail",
    subtitle: "Sample data · every action timestamped, identity-verified, chain-anchored where applicable",
    entries: AUDIT_TRAIL_SAMPLE,
  },
};
