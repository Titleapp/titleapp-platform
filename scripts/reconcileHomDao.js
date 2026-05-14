"use strict";

/**
 * Reconcile HOM DAO source files into a unified person+holdings+kyc
 * dataset. NO Firestore writes — output is /tmp/hom_unified.json plus
 * a console report. Sean reviews the report before we push to contacts/
 * holdings/ kycRecords/ collections.
 *
 * Sources (all under ~/Downloads):
 *   1. HOM DAO Initial Contributions (1).xlsx — 8 sheets (cap table)
 *   2. HOM DAO Whitelist Form and AML statement 2-10-2022 (Responses).xlsx
 *   3. HOM DAO Contact Database 3-2-2022.xlsx — newer cleaner form
 *
 *   node scripts/reconcileHomDao.js
 */

const path = require("path");
const fs = require("fs");
const XLSX = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "xlsx"));

const F1 = "/Users/seancombs/Downloads/HOM DAO Initial Contributions (1).xlsx";
const F2 = "/Users/seancombs/Downloads/HOM DAO Whitelist Form and AML statement 2-10-2022 (Responses).xlsx";
const F3 = "/Users/seancombs/Downloads/HOM DAO Contact Database 3-2-2022.xlsx";

// ---- Name canonicalization ----
// Strip alias trailers ("Roman Jensen - Neptune" → "roman jensen"),
// punctuation, double-spaces. Lowercase.
function canonName(raw) {
  if (!raw) return null;
  let s = String(raw).toLowerCase();
  // Drop alias trailer after " - " (the HOM DAO god-name aliases)
  s = s.split(/\s+-\s+/)[0];
  // Drop punctuation, normalize whitespace
  s = s.replace(/[.,'']/g, "").replace(/\s+/g, " ").trim();
  // Fix common typo: "sean lee combs" → "sean combs"
  // Actually keep middle names; only collapse same person across spelling
  // variants by also storing a token-sorted fingerprint.
  return s;
}

function nameFingerprint(raw) {
  if (!raw) return null;
  const tokens = canonName(raw).split(" ").filter(t => t.length > 1).sort();
  return tokens.join(" ");
}

// ---- Excel serial date → ISO ----
// Google Sheets/Excel store dates as days since 1899-12-30.
function excelToIso(serial) {
  if (typeof serial !== "number" || serial < 1000) return null;
  const ms = (serial - 25569) * 86400 * 1000;
  return new Date(ms).toISOString();
}

// ---- Wallet normalization ----
function normalizeWallet(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!/^0x[0-9a-f]{40}$/i.test(s)) return null; // garbage (phone numbers, etc.)
  return s.toLowerCase();
}

