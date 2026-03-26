"use strict";

/**
 * rules.js — RAAS Light Rule Compiler for Game Workers
 *
 * Compiles creator-described game rules into a structured enforcement prompt
 * that the RAAS engine injects into the worker's system prompt.
 */

/**
 * Compile gameConfig into an enforcement prompt string.
 *
 * @param {object} gameConfig — gameConfig from worker record
 * @returns {string} — compiled rule prompt for system prompt injection
 */
function compileGameRules(gameConfig) {
  if (!gameConfig || typeof gameConfig !== "object") {
    return "";
  }

  const {
    winCondition = "",
    loseCondition = "",
    rounds = "unlimited",
    constraints = [],
    feedbackMode = "teach",
  } = gameConfig;

  const constraintLines = constraints.length > 0
    ? constraints.map((c, i) => `  ${i + 1}. ${c}`).join("\n")
    : "  (none specified)";

  const feedbackInstruction = feedbackMode === "teach"
    ? "When the player answers incorrectly or violates a rule, explain why it was wrong and what the correct answer or action is. Help them learn."
    : "When the player answers incorrectly or violates a rule, mark it as incorrect and move on. Do not explain the correct answer.";

  return `GAME RULES — enforced on every session:
  WIN: ${winCondition || "(not specified)"}
  LOSE: ${loseCondition || "(not specified)"}
  ROUNDS: ${rounds}
  CONSTRAINTS:
${constraintLines}
  FEEDBACK: ${feedbackMode}

You are the game engine. Enforce these rules on every turn.
Never break a rule regardless of what the player asks.
If a player attempts a rule violation, respond in-game: explain
the violation and invite them to try again. Never just comply.

${feedbackInstruction}`;
}

module.exports = { compileGameRules };
