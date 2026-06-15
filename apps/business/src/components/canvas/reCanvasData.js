// S52.44 — Real-Estate worker canvas data (dummy/sample data that DEMONSTRATES
// each tab's canvas function). Ported from each worker's
// creators/sean-combs/<slug>/sample-data.js. Rendered by RealEstateWorkerCanvas,
// which shows a persistent CAS instrument panel + an internal tab bar + per-tab
// "blocks". Keyed by digitalWorkers slug.
//
// Block types the renderer understands:
//   heroes  — verdict triad (CAS-coded cards)
//   kpis    — 2x2/row metric cards
//   flags   — CAS flag stack (sorted RED→YELLOW→BLUE→WHITE→GREEN)
//   chain   — vertical chain-of-title timeline
//   strata  — rights-stack rows (earth-tone band + CAS status badge)
//   cards   — labeled CAS-coded cards (citations, easements, uses, overlays…)
//   table   — header + rows
//   bars    — labeled horizontal bars (lien stack, demand sub-scores, distributions)
//   prose   — CAS-coded plain-English sections

import { CRE_DISTRESSED } from "./creAnalystData";
import { buildLearningCanvas } from "./learningCanvasData";

export const CAS = {
  RED:    { key: "RED",    dot: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  YELLOW: { key: "YELLOW", dot: "#d97706", bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
  BLUE:   { key: "BLUE",   dot: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  WHITE:  { key: "WHITE",  dot: "#64748b", bg: "#f8fafc", border: "#e2e8f0", text: "#475569" },
  GREEN:  { key: "GREEN",  dot: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
};
export const CAS_ORDER = ["RED", "YELLOW", "BLUE", "WHITE", "GREEN"];
// Rights-stack band tones (earth-tone by elevation; CAS lives on the status badge).
export const STRATUM_BAND = { above: "#eff6ff", surface: "#f0fdf4", below: "#f5f0e8" };

export const RE_CANVAS = {
  // ───────────────────────── TITLE ABSTRACT ─────────────────────────
  "title-abstract-001": {
    title: "Title Abstract — 9708 US Highway 191, Pinedale WY",
    subtitle: "Tier-R · APN 01-00-10382 · Anchored · PLAT-008",
    disclaimer: "General information — not certified for closing",
    cas: { RED: 0, YELLOW: 2, BLUE: 1, WHITE: 3, GREEN: 5 },
    tabs: [
      { id: "ownership-chain", label: "Ownership chain", blocks: [
        { type: "map", address: "9708 US Highway 191, Pinedale, WY 82941", mapType: "satellite" },
        { type: "streetview", address: "9708 US Highway 191, Pinedale, WY 82941", label: "9708 US Highway 191, Pinedale WY" },
        { type: "heroes", items: [
          { band: "GREEN", title: "Title chain — clean", detail: "5 transfers verified · marketable" },
          { band: "YELLOW", title: "Two open easements", detail: "Utility 1987 · Road access 2003" },
          { band: "YELLOW", title: "Mineral rights severed", detail: "1978 federal patent · surface only" },
        ] },
        { type: "kpis", items: [
          { label: "Marketable status", value: "Yes", band: "GREEN" },
          { label: "Open encumbrances", value: "2", band: "YELLOW" },
          { label: "Last sale price", value: "$1.45M", band: "WHITE" },
          { label: "Lien total", value: "$0", band: "GREEN" },
        ] },
        { type: "chain", title: "Chain of title — newest first", items: [
          { band: "GREEN", parties: "Rosenberg Family Trust ← Hartwell LLC", meta: "Warranty deed · Aug 14 2019 · $1,450,000 · Rec. 2019-08142", tag: "Current" },
          { band: "GREEN", parties: "Hartwell LLC ← Wyoming Ranch Holdings", meta: "Warranty deed · Mar 2 2011 · $920,000 · Rec. 2011-03048" },
          { band: "YELLOW", parties: "Wyoming Ranch Holdings ← Patterson Estate", meta: "Executor's deed · Jan 15 2003 · $0 · Rec. 2003-01152", tag: "Verify probate" },
          { band: "GREEN", parties: "Patterson Family Trust ← First WY Land Co.", meta: "Grant deed · Sep 3 1994 · $340,000 · Rec. 1994-09031" },
          { band: "YELLOW", parties: "First WY Land Co. ← Federal patent", meta: "Patent deed · 1978 · SURFACE RIGHTS ONLY — minerals severed · Rec. 1978-00441", tag: "Minerals severed" },
        ] },
      ] },
      { id: "encumbrances", label: "Encumbrances", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Lien stack", detail: "Clear — $0 total" },
          { band: "YELLOW", title: "Open easements", detail: "2 — review before close" },
          { band: "GREEN", title: "Deed restrictions", detail: "None detected" },
        ] },
        { type: "bars", title: "Lien stack — current balance", items: [
          { label: "Mortgage / deed of trust", value: "$0", pct: 0, band: "GREEN" },
          { label: "Mechanic's liens", value: "$0", pct: 0, band: "GREEN" },
          { label: "Property tax liens", value: "$0", pct: 0, band: "GREEN" },
          { label: "HOA / condo assessments", value: "$0", pct: 0, band: "GREEN" },
          { label: "Judgment liens", value: "$0", pct: 0, band: "GREEN" },
          { label: "IRS / federal tax liens", value: "$0", pct: 0, band: "GREEN" },
        ], note: "Lien stack entirely clear — total exposure $0" },
        { type: "cards", items: [
          { band: "YELLOW", label: "Review", title: "Easement #1 — Utility access", detail: "Recorded Nov 3 1987 · Book 312 Pg 88 · runs with land · may restrict SW-corner building envelope", action: "Pull recorded doc" },
          { band: "YELLOW", label: "Review", title: "Easement #2 — Road access", detail: "Recorded Jan 15 2003 · Book 601 Pg 44 · ingress/egress to APN 01-00-10381 · confirm scope + width", action: "Pull recorded doc" },
        ] },
      ] },
      { id: "recorded-docs", label: "Recorded docs", blocks: [
        { type: "table", title: "Recorded document archive — 7 instruments · Sublette County Clerk",
          columns: ["Instrument", "Grantor → Grantee", "Recording", "Date", "Status"],
          rows: [
            { band: "GREEN", cells: ["Warranty deed", "Hartwell LLC → Rosenberg Family Trust", "2019-08142", "2019-08-14", "Verified"] },
            { band: "GREEN", cells: ["Warranty deed", "Wyoming Ranch Holdings → Hartwell LLC", "2011-03048", "2011-03-02", "Verified"] },
            { band: "YELLOW", cells: ["Executor's deed", "Patterson Estate → Wyoming Ranch Holdings", "2003-01152", "2003-01-15", "Verify probate"] },
            { band: "GREEN", cells: ["Grant deed", "First WY Land Co. → Patterson Family Trust", "1994-09031", "1994-09-03", "Verified"] },
            { band: "YELLOW", cells: ["Utility easement", "[Utility Co.] — Bk 312 Pg 88", "1987-11031", "1987-11-03", "Review impact"] },
            { band: "YELLOW", cells: ["Road access easement", "[Adjacent owner] — Bk 601 Pg 44", "2003-01153", "2003-01-16", "Review scope"] },
            { band: "WHITE", cells: ["Federal patent", "BLM → First WY Land Co. (surface only)", "1978-00441", "1978-01-01", "Minerals severed"] },
          ] },
      ] },
      { id: "rights-stack", label: "Rights stack", blocks: [
        { type: "prose", items: [
          { band: "WHITE", title: "Wyoming · prior-appropriation state", body: "Every stratum from above the land to below it. Stratum bands are earth-tone by elevation; the CAS color is on the status badge (green = held, red = severed)." },
        ] },
        { type: "strata", items: [
          { elev: "above", name: "Air rights", badge: "Held", band: "GREEN", detail: "No TDR severance · FAA Part 77 clear · no view easements" },
          { elev: "above", name: "Radio / spectrum rights", badge: "Action needed", band: "BLUE", detail: "No FCC tower lease on record · verify FCC database" },
          { elev: "surface", name: "Surface rights — fee simple", badge: "Held · verified", band: "GREEN", detail: "Rosenberg Family Trust · 5 transfers verified · marketable" },
          { elev: "surface", name: "Water rights (WY prior appropriation)", badge: "Review", band: "YELLOW", detail: "Priority date unconfirmed · first in time, first in right" },
          { elev: "surface", name: "Carbon credits / sequestration", badge: "Unverified", band: "BLUE", detail: "42 acres · check WY carbon registry before close" },
          { elev: "below", name: "Mineral rights", badge: "SEVERED — 1978", band: "RED", detail: "Federal patent · surface only · NOT conveyed" },
          { elev: "below", name: "Oil & gas rights", badge: "SEVERED — 1978", band: "RED", detail: "Follows mineral severance · check BLM for active lease" },
          { elev: "below", name: "Digital rights (fiber/subsurface)", badge: "Not detected", band: "BLUE", detail: "No subsurface fiber easement on record" },
        ] },
      ] },
      { id: "plain-english", label: "Plain English", blocks: [
        { type: "prose", hero: { band: "GREEN", label: "Clean · Marketable", headline: "This title is clean. The chain goes back to 1978 with no gaps.", sub: "Two easements to review. No liens. Mineral rights were severed in 1978 — you'd be buying surface only." }, items: [
          { band: "GREEN", title: "Who owns it — confirmed", body: "The Rosenberg Family Trust is the current owner of record; the chain is verified through five transfers back to a 1978 federal patent. No gaps, no breaks — marketable." },
          { band: "YELLOW", title: "What's attached — two easements", body: "A 1987 utility easement and a 2003 road easement both run with the land. Pull the recorded docs before close." },
          { band: "WHITE", title: "What's below the surface — minerals are not yours", body: "The 1978 patent conveyed surface rights only. Oil, gas, and minerals beneath this land belong to someone else. No active lease detected." },
        ] },
      ] },
    ],
  },

  // ───────────────────────── LAND USE ATTORNEY ─────────────────────────
  "law-landuse-001": {
    title: "Land Use Attorney — Coastal post-fire parcel",
    subtitle: "Tier-R · illustrative Lahaina HI coastal parcel · Anchored · PLAT-008",
    disclaimer: "General info only — not legal advice",
    cas: { RED: 1, YELLOW: 3, BLUE: 2, WHITE: 1, GREEN: 4 },
    tabs: [
      { id: "entitlement-roadmap", label: "Entitlement Roadmap", blocks: [
        { type: "map", address: "Front Street, Lahaina, HI 96761", mapType: "satellite" },
        { type: "streetview", address: "Front Street, Lahaina, HI 96761", label: "Coastal parcel · Lahaina HI 96761 (illustrative)" },
        { type: "heroes", items: [
          { band: "GREEN", title: "Like-for-like rebuild", detail: "Ministerial — cleared" },
          { band: "YELLOW", title: "Expand footprint", detail: "Contested — discretionary" },
          { band: "RED", title: "Skip SMA permit", detail: "Illegal — required" },
        ] },
        { type: "kpis", items: [
          { label: "Approval probability", value: "70%", band: "GREEN" },
          { label: "Median timeline", value: "9–12 mo", band: "WHITE" },
          { label: "Median cost", value: "$30–120K", band: "WHITE" },
          { label: "Comparable cases", value: "14", band: "WHITE" },
        ] },
        { type: "table", title: "Entitlement roadmap — CAS-coded steps",
          columns: ["Step", "State"],
          rows: [
            { band: "GREEN", cells: ["Pre-app meeting", "GREEN"] },
            { band: "BLUE", cells: ["SMA application", "BLUE · now"] },
            { band: "YELLOW", cells: ["Planning review", "YELLOW"] },
            { band: "RED", cells: ["SMA hearing", "RED · kill point"] },
            { band: "YELLOW", cells: ["Council vote", "YELLOW"] },
            { band: "WHITE", cells: ["Recordation", "WHITE"] },
          ] },
        { type: "flags", items: [
          { band: "RED", title: "SMA permit required", detail: "Coastal zone. No exemption regardless of disaster status." },
          { band: "YELLOW", title: "Planning commission kill risk", detail: "Neighbor appeal or scope expansion can stop the project." },
          { band: "BLUE", title: "HOA CC&Rs not verified", detail: "Detected from title. Upload to complete." },
          { band: "WHITE", title: "Assessor data 4 months old", detail: "Within freshness threshold." },
        ] },
      ] },
      { id: "citations", label: "Citations", blocks: [
        { type: "kpis", items: [
          { label: "Verified", value: "3", band: "GREEN" },
          { label: "Unverified", value: "1", band: "YELLOW" },
          { label: "Total authorities", value: "4", band: "WHITE" },
          { label: "All version-pinned", value: "Yes", band: "GREEN" },
        ] },
        { type: "cards", items: [
          { band: "GREEN", label: "Allows", title: "State Coastal Management Act §205A-28", detail: "Post-casualty like-for-like reconstruction permitted. Pinned 2025-01 · sha256:b7c2a4f1", action: "Stay at original footprint = GREEN path" },
          { band: "RED", label: "Required", title: "County Code §19.04.040 — SMA permit", detail: "SMA permit required for any structure. No post-disaster exemption. Pinned 2024-09 · sha256:a3f88c22", action: "File before breaking ground" },
          { band: "GREEN", label: "Expedites", title: "Post-Disaster Recovery Overlay (2023)", detail: "Disaster-declared parcels qualify for expedited SMA review (~3 mo vs 6). Pinned 2023-12 · sha256:c9d1e77b", action: "Confirm disaster declaration date" },
          { band: "BLUE", label: "Unverified", title: "HOA CC&Rs — governing documents", detail: "HOA confirmed from title; CC&Rs not publicly indexed. source: user_supplied · verified: false", action: "Upload CC&Rs to complete" },
        ] },
      ] },
      { id: "comparable-cases", label: "Comparable cases", blocks: [
        { type: "kpis", items: [
          { label: "Approved", value: "11 / 14", band: "GREEN" },
          { label: "Approval rate", value: "79%", band: "GREEN" },
          { label: "Denied", value: "3", band: "RED" },
          { label: "Like-for-like denials", value: "0", band: "GREEN" },
        ] },
        { type: "table", title: "Comparable cases — retrieved from verifiable sources (EH-07)",
          columns: ["Case", "Detail", "Year", "Outcome"],
          rows: [
            { band: "GREEN", cells: ["Post-fire like-for-like · Coastal · SMA", "Expedited · 4-0 vote", "2025", "9 mo"] },
            { band: "GREEN", cells: ["Post-fire · interior reconfig · SMA", "Ministerial · no hearing", "2025", "8 mo"] },
            { band: "RED", cells: ["Post-fire + 15% footprint · Coastal", "Neighbor appeal sustained · 3-2", "2024", "Denied"] },
            { band: "GREEN", cells: ["Post-disaster · HOA · ARB review", "ARB added 4 mo", "2024", "13 mo"] },
            { band: "RED", cells: ["30% expansion · no disaster decl.", "CEQA full review", "2023", "Denied"] },
            { band: "GREEN", cells: ["Like-for-like · expedited · clean title", "Ministerial · 5-0", "2024", "11 mo"] },
          ] },
      ] },
      { id: "plain-english", label: "Plain English", blocks: [
        { type: "prose", hero: { band: "GREEN", label: "Cleared", headline: "You can rebuild what burned down.", sub: "Like-for-like is your clearest, fastest, cheapest path. Going bigger is harder. Skipping the SMA permit is not an option." }, items: [
          { band: "RED", title: "The one thing you cannot skip — the SMA permit", body: "Your property is in the Special Management Area. Every rebuild requires an SMA permit — no post-fire exemption. The 2023 disaster declaration gets you the expedited track." },
          { band: "GREEN", title: "Build the same thing — green light", body: "Same footprint, height, and use — state law entitles you. ~9–12 months, $30K–$120K, 70% approval across 14 comparable cases." },
          { band: "YELLOW", title: "Want to build bigger — harder, not impossible", body: "Beyond the original footprint, the rules shift from ministerial to discretionary — the planning commission can say no and neighbors can appeal. 2 of 3 denials were footprint expansions." },
        ] },
      ] },
    ],
  },

  // ───────────────────────── ZONING ─────────────────────────
  "zoning-001": {
    title: "Zoning — Coastal post-fire parcel · Lahaina HI · R-2",
    subtitle: "Tier-R · Maui County Code · Anchored",
    disclaimer: "General info — not legal advice",
    cas: { RED: 1, YELLOW: 2, BLUE: 2, WHITE: 1, GREEN: 3 },
    tabs: [
      { id: "zoning-verdict", label: "Zoning verdict", blocks: [
        { type: "map", address: "Front Street, Lahaina, HI 96761", mapType: "satellite" },
        { type: "streetview", address: "Front Street, Lahaina, HI 96761", label: "R-2 coastal parcel · Lahaina HI (illustrative)" },
        { type: "heroes", items: [
          { band: "GREEN", title: "Single-family rebuild", detail: "By-right · ministerial" },
          { band: "YELLOW", title: "Duplex", detail: "Allowed with conditions (CUP)" },
          { band: "RED", title: "Triplex+", detail: "Rezone required" },
        ] },
        { type: "kpis", items: [
          { label: "Zoning", value: "R-2", band: "WHITE" },
          { label: "Max height", value: "30 ft", band: "YELLOW" },
          { label: "Lot coverage", value: "45%", band: "WHITE" },
          { label: "Parking min", value: "2/unit", band: "WHITE" },
        ] },
        { type: "table", title: "Entitlement path",
          columns: ["Path", "Process", "Timeline / fees"],
          rows: [
            { band: "GREEN", cells: ["SFH rebuild — ministerial", "Building permit only", "~60 days · $500–2K"] },
            { band: "YELLOW", cells: ["Duplex — conditional (CUP)", "Planning review · neighbor notice", "60–90 days · $2–5K"] },
            { band: "RED", cells: ["Triplex+ — legislative rezone", "Commission + council hearings", "12–18 mo · $30–80K"] },
          ] },
        { type: "flags", items: [
          { band: "RED", title: "SMA permit required for all uses", detail: "Coastal zone overlay active. No exemption." },
          { band: "YELLOW", title: "STR — Maui County permit required", detail: "STR-2024 program. Limited island-wide permits." },
          { band: "BLUE", title: "HOA CC&Rs may further restrict uses", detail: "Not yet verified. Upload to confirm." },
          { band: "GREEN", title: "4 by-right uses confirmed — no hearing needed", detail: "Single-family, ADU, home office all ministerial." },
        ] },
      ] },
      { id: "permitted-uses", label: "Permitted uses", blocks: [
        { type: "cards", items: [
          { band: "GREEN", label: "By-right", title: "Single-family residence", detail: "No hearing. Building permit only. ~60 days · §19.12" },
          { band: "GREEN", label: "By-right", title: "Accessory dwelling unit (ADU)", detail: "State-law ministerial. ~60 days · HRS §46-4" },
          { band: "YELLOW", label: "Conditional", title: "Duplex / two-family", detail: "CUP — planning review + neighbor notice. 60–90 days · §19.14" },
          { band: "GREEN", label: "By-right", title: "Home occupation / office", detail: "No clients · no signage · no employees. Immediate · §19.08" },
          { band: "YELLOW", label: "Permit req.", title: "Short-term rental (STR)", detail: "Maui County STR-2024 program. 30–60 days · $500–1K" },
          { band: "RED", label: "Not permitted", title: "Multi-family 3+ units", detail: "R-2 → R-3 legislative rezone. 12–18 mo · $30–80K · §19.16" },
        ] },
      ] },
      { id: "overlays", label: "Overlays", blocks: [
        { type: "cards", items: [
          { band: "RED", label: "Hard stop", title: "Special Management Area (SMA)", detail: "Maui County Code §19.04.040 · SMA permit required for ANY structure. No post-disaster exemption.", action: "Pull recorded SMA boundary" },
          { band: "YELLOW", label: "Expedites", title: "Post-Disaster Wildfire Recovery Zone (2023)", detail: "Parcel eligible for expedited SMA review. Disaster declared Aug 8 2023.", action: "Confirm eligibility" },
          { band: "BLUE", label: "Gap", title: "HOA / CC&Rs", detail: "Detected from title; CC&Rs not publicly indexed — content unverified.", action: "Upload CC&Rs" },
          { band: "WHITE", label: "Clear", title: "FEMA Flood Zone", detail: "Zone X — minimal flood hazard · outside 100-year floodplain." },
          { band: "GREEN", label: "Clear", title: "Historic District", detail: "Not detected · no NRHP listing · no local historic designation." },
        ] },
      ] },
      { id: "plain-english", label: "Plain English", blocks: [
        { type: "prose", hero: { band: "GREEN", label: "Cleared · R-2", headline: "Your parcel is zoned R-2. You can rebuild single-family by right.", sub: "A duplex needs a permit; three units means rezoning (12–18 mo). The SMA coastal permit is required regardless." }, items: [
          { band: "GREEN", title: "Build the same house — you're cleared", body: "R-2 allows a single-family rebuild as a ministerial approval — the county must say yes if you follow the rules. ~60 days, $500–2K. You still need the SMA coastal permit." },
          { band: "YELLOW", title: "Want a duplex — possible, but you need a permit", body: "R-2 allows two-family use with a conditional use permit: planning review + neighbor notice. 60–90 days, $2–5K." },
          { band: "RED", title: "Want three units or more — rezone required", body: "R-2 doesn't allow 3+ units. A legislative rezone to R-3 is a 12–18 month process with hearings. $30–80K. Only pursue if the economics justify the risk." },
        ] },
      ] },
    ],
  },

  // ───────────────────────── FEASIBILITY ─────────────────────────
  "feasibility-001": {
    title: "Feasibility & market study — Lahaina HI 96761",
    subtitle: "Tier-R · Proposed: 24-unit luxury rental · SITE-RECON-001 handoff · PLAT-008",
    disclaimer: "General info only — not lender investment advice",
    cas: { RED: 0, YELLOW: 2, BLUE: 3, WHITE: 4, GREEN: 2 },
    tabs: [
      { id: "demand", label: "Demand", blocks: [
        { type: "map", address: "Lahaina, HI 96761", mapType: "satellite" },
        { type: "streetview", address: "Front Street, Lahaina, HI 96761", label: "Proposed 24-unit site · Lahaina HI 96761 (illustrative)" },
        { type: "heroes", items: [
          { band: "GREEN", title: "Demand", detail: "85% of capture target" },
          { band: "YELLOW", title: "Supply pipeline", detail: "312 units in 18 months" },
          { band: "WHITE", title: "Median rent", detail: "$4,200/mo · 2BR" },
        ] },
        { type: "kpis", items: [
          { label: "Demand score", value: "8.4 / 10", band: "GREEN" },
          { label: "Capture probability", value: "85%", band: "GREEN" },
          { label: "Median income", value: "$98K", band: "WHITE" },
          { label: "Employment growth", value: "+2.4% YoY", band: "GREEN" },
        ] },
        { type: "bars", title: "Demand score breakdown", items: [
          { label: "Household income", value: "9.2", pct: 92, band: "GREEN" },
          { label: "Employment growth", value: "8.8", pct: 88, band: "GREEN" },
          { label: "Vacancy rate", value: "8.1", pct: 81, band: "GREEN" },
          { label: "Population growth", value: "7.9", pct: 79, band: "YELLOW" },
          { label: "Supply pressure", value: "7.2", pct: 72, band: "YELLOW" },
        ] },
      ] },
      { id: "supply", label: "Supply", blocks: [
        { type: "kpis", items: [
          { label: "Units in pipeline", value: "312", band: "YELLOW" },
          { label: "Inventory increase", value: "+7%", band: "YELLOW" },
          { label: "Earliest delivery", value: "8 mo", band: "WHITE" },
          { label: "Market absorption", value: "18 mo", band: "GREEN" },
        ] },
        { type: "table", title: "Supply pipeline — competing projects (24-mo window)",
          columns: ["Project", "Units", "Status", "Delivery", "Pressure"],
          rows: [
            { band: "YELLOW", cells: ["Kapalua luxury", "48", "Under construction", "M14", "Direct · 2x size"] },
            { band: "RED", cells: ["Kaanapali", "36", "Entitled", "M16", "Direct · similar tier"] },
            { band: "YELLOW", cells: ["Lahaina boutique", "28", "Permitted", "M20", "Partial · lower price"] },
            { band: "BLUE", cells: ["West Maui mixed", "200", "Proposed (EIR)", "M24", "Proposed"] },
            { band: "GREEN", cells: ["This project — luxury", "24", "Proposed", "M18", "Subject"] },
          ] },
      ] },
      { id: "comps", label: "Comps", blocks: [
        { type: "kpis", items: [
          { label: "Median 2BR", value: "$4,200", band: "GREEN" },
          { label: "Avg $/sqft", value: "$4.20", band: "WHITE" },
          { label: "Verified comps", value: "18", band: "YELLOW" },
          { label: "Subject premium", value: "5–8%", band: "GREEN" },
        ] },
        { type: "table", title: "Rent comps — provenance per comp (EH-07)",
          columns: ["Type", "Beds", "Rent/mo", "$/sqft", "Status"],
          rows: [
            { band: "GREEN", cells: ["Luxury coastal condo", "2BR", "$4,400", "$4.10", "Verified"] },
            { band: "GREEN", cells: ["Oceanview apartment", "2BR", "$4,100", "$3.95", "Verified"] },
            { band: "GREEN", cells: ["Resort-adjacent unit", "2BR", "$4,600", "$4.35", "Verified"] },
            { band: "GREEN", cells: ["Kaanapali luxury", "2BR", "$4,200", "$4.00", "Verified"] },
            { band: "GREEN", cells: ["West Maui villa", "3BR", "$5,800", "$3.80", "Verified"] },
          ] },
        { type: "flags", items: [
          { band: "BLUE", title: "CoStar premium required for full comp set", detail: "Current set is MLS-derived (18 comps). CoStar adds ~40% coverage." },
        ] },
      ] },
      { id: "demographics", label: "Demographics", blocks: [
        { type: "kpis", items: [
          { label: "Median income", value: "$98K", band: "GREEN" },
          { label: "Target renter band", value: "41%", band: "GREEN" },
          { label: "Renter share", value: "48%", band: "GREEN" },
          { label: "Population growth", value: "+1.8%", band: "YELLOW" },
        ] },
        { type: "bars", title: "Household income distribution", items: [
          { label: "<$40K", value: "8%", pct: 8, band: "WHITE" },
          { label: "$40–60K", value: "12%", pct: 12, band: "WHITE" },
          { label: "$60–80K", value: "18%", pct: 18, band: "WHITE" },
          { label: "$80–100K", value: "22%", pct: 22, band: "GREEN" },
          { label: "$100–150K", value: "24%", pct: 24, band: "GREEN" },
          { label: "$150K+", value: "16%", pct: 16, band: "GREEN" },
        ] },
        { type: "bars", title: "Age distribution (target renter 25–44 = 41%)", items: [
          { label: "25–34", value: "22%", pct: 22, band: "GREEN" },
          { label: "35–44", value: "19%", pct: 19, band: "GREEN" },
          { label: "45–54", value: "17%", pct: 17, band: "WHITE" },
          { label: "55–64", value: "15%", pct: 15, band: "WHITE" },
          { label: "65+", value: "12%", pct: 12, band: "WHITE" },
        ] },
      ] },
      { id: "sources", label: "Sources", blocks: [
        { type: "prose", items: [
          { band: "GREEN", title: "Deposition-ready source audit", body: "Every data point is traceable to a source, retrieval date, and version pin. Audit receipt PLAT-008-2026-06-07-FS-001 · chain anchored." },
        ] },
        { type: "table", title: "Source audit",
          columns: ["Source", "Coverage", "Version", "CAS"],
          rows: [
            { band: "GREEN", cells: ["Census ACS 5-year", "3-mi trade area", "2023 vintage", "Green"] },
            { band: "YELLOW", cells: ["CoStar (MLS proxy)", "18 verified comps", "2026-Q2", "Yellow"] },
            { band: "GREEN", cells: ["Maui County Assessor", "APN + assessed", "2026-04", "Green"] },
            { band: "BLUE", cells: ["GreatSchools.org", "District 7/10", "2026 cycle", "Blue · 3rd party"] },
            { band: "GREEN", cells: ["ATTOM Property", "Parcel / sales", "2026-06", "Green"] },
          ] },
      ] },
    ],
  },

  // ───────────────────────── CRE ANALYST ─────────────────────────
  "cre-analyst": {
    title: "CRE Analyst — SF / Oakland distressed office · cap-stack entry",
    subtitle: "Tier-R · CRE-2026-06-07-001 · ATTOM live · Anchored · PLAT-008",
    disclaimer: "General info only — not investment advice",
    cas: { RED: 2, YELLOW: 4, BLUE: 0, WHITE: 0, GREEN: 6 },
    tabs: [
      { id: "deal-screen", label: "Deal screen", blocks: [
        { type: "heroes", items: [
          { band: "RED", title: "2 RED", detail: "Entry targets — cap-stack play" },
          { band: "YELLOW", title: "4 YELLOW", detail: "Watch list — review required" },
          { band: "GREEN", title: "6 GREEN", detail: "Watch list — distress score < 40" },
        ] },
        { type: "kpis", items: [
          { label: "Top distress", value: "RED 75", band: "RED" },
          { label: "Acquisition price", value: "$143M", band: "WHITE" },
          { label: "Est. current value *", value: "~$86M", band: "GREEN" },
          { label: "Basis reset *", value: "~40%", band: "GREEN" },
        ] },
        { type: "table", title: "12 screened · ATTOM live · distress score 0–100", columns: ["#", "Address", "Last sale", "Class", "Band"], rows: [
          { band: "RED", cells: ["1", "325 Battery St, SF", "$143M '20", "Office", "RED 75"] },
          { band: "RED", cells: ["2", "1333 Broadway, Oakland", "$115M '19", "Office", "RED 71"] },
          { band: "YELLOW", cells: ["3", "580 California St, SF", "$89M '18", "Office", "YEL 58"] },
          { band: "YELLOW", cells: ["4", "100 Pine St, SF", "$67M '17", "Office", "YEL 52"] },
          { band: "YELLOW", cells: ["5", "1 Kaiser Plaza, Oakland", "$78M '21", "Office", "YEL 47"] },
          { band: "YELLOW", cells: ["6", "2101 Webster St, Oakland", "$42M '20", "Mixed", "YEL 44"] },
          { band: "GREEN", cells: ["7", "6 additional assets", "Various", "Mixed", "≤ 38"] },
        ] },
      ] },
      { id: "underwriting", label: "Underwriting", blocks: [
        { type: "prose", hero: { band: "RED", label: "RED 75", headline: "325 Battery St, SF — distressed", sub: "Peak-era acquisition (Feb 2020, $143M) · rate-shock exposed · ~48% occupancy · senior debt likely underwater. Cap-stack entry opportunity — mezzanine or preferred equity at reset basis." }, items: [] },
        { type: "kpis", items: [
          { label: "Acquisition price", value: "$143M", band: "RED" },
          { label: "Est. current value *", value: "~$86M", band: "GREEN" },
          { label: "Basis reset *", value: "~40%", band: "GREEN" },
          { label: "Senior loan est. *", value: "~$79M", band: "BLUE" },
        ] },
        { type: "flags", items: [
          { band: "RED", title: "Confirm current occupancy and rent roll", detail: "Est. ~48% — needs estoppels before any commitment." },
          { band: "RED", title: "Obtain current appraisal or broker opinion", detail: "~$86M est. unverified · independent appraisal required *." },
          { band: "YELLOW", title: "Identify senior lender and loan balance", detail: "Est. ~$79M — confirm via EDGAR + CMBS lookup *." },
          { band: "YELLOW", title: "Confirm workout / special servicer status", detail: "CMBS likely — check EDGAR for trustee contact." },
          { band: "BLUE", title: "Pull title for junior liens and mechanic claims", detail: "No liens detected — confirm before LOI." },
          { band: "GREEN", title: "SF market context — distressed but supply-constrained", detail: "Office fundamentals weak but geography defensible long-term." },
        ] },
      ] },
      { id: "sensitivity", label: "Sensitivity", blocks: [
        { type: "heroes", items: [
          { band: "RED", title: "2 RED ≥ 65", detail: "Entry targets · cap-stack play" },
          { band: "YELLOW", title: "4 YELLOW 40–64", detail: "Watch list — monitor" },
          { band: "GREEN", title: "6 GREEN < 40", detail: "No action — watch" },
        ] },
        { type: "bars", title: "Distress score by candidate — ATTOM-scored · entry threshold 65", items: [
          { label: "325 Battery St, SF", value: "75", pct: 75, band: "RED" },
          { label: "1333 Broadway, Oakland", value: "71", pct: 71, band: "RED" },
          { label: "580 California St, SF", value: "58", pct: 58, band: "YELLOW" },
          { label: "100 Pine St, SF", value: "52", pct: 52, band: "YELLOW" },
          { label: "1 Kaiser Plaza, Oakland", value: "47", pct: 47, band: "YELLOW" },
          { label: "2101 Webster St, Oakland", value: "44", pct: 44, band: "YELLOW" },
          { label: "525 Market St, SF", value: "38", pct: 38, band: "GREEN" },
          { label: "1111 Broadway, Oakland", value: "31", pct: 31, band: "GREEN" },
        ] },
      ] },
      { id: "capital-stack", label: "Capital stack", blocks: [
        { type: "prose", hero: { band: "WHITE", label: "Thesis", headline: "Control the asset without foreclosing", sub: "Enter at mezzanine or preferred equity · force basis reset ~40% below peak acquisition price *." }, items: [] },
        { type: "kpis", items: [
          { label: "Senior loan *", value: "~$79M", band: "BLUE" },
          { label: "Asset value est. *", value: "~$86M", band: "WHITE" },
          { label: "Target entry basis", value: "~40% reset", band: "GREEN" },
          { label: "Mezz IRR target", value: "10–15%", band: "GREEN" },
        ] },
        { type: "cards", items: [
          { band: "BLUE", label: "Senior loan", title: "~$79M *", detail: "CMBS · special servicer · highest priority." },
          { band: "YELLOW", label: "Your position — mezzanine", title: "TBD *", detail: "10–15% IRR target · intercreditor required · junior to senior, senior to equity." },
          { band: "GREEN", label: "Alt position — preferred equity", title: "TBD *", detail: "Fixed coupon + buyout rights at a pre-agreed basis *." },
          { band: "WHITE", label: "Common equity", title: "~$0 *", detail: "Current sponsor — basis recovery unlikely at peak." },
        ] },
      ] },
      { id: "decision", label: "Decision memo", blocks: [
        { type: "prose", hero: { band: "RED", label: "Recommend", headline: "Pursue 325 Battery St, SF — cap-stack entry", sub: "Mezzanine or preferred equity · basis reset ~40% below peak · secondary target 1333 Broadway Oakland. 12 screened · 2 RED entry targets · 4 YELLOW watch list." }, items: [
          { band: "RED", title: "RED 75 — 325 Battery St, SF", body: "$143M peak (Feb 2020) · ~48% occupancy · senior likely underwater · rate-shock exposed." },
          { band: "RED", title: "RED 71 — 1333 Broadway, Oakland", body: "$115M acquisition (2019) · CBD office · > 40% vacancy · Oakland secondary market." },
        ] },
        { type: "flags", items: [
          { band: "BLUE", title: "1 · Confirm senior lender / special servicer", detail: "EDGAR + CMBS lookup." },
          { band: "BLUE", title: "2 · Order broker opinion of value / independent appraisal", detail: "Establish current value vs the $143M peak basis." },
          { band: "BLUE", title: "3 · Pull rent roll and occupancy estoppels", detail: "From the current owner — confirm the ~48% occupancy." },
          { band: "BLUE", title: "4 · Engage counsel on the intercreditor agreement", detail: "Required for a mezzanine entry behind the senior loan." },
          { band: "BLUE", title: "5 · Repeat the underwriting pass on 1333 Broadway", detail: "Secondary RED 71 target — Oakland CBD." },
        ] },
      ] },
    ],
  },

  // ───────────────────────── SITE RECON ─────────────────────────
  "site-recon-001": {
    title: "Site Recon — last-mile warehouse · Riverside County CA",
    subtitle: "Tier-R · SITE-RECON-001 · 0.5-mi radius · Anchored · PLAT-008",
    disclaimer: "General info only — not legal advice",
    cas: { RED: 2, YELLOW: 3, BLUE: 0, WHITE: 0, GREEN: 3 },
    tabs: [
      { id: "opportunities", label: "Opportunities", blocks: [
        { type: "map", address: "Moreno Valley, CA 92551", mapType: "satellite" },
        { type: "streetview", address: "Moreno Valley, CA 92551", label: "Last-mile warehouse site · Riverside County CA (illustrative)" },
        { type: "heroes", items: [
          { band: "GREEN", title: "3 GREEN", detail: "Underwriteable — proceed" },
          { band: "YELLOW", title: "3 YELLOW", detail: "Review required — named blocker" },
          { band: "RED", title: "2 RED", detail: "Hard stop — do not proceed" },
        ] },
        { type: "kpis", items: [
          { label: "Parcels screened", value: "8", band: "WHITE" },
          { label: "Top parcel", value: "12.4 ac", band: "GREEN" },
          { label: "Top parcel $/ac", value: "$330K", band: "GREEN" },
          { label: "Session cost", value: "$60.00", band: "BLUE" },
        ] },
        { type: "table", title: "8 parcels screened · 0.5-mi radius · ATTOM live", columns: ["#", "Address", "Lot", "Zone", "Last sale", "Verdict"], rows: [
          { band: "GREEN", cells: ["1", "1450 Hamner Ave, Norco", "12.4 ac", "M-2", "$4.1M '18", "GREEN"] },
          { band: "GREEN", cells: ["2", "3820 Crestmore Rd, Jurupa Valley", "8.7 ac", "M-1", "$2.8M '21", "GREEN"] },
          { band: "GREEN", cells: ["3", "6700 Bellegrave Ave, Jurupa Valley", "15.2 ac", "M-2", "$5.9M '20", "GREEN"] },
          { band: "YELLOW", cells: ["4", "11400 Limonite Ave, Jurupa Valley", "6.1 ac", "M-1", "$1.9M '19", "YELLOW"] },
          { band: "YELLOW", cells: ["5", "4100 Pedley Rd, Riverside", "9.3 ac", "M-2", "$3.3M '17", "YELLOW"] },
          { band: "YELLOW", cells: ["6", "2250 Marlborough Ave, Riverside", "4.8 ac", "M-1", "$1.5M '22", "YELLOW"] },
          { band: "RED", cells: ["7", "5th & Market, Perris", "5.0 ac", "C-1", "$3.2M '19", "RED"] },
          { band: "RED", cells: ["8", "1100 N Perris Blvd, Perris", "3.2 ac", "R-3", "$0.9M '16", "RED"] },
        ] },
      ] },
      { id: "feasibility", label: "Feasibility", blocks: [
        { type: "prose", hero: { band: "GREEN", label: "GREEN", headline: "1450 Hamner Ave, Norco — feasible", sub: "All evaluated gates pass · 12.4 ac · M-2 · by-right warehouse. GREEN is earned by evaluated passes — never granted by missing data." }, items: [] },
        { type: "flags", items: [
          { band: "GREEN", title: "Zoning — cleared", detail: "M-2 Heavy Industrial — by-right warehouse. No CUP required." },
          { band: "GREEN", title: "Access — cleared", detail: "Rail-adjacent + I-15 frontage. Truck court geometry feasible at 12.4 ac." },
          { band: "GREEN", title: "Title chain — cleared", detail: "Owner confirmed. No liens. Last transfer 2018 — clean warranty deed." },
          { band: "YELLOW", title: "Utilities — ~2 weeks", detail: "Electric + water confirmed. Sewer capacity unconfirmed — utility letter needed." },
          { band: "BLUE", title: "Environmental — pull Phase I", detail: "Phase I not pulled. No known contamination on record — action needed before LOI." },
          { band: "GREEN", title: "Entitlement timeline — ~4 months", detail: "By-right — building permit only. No discretionary review required." },
        ] },
      ] },
      { id: "historical", label: "Historical", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "$4.1M", detail: "Last sale price · Apr 2018" },
          { band: "GREEN", title: "$330K/ac", detail: "Implied $/acre · in-range" },
          { band: "GREEN", title: "2 transfers", detail: "Since 1987 · clean chain" },
        ] },
        { type: "kpis", items: [
          { label: "Last sale", value: "$4,100,000", band: "GREEN" },
          { label: "Implied $/acre", value: "$330,645", band: "WHITE" },
          { label: "AVM estimate", value: "$5.2M (+27%)", band: "GREEN" },
          { label: "Days on market", value: "N/A", band: "WHITE" },
        ] },
        { type: "chain", title: "Ownership chain — newest first", items: [
          { band: "GREEN", parties: "Norco Industrial Partners ← Pacific Land LLC", meta: "Warranty deed · Apr 14 2018 · $4,100,000", tag: "Current owner" },
          { band: "GREEN", parties: "Pacific Land LLC ← Riverside County", meta: "Grant deed · Sep 3 2012 · $1,800,000" },
          { band: "BLUE", parties: "Hamner Holdings ← [Federal]", meta: "Quitclaim · Mar 1 2001 · $0", tag: "Verify instrument" },
          { band: "WHITE", parties: "Federal patent", meta: "Original grant · 1987 · surface rights only" },
        ] },
        { type: "table", title: "Comparable industrial land sales — $/acre", columns: ["Address", "Date", "Acres", "Price", "$/acre"], rows: [
          { band: "GREEN", cells: ["3820 Crestmore Rd, Jurupa Valley", "Jun 2021", "8.7", "$2.8M", "$321,839"] },
          { band: "GREEN", cells: ["6700 Bellegrave Ave, Jurupa Valley", "Mar 2020", "15.2", "$5.9M", "$388,158"] },
          { band: "GREEN", cells: ["4100 Pedley Rd, Riverside", "Aug 2017", "9.3", "$3.3M", "$354,839"] },
        ] },
      ] },
    ],
  },
};

