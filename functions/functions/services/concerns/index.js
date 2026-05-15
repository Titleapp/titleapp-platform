"use strict";

/**
 * concerns/index.js — Accountability Layer for Control Center.
 *
 * Pattern: an owner raises a Concern. Each Concern names a responsible party
 * and a set of metrics. The responsible party submits a Response each cycle.
 * The system cross-checks the response against ground-truth Firestore data
 * and renders a verification status + BS score in Control Center.
 *
 * v1 (50.27): manual concern creation, manual response, one verification
 * source (messageQueue for emails-sent). Cron, AI question generation, and
 * email magic-links come in subsequent passes.
 *
 * Schema:
 *   tenants/{tenantId}/concerns/{concernId}
 *
 * The collection sits UNDER the tenant doc so workspace-level access
 * control flows naturally (admins can see all concerns; members see only
 * those where they are owner or responsible).
 */

const admin = require("firebase-admin");

function db() { return admin.firestore(); }

const DAY_MS = 86400000;

// Concern types we know how to verify. Adding a new type means adding a
// `metrics` shape here and a verifier in `runVerification` below.
const CONCERN_TYPES = {
  investor_outreach: {
    label: "Investor Outreach",
    defaultQuestions: [
      "How many cold outreach emails did you send this week?",
      "How many investor meetings did you hold this week?",
      "How many calls did you make this week?",
      "Which investors moved from cold to warm? Name them.",
      "What is the current pipeline value (sum of soft commits)?",
      "What's blocking you and what's the next step?",
    ],
    metrics: [
      { id: "emails_sent_7d",   label: "Cold emails sent (last 7d)", type: "number", verifiable: true,  source: "messageQueue" },
      { id: "meetings_7d",      label: "Investor meetings (last 7d)", type: "number", verifiable: false, source: "calendar (not yet wired)" },
      { id: "calls_7d",         label: "Calls made (last 7d)",       type: "number", verifiable: false, source: "self-report only" },
      { id: "warmed_investors", label: "Investors moved cold→warm",  type: "text",   verifiable: false, source: "self-report" },
      { id: "pipeline_value",   label: "Pipeline value ($)",         type: "number", verifiable: true,  source: "holdings" },
      { id: "next_step",        label: "Next step / blocker",        type: "text",   verifiable: false, source: "self-report" },
    ],
  },
  marketing: {
    label: "Marketing & Campaigns",
    defaultQuestions: [
      "How many campaigns did you launch this week?",
      "How many emails were sent through the platform?",
      "What's the response rate?",
      "What's blocking the next campaign?",
    ],
    metrics: [
      { id: "campaigns_drafted_7d", label: "Campaigns drafted (7d)",   type: "number", verifiable: true,  source: "marketingDrafts" },
      { id: "emails_sent_7d",       label: "Emails sent (7d)",         type: "number", verifiable: true,  source: "messageQueue" },
      { id: "next_step",            label: "Next step / blocker",      type: "text",   verifiable: false, source: "self-report" },
    ],
  },
  general: {
    label: "General Check-in",
    defaultQuestions: [
      "What did you accomplish this week?",
      "What's blocking you?",
      "What's the next step?",
    ],
    metrics: [
      { id: "accomplishments", label: "Accomplishments", type: "text", verifiable: false, source: "self-report" },
      { id: "blockers",        label: "Blockers",        type: "text", verifiable: false, source: "self-report" },
      { id: "next_step",       label: "Next step",       type: "text", verifiable: false, source: "self-report" },
    ],
  },
};

/**
 * Run verification against system data for each verifiable metric.
 * Returns { [metricId]: { claimed, actual, delta, status } }.
 *
 * status:
 *   "ok"            — claimed within tolerance of actual
 *   "contradicted"  — actual is materially smaller than claimed (BS signal)
 *   "exceeded"      — actual exceeds claimed (under-reporting; rare but noted)
 *   "unverifiable"  — metric is self-report only
 *   "no_data"       — couldn't reach the source
 */