// ---- Email normalization ----
function normalizeEmail(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

// ---- People map ----
// Keyed by name fingerprint. Each value collects every datapoint we've
// seen for that person across the 3 files.
const people = new Map();
function getOrCreate(name) {
  const fp = nameFingerprint(name);
  if (!fp) return null;
  if (!people.has(fp)) {
    people.set(fp, {
      fingerprint: fp,
      display_name: String(name).trim(),
      name_variants: new Set([String(name).trim()]),
      emails: new Set(),
      phones: new Set(),
      wallets: new Set(),
      contribution_wallets: new Set(),
      addresses: new Set(),
      photo_ids: new Set(),
      donors: new Set(), // who referred them / gave them tokens
      kyc_submitted_at: [],
      aml_attested: false,
      holdings: [], // { source_event, asset_class, units, basis, source_doc, source_row }
      raw_rows: [], // every source row for audit
    });
  }
  return people.get(fp);
}

// ---- File 1: HOM DAO Initial Contributions ----
console.log("\n=== Reading HOM DAO Initial Contributions ===");
{
  const wb = XLSX.readFile(F1);

  // Sheet: HOM reconciliation — the canonical equity sheet.
  // Spreadsheet row 0 is a banner ("RECONCILIATION FOR CONVERSION TO HOM"
  // + stray "143" + "Contributors"), row 1 is the real column-name row,
  // row 2+ are data.
  // Column index mapping (in header:1 mode):
  //   0=Name, 1=Initial$, 2=BasisPerPHOM, 3=pHOMFromContribution,
  //   4=Referrals, 5=ReferralAward, 6=TotalFromReferral,
  //   7=SweatEquityTokens, 8=SweatEquityBasis, 9=SweatEquityValue,
  //   10=MonthsWorked, 11=EarnOutTokens, 12=StakingAwardTokens,
  //   13=GiftedTokens, 14=Donor, 15=TotalPHOM, 16=HOMAt1.45,
  //   17=TitleAppShares, 18=PctEquity
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets["HOM reconciliation"], { header: 1, defval: null });
    let nameCount = 0;
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      const name = r[0];
      if (!name || typeof name !== "string") continue;
      const p = getOrCreate(name);
      if (!p) continue;
      p.name_variants.add(name.trim());
      nameCount += 1;
      const donor = r[14];
      if (donor) p.donors.add(String(donor).trim());

      const pushHolding = (event, units, basis) => {
        if (units == null || units === 0 || !Number.isFinite(Number(units))) return;
        p.holdings.push({
          source_doc: "Initial Contributions / HOM reconciliation",
          source_row: i,
          source_event: event,
          issuer: "homdao",
          asset_class: "pHOM",
          units: Number(units),
          basis_per_unit: basis != null ? Number(basis) : null,
        });
      };
      pushHolding("round_1_contribution", r[3], r[2]);   // pHOM tokens from contribution + basis
      pushHolding("referral_award", r[6], null);
      pushHolding("sweat_equity", r[7], r[8]);
      pushHolding("earn_out", r[11], null);
      pushHolding("staking_award", r[12], null);
      pushHolding("gift", r[13], null);

      // USD contribution as its own row (so the dollar amount survives).
      if (r[1] != null && Number.isFinite(Number(r[1]))) {
        p.holdings.push({
          source_doc: "Initial Contributions / HOM reconciliation",
          source_row: i,
          source_event: "round_1_contribution_usd",
          issuer: "homdao",
          asset_class: "USD_contribution",
          units: Number(r[1]),
        });
      }

      // Title App LLC equity from the canonical reconciliation.
      if (r[17] != null && Number.isFinite(Number(r[17]))) {
        p.holdings.push({
          source_doc: "Initial Contributions / HOM reconciliation",
          source_row: i,
          source_event: "phom_to_hom_to_equity_conversion",
          issuer: "titleapp_llc",
          asset_class: "titleapp_llc_shares",
          units: Number(r[17]),
          pct_equity: r[18] != null ? Number(r[18]) : null,
        });
      }
      // Derived HOM at the 1:1.45 conversion ratio.
      if (r[16] != null && Number.isFinite(Number(r[16]))) {
        p.holdings.push({
          source_doc: "Initial Contributions / HOM reconciliation",
          source_row: i,
          source_event: "phom_to_hom_conversion_1_45",
          issuer: "homdao",
          asset_class: "HOM",
          units: Number(r[16]),
        });
      }
      p.raw_rows.push({ file: "Initial Contributions", sheet: "HOM reconciliation", row: i, data: r });
    }
    console.log(`  HOM reconciliation: ${nameCount} contributor rows parsed`);
  }

  // Sheet: Contributors — round 1 contributions detail
  {
    const json = XLSX.utils.sheet_to_json(wb.Sheets["Contributors"], { defval: null });
    let added = 0;
    for (const r of json) {
      const name = r["NAME"];
      if (!name || typeof name !== "string") continue;
      const p = getOrCreate(name);
      if (!p) continue;
      p.name_variants.add(name.trim());
      if (r["REFERAL FROM"]) p.donors.add(String(r["REFERAL FROM"]).trim());
      if (r["CONTRIBUTION R1"] && Number.isFinite(Number(r["CONTRIBUTION R1"]))) {
        // Only add if we don't already have a round_1_contribution holding for this person
        const hasR1 = p.holdings.some(h => h.source_event === "round_1_contribution");
        if (!hasR1) {
          p.holdings.push({
            source_doc: "Initial Contributions / Contributors",
            source_event: "round_1_contribution_usd",
            issuer: "homdao",
            asset_class: "USD_contribution",
            units: Number(r["CONTRIBUTION R1"]),
            method: r["METHOD OF CONTRIBUTION"],
          });
          added += 1;
        }
      }
      p.raw_rows.push({ file: "Initial Contributions", sheet: "Contributors", data: r });
    }
    console.log(`  Contributors: ${added} new USD-contribution rows`);
  }

  // Sheet: Tokens — has Metamask address
  {
    const json = XLSX.utils.sheet_to_json(wb.Sheets["Tokens"], { defval: null });
    let walletAdded = 0;
    for (const r of json) {
      const name = r["Name"];
      if (!name) continue;
      const p = getOrCreate(name);
      if (!p) continue;
      const w = normalizeWallet(r["Metamask Address:"]);
      if (w) { p.wallets.add(w); walletAdded += 1; }
      p.raw_rows.push({ file: "Initial Contributions", sheet: "Tokens", data: r });
    }
    console.log(`  Tokens: ${walletAdded} wallet addresses linked`);
  }

  // Sheet: Team Distributions — has email + wallet for team grants
  // Row 0 is the banner ("Team Distributions"), row 1 is the column-header
  // row (Name, Tokens, Contribution, CostBasis, Email, Date, Status, Nonce,
  // WalletAddress), data starts at row 2.
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets["Team Distributions"], { header: 1, defval: null });
    let count = 0;
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      const name = r[0];
      if (!name || typeof name !== "string") continue;
      const p = getOrCreate(name);
      if (!p) continue;
      const email = normalizeEmail(r[4]);
      if (email) p.emails.add(email);
      const w = normalizeWallet(r[8]);
      if (w) p.wallets.add(w);
      if (r[1] && Number.isFinite(Number(r[1]))) {
        p.holdings.push({
          source_doc: "Initial Contributions / Team Distributions",
          source_event: "team_grant",
          issuer: "homdao",
          asset_class: "pHOM",
          units: Number(r[1]),
          basis_per_unit: r[3] != null ? Number(r[3]) : null,
          contribution_basis: r[2] != null ? Number(r[2]) : null,
          status: r[6] || null,
        });
        count += 1;
      }
      p.raw_rows.push({ file: "Initial Contributions", sheet: "Team Distributions", row: i, data: r });
    }
    console.log(`  Team Distributions: ${count} team-grant holdings`);
  }
}

