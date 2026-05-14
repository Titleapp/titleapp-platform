// Accounting Controller — pre-commit hooks on cost-bearing actions.
//
// Phase C of the Accounting build. The pattern: before any worker fires a
// SIDE_EFFECT that costs real money (sendEmailCampaign, scheduleAdsBuy,
// queueMessage), the chat handler asks the Controller whether the spend
// fits inside the relevant CoA category's monthlyCapCents. If not, the
// side-effect is blocked and a pending approval is written so the user
// can review and explicitly override.
//
// No money moves in V1 — this gates *outbound platform-initiated* spend.
// V2 will integrate Stripe Issuing for actual virtual-card decline-at-source.

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// Heuristic estimates for outbound actions. Tuned conservatively — we'd
// rather over-estimate slightly and trigger an approval than let spend
// slip past the cap. Real prices: SendGrid Essentials is ~$20/mo + bulk
// volumes, Twilio SMS is ~$0.008/segment, etc.
const ACTION_COSTS = {
  // Email send cost = ceil(recipients / 1000) * $5 (rough proxy for
  // SendGrid + list-rent costs spread across a campaign). Treats a 100-
  // recipient send as effectively $5 so we don't permission-prompt for
  // every test send, but anything over 1k recipients starts to count.
  sendEmailCampaign: ({ data }) => {
    const recipients = Number(data?.recipientCount || data?.contacts?.length || 0);
    if (!recipients) return 500; // $5 baseline for any send
    return Math.max(500, Math.ceil(recipients / 1000) * 500);
  },
  // SMS at $0.008/segment, single message default. Bulk sends override.
  enqueueMessage: ({ data }) => {
    if ((data?.channel || "email") === "sms") return 1; // $0.01 per message
    return 0; // transactional email — close to free
  },
  // Organic social post is free. Paid boost (data.boostBudgetCents) is the trigger.
  scheduleSocialPost: ({ data }) => Number(data?.boostBudgetCents || 0),
  // Future hook for paid ads — exact spend is in data.budgetCents.
  scheduleAdsBuy: ({ data }) => Number(data?.budgetCents || 0),
};

// Mapping config — which CoA category does each action draw against?
// Stored per-tenant in tenants/{tenantId}/controllerConfig. Fall back to
// matching by CoA category name when no explicit mapping is set.
//
// Ordering matters — first hint that resolves wins. We bias toward the
// vendor-specific CoA category (SendGrid, Twilio, Unified.to) when one
// exists, falling back to the generic Marketing buckets when the user
// hasn't broken their CoA out by vendor.
const DEFAULT_NAME_HINTS = {
  sendEmailCampaign:  ["SendGrid", "Marketing — Tools", "Marketing"],
  enqueueMessage:     ["Twilio", "Marketing — Tools", "Marketing"],
  scheduleSocialPost: ["Unified.to", "Marketing — Paid Ads", "Marketing"],
  scheduleAdsBuy:     ["Marketing — Paid Ads", "Marketing"],
};

async function resolveCategoryForAction({ tenantId, action }) {
  const db = getDb();
  const cfgSnap = await db.doc(`tenants/${tenantId}/controllerConfig/main`).get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};
  const explicit = cfg.mappings && cfg.mappings[action];
  if (explicit) {
    const accSnap = await db.doc(`coaAccounts/${explicit}`).get();
    if (accSnap.exists) return { id: accSnap.id, ...accSnap.data() };
  }
  // Hint-based fallback
  const hints = DEFAULT_NAME_HINTS[action] || [];
  if (hints.length === 0) return null;
  const accSnap = await db.collection("coaAccounts")
    .where("tenantId", "==", tenantId)
    .get();
  const accounts = accSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => a.status !== "archived");
  for (const hint of hints) {
    const match = accounts.find(a => (a.name || "").toLowerCase().startsWith(hint.toLowerCase()));
    if (match) return match;
  }
  return null;
}

async function getMonthToDateSpendCents({ tenantId, coaAccountId }) {
  const db = getDb();
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  // We don't have a composite index by date — scan and filter in memory.
  // Volumes pre-launch are tiny; build an index later if MTD reads get hot.
  const snap = await db.collection("transactions")
    .where("tenantId", "==", tenantId)
    .where("coaAccountId", "==", coaAccountId)
    .limit(2000)
    .get();
  let total = 0;
  snap.docs.forEach(d => {
    const t = d.data();
    if (!t.date || t.date < monthStart) return;
    if (t.direction !== "debit") return; // refunds reduce spend
    total += Math.abs(t.amountCents || 0);
  });
  return total;
}

async function preCommitCheck({ tenantId, action, data }) {
  if (!tenantId || tenantId === "vault") return { allowed: true, reason: "no_tenant_context" };

  const estimator = ACTION_COSTS[action];
  const estimatedCents = estimator ? estimator({ data }) : 0;
  if (estimatedCents <= 0) return { allowed: true, reason: "no_cost", estimatedCents: 0 };

  const category = await resolveCategoryForAction({ tenantId, action });
  if (!category) return { allowed: true, reason: "no_category_mapped", estimatedCents };

  if (category.monthlyCapCents == null) {
    return { allowed: true, reason: "no_cap_set", estimatedCents, category: { id: category.id, name: category.name } };
  }

  const spentMtdCents = await getMonthToDateSpendCents({ tenantId, coaAccountId: category.id });
  const remainingCents = category.monthlyCapCents - spentMtdCents;
  const wouldExceed = (spentMtdCents + estimatedCents) > category.monthlyCapCents;

  return {
    allowed: !wouldExceed,
    reason: wouldExceed ? "cap_exceeded" : "within_cap",
    estimatedCents,
    spentMtdCents,
    capCents: category.monthlyCapCents,
    remainingCents,
    category: { id: category.id, name: category.name },
  };
}

async function recordApprovalRequest({ tenantId, userId, action, data, check }) {
  const db = getDb();
  const ref = db.collection("controllerApprovals").doc();
  const doc = {
    tenantId,
    requestedBy: userId,
    action,
    data: data || {},
    check,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

async function recordAuditEvent({ tenantId, userId, action, decision, check, approvalId }) {
  await getDb().collection("controllerAuditLog").add({
    tenantId,
    userId,
    action,
    decision, // executed | blocked | approved_override
    check,
    approvalId: approvalId || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = {
  preCommitCheck,
  recordApprovalRequest,
  recordAuditEvent,
  resolveCategoryForAction,
  getMonthToDateSpendCents,
};
