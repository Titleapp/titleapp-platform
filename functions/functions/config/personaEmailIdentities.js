"use strict";

// Persona -> sociii.ai email identity, for any future send-as-persona
// capability (CODEX 97 §2). Sean, 2026-09-21: accounting/HR/marketing get
// real Workspace aliases under alex@sociii.ai (free, up to 30 aliases per
// Workspace user) so mail to these addresses is deliverable, not just a
// display name on outbound. Persona names sourced from the canonical
// mapping in scripts/demo/fixSpineWorkerPersonaNames.js.
//
// CROSS-TENANT GUARD (Sean, 2026-09-21 — same bug class as CODEX-S52.65):
// these are RESERVED identities that belong to SOCIII's own tenant only.
// A resolver keyed on workerSlug alone would let ANY tenant's own
// "platform-marketing" worker resolve to ivy@sociii.ai, meaning a client's
// own Ivy would send AS SOCIII. tenantId is therefore a REQUIRED argument,
// checked against a hard allowlist of one tenant — never remove either.
// Multi-tenant persona email (CODEX 97 §2b: per-tenant subaddressing under
// a shared Inbound Parse subdomain) is designed but not built; until it is,
// any non-SOCIII tenantId must fail loud here, not silently fall back to a
// reserved address.

const SOCIII_TENANT_ID = "ws_1779846027006_hc71aw"; // SOCIII, Inc.'s own tenant

// pronoun: "her" for Ivy per CODEX 97's own literal decided disclosure text
// ("This note was drafted by her...") — a fact Sean already stated, not a
// guess. Max/Jordan/Sage/Reed have no gender stated anywhere (CODEX 97 only
// says "same pattern... once they send" without giving their pronouns), so
// those default to "them"/"their" rather than guessing. Sean's call to set
// theirs explicitly whenever they're next in line to send.
const RESERVED_PERSONA_IDENTITIES = {
  "platform-marketing": { personaName: "Ivy", email: "ivy@sociii.ai", role: "marketing", pronoun: "her", aliasStatus: "granted-2026-09-21" },
  "platform-accounting": { personaName: "Max", email: "max@sociii.ai", role: "accounting", pronoun: "them", aliasStatus: "granted-2026-09-21" },
  "platform-hr": { personaName: "Jordan", email: "jordan@sociii.ai", role: "HR", pronoun: "them", aliasStatus: "granted-2026-09-21" },
  "platform-contacts": { personaName: "Sage", email: "sage@sociii.ai", role: "contacts", pronoun: "them", aliasStatus: "not-requested" },
  "investor-relations": { personaName: "Reed", email: "reed@sociii.ai", role: "investor relations", pronoun: "them", aliasStatus: "not-requested" },
  // Dev (CODEX 100, back-of-house IT/ops) — reserved for consistency, not
  // actively used: Dev's v1 interface is devFindings + the eventual staff
  // meeting, not an inbox. Left here so the mapping is complete whenever
  // Dev does need one, rather than a special-cased gap.
  "platform-dev": { personaName: "Dev", email: "dev@sociii.ai", role: "IT/ops", pronoun: "them", aliasStatus: "not-requested" },
};

// Reverse index — inbound alias address -> workerSlug. Built once at module
// load; RESERVED_PERSONA_IDENTITIES is small and static within a process.
const EMAIL_TO_WORKER_SLUG = Object.fromEntries(
  Object.entries(RESERVED_PERSONA_IDENTITIES).map(([slug, v]) => [v.email.toLowerCase(), slug])
);

/**
 * Resolve which worker owns an inbound alias address (e.g. from a
 * Delivered-To header). Returns null for anything not in the reserved map —
 * callers must treat that as "not a persona inbox", not as an error.
 */
function getWorkerSlugForEmail(emailAddress) {
  if (!emailAddress) return null;
  return EMAIL_TO_WORKER_SLUG[String(emailAddress).toLowerCase().trim()] || null;
}

/**
 * Resolve a worker's outbound email identity. tenantId is mandatory.
 * Throws rather than returning a reserved SOCIII identity for any other
 * tenant — a thrown error is loud and safe; a wrong-but-plausible address
 * is a silent cross-tenant leak. Callers must not catch-and-ignore this.
 */
function getPersonaEmailIdentity(workerSlug, tenantId) {
  if (!tenantId) {
    throw new Error(
      `getPersonaEmailIdentity: tenantId is required (workerSlug=${workerSlug}). Refusing to resolve without it — this is the exact missing-scope shape that caused CODEX-S52.65.`
    );
  }

  const reserved = RESERVED_PERSONA_IDENTITIES[workerSlug];
  if (!reserved) return null;

  if (tenantId !== SOCIII_TENANT_ID) {
    throw new Error(
      `getPersonaEmailIdentity: tenant "${tenantId}" requested the reserved identity for "${workerSlug}" (${reserved.email}), but that address is allowlisted to SOCIII's own tenant only. Multi-tenant persona email (CODEX 97 §2b) is not yet built — do not add a fallback here without shipping the tenant-scoped subaddress + Inbound Parse routing it depends on.`
    );
  }

  return reserved;
}

// CODEX 97 safeguard #2 — the exact decided AI-disclosure text, appended by
// CODE at send time (see services/social/gmail.js's sendEmail()), never
// left to the drafting model's memory or the moderation gate's judgment.
// A model can be prompted to include a disclosure and still skip it under
// pressure from the rest of the draft; code always appends it.
const DISCLOSURE_MARKER = "is SOCIII's AI"; // presence check, to stay idempotent

function buildDisclosureFooter(workerSlug) {
  const p = RESERVED_PERSONA_IDENTITIES[workerSlug];
  if (!p) throw new Error(`buildDisclosureFooter: no reserved identity for ${workerSlug}`);
  return `${p.personaName} is SOCIII's AI ${p.role} worker. This note was drafted by ${p.pronoun} and reviewed by a human before sending.`;
}

module.exports = {
  RESERVED_PERSONA_IDENTITIES,
  getPersonaEmailIdentity,
  getWorkerSlugForEmail,
  buildDisclosureFooter,
  DISCLOSURE_MARKER,
  SOCIII_TENANT_ID,
};