// ---- File 2: Whitelist + AML (2022-02-10) ----
console.log("\n=== Reading Whitelist + AML (2022-02-10) ===");
{
  const wb = XLSX.readFile(F2);
  const json = XLSX.utils.sheet_to_json(wb.Sheets["Form Responses 1"], { defval: null });
  let attached = 0;
  for (const r of json) {
    const name = r["Name"];
    if (!name) continue;
    const p = getOrCreate(name);
    if (!p) continue;
    attached += 1;
    const email = normalizeEmail(r["Email Address"]);
    if (email) p.emails.add(email);
    // The "Address" field is messy — phone, address, or wallet nonce.
    // Try to detect each.
    const addr = r["Address"];
    if (addr) {
      const s = String(addr).trim();
      if (/^\+?\d{10,}$/.test(s.replace(/[\s\-()]/g, ""))) {
        p.phones.add(s);
      } else if (/^[A-Za-z]/.test(s) || /,/.test(s)) {
        p.addresses.add(s);
      } else {
        // Unknown — keep as raw note
        p.addresses.add(`[unverified] ${s}`);
      }
    }
    const w = normalizeWallet(r["MetaMask Wallet Address: Please use your Polygon/MATIC network address"]);
    if (w) p.wallets.add(w);
    const photo = r["Photo ID: Passport or Valid Government ID (Driver's License or Government ID)"];
    if (photo) p.photo_ids.add(String(photo).trim());
    if (r["Anti-Money Laundering Verification Statement"]) p.aml_attested = true;
    const iso = excelToIso(r["Timestamp"]);
    if (iso) p.kyc_submitted_at.push({ form: "whitelist_2022_02_10", at: iso });
    p.raw_rows.push({ file: "Whitelist 2022-02-10", data: r });
  }
  console.log(`  Whitelist 2022-02-10: ${attached} KYC records attached`);
}

