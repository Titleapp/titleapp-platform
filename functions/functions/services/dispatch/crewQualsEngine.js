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
 *   own limits." The numeric side of that default is CFR_135_267_FLOOR
 *   below (unchanged from the original build — "no stricter than the
 *   regulation, and no looser either"). The narrative/content side — real,
 *   original charter-ops GOM/SOP/OpSpec text (operational control, weather
 *   minimums, weight & balance authority, MEL procedures, dispatch release
 *   authority, training/currency, emergency procedures, etc.) — now lives in
 *   raas/rulesets/aviation_charter_default_v1.json, loaded below via
 *   loadDefaultOpSpecRuleset(). It was written from public-domain FAA
 *   GOM/OpSpec structure and general Part 135/91 practice — NOT copied or
 *   adapted from any specific real operator's proprietary manual (see that
 *   file's own `contentProvenance` field).
 *
 *   IMPORTANT — do not strip this: however complete that ruleset content
 *   reads, it is a best-practice reference template, not an FAA-approved
 *   GOM/SOP/OpSpec. It has not been reviewed by an aviation attorney, a
 *   POI/FSDO, or a DPE. Every response grounded in it — the JSON's own
 *   `disclaimer`/`system_context` fields, this engine's `effectiveLimits`
 *   output, and the Dispatch UI that renders it (TripVerifyPanel in
 *   AviationWorkerCanvas.jsx) — must keep surfacing that disclaimer and the
 *   `needsRegulatoryReview: true` flag for as long as no tenant OpSpec is
 *   uploaded. "Written by an AI from public-domain structure" is a starting
 *   point, not a substitute for the certificate holder's own approved
 *   manual — never let a future edit quietly drop the disclaimer or the
 *   flag thinking either is boilerplate.
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

const DEFAULT_OPSPEC_RULESET_ID = "aviation_charter_default_v1";

/**
 * Load the platform default GOM/SOP/OpSpec reference content (see the file
 * header above and raas/rulesets/aviation_charter_default_v1.json itself).
 * Reuses raas.engine.js's loadRuleset() — same loader/cache every other
 * ruleset in this codebase goes through — rather than a second require path.
 * Returns null (never throws) if the file is somehow missing, so a bad
 * ruleset load degrades to "no disclaimer surfaced," not a crashed request —
 * fixing that gap belongs in the RAAS engine layer, not silently swallowed
 * here in a way that looks like success.
 */
function loadDefaultOpSpecRuleset() {
  try {
    const { loadRuleset } = require("../../raas/raas.engine");
    return loadRuleset(DEFAULT_OPSPEC_RULESET_ID) || null;
  } catch (e) {
    console.error(`[crewQualsEngine] Failed to load default OpSpec ruleset "${DEFAULT_OPSPEC_RULESET_ID}":`, e.message);
    return null;
  }
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

  // The default's real content (not just its numbers) — hard_stops,
  // disclaimer, system_context — only matters when there's no tenant
  // upload; loaded lazily so an operator with their own OpSpec never pays
  // for or surfaces default-ruleset content at all.
  const defaultRuleset = structured ? null : loadDefaultOpSpecRuleset();

  return {
    effective,
    conflicts,
    usingDefaultOpSpec: !structured,
    // Still true even now that the default has real content behind it —
    // "written by an AI from public-domain regulatory structure" is not the
    // same as "reviewed by an aviation attorney or DPE." Never drop this
    // flag while usingDefaultOpSpec is true (see file header).
    needsRegulatoryReview: !structured,
    opSpecTitle: operatorDoc
      ? (operatorDoc.title || "Operator GOM/SOP/OpSpec")
      : (defaultRuleset?.title || defaultRuleset?.description || "Platform default charter-operations GOM/SOP/OpSpec reference (not independently reviewed)"),
    opSpecSource: operatorDoc ? "tenant_upload" : "platform_default",
    // Populated only for the platform default — this is the disclaimer that
    // MUST reach every surface rendering a default-grounded determination
    // (see aviation_charter_default_v1.json's own `disclaimer` field, and
    // the file header above for why this can never be silently dropped).
    disclaimer: operatorDoc ? null : (defaultRuleset?.disclaimer || null),
    systemContext: operatorDoc ? null : (defaultRuleset?.system_context || null),
    rulesetId: operatorDoc ? null : (defaultRuleset?.id || DEFAULT_OPSPEC_RULESET_ID),
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
    { key: "ipc", label: "Instrument proficiency check (61.57)" },
    // 2026-09-05 — split from a single collapsed "Type/135 recurrent" field
    // (see services/aviation/pilotCurrency.js's 2026-09-05 addendum): a pilot
    // can be current on one and due on the other, and Dispatch needs to
    // block/flag them independently, not as one merged item.
    { key: "typeRecurrent", label: "135.293 competency check / recurrent training" },
    { key: "ipc297", label: "135.297 instrument proficiency check" },
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

  // Surface the default-OpSpec disclaimer as a soft flag too, not only in
  // the structured effectiveLimits block below — anything that only reads
  // blockingItems/softFlags as flat display strings (chat surfaces, plain
  // log lines) still sees it this way. Never gated behind any "only show
  // once" logic — every crew check grounded in the default repeats it.
  if (effectiveLimits.usingDefaultOpSpec && effectiveLimits.disclaimer) {
    softFlags.push(`No operator GOM/SOP/OpSpec on file — this check used the platform default reference (${effectiveLimits.opSpecTitle}). ${effectiveLimits.disclaimer}`);
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
      // Only populated when usingDefaultOpSpec is true (see
      // loadEffectiveLimits above) — the actual disclaimer text every
      // consumer of this object (API responses, the Dispatch UI, chat
      // grounding) must surface, not just the boolean flags. Do not strip
      // this thinking it's redundant with needsRegulatoryReview — the flag
      // says "review needed"; this field is the actual user-facing notice.
      disclaimer: effectiveLimits.disclaimer || null,
      rulesetId: effectiveLimits.rulesetId || null,
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
