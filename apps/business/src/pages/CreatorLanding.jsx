import React, { useState, useEffect, useRef } from "react";
import { CAMPAIGN_ROUTES, resolveCampaignFromLocation } from "../lib/campaignRouting";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

// CreatorLanding — workspace surface that ad traffic lands on.
// Three-panel mock matching the real SOCIII workspace pattern:
//   Left: sidebar (My Workers / Spine / Other) — minimal in guest mode
//   Center: chat (Alex pre-seeded with empathy-first opening)
//   Right: canvas (hero video + worker subscribe card + what-it-does)
//
// Black background popping the character video. Video sized big enough
// to be the focal point but not bigger than the canvas can comfortably
// hold a worker card below it. Mobile stacks vertically with the video
// at the top, chat in the middle, sticky input at the bottom.

const COLORS = {
  bg: "#000",
  panel: "#0B0E14",
  panelSoft: "#11151D",
  border: "#1F2530",
  text: "#E8ECF1",
  textDim: "#8B96A8",
  accent: "#7C3AED",
  accent2: "#16A34A",
  bubbleAlex: "#1A2230",
};

// Per-creator video paths. Files live in apps/business/public/launch-creative/.
// All 19 launch clips staged 2026-06-01.
const VIDEO_PATHS = {
  // OF for Smart People
  michael:      "/launch-creative/of-michael-video-01.mp4",
  maria:        "/launch-creative/of-maria-video-01.mp4",
  julia:        "/launch-creative/of-julia-video-01.mp4",
  brad:         "/launch-creative/of-brad-video-01.mp4",
  brandon:      "/launch-creative/of-brandon-video-01.mp4",
  clint:        "/launch-creative/of-clint-video-01.mp4",
  darnell:      "/launch-creative/of-darnell-video-01.mp4",
  dietrich:     "/launch-creative/of-dietrich-video-01.mp4",
  katarzyna:    "/launch-creative/of-katarzyna-video-01.mp4",
  katie:        "/launch-creative/of-katie-video-01.mp4",
  lisa:         "/launch-creative/of-captain-lisa-video-01.mp4",
  madison:      "/launch-creative/of-madison-video-01.mp4",
  manpreet:     "/launch-creative/of-manpreet-video-01.mp4",
  monty:        "/launch-creative/of-monty-video-01.mp4",
  randy:        "/launch-creative/of-randy-video-01.mp4",
  // Hate Your Boss
  dale:         "/launch-creative/hate-boss-dealer-video-01.mp4",
  sandra:       "/launch-creative/hate-boss-synergy-video-01.mp4",
  "yc-brandon": "/launch-creative/hate-boss-vc-video-02.mp4",
  priya:        "/launch-creative/hate-boss-tech-video-01.mp4",
};

