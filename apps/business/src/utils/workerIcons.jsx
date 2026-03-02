import React, { useRef } from "react";

// Filled + gradient worker icons — solid shapes with depth.
// Usage: <WorkerIcon slug="cre-analyst" size={20} color="#7c3aed" />

function lighten(hex, amt = 0.3) {
  if (!hex || hex[0] !== "#" || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(amt * (255 - ((n >> 16) & 255))));
  const g = Math.min(255, ((n >> 8) & 255) + Math.round(amt * (255 - ((n >> 8) & 255))));
  const b = Math.min(255, (n & 255) + Math.round(amt * (255 - (n & 255))));
  return `rgb(${r},${g},${b})`;
}

// Each icon: (gradientId) => JSX
// Main shapes: fill={`url(#${g})`}   Accents: fill="white" or stroke="white"
const ICONS = {
  // ── Chief of Staff — star ──
  "chief-of-staff": (g) => (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#${g})`} />
  ),

  // ── Phase 1: Acquisition ──

  // Bar chart
  "cre-analyst": (g) => (
    <>
      <rect x="4" y="14" width="4" height="8" rx="1.5" fill={`url(#${g})`} />
      <rect x="10" y="8" width="4" height="14" rx="1.5" fill={`url(#${g})`} />
      <rect x="16" y="3" width="4" height="19" rx="1.5" fill={`url(#${g})`} />
    </>
  ),

  // Dollar in circle
  "investor-relations": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} />
      <path d="M12 7v1.5m0 7V17" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </>
  ),

  // Document with text lines
  "title-escrow": (g) => (
    <>
      <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z" fill={`url(#${g})`} />
      <path d="M14 2v6h6" fill="white" fillOpacity="0.25" />
      <rect x="8" y="12" width="8" height="1.5" rx=".75" fill="white" fillOpacity="0.7" />
      <rect x="8" y="16" width="5" height="1.5" rx=".75" fill="white" fillOpacity="0.7" />
    </>
  ),

  // Globe (environmental)
  "environmental-review": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} />
      <path d="M2 12h20" stroke="white" strokeWidth="1.3" strokeOpacity="0.5" fill="none" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" stroke="white" strokeWidth="1.3" strokeOpacity="0.5" fill="none" />
    </>
  ),

  // Credit card
  "mortgage-broker": (g) => (
    <>
      <rect x="1" y="4" width="22" height="16" rx="3" fill={`url(#${g})`} />
      <rect x="1" y="9" width="22" height="3" fill="white" fillOpacity="0.2" />
      <rect x="4" y="16" width="5" height="1.5" rx=".75" fill="white" fillOpacity="0.5" />
    </>
  ),

  // ── Phase 2: Entitlement & Pre-Construction ──

  // Stacked layers
  "entitlement-analyst": (g) => (
    <>
      <polygon points="12,2 2,7 12,12 22,7" fill={`url(#${g})`} opacity="0.45" />
      <polygon points="12,7 2,12 12,17 22,12" fill={`url(#${g})`} opacity="0.7" />
      <polygon points="12,12 2,17 12,22 22,17" fill={`url(#${g})`} />
    </>
  ),

  // Gear with center
  "engineering-review": (g) => (
    <>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill={`url(#${g})`} />
      <circle cx="12" cy="12" r="3" fill="white" fillOpacity="0.85" />
    </>
  ),

  // Four-square grid
  "architecture-review": (g) => (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill={`url(#${g})`} />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill={`url(#${g})`} />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill={`url(#${g})`} />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill={`url(#${g})`} />
    </>
  ),

  // Clipboard with checkmark
  "permit-tracker": (g) => (
    <>
      <path d="M6 4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6z" fill={`url(#${g})`} />
      <rect x="8" y="2" width="8" height="4" rx="1.5" fill="white" fillOpacity="0.5" />
      <path d="M9 13.5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // ── Phase 3: Construction ──

  // Briefcase
  "construction-manager": (g) => (
    <>
      <path d="M8 7V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3H8z" fill={`url(#${g})`} opacity="0.5" />
      <rect x="2" y="7" width="20" height="14" rx="3" fill={`url(#${g})`} />
      <circle cx="12" cy="14" r="2" fill="white" fillOpacity="0.7" />
    </>
  ),

  // Shopping bag
  "bid-procurement": (g) => (
    <>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" fill={`url(#${g})`} />
      <line x1="3" y1="6" x2="21" y2="6" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
      <path d="M16 10a4 4 0 0 1-8 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </>
  ),

  // Table / spreadsheet
  "construction-draws": (g) => (
    <>
      <rect x="2" y="3" width="20" height="18" rx="3" fill={`url(#${g})`} />
      <line x1="2" y1="9" x2="22" y2="9" stroke="white" strokeWidth="1.3" strokeOpacity="0.4" />
      <line x1="2" y1="15" x2="22" y2="15" stroke="white" strokeWidth="1.3" strokeOpacity="0.4" />
      <line x1="9" y1="3" x2="9" y2="21" stroke="white" strokeWidth="1.3" strokeOpacity="0.4" />
    </>
  ),

  // People group
  "labor-staffing": (g) => (
    <>
      <circle cx="9" cy="7" r="4" fill={`url(#${g})`} />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2H3z" fill={`url(#${g})`} />
      <circle cx="19" cy="8" r="3" fill={`url(#${g})`} opacity="0.5" />
      <path d="M15 21v-1a4 4 0 0 1 2-3.46A3 3 0 0 1 22 19.5V21h-7z" fill={`url(#${g})`} opacity="0.5" />
    </>
  ),

  // ── Phase 4: Stabilization & Operations ──

  // House with door
  "property-management": (g) => (
    <>
      <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" fill={`url(#${g})`} />
      <rect x="9" y="14" width="6" height="8" rx="1" fill="white" fillOpacity="0.35" />
    </>
  ),

  // Calculator
  "construction-accounting": (g) => (
    <>
      <rect x="4" y="2" width="16" height="20" rx="3" fill={`url(#${g})`} />
      <rect x="7" y="5" width="10" height="4" rx="1" fill="white" fillOpacity="0.3" />
      <circle cx="8.5" cy="13" r="1.2" fill="white" fillOpacity="0.6" />
      <circle cx="12" cy="13" r="1.2" fill="white" fillOpacity="0.6" />
      <circle cx="15.5" cy="13" r="1.2" fill="white" fillOpacity="0.6" />
      <circle cx="8.5" cy="17" r="1.2" fill="white" fillOpacity="0.6" />
      <circle cx="12" cy="17" r="1.2" fill="white" fillOpacity="0.6" />
      <circle cx="15.5" cy="17" r="1.2" fill="white" fillOpacity="0.6" />
    </>
  ),

  // Shield with checkmark
  "insurance-coi": (g) => (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={`url(#${g})`} />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // Receipt with lines
  "tax-assessment": (g) => (
    <>
      <rect x="4" y="2" width="16" height="20" rx="3" fill={`url(#${g})`} />
      <rect x="7.5" y="6" width="9" height="1.5" rx=".75" fill="white" fillOpacity="0.6" />
      <rect x="7.5" y="10" width="9" height="1.5" rx=".75" fill="white" fillOpacity="0.6" />
      <rect x="7.5" y="14" width="5" height="1.5" rx=".75" fill="white" fillOpacity="0.6" />
    </>
  ),

  // ── Phase 5: Disposition ──

  // Price tag
  "real-estate-sales": (g) => (
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" fill={`url(#${g})`} />
      <circle cx="7" cy="7" r="1.5" fill="white" fillOpacity="0.7" />
    </>
  ),

  // ── Horizontal ──

  // Clock
  "compliance-tracker": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} />
      <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),

  // Contract with seal
  "legal-contracts": (g) => (
    <>
      <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z" fill={`url(#${g})`} />
      <path d="M14 2v6h6" fill="white" fillOpacity="0.25" />
      <circle cx="12" cy="15" r="3" fill="white" fillOpacity="0.3" />
      <path d="M10.5 15l1 1 2-2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // ── Automotive ──

  // Truck
  "car-sales": (g) => (
    <>
      <rect x="1" y="5" width="15" height="11" rx="2" fill={`url(#${g})`} />
      <path d="M16 9h4l3 3v4h-7V9z" fill={`url(#${g})`} opacity="0.7" />
      <circle cx="6" cy="18" r="2.5" fill={`url(#${g})`} />
      <circle cx="6" cy="18" r="1" fill="white" />
      <circle cx="18" cy="18" r="2.5" fill={`url(#${g})`} />
      <circle cx="18" cy="18" r="1" fill="white" />
      <rect x="3" y="8" width="10" height="3" rx="1" fill="white" fillOpacity="0.25" />
    </>
  ),
};

