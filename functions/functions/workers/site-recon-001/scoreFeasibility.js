"use strict";

/**
 * SITE-RECON-001 — scoreFeasibility (Build Step 2: verdict engine)
 *
 * Scores a raw ATTOM bundle ({ propertyDetail, salesHistory, avm } from
 * searchByAddress Step 1) into a Green/Yellow/Red feasibility verdict per
 * spec v1.1 RULE-04..07, RULE-13.
 *
 * Design invariant: every check returns 'pass' | 'fail' | 'unknown'.
 * Unknown is NEVER coerced to pass silently — it becomes a flag plus a
 * confidence deduction. This is what makes the verdict defensible under
 * the Deposition Rule: the receipt shows exactly what was and wasn't
 * evaluated at scoring time.
 *
 * v1 data-availability limits (flagged, not faked):
 *   - Title chain (RULE-04 input): no title-chain endpoint pulled yet →
 *     always flag `title_chain_not_evaluated`. Does not block GREEN in v1.
 *   - Coastal/historic overlays: GIS layers (spec §6) not integrated yet.
 *     Callers may pass known overlay state via options.overlays; otherwise
 *     unknown → flag `overlays_not_evaluated`. Does not block GREEN in v1.
 *   - APN retirement: not directly exposed by /property/detail. APN present
 *     = treated active; absent = flag `apn_not_verified`. True retirement
 *     detection lands with the assessor endpoint integration.
 *
 * RULE-09: output carries feasibility signals + named blockers only —
 * never investment recommendations.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ASSESSOR_MAX_AGE_DAYS = 180; // RULE-05
const AVM_MAX_AGE_DAYS = 30;       // RULE-13
const SALE_RECENCY_MONTHS = 36;

// ── Extractors (defensive — ATTOM shapes vary by package/tier) ───

function firstProperty(resp) {
  return resp?.data?.property?.[0] || null;
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(date, now) {
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

function extractApn(prop) {
  return prop?.identifier?.apn || prop?.identifier?.apnOrig || null;
}

function extractAssessorDate(prop) {
  // vintage.lastModified is ATTOM's record-freshness stamp; pubDate fallback.
  return parseDate(prop?.vintage?.lastModified) || parseDate(prop?.vintage?.pubDate);
}

function extractAvm(avmResp) {
  const p = firstProperty(avmResp);
  const avm = p?.avm || null;
  return {
    value: avm?.amount?.value ?? null,
    eventDate: parseDate(avm?.eventDate),
  };
}

function extractOwnerNames(prop) {
  // Owner shapes differ by ATTOM package: owner.owner1.lastName/firstName,
  // or assessment.owner. Collect whatever is present, normalized.
  const names = [];
  const owner = prop?.owner || prop?.assessment?.owner || null;
  if (owner) {
    for (const key of ["owner1", "owner2", "owner3", "owner4"]) {
      const o = owner[key];
      if (!o) continue;
      const name = [o.firstNameAndMi, o.lastName].filter(Boolean).join(" ").trim() || o.fullName || null;
      if (name) names.push(name.toUpperCase());
    }
    if (owner.mailingAddressOneLine) names.mailing = owner.mailingAddressOneLine;
  }
  return names;
}

function extractSaleHistory(salesResp) {
  const p = firstProperty(salesResp);
  // ATTOM saleshistory/detail: property[0].salehistory[] with saleTransDate
  // (some packages: sale.saleTransDate). Normalize to dates, newest first.
  const raw = p?.salehistory || p?.saleHistory || [];
  const dates = raw
    .map((tx) => parseDate(tx?.saleTransDate || tx?.sale?.saleTransDate || tx?.recordingDate))
    .filter(Boolean)
    .sort((a, b) => b - a);
  return { transactions: raw, dates, latestBuyer: extractLatestBuyer(raw) };
}

function extractLatestBuyer(transactions) {
  for (const tx of transactions) {
    const buyer = tx?.buyerName || tx?.sale?.buyerName || null;
    if (buyer) return String(buyer).toUpperCase();
  }
  return null;
}

// ── Scoring ──────────────────────────────────────────────────────

/**
 * @param {object} attom    { propertyDetail, salesHistory, avm } — each the
 *                          { ok, data } envelope returned by searchByAddress.
 * @param {object} [options]
 * @param {object} [options.overlays]  Known overlay state when available:
 *                          { coastalCommission: bool|null, historicDistrict: bool|null }
 * @param {string} [options.apnStatus] Explicit 'active'|'retired' when known
 *                          (assessor integration / test fixtures).
 * @param {Date}   [options.now]       Clock injection for deterministic tests.
 * @returns {{ verdict, namedBlocker, blockerCode, confidenceScore, flags, checks }}
 */
