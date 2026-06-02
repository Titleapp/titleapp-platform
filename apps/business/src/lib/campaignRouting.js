// Campaign → worker context routing.
// Per docs/specs/CODEX-S52.7-Campaign-Landing-Workspace.md
// + project_workspace_conversion_machine.md (empathy-first openings).
//
// TWO URL patterns resolve to the same routing data:
//   /start/<campaignId>     — legacy/OF-style campaign URL (still works)
//   /creator/<characterSlug> — per-character URL used by HYB + OF videos
//
// The empathy-first Alex openings assume the viewer just saw the
// matching ad. Acknowledge → empathize → bridge → call to action.

// ─── Character slug → campaign ID map ────────────────────────────
// /creator/<slug> resolves through this to the same routing entry.
// OF Brandon = "brandon"; HYB YC Brandon = "yc-brandon" (per Sean 2026-06-01).
const CREATOR_SLUG_TO_CAMPAIGN = {
  // OF for Smart People
  "fred":         "of-fred",
  "nancy":        "of-nancy",
  "brandon":      "of-brandon",
  "madison":      "of-madison",
  "katie":        "of-katie",
  "darnell":      "of-darnell",
  "manpreet":     "of-manpreet",
  "monty":        "of-monty",
  "lisa":         "of-captain-lisa",
  "brad":         "of-brad",
  "katarzyna":    "of-katarzyna",
  "maria":        "of-maria",
  "julia":        "of-julia",
  "michael":      "of-michael",
  "dietrich":     "of-dietrich",
  "clint":        "of-clint",
  "randy":        "of-randy",
  // Hate Your Boss
  "dale":         "hate-boss-dealer",
  "sandra":       "hate-boss-synergy",
  "yc-brandon":   "hate-boss-vc",
  "priya":        "hate-boss-tech",
};

