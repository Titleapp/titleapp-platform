import React, { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { useRightPanel } from "../../context/RightPanelContext";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

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
  // Inline auth
  authWrap: { margin: "0 0 10px", padding: "14px 16px", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 10 },
  authInput: { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, outline: "none", boxSizing: "border-box", marginBottom: 8 },
  authSubmit: { width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 6 },
  authToggle: { background: "none", border: "none", fontSize: 12, color: "#7c3aed", cursor: "pointer", textAlign: "center", width: "100%", padding: "4px 0" },
  authError: { fontSize: 12, color: "#dc2626", marginBottom: 6 },
};

function formatPrice(price) {
  if (!price || price === 0) return "Free";
  return `$${price}/mo`;
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

// ── Subscribe helper ────────────────────────────────────────────

async function subscribeToWorker(token, worker) {
  const workerId = worker.workerId || worker.slug;
  const res = await fetch(`${API_BASE}/api?path=/v1/worker:subscribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ workerId, slug: workerId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[subscribe] HTTP error:", res.status, text);
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Subscribe failed");
  window.dispatchEvent(new CustomEvent("ta:worker-subscribed", {
    detail: { workerId, name: worker.name },
  }));
  return data;
}

// ── Worker Card with inline auth ────────────────────────────────

function WorkerCard({ worker, onSelect }) {
  const [showAuth, setShowAuth] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSignIn, setIsSignIn] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function handleGetWorker(e) {
    e.stopPropagation();
    setSubmitting(true);

    // Get or create anonymous session — no auth wall
    let currentUser = auth.currentUser;
    if (!currentUser) {
      try {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      } catch {
        setSubmitting(false);
        setError("Something went wrong. Try again.");
        return;
      }
    }

    // Subscribe directly
    try {
      const token = await currentUser.getIdToken(true);
      await subscribeToWorker(token, worker);
      setSubscribed(true);
    } catch (err) {
      console.error("[handleGetWorker] subscribe failed:", err);
      setError("Subscribe failed. Try again.");
    }
    setSubmitting(false);
  }

  async function handleAuthSubmit() {
    if (!tosChecked) { setError("Please agree to the Terms of Service."); return; }
    if (!email || !password) { setError("Enter your email and password."); return; }
    setSubmitting(true);
    setError("");

    // Lock MeetAlex in place so App.jsx doesn't unmount it during auth
    window.dispatchEvent(new CustomEvent("ta:meet-alex-lock"));

    try {
      let cred;
      try {
        if (isSignIn) {
          cred = await signInWithEmailAndPassword(auth, email, password);
        } else {
          cred = await createUserWithEmailAndPassword(auth, email, password);
        }
      } catch (createErr) {
        if (createErr.code === "auth/email-already-in-use") {
          cred = await signInWithEmailAndPassword(auth, email, password);
        } else throw createErr;
      }

      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      localStorage.setItem("DISCLAIMER_ACCEPTED", "true");

      // Subscribe immediately — no redirect
      await subscribeToWorker(token, worker);
      setSubscribed(true);

      // Promote guest session
      const guestId = sessionStorage.getItem("ta_guest_sid");
      if (guestId) {
        fetch(`${API_BASE}/api?path=/v1/alex:promoteGuest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ guestId, uid: cred.user.uid }),
        }).catch(() => {});
      }

      // Save handoff data for workspace transition
      const vertical = new URLSearchParams(window.location.search).get("vertical") || "";
      sessionStorage.setItem("ta_utm", JSON.stringify({
        source: "meet-alex", medium: "guest-chat",
        campaign: vertical || "direct", capturedAt: new Date().toISOString(),
      }));
      sessionStorage.setItem("ta_guest_promoted", "true");

      // Let Alex confirmation show for 2.5s, then transition to workspace
      setTimeout(() => {
        const v = vertical ? `&vertical=${vertical}` : "";
        window.history.replaceState({}, "", `/?promoted=true${v}&utm_source=meet-alex&utm_medium=guest-chat`);
        window.dispatchEvent(new CustomEvent("ta:meet-alex-unlock"));
      }, 2500);

    } catch (err) {
      setSubmitting(false);
      window.dispatchEvent(new CustomEvent("ta:meet-alex-unlock"));
      switch (err?.code) {
        case "auth/weak-password":
          setError("Password must be at least 6 characters."); break;
        case "auth/invalid-email":
          setError("Please enter a valid email address."); break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
          setError("Incorrect password. Try again."); break;
        case "auth/too-many-requests":
          setError("Too many attempts. Wait and try again."); break;
        default:
          setError("Sign-up failed. Please try again.");
      }
    }
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
                onClick={worker.price > 0 ? (e) => { e.stopPropagation(); setShowAuth(!showAuth); } : handleGetWorker}
                disabled={submitting}
              >
                {submitting ? "..." : worker.price > 0 ? `Subscribe \u2014 $${worker.price}/mo` : "Get this worker"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error — always visible */}
      {error && !subscribed && (
        <div style={{ ...S.authError, padding: "6px 16px" }}>{error}</div>
      )}

      {/* Inline auth form — appears below the card */}
      {showAuth && !subscribed && (
        <div style={S.authWrap}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12, color: "#1e1e2e", marginBottom: 10, lineHeight: 1.5 }}>
            <input type="checkbox" checked={tosChecked} onChange={e => setTosChecked(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#7c3aed", marginTop: 2, flexShrink: 0 }} />
            I agree to the TitleApp Terms of Service and Privacy Policy. Digital Workers do not constitute professional advice.
          </label>

          {tosChecked && (
            <>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" style={S.authInput} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (6+ characters)" autoComplete={isSignIn ? "current-password" : "new-password"} onKeyDown={e => e.key === "Enter" && handleAuthSubmit()} style={S.authInput} />
              <button onClick={handleAuthSubmit} disabled={submitting} style={{ ...S.authSubmit, opacity: submitting ? 0.7 : 1, cursor: submitting ? "wait" : "pointer" }}>
                {submitting ? "Setting up..." : isSignIn ? "Sign in & get worker" : "Create account & get worker"}
              </button>
              <button onClick={() => { setIsSignIn(!isSignIn); setError(""); }} style={S.authToggle}>
                {isSignIn ? "Need an account? Sign up" : "Already have an account? Sign in instead"}
              </button>
            </>
          )}
        </div>
      )}
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

  function handleAskAlex(worker) {
    window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", { detail: { text: `Tell me about ${worker.name}` } }));
  }

  const showStats = state === "STATE-1" || state === "STATE-2";

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

          <WorkerCard worker={selectedWorker} onSelect={() => {}} />

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
          <span style={S.breadcrumbLabel}>Top 10 in {verticalLabel || "All Industries"} Today</span>
        </div>
        <div style={S.cardList}>
          {loading ? (
            <div style={S.empty}>Loading workers...</div>
          ) : workers.length === 0 ? (
            <div style={S.empty}>No workers available yet</div>
          ) : (
            workers.map((w, i) => (
              <WorkerCard key={w.workerId || i} worker={w} onSelect={showWorkerDetail} />
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
          <span style={S.breadcrumbLabel}>Top 10 in {verticalLabel} Today</span>
        </div>
      )}

      <div style={S.cardList}>
        {loading ? (
          <div style={S.empty}>Loading workers...</div>
        ) : workers.length === 0 ? (
          <div style={S.empty}>No workers available yet</div>
        ) : (
          workers.map((w, i) => (
            <WorkerCard key={w.workerId || i} worker={w} onSelect={showWorkerDetail} />
          ))
        )}
      </div>

      <button style={S.browseLink} onClick={clearVerticalFilter}>
        Browse all industries &rarr;
      </button>
    </div>
  );
}
