"use strict";

/**
 * crewQualsEngine.js — CODEX 89 §3: crew qualifications, resolved as "the
 * existing RAAS tier system applied to crew," not a new database.
 *
 *   Level 1 (regulatory floor) — 14 CFR 135.267 duty/flight/rest limits.
 *   Already real, already coded: services/copilot/logic/dutyTimeTracker.js
 *   computeDutyStatus(). This module does NOT re-derive those numbers; it
 *   takes dutyTimeTracker's own output and, where a tenant's operator policy
 *   is stricter, recomputes remaining/status against the stricter cap —
 *   never against a looser one (see mergeLimit below).
 *
 *   Level 2 (operator policy) — the operator's own GOM/SOP/OpSpec, stored as
 *   a Studio Locker tenant document (studioLocker/aviation/tenants/{tenantId}
 *   /documents/{docId}) with type "crew_limits_opspec" and a structured
 *   `structuredLimits` object. This is the SAME collection Studio Locker's
 *   chat-context loader already reads (services/studioLocker/index.js) —
 *   not a second, disconnected store.
 *
 *   Default for operators with none uploaded — per Sean's round-1
 *   resolution: "a conservative vanilla Part 135-style GOM/SOP/OpSpec...
 *   so they can't accidentally out-extend a real conservative operator's
 *   own limits." What ships here is the MECHANISM (a clearly-labeled
 *   fallback), not independently-vetted regulatory content: the bundled
 *   default is numerically identical to the Part 135.267 floor itself —
 *   i.e., "no stricter than the regulation, and no looser either." This
 *   needs real aviation-regulatory review before it should be presented to
 *   an operator as their actual OpSpec-equivalent; every response using it
 *   is tagged usingDefaultOpSpec + needsRegulatoryReview so nothing hides
 *   that it's a placeholder.
 *
 * What this module deliberately does NOT do:
 *   - Build the CFI/AME attestation-at-source flow for Mode B currency
 *     (medical/BFR/IPC/type-recurrent). That doesn't exist anywhere in the
 *     codebase yet (only the analogous nursing:competency:attest pattern
 *     does, at a different route). Every Mode B currency field is tagged
 *     trustLevel: "self_reported" (see services/aviation/pilotCurrency.js)
 *     and surfaced as such — not hard-blocked, since 100% of today's
 *     currency data is self-reported and hard-blocking on that basis would
 *     make Dispatch unusable, not safer. This is a v1 simplification,
 *     flagged explicitly, not a resolution of CODEX 89 §6 open question 1.
 */

const CFR_135_267_FLOOR = Object.freeze({
  flightHours24Cap: 8,
  dutyHours24Cap: 14, // single-pilot floor (135.267(b)); two-pilot crews may
                       // legally use 16 — this engine applies the more
                       // conservative single-pilot number unless the
                       // operator's own OpSpec says otherwise, consistent
                       // with "never less restrictive than the floor."
  flightHours7dCap: 34,
  flightHours30dCap: 120,
  flightHours365dCap: 1200,
  restHoursMin: 10,
});

// A "cap" limit is stricter when SMALLER (fewer hours allowed). A "floor"
// limit (like required rest) is stricter when LARGER (more rest required).
const LIMIT_KINDS = {
  flightHours24Cap: "cap",
  dutyHours24Cap: "cap",
  flightHours7dCap: "cap",
  flightHours30dCap: "cap",
  flightHours365dCap: "cap",
  restHoursMin: "floor",
};

function mergeLimit(kind, cfrValue, operatorValue) {
  if (operatorValue == null || !Number.isFinite(Number(operatorValue))) return cfrValue;
  const op = Number(operatorValue);
  return kind === "cap" ? Math.min(cfrValue, op) : Math.max(cfrValue, op);
}

/**
 * Look up the operator's uploaded crew-limits OpSpec, if any. Pure read, no
 * authorization here — the caller (index.js route) has already gated who
 * may reach this.
 */
async function loadEffectiveLimits(db, tenantId) {
  let operatorDoc = null;
  if (tenantId) {
    const snap = await db.collection("studioLocker").doc("aviation")
      .collection("tenants").doc(tenantId).collection("documents")
      .where("type", "==", "crew_limits_opspec")
      .where("status", "==", "published")
      .limit(1)
      .get();
    if (!snap.empty) operatorDoc = snap.docs[0].data();
  }

  const structured = operatorDoc && operatorDoc.structuredLimits && typeof operatorDoc.structuredLimits === "object"
    ? operatorDoc.structuredLimits
    : null;

  const effective = {};
  const conflicts = [];
  for (const [key, cfrValue] of Object.entries(CFR_135_267_FLOOR)) {
    const kind = LIMIT_KINDS[key];
    const opValue = structured ? structured[key] : null;
    const merged = mergeLimit(kind, cfrValue, opValue);
    effective[key] = merged;
    if (opValue != null && Number.isFinite(Number(opValue))) {
      const wouldBeLooser = kind === "cap" ? Number(opValue) > cfrValue : Number(opValue) < cfrValue;
      if (wouldBeLooser) {
        conflicts.push(`Operator OpSpec value for ${key} (${opValue}) is less restrictive than the regulatory floor (${cfrValue}) — regulatory floor applied instead.`);
      }
    }
  }

  return {
    effective,
    conflicts,
    usingDefaultOpSpec: !structured,
    needsRegulatoryReview: !structured,
    opSpecTitle: operatorDoc ? (operatorDoc.title || "Operator GOM/SOP/OpSpec") : "Vanilla Part 135-style default (= regulatory floor; not independently reviewed)",
    opSpecSource: operatorDoc ? "tenant_upload" : "platform_default",
  };
}

