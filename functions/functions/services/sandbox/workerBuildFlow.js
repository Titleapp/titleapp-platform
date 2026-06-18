"use strict";

/**
 * Worker Build Flow — state machine for the 9-step Worker Sandbox build flow.
 * CODEX 47.4 Phase A (T1).
 *
 * Mirrors the game sandbox `gameSessionPhase` machine but for workers.
 * Append-only: every state transition is appended to workerStepHistory[],
 * never overwritten. workerSteps map holds the latest computed state for
 * fast reads, but workerStepHistory is the source of truth.
 */

const admin = require("firebase-admin");
const { emitCreatorEvent } = require("./creatorEvents");

function getDb() { return admin.firestore(); }

// ─── Step definitions ───────────────────────────────────────────────────────

const WORKER_STEPS = [
  { id: "define",     order: 1, label: "Define",      nobodyElse: false },
  { id: "design",     order: 2, label: "Design",      nobodyElse: false },
  { id: "knowledge",  order: 3, label: "Knowledge",   nobodyElse: true  },
  { id: "rules",      order: 4, label: "Rules",       nobodyElse: false },
  { id: "tools",      order: 5, label: "Tools",       nobodyElse: false },
  { id: "test",       order: 6, label: "Test",        nobodyElse: true  },
  { id: "preflight",  order: 7, label: "Preflight",   nobodyElse: false },
  { id: "distribute", order: 8, label: "Distribute",  nobodyElse: false },
  { id: "grow",       order: 9, label: "Grow & Revise", nobodyElse: true },
];

const STEP_IDS = WORKER_STEPS.map(s => s.id);
const STEP_BY_ID = Object.fromEntries(WORKER_STEPS.map(s => [s.id, s]));

const STEP_STATUS = {
  NOT_STARTED: "not_started", // red
  IN_PROGRESS: "in_progress", // yellow
  COMPLETE:    "complete",    // green
};

// ─── Empty-state factory ────────────────────────────────────────────────────

function emptyWorkerSteps() {
  const map = {};
  for (const s of WORKER_STEPS) {
    map[s.id] = {
      status: STEP_STATUS.NOT_STARTED,
      startedAt: null,
      completedAt: null,
      data: {},
    };
  }
  return map;
}

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Initialize worker build flow on an existing sandbox session.
 * Idempotent — does nothing if workerSteps is already populated.
 *
 * If sessionId is null/undefined, creates a fresh sandboxSessions doc
 * with no vibe answers and an empty spec. This lets a creator enter
 * the worker build flow directly without going through the vibe quiz.
 */
