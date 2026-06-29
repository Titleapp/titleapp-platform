// CECourseCanvas.jsx — S52.49 (v2, post canvas red-team)
// NV Real Estate CE worker canvas (re-ce-nevada-001). Fixes from Claude's
// red-team: (1) binding-constraint-FIRST readiness, (2) Course split into
// LIVE / ON-DEMAND sections with a HARD GATE on on-demand at the 18-hr cap
// (a warning won't stop the binge — only a lock will), (3) "Reporting" tab
// with a submitted→confirmed status badge (not "Filed" = reads as done),
// (4) "Done" shows the finish line, never the deficit, (5) accessibility:
// text labels (not color/emoji alone), role="alert", short tab labels.
// The single highest-leverage anxiety fix — the NRED-confirmation push/email —
// lives OUTSIDE the canvas (see grounding/notifications); flagged in the spec.

import React, { useState } from "react";
import MapCard from "../components/canvas/MapCard";

const C = {
  green: { dot: "#16a34a", text: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  amber: { dot: "#d97706", text: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  red:   { dot: "#dc2626", text: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  slate: { dot: "#94a3b8", text: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
  accent: "#7c3aed",
};

const TOTAL = 36, LIVE_REQ = 18, ONDEMAND_CAP = 18, DEADLINE = "Dec 31", DAYS_LEFT = 47;

// SAMPLE — deliberately the instructive state: lots of on-demand done, LIVE is
// the binding constraint (you "binged" and now you're blocked on webinars).
const LIVE_MODULES = [
  { id: "L1", title: "Agency Relationships & Disclosure", cat: "Agency", hrs: 3, status: "credited" },
  { id: "L2", title: "Ethics & Professional Conduct", cat: "Ethics", hrs: 3, status: "credited" },
  { id: "L3", title: "Contracts & Purchase Agreements", cat: "Contracts", hrs: 6, status: "scheduled", when: "Wed Nov 19 · 9:00a HT" },
  { id: "L4", title: "Risk Reduction in Practice", cat: "Risk", hrs: 3, status: "scheduled", when: "Wed Nov 26 · 9:00a HT" },
  { id: "L5", title: "Nevada Market & Practice", cat: "General", hrs: 3, status: "scheduled", when: "Wed Dec 3 · 9:00a HT" },
];
const OND_MODULES = [
  { id: "O1", title: "Nevada Law & Legislation Update", cat: "Law", hrs: 3, status: "credited" },
  { id: "O2", title: "Fair Housing & Consumer Protection", cat: "General", hrs: 7, status: "credited" },
  { id: "O3", title: "Disclosures & Property Condition", cat: "General", hrs: 8, status: "inprogress", pos: 6, len: 8, unit: "hrs" },
];
const liveDone = LIVE_MODULES.filter((m) => m.status === "credited").reduce((s, m) => s + m.hrs, 0);     // 6
const liveLeft = LIVE_REQ - liveDone;                                                                     // 12
const ondDone = OND_MODULES.reduce((s, m) => s + (m.status === "credited" ? m.hrs : m.status === "inprogress" ? m.pos : 0), 0); // 16
const ondLocked = ondDone >= ONDEMAND_CAP;
const totalDone = liveDone + ondDone;                                                                     // 22
const NEXT_LIVE = LIVE_MODULES.find((m) => m.status === "scheduled");

const TABS = [{ id: "readiness", label: "Readiness" }, { id: "course", label: "Course" }, { id: "reporting", label: "Reporting" }, { id: "done", label: "Done" }];

function Ring({ pct, label, sub, band }) {
  const b = C[band]; const r = 46, circ = 2 * Math.PI * r, off = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
      <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="11" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={b.dot} strokeWidth="11" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: b.text, lineHeight: 1 }}>{label}</div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function ModuleRow({ m, live: _live, locked, onPlay }) {
  const credited = m.status === "credited";
  const b = credited ? C.green : m.status === "scheduled" ? C.accent : m.status === "inprogress" ? C.amber : C.slate;
  const disabled = locked && m.status === "notstarted";
  return (
    <div onClick={() => !disabled && onPlay && onPlay(m)} style={{ display: "flex", gap: 11, alignItems: "center", padding: "11px 13px", borderRadius: 10, background: disabled ? "#f8fafc" : "#fff", border: "1px solid #f1f5f9", borderLeft: `3px solid ${b.dot}`, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{m.title}</div>
        <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{m.cat} · {m.hrs} hr{m.hrs > 1 ? "s" : ""}</div>
        {m.status === "inprogress" && (
          <div style={{ marginTop: 6 }}>
            <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${Math.round((m.pos / m.len) * 100)}%`, height: "100%", background: C.amber.dot }} /></div>
            <div style={{ fontSize: 11, color: C.amber.text, marginTop: 3 }}>{m.pos} of {m.len} {m.unit || "min"} · resume</div>
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {credited && <span style={{ fontSize: 11.5, fontWeight: 700, color: C.green.text }}>✓ {m.hrs} hrs credited</span>}
        {m.status === "scheduled" && (<><button style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer" }}>Register</button><div style={{ fontSize: 10.5, color: "#64748b", marginTop: 4 }}>{m.when}</div></>)}
        {m.status === "inprogress" && <span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>Resume ▸</span>}
        {m.status === "notstarted" && <span style={{ fontSize: 12, fontWeight: 600, color: disabled ? "#cbd5e1" : "#94a3b8" }}>{disabled ? "Locked" : "Start ▸"}</span>}
      </div>
    </div>
  );
}

export default function CECourseCanvas() {
  const [tab, setTab] = useState("readiness");
  const [_active, setActive] = useState(OND_MODULES.find((m) => m.status === "inprogress") || LIVE_MODULES[0]);
  const overallPct = Math.round((totalDone / TOTAL) * 100);

  // Binding constraint FIRST (Claude #1/#7): live deficit leads when present.
  const liveBinding = liveDone < LIVE_REQ;
  const vBand = totalDone >= TOTAL && !liveBinding ? "green" : DAYS_LEFT < 21 ? "red" : "amber";

  // Reporting status (Claude #4): submitted vs NRED-confirmed.
  const credited = [...LIVE_MODULES, ...OND_MODULES].filter((m) => m.status === "credited");
  const confirmedCount = credited.length - 1; // sample: all but the most recent confirmed

  return (
    <div style={{ padding: "8px 4px", maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: "#0f172a" }}>Nevada RE License Renewal</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.amber.text, background: C.amber.bg, border: `1px solid ${C.amber.border}`, borderRadius: 999, padding: "3px 10px" }}>SAMPLE</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <MapCard resolved={{ region: "Nevada", mapType: "roadmap" }} />
      </div>

      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #f1f5f9", marginBottom: 16, overflowX: "auto" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", fontSize: 13, fontWeight: tab === t.id ? 600 : 500, cursor: "pointer", background: "none", border: "none", whiteSpace: "nowrap", color: tab === t.id ? C.accent : "#64748b", borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent" }}>{t.label}</button>
        ))}
      </div>

      {/* READINESS — binding constraint leads */}
      {tab === "readiness" && (
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", padding: "18px", background: C[vBand].bg, border: `1px solid ${C[vBand].border}`, borderRadius: 14 }}>
          <Ring pct={overallPct} label={`${totalDone}/${TOTAL}`} sub="hours" band={vBand} />
          <div style={{ flex: 1, minWidth: 220 }}>
            {liveBinding ? (
              <>
                <div role="alert" style={{ fontSize: 18, fontWeight: 800, color: C.amber.text }}><span aria-hidden="true">🔴 </span>You need {liveLeft} more LIVE hours</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Only scheduled webinars count — register and you're on your way. <span style={{ color: "#64748b" }}>({totalDone} of {TOTAL} total · renew by {DEADLINE} · {DAYS_LEFT} days)</span></div>
                <button onClick={() => setTab("course")} style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>Register for a live webinar →</button>
              </>
            ) : totalDone < TOTAL ? (
              <><div style={{ fontSize: 18, fontWeight: 800, color: C[vBand].text }}>Almost there — {TOTAL - totalDone} hours to go</div><button onClick={() => setTab("course")} style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>Continue course →</button></>
            ) : (
              <><div style={{ fontSize: 18, fontWeight: 800, color: C.amber.text }}>Clear — pending state confirmation</div><div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>All hours done. We've filed with NRED; you're clear once the state confirms (usually 3–5 days). We'll notify you.</div></>
            )}
          </div>
        </div>
      )}

      {/* COURSE — split LIVE / ON-DEMAND, hard gate on-demand */}
      {tab === "course" && (
        <div>
          {/* pinned meter — binding constraint emphasized; long warning line CUT (structure carries it) */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 14px", background: liveBinding ? C.amber.bg : C.green.bg, border: `1px solid ${liveBinding ? C.amber.border : C.green.border}`, borderRadius: 12, marginBottom: 16, position: "sticky", top: 0, zIndex: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: liveBinding ? C.amber.text : C.green.text }}><span aria-hidden="true">🔴 </span>LIVE {liveDone}/{LIVE_REQ}</span>
            <span style={{ width: 1, height: 16, background: "#e2e8f0" }} />
            <span style={{ fontSize: 12.5, color: "#334155" }}>On-demand {ondDone}/{ONDEMAND_CAP} max</span>
            <span style={{ width: 1, height: 16, background: "#e2e8f0" }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Total {totalDone}/{TOTAL}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: DAYS_LEFT < 21 ? C.red.text : "#64748b" }}>{DEADLINE} · {DAYS_LEFT}d</span>
          </div>

          {/* LIVE first when it's the bottleneck */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            <span aria-hidden="true">🔴 </span>Live webinars — {liveLeft} hrs remaining {NEXT_LIVE && <span style={{ color: "#64748b", fontWeight: 600, textTransform: "none" }}>· next: {NEXT_LIVE.when}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {LIVE_MODULES.map((m) => <ModuleRow key={m.id} m={m} live onPlay={setActive} />)}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>📺 On-demand — watch anytime ({ondDone}/{ONDEMAND_CAP} max)</div>
          {ondLocked && <div role="alert" style={{ padding: "10px 12px", background: C.slate.bg, border: `1px solid ${C.slate.border}`, borderRadius: 8, fontSize: 12.5, color: "#475569", marginBottom: 8 }}><strong>On-demand limit reached (18 hrs max).</strong> Your remaining hours must be live webinars — register above.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {OND_MODULES.map((m) => <ModuleRow key={m.id} m={m} locked={ondLocked} onPlay={setActive} />)}
          </div>
        </div>
      )}

      {/* REPORTING — submitted → NRED confirmed (text labels, not color alone) */}
      {tab === "reporting" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: confirmedCount === credited.length ? C.green.bg : C.amber.bg, border: `1px solid ${confirmedCount === credited.length ? C.green.border : C.amber.border}`, borderRadius: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: confirmedCount === credited.length ? C.green.text : C.amber.text }}>{confirmedCount === credited.length ? "✅ All completions confirmed by NRED — you're clear" : `⏳ ${confirmedCount} of ${credited.length} completions confirmed by NRED`}</span>
            {confirmedCount < credited.length && <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#64748b" }}>check back in 3–5 days</span>}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>NRED owns the credential — we make sure your completions post. "Submitted" isn't "confirmed."</div>
          {credited.map((m, i) => {
            const conf = i < confirmedCount;
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderRadius: 10, background: "#fff", border: "1px solid #f1f5f9", marginBottom: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{m.title}<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}> · {m.hrs} hrs</span></div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: conf ? C.green.text : C.amber.text, background: conf ? C.green.bg : C.amber.bg, border: `1px solid ${conf ? C.green.border : C.amber.border}`, borderRadius: 999, padding: "3px 10px" }}>{conf ? "✓ Confirmed" : "⏳ Submitted — awaiting"}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* DONE — the finish line, never the deficit */}
      {tab === "done" && (
        <div style={{ textAlign: "center", padding: "32px 18px" }}>
          <div style={{ fontSize: 44, opacity: 0.5 }}>🎓</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>Your certificate is waiting</div>
          <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 8, lineHeight: 1.6, maxWidth: 430, margin: "8px auto 0" }}>Finish your hours and get NRED confirmation — then this page becomes your proof that <strong>you're clear for another two years.</strong> We'll text and email you the moment the state confirms.</div>
          <button onClick={() => setTab(liveBinding ? "course" : "course")} style={{ marginTop: 18, fontSize: 13, fontWeight: 600, color: "#fff", background: C.accent, border: "none", borderRadius: 8, padding: "11px 20px", cursor: "pointer" }}>{liveBinding ? "Register for a live webinar →" : "Continue course →"}</button>
        </div>
      )}
    </div>
  );
}
