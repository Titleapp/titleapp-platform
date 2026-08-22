#!/usr/bin/env node
/**
 * generateWorkerDocs.js — auto-generate a "How to use <Worker>" doc page for
 * every public Digital Worker in Firestore's `digitalWorkers` collection.
 *
 * Why: there's no user-facing instruction manual for individual workers
 * (Dana for MSR servicing, Elise for the DPP vertical, Max/Jordan/Ivy/Sage
 * for the platform Spine workers, etc.). Hand-writing one page per worker
 * doesn't scale and drifts out of sync with the catalog. This script derives
 * the page mechanically from the worker's own catalog metadata, so it can be
 * safely re-run any time the catalog changes.
 *
 * What it does NOT do: invent marketing copy. Every sentence is grounded in
 * a real field on the worker's Firestore doc (name, persona, description,
 * canvas tabs). If a field is missing, the doc says less — it doesn't guess.
 *
 * Eligibility filter is based on the same "is this worker publicly visible"
 * test already used by services/seo/publicSeoRenderer.js's renderMarketplace
 * (internal_only !== true, visibility public/unset, status live/coming_soon),
 * PLUS visibility "org-only" — those are demo/sales-tool workers (e.g. Dana
 * for MSR servicing, the nursing education suite, the real-estate title-suite
 * internals) shown to prospective vertical customers, and are meant to be
 * documented publicly even though the worker itself isn't in the general
 * marketplace listing. This does not change the worker's actual visibility
 * field — only whether a doc page gets generated for it.
 *
 * Slug convention: flat `worker-<worker-id>` under apps/business/public/docs/
 * — NOT a `docs/workers/<slug>` subdirectory. The client-side route regex in
 * App.jsx (`/^\/docs\/([a-z0-9][a-z0-9-]{0,80})\/?$/`) only matches a single
 * path segment; a nested slug would be invisible to real users clicking
 * through the docs site even though the SSR crawler path can fetch anything.
 * Flat slugs need zero route-regex changes and match the existing convention
 * of every other page under public/docs/.
 *
 * Usage:
 *   cd functions/functions
 *   node scripts/generateWorkerDocs.js            # writes doc files + wiring
 *   node scripts/generateWorkerDocs.js --dry-run   # logs what it would do
 */

"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const DRY_RUN = process.argv.includes("--dry-run");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "title-app-alpha",
  });
}
const db = admin.firestore();

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DOCS_DIR = path.join(REPO_ROOT, "apps", "business", "public", "docs");
const MANIFEST_PATH = path.join(
  REPO_ROOT, "apps", "business", "src", "pages", "docs", "workerDocsManifest.generated.js"
);
const SITEMAP_PATH = path.join(REPO_ROOT, "apps", "business", "public", "sitemap.xml");

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,74}$/;

function escapeMd(s) {
  return String(s || "").replace(/\r?\n/g, " ").trim();
}

function isEligible(id, data) {
  if (!SLUG_RE.test(id)) return false; // excludes workspace-scoped copies (ws_...) etc.
  if (data.internal_only === true) return false;
  // "org-only" visibility is used for the demo/sales-tool workers shown to
  // prospective vertical customers (e.g. msr-servicing-001/Dana, the nursing
  // education suite, the real-estate title-suite internals) — these are
  // intentionally public-facing sales tools, not private tenant data, so they
  // are eligible for a public doc page same as any "public" worker. Only
  // visibilities other than "public"/"org-only" (e.g. "workspace") stay
  // excluded, since those really are tenant-private. Unset visibility
  // defaults to public, same convention as renderMarketplace() in
  // publicSeoRenderer.js.
  if (data.visibility && data.visibility !== "public" && data.visibility !== "org-only") return false;
  // "live"/"coming_soon" covers public-marketplace workers; "active" covers
  // real, deployed, non-draft workers that haven't been marketplace-listed
  // yet (e.g. Elise / eu-battery-dpp-001). Excludes draft, waitlist, and
  // pending_review — those aren't usable enough yet to document.
  return ["live", "coming_soon", "active"].includes(data.status);
}

function genericPromptsFromTabs(tabs) {
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return ["What can you help me with?", "Show me what you've got so far."];
  }
  return tabs.slice(0, 3).map((t) => `Show me my ${(t.label || t.id || "").trim()}.`);
}

