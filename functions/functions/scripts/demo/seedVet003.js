// Seed VET-003 Drug Dosing Worker (creators/maya/vet-003-drug-dosing) for the
// demo: 12 dosing orders + 4 protocols, register the worker (+ the missing
// SPINE-4 staff-credential worker), and add VET-003, SPINE-4, and the Real
// Estate worker (title-abstract-001) to Dr. Chen's workspace. Idempotent.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2";
const TENANT = "ws_1781920656122_tl9dhn";

// 12 dosing orders. The Burmese python (ord-004) is the live PROPOSAL awaiting
// approval (drives B1 + S2-3); the rest are approved history.
const ORDERS = [
  { order_id: "ord-001", timestamp: "2026-06-10T09:22:00Z", patient_name: "Biscuit", species: "Canine", breed: "Golden Retriever", weight_kg: 28.4, drug_name: "Meloxicam", dea_schedule: null, dose_mg_per_kg: 0.2, total_dose_mg: 5.68, concentration_available_mg_per_ml: 5.0, volume_to_draw_ml: 1.14, route: "SQ", frequency: "Once, then PO q24h", duration: "5 days", indication: "Post-op pain — dental extraction", source_citation: "Plumb's 9th ed., p. 732", approved_by: "maya_chen" },
  { order_id: "ord-002", timestamp: "2026-06-11T14:05:00Z", patient_name: "Mr. Pickles", species: "Feline", breed: "Domestic Shorthair", weight_kg: 4.2, drug_name: "Buprenorphine", dea_schedule: "III", dose_mg_per_kg: 0.02, total_dose_mg: 0.084, concentration_available_mg_per_ml: 0.3, volume_to_draw_ml: 0.28, route: "IV", frequency: "q6-8h", duration: "24 hours", indication: "Perioperative analgesia — ovariohysterectomy", source_citation: "Plumb's 9th ed., p. 184", approved_by: "jordan_park" },
  { order_id: "ord-003", timestamp: "2026-06-12T10:45:00Z", patient_name: "Kiki", species: "Avian", breed: "African Grey Parrot", weight_kg: 0.48, drug_name: "Midazolam", dea_schedule: "IV", dose_mg_per_kg: 1.0, total_dose_mg: 0.48, concentration_available_mg_per_ml: 5.0, volume_to_draw_ml: 0.096, route: "IM", frequency: "Once — pre-sedation", duration: "Single dose", indication: "Pre-anesthetic sedation", source_citation: "Carpenter's Exotic Animal Formulary, 5th ed., p. 238", approved_by: "maya_chen" },
  { order_id: "ord-004", timestamp: "2026-06-13T16:30:00Z", patient_name: "Slinky", species: "Reptile", breed: "Burmese Python", weight_kg: 4.2, drug_name: "Dexmedetomidine + Ketamine", dea_schedule: "III", dose_mg_per_kg: 0.1, total_dose_mg: 0.42, route: "IM", frequency: "Once — induction", duration: "Single dose", indication: "Sedation — routine physical exam, large constrictor", source_citation: "Carpenter's Exotic Animal Formulary, 5th ed., p. 95", protocol_id: "reptile-sedation-large-constrictor", status: "proposed" },
  { order_id: "ord-005", timestamp: "2026-06-14T08:15:00Z", patient_name: "Luna", species: "Canine", breed: "Labrador Retriever", weight_kg: 32.1, drug_name: "Carprofen", dea_schedule: null, dose_mg_per_kg: 2.2, total_dose_mg: 70.62, route: "PO", frequency: "q12h", duration: "7 days", indication: "Osteoarthritis — chronic pain", source_citation: "Plumb's 9th ed., p. 210", approved_by: "jordan_park" },
  { order_id: "ord-006", timestamp: "2026-06-15T11:00:00Z", patient_name: "Duchess", species: "Feline", breed: "Persian", weight_kg: 3.8, drug_name: "Maropitant", dea_schedule: null, dose_mg_per_kg: 1.0, total_dose_mg: 3.8, route: "SQ", frequency: "q24h", duration: "5 days", indication: "Post-op nausea — GI surgery", source_citation: "Plumb's 9th ed., p. 748", approved_by: "maya_chen" },
  { order_id: "ord-007", timestamp: "2026-06-15T14:22:00Z", patient_name: "Hazel", species: "Rabbit", breed: "Holland Lop", weight_kg: 1.9, drug_name: "Meloxicam", dea_schedule: null, dose_mg_per_kg: 0.5, total_dose_mg: 0.95, route: "PO", frequency: "q24h", duration: "3 days", indication: "Post-spay analgesia", source_citation: "Carpenter's Exotic Animal Formulary, 5th ed., p. 572", approved_by: "jordan_park" },
  { order_id: "ord-008", timestamp: "2026-06-16T09:45:00Z", patient_name: "Max", species: "Canine", breed: "French Bulldog", weight_kg: 11.2, drug_name: "Propofol", dea_schedule: null, dose_mg_per_kg: 4.0, total_dose_mg: 44.8, concentration_available_mg_per_ml: 10.0, volume_to_draw_ml: 4.48, route: "IV", frequency: "Once — induction, titrate", duration: "Single dose", indication: "Anesthesia induction — soft palate resection (BOAS)", source_citation: "Plumb's 9th ed., p. 864", interactions_flagged: ["Brachycephalic breed — reduce induction dose, have reversal agents ready"], approved_by: "maya_chen" },
  { order_id: "ord-009", timestamp: "2026-06-16T13:10:00Z", patient_name: "Thumper", species: "Rabbit", breed: "Mini Rex", weight_kg: 2.1, drug_name: "Enrofloxacin", dea_schedule: null, dose_mg_per_kg: 5.0, total_dose_mg: 10.5, route: "PO", frequency: "q12h", duration: "10 days", indication: "Bacterial respiratory infection", source_citation: "Carpenter's Exotic Animal Formulary, 5th ed., p. 578", approved_by: "jordan_park" },
  { order_id: "ord-010", timestamp: "2026-06-17T08:30:00Z", patient_name: "Charlie", species: "Canine", breed: "Beagle", weight_kg: 12.3, drug_name: "Tramadol", dea_schedule: null, dose_mg_per_kg: 2.0, total_dose_mg: 24.6, route: "PO", frequency: "q8h", duration: "7 days", indication: "Post-orthopedic surgery analgesia", source_citation: "Plumb's 9th ed., p. 1042", approved_by: "maya_chen" },
  { order_id: "ord-011", timestamp: "2026-06-17T10:15:00Z", patient_name: "Mango", species: "Avian", breed: "Cockatiel", weight_kg: 0.09, drug_name: "Midazolam", dea_schedule: "IV", dose_mg_per_kg: 1.5, total_dose_mg: 0.135, concentration_available_mg_per_ml: 5.0, volume_to_draw_ml: 0.027, route: "IM", frequency: "Once — pre-sedation", duration: "Single dose", indication: "Pre-anesthetic — crop biopsy", source_citation: "Carpenter's Exotic Animal Formulary, 5th ed., p. 238", approved_by: "maya_chen" },
  { order_id: "ord-012", timestamp: "2026-06-17T15:45:00Z", patient_name: "Bella", species: "Feline", breed: "Maine Coon", weight_kg: 6.8, drug_name: "Gabapentin", dea_schedule: null, dose_mg_per_kg: 5.0, total_dose_mg: 34.0, route: "PO", frequency: "q12h", duration: "30 days", indication: "Chronic neuropathic pain — DJD", source_citation: "Plumb's 9th ed., p. 535", approved_by: "jordan_park" },
];

