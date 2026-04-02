/**
 * subscriberDigest.js — Subscriber daily digest from Alex.
 *
 * Every tier1/2/3 subscriber gets their own briefing at 4am UTC.
 * Workers, document control, usage — with status dots and trend arrows.
 *
 * Exports: generateSubscriberDigest, processSubscriberDigests
 */

"use strict";

const admin = require("firebase-admin");
const pricing = require("../config/pricing");
const { logActivity } = require("../admin/logActivity");

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  STATUS HELPERS — same design system as admin digest
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

// ═══════════════════════════════════════════════════════════════
//  STATUS LOGIC
// ═══════════════════════════════════════════════════════════════

function workerStatus(runs) {
  if (!runs || runs.length === 0) return "green"; // no runs = no issues
  const lastRun = runs[runs.length - 1];
  if (lastRun.status === "failed" || lastRun.status === "error") return "red";
  if (lastRun.status === "flagged" || lastRun.status === "needs_review") return "yellow";
  return "green";
}

function docStatus(doc) {
  const now = Date.now();
  if (doc.status === "expired") return "red";
  if (doc.expiryDate) {
    const expiry = doc.expiryDate._seconds ? doc.expiryDate._seconds * 1000 : new Date(doc.expiryDate).getTime();
    const daysUntil = (expiry - now) / 86400000;
    if (daysUntil <= 0) return "red";
    if (daysUntil <= 30) return "yellow";
  }
  return "green";
}

function usageStatus(used, allowance) {
  if (!allowance || allowance <= 0) return "green";
  const pct = used / allowance;
  if (pct > 0.9) return "red";
  if (pct >= 0.7) return "yellow";
  return "green";
}

// ═══════════════════════════════════════════════════════════════
//  PRIORITY PICKER
// ═══════════════════════════════════════════════════════════════

function pickSubscriberPriority(docs, usageData, workers) {
  // RED docs first — expired
  for (const doc of docs) {
    if (docStatus(doc) === "red") {
      return { level: "red", text: `${doc.fileName || "Document"} is expired — update required` };
    }
  }
  // RED usage — overage
  if (usageData.creditsStatus === "red") {
    return { level: "red", text: `Credit usage at ${usageData.creditsUsed}/${usageData.creditsAllowance} — overage charges active` };
  }
  // RED workers — failed
  for (const w of workers) {
    if (w.status === "red") {
      return { level: "red", text: `${w.name} failed — check output and retry` };
    }
  }
  // YELLOW docs — expiring
  for (const doc of docs) {
    if (docStatus(doc) === "yellow") {
      const expiry = doc.expiryDate?._seconds ? new Date(doc.expiryDate._seconds * 1000) : new Date(doc.expiryDate);
      const days = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
      return { level: "yellow", text: `${doc.fileName || "Document"} expires in ${days} days` };
    }
  }
  // YELLOW usage
  if (usageData.creditsStatus === "yellow") {
    return { level: "yellow", text: `Credits at ${Math.round((usageData.creditsUsed / usageData.creditsAllowance) * 100)}% — approaching limit` };
  }
  return { level: "green", text: "All systems green. No action needed today." };
}

// ═══════════════════════════════════════════════════════════════
//  HTML EMAIL TEMPLATE
// ═══════════════════════════════════════════════════════════════

