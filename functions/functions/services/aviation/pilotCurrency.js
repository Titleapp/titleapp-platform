"use strict";

/**
 * pilotCurrency.js — real FAA currency computation, extracted from the
 * GET /v1/pilot:currency inline handler in index.js (2026-09-05, CODEX 89
 * Dispatch pipeline build) so a second real caller — Dispatch's crew-quals
 * check (services/dispatch/crewQualsEngine.js) — can compute the SAME
 * currency for an arbitrary crew member instead of only "whoever is signed
 * in right now." This is NOT a second currency model: it is the one
 * computation, callable for any userId. index.js's /pilot:currency route
 * now calls this for ctx.userId (self); crewQualsEngine.js calls it for a
 * candidate crew member's uid, wrapped in its own authorization + audit-log
 * layer (see crewQualsEngine.js for why that split — Dispatch gets scoped,
 * logged READ access to this record, not a private copy of it).
 *
 * Two trust tiers, unchanged from the original inline logic:
 *   Mode A (recency) — tallied from real logged flights (aviation.flight
 *     entries): 90-day day/night landings, 6-month approaches/holds. This
 *     tier is as trustworthy as the pilot's own logbook entries are.
 *   Mode B (medical/BFR/IPC/type-recurrent) — the latest self-logged
 *     aviation.currency_event entry per type. As of this build there is no
 *     attestation-at-source for these events anywhere in the codebase (the
 *     CFI/AME-signs-off-in-SKYE pattern CODEX 89 §3 describes as the fix is
 *     NOT yet built — only the analogous nursing competency:attest pattern
 *     exists, at a different route). Every Mode B field below is therefore
 *     tagged trustLevel: "self_reported" so a caller (like the Dispatch
 *     accept screen) can surface that honestly instead of implying
 *     verification that doesn't exist yet.
 *
 * 2026-09-08 addendum — `nightCurrency` given its own field (14 CFR
 * 61.57(a)(2)). `recency90Day` below only ever checked DAY takeoffs/landings
 * (61.57(a)(1)) even though `nightLandings90` was already being tallied —
 * night passenger-carrying currency is a DISTINCT 90-day requirement (3
 * full-stop landings between 1hr after sunset and 1hr before sunrise), and a
 * pilot can be current on one and not the other. Found and fixed alongside
 * raas/rulesets/av_crew_currency_v0.json's role-aware currency work. Treats
 * every logged night landing as full-stop, since this platform's flight-log
 * schema doesn't currently distinguish full-stop vs. touch-and-go for night
 * landings — a stated simplification, not a hidden one.
 *
 * 2026-09-05 addendum — 135.297 given its own field. `typeRecurrent` used to
 * collapse THREE distinct regulatory items into one slot: general recurrent
 * training (135.351, event type "type_recurrent") and BOTH the 135.293
 * competency check and the 135.297 instrument proficiency check (event type
 * "135_proficiency_check"). A pilot can legitimately have 135.293 current
 * while 135.297 is due (or vice versa) — collapsing them hid that. This adds
 * a distinct `ipc297` field, read from a new "135_297_ipc" event type, sitting
 * parallel to `typeRecurrent`/`lineCheck135`/`ioe135` below. `typeRecurrent`
 * (fed by "type_recurrent" / "135_proficiency_check") is unchanged and now
 * reads as "recurrent training / 135.293 competency check" — see
 * crewQualsEngine.js's currencyChecks label for the same split.
 */

function computePilotCurrency(db, targetUserId) {
  return _compute(db, targetUserId);
}

