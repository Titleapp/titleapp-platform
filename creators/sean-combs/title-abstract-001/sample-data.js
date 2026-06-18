/**
 * Sample data for `title-abstract` worker (TITLE-ABSTRACT-001).
 *
 * One entry per canvasTab.id. Anchor parcel is the Sublette County pilot
 * (9708 US Highway 191, Pinedale WY — APN 01-00-10382), a long clean chain
 * with two easements and 1978-severed minerals. Recorded instruments shown are
 * synthetic_for_demo_only. NOT an insured-title product (RULE-02).
 */

export const SAMPLE_CANVAS_PAYLOADS = {
  "ownership-chain": {
    title: "Title abstract — 9708 US Highway 191, Pinedale WY · APN 01-00-10382",
    subtitle: "Tier-R · 5 transfers · 2 open easements · mineral rights severed · Anchored · PLAT-008",
    cas: { red: 0, yellow: 2, blue: 1, white: 3, green: 5 },
    disclaimer: "General information — not certified for closing",
    verdicts: [
      { band: "GREEN", title: "Title chain — clean", detail: "5 transfers verified · marketable" },
      { band: "YELLOW", title: "Two open easements", detail: "Utility 1987 · Road access 2003" },
      { band: "YELLOW", title: "Mineral rights severed", detail: "1978 federal patent · surface only" },
    ],
    heroes: { marketableStatus: "Yes", openEncumbrances: 2, lastSalePrice: "$1.45M", lienTotal: "$0" },
    chain: [
      { n: 1, grantee: "Rosenberg Family Trust", grantor: "Hartwell LLC", deedType: "Warranty deed", date: "Aug 14 2019", consideration: "$1,450,000", recording: "Rec. 2019-08142 · Book 847 Page 211", status: "Current", cas: "GREEN" },
      { n: 2, grantee: "Hartwell LLC", grantor: "Wyoming Ranch Holdings", deedType: "Warranty deed", date: "Mar 2 2011", consideration: "$920,000", recording: "Rec. 2011-03048 · Book 712 Page 88", cas: "GREEN" },
      { n: 3, grantee: "Wyoming Ranch Holdings", grantor: "Patterson Estate", deedType: "Executor's deed", date: "Jan 15 2003", consideration: "$0 — VERIFY PROBATE ORDER", recording: "Rec. 2003-01152 · Book 601 Page 44", status: "Verify probate", cas: "YELLOW", action: "Pull probate order" },
      { n: 4, grantee: "Patterson Family Trust", grantor: "First WY Land Co.", deedType: "Grant deed", date: "Sep 3 1994", consideration: "$340,000", recording: "Rec. 1994-09031 · Book 488 Page 120", cas: "GREEN" },
      { n: 5, grantee: "First WY Land Co.", grantor: "Federal patent", deedType: "Patent deed", date: "1978", consideration: "SURFACE RIGHTS ONLY — mineral rights severed at origin", recording: "Rec. 1978-00441 · Book 201 Page 7", status: "Minerals severed", cas: "YELLOW" },
    ],
    flags: [
      { cas: "YELLOW", title: "Probate verification needed — executor's deed 2003", detail: "Confirm probate order filed before Wyoming Ranch Holdings transfer.", action: "Pull probate order" },
      { cas: "YELLOW", title: "Easement #1 utility 1987 — review development impact", detail: "May restrict building envelope. Pull recorded doc.", action: "Pull recorded doc" },
      { cas: "BLUE", title: "Water rights priority date unconfirmed", detail: "Wyoming prior appropriation. Confirm with State Engineer's Office.", action: "Check WY SEO" },
      { cas: "WHITE", title: "Mineral rights severed 1978 — no active lease detected", detail: "Surface rights only per federal patent. Known from chain." },
      { cas: "GREEN", title: "Title chain complete to 1978 — 5 transfers verified", detail: "No gaps. No breaks. All instruments retrieved." },
    ],
    media: { droneAerial: { label: "Drone aerial — user upload", source: "user_supplied", verified: false } },
  },

  "encumbrances": {
    title: "Encumbrances — 9708 US Highway 191",
    cas: { red: 0, yellow: 2, blue: 1, white: 3, green: 5 },
    verdicts: [
      { band: "GREEN", title: "Lien stack", detail: "Clear — $0 total" },
      { band: "YELLOW", title: "Open easements", detail: "2 — review before close" },
      { band: "GREEN", title: "Deed restrictions", detail: "None detected" },
    ],
    encumbranceCards: [
      { cas: "YELLOW", label: "Review", title: "Easement #1 — Utility access", detail: "Recorded: Nov 3 1987 · Book 312 Page 88 · Running with land · Grants access to utility company · Review: may restrict building envelope on SW corner", action: "Pull recorded doc" },
      { cas: "YELLOW", label: "Review", title: "Easement #2 — Road access", detail: "Recorded: Jan 15 2003 · Book 601 Page 44 · Ingress/egress to APN 01-00-10381 (adjacent parcel) · Confirm scope and width before closing", action: "Pull recorded doc" },
      { cas: "GREEN", label: "Clear", title: "Deed restrictions", detail: "None detected in current search · No CC&Rs · No deed covenants limiting use · Title search current through 2026-06-07", action: "Order title insurance for full protection" },
    ],
    lienStack: [
      { class: "Mortgage / deed of trust", balance: "$0" },
      { class: "Mechanic's liens", balance: "$0" },
      { class: "Property tax liens", balance: "$0" },
      { class: "HOA / condo assessments", balance: "$0" },
      { class: "Judgment liens", balance: "$0" },
      { class: "IRS / federal tax liens", balance: "$0" },
    ],
    lienStackNote: "Lien stack entirely clear — total exposure $0",
  },

  "recorded-docs": {
    title: "Recorded document archive — APN 01-00-10382",
    subtitle: "7 instruments retrieved · Sublette County Clerk · version-pinned · hash-anchored",
    cas: { red: 0, yellow: 2, blue: 1, white: 3, green: 5 },
    stats: { totalInstruments: 7, deeds: 5, easements: 2, liens: 0 },
    instruments: [
      { type: "Warranty deed", parties: "Hartwell LLC → Rosenberg Family Trust", recording: "2019-08142", date: "2019-08-14", consideration: "$1,450,000", status: "Verified", cas: "GREEN" },
      { type: "Warranty deed", parties: "Wyoming Ranch Holdings → Hartwell LLC", recording: "2011-03048", date: "2011-03-02", consideration: "$920,000", status: "Verified", cas: "GREEN" },
      { type: "Executor's deed", parties: "Patterson Estate → Wyoming Ranch Holdings", recording: "2003-01152", date: "2003-01-15", consideration: "$0", status: "Verify probate", cas: "YELLOW" },
      { type: "Grant deed", parties: "First WY Land Co. → Patterson Family Trust", recording: "1994-09031", date: "1994-09-03", consideration: "$340,000", status: "Verified", cas: "GREEN" },
      { type: "Utility easement", parties: "[Utility Co.] — Book 312 Pg 88", recording: "1987-11031", date: "1987-11-03", consideration: "N/A", status: "Review impact", cas: "YELLOW" },
      { type: "Road access easement", parties: "[Adjacent owner] — Book 601 Pg 44", recording: "2003-01153", date: "2003-01-16", consideration: "N/A", status: "Review scope", cas: "YELLOW" },
      { type: "Federal patent", parties: "BLM → First WY Land Co. (surface only)", recording: "1978-00441", date: "1978-01-01", consideration: "Fed. transfer", status: "Minerals severed", cas: "WHITE" },
    ],
    verifyMethod: "synthetic_for_demo_only",
  },

  "rights-stack": {
    title: "Vertical rights stack — full column review",
    subtitle: "Every stratum from above the land to below it. What is held. What is severed. What is unverified.",
    jurisdictionContext: "Wyoming · Prior appropriation state · Sublette County · Mineral/surface severance common from federal patents",
    cas: { red: 0, yellow: 2, blue: 1, white: 3, green: 5 },
    colorRule: "Stratum BANDS earth-tone by elevation (above=light-blue / surface=light-green / below=tan). CAS color ONLY on the per-stratum status badge.",
    strata: [
      { band: "above-ground", name: "Air rights", badge: "Verified", badgeCas: "GREEN", status: "Held", detail: "No TDR severance detected · FAA Part 77 clear · No view easements on record" },
      { band: "above-ground", name: "Radio / spectrum rights", badge: "Action needed", badgeCas: "BLUE", status: "Not detected", detail: "No FCC tower lease · No cell lease in title search · Verify with FCC database", action: "Check FCC database" },
      { band: "surface", name: "Surface rights — fee simple", badge: "Verified", badgeCas: "GREEN", status: "Held · current owner", detail: "Rosenberg Family Trust · 5 transfers verified · marketable" },
      { band: "surface", name: "Water rights (WY prior appropriation)", badge: "Action needed", badgeCas: "YELLOW", status: "Review required", detail: "Priority date unconfirmed · First in time first in right", action: "Check WY SEO" },
      { band: "surface", name: "Carbon credits / sequestration", badge: "Action needed", badgeCas: "BLUE", status: "Unverified", detail: "42 acres · check WY carbon registry before close", action: "Check WY registry" },
      { band: "below-ground", name: "Mineral rights", badge: "Verified", badgeCas: "RED", status: "SEVERED — 1978", detail: "Federal patent · surface rights only · NOT conveyed" },
      { band: "below-ground", name: "Oil & gas rights", badge: "Verified", badgeCas: "RED", status: "SEVERED — 1978", detail: "Follows mineral severance · check BLM for active lease", action: "Check BLM records" },
      { band: "below-ground", name: "Digital rights (fiber / subsurface data)", badge: "Action needed", badgeCas: "BLUE", status: "Not detected", detail: "No subsurface fiber easement on record" },
    ],
    summary: [
      "Surface rights: held · fee simple · verified",
      "Air rights: held · no TDR severance · FAA clear",
      "Water rights: held (likely) · priority date unconfirmed",
      "Mineral rights: SEVERED 1978 · not conveyed to surface owner",
      "Oil & gas: SEVERED 1978 · check for active BLM lease",
      "Carbon / spectrum / digital: action needed before close",
    ],
  },

  "plain-english": {
    title: "Plain English — 9708 US Highway 191",
    hero: { cas: "GREEN", label: "Clean · Marketable", headline: "This title is clean. The chain goes back to 1978 with no gaps.", sub: "Two easements need review before you close. No liens. No judgments. Mineral rights were severed in 1978 — you'd be buying surface only." },
    sections: [
      { cas: "GREEN", title: "Who owns it — confirmed", body: "The Rosenberg Family Trust is the current owner of record. The title chain has been verified through five transfers back to a 1978 federal patent. No gaps. No breaks. The chain is complete. This title is marketable." },
      { cas: "YELLOW", title: "What's attached to it — two easements to review", body: "A 1987 utility easement gives a utility company access across part of the property. A 2003 road easement gives a neighboring parcel ingress/egress rights across yours. Both run with the land — they transfer to you if you buy. Pull the recorded docs before close.", action: "Pull easement docs" },
      { cas: "YELLOW", title: "What's owed — probate step to verify", body: "There are no liens. No mortgage, no mechanic's liens, no tax delinquency, no HOA dues. One step to confirm: the 2003 executor's deed needs the underlying probate order verified. This is a title-company requirement, not a red flag — just a document to pull.", action: "Pull probate order" },
      { cas: "WHITE", title: "What's below the surface — mineral rights are not yours", body: "This is the most important thing most buyers miss. The 1978 federal patent conveyed surface rights only. Mineral rights were severed. Oil, gas, coal, and minerals beneath this land belong to someone else. No active lease detected.", action: "Check WY mineral records" },
    ],
    qa: [
      { q: "Is this title insurable?", a: "Yes — chain is complete, no open liens, no judgment issues. Standard title insurance should be available." },
      { q: "What do the easements mean for me?", a: "The utility easement may restrict where you can build. The road easement benefits a neighbor. Both need attorney review." },
      { q: "Should I be worried about the mineral rights?", a: "Not necessarily — many WY surface parcels have severed minerals and it's normal. Confirm no active oil/gas lease before close." },
      { q: "What's next?", a: "Pull the two easement docs and the probate order. Check WY mineral records. Order title insurance. Then you're clear to close." },
    ],
    actions: ["Pull easement docs", "Pull probate order", "Check WY mineral records", "Export PDF"],
  },
};
