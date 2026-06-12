// LearningRecord.jsx — the Vault "Academic Record" (S52.48 → S52.60)
// One person's OWNED, append-only record across EVERY program — K-12, college,
// AND professional / vocational certs. The Vault owns it (system of record);
// workers (e.g. Ruthie's nursing evaluator) READ it. SAMPLE data until a real
// record loads.

import React, { useState } from "react";

const C = {
  verified: { dot: "#16a34a", text: "#166534", bg: "#f0fdf4", border: "#bbf7d0", label: "Verified" },
  pending:  { dot: "#d97706", text: "#b45309", bg: "#fffbeb", border: "#fde68a", label: "Attestation pending" },
  accent: "#7c3aed",
};

// ── SAMPLE academic record (clearly badged) — shape = the real substrate ──
// Multiple PROGRAMS under one holder, proving the record is universal: a high
// school diploma, a professional dive-instructor track, and a college degree —
// all in one owned, portable logbook.
const RECORD = {
  holder: { name: "Sarah Kahale", kyc: { level: "KYC-1", verified: true } },
  programs: [
    {
      id: "hs", kind: "academic",
      institution: "Kamehameha Schools — Kapālama",
      program: "High School Diploma",
      status: "Completed · 2022",
      entries: [
        { kind: "credential", title: "High School Diploma — awarded", detail: "Cumulative GPA 3.8 · College Prep track", source: "registrar", at: "2022-05-28", v: "verified" },
        { kind: "document", title: "Official transcript on file", source: "registrar", at: "2022-06-10", v: "verified" },
      ],
    },
    {
      id: "padi", kind: "professional",
      institution: "Aloha Dive Center (PADI certifications)",
      program: "Scuba Diving — Instructor Track",
      status: "OWSI · active instructor",
      entries: [
        { kind: "credential", title: "Open Water Diver", source: "padi", at: "2019-06-15", v: "verified" },
        { kind: "credential", title: "Advanced Open Water Diver", source: "padi", at: "2019-08-02", v: "verified" },
        { kind: "credential", title: "Rescue Diver", source: "padi", at: "2020-01-20", v: "verified" },
        { kind: "specialty", title: "Night Diver — specialty", source: "padi", at: "2020-03-11", v: "verified" },
        { kind: "specialty", title: "Coral Reef Research — specialty", source: "padi", at: "2020-05-09", v: "verified" },
        { kind: "credential", title: "Divemaster", detail: "60+ logged dives", source: "padi", at: "2021-04-18", v: "verified" },
        { kind: "credential", title: "OWSI — Open Water Scuba Instructor", detail: "Instructor Development Course + IE passed", source: "padi", at: "2022-09-30", v: "verified" },
        { kind: "credential", title: "EFR Instructor (Emergency First Response)", source: "padi", at: "2023-02-14", v: "pending" },
        { kind: "ce_activity", title: "PADI Member renewal — 2024 (continuing ed)", detail: "Instructor status current", source: "padi", at: "2024-01-15", v: "verified" },
      ],
    },
    {
      id: "bsn", kind: "academic",
      institution: "University of Hawai‘i — School of Nursing",
      program: "BSN — Nursing (cohort 2027)",
      status: "In progress",
      entries: [
        { kind: "enrollment", title: "Enrolled — BSN, cohort 2027", source: "registrar", at: "2025-08-25", v: "verified" },
        { kind: "assessment", title: "NUR 210 Fundamentals — Final", detail: "88% · Tanner: noticing → interpreting", source: "lms:canvas", at: "2025-12-12", v: "verified" },
        { kind: "competency", title: "Vital Signs & Assessment — met", source: "preceptor", at: "2025-12-05", v: "verified" },
        { kind: "assessment", title: "NUR 220 Health Assessment — Exam", detail: "91%", source: "lms:canvas", at: "2026-02-20", v: "verified" },
        { kind: "clinical_hours", title: "Community health rotation — 48 clinical hours", detail: "Kōkua Kalihi Valley", source: "preceptor", at: "2026-03-01", v: "verified" },
        { kind: "assessment", title: "NUR 320 Pharmacology — Exam", detail: "82% · dosage + interactions", source: "lms:canvas", at: "2026-02-14", v: "verified" },
        { kind: "competency", title: "Medication Administration — met", source: "preceptor", at: "2026-03-12", v: "verified" },
        { kind: "clinical_hours", title: "Med/Surg rotation — 96 clinical hours", detail: "The Queen's Medical Center", source: "preceptor", at: "2026-03-15", v: "verified" },
        { kind: "competency", title: "IV Insertion — remediate", detail: "Re-demo 2026-04-02 · Tanner: responding", source: "preceptor", at: "2026-03-20", v: "verified" },
        { kind: "reflection", title: "Clinical reflection — post-op patient", detail: "Tanner: reflecting-on-action", source: "student", at: "2026-03-21", v: "verified" },
        { kind: "assessment", title: "Anatomy & Physiology — A− (prior college)", detail: "Self-stated transfer — transcript not yet uploaded", source: "student", at: "2024-12-15", v: "pending" },
      ],
    },
  ],
};

