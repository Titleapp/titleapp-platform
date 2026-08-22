"use strict";

/**
 * services/identity/verifiedIdentityResolution.js — CODEX S52.62
 *
 * Cross-tenant Person/Identity resolution mechanism.
 *
 * WHY THIS FILE EXISTS
 * ---------------------
 * The Stripe Identity webhook (`/stripe:webhook` in index.js) previously
 * discarded Stripe's `verified_outputs` (legal name, DOB, document number)
 * entirely — it only stored a pass/fail status. That meant the platform
 * could answer "did this uid pass a KYC check" but never "who, provably,
 * did it verify" — and had no way to recognize that the same real person
 * had separately verified under a different Firebase uid/tenant.
 *
 * This module is the actual matching mechanism: given Stripe's verified
 * output for one KYC pass, compute a keyed HMAC over the normalized
 * identity fields and use it to find-or-create a single, durable,
 * cross-tenant `verifiedIdentities` record for that real person.
 *
 * SECURITY / PII RULES — READ BEFORE EDITING THIS FILE
 * -----------------------------------------------------
 * 1. NEVER log a raw name, DOB, or document number — not in console.log,
 *    console.warn, console.error, or thrown Error messages. Only the HMAC
 *    output (already a one-way derived value) and status/boolean flags are
 *    safe to log.
 * 2. NEVER store a raw name/DOB/document-number anywhere in Firestore from
 *    this module. The only durable artifact this module writes is the
 *    versioned/scheme-tagged HMAC identifier plus bookkeeping metadata.
 * 3. NEVER return a raw name/DOB/document-number, or the underlying HMAC
 *    construction, to a tenant-facing API response. Callers outside this
 *    module get, at most, an opaque `verifiedIdentityId` and a boolean.
 *
 * HMAC CONSTRUCTION (Decided, CODEX S52.62 §4 item 1)
 * -----------------------------------------------------
 * identifier.value = HMAC-SHA256(IDENTITY_HMAC_KEY, normalizedName + "|" + normalizedDob + "|" + normalizedDocNumber)
 *
 * A keyed HMAC — not a plain hash — because DOB has only ~36,500 possible
 * values and document numbers follow known per-country formats: a
 * deterministic *unkeyed* hash would be dictionary/rainbow-table
 * attackable by anyone who already knows a target's name + DOB. The key
 * (IDENTITY_HMAC_KEY) is a Firebase Functions v2 secret — backend-only,
 * never sent to a client, declared the same way as STRIPE_SECRET_KEY etc.
 * in index.js's `secrets: [...]` array.
 *
 * NORMALIZATION RULES (exact, load-bearing — two verifications of the same
 * real person only produce the same HMAC if these rules are followed
 * exactly the same way every time; do not change without a version bump,
 * see "VERSIONING" below):
 *   - Name: Unicode NFKD-normalize, strip combining diacritical marks,
 *     uppercase, collapse all whitespace runs to a single space, trim.
 *     ("María-José O'Brien " -> "MARIA-JOSE O'BRIEN")
 *   - DOB: normalized to "YYYY-MM-DD" from whatever shape Stripe returns
 *     (a {year,month,day} object from verified_outputs.dob, or a report's
 *     document.dob) — zero-padded, no timezone conversion (Stripe returns
 *     calendar-date components, not an instant).
 *   - Document number: uppercase, strip everything that is not an
 *     alphanumeric character (dashes, spaces, punctuation all removed) —
 *     so "AB-123 456" and "ab123456" normalize identically.
 *   Explicitly NOT handled (documented limitation, CODEX S52.62 §4 item 13,
 *   Tier 4 — acknowledged, not worth build time now): given-name/family-name
 *   ordering conventions that vary by country, and non-Gregorian or
 *   ambiguously-ordered date formats beyond what Stripe already normalizes
 *   into {year,month,day}.
 *
 * VERSIONING / SCHEME TAG (Decided, §4 items 9 and §5 item 7)
 * -----------------------------------------------------
 * The stored identifier is never a bare string. It is:
 *   { scheme: "stripe_kyc_hmac", version: 1, value: "<hex hmac>" }
 * `scheme` distinguishes "verified via Stripe biometric KYC HMAC" from any
 * future non-biometric verification method (out of scope to build now,
 * per §1.5). `version` lets a future change to the HMAC construction
 * (key rotation, normalization fix, algorithm change) be reasoned about
 * instead of silently breaking every existing link. Bump
 * IDENTITY_HMAC_SCHEME_VERSION and branch on it in normalizeIdentityInputs/
 * computeIdentityHmac if the construction ever changes.
 *
 * ANCHOR TYPE (Decided, §4 item 10)
 * -----------------------------------------------------
 * The `verifiedIdentities` record uses `anchorType: "database"` — never
 * `blockchain`/`nft`. A blockchain/NFT anchor is immutable by design and
 * would make the retention/deletion mechanism below (§5 item 3) impossible
 * to honor against a real erasure request.
 *
 * ISOLATION BOUNDARY (Decided, §4 item 5; §4 item 7 in the build ticket)
 * -----------------------------------------------------
 * `findOrCreateVerifiedIdentity` and `identityExistsForHmac` return, at
 * most, { verifiedIdentityId, matched } — never any information about
 * which other tenant/context previously created or referenced the record.
 * There is no function in this module that lists "who else has this
 * identity" — that is a deliberate omission, not an oversight.
 */

