import React, { useState, useCallback } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const TIER_LABEL = {
  1: { label: "Platform",            color: "#0891b2", bg: "#f0f9ff" },
  2: { label: "Professional Library", color: "#7c3aed", bg: "#f5f3ff" },
  3: { label: "Worker-Specific",     color: "#059669", bg: "#f0fdf4" },
};

const SOURCE_ICON = {
  pdf:   "PDF",
  docx:  "DOC",
  text:  "TXT",
  url:   "URL",
  paste: "TXT",
  pptx:  "PPT",
};

function fmtPages(p) {
  if (!p) return null;
  return `${p} ${p === 1 ? "page" : "pages"}`;
}
function fmtChars(c) {
  if (!c) return null;
  if (c >= 1000) return `${(c / 1000).toFixed(0)}k chars`;
  return `${c} chars`;
}

function TierChip({ tier }) {
  const t = TIER_LABEL[tier] || { label: `Tier ${tier}`, color: "#64748b", bg: "#f8fafc" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
      padding: "2px 7px", borderRadius: 999, background: t.bg, color: t.color,
    }}>
      {t.label}
    </span>
  );
}

function DocRow({ doc }) {
  const icon = SOURCE_ICON[doc.sourceType] || "FILE";
  const tier = doc.tier ? parseInt(doc.tier) : null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px", borderBottom: "1px solid #f8fafc",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: "#f1f5f9", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#64748b",
        letterSpacing: 0.3,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {doc.name || "Untitled"}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tier && <TierChip tier={tier} />}
          {fmtPages(doc.pageCount) && <span>{fmtPages(doc.pageCount)}</span>}
          {fmtChars(doc.charCount) && <span>{fmtChars(doc.charCount)}</span>}
          {doc.sourceUrl && <span style={{ color: "#0891b2" }}>URL</span>}
        </div>
      </div>
      {doc.sourceUrl && (
        <a
          href={doc.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", textDecoration: "none", flexShrink: 0 }}
        >
          Open →
        </a>
      )}
    </div>
  );
}

function WorkerLockerDocs({ workerId, workerName, creatorId }) {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (loading || docs !== null) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || "sociii-inc";
      const params = new URLSearchParams({ workerId });
      if (creatorId) params.append("creatorId", creatorId);
      const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(`/v1/worker:locker:list?${params}`)}`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
      });
      const data = await res.json();
      if (data?.ok) setDocs(data.documents || []);
      else setError(data?.error || "Failed to load");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workerId, creatorId, loading, docs]);

  function toggle() {
    if (!expanded && docs === null) load();
    setExpanded(e => !e);
  }

  const count = docs ? docs.length : null;

  return (
    <div style={{ border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
      <button
        onClick={toggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: expanded ? "#f8fafc" : "#fff",
          border: "none", cursor: "pointer", textAlign: "left",
          borderBottom: expanded ? "1px solid #f1f5f9" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{workerName}</span>
          {count !== null && (
            <span style={{ fontSize: 11, color: "#94a3b8", background: "#f1f5f9", padding: "1px 7px", borderRadius: 999 }}>
              {count} doc{count !== 1 ? "s" : ""}
            </span>
          )}
          {count === null && !loading && (
            <span style={{ fontSize: 11, color: "#94a3b8" }}>click to load</span>
          )}
        </div>
        <span style={{ fontSize: 13, color: "#94a3b8", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>
      {expanded && (
        <div>
          {loading && (
            <div style={{ padding: "16px 20px", fontSize: 13, color: "#64748b" }}>Loading documents…</div>
          )}
          {error && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: "#991b1b", background: "#fee2e2" }}>{error}</div>
          )}
          {!loading && !error && docs?.length === 0 && (
            <div style={{ padding: "16px 20px", fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
              No documents in this worker's library yet.
            </div>
          )}
          {!loading && !error && docs?.length > 0 && docs.map(d => (
            <DocRow key={d.id} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * WorkerLibrarySection — surfaced in Drive below personal files.
 * Shows the Studio Locker (knowledge documents) for each active worker.
 * Read-only for subscribers; the same docs drive RAAS.
 *
 * Reads ACTIVE_WORKERS from localStorage (written by App.jsx on workspace load).
 * Accepts optional activeWorkers prop override for testing.
 */
export default function WorkerLibrarySection({ activeWorkers: propWorkers } = {}) {
  const activeWorkers = propWorkers ?? (() => {
    try { return JSON.parse(localStorage.getItem("ACTIVE_WORKERS") || "[]"); } catch { return []; }
  })();

  if (!activeWorkers.length) return null;

  const WORKER_DISPLAY_NAMES = {
    "chief-of-staff":               "Alex — Chief of Staff",
    "platform-accounting":          "Accounting",
    "platform-hr":                  "HR & People",
    "platform-marketing":           "Marketing",
    "platform-contacts":            "Contacts & CRM",
    "av-copilot":                   "Aviation CoPilot",
    "av-mission-builder":           "Mission Builder",
    "av-mx-tracker":                "Maintenance Tracker",
    "platform-real-estate-ca":      "RE Title (CA)",
    "platform-real-estate-nv":      "RE CE (NV)",
    "nursing-education-001":        "Nursing Education",
    "platform-fundraise":           "Investor Relations",
    "platform-patent":              "Patent Worker",
    "site-recon-001":               "Site Recon",
    "title-abstract-001":           "Title Abstract",
  };

  const named = activeWorkers.map(w => {
    const slug = typeof w === "string" ? w : (w?.slug || w?.id || "");
    return { slug, name: WORKER_DISPLAY_NAMES[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) };
  }).filter(w => w.slug && w.slug !== "chief-of-staff");

  if (!named.length) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Worker Libraries</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Reference documents that power each worker's rules and knowledge — the same docs RAAS uses.
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff",
          border: "1px solid #ddd6fe", padding: "3px 10px", borderRadius: 999, letterSpacing: 0.4,
          textTransform: "uppercase",
        }}>
          Read-only
        </div>
      </div>
      {named.map(w => (
        <WorkerLockerDocs
          key={w.slug}
          workerId={w.slug}
          workerName={w.name}
          creatorId={null}
        />
      ))}
    </div>
  );
}
