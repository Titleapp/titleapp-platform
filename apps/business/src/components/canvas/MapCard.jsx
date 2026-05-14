/**
 * MapCard.jsx — Google Maps canvas card for RE workers.
 *
 * CODEX 50.18 follow-up 2026-05-12 (Sean's call): every RE worker should
 * show a map on the canvas. Single-property = pin + zoom on that address.
 * Multi-property = bounded view of the area with the property addresses
 * surfaced as a search.
 *
 * Uses Google Maps Embed API via iframe — no JS-library load, no marker
 * dependency. API key from VITE_GOOGLE_MAPS_API_KEY env var.
 *
 * Resolves location data from the canvas context in priority order:
 *   1. resolved.locations[] — array of {address, label?} or {lat, lng, label?}
 *   2. resolved.address — single property string
 *   3. resolved.region — area-level fallback ("Austin, TX")
 *   4. demo fallback when in SAMPLE mode
 */

import React, { useMemo } from "react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Demo fallbacks — used when no live data is present (SAMPLE mode).
// Each entry corresponds to a typical demo market we use across RE worker
// fixtures. Keep these in sync with sampleData.js where possible.
const DEMO_REGIONS = {
  "real_estate_development": "Downtown Austin, TX",
  "re_professional":         "San Francisco, CA",
  "real-estate":             "Austin, TX",
  "default":                 "San Francisco, CA",
};

function buildEmbedUrl({ locations, address, region, vertical }) {
  if (!API_KEY) return null;

  // Multi-location: use Maps Embed Search mode. Construct a query from all
  // distinct addresses joined by " | " (Maps treats that as multi-result).
  // For better viz of clustered points we should upgrade to the JS API
  // with markers; this is v1.
  if (Array.isArray(locations) && locations.length > 1) {
    const q = locations
      .map(l => l.address || (l.lat && l.lng ? `${l.lat},${l.lng}` : null))
      .filter(Boolean)
      .slice(0, 10)
      .join(" | ");
    if (q) {
      return `https://www.google.com/maps/embed/v1/search?key=${API_KEY}&q=${encodeURIComponent(q)}`;
    }
  }

  // Single location: place mode (pin + zoom).
  const single =
    (Array.isArray(locations) && locations.length === 1 ? locations[0].address : null) ||
    address ||
    region ||
    DEMO_REGIONS[vertical] ||
    DEMO_REGIONS.default;

  return `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${encodeURIComponent(single)}`;
}

export default function MapCard({ resolved = {}, context = {}, onDismiss }) {
  // Read from context.payload first (fixture path — set by tab-click handler in
  // App.jsx WorkerHomeRenderer). Fall back to resolved (chat-emitted CANVAS_RENDER
  // path). Without this, demo fixtures never reach the map and we fall back to
  // DEMO_REGIONS.default ("San Francisco, CA") everywhere.
  const payload = context?.payload || {};
  const locations = payload.locations || resolved?.locations;
  const address   = payload.address   || resolved?.address;
  const region    = payload.region    || resolved?.region;
  const vertical = context?.vertical || context?.worker?.vertical;

  const url = useMemo(
    () => buildEmbedUrl({ locations, address, region, vertical }),
    [locations, address, region, vertical]
  );

  const locCount = Array.isArray(locations) ? locations.length : (address ? 1 : 0);
  const headline = locCount > 1
    ? `${locCount} locations`
    : (address || (Array.isArray(locations) && locations[0]?.address) || region || DEMO_REGIONS[vertical] || DEMO_REGIONS.default);

  if (!API_KEY) {
    return (
      <div style={{ padding: 16, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
        <strong>Map unavailable.</strong> VITE_GOOGLE_MAPS_API_KEY is not set in the frontend build.
      </div>
    );
  }

  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Location
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
            {headline}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1, padding: 4 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
      <iframe
        title={`Map of ${headline}`}
        src={url}
        width="100%"
        height="400"
        style={{ border: 0, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
