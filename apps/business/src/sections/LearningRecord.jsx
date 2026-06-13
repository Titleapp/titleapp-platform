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
      id: "hs", kind: "academic", mark: "KS", brand: "#8A1538",
      institution: "Kamehameha Schools — Kapālama",
      program: "High School Diploma",
      status: "Completed · 2022",
      entries: [
        { kind: "credential", title: "High School Diploma — awarded", detail: "Cumulative GPA 3.8 · College Prep track", source: "registrar", at: "2022-05-28", v: "verified" },
        { kind: "document", title: "Official transcript on file", source: "registrar", at: "2022-06-10", v: "verified" },
      ],
    },
    {
      id: "padi", kind: "professional", mark: "AD", brand: "#0E7490",
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
      // Course-level = the diver's LOGBOOK. Each dive is signed off by the
      // instructor (professional-licensing attestation). A pending sign-off
      // flows into the Verify tab as an affidavit request.
      courses: [
        {
          id: "ow", code: "OW", title: "Open Water Diver Course", term: "2019", status: "Certified",
          entries: [
            { kind: "material", title: "Knowledge Development — 5 modules (PADI eLearning)", source: "padi:elearning", at: "2019-05-20", v: "verified" },
            { kind: "exam", title: "Final exam", detail: "92%", source: "padi", at: "2019-06-01", v: "verified" },
            { kind: "dive", title: "Confined-water dives 1–5", detail: "Pool · mask clear, regulator recovery, CESA", signoff: "Instructor M. Akana · PADI #271905", source: "logbook", at: "2019-06-05", v: "verified" },
            { kind: "dive", title: "Open-water dive 1 — Skills", detail: "Hanauma Bay · 12m · 38 min", signoff: "Instructor M. Akana · PADI #271905", source: "logbook", at: "2019-06-12", v: "verified" },
            { kind: "dive", title: "Open-water dive 2 — Navigation", detail: "Hanauma Bay · 16m · 41 min", signoff: "Instructor M. Akana · PADI #271905", source: "logbook", at: "2019-06-13", v: "verified" },
            { kind: "dive", title: "Open-water dive 3 — Deep", detail: "Sharks Cove · 18m · 35 min", signoff: "Instructor M. Akana · PADI #271905", source: "logbook", at: "2019-06-14", v: "verified" },
            { kind: "dive", title: "Open-water dive 4 — Independent buddy team", detail: "Sharks Cove · 17m · 44 min", signoff: "Awaiting instructor sign-off", source: "logbook", at: "2019-06-15", v: "pending" },
          ],
        },
        {
          id: "rescue", code: "RES", title: "Rescue Diver Course", term: "2020", status: "Certified",
          entries: [
            { kind: "material", title: "Rescue theory + EFR primary/secondary care", source: "padi:elearning", at: "2020-01-08", v: "verified" },
            { kind: "exam", title: "Rescue scenarios assessment", detail: "Passed · 10 exercises", source: "padi", at: "2020-01-18", v: "verified" },
            { kind: "dive", title: "Rescue scenario 1 — Tired & panicked diver", detail: "Magic Island · surface + underwater tows", signoff: "Instructor K. Lopez · PADI #318220", source: "logbook", at: "2020-01-19", v: "verified" },
            { kind: "dive", title: "Rescue scenario 2 — Unresponsive diver", detail: "Magic Island · ascent, tow, EFR on exit", signoff: "Instructor K. Lopez · PADI #318220", source: "logbook", at: "2020-01-20", v: "verified" },
          ],
        },
      ],
    },
    {
      id: "bsn", kind: "academic", mark: "UH", brand: "#024731", logo: "/logos/uh-manoa.png",
      institution: "University of Hawai‘i — School of Nursing",
      program: "BSN — Nursing (cohort 2027)",
      status: "In progress",
      // Program-level = milestones (enrollment, clinical rotations, transfer).
      // Course-level detail (materials, quizzes, exams, warnings, coaching,
      // AI-assisted learning) lives one level down in `courses`.
      entries: [
        { kind: "enrollment", title: "Enrolled — BSN, cohort 2027", source: "registrar", at: "2025-08-25", v: "verified" },
        { kind: "clinical_hours", title: "Community health rotation — 48 clinical hours", detail: "Kōkua Kalihi Valley", source: "preceptor", at: "2026-03-01", v: "verified" },
        { kind: "clinical_hours", title: "Med/Surg rotation — 96 clinical hours", detail: "The Queen's Medical Center", source: "preceptor", at: "2026-03-15", v: "verified" },
        { kind: "competency", title: "IV Insertion — remediate", detail: "Re-demo 2026-04-02 · Tanner: responding", source: "preceptor", at: "2026-03-20", v: "verified" },
        { kind: "reflection", title: "Clinical reflection — post-op patient", detail: "Tanner: reflecting-on-action", source: "student", at: "2026-03-21", v: "verified" },
        { kind: "assessment", title: "Anatomy & Physiology — A− (prior college)", detail: "Self-stated transfer — transcript not yet uploaded", source: "student", at: "2024-12-15", v: "pending" },
      ],
      courses: [
        {
          id: "nur210", code: "NUR 210", title: "Nursing Fundamentals", term: "Fall 2025", status: "Completed · 88%",
          entries: [
            { kind: "material", title: "Course materials — 8 modules + skills-lab guide", source: "lms:canvas", at: "2025-08-25", v: "verified" },
            { kind: "quiz", title: "Quiz 3 — Infection control", detail: "94%", source: "lms:canvas", at: "2025-10-02", v: "verified" },
            { kind: "competency", title: "Vital signs & assessment — met", source: "preceptor", at: "2025-12-05", v: "verified" },
            { kind: "exam", title: "Final exam", detail: "88% · Tanner: noticing → interpreting", source: "lms:canvas", at: "2025-12-12", v: "verified" },
          ],
        },
        {
          id: "nur220", code: "NUR 220", title: "Health Assessment", term: "Spring 2026", status: "Completed · 91%",
          entries: [
            { kind: "material", title: "Course materials — head-to-toe assessment modules", source: "lms:canvas", at: "2026-01-13", v: "verified" },
            { kind: "quiz", title: "Quiz 2 — Cardiac & respiratory landmarks", detail: "90%", source: "lms:canvas", at: "2026-02-03", v: "verified" },
            { kind: "exam", title: "Exam — full assessment", detail: "91%", source: "lms:canvas", at: "2026-02-20", v: "verified" },
          ],
        },
        {
          id: "nur320", code: "NUR 320", title: "Pharmacology", term: "Spring 2026", status: "In progress · 82%",
          entries: [
            { kind: "material", title: "Course materials — 6 modules (dosage, interactions, pharmacokinetics)", source: "lms:canvas", at: "2026-01-13", v: "verified" },
            { kind: "quiz", title: "Quiz 1 — Dosage calculation", detail: "79% · below 85% course threshold", source: "lms:canvas", at: "2026-01-27", v: "verified" },
            { kind: "warning", title: "Early alert — dosage-calc accuracy below threshold", detail: "Issued by course instructor; coaching recommended", source: "instructor", at: "2026-01-28", v: "verified" },
            { kind: "coaching", title: "Coaching session — med-math remediation plan", detail: "30 min with academic advisor · plan: 3 practice sets/week", source: "advisor", at: "2026-02-03", v: "verified" },
            { kind: "ai_session", title: "AI-assisted practice — 40 dosage problems", detail: "Ruthie tutor · flagged: pediatric weight-based dosing, IV drip rates", source: "worker:ruthie", at: "2026-02-10", v: "verified" },
            { kind: "exam", title: "Midterm exam", detail: "82% · dosage section improved", source: "lms:canvas", at: "2026-02-14", v: "verified" },
            { kind: "competency", title: "Medication administration — met", source: "preceptor", at: "2026-03-12", v: "verified" },
          ],
        },
      ],
    },
  ],
};

