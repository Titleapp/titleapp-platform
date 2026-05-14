"use strict";

/**
 * One-shot import: Kent's LinkedIn CSV + Accelerator Tracker xlsx → contacts collection.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... TENANT_ID=<id> node scripts/importContactsFromCsvAndAccelerator.js          (dry-run breakdown)
 *   GOOGLE_APPLICATION_CREDENTIALS=... TENANT_ID=<id> node scripts/importContactsFromCsvAndAccelerator.js --apply  (write)
 *
 * Inputs (hardcoded — change if files move):
 *   /Users/seancombs/Downloads/Connections KR (1).csv          — LinkedIn export
 *   /Users/seancombs/Downloads/TitleApp-Accelerator-Tracker (2).xlsx — investor program tracker
 *
 * Writes:
 *   - contacts/{auto-id} with schema_version=spine_v2.1 and personas[] populated
 *   - source: "linkedin-export-kent" or "accelerator-tracker"
 *   - segments: per-source segment id (matches segments collection if it exists)
 *
 * Persona inference for Kent's list:
 *   - investor: company name OR position contains capital/ventures/partners/fund/etc
 *   - media:    position contains journalist/editor/reporter/writer/producer/etc
 *   - b2b-prospect: title is C-suite/founder/owner AND not investor/media
 *   - default:  professional (linkedin-network-kent) — review pile
 *
 * Accelerator tracker rows are imported as ORGANIZATIONS (no person yet).
 * Each becomes a contact with name=<program name>, persona type=investor,
 * tier=investor, segment=accelerators-fundraise, plus enrichment carrying
 * deal/equity/deadline/pitch-angle/priority so the right people can be
 * located via Apollo later.
 */

const path = require("path");
const fs = require("fs");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
const xlsx = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "xlsx"));
const { parse: csvParse } = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "csv-parse", "dist", "cjs", "sync.cjs"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const TENANT_ID = process.env.TENANT_ID;
if (!TENANT_ID) {
  console.error("ERROR: set TENANT_ID env var (which workspace are we importing into?)");
  process.exit(1);
}

const LINKEDIN_CSV = "/Users/seancombs/Downloads/Connections KR (1).csv";
const ACCELERATOR_XLSX = "/Users/seancombs/Downloads/TitleApp-Accelerator-Tracker (2).xlsx";

// ── Persona inference for LinkedIn rows ────────────────────────────────────

const INVESTOR_REGEX = /\b(capital|ventures?|partners?|fund|funds|equity|seed|angel|investor|holdings|asset management|wealth|family office|growth)\b/i;
const INVESTOR_POSITION_REGEX = /\b(partner|principal|managing director|md\b|general partner|gp\b|venture|investor|portfolio|associate)\b/i;
const MEDIA_POSITION_REGEX = /\b(journalist|editor|reporter|writer|producer|correspondent|columnist|anchor|host|publisher|contributor)\b/i;
const MEDIA_COMPANY_REGEX = /\b(times|journal|news|magazine|media|press|tribune|gazette|herald|post|cnn|bbc|forbes|fortune|bloomberg|reuters|axios|techcrunch|wired|verge|protocol|business insider|wall street|wsj|atlantic|guardian|economist)\b/i;
const CSUITE_REGEX = /\b(ceo|chief executive|cfo|chief financial|coo|chief operating|cto|chief technology|cmo|chief marketing|president|founder|co-founder|owner|managing partner)\b/i;

const RE_REGEX = /\b(real estate|realtor|broker|brokerage|developer|developers|title|escrow|land|property|properties|reit|construction|builder|builders)\b/i;
const AVIATION_REGEX = /\b(aviation|aviator|aircraft|airline|pilot|fbo|charter|airport|jet|airways|airlines|aero|flight|nbaa|part 135|part 121)\b/i;
const AUTO_REGEX = /\b(automotive|dealer|dealership|cars|motors|ford|toyota|honda|chevrolet|lexus|bmw|mercedes|porsche)\b/i;
const HEALTHCARE_REGEX = /\b(hospital|health|medical|clinic|physician|doctor|md\b|surgeon|nurse|nursing|pharma|biotech|ems|emergency medical)\b/i;
const GOV_REGEX = /\b(government|department|agency|commission|state of|city of|county|federal|public sector|gao|sec\b|dot\b|fcc\b|epa\b)\b/i;

