import React, { useState, useEffect } from "react";
import * as api from "../api/client";

/**
 * Analyst - AI-powered deal vetting and analysis
 * Uses Analyst RAAS rules for evidence-first screening
 */
export default function Analyst() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [filterRisk, setFilterRisk] = useState("all");
  const [dealInput, setDealInput] = useState({
    companyName: "",
    industry: "",
    askAmount: "",
    dealType: "series_a",
    summary: "",
  });

  const vertical = localStorage.getItem("VERTICAL") || "analyst";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "GLOBAL";

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getAnalyzedDeals({ vertical, jurisdiction });
      setDeals(result.deals || []);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load deals:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeDeal(e) {
    e.preventDefault();
    setAnalyzing(true);
    setError("");

    try {
      const result = await api.analyzeDeal({
        vertical,
        jurisdiction,
        deal: dealInput,
      });

      // Reload deals to show the new analysis
      await loadDeals();

      // Show the analysis result
      setSelectedDeal(result.analysis);
      setShowUploadModal(false);

      // Reset form
      setDealInput({
        companyName: "",
        industry: "",
        askAmount: "",
        dealType: "series_a",
        summary: "",
      });
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to analyze deal:", e);
    } finally {
      setAnalyzing(false);
    }
  }

  const filteredDeals = filterRisk === "all"
    ? deals
    : deals.filter(d => {
        const score = d.analysis?.riskScore || 0;
        if (filterRisk === "high") return score >= 70;
        if (filterRisk === "medium") return score >= 40 && score < 70;
        if (filterRisk === "low") return score < 40;
        return true;
      });

  const stats = {
    total: deals.length,
    invest: deals.filter(d => d.analysis?.recommendation === "INVEST").length,
    pass: deals.filter(d => d.analysis?.recommendation === "PASS").length,
    wait: deals.filter(d => d.analysis?.recommendation === "WAIT").length,
  };

  function getRiskColor(score) {
    if (score >= 70) return "#ef4444";
    if (score >= 40) return "#f59e0b";
    return "#10b981";
  }

  function getRiskLabel(score) {
    if (score >= 70) return "High Risk";
    if (score >= 40) return "Medium Risk";
    return "Low Risk";
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Analyst</h1>
          <p className="subtle">AI-powered deal vetting with RAAS validation</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => setShowUploadModal(true)}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + Analyze Deal
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "12px",
            color: "#dc2626",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Analyzed</div>
          <div className="kpiValue">{stats.total}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Invest</div>
          <div className="kpiValue" style={{ color: "#10b981" }}>{stats.invest}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Pass</div>
          <div className="kpiValue" style={{ color: "#ef4444" }}>{stats.pass}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Wait</div>
          <div className="kpiValue" style={{ color: "#f59e0b" }}>{stats.wait}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
        <button
          className={filterRisk === "all" ? "iconBtn" : "iconBtn"}
          onClick={() => setFilterRisk("all")}
          style={{
            background: filterRisk === "all" ? "var(--accent)" : "transparent",
            color: filterRisk === "all" ? "white" : "inherit",
          }}
        >
          All Deals ({deals.length})
        </button>
        <button
          className="iconBtn"
          onClick={() => setFilterRisk("high")}
          style={{
            background: filterRisk === "high" ? "#ef4444" : "transparent",
            color: filterRisk === "high" ? "white" : "inherit",
          }}
        >
          High Risk
        </button>
        <button
          className="iconBtn"
          onClick={() => setFilterRisk("medium")}
          style={{
            background: filterRisk === "medium" ? "#f59e0b" : "transparent",
            color: filterRisk === "medium" ? "white" : "inherit",
          }}
        >
          Medium Risk
        </button>
        <button
          className="iconBtn"
          onClick={() => setFilterRisk("low")}
          style={{
            background: filterRisk === "low" ? "#10b981" : "transparent",
            color: filterRisk === "low" ? "white" : "inherit",
          }}
        >
          Low Risk
        </button>
      </div>

      {/* Deals Table */}
      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading analyzed deals...
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="card" style={{ padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            No deals analyzed yet
          </p>
          <p style={{ color: "var(--textMuted)", marginBottom: "16px" }}>
            Upload your first deal to see AI-powered analysis with RAAS validation
          </p>
          <button
            className="iconBtn"
            onClick={() => setShowUploadModal(true)}
            style={{
              background: "var(--accent)",
              color: "white",
              borderColor: "var(--accent)",
            }}
          >
            Analyze Your First Deal
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Ask</th>
                  <th>Risk Score</th>
                  <th>Recommendation</th>
                  <th>Analyzed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <tr key={deal.id}>
                    <td className="tdStrong">{deal.dealInput?.companyName || "Unknown"}</td>
                    <td>{deal.dealInput?.industry || "-"}</td>
                    <td className="tdMuted">{deal.dealInput?.askAmount || "-"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: getRiskColor(deal.analysis?.riskScore || 0),
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{deal.analysis?.riskScore || 0}/100</span>
                        <span className="tdMuted">({getRiskLabel(deal.analysis?.riskScore || 0)})</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${deal.analysis?.recommendation === "INVEST" ? "completed" : deal.analysis?.recommendation === "PASS" ? "" : "processing"}`}
                      >
                        {deal.analysis?.emoji || ""} {deal.analysis?.recommendation || "WAIT"}
                      </span>
                    </td>
                    <td className="tdMuted">
                      {deal.analyzedAt?.seconds
                        ? new Date(deal.analyzedAt.seconds * 1000).toLocaleDateString()
                        : new Date(deal.analyzedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="iconBtn"
                        onClick={() => setSelectedDeal(deal)}
                        style={{ fontSize: "12px" }}
                      >
                        View Analysis
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cardHeader">
              <div className="cardTitle">Analyze New Deal</div>
              <button className="iconBtn" onClick={() => setShowUploadModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAnalyzeDeal} style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={dealInput.companyName}
                  onChange={(e) => setDealInput({ ...dealInput, companyName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Industry
                </label>
                <input
                  type="text"
                  required
                  value={dealInput.industry}
                  onChange={(e) => setDealInput({ ...dealInput, industry: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  placeholder="SaaS, FinTech, Healthcare, etc."
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Ask Amount
                </label>
                <input
                  type="text"
                  required
                  value={dealInput.askAmount}
                  onChange={(e) => setDealInput({ ...dealInput, askAmount: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  placeholder="$5M"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Deal Type
                </label>
                <select
                  value={dealInput.dealType}
                  onChange={(e) => setDealInput({ ...dealInput, dealType: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                >
                  <option value="seed">Seed</option>
                  <option value="series_a">Series A</option>
                  <option value="series_b">Series B</option>
                  <option value="series_c">Series C+</option>
                  <option value="pe_buyout">PE Buyout</option>
                  <option value="refinance">Refinance</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Deal Summary / Pitch
                </label>
                <textarea
                  required
                  value={dealInput.summary}
                  onChange={(e) => setDealInput({ ...dealInput, summary: e.target.value })}
                  rows={8}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    fontFamily: "inherit",
                  }}
                  placeholder="Paste pitch deck summary, exec summary, or key details about the deal..."
                />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="iconBtn"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="iconBtn"
                  disabled={analyzing}
                  style={{
                    background: "var(--accent)",
                    color: "white",
                    borderColor: "var(--accent)",
                  }}
                >
                  {analyzing ? "Analyzing..." : "Analyze with AI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analysis Detail Modal */}
      {selectedDeal && (() => {
        // Normalize data access - handle both direct analysis object and full deal object
        const analysis = selectedDeal.analysis || selectedDeal;
        const dealInfo = selectedDeal.dealInput || selectedDeal;

        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "grid",
              placeItems: "center",
              zIndex: 1000,
              padding: "20px",
            }}
            onClick={() => setSelectedDeal(null)}
          >
            <div
              className="card"
              style={{
                maxWidth: "800px",
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">
                    {analysis.emoji || "📊"} {dealInfo.companyName || "Deal"} - Analysis
                  </div>
                  <div className="cardSub">{dealInfo.industry || "-"} • {dealInfo.askAmount || "-"}</div>
                </div>
                <button className="iconBtn" onClick={() => setSelectedDeal(null)}>
                  ✕
                </button>
              </div>

              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Risk Score */}
                <div
                  style={{
                    padding: "16px",
                    background: `${getRiskColor(analysis.riskScore || 0)}15`,
                    border: `2px solid ${getRiskColor(analysis.riskScore || 0)}`,
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                        RISK SCORE
                      </div>
                      <div style={{ fontSize: "32px", fontWeight: 700, color: getRiskColor(analysis.riskScore || 0) }}>
                        {analysis.riskScore || 0}/100
                      </div>
                      <div style={{ fontSize: "14px", color: "var(--textMuted)" }}>
                        {getRiskLabel(analysis.riskScore || 0)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                        RECOMMENDATION
                      </div>
                      <div
                        className={`badge badge-${analysis.recommendation === "INVEST" ? "completed" : analysis.recommendation === "PASS" ? "" : "processing"}`}
                        style={{ fontSize: "18px", padding: "8px 16px" }}
                      >
                        {analysis.emoji || ""} {analysis.recommendation || "WAIT"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                {analysis.summary && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "8px" }}>AI Summary</div>
                    <div style={{ color: "var(--textMuted)", lineHeight: "1.6" }}>
                      {analysis.summary}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                {analysis.evidence && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "12px" }}>Evidence Analysis</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {analysis.evidence.positive?.length > 0 && analysis.evidence.positive.map((text, i) => (
                        <div
                          key={`pos-${i}`}
                          style={{
                            padding: "12px",
                            background: "#f0fdf4",
                            border: "1px solid #86efac",
                            borderRadius: "8px",
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <div style={{ fontSize: "16px" }}>✅</div>
                          <div style={{ flex: 1, fontSize: "14px" }}>{text}</div>
                        </div>
                      ))}
                      {analysis.evidence.negative?.length > 0 && analysis.evidence.negative.map((text, i) => (
                        <div
                          key={`neg-${i}`}
                          style={{
                            padding: "12px",
                            background: "#fef2f2",
                            border: "1px solid #fca5a5",
                            borderRadius: "8px",
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <div style={{ fontSize: "16px" }}>❌</div>
                          <div style={{ flex: 1, fontSize: "14px" }}>{text}</div>
                        </div>
                      ))}
                      {analysis.evidence.neutral?.length > 0 && analysis.evidence.neutral.map((text, i) => (
                        <div
                          key={`neu-${i}`}
                          style={{
                            padding: "12px",
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <div style={{ fontSize: "16px" }}>ℹ️</div>
                          <div style={{ flex: 1, fontSize: "14px" }}>{text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multi-Angle Analysis */}
                {analysis.multiAngleAnalysis && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "12px" }}>Multi-Angle Analysis</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {Object.entries(analysis.multiAngleAnalysis).map(([angle, assessment]) => (
                        <div key={angle} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)", marginBottom: "4px", textTransform: "uppercase" }}>
                            {angle.replace(/([A-Z])/g, " $1").trim()}
                          </div>
                          <div style={{ fontSize: "14px", lineHeight: "1.5" }}>{assessment}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk-Scaled Alternatives */}
                {analysis.riskScaledAlternatives && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "12px" }}>Risk-Scaled Deal Structures</div>
                    <div style={{ display: "grid", gap: "12px" }}>
                      {["lowRisk", "mediumRisk", "highRisk"].map((level) => {
                        const alt = analysis.riskScaledAlternatives[level];
                        if (!alt) return null;
                        const colors = {
                          lowRisk: { bg: "#f0fdf4", border: "#86efac", label: "Low Risk" },
                          mediumRisk: { bg: "#fffbeb", border: "#fcd34d", label: "Medium Risk" },
                          highRisk: { bg: "#fef2f2", border: "#fca5a5", label: "High Risk" },
                        };
                        const color = colors[level];
                        return (
                          <div
                            key={level}
                            style={{
                              padding: "12px",
                              background: color.bg,
                              border: `2px solid ${color.border}`,
                              borderRadius: "8px",
                            }}
                          >
                            <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>
                              {color.label}
                            </div>
                            <div style={{ fontSize: "13px", marginBottom: "4px" }}>
                              <strong>Structure:</strong> {alt.structure}
                            </div>
                            <div style={{ fontSize: "13px", marginBottom: "4px" }}>
                              <strong>Terms:</strong> {alt.terms}
                            </div>
                            <div style={{ fontSize: "13px" }}>
                              <strong>Expected Return:</strong> {alt.expectedReturn}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Key Metrics */}
                {analysis.keyMetrics && Object.keys(analysis.keyMetrics).length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "12px" }}>Key Metrics</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                      {Object.entries(analysis.keyMetrics).map(([key, value]) => (
                        <div key={key} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px", textTransform: "uppercase" }}>
                            {key.replace(/_/g, " ")}
                          </div>
                          <div style={{ fontSize: "16px", fontWeight: 600 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "12px" }}>Recommended Next Steps</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {analysis.nextSteps.map((step, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "start" }}>
                          <div style={{ color: "var(--accent)", fontWeight: 600 }}>{i + 1}.</div>
                          <div style={{ flex: 1 }}>{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Info */}
                {analysis.missingInfo && analysis.missingInfo.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "12px", color: "#dc2626" }}>Missing Critical Information</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {analysis.missingInfo.map((info, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "12px",
                            background: "#fef2f2",
                            border: "1px solid #fca5a5",
                            borderRadius: "8px",
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <div style={{ fontSize: "16px" }}>⚠️</div>
                          <div style={{ flex: 1, fontSize: "14px" }}>{info}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
