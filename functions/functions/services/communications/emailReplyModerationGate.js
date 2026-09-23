"use strict";

/**
 * emailReplyModerationGate.js — pre-send review for AI-drafted persona email
 * replies (ivy@/max@/jordan@sociii.ai). Per Sean, 2026-09-21: "if there is
 * some language that sounds problematic it needs the admin's approval to
 * send." Mirrors services/safety/distressProtocol.js's two-stage shape
 * (regex prefilter, then a classifier) and the same fail-closed rule: any
 * doubt holds the draft for human approval rather than sending it.
 *
 * This is a business-risk gate, not the clinical distress gate — it is
 * checking for content that could embarrass or expose the company (hostile
 * tone, promises/guarantees, legal or financial commitments, disclosure of
 * internal or another party's confidential info), not for user wellbeing.
 */

const Anthropic = require("@anthropic-ai/sdk");

// Stage 1 — cheap prefilter. A hit here doesn't guarantee escalation by
// itself but always routes to the Stage 2 classifier instead of a fast pass.
const TRIGGER_REGEX = new RegExp(
  "(guarantee|promise|lawsuit|legal action|sue|attorney|refund|" +
  "unacceptable|furious|disgusted|scam|fraud|breach|confidential|" +
  "\\bssn\\b|social security|password|api.?key|wire transfer|" +
  "\\b(idiot|stupid|incompetent)\\b)",
  "i"
);

function matchesTrigger(text) {
  return TRIGGER_REGEX.test(String(text || ""));
}

const CLASSIFIER_SYSTEM_PROMPT = `You are reviewing a draft email reply before it is sent automatically, unreviewed, from a company persona's real email address to a real external recipient.

Flag it (needsApproval: true) if the draft:
- makes a promise, guarantee, refund, discount, or commitment the company may not be able to honor
- uses hostile, defensive, sarcastic, or otherwise unprofessional tone
- discloses anything that reads as confidential, internal, or belonging to another customer
- contains a credential, password, API key, SSN, or other sensitive identifier
- makes a legal, contractual, or financial claim (pricing exceptions, liability, compliance guarantees)
- responds to an angry or escalated message in a way that could inflame it further

Reply ONLY with valid JSON, no prose outside the JSON object.

Output schema:
{
  "needsApproval": boolean,
  "reason": string,
  "category": "promise" | "tone" | "confidentiality" | "credentials" | "legal_financial" | "escalation" | "none"
}`;

/**
 * Stage 2 classifier. Fails closed: any error defaults to needsApproval:true.
 * A wrongly-held draft costs a few minutes of Sean's review; a wrongly-sent
 * one is an email a real person outside the company already has.
 *
 * @param {string} draftText — the AI-generated reply body about to be sent
 * @param {string} inboundText — the message it's replying to, for context
 * @param {string} personaName — e.g. "Ivy", for the classifier's context only
 */
async function classifyReplyForApproval(draftText, inboundText, personaName) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userContent = `Persona sending this reply: ${personaName}\n\nOriginal inbound message:\n${String(inboundText || "").slice(0, 2000)}\n\nDraft reply about to be sent:\n${String(draftText || "").slice(0, 2000)}`;

    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: CLASSIFIER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    const rawText = resp.content.find((b) => b.type === "text")?.text || "";
    let jsonText = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`classifier returned non-JSON: ${rawText.slice(0, 200)}`);
      parsed = JSON.parse(match[0]);
    }
    return {
      needsApproval: !!parsed.needsApproval,
      reason: String(parsed.reason || "").slice(0, 500),
      category: parsed.category || "none",
      classifierError: false,
    };
  } catch (err) {
    console.error("[emailReplyModerationGate] classifier failed — failing closed to needsApproval:", err.message);
    return {
      needsApproval: true,
      reason: "moderation_classifier_error — held to conservative path",
      category: "none",
      classifierError: true,
    };
  }
}

/**
 * Full gate: run Stage 1, then Stage 2 always (cheap enough, and Stage 1
 * alone is too crude to greenlight an unattended send — it only exists to
 * short-circuit is not used here for that reason; every draft gets the
 * classifier, Stage 1's match state is passed through for logging/audit).
 */
async function reviewDraftReply({ draftText, inboundText, personaName }) {
  const prefilterHit = matchesTrigger(draftText);
  const classification = await classifyReplyForApproval(draftText, inboundText, personaName);
  return { ...classification, prefilterHit };
}

module.exports = { matchesTrigger, classifyReplyForApproval, reviewDraftReply };
