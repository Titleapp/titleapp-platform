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
 *         /portal?company=merritt-capital&persona=tenant             (Merritt Capital Group demo — CODEX title/RE merge, 2026-08-20)
 *         /portal?company=makai-nursing&persona=student               (Makai School of Nursing demo, 2026-08-20)
 *         /portal?company=uh-nursing&persona=student                  (UH Mānoa demo, 2026-08-20)
 *         /passport/:passportId                                       (DPP end-consumer scan — public, no login, rewrites to ?company=nordholm&persona=consumer&passportId=..., 2026-08-20)
 *         /portal?company=meridian-servicing&persona=borrower           (Meridian Loan Servicing demo — MSR Servicing & Compliance, CODEX S52.60, 2026-08-21)
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
  "merritt-capital": "ws_1783659066844_o7m1pm",
  "makai-nursing": "demo-makai-nursing",
  "uh-nursing": "demo-uh-nursing",
  "meridian-servicing": "demo-meridian-servicing-001",
};
// Real, live worker slug for the title vertical (verified: functions/functions/
// index.js references workers/re-title-search-001/handler.js; persona name in
// the internal app is "Petra" — kept internal-only here, the customer-facing
// greeting doesn't name it, see CODEX S52.56's identity-scope note).
const TITLE_WORKER_SLUG = "re-title-search-001";
// Real, live worker for student chat — same content the operator app's
// nursing-education-001 uses, scoped server-side via context.persona="student".
const STUDENT_WORKER_SLUG = "nursing-education-001";
// Real, live worker for MSR borrower chat — CODEX S52.60, scoped server-side
// via context.persona="borrower". Persona name is "Dana" internally.
const MSR_WORKER_SLUG = "msr-servicing-001";

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
  "merritt-capital": {
    name: "Merritt Capital Group",
    short: "Merritt Capital",
    accent: "#0f766e", accentSoft: "#f0fdfa", border: "#99f6e4",
    glyph: "🏢",
    tagline: "Your residence, in one place",
  },
  "makai-nursing": {
    name: "Makai School of Nursing",
    short: "Makai Nursing",
    accent: "#7c3aed", accentSoft: "#faf5ff", border: "#ddd6fe",
    glyph: "🎓",
    tagline: "Your clinical progress, in one place",
  },
  "uh-nursing": {
    name: "UH Mānoa School of Nursing",
    short: "UH Mānoa Nursing",
    accent: "#065f46", accentSoft: "#ecfdf5", border: "#a7f3d0",
    glyph: "🎓",
    tagline: "Your clinical progress, in one place",
  },
  "nordholm": {
    name: "Nordholm",
    short: "Nordholm",
    accent: "#1c1917", accentSoft: "#fafaf9", border: "#e7e5e4",
    glyph: "🌿",
    tagline: "Digital Product Passport",
  },
  "meridian-servicing": {
    name: "Meridian Loan Servicing",
    short: "Meridian",
    accent: "#1e3a5f", accentSoft: "#f0f4f8", border: "#b0c4de",
    glyph: "🏦",
    tagline: "Your mortgage, in one place",
  },
};

// Demo identities — in production these are matched from the operator's CRM
// (Dr. Chen's 160 contacts / the advisor contact list) by phone/email.
const PEOPLE = {
  petowner: { name: "Mia", full: "Mia Wright", pet: "Clover", petKind: "Holland Lop rabbit" },
  advisor: { name: "Kent", full: "Kent Maxwell" },
  buyer: { name: "Sara", full: "Sara Kahele", role: "Buyer" },
  seller: { name: "Troy", full: "Troy Garris", role: "Seller" },
  tenant: { name: "Sara", full: "Sara Kahele", unit: "Unit 214", property: "Merritt Capital — Lakeview Commons" },
  student: { name: "Sara", full: "Sara Kahele" },
  consumer: { name: "there" }, // anonymous — no identity at all, this is a public product scan
  borrower: { name: "Denise", full: "Denise Okafor" },
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
  tenant: [
    {
      chip: "When is rent due?",
      reply: "Rent for **Unit 214** is $1,850/mo, due on the 1st with a 5-day grace period. You're paid through **September 1** — nothing due right now.",
      canvas: { type: "lease" },
    },
    {
      chip: "Submit a maintenance request",
      canvas: { type: "maintenance" },
    },
    {
      chip: "My lease documents",
      canvas: { type: "tenant-docs" },
    },
  ],
  student: [
    {
      chip: "How am I doing on clinical hours?",
      canvas: { type: "progress" },
    },
    {
      chip: "My verified competencies",
      canvas: { type: "competencies" },
    },
  ],
  consumer: [
    {
      chip: "What's this made of?",
      canvas: { type: "passport" },
    },
    {
      chip: "Can I recycle this?",
      canvas: { type: "passport" },
    },
    {
      chip: "Where was this made?",
      canvas: { type: "passport" },
    },
  ],
  borrower: [
    {
      chip: "What's my loan status?",
      canvas: { type: "loan-status" },
    },
    {
      chip: "Request hardship assistance",
      canvas: { type: "hardship" },
    },
    {
      chip: "My open disputes",
      canvas: { type: "error-requests" },
    },
    {
      chip: "Report a problem or request info",
      canvas: { type: "error-request-form" },
    },
    {
      chip: "Submit proof of insurance",
      canvas: { type: "insurance-proof" },
    },
    {
      chip: "Request a payoff statement",
      canvas: { type: "payoff-request" },
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

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function LeaseCanvas({ skin, lease }) {
  const rent = lease?.rentAmountCents ? `$${(lease.rentAmountCents / 100).toLocaleString()} / month` : "$1,850 / month";
  const paidThrough = lease?.paidThroughDate ? fmtDate(lease.paidThroughDate) : "September 1, 2026";
  const leaseEnd = lease?.leaseEnd ? fmtDate(lease.leaseEnd) : "May 31, 2027";
  const deposit = lease?.securityDepositCents ? `$${(lease.securityDepositCents / 100).toLocaleString()} · on file` : "$1,850 · on file";
  const rows = [
    ["Rent", rent, "#0f172a"],
    ["Paid through", paidThrough, "#0f766e"],
    ["Lease term", `ends ${leaseEnd}`, "#0f172a"],
    ["Security deposit", deposit, "#0f172a"],
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{lease?.unitLabel || "Unit 214"} · {lease?.propertyName || "Lakeview Commons"}</div>
      {rows.map(([t, s]) => (
        <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{t}</div>
          <div style={{ fontSize: 14, color: s === "#0f172a" ? "#64748b" : s, fontWeight: 600 }}>{s}</div>
        </div>
      ))}
      <button style={{
        width: "100%", marginTop: 16, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: "pointer", background: skin.accent, color: "#fff",
      }}>Pay rent →</button>
    </div>
  );
}

function MaintenanceCanvas({ skin, history, onSubmit }) {
  const [issue, setIssue] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const categories = ["Plumbing", "Electrical", "Appliance", "HVAC", "Other"];
  const [cat, setCat] = useState(null);
  async function submit() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      await onSubmit?.(cat, issue.trim());
      setDone(true);
    } catch {
      setErr("Couldn't submit that just now — please try again in a moment.");
    }
    setBusy(false);
  }
  if (done) return <Confirmed skin={skin} title="Request submitted" sub="Merritt Capital's maintenance team will reach out within 24 hours to schedule a visit." />;
  return (
    <div>
      {history && history.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Past requests</div>
          {history.map(h => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{h.category}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{h.description}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: h.status === "resolved" ? "#15803d" : "#b45309", background: h.status === "resolved" ? "#dcfce7" : "#fef3c7", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{(h.status || "").toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>What's the issue?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            border: `1.5px solid ${cat === c ? skin.accent : "#e2e8f0"}`,
            background: cat === c ? skin.accentSoft : "#fff", color: "#0f172a",
          }}>{c}</button>
        ))}
      </div>
      <textarea
        value={issue}
        onChange={e => setIssue(e.target.value)}
        placeholder="Briefly describe what's going on…"
        rows={4}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical" }}
      />
      {err && <div style={{ fontSize: 12, color: "#b45309", marginTop: 8 }}>{err}</div>}
      <button disabled={!cat || !issue.trim() || busy} onClick={submit} style={{
        width: "100%", marginTop: 12, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: (cat && issue.trim() && !busy) ? "pointer" : "not-allowed",
        background: (cat && issue.trim() && !busy) ? skin.accent : "#e2e8f0", color: "#fff",
      }}>{busy ? "Submitting…" : "Submit request"}</button>
    </div>
  );
}

