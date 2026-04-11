"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// ─── Original 5-stage drip — non-worker creators (games + legacy spec flow) ──

const DRIP_STAGES = {
  1: { stage: 1, delayDays: 0,  subject: "Your Digital Worker draft is ready" },
  2: { stage: 2, delayDays: 3,  subject: "3 tips to make your Digital Worker stand out" },
  3: { stage: 3, delayDays: 7,  subject: "Your Digital Worker is waiting" },
  4: { stage: 4, delayDays: 14, subject: "See what other creators built this week" },
  5: { stage: 5, delayDays: 30, subject: "We saved your Digital Worker draft" },
};

// ─── 4-stage CoS-toned drip — workers only (CODEX 47.4 Part 9) ──────────────
//
// Tone: Alex following up as Chief of Staff, never marketing. Each message
// references the worker name, the step the creator left off at, and how far
// through the build they are. After 14 days the drip goes silent — the draft
// remains in the Vault indefinitely with no further nudges.

const DRIP_STAGES_WORKER = {
  1: { stage: 1, delayDays: 1,  subject: "{{workerName}} is waiting" },
  2: { stage: 2, delayDays: 3,  subject: "{{workerName}} is {{percentComplete}}% complete" },
  3: { stage: 3, delayDays: 7,  subject: "Creators who finish in week one earn 3x more" },
  4: { stage: 4, delayDays: 14, subject: "Last nudge on {{workerName}}" },
};

/**
 * Enqueue a drip email for a creator.
 *
 * @param {string} userId
 * @param {number} stage
 * @param {string} sessionId
 * @param {object} [opts]
 * @param {string} [opts.creatorPath]  — "worker" routes to the 4-stage CoS drip
 */
