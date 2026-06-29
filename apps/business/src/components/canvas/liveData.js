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

export async function liveApiFetch(path, opts = {}) {
  let token = null;
  try {
    if (auth.currentUser) token = await auth.currentUser.getIdToken();
  } catch { /* ignore */ }
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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
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
    } catch {
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
    } catch { return null; }
  }

  // Tabs not yet wired to live data — fall through to sample fixture.
  return null;
}

// ──────────────────────────────────────────────────────────────────
//  Public entry
// ──────────────────────────────────────────────────────────────────

async function buildPlatformHrPayload(tabId) {
  // HR worker live data — people/onboarding/schedule/compliance now read real
  // tenant records (staff_credentials + hrSchedules, tenant-scoped, no SOCIII
  // advisor leak). Notices uses its own endpoint (composer attaches to it).
  // Each returns null on empty → caller falls back to the sample fixture.

  if (tabId === "people") {
    const r = await liveApiFetch("/v1/hr:people:list");
    const people = Array.isArray(r?.people) ? r.people : [];
    if (!people.length) return null;
    const s = r.summary || {};
    return {
      title: "Team Roster",
      subtitle: "Meadow Creek Veterinary Clinic · humans + digital workers",
      fields: [
        { label: "Total",           value: String(s.total ?? people.length) },
        { label: "Clinical staff",  value: String(s.humans ?? "") },
        { label: "Digital workers", value: String(s.digital ?? "") },
        { label: "Advisors",        value: String(s.advisors ?? 0) },
      ],
      people: people.map(p => ({ name: p.name, type: p.type, role: p.role, status: p.status })),
    };
  }

  if (tabId === "onboarding") {
    const r = await liveApiFetch("/v1/hr:onboarding:list");
    const items = Array.isArray(r?.items) ? r.items : [];
    if (!items.length) return null;
    return {
      title: "In-flight onboardings",
      subtitle: "Meadow Creek · current pipeline",
      fields: [{ label: "Open", value: String(items.length) }],
      items: items.map(i => `${i.name} — ${i.role || i.type} · ${i.step}${i.note ? " · " + i.note : ""}`),
    };
  }

  if (tabId === "schedule") {
    const r = await liveApiFetch("/v1/hr:people:list");
    const people = Array.isArray(r?.people) ? r.people : [];
    if (!people.length) return null;
    const humans = people.filter(p => p.type === "human");
    const digital = people.filter(p => p.type === "digital_worker");
    return {
      title: "Coverage",
      subtitle: "Meadow Creek · current roll-up",
      fields: [
        { label: "Clinical staff",  value: String(humans.length) },
        { label: "Digital workers", value: `${digital.length} (24×7)` },
        { label: "Coverage",        value: "Healthy" },
      ],
      sections: [
        { heading: "Clinical team", body: humans.map(p => `${p.name} · ${p.role}`).join("\n") },
        { heading: "Digital workers (24×7×365)", body: digital.map(p => p.name).join(" · ") },
      ],
    };
  }

  if (tabId === "compliance") {
    const r = await liveApiFetch("/v1/hr:compliance:status");
    if (!r || !Array.isArray(r.obligations)) return null;
    const obs = r.obligations;
    const hard = obs.filter(o => o.severity === "hard_stop").length;
    const soft = obs.filter(o => o.severity === "soft_flag").length;
    return {
      title: "HR compliance",
      subtitle: "Meadow Creek · platform_hr_compliance_v1 + credential tracking",
      summary: obs.length
        ? `${obs.length} open obligation${obs.length !== 1 ? "s" : ""} — ${hard} hard-stop, ${soft} soft-flag.`
        : "All clear — no open obligations.",
      fields: [
        { label: "Obligations open", value: String(obs.length) },
        { label: "Hard-stop",        value: String(hard) },
        { label: "Soft-flag",        value: String(soft) },
      ],
      sections: obs.length ? [{ heading: "Open obligations", body: obs.map(o => `${o.memberName} — ${o.action}`).join("\n") }] : [],
    };
  }

  if (tabId === "documents") {
    // Real HR docs live in the tenant's Drive (storageObjects tagged
    // createdByWorker="platform-hr"): Employee Handbook, OSHA plan, etc.
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("TENANT_ID") : "";
    if (!tenantId) return null;
    const r = await liveApiFetch(`/v1/storage:list?scope=business&orgId=${encodeURIComponent(tenantId)}&limit=100`);
    const objs = Array.isArray(r?.objects) ? r.objects : [];
    const hrDocs = objs.filter(o => o.createdByWorker === "platform-hr");
    if (!hrDocs.length) return null;
    return {
      title: "HR documents",
      subtitle: "Meadow Creek · from your Drive",
      fields: [{ label: "On file", value: String(hrDocs.length) }],
      sections: [{ heading: "Documents", body: hrDocs.map(d => `${d.filename} · ${Math.round((d.sizeBytes || 0) / 1000)} KB`).join("\n") }],
    };
  }

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
    } catch {
      return null;
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────
//  ACCOUNTING (platform-accounting) — the QuickBooks replacement
// ──────────────────────────────────────────────────────────────────

async function buildAccountingPayload(tabId) {
  // Overview = a real P&L from committed transactions (credits=revenue,
  // debits=expenses) + cash on hand. Returns null when the tenant has no
  // accounting data yet → caller falls back to the sample fixture.
  if (tabId === "overview" || tabId === "dashboard") {
    const r = await liveApiFetch("/v1/accounting:dashboard:summary");
    if (!r?.ok) return null;
    const dollars = (x) => (x && typeof x.cents === "number") ? x.cents / 100 : null;
    const rev = dollars(r.revenueMtd);
    const exp = dollars(r.expensesMtd);
    const net = dollars(r.netIncomeMtd);
    const cash = dollars(r.cashOnHand);
    if (rev == null && exp == null && (cash == null || cash === 0)) return null; // no real data → fixture
    return {
      title: "Accounting overview",
      subtitle: "Live · this month to date",
      summary: net != null
        ? (net >= 0
            ? "Profitable month so far — revenue is outpacing expenses."
            : "Spending ahead of revenue this month — watch the burn.")
        : undefined,
      fields: [
        { label: "Revenue (MTD)",  value: fmtCurrency(rev) },
        { label: "Expenses (MTD)", value: fmtCurrency(exp) },
        { label: "Net Income",     value: fmtCurrency(net) },
        { label: "Cash on Hand",   value: fmtCurrency(cash) },
      ],
    };
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────
//  CONTACTS (platform-contacts) — the Salesforce replacement
// ──────────────────────────────────────────────────────────────────

async function buildContactsPayload() {
  const r = await liveApiFetch("/v1/contacts:list?limit=12&stats=1");
  const list = Array.isArray(r?.contacts) ? r.contacts : [];
  const total = (r?.stats && typeof r.stats.total === "number") ? r.stats.total
              : (typeof r?.total === "number" ? r.total : list.length);
  if (!total) return null; // no real contacts → fall back to fixture
  const newThisMonth = list.filter(c => Array.isArray(c.segments) && c.segments.includes("new-this-month")).length;
  const recent = list.slice(0, 8).map(c => `${c.name}${c.petInfo ? ` — ${c.petInfo}` : ""}`);
  return {
    title: "Clients",
    subtitle: `${total.toLocaleString()} active`,
    fields: [
      { label: "Active clients", value: total.toLocaleString() },
      ...(newThisMonth ? [{ label: "New (this page)", value: String(newThisMonth) }] : []),
    ],
    sections: recent.length ? [{ heading: "Recent clients", body: recent.join("\n") }] : [],
  };
}

// ──────────────────────────────────────────────────────────────────
//  SPINE-4 — Staff Credential & Training Worker (vet vertical)
// ──────────────────────────────────────────────────────────────────

async function buildStaffCredentialPayload(tabId) {
  const r = await liveApiFetch("/v1/staff-credentials:list");
  if (!r?.ok || !Array.isArray(r.staff)) return null;
  const staff = r.staff;
  const sum = r.summary || {};

  // Per-person roster: worst-status (red/yellow/green) + most-urgent credential.
  const roster = staff.map(s => {
    const creds = (s.credentials || []).filter(c => c.status !== "in_progress");
    const tracked = creds
      .filter(c => typeof c.days_remaining === "number")
      .sort((a, b) => a.days_remaining - b.days_remaining);
    const hasOverdue = creds.some(c => c.status === "overdue" || (typeof c.days_remaining === "number" && c.days_remaining < 0));
    const hasExpiring = creds.some(c => c.status === "expiring_soon" || (typeof c.days_remaining === "number" && c.days_remaining >= 0 && c.days_remaining <= 30));
    const status = hasOverdue ? "red" : hasExpiring ? "yellow" : "green";
    return { staff_id: s.staff_id, name: s.full_name, role: s.role, status, credentialCount: creds.length, top: tracked[0] || null };
  }).sort((a, b) => {
    const rank = { red: 0, yellow: 1, green: 2 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return (a.top?.days_remaining ?? 99999) - (b.top?.days_remaining ?? 99999);
  });

  const kpis = [
    { label: "Staff", value: String(sum.staffCount ?? staff.length) },
    { label: "Credentials", value: String(sum.totalCredentials ?? "—") },
    { label: "Overdue", value: String(sum.overdue ?? 0) },
    { label: "Expiring ≤30d", value: String(sum.expiring ?? 0) },
  ];

  if (tabId === "credentials") {
    return { title: "Individual Credentials", view: "credentials", staff };
  }
  if (tabId === "training") {
    return { title: "Training Log", view: "training", training: r.training || [] };
  }
  if (tabId === "reminders") {
    return { title: "Reminder History", view: "reminders", subtitle: `${sum.remindersThisMonth || 0} this month`, reminders: r.reminders || [] };
  }
  if (tabId === "calendar") {
    const upcoming = roster
      .filter(x => x.top && x.top.days_remaining >= 0 && x.top.days_remaining <= 90)
      .map(x => ({ name: x.name, ...x.top }));
    return { title: "Renewal Calendar", view: "calendar", upcoming };
  }
  // dashboard (default) → people-first roster
  return {
    title: "Staff Credentials",
    view: "roster",
    subtitle: `${sum.staffCount} staff · ${sum.totalCredentials} credentials tracked`,
    kpis,
    roster,
  };
}

// ──────────────────────────────────────────────────────────────────
//  MARKETING (platform-marketing) — visual campaign-performance board
// ──────────────────────────────────────────────────────────────────

const DEMO_CAMPAIGNS = [
  { id: "spring-email", name: "Spring Launch · Email", channel: "email", impressions: 6800, clicks: 462, conversions: 87, spend: 420, revenue: 5100, ctr: 6.8, roi: 12.1, winning: true,
    trend: [12, 18, 24, 31, 28, 35, 40, 38, 44, 52, 48, 60, 55, 58],
    gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
  { id: "q2-linkedin", name: "Q2 Prospecting · LinkedIn", channel: "linkedin", impressions: 18200, clicks: 760, conversions: 34, spend: 1100, revenue: 8200, ctr: 4.2, roi: 7.5, winning: false,
    trend: [5, 8, 7, 11, 13, 10, 14, 16, 18, 15, 19, 22, 20, 24],
    gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  { id: "ig-brand", name: "Brand Awareness · Instagram", channel: "instagram", impressions: 42000, clicks: 1890, conversions: 22, spend: 800, revenue: 3400, ctr: 4.5, roi: 4.3, winning: false,
    trend: [8, 10, 9, 13, 15, 14, 18, 20, 17, 22, 25, 23, 28, 30],
    gradient: "linear-gradient(135deg,#f472b6,#fb7185)" },
];
const DEMO_KPIS = [
  { label: "Reach", value: "67k", delta: 12 },
  { label: "CTR", value: "5.4%", delta: 8 },
  { label: "Leads", value: "143", delta: 21 },
  { label: "ROI", value: "7.8x", delta: 14 },
];

async function buildMarketingPayload(tabId) {
  const r = await liveApiFetch("/v1/marketing:campaigns");
  let campaigns = Array.isArray(r?.campaigns) ? r.campaigns : [];
  let kpis = Array.isArray(r?.kpis) ? r.kpis : [];
  // No real campaigns yet — use demo data so the visual board always renders.
  // The _demo flag tells CanvasPanel to show the SAMPLE chip.
  const isDemo = campaigns.length === 0;
  if (isDemo) { campaigns = DEMO_CAMPAIGNS; kpis = DEMO_KPIS; }
  const winner = r?.winner || campaigns.find(c => c.winning) || campaigns[0];

  if (tabId === "creative") {
    return { _demo: isDemo, title: "Creative", view: "creative", campaigns };
  }
  if (tabId === "campaigns" || tabId === "email") {
    return { _demo: isDemo, title: tabId === "email" ? "Email" : "Campaigns", view: "campaigns", campaigns, kpis, winner };
  }
  // overview (default tab)
  return { _demo: isDemo, title: "Marketing", view: "overview", campaigns, kpis, winner };
}

// ──────────────────────────────────────────────────────────────────
//  VET-003 (vet-003-drug-dosing) — drug dosing & protocol worker
// ──────────────────────────────────────────────────────────────────

async function buildVetDosingPayload(tabId) {
  const r = await liveApiFetch("/v1/vet:dosing");
  if (!r?.ok) return null;
  const orders = Array.isArray(r.orders) ? r.orders : [];
  const protocols = Array.isArray(r.protocols) ? r.protocols : [];
  if (tabId === "history")  return { title: "Order History", view: "history", orders };
  if (tabId === "protocols") return { title: "Protocol Library", view: "protocols", protocols };
  if (tabId === "schedule" || tabId === "controlled") {
    return { title: "Controlled Substance Log", view: "controlled", orders: orders.filter(o => o.dea_schedule) };
  }
  // calculator (default)
  return {
    title: "Dosing Calculator", view: "calculator",
    proposal: r.proposal || null, kpis: r.kpis || [], speciesBreakdown: r.speciesBreakdown || [],
    // AI-generated explainer video (Fal.ai), rendered at the top of the canvas.
    videoUrl: "https://storage.googleapis.com/title-app-alpha.firebasestorage.app/demo/vet-003-drug-dosing/dosage-explainer.mp4",
    videoTitle: "Dosage basics — AI-generated explainer",
  };
}

// ──────────────────────────────────────────────────────────────────
//  EDU-001 (edu-001-cvt-exam-prep) — CVT exam-prep cohort worker
// ──────────────────────────────────────────────────────────────────

async function buildEduCohortPayload(tabId) {
  const r = await liveApiFetch("/v1/edu:cohort");
  if (!r?.ok) return null;
  if (tabId === "records")    return { title: "Completion Records", view: "records", completions: r.completions || [] };
  if (tabId === "cohort")     return { title: "Cohort Analytics", view: "cohort", analytics: r.analytics || null };
  if (tabId === "curriculum") return { title: "Course Curriculum", view: "curriculum", modules: r.modules || [] };
  // progress / dashboard (default)
  return { title: "Cohort Dashboard", view: "dashboard", kpis: r.kpis || [], featured: r.featured || null, students: r.students || [] };
}

// ──────────────────────────────────────────────────────────────────
//  CLINICAL-EVALUATION-001 — the signed-Vault loop (instructor view)
// ──────────────────────────────────────────────────────────────────

async function buildClinicalEvalPayload(tabId) {
  if (tabId === "records") {
    const r = await liveApiFetch("/v1/edu:evaluations");
    return { view: "records", title: "Signed Evaluations", evaluations: (r && r.evaluations) || [], count: (r && r.count) || 0 };
  }
  // sign (default) — the form; no data dependency
  return { view: "sign", title: "Sign a Clinical Evaluation" };
}

async function buildOerContentPayload() {
  const r = await liveApiFetch("/v1/edu:content");
  return { title: "Course Content", results: (r && r.results) || [], note: (r && r.note) || "" };
}

async function buildTitleAbstractPayload(tabId) {
  const r = await liveApiFetch("/v1/title-abstract:list");
  const abstracts = (r && r.abstracts) || [];
  if (!abstracts.length) return null;
  const view = tabId === "chain" ? "chain" : tabId === "liens" ? "liens" : "abstract";
  const titleMap = { abstract: "Title Abstract", chain: "Chain of Title", liens: "Liens & Encumbrances" };
  return { view, title: titleMap[view], abstract: abstracts[0], abstracts };
}

export async function getLiveDataForTab(worker, tabId) {
  if (!worker) return null;
  const slug = worker.slug || worker.workerId;
  try {
    if (slug === "clinical-evaluation-001") return await buildClinicalEvalPayload(tabId);
    if (slug === "student-eval-001")        return await buildClinicalEvalPayload(tabId);
    if (slug === "nursing-education-001")   return tabId === "content" ? await buildOerContentPayload() : await buildClinicalEvalPayload(tabId);
    if (slug === "title-abstract-001")      return await buildTitleAbstractPayload(tabId);
    if (slug === "vet-003-drug-dosing")     return await buildVetDosingPayload(tabId);
    if (slug === "edu-001-cvt-exam-prep")   return await buildEduCohortPayload(tabId);
    if (slug === "fundraise")               return await buildFundraisePayload(tabId);
    if (slug === "platform-hr")             return await buildPlatformHrPayload(tabId);
    if (slug === "platform-accounting")     return await buildAccountingPayload(tabId);
    if (slug === "platform-contacts")       return await buildContactsPayload(tabId);
    if (slug === "platform-marketing")      return await buildMarketingPayload(tabId);
    if (slug === "spine-4-staff-credentials") return await buildStaffCredentialPayload(tabId);
  } catch (e) {
    console.warn("[liveData] failed for", slug, tabId, e?.message || e);
  }
  return null;
}
