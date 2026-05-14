"use strict";

/**
 * Import Sean's LinkedIn connections CSV into the TitleApp AI workspace.
 * Mirrors importContactsFromCsvAndAccelerator.js but scoped to a single
 * LinkedIn export and tagged with Sean's identity as source_member_uid.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... \
 *   TENANT_ID=ws_1778652045795_vk4sz1 \
 *   SOURCE_MEMBER_UID=4WHjuUgEseQfBr0Tg92YXXhu6Mj1 \
 *     node scripts/importSeanLinkedin.js            # dry run
 *
 *   ... node scripts/importSeanLinkedin.js --apply  # write
 */

const path = require("path");
const fs = require("fs");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
const { parse } = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "csv-parse", "dist", "cjs", "sync.cjs"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const TENANT_ID = process.env.TENANT_ID;
const SOURCE_MEMBER_UID = process.env.SOURCE_MEMBER_UID;
if (!TENANT_ID) { console.error("ERROR: set TENANT_ID"); process.exit(1); }
if (!SOURCE_MEMBER_UID) { console.error("ERROR: set SOURCE_MEMBER_UID"); process.exit(1); }

const CSV_PATH = "/Users/seancombs/Downloads/Basic_LinkedInDataExport_05-14-2026.zip (1)/Connections.csv";

// Persona inference — same heuristics as Kent's import.
const INVESTOR_RE = /\b(partner|investor|managing director|principal|associate|venture|angel|fund|capital|accelerator|incubator|lp|gp)\b/i;
const MEDIA_RE = /\b(editor|reporter|journalist|producer|host|columnist|writer|correspondent)\b/i;
const CSUITE_RE = /\b(ceo|cto|cfo|coo|cmo|chief|founder|co-founder|president|head of)\b/i;
const LAWYER_RE = /\b(counsel|attorney|partner.*law|associate.*law|legal)\b/i;
const RECRUITER_RE = /\b(recruiter|talent acquisition|hr business partner)\b/i;
const ACCELERATOR_CO = /\b(accelerator|incubator|y combinator|techstars|500 (global|startups)|seedcamp|mass challenge|plug and play|alchemist)\b/i;

function inferPersona(firstName, lastName, company, title) {
  const tags = ["source-linkedin-sean", "imported-from-sean-network"];
  const t = (title || "").trim();
  const c = (company || "").trim();
  let type = "customer"; // default — B2B-ish prospect
  let tier = "professional";
  let lead_score = 30;
  let role_label = t || "LinkedIn connection";

  if (INVESTOR_RE.test(t) || ACCELERATOR_CO.test(c)) {
    type = "investor"; tier = "investor"; lead_score = 70;
    tags.push("inferred-investor", "needs-accreditation-check");
  } else if (MEDIA_RE.test(t)) {
    type = "journalist"; tier = "professional"; lead_score = 50;
    tags.push("inferred-media");
  } else if (LAWYER_RE.test(t)) {
    type = "professional_services"; tier = "vendor"; lead_score = 40;
    tags.push("inferred-legal");
  } else if (RECRUITER_RE.test(t)) {
    type = "professional_services"; tier = "vendor"; lead_score = 30;
    tags.push("inferred-recruiter");
  } else if (CSUITE_RE.test(t)) {
    type = "customer"; tier = "prospect"; lead_score = 60;
    tags.push("inferred-csuite");
  } else if (c) {
    type = "customer"; tier = "prospect"; lead_score = 40;
    tags.push("inferred-b2b");
  }

  return {
    id: "p_001",
    role_label,
    type,
    tier,
    lifecycle_stage: "cold",
    lead_score,
    tags,
    notes: null,
    owner: SOURCE_MEMBER_UID,
    project_bindings: [],
    created_at: new Date().toISOString(),
    last_interaction_at: null,
  };
}

function parseLinkedInDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---- Read + parse ----
console.log("\nReading:", CSV_PATH);
const text = fs.readFileSync(CSV_PATH, "utf8");