function inferPersona(row) {
  const { firstName, lastName, company, position } = row;
  const fullText = `${company || ""} ${position || ""}`.trim();

  let type = "customer";
  let tier = "professional";
  let segments = ["linkedin-network-kent"];
  let tags = ["source-linkedin", "imported-from-kent"];
  let lead_score = 0;

  const isInvestor = INVESTOR_REGEX.test(company || "") || INVESTOR_POSITION_REGEX.test(position || "");
  const isMedia = MEDIA_POSITION_REGEX.test(position || "") || MEDIA_COMPANY_REGEX.test(company || "");
  const isCsuite = CSUITE_REGEX.test(position || "");

  if (isInvestor) {
    type = "investor";
    tier = "investor";
    segments.push("kent-investor-candidates");
    tags.push("inferred-investor", "needs-accreditation-check");
    lead_score = 50;
  } else if (isMedia) {
    type = "customer";
    tier = "professional";
    segments.push("kent-media-contacts");
    tags.push("inferred-media");
    lead_score = 30;
  } else if (isCsuite) {
    type = "customer";
    tier = "prospect";
    segments.push("kent-b2b-prospects");
    tags.push("inferred-csuite");
    lead_score = 40;
  } else {
    segments.push("kent-review-pile");
    tags.push("needs-review");
  }

  // Vertical tagging — fires regardless of role bucket
  if (RE_REGEX.test(fullText)) tags.push("vertical-real-estate");
  if (AVIATION_REGEX.test(fullText)) tags.push("vertical-aviation");
  if (AUTO_REGEX.test(fullText)) tags.push("vertical-auto");
  if (HEALTHCARE_REGEX.test(fullText)) tags.push("vertical-healthcare");
  if (GOV_REGEX.test(fullText)) tags.push("vertical-government");

  return {
    type,
    tier,
    role_label: position || type,
    lifecycle_stage: "cold",
    lead_score,
    segments,
    tags,
  };
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseLinkedInCsv() {
  // LinkedIn export has 3 lines of notes/blank above the real CSV header.
  // Skip until we find the header line.
  const raw = fs.readFileSync(LINKEDIN_CSV, "utf8");
  const lines = raw.split(/\r?\n/);
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("First Name,Last Name,URL,")) { headerIdx = i; break; }
  }
  if (headerIdx === -1) throw new Error("Couldn't find LinkedIn CSV header");
  const csvBody = lines.slice(headerIdx).join("\n");
  const rows = csvParse(csvBody, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
  return rows.map(r => ({
    firstName: (r["First Name"] || "").trim(),
    lastName: (r["Last Name"] || "").trim(),
    url: (r["URL"] || "").trim(),
    email: (r["Email Address"] || "").trim().toLowerCase() || null,
    company: (r["Company"] || "").trim(),
    position: (r["Position"] || "").trim(),
    connectedOn: (r["Connected On"] || "").trim(),
  })).filter(r => r.firstName || r.lastName);
}

function parseAcceleratorXlsx() {
  const wb = xlsx.readFile(ACCELERATOR_XLSX);
  const sheet = wb.Sheets["Accelerator Tracker"];
  // Use sheet_to_json with header:1 to get raw rows, then identify the header row.
  const all = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  // Header row contains "Tier" in col 0 and "Program" in col 1
  let headerIdx = -1;
  for (let i = 0; i < all.length; i++) {
    if (all[i][0] === "Tier" && all[i][1] === "Program") { headerIdx = i; break; }
  }
  if (headerIdx === -1) throw new Error("Couldn't find accelerator header row");
  const dataRows = all.slice(headerIdx + 1).filter(r => r[1]); // require Program name
  return dataRows.map(r => ({
    tier:        r[0],
    program:     r[1],
    deal:        r[2],
    equity:      r[3],
    deadline:    r[4],
    focusFit:    r[5],
    pitchAngle:  r[6],
    website:     r[7],
    status:      r[8],
    owner:       r[9],
    notes:       r[10],
    priority:    r[11],
  }));
}

// ── Build contact docs (spine v2.1) ────────────────────────────────────────

function nowTs() { return admin.firestore.FieldValue.serverTimestamp(); }
function nowIso() { return new Date().toISOString(); }

function buildLinkedInContact(row) {
  const persona = inferPersona(row);
  const fullName = `${row.firstName} ${row.lastName}`.trim();
  const personaId = "p_001";
  return {
    tenantId: TENANT_ID,
    schema_version: "spine_v2.1",
    name: fullName,
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email,
    phone: null,
    company: row.company || null,
    title: row.position || null,
    source: "linkedin-export-kent",
    enrichment: {
      linkedin_url: row.url || null,
      connected_on: row.connectedOn || null,
      imported_from: "Kent Redwine LinkedIn export 2026-05-14",
    },
    segments: persona.segments,
    primary_persona_id: personaId,
    personas: [{
      id: personaId,
      role_label: persona.role_label,
      type: persona.type,
      tier: persona.tier,
      lifecycle_stage: persona.lifecycle_stage,
      lead_score: persona.lead_score,
      tags: persona.tags,
      notes: null,
      owner: null,
      project_bindings: [],
      created_at: nowIso(),
      last_interaction_at: null,
    }],
    tiers_index: [persona.tier],
    types_index: [persona.type],
    // Back-compat mirrors
    type: persona.type,
    contact_tier: persona.tier,
    lifecycle_stage: persona.lifecycle_stage,
    lead_score: persona.lead_score,
    tags: persona.tags,
    created_at: nowTs(),
    updated_at: nowTs(),
  };
}