function buildMarkdown(id, data) {
  const name = data.display_name || data.name || id;
  const persona = data.persona_name || null;
  const heading = persona ? `${persona} (${name})` : name;
  const tagline = escapeMd(data.headline);
  const description = escapeMd(data.short_description || data.description || data.headline || "");
  const vertical = data.vertical || null;
  const canvasTabs = Array.isArray(data.canvasTabs) ? data.canvasTabs : [];
  const quickStart =
    data.quickStartPrompts || data.quickstartPrompts || data.quick_start_prompts || null;

  const introParts = [];
  if (persona) {
    introParts.push(
      `**${persona}** is ${name}${vertical ? `, SOCIII's Digital Worker for ${vertical.replace(/[_-]/g, " ")}` : ""}.`
    );
  } else {
    introParts.push(
      `**${name}** is a Digital Worker on SOCIII${vertical ? ` for ${vertical.replace(/[_-]/g, " ")}` : ""}.`
    );
  }
  if (description) introParts.push(description);
  else if (tagline) introParts.push(tagline);
  const intro = introParts.join(" ");

  const lines = [];
  lines.push(`# How to use ${heading}`);
  lines.push("");
  lines.push(intro);
  lines.push("");

  lines.push("## What you can ask");
  lines.push("");
  const prompts = Array.isArray(quickStart) && quickStart.length
    ? quickStart.map((p) => (typeof p === "string" ? p : p.prompt || p.text || "")).filter(Boolean)
    : genericPromptsFromTabs(canvasTabs);
  for (const p of prompts) lines.push(`- "${escapeMd(p)}"`);
  lines.push("");

  if (canvasTabs.length) {
    lines.push("## What each tab shows");
    lines.push("");
    const sorted = [...canvasTabs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const tab of sorted) {
      const label = tab.label || tab.id || "Untitled tab";
      lines.push(`### ${label}`);
      lines.push("");
      lines.push(`What ${label} does: this is ${heading}'s "${label}" view${tab.default ? " (the default view when you open the worker)" : ""}.`);
      lines.push("");
    }
  }

  lines.push("## Where this comes from");
  lines.push("");
  lines.push(
    `This page is generated from ${heading}'s catalog entry in SOCIII's worker registry, not hand-written — it reflects the worker's current name, description, and canvas tabs as published. ` +
    `[Open ${name} on the Marketplace →](/c/${id})`
  );
  lines.push("");
  lines.push("**[→ Back to all docs](/docs)**");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const snap = await db.collection("digitalWorkers").get();
  const eligible = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (isEligible(doc.id, data)) eligible.push({ id: doc.id, data });
  });
  eligible.sort((a, b) => a.id.localeCompare(b.id));

  console.log(`digitalWorkers total: ${snap.size}, eligible (public, live/coming_soon): ${eligible.length}`);

  const manifestEntries = [];
  const sitemapUrls = [];

  for (const { id, data } of eligible) {
    const slug = `worker-${id}`;
    const name = data.display_name || data.name || id;
    const md = buildMarkdown(id, data);
    const filePath = path.join(DOCS_DIR, `${slug}.md`);

    if (DRY_RUN) {
      console.log(`[dry-run] would write ${filePath} (${md.length} bytes)`);
    } else {
      fs.writeFileSync(filePath, md, "utf8");
    }

    const description = escapeMd(data.short_description || data.description || data.headline || `How to use ${name} on SOCIII.`).slice(0, 200);
    manifestEntries.push({ slug, title: `How to use ${name}`, description });
    sitemapUrls.push(slug);
  }

  // ---- Wire into docsManifest via a generated, re-runnable side file ----
  const manifestJs = [
    "// AUTO-GENERATED by functions/functions/scripts/generateWorkerDocs.js — do not hand-edit.",
    "// Re-run the script to regenerate after the digitalWorkers catalog changes.",
    "export const WORKER_DOCS_MANIFEST = " + JSON.stringify(manifestEntries, null, 2) + ";",
    "",
  ].join("\n");

  if (DRY_RUN) {
    console.log(`[dry-run] would write manifest with ${manifestEntries.length} entries to ${MANIFEST_PATH}`);
  } else {
    fs.writeFileSync(MANIFEST_PATH, manifestJs, "utf8");
  }

  // ---- Wire into sitemap.xml between markers (idempotent re-run) ----
  const sitemap = fs.readFileSync(SITEMAP_PATH, "utf8");
  const startMarker = "<!-- WORKER_DOCS_START (auto-generated by scripts/generateWorkerDocs.js) -->";
  const endMarker = "<!-- WORKER_DOCS_END -->";
  const block = [
    startMarker,
    ...sitemapUrls.map((slug) => [
      "  <url>",
      `    <loc>https://sociii.ai/docs/${slug}</loc>`,
      "    <changefreq>monthly</changefreq>",
      "    <priority>0.5</priority>",
      "  </url>",
    ].join("\n")),
    endMarker,
  ].join("\n");

  // NOTE: startMarker/endMarker contain regex metacharacters (parentheses,
  // a literal ".") that must be escaped before being dropped into a RegExp —
  // otherwise e.g. "(auto-generated...)" is parsed as a capture group and
  // the literal "(" "/" ")" characters are silently dropped from what's
  // required to match, so `.replace()` finds no match against the real file
  // and returns the string completely unchanged (no error, no visible
  // failure — the sitemap just silently stops updating on re-run).
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let newSitemap;
  if (sitemap.includes(startMarker) && sitemap.includes(endMarker)) {
    const re = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
    newSitemap = sitemap.replace(re, block);
  } else {
    newSitemap = sitemap.replace("</urlset>", `${block}\n</urlset>`);
  }

  if (DRY_RUN) {
    console.log(`[dry-run] would write ${sitemapUrls.length} worker doc URLs into ${SITEMAP_PATH}`);
  } else {
    fs.writeFileSync(SITEMAP_PATH, newSitemap, "utf8");
  }

  console.log(`Done. ${eligible.length} worker doc pages ${DRY_RUN ? "would be" : ""} generated.`);
  console.log("Sample slugs:", eligible.slice(0, 5).map((w) => `worker-${w.id}`).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
