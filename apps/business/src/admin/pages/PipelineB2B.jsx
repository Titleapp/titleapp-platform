import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import KanbanBoard from "../components/KanbanBoard";

const B2B_STAGES = [
  { id: "LEAD", label: "Lead" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "DEMO_SCHEDULED", label: "Demo Scheduled" },
  { id: "DEMO_COMPLETED", label: "Demo Completed" },
  { id: "PROPOSAL_SENT", label: "Proposal Sent" },
  { id: "NEGOTIATING", label: "Negotiating" },
  { id: "CLOSED_WON", label: "Closed Won" },
  { id: "ONBOARDING", label: "Onboarding" },
  { id: "ACTIVE", label: "Active" },
  { id: "CLOSED_LOST", label: "Closed Lost" },
];

function fmtDollars(n) {
  if (!n) return "--";
  return "$" + Number(n).toLocaleString();
}

function daysInStage(deal) {
  if (!deal.lastActivityAt) return 0;
  const last = deal.lastActivityAt.toDate ? deal.lastActivityAt.toDate() : new Date(deal.lastActivityAt);
  return Math.floor((Date.now() - last.getTime()) / 86400000);
}

export default function PipelineB2B() {
  const [deals, setDeals] = useState([]);
  const [tab, setTab] = useState("kanban");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "pipeline", "b2b", "deals"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDeals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function moveDeal(deal, newStage) {
    await updateDoc(doc(db, "pipeline", "b2b", "deals", deal.id), {
      stage: newStage,
      lastActivityAt: serverTimestamp(),
    });
  }

  // Revenue forecast
  const activeDeals = deals.filter((d) => !["CLOSED_LOST", "ACTIVE"].includes(d.stage));
  const weightedPipeline = activeDeals.reduce(
    (sum, d) => sum + (d.estimatedARR || 0) * (d.probability || 0),
    0
  );
  const totalPipeline = activeDeals.reduce(
    (sum, d) => sum + (d.estimatedARR || 0),
    0
  );

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">B2B Deals</h1>
        <p className="ac-page-subtitle">Enterprise pipeline and deal tracking</p>
      </div>

      <div className="ac-metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Active Deals</div>
          <div className="ac-metric-value">{activeDeals.length}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Total Pipeline</div>
          <div className="ac-metric-value">{fmtDollars(totalPipeline)}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Weighted Pipeline</div>
          <div className="ac-metric-value">{fmtDollars(weightedPipeline)}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Won</div>
          <div className="ac-metric-value" style={{ color: "#16a34a" }}>
            {deals.filter((d) => d.stage === "CLOSED_WON" || d.stage === "ACTIVE").length}
          </div>
        </div>
      </div>

      <div className="ac-tabs">
        <button className={`ac-tab ${tab === "kanban" ? "ac-tab-active" : ""}`} onClick={() => setTab("kanban")}>
          Kanban
        </button>
        <button className={`ac-tab ${tab === "table" ? "ac-tab-active" : ""}`} onClick={() => setTab("table")}>
          Table
        </button>
      </div>

      {tab === "kanban" && (
        <KanbanBoard
          stages={B2B_STAGES}
          items={deals}
          getStage={(d) => d.stage}
          onMoveItem={moveDeal}
          renderCard={(deal) => {
            const days = daysInStage(deal);
            const stalled = days >= 7;
            return (
              <div
                className={`ac-kanban-card ${stalled ? "ac-kanban-card-stalled" : ""}`}
                onClick={() => setSelected(deal)}
              >
                <div className="ac-kanban-card-title">{deal.company || deal.contactName}</div>
                <div className="ac-kanban-card-sub">
                  {deal.contactName} | {fmtDollars(deal.estimatedARR)} ARR
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "#94a3b8" }}>
                  <span>{deal.source || "--"}</span>
                  <span style={stalled ? { color: "#ef4444", fontWeight: 700 } : {}}>
                    {days}d in stage
                  </span>
                </div>
              </div>
            );
          }}
        />
      )}

      {tab === "table" && (
        <div className="ac-card">
          <div className="ac-card-body" style={{ padding: 0 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Stage</th>
                  <th>Est. ARR</th>
                  <th>Probability</th>
                  <th>Source</th>
                  <th>Days</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {deals.length === 0 && (
                  <tr><td colSpan="8" className="ac-empty">No deals yet.</td></tr>
                )}
                {deals.map((d) => (
                  <tr key={d.id} onClick={() => setSelected(d)} style={{ cursor: "pointer" }}>
                    <td style={{ fontWeight: 700 }}>{d.company || "--"}</td>
                    <td>{d.contactName}</td>
                    <td><span className="ac-badge">{d.stage}</span></td>
                    <td>{fmtDollars(d.estimatedARR)}</td>
                    <td>{d.probability ? `${Math.round(d.probability * 100)}%` : "--"}</td>
                    <td>{d.source || "--"}</td>
                    <td>{daysInStage(d)}d</td>
                    <td>{d.ownedBy || "alex"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deal Detail Modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center" }} onClick={() => setSelected(null)}>
          <div className="ac-card" style={{ width: "480px", maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="ac-card-header">
              <span className="ac-card-title">{selected.company || selected.contactName}</span>
              <button className="ac-btn ac-btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="ac-card-body">
              <div style={{ fontSize: "13px", lineHeight: "2" }}>
                <div><strong>Contact:</strong> {selected.contactName}</div>
                <div><strong>Company:</strong> {selected.company}</div>
                <div><strong>Vertical:</strong> {selected.vertical}</div>
                <div><strong>Stage:</strong> {selected.stage}</div>
                <div><strong>Est. ARR:</strong> {fmtDollars(selected.estimatedARR)}</div>
                <div><strong>Probability:</strong> {selected.probability ? `${Math.round(selected.probability * 100)}%` : "--"}</div>
                <div><strong>Source:</strong> {selected.source}</div>
                <div><strong>Owner:</strong> {selected.ownedBy || "alex"}</div>
                <div><strong>Next Action:</strong> {selected.nextAction || "None"}</div>
              </div>
              {selected.history && selected.history.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>History</div>
                  {selected.history.map((h, i) => (
                    <div key={i} style={{ fontSize: "12px", padding: "4px 0", borderBottom: "1px solid #f0f2f8" }}>
                      <span className="ac-badge ac-badge-info" style={{ marginRight: "6px" }}>{h.stage}</span>
                      {h.action} — {h.by}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                <button className="ac-btn ac-btn-primary ac-btn-sm">Take Over</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
