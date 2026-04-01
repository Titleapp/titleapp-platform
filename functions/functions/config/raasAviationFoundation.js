"use strict";

/**
 * raasAviationFoundation.js — Aviation RAAS Knowledge Foundation (Memo 43.5a Step 1)
 *
 * Complete regulatory and policy knowledge base for all aviation workers.
 * The AI's operational context for every aviation worker.
 *
 * RAAS is contextual intelligence, not a rule filter. The AI must understand
 * the full regulatory environment deeply enough to apply it to novel situations.
 */

// ═══════════════════════════════════════════════════════
//  WORKER TYPE → APPLICABLE REGULATION MAPPING
// ═══════════════════════════════════════════════════════

const WORKER_REGULATION_MAP = {
  // CoPilots (all aircraft types)
  copilot: ["A", "B", "C", "D", "E", "F", "G", "K"],
  // Flight operations
  flight_ops: ["A", "B", "C", "D", "F", "K"],
  // Maintenance & airworthiness
  maintenance: ["A", "C", "E", "H", "K"],
  // Safety & SMS
  safety: ["A", "D", "E", "K"],
  // Crew management
  crew: ["A", "B", "C", "E", "F", "K"],
  // Medevac / air ambulance
  medevac: ["A", "B", "C", "D", "E", "F", "G", "I", "J", "K"],
  // Dispatch & scheduling
  dispatch: ["A", "B", "C", "F", "K"],
  // Training
  training: ["A", "D", "K"],
  // Revenue & customer
  revenue: ["A", "G", "K"],
  // Compliance & audit
  compliance: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "K"],
  // Intelligence (weather, NOTAMs, airport)
  intelligence: ["A", "D", "F", "K"],
  // Default — minimum set for any aviation worker
  default: ["A", "D", "E", "K"],
};

// Worker ID → worker type mapping
const WORKER_TYPE_MAP = {
  "av-pc12-ng": "copilot",
  "av-king-air-350": "copilot",
  "av-king-air-b200": "copilot",
  "av-king-air-c90": "copilot",
  "av-caravan-208b": "copilot",
  "av-my-aircraft": "copilot",
  "av-flight-planning": "flight_ops",
  "av-flight-following": "flight_ops",
  "av-flight-duty-enforcer": "crew",
  "av-weight-balance": "flight_ops",
  "av-post-flight-debrief": "flight_ops",
  "av-weather-intel": "intelligence",
  "av-notam-intel": "intelligence",
  "av-airport-intel": "intelligence",
  "av-efb-companion": "flight_ops",
  "av-ad-sb-tracker": "maintenance",
  "av-component-tracker": "maintenance",
  "av-maintenance-logbook": "maintenance",
  "av-parts-inventory": "maintenance",
  "av-safety-reporting": "safety",
  "av-safety-officer": "safety",
  "av-sms-monitor": "safety",
  "av-hazard-register": "safety",
  "av-foqa": "safety",
  "av-frat": "safety",
  "av-emergency-response": "safety",
  "av-qualification-tracker": "crew",
  "av-training-records": "training",
  "av-training-proficiency": "training",
  "av-training-courseware": "training",
  "av-medical-tracker": "crew",
  "av-currency-tracker": "crew",
  "av-digital-logbook": "crew",
  "av-crew-scheduling": "crew",
  "av-crew-housing": "crew",
  "av-reserve-swap": "crew",
  "av-drug-alcohol": "compliance",
  "av-far-compliance": "compliance",
  "av-regulatory-monitor": "compliance",
  "av-gom-authoring": "compliance",
  "av-cert-assistant": "compliance",
  "av-charter-quoting": "revenue",
  "av-billing": "revenue",
  "av-medevac-billing": "medevac",
  "av-customer-portal": "revenue",
  "av-daily-ops-report": "dispatch",
  "av-dispatch-board": "dispatch",
  "av-alex-personal": "default",
  "av-alex": "compliance",
  "av-aircraft-status-mel": "maintenance",
  "av-mission-builder": "flight_ops",
};

