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
  };
}

module.exports = { computePilotCurrency };