// LinkedIn export prefixes the file with 3 "Notes:" lines + blank line
// before the real CSV header. Find the actual header row and slice.
const lines = text.split(/\r?\n/);
const headerIdx = lines.findIndex(l => /^First Name,Last Name,/.test(l));
if (headerIdx < 0) { console.error("Could not find CSV header row"); process.exit(1); }
console.log(`Skipping ${headerIdx} preamble lines`);
const csvBody = lines.slice(headerIdx).join("\n");

const rows = parse(csvBody, { columns: true, skip_empty_lines: true, relax_column_count: true });
console.log(`Parsed ${rows.length} rows`);

// ---- Build contact docs ----
const contacts = [];
let skipped = 0;
for (const r of rows) {
  const firstName = (r["First Name"] || "").trim();
  const lastName  = (r["Last Name"] || "").trim();
  const company   = (r["Company"] || "").trim() || null;
  const title     = (r["Position"] || "").trim() || null;
  const email     = (r["Email Address"] || "").trim().toLowerCase() || null;
  const url       = (r["URL"] || "").trim() || null;
  const connectedOn = parseLinkedInDate(r["Connected On"]);
  if (!firstName && !lastName) { skipped += 1; continue; }
  const fullName = `${firstName} ${lastName}`.trim();
  const persona = inferPersona(firstName, lastName, company, title);
  const segments = ["linkedin-network-sean"];
  if (persona.tags.includes("inferred-investor")) segments.push("investor-candidates-sean");
  if (persona.tags.includes("inferred-media")) segments.push("media-contacts-sean");
  if (persona.tags.includes("inferred-csuite")) segments.push("b2b-csuite-sean");

  contacts.push({
    tenantId: TENANT_ID,
    schema_version: "spine_v2.1",
    name: fullName,
    first_name: firstName || null,
    last_name: lastName || null,
    email,
    phone: null,
    company,
    title,
    source: "linkedin-sean",
    enrichment: url ? { linkedin_url: url } : null,
    segments,
    primary_persona_id: persona.id,
    personas: [persona],
    tiers_index: [persona.tier],
    types_index: [persona.type],
    linkedin_url: url,
    linkedin_connected_on: connectedOn,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: SOURCE_MEMBER_UID,
    source_member_uid: SOURCE_MEMBER_UID,
    imported_at: admin.firestore.FieldValue.serverTimestamp(),
    enrichment_history: [],
  });
}

// ---- Summary ----
const summary = {
  total_rows: rows.length,
  skipped_no_name: skipped,
  to_write: contacts.length,
  with_email: contacts.filter(c => c.email).length,
  with_company: contacts.filter(c => c.company).length,
  by_persona_type: {},
};
for (const c of contacts) {
  const t = c.personas[0].type;
  summary.by_persona_type[t] = (summary.by_persona_type[t] || 0) + 1;
}
console.log("\nImport plan:", JSON.stringify(summary, null, 2));

if (!APPLY) {
  console.log("\n(dry run — pass --apply to write)");
  console.log("\nFirst 3 contacts:");
  for (const c of contacts.slice(0, 3)) {
    console.log(`  - ${c.name} | ${c.email || "no-email"} | ${c.title || "no-title"} @ ${c.company || "no-company"} | persona=${c.personas[0].type}/${c.personas[0].tier}`);
  }
  process.exit(0);
}

// ---- Write in batches of 450 ----
(async () => {
  let written = 0;
  for (let i = 0; i < contacts.length; i += 450) {
    const slice = contacts.slice(i, i + 450);
    const batch = db.batch();
    for (const c of slice) {
      const ref = db.collection("contacts").doc();
      batch.set(ref, c);
      written += 1;
    }
    await batch.commit();
    console.log(`  committed ${written}/${contacts.length}`);
  }
  console.log(`\nDONE — wrote ${written} contacts.`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
