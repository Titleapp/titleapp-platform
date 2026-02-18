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
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [pinnedAnalysis, setPinnedAnalysis] = useState(null); // { dealInfo, analysis } — persists while chatting
  const [showOutreachModal, setShowOutreachModal] = useState(null); // { dealInfo, analysis }
  const [outreachText, setOutreachText] = useState("");
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [outreachMethod, setOutreachMethod] = useState("email"); // "email" | "text"

  const vertical = localStorage.getItem("VERTICAL") || "analyst";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "GLOBAL";

  const ACCEPTED_TYPES = ".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg";
  const ACCEPTED_MIME = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/png",
    "image/jpeg",
  ];

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

  function handleFileSelected(file) {
    if (!file) return;
    setUploadedFile(file);

    // Read file content for text-based files and try to auto-populate fields
    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result || "";
        setDealInput((prev) => ({
          ...prev,
          summary: prev.summary || text.slice(0, 5000),
        }));
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf") {
      // PDF text extraction requires server-side processing
      setDealInput((prev) => ({
        ...prev,
        summary: prev.summary || `[Uploaded: ${file.name}]`,
      }));
    } else {
      setDealInput((prev) => ({
        ...prev,
        summary: prev.summary || `[Uploaded: ${file.name}]`,
      }));
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (ACCEPTED_TYPES.split(",").includes(ext) || ACCEPTED_MIME.includes(file.type)) {
        handleFileSelected(file);
      } else {
        setError("Unsupported file type. Please upload PDF, Excel, CSV, Word, or image files.");
      }
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

  function generateReportHtml(dealInfo, analysis) {
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const companyName = localStorage.getItem("COMPANY_NAME") || localStorage.getItem("TENANT_NAME") || "";
    const positives = (analysis.evidence?.positive || []).map(t => `<li style="color:#059669">${t}</li>`).join("");
    const negatives = (analysis.evidence?.negative || []).map(t => `<li style="color:#dc2626">${t}</li>`).join("");
    const neutrals = (analysis.evidence?.neutral || []).map(t => `<li style="color:#6b7280">${t}</li>`).join("");
    const steps = (analysis.nextSteps || []).map((s, i) => `<li>${s}</li>`).join("");
    const missing = (analysis.missingInfo || []).map(m => `<li>${m}</li>`).join("");
    const metrics = analysis.keyMetrics ? Object.entries(analysis.keyMetrics).map(([k, v]) =>
      `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:600;text-transform:capitalize">${k.replace(/_/g, " ")}</td><td style="padding:6px 12px;border:1px solid #e5e7eb">${v}</td></tr>`
    ).join("") : "";

    // Multi-angle analysis sections
    const multiAngle = analysis.multiAngleAnalysis ? Object.entries(analysis.multiAngleAnalysis).map(([angle, assessment]) =>
      `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase;margin-bottom:4px">${angle.replace(/([A-Z])/g, " $1").trim()}</div><p style="margin:0;font-size:14px">${assessment}</p></div>`
    ).join("") : "";

    // Risk-scaled alternatives
    const alternatives = analysis.riskScaledAlternatives ? ["lowRisk", "mediumRisk", "highRisk"].map(level => {
      const alt = analysis.riskScaledAlternatives[level];
      if (!alt) return "";
      const labels = { lowRisk: "Low Risk", mediumRisk: "Medium Risk", highRisk: "High Risk" };
      return `<div style="margin-bottom:12px;padding:12px;background:#f8fafc;border-radius:8px"><div style="font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:6px">${labels[level]}</div><div style="font-size:13px"><strong>Structure:</strong> ${alt.structure}</div><div style="font-size:13px"><strong>Terms:</strong> ${alt.terms}</div><div style="font-size:13px"><strong>Expected Return:</strong> ${alt.expectedReturn}</div></div>`;
    }).join("") : "";

    return `<!DOCTYPE html><html><head><title>${dealInfo.companyName || "Deal"} - Analysis Report</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1e293b;line-height:1.6}
h1{font-size:24px;margin:0}h2{font-size:16px;color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:4px;margin-top:32px}
.header{border-bottom:3px solid #7c3aed;padding-bottom:16px;margin-bottom:24px}
.header-top{display:flex;justify-content:space-between;align-items:flex-start}
.branding{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;color:#6b7280}
.meta{color:#6b7280;font-size:14px}.score-box{text-align:center;padding:16px 24px;border-radius:12px;border:2px solid}
.score{font-size:36px;font-weight:700}.rec{font-size:14px;font-weight:600;padding:4px 12px;border-radius:4px;display:inline-block;margin-top:4px}
table{border-collapse:collapse;width:100%}ul{padding-left:20px}li{margin:4px 0}
.disclaimer{margin-top:40px;padding:16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#6b7280}
.download-btn{display:inline-block;padding:10px 24px;background:#7c3aed;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:24px}
.download-btn:hover{background:#6d28d9}
@media print{.download-btn{display:none !important}.no-print{display:none !important}body{margin:20px}}
</style></head><body>
<button class="download-btn no-print" onclick="window.print()">Download PDF</button>
<div class="header">
<div class="branding"><div>${companyName ? `<strong>${companyName}</strong>` : ""}</div><div>Prepared by TitleApp AI</div></div>
<div class="header-top"><div><h1>${dealInfo.companyName || "Deal"} - Analysis Report</h1>
<div class="meta">${dealInfo.industry || ""} ${dealInfo.askAmount ? "| " + dealInfo.askAmount : ""} ${dealInfo.dealType ? "| " + dealInfo.dealType.replace(/_/g, " ") : ""}</div>
<div class="meta">${date}</div></div>
<div class="score-box" style="border-color:${analysis.riskScore >= 70 ? "#ef4444" : analysis.riskScore >= 40 ? "#f59e0b" : "#10b981"}">
<div class="score" style="color:${analysis.riskScore >= 70 ? "#ef4444" : analysis.riskScore >= 40 ? "#f59e0b" : "#10b981"}">${analysis.riskScore || 0}/100</div>
<div class="rec" style="background:${analysis.recommendation === "INVEST" ? "#f0fdf4;color:#059669" : analysis.recommendation === "PASS" ? "#fef2f2;color:#dc2626" : "#fffbeb;color:#d97706"}">${analysis.recommendation || "WAIT"}</div>
</div></div></div>
${analysis.summary ? `<h2>Executive Summary</h2><p>${analysis.summary}</p>` : ""}
${positives || negatives || neutrals ? `<h2>Evidence Analysis</h2><ul>${positives}${negatives}${neutrals}</ul>` : ""}
${metrics ? `<h2>Key Metrics</h2><table>${metrics}</table>` : ""}
${multiAngle ? `<h2>Multi-Angle Analysis</h2>${multiAngle}` : ""}
${alternatives ? `<h2>Risk-Scaled Deal Structures</h2>${alternatives}` : ""}
${steps ? `<h2>Recommended Next Steps</h2><ol>${steps}</ol>` : ""}
${missing ? `<h2>Missing Information</h2><ul>${missing}</ul>` : ""}
<div class="disclaimer">This analysis is AI-generated and should be verified independently. It does not constitute financial advice. Generated by TitleApp AI on ${date}.</div>
<script>document.title="${(dealInfo.companyName || "Deal").replace(/"/g, "")} - Analysis Report"</script></body></html>`;
  }

  async function generateOutreachMessage(dealInfo, analysis) {
    setGeneratingOutreach(true);
    const missing = (analysis.missingInfo || []).map((m, i) => `${i + 1}. ${m}`).join("\n");
    const draft = `Dear [Sponsor Name],

Thank you for sharing the ${dealInfo.companyName || ""} ${dealInfo.dealType ? dealInfo.dealType.replace(/_/g, " ") : "deal"} opportunity. We have completed our initial review and are interested in moving forward.

To advance our evaluation, we require the following information:

${missing}

Please send these materials at your earliest convenience. We are targeting a decision within [timeframe] and complete documentation will allow us to proceed efficiently.

Best regards,
[Your Name]
[Your Firm]`;
    setOutreachText(draft);
    setGeneratingOutreach(false);
  }

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

      {/* Pinned Analysis — stays visible while discussing with AI */}
      {pinnedAnalysis && (() => {
        const pa = pinnedAnalysis.analysis;
        const pd = pinnedAnalysis.dealInfo;
        return (
          <div
            className="card"
            style={{ marginBottom: "16px", border: `2px solid ${getRiskColor(pa.riskScore || 0)}` }}
          >
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px" }}>{pd.companyName || "Deal"}</div>
                  <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                    {pd.industry || ""}{pd.askAmount ? " | " + pd.askAmount : ""} | Discussing with AI
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: getRiskColor(pa.riskScore || 0) }}>
                      {pa.riskScore || 0}/100
                    </div>
                    <div
                      className={`badge badge-${pa.recommendation === "INVEST" ? "completed" : pa.recommendation === "PASS" ? "" : "processing"}`}
                      style={{ fontSize: "12px" }}
                    >
                      {pa.recommendation || "WAIT"}
                    </div>
                  </div>
                  <button
                    className="iconBtn"
                    onClick={() => setPinnedAnalysis(null)}
                    style={{ fontSize: "14px", padding: "4px 8px" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {pa.summary && (
                <div style={{ fontSize: "13px", color: "var(--textMuted)", lineHeight: "1.5" }}>
                  {pa.summary}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className="iconBtn"
                  onClick={() => { setSelectedDeal(pinnedAnalysis); setPinnedAnalysis(null); }}
                  style={{ fontSize: "12px" }}
                >
                  View Full Analysis
                </button>
                <button
                  className="iconBtn"
                  onClick={() => {
                    const reportHtml = generateReportHtml(pd, pa);
                    const win = window.open("", "_blank");
                    win.document.write(reportHtml);
                    win.document.close();
                  }}
                  style={{ fontSize: "12px" }}
                >
                  Export Report
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
          <div style={{ fontSize: "24px", fontWeight: 600, color: "#64748b", marginBottom: "16px" }}>Analyst</div>
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
                  <tr key={deal.id} onClick={() => setSelectedDeal(deal)} style={{ cursor: "pointer" }}>
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
                      {(() => {
                        const at = deal.analyzedAt || deal.createdAt;
                        if (!at) return "Today";
                        if (at.seconds) return new Date(at.seconds * 1000).toLocaleDateString();
                        if (at._seconds) return new Date(at._seconds * 1000).toLocaleDateString();
                        const d = new Date(at);
                        return isNaN(d.getTime()) ? "Today" : d.toLocaleDateString();
                      })()}
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
                  inputMode="numeric"
                  required
                  value={dealInput.askAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const formatted = raw ? "$" + Number(raw).toLocaleString() : "";
                    setDealInput({ ...dealInput, askAmount: formatted });
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  placeholder="$5,000,000"
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
                  <optgroup label="Venture / PE">
                    <option value="seed">Seed</option>
                    <option value="series_a">Series A</option>
                    <option value="series_b">Series B</option>
                    <option value="series_c">Series C+</option>
                    <option value="pe_buyout">PE Buyout</option>
                  </optgroup>
                  <optgroup label="Real Estate">
                    <option value="acquisition">Acquisition</option>
                    <option value="development">Development</option>
                    <option value="value_add">Value-Add</option>
                    <option value="sale_leaseback">Sale-Leaseback</option>
                    <option value="multifamily">Multifamily</option>
                    <option value="office">Office</option>
                    <option value="retail">Retail</option>
                    <option value="industrial">Industrial</option>
                    <option value="hospitality">Hospitality</option>
                    <option value="mixed_use">Mixed-Use</option>
                    <option value="land">Land</option>
                    <option value="sfr_portfolio">Single-Family Portfolio</option>
                  </optgroup>
                  <optgroup label="Debt / Other">
                    <option value="refinance">Refinance</option>
                    <option value="bridge_loan">Bridge Loan</option>
                    <option value="mezzanine">Mezzanine</option>
                    <option value="joint_venture">Joint Venture</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Deal Summary / Pitch
                </label>
                <textarea
                  required={!uploadedFile}
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

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Or Upload Document
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("deal-file-input")?.click()}
                  style={{
                    width: "100%",
                    padding: uploadedFile ? "12px" : "28px 12px",
                    borderRadius: "12px",
                    border: dragging ? "2px dashed var(--accent)" : "2px dashed var(--line)",
                    background: dragging ? "rgba(124,58,237,0.04)" : "transparent",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                >
                  {uploadedFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px" }}>
                        {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--textMuted)" }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ color: "var(--textMuted)", fontSize: "13px" }}>
                      <div style={{ marginBottom: "4px", fontWeight: 500 }}>Drag and drop a file here, or click to browse</div>
                      <div style={{ fontSize: "12px" }}>PDF, Excel, CSV, Word, or images</div>
                    </div>
                  )}
                </div>
                <input
                  id="deal-file-input"
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="iconBtn"
                  onClick={() => setShowUploadModal(false)}
                  disabled={analyzing}
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
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {analyzing ? (
                    <>
                      <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Analyzing...
                    </>
                  ) : "Analyze with AI"}
                </button>
              </div>
              {analyzing && (
                <div style={{ padding: "16px", background: "#f8f4ff", borderRadius: "12px", border: "1px solid #e9d5ff", textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: "var(--accent)", fontWeight: 600, marginBottom: "8px" }}>
                    AI is analyzing this deal
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Screening against your criteria, checking evidence, evaluating risk...
                  </div>
                  <div style={{ marginTop: "12px", height: "3px", background: "#e9d5ff", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", background: "var(--accent)", borderRadius: "2px", animation: "analyzeProgress 3s ease-in-out infinite" }} />
                  </div>
                </div>
              )}
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes analyzeProgress {
                  0% { transform: translateX(-100%); }
                  50% { transform: translateX(0%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>
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
                    {dealInfo.companyName || "Deal"} - Analysis
                  </div>
                  <div className="cardSub">{dealInfo.industry || "-"} • {dealInfo.askAmount || "-"}</div>
                </div>
                <button className="iconBtn" onClick={() => setSelectedDeal(null)}>
                  ✕
                </button>
              </div>

              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Action Buttons - at top for immediate access */}
                <div style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}>
                  <button
                    className="iconBtn"
                    onClick={() => {
                      const name = dealInfo.companyName || "this deal";
                      window.dispatchEvent(new CustomEvent('ta:chatPrompt', {
                        detail: {
                          message: `Let's discuss the ${name} analysis. Risk score is ${analysis.riskScore}/100 (${analysis.recommendation}). What are the key risks I should focus on?`,
                          dealContext: {
                            companyName: dealInfo.companyName,
                            industry: dealInfo.industry,
                            askAmount: dealInfo.askAmount,
                            riskScore: analysis.riskScore,
                            recommendation: analysis.recommendation,
                            summary: analysis.summary,
                            positiveEvidence: analysis.evidence?.positive,
                            negativeEvidence: analysis.evidence?.negative,
                            missingInfo: analysis.missingInfo,
                            nextSteps: analysis.nextSteps,
                          }
                        }
                      }));
                      // Pin the analysis so it stays visible while chatting
                      setPinnedAnalysis({ dealInfo, analysis });
                      setSelectedDeal(null);
                    }}
                    style={{
                      background: "var(--accent)",
                      color: "white",
                      borderColor: "var(--accent)",
                      flex: "1 1 auto",
                    }}
                  >
                    Discuss with AI
                  </button>
                  <button
                    className="iconBtn"
                    onClick={() => {
                      const reportHtml = generateReportHtml(dealInfo, analysis);
                      const win = window.open("", "_blank");
                      win.document.write(reportHtml);
                      win.document.close();
                    }}
                    style={{ flex: "1 1 auto" }}
                  >
                    Export Report
                  </button>
                  {analysis.missingInfo && analysis.missingInfo.length > 0 && (
                    <button
                      className="iconBtn"
                      onClick={() => {
                        setShowOutreachModal({ dealInfo, analysis });
                        generateOutreachMessage(dealInfo, analysis);
                      }}
                      style={{ flex: "1 1 auto", color: "#dc2626", borderColor: "#fca5a5" }}
                    >
                      Request Missing Info
                    </button>
                  )}
                </div>

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
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#10b981" }}>+</div>
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
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#dc2626" }}>-</div>
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
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#f59e0b" }}>!</div>
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

      {/* Outreach Modal */}
      {showOutreachModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1100,
            padding: "20px",
          }}
          onClick={() => setShowOutreachModal(null)}
        >
          <div
            className="card"
            style={{ maxWidth: "600px", width: "100%", maxHeight: "90vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cardHeader">
              <div className="cardTitle">Request Missing Information</div>
              <button className="iconBtn" onClick={() => setShowOutreachModal(null)}>✕</button>
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Send Method Toggle */}
              <div style={{ display: "flex", gap: "0", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setOutreachMethod("email")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    background: outreachMethod === "email" ? "var(--accent)" : "transparent",
                    color: outreachMethod === "email" ? "white" : "inherit",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Send via Email
                </button>
                <button
                  type="button"
                  onClick={() => setOutreachMethod("text")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    borderLeft: "1px solid var(--line)",
                    background: outreachMethod === "text" ? "var(--accent)" : "transparent",
                    color: outreachMethod === "text" ? "white" : "inherit",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Send via Text
                </button>
              </div>

              {generatingOutreach ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}>
                  Generating outreach message...
                </div>
              ) : (
                <>
                  <textarea
                    value={outreachText}
                    onChange={(e) => setOutreachText(e.target.value)}
                    rows={outreachMethod === "text" ? 8 : 16}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      resize: "vertical",
                    }}
                  />
                  {outreachMethod === "text" && (
                    <div style={{ fontSize: "12px", color: "var(--textMuted)", textAlign: "right" }}>
                      {outreachText.length} characters
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      className="iconBtn"
                      onClick={() => {
                        navigator.clipboard.writeText(outreachText);
                        const btn = document.activeElement;
                        btn.textContent = "Copied";
                        setTimeout(() => { btn.textContent = "Copy to Clipboard"; }, 1500);
                      }}
                    >
                      Copy to Clipboard
                    </button>
                    {outreachMethod === "email" ? (
                      <button
                        className="iconBtn"
                        onClick={() => {
                          const subject = encodeURIComponent(`Information Request: ${showOutreachModal.dealInfo?.companyName || "Deal"} Analysis`);
                          const body = encodeURIComponent(outreachText);
                          window.open(`mailto:?subject=${subject}&body=${body}`);
                        }}
                        style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}
                      >
                        Open Email Client
                      </button>
                    ) : (
                      <button
                        className="iconBtn"
                        onClick={() => {
                          const body = encodeURIComponent(outreachText);
                          window.open(`sms:?&body=${body}`);
                        }}
                        style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}
                      >
                        Open Messages
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