// ═══════════════════════════════════════════════════════
//  REGULATIONS DATABASE
// ═══════════════════════════════════════════════════════

const regulations = {
  // ─── SECTION A: FEDERAL AVIATION REGULATIONS ─────────
  A: {
    id: "A",
    name: "Federal Aviation Regulations (FARs)",
    parts: {
      "Part 1": {
        title: "Definitions and Abbreviations",
        scope: "All terms used across all Parts",
        keyTerms: ["air carrier", "commercial operator", "flight time", "duty period", "rest period"],
      },
      "Part 61": {
        title: "Certification: Pilots, Flight Instructors, and Ground Instructors",
        keySections: {
          "61.3": "Requirement for certificates, ratings, and authorizations",
          "61.23": "Medical certificates: requirement and duration",
          "61.31": "Type rating requirements, additional training, and authorized instructors",
          "61.56": "Flight review (BFR)",
          "61.57": "Recent experience: PIC, night, instrument currency",
          "61.58": "Pilot-in-command proficiency check: operation of an aircraft that requires more than one pilot",
        },
      },
      "Part 91": {
        title: "General Operating and Flight Rules",
        keySections: {
          "91.3": "Responsibility and authority of PIC",
          "91.103": "Preflight action — REQUIRED: weather, fuel, alternates, runway lengths, TO/landing performance",
          "91.117": "Aircraft speed limitations",
          "91.151": "Fuel requirements for VFR flight",
          "91.155": "Basic VFR weather minimums",
          "91.167": "Fuel requirements for IFR flight",
          "91.175": "Takeoff and landing under IFR",
          "91.205": "Powered civil aircraft with standard category U.S. airworthiness certificates — instrument and equipment requirements",
          "91.211": "Supplemental oxygen",
          "91.213": "Inoperative instruments and equipment — MEL",
          "91.403": "General maintenance requirements",
          "91.409": "Inspections (annual, 100-hour)",
          "91.417": "Maintenance records",
          "91.527": "Operating in icing conditions",
        },
      },
      "Part 117": {
        title: "Flight and Duty Limitations and Rest Requirements: Flightcrew Members",
        keySections: {
          "117.11": "Flight time limitation",
          "117.13": "Flight duty period: unaugmented operations",
          "117.15": "Flight duty period: split duty",
          "117.17": "Flight duty period: augmented flightcrew",
          "117.19": "Flight duty period extensions",
          "117.25": "Rest period",
          "117.27": "Consecutive nighttime operations",
          "117.29": "Emergency and government sponsored operations",
        },
        notes: "Fatigue risk management system required",
      },
      "Part 119": {
        title: "Certification: Air Carriers and Commercial Operators",
        keySections: {
          "119.35": "Certificate holder's duty to maintain operations specifications",
          "119.36": "Additional certificate application requirements",
          "119.65": "Management personnel required for operations in common carriage",
          "119.69": "Management personnel required for operations not in common carriage",
        },
      },
      "Part 135": {
        title: "Operating Requirements: Commuter and On Demand Operations",
        keySections: {
          "135.23": "Manual requirements",
          "135.25": "Aircraft requirements",
          "135.63": "Recordkeeping requirements",
          "135.243": "Pilot in command qualifications",
          "135.267": "Flight time limitations and rest requirements: unscheduled 1&2 pilot crews",
          "135.269": "Flight time limitations and rest: scheduled 1&2 pilot crews",
          "135.273": "Duty period limitations and rest: unscheduled 1&2 pilot crews",
          "135.293": "Initial and recurrent pilot testing requirements",
          "135.297": "Pilot in command: instrument proficiency check requirements",
          "135.299": "Pilot in command: line checks",
          "135.337": "Qualifications: check airmen",
          "135.340": "Initial and transition training: flight attendants",
          "135.345": "Pilots: initial, transition, and upgrade ground training",
          "135.349": "Flight attendants: initial and transition ground training",
        },
      },
      "Part 43": {
        title: "Maintenance, Preventive Maintenance, Rebuilding, and Alteration",
        keySections: {
          "43.3": "Persons authorized to perform maintenance",
          "43.5": "Approval for return to service after maintenance",
          "43.7": "Persons authorized to approve aircraft for return to service",
          "43.9": "Content, form, and disposition of maintenance records",
          "43.11": "Content, form, and disposition of records for inspections",
          "43.12": "Maintenance records: falsification, reproduction, or alteration",
        },
      },
      "Part 65": {
        title: "Certification: Airmen Other Than Flight Crewmembers",
        scope: "Dispatchers, A&P mechanics, inspection authorization (IA)",
      },
      "Part 830 (NTSB)": {
        title: "Notification and Reporting of Aircraft Accidents or Incidents",
        keySections: {
          "830.2": "Definitions — accident vs incident vs serious incident",
          "830.5": "Immediate notification — REQUIRED for accidents, listed incidents",
          "830.6": "Information to be given in notification",
          "830.10": "Preservation of aircraft wreckage, mail, cargo, and records",
          "830.15": "Reports and statements to be filed",
        },
      },
      "Part 139": {
        title: "Certification of Airports",
        scope: "ARFF index, airport inspections, wildlife hazard management",
      },
    },
  },

  // ─── SECTION B: FAA OPERATIONS SPECIFICATIONS ────────
  B: {
    id: "B",
    name: "FAA Operations Specifications (OpSpecs)",
    framework: {
      description: "A, B, C, D paragraph series issued by FSDO",
      keyParagraphs: {
        "A001": "Certificate holder name, principal base of operations",
        "A008": "Areas of operation authorized",
        "A021": "Aircraft make, model, series authorized for operations",
        "A025": "RVSM authorization",
        "B036": "IFR approach procedures authorized (includes RNAV, LPV, CAT II/III)",
        "B050": "Extended overwater operations authorization",
        "C059": "EFVS operations authorization",
        "D085": "Hazardous materials authorization and limitations",
      },
    },
    raasRules: [
      "The platform cannot know a specific operator's OpSpecs",
      "Workers must always reference that operations must comply with the operator's specific OpSpecs",
      "Never assume FAR minimums are the operative limit — OpSpecs can be more restrictive",
      "Prompt operators to reference their FSDO-issued OpSpecs for any authorization question",
      "When generating operational outputs, include: 'Verify against your current OpSpecs'",
    ],
  },

  // ─── SECTION C: DOT REGULATIONS ─────────────────────
  C: {
    id: "C",
    name: "DOT Regulations",
    parts: {
      "49 CFR Part 40": {
        title: "Procedures for Transportation Workplace Drug and Alcohol Testing Programs",
        scope: "MRO process, SAP, pre-employment, random, post-accident, reasonable suspicion, return-to-duty, follow-up testing",
      },
      "49 CFR Part 121 Subpart F": {
        title: "Approval of Areas and Routes for Supplemental Operations",
        scope: "Aviation drug/alcohol testing program administration",
      },
    },
  },

  // ─── SECTION D: ICAO STANDARDS ──────────────────────
  D: {
    id: "D",
    name: "ICAO Standards",
    annexes: {
      "Annex 2": "Rules of the Air — international flight rules, right-of-way, signals",
      "Annex 6 Part II": "International General Aviation — operations of aircraft",
      "Annex 8": "Airworthiness of Aircraft — type certification, continued airworthiness",
    },
    documents: {
      "Doc 9859": "Safety Management Manual (SMS) — ICAO SMS framework, safety culture, just culture, risk management",
    },
  },

  // ─── SECTION E: OSHA / WORKPLACE SAFETY ──────────────
  E: {
    id: "E",
    name: "OSHA / Workplace Safety",
    standards: {
      "29 CFR 1910.1200": {
        title: "Hazard Communication (GHS/SDS)",
        scope: "Aviation fluids, deicing chemicals, fuel handling — SDS availability required",
      },
      "29 CFR 1910.95": {
        title: "Occupational Noise Exposure",
        scope: "Tarmac/ramp operations, ground support, engine run-up areas",
      },
      "29 CFR 1910.132": {
        title: "PPE — General Requirements",
        scope: "Hearing protection, eye protection, high-visibility vests, fuel-resistant gloves",
      },
      "29 CFR 1910.146": {
        title: "Permit-Required Confined Spaces",
        scope: "Fuel tanks, cargo holds, wheel wells during maintenance",
      },
      "29 CFR 1910.147": {
        title: "Control of Hazardous Energy (Lockout/Tagout)",
        scope: "Aircraft maintenance — engine, hydraulic, electrical systems",
      },
      "29 CFR 1910.1030": {
        title: "Bloodborne Pathogens",
        scope: "CRITICAL for medevac/air ambulance. Exposure control plan, PPE, post-exposure procedures, sharps disposal, decontamination",
        criticalFor: ["av-medevac-billing", "av-emergency-response"],
      },
    },
    ergonomics: "Repetitive motion, lifting, crew rest station design — OSHA general duty clause",
  },

  // ─── SECTION F: STATE REGULATIONS ───────────────────
  F: {
    id: "F",
    name: "State Regulations",
    principle: "Federal FARs are the floor. State and local regulations may impose additional requirements.",
    states: {
      Hawaii: {
        agency: "HIOSH — Hawaii Occupational Safety & Health",
        rules: [
          "Mirrors federal OSHA with Hawaii-specific additions",
          "Noise abatement procedures at HNL, OGG, ITO, KOA, LIH",
          "Inter-island routing requirements",
          "HAR Title 12 labor safety standards",
        ],
      },
      Alaska: {
        rules: [
          "VFR-over-the-top provisions (unique to Alaska operations)",
          "Remote operations rules (14 CFR 91.527 enhanced)",
          "Enhanced survival equipment requirements for remote operations",
          "Bush flying operational considerations",
        ],
      },
    },
    raasRule: "When generating operational outputs for Hawaii or Alaska operations, flag that state-specific requirements may apply and direct operator to their FSDO/state labor office for current requirements.",
  },

  // ─── SECTION G: TSA / SECURITY ──────────────────────
  G: {
    id: "G",
    name: "TSA / Security",
    parts: {
      "49 CFR Part 1542": {
        title: "Airport Security",
        scope: "Airport security programs, badge requirements, access control",
      },
      "49 CFR Part 1544": {
        title: "Aircraft Operator Security",
        scope: "Part 135 screening requirements, security directives, TSA compliance",
      },
    },
  },

  // ─── SECTION H: EPA / ENVIRONMENTAL ─────────────────
  H: {
    id: "H",
    name: "EPA / Environmental",
    parts: {
      "40 CFR Parts 112/117": {
        title: "Oil Pollution Prevention (SPCC)",
        scope: "Spill prevention, control, and countermeasure plans for fuel storage/handling",
      },
    },
    additional: [
      "Aviation fuel handling and storage requirements",
      "Vapor recovery systems",
      "Underground storage tank regulations",
      "Deicing fluid containment and disposal",
    ],
  },

  // ─── SECTION I: HAZMAT ──────────────────────────────
  I: {
    id: "I",
    name: "Hazardous Materials",
    parts: {
      "49 CFR Part 175": {
        title: "Carriage by Aircraft",
        scope: "Forbidden materials, quantity limitations, labeling, dangerous goods declaration",
        medevacSpecific: [
          "Medical oxygen — specific packing and quantity rules",
          "Dry ice — ventilation and quantity limits",
          "Medications — controlled substance transport rules",
          "Radioactive materials for medical use",
        ],
      },
    },
    iataDgr: "IATA Dangerous Goods Regulations — packing instructions, PAX/cargo aircraft restrictions, acceptance checklist",
  },

  // ─── SECTION J: MEDEVAC / AIR AMBULANCE ─────────────
  J: {
    id: "J",
    name: "Medevac / Air Ambulance Specific",
    standards: {
      CAMTS: {
        name: "Commission on Accreditation of Medical Transport Systems",
        scope: "Current edition standards",
        requirements: [
          "Medical crew requirements and qualifications",
          "Equipment standards and checklists",
          "Quality management program requirements",
          "Medical director oversight requirements",
          "Scene response protocols",
          "Inter-facility transport standards",
          "Communication requirements",
          "Vehicle/aircraft standards",
        ],
      },
      EURAMI: {
        name: "European Aero-Medical Institute",
        scope: "International air ambulance standards — applicable to international medevac missions",
      },
    },
    raasRule: "Medevac workers must cross-reference both FAR and applicable accreditation standards. FAR compliance alone is not sufficient for accredited medevac operators.",
    hipaa: {
      rules: [
        "Patient information — NEVER in any worker output",
        "Flight manifest privacy — no patient identification in operational logs",
        "Applies to ALL aviation workers as hard block — not just medevac",
      ],
    },
  },

  // ─── SECTION K: OPERATIONAL STANDARDS & GUIDANCE ─────
  K: {
    id: "K",
    name: "Operational Standards & Guidance",
    frameworks: {
      SMS: {
        reference: "FAA AC 120-92B",
        pillars: ["Safety policy", "Safety risk management", "Safety assurance", "Safety promotion"],
      },
      AIM: {
        name: "Aeronautical Information Manual",
        scope: "Airspace, ATC procedures, emergency procedures, wake turbulence, bird strike avoidance",
      },
      CRM: {
        reference: "FAA AC 120-51F",
        elements: ["Communication", "Decision-making", "Situational awareness", "Workload management", "Team coordination"],
      },
    },
    advisoryCirculars: {
      "AC 120-109A": "Stall prevention and recovery training",
      "AC 120-111": "Upset prevention and recovery training",
      "AC 91-79B": "Mitigating the risks of a runway overrun upon landing",
      "AC 120-100": "Basics of aviation fatigue — countermeasures for flightcrew",
    },
  },
};