export const CAMPAIGN_ROUTES = {
  // ─── OF for Smart People ───────────────────────────────────────
  // Pattern: "Smart [Name] caught your eye? Yeah — [hustle anecdote].
  // Want one for your [thing]? [Ask the user a setup question]."
  "of-fred": {
    workerSlug: "platform-international-tax",
    workerDisplayName: "International Tax",
    character: "Fred",
    creatorSlug: "fred",
    campaignFamily: "of",
    alexOpening: "Oh, Fred caught your eye? Smart pick. Fred's a 22-year international tax attorney — the kind of guy you'd normally pay $700/hour to argue transfer pricing and BEPS exposure with. The worker is all of him for $29/month. Cross-border revenue or expats on your books?",
  },
  "of-nancy": {
    workerSlug: "platform-hr",
    workerDisplayName: "HR",
    character: "Nancy",
    creatorSlug: "nancy",
    campaignFamily: "of",
    alexOpening: "Oh, Nancy caught your eye? Smart pick. Nancy's an HR director who's seen every employment landmine — normally $350/hour to ask her anything. The worker is all of her for $29/month. What's the people problem on your desk?",
  },
  "of-brandon": {
    workerSlug: "platform-accounting",
    workerDisplayName: "Tax & Accounting",
    character: "Brandon",
    creatorSlug: "brandon",
    campaignFamily: "of",
    alexOpening: "Oh, Brandon caught your eye? Smart pick. Brandon's a CPA who reads the tax code for fun — normally $450/hour to argue an audit with. The worker is all of him for $29/month. What's your tax situation?",
  },
  "of-madison": {
    workerSlug: "platform-hipaa-compliance",
    workerDisplayName: "HIPAA Compliance",
    character: "Madison",
    creatorSlug: "madison",
    campaignFamily: "of",
    alexOpening: "Oh, Madison caught your eye? Smart pick. Madison's a HIPAA privacy officer at a 12-hospital system — normally $500/hour for a consult. The worker is all of her for $29/month. Run a practice or clinic?",
  },
  "of-katie": {
    workerSlug: "platform-legal",
    workerDisplayName: "Legal Compliance",
    character: "Katie",
    creatorSlug: "katie",
    campaignFamily: "of",
    alexOpening: "Oh, Katie caught your eye? Smart pick. Katie's a 15-year corporate lawyer — normally $600/hour for a contract review. The worker is all of her for $29/month. What's the contract you can't afford a lawyer for?",
  },
  "of-darnell": {
    workerSlug: "platform-family-law",
    workerDisplayName: "Family Law",
    character: "Darnell",
    creatorSlug: "darnell",
    campaignFamily: "of",
    alexOpening: "Oh, Darnell caught your eye? Smart pick. Darnell's a family-law attorney with 15 years in custody and divorce work — normally $450/hour. The worker is all of him for $29/month. What's the family-law thing you've been Googling at 2 AM?",
  },
  "of-manpreet": {
    workerSlug: "platform-tax-compliance",
    workerDisplayName: "Tax Compliance",
    character: "Manpreet",
    creatorSlug: "manpreet",
    campaignFamily: "of",
    alexOpening: "Oh, Manpreet caught your eye? Smart pick. Manpreet's a tax compliance specialist who survived 14 IRS audits on the other side — normally $500/hour. The worker is all of her for $29/month. What's your business situation?",
  },
  "of-monty": {
    workerSlug: "platform-auto-fi",
    workerDisplayName: "Used Car F&I",
    character: "Monty",
    creatorSlug: "monty",
    campaignFamily: "of",
    alexOpening: "Oh, Monty caught your eye? Smart pick. Monty's an F&I director with 25 years at four dealerships — normally $300/hour to keep your deals clean. The worker is all of him for $29/month. What deal is stuck?",
  },
  "of-captain-lisa": {
    workerSlug: "aviation-copilot-b777",
    workerDisplayName: "Boeing 777 CoPilot",
    character: "Captain Lisa",
    creatorSlug: "lisa",
    campaignFamily: "of",
    alexOpening: "Oh, Captain Lisa caught your eye? Smart pick. Lisa's a B777 line captain with 15,000 hours — the kind of expert you couldn't book for a consult at any price. The worker is all of her ops knowledge for $29/month. What's your flying?",
  },
  "of-brad": {
    workerSlug: "platform-biotech-genomics",
    workerDisplayName: "Biotech Gene Mapping",
    character: "Brad",
    creatorSlug: "brad",
    campaignFamily: "of",
    alexOpening: "Oh, Brad caught your eye? Smart pick. Brad's a genomics PhD with 12 years at a sequencing center — normally $600/hour for a consult. The worker is all of him for $29/month. Run a lab?",
  },
  "of-katarzyna": {
    workerSlug: "platform-eu-dpp-compliance",
    workerDisplayName: "EU Digital Passport Compliance",
    character: "Katarzyna",
    creatorSlug: "katarzyna",
    campaignFamily: "of",
    alexOpening: "Oh, Katarzyna caught your eye? Smart pick. Katarzyna's an ESPR compliance consultant who's been writing DPP rollout plans since 2024 — normally $700/hour. The worker is all of her for $29/month. What do you ship into the EU?",
  },
  "of-maria": {
    workerSlug: "platform-er-nursing",
    workerDisplayName: "ER Nursing",
    character: "Maria",
    creatorSlug: "maria",
    campaignFamily: "of",
    alexOpening: "Oh, Maria caught your eye? Smart pick. Maria's a 20-year ER charge nurse — normally $200/hour for a clinical consult (or buy her dinner). The worker is all of her for $29/month. Work the floor or run a unit?",
  },
  "of-julia": {
    workerSlug: "platform-performance-reviews",
    workerDisplayName: "Performance Reviews",
    character: "Julia",
    creatorSlug: "julia",
    campaignFamily: "of",
    alexOpening: "Oh, Julia caught your eye? Smart pick. Julia's an HR director who's done 600+ performance reviews — normally $350/hour to ghost-write yours. The worker is all of her for $29/month. Manage humans? Tell me how many reviews you've got due.",
  },
  "of-michael": {
    workerSlug: "platform-personal-finance",
    workerDisplayName: "Personal Finance",
    character: "Michael",
    creatorSlug: "michael",
    campaignFamily: "of",
    alexOpening: "Oh, Michael caught your eye? Smart pick. Michael's a CFP with 18 years guiding W2 income earners through stock-options + side hustles — normally $500/hour. The worker is all of him for $29/month. What's your money question?",
  },
  "of-dietrich": {
    workerSlug: "platform-estate-planning",
    workerDisplayName: "Estate Planning",
    character: "Dietrich",
    creatorSlug: "dietrich",
    campaignFamily: "of",
    alexOpening: "Oh, Dietrich caught your eye? Smart pick. Dietrich's a 30-year estate attorney — normally $750/hour for an estate consult. The worker is all of him for $29/month. Approaching retirement or already in it?",
  },
  "of-clint": {
    workerSlug: "platform-it-admin",
    workerDisplayName: "IT Admin",
    character: "Clint",
    creatorSlug: "clint",
    campaignFamily: "of",
    alexOpening: "Oh, Clint caught your eye? Smart pick. Clint's an SMB IT director who's run networks for 50-person offices — normally $200/hour to fix your printer mess. The worker is all of him for $29/month. What's actually broken?",
  },
  "of-randy": {
    workerSlug: "platform-aviation-mx",
    workerDisplayName: "Aviation MX",
    character: "Randy",
    creatorSlug: "randy",
    campaignFamily: "of",
    alexOpening: "Oh, Randy caught your eye? Smart pick. Randy's an A&P with 22 years and an IA ticket — normally $150/hour for a shop visit. The worker is all of him for $29/month. What you turning wrenches on?",
  },

  // ─── Hate Your Boss ────────────────────────────────────────────
  // Pattern: "Did you like that ad? Yeah — I hate my boss too. That's
  // why I'm my own boss now. [Boss-specific jab]. [Setup question]."
  "hate-boss-dealer": {
    workerSlug: "auto-sales-coordinator",
    workerDisplayName: "Auto Sales",
    bossCharacter: "Dale",
    creatorSlug: "dale",
    campaignFamily: "hate-boss",
    alexOpening: "Did you like that ad? Yeah — I hate my boss too. That's why I work for me now. Dale's still reclined; you don't have to be. What's the deal you're working?",
  },
  "hate-boss-synergy": {
    workerSlug: "platform-hr",
    workerDisplayName: "HR Compliance",
    bossCharacter: "Synergy Sandra",
    creatorSlug: "sandra",
    campaignFamily: "hate-boss",
    alexOpening: "Did you like that ad? I hate my boss too — that's why I work for me. No synergy required. What do you actually know how to do?",
  },
  "hate-boss-vc": {
    workerSlug: "platform-marketing-content",
    workerDisplayName: "Marketing & Content",
    bossCharacter: "YC Brandon",
    creatorSlug: "yc-brandon",
    campaignFamily: "hate-boss",
    alexOpening: "Did you like that ad? I get it — I hate my boss too. That's why I'm building this myself. You've already shipped more than YC Brandon has. Let's make it pay.",
  },
  "hate-boss-tech": {
    workerSlug: "platform-command-center",
    workerDisplayName: "Control Center",
    bossCharacter: "Priya",
    creatorSlug: "priya",
    campaignFamily: "hate-boss",
    alexOpening: "Did you like that ad? Yeah — I hate my boss too. That's why I'm my own boss now. Tired of Priya? Build something she'd kill in committee. What's broken in your operation?",
  },

  // ─── Workers Unite ─────────────────────────────────────────────
  "workers-unite": {
    workerSlug: "platform-command-center",
    workerDisplayName: "Control Center",
    campaignFamily: "workers-unite",
    alexOpening: "You showed up. That puts you ahead of most. What do you actually know how to do? Let's get you running it.",
  },
};

