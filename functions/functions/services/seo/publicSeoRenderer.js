// CODEX — public-page crawler visibility fix (2026-08-17).
//
// Problem: sociii.ai is a client-side SPA. The static index.html served for
// every route is an empty `<div id="root"></div>` shell. Crawlers that don't
// execute JavaScript (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) see
// nothing on the homepage, /marketplace, or /c/{slug} worker pages — the
// exact pages that describe the product to a prospect or investor doing due
// diligence. /docs already has a working fix (raw .md + llms.txt); this
// extends the same idea to the pages that actually drive discovery.
//
// Approach: fetch the CURRENT deployed index.html (so hashed asset filenames
// never go stale across frontend redeploys), inject real, route-specific
// title/description/body content into it, and return that — for every
// visitor, not just detected bots. React mounts via `createRoot(...).render()`
// (confirmed in apps/business/src/main.jsx), which fully replaces the
// contents of #root on load, so this is safe for real users: they see the
// crawlable content for an instant, then the real app takes over.

const ORIGIN_INDEX_URL = "https://sociii.ai/index.html";

const HOMEPAGE_COPY = {
  title: "SOCIII — Collaborative Intelligence · Participation",
  description:
    "SOCIII is a platform where people create, share, and earn from AI Digital Workers — rule-governed AI agents that run real business workflows (title search, aviation dispatch, veterinary practice management, accounting, HR, and more) with an append-only audit trail and explicit user approval before any action executes.",
  bodyHtml: `
    <main>
      <h1>SOCIII — Collaborative Intelligence · Participation</h1>
      <p>SOCIII is an open SDK and marketplace for <strong>Digital Workers</strong> — AI-governed
      services built by domain experts, billed by the platform, and accountable to a cryptographic
      audit trail.</p>
      <p>Each Digital Worker reads live business data, surfaces structured canvases (P&amp;L, deal
      summaries, property abstracts, flight logs), and proposes actions that a human must approve
      before anything is committed. Nothing executes silently.</p>
      <h2>What SOCIII offers</h2>
      <ul>
        <li>Rule-constrained Digital Workers for real estate title, aviation, veterinary practice
        management, education, HR, marketing, accounting, and legal/patent</li>
        <li>SOCIII Vault — an immutable personal or business asset record (Digital Trust Certificate)</li>
        <li>Shopify, Google Drive, Gmail, and aviation API integrations</li>
        <li>An MCP server for LLM-native worker discovery and invocation</li>
        <li>White-label client portals and multi-tenant workspace isolation</li>
      </ul>
      <p><a href="/marketplace">Browse the Digital Worker marketplace</a> ·
      <a href="/docs">Read the docs</a></p>
    </main>
  `,
};

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchOriginShell() {
  const resp = await fetch(ORIGIN_INDEX_URL, { headers: { "User-Agent": "SOCIII-internal-seo-renderer" } });
  if (!resp.ok) throw new Error(`origin index.html fetch failed: ${resp.status}`);
  return resp.text();
}

