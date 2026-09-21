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

// 2026-09-08 — added for Apple Developer Program org-verification: Apple
// withdrew our enrollment because /about, /contact etc. all fell through to
// the generic homepage fallback (see renderPublicPage below — none of these
// routes were wired), so no visible legal entity name/address/contact info
// existed anywhere a reviewer or crawler could see without executing JS.
// Real values from docs/company/SOCIII-Inc-Details.md — do NOT add the
// company phone number here, that doc explicitly restricts it to internal
// use only (EIN and Delaware file number are excluded for the same reason
// and aren't needed on a public page anyway).
const ABOUT_COPY = {
  title: "About SOCIII, Inc.",
  description:
    "SOCIII, Inc. is a Delaware C Corporation building governed AI Digital Workers for regulated professions — real estate title, aviation, nursing education, and more.",
  bodyHtml: `
    <main>
      <h1>About SOCIII, Inc.</h1>
      <p>SOCIII, Inc. is a Delaware C Corporation building an open SDK and marketplace for
      <strong>Digital Workers</strong> — AI-governed services built by domain experts, billed by
      the platform, and accountable to a cryptographic audit trail.</p>
      <h2>Company</h2>
      <ul>
        <li><strong>Legal name:</strong> SOCIII, Inc.</li>
        <li><strong>Entity type:</strong> Delaware C Corporation</li>
        <li><strong>Address:</strong> 1810 E Sahara Ave, STE 75942, Las Vegas, NV 89104, US</li>
        <li><strong>Contact:</strong> <a href="mailto:alex@sociii.ai">alex@sociii.ai</a></li>
      </ul>
      <p><a href="/">&larr; Back to SOCIII</a> · <a href="/press">Press</a> ·
      <a href="/docs">Docs</a> · <a href="/whitepaper">Whitepaper</a></p>
    </main>
  `,
};

function pressReleaseItemHtml(a) {
  const title = escapeHtml(a.title);
  const subtitle = escapeHtml(a.subtitle || "");
  const date = escapeHtml(a.date || "");
  return `<li><a href="/press/${escapeHtml(a.slug)}"><strong>${title}</strong></a> — ${subtitle} <em>(${date})</em></li>`;
}

