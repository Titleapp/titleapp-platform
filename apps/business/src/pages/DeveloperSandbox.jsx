import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { signInWithCustomToken } from "firebase/auth";
import {
  renderMarkdown as sharedRenderMarkdown,
  isAffirmative as sharedIsAffirmative,
  isMetaQuestion as sharedIsMetaQuestion,
  isTestTrigger as sharedIsTestTrigger,
  findUnfilledSlot as sharedFindUnfilledSlot,
  ensureAnonymousAuthForBuild as sharedEnsureAnonymousAuthForBuild,
} from "../lib/sandboxHelpers";
import SharedCreatorStudioHeader from "../components/sandbox/CreatorStudioHeader";
import { auth as firebaseAuth } from "../firebase";
import BuildProgress from "../components/BuildProgress";
import TestWorkerPanel from "../components/TestWorkerPanel";
import CanvasComingSoon from "../components/sandbox/CanvasComingSoon";
import GameBoardPanel from "../components/sandbox/GameBoardPanel";
import StepStatusBar from "../components/sandbox/StepStatusBar";
import CollapsibleSection from "../components/sandbox/CollapsibleSection";
import { getPostLaunchMessage } from "../components/studio/PostLaunchAlex";
import CanvasImagePanel from "../components/canvas/CanvasImagePanel";
import MyImagesPanel from "../components/MyImagesPanel";
import DistributionKit from "../components/DistributionKit";
import CommsPreferences from "../components/CommsPreferences";
import PublishPreflight from "../components/PublishPreflight";
import CreatorSpotlight from "../components/CreatorSpotlight";
import { fireConfetti } from "../utils/celebrations";
import FileUploadBar, { classifyFile, validateFiles, ACCEPT_STRING } from "../components/sandbox/FileUploadBar";
import { encodeFilesForChat } from "../api/sandboxWorkerApi";

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
  // 47.9 HOTFIX: 100dvh → 100vh. 100dvh triggers infinite resize loop on
  // iOS Safari (address bar show/hide changes dvh → layout recalc → repeat).
  root: { display: "flex", height: "100vh", overflow: "hidden", background: "#F8F9FC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a1a2e" },
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

// CODEX 47.5 Fix 2 — robust Firebase ID token getter.
//
// Failure modes the previous implementation hid:
//
//   1. getIdToken(true) makes a network round-trip to Google's STS to force
//      a refresh. If that round-trip fails (cold tab wake, transient network,
//      Google STS hiccup) the empty `catch (_) {}` swallowed the error and
//      fell through to localStorage.ID_TOKEN, which is the original sign-in
//      token and may be > 1 hour old → expired → backend 401. This is the
//      pattern reported in CODEX 47.5 ("Session 1 works, Session 2 fails"):
//      Session 1 fires within seconds of token issue; Session 2 happens after
//      the user reads the worker card, and by then the cached token is stale
//      and the silent refresh failure produces a stale fallback token.
//
//   2. If currentUser was null (auth not yet hydrated from IndexedDB) the
//      helper bailed straight to localStorage with no wait, producing the
//      same stale-token outcome on first paint.
//
// New behavior:
//   - waitForAuth() resolves on the first NON-NULL onAuthStateChanged
//     callback. Firebase emits a synchronous null callback before reading
//     the session, which the previous implementation never accounted for.
//   - Prefer getIdToken(false) (cached if not expired). Only force-refresh
//     if the cached token is gone or rejected. This is faster AND more
//     reliable because we no longer depend on the STS round trip succeeding
//     on every call.
//   - Errors are logged, not swallowed.
let _authReadyPromise = null;
function waitForAuthInternal(timeoutMs = 5000) {
  if (firebaseAuth?.currentUser) return Promise.resolve(firebaseAuth.currentUser);
  if (_authReadyPromise) return _authReadyPromise;
  _authReadyPromise = new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { unsub(); } catch (_) {}
      resolve(null);
    }, timeoutMs);
    const unsub = firebaseAuth.onAuthStateChanged((user) => {
      if (settled || !user) return; // skip null callbacks
      settled = true;
      clearTimeout(timer);
      try { unsub(); } catch (_) {}
      resolve(user);
    });
  });
  _authReadyPromise.finally(() => { _authReadyPromise = null; });
  return _authReadyPromise;
}