async function runVerification({ tenantId, concernType, answers }) {
  const verification = {};
  const since7d = new Date(Date.now() - 7 * DAY_MS);
  const typeSpec = CONCERN_TYPES[concernType] || CONCERN_TYPES.general;

  for (const metric of typeSpec.metrics) {
    const claimed = answers?.[metric.id];
    const claimedNum = typeof claimed === "number" ? claimed : Number(claimed);

    if (!metric.verifiable) {
      verification[metric.id] = { claimed: claimed ?? null, actual: null, delta: null, status: "unverifiable", source: metric.source };
      continue;
    }

    try {
      let actual = 0;

      if (metric.source === "messageQueue") {
        // Count tenant-scoped messages sent in the last 7d.
        const snap = await db().collection("messageQueue")
          .where("tenantId", "==", tenantId)
          .where("createdAt", ">=", since7d)
          .get();
        for (const d of snap.docs) {
          const x = d.data();
          if (x.status === "sent" || x.status === "delivered") actual += 1;
        }
      } else if (metric.source === "marketingDrafts") {
        const snap = await db().collection("marketingDrafts")
          .where("tenantId", "==", tenantId)
          .where("createdAt", ">=", since7d)
          .get();
        actual = snap.size;
      } else if (metric.source === "holdings") {
        // Pipeline value = sum of softCommitUsd across active holdings.
        const snap = await db().collection("holdings")
          .where("tenantId", "==", tenantId)
          .get();
        for (const d of snap.docs) {
          const x = d.data();
          if (x.status === "deleted" || x.status === "void") continue;
          if (typeof x.softCommitUsd === "number") actual += x.softCommitUsd;
        }
      } else {
        verification[metric.id] = { claimed: claimed ?? null, actual: null, delta: null, status: "no_data", source: metric.source };
        continue;
      }

      // Tolerance: claimed within 20% of actual (or absolute delta <=2 for
      // small counts) counts as "ok". Otherwise it's a contradiction.
      const isNumberMetric = !Number.isNaN(claimedNum);
      if (!isNumberMetric) {
        verification[metric.id] = { claimed: claimed ?? null, actual, delta: null, status: "no_data", source: metric.source };
        continue;
      }

      const delta = actual - claimedNum;
      const absDelta = Math.abs(delta);
      const tolerance = Math.max(2, claimedNum * 0.2);
      let status;
      if (absDelta <= tolerance) status = "ok";
      else if (actual < claimedNum) status = "contradicted";
      else status = "exceeded";

      verification[metric.id] = { claimed: claimedNum, actual, delta, status, source: metric.source };
    } catch (e) {
      console.warn(`[concerns/verify] ${metric.id} failed:`, e.message);
      verification[metric.id] = { claimed: claimed ?? null, actual: null, delta: null, status: "no_data", source: metric.source };
    }
  }

  return verification;
}

/**
 * BS Score: 0 (trustworthy) → 1 (high-suspicion).
 * Each contradicted verifiable metric adds weight proportional to severity.
 * Pure self-report metrics don't move the needle.
 */
function computeBsScore(verification) {
  let verifiable = 0;
  let contradicted = 0;
  let weightedContradiction = 0;

  for (const v of Object.values(verification || {})) {
    if (v.status === "unverifiable" || v.status === "no_data") continue;
    verifiable += 1;
    if (v.status === "contradicted") {
      contradicted += 1;
      // Severity weight: how far off the claim is. 100% off = weight 1.0.
      const claimed = Math.abs(v.claimed || 0);
      const actual = Math.abs(v.actual || 0);
      const denom = Math.max(claimed, actual, 1);
      const severity = Math.min(1, Math.abs(claimed - actual) / denom);
      weightedContradiction += severity;
    }
  }

  if (verifiable === 0) return 0;
  return Number((weightedContradiction / verifiable).toFixed(2));
}

/**
 * Create a new concern. Owner-driven.
 */
