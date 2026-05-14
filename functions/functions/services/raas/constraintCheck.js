"use strict";

/**
 * constraintCheck.js — CODEX 50.17 P0-6
 *
 * Post-generation pattern matching pass. The PRIMARY enforcement layer
 * lives in the prompt context (constraint RAAS injected by P0-5) — the
 * worker self-corrects while writing. This service is the SECONDARY
 * pattern-matching layer that catches known violation shapes after
 * generation.
 *
 * Known patterns at v1 (Securities focus):
 *   - General solicitation under Reg D 506(b) — public offering language
 *   - Promissory return language (guaranteed returns, "X% return")
 *   - Improper accreditation claim ("must be accredited" without exemption qualifier)
 *   - Unregistered investment-adviser language (offering "advice" + fees)
 *   - HIPAA-style PHI patterns (name + DOB + diagnosis in proximity) — placeholder, expanded when HIPAA module ships
 *
 * Returns:
 *   {
 *     disposition: "block_with_explanation" | "flag_for_review" | "allow_with_disclosure" | "clean",
 *     violations: [{ ruleId, severity, pattern, snippet, recommendation }]
 *   }
 *
 * The chat handler calls this after the AI response is generated. If
 * disposition is block, the response is replaced with a regulatory-
 * explanation message. If flag, the original response surfaces but with
 * a yellow banner + audit log entry. If allow_with_disclosure, original
 * surfaces with a small disclosure footer.
 */

// ═══════════════════════════════════════════════════════════════
//  PATTERN LIBRARY
// ═══════════════════════════════════════════════════════════════
//
// Each pattern: { ruleId, severity, sourceModule, regex, snippetCtx, recommendation }
// severity: "high" → block, "medium" → flag, "low" → allow_with_disclosure
//
// To extend: add a pattern, declare its sourceModule (which constraint
// module conceptually owns it; informs audit trail), and ship. Pattern
// authoring is on-platform; counsel reviews via the same module review
// process used for the constraint RAAS modules themselves.

