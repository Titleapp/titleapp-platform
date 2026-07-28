// S52.44 — Shared canvas for the 4 RE workers (Title Abstract, Land Use,
// Zoning, Feasibility). Persistent CAS instrument panel + internal tab bar +
// per-tab "blocks" (heroes / kpis / flags / chain / strata / cards / table /
// bars / prose). Data from reCanvasData.js. Returns null for non-RE workers.
//
// Renders its own tab bar; the external CanvasTabBar is suppressed for RE
// workers in RightPanel so there's a single, working tab control.

import React, { useState, useEffect } from "react";
import { getRECanvas, resolveCanvasSpec, isValidCanvasSpec, CAS, CAS_ORDER, STRATUM_BAND } from "./reCanvasData";
import MapCard from "./MapCard";
import { getAuth } from "firebase/auth";
import TabDescription from "./TabDescription";

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

// S52.50 — Street View photo of the subject property. Sean's standing rule:
// every RE worker should show a MAP + pictures of the subject property. Uses
// the Google Street View Static API (same VITE_GOOGLE_MAPS_API_KEY as MapCard)
// keyed off a real address — so it's a real photo, never fabricated. If Google
// has no ground imagery for the address it returns a "no imagery" tile (still
// real, never broken).
function StreetViewCard({ address, label }) {
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!API_KEY || !address) return null;
  const src = `https://maps.googleapis.com/maps/api/streetview?size=640x360&location=${encodeURIComponent(address)}&fov=80&pitch=0&source=outdoor&key=${API_KEY}`;
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 18 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", letterSpacing: 0.5, textTransform: "uppercase" }}>Subject property</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{label || address}</div>
      </div>
      <img src={src} alt={`Street view of ${label || address}`} width="100%" height="360" loading="lazy" style={{ display: "block", objectFit: "cover", width: "100%", height: 360 }} />
    </div>
  );
}

