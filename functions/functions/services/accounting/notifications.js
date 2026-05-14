"use strict";

/**
 * notifications.js — Accounting-side outbound notifications.
 *
 * 1. notifyApprovalCreated: fires on every new controllerApprovals doc —
 *    a side-effect blocked by the Controller pre-commit hook — and emails
 *    the workspace owner so they can decide without having to discover
 *    the approval by opening the app.
 *
 * 2. scanRecurringDueSoon + emitRecurringDigest: daily cron that finds
 *    transactions flagged `recurring: true` with `expectedNextDate`
 *    falling inside the next N days, and emails the workspace owner a
 *    heads-up digest. The point: kill auto-pay refund-chase by giving
 *    Sean a chance to pause/dispute *before* the charge hits.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// Outbound transactional mail. Mirrors communications/sendEmail.js but
// bypasses the HTTP request/response surface — used from triggers/cron.
async function sendEmail({ to, subject, htmlBody, plainBody, from }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("[accounting/notifications] SENDGRID_API_KEY not set — skipping email send");
    return { ok: false, reason: "no_api_key" };
  }
  const fromAddr = from || "alex@titleapp.ai";
  const sgPayload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromAddr, name: "Alex — TitleApp" },
    subject,
    content: [],
  };
  if (plainBody) sgPayload.content.push({ type: "text/plain", value: plainBody });
  if (htmlBody)  sgPayload.content.push({ type: "text/html",  value: htmlBody });

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(sgPayload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[accounting/notifications] SendGrid failed: ${res.status} ${text.slice(0, 200)}`);
    return { ok: false, reason: "sendgrid_error", status: res.status };
  }
  return { ok: true };
}

// Resolve the workspace owner's email. tenants/{tenantId}.ownerEmail is
// where this should live long-term; for now we fall back to looking up
// the first admin membership.
async function resolveTenantOwnerEmail(tenantId) {
  const db = getDb();
  try {
    const tenantSnap = await db.doc(`tenants/${tenantId}`).get();
    if (tenantSnap.exists && tenantSnap.data().ownerEmail) return tenantSnap.data().ownerEmail;

    const memSnap = await db.collection("memberships")
      .where("tenantId", "==", tenantId)
      .where("role", "==", "admin")
      .where("status", "==", "active")
      .limit(1)
      .get();
    if (memSnap.empty) return null;
    const uid = memSnap.docs[0].data().userId;
    const userSnap = await db.doc(`users/${uid}`).get();
    return userSnap.exists ? (userSnap.data().email || null) : null;
  } catch (e) {
    console.warn(`[accounting/notifications] owner lookup failed for ${tenantId}:`, e.message);
    return null;
  }
}

function dollars(cents) {
  return `$${((cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function actionLabel(action) {
  switch (action) {
    case "sendEmailCampaign":  return "Send email campaign";
    case "scheduleSocialPost": return "Schedule social post";
    case "enqueueMessage":     return "Queue message";
    case "scheduleAdsBuy":     return "Ads buy";
    default: return action || "Unknown action";
  }
}

// ── Approval-created notification ────────────────────────────────────
async function notifyApprovalCreated(approval) {
  if (!approval || approval.notified) return { ok: false, reason: "already_notified" };
  const tenantId = approval.tenantId;
  if (!tenantId) return { ok: false, reason: "no_tenant" };

  const ownerEmail = await resolveTenantOwnerEmail(tenantId);
  if (!ownerEmail) return { ok: false, reason: "no_owner_email" };

  const check = approval.check || {};
  const data  = approval.data  || {};
  const subject = `[Controller] ${actionLabel(approval.action)} blocked — needs your approval`;

  const lines = [
    `Your Accounting controller blocked a spend request and is asking for your approval.`,
    ``,
    `Action: ${actionLabel(approval.action)}`,
    `Estimated cost: ${dollars(check.estimatedCents)}`,
    `Category: ${check.category?.name || "—"}`,
    `Monthly cap: ${dollars(check.capCents)} — spent ${dollars(check.spentMtdCents)} MTD`,
    `Projected after: ${dollars((check.spentMtdCents || 0) + (check.estimatedCents || 0))} (over cap)`,
    ``,
    `Decide in the app: Accounting → Approvals tab.`,
  ];
  if (approval.action === "sendEmailCampaign") {
    lines.push(``, `Campaign: "${data.subject || "(no subject)"}" → ${data.recipientCount || data.contacts?.length || "—"} recipients`);
  }
  const plainBody = lines.join("\n");
  const htmlBody = `<p>${lines.map(l => l || "&nbsp;").join("<br/>")}</p>`;

  const r = await sendEmail({ to: ownerEmail, subject, plainBody, htmlBody });
  if (r.ok) {
    try {
      await getDb().doc(`controllerApprovals/${approval.id}`).update({
        notified: true,
        notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        notifiedEmail: ownerEmail,
      });
    } catch (_) { /* non-fatal */ }
  }
  return r;
}

