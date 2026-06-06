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

function staticMapUrl(parcels, selectedRank) {
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
  return `https://maps.googleapis.com/maps/api/staticmap?size=640x420&maptype=hybrid&${markers}&key=${MAPS_KEY}`;
}

function streetViewUrl(p) {
  if (!MAPS_KEY || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  return `https://maps.googleapis.com/maps/api/streetview?location=${p.lat},${p.lng}&size=640x360&key=${MAPS_KEY}`;
}

export default function SiteReconCanvas({ payload, onBack }) {
  const [tab, setTab] = useState("list");
  const [selectedRank, setSelectedRank] = useState(null);
  const [handoffs, setHandoffs] = useState({}); // apn -> { status, jobId, message }
  const parcels = payload?.parcels || [];
  const mapUrl = useMemo(() => staticMapUrl(parcels, selectedRank), [parcels, selectedRank]);

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

      <div style={S.tabs}>
        {[["list", "Ranked List"], ["map", "Map"], ["street", "Street View"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...S.tabBtn, ...(tab === id ? S.tabActive : {}) }}>{label}</button>
        ))}
      </div>

      {tab === "list" && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{["#", "Address", "APN", "Verdict", "Conf", "Blocker", ""].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {parcels.map((p) => {
                const h = handoffs[p.apn];
                const canHandoff = (p.verdict === "GREEN" || p.verdict === "YELLOW") && payload.handoffToken;
                return (
                  <tr key={p.rank} onClick={() => { setSelectedRank(p.rank); }} style={{ ...S.tr, ...(selectedRank === p.rank ? S.trSelected : {}) }}>
                    <td style={S.td}>{p.rank}</td>
                    <td style={S.td}>{[p.address1, p.address2].filter(Boolean).join(", ") || "—"}</td>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.apn || "—"}</td>
                    <td style={S.td}><span style={{ ...S.badge, background: VERDICT_COLORS[p.verdict] || "#6b7280" }}>{p.verdict}</span></td>
                    <td style={S.td}>{p.confidenceScore != null ? `${p.confidenceScore}%` : "—"}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 220 }}>{p.namedBlocker || "—"}</td>
                    <td style={S.td}>
                      {canHandoff && !h && <button style={S.handoffBtn} onClick={(e) => { e.stopPropagation(); handoff(p); }}>Hand off → W-002</button>}
                      {h?.status === "running" && <span style={S.dim}>Handing off…</span>}
                      {h?.status === "done" && <span style={{ color: VERDICT_COLORS.GREEN, fontSize: 12 }}>Queued · {h.jobId}</span>}
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
          {mapUrl
            ? <img src={mapUrl} alt="Parcel map — verdict-coded markers" style={S.mapImg} />
            : <div style={S.dim}>Map unavailable — no parcel coordinates or Maps key.</div>}
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
                {url
                  ? <img src={url} alt={`Street View — ${p.address1 || p.apn}`} style={S.streetImg} loading="lazy" />
                  : <div style={{ ...S.dim, padding: 40 }}>No imagery</div>}
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

const styles = {
  wrap: { padding: 20, color: "#e5e7eb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  title: { fontSize: 18, fontWeight: 700 },
  meta: { fontSize: 12.5, color: "#9ca3af", marginTop: 4 },
  backBtn: { background: "transparent", color: "#a78bfa", border: "1px solid #4c1d95", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 },
  tabs: { display: "flex", gap: 4, borderBottom: "1px solid #374151", marginBottom: 14 },
  tabBtn: { background: "transparent", color: "#9ca3af", border: "none", padding: "10px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: "#e5e7eb", borderBottom: "2px solid #8b5cf6" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th: { textAlign: "left", padding: "8px 10px", color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, borderBottom: "1px solid #374151" },
  tr: { cursor: "pointer", borderBottom: "1px solid #1f2937" },
  trSelected: { background: "rgba(139, 92, 246, 0.12)" },
  td: { padding: "10px" },
  badge: { color: "#0b0f19", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 },
  handoffBtn: { background: "#8b5cf6", color: "white", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  dim: { color: "#6b7280", fontSize: 13 },
  mediaWrap: { textAlign: "center" },
  mapImg: { maxWidth: "100%", borderRadius: 12, border: "1px solid #374151" },
  mapLegend: { fontSize: 12.5, color: "#9ca3af", marginTop: 10 },
  streetGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  streetCard: { background: "#111827", border: "1px solid #374151", borderRadius: 12, overflow: "hidden" },
  streetImg: { width: "100%", display: "block" },
  streetCaption: { padding: "10px 12px", fontSize: 13 },
};
