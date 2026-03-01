"use strict";

function getDb() {
  const admin = require("firebase-admin");
  return admin.firestore();
}

function nowServerTs() {
  const admin = require("firebase-admin");
  return admin.firestore.FieldValue.serverTimestamp();
}

// ─── Communication Templates ────────────────────────────────────

const COMM_TEMPLATES = {
  capital_call_notice: {
    id: "capital_call_notice",
    name: "Capital Call Notice",
    requiredFields: ["dealName", "amount", "dueDate"],
    optionalFields: ["purpose", "wireInstructions", "memo"],
    buildSubject: (d) => `Capital Call Notice — ${d.dealName}`,
    buildBody: (d) =>
      `Dear Investor,\n\nThis notice serves as a formal capital call for ${d.dealName}.\n\nAmount Due: $${Number(d.amount).toLocaleString()}\nDue Date: ${d.dueDate}\nPurpose: ${d.purpose || "Capital contribution per partnership agreement"}\n\n${d.wireInstructions ? `Wire Instructions:\n${d.wireInstructions}\n\n` : ""}Please remit payment by the due date specified above. Failure to fund may result in dilution or default penalties as outlined in the governing documents.\n\n${d.memo || ""}\n\nRegards,\nFund Management`,
  },

  distribution_notice: {
    id: "distribution_notice",
    name: "Distribution Notice",
    requiredFields: ["dealName", "totalAmount", "date"],
    optionalFields: ["source", "investorAmount", "cumulativeTotal"],
    buildSubject: (d) => `Distribution Notice — ${d.dealName}`,
    buildBody: (d) =>
      `Dear Investor,\n\nWe are pleased to inform you of a distribution from ${d.dealName}.\n\nDistribution Date: ${d.date}\nSource: ${d.source || "Operating cash flow"}\nTotal Distribution: $${Number(d.totalAmount).toLocaleString()}${d.investorAmount ? `\nYour Allocation: $${Number(d.investorAmount).toLocaleString()}` : ""}${d.cumulativeTotal ? `\nCumulative Distributions to Date: $${Number(d.cumulativeTotal).toLocaleString()}` : ""}\n\nDetailed allocation information is available in your investor portal.\n\nRegards,\nFund Management`,
  },

  quarterly_update: {
    id: "quarterly_update",
    name: "Quarterly Investor Update",
    requiredFields: ["quarter", "year"],
    optionalFields: ["portfolioSummary", "dealUpdates", "performance", "outlook"],
    buildSubject: (d) => `Q${d.quarter} ${d.year} Investor Update`,
    buildBody: (d) =>
      `Dear Investor,\n\nPlease find below our Q${d.quarter} ${d.year} investor update.\n\n${d.portfolioSummary ? `PORTFOLIO SUMMARY\n${d.portfolioSummary}\n\n` : ""}${d.dealUpdates ? `DEAL UPDATES\n${d.dealUpdates}\n\n` : ""}${d.performance ? `PERFORMANCE\n${d.performance}\n\n` : ""}${d.outlook ? `OUTLOOK\n${d.outlook}\n\n` : ""}A detailed quarterly report is available in your investor portal.\n\nRegards,\nFund Management`,
  },

  k1_reminder: {
    id: "k1_reminder",
    name: "K-1 Tax Document Reminder",
    requiredFields: ["taxYear", "dealName"],
    optionalFields: ["availableDate", "portalUrl"],
    buildSubject: (d) => `${d.taxYear} K-1 Tax Document — ${d.dealName}`,
    buildBody: (d) =>
      `Dear Investor,\n\nYour ${d.taxYear} Schedule K-1 for ${d.dealName} is ${d.availableDate ? `expected to be available by ${d.availableDate}` : "now available"}.\n\n${d.portalUrl ? `Access your K-1 at: ${d.portalUrl}\n\n` : "The document is available in your investor portal.\n\n"}Please consult your tax advisor regarding the reporting of this information on your tax return.\n\nRegards,\nFund Management`,
  },

  deal_announcement: {
    id: "deal_announcement",
    name: "Deal Announcement",
    requiredFields: ["dealName", "dealType"],
    optionalFields: ["summary", "targetRaise", "minimumInvestment", "closingDate"],
    buildSubject: (d) => `New Investment Opportunity — ${d.dealName}`,
    buildBody: (d) =>
      `Dear Investor,\n\nWe are pleased to announce a new investment opportunity: ${d.dealName} (${d.dealType}).\n\n${d.summary || ""}\n\n${d.targetRaise ? `Target Raise: $${Number(d.targetRaise).toLocaleString()}\n` : ""}${d.minimumInvestment ? `Minimum Investment: $${Number(d.minimumInvestment).toLocaleString()}\n` : ""}${d.closingDate ? `Target Close: ${d.closingDate}\n` : ""}\nDetailed offering materials are available in the data room. Please contact us to discuss this opportunity further.\n\nThis is not an offer to sell securities. Any offer will be made only by means of a Private Placement Memorandum.\n\nRegards,\nFund Management`,
  },

  closing_notice: {
    id: "closing_notice",
    name: "Closing Confirmation",
    requiredFields: ["dealName", "closingDate"],
    optionalFields: ["totalRaised", "investorCount", "nextSteps"],
    buildSubject: (d) => `Closing Confirmation — ${d.dealName}`,
    buildBody: (d) =>
      `Dear Investor,\n\nWe are pleased to confirm that ${d.dealName} has successfully closed on ${d.closingDate}.\n\n${d.totalRaised ? `Total Capital Raised: $${Number(d.totalRaised).toLocaleString()}\n` : ""}${d.investorCount ? `Number of Investors: ${d.investorCount}\n` : ""}\n${d.nextSteps || "We will provide regular updates on deal progress and performance. Your next communication will be the quarterly investor report."}\n\nThank you for your investment and confidence.\n\nRegards,\nFund Management`,
  },

  custom: {
    id: "custom",
    name: "Custom Communication",
    requiredFields: ["subject", "body"],
    optionalFields: [],
    buildSubject: (d) => d.subject,
    buildBody: (d) => d.body,
  },
};

