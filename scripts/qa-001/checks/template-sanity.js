"use strict";

/**
 * Check: every DBX Sign template referenced by ROLE_TEMPLATE_ENV
 *   (a) actually exists in the Dropbox Sign account, and
 *   (b) has signer_roles whose names exactly match cfg.signerRole +
 *       cfg.companyRole (case-sensitive).
 *
 * Catches:
 *   TC-025 — Template ID secret pointed at phantom
 *   TC-026 — Role-name case mismatch ("INVESTOR" vs "Investor")
 *
 * Env required:
 *   HELLOSIGN_API_KEY                       (to fetch templates)
 *   any DROPBOX_SIGN_TEMPLATE_*             (cfg-referenced env keys)
 *
 * If HELLOSIGN_API_KEY is missing, the check warns + skips — doesn't fail.
 */

const path = require("path");
const fs = require("fs");

const HELLOSIGN_BASE = "https://api.hellosign.com/v3";

async function fetchTemplate(apiKey, templateId) {
  const auth = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
  const res = await fetch(`${HELLOSIGN_BASE}/template/${templateId}`, {
    headers: { Authorization: auth },
  });
  if (res.status === 404) return null;
  const json = await res.json();
  return json.template || null;
}

function loadRoleTemplateEnv() {
  // Read the cfg literally from signatureService/index.js since it's the source
  // of truth — don't import (would pull in firebase-admin etc).
  const sigPath = path.join(__dirname, "..", "..", "..", "functions", "functions", "services", "signatureService", "index.js");
  if (!fs.existsSync(sigPath)) return null;
  const src = fs.readFileSync(sigPath, "utf8");
  // Extract the ROLE_TEMPLATE_ENV block via regex. Brittle but cheap.
  const m = src.match(/const ROLE_TEMPLATE_ENV\s*=\s*({[\s\S]*?^};)/m);
  if (!m) return null;
  // Parse each role entry — { envKey, signerRole, companyRole }
  const entries = {};
  const roleRe = /(\w+):\s*{\s*[^}]*?envKey:\s*"([^"]+)"[^}]*?signerRole:\s*"([^"]+)"[^}]*?companyRole:\s*"([^"]+)"/g;
  let rm;
  while ((rm = roleRe.exec(m[1])) !== null) {
    entries[rm[1]] = { envKey: rm[2], signerRole: rm[3], companyRole: rm[4] };
  }
  return entries;
}

module.exports = {
  id: "template-sanity",
  title: "DBX Sign template IDs valid + role names case-match cfg",
  severity: "p0",

  async run() {
    const findings = [];
    const cfg = loadRoleTemplateEnv();
    if (!cfg) {
      return {
        ok: false,
        findings: [{
          check: "template-sanity",
          severity: "p1",
          tc: null,
          title: "cfg_unparseable",
          detail: "Could not extract ROLE_TEMPLATE_ENV from signatureService/index.js — regex did not match. Check may be stale.",
          evidence: {},
        }],
      };
    }

    const apiKey = process.env.HELLOSIGN_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        findings: [{
          check: "template-sanity",
          severity: "p2",
          tc: null,
          title: "hellosign_api_key_missing",
          detail: "HELLOSIGN_API_KEY not set in env — cannot verify template existence. Set env and re-run.",
          evidence: { rolesNeeded: Object.keys(cfg) },
        }],
      };
    }

    for (const [role, c] of Object.entries(cfg)) {
      const templateId = process.env[c.envKey];
      if (!templateId) {
        findings.push({
          check: "template-sanity",
          severity: "p1",
          tc: "TC-025",
          title: `${role}: template env var not set`,
          detail: `Env var ${c.envKey} is not configured. Signing flow for ${role} will fail at runtime.`,
          evidence: { role, envKey: c.envKey },
        });
        continue;
      }

      let tpl;
      try {
        tpl = await fetchTemplate(apiKey, templateId);
      } catch (e) {
        findings.push({
          check: "template-sanity",
          severity: "p1",
          tc: null,
          title: `${role}: template fetch failed`,
          detail: `Could not query DBX Sign for template ${templateId}: ${e.message}`,
          evidence: { role, templateId, error: e.message },
        });
        continue;
      }

      if (!tpl) {
        findings.push({
          check: "template-sanity",
          severity: "p0",
          tc: "TC-025",
          title: `${role}: template ID points at phantom`,
          detail: `Template ID ${templateId} does not exist in the DBX Sign account. Signing will fail with "Template not found".`,
          evidence: { role, templateId, envKey: c.envKey },
        });
        continue;
      }

      const actualRoles = (tpl.signer_roles || []).map(r => r.name);
      const expectedRoles = [c.signerRole, c.companyRole];
      const missing = expectedRoles.filter(r => !actualRoles.includes(r));
      if (missing.length > 0) {
        findings.push({
          check: "template-sanity",
          severity: "p0",
          tc: "TC-026",
          title: `${role}: role name case mismatch`,
          detail: `Cfg expects roles [${expectedRoles.join(", ")}] but template has [${actualRoles.join(", ")}]. DBX Sign will return "No recipients specified" (cryptic).`,
          evidence: { role, templateId, expected: expectedRoles, actual: actualRoles, missing },
        });
      }
    }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
