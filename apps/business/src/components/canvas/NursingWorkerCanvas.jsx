// NursingWorkerCanvas — Makai School of Nursing · Clinical Programs Suite
// Trump Rule: cohort overview first — big picture before individual drill-down.
// All 5 workers share this canvas; the active tab set switches by worker slug.

import React, { useState } from "react";
import TabDescription from "./TabDescription";
import { getTabDescription } from "./workerTabDescriptions";

const tabToKey = (t) => t.toLowerCase().replace(/ /g, "-");

// ── Slug registry ─────────────────────────────────────────────────────────────

const NURSING_SLUGS = new Set([
  "nursing-education-001",        // Clearwater Nursing Education (deployed)
  "nursing-records-001",
  "nursing-courses-001",
  "nursing-tutor-001",
  "nursing-comms-001",
  "nursing-accreditation-001",
  "uh-nursing-records-001",
  "uh-nursing-courses-001",
  "uh-nursing-tutor-001",
  "uh-nursing-comms-001",
  "uh-nursing-accreditation-001",
]);

// eslint-disable-next-line react-refresh/only-export-components
export function isNursingWorker(w) {
  return NURSING_SLUGS.has(w?.workerId || w?.slug || "");
}

// ── Demo data (matches seedMakaiNursingDemo.js) ───────────────────────────────

// ── Makai School of Nursing data ──────────────────────────────────────────────

const MAKAI_SCHOOL = {
  name: "Makai School of Nursing",
  program: "BSN Program",
  cohort: "Class of 2028",
  accreditor: "ACEN",
};

const MAKAI_STUDENTS = [
  {
    id: "student-jordan-chen",
    name: "Jordan Chen",
    status: "at-risk",
    clinicalHours: 187,
    clinicalHoursRequired: 500,
    atiScore: 68,
    coursesComplete: 1,
    competencies: [
      { id: "3A", name: "Sterile field preparation", status: "pending" },
      { id: "4B", name: "IV catheter insertion", status: "pending" },
    ],
    notes: "Behind on clinical hours; 2 unsigned competencies; needs preceptor follow-up",
  },
  {
    id: "student-maya-kahale",
    name: "Maya Kahale",
    status: "on-track",
    clinicalHours: 312,
    clinicalHoursRequired: 500,
    atiScore: 78,
    coursesComplete: 3,
    competencies: [],
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
    competencies: [
      { id: "6A", name: "Patient discharge teaching", status: "verified", attestedBy: "Dr. Kealani Moku" },
    ],
    notes: "High NCLEX readiness indicators; all competencies signed",
  },
  {
    id: "student-noah-ferreira",
    name: "Noah Ferreira",
    status: "on-track",
    clinicalHours: 298,
    clinicalHoursRequired: 500,
    atiScore: 74,
    coursesComplete: 3,
    competencies: [],
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
    competencies: [],
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
    competencies: [],
    notes: "Extended leave; return plan active",
  },
  {
    id: "student-sara-kahele",
    name: "Sara Kahele",
    status: "ready",
    clinicalHours: 486,
    clinicalHoursRequired: 500,
    atiScore: 88,
    coursesComplete: 5,
    competencies: [
      { id: "2A", name: "Medication administration safety", status: "verified", attestedBy: "Dr. Kealani Moku" },
      { id: "4B", name: "IV catheter insertion", status: "verified", attestedBy: "Prof. Ana Rodrigues" },
      { id: "5C", name: "Wound care and dressing change", status: "verified", attestedBy: "Dr. Kealani Moku" },
    ],
    notes: "Consistently high performer; exceeds NCLEX readiness benchmarks; vault record complete",
  },
];

const MAKAI_COURSES = [
  {
    id: "nsg-201",
    code: "NSG 201",
    name: "Fundamentals of Nursing Care",
    source: "OpenStax Nursing: Fundamentals, 2023 · CC BY 4.0",
    currentWeek: 6,
    totalWeeks: 16,
    enrolled: 6,
  },
  {
    id: "nsg-312",
    code: "NSG 312",
    name: "Clinical Pharmacology",
    source: "OpenStax Nursing: Pharmacology, 2023 · CC BY 4.0",
    currentWeek: 3,
    totalWeeks: 14,
    enrolled: 4,
  },
];

const MAKAI_PENDING_ATTESTATIONS = [
  { student: "Jordan Chen", competency: "3A - Sterile field preparation", waitingOn: "Dr. Kealani Moku", daysPending: 8 },
  { student: "Jordan Chen", competency: "4B - IV catheter insertion", waitingOn: "Prof. Ana Rodrigues", daysPending: 12 },
  { student: "Noah Ferreira", competency: "Preceptor evaluation", waitingOn: "Prof. Ana Rodrigues", daysPending: 5 },
];