async function _compute(db, targetUserId) {
  const now = new Date();

  const flightSnap = await db.collection("logbookEntries")
    .where("userId", "==", targetUserId)
    .where("entryType", "==", "aviation.flight")
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();
  const flights = flightSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const eventSnap = await db.collection("logbookEntries")
    .where("userId", "==", targetUserId)
    .where("entryType", "==", "aviation.currency_event")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const events = eventSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  function entryDate(e) {
    const d = e.data || e;
    if (d.date) return new Date(d.date);
    if (e.createdAt?._seconds) return new Date(e.createdAt._seconds * 1000);
    return null;
  }
  function daysUntil(isoStr) {
    if (!isoStr) return null;
    return Math.ceil((new Date(isoStr) - now) / 86400000);
  }
  function bandFor(days) {
    if (days == null) return "WHITE";
    if (days <= 0) return "RED";
    if (days <= 30) return "YELLOW";
    return "GREEN";
  }
  function expirationFromDate(dateStr, calendarMonths) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + calendarMonths);
    return d.toISOString().slice(0, 10);
  }

  const cut90 = new Date(now - 90 * 86400000);
  const cut6mo = new Date(now); cut6mo.setMonth(cut6mo.getMonth() - 6);

  const f90 = flights.filter(e => { const d = entryDate(e); return d && d >= cut90; });
  const f6mo = flights.filter(e => { const d = entryDate(e); return d && d >= cut6mo; });

  const dayLandings90 = f90.reduce((s, e) => s + ((e.data || e).landingCount || 0), 0);
  const nightLandings90 = f90.reduce((s, e) => s + ((e.data || e).nightLandingCount || 0), 0);
  const approaches6mo = f6mo.reduce((s, e) => s + ((e.data || e).approachCount || 0), 0);
  const holds6mo = f6mo.reduce((s, e) => s + ((e.data || e).holdCount || 0), 0);

  function latestEvent(type) {
    const e = events.find(e => (e.data || e).eventType === type);
    if (!e) return null;
    const d = e.data || e;
    return { date: d.date, expiration: d.expirationDate, aircraftType: d.aircraftType || null, medicalClass: d.medicalClass || null, trustLevel: "self_reported" };
  }

  const bfr = latestEvent("bfr");
  const ipc = latestEvent("ipc");
  const medical = latestEvent("medical");
  const typeRec = latestEvent("type_recurrent") || latestEvent("135_proficiency_check");
  const lineCheck = latestEvent("135_line_check");
  const ioe = latestEvent("135_ioe");
  // 135.297 instrument proficiency check — distinct from the 61.57 `ipc`
  // above (which is the private/91-side IPC) and from `typeRec` above (which
  // now specifically represents 135.351 recurrent / 135.293 competency).
  const ipc297 = latestEvent("135_297_ipc");

  return {
    pilotUserId: targetUserId,
    hasFlightLog: flights.length > 0,
    hasEvents: events.length > 0,
    recency90Day: {
      dayLandings: dayLandings90,
      nightLandings: nightLandings90,
      current: dayLandings90 >= 3,
      band: dayLandings90 >= 3 ? "GREEN" : "RED",
    },
    // 14 CFR 61.57(a)(2) — distinct from recency90Day above (61.57(a)(1)).
    // See file header 2026-09-08 addendum.
    nightCurrency: {
      nightLandings: nightLandings90,
      current: nightLandings90 >= 3,
      band: nightLandings90 >= 3 ? "GREEN" : "RED",
    },
    instrumentCurrency: {
      approaches6mo,
      holds6mo,
      current: approaches6mo >= 6 && holds6mo >= 1,
      band: approaches6mo >= 6 && holds6mo >= 1 ? "GREEN" : approaches6mo > 0 ? "YELLOW" : "RED",
    },
    medical: medical ? {
      ...medical,
      daysRemaining: daysUntil(medical.expiration),
      band: bandFor(daysUntil(medical.expiration)),
    } : null,
    bfr: bfr ? (() => {
      const exp = bfr.expiration || expirationFromDate(bfr.date, 24);
      return { ...bfr, expiration: exp, daysRemaining: daysUntil(exp), band: bandFor(daysUntil(exp)) };
    })() : null,
    ipc: ipc ? (() => {
      const exp = ipc.expiration || expirationFromDate(ipc.date, 6);
      return { ...ipc, expiration: exp, daysRemaining: daysUntil(exp), band: bandFor(daysUntil(exp)) };
    })() : null,
    typeRecurrent: typeRec ? {
      ...typeRec,
      daysRemaining: daysUntil(typeRec.expiration),
      band: bandFor(daysUntil(typeRec.expiration)),
    } : null,
    lineCheck135: lineCheck ? {
      ...lineCheck,
      daysRemaining: daysUntil(lineCheck.expiration),
      band: bandFor(daysUntil(lineCheck.expiration)),
    } : null,
    ioe135: ioe || null,
    // 135.297 IPC — see file header addendum (2026-09-05). Separate from
    // `typeRecurrent` (135.293/135.351) so the two can be current or expiring
    // independently, and separate from `ipc` (61.57, private-side IPC).
    ipc297: ipc297 ? (() => {
      // Same 6-calendar-month cadence as 61.57 (135.297 requires an IPC
      // "within the preceding 6 calendar months") — default only applies if
      // the event didn't carry its own explicit expirationDate.
      const exp = ipc297.expiration || expirationFromDate(ipc297.date, 6);
      return { ...ipc297, expiration: exp, daysRemaining: daysUntil(exp), band: bandFor(daysUntil(exp)) };
    })() : null,
  };
}

module.exports = { computePilotCurrency };
