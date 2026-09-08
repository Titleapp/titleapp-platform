"use strict";

/**
 * CODEX S52.66 Phase 1 — infrastructure-enforced domain allowlist.
 *
 * This is NOT a prompt instruction. The model never constructs a URL — it
 * only ever picks a `topic` key from a fixed, per-worker list, and this
 * module maps that key to a specific, pre-vetted URL. secureFetch.js then
 * re-validates the resolved URL's hostname against `domains` before ever
 * making a network request, so even a bug elsewhere can't turn this into
 * arbitrary-URL fetching.
 *
 * Domains below were verified live on 2026-09-07 (reachable, robots.txt
 * checked for a blanket Disallow on public content — both clean) before
 * being added here. Adding a new domain or topic requires the same
 * production sign-off as any other change touching what a worker can reach
 * on the public internet (CODEX-S52.66 risk #11) — do not extend this list
 * casually, and do not widen a domain entry to a wildcard/subdomain pattern
 * without the same review.
 */

const ALLOWLIST = {
  "site-recon-001": {
    // Henderson County, TX — matches the real, active Attorneys Title /
    // Henderson County demo context (docs/CODEX-S52.47 row 7).
    domains: ["www.henderson-county.com", "henderson-county.com", "henderson-cad.org"],
    topics: {
      county_clerk_info: {
        url: "https://www.henderson-county.com/",
        description: "Henderson County, TX official government site — county clerk, recording, departments, contact info.",
      },
      cad_info: {
        url: "https://henderson-cad.org/",
        description: "Henderson County Appraisal District (HCAD) — property tax appraisal info, exemptions, protest process, taxing jurisdictions.",
      },
    },
  },
};

function getWorkerConfig(workerSlug) {
  return ALLOWLIST[workerSlug] || null;
}

function getAllowedTopics(workerSlug) {
  const cfg = getWorkerConfig(workerSlug);
  return cfg ? Object.keys(cfg.topics) : [];
}

function resolveTopicUrl(workerSlug, topic) {
  const cfg = getWorkerConfig(workerSlug);
  if (!cfg || !cfg.topics[topic]) return null;
  return cfg.topics[topic].url;
}

/** Defense in depth — re-checked by secureFetch.js against the RESOLVED URL's
 * real hostname, independent of which topic key was requested. */
function isDomainAllowed(workerSlug, hostname) {
  const cfg = getWorkerConfig(workerSlug);
  if (!cfg) return false;
  return cfg.domains.includes(String(hostname || "").toLowerCase());
}

module.exports = { ALLOWLIST, getWorkerConfig, getAllowedTopics, resolveTopicUrl, isDomainAllowed };
