/**
 * aircraftTypeProfiles.js — Aircraft-type W&B profiles (empty weight, arms,
 * max weights, fuel capacity/arm, CG envelope).
 *
 * Per Sean: these limits belong to a real "Aircraft Type" data source (the
 * AFM/POH for that type), NOT hardcoded inside the W&B calculator itself —
 * no such worker/data source exists yet in this codebase, so this file is
 * the placeholder shape it should eventually be read from. One real,
 * partially-sourced proof-of-concept profile below (PC-12/47E, matching the
 * same aircraft AviationNearest.jsx already cites real glide data for) —
 * only fields with a real citation are filled in. Everything else is left
 * `null` rather than invented; the calculator must treat `null` as "not
 * available," not silently default to zero or skip a check silently.
 *
 * TODO(next): replace this static object with a real Aircraft Type worker —
 * this is intentionally the minimal shape to unblock the W&B calculator,
 * not a finished data model.
 */

export const AIRCRAFT_TYPE_PROFILES = {
  "PC-12/47E": {
    label: "Pilatus PC-12/47E",
    // Sourced via web search this session (jetav.com / globalair.com aircraft
    // spec pages) — NOT from a primary POH page-scan, treat as a planning
    // estimate pending real POH confirmation, not a certified W&B figure.
    emptyWeight: 6582,       // lb — approximate, needs POH confirmation
    emptyArm: null,          // not sourced — no real datum/arm figure found
    maxRampWeight: 10495,    // lb — matches Sean's own ForeFlight screenshot for N661LF
    maxTakeoffWeight: 10450, // lb
    maxLandingWeight: null,  // not sourced
    maxZeroFuelWeight: 9039, // lb — matches Sean's own ForeFlight screenshot for N661LF
    fuelType: "Jet-A",
    fuelArm: null,           // not sourced
    fuelCapacityGal: null,   // not sourced — PC-12 POH weight-and-balance PDF found
                             // (xpda.com/pc12/pc12weightbalance.pdf) but too large to
                             // fetch/parse this pass; real number needs that source read properly
    cgEnvelope: null,        // not sourced — same blocker as above
    stations: [
      // Real station labels per the type (pilot+copilot bench, 2 more rows,
      // baggage), but NOT real arms — those come from the same unread POH PDF.
      { label: "Pilot + copilot", arm: null },
      { label: "Row 2 (2 seats)", arm: null },
      { label: "Row 3 (2 seats)", arm: null },
      { label: "Aft baggage", arm: null },
    ],
    _sourceNote: "Empty/max weights from web search (jetav.com, globalair.com), cross-checked against Sean's real ForeFlight screenshot values for N661LF this session (max ramp 10,495 lb, max zero-fuel 9,039 lb — those two matched exactly). Arms, fuel capacity, and CG envelope NOT sourced — the real POH weight-and-balance PDF (xpda.com/pc12/pc12weightbalance.pdf) exists but exceeded this session's fetch size limit. Needs a real read of that document (or the actual aircraft's POH) before this profile is trustworthy for real flight planning.",
  },
};

export function getAircraftTypeProfile(typeOrTail) {
  if (!typeOrTail) return null;
  const key = String(typeOrTail).trim().toUpperCase();
  const match = Object.keys(AIRCRAFT_TYPE_PROFILES).find(k => k.toUpperCase() === key);
  return match ? AIRCRAFT_TYPE_PROFILES[match] : null;
}
