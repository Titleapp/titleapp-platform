"use strict";

/**
 * Federal Register adapter — CODEX 50.17 P0-1
 *
 * The Federal Register publishes a clean JSON API. We query for documents
 * filtered by relevant agencies (SEC, CFPB, OCC, FRB, FDIC, FinCEN, IRS,
 * HHS, FAA) and recent publication dates.
 *
 * API root: https://www.federalregister.gov/api/v1/
 * No auth required, no rate limit documented (we cap our requests anyway).
 *
 * Each FR document has a stable document_number we use as external_id.
 * The full_text_xml_url gives us the canonical text for ingestion.
 */

const { ingestDocument } = require("../pipeline");

const FR_API = "https://www.federalregister.gov/api/v1/documents.json";

// Agencies whose rulemaking we ingest at v1. Per CODEX 50.17 P0-4,
// Securities Compliance module pulls from SEC + CFPB + IRS regulatory output.
const AGENCY_SLUGS = [
  "securities-and-exchange-commission",
  "consumer-financial-protection-bureau",
  "internal-revenue-service",
  "comptroller-of-the-currency",
  "federal-reserve-system",
  "federal-deposit-insurance-corporation",
  "financial-crimes-enforcement-network",
];

const AGENCY_DOMAIN_MAP = {
  "securities-and-exchange-commission": "securities",
  "consumer-financial-protection-bureau": "lending",
  "internal-revenue-service": "tax",
  "comptroller-of-the-currency": "banking",
  "federal-reserve-system": "banking",
  "federal-deposit-insurance-corporation": "banking",
  "financial-crimes-enforcement-network": "banking",
};

const FR_TYPE_MAP = {
  "Rule": "final_rule",
  "Proposed Rule": "proposed_rule",
  "Notice": "notice",
  "Presidential Document": "guidance",
};

/**
 * Pull recent Federal Register documents from the configured agencies,
 * limited to publication date >= lookback window (default 7 days).
 */
async function ingest({ lookbackDays = 7, perAgencyLimit = 10 } = {}) {
  const results = { source: "federal-register", attempted: 0, created: 0, updated: 0, unchanged: 0, failed: 0, errors: [] };

  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const slug of AGENCY_SLUGS) {
    let listing;
    try {
      const params = new URLSearchParams({
        "conditions[agencies][]": slug,
        "conditions[publication_date][gte]": since,
        "per_page": String(perAgencyLimit),
        "order": "newest",
      });
      const url = `${FR_API}?${params.toString()}`;
      const r = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!r.ok) throw new Error(`FR list HTTP ${r.status}`);
      listing = await r.json();
    } catch (e) {
      results.errors.push(`${slug} list: ${e.message}`);
      continue;
    }

    const docs = (listing.results || []);
    results.attempted += docs.length;

    for (const doc of docs) {
      try {
        // Prefer body_html_url then full_text_xml_url then raw_text_url
        const contentUrl = doc.body_html_url || doc.full_text_xml_url || doc.raw_text_url || doc.html_url;
        if (!contentUrl) {
          results.failed++;
          results.errors.push(`${doc.document_number}: no content URL`);
          continue;
        }

        let buffer, mimeType;
        const r = await fetch(contentUrl, { headers: { "Accept": "text/html, application/xml, text/plain" } });
        if (!r.ok) throw new Error(`content HTTP ${r.status}`);
        const ct = r.headers.get("content-type") || "text/html";
        mimeType = ct.split(";")[0].trim();
        const arr = await r.arrayBuffer();
        buffer = Buffer.from(arr);

        const result = await ingestDocument({
          source_id: "federal-register",
          external_id: doc.document_number,
          source_url: doc.html_url,
          title: doc.title,
          document_type: FR_TYPE_MAP[doc.type] || "feed_item",
          domain: AGENCY_DOMAIN_MAP[slug] || "general",
          jurisdiction: "US-federal",
          published_at: doc.publication_date || null,
          effective_date: doc.effective_on || null,
          summary: doc.abstract || null,
          buffer,
          mimeType,
        });

        results[result.status]++;
      } catch (e) {
        results.failed++;
        results.errors.push(`${doc.document_number}: ${e.message}`);
      }
    }
  }

  return results;
}

module.exports = { ingest };