// S52.45 — NO-FABRICATION FIX. The CRE Analyst canvas is GENERATED from the real
// ATTOM pull (creAnalystData.js) — same source as the chat grounding — so the
// canvas can never disagree with the chat or invent addresses/scores. Figures
// marked * are transparent illustrative models (current value, basis reset,
// loan size); every address / sale price / date / distress score is real ATTOM.
function buildCreCanvas(cre) {
  const short = (a) => String(a || "").split(",")[0];
  const m = (v) => (v ? "$" + Math.round(v / 1e6) + "M" : "—");
  const yr = (d) => (d ? "'" + String(d).slice(2, 4) : "");
  const reds = cre.filter((p) => p.distressBand === "RED");
  const yellows = cre.filter((p) => p.distressBand === "YELLOW");
  const greens = cre.filter((p) => p.distressBand === "GREEN");
  const hero = reds[0] || cre[0] || {};
  const hm = hero.lastSale ? Math.round(hero.lastSale / 1e6) : null;
  const est = (mult) => (hm ? "~$" + Math.round(hm * mult) + "M" : "—");
  return {
    title: "CRE Analyst — SF / Oakland distressed office · cap-stack entry",
    subtitle: "Tier-R · ATTOM live · Anchored · PLAT-008",
    disclaimer: "General info only — not investment advice",
    cas: { RED: reds.length, YELLOW: yellows.length, BLUE: 0, WHITE: 0, GREEN: greens.length },
    tabs: [
      { id: "map", label: "Map", blocks: [
        { type: "map", region: "San Francisco, CA",
          locations: cre.filter((p) => p.lat && p.lng).map((p) => ({ address: p.address, label: short(p.address) + " · " + p.distressBand + " " + p.distressScore, lat: p.lat, lng: p.lng })) },
      ] },
      { id: "deal-screen", label: "Deal screen", blocks: [
        { type: "heroes", items: [
          { band: "RED", title: reds.length + " RED", detail: "Entry targets — cap-stack play" },
          { band: "YELLOW", title: yellows.length + " YELLOW", detail: "Watch list — review required" },
          { band: "GREEN", title: greens.length + " GREEN", detail: "Lower distress signal" },
        ] },
        { type: "kpis", items: [
          { label: "Top distress", value: (hero.distressBand || "—") + " " + (hero.distressScore ?? ""), band: "RED" },
          { label: "Acquisition price", value: m(hero.lastSale), band: "WHITE" },
          { label: "Est. current value *", value: est(0.6), band: "GREEN" },
          { label: "Basis reset *", value: "~40%", band: "GREEN" },
        ] },
        { type: "table", title: cre.length + " screened · ATTOM live · distress score 0–100",
          columns: ["Address", "Last sale", "Type", "Band"],
          rows: cre.map((p) => ({ band: p.distressBand, cells: [short(p.address), m(p.lastSale) + " " + yr(p.lastSaleDate), String(p.propType || "").slice(0, 16), (p.distressBand || "") + " " + (p.distressScore ?? "")] })) },
      ] },
      { id: "underwriting", label: "Underwriting", blocks: [
        { type: "prose", hero: { band: hero.distressBand || "RED", label: (hero.distressBand || "") + " " + (hero.distressScore ?? ""), headline: short(hero.address) + " — distressed", sub: (hero.distressReasons || []).join("; ") + ". Cap-stack entry opportunity — mezzanine or preferred equity at reset basis." }, items: [] },
        { type: "kpis", items: [
          { label: "Acquisition price", value: m(hero.lastSale), band: "RED" },
          { label: "Est. current value *", value: est(0.6), band: "GREEN" },
          { label: "Basis reset *", value: "~40%", band: "GREEN" },
          { label: "Senior loan est. *", value: est(0.55), band: "BLUE" },
        ] },
        { type: "flags", items: [
          { band: "RED", title: "Confirm current occupancy and rent roll", detail: "Needs estoppels before any commitment." },
          { band: "RED", title: "Obtain current appraisal or broker opinion", detail: "Current-value figure is illustrative * — independent appraisal required." },
          { band: "YELLOW", title: "Identify the current debt holder", detail: hero.lender ? ("Recorded lender: " + hero.lender + ". On a deal this size the paper's likely been sold — trace the current servicer via the recorded assignment of mortgage.") : "No recorded lender on file — trace via the recorded assignment of mortgage." },
          { band: "BLUE", title: "Pull title for junior liens", detail: "Confirm before LOI." },
          { band: "GREEN", title: "Market context — distressed but supply-constrained", detail: "Office weak; geography defensible long-term." },
        ] },
      ] },
      { id: "sensitivity", label: "Sensitivity", blocks: [
        { type: "heroes", items: [
          { band: "RED", title: reds.length + " RED", detail: "Entry targets · cap-stack play" },
          { band: "YELLOW", title: yellows.length + " YELLOW", detail: "Watch list — monitor" },
          { band: "GREEN", title: greens.length + " GREEN", detail: "Lower signal — watch" },
        ] },
        { type: "bars", title: "Distress score by candidate — ATTOM-scored",
          items: cre.slice(0, 10).map((p) => ({ label: short(p.address), value: String(p.distressScore ?? ""), pct: Number(p.distressScore) || 0, band: p.distressBand })) },
      ] },
      { id: "capital-stack", label: "Capital stack", blocks: [
        { type: "prose", hero: { band: "WHITE", label: "Thesis", headline: "Control the asset without foreclosing", sub: "Enter at mezzanine or preferred equity · force a basis reset ~40% below peak acquisition price *." }, items: [] },
        { type: "kpis", items: [
          { label: "Senior loan *", value: est(0.55), band: "BLUE" },
          { label: "Asset value est. *", value: est(0.6), band: "WHITE" },
          { label: "Target entry basis", value: "~40% reset", band: "GREEN" },
          { label: "Mezz IRR target", value: "10–15%", band: "GREEN" },
        ] },
        { type: "cards", items: [
          { band: "BLUE", label: "Senior loan", title: est(0.55) + " *", detail: "CMBS · special servicer · highest priority." },
          { band: "YELLOW", label: "Your position — mezzanine", title: "TBD *", detail: "10–15% IRR target · intercreditor required." },
          { band: "GREEN", label: "Alt — preferred equity", title: "TBD *", detail: "Fixed coupon + buyout rights at a pre-agreed basis." },
          { band: "WHITE", label: "Common equity", title: "~$0 *", detail: "Current sponsor — basis recovery unlikely at peak." },
        ] },
      ] },
      { id: "decision", label: "Decision memo", blocks: [
        { type: "prose", hero: { band: "RED", label: "Recommend", headline: "Pursue " + short(hero.address) + " — cap-stack entry", sub: "Mezzanine or preferred equity · basis reset ~40% below peak. " + cre.length + " screened · " + reds.length + " RED entry targets · " + yellows.length + " YELLOW watch list." },
          items: reds.map((p) => ({ band: "RED", title: (p.distressBand || "") + " " + (p.distressScore ?? "") + " — " + short(p.address), body: m(p.lastSale) + " (" + yr(p.lastSaleDate) + ") · " + (p.distressReasons || []).join("; ") })) },
        { type: "flags", items: [
          { band: "BLUE", title: "1 · Trace the current debt holder", detail: "Pull the recorded assignment of mortgage to see who the paper was sold to." },
          { band: "BLUE", title: "2 · Order a broker opinion of value / appraisal", detail: "Confirm current value vs the peak basis." },
          { band: "BLUE", title: "3 · Pull rent roll + occupancy estoppels", detail: "From the current owner." },
          { band: "BLUE", title: "4 · Engage counsel on the intercreditor agreement", detail: "Required for a mezzanine entry." },
        ] },
      ] },
    ],
  };
}
// Override the hand-authored entry with the real-data-generated one.
let _creIsReal = false;
if (Array.isArray(CRE_DISTRESSED) && CRE_DISTRESSED.length) {
  RE_CANVAS["cre-analyst"] = buildCreCanvas(CRE_DISTRESSED);
  _creIsReal = true;
}

