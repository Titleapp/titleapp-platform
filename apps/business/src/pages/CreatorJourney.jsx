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

const STEPS = [
  {
    id: "discover",
    n: 1,
    title: "Discover SOCIII",
    what: "SOCIII is a marketplace for Digital Workers built by domain experts. You bring the expertise — the platform handles billing, hosting, marketplace listing, and the legal scaffolding. Creators earn 75% of net revenue on their workers. Two ways to get oriented: <strong>open the whitepaper</strong> (the architectural deep-dive) or <strong>ask Alex in the chat to your left</strong> — Alex can explain SOCIII in your own domain's terms.",
    actions: [
      { label: "Read the whitepaper", url: "/whitepaper", external: false },
      { label: "Ask Alex what SOCIII is", url: "/meet-alex?intent=what-is-sociii" },
    ],
  },
  {
    id: "sign-up",
    n: 2,
    title: "Sign up",
    what: "Accept the Creator Agreement and tell us about yourself in three sentences — your title, your years of experience, your biggest win. We use that to recognize what you bring.",
    action: { label: "Start sign-up", url: "/meet-alex?intent=creator-signup" },
  },
  {
    id: "design",
    n: 3,
    title: "Design your worker with Alex",
    what: "Talk to Alex about what your Worker does, who uses it, and what success looks like. Pick a name, a voice, and a generated logo. By the end you have a Worker with an identity — before any code exists.",
    action: { label: "Talk to Alex", url: "/meet-alex?intent=create-worker" },
  },
  {
    id: "preview",
    n: 4,
    title: "Get a shareable preview",
    what: "We render a server-side mockup of your Worker based on what you and Alex designed. You'll get a URL you can text or email to colleagues — show your network what you're building before you've written a line of code.",
  },
  {
    id: "tools",
    n: 5,
    title: "Set up your tools",
    what: "This is the technical step. You install three things: an Anthropic Claude account (one sign-up gets you both the browser chat and the terminal tool), Claude Code (the terminal tool itself), and a GitHub account (free — used to publish your worker). The 'Tools' panel at the top of this page has the install links — work through them in order. If you get stuck, paste a screenshot into Claude Chat (browser) and it will walk you through.",
  },
  {
    id: "build",
    n: 6,
    title: "Build your worker in Claude Code",
    what: "Open your terminal in the SOCIII repo. Type 'claude'. Tell it what you want to build — Claude Code does the file editing while you focus on the domain. Your intent, rules, sample data, and assertions all get authored conversationally.",
  },
  {
    id: "validate",
    n: 7,
    title: "Validate it works",
    what: "Run the validator. It checks that your worker has all required pieces and that your assertions pass. Anything that fails comes back with a plain-language explanation and a button to ask Claude Code to fix it. Then red-team your own work — add assertions that should fail, see if they do.",
  },
  {
    id: "ship",
    n: 8,
    title: "Ship it",
    what: "Push your code. Open a pull request. CI runs the validator plus an AI reviewer. Most PRs merge automatically. Your worker is then listed on the SOCIII Marketplace at sociii.ai with your name on it — and your public Creator Profile goes live at sociii.ai/c/&lt;your-handle&gt;.",
  },
  {
    id: "first-customer",
    n: 9,
    title: "Your first customer",
    what: "Forge Reviews — an independent reviewer funded by SOCIII — subscribes to your Worker shortly after it lists. You get your first paying customer and a structured private review. If they flag issues, you have a window to fix things before the review publishes.",
  },
  {
    id: "earn",
    n: 10,
    title: "Earn",
    what: "Share your Worker with your professional network. Email primary, LinkedIn secondary. Most early Workers get their first 50 customers from the creator's own network — that's why your expertise matters. Payouts land on the 5th of each month.",
  },
];

