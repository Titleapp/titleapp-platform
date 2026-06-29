"use strict";
/**
 * sendInvestorBlast.js — Monday morning investor awareness blast
 *
 * Usage:
 *   node sendInvestorBlast.js              # dry run — writes CSV preview only
 *   node sendInvestorBlast.js --send       # sends to full filtered list
 *   node sendInvestorBlast.js --test sean@sociii.ai   # sends to one address
 *   node sendInvestorBlast.js --send --limit 50       # send to first 50 only
 *   node sendInvestorBlast.js --send --source linkedin-sean  # Sean's contacts only
 *
 * Sends from: alex@sociii.ai (name: "Alex — SOCIII")
 * Reply-to:   sean@sociii.ai
 * Rate limit: 1 email per 800ms (~75/min, well under SendGrid free-tier limits)
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const TENANT_ID = "ws_1779846027006_hc71aw"; // Sean's SOCIII Inc workspace
// Load .env if present (dotenv optional)
try { require("dotenv").config(); } catch (_) {}
const SENDGRID_KEY = process.env.SENDGRID_API_KEY || (() => {
  try { return require("fs").readFileSync(require("path").join(__dirname, ".env"), "utf8").match(/SENDGRID_API_KEY=(.+)/)?.[1]?.trim(); } catch (_) { return null; }
})();
const FROM_EMAIL = "alex@sociii.ai";
const FROM_NAME = "Alex — SOCIII";
const REPLY_TO = "sean@sociii.ai";
const DATA_ROOM_URL = "https://sociii.ai"; // magic link fallback

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--send") && !args.includes("--test");
const SEND_MODE = args.includes("--send");
const TEST_EMAIL = (() => { const i = args.indexOf("--test"); return i >= 0 ? args[i + 1] : null; })();
const LIMIT = (() => { const i = args.indexOf("--limit"); return i >= 0 ? parseInt(args[i + 1]) : null; })();
const SOURCE_FILTER = (() => { const i = args.indexOf("--source"); return i >= 0 ? args[i + 1] : null; })();
const RATE_MS = 800; // ms between sends

// Investor profile keywords — tighter than the exploration query
const INVESTOR_TITLE_KW = /venture|capital fund|private.equity|family.office|\bGP\b|\bLP\b|\bVC\b|angel.invest|portfolio.manager|asset.manage|wealth.manage|investment.partner|managing.partner.*capital|managing.partner.*invest|managing.partner.*fund|principal.*invest|principal.*capital|investment.director|fund.manager|endowment|allocat/i;
const INVESTOR_CO_KW = /ventures?\b|capital\b|partners?\b.*fund|fund.*partners?\b|\bfund\b|invest(ment|ing|or)s?\b|family.office|asset.manage|wealth.manage|private.equity|\bPE\b|management.*LP|\.vc\b/i;

function isInvestor(c) {
  return INVESTOR_TITLE_KW.test(c.title || "") || INVESTOR_CO_KW.test(c.company || "");
}

// Priority score — Sean's direct connections rank higher
function priority(c) {
  if (c.source === "linkedin-sean") return 0;
  if (c.source === "hom_dao_reconciliation_2026_05_14") return 1;
  if (c.source === "linkedin-export-kent") return 2;
  return 3;
}

function buildHtml(firstName, magicUrl) {
  const fn = firstName || "there";
  const url = magicUrl || DATA_ROOM_URL;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
<p>Hi ${fn},</p>
<p>Quick note from Sean Combs, founder of SOCIII. We're running a pre-seed round and your name surfaced as someone who'd find the thesis interesting.</p>
<p><strong>30-second pitch</strong>: every regulated profession — medicine, law, aviation, real estate, finance — runs on rules that a junior practitioner takes years to internalize. SOCIII captures those rules from senior experts and ships them as AI workers governed by cryptographic audit trails. The experts earn from their workers; the platform consolidates SaaS for the businesses that run them.</p>
<p><strong>If you'd like to take a look</strong>, open your SOCIII investor workspace. The deck and whitepaper are there; the data room (memorandum, post-money SAFE, NDA, warrant, patent portfolio) unlocks after a quick accreditation check:</p>
<p style="margin:24px 0"><a href="${url}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;font-size:15px">Open your investor workspace →</a></p>
<p>Patent-pending. Pre-seed — accredited investors only. Aiming for first close inside 30 days. If a 30-min call makes sense, reply with two windows.</p>
<p>— Sean<br>Founder, SOCIII Inc.<br>sean@sociii.ai · (951) 4-SOC-2444</p>
<p style="font-size:11px;color:#94a3b8;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0">Not interested? Just reply "remove" and you won't hear from me again.</p>
</body></html>`;
}

async function sendOne(to, name, firstName) {
  if (!SENDGRID_KEY) throw new Error("SENDGRID_API_KEY not set");
  const html = buildHtml(firstName);
  const body = {
    personalizations: [{ to: [{ email: to, name: name || to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    reply_to: { email: REPLY_TO, name: "Sean Combs" },
    subject: "SOCIII pre-seed — quick intro + investor materials",
    content: [{ type: "text/html", value: html }],
  };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendGrid ${res.status}: ${err}`);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
  const db = admin.firestore();

  // Test mode — send to a single address
  if (TEST_EMAIL) {
    console.log(`\nTEST MODE — sending to ${TEST_EMAIL}...`);
    await sendOne(TEST_EMAIL, "Sean (test)", "Sean");
    console.log("✓ Test email sent. Check inbox.");
    process.exit(0);
  }

  console.log("\nLoading contacts from Firestore...");
  const snap = await db.collection("contacts").where("tenantId", "==", TENANT_ID).get();
  console.log(`Total contacts: ${snap.size}`);

  let contacts = snap.docs.map(d => d.data())
    .filter(c => c.email && isInvestor(c))
    .sort((a, b) => priority(a) - priority(b));

  if (SOURCE_FILTER) {
    contacts = contacts.filter(c => c.source === SOURCE_FILTER);
    console.log(`Filtered to source "${SOURCE_FILTER}": ${contacts.length}`);
  }

  if (LIMIT) contacts = contacts.slice(0, LIMIT);

  console.log(`\nFiltered investor list: ${contacts.length} contacts`);

  // Write CSV preview
  const csvPath = path.join(__dirname, "investor_blast_preview.csv");
  const csvRows = [
    "priority,name,title,company,email,source",
    ...contacts.map(c => [
      priority(c),
      `"${(c.name || "").replace(/"/g, "'")}"`,
      `"${(c.title || "").replace(/"/g, "'")}"`,
      `"${(c.company || "").replace(/"/g, "'")}"`,
      c.email,
      c.source || "",
    ].join(",")),
  ];
  fs.writeFileSync(csvPath, csvRows.join("\n"));
  console.log(`\nCSV preview written to: ${csvPath}`);

  if (DRY_RUN) {
    console.log(`\nDRY RUN — ${contacts.length} emails would be sent.`);
    console.log("First 10 recipients:");
    contacts.slice(0, 10).forEach((c, i) =>
      console.log(`  ${i + 1}. ${c.name} — ${c.title} @ ${c.company} <${c.email}> [${c.source}]`)
    );
    console.log("\nRun with --send to actually send, or --limit N to cap volume.");
    console.log("Run with --test your@email.com to send a single test first.");
    process.exit(0);
  }

  // Send
  const results = [];
  let sent = 0, failed = 0;
  const startTime = Date.now();

  console.log(`\nSending ${contacts.length} emails (${RATE_MS}ms delay between each)...`);
  console.log("Estimated time:", Math.round(contacts.length * RATE_MS / 1000 / 60), "minutes\n");

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const firstName = c.first_name || (c.name || "").split(" ")[0] || null;
    try {
      await sendOne(c.email, c.name, firstName);
      sent++;
      results.push({ email: c.email, name: c.name, status: "sent", ts: new Date().toISOString() });
      console.log(`✓ [${i + 1}/${contacts.length}] ${c.name} <${c.email}>`);
    } catch (e) {
      failed++;
      results.push({ email: c.email, name: c.name, status: "failed", error: e.message, ts: new Date().toISOString() });
      console.error(`✗ [${i + 1}/${contacts.length}] ${c.name} <${c.email}>: ${e.message}`);
    }
    if (i < contacts.length - 1) await sleep(RATE_MS);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const resultsPath = path.join(__dirname, "investor_blast_results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log(`\nDone in ${elapsed}s. Sent: ${sent} ✓  Failed: ${failed} ✗`);
  console.log(`Results written to: ${resultsPath}`);
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
