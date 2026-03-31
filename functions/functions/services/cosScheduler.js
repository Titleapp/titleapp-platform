/**
 * cosScheduler.js — Chief of Staff 2x daily runs (morning + evening).
 *
 * Morning (7am PT): forward-looking — agenda, priorities, flags.
 * Evening (6pm PT): backward-looking — what moved, what didn't, tomorrow preview.
 *
 * Three report types:
 *   1. Control Center (all verticals) — revenue, pipeline, platform, schedule
 *   2. RE Daily Portfolio Report — vacancies, leases, rent, market rates
 *   3. Aviation Daily Ops Report — weather, fleet, NOTAMs, duty time
 *
 * V1: All subscribers run at PT times. Per-subscriber timezone is v2.
 *
 * Exports: runCosMorning, runCosEvening
 */

"use strict";

const admin = require("firebase-admin");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  STATUS HELPERS — same design system as admin + subscriber digests
// ═══════════════════════════════════════════════════════════════

const COLORS = { green: "#16a34a", yellow: "#ca8a04", red: "#dc2626", gray: "#6b7280" };

function statusDot(level) {
  return `<span style="color:${COLORS[level] || COLORS.green}">●</span>`;
}

function trendArrow(current, previous) {
  if (current > previous) return `<span style="color:${COLORS.green}">▲</span>`;
  if (current < previous) return `<span style="color:${COLORS.red}">▼</span>`;
  return `<span style="color:${COLORS.gray}">→</span>`;
}

function plainTrendArrow(current, previous) {
  if (current > previous) return "▲";
  if (current < previous) return "▼";
  return "→";
}

// ═══════════════════════════════════════════════════════════════
//  STATUS LOGIC
// ═══════════════════════════════════════════════════════════════

function revenueStatus(mtd, target, dayOfMonth) {
  if (!target || target <= 0) return "green";
  const pct = mtd / target;
  const pastMid = dayOfMonth > 15;
  if (pct >= 0.8) return "green";
  if (pastMid && pct < 0.4) return "red";
  if (mtd === 0 && dayOfMonth > 5) return "red";
  if (pastMid && pct < 0.8) return "yellow";
  return "green";
}

function dealStatus(deal) {
  const now = Date.now();
  const lastTouch = deal.lastTouchAt
    ? new Date(deal.lastTouchAt._seconds ? deal.lastTouchAt._seconds * 1000 : deal.lastTouchAt).getTime()
    : 0;
  const daysSinceTouch = lastTouch ? (now - lastTouch) / 86400000 : 999;
  if (deal.stage === "CLOSED_LOST") return "red";
  if (daysSinceTouch > 14) return "red";
  if (daysSinceTouch > 7) return "yellow";
  return "green";
}

// ═══════════════════════════════════════════════════════════════
//  SUBSCRIBER DISCOVERY
// ═══════════════════════════════════════════════════════════════

async function getCoSSubscribers() {
  const db = getDb();
  const paidTiers = ["tier1", "tier2", "tier3"];
  const subscribers = [];

  for (const tier of paidTiers) {
    try {
      const snap = await db.collection("users")
        .where("tier", "==", tier)
        .limit(500)
        .get();

      for (const doc of snap.docs) {
        const user = doc.data();
        if (!user.email) continue;
        subscribers.push({
          userId: doc.id,
          email: user.email,
          name: user.name || user.ownerName || "",
          tier,
        });
      }
    } catch (err) {
      console.warn(`cosScheduler: failed to query ${tier} users:`, err.message);
    }
  }

  return subscribers;
}

async function detectUserVerticals(userId) {
  const db = getDb();
  const verticals = new Set();

  try {
    const pkgSnap = await db.collection("raasPackages")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(20)
      .get();

    for (const doc of pkgSnap.docs) {
      const pkg = doc.data();
      const v = (pkg.vertical || "").toLowerCase();
      if (v.includes("real estate") || v.includes("real-estate") || v.includes("title")) verticals.add("real-estate");
      if (v.includes("aviation") || v.includes("pilot") || v.includes("flight")) verticals.add("aviation");
      if (v.includes("auto") || v.includes("dealer")) verticals.add("auto");
      if (v.includes("health") || v.includes("nursing") || v.includes("ems")) verticals.add("healthcare");
      if (v.includes("solar") || v.includes("energy")) verticals.add("solar");
      if (v.includes("web3") || v.includes("crypto")) verticals.add("web3");
    }
  } catch (err) {
    console.warn(`cosScheduler: detectUserVerticals failed for ${userId}:`, err.message);
  }

  return verticals;
}

