import React, { useEffect, useState, useCallback } from "react";
import { auth } from "../firebase";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, opts = {}) {
  let token = null;
  try {
    if (auth.currentUser) token = await auth.currentUser.getIdToken();
  } catch (_) {}
  if (!token) token = localStorage.getItem("ID_TOKEN");

  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

const BEAT_DETAILS = {
  discovery: {
    statusThread: "Most people close this tab. You're still reading.",
    what: "You discovered SOCIII. Most prospects bounce within 5 seconds — you didn't.",
    action: null,
  },
  "maybe-i-could": {
    statusThread: "You clicked into the marketplace. Most people scroll past listings.",
    what: "You looked at other creators and saw yourself in the work.",
    action: null,
  },
  commitment: {
    statusThread: "30 minutes invested in your monetization path — further than most professionals get.",
    what: "Accept the Creator Agreement. Tell us about your experience in 3 sentences. We use it to recognize what you bring.",
    action: { label: "Go to commitment", url: "/onboard/creator" },
  },
  "idea-conversation": {
    statusThread: "You just designed something. Most people who look at this page never do.",
    what: "Talk to Alex about what your Worker does. Name it. Pick a voice. Choose a logo. By the end you have a Worker with an identity — before any code exists.",
    action: { label: "Start the conversation", url: "/meet-alex?intent=create-worker" },
  },
  "mockup-preview": {
    statusThread: "This shareable URL is yours. Most people in your network can't even imagine making this.",
    what: "We render a server-side mockup of your Worker based on the Idea Conversation. Share the URL with your network — you've made something real.",
    action: null,
  },
  install: {
    statusThread: "Hardest step is behind you.",
    what: "Install Node, Git, Claude Code on your laptop. Fork the SOCIII repo. This is the technical step — open claude.ai in another tab as your screenshot helper.",
    action: { label: "Open install guide", url: "/docs/CREATOR-INSTALL.md" },
  },
  "real-preview": {
    statusThread: "Real product with your name on it.",
    what: "Your Worker is now running on YOUR fork. Open the SOCIII workspace and see it render with your sample data.",
    action: null,
  },
  validation: {
    statusThread: "Most software ships with zero assertions.",
    what: "Run npm run validate-worker. The validator checks structure. QA-001 checks behavior. Fix what fails. Then red-team your own work — add assertions that SHOULD fail.",
    action: null,
  },
  "pull-request": {
    statusThread: "Your name in open-source record.",
    what: "git push. Open a Pull Request. CI runs the validator + QA-001 + AI reviewer. Most PRs auto-merge if clean.",
    action: null,
  },
  "merge-identity": {
    statusThread: "Welcome to the SOCIII roster.",
    what: "PR merged. Your Worker is listed. Your Creator Profile page is live at sociii.ai/c/<your-handle>. Verified Expert mark applied.",
    action: null,
  },
  "forge-customer": {
    statusThread: "You just monetized your expertise. Most people with your skills never do.",
    what: "Within 72 hours of listing, Forge Reviews subscribes to your Worker. Your first earnings are real. Forge sends a private feedback review within 7 days.",
    action: null,
  },
  "network-activation": {
    statusThread: "Your network is your moat.",
    what: "Share your Worker with the people who already trust your expertise. Email primary, LinkedIn secondary. 80% of early customers come from your network.",
    action: { label: "Get share assets", url: "/creators/journey?panel=share" },
  },
  "first-payout": {
    statusThread: "Data fees grow faster than subscriptions.",
    what: "Payout lands on the 5th. Watch your TRpW — Total Revenue per Worker. Subscriptions + data fees + per-use. Worker #2 starts forming.",
    action: null,
  },
};

export default function CreatorJourney() {
  const [state, setState] = useState({ loading: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Your SOCIII Journey"; }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await apiFetch("/v1/journey:state", { method: "GET" });
      setState({ loading: false, ...r });
    } catch (e) {
      setState({ loading: false, ok: false, error: "fetch_failed" });
    }
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) refresh();
      else setState({ loading: false, ok: false, error: "not_authenticated" });
    });
    return () => unsub();
  }, [refresh]);

  async function toggleBeat(beatId, currentCompleted) {
    setBusy(true);
    try {
      await apiFetch("/v1/journey:advance", {
        method: "POST",
        body: JSON.stringify({ beatId, completed: !currentCompleted }),
      });
      await refresh();
    } finally { setBusy(false); }
  }

  if (state.loading) return <div style={S.page}><div style={S.loading}>Loading your journey…</div></div>;

  if (state.error === "not_authenticated") {
    return (
      <div style={S.page}>
        <Header />
        <div style={S.notSignedIn}>
          <h1 style={S.notFoundH1}>Sign in to see your journey</h1>
          <p style={S.notFoundSub}>The Creator Journey is your private surface — sign in to continue.</p>
          <a href="/login" style={S.btnPrimary}>Sign in</a>
        </div>
      </div>
    );
  }

  if (!state.ok) return <div style={S.page}><div style={S.loading}>Something went wrong. Refresh to try again.</div></div>;

  const { beats = [], completedCount = 0, totalBeats = 13, currentBeat } = state.state || {};
  const progressPct = Math.round((completedCount / totalBeats) * 100);

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <section style={S.heroSection}>
          <h1 style={S.h1}>Your SOCIII Journey</h1>
          <p style={S.heroSub}>
            13 beats from "I have expertise" to "I have a paying, publicly-recognized business built on it." This is your private progress board. The platform meets you where you are; you mark what's done.
          </p>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${progressPct}%` }} />
          </div>
          <div style={S.progressLabel}>
            <span>{completedCount} of {totalBeats} complete</span>
            <span style={S.progressPct}>{progressPct}%</span>
          </div>
        </section>

        <section style={S.helpersSection}>
          <div style={S.helperCard}>
            <div style={S.helperIcon}>💬</div>
            <div>
              <div style={S.helperTitle}>Claude Chat</div>
              <div style={S.helperBody}>
                Open <a href="https://claude.ai" target="_blank" rel="noreferrer" style={S.inlineLink}>claude.ai</a> in another tab. Screenshot anything confusing. Paste it there. You'll get answers in seconds.
              </div>
              <div style={S.helperHint}>
                Mac: Cmd+Shift+4 · Windows: Win+Shift+S
              </div>
            </div>
          </div>
          <div style={S.helperCard}>
            <div style={S.helperIcon}>⌨️</div>
            <div>
              <div style={S.helperTitle}>Claude Code</div>
              <div style={S.helperBody}>
                Once installed, your AI pair programmer for actual Worker authoring. Run <code>claude</code> in your terminal from the SOCIII repo.
              </div>
            </div>
          </div>
        </section>

        <section style={S.beatsSection}>
          {beats.map((b) => {
            const details = BEAT_DETAILS[b.id] || {};
            const isActive = b.status === "active";
            const isLocked = b.status === "locked";
            return (
              <article
                key={b.id}
                style={{
                  ...S.beatCard,
                  ...(b.completed ? S.beatCompleted : {}),
                  ...(isActive ? S.beatActive : {}),
                  ...(isLocked ? S.beatLocked : {}),
                }}
              >
                <div style={S.beatHeader}>
                  <button
                    type="button"
                    disabled={isLocked || busy}
                    onClick={() => toggleBeat(b.id, b.completed)}
                    style={{
                      ...S.checkbox,
                      ...(b.completed ? S.checkboxChecked : {}),
                      ...(isLocked ? S.checkboxLocked : {}),
                    }}
                    aria-label={`Mark beat ${b.n} ${b.completed ? "incomplete" : "complete"}`}
                  >
                    {b.completed && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <div style={S.beatNum}>Beat {b.n}</div>
                  <div style={S.beatTitle}>{b.title}</div>
                  {isActive && <div style={S.activeChip}>Active</div>}
                </div>
                {details.statusThread && (
                  <div style={S.statusThread}>{details.statusThread}</div>
                )}
                {details.what && (
                  <p style={S.beatWhat}>{details.what}</p>
                )}
                {details.action && !b.completed && !isLocked && (
                  <a href={details.action.url} style={S.beatAction}>{details.action.label} →</a>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header style={S.header}>
      <a href="/" style={S.logoLink}>
        <img src={sociiiMarkUrl} alt="" width={28} height={28} />
        <span style={S.logoText}>SOCIII</span>
      </a>
      <div style={S.headerRight}>
        <a href="/marketplace" style={S.headerLink}>Marketplace</a>
        <a href="/c/me" style={S.headerLink}>My Profile</a>
      </div>
    </header>
  );
}

const S = {
  page: {
    minHeight: "100vh", background: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#0f172a",
  },
  loading: { padding: 80, textAlign: "center", color: "#6b7280" },

  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 32px", borderBottom: "1px solid #e2e8f0", background: "#fff",
  },
  logoLink: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" },
  logoText: { fontSize: 20, fontWeight: 700 },
  headerRight: { display: "flex", gap: 24 },
  headerLink: { fontSize: 14, color: "#475569", textDecoration: "none" },

  notSignedIn: { maxWidth: 480, margin: "100px auto", textAlign: "center", padding: 24 },
  notFoundH1: { fontSize: 28, fontWeight: 700, marginBottom: 12 },
  notFoundSub: { fontSize: 16, color: "#6b7280", marginBottom: 24 },
  btnPrimary: {
    display: "inline-block", background: "#7c3aed", color: "#fff",
    padding: "10px 24px", borderRadius: 8, fontWeight: 600,
    textDecoration: "none", fontSize: 14,
  },

  main: { maxWidth: 880, margin: "0 auto", padding: "40px 32px" },

  heroSection: { marginBottom: 32 },
  h1: { fontSize: 36, fontWeight: 800, letterSpacing: "-1px", marginBottom: 12 },
  heroSub: { fontSize: 16, color: "#475569", lineHeight: 1.6, marginBottom: 24 },
  progressBar: {
    height: 8, background: "#e2e8f0", borderRadius: 999,
    overflow: "hidden", marginBottom: 8,
  },
  progressFill: {
    height: "100%", background: "linear-gradient(90deg, #7c3aed, #a855f7)",
    borderRadius: 999, transition: "width 0.4s ease",
  },
  progressLabel: {
    display: "flex", justifyContent: "space-between",
    fontSize: 13, color: "#64748b",
  },
  progressPct: { fontWeight: 700, color: "#7c3aed" },

  helpersSection: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
    marginBottom: 32,
  },
  helperCard: {
    display: "flex", gap: 16, padding: 20,
    background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0",
  },
  helperIcon: { fontSize: 32, lineHeight: 1 },
  helperTitle: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  helperBody: { fontSize: 13, color: "#475569", lineHeight: 1.5 },
  helperHint: { fontSize: 11, color: "#94a3b8", marginTop: 6, fontFamily: "monospace" },
  inlineLink: { color: "#7c3aed", textDecoration: "underline" },

  beatsSection: { display: "flex", flexDirection: "column", gap: 12 },
  beatCard: {
    background: "#fff", borderRadius: 12, padding: 24,
    border: "1.5px solid #e2e8f0", transition: "border-color 0.15s",
  },
  beatCompleted: { background: "#f8fafc", opacity: 0.85 },
  beatActive: { borderColor: "#7c3aed", boxShadow: "0 0 0 3px #7c3aed20" },
  beatLocked: { opacity: 0.5 },

  beatHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    border: "2px solid #cbd5e1", background: "#fff",
    cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { background: "#16a34a", borderColor: "#16a34a" },
  checkboxLocked: { cursor: "not-allowed", background: "#f1f5f9" },

  beatNum: {
    fontSize: 11, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.1em",
  },
  beatTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a", flex: 1 },
  activeChip: {
    fontSize: 11, fontWeight: 700, color: "#fff",
    background: "#7c3aed", padding: "3px 10px",
    borderRadius: 999, letterSpacing: "0.05em",
  },

  statusThread: {
    fontSize: 14, fontWeight: 600, color: "#7c3aed",
    marginBottom: 8, marginLeft: 36, fontStyle: "italic",
  },
  beatWhat: {
    fontSize: 14, color: "#475569", lineHeight: 1.6,
    marginLeft: 36, marginBottom: 12,
  },
  beatAction: {
    display: "inline-block", marginLeft: 36,
    color: "#7c3aed", fontSize: 14, fontWeight: 600,
    textDecoration: "none",
  },
};
