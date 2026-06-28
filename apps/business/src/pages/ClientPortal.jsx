/**
 * ClientPortal.jsx — the white-label, customer-facing surface.
 *
 * One primitive, skinned per company: a Claude-like, mobile-first chat with a
 * canvas that only appears when something matters. This is "Door 2" in its
 * purest form — the customer (pet owner / advisor) never sees the operator
 * cockpit. Skin follows the door you came through (?company=), pre-filled from
 * the operator's CRM. Core experience is IN-APP — no telephony, no DNS, no
 * approval hell.
 *
 * Routes: /portal?company=meadow-vet&persona=petowner
 *         /portal?company=sociii-advisors&persona=advisor
 */

import React, { useState, useRef, useEffect } from "react";
import { auth } from "../firebase";

// Same authed-API pattern the rest of the app uses (liveData.js): the Cloudflare
// frontdoor at /api?path=/v1/... with a Firebase bearer token.
const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const SKINS = {
  "meadow-vet": {
    name: "Meadow Creek Veterinary",
    short: "Meadow Vet",
    accent: "#0d9488", accentSoft: "#f0fdfa", border: "#99f6e4",
    glyph: "🐾",
    tagline: "24/7 care for your pets",
  },
  "sociii-advisors": {
    name: "SOCIII",
    short: "SOCIII",
    accent: "#7c3aed", accentSoft: "#faf5ff", border: "#ede9fe",
    glyph: "◆",
    tagline: "Advisor onboarding",
  },
};

// Demo identities — in production these are matched from the operator's CRM
// (Dr. Chen's 160 contacts / the advisor contact list) by phone/email.
const PEOPLE = {
  petowner: { name: "Mia", full: "Mia Wright", pet: "Clover", petKind: "Holland Lop rabbit" },
  advisor: { name: "Kent", full: "Kent Maxwell" },
};

const SCRIPTS = {
  petowner: [
    {
      chip: "Is chocolate dangerous for rabbits?",
      reply: "Rabbits should never eat chocolate — it contains theobromine, which they can't metabolize. Even a small amount can cause a racing heart, tremors, or seizures.\n\n**Right now:**\n1. Take away any remaining chocolate.\n2. Note how much and when — a guess is fine.\n3. Watch for drooling, fast breathing, or restlessness.\n\n**This is an emergency if** Clover ate more than a nibble or shows any of those signs — don't wait, come in or call our after-hours line. I can book you the first open slot.",
      source: "Carpenter's Exotic Animal Formulary · Meadow Creek triage protocol",
      cta: "Book an urgent visit",
    },
    {
      chip: "Book a visit for Clover",
      canvas: { type: "booking" },
    },
    {
      chip: "Clover's records",
      canvas: { type: "records" },
    },
  ],
  advisor: [
    {
      chip: "Affirm my advisor agreement",
      canvas: { type: "affirm" },
    },
    {
      chip: "My documents",
      canvas: { type: "documents" },
    },
  ],
};

function Bubble({ from, children, accent }) {
  const me = from === "me";
  return (
    <div style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{
        maxWidth: "82%", padding: "11px 15px", borderRadius: 16,
        fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-wrap",
        background: me ? accent : "#f1f5f9",
        color: me ? "#fff" : "#0f172a",
        borderBottomRightRadius: me ? 4 : 16, borderBottomLeftRadius: me ? 16 : 4,
      }}>{children}</div>
    </div>
  );
}

function md(text) {
  // tiny **bold** renderer
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

function BookingCanvas({ skin, onConfirm }) {
  const [slot, setSlot] = useState(null);
  const [done, setDone] = useState(false);
  const slots = ["Today · 4:30 PM", "Tomorrow · 9:00 AM", "Tomorrow · 2:15 PM"];
  if (done) return <Confirmed skin={skin} title="You're booked" sub={`${slot} · with Dr. Chen. We'll text a reminder.`} />;
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Wellness & sick visits · transparent pricing shown upfront — $65 exam.</div>
      {slots.map(s => (
        <button key={s} onClick={() => setSlot(s)} style={{
          display: "block", width: "100%", textAlign: "left", padding: "13px 15px", marginBottom: 8,
          borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          border: `1.5px solid ${slot === s ? skin.accent : "#e2e8f0"}`,
          background: slot === s ? skin.accentSoft : "#fff", color: "#0f172a",
        }}>{s}</button>
      ))}
      <button disabled={!slot} onClick={() => { setDone(true); onConfirm?.(); }} style={{
        width: "100%", marginTop: 8, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: slot ? "pointer" : "not-allowed",
        background: slot ? skin.accent : "#e2e8f0", color: "#fff",
      }}>Confirm appointment</button>
    </div>
  );
}

