"use strict";

/**
 * missionLegTracker.js — CODEX 91: historical flight-data & mission-time
 * analytics for SKYE (MX/Dispatch).
 *
 * The gap this closes: the existing ADS-B connector (services/aviation/adsb.js)
 * is live-only — no historical or by-date-range query exists on our current
 * plan. Buying real historical backfill (ADS-B Exchange's direct "Daily
 * Operations"/"Trace Files" products) is a real, separate decision (vendor
 * quote, coverage-quality check, license terms — see CODEX 91 Open
 * Decisions) that hasn't been made yet. This module is the part that DOESN'T
 * wait on that decision: a live-polling job that starts building up real
 * mission-leg history going forward, using the connector we already have and
 * already pay for.
 *
 * Firestore: aircraftRecords/{scopeId}/aircraft/{tailNumber}/missionLegs/{id}
 * (same scoping discipline as squawks/logbook in aircraftRecords.js).
 *
 * HONEST LIMITATION, stated here and in CODEX 91's Open Decisions #7: this is
 * a simple ground/airborne state machine. It does NOT handle scene landings,
 * hover/hoist operations without a full touchdown, or multi-stop missions —
 * a real HEMS mission profile can defeat this naive detector (e.g. a hoist
 * that never registers "on ground" will never close a leg; a mission with a
 * scene stop and a hospital transfer may register as two legs, not one).
 * Good enough to start accumulating real data and validate the pipeline;
 * NOT yet good enough to treat every leg boundary as ground truth for a real
 * staffing decision. Revisit once real HEMS mission data has been observed.
 */

const admin = require("firebase-admin");
const { getPositionByRegistration } = require("../aviation/adsb");

function getDb() { return admin.firestore(); }

function resolveScopeId({ userId, tenantId }) {
  return tenantId || userId;
}

function missionLegsRef(db, scopeId, tailNumber) {
  return db.collection("aircraftRecords").doc(scopeId).collection("aircraft")
    .doc(String(tailNumber).toUpperCase()).collection("missionLegs");
}

// If we haven't heard from a tail in this long while a leg is open, close it
// as a best-effort estimate rather than leaving it open forever — signal
// loss over remote/mountainous terrain is a real, expected failure mode for
// this specific use case (see CODEX 91 Open Decision #6), not a bug.
const SIGNAL_LOSS_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes

/**
 * One poll cycle for one tail: fetch live position, advance the ground/
 * airborne state machine. Call this on a schedule (see index.js
 * pollMissionLegs) for every tail worth tracking.
 */
async function pollTailForLegs({ tailNumber, ctx }) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const tail = String(tailNumber).toUpperCase();
  const legsCol = missionLegsRef(db, scopeId, tail);

  const openSnap = await legsCol.where("status", "==", "open").limit(1).get();
  const openLeg = openSnap.empty ? null : openSnap.docs[0];

  const posResult = await getPositionByRegistration({ registration: tail, userId: ctx.userId, tenantId: ctx.tenantId });
  if (posResult.error) {
    console.warn(`[missionLegTracker] position lookup failed for ${tail}:`, posResult.error);
    return { ok: false, error: posResult.error };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // No current position (not visible right now) — normal, not an error.
  if (!posResult.aircraft) {
    if (openLeg) {
      const lastSeenAt = new Date(openLeg.data().lastSeenAt || openLeg.data().wheelsUpAt);
      if (now.getTime() - lastSeenAt.getTime() > SIGNAL_LOSS_TIMEOUT_MS) {
        await openLeg.ref.update({
          status: "closed",
          wheelsDownAt: lastSeenAt.toISOString(),
          endReason: "signal_lost",
          // Best-effort estimate only — see module header. The true landing
          // time could be anywhere between lastSeenAt and now; this is NOT a
          // confirmed wheels-down time the way a real "landed" close is.
          closedAt: nowIso,
        });
        return { ok: true, action: "closed_signal_lost", tailNumber: tail, legId: openLeg.id };
      }
    }
    return { ok: true, action: "no_data", tailNumber: tail };
  }

  const { onGround } = posResult.aircraft;

  if (onGround) {
    if (openLeg) {
      await openLeg.ref.update({
        status: "closed",
        wheelsDownAt: nowIso,
        endReason: "landed",
        lastSeenAt: nowIso,
        closedAt: nowIso,
      });
      return { ok: true, action: "closed_landed", tailNumber: tail, legId: openLeg.id };
    }
    return { ok: true, action: "on_ground_no_leg", tailNumber: tail };
  }

  // Airborne.
  if (openLeg) {
    await openLeg.ref.update({ lastSeenAt: nowIso });
    return { ok: true, action: "leg_continues", tailNumber: tail, legId: openLeg.id };
  }

  const newLeg = {
    tailNumber: tail,
    status: "open",
    wheelsUpAt: nowIso,
    wheelsDownAt: null,
    lastSeenAt: nowIso,
    endReason: null,
    source: "adsb_live_poll",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const ref = await legsCol.add(newLeg);
  return { ok: true, action: "opened", tailNumber: tail, legId: ref.id };
}

/**
 * Launch-time heatmap: closed legs for a tail (or, if tailNumber omitted,
 * the caller should invoke this once per tail — kept single-tail for now,
 * matching aircraftRecords.js's per-tail scoping elsewhere in this file).
 * Aggregates by hour-of-day (0-23, local to the leg's own ISO timestamp —
 * NOT timezone-normalized across bases; a real cross-base rollup needs a
 * base-timezone decision this doc hasn't made) and day-of-week (0=Sun).
 */
async function getLaunchTimeHeatmap({ tailNumber, startDate, endDate, ctx }) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const tail = String(tailNumber).toUpperCase();
  const legsCol = missionLegsRef(db, scopeId, tail);

  let q = legsCol.where("status", "==", "closed");
  const snap = await q.get();

  const byHour = Array.from({ length: 24 }, () => 0);
  const byDow = Array.from({ length: 7 }, () => 0);
  const cells = {}; // "dow-hour" -> count
  let legsCounted = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    const wheelsUp = data.wheelsUpAt ? new Date(data.wheelsUpAt) : null;
    if (!wheelsUp || isNaN(wheelsUp.getTime())) return;
    if (startDate && wheelsUp < new Date(startDate)) return;
    if (endDate && wheelsUp > new Date(endDate)) return;

    const hour = wheelsUp.getUTCHours();
    const dow = wheelsUp.getUTCDay();
    byHour[hour] += 1;
    byDow[dow] += 1;
    const key = `${dow}-${hour}`;
    cells[key] = (cells[key] || 0) + 1;
    legsCounted += 1;
  });

  return {
    ok: true,
    tailNumber: tail,
    legsCounted,
    byHourUtc: byHour,
    byDayOfWeekUtc: byDow,
    cells,
    note: legsCounted === 0
      ? "No closed mission legs on file yet for this tail/range — this heatmap fills in as live polling accumulates data, or once a historical backfill source is chosen (see CODEX 91)."
      : null,
  };
}