const KIND_ICON = { enrollment: "🎓", credential: "🏅", specialty: "🌊", assessment: "📝", clinical_hours: "🏥", competency: "✅", reflection: "🪞", ce_activity: "📜", document: "📄", note: "🗒️", material: "📚", quiz: "✏️", exam: "📝", warning: "⚠️", coaching: "🧭", ai_session: "🤖", dive: "🤿" };
const PROGRAM_ICON = { academic: "🎓", professional: "🏅" };

// All entries flattened (newest first), tagged with their program — and, for
// course-level entries, the course code/title too. Program milestones AND the
// granular course entries (materials, quizzes, exams, warnings, coaching,
// AI sessions, dive logbook) all land in one append-only logbook.
function allEntries() {
  const out = [];
  for (const p of RECORD.programs) {
    for (const e of p.entries || []) out.push({ ...e, program: p.program });
    for (const c of p.courses || [])
      for (const e of c.entries || []) out.push({ ...e, program: p.program, course: c.code || c.title });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

// Institution brand mark. Uses a real logo image when `p.logo` (a URL or
// imported asset) is set; otherwise a self-contained branded monogram so it
// always renders — no external hotlink to break offline. Drop real logo files
// in later by setting `logo` on the program.
function InstitutionLogo({ p, size = 38 }) {
  const [failed, setFailed] = useState(false);
  if (p.logo && !failed) {
    // Wordmark logos aren't square — render at fixed height, natural width.
    return <img src={p.logo} alt={p.institution} onError={() => setFailed(true)} style={{ height: size, width: "auto", maxWidth: size * 2.6, objectFit: "contain", flexShrink: 0 }} />;
  }
  const brand = p.brand || C.accent;
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: brand, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.4), fontWeight: 800, letterSpacing: 0.3, flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}>
      {p.mark || (PROGRAM_ICON[p.kind] || "•")}
    </div>
  );
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
        {e.signoff && <div style={{ fontSize: 11.5, color: e.v === "verified" ? C.verified.text : C.pending.text, marginTop: 3, fontWeight: 600 }}>✍️ {e.signoff}</div>}
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{e.at} · source: {e.source}{showProgram ? ` · ${e.program}${e.course ? ` › ${e.course}` : ""}` : ""}</div>
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
              <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                <InstitutionLogo p={p} size={30} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a" }}>{p.program}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{p.institution}</div>
                </div>
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

