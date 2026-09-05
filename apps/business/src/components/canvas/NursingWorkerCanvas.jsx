// NursingWorkerCanvas — Makai School of Nursing · Clinical Programs Suite
// Trump Rule: cohort overview first — big picture before individual drill-down.
// All 5 workers share this canvas; the active tab set switches by worker slug.

import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import TabDescription from "./TabDescription";
import { getTabDescription } from "./workerTabDescriptions";

const tabToKey = (t) => t.toLowerCase().replace(/ /g, "-");

// 2026-08-21 gap-audit fix — POST helper for "+ Add Student".
const NURSING_API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
async function addStudent(payload) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("TENANT_ID") : null;
  const res = await fetch(`${NURSING_API_BASE}/api?path=${encodeURIComponent("/v1/education:student:add")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId && tenantId !== "vault" ? { "X-Tenant-Id": tenantId } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || json.message || `Request failed (${res.status})`);
  return json;
}

// ─────────────────────────────────────────────────────────────────────────
// AddStudentModal — 2026-08-21 gap-audit fix. Calls POST
// /v1/education:student:add (capability education.create_student_v1),
// writing to tenants/{tenantId}/nursingStudents. Visual pattern matches
// Contacts.jsx's ManualAddModal (purple-gradient primary button, white
// card shell). Note: the Cohort Overview list above is fixture data seeded
// per-demo-school (schoolData prop) — the new record is real and
// persisted, but won't retroactively appear in that fixture list.
// ─────────────────────────────────────────────────────────────────────────
function AddStudentModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: "", email: "", status: "on-track", clinicalHoursRequired: "500" });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.name.trim();

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      const j = await addStudent({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        status: form.status,
        clinicalHoursRequired: form.clinicalHoursRequired ? Number(form.clinicalHoursRequired) : undefined,
      });
      setStatus({ state: "done", studentId: j.studentId });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Add a student</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Enrolls a new student record for this cohort.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Full name *</label><input style={fieldStyle} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Email</label><input type="email" style={fieldStyle} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="optional" /></div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={fieldStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="on-track">On track</option>
              <option value="at-risk">At risk</option>
              <option value="ready">Ready</option>
            </select>
          </div>
          <div><label style={labelStyle}>Clinical hours required</label><input type="number" style={fieldStyle} value={form.clinicalHoursRequired} onChange={(e) => set("clinicalHoursRequired", e.target.value)} /></div>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Student added. Student ID: {status.studentId}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onAdded} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Adding…" : "Add student"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Slug registry ─────────────────────────────────────────────────────────────

const NURSING_SLUGS = new Set([
  "nursing-education-001",        // Hannah — Clearwater Clinical Evaluation
  "nursing-micro-001",            // Morgan — Microbiology Tutor
  "nursing-ob-001",               // Clara — OB/Maternity Tutor
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

// ── University of Hawaiʻi Maui College data ───────────────────────────────────

const UH_SCHOOL = {
  name: "UH Maui College · Allied Health Department",
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
  const [showAddStudent, setShowAddStudent] = useState(false);
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
          {/* 2026-08-21 gap-audit fix — prominent "+ Add Student" button,
              matching Contacts.jsx's "+ Add Contacts" purple-gradient pattern. */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setShowAddStudent(true)}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              + Add Student
            </button>
          </div>
          {showAddStudent && (
            <AddStudentModal onClose={() => setShowAddStudent(false)} onAdded={() => setShowAddStudent(false)} />
          )}
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

// ── Worker: Morgan — Microbiology Tutor ──────────────────────────────────────

const MICRO_CHAPTERS = [
  { num: "Ch 1", title: "Intro to Microbiology", topics: ["Prokaryote vs Eukaryote", "Domains of Life", "Scope of Micro"], loaded: true },
  { num: "Ch 3", title: "Cell Structure", topics: ["Cell wall", "Gram stain basis", "Flagella & pili", "Endospores"], loaded: true },
  { num: "Ch 8–9", title: "Microbial Metabolism & Genetics", topics: ["Pathogenicity mechanisms", "Virulence factors", "Gene transfer"], loaded: true },
  { num: "Ch 11, 15", title: "Disease Mechanisms", topics: ["Host defenses", "Nosocomial infections", "Chain of infection"], loaded: true },
  { num: "Ch 17–18", title: "Antimicrobial Drugs & Lab ID", topics: ["Drug classes & MOA", "Resistance mechanisms", "Culture & sensitivity"], loaded: true },
  { num: "Ch 14, 21–24", title: "Immunity + Clinical Syndromes", topics: ["Innate & adaptive immunity", "Respiratory", "GI", "UTI", "Wound", "CNS infections"], loaded: true },
];

const GRAM_STAIN_BUGS = [
  { gram: "+", shape: "Cocci clusters", organism: "S. aureus", diseases: "Skin infections, pneumonia, endocarditis, food poisoning", drug: "Nafcillin / Vancomycin (MRSA)" },
  { gram: "+", shape: "Cocci chains", organism: "S. pyogenes (GAS)", diseases: "Strep throat, rheumatic fever, cellulitis, necrotizing fasciitis", drug: "Penicillin G" },
  { gram: "+", shape: "Cocci pairs", organism: "S. pneumoniae", diseases: "Pneumonia, meningitis, otitis media", drug: "Penicillin / Vancomycin (resistant)" },
  { gram: "+", shape: "Rods (spores)", organism: "C. difficile", diseases: "Pseudomembranous colitis (post-antibiotic)", drug: "Vancomycin (PO) / Fidaxomicin" },
  { gram: "+", shape: "Rods (spores)", organism: "B. anthracis", diseases: "Anthrax — cutaneous/inhalation", drug: "Ciprofloxacin / Penicillin" },
  { gram: "–", shape: "Diplococci", organism: "N. gonorrhoeae", diseases: "Gonorrhea, PID, neonatal conjunctivitis", drug: "Ceftriaxone + Azithromycin" },
  { gram: "–", shape: "Diplococci", organism: "N. meningitidis", diseases: "Bacterial meningitis, septicemia", drug: "Penicillin G / Ceftriaxone" },
  { gram: "–", shape: "Rods (enteric)", organism: "E. coli", diseases: "UTI, neonatal meningitis, traveler's diarrhea, HUS", drug: "TMP-SMX / Ceftriaxone (serious)" },
  { gram: "–", shape: "Rods (enteric)", organism: "Salmonella", diseases: "Gastroenteritis, typhoid fever, osteomyelitis (sickle cell)", drug: "Ciprofloxacin / Ceftriaxone" },
  { gram: "–", shape: "Rods (enteric)", organism: "Klebsiella", diseases: "Pneumonia (alcoholics), UTI, hospital infections", drug: "Carbapenems (ESBL strains)" },
  { gram: "–", shape: "Rods (respiratory)", organism: "H. influenzae", diseases: "Epiglottitis, otitis media, meningitis", drug: "Amoxicillin-clavulanate / Ceftriaxone" },
  { gram: "–", shape: "Curved rods", organism: "H. pylori", diseases: "Peptic ulcer disease, gastric cancer", drug: "Triple therapy: PPI + Clarithro + Amox" },
  { gram: "Atypical", shape: "No cell wall", organism: "Mycoplasma pneumoniae", diseases: "Walking pneumonia (young adults)", drug: "Azithromycin / Doxycycline" },
  { gram: "Atypical", shape: "Obligate intracellular", organism: "Chlamydia trachomatis", diseases: "Chlamydia, PID, neonatal eye/lung infections", drug: "Azithromycin / Doxycycline" },
];

const ANTIBIOTIC_CLASSES = [
  { cls: "Penicillins", moa: "Inhibit cell wall synthesis (PBP binding)", examples: "Amoxicillin, Nafcillin, Piperacillin-tazobactam", coverage: "Gram + (expanded spectrum with β-lactamase inhibitor)", nursing: "Ask about penicillin allergy; assess for rash/anaphylaxis; give with food" },
  { cls: "Cephalosporins", moa: "Inhibit cell wall synthesis (β-lactam ring)", examples: "Cephalexin (1st), Cefuroxime (2nd), Ceftriaxone (3rd), Cefepime (4th)", coverage: "1st→4th: progressive Gram– coverage; 3rd/4th cross BBB", nursing: "10% cross-reactivity with PCN allergy; monitor renal function; IM ceftriaxone is painful" },
  { cls: "Vancomycin", moa: "Inhibits cell wall — binds D-Ala-D-Ala (different from β-lactams)", examples: "Vancomycin IV", coverage: "Gram + only (MRSA, C. diff PO)", nursing: "Red Man Syndrome — slow the infusion; trough monitoring; nephrotoxic" },
  { cls: "Fluoroquinolones", moa: "Inhibit DNA gyrase (topoisomerase II/IV)", examples: "Ciprofloxacin, Levofloxacin, Moxifloxacin", coverage: "Broad Gram– + atypicals; Cipro = UTI/GI; Levo/Moxi = respiratory", nursing: "Tendon rupture risk; avoid in pregnancy; antacids block absorption; photosensitivity" },
  { cls: "Macrolides", moa: "Inhibit 50S ribosomal subunit → block translocation", examples: "Azithromycin (Z-pack), Erythromycin, Clarithromycin", coverage: "Atypicals (Mycoplasma, Chlamydia, Legionella), strep, some Gram–", nursing: "GI upset common; QT prolongation — avoid with other QT drugs; hepatotoxic (Erythro)" },
  { cls: "Tetracyclines", moa: "Inhibit 30S ribosomal subunit → block aminoacyl-tRNA binding", examples: "Doxycycline, Minocycline", coverage: "Atypicals, Rickettsiales, Borrelia, H. pylori combo", nursing: "No dairy/antacids (chelation); photosensitivity; contraindicated in pregnancy + children <8" },
  { cls: "Aminoglycosides", moa: "Bind 30S ribosome → misreading of mRNA → bactericidal", examples: "Gentamicin, Tobramycin, Amikacin", coverage: "Gram– aerobes; synergy with β-lactams for Gram+", nursing: "NEPHROTOXIC + OTOTOXIC — trough/peak monitoring mandatory; hydration critical" },
  { cls: "Carbapenems", moa: "Broadest β-lactam; inhibit PBPs; stable to most β-lactamases", examples: "Meropenem, Imipenem-cilastatin, Ertapenem", coverage: "\"Last resort\" Gram– including ESBL/Pseudomonas", nursing: "Reserve for MDR organisms; seizure risk (Imipenem > others); C. diff risk" },
];

const MICRO_QUIZ = {
  Novice: [
    { q: "A Gram stain shows purple spherical clusters. What organism family is most likely?", options: ["Gram-positive cocci", "Gram-negative rods", "Spirochetes", "Atypical organisms"], correct: 0 },
    { q: "Which precaution type is used for TB (Mycobacterium tuberculosis)?", options: ["Contact", "Droplet", "Airborne", "Standard"], correct: 2 },
    { q: "A patient develops watery diarrhea after a 10-day course of clindamycin. Which organism is most likely?", options: ["E. coli O157:H7", "Salmonella enterica", "Clostridioides difficile", "Norovirus"], correct: 2 },
  ],
  Proficient: [
    { q: "A patient with a penicillin allergy and gram-positive bacteremia needs IV coverage. Which is FIRST-line?", options: ["Ceftriaxone", "Vancomycin", "Azithromycin", "Ciprofloxacin"], correct: 1 },
    { q: "A 22-year-old presents with fever, petechial rash, and nuchal rigidity. CSF shows Gram-negative diplococci. What is the PRIORITY nursing action?", options: ["Draw blood cultures and administer ceftriaxone STAT", "Place in droplet precautions and notify infection control", "Administer acetaminophen for fever first", "Perform lumbar puncture before any antibiotics"], correct: 0 },
    { q: "Which antibiotic class works by inhibiting cell wall synthesis through a mechanism DIFFERENT from β-lactams?", options: ["Cephalosporins", "Carbapenems", "Vancomycin", "Penicillins"], correct: 2 },
  ],
};

function MicroCanvas() {
  const [tab, setTab] = useState("Course Map");
  const [gramFilter, setGramFilter] = useState("All");
  const [quizLevel, setQuizLevel] = useState("Novice");
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const TABS = ["Course Map", "Quick Reference", "Antibiotic Guide", "Quiz Zone"];

  const filteredBugs = gramFilter === "All" ? GRAM_STAIN_BUGS
    : gramFilter === "+" ? GRAM_STAIN_BUGS.filter(b => b.gram === "+")
    : gramFilter === "–" ? GRAM_STAIN_BUGS.filter(b => b.gram === "–")
    : GRAM_STAIN_BUGS.filter(b => b.gram === "Atypical");

  const questions = MICRO_QUIZ[quizLevel] || MICRO_QUIZ.Novice;
  const q = questions[quizIdx % questions.length];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "12px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
        Makai School of Nursing · Microbiology
      </div>
      <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
        <strong>Morgan</strong> — AI Microbiology Tutor · Powered by OpenStax Microbiology 2e (CC BY 4.0)
      </div>
      <TabBar tabs={TABS} active={tab} onSelect={t => { setTab(t); setSelected(null); setRevealed(false); }} />

      {tab === "Course Map" && (
        <div>
          <div style={{ ...CARD, background: "#f0f9ff", borderColor: "#bae6fd", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#0369a1" }}>
              <strong>6 chapter groups loaded</strong> into Morgan's Studio Locker — 174k characters of OpenStax Microbiology 2e. Morgan can discuss, explain, or quiz on any of these topics.
            </div>
          </div>
          {MICRO_CHAPTERS.map((ch, i) => (
            <div key={i} style={{ ...CARD, borderLeft: `3px solid ${ch.loaded ? "#6366f1" : "#e5e7eb"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "#ede9fe", padding: "2px 7px", borderRadius: 10, marginRight: 8 }}>{ch.num}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{ch.title}</span>
                </div>
                <span style={{ ...TAG("green"), fontSize: 10 }}>Loaded</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {ch.topics.map(t => (
                  <span key={t} style={{ fontSize: 10, background: "#f3f4f6", color: "#374151", padding: "2px 7px", borderRadius: 10 }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ ...CARD, background: "#f5f3ff", borderColor: "#c4b5fd" }}>
            <div style={{ fontSize: 11, color: "#5b21b6" }}>
              Ask Morgan to quiz you on any chapter, explain a concept, or connect a pathogen to its clinical presentation — Socratic method enforced.
            </div>
          </div>
        </div>
      )}

      {tab === "Quick Reference" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Filter:</span>
            {["All", "+", "–", "Atypical"].map(f => (
              <button key={f} onClick={() => setGramFilter(f)} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 12,
                background: gramFilter === f ? "#6366f1" : "#f3f4f6",
                color: gramFilter === f ? "#fff" : "#374151",
                border: "none", cursor: "pointer", fontWeight: gramFilter === f ? 600 : 400,
              }}>
                {f === "+" ? "Gram +" : f === "–" ? "Gram –" : f}
              </button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Gram", "Shape", "Organism", "Key Diseases", "Drug of Choice"].map(h => (
                    <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBugs.map((b, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "6px 8px" }}>
                      <span style={{
                        fontWeight: 700, fontSize: 12,
                        color: b.gram === "+" ? "#7c3aed" : b.gram === "–" ? "#dc2626" : "#92400e",
                        background: b.gram === "+" ? "#ede9fe" : b.gram === "–" ? "#fee2e2" : "#fef3c7",
                        padding: "2px 6px", borderRadius: 6,
                      }}>{b.gram}</span>
                    </td>
                    <td style={{ padding: "6px 8px", color: "#6b7280", whiteSpace: "nowrap" }}>{b.shape}</td>
                    <td style={{ padding: "6px 8px", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>{b.organism}</td>
                    <td style={{ padding: "6px 8px", color: "#374151", lineHeight: 1.4 }}>{b.diseases}</td>
                    <td style={{ padding: "6px 8px", color: "#065f46", fontWeight: 500 }}>{b.drug}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...CARD, background: "#f0fdf4", borderColor: "#86efac", marginTop: 10 }}>
            <div style={{ fontSize: 11, color: "#166534" }}>
              <strong>Isolation Precautions cheat:</strong> Airborne = TB, measles, varicella (N95 + negative pressure). Droplet = meningitis, flu, pertussis (surgical mask). Contact = C. diff, MRSA, VRE (gown + gloves).
            </div>
          </div>
        </div>
      )}

      {tab === "Antibiotic Guide" && (
        <div>
          {ANTIBIOTIC_CLASSES.map((ab, i) => (
            <div key={i} style={{ ...CARD, cursor: "pointer", borderLeft: "3px solid #6366f1" }}
              onClick={() => setSelected(selected === i ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{ab.cls}</div>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{selected === i ? "▲" : "▼"}</span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{ab.examples}</div>
              {selected === i && (
                <div style={{ marginTop: 10, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
                  <div style={{ marginBottom: 6 }}>
                    <div style={LABEL}>Mechanism</div>
                    <div style={{ fontSize: 12 }}>{ab.moa}</div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <div style={LABEL}>Coverage</div>
                    <div style={{ fontSize: 12 }}>{ab.coverage}</div>
                  </div>
                  <div style={{ background: "#fef3c7", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Nursing Considerations</div>
                    <div style={{ fontSize: 12, color: "#78350f" }}>{ab.nursing}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "Quiz Zone" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Level:</span>
            {["Novice", "Proficient"].map(l => (
              <button key={l} onClick={() => { setQuizLevel(l); setQuizIdx(0); setSelected(null); setRevealed(false); }} style={{
                fontSize: 11, padding: "4px 12px", borderRadius: 12,
                background: quizLevel === l ? "#6366f1" : "#f3f4f6",
                color: quizLevel === l ? "#fff" : "#374151",
                border: "none", cursor: "pointer", fontWeight: quizLevel === l ? 600 : 400,
              }}>{l}</button>
            ))}
          </div>
          <div style={{ ...CARD, borderLeft: "3px solid #6366f1" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Question {(quizIdx % questions.length) + 1} of {questions.length} · {quizLevel}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.5, marginBottom: 14 }}>{q.q}</div>
            {q.options.map((opt, i) => {
              let bg = "#f9fafb", border = "1px solid #e5e7eb", color = "#374151";
              if (revealed) {
                if (i === q.correct) { bg = "#d1fae5"; border = "1px solid #6ee7b7"; color = "#065f46"; }
                else if (i === selected) { bg = "#fee2e2"; border = "1px solid #fca5a5"; color = "#991b1b"; }
              } else if (i === selected) { bg = "#ede9fe"; border = "1px solid #a78bfa"; color = "#5b21b6"; }
              return (
                <div key={i}
                  onClick={() => { if (!revealed) setSelected(i); }}
                  style={{ padding: "10px 12px", borderRadius: 8, border, background: bg, color, cursor: revealed ? "default" : "pointer", marginBottom: 6, fontSize: 13 }}>
                  {["A", "B", "C", "D"][i]}. {opt}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {!revealed ? (
                <button onClick={() => { if (selected !== null) setRevealed(true); }}
                  disabled={selected === null}
                  style={{ flex: 1, padding: "9px", background: selected !== null ? "#6366f1" : "#e5e7eb", color: selected !== null ? "#fff" : "#9ca3af", border: "none", borderRadius: 7, fontWeight: 600, cursor: selected !== null ? "pointer" : "default" }}>
                  Check Answer
                </button>
              ) : (
                <>
                  <div style={{ flex: 1, fontSize: 12, color: selected === q.correct ? "#065f46" : "#991b1b", fontWeight: 600, padding: "9px 0" }}>
                    {selected === q.correct ? "✓ Correct!" : `✗ Correct answer: ${["A", "B", "C", "D"][q.correct]}`}
                  </div>
                  <button onClick={() => { setQuizIdx(i => i + 1); setSelected(null); setRevealed(false); }}
                    style={{ padding: "9px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer" }}>
                    Next →
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={{ ...CARD, background: "#f5f3ff", borderColor: "#c4b5fd", marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#5b21b6" }}>
              Ask Morgan in chat to quiz you at Expert or Developing level, or to explain the reasoning behind any answer.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Worker: Clara — OB/Maternity Tutor ───────────────────────────────────────

const OB_COURSE_MAP = [
  {
    phase: "Antepartum",
    color: "#d1fae5", border: "#6ee7b7", text: "#065f46",
    topics: [
      { name: "Reproductive Anatomy & Physiology", detail: "Fertilization, implantation, placental function, fetal circulation" },
      { name: "Prenatal Assessment", detail: "Naegele's rule, McDonald's rule, fundal height, Leopold's maneuvers, biophysical profile" },
      { name: "OB Complications", detail: "Preeclampsia, HELLP syndrome, GDM, placenta previa, placental abruption, ectopic pregnancy" },
      { name: "Medication Safety", detail: "MgSO4 toxicity monitoring, betamethasone, RhoGAM, oxytocin" },
    ],
  },
  {
    phase: "Intrapartum",
    color: "#ddd6fe", border: "#a78bfa", text: "#4c1d95",
    topics: [
      { name: "Stages of Labor", detail: "Latent / active / transition / pushing / placental delivery — time landmarks and nursing actions" },
      { name: "Fetal Heart Rate Monitoring", detail: "Baseline, variability, accelerations, early/late/variable/prolonged decelerations" },
      { name: "SBAR for OB Emergencies", detail: "Shoulder dystocia (McRoberts + suprapubic), prolapsed cord, uterine rupture, amniotic fluid embolism" },
      { name: "Pain Management", detail: "Epidural administration, nursing monitoring, non-pharmacologic alternatives" },
    ],
  },
  {
    phase: "Postpartum",
    color: "#fef3c7", border: "#fde68a", text: "#78350f",
    topics: [
      { name: "BUBBLE-HE Assessment", detail: "Breasts, Uterus, Bowel, Bladder, Lochia, Episiotomy/incision, Homans' sign (DVT), Emotional" },
      { name: "Postpartum Complications", detail: "PPH (uterine atony #1 cause), postpartum infection, postpartum depression, mastitis" },
      { name: "Medication Management", detail: "Oxytocin, methergine, misoprostol, carboprost, fundal massage indications" },
      { name: "Patient Education", detail: "Breastfeeding, contraception, lochia progression, when to call provider" },
    ],
  },
  {
    phase: "Neonatal",
    color: "#fee2e2", border: "#fca5a5", text: "#7f1d1d",
    topics: [
      { name: "APGAR Scoring", detail: "Appearance, Pulse, Grimace, Activity, Respiration — 0-2 each; score 7-10 normal, <7 needs intervention" },
      { name: "Newborn Reflexes", detail: "Moro, rooting, sucking, Babinski, palmar/plantar grasp — abnormal if absent" },
      { name: "Thermoregulation", detail: "Neutral thermal environment, non-shivering thermogenesis (brown fat), kangaroo care" },
      { name: "Jaundice", detail: "Physiologic vs pathologic, bilirubin levels, phototherapy nursing care, breastfeeding jaundice" },
    ],
  },
];

const APGAR_ROWS = [
  { sign: "Appearance (color)", score0: "Blue/pale all over", score1: "Blue extremities, pink body", score2: "Pink all over" },
  { sign: "Pulse (HR)", score0: "Absent", score1: "<100 bpm", score2: "≥100 bpm" },
  { sign: "Grimace (reflex)", score0: "No response to stimulation", score1: "Grimace", score2: "Cry/cough/sneeze" },
  { sign: "Activity (tone)", score0: "Limp", score1: "Some flexion", score2: "Active motion" },
  { sign: "Respiration", score0: "Absent", score1: "Weak/irregular", score2: "Strong cry" },
];

const FHR_PATTERNS = [
  { pattern: "Early Decelerations", timing: "Mirror contraction (start + end together)", cause: "Head compression (benign)", action: "Document; no intervention required", severity: "green" },
  { pattern: "Late Decelerations", timing: "After peak of contraction (ominous)", cause: "Uteroplacental insufficiency", action: "Lateral position, O₂, IV fluid, stop oxytocin, NOTIFY MD STAT", severity: "red" },
  { pattern: "Variable Decelerations", timing: "Abrupt onset, V-shaped", cause: "Cord compression", action: "Change position (knee-chest); if persistent → amnioinfusion, notify MD", severity: "yellow" },
  { pattern: "Prolonged Deceleration", timing: ">2 min, <10 min", cause: "Cord prolapse, maternal hypotension, placental abruption", action: "Emergency response — call provider IMMEDIATELY; prepare for delivery", severity: "red" },
  { pattern: "Acceleration (reassuring)", timing: "≥15 bpm for ≥15 sec (term)", cause: "Fetal movement — sign of well-being", action: "Document; reactive NST = reassuring", severity: "green" },
];

const OB_EMERGENCIES = [
  {
    name: "Preeclampsia / HELLP",
    criteria: "BP ≥140/90 on 2 occasions 4h apart, after 20 weeks + proteinuria OR end-organ damage",
    hellp: "H = Hemolysis, EL = Elevated Liver enzymes, LP = Low Platelets",
    nursing: ["Seizure precautions — pad bed, dim lights, quiet environment", "MgSO4 infusion: 4-6g loading over 15-20min, then 1-2g/hr", "Monitor reflexes, respiratory rate (≥12), UO (≥25mL/hr) — antidote = Calcium gluconate", "Antihypertensives: Hydralazine, Labetalol, Nifedipine — goal BP <160/110"],
    color: "#dc2626",
  },
  {
    name: "Postpartum Hemorrhage (PPH)",
    criteria: "Blood loss >500mL (vaginal delivery) or >1000mL (C-section) within 24h",
    causes: "4 T's: Tone (uterine atony #1 = 80%), Trauma, Tissue (retained placenta), Thrombin (coagulopathy)",
    nursing: ["Fundal massage — firm, circular motion at umbilicus", "Oxytocin 10-40 units in 1L NS IV infusion (first line)", "Methergine 0.2mg IM if uterus boggy (CONTRAINDICATED in hypertension)", "Carboprost 0.25mg IM q15-90min (asthma contraindication); Misoprostol rectal backup", "Position — elevate legs, keep warm; two large-bore IVs, type & screen"],
    color: "#d97706",
  },
  {
    name: "Shoulder Dystocia",
    criteria: "Fetal head delivered but shoulders impacted above symphysis pubis — obstetric emergency",
    mnemonic: "HELPERR: H=Call for Help, E=Episiotomy, L=Legs (McRoberts), P=Suprapubic Pressure, E=Enter (rotational maneuvers), R=Remove posterior arm, R=Roll (all-fours)",
    nursing: ["McRoberts maneuver FIRST: flex thighs sharply onto abdomen (flattens lumbar lordosis)", "Suprapubic pressure (NOT fundal pressure) — disimpact anterior shoulder", "NEVER apply fundal pressure — worsens impaction", "Document time of head delivery — time to delivery of shoulders is critical"],
    color: "#7c3aed",
  },
  {
    name: "Prolapsed Umbilical Cord",
    criteria: "Cord falls through cervix before presenting fetal part — cord compression = fetal hypoxia",
    nursing: ["PRIORITY: relieve cord compression IMMEDIATELY", "Nurse's gloved hand: push presenting part off cord in vagina", "Knee-chest or Trendelenburg position to use gravity", "Apply moist warm saline dressings if cord is external", "Prepare for emergency C-section — this is a category I fetal bradycardia"],
    color: "#dc2626",
  },
];

const OB_QUIZ = {
  Novice: [
    { q: "When assessing postpartum uterine involution, the nurse finds the fundus 3 cm above the umbilicus and deviated to the right. What is the PRIORITY action?", options: ["Document as normal for post-delivery", "Assist the patient to empty her bladder", "Administer oxytocin as prescribed", "Notify the healthcare provider immediately"], correct: 1 },
    { q: "A newborn's APGAR score at 5 minutes is 8. How should the nurse interpret this?", options: ["Severe distress — initiate resuscitation", "Moderate distress — provide supplemental O₂", "Mild distress — provide stimulation and reassess", "Normal — routine newborn care"], correct: 3 },
    { q: "Which finding in BUBBLE-HE assessment indicates a COMPLICATION requiring provider notification?", options: ["Lochia rubra on postpartum day 1", "Fundus firm at umbilicus", "Calf pain with dorsiflexion", "Moderate breast engorgement"], correct: 2 },
  ],
  Proficient: [
    { q: "A patient at 38 weeks presents with BP 158/105, severe headache, RUQ pain, and platelets of 85,000. The nurse anticipates which diagnosis and PRIORITY intervention?", options: ["Gestational hypertension — oral antihypertensive", "HELLP syndrome — MgSO4 and prepare for delivery", "Preeclampsia without severe features — bed rest", "Normal lab variation — reassure patient"], correct: 1 },
    { q: "During oxytocin augmentation, the nurse notes late decelerations with moderate variability. The FIRST nursing action is:", options: ["Increase IV fluid rate to 125mL/hr", "Apply O₂ via face mask at 8-10L/min", "Discontinue the oxytocin infusion and reposition", "Notify the provider before doing anything"], correct: 2 },
    { q: "A patient develops uterine atony after delivery. Fundal massage is performed and oxytocin is infusing. Which medication would be CONTRAINDICATED if her BP is 168/104?", options: ["Carboprost (Hemabate)", "Misoprostol (Cytotec) rectal", "Methergine (methylergonovine)", "Dinoprostone suppository"], correct: 2 },
  ],
};

function OBCanvas() {
  const [tab, setTab] = useState("Course Map");
  const [expanded, setExpanded] = useState(null);
  const [quizLevel, setQuizLevel] = useState("Novice");
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const TABS = ["Course Map", "Quick Reference", "OB Emergencies", "Quiz Zone"];

  const questions = OB_QUIZ[quizLevel] || OB_QUIZ.Novice;
  const q = questions[quizIdx % questions.length];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "12px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
        Makai School of Nursing · Obstetrics & Maternity
      </div>
      <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
        <strong>Clara</strong> — AI OB/Maternity Tutor · OpenStax A&P + StatPearls + ACOG Guidelines
      </div>
      <TabBar tabs={TABS} active={tab} onSelect={t => { setTab(t); setExpanded(null); setSelected(null); setRevealed(false); }} />

      {tab === "Course Map" && (
        <div>
          {OB_COURSE_MAP.map((phase, pi) => (
            <div key={pi} style={{ marginBottom: 10 }}>
              <div style={{ ...CARD, background: phase.color, borderColor: phase.border, borderLeft: `4px solid ${phase.border}`, marginBottom: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: phase.text, marginBottom: 8, letterSpacing: "0.04em" }}>
                  {["1️⃣", "2️⃣", "3️⃣", "4️⃣"][pi]} {phase.phase}
                </div>
                {phase.topics.map((t, ti) => (
                  <div key={ti} style={{ marginBottom: 6, cursor: "pointer" }}
                    onClick={() => setExpanded(expanded === `${pi}-${ti}` ? null : `${pi}-${ti}`)}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: phase.text }}>{t.name} {expanded === `${pi}-${ti}` ? "▲" : "▼"}</div>
                    {expanded === `${pi}-${ti}` && (
                      <div style={{ fontSize: 11, color: phase.text, marginTop: 3, opacity: 0.85, lineHeight: 1.5 }}>{t.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Quick Reference" && (
        <div>
          <div style={{ ...CARD, background: "#f5f3ff", borderColor: "#c4b5fd", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#5b21b6", marginBottom: 6 }}>BUBBLE-HE Postpartum Assessment</div>
            {[
              { letter: "B", full: "Breasts", check: "Engorgement, nipple integrity, milk production; colostrum days 1-3" },
              { letter: "U", full: "Uterus", check: "Firm, midline; 1 cm below umbilicus/day; boggy = massage + notify" },
              { letter: "B", full: "Bowel", check: "Bowel sounds, first BM usually day 2-3; stool softeners routine" },
              { letter: "B", full: "Bladder", check: "Void q4-6h; ≥300mL; distension → fundal deviation (classic NCLEX!)" },
              { letter: "L", full: "Lochia", check: "Rubra (days 1-3) → serosa (days 4-10) → alba (days 11-21); clots >golf ball = report" },
              { letter: "E", full: "Episiotomy/Incision", check: "REEDA: Redness, Edema, Ecchymosis, Discharge, Approximation" },
              { letter: "H", full: "Homans' Sign", check: "Calf pain with dorsiflexion = DVT until proven otherwise → notify MD" },
              { letter: "E", full: "Emotional", check: "Baby blues vs postpartum depression vs psychosis — Edinburgh screening" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: i < 7 ? "1px solid #e9d5ff" : "none" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.letter}</div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4c1d95" }}>{item.full}: </span>
                  <span style={{ fontSize: 11, color: "#5b21b6" }}>{item.check}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={CARD}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>APGAR Score (1 & 5 min)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Sign", "0", "1", "2"].map(h => <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {APGAR_ROWS.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "5px 8px", fontWeight: 500 }}>{r.sign}</td>
                    <td style={{ padding: "5px 8px", color: "#dc2626" }}>{r.score0}</td>
                    <td style={{ padding: "5px 8px", color: "#d97706" }}>{r.score1}</td>
                    <td style={{ padding: "5px 8px", color: "#065f46" }}>{r.score2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>Score 7-10 = Normal · 4-6 = Some concern · &lt;4 = Intervention needed</div>
          </div>

          <div style={CARD}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Fetal Heart Rate Patterns</div>
            {FHR_PATTERNS.map((p, i) => (
              <div key={i} style={{ padding: "7px 0", borderBottom: i < FHR_PATTERNS.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.severity === "green" ? "#10b981" : p.severity === "red" ? "#ef4444" : "#f59e0b" }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{p.pattern}</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginLeft: 16, marginBottom: 2 }}><strong>Cause:</strong> {p.cause}</div>
                <div style={{ fontSize: 11, color: p.severity === "red" ? "#dc2626" : "#374151", marginLeft: 16, fontWeight: p.severity === "red" ? 600 : 400 }}><strong>Action:</strong> {p.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "OB Emergencies" && (
        <div>
          <div style={{ ...CARD, background: "#fff7ed", borderColor: "#fed7aa", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#9a3412" }}>
              <strong>NCLEX priority:</strong> OB emergencies test nursing decision-making under pressure. Know the sequence: ASSESS → POSITION → NOTIFY → MEDICATE. Position often comes before calling the provider.
            </div>
          </div>
          {OB_EMERGENCIES.map((em, i) => (
            <div key={i} style={{ ...CARD, borderLeft: `4px solid ${em.color}`, cursor: "pointer" }}
              onClick={() => setExpanded(expanded === i ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: em.color }}>{em.name}</div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{expanded === i ? "▲ collapse" : "▼ expand"}</span>
              </div>
              {em.criteria && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{em.criteria}</div>}
              {expanded === i && (
                <div style={{ marginTop: 10, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
                  {em.hellp && (
                    <div style={{ background: "#fee2e2", borderRadius: 6, padding: "7px 10px", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#7f1d1d", marginBottom: 2 }}>HELLP</div>
                      <div style={{ fontSize: 12, color: "#991b1b" }}>{em.hellp}</div>
                    </div>
                  )}
                  {em.mnemonic && (
                    <div style={{ background: "#ede9fe", borderRadius: 6, padding: "7px 10px", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#4c1d95", marginBottom: 2 }}>Mnemonic</div>
                      <div style={{ fontSize: 12, color: "#5b21b6" }}>{em.mnemonic}</div>
                    </div>
                  )}
                  {em.causes && (
                    <div style={{ background: "#fff7ed", borderRadius: 6, padding: "7px 10px", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#78350f", marginBottom: 2 }}>Causes</div>
                      <div style={{ fontSize: 12, color: "#92400e" }}>{em.causes}</div>
                    </div>
                  )}
                  <div style={LABEL}>Nursing Actions (in order)</div>
                  {em.nursing.map((n, ni) => (
                    <div key={ni} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: ni < em.nursing.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: em.color, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ni + 1}</div>
                      <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{n}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "Quiz Zone" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Level:</span>
            {["Novice", "Proficient"].map(l => (
              <button key={l} onClick={() => { setQuizLevel(l); setQuizIdx(0); setSelected(null); setRevealed(false); }} style={{
                fontSize: 11, padding: "4px 12px", borderRadius: 12,
                background: quizLevel === l ? "#7c3aed" : "#f3f4f6",
                color: quizLevel === l ? "#fff" : "#374151",
                border: "none", cursor: "pointer", fontWeight: quizLevel === l ? 600 : 400,
              }}>{l}</button>
            ))}
          </div>
          <div style={{ ...CARD, borderLeft: "3px solid #7c3aed" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Question {(quizIdx % questions.length) + 1} of {questions.length} · {quizLevel}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.5, marginBottom: 14 }}>{q.q}</div>
            {q.options.map((opt, i) => {
              let bg = "#f9fafb", border = "1px solid #e5e7eb", color = "#374151";
              if (revealed) {
                if (i === q.correct) { bg = "#d1fae5"; border = "1px solid #6ee7b7"; color = "#065f46"; }
                else if (i === selected) { bg = "#fee2e2"; border = "1px solid #fca5a5"; color = "#991b1b"; }
              } else if (i === selected) { bg = "#ede9fe"; border = "1px solid #a78bfa"; color = "#5b21b6"; }
              return (
                <div key={i}
                  onClick={() => { if (!revealed) setSelected(i); }}
                  style={{ padding: "10px 12px", borderRadius: 8, border, background: bg, color, cursor: revealed ? "default" : "pointer", marginBottom: 6, fontSize: 13 }}>
                  {["A", "B", "C", "D"][i]}. {opt}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {!revealed ? (
                <button onClick={() => { if (selected !== null) setRevealed(true); }}
                  disabled={selected === null}
                  style={{ flex: 1, padding: "9px", background: selected !== null ? "#7c3aed" : "#e5e7eb", color: selected !== null ? "#fff" : "#9ca3af", border: "none", borderRadius: 7, fontWeight: 600, cursor: selected !== null ? "pointer" : "default" }}>
                  Check Answer
                </button>
              ) : (
                <>
                  <div style={{ flex: 1, fontSize: 12, color: selected === q.correct ? "#065f46" : "#991b1b", fontWeight: 600, padding: "9px 0" }}>
                    {selected === q.correct ? "✓ Correct!" : `✗ Correct: ${["A", "B", "C", "D"][q.correct]}`}
                  </div>
                  <button onClick={() => { setQuizIdx(i => i + 1); setSelected(null); setRevealed(false); }}
                    style={{ padding: "9px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer" }}>
                    Next →
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={{ ...CARD, background: "#f5f3ff", borderColor: "#c4b5fd", marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#5b21b6" }}>
              Ask Clara in chat for more clinical scenarios — labor triage situations, medication safety cases, or postpartum complications.
            </div>
          </div>
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
  "nursing-micro-001":          MicroCanvas,
  "nursing-ob-001":             OBCanvas,
};

export default function NursingWorkerCanvas({ worker }) {
  const slug = worker?.workerId || worker?.slug || "";
  const Canvas = WORKER_CANVAS[slug];

  if (!Canvas) return (
    <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
      Nursing worker canvas not found for slug: {slug}
    </div>
  );

  // Course tutors (Morgan/Clara) manage their own header — no schoolData needed
  if (slug === "nursing-micro-001" || slug === "nursing-ob-001") {
    return <Canvas />;
  }

  const schoolData = getSchoolData(slug);
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
