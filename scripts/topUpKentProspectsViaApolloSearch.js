"use strict";

/**
 * Top-up pass for Kent's prospect CSV. Drops thin records (no email AND no
 * LinkedIn AND no last name) and replaces with fresh Apollo-search results
 * that DO have email + phone where available.
 *
 * Usage:
 *   export APOLLO_API_KEY=...
 *   node scripts/topUpKentProspectsViaApolloSearch.js INPUT.csv OUTPUT.csv
 *
 * Strategy:
 *   1. Read existing CSV
 *   2. Keep rows that have email OR (linkedin AND last_name)
 *   3. For each ICP bucket below target, Apollo-search to fill
 *   4. Bias search toward US-based, AI / vertical-SaaS / regulated-industries
 *
 * Apollo costs: ~1 credit per 25 results returned. Budget ~80 credits worst case.
 */

const path = require("path");
const fs = require("fs");
const apollo = require(path.join(__dirname, "..", "functions", "functions", "services", "marketingService", "apollo"));

const IN = process.argv[2];
const OUT = process.argv[3];
if (!IN || !OUT) {
  console.error("Usage: node topUpKentProspectsViaApolloSearch.js INPUT.csv OUTPUT.csv");
  process.exit(1);
}
if (!process.env.APOLLO_API_KEY) { console.error("set APOLLO_API_KEY"); process.exit(1); }