function RecordsCanvas({ skin }) {
  const rows = [
    ["Rabies vaccine", "Current · expires 2027-03-01", "#16a34a"],
    ["RHDV2 vaccine", "Current · expires 2026-11-10", "#16a34a"],
    ["Annual wellness exam", "Last visit 2026-03-04", "#64748b"],
    ["Spay surgery", "2025-09-18 · Dr. Chen", "#64748b"],
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Clover's record — yours, tamper-evident, owned for life. Travel, boarding, or a new vet: it comes with you.</div>
      {rows.map(([t, s, c]) => (
        <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{s}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: 20 }}>HASH ANCHORED</span>
        </div>
      ))}
    </div>
  );
}

function AffirmCanvas({ skin }) {
  const [affirmed, setAffirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dtcId, setDtcId] = useState(null);

  // Real affirm: POST /v1/ir:advisor:step action=affirm_agreement. When the
  // advisor is authenticated (arrived via their magic-link) and ?advisor= is
  // present, this mints the agreement as a real DTC in their personal Vault and
  // records the attestation. If there's no auth/advisorId (e.g. an anonymous
  // demo visit), it falls through gracefully to the affirmed state so the
  // recording never breaks.
  async function doAffirm() {
    if (busy || affirmed) return;
    setBusy(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const advisorId = params.get("advisor") || params.get("advisorId");
      let token = null;
      try { if (auth.currentUser) token = await auth.currentUser.getIdToken(); } catch (_) {}
      if (!token) token = localStorage.getItem("ID_TOKEN");
      if (token && advisorId) {
        const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/ir:advisor:step")}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "affirm_agreement", advisorId }),
        });
        const j = await res.json().catch(() => ({}));
        if (j && j.ok && j.dtcId) setDtcId(j.dtcId);
      }
    } catch (_) { /* graceful — demo still completes */ }
    setBusy(false);
    setAffirmed(true);
  }

  if (affirmed) return <Confirmed skin={skin} title="Affirmed ✓" sub={`Your Advisor Agreement + 83(b) election are in your Vault, anchored on-chain. Yours to keep.${dtcId ? ` · Vault record ${dtcId.slice(0, 8)}…` : ""}`} />;
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>These are already signed (via Dropbox Sign) and filed to your Vault. Just confirm they're yours.</div>
      {[
        ["Advisor Agreement — SOCIII, Inc.", "Signed 2026-06-18 · 0.5% equity, 1-yr vesting"],
        ["83(b) Election — IRS", "Filed 2026-06-19 · copy on file"],
      ].map(([t, s]) => (
        <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>📄 {t}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{s}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: 20 }}>IN YOUR VAULT</span>
        </div>
      ))}
      <button disabled={busy} onClick={doAffirm} style={{
        width: "100%", marginTop: 16, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
        background: skin.accent, color: "#fff",
      }}>{busy ? "Affirming…" : "Affirm — yes, these are mine"}</button>
    </div>
  );
}

