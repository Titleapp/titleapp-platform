// services/ir/contactsBridge.js
// Bridge between the contacts spine and the IR worker's investor records.
// Per docs/specs/CODEX-S52.1-Contacts-IR-Bridge.md.
//
// Capabilities:
//   - listEligibleContacts(filters) — contacts that COULD be invited but aren't yet
//   - importFromContacts(contactIds) — bulk-create investor records with contact back-ref
//   - recordIrEventOnContact(event) — sync hook called from investorFlow callbacks
//
// Design:
//   - Investor records get a contactId field linking back to source contact
//   - Source contacts get engagementHistory[] events when investor lifecycle advances
//   - Contacts also get fundraiseStatus.{fundraiseId} for quick filtering
//   - Dedup by email (lowercased) so re-importing the same contact is idempotent

const admin = require("firebase-admin");
const crypto = require("crypto");
const { initiateInvestorFlow } = require("./investorFlow");

function getDb() { return admin.firestore(); }
function ts() { return admin.firestore.FieldValue.serverTimestamp(); }

const DEFAULT_FUNDRAISE_ID = "fundraise-001";

/**
 * Extract the primary email from a contact (v2.1 spine schema).
 * Falls back from top-level email to first persona's email.
 */
function _primaryEmail(contact) {
  if (contact.email) return contact.email;
  if (Array.isArray(contact.personas) && contact.personas[0]?.email) {
    return contact.personas[0].email;
  }
  return null;
}

/**
 * Extract the display name from a contact (v2.1 spine schema).
 */
function _primaryName(contact) {
  if (contact.name) return contact.name;
  if (Array.isArray(contact.personas) && contact.personas[0]?.name) {
    return contact.personas[0].name;
  }
  return "";
}

/**
 * List contacts that are eligible to be added as investor prospects to a fundraise.
 * Filters out contacts already invited (by email match).
 *
 * @param {Object} opts
 * @param {string} [opts.fundraiseId] - Default fundraise-001
 * @param {string} [opts.segment] - Filter by segments[] array-contains
 * @param {string} [opts.persona_type] - Filter by types_index[] array-contains (e.g., "investor")
 * @param {string} [opts.persona_tier] - Filter by tiers_index[] array-contains
 * @param {number} [opts.limit] - Default 100
 * @returns {Promise<{eligible: Array, alreadyInvited: Array, totalScanned: number}>}
 */
async function listEligibleContacts(opts = {}) {
  const {
    fundraiseId = DEFAULT_FUNDRAISE_ID,
    segment = null,
    persona_type = null,
    persona_tier = null,
    limit = 100,
  } = opts;

  const db = getDb();

  // 1. Query contacts with the supplied filter
  let q = db.collection("contacts");
  if (segment) q = q.where("segments", "array-contains", segment);
  if (persona_type) q = q.where("types_index", "array-contains", persona_type);
  if (persona_tier) q = q.where("tiers_index", "array-contains", persona_tier);
  q = q.limit(limit);

  const snap = await q.get();
  const allContacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 2. Build a set of existing investor emails for dedup
  const invSnap = await db.collection("fundraises").doc(fundraiseId)
    .collection("investors").get();
  const existingEmails = new Set(
    invSnap.docs.map(d => (d.data().email || "").toLowerCase()).filter(Boolean)
  );

  // 3. Split into eligible vs already-invited
  const eligible = [];
  const alreadyInvited = [];
  let skippedNoEmail = 0;

  for (const c of allContacts) {
    const email = _primaryEmail(c);
    if (!email) { skippedNoEmail++; continue; }

    const shape = {
      contactId: c.id,
      name: _primaryName(c),
      email,
      segments: c.segments || [],
      types: c.types_index || [],
      tiers: c.tiers_index || [],
      personaCount: Array.isArray(c.personas) ? c.personas.length : 0,
    };

    if (existingEmails.has(email.toLowerCase())) {
      alreadyInvited.push(shape);
    } else {
      eligible.push(shape);
    }
  }

  return {
    eligible,
    alreadyInvited,
    totalScanned: allContacts.length,
    skippedNoEmail,
  };
}

/**
 * Bulk-create investor records from contactIds.
 * Dedup by email. Each new investor record carries a contactId back-reference.
 * Each source contact gets a fundraiseStatus.{id} field + ir.staged or ir.invited
 * engagement event.
 *
 * @param {Object} opts
 * @param {string} [opts.fundraiseId] - Default fundraise-001
 * @param {string[]} opts.contactIds - List of contact doc IDs to import
 * @param {boolean} [opts.sendInvitesNow] - If true, fires investorFlow which sends invite email
 * @param {string} [opts.invitedBy] - UID of importer for audit
 * @returns {Promise<{created: number, skipped: number, errors: Array, createdIds: string[]}>}
 */
