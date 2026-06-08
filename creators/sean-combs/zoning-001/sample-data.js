/**
 * Sample data for `zoning` worker (ZONING-001) — consumer-side.
 *
 * One entry per canvasTab.id. Illustrative Lahaina HI coastal R-2 parcel (same
 * parcel family as LAW-LANDUSE for the demo's "one parcel, two lenses" coastal
 * story). Code sections shown (Maui County Code §19.xx, HI HRS §46-4) are
 * synthetic_for_demo_only — production cites the live resolver only (EH-01).
 */

export const SAMPLE_CANVAS_PAYLOADS = {
  "zoning-verdict": {
    title: "Zoning — Coastal post-fire parcel · Lahaina HI · R-2 Two-Family Residential",
    subtitle: "Tier-R · Maui County Code · Anchored",
    cas: { red: 1, yellow: 2, blue: 2, white: 1, green: 3 },
    disclaimer: "General info — not legal advice",
    verdicts: [
      { band: "GREEN", title: "Single-family rebuild", detail: "By-right · ministerial" },
      { band: "YELLOW", title: "Duplex", detail: "Allowed with conditions" },
      { band: "RED", title: "Triplex+", detail: "Rezone required" },
    ],
    kpis: { zoning: "R-2", maxHeight: "30 ft", lotCoverage: "45%", parkingMin: "2/unit" },
    entitlementPath: [
      { path: "Single-family rebuild — ministerial", cas: "GREEN", detail: "Building permit only · ~60 days", fees: "$500–2K" },
      { path: "Duplex — conditional use permit", cas: "YELLOW", detail: "Planning review · neighbor notification · 60–90 days", fees: "$2–5K" },
      { path: "Triplex+ — legislative rezone", cas: "RED", detail: "12–18 months · planning commission + council hearings", fees: "$30–80K" },
    ],
    restrictions: [
      { label: "SMA permit", value: "Any structure", cas: "RED" },
      { label: "Height limit", value: "30 ft max", cas: "YELLOW" },
      { label: "Coastal setback", value: "40 ft from MHW", cas: "YELLOW" },
      { label: "Front setback", value: "10 ft", cas: "WHITE" },
      { label: "Side setback", value: "5 ft each side", cas: "WHITE" },
      { label: "Rear setback", value: "15 ft", cas: "WHITE" },
      { label: "Lot coverage", value: "45% max", cas: "WHITE" },
      { label: "Parking", value: "2 spaces/unit", cas: "WHITE" },
      { label: "FAR allowed", value: "0.55", cas: "GREEN" },
      { label: "Min lot", value: "5,000 sqft", cas: "GREEN" },
    ],
  },

  "permitted-uses": {
    title: "Permitted uses — Maui County R-2",
    subtitle: "6 uses analyzed · Maui County R-2",
    cas: { red: 1, yellow: 2, blue: 2, white: 1, green: 3 },
    summary: { byRight: 4, conditional: 1, notPermitted: 1 },
    uses: [
      { use: "Single-family residence", cas: "GREEN", status: "By-right — ministerial", detail: "No hearing. Building permit only.", timeline: "~60 days · $500–2K", code: "Maui County Code §19.12" },
      { use: "Accessory dwelling unit (ADU)", cas: "GREEN", status: "By-right — ministerial", detail: "State law SB 9 equivalent · ministerial.", timeline: "~60 days · $500–1K", code: "HI HRS §46-4" },
      { use: "Duplex / two-family residence", cas: "YELLOW", status: "Conditional — CUP required", detail: "Planning dept review · neighbor notification.", timeline: "60–90 days · $2–5K", code: "Maui County Code §19.14" },
      { use: "Home occupation / office", cas: "GREEN", status: "By-right — with conditions", detail: "No client visits · no signage · no employees.", timeline: "Immediate · no fee", code: "Maui County Code §19.08" },
      { use: "Short-term rental (STR)", cas: "YELLOW", status: "STR permit required", detail: "Maui County STR-2024 program.", timeline: "30–60 days · $500–1K", code: "Maui County STR-2024" },
      { use: "Multi-family 3+ units", cas: "RED", status: "NOT PERMITTED — rezone required", detail: "R-2 → R-3 legislative rezone.", timeline: "12–18 months · $30–80K", code: "Maui County Code §19.16" },
    ],
    flags: [
      { cas: "RED", title: "SMA permit required for all uses", detail: "Coastal zone overlay active. No exemption." },
      { cas: "YELLOW", title: "STR — Maui County permit required", detail: "STR-2024 program. Limited island-wide STR permits.", action: "Check STR availability" },
      { cas: "BLUE", title: "HOA CC&Rs may further restrict uses", detail: "Not yet verified. Upload to confirm.", action: "Upload CC&Rs" },
      { cas: "GREEN", title: "4 by-right uses confirmed — no hearing needed", detail: "Single-family, ADU, home office all ministerial." },
    ],
  },

  "overlays": {
    title: "Hyper-local overlay check — 5 layers · EH-05 gap declaration",
    subtitle: "Overlays can restrict what zoning permits. Always check all layers.",
    cas: { red: 1, yellow: 2, blue: 2, white: 1, green: 3 },
    summary: { activeReview: 2, activeHardStop: 1, clearOrNA: 2 },
    overlayCards: [
      { cas: "RED", label: "HARD STOP", title: "Special Management Area (SMA)", code: "Maui County Code §19.04.040", status: "ACTIVE · Hard stop — SMA permit required for ANY structure.", detail: "No post-disaster exemption at this parcel classification.", action: "Pull recorded SMA boundary" },
      { cas: "YELLOW", label: "EXPEDITES", title: "Post-Disaster Wildfire Recovery Zone", code: "Maui County Recovery Overlay (2023)", status: "ACTIVE · Qualifying: parcel eligible for expedited SMA review", detail: "Disaster declaration date: August 8 2023. Confirm parcel qualification.", action: "Confirm eligibility" },
      { cas: "BLUE", label: "GAP", title: "HOA / CC&Rs", code: "Source: title records (existence detected)", status: "DETECTED · CC&Rs not publicly indexed — content unverified.", detail: "HOA may impose restrictions beyond Maui County zoning. Upload to complete analysis.", action: "Upload CC&Rs" },
      { cas: "WHITE", label: "CLEAR", title: "FEMA Flood Zone", code: "FEMA NFIP Map Panel 15003C0325G", status: "Zone X — minimal flood hazard · outside 100-year floodplain.", detail: "No flood insurance requirement from this overlay." },
      { cas: "GREEN", label: "CLEAR", title: "Historic District", code: "NRHP + Maui County historic register", status: "NOT DETECTED · No National Register listing · No local historic.", detail: "No historic preservation restrictions apply." },
    ],
    video: { label: "Maui County SMA Permit Process — Planning Dept. Webinar", source: "planning.mauicounty.gov", verified: true },
  },

  "plain-english": {
    title: "Plain English — Lahaina HI · R-2",
    hero: { cas: "GREEN", label: "Cleared · R-2 zone", headline: "Your parcel is zoned R-2. You can rebuild single-family by right.", sub: "Going to a duplex needs a permit. Going to three units means rezoning — 12–18 months. SMA coastal permit required regardless of what you build." },
    sections: [
      { cas: "GREEN", title: "Build the same house — you're cleared", body: "Your R-2 zoning allows a single-family rebuild as a ministerial approval. That means the county has to say yes if you follow the rules. No public hearing. Timeline: ~60 days for building permit. Cost: $500–2K in fees. The one thing you still need regardless: the SMA coastal permit. See the RED section below." },
      { cas: "YELLOW", title: "Want a duplex — possible, but you need a permit", body: "R-2 zoning allows two-family use, but it requires a conditional use permit (CUP). That means a planning department review, a neighbor notification period, and a fee. Timeline: 60–90 days. Cost: $2–5K in county fees plus consultant time. Approval is not guaranteed — but with a clean application it's the normal outcome." },
      { cas: "RED", title: "Want three units or more — rezone required", body: "R-2 zoning does not allow multi-family of three or more units. Full stop. You would need a legislative rezone to R-3 — that's a 12–18 month process involving the Maui Planning Commission and the County Council. Fees: $30–80K. Only pursue this if the project economics justify an 18-month entitlement risk." },
    ],
    qa: [
      { q: "Do I need a lawyer for zoning?", a: "For a single-family rebuild — no, a good permit expediter can handle it. For a CUP or rezone, yes." },
      { q: "Does the SMA permit affect my zoning?", a: "They're separate. Zoning sets what you can build. SMA permit is a coastal overlay — required regardless." },
      { q: "Can my HOA restrict what zoning allows?", a: "Yes — HOA CC&Rs can be more restrictive than zoning. CC&Rs not yet verified for this parcel. Upload to check." },
      { q: "What if the County rejects my CUP?", a: "You can appeal to the Maui Board of Zoning Appeals within 30 days. A land use attorney is advisable." },
    ],
    actions: ["Send to Land Use Attorney", "Send to W-002 Analyst", "Export PDF", "Upload HOA CC&Rs"],
  },
};