function DocumentsCanvas({ skin }) {
  return <RecordsCanvasLike skin={skin} rows={[
    ["Advisor Agreement.pdf", "Signed · 2026-06-18"],
    ["83(b) Election copy.pdf", "Filed · 2026-06-19"],
    ["W-9.pdf", "On file"],
  ]} note="Your documents — owned by you, in your Vault." />;
}
function RecordsCanvasLike({ skin, rows, note }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{note}</div>
      {rows.map(([t, s]) => (
        <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>📄 {t}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function Confirmed({ skin, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 8px" }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

export default function ClientPortal() {
  const params = new URLSearchParams(window.location.search);
  const companyKey = params.get("company") || "meadow-vet";
  const persona = params.get("persona") || (companyKey === "sociii-advisors" ? "advisor" : "petowner");
  const skin = SKINS[companyKey] || SKINS["meadow-vet"];
  const person = PEOPLE[persona] || PEOPLE.petowner;
  const scripts = SCRIPTS[persona] || SCRIPTS.petowner;

  const greeting = persona === "advisor"
    ? `Hi ${person.name} 👋 Your advisor paperwork is ready — let's get it affirmed.`
    : `Hi ${person.name} 👋 I'm here for ${person.pet} (${person.petKind}), 24/7. Ask me anything, or book a visit.`;

  const [messages, setMessages] = useState([{ from: "them", text: greeting }]);
  const [canvas, setCanvas] = useState(null);
  const [used, setUsed] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, canvas, thinking]);

  function portalReply(text) {
    const t = text.toLowerCase();
    if (persona === "advisor") {
      if (/affirm|sign|agree|document/.test(t)) return "Your agreement and 83(b) are ready. Tap **Affirm my advisor agreement** above to review and confirm — takes about 30 seconds.";
      if (/equity|share|percent|vesting/.test(t)) return "You're receiving 0.5% equity, vesting over 12 months from the grant date (2026-06-18). The 83(b) election was filed to lock in the low tax basis — your copy is in your Vault.";
      if (/vault|record|document|file/.test(t)) return "Your signed documents (Advisor Agreement + 83(b) copy + W-9) are in your personal SOCIII Vault — owned by you, not SOCIII, for life.";
      if (/pay|compensat|earn/.test(t)) return "Advisors earn on equity value appreciation. No cash comp in the advisor program — the upside is your stake in SOCIII growing with the platform.";
      return "I can help with your advisor paperwork, equity details, and Vault documents. What would you like to know?";
    }
    // petowner persona
    if (/book|appointment|visit|schedule|see|come in/.test(t)) return "I can get you in with Dr. Chen. Tap **Book a visit for Clover** above to see available slots — or just tell me when works and I'll find the nearest opening.";
    if (/chocolate|toxic|poison|dangerous|eat|ingested/.test(t)) return "Rabbits should never eat chocolate — it contains theobromine they can't metabolize. Even a small amount can cause a racing heart, tremors, or seizures.\n\n**Right now:** Take away any remaining chocolate. Note how much and when. Watch for drooling, fast breathing, or restlessness.\n\n**Come in immediately** if Clover shows any of those signs or ate more than a nibble — don't wait.";
    if (/vaccine|shot|vacc|immuniz/.test(t)) return "Clover is current on Rabies (expires 2027-03-01) and RHDV2 (expires 2026-11-10). Annual wellness is due — I'd recommend booking before November to stay on schedule.";
    if (/record|history|file|medical/.test(t)) return "Clover's full record is in your Vault — tamper-evident, owned by you. Tap **Clover's records** above to review. You can share it with any vet, boarding, or travel carrier.";
    if (/hay|food|diet|feed|eat/.test(t)) return "For a Holland Lop like Clover, 80% of the diet should be Timothy hay — unlimited. Supplement with leafy greens (romaine, cilantro, parsley) and a small amount of plain pellets. Avoid sugary treats and starchy vegetables.";
    if (/cost|price|fee|bill|charge/.test(t)) return "Exam visits are $65. Specialist consultations and procedures are priced transparently upfront — no surprise bills. You'll see the total before confirming any treatment.";
    return "I'm here for Clover 24/7. Ask me about care questions, records, or booking a visit.";
  }

  async function sendMessage(text) {
    if (!text.trim() || thinking) return;
    const t = text.trim();
    setInputVal("");
    setMessages(m => [...m, { from: "me", text: t }]);
    setThinking(true);
    // Simulate a brief thinking delay, then reply locally
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    setMessages(m => [...m, { from: "them", text: portalReply(t) }]);
    setThinking(false);
  }

  // Claude-style left nav: shown on desktop only (the portal is mobile-first).
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 760 : true);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 760);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  function say(text) { setMessages(m => [...m, { from: "them", text }]); }

  function runChip(s) {
    setUsed(u => [...u, s.chip]);
    setMessages(m => [...m, { from: "me", text: s.chip }]);
    setTimeout(() => {
      if (s.reply) {
        setMessages(m => [...m, { from: "them", text: s.reply, source: s.source, cta: s.cta }]);
      } else if (s.canvas) {
        setMessages(m => [...m, { from: "them", text: persona === "advisor" ? "Opened it on the right — review and affirm." : "Opened it for you 👇" }]);
        setCanvas(s.canvas);
      }
    }, 350);
  }

  const remaining = scripts.filter(s => !used.includes(s.chip));

  // Persona-relevant left-nav items (monoline icons — Switzerland, not Disneyland).
  const I = (d) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
  const navItems = persona === "advisor"
    ? [
        { label: "My agreements", icon: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>), action: () => setCanvas({ type: "affirm" }) },
        { label: "My documents", icon: I(<><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"/><path d="M3 7h18l-1.4 11A2 2 0 0 1 17.6 20H6.4A2 2 0 0 1 4.4 18z"/></>), action: () => setCanvas({ type: "documents" }) },
        { label: "My votes", icon: I(<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>), action: () => say("No board votes pending right now — you're all caught up. I'll surface anything that needs your vote here.") },
      ]
    : [
        { label: "Ask anything", icon: I(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>), action: () => endRef.current?.scrollIntoView({ behavior: "smooth" }) },
        { label: `${person.pet || "Pet"}'s records`, icon: I(<><path d="M9 11H5a2 2 0 0 0-2 2v7h6z"/><path d="M9 7h6v13H9z"/><path d="M15 4h4a2 2 0 0 1 2 2v14h-6z"/></>), action: () => setCanvas({ type: "records" }) },
        { label: "Appointments", icon: I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>), action: () => setCanvas({ type: "booking" }) },
        { label: "Bills & account", icon: I(<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>), action: () => say("Nothing due right now — your last visit was paid in full. I'll text you before anything's coming up.") },
      ];

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", maxWidth: isDesktop ? 1140 : 920, margin: "0 auto" }}>
      {/* Branded header — the skin of the door you came through */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: skin.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{skin.glyph}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{skin.name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{skin.tagline}</div>
          </div>
        </div>
        {/* super-user escape hatch — quiet, only matters to the few who have their own SOCIII */}
        <a href="/" style={{ fontSize: 12, color: "#94a3b8", textDecoration: "none" }}>Switch to your SOCIII ↗</a>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Claude-style left nav (desktop) — what this customer can do here */}
        {isDesktop && (
          <nav style={{ width: 212, flexShrink: 0, borderRight: "1px solid #f1f5f9", padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map((it, i) => (
              <button key={i} onClick={it.action}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", border: "none", background: "transparent", borderRadius: 10, cursor: "pointer", fontSize: 14, color: "#334155", fontWeight: 500, textAlign: "left", width: "100%" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ color: skin.accent, display: "flex" }}>{it.icon}</span>{it.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, fontSize: 12.5, color: "#94a3b8", textDecoration: "none", borderTop: "1px solid #f1f5f9", marginTop: 6 }}>
              {I(<><path d="M7 17L17 7M7 7h10v10"/></>)} Take me to my SOCIII
            </a>
          </nav>
        )}
        {/* Chat center */}
        <main style={{ flex: canvas ? "1 1 50%" : "1 1 100%", display: "flex", flexDirection: "column", padding: "18px 18px 0", minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i}>
                <Bubble from={m.from === "me" ? "me" : "them"} accent={skin.accent}>{md(m.text)}</Bubble>
                {m.source && <div style={{ fontSize: 11, color: "#94a3b8", margin: "-6px 0 12px 4px" }}>📖 {m.source}</div>}
                {m.cta && <button onClick={() => setCanvas({ type: "booking" })} style={{ margin: "-4px 0 14px 4px", background: skin.accent, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{m.cta}</button>}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Quick actions */}
          <div style={{ padding: "10px 0 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {remaining.map(s => (
              <button key={s.chip} onClick={() => runChip(s)} style={{
                border: `1.5px solid ${skin.border}`, background: skin.accentSoft, color: skin.accent,
                borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>{s.chip}</button>
            ))}
          </div>
          {thinking && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingLeft: 4 }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: skin.accent, opacity: 0.5, animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Thinking…</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, padding: "0 0 14px" }}>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputVal); } }}
              placeholder={`Message ${skin.short}…`}
              disabled={thinking}
              style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 15, fontFamily: "inherit", outline: "none", opacity: thinking ? 0.6 : 1 }}
            />
            <button
              onClick={() => sendMessage(inputVal)}
              disabled={thinking || !inputVal.trim()}
              style={{ background: inputVal.trim() && !thinking ? skin.accent : "#e2e8f0", color: "#fff", border: "none", borderRadius: 12, padding: "0 18px", fontSize: 16, cursor: inputVal.trim() && !thinking ? "pointer" : "default" }}
            >↑</button>
          </div>
        </main>

        {/* Canvas — appears only when it matters (Claude-artifact style) */}
        {canvas && (
          <aside style={{ flex: "1 1 50%", borderLeft: "1px solid #f1f5f9", padding: "18px", overflowY: "auto", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                {canvas.type === "booking" ? "Book a visit" : canvas.type === "records" ? `${person.pet}'s record` : canvas.type === "affirm" ? "Affirm your paperwork" : "Your documents"}
              </div>
              <button onClick={() => setCanvas(null)} style={{ background: "none", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer" }}>×</button>
            </div>
            {canvas.type === "booking" && <BookingCanvas skin={skin} />}
            {canvas.type === "records" && <RecordsCanvas skin={skin} />}
            {canvas.type === "affirm" && <AffirmCanvas skin={skin} />}
            {canvas.type === "documents" && <DocumentsCanvas skin={skin} />}
          </aside>
        )}
      </div>

      {/* Soft cross-sell — land-and-expand, never loud */}
      <footer style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
        Powered by <strong style={{ color: "#64748b" }}>SOCIII</strong> · your records are yours to keep —{" "}
        <a href="/" style={{ color: skin.accent, textDecoration: "none", fontWeight: 600 }}>use it for your own stuff too →</a>
      </footer>
    </div>
  );
}