async function importFromContacts(opts = {}) {
  const {
    fundraiseId = DEFAULT_FUNDRAISE_ID,
    contactIds = [],
    sendInvitesNow = false,
    invitedBy = null,
  } = opts;

  const db = getDb();

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return { created: 0, skipped: 0, errors: [], createdIds: [] };
  }

  // 1. Fetch all contact docs
  const contacts = [];
  for (const cid of contactIds) {
    try {
      const snap = await db.collection("contacts").doc(cid).get();
      if (snap.exists) contacts.push({ id: snap.id, ...snap.data() });
    } catch (e) {
      // skip silently — will surface as missing in errors below
    }
  }

  // 2. Build existing investor emails set for dedup
  const invSnap = await db.collection("fundraises").doc(fundraiseId)
    .collection("investors").get();
  const existingEmails = new Set(
    invSnap.docs.map(d => (d.data().email || "").toLowerCase()).filter(Boolean)
  );

  let created = 0;
  let skipped = 0;
  const errors = [];
  const createdIds = [];

  // 3. Process each contact
  for (const c of contacts) {
    try {
      const email = _primaryEmail(c);
      const name = _primaryName(c);

      if (!email) {
        errors.push({ contactId: c.id, reason: "no_email" });
        continue;
      }
      if (!name) {
        errors.push({ contactId: c.id, reason: "no_name" });
        continue;
      }
      if (existingEmails.has(email.toLowerCase())) {
        skipped++;
        continue;
      }

      let investorId;

      if (sendInvitesNow) {
        // Use existing investorFlow — sends invite email automatically
        const result = await initiateInvestorFlow({
          email,
          name,
          fundraiseId,
          invitedBy,
          suppressEmail: false,
        });
        investorId = result.investorId;
        // Stamp contactId back-reference on the investor record
        await db.collection("fundraises").doc(fundraiseId)
          .collection("investors").doc(investorId)
          .set({ contactId: c.id }, { merge: true });
      } else {
        // Stage-only — create investor record without firing invite email
        investorId = `inv_${crypto.randomBytes(8).toString("hex")}`;
        await db.collection("fundraises").doc(fundraiseId)
          .collection("investors").doc(investorId).set({
            investorId,
            contactId: c.id,
            email: email.toLowerCase(),
            name,
            commitment_amount: null,
            kycStatus: "not_submitted",
            accreditationStatus: "unverified",
            flowStep: "staged",
            invitedBy,
            stagedAt: ts(),
            created_at: ts(),
            updated_at: ts(),
          });
      }

      // Write back to the source contact
      await db.collection("contacts").doc(c.id).set({
        [`fundraiseStatus.${fundraiseId}`]: sendInvitesNow ? "invited" : "staged",
        engagementHistory: admin.firestore.FieldValue.arrayUnion({
          type: sendInvitesNow ? "ir.invited" : "ir.staged",
          fundraiseId,
          investorId,
          at: new Date().toISOString(),
          invitedBy,
        }),
      }, { merge: true });

      existingEmails.add(email.toLowerCase());
      createdIds.push(investorId);
      created++;
    } catch (e) {
      errors.push({ contactId: c.id, reason: e.message || "unknown_error" });
    }
  }

  return { created, skipped, errors, createdIds };
}

/**
 * Sync hook called from investorFlow lifecycle events to write an engagement
 * event back to the source contact.
 *
 * @param {Object} opts
 * @param {string} opts.investorId - The investor record ID
 * @param {string} [opts.fundraiseId] - Default fundraise-001
 * @param {string} opts.type - Event type (e.g., "ir.signed_safe", "ir.kyc_complete")
 * @param {Object} [opts.extra] - Additional fields to include in the event
 */
async function recordIrEventOnContact(opts = {}) {
  const {
    investorId,
    fundraiseId = DEFAULT_FUNDRAISE_ID,
    type,
    extra = {},
  } = opts;

  if (!investorId || !type) return;

  try {
    const db = getDb();
    const invSnap = await db.collection("fundraises").doc(fundraiseId)
      .collection("investors").doc(investorId).get();
    if (!invSnap.exists) return;
    const { contactId } = invSnap.data();
    if (!contactId) return;

    // Derive a quick status from event type
    const statusFromType = (t) => {
      if (t === "ir.invited") return "invited";
      if (t === "ir.kyc_complete") return "kyc_verified";
      if (t === "ir.signed_safe") return "signed";
      if (t === "ir.voted") return "voted";
      if (t === "ir.declined") return "declined";
      return null;
    };
    const status = extra.status || statusFromType(type);

    const update = {
      engagementHistory: admin.firestore.FieldValue.arrayUnion({
        type,
        fundraiseId,
        investorId,
        at: new Date().toISOString(),
        ...extra,
      }),
    };
    if (status) {
      update[`fundraiseStatus.${fundraiseId}`] = status;
    }

    await db.collection("contacts").doc(contactId).set(update, { merge: true });
  } catch (e) {
    console.error("[contactsBridge.recordIrEventOnContact] error:", e.message);
    // never throw — sync failures must not break the investor flow itself
  }
}

/**
 * Inverse lookup: given an investorId, return the linked contact summary.
 */
async function getInvestorContactLink(opts = {}) {
  const { investorId, fundraiseId = DEFAULT_FUNDRAISE_ID } = opts;
  if (!investorId) return null;

  const db = getDb();
  const invSnap = await db.collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId).get();
  if (!invSnap.exists) return null;
  const { contactId, email, name } = invSnap.data();
  if (!contactId) return { investorId, contactId: null, email, name };

  const cSnap = await db.collection("contacts").doc(contactId).get();
  if (!cSnap.exists) return { investorId, contactId, email, name, contact: null };
  const c = cSnap.data();
  return {
    investorId,
    contactId,
    email,
    name,
    contact: {
      name: _primaryName(c),
      email: _primaryEmail(c),
      segments: c.segments || [],
      types: c.types_index || [],
      personaCount: Array.isArray(c.personas) ? c.personas.length : 0,
      fundraiseStatus: c.fundraiseStatus?.[fundraiseId] || null,
    },
  };
}

module.exports = {
  listEligibleContacts,
  importFromContacts,
  recordIrEventOnContact,
  getInvestorContactLink,
};