const PROTOCOLS = [
  { protocol_id: "canine-pre-anesthesia-healthy", protocol_name: "Canine Pre-Anesthesia — Healthy Adult", species: ["Canine"], procedure_type: "anesthesia", source: "Plumb's 9th ed. / AAHA Anesthesia Guidelines", steps: [
    { step: 1, drug: "Acepromazine", dose_mg_per_kg: 0.05, route: "IM", timing: "30 min pre-induction" },
    { step: 2, drug: "Hydromorphone", dose_mg_per_kg: 0.1, dea_schedule: "II", route: "IM", timing: "30 min pre-induction" },
    { step: 3, drug: "Propofol", dose_mg_per_kg: 4.0, route: "IV", timing: "Induction — titrate" },
    { step: 4, drug: "Isoflurane", dose_mg_per_kg: null, route: "Inhalant", timing: "Maintenance 1.5-2.5%" } ] },
  { protocol_id: "feline-pre-anesthesia-healthy", protocol_name: "Feline Pre-Anesthesia — Healthy Adult", species: ["Feline"], procedure_type: "anesthesia", source: "Plumb's 9th ed. / AAFP Anesthesia Guidelines", steps: [
    { step: 1, drug: "Dexmedetomidine", dose_mg_per_kg: 0.01, route: "IM", timing: "20 min pre-induction" },
    { step: 2, drug: "Buprenorphine", dose_mg_per_kg: 0.02, dea_schedule: "III", route: "IM", timing: "20 min pre-induction" },
    { step: 3, drug: "Alfaxalone", dose_mg_per_kg: 2.0, route: "IV", timing: "Induction — titrate" },
    { step: 4, drug: "Isoflurane", dose_mg_per_kg: null, route: "Inhalant", timing: "Maintenance 1.5-2.0%" } ] },
  { protocol_id: "reptile-sedation-large-constrictor", protocol_name: "Reptile Sedation — Large Constrictor (>3kg)", species: ["Reptile"], procedure_type: "sedation", source: "Carpenter's Exotic Animal Formulary, 5th ed.", steps: [
    { step: 1, drug: "Dexmedetomidine", dose_mg_per_kg: 0.1, route: "IM", timing: "30-60 min pre-procedure" },
    { step: 2, drug: "Ketamine", dose_mg_per_kg: 5.0, dea_schedule: "III", route: "IM", timing: "Same injection" } ] },
  { protocol_id: "avian-pre-anesthesia-psittacine", protocol_name: "Avian Pre-Anesthesia — Psittacine", species: ["Avian"], procedure_type: "anesthesia", source: "Carpenter's Exotic Animal Formulary, 5th ed.", steps: [
    { step: 1, drug: "Midazolam", dose_mg_per_kg: 1.0, dea_schedule: "IV", route: "IM", timing: "15-20 min pre-induction" },
    { step: 2, drug: "Isoflurane", dose_mg_per_kg: null, route: "Mask", timing: "Induction 4-5%, maint 1.5-2.5%" } ] },
];

