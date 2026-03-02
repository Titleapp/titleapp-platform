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

  // Bank with columns — mortgage & senior debt
  "mortgage-senior-debt": (g) => (
    <>
      <path d="M12 2L2 7v1h20V7L12 2z" fill={`url(#${g})`} />
      <rect x="2" y="20" width="20" height="2" rx="0.5" fill={`url(#${g})`} />
      <rect x="4" y="9" width="2.5" height="10" rx="0.5" fill={`url(#${g})`} opacity="0.7" />
      <rect x="8.5" y="9" width="2.5" height="10" rx="0.5" fill={`url(#${g})`} opacity="0.7" />
      <rect x="13" y="9" width="2.5" height="10" rx="0.5" fill={`url(#${g})`} opacity="0.7" />
      <rect x="17.5" y="9" width="2.5" height="10" rx="0.5" fill={`url(#${g})`} opacity="0.7" />
      <path d="M12 3.5l6.5 3.5h-13L12 3.5z" fill="white" fillOpacity="0.15" />
    </>
  ),

  // Dollar in circle with arrows — tax credit & incentive
  "tax-credit-incentive": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} />
      <path d="M12 6v1.5m0 9V18" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M14.5 8.5c0-1.1-1.12-2-2.5-2s-2.5.9-2.5 2 1.12 2 2.5 2 2.5.9 2.5 2-1.12 2-2.5 2-2.5-.9-2.5-2" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M18 4l2 2m-2 0l2-2" stroke={`url(#${g})`} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M2 18l2 2m-2 0l2-2" stroke={`url(#${g})`} strokeWidth="1.5" strokeLinecap="round" fill="none" />
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

  // Stacked layers with dollar — capital stack
  "capital-stack-optimizer": (g) => (
    <>
      <rect x="3" y="16" width="18" height="4" rx="1" fill={`url(#${g})`} />
      <rect x="5" y="11" width="14" height="4" rx="1" fill={`url(#${g})`} opacity="0.8" />
      <rect x="7" y="6" width="10" height="4" rx="1" fill={`url(#${g})`} opacity="0.6" />
      <circle cx="12" cy="3" r="2" fill={`url(#${g})`} opacity="0.4" />
      <path d="M12 2v1.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M11.5 2.5h1" stroke="white" strokeWidth="0.6" strokeLinecap="round" fill="none" />
    </>
  ),

  // Bank / lending
  "construction-lending": (g) => (
    <>
      <path d="M2 20h20v2H2v-2z" fill={`url(#${g})`} />
      <path d="M12 2L2 8v2h20V8L12 2z" fill={`url(#${g})`} />
      <rect x="4" y="11" width="3" height="8" rx="0.5" fill={`url(#${g})`} opacity="0.7" />
      <rect x="10.5" y="11" width="3" height="8" rx="0.5" fill={`url(#${g})`} opacity="0.7" />
      <rect x="17" y="11" width="3" height="8" rx="0.5" fill={`url(#${g})`} opacity="0.7" />
      <circle cx="12" cy="6" r="1.5" fill="white" fillOpacity="0.7" />
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

  // Truck / supply chain
  "materials-supply-chain": (g) => (
    <>
      <rect x="1" y="8" width="14" height="10" rx="2" fill={`url(#${g})`} />
      <path d="M15 11h4l3 3v4h-7V11z" fill={`url(#${g})`} opacity="0.7" />
      <circle cx="6" cy="20" r="2" fill={`url(#${g})`} />
      <circle cx="6" cy="20" r="0.8" fill="white" />
      <circle cx="18" cy="20" r="2" fill={`url(#${g})`} />
      <circle cx="18" cy="20" r="0.8" fill="white" />
      <rect x="3" y="4" width="6" height="3" rx="1" fill={`url(#${g})`} opacity="0.4" />
      <rect x="5" y="2" width="6" height="3" rx="1" fill={`url(#${g})`} opacity="0.3" />
    </>
  ),

  // Building with dollar — mezz/pref equity
  "mezzanine-preferred-equity": (g) => (
    <>
      <rect x="3" y="18" width="18" height="3" rx="1" fill={`url(#${g})`} />
      <rect x="5" y="13" width="14" height="5" rx="1" fill={`url(#${g})`} opacity="0.75" />
      <rect x="7" y="8" width="10" height="5" rx="1" fill={`url(#${g})`} opacity="0.55" />
      <rect x="9" y="3" width="6" height="5" rx="1" fill={`url(#${g})`} opacity="0.35" />
      <path d="M12 15v-1m0 4v-1" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M13.5 14c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </>
  ),

  // Crowd / raised hands — crowdfunding
  "crowdfunding-regd": (g) => (
    <>
      <circle cx="7" cy="6" r="3" fill={`url(#${g})`} />
      <circle cx="17" cy="6" r="3" fill={`url(#${g})`} />
      <circle cx="12" cy="4" r="3" fill={`url(#${g})`} opacity="0.7" />
      <path d="M1 22v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2H1z" fill={`url(#${g})`} opacity="0.6" />
      <path d="M12 22v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2h-11z" fill={`url(#${g})`} opacity="0.6" />
      <path d="M6 22v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3H6z" fill={`url(#${g})`} />
    </>
  ),

  // Magnifying glass on map — site due diligence
  "site-due-diligence": (g) => (
    <>
      <rect x="3" y="3" width="18" height="14" rx="2" fill={`url(#${g})`} opacity="0.3" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={`url(#${g})`} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="12" y1="3" x2="12" y2="17" stroke={`url(#${g})`} strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="13" cy="11" r="5" fill={`url(#${g})`} opacity="0.6" />
      <circle cx="13" cy="11" r="5" stroke={`url(#${g})`} strokeWidth="2" fill="none" />
      <line x1="16.5" y1="14.5" x2="21" y2="19" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),

  // Gavel — land use & entitlement
  "land-use-entitlement": (g) => (
    <>
      <rect x="2" y="20" width="20" height="2" rx="1" fill={`url(#${g})`} />
      <rect x="9" y="16" width="6" height="4" rx="1" fill={`url(#${g})`} opacity="0.6" />
      <rect x="4" y="4" width="7" height="4" rx="1.5" fill={`url(#${g})`} transform="rotate(-45 7.5 6)" />
      <line x1="10" y1="10" x2="14" y2="14" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="8" cy="6" r="1" fill="white" fillOpacity="0.5" />
    </>
  ),

  // Document stack with stamp — permit submission
  "permit-submission": (g) => (
    <>
      <path d="M7 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6H7z" fill={`url(#${g})`} />
      <path d="M14 2v6h5" fill="white" fillOpacity="0.25" />
      <rect x="9" y="12" width="6" height="1.5" rx=".75" fill="white" fillOpacity="0.6" />
      <rect x="9" y="15" width="4" height="1.5" rx=".75" fill="white" fillOpacity="0.6" />
      <circle cx="6" cy="18" r="3" fill={`url(#${g})`} stroke="white" strokeWidth="1" strokeOpacity="0.5" />
      <path d="M5 18l0.8 0.8 1.5-1.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // Megaphone — lease-up & marketing
  "lease-up-marketing": (g) => (
    <>
      <path d="M21 5v14l-8-3V8l8-3z" fill={`url(#${g})`} />
      <rect x="3" y="9" width="10" height="6" rx="2" fill={`url(#${g})`} opacity="0.7" />
      <path d="M6 15v4a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-4" fill={`url(#${g})`} opacity="0.4" />
    </>
  ),

  // Ledger / book — accounting
  "accounting": (g) => (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" fill={`url(#${g})`} />
      <rect x="4" y="2" width="4" height="20" fill={`url(#${g})`} opacity="0.3" />
      <rect x="10" y="6" width="7" height="1.2" rx=".6" fill="white" fillOpacity="0.6" />
      <rect x="10" y="9" width="5" height="1.2" rx=".6" fill="white" fillOpacity="0.6" />
      <rect x="10" y="12" width="7" height="1.2" rx=".6" fill="white" fillOpacity="0.6" />
      <rect x="10" y="15" width="4" height="1.2" rx=".6" fill="white" fillOpacity="0.6" />
      <rect x="10" y="18" width="6" height="1.2" rx=".6" fill="white" fillOpacity="0.6" />
    </>
  ),

  // ── New Workers ──

  // Magnifying glass on chart — market research
  "market-research": (g) => (
    <>
      <rect x="3" y="14" width="4" height="8" rx="1" fill={`url(#${g})`} opacity="0.5" />
      <rect x="9" y="10" width="4" height="12" rx="1" fill={`url(#${g})`} opacity="0.7" />
      <rect x="15" y="5" width="4" height="17" rx="1" fill={`url(#${g})`} />
      <circle cx="10" cy="7" r="4" stroke={`url(#${g})`} strokeWidth="2" fill="none" />
      <line x1="13" y1="10" x2="16" y2="13" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
    </>
  ),

  // Tree/leaf — environmental & cultural review
  "environmental-cultural-review": (g) => (
    <>
      <path d="M12 22V12" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 2C8 2 4 6 4 10c0 4 3.5 7 8 7s8-3 8-7c0-4-4-8-8-8z" fill={`url(#${g})`} />
      <path d="M8 8c2-1 4 0 4 3" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </>
  ),

  // Lightning bolt in circle — energy & sustainability
  "energy-sustainability": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} />
      <path d="M13 2.05v0M13 6l-4 6h4l-2 6 6-8h-4l2-4z" fill="white" fillOpacity="0.85" />
    </>
  ),

  // Accessibility symbol
  "accessibility-fair-housing": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} />
      <circle cx="12" cy="7" r="2" fill="white" fillOpacity="0.8" />
      <path d="M10 11h4v3l2 4h-2l-1.5-3H10V11z" fill="white" fillOpacity="0.8" />
      <path d="M9 18a4 4 0 0 0 5-1" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  ),

  // Capitol building — government relations
  "government-relations": (g) => (
    <>
      <path d="M12 2L2 8h20L12 2z" fill={`url(#${g})`} />
      <rect x="2" y="8" width="20" height="2" fill={`url(#${g})`} opacity="0.7" />
      <rect x="4" y="11" width="2.5" height="7" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <rect x="8.5" y="11" width="2.5" height="7" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <rect x="13" y="11" width="2.5" height="7" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <rect x="17.5" y="11" width="2.5" height="7" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <rect x="2" y="18" width="20" height="3" rx="1" fill={`url(#${g})`} />
    </>
  ),

  // Flame — fire & life safety
  "fire-life-safety": (g) => (
    <>
      <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 4-7l1 3c1-2 3-5 3-8 3 3 6 6 6 12 0 4-3 7-7 7z" fill={`url(#${g})`} />
      <path d="M12 22c-2 0-3.5-1.5-3.5-3.5 0-1.5 1-2.5 2-3.5l0.5 1.5c0.5-1 1.5-2.5 1.5-4 1.5 1.5 3 3 3 6 0 2-1.5 3.5-3.5 3.5z" fill="white" fillOpacity="0.3" />
    </>
  ),

  // Star in map pin — opportunity zone
  "opportunity-zone": (g) => (
    <>
      <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" fill={`url(#${g})`} />
      <path d="M12 6l1.2 2.5 2.8.4-2 2 .5 2.8L12 12.5l-2.5 1.2.5-2.8-2-2 2.8-.4L12 6z" fill="white" fillOpacity="0.85" />
    </>
  ),

  // House with checkmark — appraisal & valuation
  "appraisal-valuation": (g) => (
    <>
      <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" fill={`url(#${g})`} />
      <path d="M9 14l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // Person with magnifying glass — tenant screening
  "tenant-screening": (g) => (
    <>
      <circle cx="10" cy="7" r="4" fill={`url(#${g})`} />
      <path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2H4z" fill={`url(#${g})`} />
      <circle cx="18" cy="13" r="3" stroke={`url(#${g})`} strokeWidth="2" fill="none" />
      <line x1="20" y1="15.5" x2="22" y2="17.5" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
    </>
  ),

  // Stacked bills — rent roll & revenue
  "rent-roll-revenue": (g) => (
    <>
      <rect x="3" y="4" width="18" height="5" rx="2" fill={`url(#${g})`} opacity="0.5" />
      <rect x="3" y="10" width="18" height="5" rx="2" fill={`url(#${g})`} opacity="0.75" />
      <rect x="3" y="16" width="18" height="5" rx="2" fill={`url(#${g})`} />
      <path d="M12 17v1m0-8v1m0-8v1" stroke="white" strokeWidth="1" strokeLinecap="round" />
    </>
  ),

  // Wrench — maintenance & work order
  "maintenance-work-order": (g) => (
    <>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill={`url(#${g})`} />
    </>
  ),

  // Lightbulb — utility management
  "utility-management": (g) => (
    <>
      <path d="M9 21h6m-5-3h4a1 1 0 0 0 1-1v-1a7 7 0 1 0-6 0v1a1 1 0 0 0 1 1z" fill={`url(#${g})`} />
      <path d="M10 17v-1.5a5 5 0 1 1 4 0V17" stroke="white" strokeWidth="0.8" fill="none" />
    </>
  ),

  // House with people — HOA & association
  "hoa-association": (g) => (
    <>
      <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" fill={`url(#${g})`} />
      <circle cx="9.5" cy="13" r="1.5" fill="white" fillOpacity="0.7" />
      <circle cx="14.5" cy="13" r="1.5" fill="white" fillOpacity="0.7" />
      <path d="M7 19v-1a2.5 2.5 0 0 1 5 0v1m0 0v-1a2.5 2.5 0 0 1 5 0v1" stroke="white" strokeWidth="0.8" fill="none" />
    </>
  ),

  // Shield with exclamation — warranty & defect
  "warranty-defect": (g) => (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={`url(#${g})`} />
      <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="white" />
    </>
  ),

  // Handshake — vendor & contract
  "vendor-contract": (g) => (
    <>
      <path d="M2 11l4-4 4 2 4-2 4 2 4-4" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M4 16l3-3 2 1.5L12 12l3 2.5 2-1.5 3 3" fill={`url(#${g})`} opacity="0.5" />
      <rect x="2" y="16" width="20" height="4" rx="2" fill={`url(#${g})`} />
    </>
  ),

  // Clipboard with arrow — disposition preparation
  "disposition-preparation": (g) => (
    <>
      <path d="M6 4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6z" fill={`url(#${g})`} />
      <rect x="8" y="2" width="8" height="4" rx="1.5" fill="white" fillOpacity="0.5" />
      <path d="M12 10v6m0 0l-2.5-2.5m2.5 2.5l2.5-2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // Circular arrows — 1031 exchange
  "exchange-1031": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} />
      <path d="M16 8l2-2-2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M6 12a6 6 0 0 1 12-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M8 16l-2 2 2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M18 12a6 6 0 0 1-12 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  ),

  // Building blocks — entity & formation
  "entity-formation": (g) => (
    <>
      <rect x="3" y="14" width="8" height="8" rx="2" fill={`url(#${g})`} />
      <rect x="13" y="14" width="8" height="8" rx="2" fill={`url(#${g})`} opacity="0.7" />
      <rect x="8" y="4" width="8" height="8" rx="2" fill={`url(#${g})`} opacity="0.85" />
      <line x1="12" y1="12" x2="7" y2="14" stroke={`url(#${g})`} strokeWidth="1" strokeOpacity="0.5" />
      <line x1="12" y1="12" x2="17" y2="14" stroke={`url(#${g})`} strokeWidth="1" strokeOpacity="0.5" />
    </>
  ),

  // Umbrella — property insurance & risk
  "property-insurance": (g) => (
    <>
      <path d="M12 2v20" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12" fill={`url(#${g})`} />
      <path d="M9 22a3 3 0 0 0 3-3" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),

  // Megaphone with data room — disposition marketing
  "disposition-marketing": (g) => (
    <>
      <path d="M21 5v14l-8-3V8l8-3z" fill={`url(#${g})`} />
      <rect x="3" y="9" width="10" height="6" rx="2" fill={`url(#${g})`} opacity="0.7" />
      <rect x="5" y="11" width="6" height="0.8" rx=".4" fill="white" fillOpacity="0.5" />
      <rect x="5" y="13" width="4" height="0.8" rx=".4" fill="white" fillOpacity="0.5" />
      <path d="M6 15v4a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-4" fill={`url(#${g})`} opacity="0.4" />
    </>
  ),

  // Pie chart — investor reporting
  "investor-reporting": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} opacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10H12V2z" fill={`url(#${g})`} />
      <path d="M12 12L5 19.07" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12l7-7" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
    </>
  ),

  // Bank with lock — debt service
  "debt-service": (g) => (
    <>
      <rect x="2" y="18" width="20" height="3" rx="1" fill={`url(#${g})`} />
      <path d="M12 2L2 8v2h20V8L12 2z" fill={`url(#${g})`} />
      <rect x="5" y="11" width="3" height="6" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <rect x="16" y="11" width="3" height="6" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <rect x="9" y="11" width="6" height="6" rx="1" fill={`url(#${g})`} opacity="0.8" />
      <circle cx="12" cy="14" r="1.2" fill="white" fillOpacity="0.7" />
      <line x1="12" y1="14" x2="12" y2="15.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
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

  // ── Automotive — Phase 0: Dealership Setup ──

  // Shield with license badge — Dealer Licensing
  "ad-dealer-licensing": (g) => (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={`url(#${g})`} />
      <rect x="8" y="8" width="8" height="6" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="10" y="10" width="4" height="1" rx="0.5" fill={`url(#${g})`} />
      <rect x="10" y="12" width="3" height="1" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <circle cx="17" cy="7" r="3" fill={`url(#${g})`} stroke="white" strokeWidth="1.5" />
      <path d="M16 7l1 1 2-2" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // Building with gear — Facility Operations
  "ad-facility-operations": (g) => (
    <>
      <rect x="3" y="6" width="12" height="16" rx="2" fill={`url(#${g})`} />
      <rect x="6" y="9" width="2.5" height="3" rx="0.5" fill="white" fillOpacity="0.5" />
      <rect x="10" y="9" width="2.5" height="3" rx="0.5" fill="white" fillOpacity="0.5" />
      <rect x="6" y="14" width="2.5" height="3" rx="0.5" fill="white" fillOpacity="0.5" />
      <rect x="10" y="14" width="2.5" height="3" rx="0.5" fill="white" fillOpacity="0.5" />
      <circle cx="18" cy="8" r="4.5" fill={`url(#${g})`} stroke="white" strokeWidth="1.5" />
      <circle cx="18" cy="8" r="1.5" fill="white" fillOpacity="0.6" />
      <path d="M18 3.5v1m0 6v1m-4.5-4.5h1m6 0h1m-3.2-3.2l.7.7m-4.9 4.9l.7.7m4.9.7l-.7-.7m-4.9-4.9l-.7-.7" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </>
  ),

  // ── Automotive — Phase 1: Inventory Acquisition ──

  // Clipboard with truck — New Car Allocation
  "ad-new-car-allocation": (g) => (
    <>
      <rect x="3" y="1" width="14" height="18" rx="2.5" fill={`url(#${g})`} />
      <rect x="6" y="5" width="8" height="1.5" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="6" y="8" width="6" height="1.5" rx="0.5" fill="white" fillOpacity="0.4" />
      <rect x="6" y="11" width="7" height="1.5" rx="0.5" fill="white" fillOpacity="0.4" />
      <path d="M15 15h5l3 2.5v3h-8V15z" fill={`url(#${g})`} stroke="white" strokeWidth="1" />
      <circle cx="17" cy="21" r="1.5" fill="white" fillOpacity="0.7" />
      <circle cx="21.5" cy="21" r="1.5" fill="white" fillOpacity="0.7" />
    </>
  ),

  // Magnifying glass with car — Used Car Acquisition
  "ad-used-car-acquisition": (g) => (
    <>
      <circle cx="10" cy="10" r="8" fill={`url(#${g})`} />
      <line x1="16" y1="16" x2="22" y2="22" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" />
      <rect x="5" y="9" width="7" height="4" rx="1" fill="white" fillOpacity="0.6" />
      <circle cx="7" cy="13.5" r="1.2" fill="white" fillOpacity="0.5" />
      <circle cx="10.5" cy="13.5" r="1.2" fill="white" fillOpacity="0.5" />
      <path d="M7 9V7.5a1 1 0 011-1h3a1 1 0 011 1V9" fill="white" fillOpacity="0.3" />
    </>
  ),

  // Gavel with arrow down — Wholesale Disposition
  "ad-wholesale-disposition": (g) => (
    <>
      <rect x="3" y="18" width="18" height="3" rx="1" fill={`url(#${g})`} />
      <rect x="9" y="4" width="3" height="12" rx="1" fill={`url(#${g})`} opacity="0.8" />
      <rect x="5" y="3" width="11" height="4" rx="1.5" fill={`url(#${g})`} />
      <path d="M19 8l-3 3m3-3v3m0-3h-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="6" y="4.5" width="9" height="1.5" rx="0.5" fill="white" fillOpacity="0.4" />
    </>
  ),

  // ── Automotive — Phase 2: Merchandising & Pricing ──

  // Tag with chart — Used Car Pricing
  "ad-used-car-pricing": (g) => (
    <>
      <rect x="2" y="4" width="16" height="16" rx="3" fill={`url(#${g})`} />
      <path d="M5 16l3-4 3 2 4-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="19" cy="6" r="3.5" fill={`url(#${g})`} stroke="white" strokeWidth="1.5" />
      <path d="M19 4.5v1.5h1.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <rect x="4" y="5" width="5" height="1" rx="0.5" fill="white" fillOpacity="0.4" />
    </>
  ),

  // Camera with car — Vehicle Merchandising
  "ad-vehicle-merchandising": (g) => (
    <>
      <rect x="2" y="6" width="20" height="14" rx="3" fill={`url(#${g})`} />
      <circle cx="12" cy="13" r="4" fill="white" fillOpacity="0.3" />
      <circle cx="12" cy="13" r="2.5" fill="white" fillOpacity="0.5" />
      <rect x="8" y="3" width="8" height="4" rx="1.5" fill={`url(#${g})`} />
      <circle cx="18" cy="9" r="1" fill="white" fillOpacity="0.5" />
    </>
  ),

  // Wrench with clock — Reconditioning
  "ad-reconditioning": (g) => (
    <>
      <path d="M5 3l-3 3a1 1 0 000 1.4l9.6 9.6a1 1 0 001.4 0l3-3a1 1 0 000-1.4L6.4 3A1 1 0 005 3z" fill={`url(#${g})`} />
      <rect x="3" y="18" width="8" height="3" rx="1" fill={`url(#${g})`} opacity="0.6" />
      <circle cx="18" cy="8" r="5" fill={`url(#${g})`} stroke="white" strokeWidth="1.5" />
      <path d="M18 5.5v2.5l1.5 1.5" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" />
    </>
  ),

  // ── Automotive — Phase 3: Sales & Desking ──

  // Funnel with people — Lead Management
  "ad-lead-management": (g) => (
    <>
      <path d="M2 3h20l-6 8v6l-4 4V11L2 3z" fill={`url(#${g})`} />
      <circle cx="7" cy="6" r="1" fill="white" fillOpacity="0.6" />
      <circle cx="12" cy="5" r="1" fill="white" fillOpacity="0.6" />
      <circle cx="17" cy="6" r="1" fill="white" fillOpacity="0.6" />
      <path d="M8 14l4 0" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M9 16l2 0" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" />
    </>
  ),

  // Calculator with handshake — Desking
  "ad-desking": (g) => (
    <>
      <rect x="2" y="2" width="14" height="18" rx="2.5" fill={`url(#${g})`} />
      <rect x="4" y="4" width="10" height="4" rx="1" fill="white" fillOpacity="0.5" />
      <rect x="4" y="10" width="3" height="2" rx="0.5" fill="white" fillOpacity="0.3" />
      <rect x="8.5" y="10" width="3" height="2" rx="0.5" fill="white" fillOpacity="0.3" />
      <rect x="4" y="14" width="3" height="2" rx="0.5" fill="white" fillOpacity="0.3" />
      <rect x="8.5" y="14" width="3" height="2" rx="0.5" fill="white" fillOpacity="0.3" />
      <circle cx="19" cy="16" r="4.5" fill={`url(#${g})`} stroke="white" strokeWidth="1.5" />
      <path d="M16.5 16h2l1.5-1.5m0 3l-1.5-1.5h-2" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </>
  ),

  // Speedometer with inventory — Inventory Turn
  "ad-inventory-turn": (g) => (
    <>
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" fill={`url(#${g})`} />
      <path d="M12 12l4-6" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="12" r="2" fill="white" fillOpacity="0.6" />
      <path d="M6 18h12" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
      <circle cx="5" cy="12" r="0.8" fill="white" fillOpacity="0.5" />
      <circle cx="12" cy="5" r="0.8" fill="white" fillOpacity="0.5" />
      <circle cx="19" cy="12" r="0.8" fill="white" fillOpacity="0.5" />
    </>
  ),

  // ── Automotive — Phase 4: F&I ──

  // Menu/clipboard with dollar — F&I Menu
  "ad-fi-menu": (g) => (
    <>
      <rect x="4" y="2" width="16" height="20" rx="3" fill={`url(#${g})`} />
      <rect x="7" y="6" width="10" height="2" rx="1" fill="white" fillOpacity="0.6" />
      <rect x="7" y="10" width="10" height="2" rx="1" fill="white" fillOpacity="0.4" />
      <rect x="7" y="14" width="10" height="2" rx="1" fill="white" fillOpacity="0.4" />
      <circle cx="18" cy="18" r="4" fill={`url(#${g})`} stroke="white" strokeWidth="1.5" />
      <path d="M18 16v0.8m0 2.4v0.8" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M19 16.8c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1 .45 1 1-.45 1-1 1-1-.45-1-1" stroke="white" strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </>
  ),

  // Shield with gavel — F&I Compliance
  "ad-fi-compliance": (g) => (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={`url(#${g})`} />
      <rect x="9" y="9" width="6" height="2" rx="1" fill="white" fillOpacity="0.7" />
      <rect x="11" y="11" width="2" height="5" rx="0.5" fill="white" fillOpacity="0.7" />
      <rect x="8" y="15" width="8" height="2" rx="1" fill="white" fillOpacity="0.5" />
    </>
  ),

  // Handshake with bank — Lender Relations
  "ad-lender-relations": (g) => (
    <>
      <path d="M12 2L4 6v2h16V6l-8-4z" fill={`url(#${g})`} opacity="0.5" />
      <rect x="4" y="8" width="16" height="2" fill={`url(#${g})`} opacity="0.3" />
      <path d="M4 12c2-1 4 0 6 1s4 2 6 1c2-1 4-1 4 0v5c0 1-2 2-4 1s-4-2-6-1-4-1-6 0v-5c0-1 0-1 0-1z" fill={`url(#${g})`} />
      <path d="M10 15l2-1 2 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </>
  ),

  // Box with return arrow — Aftermarket Admin
  "ad-aftermarket-admin": (g) => (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" fill={`url(#${g})`} />
      <path d="M8 2h8v4H8V2z" fill={`url(#${g})`} opacity="0.5" />
      <path d="M9 13h6m0 0l-2-2m2 2l-2 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // ── Automotive — Phase 5: Service & Parts ──

  // Calendar with wrench — Service Scheduling
  "ad-service-scheduling": (g) => (
    <>
      <rect x="3" y="4" width="18" height="18" rx="3" fill={`url(#${g})`} />
      <rect x="3" y="4" width="18" height="5" rx="3" fill={`url(#${g})`} opacity="0.7" />
      <rect x="7" y="2" width="2" height="4" rx="1" fill={`url(#${g})`} />
      <rect x="15" y="2" width="2" height="4" rx="1" fill={`url(#${g})`} />
      <path d="M10 16l-2 2 2 2m4-4l2 2-2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // Magnifying glass with checkmarks — Service Upsell & MPI
  "ad-service-upsell": (g) => (
    <>
      <circle cx="11" cy="11" r="7" fill={`url(#${g})`} />
      <line x1="16" y1="16" x2="22" y2="22" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" />
      <path d="M8 10l2 2 3-3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="8" y="13" width="6" height="1" rx="0.5" fill="white" fillOpacity="0.5" />
    </>
  ),

  // Shelf/grid — Parts Inventory
  "ad-parts-inventory": (g) => (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2" fill={`url(#${g})`} opacity="0.3" />
      <line x1="2" y1="9" x2="22" y2="9" stroke={`url(#${g})`} strokeWidth="1.5" />
      <line x1="2" y1="16" x2="22" y2="16" stroke={`url(#${g})`} strokeWidth="1.5" />
      <line x1="12" y1="2" x2="12" y2="22" stroke={`url(#${g})`} strokeWidth="1.5" />
      <rect x="4" y="4" width="5" height="3" rx="1" fill={`url(#${g})`} />
      <rect x="15" y="11" width="5" height="3" rx="1" fill={`url(#${g})`} />
      <rect x="4" y="18" width="5" height="2" rx="1" fill={`url(#${g})`} opacity="0.7" />
    </>
  ),

  // Shield with wrench — Warranty Admin
  "ad-warranty-admin": (g) => (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={`url(#${g})`} />
      <path d="M10.5 9.5l-1.5 1.5 3 3 5-5-1.5-1.5-3.5 3.5-1.5-1.5z" fill="white" fillOpacity="0.8" />
    </>
  ),

  // Car with paint — Body Shop
  "ad-body-shop": (g) => (
    <>
      <path d="M5 11l2-4h10l2 4" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="3" y="11" width="18" height="7" rx="2" fill={`url(#${g})`} />
      <circle cx="7" cy="20" r="2" fill={`url(#${g})`} />
      <circle cx="7" cy="20" r="0.8" fill="white" />
      <circle cx="17" cy="20" r="2" fill={`url(#${g})`} />
      <circle cx="17" cy="20" r="0.8" fill="white" />
      <path d="M19 8l2-3" stroke={`url(#${g})`} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="21.5" cy="4" r="1.5" fill={`url(#${g})`} opacity="0.5" />
    </>
  ),

  // ── Automotive — Phase 6: Retention & Marketing ──

  // Heart with refresh — Customer Retention
  "ad-customer-retention": (g) => (
    <>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={`url(#${g})`} />
      <path d="M10 10a2.5 2.5 0 0 1 4 0" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M14 10l0.5-1m-0.5 1l1 0.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </>
  ),

  // Star with speech bubble — Reputation
  "ad-reputation": (g) => (
    <>
      <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4v-4a2 2 0 0 1-1-1.73V5z" fill={`url(#${g})`} />
      <path d="M12 6l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 9.5l3.5-.5L12 6z" fill="white" fillOpacity="0.8" />
    </>
  ),

  // Target with chart — Digital Marketing
  "ad-digital-marketing": (g) => (
    <>
      <circle cx="12" cy="12" r="10" fill={`url(#${g})`} opacity="0.3" />
      <circle cx="12" cy="12" r="6" fill={`url(#${g})`} opacity="0.6" />
      <circle cx="12" cy="12" r="2.5" fill={`url(#${g})`} />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" stroke={`url(#${g})`} strokeWidth="1" strokeLinecap="round" />
    </>
  ),

  // ── Automotive — Phase 7: Compliance & Back Office ──

  // Document with car — Title & Registration
  "ad-title-registration": (g) => (
    <>
      <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z" fill={`url(#${g})`} />
      <path d="M14 2v6h6" fill="white" fillOpacity="0.25" />
      <rect x="8" y="13" width="8" height="4" rx="1" fill="white" fillOpacity="0.4" />
      <circle cx="10" cy="18" r="1" fill="white" fillOpacity="0.5" />
      <circle cx="14" cy="18" r="1" fill="white" fillOpacity="0.5" />
    </>
  ),

  // Calculator with checkmark — Deal Accounting
  "ad-deal-accounting": (g) => (
    <>
      <rect x="4" y="2" width="16" height="20" rx="3" fill={`url(#${g})`} />
      <rect x="7" y="5" width="10" height="4" rx="1" fill="white" fillOpacity="0.3" />
      <circle cx="8.5" cy="13" r="1.2" fill="white" fillOpacity="0.6" />
      <circle cx="12" cy="13" r="1.2" fill="white" fillOpacity="0.6" />
      <circle cx="15.5" cy="13" r="1.2" fill="white" fillOpacity="0.6" />
      <path d="M10 17l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // Clipboard with shield — Regulatory Compliance
  "ad-regulatory-compliance": (g) => (
    <>
      <path d="M6 4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6z" fill={`url(#${g})`} />
      <rect x="8" y="2" width="8" height="4" rx="1.5" fill="white" fillOpacity="0.5" />
      <path d="M12 19s5-2.5 5-6.25V9.5l-5-1.875-5 1.875v3.25C7 16.5 12 19 12 19z" fill="white" fillOpacity="0.4" />
      <path d="M10 13l1.5 1.5 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  // People with paycheck — HR & Payroll
  "ad-hr-payroll": (g) => (
    <>
      <circle cx="9" cy="7" r="4" fill={`url(#${g})`} />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2H3z" fill={`url(#${g})`} />
      <rect x="16" y="8" width="6" height="8" rx="1" fill={`url(#${g})`} opacity="0.7" />
      <rect x="17.5" y="10" width="3" height="1" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="17.5" y="12" width="3" height="1" rx="0.5" fill="white" fillOpacity="0.6" />
    </>
  ),

  // Bank with coins — Floor Plan & Cash
  "ad-floor-plan": (g) => (
    <>
      <rect x="2" y="18" width="20" height="3" rx="1" fill={`url(#${g})`} />
      <path d="M12 3L3 8v2h18V8l-9-5z" fill={`url(#${g})`} />
      <rect x="5" y="11" width="2.5" height="6" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <rect x="10.75" y="11" width="2.5" height="6" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <rect x="16.5" y="11" width="2.5" height="6" rx="0.5" fill={`url(#${g})`} opacity="0.6" />
      <circle cx="12" cy="6.5" r="1.5" fill="white" fillOpacity="0.5" />
    </>
  ),

  // Monitor with gears — DMS & Technology
  "ad-dms-technology": (g) => (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" fill={`url(#${g})`} />
      <rect x="8" y="17" width="8" height="2" fill={`url(#${g})`} opacity="0.5" />
      <rect x="6" y="19" width="12" height="2" rx="1" fill={`url(#${g})`} opacity="0.7" />
      <circle cx="9" cy="10" r="2.5" stroke="white" strokeWidth="1" fill="none" />
      <circle cx="9" cy="10" r="0.8" fill="white" fillOpacity="0.7" />
      <circle cx="15" cy="10" r="2.5" stroke="white" strokeWidth="1" fill="none" />
      <circle cx="15" cy="10" r="0.8" fill="white" fillOpacity="0.7" />
      <line x1="11.5" y1="10" x2="12.5" y2="10" stroke="white" strokeWidth="1" strokeLinecap="round" />
    </>
  ),

  // ── Automotive (legacy) ──

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