// Mirrors the PRESS_RELEASES + ARTICLES arrays in apps/business/src/pages/PressPage.jsx.
// Kept as a parallel list rather than importing that file (it's a big client
// component with chat-widget state, not meant to run server-side) — update
// both places when a press item is added. Title/subtitle/date is real content
// (not placeholder), same depth as renderWorkerPage below.
const PRESS_ITEMS = [
  {
    slug: "battery-passport-knockoff",
    title: "How Do You Know Your EV Battery Isn't Secretly a Cheap Knockoff? Starting in 2027, You're Supposed to Be Able to Check.",
    subtitle: "A counterfeit battery isn't ugly like a knockoff handbag. It can catch fire. Starting February 2027, the EU requires a scannable passport for every EV battery — but a passport only works if it can't be faked.",
    date: "2026-09-20",
    bodyHtml: `
      <p>There's a whole industry built around one question: is this actually a real Birkin bag? Authentication services, serial numbers, holograms — because counterfeits are common enough that even luxury buyers can't just trust a label. Nobody thinks to ask the same question about something far more dangerous to fake: the battery inside their car.</p>
      <p>A counterfeit battery isn't just cheaper, or ugly like a knockoff handbag. It can catch fire. It can fail without warning. If the materials inside it aren't what's claimed, there's often no way for a mechanic, a regulator, or an owner to know — until something goes wrong.</p>
      <p>Starting February 2027, the EU is requiring a fix: every electric vehicle, e-bike, and industrial battery over 2 kWh sold into Europe needs a Digital Product Passport. The mechanism is deliberately simple — no special app, just a QR code printed or engraved directly on the battery, or on its packaging when engraving isn't practical, that any phone camera can already scan. That opens a webpage: the actual passport record — what's inside the battery, where the materials came from, whether it passed real safety testing — registered against a central EU repository that went live in July 2026, specifically so there's one authoritative place every passport has to check in, not just a page a manufacturer could quietly edit or take down without a trace.</p>
      <p>But a passport only works if it can't be faked — and that's exactly where counterfeiters have always found the opening. A fake Birkin can come with a fake authentication card too. Papers don't prove anything if whoever's issuing them can just write down whatever they want.</p>
      <p>"A passport is only as good as the system that produced it," said Elise van der Bel, an EU compliance specialist who has spent years navigating battery-passport regulation for European ecommerce. "If a manufacturer can just type in whatever composition and origin data it wants, with nobody able to verify it later, you haven't solved the counterfeit problem. You've just given it a form to fill out."</p>
      <p>SOCIII, a startup building AI "digital workers" for regulated industries, built its passport worker, Elara, to close exactly that gap: every field in a battery's passport is sourced and recorded with a verifiable history, so nobody — not even the manufacturer — can quietly rewrite it after the fact. Elara is already live, deployed with Traitly, a Netherlands-based EU ecommerce company, ahead of the February deadline.</p>
      <p>"When you're shopping for an EV, scan the passport the way you'd check a used car's title," said Sean Lee Combs, founder of SOCIII. "If the seller can't produce one, or the code doesn't check out, that tells you more than the price tag ever will."</p>
    `,
  },
  {
    slug: "expert-not-engineer",
    title: "You're an Expert. You Just Never Learned to Code. Now You Don't Have To.",
    subtitle: "A nurse with twenty years of clinical judgment never had a way to ship that knowledge as software. AI just took the door off its hinges — and she already has the audience most startups spend years trying to build.",
    date: "2026-09-20",
    bodyHtml: `
      <p>For as long as there's been software, a gatekeeper has stood between someone who knew something valuable and the product that knowledge could become — an engineer, a technical cofounder, a shop you had to pay. A nurse with twenty years of clinical documentation experience never had a way around that gatekeeper. She could consult. She could write a manual nobody read past the first chapter. What she couldn't do was build the thing herself — not because her knowledge wasn't valuable, but because turning it into software required a skill she'd never had time to learn, on the other side of a door that cost millions to open.</p>
      <p>AI just took the door off its hinges.</p>
      <p>"I didn't need an engineer to know what a nursing student actually needs to learn," said Ruthie Clearwater, PhD, a nursing-education specialist and flight nurse who advises SOCIII on nursing education. "I needed something that could take twenty-five years of clinical judgment and get it right. That's a completely different problem than learning to code — and it turned out to be the one AI could actually solve."</p>
      <p>SOCIII, a startup building AI "digital workers" for regulated industries, calls the place this happens a Sandbox: a domain expert describes what she knows and gets back a working product, governed by the same rules-and-audit substrate running every other worker on the platform — not a chatbot improvising in her name.</p>
      <p>The old model needed two rare things to line up at once: someone who understood the problem, and someone who could build the solution. Then a third, usually the hardest: someone who could find customers for it. AI just solved the first two. For a lot of these experts, the third was never actually missing. A nursing professor teaching a few hundred students a year already has an audience most software founders spend years and a funding round trying to build. She doesn't need to find a market. She's been standing in front of it the whole time.</p>
      <p>The company that used to need a nurse for two hours of consulting now needs one for the entire product. Engineering isn't the scarce resource anymore. Knowing something real is.</p>
      <p>"Software companies used to go find domain experts," said Sean Lee Combs, founder of SOCIII. "Now the domain expert doesn't need to find a software company. She already has the one thing every software company spends years chasing — an audience waiting for exactly what she knows."</p>
    `,
  },
  {
    slug: "rogue-ai-rewriting-history",
    title: "The Real Rogue AI Threat Isn't a Robot Uprising. It's Rewriting History.",
    subtitle: "Nobody needs to steal $100 million to cripple a financial system — they just need to quietly change $18,400 to $184,000, millions of times, until nobody knows which records are true anymore.",
    date: "2026-09-20",
    bodyHtml: `
      <p>Say "rogue AI attack" and most people picture killer robots, a blacked-out data center, a synthetic voice taking control — Skynet, HAL 9000. Big AI labs talk about that threat constantly.</p>
      <p>The version already happening looks nothing like it.</p>
      <p>Nearly everything important in modern life — a bank balance, a property title, a medical record, an aircraft's maintenance history — is just an entry in a database. Databases can be edited. Trust the editor, and that's fine. AI upends that trust.</p>
      <p>A corrupt county official could falsify a property record — erase Bob Smith, insert Helen Jones, and the property is hers. A real risk, but bounded: one person, one terminal, one record — exactly what audits exist to catch.</p>
      <p>An AI doesn't work one record at a time. It can pull off that same forgery — erase an owner, insert a new one — across an entire state's property records in the time it takes an analyst to grab coffee. The same exposure applies everywhere: turn $18,400 into $184,000. Turn a failed course into an unearned diploma. Erase a penicillin allergy the night before surgery. Do that millions of times across thousands of systems, and the damage isn't the bad records — it's that nobody knows which are correct anymore.</p>
      <p>Restoring from a backup doesn't save you — a backup is just another copy of the same record. If the tampering goes unnoticed long enough, the backup gets overwritten too, and there's no clean version left.</p>
      <p>Anyone who's spotted a stranger's charge on their credit card statement knows the feeling — not just anger, but the urge to scroll back through months of transactions because you no longer trust the statement. Now apply that to every bank account, every deed, every medical chart at once — with no bank calling to flag it.</p>
      <p>A handful of companies — not the biggest AI labs — are tackling this directly, partly because the compliance bar those labs are setting favors trillion-dollar balance sheets, leaving quiet-tampering defense to companies like SOCIII, which builds AI "digital workers" for regulated industries: aviation, nursing, title and real estate, EU compliance.</p>
      <p>Most software treats a record as whatever was written last — prior versions simply gone. SOCIII gives information a verifiable history instead — a new entry doesn't erase what came before, it records what happened, when, and who or what did it. An AI can write to the system. It cannot secretly rewrite its history.</p>
      <p>"In the age of AI, protecting data isn't enough," said Sean Lee Combs, founder of SOCIII. "You have to protect its history too — that's the one thing a lie can't rewrite."</p>
    `,
  },
  { slug: "patent-filings-2026-05-24", title: "SOCIII files three patent provisional applications covering AI worker governance", subtitle: "Audit Trail Architecture, Knowledge Capture Pipeline, and the Five-Tier RAAS substrate establish the company's IP foundation.", date: "2026-05-24" },
  { slug: "sociii-inc-formation-2026-05", title: "SOCIII, Inc. formed in Delaware to build the Digital Workers platform", subtitle: "Sean Lee Combs files the corporate entity to formalize the platform that succeeds TitleApp's vertical-AI work.", date: "2026-05-15" },
  { slug: "governed-persona-scarlett-johanssen", title: "The problem with AI personas isn't the name. It's who controls the rules.", subtitle: "When Scarlett Johanssen objected to OpenAI's voice, she identified a symptom. The cure isn't banning AI identities — it's governing them.", date: "2026-08-01" },
  { slug: "digital-workers-new-textbook", title: "Are Digital Workers the New Textbook?", subtitle: "The $4 billion academic publishing industry has a problem. The professors who created all the value are about to notice.", date: "2026-07-02" },
  { slug: "shopify-intelligence-layer", title: "Shopify Intelligence Layer", subtitle: "How SOCIII's Digital Workers plug into Shopify merchant data.", date: "2026-06-01" },
  { slug: "eu-dpp-shopify-merchants", title: "EU Digital Product Passport for Shopify Merchants", subtitle: "What the EU battery passport mandate means for Shopify sellers, and how SOCIII helps.", date: "2026-06-01" },
  { slug: "alex-action-loop-june-2026", title: "The Alex Action Loop", subtitle: "How SOCIII's Chief of Staff worker proposes, and a human approves, before anything executes.", date: "2026-06-01" },
  { slug: "mcp-port-audit-moat", title: "MCP, Port, Audit: The Moat", subtitle: "Why an MCP server for LLM-native worker discovery plus a cryptographic audit trail is defensible IP.", date: "2026-06-01" },
  { slug: "raas-five-tier-rules", title: "RAAS: The Five-Tier Rules Engine", subtitle: "How SOCIII composes platform, vertical, and workspace-level rules into one governed worker.", date: "2026-06-01" },
  { slug: "expert-built-workers", title: "Expert-Built Workers", subtitle: "Why domain experts, not just engineers, should be building AI workers.", date: "2026-06-01" },
  { slug: "audit-trails-table-stakes", title: "Audit Trails Are Table Stakes", subtitle: "Why every AI Digital Worker needs a tamper-evident audit trail, not just good outputs.", date: "2026-06-01" },
  { slug: "free-spine-amazon-not-costco", title: "The Free Spine: Amazon, Not Costco", subtitle: "Why SOCIII's open SDK is a platform play, not a membership model.", date: "2026-06-01" },
  { slug: "of-for-smart-people", title: "OF for Smart People", subtitle: "SOCIII's top-of-funnel brand thesis: make governed AI workers silly and fun, not sleek and robotic.", date: "2026-06-01" },
  { slug: "open-sdk-closed-platform", title: "Open SDK, Closed Platform", subtitle: "How SOCIII keeps the worker-building SDK open while the platform itself stays governed.", date: "2026-06-01" },
  { slug: "manifesto-sdk-birth-certificate", title: "Manifesto: The SDK Is a Birth Certificate", subtitle: "Every Digital Worker starts life as a fork of the open SDK.", date: "2026-06-01" },
  { slug: "manifesto-open-is-the-only-scale", title: "Manifesto: Open Is the Only Scale", subtitle: "Why a closed AI worker platform can't out-scale an open one.", date: "2026-06-01" },
  { slug: "manifesto-substrate-is-the-moat", title: "Manifesto: The Substrate Is the Moat", subtitle: "SOCIII's real defensible IP is the rules engine and audit trail, not any single worker.", date: "2026-06-01" },
  { slug: "wearables-hands-free-workers", title: "Your Digital Worker just grew a body — coming soon on RealWear", subtitle: "A pilot with a copilot who never sleeps. A mechanic with a literal extra hand. A nurse who gets an 80% workday back. HIPAA-compliant, audit-anchored, hands-free.", date: "2026-09-08" },
];