function scoreFeasibility(attom, options = {}) {
  const now = options.now || new Date();
  const overlays = options.overlays || { coastalCommission: null, historicDistrict: null };
  const flags = [];
  const checks = {};
  let confidence = 100;

  const prop = firstProperty(attom?.propertyDetail);

  // ── Missing-data deductions (−20 each per Alex's confidence spec) ──
  if (!prop) {
    flags.push("missing_assessor_detail");
    confidence -= 20;
  }

  const avm = extractAvm(attom?.avm);
  if (avm.value == null) {
    flags.push("missing_avm");
    confidence -= 20;
  }

  const sales = extractSaleHistory(attom?.salesHistory);
  const recentSaleCutoff = new Date(now.getTime() - SALE_RECENCY_MONTHS * 30.44 * DAY_MS);
  const hasRecentSale = sales.dates.some((d) => d >= recentSaleCutoff);
  if (sales.dates.length === 0) {
    flags.push("no_sales_history");
    confidence -= 20;
  }

  // ── Check: APN status (RULE-07) ──
  if (options.apnStatus === "retired") {
    checks.apn = "fail";
  } else if (options.apnStatus === "active" || extractApn(prop)) {
    checks.apn = "pass";
  } else {
    checks.apn = "unknown";
    flags.push("apn_not_verified");
  }

  // ── Check: assessor freshness (RULE-05) ──
  const assessorDate = extractAssessorDate(prop);
  if (!assessorDate) {
    checks.assessorFreshness = "unknown";
    flags.push("assessor_age_unknown");
  } else if (daysSince(assessorDate, now) > ASSESSOR_MAX_AGE_DAYS) {
    checks.assessorFreshness = "fail";
    flags.push("assessor_data_age_180plus");
    confidence -= 10;
  } else {
    checks.assessorFreshness = "pass";
  }

  // ── Check: AVM freshness (RULE-13) ──
  if (avm.value == null || !avm.eventDate) {
    checks.avmFreshness = "unknown";
    if (avm.value != null) flags.push("avm_age_unknown");
  } else if (daysSince(avm.eventDate, now) > AVM_MAX_AGE_DAYS) {
    checks.avmFreshness = "fail";
    flags.push("avm_age_30plus");
    confidence -= 10;
  } else {
    checks.avmFreshness = "pass";
  }

  // ── Check: owner-of-record consistency (RULE-06) ──
  const ownerNames = extractOwnerNames(prop);
  if (ownerNames.length === 0 || !sales.latestBuyer) {
    checks.ownerConsistency = "unknown";
    flags.push("owner_record_incomplete");
  } else {
    // Loose match: any assessor owner name shares a surname token with the
    // latest recorded buyer. Exact-match would false-positive on trusts,
    // middle initials, "ET AL", etc.
    const buyerTokens = new Set(sales.latestBuyer.split(/[^A-Z]+/).filter((t) => t.length > 2));
    const consistent = ownerNames.some((n) =>
      n.split(/[^A-Z]+/).some((t) => t.length > 2 && buyerTokens.has(t))
    );
    if (consistent) {
      checks.ownerConsistency = "pass";
    } else {
      checks.ownerConsistency = "fail";
      flags.push("owner_mismatch");
    }
  }

  // ── Check: transaction recency ──
  if (sales.dates.length === 0) {
    checks.transactionRecency = "unknown";
  } else if (hasRecentSale) {
    checks.transactionRecency = "pass";
  } else {
    checks.transactionRecency = "fail";
    flags.push("no_sale_last_36mo");
  }

  // ── Check: overlays (RED conditions — GIS integration pending) ──
  checks.coastalCommission =
    overlays.coastalCommission === true ? "fail" :
    overlays.coastalCommission === false ? "pass" : "unknown";
  checks.historicDistrict =
    overlays.historicDistrict === true ? "fail" :
    overlays.historicDistrict === false ? "pass" : "unknown";
  if (checks.coastalCommission === "unknown" || checks.historicDistrict === "unknown") {
    flags.push("overlays_not_evaluated");
    confidence -= 10;
  }

  // ── Title chain (RULE-04 input — not pulled in v1) ──
  checks.titleChain = "unknown";
  flags.push("title_chain_not_evaluated");
  confidence -= 10;

  confidence = Math.max(0, confidence);

  // ── Verdict resolution: RED > YELLOW > GREEN, first-hit blocker ──
  let verdict = "GREEN";
  let namedBlocker = null;
  let blockerCode = null;

  if (checks.apn === "fail") {
    verdict = "RED";
    namedBlocker = "APN retired — parcel ID no longer active";
    blockerCode = "APN_RETIRED";
  } else if (checks.coastalCommission === "fail") {
    verdict = "RED";
    namedBlocker = "Coastal commission jurisdiction — escalate to specialist";
    blockerCode = "COASTAL_COMMISSION_JURISDICTION";
  } else if (checks.historicDistrict === "fail") {
    verdict = "RED";
    namedBlocker = "Historic district — escalate to zoning worker";
    blockerCode = "HISTORIC_DISTRICT";
  } else if (checks.assessorFreshness === "fail") {
    verdict = "YELLOW";
    namedBlocker = "Stale assessor data";
    blockerCode = "STALE_ASSESSOR_DATA";
  } else if (checks.avmFreshness === "fail") {
    verdict = "YELLOW";
    namedBlocker = "Stale AVM valuation";
    blockerCode = "STALE_AVM";
  } else if (checks.ownerConsistency === "fail") {
    verdict = "YELLOW";
    namedBlocker = "Owner-of-record mismatch — verify before proceeding";
    blockerCode = "OWNER_MISMATCH";
  } else if (checks.transactionRecency === "fail" || checks.transactionRecency === "unknown") {
    verdict = "YELLOW";
    namedBlocker = "Limited transaction history";
    blockerCode = "LIMITED_TRANSACTION_HISTORY";
  } else if (checks.assessorFreshness === "unknown" || checks.avmFreshness === "unknown" || checks.ownerConsistency === "unknown") {
    // Core data checks that couldn't be evaluated cap the verdict at YELLOW —
    // GREEN must be earned by evaluated passes, not by missing data.
    verdict = "YELLOW";
    namedBlocker = "Incomplete data — core checks could not be evaluated";
    blockerCode = "INCOMPLETE_DATA";
  }

  return { verdict, namedBlocker, blockerCode, confidenceScore: confidence, flags, checks };
}

module.exports = { scoreFeasibility };
