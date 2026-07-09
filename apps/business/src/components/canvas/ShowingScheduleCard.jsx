/**
 * ShowingScheduleCard.jsx — RE Marketing worker (re-marketing-001)
 * Signal: card:re-showings
 * Shows scheduled property showings — fetches full history from backend
 * and merges with any new showing from the current chat payload.
 */

import React, { useEffect, useState } from "react";
import CanvasCardShell from "./CanvasCardShell";
import { getAuth } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const STATUS_STYLE = {
  scheduled:  { bg: "#eff6ff", color: "#1d4ed8", label: "Scheduled" },
  completed:  { bg: "#f0fdf4", color: "#16a34a", label: "Completed" },
  cancelled:  { bg: "#fef2f2", color: "#dc2626", label: "Cancelled" },
  rescheduled:{ bg: "#fefce8", color: "#b45309", label: "Rescheduled" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.scheduled;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color,
      borderRadius: 20, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
      {s.label}
    </span>
  );
}

function ShowingRow({ item }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
        🏠
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
          {item.address || item.label?.split(" — Buyer:")[0] || "Property"}
        </div>
        {(item.buyerName || item.label?.includes("Buyer:")) && (
          <div style={{ fontSize: 12, color: "#475569" }}>
            Buyer: <b>{item.buyerName || item.label?.split("Buyer:")[1]?.trim() || "TBD"}</b>
            {item.buyerAgentName ? ` · Agent: ${item.buyerAgentName}` : ""}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{item.date || item.proposedDateTime || "Time TBD"}</div>
        {item.notes && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{item.notes}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <StatusPill status={item.status || "scheduled"} />
        <div style={{ display: "flex", gap: 6 }}>
          {item.mapsLink && (
            <a href={item.mapsLink} target="_blank" rel="noreferrer"
              style={{ fontSize: 10, color: "#0369a1", textDecoration: "none", fontWeight: 600 }}>Maps ↗</a>
          )}
          {item.uberLink && (
            <a href={item.uberLink} target="_blank" rel="noreferrer"
              style={{ fontSize: 10, color: "#0369a1", textDecoration: "none", fontWeight: 600 }}>Uber ↗</a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShowingScheduleCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const [showings, setShowings] = useState(p.items || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const token = await getAuth().currentUser?.getIdToken();
        const tenantId = localStorage.getItem("sociii_tenant_id") || "";
        const url = `${API_BASE}/api?path=/v1/showings:list${tenantId ? `&tenantId=${tenantId}` : ""}`;
        const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.showings?.length) {
          // Merge backend history with any new item from payload, deduplicating
          const fromPayload = p.items || [];
          const payloadAddrs = new Set(fromPayload.map(i => (i.address || i.label || "").toLowerCase()));
          const hist = data.showings.filter(s => !payloadAddrs.has((s.address || "").toLowerCase()));
          setShowings([...fromPayload, ...hist]);
        }
      } catch {
        // fail silently — payload items still show
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduled = showings.filter(s => (s.status || "scheduled") !== "cancelled" && (s.status || "scheduled") !== "completed");
  const past = showings.filter(s => s.status === "completed" || s.status === "cancelled");

  return (
    <CanvasCardShell title={p.title || "Showing Schedule"} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
      {loading && !showings.length && (
        <div style={{ fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>Loading showings…</div>
      )}

      {!loading && !showings.length && (
        <div style={{ fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>
          No showings scheduled yet. Ask Alex to schedule a showing.
        </div>
      )}

      {scheduled.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 4 }}>
            Upcoming · {scheduled.length}
          </div>
          {scheduled.map((item, i) => <ShowingRow key={i} item={item} />)}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 4 }}>
            Past · {past.length}
          </div>
          {past.map((item, i) => <ShowingRow key={i} item={item} />)}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 11, color: "#cbd5e1" }}>
        {showings.length} showing{showings.length !== 1 ? "s" : ""} total · re-marketing-001
      </div>
    </CanvasCardShell>
  );
}
