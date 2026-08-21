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
 *         /portal?company=texas-title&persona=buyer&orderId=xxx
 *         /portal?company=texas-title&persona=seller&orderId=xxx
 *         /portal?company=attorneys-title&persona=buyer&orderId=xxx   (Henderson County TX demo)
 *         /portal?company=attorneys-title&persona=seller&orderId=xxx
 */

import React, { useState, useRef, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";

// Same authed-API pattern the rest of the app uses (liveData.js): the Cloudflare
// frontdoor at /api?path=/v1/... with a Firebase bearer token.
const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// CODEX S52.56 (Garcia customer portal) — which tenant a title company's
// portal company-key belongs to, so buyer/seller can hit the real
// entitlement-checked order endpoint (GET /v1/title:customer:order) and the
// real chat pipeline with the right X-Tenant-Id. Only companies with a real,
// verified tenant get real data; anything else stays on the scripted demo
// (isTitlePersona still works, it just won't have live order data behind it).
const TENANT_IDS = {
  "attorneys-title": "demo-attorneys-title-001",
};
// Real, live worker slug for the title vertical (verified: functions/functions/
// index.js references workers/re-title-search-001/handler.js; persona name in
// the internal app is "Petra" — kept internal-only here, the customer-facing
// greeting doesn't name it, see CODEX S52.56's identity-scope note).
const TITLE_WORKER_SLUG = "re-title-search-001";

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
  "texas-title": {
    name: "Texas Title",
    short: "Title",
    accent: "#1e40af", accentSoft: "#eff6ff", border: "#bfdbfe",
    glyph: "⊞",
    tagline: "Your title order status",
  },
  "attorneys-title": {
    name: "ABC Title Company",
    short: "ABC Title",
    accent: "#1e3a5f", accentSoft: "#f0f4f8", border: "#b0c4de",
    glyph: "⚖",
    tagline: "Henderson County, Texas — Athens, TX",
  },
};

