"use strict";

/**
 * mxCurrency.js — real A&P/IA currency computation for the "mx" duty role,
 * added alongside services/aviation/pilotCurrency.js's pilot-only currency
 * (2026-09-08, fixing a live-tested bug: the crew-currency engine was
 * evaluating mechanics against pilot-only requirements — medical/BFR/IPC —
 * that were never theirs to hold). Real regulatory basis, per
 * raas/rulesets/av_crew_currency_v0.json's "mx" role entry:
 *   - 14 CFR 65.83 — A&P recent experience (event type "ap_recent_experience").
 *   - 14 CFR 65.93/65.91 — Inspection Authorization renewal (event type
 *     "ia_renewal").
 *
 * Reads the SAME `logbookEntries` collection and `aviation.currency_event`
 * entryType as pilotCurrency.js (a mechanic's currency events live in the
 * same event log, just under mechanic-specific eventType values), so no new
 * collection is introduced. Deliberately duplicates pilotCurrency.js's tiny
 * date-math helpers (daysUntil/bandFor/expirationFromDate) rather than
 * factoring them into a shared module — pilotCurrency.js is already
 * live-tested and trusted; this file avoids touching it for a same-day,
 * narrowly-scoped fix.
 */

async function computeMxCurrency(db, targetUserId) {
  const now = new Date();

  const eventSnap = await db.collection("logbookEntries")
    .where("userId", "==", targetUserId)
    .where("entryType", "==", "aviation.currency_event")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const events = eventSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
  function latestEvent(type) {
    const e = events.find(e => (e.data || e).eventType === type);
    if (!e) return null;
    const d = e.data || e;
    return { date: d.date, expiration: d.expirationDate, trustLevel: "self_reported" };
  }

  const apEvent = latestEvent("ap_recent_experience");
  const iaEvent = latestEvent("ia_renewal");

  return {
    mxUserId: targetUserId,
    hasEvents: events.length > 0,
    // 65.83 — no fixed single "expiration" in the regulation itself (it's a
    // rolling 24-of-preceding-36-month test, or a passed competency exam
    // reestablishing it), so this platform tracks it the same way BFR/IPC
    // are tracked elsewhere: the mechanic (or an admin) logs the date their
    // recent-experience window was last reestablished, and this computes a
    // 24-calendar-month "reverify by" date from it as a practical tracking
    // proxy — not itself a literal regulatory expiration.
    apRecentExperience: apEvent ? (() => {
      const exp = apEvent.expiration || expirationFromDate(apEvent.date, 24);
      return { ...apEvent, expiration: exp, daysRemaining: daysUntil(exp), band: bandFor(daysUntil(exp)) };
    })() : null,
    // 65.93/65.91 — IA renews annually.
    iaRenewal: iaEvent ? (() => {
      const exp = iaEvent.expiration || expirationFromDate(iaEvent.date, 12);
      return { ...iaEvent, expiration: exp, daysRemaining: daysUntil(exp), band: bandFor(daysUntil(exp)) };
    })() : null,
  };
}

module.exports = { computeMxCurrency };
