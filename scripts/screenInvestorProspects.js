"use strict";
/**
 * screenInvestorProspects.js — S52.45. Screens the master contacts DB for
 * investor signal (angels / VCs / strategics / incubators), dedupes by email
 * across tenants, ranks, and emits a prospect list for Kent's outreach.
 *
 *   node scripts/screenInvestorProspects.js            # dry run, prints top 20 + counts
 *   node scripts/screenInvestorProspects.js --csv      # also writes prospects CSV
 *
 * READ-ONLY. Writes no Firestore data. (Tagging is a separate, gated step.)
 */
const fs = require("fs");
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const WRITE_CSV = process.argv.includes("--csv");

const VC_KW = /\b(capital|ventures?|partners?|fund|funds|angel|invest|equity|holdings?|advisor|advisors|incubator|accelerator|seed|growth|asset management|family office|syndicate|lp|gp)\b/i;
const INCUBATOR_KW = /\b(incubator|accelerator|y combinator|ycombinator|techstars|500 |plug and play|seedcamp)\b/i;

function field(c, ...keys) {
  for (const k of keys) if (c[k]) return c[k];
  const p = Array.isArray(c.personas) ? c.personas[0] : null;
  if (p) for (const k of keys) if (p[k]) return p[k];
  return "";
}

function score(c) {
  const reasons = [];
  let s = 0;
  const types = c.types_index || (c.type ? [c.type] : []);
  const title = (field(c, "title", "role_label", "job_title") || "").toString();
  const company = (field(c, "company", "organization", "org") || "").toString();
  const segs = (c.segments || []).join(" ");
  const blob = `${title} ${company} ${segs}`;

  if (types.includes("investor")) { s += 40; reasons.push("tagged investor"); }
  if (INCUBATOR_KW.test(blob)) { s += 25; reasons.push("incubator/accelerator"); }
  else if (VC_KW.test(blob)) { s += 25; reasons.push("VC/angel signal"); }
  if (/kent-investor-candidates/i.test(segs)) { s += 20; reasons.push("kent investor list"); }
  if (/investor-candidates|network_sean|linkedin-network/i.test(segs)) { s += 10; reasons.push("network"); }
  if (/hom_dao|titleapp_shareholders|team/i.test(segs)) { s += 8; reasons.push("existing supporter"); }

  const email = field(c, "email");
  const phone = field(c, "phone", "phone_number", "mobile");
  if (email) { s += 6; }
  if (phone) { s += 10; reasons.push("has phone (callable)"); }
  return { s, reasons, title, company, email, phone, segs: c.segments || [], types };
}

(async () => {
  const snap = await db.collection("contacts").get();
  const seen = new Map(); // email -> best prospect
  let scanned = 0, qualified = 0;
  const noEmail = [];

  snap.forEach((d) => {
    scanned++;
    const c = d.data();
    if (c.status === "deleted") return;
    const r = score(c);
    if (r.s < 25) return; // must have real investor signal
    qualified++;
    const name = field(c, "name", "full_name") || `${field(c, "first_name")} ${field(c, "last_name")}`.trim();
    const rec = {
      id: d.id, tenantId: c.tenantId || "", name, ...r,
    };
    const key = (r.email || "").toLowerCase().trim();
    if (!key) { noEmail.push(rec); return; }
    const prev = seen.get(key);
    if (!prev || rec.s > prev.s) seen.set(key, rec);
  });

  const ranked = [...seen.values()].sort((a, b) => b.s - a.s);
  const callable = ranked.filter((r) => r.phone);

  console.log(`\n=== Investor-prospect screen of master DB ===`);
  console.log(`scanned ${scanned} contacts → ${qualified} qualified (signal≥25) → ${seen.size} unique by email (${noEmail.length} qualified had no email)`);
  console.log(`callable now (has phone): ${callable.length}\n`);

  console.log(`--- TOP 20 (Kent's call list) ---`);
  ranked.slice(0, 20).forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}. [${r.s}] ${r.name || "(no name)"} — ${r.title || "?"}${r.company ? " @ " + r.company : ""}`);
    console.log(`      ${r.email}${r.phone ? "  ·  ☎ " + r.phone : "  ·  (no phone)"}  ·  ${r.reasons.join(", ")}`);
  });

  if (WRITE_CSV) {
    const out = path.join(__dirname, "..", "kent-investor-prospects.csv");
    const rows = [["rank", "name", "title", "company", "email", "phone", "score", "signal", "segments", "contactId", "tenantId"]];
    ranked.forEach((r, i) => rows.push([
      i + 1, r.name, r.title, r.company, r.email, r.phone, r.s, r.reasons.join("; "), (r.segs || []).join("|"), r.id, r.tenantId,
    ]));
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    fs.writeFileSync(out, csv);
    console.log(`\nWrote ${ranked.length} prospects → ${out}`);
  } else {
    console.log(`\n(${ranked.length} total ranked prospects — re-run with --csv to export the full list)`);
  }
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