/**
 * Unfulfilled-mission detection: real trip requests marked "released" that
 * have no matching ADS-B-verified leg on the assigned tail within
 * matchWindowMinutes of requestedDepartureZulu. See CODEX 91 Open Decision
 * #9 — a "no match" here is a real, flaggable gap, but this function does
 * NOT attempt to classify WHY (aircraft/crew unavailable vs. a genuinely
 * missed market opportunity) — that's a human judgment call on each flagged
 * gap, not something derived from this data alone.
 */
async function detectUnfulfilledMissions({ startDate, endDate, matchWindowMinutes = 120, ctx }) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);

  let tripQuery = db.collection("dispatchTripRequests").doc(scopeId).collection("requests")
    .where("status", "==", "released");
  const tripsSnap = await tripQuery.get();

  const windowMs = matchWindowMinutes * 60 * 1000;
  const results = [];

  for (const tripDoc of tripsSnap.docs) {
    const trip = tripDoc.data();
    if (!trip.requestedDepartureZulu) {
      results.push({ tripRequestId: tripDoc.id, status: "unscored", reason: "no requestedDepartureZulu on file" });
      continue;
    }
    const requested = new Date(trip.requestedDepartureZulu);
    if (isNaN(requested.getTime())) continue;
    if (startDate && requested < new Date(startDate)) continue;
    if (endDate && requested > new Date(endDate)) continue;

    if (!trip.tailNumber) {
      results.push({ tripRequestId: tripDoc.id, status: "unscored", reason: "no tailNumber assigned on the trip request", requestedDepartureZulu: trip.requestedDepartureZulu });
      continue;
    }

    const legsSnap = await missionLegsRef(db, scopeId, trip.tailNumber)
      .where("status", "==", "closed")
      .get();

    const matchingLeg = legsSnap.docs.find((d) => {
      const wheelsUp = new Date(d.data().wheelsUpAt);
      return Math.abs(wheelsUp.getTime() - requested.getTime()) <= windowMs;
    });

    results.push({
      tripRequestId: tripDoc.id,
      tailNumber: String(trip.tailNumber).toUpperCase(),
      requestedDepartureZulu: trip.requestedDepartureZulu,
      status: matchingLeg ? "fulfilled" : "unfulfilled",
      matchedLegId: matchingLeg ? matchingLeg.id : null,
    });
  }

  const unfulfilled = results.filter((r) => r.status === "unfulfilled");
  const unscored = results.filter((r) => r.status === "unscored");

  return {
    ok: true,
    totalReleasedTripRequests: tripsSnap.size,
    fulfilledCount: results.filter((r) => r.status === "fulfilled").length,
    unfulfilledCount: unfulfilled.length,
    unscoredCount: unscored.length,
    unfulfilled,
    unscored,
    note: "\"unfulfilled\" means no matching ADS-B-verified leg was found within the match window — this does NOT classify why (aircraft/crew unavailable vs. missed demand vs. a data gap). See CODEX 91 Open Decision #9.",
  };
}

async function handleGetLaunchTimeHeatmap(req, res, ctx) {
  const q = req.query || {};
  if (!q.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  try {
    const result = await getLaunchTimeHeatmap({ tailNumber: q.tailNumber, startDate: q.startDate, endDate: q.endDate, ctx });
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

async function handleDetectUnfulfilledMissions(req, res, ctx) {
  const q = req.query || {};
  try {
    const result = await detectUnfulfilledMissions({
      startDate: q.startDate, endDate: q.endDate,
      matchWindowMinutes: q.matchWindowMinutes ? Number(q.matchWindowMinutes) : undefined,
      ctx,
    });
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = {
  pollTailForLegs,
  getLaunchTimeHeatmap,
  detectUnfulfilledMissions,
  handleGetLaunchTimeHeatmap,
  handleDetectUnfulfilledMissions,
};
