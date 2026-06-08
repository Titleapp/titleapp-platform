/**
 * Sample data for `law-landuse` worker (LAW-LANDUSE-001).
 *
 * One entry per canvasTab.id. Illustrative parcel only (Lahaina HI coastal
 * post-fire) — the worker is not about any specific property; use cases drive
 * demos, not addresses (spec §7). Numbers mirror the locked canvas mockups.
 * Sample comparables are synthetic_for_demo_only (RULE-13).
 */

export const SAMPLE_CANVAS_PAYLOADS = {
  "entitlement-roadmap": {
    title: "Land Use Attorney — Coastal post-fire parcel",
    subtitle: "Tier-R · illustrative Lahaina HI coastal parcel · Anchored · PLAT-008",
    cas: { red: 1, yellow: 3, blue: 2, white: 1, green: 4 },
    verdicts: [
      { band: "GREEN", title: "Like-for-like rebuild", detail: "Ministerial — cleared" },
      { band: "YELLOW", title: "Expand footprint", detail: "Contested — discretionary" },
      { band: "RED", title: "Skip SMA permit", detail: "Illegal — required" },
    ],
    kpis: {
      approvalProbability: "70%",
      medianTimeline: "9–12 mo",
      medianCost: "$30–120K",
      comparableCases: 14,
    },
    roadmap: [
      { step: "Pre-app meeting", cas: "GREEN" },
      { step: "SMA application", cas: "BLUE", note: "now" },
      { step: "Planning review", cas: "YELLOW" },
      { step: "SMA hearing", cas: "RED", note: "kill" },
      { step: "Council vote", cas: "YELLOW" },
      { step: "Recordation", cas: "WHITE" },
    ],
    flags: [
      { cas: "RED", title: "SMA permit required", detail: "Coastal zone. No exemption regardless of disaster status." },
      { cas: "YELLOW", title: "Planning commission kill risk", detail: "Neighbor appeal or scope expansion can stop the project." },
      { cas: "BLUE", title: "HOA CC&Rs not verified", detail: "Detected from title. Not publicly indexed. Upload to complete." },
      { cas: "WHITE", title: "Assessor data: 4 months old", detail: "Within freshness threshold. No action required." },
    ],
    actions: ["Send to W-002 Real Estate Analyst", "Draft pre-app agenda via PARA-001", "Export PDF", "View all 14 comparable cases"],
  },

  "citations": {
    title: "Citations — version-pinned authorities",
    subtitle: "All authorities retrieved externally (EH-01) — no model recall",
    stats: { verified: 3, unverified: 1, total: 4 },
    cards: [
      { pill: "Allows", ref: "State Coastal Management Act §205A-28", text: "Post-casualty like-for-like reconstruction permitted. Expansion beyond original footprint triggers full discretionary review.", impact: "Like-for-like rebuild is the GREEN path. Stay at original footprint.", pinned: "2025-01 rev", hash: "sha256:b7c2a4f1", retrieved: "2026-06-07" },
      { pill: "Required", ref: "County Code §19.04.040 — SMA permit", text: "SMA permit required for any structure in the Special Management Area. No post-disaster exemption at this parcel's coastal zone classification.", impact: "RED — this permit is not optional. File before breaking ground.", pinned: "2024-09 rev", hash: "sha256:a3f88c22", retrieved: "2026-06-07" },
      { pill: "Expedites", ref: "Post-Disaster Recovery Overlay (2023)", text: "Disaster-declared parcels qualify for expedited SMA review — approximately 3 months vs. standard 6 months.", impact: "GREEN — you qualify. Confirm disaster declaration date to lock in expedited track.", pinned: "2023-12 overlay", hash: "sha256:c9d1e77b", retrieved: "2026-06-07" },
      { pill: "Unverified", ref: "HOA CC&Rs — governing documents", text: "HOA existence confirmed from title records. CC&Rs not publicly indexed. Architectural review requirements unknown.", impact: "BLUE action: Upload CC&Rs to complete this authority", source: "user_supplied", verified: false },
    ],
  },

  "comparable-cases": {
    title: "Comparable cases — 14 cases",
    subtitle: "Retrieved from verifiable sources (EH-07) — no fabrication",
    outcome: { approved: 11, denied: 3, approvedPct: 79 },
    denialReasons: [
      { reason: "Footprint expansion", count: 2 },
      { reason: "Neighbor appeal sustained", count: 1 },
    ],
    likeForLikeNote: "Like-for-like scope = 0 denials in this dataset",
    timelineDistribution: [
      { band: "Under 8 mo", count: 1 },
      { band: "8–12 mo", count: 4 },
      { band: "12–15 mo", count: 4 },
      { band: "15+ mo", count: 2 },
    ],
    rows: [
      { outcome: "approved", type: "Post-fire like-for-like rebuild · Coastal zone · SMA permit", detail: "Expedited track · 4-0 commission vote · Like-for-like scope held throughout", year: 2025, duration: "9 months" },
      { outcome: "approved", type: "Post-fire rebuild · Interior reconfiguration only · SMA zone", detail: "Ministerial path accepted · No hearing required · Clean title", year: 2025, duration: "8 months" },
      { outcome: "denied", type: "Post-fire rebuild with 15% footprint expansion · Coastal zone", detail: "Denied at SMA hearing · Neighbor appeal sustained · 3-2 commissioner vote", year: 2024, duration: "Denied" },
      { outcome: "approved", type: "Post-disaster coastal rebuild · HOA governed · ARB review", detail: "HOA ARB approval added 4 months · Final approval 13 months total", year: 2024, duration: "13 months" },
      { outcome: "denied", type: "Coastal zone rebuild · 30% expansion · No disaster declaration", detail: "Denied at planning review · No expedited track · CEQA full review required", year: 2023, duration: "Denied" },
      { outcome: "approved", type: "Like-for-like post-fire · Expedited track · Clean title chain", detail: "Ministerial approval · 5-0 commission vote · No neighbor appeal", year: 2024, duration: "11 months" },
    ],
    showing: "Showing 6 of 14 · View all 14",
    verifyMethod: "synthetic_for_demo_only",
  },

  "plain-english": {
    title: "Plain English — coastal post-fire rebuild",
    hero: { cas: "GREEN", label: "Cleared", headline: "You can rebuild what burned down.", sub: "Like-for-like reconstruction is your clearest, fastest, cheapest path. Going bigger is possible but harder. Skipping the SMA permit is not an option." },
    sections: [
      { cas: "RED", title: "The one thing you cannot skip — the SMA permit", body: "Your property is in the Special Management Area — a coastal protection zone. Every rebuild, even an identical one replacing what burned, requires an SMA permit. There is no post-fire exemption. Good news: the 2023 disaster declaration gets you the expedited track." },
      { cas: "GREEN", title: "Build the same thing — green light", body: "If you rebuild what was there — same footprint, same height, same use — state law says you're entitled to do it. Estimated timeline: 9–12 months. Estimated cost: $30K–$120K. Approval probability: 70% (14 comparable cases)." },
      { cas: "YELLOW", title: "Want to build bigger — harder, not impossible", body: "The moment you go beyond your original footprint, the rules change from ministerial (county mostly must say yes) to discretionary (planning commission can say no, neighbors can appeal). 2 of 3 denials were for footprint expansions." },
      { cas: "BLUE", title: "One thing still needs checking — your HOA", body: "Title records show your property is part of a homeowner association, but the CC&Rs aren't publicly available. If your HOA has architectural review requirements, they could add months and cost. Upload CC&Rs to complete." },
    ],
    qa: [
      { q: "Do I need a lawyer for this?", a: "For like-for-like on expedited track — a good permit expediter may suffice. But post-fire coastal law is evolving. A local land use attorney reviewing before filing is worth the cost." },
      { q: "What's the biggest risk?", a: "The SMA hearing — that's where neighbor appeals kill projects. Keep scope clean and reach out to neighbors early before filing." },
    ],
    actions: ["Send to analyst", "Draft pre-app agenda", "Export PDF", "Upload CC&Rs to complete"],
  },
};