// Demo identities — in production these are matched from the operator's CRM
// (Dr. Chen's 160 contacts / the advisor contact list) by phone/email.
const PEOPLE = {
  petowner: { name: "Mia", full: "Mia Wright", pet: "Clover", petKind: "Holland Lop rabbit" },
  advisor: { name: "Kent", full: "Kent Maxwell" },
  buyer: { name: "Sara", full: "Sara Kahele", role: "Buyer" },
  seller: { name: "Troy", full: "Troy Garris", role: "Seller" },
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
  buyer: [
    {
      chip: "Where is my title order?",
      canvas: { type: "title-order" },
    },
    {
      chip: "What do I need to sign?",
      reply: "You have **two documents** ready for your review:\n\n1. **Title Commitment** — shows what you're getting clear title to, any exceptions, and what the title company requires before closing. Review the B-2 exceptions carefully.\n\n2. **Closing Disclosure** — your itemized closing costs, cash to close, and the final settlement statement.\n\nI'll surface both on the right so you can review them now.",
      canvas: { type: "title-docs" },
    },
    {
      chip: "My Vault copies",
      reply: "After recording, your deed and title policy are permanently anchored in your personal SOCIII Vault — owned by you, yours to keep. I'll send you the link.",
      canvas: { type: "title-vault" },
    },
  ],
  seller: [
    {
      chip: "Where is my title order?",
      canvas: { type: "title-order" },
    },
    {
      chip: "When do I get my proceeds?",
      reply: "Your net proceeds are **$278,540**, disbursed same-day after recording. Texas is a wet-close state — all funds are confirmed before we record the deed, then proceeds wire immediately.\n\n**Steps remaining:** Seller signature → recording → wire.\n\nLet me show you where the closing stands.",
      canvas: { type: "title-order" },
    },
    {
      chip: "My signed documents",
      canvas: { type: "title-vault" },
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

function RecordsCanvas() {
  const rows = [
    ["Rabies vaccine", "Current · expires 2027-03-01", "#16a34a"],
    ["RHDV2 vaccine", "Current · expires 2026-11-10", "#16a34a"],
    ["Annual wellness exam", "Last visit 2026-03-04", "#64748b"],
    ["Spay surgery", "2025-09-18 · Dr. Chen", "#64748b"],
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Clover's record — yours, tamper-evident, owned for life. Travel, boarding, or a new vet: it comes with you.</div>
      {rows.map(([t, s]) => (
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
      try { if (auth.currentUser) token = await auth.currentUser.getIdToken(); } catch { /* ignore */ }
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
    } catch { /* graceful — demo still completes */ }
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
function RecordsCanvasLike({ rows, note }) {
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

function TitleOrderCanvas({ skin, persona, order }) {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");

  // CODEX S52.56 — step/date/risk-score visualization below is still
  // demo-styled (not verified against real event-type values in
  // titleOrders/{id}/events — mapping those to these 7 named steps is real
  // work not done in this pass). What IS real when `order` is loaded: the
  // property address and order code, replacing the hardcoded fixture.
  const steps = [
    { label: "Title Search", done: true,  date: "Jul 25" },
    { label: "Defect Review", done: true,  date: "Jul 25" },
    { label: "Commitment Issued", done: true,  date: "Jul 25" },
    { label: persona === "buyer" ? "Your Review" : "Seller Signature", done: false, date: "Pending" },
    { label: "Funds Received", done: false, date: "Pending" },
    { label: "Recording", done: false, date: "Pending" },
    { label: "Policy Issued", done: false, date: "Pending" },
  ];
  const currentStep = steps.find(s => !s.done) || steps[steps.length - 1];
  const address = order?.address || "313 Mayfair Dr, Athens, TX 75751";

  return (
    <div>
      {orderId && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontFamily: "monospace" }}>
          Order: {order?.orderCode || orderId.slice(0, 12) + "…"}
        </div>
      )}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 700, marginBottom: 2 }}>CURRENT STEP</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{currentStep.label}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{address}</div>
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < steps.length - 1 ? "1px solid #f1f5f9" : "none" }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            background: s.done ? "#15803d" : "#e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: s.done ? "#fff" : "#94a3b8", fontWeight: 700,
          }}>{s.done ? "✓" : i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: s.done ? 500 : 700, color: s.done ? "#64748b" : "#0f172a" }}>{s.label}</div>
          </div>
          <div style={{ fontSize: 12, color: s.done ? "#15803d" : "#94a3b8", fontWeight: s.done ? 700 : 400 }}>{s.date}</div>
        </div>
      ))}
      {!order && (
        <div style={{ marginTop: 14, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          Risk Score: <strong style={{ color: "#15803d" }}>15 / 100 — Clean</strong> · No open defects · Title chain verified
        </div>
      )}
    </div>
  );
}

