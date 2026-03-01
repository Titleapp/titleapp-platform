"use strict";

function getDb() {
  const admin = require("firebase-admin");
  return admin.firestore();
}

function nowServerTs() {
  const admin = require("firebase-admin");
  return admin.firestore.FieldValue.serverTimestamp();
}

// ─── Deal Type Definitions ──────────────────────────────────────

const DEAL_TYPES = {
  cre_syndication: {
    name: "CRE Syndication",
    requiredFields: ["purchasePrice", "targetRaise"],
    optionalFields: ["noi", "capRate", "ltv", "dscr", "holdPeriod", "units", "propertyType", "location", "lender"],
    defaultWaterfall: [
      { name: "Return of Capital", type: "return_of_capital", lpSplit: 1, gpSplit: 0 },
      { name: "8% Preferred Return", type: "preferred", threshold: 0.08, lpSplit: 1, gpSplit: 0 },
      { name: "GP Catch-Up", type: "catchup", threshold: 0.20, lpSplit: 0, gpSplit: 1 },
      { name: "70/30 Split", type: "carry", lpSplit: 0.70, gpSplit: 0.30 },
    ],
  },
  startup_equity: {
    name: "Startup Equity",
    requiredFields: ["targetRaise"],
    optionalFields: ["valuationCap", "discount", "instrument", "stage", "preMoney", "postMoney", "sharePrice"],
  },
  fund_formation: {
    name: "Fund Formation",
    requiredFields: ["fundSize", "targetRaise"],
    optionalFields: ["managementFee", "carry", "hurdleRate", "gpCommit", "fundLife", "investmentPeriod", "strategy"],
    defaultWaterfall: [
      { name: "Return of Capital", type: "return_of_capital", lpSplit: 1, gpSplit: 0 },
      { name: "Preferred Return", type: "preferred", threshold: 0.08, lpSplit: 1, gpSplit: 0 },
      { name: "GP Catch-Up", type: "catchup", threshold: 0.20, lpSplit: 0, gpSplit: 1 },
      { name: "80/20 Carry", type: "carry", lpSplit: 0.80, gpSplit: 0.20 },
    ],
  },
  ma_pe: {
    name: "M&A / Private Equity",
    requiredFields: ["enterpriseValue", "targetRaise"],
    optionalFields: ["ebitda", "ebitdaMultiple", "debtAmount", "equityAmount", "holdPeriod", "industry"],
    defaultWaterfall: [
      { name: "Return of Capital", type: "return_of_capital", lpSplit: 1, gpSplit: 0 },
      { name: "8% Preferred Return", type: "preferred", threshold: 0.08, lpSplit: 1, gpSplit: 0 },
      { name: "GP Catch-Up", type: "catchup", threshold: 0.20, lpSplit: 0, gpSplit: 1 },
      { name: "80/20 Carry", type: "carry", lpSplit: 0.80, gpSplit: 0.20 },
    ],
  },
  opportunity_zone: {
    name: "Opportunity Zone",
    requiredFields: ["targetRaise", "ozTract"],
    optionalFields: ["investmentAmount", "holdPeriod", "deferralAmount", "projectType", "location", "estimatedJobs"],
  },
  eb5: {
    name: "EB-5",
    requiredFields: ["targetRaise", "projectType"],
    optionalFields: ["jobCreationTarget", "teaDesignation", "visaCategory", "minimumInvestment", "location"],
  },
  real_estate_debt: {
    name: "Real Estate Debt",
    requiredFields: ["loanAmount", "targetRaise"],
    optionalFields: ["ltv", "interestRate", "term", "collateral", "lienPosition", "propertyType", "location"],
  },
  revenue_share: {
    name: "Revenue Share",
    requiredFields: ["targetRaise", "revenueCap"],
    optionalFields: ["percentage", "paymentFrequency", "term", "minimumPayment", "industry"],
  },
};

// ─── Deal CRUD ──────────────────────────────────────────────────

async function createDeal(tenantId, dealData) {
  const db = getDb();
  const { type, name } = dealData;

  if (!type || !DEAL_TYPES[type]) {
    return { ok: false, error: `Invalid deal type. Valid types: ${Object.keys(DEAL_TYPES).join(", ")}` };
  }
  if (!name) {
    return { ok: false, error: "Deal name is required" };
  }

  const typeDef = DEAL_TYPES[type];
  const missing = typeDef.requiredFields.filter((f) => dealData[f] === undefined || dealData[f] === null);
  if (missing.length > 0) {
    return { ok: false, error: `Missing required fields for ${typeDef.name}: ${missing.join(", ")}` };
  }

  const deal = {
    tenantId,
    type,
    typeName: typeDef.name,
    name,
    status: "draft",
    regulation: dealData.regulation || null,
    targetRaise: dealData.targetRaise || 0,
    committedAmount: 0,
    fundedAmount: 0,
    investorCount: 0,
    waterfallTiers: dealData.waterfallTiers || typeDef.defaultWaterfall || [],
    metadata: dealData.metadata || {},
    createdAt: nowServerTs(),
    updatedAt: nowServerTs(),
  };

  // Copy type-specific fields
  const allFields = [...typeDef.requiredFields, ...typeDef.optionalFields];
  for (const f of allFields) {
    if (dealData[f] !== undefined) {
      deal[f] = dealData[f];
    }
  }

  const ref = await db.collection("irDeals").add(deal);
  return { ok: true, dealId: ref.id };
}