function TenantDocsCanvas({ skin, lease }) {
  const moveIn = lease?.leaseStart ? fmtDate(lease.leaseStart) : "Jun 1, 2026";
  return <RecordsCanvasLike skin={skin} rows={[
    ["Lease Agreement.pdf", `Signed · ${moveIn}`],
    ["Move-in Inspection.pdf", moveIn],
    ["Renter's Insurance Certificate.pdf", "On file"],
  ]} note="Your lease documents — always available here." />;
}

function ProgressCanvas({ skin, student }) {
  const hours = student?.clinicalHours ?? 0;
  const required = student?.clinicalHoursRequired ?? 500;
  const pct = Math.min(100, Math.round((hours / required) * 100));
  const rows = [
    ["Clinical hours", `${hours} / ${required}`, "#0f172a"],
    ["ATI score", student?.atiScore != null ? student.atiScore : "—", "#0f172a"],
    ["Courses completed", student?.coursesComplete != null ? student.coursesComplete : "—", "#0f172a"],
    ["Status", student?.status === "ready" ? "NCLEX ready" : student?.status === "in-progress" ? "In progress" : (student?.status || "—"), "#7c3aed"],
  ];
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          <span>Clinical hours progress</span><span>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 8, background: "#f1f5f9", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: skin.accent, borderRadius: 8 }} />
        </div>
      </div>
      {rows.map(([t, s]) => (
        <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{t}</div>
          <div style={{ fontSize: 14, color: s === "#0f172a" ? "#64748b" : s, fontWeight: 600 }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function CompetenciesCanvas({ skin, competencies }) {
  if (!competencies || competencies.length === 0) {
    return <div style={{ fontSize: 13, color: "#64748b" }}>No competencies recorded yet — check back after your next clinical rotation.</div>;
  }
  return (
    <div>
      {competencies.map((c, i) => (
        <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{c.competency}</div>
            <span style={{
              fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", padding: "2px 8px", borderRadius: 20,
              color: c.status === "verified" ? "#15803d" : "#b45309",
              background: c.status === "verified" ? "#dcfce7" : "#fef3c7",
            }}>{(c.status || "").toUpperCase()}</span>
          </div>
          {c.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{c.notes}</div>}
          {c.attestedAt && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Attested {c.attestedAt}</div>}
        </div>
      ))}
    </div>
  );
}

function PassportCanvas({ passport }) {
  if (!passport) return <div style={{ fontSize: 13, color: "#64748b" }}>Loading passport…</div>;
  return (
    <div>
      <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{passport.brandName}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{passport.productName}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{passport.category} · {passport.sku}</div>

      <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Materials</div>
      {(passport.materials || []).map((m, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 13, color: "#0f172a" }}>{m.name} <span style={{ color: "#94a3b8" }}>· {m.origin}</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{m.percent}%</div>
        </div>
      ))}

      {passport.manufacturing && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 8px" }}>Manufacturing</div>
          <div style={{ fontSize: 13, color: "#0f172a" }}>{passport.manufacturing.facility}, {passport.manufacturing.country}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{(passport.manufacturing.certifications || []).join(" · ")}</div>
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 8px" }}>Carbon footprint</div>
      <div style={{ fontSize: 13, color: "#0f172a" }}>{passport.carbonFootprintKgCO2e} kg CO₂e</div>

      {passport.recyclability && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 8px" }}>Recyclability</div>
          <div style={{ fontSize: 13, color: "#0f172a" }}>{passport.recyclability.instructions}</div>
        </>
      )}

      {passport.careInstructions && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 8px" }}>Care</div>
          <div style={{ fontSize: 13, color: "#0f172a" }}>{passport.careInstructions}</div>
        </>
      )}

      {passport.complianceStandard && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 18, lineHeight: 1.5 }}>{passport.complianceStandard}</div>
      )}
    </div>
  );
}

function LoanStatusCanvas({ skin, loan }) {
  if (!loan) return <div style={{ fontSize: 13, color: "#64748b" }}>Loading your loan status…</div>;
  const rows = [
    ["Property", loan.propertyAddress || "—", "#0f172a"],
    ["Unpaid principal balance", loan.upb != null ? `$${Number(loan.upb).toLocaleString()}` : "—", "#0f172a"],
    ["Status", loan.status === "delinquent" ? "Delinquent" : loan.status === "current" ? "Current" : (loan.status || "—"), loan.status === "delinquent" ? "#b45309" : "#15803d"],
    ["Escrow shortage", loan.escrowShortage ? `$${Number(loan.escrowShortage).toLocaleString()}` : "None", loan.escrowShortage ? "#b45309" : "#15803d"],
  ];
  return (
    <div>
      {rows.map(([t, s, c]) => (
        <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{t}</div>
          <div style={{ fontSize: 14, color: c, fontWeight: 600 }}>{s}</div>
        </div>
      ))}
      {loan.hasActiveForbearance && (
        <div style={{ marginTop: 14, padding: "10px 12px", background: "#eff6ff", borderRadius: 8, fontSize: 12, color: "#1e40af" }}>
          You have an active forbearance on this loan. Fees that would otherwise apply during delinquency are suspended while it's active.
        </div>
      )}
      <button style={{
        width: "100%", marginTop: 16, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: "pointer", background: skin.accent, color: "#fff",
      }}>Make a payment →</button>
    </div>
  );
}