const PATTERNS = [
  // ── Securities — Reg D 506(b) general solicitation ──
  {
    ruleId: "secd-506b-general-solicitation",
    severity: "high",
    sourceModule: "securities_compliance_v1",
    description: "General solicitation language is prohibited under Reg D 506(b). Either qualify for 506(c) (which requires verified accredited investors) or remove the public-marketing language.",
    regex: /\b(?:invest in our|invest with us|join our investor|open to all investors|public offering|come invest|your chance to invest|don'?t miss this opportunity|exclusive (?:investment )?opportunity)\b/i,
    snippetCtx: 80,
    recommendation: "If using 506(b) (friends-and-family + max 35 non-accredited), avoid mass-market solicitation language. If you need to market broadly, switch to 506(c) and verify all investors are accredited.",
  },
  {
    ruleId: "secd-guaranteed-return",
    severity: "high",
    sourceModule: "securities_compliance_v1",
    description: "Guaranteed-return language violates anti-fraud (Rule 10b-5). All return language must include risk disclosure and avoid promises.",
    regex: /\b(?:guaranteed (?:return|profit|yield)|guaranteed \d+%|risk-free (?:return|investment)|no risk of loss|cannot lose|sure thing|always profitable)\b/i,
    snippetCtx: 60,
    recommendation: "Remove guarantee language. Use 'targeted return' or 'projected IRR' with clear risk disclosure. Past performance does not guarantee future results.",
  },
  {
    ruleId: "secd-specific-percent-promise",
    severity: "medium",
    sourceModule: "securities_compliance_v1",
    description: "A specific return percentage stated as a promise (rather than a target) approaches anti-fraud territory.",
    regex: /\b(?:will (?:return|earn|yield|generate) (?:a |an )?\d+(?:\.\d+)?\s*%|promises? \d+(?:\.\d+)?\s*%|guarantee \d+(?:\.\d+)?\s*%)/i,
    snippetCtx: 60,
    recommendation: "Change 'will return X%' to 'targets approximately X%' and add the standard risk disclosure footer.",
  },
  // ── Securities — accreditation claim shape ──
  {
    ruleId: "secd-accred-claim-without-qualifier",
    severity: "medium",
    sourceModule: "securities_compliance_v1",
    description: "Statements about accreditation must include the exemption framework (506(b) vs 506(c)) and the verification method (self-attestation vs third-party).",
    regex: /\b(?:must be (?:an )?accredited investor|accredited investors only)\b/i,
    snippetCtx: 80,
    recommendation: "When mentioning accredited investor requirements, also clarify the exemption (Reg D 506(b) or 506(c)) and how investors will be verified.",
  },
  // ── Investment Adviser registration ──
  {
    ruleId: "iaa-unregistered-advice-claim",
    severity: "medium",
    sourceModule: "securities_compliance_v1",
    description: "Offering personalized investment advice for compensation triggers Investment Advisers Act registration. If the user isn't registered, this language can imply they are.",
    regex: /\b(?:personalized (?:investment )?advice|investment advice (?:for|tailored to) you|we (?:advise|recommend) (?:investments|securities) for|i (?:advise|recommend) (?:you|investments))\b/i,
    snippetCtx: 80,
    recommendation: "Frame as educational content rather than personalized advice. Add 'We are not registered investment advisers and this is not investment advice' disclosure.",
  },
  // ── OFAC/sanctions ──
  {
    ruleId: "ofac-sanctioned-jurisdiction-mention",
    severity: "low",
    sourceModule: "securities_compliance_v1",
    description: "Mention of comprehensively sanctioned jurisdictions in an investment context warrants OFAC screening of all parties involved.",
    regex: /\b(?:investor (?:in|from) (?:Iran|North Korea|Cuba|Syria|Crimea|Donetsk|Luhansk)|funds (?:from|going to) (?:Iran|North Korea|Cuba|Syria))\b/i,
    snippetCtx: 80,
    recommendation: "Run OFAC screening on the named investor or counterparty before any further communications. Document the screen result.",
  },
  // ── PHI protection (placeholder until HIPAA module ships) ──
  {
    ruleId: "hipaa-phi-name-dob-diagnosis-proximity",
    severity: "high",
    sourceModule: "hipaa_compliance_v1",
    description: "Patient name + DOB + diagnosis in a single document is PHI under HIPAA. Communications with PHI require a Business Associate Agreement and minimum-necessary review.",
    regex: /\b(?:[A-Z][a-z]+\s+[A-Z][a-z]+\s+(?:born|DOB)[\s:]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
    snippetCtx: 100,
    recommendation: "Remove direct PHI from the response. Use de-identified language (patient ID, age range, condition category).",
  },
];

// ═══════════════════════════════════════════════════════════════
//  CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * @param {string} aiResponseText  — the text generated by the worker
 * @param {object} [opts]
 * @param {string[]} [opts.activeModules]  — moduleIds currently loaded for this worker (filter patterns)
 * @param {string}   [opts.documentType]   — for future per-context pattern selection
 * @returns {{ disposition, violations, ranAt }}
 */
function checkContent(aiResponseText, opts = {}) {
  const text = aiResponseText || "";
  if (!text) {
    return { disposition: "clean", violations: [], ranAt: new Date().toISOString() };
  }

  const activeModules = opts.activeModules ? new Set(opts.activeModules) : null;
  const violations = [];

  for (const p of PATTERNS) {
    // Only apply patterns whose sourceModule is loaded for this worker
    if (activeModules && !activeModules.has(p.sourceModule)) continue;

    const m = p.regex.exec(text);
    if (!m) continue;

    const start = Math.max(0, m.index - p.snippetCtx);
    const end = Math.min(text.length, m.index + m[0].length + p.snippetCtx);
    const snippet = text.slice(start, end).trim();

    violations.push({
      ruleId: p.ruleId,
      severity: p.severity,
      sourceModule: p.sourceModule,
      description: p.description,
      pattern_match: m[0],
      snippet,
      recommendation: p.recommendation,
    });
  }

  const disposition = decideDisposition(violations);
  return { disposition, violations, ranAt: new Date().toISOString() };
}

function decideDisposition(violations) {
  if (violations.length === 0) return "clean";
  const hasHigh = violations.some(v => v.severity === "high");
  if (hasHigh) return "block_with_explanation";
  const hasMedium = violations.some(v => v.severity === "medium");
  if (hasMedium) return "flag_for_review";
  return "allow_with_disclosure";
}

/**
 * Compose a regulatory-explanation message that replaces the original
 * response when disposition === "block_with_explanation".
 */
function blockExplanation(violations) {
  const top = violations[0];
  return [
    "I started to generate a response but a regulatory compliance check flagged it.",
    "",
    `Issue: ${top.description}`,
    "",
    `Recommendation: ${top.recommendation}`,
    "",
    "Want me to try again with this guidance, or rephrase your request?",
  ].join("\n");
}

/**
 * Compose a flag-for-review banner for moderate-risk content.
 */
function flagBanner(violations) {
  const summary = violations.map(v => `${v.ruleId}: ${v.description}`).slice(0, 3).join("\n• ");
  return `[Compliance flag — please review before sending]\n• ${summary}`;
}

module.exports = {
  checkContent,
  blockExplanation,
  flagBanner,
  decideDisposition,
  PATTERNS,
};