async function getDeal(tenantId, dealId) {
  const db = getDb();
  const doc = await db.collection("irDeals").doc(dealId).get();
  if (!doc.exists || doc.data().tenantId !== tenantId) {
    return { ok: false, error: "Deal not found" };
  }
  const deal = { id: doc.id, ...doc.data() };

  // Compute progress
  deal.progress = deal.targetRaise > 0 ? Math.min(1, deal.committedAmount / deal.targetRaise) : 0;

  return { ok: true, deal };
}

async function listDeals(tenantId, opts = {}) {
  const db = getDb();
  let query = db.collection("irDeals").where("tenantId", "==", tenantId);

  if (opts.status) {
    query = query.where("status", "==", opts.status);
  }
  if (opts.type) {
    query = query.where("type", "==", opts.type);
  }

  query = query.orderBy("createdAt", "desc").limit(opts.limit || 50);
  const snap = await query.get();
  const deals = snap.docs.map((d) => {
    const data = { id: d.id, ...d.data() };
    data.progress = data.targetRaise > 0 ? Math.min(1, data.committedAmount / data.targetRaise) : 0;
    return data;
  });
  return { ok: true, deals };
}

async function updateDeal(tenantId, dealId, updates) {
  const db = getDb();
  const doc = await db.collection("irDeals").doc(dealId).get();
  if (!doc.exists || doc.data().tenantId !== tenantId) {
    return { ok: false, error: "Deal not found or access denied" };
  }

  const deal = doc.data();
  if (deal.status === "closed") {
    return { ok: false, error: "Cannot update a closed deal" };
  }

  // Strip protected fields
  delete updates.tenantId;
  delete updates.createdAt;
  delete updates.type;
  updates.updatedAt = nowServerTs();

  await db.collection("irDeals").doc(dealId).update(updates);

  // Audit log
  await db.collection("irDeals").doc(dealId).collection("auditLog").add({
    action: "update",
    fields: Object.keys(updates),
    timestamp: nowServerTs(),
  });

  return { ok: true };
}

async function closeDeal(tenantId, dealId) {
  const db = getDb();
  const doc = await db.collection("irDeals").doc(dealId).get();
  if (!doc.exists || doc.data().tenantId !== tenantId) {
    return { ok: false, error: "Deal not found or access denied" };
  }

  await db.collection("irDeals").doc(dealId).update({
    status: "closed",
    closedAt: nowServerTs(),
    updatedAt: nowServerTs(),
  });

  await db.collection("irDeals").doc(dealId).collection("auditLog").add({
    action: "close",
    timestamp: nowServerTs(),
  });

  return { ok: true };
}

// ─── Deal Investors ─────────────────────────────────────────────

async function getDealInvestors(tenantId, dealId) {
  const db = getDb();
  const dealDoc = await db.collection("irDeals").doc(dealId).get();
  if (!dealDoc.exists || dealDoc.data().tenantId !== tenantId) {
    return { ok: false, error: "Deal not found" };
  }

  const snap = await db.collection("irDeals").doc(dealId)
    .collection("investors").orderBy("committedAt", "desc").get();
  const investors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { ok: true, investors };
}

async function addDealInvestor(tenantId, dealId, investorData) {
  const db = getDb();
  const dealDoc = await db.collection("irDeals").doc(dealId).get();
  if (!dealDoc.exists || dealDoc.data().tenantId !== tenantId) {
    return { ok: false, error: "Deal not found or access denied" };
  }

  const deal = dealDoc.data();
  if (deal.status === "closed") {
    return { ok: false, error: "Cannot add investors to a closed deal" };
  }

  const { investorId, name, email, commitmentAmount } = investorData;
  if (!name || !commitmentAmount) {
    return { ok: false, error: "Missing investor name or commitment amount" };
  }

  const inv = {
    investorId: investorId || null,
    name,
    email: email || "",
    commitmentAmount: Number(commitmentAmount),
    fundedAmount: 0,
    status: "committed",
    accredited: investorData.accredited || false,
    committedAt: nowServerTs(),
  };

  const ref = await db.collection("irDeals").doc(dealId).collection("investors").add(inv);

  // Update deal totals
  const admin = require("firebase-admin");
  await db.collection("irDeals").doc(dealId).update({
    committedAmount: admin.firestore.FieldValue.increment(Number(commitmentAmount)),
    investorCount: admin.firestore.FieldValue.increment(1),
    updatedAt: nowServerTs(),
  });

  return { ok: true, dealInvestorId: ref.id };
}

module.exports = {
  DEAL_TYPES,
  createDeal,
  getDeal,
  listDeals,
  updateDeal,
  closeDeal,
  getDealInvestors,
  addDealInvestor,
};
