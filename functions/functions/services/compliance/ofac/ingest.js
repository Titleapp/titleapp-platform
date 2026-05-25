"use strict";

/**
 * ofac/ingest.js — CODEX 50.17 P0-2
 *
 * Fetches Treasury OFAC SDN list daily, parses XML, upserts entries into
 * the `ofacEntries` collection. Each entry is indexed by a normalized
 * search key (lowercase, ASCII-folded, suffix-stripped) to support fast
 * lookups in the screen() API.
 *
 * Source: https://www.treasury.gov/ofac/downloads/sdn.xml (legacy stable
 * URL, well-documented format, ~10K entries). The enhanced format at
 * sanctionslistservice.ofac.treas.gov is richer but adds parser
 * complexity. v1 uses the legacy feed.
 *
 * Document representation:
 *   ofacEntries/{uid}                — one doc per SDN entry (uid = OFAC's stable ID)
 *   ofacIngestRuns/{runId}           — per-fetch report for observability
 *
 * Versioning: each fetch overwrites the entry doc — OFAC's UID is stable
 * across updates, so the latest fetch IS the current state. We track the
 * last-fetch SHA per UID; if unchanged, skip the write to save Firestore
 * cost. Removed UIDs (entries delisted) are marked superseded but not
 * deleted — we want a permanent audit trail of what was on the list at
 * any point in time.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

// 2026: Treasury moved the SDN feed from www.treasury.gov to the new
// sanctionslistservice.ofac.treas.gov endpoint. The old URL now 302s
// to here; we hit the new endpoint directly to avoid redirect issues.
const SDN_XML_URL = "https://sanctionslistservice.ofac.treas.gov/api/publicationpreview/exports/sdn.xml";
const USER_AGENT = "SOCIII Regulatory Compliance Service contact@sociii.ai";

// ═══════════════════════════════════════════════════════════════
//  NORMALIZATION (shared with screen.js)
// ═══════════════════════════════════════════════════════════════

const ENTITY_SUFFIXES = [
  "llc", "inc", "incorporated", "corp", "corporation", "ltd", "limited",
  "co", "company", "lp", "llp", "plc", "gmbh", "ag", "sa", "spa",
  "trust", "holdings", "holding", "group", "international", "global",
];

/**
 * Produce a normalized search key.
 * - Lowercase
 * - Strip diacritics (NFD + replace combining marks)
 * - Strip punctuation
 * - Drop entity-form suffixes
 * - Collapse whitespace
 */
