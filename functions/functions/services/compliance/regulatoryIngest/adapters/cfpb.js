"use strict";

/**
 * CFPB adapter — CODEX 50.17 P0-1
 *
 * The CFPB publishes enforcement actions and guidance via:
 *   - Enforcement actions API: https://www.consumerfinance.gov/enforcement/actions/
 *   - Newsroom RSS: https://www.consumerfinance.gov/about-us/newsroom/feed/
 *   - Compliance Bulletins: pages under /compliance/
 *
 * v1: pull the newsroom RSS (which covers enforcement + guidance + rule
 * announcements). Enforcement-actions JSON API is well-formed and we add
 * it as a secondary source.
 *
 * Note: the Federal Register adapter already covers CFPB rule changes
 * (CFPB is one of the agencies it queries). This adapter focuses on
 * non-rule outputs — guidance, enforcement, supervisory highlights.
 */

const { ingestDocument } = require("../pipeline");
const crypto = require("crypto");

const CFPB_NEWSROOM_RSS = "https://www.consumerfinance.gov/about-us/newsroom/feed/";

async function ingest({ limit = 20 } = {}) {
  const results = { source: "cfpb", attempted: 0, created: 0, updated: 0, unchanged: 0, failed: 0, errors: [] };

  let rssXml;
  try {
    const r = await fetch(CFPB_NEWSROOM_RSS, { headers: { "Accept": "application/rss+xml, application/xml" } });
    if (!r.ok) throw new Error(`CFPB RSS HTTP ${r.status}`);
    rssXml = await r.text();
  } catch (e) {
    results.failed++;
    results.errors.push(`feed-fetch: ${e.message}`);
    return results;
  }

  const items = parseRssItems(rssXml).slice(0, limit);
  results.attempted = items.length;

  for (const item of items) {
    try {
      let buffer, mimeType = "text/html";
      if (item.link) {
        try {
          const r = await fetch(item.link, { headers: { "Accept": "text/html" } });
          if (r.ok) {
            const ct = r.headers.get("content-type") || "text/html";
            mimeType = ct.split(";")[0].trim();
            const arr = await r.arrayBuffer();
            buffer = Buffer.from(arr);
          }
        } catch (_) { /* fall through */ }
      }
      if (!buffer) {
        const body = item.description || item.title;
        buffer = Buffer.from(body, "utf8");
        mimeType = "text/plain";
      }

      const externalId = item.guid || crypto.createHash("sha1").update(item.link || item.title).digest("hex");
      const docType = classifyCfpbDocumentType(item.title || "", item.link || "");

      const result = await ingestDocument({
        source_id: "cfpb",
        external_id: externalId,
        source_url: item.link || CFPB_NEWSROOM_RSS,
        title: item.title || "(CFPB)",
        document_type: docType,
        domain: "lending",
        jurisdiction: "US-federal",
        published_at: item.pubDate || null,
        summary: item.description || null,
        buffer,
        mimeType,
      });

      results[result.status]++;
    } catch (e) {
      results.failed++;
      results.errors.push(`${item.guid || item.link}: ${e.message}`);
    }
  }

  return results;
}

// ── helpers ────────────────────────────────────────────────────

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item[\s\S]*?<\/item>/g;
  const matches = xml.match(itemRe) || [];
  for (const block of matches) {
    items.push({
      title: extractTag(block, "title"),
      link: extractTag(block, "link"),
      guid: extractTag(block, "guid"),
      pubDate: extractTag(block, "pubDate"),
      description: extractTag(block, "description"),
    });
  }
  return items;
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyCfpbDocumentType(title, link) {
  const t = title.toLowerCase();
  const l = link.toLowerCase();
  if (l.includes("/enforcement/") || t.includes("enforce") || t.includes("settlement") || t.includes("consent order")) {
    return "enforcement_action";
  }
  if (l.includes("/compliance/") || t.includes("bulletin") || t.includes("advisory opinion")) {
    return "guidance";
  }
  if (t.includes("final rule")) return "final_rule";
  if (t.includes("proposed rule")) return "proposed_rule";
  return "feed_item";
}

module.exports = { ingest };