function buildAcceleratorContact(row) {
  const personaId = "p_001";
  const tags = ["accelerator-program", "accredited-investor-org"];
  if (row.priority && /high/i.test(row.priority)) tags.push("priority-high");
  if (row.tier && /apply now/i.test(row.tier)) tags.push("tier-apply-now");
  return {
    tenantId: TENANT_ID,
    schema_version: "spine_v2.1",
    name: row.program,
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    company: row.program,
    title: "Accelerator Program",
    source: "accelerator-tracker",
    enrichment: {
      website: row.website || null,
      deal_terms: row.deal || null,
      equity: row.equity || null,
      deadline: row.deadline || null,
      focus_fit: row.focusFit || null,
      pitch_angle: row.pitchAngle || null,
      status: row.status || null,
      owner: row.owner || null,
      priority: row.priority || null,
      tier: row.tier || null,
      notes: row.notes || null,
      imported_from: "TitleApp Accelerator Tracker 2026-04",
    },
    segments: ["accelerators-fundraise"],
    primary_persona_id: personaId,
    personas: [{
      id: personaId,
      role_label: "accelerator-program",
      type: "investor",
      tier: "investor",
      lifecycle_stage: "cold",
      lead_score: /high/i.test(row.priority || "") ? 70 : 50,
      tags,
      notes: row.notes || null,
      owner: row.owner || null,
      project_bindings: [],
      created_at: nowIso(),
      last_interaction_at: null,
    }],
    tiers_index: ["investor"],
    types_index: ["investor"],
    type: "investor",
    contact_tier: "investor",
    lifecycle_stage: "cold",
    lead_score: /high/i.test(row.priority || "") ? 70 : 50,
    tags,
    created_at: nowTs(),
    updated_at: nowTs(),
  };
}

// ── Main ───────────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — tenant=${TENANT_ID}\n`);

  const liRows = parseLinkedInCsv();
  const accRows = parseAcceleratorXlsx();

  console.log(`LinkedIn rows: ${liRows.length}`);
  console.log(`Accelerator rows: ${accRows.length}\n`);

  // Build all contacts and breakdown
  const liContacts = liRows.map(buildLinkedInContact);
  const accContacts = accRows.map(buildAcceleratorContact);

  const segmentCounts = {};
  for (const c of [...liContacts, ...accContacts]) {
    for (const seg of c.segments) segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
  }

  console.log("Segment breakdown:");
  for (const [seg, count] of Object.entries(segmentCounts).sort((a,b)=>b[1]-a[1])) {
    console.log(`  ${seg.padEnd(35)} ${count}`);
  }

  // Sample previews
  console.log("\nSample LinkedIn contacts (5):");
  for (const c of liContacts.slice(0, 5)) {
    console.log(`  ${c.name.padEnd(30)} | ${(c.company||'').slice(0,25).padEnd(25)} | ${(c.title||'').slice(0,30).padEnd(30)} | ${c.personas[0].type}/${c.personas[0].tier} | tags: ${c.personas[0].tags.slice(0,3).join(',')}`);
  }
  console.log("\nSample Accelerator contacts (5):");
  for (const c of accContacts.slice(0, 5)) {
    console.log(`  ${c.name.padEnd(30)} | ${(c.enrichment.tier||'').padEnd(18)} | ${(c.enrichment.deadline||'').slice(0,30).padEnd(30)} | priority=${c.enrichment.priority || '—'}`);
  }

  if (!APPLY) {
    console.log("\n(dry run — pass --apply to write)\n");
    process.exit(0);
  }

  // Write in batches
  const all = [...liContacts, ...accContacts];
  let batch = db.batch();
  let count = 0;
  let written = 0;
  const col = db.collection("contacts");
  for (const c of all) {
    const ref = col.doc();
    batch.set(ref, c);
    count++;
    if (count >= 450) {
      await batch.commit();
      written += count;
      console.log(`  committed ${written}/${all.length}`);
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
    written += count;
  }
  console.log(`\nDONE — wrote ${written} contacts to tenant=${TENANT_ID}\n`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
