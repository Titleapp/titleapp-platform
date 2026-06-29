import React, { useState, useEffect, useCallback } from "react";
import CanvasCardShell from "./CanvasCardShell";
import { auth } from "../../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const GRADE_COLOR = {
  A: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
  B: { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
  C: { bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
  D: { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
  F: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
};

function gradeBadge(letter) {
  const base = letter ? letter[0].toUpperCase() : null;
  const c = GRADE_COLOR[base] || { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 32, borderRadius: 8,
      fontWeight: 800, fontSize: 14, fontFamily: "monospace",
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      flexShrink: 0,
    }}>{letter || "—"}</span>
  );
}

function metaChip({ label, value, color = "#64748b" }) {
  if (value == null || value === 0) return null;
  return (
    <span style={{ fontSize: 11, color, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 8px" }}>
      {label}: {value}
    </span>
  );
}

function ScoreBar({ score, max }) {
  if (score == null || !max) return null;
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? "#16a34a" : pct >= 70 ? "#d97706" : "#dc2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function CourseBlock({ course }) {
  const [open, setOpen] = useState(false);
  const hasEntries = course.assignments.length + course.assessments.length + course.reflections.length + course.competencies.length > 0;

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "12px 14px", background: open ? "#f8fafc" : "#fff",
          border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        {gradeBadge(course.finalGrade?.letterGrade)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{course.course}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 4 }}>
            {metaChip({ label: "Clinical hrs", value: course.clinicalHours })}
            {metaChip({ label: "Assignments", value: course.assignments.length })}
            {metaChip({ label: "Assessments", value: course.assessments.length })}
            {metaChip({ label: "Reflections", value: course.reflections.length })}
            {course.summary.assessmentAvg != null && metaChip({ label: "Avg score", value: `${course.summary.assessmentAvg}%`, color: course.summary.assessmentAvg >= 80 ? "#16a34a" : "#d97706" })}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", flexShrink: 0, transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && hasEntries && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 16 }}>
          {course.assessments.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Assessments</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {course.assessments.map((a, i) => (
                  <div key={i} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{a.data?.assessmentTitle}</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{a.data?.date}</span>
                    </div>
                    {a.data?.score != null && <ScoreBar score={a.data.score} max={a.data.maxScore || 100} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {course.assignments.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Assignments</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {course.assignments.map((a, i) => (
                  <div key={i} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{a.data?.assignmentTitle}</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{a.data?.submittedDate}</span>
                    </div>
                    {a.data?.score != null && <ScoreBar score={a.data.score} max={a.data.maxScore || 100} />}
                    {a.data?.feedback && <div style={{ marginTop: 6, fontSize: 12, color: "#475569", fontStyle: "italic" }}>{a.data.feedback}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {course.competencies.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Competencies</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {course.competencies.map((c, i) => {
                  const met = c.data?.level === "met" || c.data?.level === "exceeded";
                  return (
                    <span key={i} style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                      background: met ? "#dcfce7" : "#fef9c3", color: met ? "#15803d" : "#854d0e",
                      border: `1px solid ${met ? "#bbf7d0" : "#fef08a"}`,
                    }}>
                      {c.data?.criteriaLabel || c.data?.criteriaId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {course.clinicalHours > 0 && Object.keys(course.clinicalCategories).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Clinical Hours by Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(course.clinicalCategories).map(([cat, hrs]) => (
                  <span key={cat} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontWeight: 600 }}>
                    {cat}: {hrs}h
                  </span>
                ))}
              </div>
            </div>
          )}

          {course.reflections.length > 0 && (
            <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
              {course.reflections.length} reflection{course.reflections.length !== 1 ? "s" : ""} submitted
            </div>
          )}
        </div>
      )}

      {open && !hasEntries && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9", fontSize: 13, color: "#94a3b8" }}>
          No graded entries yet
        </div>
      )}
    </div>
  );
}

async function fetchTranscript(dtcId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const tenantId = localStorage.getItem("TENANT_ID") || "sociii-inc";
  const res = await fetch(`${API_BASE}/api?path=/v1/nurse-edu:transcript&dtcId=${encodeURIComponent(dtcId)}`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });
  return res.json();
}

export default function StudentTranscriptCard({ resolved, context, onDismiss }) {
  const dtcId = context?.payload?.dtcId;
  const [data, setData] = useState(context?.payload?.transcript || null);
  const [loading, setLoading] = useState(!context?.payload?.transcript);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!dtcId) { setLoading(false); setError("No student record selected."); return; }
    try {
      const r = await fetchTranscript(dtcId);
      if (r.ok) setData(r);
      else setError(r.error || "Failed to load transcript");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [dtcId]);

  useEffect(() => { if (!data) load(); }, [data, load]);

  return (
    <CanvasCardShell title="Student Transcript" onDismiss={onDismiss}>
      {loading && <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading transcript…</div>}
      {!loading && error && <div style={{ padding: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>{error}</div>}

      {!loading && !error && data && (
        <>
          {/* Header summary */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            {data.gpa != null && (
              <div style={{ padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#15803d" }}>{data.gpa}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Cumulative GPA</div>
              </div>
            )}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                <strong style={{ color: "#1e293b" }}>{data.courses?.length || 0}</strong> course{data.courses?.length !== 1 ? "s" : ""}
                {data.gradedCourseCount > 0 && ` · ${data.gradedCourseCount} graded`}
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                <strong style={{ color: "#1e293b" }}>{data.totalEntries || 0}</strong> total logbook entries
              </div>
            </div>
          </div>

          {/* Per-course accordion */}
          {(data.courses || []).length > 0 ? (
            data.courses.map((c, i) => <CourseBlock key={i} course={c} />)
          ) : (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>No course records yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                When your instructor records assessments, reflections, and clinical hours, they'll appear here by course.
              </div>
            </div>
          )}
        </>
      )}
    </CanvasCardShell>
  );
}
