import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../../firebase";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword } from "firebase/auth";
import { WORKER_ROUTES } from "../../data/workerRoutes";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// ── Campaign Configs (TASK 2-6) ───────────────────────────────────

const CAMPAIGNS = {
  "auto-dealer": {
    persona: "dealer",
    variants: {
      A: {
        headline: "Your best salesperson. On every floor. Every shift.",
        subhead: "TitleApp clones your top performer across every department — service, sales, F&I, compliance. Free to start. You only pay when we lift your revenue.",
      },
      B: {
        headline: "Free to start. You only pay when we grow your revenue.",
        subhead: "TitleApp puts a Digital Worker in every department — service drive to F&I close. No monthly fee until it performs. Zero risk to find out if it works.",
      },
    },
    primaryCta: "Start Free — No Credit Card",
    secondaryCta: "See how dealers use it",
    secondaryLink: "/workers/auto",
    valueProps: [
      { icon: "dollar", title: "Performance-based pricing", desc: "Free entry point, you only pay when TitleApp lifts your numbers." },
      { icon: "arrows", title: "Service to sales", desc: "Follow every customer from first visit through trade-in and upgrade." },
      { icon: "grid", title: "Every department covered", desc: "Licensing, compliance, F&I, floor training, all connected." },
    ],
    socialProof: "Dealers using TitleApp see measurable lift within the first 30 days.",
    featuredSlugs: ["dealer-licensing-compliance", "service-scheduling-workflow", "fi-compliance", "lead-management-bdc"],
  },
  "aviation": {
    persona: "pilot",
    variants: {
      A: {
        headline: "The AI that actually knows the FARs.",
        subhead: "Every other AI guesses. TitleApp Aviation is built on the actual rules — Part 135, Part 91, ICAO, type-specific procedures. Your CoPilot doesn't improvise.",
      },
      B: {
        headline: "Built for pilots who can't afford a wrong answer.",
        subhead: "TitleApp Aviation gives you a Digital CoPilot for your aircraft type, your training records, and your career. Every answer sourced. Every rule enforced. Nothing made up.",
      },
    },
    primaryCta: "Meet Your CoPilot",
    secondaryCta: "Browse aviation workers",
    secondaryLink: "/workers/aviation",
    valueProps: [
      { icon: "shield", title: "Rules-first AI — Direct Mode, sourced from your actual documents", desc: "Every response is grounded in actual FARs, ACs, and type-specific procedures. Your CoPilot cites the source. No hallucinations." },
      { icon: "folder", title: "Your documents, version controlled, connected to your CoPilot", desc: "SOPs, manuals, training records — Document Control tracks revisions and acknowledgments. Your CoPilot always cites the current approved version." },
      { icon: "plane", title: "Type-specific CoPilots", desc: "PC12, King Air, C90, Caravan, and more. Your aircraft, your procedures, your operator baselines." },
    ],
    socialProof: "Pilots use TitleApp to stay current, stay legal, and prep for checkrides with confidence.",
    featuredSlugs: ["digital-aircraft-log", "pilot-training-records-worker", "pre-flight-risk-analysis", "copilot-pc12-ng"],
  },
  "real-estate-developer": {
    persona: "developer",
    variants: {
      A: {
        headline: "One missed permit costs more than a year of TitleApp.",
        subhead: "Real estate developers: TitleApp enforces every compliance rule on every project — permits, draws, inspections, title, escrow. The mistakes that cost $10K\u2013$100K don't happen when your AI knows the rules.",
      },
      B: {
        headline: "Your entire project team. For less than a single hire.",
        subhead: "Construction manager, permit tracker, title and escrow specialist, compliance officer — TitleApp puts a full A-team on every deal. Massive cost savings. Zero errors on the rules.",
      },
    },
    primaryCta: "Walk Through a Deal",
    secondaryCta: "See the developer suite",
    secondaryLink: "/workers/real-estate",
    valueProps: [
      { icon: "check", title: "Compliance enforced, not suggested", desc: "Every permit deadline, draw schedule, and inspection requirement tracked and flagged." },
      { icon: "folder", title: "Every plan revision, every permit acknowledgment, tracked", desc: "Document Control handles version control, distribution, and acknowledgment tracking across your entire project team." },
      { icon: "scale", title: "Scale without headcount", desc: "Manage 10 projects with the same overhead as 1." },
    ],
    socialProof: "Developers using TitleApp report fewer missed deadlines and faster draw approvals.",
    featuredSlugs: ["construction-manager", "permit-tracker", "cre-deal-analyst", "the-escrow-locker"],
  },
  "real-estate-operations": {
    persona: "property-manager",
    variants: {
      A: {
        headline: "Clone your best property manager 500 times.",
        subhead: "Your top manager knows every tenant, every maintenance issue, every lease clause. TitleApp puts that expertise to work across your entire portfolio — simultaneously. Higher revenue, lower overhead, no extra headcount.",
      },
      B: {
        headline: "Scale your portfolio without scaling your payroll.",
        subhead: "TitleApp gives property managers and leasing teams a Digital Worker for every function — tenant comms, maintenance coordination, lease compliance, and revenue optimization. One platform, every property.",
      },
    },
    primaryCta: "See It In Action",
    secondaryCta: "Browse property management workers",
    secondaryLink: "/workers/real-estate",
    valueProps: [
      { icon: "users", title: "Your best manager, everywhere at once", desc: "Consistent tenant experience across every unit, every building." },
      { icon: "trending", title: "Revenue optimization built in", desc: "Lease renewal timing, market rate alerts, vacancy reduction workflows." },
      { icon: "wrench", title: "Maintenance that actually closes", desc: "Work order tracking, vendor coordination, resident follow-up, all handled." },
    ],
    socialProof: "Property managers using TitleApp handle more units with less overhead.",
    featuredSlugs: ["property-management", "rent-roll-revenue", "tenant-screening", "maintenance-work-order"],
  },
  "creators": {
    persona: "creator",
    variants: {
      A: {
        headline: "Your expertise plus the rules. Packaged and on call forever.",
        subhead: "You know your field better than anyone. TitleApp adds the compliance layer — the rules, the procedures, the edge cases — and packages it into a Digital Worker your audience can subscribe to. You earn 75% of every subscription, every month.",
      },
      B: {
        headline: "Your followers can hire you. Forever.",
        subhead: "Stop giving away your expertise for free. Build a Digital Worker in under 10 minutes — no code, no app store, no platform taking 30%. Your knowledge, your rules, your price. TitleApp handles the rest.",
      },
    },
    primaryCta: "Build Your First Worker",
    secondaryCta: "See how creators earn",
    secondaryLink: "/sandbox",
    valueProps: [
      { icon: "brain", title: "Your expertise + the rules = a worker that never gets it wrong", desc: "Not just what you know, but how it's supposed to be done." },
      { icon: "dollar", title: "75% revenue share, every month", desc: "Set your price, publish your worker, earn recurring income." },
      { icon: "paste", title: "Already mapped it out elsewhere?", desc: "Paste from ChatGPT, Claude, or Gemini and skip the questions." },
    ],
    socialProof: "Creators on TitleApp are earning recurring revenue from expertise they used to give away.",
    featuredSlugs: [],
  },
};