const MAKAI_NCLEX_DOMAINS = [
  { domain: "Management of Care", pct: 74, benchmark: 70 },
  { domain: "Safety & Infection Control", pct: 81, benchmark: 70 },
  { domain: "Health Promotion", pct: 68, benchmark: 70 },
  { domain: "Psychosocial Integrity", pct: 72, benchmark: 70 },
  { domain: "Basic Care & Comfort", pct: 85, benchmark: 70 },
  { domain: "Pharmacological Therapies", pct: 69, benchmark: 70 },
  { domain: "Reduction of Risk", pct: 77, benchmark: 70 },
  { domain: "Physiological Adaptation", pct: 63, benchmark: 70 },
];

// ── University of Hawaiʻi at Mānoa data ───────────────────────────────────────

const UH_SCHOOL = {
  name: "UH Mānoa · School of Nursing & Dental Hygiene",
  program: "BSN Program",
  cohort: "Class of 2027",
  accreditor: "CCNE",
};

const UH_STUDENTS = [
  {
    id: "student-keala-akana",
    name: "Keala Akana",
    status: "ready",
    clinicalHours: 495,
    clinicalHoursRequired: 500,
    atiScore: 92,
    coursesComplete: 6,
    competencies: [
      { id: "3A", name: "Sterile field preparation", status: "verified", attestedBy: "Dr. Noa Kahananui" },
      { id: "5C", name: "Wound care and dressing change", status: "verified", attestedBy: "Prof. Lani Moku" },
    ],
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
    competencies: [],
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
    competencies: [],
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
    competencies: [
      { id: "2A", name: "Medication verification protocol", status: "pending" },
    ],
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
    competencies: [],
    notes: "",
  },
];

const UH_COURSES = [
  {
    id: "nur-280",
    code: "NUR 280",
    name: "Foundations of Professional Nursing",
    source: "OpenStax Nursing: Fundamentals, 2023 · CC BY 4.0",
    currentWeek: 8,
    totalWeeks: 16,
    enrolled: 5,
  },
  {
    id: "nur-440",
    code: "NUR 440",
    name: "Complex Care Nursing",
    source: "OpenStax Nursing: Pharmacology, 2023 · CC BY 4.0",
    currentWeek: 4,
    totalWeeks: 14,
    enrolled: 3,
  },
];

const UH_PENDING_ATTESTATIONS = [
  { student: "Hana Yoshida", competency: "2A - Medication Verification Protocol", waitingOn: "Dr. Noa Kahananui", daysPending: 9 },
  { student: "Kai Fernandez", competency: "Preceptor Evaluation — Week 8 Clinical", waitingOn: "Prof. Lani Moku", daysPending: 4 },
];

const UH_NCLEX_DOMAINS = [
  { domain: "Management of Care", pct: 80, benchmark: 70 },
  { domain: "Safety & Infection Control", pct: 78, benchmark: 70 },
  { domain: "Health Promotion", pct: 71, benchmark: 70 },
  { domain: "Psychosocial Integrity", pct: 66, benchmark: 70 },
  { domain: "Basic Care & Comfort", pct: 82, benchmark: 70 },
  { domain: "Pharmacological Therapies", pct: 74, benchmark: 70 },
  { domain: "Reduction of Risk", pct: 73, benchmark: 70 },
  { domain: "Physiological Adaptation", pct: 69, benchmark: 70 },
];

// ── School config lookup ───────────────────────────────────────────────────────