// Inject the pulse keyframes once at module load so any element can
// reference `className="pulse-glow"` or `className="pulse-arrow"`.
if (typeof document !== "undefined" && !document.getElementById("creator-landing-anims")) {
  const style = document.createElement("style");
  style.id = "creator-landing-anims";
  style.textContent = `
    @keyframes creatorPulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.55); border-color: ${COLORS.accent}; }
      50% { box-shadow: 0 0 0 8px rgba(124, 58, 237, 0); border-color: rgba(124, 58, 237, 0.4); }
    }
    @keyframes creatorPulseDot {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.4); opacity: 0.4; }
    }
    @keyframes creatorPulseArrow {
      0%, 100% { transform: translateY(0); opacity: 0.85; }
      50% { transform: translateY(-4px); opacity: 1; }
    }
    .pulse-glow { animation: creatorPulseGlow 1.8s ease-in-out infinite; }
    .pulse-dot { animation: creatorPulseDot 1.2s ease-in-out infinite; }
    .pulse-arrow { animation: creatorPulseArrow 1.5s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

export default function CreatorLanding() {
  const ctx = resolveCampaignFromLocation();
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 900);

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 900); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Capture UTM + campaign context for attribution. Persists to
  // sessionStorage so the signup flow (and the eventual workspace-create
  // call) can stamp the source on the new account. Wires the conversion
  // chain: ad click → page view → signup → attribution recorded.
  useEffect(() => {
    if (typeof window === "undefined" || !ctx) return;
    const attribution = {
      arrivedAt: new Date().toISOString(),
      campaignId: ctx.campaignId,
      character: ctx.character,
      creatorSlug: ctx.creatorSlug,
      workerSlug: ctx.workerSlug,
      utmSource: ctx.utmSource || null,
      utmMedium: ctx.utmMedium || null,
      utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || null,
      utmContent: new URLSearchParams(window.location.search).get("utm_content") || null,
      utmTerm: new URLSearchParams(window.location.search).get("utm_term") || null,
      referrer: document.referrer || null,
      landingPath: window.location.pathname,
    };
    try {
      sessionStorage.setItem("ta_campaign_attribution", JSON.stringify(attribution));
      // Convenience fields used elsewhere in the app
      sessionStorage.setItem("ta_campaign_id", ctx.campaignId || "");
      sessionStorage.setItem("ta_campaign_character", ctx.character || "");
    } catch { /* private mode etc. — non-fatal */ }
  }, [ctx]);

  if (!ctx) {
    return (
      <div style={{ ...wrapDesktop, justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: COLORS.text }}>Creator not found.</div>
      </div>
    );
  }

  const { character, workerDisplayName, alexOpening, creatorSlug } = ctx;
  const videoSrc = VIDEO_PATHS[creatorSlug] || VIDEO_PATHS.michael;
  const handle = "@" + String(character || "").toLowerCase().replace(/\s+/g, "");

  return isMobile ? (
    <MobileLayout
      character={character}
      subject={workerDisplayName}
      handle={handle}
      videoSrc={videoSrc}
      alexOpening={alexOpening}
    />
  ) : (
    <DesktopLayout
      character={character}
      subject={workerDisplayName}
      handle={handle}
      videoSrc={videoSrc}
      alexOpening={alexOpening}
    />
  );
}

// ── Desktop: Sidebar (280) · Chat (1fr) · Canvas (520) ─────────────
function DesktopLayout({ character, subject, handle, videoSrc, alexOpening }) {
  return (
    <div style={wrapDesktop}>
      <Sidebar character={character} subject={subject} />
      <Chat character={character} alexOpening={alexOpening} subject={subject} />
      <Canvas character={character} subject={subject} handle={handle} videoSrc={videoSrc} />
    </div>
  );
}

// ── Mobile: Video full-bleed top · Chat below · sticky input ───────
function MobileLayout({ character, subject, handle, videoSrc, alexOpening }) {
  return (
    <div style={wrapMobile}>
      <MobileHero
        character={character}
        subject={subject}
        handle={handle}
        videoSrc={videoSrc}
      />
      <MobileChat character={character} alexOpening={alexOpening} subject={subject} />
    </div>
  );
}

// ── Left: Sidebar (workspace pattern) ──────────────────────────────
function Sidebar({ character, subject }) {
  // Each item below dispatches a `ta:suggest-prompt` event the chat
  // panel listens for. Clicking doesn't navigate — it tells Alex to
  // riff. Everything routes through conversation; nothing through a
  // marketing funnel of dead pages.
  function suggest(text) {
    window.dispatchEvent(new CustomEvent("ta:suggest-prompt", { detail: text }));
  }
  return (
    <aside style={sidebar}>
      <div style={sidebarBrand}>
        <img src={sociiiMarkUrl} alt="SOCIII" style={{ width: 30, height: 30 }} />
        <span style={{ color: COLORS.text, fontSize: 18, fontWeight: 600, letterSpacing: 0.3 }}>sociii</span>
      </div>

      <div style={{ padding: "16px 12px 8px" }}>
        <button
          style={{ ...primaryButton, padding: "12px 14px", fontSize: 14 }}
          onClick={() => window.dispatchEvent(new CustomEvent("ta:show-signup"))}
        >
          Sign up for free
        </button>
        <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 6, textAlign: "center", lineHeight: 1.4 }}>
          Save this chat · no card required
        </div>
      </div>

      <SidebarSection label="My Workers" pill="1" />
      <SidebarItem active label={character} subtitle={subject} />

      <SidebarSection label="Ask Alex" />
      <SidebarItem
        onClick={() => suggest(`What can ${character} actually do for me?`)}
        label={`What can ${character} do for me?`}
        subtitle="Get specifics on outputs"
      />
      <SidebarItem
        onClick={() => suggest(`Show me workers similar to ${character}.`)}
        label="Find similar workers"
        subtitle="Alex suggests based on what you need"
      />
      <SidebarItem
        onClick={() => suggest("I want to build my own worker and sell it on SOCIII.")}
        label="Build your own worker"
        subtitle="Become a creator like Michael's"
      />

      <div style={{ marginTop: "auto", padding: 16, fontSize: 12, lineHeight: 1.5, borderTop: `1px solid ${COLORS.border}`, color: COLORS.textDim }}>
        <div style={{ color: COLORS.text, marginBottom: 4 }}>Guest workspace</div>
        Your chat saves here when you sign in.
      </div>
    </aside>
  );
}

function SidebarSection({ label, pill }) {
  return (
    <div style={{ padding: "16px 12px 6px", color: COLORS.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{label}</span>
      {pill && (
        <span style={{ background: COLORS.accent, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8 }}>{pill}</span>
      )}
    </div>
  );
}

function SidebarItem({ label, subtitle, active, muted, onClick }) {
  const clickable = !!onClick && !active;
  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        margin: "2px 8px",
        padding: "10px 12px",
        borderRadius: 8,
        background: active ? "rgba(124, 58, 237, 0.12)" : "transparent",
        borderLeft: active ? `3px solid ${COLORS.accent}` : "3px solid transparent",
        cursor: clickable ? "pointer" : active ? "default" : "default",
        opacity: muted ? 0.55 : 1,
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { if (clickable) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ color: COLORS.text, fontSize: 13.5, fontWeight: active ? 600 : 500 }}>{label}</div>
      {subtitle && <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ── Center: Chat (main area in workspace pattern) ──────────────────
// Canned Alex responses for the sidebar-suggested prompts. Mock only —
// when this lands on the real backend, Alex's actual LLM call replaces
// these. The point right now is to show the conversational pattern.
function mockAlexReply(prompt, character, subject) {
  const p = String(prompt).toLowerCase();
  if (p.includes("similar") || p.includes("workers like")) {
    return `If ${character} caught your eye, you'd probably get value from a few others I've watched perform well:\n\n· Maria — ER Nursing — for the practice-side of healthcare\n· Manpreet — Tax Compliance — pairs with ${character} if you have side income\n· Brad — Biotech Gene Mapping — if you're in a lab\n\nWant me to walk you through any of them?`;
  }
  if (p.includes("build my own") || p.includes("creator") || p.includes("sell")) {
    return `Yeah — most of the workers on SOCIII were built by experts who used Claude Code + our SDK. You don't need to be a developer. You bring the domain expertise, the SDK handles the structure, you keep 75% of every subscription.\n\nWant me to walk you through what it would look like to build one for what you know?`;
  }
  if (p.includes("what can") || p.includes("do for me")) {
    return `${character} handles the part of ${subject.toLowerCase()} you'd otherwise be doing yourself or paying someone $400/hr to do. Concretely:\n\n· runs workflows from chat — no setup wizard\n· outputs save to your Drive · audit log per action\n· you cancel inline whenever, no card on file required\n\nWhat's the specific thing you're trying to get off your plate?`;
  }
  return `Got it. Tell me a little more — what's the situation you're trying to fix?`;
}

