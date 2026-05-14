import React, { useState, useEffect, useCallback, useMemo } from "react";
import useContacts from "../hooks/useContacts";

const TABS = [
  { id: "all", label: "All" },
  { id: "worker", label: "By Worker" },
  { id: "segment", label: "Segments" },
  { id: "recent", label: "Recent" },
];

// Pre-filled ICP recipes for the Apollo pull modal. Each captures a launch-list
// ICP we already know we'll target (auto dealers, RE brokers, aviation Part 135).
const APOLLO_PRESETS = [
  {
    id: "auto-dealer-gm",
    label: "Auto Dealer GMs (1–5 rooftops)",
    criteria: {
      person_titles: ["General Manager", "Dealer Principal", "Owner"],
      q_organization_industries: ["Automotive"],
      person_locations: ["United States"],
      per_page: 25,
    },
    segment: "auto-dealer-gm",
  },
  {
    id: "re-broker",
    label: "RE Brokers / Small Title Shops",
    criteria: {
      person_titles: ["Broker", "Managing Broker", "Owner", "Principal"],
      q_organization_industries: ["Real Estate", "Real Estate Services"],
      person_locations: ["United States"],
      per_page: 25,
    },
    segment: "re-broker",
  },
  {
    id: "part-135",
    label: "Part 135 Director of Ops / Chief Pilot",
    criteria: {
      person_titles: ["Director of Operations", "Chief Pilot", "Director of Maintenance"],
      q_organization_industries: ["Aviation & Aerospace", "Airlines/Aviation"],
      person_locations: ["United States"],
      per_page: 25,
    },
    segment: "part-135",
  },
];

function workspaceLabel() {
  // The Workspace pill — pulls a friendly name from common localStorage keys.
  const id = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
  if (!id) return "Personal Vault";
  const display = localStorage.getItem("TENANT_NAME") || localStorage.getItem("WORKSPACE_NAME");
  return display || id;
}

function contactName(c) {
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return full || c.name || c.email || c.primary_email || "(unnamed)";
}

function contactEmail(c) {
  return c.email || c.primary_email || c.work_email || "";
}

function contactCompany(c) {
  return c.company || c.organization || c.employer_name || "";
}