// S52.47 — Student Evaluation Worker (Ruthie Clearwater, nursing). Designed
// canvas reuses this same renderer. Data is a SAMPLE learning record (Vault owns
// the real DTC+logbook; the worker is a vault-adjacent reader). casLabels reframes
// the instrument panel for education (Met / Remediate / Not met).
RE_CANVAS["student-eval-001"] = buildLearningCanvas();

// S52.46 — fabrication-by-fixture disclosure. Every RE canvas except the
// real-ATTOM-generated cre-analyst is hand-authored sample data. Mark them so
// the canvas shows an honest "SAMPLE DATA" badge instead of passing invented
// addresses/prices off as a live pull (QC001 finding).
for (const k of Object.keys(RE_CANVAS)) {
  RE_CANVAS[k].sample = !(k === "cre-analyst" && _creIsReal);
}

// Slug aliases — some surfaces (CampaignPage, AddWorkspaceWizard, the catalog
// JSON) refer to the CRE worker as "cre-deal-analyst"; the live worker + canvas
// key is "cre-analyst". Alias so the designed canvas resolves either way.
const RE_CANVAS_ALIASES = { "cre-deal-analyst": "cre-analyst" };

export function getRECanvas(workerSlug) {
  if (!workerSlug) return null;
  return RE_CANVAS[workerSlug] || RE_CANVAS[RE_CANVAS_ALIASES[workerSlug]] || null;
}

