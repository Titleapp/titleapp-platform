"use strict";

function getDb() {
  const admin = require("firebase-admin");
  return admin.firestore();
}

function nowServerTs() {
  const admin = require("firebase-admin");
  return admin.firestore.FieldValue.serverTimestamp();
}

// ─── Distribution Management ────────────────────────────────────

async function createDistribution(tenantId, dealId, distData) {
  const db = getDb();
  const { calculateWaterfall, allocateToInvestors } = require("./waterfall");

  // Verify deal
  const dealDoc = await db.collection("irDeals").doc(dealId).get();
  if (!dealDoc.exists || dealDoc.data().tenantId !== tenantId) {
    return { ok: false, error: "Deal not found" };
  }

  const deal = dealDoc.data();
  const { totalAmount, source, date, memo } = distData;

  if (!totalAmount || totalAmount <= 0) {
    return { ok: false, error: "Distribution amount must be positive" };
  }

  // Get deal investors
  const investorsSnap = await db.collection("irDeals").doc(dealId)
    .collection("investors").get();
  const investors = investorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (investors.length === 0) {
    return { ok: false, error: "No investors linked to this deal" };
  }

  // Calculate LP/GP split via waterfall
  const lpInvested = investors.reduce((sum, inv) => sum + (inv.commitmentAmount || 0), 0);
  const gpInvested = deal.gpInvested || 0;

  // Get prior distributions for cumulative waterfall
  const priorSnap = await db.collection("irDistributions")
    .where("tenantId", "==", tenantId)
    .where("dealId", "==", dealId)
    .get();
  const priorTotal = priorSnap.docs.reduce((sum, d) => sum + (d.data().totalAmount || 0), 0);

  const waterfallResult = calculateWaterfall(
    {
      lpInvested,
      gpInvested,
      waterfallTiers: deal.waterfallTiers || [],
    },
    [{ amount: totalAmount, period: 1, label: "Distribution" }]
  );

  // Allocate LP portion to individual investors
  const lpDistribution = waterfallResult.ok ? waterfallResult.periods[0].lpTotal : totalAmount;
  const gpDistribution = waterfallResult.ok ? waterfallResult.periods[0].gpTotal : 0;
  const investorAllocations = allocateToInvestors(lpDistribution, investors);

  // Create distribution record
  const distId = `dist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const distRecord = {
    distId,
    tenantId,
    dealId,
    dealName: deal.name,
    totalAmount: Number(totalAmount),
    lpDistribution: Math.round(lpDistribution * 100) / 100,
    gpDistribution: Math.round(gpDistribution * 100) / 100,
    source: source || "operating_cash_flow",
    date: date || new Date().toISOString(),
    memo: memo || "",
    cumulativeDistributed: priorTotal + Number(totalAmount),
    allocations: investorAllocations,
    waterfallBreakdown: waterfallResult.ok ? waterfallResult.periods[0].tiers : [],
    createdAt: nowServerTs(),
  };

  await db.collection("irDistributions").doc(distId).set(distRecord);

  return {
    ok: true,
    distId,
    totalAmount: distRecord.totalAmount,
    lpDistribution: distRecord.lpDistribution,
    gpDistribution: distRecord.gpDistribution,
    investorCount: investorAllocations.length,
    cumulativeDistributed: distRecord.cumulativeDistributed,
  };
}

async function listDistributions(tenantId, dealId) {
  const db = getDb();
  let query = db.collection("irDistributions").where("tenantId", "==", tenantId);
  if (dealId) {
    query = query.where("dealId", "==", dealId);
  }
  query = query.orderBy("createdAt", "desc").limit(50);

  const snap = await query.get();
  const distributions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { ok: true, distributions };
}

async function getInvestorDistributions(tenantId, investorId) {
  const db = getDb();

  // Get all distributions for this tenant
  const snap = await db.collection("irDistributions")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const results = [];
  for (const doc of snap.docs) {
    const dist = doc.data();
    const alloc = (dist.allocations || []).find(
      (a) => a.investorId === investorId
    );
    if (alloc) {
      results.push({
        distId: dist.distId,
        dealId: dist.dealId,
        dealName: dist.dealName,
        date: dist.date,
        source: dist.source,
        totalDistribution: dist.totalAmount,
        investorAmount: alloc.distributionAmount,
        investorShare: alloc.share,
      });
    }
  }

  const totalReceived = results.reduce((sum, r) => sum + r.investorAmount, 0);

  return {
    ok: true,
    investorId,
    distributions: results,
    totalReceived: Math.round(totalReceived * 100) / 100,
    distributionCount: results.length,
  };
}

module.exports = {
  createDistribution,
  listDistributions,
  getInvestorDistributions,
};