function AssetList({ title, items }) {
  const BAND = { RED: "#ef4444", YELLOW: "#d97706", GREEN: "#16a34a", BLUE: "#3b82f6", WHITE: "#64748b" };
  return (
    <div style={{ marginBottom: 16 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{title}</div>}
      {!(items && items.length) && (
        <div style={{ padding: "16px", background: "#f8fafc", borderRadius: 10, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
          No items yet.
        </div>
      )}
      {(items || []).map((asset, i) => (
        <div key={asset.id || i} style={{ background: "#f8fafc", border: `1px solid ${BAND[asset.band] || "#e2e8f0"}22`, borderLeft: `3px solid ${BAND[asset.band] || "#e2e8f0"}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{asset.name}</div>
              {asset.address && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{asset.address}</div>}
              {asset.meta && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{asset.meta}</div>}
            </div>
            {asset.status && (
              <div style={{ fontSize: 10, fontWeight: 700, color: BAND[asset.statusBand] || "#64748b", background: `${BAND[asset.statusBand] || "#64748b"}18`, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
                {asset.status}
              </div>
            )}
          </div>
          {asset.kpis && asset.kpis.length > 0 && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
              {asset.kpis.map((k, j) => (
                <div key={j} style={{ fontSize: 12 }}>
                  <span style={{ color: "#94a3b8" }}>{k.label}: </span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{k.value}</span>
                </div>
              ))}
            </div>
          )}
          {(asset.flags || []).map((f, j) => (
            <div key={j} style={{ fontSize: 11, color: BAND[f.band] || "#64748b", marginTop: 3 }}>
              {f.band === "RED" ? "⚠ " : f.band === "YELLOW" ? "● " : "○ "}{f.text}
            </div>
          ))}
        </div>
      ))}
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
    case "map": return <div style={{ marginBottom: 18 }}><MapCard resolved={{ locations: block.locations, region: block.region, address: block.address, mapType: block.mapType }} /></div>;
    case "streetview":
    case "image": return <StreetViewCard address={block.address} label={block.label} />;
    case "assetlist": return <AssetList title={block.title} items={block.items || []} />;
    default: return null;
  }
}

export default function RealEstateWorkerCanvas({ worker }) {
  const slug = worker?.workerId || worker?.slug;
  // S52.50 (keystone #31) — data-driven: render the worker's OWN canvas spec
  // (worker.canvasSpec) when present, else the hardcoded seed fixture by slug.
  const baseData = resolveCanvasSpec(worker);
  const [active, setActive] = useState(0);
  // #41 — live per-address ATTOM lookup. When set, it overrides the canvas.
  const [liveSpec, setLiveSpec] = useState(null);
  const [query, setQuery] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveErr, setLiveErr] = useState(null);
  // RE Advocate: live transaction list for the Transaction tab.
  const [liveTransactions, setLiveTransactions] = useState(null);
  // RE Advocate: financing constraint data (FEMA flood, CALFIRE, HUD FHA, FHFA, USDA).
  const [financingData, setFinancingData] = useState(null);

  const isREAdvocate = slug === "re-salesperson";

  useEffect(() => { setActive(0); setLiveSpec(null); setLiveErr(null); setQuery(""); setLiveTransactions(null); setFinancingData(null); }, [slug]);
  useEffect(() => { setActive(0); }, [liveSpec]);

  useEffect(() => {
    if (!isREAdvocate) return;
    let cancelled = false;
    (async () => {
      try {
        const auth = getAuth();
        const token = auth.currentUser ? await auth.currentUser.getIdToken(false) : null;
        const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
        const resp = await fetch(`${apiBase}/api?path=/v1/re:transaction:list`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const json = await resp.json().catch(() => ({}));
        if (!cancelled && json.ok && Array.isArray(json.transactions)) {
          setLiveTransactions(json.transactions);
        }
      } catch (_e) {
        // Non-blocking — fixture data stays visible
      }
    })();
    return () => { cancelled = true; };
  }, [isREAdvocate]);

  const data = liveSpec || baseData;
  if (!data) return null;

  // Build financing tab blocks from live API data.
  function buildFinancingBlocks(f) {
    const kpis = [];
    const flags = [];
    if (f.loanLimit?.available) {
      const isHigh = f.loanLimit.type === "high-cost" || f.loanLimit.type === "ceiling";
      kpis.push({ label: "Conforming limit", value: `$${(f.loanLimit.amount / 1000).toFixed(0)}K`, band: isHigh ? "YELLOW" : "GREEN" });
    }
    if (f.flood?.available) {
      const riskBand = { high: "RED", moderate: "YELLOW", minimal: "GREEN", undetermined: "WHITE", unknown: "WHITE" }[f.flood.risk] || "WHITE";
      kpis.push({ label: "Flood zone", value: f.flood.zone || "—", band: riskBand });
      flags.push({ band: riskBand, title: f.flood.label || `Flood zone ${f.flood.zone}`, detail: f.flood.isSFHA ? "SFHA — flood insurance required by lenders. Adds to monthly carry cost and narrows resale buyer pool." : "Outside SFHA — standard risk zone. Flood insurance not required but available." });
    }
    if (f.fire?.available && f.fire.zone) {
      const fireBand = f.fire.zone === "3" || /very\s*high/i.test(f.fire.zone) ? "RED" : f.fire.zone === "2" || /^high$/i.test(f.fire.zone) ? "YELLOW" : "WHITE";
      kpis.push({ label: "Fire hazard zone", value: f.fire.zone, band: fireBand });
      flags.push({ band: fireBand, title: `CAL FIRE: ${f.fire.label}`, detail: "Verify homeowners insurance availability before making an offer. Some carriers have exited high/very-high severity zones." });
    } else if (f.fire?.available && !f.fire.zone) {
      kpis.push({ label: "Fire hazard zone", value: "Not in FHSZ", band: "GREEN" });
    }
    if (f.usda?.available) {
      kpis.push({ label: "USDA eligible", value: f.usda.eligible ? "Yes" : "No", band: f.usda.eligible ? "GREEN" : "WHITE" });
      if (f.usda.eligible) flags.push({ band: "GREEN", title: "USDA Rural Development eligible", detail: "0% down payment available for income-qualifying buyers. Expands buyer pool in this area." });
    }
    if (f.fha?.available) {
      const fhaBand = f.fha.approved ? "GREEN" : "RED";
      kpis.push({ label: "FHA condo approved", value: f.fha.approved ? "Yes" : "No", band: fhaBand });
      if (!f.fha.approved) flags.push({ band: "RED", title: "Condo not on FHA-approved list", detail: "Eliminates FHA buyers — often 20–30% of first-time buyer market. Verify with HUD before finalizing offer strategy." });
    }
    const loanFlag = f.loanLimit?.available ? {
      band: f.loanLimit.type !== "standard" ? "YELLOW" : "GREEN",
      title: f.loanLimit.label,
      detail: f.loanLimit.note,
    } : null;
    if (loanFlag) flags.push(loanFlag);
    const sourceNote = [f.flood?.source, f.fire?.source, f.fha?.source, f.loanLimit?.source, f.usda?.source].filter(Boolean).join(" · ");
    return [
      ...(kpis.length ? [{ type: "kpis", items: kpis }] : []),
      ...(flags.length ? [{ type: "flags", items: flags }] : []),
      { type: "prose", items: [{ band: "WHITE", title: "Sources", body: `${sourceNote} · Data as of lookup date. Verify with your lender before close — FHA project approval status and flood map designations can change.` }] },
    ];
  }

  // Inject live transactions into the Transaction tab when present.
  const resolvedData = (isREAdvocate && (liveTransactions || financingData))
    ? {
        ...data,
        tabs: data.tabs.map((t) => {
          if (t.id === "financing" && financingData) {
            return { ...t, blocks: buildFinancingBlocks(financingData) };
          }
          if (t.id !== "transaction") return t;
          const txItems = liveTransactions.map((tx) => ({
            id: tx.id,
            band: tx.alertStatus === "red" ? "RED" : tx.alertStatus === "yellow" ? "YELLOW" : "GREEN",
            name: tx.propertyAddress || "Unknown property",
            address: tx.role ? tx.role.charAt(0).toUpperCase() + tx.role.slice(1) : "",
            meta: tx.status || "",
            status: tx.status || "",
            statusBand: tx.status === "under_contract" ? "YELLOW" : tx.status === "closed" ? "GREEN" : "WHITE",
            kpis: Object.entries(tx.keyDates || {}).filter(([, v]) => v).map(([k, v]) => ({
              label: k.replace(/([A-Z])/g, " $1").trim(),
              value: String(v),
            })),
            flags: [],
          }));
          return {
            ...t,
            blocks: t.blocks.map((b) =>
              b.type === "assetlist" ? { ...b, items: txItems } : b
            ),
          };
        }),
      }
    : data;

  const tab = resolvedData.tabs[active] || resolvedData.tabs[0];

  // Only show the property search on property/RE workers.
  const ident = `${worker?.vertical || ""} ${slug || ""}`;
  const isRE = /real|estate|propert|title|zoning|land|parcel|escrow|cre/i.test(ident);

  async function doLookup(e, addrOverride) {
    if (e) e.preventDefault();
    const addr = (addrOverride || query).trim();
    if (!addr) return;
    if (addrOverride) setQuery(addrOverride);
    setLiveBusy(true); setLiveErr(null); setFinancingData(null);
    try {
      const auth = getAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken(false) : null;
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      // Fire canvas lookup + financing constraints in parallel.
      const [lookupResp, finResp] = await Promise.all([
        fetch(`${apiBase}/api?path=/v1/re:lookup`, { method: "POST", headers, body: JSON.stringify({ address: addr }) }),
        isREAdvocate
          ? fetch(`${apiBase}/api?path=/v1/re:advocate:financing`, { method: "POST", headers, body: JSON.stringify({ address: addr }) })
          : Promise.resolve(null),
      ]);
      const j = await lookupResp.json();
      if (j.ok && j.canvasSpec) setLiveSpec(j.canvasSpec);
      else setLiveErr(j.error || "Couldn't find that property — try a full street address.");
      if (finResp) {
        const fj = await finResp.json().catch(() => null);
        if (fj && fj.ok) setFinancingData(fj);
      }
    } catch (_err) {
      setLiveErr("Lookup failed — try again.");
    } finally {
      setLiveBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {isRE && (
        <form onSubmit={doLookup} style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={'Look up any property — e.g. "325 Battery St, San Francisco, CA"'}
            style={{ flex: "1 1 240px", padding: "8px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8 }}
          />
          <button type="submit" disabled={liveBusy} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 8, cursor: "pointer", opacity: liveBusy ? 0.6 : 1 }}>
            {liveBusy ? "Pulling live data…" : "Look up"}
          </button>
          {liveSpec && (
            <button type="button" onClick={() => { setLiveSpec(null); setQuery(""); setLiveErr(null); }} style={{ padding: "8px 12px", fontSize: 13, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>✕ Clear</button>
          )}
        </form>
      )}
      {isRE && !liveSpec && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Try:</span>
          {["325 Battery St, San Francisco, CA", "1600 Pennsylvania Ave NW, Washington, DC", "658 Front St, Lahaina, HI"].map((ex) => (
            <button key={ex} type="button" disabled={liveBusy} onClick={() => doLookup(null, ex)}
              style={{ fontSize: 11, color: "#7c3aed", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 999, padding: "3px 10px", cursor: "pointer" }}>
              {ex.split(",")[0]}
            </button>
          ))}
        </div>
      )}
      {liveErr && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{liveErr}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{resolvedData.subtitle}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {resolvedData.sample && <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 10px" }}>SAMPLE DATA — illustrative, not a live pull</span>}
          {resolvedData.disclaimer && <span style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 999, padding: "3px 10px" }}>{resolvedData.disclaimer}</span>}
        </div>
      </div>

      <CasInstrumentPanel counts={resolvedData.cas} labels={resolvedData.casLabels} />

      {/* Internal tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #f1f5f9", marginBottom: 16, overflowX: "auto" }}>
        {resolvedData.tabs.map((t, i) => (
          <button key={t.id} onClick={() => setActive(i)} style={{
            padding: "8px 14px", fontSize: 13, fontWeight: i === active ? 600 : 500, cursor: "pointer",
            background: "none", border: "none", whiteSpace: "nowrap",
            color: i === active ? "#7c3aed" : "#64748b",
            borderBottom: i === active ? "2px solid #7c3aed" : "2px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      {(slug === "law-landuse-001" || slug === "zoning-001" || slug === "landuse-advocate-001") && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 12, color: "#92400e" }}>
          <span style={{ fontSize: 14 }}>⚖️</span>
          <span><strong>Not legal advice.</strong> This analysis is for informational purposes only. It does not constitute legal advice, create an attorney-client relationship, or substitute for consultation with a licensed attorney. Zoning and land use regulations are subject to change — confirm all findings with the applicable jurisdiction before relying on them for any decision.</span>
        </div>
      )}

      <TabDescription slug={slug} tabId={tab.id} description={tab.description} />

      {tab.blocks.map((b, i) => <Block key={i} block={b} />)}
    </div>
  );
}

// Gate: should this worker render the spec/tab canvas (vs the generic shell)?
// True when the worker carries its OWN valid canvas spec (data-driven — any
// worker, including freshly-built sandbox workers) OR matches a seed fixture.
// Name kept as isREWorker to avoid churn across call sites; it's no longer
// RE-specific.
// eslint-disable-next-line react-refresh/only-export-components
export function isREWorker(worker) {
  if (!worker) return false;
  if (isValidCanvasSpec(worker.canvasSpec || worker.canvas)) return true;
  // Match on ANY identifier — different code paths populate slug vs workerId vs
  // catalogId, and checking only one let cre-analyst slip the RE check (→ the
  // duplicate external tab bar). RE_CANVAS is keyed by slug.
  return !!(getRECanvas(worker.slug) || getRECanvas(worker.workerId) || getRECanvas(worker.catalogId));
}
