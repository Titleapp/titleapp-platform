/**
 * generateDailyDigest.js — Admin daily digest with status indicators + trend arrows.
 *
 * Scheduled 4am HST (2pm UTC). Sends HTML email + SMS to Sean.
 * Design: Switzerland not Disneyland. Pure typography and signal.
 *
 * Status dots: ● GREEN (#16a34a), ● YELLOW (#ca8a04), ● RED (#dc2626)
 * Trend arrows: ▲ up, ▼ down, → flat
 */

const admin = require("firebase-admin");
const { logActivity } = require("./logActivity");

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  STATUS HELPERS — shared design system
// ═══════════════════════════════════════════════════════════════

const COLORS = { green: "#16a34a", yellow: "#ca8a04", red: "#dc2626", gray: "#6b7280" };

function statusDot(level) {
  return `<span style="color:${COLORS[level] || COLORS.green}">●</span>`;
}

function statusLabel(level) {
  return level.toUpperCase();
}

function trendArrow(current, previous) {
  if (current > previous) return `<span style="color:${COLORS.green}">▲</span>`;
  if (current < previous) return `<span style="color:${COLORS.red}">▼</span>`;
  return `<span style="color:${COLORS.gray}">→</span>`;
}

function plainStatusDot(level) {
  return `[${level.toUpperCase()}]`;
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
  const lastTouch = deal.lastTouchAt ? new Date(deal.lastTouchAt._seconds ? deal.lastTouchAt._seconds * 1000 : deal.lastTouchAt).getTime() : 0;
  const daysSinceTouch = lastTouch ? (now - lastTouch) / 86400000 : 999;

  if (deal.stage === "CLOSED_LOST") return "red";
  if (daysSinceTouch > 14) return "red";
  if (deal.proposalExpiresAt) {
    const expiresIn = new Date(deal.proposalExpiresAt._seconds ? deal.proposalExpiresAt._seconds * 1000 : deal.proposalExpiresAt).getTime() - now;
    if (expiresIn < 48 * 3600000) return "red";
  }
  if (daysSinceTouch > 7) return "yellow";
  if (deal.stage === "PROPOSAL_SENT" && daysSinceTouch > 3) return "yellow";
  return "green";
}

function investorStatus(investor) {
  if (investor.stage === "COMMITTED" || investor.stage === "FUNDED") return "green";
  if (investor.stage === "INTERESTED" || investor.stage === "DECK_VIEWED") return "yellow";
  if (investor.stage === "COLD" || investor.stage === "PASSED") return "red";
  return "green";
}

// ═══════════════════════════════════════════════════════════════
//  HTML EMAIL TEMPLATE
// ═══════════════════════════════════════════════════════════════