function getSchoolData(slug) {
  if (slug.startsWith("uh-nursing-")) {
    return {
      school: UH_SCHOOL,
      students: UH_STUDENTS,
      courses: UH_COURSES,
      pendingAttestations: UH_PENDING_ATTESTATIONS,
      nclexDomains: UH_NCLEX_DOMAINS,
    };
  }
  return {
    school: MAKAI_SCHOOL,
    students: MAKAI_STUDENTS,
    courses: MAKAI_COURSES,
    pendingAttestations: MAKAI_PENDING_ATTESTATIONS,
    nclexDomains: MAKAI_NCLEX_DOMAINS,
  };
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", marginBottom: 10 };
const LABEL = { fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 };
const TAG = (color) => ({
  display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
  background: color === "green" ? "#d1fae5" : color === "red" ? "#fee2e2" : color === "yellow" ? "#fef3c7" : "#f3f4f6",
  color: color === "green" ? "#065f46" : color === "red" ? "#991b1b" : color === "yellow" ? "#92400e" : "#374151",
});

const statusColor = (s) => s === "ready" ? "green" : s === "at-risk" ? "red" : "yellow";
const statusLabel = (s) => s === "ready" ? "Ready" : s === "at-risk" ? "At Risk" : "On Track";

function HoursBar({ hours, required }) {
  const pct = Math.min(100, Math.round((hours / required) * 100));
  const color = pct >= 90 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s" }} />
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{hours} / {required} hrs ({pct}%)</div>
    </div>
  );
}

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #e5e7eb", paddingBottom: 0 }}>
      {tabs.map(t => (
        <button key={t}
          onClick={() => onSelect(t)}
          style={{
            padding: "7px 13px", fontSize: 12, fontWeight: active === t ? 600 : 400,
            color: active === t ? "#4f46e5" : "#6b7280",
            background: "none", border: "none", borderBottom: active === t ? "2px solid #4f46e5" : "2px solid transparent",
            cursor: "pointer", borderRadius: "4px 4px 0 0", whiteSpace: "nowrap",
          }}>{t}</button>
      ))}
    </div>
  );
}

function DemoBanner() {
  return (
    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: "#0369a1" }}>
        <strong>Demo environment</strong> — All student data is fictional. No FERPA obligations attach to this workspace.
      </span>
    </div>
  );
}

// ── Worker 1 — Student Record Worker ─────────────────────────────────────────

