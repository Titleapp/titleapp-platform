// ProspectsPanel — IR worker's Pipeline canvas tab content.
// Pulls eligible contacts (via S52.1 bridge) and lets the founder bulk-import
// them as investor prospects on the active fundraise.
//
// Props:
//   fundraiseId: string  — required
//   compact?: boolean    — hide header/divider when embedded in worker canvas

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, opts = {}) {
  let token = null;
  try { if (auth.currentUser) token = await auth.currentUser.getIdToken(); } catch (_) {}
  if (!token) token = localStorage.getItem("ID_TOKEN");
  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

const PERSONA_TYPES = ["investor", "advisor", "creator", "operator"];
const STATUS_PILL = {
  staged:        { bg: "#f1f5f9", color: "#475569", label: "Staged" },
  invited:       { bg: "#dbeafe", color: "#2563eb", label: "Invited" },
  kyc_verified:  { bg: "#fef3c7", color: "#d97706", label: "KYC verified" },
  signed:        { bg: "#dcfce7", color: "#16a34a", label: "Signed" },
  voted:         { bg: "#f3e8ff", color: "#7c3aed", label: "Voted" },
  declined:      { bg: "#fee2e2", color: "#dc2626", label: "Declined" },
};

export default function ProspectsPanel({ fundraiseId, compact = false }) {
  const [eligible, setEligible] = useState([]);
  const [alreadyInvited, setAlreadyInvited] = useState([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [skippedNoEmail, setSkippedNoEmail] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [filterType, setFilterType] = useState("investor");
  const [filterSegment, setFilterSegment] = useState("");
  const [limit] = useState(100);

  const [selected, setSelected] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [chosenTemplate, setChosenTemplate] = useState("none"); // "none" | "cold_invite" | "kickoff" | other

  const load = useCallback(async () => {
    if (!fundraiseId) { setErr("missing fundraiseId"); return; }
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("fundraiseId", fundraiseId);
      if (filterType) params.set("persona_type", filterType);
      if (filterSegment) params.set("segment", filterSegment);
      params.set("limit", String(limit));
      const res = await apiFetch(`/v1/ir:eligible-contacts?${params.toString()}`);
      if (!res?.ok) {
        setErr(res?.error || "Failed to load eligible contacts");
        setEligible([]);
        setAlreadyInvited([]);
        return;
      }
      setEligible(res.eligible || []);
      setAlreadyInvited(res.alreadyInvited || []);
      setTotalScanned(res.totalScanned || 0);
      setSkippedNoEmail(res.skippedNoEmail || 0);
    } catch (e) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [fundraiseId, filterType, filterSegment, limit]);

  useEffect(() => { load(); }, [load]);

  // Load template catalog once
  useEffect(() => {
    apiFetch("/v1/ir:notice-templates").then(r => {
      if (r?.ok && Array.isArray(r.templates)) setTemplates(r.templates);
    }).catch(() => {});
  }, []);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const toggleAll = () => {
    if (selectedCount === eligible.length) {
      setSelected({});
    } else {
      const next = {};
      for (const e of eligible) next[e.contactId] = true;
      setSelected(next);
    }
  };

  const handleImport = async () => {
    const contactIds = Object.entries(selected).filter(([_, v]) => v).map(([k]) => k);
    if (contactIds.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      // Always stage first — creates investor records with contactId back-ref.
      // sendInvitesNow stays false here; cold_invite path mints its own via
      // initiateInvestorFlow on the server and is idempotent by email.
      const stageRes = await apiFetch(`/v1/ir:import-from-contacts`, {
        method: "POST",
        body: JSON.stringify({ fundraiseId, contactIds, sendInvitesNow: false }),
      });
      if (!stageRes?.ok) {
        setImportResult(stageRes);
        return;
      }

      // No template chosen → done.
      if (chosenTemplate === "none") {
        setImportResult({ ...stageRes, action: "staged" });
        setSelected({});
        await load();
        return;
      }

      // Build recipient list from the selected eligible rows.
      const recipientLookup = new Map(eligible.map(e => [e.contactId, e]));
      const recipients = contactIds
        .map(cid => recipientLookup.get(cid))
        .filter(Boolean)
        .map(c => ({
          name: c.name,
          email: c.email,
          firstName: (c.name || "").split(" ")[0] || undefined,
        }));

      // Route by template
      const endpoint = chosenTemplate === "cold_invite"
        ? "/v1/ir:send-cold-invite"
        : "/v1/ir:send-notice";
      const sendBody = chosenTemplate === "cold_invite"
        ? { fundraiseId, recipients }
        : { fundraiseId, templateId: chosenTemplate, recipients };
      const sendRes = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(sendBody),
      });

      setImportResult({
        ok: !!sendRes?.ok,
        action: "staged + sent",
        created: stageRes.created,
        skipped: stageRes.skipped,
        sent: sendRes?.sent ?? sendRes?.results?.length ?? recipients.length,
        sendError: sendRes?.ok ? null : (sendRes?.error || "send failed"),
      });
      if (sendRes?.ok) {
        setSelected({});
        await load();
      }
    } catch (e) {
      setImportResult({ ok: false, error: e?.message || "Network error" });
    } finally {
      setImporting(false);
    }
  };

  const actionLabel = (() => {
    if (selectedCount === 0) return "Stage (0)";
    if (chosenTemplate === "none") return `Stage (${selectedCount})`;
    const tpl = templates.find(t => t.id === chosenTemplate);
    const tplLabel = tpl?.label || chosenTemplate;
    return `Stage + send "${tplLabel}" (${selectedCount})`;
  })();

  return (
    <div style={{ padding: compact ? 16 : 24, fontSize: 13, color: "#1e293b" }}>
      {!compact && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Prospects</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: 12 }}>
            Eligible contacts you can invite to this fundraise. Imports create investor records and (optionally) fire the invite email.
          </p>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "#64748b" }}>Persona type</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}
        >
          <option value="">All</option>
          {PERSONA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>Segment</label>
        <input
          type="text"
          value={filterSegment}
          onChange={(e) => setFilterSegment(e.target.value)}
          placeholder="e.g. storyhouse-followers"
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, minWidth: 200 }}
        />
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "6px 14px", borderRadius: 6, border: "1px solid #7C3AED",
            background: loading ? "#a78bfa" : "#7C3AED", color: "white", fontSize: 13, cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div style={{ padding: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12, color: "#64748b" }}>
        <span><strong style={{ color: "#1e293b" }}>{eligible.length}</strong> eligible</span>
        <span><strong style={{ color: "#1e293b" }}>{alreadyInvited.length}</strong> already invited</span>
        <span><strong style={{ color: "#1e293b" }}>{totalScanned}</strong> scanned</span>
        {skippedNoEmail > 0 && <span style={{ color: "#d97706" }}>{skippedNoEmail} skipped (no email)</span>}
      </div>

      {/* Bulk action bar */}
      {eligible.length > 0 && (
        <div style={{
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
          padding: 12, background: "#f8fafc", borderRadius: 8, marginBottom: 12, border: "1px solid #e2e8f0",
        }}>
          <button
            onClick={toggleAll}
            style={{ padding: "6px 12px", fontSize: 12, background: "white", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer" }}
          >
            {selectedCount === eligible.length ? "Deselect all" : "Select all"}
          </button>
          <span style={{ fontSize: 13, color: "#1e293b" }}>
            <strong>{selectedCount}</strong> selected
          </span>
          <label style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>Then</label>
          <select
            value={chosenTemplate}
            onChange={(e) => setChosenTemplate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "white" }}
          >
            <option value="none">Just stage (no email)</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>Send: {t.label}</option>
            ))}
          </select>
          <button
            onClick={handleImport}
            disabled={importing || selectedCount === 0}
            style={{
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: (importing || selectedCount === 0) ? "#cbd5e1" : (chosenTemplate === "none" ? "#475569" : "#16A34A"),
              color: "white", fontSize: 13, cursor: (importing || selectedCount === 0) ? "default" : "pointer",
              marginLeft: "auto",
              fontWeight: 600,
            }}
          >
            {importing ? "Working…" : actionLabel}
          </button>
        </div>
      )}

      {/* Template preview hint */}
      {chosenTemplate !== "none" && selectedCount > 0 && (
        <div style={{
          padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#64748b",
          background: "#fefce8", border: "1px solid #fde68a", borderRadius: 6,
        }}>
          About to email <strong>{selectedCount}</strong> {selectedCount === 1 ? "person" : "people"} the
          <strong> "{templates.find(t => t.id === chosenTemplate)?.label || chosenTemplate}"</strong> template from sean@sociii.ai.
          {chosenTemplate === "cold_invite" && " Each recipient gets a unique magic link to their pre-built investor workspace."}
          {chosenTemplate === "kickoff" && " This template is best for people already in the round, not for cold outreach."}
        </div>
      )}

      {importResult && (
        <div style={{
          padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 12,
          background: importResult.ok ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${importResult.ok ? "#86efac" : "#fecaca"}`,
          color: importResult.ok ? "#166534" : "#991b1b",
        }}>
          {importResult.ok
            ? `${importResult.action || "Done"} — Created ${importResult.created || 0} · Skipped ${importResult.skipped || 0}${importResult.sent ? ` · Sent ${importResult.sent}` : ""}${importResult.errors?.length ? ` · ${importResult.errors.length} errors` : ""}`
            : `Failed: ${importResult.error || importResult.sendError || "unknown"}`}
        </div>
      )}

      {/* Eligible table */}
      {eligible.length === 0 && !loading && (
        <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13, background: "#f8fafc", borderRadius: 8 }}>
          No eligible contacts match the current filter.
          {filterType === "investor" && totalScanned === 0 && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              Tip: tag contacts with <code style={{ background: "#eef2ff", padding: "1px 6px", borderRadius: 4 }}>types_index: ["investor"]</code> in the Contacts spine to surface them here.
            </div>
          )}
        </div>
      )}

      {eligible.length > 0 && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={th(40)}></th>
                <th style={th()}>Name</th>
                <th style={th()}>Email</th>
                <th style={th()}>Types</th>
                <th style={th()}>Segments</th>
                <th style={th(60, "center")}>Personas</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map(c => (
                <tr key={c.contactId} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={td()}>
                    <input
                      type="checkbox"
                      checked={!!selected[c.contactId]}
                      onChange={(e) => setSelected(s => ({ ...s, [c.contactId]: e.target.checked }))}
                    />
                  </td>
                  <td style={td()}><strong>{c.name || "—"}</strong></td>
                  <td style={td()} title={c.email}>{c.email}</td>
                  <td style={td()}>{(c.types || []).join(", ") || "—"}</td>
                  <td style={td()}>{(c.segments || []).slice(0, 3).join(", ") || "—"}</td>
                  <td style={{ ...td(), textAlign: "center" }}>{c.personaCount || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Already invited */}
      {alreadyInvited.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "#64748b", padding: "6px 0" }}>
            Already in pipeline ({alreadyInvited.length})
          </summary>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={th()}>Name</th>
                  <th style={th()}>Email</th>
                  <th style={th()}>Types</th>
                </tr>
              </thead>
              <tbody>
                {alreadyInvited.map(c => (
                  <tr key={c.contactId} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={td()}><strong>{c.name || "—"}</strong></td>
                    <td style={td()}>{c.email}</td>
                    <td style={td()}>{(c.types || []).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function th(w, align = "left") {
  return { padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#475569", textAlign: align, width: w };
}
function td() {
  return { padding: "10px 12px", color: "#1e293b", verticalAlign: "middle" };
}
