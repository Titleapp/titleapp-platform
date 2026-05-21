"use strict";

/**
 * Mines Apollo for fundraise leads — VC partners, accelerator MDs, angels —
 * matching SOCIII's ICP. Writes matches into the contacts collection scoped
 * to the specified tenant (SOCIII Inc.) with proper segment + tag metadata.
 *
 * Usage:
 *
 *   # 1. Get your Apollo API key (Apollo dashboard → Settings → Integrations → API)
 *   #    OR pull from Firebase secrets if not local:
 *   #    firebase functions:secrets:access APOLLO_API_KEY
 *
 *   export APOLLO_API_KEY=<your key>
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json
 *   export TENANT_ID=ws_1779168732286_42qw6m       # SOCIII Inc.
 *   export USER_UID=fPlJ76VM5kQaEtxlMVifVlzeOmq1   # Sean
 *
 *   # 2. Dry-run (no writes, no Apollo cost beyond search itself)
 *   node scripts/mineApolloFundraiseLeads.js
 *
 *   # 3. Apply
 *   node scripts/mineApolloFundraiseLeads.js --apply
 *
 *   # 4. Optionally filter to just one ICP
 *   node scripts/mineApolloFundraiseLeads.js --apply --icp=vc-seed-partners
 *
 * Idempotent: skips contacts already in target tenant by Apollo person ID.
 *
 * Cost: each search costs credits proportional to results returned.
 *       Hard cap of 50 per ICP (configurable below) to keep burn predictable.
 *       3 ICPs × 50 = ~150 credits per full run (well within Pro 4,020/mo).
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const apollo = require(path.join(__dirname, "..", "functions", "functions", "services", "marketingService", "apollo"));

const APPLY = process.argv.includes("--apply");
const ICP_FILTER_ARG = process.argv.find(a => a.startsWith("--icp="));
const ICP_FILTER = ICP_FILTER_ARG ? ICP_FILTER_ARG.split("=")[1] : null;
const TARGET_ARG = process.argv.find(a => a.startsWith("--target="));
const TARGET_COUNT = TARGET_ARG ? parseInt(TARGET_ARG.split("=")[1], 10) : null;

const TENANT_ID = process.env.TENANT_ID;
const USER_UID = process.env.USER_UID;

if (!TENANT_ID) {
  console.error("ERROR: set TENANT_ID (SOCIII Inc. tenant ID)");
  process.exit(1);
}
if (!USER_UID) {
  console.error("ERROR: set USER_UID (Sean's Firebase UID)");
  process.exit(1);
}
if (!process.env.APOLLO_API_KEY) {
  console.error("ERROR: set APOLLO_API_KEY (Apollo dashboard → Settings → Integrations)");
  process.exit(1);
}

// ICP definitions for SOCIII's fundraise. Tightening criteria = fewer/better
// matches. Loosening = more leads but more noise. Caps result count per ICP.
// Default target per ICP; override with --target=N
const DEFAULT_TARGET = 50;
const APOLLO_PER_PAGE_MAX = 100;

const ICPS = {
  "vc-seed-partners": {
    label: "Seed-stage VC partners at US firms",
    apolloQuery: {
      person_titles: ["Partner", "General Partner", "Managing Partner", "Principal", "Investment Partner"],
      q_organization_industries: ["Venture Capital & Private Equity"],
      person_locations: ["United States"],
      organization_num_employees_ranges: ["1,10", "11,50", "51,200"],
    },
    segment: "fundraise:vc-seed",
    tags: ["vc", "seed", "fundraise"],
  },
  "accelerator-leads": {
    label: "Accelerator + incubator program leads",
    apolloQuery: {
      person_titles: ["Managing Director", "Program Director", "Director of Programs", "Partner", "Investment Director"],
      q_keywords: "accelerator incubator startup program",
      person_locations: ["United States"],
    },
    segment: "fundraise:accelerators",
    tags: ["accelerator", "fundraise"],
  },
  "angels": {
    label: "Angel investors / independent investors",
    apolloQuery: {
      person_titles: ["Angel Investor", "Independent Investor", "Private Investor"],
      person_locations: ["United States"],
    },
    segment: "fundraise:angels",
    tags: ["angel", "fundraise"],
  },
};

(async () => {
  const icpKeys = ICP_FILTER ? [ICP_FILTER] : Object.keys(ICPS);
  if (ICP_FILTER && !ICPS[ICP_FILTER]) {
    console.error(`ERROR: unknown ICP '${ICP_FILTER}'. Available: ${Object.keys(ICPS).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — Apollo fundraise lead mining`);
  console.log(`  Tenant: ${TENANT_ID}`);
  console.log(`  By:     ${USER_UID}`);
  console.log(`  ICPs:   ${icpKeys.join(", ")}\n`);

  const burnBefore = await apollo.getMonthlyBurnRate();
  console.log(`Apollo budget BEFORE: ${burnBefore.used} / ${burnBefore.budget} credits (${burnBefore.percent}%)`);
  if (burnBefore.exceededHardAlert) {
    console.error(`HALT: Apollo budget >= 95% used. Stopping to avoid overrun.`);
    process.exit(1);
  }
  if (burnBefore.exceededSoftAlert) {
    console.warn(`WARN: Apollo budget >= 75% used. Continuing but watch the burn.`);
  }
  console.log("");

  const summary = {};

  for (const icpKey of icpKeys) {
    const icp = ICPS[icpKey];
    console.log(`\n=== ${icpKey} ===`);
    console.log(`  ${icp.label}`);

    try {
      // Paginate Apollo search until we hit the target or run out of results.
      // Dedupe by Apollo person ID across pages AND against contacts already
      // in this segment (so re-runs accumulate net-new instead of re-pulling).
      const target = TARGET_COUNT || DEFAULT_TARGET;
      const seenIds = new Set();

      // Load existing apollo_person_ids for this segment to avoid re-imports
      const existingSnap = await db.collection("contacts")
        .where("tenantId", "==", TENANT_ID)
        .where("segments", "array-contains", icp.segment)
        .get();
      for (const d of existingSnap.docs) {
        const id = d.data().source?.apollo_person_id;
        if (id) seenIds.add(id);
      }
      console.log(`  Existing in segment ${icp.segment}: ${existingSnap.size} (dedupe baseline)`);

      const collected = [];
      let page = 1;
      let totalMatches = 0;
      let maxPages = 20; // safety cap

      while (collected.length < target && page <= maxPages) {
        const { people, pagination } = await apollo.searchPeople({
          ...icp.apolloQuery,
          per_page: APOLLO_PER_PAGE_MAX,
          page,
        }, {
          tenantId: TENANT_ID,
          userId: USER_UID,
          requestedBy: `fundraise:mine:${icpKey}:p${page}`,
        });

        totalMatches = pagination?.total_entries || people.length;
        if (!people.length) break;

        let netNewThisPage = 0;
        for (const p of people) {
          if (!p.id) continue;
          if (seenIds.has(p.id)) continue;
          seenIds.add(p.id);
          collected.push(p);
          netNewThisPage += 1;
          if (collected.length >= target) break;
        }
        console.log(`  page ${page}: returned ${people.length}, net-new ${netNewThisPage}, running total ${collected.length}/${target}`);

        if (page >= (pagination?.total_pages || 1)) break;
        page += 1;
      }

      const people = collected;
      console.log(`\n  Total collected: ${people.length} (target ${target}, Apollo universe ~${totalMatches})\n`);

      const sample = people.slice(0, 8);
      console.log(`  Sample preview:`);
      for (const p of sample) {
        const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "(no name)";
        const title = p.title || "(no title)";
        const company = p.organization?.name || "(no org)";
        const emailMark = p.email ? "✓" : "·";
        console.log(`    ${emailMark} ${name.padEnd(28)} ${title.slice(0,32).padEnd(32)} @ ${company}`);
      }
      console.log("");

      if (!APPLY) {
        console.log(`  [dry run — not writing]`);
        summary[icpKey] = { found: people.length, would_write: people.length, dupes: 0 };
        continue;
      }

      // Apply: dedupe by Apollo person ID, then write
      let written = 0;
      let skipped = 0;
      for (const p of people) {
        if (!p.id) { skipped += 1; continue; }

        const dupe = await db.collection("contacts")
          .where("tenantId", "==", TENANT_ID)
          .where("source.apollo_person_id", "==", p.id)
          .limit(1)
          .get();
        if (!dupe.empty) { skipped += 1; continue; }

        const contact = apollo.apolloPersonToContact(p, {
          tenantId: TENANT_ID,
          source_sub: `fundraise:${icpKey}`,
          contact_tier: "investor",
          lifecycle_stage: "cold",
          owner: USER_UID,
        });
        contact.segments = [icp.segment];
        if (Array.isArray(contact.personas) && contact.personas[0]) {
          contact.personas[0].tags = icp.tags;
        }
        contact.source_member_uid = USER_UID;
        contact.imported_at = admin.firestore.FieldValue.serverTimestamp();
        contact.created_at = admin.firestore.FieldValue.serverTimestamp();
        contact.updated_at = admin.firestore.FieldValue.serverTimestamp();
        contact.enrichment_history = [{
          run_id: `apollo_search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          source: "apollo:search",
          paid_by_tenant_id: TENANT_ID,
          triggered_by_uid: USER_UID,
          fields_added: ["name", "email", "phone", "linkedin", "company", "title"].filter(f => {
            if (f === "email") return !!p.email;
            if (f === "phone") return !!(p.phone_numbers?.[0]);
            if (f === "linkedin") return !!p.linkedin_url;
            return true;
          }),
          at: new Date().toISOString(),
        }];

        await db.collection("contacts").add(contact);
        written += 1;
      }
      console.log(`  Wrote ${written} new contacts, skipped ${skipped} dupes`);
      summary[icpKey] = { found: people.length, written, dupes: skipped };

    } catch (e) {
      console.error(`  ERROR on ${icpKey}: ${e.message}`);
      summary[icpKey] = { error: e.message };
    }
  }

  const burnAfter = await apollo.getMonthlyBurnRate();
  const spent = burnAfter.used - burnBefore.used;
  console.log(`\n=== DONE ===`);
  console.log(`Apollo budget AFTER:  ${burnAfter.used} / ${burnAfter.budget} credits (${burnAfter.percent}%)`);
  console.log(`Spent this run:       ${spent} credits`);
  console.log("");
  console.log("Per-ICP summary:");
  for (const [k, v] of Object.entries(summary)) {
    if (v.error) console.log(`  ${k}: ERROR — ${v.error}`);
    else if (APPLY) console.log(`  ${k}: ${v.written} written, ${v.dupes} dupes (of ${v.found} found)`);
    else console.log(`  ${k}: ${v.would_write} would write (of ${v.found} found) [DRY RUN]`);
  }
  console.log("");

  process.exit(0);
})().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
