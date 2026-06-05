#!/usr/bin/env node
/**
 * attom-test-scott-oakland-mf.js
 *
 * Quick ATTOM API test — pulls real Oakland multifamily data so Sean can
 * see what the RE Data Worker would actually surface to Scott on Monday.
 *
 * Strategy:
 *   1. Search Oakland multifamily (5+ units, postal codes around Fruitvale/
 *      East Oakland — the value-add hunting ground)
 *   2. For top results, pull expanded profile (owner, last sale, mortgage)
 *   3. For one property, pull sales history + AVM + comparable sales
 *   4. Format like a "Data Worker view" so Sean can see the demo shape
 *
 * Usage:
 *   ATTOM_API_KEY=... node scripts/attom-test-scott-oakland-mf.js
 *
 * Output: written to ~/Downloads/scott-oakland-mf-attom-test.txt
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ATTOM_KEY = process.env.ATTOM_API_KEY;
if (!ATTOM_KEY) {
  console.error("FATAL: ATTOM_API_KEY env var not set");
  process.exit(1);
}

const BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

const HEADERS = {
  "apikey": ATTOM_KEY,
  "accept": "application/json",
};

async function attomGet(pathSuffix, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${pathSuffix}?${qs}`;
  console.log(`[ATTOM] GET ${pathSuffix}?${qs}`);
  const res = await fetch(url, { headers: HEADERS });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) {
    return { ok: false, status: res.status, raw: text.slice(0, 500), error: "JSON parse failed" };
  }
  return { ok: res.ok, status: res.status, data };
}

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return "—";
  return "$" + Number(n).toLocaleString("en-US");
}
function fmtDate(d) {
  if (!d) return "—";
  return String(d).slice(0, 10);
}
function safe(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return null;
    cur = cur[k];
  }
  return cur;
}

async function main() {
  const output = [];
  const log = (s) => { console.log(s); output.push(s); };

  log("================================================================================");
  log("REAL ESTATE DATA WORKER — DOGFOOD TEST");
  log("Scott Eschelman use case: Oakland multifamily intelligence");
  log(`Pulled live from ATTOM at ${new Date().toISOString()}`);
  log("================================================================================");
  log("");

  // -------- Step 1: search multifamily in Oakland ZIPs --------
  log("[Step 1] Searching Oakland multifamily — postal code 94601 (Fruitvale / East Oakland)...");
  log("");

  const search = await attomGet("/property/snapshot", {
    postalcode: "94601",
    propertytype: "APARTMENT",   // ATTOM's MF/apartment category
    pagesize: "20",
  });

  if (!search.ok) {
    log(`[Step 1] FAILED — HTTP ${search.status}`);
    log(JSON.stringify(search, null, 2).slice(0, 1000));
    log("");
    log("Trying fallback: any property type, postal 94601, then filtering...");
    const fallback = await attomGet("/property/snapshot", { postalcode: "94601", pagesize: "20" });
    if (!fallback.ok) {
      log(`[Step 1 fallback] FAILED — HTTP ${fallback.status}`);
      log(JSON.stringify(fallback, null, 2).slice(0, 800));
      writeOutput(output);
      return;
    }
    log(`[Step 1 fallback] OK — ${safe(fallback.data, "status", "total") || "?"} total in 94601`);
    log("Sample property record keys:");
    const first = safe(fallback.data, "property", 0);
    log(first ? Object.keys(first).join(", ") : "(no properties)");
    writeOutput(output);
    return;
  }

  const properties = safe(search.data, "property") || [];
  log(`[Step 1] OK — ${properties.length} properties returned (total: ${safe(search.data, "status", "total") || "?"})`);
  log("");

  if (properties.length === 0) {
    log("No multifamily found via APARTMENT propertytype filter. Trying broader search...");
    const broader = await attomGet("/property/snapshot", { postalcode: "94601", pagesize: "5" });
    log(`Broader OK status: ${broader.ok}, total: ${safe(broader.data, "status", "total") || "?"}`);
    if (safe(broader.data, "property")) {
      const sample = broader.data.property[0];
      log("Sample property:");
      log(JSON.stringify(sample, null, 2).slice(0, 2000));
    }
    writeOutput(output);
    return;
  }

  // -------- Step 2: format what we got into Data Worker view --------
  log("================================================================================");
  log("DATA WORKER VIEW — Oakland 94601 Multifamily Snapshot");
  log("================================================================================");
  log("");

  const topN = Math.min(properties.length, 5);
  for (let i = 0; i < topN; i++) {
    const p = properties[i];
    const addr = safe(p, "address");
    const sale = safe(p, "sale");
    const assessment = safe(p, "assessment");
    const lot = safe(p, "lot");
    const building = safe(p, "building");
    const owner = safe(p, "owner");
    const summary = safe(p, "summary");

    log(`────────────────────────────────────────────────────────────────────────────────`);
    log(`PROPERTY ${i + 1} — ${safe(addr, "oneLine") || "(no address)"}`);
    log(`────────────────────────────────────────────────────────────────────────────────`);
    log(`  ATTOM ID:         ${safe(p, "identifier", "attomId") || "—"}`);
    log(`  APN:              ${safe(p, "identifier", "apn") || "—"}`);
    log(`  Type:             ${safe(summary, "propclass") || safe(summary, "proptype") || "—"} (${safe(summary, "propsubtype") || "—"})`);
    log(`  Units:            ${safe(building, "summary", "unitsCount") || safe(building, "summary", "unitCount") || "—"}`);
    log(`  Year built:       ${safe(summary, "yearbuilt") || safe(building, "summary", "yearbuilteffective") || "—"}`);
    log(`  Lot size:         ${safe(lot, "lotsize2") || safe(lot, "lotsize1") || "—"} sqft`);
    log(`  Living area:      ${safe(building, "size", "universalsize") || safe(building, "size", "livingsize") || "—"} sqft`);
    log("");
    log(`  Last sale:        ${fmtDate(safe(sale, "saleTransDate"))} — ${fmtCurrency(safe(sale, "amount", "saleamt"))}`);
    log(`  Sale doc type:    ${safe(sale, "amount", "saledocType") || "—"}`);
    log(`  Assessor land:    ${fmtCurrency(safe(assessment, "assessed", "assdLandValue"))}`);
    log(`  Assessor imp:     ${fmtCurrency(safe(assessment, "assessed", "assdImprValue"))}`);
    log(`  Market value:     ${fmtCurrency(safe(assessment, "market", "mktTtlValue"))}`);
    log(`  Tax annual:       ${fmtCurrency(safe(assessment, "tax", "taxAmt"))}`);
    log("");
    log(`  Owner:            ${safe(owner, "owner1", "fullname") || "—"}`);
    log(`  Owner mailing:    ${safe(owner, "mailingAddressOneLine") || "—"}`);
    log(`  Absentee:         ${safe(summary, "absenteeownerstatus") || "—"}`);
    log("");
  }

  // -------- Step 3: deep dive on one property --------
  if (properties.length > 0) {
    const target = properties[0];
    const attomId = safe(target, "identifier", "attomId");
    if (attomId) {
      log("================================================================================");
      log(`DEEP DIVE — ATTOM ID ${attomId}`);
      log("================================================================================");
      log("");

      log("[Step 3a] Expanded profile (owner, mortgage, sales history)...");
      const expanded = await attomGet("/property/expandedprofile", { attomid: String(attomId) });
      if (expanded.ok && safe(expanded.data, "property", 0)) {
        const pp = expanded.data.property[0];
        const lender = safe(pp, "sale", "lender");
        const mortgage = safe(pp, "lendinghistory") || safe(pp, "mortgageorigination");
        log("");
        log(`  Address:        ${safe(pp, "address", "oneLine")}`);
        log(`  Owner:          ${safe(pp, "owner", "owner1", "fullname") || "—"}`);
        log(`  Last lender:    ${lender || "—"}`);
        if (Array.isArray(mortgage)) {
          log(`  Mortgage history (${mortgage.length} records):`);
          mortgage.slice(0, 5).forEach((m, idx) => {
            log(`    ${idx + 1}. ${fmtDate(m.recordingDate || m.transferDate)} — ${m.lenderName || "?"} — ${fmtCurrency(m.transferAmount || m.amount)}`);
          });
        }
        log("");
      } else {
        log(`  Expanded profile failed: HTTP ${expanded.status}`);
      }

      log("[Step 3b] AVM (automated valuation)...");
      const avm = await attomGet("/avm/snapshot", { attomid: String(attomId) });
      if (avm.ok && safe(avm.data, "property", 0)) {
        const a = safe(avm.data, "property", 0, "avm");
        log("");
        log(`  AVM value:      ${fmtCurrency(safe(a, "amount", "value"))}`);
        log(`  AVM low:        ${fmtCurrency(safe(a, "amount", "valueLow"))}`);
        log(`  AVM high:       ${fmtCurrency(safe(a, "amount", "valueHigh"))}`);
        log(`  Confidence:     ${safe(a, "amount", "confidence") || "—"}`);
        log("");
      } else {
        log(`  AVM failed: HTTP ${avm.status}`);
      }

      log("[Step 3c] Sales history...");
      const sales = await attomGet("/saleshistory/detail", { attomid: String(attomId) });
      if (sales.ok && safe(sales.data, "property", 0)) {
        const salesArr = safe(sales.data, "property", 0, "salehistory") || [];
        log("");
        log(`  Sales history (${salesArr.length} transactions):`);
        salesArr.slice(0, 10).forEach((s, idx) => {
          log(`    ${idx + 1}. ${fmtDate(s.saleTransDate)} — ${fmtCurrency(safe(s, "amount", "saleamt"))} — ${safe(s, "amount", "saledocType") || "?"}`);
        });
        log("");
      } else {
        log(`  Sales history failed: HTTP ${sales.status}`);
      }
    }
  }

  // -------- Step 4: what Scott would see --------
  log("================================================================================");
  log("WHAT THE DATA WORKER WOULD SURFACE TO SCOTT");
  log("================================================================================");
  log("");
  log("On opening the Real Estate Analyst with 'Oakland multifamily' as the workspace");
  log("context, the Data Worker would push the following enrichments into the canvas:");
  log("");
  log("  • Snapshot of " + properties.length + " comparable MF properties in 94601");
  log("  • For each: APN, unit count, year built, last sale, current owner, assessed");
  log("    value, market value, annual tax burden, absentee-owner flag");
  log("  • Highlighted in the canvas: any absentee owners (target acquisition candidates)");
  log("    + any properties with last sale > 10 years ago (off-market potential) +");
  log("    any sub-$X tax/unit ratios (deferred maintenance signal)");
  log("  • On click into one property: full mortgage history (lender, amount, dates),");
  log("    AVM value with confidence band, sales history, and a 'who else holds notes");
  log("    with this lender' lateral search");
  log("");
  log("This is what 'proactive intelligence' looks like in practice.");
  log("Same substrate serves Kim Bennett for title/brokerage — different surface, same data.");
  log("");
  log("================================================================================");
  log("END OF DOGFOOD TEST");
  log("================================================================================");

  writeOutput(output);
}

function writeOutput(lines) {
  const outPath = path.join(process.env.HOME, "Downloads", "scott-oakland-mf-attom-test.txt");
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log("");
  console.log(`✓ Output written to ${outPath}`);
}

main().catch(e => {
  console.error("FATAL:", e.stack);
  process.exit(1);
});
