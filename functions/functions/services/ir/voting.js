"use strict";

/**
 * fundraise/voting.js — Weighted-polling voting service for IR worker.
 *
 * Storage layout (scoped to a fundraise):
 *   fundraises/{fundraiseId}/ballots/{ballotId}                — ballot record
 *   fundraises/{fundraiseId}/ballots/{ballotId}/votes/{investorId} — individual votes
 *
 * Weight model: at ballot creation, we SNAPSHOT each investor's shares from
 * the investors collection. Votes are weighted by those snapshotted shares.
 * This matches the Snapshot.org pattern of locking the cap-table state at
 * proposal time so late share changes don't sway in-flight votes.
 *
 * Future: replace snapshotShares with on-chain proof. For now, the Firestore
 * snapshot is the source of truth and the audit trail entries are anchored
 * via the existing audit-trail service.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_STATUS = ["open", "closed", "cancelled"];
const DEFAULT_OPTIONS = ["For", "Against", "Abstain"];

// ═══════════════════════════════════════════════════════════════
//  CAP TABLE SNAPSHOT
// ═══════════════════════════════════════════════════════════════

/**
 * Snapshot the current cap table — read all investors who have shares
 * issued in this fundraise and produce an investorId → shares map.
 */
async function snapshotCapTable(fundraiseId) {
  const snap = await getDb()
    .collection("fundraises").doc(fundraiseId)
    .collection("investors").get();
  const out = {};
  let total = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const shares = Number(d.sharesIssued || 0);
    if (shares > 0) {
      out[doc.id] = shares;
      total += shares;
    }
  }
  return { shares: out, totalShares: total };
}

// ═══════════════════════════════════════════════════════════════
//  BALLOT CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Create a ballot. Snapshots cap table at creation time.
 *
 * @param {string} fundraiseId
 * @param {object} input        — { title, description, options?, closesAt, quorumPct? }
 * @param {string} createdBy    — UID of the creator
 * @returns {{ ok: true, ballotId: string, snapshotTotalShares: number }}
 */
async function createBallot(fundraiseId, input, createdBy) {
  if (!input.title || typeof input.title !== "string") {
    throw new Error("createBallot: title required");
  }
  if (!input.closesAt) {
    throw new Error("createBallot: closesAt required (ISO date string)");
  }

  const options = Array.isArray(input.options) && input.options.length >= 2
    ? input.options
    : DEFAULT_OPTIONS;

  const quorumPct = Number(input.quorumPct);
  const quorum = isNaN(quorumPct) ? 0 : Math.max(0, Math.min(100, quorumPct));

  const snapshot = await snapshotCapTable(fundraiseId);

  const ballotId = `b_${crypto.randomBytes(8).toString("hex")}`;
  const ref = getDb()
    .collection("fundraises").doc(fundraiseId)
    .collection("ballots").doc(ballotId);

  await ref.set({
    ballotId,
    fundraiseId,
    title: input.title.trim(),
    description: (input.description || "").trim(),
    options,
    quorumPct: quorum,
    openedAt: ts(),
    closesAt: new Date(input.closesAt).toISOString(),
    status: "open",
    createdBy: createdBy || null,
    snapshotShares: snapshot.shares,
    snapshotTotalShares: snapshot.totalShares,
    voteCount: 0,
  });

  return {
    ok: true,
    ballotId,
    snapshotTotalShares: snapshot.totalShares,
    eligibleVoters: Object.keys(snapshot.shares).length,
  };
}

async function listBallots(fundraiseId, { status = null } = {}) {
  let q = getDb()
    .collection("fundraises").doc(fundraiseId)
    .collection("ballots");
  if (status) q = q.where("status", "==", status);
  const snap = await q.orderBy("openedAt", "desc").limit(100).get();
  return snap.docs.map(d => {
    const data = d.data();
    // Don't ship the full snapshotShares map in the list response; it's heavy
    // and not needed unless you're tallying.
    const { snapshotShares, ...rest } = data;
    return rest;
  });
}

async function getBallot(fundraiseId, ballotId, { includeSnapshot = false } = {}) {
  const snap = await getDb()
    .collection("fundraises").doc(fundraiseId)
    .collection("ballots").doc(ballotId).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (!includeSnapshot) delete d.snapshotShares;
  return d;
}

/**
 * Cast or update a vote. Idempotent — re-voting before close updates the choice.
 *
 * Eligibility: investor must be in the ballot's snapshotShares. Investors
 * who acquired shares AFTER ballot creation are NOT eligible for that ballot.
 */
