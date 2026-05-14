"use strict";

/**
 * Apply a consistent segment taxonomy across all contacts in a tenant.
 *
 * Top-level groups (what Sean asked for 2026-05-14):
 *   - hom_dao_token_holders     — HOM DAO contributors (already tagged on push)
 *   - titleapp_ai_investors     — anyone with TitleApp LLC equity OR a future
 *                                 RegCF investor record. For now: the 114
 *                                 equity holders from the HOM DAO reconciliation.
 *   - network_sean              — anyone imported from Sean's LinkedIn
 *   - network_kent              — anyone imported from Kent's LinkedIn
 *   - sales_prospects           — anyone whose persona is a B2B prospect
 *
 * Sales-prospect verticals (sub-tags on sales_prospects):
 *   sales_real_estate, sales_automotive, sales_aviation, sales_health_ems,
 *   sales_government, sales_web3, sales_legal_professional,
 *   sales_government_contracting, sales_other
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... \
 *   TENANT_ID=ws_1778652045795_vk4sz1 \
 *     node scripts/applyContactSegments.js          # dry run
 *
 *   ... node scripts/applyContactSegments.js --apply  # write
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const TENANT_ID = process.env.TENANT_ID;
if (!TENANT_ID) { console.error("ERROR: set TENANT_ID"); process.exit(1); }

// ---- Vertical regex set ----
// Matched against company + title. First match wins. "_other" is the fallback.
const VERTICALS = [
  { tag: "sales_real_estate",     re: /\b(real estate|realtor|broker|brokerage|title|escrow|property management|reit|landlord|tenant|leasing|developer|construction|home builder|architect|appraiser|mls)\b/i },
  { tag: "sales_automotive",      re: /\b(automotive|auto|car dealership|dealership|dealer|vehicle|fleet|tesla|ford|gm|chrysler|toyota|honda|carvana|carmax|autotrader|rivian|lucid)\b/i },
  { tag: "sales_aviation",        re: /\b(aviation|aircraft|airline|airport|pilot|flight|aero|atc|faa|charter|fbo|cessna|boeing|airbus|gulfstream|jet|helicopter)\b/i },
  { tag: "sales_health_ems",      re: /\b(health|hospital|clinic|medical|physician|doctor|nurse|emt|paramedic|ems|biotech|pharma|life sciences|healthcare|mednet)\b/i },
  { tag: "sales_government",      re: /\b(government|gov\.|federal|state of |county of |city of |municipal|department of|agency|public sector|dod|gsa)\b/i },
  { tag: "sales_web3",            re: /\b(web3|crypto|blockchain|defi|nft|dao|tokeniz|ethereum|polygon|solana|cosmos|chainlink|coinbase|consensys)\b/i },
  { tag: "sales_legal_professional", re: /\b(law firm|attorney|counsel|legal|llp|paralegal|barrister|solicitor|esq\b)\b/i },
];

function inferVertical(contact) {
  const hay = `${contact.company || ""} ${contact.title || ""} ${(contact.personas?.[0]?.role_label) || ""}`;
  for (const v of VERTICALS) {
    if (v.re.test(hay)) return v.tag;
  }
  return "sales_other";
}

// ---- Read all contacts ----
(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — segment apply for tenant=${TENANT_ID}\n`);

  const snap = await db.collection("contacts").where("tenantId", "==", TENANT_ID).get();
  console.log("Total contacts in tenant:", snap.size);

  const planned = []; // { id, before, after, additions }
  const counts = { titleapp_ai_investors: 0, network_sean: 0, network_kent: 0, sales_prospects: 0, no_change: 0 };
  const verticalCounts = {};

  for (const d of snap.docs) {
    const c = d.data();
    if (c.status === "deleted") continue;
    const existing = Array.isArray(c.segments) ? new Set(c.segments) : new Set();
    const before = [...existing];
    const additions = new Set();

    // titleapp_ai_investors — anyone with TitleApp LLC equity (HOM DAO
    // shareholders). The HOM push tagged this segment as
    // titleapp_shareholders (plural) — match either form for safety.
    if (existing.has("titleapp_shareholders") || existing.has("titleapp_shareholder")) {
      additions.add("titleapp_ai_investors");
    }

    // network_kent / network_sean — derived from source
    if (c.source === "linkedin-export-kent" || existing.has("linkedin-network-kent")) {
      additions.add("network_kent");
    }
    if (c.source === "linkedin-sean" || existing.has("linkedin-network-sean")) {
      additions.add("network_sean");
    }

    // sales_prospects — anyone whose persona is a B2B prospect / customer
    // tier. Excludes investors (already a separate group) and HOM DAO
    // token holders (we already track them via their own segment).
    const persona = Array.isArray(c.personas) && c.personas[0];
    const isB2B = persona && (persona.type === "customer" || persona.tier === "prospect" || persona.tags?.includes("inferred-b2b") || persona.tags?.includes("inferred-csuite"));
    const isInvestor = persona && (persona.type === "investor");
    const isHomHolder = existing.has("hom_dao_token_holders");

    if (isB2B && !isInvestor && !isHomHolder) {
      additions.add("sales_prospects");
      const vert = inferVertical(c);
      additions.add(vert);
      verticalCounts[vert] = (verticalCounts[vert] || 0) + 1;
    }

    // Filter to actual NEW tags
    const toAdd = [...additions].filter(t => !existing.has(t));
    if (toAdd.length === 0) { counts.no_change += 1; continue; }

    const after = [...existing, ...toAdd];
    planned.push({ id: d.id, ref: d.ref, before, after, additions: toAdd });

    if (toAdd.includes("titleapp_ai_investors")) counts.titleapp_ai_investors += 1;
    if (toAdd.includes("network_kent")) counts.network_kent += 1;
    if (toAdd.includes("network_sean")) counts.network_sean += 1;
    if (toAdd.includes("sales_prospects")) counts.sales_prospects += 1;
  }

  console.log("\nPlanned changes:", JSON.stringify(counts, null, 2));
  console.log("Vertical breakdown (sales_prospects sub-tags):", JSON.stringify(verticalCounts, null, 2));
  console.log("Total contacts touched:", planned.length);

  if (!APPLY) {
    console.log("\n(dry run — pass --apply to write)");
    console.log("\nFirst 5 planned changes:");
    for (const p of planned.slice(0, 5)) console.log(`  ${p.id}: +[${p.additions.join(", ")}]`);
    process.exit(0);
  }

  // ---- Write in batches of 450 ----
  let written = 0;
  for (let i = 0; i < planned.length; i += 450) {
    const slice = planned.slice(i, i + 450);
    const batch = db.batch();
    for (const p of slice) {
      batch.update(p.ref, {
        segments: p.after,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      written += 1;
    }
    await batch.commit();
    console.log(`  committed ${written}/${planned.length}`);
  }
  console.log(`\nDONE — updated ${written} contacts.`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
