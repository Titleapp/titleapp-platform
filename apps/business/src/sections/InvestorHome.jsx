// Investor-side worker home for the SOCIII IR / fundraise worker.
//
// Rendered by WorkerHomeRenderer when the active worker is "fundraise" and
// the user has an active investor_portal entitlement. Replaces the founder
// canvas (pipeline/contacts/cap-table-as-operator) which is meaningless to
// the investor POV.
//
// Materials + Deadlines surfaces already render at the AdminShell level via
// WorkspaceInvestorMaterials / WorkspaceInvestorDeadlines. This component
// focuses on what those don't cover: position summary, recent updates,
// direct line to the founder.

import React, { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path) {
  let token = null;
  try { if (auth.currentUser) token = await auth.currentUser.getIdToken(); } catch (_) {}
  if (!token) token = localStorage.getItem("ID_TOKEN");
  const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(path)}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return res.json();
}

function fmtMoney(n) {
  if (n == null || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return "—"; }
}

const S = {
  page:        { padding: "32px 28px", maxWidth: 900, fontFamily: "system-ui,-apple-system,sans-serif" },
  hero:        { marginBottom: 28 },
  greeting:    { fontSize: 28, fontWeight: 700, color: "#1e293b" },
  sub:         { fontSize: 14, color: "#64748b", marginTop: 6 },
  sectionRow:  { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 28 },
  card:        { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 },
  eyebrow:     { fontSize: 11, fontWeight: 700, color: "#0686D4", letterSpacing: "0.08em", textTransform: "uppercase" },
  cardTitle:   { fontSize: 16, fontWeight: 700, color: "#1a202c", marginTop: 6 },
  metricLg:    { fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginTop: 8 },
  metricSm:    { fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.5 },
  divider:     { height: 1, background: "#e2e8f0", margin: "12px 0" },
  kvRow:       { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 },
  kvLabel:     { color: "#64748b" },
  kvVal:       { color: "#1a202c", fontWeight: 600 },
  helpBlock:   { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, marginBottom: 28 },
  helpTitle:   { fontSize: 15, fontWeight: 700, color: "#1a202c", marginBottom: 6 },
  helpBody:    { fontSize: 13, color: "#475569", lineHeight: 1.6 },
  ctaRow:      { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  btnPrimary:  { background: "#7c3aed", color: "#fff", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", border: "none", cursor: "pointer" },
  btnGhost:    { background: "transparent", color: "#7c3aed", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", border: "1px solid #c4b5fd", cursor: "pointer" },
  emptyNote:   { fontSize: 12, color: "#94a3b8", marginTop: 4, fontStyle: "italic" },
};

export default function InvestorHome() {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("/v1/investor:my-position");
      if (data?.ok) setPosition(data);
    } catch (_) {
      // non-fatal; render with placeholder values
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const investment = position?.investmentAmount;
  const valuationCap = position?.valuationCap;
  const safeDate = position?.safeSignedAt || position?.investedAt;
  const fundraiseName = position?.fundraiseName || "SOCIII pre-seed";

  return (
    <div style={S.page}>
      <div style={S.hero}>
        <div style={S.greeting}>Welcome to your investor view.</div>
        <div style={S.sub}>
          Your position in {fundraiseName}, materials, deadlines, and a direct line to the founder.
        </div>
      </div>

      <div style={S.sectionRow}>
        <div style={S.card}>
          <div style={S.eyebrow}>Your investment</div>
          <div style={S.metricLg}>{fmtMoney(investment)}</div>
          <div style={S.metricSm}>{investment ? "Committed via Post-Money SAFE." : "No commitment recorded yet."}</div>
          <div style={S.divider} />
          <div style={S.kvRow}>
            <span style={S.kvLabel}>Valuation cap</span>
            <span style={S.kvVal}>{valuationCap ? fmtMoney(valuationCap) : "—"}</span>
          </div>
          <div style={S.kvRow}>
            <span style={S.kvLabel}>SAFE signed</span>
            <span style={S.kvVal}>{fmtDate(safeDate)}</span>
          </div>
          <div style={S.kvRow}>
            <span style={S.kvLabel}>Round</span>
            <span style={S.kvVal}>Pre-seed</span>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.eyebrow}>Round summary</div>
          <div style={S.cardTitle}>SOCIII Inc. pre-seed</div>
          <div style={S.metricSm}>
            Delaware C-corp · EIN 42-2675951. Filed via Stripe Atlas 2026-05-19.
            Pre-seed round open to accredited investors.
          </div>
          <div style={S.divider} />
          <div style={S.kvRow}>
            <span style={S.kvLabel}>Instrument</span>
            <span style={S.kvVal}>Post-Money SAFE</span>
          </div>
          <div style={S.kvRow}>
            <span style={S.kvLabel}>Use of funds</span>
            <span style={S.kvVal}>Build + GTM</span>
          </div>
          <div style={S.kvRow}>
            <span style={S.kvLabel}>Founder</span>
            <span style={S.kvVal}>Sean Combs</span>
          </div>
        </div>
      </div>

      <div style={S.helpBlock}>
        <div style={S.helpTitle}>Direct line to the founder</div>
        <div style={S.helpBody}>
          Materials, deadlines, and signing items are at the top of this page. For anything
          else — diligence questions, intro requests, signal on the round — message Sean
          directly. Reply times are typically same-day.
        </div>
        <div style={S.ctaRow}>
          <a
            href="mailto:sean@sociii.ai?subject=SOCIII%20%E2%80%94%20Investor%20question"
            target="_blank"
            rel="noopener noreferrer"
            style={S.btnPrimary}
          >
            Message Sean
          </a>
          <a
            href="/data-room"
            target="_blank"
            rel="noopener noreferrer"
            style={S.btnGhost}
          >
            Open data room
          </a>
        </div>
      </div>

      {/* Notifications + Voting scaffolds. Per IR-Worker-Investor-View-V2
          spec these are required surfaces even pre-investment — empty
          states keep them discoverable. Wired to live data in next pass. */}
      <div style={S.sectionRow}>
        <div style={S.card}>
          <div style={S.eyebrow}>Updates from SOCIII</div>
          <div style={S.cardTitle}>Notifications</div>
          <div style={S.metricSm}>
            Quarterly reports, K-1s, major business updates, and
            information rights deliveries surface here.
          </div>
          <div style={S.divider} />
          <div style={{ ...S.metricSm, fontStyle: "italic", color: "#94a3b8" }}>
            No updates yet. You'll see the first quarterly report after
            close.
          </div>
        </div>

        <div style={S.card}>
          <div style={S.eyebrow}>Governance</div>
          <div style={S.cardTitle}>Voting + consents</div>
          <div style={S.metricSm}>
            SAFE-holder votes, written-consent ballots, and major-decision
            notifications appear here when the company calls one.
          </div>
          <div style={S.divider} />
          <div style={{ ...S.metricSm, fontStyle: "italic", color: "#94a3b8" }}>
            No open ballots. SAFEs typically don't carry voting rights —
            this surface activates if/when your instrument converts.
          </div>
        </div>
      </div>

      {loading && (
        <div style={S.emptyNote}>Loading your position…</div>
      )}
    </div>
  );
}
