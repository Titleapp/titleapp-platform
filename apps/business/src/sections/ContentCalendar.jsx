/**
 * ContentCalendar.jsx — Weekly calendar view of scheduled/posted content (49.2)
 * Replaces SpineSection for "content-calendar" nav item under platform-marketing worker.
 */

import React, { useState, useEffect, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const PLATFORM_COLORS = {
  linkedin:  { bg: "#e0e7ff", color: "#4338ca" },
  twitter:   { bg: "#e0f2fe", color: "#0369a1" },
  facebook:  { bg: "#dbeafe", color: "#1d4ed8" },
  instagram: { bg: "#fce7f3", color: "#be185d" },
  email:     { bg: "#fef3c7", color: "#92400e" },
  tiktok:    { bg: "#f0fdf4", color: "#166534" },
  gbp:       { bg: "#fef9c3", color: "#854d0e" },
};

const STATUS_DOT = {
  draft:    "#94a3b8",
  approved: "#3b82f6",
  rejected: "#ef4444",
  posted:   "#22c55e",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const S = {
  container: { padding: "28px 32px", maxWidth: 1000 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  navRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  navBtn: {
    padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
    border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer",
  },
  weekLabel: { fontSize: 14, fontWeight: 600, color: "#1e293b", minWidth: 200, textAlign: "center" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8,
  },
  dayCol: {
    background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9",
    minHeight: 160, padding: 10,
  },
  dayColToday: {
    background: "#faf5ff", borderRadius: 8, border: "1px solid #e9d5ff",
    minHeight: 160, padding: 10,
  },
  dayHeader: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  dayDate: { fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 },
  postItem: {
    padding: "6px 8px", background: "#fff", borderRadius: 6, marginBottom: 4,
    border: "1px solid #e2e8f0", cursor: "pointer", position: "relative",
  },
  postPlatform: { fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginRight: 4 },
  postText: { fontSize: 11, color: "#374151", lineHeight: 1.3, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  statusDot: { width: 6, height: 6, borderRadius: "50%", position: "absolute", top: 6, right: 6 },
  empty: {
    padding: 48, textAlign: "center", background: "#f8fafc", borderRadius: 10,
    border: "1px dashed #e2e8f0", color: "#94a3b8", fontSize: 14,
  },
  loading: { padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 },
  error: { padding: 16, background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 16 },
  expandOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  expandCard: {
    background: "#fff", borderRadius: 12, padding: 24, maxWidth: 500, width: "90%",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
  },
  expandTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 },
  expandContent: { fontSize: 14, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 16 },
  expandClose: {
    padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 6,
    border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer",
  },
};

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateRange(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
}

export default function ContentCalendar() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/marketing:listDrafts?limit=200")}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setDrafts(data.drafts || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group drafts by date
  const draftsByDate = useMemo(() => {
    const map = {};
    drafts.forEach(draft => {
      if (!draft.createdAt) return;
      const d = new Date(draft.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(draft);
    });
    return map;
  }, [drafts]);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function todayWeek() {
    setWeekStart(getWeekStart(new Date()));
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Content Calendar</div>
          <div style={S.subtitle}>Weekly view of your scheduled and posted content</div>
        </div>
      </div>

      <div style={S.navRow}>
        <button style={S.navBtn} onClick={prevWeek}>&larr; Prev</button>
        <button style={S.navBtn} onClick={todayWeek}>Today</button>
        <div style={S.weekLabel}>{formatDateRange(weekStart)}</div>
        <button style={S.navBtn} onClick={nextWeek}>Next &rarr;</button>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? (
        <div style={S.loading}>Loading calendar...</div>
      ) : (
        <div style={S.grid}>
          {weekDays.map((day, i) => {
            const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
            const dayDrafts = draftsByDate[key] || [];
            const isToday = day.getTime() === today.getTime();

            return (
              <div key={i} style={isToday ? S.dayColToday : S.dayCol}>
                <div style={S.dayHeader}>{DAY_NAMES[day.getDay()]}</div>
                <div style={S.dayDate}>{day.getDate()}</div>
                {dayDrafts.map(draft => {
                  const firstPlatform = draft.platforms?.[0]?.toLowerCase();
                  const pc = PLATFORM_COLORS[firstPlatform] || PLATFORM_COLORS.linkedin;
                  const dotColor = STATUS_DOT[draft.status] || STATUS_DOT.draft;
                  return (
                    <div key={draft.id} style={S.postItem} onClick={() => setExpanded(draft)}>
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                        {(draft.platforms || []).map(p => {
                          const pColor = PLATFORM_COLORS[p.toLowerCase()] || PLATFORM_COLORS.linkedin;
                          return (
                            <span key={p} style={{ ...S.postPlatform, background: pColor.bg, color: pColor.color }}>
                              {p}
                            </span>
                          );
                        })}
                      </div>
                      <div style={S.postText}>{draft.title || draft.content?.slice(0, 60) || ""}</div>
                      <div style={{ ...S.statusDot, background: dotColor }} title={draft.status} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {expanded && (
        <div style={S.expandOverlay} onClick={() => setExpanded(null)}>
          <div style={S.expandCard} onClick={e => e.stopPropagation()}>
            <div style={S.expandTitle}>{expanded.title || "Untitled Draft"}</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              {(expanded.platforms || []).map(p => {
                const pc = PLATFORM_COLORS[p.toLowerCase()] || PLATFORM_COLORS.linkedin;
                return (
                  <span key={p} style={{ ...S.postPlatform, background: pc.bg, color: pc.color, fontSize: 11, padding: "2px 8px" }}>
                    {p}
                  </span>
                );
              })}
              <span style={{
                ...S.postPlatform,
                background: (STATUS_DOT[expanded.status] || "#94a3b8") + "20",
                color: STATUS_DOT[expanded.status] || "#94a3b8",
                fontSize: 11, padding: "2px 8px",
              }}>
                {expanded.status}
              </span>
            </div>
            <div style={S.expandContent}>{expanded.content}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>
              {expanded.createdAt ? new Date(expanded.createdAt).toLocaleString() : ""}
            </div>
            <button style={S.expandClose} onClick={() => setExpanded(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
