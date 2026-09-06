/**
 * CockpitView.jsx — CODEX 64's iPad cockpit layout: 60/40 split, map always
 * visible on the left, intelligence panel always visible on the right (no
 * tab-switch that hides the map). This is View 1 ("Ground / Pre-flight" —
 * the default state when no flight is active) built pragmatically against
 * REAL data already wired today, not rebuilt from scratch:
 *   - Currency/compliance   → GET /v1/pilot:currency        (currencyToBlocks)
 *   - Weather brief         → GET /v1/aviation:weather      (weatherToBlocks)
 *   - NOTAMs                → GET /v1/aviation:notams       (inline, same shape AviationWorkerCanvas uses)
 *   - Squawks / MEL status  → GET /v1/mx:listSquawks        (melItemsToBlocks)
 * all reused verbatim from AviationWorkerCanvas.jsx (exported for this
 * purpose) rather than re-implemented.
 *
 * NOT built here (explicitly out of scope for this pass, per the brief):
 *   - View 2/3 flight-state machine (active-flight brief / in-flight
 *     monitoring) — the GPS strip and moving-map dot work at all times,
 *     which covers the core of what those views need, but there's no
 *     "START A FLIGHT" state transition here.
 *   - Manifest / CG acceptance UI.
 *   - Clearance capture (CRAFT structuring).
 *
 * Routed to for the native "aviation" flavor on a real iPad viewport (see
 * main.jsx) and reachable from the main app as section "av-cockpit".
 */
import React, { useState, useEffect, useCallback } from "react";
import AviationMap from "../../components/canvas/AviationMap";
import { apiGet, weatherToBlocks, currencyToBlocks, melItemsToBlocks, Block } from "../../components/canvas/AviationWorkerCanvas";
import useGpsSource from "../../native/useGpsSource";
import GpsStatusStrip from "../../components/aviation/GpsStatusStrip";
import GpsPairingModal from "../../components/aviation/GpsPairingModal";
import BriefStalenessBanner from "../../components/aviation/BriefStalenessBanner";
import LaunchDisclaimerGate from "../../components/aviation/LaunchDisclaimerGate";
import { SUPPLEMENTAL_FOOTER } from "../../components/aviation/aviationDisclaimers";

// Real Hawaii operating bases — same ICAO set AviationMap defaults to and
// Dispatch's real NOTAMs tab already uses (see LIVE_TABS in
// AviationWorkerCanvas.jsx), so the map, weather, and NOTAMs all agree on
// the same real airports rather than three different placeholder sets.
const DEFAULT_ICAOS = ["PHOG", "PHNL", "PHKO", "PHTO", "PHNY"];
const BRIEF_CACHE_KEY = "sociii_av_last_brief_loaded_at";

