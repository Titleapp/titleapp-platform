/**
 * CODEX 50.17 P0-4 follow-up — Export a constraintRaasModule to a single
 * markdown document for counsel review. Output goes to ~/Downloads.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/exportConstraintModuleForReview.js securities_compliance_v1
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const moduleId = process.argv[2];
if (!moduleId) {
  console.error("Usage: node exportConstraintModuleForReview.js <moduleId>");
  process.exit(1);
}

(async () => {
  const moduleSnap = await db.collection("constraintRaasModules").doc(moduleId).get();
  if (!moduleSnap.exists) {
    console.error(`Module ${moduleId} not found.`);
    process.exit(1);
  }
  const m = moduleSnap.data();

  const sectionsSnap = await db.collection("constraintRaasModules").doc(moduleId)
    .collection("sections").orderBy("order", "asc").get();

  const lines = [];
  lines.push(`# ${m.name} — Counsel Review Packet`);
  lines.push("");
  lines.push(`**Module ID:** \`${moduleId}\``);
  lines.push(`**Version:** ${m.version}`);
  lines.push(`**Status:** ${m.status}`);
  lines.push(`**Domain:** ${m.domain}`);
  lines.push(`**Jurisdiction scope:** ${(m.jurisdiction_scope || []).join(", ") || "n/a"}`);
  lines.push(`**Default disposition on violation:** ${m.disposition_default}`);
  lines.push(`**Total sections:** ${m.section_count} · ~${m.total_token_estimate} tokens`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## What this is");
  lines.push("");
  lines.push("This document is the source content for an automated regulatory compliance enforcement layer in TitleApp's Fundraise worker (and any other worker the platform attaches this module to). The content is composed from existing platform regulatory guidance plus additive sections covering gaps. **Counsel reviews each section, marks revisions, and approves before this module flips to live status.** Once live, the worker will load these sections into its system prompt at every chat completion and self-correct generated content against these rules.");
  lines.push("");
  lines.push("**Sections marked [COUNSEL REVIEW NEEDED]** are the highest-priority for counsel attention — those identify gaps in the substrate where additive content needed to be authored.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Section index");
  lines.push("");
  for (const s of sectionsSnap.docs) {
    const d = s.data();
    lines.push(`- **[${d.priority.toUpperCase()} · ${d.section_type}]** \`${d.sectionId}\` — ${d.title}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const s of sectionsSnap.docs) {
    const d = s.data();
    lines.push(`## ${d.title}`);
    lines.push("");
    lines.push(`- **Section ID:** \`${d.sectionId}\``);
    lines.push(`- **Priority:** ${d.priority}`);
    lines.push(`- **Type:** ${d.section_type}`);
    lines.push(`- **Order:** ${d.order}`);
    lines.push(`- **Token estimate:** ~${d.token_estimate}`);
    if (d.disposition_override) lines.push(`- **Disposition override:** ${d.disposition_override}`);
    if (d.applies_to && Object.keys(d.applies_to).length > 0) {
      lines.push(`- **Applies to:** \`${JSON.stringify(d.applies_to)}\``);
    }
    if (d.source_refs && d.source_refs.length > 0) {
      lines.push(`- **Sources:** ${d.source_refs.map(r => `\`${r.docId}\`${r.section ? " · " + r.section : ""}`).join("; ")}`);
    }
    lines.push("");
    lines.push("**Rule text (injected into worker system prompt):**");
    lines.push("");
    lines.push(d.body_markdown);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push("## Counsel sign-off form");
  lines.push("");
  lines.push("After review, please return:");
  lines.push("");
  lines.push("1. **Section-by-section revisions** — annotated edits to any section (markup directly in this doc or as inline comments).");
  lines.push("2. **Additional gaps to address** — sections that should exist but don't.");
  lines.push("3. **Disposition disagreements** — any section where the proposed block/flag/allow disposition is wrong for the cited rule.");
  lines.push("4. **Approval statement** — \"Counsel reviewed and approved [moduleId] v[version] as of [date], subject to revisions noted above.\"");
  lines.push("");
  lines.push("Sean records the approval via:");
  lines.push("```");
  lines.push(`POST /v1/admin:raas:module:counsel`);
  lines.push("Body:");
  lines.push(`{ "moduleId": "${moduleId}", "reviewer": "<counsel name + firm>", "approval_notes": "<summary of revisions>" }`);
  lines.push("```");
  lines.push("");
  lines.push("Then transitions the module to live:");
  lines.push("```");
  lines.push(`POST /v1/admin:raas:module:transition`);
  lines.push("Body:");
  lines.push(`{ "moduleId": "${moduleId}", "status": "live" }`);
  lines.push("```");
  lines.push("");

  const outPath = path.join(os.homedir(), "Downloads", `${moduleId}-counsel-review.md`);
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`✅ Wrote ${lines.length} lines to ${outPath}`);
  console.log(`   ${sectionsSnap.size} sections exported`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
