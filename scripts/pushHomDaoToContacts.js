"use strict";

/**
 * Push the reconciled HOM DAO dataset into Firestore as contacts +
 * holdings + kycRecords. Reads /tmp/hom_unified.json (produced by
 * scripts/reconcileHomDao.js), applies manual merge overrides, then
 * writes to the TitleApp AI tenant.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... \
 *   TENANT_ID=ws_1778652045795_vk4sz1 \
 *   SOURCE_MEMBER_UID=4WHjuUgEseQfBr0Tg92YXXhu6Mj1 \
 *     node scripts/pushHomDaoToContacts.js            # dry run
 *
 *   ... node scripts/pushHomDaoToContacts.js --apply  # write
 */

const path = require("path");
const fs = require("fs");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const TENANT_ID = process.env.TENANT_ID;
const SOURCE_MEMBER_UID = process.env.SOURCE_MEMBER_UID;
if (!TENANT_ID) { console.error("ERROR: set TENANT_ID"); process.exit(1); }
if (!SOURCE_MEMBER_UID) { console.error("ERROR: set SOURCE_MEMBER_UID"); process.exit(1); }

// ----- Manual merge directives from Sean (2026-05-14) -----
// Maps a source-name fingerprint → the fingerprint to merge it INTO.
// The "into" fingerprint becomes the canonical row; the merged person's
// data (wallets, emails, holdings, kyc, etc.) gets folded in.
function fp(name) {
  let s = String(name).toLowerCase().split(/\s+-\s+/)[0];
  s = s.replace(/[.,'']/g, "").replace(/\s+/g, " ").trim();
  return s.split(" ").filter(t => t.length > 1).sort().join(" ");
}

const NAME_MERGES = {
  [fp("A.B Farrely")]: fp("Apple Farrely"),
  [fp("Max Watkin - Plutus")]: fp("Max Donovan Watkin"),
  [fp("Tokarev Pavlovich")]: fp("Tokarev Daniel"),
};

// Preferred canonical email per fingerprint. Other emails go into alt_emails.
const CANONICAL_EMAIL = {
  [fp("Sean Combs")]: "seanlcombs@gmail.com",
  [fp("Sean Lee Combs")]: "seanlcombs@gmail.com",
  [fp("Eric Herzenberg")]: "echerz@gmail.com",
};

// ----- Read reconciled data -----
const data = JSON.parse(fs.readFileSync("/tmp/hom_unified.json", "utf8"));
console.log(`Loaded ${data.unified.length} unified people from /tmp/hom_unified.json`);

// Apply NAME_MERGES — fold source into target.
const byFp = new Map();
for (const p of data.unified) {
  let targetFp = p.fingerprint;
  while (NAME_MERGES[targetFp]) targetFp = NAME_MERGES[targetFp]; // follow chain
  if (!byFp.has(targetFp)) {
    byFp.set(targetFp, {
      fingerprint: targetFp,
      display_name: p.display_name,
      name_variants: new Set(p.name_variants),
      emails: new Set(p.emails),
      phones: new Set(p.phones),
      wallets: new Set(p.wallets),
      contribution_wallets: new Set(p.contribution_wallets),
      addresses: new Set(p.addresses),
      photo_ids: new Set(p.photo_ids),
      donors: new Set(p.donors),
      aml_attested: p.aml_attested,
      kyc_submitted_at: [...p.kyc_submitted_at],
      holdings: [...p.holdings],
    });
  } else {
    const target = byFp.get(targetFp);
    p.name_variants.forEach(n => target.name_variants.add(n));
    p.emails.forEach(e => target.emails.add(e));
    p.phones.forEach(x => target.phones.add(x));
    p.wallets.forEach(x => target.wallets.add(x));
    p.contribution_wallets.forEach(x => target.contribution_wallets.add(x));
    p.addresses.forEach(x => target.addresses.add(x));
    p.photo_ids.forEach(x => target.photo_ids.add(x));
    p.donors.forEach(x => target.donors.add(x));
    target.aml_attested = target.aml_attested || p.aml_attested;
    target.kyc_submitted_at.push(...p.kyc_submitted_at);
    target.holdings.push(...p.holdings);
  }
}

console.log(`After ${Object.keys(NAME_MERGES).length} manual merges: ${byFp.size} canonical people`);

