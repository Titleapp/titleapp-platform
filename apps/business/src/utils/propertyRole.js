// PETRA property-role mapping — same navigation pattern as aviation's
// crewRole.js (Sean, 2026-09-17): one persona (Petra) across role-lenses,
// each role a different professional view over the same underlying
// property/tenant/lease data.
//
// Unlike aviation's 3 roles (each a fully distinct worker/canvas), real
// estate has 2 real canvas components covering 4 roles: PropertyManagerCanvas
// (operations + compliance, distinguished by tab) and RealEstateWorkerCanvas
// (leasing + title, distinguished internally by `isREAdvocate`/`isTitleSearch`).
// Compliance & Legal is a real, distinct professional
// lens (fair housing / evictions law is a different job than day-to-day
// leasing, same reasoning that kept aviation's MX and Pilot separate) but
// there's no separate canvas built for it yet — it shares
// PropertyManagerCanvas's Evictions/Compliance tabs. So compliance maps to
// the same worker slug as operations, distinguished by default tab instead
// of by worker switch. See PropertyManagerCanvas's `ta_property_default_tab`
// sessionStorage read.
//
// Title & Escrow added 2026-09-17 (CODEX 93) — unlike Finance, this one is
// real: `re-title-search-001` is a genuine ATTOM-integrated chain-of-title
// handler (functions/functions/workers/re-title-search-001/handler.js) with
// its own canvas support in RealEstateWorkerCanvas.jsx (`isTitleSearch`).
// It's a different buyer (title companies) than Operations/Leasing/
// Compliance, same reasoning CODEX 93 used to fold it into PETRA as a role
// instead of spinning it out as a second app.
//
// Finance & Acquisition (underwriting/lending) is still deliberately NOT
// included — no real canvas or data model backs it. Don't add it as a
// selectable role until that's actually scoped and built; a button with
// nothing real behind it would be worse than the roles that work.
export const PROPERTY_ROLE_TO_WORKER_SLUG = {
  operations: "re-property-manager",
  leasing: "re-salesperson",
  compliance: "re-property-manager",
  title: "re-title-search-001",
};

export const PROPERTY_ROLE_LABELS = {
  operations: "Operations",
  leasing: "Leasing & Sales",
  compliance: "Compliance & Legal",
  title: "Title & Escrow",
};

// Which PropertyManagerCanvas tab each role should land on by default.
// Roles not listed here (leasing, title) resolve to a different canvas entirely.
export const PROPERTY_ROLE_TO_DEFAULT_TAB = {
  operations: "Properties",
  compliance: "Compliance",
};
