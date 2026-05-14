import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useContacts from "../hooks/useContacts";
import SuggestImprovementButton from "../components/SuggestImprovementButton";

const TABS = [
  { id: "all", label: "All" },
  { id: "worker", label: "By Worker" },
  { id: "segment", label: "Segments" },
  { id: "recent", label: "Recent" },
];

// Lead-discovery presets organized by USER INTENT, not by data source.
// "Apollo" is the implementation detail behind every find-by-criteria preset.
// Each preset declares the persona intent so the backend stores rows in the
// right tier/segment without leaking jargon into the UI.
const LEAD_PRESETS = {
  sales_lead: [
    {
      id: "auto-dealer-gm",
      label: "Auto Dealer GMs (1–5 rooftops)",
      criteria: { person_titles: ["General Manager", "Dealer Principal", "Owner"], q_organization_industries: ["Automotive"], person_locations: ["United States"], per_page: 25 },
      segment: "auto-dealer-gm",
    },
    {
      id: "re-broker",
      label: "RE Brokers / Small Title Shops",
      criteria: { person_titles: ["Broker", "Managing Broker", "Owner", "Principal"], q_organization_industries: ["Real Estate", "Real Estate Services"], person_locations: ["United States"], per_page: 25 },
      segment: "re-broker",
    },
    {
      id: "part-135",
      label: "Part 135 Director of Ops / Chief Pilot",
      criteria: { person_titles: ["Director of Operations", "Chief Pilot", "Director of Maintenance"], q_organization_industries: ["Aviation & Aerospace", "Airlines/Aviation"], person_locations: ["United States"], per_page: 25 },
      segment: "part-135",
    },
  ],
  investor: [
    {
      id: "accredited-angels",
      label: "Accredited Angel Investors",
      criteria: { person_titles: ["Angel Investor", "Founder", "Managing Partner", "Partner"], q_organization_keyword_tags: ["angel investor", "venture capital", "early stage"], person_locations: ["United States"], per_page: 25 },
      segment: "accredited-angels",
    },
    {
      id: "vc-partners",
      label: "VC Partners (Seed–Series A)",
      criteria: { person_titles: ["Partner", "General Partner", "Managing Partner", "Principal"], q_organization_keyword_tags: ["venture capital", "seed", "series a"], person_locations: ["United States"], per_page: 25 },
      segment: "vc-partners",
    },
    {
      id: "family-offices",
      label: "Family Office Investment Leads",
      criteria: { person_titles: ["Investment Director", "Director of Investments", "Chief Investment Officer", "Managing Director"], q_organization_keyword_tags: ["family office", "private wealth"], person_locations: ["United States"], per_page: 25 },
      segment: "family-offices",
    },
  ],
  media: [
    {
      id: "tech-press",
      label: "Tech / Startup Press",
      criteria: { person_titles: ["Reporter", "Journalist", "Editor", "Senior Writer"], q_organization_keyword_tags: ["technology news", "startups", "tech media"], person_locations: ["United States"], per_page: 25 },
      segment: "tech-press",
    },
    {
      id: "vertical-press-re",
      label: "Real Estate Trade Press",
      criteria: { person_titles: ["Reporter", "Editor", "Journalist"], q_organization_keyword_tags: ["real estate", "real estate news"], person_locations: ["United States"], per_page: 25 },
      segment: "vertical-press-re",
    },
  ],
  vendor: [
    {
      id: "saas-vendors",
      label: "SaaS / Tooling Vendors",
      criteria: { person_titles: ["Account Executive", "Solutions Engineer", "Customer Success"], person_locations: ["United States"], per_page: 25 },
      segment: "saas-vendors",
    },
  ],
};

// User-facing intent options for the "+ Add Contacts" modal. Each intent maps
// to either a list of LEAD_PRESETS, a CSV upload flow, or a manual add form.
const ADD_INTENTS = [
  { id: "sales_lead",  icon: "💼", title: "Find sales leads",        sub: "Prospects for outreach — auto dealers, RE brokers, Part 135, etc.", mode: "find" },
  { id: "investor",    icon: "💰", title: "Find investors",          sub: "Accredited angels, VC partners, family offices. Compliance-tracked.", mode: "find" },
  { id: "media",       icon: "📰", title: "Find media contacts",     sub: "Journalists, editors, trade press for product announcements.", mode: "find" },
  { id: "vendor",      icon: "🧰", title: "Find vendors",            sub: "SaaS, tooling, professional services suppliers.", mode: "find" },
  { id: "import_csv",  icon: "📂", title: "Import a CSV",            sub: "LinkedIn export, conference list, partner intro list, etc.", mode: "csv" },
  { id: "manual",      icon: "✍️", title: "Add one manually",        sub: "Type in a single contact with persona, segment, and notes.", mode: "manual" },
];

