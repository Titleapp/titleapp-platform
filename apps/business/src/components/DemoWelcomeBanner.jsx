import React, { useState, useEffect } from "react";

const DISMISSED_KEY = "sociii_demo_welcome_dismissed";
const SIDEBAR_W     = 300;   // observed desktop sidebar width

// ── Desktop steps ──────────────────────────────────────────────────────────────
const DESKTOP_STEPS = [
  {
    title: "This is Alex",
    body: "Alex is your AI chief of staff — already active in this panel. Type anything in the chat below: open a worker, pull a record, draft a document, or just ask a question.",
    cardStyle: { top: 140, left: SIDEBAR_W + 20 },
    arrow: "down",
    glow: "center-panel",
    autoExpand: null,
  },
  {
    title: "Your workers",
    body: "Workers live in the left panel — we just activated a workspace and expanded MY WORKERS. Click any worker name to open its AI + live data canvas.",
    cardStyle: { top: 300, left: SIDEBAR_W + 20 },
    arrow: "left",
    glow: "dom:workers-toggle",
    autoExpand: "workspace-then-workers",
  },
  {
    title: "Settings & billing",
    body: "ACCOUNT is now open in the left panel — Billing, Settings, and team management for this workspace. Tap any item to navigate there.",
    cardStyle: { top: 300, left: SIDEBAR_W + 20 },
    arrow: "left",
    glow: "dom:account-toggle",
    autoExpand: "account-toggle",
  },
  {
    title: "Vault & Drive",
    body: "MY VAULT and MY DRIVE sit at the top of the left panel — personal records (health, education, money, pet) and cloud storage that travel with you across every workspace.",
    cardStyle: { top: 128, left: SIDEBAR_W + 20 },
    arrow: "up-left",
    glow: "sidebar-vault-drive",
    autoExpand: null,
  },
];

// ── Mobile steps ───────────────────────────────────────────────────────────────
const MOBILE_STEPS = [
  {
    title: "This is Alex",
    body: "The full screen IS the chat. Type anything — find a worker, pull a record, draft a document, or just explore.",
    cardStyle: { bottom: 88, left: 12, right: 12 },
    arrow: "down",
    glow: null,
    autoExpand: null,
  },
  {
    title: "Open the nav",
    body: "Tap the hamburger icon (top-left ≡) to open the navigation. Your workers, Vault, and Drive are all in there.",
    cardStyle: { top: 62, left: 12, right: 12 },
    arrow: "up-left",
    glow: "mobile-hamburger",
    autoExpand: null,
  },
  {
    title: "Switch to canvas",
    body: "Tap the grid icon (top-right) to see the worker's live canvas — real data, charts, and records updated automatically.",
    cardStyle: { top: 62, left: 12, right: 12 },
    arrow: "up-right",
    glow: "mobile-canvas-icon",
    autoExpand: null,
  },
  {
    title: "Vault & Drive",
    body: "In the nav (≡ top-left), tap MY VAULT for personal records or MY DRIVE to connect cloud storage.",
    cardStyle: { bottom: 88, left: 12, right: 12 },
    arrow: "up-left",
    glow: "mobile-hamburger",
    autoExpand: null,
  },
];

