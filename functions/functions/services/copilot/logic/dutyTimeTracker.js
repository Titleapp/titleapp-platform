"use strict";

/**
 * dutyTimeTracker.js — FAR Part 135 duty & flight time limits
 *
 * Rolling windows:
 *   - Flight time: 8 hrs / 24 hrs (135.267)
 *   - Duty time:  14 hrs / 24 hrs (single pilot) or 16 hrs (two pilot)
 *   - Rolling 7-day: 34 flight hours
 *   - Rolling 30-day: 120 flight hours
 *   - Rolling 365-day: 1,200 flight hours
 *   - Required rest: 10 consecutive hours before duty (135.267)
 *
 * Also tracks current duty period and block time for live ops.
 */

const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;

/**
 * Compute current duty/flight time status against FAR 135 limits.
 *
 * @param {Array} dutyPeriods — dutyPeriods/{userId} docs, sorted by date
 * @param {Array} logEntries — logbooks/{userId}/entries docs
 * @param {Object} [activeDuty] — current open duty period (if on duty now)
 * @returns {Object} status with limits, remaining, alerts
 */
function computeDutyStatus(dutyPeriods, logEntries, activeDuty) {
  const now = new Date();
  const sorted = (dutyPeriods || [])
    .map(dp => ({
      ...dp,
      _start: dp.dutyStartZulu ? new Date(dp.dutyStartZulu) : new Date(dp.date),
      _end: dp.dutyEndZulu ? new Date(dp.dutyEndZulu) : null,
    }))
    .sort((a, b) => (a._start || 0) - (b._start || 0));

  // --- Flight hours in rolling windows ---
  const flightHours24 = sumFlightHours(logEntries, now, 1);
  const flightHours7d = sumFlightHours(logEntries, now, 7);
  const flightHours30d = sumFlightHours(logEntries, now, 30);
  const flightHours365d = sumFlightHours(logEntries, now, 365);

  // --- Current duty period ---
  let currentDutyHours = 0;
  let dutyStartTime = null;
  if (activeDuty && activeDuty.dutyStartZulu) {
    dutyStartTime = new Date(activeDuty.dutyStartZulu);
    currentDutyHours = (now - dutyStartTime) / MS_PER_HOUR;
  }

  // --- Rest since last duty ---
  const lastCompleted = [...sorted].reverse().find(dp => dp._end);
  let restHoursSinceLast = null;
  if (lastCompleted && lastCompleted._end) {
    const restStart = activeDuty ? dutyStartTime : now;
    restHoursSinceLast = Math.round(((restStart - lastCompleted._end) / MS_PER_HOUR) * 10) / 10;
  }

  // --- Duty hours in last 24 ---
  const dutyHours24 = sumDutyHours(sorted, now, 1);

  // --- Build limits status ---
  const limits = [
    {
      id: "flight_24h",
      label: "Flight Time / 24 hrs",
      limit: 8,
      used: round1(flightHours24),
      remaining: round1(Math.max(0, 8 - flightHours24)),
      status: flightHours24 >= 8 ? "LIMIT" : flightHours24 >= 7 ? "CAUTION" : "OK",
      regulation: "135.267(a)",
    },
    {
      id: "duty_24h",
      label: "Duty Time / 24 hrs",
      limit: 14,
      used: round1(dutyHours24),
      remaining: round1(Math.max(0, 14 - dutyHours24)),
      status: dutyHours24 >= 14 ? "LIMIT" : dutyHours24 >= 12 ? "CAUTION" : "OK",
      regulation: "135.267(b)",
    },
    {
      id: "flight_7d",
      label: "Flight Time / 7 days",
      limit: 34,
      used: round1(flightHours7d),
      remaining: round1(Math.max(0, 34 - flightHours7d)),
      status: flightHours7d >= 34 ? "LIMIT" : flightHours7d >= 30 ? "CAUTION" : "OK",
      regulation: "135.267(c)",
    },
    {
      id: "flight_30d",
      label: "Flight Time / 30 days",
      limit: 120,
      used: round1(flightHours30d),
      remaining: round1(Math.max(0, 120 - flightHours30d)),
      status: flightHours30d >= 120 ? "LIMIT" : flightHours30d >= 100 ? "CAUTION" : "OK",
      regulation: "135.267(d)",
    },
    {
      id: "flight_365d",
      label: "Flight Time / 365 days",
      limit: 1200,
      used: round1(flightHours365d),
      remaining: round1(Math.max(0, 1200 - flightHours365d)),
      status: flightHours365d >= 1200 ? "LIMIT" : flightHours365d >= 1100 ? "CAUTION" : "OK",
      regulation: "135.267(d)",
    },
    {
      id: "rest",
      label: "Required Rest (10 hrs)",
      limit: 10,
      used: restHoursSinceLast !== null ? round1(restHoursSinceLast) : null,
      remaining: null,
      status: restHoursSinceLast === null
        ? "UNKNOWN"
        : restHoursSinceLast >= 10
          ? "OK"
          : "VIOLATION",
      regulation: "135.267(b)",
    },
  ];

  // --- Alerts ---
  const alerts = [];
  for (const lim of limits) {
    if (lim.status === "LIMIT") {
      alerts.push({ severity: "error", message: `${lim.label} limit reached (${lim.used}/${lim.limit} hrs)` });
    } else if (lim.status === "CAUTION") {
      alerts.push({ severity: "warning", message: `${lim.label} approaching limit (${lim.used}/${lim.limit} hrs, ${lim.remaining} remaining)` });
    } else if (lim.status === "VIOLATION") {
      alerts.push({ severity: "error", message: `Rest requirement not met: ${lim.used} hrs (minimum 10 required)` });
    }
  }

  return {
    limits,
    alerts,
    currentDuty: activeDuty ? {
      onDuty: true,
      dutyStartZulu: activeDuty.dutyStartZulu,
      dutyHours: round1(currentDutyHours),
      maxDutyHours: 14,
      remainingDutyHours: round1(Math.max(0, 14 - currentDutyHours)),
    } : { onDuty: false },
    restSinceLastDuty: restHoursSinceLast,
    computedAt: now.toISOString(),
  };
}

