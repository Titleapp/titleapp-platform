import React, { useState } from "react";

// Worker idea cards organized by vertical → subject_domain
const WORKER_IDEAS = {
  "health-education": {
    critical_care_icu: [
      { name: "ICU Protocol Reference", desc: "Instant access to critical care protocols, drip calculations, and ventilator settings.", price: "$29-49/mo", lane: "back_me_up" },
      { name: "ICU Charting Assistant", desc: "Structured documentation for hemodynamic monitoring, titrations, and hourly assessments.", price: "$29-49/mo", lane: "chart_it" },
      { name: "Critical Care Scenario Builder", desc: "Create realistic ICU patient scenarios for unit-based education and competency validation.", price: "$49-79/mo", lane: "learn_it" },
      { name: "ICU Orientation Curriculum", desc: "Build a structured preceptor program with competency checklists and progression tracking.", price: "$49-79/mo", lane: "build_it" },
      { name: "ICU CEU Tracker", desc: "Track critical care certifications, CCRN renewal, and unit-specific competencies.", price: "$29/mo", lane: "cert_it" },
    ],
    emergency_er: [
      { name: "ED Triage Reference", desc: "ESI triage protocols, chief complaint pathways, and acuity-based disposition guidance.", price: "$29-49/mo", lane: "back_me_up" },
      { name: "ED Documentation Assistant", desc: "Streamline ED charting with complaint-based templates and auto-populated fields.", price: "$29-49/mo", lane: "chart_it" },
      { name: "Emergency Scenario Simulator", desc: "High-fidelity ED scenarios for trauma, cardiac, stroke, and pediatric emergencies.", price: "$49-79/mo", lane: "learn_it" },
      { name: "ED Residency Curriculum", desc: "Structured emergency medicine education tracks with milestone-based progression.", price: "$49-79/mo", lane: "build_it" },
      { name: "Emergency CEU Tracker", desc: "Track CEN, TNCC, ENPC, and state-specific continuing education requirements.", price: "$29/mo", lane: "cert_it" },
    ],
    flight_nursing: [
      { name: "Flight Documentation Assistant", desc: "Streamline PCR and ePCR documentation for rotor and fixed-wing transports.", price: "$29-49/mo", lane: "chart_it" },
      { name: "Transport Protocol Reference", desc: "Instant access to critical care transport protocols, drug dosing, and equipment checklists.", price: "$29-49/mo", lane: "back_me_up" },
      { name: "Flight Scenario Builder", desc: "Create realistic transport scenarios for crew resource management and clinical training.", price: "$49-79/mo", lane: "learn_it" },
      { name: "Flight Program Curriculum", desc: "Build orientation and annual competency programs for flight nursing teams.", price: "$49-79/mo", lane: "build_it" },
      { name: "Flight Cert Tracker", desc: "Track CFRN, FP-C, CCP-C, and program-specific certifications and recurrency.", price: "$29/mo", lane: "cert_it" },
    ],
    ems_paramedic: [
      { name: "ePCR Builder", desc: "Structured pre-hospital documentation with NREMT-aligned assessment templates.", price: "$29-49/mo", lane: "chart_it" },
      { name: "EMS Protocol Reference", desc: "State and local protocol lookup with medication dosing and standing order guidance.", price: "$29-49/mo", lane: "back_me_up" },
      { name: "EMS Scenario Simulator", desc: "Field-based scenarios for BLS, ALS, and critical care paramedic training.", price: "$49-79/mo", lane: "learn_it" },
      { name: "EMS Academy Curriculum", desc: "Design EMT and paramedic programs aligned to NREMT and CoAEMSP standards.", price: "$49-79/mo", lane: "build_it" },
      { name: "EMS License Tracker", desc: "Track NREMT, state licenses, ACLS, PALS, and agency-specific requirements.", price: "$29/mo", lane: "cert_it" },
    ],
    perioperative_or: [
      { name: "OR Documentation Assistant", desc: "Perioperative charting with time-outs, counts, and implant tracking.", price: "$29-49/mo", lane: "chart_it" },
      { name: "Surgical Protocol Reference", desc: "Procedure-specific protocols, positioning guides, and instrument sets.", price: "$29-49/mo", lane: "back_me_up" },
      { name: "OR Scenario Builder", desc: "Surgical emergency scenarios for circulator and scrub competency validation.", price: "$49-79/mo", lane: "learn_it" },
      { name: "Perioperative Curriculum", desc: "Build perioperative orientation programs with competency progression tracking.", price: "$49-79/mo", lane: "build_it" },
    ],
    pediatrics_nicu: [
      { name: "NICU Charting Assistant", desc: "Neonatal documentation with growth tracking, feeding protocols, and developmental milestones.", price: "$29-49/mo", lane: "chart_it" },
      { name: "Neonatal Protocol Reference", desc: "NRP protocols, medication dosing by weight, and thermoregulation guidelines.", price: "$29-49/mo", lane: "back_me_up" },
      { name: "Pediatric Scenario Builder", desc: "Age-specific clinical scenarios for pediatric and neonatal nursing education.", price: "$49-79/mo", lane: "learn_it" },
      { name: "Peds/NICU Curriculum", desc: "Build unit-based education programs for pediatric and NICU nursing teams.", price: "$49-79/mo", lane: "build_it" },
    ],
    ob_labor_delivery: [
      { name: "L&D Charting Assistant", desc: "Labor documentation with strip interpretation prompts and delivery records.", price: "$29-49/mo", lane: "chart_it" },
      { name: "OB Protocol Reference", desc: "Hemorrhage, preeclampsia, and shoulder dystocia protocols with medication dosing.", price: "$29-49/mo", lane: "back_me_up" },
      { name: "OB Scenario Builder", desc: "Obstetric emergency scenarios for labor and delivery team training.", price: "$49-79/mo", lane: "learn_it" },
      { name: "OB Nursing Curriculum", desc: "Build L&D orientation and competency programs with NCC certification prep.", price: "$49-79/mo", lane: "build_it" },
    ],
    home_health: [
      { name: "Home Health Documentation", desc: "OASIS-aligned assessment documentation with care plan generation.", price: "$29-49/mo", lane: "chart_it" },
      { name: "Home Health Protocol Reference", desc: "Wound care, medication management, and fall prevention protocols.", price: "$29-49/mo", lane: "back_me_up" },
      { name: "Home Health Training Builder", desc: "Create competency scenarios for home health aide and nursing training.", price: "$49-79/mo", lane: "learn_it" },
      { name: "Home Health Compliance Tracker", desc: "Track visit compliance, certification renewals, and agency requirements.", price: "$29/mo", lane: "cert_it" },
    ],
    nursing_education_faculty: [
      { name: "Curriculum Architect", desc: "Design CCNE/ACEN-aligned nursing programs with course mapping and outcome tracking.", price: "$49-79/mo", lane: "build_it" },
      { name: "Clinical Scenario Library", desc: "Build a curated library of clinical scenarios mapped to NCLEX categories.", price: "$49-79/mo", lane: "learn_it" },
      { name: "Student Evaluation Manager", desc: "Structured clinical evaluations with competency rubrics and progression tracking.", price: "$29-49/mo", lane: "chart_it" },
      { name: "Faculty Development Tracker", desc: "Track faculty credentials, scholarly activity, and continuing education.", price: "$29/mo", lane: "cert_it" },
      { name: "Program Analytics", desc: "NCLEX pass rates, retention data, and accreditation metrics dashboard.", price: "$29/mo", lane: "grow_it" },
    ],
    ems_instructor_academy: [
      { name: "EMS Academy Builder", desc: "Design CoAEMSP-aligned EMT and paramedic programs with skill tracking.", price: "$49-79/mo", lane: "build_it" },
      { name: "EMS Skills Scenario Library", desc: "Build NREMT psychomotor exam scenarios and field simulation exercises.", price: "$49-79/mo", lane: "learn_it" },
      { name: "Student Documentation Trainer", desc: "Teach documentation through structured ePCR exercises with feedback.", price: "$29-49/mo", lane: "chart_it" },
      { name: "Instructor Certification Tracker", desc: "Track instructor credentials, NAEMSE requirements, and recertification.", price: "$29/mo", lane: "cert_it" },
      { name: "Academy Analytics", desc: "NREMT pass rates, student progression, and program outcome reporting.", price: "$29/mo", lane: "grow_it" },
    ],
  },
  aviation: {
    _default: [
      { name: "Flight Crew Scheduler", desc: "Automate crew scheduling with Part 117 duty/rest compliance and fatigue risk management.", price: "$49-79/mo", lane: null },
      { name: "Aircraft Maintenance Tracker", desc: "Track AD compliance, progressive inspections, and component time tracking.", price: "$49-79/mo", lane: null },
      { name: "Flight Operations Manual", desc: "Build and maintain SOPs, checklists, and GOM sections with revision control.", price: "$29-49/mo", lane: null },
      { name: "Pilot Training Records", desc: "Track type ratings, recurrency, 61.57 requirements, and checking events.", price: "$29/mo", lane: null },
      { name: "Safety Management System", desc: "Hazard reporting, risk assessment matrices, and SMS compliance tracking.", price: "$49-79/mo", lane: null },
    ],
  },
  "real-estate": {
    _default: [
      { name: "CRE Deal Analyst", desc: "Screen commercial real estate deals with cash flow modeling and cap rate analysis.", price: "$49-79/mo", lane: null },
      { name: "Property Management Assistant", desc: "Tenant communications, maintenance coordination, and lease administration.", price: "$29-49/mo", lane: null },
      { name: "Mortgage Underwriter", desc: "Automated underwriting checklist with DTI analysis and document verification.", price: "$49-79/mo", lane: null },
      { name: "Title Search Assistant", desc: "Chain of title review, lien identification, and exception documentation.", price: "$49-79/mo", lane: null },
    ],
  },
  auto: {
    _default: [
      { name: "Dealer Inventory Manager", desc: "VIN-based inventory tracking with market pricing and days-on-lot analytics.", price: "$29-49/mo", lane: null },
      { name: "F&I Compliance Checker", desc: "Finance and insurance product disclosure compliance and rate validation.", price: "$49-79/mo", lane: null },
      { name: "Customer Outreach Manager", desc: "Service reminders, lease maturity campaigns, and conquest marketing.", price: "$29/mo", lane: null },
      { name: "Trade-In Appraiser", desc: "Market-based vehicle appraisal with condition adjustment and reconditioning estimates.", price: "$29-49/mo", lane: null },
    ],
  },
  investment: {
    _default: [
      { name: "Investor Relations Manager", desc: "LP communications, capital call processing, and distribution waterfall tracking.", price: "$49-79/mo", lane: null },
      { name: "Portfolio Analyst", desc: "Multi-asset portfolio monitoring with risk metrics and rebalancing alerts.", price: "$49-79/mo", lane: null },
      { name: "Fund Compliance Tracker", desc: "Regulatory filing deadlines, investor accreditation, and audit preparation.", price: "$49-79/mo", lane: null },
      { name: "Deal Screening Assistant", desc: "Preliminary deal evaluation with scoring criteria and comparable analysis.", price: "$29-49/mo", lane: null },
    ],
  },
  construction: {
    _default: [
      { name: "Construction Manager", desc: "Budget tracking, schedule management, and subcontractor coordination.", price: "$49-79/mo", lane: null },
      { name: "RFI & Submittal Tracker", desc: "Manage RFIs, submittals, and change orders with automated routing.", price: "$29-49/mo", lane: null },
      { name: "Safety Compliance Monitor", desc: "OSHA compliance tracking, toolbox talks, and incident reporting.", price: "$29-49/mo", lane: null },
      { name: "Draw Request Processor", desc: "Construction lending draw processing with inspection and lien waiver tracking.", price: "$49-79/mo", lane: null },
    ],
  },
  insurance: {
    _default: [
      { name: "Claims Processor", desc: "Automated claims intake, documentation review, and adjudication assistance.", price: "$49-79/mo", lane: null },
      { name: "Policy Underwriter", desc: "Risk assessment, rating, and policy issuance with compliance checks.", price: "$49-79/mo", lane: null },
      { name: "Renewal Manager", desc: "Policy renewal campaigns with risk re-evaluation and premium optimization.", price: "$29-49/mo", lane: null },
      { name: "Compliance Monitor", desc: "State filing requirements, rate adequacy, and regulatory change tracking.", price: "$29-49/mo", lane: null },
    ],
  },
  custom: {
    _default: [
      { name: "Document Reviewer", desc: "Automated document analysis with extraction, validation, and summarization.", price: "$29-49/mo", lane: null },
      { name: "Compliance Checker", desc: "Custom compliance rule enforcement for any industry or regulation.", price: "$29-49/mo", lane: null },
      { name: "Data Entry Validator", desc: "Structured data intake with validation rules and error detection.", price: "$29/mo", lane: null },
      { name: "Report Generator", desc: "Automated report creation from structured data with customizable templates.", price: "$29/mo", lane: null },
    ],
  },
};

