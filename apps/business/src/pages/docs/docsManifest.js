// Single source of truth for the /docs site navigation.
// Each section is a group in the left sidebar; pages are slugs that map to
// /docs/<slug> AND to /docs/<slug>.md (raw Markdown, served from public/docs).
//
// Adding a new page:
//   1. Drop the .md file into apps/business/public/docs/<slug>.md
//   2. Add the entry to the matching section below
//   3. Add the slug to apps/business/public/sitemap.xml

export const DOCS_MANIFEST = [
  {
    section: "Get started",
    pages: [
      { slug: "what-is-sociii", title: "What is SOCIII?", description: "The platform thesis, the marketplace, and why Digital Workers." },
      { slug: "install",        title: "Install the tools",  description: "Claude account, Claude Code, GitHub — what each one does." },
      { slug: "your-first-worker", title: "Your first worker", description: "From cloning the repo to your first PR — what the conversation with Claude Code looks like." },
    ],
  },
  {
    section: "The SDK",
    pages: [
      { slug: "sdk",          title: "SDK overview",         description: "What a worker is, what's in it, and how the platform binds it." },
      { slug: "worker-anatomy", title: "Worker anatomy",    description: "The six files every worker carries — catalog, intent, rules, fixtures, canvas tabs, README." },
      { slug: "intent-spec",  title: "Intent Spec",         description: "How to describe what success looks like before any code exists." },
      { slug: "canvas-tabs",  title: "Canvas",              description: "The right-panel surface — tabs, content types (text · structured · image · video · sequence), runtime content creation, and wearable render contexts." },
      { slug: "raas",         title: "RAAS (Rules + AI)",   description: "Five-tier rule hierarchy: platform safety · operations · vertical baselines (jurisdictional law) · workspace overlays (Studio Locker) · per-transaction rules." },
      { slug: "qa-001",       title: "QA-001 validator",    description: "How the platform checks your worker before it ships to the Marketplace." },
    ],
  },
  {
    section: "Marketplace",
    pages: [
      { slug: "three-lanes",  title: "The three lanes",     description: "Open fork · Marketplace 75/25 · Experimental — which one your worker lives in." },
      { slug: "earnings",     title: "Earnings & payouts",  description: "75/25 split, monthly payouts, billing units, refund mechanics." },
      { slug: "creator-agreement", title: "Creator Agreement", description: "What you're signing, what we promise, what we don't." },
      { slug: "review-cycle", title: "Review cycle",        description: "Forge Reviews, peer review, and the founder review tier." },
    ],
  },
  {
    section: "Reference",
    pages: [
      { slug: "api",          title: "API reference",       description: "Stable HTTP surface for worker authoring + runtime." },
      { slug: "glossary",     title: "Glossary",            description: "Worker · RAAS · DTC · Vault · Drive · Locker · Fellow · Lane." },
    ],
  },
];

export function findPage(slug) {
  for (const sec of DOCS_MANIFEST) {
    const p = sec.pages.find(p => p.slug === slug);
    if (p) return { ...p, section: sec.section };
  }
  return null;
}

export function adjacentPages(slug) {
  const flat = DOCS_MANIFEST.flatMap(s => s.pages);
  const idx = flat.findIndex(p => p.slug === slug);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