// One granular course entry — used inside the course drill-down. Renders the
// typed icon, title/detail, instructor sign-off (with a Request-sign-off action
// when pending), and a verified/pending badge.
function CourseEntry({ e, flash }) {
  const c = C[e.v] || C.pending;
  return (
    <div style={{ display: "flex", gap: 9, padding: "9px 11px", borderRadius: 9, background: "#fff", border: "1px solid #f1f5f9", borderLeft: `3px solid ${c.dot}` }}>
      <span style={{ fontSize: 15, lineHeight: "18px" }}>{KIND_ICON[e.kind] || "•"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1e293b" }}>{e.title}</span>
          <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap" }}>{e.at}</span>
        </div>
        {e.detail && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1.5, lineHeight: 1.4 }}>{e.detail}</div>}
        {e.signoff && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: e.v === "verified" ? C.verified.text : C.pending.text }}>✍️ {e.signoff}</span>
            {e.v === "pending" && (
              <button onClick={() => flash(`Sign-off request sent — the instructor will be asked to e-sign an affidavit for "${e.title}".`)} style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: C.accent, border: "none", borderRadius: 6, padding: "3px 9px", cursor: "pointer" }}>Request sign-off</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// A course inside an institution — collapsible row that drills into the
// course's granular entries (materials, quizzes, exams, warnings, coaching,
// AI-assisted-learning sessions, dive logbook).
function CourseBlock({ course, open, onToggle, flash }) {
  const verified = course.entries.filter((e) => e.v === "verified").length;
  const pending = course.entries.length - verified;
  return (
    <div style={{ borderRadius: 10, background: open ? "#fafaff" : "#fff", border: `1px solid ${open ? C.accent : "#e2e8f0"}`, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", width: "100%" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>{course.code ? `${course.code} · ` : ""}{course.title}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{course.term} · {course.status}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b" }}>{course.entries.length} entries</span>
          {pending > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.pending.text, background: C.pending.bg, border: `1px solid ${C.pending.border}`, borderRadius: 999, padding: "1px 7px" }}>{pending} pending</span>}
          <span style={{ fontSize: 14, color: "#a78bfa", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
        </div>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 12px 12px" }}>
          {course.entries.map((e, i) => <CourseEntry key={i} e={e} flash={flash} />)}
        </div>
      )}
    </div>
  );
}