// ─── Message Builder ────────────────────────────────────────────

function buildMessage(templateType, data) {
  const template = COMM_TEMPLATES[templateType];
  if (!template) {
    return { ok: false, error: `Unknown template: ${templateType}. Available: ${Object.keys(COMM_TEMPLATES).join(", ")}` };
  }

  const missing = template.requiredFields.filter((f) => !data[f]);
  if (missing.length > 0) {
    return { ok: false, error: `Missing required fields for ${template.name}: ${missing.join(", ")}` };
  }

  return {
    ok: true,
    subject: template.buildSubject(data),
    body: template.buildBody(data),
    templateType,
    templateName: template.name,
  };
}

// ─── Send to Investors ──────────────────────────────────────────

async function sendToInvestors(tenantId, dealId, message, opts = {}) {
  const db = getDb();
  const { channel = "platform", investorIds } = opts;

  // Get investors to send to
  let investors = [];
  if (investorIds && investorIds.length > 0) {
    // Specific investors
    for (const invId of investorIds) {
      const doc = await db.collection("investors").doc(invId).get();
      if (doc.exists && doc.data().tenantId === tenantId) {
        investors.push({ id: doc.id, ...doc.data() });
      }
    }
  } else if (dealId) {
    // All deal investors
    const snap = await db.collection("irDeals").doc(dealId)
      .collection("investors").get();
    investors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else {
    // All tenant investors
    const snap = await db.collection("investors")
      .where("tenantId", "==", tenantId).limit(200).get();
    investors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  if (investors.length === 0) {
    return { ok: false, error: "No investors found to send to" };
  }

  // Log communication (stub — actual email/SMS requires external integrations)
  const commId = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const commRecord = {
    commId,
    tenantId,
    dealId: dealId || null,
    channel,
    subject: message.subject,
    body: message.body,
    templateType: message.templateType || "custom",
    recipientCount: investors.length,
    recipients: investors.map((inv) => ({
      investorId: inv.investorId || inv.id,
      name: inv.name,
      email: inv.email || "",
      status: "logged", // stub: would be "sent" with real email integration
    })),
    sentAt: nowServerTs(),
    createdAt: nowServerTs(),
  };

  await db.collection("irCommunications").doc(commId).set(commRecord);

  return {
    ok: true,
    commId,
    channel,
    recipientCount: investors.length,
    note: channel === "email" || channel === "sms"
      ? "Communication logged. Actual delivery requires email/SMS integration (not yet configured)."
      : "Communication logged to platform notifications.",
  };
}

// ─── List Communications ────────────────────────────────────────

async function listCommunications(tenantId, dealId) {
  const db = getDb();
  let query = db.collection("irCommunications").where("tenantId", "==", tenantId);
  if (dealId) {
    query = query.where("dealId", "==", dealId);
  }
  query = query.orderBy("createdAt", "desc").limit(50);

  const snap = await query.get();
  const communications = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      commId: data.commId,
      dealId: data.dealId,
      channel: data.channel,
      subject: data.subject,
      templateType: data.templateType,
      recipientCount: data.recipientCount,
      sentAt: data.sentAt,
    };
  });

  return { ok: true, communications };
}

module.exports = {
  COMM_TEMPLATES,
  buildMessage,
  sendToInvestors,
  listCommunications,
};
