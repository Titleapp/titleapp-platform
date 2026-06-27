// ----------------------------------------------------------------------------
// services/education/oerCatalog.js — turn-on OER content for health_education
// ----------------------------------------------------------------------------
// The "ATTOM for nursing": a nursing/education worker is only good if it can
// reach real, current course material. This is a VERIFIED catalog of free,
// openly-licensed (CC BY 4.0), NCLEX-aligned nursing textbooks — OpenStax's
// O.N.E. series and the Open RN project — plus a topic lookup that returns the
// real book(s) + canonical link + the attribution a CC-BY reuse requires.
//
// Honest by construction: every entry here is a real, published OER. We do not
// fabricate content; we point the worker at the authoritative source and carry
// the license/attribution so reuse is compliant. ATI is NOT here — ATI is
// proprietary and connects per-institution via LTI (connector id: ati_lti).
//
// Sources (verified 2026-06-26):
//   OpenStax Nursing (O.N.E.) — https://openstax.org/subjects/nursing  (CC BY 4.0)
//   Open RN — https://www.wistechopen.org/open-rn-details              (CC BY 4.0)
// ----------------------------------------------------------------------------

"use strict";

// OpenStax O.N.E. — 8 peer-reviewed books, aligned to the 2023 NCLEX-PN/RN test
// plans. Detail links follow OpenStax's canonical /details/books/<slug> pattern;
// the subject hub is the authoritative fallback.
const OPENSTAX_HUB = "https://openstax.org/subjects/nursing";
const OPENSTAX = [
  { title: "Fundamentals of Nursing",        slug: "fundamentals-of-nursing",        topics: ["fundamentals", "basics", "nursing process", "vital signs", "safety", "hygiene"] },
  { title: "Clinical Nursing Skills",        slug: "clinical-nursing-skills",        topics: ["skills", "procedures", "clinical", "iv", "wound care", "catheter", "injection"] },
  { title: "Pharmacology for Nurses",        slug: "pharmacology-for-nurses",        topics: ["pharmacology", "drugs", "medication", "dosage", "meds", "pharmacokinetics"] },
  { title: "Medical-Surgical Nursing",       slug: "medical-surgical-nursing",       topics: ["med-surg", "medical surgical", "cardiac", "respiratory", "renal", "ecg", "ekg", "telemetry", "rhythm"] },
  { title: "Maternal-Newborn Nursing",       slug: "maternal-newborn-nursing",       topics: ["maternal", "newborn", "ob", "obstetric", "pregnancy", "labor", "neonatal", "fetal"] },
  { title: "Psychiatric-Mental Health Nursing", slug: "psychiatric-mental-health-nursing", topics: ["psych", "mental health", "psychiatric", "behavioral", "depression", "anxiety"] },
  { title: "Nutrition for Nurses",           slug: "nutrition-for-nurses",           topics: ["nutrition", "diet", "feeding", "metabolic"] },
  { title: "Population Health for Nurses",   slug: "population-health-for-nurses",   topics: ["population health", "community", "public health", "epidemiology"] },
];

// Open RN — Chippewa Valley Technical College / WTCS, aligned to the NCLEX-RN
// test plan; includes 25 VR patient-care scenarios (Acadicus). Current editions.
const OPENRN_HUB = "https://www.wistechopen.org/open-rn-details";
const OPENRN = [
  { title: "Nursing Fundamentals, 2nd Edition",                  topics: ["fundamentals", "basics", "nursing process", "safety"] },
  { title: "Nursing Skills, 2nd Edition",                        topics: ["skills", "procedures", "clinical"] },
  { title: "Nursing Pharmacology, 2nd Edition",                  topics: ["pharmacology", "drugs", "medication", "dosage", "meds"] },
  { title: "Nursing Health Alterations",                         topics: ["med-surg", "pathophysiology", "health alterations", "cardiac", "respiratory", "ecg", "rhythm"] },
  { title: "Nursing Management & Professional Concepts, 2nd Ed", topics: ["management", "leadership", "professional", "delegation"] },
  { title: "Nursing Mental Health & Community Concepts, 2nd Ed", topics: ["mental health", "psych", "community", "behavioral"] },
  { title: "Nursing Health Promotion",                           topics: ["health promotion", "prevention", "wellness"] },
  { title: "Medical Terminology, 2nd Edition",                   topics: ["terminology", "vocabulary"] },
  { title: "Nursing Assistant",                                  topics: ["cna", "nursing assistant", "basics"] },
];
const OPENRN_VR = {
  title: "Open RN Virtual Reality Scenarios (25 patient-care sims)",
  platform: "Acadicus",
  topics: ["simulation", "vr", "scenario", "clinical judgment", "patient care"],
};

const CC_BY = "CC BY 4.0";

function openstaxEntry(b) {
  return {
    provider: "OpenStax (O.N.E.)",
    title: b.title,
    url: `https://openstax.org/details/books/${b.slug}`,
    hub: OPENSTAX_HUB,
    license: CC_BY,
    nclex: "Aligned to the 2023 NCLEX-PN/RN test plans",
    attribution: `${b.title}. OpenStax / OER Nursing Essentials (O.N.E.), Rice University. Licensed ${CC_BY}.`,
    topics: b.topics,
  };
}
function openrnEntry(b) {
  return {
    provider: "Open RN (CVTC / WTCS)",
    title: b.title,
    url: OPENRN_HUB,
    hub: OPENRN_HUB,
    license: CC_BY,
    nclex: "Aligned to the NCLEX-RN test plan",
    attribution: `${b.title}. Open RN, Chippewa Valley Technical College (WTCS). Licensed ${CC_BY}.`,
    topics: b.topics,
  };
}

const CATALOG = [
  ...OPENSTAX.map(openstaxEntry),
  ...OPENRN.map(openrnEntry),
  { provider: "Open RN (CVTC / WTCS)", title: OPENRN_VR.title, url: OPENRN_HUB, hub: OPENRN_HUB,
    license: CC_BY, nclex: "Clinical-judgment scenarios for the NCLEX-RN test plan",
    attribution: `${OPENRN_VR.title}. Open RN, CVTC (WTCS), for the ${OPENRN_VR.platform} platform. Licensed ${CC_BY}.`,
    topics: OPENRN_VR.topics, vr: true },
];

/**
 * List the whole catalog (optionally filtered by provider).
 */
function listCatalog(provider) {
  if (!provider) return CATALOG;
  const p = String(provider).toLowerCase();
  return CATALOG.filter(e => e.provider.toLowerCase().includes(p));
}

/**
 * Find OER nursing content for a topic. Keyword match against title + topics.
 * Returns the real books + canonical links + the CC-BY attribution to carry.
 * @param {string} query — e.g. "cardiac rhythms", "pharmacology dosage", "OB"
 */
function findNursingContent(query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return { ok: true, query: "", results: CATALOG.slice(0, 8), note: "Showing the full open nursing catalog." };
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = CATALOG.map(e => {
    const hay = (e.title + " " + e.topics.join(" ")).toLowerCase();
    const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    return { e, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const results = (scored.length ? scored.map(x => x.e) : CATALOG).slice(0, 6);
  return {
    ok: true,
    query: q,
    results,
    note: scored.length
      ? "All results are free, CC BY 4.0, NCLEX-aligned open textbooks — carry the attribution when reusing."
      : "No exact match; showing the open nursing catalog. (ATI proprietary content connects separately via LTI.)",
  };
}

module.exports = { findNursingContent, listCatalog, CATALOG };