// ── Recurring-charge pre-charge digest ────────────────────────────────
// Scans every tenant's transactions for recurring:true + expectedNextDate
// inside the window, groups by tenant, emails each tenant's owner one
// digest. Returns { tenantsAlerted, itemsTotal } for the cron summary.
async function emitRecurringDigest({ daysAhead = 5 } = {}) {
  const db = getDb();
  const now = new Date();
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  // We don't have a composite index by date — scan + filter in memory.
  // Volume is low pre-launch; if this ever gets hot, build an index.
  const snap = await db.collection("transactions")
    .where("recurring", "==", true)
    .limit(5000)
    .get();

  const byTenant = new Map();
  snap.docs.forEach(d => {
    const t = { id: d.id, ...d.data() };
    if (!t.tenantId || !t.expectedNextDate) return;
    const due = new Date(t.expectedNextDate);
    if (isNaN(due.getTime())) return;
    if (due < now || due > horizon) return;
    if (!byTenant.has(t.tenantId)) byTenant.set(t.tenantId, []);
    byTenant.get(t.tenantId).push(t);
  });

  let alerted = 0;
  let total = 0;
  for (const [tenantId, items] of byTenant.entries()) {
    const ownerEmail = await resolveTenantOwnerEmail(tenantId);
    if (!ownerEmail) continue;
    items.sort((a, b) => String(a.expectedNextDate).localeCompare(String(b.expectedNextDate)));
    const tableRows = items.map(i => `<tr><td>${i.expectedNextDate}</td><td>${(i.description || "—").replace(/</g, "&lt;")}</td><td style="text-align:right;">${dollars(i.amountCents)}</td></tr>`).join("");
    const subject = `Heads up: ${items.length} recurring ${items.length === 1 ? "charge" : "charges"} hitting in the next ${daysAhead} days`;
    const htmlBody = `
<p>Your Accounting worker spotted recurring charges expected to hit your accounts in the next ${daysAhead} days.</p>
<p>Review now and pause/dispute any you don't want — it's easier to stop a charge before it lands than chase a refund after.</p>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:13px;">
<thead><tr style="background:#f8fafc;color:#64748b;text-align:left;"><th style="padding:8px;border-bottom:1px solid #e2e8f0;">Date</th><th style="padding:8px;border-bottom:1px solid #e2e8f0;">Vendor</th><th style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">Amount</th></tr></thead>
<tbody>${tableRows.replace(/<td>/g, '<td style="padding:8px;border-bottom:1px solid #f1f5f9;">').replace(/<td style="text-align:right;">/g, '<td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">')}</tbody>
</table>
<p>Open Accounting → Transactions in the app to manage these.</p>`;
    const plainBody = `Recurring charges in next ${daysAhead} days:\n\n${items.map(i => `${i.expectedNextDate} — ${i.description} — ${dollars(i.amountCents)}`).join("\n")}\n\nOpen Accounting → Transactions to manage.`;
    const r = await sendEmail({ to: ownerEmail, subject, plainBody, htmlBody });
    if (r.ok) { alerted += 1; total += items.length; }
  }
  return { tenantsAlerted: alerted, itemsTotal: total };
}

module.exports = { notifyApprovalCreated, emitRecurringDigest, sendEmail, resolveTenantOwnerEmail };
