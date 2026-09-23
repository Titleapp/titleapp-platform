"use strict";

/**
 * askWorker.js — CODEX 102 Part 1: Alex's `ask_worker` capability.
 *
 * Callable ONLY as a tool binding inside Alex's own live /chat:message
 * turn (see index.js's `_isCos` block) — never a separate HTTP route,
 * never reachable from a scheduled job or another worker's turn. That is
 * what makes "Sean-initiated only" true by construction rather than a
 * description of what nothing else happens to call yet (CODEX 102 point 2).
 *
 * Answer-only, structurally: the target worker's response is generated with
 * NO tools bound at all — not "the obvious action tools removed," zero,
 * matching services/communications/personaEmailReplyGenerator.js's shape
 * (that file's own design: pure text in/out, no side effects possible).
 * This is the cheapest, safest way to satisfy CODEX 102 point 1's
 * requirement that the exclusion cover every mechanism with a deferred
 * effect, not just synchronous tool calls — there is nothing bound that
 * could write to a queue, leave a note, or do anything else, now or later.
 *
 * Tenant-scoped by construction (CODEX 102 point 4a): the target worker's
 * grounding (workspace brief) is always built from the CALLING tenant's own
 * data — targetSlug never selects which tenant's data gets read, only
 * which persona/system-prompt answers. A private (visibility:"organization")
 * worker owned by a different tenant is refused outright, reusing the same
 * real gate the generic worker-chat path already enforces (index.js, the
 * dw.visibility === "organization" check) rather than inventing a new one.
 */

const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const { assertWithinBudget } = require("./askWorkerRateLimiter");
const { buildWorkspaceBrief } = require("./workspaceBrief");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function getDb() { return admin.firestore(); }

function nowServerTs() { return admin.firestore.FieldValue.serverTimestamp(); }

// Cheap heuristic, not a content classifier — round-2 point 6: the rollup
// needs enough signal to support point 7's injection-risk claim without
// logging message content itself. Flags forwarded/pasted-looking text so a
// human (or Dev) reviewing the rollup can tell "Alex asked because Sean
// pasted something" from "Alex asked from its own reasoning about Sean's
// own words" — imperfect on purpose, cheap and directional, not a security
// boundary.
function looksLikePastedContent(text) {
  const t = String(text || "");
  if (t.length > 1200) return true;
  if (/^>/m.test(t)) return true; // block-quoted lines
  if (/-{5,}\s*forwarded message\s*-{5,}/i.test(t)) return true;
  if (/\bOn .{5,60} wrote:/.test(t)) return true; // classic email-quote header
  return false;
}

class AskWorkerBudgetExhaustedError extends Error {}
class AskWorkerRefusedError extends Error {}

/**
 * @param {object} opts
 * @param {string} opts.tenantId — Alex's own resolved tenant (never the target's)
 * @param {string} opts.callingUid
 * @param {string} opts.targetSlug
 * @param {string} opts.question
 * @param {string} opts.triggeringMessage — Sean's own message to Alex this turn, for the pasted-content heuristic only (never logged verbatim)
 * @returns {Promise<{answer: string, workerName: string}>}
 */