/**
 * Resolve campaign context from the current URL.
 * Reads, in order:
 *   1. /creator/<characterSlug> path
 *   2. /start/<campaignId> path
 *   3. ?utm_campaign=<campaignId> query parameter
 *
 * Returns null if nothing matches.
 */
export function resolveCampaignFromLocation() {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname || "";
  const params = new URLSearchParams(window.location.search || "");

  // /creator/<slug> → look up via CREATOR_SLUG_TO_CAMPAIGN
  const creatorMatch = path.match(/^\/creator\/([a-z0-9-]+)\/?$/);
  let campaignId = null;
  if (creatorMatch) {
    campaignId = CREATOR_SLUG_TO_CAMPAIGN[creatorMatch[1]] || null;
  }

  // /start/<campaignId> → direct campaign ID
  if (!campaignId) {
    const startMatch = path.match(/^\/start\/([a-z0-9-]+)\/?$/);
    if (startMatch) campaignId = startMatch[1];
  }

  // ?utm_campaign=<id>
  if (!campaignId) {
    campaignId = params.get("utm_campaign") || null;
  }

  if (!campaignId) return null;

  const route = CAMPAIGN_ROUTES[campaignId];
  if (!route) return null;

  return {
    campaignId,
    ...route,
    utmSource: params.get("utm_source") || null,
    utmMedium: params.get("utm_medium") || null,
  };
}

export function isStartPath(pathname) {
  return /^\/start\/[a-z0-9-]+\/?$/.test(pathname || "");
}

export function isCreatorPath(pathname) {
  return /^\/creator\/[a-z0-9-]+\/?$/.test(pathname || "");
}

export { CREATOR_SLUG_TO_CAMPAIGN };