function HardshipCanvas({ skin, onSubmit, existingRequest, onSubmitDocument }) {
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [checkBusy, setCheckBusy] = useState(null);
  async function submit() {
    if (busy || !reason.trim()) return;
    setBusy(true); setErr(null);
    try {
      await onSubmit?.(reason.trim());
      setDone(true);
    } catch {
      setErr("Couldn't submit that just now — please try again in a moment.");
    }
    setBusy(false);
  }
  async function toggleDoc(docName) {
    if (checkBusy) return;
    setCheckBusy(docName);
    try { await onSubmitDocument?.(existingRequest.id, docName); } catch { /* leave unchecked, borrower can retry */ }
    setCheckBusy(null);
  }
  // Loss-mitigation document checklist (CODEX S52.60 borrower capability #3)
  // — shown once a hardship request already exists, in place of the intake
  // form. Comparing documentsRequired vs documentsSubmitted is informational,
  // never an eligibility decision (12 CFR 1024.41(c) stays a human call).
  if (existingRequest) {
    const required = existingRequest.documentsRequired || [];
    const submitted = existingRequest.documentsSubmitted || [];
    return (
      <div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
          Your hardship request is <strong>{(existingRequest.status || "submitted")}</strong>. Meridian's servicing team evaluates every option available to you before any decision is made (12 CFR 1024.41(c)).
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Documents needed</div>
        {required.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>No documents required yet.</div>}
        {required.map(doc => {
          const has = submitted.includes(doc);
          return (
            <label key={doc} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9", cursor: has ? "default" : "pointer" }}>
              <input type="checkbox" checked={has} disabled={has || checkBusy === doc} onChange={() => toggleDoc(doc)} />
              <span style={{ flex: 1, fontSize: 13, color: has ? "#15803d" : "#0f172a", textDecoration: has ? "line-through" : "none" }}>{doc}</span>
              {checkBusy === doc && <span style={{ fontSize: 11, color: "#94a3b8" }}>Saving…</span>}
            </label>
          );
        })}
        {required.length > 0 && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 12, lineHeight: 1.5 }}>
            Checking a box tells us you've sent that document separately (mail, upload, or in person) — it doesn't upload the file itself.
          </div>
        )}
      </div>
    );
  }
  if (done) return <Confirmed skin={skin} title="Request submitted" sub="Meridian's servicing team will review your situation and reach out about options. This does not itself grant or deny any assistance — a servicing team member makes that determination." />;
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
        Tell us what's going on. This starts your loss-mitigation review — Meridian's servicing team evaluates every option available to you before any decision is made (12 CFR 1024.41(c)).
      </div>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Briefly describe your situation…"
        rows={5}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical" }}
      />
      {err && <div style={{ fontSize: 12, color: "#b45309", marginTop: 8 }}>{err}</div>}
      <button disabled={!reason.trim() || busy} onClick={submit} style={{
        width: "100%", marginTop: 12, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: (reason.trim() && !busy) ? "pointer" : "not-allowed",
        background: (reason.trim() && !busy) ? skin.accent : "#e2e8f0", color: "#fff",
      }}>{busy ? "Submitting…" : "Submit request"}</button>
    </div>
  );
}

// ErrorRequestIntakeCanvas — CODEX S52.60 borrower self-service capability
// #1. A structured form (type toggle + subject + description), not free-text
// parsed by the AI — the model deciding "this counts as a formal NOE/RFI"
// would start a regulatory response clock on its own say-so, which is a real
// risk. This always uses the 30-day general-tier deadline server-side; the
// faster payoff-balance/owner-assignee tiers are intentionally not
// auto-detected here.
function ErrorRequestIntakeCanvas({ skin, onSubmit }) {
  const [type, setType] = useState("notice_of_error");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function submit() {
    if (busy || !subject.trim() || !description.trim()) return;
    setBusy(true); setErr(null);
    try {
      await onSubmit?.(type, subject.trim(), description.trim());
      setDone(true);
    } catch {
      setErr("Couldn't submit that just now — please try again in a moment.");
    }
    setBusy(false);
  }
  if (done) return <Confirmed skin={skin} title="Request filed" sub="We'll acknowledge this within 5 business days and respond within 30 days. Check My open disputes anytime for the status." />;
  const optionStyle = (active) => ({
    flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
    border: `1.5px solid ${active ? skin.accent : "#e2e8f0"}`,
    background: active ? skin.accentSoft : "#fff",
    color: active ? skin.accent : "#64748b",
  });
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>
        A <strong>Notice of Error</strong> reports something you believe is wrong on your account (a fee, a payment application, an escrow calculation). A <strong>Request for Information</strong> asks for information about your loan (who owns it, your payment history, your escrow account). Both start a formal response clock.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setType("notice_of_error")} style={optionStyle(type === "notice_of_error")}>Report a problem</button>
        <button onClick={() => setType("request_for_information")} style={optionStyle(type === "request_for_information")}>Request information</button>
      </div>
      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Short subject (e.g. 'Late fee charged in error')"
        style={{ display: "block", width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", marginBottom: 10, outline: "none" }}
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Describe what's wrong or what information you need…"
        rows={5}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical" }}
      />
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>We'll acknowledge this within 5 business days and respond within 30 days.</div>
      {err && <div style={{ fontSize: 12, color: "#b45309", marginTop: 8 }}>{err}</div>}
      <button disabled={!subject.trim() || !description.trim() || busy} onClick={submit} style={{
        width: "100%", marginTop: 12, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: (subject.trim() && description.trim() && !busy) ? "pointer" : "not-allowed",
        background: (subject.trim() && description.trim() && !busy) ? skin.accent : "#e2e8f0", color: "#fff",
      }}>{busy ? "Submitting…" : "Submit request"}</button>
    </div>
  );
}

// InsuranceProofCanvas — CODEX S52.60 borrower self-service capability #2.
// Intake only — submitting proof never itself waives or reverses a
// force-placed insurance charge, that's a human/servicing-system review.
function InsuranceProofCanvas({ skin, loan, insuranceSubmissions, onSubmit }) {
  const [insurerName, setInsurerName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const hasPending = (insuranceSubmissions || []).length > 0;
  async function submit() {
    if (busy || !insurerName.trim() || !policyNumber.trim() || !effectiveDate || !expirationDate) return;
    setBusy(true); setErr(null);
    try {
      await onSubmit?.(insurerName.trim(), policyNumber.trim(), effectiveDate, expirationDate);
      setDone(true);
    } catch {
      setErr("Couldn't submit that just now — please try again in a moment.");
    }
    setBusy(false);
  }
  if (done || hasPending) return <Confirmed skin={skin} title="Proof submitted — pending review" sub="Meridian's servicing team will review your policy information. This doesn't by itself waive or reverse any force-placed insurance charge — that's confirmed once review is complete." />;
  const fieldStyle = { display: "block", width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", marginBottom: 10, outline: "none" };
  return (
    <div>
      {loan?.forcePlacedInsuranceActive && (
        <div style={{ marginBottom: 14, padding: "10px 12px", background: "#fef3c7", borderRadius: 8, fontSize: 12, color: "#b45309", lineHeight: 1.5 }}>
          We sent a force-placed insurance notice on your file{loan.forcePlacedNoticeDate ? ` on ${loan.forcePlacedNoticeDate}` : ""}. Submit your own policy proof below to have it reviewed.
        </div>
      )}
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
        If you already have hazard insurance, submit your policy details so Meridian's team can review it.
      </div>
      <input value={insurerName} onChange={e => setInsurerName(e.target.value)} placeholder="Insurance company name" style={fieldStyle} />
      <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="Policy number" style={fieldStyle} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Effective date</div>
          <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} style={{ ...fieldStyle, marginBottom: 0 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Expiration date</div>
          <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} style={{ ...fieldStyle, marginBottom: 0 }} />
        </div>
      </div>
      {err && <div style={{ fontSize: 12, color: "#b45309", marginTop: 8 }}>{err}</div>}
      <button disabled={!insurerName.trim() || !policyNumber.trim() || !effectiveDate || !expirationDate || busy} onClick={submit} style={{
        width: "100%", marginTop: 14, padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: (insurerName.trim() && policyNumber.trim() && effectiveDate && expirationDate && !busy) ? "pointer" : "not-allowed",
        background: (insurerName.trim() && policyNumber.trim() && effectiveDate && expirationDate && !busy) ? skin.accent : "#e2e8f0", color: "#fff",
      }}>{busy ? "Submitting…" : "Submit proof of insurance"}</button>
    </div>
  );
}

// PayoffRequestCanvas — CODEX S52.60 borrower self-service capability #4.
// Single-button intake, no fields — never states or estimates a dollar
// amount (msr-no-fabricated-payoff-amount).
function PayoffRequestCanvas({ skin, onSubmit }) {
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function submit() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const dueBy = await onSubmit?.();
      setDone(dueBy || true);
    } catch {
      setErr("Couldn't submit that just now — please try again in a moment.");
    }
    setBusy(false);
  }
  if (done) return <Confirmed skin={skin} title="Payoff statement requested" sub={`You'll receive your payoff statement within 7 business days${typeof done === "string" ? ` (by ${done})` : ""}. We can't provide a specific payoff amount here in chat — it requires the servicing system's live calculation.`} />;
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
        Requesting a payoff statement logs a formal request with Meridian's servicing team. You'll receive the exact amount needed to pay off your loan as of a specific date within 7 business days (12 CFR 1024.35(b)(6)). We can't state a payoff amount here in chat — it requires a live calculation from the servicing system.
      </div>
      {err && <div style={{ fontSize: 12, color: "#b45309", marginBottom: 8 }}>{err}</div>}
      <button disabled={busy} onClick={submit} style={{
        width: "100%", padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer",
        background: skin.accent, color: "#fff", opacity: busy ? 0.7 : 1,
      }}>{busy ? "Requesting…" : "Request a payoff statement"}</button>
    </div>
  );
}

