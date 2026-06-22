/**
 * EduCohortCard.jsx — EDU-001 CVT Exam Prep Worker (instructor view).
 * Signal: card:edu-cohort   Data: live (buildEduCohortPayload → /edu:cohort)
 *
 * Dr. Chen's cohort dashboard: who's on track, who's at risk, weak domains
 * flagged, a featured student (Alex), and tamper-evident completion records.
 * payload.view = dashboard | cohort | curriculum | records.
 */

import React, { useState } from "react";
import CanvasCardShell from "./CanvasCardShell";

function domainLabel(d) {
  return String(d || "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function daysUntil(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  return isNaN(ms) ? null : Math.ceil(ms / 86400000);
}

function Kpis({ kpis }) {
  if (!kpis?.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length},1fr)`, gap: 12, marginBottom: 18 }}>
      {kpis.map((k, i) => (
        <div key={i} style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{k.label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", minWidth: 80 }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color || "#7c3aed", borderRadius: 4 }} />
    </div>
  );
}
function WeakBadge({ d }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color: "#b45309", background: "#fffbeb", border: "1px solid #fef3c7", padding: "1px 7px", borderRadius: 20 }}>{domainLabel(d)}</span>;
}
function scoreColor(s) { return s >= 80 ? "#16a34a" : s >= 70 ? "#7c3aed" : s >= 60 ? "#d97706" : "#dc2626"; }

function FeaturedStudent({ s }) {
  const [sent, setSent] = useState(false);
  if (!s) return null;
  const countdown = daysUntil(s.exam_date);
  return (
    <div style={{ border: "1px solid #ede9fe", borderRadius: 14, padding: 16, marginBottom: 18, background: "linear-gradient(135deg,#faf5ff,#eff6ff)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5 }}>Featured student</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{s.student_name}</div>
        </div>
        {countdown != null && <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{countdown}d</div><div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>to exam</div></div>}
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ minWidth: 130 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Modules {s.modules_completed}/{s.modules_total}</div>
          <ProgressBar pct={(s.modules_completed / s.modules_total) * 100} />
        </div>
        <div><div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>CE hours</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{s.ce_hours_earned} / {s.ce_hours_total}</div></div>
        <div><div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Overall</div><div style={{ fontSize: 14, fontWeight: 700, color: scoreColor(s.overall_practice_score_pct) }}>{s.overall_practice_score_pct}%</div></div>
      </div>
      {Array.isArray(s.weak_domains) && s.weak_domains.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "#64748b", marginRight: 8 }}>⚠ Weak spots:</span>
          {s.weak_domains.map((d, i) => <span key={i} style={{ marginRight: 6 }}><WeakBadge d={d} /></span>)}
        </div>
      )}
      {sent ? (
        <div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>✓ Message sent to {s.student_name.split(" ")[0]}</div>
      ) : (
        <button onClick={() => setSent(true)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Message {s.student_name.split(" ")[0]} about weak spots
        </button>
      )}
    </div>
  );
}

function StudentRow({ s }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
          {s.student_name}
          {s.at_risk && <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", padding: "1px 7px", borderRadius: 20, marginLeft: 8 }}>AT RISK</span>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>{(s.weak_domains || []).map((d, i) => <WeakBadge key={i} d={d} />)}</div>
      </div>
      <div style={{ width: 90 }}><ProgressBar pct={(s.modules_completed / s.modules_total) * 100} color={scoreColor(s.overall_practice_score_pct)} /><div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{s.modules_completed}/{s.modules_total} modules</div></div>
      <div style={{ width: 52, textAlign: "right" }}><div style={{ fontSize: 15, fontWeight: 800, color: scoreColor(s.overall_practice_score_pct) }}>{s.overall_practice_score_pct}%</div></div>
    </div>
  );
}

export default function EduCohortCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const view = p.view || "dashboard";

  return (
    <CanvasCardShell title={p.title || "CVT Exam Prep"} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
      {view === "dashboard" && (
        <>
          <Kpis kpis={p.kpis} />
          <FeaturedStudent s={p.featured} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Cohort · most at risk first</div>
          {(p.students || []).map((s, i) => <StudentRow key={s.enrollment_id || i} s={s} />)}
        </>
      )}

      {view === "records" && (
        <>
          <div style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            🔒 Tamper-evident — each completion is written to the student's own Vault, owned by them for life.
          </div>
          {(p.completions || []).map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 18 }}>📜</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{c.module_name}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{domainLabel(c.vtne_domain)} · {c.completed_at} · {c.ce_hours_awarded} CE hrs</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor(c.practice_score_pct) }}>{c.practice_score_pct}%</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: 20 }}>HASH ANCHORED</span>
            </div>
          ))}
        </>
      )}

      {view === "cohort" && p.analytics && (
        <>
          <Kpis kpis={[
            { label: "Avg completion", value: `${p.analytics.avg_completion_pct}%` },
            { label: "Avg score", value: `${p.analytics.avg_practice_score_pct}%` },
            { label: "At risk", value: String(p.analytics.at_risk_students) },
            { label: "CE issued", value: `${p.analytics.ce_hours_issued_total}h` },
          ]} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Where the cohort struggles — your curriculum signal</div>
          {(p.analytics.weak_domains_aggregate || []).map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 150, fontSize: 13, color: "#334155" }}>{domainLabel(w.domain)}</span>
              <div style={{ flex: 1 }}><ProgressBar pct={w.avg_score_pct} color={scoreColor(w.avg_score_pct)} /></div>
              <span style={{ width: 44, fontSize: 13, fontWeight: 700, color: scoreColor(w.avg_score_pct), textAlign: "right" }}>{w.avg_score_pct}%</span>
            </div>
          ))}
        </>
      )}

      {view === "curriculum" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
          {(p.modules || []).map((m, i) => (
            <div key={i} style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Week {m.week} · {m.ce_hours} CE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "3px 0" }}>{m.module_number}. {m.module_name}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{domainLabel(m.vtne_domain)} · ~{m.estimated_time_minutes} min</div>
            </div>
          ))}
        </div>
      )}
    </CanvasCardShell>
  );
}
