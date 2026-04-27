import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "../../firebase";
import { GoogleAuthProvider, linkWithPopup, linkWithRedirect, signInWithCredential } from "firebase/auth";
import { useRightPanel } from "../../context/RightPanelContext";
import { useWorkerState } from "../../context/WorkerStateContext";
import WorkerIcon, { getThemeAccent, getVerticalIconSlug } from "../../utils/workerIcons";
import SessionEndCTA from "../worker/SessionEndCTA";
import CanvasPanel from "../canvas/CanvasPanel";
import WorkerCanvas from "../canvas/WorkerCanvas";
import { WORKER_ROUTES } from "../../data/workerRoutes";

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

// WorkerCanvas extracted to ../canvas/WorkerCanvas.jsx (49.5b)
// TrialBanner also extracted (used inside WorkerCanvas)

// ── Stats Header ────────────────────────────────────────────────

const LANGUAGES = [
  { label: "English", code: "en" }, { label: "Espanol", code: "es" }, { label: "Portugues", code: "pt" },
  { label: "Francais", code: "fr" }, { label: "Deutsch", code: "de" }, { label: "Italiano", code: "it" },
  { label: "\u4e2d\u6587", code: "zh" }, { label: "\u7ca4\u8a9e", code: "zh-HK" }, { label: "\u65e5\u672c\u8a9e", code: "ja" },
  { label: "\ud55c\uad6d\uc5b4", code: "ko" }, { label: "\u0939\u093f\u0928\u094d\u0926\u0940", code: "hi" }, { label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", code: "ar" },
  { label: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430", code: "uk" }, { label: "Tieng Viet", code: "vi" }, { label: "\u0e20\u0e32\u0e29\u0e32\u0e44\u0e17\u0e22", code: "th" },
  { label: "Bahasa", code: "id" }, { label: "Filipino", code: "fil" }, { label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", code: "ru" },
  { label: "Polski", code: "pl" }, { label: "Turkce", code: "tr" }, { label: "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac", code: "el" },
  { label: "Nederlands", code: "nl" }, { label: "Svenska", code: "sv" },
];

function StatsHeader() {
  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem("PREFERRED_LANGUAGE") || "en");

  function handleLangClick(lang) {
    setSelectedLang(lang.code);
    localStorage.setItem("PREFERRED_LANGUAGE", lang.code);
    window.dispatchEvent(new CustomEvent("ta:language-changed", { detail: { code: lang.code, label: lang.label } }));
  }

  return (
    <div style={S.statsBar}>
      <div style={S.statsRow}>
        <span style={S.statItem}><span style={S.statNum}>1,000+</span> Digital Workers</span>
        <span style={S.statItem}><span style={S.statNum}>54</span> Countries</span>
        <span style={S.statItem}><span style={S.statNum}>24/7</span></span>
        <span style={S.statItem}><span style={S.statNum}>13</span> Industry Suites</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", fontSize: 11, color: "#94a3b8", marginTop: 10 }}>
        {LANGUAGES.map(l => (
          <span
            key={l.code}
            onClick={() => handleLangClick(l)}
            style={{ cursor: "pointer", color: selectedLang === l.code ? "#7c3aed" : undefined, fontWeight: selectedLang === l.code ? 600 : undefined, transition: "color 0.15s" }}
          >{l.label}</span>
        ))}
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
  const [featured, setFeatured] = useState([]);
  const [freeWorkers, setFreeWorkers] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api?path=/v1/marketplace:featured`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.workers) {
          setFeatured(data.workers.slice(0, 6));
          setFreeWorkers(data.workers.filter(w => !w.monthlyPrice || w.monthlyPrice === 0).slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
      <div style={S.sectionLabel}>Popular Today</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {featured.length > 0 ? featured.map((w, i) => (
          <div key={w.workerId || i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{w.name}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{w.vertical || ""}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", marginTop: 6 }}>
              {w.monthlyPrice ? `$${w.monthlyPrice}/mo` : "Free"}
            </div>
          </div>
        )) : Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", height: 60 }} />
        ))}
      </div>

      <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
        Tell Alex what you do — your canvas fills with workers built for your industry.
      </div>

      {freeWorkers.length > 0 && (
        <>
          <div style={S.sectionLabel}>Free to Try</div>
          {freeWorkers.map((w, i) => (
            <div key={w.workerId || i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{w.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{w.vertical || ""}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>Free</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Trial Banner — appears in WORKSPACE_HOME after 3+ exchanges ──

// ── Main RightPanel Component ───────────────────────────────────

export default function RightPanel() {
  const panel = useRightPanel();
  const { state, vertical, verticalLabel, workers, selectedWorker, showRecommendations, showWorkerDetail, goBack, dismiss, clearVerticalFilter, setWorkers, canvasData, dismissCanvas, relatedWorkers } = panel;
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

  // Listen for worker selection — show workspace home with related workers
  useEffect(() => {
    function findCousins(worker, allWorkers) {
      const suite = worker.suite || "";
      if (!suite) return [];
      const wSlug = worker.workerId || worker.slug;
      return allWorkers
        .filter(w => w.suite === suite && (w.workerId || w.slug) !== wSlug && w.status === "live")
        .slice(0, 6);
    }

    function onSelectWorker(e) {
      const { slug } = e.detail || {};
      if (!slug) return;

      // Try local WORKER_ROUTES first (always available, no network)
      const localMatch = WORKER_ROUTES.find(w => w.slug === slug);

      // Check if worker is already in loaded workers list (has richer data)
      const existing = workers.find(w => (w.workerId || w.slug) === slug);
      if (existing) {
        const cousins = findCousins(existing, workers.length > 10 ? workers : WORKER_ROUTES);
        panel.showWorkerHome(existing, cousins);
        return;
      }

      // Show localMatch immediately if available (no network wait)
      if (localMatch) {
        const cousins = findCousins(localMatch, WORKER_ROUTES);
        panel.showWorkerHome(localMatch, cousins);
        return;
      }

      // Fetch from catalog for richer data
      fetch(`${API_BASE}/api?path=/v1/catalog:byVertical&vertical=all&limit=200`)
        .then(r => r.json())
        .then(data => {
          const allCatalog = data.workers || [];
          const w = allCatalog.find(w => (w.workerId || w.slug) === slug);
          if (w) {
            const cousins = findCousins(w, allCatalog);
            panel.showWorkerHome(w, cousins);
          } else {
            // Worker not in catalog — construct minimal data from event
            const fallback = { slug, name: e.detail?.name || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()), suite: "Platform", status: "live" };
            panel.showWorkerHome(fallback, []);
          }
        }).catch(() => {
          // Network failed — construct minimal fallback
          const fallback = { slug, name: e.detail?.name || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()), suite: "Platform", status: "live" };
          panel.showWorkerHome(fallback, []);
        });
    }
    window.addEventListener("ta:select-worker", onSelectWorker);
    return () => window.removeEventListener("ta:select-worker", onSelectWorker);
  }, [workers, panel]);

  function handleAskAlex(worker) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: `Tell me about ${worker.name}` } }));
  }

  const showStats = state === "STATE-1" || state === "STATE-2";

  // ── CANVAS: Canvas Protocol card (44.9) ──────────────────────
  if (state === "CANVAS" && canvasData) {
    return <CanvasPanel canvasData={canvasData} onDismiss={dismissCanvas} />;
  }

  // ── WORKSPACE_HOME: Worker just opened — show capabilities + quick-start ──
  // 40.2-T1: Arrival animation system
  if (state === "WORKSPACE_HOME" && panel.activeWorkerData) {
    return (
      <WorkerCanvas
        workerData={panel.activeWorkerData}
        verticalLabel={panel.verticalLabel}
        relatedWorkers={relatedWorkers || []}
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