function workspaceLabel() {
  const id = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
  if (!id) return "Personal Vault";
  const display = localStorage.getItem("TENANT_NAME") || localStorage.getItem("WORKSPACE_NAME");
  return display || id;
}

function contactName(c) {
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return full || c.name || c.email || c.primary_email || "(unnamed)";
}
function contactEmail(c) { return c.email || c.primary_email || c.work_email || ""; }
function contactCompany(c) { return c.company || c.organization || c.employer_name || ""; }
function contactTitle(c) { return c.title || c.job_title || c.position || ""; }

function formatDate(ts) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Minimal CSV parser — handles quoted fields with embedded commas, doubled
// quote escapes, and CRLF line endings. Good enough for LinkedIn exports,
// Apollo CSVs, and conference attendee lists. We don't try to handle every
// pathological edge case — bigger files should use the bulk-import API
// directly via a script.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i+1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (cur.length || row.length) { row.push(cur); rows.push(row); }
        row = []; cur = "";
        if (ch === "\r" && text[i+1] === "\n") i++;
      } else { cur += ch; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// LinkedIn exports prefix the real CSV with 3-4 lines of notes/blank. We
// scan for the header row that starts with "First Name,Last Name". For other
// CSVs we just use the first non-empty row as the header.
function csvToContactRows(text) {
  const all = parseCsv(text);
  let headerIdx = 0;
  for (let i = 0; i < all.length; i++) {
    const first = (all[i][0] || "").trim();
    if (first === "First Name" || first === "first_name" || first === "Name" || first === "name") {
      headerIdx = i; break;
    }
  }
  const headers = all[headerIdx].map(h => h.toLowerCase().replace(/\s+/g, "_"));
  const out = [];
  for (let i = headerIdx + 1; i < all.length; i++) {
    if (!all[i].length || all[i].every(c => !c)) continue;
    const r = {};
    headers.forEach((h, j) => { r[h] = (all[i][j] || "").trim(); });
    // Normalize field names from common variants
    out.push({
      first_name: r.first_name || r.firstname || r.name?.split(" ")[0] || "",
      last_name:  r.last_name  || r.lastname  || r.name?.split(" ").slice(1).join(" ") || "",
      email:      r.email_address || r.email || r.work_email || "",
      company:    r.company || r.organization || r.employer || "",
      title:      r.position || r.title || r.job_title || "",
      linkedin_url: r.url || r.linkedin_url || r.profile_url || "",
      phone:      r.phone || r.phone_number || "",
    });
  }
  return out;
}

export default function Contacts() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({ total: 0, newThisMonth: 0, byWorker: {}, bySegment: {} });
  const [loadError, setLoadError] = useState(null);
  // Add-contacts flow state
  const [showAddIntent, setShowAddIntent] = useState(false);
  const [findIntent, setFindIntent] = useState(null);  // sales_lead | investor | media | vendor
  const [showCsv, setShowCsv] = useState(false);
  const [showManual, setShowManual] = useState(false);
  // Selection / bulk actions
  const [selected, setSelected] = useState(() => new Set());
  const [bulkConfirm, setBulkConfirm] = useState(null);

  const {
    listContacts, apolloPull, addContact, bulkImportContacts, bulkDeleteContacts,
    proposeSegments, applySegment, enrichContacts,
    loading,
  } = useContacts();

  // Auto-organize state — the proposal payload from /contacts:proposeSegments
  // and the per-bucket apply status so the UI can show progress.
  const [proposal, setProposal] = useState(null);
  const [proposing, setProposing] = useState(false);
  const [applyingSlug, setApplyingSlug] = useState(null);
  // Apollo enrichment state — confirm dialog payload + active run progress.
  const [enrichConfirm, setEnrichConfirm] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState(null);

  // Pagination state — driven by the server's nextCursor/hasMore.
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    setSelected(new Set());
    const result = await listContacts({ q: search, limit: 200 });
    if (result?.ok) {
      setContacts(result.contacts || []);
      setStats(result.stats || { total: 0, byWorker: {}, bySegment: {} });
      setNextCursor(result.nextCursor || null);
      setHasMore(!!result.hasMore);
    } else {
      setContacts([]);
      setLoadError(result?.error || "Failed to load contacts");
      setNextCursor(null);
      setHasMore(false);
    }
  }, [listContacts, search]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await listContacts({ q: search, limit: 200, cursor: nextCursor, stats: false });
      if (result?.ok) {
        setContacts(prev => [...prev, ...(result.contacts || [])]);
        setNextCursor(result.nextCursor || null);
        setHasMore(!!result.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [listContacts, search, nextCursor, loadingMore]);

  // Run the server-side persona heuristics, render the result inline as
  // a "proposal" panel. Replaces the prior "filter one-by-one" UX.
  const runProposeSegments = useCallback(async () => {
    setProposing(true);
    try {
      const r = await proposeSegments();
      if (r?.ok) setProposal(r);
    } finally {
      setProposing(false);
    }
  }, [proposeSegments]);

  // Apply one bucket's segment tag to all of its IDs in a single call.
  // Marks the bucket "_applied" so the UI flips state, then refreshes
  // the list so the new segment shows up in groupings.
  const runApplySegment = useCallback(async (bucket) => {
    setApplyingSlug(bucket.slug);
    try {
      const r = await applySegment({ segment: bucket.slug, ids: bucket.ids });
      if (r?.ok) {
        setProposal(p => p ? {
          ...p,
          breakdown: p.breakdown.map(b => b.slug === bucket.slug ? { ...b, _applied: r.updated } : b),
        } : p);
        refresh();
      }
    } finally {
      setApplyingSlug(null);
    }
  }, [applySegment, refresh]);

  // Confirm step before kicking off Apollo enrichment so the user sees the
  // cost preview. Each enrichment is ~1 data credit (~$1.00 at user-facing
  // rate, varies by tier). Backend caps at 100 per call so the run is
  // chunked — UI re-prompts for the next chunk after each batch.
  const requestEnrich = useCallback((bucket) => {
    setEnrichResult(null);
    setEnrichConfirm({ slug: bucket.slug, label: bucket.label, ids: bucket.ids });
  }, []);

  const runEnrich = useCallback(async () => {
    if (!enrichConfirm) return;
    setEnriching(true);
    try {
      const r = await enrichContacts({ ids: enrichConfirm.ids, maxPerCall: 100 });
      setEnrichResult(r);
      if (r?.ok) refresh();
    } finally {
      setEnriching(false);
    }
  }, [enrichConfirm, enrichContacts, refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onWorkspace = () => refresh();
    window.addEventListener("ta:workspace-changed", onWorkspace);
    return () => window.removeEventListener("ta:workspace-changed", onWorkspace);
  }, [refresh]);

  const filtered = useMemo(() => {
    const now = Date.now() / 1000;
    const thirtyDaysAgo = now - 30 * 24 * 3600;
    if (tab === "recent") return contacts.filter(c => (c.created_at?._seconds || 0) > thirtyDaysAgo);
    return contacts;
  }, [tab, contacts]);

  const workerGroups = useMemo(() => {
    const groups = {};
    contacts.forEach(c => {
      const slugs = new Set();
      (c.workerSlugs || []).forEach(s => slugs.add(s));
      (Array.isArray(c.personas) ? c.personas : []).forEach(p => {
        if (p.source_sub) slugs.add(p.source_sub);
        if (p.created_by_worker) slugs.add(p.created_by_worker);
      });
      if (slugs.size === 0) slugs.add("_unassigned");
      slugs.forEach(s => { if (!groups[s]) groups[s] = []; groups[s].push(c); });
    });
    return Object.entries(groups).map(([slug, list]) => ({ slug, count: list.length, contacts: list })).sort((a, b) => b.count - a.count);
  }, [contacts]);

  const segmentGroups = useMemo(() => {
    const groups = {};
    contacts.forEach(c => {
      const segs = new Set();
      // Prefer top-level segments[] (set on every imported / Apollo-added contact);
      // fall back to persona-derived for older docs.
      (c.segments || []).forEach(s => segs.add(s));
      (c.types_index || []).forEach(t => segs.add(t));
      (Array.isArray(c.personas) ? c.personas : []).forEach(p => {
        if (p.type) segs.add(p.type);
        if (p.segment_tag) segs.add(p.segment_tag);
      });
      if (segs.size === 0) segs.add("_unassigned");
      segs.forEach(s => { if (!groups[s]) groups[s] = []; groups[s].push(c); });
    });
    return Object.entries(groups).map(([segment, list]) => ({ segment, count: list.length, contacts: list })).sort((a, b) => b.count - a.count);
  }, [contacts]);

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(c => c.id)));
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const result = await bulkDeleteContacts({ ids });
    if (result?.ok) {
      setBulkConfirm(null);
      clearSelection();
      refresh();
    }
  };

  return (
    <div>
      {/* Top bar */}
      <div className="pageHeader" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <h1 className="h1" style={{ margin: 0 }}>Contacts</h1>
          <span title="Active workspace — contacts are isolated per workspace" style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#ede9fe", color: "#6d28d9", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
            {workspaceLabel()}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="iconBtn" onClick={refresh} style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>Refresh</button>
          <button
            className="iconBtn"
            onClick={runProposeSegments}
            disabled={proposing}
            title="Scan this workspace's contacts and propose persona buckets you can apply in one click"
            style={{ background: "white", color: "#7c3aed", border: "1px solid #c4b5fd" }}
          >
            {proposing ? "Scanning…" : "Auto-organize"}
          </button>
          <button className="iconBtn" onClick={() => setShowAddIntent(true)} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}>+ Add Contacts</button>
          {/* Suggest improvement sits inside the action row but renders as a
              text link, not a button, so it never competes with the primary
              CTAs. flexWrap on the row keeps it from overlapping the title
              when the viewport is narrow. */}
          <SuggestImprovementButton workerSlug="platform-contacts" />
        </div>
      </div>

      {/* KPI strip — Total is the real workspace-wide count() aggregate.
          Loaded is the size of the current paged view; Load More pulls the
          next slice. Workers/Segments are derived from what's currently
          loaded (per-page) which is fine for the strip — the AI segmentation
          card gives the full tenant breakdown when you need it. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>Total contacts</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{(stats.total ?? "—").toLocaleString?.() || stats.total}</div>
        </div>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>Showing on page</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a", marginTop: 2 }}>{contacts.length.toLocaleString()}</div>
          {hasMore && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>scroll down for Load More</div>}
        </div>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>Workers</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{Object.keys(stats.byWorker || {}).length}</div>
        </div>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>Segments</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{Object.keys(stats.bySegment || {}).length}</div>
        </div>
      </div>

      {/* Auto-organize proposal panel — appears after the user clicks
          "Auto-organize" in the top bar. Shows the breakdown the server
          inferred (investor candidates, B2B C-suite, accelerator programs,
          media, etc.) with one-click Apply per bucket. */}
      {proposal && (
        <div className="card" style={{ padding: "16px 18px", marginBottom: 16, background: "linear-gradient(180deg, #faf5ff 0%, #ffffff 60%)", border: "1px solid #ddd6fe" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Proposed segments</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Scanned {proposal.scanned?.toLocaleString?.() || proposal.scanned} contacts in this workspace. Click Apply on any bucket to tag those contacts with the segment slug.
              </div>
            </div>
            <button onClick={() => setProposal(null)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {(proposal.breakdown || []).map(b => {
              const applied = typeof b._applied === "number";
              const busy = applyingSlug === b.slug;
              return (
                <div key={b.slug} style={{ padding: "10px 12px", background: "white", border: "1px solid #e9d5ff", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{b.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", background: "#f3e8ff", padding: "2px 8px", borderRadius: 999 }}>{b.count.toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>{b.description}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {applied ? (
                      <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Applied · {b._applied} tagged</div>
                    ) : (
                      <button
                        onClick={() => runApplySegment(b)}
                        disabled={busy}
                        style={{ fontSize: 11, fontWeight: 600, color: busy ? "#94a3b8" : "#7c3aed", background: busy ? "#e2e8f0" : "white", border: "1px solid #c4b5fd", padding: "4px 10px", borderRadius: 6, cursor: busy ? "default" : "pointer" }}
                      >
                        {busy ? "Applying…" : `Apply "${b.slug}"`}
                      </button>
                    )}
                    {/* Show "Clean up with Apollo" CTA on buckets where
                        Apollo enrichment makes sense — missing email is the
                        obvious one; investor + B2B prospects benefit too
                        because they often need fresh contact info. Hidden
                        on buckets where enrichment isn't useful (recruiter,
                        legal, accelerator-program — those are organizations
                        not individuals). */}
                    {["no_email", "investor_candidate", "b2b_csuite", "b2b_other"].includes(b.slug) && (
                      <button
                        onClick={() => requestEnrich(b)}
                        title="Use Apollo to fill missing emails, phones, titles. Charges ~1 data credit per contact."
                        style={{ fontSize: 11, fontWeight: 600, color: "#0369a1", background: "#e0f2fe", border: "1px solid #7dd3fc", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
                      >
                        Clean up with Apollo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input type="search" placeholder="Search by name, email, company, title…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "white", outline: "none" }} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent", color: tab === t.id ? "#7c3aed" : "#64748b", cursor: "pointer", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Bulk-action bar — only shows when something is selected */}
      {selected.size > 0 && (
        <div className="card" style={{ padding: "10px 14px", marginBottom: 12, background: "#faf5ff", border: "1px solid #ddd6fe", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6d28d9" }}>{selected.size} selected</div>
          <button onClick={selectAll} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0", fontSize: 12 }}>Select all visible</button>
          <button onClick={clearSelection} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0", fontSize: 12 }}>Clear</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setBulkConfirm({ count: selected.size })} className="iconBtn" style={{ background: "#dc2626", color: "white", border: "none", fontSize: 12 }}>Delete selected</button>
        </div>
      )}

      {/* Body */}
      {loading && (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Loading contacts…</div>
      )}
      {!loading && loadError && (
        <div className="card" style={{ padding: 24, textAlign: "center", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
          Failed to load contacts: {loadError}
        </div>
      )}
      {!loading && !loadError && contacts.length === 0 && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>No contacts in this workspace yet</div>
          <div style={{ fontSize: 14, color: "#64748b", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Start by finding leads, importing a CSV, or adding a contact manually. Contacts are isolated to <strong>{workspaceLabel()}</strong> — they don't leak across workspaces.
          </div>
          <button onClick={() => setShowAddIntent(true)} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 10, cursor: "pointer" }}>+ Add Contacts</button>
        </div>
      )}
      {!loading && !loadError && contacts.length > 0 && (tab === "all" || tab === "recent") && (
        <ContactTable contacts={filtered} selected={selected} toggleSelect={toggleSelect} />
      )}
      {!loading && !loadError && contacts.length > 0 && tab === "worker" && (
        <GroupedView groups={workerGroups} groupKey="slug" emptyLabel="No worker-tagged contacts yet" selected={selected} toggleSelect={toggleSelect} />
      )}
      {!loading && !loadError && contacts.length > 0 && tab === "segment" && (
        <GroupedView groups={segmentGroups} groupKey="segment" emptyLabel="No segmented contacts yet" selected={selected} toggleSelect={toggleSelect} />
      )}

      {/* Load More — only shows when the server has more pages. Pages append
          to the current list so the user can keep scrolling toward the full
          workspace total shown in the KPI strip. */}
      {!loading && !loadError && hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600,
              background: loadingMore ? "#e2e8f0" : "white",
              color: loadingMore ? "#94a3b8" : "#7c3aed",
              border: "1px solid #c4b5fd", borderRadius: 8,
              cursor: loadingMore ? "default" : "pointer",
            }}
          >
            {loadingMore ? "Loading…" : `Load more (${(stats.total || 0) - contacts.length} remaining)`}
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddIntent && (
        <AddIntentModal
          onClose={() => setShowAddIntent(false)}
          onPick={(intent) => {
            setShowAddIntent(false);
            if (intent.mode === "find") setFindIntent(intent.id);
            else if (intent.mode === "csv") setShowCsv(true);
            else if (intent.mode === "manual") setShowManual(true);
          }}
        />
      )}
      {findIntent && (
        <FindLeadsModal
          intent={findIntent}
          presets={LEAD_PRESETS[findIntent] || []}
          onClose={() => setFindIntent(null)}
          onPull={async (preset) => {
            const result = await apolloPull({ criteria: preset.criteria, contact_tier: findIntent === "investor" ? "investor" : "prospect", source_sub: preset.segment });
            return result;
          }}
          onDone={() => { setFindIntent(null); refresh(); }}
        />
      )}
      {showCsv && (
        <CsvImportModal
          onClose={() => setShowCsv(false)}
          onImport={async ({ rows, intent, segment }) => {
            const result = await bulkImportContacts({ rows, intent, segment, source: `csv-import-${new Date().toISOString().slice(0,10)}` });
            return result;
          }}
          onDone={() => { setShowCsv(false); refresh(); }}
        />
      )}
      {showManual && (
        <ManualAddModal
          onClose={() => setShowManual(false)}
          onAdd={async (fields) => addContact(fields)}
          onDone={() => { setShowManual(false); refresh(); }}
        />
      )}
      {bulkConfirm && (
        <BulkDeleteConfirm count={bulkConfirm.count} onCancel={() => setBulkConfirm(null)} onConfirm={handleBulkDelete} />
      )}
      {enrichConfirm && (
        <EnrichConfirm
          bucket={enrichConfirm}
          enriching={enriching}
          result={enrichResult}
          onCancel={() => { setEnrichConfirm(null); setEnrichResult(null); }}
          onConfirm={runEnrich}
        />
      )}
    </div>
  );
}

// Apollo enrichment confirmation modal. Shows the bucket label + count,
// a cost preview (Apollo charges ~1 credit per enrichment, marked up
// to data-fee tier on the platform), and a clear "Run enrichment" CTA.
// After a run, displays the result + a "Continue" button if more remain.
function EnrichConfirm({ bucket, enriching, result, onCancel, onConfirm }) {
  const remaining = result?.remaining ?? bucket.ids.length;
  const willRun = Math.min(bucket.ids.length, 100);
  return (
    <ModalShell onClose={onCancel} title="Clean up with Apollo" subtitle={`Bucket: ${bucket.label} — ${bucket.ids.length.toLocaleString()} contacts`}>
      {!result && (
        <>
          <div style={{ padding: "12px 0", fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            Apollo will look up each contact by name + company and fill in any missing
            email, phone, LinkedIn, and current role.
          </div>
          <div className="card" style={{ padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>This run</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{willRun.toLocaleString()} contacts</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              {bucket.ids.length > 100 ? `${(bucket.ids.length - 100).toLocaleString()} more after this batch — you'll be prompted to continue.` : "All of this bucket in one batch."}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
              Charges <strong>1 data credit per enrichment</strong> on your account. Contacts
              that already have an email or are missing name+company are skipped automatically (no charge).
            </div>
          </div>
        </>
      )}
      {result && (
        <div className="card" style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>Run complete</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
            Enriched: <strong>{result.enriched}</strong> · Skipped: <strong>{result.skipped}</strong> · Attempted: {result.attempted}
          </div>
          {result.failures?.length > 0 && (
            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>
              {result.failures.length} failure(s) — most common: rate limit or no Apollo match.
            </div>
          )}
          {remaining > 0 && (
            <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
              <strong>{remaining.toLocaleString()}</strong> contacts remaining in this bucket. Click Continue to run the next batch of up to 100.
            </div>
          )}
        </div>
      )}
      <ModalFooter onClose={onCancel}>
        {(!result || remaining > 0) && (
          <button
            onClick={onConfirm}
            disabled={enriching}
            style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: enriching ? "#cbd5e1" : "#0284c7", color: "white", border: "none", borderRadius: 8, cursor: enriching ? "default" : "pointer" }}
          >
            {enriching ? "Enriching…" : (result ? "Continue with next 100" : `Enrich ${willRun} contacts`)}
          </button>
        )}
      </ModalFooter>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ContactTable + selection
// ─────────────────────────────────────────────────────────────────────────

function ContactTable({ contacts, selected, toggleSelect }) {
  if (!contacts.length) {
    return <div className="card" style={{ padding: 32, textAlign: "center", color: "#64748b" }}>No contacts match the current filter.</div>;
  }
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "36px minmax(180px, 1.4fr) minmax(180px, 1.2fr) minmax(140px, 1fr) 100px", padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
        <div></div>
        <div>Name</div>
        <div>Company / Title</div>
        <div>Email</div>
        <div style={{ textAlign: "right" }}>Added</div>
      </div>
      {contacts.map(c => {
        const isSel = selected?.has(c.id);
        return (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "36px minmax(180px, 1.4fr) minmax(180px, 1.2fr) minmax(140px, 1fr) 100px", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13, background: isSel ? "#faf5ff" : "transparent" }}>
            <div>
              <input type="checkbox" checked={isSel || false} onChange={() => toggleSelect?.(c.id)} style={{ cursor: "pointer" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contactName(c)}</div>
            </div>
            <div style={{ minWidth: 0, color: "#475569" }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contactCompany(c) || "—"}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contactTitle(c)}</div>
            </div>
            <div style={{ minWidth: 0, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contactEmail(c) || "—"}</div>
            <div style={{ textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{formatDate(c.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

function GroupedView({ groups, groupKey, emptyLabel, selected, toggleSelect }) {
  if (!groups.length) return <div className="card" style={{ padding: 32, textAlign: "center", color: "#64748b" }}>{emptyLabel}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groups.map(g => {
        const label = g[groupKey] === "_unassigned" ? "Unassigned" : g[groupKey];
        return (
          <div key={g[groupKey]}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#7c3aed"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{g.count} contact{g.count === 1 ? "" : "s"}</div>
            </div>
            <ContactTable contacts={g.contacts} selected={selected} toggleSelect={toggleSelect} />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AddIntentModal — top-level "What do you want to do?" picker
// ─────────────────────────────────────────────────────────────────────────

function AddIntentModal({ onClose, onPick }) {
  return (
    <ModalShell onClose={onClose} title="Add contacts" subtitle="Pick what kind of contacts you're adding — we'll route to the right flow.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ADD_INTENTS.map(opt => (
          <button key={opt.id} onClick={() => onPick(opt)} style={{ textAlign: "left", padding: "14px 16px", border: "1px solid #e2e8f0", borderRadius: 12, background: "white", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "#faf5ff"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "white"; }}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>{opt.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{opt.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FindLeadsModal — replaces the bare "Pull from Apollo" modal
// ─────────────────────────────────────────────────────────────────────────

function FindLeadsModal({ intent, presets, onClose, onPull, onDone }) {
  const [selectedId, setSelectedId] = useState(presets[0]?.id);
  const [pullStatus, setPullStatus] = useState(null);
  const preset = presets.find(p => p.id === selectedId) || presets[0];

  const heading = intent === "sales_lead" ? "Find sales leads"
    : intent === "investor" ? "Find investors"
    : intent === "media" ? "Find media contacts"
    : "Find vendors";

  const run = async () => {
    setPullStatus({ state: "running" });
    const result = await onPull(preset);
    if (result?.ok) {
      setPullStatus({ state: "done", written: result.written || 0, enriched: result.enrichedExisting || 0, burn: result.burn });
    } else {
      setPullStatus({ state: "error", message: result?.error });
    }
  };

  return (
    <ModalShell onClose={onClose} title={heading} subtitle={`Searches our lead-discovery provider. Credits are consumed per result. Your data fee is logged automatically.`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {presets.map(p => (
          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: selectedId === p.id ? "2px solid #7c3aed" : "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", background: selectedId === p.id ? "#faf5ff" : "white" }}>
            <input type="radio" name="lead-preset" checked={selectedId === p.id} onChange={() => setSelectedId(p.id)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{p.criteria.per_page} results · titles: {(p.criteria.person_titles || []).join(", ")}</div>
            </div>
          </label>
        ))}
      </div>
      {pullStatus?.state === "running" && <div style={{ padding: 10, fontSize: 13, color: "#64748b" }}>Searching…</div>}
      {pullStatus?.state === "done" && (
        <div style={{ padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8, marginBottom: 12 }}>
          Added {pullStatus.written} new contacts, enriched {pullStatus.enriched} existing.{pullStatus.burn ? ` · Credits used this month: ${pullStatus.burn.consumedThisMonth || 0}` : ""}
        </div>
      )}
      {pullStatus?.state === "error" && (
        <div style={{ padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8, marginBottom: 12 }}>Search failed: {pullStatus.message}</div>
      )}
      <ModalFooter onClose={onClose}>
        {pullStatus?.state === "done" ? (
          <button onClick={onDone} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}>Done</button>
        ) : (
          <button onClick={run} disabled={pullStatus?.state === "running"} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: pullStatus?.state === "running" ? 0.6 : 1 }}>{pullStatus?.state === "running" ? "Searching…" : "Find now"}</button>
        )}
      </ModalFooter>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CsvImportModal — file picker, preview, intent selector, bulk insert
// ─────────────────────────────────────────────────────────────────────────

function CsvImportModal({ onClose, onImport, onDone }) {
  const [rows, setRows] = useState([]);
  const [filename, setFilename] = useState("");
  const [intent, setIntent] = useState("sales_lead");
  const [segment, setSegment] = useState("");
  const [importStatus, setImportStatus] = useState(null);
  const inputRef = useRef(null);

  const onFile = async (file) => {
    if (!file) return;
    setFilename(file.name);
    const text = await file.text();
    const parsed = csvToContactRows(text);
    setRows(parsed);
  };

  const run = async () => {
    setImportStatus({ state: "running" });
    const result = await onImport({ rows, intent, segment });
    if (result?.ok) setImportStatus({ state: "done", written: result.written, skipped: result.skipped });
    else setImportStatus({ state: "error", message: result?.error });
  };

  const INTENT_OPTS = [
    { id: "sales_lead", label: "Sales leads / prospects" },
    { id: "investor", label: "Investors / accelerators" },
    { id: "media", label: "Media / press" },
    { id: "creator", label: "Creator candidates" },
    { id: "vendor", label: "Vendors / suppliers" },
    { id: "partner", label: "Partners / integrators" },
    { id: "manual", label: "Mixed / unsorted (review later)" },
  ];

  return (
    <ModalShell onClose={onClose} title="Import a CSV" subtitle="LinkedIn export, Apollo CSV, conference list — anything with name + email + company columns. We auto-detect the header row.">
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => inputRef.current?.click()} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px dashed #cbd5e1", width: "100%", padding: "20px", fontSize: 14, fontWeight: 600 }}>
          {filename ? `📂 ${filename} · ${rows.length} rows` : "📂 Choose a CSV file"}
        </button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={e => onFile(e.target.files?.[0])} />
      </div>
      {rows.length > 0 && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>What kind of contacts are these?</label>
            <select value={intent} onChange={e => setIntent(e.target.value)} style={{ width: "100%", padding: "10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" }}>
              {INTENT_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Optional segment tag (e.g. "spring-2026-conf", "kent-network")</label>
            <input type="text" value={segment} onChange={e => setSegment(e.target.value)} placeholder="leave blank to use intent default" style={{ width: "100%", padding: "10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8 }} />
          </div>
          <div style={{ marginBottom: 14, padding: 10, background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#64748b" }}>
            Preview: {rows.slice(0,3).map((r,i) => <span key={i} style={{display:"block"}}>{`${r.first_name} ${r.last_name} · ${r.company || "—"} · ${r.title || "—"}`}</span>)}
            {rows.length > 3 && <span style={{ display: "block", marginTop: 4, color: "#94a3b8" }}>...and {rows.length - 3} more</span>}
          </div>
        </>
      )}
      {importStatus?.state === "running" && <div style={{ padding: 10, fontSize: 13, color: "#64748b" }}>Importing {rows.length} contacts…</div>}
      {importStatus?.state === "done" && (
        <div style={{ padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8, marginBottom: 12 }}>
          Imported {importStatus.written} contacts.{importStatus.skipped ? ` Skipped ${importStatus.skipped} (missing name).` : ""}
        </div>
      )}
      {importStatus?.state === "error" && (
        <div style={{ padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8, marginBottom: 12 }}>Import failed: {importStatus.message}</div>
      )}
      <ModalFooter onClose={onClose}>
        {importStatus?.state === "done" ? (
          <button onClick={onDone} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}>Done</button>
        ) : (
          <button onClick={run} disabled={!rows.length || importStatus?.state === "running"} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: (!rows.length || importStatus?.state === "running") ? 0.5 : 1 }}>
            {importStatus?.state === "running" ? "Importing…" : `Import ${rows.length || 0} contacts`}
          </button>
        )}
      </ModalFooter>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ManualAddModal — single-contact form
// ─────────────────────────────────────────────────────────────────────────

function ManualAddModal({ onClose, onAdd, onDone }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", title: "", linkedin_url: "", intent: "sales_lead", segments: "", notes: "" });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const INTENT_OPTS = [
    { id: "sales_lead", label: "Sales lead / prospect" },
    { id: "investor", label: "Investor" },
    { id: "accredited_investor", label: "Accredited investor (verified)" },
    { id: "media", label: "Media / press" },
    { id: "creator", label: "Creator candidate" },
    { id: "vendor", label: "Vendor / supplier" },
    { id: "partner", label: "Partner / integrator" },
    { id: "advisor", label: "Advisor" },
    { id: "regulator", label: "Regulator" },
    { id: "professional_services", label: "Professional services (law/accounting)" },
    { id: "employee", label: "Team member / employee" },
    { id: "manual", label: "Other / personal" },
  ];

  const run = async () => {
    setStatus({ state: "running" });
    const fields = { ...form, segments: form.segments.split(",").map(s => s.trim()).filter(Boolean) };
    const result = await onAdd(fields);
    if (result?.ok) setStatus({ state: "done", id: result.id });
    else setStatus({ state: "error", message: result?.error });
  };

  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };

  return (
    <ModalShell onClose={onClose} title="Add a contact manually" subtitle="Type in a single contact. Use intent to set the right persona, tier, and default segment.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label style={labelStyle}>First name</label><input style={fieldStyle} value={form.first_name} onChange={e => set("first_name", e.target.value)} /></div>
        <div><label style={labelStyle}>Last name</label><input style={fieldStyle} value={form.last_name} onChange={e => set("last_name", e.target.value)} /></div>
        <div><label style={labelStyle}>Email</label><input type="email" style={fieldStyle} value={form.email} onChange={e => set("email", e.target.value)} /></div>
        <div><label style={labelStyle}>Phone</label><input style={fieldStyle} value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
        <div><label style={labelStyle}>Company</label><input style={fieldStyle} value={form.company} onChange={e => set("company", e.target.value)} /></div>
        <div><label style={labelStyle}>Title</label><input style={fieldStyle} value={form.title} onChange={e => set("title", e.target.value)} /></div>
        <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>LinkedIn URL</label><input style={fieldStyle} value={form.linkedin_url} onChange={e => set("linkedin_url", e.target.value)} /></div>
        <div><label style={labelStyle}>Persona / intent</label>
          <select value={form.intent} onChange={e => set("intent", e.target.value)} style={fieldStyle}>{INTENT_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
        </div>
        <div><label style={labelStyle}>Segments (comma-sep)</label><input style={fieldStyle} value={form.segments} onChange={e => set("segments", e.target.value)} placeholder="optional" /></div>
        <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Notes</label><textarea rows={2} style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
      </div>
      {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Added. ID: {status.id}</div>}
      {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>Failed: {status.message}</div>}
      <ModalFooter onClose={onClose}>
        {status?.state === "done" ? (
          <button onClick={onDone} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}>Done</button>
        ) : (
          <button onClick={run} disabled={!form.first_name && !form.last_name && !form.email} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: (!form.first_name && !form.last_name && !form.email) ? 0.5 : 1 }}>{status?.state === "running" ? "Adding…" : "Add contact"}</button>
        )}
      </ModalFooter>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// BulkDeleteConfirm — destructive action gate
// ─────────────────────────────────────────────────────────────────────────

function BulkDeleteConfirm({ count, onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} title={`Delete ${count} contact${count === 1 ? "" : "s"}?`} subtitle="This is a soft delete — contacts are marked deleted but stay recoverable in the backend for 30 days.">
      <ModalFooter onClose={onCancel}>
        <button onClick={onConfirm} className="iconBtn" style={{ background: "#dc2626", color: "white", border: "none" }}>Delete {count}</button>
      </ModalFooter>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared modal shell
// ─────────────────────────────────────────────────────────────────────────

function ModalShell({ onClose, title, subtitle, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: "min(620px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>{title}</h2>
        {subtitle && <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, children }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
      <button onClick={onClose} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>Close</button>
      {children}
    </div>
  );
}
