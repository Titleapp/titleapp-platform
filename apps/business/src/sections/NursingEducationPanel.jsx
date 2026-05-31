import React, { useState, useMemo } from "react";
import NURSING_DATA from "../data/nursingEducationData.json";

// P1 fix (QA-001): real clinical site names per student instead of abstract types
const STUDENT_SITE_LOOKUP = {
  "stu_sarah":   "Clinical (ER)",
  "stu_maya":    "Medical-Surgical",
  "stu_james":   "Medical-Surgical",
  "stu_aaron":   "MMMG",
  "stu_priya":   "Simulation",
  "stu_emi":     "Clinical (ER)",
  "stu_kainoa":  "Peds MCE 1",
  "stu_leilani": "Hospice",
};

/**
 * NursingEducationPanel — renders Ruthie Clearwater's nursing-education-001
 * worker against her real Master Config Sheet data.
 *
 * Multi-dimensional scoring (Sean 2026-05-30): the worker doesn't just track
 * SLOs (Ruthie's original model). It tracks ALL the dimensions instructors
 * actually use to recommend continue / counsel / redirect:
 *   1. Competency (SLO observations)
 *   2. Professionalism (communication, team, prep)
 *   3. Attendance (present / absent / late)
 *   4. Clinical incidents (med errors, near-misses — including SELF-REPORTED
 *      strengths)
 *   5. Reflective practice (Tanner framework reflections)
 *
 * Tonight: reads from local data.json bundle. Sunday: swap to Firestore
 * /v1/nurse-edu:* endpoints once auth pipeline is sorted.
 */

