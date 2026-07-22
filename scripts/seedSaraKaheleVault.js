"use strict";

/**
 * Sara Kahele — complete personal Vault seed.
 *
 * Idempotent: explicit doc IDs; re-running resets to a known state.
 *
 * FIELD NAMES (match API queries):
 *   DTCs:            userId, tenantId, type, metadata, ...
 *   Logbook entries: userId, tenantId, dtcId, entryType, data, dtcTitle, createdAt
 *
 * Vault pillars covered:
 *   Education  — BSN enrollment (academic_record) + 2 courses (course)
 *   Health     — annual clearance, Hep B series, vaccine record, TB/IGRA,
 *                2 prescriptions, doctor visit  (medical_record/immunization/
 *                lab_result/prescription/health_visit)
 *   Pet        — Kenji the dog (pet_health)
 *   Real Property — Kona Gardens lease (lease)
 *
 * Usage:
 *   node scripts/seedSaraKaheleVault.js           # dry run
 *   node scripts/seedSaraKaheleVault.js --apply   # write to Firestore
 */

const path = require("path");
const admin = require(
  path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin")
);
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const SARA_UID    = "sara-kahele-demo";
const VAULT_TID   = "vault";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ts(isoString) {
  return admin.firestore.Timestamp.fromDate(new Date(isoString));
}

function dtcBase(id, type, metadata, extra = {}) {
  return {
    id,
    userId:             SARA_UID,
    tenantId:           VAULT_TID,
    type,
    metadata,
    fileIds:            [],
    files:              [],
    blockchainProof:    null,
    chain_anchor_status: "hash_only",
    logbookCount:       0,
    status:             "active",
    createdAt:          ts(extra.createdAt || "2026-01-15T08:00:00Z"),
    ...extra,
  };
}