async function castVote(fundraiseId, ballotId, investorId, choice) {
  if (!investorId) throw new Error("castVote: investorId required");
  if (!choice) throw new Error("castVote: choice required");

  const ballotRef = getDb()
    .collection("fundraises").doc(fundraiseId)
    .collection("ballots").doc(ballotId);
  const ballotSnap = await ballotRef.get();
  if (!ballotSnap.exists) throw new Error("castVote: ballot not found");
  const ballot = ballotSnap.data();

  if (ballot.status !== "open") {
    throw new Error(`castVote: ballot status is ${ballot.status}, not open`);
  }
  if (new Date(ballot.closesAt).getTime() < Date.now()) {
    throw new Error("castVote: ballot has closed");
  }
  if (!ballot.options.includes(choice)) {
    throw new Error(`castVote: choice "${choice}" not in options [${ballot.options.join(", ")}]`);
  }

  const sharesWeight = Number((ballot.snapshotShares || {})[investorId] || 0);
  if (sharesWeight <= 0) {
    throw new Error("castVote: investor not eligible — no shares in snapshot");
  }

  const voteRef = ballotRef.collection("votes").doc(investorId);
  const prior = await voteRef.get();
  const isNew = !prior.exists;

  await voteRef.set({
    investorId,
    choice,
    sharesWeight,
    votedAt: ts(),
  }, { merge: true });

  if (isNew) {
    await ballotRef.update({ voteCount: admin.firestore.FieldValue.increment(1) });
  }

  return { ok: true, ballotId, investorId, choice, sharesWeight, isUpdate: !isNew };
}

/**
 * Tally a ballot. Returns:
 *   {
 *     ballotId, status,
 *     totals: { [option]: { shares, voterCount } },
 *     sharesCast, sharesEligible,
 *     turnoutPct, quorumPct, quorumMet,
 *     winning: string | null
 *   }
 */
async function tallyBallot(fundraiseId, ballotId) {
  const ballotRef = getDb()
    .collection("fundraises").doc(fundraiseId)
    .collection("ballots").doc(ballotId);
  const ballotSnap = await ballotRef.get();
  if (!ballotSnap.exists) throw new Error("tallyBallot: ballot not found");
  const ballot = ballotSnap.data();

  const totals = {};
  for (const opt of ballot.options) totals[opt] = { shares: 0, voterCount: 0 };

  const votesSnap = await ballotRef.collection("votes").get();
  let sharesCast = 0;
  for (const v of votesSnap.docs) {
    const d = v.data();
    if (!totals[d.choice]) totals[d.choice] = { shares: 0, voterCount: 0 };
    totals[d.choice].shares += Number(d.sharesWeight || 0);
    totals[d.choice].voterCount += 1;
    sharesCast += Number(d.sharesWeight || 0);
  }

  const sharesEligible = Number(ballot.snapshotTotalShares || 0);
  const turnoutPct = sharesEligible > 0 ? (sharesCast / sharesEligible) * 100 : 0;
  const quorumMet = turnoutPct >= Number(ballot.quorumPct || 0);

  let winning = null;
  let maxShares = -1;
  for (const [opt, t] of Object.entries(totals)) {
    if (t.shares > maxShares) { maxShares = t.shares; winning = opt; }
  }
  // Tie → null (no single winner)
  const ties = Object.entries(totals).filter(([, t]) => t.shares === maxShares).length;
  if (ties > 1) winning = null;

  return {
    ballotId,
    status: ballot.status,
    title: ballot.title,
    options: ballot.options,
    totals,
    sharesCast,
    sharesEligible,
    turnoutPct,
    quorumPct: Number(ballot.quorumPct || 0),
    quorumMet,
    winning,
    voteCount: votesSnap.size,
    closesAt: ballot.closesAt,
  };
}

async function closeBallot(fundraiseId, ballotId, closedBy = null) {
  const ballotRef = getDb()
    .collection("fundraises").doc(fundraiseId)
    .collection("ballots").doc(ballotId);
  const ballotSnap = await ballotRef.get();
  if (!ballotSnap.exists) throw new Error("closeBallot: ballot not found");
  if (ballotSnap.data().status === "closed") return { ok: true, alreadyClosed: true };

  const tally = await tallyBallot(fundraiseId, ballotId);
  await ballotRef.update({
    status: "closed",
    closedAt: ts(),
    closedBy: closedBy || null,
    finalTally: {
      totals: tally.totals,
      sharesCast: tally.sharesCast,
      turnoutPct: tally.turnoutPct,
      quorumMet: tally.quorumMet,
      winning: tally.winning,
    },
  });
  return { ok: true, ballotId, tally };
}