function injectIntoShell(shellHtml, { title, description, bodyHtml }) {
  let html = shellHtml;
  if (title) {
    html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`);
  }
  if (description) {
    html = html.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );
  }
  // Replace whatever's inside the root div, not just an empty/whitespace-only
  // div — index.html itself carries static homepage fallback content baked in
  // at build time (its own crawler-safety net for when this function is down),
  // so for any OTHER route the div is never actually empty and a match that
  // assumed emptiness would silently no-op, leaving the homepage content in
  // place. Matches up to the LAST </div> before </body> so nested divs inside
  // bodyHtml/the existing content don't truncate the match early.
  html = html.replace(
    /(<div id="root"[^>]*>)([\s\S]*)(<\/div>\s*<\/body>)/,
    (_m, open, _existing, close) => `${open}${bodyHtml}${close}`
  );
  return html;
}

function workerCatalogItemHtml(w) {
  const name = escapeHtml(w.name);
  const desc = escapeHtml(w.shortDescription);
  const href = `/c/${escapeHtml(w.slug)}`;
  return `<li><a href="${href}"><strong>${name}</strong></a> — ${desc}</li>`;
}

async function renderMarketplace(db) {
  const snap = await db
    .collection("digitalWorkers")
    .where("status", "in", ["live", "coming_soon"])
    .limit(250)
    .get();

  const workers = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((d) => d.internal_only !== true && (!d.visibility || d.visibility === "public"))
    .map((d) => ({
      slug: d.slug || d.id,
      name: d.display_name || d.name || d.id,
      shortDescription: d.short_description || d.headline || d.description || "",
    }));

  const listHtml = workers.length
    ? `<ul>${workers.map(workerCatalogItemHtml).join("\n")}</ul>`
    : "<p>New Digital Workers are being added regularly — check back soon.</p>";

  return {
    title: "Digital Worker Marketplace — SOCIII",
    description: `Browse ${workers.length} governed Digital Workers across real estate, aviation, veterinary, education, HR, accounting, and more — each with a published audit trail.`,
    bodyHtml: `
      <main>
        <h1>Digital Worker Marketplace</h1>
        <p>Governed, rule-constrained AI Digital Workers you can put to work today. Every worker
        proposes actions for your approval — nothing executes silently.</p>
        ${listHtml}
      </main>
    `,
  };
}

// Lightweight, crawler-only markdown -> HTML. Not a full renderer — good
// enough for semantic SEO content (headers/paragraphs/lists/links/bold/code),
// not pixel-perfect. Real users never see this; DocsShell.jsx renders the
// same .md properly client-side and takes over immediately on load.
function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inList = false;
  let inCodeBlock = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  const inline = (s) => escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => `<a href="${escapeHtml(href)}">${text}</a>`);
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim().startsWith("```")) { inCodeBlock = !inCodeBlock; if (!inCodeBlock) out.push("</pre>"); else out.push("<pre>"); continue; }
    if (inCodeBlock) { out.push(escapeHtml(line)); continue; }
    if (!line.trim()) { closeList(); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) { closeList(); const lvl = h[1].length; out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); continue; }
    if (/^[-*]\s+/.test(line)) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`); continue; }
    if (line.startsWith(">")) { closeList(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`); continue; }
    if (line.startsWith("|")) { closeList(); out.push(`<p>${inline(line.replace(/\|/g, " · ").trim())}</p>`); continue; }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

