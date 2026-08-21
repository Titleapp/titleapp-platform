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
  } else if (path.startsWith("/docs/") && !path.endsWith(".md")) {
    const slug = path.slice("/docs/".length).replace(/\/+$/, "");
    if (slug) routeContent = await renderDocPage(slug);
  }

  if (!routeContent) return null;

  const shell = await fetchOriginShell();
  return injectIntoShell(shell, routeContent);
}

module.exports = { renderPublicPage, injectIntoShell, fetchOriginShell, HOMEPAGE_COPY };