function Chat({ character, alexOpening, subject }) {
  const [input, setInput] = useState("");
  const [showGate, setShowGate] = useState(false);
  const [messages, setMessages] = useState([]); // [{side, text}]
  const messagesEndRef = useRef(null);

  // Listen for sidebar prompts → user message + canned Alex reply
  useEffect(() => {
    function onPrompt(e) {
      const text = e?.detail;
      if (!text) return;
      setMessages(prev => [
        ...prev,
        { side: "user", text },
        { side: "alex", text: mockAlexReply(text, character, subject) },
      ]);
    }
    function onShowSignup() {
      setShowGate(true);
    }
    window.addEventListener("ta:suggest-prompt", onPrompt);
    window.addEventListener("ta:show-signup", onShowSignup);
    return () => {
      window.removeEventListener("ta:suggest-prompt", onPrompt);
      window.removeEventListener("ta:show-signup", onShowSignup);
    };
  }, [character, subject]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setShowGate(true);
  }

  return (
    <main style={chatColumn}>
      <div style={chatHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={alexAvatar}>A</div>
          <div>
            <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>Alex</div>
            <div style={{ color: COLORS.textDim, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.accent2, display: "inline-block" }} />
              Working on the {character} worker · {subject}
            </div>
          </div>
        </div>
      </div>

      <div style={chatMessages}>
        <div style={{ display: "flex", marginBottom: 14 }}>
          <Bubble>{alexOpening}</Bubble>
        </div>
        {messages.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.accent, fontSize: 13, marginLeft: 4, marginBottom: 18 }}>
            <span className="pulse-arrow" style={{ display: "inline-block", fontSize: 18 }}>↓</span>
            <span>your turn — reply to start, or pick a prompt on the left</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.side === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
            {m.side === "alex"
              ? <Bubble>{m.text}</Bubble>
              : <UserBubble>{m.text}</UserBubble>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showGate ? (
        <div style={signupGate}>
          <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            One more thing before I dig in
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
            Sign in so I can save what we build. No card needed yet — just need somewhere to put the work.
          </div>
          <button style={primaryButton} onClick={() => window.location.href = "/meet-alex?action=signup"}>Continue with Google</button>
          <button style={ghostButton} onClick={() => window.location.href = "/meet-alex?action=signup&mode=email"}>Use email instead</button>
        </div>
      ) : (
        <form onSubmit={handleSend} style={chatInputForm}>
          <button type="button" style={chatTool} title="Attach">+</button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Tell Alex what ${character} should help with…`}
            style={chatInput}
            className={input ? "" : "pulse-glow"}
            autoFocus
          />
          <button type="submit" style={chatSendBtn}>↑</button>
        </form>
      )}
    </main>
  );
}

function Bubble({ children }) {
  return (
    <div style={{
      background: COLORS.bubbleAlex,
      color: COLORS.text,
      padding: "14px 18px",
      borderRadius: 14,
      borderTopLeftRadius: 4,
      maxWidth: "78%",
      fontSize: 15,
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
    }}>
      {children}
    </div>
  );
}

function UserBubble({ children }) {
  return (
    <div style={{
      background: COLORS.accent,
      color: "#fff",
      padding: "12px 16px",
      borderRadius: 14,
      borderTopRightRadius: 4,
      maxWidth: "75%",
      fontSize: 14.5,
      lineHeight: 1.55,
    }}>
      {children}
    </div>
  );
}

// ── Right: Canvas (video + worker card + bullets) ──────────────────
function Canvas({ character, subject, handle, videoSrc }) {
  return (
    <aside style={canvasColumn}>
      <div style={canvasHeader}>
        <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}>{character} · {subject}</div>
        <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 4 }}>
          The video Alex is reacting to — what brought you here
        </div>
      </div>

      <div style={{ padding: "20px 18px", overflowY: "auto" }}>
        <VideoCard videoSrc={videoSrc} />
        <WorkerCard character={character} subject={subject} handle={handle} />
        <Bullets character={character} subject={subject} />
      </div>
    </aside>
  );
}

function VideoCard({ videoSrc }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.muted = true;
      ref.current.play().catch(() => {});
    }
  }, []);
  return (
    <div style={{
      background: "#000",
      borderRadius: 16,
      overflow: "hidden",
      aspectRatio: "9 / 16",
      width: "100%",
      maxWidth: 360,
      margin: "0 auto",
      boxShadow: "0 10px 40px rgba(124, 58, 237, 0.18)",
    }}>
      <video
        ref={ref}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

function WorkerCard({ character, subject, handle }) {
  return (
    <div style={workerCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={avatarCircle}>
          <img src={sociiiMarkUrl} alt="" style={{ width: 32, height: 32 }} />
        </div>
        <div>
          <div style={{ color: COLORS.text, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            {character}
            <Check />
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 12.5 }}>{handle} · Available now</div>
        </div>
      </div>

      <div style={{ marginTop: 16, color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{subject}</div>
      <div style={{ color: COLORS.textDim, fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>
        All of {character}'s expertise — without the $500/hour invoice.
      </div>

      <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ color: COLORS.textDim, fontSize: 13, textDecoration: "line-through", marginRight: 4 }}>$500/hr</span>
        <span style={{ color: COLORS.text, fontSize: 30, fontWeight: 700 }}>$29</span>
        <span style={{ color: COLORS.textDim, fontSize: 13 }}>/month · 7 days free</span>
      </div>

      <button
        style={{ ...primaryButton, marginTop: 16 }}
        onClick={() => window.dispatchEvent(new CustomEvent("ta:show-signup"))}
      >Start free trial</button>
      <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 8, textAlign: "center" }}>
        No card required · cancel from chat
      </div>
    </div>
  );
}

function Bullets({ character, subject: _subject }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ color: COLORS.text, fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
        What you actually get
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.7 }}>
        <li>Ask {character} anything a $500/hour consultant would answer</li>
        <li>On call 24/7 — no scheduling, no calendar tag</li>
        <li>Outputs save to your Drive · audit log per action</li>
        <li>7 days free · cancel from chat · no card required</li>
      </ul>
    </div>
  );
}

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="#0686D4" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Mobile: video top · chat below · sticky input ──────────────────
function MobileHero({ character, subject, handle, videoSrc }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.muted = true;
      ref.current.play().catch(() => {});
    }
  }, []);
  return (
    <div style={mobileHero}>
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 8, zIndex: 2 }}>
        <img src={sociiiMarkUrl} alt="" style={{ width: 22, height: 22 }} />
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>sociii</span>
      </div>
      <video
        ref={ref}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      <div style={mobileHeroOverlay}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...avatarCircle, width: 40, height: 40 }}>
            <img src={sociiiMarkUrl} alt="" style={{ width: 22, height: 22 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              {character} <Check />
            </div>
            <div style={{ color: COLORS.textDim, fontSize: 12 }}>{handle} · {subject} · $29/mo</div>
          </div>
          <button style={{ ...primaryButton, width: "auto", padding: "10px 16px", marginTop: 0, fontSize: 13 }}>Start free</button>
        </div>
      </div>
    </div>
  );
}

function MobileChat({ character, alexOpening, subject }) {
  const [input, setInput] = useState("");
  const [showGate, setShowGate] = useState(false);

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setShowGate(true);
  }

  return (
    <div style={mobileChat}>
      <div style={{ ...chatHeader, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={alexAvatar}>A</div>
          <div>
            <div style={{ color: COLORS.text, fontSize: 13.5, fontWeight: 600 }}>Alex · {subject}</div>
            <div style={{ color: COLORS.textDim, fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent2, display: "inline-block" }} />
              Already working on {character}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <Bubble>{alexOpening}</Bubble>
      </div>

      {showGate ? (
        <div style={signupGate}>
          <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Save this chat
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 12.5, marginBottom: 12 }}>
            Sign in so I can keep working on {character} for you.
          </div>
          <button style={primaryButton} onClick={() => window.location.href = "/meet-alex?action=signup"}>Continue with Google</button>
        </div>
      ) : (
        <form onSubmit={handleSend} style={{ ...chatInputForm, padding: "10px 12px env(safe-area-inset-bottom) 12px" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Tell Alex what ${character} should help with…`}
            style={chatInput}
          />
          <button type="submit" style={chatSendBtn}>↑</button>
        </form>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const wrapDesktop = {
  display: "grid",
  gridTemplateColumns: "280px 1fr 480px",
  height: "100vh",
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  overflow: "hidden",
};

const wrapMobile = {
  display: "grid",
  gridTemplateRows: "55vh 1fr",
  height: "100vh",
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  overflow: "hidden",
};

const sidebar = {
  background: COLORS.panel,
  borderRight: `1px solid ${COLORS.border}`,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const sidebarBrand = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "20px 16px",
  borderBottom: `1px solid ${COLORS.border}`,
};

const chatColumn = {
  display: "flex",
  flexDirection: "column",
  background: COLORS.bg,
  borderRight: `1px solid ${COLORS.border}`,
  overflow: "hidden",
};

const chatHeader = {
  padding: "16px 24px",
  borderBottom: `1px solid ${COLORS.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const alexAvatar = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: COLORS.accent,
  display: "grid",
  placeItems: "center",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
};

const chatMessages = {
  flex: 1,
  overflowY: "auto",
  padding: "24px",
};

const chatInputForm = {
  borderTop: `1px solid ${COLORS.border}`,
  padding: 14,
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: COLORS.bg,
};

const chatTool = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: "transparent",
  color: COLORS.textDim,
  border: `1px solid ${COLORS.border}`,
  cursor: "pointer",
  fontSize: 16,
};

const chatInput = {
  flex: 1,
  background: COLORS.panelSoft,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 14,
  outline: "none",
};

const chatSendBtn = {
  background: COLORS.accent,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  width: 44,
  height: 44,
  fontSize: 18,
  cursor: "pointer",
};

const canvasColumn = {
  background: COLORS.panel,
  borderLeft: `1px solid ${COLORS.border}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const canvasHeader = {
  padding: "16px 20px",
  borderBottom: `1px solid ${COLORS.border}`,
};

const workerCard = {
  background: COLORS.panelSoft,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: 20,
  marginTop: 20,
};

const avatarCircle = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  background: "#1A1F2B",
  display: "grid",
  placeItems: "center",
  border: `1px solid ${COLORS.border}`,
  flexShrink: 0,
};

const primaryButton = {
  width: "100%",
  background: COLORS.accent,
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  padding: "13px 16px",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};

const ghostButton = {
  width: "100%",
  marginTop: 10,
  background: "transparent",
  color: COLORS.textDim,
  fontSize: 13,
  padding: "10px 16px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  cursor: "pointer",
};

const signupGate = {
  borderTop: `1px solid ${COLORS.border}`,
  padding: 20,
  background: "rgba(124, 58, 237, 0.06)",
};

const mobileHero = {
  position: "relative",
  background: "#000",
  overflow: "hidden",
};

const mobileHeroOverlay = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  padding: 14,
  background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))",
};

const mobileChat = {
  display: "flex",
  flexDirection: "column",
  background: COLORS.bg,
  overflow: "hidden",
};