// CeaseCommunicationCanvas — CODEX S52.60 borrower self-service capability
// #5. Confirm-style action; msr-cease-communication-respected already exists
// as a hard stop, this just gives the borrower a real way to trigger the flag.
function CeaseCommunicationCanvas({ skin, loan, onSubmit }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function submit() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      await onSubmit?.();
      setDone(true);
    } catch {
      setErr("Couldn't submit that just now — please try again in a moment.");
    }
    setBusy(false);
  }
  if (done || loan?.ceaseCommunication) return <Confirmed skin={skin} title="Request on file" sub="We've noted your request to stop contacting you about this account. This doesn't stop notices we're legally required to send, and it doesn't pause your loan obligations." />;
  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
        You can ask Meridian to stop contacting you about this account (calls, letters, outreach). This does <strong>not</strong> stop notices we're legally required to send you, and it doesn't pause your loan obligations.
      </div>
      {err && <div style={{ fontSize: 12, color: "#b45309", marginBottom: 8 }}>{err}</div>}
      <button disabled={busy} onClick={submit} style={{
        width: "100%", padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer",
        background: skin.accent, color: "#fff", opacity: busy ? 0.7 : 1,
      }}>{busy ? "Submitting…" : "Yes, stop contacting me about this account"}</button>
    </div>
  );
}