async function renderDocPage(slug) {
  let resp;
  try {
    resp = await fetch(`https://sociii.ai/docs/${slug}.md`, { headers: { "User-Agent": "SOCIII-internal-seo-renderer" } });
  } catch (e) {
    return null;
  }
  if (!resp.ok) return null;
  const md = await resp.text();
  const titleMatch = md.match(/^#\s+(.*)/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;
  // First non-empty, non-heading line makes a reasonable meta description.
  const descLine = md.split("\n").find((l, i) => l.trim() && !l.trim().startsWith("#") && i > 0);
  const description = (descLine || `${title} — SOCIII creator documentation.`).replace(/[*`>]/g, "").trim().slice(0, 300);
  return {
    title: `${title} — SOCIII Docs`,
    description,
    bodyHtml: `<main>${mdToHtml(md)}\n<p><a href="/docs">&larr; Back to all docs</a></p></main>`,
  };
}

// The bare /docs index isn't a <slug>.md file — it's its own React page
// (DocsIndex.jsx) listing every section. `/docs/**` in firebase.json's
// hosting rewrites doesn't reliably match the exact path with no trailing
// segment, so it needs its own explicit route here (and its own hosting
// rewrite) rather than falling through to renderDocPage.
const DOCS_INDEX_COPY = {
  title: "SOCIII Docs — Open SDK for Digital Workers",
  description:
    "Documentation for SOCIII — the open SDK and marketplace for Digital Workers. Build a worker in Claude Code, ship it via GitHub, list on sociii.ai, earn 75% of net revenue.",
  bodyHtml: `
    <main>
      <h1>SOCIII Docs</h1>
      <p>Documentation for SOCIII — the open SDK and marketplace for Digital Workers.</p>
      <h2>Get started</h2>
      <ul>
        <li><a href="/docs/what-is-sociii">What is SOCIII?</a></li>
        <li><a href="/docs/sandbox-walkthrough">Sandbox walkthrough</a></li>
        <li><a href="/docs/install">Install the tools</a></li>
        <li><a href="/docs/your-first-worker">Your first worker</a></li>
      </ul>
      <h2>The SDK</h2>
      <ul>
        <li><a href="/docs/sdk">SDK overview</a></li>
        <li><a href="/docs/worker-anatomy">Worker anatomy</a></li>
        <li><a href="/docs/intent-spec">Intent Spec</a></li>
        <li><a href="/docs/canvas-tabs">Canvas</a></li>
        <li><a href="/docs/raas">RAAS (Rules + AI)</a></li>
        <li><a href="/docs/audit-trail">Audit Trail</a></li>
        <li><a href="/docs/qa-001">QA-001 validator</a></li>
      </ul>
      <h2>Marketplace</h2>
      <ul>
        <li><a href="/docs/three-lanes">The three lanes</a></li>
        <li><a href="/docs/earnings">Earnings & payouts</a></li>
        <li><a href="/docs/creator-agreement">Creator Agreement</a></li>
        <li><a href="/docs/review-cycle">Review cycle</a></li>
      </ul>
      <h2>Reference</h2>
      <ul>
        <li><a href="/docs/api">API reference</a></li>
        <li><a href="/docs/glossary">Glossary</a></li>
      </ul>
    </main>
  `,
};

const WHITEPAPER_COPY = {
  title: "SOCIII Whitepaper — Governed AI Workers for Regulated Professions",
  description:
    "How SOCIII captures expert judgment into rule-governed AI workers with cryptographic audit trails. The multi-tier RAAS rules engine, no-code authoring, and why regulation is local.",
  bodyHtml: `
    <main>
      <h1>Governed AI Workers for Regulated Professions</h1>
      <p>SOCIII's whitepaper describes how the platform captures a domain expert's professional
      judgment into a rule-governed AI Digital Worker — one whose actions are constrained by a
      layered rules engine (RAAS) and sealed into a tamper-evident, append-only audit trail before
      anything executes.</p>
      <h2>What it covers</h2>
      <ul>
        <li>The RAAS rules engine — platform safety, platform operations, vertical (jurisdictional)
        baselines, workspace overlays, and per-transaction rules</li>
        <li>No-code worker authoring — how a domain expert's expertise becomes a working Digital
        Worker without writing the platform's infrastructure themselves</li>
        <li>Why regulation is local — jurisdictional rule composition instead of one-size-fits-all
        compliance</li>
        <li>The append-only audit trail and cryptographic anchoring model</li>
      </ul>
      <p><a href="/">&larr; Back to SOCIII</a> · <a href="/docs">Read the docs</a></p>
    </main>
  `,
};

const CREATORS_JOURNEY_COPY = {
  title: "Creator's Journey — Build a Digital Worker on SOCIII",
  description:
    "The step-by-step path from idea to a live, earning Digital Worker on SOCIII: discover, sign up, design with Alex, build in Claude Code, validate, ship, and earn 75% of net revenue.",
  bodyHtml: `
    <main>
      <h1>Creator's Journey</h1>
      <p>SOCIII is a marketplace for Digital Workers built by domain experts. You bring the
      expertise — the platform handles billing, hosting, marketplace listing, and the legal
      scaffolding. Creators earn 75% of net revenue on their workers.</p>
      <h2>The journey, step by step</h2>
      <ol>
        <li><strong>Discover SOCIII</strong> — read the whitepaper or ask Alex what SOCIII is</li>
        <li><strong>Sign up</strong> — accept the Creator Agreement and tell us about yourself</li>
        <li><strong>Design your worker with Alex</strong> — name, voice, intent, rules, and canvas
        before any code exists</li>
        <li><strong>Build your worker in Claude Code</strong> — fork the open SDK and author the
        worker's real files with Claude Code</li>
        <li><strong>Validate it works</strong> — run the QA-001 validator against your assertions</li>
        <li><strong>Get a shareable preview</strong> — a URL you can send a colleague before you ship</li>
        <li><strong>Ship it</strong> — open a pull request; CI runs the validator plus an AI reviewer</li>
        <li><strong>Your first customer</strong> — Forge Reviews subscribes and writes a structured
        first review</li>
        <li><strong>Earn</strong> — share your worker with your network and start earning</li>
      </ol>
      <p><a href="/docs/sandbox-walkthrough">Read the sandbox walkthrough &rarr;</a> ·
      <a href="/docs/your-first-worker">Read the terminal walkthrough &rarr;</a></p>
    </main>
  `,
};

const SANDBOX_WORKER_COPY = {
  title: "Worker Sandbox — Scope Your Digital Worker on SOCIII",
  description:
    "The pre-terminal half of building a Digital Worker: define what it does, its intent, its rules, and its canvas — before any code exists — then fork the open SDK to build it for real.",
  bodyHtml: `
    <main>
      <h1>Worker Sandbox</h1>
      <p>The Worker Sandbox is the guided, pre-terminal step in building a SOCIII Digital Worker.
      Before any code exists, you work through what your worker does, who it's for, what rules it
      always follows, and what the user sees in its canvas.</p>
      <h2>What the sandbox produces</h2>
      <ul>
        <li>An intent — what the worker does, who uses it, and what success looks like</li>
        <li>A first pass at its behavioral rules</li>
        <li>A canvas layout — the tabs a user sees when they open the worker</li>
      </ul>
      <p>Once scoped, the actual worker gets built by forking the
      <a href="https://github.com/SOCIII-Inc/sociii-sdk">open SDK</a> and building with Claude Code
      against it. <a href="/docs/your-first-worker">See Your first worker &rarr;</a></p>
      <p><a href="/docs/sandbox-walkthrough">Read the full sandbox walkthrough &rarr;</a></p>
    </main>
  `,
};

async function renderWorkerPage(db, slug) {
  const snap = await db.collection("digitalWorkers").doc(slug).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.internal_only === true || (d.visibility && d.visibility !== "public")) return null;

  const name = d.display_name || d.name || slug;
  const description = d.short_description || d.headline || d.description || "";
  const job = d.job || "";

  return {
    title: `${name} — SOCIII Digital Worker`,
    description: description || `${name} is a governed Digital Worker on SOCIII.`,
    bodyHtml: `
      <main>
        <h1>${escapeHtml(name)}</h1>
        <p>${escapeHtml(description)}</p>
        ${job ? `<h2>What it does</h2><p>${escapeHtml(job)}</p>` : ""}
        <p><a href="/marketplace">&larr; Back to the marketplace</a></p>
      </main>
    `,
  };
}

// Returns the full HTML string to send, or null if this path isn't one we
// enrich (caller should fall back to serving the plain SPA shell).
async function renderPublicPage(db, path) {
  let routeContent = null;

  if (path === "/" || path === "/index.html") {
    routeContent = HOMEPAGE_COPY;
  } else if (path === "/marketplace") {
    routeContent = await renderMarketplace(db);
  } else if (path.startsWith("/c/")) {
    const slug = path.slice(3).replace(/\/+$/, "");
    if (slug) routeContent = await renderWorkerPage(db, slug);
  } else if (path === "/docs" || path === "/docs/") {
    routeContent = DOCS_INDEX_COPY;
  } else if (path.startsWith("/docs/") && !path.endsWith(".md")) {
    // Generic — covers every /docs/<slug> page, including nested slugs like
    // /docs/workers/<worker-slug>, as long as a matching <slug>.md exists
    // under public/docs/. No per-page wiring needed for new docs pages.
    const slug = path.slice("/docs/".length).replace(/\/+$/, "");
    if (slug) routeContent = await renderDocPage(slug);
  } else if (path === "/whitepaper" || path === "/whitepaper/") {
    routeContent = WHITEPAPER_COPY;
  } else if (path === "/creators/journey" || path === "/creators/journey/") {
    routeContent = CREATORS_JOURNEY_COPY;
  } else if (path === "/sandbox/worker" || path === "/sandbox/worker/") {
    routeContent = SANDBOX_WORKER_COPY;
  }

  if (!routeContent) return null;

  const shell = await fetchOriginShell();
  return injectIntoShell(shell, routeContent);
}

module.exports = {
  renderPublicPage,
  injectIntoShell,
  fetchOriginShell,
  HOMEPAGE_COPY,
  DOCS_INDEX_COPY,
  WHITEPAPER_COPY,
  CREATORS_JOURNEY_COPY,
  SANDBOX_WORKER_COPY,
};
