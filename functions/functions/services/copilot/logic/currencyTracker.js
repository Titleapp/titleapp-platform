"use strict";

/**
 * currencyTracker.js — FAR Part 61 & 135 currency windows
 *
 * Computes GO / NO-GO / EXPIRING for 7 currency areas:
 *   1. IFR currency (61.57c) — 6 approaches + holds in 6 months
 *   2. Night currency (61.57b) — 3 full-stop landings in 90 days
 *   3. Medical certificate — Class 1/2/3 expiry
 *   4. Flight review / BFR (61.56) — 24 calendar months
 *   5. PC12 type currency — 3 takeoffs/landings in 90 days (day or night)
 *   6. 135.293 competency check — 12 calendar months
 *   7. 135.297 instrument proficiency check — 6 calendar months
 */

const MS_PER_DAY = 86400000;

/**
 * Compute all 7 currency windows.
 *
 * @param {Object} profile — copilotProfiles/{userId} doc
 * @param {Array} logEntries — logbooks/{userId}/entries docs
 * @param {Array} groundTraining — logbooks/{userId}/groundTraining docs
 * @returns {Array<{ id, label, status, detail, expiresAt?, daysRemaining? }>}
 */
function computeCurrency(profile, logEntries, groundTraining) {
  const now = new Date();
  const results = [];

  results.push(checkIFR(logEntries, now));
  results.push(checkNightCurrency(logEntries, now));
  results.push(checkMedical(profile, now));
  results.push(checkFlightReview(profile, groundTraining, now));
  results.push(checkTypeCurrency(logEntries, now));
  results.push(check135_293(profile, groundTraining, now));
  results.push(check135_297(profile, groundTraining, now));

  return results;
}

/**
 * 1. IFR Currency — 61.57(c)
 * 6 approaches + holding in preceding 6 calendar months
 */
function checkIFR(entries, now) {
  const sixMonthsAgo = monthsAgo(now, 6);
  const recent = entriesSince(entries, sixMonthsAgo);

  let approaches = 0;
  let holds = 0;
  for (const e of recent) {
    approaches += (e.approachCount || 0);
    holds += (e.holds || 0);
  }

  const approachesOk = approaches >= 6;
  const holdsOk = holds >= 1;
  const current = approachesOk && holdsOk;

  // Grace period: 12 calendar months from expiry of 6-month window
  const graceEnd = monthsAgo(now, -6); // 6 months from now would be the grace boundary
  const expiring = !current && approaches >= 4; // close but not yet

  let status = "NO_GO";
  if (current) status = "GO";
  else if (expiring) status = "EXPIRING";

  return {
    id: "ifr",
    label: "IFR Currency (61.57c)",
    status,
    detail: `${approaches}/6 approaches, ${holds}/1 holds in last 6 months`,
    requirement: "6 approaches + 1 hold in 6 calendar months",
  };
}

/**
 * 2. Night Currency — 61.57(b)
 * 3 full-stop night landings in preceding 90 days
 */
function checkNightCurrency(entries, now) {
  const ninetyDaysAgo = daysAgo(now, 90);
  const recent = entriesSince(entries, ninetyDaysAgo);

  let nightLandings = 0;
  for (const e of recent) {
    nightLandings += (e.landingsNight || 0);
  }

  const current = nightLandings >= 3;

  return {
    id: "night",
    label: "Night Currency (61.57b)",
    status: current ? "GO" : "NO_GO",
    detail: `${nightLandings}/3 night full-stop landings in last 90 days`,
    requirement: "3 full-stop night landings in 90 days",
  };
}

/**
 * 3. Medical Certificate
 * Class 1: 12 months (6 if over 40), Class 2: 12 months, Class 3: 60 months (24 if over 40)
 */
function checkMedical(profile, now) {
  if (!profile || !profile.medicalExpiry) {
    return {
      id: "medical",
      label: "Medical Certificate",
      status: "NO_GO",
      detail: "No medical certificate on file",
      requirement: "Valid medical certificate required",
    };
  }

  const expiry = new Date(profile.medicalExpiry);
  const daysRemaining = Math.floor((expiry - now) / MS_PER_DAY);

  let status = "GO";
  if (daysRemaining < 0) status = "NO_GO";
  else if (daysRemaining <= 30) status = "EXPIRING";

  return {
    id: "medical",
    label: `Medical Certificate (Class ${profile.medicalClass || "?"})`,
    status,
    detail: daysRemaining >= 0
      ? `Expires ${formatDate(expiry)} (${daysRemaining} days)`
      : `Expired ${formatDate(expiry)}`,
    expiresAt: expiry.toISOString(),
    daysRemaining,
    requirement: "Valid medical certificate",
  };
}

/**
 * 4. Flight Review / BFR — 61.56
 * Within preceding 24 calendar months
 */