// Institutions overview — the OPENING view: every place this person has learned
// (formal, technical/vocational, and continuing ed) at a glance.
function InstitutionsView({ flash }) {
  const [openId, setOpenId] = useState(null);
  const [openCourse, setOpenCourse] = useState(null); // `${programId}:${courseId}`
  const typeLabel = { academic: "Academic", professional: "Vocational / Technical" };
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
        Every place this person has learned — <strong>formal, technical, and continuing education</strong> — in one record they own. Click an institution to see its milestones, then drill into any <strong>course</strong> for its materials, quizzes, exams, coaching notes, and instructor sign-offs.
      </div>

      {/* AI-assisted-learning callout — the forward-looking hook for schools */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "linear-gradient(135deg,#1e1b4b 0%,#4c1d95 100%)", color: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 26, lineHeight: "28px" }}>🤖</div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>AI-assisted learning, on the record</div>
          <div style={{ fontSize: 12.5, color: "#ddd6fe", marginTop: 3, lineHeight: 1.5 }}>
            When a student works with an AI tutor — like a Digital Worker — every session is captured inside the course: <strong style={{ color: "#fff" }}>what they practiced, what it flagged, and how it moved the grade.</strong> Schools get an auditable trail of AI-assisted learning, owned by the student — not a black box. Look for the 🤖 entries inside a course.
          </div>
        </div>
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
                  <InstitutionLogo p={p} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a" }}>{p.institution}</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 1 }}>{p.program}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 999, padding: "2px 8px" }}>{typeLabel[p.kind] || p.kind}</span>
                      {hasCE && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 8px" }}>CE</span>}
                      {p.courses && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "2px 8px" }}>{p.courses.length} courses</span>}
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
                <div style={{ padding: "8px 16px 14px", borderTop: "1px solid #f1f5f9" }}>
                  {p.courses && <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "2px 0 4px" }}>Milestones</div>}
                  {p.entries.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, margin: "8px 0" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.v === "verified" ? C.verified.dot : C.pending.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 14 }}>{KIND_ICON[e.kind] || "•"}</span>
                      <span style={{ flex: 1 }}><span style={{ color: "#1e293b", fontWeight: 500 }}>{e.title}</span>{e.detail ? <span style={{ color: "#94a3b8" }}> — {e.detail}</span> : null}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{e.at}</span>
                    </div>
                  ))}
                  {p.courses && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                        Courses <span style={{ textTransform: "none", fontWeight: 500, color: "#cbd5e1" }}>— click a course for its materials, quizzes, exams, notes & sign-offs</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {p.courses.map((course) => {
                          const key = `${p.id}:${course.id}`;
                          return (
                            <CourseBlock
                              key={key}
                              course={course}
                              open={openCourse === key}
                              onToggle={() => setOpenCourse(openCourse === key ? null : key)}
                              flash={flash}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
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
  const [notice, setNotice] = useState(null);
  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(null), 2800); };
  const entries = allEntries();
  const verified = entries.filter((e) => e.v === "verified");
  const pending = entries.filter((e) => e.v === "pending");
  const h = RECORD.holder;

  return (
    <div style={{ padding: "8px 4px", maxWidth: 860 }}>
      {notice && <div style={{ position: "sticky", top: 8, zIndex: 5, background: "#0f172a", color: "#fff", fontSize: 12.5, fontWeight: 600, padding: "9px 14px", borderRadius: 8, marginBottom: 12 }}>✓ {notice}</div>}
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
      {tab === "institutions" && <InstitutionsView flash={flash} />}

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
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{e.program}{e.course ? ` › ${e.course}` : ""} · {e.detail || "Self-stated"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => flash("Upload a transcript or certificate to verify this entry.")} style={{ fontSize: 12, fontWeight: 600, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 7, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>Add evidence</button>
                <button onClick={() => flash(`Sign-off request sent — the instructor/registrar will be asked to e-sign an affidavit for "${e.title}".`)} style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 7, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>Request sign-off ✍️</button>
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
              <button onClick={() => flash(`Access revoked for ${g.who}.`)} style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", background: "#fff", border: "1px solid #fecaca", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Revoke</button>
            </div>
          ))}
          <button onClick={() => flash("Authorize a person or organization — enter a name or email and the access scope.")} style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>+ Authorize access</button>
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
            <button onClick={() => flash("Opening uploader… choose your transcript or certificate.")} style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 8, padding: "11px 16px", cursor: "pointer" }}>Upload a document</button>
            <button onClick={() => flash("Stated — added to your record as pending. Verify it later.")} style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.accent, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "11px 16px", cursor: "pointer" }}>State it (verify later)</button>
          </div>
        </div>
      )}
    </div>
  );
}
