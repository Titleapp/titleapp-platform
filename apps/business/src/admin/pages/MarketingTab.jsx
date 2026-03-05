import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

function relativeTime(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

function fmtDate(ts) {
  if (!ts) return "--";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ScoreBadge({ score }) {
  if (score == null) return <span className="ac-badge">--</span>;
  const n = Number(score);
  let color, bg, border;
  if (n >= 70) {
    color = "#059669";
    bg = "rgba(5,150,105,0.06)";
    border = "rgba(5,150,105,0.3)";
  } else if (n >= 40) {
    color = "#d97706";
    bg = "rgba(217,119,6,0.06)";
    border = "rgba(217,119,6,0.3)";
  } else {
    color = "#dc2626";
    bg = "rgba(220,38,38,0.06)";
    border = "rgba(220,38,38,0.3)";
  }
  return (
    <span
      className="ac-badge"
      style={{ color, background: bg, borderColor: border }}
    >
      {n}
    </span>
  );
}

export default function MarketingTab() {
  const [leads, setLeads] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [tab, setTab] = useState("pipeline");
  const [expandedRow, setExpandedRow] = useState(null);

  // Real-time leads subscription
  useEffect(() => {
    const q = query(
      collection(db, "leads"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Promo codes (one-time load)
  useEffect(() => {
    async function fetchPromoCodes() {
      try {
        const snap = await getDocs(collection(db, "promoCodes"));
        setPromoCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("[MarketingTab] promoCodes fetch error:", err);
      }
    }
    fetchPromoCodes();
  }, []);

  // Computed metrics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const leadsToday = leads.filter((l) => {
    if (!l.createdAt) return false;
    const d = l.createdAt.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
    return d >= todayStart;
  }).length;

  const scores = leads.map((l) => l.score).filter((s) => s != null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + Number(b), 0) / scores.length)
      : 0;

  // Top vertical by count
  const verticalCounts = {};
  leads.forEach((l) => {
    if (l.vertical) {
      verticalCounts[l.vertical] = (verticalCounts[l.vertical] || 0) + 1;
    }
  });
  const topVertical =
    Object.keys(verticalCounts).length > 0
      ? Object.entries(verticalCounts).sort((a, b) => b[1] - a[1])[0][0]
      : "--";

  const maxVerticalCount = Math.max(...Object.values(verticalCounts), 1);

  const VERTICALS = [
    "auto",
    "title-escrow",
    "property-management",
    "developers",
    "pilot",
  ];

  async function togglePromoCode(code) {
    try {
      const current = promoCodes.find((p) => p.id === code.id);
      await updateDoc(doc(db, "promoCodes", code.id), {
        active: !current.active,
      });
      setPromoCodes((prev) =>
        prev.map((p) =>
          p.id === code.id ? { ...p, active: !p.active } : p
        )
      );
    } catch (err) {
      console.warn("[MarketingTab] toggle promo error:", err);
    }
  }

  const tabs = [
    { id: "pipeline", label: "Pipeline" },
    { id: "by-vertical", label: "By Vertical" },
    { id: "promo-codes", label: "Promo Codes" },
    { id: "live-feed", label: "Live Feed" },
  ];

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Marketing</h1>
        <p className="ac-page-subtitle">
          Lead pipeline, campaigns, and promo codes
        </p>
      </div>

      {/* Sub-tab navigation */}
      <div className="ac-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`ac-tab ${tab === t.id ? "ac-tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pipeline Tab */}
      {tab === "pipeline" && (
        <div>
          <div
            className="ac-metrics"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            <div className="ac-metric-card">
              <div className="ac-metric-label">Total Leads</div>
              <div className="ac-metric-value">{leads.length}</div>
            </div>
            <div className="ac-metric-card">
              <div className="ac-metric-label">Leads Today</div>
              <div className="ac-metric-value">{leadsToday}</div>
            </div>
            <div className="ac-metric-card">
              <div className="ac-metric-label">Avg Score</div>
              <div className="ac-metric-value">{avgScore || "--"}</div>
            </div>
            <div className="ac-metric-card">
              <div className="ac-metric-label">Top Vertical</div>
              <div className="ac-metric-value" style={{ fontSize: 16 }}>
                {topVertical}
              </div>
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="ac-card">
              <div className="ac-card-body">
                <div className="ac-empty">
                  No leads yet. Leads will appear here as they come in from the
                  landing page and campaigns.
                </div>
              </div>
            </div>
          ) : (
            <div className="ac-card">
              <div className="ac-card-body" style={{ padding: 0 }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="ac-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Vertical</th>
                        <th>Source</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <React.Fragment key={lead.id}>
                          <tr
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              setExpandedRow(
                                expandedRow === lead.id ? null : lead.id
                              )
                            }
                          >
                            <td>{lead.email || "--"}</td>
                            <td>{lead.name || lead.displayName || "--"}</td>
                            <td>
                              {lead.vertical ? (
                                <span className="ac-badge">
                                  {lead.vertical}
                                </span>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td>{lead.source || lead.utm_source || "--"}</td>
                            <td>
                              <ScoreBadge score={lead.score} />
                            </td>
                            <td>
                              <span
                                className={`ac-badge ${
                                  lead.status === "converted"
                                    ? "ac-badge-success"
                                    : lead.status === "contacted"
                                    ? "ac-badge-info"
                                    : ""
                                }`}
                              >
                                {lead.status || "new"}
                              </span>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {fmtDate(lead.createdAt)}
                            </td>
                          </tr>
                          {expandedRow === lead.id && (
                            <tr>
                              <td
                                colSpan={7}
                                style={{
                                  background: "#fbfcff",
                                  padding: "12px 14px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr 1fr",
                                    gap: "8px",
                                    fontSize: 12,
                                    color: "#64748b",
                                  }}
                                >
                                  <div>
                                    <strong>UTM Source:</strong>{" "}
                                    {lead.utm_source || "--"}
                                  </div>
                                  <div>
                                    <strong>UTM Medium:</strong>{" "}
                                    {lead.utm_medium || "--"}
                                  </div>
                                  <div>
                                    <strong>UTM Campaign:</strong>{" "}
                                    {lead.utm_campaign || "--"}
                                  </div>
                                  <div>
                                    <strong>Promo Code:</strong>{" "}
                                    {lead.promo_code || "--"}
                                  </div>
                                  <div>
                                    <strong>Headline Index:</strong>{" "}
                                    {lead.headline_index != null
                                      ? lead.headline_index
                                      : "--"}
                                  </div>
                                  <div>
                                    <strong>Company:</strong>{" "}
                                    {lead.company || "--"}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* By Vertical Tab */}
      {tab === "by-vertical" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Leads by Vertical</span>
          </div>
          <div className="ac-card-body">
            {Object.keys(verticalCounts).length === 0 ? (
              <div className="ac-empty">
                No leads with vertical data yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {VERTICALS.map((v) => {
                  const count = verticalCounts[v] || 0;
                  return (
                    <div key={v}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1a202c",
                        }}
                      >
                        <span>{v}</span>
                        <span>{count}</span>
                      </div>
                      <div
                        style={{
                          height: 24,
                          background: "#f1f5f9",
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(count / maxVerticalCount) * 100}%`,
                            background: "#7c3aed",
                            borderRadius: 6,
                            transition: "width 0.3s ease",
                            minWidth: count > 0 ? 4 : 0,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {/* Show any additional verticals not in the default list */}
                {Object.entries(verticalCounts)
                  .filter(([v]) => !VERTICALS.includes(v))
                  .map(([v, count]) => (
                    <div key={v}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1a202c",
                        }}
                      >
                        <span>{v}</span>
                        <span>{count}</span>
                      </div>
                      <div
                        style={{
                          height: 24,
                          background: "#f1f5f9",
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(count / maxVerticalCount) * 100}%`,
                            background: "#7c3aed",
                            borderRadius: 6,
                            transition: "width 0.3s ease",
                            minWidth: 4,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Promo Codes Tab */}
      {tab === "promo-codes" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Promo Codes</span>
          </div>
          <div className="ac-card-body" style={{ padding: 0 }}>
            {promoCodes.length === 0 ? (
              <div className="ac-empty">
                No promo codes configured. Add promo codes in Firestore to
                manage them here.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Description</th>
                      <th>Vertical</th>
                      <th>Active</th>
                      <th>Redemptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoCodes.map((code) => (
                      <tr key={code.id}>
                        <td style={{ fontWeight: 700, fontFamily: "monospace" }}>
                          {code.code || code.id}
                        </td>
                        <td>{code.description || "--"}</td>
                        <td>
                          {code.vertical ? (
                            <span className="ac-badge">{code.vertical}</span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td>
                          <button
                            className={`ac-toggle ${
                              code.active ? "ac-toggle-on" : ""
                            }`}
                            onClick={() => togglePromoCode(code)}
                            aria-label={
                              code.active ? "Deactivate" : "Activate"
                            }
                          />
                        </td>
                        <td>{code.redemptions || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Feed Tab */}
      {tab === "live-feed" && (
        <div>
          {leads.length === 0 ? (
            <div className="ac-card">
              <div className="ac-card-body">
                <div className="ac-empty">
                  No lead activity yet. New leads will appear here in real time.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {leads.slice(0, 20).map((lead) => (
                <div key={lead.id} className="ac-card">
                  <div className="ac-card-body" style={{ padding: "12px 18px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#0f172a" }}>
                        <strong>{lead.name || lead.email || "Unknown"}</strong>
                        {" from "}
                        <span style={{ color: "#64748b" }}>
                          {lead.company || lead.vertical || "unknown"}
                        </span>
                        {" just submitted on "}
                        <span style={{ color: "#7c3aed", fontWeight: 600 }}>
                          /{lead.vertical || "general"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          whiteSpace: "nowrap",
                          marginLeft: 12,
                        }}
                      >
                        {relativeTime(lead.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