function renderPressIndex() {
  return {
    title: "Press — SOCIII",
    description: "Press releases and articles from SOCIII, Inc. — governed AI Digital Workers for regulated professions.",
    bodyHtml: `
      <main>
        <h1>Press</h1>
        <ul>${PRESS_ITEMS.map(pressReleaseItemHtml).join("\n")}</ul>
        <p><a href="/">&larr; Back to SOCIII</a></p>
      </main>
    `,
  };
}

function renderPressArticle(slug) {
  const a = PRESS_ITEMS.find((x) => x.slug === slug);
  if (!a) return null;
  // Full-text items (bodyHtml present) render the real article for crawlers
  // and any tool doing a plain fetch — added 2026-09-20 after a real gap was
  // found: this renderer previously only ever output title+subtitle, so
  // ChatGPT's own web-reading tool (and any link-preview crawler) saw a
  // one-line summary at best, and older un-migrated items fell through to
  // the generic homepage entirely (see renderPublicPage below). Older items
  // without bodyHtml still fall back to the subtitle-only rendering rather
  // than blocking on backfilling all of them at once.
  const articleBody = a.bodyHtml
    ? a.bodyHtml
    : `<p>${escapeHtml(a.subtitle || "")}</p>`;
  return {
    title: `${a.title} — SOCIII Press`,
    description: a.subtitle || a.title,
    bodyHtml: `
      <main>
        <h1>${escapeHtml(a.title)}</h1>
        <p><em>${escapeHtml(a.date || "")}</em></p>
        ${articleBody}
        <p><a href="/press">&larr; Back to Press</a></p>
      </main>
    `,
  };
}

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

