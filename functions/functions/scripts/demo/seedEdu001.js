// Seed EDU-001 CVT Exam Prep Worker (creators/maya/edu-001-cvt-exam-prep):
// Spring 2026 cohort of 8 students, Alex Torres's 5 completed modules, the
// 9-module curriculum + cohort analytics; register the worker and add it to
// Dr. Chen's workspace. Serves B5 + S2-6. Idempotent (demo:true).
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2";
const TENANT = "ws_1781920656122_tl9dhn";
const COHORT = "spring-2026";

const ENROLLMENTS = [
  { enrollment_id: "enr-001", student_id: "alex_torres", student_name: "Alex Torres", student_email: "alex.torres@meadowcreekvet.com", exam_date: "2026-07-28", status: "active", modules_completed: 5, modules_total: 9, ce_hours_earned: 10.0, ce_hours_total: 18.0, overall_practice_score_pct: 71.4, weak_domains: ["anesthesia", "surgical_nursing"], last_active: "2026-06-16T19:30:00Z" },
  { enrollment_id: "enr-002", student_id: "priya_nair", student_name: "Priya Nair", student_email: "priya.nair@gmail.com", exam_date: "2026-07-28", status: "active", modules_completed: 7, modules_total: 9, ce_hours_earned: 14.0, ce_hours_total: 18.0, overall_practice_score_pct: 84.2, weak_domains: ["diagnostic_imaging"], last_active: "2026-06-17T08:15:00Z" },
  { enrollment_id: "enr-003", student_id: "marcus_webb", student_name: "Marcus Webb", student_email: "marcus.webb@outlook.com", exam_date: "2026-07-28", status: "active", modules_completed: 3, modules_total: 9, ce_hours_earned: 6.0, ce_hours_total: 18.0, overall_practice_score_pct: 58.1, weak_domains: ["pharmacology", "anesthesia", "laboratory_procedures"], last_active: "2026-06-10T14:00:00Z" },
  { enrollment_id: "enr-004", student_id: "sofia_reyes", student_name: "Sofia Reyes", student_email: "sofia.reyes@gmail.com", exam_date: "2026-07-28", status: "completed", modules_completed: 9, modules_total: 9, ce_hours_earned: 18.0, ce_hours_total: 18.0, overall_practice_score_pct: 91.3, weak_domains: [], last_active: "2026-06-15T20:00:00Z" },
  { enrollment_id: "enr-005", student_id: "james_okafor", student_name: "James Okafor", student_email: "james.okafor@yahoo.com", exam_date: "2026-07-28", status: "active", modules_completed: 6, modules_total: 9, ce_hours_earned: 12.0, ce_hours_total: 18.0, overall_practice_score_pct: 76.8, weak_domains: ["emergency_critical_care"], last_active: "2026-06-17T11:45:00Z" },
  { enrollment_id: "enr-006", student_id: "taylor_nguyen", student_name: "Taylor Nguyen", student_email: "taylor.nguyen@gmail.com", exam_date: "2026-07-28", status: "active", modules_completed: 8, modules_total: 9, ce_hours_earned: 16.0, ce_hours_total: 18.0, overall_practice_score_pct: 88.5, weak_domains: ["pain_management"], last_active: "2026-06-16T21:00:00Z" },
  { enrollment_id: "enr-007", student_id: "dana_flores", student_name: "Dana Flores", student_email: "dana.flores@icloud.com", exam_date: "2026-07-28", status: "active", modules_completed: 4, modules_total: 9, ce_hours_earned: 8.0, ce_hours_total: 18.0, overall_practice_score_pct: 64.3, weak_domains: ["pharmacology", "surgical_nursing"], last_active: "2026-06-12T16:30:00Z" },
  { enrollment_id: "enr-008", student_id: "ryan_choi", student_name: "Ryan Choi", student_email: "ryan.choi@gmail.com", exam_date: "2026-07-28", status: "active", modules_completed: 6, modules_total: 9, ce_hours_earned: 12.0, ce_hours_total: 18.0, overall_practice_score_pct: 79.1, weak_domains: ["dentistry"], last_active: "2026-06-17T09:00:00Z" },
];

const ALEX_COMPLETIONS = [
  { student_id: "alex_torres", module_id: "mod-01-pharmacology-basics", module_name: "Veterinary Pharmacology Fundamentals", vtne_domain: "pharmacology", completed_at: "2026-04-15", ce_hours_awarded: 2.0, practice_score_pct: 68.0, vault_event_written: true },
  { student_id: "alex_torres", module_id: "mod-02-animal-care-nursing", module_name: "Animal Care & Nursing", vtne_domain: "animal_care_nursing", completed_at: "2026-04-29", ce_hours_awarded: 2.0, practice_score_pct: 80.0, vault_event_written: true },
  { student_id: "alex_torres", module_id: "mod-03-laboratory-procedures", module_name: "Laboratory Procedures", vtne_domain: "laboratory_procedures", completed_at: "2026-05-13", ce_hours_awarded: 2.0, practice_score_pct: 74.0, vault_event_written: true },
  { student_id: "alex_torres", module_id: "mod-04-surgical-nursing", module_name: "Surgical Nursing & Assisting", vtne_domain: "surgical_nursing", completed_at: "2026-06-01", ce_hours_awarded: 2.0, practice_score_pct: 62.0, vault_event_written: true },
  { student_id: "alex_torres", module_id: "mod-05-diagnostic-imaging", module_name: "Diagnostic Imaging", vtne_domain: "diagnostic_imaging", completed_at: "2026-06-16", ce_hours_awarded: 2.0, practice_score_pct: 71.0, vault_event_written: true },
];