// CSV parsing
function parseCSVLine(line) {
  const out = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cur += c; }
    } else {
      if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') { inQ = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}
function csvEscape(s) {
  if (s == null) return "";
  s = String(s);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// New header — Phone is its own column for clarity
const NEW_HEADER = ["First","Last","Title","Company","Email","Phone","LinkedIn","Location","Bucket","KentNetwork","Tags"];

function rowFromApollo(p, bucket) {
  const phone = (p.phone_numbers || []).map(x => x.sanitized_number || x.raw_number).filter(Boolean)[0] || "";
  const loc = p.city ? `${p.city}${p.state ? ", " + p.state : ""}` : (p.country || "");
  return {
    First: p.first_name || "",
    Last: p.last_name || "",
    Title: p.title || "",
    Company: p.organization?.name || "",
    Email: p.email || "",
    Phone: phone,
    LinkedIn: p.linkedin_url || "",
    Location: loc,
    Bucket: bucket,
    KentNetwork: "",
    Tags: ["apollo-search-2026-05-28", "AI-thesis"].join("; "),
  };
}

function rowFromExisting(arr) {
  // Old schema had no Phone column — Tags may contain phone=<num>
  const [first, last, title, company, email, linkedin, location, bucket, kentN, tags] = arr;
  let phone = "";
  const m = (tags || "").match(/phone=([^;]+)/);
  if (m) phone = m[1].trim();
  return {
    First: first || "",
    Last: last || "",
    Title: title || "",
    Company: company || "",
    Email: email || "",
    Phone: phone,
    LinkedIn: linkedin || "",
    Location: location || "",
    Bucket: bucket || "",
    KentNetwork: kentN || "",
    Tags: tags || "",
  };
}

function isUsable(r) {
  // Has an email, OR (has LinkedIn AND has last name)
  const hasEmail = r.Email && r.Email.includes("@") && !r.Email.startsWith("VERIFY");
  const hasLi = r.LinkedIn && /linkedin\.com/.test(r.LinkedIn);
  return hasEmail || (hasLi && r.Last && r.Last.trim());
}

async function main() {
  const raw = fs.readFileSync(IN, "utf8").trim();
  const lines = raw.split(/\r?\n/);
  const rows = lines.slice(1).map(parseCSVLine).map(rowFromExisting);

  console.log(`Read ${rows.length} rows`);

  // Drop unusables (mostly thin angels)
  const usable = rows.filter(isUsable);
  const dropped = rows.length - usable.length;
  console.log(`Dropped ${dropped} unusable (no email + no LinkedIn or no last name)`);
  console.log(`Kept ${usable.length} usable\n`);

  // Bucket counts
  const counts = {};
  for (const r of usable) counts[r.Bucket] = (counts[r.Bucket] || 0) + 1;
  console.log("Bucket counts after drop:");
  for (const [b, n] of Object.entries(counts)) console.log(`  ${b.padEnd(24)} ${n}`);

  const TARGETS = {
    "Institutional VC": 50,
    "Angel Operator": 30,
    "Accelerator": 15,
    "Strategic / Corp Dev": 5,
  };

  // For each bucket, top up via Apollo search
  const APOLLO_SEARCHES = {
    "Angel Operator": {
      person_titles: ["Angel Investor", "Founder", "Co-Founder", "CEO", "Chief Executive Officer", "Operator"],
      q_keywords: "angel investor AI artificial intelligence vertical SaaS",
      person_locations: ["United States"],
    },
    "Institutional VC": {
      person_titles: ["Partner", "General Partner", "Managing Partner", "Principal"],
      q_organization_industries: ["Venture Capital & Private Equity"],
      person_locations: ["United States"],
      organization_num_employees_ranges: ["1,10", "11,50"],
    },
    "Accelerator": {
      person_titles: ["Managing Director", "Program Director", "Partner"],
      q_keywords: "accelerator AI program",
      person_locations: ["United States"],
    },
    "Strategic / Corp Dev": {
      person_titles: ["Head of Corporate Development", "VP Corporate Development", "Director Corporate Development"],
      q_keywords: "AI strategy",
      person_locations: ["United States"],
    },
  };

  const final = [...usable];
  const seenEmails = new Set(final.map(r => (r.Email || "").toLowerCase()).filter(Boolean));

  for (const [bucket, target] of Object.entries(TARGETS)) {
    const need = target - (counts[bucket] || 0);
    if (need <= 0) continue;
    console.log(`\nTopping up ${bucket}: need ${need}`);

    const query = APOLLO_SEARCHES[bucket];
    if (!query) continue;

    try {
      // Apollo returns up to 25 per page. Pull 1-2 pages.
      let added = 0;
      let page = 1;
      while (added < need && page <= 3) {
        const { people } = await apollo.searchPeople({ ...query, page, per_page: Math.min(25, need - added + 10) });
        if (!people.length) break;
        for (const p of people) {
          if (added >= need) break;
          if (!p.email || !p.email.includes("@")) continue;
          const emailKey = p.email.toLowerCase();
          if (seenEmails.has(emailKey)) continue;
          seenEmails.add(emailKey);
          final.push(rowFromApollo(p, bucket));
          added++;
        }
        page++;
        await new Promise(r => setTimeout(r, 500));
      }
      console.log(`  Added ${added} ${bucket} from Apollo search`);
    } catch (e) {
      console.error(`  Apollo search failed for ${bucket}: ${e.message}`);
    }
  }

  // Sort by bucket then by email-present
  final.sort((a, b) => {
    if (a.Bucket !== b.Bucket) return a.Bucket.localeCompare(b.Bucket);
    return (b.Email ? 1 : 0) - (a.Email ? 1 : 0);
  });

  const out = [NEW_HEADER.join(",")];
  for (const r of final) {
    out.push(NEW_HEADER.map(h => csvEscape(r[h])).join(","));
  }
  fs.writeFileSync(OUT, out.join("\n") + "\n");

  // Summary
  const finalCounts = {};
  let withEmail = 0;
  let withPhone = 0;
  for (const r of final) {
    finalCounts[r.Bucket] = (finalCounts[r.Bucket] || 0) + 1;
    if (r.Email) withEmail++;
    if (r.Phone) withPhone++;
  }
  console.log(`\n=== FINAL ===`);
  console.log(`Total rows: ${final.length}`);
  console.log(`With email: ${withEmail}`);
  console.log(`With phone: ${withPhone}`);
  for (const [b, n] of Object.entries(finalCounts)) console.log(`  ${b.padEnd(24)} ${n}`);
  console.log(`\nWrote ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