function buildAdminHtml({ today, rev, analytics, activeDeals, totalPipeline, investors, campaigns, escalations, prevAnalytics, prevRev, priority, contentSyncEvents, marketplaceStats }) {
  const dayOfMonth = new Date().getDate();
  const monthlyTarget = rev.monthlyTarget || 10000;
  const revStatus = revenueStatus(rev.mtd || 0, monthlyTarget, dayOfMonth);

  const sectionStyle = `style="padding:16px 24px;border-bottom:1px solid #e5e7eb"`;
  const headerStyle = `style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#6b7280;margin:0 0 8px 0"`;
  const rowStyle = `style="font-size:14px;line-height:1.8;margin:0"`;

  // Priority section
  const priorityColor = priority.level === "red" ? COLORS.red : priority.level === "yellow" ? COLORS.yellow : COLORS.green;
  const prioritySection = `
    <div ${sectionStyle}>
      <p ${headerStyle}>TODAY'S PRIORITY</p>
      <p style="font-size:14px;margin:0;color:${priorityColor}">→ ${priority.text}</p>
    </div>`;

  // Revenue section
  const revenueSection = `
    <div ${sectionStyle}>
      <p ${headerStyle}>REVENUE</p>
      <p ${rowStyle}>${statusDot(revStatus)} $${(rev.mtd || 0).toLocaleString()} MTD ${trendArrow(rev.mtd || 0, prevRev.mtd || 0)}  Target: $${monthlyTarget.toLocaleString()}</p>
    </div>`;

  // Pipeline section
  let pipelineRows = "";
  for (const deal of activeDeals.slice(0, 5)) {
    const ds = dealStatus(deal);
    pipelineRows += `<p ${rowStyle}>${statusDot(ds)} ${deal.company || deal.contactName || "Unknown"} — ${deal.stage || "Discovery"}</p>`;
  }
  const pipelineSection = activeDeals.length > 0 ? `
    <div ${sectionStyle}>
      <p ${headerStyle}>PIPELINE <span style="font-weight:400;letter-spacing:0">$${(totalPipeline / 1000).toFixed(0)}K potential ARR</span></p>
      ${pipelineRows}
    </div>` : "";

  // Platform section
  const platformSection = `
    <div ${sectionStyle}>
      <p ${headerStyle}>PLATFORM</p>
      <p ${rowStyle}>Workers Published &nbsp; ${analytics.workersPublished || 0} &nbsp; ${trendArrow(analytics.workersPublished || 0, prevAnalytics.workersPublished || 0)}</p>
      <p ${rowStyle}>New Signups Today &nbsp; ${analytics.signupsToday || 0} &nbsp; ${trendArrow(analytics.signupsToday || 0, prevAnalytics.signupsToday || 0)}</p>
      <p ${rowStyle}>Active Subscribers &nbsp; ${analytics.activeSubscribers || 0} &nbsp; ${trendArrow(analytics.activeSubscribers || 0, prevAnalytics.activeSubscribers || 0)}</p>
      <p ${rowStyle}>Active Campaigns &nbsp; ${campaigns.length} &nbsp; ${trendArrow(campaigns.length, 0)}</p>
    </div>`;

  // Inventory section (only if contentSync events exist)
  let inventorySection = "";
  if (contentSyncEvents && contentSyncEvents.length > 0) {
    const approved = contentSyncEvents.filter(e => e.event_type === "worker_approved");
    const deprecated = contentSyncEvents.filter(e => e.event_type === "worker_deprecated");
    const other = contentSyncEvents.filter(e => e.event_type !== "worker_approved" && e.event_type !== "worker_deprecated");
    const liveWorkers = marketplaceStats.liveWorkers || analytics.workersPublished || 0;

    let invRows = `<p ${rowStyle}>Total Live Workers &nbsp; ${liveWorkers}</p>`;
    if (approved.length > 0) {
      invRows += `<p ${rowStyle}>${statusDot("green")} ${approved.length} new worker${approved.length > 1 ? "s" : ""} approved</p>`;
      for (const ev of approved.slice(0, 3)) {
        const vLabel = ev.vertical ? ` (${ev.vertical})` : "";
        invRows += `<p style="font-size:13px;line-height:1.6;margin:0;padding-left:20px;color:#6b7280">&rarr; ${ev.name || ev.worker_id}${vLabel}</p>`;
      }
    }
    if (deprecated.length > 0) {
      invRows += `<p ${rowStyle}>${statusDot("yellow")} ${deprecated.length} worker${deprecated.length > 1 ? "s" : ""} deprecated</p>`;
    }
    if (other.length > 0) {
      invRows += `<p ${rowStyle}>${statusDot("gray")} ${other.length} other change${other.length > 1 ? "s" : ""}</p>`;
    }

    inventorySection = `
    <div ${sectionStyle}>
      <p ${headerStyle}>PLATFORM INVENTORY</p>
      ${invRows}
    </div>`;
  }

  // Investors section
  const activeInvestors = investors.filter(i => !["PASSED", "CLOSED_LOST"].includes(i.stage));
  let investorRows = "";
  for (const inv of activeInvestors.slice(0, 5)) {
    const is = investorStatus(inv);
    investorRows += `<p ${rowStyle}>${statusDot(is)} ${inv.name || inv.contactName || "Unknown"} — ${inv.stage || "New"}</p>`;
  }
  const investorSection = activeInvestors.length > 0 ? `
    <div ${sectionStyle}>
      <p ${headerStyle}>INVESTORS</p>
      ${investorRows}
    </div>` : "";

  // Needs attention section
  const attentionItems = [];
  // RED items from deals
  for (const deal of activeDeals) {
    if (dealStatus(deal) === "red") {
      attentionItems.push({ level: "red", text: `${deal.company || deal.contactName}: ${deal.stage} — stalled or expiring` });
    }
  }
  // RED items from escalations
  for (const esc of escalations.slice(0, 3)) {
    attentionItems.push({ level: "red", text: `${esc.reason}: ${(esc.context || "").slice(0, 100)}` });
  }
  // YELLOW items from deals
  for (const deal of activeDeals) {
    if (dealStatus(deal) === "yellow") {
      attentionItems.push({ level: "yellow", text: `${deal.company || deal.contactName}: needs follow-up` });
    }
  }
  // Revenue warning
  if (revStatus === "red" || revStatus === "yellow") {
    attentionItems.push({ level: revStatus, text: `Revenue at $${(rev.mtd || 0).toLocaleString()} MTD — ${revStatus === "red" ? "below target" : "watch pace"}` });
  }

  let attentionSection = "";
  if (attentionItems.length > 0) {
    let rows = "";
    for (const item of attentionItems.slice(0, 5)) {
      rows += `<p ${rowStyle}>${statusDot(item.level)} ${statusLabel(item.level)} &nbsp; ${item.text}</p>`;
    }
    attentionSection = `
    <div ${sectionStyle}>
      <p ${headerStyle}>NEEDS YOUR ATTENTION</p>
      ${rows}
    </div>`;
  }

  const isSandbox = process.env.CONTROL_CENTER_DATA_MODE !== "live";
  const sandboxBanner = isSandbox
    ? `<div style="background:#f59e0b;color:#1e1b4b;text-align:center;padding:10px 24px;font-size:13px;font-weight:700;letter-spacing:1px">DEVELOPMENT ENVIRONMENT — NOT PRODUCTION DATA</div>`
    : "";

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
  <div ${sectionStyle}>
    <p style="font-size:16px;margin:0">Good morning Sean.</p>
    <p style="font-size:14px;margin:4px 0 0;color:#6b7280">Here's your daily briefing.</p>
  </div>
  ${prioritySection}
  ${revenueSection}
  ${pipelineSection}
  ${platformSection}
  ${inventorySection}
  ${investorSection}
  ${attentionSection}
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="font-size:13px;color:#6b7280;margin:0">Reply to this email to talk to me.</p>
    <p style="font-size:13px;color:#6b7280;margin:4px 0 0">app.titleapp.ai/vault</p>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
//  PRIORITY PICKER — single most important thing
// ═══════════════════════════════════════════════════════════════

function pickPriority(activeDeals, escalations, rev, dayOfMonth, monthlyTarget) {
  // RED escalations first
  if (escalations.length > 0) {
    return { level: "red", text: `${escalations[0].reason}: ${(escalations[0].context || "").slice(0, 120)}` };
  }
  // RED deals
  for (const deal of activeDeals) {
    if (dealStatus(deal) === "red") {
      return { level: "red", text: `${deal.company || deal.contactName} is stalled — follow up today` };
    }
  }
  // Revenue RED
  const revStatus = revenueStatus(rev.mtd || 0, monthlyTarget, dayOfMonth);
  if (revStatus === "red") {
    return { level: "red", text: `Revenue at $${(rev.mtd || 0).toLocaleString()} MTD — needs attention` };
  }
  // YELLOW deals
  for (const deal of activeDeals) {
    if (dealStatus(deal) === "yellow") {
      return { level: "yellow", text: `${deal.company || deal.contactName} needs a follow-up this week` };
    }
  }
  // Revenue YELLOW
  if (revStatus === "yellow") {
    return { level: "yellow", text: `Revenue pacing below target — $${(rev.mtd || 0).toLocaleString()} of $${monthlyTarget.toLocaleString()}` };
  }
  // All green
  return { level: "green", text: "All systems green. No action needed today." };
}

// ═══════════════════════════════════════════════════════════════
//  PLAIN TEXT BUILDER — for SMS fallback
// ═══════════════════════════════════════════════════════════════

function buildPlainText({ today, rev, analytics, activeDeals, totalPipeline, investors, escalations, priority, contentSyncEvents, marketplaceStats }) {
  const lines = [];
  lines.push(`TitleApp Daily — ${today}\n`);
  lines.push(`PRIORITY: ${priority.text}`);
  lines.push(`REVENUE: $${(rev.mtd || 0).toLocaleString()} MTD`);
  lines.push(`PIPELINE: ${activeDeals.length} deals ($${(totalPipeline / 1000).toFixed(0)}K ARR)`);
  for (const deal of activeDeals.slice(0, 3)) {
    lines.push(`  ${plainStatusDot(dealStatus(deal))} ${deal.company || deal.contactName}: ${deal.stage}`);
  }
  lines.push(`PLATFORM: ${analytics.signupsToday || 0} signups, ${analytics.workersPublished || 0} workers`);
  if (contentSyncEvents && contentSyncEvents.length > 0) {
    const liveWorkers = marketplaceStats?.liveWorkers || analytics.workersPublished || 0;
    lines.push(`INVENTORY: ${contentSyncEvents.length} changes (${liveWorkers} live)`);
  }
  const activeInvestors = investors.filter(i => !["PASSED", "CLOSED_LOST"].includes(i.stage));
  if (activeInvestors.length > 0) {
    lines.push(`INVESTORS: ${activeInvestors.length} active`);
  }
  if (escalations.length > 0) {
    lines.push(`ATTENTION: ${escalations.length} open issues`);
  }
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
//  MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

async function generateDailyDigest() {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dayOfMonth = now.getDate();
  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);

  // Gather data from all sources
  const twentyFourHoursAgo = new Date(now - 86400000);
  const [
    accountingSnap,
    analyticsSnap,
    prevAnalyticsSnap,
    dealsSnap,
    investorsSnap,
    campaignsSnap,
    escalationsSnap,
    contentSyncSnap,
    marketplaceStatsSnap,
  ] = await Promise.all([
    db.collection("accounting").doc("summary").get(),
    db.collection("analytics").doc(`daily_${today}`).get(),
    db.collection("analytics").doc(`daily_${yesterday}`).get(),
    db.collection("pipeline").doc("b2b").collection("deals").get(),
    db.collection("pipeline").doc("investors").collection("deals").get(),
    db.collection("campaigns").where("status", "==", "active").get(),
    db.collection("escalations").where("resolved", "==", false).get(),
    db.collection("platform").doc("contentSync").collection("events")
      .where("timestamp", ">=", twentyFourHoursAgo)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get(),
    db.collection("platform").doc("marketplaceStats").get(),
  ]);

  const accounting = accountingSnap.exists ? accountingSnap.data() : {};
  const analytics = analyticsSnap.exists ? analyticsSnap.data() : {};
  const prevAnalytics = prevAnalyticsSnap.exists ? prevAnalyticsSnap.data() : {};
  const deals = dealsSnap.docs.map((d) => d.data());
  const investors = investorsSnap.docs.map((d) => d.data());
  const campaigns = campaignsSnap.docs.map((d) => d.data());
  const escalations = escalationsSnap.docs.map((d) => d.data());

  const contentSyncEvents = contentSyncSnap.docs.map((d) => d.data());
  const marketplaceStats = marketplaceStatsSnap.exists ? marketplaceStatsSnap.data() : {};

  const rev = accounting.revenue || {};
  const prevRev = { mtd: prevAnalytics.revenueMtd || 0 };
  const activeDeals = deals.filter((d) => !["CLOSED_LOST", "ACTIVE"].includes(d.stage));
  const totalPipeline = activeDeals.reduce((s, d) => s + (d.estimatedARR || 0), 0);
  const monthlyTarget = rev.monthlyTarget || 10000;

  // Pick single priority
  const priority = pickPriority(activeDeals, escalations, rev, dayOfMonth, monthlyTarget);

  // Build HTML email
  const htmlBody = buildAdminHtml({
    today, rev, analytics, activeDeals, totalPipeline,
    investors, campaigns, escalations, prevAnalytics, prevRev, priority,
    contentSyncEvents, marketplaceStats,
  });

  // Build plain text for SMS + email fallback
  const digestText = buildPlainText({
    today, rev, analytics, activeDeals, totalPipeline,
    investors, escalations, priority, contentSyncEvents, marketplaceStats,
  });

  // Store digest
  await db.collection("dailyDigest").doc(today).set({
    date: today,
    text: digestText,
    data: {
      revenueMtd: rev.mtd || 0,
      signupsToday: analytics.signupsToday || 0,
      activeDeals: activeDeals.length,
      totalPipeline,
      openEscalations: escalations.length,
      priority: priority.text,
    },
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send SMS (short version) if Twilio configured
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const seanPhone = "+14152360013";

  if (twilioSid && twilioAuth && twilioPhone) {
    const smsText = digestText.slice(0, 1560);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const params = new URLSearchParams({
      To: seanPhone,
      From: twilioPhone,
      Body: smsText,
    });
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
    } catch (err) {
      console.error("Failed to send digest SMS:", err.message);
    }
  }

  // Send email if SendGrid configured
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    try {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [
                { email: "seanlcombs@gmail.com" },
                { email: "sean@titleapp.ai" },
              ],
            },
          ],
          from: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
          reply_to: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
          subject: `TitleApp Daily Briefing — ${today}`,
          content: [
            { type: "text/plain", value: digestText },
            { type: "text/html", value: htmlBody },
          ],
        }),
      });
    } catch (err) {
      console.error("Failed to send digest email:", err.message);
    }
  }

  await logActivity("system", `Daily digest generated for ${today}`, "info");
  return { ok: true, date: today };
}

module.exports = { generateDailyDigest };