function ErrorRequestsCanvas({ errorRequests }) {
  if (!errorRequests || errorRequests.length === 0) {
    return <div style={{ fontSize: 13, color: "#64748b" }}>No open disputes or information requests on file.</div>;
  }
  return (
    <div>
      {errorRequests.map(e => (
        <div key={e.id} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{e.subject || (e.type === "notice_of_error" ? "Notice of Error" : "Request for Information")}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Received {e.receivedDate || "—"}</div>
          <div style={{ fontSize: 12, marginTop: 4, color: e.responseLogged ? "#15803d" : "#b45309" }}>
            {e.responseLogged ? "Response sent" : `Response due ${e.responseDeadline || "—"}`}
          </div>
        </div>
      ))}
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
// Per-persona copy for SignInGate — hasRealBacking only ever routes buyer/seller
// (title), tenant, student, and borrower here (see hasRealBacking above), so
// those are the only personas covered; anything else falls back to the
// original title-industry wording.
const SIGN_IN_GATE_COPY = {
  title: { heading: "Sign in to view your file", body: "{name} sent you access to your closing. Enter the email and password from that invite.", errorWho: "your title company", errorWhat: "your file" },
  tenant: { heading: "Sign in to view your lease", body: "{name} sent you access to your resident portal. Enter the email and password from that invite.", errorWho: "your property manager", errorWhat: "your account" },
  student: { heading: "Sign in to view your coursework", body: "{name} sent you access to your nursing program. Enter the email and password from that invite.", errorWho: "your program coordinator", errorWhat: "your account" },
  borrower: { heading: "Sign in to view your loan", body: "{name} sent you access to your mortgage account. Enter the email and password from that invite.", errorWho: "your loan servicer", errorWhat: "your account" },
};

function SignInGate({ skin, persona, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const copy = SIGN_IN_GATE_COPY[persona] || SIGN_IN_GATE_COPY.title;

  async function doSignIn(e) {
    e.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true); setErr(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSignedIn?.();
    } catch {
      setErr(`We couldn't sign you in with that email and password. Check with ${copy.errorWho} if you're not sure how to access ${copy.errorWhat}.`);
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={doSignIn} style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: skin.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{skin.glyph}</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{copy.heading}</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>{copy.body.replace("{name}", skin.name)}</div>
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
  const persona = params.get("persona") || (companyKey === "sociii-advisors" ? "advisor" : (companyKey === "texas-title" || companyKey === "attorneys-title") ? "buyer" : companyKey === "merritt-capital" ? "tenant" : (companyKey === "makai-nursing" || companyKey === "uh-nursing") ? "student" : companyKey === "nordholm" ? "consumer" : companyKey === "meridian-servicing" ? "borrower" : "petowner");
  const skin = SKINS[companyKey] || SKINS["meadow-vet"];
  const scripts = SCRIPTS[persona] || SCRIPTS.petowner;
  const isTitlePersona = persona === "buyer" || persona === "seller";
  const isTenantPersona = persona === "tenant";
  const isStudentPersona = persona === "student";
  const isConsumerPersona = persona === "consumer";
  const isBorrowerPersona = persona === "borrower";
  const orderId = params.get("orderId");
  const passportId = params.get("passportId");
  const tenantId = TENANT_IDS[companyKey] || null;
  // Real title data available for this persona only when we have a tenant we
  // trust, an orderId, and (checked below) an authenticated + entitled user.
  const hasRealTitleBacking = isTitlePersona && !!tenantId && !!orderId;
  // Real lease data — same idea, no orderId concept for a tenancy.
  const hasRealTenantBacking = isTenantPersona && !!tenantId;
  // Real student profile — same idea, keyed by the student's own uid instead of an orderId.
  const hasRealStudentBacking = isStudentPersona && !!tenantId;
  // Real loan data — CODEX S52.60, keyed by the borrower's own uid.
  const hasRealBorrowerBacking = isBorrowerPersona && !!tenantId;
  const hasRealBacking = hasRealTitleBacking || hasRealTenantBacking || hasRealStudentBacking || hasRealBorrowerBacking;
  // Consumer/DPP is deliberately NOT part of hasRealBacking — it's real data
  // but genuinely public (no sign-in at all, like scanning a nutrition
  // label), so it must never trigger the SignInGate below.
  const hasConsumerBacking = isConsumerPersona && !!passportId;

  // CODEX S52.56 — real auth state, not a fixture. Buyer/seller/tenant/student/
  // borrower only: petowner/advisor/consumer keep their existing unauthenticated behavior.
  const [user, setUser] = useState(auth.currentUser);
  useEffect(() => {
    if (!hasRealBacking) return;
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, [hasRealBacking]);

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

  // Real lease + maintenance history — GET /v1/tenant:customer:lease, same
  // entitlement pattern as the title order fetch above.
  const [lease, setLease] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [leaseStatus, setLeaseStatus] = useState(hasRealTenantBacking ? "pending" : "unavailable");
  useEffect(() => {
    if (!hasRealTenantBacking || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/tenant:customer:lease")}`, {
          headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
        });
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (j && j.ok && j.lease) { setLease(j.lease); setMaintenanceHistory(j.maintenanceRequests || []); setLeaseStatus("ok"); }
        else setLeaseStatus("denied");
      } catch { if (!cancelled) setLeaseStatus("denied"); }
    })();
    return () => { cancelled = true; };
  }, [hasRealTenantBacking, user, tenantId]);

  // Real student profile + competencies — GET /v1/student:customer:profile,
  // same entitlement pattern as the lease fetch above.
  const [studentProfile, setStudentProfile] = useState(null);
  const [competencies, setCompetencies] = useState([]);
  const [studentStatus, setStudentStatus] = useState(hasRealStudentBacking ? "pending" : "unavailable");
  useEffect(() => {
    if (!hasRealStudentBacking || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/student:customer:profile")}`, {
          headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
        });
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (j && j.ok && j.student) { setStudentProfile(j.student); setCompetencies(j.competencies || []); setStudentStatus("ok"); }
        else setStudentStatus("denied");
      } catch { if (!cancelled) setStudentStatus("denied"); }
    })();
    return () => { cancelled = true; };
  }, [hasRealStudentBacking, user, tenantId]);

  // Real loan status + open error requests — GET /v1/msr:customer:loan,
  // CODEX S52.60, same entitlement pattern as the lease/student fetches.
  // Also carries the borrower's own hardship/insurance/payoff requests, for
  // the six self-service capabilities added below.
  const [loan, setLoan] = useState(null);
  const [loanId, setLoanId] = useState(null);
  const [errorRequests, setErrorRequests] = useState([]);
  const [hardshipRequests, setHardshipRequests] = useState([]);
  const [insuranceSubmissions, setInsuranceSubmissions] = useState([]);
  const [payoffRequests, setPayoffRequests] = useState([]);
  const [loanStatus, setLoanStatus] = useState(hasRealBorrowerBacking ? "pending" : "unavailable");
  useEffect(() => {
    if (!hasRealBorrowerBacking || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/msr:customer:loan")}`, {
          headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
        });
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (j && j.ok && j.loan) {
          setLoan(j.loan);
          setLoanId(j.loanId || null);
          setErrorRequests(j.errorRequests || []);
          setHardshipRequests(j.hardshipRequests || []);
          setInsuranceSubmissions(j.insuranceSubmissions || []);
          setPayoffRequests(j.payoffRequests || []);
          setLoanStatus("ok");
        }
        else setLoanStatus("denied");
      } catch { if (!cancelled) setLoanStatus("denied"); }
    })();
    return () => { cancelled = true; };
  }, [hasRealBorrowerBacking, user, tenantId]);

  // Real DPP passport — GET /v1/dpp:passport:public. Deliberately NOT gated
  // on `user` — this is a public, unauthenticated read, same as scanning a
  // physical product's tag. Runs as soon as a passportId is present.
  const [passport, setPassport] = useState(null);
  const [passportStatus, setPassportStatus] = useState(hasConsumerBacking ? "pending" : "unavailable");
  useEffect(() => {
    if (!hasConsumerBacking) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/dpp:passport:public")}&passportId=${encodeURIComponent(passportId)}`);
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (j && j.ok && j.passport) { setPassport(j.passport); setPassportStatus("ok"); }
        else setPassportStatus("denied");
      } catch { if (!cancelled) setPassportStatus("denied"); }
    })();
    return () => { cancelled = true; };
  }, [hasConsumerBacking, passportId]);

  // person: real name once the order loads (first name only, for the casual
  // greeting), falling back to the existing fixture identity otherwise — so
  // petowner/advisor and any not-yet-loaded/denied title case are unaffected.
  const realFullName = order ? (persona === "seller" ? order.sellerName : order.buyerName) : null;
  const person = realFullName
    ? { name: realFullName.split(/[\s&]/)[0], full: realFullName, role: persona === "seller" ? "Seller" : "Buyer" }
    : lease
    ? { name: (lease.residentName || "").split(/[\s&]/)[0] || PEOPLE.tenant.name, unit: lease.unitLabel, property: `${lease.propertyName}${lease.unitLabel ? ` — ${lease.unitLabel}` : ""}` }
    : studentProfile
    ? { name: (studentProfile.name || "").split(/[\s&]/)[0] || PEOPLE.student.name }
    : loan
    ? { name: (loan.borrowerName || "").split(/[\s&]/)[0] || PEOPLE.borrower.name, full: loan.borrowerName || PEOPLE.borrower.full }
    : (PEOPLE[persona] || PEOPLE.petowner);

  const greeting = persona === "advisor"
    ? `Hi ${person.name} 👋 Your advisor paperwork is ready — let's get it affirmed.`
    : isTitlePersona
    ? `Hi ${person.name} 👋 I'm your title order assistant. Your file is in progress — let me show you where things stand and what's needed from you.`
    : isTenantPersona
    ? `Hi ${person.name} 👋 I'm here for ${person.property}, 24/7. Ask about rent, submit a maintenance request, or pull up your lease.`
    : isStudentPersona
    ? `Hi ${person.name} 👋 I'm here to help with your clinical progress — hours, ATI scores, and verified competencies. Ask me anything, or check your progress on the right.`
    : isConsumerPersona
    ? `Hi 👋 This is the Digital Product Passport for ${passport?.productName || "this product"}. Ask what it's made of, where it was made, or how to recycle it.`
    : isBorrowerPersona
    ? `Hi ${person.name} 👋 I'm here for your mortgage account. Ask about your loan status, request hardship assistance, or check on an open dispute.`
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
    if (!realFullName && !lease && !studentProfile && !passport && !loan) return;
    setMessages(m => (m.length === 1 && m[0].from === "them" ? [{ from: "them", text: greeting }] : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realFullName, lease, studentProfile, passport, loan]);

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
    // tenant persona — uses real lease data (GET /v1/tenant:customer:lease)
    // once loaded, falls back to fixture figures otherwise (matches the
    // title persona's realFullName/order fallback pattern).
    if (isTenantPersona) {
      const unitLabel = lease?.unitLabel || "Unit 214";
      const rent = lease?.rentAmountCents ? `$${(lease.rentAmountCents / 100).toLocaleString()}` : "$1,850";
      const paidThrough = lease?.paidThroughDate
        ? new Date(lease.paidThroughDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
        : "September 1";
      const leaseEnd = lease?.leaseEnd
        ? new Date(lease.leaseEnd + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "May 31, 2027";
      if (/rent|due|pay|balance|owe/.test(t)) { setTimeout(() => setCanvas({ type: "lease" }), 200); return `Rent for ${unitLabel} is ${rent}/mo — you're paid through ${paidThrough}, nothing due right now. Opened your lease details on the right.`; }
      if (/maintenance|repair|broken|leak|fix|issue|not working/.test(t)) { setTimeout(() => setCanvas({ type: "maintenance" }), 200); return "Sorry to hear that — I've opened a maintenance request for you. Pick a category and describe what's going on, and Merritt Capital's team will follow up within 24 hours."; }
      if (/lease|document|renew|move.?out|notice/.test(t)) { setTimeout(() => setCanvas({ type: "tenant-docs" }), 200); return `Here are your lease documents. Your current lease runs through ${leaseEnd} — let me know if you're thinking about renewing or need to give notice.`; }
      return `I'm here for ${lease?.propertyName || "Lakeview Commons"}, ${unitLabel}. Ask me about rent, maintenance requests, or your lease.`;
    }
    // student persona — scripted fallback only (real chat below handles the
    // authenticated case); still reads real data when loaded.
    if (isStudentPersona) {
      const hours = studentProfile?.clinicalHours ?? 486;
      const required = studentProfile?.clinicalHoursRequired ?? 500;
      const ati = studentProfile?.atiScore ?? "—";
      if (/hour|clinical|progress|how am i doing/.test(t)) { setTimeout(() => setCanvas({ type: "progress" }), 200); return `You're at ${hours} of ${required} clinical hours, ATI score ${ati}. Opened your full progress on the right.`; }
      if (/competenc|verif|sign.?off|attest/.test(t)) { setTimeout(() => setCanvas({ type: "competencies" }), 200); return "Here are your verified competencies — opened on the right."; }
      return "I can help with your clinical progress, hours, and competencies. What would you like to know?";
    }
    // consumer/DPP persona — always scripted (public, anonymous, no worker
    // chat wired for unauthenticated visitors); reads real passport data.
    if (isConsumerPersona) {
      if (!passport) return "One moment — loading this product's passport…";
      if (/material|made of|fabric|contain/.test(t)) { setTimeout(() => setCanvas({ type: "passport" }), 200); return `This is ${(passport.materials || []).map(m => `${m.percent}% ${m.name}`).join(", ")}. Full details on the right.`; }
      if (/recycl|dispose|end of life|throw/.test(t)) { setTimeout(() => setCanvas({ type: "passport" }), 200); return passport.recyclability?.instructions || "Recyclability info is on the right."; }
      if (/where|made|manufactur|origin|from/.test(t)) { setTimeout(() => setCanvas({ type: "passport" }), 200); return passport.manufacturing ? `Made at ${passport.manufacturing.facility}, ${passport.manufacturing.country}.` : "Manufacturing info is on the right."; }
      if (/carbon|footprint|emission|co2/.test(t)) { setTimeout(() => setCanvas({ type: "passport" }), 200); return `This product's footprint is ${passport.carbonFootprintKgCO2e} kg CO₂e.`; }
      if (/care|wash|clean/.test(t)) { setTimeout(() => setCanvas({ type: "passport" }), 200); return passport.careInstructions || "Care instructions are on the right."; }
      return `Ask me what ${passport.productName} is made of, where it was made, its carbon footprint, or how to recycle it.`;
    }
    // borrower persona — scripted fallback only (real chat below handles the
    // authenticated case); reads real loan data when loaded. Never states a
    // loss-mitigation decision — that's always a human call (CODEX S52.60).
    if (isBorrowerPersona) {
      if (!loan) return "One moment — loading your loan information…";
      if (/status|balance|delinquen|current|behind/.test(t)) { setTimeout(() => setCanvas({ type: "loan-status" }), 200); return `Your loan is ${loan.status === "delinquent" ? "currently delinquent" : "current"}${loan.escrowShortage ? `, with a $${Number(loan.escrowShortage).toLocaleString()} escrow shortage` : ""}. Opened your full status on the right.`; }
      if (/hardship|help|assist|can't pay|struggling|forbear|modif/.test(t)) { setTimeout(() => setCanvas({ type: "hardship" }), 200); return "I've opened a hardship request for you. Meridian's servicing team evaluates every option available before any decision is made — this isn't something I can approve or deny myself."; }
      if (/notice of error|request for information|\bnoe\b|\brfi\b|report a problem|file.*(error|dispute)|request.*information/.test(t)) { setTimeout(() => setCanvas({ type: "error-request-form" }), 200); return "A Notice of Error reports something wrong on your account; a Request for Information asks about your loan. I've opened the intake form — we'll acknowledge within 5 business days and respond within 30."; }
      if (/dispute|error|complain|wrong|incorrect/.test(t)) { setTimeout(() => setCanvas({ type: "error-requests" }), 200); return "Here are your open disputes and information requests, with their response deadlines."; }
      if (/force.?placed|insurance/.test(t)) { setTimeout(() => setCanvas({ type: "insurance-proof" }), 200); return loan.forcePlacedInsuranceActive ? "There's a force-placed insurance notice on your file — I've opened the form to submit your own policy proof for review." : "I've opened the form to submit proof of insurance on your account."; }
      if (/payoff/.test(t)) { setTimeout(() => setCanvas({ type: "payoff-request" }), 200); return "I can log a formal payoff-statement request — you'll receive it within 7 business days. I can't state a specific payoff amount here in chat; that needs the servicing system's live calculation."; }
      if (/stop contact|cease communication|stop calling|don'?t contact|leave me alone/.test(t)) { setTimeout(() => setCanvas({ type: "cease-communication" }), 200); return "I've opened a request to stop contacting you about this account. It won't stop notices we're legally required to send."; }
      return "I can help with your loan status, hardship assistance, an open dispute, filing a Notice of Error/RFI, insurance proof, a payoff statement request, or asking us to stop contacting you. What would you like to do?";
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

  // Real write — files an actual maintenanceRequests doc via
  // POST /v1/tenant:customer:maintenance (entitlement re-checked server-side,
  // same pattern as the advisor persona's real affirm write). Chat itself
  // stays scripted for tenant (no dedicated property-management worker
  // exists yet — see CODEX title/RE merge notes), but the underlying record
  // this creates is real, not a fixture.
  async function submitMaintenanceRequest(category, description) {
    if (!hasRealTenantBacking || !user) return; // scripted-only companies: nothing to submit against
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/tenant:customer:maintenance")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({ category, description }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
  }

  // Real write — CODEX S52.60. Files a real hardshipRequests doc via
  // POST /v1/msr:customer:hardship. This only creates the intake record —
  // the loss-mitigation evaluation and any modification/forbearance
  // decision is always an authorized human's call, never this worker's.
  async function submitHardshipRequest(reason) {
    if (!hasRealBorrowerBacking || !user) return;
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/msr:customer:hardship")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({ reason }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    setHardshipRequests(hrs => [...hrs, { id: j.requestId, reason, status: "submitted", documentsRequired: j.documentsRequired || [], documentsSubmitted: [] }]);
  }

  // Real write — CODEX S52.60, borrower self-service capability #3. Checks
  // off one required loss-mitigation document against the caller's own
  // hardship request. Informational bookkeeping only — never a completeness
  // or eligibility decision (that's still 12 CFR 1024.41(c) human territory).
  async function submitHardshipDocument(hardshipRequestId, documentName) {
    if (!hasRealBorrowerBacking || !user || !loanId) return;
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/msr:customer:hardship-documents")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({ loanId, hardshipRequestId, documentName }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    setHardshipRequests(hrs => hrs.map(h => h.id === hardshipRequestId
      ? { ...h, documentsSubmitted: [...(h.documentsSubmitted || []), documentName] }
      : h));
  }

  // Real write — CODEX S52.60, borrower self-service capability #1. Files a
  // real Notice of Error or Request for Information via POST
  // /v1/msr:customer:error-request. A structured form, not free-text-chat
  // parsed — letting the AI itself decide "this message counts as a formal
  // NOE" is a real risk (it starts a regulatory response clock), so this is
  // deliberately a submit action the borrower explicitly confirms, same as
  // the hardship intake above.
  async function submitErrorRequest(type, subject, description) {
    if (!hasRealBorrowerBacking || !user || !loanId) return;
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/msr:customer:error-request")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({ loanId, type, subject, description }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    setErrorRequests(er => [...er, { id: j.requestId, type, subject, receivedDate: j.receivedDate, responseDeadline: j.responseDeadline, responseLogged: false }]);
    return j;
  }

  // Real write — CODEX S52.60, borrower self-service capability #2. Submits
  // proof of hazard insurance via POST /v1/msr:customer:insurance-proof.
  // Intake only — never itself waives or reverses a force-placed charge.
  async function submitInsuranceProof(insurerName, policyNumber, effectiveDate, expirationDate) {
    if (!hasRealBorrowerBacking || !user || !loanId) return;
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/msr:customer:insurance-proof")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({ loanId, insurerName, policyNumber, effectiveDate, expirationDate }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    setInsuranceSubmissions(s => [...s, { id: j.submissionId, insurerName, policyNumber, effectiveDate, expirationDate, status: "submitted" }]);
  }

  // Real write — CODEX S52.60, borrower self-service capability #4. Logs a
  // formal payoff-statement request via POST /v1/msr:customer:payoff-request.
  // Never returns or implies a dollar amount — that requires the live
  // servicing system's calculation (msr-no-fabricated-payoff-amount).
  async function submitPayoffRequest() {
    if (!hasRealBorrowerBacking || !user || !loanId) return;
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/msr:customer:payoff-request")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({ loanId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    setPayoffRequests(p => [...p, { id: j.requestId, dueBy: j.dueBy, status: "pending" }]);
    return j.dueBy;
  }

  // Real write — CODEX S52.60, borrower self-service capability #5. Sets the
  // existing ceaseCommunication flag via POST
  // /v1/msr:customer:cease-communication (already read by the Delinquency
  // Queue card and enforced by msr-cease-communication-respected).
  async function submitCeaseCommunicationRequest() {
    if (!hasRealBorrowerBacking || !user || !loanId) return;
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/msr:customer:cease-communication")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({ loanId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    setLoan(l => l ? { ...l, ceaseCommunication: true } : l);
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

  // Bug found live (2026-08-20): the real chat path set reply text but never
  // called setCanvas — the model can *say* "I'll open that on the right" (it's
  // in its own system prompt's vocabulary) but has no mechanism to actually do
  // it, since re-title-search-001 doesn't know this portal's fixed canvas set
  // (title-order/title-docs/title-vault are UI-shell concepts, not something a
  // general worker can request). Reproduced live: at a normal desktop width,
  // asking via chat opened nothing; clicking the identical left-nav item at
  // the same width worked instantly — so this was never a responsive/CSS bug,
  // just a missing wire. Fix: detect canvas intent from the user's own message
  // the same way the scripted fallback below already does, independent of
  // whatever the real AI response says — this is a UI mechanism, not a claim
  // the model needs to make true.
  function canvasForTitleMessage(t) {
    if (/where.*order|status|progress|stand|step/.test(t)) return { type: "title-order" };
    if (/sign|document|deed|commit/.test(t)) return { type: "title-docs" };
    if (/vault|record|policy|copies|permanent/.test(t)) return { type: "title-vault" };
    return null;
  }

  // Same real-chat pattern as sendRealTitleChat, different worker + persona
  // scope note (see index.js's client_portal scope-limit block — student
  // gets its own scope text, not the buyer/seller legal-advice one).
  async function sendRealStudentChat(t) {
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/chat:message")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({
        message: t,
        userInput: t,
        sessionId: chatSessionIdRef.current,
        selectedWorker: STUDENT_WORKER_SLUG,
        context: { source: "client_portal", persona: "student" },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    return j.response || j.message || "I'm not able to answer that right now — please try again in a moment.";
  }

  function canvasForStudentMessage(t) {
    if (/hour|clinical|progress|how am i doing|ati/.test(t)) return { type: "progress" };
    if (/competenc|verif|sign.?off|attest/.test(t)) return { type: "competencies" };
    return null;
  }

  // Same real-chat pattern as sendRealTitleChat/sendRealStudentChat, for
  // the MSR borrower persona — CODEX S52.60's own borrower scope note
  // (index.js's client_portal scope-limit block) applies server-side.
  async function sendRealBorrowerChat(t) {
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/chat:message")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
      body: JSON.stringify({
        message: t,
        userInput: t,
        sessionId: chatSessionIdRef.current,
        selectedWorker: MSR_WORKER_SLUG,
        context: { source: "client_portal", persona: "borrower" },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.message || j?.error || "Request failed");
    return j.response || j.message || "I'm not able to answer that right now — please try again in a moment.";
  }

  function canvasForBorrowerMessage(t) {
    if (/status|balance|delinquen|current|behind/.test(t)) return { type: "loan-status" };
    if (/hardship|help|assist|can't pay|struggling|forbear|modif/.test(t)) return { type: "hardship" };
    if (/notice of error|request for information|\bnoe\b|\brfi\b|report a problem|file.*(error|dispute)|request.*information/.test(t)) return { type: "error-request-form" };
    if (/dispute|error|complain|wrong|incorrect/.test(t)) return { type: "error-requests" };
    if (/force.?placed|insurance/.test(t)) return { type: "insurance-proof" };
    if (/payoff/.test(t)) return { type: "payoff-request" };
    if (/stop contact|cease communication|stop calling|don'?t contact|leave me alone/.test(t)) return { type: "cease-communication" };
    return null;
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
        const c = canvasForTitleMessage(t.toLowerCase());
        if (c) setCanvas(c);
      } catch {
        setMessages(m => [...m, { from: "them", text: "Sorry, I couldn't reach your file just now — please try again in a moment, or call us directly." }]);
      }
      setThinking(false);
      return;
    }
    if (hasRealStudentBacking && user && studentStatus === "ok") {
      try {
        const reply = await sendRealStudentChat(t);
        setMessages(m => [...m, { from: "them", text: reply }]);
        const c = canvasForStudentMessage(t.toLowerCase());
        if (c) setCanvas(c);
      } catch {
        setMessages(m => [...m, { from: "them", text: "Sorry, I couldn't reach your record just now — please try again in a moment." }]);
      }
      setThinking(false);
      return;
    }
    if (hasRealBorrowerBacking && user && loanStatus === "ok") {
      try {
        const reply = await sendRealBorrowerChat(t);
        setMessages(m => [...m, { from: "them", text: reply }]);
        const c = canvasForBorrowerMessage(t.toLowerCase());
        if (c) setCanvas(c);
      } catch {
        setMessages(m => [...m, { from: "them", text: "Sorry, I couldn't reach your account just now — please try again in a moment, or call us directly." }]);
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
    : isTenantPersona
    ? [
        { label: "Rent & lease", icon: I(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>), action: () => setCanvas({ type: "lease" }) },
        { label: "Maintenance request", icon: I(<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/></>), action: () => setCanvas({ type: "maintenance" }) },
        { label: "Lease documents", icon: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>), action: () => setCanvas({ type: "tenant-docs" }) },
        { label: "Ask a question", icon: I(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>), action: scrollToEnd },
      ]
    : isStudentPersona
    ? [
        { label: "Clinical progress", icon: I(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>), action: () => setCanvas({ type: "progress" }) },
        { label: "Competencies", icon: I(<path d="M9 11l3 3L22 4"/>), action: () => setCanvas({ type: "competencies" }) },
        { label: "Ask a question", icon: I(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>), action: scrollToEnd },
      ]
    : isConsumerPersona
    ? [
        { label: "Product passport", icon: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>), action: () => setCanvas({ type: "passport" }) },
        { label: "Ask a question", icon: I(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>), action: scrollToEnd },
      ]
    : isBorrowerPersona
    ? [
        { label: "Loan status", icon: I(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>), action: () => setCanvas({ type: "loan-status" }) },
        { label: "Hardship assistance", icon: I(<><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>), action: () => setCanvas({ type: "hardship" }) },
        { label: "Open disputes", icon: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>), action: () => setCanvas({ type: "error-requests" }) },
        { label: "Report a problem / request info", icon: I(<><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0z"/></>), action: () => setCanvas({ type: "error-request-form" }) },
        { label: "Proof of insurance", icon: I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>), action: () => setCanvas({ type: "insurance-proof" }) },
        { label: "Payoff statement", icon: I(<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>), action: () => setCanvas({ type: "payoff-request" }) },
        { label: "Stop contacting me", icon: I(<><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/></>), action: () => setCanvas({ type: "cease-communication" }) },
        { label: "Ask a question", icon: I(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>), action: scrollToEnd },
      ]
    : [
        { label: "Ask anything", icon: I(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>), action: scrollToEnd },
        { label: `${person.pet || "Pet"}'s records`, icon: I(<><path d="M9 11H5a2 2 0 0 0-2 2v7h6z"/><path d="M9 7h6v13H9z"/><path d="M15 4h4a2 2 0 0 1 2 2v14h-6z"/></>), action: () => setCanvas({ type: "records" }) },
        { label: "Appointments", icon: I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>), action: () => setCanvas({ type: "booking" }) },
        { label: "Bills & account", icon: I(<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>), action: () => say("Nothing due right now — your last visit was paid in full. I'll text you before anything's coming up.") },
      ];

  // CODEX S52.56 — for a real (non-fixture) title company or property, the
  // customer must sign in before anything real loads. Not shown for
  // petowner/advisor or for companies without a verified tenant mapping
  // (those stay on the existing scripted demo, unaffected).
  if (hasRealBacking && !user) {
    return <SignInGate skin={skin} persona={persona} onSignedIn={() => {}} />;
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
        {/* Chat center — on mobile, a canvas fully replaces chat (chat<->canvas
            toggle) rather than squeezing both into an unreadable 50/50 split
            that only makes sense at desktop width. */}
        <main style={{
          display: (canvas && !isDesktop) ? "none" : "flex",
          flex: (canvas && isDesktop) ? "1 1 50%" : "1 1 100%",
          flexDirection: "column", padding: "18px 18px 0", minWidth: 0,
        }}>
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
              <div style={{ fontSize: 26, lineHeight: 1 }}>{persona === "advisor" ? "📋" : isTitlePersona ? skin.glyph : isTenantPersona ? skin.glyph : isStudentPersona ? skin.glyph : isConsumerPersona ? skin.glyph : isBorrowerPersona ? skin.glyph : "🩺"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                  {persona === "advisor"
                    ? "Your advisor papers are ready to affirm"
                    : isTitlePersona
                    ? `Your title order is in progress`
                    : isTenantPersona
                    ? `Your residence, in one place`
                    : isStudentPersona
                    ? `Your clinical progress, in one place`
                    : isConsumerPersona
                    ? `Digital Product Passport`
                    : isBorrowerPersona
                    ? `Your mortgage, in one place`
                    : `${person.pet}'s health record lives here`}
                </div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                  {persona === "advisor"
                    ? "Advisor agreement + 83(b) election — secured in your personal Vault, owned by you, forever."
                    : isTitlePersona
                    ? `Track your closing, review documents, and sign — everything in one place. After recording, your deed and title policy live in your personal SOCIII Vault.`
                    : isTenantPersona
                    ? `Rent, maintenance requests, and lease documents for ${person.property} — everything in one place.`
                    : isStudentPersona
                    ? `Clinical hours, ATI scores, and verified competencies — everything in one place.`
                    : isConsumerPersona
                    ? `Materials, origin, care, and recyclability for ${passport?.productName || "this product"} — required under EU sustainable product rules.`
                    : isBorrowerPersona
                    ? `Loan status, hardship assistance, and open disputes — everything in one place. Meridian's servicing team makes every loss-mitigation decision; this just keeps you informed.`
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

        {/* Canvas — appears only when it matters (Claude-artifact style).
            Desktop: side-by-side with chat. Mobile: full-screen, chat hidden
            above — the × button below is the only way back, doubling as the
            chat<->canvas toggle on narrow screens. */}
        {canvas && (
          <aside style={{ flex: "1 1 100%", borderLeft: isDesktop ? "1px solid #f1f5f9" : "none", padding: "18px", overflowY: "auto", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                {canvas.type === "booking" ? "Book a visit"
                  : canvas.type === "records" ? `${person.pet}'s record`
                  : canvas.type === "affirm" ? "Affirm your paperwork"
                  : canvas.type === "title-order" ? "Your title order"
                  : canvas.type === "title-docs" ? "Documents"
                  : canvas.type === "title-vault" ? "Your Vault copies"
                  : canvas.type === "lease" ? "Rent & lease"
                  : canvas.type === "maintenance" ? "Maintenance request"
                  : canvas.type === "tenant-docs" ? "Lease documents"
                  : canvas.type === "progress" ? "Clinical progress"
                  : canvas.type === "competencies" ? "Verified competencies"
                  : canvas.type === "passport" ? "Product passport"
                  : canvas.type === "loan-status" ? "Loan status"
                  : canvas.type === "hardship" ? "Hardship assistance"
                  : canvas.type === "error-requests" ? "Open disputes"
                  : canvas.type === "error-request-form" ? "File a Notice of Error / RFI"
                  : canvas.type === "insurance-proof" ? "Proof of insurance"
                  : canvas.type === "payoff-request" ? "Payoff statement"
                  : canvas.type === "cease-communication" ? "Stop contacting me"
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
            {canvas.type === "lease" && <LeaseCanvas skin={skin} lease={lease} />}
            {canvas.type === "maintenance" && <MaintenanceCanvas skin={skin} history={maintenanceHistory} onSubmit={submitMaintenanceRequest} />}
            {canvas.type === "tenant-docs" && <TenantDocsCanvas skin={skin} lease={lease} />}
            {canvas.type === "progress" && <ProgressCanvas skin={skin} student={studentProfile} />}
            {canvas.type === "competencies" && <CompetenciesCanvas skin={skin} competencies={competencies} />}
            {canvas.type === "passport" && <PassportCanvas passport={passport} />}
            {canvas.type === "loan-status" && <LoanStatusCanvas skin={skin} loan={loan} />}
            {canvas.type === "hardship" && <HardshipCanvas skin={skin} onSubmit={submitHardshipRequest} existingRequest={hardshipRequests[0]} onSubmitDocument={submitHardshipDocument} />}
            {canvas.type === "error-requests" && <ErrorRequestsCanvas errorRequests={errorRequests} />}
            {canvas.type === "error-request-form" && <ErrorRequestIntakeCanvas skin={skin} onSubmit={submitErrorRequest} />}
            {canvas.type === "insurance-proof" && <InsuranceProofCanvas skin={skin} loan={loan} insuranceSubmissions={insuranceSubmissions} onSubmit={submitInsuranceProof} />}
            {canvas.type === "payoff-request" && <PayoffRequestCanvas skin={skin} onSubmit={submitPayoffRequest} />}
            {canvas.type === "cease-communication" && <CeaseCommunicationCanvas skin={skin} loan={loan} onSubmit={submitCeaseCommunicationRequest} />}
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
