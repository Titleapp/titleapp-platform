import React, { useState, useEffect, useRef, useCallback } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";
import BuildProgress from "../components/BuildProgress";
import TestWorkerPanel from "../components/TestWorkerPanel";
import CanvasComingSoon from "../components/sandbox/CanvasComingSoon";
import { getPostLaunchMessage } from "../components/studio/PostLaunchAlex";
import CanvasImagePanel from "../components/canvas/CanvasImagePanel";
import MyImagesPanel from "../components/MyImagesPanel";
import DistributionKit from "../components/DistributionKit";
import CommsPreferences from "../components/CommsPreferences";
import PublishPreflight from "../components/PublishPreflight";
import CreatorSpotlight from "../components/CreatorSpotlight";
import { fireConfetti } from "../utils/celebrations";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Error boundary — catches render crashes, falls back to recovery UI with error details
class PanelErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    console.error("[PanelErrorBoundary] Render crash:", error, info.componentStack);
    this.setState({ errorInfo: info });
  }
  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || "Unknown error";
      const errStack = this.state.error?.stack || "";
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 14, color: "#64748B", marginBottom: 12, lineHeight: 1.5 }}>
            The panel encountered an error. Click below to recover.
          </div>
          <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "10px 14px", borderRadius: 8, marginBottom: 16, textAlign: "left", maxHeight: 120, overflow: "auto", fontFamily: "monospace", lineHeight: 1.4, wordBreak: "break-word" }}>
            {errMsg}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); if (this.props.onRecover) this.props.onRecover(); }}
              style={{ padding: "10px 24px", background: "var(--accent, #6B46C1)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              {this.props.recoverLabel || "Go back"}
            </button>
            <button
              onClick={() => { try { navigator.clipboard.writeText(errMsg + "\n" + errStack); } catch {} }}
              style={{ padding: "10px 24px", background: "#F8F9FC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Copy error
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  root: { display: "flex", height: "100dvh", overflow: "hidden", background: "#F8F9FC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a1a2e" },
  // Left nav — creator studio (dark theme matching Sidebar)
  leftNav: { flexShrink: 0, background: "linear-gradient(180deg, #1A1A2E, #141425)", borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", display: "flex", flexDirection: "column" },
  leftNavMobile: { position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 300, background: "linear-gradient(180deg, #1A1A2E, #141425)", borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", boxShadow: "4px 0 24px rgba(0,0,0,0.4)" },
  navSection: { padding: "16px 16px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  navSectionTitle: { fontSize: 11, fontWeight: 700, color: "rgba(226,232,240,0.55)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 },
  navStatGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  navStatTile: { background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 12px", textAlign: "center" },
  navStatValue: { fontSize: 18, fontWeight: 700, color: "#e5e7eb" },
  navStatLabel: { fontSize: 10, color: "rgba(226,232,240,0.55)", marginTop: 2 },
  navItem: { padding: "10px 16px", fontSize: 13, color: "rgba(226,232,240,0.85)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, margin: "2px 8px" },
  navItemActive: { background: "rgba(124,58,237,0.16)", color: "#ddd6fe", fontWeight: 600, border: "1px solid rgba(124,58,237,0.35)" },
  // Chat panel
  chatPanel: { display: "flex", flexDirection: "column", borderRight: "1px solid #E2E8F0", background: "#FFFFFF" },
  chatHeader: { padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10, background: "#FFFFFF" },
  chatLogo: { fontSize: 14, fontWeight: 700, color: "var(--accent, #6B46C1)" },
  chatName: { fontSize: 13, fontWeight: 600, color: "#64748B" },
  chatMessages: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 },
  chatInputWrap: { padding: "12px 16px", borderTop: "1px solid #E2E8F0", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" },
  chatInput: { width: "100%", padding: "12px 16px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 10, color: "#1a1a2e", fontSize: 14, outline: "none", resize: "none" },
  msgUser: { alignSelf: "flex-end", background: "var(--accent, #6B46C1)", color: "white", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", maxWidth: "85%", fontSize: 14, lineHeight: 1.5 },
  msgAssistant: { alignSelf: "flex-start", background: "#F4F4F8", color: "#1a1a2e", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", maxWidth: "85%", fontSize: 14, lineHeight: 1.5 },
  typing: { alignSelf: "flex-start", color: "#64748B", fontSize: 13, padding: "8px 0" },
  // Right panel — workspace
  workPanel: { flex: 1, display: "flex", flexDirection: "column", background: "#F8F9FC" },
  tabContent: { flex: 1, overflowY: "auto", padding: 24 },
  // Status bar
  statusBar: { padding: "8px 20px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF", display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#64748B" },
  // Buttons
  btnPrimary: { padding: "10px 20px", background: "var(--accent, #6B46C1)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 20px", background: "#FFFFFF", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  // Divider
  divider: { width: 4, cursor: "col-resize", background: "#E2E8F0", flexShrink: 0, transition: "background 0.15s" },
  dividerHover: { background: "var(--accent, #6B46C1)" },
};

const FLOW_STEPS = ["Start", "Define", "Build", "Test", "Preflight", "Distribute", "Grow"];

const SURVEY_QUESTIONS = [
  { key: "accuracy", question: "How accurate were the responses?", chips: ["Spot on", "Mostly good", "Needs work", "Way off"] },
  { key: "compliance", question: "Did compliance rules fire when they should?", chips: ["Yes, every time", "Missed some", "Didn't test this", "No rules fired"] },
  { key: "tone", question: "How was the tone and style?", chips: ["Perfect", "Too formal", "Too casual", "Inconsistent"] },
  { key: "readiness", question: "Is this worker ready for subscribers?", chips: ["Ship it", "Almost — minor tweaks", "Needs more work", "Start over"] },
];

// Get fresh Firebase ID token (or fall back to localStorage)
async function getFreshToken() {
  if (firebaseAuth?.currentUser) {
    try {
      const token = await firebaseAuth.currentUser.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token); // keep localStorage in sync
      return token;
    } catch (_) {}
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

// Helper for Worker #1 API calls — always returns { ok, ... }, never throws
async function w1Api(endpoint, payload) {
  try {
    const token = await getFreshToken();
    const tenantId = localStorage.getItem("TENANT_ID");
    const res = await fetch(`${API_BASE}/api?path=/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Tenant-Id": tenantId,
        "X-Vertical": "developer",
        "X-Jurisdiction": "GLOBAL",
      },
      body: JSON.stringify({ tenantId, ...payload }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[w1Api] ${endpoint} returned ${res.status}:`, text);
      return { ok: false, error: `Server error ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    console.error(`[w1Api] ${endpoint} failed:`, err);
    return { ok: false, error: err.message || "Network error" };
  }
}

// BUG-001: Fallback when test panel can't load because worker.id is missing
function TestPanelFallback({ worker, workerCardData, onReady, onBack }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // After 3 seconds, auto-recover by generating an id
  useEffect(() => {
    if (elapsed >= 3 && worker && !worker.id) {
      const generated = { ...worker, id: "wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) };
      onReady(generated);
    }
  }, [elapsed, worker, onReady]);

  const name = workerCardData?.name || worker?.name || "your worker";
  if (elapsed < 3) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Loading test panel...</div>
        <div style={{ fontSize: 14, color: "#64748B" }}>Setting up {name} for testing.</div>
      </div>
    );
  }
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Recovering test panel...</div>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>Reconnecting to {name}.</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => { const w = { ...(worker || {}), id: "wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name: workerCardData?.name }; onReady(w); }}
          style={{ padding: "10px 24px", background: "var(--accent, #6B46C1)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Retry
        </button>
        <button onClick={onBack}
          style={{ padding: "10px 24px", background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Back
        </button>
      </div>
    </div>
  );
}

// ── Inline Draft Card (rendered in chat) ──────────────────────
function InlineDraftCard({ cardData, onContinue, onDownload, onShare, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cardData.name);
  const [editDesc, setEditDesc] = useState(cardData.description);

  function handleSave() {
    onEdit({ ...cardData, name: editName, description: editDesc });
    setEditing(false);
  }

  return (
    <div style={{
      alignSelf: "flex-start", maxWidth: "90%", borderRadius: 16, overflow: "hidden",
      border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 20%, transparent)", boxShadow: "0 2px 12px color-mix(in srgb, var(--accent, #6B46C1) 8%, transparent)",
    }}>
      <div style={{
        background: `linear-gradient(135deg, var(--accent, #6B46C1), color-mix(in srgb, var(--accent, #6B46C1) 85%, white))`, padding: "16px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{editing ? editName : cardData.name}</span>
        <span style={{
          background: "rgba(255,255,255,0.2)", color: "white", fontSize: 11,
          fontWeight: 700, padding: "3px 10px", borderRadius: 12, letterSpacing: "0.5px",
        }}>DRAFT</span>
      </div>
      <div style={{ background: "#FFFFFF", padding: "16px 20px" }}>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}
            />
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={3}
              style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, color: "#1a1a2e", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleSave} style={{ padding: "6px 14px", background: "var(--accent, #6B46C1)", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ padding: "6px 14px", background: "#F8F9FC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 12 }}>{cardData.description}</div>
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>
              {cardData.vertical && <span>{cardData.vertical}</span>}
              <span>Free to build and test</span>
            </div>
          </>
        )}
        <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, marginBottom: 14 }}>Saved to your Vault.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onContinue} style={{ padding: "8px 16px", background: "var(--accent, #6B46C1)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Continue Building</button>
          <button onClick={onDownload} style={{ padding: "8px 16px", background: "#FFFFFF", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Download PDF</button>
          <button onClick={onShare} style={{ padding: "8px 16px", background: "#FFFFFF", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Share Link</button>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ padding: "8px 16px", background: "#F8F9FC", color: "var(--accent, #6B46C1)", border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 20%, transparent)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Progressive Card (right panel — fills in as conversation progresses) ──
function ProgressiveCard({ exchangeCount, progressiveFields, workerCardData }) {
  // If real card data exists, show the full InlineDraftCard-style card
  if (workerCardData) return null; // Parent will render InlineDraftCard instead

  const shimmer = {
    background: "linear-gradient(90deg, #F1F0F5 25%, #E8E6EF 50%, #F1F0F5 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s ease-in-out infinite",
    borderRadius: 6,
    height: 14,
  };

  const name = progressiveFields.name || null;
  const desc = progressiveFields.description || null;
  const category = progressiveFields.category || null;

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <div style={{
        borderRadius: 16, overflow: "hidden",
        border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 20%, transparent)", boxShadow: "0 2px 12px color-mix(in srgb, var(--accent, #6B46C1) 8%, transparent)",
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, var(--accent, #6B46C1), color-mix(in srgb, var(--accent, #6B46C1) 85%, white))`, padding: "16px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {name ? (
            <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{name}</span>
          ) : (
            <div style={{ ...shimmer, width: "60%", height: 18, background: "rgba(255,255,255,0.2)" }} />
          )}
          <span style={{
            background: "rgba(255,255,255,0.2)", color: "white", fontSize: 11,
            fontWeight: 700, padding: "3px 10px", borderRadius: 12, letterSpacing: "0.5px",
          }}>DRAFT</span>
        </div>

        {/* Body */}
        <div style={{ background: "#FFFFFF", padding: "16px 20px" }}>
          {/* Description */}
          {desc ? (
            <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 12 }}>{desc}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <div style={{ ...shimmer, width: "100%" }} />
              <div style={{ ...shimmer, width: "85%" }} />
              <div style={{ ...shimmer, width: "60%" }} />
            </div>
          )}

          {/* Category */}
          {exchangeCount >= 2 ? (
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>
              <span>{category || "Custom"}</span>
              <span>Free to build and test</span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ ...shimmer, width: 60 }} />
              <div style={{ ...shimmer, width: 40 }} />
            </div>
          )}

          {/* Status */}
          <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>
            {exchangeCount === 0 ? "Your worker will take shape here." :
             exchangeCount < 3 ? "Listening to your conversation..." :
             "Almost there..."}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lifecycle Reference Card (right panel — "How This Works") ──
function LifecycleCard({ flowStep, isGame }) {
  const stages = isGame ? [
    { num: 1, title: "Build", desc: "Describe your game. I'll shape the rules, characters, and mechanics.", range: [0, 1, 2] },
    { num: 2, title: "Test", desc: "Play your own game. See it in action. Refine until it's fun.", range: [3, 4] },
    { num: 3, title: "Launch", desc: "Publish your game. Get it in front of players.", range: [5] },
    { num: 4, title: "Grow", desc: "Track plays, collect feedback, push updates.", range: [6, 7] },
  ] : [
    { num: 1, title: "Build", desc: "Tell me what you know. I'll shape it into a worker. Use your existing ChatGPT or Claude work if you have it.", range: [0, 1, 2] },
    { num: 2, title: "Test", desc: "Talk to your own worker. See it in action. Refine it until it's right.", range: [3, 4] },
    { num: 3, title: "Launch", desc: "Set your price. Launch it. Get it in front of the right people.", range: [5] },
    { num: 4, title: "Grow", desc: "Track usage, collect feedback, push updates, get paid.", range: [6, 7] },
  ];

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: "20px 16px", marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>How This Works</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {stages.map(stage => {
          const isActive = stage.range.includes(flowStep);
          const isComplete = flowStep > Math.max(...stage.range);
          const circleColor = isComplete ? "#10b981" : isActive ? "var(--accent, #6B46C1)" : "#E2E8F0";
          const textColor = isComplete ? "#10b981" : isActive ? "var(--accent, #6B46C1)" : "#94A3B8";
          return (
            <div key={stage.num} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                background: circleColor, color: isComplete || isActive ? "white" : "#94A3B8",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
              }}>
                {isComplete ? "\u2713" : stage.num}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#1a1a2e" : textColor }}>{stage.title}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, marginTop: 2 }}>{stage.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic", marginTop: 14, lineHeight: 1.5 }}>
        {isGame
          ? "One hour or a few months — your game is always saved exactly where you left it."
          : "One hour or a few months — your worker is always saved exactly where you left it."}
      </div>
    </div>
  );
}

// ── Creator Studio Nav (left nav — Column 1) ──
function CreatorStudioNav({ flowStep, workerCardData, worker, isMobile, onClose, style, workspaces = [], onSwitchWorkspace, onViewStep, onShowMyImages, showMyImages }) {
  const baseStyle = isMobile ? S.leftNavMobile : S.leftNav;
  const [wsDropOpen, setWsDropOpen] = React.useState(false);
  return (
    <div style={{ ...baseStyle, ...style }}>
      {/* Workspace switcher */}
      {workspaces.length > 0 && (
        <div style={{ padding: "12px 12px 0", position: "relative" }}>
          <button
            onClick={() => setWsDropOpen(!wsDropOpen)}
            style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#e5e7eb", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {localStorage.getItem("WORKSPACE_NAME") || "Creator Studio"}
            </span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>{wsDropOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {wsDropOpen && (
            <div style={{ position: "absolute", left: 12, right: 12, top: "100%", background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
              <div
                onClick={() => { setWsDropOpen(false); window.location.href = "/"; }}
                style={{ padding: "8px 10px", fontSize: 12, color: "#c4b5fd", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 600 }}
              >
                Alex
              </div>
              {workspaces.map(ws => (
                <div
                  key={ws.id}
                  onClick={() => { setWsDropOpen(false); if (onSwitchWorkspace) onSwitchWorkspace(ws); }}
                  style={{ padding: "8px 10px", fontSize: 12, color: "#e5e7eb", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {ws.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent, #7c3aed)" }}>Creator Studio</div>
          <div style={{ fontSize: 11, color: "rgba(226,232,240,0.55)", marginTop: 2 }}>TitleApp</div>
        </div>
        {isMobile && (
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "rgba(226,232,240,0.55)", cursor: "pointer", padding: 4 }}>&times;</button>
        )}
      </div>

      {/* Dashboard */}
      <div style={S.navSection}>
        <div style={S.navSectionTitle}>Dashboard</div>
        <div style={S.navStatGrid}>
          <div style={S.navStatTile}><div style={S.navStatValue}>0</div><div style={S.navStatLabel}>Workers Live</div></div>
          <div style={S.navStatTile}><div style={S.navStatValue}>0</div><div style={S.navStatLabel}>Subscribers</div></div>
          <div style={S.navStatTile}><div style={S.navStatValue}>$0</div><div style={S.navStatLabel}>This Month</div></div>
          <div style={S.navStatTile}><div style={S.navStatValue}>&mdash;</div><div style={S.navStatLabel}>Trend</div></div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(226,232,240,0.45)", marginTop: 8, lineHeight: 1.5 }}>{workerCardData?.gameConfig?.isGame ? "Launch your first game to start earning." : "Launch your first worker to start earning."}</div>
      </div>

      {/* My Workers */}
      <div style={S.navSection}>
        <div style={S.navSectionTitle}>My Workers</div>
        {workerCardData && !workerCardData?.gameConfig?.isGame ? (
          <div style={{ ...S.navItem, ...S.navItemActive, flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{workerCardData.name}</span>
              {flowStep >= 6 && <span style={{ fontSize: 10, color: "rgba(226,232,240,0.3)", fontWeight: 400 }}>v1.0</span>}
            </div>
            {flowStep >= 6 ? (
              <button
                onClick={() => onViewStep?.(2)}
                title="Your worker gets better every time you update it"
                style={{ fontSize: 11, color: "var(--accent, #7c3aed)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}
              >
                Update {workerCardData.name} &rarr;
              </button>
            ) : (
              <div style={{ fontSize: 11, color: "rgba(226,232,240,0.45)" }}>Draft — Continue Building &rarr;</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)", padding: "6px 0" }}>No workers yet.</div>
        )}
      </div>

      {/* My Games */}
      <div style={S.navSection}>
        <div style={S.navSectionTitle}>My Games</div>
        {workerCardData?.gameConfig?.isGame ? (
          <div style={{ ...S.navItem, ...S.navItemActive, flexDirection: "column", alignItems: "flex-start", gap: 2, borderColor: "rgba(22,163,74,0.35)", background: "rgba(22,163,74,0.16)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{workerCardData.name}</span>
              {flowStep >= 6 && <span style={{ fontSize: 10, color: "rgba(226,232,240,0.3)", fontWeight: 400 }}>v1.0</span>}
            </div>
            {flowStep >= 6 ? (
              <button
                onClick={() => onViewStep?.(2)}
                title="Your game gets better every time you update it"
                style={{ fontSize: 11, color: "#4ade80", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}
              >
                Update {workerCardData.name} &rarr;
              </button>
            ) : (
              <div style={{ fontSize: 11, color: "rgba(226,232,240,0.45)" }}>Draft — Continue Building &rarr;</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)", padding: "6px 0" }}>No games yet.</div>
        )}
      </div>

      {/* My Audience */}
      <div style={S.navSection}>
        <div style={S.navSectionTitle}>My Audience</div>
        <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)", padding: "6px 0" }}>Your subscribers will appear here once you launch.</div>
      </div>

      {/* My Images */}
      <div style={S.navSection}>
        <div
          onClick={() => onShowMyImages && onShowMyImages()}
          style={{
            ...S.navItem,
            ...(showMyImages ? S.navItemActive : {}),
            cursor: "pointer",
          }}
        >
          My Images
        </div>
      </div>

      {/* Sessions */}
      {workerCardData && (
        <div style={S.navSection}>
          <div style={S.navSectionTitle}>Sessions</div>
          <div style={{ ...S.navItem, flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{workerCardData.name}</div>
            <div style={{ fontSize: 11, color: "rgba(226,232,240,0.45)" }}>
              Stage {flowStep <= 2 ? "1 — Build" : flowStep <= 4 ? "2 — Test" : flowStep <= 5 ? "3 — Launch" : "4 — Grow"}
            </div>
          </div>
        </div>
      )}

      {/* Vault */}
      <div style={S.navSection}>
        <div style={S.navSectionTitle}>Vault</div>
        <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)", padding: "6px 0" }}>Your files, conversations, and versions live here.</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function DeveloperSandbox() {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [welcomeGreeting, setWelcomeGreeting] = useState(null); // greeting text shown above chat
  const [greetingVisible, setGreetingVisible] = useState(false); // controls fade in/out
  const [campaignWorkerChips, setCampaignWorkerChips] = useState([]); // suggested workers from campaign

  // ── Session persistence — SYNCHRONOUS load before useState initializers ──
  const savedSession = useRef(null);
  if (savedSession.current === null) {
    try {
      const raw = localStorage.getItem("ta_sandbox_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate old 6-step sessions to 7-step (added Preflight at step 5)
        if (!parsed._v || parsed._v < 2) {
          if (parsed.flowStep >= 5) parsed.flowStep = parsed.flowStep + 1;
          if (parsed.maxFlowStep >= 5) parsed.maxFlowStep = parsed.maxFlowStep + 1;
          parsed._v = 2;
        }
        // Migrate _v:2 → _v:3: reset to opening screen (new conversation-first flow)
        if (parsed._v < 3) {
          if (parsed.flowStep < 3) {
            parsed.flowStep = 0;
            parsed.maxFlowStep = 0;
          }
          parsed._v = 3;
        }
        // Migrate _v:3 → _v:4: preamble flow replaces full-screen opening
        if (parsed._v < 4) {
          // flowStep 0 sessions get the new preamble flow (chat pre-seeds on mount)
          // flowStep 1+ sessions keep their position
          parsed._v = 4;
        }
        // Bounds check — clamp to valid range, clear if corrupted
        const maxStep = 7;
        if (parsed.flowStep > maxStep || parsed.maxFlowStep > maxStep) {
          parsed.flowStep = Math.min(parsed.flowStep || 0, maxStep);
          parsed.maxFlowStep = Math.min(parsed.maxFlowStep || 0, maxStep);
        }
        if (typeof parsed.flowStep !== "number" || parsed.flowStep < 0) parsed.flowStep = 0;
        if (typeof parsed.maxFlowStep !== "number" || parsed.maxFlowStep < 0) parsed.maxFlowStep = parsed.flowStep;
        // BUG-001: Ensure worker has an id if it exists (pre-31.6 sessions may lack it)
        if (parsed.worker && !parsed.worker.id) {
          parsed.worker.id = "wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        }
        savedSession.current = parsed;
      }
    } catch {
      // Corrupted session — clear it
      try { localStorage.removeItem("ta_sandbox_session"); } catch {}
    }
  }

  const [creatorPath, setCreatorPath] = useState(() => savedSession.current?.creatorPath || null); // null | "worker" | "game-casual" | "game-regulated"
  const [showPathChips, setShowPathChips] = useState(false);
  const [showGameTypeChips, setShowGameTypeChips] = useState(false);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Flow state — flowStep only moves forward, never backward
  const [flowStep, setFlowStep] = useState(() => {
    const s = savedSession.current?.flowStep;
    return typeof s === "number" ? s : 0;
  });
  const [maxFlowStep, setMaxFlowStep] = useState(() => {
    const s = savedSession.current;
    const max = s?.maxFlowStep ?? s?.flowStep;
    return typeof max === "number" ? max : 0;
  });

  // Step advancement — only forward
  function advanceToStep(step) {
    if (step > flowStep) {
      setFlowStep(step);
      setMaxFlowStep(prev => Math.max(prev, step));
    }
  }

  // View a completed step (for step indicator clicks) — does NOT change maxFlowStep
  function viewStep(step) {
    // Track when creator returns to edit after launching
    if (flowStep >= 6 && step < 6) setHasUpdatedSinceLaunch(true);
    setFlowStep(step);
  }

  // "Use your existing work" paste link
  const [showPasteArea, setShowPasteArea] = useState(false);

  // Worker state (used in steps 2+)
  const [workerCardData, setWorkerCardData] = useState(() => savedSession.current?.workerCardData || null);
  const [vertical, setVertical] = useState(() => savedSession.current?.vertical || "");
  const [jurisdiction, setJurisdiction] = useState(() => savedSession.current?.jurisdiction || "");

  // Step 3 — Build
  const [worker, setWorker] = useState(() => savedSession.current?.worker || null);
  const [workerIconUrl, setWorkerIconUrl] = useState(() => savedSession.current?.workerIconUrl || "");

  // Step 4 — Test survey
  const [surveyStep, setSurveyStep] = useState(() => savedSession.current?.surveyStep || 0);
  const [surveyAnswers, setSurveyAnswers] = useState(() => savedSession.current?.surveyAnswers || {});
  const [surveyComplete, setSurveyComplete] = useState(() => savedSession.current?.surveyComplete || false);
  const [testExchangeCount, setTestExchangeCount] = useState(() => savedSession.current?.testExchangeCount || 0);
  const [canvasDismissed, setCanvasDismissed] = useState(false);
  const [hasUpdatedSinceLaunch, setHasUpdatedSinceLaunch] = useState(false);
  const [canvasAssets, setCanvasAssets] = useState([]);
  const [canvasStyle, setCanvasStyle] = useState(null);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [includedAssetIds, setIncludedAssetIds] = useState([]);
  const [showMyImages, setShowMyImages] = useState(false);

  // Exchange counter (steps 1-2) — used for extractSpec fallback + progressive card
  const [exchangeCount, setExchangeCount] = useState(0);
  const [progressiveFields, setProgressiveFields] = useState({ name: null, description: null, category: null });

  // Image attachments
  const [pendingImages, setPendingImages] = useState([]);
  const fileInputRef = useRef(null);

  // Persist session state on key changes
  useEffect(() => {
    if (!workerCardData && !worker && flowStep <= 0 && exchangeCount === 0) return;
    try {
      localStorage.setItem("ta_sandbox_session", JSON.stringify({
        workerCardData, worker, vertical, jurisdiction, workerIconUrl,
        flowStep, maxFlowStep, exchangeCount, creatorPath,
        surveyStep, surveyAnswers, surveyComplete, testExchangeCount, _v: 4,
      }));
      if (workerCardData?.name) {
        sessionStorage.setItem("ta_sandbox_worker_name", workerCardData.name);
      }
    } catch {}
  }, [workerCardData, worker, vertical, jurisdiction, workerIconUrl, flowStep, maxFlowStep, exchangeCount, creatorPath, surveyStep, surveyAnswers, surveyComplete, testExchangeCount]);

  // Edit mode (post-publish)
  const [editMode, setEditMode] = useState(false);

  // Inline auth (for unauthenticated users)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [signupPromptShown, setSignupPromptShown] = useState(false); // guard: fire once only
  const [authEmail, setAuthEmail] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
  const [authName, setAuthName] = useState(() => new URLSearchParams(window.location.search).get("name") || "");
  const [pastedSpec] = useState(() => new URLSearchParams(window.location.search).get("spec") || "");
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingCardData, setPendingCardData] = useState(null);

  // Session error (silent inline UI, not Alex conversation)
  const [showSessionError, setShowSessionError] = useState(false);

  // Paste bridge (existing work entry)
  const [bridgePasteBack, setBridgePasteBack] = useState("");

  // Clean PII and spec from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("email") || params.has("name") || params.has("spec")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("email");
      url.searchParams.delete("name");
      url.searchParams.delete("spec");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  // Workspace data for switcher
  const [sandboxWorkspaces, setSandboxWorkspaces] = useState([]);
  useEffect(() => {
    const token = localStorage.getItem("ID_TOKEN");
    if (!token) return;
    fetch(`${API_BASE}/api?path=/v1/workspaces`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.ok && data.workspaces) setSandboxWorkspaces(data.workspaces); })
      .catch(() => {});
  }, []);
  function handleSandboxSwitchWorkspace(ws) {
    localStorage.setItem("VERTICAL", ws.vertical);
    localStorage.setItem("WORKSPACE_ID", ws.id);
    localStorage.setItem("WORKSPACE_NAME", ws.name);
    localStorage.setItem("COMPANY_NAME", ws.name);
    if (ws.jurisdiction) localStorage.setItem("JURISDICTION", ws.jurisdiction);
    if (ws.cosConfig) localStorage.setItem("COS_CONFIG", JSON.stringify(ws.cosConfig));
    window.location.href = "/";
  }

  // Name — captured once, never asked again
  const [creatorName, setCreatorName] = useState(() => {
    return firebaseAuth?.currentUser?.displayName
      || localStorage.getItem("DISPLAY_NAME")
      || sessionStorage.getItem("ta_sandbox_name")
      || "";
  });

  // Handle late auth resolution — capture name when onAuthStateChanged fires
  useEffect(() => {
    if (creatorName) return;
    const unsub = firebaseAuth?.onAuthStateChanged?.(user => {
      if (user?.displayName) {
        setCreatorName(user.displayName);
        sessionStorage.setItem("ta_sandbox_name", user.displayName);
        localStorage.setItem("DISPLAY_NAME", user.displayName);
      }
    });
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session ID
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem("ta_sandbox_sid");
    if (existing) return existing;
    const id = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 8);
    sessionStorage.setItem("ta_sandbox_sid", id);
    return id;
  });

  // Mobile state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Resizable panels — left nav width (px) + chat/right split (%)
  const [navWidthPx, setNavWidthPx] = useState(() => {
    try { const v = parseInt(localStorage.getItem("ta_sandbox_navW")); return v >= 180 && v <= 320 ? v : 240; } catch { return 240; }
  });
  const [chatWidthPercent, setChatWidthPercent] = useState(40);
  const [isDragging, setIsDragging] = useState(false); // "nav" | "chat" | false
  const [dividerHover, setDividerHover] = useState(false); // "nav" | "chat" | false
  const rootRef = useRef(null);
  const rightPanelRef = useRef(null);

  // Resume banner — detect incomplete session
  const [resumeWorker, setResumeWorker] = useState(() => {
    try {
      const s = savedSession.current;
      if (s?.workerCardData?.name && s.flowStep > 0 && s.flowStep < 7) {
        return { name: s.workerCardData.name, flowStep: s.flowStep };
      }
    } catch {}
    return null;
  });

  // Scroll right panel to top on step change
  useEffect(() => {
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = 0;
  }, [flowStep]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Divider drag handlers — supports both "nav" and "chat" dividers
  useEffect(() => {
    if (!isDragging) return;
    function onMouseMove(e) {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const x = e.clientX - rect.left;

      if (isDragging === "nav") {
        // Dragging left nav divider — adjust nav width in px
        const clamped = Math.max(180, Math.min(320, x));
        setNavWidthPx(clamped);
      } else if (isDragging === "chat") {
        // Dragging chat/right divider — adjust chat width as % of remaining space (after nav)
        const remaining = totalWidth - navWidthPx - 8; // 8px for both dividers
        const chatX = x - navWidthPx - 4;
        const pct = (chatX / remaining) * 100;
        if (chatX >= 280 && (remaining - chatX) >= 300) {
          setChatWidthPercent(pct);
        }
      }
    }
    function onMouseUp() {
      setIsDragging(false);
      // Persist nav width
      try { localStorage.setItem("ta_sandbox_navW", String(navWidthPx)); } catch {}
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, navWidthPx]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-expand chat input as user types
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.style.height = "auto";
      chatInputRef.current.style.height = Math.min(chatInputRef.current.scrollHeight, isMobile ? 140 : 160) + "px";
    }
  }, [input, isMobile]);

  const firstName = creatorName ? creatorName.split(" ")[0] : "";
  const isHE = vertical === "health-education";

  // Initial greeting — preamble for new users (flowStep 0), welcome back for returning
  useEffect(() => {
    if (flowStep > 0) {
      // Returning user
      const savedWorkerName = workerCardData?.name || sessionStorage.getItem("ta_sandbox_worker_name");
      const authDisplayName = firebaseAuth?.currentUser?.displayName?.split(" ")[0];
      const displayFirstName = firstName || authDisplayName || "";
      let greeting;
      if (displayFirstName && savedWorkerName) {
        greeting = `Welcome back, ${displayFirstName}. Picked up where you left off: ${savedWorkerName}.`;
      } else if (displayFirstName) {
        greeting = `Welcome back, ${displayFirstName}. Ready to pick up where we left off?`;
      } else {
        greeting = "Welcome back. Ready to pick up where we left off?";
      }
      addAssistantMessage(greeting);

      // Auto-send pasted spec from landing page (via ?spec= URL param)
      if (pastedSpec) {
        setTimeout(() => {
          addUserMessage(pastedSpec);
          addAssistantMessage("Got it — reading through this now. Thinking it through in another tool first is a great way to come in with a clear idea.");
          if (flowStep < 1) advanceToStep(1);
        }, 600);
      }
    } else {
      // New user — welcome greeting (UI element) + preamble flow
      const authDisplayName = firebaseAuth?.currentUser?.displayName?.split(" ")[0];
      const displayFirstName = firstName || authDisplayName || "";
      // Show greeting above chat
      const greetingText = displayFirstName ? `Welcome, ${displayFirstName}.` : (firebaseAuth?.currentUser ? "Welcome back." : "Welcome.");
      setWelcomeGreeting(greetingText);
      setTimeout(() => setGreetingVisible(true), 50);
      // Preamble — no inline welcome (greeting is separate UI element above chat)
      addAssistantMessage("What do you want to build today?");
      // Campaign pre-load — check for campaign slug in sessionStorage
      const campaignSlug = sessionStorage.getItem("ta_campaign_slug");
      if (campaignSlug) {
        sessionStorage.removeItem("ta_campaign_slug");
        // Fetch campaign context and use opening message + worker chips
        fetch(`${API_BASE}/api?path=/v1/campaign/${encodeURIComponent(campaignSlug)}`)
          .then(r => r.json())
          .then(data => {
            if (data.ok && data.campaign?.sandboxContext) {
              const ctx = data.campaign.sandboxContext;
              setTimeout(() => {
                addAssistantMessage(ctx.openingMessage);
                if (ctx.suggestedWorkers && ctx.suggestedWorkers.length > 0) {
                  setCampaignWorkerChips(ctx.suggestedWorkers);
                }
              }, 1500);
            }
          })
          .catch(() => {});
      } else {
        // Default opening question after 1.5s delay
        setTimeout(() => {
          if (savedSession.current?.creatorPath) {
            // Returning session — already chose path, no follow-up needed
          } else {
            addAssistantMessage("Before we start \u2014 are you building a Digital Worker or a Game?");
            setShowPathChips(true);
          }
        }, 1500);
      }

      // Auto-send pasted spec from landing page (via ?spec= URL param)
      if (pastedSpec) {
        setTimeout(() => {
          addUserMessage(pastedSpec);
          addAssistantMessage("Got it — reading through this now. Thinking it through in another tool first is a great way to come in with a clear idea.");
          advanceToStep(1);
        }, 2500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addAssistantMessage(text) {
    setMessages(prev => [...prev, { role: "assistant", text }]);
  }

  function addUserMessage(text) {
    setMessages(prev => [...prev, { role: "user", text }]);
  }

  // Capture name once — store everywhere
  function captureName(name) {
    if (!name) return;
    setCreatorName(name);
    sessionStorage.setItem("ta_sandbox_name", name);
    localStorage.setItem("DISPLAY_NAME", name);
  }

  // ── Chat send ────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || sending) return;
    setInput("");
    setShowPasteArea(false); // Hide paste link once user starts typing
    // Fade out welcome greeting on first user message
    if (greetingVisible) {
      setGreetingVisible(false);
      setTimeout(() => setWelcomeGreeting(null), 400);
    }
    addUserMessage(text);

    // First user message advances flowStep 0 → 1
    if (flowStep === 0) {
      advanceToStep(1);
      setResumeWorker(null);
      setProgressiveFields(prev => ({ ...prev, description: text.length > 30 ? text.substring(0, 120) + "..." : text }));
    }

    // Capture name from first response if we don't have it
    if (!creatorName && messages.length <= 4 && text.length < 40 && !text.includes("?")) {
      captureName(text);
    }

    // Track exchange count for steps 0-2
    const newExchangeCount = exchangeCount + 1;
    if (flowStep <= 2) setExchangeCount(newExchangeCount);

    // Progressive card field extraction
    if (flowStep <= 2 && newExchangeCount === 2 && !progressiveFields.name) {
      // After name exchange, try to derive a tentative worker name from first answer
      const firstUserMsg = messages.find(m => m.role === "user");
      if (firstUserMsg?.text) {
        const words = firstUserMsg.text.split(/\s+/).slice(0, 5).join(" ");
        setProgressiveFields(prev => ({ ...prev, name: words.length > 3 ? words : null }));
      }
    }
    if (flowStep <= 2 && newExchangeCount >= 3) {
      setProgressiveFields(prev => ({ ...prev, category: "Custom" }));
    }

    // extractSpec fallback — force card generation after 5+ exchanges with no card
    // Skip for game paths — games don't use WORKER_SPEC, they use a different build flow
    const isGamePath = creatorPath && creatorPath.startsWith('game');
    const shouldExtractSpec = flowStep <= 2 && newExchangeCount >= 5 && !workerCardData && !isGamePath;

    setSending(true);
    const images = [...pendingImages];
    setPendingImages([]);
    if (images.length > 0) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === "user") return [...prev.slice(0, -1), { ...last, images }];
        return prev;
      });
    }
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const headers = { "Content-Type": "application/json" };
      if (token && token !== "undefined" && token !== "null") headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId, surface: "sandbox", userInput: text, flowStep: Math.max(flowStep, 1), vertical, creatorPath,
          ...(creatorName ? { creatorName } : {}),
          ...(shouldExtractSpec ? { extractSpec: true } : {}),
          ...(images.length > 0 ? { imageData: images.map(img => ({ base64: img.base64, mediaType: img.mediaType })) } : {}),
        }),
      });
      const result = await resp.json();
      const reply = result.message || result.reply;
      if (result.ok && reply) {
        addAssistantMessage(reply);

        // Handle worker creation from backend (chat-driven build via [WORKER_SPEC])
        if (result.buildAnimation && result.cards && result.cards.length > 0) {
          const card = result.cards[0]?.data;
          if (card) {
            const isGame = !!card.gameConfig?.isGame || creatorPath === "game-casual" || creatorPath === "game-regulated";
            const derivedGameConfig = card.gameConfig || (isGame ? { isGame: true, gameMode: creatorPath === "game-casual" ? "casual" : "training" } : undefined);
            const cardData = {
              name: card.name || "Your Worker",
              description: card.description || "",
              targetUser: card.targetUser || card.audience || "General audience",
              problemSolves: card.problemSolves || card.problem || card.description || "General productivity improvement",
              complianceRules: (card.rules || []).join(". ") || "Standard compliance",
              raasRules: (card.rules || []).join(". ") || "",
              vertical: card.category || vertical || "",
              jurisdiction: card.jurisdiction || "GLOBAL",
              pricingTier: isGame ? 0 : 2,
              internal_only: false,
              gameConfig: derivedGameConfig,
            };
            setWorkerCardData(cardData);
            setVertical(card.category || "");
            setJurisdiction(card.jurisdiction || "GLOBAL");
            setWorker({ id: card.workerId, name: card.name, buildPhase: "draft" });

            // Card renders in right panel — show a brief note in chat
            const savedName = creatorName ? creatorName.split(" ")[0] : "";
            addAssistantMessage(savedName ? `Saved to your Vault, ${savedName}. Your worker card is on the right.` : "Your worker card is ready — see it on the right.");

            if (flowStep < 2) advanceToStep(2);

            // Roadmap message after 1.2s delay
            setTimeout(() => {
              const name = savedName || "Creator";
              setMessages(prev => [...prev, {
                role: "assistant",
                text: `${name}, your worker is saved. Here is what building it looks like:\n\nSession 1 (done) -- The Spark. You described what you know. Your draft card is saved.\nSession 2 -- The Rules. We spend 15 minutes on what your worker should and should not do.\nSession 3 -- The Test. You talk to your own worker. See it work. Refine it.\nSession 4 -- Publish. Set your price. Go live. Start earning.\n\nYou can finish all four sessions in one afternoon -- or take a few months. Your worker lives in your Vault either way.`
              }]);
              // CTA button message
              setTimeout(() => {
                setMessages(prev => [...prev, { role: "cta", text: "Start Session 2", action: "startSession2" }]);
              }, 600);
            }, 1200);
          }
        }

        // Canvas image generation — T2 returns imageUrl + assetId
        if (result.imageUrl) {
          setCanvasAssets(prev => [...prev, {
            id: Date.now().toString(),
            assetId: result.assetId || null,
            imageUrl: result.imageUrl,
            prompt: result.imagePrompt || "",
            style: canvasStyle || null,
            savedToLibrary: !!result.assetId,
          }]);
          setImageGenerating(false);
        }
        if (result.imageGenerating) {
          setImageGenerating(true);
        }
      } else {
        addAssistantMessage(reply || "Something went wrong. Try again.");
      }
    } catch (err) {
      const isOffline = !navigator.onLine;
      addAssistantMessage(
        isOffline
          ? "You appear to be offline. Check your connection and try again."
          : "Could not reach the server. This is usually temporary — try again in a moment."
      );
    } finally {
      setSending(false);
      chatInputRef.current?.focus();
    }
  }

  function handleChatKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Outside tool bridge ────────────────────────────────────
  function handleBridgeSend() {
    const text = bridgePasteBack.trim();
    if (!text) return;
    setShowBridge(false);
    setBridgePasteBack("");
    setInput("");
    addUserMessage(text);
    // Process via normal chat flow
    setSending(true);
    const token = localStorage.getItem("ID_TOKEN");
    const headers = { "Content-Type": "application/json" };
    if (token && token !== "undefined" && token !== "null") headers.Authorization = `Bearer ${token}`;
    fetch(`${API_BASE}/api?path=/v1/chat:message`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sessionId, surface: "sandbox", userInput: text, flowStep, vertical,
        ...(creatorName ? { creatorName } : {}),
      }),
    })
      .then(r => r.json())
      .then(result => {
        const reply = result.message || result.reply;
        if (result.ok && reply) {
          addAssistantMessage(reply);
          if (result.buildAnimation && result.cards && result.cards.length > 0) {
            const card = result.cards[0]?.data;
            if (card) {
              const isGame2 = !!card.gameConfig?.isGame;
              const cardData = {
                name: card.name || "Your Worker",
                description: card.description || "",
                targetUser: card.targetUser || card.audience || "General audience",
                problemSolves: card.problemSolves || card.problem || card.description || "General productivity improvement",
                complianceRules: (card.rules || []).join(". ") || "Standard compliance",
                raasRules: (card.rules || []).join(". ") || "",
                vertical: card.category || vertical || "",
                jurisdiction: card.jurisdiction || "GLOBAL",
                pricingTier: isGame2 ? 0 : 2,
                internal_only: false,
                gameConfig: card.gameConfig || undefined,
              };
              setWorkerCardData(cardData);
              setVertical(card.category || "");
              setJurisdiction(card.jurisdiction || "GLOBAL");
              setWorker({ id: card.workerId, name: card.name, buildPhase: "draft" });
              const savedName = creatorName ? creatorName.split(" ")[0] : "";
              addAssistantMessage(savedName ? `Saved to your Vault, ${savedName}. Your worker card is on the right.` : "Your worker card is ready — see it on the right.");
              if (flowStep < 2) advanceToStep(2);
            }
          }
        } else {
          addAssistantMessage(reply || "Something went wrong. Try again.");
        }
      })
      .catch(() => {
        addAssistantMessage("Could not reach the server. Try again in a moment.");
      })
      .finally(() => {
        setSending(false);
        chatInputRef.current?.focus();
      });
  }

  // ── InlineDraftCard handlers ────────────────────────────────

  async function handleDraftDownload() {
    if (!workerCardData) return;
    try {
      const genRes = await w1Api("docs:generate", {
        templateId: "one-pager",
        data: {
          title: workerCardData.name,
          description: workerCardData.description,
          targetUser: workerCardData.targetUser,
          problemSolves: workerCardData.problemSolves,
          complianceRules: workerCardData.complianceRules,
          vertical: workerCardData.vertical,
        },
      });
      if (genRes.ok && genRes.documentId) {
        const dlRes = await w1Api("docs:download", { documentId: genRes.documentId });
        if (dlRes.ok && dlRes.url) {
          window.open(dlRes.url, "_blank");
        } else {
          addAssistantMessage("Could not generate the download link. Try again.");
        }
      } else {
        addAssistantMessage("Document generation failed. Try again.");
      }
    } catch {
      addAssistantMessage("Could not generate the PDF. Try again.");
    }
  }

  function handleDraftShare() {
    const wId = worker?.id;
    if (!wId) return;
    const url = `https://app.titleapp.ai/workers/${wId}?preview=true`;
    navigator.clipboard.writeText(url).then(() => {
      addAssistantMessage("Share link copied to clipboard.");
    }).catch(() => {
      addAssistantMessage(`Share link: ${url}`);
    });
  }

  function handleDraftEdit(editedData) {
    setWorkerCardData(editedData);
  }

  // ── Asset action handlers ───────────────────────────────────
  async function handleIncludeInBuild(asset, included) {
    const token = await getFreshToken();
    if (!token) return;
    const assetId = asset.assetId || asset.id;
    const wId = worker?.id || null;
    if (included) {
      setIncludedAssetIds(prev => [...prev, assetId]);
    } else {
      setIncludedAssetIds(prev => prev.filter(id => id !== assetId));
    }
    try {
      await fetch(`${API_BASE}/api?path=/v1/asset:associate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, workerId: included ? wId : null }),
      });
    } catch (e) {
      console.warn("[sandbox] asset:associate failed:", e.message);
    }
  }

  async function handleSaveToLibrary(asset) {
    const token = await getFreshToken();
    if (!token) return;
    const assetId = asset.assetId || asset.id;
    setCanvasAssets(prev => prev.map(a =>
      (a.assetId === assetId || a.id === assetId) ? { ...a, savedToLibrary: true } : a
    ));
    try {
      await fetch(`${API_BASE}/api?path=/v1/asset:associate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, workerId: null }),
      });
    } catch (e) {
      console.warn("[sandbox] save to library failed:", e.message);
    }
  }

  async function handleDeleteAsset(asset) {
    const token = await getFreshToken();
    if (!token) return;
    const assetId = asset.assetId || asset.id;
    setCanvasAssets(prev => prev.filter(a => a.assetId !== assetId && a.id !== assetId));
    setIncludedAssetIds(prev => prev.filter(id => id !== assetId));
    try {
      await fetch(`${API_BASE}/api?path=/v1/asset:delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
    } catch (e) {
      console.warn("[sandbox] asset:delete failed:", e.message);
    }
  }

  // ── Step 2 → Step 3: Worker Card approved ────────────────────

  async function handleWorkerCardApprove(cardData) {
    // Auth gate deferred to Launch step — Build and Test are always free
    const finalCard = cardData || workerCardData;
    // Game routing gate — games skip the worker1:intake pipeline
    if (finalCard?.gameConfig?.isGame) {
      setWorkerCardData(finalCard);
      advanceToStep(3);
      addAssistantMessage("Building your game now. Packaging game rules with your artwork...");
      setTimeout(() => {
        advanceToStep(4);
        addAssistantMessage("Your game is ready to test. Try it out on the right.");
      }, 3000);
      return;
    }
    await runBuildPipeline(finalCard);
  }

  async function runBuildPipeline(cardData) {
    setWorkerCardData(cardData);
    advanceToStep(3); // Only forward — never regresses
    // Clear stale build errors before starting fresh
    setMessages(prev => prev.filter(m =>
      !m.text?.startsWith("Build intake failed") &&
      !m.text?.startsWith("Research step failed") &&
      !m.text?.startsWith("The build pipeline hit")
    ));
    addAssistantMessage("Building your worker now. This takes about a minute. Watch the progress on the right.");

    try {
      const sops = String(cardData?.complianceRules || "").split(/[.;]/).map(s => s.trim()).filter(Boolean);
      const raasTier1 = String(cardData?.raasRules || "").split(/[.;]/).map(s => s.trim()).filter(Boolean);
      const isPublic = !cardData.internal_only;

      // Generate workerId upfront if we don't have one
      const workerId = worker?.id || ("wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
      if (!worker?.id) {
        setWorker(prev => ({ ...(prev || {}), id: workerId, name: cardData.name }));
      }

      // Step 1: Intake
      const intakeRes = await w1Api("worker1:intake", {
        workerId,
        name: cardData.name,
        vertical: cardData.vertical || vertical,
        jurisdiction: cardData.jurisdiction || jurisdiction || "National",
        description: cardData.description,
        sops,
        raas_tier_1_rules: raasTier1,
        raas_tier_2_policies: sops,
        internal_only: cardData.internal_only,
        ...(isHE && { heJurisdiction: cardData.jurisdiction, deploymentTier: isPublic ? 2 : 3 }),
      });
      if (!intakeRes.ok) {
        console.error("[Build] intake failed:", intakeRes);
        addAssistantMessage(`Build intake failed: ${intakeRes.error || "unknown error"}. Try approving the card again.`);
        return;
      }
      const confirmedWorkerId = intakeRes.workerId || workerId;
      setWorker(prev => ({ ...(prev || {}), id: confirmedWorkerId, name: cardData.name, buildPhase: "intake" }));

      // Step 2: Research (calls Claude — may take 30-60s)
      const researchRes = await w1Api("worker1:research", { workerId: confirmedWorkerId });
      if (!researchRes.ok) {
        console.error("[Build] research failed:", researchRes);
        addAssistantMessage(`Research step failed: ${researchRes.error || "unknown error"}. The worker was created but rules couldn't be compiled. Try again from the Worker Card.`);
        return;
      }
      setWorker(prev => ({ ...(prev || {}), buildPhase: "brief", complianceBrief: researchRes.brief }));

      // Step 3: Save rules
      const saveRes = await w1Api("worker1:rules:save", { workerId: confirmedWorkerId, tier2: researchRes.brief?.tier2 || [], tier3: sops });
      if (!saveRes.ok) {
        console.error("[Build] rules:save failed:", saveRes);
      }
    } catch (err) {
      console.error("[Build] Pipeline error:", err);
      addAssistantMessage(`The build pipeline hit an error: ${err.message || "unknown"}. Try approving the card again.`);
    }
  }

  async function handleInlineSignup(e) {
    e.preventDefault();
    if (!authEmail.trim() || !authName.trim()) return;
    setAuthLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api?path=/v1/auth:signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail.trim(),
          name: authName.trim(),
          surface: "sandbox",
          ...(sessionStorage.getItem("ta_utm") ? { utmAttribution: JSON.parse(sessionStorage.getItem("ta_utm")) } : {}),
        }),
      });
      const result = await resp.json();
      if (result.ok && result.token) {
        // result.token is a Firebase custom token — sign in to get a real ID token
        let idToken = result.token; // fallback
        try {
          const userCred = await signInWithCustomToken(firebaseAuth, result.token);
          idToken = await userCred.user.getIdToken();
        } catch (authErr) {
          console.error("[Signup] Firebase sign-in failed:", authErr);
        }
        localStorage.setItem("ID_TOKEN", idToken);
        if (result.uid) localStorage.setItem("USER_ID", result.uid);
        captureName(authName.trim());

        // Ensure tenant exists — claim one if not already set
        const existingTenant = localStorage.getItem("TENANT_ID");
        if (!existingTenant) {
          try {
            const claimRes = await fetch(`${API_BASE}/api?path=/v1/onboarding:claimTenant`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ name: authName.trim(), surface: "sandbox" }),
            });
            const claimData = await claimRes.json();
            if (claimData.ok && claimData.tenantId) {
              localStorage.setItem("TENANT_ID", claimData.tenantId);
            }
          } catch (claimErr) {
            console.error("[Signup] Tenant claim failed:", claimErr);
          }
        }

        setShowAuthPrompt(false);
        setShowSessionError(false);
        addAssistantMessage(`Welcome, ${authName.split(" ")[0]}. Your workspace is ready. Before publishing, you will review and sign the Creator Agreement — no surprises. Now let me build that worker.`);

        if (pendingCardData) {
          await runBuildPipeline(pendingCardData);
          setPendingCardData(null);
        }
      } else {
        addAssistantMessage(result.error || "Signup didn't go through. Try again or use a different email.");
      }
    } catch (err) {
      addAssistantMessage("Could not reach the signup server. Check your connection and try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Handle session error — silent inline UI, not Alex conversation
  function handleSessionError() {
    setShowSessionError(true);
  }

  function handleSessionReauth() {
    setShowSessionError(false);
    setShowAuthPrompt(true);
  }

  // ── Step 3 → Step 4: Build complete → Test ──────────────────

  function handleBuildComplete(buildData) {
    try {
      const safeData = buildData || {};
      setWorker(prev => {
        const merged = { ...(prev || {}), ...safeData };
        // BUG-001: Never lose the workerId during merge
        if (!merged.id && prev?.id) merged.id = prev.id;
        return merged;
      });
      advanceToStep(4);
      fireConfetti("full");
      setTimeout(() => fireConfetti("medium"), 600);
      const name = safeData.name || workerCardData?.name || "your worker";
      addAssistantMessage(`Your ${name} is built. Test it on the right — talk to it like a subscriber would. After a few exchanges I'll ask you a few quick questions about how it performed.`);
    } catch (e) {
      console.error("[handleBuildComplete] Error during transition:", e);
      addAssistantMessage("Build is complete, but there was a hiccup loading the test panel. Let me try again.");
      setTimeout(() => { setFlowStep(4); }, 500);
    }
  }

  // ── Step 4 → Step 5: Test complete → Preflight ───────────

  function handleTestComplete() {
    // Auth gate — publishing requires an account
    const token = localStorage.getItem("ID_TOKEN");
    if (!token) {
      setShowAuthPrompt(true);
      addAssistantMessage("Before we move to Preflight, let's create your account. Sign up below — it's free.");
      return;
    }
    advanceToStep(5);
    addAssistantMessage("Testing complete. Now let's get the paperwork done — review each gate on the right and I'll submit for admin review when you're ready.");
  }

  // ── Step 5 → Step 6: Preflight complete → Distribute ───────────

  function handlePreflightComplete(publishedWorker) {
    setWorker(publishedWorker);
    advanceToStep(6);
    fireConfetti("full");
    setTimeout(() => fireConfetti("medium"), 500);
    const wName = publishedWorker.name || workerCardData?.name || "Your worker";
    const isGame = !!workerCardData?.gameConfig?.isGame;
    addAssistantMessage(getPostLaunchMessage(wName, isGame));
  }

  // ── Step 6 → Step 7: Distribution done → Grow ─────────────

  function handleMoveToGrow() {
    advanceToStep(7);
    addAssistantMessage("One last thing. Set up how you want me to stay in touch with you. I will send you weekly earnings updates, usage insights, and growth tips. No dashboard to log into — I come to you.");
  }

  function handleCommsComplete() {
    addAssistantMessage("You are all set. Your worker is live, your distribution kit is ready, and I will check in with you every week. Text me or email me anytime. Good luck out there.");
  }

  // ── Test survey (Alex guided) ──────────────────────────────

  function handleTestExchange(count) {
    setTestExchangeCount(count);
    if (count === 3 && surveyStep === 0 && !surveyComplete) {
      addAssistantMessage("You've tested a few exchanges. Quick survey — " + SURVEY_QUESTIONS[0].question);
    }
  }

  function handleSurveyAnswer(answer) {
    const q = SURVEY_QUESTIONS[surveyStep];
    setSurveyAnswers(prev => ({ ...prev, [q.key]: answer }));
    addUserMessage(answer);
    if (surveyStep < SURVEY_QUESTIONS.length - 1) {
      const nextStep = surveyStep + 1;
      setSurveyStep(nextStep);
      setTimeout(() => addAssistantMessage(SURVEY_QUESTIONS[nextStep].question), 500);
    } else {
      setSurveyComplete(true);
      addAssistantMessage("Great — survey done. Click 'Continue to Preflight' below when you're ready.");
      // Fire-and-forget audit trail
      if (worker?.id) {
        w1Api("worker:test:audit", {
          workerId: worker.id,
          testSessionId: sessionId,
          exchanges: testExchangeCount,
          surveyResponses: { ...surveyAnswers, [q.key]: answer },
          testPassedAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── Post-publish edit ──────────────────────────────────────

  function handleEditWorker(existingWorker) {
    setEditMode(true);
    setWorker(existingWorker);
    setWorkerCardData({
      name: existingWorker.name || existingWorker.display_name || "Your Worker",
      description: existingWorker.description || "",
      targetUser: existingWorker.targetUser || "General audience",
      problemSolves: existingWorker.problemSolves || "General productivity improvement",
      complianceRules: (existingWorker.raas_tier_1 || []).join(". ") || "Standard compliance",
      vertical: existingWorker.suite || existingWorker.category || "",
      jurisdiction: existingWorker.jurisdiction || "GLOBAL",
      pricingTier: existingWorker.pricingTier || 2,
      mdGateRequired: existingWorker.mdGateRequired || false,
      internal_only: existingWorker.internal_only || false,
    });
    viewStep(4);
    addAssistantMessage(`What would you like to change about ${existingWorker.name || "your worker"}? Describe the change in the chat, or test it on the right and tell me what needs fixing.`);
  }

  // ── Image attachment handler ───────────────────────────────

  function processFiles(files) {
    if (files.length === 0) return;
    const maxFiles = 3 - pendingImages.length;
    const toProcess = files.slice(0, maxFiles);
    const allowedTypes = /^(image\/(png|jpeg|webp|heic|heif)|application\/pdf)$/;
    toProcess.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        addAssistantMessage("File too large. Max 10MB.");
        return;
      }
      if (!allowedTypes.test(file.type)) {
        addAssistantMessage("Unsupported file type. Use PNG, JPG, HEIC, or PDF.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        setPendingImages(prev => [...prev, {
          base64,
          mediaType: file.type === "application/pdf" ? "application/pdf" : file.type.replace("heic", "jpeg").replace("heif", "jpeg"),
          name: file.name,
          preview: file.type.startsWith("image/") ? reader.result : null,
        }]);
      };
      reader.onerror = () => {
        addAssistantMessage("Image upload failed. Try again.");
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFileSelect(e) {
    processFiles(Array.from(e.target.files || []));
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    processFiles(Array.from(e.dataTransfer.files || []));
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Chat input placeholder based on step
  const chatPlaceholder = flowStep <= 2
    ? (exchangeCount === 0 ? "Describe your expertise..." : "Tell Alex about your expertise...")
    : flowStep === 3 ? "Ask Alex anything about the build..."
    : flowStep === 4 ? "Test your worker — describe any problems..."
    : flowStep === 5 ? "Ask Alex about the preflight checklist..."
    : flowStep === 6 ? "Ask Alex for marketing help..."
    : "Talk to Alex...";

  // ── Render ──────────────────────────────────────────────────

  // 3-column layout: nav + chat + right panel (always visible)
  const showRightPanel = true;

  return (
    <div ref={rootRef} style={{
      ...S.root,
      ...(isMobile ? { flexDirection: "column" } : {}),
      '--accent': (workerCardData?.gameConfig?.isGame || (creatorPath && creatorPath.startsWith('game'))) ? '#16A34A' : '#6B46C1',
      '--accent-light': (workerCardData?.gameConfig?.isGame || (creatorPath && creatorPath.startsWith('game'))) ? '#DCFCE7' : 'rgba(107,70,193,0.08)',
    }}>
      {/* Resume banner */}
      {resumeWorker && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: "linear-gradient(135deg, #6B46C1, #7c3aed)", padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <span style={{ color: "white", fontSize: 14 }}>
            Your {resumeWorker.name} is waiting. Pick up where you left off.
          </span>
          <button
            onClick={() => {
              setResumeWorker(null);
              const s = savedSession.current;
              if (s?.flowStep) {
                setFlowStep(s.flowStep);
                setMaxFlowStep(s.maxFlowStep || s.flowStep);
              }
            }}
            style={{
              padding: "6px 18px", background: "rgba(255,255,255,0.2)", color: "white",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Resume
          </button>
        </div>
      )}

      {/* Column 1: Creator Studio Nav (desktop) + divider */}
      {!isMobile && (
        <>
          <CreatorStudioNav flowStep={flowStep} workerCardData={workerCardData} worker={worker} isMobile={false} style={{ width: navWidthPx }} workspaces={sandboxWorkspaces} onSwitchWorkspace={handleSandboxSwitchWorkspace} onViewStep={viewStep} onShowMyImages={() => setShowMyImages(prev => !prev)} showMyImages={showMyImages} />
          <div
            style={{ ...S.divider, ...(isDragging === "nav" || dividerHover === "nav" ? S.dividerHover : {}) }}
            onMouseDown={() => setIsDragging("nav")}
            onMouseEnter={() => setDividerHover("nav")}
            onMouseLeave={() => setDividerHover(false)}
          />
        </>
      )}

      {/* Mobile nav overlay */}
      {isMobile && showMobileNav && (
        <>
          <div onClick={() => setShowMobileNav(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 250 }} />
          <CreatorStudioNav flowStep={flowStep} workerCardData={workerCardData} worker={worker} isMobile={true} onClose={() => setShowMobileNav(false)} workspaces={sandboxWorkspaces} onSwitchWorkspace={handleSandboxSwitchWorkspace} onViewStep={viewStep} onShowMyImages={() => { setShowMyImages(prev => !prev); setShowMobileNav(false); }} showMyImages={showMyImages} />
        </>
      )}

      {/* Column 2: Chat Panel */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          ...S.chatPanel,
          ...(isMobile
            ? { width: "100%", minWidth: 0, maxWidth: "none", borderRight: "none", flex: 1, height: "100dvh" }
            : { flex: `0 0 ${chatWidthPercent}%`, minWidth: 400 }
          ),
        }}
      >
        <div style={S.chatHeader}>
          {isMobile && (
            <button onClick={() => setShowMobileNav(true)} style={{ background: "none", border: "none", fontSize: 20, color: "#64748B", cursor: "pointer", padding: "4px 8px 4px 0", lineHeight: 1 }}>&#9776;</button>
          )}
          <span style={S.chatLogo}>TitleApp</span>
          <span style={S.chatName}>Alex — Chief of Staff</span>
          {localStorage.getItem("ID_TOKEN") && creatorName && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "#10b981" }} />
              {creatorName.split(" ")[0]}
            </span>
          )}
        </div>
        {/* Welcome greeting — persistent line above chat, fades on first message */}
        {welcomeGreeting && (
          <div style={{
            padding: "20px 24px 12px",
            fontSize: 22,
            fontWeight: 700,
            color: "#1a1a2e",
            opacity: greetingVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
            flexShrink: 0,
          }}>
            {welcomeGreeting}
          </div>
        )}

        <div style={S.chatMessages}>
          <div style={{ flex: 1 }} />
          {messages.map((msg, i) => {
            // CTA button in chat
            if (msg.role === "cta") {
              return (
                <div key={i} style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                  <button
                    onClick={() => handleWorkerCardApprove(workerCardData)}
                    style={{
                      padding: "12px 28px", background: "var(--accent, #6B46C1)", color: "white",
                      border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600,
                      cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)"; }}
                  >
                    {msg.text} &rarr;
                  </button>
                </div>
              );
            }
            // Skip old "card" role messages (card now renders in right panel)
            if (msg.role === "card") return null;
            return (
              <div key={i} style={msg.role === "user" ? S.msgUser : S.msgAssistant}>
                {msg.images && msg.images.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                    {msg.images.map((img, j) => (
                      img.preview ? (
                        <img key={j} src={img.preview} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", border: "1px solid rgba(255,255,255,0.2)" }} />
                      ) : (
                        <div key={j} style={{ width: 48, height: 48, borderRadius: 6, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{img.name?.split(".").pop()?.toUpperCase() || "FILE"}</div>
                      )
                    ))}
                  </div>
                )}
                {msg.text}
              </div>
            );
          })}
          {/* "Use your existing work" inline link — shows before first user message */}
          {flowStep <= 1 && exchangeCount === 0 && !showPasteArea && messages.length >= 2 && (
            <div style={{ alignSelf: "flex-start", marginTop: -4, marginBottom: 4 }}>
              <button
                onClick={() => setShowPasteArea(true)}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  fontSize: 12, color: "#7c3aed", fontWeight: 500,
                }}
              >
                Already built something in ChatGPT or Claude? Paste it here instead &rarr;
              </button>
            </div>
          )}

          {/* Campaign suggested workers — quick-reply chips */}
          {campaignWorkerChips.length > 0 && flowStep === 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              {campaignWorkerChips.map(wid => (
                <button
                  key={wid}
                  style={{
                    padding: "7px 14px", background: "var(--accent-light, rgba(107,70,193,0.08))", color: "var(--accent, #6B46C1)",
                    border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 15%, transparent)", borderRadius: 20, fontSize: 13,
                    fontWeight: 500, cursor: "pointer", transition: "background 0.15s",
                  }}
                  onClick={() => {
                    setCampaignWorkerChips([]);
                    setInput(`Tell me about worker ${wid}`);
                  }}
                >
                  {wid}
                </button>
              ))}
            </div>
          )}

          {/* Worker vs Game — initial path choice */}
          {showPathChips && flowStep === 0 && !creatorPath && (
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <button
                style={{
                  padding: "7px 14px", background: "var(--accent-light, rgba(107,70,193,0.08))", color: "var(--accent, #6B46C1)",
                  border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 15%, transparent)", borderRadius: 20, fontSize: 13,
                  fontWeight: 500, cursor: "pointer", transition: "background 0.15s",
                }}
                onClick={() => {
                  setShowPathChips(false);
                  setCreatorPath("worker");
                  addUserMessage("Digital Worker");
                  setTimeout(() => addAssistantMessage("So \u2014 what do you want to build?"), 500);
                }}
              >
                Digital Worker
              </button>
              <button
                style={{
                  padding: "7px 14px", background: "var(--accent-light, rgba(107,70,193,0.08))", color: "var(--accent, #6B46C1)",
                  border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 15%, transparent)", borderRadius: 20, fontSize: 13,
                  fontWeight: 500, cursor: "pointer", transition: "background 0.15s",
                }}
                onClick={() => {
                  setShowPathChips(false);
                  addUserMessage("Game");
                  setTimeout(() => {
                    addAssistantMessage("Is this a casual game (a pub quiz, a treasure hunt, a company trivia game) or a training and certification game (exam prep, compliance simulation)?");
                    setShowGameTypeChips(true);
                  }, 500);
                }}
              >
                Game
              </button>
            </div>
          )}

          {/* Game type — casual vs training */}
          {showGameTypeChips && flowStep === 0 && !creatorPath && (
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <button
                style={{
                  padding: "7px 14px", background: "var(--accent-light, rgba(107,70,193,0.08))", color: "var(--accent, #6B46C1)",
                  border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 15%, transparent)", borderRadius: 20, fontSize: 13,
                  fontWeight: 500, cursor: "pointer", transition: "background 0.15s",
                }}
                onClick={() => {
                  setShowGameTypeChips(false);
                  setCreatorPath("game-casual");
                  addUserMessage("Casual game");
                  setTimeout(() => addAssistantMessage("Great \u2014 casual games get full creative freedom. No compliance requirements, just fun. What kind of game are you thinking? Describe the experience you want players to have."), 500);
                }}
              >
                Casual game
              </button>
              <button
                style={{
                  padding: "7px 14px", background: "var(--accent-light, rgba(107,70,193,0.08))", color: "var(--accent, #6B46C1)",
                  border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 15%, transparent)", borderRadius: 20, fontSize: 13,
                  fontWeight: 500, cursor: "pointer", transition: "background 0.15s",
                }}
                onClick={() => {
                  setShowGameTypeChips(false);
                  setCreatorPath("game-regulated");
                  addUserMessage("Training and certification");
                  setTimeout(() => addAssistantMessage("Training games need accuracy. We\u2019ll build in compliance rules and source verification from the start. What subject area and what certification or exam are you targeting?"), 500);
                }}
              >
                Training & certification
              </button>
            </div>
          )}

          {sending && (
            <>
              <style>{`@keyframes thinkBounce { 0%, 60%, 100% { transform: translateY(0) } 30% { transform: translateY(-4px) } }`}</style>
              <div style={{ alignSelf: "flex-start", background: "#F4F4F8", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", display: "flex", alignItems: "center", gap: 3 }}>
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#94A3B8", animation: `thinkBounce 1.2s ease-in-out ${d}s infinite` }} />
                ))}
              </div>
            </>
          )}

          {/* Step 4: Survey chips — Alex guided test survey */}
          {flowStep === 4 && !surveyComplete && testExchangeCount >= 3 && surveyStep < SURVEY_QUESTIONS.length && !sending && (
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              {SURVEY_QUESTIONS[surveyStep].chips.map(chip => (
                <button
                  key={chip}
                  style={{
                    padding: "7px 14px", background: "var(--accent-light, rgba(107,70,193,0.08))", color: "var(--accent, #6B46C1)",
                    border: "1px solid color-mix(in srgb, var(--accent, #6B46C1) 15%, transparent)", borderRadius: 20, fontSize: 13,
                    cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
                    transition: "background 0.2s",
                  }}
                  onClick={() => handleSurveyAnswer(chip)}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(107,70,193,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(107,70,193,0.08)"; }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Continue to Preflight — shown once at least one test exchange happened */}
          {flowStep === 4 && testExchangeCount > 0 && (
            <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
              <button
                onClick={handleTestComplete}
                style={{
                  padding: "10px 24px", background: surveyComplete ? "var(--accent, #6B46C1)" : "#94A3B8", color: "white",
                  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                {surveyComplete ? "Continue to Preflight \u2192" : "I'm done testing \u2014 Continue to Preflight \u2192"}
              </button>
            </div>
          )}

          {/* Inline signup — rendered as a distinct card, not a chat bubble */}
          {showAuthPrompt && (
            <div style={{
              alignSelf: "center", background: "#FFFFFF", border: "2px solid var(--accent, #6B46C1)", borderRadius: 16,
              padding: "24px 20px", maxWidth: 360, width: "100%", boxShadow: "0 4px 24px color-mix(in srgb, var(--accent, #6B46C1) 12%, transparent)",
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Create your workspace</div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, marginBottom: 16 }}>
                Your worker needs a home. This creates your free creator account.
              </div>
              <form onSubmit={handleInlineSignup} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  required
                  autoFocus
                  style={{ padding: "10px 12px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none" }}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                  style={{ padding: "10px 12px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{ padding: "12px 20px", background: "var(--accent, #6B46C1)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: authLoading ? "wait" : "pointer", opacity: authLoading ? 0.7 : 1 }}
                >
                  {authLoading ? "Creating your workspace..." : "Sign up and build"}
                </button>
              </form>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
                By signing up you agree to TitleApp's <a href="/legal/terms-of-service" target="_blank" style={{ color: "#7c3aed" }}>Terms of Service</a>.
              </div>
            </div>
          )}

          {/* Session error — silent inline UI, not Alex */}
          {showSessionError && (
            <div style={{
              alignSelf: "flex-start", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
              padding: 16, maxWidth: "85%", display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ fontSize: 13, color: "#1a1a2e", lineHeight: 1.5 }}>
                Something went wrong with your session. Click below to sign in and pick up where you left off.
              </div>
              <button
                onClick={handleSessionReauth}
                style={{ padding: "10px 20px", background: "var(--accent, #6B46C1)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Sign in
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        <div style={S.chatInputWrap}>
          {/* "Use Your Existing Work" paste area */}
          {flowStep <= 1 && exchangeCount === 0 && showPasteArea && (
            <div style={{
              background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 12,
              padding: 16, marginBottom: 12,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>
                Paste your existing work
              </div>
              <textarea
                autoFocus
                value={bridgePasteBack === " " ? "" : bridgePasteBack}
                onChange={e => setBridgePasteBack(e.target.value)}
                placeholder="Paste your prompt, workflow, or description from another tool..."
                style={{
                  width: "100%", minHeight: 100, padding: "10px 12px",
                  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8,
                  fontSize: 13, color: "#1a1a2e", outline: "none", resize: "vertical",
                  marginBottom: 10, fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleBridgeSend}
                  disabled={!bridgePasteBack.trim()}
                  style={{
                    padding: "8px 16px", background: bridgePasteBack.trim() ? "var(--accent, #6B46C1)" : "#E2E8F0",
                    color: bridgePasteBack.trim() ? "white" : "#94A3B8", border: "none", borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: bridgePasteBack.trim() ? "pointer" : "default",
                  }}
                >Send to Alex</button>
                <button
                  onClick={() => { setShowPasteArea(false); setBridgePasteBack(""); }}
                  style={{ padding: "8px 16px", background: "transparent", color: "#94A3B8", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                >Cancel</button>
              </div>
            </div>
          )}

          {pendingImages.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {pendingImages.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {img.preview ? (
                    <img src={img.preview} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", border: "1px solid #E2E8F0" }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 6, background: "#F8F9FC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#64748B", fontWeight: 600 }}>PDF</div>
                  )}
                  <button
                    onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9, background: "#dc2626", color: "white", border: "none", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                  >&times;</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", overflowX: "auto" }}>
            <button
              onClick={() => { setInput("Create artwork for my project"); requestAnimationFrame(() => handleSend()); }}
              style={{ fontSize: 13, color: "#475569", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 16, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
            >Generate artwork</button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: "8px 10px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#64748B", cursor: "pointer", fontSize: 16, flexShrink: 0, lineHeight: 1 }}
              title="Attach screenshot"
            >&#128206;</button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf" multiple style={{ display: "none" }} onChange={handleFileSelect} />
            <textarea
              ref={chatInputRef}
              style={{ ...S.chatInput, flex: 1, overflowY: "auto", minHeight: isMobile ? 52 : 44 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              onFocus={e => { e.target.style.borderColor = "var(--accent, #6B46C1)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }}
              onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
              placeholder={chatPlaceholder}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={sending || (!input.trim() && pendingImages.length === 0)}
              style={{
                padding: "10px 16px", background: input.trim() ? "var(--accent, #6B46C1)" : "#E2E8F0",
                color: input.trim() ? "white" : "#94A3B8", border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: input.trim() ? "pointer" : "default",
                flexShrink: 0, transition: "background 0.2s",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Draggable divider between chat and right panel (desktop only) */}
      {!isMobile && showRightPanel && (
        <div
          style={{
            ...S.divider,
            ...(isDragging === "chat" || dividerHover === "chat" ? S.dividerHover : {}),
          }}
          onMouseDown={() => setIsDragging("chat")}
          onMouseEnter={() => setDividerHover("chat")}
          onMouseLeave={() => setDividerHover(false)}
        />
      )}

      {/* Mobile: backdrop when sheet is open */}
      {isMobile && showMobilePanel && showRightPanel && (
        <div
          onClick={() => setShowMobilePanel(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 150 }}
        />
      )}

      {/* Mobile: floating preview tab */}
      {isMobile && !showMobilePanel && showRightPanel && (
        <button
          onClick={() => setShowMobilePanel(true)}
          style={{
            position: "fixed", bottom: "calc(80px + env(safe-area-inset-bottom, 0px))", right: 16, zIndex: 100,
            padding: "10px 16px", background: "var(--accent, #6B46C1)", color: "white",
            border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 4px 16px rgba(107,70,193,0.3)",
            minHeight: 44, minWidth: 44,
          }}
        >
          {flowStep <= 2 ? "How This Works" : "Preview your worker"}
        </button>
      )}

      {/* Right: Workspace — step-specific content (steps 3+) */}
      {showRightPanel && (
        <div style={{
          ...S.workPanel,
          ...(isMobile ? {
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
            height: showMobilePanel ? "85vh" : 0,
            overflow: showMobilePanel ? "auto" : "hidden",
            transition: "height 0.3s ease",
            borderRadius: showMobilePanel ? "16px 16px 0 0" : 0,
            boxShadow: showMobilePanel ? "0 -4px 24px rgba(0,0,0,0.15)" : "none",
          } : {}),
        }}>
          {/* Mobile sheet drag handle */}
          {isMobile && showMobilePanel && (
            <div
              onClick={() => setShowMobilePanel(false)}
              style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", cursor: "pointer" }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E2E8F0" }} />
            </div>
          )}
          {/* Step indicator — simple header for steps 0-2, tabs for 3-7 */}
          {flowStep <= 2 ? (
            <div style={{ textAlign: "center", padding: "14px 16px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent, #6B46C1)" }}>Your Workspace</div>
                {(creatorPath && creatorPath.startsWith('game')) || workerCardData?.gameConfig?.isGame ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: 10 }}>GAME</span>
                ) : creatorPath === 'worker' || workerCardData ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent, #6B46C1)", background: "var(--accent-light, rgba(107,70,193,0.08))", padding: "2px 8px", borderRadius: 10 }}>WORKER</span>
                ) : null}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                {workerCardData ? (workerCardData.gameConfig?.isGame ? "Your game card is ready" : "Your worker card is ready") :
                 exchangeCount === 0 ? (creatorPath && creatorPath.startsWith('game') ? "Follow the steps to build your game" : "Follow the steps to build your Digital Worker") :
                 `Exchange ${exchangeCount} of ~5`}
              </div>
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "10px 16px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
              <button
                onClick={() => { if (flowStep > 3 && flowStep - 1 <= maxFlowStep) viewStep(flowStep - 1); }}
                disabled={flowStep <= 3}
                style={{ background: "none", border: "none", fontSize: 18, color: flowStep > 3 ? "var(--accent, #6B46C1)" : "#E2E8F0", cursor: flowStep > 3 ? "pointer" : "default", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
              >&larr;</button>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent, #6B46C1)" }}>{flowStep - 2} {FLOW_STEPS[flowStep - 1]}</span>
              <button
                onClick={() => { if (flowStep < maxFlowStep) viewStep(flowStep + 1); }}
                disabled={flowStep >= maxFlowStep}
                style={{ background: "none", border: "none", fontSize: 18, color: flowStep < maxFlowStep ? "var(--accent, #6B46C1)" : "#E2E8F0", cursor: flowStep < maxFlowStep ? "pointer" : "default", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
              >&rarr;</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E2E8F0", padding: "0 16px", background: "#FFFFFF" }}>
              {FLOW_STEPS.slice(2).map((step, i) => {
                const stepNum = i + 3; // steps 3-7
                const isActive = flowStep === stepNum;
                const isComplete = maxFlowStep > stepNum;
                const isReachable = stepNum <= maxFlowStep + 1;
                return (
                  <div
                    key={step}
                    style={{
                      padding: "12px 16px", fontSize: 13, fontWeight: 600,
                      color: isActive ? "var(--accent, #6B46C1)" : isComplete ? "#10b981" : stepNum <= maxFlowStep ? "#1a1a2e" : "#94A3B8",
                      borderBottom: `2px solid ${isActive ? "var(--accent, #6B46C1)" : "transparent"}`,
                      display: "flex", alignItems: "center", gap: 6,
                      cursor: isReachable && !isActive ? "pointer" : "default",
                      opacity: stepNum > maxFlowStep + 1 ? 0.4 : 1,
                    }}
                    onClick={() => { if (isReachable && !isActive) { if (stepNum > maxFlowStep) advanceToStep(stepNum); else viewStep(stepNum); } }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: isActive ? "var(--accent, #6B46C1)" : isComplete ? "#10b981" : "#E2E8F0",
                      color: isActive || isComplete ? "white" : "#94A3B8", fontSize: 11, fontWeight: 700,
                    }}>
                      {isComplete ? "\u2713" : i + 1}
                    </span>
                    {step}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step description — only for steps 3+ */}
          {flowStep >= 3 && (
            <div style={{ textAlign: "center", padding: "8px 16px", fontSize: 13, color: "#94A3B8", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
              {[
                "Watch Alex build your worker live",
                "Test your worker before it goes live",
                "Complete all gates before publishing",
                "Publish and share your worker",
                "Alex tracks your earnings and growth",
              ][flowStep - 3] || ""}
            </div>
          )}

          <div ref={rightPanelRef} style={S.tabContent}>
            {/* My Images panel — shown when toggled from nav */}
            {showMyImages && (
              <MyImagesPanel onClose={() => setShowMyImages(false)} />
            )}

            {/* Steps 0-2 — Lifecycle card + Progressive card / Draft card */}
            {flowStep <= 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <LifecycleCard flowStep={flowStep} isGame={!!(workerCardData?.gameConfig?.isGame || (creatorPath && creatorPath.startsWith('game')))} />
                {workerCardData ? (
                  <InlineDraftCard
                    cardData={workerCardData}
                    onContinue={() => handleWorkerCardApprove(workerCardData)}
                    onDownload={handleDraftDownload}
                    onShare={handleDraftShare}
                    onEdit={handleDraftEdit}
                  />
                ) : exchangeCount > 0 ? (
                  <ProgressiveCard
                    exchangeCount={exchangeCount}
                    progressiveFields={progressiveFields}
                    workerCardData={workerCardData}
                  />
                ) : null}

                {/* Canvas images — render below card during Build phase (steps 0-2) */}
                {(canvasAssets.length > 0 || imageGenerating) && (
                  <div style={{ marginTop: 20 }}>
                    <CanvasImagePanel
                      assets={canvasAssets}
                      isGenerating={imageGenerating}
                      selectedStyle={canvasStyle}
                      onStyleSelect={setCanvasStyle}
                      workerCardData={workerCardData}
                      onRetry={() => { setInput("Generate another image"); requestAnimationFrame(() => handleSend()); }}
                      onUseAs={(asset, role) => {
                        setCanvasAssets(prev => prev.map(a => a === asset ? { ...a, useAs: role } : a));
                      }}
                      onIncludeInBuild={handleIncludeInBuild}
                      onSaveToLibrary={handleSaveToLibrary}
                      onDelete={handleDeleteAsset}
                      currentWorkerId={worker?.id}
                      includedAssetIds={includedAssetIds}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Build */}
            {flowStep === 3 && (
              <PanelErrorBoundary
                recoverLabel="Retry Build"
                onRecover={() => { viewStep(2); }}
              >
                <BuildProgress
                  worker={worker}
                  workerCardData={workerCardData}
                  onWorkerUpdate={setWorker}
                  onTestReady={handleBuildComplete}
                  workerIconUrl={workerIconUrl}
                  onIconChange={(url) => {
                    setWorkerIconUrl(url);
                    setWorkerCardData(prev => prev ? { ...prev, iconDataUrl: url } : prev);
                  }}
                />
                {(canvasAssets.length > 0 || imageGenerating) && (
                  <div style={{ marginTop: 20 }}>
                    <CanvasImagePanel
                      assets={canvasAssets}
                      isGenerating={imageGenerating}
                      selectedStyle={canvasStyle}
                      onStyleSelect={setCanvasStyle}
                      workerCardData={workerCardData}
                      onRetry={() => { setInput("Generate another image"); requestAnimationFrame(() => handleSend()); }}
                      onUseAs={(asset, role) => {
                        setCanvasAssets(prev => prev.map(a => a === asset ? { ...a, useAs: role } : a));
                      }}
                      onIncludeInBuild={handleIncludeInBuild}
                      onSaveToLibrary={handleSaveToLibrary}
                      onDelete={handleDeleteAsset}
                      currentWorkerId={worker?.id}
                      includedAssetIds={includedAssetIds}
                    />
                  </div>
                )}
              </PanelErrorBoundary>
            )}

            {/* Step 4 — Test */}
            {flowStep === 4 && (
              <PanelErrorBoundary
                recoverLabel="Back"
                onRecover={() => { viewStep(3); }}
              >
                {workerCardData?.gameConfig?.gameMode === "canvas" && !canvasDismissed ? (
                  <CanvasComingSoon onContinue={() => setCanvasDismissed(true)} />
                ) : worker?.id ? (
                  <TestWorkerPanel
                    key={`${worker?.id}_${workerCardData?.name || ""}`}
                    worker={worker}
                    workerCardData={workerCardData}
                    sessionId={sessionId}
                    onExchange={handleTestExchange}
                  />
                ) : (
                  <TestPanelFallback worker={worker} workerCardData={workerCardData} onReady={(w) => setWorker(w)} onBack={() => { viewStep(3); }} />
                )}
              </PanelErrorBoundary>
            )}

            {/* Step 5 — Preflight */}
            {flowStep === 5 && (
              <PanelErrorBoundary
                recoverLabel="Back to Test"
                onRecover={() => viewStep(4)}
              >
                <PublishPreflight
                  worker={worker}
                  workerCardData={workerCardData}
                  sessionId={sessionId}
                  onPublish={handlePreflightComplete}
                />
              </PanelErrorBoundary>
            )}

            {/* Step 6 — Distribute */}
            {flowStep === 6 && (
              <>
                <DistributionKit worker={worker} workerCardData={workerCardData} hasUpdatedSinceLaunch={hasUpdatedSinceLaunch} />
                <CreatorSpotlight worker={worker} workerCardData={workerCardData} />
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <button style={S.btnPrimary} onClick={handleMoveToGrow}>
                    Continue to Grow
                  </button>
                </div>
              </>
            )}

            {/* Step 7 — Grow */}
            {flowStep === 7 && (
              <CommsPreferences
                worker={worker}
                workerCardData={workerCardData}
                onComplete={handleCommsComplete}
              />
            )}
          </div>

          {/* Status Bar */}
          <div style={S.statusBar}>
            <span style={{ fontWeight: 600, color: "#1a1a2e" }}>
              {flowStep <= 2 ? "Defining" : `Step ${flowStep - 2}: ${FLOW_STEPS[flowStep - 1]}`}
            </span>
            {workerCardData?.name && <span>{workerCardData.name}</span>}
            <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
              {FLOW_STEPS.slice(2).map((s, i) => (
                <span key={s} style={{ width: 24, height: 4, borderRadius: 2, background: i + 3 <= maxFlowStep ? "var(--accent, #6B46C1)" : "#E2E8F0" }} />
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