const MODULES = [
  { module_id: "mod-01-pharmacology-basics", module_number: 1, module_name: "Veterinary Pharmacology Fundamentals", vtne_domain: "pharmacology", week: 1, ce_hours: 2.0, estimated_time_minutes: 90 },
  { module_id: "mod-02-animal-care-nursing", module_number: 2, module_name: "Animal Care & Nursing", vtne_domain: "animal_care_nursing", week: 2, ce_hours: 2.0, estimated_time_minutes: 80 },
  { module_id: "mod-03-laboratory-procedures", module_number: 3, module_name: "Laboratory Procedures", vtne_domain: "laboratory_procedures", week: 3, ce_hours: 2.0, estimated_time_minutes: 85 },
  { module_id: "mod-04-surgical-nursing", module_number: 4, module_name: "Surgical Nursing & Assisting", vtne_domain: "surgical_nursing", week: 5, ce_hours: 2.0, estimated_time_minutes: 100 },
  { module_id: "mod-05-diagnostic-imaging", module_number: 5, module_name: "Diagnostic Imaging", vtne_domain: "diagnostic_imaging", week: 6, ce_hours: 2.0, estimated_time_minutes: 75 },
  { module_id: "mod-06-anesthesia", module_number: 6, module_name: "Anesthesia & Pain Management", vtne_domain: "anesthesia", week: 7, ce_hours: 2.0, estimated_time_minutes: 110 },
  { module_id: "mod-07-emergency", module_number: 7, module_name: "Emergency & Critical Care", vtne_domain: "emergency_critical_care", week: 8, ce_hours: 2.0, estimated_time_minutes: 95 },
  { module_id: "mod-08-dentistry", module_number: 8, module_name: "Dentistry", vtne_domain: "dentistry", week: 10, ce_hours: 2.0, estimated_time_minutes: 70 },
  { module_id: "mod-09-pain-management", module_number: 9, module_name: "Pain Management Protocols", vtne_domain: "pain_management", week: 11, ce_hours: 2.0, estimated_time_minutes: 80 },
];

const ANALYTICS = {
  cohort_id: COHORT, cohort_name: "Spring 2026 CVT Prep", start_date: "2026-04-01", exam_date: "2026-07-28",
  total_enrolled: 8, active_students: 7, avg_completion_pct: 63.9, avg_practice_score_pct: 76.7,
  weak_domains_aggregate: [
    { domain: "anesthesia", avg_score_pct: 64.2 },
    { domain: "surgical_nursing", avg_score_pct: 66.8 },
    { domain: "pharmacology", avg_score_pct: 68.1 },
  ],
  at_risk_students: 2, ce_hours_issued_total: 96.0,
};

const TABS = [
  { id: "progress",   label: "Dashboard",  signal: "card:edu-cohort", default: true, order: 0 },
  { id: "records",    label: "Records",    signal: "card:edu-cohort", order: 1 },
  { id: "cohort",     label: "Cohort",     signal: "card:edu-cohort", order: 2 },
  { id: "curriculum", label: "Curriculum", signal: "card:edu-cohort", order: 3 },
];

async function clearDemo(coll) {
  const snap = await db.collection(coll).where("tenantId", "==", TENANT).where("demo", "==", true).get();
  if (!snap.empty) { const b = db.batch(); snap.docs.forEach(d => b.delete(d.ref)); await b.commit(); }
}

(async () => {
  for (const c of ["course_enrollments", "module_completions", "curriculum_modules", "cohort_analytics"]) await clearDemo(c);

  let b = db.batch();
  for (const e of ENROLLMENTS) b.set(db.collection("course_enrollments").doc(e.enrollment_id), { tenantId: TENANT, demo: true, cohort_id: COHORT, enrollment_date: "2026-04-01", ...e });
  for (const c of ALEX_COMPLETIONS) b.set(db.collection("module_completions").doc(), { tenantId: TENANT, demo: true, ...c });
  for (const m of MODULES) b.set(db.collection("curriculum_modules").doc(m.module_id), { tenantId: TENANT, demo: true, ...m });
  b.set(db.collection("cohort_analytics").doc(COHORT), { tenantId: TENANT, demo: true, ...ANALYTICS });
  await b.commit();
  console.log(`✓ seeded ${ENROLLMENTS.length} students, ${ALEX_COMPLETIONS.length} Alex completions, ${MODULES.length} modules, analytics`);

  await db.collection("digitalWorkers").doc("edu-001-cvt-exam-prep").set({
    slug: "edu-001-cvt-exam-prep", worker_id: "EDU-001", display_name: "CVT Exam Prep", name: "CVT Exam Prep",
    vertical: "veterinary", suite: "Veterinary", status: "live", canvasTabs: TABS,
    description: "Dr. Chen's VTNE-mapped CVT exam-prep course — tracks every student's progress, flags weak domains, and writes tamper-evident completion records to their own Vault.",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log("✓ registered digitalWorkers/edu-001-cvt-exam-prep");

  const wsRef = db.collection("users").doc(UID).collection("workspaces").doc(TENANT);
  const cur = Array.isArray((await wsRef.get()).data()?.activeWorkers) ? (await wsRef.get()).data().activeWorkers : [];
  const next = Array.from(new Set([...cur, "edu-001-cvt-exam-prep"]));
  await wsRef.set({ activeWorkers: next }, { merge: true });
  console.log(`✓ activeWorkers now: ${next.join(", ")}`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