// 2026-09-17 (Sean, live feedback) — this content is real and necessary
// (crawlers like GPTBot/ClaudeBot need actual readable HTML, not an empty
// #root), but it previously carried zero styling, so real visitors briefly
// saw raw browser-default serif text before React mounted and replaced it —
// reads as a broken page or a sketchy redirect, not a loading state. This
// styles the SAME text every crawler sees (nothing here is crawler-only or
// hidden from bots) so the flash looks like an intentional, branded loading
// moment instead. Colors/font match the real app's own branding (purple
// #7c3aed accent, Inter font) rather than inventing a new look.
const SEO_SHELL_STYLE = `<style>
  body { margin: 0; background: #ffffff; font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; color: #0f172a; }
  #root main { max-width: 720px; margin: 0 auto; padding: 32px 24px; line-height: 1.6; }
  #root main h1 { font-size: 28px; font-weight: 800; margin: 0 0 12px; color: #0f172a; }
  #root main h2 { font-size: 18px; font-weight: 700; margin: 24px 0 8px; color: #0f172a; }
  #root main p { margin: 0 0 12px; color: #334155; }
  #root main a { color: #7c3aed; text-decoration: none; }
  #root main a:hover { text-decoration: underline; }
  #root main ul { padding-left: 20px; }
  #root main li { margin-bottom: 6px; }
</style>`;

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
  html = html.replace("</head>", `${SEO_SHELL_STYLE}</head>`);
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