// ═══════════════════════════════════════════════════════
//  HARD BLOCKS (apply to ALL aviation workers)
// ═══════════════════════════════════════════════════════

const hardBlocks = [
  "patient_identifiable_information",   // HIPAA
  "specific_flight_manifest_details",   // TSA
  "safety_data_in_marketing_outputs",   // RAAS policy
  "frat_scores_in_social_content",      // RAAS policy
  "pilot_medical_certificate_details",  // Privacy
  "drug_alcohol_test_results",          // DOT/HIPAA
];

// ═══════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════

/**
 * Get applicable regulations for a specific worker.
 * @param {string} workerId — e.g. "av-pc12-ng"
 * @returns {object[]} — array of regulation sections
 */
function applyToWorker(workerId) {
  const workerType = WORKER_TYPE_MAP[workerId] || "default";
  const sectionIds = WORKER_REGULATION_MAP[workerType] || WORKER_REGULATION_MAP.default;
  return sectionIds.map((id) => regulations[id]).filter(Boolean);
}

/**
 * Get contextual regulations for a specific output type.
 * @param {string} workerId
 * @param {string} outputType — e.g. "preflight", "maintenance", "training", "medevac"
 * @returns {object[]} — filtered regulation sections relevant to that output
 */
function getContextForOutput(workerId, outputType) {
  const workerRegs = applyToWorker(workerId);
  const outputMap = {
    preflight: ["A", "B", "D", "F", "K"],
    maintenance: ["A", "E", "H", "K"],
    training: ["A", "D", "K"],
    medevac: ["A", "B", "C", "E", "I", "J", "K"],
    dispatch: ["A", "B", "C", "F", "K"],
    safety: ["A", "D", "E", "K"],
    compliance: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "K"],
  };
  const relevantIds = outputMap[outputType] || [];
  return workerRegs.filter((r) => relevantIds.includes(r.id));
}

module.exports = {
  version: "1.0.0",
  effectiveDate: "2026-03-30",
  changelog: [],
  nextReviewDate: "2026-09-30",
  regulations,
  applyToWorker,
  getContextForOutput,
  hardBlocks,
  WORKER_TYPE_MAP,
  WORKER_REGULATION_MAP,
};