// Suite → color for marketplace card icon backgrounds
export const SUITE_COLORS = {
  "Real Estate": "#7c3aed",
  "Construction": "#ea580c",
  "Finance & Investment": "#0891b2",
  "General Business": "#4f46e5",
  "Legal": "#be185d",
  "Automotive": "#15803d",
  "Platform": "#7c3aed",
};

// Vertical → color for workspace hub icons
export const VERTICAL_COLORS = {
  consumer: "#6366f1",
  analyst: "#0891b2",
  auto: "#15803d",
  "real-estate": "#7c3aed",
  aviation: "#0284c7",
  investor: "#0891b2",
  "property-mgmt": "#7c3aed",
  custom: "#4f46e5",
};

// Vertical → icon slug
export const VERTICAL_ICON_SLUGS = {
  consumer: "insurance-coi",
  analyst: "cre-analyst",
  auto: "car-sales",
  "real-estate": "property-management",
  aviation: "permit-tracker",
  investor: "investor-relations",
  "property-mgmt": "property-management",
  custom: "engineering-review",
};

export default function WorkerIcon({ slug, size = 24, color = "#7c3aed", className = "" }) {
  const gidRef = useRef(`wg${Math.random().toString(36).slice(2, 8)}`);
  const gid = gidRef.current;
  const iconFn = ICONS[slug];

  if (!iconFn) {
    // Fallback: generic bot icon
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={lighten(color)} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <rect x="3" y="11" width="18" height="10" rx="3" fill={`url(#${gid})`} />
        <circle cx="12" cy="5" r="4" fill={`url(#${gid})`} />
        <circle cx="8" cy="16" r="1.2" fill="white" fillOpacity="0.7" />
        <circle cx="16" cy="16" r="1.2" fill="white" fillOpacity="0.7" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={lighten(color)} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {iconFn(gid)}
    </svg>
  );
}