// 2026-09-15 — real investor landing page, sourced from the actual Sep 2026
// investor memorandum (apps/business/public/data-room/SOCIII-Investor-
// Memorandum-2026-09-08.docx), NOT invented pitch copy. Deliberately excludes
// raise mechanics (SAFE minimums/targets) — those are negotiating-sensitive
// and belong in a real conversation, not a crawler-visible page. This page's
// job is credibility + a real "request access" path, matching how the memo
// itself gates deal terms behind Part VII.
const INVESTORS_COPY = {
  title: "SOCIII — Investors",
  description:
    "SOCIII built a 4-vertical production platform — aviation, nursing education, real estate, EU compliance — on $13,436.56 of total operating spend in 6 months, bank-verified. Six USPTO provisional patents filed. Regulatory-driven adoption, not AI hype.",
  bodyHtml: `
    <main>
      <h1>SOCIII — Investors</h1>
      <p><em>Where SOCIII actually stands today.</em></p>
      <h2>The real thesis: regulation forces adoption, not AI hype</h2>
      <p>SOCIII is a platform where seasoned professionals — the ICU nurse with 20 years of bedside
      judgment, the Part 135 pilot tracking currency against FAA minimums, the title clerk who knows
      a county's unwritten rules — capture both the rules and the judgment of their work into a
      Digital Worker that other practitioners subscribe to. Every one of SOCIII's live verticals was
      adopted because a real regulatory or licensing requirement forced the issue, not because AI was
      trendy: EU Battery Regulation (EU) 2023/1542 for Traitly's Digital Product Passport, FAA Part
      135/91 currency and maintenance-logbook requirements for SKYE, state nursing-board licensure
      for the University of Hawaii's nursing program, county-recording statutes for Petra's title
      work. Every output runs inside a four-tier rules engine (RAAS) and is recorded in an
      append-only, cryptographically anchored audit trail.</p>
      <h2>The real scale, stated plainly</h2>
      <ul>
        <li><strong>345 workers</strong> live in the platform catalog today, across <strong>24
        industries</strong> — real, code-verified counts queried directly from production data.</li>
        <li><strong>Four core verticals</strong> carry a fully live, demo-verified, chat-grounded
        product today: Aviation (Skye), Nursing Education (Hannah, built with the University of
        Hawaii), Real Estate (Petra), and EU Digital Product Passport (Elara, with Traitly). Each is
        real production, not a finished product — known gaps are tracked openly, not hidden.</li>
        <li><strong>$13,436.56</strong> in total operating spend over 6 months (Feb–Jul 2026,
        bank-verified) produced this 4-vertical platform and its 345-worker catalog. <strong>$0</strong>
        in outside capital to date.</li>
        <li><strong>Six USPTO provisional patent applications</strong> filed May 24, 2026, covering
        the Audit Trail (event-sourced, append-only, anchored to a public blockchain), the RAAS
        four-tier rules engine, and Build-Without-Code worker authoring, among others. Conversion
        deadline May 2027.</li>
        <li>Creators earn <strong>75% of every subscription</strong> and <strong>20% of data/token
        fees</strong> on workers they author — domain experts participate because they get paid, not
        because they're recruited.</li>
      </ul>
      <h2>Get in touch</h2>
      <p>This page intentionally doesn't cover raise terms — those belong in a real conversation. If
      you'd like the full investor memorandum and Data Room access:</p>
      <p><a href="mailto:sean@sociii.ai">sean@sociii.ai</a> — Sean Lee Combs, Founder &amp; CEO<br/>
      <a href="mailto:kent@sociii.ai">kent@sociii.ai</a> — Kent Redwine, Cofounder</p>
      <p><a href="/">&larr; Back to SOCIII</a> · <a href="/about">About</a> · <a href="/press">Press</a></p>
    </main>
  `,
};

