import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "../../firebase";
import { GoogleAuthProvider, linkWithPopup, linkWithRedirect, signInWithCredential } from "firebase/auth";
import { useRightPanel } from "../../context/RightPanelContext";
import { useWorkerState } from "../../context/WorkerStateContext";
import WorkerIcon, { getThemeAccent, getVerticalIconSlug } from "../../utils/workerIcons";
import SessionEndCTA from "../worker/SessionEndCTA";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function getGuestId() {
  let id = localStorage.getItem("ta_guest_id");
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `g-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("ta_guest_id", id);
  }
  return id;
}

// ── Styles ──────────────────────────────────────────────────────

const S = {
  wrap: { height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#1e293b", overflowY: "auto" },
  statsBar: { padding: "16px 20px", borderBottom: "1px solid #e5e7eb", flexShrink: 0, background: "#ffffff" },
  statsRow: { display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, fontWeight: 600, color: "#64748b" },
  statItem: { display: "flex", alignItems: "center", gap: 4 },
  statNum: { color: "#111827", fontWeight: 700 },
  breadcrumb: { padding: "12px 20px", fontSize: 13, color: "#6b7280", borderBottom: "1px solid #e5e7eb", background: "#ffffff", flexShrink: 0 },
  breadcrumbLabel: { fontWeight: 600, color: "#111827" },
  cardList: { flex: 1, padding: 16, overflowY: "auto" },
  card: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", marginBottom: 10, cursor: "pointer", transition: "border-color 0.15s" },
  cardName: { fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  priceBadge: { fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12, background: "rgba(124,58,237,0.08)", color: "#7c3aed" },
  getBtn: { fontSize: 12, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer" },
  detailPanel: { padding: 20, flex: 1, overflowY: "auto" },
  detailTitle: { fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 },
  detailDesc: { fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 16 },
  detailMeta: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  detailTag: { fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "#f3f4f6", color: "#6b7280" },
  subscribeBtn: { padding: "12px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 8 },
  askBtn: { padding: "12px 24px", background: "white", color: "#7c3aed", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" },
  backBtn: { background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8, marginTop: 16 },
  empty: { padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 },
  browseLink: { display: "block", textAlign: "center", padding: "12px 16px", fontSize: 13, color: "#7c3aed", background: "none", border: "none", cursor: "pointer" },
  dismissBtn: { position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 18, color: "#94a3b8", cursor: "pointer", lineHeight: 1 },
  recHeader: { position: "relative", padding: "16px 20px", borderBottom: "1px solid #e5e7eb", background: "#ffffff", flexShrink: 0 },
  recTitle: { fontSize: 14, fontWeight: 700, color: "#111827" },
  recSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  // Inline prompts
  authWrap: { margin: "0 0 10px", padding: "14px 16px", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 10 },
  authInput: { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, outline: "none", boxSizing: "border-box", marginBottom: 8 },
  authError: { fontSize: 12, color: "#dc2626", marginBottom: 6 },
};

const VERTICAL_LABELS = {
  aviation: "Aviation", pilot: "Aviation", "real-estate": "Real Estate",
  "auto-dealer": "Auto Dealer", auto: "Auto Dealer", web3: "Web3",
  solar: "Solar", nursing: "Nursing", health: "Healthcare",
  games: "Games", government: "Government",
};

function formatPrice(price) {
  if (!price || price === 0) return "Free";
  return `$${price}/mo`;
}

function generateDefaultPrompts(capabilitySummary, workerName) {
  if (!capabilitySummary) return [`What can ${workerName || "you"} help me with?`];
  const sentences = capabilitySummary.split(/[.;]/).map(s => s.trim()).filter(s => s.length > 15);
  const prompts = sentences.slice(0, 3).map(s => {
    const lower = s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");
    return `Help me with ${lower}`;
  });
  if (prompts.length === 0) prompts.push(`What can ${workerName || "you"} help me with?`);
  return prompts;
}

// ── 40.2-T1: Worker Canvas with Arrival Animation ──────────────────

function WorkerCanvas({ workerData, verticalLabel, onLeave }) {
  const ws = useWorkerState();
  const w = workerData;
  const prompts = w.quickStartPrompts || generateDefaultPrompts(w.capabilitySummary, w.name || w.display_name);
  const vertical = verticalLabel || w.vertical || w.suite || "Other";
  const isGame = !!w.gameConfig?.isGame;
  const accent = getThemeAccent(vertical, isGame);
  const iconSlug = getVerticalIconSlug(vertical);

  // Operating mode configuration
  const MODE_CONFIG = {
    pro: {
      label: "Operating from verified documents",
      bg: "rgba(22, 163, 74, 0.1)",
      border: "rgba(22, 163, 74, 0.25)",
      color: "#16a34a",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    },
    advisory: {
      label: "Based on general best practice \u2014 upload your documents to activate Pro Mode",
      bg: "rgba(217, 119, 6, 0.1)",
      border: "rgba(217, 119, 6, 0.25)",
      color: "#d97706",
      icon: "M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
    },
    flagged: {
      label: "Document review required",
      bg: "rgba(220, 38, 38, 0.1)",
      border: "rgba(220, 38, 38, 0.25)",
      color: "#dc2626",
      icon: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    },
  };
  // Default all workers to advisory until Studio Locker is built
  const operatingMode = "advisory";
  const modeInfo = MODE_CONFIG[operatingMode];

  // Arrival state machine
  const [arrivalPhase, setArrivalPhase] = useState("idle"); // idle | heartbeat | reveal | done
  const [showName, setShowName] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showCapability, setShowCapability] = useState(false);
  const [showChips, setShowChips] = useState([]);
  const [showBadges, setShowBadges] = useState(false);
  const [showSweep, setShowSweep] = useState(false);
  const [iconAnchored, setIconAnchored] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const arrivalCancelled = useRef(false);
  const timeoutsRef = useRef([]);
  const heartbeatRef = useRef(null);
  const prevWorkerRef = useRef(null);

  // Clear all scheduled timeouts
  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      if (!arrivalCancelled.current) fn();
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // Determine workerState from context (or fallback to local)
  const workerState = ws?.workerState || "idle";
  const workerReady = ws?.workerReady !== undefined ? ws.workerReady : true;
  const isTransitioning = ws?.isTransitioning || false;

  // Skeleton loading — show after 300ms if not ready
  useEffect(() => {
    if (!workerReady) {
      const t = setTimeout(() => setShowSkeleton(true), 300);
      return () => clearTimeout(t);
    }
    setShowSkeleton(false);
  }, [workerReady]);

  // Trigger arrival when workerState becomes 'arrival'
  useEffect(() => {
    if (workerState !== "arrival") return;
    // Reset all reveal states
    arrivalCancelled.current = false;
    clearTimeouts();
    setArrivalPhase("heartbeat");
    setShowName(false);
    setShowTagline(false);
    setShowCapability(false);
    setShowChips([]);
    setShowBadges(false);
    setShowSweep(false);
    setIconAnchored(false);
  }, [workerState, clearTimeouts]);

  // Skip arrival on worker switch if same worker re-selected or data already present
  useEffect(() => {
    const wId = w.workerId || w.slug;
    if (prevWorkerRef.current === wId) return;
    prevWorkerRef.current = wId;
    // If context is already idle (no arrival triggered), show content immediately
    if (workerState === "idle" && workerReady) {
      setArrivalPhase("done");
      setShowName(true);
      setShowTagline(true);
      setShowCapability(true);
      setShowChips(prompts.map((_, i) => i));
      setShowBadges(true);
      setIconAnchored(true);
    }
  }, [w, workerState, workerReady, prompts]);

  // Heartbeat animationend → start reveal sequence
  const handleHeartbeatEnd = useCallback(() => {
    if (arrivalCancelled.current) return;
    setArrivalPhase("reveal");
    // Staggered content reveal
    schedule(() => setIconAnchored(true), 0);
    schedule(() => setShowName(true), 200);
    schedule(() => setShowTagline(true), 500);
    schedule(() => setShowCapability(true), 750);
    prompts.forEach((_, i) => {
      schedule(() => setShowChips(prev => [...prev, i]), 900 + i * 150);
    });
    schedule(() => setShowBadges(true), 1350);
    schedule(() => setShowSweep(true), 1600);
    schedule(() => {
      setArrivalPhase("done");
      setShowSweep(false);
      if (ws?.setWorkerState) ws.setWorkerState("idle");
    }, 2000);
  }, [prompts, schedule, ws]);

  // Early interrupt: if user sends message during arrival, skip to working
  useEffect(() => {
    if (workerState === "working" && arrivalPhase !== "done") {
      arrivalCancelled.current = true;
      clearTimeouts();
      setArrivalPhase("done");
      setShowName(true);
      setShowTagline(true);
      setShowCapability(true);
      setShowChips(prompts.map((_, i) => i));
      setShowBadges(true);
      setIconAnchored(true);
      setShowSweep(false);
    }
  }, [workerState, arrivalPhase, prompts, clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  // Breathe duration based on worker state
  const breatheDuration = workerState === "working" ? "1.8s" : "4s";

  // Confirmation pulse on complete state
  const [confirmPulse, setConfirmPulse] = useState(false);
  useEffect(() => {
    if (workerState === "complete") {
      setConfirmPulse(true);
    }
  }, [workerState]);

  const handleConfirmPulseEnd = useCallback(() => {
    setConfirmPulse(false);
    if (ws?.setWorkerState) ws.setWorkerState("idle");
  }, [ws]);

  const contentVisible = arrivalPhase === "done" || arrivalPhase === "reveal";

  return (
    <div
      className="worker-canvas-container"
      style={{
        "--worker-accent": accent,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0f1219",
        color: "#e5e7eb",
        overflowY: "auto",
        position: "relative",
        opacity: isTransitioning ? 0.6 : 1,
        transition: "opacity 150ms ease-out",
      }}
    >
      {/* Back button */}
      <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
        <button
          onClick={onLeave}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none",
            border: "none", color: "var(--worker-accent)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to {verticalLabel || "workers"}
        </button>
      </div>

      {/* Operating mode band */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 24px",
        background: modeInfo.bg,
        borderBottom: `1px solid ${modeInfo.border}`,
        flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={modeInfo.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d={modeInfo.icon} />
        </svg>
        <span style={{ fontSize: 12, color: modeInfo.color, fontWeight: 500, lineHeight: 1.4 }}>
          {modeInfo.label}
        </span>
      </div>

      {/* Skeleton loading state */}
      {!workerReady && showSkeleton && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ marginBottom: 32, opacity: 0.4 }}>
            <WorkerIcon slug={iconSlug} size={48} color={accent} />
          </div>
          <div style={{
            width: "100%", maxWidth: 280, height: 32, borderRadius: 8, marginBottom: 12,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s linear infinite",
          }} />
          <div style={{
            width: "60%", maxWidth: 180, height: 20, borderRadius: 6, marginBottom: 16,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s linear infinite",
          }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: 80, height: 32, borderRadius: 16,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s linear infinite",
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Arrival + Content area */}
      {workerReady && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px 24px", position: "relative" }}>

          {/* Heartbeat center area — shown during heartbeat phase */}
          {(arrivalPhase === "heartbeat" || (arrivalPhase === "idle" && workerState === "arrival")) && (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              position: "absolute", inset: 0, zIndex: 2,
            }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <WorkerIcon slug={iconSlug} size={48} color={accent} />
                {/* Heartbeat ring */}
                <div
                  ref={heartbeatRef}
                  className="heartbeat-ring"
                  onAnimationEnd={handleHeartbeatEnd}
                  style={{
                    position: "absolute",
                    width: 80, height: 80,
                    borderRadius: "50%",
                    border: `1.5px solid var(--worker-accent)`,
                    animation: "heartbeat-arrival 700ms ease-out 2",
                    animationFillMode: "forwards",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Anchored icon + content — shown during reveal and after */}
          {contentVisible && (
            <>
              {/* Icon anchored top-left */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 12, marginTop: 8,
                position: "relative",
              }}>
                <div
                  className="worker-icon-breathe"
                  style={{
                    animation: arrivalPhase === "done" ? `breathe ${breatheDuration} ease-in-out infinite` : "none",
                    "--breathe-duration": breatheDuration,
                    transition: iconAnchored ? "transform 400ms ease-out" : "none",
                  }}
                >
                  <WorkerIcon slug={iconSlug} size={32} color={accent} />
                </div>

                {/* Confirmation pulse ring */}
                {confirmPulse && (
                  <div
                    className="heartbeat-ring"
                    onAnimationEnd={handleConfirmPulseEnd}
                    style={{
                      position: "absolute", left: -8, top: -8,
                      width: 48, height: 48,
                      borderRadius: "50%",
                      border: `1.5px solid var(--worker-accent)`,
                      animation: "heartbeat-arrival 700ms ease-out 1",
                      animationFillMode: "forwards",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>

              {/* Worker name */}
              <div
                className="arrival-name"
                style={{
                  fontSize: 22, fontWeight: 700, color: "var(--worker-accent)", marginBottom: 4,
                  opacity: showName ? 1 : 0,
                  transform: showName ? "translateY(0)" : "translateY(4px)",
                  animation: showName && arrivalPhase === "reveal" ? "fadeIn 300ms ease-out forwards" : "none",
                }}
              >
                {w.name || w.display_name}
              </div>

              {/* Tagline */}
              {w.tagline && (
                <div
                  className="arrival-tagline"
                  style={{
                    fontSize: 14, color: "var(--worker-accent)", fontWeight: 500, marginBottom: 12,
                    opacity: showTagline ? 0.8 : 0,
                    transform: showTagline ? "translateY(0)" : "translateY(4px)",
                    animation: showTagline && arrivalPhase === "reveal" ? "fadeIn 250ms ease-out forwards" : "none",
                  }}
                >
                  {w.tagline}
                </div>
              )}

              {/* Capability summary (whatYoullHave) */}
              {w.capabilitySummary && (
                <div
                  className="arrival-capability"
                  style={{
                    fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 24,
                    opacity: showCapability ? 1 : 0,
                    transform: showCapability ? "translateY(0)" : "translateY(4px)",
                    animation: showCapability && arrivalPhase === "reveal" ? "fadeIn 250ms ease-out forwards" : "none",
                  }}
                >
                  {w.capabilitySummary}
                </div>
              )}

              {/* Quick start chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {prompts.map((p, i) => (
                  <button
                    key={i}
                    className="arrival-chips"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", { detail: { text: p } }));
                      if (ws?.startWorking) ws.startWorking();
                    }}
                    style={{
                      padding: "8px 14px", fontSize: 13, borderRadius: 20,
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid var(--worker-accent)`,
                      color: "var(--worker-accent)", cursor: "pointer", fontWeight: 500,
                      fontFamily: "inherit", textAlign: "left", lineHeight: 1.4,
                      opacity: showChips.includes(i) ? 1 : 0,
                      transform: showChips.includes(i) ? "translateY(0)" : "translateY(4px)",
                      animation: showChips.includes(i) && arrivalPhase === "reveal" ? "fadeIn 200ms ease-out forwards" : "none",
                      transition: arrivalPhase === "done" ? "background 150ms" : "none",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Substrate badges (recent activity + documents) */}
              <div
                className="arrival-badges"
                style={{
                  opacity: showBadges ? 1 : 0,
                  transform: showBadges ? "translateY(0)" : "translateY(4px)",
                  animation: showBadges && arrivalPhase === "reveal" ? "fadeIn 200ms ease-out forwards" : "none",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                  Recent activity
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>
                  Your work with {w.name || "this worker"} will appear here
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                  Documents
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                  Upload documents to give {w.name || "this worker"} more context
                </div>
              </div>

              <TrialBanner worker={w} />
              <SessionEndCTA style={{ marginTop: 24 }} />
            </>
          )}

          {/* Sweep line — bottom of canvas */}
          {showSweep && (
            <div
              className="arrival-sweep"
              style={{
                position: "absolute",
                bottom: 0, left: 0,
                height: 2,
                background: "var(--worker-accent)",
                opacity: 0.2,
                animation: "sweep 400ms ease-out forwards",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Stats Header ────────────────────────────────────────────────

const LANGUAGES = [
  "English", "Espanol", "Portugues", "Francais", "Deutsch", "Italiano",
  "\u4e2d\u6587", "\u7ca4\u8a9e", "\u65e5\u672c\u8a9e", "\ud55c\uad6d\uc5b4", "\u0939\u093f\u0928\u094d\u0926\u0940", "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
  "Tieng Viet", "\u0e20\u0e32\u0e29\u0e32\u0e44\u0e17\u0e22", "Bahasa", "Filipino", "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", "Polski",
  "Turkce", "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac", "Nederlands", "Svenska",
];

function StatsHeader() {
  return (
    <div style={S.statsBar}>
      <div style={S.statsRow}>
        <span style={S.statItem}><span style={S.statNum}>1,000+</span> Digital Workers</span>
        <span style={S.statItem}><span style={S.statNum}>54</span> Countries</span>
        <span style={S.statItem}><span style={S.statNum}>24/7</span></span>
        <span style={S.statItem}><span style={S.statNum}>13</span> Industry Suites</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", fontSize: 11, color: "#94a3b8", marginTop: 10 }}>
        {LANGUAGES.map(l => <span key={l}>{l}</span>)}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>Every worker speaks your language.</div>
    </div>
  );
}

// ── Subscribe helper ──

async function subscribeToWorker(worker) {
  const workerId = worker.workerId || worker.slug;
  const headers = { "Content-Type": "application/json" };
  const bodyData = { workerId, slug: workerId };

  // Try Firebase auth token first, fall back to guestId
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken(true);
      headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // Token refresh failed — use guestId
      bodyData.guestId = getGuestId();
    }
  } else {
    bodyData.guestId = getGuestId();
  }

  const res = await fetch(`${API_BASE}/api?path=/v1/worker:subscribe`, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyData),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[subscribe] HTTP error:", res.status, text);
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Subscribe failed");
  window.dispatchEvent(new CustomEvent("ta:worker-subscribed", {
    detail: { workerId, name: worker.name, price: worker.price || 0 },
  }));
  return data;
}

// ── Worker Card — Spotify model ─────────────────────────────────
// Free: click → subscribe instantly with guestId, zero auth
// Paid: click → email prompt → Stripe Checkout → webhook creates subscription

function WorkerCard({ worker, onSelect, onOpen }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const isFree = !worker.price || worker.price === 0;

  async function handleClick(e) {
    e.stopPropagation();
    setSubmitting(true);
    setError("");
    try {
      if (isFree) {
        await subscribeToWorker(worker);
        setSubscribed(true);
      }
      // Open worker immediately — free or paid
      if (onOpen) onOpen(worker);
      // For paid workers, fire preview event so MeetAlex sends greeting
      if (!isFree) {
        const workerId = worker.workerId || worker.slug;
        window.dispatchEvent(new CustomEvent("ta:worker-preview-opened", {
          detail: { workerId, workerName: worker.name || worker.display_name, price: worker.price, slug: worker.slug || workerId },
        }));
      }
    } catch (err) {
      console.error("[worker] failed:", err);
      setError(isFree ? "Subscribe failed. Try again." : "Could not open worker.");
    }
    setSubmitting(false);
  }

  if (subscribed) {
    return (
      <div style={{ ...S.card, borderColor: "#10b981", cursor: "default" }}>
        <div style={S.cardName}>{worker.name}</div>
        <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600, marginTop: 4 }}>Added to your team</div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={S.card}
        onClick={() => onSelect(worker)}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          {worker.rank && (
            <div style={{ fontSize: 22, fontWeight: 800, color: "#e5e7eb", lineHeight: 1, minWidth: 24, flexShrink: 0 }}>
              {worker.rank}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={S.cardName}>{worker.name || worker.display_name}</div>
            <div style={S.cardDesc}>{worker.tagline || worker.shortDescription || worker.description}</div>
            <div style={S.cardFooter}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={S.priceBadge}>{formatPrice(worker.price)}</span>
                {worker.subscriberCount > 0 && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{worker.subscriberCount.toLocaleString()} using this</span>
                )}
              </div>
              <button
                style={{ ...S.getBtn, opacity: submitting ? 0.6 : 1 }}
                onClick={handleClick}
                disabled={submitting}
              >
                {submitting ? "..." : isFree ? "Get this worker" : "Start 14-day free trial"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {error && <div style={{ ...S.authError, padding: "6px 16px" }}>{error}</div>}
    </div>
  );
}

// ── STATE-1: Cold Visitor — Product Intro Visual ────────────────

function ProductIntro() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#6B21A8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 2 }}>Alex</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 24 }}>Chief of Staff</div>

      <div style={{ width: 2, height: 24, background: "#E2D9F3", marginBottom: 8 }} />

      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
        {[
          { name: "PC12-NG CoPilot", vertical: "Aviation" },
          { name: "Title Search", vertical: "Real Estate" },
          { name: "F&I Products", vertical: "Auto Dealer" },
        ].map(w => (
          <div key={w.name} style={{ width: 110, padding: "12px 8px", borderRadius: 10, background: "#1E1E2E", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#ffffff", marginBottom: 4 }}>{w.name}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{w.vertical}</div>
          </div>
        ))}
      </div>

      <div style={{ width: 2, height: 24, background: "#E2D9F3", marginBottom: 8 }} />

      <div style={{ width: 160, padding: "14px 16px", borderRadius: 12, background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>Your Vault</div>
          <div style={{ fontSize: 10, color: "#e9d5ff" }}>Shared data layer</div>
        </div>
      </div>

      <div style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.8 }}>
        <div>Alex is your Chief of Staff.</div>
        <div>Workers handle the work.</div>
        <div>Your Vault holds everything.</div>
      </div>
    </div>
  );
}

// ── Trial Banner — appears in WORKSPACE_HOME after 3+ exchanges ──

function TrialBanner({ worker }) {
  const [messageCount, setMessageCount] = useState(0);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(`ta_trial_dismissed_${worker.workerId || worker.slug}`) === "1");
  const [showCheckout, setShowCheckout] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [email, setEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [processing, setProcessing] = useState(false);

  const workerId = worker.workerId || worker.slug;
  const workerName = worker.name || worker.display_name || "this worker";
  const isFree = !worker.price || worker.price === 0;

  // Listen for message count updates
  useEffect(() => {
    function onCount(e) {
      const { count, workerSlug } = e.detail || {};
      if (workerSlug === workerId || !workerSlug) setMessageCount(count || 0);
    }
    window.addEventListener("ta:worker-message-count", onCount);
    return () => window.removeEventListener("ta:worker-message-count", onCount);
  }, [workerId]);

  // Listen for worker-subscribed to mark trial started
  useEffect(() => {
    function onSubscribed(e) {
      if ((e.detail?.workerId) === workerId) setTrialStarted(true);
    }
    window.addEventListener("ta:worker-subscribed", onSubscribed);
    return () => window.removeEventListener("ta:worker-subscribed", onSubscribed);
  }, [workerId]);

  function handleDismiss() {
    sessionStorage.setItem(`ta_trial_dismissed_${workerId}`, "1");
    setDismissed(true);
  }

  async function startTrialWithToken(idToken) {
    const res = await fetch(`${API_BASE}/api?path=/v1/subscription:startTrial`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ workerId }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Trial start failed");
    setTrialStarted(true);
    window.dispatchEvent(new CustomEvent("ta:worker-subscribed", {
      detail: { workerId, name: workerName, price: worker.price || 0 },
    }));
    // Alex confirmation
    window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", {
      detail: { text: `You're all set. Your 14-day trial of ${workerName} starts now. No charge today.`, fromSystem: true },
    }));
  }

  async function handleGoogleAuth() {
    setProcessing(true);
    setCheckoutError("");
    const anonUid = auth.currentUser?.uid;
    try {
      const provider = new GoogleAuthProvider();
      const result = await linkWithPopup(auth.currentUser, provider);
      const idToken = await result.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", idToken);
      await startTrialWithToken(idToken);
    } catch (err) {
      if (err?.code === "auth/popup-blocked") {
        try { await linkWithRedirect(auth.currentUser, new GoogleAuthProvider()); } catch { /* redirect navigates away */ }
        setProcessing(false);
        return;
      }
      if (err?.code === "auth/credential-already-in-use") {
        try {
          const credential = GoogleAuthProvider.credentialFromError(err);
          const result = await signInWithCredential(auth, credential);
          const idToken = await result.user.getIdToken(true);
          localStorage.setItem("ID_TOKEN", idToken);
          // Transfer subscriptions from anon UID
          if (anonUid && anonUid !== result.user.uid) {
            fetch(`${API_BASE}/api?path=/v1/subscription:transfer`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ fromUid: anonUid, toUid: result.user.uid }),
            }).catch(() => {});
          }
          await startTrialWithToken(idToken);
        } catch (innerErr) {
          setCheckoutError("Sign-in failed. Try again.");
        }
        setProcessing(false);
        return;
      }
      console.error("[TrialBanner] Google auth error:", err);
      setCheckoutError("Sign-in failed. Try again.");
    }
    setProcessing(false);
  }

  async function handleEmailMagicLink(e) {
    e?.preventDefault();
    if (!email || !email.includes("@")) { setCheckoutError("Enter a valid email."); return; }
    setProcessing(true);
    setCheckoutError("");
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/magic-link:send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, workerId: "platform-trial", workerSlug: workerId, workerName, preAuthUid: auth.currentUser?.uid }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to send");
      setCheckoutError("");
      setShowEmailFallback(false);
      setShowCheckout(false);
      // Show confirmation in Alex
      window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", {
        detail: { text: `Check your email for a sign-in link. Once you're in, your trial will start automatically.`, fromSystem: true },
      }));
    } catch (err) {
      setCheckoutError(err.message || "Failed to send email.");
    }
    setProcessing(false);
  }

  // Don't show for free workers
  if (isFree) return null;
  // Trial already started
  if (trialStarted) {
    return (
      <div style={{ margin: "16px 0", padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>Trial active — 14 days remaining</div>
      </div>
    );
  }
  // Not enough messages or dismissed
  if (messageCount < 3 || dismissed) return null;

  // Checkout UI
  if (showCheckout) {
    return (
      <div style={{ margin: "16px 0", padding: "16px", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Start your 14-day free trial</div>
        {checkoutError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{checkoutError}</div>}
        <button
          onClick={handleGoogleAuth}
          disabled={processing}
          style={{
            width: "100%", padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 8,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            opacity: processing ? 0.6 : 1, color: "#1f2937", fontFamily: "inherit",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        {!showEmailFallback ? (
          <button
            onClick={() => setShowEmailFallback(true)}
            style={{ background: "none", border: "none", color: "#7c3aed", fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center", padding: 4, fontFamily: "inherit" }}
          >
            Or use your email
          </button>
        ) : (
          <form onSubmit={handleEmailMagicLink} style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" autoComplete="email" autoFocus
              style={{ ...S.authInput, marginBottom: 0, flex: 1 }}
            />
            <button type="submit" disabled={processing} style={{ ...S.getBtn, padding: "10px 14px", fontSize: 13, flexShrink: 0 }}>
              {processing ? "..." : "Send link"}
            </button>
          </form>
        )}
      </div>
    );
  }

  // Trial banner
  return (
    <div style={{ margin: "16px 0", padding: "14px 16px", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 10, position: "relative" }}>
      <button onClick={handleDismiss} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", fontSize: 16, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>&times;</button>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Enjoying {workerName}?</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Start your free 14-day trial. No charge today.</div>
      <button
        onClick={() => setShowCheckout(true)}
        style={{ ...S.subscribeBtn, marginBottom: 0 }}
      >
        Start my trial
      </button>
    </div>
  );
}

// ── Main RightPanel Component ───────────────────────────────────

export default function RightPanel() {
  const panel = useRightPanel();
  const { state, vertical, verticalLabel, workers, selectedWorker, showRecommendations, showWorkerDetail, goBack, dismiss, clearVerticalFilter, setWorkers } = panel;
  const [loading, setLoading] = useState(false);

  // Load workers from leaderboard API on mount
  useEffect(() => {
    loadLeaderboard(vertical);
  }, [vertical]);

  // Listen for Alex recommendation events
  useEffect(() => {
    function onRecommendations(e) {
      const { vertical: v, workers: w, verticalLabel: label } = e.detail || {};
      if (v) {
        showRecommendations(w || [], v, label || null);
        if (!w || w.length === 0) loadLeaderboard(v);
      }
    }
    function onHighlight(e) {
      const { workerId } = e.detail || {};
      if (workerId) {
        const w = workers.find(w => w.workerId === workerId || w.slug === workerId);
        if (w) showWorkerDetail(w);
      }
    }
    window.addEventListener("ta:panel-show-recommendations", onRecommendations);
    window.addEventListener("ta:panel-highlight-worker", onHighlight);
    return () => {
      window.removeEventListener("ta:panel-show-recommendations", onRecommendations);
      window.removeEventListener("ta:panel-highlight-worker", onHighlight);
    };
  }, [workers, showRecommendations, showWorkerDetail]);

  async function loadLeaderboard(v) {
    setLoading(true);
    try {
      if (v) {
        // Try leaderboard first — ranked by subscribers, live data
        const res = await fetch(`${API_BASE}/api?path=/v1/leaderboard:top10&vertical=${encodeURIComponent(v)}`);
        const data = await res.json();
        if (data.ok && data.workers && data.workers.length > 0) {
          setWorkers(data.workers);
          setLoading(false);
          return;
        }
      }
      // No vertical or no leaderboard — fall back to catalog
      const fallbackVertical = v || "aviation";
      const res = await fetch(`${API_BASE}/api?path=/v1/catalog:byVertical&vertical=${encodeURIComponent(fallbackVertical)}&limit=10`);
      const data = await res.json();
      if (data.ok && data.workers) setWorkers(data.workers);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    }
    setLoading(false);
  }

  // Listen for worker selection — show workspace home
  useEffect(() => {
    function onSelectWorker(e) {
      const { slug } = e.detail || {};
      if (!slug) return;
      // Check if worker is already in loaded workers list
      const existing = workers.find(w => (w.workerId || w.slug) === slug);
      if (existing) {
        panel.showWorkerHome(existing);
        return;
      }
      // Fetch from catalog
      fetch(`${API_BASE}/api?path=/v1/catalog:byVertical&vertical=all&limit=200`)
        .then(r => r.json())
        .then(data => {
          const w = (data.workers || []).find(w => (w.workerId || w.slug) === slug);
          if (w) panel.showWorkerHome(w);
        }).catch(() => {});
    }
    window.addEventListener("ta:select-worker", onSelectWorker);
    return () => window.removeEventListener("ta:select-worker", onSelectWorker);
  }, [workers, panel]);

  function handleAskAlex(worker) {
    window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", { detail: { text: `Tell me about ${worker.name}` } }));
  }

  const showStats = state === "STATE-1" || state === "STATE-2";

  // ── WORKSPACE_HOME: Worker just opened — show capabilities + quick-start ──
  // 40.2-T1: Arrival animation system
  if (state === "WORKSPACE_HOME" && panel.activeWorkerData) {
    return (
      <WorkerCanvas
        workerData={panel.activeWorkerData}
        verticalLabel={panel.verticalLabel}
        onLeave={() => panel.leaveWorkspace()}
      />
    );
  }

  // ── STATE-4: Worker Detail ──────────────────────────────────
  if (state === "STATE-4" && selectedWorker) {
    return (
      <div style={S.wrap}>
        <div style={S.detailPanel}>
          <button style={S.backBtn} onClick={goBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div style={S.detailTitle}>{selectedWorker.name}</div>
          <div style={S.detailDesc}>{selectedWorker.shortDescription || selectedWorker.description}</div>
          <div style={S.detailMeta}>
            {verticalLabel && <span style={S.detailTag}>{verticalLabel}</span>}
            <span style={S.detailTag}>{formatPrice(selectedWorker.price)}</span>
          </div>

          {selectedWorker.capabilitySummary && (
            <>
              <div style={S.sectionLabel}>What it does</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 16 }}>{selectedWorker.capabilitySummary}</div>
            </>
          )}

          <div style={S.sectionLabel}>Audit trail</div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
            Every response logged. Ground use only.
          </div>

          <WorkerCard worker={selectedWorker} onSelect={() => {}} onOpen={panel.showWorkerHome} />

          <button style={{ ...S.askBtn, marginTop: 8 }} onClick={() => handleAskAlex(selectedWorker)}>Ask Alex about this</button>
        </div>
      </div>
    );
  }

  // ── STATE-1: Cold Visitor — Show storefront cards immediately ──
  if (state === "STATE-1") {
    return (
      <div style={S.wrap}>
        <StatsHeader />
        <div style={S.breadcrumb}>
          <span style={S.breadcrumbLabel}>Top 10 in {verticalLabel || VERTICAL_LABELS[vertical] || "All Industries"} Today</span>
        </div>
        <div style={S.cardList}>
          {loading ? (
            <div style={S.empty}>Loading workers...</div>
          ) : workers.length === 0 ? (
            <div style={S.empty}>No workers available yet</div>
          ) : (
            workers.map((w, i) => (
              <WorkerCard key={w.workerId || i} worker={w} onSelect={showWorkerDetail} onOpen={panel.showWorkerHome} />
            ))
          )}
        </div>
      </div>
    );
  }

  // ── STATE-2 & STATE-3: Worker Cards ─────────────────────────
  return (
    <div style={S.wrap}>
      {showStats && <StatsHeader />}

      {state === "STATE-3" && (
        <div style={{ ...S.recHeader, position: "relative" }}>
          <div style={S.recTitle}>
            {verticalLabel ? `${verticalLabel} Workers` : "Recommended for you"}
          </div>
          <div style={S.recSub}>
            {verticalLabel ? `Showing top picks for your role` : "Based on your conversation"}
          </div>
          <button style={S.dismissBtn} onClick={dismiss} title="Dismiss">&times;</button>
        </div>
      )}

      {state === "STATE-2" && verticalLabel && (
        <div style={S.breadcrumb}>
          <span style={S.breadcrumbLabel}>Top 10 in {verticalLabel || VERTICAL_LABELS[vertical] || "All Industries"} Today</span>
        </div>
      )}

      <div style={S.cardList}>
        {loading ? (
          <div style={S.empty}>Loading workers...</div>
        ) : workers.length === 0 ? (
          <div style={S.empty}>No workers available yet</div>
        ) : (
          workers.map((w, i) => (
            <WorkerCard key={w.workerId || i} worker={w} onSelect={showWorkerDetail} onOpen={panel.showWorkerHome} />
          ))
        )}
      </div>

      <button style={S.browseLink} onClick={clearVerticalFilter}>
        Browse all industries &rarr;
      </button>
    </div>
  );
}