// ── DOM-tracked glow ──────────────────────────────────────────────────────────
// Reads the bounding rect of a [data-demo-id] element so the glow lands on
// the real rendered position regardless of how many workers are loaded.
function DomGlow({ demoId }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    let tries = 0;
    function measure() {
      const el = document.querySelector(`[data-demo-id="${demoId}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else if (tries < 10) {
        tries++;
        setTimeout(measure, 100);
      }
    }
    measure();
  }, [demoId]);

  if (!rect) return null;

  const PAD = 6;
  return (
    <div style={{
      position: "fixed",
      top: rect.top - PAD,
      left: 0,
      width: SIDEBAR_W,
      height: rect.height + PAD * 2,
      background: "rgba(124,58,237,0.12)",
      border: "2px solid rgba(124,58,237,0.35)",
      borderRight: "3px solid rgba(124,58,237,0.55)",
      borderRadius: 8,
      pointerEvents: "none",
      zIndex: 8997,
    }} />
  );
}

// ── Static glow overlays ───────────────────────────────────────────────────────
function StaticGlow({ target }) {
  const base = {
    position: "fixed",
    pointerEvents: "none",
    zIndex: 8997,
    borderRadius: 8,
  };
  if (!target) return null;

  if (target === "mobile-hamburger") return (
    <div style={{ ...base, top: 0, left: 0, width: 60, height: 58,
      background: "rgba(124,58,237,0.15)", border: "2px solid rgba(124,58,237,0.4)",
      borderTop: "none", borderLeft: "none", borderRadius: "0 0 10px 0" }} />
  );
  if (target === "mobile-canvas-icon") return (
    <div style={{ ...base, top: 0, right: 0, width: 60, height: 58,
      background: "rgba(124,58,237,0.15)", border: "2px solid rgba(124,58,237,0.4)",
      borderTop: "none", borderRight: "none", borderRadius: "0 0 0 10px" }} />
  );
  if (target === "center-panel") return (
    <div style={{ ...base, top: 0, bottom: 0, left: SIDEBAR_W + 2, width: 380,
      background: "rgba(124,58,237,0.06)",
      border: "2px solid rgba(124,58,237,0.18)",
      borderLeft: "3px solid rgba(124,58,237,0.35)",
      borderRadius: 0 }} />
  );
  // MY VAULT | MY DRIVE row — fixed position, always visible
  if (target === "sidebar-vault-drive") return (
    <div style={{ ...base, top: 128, height: 40, left: 0, width: SIDEBAR_W,
      background: "rgba(124,58,237,0.12)",
      border: "2px solid rgba(124,58,237,0.35)",
      borderRight: "3px solid rgba(124,58,237,0.5)" }} />
  );
  return null;
}

function Glow({ target }) {
  if (!target) return null;
  if (target.startsWith("dom:")) return <DomGlow demoId={target.slice(4)} />;
  return <StaticGlow target={target} />;
}

// ── Arrow SVG ─────────────────────────────────────────────────────────────────
function Arrow({ direction }) {
  const paths = {
    left:       "M20 14 L8 14 M8 14 L14 9 M8 14 L14 19",
    "up-left":  "M18 18 L9 9 M9 9 L9 15 M9 9 L15 9",
    "up-right": "M10 18 L19 9 M19 9 L13 9 M19 9 L19 15",
    down:       "M14 8 L14 20 M14 20 L9 14 M14 20 L19 14",
  };
  return (
    <svg width={24} height={24} viewBox="0 0 28 28" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
      <path d={paths[direction] || paths.left} stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dot({ active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", padding: "4px 3px", cursor: "pointer", display: "flex", alignItems: "center" }} aria-label="Go to step">
      <div style={{ width: active ? 18 : 7, height: 7, borderRadius: 999, background: active ? "#7c3aed" : "#ddd6fe", transition: "width 0.25s ease, background 0.25s ease" }} />
    </button>
  );
}

// ── Auto-expand helpers ───────────────────────────────────────────────────────
function clickIfCollapsed(demoId) {
  const btn = document.querySelector(`[data-demo-id="${demoId}"]`);
  if (btn && btn.getAttribute("data-demo-collapsed") === "true") btn.click();
}

// Step 2: click the first workspace row to make it current (which renders
// personaNav), then after React re-renders click the workers toggle.
function activateWorkspaceAndExpandWorkers() {
  const wsRow = document.querySelector('[data-demo-id="workspace-row-0"]');
  if (wsRow) wsRow.click();
  // Wait for React to re-render personaNav after workspace switch
  setTimeout(() => clickIfCollapsed("workers-toggle"), 600);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DemoWelcomeBanner() {
  const [step, setStep]         = useState(0);
  const [visible, setVisible]   = useState(false);
  const [fading, setFading]     = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768); }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem(DISMISSED_KEY)) {
      const t = setTimeout(() => setVisible(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  // Auto-expand sidebar sections when their step becomes active.
  useEffect(() => {
    const STEPS = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
    const s = STEPS[step];
    if (!s?.autoExpand) return;
    let t1, t2;
    if (s.autoExpand === "workspace-then-workers") {
      // Step 2: click workspace row first (makes personaNav render), then workers toggle
      t1 = setTimeout(() => activateWorkspaceAndExpandWorkers(), 300);
    } else {
      t1 = setTimeout(() => clickIfCollapsed(s.autoExpand), 300);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step, isMobile]);

  if (!visible) return null;

  const STEPS = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
  const s = STEPS[Math.min(step, STEPS.length - 1)];

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  function goTo(idx) {
    if (fading || idx === step) return;
    setFading(true);
    setTimeout(() => { setStep(idx); setFading(false); }, 200);
  }

  function next() {
    if (step < STEPS.length - 1) goTo(step + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) goTo(step - 1);
  }

  const cardW = isMobile ? undefined : 278;

  return (
    <>
      <Glow target={s.glow} />

      <div style={{
        position: "fixed",
        zIndex: 8999,
        width: cardW,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
        overflow: "hidden",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.2s ease, top 0.32s cubic-bezier(.4,0,.2,1), bottom 0.32s cubic-bezier(.4,0,.2,1), left 0.32s cubic-bezier(.4,0,.2,1), right 0.32s cubic-bezier(.4,0,.2,1)",
        ...s.cardStyle,
      }}>
        {/* Header bar */}
        <div style={{ background: "#7c3aed", padding: "9px 13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Demo guide · {step + 1} of {STEPS.length}
          </div>
          <button onClick={dismiss} aria-label="Dismiss"
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "3px 7px" }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "13px 14px 9px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 7 }}>
            <Arrow direction={s.arrow} />
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.25 }}>{s.title}</div>
          </div>
          <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6, paddingLeft: 31 }}>{s.body}</div>
        </div>

        {/* Footer */}
        <div style={{ padding: "7px 14px 13px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {step > 0 && (
              <button onClick={prev} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: "2px 6px", marginRight: 2 }}>←</button>
            )}
            {STEPS.map((_, i) => <Dot key={i} active={i === step} onClick={() => goTo(i)} />)}
          </div>
          <button onClick={next}
            style={{ padding: "7px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            {step < STEPS.length - 1 ? "Next" : "Got it"}
          </button>
        </div>
      </div>
    </>
  );
}
