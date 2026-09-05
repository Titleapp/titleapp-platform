"use strict";

/**
 * airworthinessTracker.js — real per-tail airworthiness computation.
 *
 * Replaces the hardcoded MX Tracker fleet text (N701AA/N704AA/N705AA baked
 * into index.js's DEMO_WORKER_FALLBACKS) with a real computation over actual
 * Firestore squawk/inspection/AD records — same "compute from real records,
 * fail closed when records are absent" pattern as currencyTracker.js and
 * dutyTimeTracker.js.
 *
 * MEL category rectification intervals (14 CFR Part 91/135 Appendix / MMEL
 * convention, matching raas/rulesets/av_m01_mx_v0.json's soft_flags):
 *   Category A — before next flight (no calendar grace)
 *   Category B — 3 calendar days
 *   Category C — 10 calendar days
 *   Category D — 120 calendar days
 */

const MS_PER_DAY = 86400000;
const MEL_CATEGORY_DAYS = { A: 0, B: 3, C: 10, D: 120 };

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/**
 * Evaluate one open squawk against its MEL category deadline.
 */
function evaluateSquawk(squawk, now) {
  const category = String(squawk.category || "").toUpperCase();
  const openedAt = squawk.openedAt ? new Date(squawk.openedAt) : null;

  if (squawk.status !== "open" && squawk.status !== "deferred") {
    return { ...squawk, computedStatus: "CLOSED" };
  }

  if (!openedAt || isNaN(openedAt.getTime())) {
    return { ...squawk, computedStatus: "UNVERIFIED", detail: "No open date on record — cannot compute rectification deadline" };
  }

  if (category === "A") {
    return { ...squawk, computedStatus: "RED", detail: "Category A — must be repaired before next flight" };
  }

  const graceDays = MEL_CATEGORY_DAYS[category];
  if (graceDays == null) {
    return { ...squawk, computedStatus: "UNVERIFIED", detail: `Unrecognized MEL category "${squawk.category || ""}" — cannot compute deadline` };
  }

  const deadline = new Date(openedAt.getTime() + graceDays * MS_PER_DAY);
  const daysRemaining = daysBetween(now, deadline);

  if (squawk.status !== "deferred") {
    return { ...squawk, computedStatus: "RED", detail: `Category ${category} item not yet deferred — no dispatch relief until deferral is authorized per company MEL procedures (14 CFR §135.179)` };
  }

  let computedStatus = "GREEN";
  if (daysRemaining < 0) computedStatus = "RED";
  else if (daysRemaining <= 2) computedStatus = "YELLOW";

  return {
    ...squawk,
    computedStatus,
    daysRemaining,
    deadline: deadline.toISOString(),
    detail: daysRemaining >= 0
      ? `Category ${category} deferral — ${daysRemaining} day(s) remaining to rectify`
      : `Category ${category} deferral EXPIRED ${Math.abs(daysRemaining)} day(s) ago — aircraft unairworthy per 14 CFR §43.9 until rectified or re-deferred`,
  };
}

/**
 * Evaluate upcoming inspection against AV-M-SF-01 (30-day / 10-hour threshold).
 */
function evaluateInspection(inspection, currentHours, now) {
  if (!inspection || (!inspection.dueDate && inspection.dueAtHours == null)) {
    return { status: "UNVERIFIED", detail: "No inspection due-date/hours on record" };
  }

  let status = "GREEN";
  const reasons = [];

  if (inspection.dueDate) {
    const due = new Date(inspection.dueDate);
    const daysRemaining = daysBetween(now, due);
    if (daysRemaining < 0) { status = "RED"; reasons.push(`${inspection.type || "Inspection"} overdue by ${Math.abs(daysRemaining)} day(s)`); }
    else if (daysRemaining <= 30) { status = status === "RED" ? status : "YELLOW"; reasons.push(`${inspection.type || "Inspection"} due in ${daysRemaining} day(s)`); }
  }

  if (inspection.dueAtHours != null && currentHours != null) {
    const hoursRemaining = inspection.dueAtHours - currentHours;
    if (hoursRemaining < 0) { status = "RED"; reasons.push(`${inspection.type || "Inspection"} overdue by ${Math.abs(hoursRemaining).toFixed(1)} hrs`); }
    else if (hoursRemaining <= 10) { status = status === "RED" ? status : "YELLOW"; reasons.push(`${inspection.type || "Inspection"} due in ${hoursRemaining.toFixed(1)} hrs`); }
  }

  return { status, detail: reasons.join("; ") || `${inspection.type || "Inspection"} current`, dueDate: inspection.dueDate || null, dueAtHours: inspection.dueAtHours ?? null };
}

/**
 * Evaluate AD compliance list against AV-M-SF-02.
 */
