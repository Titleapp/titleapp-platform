/**
 * FlightPlanningCard.jsx — Aviation flight planning canvas card (50.21)
 *
 * ForeFlight-style structured form. Replaces the generic WorkProductCard
 * rendering for `card:aviation-flight-planning`.
 *
 * Layout:
 *   - Route header strip (Dep / Route / Dest / Alt)
 *   - Performance bar (Distance · ETE · Block fuel · Reserve · Cruise alt)
 *   - Winds aloft table
 *   - WX cards (Departure · Arrival · Alternate)
 *   - NOTAMs list
 *   - Briefing notes
 *   - Embedded route map at bottom
 *
 * Payload shape (also documented in sampleData.js):
 *   {
 *     title, subtitle,
 *     route: { departure, destination, alternate, routeString, distanceNm, eteHm, cruiseAlt, blockFuel, reserveFuel },
 *     windsAloft: [{ altitude, wind, temp }],
 *     weather: { departure: {metar,taf}, arrival: {...}, alternate: {...} },
 *     notams: [string],
 *     briefing: string,
 *     map: { from: "KSEA", to: "KPDX" }   // renders Maps Embed directions
 *   }
 *
 * Operator-upload empty state still renders via the registry's acceptsUpload flag
 * — when no payload is present and the registry says acceptsUpload, we show
 * OperatorUploadPrompt instead of the empty form.
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import OperatorUploadPrompt from "./OperatorUploadPrompt";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const S = {
  subtitle: { fontSize: 12, color: "var(--text-muted)", marginTop: -4, marginBottom: 14 },

  routeStrip: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
    background: "#0f172a", color: "#f8fafc", borderRadius: 10,
    padding: "12px 14px", marginBottom: 12,
  },
  routeCell: { display: "flex", flexDirection: "column", gap: 2 },
  routeLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8", textTransform: "uppercase" },
  routeValue: { fontSize: 18, fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, monospace" },
  routeString: {
    marginTop: 10, padding: "8px 10px", background: "#1e293b", borderRadius: 6,
    fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12, color: "#cbd5e1",
    wordBreak: "break-all", whiteSpace: "pre-wrap",
  },
  routeStringLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: "#7c3aed", textTransform: "uppercase", marginBottom: 4 },

  perfBar: {
    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6,
    border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginBottom: 14,
    background: "#f8fafc",
  },
  perfCell: { textAlign: "center", padding: "4px 6px" },
  perfLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "#64748b", textTransform: "uppercase" },
  perfValue: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 2, fontFamily: "ui-monospace, SFMono-Regular, monospace" },

  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 18 },

  windsTable: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  windsTh: { textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0" },
  windsTd: { padding: "6px 8px", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, monospace" },

  wxGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  wxCard: { border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "white" },
  wxRole: { fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5 },
  wxStation: { fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 2 },
  wxBody: { fontSize: 11, color: "#334155", marginTop: 6, lineHeight: 1.5, fontFamily: "ui-monospace, SFMono-Regular, monospace", whiteSpace: "pre-wrap" },

  notams: { listStyle: "none", padding: 0, margin: 0 },
  notamItem: { fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontFamily: "ui-monospace, SFMono-Regular, monospace" },

  briefing: { fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "10px 12px", background: "#fefce8", borderLeft: "3px solid #facc15", borderRadius: 4 },

  mapWrap: { marginBottom: 14, border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" },
  warnBanner: {
    marginTop: 12, fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fef3c7",
    borderRadius: 6, padding: "8px 10px", border: "1px solid #fcd34d",
  },
  ownPlanCTA: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, marginBottom: 14, padding: "10px 12px",
    background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8,
    fontSize: 12, color: "#3730a3",
  },
  ownPlanText: { fontWeight: 600, lineHeight: 1.4 },
  ownPlanHint: { fontWeight: 400, color: "#4338ca", marginTop: 2 },
};

function buildDirectionsUrl(map) {
  if (!API_KEY || !map?.from || !map?.to) return null;
  return `https://www.google.com/maps/embed/v1/directions?key=${API_KEY}&origin=${encodeURIComponent(map.from)}&destination=${encodeURIComponent(map.to)}&mode=flying`;
}

export default function FlightPlanningCard({ resolved = {}, context = {}, onDismiss }) {
  const payload = context?.payload || resolved?._payload || {};
  const title = payload.title || resolved?._title || "Flight Planning";
  const acceptsUpload = !!resolved?.acceptsUpload;
  const workerSlug = context?.worker?.slug || context?.workerSlug || null;

  const route       = payload.route       || null;
  const windsAloft  = Array.isArray(payload.windsAloft) ? payload.windsAloft : null;
  const weather     = payload.weather     || null;
  const notams      = Array.isArray(payload.notams) ? payload.notams : null;
  const briefing    = payload.briefing    || null;
  const mapData     = payload.map         || null;

  const hasContent = !!(route || windsAloft || weather || notams || briefing || mapData);

  if (!hasContent && acceptsUpload) {
    return (
      <CanvasCardShell title={title} onDismiss={onDismiss}>
        <OperatorUploadPrompt
          title={resolved?.uploadTitle || "No flight-planning SOP uploaded."}
          hint={resolved?.uploadHint || "Upload your operator's flight-planning SOP so the CoPilot grounds in your standards."}
          buttonLabel={resolved?.uploadButton || "Upload flight-planning SOP"}
          workerSlug={workerSlug}
          uploadCategory={resolved?.uploadCategory || "flight-planning-sop"}
        />
      </CanvasCardShell>
    );
  }

  const mapUrl = buildDirectionsUrl(mapData);

  return (
    <CanvasCardShell
      title={title}
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex to plan a flight to see the route and brief here."}
      onDismiss={onDismiss}
    >
      {hasContent && (
        <>
          {payload.subtitle && <div style={S.subtitle}>{payload.subtitle}</div>}

          <div style={S.ownPlanCTA}>
            <div>
              <div style={S.ownPlanText}>Plan your own flight</div>
              <div style={S.ownPlanHint}>Tell Alex your departure, destination, aircraft, and time — e.g. <em>"Plan KSEA to KBFI tomorrow 0800 in the PC-12"</em>.</div>
            </div>
          </div>

          {mapUrl && (
            <div style={S.mapWrap}>
              <iframe
                title={`Route map ${mapData.from} → ${mapData.to}`}
                src={mapUrl}
                width="100%"
                height="280"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          )}

          {route && (
            <>
              <div style={S.routeStrip}>
                <div style={S.routeCell}>
                  <span style={S.routeLabel}>Departure</span>
                  <span style={S.routeValue}>{route.departure || "—"}</span>
                </div>
                <div style={S.routeCell}>
                  <span style={S.routeLabel}>Destination</span>
                  <span style={S.routeValue}>{route.destination || "—"}</span>
                </div>
                <div style={S.routeCell}>
                  <span style={S.routeLabel}>Alternate</span>
                  <span style={S.routeValue}>{route.alternate || "—"}</span>
                </div>
                {route.routeString && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={S.routeStringLabel}>Route</div>
                    <div style={S.routeString}>{route.routeString}</div>
                    {route.routeSource && (
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{route.routeSource}</div>
                    )}
                  </div>
                )}
              </div>

              <div style={S.perfBar}>
                <div style={S.perfCell}>
                  <div style={S.perfLabel}>Distance</div>
                  <div style={S.perfValue}>{route.distanceNm ? `${route.distanceNm} nm` : "—"}</div>
                </div>
                <div style={S.perfCell}>
                  <div style={S.perfLabel}>ETE</div>
                  <div style={S.perfValue}>{route.eteHm || "—"}</div>
                </div>
                <div style={S.perfCell}>
                  <div style={S.perfLabel}>Cruise alt</div>
                  <div style={S.perfValue}>{route.cruiseAlt || "—"}</div>
                </div>
                <div style={S.perfCell}>
                  <div style={S.perfLabel}>Block fuel</div>
                  <div style={S.perfValue}>{route.blockFuel || "—"}</div>
                </div>
                <div style={S.perfCell}>
                  <div style={S.perfLabel}>Reserve</div>
                  <div style={S.perfValue}>{route.reserveFuel || "—"}</div>
                </div>
              </div>
            </>
          )}

          {windsAloft && windsAloft.length > 0 && (
            <>
              <div style={S.sectionTitle}>Winds aloft</div>
              <table style={S.windsTable}>
                <thead>
                  <tr>
                    <th style={S.windsTh}>Altitude</th>
                    <th style={S.windsTh}>Wind</th>
                    <th style={S.windsTh}>Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {windsAloft.map((w, i) => (
                    <tr key={i}>
                      <td style={S.windsTd}>{w.altitude}</td>
                      <td style={S.windsTd}>{w.wind}</td>
                      <td style={S.windsTd}>{w.temp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {weather && (
            <>
              <div style={S.sectionTitle}>Weather</div>
              <div style={S.wxGrid}>
                {["departure", "arrival", "alternate"].map(role => {
                  const w = weather[role];
                  if (!w) return null;
                  return (
                    <div key={role} style={S.wxCard}>
                      <div style={S.wxRole}>{role}</div>
                      <div style={S.wxStation}>{w.station || ""}</div>
                      {w.metar && <div style={S.wxBody}>{w.metar}</div>}
                      {w.taf && <div style={{ ...S.wxBody, color: "#64748b" }}>{w.taf}</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {notams && notams.length > 0 && (
            <>
              <div style={S.sectionTitle}>NOTAMs</div>
              <ul style={S.notams}>
                {notams.map((n, i) => (
                  <li key={i} style={S.notamItem}>{n}</li>
                ))}
              </ul>
            </>
          )}

          {briefing && (
            <>
              <div style={S.sectionTitle}>Briefing notes</div>
              <div style={S.briefing}>{briefing}</div>
            </>
          )}

          <div style={S.warnBanner}>
            Not approved for flight. Always follow your operator's released dispatch plan and current charts.
          </div>
        </>
      )}
    </CanvasCardShell>
  );
}