// ---- File 3: Contact Database (2022-03-02) — newer, cleaner ----
console.log("\n=== Reading Contact Database (2022-03-02) ===");
{
  const wb = XLSX.readFile(F3);
  const json = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { defval: null });
  let attached = 0;
  for (const r of json) {
    const name = r["Name"];
    if (!name) continue;
    const p = getOrCreate(name);
    if (!p) continue;
    attached += 1;
    const email = normalizeEmail(r["Email Address"]);
    if (email) p.emails.add(email);
    if (r["Address"]) p.addresses.add(String(r["Address"]).trim());
    if (r["Phone Number"]) p.phones.add(String(r["Phone Number"]).trim());
    const contribWallet = normalizeWallet(r["If you are sending a contribution please identify the wallet address"]);
    if (contribWallet) p.contribution_wallets.add(contribWallet);
    const metaWallet = normalizeWallet(r["MetaMask / Polygon/MATIC network Wallet Address"]);
    if (metaWallet) p.wallets.add(metaWallet);
    // Find the photo column dynamically (long header)
    const photoKey = Object.keys(r).find(k => /upload a photograph/i.test(k));
    if (photoKey && r[photoKey]) p.photo_ids.add(String(r[photoKey]).trim());
    const amlKey = Object.keys(r).find(k => /Anti-Money Laundering/i.test(k));
    if (amlKey && r[amlKey]) p.aml_attested = true;
    const iso = excelToIso(r["Timestamp"]);
    if (iso) p.kyc_submitted_at.push({ form: "contact_database_2022_03_02", at: iso });
    p.raw_rows.push({ file: "Contact Database 2022-03-02", data: r });
  }
  console.log(`  Contact Database 2022-03-02: ${attached} KYC records attached`);
}

// ---- Reconciliation report ----
console.log("\n=== Reconciliation summary ===");

const summary = {
  unique_people: people.size,
  with_email: 0,
  with_wallet: 0,
  with_kyc: 0,
  with_aml_attestation: 0,
  with_photo_id: 0,
  with_titleapp_equity: 0,
  total_holdings_rows: 0,
  conflicts_multiple_wallets: 0,
  conflicts_multiple_emails: 0,
  gaps_holder_no_kyc: 0,
  gaps_kyc_no_holdings: 0,
};

const conflicts = [];
const gaps = [];
const unified = [];

