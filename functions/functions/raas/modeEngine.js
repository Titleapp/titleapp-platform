/**
 * modeEngine.js — Mode detection + response annotation for modeAware workers
 *
 * 4 modes, priority order: Direct > Training > Operational > Advisory (default)
 *
 * Direct:      Verbatim sourcing, citation format, no inference. Safety-critical lookups.
 * Operational: Cited but not verbatim, inline attribution. Regulatory application.
 * Advisory:    Reasoning allowed, human escalation flags. General questions.
 * Training:    Socratic method, scenario-based, gap tracking. Study/checkride prep.
 *
 * Only Direct Mode announces itself. All other modes respond naturally.
 *
 * Exports: detectMode, buildModeInstruction, annotateModeResponse, DIRECT_KEYWORDS, TRAINING_KEYWORDS
 */

// ═══════════════════════════════════════════════════════════════
//  KEYWORD LISTS — deterministic, no AI classification needed
// ═══════════════════════════════════════════════════════════════

const DIRECT_KEYWORDS = [
  "checklist", "qrh", "limitations", "emergency", "abnormal", "memory item",
  "vmo", "vne", "max weight", "max speed", "max altitude", "max temp",
  "operating limit", "mmo", "v speeds", "v1", "vr", "v2", "vref",
  "maximum", "minimum", "never exceed",
];

const TRAINING_KEYWORDS = [
  "study", "checkride", "quiz me", "oral exam", "recurrent",
  "test me", "practice", "scenario", "prep", "flash card",
];

const OPERATIONAL_KEYWORDS = [
  "far ", "far.", "14 cfr", "opspec", "ops spec", "mel",
  "compliance", "procedure", "regulation", "regulatory",
  "sop", "amendment", "exemption", "waiver",
];

// ═══════════════════════════════════════════════════════════════
//  MODE DETECTION — keyword match, highest priority wins
// ═══════════════════════════════════════════════════════════════

/**
 * Detect which mode to activate based on user message content.
 * Priority: direct > training > operational > advisory (default)
 *
 * @param {string} message — the user's message
 * @param {object} [workerConfig] — worker record (checked for allowed modes)
 * @returns {"direct"|"operational"|"advisory"|"training"}
 */
function detectMode(message, workerConfig) {
  if (!message || typeof message !== "string") return "advisory";

  const lower = message.toLowerCase();
  const allowedModes = (workerConfig && Array.isArray(workerConfig.modes) && workerConfig.modes.length > 0)
    ? workerConfig.modes
    : ["direct", "operational", "advisory", "training"];

  // Priority 1: Direct — safety-critical lookups
  if (allowedModes.includes("direct")) {
    for (const kw of DIRECT_KEYWORDS) {
      if (lower.includes(kw)) return "direct";
    }
  }

  // Priority 2: Training — study/prep
  if (allowedModes.includes("training")) {
    for (const kw of TRAINING_KEYWORDS) {
      if (lower.includes(kw)) return "training";
    }
  }

  // Priority 3: Operational — regulatory application
  if (allowedModes.includes("operational")) {
    for (const kw of OPERATIONAL_KEYWORDS) {
      if (lower.includes(kw)) return "operational";
    }
  }

  // Default: Advisory
  return "advisory";
}

// ═══════════════════════════════════════════════════════════════
//  MODE INSTRUCTION — system prompt injection per mode
// ═══════════════════════════════════════════════════════════════

/**
 * Build a system prompt instruction string for the detected mode.
 *
 * @param {"direct"|"operational"|"advisory"|"training"} mode
 * @param {object} [workerConfig] — worker record for context
 * @returns {string} — instruction to inject into system prompt
 */
function buildModeInstruction(mode, workerConfig) {
  const groundUseNote = (workerConfig && workerConfig.groundUseOnly)
    ? "\n\nIMPORTANT: This tool is for ground use only — study, planning, and reference. It is not designed for use as a primary in-flight reference."
    : "";

  switch (mode) {
    case "direct":
      return `MODE: DIRECT — Verbatim Source Response

RULES:
- Return ONLY verbatim text from uploaded operator documents or baseline reference documents.
- If no matching document section exists, say: "I don't have a document source for that. Upload your [document type] in Settings for aircraft-specific answers."
- NEVER paraphrase, infer, or supplement. If it's not in the document, don't say it.
- Citation format: [Document Name, Section X.X, Revision X, Effective Date] — always include.
- If sourcing from baseline (not operator-uploaded): append "Generic reference document — not serial-number specific."
- If sourcing from public regulatory: cite as [FAR XX.XXX] or [AC XX-XX].
- Do NOT add opinions, recommendations, or interpretation.${groundUseNote}`;

    case "operational":
      return `MODE: OPERATIONAL — Regulatory Application

RULES:
- Cite sources inline but do not quote verbatim unless the user asks for exact text.
- Attribution format: "Per [source]..." or "According to [FAR/AC/OpSpec]..."
- You may apply regulatory text to the user's specific operational question.
- Flag when a question crosses into territory that requires operator-specific documentation.
- If the answer depends on operator-specific procedures, say so and recommend uploading documents.
- Do not provide legal interpretations — flag those for the user's aviation attorney or DPE.${groundUseNote}`;

    case "training":
      return `MODE: TRAINING — Socratic Study Method

RULES:
- Use the Socratic method: ask questions before giving answers.
- For checkride/oral exam prep: present scenarios and ask the user to work through them.
- Track knowledge gaps — if the user gets something wrong, note it and revisit later.
- Use progressive difficulty: start with fundamentals, build to edge cases.
- For quiz requests: present one question at a time, wait for the answer, then provide feedback.
- Include regulatory references (FAR, ACS, PTS) when relevant to ground the learning.
- Encourage the user — this is study, not evaluation.${groundUseNote}`;

    case "advisory":
    default:
      return `MODE: ADVISORY — General Guidance

RULES:
- You may reason, analyze, and provide recommendations.
- Flag when a question should be escalated to a human expert (DPE, mechanic, attorney, medical).
- Include appropriate caveats: "Based on general guidance..." or "This is not a substitute for..."
- If the question touches safety-critical territory, suggest switching to Direct Mode by asking for the specific limitation, checklist item, or procedure.
- You may reference industry best practices and conservative guidance.${groundUseNote}`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  RESPONSE ANNOTATION — post-process AI response
// ═══════════════════════════════════════════════════════════════

/**
 * Post-process the AI response based on mode.
 * Only Direct Mode announces itself. All others return as-is.
 *
 * @param {"direct"|"operational"|"advisory"|"training"} mode
 * @param {string} response — the AI's response text
 * @returns {string} — annotated response
 */
function annotateModeResponse(mode, response) {
  if (!response) return response;

  if (mode === "direct") {
    // Only Direct Mode self-identifies
    if (!response.startsWith("Direct Mode")) {
      return `**Direct Mode** — ${response}`;
    }
  }

  return response;
}

module.exports = {
  detectMode,
  buildModeInstruction,
  annotateModeResponse,
  DIRECT_KEYWORDS,
  TRAINING_KEYWORDS,
  OPERATIONAL_KEYWORDS,
};
