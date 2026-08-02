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
import { RE_WORKER_ATTOM } from "./reWorkerAttomData";

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
      { id: "ownership-chain", label: "Ownership chain", description: "The documented chain of every recorded ownership transfer — who conveyed to whom, at what price, and whether any gaps or red flags appear.", blocks: [
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
      { id: "encumbrances", label: "Encumbrances", description: "Every financial claim on this title: liens, easements, and deed restrictions. A clear lien stack is required for clean closing — anything open is flagged with a recommended action.", blocks: [
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
      { id: "recorded-docs", label: "Recorded docs", description: "The full archive of recorded instruments filed with the county clerk — deeds, easements, and other documents. Every row links to the underlying recorded document.", blocks: [
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
      { id: "rights-stack", label: "Rights stack", description: "What you actually own — every legal stratum from airspace to minerals. Rights can be severed; the stack shows what transferred with the deed and what didn't.", blocks: [
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
      { id: "plain-english", label: "Plain English", description: "The title picture in plain language — what's clean, what needs review, and what's been severed from the parcel. No legal jargon.", blocks: [
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
      { id: "entitlement-roadmap", label: "Entitlement Roadmap", description: "Every approval step this project must clear before a building permit issues — in sequence, with kill points and timelines drawn from comparable case history.", blocks: [
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
      { id: "citations", label: "Citations", description: "Every legal authority cited in this analysis — statute sections, county codes, and case law — each pinned to a specific version and hash so nothing drifts.", blocks: [
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
      { id: "comparable-cases", label: "Comparable cases", description: "Real prior decisions for similar projects before the same planning authority — approval rate, denial reasons, and timelines so you know what you're actually facing.", blocks: [
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
      { id: "plain-english", label: "Plain English", description: "The entitlement picture in plain language — what's allowed by right, what needs a permit, and what the SMA coastal overlay means for your project.", blocks: [
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
      { id: "zoning-verdict", label: "Zoning verdict", description: "The zoning designation for this parcel and exactly what it allows — by right, with a permit, and not at all. Coded GREEN/YELLOW/RED so you can read it at a glance.", blocks: [
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
      { id: "permitted-uses", label: "Permitted uses", description: "Every use allowed under this zoning code: what needs no hearing, what requires a conditional use permit, and what's flatly prohibited.", blocks: [
        { type: "cards", items: [
          { band: "GREEN", label: "By-right", title: "Single-family residence", detail: "No hearing. Building permit only. ~60 days · §19.12" },
          { band: "GREEN", label: "By-right", title: "Accessory dwelling unit (ADU)", detail: "State-law ministerial. ~60 days · HRS §46-4" },
          { band: "YELLOW", label: "Conditional", title: "Duplex / two-family", detail: "CUP — planning review + neighbor notice. 60–90 days · §19.14" },
          { band: "GREEN", label: "By-right", title: "Home occupation / office", detail: "No clients · no signage · no employees. Immediate · §19.08" },
          { band: "YELLOW", label: "Permit req.", title: "Short-term rental (STR)", detail: "Maui County STR-2024 program. 30–60 days · $500–1K" },
          { band: "RED", label: "Not permitted", title: "Multi-family 3+ units", detail: "R-2 → R-3 legislative rezone. 12–18 mo · $30–80K · §19.16" },
        ] },
      ] },
      { id: "overlays", label: "Overlays", description: "Additional regulations layered on top of base zoning — coastal management areas, flood zones, wildfire recovery programs. Each one can add process or open a fast-track.", blocks: [
        { type: "cards", items: [
          { band: "RED", label: "Hard stop", title: "Special Management Area (SMA)", detail: "Maui County Code §19.04.040 · SMA permit required for ANY structure. No post-disaster exemption.", action: "Pull recorded SMA boundary" },
          { band: "YELLOW", label: "Expedites", title: "Post-Disaster Wildfire Recovery Zone (2023)", detail: "Parcel eligible for expedited SMA review. Disaster declared Aug 8 2023.", action: "Confirm eligibility" },
          { band: "BLUE", label: "Gap", title: "HOA / CC&Rs", detail: "Detected from title; CC&Rs not publicly indexed — content unverified.", action: "Upload CC&Rs" },
          { band: "WHITE", label: "Clear", title: "FEMA Flood Zone", detail: "Zone X — minimal flood hazard · outside 100-year floodplain." },
          { band: "GREEN", label: "Clear", title: "Historic District", detail: "Not detected · no NRHP listing · no local historic designation." },
        ] },
      ] },
      { id: "plain-english", label: "Plain English", description: "What you can build, what you need a permit for, and what requires a rezone — in plain language, without the code citations.", blocks: [
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
      { id: "demand", label: "Demand", description: "Market demand signals for the proposed project: household income, employment growth, vacancy rate, and capture probability. Every metric sourced and scored.", blocks: [
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
      { id: "supply", label: "Supply", description: "Competing projects in the pipeline — units, delivery timeline, and how each one affects absorption of your project.", blocks: [
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
      { id: "comps", label: "Comps", description: "Verified rent or sale comps for this product type and market. Median, $/sqft, and how your subject compares — with provenance per comp.", blocks: [
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
      { id: "demographics", label: "Demographics", description: "Household income distribution, age cohorts, and renter share within the trade area. Identifies whether the target renter actually lives here.", blocks: [
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
      { id: "sources", label: "Sources", description: "Every data source cited in this study — with coverage, version, and retrieval date. Deposition-ready audit trail so every number is traceable.", blocks: [
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
      { id: "deal-screen", label: "Deal screen", description: "Distress-scored screening of every candidate property — ranked by ATTOM score. RED = entry target; YELLOW = watch list. Focus on RED first.", blocks: [
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
      { id: "underwriting", label: "Underwriting", description: "Deep-dive on the top distressed asset: acquisition price vs estimated current value, basis reset opportunity, and the checks required before you sign an LOI.", blocks: [
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
      { id: "sensitivity", label: "Sensitivity", description: "Distress score comparison across the full candidate set — ranked so you can see the delta between entry targets and watch-list properties.", blocks: [
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
      { id: "capital-stack", label: "Capital stack", description: "The capital stack thesis for the top candidate: senior debt position, your proposed mezzanine or preferred equity entry point, and IRR targets.", blocks: [
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
      { id: "decision", label: "Decision memo", description: "The analyst's recommendation: which assets to pursue, in which order, and the exact next steps required before committing capital.", blocks: [
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
      { id: "opportunities", label: "Opportunities", description: "All screened parcels in the target radius — mapped and scored GREEN/YELLOW/RED for zoning, access, title, and entitlement risk. Focus on GREEN first.", blocks: [
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
      { id: "feasibility", label: "Feasibility", description: "Feasibility verdict for the top candidate — every evaluated gate with its status. GREEN is earned by a passing evaluation, never assumed.", blocks: [
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
      { id: "historical", label: "Historical", description: "Ownership chain, last recorded sale, implied $/acre, and comparable industrial land sales for the top candidate. Know what the market has paid for comparable parcels.", blocks: [
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

  // ───────────────────────── TITLE SEARCH ─────────────────────────
  "re-title-search-001": {
    title: "Title Search — 313 Mayfair Dr, Athens TX 75751",
    subtitle: "File ATH-2026-0743 · Henderson County · Chain search complete · ATTOM data",
    disclaimer: "General information — not certified legal advice",
    cas: { RED: 0, YELLOW: 2, BLUE: 3, WHITE: 2, GREEN: 6 },
    tabs: [
      { id: "chain-of-title", label: "Chain of Title", description: "Every recorded ownership transfer for this parcel — who conveyed to whom, at what price, with any gaps flagged. A clean chain is the foundation of marketable title.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Title chain — clean · 4 transfers", detail: "No gaps · marketable title confirmed" },
          { band: "YELLOW", title: "Mineral rights severed", detail: "1978 federal conveyance — surface rights only" },
          { band: "BLUE", title: "Search period: 1978–2026", detail: "48-year statutory search · Henderson County records" },
        ] },
        { type: "map", sectionLabel: "313 Mayfair Dr, Athens TX 75751", locations: [
          { address: "313 Mayfair Dr, Athens, TX 75751", label: "SUBJECT PARCEL" },
        ], mapType: "satellite" },
        { type: "chain", title: "Chain of title — newest first", items: [
          { band: "BLUE", parties: "Troy Garris Trust → Sara Kahele", meta: "Warranty deed · Pending · $285,000 · File ATH-2026-0743 · Henderson County · In progress", tag: "In progress" },
          { band: "GREEN", parties: "Edward Garris → Troy Garris Trust", meta: "Trustee deed · Jun 3 2014 · $0 · Rec. 2014-06031 · Inter vivos trust transfer" },
          { band: "GREEN", parties: "Garris Family LP → Edward Garris", meta: "Warranty deed · Apr 18 2001 · $95,000 · Rec. 2001-04188" },
          { band: "YELLOW", parties: "Henderson County → Garris Family LP", meta: "Special warranty deed · Oct 12 1988 · $42,500 · Rec. 1988-10121 · Tax sale redemption", tag: "Verify" },
          { band: "YELLOW", parties: "Federal conveyance — surface rights only", meta: "Surface deed · 1978 · MINERAL RIGHTS RESERVED · Rec. 1978-00882", tag: "Minerals severed" },
        ] },
        { type: "flags", items: [
          { band: "YELLOW", title: "1988 tax sale deed — confirm no redemption period issues", detail: "Henderson County issued a special warranty deed after tax sale redemption. Stewart Title indemnity obtained to clear any residual redemption risk." },
          { band: "YELLOW", title: "Mineral rights severed 1978 — Schedule B-2 exception required", detail: "Surface rights only conveyed from 1978 forward. Garris Family LP retains all subsurface mineral rights. Mandatory Schedule B-2 exception — buyer signed mineral disclosure." },
          { band: "GREEN", title: "No probate issues · trust documentation verified", detail: "Edward Garris → Troy Garris Trust is a proper inter vivos transfer. Trust certification on file. No probate required." },
          { band: "GREEN", title: "No gaps in chain · 48-year search complete", detail: "Continuous chain verified from 1978 federal conveyance to present. No breaks or unrecorded interests detected." },
        ] },
      ] },
      { id: "liens", label: "Liens & Encumbrances", description: "All recorded mortgages, liens, judgments, and encumbrances — everything that must be cleared before title can transfer.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "No open mortgages", detail: "Cash purchase — no payoff required" },
          { band: "GREEN", title: "No tax delinquency", detail: "Henderson County taxes current" },
          { band: "YELLOW", title: "1 utility easement", detail: "10-ft strip NE boundary — runs with land" },
        ] },
        { type: "table", columns: ["Type", "Holder", "Amount", "Status"], rows: [
          { band: "GREEN", cells: ["Mortgage / DOT", "None", "N/A", "Cash purchase"] },
          { band: "GREEN", cells: ["IRS tax lien", "IRS", "$0", "No lien found"] },
          { band: "GREEN", cells: ["County tax lien", "Henderson County", "$0", "Current — paid 2026-01-15"] },
          { band: "GREEN", cells: ["HOA lien", "None", "N/A", "No HOA recorded"] },
          { band: "GREEN", cells: ["Mechanics' lien", "None", "N/A", "None recorded"] },
          { band: "YELLOW", cells: ["Utility easement", "Henderson Co-op Electric", "N/A", "Active — 10 ft NE boundary"] },
        ] },
        { type: "flags", items: [
          { band: "YELLOW", title: "Utility easement — 10-ft strip NE boundary · Doc #89-04412", detail: "Henderson County Electric Co-op. Easement runs with the land. No active infrastructure dispute. Disclosed in Schedule B-2." },
          { band: "GREEN", title: "Lien search complete — no open liens to clear", detail: "No mortgages, judgments, IRS liens, HOA arrears, or mechanics' liens found. File is clear to close on the title side." },
        ] },
      ] },
      { id: "tax-status", label: "Tax Status", description: "Current and historical property tax status — delinquency, proration amounts, and pending assessments that transfer with the property.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Taxes current", detail: "No delinquency · paid through 2025" },
          { band: "BLUE", title: "2026 proration", detail: "Seller owes $528 (Jan–Jul 28)" },
          { band: "GREEN", title: "No special assessments", detail: "No MUD, SID, or bond assessments" },
        ] },
        { type: "kpis", items: [
          { label: "2025 annual tax", value: "$1,082", band: "GREEN" },
          { label: "Last paid", value: "Jan 15 2026", band: "GREEN" },
          { label: "2026 proration (seller)", value: "$528", band: "BLUE" },
          { label: "Homestead exemption", value: "Yes · $40K", band: "GREEN" },
        ] },
        { type: "flags", items: [
          { band: "BLUE", title: "2026 tax proration: seller owes $528 (Jan 1 – Jul 28)", detail: "Prorated to closing date. Reflected as buyer credit in Closing Disclosure. Based on 2025 Henderson County rate of $1,082." },
          { band: "GREEN", title: "No delinquent taxes · no tax lien", detail: "Henderson County Tax Assessor confirms taxes current through 2025. No delinquency or tax sale risk." },
          { band: "GREEN", title: "No MUD, SID, or special district bonds", detail: "Parcel is not in a Municipal Utility District. No bond assessment transfers with the deed." },
        ] },
      ] },
      { id: "defects", label: "Defects", description: "All P0 (blocking), P1 (curative required), and P2 (advisory) title defects found during search — with cure steps for each.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "P0 defects — 0", detail: "No blocking defects · clear to commit" },
          { band: "YELLOW", title: "P1 defects — 2", detail: "Curative required — both resolved" },
          { band: "BLUE", title: "P2 advisory — 1", detail: "Noted · no curative action required" },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "P1 RESOLVED · Mineral severance disclosure — Schedule B-2 Exception 7", detail: "Exception language inserted. Buyer signed separate Texas Real Estate Commission mineral rights disclosure. Curative complete." },
          { band: "GREEN", title: "P1 RESOLVED · 1988 tax sale deed — Stewart Title indemnity obtained", detail: "Search confirms no active redemption claim. Stewart Title Guaranty endorsement on file. Underwriter approved." },
          { band: "BLUE", title: "P2 Advisory · Shared fence NW corner — no recorded boundary agreement", detail: "Physical fence at NW corner appears to follow lot line. No recorded agreement. Survey recommended but not required for this cash purchase close." },
        ] },
      ] },
      { id: "order-summary", label: "Order Summary", description: "Commitment readiness, exception summary, and handoff status.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Ready for commitment", detail: "0 P0 defects · all P1s resolved" },
          { band: "GREEN", title: "Underwriter approved", detail: "Stewart Title Guaranty · $285,000 coverage" },
          { band: "BLUE", title: "Commitment issued 07/18/2026", detail: "Schedule A + B-1 + B-2 attached" },
        ] },
        { type: "kpis", items: [
          { label: "File number", value: "ATH-2026-0743", band: "WHITE" },
          { label: "Commitment date", value: "07/18/2026", band: "GREEN" },
          { label: "Underwriter", value: "Stewart Title", band: "GREEN" },
          { label: "Policy type", value: "ALTA 2021 Owner's", band: "WHITE" },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "Schedule A — legal description verified", detail: "Lot 14, Block 6, Mayfair Addition, Henderson County, TX. Legal description matches deed and plat. 0.34 acres." },
          { band: "YELLOW", title: "Schedule B-2 Exception 7 — mineral severance", detail: "'Minerals and mineral rights, including but not limited to oil, gas and other minerals, as reserved in the Federal Patent recorded 1978.' Included in commitment." },
          { band: "BLUE", title: "Schedule B-2 Exception 8 — utility easement NE boundary", detail: "Henderson County Electric Co-op easement, 10-ft strip, recorded 1989 Doc #89-04412. Standard exception." },
          { band: "GREEN", title: "All curative steps complete — file clear to close", detail: "Mineral disclosure signed. Tax sale indemnity obtained. No blocking defects outstanding." },
        ] },
      ] },
    ],
  },

  // ───────────────────────── TITLE ADVOCATE (ESCROW) ─────────────────────────
  "re-escrow-001": {
    title: "Title Advocate — 313 Mayfair Dr, Athens TX 75751",
    subtitle: "File ATH-2026-0743 · Henderson County · Cash purchase · Wet close · ATTOM data",
    disclaimer: "General information — not certified legal advice",
    cas: { RED: 0, YELLOW: 3, BLUE: 5, WHITE: 2, GREEN: 7 },
    tabs: [
      { id: "parcel-map", label: "Parcel Map", description: "Subject parcel + all adjacent properties in a 2-lot radius. Easements, adjacency issues, and mineral-rights flags surface here. SOCIII pulls title on every neighbor — not just the subject — so boundary conflicts and access easements are caught before close.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Subject parcel — clear boundaries", detail: "313 Mayfair Dr · 0.34 ac · Lot 14 Block 6" },
          { band: "YELLOW", title: "1 adjacency note", detail: "Utility easement crosses NE boundary" },
          { band: "BLUE", title: "9 parcels analyzed", detail: "Subject + 8 adjacent (2-lot radius)" },
        ] },
        { type: "map", sectionLabel: "Subject + adjacent parcels · Henderson County TX", locations: [
          { address: "313 Mayfair Dr, Athens, TX 75751", label: "SUBJECT — 313 Mayfair" },
          { address: "309 Mayfair Dr, Athens, TX 75751", label: "Adjacent W" },
          { address: "317 Mayfair Dr, Athens, TX 75751", label: "Adjacent E" },
          { address: "312 Elmwood St, Athens, TX 75751", label: "Adjacent N" },
          { address: "314 Elmwood St, Athens, TX 75751", label: "Adjacent NE" },
          { address: "310 Elmwood St, Athens, TX 75751", label: "Adjacent NW" },
          { address: "311 Mayfair Dr, Athens, TX 75751", label: "2nd W" },
          { address: "315 Mayfair Dr, Athens, TX 75751", label: "2nd E" },
          { address: "316 Elmwood St, Athens, TX 75751", label: "2nd NE" },
        ], mapType: "satellite" },
        { type: "flags", items: [
          { band: "GREEN", title: "Lot 14 Block 6 boundaries confirmed — no encroachment detected", detail: "All 4 boundary lines verified against plat. No structure encroachment from adjacent parcels." },
          { band: "YELLOW", title: "Utility easement: 10-ft strip along NE boundary — recorded 1989 Doc #89-04412", detail: "Henderson County Electric Co-op. Easement runs with the land and transfers with title. No active infrastructure dispute." },
          { band: "BLUE", title: "Adjacent parcel 309 Mayfair: access easement over rear 20 ft — recorded 2001 Doc #2001-11887", detail: "Neighbor's driveway easement. Disclosed in commitment. Buyer acknowledged." },
          { band: "BLUE", title: "Adjacent parcel 312 Elmwood: shared fence — no recorded boundary agreement", detail: "Physical fence on NW corner appears to follow lot line. No recorded fence agreement. Survey recommended." },
          { band: "GREEN", title: "All 8 adjacent parcels checked — no undisclosed access claims", detail: "SOCIII adjacency scan complete. No adverse claims detected on any adjacent title." },
        ] },
        { type: "prose", items: [
          { band: "BLUE", title: "Why SOCIII pulls adjacent titles — and why incumbents don't", body: "Traditional title companies run one search: the subject parcel. SOCIII runs every parcel within a 2-lot radius. That catches cross-boundary easements, shared-well agreements, access strips, and mineral severances recorded on the neighbor's deed — not yours. This is the adjacency moat: a title company running SOCIII catches issues before close that competitors miss entirely." },
        ] },
      ] },
      { id: "rights-stack", label: "Rights Stack", description: "What the buyer actually owns — every legal stratum from airspace to mineral depth. Texas is a prior-appropriation mineral state. Rights can be severed, leased, or encumbered independently; this stack shows what transferred with the deed and what didn't.", blocks: [
        { type: "prose", items: [
          { band: "WHITE", title: "Texas mineral law — prior appropriation state", body: "Texas severed mineral rights are extremely common. Every conveyance must be checked. Surface rights and mineral rights can transfer independently. The stack below shows what this deed conveys." },
        ] },
        { type: "strata", items: [
          { elev: "above", name: "Airspace rights", badge: "Held", band: "GREEN", detail: "No TDR severance · FAA Part 77 clear at 512 ft MSL · no view easement recorded" },
          { elev: "above", name: "Solar / wind rights", badge: "Unverified", band: "BLUE", detail: "No solar easement or wind turbine lease on record · verify TX PUC if commercial use" },
          { elev: "surface", name: "Surface rights — fee simple", badge: "Held · conveyed", band: "GREEN", detail: "Troy Garris Trust → Sara Kahele · Henderson County Deed Book 214 · marketable" },
          { elev: "surface", name: "Water rights — surface", badge: "Municipal supply", band: "GREEN", detail: "City of Athens water service · no private well · no riparian claim" },
          { elev: "surface", name: "Carbon / sequestration credits", badge: "Not detected", band: "BLUE", detail: "No registered carbon credit program on record for this parcel · 0.34 ac residential" },
          { elev: "below", name: "Mineral rights — oil & gas", badge: "SEVERED — 1978", band: "RED", detail: "Henderson County Mineral Deed Book 41 pg 188 · minerals reserved to Garris Family LP · NOT conveyed · verify active lease status with TX RRC" },
          { elev: "below", name: "Mineral rights — coal / other", badge: "SEVERED — 1978", band: "RED", detail: "Follows 1978 mineral severance · same reservation · no active mining lease detected" },
          { elev: "below", name: "Subsurface easements (utilities/fiber)", badge: "Active — TXU", band: "YELLOW", detail: "TXU gas distribution line recorded 1992 Doc #92-07741 · 5-ft bore easement along east lot line · transfers with land" },
        ] },
        { type: "flags", items: [
          { band: "RED", title: "MINERAL RIGHTS SEVERED 1978 — buyer does not receive oil, gas, or mineral rights", detail: "Henderson County Mineral Deed Book 41 pg 188. This is disclosed in the commitment. Garris Family LP retains all subsurface mineral rights. A surface owner cannot prevent mineral owner from reasonable access under TX law." },
          { band: "YELLOW", title: "TX Railroad Commission: no active drilling permit on this parcel or within 1,000 ft", detail: "ATTOM data as of search date. Verify with TX RRC for current status — permits can be filed at any time." },
          { band: "BLUE", title: "Recommend: mineral rights disclosure acknowledged in writing by buyer at close", detail: "Buyer should sign separate mineral rights disclosure per TX Real Estate Commission guidance." },
        ] },
        { type: "prose", items: [
          { band: "YELLOW", title: "Texas mineral rights — what this means for the buyer", body: "The buyer is purchasing surface rights only. The 1978 Garris mineral severance means oil, gas, coal, and any other minerals beneath 313 Mayfair Dr belong to Garris Family LP — not the new owner. Under Texas law, the mineral owner has the right of 'reasonable' surface access to extract those minerals. No active drilling operations are detected within 1,000 feet. This is disclosed in Commitment Exception 7." },
        ] },
      ] },
      { id: "funds-tracker", label: "Funds", description: "Real-time confirmation of all funds received and cleared for this closing. Every wire event is logged to the chain.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Funds confirmed — clear to close", detail: "Wire confirmed by trace" },
          { band: "GREEN", title: "Required: $289,450", detail: "Total cash to close" },
          { band: "GREEN", title: "Received: $289,450", detail: "Confirmed received" },
        ] },
        { type: "kpis", items: [
          { label: "Purchase price", value: "$285,000", band: "WHITE" },
          { label: "Cash to close (buyer)", value: "$31,240", band: "WHITE" },
          { label: "Payoff — First National", value: "$0", band: "GREEN" },
          { label: "Recording + fees", value: "$1,210", band: "WHITE" },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "Wet close gate — CLEAR: All funds received and confirmed", detail: "All required funds on deposit and confirmed. Recording authorized per TX-T-005." },
          { band: "BLUE", title: "Fund receipt 1: Wire $289,450 · Chase Bank · Ref WR-20260728-4891 · Received 07/28/2026 9:14am", detail: "Wire trace confirmed. Chase Private Client." },
        ] },
        { type: "chain", title: "Fund event log", items: [
          { band: "GREEN", parties: "Wire received — $289,450 · Chase Private Client · Ref WR-20260728-4891 · 07/28/2026 9:14 AM CST", meta: "", tag: "Confirmed" },
          { band: "GREEN", parties: "Funds confirmed — cleared for recording · 07/28/2026 10:02 AM CST", meta: "", tag: "Clear to close" },
        ] },
        { type: "prose", items: [
          { band: "GREEN", title: "Wet close gate: OPEN FOR RECORDING", body: "Funds confirmed by wire trace WR-20260728-4891. Deed may record per TX-T-005." },
        ] },
      ] },
      { id: "wire-instructions", label: "Wire Instructions", description: "Verified escrow wire instructions for this file. Always call to verify before sending funds. We will never change wire instructions by email.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Escrow account active", detail: "ABC Title Company IOLTA" },
          { band: "YELLOW", title: "Last verified 07/28/2026", detail: "Phone verification required before any change" },
          { band: "RED", title: "Never share by email — always call to verify", detail: "(903) 675-2100" },
        ] },
        { type: "flags", items: [
          { band: "RED", title: "WIRE FRAUD WARNING: Criminals impersonate title companies to redirect wire funds.", detail: "ALWAYS call our published number (903) 675-2100 before sending any funds. We will NEVER change wire instructions by email." },
          { band: "BLUE", title: "Dual-channel verification required before any change (TX-T-007)", detail: "Any modification to wire instructions requires a new dual-channel verification call before taking effect." },
          { band: "GREEN", title: "Last verification call: 07/28/2026 9:05 AM · Authorized by: Sarah Garris · Call log ID: VC-20260728-001", detail: "Verification on file." },
        ] },
        { type: "table", title: "Wire instructions — File ATH-2026-0743",
          columns: ["Field", "Value"],
          rows: [
            { band: "WHITE", cells: ["Beneficiary Bank", "First Bank of Texas — Athens"] },
            { band: "WHITE", cells: ["ABA Routing", "111900659"] },
            { band: "WHITE", cells: ["Account Name", "ABC Title Company IOLTA"] },
            { band: "WHITE", cells: ["Account Number", "XXXXXXX4821 (provided verbally only)"] },
            { band: "WHITE", cells: ["Reference", "File #ATH-2026-0743 — 313 Mayfair Dr"] },
          ] },
        { type: "prose", items: [
          { band: "YELLOW", title: "Verification status", body: "Instructions above were verified via phone on 07/28/2026. Any future change requires a new dual-channel verification call per TX-T-007 before the new instructions take effect." },
        ] },
      ] },
      { id: "closing-disclosure", label: "Closing Disclosure", description: "Required disclosures for 313 Mayfair Dr — buyer and seller acknowledgment status. All items must be marked acknowledged before closing can proceed.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Disclosure package sent 07/25/2026", detail: "Delivered to buyer and seller per RESPA/TRID" },
          { band: "GREEN", title: "3-day waiting period complete 07/28/2026", detail: "Federal clear-to-close satisfied" },
          { band: "GREEN", title: "All disclosures acknowledged", detail: "12 of 12 items complete" },
        ] },
        { type: "table", title: "Required disclosures — File ATH-2026-0743",
          columns: ["Disclosure Item", "Required By", "Status"],
          rows: [
            { band: "GREEN", cells: ["Seller's Disclosure Notice (TREC OP-H)", "TREC / Texas Property Code §5.008", "Acknowledged — 07/20/2026"] },
            { band: "GREEN", cells: ["Lead-Based Paint Disclosure", "HUD/EPA (24 CFR §35, 40 CFR §745)", "N/A — home built 1994 (post-1978)"] },
            { band: "GREEN", cells: ["Flood Zone / FEMA Determination", "RESPA / NFIP", "Acknowledged — Zone X (low risk) · 07/21/2026"] },
            { band: "GREEN", cells: ["Survey Authorization", "TREC Promulgated Contract §6", "Acknowledged — existing survey accepted · 07/19/2026"] },
            { band: "GREEN", cells: ["HOA Disclosure", "Texas Property Code §207", "N/A — no HOA for subject property"] },
            { band: "GREEN", cells: ["MUD / Utility District Disclosure", "Texas Water Code §49.452", "N/A — Henderson County / City of Athens utilities"] },
            { band: "GREEN", cells: ["Wire Fraud / Cybersecurity Warning (SB 2087)", "Texas SB 2087 (2023)", "Acknowledged — buyer signed 07/25/2026"] },
            { band: "GREEN", cells: ["Affiliated Business Arrangement Disclosure", "RESPA §8(c)(4)", "Acknowledged — no affiliates involved · 07/25/2026"] },
            { band: "GREEN", cells: ["FIRPTA Certification", "IRC §1445", "Acknowledged — seller certified US person · TX-T-009 · 07/25/2026"] },
            { band: "GREEN", cells: ["Homeowner's Insurance Disclosure", "Texas Insurance Code", "Acknowledged — buyer selects own carrier · 07/25/2026"] },
            { band: "GREEN", cells: ["Right of Rescission Notice", "TILA / Regulation Z", "N/A — purchase transaction (not refinance)"] },
            { band: "GREEN", cells: ["3-Day RESPA Waiting Period Acknowledgment", "TRID / 12 CFR §1026.19(f)", "Acknowledged — CD delivered 07/25 · cleared 07/28/2026"] },
          ] },
        { type: "flags", items: [
          { band: "GREEN", title: "TDI promulgated title rate applied", detail: "Owner's policy $1,650 per Henderson County rate schedule. No lender policy required — cash purchase. Remittance to underwriter held pending recording (see Disbursements)." },
          { band: "BLUE", title: "Environmental hazards — no flags", detail: "Phase I not required for standard residential purchase. No known USTs, no prior industrial use. Seller's Disclosure (OP-H) Item 7 — no known hazardous waste." },
        ] },
      ] },
      { id: "disbursements", label: "Disbursements", description: "All post-close disbursements held pending county recording confirmation. Every disbursement will log as a title.funds_disbursed chain event.", blocks: [
        { type: "heroes", items: [
          { band: "YELLOW", title: "Post-close — disbursements pending", detail: "Held pending recording confirmation" },
          { band: "WHITE", title: "Total received: $289,450", detail: "Confirmed on deposit" },
          { band: "WHITE", title: "Total disbursed: $0", detail: "Held for recording" },
        ] },
        { type: "flags", items: [
          { band: "YELLOW", title: "Deed not yet recorded — disbursements held until recording confirmed (TX-T-005)", detail: "No funds will be released until Henderson County confirms recording." },
          { band: "BLUE", title: "1031 exchange: not applicable for this transaction", detail: "Seller confirmed this is not a 1031 exchange." },
        ] },
        { type: "table", title: "Disbursement schedule — File ATH-2026-0743",
          columns: ["Payee", "Amount", "Method", "Status"],
          rows: [
            { band: "YELLOW", cells: ["Listing agent commission (Garris Realty)", "$8,550", "Check", "Pending — held for recording"] },
            { band: "YELLOW", cells: ["Buyer's agent commission (Henderson Real Estate)", "$8,550", "Check", "Pending — held for recording"] },
            { band: "GREEN", cells: ["Henderson County tax authority", "$0", "N/A", "Current — no delinquency"] },
            { band: "YELLOW", cells: ["Attorney/escrow fee — Garris Horn LLP", "$550", "Check", "Pending"] },
            { band: "YELLOW", cells: ["Seller net proceeds — Troy Garris Trust", "$278,540", "Wire", "Pending — held for recording"] },
            { band: "YELLOW", cells: ["Recording fees — Henderson County Clerk", "$127", "Check", "Pending"] },
            { band: "YELLOW", cells: ["Title insurance premium — remit to underwriter", "$1,650", "ACH", "Pending"] },
          ] },
        { type: "prose", items: [
          { band: "YELLOW", title: "Disbursement hold", body: "All disbursements are held pending county recording confirmation. Every disbursement will be logged as a title.funds_disbursed chain event on the SOCIII ledger." },
        ] },
      ] },
      { id: "closing-status", label: "Close Status", description: "Milestone-by-milestone closing status for File ATH-2026-0743. Recording is in progress; every event is appended to the SOCIII chain — an immutable private ledger that exists in parallel to the county recorder. Title companies with SOCIII know about a close within seconds. The county recorder takes hours or days.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Funds confirmed", detail: "Wire trace WR-20260728-4891" },
          { band: "YELLOW", title: "Recording in progress", detail: "Henderson County Clerk — submitted 07/28/2026 2:30 PM" },
          { band: "WHITE", title: "Policy issue — pending", detail: "Awaiting recording number" },
        ] },
        { type: "chain", title: "Chain of title — ATH-2026-0743 (append-only · SOCIII ledger)", items: [
          { band: "GREEN", parties: "Search opened — 313 Mayfair Dr, Athens TX 75751 · Examiner: ABC Title Company", meta: "title.search_opened · Block 0 · 07/14/2026", tag: "Anchored" },
          { band: "GREEN", parties: "Title commitment issued — Stewart Title Guaranty · Schedule A + B exceptions attached", meta: "title.commitment_issued · Block 1 · 07/18/2026", tag: "Anchored" },
          { band: "GREEN", parties: "Adjacency scan — 9 parcels · 1 utility easement flagged · no undisclosed access claims", meta: "title.adjacency_scan · Block 2 · 07/18/2026", tag: "Anchored" },
          { band: "GREEN", parties: "Wire instructions verified — dual-channel phone verification · Sarah Garris · VC-20260728-001", meta: "title.wire_verified · Block 3 · 07/28/2026 9:05 AM", tag: "Anchored" },
          { band: "GREEN", parties: "Closing disclosure sent to buyer · 3-day RESPA waiting period started", meta: "title.disclosure_sent · Block 4 · 07/25/2026", tag: "Anchored" },
          { band: "GREEN", parties: "3-day waiting period complete · buyer cleared to sign", meta: "title.waiting_period_cleared · Block 5 · 07/28/2026 8:00 AM", tag: "Anchored" },
          { band: "GREEN", parties: "Wire received $289,450 · Chase Private Client · Ref WR-20260728-4891", meta: "title.funds_received · Block 6 · 07/28/2026 9:14 AM", tag: "Anchored" },
          { band: "GREEN", parties: "Wet close gate OPEN — all funds confirmed, recording authorized per TX-T-005", meta: "title.wet_close_authorized · Block 7 · 07/28/2026 10:02 AM", tag: "Anchored" },
          { band: "YELLOW", parties: "Deed submitted for recording — Henderson County Clerk · File ATH-2026-0743", meta: "title.deed_submitted · Block 8 · 07/28/2026 2:30 PM — PENDING county confirmation", tag: "Pending" },
          { band: "WHITE", parties: "County recording number confirmed — SOCIII chain event auto-triggered", meta: "title.deed_recorded · Block 9 · pending", tag: "Pending" },
          { band: "WHITE", parties: "Title policy issued — Stewart Title Guaranty · owner's policy $285,000", meta: "title.policy_issued · Block 10 · pending", tag: "Pending" },
          { band: "WHITE", parties: "Vault delivery — deed + policy auto-added to buyer's SOCIII Vault DTC records", meta: "title.vault_delivered · Block 11 · pending", tag: "Pending" },
        ] },
        { type: "flags", items: [
          { band: "YELLOW", title: "County recording pending — Henderson County typical turnaround 2–4 hours", detail: "Once the county confirms the recording number, Block 9 closes and disbursements release automatically." },
          { band: "BLUE", title: "SOCIII vs. county recorder: why this matters", detail: "The county recorder is authoritative but slow — 2-4 hours to days depending on jurisdiction. SOCIII's append-only chain records every event within seconds of it happening. A title company running SOCIII can see 100% of its own closings in real time. If every title company in Henderson County ran SOCIII, real estate activity would be visible within seconds — not after the county records it." },
          { band: "BLUE", title: "After recording: deed + policy auto-deliver to buyer's SOCIII Vault", detail: "Michael & Sarah Chen will receive their deed and owner's policy as permanent DTC records in their personal Vault — accessible forever, from any device." },
        ] },
        { type: "prose", items: [
          { band: "BLUE", title: "The chain-of-title moat — why this is defensive IP", body: "Every event in this file — from search open to vault delivery — is appended to an immutable SOCIII ledger and anchored externally (Patent 64/073,700). That ledger is the chain of title. A title company running SOCIII owns the most current, most granular private record of real estate activity in their county. When the county recorder finally catches up, SOCIII already knows. This is not a workflow tool. This is title plant infrastructure." },
          { band: "WHITE", title: "Data source note — ATTOM vs FirstAm", body: "Current data source: ATTOM Property Data (ownership, AVM, tax, lien flags, recording dates). Phase 2 upgrade to First American DataTree would additionally provide: recorded document PDFs, plat maps, exception document images. Currently unavailable via ATTOM — obtain physical copies from Henderson County Clerk for commitment exceptions." },
        ] },
      ] },
    ],
  },

  // ───────────────────────── DEFECT TRACKER ─────────────────────────
  "re-title-defects-001": {
    title: "Defect Tracker — 313 Mayfair Dr, Athens TX 75751",
    subtitle: "File ATH-2026-0743 · Henderson County · 0 open defects · Clear to close",
    disclaimer: "General information — not certified legal advice",
    cas: { RED: 0, YELLOW: 0, BLUE: 1, WHITE: 0, GREEN: 3 },
    tabs: [
      { id: "active", label: "Active Defects", description: "All open title defects by severity — P0 (blocking), P1 (curative required before close), P2 (advisory). Nothing closes until every P0 and P1 is green.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "P0 defects — 0", detail: "No blocking defects" },
          { band: "GREEN", title: "P1 defects — 0", detail: "All curative complete" },
          { band: "BLUE", title: "P2 advisory — 1", detail: "Noted · no action required" },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "File ATH-2026-0743 — clear to close", detail: "All P0 and P1 defects resolved. RAAS gate title_defects_cleared: PASS. Commitment Engine unlocked." },
          { band: "BLUE", title: "P2 Advisory · NW corner fence — no recorded boundary agreement", detail: "Physical fence appears to follow lot line. No recorded fence agreement. Survey recommended but not required for this cash purchase. Buyer acknowledged." },
        ] },
      ] },
      { id: "curative", label: "Curative Actions", description: "Documents and steps required to clear each defect. Alex drafts standard curative language; one-click send to the relevant party via Gmail.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Mineral severance — CLEARED", detail: "Schedule B-2 Exception 7 inserted · buyer disclosure signed" },
          { band: "GREEN", title: "1988 tax sale deed — CLEARED", detail: "Stewart Title indemnity obtained · underwriter approved" },
          { band: "BLUE", title: "P2 fence advisory — no action", detail: "No curative required" },
        ] },
        { type: "table", columns: ["Defect", "Curative Action", "Status", "Cleared By"], rows: [
          { band: "GREEN", cells: ["Mineral severance 1978", "Schedule B-2 Exception + TX RE Commission mineral disclosure form", "Cleared", "Troy Garris / Sara Kahele — signed 07/15/2026"] },
          { band: "GREEN", cells: ["1988 tax sale deed", "Stewart Title Guaranty indemnity endorsement", "Cleared", "Stewart Title — file ATH-2026-0743 — 07/17/2026"] },
          { band: "BLUE", cells: ["NW fence boundary", "Survey recommended", "Advisory only", "No action taken — P2"] },
        ] },
      ] },
      { id: "cleared", label: "Cleared Defects", description: "Immutable record of every defect that was found and cleared. Cleared events cannot be reopened — new defect must be opened if an issue resurfaces.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "2 defects cleared", detail: "Both P1s resolved before commitment" },
          { band: "GREEN", title: "Anchored to ledger", detail: "Clearance events hash-chained with chain of title" },
          { band: "BLUE", title: "1 advisory noted", detail: "P2 fence — buyer acknowledged" },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "P1 CLEARED · Mineral severance disclosure", detail: "Exception 7 inserted in Schedule B-2. Texas RE Commission mineral disclosure form signed by buyer Sara Kahele and seller Troy Garris Trust. Recorded 07/15/2026. ATTOM data confirmed — mineral rights severed 1978 federal conveyance Doc #1978-00882." },
          { band: "GREEN", title: "P1 CLEARED · 1988 tax sale deed — redemption risk", detail: "Search confirms no active redemption claim. Stewart Title Guaranty endorsement obtained File ATH-2026-0743. Underwriter sign-off: [Stewart Title Guaranty] 07/17/2026. Cost: $450 endorsement fee, debited from escrow." },
          { band: "BLUE", title: "P2 Noted · NW corner fence boundary advisory", detail: "Physical fence on NW corner appears to follow lot line per plat. No encroachment detected. No recorded agreement. Survey recommended — buyer declined at this purchase price. Advisory noted in closing file." },
        ] },
      ] },
      { id: "critical-path", label: "Critical Path", description: "Open defects mapped against the projected close date. Alex alerts if any curative deadline is at risk of delaying close.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "All defects cleared before commitment", detail: "No critical path risk" },
          { band: "GREEN", title: "Close date: July 28, 2026", detail: "On schedule · RAAS green" },
          { band: "GREEN", title: "Commitment issued: July 18, 2026", detail: "Valid 90 days · expires Oct 17" },
        ] },
        { type: "table", columns: ["Milestone", "Date", "Status"], rows: [
          { band: "GREEN", cells: ["Title search ordered", "July 10, 2026", "Complete"] },
          { band: "GREEN", cells: ["Mineral disclosure signed", "July 15, 2026", "Complete"] },
          { band: "GREEN", cells: ["Stewart Title indemnity", "July 17, 2026", "Complete"] },
          { band: "GREEN", cells: ["Title commitment issued", "July 18, 2026", "Complete"] },
          { band: "BLUE", cells: ["Projected close date", "July 28, 2026", "On schedule"] },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "RAAS gate: title_defects_cleared — PASS", detail: "All P0 and P1 defects have corresponding cleared events in the title order ledger. Commitment Engine unlocked. Underwriting Review accessible." },
        ] },
      ] },
    ],
  },

  // ───────────────────────── COMMITMENT ENGINE ─────────────────────────
  "re-title-commitment-001": {
    title: "Commitment Engine — 313 Mayfair Dr, Athens TX 75751",
    subtitle: "File ATH-2026-0743 · T-7 Commitment · Stewart Title Guaranty · Issued 07/18/2026",
    disclaimer: "General information — not certified legal advice. Title commitment issued by Stewart Title Guaranty Company under Texas Department of Insurance promulgated form T-7.",
    cas: { RED: 0, YELLOW: 1, BLUE: 3, WHITE: 1, GREEN: 8 },
    tabs: [
      { id: "schedule-a", label: "Schedule A", description: "The facts: current vesting, legal description, proposed insured, policy type, and consideration. All pulled from the title order — no manual entry.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Schedule A — verified", detail: "Vesting · legal description · insured confirmed" },
          { band: "GREEN", title: "Owner's policy — $285,000", detail: "ALTA 2021 · Sara Kahele · Stewart Title" },
          { band: "GREEN", title: "Effective date — 07/18/2026", detail: "Valid 90 days · expires 10/17/2026" },
        ] },
        { type: "kpis", items: [
          { label: "Current vesting", value: "Troy Garris Trust", band: "GREEN" },
          { label: "Proposed insured", value: "Sara Kahele", band: "GREEN" },
          { label: "Policy type", value: "ALTA Owner's 2021", band: "WHITE" },
          { label: "Coverage amount", value: "$285,000", band: "GREEN" },
          { label: "Consideration", value: "$285,000 cash", band: "WHITE" },
          { label: "Effective date", value: "07/18/2026", band: "BLUE" },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "Legal description — verified against plat", detail: "Lot 14, Block 6, Mayfair Addition, Henderson County, Texas, according to the map or plat thereof recorded in Volume 8, Page 42, Plat Records of Henderson County, Texas. 0.34 acres per plat." },
          { band: "GREEN", title: "Vesting matches chain of title", detail: "Troy Garris Trust (Edward Garris, Trustee) confirmed as record owner per Trustee Deed dated June 3, 2014, Rec. 2014-06031, Henderson County Deed Records. Trust certification on file." },
          { band: "BLUE", title: "Homestead status — no homestead exemption applies to buyer at time of sale", detail: "Existing homestead exemption was granted to seller Troy Garris Trust (Edward Garris). Exemption terminates on transfer. Sara Kahele may apply for exemption after acquisition." },
        ] },
      ] },
      { id: "schedule-b1", label: "Schedule B-1", description: "Requirements — everything that must happen before the policy will issue. Each requirement links to the corresponding defect. When the defect clears, the requirement auto-checks green.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "All B-1 requirements — satisfied", detail: "2 of 2 requirements met · ready to issue" },
          { band: "GREEN", title: "RAAS gate — PASS", detail: "title_commitment_ready: all conditions met" },
          { band: "BLUE", title: "Awaiting recorded deed", detail: "Deed records at close — July 28, 2026" },
        ] },
        { type: "table", columns: ["Requirement", "Description", "Status"], rows: [
          { band: "GREEN", cells: ["Req. 1", "Mineral severance disclosure — Texas RE Commission form signed by all parties", "SATISFIED — signed 07/15/2026"] },
          { band: "GREEN", cells: ["Req. 2", "1988 tax sale deed — Stewart Title Guaranty indemnity endorsement obtained", "SATISFIED — endorsement file ATH-2026-0743"] },
          { band: "BLUE", cells: ["Req. 3", "Warranty deed from Troy Garris Trust to Sara Kahele, properly executed and acknowledged, to be recorded in Henderson County Deed Records", "PENDING — records at close"] },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "Requirements 1 and 2 cleared pre-commitment — no conditions at close", detail: "Both title defects were resolved and clearance documented before commitment issuance. The only remaining requirement is the deed itself, which records at closing." },
        ] },
      ] },
      { id: "schedule-b2", label: "Schedule B-2", description: "Exceptions — what the policy does NOT cover. Standard Texas exceptions plus property-specific items. Each exception links to the underlying instrument.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "8 exceptions listed", detail: "All standard · 2 property-specific" },
          { band: "YELLOW", title: "Exception 7 — mineral severance", detail: "Required · no way to insure over" },
          { band: "BLUE", title: "Exception 8 — utility easement", detail: "Standard · no insurance coverage" },
        ] },
        { type: "table", columns: ["#", "Exception", "Type"], rows: [
          { band: "GREEN", cells: ["1", "Taxes and assessments for the year 2026 and subsequent years, not yet due and payable", "Standard"] },
          { band: "GREEN", cells: ["2", "Rights of parties in possession not shown by the public records", "Standard"] },
          { band: "GREEN", cells: ["3", "Easements, or claims of easements, not shown by the public records", "Standard"] },
          { band: "GREEN", cells: ["4", "Any encroachments, overlaps, boundary line disputes, or other matters which would be disclosed by an accurate survey or inspection of the premises", "Standard"] },
          { band: "GREEN", cells: ["5", "Any lien, or right to a lien, for services, labor, or material heretofore or hereafter furnished, imposed by law and not shown by the public records", "Standard"] },
          { band: "GREEN", cells: ["6", "Homestead rights, community property rights, survivorship rights, or other marital interests, if any", "Standard"] },
          { band: "YELLOW", cells: ["7", "Minerals and mineral rights, including but not limited to oil, gas and other minerals, as reserved in the Federal Patent recorded 1978, Volume 42, Page 88, Henderson County Deed Records. Surface rights only conveyed.", "Property-specific · Required"] },
          { band: "BLUE", cells: ["8", "Easement in favor of Henderson County Electric Cooperative for electric distribution lines over the NE 10 feet of said premises, as recorded in Document #89-04412, Henderson County Deed Records", "Property-specific · Active easement"] },
        ] },
        { type: "flags", items: [
          { band: "YELLOW", title: "Exception 7 — mineral severance is non-insurable", detail: "The 1978 federal patent reservation of mineral rights is of record and cannot be insured over. This exception is mandatory per Texas underwriting guidelines. Buyer signed separate Texas RE Commission Addendum for Reservation of Oil, Gas, and Other Minerals." },
          { band: "BLUE", title: "Exception 8 — Henderson County Electric Co-op easement", detail: "10-ft utility strip along NE boundary. Easement is active and runs with the land. No current infrastructure dispute. Standard utility exception per Stewart Title underwriting guidelines." },
          { band: "GREEN", title: "No survey exception added — cash purchase at buyer's request", detail: "Buyer Sara Kahele declined survey. Standard survey exception (#4) retained. Stewart Title approved commitment issuance without survey for this residential cash purchase under $500K." },
        ] },
      ] },
      { id: "parties", label: "Parties", description: "All parties to the transaction — buyer, seller, lender, escrow officer, title agent, underwriter.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "All parties confirmed", detail: "Buyer · Seller · Agent · Underwriter" },
          { band: "GREEN", title: "Cash purchase — no lender", detail: "No mortgage payoff required" },
          { band: "BLUE", title: "Attorney escrow", detail: "Troy Garris / Garris Horn LLP · TX-T-008" },
        ] },
        { type: "table", columns: ["Role", "Party", "Details"], rows: [
          { band: "GREEN", cells: ["Seller", "Troy Garris Trust", "Edward Garris, Trustee · 110 E Tyler St, Athens TX 75751 · Trust cert on file"] },
          { band: "GREEN", cells: ["Buyer", "Sara Kahele", "221 Lakeview Dr, Athens TX 75751 · Cash purchaser"] },
          { band: "WHITE", cells: ["Lender", "None", "Cash purchase — no lender party"] },
          { band: "BLUE", cells: ["Escrow Officer", "Troy Garris, Esq.", "Garris Horn LLP · Texas Bar #08765432 · TX-T-008 attorney escrow"] },
          { band: "GREEN", cells: ["Title Agent", "Attorneys Title, Henderson County", "Athens TX · Provisional TDI license"] },
          { band: "GREEN", cells: ["Underwriter", "Stewart Title Guaranty Company", "Houston TX · NYSE: STC · Policy #STG-ATH-2026-0743"] },
        ] },
      ] },
      { id: "issue", label: "Issue Commitment", description: "One-button commitment issuance after RAAS validates all preconditions — search complete, defects cleared, Schedule A verified, policy amount confirmed.", blocks: [
        { type: "heroes", items: [
          { band: "GREEN", title: "Commitment issued — 07/18/2026", detail: "T-7 form · Stewart Title · Hash anchored" },
          { band: "GREEN", title: "RAAS gate: title_commitment_ready — PASS", detail: "All 5 conditions satisfied" },
          { band: "BLUE", title: "Expires 10/17/2026", detail: "90-day TDI commitment validity" },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "Condition 1: Search complete", detail: "title.search_complete event recorded 07/10/2026. Data source: ATTOM Property API (owner, liens, tax). Chain covers 1978–2026 (48 years)." },
          { band: "GREEN", title: "Condition 2: No P0 defects", detail: "Zero P0 (blocking) defects in order. Both P1 defects cleared before commitment per Defect Tracker." },
          { band: "GREEN", title: "Condition 3: Vesting matches chain owner", detail: "Schedule A vesting (Troy Garris Trust) confirmed as record owner per chain-of-title event 2014-06031." },
          { band: "GREEN", title: "Condition 4: Policy amount ≥ sale price", detail: "$285,000 owner's policy coverage equals the $285,000 cash purchase price. TDI-compliant." },
          { band: "GREEN", title: "Condition 5: Commitment within 90-day validity", detail: "Committed 07/18/2026 · Projected close 07/28/2026 = 10 days. Well within 90-day TDI window." },
          { band: "BLUE", title: "Commitment hash anchored to ledger", detail: "T-7 commitment document hash (SHA-256) appended to title order ATH-2026-0743 event ledger and anchored externally per Patent 64/073,700. Tamper-evident and auditable by underwriter." },
        ] },
      ] },
    ],
  },

  // ───────────────────────── REAL ESTATE ADVOCATE ─────────────────────────
  "re-salesperson": {
    title: "Real Estate Advocate — SF Bay Area",
    subtitle: "Pure-fiduciary · no commission · works for you only",
    disclaimer: "Illustrative sample — tell me an address or search criteria to get started",
    cas: { RED: 0, YELLOW: 2, BLUE: 1, WHITE: 3, GREEN: 2 },
    tabs: [
      { id: "search", label: "Search", description: "Your property search panel. Tell me what you're looking for in the chat — location, price range, beds, baths, must-haves. I'll pull live listings and run a Comparative Market Analysis (CMA) on any address.", blocks: [
        { type: "prose", items: [
          { band: "BLUE", title: "How to search", body: "Tell me what you are looking for — location, price range, beds, baths, and any must-haves. I will pull live listings and run a Comparative Market Analysis (CMA) on any address you want to dig into. A CMA estimates a property's fair value based on recent nearby sales of similar homes. I have no commission and no financial interest in which property you choose." },
        ] },
        { type: "assetlist", title: "Sample listings — SF Bay Area",
          items: [
            {
              id: "sample-001", band: "GREEN",
              name: "2142 Ashby Ave, Berkeley, CA 94705",
              address: "3 bed · 2 bath · 1,420 sqft · 1927",
              meta: "7 days on market · $695/sqft",
              status: "Priced at estimate",
              statusBand: "GREEN",
              kpis: [
                { label: "List price", value: "$988,000" },
                { label: "CMA mid", value: "$972,000" },
                { label: "Diff", value: "+1.6%" },
                { label: "DOM", value: "7 days" },
              ],
              flags: [
                { band: "GREEN", text: "Priced within CMA range — data supports the ask" },
                { band: "WHITE", text: "Inspection contingency recommended" },
              ],
            },
            {
              id: "sample-002", band: "YELLOW",
              name: "3801 Howe St, Oakland, CA 94611",
              address: "4 bed · 2.5 bath · 2,100 sqft · 1941",
              meta: "22 days on market · $571/sqft",
              status: "Listed above estimate",
              statusBand: "YELLOW",
              kpis: [
                { label: "List price", value: "$1,199,000" },
                { label: "CMA mid", value: "$1,040,000" },
                { label: "Diff", value: "+15.3%" },
                { label: "DOM", value: "22 days" },
              ],
              flags: [
                { band: "YELLOW", text: "Listed 15% above CMA estimate — may be overpriced or have unreported renovations" },
                { band: "WHITE", text: "Run full CMA before making an offer" },
              ],
            },
          ],
        },
      ] },
      { id: "financing", label: "Financing", description: "Property-level financing facts from public data: flood zone, fire hazard, FHA/VA condo eligibility, conforming loan limits, USDA rural eligibility. Not loan advice — these are constraints that affect who can buy and at what cost.", blocks: [
        { type: "prose", items: [
          { band: "BLUE", title: "Financing constraints — how this works", body: "Enter any address and I will check flood zone (FEMA), fire hazard zone (CAL FIRE, CA only), FHA condo project eligibility (HUD), conforming loan limits (FHFA), and USDA rural eligibility. These are property facts — not loan advice. They tell you who can finance this property and at what cost, which directly affects what the property is realistically worth." },
        ] },
        { type: "flags", items: [
          { band: "WHITE", title: "Flood zone", detail: "FEMA NFHL data will appear here after you enter an address. Zone AE / VE = flood insurance required (adds to monthly carry and narrows buyer pool)." },
          { band: "WHITE", title: "Fire hazard zone", detail: "CAL FIRE FHSZ data (California only). Tier 2 / Very High = limited insurer availability. Some markets have become cash-only as carriers exit." },
          { band: "WHITE", title: "FHA / VA condo eligibility", detail: "HUD project approval status for condos. Non-approved project = eliminates FHA/VA buyers (often 20–30% of first-time buyer market)." },
          { band: "WHITE", title: "Conforming loan limit", detail: "FHFA 2025 limit for this county. Above limit = jumbo financing required — larger down payment, stricter underwriting, fewer lenders." },
          { band: "WHITE", title: "USDA rural eligibility", detail: "Whether the property is in a USDA-eligible area. USDA = 0% down option for income-qualifying buyers — expands buyer pool in rural markets." },
        ] },
      ] },
      { id: "analysis", label: "Analysis", description: "Comparable sales within the target area, price-per-sqft trend, days on market, and a fair value range. I have no financial stake in the number — if the ask is too high, I'll say so.", blocks: [
        { type: "kpis", items: [
          { label: "Median price (East Bay)", value: "$1.04M", band: "WHITE" },
          { label: "Avg days on market", value: "18 days", band: "GREEN" },
          { label: "List / sale ratio", value: "101.2%", band: "GREEN" },
          { label: "Inventory (months)", value: "1.4 mo", band: "YELLOW" },
        ] },
        { type: "bars", title: "Median sale price — East Bay · Jan–Jun 2026", items: [
          { label: "Jan", value: "$985K", pct: 81, band: "WHITE" },
          { label: "Feb", value: "$1.01M", pct: 84, band: "WHITE" },
          { label: "Mar", value: "$1.05M", pct: 87, band: "GREEN" },
          { label: "Apr", value: "$1.08M", pct: 89, band: "GREEN" },
          { label: "May", value: "$1.12M", pct: 93, band: "GREEN" },
          { label: "Jun", value: "$1.04M", pct: 86, band: "WHITE" },
        ] },
        { type: "flags", items: [
          { band: "YELLOW", title: "Seller's market — low inventory", detail: "1.4 months of supply puts pricing power with sellers. Expect competitive offers on well-priced homes." },
          { band: "WHITE", title: "List/sale ratio above 100%", detail: "Homes are selling above ask on average — budget for escalation clauses." },
        ] },
      ] },
      { id: "transaction", label: "Transaction", description: "Active transaction tracker — inspection deadline, financing contingency, appraisal, and close of escrow. I'll flag anything approaching or past a hard deadline before it costs you.", blocks: [
        { type: "prose", items: [
          { band: "WHITE", title: "No active transaction", body: "Describe a property you want to buy or sell to get started. I will create a transaction record, track key dates (inspection, financing, appraisal, close of escrow), and flag anything that needs attention." },
        ] },
        { type: "assetlist", title: "Active transactions", items: [] },
      ] },
      { id: "offer-desk", label: "Offer Desk", description: "Pre-offer strategy review. Give me the address, your target price, and contingencies. I'll compare to the Comparative Market Analysis (CMA) estimate, flag overpayment risk, and call out anything you might regret. I have no stake in whether this closes.", blocks: [
        { type: "prose", items: [
          { band: "BLUE", title: "Offer strategy — how this works", body: "Give me the address, your target price, and any contingencies you are considering. I will compare your offer to the CMA, flag any risk (waived inspection, escalation above estimate), and frame the hard truths before you commit. I have no stake in whether this closes." },
        ] },
        { type: "flags", items: [
          { band: "RED", title: "Waiving inspection contingency", detail: "This removes your right to negotiate repairs or exit based on the inspection. I will flag this every time and require explicit acknowledgment before proceeding." },
          { band: "YELLOW", title: "Offering above CMA", detail: "Offers more than 10% above the comparable-sales estimate will be flagged with a specific breakdown of what could justify the premium." },
          { band: "GREEN", title: "Financing contingency", detail: "Keeping your financing contingency protects you if the loan falls through. Waiving it is a significant risk in a rate-volatile environment." },
        ] },
      ] },
      { id: "documents", label: "Documents", description: "Disclosures, inspection report, preliminary title, HOA docs — stored here with AI-searchable flags. I'll surface anything that needs your attention before you're past your contingency deadline.", blocks: [
        { type: "prose", items: [
          { band: "WHITE", title: "Document tracking", body: "Once a transaction is active, documents — purchase agreement, disclosures, inspection report, closing disclosure — will appear here with status and any flags." },
        ] },
        { type: "table", title: "Document log",
          columns: ["Document", "Type", "Status", "Executed"],
          rows: [] },
      ] },
      { id: "market", label: "Market", description: "90-day market context: DOM trend, sale-to-list ratio, inventory levels, and rate environment. Know whether you're in a buyer's or seller's market before you make a move.", blocks: [
        { type: "kpis", items: [
          { label: "30-yr fixed rate", value: "6.82%", band: "YELLOW" },
          { label: "YoY price change", value: "+4.1%", band: "GREEN" },
          { label: "New listings (mo)", value: "1,240", band: "WHITE" },
          { label: "Foreclosure rate", value: "0.08%", band: "GREEN" },
        ] },
        { type: "bars", title: "Days on market by price band — East Bay", items: [
          { label: "Under $800K", value: "24 days", pct: 60, band: "WHITE" },
          { label: "$800K–$1.1M", value: "18 days", pct: 45, band: "GREEN" },
          { label: "$1.1M–$1.5M", value: "28 days", pct: 70, band: "YELLOW" },
          { label: "$1.5M–$2M", value: "42 days", pct: 100, band: "YELLOW" },
          { label: "Over $2M", value: "61 days", pct: 100, band: "RED" },
        ] },
      ] },
      { id: "leases", label: "Leases", signal: "card:re-lease", description: "Paste any residential or commercial lease and I'll identify the key terms, flag unfavorable clauses, and explain what you're actually agreeing to. Not legal advice — but no mystery either.", blocks: [
        { type: "prose", items: [
          { band: "BLUE", title: "How lease review works", body: "Paste a lease in the chat — or upload a PDF — and I will extract key terms, flag anything unfavorable, and explain plain-English what each clause actually means. I cover residential leases (month-to-month, fixed, Section 8) and commercial leases (NNN, gross, modified gross). This is informational — for complex negotiations or lease modifications, I will tell you when a lawyer adds value." },
        ] },
        { type: "flags", items: [
          { band: "RED", title: "Personal guarantee on commercial lease", detail: "A personal guarantee makes you individually liable for the full lease term if the business fails. Caps, burn-downs, and burn-offs are negotiable — flag before you sign." },
          { band: "RED", title: "Demolition / redevelopment clause", detail: "Landlord can terminate on short notice for redevelopment. Residential tenants in CA have strong protections; commercial tenants often do not." },
          { band: "YELLOW", title: "Annual rent escalation", detail: "CPI or fixed-percentage escalations compound. A 4% annual bump on a 5-year lease adds 22% to your base rent by year 5 — model it before committing." },
          { band: "YELLOW", title: "CAM charges (NNN)", detail: "Triple-net leases pass operating expenses through to the tenant. Uncapped CAM = unpredictable carrying cost. Look for audit rights and expense caps." },
          { band: "YELLOW", title: "Assignability and subletting rights", detail: "If you sell the business or need to exit, can you assign the lease? Most commercial leases require landlord consent — often withheld to force a lease renegotiation." },
          { band: "WHITE", title: "Option to renew / right of first refusal", detail: "Renewal options give you certainty of occupancy. ROFR lets you match any competing offer. Neither is guaranteed — they must be negotiated and recorded." },
          { band: "WHITE", title: "Tenant improvement allowance (TI)", detail: "Landlord contribution to build-out costs. TI is often capped, has a construction timeline requirement, and must be drawn down — unused TI is lost." },
          { band: "GREEN", title: "Early termination right", detail: "Mutual termination rights with defined notice and fee give you an exit. The fee is typically 1–3 months of base rent — far better than carrying an abandoned space." },
        ] },
        { type: "table", title: "Lease term extraction — paste a lease to populate",
          columns: ["Term", "Value", "Flag"],
          rows: [] },
      ] },
      { id: "list", label: "List", description: "Sell-side listing strategy — pricing, market timing, and prep ranked by ROI. I work for you, not the buyer or a commission. I'll tell you if the market won't support your target price.", blocks: [
        { type: "prose", items: [
          { band: "BLUE", title: "How listing strategy works", body: "Tell me the address and your target price. I will run a Comparative Market Analysis (CMA) — pulling recent comparable sales within a half-mile — benchmark against current competition, and build a pricing recommendation plus a prep list ranked by return on investment. I have no commission; the right price is the one the market will support." },
        ] },
        { type: "flags", items: [
          { band: "WHITE", title: "Pricing strategy", detail: "Enter an address to generate a CMA and pricing recommendation." },
          { band: "WHITE", title: "Market timing", detail: "I'll flag whether current DOM trends and inventory favor listing now vs. waiting." },
          { band: "WHITE", title: "Prep ROI", detail: "Paint, staging, landscaping — ranked by expected return vs. cost before you spend a dollar." },
          { band: "YELLOW", title: "Competitive set", detail: "Active listings competing for the same buyer will be surfaced so you know exactly what you're up against." },
        ] },
      ] },
      { id: "net-sheet", label: "Net Sheet", description: "Estimated seller proceeds at close — after commissions, transfer taxes, title fees, and any remaining mortgage. Know your actual number before you list.", blocks: [
        { type: "prose", items: [
          { band: "BLUE", title: "How the net sheet works", body: "Enter the sale price, remaining loan balance, and county. I will estimate your proceeds after agent commissions, title fees, transfer taxes, escrow, and proration. This is an estimate — the final settlement statement from escrow is the authoritative number." },
        ] },
        { type: "flags", items: [
          { band: "WHITE", title: "Sale price", detail: "Enter a price or use the CMA estimate from the List tab." },
          { band: "YELLOW", title: "Agent commission", detail: "Buyer's agent commission is now separately negotiated under the NAR settlement. The net sheet will show both sides explicitly." },
          { band: "WHITE", title: "Transfer taxes", detail: "County + city transfer taxes vary by jurisdiction — I will look up the applicable rate." },
          { band: "WHITE", title: "Title + escrow", detail: "Estimated from market-rate schedules. Actual fees from the title company will differ slightly." },
          { band: "WHITE", title: "Mortgage payoff", detail: "Your remaining loan balance plus any prepayment penalty or per-diem interest." },
        ] },
        { type: "table", title: "Net sheet estimate — enter details to populate",
          columns: ["Line item", "Amount", "Notes"],
          rows: [] },
      ] },
      { id: "exchange", label: "Exchange & Structure", description: "Alternative deal structures: 1031 exchange, seller financing, sale-leaseback, and land contract. I'll identify which applies to your situation and what each one costs to execute.", blocks: [
        { type: "prose", items: [
          { band: "BLUE", title: "Structure options — how this works", body: "A standard sale is one option. Depending on your equity, tax situation, and what the buyer needs, there may be a better structure. Tell me what you own and what you want to do next — I will identify whether a 1031, seller carry, or leaseback is worth exploring, and when you need a CPA or attorney to confirm it." },
        ] },
        { type: "flags", items: [
          { band: "GREEN", title: "1031 exchange", detail: "Defer capital gains tax by reinvesting in like-kind property within 45/180-day windows. Requires a qualified intermediary. Best when gain is large and you want to stay in real estate." },
          { band: "GREEN", title: "Seller financing (seller carry)", detail: "You act as the lender. Monthly payments, interest, and a balloon. Generates income, expands the buyer pool, and the note is a marketable asset you can sell later." },
          { band: "YELLOW", title: "Sale-leaseback", detail: "You sell the property and immediately lease it back. Common for commercial properties and business owners who need capital but want to stay in the space." },
          { band: "YELLOW", title: "Land contract (contract for deed)", detail: "Buyer pays in installments; title transfers at payoff. You retain title as security. Legal requirements vary significantly by state." },
          { band: "BLUE", title: "CPA + attorney required for any of the above", detail: "Structure strategy is directional. Tax basis, depreciation recapture, and legal transfer requirements need a CPA and real estate attorney to confirm." },
        ] },
      ] },
      { id: "path", label: "Your Path", description: "Three ways to work with me: full DIY, agent-assisted, or attorney engagement when the deal warrants it. I'll help you pick the right track and know when to escalate.", blocks: [
        { type: "prose", hero: { band: "BLUE", label: "Choose your track", headline: "Three ways to work with me", sub: "Every transaction is different. Here are the three engagement modes — and how to know which one fits." }, items: [
          { band: "GREEN", title: "Track 1 — Full DIY (you drive)", body: "I handle search, CMA, offer strategy, contract review, and deadline tracking. You deal directly with the listing agent or seller. I have no license and no commission — everything I tell you is in your interest. Best for experienced buyers or sellers who want fiduciary guidance without an agent layer." },
          { band: "WHITE", title: "Track 2 — Agent-assisted (you stay smart)", body: "You hire a licensed agent for representation and legal capacity. I work alongside as your independent analyst — so you understand everything the agent recommends before you sign it. The agent earns their commission; I make sure you know when they're right and when to push back." },
          { band: "YELLOW", title: "Track 3 — Attorney engagement", body: "Some transactions need a real estate attorney: title disputes, complex seller financing, commercial leases, estate sales, or anything with litigation risk. I'll tell you when we've hit that boundary and help you prepare the briefing so the lawyer's time costs less." },
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
      { id: "map", label: "Map", description: "All screened properties plotted by distress level. RED = entry target; YELLOW = watch list.", blocks: [
        { type: "map", region: "San Francisco, CA",
          locations: cre.filter((p) => p.lat && p.lng).map((p) => ({ address: p.address, label: short(p.address) + " · " + p.distressBand + " " + p.distressScore, lat: p.lat, lng: p.lng })) },
      ] },
      { id: "deal-screen", label: "Deal screen", description: "Distress-scored screening of every candidate property — ranked by ATTOM score. RED = entry target; YELLOW = watch list. Focus on RED first.", blocks: [
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
      { id: "underwriting", label: "Underwriting", description: "Deep-dive on the top distressed asset: acquisition price vs estimated current value, basis reset opportunity, and the checks required before you sign an LOI.", blocks: [
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
      { id: "sensitivity", label: "Sensitivity", description: "Distress score comparison across the full candidate set — ranked so you can see the delta between entry targets and watch-list properties.", blocks: [
        { type: "heroes", items: [
          { band: "RED", title: reds.length + " RED", detail: "Entry targets · cap-stack play" },
          { band: "YELLOW", title: yellows.length + " YELLOW", detail: "Watch list — monitor" },
          { band: "GREEN", title: greens.length + " GREEN", detail: "Lower signal — watch" },
        ] },
        { type: "bars", title: "Distress score by candidate — ATTOM-scored",
          items: cre.slice(0, 10).map((p) => ({ label: short(p.address), value: String(p.distressScore ?? ""), pct: Number(p.distressScore) || 0, band: p.distressBand })) },
      ] },
      { id: "capital-stack", label: "Capital stack", description: "The capital stack thesis for the top candidate: senior debt position, your proposed mezzanine or preferred equity entry point, and IRR targets.", blocks: [
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
      { id: "decision", label: "Decision memo", description: "The analyst's recommendation: which assets to pursue, in which order, and the exact next steps required before committing capital.", blocks: [
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

// ───────────────────────── REAL ATTOM ENRICHMENT (S52.50, #34) ──────────────
// Weave REAL ATTOM parcel data into each RE worker. The subject property — map,
// Street View photo, a live parcel-facts panel, and the real recorded sale —
// becomes a live ATTOM pull. The deeper title/zoning/feasibility ANALYSIS below
// stays illustrative and is labeled as such. Honest by construction: we never
// attach a fabricated owner/lien to a real address — only ATTOM-returned facts.
const _money = (n) => (n == null ? null : "$" + Number(n).toLocaleString());

function attomSubjectFacts(a) {
  const items = [
    { label: "APN", value: a.apn || "—", band: "WHITE" },
    { label: "Property type", value: a.propType || "—", band: "WHITE" },
  ];
  if (a.yearBuilt) items.push({ label: "Year built", value: String(a.yearBuilt), band: "WHITE" });
  if (a.lotSizeAcres) items.push({ label: "Lot size", value: a.lotSizeAcres + " ac", band: "WHITE" });
  if (a.bldgSqft) items.push({ label: "Building", value: Number(a.bldgSqft).toLocaleString() + " sqft", band: "WHITE" });
  const s0 = a.sales && a.sales[0];
  if (s0 && s0.amount) items.push({ label: "Last recorded sale", value: _money(s0.amount) + " · " + (s0.date || ""), band: "GREEN" });
  else if (s0 && s0.date) items.push({ label: "Last recorded sale", value: s0.date, band: "WHITE" });
  return { type: "kpis", items };
}

function enrichWithAttom(spec, a) {
  if (!spec || !a || !a.found) return spec;
  const next = { ...spec, tabs: spec.tabs.map((t) => ({ ...t, blocks: [...t.blocks] })) };
  const lead = String(spec.title || "").split("—")[0].trim();
  next.title = (lead ? lead + " — " : "") + a.address;
  next.subtitle = "Tier-R · APN " + a.apn + " · Live ATTOM pull";
  next.disclaimer = "Subject property + parcel data: live ATTOM pull. Analysis below is illustrative of the worker's output.";
  next.attomLive = true;
  const t0 = next.tabs[0];
  // Point the map + photo at the real subject property.
  t0.blocks = t0.blocks.map((b) => {
    if (b.type === "map") return { ...b, address: a.address, locations: undefined, region: undefined };
    if (b.type === "streetview" || b.type === "image") return { ...b, address: a.address, label: a.address };
    return b;
  });
  // Insert the real parcel-facts panel right after the map/photo lead.
  let insertAt = 0;
  for (let i = 0; i < t0.blocks.length; i++) {
    if (["map", "streetview", "image"].includes(t0.blocks[i].type)) insertAt = i + 1;
  }
  t0.blocks.splice(insertAt, 0, attomSubjectFacts(a));
  return next;
}

for (const slug of Object.keys(RE_WORKER_ATTOM)) {
  if (RE_CANVAS[slug]) RE_CANVAS[slug] = enrichWithAttom(RE_CANVAS[slug], RE_WORKER_ATTOM[slug]);
}

// S52.46/#34 — fabrication disclosure. cre-analyst + the ATTOM-enriched workers
// carry REAL parcel data, so they are NOT blanket-"sample" — they show the
// honest "live parcel · illustrative analysis" disclaimer instead. Everything
// else still shows the SAMPLE badge.
for (const k of Object.keys(RE_CANVAS)) {
  RE_CANVAS[k].sample = !RE_CANVAS[k].attomLive && !(k === "cre-analyst" && _creIsReal);
}

// Slug aliases — some surfaces (CampaignPage, AddWorkspaceWizard, the catalog
// JSON) refer to the CRE worker as "cre-deal-analyst"; the live worker + canvas
// key is "cre-analyst". Alias so the designed canvas resolves either way.
// "title-advocate-001" is the user-facing name alias for "re-escrow-001".
const RE_CANVAS_ALIASES = {
  "cre-deal-analyst": "cre-analyst",
  "title-advocate-001": "re-escrow-001",
  "defect-tracker-001": "re-title-defects-001",
  "commitment-engine-001": "re-title-commitment-001",
};

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