function contactTitle(c) {
  return c.title || c.job_title || c.position || "";
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Contacts() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({ total: 0, newThisMonth: 0, byWorker: {}, bySegment: {} });
  const [loadError, setLoadError] = useState(null);
  const [showApolloModal, setShowApolloModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(APOLLO_PRESETS[0]);
  const [pullStatus, setPullStatus] = useState(null);
  const { listContacts, apolloPull, loading } = useContacts();

  const refresh = useCallback(async () => {
    setLoadError(null);
    const result = await listContacts({ q: search });
    if (result?.ok) {
      setContacts(result.contacts || []);
      setStats(result.stats || { total: 0, newThisMonth: 0, byWorker: {}, bySegment: {} });
    } else {
      setContacts([]);
      setLoadError(result?.error || "Failed to load contacts");
    }
  }, [listContacts, search]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onWorkspace = () => refresh();
    window.addEventListener("ta:workspace-changed", onWorkspace);
    return () => window.removeEventListener("ta:workspace-changed", onWorkspace);
  }, [refresh]);

  // Apply the active tab's grouping/filter against the already-fetched list.
  const filtered = useMemo(() => {
    const now = Date.now() / 1000;
    const thirtyDaysAgo = now - 30 * 24 * 3600;
    if (tab === "recent") {
      return contacts.filter(c => (c.created_at?._seconds || 0) > thirtyDaysAgo);
    }
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
      slugs.forEach(s => {
        if (!groups[s]) groups[s] = [];
        groups[s].push(c);
      });
    });
    return Object.entries(groups)
      .map(([slug, list]) => ({ slug, count: list.length, contacts: list }))
      .sort((a, b) => b.count - a.count);
  }, [contacts]);

  const segmentGroups = useMemo(() => {
    const groups = {};
    contacts.forEach(c => {
      const segs = new Set();
      (c.types_index || []).forEach(t => segs.add(t));
      (Array.isArray(c.personas) ? c.personas : []).forEach(p => {
        if (p.type) segs.add(p.type);
        if (p.segment_tag) segs.add(p.segment_tag);
      });
      if (segs.size === 0) segs.add("_unassigned");
      segs.forEach(s => {
        if (!groups[s]) groups[s] = [];
        groups[s].push(c);
      });
    });
    return Object.entries(groups)
      .map(([segment, list]) => ({ segment, count: list.length, contacts: list }))
      .sort((a, b) => b.count - a.count);
  }, [contacts]);

  const runApolloPull = async () => {
    setPullStatus({ state: "running", preset: selectedPreset.id });
    const result = await apolloPull({
      criteria: selectedPreset.criteria,
      contact_tier: "prospect",
      source_sub: selectedPreset.segment,
    });
    if (result?.ok) {
      setPullStatus({
        state: "done",
        preset: selectedPreset.id,
        written: result.written || 0,
        enrichedExisting: result.enrichedExisting || 0,
        burn: result.burn,
      });
      refresh();
    } else {
      setPullStatus({ state: "error", preset: selectedPreset.id, message: result?.error });
    }
  };

  return (
    <div>
      {/* Top bar — workspace pill + search + action buttons */}
      <div className="pageHeader" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <h1 className="h1" style={{ margin: 0 }}>Contacts</h1>
          <span
            title="Active workspace — contacts are isolated per workspace"
            style={{
              padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: "#ede9fe", color: "#6d28d9", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
            {workspaceLabel()}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="iconBtn"
            onClick={refresh}
            style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}
          >
            Refresh
          </button>
          <button
            className="iconBtn"
            onClick={() => setShowApolloModal(true)}
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
          >
            Pull from Apollo
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>Total</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>New this month</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a", marginTop: 2 }}>{stats.newThisMonth}</div>
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

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Search by name, email, company, title…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", fontSize: 14,
            border: "1px solid #e2e8f0", borderRadius: 10,
            background: "white", outline: "none",
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 600,
              background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent",
              color: tab === t.id ? "#7c3aed" : "#64748b", cursor: "pointer", marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>No contacts in this workspace yet</div>
          <div style={{ fontSize: 14, color: "#64748b", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Pull a starter list from Apollo, or import a CSV. Contacts are isolated to <strong>{workspaceLabel()}</strong> — they don't leak across workspaces.
          </div>
          <button
            onClick={() => setShowApolloModal(true)}
            style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 10, cursor: "pointer" }}
          >
            Pull from Apollo
          </button>
        </div>
      )}
      {!loading && !loadError && contacts.length > 0 && tab === "all" && (
        <ContactTable contacts={filtered} />
      )}
      {!loading && !loadError && contacts.length > 0 && tab === "recent" && (
        <ContactTable contacts={filtered} />
      )}
      {!loading && !loadError && contacts.length > 0 && tab === "worker" && (
        <GroupedView groups={workerGroups} groupKey="slug" emptyLabel="No worker-tagged contacts yet" />
      )}
      {!loading && !loadError && contacts.length > 0 && tab === "segment" && (
        <GroupedView groups={segmentGroups} groupKey="segment" emptyLabel="No segmented contacts yet" />
      )}

      {/* Apollo pull modal */}
      {showApolloModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowApolloModal(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: "min(560px, 92vw)", padding: 24, background: "white" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Pull contacts from Apollo</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
              Apollo charges credits per result. Contacts will be tagged with the preset's segment for filtering later.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {APOLLO_PRESETS.map(p => (
                <label
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    border: selectedPreset.id === p.id ? "2px solid #7c3aed" : "1px solid #e2e8f0",
                    borderRadius: 10, cursor: "pointer",
                    background: selectedPreset.id === p.id ? "#faf5ff" : "white",
                  }}
                >
                  <input
                    type="radio"
                    name="apollo-preset"
                    checked={selectedPreset.id === p.id}
                    onChange={() => setSelectedPreset(p)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {p.criteria.per_page} results · titles: {(p.criteria.person_titles || []).join(", ")}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {pullStatus?.state === "running" && (
              <div style={{ padding: 10, fontSize: 13, color: "#64748b" }}>Pulling from Apollo…</div>
            )}
            {pullStatus?.state === "done" && (
              <div style={{ padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8, marginBottom: 12 }}>
                Pulled {pullStatus.written} new contacts, enriched {pullStatus.enrichedExisting} existing.
                {pullStatus.burn && ` · Credits used this month: ${pullStatus.burn.consumedThisMonth || 0}`}
              </div>
            )}
            {pullStatus?.state === "error" && (
              <div style={{ padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8, marginBottom: 12 }}>
                Pull failed: {pullStatus.message}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowApolloModal(false)} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>Close</button>
              <button
                onClick={runApolloPull}
                disabled={loading || pullStatus?.state === "running"}
                className="iconBtn"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: loading ? 0.6 : 1 }}
              >
                {pullStatus?.state === "running" ? "Pulling…" : "Pull now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactTable({ contacts }) {
  if (!contacts.length) {
    return <div className="card" style={{ padding: 32, textAlign: "center", color: "#64748b" }}>No contacts match the current filter.</div>;
  }
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "minmax(180px, 1.4fr) minmax(180px, 1.2fr) minmax(140px, 1fr) 100px",
        padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
        background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#64748b",
        textTransform: "uppercase", letterSpacing: 0.4,
      }}>
        <div>Name</div>
        <div>Company / Title</div>
        <div>Email</div>
        <div style={{ textAlign: "right" }}>Added</div>
      </div>
      {contacts.map(c => (
        <div
          key={c.id}
          style={{
            display: "grid", gridTemplateColumns: "minmax(180px, 1.4fr) minmax(180px, 1.2fr) minmax(140px, 1fr) 100px",
            padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13,
          }}
        >
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
      ))}
    </div>
  );
}

function GroupedView({ groups, groupKey, emptyLabel }) {
  if (!groups.length) {
    return <div className="card" style={{ padding: 32, textAlign: "center", color: "#64748b" }}>{emptyLabel}</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groups.map(g => {
        const label = g[groupKey] === "_unassigned" ? "Unassigned" : g[groupKey];
        return (
          <div key={g[groupKey]}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#7c3aed">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{g.count} contact{g.count === 1 ? "" : "s"}</div>
            </div>
            <ContactTable contacts={g.contacts} />
          </div>
        );
      })}
    </div>
  );
}