for (const [fp, p] of people.entries()) {
  const wallets = [...p.wallets];
  const emails = [...p.emails];
  const hasEquity = p.holdings.some(h => h.issuer === "titleapp_llc");
  const hasKyc = p.kyc_submitted_at.length > 0;

  if (emails.length > 0) summary.with_email += 1;
  if (wallets.length > 0) summary.with_wallet += 1;
  if (hasKyc) summary.with_kyc += 1;
  if (p.aml_attested) summary.with_aml_attestation += 1;
  if (p.photo_ids.size > 0) summary.with_photo_id += 1;
  if (hasEquity) summary.with_titleapp_equity += 1;
  summary.total_holdings_rows += p.holdings.length;

  if (wallets.length > 1) {
    summary.conflicts_multiple_wallets += 1;
    conflicts.push({ kind: "multiple_wallets", name: p.display_name, wallets });
  }
  if (emails.length > 1) {
    summary.conflicts_multiple_emails += 1;
    conflicts.push({ kind: "multiple_emails", name: p.display_name, emails });
  }
  if (p.holdings.length > 0 && !hasKyc) {
    summary.gaps_holder_no_kyc += 1;
    gaps.push({ kind: "holder_no_kyc", name: p.display_name, holdings_count: p.holdings.length, has_wallet: wallets.length > 0, has_email: emails.length > 0 });
  }
  if (hasKyc && p.holdings.length === 0) {
    summary.gaps_kyc_no_holdings += 1;
    gaps.push({ kind: "kyc_no_holdings", name: p.display_name });
  }

  unified.push({
    fingerprint: fp,
    display_name: p.display_name,
    name_variants: [...p.name_variants],
    emails: [...p.emails],
    phones: [...p.phones],
    wallets: [...p.wallets],
    contribution_wallets: [...p.contribution_wallets],
    addresses: [...p.addresses],
    photo_ids: [...p.photo_ids],
    donors: [...p.donors],
    aml_attested: p.aml_attested,
    kyc_submitted_at: p.kyc_submitted_at,
    holdings: p.holdings,
    holdings_count: p.holdings.length,
    has_equity: hasEquity,
  });
}

console.log(JSON.stringify(summary, null, 2));

console.log("\n=== Top holders by Title App % equity ===");
const equityHolders = unified
  .filter(u => u.holdings.some(h => h.pct_equity != null))
  .map(u => ({
    name: u.display_name,
    pct: u.holdings.find(h => h.pct_equity != null).pct_equity,
    shares: u.holdings.find(h => h.units != null && h.source_event === "phom_to_hom_to_equity_conversion")?.units,
    has_kyc: u.kyc_submitted_at.length > 0,
    has_wallet: u.wallets.length > 0,
  }))
  .sort((a, b) => (b.pct || 0) - (a.pct || 0));
for (const h of equityHolders.slice(0, 25)) {
  const pctStr = h.pct != null ? `${(h.pct * 100).toFixed(4)}%` : "—";
  const kycStr = h.has_kyc ? "KYC✓" : "KYC✗";
  const walletStr = h.has_wallet ? "wallet✓" : "wallet✗";
  console.log(`  ${pctStr.padStart(10)}  ${String(h.shares ?? "—").padStart(8)} shares  ${kycStr}  ${walletStr}  ${h.name}`);
}
console.log(`  ... ${equityHolders.length} total equity holders`);

console.log("\n=== Conflicts ===");
for (const c of conflicts.slice(0, 20)) console.log(`  ${c.kind}: ${c.name} →`, c.wallets || c.emails);
if (conflicts.length > 20) console.log(`  ... ${conflicts.length - 20} more`);

console.log("\n=== Gaps (sample) ===");
const holderNoKyc = gaps.filter(g => g.kind === "holder_no_kyc");
console.log(`  Holders without KYC: ${holderNoKyc.length}`);
for (const g of holderNoKyc.slice(0, 10)) {
  console.log(`    ${g.name} — ${g.holdings_count} holdings, email=${g.has_email}, wallet=${g.has_wallet}`);
}

const kycNoHoldings = gaps.filter(g => g.kind === "kyc_no_holdings");
console.log(`  KYC without holdings: ${kycNoHoldings.length}`);
for (const g of kycNoHoldings.slice(0, 10)) console.log(`    ${g.name}`);

fs.writeFileSync("/tmp/hom_unified.json", JSON.stringify({ summary, conflicts, gaps, unified }, null, 2));
console.log(`\nWrote /tmp/hom_unified.json (${unified.length} unified people)`);
