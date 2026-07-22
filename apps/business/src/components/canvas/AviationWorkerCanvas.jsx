// AviationWorkerCanvas.jsx — Data-driven canvas for aviation workers.
// Follows the same CAS-panel + tab-bar + block-renderer pattern as
// RealEstateWorkerCanvas.jsx. Data from aviationCanvasData.js.
// Handles: av-copilot-001, av-dispatch-001, av-mx-001.

import React, { useState } from "react";
import { getAvCanvas, AV_CAS, AV_CAS_ORDER, AV_CAS_LABELS } from "./aviationCanvasData";
import MapCard from "./MapCard";
import TabDescription from "./TabDescription";

const c = (band) => AV_CAS[band] || AV_CAS.WHITE;

// ── CAS instrument panel ──────────────────────────────────────────────────────
function CasPanel({ counts }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {AV_CAS_ORDER.map((k) => {
        const cc = AV_CAS[k];
        const n = counts?.[k] ?? 0;
        const muted = n === 0;
        return (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999,
            background: muted ? "#f8fafc" : cc.bg, border: `1px solid ${muted ? "#e2e8f0" : cc.border}`, opacity: muted ? 0.5 : 1,
          }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: cc.dot }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: muted ? "#94a3b8" : cc.text, textTransform: "capitalize" }}>
              {AV_CAS_LABELS[k]}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: muted ? "#cbd5e1" : cc.dot, minWidth: 18, textAlign: "center", borderRadius: 999, padding: "1px 6px" }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Block components ──────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "4px 0 10px" }}>{children}</div>
);

function Heroes({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`, gap: 12, marginBottom: 18 }}>
      {items.map((v, i) => { const cc = c(v.band); return (
        <div key={i} style={{ padding: "16px 14px", borderRadius: 12, textAlign: "center", background: cc.bg, border: `1.5px solid ${cc.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: cc.text, marginBottom: 4 }}>{v.title}</div>
          <div style={{ fontSize: 12, color: cc.text, opacity: 0.85, lineHeight: 1.4 }}>{v.detail}</div>
        </div>
      ); })}
    </div>
  );
}

function Kpis({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 18 }}>
      {items.map((k, i) => { const cc = c(k.band); return (
        <div key={i} style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: "14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{k.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: cc.text }}>{k.value}</div>
        </div>
      ); })}
    </div>
  );
}

function Flags({ items }) {
  const sorted = [...items].sort((a, b) => AV_CAS_ORDER.indexOf(a.band) - AV_CAS_ORDER.indexOf(b.band));
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionTitle>CAS flags</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((f, i) => { const cc = c(f.band); return (
          <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: cc.bg, borderLeft: `3px solid ${cc.dot}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: cc.text }}>{f.title}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2, lineHeight: 1.4 }}>{f.detail}</div>
          </div>
        ); })}
      </div>
    </div>
  );
}

function Cards({ items }) {
  return (
    <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((card, i) => { const cc = c(card.band); return (
        <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: cc.bg, border: `1px solid ${cc.border}` }}>
          {card.label && <div style={{ fontSize: 10, fontWeight: 700, color: cc.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{card.label}</div>}
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{card.title}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>{card.detail}</div>
          {card.action && <div style={{ fontSize: 12, fontWeight: 600, color: "#0284c7", marginTop: 8 }}>{card.action} →</div>}
        </div>
      ); })}
    </div>
  );
}

// Simple table — cols: string[], rows: string[][]. Each row optionally starts
// with a CAS band key as a special first cell to color the left border.
function AvTable({ title, cols, rows }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, background: "#0f172a", color: "#fff", fontSize: 11, fontWeight: 600 }}>
          {cols.map((col, i) => <div key={i} style={{ padding: "8px 10px" }}>{col}</div>)}
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, fontSize: 12, borderTop: "1px solid #f1f5f9", background: i % 2 ? "#fafafa" : "#fff" }}>
            {row.map((cell, j) => {
              const isStatus = j === cols.length - 1 && typeof cell === "string" && (cell === "GROUNDED" || cell === "En route" || cell === "Airborne" || cell === "Pending WX");
              const statusColor = cell === "GROUNDED" ? "#b91c1c" : cell === "En route" || cell === "Airborne" ? "#15803d" : "#b45309";
              return (
                <div key={j} style={{ padding: "8px 10px", color: isStatus ? statusColor : "#334155", fontWeight: isStatus ? 700 : 400 }}>
                  {cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Prose({ items }) {
  return (
    <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((s, i) => { const cc = c(s.band); return (
        <div key={i} style={{ padding: "12px 14px", borderRadius: 8, background: cc.bg, borderLeft: `3px solid ${cc.dot}` }}>
          {s.title && <div style={{ fontSize: 13, fontWeight: 600, color: cc.text, marginBottom: 4 }}>{s.title}</div>}
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.55 }}>{s.text}</div>
        </div>
      ); })}
    </div>
  );
}

function Block({ block }) {
  switch (block.type) {
    case "heroes":  return <Heroes items={block.items} />;
    case "kpis":    return <Kpis items={block.items} />;
    case "flags":   return <Flags items={block.items} />;
    case "cards":   return <Cards items={block.items} />;
    case "table":   return <AvTable title={block.title} cols={block.cols} rows={block.rows} />;
    case "prose":   return <Prose items={block.items} />;
    case "map":
      return (
        <div style={{ marginBottom: 18 }}>
          <MapCard resolved={{ address: block.address, region: block.region, mapType: block.mapType, sectionLabel: block.sectionLabel }} />
        </div>
      );
    default: return null;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AviationWorkerCanvas({ workerSlug }) {
  const spec = getAvCanvas(workerSlug);
  const [activeTab, setActiveTab] = useState(null);

  if (!spec) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        No canvas data for {workerSlug}. Ask Alex to run a briefing.
      </div>
    );
  }

  const currentTabId = activeTab || spec.tabs[0]?.id;
  const tab = spec.tabs.find((t) => t.id === currentTabId) || spec.tabs[0];

  return (
    <div style={{ padding: "20px 20px 40px", fontFamily: "'Inter', sans-serif", maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{spec.title}</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>{spec.subtitle}</span>
        </div>
        {spec.disclaimer && (
          <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>{spec.disclaimer}</div>
        )}
      </div>

      {/* CAS instrument panel */}
      <CasPanel counts={spec.cas} />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e2e8f0", paddingBottom: 0 }}>
        {spec.tabs.map((t) => {
          const active = t.id === currentTabId;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 14px", fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "#0284c7" : "#64748b", background: "none", border: "none",
                borderBottom: active ? "2px solid #0284c7" : "2px solid transparent",
                cursor: "pointer", marginBottom: -1, transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab description blurb */}
      {tab?.description && (
        <TabDescription slug={workerSlug} tabId={tab.id} description={tab.description} />
      )}

      {/* Tab blocks */}
      {tab?.blocks?.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