function notamsToBlocks(airports) {
  const all = (airports || []).flatMap(a => a.notams || []);
  if (!all.length) return [{
    type: "prose",
    items: [{ band: "GREEN", title: "No active NOTAMs", text: `No NOTAMs reported for ${DEFAULT_ICAOS.join(", ")}.` }],
  }];
  const relevant = all.filter(n =>
    !n.text?.toLowerCase().includes("light") && !n.text?.toLowerCase().includes("obstruction")
  ).slice(0, 8);
  if (!relevant.length) return null;
  return [{
    type: "cards",
    items: relevant.map(n => ({
      band: n.text?.toLowerCase().includes("ils") || n.text?.toLowerCase().includes("rwy") ? "YELLOW" : "BLUE",
      label: n.airport || n.location || "NOTAM",
      title: n.notamId || n.id || "NOTAM",
      detail: n.text || n.message || JSON.stringify(n).slice(0, 120),
    })),
  }];
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function CockpitView() {
  const gps = useGpsSource();
  const [showPairing, setShowPairing] = useState(false);
  const [brief, setBrief] = useState({ currency: null, weather: null, notams: null, squawks: null, loadedAt: null, loading: true, error: null });

  const loadBrief = useCallback(async () => {
    setBrief((b) => ({ ...b, loading: true }));
    try {
      const [currencyRes, weatherRes, notamsRes, squawksRes] = await Promise.allSettled([
        apiGet(`/v1/pilot:currency`),
        apiGet(`/v1/aviation:weather?ids=${DEFAULT_ICAOS.join(",")}`),
        apiGet(`/v1/aviation:notams?locations=${DEFAULT_ICAOS.join(",")}`),
        apiGet(`/v1/mx:listSquawks`),
      ]);
      const loadedAt = Date.now();
      try { localStorage.setItem(BRIEF_CACHE_KEY, String(loadedAt)); } catch { /* ignore */ }
      setBrief({
        currency: currencyRes.status === "fulfilled" ? currencyRes.value?.currency : null,
        weather: weatherRes.status === "fulfilled" ? weatherRes.value?.metars : null,
        notams: notamsRes.status === "fulfilled" ? notamsRes.value?.airports : null,
        squawks: squawksRes.status === "fulfilled" ? squawksRes.value?.squawks : null,
        loadedAt,
        loading: false,
        error: null,
      });
    } catch (e) {
      setBrief((b) => ({ ...b, loading: false, error: e.message || "Failed to load brief" }));
    }
  }, []);

  useEffect(() => { loadBrief(); }, [loadBrief]);

  const currencyBlocks = currencyToBlocks(brief.currency) || [];
  const weatherBlocks = weatherToBlocks(brief.weather) || [];
  const notamBlocks = notamsToBlocks(brief.notams) || [];
  const melBlocks = melItemsToBlocks(brief.squawks) || [];

  const noop = () => {};

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "calc(100vh - 60px)", background: "#0f172a" }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left 60% — map, always visible, never hidden by a tab switch */}
        <div style={{ flex: "0 0 60%", position: "relative", minWidth: 0 }}>
          <AviationMap
            center={[20.9, -156.4]}
            zoom={7}
            height="100%"
            icaos={DEFAULT_ICAOS}
            ownPosition={gps.fix}
            followPosition={gps.status === "connected"}
          />
          {/* top-right — clear of AviationMap's own icon rail (top-left),
              legend (bottom-left), and loading indicator (bottom-right) */}
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 1000 }}>
            <GpsStatusStrip gps={gps} onTapPair={() => setShowPairing(true)} />
          </div>
        </div>

        {/* Right 40% — intelligence panel, always visible */}
        <div style={{ flex: "0 0 40%", minWidth: 320, overflowY: "auto", padding: "14px 16px 60px", background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
            <BriefStalenessBanner loadedAt={brief.loadedAt} variant="inline" />
            <button
              type="button"
              onClick={loadBrief}
              disabled={brief.loading}
              style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#0284c7", background: "#fff", border: "1px solid #0284c7", borderRadius: 6, cursor: brief.loading ? "default" : "pointer" }}
            >
              {brief.loading ? "Refreshing…" : "Refresh brief"}
            </button>
          </div>

          {brief.error && (
            <div style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
              {brief.error}
            </div>
          )}

          <Section title="Compliance / Currency">
            {currencyBlocks.map((b, i) => <Block key={i} block={b} onTabSwitch={noop} onChatFill={noop} />)}
          </Section>

          <Section title={`Weather brief — ${DEFAULT_ICAOS.join(", ")}`}>
            {weatherBlocks.map((b, i) => <Block key={i} block={b} onTabSwitch={noop} onChatFill={noop} />)}
          </Section>

          <Section title="NOTAMs">
            {notamBlocks.map((b, i) => <Block key={i} block={b} onTabSwitch={noop} onChatFill={noop} />)}
          </Section>

          <Section title="Squawks / MEL status">
            {melBlocks.map((b, i) => <Block key={i} block={b} onTabSwitch={noop} onChatFill={noop} />)}
          </Section>

          <div style={{ marginTop: 8 }}>
            <LaunchDisclaimerGate dark={false} />
          </div>
        </div>
      </div>

      {/* Persistent footer — cannot be dismissed, per CODEX 64 */}
      <div style={{ padding: "6px 12px", textAlign: "center", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: "#fca5a5", background: "#1e293b" }}>
        {SUPPLEMENTAL_FOOTER}
      </div>

      {showPairing && <GpsPairingModal gps={gps} onClose={() => setShowPairing(false)} />}
    </div>
  );
}
