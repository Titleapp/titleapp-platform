"use strict";

/**
 * SEC EDGAR adapter — CODEX 50.17 P0-1
 *
 * Fetches recent SEC rule filings via the EDGAR full-text search RSS-like
 * feed. The cleanest API surface among the three v1 sources.
 *
 * Sources used:
 *   - SEC press releases atom feed: https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=include&count=40&action=getcurrent&output=atom
 *   - SEC final rules page: https://www.sec.gov/rules/final.shtml (HTML scrape, used as fallback)
 *
 * SEC requires a User-Agent header identifying the requesting app + contact
 * email per their developer guidelines. Without it, EDGAR returns 403.
 *
 * Rate limit: 10 requests/sec across the SEC.gov domain. We fetch ~1 feed
 * per scheduled run, well under limit.
 */

const crypto = require("crypto");
const { ingestDocument } = require("../pipeline");

const SEC_USER_AGENT = "TitleApp Regulatory Compliance Service contact@titleapp.ai";
const SEC_RECENT_FEED = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&company=&dateb=&owner=include&count=40&output=atom";

/**
 * Pull recent SEC rule activity. Each entry becomes a regulatoryDocument
 * (or supersedes an existing one if the underlying content changed).
 *
 * The atom feed has: <entry><title/><link/><updated/><id/><summary/></entry>.
 * We treat each entry as a feed_item; full-text fetch happens for items
 * matching securities-rule patterns (final rule, proposed rule, interpretive
 * release, no-action letter).
 */
async function ingest({ limit = 25 } = {}) {
  const results = { source: "sec-edgar", attempted: 0, created: 0, updated: 0, unchanged: 0, failed: 0, errors: [] };

  let feedXml;
  try {
    const r = await fetch(SEC_RECENT_FEED, {
      headers: { "User-Agent": SEC_USER_AGENT, "Accept": "application/atom+xml" },
    });
    if (!r.ok) throw new Error(`SEC feed HTTP ${r.status}`);
    feedXml = await r.text();
  } catch (e) {
    results.failed++;
    results.errors.push(`feed-fetch: ${e.message}`);
    return results;
  }

  // Lightweight atom parser — avoids adding xml2js dep
  const entries = parseAtomEntries(feedXml).slice(0, limit);
  results.attempted = entries.length;

  for (const entry of entries) {
    try {
      // Fetch the full filing content if linkable
      let buffer, mimeType = "text/html";
      if (entry.link) {
        try {
          const r = await fetch(entry.link, {
            headers: { "User-Agent": SEC_USER_AGENT },
          });
          if (r.ok) {
            const ct = r.headers.get("content-type") || "text/html";
            mimeType = ct.split(";")[0].trim();
            const arr = await r.arrayBuffer();
            buffer = Buffer.from(arr);
          }
        } catch (_) { /* fall through with summary only */ }
      }
      if (!buffer) {
        // Use the summary as the document body if full fetch failed
        const body = entry.summary || entry.title;
        buffer = Buffer.from(body, "utf8");
        mimeType = "text/plain";
      }

      const externalId = entry.id || crypto.createHash("sha1").update(entry.link || entry.title).digest("hex");
      const result = await ingestDocument({
        source_id: "sec-edgar",
        external_id: externalId,
        source_url: entry.link || SEC_RECENT_FEED,
        title: entry.title || "(SEC filing)",
        document_type: classifyDocumentType(entry.title || ""),
        domain: "securities",
        jurisdiction: "US-federal",
        published_at: entry.updated || null,
        summary: entry.summary || null,
        buffer,
        mimeType,
      });

      results[result.status]++;
    } catch (e) {
      results.failed++;
      results.errors.push(`${entry.id || entry.link}: ${e.message}`);
    }
  }

  return results;
}

// ── helpers ────────────────────────────────────────────────────

function parseAtomEntries(xml) {
  const entries = [];
  const entryRe = /<entry[\s\S]*?<\/entry>/g;
  const matches = xml.match(entryRe) || [];
  for (const block of matches) {
    entries.push({
      title: extractTag(block, "title"),
      link: extractLink(block),
      id: extractTag(block, "id"),
      updated: extractTag(block, "updated"),
      summary: extractTag(block, "summary") || extractTag(block, "content"),
    });
  }
  return entries;
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  // Strip CDATA + tags + decode minimal entities
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLink(xml) {
  const m = xml.match(/<link[^>]*href="([^"]+)"/i);
  return m ? m[1] : null;
}

function classifyDocumentType(title) {
  const t = title.toLowerCase();
  if (t.includes("final rule")) return "final_rule";
  if (t.includes("proposed rule") || t.includes("proposing release")) return "proposed_rule";
  if (t.includes("no-action") || t.includes("interpretive release")) return "guidance";
  if (t.includes("enforcement") || t.includes("administrative proceeding")) return "enforcement_action";
  return "feed_item";
}

module.exports = { ingest };
