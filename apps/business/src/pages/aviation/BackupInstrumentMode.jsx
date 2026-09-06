/**
 * BackupInstrumentMode.jsx — CODEX 64's backup instrument mode: full-screen
 * map + GPS instruments, no auth, no tenant data, no brief content.
 *
 *   "backup instrument mode shows generic GPS position and cached map tiles
 *   only. No tenant data, no brief content, no operating feed. A
 *   locked/lost/stolen iPad in backup mode shows nothing sensitive."
 *
 * This is a top-level route (`/instrument`) that bypasses auth and the
 * whole AdminShell entirely — see the intercept in App.jsx, same pattern as
 * `/sandbox` and `/invest/room`. It does not call any tenant-scoped API:
 * AviationMap's `minimal` prop skips the weather fetch outright, so this
 * screen never makes an authenticated request at all.
 *
 * The brief-staleness banner still needs *some* timestamp to show — it
 * reads the last brief-load time the authenticated CockpitView cached to
 * localStorage (device-local only, never fetched fresh here), which is
 * exactly the "cached... only" framing the spec calls for.
 */
import React from "react";
import AviationMap from "../../components/canvas/AviationMap";
import useGpsSource from "../../native/useGpsSource";
import GpsStatusStrip from "../../components/aviation/GpsStatusStrip";
import GpsPairingModal from "../../components/aviation/GpsPairingModal";
import BriefStalenessBanner from "../../components/aviation/BriefStalenessBanner";
import { SUPPLEMENTAL_FOOTER, TERRAIN_DISCLAIMER } from "../../components/aviation/aviationDisclaimers";

const BRIEF_CACHE_KEY = "sociii_av_last_brief_loaded_at";

export default function BackupInstrumentMode() {
  const gps = useGpsSource();
  const [showPairing, setShowPairing] = React.useState(false);

  let cachedLoadedAt = null;
  try {
    const raw = localStorage.getItem(BRIEF_CACHE_KEY);
    cachedLoadedAt = raw ? parseInt(raw, 10) : null;
  } catch { /* ignore */ }

  const fix = gps.fix;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0f172a", display: "flex", flexDirection: "column", zIndex: 100 }}>
      <BriefStalenessBanner loadedAt={cachedLoadedAt} variant="banner" />

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <AviationMap
          center={fix?.lat != null ? [fix.lat, fix.lon] : [20.9, -156.4]}
          zoom={9}
          height="100%"
          minimal
          ownPosition={fix}
          followPosition={gps.status === "connected"}
        />

        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}>
          <GpsStatusStrip gps={gps} onTapPair={() => setShowPairing(true)} />
        </div>

        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, maxWidth: 260, padding: "5px 9px", borderRadius: 8, background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8", fontSize: 10, lineHeight: 1.4 }}>
          {TERRAIN_DISCLAIMER}
        </div>

        {/* GPS instrument readout — TRK/GS/ALT. ETE is intentionally omitted:
            it requires an active route/flight plan this no-auth mode has no
            access to, and showing a fabricated "—" ETE field would be worse
            than not showing the row at all. */}
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
          display: "flex", gap: 18, padding: "8px 18px", borderRadius: 10,
          background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#e2e8f0", fontFamily: "monospace", fontSize: 14, fontWeight: 700,
        }}>
          <span>TRK {fix?.trackDeg != null ? `${Math.round(fix.trackDeg)}°` : "—"}</span>
          <span>GS {fix?.groundspeedKts != null ? `${Math.round(fix.groundspeedKts)}kt` : "—"}</span>
          <span>ALT {fix?.altitudeFt != null ? `${Math.round(fix.altitudeFt)}ft` : "—"}</span>
        </div>
      </div>

      <div style={{ padding: "8px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: "#fca5a5", background: "#1e293b" }}>
        {SUPPLEMENTAL_FOOTER}
      </div>

      <a
        href="/"
        style={{ position: "absolute", bottom: 60, right: 12, zIndex: 1000, fontSize: 11, color: "#64748b", background: "rgba(15,23,42,0.85)", padding: "4px 10px", borderRadius: 8, textDecoration: "none", border: "1px solid #334155" }}
      >
        ◀ Exit to app
      </a>

      {showPairing && <GpsPairingModal gps={gps} onClose={() => setShowPairing(false)} />}
    </div>
  );
}
