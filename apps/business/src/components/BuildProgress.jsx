import React, { useState, useEffect } from "react";
import ConnectorLibrary from "./canvas/ConnectorLibrary";

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
  { id: 0, label: "Free", price: 0, credits: 50 },
  { id: 1, label: "Tier 1", price: 29, credits: 500 },
  { id: 2, label: "Tier 2", price: 49, credits: 1500 },
  { id: 3, label: "Tier 3", price: 79, credits: 3000 },
];

// Matrix-style code lines — realistic rule/schema/compliance content
const MATRIX_LINES = [
  'const TIER_0 = require("@titleapp/rules/platform");',
  'import { ComplianceEngine } from "./engine";',
  '',
  '// Tier 1 — Regulatory rules',
  'rule.register("jurisdiction_check", {',
  '  trigger: "on_execution",',
  '  validate: (ctx) => ctx.jurisdiction !== null,',
  '  severity: "block",',
  '});',
  '',
  'rule.register("disclosure_required", {',
  '  trigger: "before_output",',
  '  inject: DISCLAIMERS[ctx.vertical],',
  '});',
  '',
  '// Tier 2 — Best practices',
  'schema.define("worker_output", {',
  '  confidence: { type: "number", min: 0, max: 1 },',
  '  sources: { type: "array", required: true },',
  '  disclaimer: { type: "string", auto: true },',
  '});',
  '',
  'compliance.gate("pre_publish", [',
  '  "identity_verified",',
  '  "liability_accepted",',
  '  "rules_hash_valid",',
  '  "test_coverage >= 3",',
  ']);',
  '',
  '// Audit trail integration',
  'audit.on("execution", async (event) => {',
  '  const hash = sha256(event.payload);',
  '  await chain.append({ hash, prev: lastHash });',
  '  lastHash = hash;',
  '});',
  '',
  'export default { rules, schema, compliance, audit };',
];

const ICON_COLORS = {
  finance: "#2E5F8A", "real-estate": "#2E7D4F", aviation: "#1A3A5C",
  government: "#4A2C6B", health: "#8A2E2E", education: "#2E5F8A",
  auto: "#1A3A5C", default: "#6B46C1",
};

function generateWorkerIcon(name, verticalKey) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const color = ICON_COLORS[verticalKey] || ICON_COLORS.default;
  // Rounded square background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 512, 64);
  ctx.fill();
  // Initials
  ctx.fillStyle = "white";
  ctx.font = "bold 200px Calibri, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const initials = (name || "DW").split(/\s+/).map(w => w[0]).join("").substring(0, 2).toUpperCase();
  ctx.fillText(initials, 256, 270);
  return canvas.toDataURL("image/png");
}