function logEntry(id, dtcId, dtcTitle, entryType, data, createdAt) {
  return {
    id,
    userId:    SARA_UID,
    tenantId:  VAULT_TID,
    dtcId,
    dtcTitle,
    entryType,
    data,
    createdAt: ts(createdAt),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDUCATION — Academic Record + 2 Courses
// ═══════════════════════════════════════════════════════════════════════════════

const BSN_ID    = "dtc-sara-bsn-makai";
const NSG201_ID = "dtc-sara-nsg201";
const NSG312_ID = "dtc-sara-nsg312";

const BSN_TITLE    = "BSN Program — Makai School of Nursing";
const NSG201_TITLE = "NSG 201 — Fundamentals of Nursing Care";
const NSG312_TITLE = "NSG 312 — Clinical Nursing Practice";

const EDUCATION_DTCS = [
  dtcBase(BSN_ID, "academic_record", {
    title:               BSN_TITLE,
    institution:         "Makai School of Nursing",
    program:             "Bachelor of Science in Nursing",
    level:               "Undergraduate",
    accreditation:       "ACEN",
    studentId:           "MSN-2026-1042",
    startDate:           "2026-01-15",
    expectedGraduation:  "2028-05-15",
    cohort:              "Class of 2028",
    gpa:                 3.6,
    status:              "Enrolled",
    courses: [
      { code: "NSG 201", title: "Fundamentals of Nursing Care", credits: 4, grade: "B+",     term: "Spring 2026" },
      { code: "NSG 312", title: "Clinical Nursing Practice",   credits: 6, grade: "IP",      term: "Summer 2026" },
      { code: "NSG 401", title: "Advanced Pharmacology",       credits: 3, grade: "Upcoming", term: "Fall 2026"  },
    ],
  }, { createdAt: "2026-01-15T09:00:00Z" }),

  dtcBase(NSG201_ID, "course", {
    title:       NSG201_TITLE,
    institution: "Makai School of Nursing",
    course:      "NSG 201",
    instructor:  "Dr. Kealani Moku",
    credits:     4,
    term:        "Spring 2026",
    grade:       "B+ (88/100)",
    status:      "Completed",
  }, { createdAt: "2026-01-20T08:00:00Z" }),

  dtcBase(NSG312_ID, "course", {
    title:       NSG312_TITLE,
    institution: "Makai School of Nursing",
    course:      "NSG 312",
    instructor:  "Prof. Ana Rodrigues",
    credits:     6,
    term:        "Summer 2026",
    grade:       "In Progress",
    status:      "In Progress",
  }, { createdAt: "2026-05-01T08:00:00Z" }),
];

const EDUCATION_LOG = [
  // BSN enrollment logbook
  logEntry("log-sara-bsn-001", BSN_ID, BSN_TITLE, "enrollment",
    { note: "Enrolled in BSN program, Spring 2026 cohort. Student ID issued: MSN-2026-1042.", institution: "Makai School of Nursing", program: "BSN" },
    "2026-01-15T09:00:00Z"),
  logEntry("log-sara-bsn-002", BSN_ID, BSN_TITLE, "milestone",
    { note: "Program orientation completed. Clinical rotation schedule assigned. Required health clearances verified on file.", course: "Orientation" },
    "2026-01-18T14:00:00Z"),
  logEntry("log-sara-bsn-003", BSN_ID, BSN_TITLE, "milestone",
    { note: "End of Spring 2026 semester. GPA 3.6. NSG 201 completed B+. All clinical hours logged and signed.", gpa: "3.6", semester: "Spring 2026" },
    "2026-05-10T12:00:00Z"),

  // NSG 201 course logbook
  logEntry("log-sara-nsg201-001", NSG201_ID, NSG201_TITLE, "enrollment",
    { note: "Enrolled in NSG 201 — Fundamentals of Nursing Care. 4 credit hours. Dr. Kealani Moku, Course Lead.", course: "NSG 201" },
    "2026-01-20T08:00:00Z"),
  logEntry("log-sara-nsg201-002", NSG201_ID, NSG201_TITLE, "milestone",
    { note: "NSG 201 Midterm Examination — 88/100 (B+). Strong performance across all NCLEX domains tested. Particularly strong on pharmacology and infection control.", course: "NSG 201", score: "88/100", grade: "B+" },
    "2026-06-20T09:00:00Z"),
  logEntry("log-sara-nsg201-003", NSG201_ID, NSG201_TITLE, "milestone",
    { note: "Competency 2A — Medication Administration Safety signed off. Observed at Queens Medical Center. Evaluator: Dr. Kealani Moku. Rating: Exceeds Expectations.", course: "NSG 201", competency: "2A", facility: "Queens Medical Center" },
    "2026-06-12T14:22:00Z"),
  logEntry("log-sara-nsg201-004", NSG201_ID, NSG201_TITLE, "milestone",
    { note: "Competency 5C — Wound Care and Dressing Change signed off. Unexpected erythema noted and escalated appropriately. Evaluator: Dr. Kealani Moku. Rating: Meets Expectations.", course: "NSG 201", competency: "5C", facility: "Queens Medical Center" },
    "2026-07-10T15:48:00Z"),
  logEntry("log-sara-nsg201-005", NSG201_ID, NSG201_TITLE, "course_completed",
    { note: "NSG 201 completed with grade B+ (88/100). 4 credits awarded toward BSN. All clinical competencies signed off.", course: "NSG 201", grade: "B+", credits: "4" },
    "2026-05-08T16:00:00Z"),

  // NSG 312 course logbook
  logEntry("log-sara-nsg312-001", NSG312_ID, NSG312_TITLE, "enrollment",
    { note: "Enrolled in NSG 312 — Clinical Nursing Practice. 6 credit hours. Prof. Ana Rodrigues, Clinical Coordinator.", course: "NSG 312" },
    "2026-05-01T08:00:00Z"),
  logEntry("log-sara-nsg312-002", NSG312_ID, NSG312_TITLE, "milestone",
    { note: "Competency 4B — IV Catheter Insertion signed off. First-attempt success on challenging IV insertion. Sterile field maintained throughout. Evaluator: Prof. Ana Rodrigues. Rating: Exceeds Expectations.", course: "NSG 312", competency: "4B", facility: "Straub Medical Center" },
    "2026-06-28T11:05:00Z"),
  logEntry("log-sara-nsg312-003", NSG312_ID, NSG312_TITLE, "milestone",
    { note: "High-fidelity simulation lab completed. Code blue scenario. Scored 91/100 on ACLS response protocol. Makai Simulation Center.", course: "NSG 312", facility: "Makai Simulation Center", score: "91/100" },
    "2026-07-03T17:00:00Z"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH — Medical clearances, vaccines, prescriptions, doctor visits
// ═══════════════════════════════════════════════════════════════════════════════

const CLEARANCE_ID  = "dtc-sara-health-clearance";
const HEPB_ID       = "dtc-sara-hepb-series";
const VACCINES_ID   = "dtc-sara-vaccine-record";
const TB_ID         = "dtc-sara-tb-igra";
const RX_OCP_ID     = "dtc-sara-rx-ocp";
const RX_ALLERGY_ID = "dtc-sara-rx-allergy";
const DR_VISIT_ID   = "dtc-sara-dr-visit-2026";

const CLEARANCE_TITLE  = "Annual Health Clearance — Clinical Rotation";
const HEPB_TITLE       = "Hepatitis B Immunization Series";
const VACCINES_TITLE   = "Immunization Record";
const TB_TITLE         = "TB Screening — IGRA";
const RX_OCP_TITLE     = "Prescription — Oral Contraceptive";
const RX_ALLERGY_TITLE = "Prescription — Antihistamine (Cetirizine)";
const DR_VISIT_TITLE   = "Annual Physical — Dr. Lani Akana";

const HEALTH_DTCS = [
  // Annual health clearance required for clinical rotations
  dtcBase(CLEARANCE_ID, "medical_record", {
    title:    CLEARANCE_TITLE,
    provider: "Dr. Lani Akana, MD — Pali Momi Medical Group",
    date:     "2026-01-10",
    expires:  "2027-01-10",
    nextDue:  "2027-01-10",
    summary:  "Annual physical and health clearance for BSN clinical rotations. All required immunizations verified current. No restrictions on clinical practice.",
    facility: "Pali Momi Medical Group, Aiea HI",
    clearanceFor: "Makai School of Nursing — Clinical Program",
    status:   "Cleared",
  }, { createdAt: "2026-01-10T11:00:00Z" }),

  // Hep B series — 3-dose, required for all clinical students
  dtcBase(HEPB_ID, "immunization", {
    title:      HEPB_TITLE,
    provider:   "Dr. Lani Akana, MD — Pali Momi Medical Group",
    vaccine:    "Hepatitis B (Engerix-B)",
    series:     "3-dose",
    doses: [
      { dose: 1, date: "2025-08-15", lot: "EN25-4421", site: "Left deltoid" },
      { dose: 2, date: "2025-09-15", lot: "EN25-4498", site: "Left deltoid" },
      { dose: 3, date: "2026-02-15", lot: "EN26-0113", site: "Left deltoid" },
    ],
    titerResult: "Immune — Anti-HBs ≥10 mIU/mL (confirmed 2026-03-01)",
    titerDate:   "2026-03-01",
    status:      "Complete — Immune",
    summary:     "3-dose Hepatitis B series completed. Titer confirms protective immunity. No booster required.",
    expires:     null,
  }, { createdAt: "2025-08-15T10:00:00Z" }),

  // Standard immunization record (MMR, Varicella, Tdap, Flu, COVID)
  dtcBase(VACCINES_ID, "immunization", {
    title:    VACCINES_TITLE,
    provider: "Dr. Lani Akana, MD — Pali Momi Medical Group",
    date:     "2026-01-10",
    summary:  "All nursing-program required immunizations current as of Jan 2026 physical.",
    vaccines: [
      { name: "MMR",              status: "Immune — titer confirmed",        date: "Titer 2025-09-01",   expires: null },
      { name: "Varicella",        status: "Immune — titer confirmed",        date: "Titer 2025-09-01",   expires: null },
      { name: "Tdap",             status: "Current",                         date: "2023-03-20",          expires: "2033-03-20" },
      { name: "Influenza",        status: "Current — 2025–2026 season",      date: "2025-10-08",          expires: "2026-06-30" },
      { name: "COVID-19",         status: "Up to date — updated booster",    date: "2025-09-15",          expires: null },
      { name: "Hepatitis B",      status: "Complete — see Hep B DTC",        date: "Series complete",     expires: null },
      { name: "Meningococcal",    status: "Current",                         date: "2022-08-01",          expires: "2027-08-01" },
      { name: "N95 Fit Test",     status: "Passed — Size M N95",             date: "2026-01-10",          expires: "2027-01-10" },
    ],
    nextDue: "2026-10-01",
  }, { createdAt: "2026-01-10T11:30:00Z" }),

  // Annual TB/IGRA (required annually for clinical students)
  dtcBase(TB_ID, "lab_result", {
    title:    TB_TITLE,
    provider: "Pali Momi Medical Group — Lab Services",
    date:     "2026-01-08",
    nextDue:  "2027-01-08",
    expires:  "2027-01-08",
    test:     "Interferon-Gamma Release Assay (QuantiFERON-TB Gold Plus)",
    result:   "Negative",
    summary:  "Annual TB screening required for clinical rotations. IGRA (QuantiFERON-TB Gold Plus) negative. No evidence of Mycobacterium tuberculosis infection.",
    orderingPhysician: "Dr. Lani Akana, MD",
    lab:      "Quest Diagnostics — Honolulu",
    status:   "Negative — No Restriction",
  }, { createdAt: "2026-01-08T14:00:00Z" }),

  // Annual physical / doctor visit
  dtcBase(DR_VISIT_ID, "health_visit", {
    title:    DR_VISIT_TITLE,
    provider: "Dr. Lani Akana, MD",
    facility: "Pali Momi Medical Group, Aiea HI",
    date:     "2026-01-10",
    summary:  "Annual physical for BSN clinical clearance. Height 5'5\", Weight 128 lbs, BMI 21.3, BP 112/72, HR 66 bpm. All systems normal. Cleared for clinical rotations.",
    vitals: {
      height:  "5'5\"",
      weight:  "128 lbs",
      bmi:     "21.3",
      bp:      "112/72 mmHg",
      hr:      "66 bpm",
      temp:    "98.4°F",
      o2sat:   "99%",
    },
    assessment: "Healthy young adult. No clinical restrictions. All required immunizations verified.",
    nextDue: "2027-01-10",
  }, { createdAt: "2026-01-10T10:00:00Z" }),

  // Prescription: oral contraceptive
  dtcBase(RX_OCP_ID, "prescription", {
    title:      RX_OCP_TITLE,
    provider:   "Dr. Lani Akana, MD — Pali Momi Medical Group",
    medication: "Ocella (drospirenone/ethinyl estradiol) 3 mg / 0.03 mg",
    indication: "Oral contraceptive",
    dose:       "1 tablet daily",
    refills:    11,
    pharmacy:   "Longs Drugs — Pearl City, HI",
    issued:     "2026-01-10",
    nextRefill: "2026-08-10",
    summary:    "Monthly oral contraceptive. 1 tablet daily. 12 months supply with refills.",
  }, { createdAt: "2026-01-10T12:00:00Z" }),

  // Prescription: allergy
  dtcBase(RX_ALLERGY_ID, "prescription", {
    title:      RX_ALLERGY_TITLE,
    provider:   "Dr. Lani Akana, MD — Pali Momi Medical Group",
    medication: "Cetirizine HCl 10 mg",
    indication: "Seasonal allergic rhinitis",
    dose:       "10 mg once daily as needed",
    refills:    5,
    pharmacy:   "Longs Drugs — Pearl City, HI",
    issued:     "2026-01-10",
    summary:    "PRN antihistamine for seasonal allergies. Take 1 tablet daily as needed during high-pollen periods.",
  }, { createdAt: "2026-01-10T12:10:00Z" }),
];

const HEALTH_LOG = [
  // Health clearance logbook
  logEntry("log-sara-clr-001", CLEARANCE_ID, CLEARANCE_TITLE, "health_visit",
    { note: "Annual physical completed. Dr. Lani Akana, Pali Momi Medical Group. BP 112/72, HR 66, BMI 21.3. All nursing-program immunizations verified current. Cleared for clinical rotations.", provider: "Dr. Lani Akana, MD", status: "Cleared" },
    "2026-01-10T11:00:00Z"),
  logEntry("log-sara-clr-002", CLEARANCE_ID, CLEARANCE_TITLE, "milestone",
    { note: "Clearance submitted to Makai School of Nursing clinical coordinator. All requirements satisfied: TB negative, Hep B immune, MMR immune, Varicella immune, Tdap current, flu current, COVID booster current, N95 fit-tested.", school: "Makai School of Nursing", status: "Submitted" },
    "2026-01-12T09:00:00Z"),

  // Hep B logbook
  logEntry("log-sara-hepb-001", HEPB_ID, HEPB_TITLE, "milestone",
    { note: "Dose 1 of 3 administered. Engerix-B. Left deltoid. Lot EN25-4421. No adverse reaction observed.", dose: "1 of 3", lot: "EN25-4421", site: "Left deltoid" },
    "2025-08-15T10:00:00Z"),
  logEntry("log-sara-hepb-002", HEPB_ID, HEPB_TITLE, "milestone",
    { note: "Dose 2 of 3 administered. Engerix-B. Left deltoid. Lot EN25-4498. No adverse reaction.", dose: "2 of 3", lot: "EN25-4498", site: "Left deltoid" },
    "2025-09-15T10:30:00Z"),
  logEntry("log-sara-hepb-003", HEPB_ID, HEPB_TITLE, "milestone",
    { note: "Dose 3 of 3 administered. Engerix-B. Left deltoid. Lot EN26-0113. Series complete.", dose: "3 of 3", lot: "EN26-0113", site: "Left deltoid" },
    "2026-02-15T11:00:00Z"),
  logEntry("log-sara-hepb-004", HEPB_ID, HEPB_TITLE, "milestone",
    { note: "Titer drawn post-series. QuantiFERON Anti-HBs result: ≥10 mIU/mL — IMMUNE. Protective immunity confirmed. No booster required.", result: "Immune", value: "≥10 mIU/mL", lab: "Quest Diagnostics" },
    "2026-03-01T14:00:00Z"),

  // Vaccines logbook
  logEntry("log-sara-vax-001", VACCINES_ID, VACCINES_TITLE, "milestone",
    { note: "MMR and Varicella titers drawn. Results: MMR immune (IgG positive), Varicella immune (IgG positive). No additional doses required.", vaccines: "MMR, Varicella", result: "Both immune — titer confirmed" },
    "2025-09-01T10:00:00Z"),
  logEntry("log-sara-vax-002", VACCINES_ID, VACCINES_TITLE, "milestone",
    { note: "Influenza vaccine administered. 2025–2026 formulation. Left deltoid. Pali Momi Medical Group.", vaccine: "Influenza 2025-2026", site: "Left deltoid" },
    "2025-10-08T09:30:00Z"),
  logEntry("log-sara-vax-003", VACCINES_ID, VACCINES_TITLE, "milestone",
    { note: "COVID-19 updated booster administered. Pfizer XBB.1.5 formulation. Left deltoid. No adverse reaction.", vaccine: "COVID-19 Updated Booster", site: "Left deltoid" },
    "2025-09-15T10:00:00Z"),
  logEntry("log-sara-vax-004", VACCINES_ID, VACCINES_TITLE, "milestone",
    { note: "N95 Respirator Fit Test completed. Size M (3M 1860). Qualitative fit test passed. Clearance issued for clinical use. Valid through Jan 2027.", test: "N95 Fit Test", result: "Passed", size: "Size M N95 (3M 1860)", expires: "2027-01-10" },
    "2026-01-10T11:30:00Z"),

  // TB logbook
  logEntry("log-sara-tb-001", TB_ID, TB_TITLE, "milestone",
    { note: "Annual TB screening — IGRA (QuantiFERON-TB Gold Plus) drawn. Quest Diagnostics, Honolulu. Result: NEGATIVE. No evidence of M. tuberculosis infection. Cleared for clinical rotations.", test: "QuantiFERON-TB Gold Plus", result: "Negative", lab: "Quest Diagnostics" },
    "2026-01-08T14:00:00Z"),

  // Doctor visit logbook
  logEntry("log-sara-dr-001", DR_VISIT_ID, DR_VISIT_TITLE, "health_visit",
    { note: "Annual physical for BSN clinical clearance. Vitals: BP 112/72, HR 66, O2 99%, Temp 98.4°F, BMI 21.3. All systems reviewed: cardiovascular, respiratory, musculoskeletal, neurological — all normal. Labs ordered: TB IGRA, CBC, CMP, Hep B titer.", provider: "Dr. Lani Akana, MD", facility: "Pali Momi Medical Group" },
    "2026-01-10T10:00:00Z"),
  logEntry("log-sara-dr-002", DR_VISIT_ID, DR_VISIT_TITLE, "milestone",
    { note: "Lab results returned. CBC normal, CMP normal, Hep B titer immune, TB IGRA negative. All immunizations confirmed current. Prescriptions renewed: Ocella, cetirizine. Clinical clearance letter issued.", labs: "CBC/CMP normal, Hep B immune, TB negative", clearance: "Issued" },
    "2026-01-12T08:00:00Z"),

  // Prescriptions logbook
  logEntry("log-sara-rx-ocp-001", RX_OCP_ID, RX_OCP_TITLE, "milestone",
    { note: "Ocella (drospirenone/ethinyl estradiol) prescribed by Dr. Lani Akana. 12-month supply. Filled at Longs Drugs — Pearl City.", medication: "Ocella 3mg/0.03mg", refills: "11 remaining" },
    "2026-01-10T12:00:00Z"),
  logEntry("log-sara-rx-allergy-001", RX_ALLERGY_ID, RX_ALLERGY_TITLE, "milestone",
    { note: "Cetirizine HCl 10 mg prescribed for seasonal allergic rhinitis. Take 1 daily as needed. 6-month supply. Filled at Longs Drugs — Pearl City.", medication: "Cetirizine 10mg", indication: "Seasonal allergic rhinitis" },
    "2026-01-10T12:10:00Z"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// PET — Kenji the Dog
// ═══════════════════════════════════════════════════════════════════════════════

const KENJI_ID    = "dtc-sara-kenji";
const KENJI_TITLE = "Kenji — Labrador/Terrier Mix";

const PET_DTCS = [
  dtcBase(KENJI_ID, "pet_health", {
    title:          KENJI_TITLE,
    name:           "Kenji",
    species:        "Dog",
    breed:          "Labrador/Terrier Mix",
    dob:            "2022-03-15",
    sex:            "Male (neutered)",
    color:          "Golden/white",
    microchipId:    "985141006837452",
    licenseNumber:  "HNL-2026-18472",
    weight:         "52 lbs (Jul 2026)",
    vet:            "Meadow Creek Veterinary",
    vetPhone:       "(808) 555-0192",
    vetAddress:     "1845 S King St, Honolulu HI 96826",
    nextDue:        "2027-03-15",
    summary:        "Healthy 4-year-old neutered male. All vaccinations current. Annual wellness due Mar 2027.",
  }, { createdAt: "2022-04-01T10:00:00Z" }),
];

const PET_LOG = [
  logEntry("log-kenji-001", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "Kenji adopted from Hawaiian Humane Society. Age estimated ~3 weeks. Microchip 985141006837452 registered to Sara Kahele.", event: "Adoption", source: "Hawaiian Humane Society" },
    "2022-04-01T10:00:00Z"),
  logEntry("log-kenji-002", KENJI_ID, KENJI_TITLE, "health_visit",
    { note: "Initial new-puppy exam. Dr. Priya Nair, Meadow Creek Veterinary. Weight 6.2 lbs. DA2PP dose 1 administered. Dewormer given. Overall healthy puppy.", provider: "Dr. Priya Nair, DVM", weight: "6.2 lbs", age: "~6 weeks" },
    "2022-04-10T10:00:00Z"),
  logEntry("log-kenji-003", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "DA2PP dose 2 + Bordetella administered. Weight 12.4 lbs. Fecal test negative.", vaccines: "DA2PP dose 2, Bordetella", weight: "12.4 lbs" },
    "2022-05-10T10:00:00Z"),
  logEntry("log-kenji-004", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "DA2PP dose 3 + Rabies (1-year) + Leptospirosis dose 1 administered. Weight 22.1 lbs. Neuter surgery scheduled.", vaccines: "DA2PP dose 3, Rabies, Lepto dose 1", weight: "22.1 lbs" },
    "2022-06-10T10:00:00Z"),
  logEntry("log-kenji-005", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "Leptospirosis booster dose 2 administered. Neuter surgery performed, uncomplicated recovery. Weight 28.3 lbs.", vaccines: "Lepto dose 2", event: "Neuter surgery", weight: "28.3 lbs" },
    "2022-07-15T10:00:00Z"),
  logEntry("log-kenji-006", KENJI_ID, KENJI_TITLE, "health_visit",
    { note: "Annual wellness visit. Dr. Priya Nair. Weight 46 lbs. DHPP booster, Rabies 3-year, Leptospirosis, Influenza H3N2. Heartworm test: negative. Started Heartgard Plus + NexGard.", provider: "Dr. Priya Nair, DVM", weight: "46 lbs", year: "2024 annual" },
    "2024-03-20T10:00:00Z"),
  logEntry("log-kenji-007", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "Rabies vaccination administered (3-year). Lot 24-RVX-881. Certificate issued. License renewed: HNL-2024-18472.", vaccine: "Rabies 3-year", lot: "24-RVX-881", expires: "2027-03-20" },
    "2024-03-20T10:15:00Z"),
  logEntry("log-kenji-008", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "DHPP booster administered. Leptospirosis 4-way booster. Canine Influenza H3N2 booster. All core vaccines current.", vaccines: "DHPP, Lepto 4-way, CIV H3N2", status: "All current" },
    "2024-03-20T10:20:00Z"),
  logEntry("log-kenji-009", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "Heartworm antigen test: NEGATIVE. Fecal O&P: negative. Heartworm prevention: Heartgard Plus 51-100 lbs. Flea/tick: NexGard Large (60-121 lbs). Monthly preventives active.", heartworm: "Negative", prevention: "Heartgard Plus + NexGard" },
    "2025-03-12T10:00:00Z"),
  logEntry("log-kenji-010", KENJI_ID, KENJI_TITLE, "health_visit",
    { note: "Annual wellness visit. Dr. Priya Nair. Weight 52 lbs, BCS 5/9 ideal. All vitals normal. Dental tartar grade 1 — dental cleaning recommended. Ears and eyes clear. All core vaccines current (next due Mar 2027). Bordetella booster administered.", provider: "Dr. Priya Nair, DVM", weight: "52 lbs", year: "2026 annual" },
    "2026-03-15T10:00:00Z"),
  logEntry("log-kenji-011", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "Dental cleaning performed under general anesthesia. Grade 1 tartar removed. No extractions needed. Full mouth radiographs — all teeth healthy. Recovered without complications.", procedure: "Dental cleaning", result: "No extractions required" },
    "2026-04-02T09:00:00Z"),
  logEntry("log-kenji-012", KENJI_ID, KENJI_TITLE, "milestone",
    { note: "Bordetella (intranasal) administered at 2026 annual visit. Canine Influenza H3N2 booster administered. Monthly heartworm and flea/tick prevention refills dispensed.", vaccines: "Bordetella, CIV H3N2", prevention: "Heartgard + NexGard refills" },
    "2026-03-15T10:30:00Z"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// REAL PROPERTY — Kona Gardens Lease
// ═══════════════════════════════════════════════════════════════════════════════

const LEASE_ID    = "dtc-sara-lease-kona";
const LEASE_TITLE = "Lease — Kona Gardens, Apt 204";

const LEASE_DTCS = [
  dtcBase(LEASE_ID, "lease", {
    title:        LEASE_TITLE,
    address:      "1420 Kona St, Apt 204, Honolulu HI 96814",
    unit:         "Apt 204",
    building:     "Kona Gardens Apartments",
    landlord:     "Merritt Capital Group",
    landlordPhone: "(808) 555-0440",
    leaseStart:   "2024-08-01",
    leaseEnd:     "2026-07-31",
    monthlyRent:  1700,
    depositPaid:  3300,
    sqft:         540,
    parking:      "Stall 48 — covered",
    petPolicy:    "Pets allowed — $50/mo pet rent, $300 pet deposit paid",
    expires:      "2026-07-31",
    nextDue:      "2026-07-31",
    summary:      "Studio apartment, 540 sqft. Current rent $1,700/mo + $50 pet rent (Kenji). Lease expires Jul 31 2026. Deposit $3,300 on file.",
  }, { createdAt: "2024-07-25T14:00:00Z" }),
];

const LEASE_LOG = [
  logEntry("log-lease-001", LEASE_ID, LEASE_TITLE, "milestone",
    { note: "Lease agreement signed for Apt 204, 1420 Kona St. 12-month term: Aug 1 2024 – Jul 31 2025. Monthly rent $1,650 + $50 pet rent. Security deposit $3,300 paid. Pet addendum signed for Kenji.", event: "Lease signed", term: "Aug 2024 – Jul 2025", rent: "$1,650 + $50 pet" },
    "2024-07-25T14:00:00Z"),
  logEntry("log-lease-002", LEASE_ID, LEASE_TITLE, "milestone",
    { note: "Move-in inspection completed with property manager Marco Silva. Apartment condition: Good. No pre-existing damage noted beyond normal wear. Inspection report signed by both parties.", event: "Move-in inspection", condition: "Good — no damage noted", inspector: "Marco Silva, Merritt Capital" },
    "2024-08-01T10:00:00Z"),
  logEntry("log-lease-003", LEASE_ID, LEASE_TITLE, "milestone",
    { note: "Maintenance request submitted: HVAC unit not cooling — bedroom temperature not dropping below 82°F. Ticket #MX-2024-0923 opened.", issue: "HVAC not cooling", ticket: "MX-2024-0923", status: "Submitted" },
    "2024-10-14T18:00:00Z"),
  logEntry("log-lease-004", LEASE_ID, LEASE_TITLE, "milestone",
    { note: "HVAC maintenance resolved. Technician found refrigerant low + dirty coils. Recharged and cleaned. Unit cooling normally. Ticket #MX-2024-0923 closed.", issue: "HVAC not cooling", ticket: "MX-2024-0923", resolution: "Refrigerant recharged + coils cleaned", status: "Resolved (3 days)" },
    "2024-10-17T14:00:00Z"),
  logEntry("log-lease-005", LEASE_ID, LEASE_TITLE, "milestone",
    { note: "Lease renewal executed. New term: Aug 1 2025 – Jul 31 2026. Rent increased from $1,650 → $1,700/mo (+$50, 3%). Pet rent unchanged at $50/mo. Signed with Merritt Capital Group.", event: "Lease renewal", term: "Aug 2025 – Jul 2026", rent: "$1,700 + $50 pet", increase: "+$50/mo (3%)" },
    "2025-07-01T11:00:00Z"),
  logEntry("log-lease-006", LEASE_ID, LEASE_TITLE, "milestone",
    { note: "Maintenance request submitted: bathroom faucet dripping — hot water side. Ticket #MX-2026-0118 opened.", issue: "Bathroom faucet drip", ticket: "MX-2026-0118", status: "Submitted" },
    "2026-01-18T09:00:00Z"),
  logEntry("log-lease-007", LEASE_ID, LEASE_TITLE, "milestone",
    { note: "Faucet repair completed. Plumber replaced cartridge in hot-water valve. Drip resolved. Ticket #MX-2026-0118 closed.", issue: "Bathroom faucet drip", ticket: "MX-2026-0118", resolution: "Cartridge replaced", status: "Resolved (4 days)" },
    "2026-01-22T13:00:00Z"),
  logEntry("log-lease-008", LEASE_ID, LEASE_TITLE, "milestone",
    { note: "Maintenance request submitted: dishwasher door latch broken — door won't latch, cannot run cycle. Ticket #MX-2026-0412 opened. Status: OPEN — awaiting part.", issue: "Dishwasher door latch", ticket: "MX-2026-0412", status: "Open — part on order" },
    "2026-04-12T16:00:00Z"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// Assemble
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_DTCS = [...EDUCATION_DTCS, ...HEALTH_DTCS, ...PET_DTCS, ...LEASE_DTCS];
const ALL_LOG  = [...EDUCATION_LOG, ...HEALTH_LOG, ...PET_LOG, ...LEASE_LOG];

// ═══════════════════════════════════════════════════════════════════════════════
// Run
// ═══════════════════════════════════════════════════════════════════════════════

(async () => {
  const mode = APPLY ? "APPLYING" : "DRY RUN";
  console.log(`\n${mode} — Sara Kahele complete Vault seed`);
  console.log(`  uid: ${SARA_UID}  vault-tenant: ${VAULT_TID}`);
  console.log(`  DTCs:    ${ALL_DTCS.length}`);
  console.log(`  Logbook: ${ALL_LOG.length}\n`);

  if (!APPLY) {
    console.log("Pillars covered:");
    console.log(`  Education   — ${EDUCATION_DTCS.length} DTCs  (academic_record, course × 2)`);
    console.log(`  Health      — ${HEALTH_DTCS.length} DTCs  (medical_record, immunization × 2, lab_result, health_visit, prescription × 2)`);
    console.log(`  Pet         — ${PET_DTCS.length} DTC   (pet_health)`);
    console.log(`  Real Prop   — ${LEASE_DTCS.length} DTC   (lease)`);
    console.log("\nRe-run with --apply to write to Firestore.");
    process.exit(0);
  }

  let dtcWritten = 0, logWritten = 0;

  for (const d of ALL_DTCS) {
    const { id, ...data } = d;
    await db.doc(`dtcs/${id}`).set(data, { merge: false });
    console.log(`  dtcs/${id} ✓`);
    dtcWritten++;
  }

  for (const l of ALL_LOG) {
    const { id, ...data } = l;
    await db.doc(`logbookEntries/${id}`).set(data, { merge: false });
    console.log(`  logbookEntries/${id} ✓`);
    logWritten++;
  }

  console.log(`\n=== SARA KAHELE VAULT SEEDED ===`);
  console.log(`  DTCs:          ${dtcWritten}`);
  console.log(`  Logbook:       ${logWritten}`);
  console.log(`  Total:         ${dtcWritten + logWritten} documents\n`);
  console.log("Pillars:");
  console.log(`  Education  — BSN enrollment + NSG 201 (B+, completed) + NSG 312 (in progress)`);
  console.log(`  Health     — Annual clearance, Hep B series (immune), vaccine record (MMR/Varicella/Tdap/Flu/COVID), TB IGRA (neg), annual physical, Ocella, cetirizine`);
  console.log(`  Pet        — Kenji (Lab/Terrier, 4 yr, neutered) — full vaccine + wellness history`);
  console.log(`  Real Prop  — Kona Gardens Apt 204 lease — move-in, 2 renewals, 3 MX tickets`);

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
