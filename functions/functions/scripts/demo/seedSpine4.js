// SPINE-4 Staff Credential Worker — seed staff_credentials / training_completions
// / credential_reminders for Meadow Creek (DEMO SPACE), per Claude's spec.
// Dates computed relative to today (2026-06-20) so deadlines stay correct.
// Idempotent (demo:true). On-screen targets: DEA 14d, Sam CVT 31d, Jordan 47d,
// Alex OSHA overdue, 18 credentials tracked, 4 reminders this month.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const TENANT = "ws_1781920656122_tl9dhn";

const TODAY = new Date("2026-06-20T00:00:00Z");
const dPlus = (n) => new Date(TODAY.getTime() + n * 86400000).toISOString().slice(0, 10);
const daysUntil = (iso) => Math.round((new Date(iso + "T00:00:00Z") - TODAY) / 86400000);
const statusOf = (iso) => { const d = daysUntil(iso); return d < 0 ? "overdue" : d <= 30 ? "expiring_soon" : "current"; };
const cred = (o) => {
  if (o.expiry_date) { o.days_remaining = daysUntil(o.expiry_date); o.status = o.status || statusOf(o.expiry_date); }
  return o;
};

const STAFF = [
  { staff_id: "maya_chen", full_name: "Dr. Maya Chen, DVM", role: "dvm_owner", email: "maya@meadowcreek.vet", credentials: [
    cred({ credential_type: "dvm_license", credential_name: "California Veterinary License", issuing_body: "CVMB", license_number: "VET-48291", expiry_date: "2027-05-31", renewal_period_months: 24, renewal_cost_usd: 450 }),
    cred({ credential_type: "dea_registration", credential_name: "DEA Controlled-Substance Registration", issuing_body: "DEA", license_number: "BC4829103", expiry_date: dPlus(14), renewal_period_months: 36, renewal_cost_usd: 888, renewal_url: "DEAdiversion.usdoj.gov", reminder_30d_sent: true, reminder_7d_sent: true }),
    cred({ credential_type: "avma_membership", credential_name: "AVMA Membership", issuing_body: "AVMA", expiry_date: "2026-12-31" }),
    cred({ credential_type: "exotic_handling", credential_name: "Exotic Animal Handling Certification", issuing_body: "AEMV", expiry_date: "2027-03-15" }),
    cred({ credential_type: "rabies_handler", credential_name: "Rabies Titer / Handler Certification", issuing_body: "State Lab", expiry_date: "2026-09-01" }),
  ]},
  { staff_id: "jordan_park", full_name: "Jordan Park, DVM", role: "dvm_associate", email: "jordan@meadowcreek.vet", credentials: [
    cred({ credential_type: "dvm_license", credential_name: "California Veterinary License", issuing_body: "CVMB", license_number: "VET-51847", expiry_date: dPlus(47), renewal_period_months: 24, renewal_cost_usd: 450, reminder_30d_sent: true }),
    cred({ credential_type: "dea_registration", credential_name: "DEA Sub-Registration (Associate)", issuing_body: "DEA", license_number: "BP5930214", expiry_date: "2027-01-15" }),
    cred({ credential_type: "rabies_handler", credential_name: "Rabies Handler Certification", issuing_body: "State Lab", expiry_date: "2027-02-28" }),
    cred({ credential_type: "soft_tissue_surgery", credential_name: "Advanced Soft Tissue Surgery", issuing_body: "ACVS", expiry_date: "2027-06-30" }),
  ]},
  { staff_id: "sam_rivera", full_name: "Sam Rivera, CVT", role: "cvt_head", email: "sam@meadowcreek.vet", credentials: [
    cred({ credential_type: "cvt_license", credential_name: "Certified Veterinary Technician — California", issuing_body: "CVTEA", license_number: "CVT-29301", expiry_date: dPlus(31), renewal_period_months: 24, renewal_cost_usd: 100, renewal_url: "veterinary.ca.gov", reminder_30d_sent: true }),
    cred({ credential_type: "anesthesia_cert", credential_name: "Veterinary Anesthesia Monitoring Cert", issuing_body: "IVAPM", expiry_date: "2027-01-01" }),
    cred({ credential_type: "rabies_handler", credential_name: "Rabies Handler Certification", issuing_body: "State Lab", expiry_date: "2027-04-10" }),
    cred({ credential_type: "osha_bloodborne", credential_name: "OSHA Bloodborne Pathogen Training", issuing_body: "OSHA", expiry_date: "2027-06-19" }),
  ]},
  { staff_id: "alex_torres", full_name: "Alex Torres", role: "vet_tech_trainee", email: "alex@meadowcreek.vet", credentials: [
    cred({ credential_type: "osha_bloodborne", credential_name: "OSHA Bloodborne Pathogen Training", issuing_body: "OSHA", expiry_date: dPlus(-31), renewal_period_months: 12, reminder_30d_sent: true, reminder_7d_sent: true }),
    cred({ credential_type: "rabies_handler", credential_name: "Rabies Handler Certification", issuing_body: "State Lab", expiry_date: "2027-03-01" }),
    { credential_type: "vtne_enrollment", credential_name: "CVT Exam Prep Course (Dr. Chen)", issuing_body: "Meadow Creek / SOCIII", expiry_date: null, status: "in_progress", days_remaining: null, notes: "Enrolled 2026-04-01, exam in ~6 weeks" },
  ]},
  { staff_id: "casey_kim", full_name: "Casey Kim", role: "office_manager", email: "casey@meadowcreek.vet", credentials: [
    cred({ credential_type: "practice_mgmt_cert", credential_name: "Veterinary Practice Management Certificate", issuing_body: "VHMA", expiry_date: "2027-01-15" }),
    cred({ credential_type: "osha_bloodborne", credential_name: "OSHA Bloodborne Pathogen Training", issuing_body: "OSHA", expiry_date: "2027-06-15" }),
    cred({ credential_type: "client_comms", credential_name: "Client Communication Certificate", issuing_body: "VHMA", expiry_date: "2027-06-01" }),
  ]},
];

