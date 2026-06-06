/**
 * Sample data for `site-recon` worker (SITE-RECON-001).
 *
 * One entry per canvasTab.id. The anchor parcel is REAL and verified live
 * against ATTOM (9708 US Highway 191, Pinedale WY — APN 01-00-10382, the
 * Sublette County pilot parcel). Companion parcels are realistic synthetic
 * Pinedale-area entries marked Sample. The original spec's Oakland sample
 * address proved unresolvable in ATTOM (TC-065) and is not used here.
 */

export const SAMPLE_CANVAS_PAYLOADS = {
  "opportunities": {
    title: "Ranked Opportunities — Pinedale, WY (3 mi radius)",
    subtitle: "Sample search — Sublette County pilot area",
    items: [
      {
        rank: 1,
        address: "9708 US Highway 191, Pinedale, WY 82941",
        apn: "01-00-10382",
        verdict: "YELLOW",
        namedBlocker: "Stale assessor data",
        confidenceScore: 40,
        lastSale: "Off-market",
        floodZone: "X",
        opportunityZone: false,
      },
      {
        rank: 2,
        address: "112 Bridger Ave, Pinedale, WY 82941",
        apn: "01-00-10417",
        verdict: "YELLOW",
        namedBlocker: "Limited transaction history",
        confidenceScore: 35,
        lastSale: "$310K / 2019",
        floodZone: "X",
        opportunityZone: false,
      },
      {
        rank: 3,
        address: "445 E Green River Dr, Pinedale, WY 82941",
        apn: "01-00-10593",
        verdict: "YELLOW",
        namedBlocker: "Flood zone — Special Flood Hazard Area",
        confidenceScore: 30,
        lastSale: "$285K / 2021",
        floodZone: "AE",
        opportunityZone: false,
      },
    ],
    summary: {
      parcelsReturned: 3,
      green: 0,
      yellow: 3,
      red: 0,
      totalFeeUsd: 18,
      note: "Thin frontier-county data caps verdicts at YELLOW — GREEN must be earned by evaluated passes, never granted by missing data.",
    },
  },

  "historical": {
    title: "Historical — 9708 US Highway 191",
    subtitle: "Sample parcel record — Sublette County, WY",
    parcel: {
      apn: "01-00-10382",
      address: "9708 US Highway 191, Pinedale, WY 82941",
      county: "Sublette",
      state: "WY",
    },
    assessor: {
      lastModified: "2025-09-12",
      stalenessFlag: true,
      stalenessNote: "Assessor data older than 180 days — verdict capped at YELLOW",
    },
    sales: [],
    salesNote: "No recorded transactions in ATTOM for this parcel — common for rural Wyoming holdings",
    titleChain: { evaluated: false, note: "Title chain integration lands in v1.1" },
  },

  "feasibility": {
    title: "Feasibility — 9708 US Highway 191",
    subtitle: "Sample verdict card",
    verdict: "YELLOW",
    namedBlocker: "Stale assessor data",
    confidenceScore: 40,
    flags: [
      "missing_avm",
      "no_sales_history",
      "assessor_data_age_180plus",
      "owner_record_incomplete",
      "title_chain_not_evaluated",
    ],
    overlays: {
      floodZone: "X",
      coastalCommission: false,
      historicDistrict: false,
      opportunityZone: false,
      evaluated: true,
    },
    actions: ["Go Deeper (cost gate)", "Handoff to W-002", "Save to Vault"],
  },
};