// ═══════════════════════════════════════════════════════════════
//  DATA GATHERING — CONTROL CENTER (all verticals)
// ═══════════════════════════════════════════════════════════════

async function gatherControlCenterData(userId) {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
  const yesterday24h = new Date(Date.now() - 86400000);
  const dayOfMonth = now.getDate();

  // Revenue
  let rev = {};
  try {
    const accSnap = await db.collection("accounting").doc("summary").get();
    rev = accSnap.exists ? (accSnap.data().revenue || {}) : {};
  } catch {}

  // Analytics (today + yesterday for trends)
  let analytics = {};
  let prevAnalytics = {};
  try {
    const [todaySnap, yesterdaySnap] = await Promise.all([
      db.collection("analytics").doc(`daily_${today}`).get(),
      db.collection("analytics").doc(`daily_${yesterday}`).get(),
    ]);
    analytics = todaySnap.exists ? todaySnap.data() : {};
    prevAnalytics = yesterdaySnap.exists ? yesterdaySnap.data() : {};
  } catch {}

  // Pipeline
  let deals = [];
  let totalPipeline = 0;
  try {
    const dealsSnap = await db.collection("pipeline").doc("b2b").collection("deals").get();
    deals = dealsSnap.docs.map(d => d.data()).filter(d => !["CLOSED_LOST", "ACTIVE"].includes(d.stage));
    deals.sort((a, b) => (b.estimatedARR || 0) - (a.estimatedARR || 0));
    totalPipeline = deals.reduce((s, d) => s + (d.estimatedARR || 0), 0);
  } catch {}

  // Worker activity (last 24h)
  let workerRuns = 0;
  try {
    const runsSnap = await db.collection("messageEvents")
      .where("userId", "==", userId)
      .where("createdAt", ">=", yesterday24h)
      .limit(100)
      .get();
    workerRuns = runsSnap.size;
  } catch {}

  // Stalled deals (no activity > 7 days)
  const stalledDeals = deals.filter(d => {
    const lastTouch = d.lastTouchAt
      ? new Date(d.lastTouchAt._seconds ? d.lastTouchAt._seconds * 1000 : d.lastTouchAt).getTime()
      : 0;
    return lastTouch && (Date.now() - lastTouch) > 7 * 86400000;
  });

  const monthlyTarget = rev.monthlyTarget || 10000;
  const revStatus = revenueStatus(rev.mtd || 0, monthlyTarget, dayOfMonth);

  return {
    today,
    dayOfMonth,
    rev,
    prevRev: { mtd: prevAnalytics.revenueMtd || 0 },
    revStatus,
    monthlyTarget,
    analytics,
    prevAnalytics,
    deals: deals.slice(0, 5),
    totalPipeline,
    stalledDeals,
    workerRuns,
  };
}

// ═══════════════════════════════════════════════════════════════
//  DATA GATHERING — RE DAILY PORTFOLIO
// ═══════════════════════════════════════════════════════════════

