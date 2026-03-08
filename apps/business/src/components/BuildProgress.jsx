import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const HE_MD_GATE_WORKERS = ["HE-013", "HE-025", "HE-027", "HE-028", "HE-030"];

// Friendly status messages mapped to pipeline stages
const STAGE_MESSAGES = [
  { stage: "intake", message: "Setting up your worker...", icon: "1" },
  { stage: "research", message: "Checking compliance rules for your jurisdiction...", icon: "2" },
  { stage: "rules", message: "Building your rules library...", icon: "3" },
  { stage: "prePublish", message: "Running quality checks...", icon: "4" },
  { stage: "submit", message: "Almost ready...", icon: "5" },
  { stage: "review", message: "Final review in progress...", icon: "6" },
];

const TIERS = [
  { id: 1, label: "Tier 1", price: 29, credits: 500 },
  { id: 2, label: "Tier 2", price: 49, credits: 1500 },
  { id: 3, label: "Tier 3", price: 79, credits: 3000 },
];

export default function BuildProgress({ worker, workerCardData, onWorkerUpdate, onTestReady }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [buildComplete, setBuildComplete] = useState(false);
  const [selectedTier, setSelectedTier] = useState(workerCardData?.pricingTier || 2);

  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[1];

  // Animate build progress
  useEffect(() => {
    if (buildComplete) return;
    const interval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev >= STAGE_MESSAGES.length - 1) {
          clearInterval(interval);
          setBuildComplete(true);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [buildComplete]);

  // Poll for actual worker status
  useEffect(() => {
    if (!worker?.id) return;
    const poll = setInterval(async () => {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const tenantId = localStorage.getItem("TENANT_ID");
        const res = await fetch(`${API_BASE}/api?path=/v1/workers:list`, {
          headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId, "X-Vertical": "developer", "X-Jurisdiction": "GLOBAL" },
        });
        const data = await res.json();
        if (data.ok && data.workers) {
          const updated = data.workers.find(w => w.id === worker.id);
          if (updated) {
            onWorkerUpdate(updated);
            if (updated.buildPhase === "library" || updated.buildPhase === "prePublish" || updated.buildPhase === "live") {
              setBuildComplete(true);
              clearInterval(poll);
            }
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(poll);
  }, [worker?.id]);

  // Building state
  if (!buildComplete) {
    const progress = ((currentStage + 1) / STAGE_MESSAGES.length) * 100;
    return (
      <div style={{ maxWidth: 500 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Building your worker</div>
        <div style={{ fontSize: 14, color: "#64748B", marginBottom: 32 }}>
          Alex is setting everything up. This takes about a minute.
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #6B46C1, #818cf8)", borderRadius: 3, transition: "width 0.8s ease" }} />
        </div>

        {/* Status messages */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {STAGE_MESSAGES.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i <= currentStage ? 1 : 0.3, transition: "opacity 0.5s" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                background: i < currentStage ? "#10b981" : i === currentStage ? "#6B46C1" : "#E2E8F0",
                color: i < currentStage || i === currentStage ? "white" : "#94A3B8", fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {i < currentStage ? "\u2713" : s.icon}
              </div>
              <span style={{ fontSize: 14, color: i <= currentStage ? "#1a1a2e" : "#94A3B8" }}>{s.message}</span>
              {i === currentStage && <span style={{ fontSize: 12, color: "#6B46C1", marginLeft: "auto" }}>In progress</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Build complete — show preview + continue to test
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Your worker is ready</div>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>
        Review the preview below, set your price, then test it before publishing.
      </div>

      {/* Live preview card */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "20px 20px", background: "linear-gradient(135deg, #6B46C1 0%, #818cf8 100%)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Live preview</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{workerCardData?.name || worker?.name || "Your Worker"}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{workerCardData?.vertical}</div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 14, color: "#1a1a2e", lineHeight: 1.6, marginBottom: 16 }}>
            {workerCardData?.description || worker?.description || "No description"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(() => {
              // Count compliance rules from all sources
              const rulesSources = [
                workerCardData?.complianceRules,
                workerCardData?.raasRules,
                workerCardData?.neverGetWrong,
              ].filter(Boolean);
              const rulesCount = worker?.rulesCount || rulesSources.reduce((count, src) => {
                const parts = src.split(/[.;,]/).map(s => s.trim()).filter(s => s.length > 3);
                return count + Math.max(parts.length, 1);
              }, 0) || 0;
              const hasRules = rulesCount > 0;
              return (
                <span style={{ padding: "4px 10px", background: hasRules ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)", color: hasRules ? "#10b981" : "#94A3B8", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  {rulesCount} compliance rule{rulesCount !== 1 ? "s" : ""}
                </span>
              );
            })()}
            {(() => {
              // Smart jurisdiction display
              const jur = workerCardData?.jurisdiction || "GLOBAL";
              const statePattern = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/g;
              const states = jur.match(statePattern);
              const display = states && states.length > 1
                ? `Multi-state (${states.length})`
                : states && states.length === 1
                ? states[0]
                : jur === "GLOBAL" ? "National" : jur;
              return (
                <span style={{ padding: "4px 10px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  {display}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Price setting */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Set your price</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {TIERS.map(t => (
            <div
              key={t.id}
              onClick={() => setSelectedTier(t.id)}
              style={{
                flex: 1, padding: "12px 8px", textAlign: "center", cursor: "pointer", borderRadius: 8,
                background: selectedTier === t.id ? "rgba(107,70,193,0.08)" : "#F8F9FC",
                border: `1px solid ${selectedTier === t.id ? "#6B46C1" : "#E2E8F0"}`,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: selectedTier === t.id ? "#6B46C1" : "#1a1a2e" }}>${t.price}/mo</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{t.credits} credits</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#64748B" }}>
          You earn ${(tier.price * 0.75).toFixed(2)}/mo per subscriber (75% of subscription revenue)
        </div>
      </div>

      {/* Continue to Test */}
      <button
        style={{
          width: "100%", padding: "16px 24px", fontSize: 16, fontWeight: 700,
          background: "#6B46C1", color: "white",
          border: "none", borderRadius: 10, cursor: "pointer",
        }}
        onClick={() => onTestReady({ ...worker, name: workerCardData?.name || worker?.name, pricingTier: selectedTier })}
      >
        Continue to Test
      </button>
      <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 8 }}>
        Test your worker as a subscriber would before publishing.
      </div>
    </div>
  );
}