function evaluateAdCompliance(adList, now) {
  if (!Array.isArray(adList) || !adList.length) {
    return { status: "UNVERIFIED", items: [], detail: "No AD compliance records on file — per AV-M-HS-02, compliance cannot be assumed without records" };
  }
  let worst = "GREEN";
  const items = adList.map(ad => {
    if (!ad.compliantAsOf) {
      worst = worst === "RED" ? worst : "YELLOW";
      return { ...ad, status: "UNVERIFIED", detail: "No compliance record entry — cannot assert compliance" };
    }
    if (ad.nextDue) {
      const due = new Date(ad.nextDue);
      const daysRemaining = daysBetween(now, due);
      if (daysRemaining < 0) { worst = "RED"; return { ...ad, status: "RED", detail: `Overdue by ${Math.abs(daysRemaining)} day(s)` }; }
      if (daysRemaining <= 30) { worst = worst === "RED" ? worst : "YELLOW"; return { ...ad, status: "YELLOW", detail: `Due in ${daysRemaining} day(s)` }; }
    }
    return { ...ad, status: "GREEN", detail: `Compliant as of ${ad.compliantAsOf}` };
  });
  return { status: worst, items, detail: null };
}

/**
 * Evaluate the generalized scheduled-maintenance list ("MX To-Do") — a
 * superset of the single nextInspection field above. Each item carries its
 * own basis (hours or calendar) and a mandatory flag: mandatory items
 * (Annual, 100-hr, recurring ADs folded in here for display, required
 * periodic inspections) contribute to blocking airworthiness when overdue;
 * non-mandatory items (open non-mandatory SBs, operator-added reminders)
 * are advisory only and never block. Same fixed 30-day / 10-hour threshold
 * as evaluateInspection above, for consistency — a percentage-of-interval
 * rule would need intervalHours/intervalMonths populated on every item,
 * which is optional/reference-only here.
 */
function evaluateMaintenanceItem(item, currentHours, now) {
  const basis = String(item.basis || "").toLowerCase();
  const reasons = [];
  let status = "GREEN";

  if (basis === "calendar" && item.dueDate) {
    const due = new Date(item.dueDate);
    if (!isNaN(due.getTime())) {
      const daysRemaining = daysBetween(now, due);
      if (daysRemaining < 0) { status = "RED"; reasons.push(`overdue by ${Math.abs(daysRemaining)} day(s)`); }
      else if (daysRemaining <= 30) { status = "YELLOW"; reasons.push(`due in ${daysRemaining} day(s)`); }
      else reasons.push(`due ${item.dueDate}`);
      return { ...item, computedStatus: item.mandatory === false ? (status === "RED" ? "YELLOW" : status) : status, daysRemaining, detail: reasons.join("; ") };
    }
  }
  if (basis === "hours" && item.dueAtHours != null && currentHours != null) {
    const hoursRemaining = Number(item.dueAtHours) - Number(currentHours);
    if (hoursRemaining < 0) { status = "RED"; reasons.push(`overdue by ${Math.abs(hoursRemaining).toFixed(1)} hrs`); }
    else if (hoursRemaining <= 10) { status = "YELLOW"; reasons.push(`due in ${hoursRemaining.toFixed(1)} hrs`); }
    else reasons.push(`due at ${item.dueAtHours} hrs (${hoursRemaining.toFixed(1)} hrs remaining)`);
    return { ...item, computedStatus: item.mandatory === false ? (status === "RED" ? "YELLOW" : status) : status, hoursRemaining, detail: reasons.join("; ") };
  }
  return { ...item, computedStatus: "UNVERIFIED", detail: "No due date/hours on record for this item — cannot compute status" };
}

function evaluateMaintenanceItems(items, currentHours, now) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return { status: "NONE", items: [], detail: "No scheduled maintenance items on file" };
  const evaluated = list.map(i => evaluateMaintenanceItem(i, currentHours, now));
  let worst = "GREEN";
  evaluated.forEach(i => {
    if (i.mandatory === false) return; // advisory items never move the aggregate status
    if (i.computedStatus === "RED") worst = "RED";
    else if (i.computedStatus === "UNVERIFIED" && worst !== "RED") worst = "UNVERIFIED";
    else if (i.computedStatus === "YELLOW" && worst === "GREEN") worst = "YELLOW";
  });
  return { status: worst, items: evaluated };
}

/**
 * Evaluate warranty/coverage records — informational only. Warranty
 * expiration is a business/cost concern, not an airworthiness one, so this
 * NEVER contributes to the aircraft's overall RED/YELLOW/GREEN status or
 * blockingItems, unlike inspections/ADs/mandatory maintenance items above.
 */
function evaluateWarranty(w, currentHours, now) {
  const reasons = [];
  let status = "GREEN";
  let hasBasis = false;

  if (w.expirationDate) {
    hasBasis = true;
    const due = new Date(w.expirationDate);
    if (!isNaN(due.getTime())) {
      const daysRemaining = daysBetween(now, due);
      if (daysRemaining < 0) { status = "RED"; reasons.push(`expired ${Math.abs(daysRemaining)} day(s) ago`); }
      else if (daysRemaining <= 60) { status = "YELLOW"; reasons.push(`expires in ${daysRemaining} day(s)`); }
      else reasons.push(`covered through ${w.expirationDate}`);
    }
  }
  if (w.expirationHours != null && currentHours != null) {
    hasBasis = true;
    const hoursRemaining = Number(w.expirationHours) - Number(currentHours);
    if (hoursRemaining < 0) { status = status === "RED" ? status : "RED"; reasons.push(`expired ${Math.abs(hoursRemaining).toFixed(1)} hrs ago`); }
    else if (hoursRemaining <= 25 && status !== "RED") { status = "YELLOW"; reasons.push(`expires in ${hoursRemaining.toFixed(1)} hrs`); }
    else reasons.push(`covered through ${w.expirationHours} hrs`);
  }
  if (!hasBasis) return { ...w, computedStatus: "UNVERIFIED", detail: "No expiration date/hours on record for this warranty" };
  return { ...w, computedStatus: status, detail: reasons.join("; ") };
}