/**
 * Record a duty event (duty-on, duty-off, block-out, block-in).
 * Returns the updated duty period doc to write.
 *
 * @param {string} eventType — "duty_on" | "duty_off" | "block_out" | "block_in"
 * @param {Object} payload — { timestamp, departure?, destination?, remarks? }
 * @param {Object|null} currentDutyDoc — existing open duty period, if any
 * @returns {Object} duty period doc to upsert
 */
function processDutyEvent(eventType, payload, currentDutyDoc) {
  const timestamp = payload.timestamp || new Date().toISOString();

  switch (eventType) {
  case "duty_on": {
    if (currentDutyDoc && !currentDutyDoc.dutyEndZulu) {
      throw new Error("Already on duty. Close current duty period first.");
    }
    return {
      dutyStartZulu: timestamp,
      dutyEndZulu: null,
      flightSegments: [],
      totalFlightHours: 0,
      totalDutyHours: 0,
      restBefore: null,
      source: "manual",
      createdAt: timestamp,
    };
  }

  case "duty_off": {
    if (!currentDutyDoc || currentDutyDoc.dutyEndZulu) {
      throw new Error("Not currently on duty.");
    }
    const start = new Date(currentDutyDoc.dutyStartZulu);
    const end = new Date(timestamp);
    const dutyHours = round1((end - start) / MS_PER_HOUR);
    return {
      ...currentDutyDoc,
      dutyEndZulu: timestamp,
      totalDutyHours: dutyHours,
    };
  }

  case "block_out": {
    if (!currentDutyDoc || currentDutyDoc.dutyEndZulu) {
      throw new Error("Must be on duty to record block out.");
    }
    const segments = currentDutyDoc.flightSegments || [];
    segments.push({
      blockOut: timestamp,
      blockIn: null,
      departure: payload.departure || "",
      destination: "",
      flightTime: 0,
    });
    return {
      ...currentDutyDoc,
      flightSegments: segments,
    };
  }

  case "block_in": {
    if (!currentDutyDoc || currentDutyDoc.dutyEndZulu) {
      throw new Error("Must be on duty to record block in.");
    }
    const segments = currentDutyDoc.flightSegments || [];
    const lastSeg = segments[segments.length - 1];
    if (!lastSeg || lastSeg.blockIn) {
      throw new Error("No open block-out to close.");
    }
    const blockOutTime = new Date(lastSeg.blockOut);
    const blockInTime = new Date(timestamp);
    lastSeg.blockIn = timestamp;
    lastSeg.destination = payload.destination || "";
    lastSeg.flightTime = round1((blockInTime - blockOutTime) / MS_PER_HOUR);

    const totalFlight = segments.reduce((sum, s) => sum + (s.flightTime || 0), 0);
    return {
      ...currentDutyDoc,
      flightSegments: segments,
      totalFlightHours: round1(totalFlight),
    };
  }

  default:
    throw new Error(`Unknown duty event type: ${eventType}`);
  }
}

// --- Helpers ---

function sumFlightHours(entries, now, days) {
  const cutoff = new Date(now.getTime() - days * MS_PER_DAY);
  let total = 0;
  for (const e of (entries || [])) {
    if (new Date(e.date) >= cutoff) {
      total += (e.totalTime || 0);
    }
  }
  return total;
}

function sumDutyHours(sortedPeriods, now, days) {
  const cutoff = new Date(now.getTime() - days * MS_PER_DAY);
  let total = 0;
  for (const dp of sortedPeriods) {
    if (dp._start >= cutoff) {
      const end = dp._end || now;
      total += (end - dp._start) / MS_PER_HOUR;
    }
  }
  return total;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

module.exports = { computeDutyStatus, processDutyEvent };