async function createConcern({ tenantId, ownerUid, ownerName, payload }) {
  const {
    title,
    description = "",
    responsibleUid = null,
    responsibleEmail = null,
    responsibleName = null,
    cadence = "weekly",
    concernType = "general",
    customQuestions = null,
  } = payload || {};

  if (!title) throw new Error("MISSING_TITLE");
  if (!CONCERN_TYPES[concernType]) throw new Error("UNKNOWN_CONCERN_TYPE");

  const typeSpec = CONCERN_TYPES[concernType];
  const questions = Array.isArray(customQuestions) && customQuestions.length > 0
    ? customQuestions
    : typeSpec.defaultQuestions;

  const ref = await db().collection("tenants").doc(tenantId)
    .collection("concerns").add({
      title: String(title),
      description: String(description),
      ownerUid,
      ownerName: ownerName || null,
      responsibleUid,
      responsibleEmail,
      responsibleName,
      cadence,
      concernType,
      questions,
      metrics: typeSpec.metrics,
      status: "open",
      responses: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastReminderSentAt: null,
    });

  return { ok: true, concernId: ref.id };
}

/**
 * List concerns for a tenant. Includes the most-recent response on each
 * for inline display in Control Center.
 */
async function listConcerns({ tenantId }) {
  const snap = await db().collection("tenants").doc(tenantId)
    .collection("concerns")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const concerns = snap.docs.map(d => {
    const data = d.data();
    const responses = Array.isArray(data.responses) ? data.responses : [];
    const latest = responses.length > 0 ? responses[responses.length - 1] : null;
    return {
      id: d.id,
      title: data.title,
      description: data.description || "",
      ownerUid: data.ownerUid,
      ownerName: data.ownerName,
      responsibleUid: data.responsibleUid,
      responsibleEmail: data.responsibleEmail,
      responsibleName: data.responsibleName,
      cadence: data.cadence,
      concernType: data.concernType,
      questions: data.questions || [],
      metrics: data.metrics || [],
      status: data.status,
      latestResponse: latest,
      responseCount: responses.length,
      createdAt: data.createdAt?.toMillis?.() || null,
      lastReminderSentAt: data.lastReminderSentAt?.toMillis?.() || null,
    };
  });

  return { ok: true, concerns, total: concerns.length };
}

/**
 * Append a response to a concern. Runs verification, computes BS score,
 * persists, and updates the concern status. Anyone who is the responsible
 * party (or an admin) can respond.
 */
async function respondToConcern({ tenantId, concernId, respondedBy, respondedByName, answers }) {
  const ref = db().collection("tenants").doc(tenantId).collection("concerns").doc(concernId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("CONCERN_NOT_FOUND");
  const data = snap.data();

  const verification = await runVerification({
    tenantId,
    concernType: data.concernType,
    answers,
  });
  const bsScore = computeBsScore(verification);

  const response = {
    respondedAt: new Date().toISOString(),
    respondedBy,
    respondedByName: respondedByName || null,
    answers: answers || {},
    verification,
    bsScore,
  };

  // Status decision: if any verifiable metric is contradicted, flag for BS.
  const anyContradicted = Object.values(verification).some(v => v.status === "contradicted");
  const newStatus = anyContradicted ? "flagged_bs" : "verified";

  await ref.update({
    responses: admin.firestore.FieldValue.arrayUnion(response),
    status: newStatus,
    lastResponseAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, concernId, response, status: newStatus };
}

async function resolveConcern({ tenantId, concernId }) {
  const ref = db().collection("tenants").doc(tenantId).collection("concerns").doc(concernId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("CONCERN_NOT_FOUND");
  await ref.update({
    status: "resolved",
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
}

async function deleteConcern({ tenantId, concernId }) {
  const ref = db().collection("tenants").doc(tenantId).collection("concerns").doc(concernId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("CONCERN_NOT_FOUND");
  await ref.update({
    status: "deleted",
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
}

module.exports = {
  CONCERN_TYPES,
  createConcern,
  listConcerns,
  respondToConcern,
  resolveConcern,
  deleteConcern,
  runVerification,
  computeBsScore,
};