const KIND_ICON = { enrollment: "🎓", credential: "🏅", specialty: "🌊", assessment: "📝", clinical_hours: "🏥", competency: "✅", reflection: "🪞", ce_activity: "📜", document: "📄", note: "🗒️" };
const PROGRAM_ICON = { academic: "🎓", professional: "🏅" };

// All entries flattened (newest first), tagged with their program.
function allEntries() {
  return RECORD.programs
    .flatMap((p) => p.entries.map((e) => ({ ...e, program: p.program })))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

function Badge({ v }) {
  const c = C[v] || C.pending;
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: c.text, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>{c.label}</span>;
}

function EntryRow({ e, showProgram }) {
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
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{e.at} · source: {e.source}{showProgram ? ` · ${e.program}` : ""}</div>
      </div>
    </div>
  );
}

// Journey — grouped by PROGRAM, the longitudinal life-of-learning view.
function JourneyView() {
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
        One record across <strong>every program</strong> — high school, professional certifications, and college — that follows the person school-to-school and into work. The thing a transcript can't show.
      </div>
      {RECORD.programs.map((p) => {
        const verified = p.entries.filter((e) => e.v === "verified").length;
        return (
          <div key={p.id} style={{ marginBottom: 16, border: "1px solid #f1f5f9", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 16px", background: "linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%)", borderBottom: "1px solid #e9d5ff", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a" }}>{PROGRAM_ICON[p.kind] || "•"} {p.program}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{p.institution}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: "#fff", border: "1px solid #e9d5ff", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{p.status}</span>
            </div>
            <div style={{ padding: "10px 16px", position: "relative" }}>
              <div style={{ position: "absolute", left: 21, top: 14, bottom: 14, width: 2, background: "#e9d5ff" }} />
              {p.entries.map((e, i) => (
                <div key={i} style={{ position: "relative", paddingLeft: 18, display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5, margin: "7px 0" }}>
                  <span style={{ position: "absolute", left: 1, top: 4, width: 9, height: 9, borderRadius: "50%", background: e.v === "verified" ? C.verified.dot : C.pending.dot, border: "2px solid #fff" }} />
                  <span style={{ fontSize: 14 }}>{KIND_ICON[e.kind] || "•"}</span>
                  <span style={{ flex: 1 }}><span style={{ color: "#1e293b", fontWeight: 500 }}>{e.title}</span>{e.detail ? <span style={{ color: "#94a3b8" }}> — {e.detail}</span> : null}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{e.at}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, paddingLeft: 18 }}>{verified} verified · {p.entries.length} entries</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Institutions overview — the OPENING view: every place this person has learned
// (formal, technical/vocational, and continuing ed) at a glance.
function InstitutionsView() {
  const [openId, setOpenId] = useState(null);
  const typeLabel = { academic: "Academic", professional: "Vocational / Technical" };
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
        Every place this person has learned — <strong>formal, technical, and continuing education</strong> — in one record they own. Click any to expand it.
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {RECORD.programs.map((p) => {
          const verified = p.entries.filter((e) => e.v === "verified").length;
          const hasCE = p.entries.some((e) => e.kind === "ce_activity");
          const open = openId === p.id;
          return (
            <div key={p.id} style={{ borderRadius: 12, background: "#fff", border: `1px solid ${open ? C.accent : "#e9d5ff"}`, overflow: "hidden" }}>
              <button onClick={() => setOpenId(open ? null : p.id)} style={{ textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", width: "100%" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  <span style={{ fontSize: 26 }}>{PROGRAM_ICON[p.kind] || "•"}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a" }}>{p.institution}</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 1 }}>{p.program}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 999, padding: "2px 8px" }}>{typeLabel[p.kind] || p.kind}</span>
                      {hasCE && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 8px" }}>CE</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>{p.status}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.verified.text }}>{verified}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>verified</div>
                  </div>
                  <span style={{ fontSize: 16, color: "#a78bfa", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
                </div>
              </button>
              {open && (
                <div style={{ padding: "6px 16px 14px", borderTop: "1px solid #f1f5f9" }}>
                  {p.entries.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, margin: "8px 0" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.v === "verified" ? C.verified.dot : C.pending.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 14 }}>{KIND_ICON[e.kind] || "•"}</span>
                      <span style={{ flex: 1 }}><span style={{ color: "#1e293b", fontWeight: 500 }}>{e.title}</span>{e.detail ? <span style={{ color: "#94a3b8" }}> — {e.detail}</span> : null}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{e.at}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS = [
  { id: "institutions", label: "Institutions" },
  { id: "journey", label: "Journey" },
  { id: "record", label: "All entries" },
  { id: "verify", label: "Verify" },
  { id: "grants", label: "Access" },
  { id: "add", label: "ID Check" },
];

export default function LearningRecord() {
  const [tab, setTab] = useState("institutions");
  const entries = allEntries();
  const verified = entries.filter((e) => e.v === "verified");
  const pending = entries.filter((e) => e.v === "pending");
  const h = RECORD.holder;

  return (
    <div style={{ padding: "8px 4px", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Academic Record</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 10px" }}>SAMPLE — your real record loads here</span>
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>A record you own and carry — append-only, attested, portable across schools, certifications, and into work.</div>

      {/* Passport card */}
      <div style={{ background: "linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%)", border: "1px solid #e9d5ff", borderRadius: 16, padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>Academic Record</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>{h.name}</div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{RECORD.programs.length} programs · {entries.length} entries</div>
            {h.kyc?.verified && <div style={{ fontSize: 11.5, fontWeight: 600, color: C.verified.text, marginTop: 6 }}>✓ Identity verified ({h.kyc.level})</div>}
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
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #f1f5f9", marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: tab === t.id ? 600 : 500, cursor: "pointer",
            background: "none", border: "none", color: tab === t.id ? C.accent : "#64748b",
            borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      {/* INSTITUTIONS — the opening overview (formal / technical / CE) */}
      {tab === "institutions" && <InstitutionsView />}

      {/* JOURNEY — grouped by program */}
      {tab === "journey" && <JourneyView />}

      {/* ALL ENTRIES — flat logbook, newest first */}
      {tab === "record" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((e, i) => <EntryRow key={i} e={e} showProgram />)}
        </div>
      )}

      {/* VERIFY — the Reagan-rule pending items */}
      {tab === "verify" && (
        <div>
          <div style={{ padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, marginBottom: 14, fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
            <strong>Trust, but verify.</strong> You can state a record now and prove it later. These are <em>claimed, not proven</em> until you either <strong>upload evidence</strong> (a transcript/certificate) or <strong>request a sign-off</strong> — the instructor, registrar, or agency <strong>e-signs an affidavit</strong> that the course/credential was completed. (Same flow CE uses for the authorizing authority.)
          </div>
          {pending.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>Nothing pending — every entry is verified. ✓</div>
          ) : pending.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#fff", border: "1px solid #fde68a", marginBottom: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{e.program} · {e.detail || "Self-stated"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ fontSize: 12, fontWeight: 600, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 7, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>Add evidence</button>
                <button style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 7, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>Request sign-off ✍️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GRANTS — FERPA */}
      {tab === "grants" && (
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>You own this record. These parties have scoped, revocable access. Nothing is shared unless you grant it.</div>
          {[
            { who: "University of Hawai‘i — School of Nursing", scope: "read", at: "2025-08-25" },
            { who: "Student Evaluation worker (Ruthie)", scope: "read", at: "2026-02-01" },
            { who: "PADI — instructor verification", scope: "read (dive certs)", at: "2022-10-01" },
          ].map((g, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#fff", border: "1px solid #f1f5f9", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{g.who}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{g.scope} access · granted {g.at}</div>
              </div>
              <button style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", background: "#fff", border: "1px solid #fecaca", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Revoke</button>
            </div>
          ))}
          <button style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>+ Authorize access</button>
        </div>
      )}

      {/* ADD — the intake flow */}
      {tab === "add" && (
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>How a record enters your Vault. Identity is verified once; then add evidence or state it (and verify later). Works for any program — a diploma, a dive cert, a college course, a CE credit.</div>
          {[
            { n: 1, title: "Verify your identity", detail: "ID check (KYC-1) — ties the record to the real you. Required once.", done: true },
            { n: 2, title: "Capture the credential or enrollment", detail: "A diploma, certification card, student ID, or enrollment — mints that program's anchor (DTC).", done: true },
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