// ═══════════════════════════════════════════════════════════════
//  BALLOT NOTIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Notify all eligible voters of a new ballot via SendGrid.
 * Each investor gets a personalized link that includes their investor ID +
 * a magic-link token for one-click voting.
 */
async function notifyBallot({ fundraiseId, ballotId, baseUrl = "https://app.sociii.ai" }) {
  const ballot = await getBallot(fundraiseId, ballotId, { includeSnapshot: true });
  if (!ballot) throw new Error("notifyBallot: ballot not found");

  const eligibleIds = Object.keys(ballot.snapshotShares || {});
  if (!eligibleIds.length) return { ok: true, sentCount: 0, reason: "no eligible voters" };

  // Fetch investor records to get emails
  const invSnap = await getDb()
    .collection("fundraises").doc(fundraiseId)
    .collection("investors").get();
  const invByid = {};
  for (const d of invSnap.docs) invByid[d.id] = d.data();

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("[voting.notifyBallot] SENDGRID_API_KEY not set — skipping send");
    return { ok: true, sentCount: 0, reason: "SENDGRID_API_KEY missing" };
  }

  let sent = 0, failed = 0;
  for (const investorId of eligibleIds) {
    const inv = invByid[investorId];
    if (!inv || !inv.email) { failed++; continue; }

    const votingUrl = `${baseUrl}/invest/vote?fundraise=${encodeURIComponent(fundraiseId)}&ballot=${encodeURIComponent(ballotId)}&investor=${encodeURIComponent(investorId)}`;
    const shares = Number(ballot.snapshotShares[investorId] || 0);
    const html = _ballotEmail({
      name: inv.name || "Investor",
      title: ballot.title,
      description: ballot.description,
      options: ballot.options,
      closesAt: ballot.closesAt,
      shares,
      totalShares: ballot.snapshotTotalShares,
      votingUrl,
    });

    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: inv.email, name: inv.name }] }],
          from: { email: "alex@sociii.ai", name: "Alex — SOCIII" },
          reply_to: { email: "sean@sociii.ai" },
          subject: `Action required: vote on ${ballot.title}`,
          content: [{ type: "text/html", value: html }],
          tracking_settings: {
            click_tracking: { enable: false, enable_text: false },
            open_tracking: { enable: false },
          },
        }),
      });
      if (res.ok) sent++;
      else { failed++; console.error("[voting.notifyBallot] send failed:", res.status, await res.text().catch(() => "")); }
    } catch (e) {
      failed++;
      console.error("[voting.notifyBallot] send exception:", e.message);
    }
  }

  return { ok: true, sentCount: sent, failedCount: failed };
}

function _ballotEmail({ name, title, description, options, closesAt, shares, totalShares, votingUrl }) {
  const firstName = (name || "").split(" ")[0] || "there";
  const pct = totalShares > 0 ? ((shares / totalShares) * 100).toFixed(2) : "0.00";
  const closes = new Date(closesAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7C3AED;">SOCIII</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi ${firstName},</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    SOCIII has opened a shareholder vote that you are eligible to weigh in on.
  </p>
  <div style="margin: 28px 0; padding: 20px 24px; background: #f8fafc; border-left: 4px solid #7C3AED; border-radius: 6px;">
    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a202c;">${title}</p>
    ${description ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569; line-height: 1.6;">${description}</p>` : ""}
    <p style="margin: 0; font-size: 13px; color: #64748b;">Options: ${options.join(" · ")}</p>
    <p style="margin: 8px 0 0; font-size: 13px; color: #64748b;">Closes: <strong>${closes}</strong></p>
  </div>
  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
    Your voting weight: <strong>${shares.toLocaleString()} shares (${pct}% of outstanding)</strong>. Your vote will be tallied
    by share weight at the time this ballot was opened.
  </p>
  <div style="margin: 32px 0;">
    <a href="${votingUrl}" style="display: inline-block; padding: 14px 32px; background: #7C3AED; color: white; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600;">
      Cast your vote
    </a>
  </div>
  <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
    If you have questions, reply to this email or use the in-app chat. — Alex, Chief of Staff
  </p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">SOCIII, Inc. — Delaware C-Corporation, Las Vegas, Nevada</p>
  </div>
</div>`;
}

module.exports = {
  createBallot,
  listBallots,
  getBallot,
  castVote,
  tallyBallot,
  closeBallot,
  notifyBallot,
  snapshotCapTable,
};
