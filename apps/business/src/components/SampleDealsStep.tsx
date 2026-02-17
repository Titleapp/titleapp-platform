import React, { useState } from "react";
import useFileUpload from "../hooks/useFileUpload";

interface SampleDealsStepProps {
  criteria: any;
  onComplete: () => void;
  onSkip: () => void;
}

interface UploadedDeal {
  file: File;
  analyzing: boolean;
  analysis: any | null;
  error: string | null;
}

export default function SampleDealsStep({ criteria, onComplete, onSkip }: SampleDealsStepProps) {
  const [deals, setDeals] = useState<UploadedDeal[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileUpload = useFileUpload({ purpose: "deal_memo" });

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    processFiles(files);
  }

  async function processFiles(files: File[]) {
    const newDeals: UploadedDeal[] = files.map(file => ({
      file,
      analyzing: false,
      analysis: null,
      error: null,
    }));

    setDeals(prev => [...prev, ...newDeals]);

    for (let i = 0; i < newDeals.length; i++) {
      await analyzeDeal(deals.length + i, newDeals[i].file);
    }
  }

  async function analyzeDeal(index: number, file: File) {
    setDeals(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], analyzing: true, error: null };
      return updated;
    });

    try {
      // Step 1: Upload PDF via useFileUpload hook
      const uploadedFileId = await fileUpload.uploadFile(file);

      // Step 2: Call analyze endpoint with fileId
      const token = localStorage.getItem("ID_TOKEN");
      const vertical = "analyst";
      const jurisdiction = "GLOBAL";
      const apiBase = (import.meta as any).env?.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      const response = await fetch(`${apiBase}/api?path=/v1/analyst:analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Vertical": vertical,
          "X-Jurisdiction": jurisdiction,
        },
        body: JSON.stringify({
          deal: {
            companyName: file.name.replace(/\.(pdf|PDF)$/, ""),
            dealType: "private_equity",
            fileId: uploadedFileId,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setDeals(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          analyzing: false,
          analysis: data.analysis,
        };
        return updated;
      });
    } catch (error: any) {
      setDeals(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          analyzing: false,
          error: error.message || "Failed to analyze",
        };
        return updated;
      });
    }
  }

  function removeDeal(index: number) {
    setDeals(deals.filter((_, i) => i !== index));
  }

  const allAnalyzed = deals.length > 0 && deals.every(d => d.analysis || d.error);
  const hasSuccessfulAnalyses = deals.some(d => d.analysis);

  return (
    <div style={{ display: "grid", gap: "24px", maxWidth: "700px", margin: "0 auto" }}>
      <div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
          Upload Sample Deals
        </h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
          Upload 2-3 deals you're interested in. Our AI will analyze them against your criteria
          and help you identify your investment sweet spot.
        </p>
      </div>

      {/* Criteria Summary */}
      <div
        style={{
          padding: "16px 20px",
          background: "rgba(124, 58, 237, 0.05)",
          border: "1px solid rgba(124, 58, 237, 0.2)",
          borderRadius: "12px",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(124, 58, 237)", marginBottom: "8px" }}>
          YOUR INVESTMENT CRITERIA
        </div>
        <div style={{ fontSize: "14px", color: "#374151", display: "grid", gap: "4px" }}>
          {criteria.min_net_irr && <div>• Min IRR: {criteria.min_net_irr}%</div>}
          {criteria.min_equity_multiple && <div>• Min Equity Multiple: {criteria.min_equity_multiple}x</div>}
          {criteria.risk_tolerance && (
            <div>• Risk Tolerance: {criteria.risk_tolerance.charAt(0).toUpperCase() + criteria.risk_tolerance.slice(1)}</div>
          )}
          {criteria.target_asset_types && (
            <div>• Asset Types: {criteria.target_asset_types.join(", ").replace(/_/g, " ")}</div>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          padding: "32px",
          border: dragOver ? "2px dashed rgb(124, 58, 237)" : "2px dashed #d1d5db",
          borderRadius: "12px",
          textAlign: "center",
          background: dragOver ? "rgba(124, 58, 237, 0.05)" : "#f9fafb",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: 600, color: "#64748b", marginBottom: "16px" }}>Deal Memos</div>
        <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
          Upload Deal Memos (PDFs)
        </p>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
          {dragOver ? "Drop PDF files here" : "Drag and drop PDFs here, or click to choose files"}
        </p>
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileUpload}
          style={{ display: "none" }}
          id="deal-upload"
        />
        <label
          htmlFor="deal-upload"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "rgb(124, 58, 237)",
            color: "white",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: 600,
          }}
        >
          Choose Files
        </label>
      </div>

      {/* Uploaded Deals */}
      {deals.length > 0 && (
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>
            Uploaded Deals ({deals.length})
          </div>
          {deals.map((deal, index) => (
            <div
              key={index}
              style={{
                padding: "16px",
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
                    {deal.file.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    {(deal.file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  onClick={() => removeDeal(index)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "13px",
                    background: "transparent",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    cursor: "pointer",
                    color: "#6b7280",
                  }}
                >
                  Remove
                </button>
              </div>

              {deal.analyzing && (
                <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", fontSize: "14px" }}>
                  Analyzing with AI...
                </div>
              )}

              {deal.error && (
                <div style={{ padding: "12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", fontSize: "14px", color: "#dc2626" }}>
                  {deal.error}
                </div>
              )}

              {deal.analysis && (
                <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280", marginBottom: "4px" }}>
                        RECOMMENDATION
                      </div>
                      <div
                        className={`badge badge-${deal.analysis.recommendation === "INVEST" ? "completed" : deal.analysis.recommendation === "PASS" ? "" : "processing"}`}
                        style={{ fontSize: "16px", padding: "6px 12px" }}
                      >
                        {deal.analysis.emoji || ""} {deal.analysis.recommendation}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280", marginBottom: "4px" }}>
                        RISK SCORE
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 700, color: deal.analysis.riskScore >= 70 ? "#ef4444" : deal.analysis.riskScore >= 40 ? "#f59e0b" : "#10b981" }}>
                        {deal.analysis.riskScore || 0}/100
                      </div>
                    </div>
                  </div>
                  {deal.analysis.summary && (
                    <div style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.5 }}>
                      {deal.analysis.summary}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analysis Summary */}
      {hasSuccessfulAnalyses && (
        <div
          style={{
            padding: "20px",
            background: "#f0fdf4",
            border: "2px solid #86efac",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
            Sweet Spot Identified
          </div>
          <p style={{ fontSize: "14px", color: "#374151", marginBottom: "12px", lineHeight: 1.5 }}>
            Based on your uploaded deals and criteria, TitleApp will help you:
          </p>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#374151" }}>
            <li>Screen incoming deals against your target box</li>
            <li>Identify red flags and missing information</li>
            <li>Suggest risk-scaled deal structures</li>
            <li>Track your pipeline and decision history</li>
          </ul>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
        <button
          onClick={onSkip}
          style={{
            padding: "12px 24px",
            fontSize: "15px",
            background: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          Skip for Now
        </button>
        <button
          onClick={onComplete}
          disabled={!allAnalyzed}
          style={{
            padding: "12px 32px",
            fontSize: "15px",
            fontWeight: 600,
            background: allAnalyzed ? "rgb(124, 58, 237)" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: allAnalyzed ? "pointer" : "not-allowed",
          }}
        >
          {deals.length === 0 ? "Continue Without Samples" : "Complete Setup →"}
        </button>
      </div>
    </div>
  );
}