function buildSubscriberHtml({ today, userName, priority, workers, docs, usageData, attentionItems }) {
  const sectionStyle = `style="padding:16px 24px;border-bottom:1px solid #e5e7eb"`;
  const headerStyle = `style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#6b7280;margin:0 0 8px 0"`;
  const rowStyle = `style="font-size:14px;line-height:1.8;margin:0"`;
  const subRowStyle = `style="font-size:12px;color:#6b7280;margin:0 0 4px 18px"`;
  const priorityColor = COLORS[priority.level] || COLORS.green;

  // Priority section
  const prioritySection = `
    <div ${sectionStyle}>
      <p ${headerStyle}>TODAY'S PRIORITY</p>
      <p style="font-size:14px;margin:0;color:${priorityColor}">→ ${priority.text}</p>
    </div>`;

  // Workers section
  let workerRows = "";
  for (const w of workers) {
    workerRows += `<p ${rowStyle}>${statusDot(w.status)} ${w.name} &nbsp; ${w.runs} runs &nbsp; ${trendArrow(w.runs, w.prevRuns)}</p>`;
    if (w.lastOutput) {
      workerRows += `<p ${subRowStyle}>Last output: ${w.lastOutput}</p>`;
    }
  }
  const workerSection = workers.length > 0 ? `
    <div ${sectionStyle}>
      <p ${headerStyle}>YOUR WORKERS <span style="font-weight:400;letter-spacing:0">${workers.length} active workers</span></p>
      ${workerRows}
    </div>` : "";

  // Document Control section
  let docRows = "";
  for (const doc of docs) {
    const ds = docStatus(doc);
    let docDetail = "Current";
    if (ds === "yellow") {
      const expiry = doc.expiryDate?._seconds ? new Date(doc.expiryDate._seconds * 1000) : new Date(doc.expiryDate);
      docDetail = `Expires ${expiry.toISOString().slice(0, 10)}`;
    } else if (ds === "red") {
      docDetail = "EXPIRED";
    }
    const revLabel = doc.revisionNumber ? `Rev ${doc.revisionNumber}` : "";
    docRows += `<p ${rowStyle}>${statusDot(ds)} ${doc.fileName || "Document"} &nbsp; ${docDetail} &nbsp; ${revLabel}</p>`;
  }
  const docSection = docs.length > 0 ? `
    <div ${sectionStyle}>
      <p ${headerStyle}>DOCUMENT CONTROL</p>
      ${docRows}
    </div>` : "";

  // Usage section
  const usageSection = `
    <div ${sectionStyle}>
      <p ${headerStyle}>USAGE THIS MONTH</p>
      <p ${rowStyle}>Inference Credits &nbsp; ${usageData.creditsUsed}/${usageData.creditsAllowance} &nbsp; ${trendArrow(usageData.creditsUsed, usageData.prevCreditsUsed)} ${statusDot(usageData.creditsStatus)}</p>
      <p ${rowStyle}>Signatures &nbsp; ${usageData.signaturesUsed}/${usageData.signaturesAllowance} &nbsp; ${trendArrow(usageData.signaturesUsed, 0)} ${statusDot(usageData.signaturesStatus)}</p>
      <p ${rowStyle}>Blockchain Records &nbsp; ${usageData.blockchainUsed}/${usageData.blockchainAllowance} &nbsp; ${trendArrow(usageData.blockchainUsed, 0)} ${statusDot(usageData.blockchainStatus)}</p>
    </div>`;

  // Attention section
  let attentionSection = "";
  if (attentionItems.length > 0) {
    let rows = "";
    for (const item of attentionItems.slice(0, 5)) {
      rows += `<p ${rowStyle}>${statusDot(item.level)} ${item.level.toUpperCase()} &nbsp; ${item.text}</p>`;
    }
    attentionSection = `
    <div ${sectionStyle}>
      <p ${headerStyle}>NEEDS YOUR ATTENTION</p>
      ${rows}
    </div>`;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
  <div style="background:#1e1b4b;padding:24px;color:#ffffff">
    <table width="100%"><tr>
      <td style="font-size:18px;font-weight:700;letter-spacing:2px;color:#a78bfa">TITLEAPP</td>
      <td style="text-align:right;font-size:13px;color:#c4b5fd">${today}</td>
    </tr></table>
    <p style="margin:4px 0 0;font-size:13px;color:#c4b5fd">Alex — Your Chief of Staff</p>
  </div>
  <div ${sectionStyle}>
    <p style="font-size:16px;margin:0">Good morning${userName ? " " + userName : ""}.</p>
    <p style="font-size:14px;margin:4px 0 0;color:#6b7280">Here's what your team did overnight.</p>
  </div>
  ${prioritySection}
  ${workerSection}
  ${docSection}
  ${usageSection}
  ${attentionSection}
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="font-size:13px;color:#6b7280;margin:0">Reply to this email to talk to me.</p>
    <p style="font-size:13px;color:#6b7280;margin:4px 0 0">app.titleapp.ai/vault</p>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
//  SUBSCRIBER DIGEST GENERATOR
// ═══════════════════════════════════════════════════════════════

async function generateSubscriberDigest(userId) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday24h = new Date(Date.now() - 86400000);

  // 1. Read user profile
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return;
  const user = userSnap.data();
  const tier = user.tier || "free";
  const email = user.email;
  const userName = user.name || user.ownerName || "";
  if (!email) return;

  // 2. Get tier allowances
  const tierConfig = pricing.subscriptionTiers[tier] || pricing.subscriptionTiers.free;
  const dcAllowances = pricing.documentControlAllowances[tier] || pricing.documentControlAllowances.free;

  // 3. Query subscribed workers (raasPackages with active status)
  let workerData = [];
  try {
    const pkgSnap = await db.collection("raasPackages")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(20)
      .get();

    for (const pkg of pkgSnap.docs) {
      const p = pkg.data();
      workerData.push({
        name: p.workerName || p.workerId || "Digital Worker",
        workerId: p.workerId,
        status: "green",
        runs: 0,
        prevRuns: 0,
        lastOutput: null,
      });
    }
  } catch (err) {
    console.warn("subscriberDigest: raasPackages query failed:", err.message);
  }

  // 4. Query last 24hr worker runs from messageEvents
  try {
    const runsSnap = await db.collection("messageEvents")
      .where("userId", "==", userId)
      .where("createdAt", ">=", yesterday24h)
      .limit(100)
      .get();

    const runsByWorker = {};
    for (const doc of runsSnap.docs) {
      const d = doc.data();
      const wId = d.workerId || d.type || "unknown";
      if (!runsByWorker[wId]) runsByWorker[wId] = [];
      runsByWorker[wId].push(d);
    }

    // Update worker data with run info
    for (const w of workerData) {
      const runs = runsByWorker[w.workerId] || [];
      w.runs = runs.length;
      if (runs.length > 0) {
        const lastRun = runs[runs.length - 1];
        w.lastOutput = (lastRun.response || lastRun.message || "").slice(0, 80);
        w.status = workerStatus(runs);
      }
    }
  } catch (err) {
    console.warn("subscriberDigest: messageEvents query failed:", err.message);
  }

  // 5. Query document control docs
  let docs = [];
  try {
    const docSnap = await db.collection("documentControl").doc(userId)
      .collection("documents")
      .where("status", "in", ["active", "expired"])
      .limit(20)
      .get();

    docs = docSnap.docs.map(d => ({ ...d.data(), docId: d.id }));
  } catch (err) {
    console.warn("subscriberDigest: documentControl query failed:", err.message);
  }

  // 6. Calculate usage vs allowance
  const creditsUsed = user.usageThisMonth || 0;
  const creditsAllowance = tierConfig.creditsIncluded || 100;
  const billing = user.billing || {};

  // Query billed usage events for signatures + blockchain this month
  let signaturesUsed = 0;
  let blockchainUsed = 0;
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const usageSnap = await db.collection("usageEvents").doc(userId)
      .collection("events")
      .where("createdAt", ">=", monthStart)
      .limit(500)
      .get();

    for (const doc of usageSnap.docs) {
      const evt = doc.data();
      if (evt.eventType === "signature_request") signaturesUsed++;
      if (evt.eventType === "blockchain_record") blockchainUsed++;
    }
  } catch (err) {
    console.warn("subscriberDigest: usageEvents query failed:", err.message);
  }

  const signaturesAllowance = dcAllowances.signatures ?? 0;
  const blockchainAllowance = dcAllowances.blockchainRecords ?? 0;

  const usageData = {
    creditsUsed,
    creditsAllowance,
    prevCreditsUsed: 0, // no previous period tracking yet
    creditsStatus: usageStatus(creditsUsed, creditsAllowance),
    signaturesUsed,
    signaturesAllowance: signaturesAllowance === null ? "∞" : signaturesAllowance,
    signaturesStatus: signaturesAllowance === null ? "green" : usageStatus(signaturesUsed, signaturesAllowance),
    blockchainUsed,
    blockchainAllowance: blockchainAllowance === null ? "∞" : blockchainAllowance,
    blockchainStatus: blockchainAllowance === null ? "green" : usageStatus(blockchainUsed, blockchainAllowance),
  };

  // 7. Build attention items
  const attentionItems = [];
  for (const doc of docs) {
    if (docStatus(doc) === "red") {
      attentionItems.push({ level: "red", text: `${doc.fileName || "Document"} is expired` });
    }
  }
  for (const w of workerData) {
    if (w.status === "red") {
      attentionItems.push({ level: "red", text: `${w.name} failed — check output` });
    }
  }
  if (usageData.creditsStatus === "red") {
    attentionItems.push({ level: "red", text: `Credit usage at ${creditsUsed}/${creditsAllowance} — overage charges active` });
  }
  for (const doc of docs) {
    if (docStatus(doc) === "yellow") {
      attentionItems.push({ level: "yellow", text: `${doc.fileName || "Document"} expiring soon` });
    }
  }

  // 8. Pick priority
  const priority = pickSubscriberPriority(docs, usageData, workerData);

  // 8b. 44.2 Bug 8 — Detect zero-content state and build quiet day email
  const hasContent = workerData.some(w => w.runs > 0) || docs.length > 0 || attentionItems.length > 0 || usageData.creditsUsed > 0;

  let htmlBody, plainText;
  if (!hasContent) {
    // Quiet day — build minimal meaningful email
    let forwardNote = "Your workers are standing by. Open TitleApp when you're ready.";
    // Check for nearest expiring document
    const expiringDoc = docs.find(d => docStatus(d) === "yellow");
    if (expiringDoc) {
      const expiry = expiringDoc.expiryDate?._seconds ? new Date(expiringDoc.expiryDate._seconds * 1000) : new Date(expiringDoc.expiryDate);
      forwardNote = `Keep an eye on ${expiringDoc.fileName || "a document"} — it expires ${expiry.toISOString().slice(0, 10)}.`;
    } else if (workerData.length === 0) {
      forwardNote = "Browse the marketplace to find your first Digital Worker — I'll help you get set up.";
    }

    const sectionStyle = `style="padding:16px 24px;border-bottom:1px solid #e5e7eb"`;
    htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
  <div style="background:#1e1b4b;padding:24px;color:#ffffff">
    <table width="100%"><tr>
      <td style="font-size:18px;font-weight:700;letter-spacing:2px;color:#a78bfa">TITLEAPP</td>
      <td style="text-align:right;font-size:13px;color:#c4b5fd">${today}</td>
    </tr></table>
    <p style="margin:4px 0 0;font-size:13px;color:#c4b5fd">Alex — Your Chief of Staff</p>
  </div>
  <div ${sectionStyle}>
    <p style="font-size:16px;margin:0">Good morning${userName ? " " + userName : ""}.</p>
    <p style="font-size:14px;margin:8px 0 0;color:#374151">Quiet day — no significant changes since yesterday.</p>
    <p style="font-size:14px;margin:8px 0 0;color:#6b7280">${forwardNote}</p>
  </div>
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="font-size:13px;color:#6b7280;margin:0">Reply to this email to talk to me.</p>
    <p style="font-size:13px;color:#6b7280;margin:4px 0 0">app.titleapp.ai/vault</p>
  </div>
</div>
</body></html>`;

    plainText = `TitleApp Briefing — ${today}\nQuiet day — no significant changes since yesterday.\n${forwardNote}`;
  } else {
    // 9. Build full HTML email
    htmlBody = buildSubscriberHtml({
      today, userName, priority, workers: workerData, docs, usageData, attentionItems,
    });

    // 10. Build plain text fallback
    const plainLines = [];
    plainLines.push(`TitleApp Briefing — ${today}`);
    plainLines.push(`Priority: ${priority.text}`);
    if (workerData.length > 0) {
      plainLines.push(`Workers: ${workerData.length} active`);
    }
    plainLines.push(`Credits: ${creditsUsed}/${creditsAllowance}`);
    plainText = plainLines.join("\n");
  }

  // 11. Send via SendGrid
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
          personalizations: [{ to: [{ email }] }],
          from: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
          reply_to: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
          subject: `Your TitleApp briefing — ${today}`,
          content: [
            { type: "text/plain", value: plainText },
            { type: "text/html", value: htmlBody },
          ],
        }),
      });
    } catch (err) {
      console.error(`subscriberDigest: email send failed for ${userId}:`, err.message);
    }
  }

  return { ok: true, userId, date: today };
}

// ═══════════════════════════════════════════════════════════════
//  BATCH PROCESSOR — all tier1/2/3 subscribers
// ═══════════════════════════════════════════════════════════════

async function processSubscriberDigests() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  // Query all paid subscribers (tier1, tier2, tier3)
  const paidTiers = ["tier1", "tier2", "tier3"];
  let totalSent = 0;
  let totalErrors = 0;

  for (const tier of paidTiers) {
    try {
      const usersSnap = await db.collection("users")
        .where("tier", "==", tier)
        .limit(500)
        .get();

      for (const userDoc of usersSnap.docs) {
        try {
          await generateSubscriberDigest(userDoc.id);
          totalSent++;
        } catch (err) {
          totalErrors++;
          console.error(`subscriberDigest: failed for user ${userDoc.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`subscriberDigest: failed to query ${tier} users:`, err.message);
    }
  }

  await logActivity("system", `Subscriber digests sent: ${totalSent} ok, ${totalErrors} errors for ${today}`, "info");
  return { ok: true, date: today, sent: totalSent, errors: totalErrors };
}

module.exports = { generateSubscriberDigest, processSubscriberDigests };
