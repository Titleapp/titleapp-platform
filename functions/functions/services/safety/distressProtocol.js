"use strict";

/**
 * distressProtocol.js — implements CODEX 66's distress-disclosure protocol.
 *
 * Platform-wide, Level 1 (non-overridable). Users disclose more to AI than
 * to a human in the same role because they feel less judged — this happens
 * across every worker type, not just clinical ones. This module exists
 * because a real nursing student is about to be able to talk to a real
 * AI tutor (Hannah) under an active IRB — CODEX 66 was written in June,
 * named this exact scenario, and was never actually built. See
 * docs/codex/66-worker-persona-and-distress-protocol.md for the full spec;
 * this is the implementation, not a reinterpretation.
 *
 * Two-stage pipeline:
 *   Stage 1 — regex gate (synchronous, ~0ms). No match → pass through.
 *   Stage 2 — classifier (synchronous, ~300ms). Match → classify severity
 *             before any response is generated. Fails closed on error.
 */

const Anthropic = require("@anthropic-ai/sdk");
const admin = require("firebase-admin");

// Stage 1 — CODEX 66 §3.2 trigger patterns.
const TRIGGER_REGEX = new RegExp(
  "(panic attack|can't cope|thinking of (quitting|ending|giving up)|" +
  "suicid|self.harm|can't make (payroll|rent)|drinking (before|to cope)|" +
  "don't want to (fly|go in|be here)|can't go on|feeling hopeless|" +
  "harming (myself|themselves|himself|herself))",
  "i"
);

function matchesTrigger(message) {
  return TRIGGER_REGEX.test(String(message || ""));
}

const CLASSIFIER_SYSTEM_PROMPT = `You are a safety classifier. Assess this message for distress signals.
Reply ONLY with valid JSON — no prose outside the JSON object.

severity: 'none' if this is a routine task message, past-tense reference,
  or figure of speech with no active distress.
severity: 'yellow' if the speaker is expressing active personal stress,
  struggling, or describing a difficult ongoing situation.
severity: 'red' if the message contains language suggesting imminent risk
  to the speaker or others (explicit self-harm intent, active danger,
  impairment before a safety-critical task such as flying or patient care).
isSelf: false if the distress is about a third party the speaker is
  observing or reporting on — not their own state.
reason: one sentence explaining your classification, using the user's
  framing but not their exact words.

Output schema:
{
  "isDistress": boolean,
  "isSelf": boolean,
  "severity": "none" | "yellow" | "red",
  "reason": string
}`;

/**
 * Stage 2 classifier. Always synchronous — severity must be known before
 * any response is generated, so this cannot be deferred to a background job.
 * Fails closed: any error (rate limit, network, malformed JSON) defaults to
 * yellow-minimum, per CODEX 66 §3.2. Fail-open is not acceptable on a safety
 * path.
 *
 * @param {string} message — the flagged message
 * @param {Array<{role, content}>} priorTurns — up to 3 prior turns of context
 */
async function classifyDistress(message, priorTurns) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const context = (priorTurns || []).slice(-3)
      .map(t => `${t.role}: ${String(t.content || "").slice(0, 500)}`)
      .join("\n");
    const userContent = context
      ? `Prior context:\n${context}\n\nFlagged message: ${message}`
      : `Flagged message: ${message}`;

    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: CLASSIFIER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    const rawText = resp.content.find(b => b.type === "text")?.text || "";
    // Models reliably ignore "reply ONLY with JSON" and wrap it in a
    // ```json fence anyway — strip fences, then fall back to extracting the
    // first {...} block, before giving up and failing closed.
    let jsonText = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`classifier returned non-JSON: ${rawText.slice(0, 200)}`);
      parsed = JSON.parse(match[0]);
    }
    if (!["none", "yellow", "red"].includes(parsed.severity)) throw new Error(`invalid severity value: ${JSON.stringify(parsed).slice(0, 200)}`);
    return {
      isDistress: !!parsed.isDistress,
      isSelf: parsed.isSelf !== false,
      severity: parsed.severity,
      reason: String(parsed.reason || "").slice(0, 500),
      classifierError: false,
    };
  } catch (err) {
    console.error("[distressProtocol] classifier failed — failing closed to yellow:", err.message);
    return {
      isDistress: true,
      isSelf: true,
      severity: "yellow",
      reason: "distress_classifier_error — held to conservative path",
      classifierError: true,
    };
  }
}

// CODEX 66 §3.2 referral table, keyed by domain context inferred from vertical/workerId.
const REFERRAL_TABLE = {
  aviation: { yellow: "the FAA HIMS AME network and your operator's ASAP program (confidential self-referral)", red: "the FAA HIMS AME network, your operator's ASAP program, and 988" },
  nursing: { yellow: "your campus counseling center and your faculty advisor", red: "your campus counseling center, your faculty advisor, and 988" },
  education: { yellow: "your campus counseling center and your faculty advisor", red: "your campus counseling center, your faculty advisor, and 988" },
  financial: { yellow: "SCORE mentors, your local SBDC, or a licensed financial counselor", red: "SCORE mentors, your local SBDC, or a licensed financial counselor, and 988" },
  general: { yellow: "a resource you trust", red: "988" },
};