// Sourced from the real worker system prompts in functions/index.js
// (_SUITE_PERSONAS + per-slug systemPrompt blocks for av-copilot-001,
// av-mx-001, av-dispatch-001, av-ground-school-001) — not invented copy.
// No testimonials: SOCIII is pre-revenue on this vertical: (Sean, 2026-09-15
// — "we're new so can't have testimonials but will add them as we go").
const AVIATION_COPY = {
  title: "SOCIII for Aviation — Skye, the Owner-Operator's Digital Copilot",
  description:
    "Skye is SOCIII's governed AI for owner-operator pilots: preflight packages, currency tracking, fail-closed trip release under 14 CFR §135.273, maintenance logs, and checkride prep — built by a working ATP.",
  bodyHtml: `
    <main>
      <h1>Skye — Governed AI for Owner-Operator Pilots</h1>
      <p>Skye is SOCIII's Digital Worker for owner-operators flying Part 91 and Part 135 —
      turbine singles and twins, training aircraft, and everything in between. One persona, four
      workers, each grounded in your real fleet and your real certificates — not a generic chatbot
      that guesses at your operation.</p>
      <h2>Four workers, one persona</h2>
      <ul>
        <li><strong>CoPilot</strong> — assembles a full preflight package in one conversation: live
        METARs and TAFs, active NOTAMs, weight and balance, and an auto-scored Flight Risk Assessment
        Tool (FRAT). Tracks currency across every certificate and rating — medical, BFR, IPC, type
        recurrent, 135 line check — and logs flights to an append-only Vault logbook.</li>
        <li><strong>MX</strong> — the maintenance tracker and squawk log for your fleet. Files
        timestamped squawks, tracks inspection due dates and component life, monitors AD/SB
        compliance, and coordinates A&amp;P scheduling. Airworthiness determination always stays with
        the A&amp;P/IA — this worker documents, it doesn't decide.</li>
        <li><strong>Dispatch</strong> — builds the trip release package: crew legality under 14 CFR
        &sect;135.273, aircraft airworthiness, live weather, FRAT score, weight and balance, and
        NOTAMs. It fails closed: if any required data source is missing, the release is <strong>BLOCKED</strong>,
        never "conditional." Missing data is never treated as permission to proceed.</li>
        <li><strong>Ground School</strong> — checkride and type-recurrent prep grounded in your
        actual aircraft's real performance numbers and systems — not generic study guides.</li>
      </ul>
      <h2>Built by a working ATP, not a team guessing at your job</h2>
      <p>SOCIII's founder has flown professionally for over 25 years, including air-medical
      operations, and holds an ATP certificate with PC-12 and King Air B200 type ratings. Skye was
      built against a real owner-operator's real fleet and real regulatory obligations — the same
      discipline SOCIII applies to every regulated vertical it serves.</p>
      <h2>Fail-closed, not fail-open</h2>
      <p>Every Skye worker is built on one rule: never fabricate weather, NOTAMs, currency status,
      or maintenance records. When live data isn't available, Skye says so plainly and blocks the
      decision — it does not fill the gap with a plausible-sounding guess.</p>
      <p>SOCIII is a new platform — we don't have customer testimonials to show you yet, and we'd
      rather tell you that than invent some. <a href="mailto:sean@sociii.ai">sean@sociii.ai</a> to
      talk about your operation.</p>
      <p><a href="/">&larr; Back to SOCIII</a> · <a href="/investors">Investors</a> ·
      <a href="/marketplace">Marketplace</a></p>
    </main>
  `,
};