export default function CreatorJourney({ embedded = false }) {
  const [state, setState] = useState({ loading: true, completedIds: new Set() });
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Your SOCIII Creator Steps"; }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await apiFetch("/v1/journey:state", { method: "GET" });
      if (r.ok && r.state?.beats) {
        // Map old "beat" state to new "step" state by id
        const completed = new Set(r.state.beats.filter(b => b.completed).map(b => b.id));
        // Map old ids to new ones where they changed
        if (completed.has("discovery")) completed.add("discover");
        if (completed.has("maybe-i-could")) completed.add("discover");
        if (completed.has("commitment")) completed.add("sign-up");
        if (completed.has("idea-conversation")) completed.add("design");
        if (completed.has("mockup-preview")) completed.add("preview");
        if (completed.has("install")) completed.add("tools");
        if (completed.has("real-preview")) completed.add("build");
        if (completed.has("validation")) completed.add("validate");
        if (completed.has("pull-request") || completed.has("merge-identity")) completed.add("ship");
        if (completed.has("forge-customer")) completed.add("first-customer");
        if (completed.has("network-activation") || completed.has("first-payout")) completed.add("earn");
        setState({ loading: false, ok: true, completedIds: completed });
      } else {
        setState({ loading: false, ok: !!r.ok, completedIds: new Set(), error: r.error });
      }
    } catch (e) {
      setState({ loading: false, ok: false, completedIds: new Set(), error: "fetch_failed" });
    }
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) refresh();
      else setState({ loading: false, ok: false, completedIds: new Set(), error: "not_authenticated" });
    });
    return () => unsub();
  }, [refresh]);

  // S52.28g — Friction #4 skip-ahead. The user is signed in (by definition
  // they're past Discover + Sign-up), so auto-mark Steps 1 + 2 complete the
  // first time they land here. localStorage marker so we don't re-mark if
  // they explicitly untick later. From the RES-DATA-001 dogfood log.
  useEffect(() => {
    if (!state.ok || state.loading) return;
    if (localStorage.getItem("ta_journey_autocomplete_signin") === "true") return;
    const toAdvance = [];
    if (!state.completedIds.has("discover")) toAdvance.push("discovery");
    if (!state.completedIds.has("sign-up")) toAdvance.push("commitment");
    if (toAdvance.length === 0) {
      localStorage.setItem("ta_journey_autocomplete_signin", "true");
      return;
    }
    (async () => {
      for (const beatId of toAdvance) {
        await apiFetch("/v1/journey:advance", {
          method: "POST",
          body: JSON.stringify({ beatId, completed: true }),
        }).catch(() => {});
      }
      localStorage.setItem("ta_journey_autocomplete_signin", "true");
      refresh();
    })();
  }, [state.ok, state.loading, state.completedIds, refresh]);

  // S52.28g — Friction #4 "I already have my tools" bulk skip. One click
  // marks the Tools step (Step 5) complete for creators with Claude +
  // Claude Code + GitHub already set up.
  async function markToolsComplete() {
    setBusy(true);
    try {
      await apiFetch("/v1/journey:advance", {
        method: "POST",
        body: JSON.stringify({ beatId: "install", completed: true }),
      });
      await refresh();
    } finally { setBusy(false); }
  }

  async function toggleStep(stepId) {
    setBusy(true);
    try {
      const isCompleted = state.completedIds.has(stepId);
      // Map new step ids back to old beat ids for the API
      const stepToBeatMap = {
        "discover": "discovery",
        "sign-up": "commitment",
        "design": "idea-conversation",
        "preview": "mockup-preview",
        "tools": "install",
        "build": "real-preview",
        "validate": "validation",
        "ship": "pull-request",
        "first-customer": "forge-customer",
        "earn": "network-activation",
      };
      const beatId = stepToBeatMap[stepId] || stepId;
      await apiFetch("/v1/journey:advance", {
        method: "POST",
        body: JSON.stringify({ beatId, completed: !isCompleted }),
      });
      await refresh();
    } finally { setBusy(false); }
  }

  if (state.loading) return <div style={S.page}><div style={S.loading}>Loading your steps…</div></div>;

  if (state.error === "not_authenticated") {
    return (
      <div style={S.page}>
        <Header />
        <div style={S.notSignedIn}>
          <h1 style={S.notFoundH1}>Sign in to see your creator steps</h1>
          <p style={S.notFoundSub}>This is your private progress board — sign in to continue.</p>
          <a href="/login" style={S.btnPrimary}>Sign in</a>
        </div>
      </div>
    );
  }

  const completedCount = STEPS.filter(s => state.completedIds.has(s.id)).length;
  const totalSteps = STEPS.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const activeIdx = STEPS.findIndex(s => !state.completedIds.has(s.id));

  // S52.2 — when embedded inside AppShell (three-panel layout), drop the
  // page chrome (Header + full-bleed background) so the journey renders
  // cleanly inside the canvas slot alongside sidebar + Alex chat.
  const pageStyle = embedded ? { ...S.page, minHeight: 0, background: "transparent" } : S.page;

  return (
    <div style={pageStyle}>
      {!embedded && <Header />}
      <main style={S.main}>
        <section style={S.heroSection}>
          <h1 style={S.h1}>Your SOCIII Creator Steps</h1>
          <p style={S.heroSub}>
            From "I have expertise" to "I have a publicly-recognized business built on it." Ten steps. You mark what's done as you go.
          </p>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${progressPct}%` }} />
          </div>
          <div style={S.progressLabel}>
            <span>{completedCount} of {totalSteps} complete</span>
            <span style={S.progressPct}>{progressPct}%</span>
          </div>
        </section>

        <section style={S.toolsSection}>
          <h2 style={S.h2}>The tools you'll need</h2>
          <p style={S.toolsIntro}>
            Three accounts, all free to start. Most creators set them up in one focused sitting. The links below take you to the official sign-up pages.
          </p>
          <div style={S.toolsGrid}>
            <ToolCard
              icon="1"
              title="Anthropic Claude account"
              body="One sign-up gets you both Claude Chat (in your browser, for asking questions and pasting screenshots) and access to Claude Code (the terminal tool you'll install next). Free tier is enough to start — many creators upgrade as they go."
              link={{ label: "Sign up at claude.ai", url: "https://claude.ai", external: true }}
            />
            <ToolCard
              icon="2"
              title="Claude Code (terminal tool)"
              body="An AI pair programmer that runs in your terminal — this is where you'll actually build your Worker. You sign in with the Claude account from step 1. Install instructions assume no prior coding experience."
              link={{ label: "Install Claude Code", url: "https://docs.claude.com/en/docs/claude-code/setup", external: true }}
            />
            <ToolCard
              icon="3"
              title="GitHub account"
              body="GitHub is where the world stores code. Your Worker lives there too — that's how it gets published to the SOCIII Marketplace. The account is free; you'll never write code directly on GitHub (Claude Code handles that). Use any email."
              link={{ label: "Sign up at github.com", url: "https://github.com/signup", external: true }}
            />
          </div>
          <p style={S.toolsHint}>
            New to the terminal? On Mac it's called "Terminal" — find it via Spotlight (Cmd+Space). On Windows, use "Windows Terminal" from the Microsoft Store. No prior coding required; you'll mostly be talking to Claude Code.
          </p>
          {!state.completedIds.has("tools") && (
            <button
              type="button"
              disabled={busy}
              onClick={markToolsComplete}
              style={S.skipToolsBtn}
            >
              I already have these — skip to Step 6 →
            </button>
          )}
        </section>

        <section style={S.stepsSection}>
          {STEPS.map((s, idx) => {
            const isCompleted = state.completedIds.has(s.id);
            const isActive = !isCompleted && idx === activeIdx;
            return (
              <article
                key={s.id}
                style={{
                  ...S.stepCard,
                  ...(isCompleted ? S.stepCompleted : {}),
                  ...(isActive ? S.stepActive : {}),
                }}
              >
                <div style={S.stepHeader}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleStep(s.id)}
                    style={{
                      ...S.checkbox,
                      ...(isCompleted ? S.checkboxChecked : {}),
                    }}
                    aria-label={`Mark step ${s.n} ${isCompleted ? "incomplete" : "complete"}`}
                  >
                    {isCompleted && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <div style={S.stepNum}>Step {s.n}</div>
                  <div style={S.stepTitle}>{s.title}</div>
                  {isActive && <div style={S.activeChip}>Up next</div>}
                </div>
                <p style={S.stepWhat} dangerouslySetInnerHTML={{ __html: s.what }} />
                {!isCompleted && Array.isArray(s.actions) && s.actions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 4 }}>
                    {s.actions.map((a, i) => (
                      <a key={i} href={a.url} style={S.stepAction}>{a.label} →</a>
                    ))}
                  </div>
                )}
                {!isCompleted && !s.actions && s.action && (
                  <a href={s.action.url} style={S.stepAction}>{s.action.label} →</a>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function ToolCard({ icon, title, body, link }) {
  return (
    <div style={tS.card}>
      <div style={tS.iconCircle}>{icon}</div>
      <div style={tS.cardBody}>
        <div style={tS.cardTitle}>{title}</div>
        <div style={tS.cardText}>{body}</div>
        {link && (
          <a
            href={link.url}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noreferrer" : undefined}
            style={tS.cardLink}
          >
            {link.label} →
          </a>
        )}
      </div>
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
      </div>
    </header>
  );
}

const tS = {
  card: {
    display: "flex", gap: 14, padding: 18,
    background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0",
  },
  iconCircle: {
    flexShrink: 0,
    width: 36, height: 36, borderRadius: "50%",
    background: "#7c3aed", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6 },
  cardText: { fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 10 },
  cardLink: { fontSize: 13, color: "#7c3aed", fontWeight: 600, textDecoration: "none" },
};

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

  heroSection: { marginBottom: 36 },
  h1: { fontSize: 36, fontWeight: 800, letterSpacing: "-1px", marginBottom: 12 },
  heroSub: { fontSize: 16, color: "#475569", lineHeight: 1.55, marginBottom: 24 },
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

  toolsSection: {
    marginBottom: 40, padding: "24px 28px",
    background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0",
  },
  h2: { fontSize: 20, fontWeight: 700, marginBottom: 8 },
  toolsIntro: { fontSize: 14, color: "#475569", lineHeight: 1.5, marginBottom: 18 },
  toolsGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 14 },
  toolsHint: {
    fontSize: 12, color: "#64748b", lineHeight: 1.5,
    padding: 12, background: "#f1f5f9", borderRadius: 8, marginTop: 6,
  },

  skipToolsBtn: {
    display: "block", marginTop: 12, padding: "10px 16px",
    fontSize: 13, fontWeight: 600, color: "#7c3aed",
    background: "transparent", border: "1.5px dashed #c4b5fd",
    borderRadius: 8, cursor: "pointer", width: "100%",
    fontFamily: "inherit",
  },

  stepsSection: { display: "flex", flexDirection: "column", gap: 12 },
  stepCard: {
    background: "#fff", borderRadius: 12, padding: 22,
    border: "1.5px solid #e2e8f0",
  },
  stepCompleted: { background: "#f8fafc", opacity: 0.75 },
  stepActive: { borderColor: "#7c3aed", boxShadow: "0 0 0 3px #7c3aed1a" },

  stepHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  checkbox: {
    width: 26, height: 26, borderRadius: 6,
    border: "2px solid #cbd5e1", background: "#fff",
    cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { background: "#16a34a", borderColor: "#16a34a" },

  stepNum: {
    fontSize: 11, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.1em",
  },
  stepTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a", flex: 1 },
  activeChip: {
    fontSize: 11, fontWeight: 700, color: "#fff",
    background: "#7c3aed", padding: "3px 10px",
    borderRadius: 999, letterSpacing: "0.05em",
  },

  stepWhat: {
    fontSize: 14, color: "#334155", lineHeight: 1.6,
    marginLeft: 38, marginBottom: 12,
  },
  stepAction: {
    display: "inline-block", marginLeft: 38,
    color: "#7c3aed", fontSize: 14, fontWeight: 600,
    textDecoration: "none",
  },
};