async function initWorkerFlow({ userId, sessionId, workerName }) {
  const db = getDb();

  if (!sessionId) {
    // Create fresh session
    const sessionRef = await db.collection("sandboxSessions").add({
      userId,
      vibeAnswers: null,
      spec: workerName ? { name: String(workerName).slice(0, 60) } : {},
      status: "worker_build_in_progress",
      creatorPath: "worker",
      workerStepPhase: "define",
      workerSteps: emptyWorkerSteps(),
      workerStepHistory: [],
      buildLog: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      replies: [],
      lastReplyAt: null,
    });

    // Mark Define as in_progress immediately so the status bar shows yellow
    await markStepInProgress({ userId, sessionId: sessionRef.id, stepId: "define" });

    // Kick off the 4-stage CoS-toned worker drip (non-blocking)
    try {
      const { enqueueDripEmail } = require("./dripEmailQueue");
      await enqueueDripEmail(userId, 1, sessionRef.id, { creatorPath: "worker" });
    } catch (e) {
      console.error("[workerBuildFlow.init] worker drip enqueue failed (non-blocking):", e.message);
    }

    return { sessionId: sessionRef.id, created: true };
  }

  // Bolt onto existing session
  const sessionRef = db.collection("sandboxSessions").doc(sessionId);
  const snap = await sessionRef.get();
  if (!snap.exists) {
    throw new Error(`sandboxSessions/${sessionId} does not exist`);
  }
  const data = snap.data();
  if (data.userId !== userId) {
    throw new Error("Not authorized for this session");
  }
  if (data.workerSteps && data.workerStepPhase) {
    return { sessionId, created: false, alreadyInitialized: true };
  }

  await sessionRef.update({
    creatorPath: "worker",
    workerStepPhase: "define",
    workerSteps: emptyWorkerSteps(),
    workerStepHistory: [],
    buildLog: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await markStepInProgress({ userId, sessionId, stepId: "define" });

  return { sessionId, created: false, alreadyInitialized: false };
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function nowIso() { return new Date().toISOString(); }

async function loadSessionForUser(sessionId, userId) {
  const db = getDb();
  const ref = db.collection("sandboxSessions").doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`sandboxSessions/${sessionId} not found`);
  const data = snap.data();
  if (data.userId !== userId) throw new Error("Not authorized for this session");
  return { ref, data };
}

function appendHistoryEntry(currentHistory, entry) {
  // Defensive: never trust caller-supplied arrays
  const safe = Array.isArray(currentHistory) ? currentHistory.slice() : [];
  safe.push(entry);
  return safe;
}

// ─── State transitions ─────────────────────────────────────────────────────

/**
 * Mark a step as in_progress. Idempotent — if already in_progress or
 * complete, no-ops with no history entry.
 */
async function markStepInProgress({ userId, sessionId, stepId }) {
  if (!STEP_BY_ID[stepId]) throw new Error(`Unknown stepId: ${stepId}`);

  const { ref, data } = await loadSessionForUser(sessionId, userId);
  const steps = data.workerSteps || emptyWorkerSteps();
  const cur = steps[stepId] || { status: STEP_STATUS.NOT_STARTED };

  if (cur.status === STEP_STATUS.IN_PROGRESS || cur.status === STEP_STATUS.COMPLETE) {
    return { changed: false, step: cur };
  }

  const updatedStep = {
    ...cur,
    status: STEP_STATUS.IN_PROGRESS,
    startedAt: nowIso(),
  };

  const history = appendHistoryEntry(data.workerStepHistory, {
    stepId,
    action: "start",
    at: nowIso(),
    by: userId,
  });

  await ref.update({
    [`workerSteps.${stepId}`]: updatedStep,
    workerStepPhase: stepId,
    workerStepHistory: history,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { changed: true, step: updatedStep };
}

/**
 * Mark a step as complete and advance workerStepPhase to the next step.
 * Appends a "complete" entry to workerStepHistory.
 *
 * If `data` is provided, it is merged into workerSteps[stepId].data so
 * downstream readers (Build Log, completion message renderer) can pull
 * step-specific facts (worker name, document count, UX type, etc.).
 *
 * Returns { step, nextStepId, allComplete, completionMessageContext }.
 */
// ─── S52.50 (#32) — publish a real, openable worker on Distribute ────────────
// The build flow used to only write sandboxSessions, so a finished worker had
// no catalog entry and /workers/<slug> 404'd. On Distribute-complete we now
// write a digitalWorkers/<slug> doc (with a canvasSpec built from the design) so
// the worker is openable + renders its designed canvas via the data-driven path.
function slugifyWorker(s) {
  return String(s || "your-worker").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 60) || "your-worker";
}

function buildCanvasSpecFromSession(data) {
  const spec = data.spec || {};
  const design = (data.workerSteps && data.workerSteps.design && data.workerSteps.design.data) || {};
  const name = spec.name || "Your Worker";
  const vertical = spec.category || spec.vertical || "";
  const headline = design.headlineOutcome || "";
  const tabsIn = (design.tabs || []).filter((t) => t && t.name && String(t.name).trim());
  const tabs = (tabsIn.length ? tabsIn : [{ name: "Overview", job: "the default view" }]).map((t, i) => {
    const blocks = [];
    if (i === 0 && headline) blocks.push({ type: "heroes", items: [{ band: "GREEN", title: headline, detail: "The one outcome users see first" }] });
    blocks.push({ type: "prose", items: [{ band: "BLUE", title: String(t.name).trim(), body: (t.job && String(t.job).trim() ? String(t.job).trim() : "This tab does one job.") + " — live data renders here once your worker runs." }] });
    return { id: "t" + i, label: String(t.name).trim(), blocks };
  });
  return {
    title: name,
    subtitle: vertical ? "Preview · " + vertical : "Preview",
    disclaimer: "Newly published — data fills in as the worker runs.",
    cas: { RED: 0, YELLOW: 0, BLUE: tabs.length, WHITE: 0, GREEN: headline ? 1 : 0 },
    tabs,
  };
}

async function publishWorkerFromSession(userId, sessionId, data) {
  const db = getDb();
  const spec = data.spec || {};
  const name = spec.name || "Your Worker";
  const slug = slugifyWorker(name);
  const pre = (data.workerSteps && data.workerSteps.preflight && data.workerSteps.preflight.data) || {};
  const visibility = pre.visibility || "public";
  const status = visibility === "unlisted" ? "unlisted"
    : (visibility === "org" || visibility === "org-only") ? "org" : "beta";
  const design = (data.workerSteps && data.workerSteps.design && data.workerSteps.design.data) || {};

  // ── Carry the creator's RULES into the live worker ──
  // The runtime chat (index.js) reads raas_tier_0..3 (arrays of strings) to build
  // the worker's behavioral rules. Without this the published worker is an
  // ungoverned generic LLM. The creator's 4 tiers live in the rules step.
  const rules = (data.workerSteps && data.workerSteps.rules && data.workerSteps.rules.data) || {};
  const toLines = (v) => Array.isArray(v)
    ? v.filter(Boolean).map((s) => String(s).trim()).filter(Boolean)
    : (typeof v === "string" ? v.split("\n").map((s) => s.trim()).filter(Boolean) : []);
  const raas_tier_0 = toLines(rules.tier0);
  const raas_tier_1 = toLines(rules.tier1);
  const raas_tier_2 = toLines(rules.tier2);
  const raas_tier_3 = toLines(rules.tier3);

  // ── Carry the creator's KNOWLEDGE into the live worker ──
  // Uploaded docs are parsed into the Studio Locker keyed by sessionId. Pull the
  // extracted text (capped) and store it inline so the worker chat is grounded
  // in the creator's documents (runtime injects dw.knowledgeBase).
  let knowledgeBase = "";
  try {
    const { listDocuments } = require("./studioLocker");
    const lockerDocs = await listDocuments({ userId, workerId: sessionId });
    const parts = [];
    let budget = 12000; // total char cap across docs
    for (const d of lockerDocs) {
      const txt = String(d.extractedText || "").trim();
      if (!txt || budget <= 0) continue;
      const title = d.name || d.title || "Document";
      const slice = txt.slice(0, budget);
      parts.push(`### ${title}\n${slice}`);
      budget -= slice.length;
    }
    if (parts.length) {
      knowledgeBase = "KNOWLEDGE BASE — the creator's uploaded source material. Ground your answers in this:\n\n" + parts.join("\n\n");
    }
  } catch (e) {
    console.warn("[workerBuildFlow] knowledge load for publish failed:", e.message);
  }

  const doc = {
    slug,
    display_name: name,
    name,
    vertical: spec.category || spec.vertical || "",
    headline: design.headlineOutcome || "",
    short_description: spec.problemSolves || spec.targetAudience || "",
    status,
    worker_type: "worker",
    canvasSpec: buildCanvasSpecFromSession(data),
    raas_tier_0,
    raas_tier_1,
    raas_tier_2,
    raas_tier_3,
    ...(knowledgeBase ? { knowledgeBase } : {}),
    source: "sandbox",
    createdBy: userId,
    sandboxSessionId: sessionId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection("digitalWorkers").doc(slug).set({
    ...doc,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { slug, status, url: `https://sociii.ai/workers/${slug}` };
}

async function markStepComplete({ userId, sessionId, stepId, stepData = {} }) {
  if (!STEP_BY_ID[stepId]) throw new Error(`Unknown stepId: ${stepId}`);

  const { ref, data } = await loadSessionForUser(sessionId, userId);
  const steps = data.workerSteps || emptyWorkerSteps();
  const cur = steps[stepId] || { status: STEP_STATUS.NOT_STARTED };

  if (cur.status === STEP_STATUS.COMPLETE) {
    // Idempotent — return current state without re-emitting events
    const nextStepId = computeNextStepId(stepId, steps);
    return {
      changed: false,
      step: cur,
      nextStepId,
      allComplete: nextStepId === null,
      completionMessageContext: buildCompletionContext(stepId, cur, data),
    };
  }

  const merged = {
    ...cur,
    ...(cur.data || stepData ? { data: { ...(cur.data || {}), ...stepData } } : {}),
    status: STEP_STATUS.COMPLETE,
    completedAt: nowIso(),
    startedAt: cur.startedAt || nowIso(),
  };

  const history = appendHistoryEntry(data.workerStepHistory, {
    stepId,
    action: "complete",
    at: nowIso(),
    by: userId,
    payload: stepData || {},
  });

  // Compute next step from the projected post-complete map
  const projectedSteps = { ...steps, [stepId]: merged };
  const nextStepId = computeNextStepId(stepId, projectedSteps);
  const allComplete = nextStepId === null;

  const updates = {
    [`workerSteps.${stepId}`]: merged,
    workerStepHistory: history,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (nextStepId) {
    updates.workerStepPhase = nextStepId;
  } else {
    updates.workerStepPhase = "complete";
    updates.status = "worker_build_complete";
  }
  await ref.update(updates);

  // Auto-advance: mark next step as in_progress so the bar lights up yellow
  if (nextStepId) {
    try {
      await markStepInProgress({ userId, sessionId, stepId: nextStepId });
    } catch (e) {
      console.error("[workerBuildFlow] auto-advance to next step failed:", e.message);
    }
  }

  // #32 — on Distribute-complete, publish the worker into the digitalWorkers
  // catalog so it's actually openable at /workers/<slug> and renders its
  // designed canvas. Non-fatal if it fails (the step still completes).
  let published = null;
  if (stepId === "distribute") {
    try {
      published = await publishWorkerFromSession(userId, sessionId, { ...data, workerSteps: projectedSteps });
      await ref.update({ publishedWorker: published, publishedAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (e) {
      console.error("[workerBuildFlow] publishWorkerFromSession failed:", e.message);
    }
  }

  // Emit funnel event (non-blocking)
  emitCreatorEvent(userId, `worker_step_complete_${stepId}`, {
    sessionId,
    stepId,
    nextStepId,
  });

  return {
    changed: true,
    step: merged,
    nextStepId,
    allComplete,
    published,
    completionMessageContext: buildCompletionContext(stepId, merged, {
      ...data,
      workerSteps: projectedSteps,
    }),
  };
}

/**
 * Compute the next step that is not yet complete.
 * Returns null when every step is complete.
 */
function computeNextStepId(currentStepId, steps) {
  const startOrder = STEP_BY_ID[currentStepId]?.order || 0;
  // Look forward first
  for (const s of WORKER_STEPS) {
    if (s.order > startOrder && steps[s.id]?.status !== STEP_STATUS.COMPLETE) {
      return s.id;
    }
  }
  // Then sweep from the start in case earlier steps are still open
  for (const s of WORKER_STEPS) {
    if (steps[s.id]?.status !== STEP_STATUS.COMPLETE) {
      return s.id;
    }
  }
  return null;
}

// ─── Read API ──────────────────────────────────────────────────────────────

async function getFlowState({ userId, sessionId }) {
  const { data } = await loadSessionForUser(sessionId, userId);
  return {
    sessionId,
    creatorPath: data.creatorPath || null,
    workerStepPhase: data.workerStepPhase || null,
    workerSteps: data.workerSteps || emptyWorkerSteps(),
    workerStepHistory: data.workerStepHistory || [],
    spec: data.spec || {},
    status: data.status || null,
  };
}

// ─── Completion message context ────────────────────────────────────────────

/**
 * Build the variable bag the frontend will use to render the Step-Complete
 * Alex message (CODEX 47.4 Part 4). Backend computes the facts; frontend
 * picks the template. We deliberately do NOT render the message text here
 * because the templates are tone-critical and live with the UI in T2.
 */
function buildCompletionContext(stepId, step, sessionData) {
  const spec = sessionData.spec || {};
  const ctx = {
    stepId,
    workerName: spec.name || "your worker",
    vertical: spec.category || "your vertical",
    nobodyElse: !!STEP_BY_ID[stepId]?.nobodyElse,
  };

  // Step-specific facts for templating
  if (stepId === "design") {
    ctx.uxType = (step.data && step.data.uxType) || null;
  }
  if (stepId === "knowledge") {
    ctx.documentCount = (step.data && step.data.documentCount) || 0;
  }
  if (stepId === "tools") {
    ctx.connectedTools = (step.data && step.data.connectedTools) || [];
  }
  if (stepId === "preflight") {
    ctx.gatesPassed = (step.data && step.data.gatesPassed) || 7;
  }
  if (stepId === "grow") {
    ctx.firstSubscriber = (step.data && step.data.firstSubscriber) || null;
  }
  return ctx;
}

// ─── Route handlers ─────────────────────────────────────────────────────────

/**
 * POST /v1/sandbox:worker:init
 * Body: { sessionId?: string, workerName?: string }
 */
async function handleInit(req, res, user) {
  try {
    const { sessionId, workerName } = req.body || {};
    const result = await initWorkerFlow({ userId: user.uid, sessionId, workerName });
    const state = await getFlowState({ userId: user.uid, sessionId: result.sessionId });
    return res.json({ ok: true, ...result, state });
  } catch (e) {
    console.error("[sandbox:worker:init] failed:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /v1/sandbox:worker:advance
 * Body: { sessionId, stepId, action: "start"|"complete", data?: {...} }
 */
async function handleAdvance(req, res, user) {
  try {
    const { sessionId, stepId, action, data: stepData } = req.body || {};
    if (!sessionId || !stepId || !action) {
      return res.status(400).json({ ok: false, error: "sessionId, stepId, and action are required" });
    }
    if (!STEP_BY_ID[stepId]) {
      return res.status(400).json({ ok: false, error: `Unknown stepId: ${stepId}` });
    }

    let result;
    if (action === "start") {
      result = await markStepInProgress({ userId: user.uid, sessionId, stepId });
    } else if (action === "complete") {
      result = await markStepComplete({ userId: user.uid, sessionId, stepId, stepData: stepData || {} });

      // Regenerate Build Log on each completion (non-blocking)
      try {
        const { regenerateBuildLog } = require("./buildLog");
        await regenerateBuildLog({ userId: user.uid, sessionId });
      } catch (e) {
        console.error("[sandbox:worker:advance] buildLog regenerate failed (non-blocking):", e.message);
      }
    } else {
      return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
    }

    const state = await getFlowState({ userId: user.uid, sessionId });
    return res.json({ ok: true, ...result, state });
  } catch (e) {
    console.error("[sandbox:worker:advance] failed:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * GET /v1/sandbox:worker:state?sessionId=...
 */
async function handleGetState(req, res, user) {
  try {
    const sessionId = (req.query && req.query.sessionId) || (req.body && req.body.sessionId);
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "sessionId is required" });
    }
    const state = await getFlowState({ userId: user.uid, sessionId });
    return res.json({ ok: true, state });
  } catch (e) {
    console.error("[sandbox:worker:state] failed:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = {
  // Constants
  WORKER_STEPS,
  STEP_IDS,
  STEP_BY_ID,
  STEP_STATUS,
  // Internal API (used by other sandbox services)
  initWorkerFlow,
  markStepInProgress,
  markStepComplete,
  getFlowState,
  emptyWorkerSteps,
  // Route handlers
  handleInit,
  handleAdvance,
  handleGetState,
};
