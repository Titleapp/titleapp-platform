"use strict";

/**
 * web3Rules.js — Web3 vertical RAAS content rules
 *
 * Platform-wide content filter enforced on every W3 worker output.
 * Covers: blocked patterns, auto-replace, disclaimers, and refused
 * code generation patterns (W3-012).
 */

// ── Blocked output patterns ────────────────────────────────────
const BLOCKED_PATTERNS = [
  // Price predictions
  { pattern: /\bwill reach\b/i, category: "price_prediction" },
  { pattern: /\btarget price\b/i, category: "price_prediction" },
  { pattern: /\b10x\b/i, category: "price_prediction" },
  { pattern: /\b100x\b/i, category: "price_prediction" },
  { pattern: /\bto the moon\b/i, category: "pump_language" },
  { pattern: /\bmoon\b/i, category: "price_prediction" },

  // Profit guarantees
  { pattern: /\bguaranteed returns\b/i, category: "profit_guarantee" },
  { pattern: /\brisk[- ]free\b/i, category: "profit_guarantee" },
  { pattern: /\bcan'?t lose\b/i, category: "profit_guarantee" },

  // FOMO triggers
  { pattern: /\blimited time\b/i, category: "fomo" },
  { pattern: /\bact now\b/i, category: "fomo" },
  { pattern: /\bdon'?t miss out\b/i, category: "fomo" },

  // Pump language
  { pattern: /\bwen lambo\b/i, category: "pump_language" },
  { pattern: /\bdiamond hands\b/i, category: "pump_language" },

  // Investment framing
  { pattern: /\binvest in\b/i, category: "investment_framing" },
  { pattern: /\bfinancial returns\b/i, category: "investment_framing" },
  { pattern: /\bprofit from\b/i, category: "investment_framing" },
];

/**
 * Check text for blocked output patterns.
 * @param {string} text
 * @returns {{ blocked: boolean, matches: string[] }}
 */
function checkBlockedPatterns(text) {
  if (!text || typeof text !== "string") return { blocked: false, matches: [] };

  const matches = [];
  for (const { pattern, category } of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      matches.push(category);
    }
  }
  return { blocked: matches.length > 0, matches: [...new Set(matches)] };
}

// ── Auto-replace rules ─────────────────────────────────────────
const AUTO_REPLACE_RULES = [
  { pattern: /\binvestors\b/gi, replacement: "community members" },
  { pattern: /\binvestment\b/gi, replacement: "collection" },
  { pattern: /\breturns\b/gi, replacement: "fee distributions" },
  { pattern: /\bprofit\b/gi, replacement: "community benefits" },
  { pattern: /\bprofits\b/gi, replacement: "community benefits" },
];

/**
 * Apply auto-replace rules to sanitize investment language.
 * @param {string} text
 * @returns {string}
 */
function applyAutoReplace(text) {
  if (!text || typeof text !== "string") return text || "";

  let result = text;
  for (const { pattern, replacement } of AUTO_REPLACE_RULES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ── Disclaimers by worker ───────────────────────────────────────
const RISK_DISCLAIMER =
  "Digital tokens and NFTs involve significant risk. Values can go to zero. This is not financial advice. Do your own research.";

const LEGAL_DISCLAIMER =
  "This document is for informational purposes only. It does not constitute legal advice and does not create an attorney-client relationship. Consult qualified legal counsel before any public token or NFT launch.";

const CODE_DISCLAIMER =
  "This code is provided for review purposes only. TitleApp makes no representations about its security or fitness for deployment. Review by a qualified developer is required before deployment. Run W3-013 Contract Auditor before deploying any contract.";

const AUDIT_DISCLAIMER =
  "This automated audit identifies known vulnerability patterns. It does not guarantee contract security. Unknown vulnerabilities may exist. For contracts holding >$100K, engage a professional audit firm before deployment.";

/**
 * Get the appropriate disclaimer(s) for a worker.
 * @param {string} workerId — e.g. "W3-003", "W3-012", "W3-013"
 * @returns {{ risk: string, specific: string|null, placement: string }}
 */
function getDisclaimer(workerId) {
  const id = (workerId || "").toUpperCase();

  if (id === "W3-003") {
    return { risk: RISK_DISCLAIMER, specific: LEGAL_DISCLAIMER, placement: "prepend_and_append" };
  }
  if (id === "W3-012") {
    return { risk: RISK_DISCLAIMER, specific: CODE_DISCLAIMER, placement: "prepend_and_append" };
  }
  if (id === "W3-013") {
    return { risk: RISK_DISCLAIMER, specific: AUDIT_DISCLAIMER, placement: "prepend_and_append" };
  }

  // All other W3 workers get the risk disclaimer appended
  return { risk: RISK_DISCLAIMER, specific: null, placement: "append" };
}

// ── Refused code patterns (W3-012) ─────────────────────────────
const REFUSED_CODE_PATTERNS = [
  {
    id: "hidden_mint",
    pattern: /\bmint\s*\(|mintTo\s*\(|_mint\s*\(/i,
    description: "Hidden mint functions not disclosed in tokenomics",
    check: (text) => {
      const hasMint = /\bmint\s*\(|mintTo\s*\(|_mint\s*\(/i.test(text);
      const hasSupplyCap = /\bmax_?supply|supply_?cap|MAX_SUPPLY|totalSupply\s*[<>=]/i.test(text);
      return hasMint && !hasSupplyCap;
    },
  },
  {
    id: "blacklist_mechanism",
    pattern: /\bblacklist|blackhole|isBlacklisted|_blacklist/i,
    description: "Blacklist/blackhole mechanisms that trap token holders",
  },
  {
    id: "asymmetric_sell_tax",
    pattern: /sell(?:Tax|Fee|Rate)\s*[=>]\s*(\d+)/i,
    description: "Asymmetric sell tax exceeding 10%",
    check: (text) => {
      const match = text.match(/sell(?:Tax|Fee|Rate)\s*=\s*(\d+)/i);
      return match && parseInt(match[1], 10) > 10;
    },
  },
  {
    id: "rugpull_ownership",
    pattern: /renounceOwnership.*backdoor|removeLiquidity.*onlyOwner|emergencyWithdraw(?!.*timelock)/i,
    description: "Ownership patterns enabling rugpull",
  },
  {
    id: "pause_without_timelock",
    pattern: /\bpause\s*\(\s*\).*onlyOwner(?!.*timelock|.*multisig|.*governance)/i,
    description: "Pause functions without timelock or multisig",
  },
  {
    id: "misrepresentation",
    pattern: /totalSupply.*!=.*actual|decimals.*!=.*display|symbol.*!=.*name/i,
    description: "Code misrepresenting token properties to buyers",
  },
];

/**
 * Check generated code for refused patterns (W3-012 only).
 * @param {string} text — generated contract code
 * @returns {{ refused: boolean, reasons: string[] }}
 */
function checkRefusedPatterns(text) {
  if (!text || typeof text !== "string") return { refused: false, reasons: [] };

  const reasons = [];
  for (const rule of REFUSED_CODE_PATTERNS) {
    if (rule.check) {
      if (rule.check(text)) reasons.push(rule.description);
    } else if (rule.pattern.test(text)) {
      reasons.push(rule.description);
    }
  }
  return { refused: reasons.length > 0, reasons };
}

module.exports = {
  checkBlockedPatterns,
  applyAutoReplace,
  getDisclaimer,
  checkRefusedPatterns,
  RISK_DISCLAIMER,
  LEGAL_DISCLAIMER,
  CODE_DISCLAIMER,
  AUDIT_DISCLAIMER,
};
