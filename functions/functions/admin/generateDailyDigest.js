/**
 * generateDailyDigest.js — Scheduled 7am PST: builds + sends Alex's daily digest.
 */

const admin = require("firebase-admin");
const { logActivity } = require("./logActivity");

function getDb() { return admin.firestore(); }

async function generateDailyDigest() {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterdayStart = new Date(now - 86400000);
  yesterdayStart.setHours(0, 0, 0, 0);

  // Gather data from all sources
  const [
    accountingSnap,
    analyticsSnap,
    dealsSnap,
    investorsSnap,
    campaignsSnap,
    escalationsSnap,
  ] = await Promise.all([
    db.collection("accounting").doc("summary").get(),
    db.collection("analytics").doc(`daily_${today}`).get(),
    db.collection("pipeline").doc("b2b").collection("deals").get(),
    db.collection("pipeline").doc("investors").collection("deals").get(),
    db.collection("campaigns").where("status", "==", "active").get(),
    db.collection("escalations").where("resolved", "==", false).get(),
  ]);

  const accounting = accountingSnap.exists ? accountingSnap.data() : {};
  const analytics = analyticsSnap.exists ? analyticsSnap.data() : {};
  const deals = dealsSnap.docs.map((d) => d.data());
  const investors = investorsSnap.docs.map((d) => d.data());
  const campaigns = campaignsSnap.docs.map((d) => d.data());
  const openEscalations = escalationsSnap.docs.map((d) => d.data());

  const rev = accounting.revenue || {};
  const activeDeals = deals.filter((d) => !["CLOSED_LOST", "ACTIVE"].includes(d.stage));
  const totalPipeline = activeDeals.reduce((s, d) => s + (d.estimatedARR || 0), 0);

  // Build digest text
  const lines = [];
  lines.push(`Good morning Sean. Here's your TitleApp overnight summary:\n`);
  lines.push(`REVENUE: $${(rev.mtd || 0).toLocaleString()} MTD`);
  lines.push(`NEW USERS: ${analytics.signupsToday || 0} signups today`);
  lines.push(`WORKERS: ${analytics.workersPublished || 0} published total`);
  lines.push(`ACTIVE DEALS: ${activeDeals.length} in pipeline ($${(totalPipeline / 1000).toFixed(0)}K potential ARR)`);

  // Deal highlights
  for (const deal of activeDeals.slice(0, 3)) {
    lines.push(`  → ${deal.company || deal.contactName}: ${deal.stage}`);
  }

  // Investor highlights
  const recentInvestors = investors.filter((i) => i.stage === "INTERESTED" || i.stage === "DECK_VIEWED");
  if (recentInvestors.length > 0) {
    lines.push(`INVESTORS: ${recentInvestors.length} active in pipeline`);
  }

  // Campaign highlights
  for (const campaign of campaigns.slice(0, 2)) {
    const m = campaign.metrics || {};
    lines.push(`CAMPAIGN: ${campaign.name} — CTR ${(m.ctr || 0).toFixed(1)}% ($${(campaign.budget?.daily || 0)}/day)`);
  }

  // Needs attention
  if (openEscalations.length > 0) {
    lines.push(`\nNEEDS YOUR ATTENTION:`);
    for (const esc of openEscalations.slice(0, 3)) {
      lines.push(`  → ${esc.reason}: ${(esc.context || "").slice(0, 100)}`);
    }
  }

  if (openEscalations.length === 0) {
    lines.push(`\nNo other issues. All systems green.`);
  }

  const digestText = lines.join("\n");

  // Store digest
  await db.collection("dailyDigest").doc(today).set({
    date: today,
    text: digestText,
    data: {
      revenueMtd: rev.mtd || 0,
      signupsToday: analytics.signupsToday || 0,
      activeDeals: activeDeals.length,
      totalPipeline,
      openEscalations: openEscalations.length,
    },
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send SMS (short version) if Twilio configured
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const seanPhone = "+14152360013";

  if (twilioSid && twilioAuth && twilioPhone) {
    // Truncate for SMS (1600 char limit)
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
    const htmlBody = `<pre style="font-family: -apple-system, sans-serif; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${digestText}</pre>`;
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
          subject: `TitleApp Daily Digest — ${today}`,
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