// ----- Build write plan -----
const plan = [];
for (const [fingerprint, p] of byFp.entries()) {
  const emails = [...p.emails];
  const canonicalEmail = CANONICAL_EMAIL[fingerprint] && emails.includes(CANONICAL_EMAIL[fingerprint])
    ? CANONICAL_EMAIL[fingerprint]
    : (emails[0] || null);
  const altEmails = emails.filter(e => e !== canonicalEmail);

  // Display name — prefer the longest variant (usually most complete).
  const displayName = [...p.name_variants].sort((a, b) => b.length - a.length)[0];
  const [firstName, ...rest] = displayName.replace(/\s+-\s+.*$/, "").trim().split(/\s+/);
  const lastName = rest.join(" ") || null;

  const hasEquity = p.holdings.some(h => h.issuer === "titleapp_llc");
  const hasContribution = p.holdings.some(h => h.source_event?.includes("contribution"));
  const isAdvisor = displayName.includes("Advisor");
  const isTeam = p.holdings.some(h => h.source_event === "team_grant");

  // Persona — investor / shareholder tier for equity holders.
  const tags = ["hom_dao_contributor", "imported_2026_05_14"];
  if (hasEquity) tags.push("titleapp_shareholder");
  if (isAdvisor) tags.push("advisor");
  if (isTeam) tags.push("team_grant_recipient");

  const persona = {
    id: "p_001",
    role_label: isAdvisor ? "Advisor" : (isTeam ? "Team / Founder" : "Investor"),
    type: "investor",
    tier: "investor",
    lifecycle_stage: "engaged",
    lead_score: hasEquity ? 90 : 50,
    tags,
    notes: null,
    owner: SOURCE_MEMBER_UID,
    project_bindings: [],
    created_at: new Date().toISOString(),
    last_interaction_at: null,
    compliance: {
      accreditation_status: "none",       // never verified at the platform layer
      accreditation_method: null,
      ofac_status: "not_screened",
      kyc_status: p.kyc_submitted_at.length > 0 ? "self_attested" : "none",
    },
  };

  const segments = ["hom_dao_contributors"];
  if (hasEquity) segments.push("titleapp_shareholders");
  if (isAdvisor) segments.push("advisors");
  if (isTeam) segments.push("team");

  plan.push({
    fingerprint,
    contactDoc: {
      tenantId: TENANT_ID,
      schema_version: "spine_v2.1",
      name: displayName,
      first_name: firstName || null,
      last_name: lastName,
      email: canonicalEmail,
      alt_emails: altEmails,
      phone: [...p.phones][0] || null,
      phones: [...p.phones],
      company: null,
      title: persona.role_label,
      source: "hom_dao_reconciliation_2026_05_14",
      derived_from: "HOM_DAO",
      segments,
      primary_persona_id: persona.id,
      personas: [persona],
      types_index: ["investor"],
      tiers_index: ["investor"],
      // Wallets + addresses live on the contact for now; the holdings rows
      // carry the per-asset receipt. Wallet-to-asset linkage stays in
      // enrichment_history once we cross-check signatures.
      wallets: [...p.wallets],
      contribution_wallets: [...p.contribution_wallets],
      addresses_on_file: [...p.addresses],
      donors: [...p.donors],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: SOURCE_MEMBER_UID,
      source_member_uid: SOURCE_MEMBER_UID,
      imported_at: admin.firestore.FieldValue.serverTimestamp(),
      enrichment_history: [],
    },
    holdings: p.holdings,
    kycRecords: p.kyc_submitted_at.map(k => ({
      tenantId: TENANT_ID,
      form_source: k.form,
      submitted_at: k.at,
      photo_id_urls: [...p.photo_ids],
      aml_attested: p.aml_attested,
      wallet_addresses: [...p.wallets],
      verification_status: "self_attested",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    })),
  });
}

// ----- Plan summary -----
const totals = {
  contacts: plan.length,
  with_email: plan.filter(p => p.contactDoc.email).length,
  with_wallet: plan.filter(p => p.contactDoc.wallets.length > 0).length,
  with_kyc: plan.filter(p => p.kycRecords.length > 0).length,
  with_equity: plan.filter(p => p.holdings.some(h => h.issuer === "titleapp_llc")).length,
  total_holdings: plan.reduce((s, p) => s + p.holdings.length, 0),
  total_kyc_records: plan.reduce((s, p) => s + p.kycRecords.length, 0),
};
console.log("\nWrite plan:", JSON.stringify(totals, null, 2));

if (!APPLY) {
  console.log("\n(dry run — pass --apply to write)");
  console.log("\nFirst 3 planned contact docs:");
  for (const p of plan.slice(0, 3)) {
    console.log("  -", p.contactDoc.name, "| email:", p.contactDoc.email, "| wallets:", p.contactDoc.wallets.length, "| holdings:", p.holdings.length, "| kyc:", p.kycRecords.length);
  }
  process.exit(0);
}

// ----- WRITE -----
(async () => {
  let contactsWritten = 0;
  let holdingsWritten = 0;
  let kycWritten = 0;
  for (const p of plan) {
    const contactRef = await db.collection("contacts").add(p.contactDoc).catch(e => {
      console.error("contact write failed for", p.contactDoc.name, e.message);
      return null;
    });
    if (!contactRef) continue;
    contactsWritten += 1;

    for (let i = 0; i < p.holdings.length; i += 450) {
      const slice = p.holdings.slice(i, i + 450);
      const batch = db.batch();
      for (const h of slice) {
        const ref = db.collection("holdings").doc();
        batch.set(ref, {
          contactId: contactRef.id,
          tenantId: TENANT_ID,
          issuer: h.issuer,
          asset_class: h.asset_class,
          units: h.units,
          basis_per_unit: h.basis_per_unit || null,
          pct_equity: h.pct_equity || null,
          source_event: h.source_event,
          source_doc: h.source_doc,
          source_row: h.source_row || null,
          method: h.method || null,
          status: h.status || null,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          created_by: SOURCE_MEMBER_UID,
        });
        holdingsWritten += 1;
      }
      await batch.commit();
    }

    for (const k of p.kycRecords) {
      await db.collection("kycRecords").add({ ...k, contactId: contactRef.id });
      kycWritten += 1;
    }

    if (contactsWritten % 25 === 0) {
      console.log(`  ${contactsWritten}/${plan.length} contacts | ${holdingsWritten} holdings | ${kycWritten} kyc`);
    }
  }
  console.log(`\nDONE — ${contactsWritten} contacts, ${holdingsWritten} holdings, ${kycWritten} kyc records.`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
