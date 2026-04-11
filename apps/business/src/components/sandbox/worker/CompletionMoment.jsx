// CODEX 47.4 Phase B (T2) — Step Completion Moment renderer.
//
// Renders the exact step-complete Alex messages from CODEX 47.4 Part 4.
// These templates are TONE-CRITICAL — every word lands. Do not paraphrase.
//
// The "nobody else" weight is reserved for steps 3 (Knowledge), 6 (Test),
// and 9 (Grow & Revise) only. Used sparingly, it lands. Used everywhere,
// it means nothing.
//
// Variable substitution is intentionally minimal — only the values the
// backend buildCompletionContext actually emits.

import React, { useEffect, useState } from "react";
import { PURPLE } from "./workerSteps";

// ─── Templates (verbatim from CODEX 47.4 Part 4) ───────────────────────────

const TEMPLATES = {
  define: ({ workerName }) =>
    `That's ${workerName}. You just did the hardest part of this whole process — ` +
    `most people never get this clear on what they're building and who it's for. ` +
    `Everything from here is building out something you already understand. ` +
    `Let's make it look the part.`,

  design: ({ workerName, uxType, vertical }) =>
    `There it is. That's what your subscribers will see the moment they open ${workerName}. ` +
    `You chose ${uxType || "your UX type"} — that's exactly right for ${vertical}. ` +
    `It looks like a real product because it is one. Now let's fill it with something worth opening.`,

  // NOBODY ELSE moment
  knowledge: ({ workerName, vertical, documentCount }) =>
    `${documentCount || "0"} document${documentCount === 1 ? "" : "s"} ingested. ${workerName} now knows more about ${vertical} ` +
    `than most tools on the market — and this exact combination of knowledge doesn't exist anywhere else. ` +
    `You can't scrape this. You can't replicate it. This is your moat. Nobody else has built what you just built.`,

  rules: ({ workerName }) =>
    `Rules locked. I know exactly what ${workerName} will do, won't do, and when to escalate. ` +
    `That's not just compliance — that's the difference between a tool your subscribers trust and one ` +
    `they're nervous about. You just made ${workerName} trustworthy.`,

  tools: ({ workerName, connectedTools }) => {
    const list = Array.isArray(connectedTools) && connectedTools.length > 0
      ? connectedTools.map(t => typeof t === "string" ? t : t.name).join(", ")
      : "the tools you connected";
    return `${workerName} is connected. ${list}. Your worker isn't just smart — it can act. ` +
      `Most workers give advice. Yours can send the email, process the payment, and update the calendar. ` +
      `That's a different category.`;
  },

  // NOBODY ELSE moment — the AHA
  test: ({ workerName }) =>
    `I tried to break it. I pushed on the compliance boundaries, asked the questions your most difficult ` +
    `subscribers will ask, and tested the edge cases you hadn't thought of. ${workerName} held up. ` +
    `Not because you got lucky — because you built the rules right and loaded it with real knowledge. ` +
    `Most tools don't survive a test like that. Yours did. I'm your Chief of Staff. This is what I do — ` +
    `and ${workerName} is ready.`,

  preflight: ({ workerName, gatesPassed }) =>
    `All ${gatesPassed || 7} gates clear. You're verified, compliant, and your payout account is set. ` +
    `A lot of creators stall here — the paperwork feels like friction. You pushed through it. ` +
    `${workerName} is one step from being live.`,

  distribute: ({ workerName }) =>
    `${workerName} is live. That link is real. Anyone who opens it right now will meet your worker. ` +
    `You built something from a conversation and now it exists in the world. ` +
    `Now let's get it in front of the people who need it most — and they already know you.`,

  // NOBODY ELSE moment
  grow: ({ workerName }) =>
    `Your first subscriber just joined ${workerName}. They found it, read the description, and decided ` +
    `it was worth their time and money. That's a real vote of confidence — not from an algorithm, ` +
    `from a person who knows your work. Nobody built this for them before you did. Now let's get them ten more.`,
};

const NOBODY_ELSE_STEPS = new Set(["knowledge", "test", "grow"]);

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Renders an inline step-complete card with the Alex message + a single
 * forward-momentum CTA.
 *
 * @param {object} props
 * @param {object} props.context  — backend completionMessageContext
 *                                  { stepId, workerName, vertical, ... }
 * @param {string} props.nextStepLabel — human label of the next step
 * @param {() => void} props.onContinue — fires when creator clicks "Continue"
 * @param {() => void} [props.onDismiss] — optional dismiss handler
 */
export default function CompletionMoment({ context, nextStepLabel, onContinue, onDismiss }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Brief mount delay to give the canvas action (color sweep, pulse) a
    // moment to land before the message arrives.
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!context || !context.stepId) return null;

  const tpl = TEMPLATES[context.stepId];
  if (!tpl) return null;

  const isNobodyElse = NOBODY_ELSE_STEPS.has(context.stepId);
  const message = tpl(context);

  return (
    <div
      role="status"
      style={{
        background: isNobodyElse ? "#F3F0FF" : "#FFFFFF",
        border: `1px solid ${isNobodyElse ? PURPLE : "#E2E8F0"}`,
        borderLeft: `4px solid ${PURPLE}`,
        borderRadius: 8,
        padding: 18,
        margin: "16px 0",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 11, fontWeight: 700, color: PURPLE,
        textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: PURPLE }} />
        Step complete
        {isNobodyElse && <span style={{ marginLeft: 8, color: "#1a1a2e" }}>· Meaningful moment</span>}
      </div>

      <div style={{
        fontSize: 15, color: "#1a1a2e", lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}>
        {message}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {onContinue && (
          <button
            onClick={onContinue}
            style={{
              background: PURPLE,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 6,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {nextStepLabel ? `Continue to ${nextStepLabel}` : "Continue"}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: "transparent",
              color: "#64748B",
              border: "none",
              padding: "10px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export { TEMPLATES, NOBODY_ELSE_STEPS };