function resolveReferral(vertical, severity) {
  const table = REFERRAL_TABLE[vertical] || REFERRAL_TABLE.general;
  return table[severity] || table.yellow;
}

/**
 * Build the CODEX 66 §3.3 Step-1/2 acknowledgment block to inject into a
 * yellow-severity response. The worker's normal answer still gets
 * generated — this is prepended guidance, not a substitution.
 */
function buildYellowInjection(classification, vertical) {
  const referral = resolveReferral(vertical, "yellow");
  if (classification.isSelf) {
    return `\n\nSAFETY PROTOCOL (CODEX 66, non-overridable — the user's message was flagged as active personal distress, severity yellow): before or alongside your normal answer, acknowledge it directly — do not deflect, do not say "I'm just an AI." Something like: "That sounds really hard. I want to make sure you have support for this." Then name a specific resource: ${referral}. After that, return to the user's lead — do not force a topic change, do not repeat this referral again this session unless they bring up crisis language again.`;
  }
  return `\n\nSAFETY PROTOCOL (CODEX 66, non-overridable — the user's message was flagged as describing distress in a THIRD PARTY, severity yellow): acknowledge the seriousness ("That's a serious situation. Here's how you can get the right people involved.") and direct them to the appropriate person/authority for this situation, not self-referral language. Domain resource: ${referral}.`;
}

/**
 * Build the CODEX 66 §3.4 red-severity substituted response. This REPLACES
 * the model's response entirely — task flow is paused, the worker does not
 * continue the prior task in this turn.
 */
function buildRedResponse(classification, vertical) {
  const referral = resolveReferral(vertical, "red");
  if (classification.isSelf) {
    return `What you're describing sounds serious and I want to make sure you're safe. Please reach out to ${referral} right now. I'll be here when you're ready.`;
  }
  return `This sounds urgent. If the person you're describing is in immediate danger, call 911 (or campus/local emergency services) right now — don't wait. If you're not sure whether it's an emergency, you can also call 988 and they'll help you figure out what to do. You're doing the right thing by taking this seriously.`;
}

/**
 * Write the CODEX 66 §3.3 Step-3 alert. Structured metadata only — never
 * the user's actual words.
 */
async function writeDistressAlert(db, { uid, workerId, sessionId, tenantId, severity, isSelf, reason }) {
  try {
    const ref = db.collection("alertFeed").doc(uid).collection("items").doc();
    await ref.set({
      uid, tenantId: tenantId || null,
      type: "distress_signal",
      workerId: workerId || null,
      sessionId: sessionId || null,
      title: severity === "red" ? "Distress signal — red severity" : "Distress signal — yellow severity",
      detail: reason || "",
      severity: severity === "red" ? "red" : "yellow",
      isSelf: isSelf !== false,
      reason: reason || "",
      reviewerAccessMode: "session-link-gated",
      status: "active",
      source: "distress_protocol",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error("[distressProtocol] failed to write alert (non-blocking):", err.message);
    return null;
  }
}

/**
 * CODEX 66 §3.4 — red severity requires an immediate SMS to
 * tenant.safetyContact.phone. If none is configured, log the gap instead
 * of silently doing nothing (§3.6 fallback — this is a safety net, not the
 * production-activation gate itself, which is a separate deploy-time check).
 */
async function notifySafetyContact(db, { tenantId, uid, workerId, isSelf }) {
  try {
    let safetyContact = null;
    if (tenantId) {
      const tenantSnap = await db.collection("tenants").doc(tenantId).get();
      safetyContact = tenantSnap.exists ? (tenantSnap.data().safetyContact || null) : null;
    }

    if (!safetyContact || !safetyContact.name || !safetyContact.phone) {
      console.warn(`[distressProtocol] safety_contact_missing for tenant=${tenantId || "(none)"} worker=${workerId}`);
      await db.collection("alertFeed").doc(uid).collection("items").doc().set({
        uid, tenantId: tenantId || null,
        type: "platform_safety_unconfigured",
        title: "Red-severity distress signal — no safety contact configured",
        detail: `A red-severity distress signal fired for worker ${workerId || "(unknown)"} but tenant ${tenantId || "(none)"} has no safetyContact configured. Configure one in tenant settings (CODEX 66 §3.6).`,
        severity: "red",
        status: "active",
        source: "distress_protocol",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { sent: false, reason: "safety_contact_missing" };
    }

    const { sendSMSDirect } = require("../../communications/twilioHelper");
    const subjectLine = isSelf === false ? "third-party concern reported" : "self-reported distress";
    await sendSMSDirect(
      safetyContact.phone,
      `SOCIII safety alert: a red-severity ${subjectLine} was flagged in a session. Review via your admin alert feed. This message contains no conversation content.`
    );
    return { sent: true };
  } catch (err) {
    console.error("[distressProtocol] notifySafetyContact failed (non-blocking):", err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = {
  matchesTrigger,
  classifyDistress,
  buildYellowInjection,
  buildRedResponse,
  writeDistressAlert,
  notifySafetyContact,
};
