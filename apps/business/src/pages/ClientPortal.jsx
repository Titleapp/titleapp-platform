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
  if (affirmed) return <Confirmed skin={skin} title="Affirmed ✓" sub="Your Advisor Agreement + 83(b) election are in your Vault, anchored on-chain. Yours to keep." />;
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
      <button onClick={() => setAffirmed(true)} style={{
        width: "100%", marginTop: 16, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: "pointer", background: skin.accent, color: "#fff",
      }}>Affirm — yes, these are mine</button>
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
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, canvas]);

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

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", maxWidth: 920, margin: "0 auto" }}>
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
          <div style={{ display: "flex", gap: 8, padding: "0 0 14px" }}>
            <input placeholder={`Message ${skin.short}…`} style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 15, fontFamily: "inherit", outline: "none" }} />
            <button style={{ background: skin.accent, color: "#fff", border: "none", borderRadius: 12, padding: "0 18px", fontSize: 16, cursor: "pointer" }}>↑</button>
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
