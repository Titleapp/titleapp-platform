import { useMemo, useState } from "react";
import { getAuth } from "firebase/auth";

/**
 * SiteReconCanvas — renders a site-recon-results canvas payload (S52.35).
 * Three tabs: Ranked List / Map / Street View. Functional-first per the
 * wiring brief; styling matches the journey page's dark theme loosely.
 */

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const VERDICT_COLORS = { GREEN: "#22c55e", YELLOW: "#eab308", RED: "#ef4444" };
const MARKER_COLORS = { GREEN: "green", YELLOW: "yellow", RED: "red" };

// Handoff targets — HONEST states only (Sean-ratified 2026-06-06): one live
// target today, drafts greyed. TEMPORARY hardcode: replaced by the catalog
// "accepts" contract (T1 substrate) — targets will be discovered from
// receiving workers' declarations, never listed here.
const HANDOFF_TARGETS = [
  { id: "title-abstract-001", label: "Title Abstract — full underwriting", live: true },
  { id: "dd-001", label: "Due Diligence — pre-acquisition review", live: false },
  { id: "para-001", label: "Paralegal — easements, HOA, CC&Rs", live: false },
  { id: "lit-001", label: "Litigation — active case check", live: false },
  { id: "clo-001", label: "Closing — document preparation", live: false },
];

function fmtValue(p) {
  if (p.valueUsd == null) return null;
  const amt = `$${Number(p.valueUsd).toLocaleString()}`;
  let date = p.valueDate || "";
  // Normalize to MM/DD/YYYY; bare years (tax assessment) stay as-is.
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [y, m, d] = date.slice(0, 10).split("-");
    date = `${m}/${d}/${y}`;
  } else if (/^\d{4}-\d{2}$/.test(date)) {
    const [y, m] = date.split("-");
    date = `${m}/${y}`;
  }
  const detail = [p.valueType, date].filter(Boolean).join(", ");
  return { amt, detail };
}

function staticMapUrl(parcels, selectedRank, mapType = "hybrid", zoom = null) {
  const pts = parcels.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!pts.length || !MAPS_KEY) return null;
  const groups = {};
  for (const p of pts) {
    const sel = p.rank === selectedRank;
    const key = `${MARKER_COLORS[p.verdict] || "gray"}|${sel ? "mid" : "small"}`;
    (groups[key] = groups[key] || []).push(`${p.lat},${p.lng}`);
  }
  const markers = Object.entries(groups)
    .map(([k, locs]) => {
      const [color, size] = k.split("|");
      return `markers=color:${color}%7Csize:${size}%7C${locs.join("%7C")}`;
    })
    .join("&");
  // zoom=null lets Static Maps auto-fit the markers; explicit zoom needs a center.
  const centerLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const centerLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
  const zoomPart = zoom != null ? `&center=${centerLat},${centerLng}&zoom=${zoom}` : "";
  return `https://maps.googleapis.com/maps/api/staticmap?size=640x420&scale=2&maptype=${mapType}${zoomPart}&${markers}&key=${MAPS_KEY}`;
}

