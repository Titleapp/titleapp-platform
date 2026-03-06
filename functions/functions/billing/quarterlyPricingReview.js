/**
 * quarterlyPricingReview.js — Scheduled quarterly pricing review
 *
 * Runs Jan 1, Apr 1, Jul 1, Oct 1 at 9am PT.
 * Summarizes last quarter's actuals vs rates for all three revenue lines.
 * Emails sean@titleapp.ai and kent@titleapp.ai.
 */

"use strict";

const admin = require("firebase-admin");
const pricing = require("../config/pricing");

function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

async function sendReviewEmail(subject, htmlBody) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — quarterly review email skipped");
    return;
  }

  const recipients = [
    { email: "sean@titleapp.ai" },
    { email: "kent@titleapp.ai" },
  ];

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: recipients }],
      from: { email: "reports@titleapp.ai", name: "TitleApp Reports" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });
}

function getQuarterLabel(date) {
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${q} ${date.getFullYear()}`;
}

function getQuarterRange(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  // Current quarter start month (0-indexed): Q1=0, Q2=3, Q3=6, Q4=9
  const qStartMonth = Math.floor(month / 3) * 3;
  // Previous quarter
  let prevStartMonth = qStartMonth - 3;
  let prevYear = year;
  if (prevStartMonth < 0) {
    prevStartMonth = 9;
    prevYear = year - 1;
  }
  const start = new Date(prevYear, prevStartMonth, 1);
  const end = new Date(year, qStartMonth, 1);
  return { start, end };
}

async function runQuarterlyPricingReview() {
  const db = getDb();
  const now = new Date();
  const { start, end } = getQuarterRange(now);
  const quarterLabel = getQuarterLabel(start);

  // Query all usage_events for the quarter
  const eventsSnap = await db.collection("usage_events")
    .where("_written_at", ">=", start)
    .where("_written_at", "<", end)
    .get();

  const events = eventsSnap.docs.map(d => d.data());
  const totalEvents = events.length;

  if (totalEvents === 0) {
    await sendReviewEmail(
      `TitleApp Quarterly Pricing Review — ${quarterLabel}`,
      `<p>No usage events recorded during ${quarterLabel}.</p>`
    );
    return;
  }

  // ── Line 1: Inference ──────────────────────────────────────
  const totalCreditsConsumed = events.reduce((s, e) => s + (e.credits_consumed || 0), 0);
  const totalCreditsFromIncluded = events.reduce((s, e) => s + (e.credits_from_included || 0), 0);
  const totalOverageCredits = events.reduce((s, e) => s + (e.credits_overage || 0), 0);
  const totalInferenceCostActual = events.reduce((s, e) => s + (e.inference_cost_actual || 0), 0);
  const totalRevLine1 = events.reduce((s, e) => s + (e.revenue_line_1 || 0), 0);
  const overageRevenue = totalOverageCredits * pricing.creditRate;
  const inferenceMarginPct = overageRevenue > 0 ? ((overageRevenue - totalInferenceCostActual) / overageRevenue * 100) : 0;

  // ── Line 2: Data fees ──────────────────────────────────────
  const totalDataFeeActual = events.reduce((s, e) => s + (e.data_fee_actual || 0), 0);
  const totalDataFeeCharged = events.reduce((s, e) => s + (e.data_fee_charged || 0), 0);
  const totalRevLine2 = events.reduce((s, e) => s + (e.revenue_line_2 || 0), 0);
  const dataMarginPct = totalDataFeeCharged > 0 ? ((totalDataFeeCharged - totalDataFeeActual) / totalDataFeeCharged * 100) : 0;

  // ── Line 3: Audit trail ────────────────────────────────────
  const totalAuditRecords = events.filter(e => e.audit_record_written).length;
  const totalAuditFees = events.reduce((s, e) => s + (e.audit_fee_charged || 0), 0);
  const totalGasCost = events.reduce((s, e) => s + (e.gas_cost_actual || 0), 0);
  const totalRevLine3 = events.reduce((s, e) => s + (e.revenue_line_3 || 0), 0);
  const avgGasCost = totalAuditRecords > 0 ? totalGasCost / totalAuditRecords : 0;
  const gasVsThreshold = avgGasCost >= pricing.auditTrailGasCostAlert ? "ALERT" : "OK";

  // ── Creator payouts ────────────────────────────────────────
  const totalCreatorShare = events.reduce((s, e) => s + (e.creator_share_amount || 0), 0);

  // ── Total platform revenue ─────────────────────────────────
  const totalPlatformRevenue = totalRevLine1 + totalRevLine2 + totalRevLine3;

  // ── Build email ────────────────────────────────────────────
  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #7c3aed;">TitleApp Quarterly Pricing Review — ${quarterLabel}</h2>
  <p style="color: #64748b;">Period: ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)} | ${totalEvents} usage events</p>

  <h3 style="margin-top: 24px;">Line 1 — Inference Credits</h3>
  <table style="border-collapse: collapse; width: 100%;">
    <tr><td style="padding: 4px 8px;">Credits consumed</td><td style="padding: 4px 8px; text-align: right;">${totalCreditsConsumed.toLocaleString()}</td></tr>
    <tr><td style="padding: 4px 8px;">From included allowance</td><td style="padding: 4px 8px; text-align: right;">${totalCreditsFromIncluded.toLocaleString()}</td></tr>
    <tr><td style="padding: 4px 8px;">Overage credits billed</td><td style="padding: 4px 8px; text-align: right;">${totalOverageCredits.toLocaleString()}</td></tr>
    <tr><td style="padding: 4px 8px;">Overage revenue (@ $${pricing.creditRate}/credit)</td><td style="padding: 4px 8px; text-align: right;">$${overageRevenue.toFixed(2)}</td></tr>
    <tr><td style="padding: 4px 8px;">Actual AI cost (Anthropic)</td><td style="padding: 4px 8px; text-align: right;">$${totalInferenceCostActual.toFixed(2)}</td></tr>
    <tr style="font-weight: bold;"><td style="padding: 4px 8px;">Net Line 1</td><td style="padding: 4px 8px; text-align: right;">$${totalRevLine1.toFixed(2)} (${inferenceMarginPct.toFixed(0)}% margin)</td></tr>
  </table>

  <h3 style="margin-top: 24px;">Line 2 — Data Pass-Through Fees</h3>
  <table style="border-collapse: collapse; width: 100%;">
    <tr><td style="padding: 4px 8px;">Actual cost (third-party APIs)</td><td style="padding: 4px 8px; text-align: right;">$${totalDataFeeActual.toFixed(2)}</td></tr>
    <tr><td style="padding: 4px 8px;">Charged to users (@ ${pricing.dataFeeMarkupMultiplier}x)</td><td style="padding: 4px 8px; text-align: right;">$${totalDataFeeCharged.toFixed(2)}</td></tr>
    <tr style="font-weight: bold;"><td style="padding: 4px 8px;">Net Line 2</td><td style="padding: 4px 8px; text-align: right;">$${totalRevLine2.toFixed(2)} (${dataMarginPct.toFixed(0)}% margin)</td></tr>
  </table>

  <h3 style="margin-top: 24px;">Line 3 — Audit Trail</h3>
  <table style="border-collapse: collapse; width: 100%;">
    <tr><td style="padding: 4px 8px;">Records written</td><td style="padding: 4px 8px; text-align: right;">${totalAuditRecords.toLocaleString()}</td></tr>
    <tr><td style="padding: 4px 8px;">Fee revenue (@ $${pricing.auditTrailFeePerRecord}/record)</td><td style="padding: 4px 8px; text-align: right;">$${totalAuditFees.toFixed(2)}</td></tr>
    <tr><td style="padding: 4px 8px;">Gas cost total</td><td style="padding: 4px 8px; text-align: right;">$${totalGasCost.toFixed(4)}</td></tr>
    <tr><td style="padding: 4px 8px;">Avg gas/record vs $${pricing.auditTrailGasCostAlert} threshold</td><td style="padding: 4px 8px; text-align: right; color: ${gasVsThreshold === 'ALERT' ? 'red' : 'green'};">$${avgGasCost.toFixed(4)} — ${gasVsThreshold}</td></tr>
    <tr style="font-weight: bold;"><td style="padding: 4px 8px;">Net Line 3</td><td style="padding: 4px 8px; text-align: right;">$${totalRevLine3.toFixed(2)}</td></tr>
  </table>

  <h3 style="margin-top: 24px;">Summary</h3>
  <table style="border-collapse: collapse; width: 100%; border-top: 2px solid #7c3aed;">
    <tr style="font-weight: bold;"><td style="padding: 8px;">Total platform revenue (net)</td><td style="padding: 8px; text-align: right;">$${totalPlatformRevenue.toFixed(2)}</td></tr>
    <tr><td style="padding: 4px 8px;">Creator payouts (inference share)</td><td style="padding: 4px 8px; text-align: right;">$${totalCreatorShare.toFixed(2)}</td></tr>
  </table>

  <p style="margin-top: 24px; color: #94a3b8; font-size: 13px;">Auto-generated by TitleApp Quarterly Pricing Review. Rates from config/pricing.js.</p>
</div>`;

  await sendReviewEmail(
    `TitleApp Quarterly Pricing Review — ${quarterLabel}`,
    htmlBody
  );

  // Also write summary to Firestore for dashboard access
  await db.collection("pricingReviews").add({
    quarter: quarterLabel,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    eventCount: totalEvents,
    line1: { credits: totalCreditsConsumed, overage: totalOverageCredits, costActual: totalInferenceCostActual, revenueNet: totalRevLine1, marginPct: inferenceMarginPct },
    line2: { costActual: totalDataFeeActual, charged: totalDataFeeCharged, revenueNet: totalRevLine2, marginPct: dataMarginPct },
    line3: { records: totalAuditRecords, fees: totalAuditFees, gasCost: totalGasCost, avgGas: avgGasCost, revenueNet: totalRevLine3, gasStatus: gasVsThreshold },
    creatorPayouts: totalCreatorShare,
    totalPlatformRevenue,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Quarterly pricing review sent for ${quarterLabel}: ${totalEvents} events, $${totalPlatformRevenue.toFixed(2)} net revenue`);
}

module.exports = { runQuarterlyPricingReview };
