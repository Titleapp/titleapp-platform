// LearningRecord.jsx — S52.48
// The Vault "Learning Record" surface — Layer 1 of the learning-record substrate
// (docs/learning-record-substrate.md). The educational record is a VAULT function,
// not a worker: a student-owned DTC (enrollment/credential anchor) + an append-only
// typed logbook, with an intake (KYC → capture ID → upload-or-attest) and the
// Reagan-rule path (state a record now, verify later). Reader/writer workers
// reference THIS. SAMPLE data until a real record is loaded.

import React, { useState } from "react";

const C = {
  verified: { dot: "#16a34a", text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", label: "Verified" },
  pending:  { dot: "#d97706", text: "#b45309", bg: "#fffbeb", border: "#fde68a", label: "Attestation pending" },
  accent: "#7c3aed",
};

// ── SAMPLE learning record (clearly badged) — shape = the real substrate ──
// One student-owned, append-only record that survives course-to-course,
// instructor-to-instructor, and didactic-to-clinical transitions. Ruthie's
// nursing worker READS this; the Vault OWNS it.
const RECORD = {
  dtc: {
    category: "learning_record", subtype: "enrollment",
    institution: "University of Hawai‘i — School of Nursing",
    program: "BSN", cohort: "2027", holder: "Sarah Kahale",
    kyc: { level: "KYC-1", verified: true },
  },
  // append-only typed logbook; `course` threads the longitudinal Journey view;
  // verificationStatus (v) drives the verified/pending split.
  entries: [
    { kind: "enrollment", course: "Program", title: "Enrolled — BSN, cohort 2027", source: "registrar", at: "2025-08-25", v: "verified" },
    { kind: "document", course: "Program", title: "Student ID captured", detail: "Anchors the enrollment DTC", source: "document_extract", at: "2025-08-25", v: "verified" },
    { kind: "assessment", course: "NUR 210 — Fundamentals", title: "Foundations of Nursing Practice — Final", detail: "88% · Tanner: noticing → interpreting", source: "lms:canvas", at: "2025-12-12", v: "verified" },
    { kind: "competency", course: "NUR 210 — Fundamentals", title: "Vital Signs & Assessment — met", source: "preceptor", at: "2025-12-05", v: "verified" },
    { kind: "assessment", course: "NUR 220 — Health Assessment", title: "Health Assessment — Exam", detail: "91%", source: "lms:canvas", at: "2026-02-20", v: "verified" },
    { kind: "clinical_hours", course: "NUR 220 — Health Assessment", title: "Community health rotation — 48 clinical hours", detail: "Kōkua Kalihi Valley", source: "preceptor", at: "2026-03-01", v: "verified" },
    { kind: "assessment", course: "NUR 320 — Pharmacology", title: "Pharmacology — Exam", detail: "82% · dosage + interactions · Tanner: interpreting", source: "lms:canvas", at: "2026-02-14", v: "verified" },
    { kind: "competency", course: "NUR 320 — Pharmacology", title: "Medication Administration — met", source: "preceptor", at: "2026-03-12", v: "verified" },
    { kind: "clinical_hours", course: "NUR 330 — Med/Surg", title: "Med/Surg rotation — 96 clinical hours", detail: "The Queen's Medical Center", source: "preceptor", at: "2026-03-15", v: "verified" },
    { kind: "competency", course: "NUR 330 — Med/Surg", title: "IV Insertion — remediate", detail: "Re-demo scheduled 2026-04-02 · Tanner: responding", source: "preceptor", at: "2026-03-20", v: "verified" },
    { kind: "reflection", course: "NUR 330 — Med/Surg", title: "Clinical reflection — post-op patient", detail: "Tanner Clinical Judgment: reflecting-on-action", source: "student", at: "2026-03-21", v: "verified" },
    { kind: "assessment", course: "Transfer", title: "Anatomy & Physiology — A− (prior college)", detail: "Self-stated transfer credit — transcript not yet uploaded", source: "student", at: "2024-12-15", v: "pending" },
  ],
  grants: [
    { who: "University of Hawai‘i — School of Nursing", scope: "read", at: "2025-08-25" },
    { who: "Student Evaluation worker (Ruthie)", scope: "read", at: "2026-02-01" },
  ],
};

// The course sequence in catalog order — defines the Journey timeline.
const COURSE_ORDER = ["Program", "Transfer", "NUR 210 — Fundamentals", "NUR 220 — Health Assessment", "NUR 320 — Pharmacology", "NUR 330 — Med/Surg"];

const KIND_ICON = { enrollment: "🎓", assessment: "📝", clinical_hours: "🏥", competency: "✅", reflection: "🪞", ce_activity: "📜", document: "📄", note: "🗒️" };

function Badge({ v }) {
  const c = C[v] || C.pending;
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: c.text, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>{c.label}</span>;
}

function EntryRow({ e }) {
  const c = C[e.v] || C.pending;
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#fff", border: "1px solid #f1f5f9", borderLeft: `3px solid ${c.dot}` }}>
      <span style={{ fontSize: 18, lineHeight: "20px" }}>{KIND_ICON[e.kind] || "•"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{e.title}</span>
          <Badge v={e.v} />
        </div>
        {e.detail && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{e.detail}</div>}
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{e.at} · source: {e.source}</div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "journey", label: "Journey" },
  { id: "record", label: "Record" },
  { id: "verify", label: "Verify" },
  { id: "grants", label: "Grants" },
  { id: "add", label: "Add" },
];

// Longitudinal Student Journey — one timeline across courses, didactic + clinical.
// This is the thing a transcript can't show, and the reason the record lives in
// the Vault (system of record) rather than inside any one course or worker.
function JourneyView() {
  const byCourse = COURSE_ORDER
    .map((c) => ({ course: c, items: RECORD.entries.filter((e) => (e.course || "Program") === c) }))
    .filter((g) => g.items.length);
  const clinicalHrs = RECORD.entries.filter((e) => e.kind === "clinical_hours")
    .reduce((s, e) => s + (parseInt((e.title.match(/(\d+)\s*clinical/) || [])[1], 10) || 0), 0);
  const compsMet = RECORD.entries.filter((e) => e.kind === "competency" && /met/i.test(e.title)).length;
  const courses = byCourse.filter((g) => g.course !== "Program" && g.course !== "Transfer").length;
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
        One record that follows the student <strong>across courses, instructors, and didactic → clinical</strong> — the thing a transcript can't show.
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[["Courses", courses], ["Clinical hours", clinicalHrs], ["Competencies met", compsMet]].map(([label, n]) => (
          <div key={label} style={{ flex: "1 1 120px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{n}</div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "relative", paddingLeft: 18 }}>
        <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: "#e9d5ff" }} />
        {byCourse.map((g) => (
          <div key={g.course} style={{ position: "relative", marginBottom: 18 }}>
            <div style={{ position: "absolute", left: -17, top: 4, width: 10, height: 10, borderRadius: "50%", background: C.accent, border: "2px solid #fff" }} />
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{g.course}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {g.items.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5 }}>
                  <span style={{ fontSize: 14 }}>{KIND_ICON[e.kind] || "•"}</span>
                  <span style={{ flex: 1 }}><span style={{ color: "#1e293b", fontWeight: 500 }}>{e.title}</span>{e.detail ? <span style={{ color: "#94a3b8" }}> — {e.detail}</span> : null}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{e.at}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LearningRecord() {
  const [tab, setTab] = useState("journey");
  const verified = RECORD.entries.filter((e) => e.v === "verified");
  const pending = RECORD.entries.filter((e) => e.v === "pending");
  const d = RECORD.dtc;

  return (
    <div style={{ padding: "8px 4px", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Learning Record</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 10px" }}>SAMPLE — your real record loads here</span>
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>A record you own and carry — append-only, attested, portable across schools and into work.</div>

      {/* Passport card */}
      <div style={{ background: "linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%)", border: "1px solid #e9d5ff", borderRadius: 16, padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>{d.subtype} · {d.category.replace("_", " ")}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>{d.program} — {d.institution}</div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{d.holder} · cohort {d.cohort}</div>
            {d.kyc?.verified && <div style={{ fontSize: 11.5, fontWeight: 600, color: C.verified.text, marginTop: 6 }}>✓ Identity verified ({d.kyc.level})</div>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ textAlign: "center", background: C.verified.bg, border: `1px solid ${C.verified.border}`, borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.verified.text }}>{verified.length}</div>
              <div style={{ fontSize: 10, color: C.verified.text, textTransform: "uppercase", letterSpacing: 0.4 }}>verified</div>
            </div>
            <div style={{ textAlign: "center", background: C.pending.bg, border: `1px solid ${C.pending.border}`, borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.pending.text }}>{pending.length}</div>
              <div style={{ fontSize: 10, color: C.pending.text, textTransform: "uppercase", letterSpacing: 0.4 }}>pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #f1f5f9", marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: tab === t.id ? 600 : 500, cursor: "pointer",
            background: "none", border: "none", color: tab === t.id ? C.accent : "#64748b",
            borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      {/* RECORD — the logbook timeline */}
      {tab === "journey" && <JourneyView />}

      {tab === "record" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {RECORD.entries.map((e, i) => <EntryRow key={i} e={e} />)}
        </div>
      )}

      {/* VERIFY — the Reagan-rule pending items */}
      {tab === "verify" && (
        <div>
          <div style={{ padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, marginBottom: 14, fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
            <strong>Trust, but verify.</strong> You can state a record now and prove it later. These were self-stated and are treated as <em>claimed, not proven</em> until you add evidence (upload a transcript/certificate, or have a registrar/instructor attest).
          </div>
          {pending.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>Nothing pending — every entry is verified. ✓</div>
          ) : pending.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#fff", border: "1px solid #fde68a", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{e.detail || "Self-stated"}</div>
              </div>
              <button style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>Add evidence</button>
            </div>
          ))}
        </div>
      )}

      {/* GRANTS — FERPA */}
      {tab === "grants" && (
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>You own this record. These parties have scoped, revocable access (FERPA). Nothing is shared unless you grant it.</div>
          {RECORD.grants.map((g, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#fff", border: "1px solid #f1f5f9", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{g.who}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{g.scope} access · granted {g.at}</div>
              </div>
              <button style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", background: "#fff", border: "1px solid #fecaca", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Revoke</button>
            </div>
          ))}
          <button style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>+ Grant access</button>
        </div>
      )}

      {/* ADD — the intake flow (KYC → capture ID → upload-or-attest) */}
      {tab === "add" && (
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>How a record enters your Vault. Identity is verified once; then add evidence or state it (and verify later).</div>
          {[
            { n: 1, title: "Verify your identity", detail: "ID check (KYC-1) — ties the record to the real you. Required once.", done: true },
            { n: 2, title: "Capture your student ID / enrollment", detail: "A photo of your student ID or enrollment — mints your record's anchor (DTC).", done: true },
            { n: 3, title: "Add records — upload or state", detail: "Upload a transcript/certificate (verified), OR state it now and verify later (Reagan rule).", done: false },
          ].map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 12, padding: "14px", borderRadius: 10, background: s.done ? "#f0fdf4" : "#fff", border: `1px solid ${s.done ? "#bbf7d0" : "#e2e8f0"}`, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: s.done ? C.verified.dot : "#e2e8f0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s.done ? "✓" : s.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{s.title}</div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2, lineHeight: 1.45 }}>{s.detail}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 8, padding: "11px 16px", cursor: "pointer" }}>Upload a document</button>
            <button style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "11px 16px", cursor: "pointer" }}>State it (verify later)</button>
          </div>
        </div>
      )}
    </div>
  );
}