async function runAskWorker({ tenantId, callingUid, targetSlug, question, triggeringMessage }) {
  if (!tenantId) throw new AskWorkerRefusedError("ask_worker: no tenant context");
  if (!targetSlug) throw new AskWorkerRefusedError("ask_worker: targetSlug is required");
  if (targetSlug === "chief-of-staff") throw new AskWorkerRefusedError("ask_worker: Alex cannot ask itself");
  if (!question || !question.trim()) throw new AskWorkerRefusedError("ask_worker: question is required");

  // Round-2 point 5a — a denied call must surface as an honest statement,
  // never a silent fallback. Checked first, before any other work, so the
  // caller (index.js) gets a clean, distinguishable error to hand back to
  // Alex's own model turn as an explicit tool_result instructing it to say
  // so, never to just answer from its own reasoning with matching confidence.
  try {
    await assertWithinBudget(tenantId);
  } catch (e) {
    throw new AskWorkerBudgetExhaustedError(e.message);
  }

  const db = getDb();
  const dwSnap = await db.doc(`digitalWorkers/${targetSlug}`).get();
  if (!dwSnap.exists) throw new AskWorkerRefusedError(`ask_worker: no such worker "${targetSlug}"`);
  const dw = dwSnap.data();

  // Reuses the exact real gate the generic worker-chat path already
  // enforces (index.js's organization-only visibility check) rather than
  // inventing a parallel one — refuses a private worker owned by a
  // different tenant than the one Alex is calling from.
  if (dw.visibility === "organization" && dw.ownerTenantId && dw.ownerTenantId !== tenantId) {
    throw new AskWorkerRefusedError(`ask_worker: "${targetSlug}" is a private worker not owned by this tenant`);
  }

  const workerName = dw.persona_name || dw.display_name || dw.name || targetSlug;

  let brief = "";
  try {
    const wb = await buildWorkspaceBrief({ uid: callingUid, tenantId });
    if (wb) brief = `\n\nWORKSPACE BRIEF — REAL, current data for this business. Use these actual numbers/dates; never invent figures.\n${wb}`;
  } catch (_) {}

  const systemPrompt = `${dw.systemPrompt || `You are ${workerName}, a specialist worker on the SOCIII platform.`}

---
You are answering ONE question from Alex, this business's Chief of Staff, on behalf of the owner — not chatting directly with the owner yourself. Give a real, grounded, concise answer using the workspace data below. If you don't have enough information to answer, say so plainly rather than guessing. You have no tools in this call — you cannot take any action, only answer.${brief}`;

  if (!ANTHROPIC_API_KEY) throw new Error("ask_worker: Missing ANTHROPIC_API_KEY");
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
    // No `tools` key at all — zero write-capable tools bound, by
    // construction, satisfies CODEX 102 point 1 trivially and completely.
  }, { timeoutMs: 45000 });

  const answer = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim()
    || "I wasn't able to produce an answer.";

  await logAskWorkerCall({ db, tenantId, callingUid, targetSlug, question, answer, triggeringMessage });

  return { answer, workerName };
}

/**
 * Writes the exchange into the TARGET worker's own chat history — round-2
 * point 2: this is Alex's own orchestration code performing the write
 * directly, never a tool handed to the target worker as an exception to
 * "zero write-capable tools bound." The target worker itself has no write
 * path in this call; this is Alex writing about the target worker, not the
 * target worker writing.
 *
 * Writes to both stores the codebase already uses for worker chat history
 * (see index.js's worker-turn persistence): the live `chatSessions` working
 * doc (same deterministic id scheme, `wkr_{uid}_{tenantId}_{slug}`, so it's
 * visible if Sean opens that worker directly) and the durable `messageEvents`
 * audit collection (tagged with a distinct type so it's never confused with
 * a real user turn). Also writes a small `alexAskWorkerLog` entry — round-2
 * point 6 — readable by Dev, extending Dev's existing "Dev cannot be the
 * only thing checking Dev" rollup pattern to ask_worker usage.
 */
async function logAskWorkerCall({ db, tenantId, callingUid, targetSlug, question, answer, triggeringMessage }) {
  const sessionId = `wkr_${callingUid}_${tenantId}_${targetSlug}`;
  const sessionRef = db.collection("chatSessions").doc(sessionId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(sessionRef);
      const state = (snap.exists && snap.data().state) || {};
      const history = Array.isArray(state.salesHistory) ? state.salesHistory : [];
      history.push({ role: "user", content: question, workerSlug: targetSlug, viaAskWorker: true, askedBy: "chief-of-staff" });
      history.push({ role: "assistant", content: answer, workerSlug: targetSlug, viaAskWorker: true });
      state.salesHistory = history.length > 30 ? history.slice(-30) : history;
      tx.set(sessionRef, {
        state,
        tenantId,
        surface: "worker",
        activeWorker: targetSlug,
        userId: callingUid,
        ...(snap.exists ? {} : { createdAt: nowServerTs() }),
        updatedAt: nowServerTs(),
      }, { merge: true });
    });
  } catch (e) {
    console.error("[askWorker] failed to write target chatSessions history (continuing):", e.message);
  }

  try {
    await db.collection("messageEvents").add({
      tenantId,
      sessionId,
      userId: callingUid,
      type: "chat:message:ask_worker",
      message: question,
      response: answer,
      workerSlug: targetSlug,
      askedByWorkerSlug: "chief-of-staff",
      enforcement_model: "code",
      createdAt: nowServerTs(),
    });
  } catch (e) {
    console.error("[askWorker] failed to write messageEvents audit entry (continuing):", e.message);
  }

  try {
    await db.collection("alexAskWorkerLog").add({
      tenantId,
      targetSlug,
      callingUid,
      pastedContentFlag: looksLikePastedContent(triggeringMessage),
      createdAt: nowServerTs(),
    });
  } catch (e) {
    console.error("[askWorker] failed to write alexAskWorkerLog rollup entry (continuing):", e.message);
  }
}

module.exports = { runAskWorker, looksLikePastedContent, AskWorkerBudgetExhaustedError, AskWorkerRefusedError };
