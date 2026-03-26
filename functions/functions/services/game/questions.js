"use strict";

/**
 * questions.js — Question Generation from Vertical Rule Pack
 *
 * For RAAS Regulated game workers. Generates exam-style questions
 * from the vertical rule pack, not from creator memory. Uses Claude
 * to produce questions with correct answers and distractors.
 *
 * v1: Uses existing worker system prompt + vertical rule pack context.
 * Full dedicated question-generation pipeline is v2.
 */

const fs = require("fs");
const path = require("path");

/**
 * Load rule pack content for a vertical.
 * Reads from catalogs and rulesets directories.
 *
 * @param {string} vertical — vertical identifier
 * @returns {string} — concatenated rule pack text
 */
function loadRulePack(vertical) {
  const content = [];

  // Try catalog JSON
  const catalogPath = path.join(__dirname, "../alex/catalogs", `${vertical}.json`);
  if (fs.existsSync(catalogPath)) {
    try {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
      if (catalog.workers) {
        for (const w of catalog.workers) {
          if (w.tier1Compliance) content.push(...w.tier1Compliance);
          if (w.capabilitySummary) content.push(w.capabilitySummary);
        }
      }
    } catch (_) { /* skip */ }
  }

  // Try rulesets directory
  const rulesetsDir = path.join(__dirname, "../../raas/rulesets");
  if (fs.existsSync(rulesetsDir)) {
    try {
      const files = fs.readdirSync(rulesetsDir).filter(f => f.includes(vertical) && f.endsWith(".json"));
      for (const file of files) {
        const ruleset = JSON.parse(fs.readFileSync(path.join(rulesetsDir, file), "utf8"));
        if (ruleset.hard_stops) content.push(...ruleset.hard_stops.map(r => `${r.id}: ${r.label}`));
        if (ruleset.soft_flags) content.push(...ruleset.soft_flags.map(r => `${r.id}: ${r.label}`));
      }
    } catch (_) { /* skip */ }
  }

  return content.join("\n");
}

/**
 * Generate questions from a vertical rule pack using Claude.
 *
 * @param {object} opts
 * @param {object} opts.gameConfig — gameConfig with verticalRulePack + examScope
 * @param {string} [opts.rulePackContent] — pre-loaded rule pack content (optional)
 * @returns {Promise<{ questions: object[], generatedAt: string }>}
 */
async function generateQuestions({ gameConfig, rulePackContent }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic();

  const vertical = gameConfig.verticalRulePack || "general";
  const examScope = gameConfig.examScope || "general knowledge";
  const numQuestions = Math.min(typeof gameConfig.rounds === "number" ? gameConfig.rounds : 10, 100);
  const content = rulePackContent || loadRulePack(vertical);

  const systemPrompt = `You are TitleApp's question generator for regulated game workers. Generate exactly ${numQuestions} multiple-choice questions for the "${examScope}" exam scope in the "${vertical}" vertical.

Each question must:
- Be derived from the rule pack content provided, not from general knowledge
- Have exactly 1 correct answer and 3 plausible distractors
- Reference a specific rule or regulation where applicable
- Vary in difficulty (easy, medium, hard)

Return a JSON array of question objects. Each object:
{
  "id": "q_001",
  "topic": "topic area",
  "question": "the question text",
  "correctAnswer": "the correct answer",
  "distractors": ["wrong1", "wrong2", "wrong3"],
  "ruleReference": "rule or regulation cited",
  "difficulty": "easy|medium|hard"
}

Return ONLY the JSON array — no markdown, no explanation.`;

  const userMessage = content.trim()
    ? `Generate ${numQuestions} questions from this rule pack:\n\n${content.substring(0, 8000)}`
    : `Generate ${numQuestions} questions for the "${examScope}" exam in the "${vertical}" vertical. Use standard industry knowledge for this regulated domain.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4000,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0]?.text || "[]";
  let questions;
  try {
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (_) {
    console.warn("[game:questions] Failed to parse Claude response, returning empty");
    questions = [];
  }

  // Normalize IDs
  questions = questions.map((q, i) => ({
    id: q.id || `q_${String(i + 1).padStart(3, "0")}`,
    topic: q.topic || "",
    question: q.question || "",
    correctAnswer: q.correctAnswer || "",
    distractors: Array.isArray(q.distractors) ? q.distractors.slice(0, 3) : [],
    ruleReference: q.ruleReference || null,
    difficulty: q.difficulty || "medium",
  }));

  return { questions, generatedAt: new Date().toISOString() };
}

module.exports = { generateQuestions, loadRulePack };
