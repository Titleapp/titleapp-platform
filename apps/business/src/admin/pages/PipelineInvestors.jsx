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

const INVESTOR_STAGES = [
  { id: "PROSPECT", label: "Prospect" },
  { id: "DECK_VIEWED", label: "Deck Viewed" },
  { id: "ALEX_CHAT", label: "Alex Chat" },
  { id: "INTERESTED", label: "Interested" },
  { id: "SAFE_SENT", label: "SAFE Sent" },
  { id: "SAFE_SIGNED", label: "SAFE Signed" },
  { id: "FUNDED", label: "Funded" },
  { id: "POST_INVESTMENT", label: "Post-Investment" },
  { id: "PASSED", label: "Passed" },
];

const RAISE_GOAL = 1070000;

function fmtDollars(n) {
  if (!n) return "$0";
  return "$" + Number(n).toLocaleString();
}

export default function PipelineInvestors() {
  const [investors, setInvestors] = useState([]);
  const [tab, setTab] = useState("pipeline");
  const [raiseConfig, setRaiseConfig] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "pipeline", "investors", "deals"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvestors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Pull raise config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "raise"), (snap) => {
      if (snap.exists()) setRaiseConfig(snap.data());
    });
    return () => unsub();
  }, []);

  async function moveInvestor(investor, newStage) {
    await updateDoc(doc(db, "pipeline", "investors", "deals", investor.id), {
      stage: newStage,
      lastActivityAt: serverTimestamp(),
    });
  }

  const raiseGoal = raiseConfig?.goal || RAISE_GOAL;

  // Raise progress
  const funded = investors.filter((inv) =>
    ["SAFE_SIGNED", "FUNDED", "POST_INVESTMENT"].includes(inv.stage)
  );
  const totalRaised = raiseConfig?.totalRaised || funded.reduce((s, inv) => s + (inv.amount || 0), 0);
  const raisePercent = Math.min(100, Math.round((totalRaised / raiseGoal) * 100));
  const avgInvestment = funded.length > 0 ? totalRaised / funded.length : 0;

  const safeStatuses = {
    NOT_STARTED: investors.filter((i) => !["SAFE_SENT", "SAFE_SIGNED", "FUNDED", "POST_INVESTMENT"].includes(i.stage)).length,
    SENT: investors.filter((i) => i.stage === "SAFE_SENT").length,
    SIGNED: investors.filter((i) => i.stage === "SAFE_SIGNED").length,
    FUNDED: investors.filter((i) => i.stage === "FUNDED" || i.stage === "POST_INVESTMENT").length,
  };

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Investor Relations</h1>
        <p className="ac-page-subtitle">Raise progress, governance, and investor communications</p>
      </div>

      {/* Raise progress */}
      <div className="ac-card" style={{ marginBottom: "20px" }}>
        <div className="ac-card-body">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "20px" }}>
              {fmtDollars(totalRaised)} raised
            </span>
            <span style={{ color: "#64748b", fontSize: "14px" }}>
              of {fmtDollars(raiseGoal)} goal
            </span>
          </div>
          <div style={{ height: "12px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${raisePercent}%`,
              background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
              borderRadius: "6px",
              transition: "width 0.3s",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
            <span>{raisePercent}% complete</span>
            <span>{funded.length} investors | avg {fmtDollars(avgInvestment)}</span>
          </div>
        </div>
      </div>

      {/* SAFE status cards */}
      <div className="ac-metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "20px" }}>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Not Started</div>
          <div className="ac-metric-value">{safeStatuses.NOT_STARTED}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">SAFE Sent</div>
          <div className="ac-metric-value" style={{ color: "#d97706" }}>{safeStatuses.SENT}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">SAFE Signed</div>
          <div className="ac-metric-value" style={{ color: "#16a34a" }}>{safeStatuses.SIGNED}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Funded</div>
          <div className="ac-metric-value" style={{ color: "#7c3aed" }}>{safeStatuses.FUNDED}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ac-tabs">
        <button className={`ac-tab ${tab === "pipeline" ? "ac-tab-active" : ""}`} onClick={() => setTab("pipeline")}>Pipeline</button>
        <button className={`ac-tab ${tab === "governance" ? "ac-tab-active" : ""}`} onClick={() => setTab("governance")}>Governance</button>
        <button className={`ac-tab ${tab === "updates" ? "ac-tab-active" : ""}`} onClick={() => setTab("updates")}>Updates</button>
        <button className={`ac-tab ${tab === "voting" ? "ac-tab-active" : ""}`} onClick={() => setTab("voting")}>Voting</button>
        <button className={`ac-tab ${tab === "table" ? "ac-tab-active" : ""}`} onClick={() => setTab("table")}>Table</button>
      </div>

      {/* Pipeline / Kanban */}
      {tab === "pipeline" && (
        <KanbanBoard
          stages={INVESTOR_STAGES}
          items={investors}
          getStage={(inv) => inv.stage}
          onMoveItem={moveInvestor}
          renderCard={(inv) => (
            <div className="ac-kanban-card">
              <div className="ac-kanban-card-title">{inv.fullName}</div>
              <div className="ac-kanban-card-sub">
                {inv.amount ? fmtDollars(inv.amount) : "Amount TBD"} | {inv.source || "Direct"}
              </div>
              {inv.deckViewCount > 0 && (
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                  Deck viewed {inv.deckViewCount}x
                </div>
              )}
            </div>
          )}
        />
      )}

      {/* Governance */}
      {tab === "governance" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Governance</span>
          </div>
          <div className="ac-card-body">
            <div style={{ display: "grid", gap: "16px" }}>
              <div className="ac-card" style={{ background: "#f8fafc" }}>
                <div className="ac-card-body">
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Cap Table</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Manage equity ownership, SAFE conversions, and dilution modeling.
                    Cap table management will be available when the first SAFE is signed.
                  </div>
                </div>
              </div>
              <div className="ac-card" style={{ background: "#f8fafc" }}>
                <div className="ac-card-body">
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Proposals</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Create governance proposals for board votes, operational decisions, and policy changes.
                    No proposals yet.
                  </div>
                </div>
              </div>
              <div className="ac-card" style={{ background: "#f8fafc" }}>
                <div className="ac-card-body">
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Quorum Rules</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Default quorum: majority of voting shares. Configurable per proposal type.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Updates */}
      {tab === "updates" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Investor Updates</span>
          </div>
          <div className="ac-card-body">
            <div style={{ display: "grid", gap: "16px" }}>
              <div className="ac-card" style={{ background: "#f8fafc" }}>
                <div className="ac-card-body">
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Quarterly Updates</div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                    Draft and send quarterly investor updates. Alex can generate drafts based on platform metrics, revenue, and milestones.
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    No updates sent yet. First update due after first funded investor.
                  </div>
                </div>
              </div>
              <div className="ac-card" style={{ background: "#f8fafc" }}>
                <div className="ac-card-body">
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Ad-Hoc Communications</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Send targeted updates to specific investors or investor groups. Material events, milestone announcements, and follow-ups.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voting */}
      {tab === "voting" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Voting</span>
          </div>
          <div className="ac-card-body">
            <div style={{ display: "grid", gap: "16px" }}>
              <div className="ac-card" style={{ background: "#f8fafc" }}>
                <div className="ac-card-body">
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Active Votes</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    No active votes. Voting will be available once governance proposals are created.
                  </div>
                </div>
              </div>
              <div className="ac-card" style={{ background: "#f8fafc" }}>
                <div className="ac-card-body">
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Past Votes</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    No completed votes yet.
                  </div>
                </div>
              </div>
              <div className="ac-card" style={{ background: "#f8fafc" }}>
                <div className="ac-card-body">
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Participation</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Voter turnout and participation tracking will appear here once votes are conducted.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {tab === "table" && (
        <div className="ac-card">
          <div className="ac-card-body" style={{ padding: 0 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Stage</th>
                  <th>Amount</th>
                  <th>Accredited</th>
                  <th>Source</th>
                  <th>Deck Views</th>
                </tr>
              </thead>
              <tbody>
                {investors.length === 0 && (
                  <tr><td colSpan="7" className="ac-empty">No investors yet.</td></tr>
                )}
                {investors.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700 }}>{inv.fullName}</td>
                    <td>{inv.email}</td>
                    <td><span className="ac-badge">{inv.stage}</span></td>
                    <td>{inv.amount ? fmtDollars(inv.amount) : "--"}</td>
                    <td>
                      {inv.accredited ? (
                        <span className="ac-badge ac-badge-success">Yes</span>
                      ) : (
                        <span className="ac-badge">No</span>
                      )}
                    </td>
                    <td>{inv.source || "--"}</td>
                    <td>{inv.deckViewCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