// ── Icon SVGs ──────────────────────────────────────────────────────

const ICONS = {
  dollar: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  arrows: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  grid: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  shield: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  folder: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  plane: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-2 2 4-1 4-1 2-2 3.5 7.3c.2.4.7.6 1.1.3l.5-.3c.4-.2.5-.7.4-1.1z"/></svg>,
  check: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  team: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  scale: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  trending: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  wrench: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  brain: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 5 6.5V22h4v-6.5c3-1 5-3.5 5-6.5a7 7 0 0 0-7-7z"/></svg>,
  paste: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
};

// ── Helpers ────────────────────────────────────────────────────────

function getSessionId() {
  let sid = sessionStorage.getItem("ta_ab_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("ta_ab_sid", sid);
  }
  return sid;
}

function getUtmParams() {
  try {
    return JSON.parse(sessionStorage.getItem("ta_utm") || "{}");
  } catch { return {}; }
}

function formatPrice(cents) {
  if (!cents) return "Free";
  return "$" + (cents / 100) + "/mo";
}

// ── Styles ─────────────────────────────────────────────────────────

const S = {
  page: { minHeight: "100vh", background: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff", position: "sticky", top: 0, zIndex: 10 },
  logo: { fontSize: 18, fontWeight: 700, color: "#7c3aed", textDecoration: "none" },
  navLinks: { display: "flex", gap: 16, alignItems: "center" },
  navLink: { fontSize: 14, color: "#6b7280", textDecoration: "none" },
  navCta: { fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", padding: "8px 20px", borderRadius: 8, textDecoration: "none", border: "none", cursor: "pointer" },
  hero: { maxWidth: 720, margin: "0 auto", padding: "80px 24px 64px", textAlign: "center" },
  h1: { fontSize: 40, fontWeight: 700, color: "#111827", lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.02em" },
  subhead: { fontSize: 18, color: "#4b5563", lineHeight: 1.6, marginBottom: 40 },
  ctaRow: { display: "flex", gap: 16, justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  primaryBtn: { fontSize: 16, fontWeight: 600, color: "#fff", background: "#7c3aed", padding: "14px 32px", borderRadius: 10, border: "none", cursor: "pointer", textDecoration: "none" },
  secondaryLink: { fontSize: 14, color: "#7c3aed", textDecoration: "none", fontWeight: 500 },
  featuredStrip: { maxWidth: 960, margin: "0 auto", padding: "0 24px 64px", overflowX: "auto", display: "flex", gap: 16 },
  workerCard: { minWidth: 220, flex: "1 0 220px", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fafbfc", textDecoration: "none", color: "inherit" },
  workerName: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 6 },
  workerDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 12 },
  workerPrice: { fontSize: 14, fontWeight: 600, color: "#7c3aed" },
  valueSection: { maxWidth: 880, margin: "0 auto", padding: "64px 24px", display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" },
  valueProp: { flex: "1 1 250px", maxWidth: 280, textAlign: "center" },
  valueIcon: { width: 48, height: 48, borderRadius: 12, background: "#f3f0ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#7c3aed" },
  valueTitle: { fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 },
  valueDesc: { fontSize: 14, color: "#6b7280", lineHeight: 1.5 },
  socialProof: { textAlign: "center", padding: "32px 24px", fontSize: 15, color: "#94a3b8", fontStyle: "italic" },
  ctaBlock: { textAlign: "center", padding: "64px 24px 120px" },
  footer: { textAlign: "center", padding: "24px 24px 100px", borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#94a3b8" },
  chatBar: { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid #e5e7eb", padding: "12px 16px" },
  chatInner: { maxWidth: 640, margin: "0 auto", display: "flex", gap: 8, alignItems: "center" },
  chatInput: { flex: 1, padding: "12px 16px", fontSize: 15, background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: 24, outline: "none" },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, background: "#7c3aed", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  otpWrap: { maxWidth: 420, margin: "0 auto", textAlign: "center" },
  otpLabel: { fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 8 },
  otpRow: { display: "flex", gap: 8, alignItems: "center", justifyContent: "center" },
  otpInput: { flex: 1, maxWidth: 260, padding: "12px 16px", fontSize: 15, border: "1px solid #e5e7eb", borderRadius: 10, outline: "none", textAlign: "center" },
  otpBtn: { padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" },
  otpStatus: { fontSize: 13, marginTop: 6 },
};

// ── CampaignPage Component ─────────────────────────────────────────

export default function CampaignPage({ slug }) {
  const config = CAMPAIGNS[slug];
  const [variant, setVariant] = useState(null);
  const logged = useRef(false);

  // Floating chat bar state
  const [chatInput, setChatInput] = useState("");
  const [chatMode, setChatMode] = useState("idle"); // idle | auth
  const chatInputRef = useRef(null);
  const [chatEmail, setChatEmail] = useState("");
  const [chatPassword, setChatPassword] = useState("");
  const [chatAuthError, setChatAuthError] = useState("");

  // Handle Google redirect result
  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        result.user.getIdToken(true).then((token) => {
          localStorage.setItem("ID_TOKEN", token);
          const sessionId = getSessionId();
          updateDoc(doc(db, "abTests", slug, "sessions", sessionId), { converted: true }).catch(() => {});
          window.location.href = "/?utm_source=campaign&utm_campaign=" + slug;
        });
      }
    }).catch((err) => {
      console.error("Google redirect result failed:", err);
      setChatMode("idle");
    });
  }, []);

  useEffect(() => {
    if (!config) return;
    // Assign A/B variant (consistent per session)
    let v = sessionStorage.getItem("ta_ab_variant_" + slug);
    if (!v) {
      v = Math.random() < 0.5 ? "A" : "B";
      sessionStorage.setItem("ta_ab_variant_" + slug, v);
    }
    setVariant(v);

    // Log session to Firestore
    if (!logged.current) {
      logged.current = true;
      const sessionId = getSessionId();
      const utm = getUtmParams();
      setDoc(doc(db, "abTests", slug, "sessions", sessionId), {
        variant: v,
        slug,
        utmSource: utm.source || "",
        utmCampaign: utm.campaign || "",
        timestamp: serverTimestamp(),
        converted: false,
      }).catch(() => {});
    }

    // Store campaign slug for sandbox pre-load
    sessionStorage.setItem("ta_campaign_slug", slug);
  }, [slug, config]);

  if (!config || !variant) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#7c3aed", marginBottom: 16 }}>TitleApp</div>
          <div style={{ fontSize: 16, color: "#6b7280" }}>{config ? "Loading..." : "Campaign not found."}</div>
          {!config && <a href="/" style={{ color: "#7c3aed", fontSize: 14, marginTop: 12, display: "inline-block" }}>Go home</a>}
        </div>
      </div>
    );
  }

  const content = config.variants[variant];
  const featured = config.featuredSlugs
    .map((s) => WORKER_ROUTES.find((w) => w.slug === s))
    .filter(Boolean);

  function handleChatSubmit(e) {
    e?.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    // Store message for post-auth handoff
    sessionStorage.setItem("ta_landing_chat", msg);
    sessionStorage.setItem("ta_campaign_context", JSON.stringify({
      slug, persona: config?.persona, variant,
    }));
    sessionStorage.setItem("ta_utm", JSON.stringify({
      source: "campaign", medium: "chat", campaign: slug,
      capturedAt: new Date().toISOString(),
    }));
    setChatInput("");
    setChatMode("auth");
  }

  async function handleChatEmailAuth() {
    if (!chatEmail || !chatPassword) { setChatAuthError("Please enter your email and password."); return; }
    setChatAuthError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, chatEmail, chatPassword);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      const sessionId = getSessionId();
      updateDoc(doc(db, "abTests", slug, "sessions", sessionId), { converted: true }).catch(() => {});
      window.location.href = "/?utm_source=campaign&utm_campaign=" + slug;
    } catch (err) {
      switch (err?.code) {
        case "auth/user-not-found":
          setChatAuthError("No account found. Try Google sign-in."); break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
          setChatAuthError("Incorrect password."); break;
        case "auth/too-many-requests":
          setChatAuthError("Too many attempts. Please wait."); break;
        default:
          setChatAuthError("Sign-in failed. Try again.");
      }
    }
  }

  function handleChatGoogleAuth() {
    signInWithRedirect(auth, new GoogleAuthProvider());
  }

  function handleCtaClick() {
    // Log conversion
    const sessionId = getSessionId();
    updateDoc(doc(db, "abTests", slug, "sessions", sessionId), { converted: true }).catch(() => {});
    // Navigate based on campaign
    if (slug === "creators") {
      window.location.href = "/sandbox";
    } else {
      window.location.href = "/?utm_source=campaign&utm_campaign=" + slug;
    }
  }

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <a href="/" style={S.logo}>TitleApp</a>
        <div style={S.navLinks}>
          <a href="/workers" style={S.navLink}>Workers</a>
          <a href="/sandbox" style={S.navLink}>Creators</a>
          <button onClick={handleCtaClick} style={S.navCta}>{config.primaryCta}</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={S.hero}>
        <h1 style={S.h1}>{content.headline}</h1>
        <p style={S.subhead}>{content.subhead}</p>
        <div style={S.ctaRow}>
          <button onClick={handleCtaClick} style={S.primaryBtn}>{config.primaryCta}</button>
          <a href={config.secondaryLink} style={S.secondaryLink}>{config.secondaryCta} &rarr;</a>
        </div>
      </section>

      {/* Featured Workers */}
      {featured.length > 0 && (
        <section style={S.featuredStrip}>
          {featured.map((w) => (
            <a key={w.slug} href={"/workers/" + w.slug} style={S.workerCard}>
              <div style={S.workerName}>{w.name}</div>
              <div style={S.workerDesc}>{w.description}</div>
              <div style={S.workerPrice}>{formatPrice(w.price)}</div>
            </a>
          ))}
        </section>
      )}

      {/* Value Props */}
      <section style={S.valueSection}>
        {config.valueProps.map((vp, i) => (
          <div key={i} style={S.valueProp}>
            <div style={S.valueIcon}>{ICONS[vp.icon] || null}</div>
            <div style={S.valueTitle}>{vp.title}</div>
            <div style={S.valueDesc}>{vp.desc}</div>
          </div>
        ))}
      </section>

      {/* Social Proof */}
      <div style={S.socialProof}>{config.socialProof}</div>

      {/* CTA Block */}
      <section style={S.ctaBlock}>
        <div style={{ ...S.ctaRow, flexDirection: "column", gap: 12 }}>
          <button onClick={handleCtaClick} style={S.primaryBtn}>{config.primaryCta}</button>
          <a href={config.secondaryLink} style={S.secondaryLink}>{config.secondaryCta} &rarr;</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={S.footer}>
        &copy; {new Date().getFullYear()} TitleApp. All rights reserved.
      </footer>

      {/* Floating Chat Bar */}
      <div style={S.chatBar}>
        {chatMode === "idle" && (
          <form onSubmit={handleChatSubmit} style={S.chatInner}>
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask Alex anything..."
              style={S.chatInput}
            />
            <button type="submit" style={{ ...S.chatSendBtn, opacity: chatInput.trim() ? 1 : 0.5 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>
        )}

        {chatMode === "auth" && (
          <div style={S.otpWrap}>
            <div style={S.otpLabel}>Sign in to continue the conversation</div>
            <div style={{ display: "flex", gap: 8, maxWidth: 420, margin: "0 auto 8px", flexWrap: "wrap" }}>
              <input type="email" value={chatEmail} onChange={e => setChatEmail(e.target.value)} placeholder="Email" autoComplete="email" style={{ flex: "1 1 160px", padding: "10px 12px", fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none" }} />
              <input type="password" value={chatPassword} onChange={e => setChatPassword(e.target.value)} placeholder="Password" autoComplete="current-password" onKeyDown={e => e.key === "Enter" && handleChatEmailAuth()} style={{ flex: "1 1 140px", padding: "10px 12px", fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none" }} />
              <button onClick={handleChatEmailAuth} style={{ ...S.otpBtn, flex: "0 0 auto" }}>Sign In</button>
            </div>
            {chatAuthError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 4 }}>{chatAuthError}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 320, margin: "4px auto 8px" }}>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            </div>
            <button onClick={handleChatGoogleAuth} style={{ ...S.otpBtn, width: "100%", maxWidth: 320, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 24px", background: "white", color: "#374151", border: "1px solid #e5e7eb" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { CAMPAIGNS };