const admin = require("firebase-admin");

const IDENTITY_HMAC_SCHEME = "stripe_kyc_hmac";
const IDENTITY_HMAC_SCHEME_VERSION = 1;

const COLLECTION_VERIFIED_IDENTITIES = "verifiedIdentities";
const COLLECTION_DELETION_AUDIT = "verifiedIdentityDeletions";

function getDb() {
  return admin.firestore();
}

function nowTs() {
  try {
    return admin.firestore.FieldValue.serverTimestamp();
  } catch (e) {
    return new Date();
  }
}

// ----------------------------
// Normalization (see file header for the exact rules — load-bearing)
// ----------------------------

function normalizeName(rawName) {
  if (!rawName) return "";
  return String(rawName)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (U+0300-U+036F)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Accepts either a Stripe {year, month, day} object (verified_outputs.dob /
// verification report document.dob) or an already-formatted "YYYY-MM-DD" string.
function normalizeDob(rawDob) {
  if (!rawDob) return "";
  if (typeof rawDob === "string") {
    const m = rawDob.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return "";
    const [, y, mo, d] = m;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const { year, month, day } = rawDob;
  if (!year || !month || !day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeDocumentNumber(rawDocNumber) {
  if (!rawDocNumber) return "";
  return String(rawDocNumber)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Normalize the three verified-identity inputs in one call.
 * @returns {{normalizedName: string, normalizedDob: string, normalizedDocNumber: string, complete: boolean}}
 */
function normalizeIdentityInputs({ firstName, lastName, dob, documentNumber }) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const normalizedName = normalizeName(fullName);
  const normalizedDob = normalizeDob(dob);
  const normalizedDocNumber = normalizeDocumentNumber(documentNumber);
  return {
    normalizedName,
    normalizedDob,
    normalizedDocNumber,
    // All three inputs are required for the HMAC to mean anything —
    // partial verified_outputs (see CODEX S52.62 §5 item 6) should not
    // silently produce a weaker, more-collision-prone identifier.
    complete: !!(normalizedName && normalizedDob && normalizedDocNumber),
  };
}

// ----------------------------
// HMAC construction
// ----------------------------

/**
 * @param {string} hmacKey - IDENTITY_HMAC_KEY secret value (server-only).
 * @param {{normalizedName: string, normalizedDob: string, normalizedDocNumber: string}} normalized
 * @returns {string} hex-encoded HMAC-SHA256 output — safe to log/store.
 */
function computeIdentityHmac(hmacKey, normalized) {
  if (!hmacKey) throw new Error("computeIdentityHmac: IDENTITY_HMAC_KEY not configured");
  const { normalizedName, normalizedDob, normalizedDocNumber } = normalized;
  const crypto = require("crypto");
  const input = `${normalizedName}|${normalizedDob}|${normalizedDocNumber}`;
  return crypto.createHmac("sha256", hmacKey).update(input, "utf8").digest("hex");
}

/**
 * Build the versioned, scheme-tagged identifier object stored on the
 * verifiedIdentities record. Never a bare string (Decided, §4 item 9 / §5 item 7).
 */
function buildVersionedIdentifier(hmacValue) {
  return {
    scheme: IDENTITY_HMAC_SCHEME,
    version: IDENTITY_HMAC_SCHEME_VERSION,
    value: hmacValue,
  };
}

/**
 * One-call helper: normalize + compute HMAC + build the versioned identifier.
 * Throws (without ever including raw inputs in the error message) if any
 * required field is missing.
 */
function buildIdentifierFromVerifiedOutputs({ hmacKey, firstName, lastName, dob, documentNumber }) {
  const normalized = normalizeIdentityInputs({ firstName, lastName, dob, documentNumber });
  if (!normalized.complete) {
    // Deliberately no raw field values in this message — see file header rule 1.
    throw new Error("buildIdentifierFromVerifiedOutputs: incomplete verified_outputs (missing name, dob, or document number)");
  }
  const hmacValue = computeIdentityHmac(hmacKey, normalized);
  return buildVersionedIdentifier(hmacValue);
}

// ----------------------------
// verifiedIdentities collection — find-or-create matching logic
// ----------------------------
//
// Schema (verifiedIdentities/{autoId}):
//   {
//     identifier: { scheme, version, value } | null,   // null after deletion (§5 item 3)
//     status: "active" | "deleted",
//     createdAt: Timestamp,
//     recordAnchors: [{ anchorType: "database", status: "active", createdAt }],
//   }
// Deliberately NOT stored: raw name, DOB, document number, or any per-tenant
// contact/context info. The doc ID is an opaque Firestore auto-ID — never
// derived from or containing the HMAC value itself, so a leaked doc ID
// reveals nothing about the underlying identifier.

function verifiedIdentitiesCollection(db) {
  return (db || getDb()).collection(COLLECTION_VERIFIED_IDENTITIES);
}

/**
 * Find an existing verifiedIdentities record for this HMAC identifier, or
 * create a new one. This is the actual cross-tenant resolution mechanism:
 * if a record already exists for this identifier, the person who just
 * completed KYC IS the same real person as whoever created that record,
 * regardless of tenant, uid, or purpose.
 *
 * Race-safe: uses a Firestore transaction so two concurrent webhook
 * deliveries for the same identifier can't create two records.
 *
 * @param {object} params
 * @param {FirebaseFirestore.Firestore} [params.db]
 * @param {{scheme:string, version:number, value:string}} params.identifier
 * @returns {Promise<{verifiedIdentityId: string, matched: boolean}>}
 *   `matched: true`  — an existing record was found and reused (cross-tenant link).
 *   `matched: false` — no existing record; a new one was created.
 */
async function findOrCreateVerifiedIdentity({ db, identifier }) {
  if (!identifier || !identifier.value) throw new Error("findOrCreateVerifiedIdentity: identifier required");
  const database = db || getDb();
  const col = verifiedIdentitiesCollection(database);

  const result = await database.runTransaction(async (txn) => {
    const existingQuery = col
      .where("identifier.scheme", "==", identifier.scheme)
      .where("identifier.version", "==", identifier.version)
      .where("identifier.value", "==", identifier.value)
      .limit(1);
    const existingSnap = await txn.get(existingQuery);

    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      return { verifiedIdentityId: doc.id, matched: true };
    }

    const newRef = col.doc();
    txn.set(newRef, {
      identifier,
      status: "active",
      createdAt: nowTs(),
      recordAnchors: [
        {
          anchorType: "database", // Decided, CODEX S52.62 §4 item 10 — never blockchain/nft here.
          status: "active",
          // FieldValue.serverTimestamp() can't be used inside an array
          // element — use a concrete Timestamp instead (still authoritative
          // enough for an anchor's own bookkeeping field, unlike the top-
          // level createdAt above which benefits from true server time).
          createdAt: admin.firestore.Timestamp.now(),
        },
      ],
    });
    return { verifiedIdentityId: newRef.id, matched: false };
  });

  // Observability (constraint: log line only, no metrics pipeline — Tier 4).
  // Safe to log: opaque doc id + boolean only, no HMAC value, no PII.
  if (result.matched) {
    console.log(`[verifiedIdentity] match found, linked — verifiedIdentityId=${result.verifiedIdentityId}`);
  } else {
    console.warn(`[verifiedIdentity] no match found, created new identity — verifiedIdentityId=${result.verifiedIdentityId}`);
  }

  return result;
}

/**
 * Isolation-boundary-safe existence check (Decided, §4 item 5 / build item 7).
 * Returns ONLY a boolean + opaque id — never any info about which other
 * tenant/context previously created or referenced this identity.
 *
 * @returns {Promise<{exists: boolean, verifiedIdentityId: string|null}>}
 */
async function identityExistsForHmac({ db, identifier }) {
  if (!identifier || !identifier.value) throw new Error("identityExistsForHmac: identifier required");
  const database = db || getDb();
  const snap = await verifiedIdentitiesCollection(database)
    .where("identifier.scheme", "==", identifier.scheme)
    .where("identifier.version", "==", identifier.version)
    .where("identifier.value", "==", identifier.value)
    .limit(1)
    .get();
  if (snap.empty) return { exists: false, verifiedIdentityId: null };
  return { exists: true, verifiedIdentityId: snap.docs[0].id };
}

// ----------------------------
// Retention / deletion (Decided interim default, §5 item 3)
// ----------------------------

/**
 * Remove the HMAC value from a verifiedIdentities record (right-to-erasure
 * style deletion) and write an anonymized audit entry. After this runs, the
 * HMAC value is not recoverable from this record — a future re-verification
 * of the same real person creates a brand-new record rather than resolving
 * to the deleted one (a documented consequence of this interim default, not
 * a bug).
 *
 * @param {object} params
 * @param {FirebaseFirestore.Firestore} [params.db]
 * @param {string} params.verifiedIdentityId
 * @returns {Promise<{ok: boolean, verifiedIdentityId?: string, reason?: string}>}
 */
async function deleteVerifiedIdentity({ db, verifiedIdentityId }) {
  if (!verifiedIdentityId) throw new Error("deleteVerifiedIdentity: verifiedIdentityId required");
  const database = db || getDb();
  const ref = verifiedIdentitiesCollection(database).doc(verifiedIdentityId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: "not_found" };

  await ref.update({
    identifier: admin.firestore.FieldValue.delete(),
    status: "deleted",
    deletedAt: nowTs(),
    recordAnchors: admin.firestore.FieldValue.arrayUnion({
      anchorType: "database",
      status: "released",
      createdAt: admin.firestore.Timestamp.now(), // sentinel not allowed inside array elements
    }),
  });

  // Anonymized audit trail only — no HMAC value, no scheme/version, no PII,
  // nothing reconstructible back to the original identity fields.
  await database.collection(COLLECTION_DELETION_AUDIT).add({
    verifiedIdentityId,
    deletedAt: nowTs(),
    note: "Verified-identity HMAC removed per retention/deletion request (CODEX S52.62 §5 item 3 interim default).",
  });

  console.log(`[verifiedIdentity] deletion completed — verifiedIdentityId=${verifiedIdentityId}`);
  return { ok: true, verifiedIdentityId };
}

module.exports = {
  IDENTITY_HMAC_SCHEME,
  IDENTITY_HMAC_SCHEME_VERSION,
  normalizeIdentityInputs,
  computeIdentityHmac,
  buildVersionedIdentifier,
  buildIdentifierFromVerifiedOutputs,
  findOrCreateVerifiedIdentity,
  identityExistsForHmac,
  deleteVerifiedIdentity,
};