/**
 * Recompute a dutyTimeTracker.computeDutyStatus() limits array against the
 * effective (CFR-or-stricter) caps, preserving its `used` numbers (which are
 * real, computed from actual records) but not its `limit`/`remaining`/
 * `status` fields, which assumed the bare CFR floor.
 */
function applyEffectiveLimitsToDutyStatus(dutyStatus, effective) {
  const idToLimitKey = {
    flight_24h: "flightHours24Cap",
    duty_24h: "dutyHours24Cap",
    flight_7d: "flightHours7dCap",
    flight_30d: "flightHours30dCap",
    flight_365d: "flightHours365dCap",
    rest: "restHoursMin",
  };
  const limits = (dutyStatus.limits || []).map((lim) => {
    const key = idToLimitKey[lim.id];
    if (!key) return lim;
    const kind = LIMIT_KINDS[key];
    const cap = effective[key];
    if (kind === "cap") {
      const remaining = Math.round(Math.max(0, cap - lim.used) * 10) / 10;
      const status = lim.used >= cap ? "LIMIT" : lim.used >= cap * 0.9 ? "CAUTION" : "OK";
      return { ...lim, limit: cap, remaining, status };
    }
    // floor (rest)
    const status = lim.used == null ? "UNKNOWN" : lim.used >= cap ? "OK" : "VIOLATION";
    return { ...lim, limit: cap, status };
  });
  return { ...dutyStatus, limits };
}

/**
 * Assemble the full, human-readable crew-legality check for one candidate
 * crew member — the underlying data the Dispatch accept screen shows
 * (CODEX 89 §4 step 4), not a bare pass/fail.
 */
function evaluateCrewMember({ pilotUserId, role, currency, dutyStatus, effectiveLimits }) {
  const adjustedDuty = applyEffectiveLimitsToDutyStatus(dutyStatus, effectiveLimits.effective);
  const blockingItems = [];
  const softFlags = [];

  for (const lim of adjustedDuty.limits) {
    if (lim.status === "LIMIT" || lim.status === "VIOLATION") {
      blockingItems.push(`${lim.label}: ${lim.used ?? "?"}/${lim.limit} hrs — ${lim.status}`);
    } else if (lim.status === "CAUTION") {
      softFlags.push(`${lim.label}: ${lim.used}/${lim.limit} hrs — approaching limit`);
    }
  }

  // Currency — hard-block on expired/missing, soft-flag on self-reported
  // provenance and on approaching expiration.
  const currencyChecks = [
    { key: "recency90Day", label: "90-day recency (day/night landings)" },
    { key: "instrumentCurrency", label: "Instrument currency (6mo approaches/holds)" },
    { key: "medical", label: "Medical certificate" },
    { key: "bfr", label: "Flight review (BFR)" },
    { key: "ipc", label: "Instrument proficiency check" },
    { key: "typeRecurrent", label: "Type/135 recurrent" },
  ];
  for (const c of currencyChecks) {
    const item = currency[c.key];
    if (item == null) {
      blockingItems.push(`${c.label}: no record on file — cannot verify`);
      continue;
    }
    if (item.band === "RED") {
      blockingItems.push(`${c.label}: EXPIRED/not current${item.expiration ? ` (expired ${item.expiration})` : ""}`);
    } else if (item.band === "YELLOW") {
      softFlags.push(`${c.label}: expires within 30 days${item.expiration ? ` (${item.expiration})` : ""}`);
    }
    if (item.trustLevel === "self_reported") {
      softFlags.push(`${c.label}: self-reported, not instructor/AME-attested at source (attestation-at-source is not yet built for aviation currency)`);
    }
  }

  return {
    pilotUserId,
    role: role || null,
    dutyStatus: adjustedDuty,
    currency,
    effectiveLimits: {
      values: effectiveLimits.effective,
      usingDefaultOpSpec: effectiveLimits.usingDefaultOpSpec,
      needsRegulatoryReview: effectiveLimits.needsRegulatoryReview,
      opSpecTitle: effectiveLimits.opSpecTitle,
      opSpecSource: effectiveLimits.opSpecSource,
      conflicts: effectiveLimits.conflicts,
    },
    blockingItems,
    softFlags,
    cleared: blockingItems.length === 0,
  };
}

module.exports = {
  CFR_135_267_FLOOR,
  loadEffectiveLimits,
  applyEffectiveLimitsToDutyStatus,
  evaluateCrewMember,
};
