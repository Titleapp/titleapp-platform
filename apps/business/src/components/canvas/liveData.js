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
    // Bind to the worker's canonical document set + visit stats.
    // Founder sees doc list + Views/Last viewer/Most-downloaded; investor
    // sees the same doc list (their analytics view comes next pass).
    // Same canvas tab, role-adaptive payload (unified-tabs pattern).
    let docs = [];
    let stats = null;
    try {
      const [docsRes, statsRes] = await Promise.all([
        liveApiFetch("/v1/canonical-docs?workerSlug=fundraise"),
        liveApiFetch("/v1/canonical-docs:stats?workerSlug=fundraise&days=30"),
      ]);
      docs = Array.isArray(docsRes?.docs) ? docsRes.docs : [];
      stats = statsRes?.ok ? statsRes : null;
    } catch (_) {}
    if (docs.length === 0) return null; // fall back to sample fixture
    const groups = docs.reduce((acc, d) => {
      const cat = d.category || "other";
      (acc[cat] ||= []).push(d);
      return acc;
    }, {});
    const catLabel = { thesis: "Investment thesis", deal: "Deal documents", ip: "IP + technical", other: "Other" };
    const sections = Object.entries(groups).map(([cat, items]) => ({
      heading: catLabel[cat] || cat,
      body: items.map(d => `${d.title}${d.version ? " · v" + d.version : ""}`).join("\n"),
    }));
    const docTitleById = docs.reduce((m, d) => { m[d.id] = d.title; return m; }, {});
    const mostDownloadedLabel = stats?.mostDownloaded
      ? `${docTitleById[stats.mostDownloaded.docId] || stats.mostDownloaded.docId} (${stats.mostDownloaded.downloads}×)`
      : "—";
    const lastViewerLabel = stats?.lastViewer
      ? (stats.lastViewer.name || stats.lastViewer.email || "anonymous")
      : "—";
    return {
      title: "Data room",
      subtitle,
      fields: [
        { label: "Documents",        value: String(docs.length) },
        { label: "Views (30d)",      value: String(stats?.totalEvents ?? 0) },
        { label: "Unique visitors",  value: String(stats?.uniqueVisitors ?? 0) },
        { label: "Last viewer",      value: lastViewerLabel },
        { label: "Most-downloaded",  value: mostDownloadedLabel },
      ],
      sections,
    };
  }

  if (tabId === "notices") {
    // Founder Notices tab — list recent outbound notices for this fundraise.
    // Investor side returns null (their inbox view comes next pass).
    try {
      const r = await liveApiFetch(`/v1/ir:notices:list?fundraiseId=${encodeURIComponent(fr.fundraiseId)}`);
      const notices = Array.isArray(r?.notices) ? r.notices : [];
      if (notices.length === 0) return null;
      const recent = notices.slice(0, 6).map(n => {
        const when = n.sentAt ? new Date(n.sentAt).toLocaleString() : "—";
        return `${n.subject} · ${n.recipientCount} sent · ${when}`;
      });
      return {
        title: "Investor notices",
        subtitle,
        fields: [
          { label: "Sent (recent)", value: String(notices.length) },
          { label: "Last subject", value: notices[0]?.subject || "—" },
          { label: "Last sent", value: notices[0]?.sentAt ? new Date(notices[0].sentAt).toLocaleDateString() : "—" },
        ],
        sections: [{ heading: "Recent", body: recent.join("\n") }],
      };
    } catch (_) {
      return null;
    }
  }

  if (tabId === "my-position") {
    // Investor-side view: read /v1/investor:my-position which derives the
    // investor's own record from their entitlement. Falls back to null
    // (sample fixture) if the user has no investor entitlement — that's
    // expected for the founder view (their own My Position is meaningless).
    try {
      const r = await liveApiFetch("/v1/investor:my-position");
      const positions = Array.isArray(r?.positions) ? r.positions : [];
      if (!positions.length) return null;
      // V1 only handles the first position — V2 will let the investor
      // switch between positions if they hold multiple SAFEs.
      const p = positions[0];
      const ownership = (p.sharesIssued && p.valuationCap)
        ? `${((p.commitment_amount / p.valuationCap) * 100).toFixed(2)}%`
        : "—";
      return {
        title: "Your position",
        subtitle: p.fundraiseName || subtitle,
        fields: [
          { label: "Invested",    value: fmtCurrency(p.commitment_amount) },
          { label: "Shares",      value: p.sharesIssued ? Number(p.sharesIssued).toLocaleString() : "—" },
          { label: "Ownership",   value: ownership },
          { label: "Instrument",  value: `${p.instrument} · ${p.valuationCap ? fmtCurrency(p.valuationCap) + " cap" : "no cap"}` },
          ...(p.agreementExecutedAt ? [{ label: "Executed", value: "Signed" }] : []),
        ],
        sections: p.flowStep === "signature_complete"
          ? [{ heading: "Status", body: "SAFE executed and stored in your vault. You'll receive notices and ballots as the round progresses." }]
          : [{ heading: "Status", body: `In progress — flowStep=${p.flowStep}` }],
      };
    } catch (_) { return null; }
  }

  // Tabs not yet wired to live data — fall through to sample fixture.
  return null;
}

// ──────────────────────────────────────────────────────────────────
//  Public entry
// ──────────────────────────────────────────────────────────────────

async function buildPlatformHrPayload(tabId) {
  // HR worker live data — V1 only handles Notices tab (composer needs it to
  // render). Other HR tabs fall through to fixture.
  if (tabId === "notices") {
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("TENANT_ID") : "";
    if (!tenantId) return null;
    try {
      const r = await liveApiFetch(`/v1/hr:notices:list?tenantId=${encodeURIComponent(tenantId)}`);
      const notices = Array.isArray(r?.notices) ? r.notices : [];
      const recent = notices.slice(0, 6).map(n => {
        const when = n.sentAt ? new Date(n.sentAt).toLocaleString() : "—";
        return `${n.subject} · ${n.recipientCount} sent · ${when}`;
      });
      // Always return a payload shell — the composer attaches to this tab
      // and we want it visible even before the first notice is sent.
      return {
        title: "HR notices",
        subtitle: notices.length === 0 ? "No notices sent yet" : `${notices.length} recent`,
        fields: notices.length === 0
          ? [{ label: "Status", value: "Compose your first notice below" }]
          : [
              { label: "Sent (recent)", value: String(notices.length) },
              { label: "Last subject",  value: notices[0]?.subject || "—" },
              { label: "Last sent",     value: notices[0]?.sentAt ? new Date(notices[0].sentAt).toLocaleDateString() : "—" },
            ],
        sections: notices.length === 0
          ? []
          : [{ heading: "Recent", body: recent.join("\n") }],
      };
    } catch (_) {
      return null;
    }
  }
  return null;
}

export async function getLiveDataForTab(worker, tabId) {
  if (!worker) return null;
  const slug = worker.slug || worker.workerId;
  try {
    if (slug === "fundraise")    return await buildFundraisePayload(tabId);
    if (slug === "platform-hr")  return await buildPlatformHrPayload(tabId);
  } catch (e) {
    console.warn("[liveData] failed for", slug, tabId, e?.message || e);
  }
  return null;
}
