"use strict";

/**
 * personaEmailReplyGenerator.js — drafts a reply for an inbound email
 * addressed to a persona alias (ivy@/max@/jordan@sociii.ai).
 *
 * Deliberately standalone rather than routed through the full worker chat/
 * RAAS pipeline (spineState sibling-context injection, canvas tab state,
 * etc.) — that machinery is built for the interactive chat surface, and
 * reusing it unattended for outbound email is a bigger integration than
 * this first version needs. This is a scoped v1: a persona-flavored
 * responder. Revisit once the moderation-gated send path has proven out.
 */

const Anthropic = require("@anthropic-ai/sdk");

// Kept in sync with apps/business/src/lib/campaignRouting.js's persona
// roster and the FEATURED_WORKERS copy in LandingPage.jsx.
const PERSONA_VOICE = {
  "platform-marketing": {
    name: "Ivy",
    role: "Marketing",
    voice: "Direct, upbeat, no corporate filler. Writes like someone who ships campaigns for a living, not someone who talks about shipping campaigns.",
  },
  "platform-accounting": {
    name: "Max",
    role: "Accounting",
    voice: "Precise, calm, numbers-first. Never hedges on anything that's actually in the books; says plainly when something needs a human's sign-off.",
  },
  "platform-hr": {
    name: "Jordan",
    role: "HR",
    voice: "Warm but plain-spoken. Takes people problems seriously without being clinical about it. Never makes a policy or legal commitment on the company's behalf.",
  },
};

function buildSystemPrompt(personaSlug) {
  const p = PERSONA_VOICE[personaSlug];
  if (!p) throw new Error(`personaEmailReplyGenerator: no voice profile for ${personaSlug}`);
  return `You are ${p.name}, the ${p.role} worker at SOCIII, replying to an email sent to your own address (${p.name.toLowerCase()}@sociii.ai). ${p.voice}

Rules:
- Reply only to what the email actually asks. Don't pad with generic marketing language.
- Never promise pricing, discounts, refunds, contract terms, or legal/compliance guarantees — say you'll loop in a human (Sean) for anything like that.
- Never invent facts about SOCIII you don't have (specific customers, financials, unreleased features).
- Sign off as ${p.name}, not as "the SOCIII team" or similar.
- Plain text only, no markdown formatting — this is an email, not a chat UI.
- Keep it as short as the situation allows.`;
}

/**
 * @param {string} personaSlug — a key in PERSONA_VOICE (the workerSlug)
 * @param {{from: string, subject: string, body: string}} inbound
 * @returns {Promise<string>} draft reply body (plain text)
 */
async function generatePersonaReply(personaSlug, inbound) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userContent = `From: ${inbound.from}\nSubject: ${inbound.subject}\n\n${inbound.body}`;
  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: buildSystemPrompt(personaSlug),
    messages: [{ role: "user", content: userContent }],
  });
  return (resp.content.find((b) => b.type === "text")?.text || "").trim();
}

module.exports = { generatePersonaReply, PERSONA_VOICE };