function cropToSquare(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = Math.min(img.width, img.height);
      canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 512, 512);
      callback(canvas.toDataURL("image/png"));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export default function BuildProgress({ worker, workerCardData, onWorkerUpdate, onTestReady, workerIconUrl, onIconChange }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [buildComplete, setBuildComplete] = useState(false);
  const [selectedTier, setSelectedTier] = useState(workerCardData?.pricingTier || 2);
  const [matrixLines, setMatrixLines] = useState([]);
  const [matrixDone, setMatrixDone] = useState(false);

  // Detect second build — store in localStorage (guarded for private browsing)
  const buildKey = `build_count_${worker?.id || "unknown"}`;
  let buildCount = 0;
  try { buildCount = parseInt(localStorage.getItem(buildKey) || "0", 10); } catch {}
  const showMatrix = buildCount >= 1;

  useEffect(() => {
    try { localStorage.setItem(buildKey, String(buildCount + 1)); } catch {}
  }, []);

  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[2];

  // Matrix code streaming animation (second build only)
  useEffect(() => {
    if (!showMatrix || matrixDone) return;
    let lineIndex = 0;
    const interval = setInterval(() => {
      if (lineIndex >= MATRIX_LINES.length) {
        clearInterval(interval);
        setMatrixDone(true);
        return;
      }
      setMatrixLines(prev => [...prev, MATRIX_LINES[lineIndex]]);
      lineIndex++;
    }, 350);
    return () => clearInterval(interval);
  }, [showMatrix, matrixDone]);

  // Animate build progress
  useEffect(() => {
    if (buildComplete) return;
    // If matrix is showing, wait for it to finish before starting normal progress
    if (showMatrix && !matrixDone) return;
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
  }, [buildComplete, matrixDone, showMatrix]);

  // Poll for actual worker status
  useEffect(() => {
    if (!worker?.id) return;
    const poll = setInterval(async () => {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const tenantId = localStorage.getItem("TENANT_ID");
        if (!token) return;
        const res = await fetch(`${API_BASE}/api?path=/v1/workers:list`, {
          headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId, "X-Vertical": "developer", "X-Jurisdiction": "GLOBAL" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && Array.isArray(data.workers)) {
          const updated = data.workers.find(w => w.id === worker.id);
          if (updated && typeof updated === "object") {
            onWorkerUpdate(prev => ({ ...prev, ...updated }));
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

  // Matrix code streaming (second build)
  if (showMatrix && !matrixDone) {
    return (
      <div style={{
        maxWidth: 600, background: "#0D1117", borderRadius: 12, padding: "20px 24px",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        overflow: "hidden",
      }}>
        <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 12, letterSpacing: "0.5px" }}>
          COMPILING RULES ENGINE...
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {matrixLines.map((line, i) => {
            const l = typeof line === "string" ? line : "";
            return (
              <div key={i} style={{
                fontSize: 12, color: l.startsWith("//") ? "#8b949e" : l.startsWith("rule.") || l.startsWith("schema.") || l.startsWith("compliance.") || l.startsWith("audit.") ? "#7ee787" : l.includes("require") || l.includes("import") ? "#79c0ff" : l === "" ? "transparent" : "#c9d1d9",
                lineHeight: 1.7,
                opacity: i === matrixLines.length - 1 ? 0.8 : 1,
                whiteSpace: "pre",
              }}>
                {l || "\u00A0"}
              </div>
            );
          })}
          <div style={{ color: "#7ee787", animation: "blink 1s step-end infinite" }}>_</div>
        </div>
        <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
      </div>
    );
  }

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
        Review the preview below, set your price, then test it before launching.
      </div>

      {/* Live preview card */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "20px 20px", background: "linear-gradient(135deg, #6B46C1 0%, #818cf8 100%)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Live preview</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {workerIconUrl && (
              <img src={workerIconUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{workerCardData?.name || worker?.name || "Your Worker"}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{workerCardData?.vertical}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 14, color: "#1a1a2e", lineHeight: 1.6, marginBottom: 16 }}>
            {workerCardData?.description || worker?.description || "No description"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(() => {
              // Count compliance rules from all sources — guard against non-string values
              const rulesSources = [
                workerCardData?.complianceRules,
                workerCardData?.raasRules,
                workerCardData?.neverGetWrong,
              ].filter(v => typeof v === "string" && v.length > 0);
              const rulesCount = worker?.rulesCount || rulesSources.reduce((count, src) => {
                const parts = String(src).split(/[.;,]/).map(s => s.trim()).filter(s => s.length > 3);
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

      {/* Worker Icon */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Worker Icon</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{
            width: 120, height: 120, borderRadius: 16, overflow: "hidden", flexShrink: 0,
            background: workerIconUrl ? "transparent" : (ICON_COLORS[(workerCardData?.vertical || "").toLowerCase().replace(/\s+/g, "-")] || ICON_COLORS.default),
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid #E2E8F0",
          }}>
            {workerIconUrl ? (
              <img src={workerIconUrl} alt="Worker icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 40, fontWeight: 700, color: "white", letterSpacing: 2 }}>
                {((workerCardData?.name || worker?.name || "DW").split(/\s+/).map(w => w[0]).join("").substring(0, 2).toUpperCase())}
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <input
              type="file"
              accept="image/png,image/jpeg"
              id="icon-upload"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onIconChange) cropToSquare(file, onIconChange);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => document.getElementById("icon-upload").click()}
              style={{ padding: "10px 16px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Upload your own
            </button>
            <button
              onClick={() => {
                if (onIconChange) {
                  const verticalKey = (workerCardData?.vertical || "").toLowerCase().replace(/\s+/g, "-");
                  onIconChange(generateWorkerIcon(workerCardData?.name || worker?.name || "Worker", verticalKey));
                }
              }}
              style={{ padding: "10px 16px", background: "#F8F9FC", color: "#1a1a2e", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Generate from name
            </button>
            <div
              onClick={() => { if (onIconChange) onIconChange(null); }}
              style={{ fontSize: 12, color: "#94A3B8", cursor: "pointer", textAlign: "center", marginTop: 2 }}
            >
              Skip for now
            </div>
          </div>
        </div>
        {workerIconUrl && (
          <div style={{ fontSize: 12, color: "#10b981", marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
            <span>{"\u2713"}</span> Icon set — it will appear in your distribution kit and client deck.
          </div>
        )}
      </div>

      {/* Data Connections */}
      <ConnectorLibrary worker={worker} workerCardData={workerCardData} selectedTier={selectedTier} />

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
              <div style={{ fontSize: 18, fontWeight: 700, color: selectedTier === t.id ? "#6B46C1" : "#1a1a2e" }}>{t.price === 0 ? "Free" : `$${t.price}/mo`}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{t.credits} credits</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#64748B" }}>
          {tier.price === 0
            ? "Free — open to everyone. You earn $0."
            : `You earn $${(tier.price * 0.75).toFixed(2)}/mo per subscriber (75% of subscription revenue)`}
        </div>
      </div>

      {/* Continue to Test */}
      <button
        style={{
          width: "100%", padding: "16px 24px", fontSize: 16, fontWeight: 700,
          background: "#6B46C1", color: "white",
          border: "none", borderRadius: 10, cursor: "pointer",
        }}
        onClick={() => onTestReady({ ...(worker || {}), name: workerCardData?.name || worker?.name, pricingTier: selectedTier })}
      >
        Continue to Test
      </button>
      <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 8 }}>
        Test your worker as a subscriber would before launching.
      </div>
    </div>
  );
}
