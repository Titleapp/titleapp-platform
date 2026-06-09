// S52.44 — Shared canvas for the 4 RE workers (Title Abstract, Land Use,
// Zoning, Feasibility). Persistent CAS instrument panel + internal tab bar +
// per-tab "blocks" (heroes / kpis / flags / chain / strata / cards / table /
// bars / prose). Data from reCanvasData.js. Returns null for non-RE workers.
//
// Renders its own tab bar; the external CanvasTabBar is suppressed for RE
// workers in RightPanel so there's a single, working tab control.

import React, { useState, useEffect } from "react";
import { getRECanvas, CAS, CAS_ORDER, STRATUM_BAND } from "./reCanvasData";
import MapCard from "./MapCard";

const c = (band) => CAS[band] || CAS.WHITE;

function CasInstrumentPanel({ counts, labels }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {CAS_ORDER.map((k) => {
        const cc = CAS[k];
        const n = counts?.[k] ?? 0;
        const muted = n === 0;
        // S52.47 — optional per-canvas label override (e.g. education reframes the
        // bands as Met / Remediate / Not met instead of the raw color names).
        const label = labels?.[k] || k.toLowerCase();
        return (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999,
            background: muted ? "#f8fafc" : cc.bg, border: `1px solid ${muted ? "#e2e8f0" : cc.border}`, opacity: muted ? 0.6 : 1,
          }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: cc.dot }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: muted ? "#94a3b8" : cc.text, textTransform: "capitalize" }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: muted ? "#cbd5e1" : cc.dot, minWidth: 18, textAlign: "center", borderRadius: 999, padding: "1px 6px" }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "4px 0 10px" }}>{children}</div>
);

function Heroes({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`, gap: 12, marginBottom: 18 }}>
      {items.map((v, i) => { const cc = c(v.band); return (
        <div key={i} style={{ padding: "16px 14px", borderRadius: 12, textAlign: "center", background: cc.bg, border: `1.5px solid ${cc.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: cc.text, marginBottom: 4 }}>{v.title}</div>
          <div style={{ fontSize: 12.5, color: cc.text, opacity: 0.85 }}>{v.detail}</div>
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
          <div style={{ fontSize: 24, fontWeight: 700, color: cc.text }}>{k.value}</div>
        </div>
      ); })}
    </div>
  );
}

function Flags({ items }) {
  const sorted = [...items].sort((a, b) => CAS_ORDER.indexOf(a.band) - CAS_ORDER.indexOf(b.band));
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

function Chain({ title, items }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((t, i) => { const cc = c(t.band); return (
          <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: cc.bg, borderLeft: `3px solid ${cc.dot}`, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{t.parties}</div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{t.meta}</div>
            </div>
            {t.tag && <span style={{ fontSize: 11, fontWeight: 600, color: cc.text, whiteSpace: "nowrap" }}>{t.tag}</span>}
          </div>
        ); })}
      </div>
    </div>
  );
}

function Strata({ items }) {
  return (
    <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((s, i) => { const cc = c(s.band); return (
        <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: STRATUM_BAND[s.elev] || "#f8fafc", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{s.name}</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{s.detail}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: cc.dot, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{s.badge}</span>
        </div>
      ); })}
    </div>
  );
}

function Cards({ items }) {
  return (
    <div style={{ marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      {items.map((card, i) => { const cc = c(card.band); return (
        <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: cc.bg, border: `1px solid ${cc.border}` }}>
          {card.label && <div style={{ fontSize: 10, fontWeight: 700, color: cc.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{card.label}</div>}
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{card.title}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.45 }}>{card.detail}</div>
          {card.action && <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", marginTop: 8 }}>{card.action} →</div>}
        </div>
      ); })}
    </div>
  );
}

function Table({ title, columns, rows }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div style={{ border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr)`, background: "#1e293b", color: "#fff", fontSize: 11, fontWeight: 600 }}>
          {columns.map((col, i) => <div key={i} style={{ padding: "8px 10px" }}>{col}</div>)}
        </div>
        {rows.map((r, i) => { const cc = c(r.band); return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr)`, fontSize: 12, borderTop: "1px solid #f1f5f9", borderLeft: `3px solid ${cc.dot}`, background: i % 2 ? "#fafafa" : "#fff" }}>
            {r.cells.map((cell, j) => <div key={j} style={{ padding: "8px 10px", color: j === r.cells.length - 1 ? cc.text : "#334155", fontWeight: j === r.cells.length - 1 ? 600 : 400 }}>{cell}</div>)}
          </div>
        ); })}
      </div>
    </div>
  );
}

