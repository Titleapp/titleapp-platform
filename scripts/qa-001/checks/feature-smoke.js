// QA-001 check: feature-smoke
// Verifies that specific code patterns from shipped features exist in the right
// files. Not a unit test — a structural guarantee that the wiring is present.
// Add an entry here when a feature lands that has a non-obvious internal
// dependency (e.g. a value-field name, an auth pattern, a type registration).

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}

const CHECKS = [
  // --- Vault value calculation (CODEX 18, 2026-07-04) ---
  {
    id: "vault-estimatedValue",
    file: "apps/business/src/sections/VaultDTCs.jsx",
    must_contain: "estimatedValue",
    title: "dtcValue() must read metadata.estimatedValue",
    detail: "Without this field VaultDTCs shows $0 for any asset seeded with estimatedValue (Tesla, condo, etc.)",
    severity: "p0",
  },
  {
    id: "vault-equity-type",
    file: "apps/business/src/data/useDtcCatalog.js",
    must_contain: "equity",
    title: "ASSET_CLASS_OF must include equity type",
    detail: "Without this, equity assets fall to the catch-all and may misclassify in future refactors.",
    severity: "p1",
  },
  {
    id: "vault-personal-property-type",
    file: "apps/business/src/data/useDtcCatalog.js",
    must_contain: "personal_property",
    title: "ASSET_CLASS_OF must include personal_property type",
    detail: "Without this, DJ equipment, watches etc. fall to the catch-all.",
    severity: "p1",
  },

  // --- Operating Feed auth timing fix (CODEX 18, 2026-07-04) ---
  {
    id: "alertfeed-auth-state-changed",
    file: "apps/business/src/components/MorningBriefCanvas.jsx",
    must_contain: "onAuthStateChanged",
    title: "alertFeed listener must use onAuthStateChanged (not auth.currentUser)",
    detail: "auth.currentUser is null at mount — listener never starts. onAuthStateChanged waits for Firebase to confirm identity before subscribing.",
    severity: "p0",
  },
  {
    id: "alertfeed-listener-present",
    file: "apps/business/src/components/MorningBriefCanvas.jsx",
    must_contain: "alertFeed",
    title: "MorningBriefCanvas must contain alertFeed listener",
    detail: "Operating Feed is powered by the alertFeed Firestore listener in MorningBriefCanvas.",
    severity: "p0",
  },

  // --- Daily thought widget (CODEX 18) ---
  {
    id: "daily-thought-array",
    file: "apps/business/src/components/MorningBriefCanvas.jsx",
    must_contain: "THOUGHTS",
    title: "MorningBriefCanvas must have THOUGHTS array",
    detail: "Daily thought widget is powered by the THOUGHTS array with ancient wisdom + AI-age quotes.",
    severity: "p1",
  },

  // --- Morning scanner (CODEX 18) ---
  {
    id: "morning-scanner-export",
    file: "functions/functions/index.js",
    must_contain: "exports.morningScanner",
    title: "morningScanner must be exported from index.js",
    detail: "Without this export the 7am HST cron never runs and the feed is never auto-populated.",
    severity: "p0",
  },
  {
    id: "morning-scanner-schedule",
    file: "functions/functions/index.js",
    must_contain: "Pacific/Honolulu",
    title: "morningScanner must be scheduled in Pacific/Honolulu timezone",
    detail: "7am HST requires explicit timezone. America/Los_Angeles would be wrong by 0-1 hours depending on DST.",
    severity: "p1",
  },

  // --- Firestore rules (CODEX 18) ---
  {
    id: "alertfeed-rules",
    file: "firestore.rules",
    must_contain: "alertFeed",
    title: "firestore.rules must have alertFeed rule",
    detail: "Without this rule all alertFeed reads fail with PERMISSION_DENIED (silently swallowed by onSnapshot error handler).",
    severity: "p0",
  },

  // --- get_campaigns cross-worker tool (CODEX 18) ---
  {
    id: "get-campaigns-in-prompt",
    file: "functions/functions/index.js",
    must_contain: "get_campaigns",
    title: "get_campaigns must be referenced in index.js",
    detail: "Cross-worker tool that lets Alex list marketing campaigns from any context.",
    severity: "p1",
  },

  // --- Dead code guard (cross-check dead-code check) ---
  {
    id: "no-set-priorities-in-prompt",
    file: "functions/functions/index.js",
    must_not_contain: "CALL set_priorities",
    title: "Alex system prompt must not instruct Alex to call set_priorities",
    detail: "set_priorities was removed. If the prompt still references it, Alex will attempt to call a non-existent tool.",
    severity: "p0",
  },
];

module.exports = {
  id: "feature-smoke",
  title: "Shipped feature wiring is present in the right files",
  severity: "p0",
  async run() {
    const findings = [];

    for (const chk of CHECKS) {
      const src = read(chk.file);
      if (!src) {
        findings.push({
          check: "feature-smoke",
          severity: chk.severity,
          title: `Cannot read file for check "${chk.id}": ${chk.file}`,
          detail: `File not found or unreadable.`,
          evidence: { id: chk.id, file: chk.file },
        });
        continue;
      }

      if (chk.must_contain && !src.includes(chk.must_contain)) {
        findings.push({
          check: "feature-smoke",
          severity: chk.severity,
          title: chk.title,
          detail: `${chk.detail}\n\nExpected to find "${chk.must_contain}" in ${chk.file} — not found.`,
          evidence: { id: chk.id, file: chk.file, missing: chk.must_contain },
        });
      }

      if (chk.must_not_contain && src.includes(chk.must_not_contain)) {
        findings.push({
          check: "feature-smoke",
          severity: chk.severity,
          title: chk.title,
          detail: `${chk.detail}\n\nFound forbidden string "${chk.must_not_contain}" in ${chk.file}.`,
          evidence: { id: chk.id, file: chk.file, found: chk.must_not_contain },
        });
      }
    }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
