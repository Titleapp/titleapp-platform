"use strict";

/**
 * airac.js — AIRAC 28-day cycle math + nav-database currency.
 *
 * Aviation nav data is only valid for its AIRAC cycle. A downloaded regional
 * database (ForeFlight model) must be kept current — using expired data is a
 * regulatory problem for IFR ops. This module computes:
 *   • the cycle for any date (label YYNN + effective/expiry dates), and
 *   • a currency status for a user's downloaded DB: current | expiring | expired,
 *     where "expiring" fires WITHIN 7 DAYS of expiry — the advance warning.
 *
 * Anchor: AIRAC 2601 is effective 2026-01-22 (verified against published FAA/
 * ICAO schedules); every cycle is exactly 28 days. (Date.now() is fine here —
 * this runs in the function, not a workflow.)
 */

const DAY_MS = 86400000;
const CYCLE_MS = 28 * DAY_MS;
const ANCHOR_MS = Date.UTC(2026, 0, 22); // AIRAC 2601 effective date (UTC)

// Advance-warning window: warn this many days BEFORE expiry. (Sean: "very important".)
const WARN_DAYS = 7;

function startOfUtcDay(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Effective date (ms, UTC midnight) of the cycle that contains `dateMs`.
function cycleEffectiveMs(dateMs) {
  const n = Math.floor((startOfUtcDay(dateMs) - ANCHOR_MS) / CYCLE_MS);
  return ANCHOR_MS + n * CYCLE_MS;
}

// YYNN label for a cycle whose effective date is `effMs`. Cycle 01 of a year is
// the first cycle whose effective date falls in that year; subsequent cycles
// increment until the year rolls over.
function cycleLabel(effMs) {
  const year = new Date(effMs).getUTCFullYear();
  // Step back to the first cycle of this year.
  let first = effMs;
  while (new Date(first - CYCLE_MS).getUTCFullYear() === year) first -= CYCLE_MS;
  const num = Math.round((effMs - first) / CYCLE_MS) + 1;
  return `${String(year).slice(2)}${String(num).padStart(2, "0")}`;
}

// Full cycle descriptor for a date (default: now).
function cycleForDate(dateMs = Date.now()) {
  const effMs = cycleEffectiveMs(dateMs);
  const expMs = effMs + CYCLE_MS;
  return {
    cycle: cycleLabel(effMs),
    effective: isoDate(effMs),
    expires: isoDate(expMs), // = effective date of the NEXT cycle
    effectiveMs: effMs,
    expiresMs: expMs,
  };
}

function currentCycle(nowMs = Date.now()) {
  return cycleForDate(nowMs);
}

// Resolve a "YYNN" label to its cycle descriptor.
function cycleFromLabel(label) {
  const m = /^(\d{2})(\d{2})$/.exec(String(label || "").trim());
  if (!m) return null;
  const year = 2000 + Number(m[1]);
  const num = Number(m[2]);
  if (num < 1 || num > 14) return null;
  // First cycle of `year` = cycle containing Jan 15 of that year (always lands
  // in cycle 01, which is effective ~Jan 22 and runs from late Dec/early Jan).
  const firstEff = cycleEffectiveMs(Date.UTC(year, 0, 25));
  const effMs = firstEff + (num - 1) * CYCLE_MS;
  return cycleForDate(effMs);
}

/**
 * Currency status for a user's downloaded database.
 * @param {{cycle?: string, expiresMs?: number, region?: string}} db
 * @param {number} nowMs
 * @returns {{status, daysRemaining, cycle, expires, current, warnDays, region}}
 *   status: "current" | "expiring" (≤7 days out) | "expired"
 */
function currencyStatus(db = {}, nowMs = Date.now()) {
  let expiresMs = db.expiresMs;
  let cycle = db.cycle || null;
  if (expiresMs == null && cycle) {
    const c = cycleFromLabel(cycle);
    if (c) expiresMs = c.expiresMs;
  }
  if (expiresMs == null) {
    return { status: "unknown", error: "provide db.cycle (YYNN) or db.expiresMs" };
  }
  const today = startOfUtcDay(nowMs);
  const daysRemaining = Math.ceil((expiresMs - today) / DAY_MS);
  let status;
  if (daysRemaining <= 0) status = "expired";
  else if (daysRemaining <= WARN_DAYS) status = "expiring"; // ← the 7-day advance notice
  else status = "current";

  const current = currentCycle(nowMs);
  return {
    status,
    daysRemaining,
    warnDays: WARN_DAYS,
    cycle: cycle || (cycleFromLabel(cycle)?.cycle ?? null),
    expires: isoDate(expiresMs),
    region: db.region || null,
    currentCycle: current.cycle, // the cycle the user SHOULD be on
    needsUpdate: status !== "current",
  };
}

// Route handler: GET /v1/aviation:currency[?cycle=2601][&region=hawaii]
async function handleCurrency(req, res) {
  const cycle = req.query?.cycle || req.body?.cycle || null;
  const region = req.query?.region || req.body?.region || null;
  if (!cycle) {
    // No DB specified → just report the current cycle.
    return res.status(200).json({ ok: true, current: currentCycle() });
  }
  const result = currencyStatus({ cycle, region });
  if (result.error) return res.status(400).json({ ok: false, error: result.error });
  return res.status(200).json({ ok: true, ...result });
}

module.exports = {
  WARN_DAYS,
  currentCycle,
  cycleForDate,
  cycleFromLabel,
  currencyStatus,
  handleCurrency,
};
