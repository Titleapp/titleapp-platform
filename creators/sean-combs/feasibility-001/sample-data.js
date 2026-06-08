/**
 * Sample data for `feasibility` worker (FEASIBILITY-001) — Market & Feasibility
 * Study.
 *
 * One entry per canvasTab.id. Illustrative Lahaina HI 96761 · proposed 24-unit
 * luxury rental (Tier-R, lender-defensible). Comps + sources shown are
 * synthetic_for_demo_only with provenance fields (EH-07). NOT financial
 * underwriting (W-002) — this is the demand/supply/comps market study.
 */

export const SAMPLE_CANVAS_PAYLOADS = {
  "demand": {
    title: "Feasibility & market study — Lahaina HI 96761 · Proposed: 24-unit luxury rental",
    subtitle: "Tier-R · SITE-RECON-001 handoff · Anchored · PLAT-008",
    cas: { red: 0, yellow: 2, blue: 3, white: 4, green: 2 },
    verdicts: [
      { band: "GREEN", title: "Demand", detail: "85% of capture target" },
      { band: "YELLOW", title: "Supply pipeline", detail: "312 units in 18 months" },
      { band: "WHITE", title: "Median rent", detail: "$4,200/mo · 2BR" },
    ],
    demandScore: { score: "8.4 / 10", captureProbability: "85%", subScores: [
      { factor: "Household income", value: 9.2, cas: "GREEN" },
      { factor: "Employment growth", value: 8.8, cas: "GREEN" },
      { factor: "Vacancy rate", value: 8.1, cas: "GREEN" },
      { factor: "Population growth", value: 7.9, cas: "YELLOW" },
      { factor: "Supply pressure", value: 7.2, cas: "YELLOW" },
    ] },
    demographics: {
      medianHouseholdIncome: "$98,000", incomeNote: "Lahaina 3-mi trade area · 2024 ACS 5-year · $98K vs HI state median $84K — above benchmark",
      employmentGrowthYoY: "+2.4%",
      ageDistribution: [
        { cohort: "65+", pct: 12 }, { cohort: "55–64", pct: 15 }, { cohort: "45–54", pct: 17 },
        { cohort: "35–44", pct: 19 }, { cohort: "25–34", pct: 22 }, { cohort: "18–24", pct: 10 }, { cohort: "Under 18", pct: 5 },
      ],
      targetRenterCohort: "25–44: 41%",
    },
    topEmployers: [
      { name: "Maui Health System", sector: "Healthcare", employees: 3200 },
      { name: "Maui County Govt", sector: "Government", employees: 2100 },
      { name: "Luxury hospitality", sector: "Tourism", employees: 1800 },
      { name: "Education sector", sector: "Schools", employees: 900 },
      { name: "Construction/rebuild", sector: "Construction", employees: null },
    ],
    rentBenchmark: [
      { type: "Studio", rent: "$2,800/mo" }, { type: "1BR", rent: "$3,400/mo" },
      { type: "2BR", rent: "$4,200/mo · median" }, { type: "3BR", rent: "$5,600/mo" },
    ],
    captureAnalysis: { target: "85% capture", qualifiedRenters: 4200, atCapture: 3570, perUnit: "149 qualified prospects per unit", absorption: "6–8 months to stabilization" },
    flags: [
      { cas: "BLUE", title: "Census ACS 5-yr · pull 2024 update when available", detail: "2023 ACS dataset. 2024 release Q4 2026.", action: "Check ACS release schedule" },
      { cas: "BLUE", title: "CoStar premium required for full comp set", detail: "Current comps MLS-derived. CoStar adds 40% coverage.", action: "Upgrade data source" },
      { cas: "BLUE", title: "School quality score from GreatSchools — 3rd party, verify", detail: "Source: GreatSchools.org. Verify with Maui DOE.", action: "Check Maui DOE" },
      { cas: "YELLOW", title: "Demand score 8.4/10 — high confidence", detail: "Tight vacancy + income growth + low supply pressure — market still absorbs." },
    ],
  },

  "supply": {
    title: "Supply pipeline — 312 units · 18-month window",
    cas: { red: 0, yellow: 2, blue: 3, white: 4, green: 2 },
    verdicts: [
      { band: "YELLOW", title: "Supply pipeline", detail: "312 units in 18 months" },
      { band: "YELLOW", title: "Absorption rate", detail: "~7% inventory increase" },
      { band: "WHITE", title: "Competitive set", detail: "4 luxury projects active" },
    ],
    kpis: { unitsInPipeline: 312, inventoryIncrease: "+7%", earliestDelivery: "8 months", marketAbsorption: "18 months" },
    pipeline: [
      { project: "Kapalua 48-unit luxury", units: 48, status: "Under construction", delivery: "M14", estRent: "$4,800–5,200", pressure: "Direct competitor · same tier · 2x size", stage: "under-construction" },
      { project: "Kaanapali 36-unit", units: 36, status: "Entitled", delivery: "M16", estRent: "$4,400–4,800", pressure: "Direct competitor · similar tier", stage: "entitled" },
      { project: "Lahaina 28-unit boutique", units: 28, status: "Permitted", delivery: "M20", estRent: "$3,800–4,200", pressure: "Partial overlap · lower price point", stage: "permitted" },
      { project: "West Maui 200-unit mixed", units: 200, status: "Proposed", delivery: "M24", estRent: "EIR pending", pressure: "Proposed · EIR", stage: "proposed" },
      { project: "This project — 24-unit luxury", units: 24, status: "Proposed", delivery: "M18", estRent: "$4,200 target", pressure: "Subject · target stabilization M18", stage: "subject" },
    ],
  },

  "comps": {
    title: "Comps — 18 verified rent comps · MLS-derived · CoStar gap flagged",
    cas: { red: 0, yellow: 2, blue: 3, white: 4, green: 2 },
    verdicts: [
      { band: "GREEN", title: "Median rent 2BR", detail: "$4,200/mo · verified" },
      { band: "YELLOW", title: "Comp set size", detail: "18 verified · MLS" },
      { band: "GREEN", title: "Subject premium", detail: "5–8% above comp median" },
    ],
    medianRents: { studio: "$2,800/mo", oneBR: "$3,400/mo", twoBR: "$4,200/mo", threeBR: "$5,600/mo", avgPerSqft: "$4.20" },
    comps: [
      { type: "Luxury coastal condo", beds: "2BR", rent: "$4,400", perSqft: "$4.10", status: "Verified", submarket: "Lahaina core" },
      { type: "Oceanview apartment", beds: "2BR", rent: "$4,100", perSqft: "$3.95", status: "Verified", submarket: "Lahaina core" },
      { type: "Resort-adjacent unit", beds: "2BR", rent: "$4,600", perSqft: "$4.35", status: "Verified", submarket: "Kaanapali" },
      { type: "Kaanapali luxury", beds: "2BR", rent: "$4,200", perSqft: "$4.00", status: "Verified", submarket: "Kaanapali" },
      { type: "Lahaina downtown", beds: "1BR", rent: "$3,200", perSqft: "$4.20", status: "Verified", submarket: "Lahaina core" },
      { type: "Lahaina downtown", beds: "Studio", rent: "$2,700", perSqft: "$4.50", status: "Verified", submarket: "Lahaina core" },
      { type: "West Maui villa", beds: "3BR", rent: "$5,800", perSqft: "$3.80", status: "Verified", submarket: "West Maui" },
      { type: "Coastal townhome", beds: "2BR", rent: "$4,000", perSqft: "$3.85", status: "Verified", submarket: "Lahaina core" },
    ],
    flag: { cas: "BLUE", title: "CoStar premium subscription required for full comp set", detail: "Current dataset is MLS-derived (18 comps). CoStar adds ~40% more coverage. Upgrade recommended before final u/w." },
    verifyMethod: "synthetic_for_demo_only",
  },

  "demographics": {
    title: "Demographics — Census ACS 5-yr · 3-mile trade area · 2023 vintage",
    cas: { red: 0, yellow: 2, blue: 3, white: 4, green: 2 },
    verdicts: [
      { band: "GREEN", title: "Median income", detail: "$98,000 · above HI avg" },
      { band: "GREEN", title: "Target renter band", detail: "41% of trade area" },
      { band: "YELLOW", title: "Population growth", detail: "+1.8% YoY · Maui" },
    ],
    ageDistribution: [
      { cohort: "65+", pct: 12 }, { cohort: "55–64", pct: 15 }, { cohort: "45–54", pct: 17 },
      { cohort: "35–44", pct: 19 }, { cohort: "25–34", pct: 22 }, { cohort: "18–24", pct: 10 }, { cohort: "Under 18", pct: 5 },
    ],
    targetRenterNote: "Target renter 25–44: 41%",
    householdIncome: [
      { band: "<$40K", pct: 8 }, { band: "$40–60K", pct: 12 }, { band: "$60–80K", pct: 18 },
      { band: "$80–100K", pct: 22 }, { band: "$100–150K", pct: 24 }, { band: "$150K+", pct: 16 },
    ],
    incomeMedianNote: "Median: $98,000 · above HI avg $84K",
    employmentGrowth: [
      { year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 },
      { year: 2024, pct: "+2.1%" }, { year: 2025, pct: "+2.3%" }, { year: 2026, pct: "+2.4%" },
    ],
    householdComposition: { avgHouseholdSize: "2.8", educationBachelorPlus: "54%", someCollege: "22%", highSchool: "18%", lessThanHS: "6%", tenure: "Renters 48% · Owners 52%", tenureNote: "High renter base — good demand signal" },
    flags: [
      { cas: "BLUE", title: "Census ACS 5-yr 2023 — update when 2024 available", detail: "2024 ACS releases Q4 2026. Monitor for updates.", action: "Check ACS schedule" },
      { cas: "YELLOW", title: "Population growth +1.8% — post-fire recovery", detail: "May be understated. Post-fire displacement not fully captured." },
      { cas: "BLUE", title: "Income data — 3-mile trade area only", detail: "Expand to 5-mile for broader demand read if needed." },
      { cas: "GREEN", title: "Renter base 48% — confirmed demand pool", detail: "High renter share supports luxury rental absorption." },
    ],
  },

  "sources": {
    title: "Source audit — deposition-ready",
    subtitle: "Every data point in this analysis is traceable to a source, retrieval date, and version pin. A forensic auditor opening this record in 3 years sees exactly what data was used and when.",
    cas: { red: 0, yellow: 2, blue: 3, white: 4, green: 2 },
    auditReceiptId: "PLAT-008-2026-06-07-FS-001",
    lenderReadiness: [
      "Demand proven — 85% capture · 14 comps",
      "Supply quantified — 312 units · 18-month pipeline",
      "Demographics sourced — ACS 5-yr · employment verified",
      "All sources version-pinned · audit anchored · retrievable",
    ],
    sources: [
      { source: "Census ACS 5-year", type: "Demographics", coverage: "3-mile trade area · Maui County", retrieved: "2026-06-07", versionPin: "2023 vintage", cas: "GREEN", notes: "Used for income, age, household data" },
      { source: "CoStar (MLS proxy)", type: "Rent comps", coverage: "18 verified units · Lahaina HI", retrieved: "2026-06-07", versionPin: "2026-Q2", cas: "YELLOW", notes: "Partial — CoStar premium adds 40% more comps" },
      { source: "Maui County Assessor", type: "Tax/parcel", coverage: "APN + assessed value", retrieved: "2026-06-07", versionPin: "2026-04", cas: "GREEN", notes: "Current · 2-month lag acceptable" },
      { source: "GreatSchools.org", type: "School quality", coverage: "District rating 7/10", retrieved: "2026-06-07", versionPin: "2026 cycle", cas: "BLUE", notes: "3rd party — verify with Maui DOE" },
      { source: "BLS / DLIR HI", type: "Employment", coverage: "Maui County employment", retrieved: "2026-06-07", versionPin: "2025 annual", cas: "GREEN", notes: "HI Dept Labor & Industrial Relations" },
      { source: "Maui County Planning", type: "Zoning/overlay", coverage: "R-2 + SMA overlay confirmed", retrieved: "2026-06-07", versionPin: "2026 code", cas: "GREEN", notes: "Maui County Code §19 current edition" },
      { source: "Project permit records", type: "Supply pipeline", coverage: "4 projects · county records", retrieved: "2026-06-07", versionPin: "Live", cas: "YELLOW", notes: "West Maui 200-unit EIR status unconfirmed" },
      { source: "ATTOM Property Data", type: "Parcel / sales", coverage: "Via SITE-RECON-001 handoff", retrieved: "2026-06-07", versionPin: "2026-06", cas: "GREEN", notes: "Passed via parcel-bundle/v1 handoff token" },
    ],
    pullReceipt: { workerId: "FEASIBILITY-001", analysisDate: "2026-06-07T14:32:11Z", sourceCount: 8, verifiedCount: 6, flaggedCount: 2, rulesetHash: "sha256:f2c8a1d4e7b3...", receiptHash: "sha256:9e4f7a2c1b86...", activePersonaId: "usr_abc123", walletTx: "wtx_xyz789" },
    video: { label: "Lahaina Rebuild Investor Webinar — Maui County Economic Development", source: "maui.county.gov/econ", verified: true },
    verifyMethod: "synthetic_for_demo_only",
  },
};