const TRAINING = [
  { staff_id: "sam_rivera", training_name: "Exotic Animal Anesthesia — CE Webinar", training_type: "anesthesia_monitoring", provider: "Dr. Chen / SOCIII", completion_date: "2026-05-10", ce_hours: 2 },
  { staff_id: "alex_torres", training_name: "CVT Exam Prep — Module 1: Pharmacology", training_type: "vtne_module", provider: "Dr. Chen / SOCIII", completion_date: "2026-05-15", ce_hours: 3 },
  { staff_id: "alex_torres", training_name: "CVT Exam Prep — Module 2: Surgical Nursing", training_type: "vtne_module", provider: "Dr. Chen / SOCIII", completion_date: "2026-06-01", ce_hours: 3 },
  { staff_id: "jordan_park", training_name: "Soft Tissue Surgery Refresher", training_type: "anesthesia_monitoring", provider: "ACVS Online", completion_date: "2026-04-20", ce_hours: 4 },
  { staff_id: "casey_kim", training_name: "OSHA Annual Safety Refresher", training_type: "osha_bloodborne", provider: "SafetyFirst", completion_date: "2026-06-15", ce_hours: 1 },
  { staff_id: "sam_rivera", training_name: "Controlled Substance Handling Update", training_type: "controlled_substance_handling", provider: "DEA Online", completion_date: "2026-03-01", ce_hours: 2 },
  { staff_id: "maya_chen", training_name: "Exotic Species CE — AEMV Conference", training_type: "exotic_handling", provider: "AEMV", completion_date: "2026-02-14", ce_hours: 8 },
  { staff_id: "alex_torres", training_name: "Rabies Handler Re-certification", training_type: "rabies_handler", provider: "State Lab", completion_date: "2025-03-01", ce_hours: 0 },
  { staff_id: "jordan_park", training_name: "California Vet License CE — Ethics", training_type: "dvm_license", provider: "CVMB", completion_date: "2026-01-10", ce_hours: 3 },
  { staff_id: "sam_rivera", training_name: "CPR / Emergency Response", training_type: "cpr", provider: "Red Cross Vet", completion_date: "2025-11-20", ce_hours: 4, expiry_date: "2027-11-20" },
];

const REMINDERS = [
  { staff_id: "maya_chen",   credential_type: "dea_registration", days_before_expiry: 30, sent_at: dPlus(-16), channel: "email", status: "sent" },
  { staff_id: "maya_chen",   credential_type: "dea_registration", days_before_expiry: 7,  sent_at: dPlus(-7),  channel: "sms",   status: "sent" },
  { staff_id: "jordan_park", credential_type: "dvm_license",      days_before_expiry: 30, sent_at: dPlus(-12), channel: "email", status: "sent" },
  { staff_id: "sam_rivera",  credential_type: "cvt_license",      days_before_expiry: 30, sent_at: dPlus(-4),  channel: "email", status: "sent" },
];

(async () => {
  for (const coll of ["staff_credentials", "training_completions", "credential_reminders"]) {
    const prior = await db.collection(coll).where("tenantId","==",TENANT).where("demo","==",true).get();
    const b = db.batch(); prior.forEach(d => b.delete(d.ref));
    if (!prior.empty) { await b.commit(); console.log(`cleared ${prior.size} demo ${coll}`); }
  }
  const batch = db.batch();
  let totalCreds = 0;
  for (const s of STAFF) {
    totalCreds += s.credentials.filter(c => c.status !== "in_progress").length;
    batch.set(db.collection("staff_credentials").doc(), { tenantId: TENANT, demo: true, ...s, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  for (const t of TRAINING) batch.set(db.collection("training_completions").doc(), { tenantId: TENANT, demo: true, ...t, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  for (const r of REMINDERS) batch.set(db.collection("credential_reminders").doc(), { tenantId: TENANT, demo: true, ...r, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  await batch.commit();
  console.log(`✓ SPINE-4 seeded: ${STAFF.length} staff, ${totalCreds} credentials tracked, ${TRAINING.length} trainings, ${REMINDERS.length} reminders`);
  console.log(`  DEA ${dPlus(14)} (14d) · Sam CVT ${dPlus(31)} (31d) · Jordan license ${dPlus(47)} (47d) · Alex OSHA ${dPlus(-31)} OVERDUE`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
