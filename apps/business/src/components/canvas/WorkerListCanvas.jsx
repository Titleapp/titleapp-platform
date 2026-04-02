/**
 * WorkerListCanvas.jsx — Canvas card for browse:* and vertical:* signals (44.9)
 *
 * Renders a grid of worker cards fetched from Firestore.
 * Used by: browse:popular, browse:free, vertical:* signals.
 */

import React, { useState, useEffect } from "react";
import { getFirestore, collection, query, where, orderBy, limit as fsLimit, getDocs } from "firebase/firestore";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  grid: { display: "flex", flexDirection: "column", gap: 8 },
  card: {
    background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10,
    padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s",
  },
  name: { fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 2 },
  desc: { fontSize: 12, color: "#64748b", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  meta: { display: "flex", gap: 6, marginTop: 6, alignItems: "center" },
  tag: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#f3e8ff", color: "#7c3aed" },
};

export default function WorkerListCanvas({ resolved, context, onDismiss }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const signal = resolved?._signal || "";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = getFirestore();
        const col = collection(db, "digitalWorkers");
        let q;

        if (resolved?.query) {
          const cfg = resolved.query;
          const constraints = [fsLimit(cfg.limit || 6)];
          if (cfg.where) constraints.unshift(where(cfg.where[0], cfg.where[1], cfg.where[2]));
          if (cfg.orderBy) constraints.unshift(orderBy(cfg.orderBy, "desc"));
          q = query(col, ...constraints);
        } else {
          // vertical:* wildcard
          const vertical = signal.replace("vertical:", "");
          q = query(col, where("vertical", "==", vertical), fsLimit(6));
        }

        const snap = await getDocs(q);
        if (!cancelled) {
          setWorkers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        }
      } catch (err) {
        console.warn("WorkerListCanvas fetch failed:", err.message);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [signal]);

  const title = signal.startsWith("vertical:")
    ? `${signal.replace("vertical:", "").replace(/_/g, " ")} Workers`
    : signal === "browse:free" ? "Free Workers" : "Popular Workers";

  function handleSelect(w) {
    window.dispatchEvent(new CustomEvent("ta:select-worker", { detail: { slug: w.id || w.slug || w.workerId } }));
  }

  return (
    <CanvasCardShell title={title} onDismiss={onDismiss} loading={loading}>
      {workers.length > 0 && (
        <div style={S.grid}>
          {workers.map(w => (
            <div
              key={w.id}
              style={S.card}
              onClick={() => handleSelect(w)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#c4b5fd"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
            >
              <div style={S.name}>{w.name || w.workerName}</div>
              <div style={S.desc}>{w.shortDescription || w.capabilitySummary || ""}</div>
              <div style={S.meta}>
                <span style={S.tag}>{w.price === 0 ? "Free" : `$${(w.price || 0) / 100}/mo`}</span>
                {w.vertical && <span style={{ ...S.tag, background: "#ecfdf5", color: "#166534" }}>{w.vertical}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </CanvasCardShell>
  );
}