const S = {
  wrap: { padding: 24, background: "#fff", height: "100%", overflow: "auto" },
  h1: { fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em" },
  subtitle: { color: "#64748b", fontSize: 13, marginBottom: 20 },
  demoBanner: {
    background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8,
    padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#92400E",
  },
  tabs: {
    display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0",
    marginBottom: 20, marginLeft: -4, marginRight: -4, flexWrap: "wrap",
  },
  tab: {
    padding: "10px 14px", background: "transparent", border: "none",
    borderBottom: "2px solid transparent", color: "#64748b", fontSize: 13,
    fontWeight: 500, cursor: "pointer",
  },
  tabActive: { color: "#0f172a", borderBottomColor: "#7C3AED", fontWeight: 700 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 },
  statCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px" },
  statK: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", fontWeight: 600, marginBottom: 4 },
  statV: { fontSize: 22, fontWeight: 700 },
  statVwarn: { color: "#D97706" },
  statVgood: { color: "#16A34A" },
  statSm: { fontSize: 11, color: "#64748b", fontWeight: 500 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 16 },
  cardHeader: { padding: "12px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 700, margin: 0 },
  studentRow: {
    display: "grid", gridTemplateColumns: "32px 1fr 120px 90px 130px 30px",
    gap: 12, alignItems: "center", padding: "10px 18px", borderBottom: "1px solid #f1f5f9", cursor: "pointer",
  },
  studentRowFlag: { background: "rgba(217, 119, 6, 0.04)" },
  avatar: { width: 32, height: 32, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 },
  pill: { padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, display: "inline-block" },
  pillGood: { background: "rgba(22, 163, 74, 0.1)", color: "#16A34A" },
  pillWarn: { background: "rgba(217, 119, 6, 0.12)", color: "#D97706" },
  pillFlag: { background: "rgba(220, 38, 38, 0.08)", color: "#DC2626" },
  timeline: { position: "relative", paddingLeft: 28, marginTop: 4 },
  timelineLine: { position: "absolute", left: 9, top: 0, bottom: 0, width: 2, background: "#e2e8f0" },
  event: { position: "relative", marginBottom: 14, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px" },
  dot: { position: "absolute", left: -23, top: 14, width: 12, height: 12, borderRadius: "50%", background: "#fff", border: "3px solid #94a3b8" },
  eventMeta: { fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  eventCourse: { background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: 4, fontWeight: 700 },
  eventTypePill: { padding: "2px 8px", borderRadius: 4, fontWeight: 700 },
  eventTitle: { fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 },
  eventBody: { fontSize: 13, color: "#475569" },
};

const EVENT_TYPE_STYLE = {
  "reflection.submitted":     { dot: "#7C3AED", pillBg: "rgba(124, 58, 237, 0.1)", pillColor: "#7C3AED", label: "Reflection" },
  "slo.observed":             { dot: "#16A34A", pillBg: "rgba(22, 163, 74, 0.1)", pillColor: "#16A34A", label: "SLO Observed" },
  "professionalism.observed": { dot: "#0EA5E9", pillBg: "rgba(14, 165, 233, 0.1)", pillColor: "#0EA5E9", label: "Professionalism" },
  "attendance.recorded":      { dot: "#64748b", pillBg: "#f1f5f9",                  pillColor: "#475569", label: "Attendance" },
  "incident.recorded":        { dot: "#DC2626", pillBg: "rgba(220, 38, 38, 0.08)", pillColor: "#DC2626", label: "Incident" },
  "grade.locked":             { dot: "#D97706", pillBg: "rgba(217, 119, 6, 0.1)",  pillColor: "#D97706", label: "Grade Locked · Chain-Anchored" },
};

function avgScore(entries) {
  const scored = entries.filter(e => typeof e.score === "number");
  if (scored.length === 0) return null;
  const sum = scored.reduce((a, e) => a + e.score, 0);
  return (sum / scored.length).toFixed(1);
}

function StudentList({ data, onPickStudent }) {
  const students = data.students || [];
  const allEntries = data.logbookEntries || [];
  const pendingReflections = allEntries.filter(e => e.type === "reflection.submitted").length;
  const lockedGrades = allEntries.filter(e => e.type === "grade.locked").length;
  const studentEntries = useMemo(() => {
    const map = {};
    for (const s of students) map[s.studentId] = allEntries.filter(e => e.studentId === s.studentId);
    return map;
  }, [students, allEntries]);

  return (
    <div>
      <div style={S.demoBanner}>
        <b>Demo data:</b> 8 sample students bootstrap the cohort. To enroll real students, use <em>+ Invite Student</em> (Sunday wire — mirrors advisor/investor flow shipped today: invite → Stripe Identity KYC → educational-record DTC minted in student's personal Vault → entitled membership to Clearwater Nursing).
      </div>

      <div style={S.statsRow}>
        <div style={S.statCard}>
          <div style={S.statK}>On track</div>
          <div style={{ ...S.statV, ...S.statVgood }}>{students.filter(s => s.progressStatus === "On track").length}<span style={S.statSm}> / {students.length}</span></div>
        </div>
        <div style={S.statCard}>
          <div style={S.statK}>Need check-in</div>
          <div style={{ ...S.statV, ...S.statVwarn }}>{students.filter(s => s.flag).length}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statK}>Reflections submitted</div>
          <div style={S.statV}>{pendingReflections}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statK}>Grades locked</div>
          <div style={S.statV}>{lockedGrades} <span style={S.statSm}>chain-anchored</span></div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <h3 style={S.cardTitle}>Students · ASN20</h3>
          <button style={{ background: "#7C3AED", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 5, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>+ Invite Student</button>
        </div>
        {students.map(s => {
          const isFlag = !!s.flag;
          const rowStyle = isFlag ? { ...S.studentRow, ...S.studentRowFlag } : S.studentRow;
          const entries = studentEntries[s.studentId] || [];
          const score = avgScore(entries);
          const hasJourney = entries.length > 0;
          return (
            <div key={s.studentId} style={rowStyle} onClick={() => onPickStudent(s.studentId)}>
              <div style={{ ...S.avatar, background: s.colorAccent }}>{s.initials}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{s.displayName}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{s.currentCourse} · {s.currentSite} · enrolled {s.enrolledISO?.slice(0, 7)}</div>
              </div>
              <div>
                <span style={{ ...S.pill, ...(s.progressStatus === "On track" ? S.pillGood : S.pillWarn) }}>{s.progressStatus}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{score || "—"}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{s.note || s.flag || (hasJourney ? `${entries.length} events` : "Newly enrolled — no events yet")}</div>
              <div style={{ color: "#cbd5e1", fontWeight: 700 }}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentJourney({ data, studentId, onBack }) {
  const student = (data.students || []).find(s => s.studentId === studentId);
  const entries = useMemo(() => {
    return (data.logbookEntries || [])
      .filter(e => e.studentId === studentId)
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [data, studentId]);

  // P0-2 fix (QA-001): useMemo MUST be called before any conditional return —
  // React hook rules. Counts memoized regardless of student lookup result.
  const dimensions = useMemo(() => ({
    sloCount: entries.filter(e => e.type === "slo.observed").length,
    reflCount: entries.filter(e => e.type === "reflection.submitted").length,
    profCount: entries.filter(e => e.type === "professionalism.observed").length,
    attendCount: entries.filter(e => e.type === "attendance.recorded").length,
    incidentCount: entries.filter(e => e.type === "incident.recorded").length,
    lockedCount: entries.filter(e => e.type === "grade.locked").length,
  }), [entries]);

  if (!student) {
    return <div style={S.wrap}>Student not found. <button onClick={onBack}>← Back</button></div>;
  }

  function fmtDate(iso) {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#7C3AED", fontWeight: 600, cursor: "pointer", padding: "0 0 12px", fontSize: 13 }}>← Back to Students</button>

      <h1 style={S.h1}>{student.displayName} — longitudinal journey</h1>
      <div style={S.subtitle}>
        {entries.length} events across {student.coursesTaken?.join(" → ") || "NURS 210 → NURS 220 → NURS 230"} · cohort ASN20
      </div>

      <div style={S.statsRow}>
        <div style={S.statCard}>
          <div style={S.statK}>Reflections</div>
          <div style={S.statV}>{dimensions.reflCount}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statK}>SLOs observed</div>
          <div style={S.statV}>{dimensions.sloCount}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statK}>Professionalism</div>
          <div style={S.statV}>{dimensions.profCount}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statK}>Incidents / Attendance</div>
          <div style={S.statV}>{dimensions.incidentCount}/{dimensions.attendCount}</div>
        </div>
      </div>

      {entries.length === 0 && (
        <div style={{ padding: "32px 24px", background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
            No events recorded yet
          </div>
          <div style={{ fontSize: 13, color: "#64748b", maxWidth: 480, margin: "0 auto" }}>
            {student.displayName} is newly enrolled. Their academic record DTC has been minted to their personal Vault but no clinical reflections, SLO observations, or attendance events have been recorded yet. Start a reflection from chat, or record an attendance event from the upcoming clinical shift.
          </div>
        </div>
      )}

      <div style={S.timeline}>
        <div style={S.timelineLine} />
        {entries.map((e, i) => {
          const style = EVENT_TYPE_STYLE[e.type] || EVENT_TYPE_STYLE["slo.observed"];
          const isLocked = e.type === "grade.locked";
          return (
            <div key={i} style={S.event}>
              <div style={{ ...S.dot, borderColor: style.dot, ...(isLocked ? { background: style.dot } : {}) }} />
              <div style={S.eventMeta}>
                <span style={{ color: "#334155" }}>{fmtDate(e.date)}</span>
                {e.course && <span style={S.eventCourse}>{e.course}</span>}
                <span style={{ ...S.eventTypePill, background: style.pillBg, color: style.pillColor }}>{style.label}</span>
              </div>
              {e.title && <div style={S.eventTitle}>{e.title}</div>}
              {e.type === "slo.observed" && (
                <div style={S.eventTitle}>SLO {e.sloNum} — score {e.score}</div>
              )}
              {e.type === "grade.locked" && (
                <div style={S.eventTitle}>{e.course} final grade: {e.grade}</div>
              )}
              {e.type === "professionalism.observed" && (
                <div style={S.eventTitle}>Professionalism · {e.dimension} · score {e.score}</div>
              )}
              {e.type === "attendance.recorded" && (
                <div style={S.eventTitle}>Status: {e.status?.toUpperCase()}</div>
              )}
              {e.type === "incident.recorded" && (
                <div style={S.eventTitle}>Incident · severity: {e.severity}</div>
              )}
              {e.note && <div style={S.eventBody}>"{e.note}"</div>}
              {e.chainAnchor && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", fontFamily: "SF Mono, Menlo, monospace" }}>
                  Chain anchor: <b style={{ color: "#7C3AED" }}>{e.chainAnchor}</b> ✓ on Base · <b>Immutable</b>
                </div>
              )}
              {(e.site || e.instructor) && (
                <div style={{ ...S.eventBody, marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  {e.site && <>Site: {e.site}</>}
                  {e.site && e.instructor && " · "}
                  {e.instructor && <>Instructor: {e.instructor}</>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, fontSize: 12, color: "#64748b" }}>
        <b style={{ color: "#334155" }}>Why this view matters:</b> Every event is an append-only record. Locked grades anchored to a public chain — even Dr. Clearwater cannot modify them after lock. {student.displayName} can export this full record at any time as a FERPA-portable verified transcript. Multi-dimensional: not just SLO competency, but professionalism, attendance, and clinical incidents (including self-reported near-misses, counted as strengths). The instructor's recommendation is data-backed, not gut-based.
      </div>
    </div>
  );
}

function ReflectionsInbox({ data }) {
  // Placeholder — Sunday wire to real submissions
  return (
    <div>
      <h1 style={S.h1}>Reflections inbox</h1>
      <div style={S.subtitle}>4 reflections awaiting your review · Tanner framework rendering · sample data</div>
      <div style={S.demoBanner}>
        Wire to live `/v1/nurse-edu:reflection:list?status=pending` Sunday. Tonight: shows shape only.
      </div>
      <div style={S.card}>
        {[
          { name: "Maya L.",   course: "NURS 220", slo: "8.0", title: "Patient family meeting — managing emotional load", age: "12 days old", old: true },
          { name: "James C.",  course: "NURS 220", slo: "4.0", title: "Delegating wound care under time pressure", age: "5 days" },
          { name: "Sarah K.",  course: "NURS 230", slo: "9.0", title: "Triage decision-making in fast-paced ER environment", age: "2 days" },
          { name: "Aaron R.",  course: "NURS 320", slo: "7.0", title: "MMMG pediatric assessment with non-English-speaking family", age: "2 days" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{r.course} · SLO {r.slo} · {r.title}</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, fontWeight: 600, background: r.old ? "rgba(217, 119, 6, 0.12)" : "#f1f5f9", color: r.old ? "#D97706" : "#64748b" }}>{r.age}</div>
            <button style={{ background: "#7C3AED", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 5, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Grade now</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SLOLibrary({ data }) {
  const courses = (data.courses || []).slice().sort((a, b) => (a.courseCode > b.courseCode ? 1 : -1));
  const slos = data.slos || [];
  return (
    <div>
      <h1 style={S.h1}>SLO Library</h1>
      <div style={S.subtitle}>
        {slos.length} Student Learning Outcomes across {courses.length} courses · mapped to ANA Standards of Practice · authored by Dr. Ruthie Clearwater
      </div>
      {courses.map(c => {
        const courseSlos = slos.filter(s => s.courseCode === c.courseCode);
        return (
          <div key={c.id} style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <h3 style={{ ...S.cardTitle, marginBottom: 2 }}>{c.courseCode} — {c.courseName}</h3>
                <div style={{ fontSize: 11, color: "#64748b" }}>{courseSlos.length} SLOs · status: {c.status}</div>
              </div>
            </div>
            {courseSlos.map(s => (
              <div key={s.id} style={{ padding: "10px 18px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "60px 130px 1fr", gap: 12, alignItems: "start" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#7C3AED" }}>SLO {s.sloNumber}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.shortTitle}</div>
                <div style={{ fontSize: 13, color: "#475569" }}>{s.title}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function CohortsView({ data }) {
  const cohorts = data.cohorts || [];
  const studentsByCohort = {};
  (data.students || []).forEach(s => {
    studentsByCohort[s.cohort] = (studentsByCohort[s.cohort] || 0) + 1;
  });
  return (
    <div>
      <h1 style={S.h1}>Cohorts</h1>
      <div style={S.subtitle}>{cohorts.length} active cohorts · each cohort runs as its own workspace with role-scoped data</div>
      {cohorts.map(c => (
        <div key={c.id} style={S.card}>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{c.cohortName}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Status: {c.status} · {studentsByCohort[c.id] || 0} demo students · Legacy Sheet: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>{c.sheetIdLegacy?.slice(0, 24)}...</code>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTrail({ data }) {
  const entries = (data.logbookEntries || []).filter(e => ["grade.locked", "incident.recorded"].includes(e.type));
  return (
    <div>
      <h1 style={S.h1}>Audit Trail</h1>
      <div style={S.subtitle}>Every state-changing event timestamped, identity-verified, chain-anchored where applicable</div>
      <div style={S.card}>
        {entries.map((e, i) => (
          <div key={i} style={{ padding: "12px 18px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "100px 1fr 200px", gap: 12, alignItems: "center", fontSize: 12 }}>
            <div style={{ color: "#475569", fontFamily: "SF Mono, Menlo, monospace" }}>{e.date}</div>
            <div>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>{e.type}</div>
              <div style={{ color: "#64748b" }}>{e.instructor ? `${e.instructor} (verified)` : "system"} · {e.note?.slice(0, 60)}{e.note?.length > 60 ? "..." : ""}</div>
            </div>
            <div style={{ fontFamily: "SF Mono, Menlo, monospace", color: e.chainAnchor ? "#7C3AED" : "#94a3b8" }}>
              {e.chainAnchor ? `⚓ ${e.chainAnchor}` : "logged (no anchor)"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Student-facing translations: SLO short codes → plain-language domains.
// Students think in "how am I doing at X", not "SLO 7.0 Client Care."
const DOMAIN_LABEL = {
  "1.0": "Ethics & professionalism",
  "2.0": "Self-reflection",
  "3.0": "Evidence-based thinking",
  "4.0": "Leadership & delegation",
  "5.0": "Teamwork",
  "6.0": "Connecting patients to resources",
  "7.0": "Patient & family care",
  "8.0": "Communication",
  "9.0": "Clinical judgment",
};

// Friendly micro-coaching strings — what an instructor would say to a student
// looking at their growth area, in plain words.
const DOMAIN_COACHING = {
  "1.0": "When you notice an ethical tension, name it out loud in your team.",
  "2.0": "Try one small experiment each shift and write what you learned.",
  "3.0": "Before acting, ask: 'what does the evidence say?'",
  "4.0": "Try delegating one task this shift — start small, follow up after.",
  "5.0": "Brief the next shift on patient priorities — it builds your team voice.",
  "6.0": "When a patient mentions a barrier, look for one resource that helps.",
  "7.0": "Ask one extra question about your patient's day before you start care.",
  "8.0": "Mirror back what your patient says before responding — they'll feel heard.",
  "9.0": "After each priority decision, ask: 'why this one first?' That's judgment.",
};

function studentSummary(entries) {
  // Compute friendly strengths + growth areas from instructor observations
  const observations = entries.filter(e => e.type === "slo.observed" && typeof e.score === "number");
  const profObs = entries.filter(e => e.type === "professionalism.observed" && typeof e.score === "number");
  const incidents = entries.filter(e => e.type === "incident.recorded");
  const attended = entries.filter(e => e.type === "attendance.recorded" && e.status === "present").length;
  const missed = entries.filter(e => e.type === "attendance.recorded" && e.status === "absent").length;

  // Average score by domain (SLO short code)
  const bySloAvg = {};
  for (const o of observations) {
    if (!o.sloNum) continue;
    if (!bySloAvg[o.sloNum]) bySloAvg[o.sloNum] = { sum: 0, count: 0 };
    bySloAvg[o.sloNum].sum += o.score;
    bySloAvg[o.sloNum].count += 1;
  }
  const domainScores = Object.entries(bySloAvg).map(([slo, v]) => ({ slo, avg: v.sum / v.count }));
  domainScores.sort((a, b) => b.avg - a.avg);

  const strengths = domainScores.filter(d => d.avg >= 3.5).slice(0, 3);
  const growth = domainScores.filter(d => d.avg < 3).slice(0, 2);
  const profAvg = profObs.length ? (profObs.reduce((a, e) => a + e.score, 0) / profObs.length) : null;

  const recentObs = observations.slice(-3);
  const trending = recentObs.length >= 2 && recentObs.every((o, i) => i === 0 || o.score >= recentObs[i - 1].score);

  return { strengths, growth, profAvg, attended, missed, incidents: incidents.length, trending };
}

function StudentView({ data }) {
  // Student perspective — what Sarah K. sees when she logs in.
  // The student record is JOINT: Sarah submits reflections (Tanner framework)
  // and end-of-course evaluations, while instructors record SLO observations,
  // professionalism, attendance, and incidents. Both sides contribute events
  // to the same Academic Record DTC. This view surfaces Sarah's active role
  // (pending work + submit affordances) alongside the read-only instructor-
  // recorded events.
  //
  // CRITICAL DESIGN PRINCIPLE: Students don't speak in SLO/ANA/Tanner jargon.
  // They want to know "how am I doing" and "what do I do next to get better."
  // Translate everything into plain language + coaching.
  const sarah = (data.students || []).find(s => s.studentId === "stu_sarah");
  const entries = (data.logbookEntries || []).filter(e => e.studentId === "stu_sarah");
  if (!sarah) return <div style={{ padding: 24 }}>Demo student not found.</div>;

  const summary = studentSummary(entries);
  const lockedGrades = entries.filter(e => e.type === "grade.locked").length;
  const myReflections = entries.filter(e => e.type === "reflection.submitted").length;

  return (
    <div>
      {/* Demo-mode banner (small, honest) */}
      <div style={{ background: "#f8f5ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 11, color: "#5B21B6" }}>
        <b>Student preview · what Sarah K. sees when SHE logs in.</b> Real students arrive via invite → ID verify → academic record minted to their personal Vault (Sunday wire).
      </div>

      {/* THE HERO: "How you're doing" in plain language */}
      <div style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)", color: "#fff", borderRadius: 12, padding: "26px 28px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>
          Hi Sarah —
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 14, letterSpacing: "-0.01em" }}>
          You're doing well. {summary.trending ? "And growing." : "Keep building."}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 8 }}>
              What you're strong at
            </div>
            {summary.strengths.length === 0 && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>You're just getting started — patterns will show up in a few weeks.</div>
            )}
            {summary.strengths.map(s => (
              <div key={s.slo} style={{ fontSize: 13, marginBottom: 4 }}>
                ✓ {DOMAIN_LABEL[s.slo] || s.slo} <span style={{ color: "rgba(255,255,255,0.6)" }}>· avg {s.avg.toFixed(1)}/5</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 8 }}>
              Where to grow
            </div>
            {summary.growth.length === 0 && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>No growth flags right now. Keep showing up.</div>
            )}
            {summary.growth.map(g => (
              <div key={g.slo} style={{ fontSize: 13, marginBottom: 6 }}>
                <div>• {DOMAIN_LABEL[g.slo] || g.slo} <span style={{ color: "rgba(255,255,255,0.6)" }}>· avg {g.avg.toFixed(1)}/5</span></div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginLeft: 12, marginTop: 2, fontStyle: "italic" }}>{DOMAIN_COACHING[g.slo]}</div>
              </div>
            ))}
          </div>
        </div>

        {summary.attended > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
            <b>Attendance:</b> {summary.attended} present, {summary.missed} missed.
            {" "}<b>Self-reported near-misses:</b> {summary.incidents > 0 ? `${summary.incidents} (your instructors recognize self-reporting as a strength — it shows you noticed)` : "none"}.
          </div>
        )}
      </div>

      {/* What's next — clear actions */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "20px 22px", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "#0f172a" }}>
          What's next for you
        </div>

        {/* Pending reflection */}
        <div style={{ padding: "14px 16px", background: "linear-gradient(135deg, #fff, #FEF3C7)", border: "1px solid #FCD34D", borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#92400E", fontWeight: 700, marginBottom: 4 }}>FINISH BY FRIDAY · You started this one</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            Reflection: "Triage decision-making in the ER"
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
            You wrote the scenario. Now finish the next three steps: what you noticed → how you interpreted it → what you did → what you'd do differently. About 15 minutes.
          </div>
          <button style={{ background: "#7C3AED", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 5, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Continue writing →</button>
        </div>

        {/* End-of-course wrap-up */}
        <div style={{ padding: "14px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginBottom: 4 }}>NURS 220 FINISHED — REFLECT ON THE WHOLE COURSE</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            Course wrap-up: looking back on Health &amp; Illness I
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
            Your grade is locked. This wrap-up is for <i>you</i> — it goes on your record alongside what your instructors saw. Three questions: what surprised you, what you're proud of, what you want to bring into NURS 230.
          </div>
          <button style={{ background: "#fff", color: "#7C3AED", border: "1px solid #7C3AED", padding: "7px 12px", borderRadius: 5, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Start wrap-up →</button>
        </div>

        {/* This week's clinical */}
        {summary.growth.length > 0 && (
          <div style={{ padding: "14px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginBottom: 4 }}>SOMETHING TO TRY THIS WEEK</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              On your next ER shift…
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {DOMAIN_COACHING[summary.growth[0].slo]} Then write a quick reflection about it — that's where the growth shows up.
            </div>
          </div>
        )}

        {/* Start a fresh reflection — open affordance */}
        <button style={{ background: "transparent", color: "#7C3AED", border: "1px dashed #7C3AED", padding: "10px 14px", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer", width: "100%" }}>
          + Reflect on something else that happened
        </button>
      </div>

      {/* My record card — simpler than instructor view */}
      <div style={{ background: "linear-gradient(135deg, #0f172a, #2a1052)", color: "#fff", borderRadius: 10, padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 4 }}>
          My verified record
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
          This is yours. It follows you across every course and after you graduate.
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 12, lineHeight: 1.55 }}>
          You can show this record to a future employer or licensing board — they can verify it independently without going through your school's registrar. {myReflections} reflections you've written. {lockedGrades} courses locked and signed off. Nothing you've finished can be quietly changed later.
        </div>
        <button style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "7px 14px", borderRadius: 5, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          Export my record →
        </button>
      </div>

      {/* The full journey — same component as instructor view, but now framed as "your story so far" */}
      <div style={{ marginBottom: 8, paddingLeft: 4 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
          Your story so far
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
          Everything you've done + everything your instructors observed. Both sides write here. Past entries can't be changed.
        </div>
      </div>
      <StudentJourney data={data} studentId="stu_sarah" onBack={() => {}} />
    </div>
  );
}

export default function NursingEducationPanel() {
  const [activeTab, setActiveTab] = useState("students");
  const [focusedStudentId, setFocusedStudentId] = useState(null);
  const [viewMode, setViewMode] = useState("instructor"); // "instructor" | "student"
  const data = NURSING_DATA;

  const reflectionCount = (data.logbookEntries || []).filter(e => e.type === "reflection.submitted").length;
  const tabs = [
    { id: "students",   label: "Students" },
    { id: "reflections", label: "Reflections", badge: reflectionCount > 0 ? reflectionCount : null },
    { id: "cohorts",    label: "Cohorts" },
    { id: "slos",       label: "SLOs" },
    { id: "audit",      label: "Audit Trail" },
  ];

  return (
    <div style={S.wrap}>
      {/* View-mode toggle — preview student perspective vs instructor */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          <b style={{ color: "#334155" }}>View as:</b>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setViewMode("instructor")}
            style={{
              padding: "5px 12px", borderRadius: 5, border: "1px solid",
              borderColor: viewMode === "instructor" ? "#7C3AED" : "#cbd5e1",
              background: viewMode === "instructor" ? "#7C3AED" : "#fff",
              color: viewMode === "instructor" ? "#fff" : "#475569",
              fontWeight: 600, fontSize: 12, cursor: "pointer",
            }}
          >Instructor / Admin</button>
          <button
            onClick={() => setViewMode("student")}
            style={{
              padding: "5px 12px", borderRadius: 5, border: "1px solid",
              borderColor: viewMode === "student" ? "#7C3AED" : "#cbd5e1",
              background: viewMode === "student" ? "#7C3AED" : "#fff",
              color: viewMode === "student" ? "#fff" : "#475569",
              fontWeight: 600, fontSize: 12, cursor: "pointer",
            }}
          >Student (Sarah K.)</button>
        </div>
      </div>

      {viewMode === "student" ? (
        <StudentView data={data} />
      ) : (
        <>
          <div style={S.tabs}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setFocusedStudentId(null); }}
                style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }}
              >
                {t.label}
                {t.badge && (
                  <span style={{ background: "#7C3AED", color: "#fff", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "students" && !focusedStudentId && (
            <StudentList data={data} onPickStudent={(id) => setFocusedStudentId(id)} />
          )}
          {activeTab === "students" && focusedStudentId && (
            <StudentJourney data={data} studentId={focusedStudentId} onBack={() => setFocusedStudentId(null)} />
          )}
          {activeTab === "reflections" && <ReflectionsInbox data={data} />}
          {activeTab === "cohorts" && <CohortsView data={data} />}
          {activeTab === "slos" && <SLOLibrary data={data} />}
          {activeTab === "audit" && <AuditTrail data={data} />}
        </>
      )}
    </div>
  );
}