function RecordsCanvas({ slug, schoolData }) {
  const { students: STUDENTS, school: SCHOOL, pendingAttestations: PENDING_ATTESTATIONS } = schoolData;
  const [tab, setTab] = useState("Cohort Overview");
  const [selected, setSelected] = useState(null);
  const TABS = ["Cohort Overview", "Student Record", "Clinical Hours", "Competency Log", "Vault Export"];

  const atRisk = STUDENTS.filter(s => s.status === "at-risk").length;
  const ready = STUDENTS.filter(s => s.status === "ready").length;
  const onTrack = STUDENTS.filter(s => s.status === "on-track").length;

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onSelect={t => { setTab(t); }} />
      <TabDescription slug={slug} tabId={tabToKey(tab)} description={getTabDescription(slug, tabToKey(tab))} />

      {tab === "Cohort Overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "At Risk", value: atRisk, color: "#fee2e2", text: "#991b1b" },
              { label: "On Track", value: onTrack, color: "#fef3c7", text: "#92400e" },
              { label: "Ready", value: ready, color: "#d1fae5", text: "#065f46" },
            ].map(s => (
              <div key={s.label} style={{ ...CARD, background: s.color, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.text }}>{s.value}</div>
                <div style={{ fontSize: 12, color: s.text, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {STUDENTS.map(s => (
            <div key={s.id} style={{ ...CARD, cursor: "pointer", borderLeft: `3px solid ${s.status === "ready" ? "#10b981" : s.status === "at-risk" ? "#ef4444" : "#f59e0b"}` }}
              onClick={() => { setSelected(s); setTab("Student Record"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <span style={TAG(statusColor(s.status))}>{statusLabel(s.status)}</span>
              </div>
              <HoursBar hours={s.clinicalHours} required={s.clinicalHoursRequired} />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>ATI: {s.atiScore}% · {s.coursesComplete} courses complete</div>
              {s.notes && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, fontStyle: "italic" }}>{s.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "Student Record" && (
        <div>
          {!selected && (
            <div style={{ color: "#6b7280", fontSize: 13 }}>Select a student from Cohort Overview to view their record.</div>
          )}
          {selected && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{SCHOOL.program} · {SCHOOL.cohort}</div>
                </div>
                <span style={TAG(statusColor(selected.status))}>{statusLabel(selected.status)}</span>
              </div>
              <div style={CARD}>
                <div style={LABEL}>Clinical Hours</div>
                <HoursBar hours={selected.clinicalHours} required={selected.clinicalHoursRequired} />
              </div>
              <div style={CARD}>
                <div style={LABEL}>ATI Fundamentals Score</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: selected.atiScore >= 80 ? "#10b981" : selected.atiScore >= 70 ? "#f59e0b" : "#ef4444" }}>
                  {selected.atiScore}%
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Benchmark: 70%</div>
              </div>
              <div style={CARD}>
                <div style={LABEL}>Competencies</div>
                {selected.competencies.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>No competency records on file yet.</div>
                )}
                {selected.competencies.map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: 13 }}>{c.id} — {c.name}</span>
                    <span style={TAG(c.status === "verified" ? "green" : "yellow")}>{c.status === "verified" ? "Verified" : "Pending"}</span>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div style={{ ...CARD, background: "#fffbeb", borderColor: "#fde68a" }}>
                  <div style={LABEL}>Notes</div>
                  <div style={{ fontSize: 13 }}>{selected.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "Clinical Hours" && (
        <div>
          <div style={LABEL}>Clinical Hours by Student — {SCHOOL.cohort}</div>
          {STUDENTS.map(s => (
            <div key={s.id} style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                <span style={TAG(statusColor(s.status))}>{statusLabel(s.status)}</span>
              </div>
              <HoursBar hours={s.clinicalHours} required={s.clinicalHoursRequired} />
            </div>
          ))}
          <div style={{ ...CARD, background: "#f0fdf4", borderColor: "#86efac", marginTop: 4 }}>
            <div style={{ fontSize: 12, color: "#166534" }}>
              Program minimum: <strong>500 clinical hours</strong> · Required before graduation
            </div>
          </div>
        </div>
      )}

      {tab === "Competency Log" && (
        <div>
          <div style={LABEL}>All Competency Records</div>
          {STUDENTS.flatMap(s => s.competencies.map(c => ({ ...c, studentName: s.name }))).map((c, i) => (
            <div key={i} style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.studentName}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{c.id} — {c.name}</div>
                  {c.attestedBy && <div style={{ fontSize: 11, color: "#9ca3af" }}>Signed by {c.attestedBy}</div>}
                </div>
                <span style={TAG(c.status === "verified" ? "green" : "yellow")}>{c.status === "verified" ? "Verified ✓" : "Pending"}</span>
              </div>
            </div>
          ))}
          {PENDING_ATTESTATIONS.map((p, i) => (
            <div key={i} style={{ ...CARD, borderLeft: "3px solid #f59e0b" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{p.competency}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Waiting on {p.waitingOn} · {p.daysPending}d pending</div>
                </div>
                <span style={TAG("yellow")}>Awaiting Sign-off</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Vault Export" && (
        <div>
          <div style={{ ...CARD, background: "#f0f9ff", borderColor: "#bae6fd" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0369a1", marginBottom: 6 }}>Student-Owned Records</div>
            <div style={{ fontSize: 13, color: "#0369a1", lineHeight: 1.6 }}>
              Each student's learning record — clinical hours, competency attestations, course grades — is stored in their personal Vault. Records are append-only and signed. Students carry them beyond graduation.
            </div>
          </div>
          {STUDENTS.map(s => (
            <div key={s.id} style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {s.clinicalHours}h clinical · ATI {s.atiScore}% · {s.coursesComplete} courses · {s.competencies.filter(c => c.status === "verified").length} signed competencies
                  </div>
                </div>
                <button style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", color: "#374151" }}>
                  Export Record
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Worker 2 — Course Delivery Worker ─────────────────────────────────────────

function CoursesCanvas({ slug, schoolData }) {
  const { courses: COURSES, students: STUDENTS } = schoolData;
  const [tab, setTab] = useState("Course Roster");
  const [atiFired, setAtiFired] = useState(false);
  const TABS = ["Course Roster", "Module Progress", "ATI Integration", "Gradebook", "Course Content"];

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onSelect={setTab} />
      <TabDescription slug={slug} tabId={tabToKey(tab)} description={getTabDescription(slug, tabToKey(tab))} />

      {tab === "Course Roster" && (
        <div>
          {COURSES.map(c => (
            <div key={c.id} style={CARD}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.code} — {c.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Week {c.currentWeek} of {c.totalWeeks} · {c.enrolled} students enrolled</div>
              <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((c.currentWeek / c.totalWeeks) * 100)}%`, background: "#6366f1", borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{c.source}</div>
            </div>
          ))}
          <div style={{ ...CARD, background: "#f5f3ff", borderColor: "#c4b5fd" }}>
            <div style={{ fontSize: 12, color: "#5b21b6" }}>
              Course content is from <strong>OpenStax Nursing</strong> — peer-reviewed, NCLEX-aligned, CC BY 4.0. ATI's value is the item bank and NCLEX analytics, delivered via LTI.
            </div>
          </div>
        </div>
      )}

      {tab === "Module Progress" && (
        <div>
          {COURSES.map(c => (
            <div key={c.id} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{c.code} — {c.name}</div>
              {Array.from({ length: c.totalWeeks }, (_, i) => i + 1).map(wk => (
                <div key={wk} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600,
                    background: wk < c.currentWeek ? "#d1fae5" : wk === c.currentWeek ? "#ddd6fe" : "#f3f4f6",
                    color: wk < c.currentWeek ? "#065f46" : wk === c.currentWeek ? "#5b21b6" : "#9ca3af",
                  }}>{wk}</div>
                  <div style={{ fontSize: 12, color: wk <= c.currentWeek ? "#374151" : "#9ca3af" }}>
                    Week {wk} {wk < c.currentWeek ? "✓" : wk === c.currentWeek ? "← Current" : ""}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "ATI Integration" && (
        <div>
          <div style={{ ...CARD, background: "#fffbeb", borderColor: "#fde68a" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>ATI LTI 1.3 Integration</div>
            <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
              ATI Nursing is certified LTI 1.3 (Ascend Learning, 2026). When a student completes an ATI assessment, the score flows back via AGS 2.0 grade passback — no CSV, no manual entry. The score lands in the gradebook and mints a logbook entry in the student's record automatically.
            </div>
          </div>

          <div style={{ ...CARD, border: "2px dashed #c4b5fd" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#5b21b6" }}>Simulate ATI Score Delivery</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
              Triggers a synthetic AGS grade passback event — identical to how a real ATI score would arrive. Shows Maya Kahale completing NSG 312 Module 3 with a 74% score.
            </div>
            {!atiFired ? (
              <button
                onClick={() => setAtiFired(true)}
                style={{ padding: "8px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Trigger ATI Score Event
              </button>
            ) : (
              <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#065f46", marginBottom: 4 }}>✓ ATI Score Received</div>
                <div style={{ fontSize: 12, color: "#065f46" }}>
                  Student: <strong>Maya Kahale</strong><br />
                  Course: NSG 312 · Module 3 — Pharmacokinetics<br />
                  Score: <strong>74%</strong> (benchmark 70%) · Received via AGS 2.0<br />
                  Action: Gradebook updated · Logbook entry minted · AI Tutor notified of gap area
                </div>
              </div>
            )}
          </div>

          <div style={CARD}>
            <div style={LABEL}>What real ATI integration requires</div>
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
              1. Agreement with Ascend Learning confirming SOCIII acts as LTI 1.3 Platform<br />
              2. OIDC handshake + JWK endpoint (Platform-side)<br />
              3. AGS endpoint — ATI calls it to write scores back<br />
              4. NRPS endpoint — Platform exposes roster to ATI<br />
              5. Institution's existing ATI license (ATI is not resold — the school's license powers it)
            </div>
          </div>
        </div>
      )}

      {tab === "Gradebook" && (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Student", "NSG 201", "NSG 312", "ATI Fund.", "Status"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: "8px 10px" }}>{s.coursesComplete >= 1 ? "In progress" : "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{s.coursesComplete >= 3 ? "In progress" : "—"}</td>
                  <td style={{ padding: "8px 10px", color: s.atiScore >= 80 ? "#065f46" : s.atiScore >= 70 ? "#92400e" : "#991b1b", fontWeight: 600 }}>{s.atiScore}%</td>
                  <td style={{ padding: "8px 10px" }}><span style={TAG(statusColor(s.status))}>{statusLabel(s.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Course Content" && (
        <div>
          {COURSES.map(c => (
            <div key={c.id} style={CARD}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.code} — {c.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 8px" }}>{c.source}</div>
              <div style={{ fontSize: 12, color: "#374151" }}>
                Free, peer-reviewed, NCLEX-aligned open educational resource. Available via <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 4 }}>GET /v1/edu:content</code> for AI-grounded responses.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Worker 3 — AI Tutor Worker ────────────────────────────────────────────────

function TutorCanvas({ slug, schoolData }) {
  const { nclexDomains: NCLEX_DOMAINS, courses: COURSES } = schoolData;
  const [tab, setTab] = useState("NCLEX Domain Map");
  const TABS = ["NCLEX Domain Map", "Active Sessions", "Tutor Analytics", "Content Coverage"];

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onSelect={setTab} />
      <TabDescription slug={slug} tabId={tabToKey(tab)} description={getTabDescription(slug, tabToKey(tab))} />

      {tab === "NCLEX Domain Map" && (
        <div>
          <div style={{ ...CARD, background: "#f5f3ff", borderColor: "#c4b5fd", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "#5b21b6", lineHeight: 1.6 }}>
              The AI Tutor maps every response to NCLEX-PN/RN competency domains. It prepares students — it does not grade them. NCLEX readiness is a clinical judgment call made by faculty, not an AI output.
            </div>
          </div>
          {NCLEX_DOMAINS.map(d => {
            const color = d.pct >= d.benchmark ? "#10b981" : "#ef4444";
            return (
              <div key={d.domain} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 500 }}>{d.domain}</span>
                  <span style={{ color, fontWeight: 600 }}>{d.pct}%</span>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${d.pct}%`, background: color, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>Cohort average · Benchmark {d.benchmark}%</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Active Sessions" && (
        <div>
          <div style={{ ...CARD, borderLeft: "3px solid #6366f1" }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Maya Kahale</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>NSG 312 — Pharmacokinetics · Started 14 min ago</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Asking about drug half-life calculations · NCLEX domain: Pharmacological Therapies</div>
          </div>
          <div style={{ ...CARD, borderLeft: "3px solid #6366f1" }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Noah Ferreira</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>NSG 201 — Infection Control · Started 32 min ago</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Reviewing sterile technique · NCLEX domain: Safety & Infection Control</div>
          </div>
          <div style={{ ...CARD, background: "#f9fafb" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>4 other students active today · 12 sessions this week</div>
          </div>
        </div>
      )}

      {tab === "Tutor Analytics" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Sessions This Week", value: "12" },
              { label: "Avg Session Length", value: "24 min" },
              { label: "Questions Answered", value: "89" },
              { label: "Domains Covered", value: "6 / 8" },
            ].map(s => (
              <div key={s.label} style={{ ...CARD, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ ...CARD, background: "#fff7ed", borderColor: "#fed7aa" }}>
            <div style={{ fontSize: 12, color: "#9a3412" }}>
              <strong>Gap flagged:</strong> Physiological Adaptation (63%) is below benchmark across the cohort. Tutor has increased coverage of this domain automatically.
            </div>
          </div>
        </div>
      )}

      {tab === "Content Coverage" && (
        <div>
          {[
            { course: "NSG 201 — Fundamentals", coverage: 62, source: "OpenStax Nursing: Fundamentals" },
            { course: "NSG 312 — Pharmacology", coverage: 28, source: "OpenStax Nursing: Pharmacology" },
          ].map(c => (
            <div key={c.course} style={CARD}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{c.course}</div>
              <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ height: "100%", width: `${c.coverage}%`, background: "#6366f1", borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{c.coverage}% of content covered in sessions · {c.source} · CC BY 4.0</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Worker 4 — Interdisciplinary Comms Worker ─────────────────────────────────

function CommsCanvas({ slug, schoolData }) {
  const { pendingAttestations: PENDING_ATTESTATIONS } = schoolData;
  const [tab, setTab] = useState("Faculty Queue");
  const [approved, setApproved] = useState({});
  const TABS = ["Faculty Queue", "Preceptor Portal", "Pending Attestations", "Communication Log"];

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onSelect={setTab} />
      <TabDescription slug={slug} tabId={tabToKey(tab)} description={getTabDescription(slug, tabToKey(tab))} />

      {tab === "Faculty Queue" && (
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Items requiring faculty action — sorted by days pending</div>
          {PENDING_ATTESTATIONS.sort((a, b) => b.daysPending - a.daysPending).map((p, i) => (
            <div key={i} style={{ ...CARD, borderLeft: `3px solid ${p.daysPending > 10 ? "#ef4444" : "#f59e0b"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{p.competency}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Assigned to {p.waitingOn} · {p.daysPending} days pending</div>
                </div>
                {approved[i] ? (
                  <span style={TAG("green")}>✓ Signed</span>
                ) : (
                  <button onClick={() => setApproved(prev => ({ ...prev, [i]: true }))}
                    style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                    Sign Off
                  </button>
                )}
              </div>
              {approved[i] && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#065f46", background: "#d1fae5", padding: "6px 10px", borderRadius: 6 }}>
                  Competency verified · Appended to student record · Signed by instructor
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "Preceptor Portal" && (
        <div>
          <div style={{ ...CARD, background: "#f0f9ff", borderColor: "#bae6fd" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0369a1", marginBottom: 6 }}>Preceptor Access</div>
            <div style={{ fontSize: 13, color: "#0369a1", lineHeight: 1.6 }}>
              Clinical preceptors submit evaluations via a secure link — no Canvas login required. Their evaluation proposes a competency entry, which routes to the course instructor for final sign-off. The signed record then appends to the student's Vault.
            </div>
          </div>
          <div style={CARD}>
            <div style={LABEL}>Active Preceptors</div>
            <div style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>Prof. Ana Rodrigues — Clinical Coordinator · 3 active students</div>
            <div style={{ fontSize: 13, padding: "6px 0" }}>Dr. Kealani Moku — Course Lead, NSG 201 · 6 active students</div>
          </div>
          <div style={{ ...CARD, borderLeft: "3px solid #f59e0b" }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Noah Ferreira</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Preceptor evaluation requested · Sent to Prof. Ana Rodrigues 5 days ago</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>Reminder scheduled for tomorrow if no response</div>
          </div>
        </div>
      )}

      {tab === "Pending Attestations" && (
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{PENDING_ATTESTATIONS.length} attestations awaiting signature</div>
          {PENDING_ATTESTATIONS.map((p, i) => (
            <div key={i} style={CARD}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{p.competency}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Waiting on {p.waitingOn} · {p.daysPending}d</div>
            </div>
          ))}
        </div>
      )}

      {tab === "Communication Log" && (
        <div>
          {[
            { from: "Dr. Kealani Moku", to: "Jordan Chen record", msg: "Referred to clinical advisor re: hours deficit — 313 hours below minimum with 14 weeks remaining", time: "Today 9:14am", type: "flag" },
            { from: "Prof. Ana Rodrigues", to: "Leilani Akana record", msg: "Excellent clinical performance this week. Recommending early NCLEX eligibility review.", time: "Yesterday 4:22pm", type: "note" },
            { from: "System", to: "Faculty queue", msg: "Reminder: Jordan Chen Competency 3A has been pending 8 days — sign-off overdue", time: "Yesterday 8:00am", type: "alert" },
          ].map((m, i) => (
            <div key={i} style={{ ...CARD, borderLeft: `3px solid ${m.type === "alert" ? "#ef4444" : m.type === "flag" ? "#f59e0b" : "#6366f1"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{m.from}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{m.time}</span>
              </div>
              <div style={{ fontSize: 12, color: "#374151" }}>{m.msg}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>→ {m.to}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Worker 5 — Accreditation & Compliance Worker ──────────────────────────────

function AccreditationCanvas({ slug, schoolData }) {
  const { students: STUDENTS, nclexDomains: NCLEX_DOMAINS, school: SCHOOL } = schoolData;
  const [tab, setTab] = useState("Cohort Dashboard");
  const TABS = ["Cohort Dashboard", "NCLEX Outcomes", "Clinical Hours Report", "ATI Performance", "Accreditation Export"];

  const avgHours = Math.round(STUDENTS.reduce((a, s) => a + s.clinicalHours, 0) / STUDENTS.length);
  const avgATI = Math.round(STUDENTS.reduce((a, s) => a + s.atiScore, 0) / STUDENTS.length);
  const readyCount = STUDENTS.filter(s => s.status === "ready").length;

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onSelect={setTab} />
      <TabDescription slug={slug} tabId={tabToKey(tab)} description={getTabDescription(slug, tabToKey(tab))} />

      {tab === "Cohort Dashboard" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Total Students", value: STUDENTS.length },
              { label: "Avg Clinical Hours", value: `${avgHours}h` },
              { label: "Avg ATI Score", value: `${avgATI}%` },
              { label: "NCLEX Ready", value: readyCount },
            ].map(s => (
              <div key={s.label} style={{ ...CARD, textAlign: "center", marginBottom: 0, padding: "10px 8px" }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={CARD}>
            <div style={LABEL}>Readiness Distribution</div>
            {[
              { label: "Ready for NCLEX", count: STUDENTS.filter(s => s.status === "ready").length, color: "#10b981" },
              { label: "On Track", count: STUDENTS.filter(s => s.status === "on-track").length, color: "#f59e0b" },
              { label: "At Risk", count: STUDENTS.filter(s => s.status === "at-risk").length, color: "#ef4444" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
                <span style={{ fontSize: 13, flex: 1 }}>{r.label}</span>
                <strong style={{ fontSize: 13 }}>{r.count}</strong>
              </div>
            ))}
          </div>

          <div style={{ ...CARD, background: "#f0fdf4", borderColor: "#86efac" }}>
            <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
              <strong>Accreditor note (ACEN Standard 6 — Outcomes):</strong> Program NCLEX pass rate data will be available after first cohort sits the exam. Current readiness indicators are favorable: {readyCount} of {STUDENTS.length} students showing high-readiness signals.
            </div>
          </div>
        </div>
      )}

      {tab === "NCLEX Outcomes" && (
        <div>
          <div style={{ ...CARD, background: "#f5f3ff", borderColor: "#c4b5fd" }}>
            <div style={{ fontSize: 13, color: "#5b21b6" }}>Cohort is pre-graduation. NCLEX outcome data will populate here after the first sitting. These readiness indicators are used by accreditors to evaluate program preparedness.</div>
          </div>
          {NCLEX_DOMAINS.map(d => {
            const color = d.pct >= d.benchmark ? "#10b981" : "#ef4444";
            return (
              <div key={d.domain} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span>{d.domain}</span>
                  <span style={{ color, fontWeight: 600 }}>{d.pct}%</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${d.pct}%`, background: color, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Clinical Hours Report" && (
        <div>
          <div style={LABEL}>Clinical Hours — Program Minimum: 500 hours</div>
          {STUDENTS.map(s => {
            const pct = Math.round((s.clinicalHours / s.clinicalHoursRequired) * 100);
            return (
              <div key={s.id} style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                  <span style={TAG(pct >= 90 ? "green" : pct >= 60 ? "yellow" : "red")}>{pct}%</span>
                </div>
                <HoursBar hours={s.clinicalHours} required={s.clinicalHoursRequired} />
              </div>
            );
          })}
          <div style={{ ...CARD, background: "#f9fafb" }}>
            <div style={{ fontSize: 12, color: "#374151" }}>
              Program average: <strong>{avgHours} hours</strong> · Minimum: 500 · All records are append-only and tamper-evident.
            </div>
          </div>
        </div>
      )}

      {tab === "ATI Performance" && (
        <div>
          <div style={LABEL}>ATI Fundamentals Scores by Student</div>
          {STUDENTS.sort((a, b) => b.atiScore - a.atiScore).map(s => (
            <div key={s.id} style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                <span style={{ fontWeight: 700, color: s.atiScore >= 80 ? "#065f46" : s.atiScore >= 70 ? "#92400e" : "#991b1b" }}>{s.atiScore}%</span>
              </div>
              <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.atiScore}%`, background: s.atiScore >= 80 ? "#10b981" : s.atiScore >= 70 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
              </div>
            </div>
          ))}
          <div style={{ ...CARD, background: "#f9fafb" }}>
            <div style={{ fontSize: 12, color: "#374151" }}>Cohort average: <strong>{avgATI}%</strong> · Benchmark: 70% · {STUDENTS.filter(s => s.atiScore < 70).length} below benchmark</div>
          </div>
        </div>
      )}

      {tab === "Accreditation Export" && (
        <div>
          <div style={{ ...CARD, background: "#f0f9ff", borderColor: "#bae6fd" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0369a1", marginBottom: 6 }}>ACEN Audit Package</div>
            <div style={{ fontSize: 13, color: "#0369a1", lineHeight: 1.6 }}>
              For an ACEN site visit: pull the full audit package in seconds. All records are append-only with digital signatures and timestamps — no manual compilation from spreadsheets or email.
            </div>
          </div>
          {[
            { label: "ACEN Standard 4 — Curriculum", desc: "Course completion records, module progress, OER content attribution", ready: true },
            { label: "ACEN Standard 5 — Resources", desc: "ATI integration evidence, faculty credentials, clinical placement records", ready: true },
            { label: "ACEN Standard 6 — Outcomes", desc: "Clinical hours by student, competency attainments, readiness indicators (NCLEX data post-graduation)", ready: false, note: "Pre-graduation cohort — NCLEX data pending" },
          ].map(s => (
            <div key={s.label} style={{ ...CARD, borderLeft: `3px solid ${s.ready ? "#10b981" : "#f59e0b"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.desc}</div>
                  {s.note && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, fontStyle: "italic" }}>{s.note}</div>}
                </div>
                <button style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: s.ready ? "#f0fdf4" : "#f9fafb", cursor: s.ready ? "pointer" : "default", color: s.ready ? "#166534" : "#9ca3af", whiteSpace: "nowrap" }}>
                  {s.ready ? "Export PDF" : "Not yet ready"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

const WORKER_CANVAS = {
  "nursing-records-001":        RecordsCanvas,
  "nursing-courses-001":        CoursesCanvas,
  "nursing-tutor-001":          TutorCanvas,
  "nursing-comms-001":          CommsCanvas,
  "nursing-accreditation-001":  AccreditationCanvas,
  "uh-nursing-records-001":     RecordsCanvas,
  "uh-nursing-courses-001":     CoursesCanvas,
  "uh-nursing-tutor-001":       TutorCanvas,
  "uh-nursing-comms-001":       CommsCanvas,
  "uh-nursing-accreditation-001": AccreditationCanvas,
};

export default function NursingWorkerCanvas({ worker }) {
  const slug = worker?.workerId || worker?.slug || "";
  const Canvas = WORKER_CANVAS[slug];
  const schoolData = getSchoolData(slug);

  if (!Canvas) return (
    <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
      Nursing worker canvas not found for slug: {slug}
    </div>
  );

  return (
    <div style={{ padding: "12px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {schoolData.school.name} · {schoolData.school.program}
        </div>
      </div>
      <DemoBanner />
      <Canvas slug={slug} schoolData={schoolData} />
    </div>
  );
}