function evaluateWarranties(warranties, currentHours, now) {
  const list = Array.isArray(warranties) ? warranties : [];
  if (!list.length) return { items: [], detail: "No warranty/coverage records on file" };
  return { items: list.map(w => evaluateWarranty(w, currentHours, now)) };
}

/**
 * NEF — Negative Equipment List (per CODEX 40 §4 (Worker 4 — Compliance Documents table): equipment not installed
 * that otherwise would be required, documented absence — distinct from
 * MEL, which is temporarily-inoperative equipment). Purely a documentation
 * list: no due date, no status computation, never blocks airworthiness.
 * Kept as a passthrough here so listAircraft/getAirworthiness expose it
 * from the same computed-record shape as everything else.
 */
function passthroughNef(nefItems) {
  return Array.isArray(nefItems) ? nefItems : [];
}

/**
 * Compute full airworthiness picture for one tail.
 *
 * @param {Object} aircraft — aircraftRecords/{userId}/aircraft/{tail} doc data
 * @param {Array} squawks — subcollection docs for this tail
 * @param {Date} [now]
 */
function computeAirworthiness(aircraft, squawks, now) {
  now = now || new Date();

  if (!aircraft) {
    return {
      tailNumber: null,
      status: "UNVERIFIED",
      summary: "No aircraft record on file — cannot determine airworthiness. Per 14 CFR §43.9, absence of records is not a basis to assume airworthy.",
      openSquawks: [],
      inspection: { status: "UNVERIFIED" },
      adCompliance: { status: "UNVERIFIED", items: [] },
      maintenanceSchedule: { status: "NONE", items: [] },
      warranties: { items: [] },
      nefItems: [],
    };
  }

  const openSquawks = (squawks || [])
    .filter(s => s.status === "open" || s.status === "deferred")
    .map(s => evaluateSquawk(s, now));

  const inspection = evaluateInspection(aircraft.nextInspection, aircraft.totalTimeHours, now);
  const adCompliance = evaluateAdCompliance(aircraft.adCompliance, now);
  const maintenanceSchedule = evaluateMaintenanceItems(aircraft.maintenanceItems, aircraft.totalTimeHours, now);
  const warranties = evaluateWarranties(aircraft.warranties, aircraft.totalTimeHours, now);
  const nefItems = passthroughNef(aircraft.nefItems);

  const statuses = [
    ...openSquawks.map(s => s.computedStatus),
    inspection.status,
    adCompliance.status,
    maintenanceSchedule.status,
  ];
  let status = "GREEN";
  if (statuses.includes("RED")) status = "RED";
  else if (statuses.includes("UNVERIFIED")) status = "UNVERIFIED";
  else if (statuses.includes("YELLOW")) status = "YELLOW";

  const blockingItems = openSquawks
    .filter(s => s.computedStatus === "RED")
    .map(s => s.detail);
  if (inspection.status === "RED") blockingItems.push(inspection.detail);
  if (adCompliance.status === "RED") blockingItems.push(...adCompliance.items.filter(i => i.status === "RED").map(i => `AD ${i.ad || "?"}: ${i.detail}`));
  if (maintenanceSchedule.status === "RED") {
    blockingItems.push(...maintenanceSchedule.items
      .filter(i => i.mandatory !== false && i.computedStatus === "RED")
      .map(i => `${i.description || "Scheduled item"}: ${i.detail}`));
  }

  return {
    tailNumber: aircraft.tailNumber || null,
    type: aircraft.type || null,
    totalTimeHours: aircraft.totalTimeHours ?? null,
    capabilities: aircraft.capabilities || null,
    status,
    summary: status === "RED"
      ? `NOT AIRWORTHY per tracked records — return-to-service determination belongs to a certificated A&P/IA (14 CFR §43.9), but the tracked record shows a blocking item.`
      : status === "UNVERIFIED"
        ? "Airworthiness UNVERIFIED — one or more required records are missing. Do not assume airworthy."
        : status === "YELLOW"
          ? "Tracked airworthy — one or more items approaching a limit."
          : "Tracked airworthy — no open blocking items on record.",
    openSquawks,
    inspection,
    adCompliance,
    maintenanceSchedule,
    warranties,
    nefItems,
    blockingItems,
  };
}

module.exports = {
  computeAirworthiness,
  evaluateSquawk,
  evaluateInspection,
  evaluateAdCompliance,
  evaluateMaintenanceItems,
  evaluateWarranties,
};
