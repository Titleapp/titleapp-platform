"use strict";

/**
 * Exports a prospect CSV for Kent's outreach from the SOCIII contacts
 * collection. Reads existing tagged contacts (no Apollo credit spend),
 * buckets into the Profile B mix, and writes a CSV with paste-ready
 * fields for LinkedIn or email outreach.
 *
 * Buckets (Profile B):
 *   - 50 institutional VCs (segment fundraise:vc-seed OR title contains
 *     Partner/Principal/Investor at investor-tagged orgs)
 *   - 30 angels (segment fundraise:angels)
 *   - 15 accelerators (segment fundraise:accelerators)
 *   - 5 strategic / corp dev (segment fundraise:strategic OR org contains
 *     Ventures and tag includes corp-dev)
 *
 * Plus separate bucket for Kent's network (BofA / Thomas Weisel alumni)
 * — gated by `engagement.notes` or `provenance.source` flag.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   export TENANT_ID=ws_1779168732286_42qw6m
 *   node scripts/exportKentProspectList.js
 *
 * Output:
 *   /tmp/kent-prospects-YYYY-MM-DD.csv
 *
 * Read-only — does not write to Firestore.
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
const fs = require("fs");

const TENANT_ID = process.env.TENANT_ID;
if (!TENANT_ID) {
  console.error("ERROR: set TENANT_ID env var");
  process.exit(1);
}

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

// Targets per bucket from Profile B
const TARGETS = {
  vc:          { label: "Institutional VC",   target: 50, segments: ["fundraise:vc-seed", "fundraise:vc"] },
  angel:       { label: "Angel Operator",      target: 30, segments: ["fundraise:angels", "fundraise:angel"] },
  accelerator: { label: "Accelerator",         target: 15, segments: ["fundraise:accelerators", "fundraise:accelerator"] },
  strategic:   { label: "Strategic / Corp Dev", target: 5,  segments: ["fundraise:strategic", "fundraise:corp-dev"] },
};

// Kent network markers — provenance.source or notes
const KENT_NETWORK_MARKERS = [
  /banc of america/i,
  /bank of america/i,
  /bofa/i,
  /thomas weisel/i,
  /tw partners/i,
  /kent network/i,
];

function isKentNetwork(c) {
  const haystack = [
    c?.notes,
    c?.engagement?.notes,
    c?.provenance?.source,
    c?.provenance?.notes,
    c?.work?.company,
    c?.experience_summary,
    JSON.stringify(c?.tags || []),
  ].filter(Boolean).join(" ");
  return KENT_NETWORK_MARKERS.some(rx => rx.test(haystack));
}

function pickBucket(c) {
  const segs = (c.segments || []).map(s => typeof s === "string" ? s : s?.segment_id || "");
  for (const [k, cfg] of Object.entries(TARGETS)) {
    if (segs.some(s => cfg.segments.includes(s))) return k;
  }
  // Fallback heuristic on title + org
  const title = (c?.work?.title || c?.title || "").toLowerCase();
  const org = (c?.work?.company || c?.company || "").toLowerCase();
  if (/partner|principal|investor|managing director/.test(title) && /ventures|capital|partners|fund/.test(org)) return "vc";
  if (/founder|ceo|cto|cpo|chief/.test(title) && c?.angel_check === true) return "angel";
  if (/managing director|partner/.test(title) && /(y combinator|techstars|accelerator|incubator)/.test(org)) return "accelerator";
  if (/corp dev|strategic|head of investment/.test(title)) return "strategic";
  return null;
}

function fmtCell(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join("; ");
  if (typeof v === "object") {
    return Object.values(v).filter(x => typeof x === "string").join(" | ");
  }
  return String(v).replace(/[\r\n,]+/g, " ").trim();
}

function row(c, bucket) {
  return [
    fmtCell(c.first_name || c.given_name),
    fmtCell(c.last_name || c.family_name),
    fmtCell(c.work?.title || c.title),
    fmtCell(c.work?.company || c.company || c.organization?.name),
    fmtCell(c.primary_email || c.email || c.work_email),
    fmtCell(c.linkedin_url || c.linkedin),
    fmtCell(c.work?.location || c.location || c.city),
    bucket,
    isKentNetwork(c) ? "Kent network" : "",
    fmtCell((c.tags || []).join("; ")),
  ].map(s => /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s).join(",");
}

async function main() {
  console.log(`Querying contacts for tenant ${TENANT_ID}...`);

  const snap = await db.collection("contacts")
    .where("tenantId", "==", TENANT_ID)
    .get();

  console.log(`Total contacts in tenant: ${snap.size}`);

  const buckets = { vc: [], angel: [], accelerator: [], strategic: [], unbucketed: [] };
  const kentList = [];

  for (const doc of snap.docs) {
    const c = { id: doc.id, ...doc.data() };
    const bucket = pickBucket(c);
    if (bucket) buckets[bucket].push(c);
    else buckets.unbucketed.push(c);
    if (isKentNetwork(c)) kentList.push(c);
  }

  console.log(`\nBucket counts (in tenant, before cap):`);
  for (const [k, cfg] of Object.entries(TARGETS)) {
    console.log(`  ${cfg.label.padEnd(24)} ${buckets[k].length} (target ${cfg.target})`);
  }
  console.log(`  Kent network              ${kentList.length}`);
  console.log(`  Unbucketed (excluded)     ${buckets.unbucketed.length}`);

  // Cap each bucket to its target. Apply Kent-network preference inside each bucket.
  const selected = [];
  for (const [k, cfg] of Object.entries(TARGETS)) {
    const pool = buckets[k];
    // Sort: Kent network first, then by enrichment score (notes/linkedin/title completeness)
    pool.sort((a, b) => {
      const aKent = isKentNetwork(a) ? 1 : 0;
      const bKent = isKentNetwork(b) ? 1 : 0;
      if (bKent - aKent !== 0) return bKent - aKent;
      const aScore = (a.linkedin_url ? 1 : 0) + (a.primary_email ? 1 : 0) + (a.work?.title ? 1 : 0);
      const bScore = (b.linkedin_url ? 1 : 0) + (b.primary_email ? 1 : 0) + (b.work?.title ? 1 : 0);
      return bScore - aScore;
    });
    const slice = pool.slice(0, cfg.target);
    for (const c of slice) selected.push({ c, bucket: cfg.label });
  }

  // Add any Kent-network contacts not already selected (separate appendix)
  const selectedIds = new Set(selected.map(x => x.c.id));
  const kentExtras = kentList.filter(c => !selectedIds.has(c.id));

  // Write CSV
  const today = new Date().toISOString().slice(0, 10);
  const outPath = `/tmp/kent-prospects-${today}.csv`;
  const header = "First,Last,Title,Company,Email,LinkedIn,Location,Bucket,KentNetwork,Tags\n";
  const rows = selected.map(({ c, bucket }) => row(c, bucket));
  const kentAppendix = kentExtras.map(c => row(c, "Kent network appendix"));
  fs.writeFileSync(outPath, header + rows.join("\n") + (kentAppendix.length ? "\n" + kentAppendix.join("\n") : "") + "\n");

  console.log(`\nWrote ${selected.length} primary + ${kentExtras.length} Kent appendix contacts to ${outPath}`);

  // Summary of what was selected
  console.log("\nSelected breakdown:");
  const byBucket = {};
  for (const { bucket } of selected) byBucket[bucket] = (byBucket[bucket] || 0) + 1;
  for (const [k, v] of Object.entries(byBucket)) console.log(`  ${k.padEnd(24)} ${v}`);

  // Gap report — what target was not met, suggests Apollo top-up
  const gaps = [];
  for (const [k, cfg] of Object.entries(TARGETS)) {
    const got = buckets[k].length;
    if (got < cfg.target) gaps.push({ icp: k, label: cfg.label, target: cfg.target, have: got, need: cfg.target - got });
  }
  if (gaps.length) {
    console.log("\nGaps (need Apollo top-up):");
    for (const g of gaps) console.log(`  ${g.label.padEnd(24)} have ${g.have} / need ${g.target} → top-up ${g.need}`);
  } else {
    console.log("\nAll buckets filled from existing contacts. No Apollo top-up needed.");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