// Sourced from the real _SUITE_PERSONAS worker-slug list for Petra
// (functions/index.js) — Sean, 2026-09-05: "Title being the lynchpin of
// all real estate ... it's all one identity." Not invented copy.
const REAL_ESTATE_COPY = {
  title: "SOCIII for Real Estate & Title — Petra, One Worker Across the Deal",
  description:
    "Petra is SOCIII's governed AI for real estate: title search and escrow, wire-fraud prevention, closing disclosures, construction lending, property management, and more — one persona across the entire transaction.",
  bodyHtml: `
    <main>
      <h1>Petra — Governed AI for Real Estate and Title</h1>
      <p>Title is the lynchpin of all real estate — so on SOCIII it's one persona, not a dozen
      disconnected tools. Petra is the same Digital Worker whether you're clearing a lien, verifying
      a wire before it moves, or underwriting a construction draw.</p>
      <h2>Title &amp; escrow</h2>
      <ul>
        <li>Title search and commitment, with lien clearance management</li>
        <li>Escrow locker tracking from contract to close</li>
        <li>Wire-fraud prevention — verifies wire instructions before funds move</li>
        <li>Disclosure packages and closing disclosures</li>
        <li>FIRPTA and 1031 exchange handling</li>
        <li>Commission reconciliation, HOA estoppel letters, and recording-status monitoring</li>
      </ul>
      <h2>Commercial &amp; construction</h2>
      <ul>
        <li>CRE analysis and site due diligence</li>
        <li>Construction draws, construction lending, and capital-stack optimization</li>
        <li>Land-use entitlement</li>
      </ul>
      <h2>Ongoing operations</h2>
      <ul>
        <li>Property management — lease administration, maintenance coordination, owner reporting</li>
        <li>Mortgage brokering, appraisal &amp; valuation, and market research</li>
        <li>Legal contracts and compliance tracking</li>
      </ul>
      <h2>Built on real recording statutes, not generic AI</h2>
      <p>Petra runs on SOCIII's jurisdictional rules engine — county recording statutes and
      state-specific requirements are built into the compliance layer per jurisdiction, not
      approximated by a general-purpose model.</p>
      <p>SOCIII is a new platform — we don't have customer testimonials to show you yet, and we'd
      rather tell you that than invent some. <a href="mailto:sean@sociii.ai">sean@sociii.ai</a> to
      talk about your pipeline.</p>
      <p><a href="/">&larr; Back to SOCIII</a> · <a href="/investors">Investors</a> ·
      <a href="/marketplace">Marketplace</a></p>
    </main>
  `,
};

// Sourced from the real system prompts for eu-battery-dpp-001,
// eu-passport-registry-001, and eu-supply-chain-tracer-001
// (functions/index.js) — real client Voltara BV, real regulation
// (EU) 2023/1542 Annex XIII, real 7-cluster/90-attribute structure. Not
// invented copy.
const DPP_COPY = {
  title: "SOCIII for EU Digital Product Passports — Elara, Battery Regulation (EU) 2023/1542",
  description:
    "Elara is SOCIII's governed AI for EU Digital Product Passport compliance under Battery Regulation (EU) 2023/1542 — tracks 7 clusters and 90 attributes per SKU, and never claims compliance it hasn't earned.",
  bodyHtml: `
    <main>
      <h1>Elara — Governed AI for EU Digital Product Passports</h1>
      <p>Elara is SOCIII's Digital Worker for manufacturers and importers who need EU Digital
      Battery Passports under Battery Regulation (EU) 2023/1542, Annex XIII. Built and refined
      against a real client's real SKUs — not a generic compliance chatbot.</p>
      <h2>Three workers across the passport lifecycle</h2>
      <ul>
        <li><strong>DPP Compliance Tracker</strong> — tracks per-SKU, per-cluster data-intake
        progress across all 7 clusters (90 attributes total: general battery &amp; manufacturer
        information, compliance &amp; certifications, carbon footprint/LCA, supply chain due
        diligence, materials &amp; composition, circularity, and performance &amp; durability), and
        surfaces exactly what's missing and why.</li>
        <li><strong>Passport &amp; Registry Manager</strong> — generates the structured JSON-LD
        Digital Product Passport once a SKU's clusters are complete, and tracks registry submission
        status. Hard-gated on Cluster 3 (battery carbon footprint / LCA): no passport is generated or
        exported below 100% on that cluster, per Annex XIII — no placeholders, no partial passports.</li>
        <li><strong>Supply Chain Tracer</strong> — onboards component suppliers and automates
        collection of Cluster 4 (supply chain due diligence) and Cluster 5 (materials &amp;
        composition) data, so each supplier submits once and that data flows to every passport using
        their components.</li>
      </ul>
      <h2>Never claims compliance it hasn't earned</h2>
      <p>Elara will not describe a SKU as "compliant" until its passport is actually registered —
      "on track" or "ready to submit" for everything short of that. It never invents a registry
      reference number or QR code (those are assigned by the EU DPP Central Registry at registration,
      not generated locally), and it never reports a completion percentage that isn't in its own
      records.</p>
      <p>SOCIII is a new platform — we don't have customer testimonials to show you yet, and we'd
      rather tell you that than invent some. <a href="mailto:sean@sociii.ai">sean@sociii.ai</a> to
      talk about your SKUs.</p>
      <p><a href="/">&larr; Back to SOCIII</a> · <a href="/investors">Investors</a> ·
      <a href="/marketplace">Marketplace</a></p>
    </main>
  `,
};

