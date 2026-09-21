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

const RESERVED_PERSONA_IDENTITIES = {
  "platform-marketing": { personaName: "Ivy", email: "ivy@sociii.ai", aliasStatus: "requested-2026-09-21" },
  "platform-accounting": { personaName: "Max", email: "max@sociii.ai", aliasStatus: "requested-2026-09-21" },
  "platform-hr": { personaName: "Jordan", email: "jordan@sociii.ai", aliasStatus: "requested-2026-09-21" },
  "platform-contacts": { personaName: "Sage", email: "sage@sociii.ai", aliasStatus: "not-requested" },
  "investor-relations": { personaName: "Reed", email: "reed@sociii.ai", aliasStatus: "not-requested" },
};

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

module.exports = { RESERVED_PERSONA_IDENTITIES, getPersonaEmailIdentity, SOCIII_TENANT_ID };