function normalize(name) {
  if (!name) return "";
  let s = String(name).normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.toLowerCase();
  s = s.replace(/[.,;:'"`()\[\]\{\}\/\\!?@#$%^&*+=|<>~]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  // Drop trailing entity suffixes
  const tokens = s.split(" ");
  while (tokens.length > 1 && ENTITY_SUFFIXES.includes(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

/**
 * Tokenize a normalized name into a Set for token-overlap matching.
 */
function toTokenSet(normalizedName) {
  return new Set(normalizedName.split(" ").filter(t => t.length >= 2));
}

// ═══════════════════════════════════════════════════════════════
//  XML PARSING (lightweight, no xml2js dep)
// ═══════════════════════════════════════════════════════════════

/**
 * Parse SDN.XML format into an array of entry objects.
 * The legacy format wraps entries in <sdnEntry>...</sdnEntry>.
 * Field accessors are tolerant of missing children.
 */
function parseSdnXml(xml) {
  const entries = [];
  const entryRe = /<sdnEntry>([\s\S]*?)<\/sdnEntry>/g;
  let match;

  while ((match = entryRe.exec(xml)) !== null) {
    const block = match[1];
    const uid = tag(block, "uid");
    if (!uid) continue;

    const sdnType = tag(block, "sdnType") || "Unknown";
    const firstName = tag(block, "firstName");
    const lastName = tag(block, "lastName");
    const title = tag(block, "title");
    const remarks = tag(block, "remarks");

    // Compose the primary name
    let primaryName;
    if (sdnType === "Individual") {
      primaryName = [firstName, lastName].filter(Boolean).join(" ").trim();
    } else {
      // Entities use lastName only
      primaryName = (lastName || firstName || "").trim();
    }
    if (!primaryName) continue;

    // Programs
    const programList = section(block, "programList");
    const programs = [...programList.matchAll(/<program>([^<]+)<\/program>/g)].map(m => m[1].trim()).filter(Boolean);

    // AKAs
    const akaList = section(block, "akaList");
    const akas = [];
    for (const akaMatch of akaList.matchAll(/<aka>([\s\S]*?)<\/aka>/g)) {
      const akaBlock = akaMatch[1];
      const akaFirst = tag(akaBlock, "firstName");
      const akaLast = tag(akaBlock, "lastName");
      const akaType = tag(akaBlock, "type") || "aka";
      const composed = [akaFirst, akaLast].filter(Boolean).join(" ").trim();
      if (composed) akas.push({ name: composed, type: akaType });
    }

    // Addresses
    const addressList = section(block, "addressList");
    const addresses = [];
    for (const addrMatch of addressList.matchAll(/<address>([\s\S]*?)<\/address>/g)) {
      const a = addrMatch[1];
      addresses.push({
        country: tag(a, "country"),
        city: tag(a, "city"),
        stateOrProvince: tag(a, "stateOrProvince"),
        postalCode: tag(a, "postalCode"),
      });
    }

    // Nationalities
    const natList = section(block, "nationalityList");
    const nationalities = [...natList.matchAll(/<country>([^<]+)<\/country>/g)].map(m => m[1].trim());

    // ID documents
    const idList = section(block, "idList");
    const ids = [];
    for (const idMatch of idList.matchAll(/<id>([\s\S]*?)<\/id>/g)) {
      const i = idMatch[1];
      ids.push({
        idType: tag(i, "idType"),
        idNumber: tag(i, "idNumber"),
        idCountry: tag(i, "idCountry"),
      });
    }

    // Date of birth
    const dobList = section(block, "dateOfBirthList");
    const datesOfBirth = [...dobList.matchAll(/<dateOfBirth>([^<]+)<\/dateOfBirth>/g)].map(m => m[1].trim());

    entries.push({
      uid: String(uid),
      sdn_type: sdnType,
      entry_type: sdnType === "Individual" ? "individual" : (sdnType === "Vessel" ? "vessel" : (sdnType === "Aircraft" ? "aircraft" : "entity")),
      primary_name: primaryName,
      title: title || null,
      programs,
      akas,
      addresses,
      nationalities,
      identity_documents: ids,
      dates_of_birth: datesOfBirth,
      remarks: remarks || null,
    });
  }
  return entries;
}

function tag(xml, name) {
  const m = new RegExp(`<${name}>([^<]*)</${name}>`, "i").exec(xml);
  return m ? m[1].trim() : null;
}

function section(xml, name) {
  const m = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "i").exec(xml);
  return m ? m[1] : "";
}

// ═══════════════════════════════════════════════════════════════
//  INGEST
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch + parse + upsert. Returns a per-run report.
 */
async function runOfacIngest({ trigger = "scheduled" } = {}) {
  const db = getDb();
  const runId = `ofac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = ts();

  await db.collection("ofacIngestRuns").doc(runId).set({
    runId,
    trigger,
    source: "treasury-sdn-xml",
    startedAt,
    status: "running",
  });

  const totals = { fetched: 0, parsed: 0, created: 0, updated: 0, unchanged: 0, superseded: 0, failed: 0 };
  const errors = [];

  let xml;
  try {
    const r = await fetch(SDN_XML_URL, { headers: { "User-Agent": USER_AGENT, "Accept": "application/xml" } });
    if (!r.ok) throw new Error(`SDN fetch HTTP ${r.status}`);
    xml = await r.text();
  } catch (e) {
    errors.push(`fetch: ${e.message}`);
    await db.collection("ofacIngestRuns").doc(runId).update({
      status: "failed",
      completedAt: ts(),
      totals,
      errors,
    });
    return { runId, totals, errors };
  }
  totals.fetched = xml.length;

  const entries = parseSdnXml(xml);
  totals.parsed = entries.length;

  // OPTIMIZATION: bulk-read existing entries once into a Map<uid, {sha256, superseded}>
  // instead of doing one Firestore read per entry. Cuts first-ingest time from
  // ~15 minutes to ~30 seconds. Subsequent ingests use the same map for hash
  // comparison.
  const existingMap = new Map();
  let pageStart = null;
  while (true) {
    let q = db.collection("ofacEntries").select("sha256", "superseded").limit(1000);
    if (pageStart) q = q.startAfter(pageStart);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      existingMap.set(d.id, { sha256: d.data().sha256, superseded: d.data().superseded });
    }
    if (snap.size < 1000) break;
    pageStart = snap.docs[snap.docs.length - 1];
  }

  // Track which UIDs we saw this run, to mark removed entries superseded
  const seenUids = new Set();

  // Batch upserts (450 per batch)
  let batch = db.batch();
  let batchCount = 0;

  for (const entry of entries) {
    try {
      const ref = db.collection("ofacEntries").doc(entry.uid);
      seenUids.add(entry.uid);

      // Compute search keys
      const normalized_primary = normalize(entry.primary_name);
      const normalized_akas = (entry.akas || []).map(a => normalize(a.name)).filter(Boolean);
      const all_search_keys = [normalized_primary, ...normalized_akas].filter(Boolean);

      // Hash for change detection
      const sha256 = crypto.createHash("sha256")
        .update(JSON.stringify({ ...entry, normalized_primary, normalized_akas }))
        .digest("hex");

      // Check via in-memory map (no Firestore read)
      const existing = existingMap.get(entry.uid);
      if (existing && existing.sha256 === sha256 && !existing.superseded) {
        totals.unchanged++;
        continue;
      }

      const docData = {
        ...entry,
        normalized_primary,
        normalized_akas,
        all_search_keys,
        sha256,
        superseded: false,
        supersededAt: null,
        last_seen_run: runId,
        last_seen_at: ts(),
        updatedAt: ts(),
        ...(existing ? {} : { createdAt: ts() }),
      };

      batch.set(ref, docData, { merge: true });
      batchCount++;
      if (existing) totals.updated++; else totals.created++;

      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    } catch (e) {
      totals.failed++;
      errors.push(`uid ${entry.uid}: ${e.message}`);
    }
  }
  if (batchCount > 0) await batch.commit();

  // Mark removed entries (in our DB but not in the latest fetch) as superseded.
  // Done in pages to avoid loading all entries at once.
  let pageToken = null;
  let supersedeBatch = db.batch();
  let supersedeCount = 0;
  do {
    let q = db.collection("ofacEntries")
      .where("superseded", "==", false)
      .limit(500);
    if (pageToken) q = q.startAfter(pageToken);
    const snap = await q.get();
    if (snap.empty) break;

    for (const d of snap.docs) {
      if (!seenUids.has(d.id)) {
        supersedeBatch.update(d.ref, { superseded: true, supersededAt: ts(), supersedingRunId: runId });
        supersedeCount++;
        totals.superseded++;
        if (supersedeCount >= 450) {
          await supersedeBatch.commit();
          supersedeBatch = db.batch();
          supersedeCount = 0;
        }
      }
    }
    pageToken = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) break;
  } while (pageToken);
  if (supersedeCount > 0) await supersedeBatch.commit();

  await db.collection("ofacIngestRuns").doc(runId).update({
    status: "completed",
    completedAt: ts(),
    totals,
    errors,
  });

  return { runId, totals, errors };
}

module.exports = { runOfacIngest, normalize, toTokenSet, parseSdnXml };
