// liveData.js — real per-tab payloads for workers that read tenant data.
// Mirrors the sampleData.getFixtureForTab API but async + API-backed. Caller
// (App.jsx handleTabSelect) tries this first; if it returns null we fall back
// to the sample fixture so the SAMPLE chip + demo content remain for workers
// (or tenants) that don't have real data yet.
//
// Pattern: each worker that wires live data adds a builder here. The builder
// returns a payload in the same shape sample fixtures use (title, subtitle,
// fields[], sections[]) so existing card components keep rendering with no
// changes. We deliberately do NOT set _demo:true on returned payloads — that
// is what makes CanvasPanel skip the SAMPLE chip.

import { auth } from "../../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function liveApiFetch(path, opts = {}) {
  let token = null;
  try {
    if (auth.currentUser) token = await auth.currentUser.getIdToken();
  } catch (_) {}
  if (!token) token = localStorage.getItem("ID_TOKEN");
  const tenantId = localStorage.getItem("TENANT_ID");
  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

function fmtCurrency(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Number(n).toLocaleString()}`;
}

// ──────────────────────────────────────────────────────────────────
//  FUNDRAISE (BANK-FUND-001)
// ──────────────────────────────────────────────────────────────────

async function buildFundraisePayload(tabId) {
  const list = await liveApiFetch("/v1/fundraise:list?stage=active");
  const fundraises = Array.isArray(list?.fundraises)
    ? list.fundraises
    : Array.isArray(list?.items) ? list.items : [];
  if (!fundraises.length) return null;
  const fr = fundraises[0];
  const subtitle = fr.name || "Active fundraise";

  if (tabId === "pipeline") {
    let investors = [];
    try {
      const r = await liveApiFetch(`/v1/fundraise:investor:list?fundraiseId=${encodeURIComponent(fr.fundraiseId)}`);
      investors = Array.isArray(r?.investors) ? r.investors : [];
    } catch (_) {}
    const byStage = {};
    investors.forEach(i => {
      const s = (i.stage || "approached").toLowerCase().replace(/\s+/g, "_");
      byStage[s] = (byStage[s] || 0) + 1;
    });
    const sections = investors.length
      ? [{ heading: "Active",
           body: investors.slice(0, 8).map(i => `${i.name || i.email || i.investorId} · ${i.stage || "approached"}`).join("\n") }]
      : [{ heading: "Getting started",
           body: "No investors in pipeline yet. Use chat to prospect from Apollo or add investors manually." }];
    return {
      title: "Investor pipeline",
      subtitle,
      fields: [
        { label: "Approached",  value: String(byStage.approached || 0) },
        { label: "1st meeting", value: String(byStage.first_meeting || byStage["1st_meeting"] || 0) },
        { label: "Diligence",   value: String(byStage.diligence || 0) },
        { label: "Term sheet",  value: String(byStage.term_sheet || 0) },
        { label: "Closed",      value: String(byStage.closed || 0) },
      ],
      sections,
    };
  }

  if (tabId === "progress" || tabId === "capital-raised") {
    const target = fr.target_raise || fr.targetAmount || 0;
    const targetHigh = fr.target_raise_high || null;
    const committed = fr.current_committed || 0;
    const received = fr.current_raised || 0;
    return {
      title: "Capital raise",
      subtitle,
      fields: [
        { label: "Target",     value: targetHigh ? `${fmtCurrency(target)} – ${fmtCurrency(targetHigh)}` : fmtCurrency(target) },
        { label: "Committed",  value: fmtCurrency(committed) },
        { label: "Received",   value: fmtCurrency(received) },
        { label: "Remaining",  value: fmtCurrency(Math.max(0, target - received)) },
        { label: "Instrument", value: fr.instrument || "—" },
        ...(fr.valuation_cap ? [{ label: "Valuation cap", value: fmtCurrency(fr.valuation_cap) }] : []),
      ],
    };
  }

  if (tabId === "data-room") {
    return {
      title: "Data room",
      subtitle,
      fields: [
        { label: "Documents",   value: "0" },
        { label: "Share links", value: "0 active" },
        { label: "Views (30d)", value: "0" },
      ],
      sections: [{
        heading: "Getting started",
        body: "Upload your deck, financials, and cap table to begin. Drag files into chat or use the Documents tab.",
      }],
    };
  }

  // Tabs not yet wired to live data — fall through to sample fixture.
  return null;
}

// ──────────────────────────────────────────────────────────────────
//  Public entry
// ──────────────────────────────────────────────────────────────────

export async function getLiveDataForTab(worker, tabId) {
  if (!worker) return null;
  const slug = worker.slug || worker.workerId;
  try {
    if (slug === "fundraise") return await buildFundraisePayload(tabId);
  } catch (e) {
    console.warn("[liveData] failed for", slug, tabId, e?.message || e);
  }
  return null;
}