function TitleDocsCanvas({ skin, persona }) {
  const docs = persona === "buyer"
    ? [
        ["Title Commitment", "Issued Jul 25 — review B-2 exceptions", "REVIEW REQUIRED"],
        ["Closing Disclosure", "Draft — awaiting final payoff figures", "DRAFT"],
        ["Affiliated Business Disclosure", "Required — please acknowledge", "SIGN REQUIRED"],
      ]
    : [
        ["Seller's Warranty Deed", "Prepared — requires your signature", "SIGN REQUIRED"],
        ["Payoff Authorization", "Wells Fargo payoff letter on file", "ON FILE"],
        ["Closing Disclosure (Seller)", "Draft — review your net proceeds", "DRAFT"],
      ];

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
        These documents are part of your title order. Signed copies go permanently into your SOCIII Vault — yours to keep after closing.
      </div>
      {docs.map(([title, sub, status]) => {
        const statusColor = status === "SIGN REQUIRED" ? "#b45309" : status === "ON FILE" ? "#15803d" : "#64748b";
        const statusBg = status === "SIGN REQUIRED" ? "#fef3c7" : status === "ON FILE" ? "#dcfce7" : "#f1f5f9";
        return (
          <div key={title} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>📄 {title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{sub}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: statusBg, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{status}</span>
            </div>
            {status === "SIGN REQUIRED" && (
              <button style={{
                marginTop: 10, padding: "9px 14px", background: skin.accent, color: "#fff",
                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%",
              }}>Review & Sign →</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TitleVaultCanvas({ skin, order }) {
  // CODEX S52.56 — deliberately out of scope for this pass: minting these as
  // real DTC records (the way the advisor persona's /v1/ir:advisor:step
  // already does) is its own, bigger piece of work, not built here. What's
  // real when `order` is loaded: the order code and purchase price, replacing
  // the fabricated recording number / coverage figure that were here before.
  const vaultDocs = [
    ["Recorded Deed", order ? `${order.orderCode || "Recording pending"}` : "Recording #: TX-2025-107442 · Jul 25", "HASH ANCHORED"],
    ["Owner's Title Policy", order?.purchasePrice ? `ALTA 2021 · $${Number(order.purchasePrice).toLocaleString()} coverage` : "ALTA 2021 · $650,000 coverage", "HASH ANCHORED"],
    ["Closing Disclosure", "Final settlement statement", "IN YOUR VAULT"],
    ["Title Commitment", "With all exceptions noted", "IN YOUR VAULT"],
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
        These are your permanent copies — tamper-evident, owned by you, not the title company. Share with your lender, attorney, or next buyer in seconds.
        {order && <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "#94a3b8" }}>Document types shown reflect your real order — the actual anchored records are minted at recording (not yet built for title in this release).</span>}
      </div>
      {vaultDocs.map(([title, sub, badge]) => (
        <div key={title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>📄 {title}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{sub}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{badge}</span>
        </div>
      ))}
      <a href="/" target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 14, textAlign: "center", color: skin.accent, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
        Open my full SOCIII Vault →
      </a>
    </div>
  );
}

function Confirmed({ title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 8px" }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

// CODEX S52.56 — sign-in gate for real (non-fixture) title customers. This is
// the simplest CORRECT default (real Firebase Auth email/password, verified
// server-side via the ID token — never a client-supplied email), not
// presented as Sean's final decision: the codex flags identity/entitlement
// mechanism as an open item, and a magic-link flow (services/magicLink.js
// exists for a different flow today — send/verify — and would need a decision
// on whether to reuse or extend it) is the likely better fit for a real
// non-technical customer who doesn't want to set a password. Left as a
// concrete, working placeholder rather than blocking the whole build on that
// decision.
function SignInGate({ skin, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function doSignIn(e) {
    e.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true); setErr(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSignedIn?.();
    } catch {
      setErr("We couldn't sign you in with that email and password. Check with your title company if you're not sure how to access your file.");
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={doSignIn} style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: skin.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{skin.glyph}</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Sign in to view your file</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>{skin.name} sent you access to your closing. Enter the email and password from that invite.</div>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email"
          style={{ display: "block", width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 15, fontFamily: "inherit", marginBottom: 10, outline: "none" }} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password"
          style={{ display: "block", width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 15, fontFamily: "inherit", marginBottom: 14, outline: "none" }} />
        {err && <div style={{ fontSize: 13, color: "#b45309", marginBottom: 12, lineHeight: 1.4 }}>{err}</div>}
        <button type="submit" disabled={busy || !email.trim() || !password} style={{
          width: "100%", padding: "13px", borderRadius: 10, border: "none", fontSize: 15, fontWeight: 700,
          cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1, background: skin.accent, color: "#fff",
        }}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

export default function ClientPortal() {
  const params = new URLSearchParams(window.location.search);
  const companyKey = params.get("company") || "meadow-vet";
  const persona = params.get("persona") || (companyKey === "sociii-advisors" ? "advisor" : (companyKey === "texas-title" || companyKey === "attorneys-title") ? "buyer" : "petowner");
  const skin = SKINS[companyKey] || SKINS["meadow-vet"];
  const scripts = SCRIPTS[persona] || SCRIPTS.petowner;
  const isTitlePersona = persona === "buyer" || persona === "seller";
  const orderId = params.get("orderId");
  const tenantId = TENANT_IDS[companyKey] || null;
  // Real title data available for this persona only when we have a tenant we
  // trust, an orderId, and (checked below) an authenticated + entitled user.
  const hasRealTitleBacking = isTitlePersona && !!tenantId && !!orderId;

  // CODEX S52.56 — real auth state, not a fixture. Buyer/seller only:
  // petowner/advisor keep their existing scripted behavior untouched.
  const [user, setUser] = useState(auth.currentUser);
  useEffect(() => {
    if (!hasRealTitleBacking) return;
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, [hasRealTitleBacking]);

  // Real order data, fetched only once the customer is authenticated. Entitlement
  // is enforced server-side (GET /v1/title:customer:order) — this fetch either
  // returns the caller's own order or a generic "not found" for anyone else's.
  const [order, setOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState(hasRealTitleBacking ? "pending" : "unavailable"); // pending | ok | denied | unavailable
  useEffect(() => {
    if (!hasRealTitleBacking || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `${API_BASE}/api?path=${encodeURIComponent("/v1/title:customer:order")}&orderId=${encodeURIComponent(orderId)}`,
          { headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId } }
        );
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (j && j.ok && j.order) { setOrder(j.order); setOrderStatus("ok"); }
        else setOrderStatus("denied");
      } catch { if (!cancelled) setOrderStatus("denied"); }
    })();
    return () => { cancelled = true; };
  }, [hasRealTitleBacking, user, orderId, tenantId]);

  // person: real name once the order loads (first name only, for the casual
  // greeting), falling back to the existing fixture identity otherwise — so
  // petowner/advisor and any not-yet-loaded/denied title case are unaffected.
  const realFullName = order ? (persona === "seller" ? order.sellerName : order.buyerName) : null;
  const person = realFullName
    ? { name: realFullName.split(/[\s&]/)[0], full: realFullName, role: persona === "seller" ? "Seller" : "Buyer" }
    : (PEOPLE[persona] || PEOPLE.petowner);

  const greeting = persona === "advisor"
    ? `Hi ${person.name} 👋 Your advisor paperwork is ready — let's get it affirmed.`
    : isTitlePersona
    ? `Hi ${person.name} 👋 I'm your title order assistant. Your file is in progress — let me show you where things stand and what's needed from you.`
    : `Hi ${person.name} 👋 I'm here for ${person.pet} (${person.petKind}), 24/7. Ask me anything, or book a visit.`;

  const [messages, setMessages] = useState([{ from: "them", text: greeting }]);
  const [canvas, setCanvas] = useState(null);
  const [used, setUsed] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, canvas, thinking]);

  // Patch the greeting in-place once the real name loads (avoids a visible
  // fixture-name-then-real-name flicker if the order fetch resolves after the
  // first render, which it always will — it's an async fetch).
  useEffect(() => {
    if (!realFullName) return;
    setMessages(m => (m.length === 1 && m[0].from === "them" ? [{ from: "them", text: greeting }] : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realFullName]);

  const lsKey = `portal-welcomed-${companyKey}-${persona}`;
  const [welcomed, setWelcomed] = useState(() => localStorage.getItem(lsKey) === "1");
  function dismissWelcome() { localStorage.setItem(lsKey, "1"); setWelcomed(true); }

  function portalReply(text) {
    const t = text.toLowerCase();
    if (persona === "advisor") {
      if (/affirm|sign|agree|document/.test(t)) return "Your agreement and 83(b) are ready. Tap **Affirm my advisor agreement** above to review and confirm — takes about 30 seconds.";
      if (/equity|share|percent|vesting/.test(t)) return "You're receiving 0.5% equity, vesting over 12 months from the grant date (2026-06-18). The 83(b) election was filed to lock in the low tax basis — your copy is in your Vault.";
      if (/vault|record|document|file/.test(t)) return "Your signed documents (Advisor Agreement + 83(b) copy + W-9) are in your personal SOCIII Vault — owned by you, not SOCIII, for life.";
      if (/pay|compensat|earn/.test(t)) return "Advisors earn on equity value appreciation. No cash comp in the advisor program — the upside is your stake in SOCIII growing with the platform.";
      return "I can help with your advisor paperwork, equity details, and Vault documents. What would you like to know?";
    }
    // title persona — buyer or seller
    if (isTitlePersona) {
      if (/where.*order|status|progress|stand|step/.test(t)) { setTimeout(() => setCanvas({ type: "title-order" }), 200); return "Opened your order status. Steps 1–3 are complete — you're at the review step now."; }
      if (/sign|document|deed|commit/.test(t)) { setTimeout(() => setCanvas({ type: "title-docs" }), 200); return persona === "buyer" ? "You have documents ready — your Title Commitment and Affiliated Business Disclosure both need attention. Tap **What do I need to sign?** or I'll open them now." : "Your Seller's Warranty Deed is ready for your signature. I've opened it on the right — tap **Review & Sign** to complete it."; }
      if (/vault|record|deed|policy|copies|permanent/.test(t)) { setTimeout(() => setCanvas({ type: "title-vault" }), 200); return "Here are your permanent copies — tamper-evident, yours to keep forever. The Recorded Deed and Owner's Title Policy are hash-anchored on the SOCIII chain."; }
      if (/mineral|right|sever|oil|gas|subsurface/.test(t)) return "The mineral rights for 313 Mayfair Dr were severed in 1978 — Garris Family LP retains subsurface oil, gas, and mineral rights. **You are buying surface rights only.** This is disclosed in Schedule B-2 Exception 7 of your Title Commitment.";
      if (/record|county|filed|when.*done|how long/.test(t)) return "Recording was submitted to Henderson County Clerk today. Typical turnaround is 2–4 hours. Once the county confirms the recording number, proceeds release automatically.";
      if (/proceeds|money|wire|pay|disburs|net/.test(t)) return persona === "seller" ? "Your net proceeds are **$278,540**, wired same-day after recording. Troy, you should receive it by end of business today." : "The wire of $289,450 was confirmed received and cleared. You're all set on funds — we're in the recording step now.";
      if (/wire.*fraud|fraud|impersonat|scam|email.*change/.test(t)) return "**Important:** We will NEVER change wire instructions by email. If you receive any email asking you to send funds to a different account, call us at (903) 675-2100 before doing anything. Wire fraud is the #1 threat in real estate closings.";
      return "I'm your title order assistant for file ATH-2026-0743 — 313 Mayfair Dr, Athens TX. Ask me where your order stands, what you need to sign, or when proceeds are released.";
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

  // CODEX S52.56 — real chat for buyer/seller once entitled (order loaded).
  // Same worker + same universal Studio Locker grounding every other chat in
  // this app gets (see CODEX S52.57) — scoped server-side to process/status
  // only via context.source (see index.js's client_portal scope-limit block).
  const chatSessionIdRef = useRef(`portal_${companyKey}_${persona}_${orderId || "noorder"}_${Date.now()}`);
  async function sendRealTitleChat(t) {
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/chat:message")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({
        message: t,
        userInput: t,
        sessionId: chatSessionIdRef.current,
        selectedWorker: TITLE_WORKER_SLUG,
        context: { source: "client_portal", orderId, persona },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    return j.response || j.message || "I'm not able to answer that right now — please try again in a moment.";
  }

  async function sendMessage(text) {
    if (!text.trim() || thinking) return;
    const t = text.trim();
    setInputVal("");
    setMessages(m => [...m, { from: "me", text: t }]);
    setThinking(true);
    if (hasRealTitleBacking && user && orderStatus === "ok") {
      try {
        const reply = await sendRealTitleChat(t);
        setMessages(m => [...m, { from: "them", text: reply }]);
      } catch {
        setMessages(m => [...m, { from: "them", text: "Sorry, I couldn't reach your file just now — please try again in a moment, or call us directly." }]);
      }
      setThinking(false);
      return;
    }
    // Fallback: scripted reply — used for petowner/advisor always, and for
    // title personas when there's no real backing (no tenant mapping for this
    // company, no orderId, not signed in yet, or not entitled to this order).
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
  function scrollToEnd() { endRef.current?.scrollIntoView({ behavior: "smooth" }); }
  const navItems = persona === "advisor"
    ? [
        { label: "My agreements", icon: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>), action: () => setCanvas({ type: "affirm" }) },
        { label: "My documents", icon: I(<><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"/><path d="M3 7h18l-1.4 11A2 2 0 0 1 17.6 20H6.4A2 2 0 0 1 4.4 18z"/></>), action: () => setCanvas({ type: "documents" }) },
        { label: "My votes", icon: I(<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>), action: () => say("No board votes pending right now — you're all caught up. I'll surface anything that needs your vote here.") },
      ]
    : isTitlePersona
    ? [
        { label: "Order status", icon: I(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>), action: () => setCanvas({ type: "title-order" }) },
        { label: "Documents to sign", icon: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 11h6"/></>), action: () => setCanvas({ type: "title-docs" }) },
        { label: "My Vault copies", icon: I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>), action: () => setCanvas({ type: "title-vault" }) },
        { label: "Ask a question", icon: I(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>), action: scrollToEnd },
      ]
    : [
        { label: "Ask anything", icon: I(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>), action: scrollToEnd },
        { label: `${person.pet || "Pet"}'s records`, icon: I(<><path d="M9 11H5a2 2 0 0 0-2 2v7h6z"/><path d="M9 7h6v13H9z"/><path d="M15 4h4a2 2 0 0 1 2 2v14h-6z"/></>), action: () => setCanvas({ type: "records" }) },
        { label: "Appointments", icon: I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>), action: () => setCanvas({ type: "booking" }) },
        { label: "Bills & account", icon: I(<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>), action: () => say("Nothing due right now — your last visit was paid in full. I'll text you before anything's coming up.") },
      ];

  // CODEX S52.56 — for a real (non-fixture) title company, buyer/seller must
  // sign in before anything real loads. Not shown for petowner/advisor or for
  // companies without a verified tenant mapping (those stay on the existing
  // scripted demo, unaffected).
  if (hasRealTitleBacking && !user) {
    return <SignInGate skin={skin} onSignedIn={() => {}} />;
  }

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
            {/* eslint-disable-next-line react-hooks/refs */}
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
          {/* "Why care" welcome card — shown once, dismissed to localStorage */}
          {!welcomed && (
            <div style={{
              border: `1px solid ${skin.border}`,
              borderTop: `3px solid ${skin.accent}`,
              background: skin.accentSoft,
              borderRadius: 14,
              padding: "16px 18px",
              marginBottom: 14,
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}>
              <div style={{ fontSize: 26, lineHeight: 1 }}>{persona === "advisor" ? "📋" : isTitlePersona ? skin.glyph : "🩺"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                  {persona === "advisor"
                    ? "Your advisor papers are ready to affirm"
                    : isTitlePersona
                    ? `Your title order is in progress`
                    : `${person.pet}'s health record lives here`}
                </div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                  {persona === "advisor"
                    ? "Advisor agreement + 83(b) election — secured in your personal Vault, owned by you, forever."
                    : isTitlePersona
                    ? `Track your closing, review documents, and sign — everything in one place. After recording, your deed and title policy live in your personal SOCIII Vault.`
                    : `Tamper-evident, owned by you — not the clinic. Share with any vet, boarding, or travel carrier in seconds.`}
                </div>
              </div>
              <button onClick={dismissWelcome} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 0 0 4px", flexShrink: 0 }}>×</button>
            </div>
          )}
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
                {canvas.type === "booking" ? "Book a visit"
                  : canvas.type === "records" ? `${person.pet}'s record`
                  : canvas.type === "affirm" ? "Affirm your paperwork"
                  : canvas.type === "title-order" ? "Your title order"
                  : canvas.type === "title-docs" ? "Documents"
                  : canvas.type === "title-vault" ? "Your Vault copies"
                  : "Your documents"}
              </div>
              <button onClick={() => setCanvas(null)} style={{ background: "none", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer" }}>×</button>
            </div>
            {canvas.type === "booking" && <BookingCanvas skin={skin} />}
            {canvas.type === "records" && <RecordsCanvas skin={skin} />}
            {canvas.type === "affirm" && <AffirmCanvas skin={skin} />}
            {canvas.type === "documents" && <DocumentsCanvas skin={skin} />}
            {canvas.type === "title-order" && <TitleOrderCanvas skin={skin} persona={persona} order={order} />}
            {canvas.type === "title-docs" && <TitleDocsCanvas skin={skin} persona={persona} />}
            {canvas.type === "title-vault" && <TitleVaultCanvas skin={skin} order={order} />}
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
