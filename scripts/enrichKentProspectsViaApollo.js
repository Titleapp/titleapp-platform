"use strict";

/**
 * Enriches Kent's prospect CSV via Apollo /people/match for every row
 * missing an email. Adds email + phone + LinkedIn + location.
 *
 * Usage:
 *   export APOLLO_API_KEY=...        # from firebase functions:secrets:access
 *   node scripts/enrichKentProspectsViaApollo.js INPUT.csv OUTPUT.csv
 *
 * Cost: 1 Apollo credit per row matched. Cap at ~100 to be safe.
 */

const path = require("path");
const fs = require("fs");
const apollo = require(path.join(__dirname, "..", "functions", "functions", "services", "marketingService", "apollo"));

const IN = process.argv[2];
const OUT = process.argv[3];
if (!IN || !OUT) {
  console.error("Usage: node enrichKentProspectsViaApollo.js INPUT.csv OUTPUT.csv");
  process.exit(1);
}
if (!process.env.APOLLO_API_KEY) {
  console.error("ERROR: set APOLLO_API_KEY env var");
  process.exit(1);
}

// CSV parsing — handles quoted commas and escaped quotes
function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === ',') { out.push(cur); cur = ""; }
      else if (c === '"') { inQuotes = true; }
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

async function main() {
  const raw = fs.readFileSync(IN, "utf8").trim();
  const lines = raw.split(/\r?\n/);
  const header = lines[0];
  const rows = lines.slice(1).map(parseCSVLine);

  console.log(`Loaded ${rows.length} rows. Header: ${header}`);
  console.log(`Will Apollo-enrich rows missing email (col 4)...\n`);

  let enriched = 0, skipped = 0, failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // Columns: First,Last,Title,Company,Email,LinkedIn,Location,Bucket,KentNetwork,Tags
    const [first, last, title, company, email, linkedin, location, bucket, kentN, tags] = r;

    if (email && email.trim() && email.includes("@") && !email.startsWith("VERIFY")) {
      skipped++;
      continue;
    }
    if (!first || !last) {
      console.log(`  [${i + 1}] skip — missing name`);
      failed++;
      continue;
    }

    try {
      process.stdout.write(`  [${i + 1}/${rows.length}] ${first} ${last} @ ${company || "—"} ... `);
      const person = await apollo.enrichPerson({
        first_name: first.trim(),
        last_name: last.trim(),
        organization_name: (company || "").trim() || undefined,
      });

      if (!person) {
        console.log("NO MATCH");
        failed++;
        continue;
      }

      const newEmail = person.email || email || "";
      const newLinkedin = person.linkedin_url || linkedin || "";
      const newLocation = person.city
        ? `${person.city}${person.state ? ", " + person.state : ""}`
        : (person.country ? person.country : location || "");
      const newTitle = title || person.title || "";
      const newCompany = company || person.organization?.name || "";
      // Phone if available — append into Tags column so existing schema isn't broken
      const phones = (person.phone_numbers || []).map(p => p.sanitized_number || p.raw_number).filter(Boolean);
      const phoneNote = phones.length ? `phone=${phones[0]}` : "";
      const tagsCombined = [tags, phoneNote, "apollo-enriched-2026-05-28"].filter(Boolean).join("; ");

      rows[i] = [first, last, newTitle, newCompany, newEmail, newLinkedin, newLocation, bucket, kentN, tagsCombined];
      enriched++;
      console.log(newEmail ? "OK" : "MATCH-NO-EMAIL");
    } catch (e) {
      console.log(`FAIL: ${e.message}`);
      failed++;
    }

    // Throttle — Apollo rate limit
    await new Promise(r => setTimeout(r, 250));
  }

  const out = [header, ...rows.map(r => r.map(csvEscape).join(","))].join("\n") + "\n";
  fs.writeFileSync(OUT, out);

  console.log(`\nDone. Enriched=${enriched} Skipped(had email)=${skipped} Failed=${failed}`);
  console.log(`Wrote: ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
