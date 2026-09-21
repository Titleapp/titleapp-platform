"use strict";

// Persona -> sociii.ai email identity, for any future send-as-persona
// capability (CODEX 97 §2). Sean, 2026-09-21: accounting/HR/marketing get
// real Workspace aliases under alex@sociii.ai (free, up to 30 aliases per
// Workspace user) so mail to these addresses is deliverable, not just a
// display name on outbound. Persona names sourced from the canonical
// mapping in scripts/demo/fixSpineWorkerPersonaNames.js.
//
// NOTE: sending "as" one of these via SendGrid works today with zero setup
// (sociii.ai is fully domain-authenticated in SendGrid — any @sociii.ai
// from-address is already valid). RECEIVING replies at these addresses
// requires the Workspace alias to actually exist (root-domain MX is Google
// Workspace, not per-address) — that part is a manual admin-console step,
// not something this file does on its own.

const PERSONA_EMAIL_IDENTITIES = {
  "platform-marketing": { personaName: "Ivy", email: "ivy@sociii.ai", aliasStatus: "requested-2026-09-21" },
  "platform-accounting": { personaName: "Max", email: "max@sociii.ai", aliasStatus: "requested-2026-09-21" },
  "platform-hr": { personaName: "Jordan", email: "jordan@sociii.ai", aliasStatus: "requested-2026-09-21" },
  "platform-contacts": { personaName: "Sage", email: "sage@sociii.ai", aliasStatus: "not-requested" },
  "investor-relations": { personaName: "Reed", email: "reed@sociii.ai", aliasStatus: "not-requested" },
};

function getPersonaEmailIdentity(workerSlug) {
  return PERSONA_EMAIL_IDENTITIES[workerSlug] || null;
}

module.exports = { PERSONA_EMAIL_IDENTITIES, getPersonaEmailIdentity };
