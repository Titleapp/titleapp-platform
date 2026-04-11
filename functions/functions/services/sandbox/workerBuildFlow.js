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
