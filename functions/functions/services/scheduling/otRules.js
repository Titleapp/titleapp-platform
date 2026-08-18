"use strict";

/**
 * otRules.js — overtime-rule evaluation for crew scheduling.
 *
 * Aviation is unique in how much shift/trip trading happens — especially
 * pilots and MX, much less dispatch (Sean, 2026-08-17). This is the part
 * that was missing everywhere else in the codebase: not "can this pilot
 * legally fly" (that's dutyTimeTracker.js / av_032's legality checks,
 * already real) but "does swapping/picking up this shift blow through this
 * crew member's OT policy, and does someone need to approve it."
 *
 * Deliberately simple for v1 — a per-role weekly-hours cap with an
 * approval threshold, not a full labor-law engine. Real per-tenant OT
 * policy config, not hardcoded, so a real operator's actual CBA/policy
 * numbers can differ from the defaults.
 */

const MS_PER_HOUR = 3600000;

const DEFAULT_OT_RULES = {
  pilot: { weeklyHoursCap: 40, otApprovalThresholdHours: 4 },
  mx: { weeklyHoursCap: 40, otApprovalThresholdHours: 4 },
  dispatcher: { weeklyHoursCap: 40, otApprovalThresholdHours: 4 },
};

function hoursBetween(startZulu, endZulu) {
  if (!startZulu || !endZulu) return 0;
  const ms = new Date(endZulu).getTime() - new Date(startZulu).getTime();
  return ms > 0 ? ms / MS_PER_HOUR : 0;
}

/**
 * Sum scheduled hours for a crew member within the same ISO week as a
 * reference date, across their existing assignments.
 */
function weeklyHoursSoFar(assignments, crewId, referenceDate) {
  const ref = new Date(referenceDate);
  const weekStart = new Date(ref);
  weekStart.setUTCDate(ref.getUTCDate() - ref.getUTCDay());
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * MS_PER_HOUR);

  return (assignments || [])
    .filter(a => a.crewId === crewId && a.status !== "released" && a.status !== "cancelled")
    .filter(a => {
      const start = a.dutyStartZulu ? new Date(a.dutyStartZulu) : null;
      return start && start >= weekStart && start < weekEnd;
    })
    .reduce((sum, a) => sum + hoursBetween(a.dutyStartZulu, a.dutyEndZulu), 0);
}

/**
 * Evaluate whether picking up/swapping into a proposed assignment pushes
 * this crew member into OT, and whether it needs approval.
 *
 * @param {string} role — "pilot" | "mx" | "dispatcher"
 * @param {string} crewId
 * @param {{dutyStartZulu, dutyEndZulu}} proposedAssignment
 * @param {Array} existingAssignments — this crew member's other assignments
 * @param {Object} [tenantOtRules] — per-tenant override of DEFAULT_OT_RULES
 */
function checkOtImpact(role, crewId, proposedAssignment, existingAssignments, tenantOtRules) {
  const rules = (tenantOtRules && tenantOtRules[role]) || DEFAULT_OT_RULES[role] || DEFAULT_OT_RULES.pilot;
  const proposedHours = hoursBetween(proposedAssignment.dutyStartZulu, proposedAssignment.dutyEndZulu);
  const priorHours = weeklyHoursSoFar(existingAssignments, crewId, proposedAssignment.dutyStartZulu);
  const projectedHours = priorHours + proposedHours;
  const otHours = Math.max(0, projectedHours - rules.weeklyHoursCap);

  return {
    role,
    crewId,
    weeklyHoursCap: rules.weeklyHoursCap,
    priorHours: Math.round(priorHours * 10) / 10,
    proposedHours: Math.round(proposedHours * 10) / 10,
    projectedHours: Math.round(projectedHours * 10) / 10,
    otHours: Math.round(otHours * 10) / 10,
    approvalRequired: otHours >= rules.otApprovalThresholdHours,
    withinCap: projectedHours <= rules.weeklyHoursCap,
  };
}

module.exports = { checkOtImpact, weeklyHoursSoFar, hoursBetween, DEFAULT_OT_RULES };