async function gatherREPortfolioData(userId) {
  const db = getDb();
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);

  let properties = [];
  let leases = [];
  let rentCollections = [];

  // Properties — may not exist yet in v1
  try {
    const propSnap = await db.collection("portfolios").doc(userId)
      .collection("properties").limit(20).get();
    properties = propSnap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch {}

  // Leases expiring this week
  try {
    const leaseSnap = await db.collection("portfolios").doc(userId)
      .collection("leases")
      .where("expiryDate", "<=", weekFromNow)
      .limit(20)
      .get();
    leases = leaseSnap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch {}

  // Rent collection status
  try {
    const rentSnap = await db.collection("portfolios").doc(userId)
      .collection("rentCollections")
      .where("period", "==", now.toISOString().slice(0, 7))
      .limit(50)
      .get();
    rentCollections = rentSnap.docs.map(d => d.data());
  } catch {}

  const vacancies = properties.filter(p => p.status === "vacant");
  const totalRentDue = rentCollections.reduce((s, r) => s + (r.amountDue || 0), 0);
  const totalRentCollected = rentCollections.reduce((s, r) => s + (r.amountCollected || 0), 0);

  return {
    properties,
    vacancies,
    leases,
    totalRentDue,
    totalRentCollected,
    hasData: properties.length > 0 || leases.length > 0,
  };
}

// ═══════════════════════════════════════════════════════════════
//  DATA GATHERING — AVIATION DAILY OPS
// ═══════════════════════════════════════════════════════════════

async function gatherAviationOpsData(userId) {
  const db = getDb();
  const yesterday24h = new Date(Date.now() - 86400000);

  let fleet = [];
  let flights = [];
  let dutyPeriods = [];
  let squawks = [];

  // Fleet status
  try {
    const fleetSnap = await db.collection("fleet").doc(userId)
      .collection("aircraft").limit(20).get();
    fleet = fleetSnap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch {}

  // Flights completed today
  try {
    const flightSnap = await db.collection("logbooks").doc(userId)
      .collection("entries")
      .where("date", ">=", yesterday24h)
      .limit(20)
      .get();
    flights = flightSnap.docs.map(d => d.data());
  } catch {}

  // Duty periods
  try {
    const dutySnap = await db.collection("dutyPeriods").doc(userId)
      .collection("periods")
      .where("startTime", ">=", yesterday24h)
      .limit(20)
      .get();
    dutyPeriods = dutySnap.docs.map(d => d.data());
  } catch {}

  // Maintenance squawks opened today
  try {
    const squawkSnap = await db.collection("fleet").doc(userId)
      .collection("squawks")
      .where("openedAt", ">=", yesterday24h)
      .limit(10)
      .get();
    squawks = squawkSnap.docs.map(d => d.data());
  } catch {}

  return {
    fleet,
    flights,
    dutyPeriods,
    squawks,
    hasData: fleet.length > 0 || flights.length > 0,
  };
}

// ═══════════════════════════════════════════════════════════════
//  PRIORITY PICKER
// ═══════════════════════════════════════════════════════════════

function pickPriority(cc, runType) {
  // RED stalled deals
  if (cc.stalledDeals.length > 0) {
    const d = cc.stalledDeals[0];
    return { level: "red", text: `${d.company || d.contactName || "Deal"} is stalled — follow up today` };
  }
  // RED revenue
  if (cc.revStatus === "red") {
    return { level: "red", text: `Revenue at $${(cc.rev.mtd || 0).toLocaleString()} MTD — needs attention` };
  }
  // YELLOW deals
  for (const deal of cc.deals) {
    if (dealStatus(deal) === "yellow") {
      return { level: "yellow", text: `${deal.company || deal.contactName || "Deal"} needs a follow-up` };
    }
  }
  // YELLOW revenue
  if (cc.revStatus === "yellow") {
    return { level: "yellow", text: `Revenue pacing below target — $${(cc.rev.mtd || 0).toLocaleString()} of $${cc.monthlyTarget.toLocaleString()}` };
  }
  // All green
  if (runType === "morning") {
    return { level: "green", text: "All systems green. Focus on your highest-value action today." };
  }
  return { level: "green", text: "All systems green. Good day." };
}

// ═══════════════════════════════════════════════════════════════
//  HTML EMAIL — MORNING (forward-looking)
// ═══════════════════════════════════════════════════════════════

function buildMorningHtml({ userName, today, priority, cc, reData, avData, verticals }) {
  const s = `style="padding:16px 24px;border-bottom:1px solid #e5e7eb"`;
  const h = `style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#6b7280;margin:0 0 8px 0"`;
  const r = `style="font-size:14px;line-height:1.8;margin:0"`;
  const sub = `style="font-size:12px;color:#6b7280;margin:0 0 4px 18px"`;
  const priorityColor = COLORS[priority.level] || COLORS.green;

  const isSandbox = process.env.CONTROL_CENTER_DATA_MODE !== "live";
  const sandboxBanner = isSandbox
    ? `<div style="background:#f59e0b;color:#1e1b4b;text-align:center;padding:10px 24px;font-size:13px;font-weight:700;letter-spacing:1px">DEVELOPMENT ENVIRONMENT — NOT PRODUCTION DATA</div>`
    : "";

  // Priority
  const prioritySection = `
    <div ${s}>
      <p ${h}>TODAY'S PRIORITY</p>
      <p style="font-size:14px;margin:0;color:${priorityColor}">${priority.text}</p>
    </div>`;

  // Revenue
  const revenueSection = `
    <div ${s}>
      <p ${h}>REVENUE</p>
      <p ${r}>${statusDot(cc.revStatus)} $${(cc.rev.mtd || 0).toLocaleString()} MTD ${trendArrow(cc.rev.mtd || 0, cc.prevRev.mtd || 0)} &nbsp; Target: $${cc.monthlyTarget.toLocaleString()}</p>
      <p ${sub}>${Math.round(((cc.rev.mtd || 0) / cc.monthlyTarget) * 100)}% to goal — Day ${cc.dayOfMonth}</p>
    </div>`;

  // Pipeline
  let pipelineRows = "";
  for (const deal of cc.deals) {
    const ds = dealStatus(deal);
    const stalledTag = cc.stalledDeals.find(sd => sd === deal)
      ? ` <span style="color:${COLORS.red};font-size:11px;font-weight:700">STALLED</span>` : "";
    pipelineRows += `<p ${r}>${statusDot(ds)} ${deal.company || deal.contactName || "Unknown"} — ${deal.stage || "Discovery"}${stalledTag}</p>`;
  }
  const pipelineSection = cc.deals.length > 0 ? `
    <div ${s}>
      <p ${h}>PIPELINE <span style="font-weight:400;letter-spacing:0">${cc.deals.length} deals — $${(cc.totalPipeline / 1000).toFixed(0)}K potential ARR</span></p>
      ${pipelineRows}
    </div>` : "";

  // Platform
  const platformSection = `
    <div ${s}>
      <p ${h}>PLATFORM</p>
      <p ${r}>Workers Published &nbsp; ${cc.analytics.workersPublished || 0} ${trendArrow(cc.analytics.workersPublished || 0, cc.prevAnalytics.workersPublished || 0)}</p>
      <p ${r}>New Signups &nbsp; ${cc.analytics.signupsToday || 0} ${trendArrow(cc.analytics.signupsToday || 0, cc.prevAnalytics.signupsToday || 0)}</p>
      <p ${r}>Active Subscribers &nbsp; ${cc.analytics.activeSubscribers || 0} ${trendArrow(cc.analytics.activeSubscribers || 0, cc.prevAnalytics.activeSubscribers || 0)}</p>
    </div>`;

  // RE Daily Portfolio (if applicable)
  let reSection = "";
  if (verticals.has("real-estate") && reData) {
    let rows = "";
    if (reData.vacancies.length > 0) {
      rows += `<p ${r}>${statusDot("red")} ${reData.vacancies.length} vacant unit${reData.vacancies.length > 1 ? "s" : ""} — needs leasing attention</p>`;
    }
    if (reData.leases.length > 0) {
      rows += `<p ${r}>${statusDot("yellow")} ${reData.leases.length} lease${reData.leases.length > 1 ? "s" : ""} expiring this week</p>`;
    }
    if (reData.totalRentDue > 0) {
      const pct = reData.totalRentCollected / reData.totalRentDue;
      const rentStatus = pct >= 0.9 ? "green" : pct >= 0.5 ? "yellow" : "red";
      rows += `<p ${r}>${statusDot(rentStatus)} Rent: $${reData.totalRentCollected.toLocaleString()} of $${reData.totalRentDue.toLocaleString()} collected</p>`;
    }
    if (!rows && reData.hasData) {
      rows = `<p ${r}>${statusDot("green")} All properties current — no action needed</p>`;
    }
    if (rows) {
      reSection = `
        <div ${s}>
          <p ${h}>RE DAILY PORTFOLIO</p>
          ${rows}
        </div>`;
    }
  }

  // Aviation Daily Ops (if applicable)
  let avSection = "";
  if (verticals.has("aviation") && avData) {
    let rows = "";
    if (avData.fleet.length > 0) {
      rows += `<p ${r}>${statusDot("green")} Fleet: ${avData.fleet.length} aircraft tracked</p>`;
    }
    if (avData.squawks.length > 0) {
      rows += `<p ${r}>${statusDot("yellow")} ${avData.squawks.length} maintenance squawk${avData.squawks.length > 1 ? "s" : ""} open</p>`;
    }
    for (const dp of avData.dutyPeriods.slice(0, 3)) {
      const hoursUsed = dp.totalHours || 0;
      const limit = 14; // Part 117 max
      const dutyStatus = hoursUsed >= 12 ? "red" : hoursUsed >= 10 ? "yellow" : "green";
      rows += `<p ${r}>${statusDot(dutyStatus)} Duty: ${hoursUsed.toFixed(1)}h of ${limit}h limit — ${dp.crewMember || "crew"}</p>`;
    }
    if (!rows && avData.hasData) {
      rows = `<p ${r}>${statusDot("green")} All ops nominal — no safety flags</p>`;
    }
    if (rows) {
      avSection = `
        <div ${s}>
          <p ${h}>AVIATION DAILY OPS</p>
          ${rows}
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
  ${sandboxBanner}
  <div style="background:#1e1b4b;padding:24px;color:#ffffff">
    <table width="100%"><tr>
      <td style="font-size:18px;font-weight:700;letter-spacing:2px;color:#a78bfa">TITLEAPP</td>
      <td style="text-align:right;font-size:13px;color:#c4b5fd">${today}</td>
    </tr></table>
    <p style="margin:4px 0 0;font-size:13px;color:#c4b5fd">Alex — Chief of Staff</p>
  </div>
  <div ${s}>
    <p style="font-size:16px;margin:0">Good morning${userName ? " " + userName : ""}.</p>
    <p style="font-size:14px;margin:4px 0 0;color:#6b7280">Here is your day.</p>
  </div>
  ${prioritySection}
  ${revenueSection}
  ${pipelineSection}
  ${platformSection}
  ${reSection}
  ${avSection}
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="font-size:13px;color:#6b7280;margin:0">Reply to this email to talk to me.</p>
    <p style="font-size:13px;color:#6b7280;margin:4px 0 0">app.titleapp.ai</p>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
//  HTML EMAIL — EVENING (backward-looking)
// ═══════════════════════════════════════════════════════════════

function buildEveningHtml({ userName, today, priority, cc, reData, avData, verticals }) {
  const s = `style="padding:16px 24px;border-bottom:1px solid #e5e7eb"`;
  const h = `style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#6b7280;margin:0 0 8px 0"`;
  const r = `style="font-size:14px;line-height:1.8;margin:0"`;
  const sub = `style="font-size:12px;color:#6b7280;margin:0 0 4px 18px"`;
  const priorityColor = COLORS[priority.level] || COLORS.green;

  const isSandbox = process.env.CONTROL_CENTER_DATA_MODE !== "live";
  const sandboxBanner = isSandbox
    ? `<div style="background:#f59e0b;color:#1e1b4b;text-align:center;padding:10px 24px;font-size:13px;font-weight:700;letter-spacing:1px">DEVELOPMENT ENVIRONMENT — NOT PRODUCTION DATA</div>`
    : "";

  // Today's Summary
  const summarySection = `
    <div ${s}>
      <p ${h}>TODAY'S SUMMARY</p>
      <p ${r}>${statusDot(cc.revStatus)} Revenue today: delta from MTD $${(cc.rev.mtd || 0).toLocaleString()}</p>
      <p ${r}>Worker runs today: ${cc.workerRuns}</p>
      <p ${r}>New signups: ${cc.analytics.signupsToday || 0}</p>
    </div>`;

  // What Didn't Move
  let stalledRows = "";
  for (const deal of cc.stalledDeals.slice(0, 5)) {
    stalledRows += `<p ${r}>${statusDot("yellow")} ${deal.company || deal.contactName || "Unknown"} — no activity</p>`;
  }
  const stalledSection = cc.stalledDeals.length > 0 ? `
    <div ${s}>
      <p ${h}>WHAT DIDN'T MOVE</p>
      ${stalledRows}
    </div>` : "";

  // Platform
  const platformSection = `
    <div ${s}>
      <p ${h}>PLATFORM</p>
      <p ${r}>Workers Published &nbsp; ${cc.analytics.workersPublished || 0}</p>
      <p ${r}>Active Subscribers &nbsp; ${cc.analytics.activeSubscribers || 0}</p>
    </div>`;

  // Tomorrow
  const tomorrowSection = `
    <div ${s}>
      <p ${h}>TOMORROW</p>
      <p ${r} style="color:${priorityColor}">${priority.text}</p>
    </div>`;

  // RE Portfolio (evening)
  let reSection = "";
  if (verticals.has("real-estate") && reData) {
    let rows = "";
    if (reData.totalRentCollected > 0) {
      rows += `<p ${r}>${statusDot("green")} Rent collected today: $${reData.totalRentCollected.toLocaleString()}</p>`;
    }
    if (reData.leases.length > 0) {
      rows += `<p ${r}>${statusDot("yellow")} ${reData.leases.length} lease${reData.leases.length > 1 ? "s" : ""} expiring this week — review tomorrow</p>`;
    }
    if (rows) {
      reSection = `
        <div ${s}>
          <p ${h}>RE PORTFOLIO CLOSE</p>
          ${rows}
        </div>`;
    }
  }

  // Aviation Ops (evening)
  let avSection = "";
  if (verticals.has("aviation") && avData) {
    let rows = "";
    if (avData.flights.length > 0) {
      const totalTime = avData.flights.reduce((sum, f) => sum + (f.totalTime || 0), 0);
      rows += `<p ${r}>${statusDot("green")} Flights completed: ${avData.flights.length} (${totalTime.toFixed(1)}h total)</p>`;
    }
    for (const dp of avData.dutyPeriods.slice(0, 3)) {
      const remaining = 14 - (dp.totalHours || 0);
      const dutyStatus = remaining <= 2 ? "red" : remaining <= 4 ? "yellow" : "green";
      rows += `<p ${r}>${statusDot(dutyStatus)} Remaining duty: ${remaining.toFixed(1)}h — ${dp.crewMember || "crew"}</p>`;
    }
    if (avData.squawks.length > 0) {
      rows += `<p ${r}>${statusDot("yellow")} ${avData.squawks.length} squawk${avData.squawks.length > 1 ? "s" : ""} opened today</p>`;
    }
    if (rows) {
      avSection = `
        <div ${s}>
          <p ${h}>AVIATION OPS CLOSE</p>
          ${rows}
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
  ${sandboxBanner}
  <div style="background:#1e1b4b;padding:24px;color:#ffffff">
    <table width="100%"><tr>
      <td style="font-size:18px;font-weight:700;letter-spacing:2px;color:#a78bfa">TITLEAPP</td>
      <td style="text-align:right;font-size:13px;color:#c4b5fd">${today}</td>
    </tr></table>
    <p style="margin:4px 0 0;font-size:13px;color:#c4b5fd">Alex — Chief of Staff</p>
  </div>
  <div ${s}>
    <p style="font-size:16px;margin:0">End of day${userName ? ", " + userName : ""}.</p>
    <p style="font-size:14px;margin:4px 0 0;color:#6b7280">Here is what happened.</p>
  </div>
  ${summarySection}
  ${stalledSection}
  ${platformSection}
  ${reSection}
  ${avSection}
  ${tomorrowSection}
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="font-size:13px;color:#6b7280;margin:0">Reply to this email to talk to me.</p>
    <p style="font-size:13px;color:#6b7280;margin:4px 0 0">app.titleapp.ai</p>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
//  PLAIN TEXT BUILDER
// ═══════════════════════════════════════════════════════════════

function buildPlainText(runType, { userName, today, priority, cc, verticals, reData, avData }) {
  const lines = [];
  const greeting = runType === "morning"
    ? `Good morning${userName ? " " + userName : ""} — here is your day`
    : `End of day${userName ? ", " + userName : ""} — here is what happened`;

  lines.push(`TitleApp — ${greeting}`);
  lines.push(`${today}\n`);
  lines.push(`PRIORITY: ${priority.text}`);
  lines.push(`REVENUE: $${(cc.rev.mtd || 0).toLocaleString()} MTD (target $${cc.monthlyTarget.toLocaleString()})`);
  lines.push(`PIPELINE: ${cc.deals.length} active deals ($${(cc.totalPipeline / 1000).toFixed(0)}K ARR)`);

  if (runType === "morning") {
    if (cc.stalledDeals.length > 0) {
      lines.push(`STALLED: ${cc.stalledDeals.length} deal${cc.stalledDeals.length > 1 ? "s" : ""} need follow-up`);
    }
    lines.push(`PLATFORM: ${cc.analytics.signupsToday || 0} signups, ${cc.analytics.workersPublished || 0} workers`);
  } else {
    lines.push(`WORKER RUNS TODAY: ${cc.workerRuns}`);
    if (cc.stalledDeals.length > 0) {
      lines.push(`DIDN'T MOVE: ${cc.stalledDeals.length} deal${cc.stalledDeals.length > 1 ? "s" : ""}`);
    }
  }

  if (verticals.has("real-estate") && reData && reData.hasData) {
    lines.push(`\nRE PORTFOLIO: ${reData.vacancies.length} vacant, ${reData.leases.length} leases expiring`);
  }
  if (verticals.has("aviation") && avData && avData.hasData) {
    lines.push(`\nAVIATION OPS: ${avData.fleet.length} aircraft, ${avData.flights.length} flights today`);
  }

  lines.push(`\n— Alex`);
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
//  EMAIL SENDER
// ═══════════════════════════════════════════════════════════════

async function sendDigestEmail(email, subject, htmlBody, plainText) {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (!sendgridKey) {
    console.warn("cosScheduler: SENDGRID_API_KEY not set — skipping email");
    return false;
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
        reply_to: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
        subject,
        content: [
          { type: "text/plain", value: plainText },
          { type: "text/html", value: htmlBody },
        ],
      }),
    });
    return res.ok || res.status === 202;
  } catch (err) {
    console.error(`cosScheduler: email send failed for ${email}:`, err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  ORCHESTRATORS
// ═══════════════════════════════════════════════════════════════

async function runCosWorkers(runType) {
  const today = new Date().toISOString().slice(0, 10);
  let totalSent = 0;
  let totalErrors = 0;

  const subscribers = await getCoSSubscribers();
  console.log(`[cosScheduler] ${runType} run — ${subscribers.length} subscribers`);

  for (const sub of subscribers) {
    try {
      const verticals = await detectUserVerticals(sub.userId);
      const cc = await gatherControlCenterData(sub.userId);

      // Gather vertical-specific data
      let reData = null;
      let avData = null;
      if (verticals.has("real-estate")) {
        reData = await gatherREPortfolioData(sub.userId);
      }
      if (verticals.has("aviation")) {
        avData = await gatherAviationOpsData(sub.userId);
      }

      const priority = pickPriority(cc, runType);

      const templateData = {
        userName: sub.name.split(" ")[0], // first name only
        today,
        priority,
        cc,
        reData,
        avData,
        verticals,
      };

      const htmlBody = runType === "morning"
        ? buildMorningHtml(templateData)
        : buildEveningHtml(templateData);

      const plainText = buildPlainText(runType, templateData);

      const subject = runType === "morning"
        ? `Good morning — here is your day`
        : `End of day — here is what happened`;

      const sent = await sendDigestEmail(sub.email, subject, htmlBody, plainText);
      if (sent) totalSent++;
      else totalErrors++;
    } catch (err) {
      totalErrors++;
      console.error(`cosScheduler: ${runType} failed for ${sub.userId}:`, err.message);
    }
  }

  await logActivity("system", `CoS ${runType} run: ${totalSent} sent, ${totalErrors} errors for ${today}`, "info");
  return { ok: true, runType, date: today, sent: totalSent, errors: totalErrors };
}

async function runCosMorning() {
  return runCosWorkers("morning");
}

async function runCosEvening() {
  return runCosWorkers("evening");
}

module.exports = { runCosMorning, runCosEvening };
