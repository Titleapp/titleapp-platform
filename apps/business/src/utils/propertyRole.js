// PETRA property-role mapping — same navigation pattern as aviation's
// crewRole.js (Sean, 2026-09-17): one persona (Petra) across role-lenses,
// each role a different professional view over the same underlying
// property/tenant/lease data.
//
// Unlike aviation's 3 roles (which are 3 fully distinct workers/canvases),
// real estate only has 2 real distinct canvases today: PropertyManagerCanvas
// (re-property-manager) and RealEstateWorkerCanvas (re-salesperson, "Real
// Estate Advocate"). Compliance & Legal is a real, distinct professional
// lens (fair housing / evictions law is a different job than day-to-day
// leasing, same reasoning that kept aviation's MX and Pilot separate) but
// there's no separate canvas built for it yet — it shares
// PropertyManagerCanvas's Evictions/Compliance tabs. So compliance maps to
// the same worker slug as operations, distinguished by default tab instead
// of by worker switch. See PropertyManagerCanvas's `ta_property_default_tab`
// sessionStorage read.
//
// Finance & Acquisition (underwriting/lending) is deliberately NOT included
// yet — no real canvas or data model backs it. Don't add it as a selectable
// role until that's actually scoped and built; a 4th button with nothing
// real behind it would be worse than 3 that work.
export const PROPERTY_ROLE_TO_WORKER_SLUG = {
  operations: "re-property-manager",
  leasing: "re-salesperson",
  compliance: "re-property-manager",
};

export const PROPERTY_ROLE_LABELS = {
  operations: "Operations",
  leasing: "Leasing & Sales",
  compliance: "Compliance & Legal",
};

// Which PropertyManagerCanvas tab each role should land on by default.
// Roles not listed here (leasing) resolve to a different canvas entirely.
export const PROPERTY_ROLE_TO_DEFAULT_TAB = {
  operations: "Properties",
  compliance: "Compliance",
};