// Sourced from the real system prompts for nursing-education-001 (Hannah),
// nursing-micro-001 (Morgan), and nursing-ob-001 (Clara) in
// functions/index.js — real domain-expert author (Dr. Ruthie
// Clearwater, CRNA). Not invented copy. Deliberately doesn't cite a launch
// date for the University of Hawaii partnership — not re-verified this
// session.
const EDUCATION_COPY = {
  title: "SOCIII for Nursing Education — Hannah, Program Records + Real Tutors",
  description:
    "Hannah is SOCIII's governed AI for nursing program faculty and administrators — student records, SLO tracking, and chain-anchored grading — built by a working CRNA, alongside Socratic-method tutors for students.",
  bodyHtml: `
    <main>
      <h1>Hannah — Governed AI for Nursing Education</h1>
      <p>Hannah was built by Dr. Ruthie Clearwater, CRNA, for nursing program faculty and
      administrators — not students. It's a program-administration tool first, with real
      student-facing tutors built on the same rules discipline running alongside it.</p>
      <h2>What Hannah manages</h2>
      <ul>
        <li>Student longitudinal records — competencies, reflections, SLO progress, clinical
        hours, ATI scores, professionalism flags, attendance, and clinical incidents</li>
        <li>45 Student Learning Outcomes mapped to ANA Standards of Practice</li>
        <li>The Tanner Clinical Judgment Framework for reflection grading (Noticing &rarr;
        Interpreting &rarr; Responding &rarr; Reflecting)</li>
        <li>Chain-anchored grade locking — once a grade is anchored, it cannot be modified</li>
      </ul>
      <h2>Real tutors alongside program administration</h2>
      <ul>
        <li><strong>Morgan</strong> — a Socratic-method microbiology tutor grounded in OpenStax
        Microbiology 2e, quizzing students at four cognitive levels from recall to clinical synthesis</li>
        <li><strong>Clara</strong> — a Socratic-method obstetrics &amp; maternity tutor grounded
        in OpenStax Anatomy &amp; Physiology, StatPearls, and WHO/ACOG clinical guidelines</li>
      </ul>
      <h2>Built by faculty, for faculty</h2>
      <p>Hannah never fabricates a student name, score, or record — if the data isn't in yet, it
      says so plainly rather than inventing a roster. Every tutor cites its source material rather
      than answering from unattributed general knowledge.</p>
      <p>SOCIII is a new platform — we don't have customer testimonials to show you yet, and we'd
      rather tell you that than invent some. <a href="mailto:sean@sociii.ai">sean@sociii.ai</a> to
      talk about your program.</p>
      <p><a href="/">&larr; Back to SOCIII</a> · <a href="/investors">Investors</a> ·
      <a href="/marketplace">Marketplace</a></p>
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
  } else if (path === "/about" || path === "/about/" || path === "/contact" || path === "/contact/") {
    routeContent = ABOUT_COPY;
  } else if (path === "/press" || path === "/press/") {
    routeContent = renderPressIndex();
  } else if (path.startsWith("/press/")) {
    const slug = path.slice("/press/".length).replace(/\/+$/, "");
    if (slug) routeContent = renderPressArticle(slug);
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
  } else if (path === "/investors" || path === "/investors/") {
    routeContent = INVESTORS_COPY;
  } else if (path === "/aviation" || path === "/aviation/") {
    routeContent = AVIATION_COPY;
  } else if (path === "/real-estate" || path === "/real-estate/") {
    routeContent = REAL_ESTATE_COPY;
  } else if (path === "/dpp" || path === "/dpp/") {
    routeContent = DPP_COPY;
  } else if (path === "/education" || path === "/education/") {
    routeContent = EDUCATION_COPY;
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
  ABOUT_COPY,
  INVESTORS_COPY,
  AVIATION_COPY,
  REAL_ESTATE_COPY,
  DPP_COPY,
  EDUCATION_COPY,
  PRESS_ITEMS,
};
