/**
 * Vertical Registry — Single Source of Truth
 *
 * Every file that needs a vertical list imports from this file.
 * No hardcoding elsewhere. This is the law.
 *
 * Reference: docs/architecture/PLATFORM_ARCHITECTURE_v1.0.md Section 3.1
 */

const VERTICALS = {
  'aviation': {
    id: 'aviation',
    label: 'Aviation',
    emoji: '\u2708\uFE0F',
    catalogFile: 'aviation.json',
    firestorePrefix: 'av-',
    navItems: ['CoPilot EFB', 'Dispatch', 'Fleet Status', 'Crew', 'Safety'],
    defaultSort: 'top10',
  },
  'real-estate': {
    id: 'real-estate',
    label: 'Real Estate',
    emoji: '\uD83C\uDFE2',
    catalogFile: 'real-estate-development.json',
    firestorePrefix: 'w-',
    navItems: ['Deal Pipeline', 'Properties', 'Title & Escrow'],
    defaultSort: 'top10',
  },
  'auto-dealer': {
    id: 'auto-dealer',
    label: 'Auto Dealer',
    emoji: '\uD83D\uDE97',
    catalogFile: 'auto-dealer.json',
    firestorePrefix: 'ad-',
    navItems: ['Inventory', 'F&I', 'Service'],
    defaultSort: 'top10',
  },
  'solar': {
    id: 'solar',
    label: 'Solar',
    emoji: '\u2600\uFE0F',
    catalogFile: 'solar-energy.json',
    firestorePrefix: 'sol-',
    navItems: ['Leads', 'Permits', 'Monitoring'],
    defaultSort: 'top10',
  },
  'web3': {
    id: 'web3',
    label: 'Web3',
    emoji: '\uD83D\uDD17',
    catalogFile: 'web3.json',
    firestorePrefix: 'w3-',
    navItems: ['Tokens', 'Smart Contracts', 'Wallets'],
    defaultSort: 'top10',
  },
  'nursing': {
    id: 'nursing',
    label: 'Nursing',
    emoji: '\uD83C\uDFE5',
    catalogFile: null,            // future vertical
    firestorePrefix: 'nu-',
    navItems: [],
    defaultSort: 'top10',
  },
  'games': {
    id: 'games',
    label: 'Games',
    emoji: '\uD83C\uDFAE',
    catalogFile: null,            // future vertical
    firestorePrefix: 'gm-',
    navItems: [],
    defaultSort: 'top10',
  },
};

/**
 * Legacy alias map — normalizes historical values to canonical IDs.
 * Keys are lowercased for case-insensitive matching.
 */
const LEGACY_ALIASES = {
  // Auto dealer variants
  'auto_dealer': 'auto-dealer',
  'auto dealer': 'auto-dealer',
  'autodealer': 'auto-dealer',

  // Real estate variants
  'analyst': 'real-estate',
  'real_estate': 'real-estate',
  'real estate': 'real-estate',
  'real-estate-development': 'real-estate',
  'real estate development': 'real-estate',
  'realestate': 'real-estate',

  // Web3 variants
  'web3-projects': 'web3',
  'web3_projects': 'web3',

  // Solar variants
  'solar-energy': 'solar',
  'solar_energy': 'solar',

  // Nursing / Health variants
  'health-ems': 'nursing',
  'health_ems': 'nursing',
  'health': 'nursing',
  'ems': 'nursing',

  // Game variants
  'game-light': 'games',
  'game-regulated': 'games',
  'game': 'games',

  // Government (future)
  'gov': 'government',
};

/**
 * Normalize a vertical string to its canonical registry ID.
 * Handles legacy aliases, slug prefixes, and case insensitivity.
 *
 * @param {string} input — raw vertical value (slug, legacy name, or canonical ID)
 * @returns {string} — canonical vertical ID or 'other' if unrecognized
 */
function normalizeVertical(input) {
  if (!input) return 'other';
  const lower = String(input).toLowerCase().trim();

  // Direct match
  if (VERTICALS[lower]) return lower;

  // Legacy alias match
  if (LEGACY_ALIASES[lower]) return LEGACY_ALIASES[lower];

  // Prefix match — check if it's a worker slug
  for (const [id, vertical] of Object.entries(VERTICALS)) {
    if (lower.startsWith(vertical.firestorePrefix)) return id;
  }

  // Real estate has many slug prefixes not captured by a single firestorePrefix
  const rePrefixes = ['cre-', 'investor-', 'construction-', 'esc-', 'title-', 'property-', 'lease-', 'appraisal-'];
  for (const p of rePrefixes) {
    if (lower.startsWith(p)) return 'real-estate';
  }

  return 'other';
}

/**
 * Get the display label for a vertical.
 * @param {string} verticalId — canonical vertical ID
 * @returns {string}
 */
function getVerticalLabel(verticalId) {
  return VERTICALS[verticalId]?.label || 'Other';
}

/**
 * Get all vertical IDs that have a catalog file (live verticals).
 * @returns {string[]}
 */
function getLiveVerticalIds() {
  return Object.keys(VERTICALS).filter(id => VERTICALS[id].catalogFile !== null);
}

module.exports = {
  VERTICALS,
  LEGACY_ALIASES,
  normalizeVertical,
  getVerticalLabel,
  getLiveVerticalIds,
};