function streetViewUrl(p) {
  if (!MAPS_KEY || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  return `https://maps.googleapis.com/maps/api/streetview?location=${p.lat},${p.lng}&size=640x360&key=${MAPS_KEY}`;
}

export default function SiteReconCanvas({ payload, onBack }) {
  // Street View first — the visual tells the story before the table does
  // (Sean's Lahaina dogfood call; same thesis as RULE-17 visual-before-verdict).
  const [tab, setTab] = useState("street");
  const [selectedRank, setSelectedRank] = useState(null);
  const [handoffs, setHandoffs] = useState({}); // apn -> { status, jobId, message }
  const [openMenuApn, setOpenMenuApn] = useState(null); // "Send to…" dropdown state
  const [brokenImgs, setBrokenImgs] = useState({}); // url -> true (key restriction / no imagery)
  const [mapType, setMapType] = useState("hybrid"); // hybrid | roadmap
  const [zoom, setZoom] = useState(null); // null = auto-fit to markers
  const parcels = payload?.parcels || [];
  const mapUrl = useMemo(() => staticMapUrl(parcels, selectedRank, mapType, zoom), [parcels, selectedRank, mapType, zoom]);
  const centroid = useMemo(() => {
    const pts = parcels.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (!pts.length) return null;
    return { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length };
  }, [parcels]);

  async function handoff(p) {
    setHandoffs((h) => ({ ...h, [p.apn]: { status: "running" } }));
    try {
      const token = await getAuth().currentUser.getIdToken(false);
      const resp = await fetch(`${API_BASE}/api?path=/v1/workers/site-recon-001/handoff-to-title-abstract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Tenant-Id": localStorage.getItem("TENANT_ID") || "vault" },
        body: JSON.stringify({ handoffToken: payload.handoffToken, apn: p.apn }),
      });
      const data = await resp.json();
      if (data.ok) {
        setHandoffs((h) => ({ ...h, [p.apn]: { status: "done", jobId: data.handoff.titleAbstractJobId } }));
      } else {
        setHandoffs((h) => ({ ...h, [p.apn]: { status: "error", message: data.message || data.error || data.code } }));
      }
    } catch (e) {
      setHandoffs((h) => ({ ...h, [p.apn]: { status: "error", message: e.message } }));
    }
  }

  const S = styles;
  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Site Recon — {payload.searchArea?.type === "radius" ? `${payload.searchArea.radiusMiles} mi radius` : "parcel pull"}</div>
          <div style={S.meta}>
            {parcels.length} parcels · <span style={{ color: VERDICT_COLORS.GREEN }}>{payload.counts?.green ?? 0}G</span> / <span style={{ color: VERDICT_COLORS.YELLOW }}>{payload.counts?.yellow ?? 0}Y</span> / <span style={{ color: VERDICT_COLORS.RED }}>{payload.counts?.red ?? 0}R</span>
            {payload.billing?.totalFeeUsd != null && <> · ${Number(payload.billing.totalFeeUsd).toFixed(2)}</>}
            {payload.searchId && <> · search {payload.searchId.slice(0, 18)}…</>}
            {payload.anchoredAt && <> · anchored {new Date(payload.anchoredAt).toLocaleTimeString()}</>}
          </div>
        </div>
        {onBack && <button style={S.backBtn} onClick={onBack}>← Creator steps</button>}
      </div>

      {/* Trump Rule KPI strip — the headline numbers, card-styled */}
      <div style={S.kpiRow}>
        <div style={S.kpiCard}><div style={S.kpiLabel}>Parcels</div><div style={S.kpiValue}>{parcels.length}</div></div>
        <div style={S.kpiCard}><div style={S.kpiLabel}>Feasibility</div><div style={S.kpiValue}>
          <span style={{ color: VERDICT_COLORS.GREEN }}>{payload.counts?.green ?? 0}G</span>{" / "}
          <span style={{ color: "#b45309" }}>{payload.counts?.yellow ?? 0}Y</span>{" / "}
          <span style={{ color: VERDICT_COLORS.RED }}>{payload.counts?.red ?? 0}R</span>
        </div></div>
        <div style={S.kpiCard}><div style={S.kpiLabel}>Data cost</div><div style={S.kpiValue}>{payload.billing?.totalFeeUsd != null ? `$${Number(payload.billing.totalFeeUsd).toFixed(2)}` : "—"}</div></div>
        <div style={S.kpiCard}><div style={S.kpiLabel}>Avg confidence</div><div style={S.kpiValue}>{parcels.length ? `${Math.round(parcels.reduce((s, p) => s + (p.confidenceScore || 0), 0) / parcels.length)}%` : "—"}</div></div>
      </div>

      <div style={S.tabs}>
        {[["street", "Street View"], ["map", "Map"], ["list", "Ranked List"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...S.tabBtn, ...(tab === id ? S.tabActive : {}) }}>{label}</button>
        ))}
      </div>

      {tab === "list" && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{["#", "Address", "Value", "Feasibility", "Confidence", "Blocking issue", "APN", ""].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {parcels.map((p) => {
                const h = handoffs[p.apn];
                const canHandoff = (p.verdict === "GREEN" || p.verdict === "YELLOW") && payload.handoffToken;
                return (
                  <tr key={p.rank} onClick={() => { setSelectedRank(p.rank); }} style={{ ...S.tr, ...(selectedRank === p.rank ? S.trSelected : {}) }}>
                    <td style={S.td}>{p.rank}</td>
                    <td style={S.td}>{[p.address1, p.address2].filter(Boolean).join(", ") || "—"}</td>
                    <td style={S.td}>
                      {(() => {
                        const v = fmtValue(p);
                        return v
                          ? <><span style={{ fontWeight: 600 }}>{v.amt}</span>{v.detail && <div style={{ fontSize: 11, color: "#6b7280" }}>{v.detail}</div>}</>
                          : <span style={S.dim}>N/A</span>;
                      })()}
                    </td>
                    <td style={S.td}><span style={{ ...S.badge, background: VERDICT_COLORS[p.verdict] || "#6b7280" }}>{p.verdict}</span></td>
                    <td style={S.td}>{p.confidenceScore != null ? `${p.confidenceScore}%` : "—"}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 220 }}>{p.namedBlocker || "—"}</td>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.apn || "—"}</td>
                    <td style={S.td}>
                      {canHandoff && !h && (
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button style={S.handoffBtn} onClick={(e) => { e.stopPropagation(); setOpenMenuApn(openMenuApn === p.apn ? null : p.apn); }}>Send to… ▾</button>
                          {openMenuApn === p.apn && (
                            <div style={S.menu} onClick={(e) => e.stopPropagation()}>
                              {HANDOFF_TARGETS.map((t) =>
                                t.live ? (
                                  <button key={t.id} style={S.menuItem} onClick={() => { setOpenMenuApn(null); handoff(p); }}>{t.label}</button>
                                ) : (
                                  <div key={t.id} style={S.menuItemDisabled} title="This worker isn't live yet — it appears here the day it ships.">
                                    {t.label} <span style={S.soonTag}>coming soon</span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {h?.status === "running" && <span style={S.dim}>Handing off…</span>}
                      {h?.status === "done" && <span style={{ color: "#16a34a", fontSize: 12 }} title={`Job ${h.jobId}`}>✓ Sent to Title Abstract — full underwriting queued</span>}
                      {h?.status === "error" && <span style={{ color: VERDICT_COLORS.RED, fontSize: 12 }}>{h.message}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "map" && (
        <div style={S.mediaWrap}>
          {mapUrl && !brokenImgs[mapUrl]
            ? <img src={mapUrl} alt="Parcel map — verdict-coded markers" style={S.mapImg} onError={() => setBrokenImgs((b) => ({ ...b, [mapUrl]: true }))} />
            : (
              <div style={S.imgFallback}>
                <div style={S.dim}>Map image unavailable{mapUrl ? " — the Maps key needs this site in its referrer allowlist (Google Cloud Console → Credentials)." : " — no parcel coordinates or Maps key."}</div>
                {parcels.filter((p) => Number.isFinite(p.lat)).slice(0, 10).map((p) => (
                  <div key={p.rank} style={{ marginTop: 6 }}>
                    <a style={S.mapsLink} href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">#{p.rank} {p.address1 || p.apn} ({p.verdict}) — open in Google Maps ↗</a>
                  </div>
                ))}
              </div>
            )}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
            <button style={S.mapCtl} onClick={() => setMapType((t) => (t === "hybrid" ? "roadmap" : "hybrid"))}>{mapType === "hybrid" ? "Map view" : "Satellite view"}</button>
            <button style={S.mapCtl} onClick={() => setZoom((z) => Math.min(20, (z ?? 16) + 1))}>＋ Zoom in</button>
            <button style={S.mapCtl} onClick={() => setZoom((z) => Math.max(10, (z ?? 16) - 1))}>－ Zoom out</button>
            {zoom != null && <button style={S.mapCtl} onClick={() => setZoom(null)}>Fit all pins</button>}
            {centroid && <a style={{ ...S.mapCtl, textDecoration: "none", display: "inline-flex", alignItems: "center" }} href={`https://www.google.com/maps/@${centroid.lat},${centroid.lng},17z`} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>}
          </div>
          <div style={S.mapLegend}>
            {selectedRank && <span>Highlighted: #{selectedRank} (larger pin) · </span>}
            <span style={{ color: VERDICT_COLORS.GREEN }}>● Green</span> <span style={{ color: VERDICT_COLORS.YELLOW }}>● Yellow</span> <span style={{ color: VERDICT_COLORS.RED }}>● Red</span>
            {" · click a row in Ranked List to highlight"}
          </div>
        </div>
      )}

      {tab === "street" && (
        <div style={S.streetGrid}>
          {parcels.slice(0, 6).map((p) => {
            const url = streetViewUrl(p);
            return (
              <div key={p.rank} style={S.streetCard}>
                {url && !brokenImgs[url]
                  ? <img src={url} alt={`Street View — ${p.address1 || p.apn}`} style={S.streetImg} loading="lazy" onError={() => setBrokenImgs((b) => ({ ...b, [url]: true }))} />
                  : (
                    <div style={S.imgFallback}>
                      <div style={S.dim}>Imagery unavailable</div>
                      {Number.isFinite(p.lat) && <a style={S.mapsLink} href={`https://www.google.com/maps?q=&layer=c&cbll=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">Open Street View ↗</a>}
                    </div>
                  )}
                <div style={S.streetCaption}>
                  <span style={{ ...S.badge, background: VERDICT_COLORS[p.verdict] || "#6b7280", marginRight: 8 }}>{p.verdict}</span>
                  #{p.rank} {p.address1 || p.apn}
                </div>
              </div>
            );
          })}
          {!parcels.length && <div style={S.dim}>No parcels.</div>}
        </div>
      )}
    </div>
  );
}

// Light palette — the journey canvas slot renders on a white background.
const styles = {
  wrap: { padding: 20, color: "#111827", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  title: { fontSize: 18, fontWeight: 700, color: "#111827" },
  meta: { fontSize: 12.5, color: "#6b7280", marginTop: 4 },
  backBtn: { background: "white", color: "#7c3aed", border: "1px solid #c4b5fd", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  tabs: { display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 14 },
  tabBtn: { background: "transparent", color: "#6b7280", border: "none", padding: "10px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: "#111827", borderBottom: "2px solid #8b5cf6" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5, color: "#1f2937" },
  th: { textAlign: "left", padding: "8px 10px", color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, borderBottom: "1px solid #e5e7eb" },
  tr: { cursor: "pointer", borderBottom: "1px solid #f3f4f6" },
  trSelected: { background: "rgba(139, 92, 246, 0.08)" },
  td: { padding: "10px", color: "#1f2937" },
  badge: { color: "white", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 },
  handoffBtn: { background: "#8b5cf6", color: "white", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  dim: { color: "#9ca3af", fontSize: 13 },
  mediaWrap: { textAlign: "center" },
  mapImg: { maxWidth: "100%", borderRadius: 12, border: "1px solid #e5e7eb" },
  mapLegend: { fontSize: 12.5, color: "#6b7280", marginTop: 10 },
  streetGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  streetCard: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  streetImg: { width: "100%", display: "block" },
  streetCaption: { padding: "10px 12px", fontSize: 13, color: "#1f2937" },
  imgFallback: { padding: "32px 16px", textAlign: "center", fontSize: 13 },
  mapsLink: { color: "#7c3aed", textDecoration: "none", fontWeight: 600 },
  mapCtl: { background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  menu: { position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20, background: "white", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 260, padding: 6, textAlign: "left" },
  menuItem: { display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "9px 12px", fontSize: 13, color: "#111827", cursor: "pointer", borderRadius: 6 },
  menuItemDisabled: { padding: "9px 12px", fontSize: 13, color: "#9ca3af", cursor: "default" },
  soonTag: { fontSize: 10, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 999, padding: "1px 7px", marginLeft: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, margin: "4px 0 16px" },
  kpiCard: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px" },
  kpiLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6 },
  kpiValue: { fontSize: 20, fontWeight: 700, color: "#111827", marginTop: 4 },
};