function checkFlightReview(profile, groundTraining, now) {
  // Check profile for lastBFR date, or find most recent BFR in ground training
  let lastBFR = profile?.lastBFR ? new Date(profile.lastBFR) : null;

  if (groundTraining && groundTraining.length) {
    for (const gt of groundTraining) {
      if (gt.type === "BFR" || gt.type === "flight_review") {
        const d = new Date(gt.date);
        if (!lastBFR || d > lastBFR) lastBFR = d;
      }
    }
  }

  if (!lastBFR) {
    return {
      id: "bfr",
      label: "Flight Review (61.56)",
      status: "NO_GO",
      detail: "No flight review on record",
      requirement: "Flight review within 24 calendar months",
    };
  }

  const expiryDate = addCalendarMonths(lastBFR, 24);
  const daysRemaining = Math.floor((expiryDate - now) / MS_PER_DAY);

  let status = "GO";
  if (daysRemaining < 0) status = "NO_GO";
  else if (daysRemaining <= 60) status = "EXPIRING";

  return {
    id: "bfr",
    label: "Flight Review (61.56)",
    status,
    detail: daysRemaining >= 0
      ? `Last BFR ${formatDate(lastBFR)}, expires ${formatDate(expiryDate)} (${daysRemaining} days)`
      : `Expired ${formatDate(expiryDate)}`,
    expiresAt: expiryDate.toISOString(),
    daysRemaining,
    requirement: "Flight review within 24 calendar months",
  };
}

/**
 * 5. PC12 Type Currency
 * 3 takeoffs/landings in 90 days (same type)
 */
function checkTypeCurrency(entries, now) {
  const ninetyDaysAgo = daysAgo(now, 90);
  const recent = entriesSince(entries, ninetyDaysAgo);

  let landings = 0;
  for (const e of recent) {
    landings += (e.landingsDay || 0) + (e.landingsNight || 0);
  }

  const current = landings >= 3;

  return {
    id: "pc12_type",
    label: "PC12 Type Currency",
    status: current ? "GO" : "NO_GO",
    detail: `${landings}/3 landings in last 90 days`,
    requirement: "3 takeoffs/landings in 90 days in type",
  };
}

/**
 * 6. 135.293 Competency Check — 12 calendar months
 */
function check135_293(profile, groundTraining, now) {
  return checkRecurring(
    "135_293",
    "135.293 Competency Check",
    12,
    ["135.293", "competency_check", "annual_check"],
    profile,
    groundTraining,
    now
  );
}

/**
 * 7. 135.297 Instrument Proficiency Check — 6 calendar months
 */
function check135_297(profile, groundTraining, now) {
  return checkRecurring(
    "135_297",
    "135.297 Instrument Check",
    6,
    ["135.297", "instrument_proficiency", "ipc"],
    profile,
    groundTraining,
    now
  );
}

/**
 * Generic recurring check: find most recent event of given types,
 * check if within N calendar months.
 */
function checkRecurring(id, label, months, eventTypes, profile, groundTraining, now) {
  let lastDate = null;

  // Check profile field
  const profileKey = `last_${id}`;
  if (profile && profile[profileKey]) {
    lastDate = new Date(profile[profileKey]);
  }

  // Check ground training records
  if (groundTraining && groundTraining.length) {
    for (const gt of groundTraining) {
      const type = (gt.type || "").toLowerCase();
      if (eventTypes.some(t => type.includes(t.toLowerCase()))) {
        const d = new Date(gt.date);
        if (!lastDate || d > lastDate) lastDate = d;
      }
    }
  }

  if (!lastDate) {
    return {
      id,
      label,
      status: "NO_GO",
      detail: `No ${label} on record`,
      requirement: `${label} within ${months} calendar months`,
    };
  }

  const expiryDate = addCalendarMonths(lastDate, months);
  const daysRemaining = Math.floor((expiryDate - now) / MS_PER_DAY);

  let status = "GO";
  if (daysRemaining < 0) status = "NO_GO";
  else if (daysRemaining <= 30) status = "EXPIRING";

  return {
    id,
    label,
    status,
    detail: daysRemaining >= 0
      ? `Last check ${formatDate(lastDate)}, expires ${formatDate(expiryDate)} (${daysRemaining} days)`
      : `Expired ${formatDate(expiryDate)}`,
    expiresAt: expiryDate.toISOString(),
    daysRemaining,
    requirement: `${label} within ${months} calendar months`,
  };
}

// --- Helpers ---

function entriesSince(entries, sinceDate) {
  return (entries || []).filter(e => {
    const d = new Date(e.date);
    return d >= sinceDate;
  });
}

function monthsAgo(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - n);
  return d;
}

function daysAgo(date, n) {
  return new Date(date.getTime() - n * MS_PER_DAY);
}

function addCalendarMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  // End of last day of that month (FAA uses calendar month end)
  return d;
}

function formatDate(d) {
  return d.toISOString().substring(0, 10);
}

module.exports = { computeCurrency };