function Bars({ title, items, note }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((b, i) => { const cc = c(b.band); return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 150, fontSize: 12, color: "#475569", flexShrink: 0 }}>{b.label}</div>
            <div style={{ flex: 1, height: 16, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${Math.max(b.pct || 0, 1)}%`, height: "100%", background: cc.dot, opacity: (b.pct || 0) === 0 ? 0.35 : 1, borderRadius: 4 }} />
            </div>
            <div style={{ width: 56, textAlign: "right", fontSize: 12, fontWeight: 600, color: cc.text }}>{b.value}</div>
          </div>
        ); })}
      </div>
      {note && <div style={{ fontSize: 12, fontWeight: 600, color: "#15803d", marginTop: 8 }}>✓ {note}</div>}
    </div>
  );
}

function Prose({ hero, items }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {hero && (() => { const cc = c(hero.band); return (
        <div style={{ padding: "16px", borderRadius: 12, background: cc.bg, border: `1.5px solid ${cc.border}`, marginBottom: 14, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: cc.dot, borderRadius: 8, padding: "8px 12px", textAlign: "center", flexShrink: 0 }}>{hero.band}<br /><span style={{ fontSize: 10, fontWeight: 600 }}>{hero.label}</span></span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: cc.text, marginBottom: 4 }}>{hero.headline}</div>
            <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5 }}>{hero.sub}</div>
          </div>
        </div>
      ); })()}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((s, i) => { const cc = c(s.band); return (
          <div key={i} style={{ padding: "12px 14px", borderRadius: 8, background: cc.bg, borderLeft: `3px solid ${cc.dot}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: cc.text, marginBottom: 3 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{s.body}</div>
          </div>
        ); })}
      </div>
    </div>
  );
}

function Block({ block }) {
  switch (block.type) {
    case "heroes": return <Heroes items={block.items} />;
    case "kpis": return <Kpis items={block.items} />;
    case "flags": return <Flags items={block.items} />;
    case "chain": return <Chain title={block.title} items={block.items} />;
    case "strata": return <Strata items={block.items} />;
    case "cards": return <Cards items={block.items} />;
    case "table": return <Table title={block.title} columns={block.columns} rows={block.rows} />;
    case "bars": return <Bars title={block.title} items={block.items} note={block.note} />;
    case "prose": return <Prose hero={block.hero} items={block.items} />;
    case "map": return <div style={{ marginBottom: 18 }}><MapCard resolved={{ locations: block.locations, region: block.region }} /></div>;
    default: return null;
  }
}

export default function RealEstateWorkerCanvas({ worker }) {
  const slug = worker?.workerId || worker?.slug;
  const data = getRECanvas(slug);
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [slug]);
  if (!data) return null;
  const tab = data.tabs[active] || data.tabs[0];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{data.subtitle}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {data.sample && <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 10px" }}>SAMPLE DATA — illustrative, not a live pull</span>}
          {data.disclaimer && <span style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 999, padding: "3px 10px" }}>{data.disclaimer}</span>}
        </div>
      </div>

      <CasInstrumentPanel counts={data.cas} labels={data.casLabels} />

      {/* Internal tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #f1f5f9", marginBottom: 16, overflowX: "auto" }}>
        {data.tabs.map((t, i) => (
          <button key={t.id} onClick={() => setActive(i)} style={{
            padding: "8px 14px", fontSize: 13, fontWeight: i === active ? 600 : 500, cursor: "pointer",
            background: "none", border: "none", whiteSpace: "nowrap",
            color: i === active ? "#7c3aed" : "#64748b",
            borderBottom: i === active ? "2px solid #7c3aed" : "2px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      {tab.blocks.map((b, i) => <Block key={i} block={b} />)}
    </div>
  );
}

export function isREWorker(worker) {
  if (!worker) return false;
  // Match on ANY identifier — different code paths populate slug vs workerId vs
  // catalogId, and checking only one let cre-analyst slip the RE check (→ the
  // duplicate external tab bar). RE_CANVAS is keyed by slug.
  return !!(getRECanvas(worker.slug) || getRECanvas(worker.workerId) || getRECanvas(worker.catalogId));
}