async function getFreshToken() {
  const user = await waitForAuthInternal();
  if (user) {
    try {
      // Cached path. Firebase only goes to the network if the cached token
      // is within ~5 minutes of expiry, so this is fast and resilient.
      const token = await user.getIdToken(false);
      if (token) {
        localStorage.setItem("ID_TOKEN", token);
        return token;
      }
    } catch (e) {
      console.warn("[getFreshToken] cached getIdToken failed, retrying with force refresh:", e?.message);
    }
    try {
      const token = await user.getIdToken(true);
      if (token) {
        localStorage.setItem("ID_TOKEN", token);
        return token;
      }
    } catch (e) {
      console.error("[getFreshToken] forced getIdToken failed:", e?.message);
    }
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

// CODEX 48.5 — renderMarkdown, isAffirmative, isMetaQuestion, isTestTrigger,
// findUnfilledSlot, and ensureAnonymousAuthForBuild now live in
// ../lib/sandboxHelpers so both DeveloperSandbox and WorkerSandbox share them.
// Local aliases below preserve the original call sites.
const renderMarkdown = sharedRenderMarkdown;

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

// CODEX 47.1 Fix 6 — One-tap device picker shown before game test mode launches.
// Default to Mobile if creator skips. Selection persists in session state.
function DeviceSelector({ onSelect }) {
  const opts = [
    { id: "mobile",  label: "Mobile",  desc: "Swipe controls, portrait" },
    { id: "tablet",  label: "Tablet",  desc: "Touch, landscape or portrait" },
    { id: "desktop", label: "Desktop", desc: "Keyboard / mouse, wider canvas" },
  ];
  return (
    <div style={{
      padding: "32px 24px", textAlign: "center",
      background: "#0f172a", borderRadius: 12, color: "#fff",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
        Test Mode
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>How do you want to play?</div>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 24 }}>
        Pick a device — controls and layout will adapt.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {opts.map(o => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            style={{
              flex: "1 1 140px", maxWidth: 180, padding: "20px 14px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12, cursor: "pointer", color: "#fff",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--accent, #16A34A)"; e.currentTarget.style.borderColor = "var(--accent, #16A34A)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          >
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{o.label}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{o.desc}</div>
          </button>
        ))}
      </div>
      <button
        onClick={() => onSelect("mobile")}
        style={{
          background: "transparent", color: "rgba(255,255,255,0.6)",
          border: "none", fontSize: 12, cursor: "pointer", textDecoration: "underline",
        }}
      >
        Skip — use Mobile
      </button>
    </div>
  );
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
  // CODEX 47.1 Fix 10 — add "Refine" as a 5th stage. For games it's the
  // ongoing post-launch loop where the creator pushes new versions and
  // responds to player feedback. Always available after Launch.
  const stages = isGame ? [
    { num: 1, title: "Build", desc: "Describe your game. I'll shape the rules, characters, and mechanics.", range: [0, 1, 2] },
    { num: 2, title: "Test", desc: "Play your own game. See it in action. Refine until it's fun.", range: [3, 4] },
    { num: 3, title: "Launch", desc: "Publish your game. Get it in front of players.", range: [5] },
    { num: 4, title: "Grow", desc: "Track plays, share, and grow your audience.", range: [6] },
    { num: 5, title: "Refine", desc: "Update your game, respond to player feedback, push new versions. Always available after Launch — ongoing loop.", range: [7] },
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

// CODEX 48.5 — CreatorStudioHeader moved to components/sandbox/CreatorStudioHeader.jsx
// Local alias so downstream JSX keeps working.
const CreatorStudioHeader = SharedCreatorStudioHeader;

// ── Creator Studio Nav (left nav — Column 1) ──
function CreatorStudioNav({ flowStep, workerCardData, worker, isMobile, onClose, style, workspaces = [], onSwitchWorkspace, onViewStep, onShowMyImages, showMyImages, isGameMode = false }) {
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

      {/* Header — CODEX 48.4 Fix HH: show user name + initials when authed (non-anonymous) */}
      <CreatorStudioHeader isMobile={isMobile} onClose={onClose} />


      {/* Dashboard */}
      <div style={S.navSection}>
        <div style={S.navSectionTitle}>{isGameMode ? "Game Dashboard" : "Dashboard"}</div>
        <div style={S.navStatGrid}>
          <div style={S.navStatTile}><div style={S.navStatValue}>0</div><div style={S.navStatLabel}>{isGameMode ? "Plays Today" : "Workers Live"}</div></div>
          <div style={S.navStatTile}><div style={S.navStatValue}>0</div><div style={S.navStatLabel}>{isGameMode ? "Active Players" : "Subscribers"}</div></div>
          <div style={S.navStatTile}><div style={S.navStatValue}>$0</div><div style={S.navStatLabel}>This Month</div></div>
          <div style={S.navStatTile}><div style={S.navStatValue}>&mdash;</div><div style={S.navStatLabel}>{isGameMode ? "Version" : "Trend"}</div></div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(226,232,240,0.45)", marginTop: 8, lineHeight: 1.5 }}>{isGameMode ? "Launch your first game to start earning." : "Launch your first worker to start earning."}</div>
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

      {/* My Audience / Leaderboard */}
      <div style={S.navSection}>
        <div style={S.navSectionTitle}>{isGameMode ? "Leaderboard" : "My Audience"}</div>
        <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)", padding: "6px 0" }}>
          {isGameMode ? "Top players will appear here once your game launches." : "Your subscribers will appear here once you launch."}
        </div>
      </div>

      {/* My Images / Assets */}
      <div style={S.navSection}>
        <div
          onClick={() => onShowMyImages && onShowMyImages()}
          style={{
            ...S.navItem,
            ...(showMyImages ? S.navItemActive : {}),
            cursor: "pointer",
          }}
        >
          {isGameMode ? "Assets" : "My Images"}
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
  const [canvasAssets, setCanvasAssets] = useState(() => savedSession.current?.canvasAssets || []);
  const [canvasStyle, setCanvasStyle] = useState(null);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [includedAssetIds, setIncludedAssetIds] = useState(() => savedSession.current?.includedAssetIds || []);
  const [showMyImages, setShowMyImages] = useState(false);
  // CODEX 47.10 — File upload state
  const [pendingFiles, setPendingFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  // Fix 7 — Anonymous save banner: shown once per session after artwork phase has 1+ char + 1+ bg
  const [showAnonSaveBanner, setShowAnonSaveBanner] = useState(false);
  const anonSaveBannerShownRef = useRef(false);
  // CODEX 47.1 Fix 2 — render the Define the Rules / Create the Artwork CTA buttons
  // exactly once per session. Once tapped or rendered, never re-render.
  const rulesButtonShownRef = useRef(false);
  const artworkButtonShownRef = useRef(false);
  // CODEX 47.3 Fix 2 — fire the post-save recap message + intro CTA exactly
  // once per session. Backend re-sends [WORKER_SPEC] on follow-up turns; we
  // must not repeat the "Saved to your Vault" recap or stack duplicate CTAs.
  const sessionIntroSentRef = useRef(false);
  // CODEX 47.1 Fix 6 — selected device for game test mode (mobile / tablet / desktop)
  const [testDevice, setTestDevice] = useState(() => savedSession.current?.testDevice || null);

  // Exchange counter (steps 1-2) — used for extractSpec fallback + progressive card
  const [exchangeCount, setExchangeCount] = useState(0);
  const [progressiveFields, setProgressiveFields] = useState({ name: null, description: null, category: null });

  // Game session phase tracker — null | "rules" | "artwork" | "ready"
  // null = not yet started; "rules" = answering rules questions;
  // "artwork" = generating images; "interactions" = defining movement/collision; "ready" = ready to test
  const [gameSessionPhase, setGameSessionPhase] = useState(() => savedSession.current?.gameSessionPhase || null);
  const [gameRulesAnswered, setGameRulesAnswered] = useState(() => savedSession.current?.gameRulesAnswered || 0);
  // CODEX 47.2 Fix 13 — interactions session answer counter
  const [gameInteractionsAnswered, setGameInteractionsAnswered] = useState(() => savedSession.current?.gameInteractionsAnswered || 0);

  // CODEX 47.3 Fix 14 — image attachments removed; see comment above the
  // (now deleted) processFiles helper for context.

  // Persist session state on key changes
  useEffect(() => {
    if (!workerCardData && !worker && flowStep <= 0 && exchangeCount === 0 && canvasAssets.length === 0) return;
    try {
      localStorage.setItem("ta_sandbox_session", JSON.stringify({
        workerCardData, worker, vertical, jurisdiction, workerIconUrl,
        flowStep, maxFlowStep, exchangeCount, creatorPath,
        surveyStep, surveyAnswers, surveyComplete, testExchangeCount,
        gameSessionPhase, gameRulesAnswered, gameInteractionsAnswered,
        canvasAssets, includedAssetIds, testDevice, _v: 5,
      }));
      if (workerCardData?.name) {
        sessionStorage.setItem("ta_sandbox_worker_name", workerCardData.name);
      }
    } catch {}
  }, [workerCardData, worker, vertical, jurisdiction, workerIconUrl, flowStep, maxFlowStep, exchangeCount, creatorPath, surveyStep, surveyAnswers, surveyComplete, testExchangeCount, gameSessionPhase, gameRulesAnswered, gameInteractionsAnswered, canvasAssets, includedAssetIds, testDevice]);

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

  // CODEX 47.3 Fix 17 — Artwork done gate. When the creator has the minimum
  // assets (1 character + 1 background), Alex asks "ready to move on?" first.
  // The Interactions CTA only emits after the creator confirms in chat.
  // CODEX 47.2 Fix 13 — Interactions session is the bridge between Artwork
  // and Test. We never auto-launch Test from artwork.
  const artworkReadyPromptedRef = useRef(false);
  const gameInteractionsCtaEmitted = useRef(false);
  // CODEX 48.4 Fix K — Holds a recommended default that Alex has offered when
  // a meta-question was detected. Next affirmative reply captures the default;
  // any other reply captures itself normally. Shape: { phase, key, value }.
  const pendingDefaultRef = useRef(null);
  // CODEX 48.4 Fix G — Artwork asks only when all four asset types exist:
  // character + background + icon + score display (or lenient 8+ fallback for
  // creators who haven't tagged useAs on every asset). "Ask, don't force": Alex
  // prompts but does not advance — the user must confirm explicitly.
  useEffect(() => {
    if (gameSessionPhase !== "artwork") return;
    if (artworkReadyPromptedRef.current) return;
    const includedSet = new Set(includedAssetIds);
    const pool = canvasAssets.filter(a => includedSet.has(a.assetId || a.id));
    const inspect = pool.length > 0 ? pool : canvasAssets;
    const hasChar = inspect.some(a => a.useAs === "character");
    const hasBg = inspect.some(a => a.useAs === "background");
    const hasIcon = inspect.some(a => a.useAs === "icon");
    const hasScore = inspect.some(a => a.useAs === "score" || a.useAs === "scoreDisplay" || a.useAs === "score_display");
    const fourTypesTagged = hasChar && hasBg && hasIcon && hasScore;
    const lenientFallback = canvasAssets.length >= 8;
    if (!fourTypesTagged && !lenientFallback) return;
    artworkReadyPromptedRef.current = true;
    setTimeout(() => {
      addAssistantMessage(
        "You've got a character, background, icons, and a score display — enough to build a full playable level. " +
        "Want to keep generating more art, or are you ready to move on to interactions (movement, speed, collisions)? Just say ready when you're done."
      );
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasAssets, includedAssetIds, gameSessionPhase]);

  // CODEX 48.5 — chat-text classifiers now live in ../lib/sandboxHelpers.
  // Local aliases preserve the closure-style call sites downstream.
  const isAffirmative = sharedIsAffirmative;
  const isTestTrigger = sharedIsTestTrigger;
  const isMetaQuestion = sharedIsMetaQuestion;
  // CODEX 48.4 Fix AA — Keyword maps for slot-aware capture. When the user
  // replies mid-rubric, look at the text content and figure out which rubric
  // slot they're actually answering, regardless of what question Alex asked.
  // Prevents "chat one question behind" bugs where Alex's free-form follow-ups
  // cause the rigid counter to mis-key the answers.
  const RULE_KEYWORDS = {
    turnMechanic: /\b(turn|turns|real.?time|simultaneous|one at a time|no turns|take turns|async|sync|everyone at once|everyone plays)\b/i,
    winLoseConditions: /\b(win|wins|winning|lose|loss|losing|end|ends|ending|reach|survive|collect all|time limit|victory|defeat|game over|knocked out|eliminated|endless mode)\b/i,
    scoring: /\b(point|points|pts|score|scoring|badge|badges|level|levels|coin|coins|credit|credits|star|stars|bonus)\b/i,
    safetyCompliance: /\b(safe|safety|kid|kids|age|content|comply|compliance|profanity|violence|rating|appropriate|regulated|click|friend|no chat)\b/i,
  };
  const INTERACTION_KEYWORDS = {
    movement: /\b(swipe|tap|drag|arrow|arrows|tilt|click|touch|keyboard|wasd|gyro|joystick|move|mouse|pointer|auto.?move)\b/i,
    speed: /\b(fast|slow|speed|frantic|chill|deliberate|pace|tempo|quick|rapid|sluggish|depends on swipe)\b/i,
    collisionRules: /\b(collid|collision|hit|bump|touch|hazard|friend|boost|damage|bounce|stun|recruit|knock|dodge)\b/i,
    soundCues: /\b(sound|sounds|music|noise|noises|chime|beep|fanfare|silent|audio|sfx|effect|pop|jingle|tone|sfx|bonk|little noises)\b/i,
  };
  // CODEX 48.5 — findUnfilledSlot is shared via ../lib/sandboxHelpers
  const findUnfilledSlot = sharedFindUnfilledSlot;
  // Recommended defaults — Alex offers these when a meta-question fires.
  const GAME_RULE_DEFAULTS = {
    turnMechanic: "real-time, no turns — everyone plays at once and reacts to the action",
    winLoseConditions: "reach a score goal to win, or run out of time/lives to lose",
    scoring: "points for objectives and bonuses for streaks — no negative scoring",
    safetyCompliance: "kid-safe: no chat, no ads, no violence, no data collection beyond gameplay",
  };
  const GAME_INTERACTION_DEFAULTS = {
    movement: "tap or swipe to move on mobile, arrow keys or WASD on desktop",
    speed: "medium — fast enough to feel active but slow enough for younger players to track",
    collisionRules: "friendly touch = bonus points, hazard touch = score penalty and brief stun",
    soundCues: "point chime, hazard buzz, win fanfare, and a short lose tone",
  };
  // CODEX 48.4 Fix B — Detect when the creator's natural-language message
  // signals a phase transition. Returns the target phase id or null. Called
  // from handleSend so the state machine advances whether or not the user
  // clicks the CTA button.
  function detectPhaseIntent(text) {
    const t = (text || "").trim().toLowerCase();
    if (!t) return null;
    // "proceed to interactions" / "let's do interactions" / "define interactions" / "move on to interactions"
    if (/\b(interaction|interactions)\b/.test(t) && /\b(proceed|move|let'?s|define|do|start|next|go|ready|on to)\b/.test(t)) return "interactions";
    if (/\b(artwork|assets?|art)\b/.test(t) && /\b(proceed|move|let'?s|start|next|on to|create|generate|make)\b/.test(t)) return "artwork";
    if (/\b(rules?)\b/.test(t) && /\b(proceed|move|let'?s|define|start|next|on to)\b/.test(t)) return "rules";
    // CODEX 48.4 Fix O — later-stage natural language transitions. Return
    // flowStep target as a number so handleSend can advance flowStep directly.
    if (/\b(preflight|pre.?flight|checklist)\b/.test(t) && /\b(proceed|move|let'?s|go|next|on to|skip to|jump to)\b/.test(t)) return "preflight";
    if (/\b(distribute|distribution|launch kit|publish)\b/.test(t) && /\b(proceed|move|let'?s|go|next|on to|skip to|jump to|ready)\b/.test(t)) return "distribute";
    if (/\b(grow|grow.?&.?revise|iterate)\b/.test(t) && /\b(proceed|move|let'?s|go|next|on to)\b/.test(t)) return "grow";
    // Build/test trigger handled separately by isTestTrigger
    return null;
  }
  function emitInteractionsCta() {
    if (gameInteractionsCtaEmitted.current) return;
    gameInteractionsCtaEmitted.current = true;
    addAssistantMessage("Artwork is in. Last build session: how does the game play in your hands? Movement, speed, what happens when you touch things — that's all we need to nail down before we test.");
    setTimeout(() => {
      setMessages(prev => {
        if (prev.some(m => m.role === "cta" && m.action === "startGameInteractions")) return prev;
        return [...prev, { role: "cta", text: "Define the Interactions", action: "startGameInteractions" }];
      });
    }, 600);
  }

  // CODEX 47.1 Fix 9 — Soft auth nudge: fire after the FIRST character is saved
  // (looser than 46.10's char + bg trigger). Anonymous-only, fires once.
  useEffect(() => {
    if (anonSaveBannerShownRef.current) return;
    if (firebaseAuth?.currentUser) return; // authed users skip this
    const isGameLike = !!(workerCardData?.gameConfig?.isGame || (creatorPath && creatorPath.startsWith('game')));
    if (!isGameLike) return;
    if (canvasAssets.length === 0) return;
    const hasChar = canvasAssets.some(a => a.useAs === "character");
    if (!hasChar) return;
    anonSaveBannerShownRef.current = true;
    setShowAnonSaveBanner(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasAssets, workerCardData, creatorPath]);

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

  // Mobile UX: in game mode, auto-open the Game Board panel when entering Test step
  // (game play is board-first; chat is the slide-down companion).
  useEffect(() => {
    if (!isMobile) return;
    const isGameLike = !!(workerCardData?.gameConfig?.isGame || (creatorPath && creatorPath.startsWith('game')));
    if (isGameLike && flowStep >= 4) {
      setShowMobilePanel(true);
    }
  }, [isMobile, flowStep, workerCardData, creatorPath]);

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

  // ── CODEX 47.10 — File upload helpers ────────────────────────
  function handleFilesSelected(fileList) {
    const { valid, rejected } = validateFiles(fileList);
    if (rejected.length) {
      const names = rejected.map(r => `${r.name} (${r.reason})`).join(", ");
      addAssistantMessage(`Some files were skipped: ${names}`);
    }
    const newFiles = valid.map(f => ({
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file: f, name: f.name, size: f.size, type: classifyFile(f),
      status: "pending", progress: 0, error: null,
    }));
    setPendingFiles(prev => [...prev, ...newFiles]);
  }
  function handleFileRemove(id) { setPendingFiles(prev => prev.filter(f => f.id !== id)); }
  function handleFilesClear() { setPendingFiles([]); }

  // ── Chat send ────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;
    if (sending) return;
    setInput("");
    setShowPasteArea(false); // Hide paste link once user starts typing
    // Fade out welcome greeting on first user message
    if (greetingVisible) {
      setGreetingVisible(false);
      setTimeout(() => setWelcomeGreeting(null), 400);
    }
    // Show file names in the user message bubble
    const fileNote = pendingFiles.length > 0
      ? `\n[Attached: ${pendingFiles.map(f => f.name).join(", ")}]`
      : "";
    addUserMessage(text ? text + fileNote : fileNote.trim());

    // CODEX 47.3 Fix 17 — When in artwork phase and Alex has already asked
    // "ready to move on?", a yes-style reply locally advances to the
    // Interactions CTA without round-tripping through the backend.
    if (
      gameSessionPhase === "artwork" &&
      artworkReadyPromptedRef.current &&
      !gameInteractionsCtaEmitted.current &&
      isAffirmative(text)
    ) {
      setSending(false);
      setTimeout(() => emitInteractionsCta(), 300);
      return;
    }

    // CODEX 47.3 Fix 18 — When in interactions phase and the spec is locked,
    // a "build it"/"let's test"/"i'm ready" reply emits the Test Your Game CTA.
    const gi = workerCardData?.gameInteractions;
    const interactionsLocked = !!(
      gi &&
      gi.movement &&
      gi.speed &&
      gi.collisionRules &&
      gi.soundCues
    );
    if (
      (gameSessionPhase === "interactions" || gameSessionPhase === "ready") &&
      interactionsLocked &&
      isTestTrigger(text)
    ) {
      setSending(false);
      setTimeout(() => {
        setMessages(prev => {
          if (prev.some(m => m.role === "cta" && m.action === "startGameTest")) return prev;
          return [
            ...prev,
            { role: "assistant", text: "On it. Tap below to launch the playable build." },
            { role: "cta", text: "Build & Test Your Game", action: "startGameTest" },
          ];
        });
      }, 300);
      return;
    }

    // CODEX 48.4 Fix B — Also honor test trigger whenever a game card exists,
    // even if the user hasn't formally completed the interaction Q/A. This is
    // the "I'm ready, skip the rest" escape hatch.
    if (isGameMode && workerCardData && isTestTrigger(text)) {
      setSending(false);
      setTimeout(() => {
        setMessages(prev => {
          if (prev.some(m => m.role === "cta" && m.action === "startGameTest")) return prev;
          return [
            ...prev,
            { role: "assistant", text: "On it. Tap below to build and launch your game." },
            { role: "cta", text: "Build & Test Your Game", action: "startGameTest" },
          ];
        });
      }, 300);
      return;
    }

    // CODEX 48.4 Fix B — Natural-language phase transitions. If the creator
    // says "let's move on to interactions" / "proceed to artwork" / etc., fire
    // the corresponding phase handler instead of round-tripping through Alex.
    // This unblocks the state machine when users skip the CTA buttons.
    if (isGameMode && workerCardData) {
      const intent = detectPhaseIntent(text);
      if (intent && intent !== gameSessionPhase) {
        setSending(false);
        setTimeout(() => {
          if (intent === "rules") handleStartGameRules();
          else if (intent === "artwork") handleStartGameArtwork();
          else if (intent === "interactions") handleStartGameInteractions();
          // CODEX 48.4 Fix O — Later-stage transitions advance flowStep directly.
          else if (intent === "preflight") {
            advanceToStep(5);
            setGameSessionPhase("preflight");
            addAssistantMessage("Moving to Preflight — step 6 of 8. This is the automated deploy checklist.");
          } else if (intent === "distribute") {
            advanceToStep(6);
            setGameSessionPhase("distribute");
            addAssistantMessage("Moving to Distribute — step 7 of 8. Here's your launch kit: URL, QR code, embed, social copy.");
          } else if (intent === "grow") {
            advanceToStep(7);
            setGameSessionPhase("grow");
            addAssistantMessage("Moving to Grow & Revise — step 8 of 8. I'll help you track plays, collect feedback, and push updates.");
          }
        }, 300);
        return;
      }
    }

    // Path question short-answer detection — when path chips are shown,
    // catch typed answers like "game", "a game", "worker", "digital worker".
    const lowerTrim = text.trim().toLowerCase();
    const PATH_KEYWORDS = ["game", "games", "a game", "the game", "worker", "workers", "digital worker", "a worker"];
    const isPathAnswer = !creatorPath && PATH_KEYWORDS.includes(lowerTrim);
    if (isPathAnswer) {
      const wantsGame = lowerTrim.includes("game");
      setCreatorPath(wantsGame ? "game-casual" : "worker");
      setShowPathChips(false);
      setShowGameTypeChips(false);
      // Skip the rest of handleSend — fire the appropriate follow-up locally and bail.
      if (wantsGame) {
        setTimeout(() => {
          addAssistantMessage("Is this a casual game (a pub quiz, a treasure hunt, a company trivia game) or a training and certification game (exam prep, compliance simulation)?");
          setShowGameTypeChips(true);
        }, 500);
      } else {
        setTimeout(() => addAssistantMessage("So \u2014 what do you want to build?"), 500);
      }
      return;
    }

    // First user message advances flowStep 0 → 1
    if (flowStep === 0) {
      advanceToStep(1);
      setResumeWorker(null);
      setProgressiveFields(prev => ({ ...prev, description: text.length > 30 ? text.substring(0, 120) + "..." : text }));
    }

    // Capture name from first response if we don't have it.
    // Skip path keywords and very short tokens — they're answers, not names.
    const NAME_BLOCKLIST = ["game", "games", "worker", "workers", "yes", "no", "ok", "okay", "sure", "huh", "what"];
    const looksLikeName = text.length >= 2
      && text.length < 40
      && !text.includes("?")
      && !NAME_BLOCKLIST.includes(lowerTrim);
    if (!creatorName && messages.length <= 4 && looksLikeName) {
      captureName(text);
    }

    // Track exchange count for steps 0-2
    const newExchangeCount = exchangeCount + 1;
    if (flowStep <= 2) setExchangeCount(newExchangeCount);

    // CODEX 47.2 Fix 4 — compute the next card data INLINE (not from React state) so the
    // fetch body below sees the freshly captured rule. setWorkerCardData is async — the
    // closure value would otherwise be one rule behind.
    let nextCardData = workerCardData;

    // CODEX 48.4 Fix AA — Rules phase with keyword-based slot capture.
    // Rather than rigidly advancing a counter on every user reply (which
    // broke when Alex asked bonus questions mid-rubric), we look at the
    // user's text and figure out which unfilled slot matches. Fall back to
    // canonical order if no keywords match.
    if (gameSessionPhase === "rules") {
      const RULE_QUESTIONS = {
        turnMechanic: "Turn mechanic — how do players take turns? (one at a time, simultaneous, real-time, no turns?)",
        winLoseConditions: "Win/lose conditions — how does a player win or lose? What ends the game?",
        scoring: "Scoring — how do points work? Are there levels, badges, or just a single score?",
        safetyCompliance: "Safety and compliance — anything players should NOT see or do? Age range, content limits, regulated topics?",
      };
      const gr = workerCardData?.gameRules || {};
      const filled = new Set(Object.keys(RULE_QUESTIONS).filter(k => gr[k]));

      // If the user is replying to a pending default offer, capture the default.
      let capturedKey = null;
      let capturedValue = null;
      if (pendingDefaultRef.current && pendingDefaultRef.current.phase === "rules") {
        const key = pendingDefaultRef.current.key;
        if (isAffirmative(text)) {
          capturedKey = key;
          capturedValue = pendingDefaultRef.current.value;
          pendingDefaultRef.current = null;
        } else if (!isMetaQuestion(text)) {
          capturedKey = findUnfilledSlot(text, RULE_KEYWORDS, filled) || key;
          capturedValue = text;
          pendingDefaultRef.current = null;
        }
      } else if (!isMetaQuestion(text)) {
        capturedKey = findUnfilledSlot(text, RULE_KEYWORDS, filled);
        capturedValue = text;
      }

      if (capturedKey && capturedValue) {
        const newRules = { ...gr, [capturedKey]: capturedValue };
        const newFilled = new Set(Object.keys(RULE_QUESTIONS).filter(k => newRules[k]));
        setGameRulesAnswered(newFilled.size);
        nextCardData = { ...(workerCardData || {}), gameRules: newRules };
        setWorkerCardData(nextCardData);

        if (newFilled.size < 4) {
          // Ask next unfilled in canonical order
          const nextKey = Object.keys(RULE_QUESTIONS).find(k => !newFilled.has(k));
          if (nextKey) setTimeout(() => addAssistantMessage("Got it. Next: " + RULE_QUESTIONS[nextKey]), 900);
        } else {
          // CODEX 48.5 hotfix — Non-forcing CTA. Alex announces completion
          // and offers the CTA as an option, doesn't force the transition.
          setTimeout(() => {
            addAssistantMessage(
              "That's all four rules captured. You can tap **Create the Artwork** below when you're ready to move on, or keep refining any rule first — just tell me what to change."
            );
            setTimeout(() => {
              setMessages(prev => {
                if (prev.some(m => m.role === "cta" && m.action === "startGameArtwork")) return prev;
                artworkButtonShownRef.current = true;
                return [...prev, { role: "cta", text: "Create the Artwork", action: "startGameArtwork" }];
              });
            }, 600);
          }, 900);
        }
        // CODEX 48.5 hotfix — Rubric capture is frontend-driven. Skip the
        // backend round-trip so Alex doesn't ask duplicate / contradicting
        // questions in parallel with the local rubric progression.
        setSending(false);
        return;
      } else if (filled.size < 4) {
        // Meta-question: offer a default for the first unfilled slot.
        const nextKey = Object.keys(RULE_QUESTIONS).find(k => !filled.has(k));
        if (nextKey) {
          const def = GAME_RULE_DEFAULTS[nextKey];
          pendingDefaultRef.current = { phase: "rules", key: nextKey, value: def };
          setTimeout(() => {
            addAssistantMessage(
              `Good question. For a game like yours I'd recommend: ${def}. ` +
              `Want to use that, or do you have something different in mind? ` +
              `(Say "yes" to use my recommendation, or type your own answer.)`
            );
          }, 900);
          setSending(false);
          return;
        }
      }
    }

    // CODEX 48.4 Fix AA — Interactions phase with keyword-based slot capture
    if (gameSessionPhase === "interactions") {
      const INTERACTION_QUESTIONS = {
        movement: "Movement — tap to move, swipe to steer, tilt, arrow keys, or auto-move?",
        speed: "Speed — fast and frantic, or slow and deliberate?",
        collisionRules: "Collision rules — what happens when you touch a teammate vs a hazard?",
        soundCues: "Sound cues — any sounds for points, damage, win, or lose? (Optional — say 'skip' if not yet.)",
      };
      const gi = (nextCardData || workerCardData)?.gameInteractions || {};
      const filled = new Set(Object.keys(INTERACTION_QUESTIONS).filter(k => gi[k]));

      let capturedKey = null;
      let capturedValue = null;
      if (pendingDefaultRef.current && pendingDefaultRef.current.phase === "interactions") {
        const key = pendingDefaultRef.current.key;
        if (isAffirmative(text)) {
          capturedKey = key;
          capturedValue = pendingDefaultRef.current.value;
          pendingDefaultRef.current = null;
        } else if (!isMetaQuestion(text)) {
          capturedKey = findUnfilledSlot(text, INTERACTION_KEYWORDS, filled) || key;
          capturedValue = text;
          pendingDefaultRef.current = null;
        }
      } else if (!isMetaQuestion(text)) {
        capturedKey = findUnfilledSlot(text, INTERACTION_KEYWORDS, filled);
        capturedValue = text;
      }

      if (capturedKey && capturedValue) {
        const newInteractions = { ...gi, [capturedKey]: capturedValue };
        const newFilled = new Set(Object.keys(INTERACTION_QUESTIONS).filter(k => newInteractions[k]));
        setGameInteractionsAnswered(newFilled.size);
        nextCardData = {
          ...(nextCardData || workerCardData || {}),
          gameInteractions: newInteractions,
        };
        setWorkerCardData(nextCardData);
        if (newFilled.size < 4) {
          const nextKey = Object.keys(INTERACTION_QUESTIONS).find(k => !newFilled.has(k));
          if (nextKey) setTimeout(() => addAssistantMessage("Got it. Next: " + INTERACTION_QUESTIONS[nextKey]), 900);
        } else {
          setTimeout(() => {
            const gameTitle = (nextCardData?.name) || workerCardData?.name || "your game";
            addAssistantMessage(
              `All four interactions captured for ${gameTitle}. Tap **Build & Test Your Game** below when you're ready, or tell me what to tweak first.`
            );
            setGameSessionPhase("ready");
            setTimeout(() => {
              setMessages(prev => {
                if (prev.some(m => m.role === "cta" && m.action === "startGameTest")) return prev;
                return [...prev, { role: "cta", text: "Build & Test Your Game", action: "startGameTest" }];
              });
            }, 600);
          }, 900);
        }
        // CODEX 48.5 hotfix — Rubric capture skips backend round-trip (see rules phase).
        setSending(false);
        return;
      } else if (filled.size < 4) {
        const nextKey = Object.keys(INTERACTION_QUESTIONS).find(k => !filled.has(k));
        if (nextKey) {
          const def = GAME_INTERACTION_DEFAULTS[nextKey];
          pendingDefaultRef.current = { phase: "interactions", key: nextKey, value: def };
          setTimeout(() => {
            addAssistantMessage(
              `Good question. For a game like yours I'd recommend: ${def}. ` +
              `Want to use that, or do you have something different in mind? ` +
              `(Say "yes" to use my recommendation, or type your own answer.)`
            );
          }, 900);
          setSending(false);
          return;
        }
      }
    }

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

    // Auto-detect game intent from conversation if creatorPath is not yet set.
    // Triggers when the user clearly references building a game without clicking the chip.
    let effectiveCreatorPath = creatorPath;
    if (!creatorPath && newExchangeCount <= 3) {
      const lower = text.toLowerCase();
      const gamePattern = /\b(build|make|create|design|develop|prototyp\w*)\w*\s+(a|an|my|the|some)?\s*(video.?)?game\b|\bgame\s+(idea|concept|design|prototype|for\s+\w+)\b|\bmultiplayer\b|\bgameplay\b|\bvideo.?game\b/i;
      if (gamePattern.test(lower)) {
        setCreatorPath('game-casual');
        effectiveCreatorPath = 'game-casual';
      }
    }

    // extractSpec fallback — force card generation after 5+ exchanges with no card
    // Skip for game paths — games don't use WORKER_SPEC, they use a different build flow
    const isGamePath = effectiveCreatorPath && effectiveCreatorPath.startsWith('game');
    const shouldExtractSpec = flowStep <= 2 && newExchangeCount >= 5 && !workerCardData && !isGamePath;

    setSending(true);

    // CODEX 47.10 — Encode attached files for inline chat upload
    let chatFiles = null;
    const filesToUpload = [...pendingFiles];
    if (filesToUpload.length > 0) {
      setPendingFiles([]); // Clear immediately so UI resets
      try {
        chatFiles = await encodeFilesForChat(filesToUpload.map(pf => pf.file));
      } catch (err) {
        console.error("[sandbox] File encoding failed:", err);
        addAssistantMessage("Could not process attached files. Try again.");
      }
    }

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const headers = { "Content-Type": "application/json" };
      if (token && token !== "undefined" && token !== "null") headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId, surface: "sandbox", userInput: text, flowStep: Math.max(flowStep, 1), vertical, creatorPath: effectiveCreatorPath,
          ...(creatorName ? { creatorName } : {}),
          ...(shouldExtractSpec ? { extractSpec: true } : {}),
          ...(chatFiles && chatFiles.length > 0 ? { files: chatFiles } : {}),
          // CODEX 47.2 Fix 4 — pass game phase + FRESH card data so backend never loses rules context.
          // nextCardData captures the just-typed rule answer; workerCardData state is one render behind.
          ...(gameSessionPhase ? { gameSessionPhase } : {}),
          ...(nextCardData ? { workerCardData: {
            name: nextCardData.name,
            description: nextCardData.description,
            gameConfig: nextCardData.gameConfig,
            gameRules: nextCardData.gameRules,
            gameInteractions: nextCardData.gameInteractions,
          } } : {}),
        }),
      });
      const result = await resp.json();
      const reply = result.message || result.reply;
      if (result.ok && reply) {
        addAssistantMessage(reply);

        // Sync creatorPath from backend (e.g. backend detected game intent we missed)
        if (result.creatorPath && !creatorPath) {
          setCreatorPath(result.creatorPath);
        }

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

            // CODEX 47.3 Fix 2 — gate the recap + CTA emission to fire once.
            // Backend re-sends [WORKER_SPEC] on every follow-up turn; without
            // this guard the user sees "Saved to your Vault" repeatedly.
            const alreadyIntroduced =
              sessionIntroSentRef.current ||
              messages.some(m =>
                m.role === "assistant" &&
                typeof m.text === "string" &&
                m.text.startsWith("Saved to your Vault")
              );

            if (!alreadyIntroduced) {
              sessionIntroSentRef.current = true;

              // Card renders in right panel — show a brief note in chat
              // CODEX 47.5 Fix 5 — never render a bare initial. If the
              // first name is shorter than 2 characters (or null) fall back
              // to "there" so the message is still grammatical and friendly.
              const rawFirstName = creatorName ? creatorName.split(" ")[0] : "";
              const safeFirstName = (rawFirstName && rawFirstName.length >= 2) ? rawFirstName : "there";
              // CODEX 47.3 Fix 20 — game language. Never call a game build a "worker card".
              const cardNoun = isGame ? "game card" : "worker card";
              addAssistantMessage(`Saved to your Vault, ${safeFirstName}. Your ${cardNoun} is on the right.`);

              if (flowStep < 2) advanceToStep(2);

              // CODEX 47.1 Fix 1 — single compact confirmation. The LifecycleCard
              // already shows the stages on the right; no need to duplicate in chat.
              setTimeout(() => {
                const gameOrWorkerName = card.name || (isGame ? "your game" : "your worker");
                const compactText = isGame
                  ? `Got it — ${gameOrWorkerName} is saved. Next up: let's define how the game plays. Tap Define the Rules when you're ready.`
                  : `Got it — ${gameOrWorkerName} is saved. Next up: let's define how it should and shouldn't behave. Tap Start Session 2 when you're ready.`;
                setMessages(prev => [...prev, { role: "assistant", text: compactText }]);
                // CODEX 47.2 Fix 2 — render CTA button once per session. Gate by checking
                // the actual messages array (refs reset on reload but messages persist).
                setTimeout(() => {
                  if (isGame) {
                    setMessages(prev => {
                      if (prev.some(m => m.role === "cta" && m.action === "startGameRules")) return prev;
                      rulesButtonShownRef.current = true;
                      return [...prev, { role: "cta", text: "Define the Rules", action: "startGameRules" }];
                    });
                  } else {
                    setMessages(prev => {
                      if (prev.some(m => m.role === "cta" && m.action === "startSession2")) return prev;
                      return [...prev, { role: "cta", text: "Start Session 2", action: "startSession2" }];
                    });
                  }
                }, 600);
              }, 1000);
            } else {
              // Card already introduced — silently update the right panel only.
              if (flowStep < 2) advanceToStep(2);
            }
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
              // CODEX 47.3 Fix 2 — gate intro recap to once per session.
              if (!sessionIntroSentRef.current) {
                sessionIntroSentRef.current = true;
                // CODEX 47.5 Fix 5 — never render a bare initial.
                const rawFirstName = creatorName ? creatorName.split(" ")[0] : "";
                const safeFirstName = (rawFirstName && rawFirstName.length >= 2) ? rawFirstName : "there";
                // CODEX 47.3 Fix 20 — game language.
                const cardNoun = isGame2 ? "game card" : "worker card";
                addAssistantMessage(`Saved to your Vault, ${safeFirstName}. Your ${cardNoun} is on the right.`);
              }
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

  // CODEX 48.4 Fix FF — Download all generated artwork as sequential files.
  // Each asset's imageUrl is a public Cloud Storage URL; we create <a> tags
  // with download attr and click them programmatically, one per asset.
  async function handleDownloadAllArtwork() {
    if (!canvasAssets || canvasAssets.length === 0) return;
    const gameSlug = (workerCardData?.name || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    for (let i = 0; i < canvasAssets.length; i++) {
      const a = canvasAssets[i];
      if (!a.imageUrl) continue;
      try {
        // Fetch → blob → object URL so the download attr is honored across origins
        const res = await fetch(a.imageUrl, { mode: "cors" });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const ext = (blob.type.split("/")[1] || "png").replace(/[^a-z0-9]/g, "");
        const label = (a.useAs || a.label || `asset-${i + 1}`).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        const link = document.createElement("a");
        link.href = url;
        link.download = `${gameSlug}-${label}-${i + 1}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        // Small gap so browsers don't throttle the rapid downloads
        await new Promise(r => setTimeout(r, 250));
      } catch (err) {
        console.warn("[downloadArtwork] failed for asset", i, err);
      }
    }
  }

  // ── Game session phase handlers ──────────────────────────────

  function handleStartGameRules() {
    setGameSessionPhase("rules");
    setGameRulesAnswered(0);
    addAssistantMessage(
      "Let's define the rules of your game. I need to understand four things to make this work:\n\n" +
      "1. Turn mechanic — How do players take turns? (one at a time, simultaneous, real-time, no turns?)\n\n" +
      "Answer this first, then we'll move through the rest."
    );
  }

  function handleStartGameArtwork() {
    setGameSessionPhase("artwork");
    // CODEX 47.1 Fix 3 — Alex leads with the asset list. Names the game and the four asset types.
    const gameTitle = workerCardData?.name || "Your game";
    addAssistantMessage(
      `${gameTitle} needs four types of assets to come to life:\n\n` +
      "1. Backgrounds / Settings — the world the game lives in\n" +
      "2. Characters — playable and non-playable\n" +
      "3. Icons / Items — power-ups, pickups, prizes\n" +
      "4. Score display — how points appear on screen\n\n" +
      "Want to start with backgrounds or characters? Just tell me what you have in mind and I'll generate it."
    );
  }

  // CODEX 47.2 Fix 13 — Interactions session: defines movement, speed, collision rules.
  function handleStartGameInteractions() {
    setGameSessionPhase("interactions");
    setGameInteractionsAnswered(0);
    addAssistantMessage(
      "How does the player move their character? Tap to move, swipe to steer, tilt, arrow keys, or auto-move?"
    );
  }

  // CODEX 47.2 Fix 12 — Dedicated launcher for game test mode. Only this CTA
  // (or the Test tab) advances the creator into the playable build.
  // CODEX 48.4 Fix 1 — Real game build pipeline. Packages rules, interactions,
  // and included assets into a persistent worker doc via worker1:intake +
  // worker1:rules:save, then advances to Test. No more fake delay.
  async function handleStartGameTest() {
    await runGameBuildPipeline(workerCardData);
  }

  // CODEX 48.5 — ensureAnonymousAuthForBuild now lives in ../lib/sandboxHelpers
  const ensureAnonymousAuthForBuild = sharedEnsureAnonymousAuthForBuild;

  async function runGameBuildPipeline(cardData) {
    if (!cardData) {
      addAssistantMessage("Can't build yet — your game card isn't ready. Complete the concept first.");
      return;
    }
    advanceToStep(3);
    // Clear stale build errors
    setMessages(prev => prev.filter(m =>
      !m.text?.startsWith("Build intake failed") &&
      !m.text?.startsWith("The build pipeline hit") &&
      !m.text?.startsWith("Game build failed")
    ));
    addAssistantMessage("Building your game now. Packaging rules, interactions, and artwork...");

    // CODEX 48.4 Fix L — auth bootstrap so guests don't 401 on intake
    const authRes = await ensureAnonymousAuthForBuild();
    if (!authRes.ok) {
      addAssistantMessage(`Game build failed: couldn't set up your workspace. ${authRes.error}. Try again.`);
      return;
    }

    try {
      const workerId = worker?.id || ("gme_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
      if (!worker?.id) {
        setWorker(prev => ({ ...(prev || {}), id: workerId, name: cardData.name }));
      }

      // Serialize rules + interactions into tier slots so they survive as a spec
      const gr = cardData.gameRules || {};
      const gi = cardData.gameInteractions || {};
      const rulesTier = [
        gr.turnMechanic && `Turn mechanic: ${gr.turnMechanic}`,
        gr.winLoseConditions && `Win/lose: ${gr.winLoseConditions}`,
        gr.scoring && `Scoring: ${gr.scoring}`,
        gr.safetyCompliance && `Safety: ${gr.safetyCompliance}`,
      ].filter(Boolean);
      const interactionsTier = [
        gi.movement && `Movement: ${gi.movement}`,
        gi.speed && `Speed: ${gi.speed}`,
        gi.collisionRules && `Collisions: ${gi.collisionRules}`,
        gi.soundCues && `Sound cues: ${gi.soundCues}`,
      ].filter(Boolean);

      // Step 1: Intake — persists gameConfig/gameRules/gameInteractions on the
      // worker doc. Backend marks raasMode: "light" automatically for games.
      const intakeRes = await w1Api("worker1:intake", {
        workerId,
        name: cardData.name,
        vertical: "game",
        jurisdiction: "GLOBAL",
        description: cardData.description || "",
        sops: [...rulesTier, ...interactionsTier],
        worker_type: "game",
        gameConfig: { ...(cardData.gameConfig || {}), isGame: true, raasMode: "light" },
        gameRules: gr,
        gameInteractions: gi,
      });
      if (!intakeRes.ok) {
        console.error("[GameBuild] intake failed:", intakeRes);
        addAssistantMessage(`Game build failed at intake: ${intakeRes.error || "unknown error"}. Try again.`);
        return;
      }
      const confirmedWorkerId = intakeRes.workerId || workerId;
      setWorker(prev => ({ ...(prev || {}), id: confirmedWorkerId, name: cardData.name, buildPhase: "intake", worker_type: "game" }));

      // Step 2: Save rules directly to tier2/tier3. Games skip research —
      // there's no regulatory brief to generate. rules:save will transition
      // buildPhase to "test" automatically for worker_type === "game".
      const saveRes = await w1Api("worker1:rules:save", {
        workerId: confirmedWorkerId,
        tier2: rulesTier,
        tier3: interactionsTier,
      });
      if (!saveRes.ok) {
        console.error("[GameBuild] rules:save failed:", saveRes);
        addAssistantMessage(`Game build failed at rules save: ${saveRes.error || "unknown error"}. Try again.`);
        return;
      }

      setWorker(prev => ({ ...(prev || {}), id: confirmedWorkerId, buildPhase: saveRes.buildPhase || "test" }));
      advanceToStep(4);
      addAssistantMessage("Your game is ready to test. Try it out on the right.");
    } catch (err) {
      console.error("[GameBuild] Pipeline error:", err);
      addAssistantMessage(`Game build failed: ${err.message || "unknown"}. Try again.`);
    }
  }

  // ── Step 2 → Step 3: Worker Card approved ────────────────────

  async function handleWorkerCardApprove(cardData) {
    // Auth gate deferred to Launch step — Build and Test are always free
    const finalCard = cardData || workerCardData;
    // CODEX 47.2 Fix 12 — Continue Building on a game card returns to chat,
    // it does NOT launch test mode. Test only opens via the "Test Your Game"
    // CTA at the end of the Interactions session, or the Test tab in nav.
    if (finalCard?.gameConfig?.isGame) {
      setWorkerCardData(finalCard);
      // Scroll chat to the latest message and focus the input so the creator
      // can keep building (define rules, add artwork, etc.).
      requestAnimationFrame(() => {
        try { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); } catch {}
        try { chatInputRef.current?.focus(); } catch {}
      });
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
        setShowAnonSaveBanner(false);
        // CODEX 48.4 Fix GG — Post-signup: do NOT jump the user forward.
        // Resume at the exact phase they were in and tell Alex explicitly.
        const resumePhase = gameSessionPhase || (workerCardData ? "concept" : null);
        const phaseLabel = {
          concept: "Concept", rules: "Rules", artwork: "Artwork",
          interactions: "Interactions", ready: "Test", test: "Test",
          preflight: "Preflight", distribute: "Distribute", grow: "Grow & Revise",
        }[resumePhase] || "where you left off";
        addAssistantMessage(
          `Welcome, ${authName.split(" ")[0]}. Your account is saved — nothing lost. ` +
          (isGameMode
            ? `We were in ${phaseLabel}. Let's pick up right where we left off.`
            : `Let me keep building your worker. We were in ${phaseLabel}.`)
        );

        // Only auto-run the build pipeline if the user was mid-build for a WORKER,
        // not for games. Games build on explicit "Build & Test" CTA only.
        if (pendingCardData && !isGameMode) {
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

  // CODEX 47.3 Fix 14 — File upload removed entirely. Three rounds of testing
  // proved the picker was non-functional. A broken button is worse than no
  // button. Creators paste text directly. Revisit when file parsing ships.

  // Game mode flag — single source of truth for all game-vs-worker UI branching
  const isGameMode = !!(workerCardData?.gameConfig?.isGame || (creatorPath && creatorPath.startsWith('game')));
  const workspaceLabel = isGameMode ? "Game Board" : "Your Workspace";

  // CODEX 47.3-P Fix P1 — Game step status. Maps current state into the
  // 8-step status bar (Concept → Rules → Artwork → Interactions → Test →
  // Preflight → Distribute → Grow & Revise). Each step is cold/warm/hot.
  // 47.9 HOTFIX: wrapped in useMemo to prevent infinite re-render loop on mobile.
  const gameStepStates = useMemo(() => {
    const conceptHot = !!workerCardData;
    const gr = workerCardData?.gameRules || {};
    const rulesHot = !!(gr.turnMechanic && gr.winLoseConditions && gr.scoring && gr.safetyCompliance);
    const includedSet = new Set(includedAssetIds);
    const includedNow = canvasAssets.filter(a => includedSet.has(a.assetId || a.id));
    const artworkHot = (includedNow.some(a => a.useAs === "character") &&
                        includedNow.some(a => a.useAs === "background")) ||
                       canvasAssets.length >= 2; // lenient fallback
    const gi = workerCardData?.gameInteractions || {};
    const interactionsHot = !!(gi.movement && gi.speed && gi.collisionRules && gi.soundCues);
    const interactionsAnyField = !!(gi.movement || gi.speed || gi.collisionRules || gi.soundCues);

    // CODEX 48.4 Fix N — Ratchet state forward based on phase progression.
    // Once the creator has moved past a phase, it stays marked "complete" in
    // the UI even if the raw data check doesn't perfectly validate. The top
    // pill bar and the canvas rows both read this, so they can no longer
    // disagree — single source of truth.
    const PHASE_ORDER = ["concept", "rules", "artwork", "interactions", "ready", "test", "preflight", "distribute", "grow"];
    const currentPhaseIdx = PHASE_ORDER.indexOf(gameSessionPhase);
    // Steps we've demonstrably moved past are always hot.
    const pastConcept      = conceptHot;
    const pastRules        = rulesHot        || currentPhaseIdx > PHASE_ORDER.indexOf("rules")        || flowStep >= 3;
    const pastArtwork      = artworkHot      || currentPhaseIdx > PHASE_ORDER.indexOf("artwork")      || flowStep >= 3;
    const pastInteractions = interactionsHot || currentPhaseIdx > PHASE_ORDER.indexOf("interactions") || flowStep >= 4;
    const pastTest         = flowStep > 4;
    const pastPreflight    = flowStep > 5;
    const pastDistribute   = flowStep > 6;

    // CODEX 48.4 — Once concept is complete, all downstream cold states go
    // to "idle" (silver, clickable, empty) instead of "cold" (red, locked).
    // Non-linear navigation: creators can peek at any section.
    function stateOf(hot, warm) {
      if (hot) return "hot";
      if (warm) return "warm";
      return conceptHot ? "idle" : "cold";
    }

    // Determine which step is the current "warm" cursor.
    let activeId = "concept";
    if (flowStep === 7) activeId = "grow";
    else if (flowStep === 6) activeId = "distribute";
    else if (flowStep === 5) activeId = "preflight";
    else if (flowStep === 4 || gameSessionPhase === "ready") activeId = "test";
    else if (gameSessionPhase === "interactions") activeId = "interactions";
    else if (gameSessionPhase === "artwork") activeId = "artwork";
    else if (gameSessionPhase === "rules") activeId = "rules";
    else activeId = "concept";

    const steps = [
      { id: "concept",      label: "Concept",        state: stateOf(pastConcept, !pastConcept) },
      { id: "rules",        label: "Rules",          state: stateOf(pastRules, gameSessionPhase === "rules" || (pastConcept && !pastRules)) },
      { id: "artwork",      label: "Artwork",        state: stateOf(pastArtwork, gameSessionPhase === "artwork" || (pastRules && !pastArtwork)) },
      { id: "interactions", label: "Interactions",   state: stateOf(pastInteractions, gameSessionPhase === "interactions" || interactionsAnyField || (pastArtwork && !pastInteractions)) },
      { id: "test",         label: "Test",           state: stateOf(pastTest, flowStep === 4 || gameSessionPhase === "ready" || gameSessionPhase === "test") },
      { id: "preflight",    label: "Preflight",      state: stateOf(pastPreflight, flowStep === 5 || gameSessionPhase === "preflight") },
      { id: "distribute",   label: "Distribute",     state: stateOf(pastDistribute, flowStep === 6 || gameSessionPhase === "distribute") },
      { id: "grow",         label: "Grow & Revise",  state: stateOf(false, flowStep === 7 || gameSessionPhase === "grow") },
    ];
    return { steps, activeId };
  }, [workerCardData, canvasAssets, includedAssetIds, gameSessionPhase, flowStep]);

  // CODEX 48.4 Fix EE — One section open at a time. Tracks the manually
  // expanded section; defaults to gameStepStates.activeId. When the active
  // phase changes, we auto-follow it so a completed section collapses and
  // the next one opens. Manual clicks override until the next phase change.
  const [openSection, setOpenSection] = useState("concept");
  // CODEX 48.5 — Section browsing mode. When the user clicks a non-active
  // pill (e.g. "Distribute" while in Test), we show the collapsible sections
  // view so they can peek at any section. Clicking the active step's pill
  // returns to the live canvas. Enables VC demos + non-linear exploration.
  const [browsingSections, setBrowsingSections] = useState(false);
  const lastActiveRef = useRef(null);
  useEffect(() => {
    const active = gameStepStates.activeId;
    if (active && active !== lastActiveRef.current) {
      lastActiveRef.current = active;
      setOpenSection(active);
      setBrowsingSections(false); // return to live canvas when phase changes
    }
  }, [gameStepStates.activeId]);

  // 47.9 HOTFIX: memoized callback to prevent new function ref every render.
  const handleGameStepClick = useCallback((stepId) => {
    // CODEX 48.5 — Non-linear section browsing. Clicking any pill opens
    // that section's content. If the clicked pill IS the active step AND
    // we're in browsing mode, return to the live canvas.
    const stepMap = { test: 4, preflight: 5, distribute: 6, grow: 7 };
    const isActiveStep = stepId === gameStepStates.activeId;

    if (isActiveStep && browsingSections) {
      // Return to the live canvas
      setBrowsingSections(false);
      if (stepMap[stepId] && stepMap[stepId] <= maxFlowStep) viewStep(stepMap[stepId]);
      return;
    }

    if (!isActiveStep || flowStep <= 2) {
      // Browse: show the collapsible sections view with this section expanded
      setBrowsingSections(true);
      setOpenSection(stepId);
      return;
    }

    // Active step clicked and NOT browsing — navigate to it (existing behavior)
    if (stepMap[stepId] && stepMap[stepId] <= maxFlowStep) {
      viewStep(stepMap[stepId]);
    }
  }, [maxFlowStep, gameStepStates.activeId, browsingSections, flowStep]);

  // Chat input placeholder based on step
  const chatPlaceholder = flowStep <= 2
    ? (exchangeCount === 0 ? (isGameMode ? "Describe your game..." : "Describe your expertise...") : (isGameMode ? "Tell Alex about your game..." : "Tell Alex about your expertise..."))
    : flowStep === 3 ? "Ask Alex anything about the build..."
    : flowStep === 4 ? (isGameMode ? "Test your game — describe any problems..." : "Test your worker — describe any problems...")
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
          <CreatorStudioNav flowStep={flowStep} workerCardData={workerCardData} worker={worker} isMobile={false} style={{ width: navWidthPx }} workspaces={sandboxWorkspaces} onSwitchWorkspace={handleSandboxSwitchWorkspace} onViewStep={viewStep} onShowMyImages={() => setShowMyImages(prev => !prev)} showMyImages={showMyImages} isGameMode={isGameMode} />
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
          <CreatorStudioNav flowStep={flowStep} workerCardData={workerCardData} worker={worker} isMobile={true} onClose={() => setShowMobileNav(false)} workspaces={sandboxWorkspaces} onSwitchWorkspace={handleSandboxSwitchWorkspace} onViewStep={viewStep} onShowMyImages={() => { setShowMyImages(prev => !prev); setShowMobileNav(false); }} showMyImages={showMyImages} isGameMode={isGameMode} />
        </>
      )}

      {/* Column 2: Chat Panel — CODEX 47.10: drag-and-drop restored */}
      <div
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); if (e.dataTransfer?.files?.length) handleFilesSelected(e.dataTransfer.files); }}
        style={{
          ...S.chatPanel,
          ...(isMobile
            ? { width: "100%", minWidth: 0, maxWidth: "none", borderRight: "none", flex: 1, height: "100vh" }
            : { flex: `0 0 ${chatWidthPercent}%`, minWidth: 400 }
          ),
          position: "relative",
        }}
      >
        {/* Drop overlay */}
        {dragOver && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 20,
            background: "rgba(107,70,193,0.08)",
            border: "2px dashed var(--accent, #6B46C1)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--accent, #6B46C1)" }}>
              Drop files here
            </div>
          </div>
        )}
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
              const ctaClick = () => {
                switch (msg.action) {
                  case "startGameRules":
                    handleStartGameRules();
                    break;
                  case "startGameArtwork":
                    handleStartGameArtwork();
                    break;
                  case "startGameInteractions":
                    handleStartGameInteractions();
                    break;
                  case "startGameTest":
                    handleStartGameTest();
                    break;
                  case "startSession2":
                  default:
                    handleWorkerCardApprove(workerCardData);
                    break;
                }
              };
              return (
                <div key={i} style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                  <button
                    onClick={ctaClick}
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
                {msg.role === "assistant" ? renderMarkdown(msg.text) : msg.text}
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
                  // CODEX 47.5 Fix 4 — single canonical worker sandbox surface.
                  // /sandbox is the game sandbox. /sandbox/worker is the worker
                  // sandbox. The Digital Worker chip redirects rather than
                  // entering an in-page worker mode. The worker-mode code paths
                  // in this file (runBuildPipeline, w1Api worker1:* calls,
                  // worker chat extraction, TestWorkerPanel for workers, etc.)
                  // are dead code as of this redirect and should be removed in
                  // a follow-up cleanup pass per CODEX 47.5 Locked Decisions.
                  // TODO(47.5-cleanup): remove worker-mode code paths from
                  // DeveloperSandbox.jsx now that they are unreachable.
                  window.location.href = "/sandbox/worker";
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
                  // Apply green palette immediately — refine to regulated if user picks training
                  setCreatorPath("game-casual");
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

          {/* Soft auth nudge — fires after first character saved (CODEX 47.1 Fix 9) */}
          {showAnonSaveBanner && !firebaseAuth?.currentUser && (
            <div style={{
              alignSelf: "center", maxWidth: 440, width: "100%",
              background: "var(--accent-light, rgba(22,163,74,0.08))",
              border: "1px solid var(--accent, #16A34A)",
              borderRadius: 12, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1, fontSize: 13, color: "#1a1a2e", lineHeight: 1.5 }}>
                Your game is looking great — create a free account to make sure you never lose it.
              </div>
              <button
                onClick={() => { setShowAuthPrompt(true); setShowAnonSaveBanner(false); }}
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 700,
                  background: "var(--accent, #16A34A)", color: "#fff",
                  border: "none", borderRadius: 6, cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowAnonSaveBanner(false)}
                aria-label="Dismiss"
                style={{
                  padding: "4px 8px", fontSize: 16, color: "#64748b",
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Inline signup — rendered as a distinct card, not a chat bubble */}
          {showAuthPrompt && (
            <div style={{
              alignSelf: "center", background: "#FFFFFF", border: "2px solid var(--accent, #6B46C1)", borderRadius: 16,
              padding: "24px 20px", maxWidth: 360, width: "100%", boxShadow: "0 4px 24px color-mix(in srgb, var(--accent, #6B46C1) 12%, transparent)",
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>{isGameMode ? "Create your game board" : "Create your workspace"}</div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, marginBottom: 16 }}>
                {isGameMode ? "Your game needs a home. This creates your free creator account." : "Your worker needs a home. This creates your free creator account."}
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

          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", overflowX: "auto" }}>
            <button
              onClick={() => { setInput("Create artwork for my project"); requestAnimationFrame(() => handleSend()); }}
              style={{ fontSize: 13, color: "#475569", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 16, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
            >Generate artwork</button>
          </div>
          {/* CODEX 47.10 — File upload bar + paperclip */}
          <FileUploadBar
            files={pendingFiles}
            onRemove={handleFileRemove}
            onClear={handleFilesClear}
            disabled={sending}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              style={{
                background: "none", border: "1px solid #E2E8F0", borderRadius: 8,
                padding: "8px 10px", cursor: sending ? "default" : "pointer",
                color: "#64748B", fontSize: 16, flexShrink: 0, lineHeight: 1,
                minHeight: isMobile ? 52 : 44, display: "flex", alignItems: "center",
              }}
              title="Attach files (PDF, DOCX, images, video)"
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_STRING}
              style={{ display: "none" }}
              onChange={e => { handleFilesSelected(e.target.files); e.target.value = ""; }}
            />
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
              disabled={sending || (!input.trim() && pendingFiles.length === 0)}
              style={{
                padding: "10px 16px",
                background: (input.trim() || pendingFiles.length > 0) ? "var(--accent, #6B46C1)" : "#E2E8F0",
                color: (input.trim() || pendingFiles.length > 0) ? "white" : "#94A3B8",
                border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: (input.trim() || pendingFiles.length > 0) ? "pointer" : "default",
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

      {/* Mobile: floating preview tab — opens the right panel when closed */}
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
          {flowStep <= 2 ? "How This Works" : (isGameMode ? "Game Board" : "Preview your worker")}
        </button>
      )}

      {/* Mobile game play mode: floating Chat button — slides the board down to reveal chat */}
      {isMobile && showMobilePanel && showRightPanel && isGameMode && flowStep >= 4 && (
        <button
          onClick={() => setShowMobilePanel(false)}
          style={{
            position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom, 0px))", right: 16, zIndex: 250,
            padding: "12px 20px", background: "#1a1a2e", color: "white",
            border: "1px solid rgba(255,255,255,0.15)", borderRadius: 24, fontSize: 14, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
            minHeight: 48, display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span>Chat</span>
        </button>
      )}

      {/* Right: Workspace / Game Board — step-specific content (steps 3+) */}
      {showRightPanel && (
        <div style={{
          ...S.workPanel,
          ...(isMobile ? {
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
            // Game play mode (game + flowStep >= 4): Game Board takes full screen
            height: showMobilePanel ? (isGameMode && flowStep >= 4 ? "100vh" : "85vh") : 0,
            overflow: showMobilePanel ? "auto" : "hidden",
            transition: "height 0.3s ease, box-shadow 0.3s ease",
            willChange: "height",
            borderRadius: showMobilePanel && !(isGameMode && flowStep >= 4) ? "16px 16px 0 0" : 0,
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
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent, #6B46C1)" }}>{workspaceLabel}</div>
                {isGameMode ? (
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
                // CODEX 47.3 Fix 19 — Progressive tab activation. A tab is only
                // unlocked once the creator has actually reached it (maxFlowStep
                // already advanced to or past it). Tabs ahead of progress are
                // locked and show a tooltip naming the prior step.
                const isUnlocked = stepNum <= maxFlowStep;
                const prevStepLabel = FLOW_STEPS[stepNum - 1 - 1] || "the previous step";
                const lockedTooltip = `Complete ${prevStepLabel} first.`;
                return (
                  <div
                    key={step}
                    title={isUnlocked ? "" : lockedTooltip}
                    style={{
                      padding: "12px 16px", fontSize: 13, fontWeight: 600,
                      color: isActive ? "var(--accent, #6B46C1)" : isComplete ? "#10b981" : isUnlocked ? "#1a1a2e" : "#94A3B8",
                      borderBottom: `2px solid ${isActive ? "var(--accent, #6B46C1)" : "transparent"}`,
                      display: "flex", alignItems: "center", gap: 6,
                      cursor: isUnlocked && !isActive ? "pointer" : "default",
                      opacity: isUnlocked ? 1 : 0.4,
                    }}
                    onClick={() => { if (isUnlocked && !isActive) viewStep(stepNum); }}
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

          {/* CODEX 47.3-P Fix P1 — Game step status bar. Always visible at top
              of right panel for game builds. Shows the 8 game steps with state
              and lets the creator jump back to any HOT/WARM step. */}
          {isGameMode && (
            <StepStatusBar
              steps={gameStepStates.steps}
              activeStep={gameStepStates.activeId}
              accent="#16A34A"
              onStepClick={handleGameStepClick}
            />
          )}

          <div ref={rightPanelRef} style={S.tabContent}>
            {/* CODEX 48.5 — Return-to-game button when browsing sections */}
            {browsingSections && flowStep >= 3 && (
              <div style={{
                padding: "8px 14px", background: "rgba(22,163,74,0.08)",
                borderBottom: "1px solid rgba(22,163,74,0.2)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>
                  Browsing sections
                </span>
                <button
                  onClick={() => setBrowsingSections(false)}
                  style={{
                    fontSize: 12, fontWeight: 600, color: "#16A34A",
                    background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)",
                    borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                  }}
                >
                  Back to {gameStepStates.steps.find(s => s.id === gameStepStates.activeId)?.label || "game"}
                </button>
              </div>
            )}
            {/* My Images panel — shown when toggled from nav */}
            {showMyImages && (
              <MyImagesPanel onClose={() => setShowMyImages(false)} localAssets={canvasAssets} />
            )}

            {/* CODEX 47.3-P Fix P2 / 48.5 — Game canvas: collapsible sections.
                Visible at flowStep <= 2 (always) OR when browsing mode is on
                (user clicked a non-active pill to peek at other sections).
                This enables non-linear navigation and VC demo walkthroughs. */}
            {(flowStep <= 2 || browsingSections) && isGameMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Game Card section */}
                <div id="game-section-concept">
                  <CollapsibleSection
                    title="Game Card"
                    state={gameStepStates.steps[0].state}
                    expanded={openSection === "concept"}
                    onToggle={(next) => setOpenSection(next ? "concept" : null)}
                    summary={workerCardData?.name ? `${workerCardData.name} · Draft` : "Awaiting concept"}
                  >
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
                    ) : (
                      <div style={{ fontSize: 13, color: "#94A3B8", padding: "8px 0" }}>
                        Tell Alex about your game in the chat to start.
                      </div>
                    )}
                  </CollapsibleSection>
                </div>

                {/* Rules section — placeholder until rules are saved */}
                <div id="game-section-rules">
                  <CollapsibleSection
                    title="Rules"
                    state={gameStepStates.steps[1].state}
                    expanded={openSection === "rules"}
                    onToggle={(next) => setOpenSection(next ? "rules" : null)}
                    summary={
                      gameStepStates.steps[1].state === "hot"
                        ? "\u2713 Complete · Turn, win/lose, scoring, safety"
                        : gameStepStates.steps[1].state === "warm"
                          ? "Defining rules in chat"
                          : gameStepStates.steps[1].state === "idle"
                            ? "Pending"
                            : "Locked"
                    }
                  >
                    {gameStepStates.steps[1].state === "cold" ? (
                      <div style={{ fontSize: 13, color: "#94A3B8", padding: "8px 0" }}>
                        Save your game card first, then tap Define the Rules in chat.
                      </div>
                    ) : gameStepStates.steps[1].state === "idle" ? (
                      <div style={{ fontSize: 13, color: "#64748B", padding: "8px 0", lineHeight: 1.6 }}>
                        Nothing here yet. When you're in the Rules phase, Alex will walk you through turn mechanics, win/lose conditions, scoring, and safety one question at a time. You can jump back in from the chat.
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "#475569", padding: "8px 0", lineHeight: 1.6 }}>
                        {workerCardData?.gameRules?.turnMechanic && (<div><strong>Turn:</strong> {workerCardData.gameRules.turnMechanic}</div>)}
                        {workerCardData?.gameRules?.winLoseConditions && (<div><strong>Win/Lose:</strong> {workerCardData.gameRules.winLoseConditions}</div>)}
                        {workerCardData?.gameRules?.scoring && (<div><strong>Scoring:</strong> {workerCardData.gameRules.scoring}</div>)}
                        {workerCardData?.gameRules?.safetyCompliance && (<div><strong>Safety:</strong> {workerCardData.gameRules.safetyCompliance}</div>)}
                        {!workerCardData?.gameRules?.turnMechanic && (
                          <div style={{ color: "#94A3B8" }}>Answering rules questions in chat...</div>
                        )}
                      </div>
                    )}
                  </CollapsibleSection>
                </div>

                {/* Canvas / Artwork section */}
                <div id="game-section-artwork">
                  <CollapsibleSection
                    title="Canvas / Artwork"
                    state={gameStepStates.steps[2].state}
                    expanded={openSection === "artwork"}
                    onToggle={(next) => setOpenSection(next ? "artwork" : null)}
                    summary={
                      gameStepStates.steps[2].state === "hot" && canvasAssets.length > 0
                        ? `\u2713 Complete · ${canvasAssets.length} assets saved`
                        : canvasAssets.length > 0
                          ? `${canvasAssets.length} ${canvasAssets.length === 1 ? "asset" : "assets"} saved`
                          : gameStepStates.steps[2].state === "cold" ? "Locked"
                          : gameStepStates.steps[2].state === "idle" ? "Pending"
                          : "Awaiting artwork"
                    }
                  >
                    {gameStepStates.steps[2].state === "cold" ? (
                      <div style={{ fontSize: 13, color: "#94A3B8", padding: "8px 0" }}>
                        Lock in the rules first, then start generating artwork.
                      </div>
                    ) : (gameStepStates.steps[2].state === "idle" && canvasAssets.length === 0 && !imageGenerating) ? (
                      <div style={{ fontSize: 13, color: "#64748B", padding: "8px 0", lineHeight: 1.6 }}>
                        Nothing here yet. Alex will generate backgrounds, characters, icons, and a score display when you reach the Artwork phase. You can also upload your own art.
                      </div>
                    ) : (canvasAssets.length > 0 || imageGenerating) ? (
                      <>
                        {/* CODEX 48.4 Fix FF — Download all artwork */}
                        {canvasAssets.length > 0 && (
                          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                            <button
                              onClick={() => handleDownloadAllArtwork()}
                              style={{
                                fontSize: 12, fontWeight: 600, color: "#16A34A",
                                background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.3)",
                                borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                              }}
                            >
                              Download all ({canvasAssets.length})
                            </button>
                          </div>
                        )}
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
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: "#94A3B8", padding: "8px 0" }}>
                        Tap "Generate artwork" in chat to create your first asset.
                      </div>
                    )}
                  </CollapsibleSection>
                </div>

                {/* Interactions section */}
                <div id="game-section-interactions">
                  <CollapsibleSection
                    title="Interactions"
                    state={gameStepStates.steps[3].state}
                    expanded={openSection === "interactions"}
                    onToggle={(next) => setOpenSection(next ? "interactions" : null)}
                    summary={
                      gameStepStates.steps[3].state === "hot"
                        ? "\u2713 Complete · Movement, speed, collision, sound"
                        : gameStepStates.steps[3].state === "warm"
                          ? "Defining interactions in chat"
                          : gameStepStates.steps[3].state === "idle"
                            ? "Pending"
                            : "Locked"
                    }
                  >
                    {gameStepStates.steps[3].state === "cold" ? (
                      <div style={{ fontSize: 13, color: "#94A3B8", padding: "8px 0" }}>
                        Lock in rules and artwork first. Alex will walk you through interactions (movement, speed, collisions, sound) after that.
                      </div>
                    ) : gameStepStates.steps[3].state === "idle" ? (
                      <div style={{ fontSize: 13, color: "#64748B", padding: "8px 0", lineHeight: 1.6 }}>
                        Nothing here yet. Interactions is where you define how the game feels in the player's hands — movement, speed, collisions, and sound. Alex will walk you through four questions when you reach this phase.
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "#475569", padding: "8px 0", lineHeight: 1.6 }}>
                        {workerCardData?.gameInteractions?.movement && (<div><strong>Movement:</strong> {workerCardData.gameInteractions.movement}</div>)}
                        {workerCardData?.gameInteractions?.speed && (<div><strong>Speed:</strong> {workerCardData.gameInteractions.speed}</div>)}
                        {workerCardData?.gameInteractions?.collisionRules && (<div><strong>Collision:</strong> {workerCardData.gameInteractions.collisionRules}</div>)}
                        {workerCardData?.gameInteractions?.soundCues && (<div><strong>Sound:</strong> {workerCardData.gameInteractions.soundCues}</div>)}
                        {!workerCardData?.gameInteractions?.movement && (
                          <div style={{ color: "#94A3B8" }}>Answering interaction questions in chat...</div>
                        )}
                      </div>
                    )}
                  </CollapsibleSection>
                </div>

                {/* CODEX 48.4 — Test / Preflight / Distribute / Grow — idle previews.
                    Once concept is complete these are silver + clickable. Each section
                    describes what it will contain so the creator can peek ahead. */}
                {["test", "preflight", "distribute", "grow"].map((id, idx) => {
                  const stepIdx = idx + 4;
                  const s = gameStepStates.steps[stepIdx];
                  const labels = { test: "Test Board", preflight: "Preflight", distribute: "Distribution Kit", grow: "Grow & Revise" };
                  const descriptions = {
                    test: "The playable prototype. Swipe or tap to move your character, collect items, dodge hazards, rack up points. This activates after you finish Interactions and tap Build & Test.",
                    preflight: "Automated deploy checklist. We check every rule, every asset, and every interaction before your game goes live. You'll see any issues with a one-tap fix.",
                    distribute: "Your launch kit. Shareable URL, QR code for flyers, embed code for websites, and social copy ready to post.",
                    grow: "Track plays, collect feedback, push updates. Every revision creates a new version. Think of it as your game's changelog.",
                  };
                  const summary = s.state === "hot" ? "✓ Complete" : s.state === "warm" ? "In Progress" : s.state === "idle" ? "Pending" : "Locked";
                  return (
                    <div id={`game-section-${id}`} key={id}>
                      <CollapsibleSection
                        title={labels[id]}
                        state={s.state}
                        expanded={openSection === id}
                        onToggle={(next) => setOpenSection(next ? id : null)}
                        summary={summary}
                      >
                        <div style={{ fontSize: 13, color: "#64748B", padding: "8px 0", lineHeight: 1.6 }}>
                          {descriptions[id]}
                        </div>
                      </CollapsibleSection>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Worker sandbox (or pre-game-detected) — original LifecycleCard layout */}
            {flowStep <= 2 && !isGameMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <LifecycleCard flowStep={flowStep} isGame={false} />
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

            {/* Step 3 — Build (hidden when browsing sections) */}
            {flowStep === 3 && !browsingSections && (
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

            {/* Step 4 — Test (hidden when browsing sections) */}
            {flowStep === 4 && !browsingSections && (
              <PanelErrorBoundary
                recoverLabel="Back"
                onRecover={() => { viewStep(3); }}
              >
                {isGameMode ? (
                  testDevice ? (
                    <GameBoardPanel
                      assets={canvasAssets}
                      includedAssetIds={includedAssetIds}
                      workerCardData={workerCardData}
                      device={testDevice}
                      onSwitchDevice={() => setTestDevice(null)}
                    />
                  ) : (
                    <DeviceSelector onSelect={(d) => setTestDevice(d)} />
                  )
                ) : workerCardData?.gameConfig?.gameMode === "canvas" && !canvasDismissed ? (
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

            {/* Step 5 — Preflight (hidden when browsing sections) */}
            {flowStep === 5 && !browsingSections && (
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

            {/* Step 6 — Distribute (hidden when browsing sections) */}
            {flowStep === 6 && !browsingSections && (
              <>
                <DistributionKit worker={worker} workerCardData={workerCardData} hasUpdatedSinceLaunch={hasUpdatedSinceLaunch} canvasAssets={canvasAssets} />
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