async function enqueueDripEmail(userId, stage, sessionId, opts = {}) {
  const db = getDb();

  const isWorker = opts.creatorPath === "worker";
  const stageMap = isWorker ? DRIP_STAGES_WORKER : DRIP_STAGES;
  const stageConfig = stageMap[stage];
  if (!stageConfig) return;

  const scheduledAt = new Date(Date.now() + stageConfig.delayDays * 24 * 60 * 60 * 1000);

  // Load user for email address
  const userSnap = await db.collection("users").doc(userId).get();
  const userData = userSnap.exists ? userSnap.data() : {};

  // Load worker name + flow state from session
  let workerName = "your Digital Worker";
  let currentStepLabel = null;
  let percentComplete = 0;
  let creatorPath = opts.creatorPath || null;
  if (sessionId) {
    const sSnap = await db.collection("sandboxSessions").doc(sessionId).get();
    if (sSnap.exists) {
      const sd = sSnap.data();
      if (sd.spec) workerName = sd.spec.name || workerName;
      if (sd.creatorPath && !creatorPath) creatorPath = sd.creatorPath;
      if (sd.workerStepPhase) currentStepLabel = sd.workerStepPhase;
      if (sd.workerSteps) {
        const stepIds = Object.keys(sd.workerSteps);
        const completed = stepIds.filter(id => sd.workerSteps[id]?.status === "complete").length;
        percentComplete = stepIds.length > 0 ? Math.round((completed / stepIds.length) * 100) : 0;
      }
    }
  }

  const firstName = userData.name ? userData.name.split(" ")[0] : null;

  const subject = (stageConfig.subject || "")
    .replace(/{{workerName}}/g, workerName)
    .replace(/{{percentComplete}}/g, String(percentComplete));

  const htmlBody = isWorker
    ? buildWorkerEmailHtml(stageConfig.stage, firstName, workerName, currentStepLabel, percentComplete)
    : buildEmailHtml(stageConfig.stage, firstName, workerName);

  const campaignId = isWorker
    ? `sandbox_worker_drip_stage_${stageConfig.stage}`
    : `sandbox_drip_stage_${stageConfig.stage}`;

  await db.collection("messageQueue").add({
    userId,
    campaignId,
    channel: "email",
    to: userData.email || "",
    subject,
    body: htmlBody,
    stage: stageConfig.stage,
    creatorPath: creatorPath || null,
    sessionId,
    status: "pending",
    scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
    sentAt: null,
    error: null,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Build HTML email body for the worker-only 4-stage CoS drip.
 * Tone: Alex as Chief of Staff, never marketing.
 */
function buildWorkerEmailHtml(stage, firstName, workerName, currentStepLabel, percentComplete) {
  const name = firstName || "there";
  const wName = workerName || "your worker";
  const stepLabel = currentStepLabel || "the next step";
  const pct = typeof percentComplete === "number" ? percentComplete : 0;

  const bodies = {
    1: `<p>Hi ${name},</p>
<p><strong>${wName}</strong> is waiting. You left off at <strong>${stepLabel}</strong> — you're ${pct}% of the way there.</p>
<p>Want to pick up where we left off?</p>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #6B46C1; text-decoration: none; font-weight: 600;">Continue building ${wName}</a></p>
<p>— Alex</p>`,

    2: `<p>Hi ${name},</p>
<p><strong>${wName}</strong> is ${pct}% complete. Here's what's left to finish: ${stepLabel} and the steps after it.</p>
<p>The hardest part is behind you. The work you've already done doesn't go anywhere — it's saved in your Vault.</p>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #6B46C1; text-decoration: none; font-weight: 600;">Pick up where you left off</a></p>
<p>— Alex</p>`,

    3: `<p>Hi ${name},</p>
<p>Creators who finish their first worker in the first week earn 3x more in their first month. You've already done the hard work — ${pct}% of the build is done.</p>
<p><strong>${wName}</strong> is almost ready to earn for you.</p>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #6B46C1; text-decoration: none; font-weight: 600;">Finish ${wName}</a></p>
<p>— Alex</p>`,

    4: `<p>Hi ${name},</p>
<p>This is the last time I'll nudge you on <strong>${wName}</strong>. It will be here whenever you're ready — your work is saved and nothing is lost.</p>
<p>When you come back, we'll pick up exactly where you left off.</p>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #6B46C1; text-decoration: none; font-weight: 600;">Return to your sandbox</a></p>
<p>— Alex</p>`,
  };

  const bodyContent = bodies[stage] || bodies[1];

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #6B46C1;">TitleApp</span>
  </div>
  <div style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    ${bodyContent}
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">TitleApp LLC | Start Free. 60-Day Money Back. Your Data Is Always Yours.</p>
  </div>
</div>`;
}

/**
 * Build HTML email body for a given drip stage.
 */
function buildEmailHtml(stage, firstName, workerName) {
  const name = firstName || "there";
  const wName = workerName || "your Digital Worker";

  const bodies = {
    1: `<p>Hi ${name},</p>
<p>Your draft spec for <strong>${wName}</strong> is ready. You described something worth building.</p>
<p>Share it with potential users and gather interest before you publish:</p>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Return to your sandbox</a></p>
<p>Reply to this email if you have questions — it goes to a real person.</p>
<p>— Alex</p>`,

    2: `<p>Hi ${name},</p>
<p>Three things that help Digital Workers stand out:</p>
<ol>
<li>Add at least 3 compliance rules so users know your worker follows industry standards.</li>
<li>Write sample interactions that show exactly what a conversation looks like.</li>
<li>Pick the right pricing tier — match the complexity of the problem you solve.</li>
</ol>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Apply these to ${wName}</a></p>
<p>— Alex</p>`,

    3: `<p>Hi ${name},</p>
<p>Your draft for <strong>${wName}</strong> is still saved. Creators who publish in the first week tend to see 3x more early subscribers.</p>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Pick up where you left off</a></p>
<p>— Alex</p>`,

    4: `<p>Hi ${name},</p>
<p>Other creators published new Digital Workers this week. Your <strong>${wName}</strong> could be next.</p>
<p>The marketplace is growing and early movers in your category have less competition.</p>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Finish and publish ${wName}</a></p>
<p>— Alex</p>`,

    5: `<p>Hi ${name},</p>
<p>We saved your draft for <strong>${wName}</strong>. It is still here whenever you are ready.</p>
<p>If you have questions about building or publishing, reply to this email — it goes to a real person.</p>
<p><a href="https://app.titleapp.ai/sandbox" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Return to your sandbox</a></p>
<p>— Alex</p>`,
  };

  const bodyContent = bodies[stage] || bodies[1];

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span>
  </div>
  <div style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    ${bodyContent}
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">TitleApp LLC | Start Free. 60-Day Money Back. Your Data Is Always Yours.</p>
  </div>
</div>`;
}

/**
 * Daily processor: send all pending drip emails whose scheduledAt <= now.
 */
async function processDripQueue() {
  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  // NOTE: enqueueDripEmail writes to `messageQueue`. The collection name in
  // this processor used to read `emailQueue`, which silently dropped every
  // pending drip on the floor. Fixed as part of CODEX 47.4.
  const pendingSnap = await db.collection("messageQueue")
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", now)
    .limit(200)
    .get();

  if (pendingSnap.empty) {
    console.log("[dripQueue] No pending emails to process");
    return { ok: true, sent: 0, skipped: 0, failed: 0 };
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const emailDoc of pendingSnap.docs) {
    const email = emailDoc.data();
    try {
      // Load user
      const userSnap = await db.collection("users").doc(email.userId).get();
      if (!userSnap.exists || !userSnap.data().email) {
        await emailDoc.ref.update({ status: "skipped", error: "No user or email" });
        skipped++;
        continue;
      }
      const userData = userSnap.data();

      // Check if session has progressed past sandbox (skip remaining drips)
      if (email.sessionId) {
        const sessionSnap = await db.collection("sandboxSessions").doc(email.sessionId).get();
        if (sessionSnap.exists) {
          const sessionStatus = sessionSnap.data().status;
          if (sessionStatus === "published" || sessionStatus === "building") {
            await emailDoc.ref.update({ status: "skipped", error: "Session already progressed" });
            skipped++;
            continue;
          }
        }
      }

      // Load worker name from session
      let workerName = "your Digital Worker";
      if (email.sessionId) {
        const sSnap = await db.collection("sandboxSessions").doc(email.sessionId).get();
        if (sSnap.exists && sSnap.data().spec) {
          workerName = sSnap.data().spec.name || workerName;
        }
      }

      const firstName = userData.name ? userData.name.split(" ")[0] : null;
      const htmlBody = buildEmailHtml(email.stage, firstName, workerName);

      // Send via SendGrid
      const { sendViaSendGrid } = require("../marketingService/emailNotify");
      await sendViaSendGrid({
        to: userData.email,
        subject: email.subject,
        htmlBody,
      });

      await emailDoc.ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      sent++;

      // Auto-enqueue next stage. Workers stop at stage 4 (then silent
      // per CODEX 47.4 Part 9). Non-worker creators continue to stage 5.
      const isWorker = email.creatorPath === "worker";
      const maxStage = isWorker ? 4 : 5;
      if (email.stage < maxStage) {
        await enqueueDripEmail(email.userId, email.stage + 1, email.sessionId, {
          creatorPath: email.creatorPath || null,
        });
      }
    } catch (e) {
      console.error(`[dripQueue] Failed to send email ${emailDoc.id}:`, e.message);
      await emailDoc.ref.update({ status: "failed", error: e.message });
      failed++;
    }
  }

  console.log(`[dripQueue] Processed: sent=${sent}, skipped=${skipped}, failed=${failed}`);
  return { ok: true, sent, skipped, failed };
}

module.exports = { enqueueDripEmail, processDripQueue, DRIP_STAGES, DRIP_STAGES_WORKER };