const HE_SUBJECT_DOMAINS = [
  { value: "critical_care_icu", label: "Critical Care / ICU" },
  { value: "emergency_er", label: "Emergency / ER" },
  { value: "flight_nursing", label: "Flight Nursing / Critical Care Transport" },
  { value: "ems_paramedic", label: "EMS / Paramedic" },
  { value: "perioperative_or", label: "Perioperative / OR" },
  { value: "pediatrics_nicu", label: "Pediatrics / NICU" },
  { value: "ob_labor_delivery", label: "OB / Labor & Delivery" },
  { value: "home_health", label: "Home Health" },
  { value: "nursing_education_faculty", label: "Nursing Education Faculty" },
  { value: "ems_instructor_academy", label: "EMS Instructor / Academy" },
];

export function getWorkerIdeas(vertical, subjectDomain) {
  const verticalData = WORKER_IDEAS[vertical];
  if (!verticalData) return WORKER_IDEAS.custom._default;
  if (vertical === "health-education" && subjectDomain && verticalData[subjectDomain]) {
    return verticalData[subjectDomain];
  }
  return verticalData._default || WORKER_IDEAS.custom._default;
}

export { HE_SUBJECT_DOMAINS };

export default function WorkerGallery({ vertical, subjectDomain, onSelectIdea, onWaitlistToggle, waitlistEnabled }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const ideas = getWorkerIdeas(vertical, subjectDomain);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Choose a starting point</div>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>Pick one that is close to what you have in mind. Alex will customize it from there.</div>
        </div>
      </div>

      {/* Pre-launch waitlist toggle */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        background: waitlistEnabled ? "rgba(124,58,237,0.08)" : "#16161e",
        border: `1px solid ${waitlistEnabled ? "#7c3aed" : "#2a2a3a"}`,
        borderRadius: 10, marginBottom: 20, cursor: "pointer",
      }} onClick={onWaitlistToggle}>
        <div style={{
          width: 40, height: 22, borderRadius: 11, padding: 2,
          background: waitlistEnabled ? "#7c3aed" : "#3a3a4a", transition: "all 0.2s",
          display: "flex", alignItems: waitlistEnabled ? "center" : "center",
          justifyContent: waitlistEnabled ? "flex-end" : "flex-start",
        }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "white", transition: "all 0.2s" }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Pre-launch waitlist</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Collect interest from your network before the worker is live. Subscribers will be waiting when you publish.</div>
        </div>
      </div>

      {/* Idea cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {ideas.map((idea, i) => (
          <div
            key={i}
            style={{
              background: hoveredIdx === i ? "#1e1e2e" : "#16161e",
              border: `1px solid ${hoveredIdx === i ? "#7c3aed" : "#2a2a3a"}`,
              borderRadius: 12, padding: 20, cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => onSelectIdea(idea)}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>{idea.name}</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 12 }}>{idea.desc}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed" }}>{idea.price}</span>
              <span style={{
                padding: "4px 10px", background: "rgba(124,58,237,0.1)", color: "#7c3aed",
                borderRadius: 6, fontSize: 12, fontWeight: 600,
              }}>Start with this</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