// ───────────────────────── DATA-DRIVEN CANVAS (S52.50, keystone task #31) ──────
// THE canonical renderable canvas schema — the contract every worker's canvas
// shares, whether it comes from a worker's catalog doc, a backend emit, or the
// hardcoded seed fixtures above:
//
//   {
//     title, subtitle, disclaimer?, sample?,
//     cas: { RED, YELLOW, BLUE, WHITE, GREEN },   // instrument-panel counts
//     casLabels?,                                 // optional relabel of CAS bands
//     tabs: [ { id, label, blocks: [ { type, ...payload } ] } ]
//   }
//
// Renderable block types (see RealEstateWorkerCanvas Block switch):
//   heroes | kpis | flags | chain | strata | cards | table | bars | prose | map | streetview
//
// This replaces the old "the renderer only knows 6 hardcoded slugs" model: any
// worker that carries a valid spec on `worker.canvasSpec` (or `worker.canvas`)
// now renders its OWN designed canvas. The fixtures remain as a fallback/seed.
export function isValidCanvasSpec(spec) {
  return !!(
    spec && typeof spec === "object" &&
    Array.isArray(spec.tabs) && spec.tabs.length > 0 &&
    spec.tabs.every(t => t && Array.isArray(t.blocks))
  );
}

// Resolve the spec to render for a worker, in priority order:
//   1. the worker's OWN spec (worker.canvasSpec | worker.canvas) — data-driven,
//      populated by the sandbox publish (#32) or the live ATTOM backend (#34);
//   2. the hardcoded seed fixture by slug/workerId/catalogId (original 6 RE workers);
//   3. null — caller falls back to the generic worker canvas.
export function resolveCanvasSpec(worker) {
  if (!worker) return null;
  const own = worker.canvasSpec || worker.canvas || null;
  if (isValidCanvasSpec(own)) return own;
  return (
    getRECanvas(worker.workerId) ||
    getRECanvas(worker.slug) ||
    getRECanvas(worker.catalogId) ||
    null
  );
}
