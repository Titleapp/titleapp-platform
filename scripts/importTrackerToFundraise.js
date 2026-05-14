/**
 * Import Sean + Kent's accelerator tracker into a real Fundraise record.
 *
 * Reads ~/Downloads/TitleApp-Accelerator-Tracker.xlsx, parses 25 programs
 * across 5 tiers, creates a fundraise titled "TitleApp AI Seed Round 2026",
 * and imports each program as an investor record with persona tags.
 *
 * Usage:
 *   node scripts/importTrackerToFundraise.js                       # dry-run
 *   node scripts/importTrackerToFundraise.js --apply               # write
 *   node scripts/importTrackerToFundraise.js --apply --apollo-top3 # also Apollo-enrich top 3 (HIGH priority Tier 1)
 *
 *   Set TENANT env var to override the destination tenant (default: vault).
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
const xlsx = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "xlsx"));

admin.initializeApp({ projectId: "title-app-alpha" });

const dr = require(path.join(__dirname, "..", "functions", "functions", "services", "fundraise", "dataRoom"));

const APPLY = process.argv.includes("--apply");
const APOLLO_TOP3 = process.argv.includes("--apollo-top3");
const TENANT = process.env.TENANT || "vault";
const TRACKER_PATH = "/Users/seancombs/Downloads/TitleApp-Accelerator-Tracker.xlsx";
const FUNDRAISE_NAME = "TitleApp AI Seed Round 2026";
const OWNER_USER = "fPlJ76VM5kQaEtxlMVifVlzeOmq1"; // Sean's userId

function parseCheckAmount(checkStr) {
  if (!checkStr) return null;
  const s = String(checkStr).replace(/,/g, "");
  // Handle ranges like "$500K–$1M" — take low end
  const m = s.match(/\$?([\d.]+)\s*([KMm])/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  return unit === "M" ? Math.round(num * 1_000_000) : Math.round(num * 1_000);
}

function parseFitStars(fitStr) {
  if (!fitStr) return 0;
  const m = String(fitStr).match(/⭐+/);
  return m ? m[0].length : 0;
}

function parsePriority(p) {
  if (!p) return "low";
  const s = String(p).trim().toLowerCase();
  if (s.includes("high")) return "high";
  if (s.includes("med")) return "medium";
  return "low";
}

function programToInvestor(row, tier) {
  const program = row[1];
  const fitStars = parseFitStars(row[5]);
  const priority = parsePriority(row[11]);
  const checkAmount = parseCheckAmount(row[2]);
  const tierShort = String(tier).split("—")[0].trim();
  const fakeEmail = `partner@${(row[6] || program.toLowerCase().replace(/[^a-z0-9]/g, "")).replace(/^https?:\/\//, "").replace(/\/.*/, "")}`;

  return {
    name: program,
    email: fakeEmail,
    commitment_amount: checkAmount,
    metadata: {
      tier: tierShort,
      priority,
      fit_stars: fitStars,
      focus_fit: row[5] || null,
      pitch_angle: row[6] || null,
      website: row[7] || null,
      deal_terms: row[2] || null,
      equity: row[3] || null,
      deadline: row[4] || null,
      tracker_status: row[8] || null,
      assigned_owner: row[9] || null,
      notes: row[10] || null,
      tags: [`tier:${tierShort}`, `priority:${priority}`, fitStars >= 4 ? "fit:strong" : "fit:moderate"],
    },
  };
}

(async () => {
  console.log(`\n=== Tracker import — ${APPLY ? "APPLY" : "DRY RUN"} ===`);
  console.log(`Tenant:    ${TENANT}`);
  console.log(`Apollo:    ${APOLLO_TOP3 ? "enrich top 3" : "skip"}`);
  console.log(`Tracker:   ${TRACKER_PATH}\n`);

  const wb = xlsx.readFile(TRACKER_PATH);
  const ws = wb.Sheets["Accelerator Tracker"];
  const arr = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });

  // Parse programs by tier
  let currentTier = null;
  const programs = [];
  for (let i = 2; i < arr.length; i++) {
    const r = arr[i];
    if (r[0]) currentTier = r[0];
    if (!r[1]) continue;
    programs.push({ tier: currentTier, row: r });
  }

  console.log(`Parsed ${programs.length} programs:`);
  const byTier = {};
  for (const p of programs) {
    byTier[p.tier] = (byTier[p.tier] || 0) + 1;
  }
  for (const [t, c] of Object.entries(byTier)) console.log(`  ${t}: ${c}`);
  console.log("");

  if (!APPLY) {
    console.log("--- Top 3 (Tier 1, HIGH priority) preview ---");
    for (const p of programs.slice(0, 5)) {
      const inv = programToInvestor(p.row, p.tier);
      console.log(`  ${inv.name} — check: $${inv.commitment_amount?.toLocaleString() || "?"} | priority: ${inv.metadata.priority} | tags: ${inv.metadata.tags.join(", ")}`);
    }
    console.log("\nThis was a DRY RUN. Re-run with --apply to write.\n");
    process.exit(0);
  }

  // Apply path — create fundraise + investor records
  // First check if this fundraise already exists for this tenant
  const existing = await admin.firestore().collection("fundraises")
    .where("tenantId", "==", TENANT)
    .where("name", "==", FUNDRAISE_NAME)
    .limit(1).get();

  let fundraiseId;
  if (!existing.empty) {
    fundraiseId = existing.docs[0].data().fundraiseId;
    console.log(`Found existing fundraise ${fundraiseId} — will add investors to it (idempotent dedup not yet implemented; rerun-safe at the program-name level only).`);
  } else {
    const created = await dr.createFundraise({
      tenantId: TENANT,
      name: FUNDRAISE_NAME,
      target_raise: 2_000_000,
      lead_investor: null,
      createdBy: OWNER_USER,
    });
    fundraiseId = created.fundraiseId;
    console.log(`Created fundraise ${fundraiseId}`);
  }

  let added = 0;
  let skipped = 0;
  for (const p of programs) {
    const inv = programToInvestor(p.row, p.tier);

    // Idempotency: skip if an investor with the same name already exists
    const existingInv = await admin.firestore().collection("fundraises").doc(fundraiseId)
      .collection("investors").where("name", "==", inv.name).limit(1).get();
    if (!existingInv.empty) {
      skipped++;
      continue;
    }

    const r = await dr.addInvestor(fundraiseId, {
      email: inv.email,
      name: inv.name,
      commitment_amount: inv.commitment_amount,
    }, OWNER_USER);

    // Patch the investor doc with the rich tracker metadata
    await admin.firestore().collection("fundraises").doc(fundraiseId)
      .collection("investors").doc(r.investorId).update({
        ...inv.metadata,
        kind: "accelerator_or_program",
        imported_from: "tracker_v1.6",
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
      });

    added++;
  }

  console.log(`\nImport complete:`);
  console.log(`  Fundraise:  ${fundraiseId}`);
  console.log(`  Added:      ${added} investors`);
  console.log(`  Skipped:    ${skipped} (already present)`);

  // Apollo enrichment for top 3 if requested
  if (APOLLO_TOP3) {
    console.log(`\nApollo enrichment — top 3 priority targets...`);
    const apollo = require(path.join(__dirname, "..", "functions", "functions", "services", "marketingService", "apollo"));
    const top3 = [
      { program: "Y Combinator", title: "Group Partner", company: "Y Combinator" },
      { program: "Conviction Embed", title: "General Partner", company: "Conviction" },
      { program: "a16z Speedrun", title: "Partner", company: "Andreessen Horowitz" },
    ];
    for (const t of top3) {
      try {
        const r = await apollo.searchPeople({
          person_titles: [t.title],
          q_organization_name: t.company,
          per_page: 2,
        }, { tenantId: TENANT, userId: OWNER_USER, requestedBy: "tracker_import" });
        const found = (r.people || []).map(p => `${p.first_name} ${p.last_name_obfuscated || p.last_name || ""} (${p.title})`);
        console.log(`  ${t.program}: ${found.length > 0 ? found.join(" | ") : "no matches"}`);
      } catch (e) {
        console.log(`  ${t.program}: ERROR — ${e.message}`);
      }
    }
  }

  console.log("\n✅ Tracker import complete.\n");
  process.exit(0);
})().catch(e => { console.error("FATAL:", e.stack || e); process.exit(1); });
