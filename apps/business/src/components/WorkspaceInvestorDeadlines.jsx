import React, { useCallback, useEffect, useRef, useState } from "react";
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

const URGENCY_STYLE = {
  action_required: { bg: "#fef3c7", border: "#fcd34d", color: "#92400e", label: "Action" },
  vote_open:       { bg: "#dbeafe", border: "#93c5fd", color: "#1e40af", label: "Vote" },
  informational:   { bg: "#f1f5f9", border: "#cbd5e1", color: "#475569", label: "Info" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return "—"; }
}

export default function WorkspaceInvestorDeadlines() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("/v1/investor:deadlines");
      if (!mountedRef.current) return;
      const list = Array.isArray(data?.items) ? data.items : [];
      // Sort: action_required first, then vote_open, then informational.
      const order = { action_required: 0, vote_open: 1, informational: 2 };
      list.sort((a, b) => (order[a.urgency] || 3) - (order[b.urgency] || 3));
      setItems(list);
    } catch (_) {
      if (mountedRef.current) setItems([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (dismissed || loading || items.length === 0) return null;

  const S = {
    wrap: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, margin: "12px 16px 0" },
    head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    eyebrow: { color: "#dc2626", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
    title: { fontSize: 16, fontWeight: 700, color: "#1a202c", marginTop: 2 },
    sub: { fontSize: 13, color: "#475569", lineHeight: 1.5, marginTop: 4 },
    dismiss: { background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, padding: 4 },
    list: { marginTop: 12, display: "flex", flexDirection: "column", gap: 8 },
    row: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8 },
    chip: { fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 999 },
    rowLabel: { flex: 1, fontSize: 14, color: "#1a202c" },
    rowDate: { fontSize: 12, color: "#475569", whiteSpace: "nowrap" },
  };

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <div style={S.eyebrow}>What needs your attention</div>
          <div style={S.title}>{items.length} item{items.length === 1 ? "" : "s"}</div>
          <div style={S.sub}>Things with a date or an action — surfaced so they don't slip through.</div>
        </div>
        <button style={S.dismiss} onClick={() => setDismissed(true)} title="Hide for now">×</button>
      </div>
      <div style={S.list}>
        {items.map((item, i) => {
          const u = URGENCY_STYLE[item.urgency] || URGENCY_STYLE.informational;
          return (
            <div key={i} style={{ ...S.row, background: u.bg, border: `1px solid ${u.border}` }}>
              <span style={{ ...S.chip, color: u.color, background: u.border }}>{u.label}</span>
              <div style={S.rowLabel}>{item.title}</div>
              {item.dueAt && <div style={S.rowDate}>{fmtDate(item.dueAt)}</div>}
              {item.href && (
                <a href={item.href} style={{ fontSize: 13, fontWeight: 600, color: u.color, textDecoration: "none" }}>
                  Open →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
