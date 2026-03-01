"use strict";

function getDb() {
  const admin = require("firebase-admin");
  return admin.firestore();
}

function nowServerTs() {
  const admin = require("firebase-admin");
  return admin.firestore.FieldValue.serverTimestamp();
}

// ─── Capital Call Management ────────────────────────────────────

async function createCapitalCall(tenantId, dealId, callData) {
  const db = getDb();

  // Verify deal exists
  const dealDoc = await db.collection("irDeals").doc(dealId).get();
  if (!dealDoc.exists || dealDoc.data().tenantId !== tenantId) {
    return { ok: false, error: "Deal not found" };
  }

  const { amount, dueDate, purpose, memo } = callData;
  if (!amount || amount <= 0) {
    return { ok: false, error: "Capital call amount must be positive" };
  }
  if (!dueDate) {
    return { ok: false, error: "Due date is required" };
  }

  // Get deal investors for pro-rata allocation
  const investorsSnap = await db.collection("irDeals").doc(dealId)
    .collection("investors").get();
  const investors = investorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (investors.length === 0) {
    return { ok: false, error: "No investors linked to this deal" };
  }

  const totalCommitted = investors.reduce((sum, inv) => sum + (inv.commitmentAmount || 0), 0);

  // Create capital call
  const callId = `cc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const allocations = investors.map((inv) => {
    const share = totalCommitted > 0 ? inv.commitmentAmount / totalCommitted : 1 / investors.length;
    return {
      investorId: inv.investorId || inv.id,
      dealInvestorId: inv.id,
      name: inv.name,
      email: inv.email || "",
      commitmentAmount: inv.commitmentAmount,
      share: Math.round(share * 10000) / 10000,
      callAmount: Math.round(amount * share * 100) / 100,
      paidAmount: 0,
      status: "pending",
    };
  });

  const callRecord = {
    callId,
    tenantId,
    dealId,
    dealName: dealDoc.data().name,
    amount: Number(amount),
    dueDate,
    purpose: purpose || "Capital contribution",
    memo: memo || "",
    status: "open",
    totalCalled: Number(amount),
    totalReceived: 0,
    allocations,
    createdAt: nowServerTs(),
    updatedAt: nowServerTs(),
  };

  await db.collection("irCapitalCalls").doc(callId).set(callRecord);

  return { ok: true, callId, allocations: allocations.length };
}

async function listCapitalCalls(tenantId, dealId) {
  const db = getDb();
  let query = db.collection("irCapitalCalls").where("tenantId", "==", tenantId);
  if (dealId) {
    query = query.where("dealId", "==", dealId);
  }
  query = query.orderBy("createdAt", "desc").limit(50);

  const snap = await query.get();
  const calls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { ok: true, calls };
}

async function recordPayment(tenantId, callId, investorId, paymentData) {
  const db = getDb();
  const callDoc = await db.collection("irCapitalCalls").doc(callId).get();

  if (!callDoc.exists || callDoc.data().tenantId !== tenantId) {
    return { ok: false, error: "Capital call not found" };
  }

  const call = callDoc.data();
  const allocIdx = call.allocations.findIndex(
    (a) => a.investorId === investorId || a.dealInvestorId === investorId
  );

  if (allocIdx === -1) {
    return { ok: false, error: "Investor not found in this capital call" };
  }

  const { amount, method, date } = paymentData;
  if (!amount || amount <= 0) {
    return { ok: false, error: "Payment amount must be positive" };
  }

  // Update allocation
  const alloc = call.allocations[allocIdx];
  alloc.paidAmount = (alloc.paidAmount || 0) + Number(amount);
  alloc.status = alloc.paidAmount >= alloc.callAmount ? "paid" : "partial";
  alloc.lastPaymentDate = date || new Date().toISOString();
  alloc.paymentMethod = method || "wire";

  // Update totals
  const newTotalReceived = call.allocations.reduce((sum, a) => sum + (a.paidAmount || 0), 0);
  const allPaid = call.allocations.every((a) => a.status === "paid");

  await db.collection("irCapitalCalls").doc(callId).update({
    allocations: call.allocations,
    totalReceived: newTotalReceived,
    status: allPaid ? "closed" : "open",
    updatedAt: nowServerTs(),
  });

  // Record payment event
  await db.collection("irCapitalCalls").doc(callId).collection("payments").add({
    investorId,
    amount: Number(amount),
    method: method || "wire",
    date: date || new Date().toISOString(),
    recordedAt: nowServerTs(),
  });

  return { ok: true, allocationStatus: alloc.status, callStatus: allPaid ? "closed" : "open" };
}

async function getCallStatus(tenantId, callId) {
  const db = getDb();
  const callDoc = await db.collection("irCapitalCalls").doc(callId).get();

  if (!callDoc.exists || callDoc.data().tenantId !== tenantId) {
    return { ok: false, error: "Capital call not found" };
  }

  const call = callDoc.data();
  const paid = call.allocations.filter((a) => a.status === "paid").length;
  const partial = call.allocations.filter((a) => a.status === "partial").length;
  const pending = call.allocations.filter((a) => a.status === "pending").length;

  return {
    ok: true,
    callId: call.callId,
    dealId: call.dealId,
    amount: call.amount,
    dueDate: call.dueDate,
    status: call.status,
    totalCalled: call.totalCalled,
    totalReceived: call.totalReceived,
    outstanding: call.totalCalled - call.totalReceived,
    investorBreakdown: { paid, partial, pending, total: call.allocations.length },
  };
}

module.exports = {
  createCapitalCall,
  listCapitalCalls,
  recordPayment,
  getCallStatus,
};
