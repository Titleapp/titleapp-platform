/**
 * workerColors.js — Category-based color schemes for workers (49.3)
 *
 * Green:  Finance/Accounting
 * Blue:   Aviation/Technical
 * Orange: Marketing/Content
 * Aqua:   Real Estate/Legal/Title & Escrow
 * Purple: Platform/Admin (default)
 */

const CATEGORY_COLORS = {
  finance:   { primary: "#059669", light: "#D1FAE5", accent: "#10b981" },
  aviation:  { primary: "#2563EB", light: "#DBEAFE", accent: "#3b82f6" },
  marketing: { primary: "#EA580C", light: "#FED7AA", accent: "#f97316" },
  realestate:{ primary: "#0891B2", light: "#CFFAFE", accent: "#06b6d4" },
  platform:  { primary: "#6B46C1", light: "#E9D5FF", accent: "#7c3aed" },
  auto:      { primary: "#0284c7", light: "#e0f2fe", accent: "#0ea5e9" },
  government:{ primary: "#059669", light: "#D1FAE5", accent: "#10b981" },
  web3:      { primary: "#7c3aed", light: "#ede9fe", accent: "#8b5cf6" },
};

// Slug prefix → category mapping
const SLUG_CATEGORY = {
  "platform-accounting": "finance",
  "platform-hr": "platform",
  "platform-marketing": "marketing",
  "control-center-pro": "platform",
  "alex-chief-of-staff": "platform",
  "chief-of-staff": "platform",
};

// Vertical name → category mapping (fallback)
const VERTICAL_CATEGORY = {
  "Aviation": "aviation",
  "Auto Dealer": "auto",
  "Real Estate": "realestate",
  "Real Estate Professional": "realestate",
  "Title & Escrow": "realestate",
  "Government": "government",
  "Web3": "web3",
  "Solar": "aviation",
  "Platform": "platform",
};

/**
 * Get color scheme for a worker by slug.
 * @param {string} workerSlug
 * @param {string} [vertical] — optional vertical fallback
 * @returns {{ primary: string, light: string, accent: string }}
 */
export function getWorkerColor(workerSlug, vertical) {
  // Direct slug match
  if (workerSlug && SLUG_CATEGORY[workerSlug]) {
    return CATEGORY_COLORS[SLUG_CATEGORY[workerSlug]];
  }

  // Prefix-based matching
  if (workerSlug) {
    if (workerSlug.startsWith("av-") || workerSlug.startsWith("copilot-")) return CATEGORY_COLORS.aviation;
    if (workerSlug.startsWith("esc-")) return CATEGORY_COLORS.realestate;
    if (workerSlug.startsWith("gov-")) return CATEGORY_COLORS.government;
    if (workerSlug.startsWith("w3-")) return CATEGORY_COLORS.web3;
    if (workerSlug.startsWith("auto-") || workerSlug.startsWith("car-")) return CATEGORY_COLORS.auto;
    if (workerSlug.startsWith("re-") || workerSlug.startsWith("cre-") || workerSlug.startsWith("ir-")) return CATEGORY_COLORS.realestate;
  }

  // Vertical fallback
  if (vertical && VERTICAL_CATEGORY[vertical]) {
    return CATEGORY_COLORS[VERTICAL_CATEGORY[vertical]];
  }

  // Default purple
  return CATEGORY_COLORS.platform;
}

export { CATEGORY_COLORS };
