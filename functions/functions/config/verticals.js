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
  'platform': {
    id: 'platform',
    label: 'Platform',
    emoji: '\u2699\uFE0F',
    catalogFile: 'platform.json',
    firestorePrefix: 'pl-',
    navItems: ['Accounting', 'HR', 'Marketing', 'Control Center'],
    defaultSort: 'top10',
  },
  'government': {
    id: 'government',
    label: 'Government',
    emoji: '\uD83C\uDFDB\uFE0F',
    catalogFile: 'government.json',
    firestorePrefix: 'gov-',
    navItems: ['Permitting', 'DMV', 'Inspector', 'Recorder'],
    defaultSort: 'top10',
  },
  'real-estate-professional': {
    id: 'real-estate-professional',
    label: 'Real Estate Pro',
    emoji: '\uD83C\uDFE2',
    catalogFile: 'real-estate-professional.json',
    firestorePrefix: 're-pro-',
    navItems: ['Listings', 'Compliance', 'Transactions'],
    defaultSort: 'top10',
  },
  'title-escrow': {
    id: 'title-escrow',
    label: 'Title & Escrow',
    emoji: '\uD83D\uDD10',
    catalogFile: null,
    firestorePrefix: 'esc-',
    navItems: ['Escrow', 'Title Search', 'Closing'],
    defaultSort: 'top10',
  },
  'construction': {
    id: 'construction',
    label: 'Construction',
    emoji: '\uD83D\uDEA7',
    catalogFile: null,
    firestorePrefix: 'con-',
    navItems: ['Project Management', 'Inspections', 'Permits'],
    defaultSort: 'top10',
  },
  'mortgage': {
    id: 'mortgage',
    label: 'Mortgage',
    emoji: '\uD83C\uDFE6',
    catalogFile: null,
    firestorePrefix: 'mtg-',
    navItems: ['Underwriting', 'Origination', 'Servicing'],
    defaultSort: 'top10',
  },
  'legal': {
    id: 'legal',
    label: 'Legal',
    emoji: '\u2696\uFE0F',
    catalogFile: null,
    firestorePrefix: 'leg-',
    navItems: ['Contracts', 'Compliance', 'Litigation'],
    defaultSort: 'top10',
  },
  'healthcare': {
    id: 'healthcare',
    label: 'Healthcare',
    emoji: '\uD83C\uDFE5',
    catalogFile: null,
    firestorePrefix: 'hc-',
    navItems: ['Protocols', 'Compliance', 'Training'],
    defaultSort: 'top10',
  },
  'investment': {
    id: 'investment',
    label: 'Investment',
    emoji: '\uD83D\uDCCA',
    catalogFile: null,
    firestorePrefix: 'inv-',
    navItems: ['Fund Admin', 'Reporting', 'Portfolio'],
    defaultSort: 'top10',
  },
  'relocation': {
    id: 'relocation',
    label: 'Relocation',
    emoji: '\uD83D\uDE9A',
    catalogFile: null,
    firestorePrefix: 'rel-',
    navItems: ['Moving', 'Coordination', 'Compliance'],
    defaultSort: 'top10',
  },
  'nursing': {
    id: 'nursing',
    label: 'Nursing',
    emoji: '\uD83D\uDC89',
    catalogFile: null,
    firestorePrefix: 'nu-',
    navItems: [],
    defaultSort: 'top10',
  },
  'games': {
    id: 'games',
    label: 'Games',
    emoji: '\uD83C\uDFAE',
    catalogFile: null,
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
  'automotive': 'auto-dealer',

  // Real estate development variants
  'analyst': 'real-estate',
  'real_estate': 'real-estate',
  'real estate': 'real-estate',
  'real-estate-development': 'real-estate',
  'real_estate_development': 'real-estate',
  'real estate development': 'real-estate',
  'realestate': 'real-estate',
  're_development': 'real-estate',
  're_sales': 'real-estate',

  // Real estate professional variants
  'real-estate-pro': 'real-estate-professional',
  'real_estate_professional': 'real-estate-professional',
  're-pro': 'real-estate-professional',

  // Title & Escrow variants
  'title_escrow': 'title-escrow',
  'title-and-escrow': 'title-escrow',
  'escrow': 'title-escrow',

  // Web3 variants
  'web3-projects': 'web3',
  'web3_projects': 'web3',

  // Solar variants
  'solar-energy': 'solar',
  'solar_energy': 'solar',
  'solar_vpp': 'solar',

  // Nursing / Health variants
  'health-ems': 'nursing',
  'health_ems': 'nursing',
  'health-ems-education': 'healthcare',
  'health_education': 'healthcare',

  // Healthcare variants
  'health': 'healthcare',
  'ems': 'healthcare',

  // Game variants
  'game-light': 'games',
  'game-regulated': 'games',
  'game': 'games',

  // Government variants
  'gov': 'government',
  'municipal': 'government',
  'civic': 'government',

  // Aviation variants
  'aviation_135': 'aviation',
  'pilot_suite': 'aviation',

  // Financial → investment
  'financial': 'investment',
  'finance': 'investment',

  // Property management → real-estate
  'property_management': 'real-estate',

  // Marketing → platform
  'marketing': 'platform',
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