const VET003_TABS = [
  { id: "calculator", label: "Calculator",    signal: "card:vet-dosing", default: true, order: 0 },
  { id: "history",    label: "Order History", signal: "card:vet-dosing", order: 1 },
  { id: "protocols",  label: "Protocols",     signal: "card:vet-dosing", order: 2 },
  { id: "schedule",   label: "Controlled Log",signal: "card:vet-dosing", order: 3 },
];
const SPINE4_TABS = [
  { id: "dashboard",   label: "Dashboard",   signal: "card:work-product", default: true, order: 0 },
  { id: "credentials", label: "Credentials", signal: "card:work-product", order: 1 },
  { id: "training",    label: "Training",    signal: "card:work-product", order: 2 },
  { id: "calendar",    label: "Renewals",    signal: "card:work-product", order: 3 },
  { id: "reminders",   label: "Reminders",   signal: "card:work-product", order: 4 },
];

(async () => {
  // 1. dosing_orders (idempotent)
  const priorO = await db.collection("dosing_orders").where("tenantId", "==", TENANT).where("demo", "==", true).get();
  if (!priorO.empty) { const b = db.batch(); priorO.docs.forEach(d => b.delete(d.ref)); await b.commit(); console.log(`cleared ${priorO.size} prior orders`); }
  let b1 = db.batch();
  for (const o of ORDERS) b1.set(db.collection("dosing_orders").doc(), { tenantId: TENANT, demo: true, status: o.status || "approved", ...o });
  await b1.commit();
  console.log(`✓ seeded ${ORDERS.length} dosing orders (1 proposed: Slinky the python)`);

  // 2. protocol_library (idempotent)
  const priorP = await db.collection("protocol_library").where("tenantId", "==", TENANT).where("demo", "==", true).get();
  if (!priorP.empty) { const b = db.batch(); priorP.docs.forEach(d => b.delete(d.ref)); await b.commit(); }
  let b2 = db.batch();
  for (const p of PROTOCOLS) b2.set(db.collection("protocol_library").doc(p.protocol_id), { tenantId: TENANT, demo: true, ...p });
  await b2.commit();
  console.log(`✓ seeded ${PROTOCOLS.length} protocols`);

  // 3. Register VET-003 + the missing SPINE-4 worker docs
  await db.collection("digitalWorkers").doc("vet-003-drug-dosing").set({
    slug: "vet-003-drug-dosing", worker_id: "VET-003", display_name: "Drug Dosing & Protocol", name: "Drug Dosing & Protocol",
    vertical: "veterinary", suite: "Veterinary", status: "live", canvasTabs: VET003_TABS,
    description: "Weight-based dosing, species-adjusted protocols, contraindication + DEA checks — sourced from Plumb's & Carpenter's.",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection("digitalWorkers").doc("spine-4-staff-credentials").set({
    slug: "spine-4-staff-credentials", worker_id: "SPINE-4", display_name: "Staff Credentials", name: "Staff Credentials",
    vertical: "veterinary", suite: "Veterinary", status: "live", canvasTabs: SPINE4_TABS,
    description: "Tracks every staff license, certification, and OSHA training with renewal reminders.",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log("✓ registered digitalWorkers: vet-003-drug-dosing + spine-4-staff-credentials");

  // 4. Add to Dr. Chen's activeWorkers (RE + vet + staff), de-duped
  const wsRef = db.collection("users").doc(UID).collection("workspaces").doc(TENANT);
  const ws = await wsRef.get();
  const cur = Array.isArray(ws.data()?.activeWorkers) ? ws.data().activeWorkers : [];
  const add = ["spine-4-staff-credentials", "vet-003-drug-dosing", "title-abstract-001"];
  const next = Array.from(new Set([...cur, ...add]));
  await wsRef.set({ activeWorkers: next }, { merge: true });
  console.log(`✓ activeWorkers now: ${next.join(", ")}`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
