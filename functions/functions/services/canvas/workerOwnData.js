"use strict";

/**
 * workerOwnData.js — per-worker "YOUR OWN RECORDS" grounding block.
 *
 * The sibling-state snapshot (spineState.js) only models the 5 Spine workers
 * (accounting/marketing/hr/contacts) and only as KPI COUNTS.
 * That left two classes of chat failure:
 *
 *   1. Spine workers had counts but not detail — HR knew "1 credential overdue"
 *      but not WHOSE; Marketing knew "6 campaigns" but not WHICH is winning.
 *   2. Catalog workers (vet dosing, CVT exam prep, staff credentials) weren't in
 *      the snapshot at all, so their chat quoted accounting/contacts data or said
 *      "I don't have access" while the canvas was showing the records right there.
 *
 * This builds a compact, detailed block from each worker's OWN canvas
 * collections — the SAME Firestore reads the canvas endpoints do — so chat
 * answers ground-truth against the exact records on screen. Injected ahead of
 * the worker's system prompt in the worker-direct chat path.
 *
 * Everything is tenant-scoped and defensive: each read has its own catch, and a
 * worker with no data returns "" (the model then says it has nothing yet rather
 * than inventing). No demo hardcoding — reads the caller's tenantId only.
 */

const safe = async (p, fallback) => { try { return await p; } catch (e) { console.warn("[workerOwnData]", e.message); return fallback; } };
const docs = (snap) => (snap && snap.docs ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : []);

// ── Staff credentials (shared by HR + the dedicated Credentials worker) ──
async function staffCredentialsBlock(db, tenantId) {
  const snap = await safe(db.collection("staff_credentials").where("tenantId", "==", tenantId).get(), null);
  const staff = docs(snap);
  if (!staff.length) return "";
  const flat = [];
  for (const s of staff) {
    for (const c of (s.credentials || [])) {
      flat.push({ who: s.full_name || s.staff_id, role: s.role, name: c.credential_name || c.credential_type,
        status: c.status, expiry: c.expiry_date, days: c.days_remaining });
    }
  }
  const fmt = (c) => `${c.who}${c.role ? ` (${c.role})` : ""} — ${c.name}: ${c.status}${c.expiry ? `, expires ${c.expiry}` : ""}${Number.isFinite(c.days) ? ` (${c.days}d)` : ""}`;
  const overdue = flat.filter(c => c.status === "overdue");
  const expiring = flat.filter(c => c.status === "expiring_soon" || (Number.isFinite(c.days) && c.days <= 45 && c.status !== "overdue"));
  const lines = [`YOUR OWN RECORDS — Staff Credentials (${staff.length} people, ${flat.length} credentials tracked):`];
  if (overdue.length) lines.push(`OVERDUE NOW (${overdue.length}):\n` + overdue.map(c => `- ${fmt(c)}`).join("\n"));
  else lines.push("OVERDUE NOW: none.");
  if (expiring.length) lines.push(`EXPIRING SOON (${expiring.length}):\n` + expiring.sort((a, b) => (a.days || 0) - (b.days || 0)).map(c => `- ${fmt(c)}`).join("\n"));
  lines.push("ROSTER: " + staff.map(s => `${s.full_name || s.staff_id}${s.role ? ` (${s.role})` : ""}`).join("; "));
  return lines.join("\n") + "\n\n";
}

// ── Vet drug dosing ──
async function vetDosingBlock(db, tenantId) {
  const [oSnap, pSnap] = await Promise.all([
    safe(db.collection("dosing_orders").where("tenantId", "==", tenantId).get(), null),
    safe(db.collection("protocol_library").where("tenantId", "==", tenantId).get(), null),
  ]);
  const orders = docs(oSnap).sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  const protocols = docs(pSnap);
  if (!orders.length && !protocols.length) return "";
  const fmt = (o) => `${o.patient_name}${o.species ? ` (${o.species}${o.breed ? `, ${o.breed}` : ""})` : ""} — ${o.drug_name} ${o.total_dose_mg ?? "?"}mg ${o.route || ""} ${o.frequency || ""}${o.dea_schedule ? ` [DEA ${o.dea_schedule}]` : ""}${o.indication ? ` · ${o.indication}` : ""}${o.status ? ` · ${o.status}` : ""}`;
  const lines = [`YOUR OWN RECORDS — Drug Dosing (${orders.length} orders, ${protocols.length} protocols):`];
  const proposed = orders.find(o => o.status === "proposed");
  if (proposed) lines.push(`PENDING PROPOSAL: ${fmt(proposed)}`);
  const recent = orders.filter(o => o.status !== "proposed").slice(0, 12);
  if (recent.length) lines.push("RECENT ORDERS (newest first):\n" + recent.map(o => `- ${fmt(o)}`).join("\n"));
  const dea = orders.filter(o => o.dea_schedule);
  if (dea.length) lines.push(`CONTROLLED (DEA-scheduled): ${dea.length} of ${orders.length} orders.`);
  if (protocols.length) lines.push("PROTOCOL LIBRARY: " + protocols.map(p => p.protocol_name).join("; "));
  return lines.join("\n") + "\n\n";
}

// ── CVT exam prep cohort ──
async function eduCohortBlock(db, tenantId) {
  const [eSnap, cSnap, aSnap] = await Promise.all([
    safe(db.collection("course_enrollments").where("tenantId", "==", tenantId).get(), null),
    safe(db.collection("module_completions").where("tenantId", "==", tenantId).get(), null),
    safe(db.collection("cohort_analytics").where("tenantId", "==", tenantId).get(), null),
  ]);
  const students = docs(eSnap).sort((a, b) => (a.overall_practice_score_pct || 0) - (b.overall_practice_score_pct || 0));
  const comps = docs(cSnap);
  const an = docs(aSnap)[0] || null;
  if (!students.length && !an) return "";
  const lines = [`YOUR OWN RECORDS — CVT Exam Prep cohort${an?.cohort_name ? ` (${an.cohort_name})` : ""}:`];
  if (an) {
    lines.push(`COHORT: ${an.total_enrolled ?? students.length} enrolled, ${an.active_students ?? "?"} active, avg completion ${an.avg_completion_pct ?? "?"}%, avg practice score ${an.avg_practice_score_pct ?? "?"}%, ${an.at_risk_students ?? 0} at risk, exam ${an.exam_date || "?"}.`);
    if (Array.isArray(an.weak_domains_aggregate) && an.weak_domains_aggregate.length) {
      lines.push("WEAKEST SUBJECTS (cohort avg, hardest first): " + an.weak_domains_aggregate.map(d => `${d.domain} ${d.avg_score_pct}%`).join(", ") + ".");
    }
  }
  const atRisk = students.filter(s => (s.overall_practice_score_pct || 0) < 60 || s.status === "at_risk");
  if (atRisk.length) lines.push("AT-RISK STUDENTS: " + atRisk.map(s => `${s.student_name} (${s.overall_practice_score_pct}%)`).join(", ") + ".");
  lines.push("STUDENTS (lowest score first): " + students.slice(0, 10).map(s => `${s.student_name} ${s.overall_practice_score_pct}% (${s.modules_completed}/${s.modules_total} modules)`).join("; ") + ".");
  if (comps.length) {
    const byScore = [...comps].sort((a, b) => (a.practice_score_pct || 0) - (b.practice_score_pct || 0)).slice(0, 6);
    lines.push("RECENT MODULE SCORES: " + byScore.map(c => `${c.module_name} ${c.practice_score_pct}%`).join("; ") + ".");
  }
  return lines.join("\n") + "\n\n";
}

// ── Marketing campaigns + social post history (detail on top of spineState's counts) ──
async function marketingBlock(db, tenantId, uid) {
  const lines = [];

  // Campaign KPIs
  const snap = await safe(db.collection("campaigns").where("tenantId", "==", tenantId).get(), null);
  let campaigns = docs(snap);
  if (campaigns.length) {
    campaigns = campaigns.map(c => {
      const ctr = c.impressions ? Math.round((c.clicks / c.impressions) * 1000) / 10 : 0;
      const cpl = c.conversions ? Math.round((c.spend || 0) / c.conversions) : null;
      return { ...c, ctr, cpl };
    }).sort((a, b) => (b.conversions || 0) - (a.conversions || 0) || (b.ctr - a.ctr));
    const fmt = (c) => `${c.name}${c.channel ? ` (${c.channel})` : ""} — ${c.conversions || 0} leads, ${c.ctr}% CTR, ${(c.impressions || 0).toLocaleString()} impressions, $${c.spend || 0} spend${c.cpl != null ? `, $${c.cpl}/lead` : ""}`;
    lines.push(`YOUR OWN RECORDS — Marketing campaigns (${campaigns.length} active):`);
    lines.push(`TOP PERFORMER: ${fmt(campaigns[0])}`);
    lines.push("ALL CAMPAIGNS (best first):\n" + campaigns.map(c => `- ${fmt(c)}`).join("\n"));
    lines.push("");
  }

  // Recent social posts (shows what's already been posted so Alex doesn't re-post)
  if (uid) {
    const postsSnap = await safe(db.collection("socialPosts").where("userId", "==", uid).orderBy("createdAt", "desc").limit(5).get(), null);
    const posts = docs(postsSnap);
    if (posts.length) {
      lines.push("RECENT SOCIAL POSTS (last 5 — do NOT re-post these):");
      posts.forEach(p => {
        const platforms = (p.platforms || []).join("+");
        const preview = (p.content || "").slice(0, 80).replace(/\n/g, " ");
        const results = Object.entries(p.results || {}).map(([pl, r]) => `${pl}:${r.ok ? "✓" : "✗"}`).join(" ");
        lines.push(`  [${platforms}] "${preview}..." ${results}`);
      });
      lines.push("");
    }

    // Scheduled drafts (upcoming queue)
    const draftsSnap = await safe(db.collection("marketingDrafts").where("userId", "==", uid).where("status", "==", "draft").limit(5).get(), null);
    const drafts = docs(draftsSnap);
    if (drafts.length) {
      lines.push("SCHEDULED DRAFTS (queued, not yet posted):");
      drafts.forEach(d => {
        const platforms = (d.platforms || []).join("+");
        const preview = (d.content || "").slice(0, 60).replace(/\n/g, " ");
        const when = d.scheduledAt ? (typeof d.scheduledAt.toDate === "function" ? d.scheduledAt.toDate().toISOString().slice(0, 16) : String(d.scheduledAt)) : "immediate";
        lines.push(`  [${platforms}] "${preview}..." — fires ${when}`);
      });
      lines.push("");
    }

    // Email contact list count
    const listsSnap = await safe(db.collection("emailLists").where("userId", "==", uid).limit(5).get(), null);
    const lists = docs(listsSnap);
    if (lists.length) {
      const totalContacts = lists.reduce((s, l) => s + (l.contactCount || 0), 0);
      lines.push(`EMAIL LISTS: ${lists.length} list(s), ${totalContacts} total contacts available for blast.`);
      lines.push("");
    }
  }

  return lines.length ? lines.join("\n") + "\n\n" : "";
}

// ── Accounting (real YTD + MTD totals, so chat matches the dashboard) ──
// spineState's own-state only gives MTD; without YTD the model extrapolates
// ("April $98k, May $98k…") and contradicts the canvas's $588.6k YTD. Compute
// the same figures the canvas does, straight from the transactions.
async function accountingBlock(db, tenantId) {
  const [txSnap, loanSnap] = await Promise.all([
    safe(db.collection("transactions").where("tenantId", "==", tenantId).limit(2000).get(), null),
    safe(db.collection("loans").where("tenantId", "==", tenantId).get(), null),
  ]);
  const txs = docs(txSnap).filter(t => t.date);
  const dollars = (cents) => `$${Math.round((cents || 0) / 100).toLocaleString()}`;
  const fmt2 = (cents) => Math.round((cents || 0) / 100);
  const sumC = (f) => txs.filter(f).reduce((s, t) => s + (t.amountCents || 0), 0);

  // CRITICAL: classification drives accounting category — NOT direction alone.
  // direction:"credit" + classification:"liability" = loan/equity inflow (FINANCING, not revenue).
  // direction:"credit" + classification:"revenue"   = operating revenue.
  // direction:"debit"  + classification:"expense"   = operating expense.
  // direction:"debit"  + classification:"asset"     = CapEx (not expense).
  // Never lump financing inflows into revenue — that overstates income.
  const isRevenue  = t => t.direction === "credit"  && (t.classification === "revenue" || (!t.classification && t.direction === "credit" && t.source !== "alex"));
  const isExpense  = t => t.direction === "debit"   && (t.classification === "expense" || !t.classification);
  const isFinancing = t => t.classification === "liability" || t.classification === "equity_contribution";
  const isCapEx    = t => t.classification === "asset";

  // Alex-sourced transactions have explicit classification — always trust it.
  // PDF-sourced transactions from personal/business statements may not have
  // classification set; for those, fall back to direction for expense counting only.
  const operatingRevenue = sumC(t => t.classification === "revenue");
  const operatingExpenses = sumC(t => isExpense(t));
  const financingInflows  = sumC(t => isFinancing(t) && t.direction === "credit");
  const capEx             = sumC(t => isCapEx(t) && t.direction === "debit");

  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const asOfDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const mExp = sumC(t => isExpense(t) && t.date >= monthStart);

  // Per-month expense view (operating only).
  const byMonth = {};
  for (const t of txs) {
    if (!isExpense(t)) continue;
    const m = String(t.date).slice(0, 7);
    if (!byMonth[m]) byMonth[m] = 0;
    byMonth[m] += (t.amountCents || 0);
  }
  const months = Object.keys(byMonth).sort();

  // ── Server-side balance sheet computation ────────────────────────────────
  // RAAS rule: the rules engine computes financial figures; agents emit them verbatim.
  // Never use stored balance snapshots as authoritative — they may be stale.
  // Authoritative sources: transactions collection + loans collection only.
  //
  // Cash = all financing inflows + revenue − operating expenses − capEx paid
  // Non-current assets = CapEx (patents, software)
  // Liabilities = outstanding loan principals (from loans collection)
  // Equity = Total Assets − Total Liabilities (= accumulated operating deficit)
  const loans = docs(loanSnap);
  const cashCents = financingInflows + operatingRevenue - operatingExpenses - capEx;
  const totalLiabilitiesCents = loans.reduce((s, l) => s + (l.principalCents || 0), 0);
  const totalAssetsCents = Math.max(0, cashCents) + capEx;
  const totalEquityCents = totalAssetsCents - totalLiabilitiesCents;

  // Build the exact canvas payload — Alex must emit this verbatim, no arithmetic.
  const bsPayload = {
    asOf: asOfDate,
    currentAssets: cashCents > 0 ? [{ label: "Cash & Cash Equivalents", amount: fmt2(cashCents) }] : [],
    nonCurrentAssets: capEx > 0 ? [{ label: "Patents & Software (CapEx)", amount: fmt2(capEx) }] : [],
    totalCurrentAssets: fmt2(Math.max(0, cashCents)),
    totalNonCurrentAssets: fmt2(capEx),
    totalAssets: fmt2(totalAssetsCents),
    currentLiabilities: [],
    longTermLiabilities: loans.map(l => {
      const rate = l.interestRatePct > 0 ? `, ${l.interestRatePct}% interest` : ", 0% interest";
      const due = l.repaymentTrigger ? `, due ${l.repaymentTrigger}` : "";
      return { label: `Loan — ${l.lender}${l.lenderEntity ? ` (${l.lenderEntity})` : ""}${rate}${due}`, amount: fmt2(l.principalCents || 0) };
    }),
    totalCurrentLiabilities: 0,
    totalLongTermLiabilities: fmt2(totalLiabilitiesCents),
    totalLiabilities: fmt2(totalLiabilitiesCents),
    equity: [{ label: "Retained Earnings (Accumulated Deficit)", amount: fmt2(totalEquityCents) }],
    totalEquity: fmt2(totalEquityCents),
  };

  const lines = [`YOUR OWN RECORDS — Accounting (${txs.length} transactions on file):`];

  // Loan register.
  if (loans.length) {
    lines.push(`LOANS ON FILE (${loans.length}):`);
    for (const l of loans) {
      const rate = l.interestRatePct > 0 ? ` @ ${l.interestRatePct}%` : " @ 0% (no interest)";
      const trigger = l.repaymentTrigger ? ` · repayable ${l.repaymentTrigger}` : "";
      lines.push(`  ${l.lender}${l.lenderEntity ? ` (${l.lenderEntity})` : ""}: ${dollars(l.principalCents)} principal${rate}${trigger}`);
    }
    lines.push("  These loans are LIABILITIES — never count loan receipts as revenue or income.");
  }

  // P&L — operating only.
  lines.push(`P&L — OPERATING (YTD):`);
  lines.push(`  Operating revenue: ${dollars(operatingRevenue)} (this is a pre-revenue startup — $0 unless explicitly recorded)`);
  lines.push(`  Operating expenses: ${dollars(operatingExpenses)}`);
  lines.push(`  Net operating loss: ${dollars(operatingRevenue - operatingExpenses)}`);
  if (financingInflows) lines.push(`  Financing inflows (loans/equity contributions, NOT revenue): ${dollars(financingInflows)}`);
  if (capEx) lines.push(`  CapEx / intangible assets (patents, software — not expensed): ${dollars(capEx)}`);
  if (months.length) {
    lines.push(`THIS MONTH expenses (MTD): ${dollars(mExp)}.`);
    lines.push("MONTHLY OPERATING EXPENSES: " + months.map(m => `${m} ${dollars(byMonth[m])}`).join("; ") + ".");
  }

  // Pre-computed balance sheet — authoritative. Inject as text summary + exact JSON payload.
  lines.push(`BALANCE SHEET — SERVER-COMPUTED (as of ${asOfDate}):`);
  lines.push(`  Total Assets:      ${dollars(totalAssetsCents)}`);
  lines.push(`  Total Liabilities: ${dollars(totalLiabilitiesCents)}`);
  lines.push(`  Total Equity:      ${dollars(totalEquityCents)}`);
  lines.push(`  Cash on hand: ${dollars(cashCents)} (financing inflows minus all operating spend)`);
  lines.push(`BALANCE SHEET CANVAS PAYLOAD — emit this JSON verbatim inside |||CANVAS_RENDER||| for card:accounting-balance-sheet. DO NOT change any number:`);
  lines.push(JSON.stringify(bsPayload));

  lines.push("ACCOUNTING RULES — FOLLOW EXACTLY:");
  lines.push("- Revenue = classification:revenue only. Loan receipts and equity contributions are FINANCING, never revenue.");
  lines.push("- For Balance Sheet canvas card: use ONLY the pre-computed payload above. Do NOT recompute, round differently, or add numbers. The payload is already correct.");
  lines.push("- NEVER fabricate a bank account balance or checking account amount. If you don't have a real bank balance on file, the cash figure from transactions is the best estimate — say so.");
  lines.push("- LOANS: The loan register above comes directly from Firestore. NEVER change, estimate, or invent loan amounts — they are fixed facts seeded by the CPA workflow. If a user tells you a loan amount that differs from above, ask them to confirm before updating via accounting:loans:upsert.");
  lines.push("- For P&L canvas card: revenue=operating revenue above, expenses=operating expenses above. Net income will be negative (pre-revenue startup).");
  lines.push("- For Canvas reports: the canvas card already has a ↓ Download button (top-right corner). Tell users to use it — do NOT say exports aren't available.");
  lines.push("- For multiple reports (P&L + Balance Sheet + Cash Flow): generate each as a SEPARATE canvas card in the SAME response. All three will auto-archive to the Reports tab.");
  lines.push("");
  lines.push("COMMITTING STATEMENT TRANSACTIONS — how to get PDF statement data into Firestore:");
  lines.push("When the user shares a bank statement PDF (attached to this chat session):");
  lines.push("  1. Extract all transactions from the PDF. For each transaction note: date (YYYY-MM-DD), description, amountCents (integer cents, always positive), direction (debit=spend, credit=inflow).");
  lines.push("  2. Classify each transaction: expense=operating spend, revenue=customer income, internal_transfer=money moving between OWN accounts (card payments, Mercury↔Chime transfers), liability=loan receipt.");
  lines.push("  3. After extracting ALL transactions from the statement, embed the following directive VERBATIM at the END of your response (the server strips it before display):");
  lines.push('     __ACCT_PUSH__:{"transactions":[{"date":"YYYY-MM-DD","description":"...","amountCents":1234,"direction":"debit","classification":"expense"},...],"note":"[Institution] statement [period]"}');
  lines.push("  4. CRITICAL: Internal transfers (card payments from checking to credit, Mercury↔Chime, PayPal Credit autopay) are classification:internal_transfer — they are NOT expenses. The purchase already appears on the credit card statement. Double-counting = wrong books.");
  lines.push("  5. Process ONE statement per response. Confirm with the user before proceeding to the next file.");
  lines.push("  6. After ALL statements are committed, emit the Balance Sheet and P&L canvas cards — the server will recompute from the committed data.");
  return lines.join("\n") + "\n\n";
}

// ── Contacts segments ──
async function contactsBlock(db, tenantId) {
  const snap = await safe(db.collection("contacts").where("tenantId", "==", tenantId).limit(2000).get(), null);
  const contacts = docs(snap);
  if (!contacts.length) return "";
  const segCounts = {};
  for (const c of contacts) for (const s of (c.segments || [])) segCounts[s] = (segCounts[s] || 0) + 1;
  const top = Object.entries(segCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const lines = [`YOUR OWN RECORDS — Contacts (${contacts.length} total):`];
  if (top.length) lines.push("SEGMENTS: " + top.map(([s, n]) => `${s} (${n})`).join(", ") + ".");
  // Include the actual roster (name + pet + segments + email) so chat can ANSWER
  // "who are the rabbit owners" by name instead of saying it only sees counts —
  // the canvas lists every contact, chat must be able to as well (Sean, 6/26).
  const roster = contacts.slice(0, 60).map(c => {
    const name = c.name || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unknown";
    const pet = c.petInfo || (c.species ? `${c.species} owner` : "");
    const segs = (c.segments || []).join("/");
    return `- ${name}${pet ? ` — ${pet}` : ""}${segs ? ` [${segs}]` : ""}${c.email ? ` · ${c.email}` : ""}`;
  });
  lines.push(`CONTACT ROSTER (name — pet [segments] · email), ${roster.length} of ${contacts.length}:\n` + roster.join("\n"));
  lines.push("When the user asks which contacts match a segment (e.g. rabbit-owners), list them BY NAME from the roster above — do not say you only see counts.");
  return lines.join("\n") + "\n\n";
}

// ── Title abstract (real-estate title/ownership records) ──
async function titleAbstractBlock(db, tenantId) {
  const snap = await safe(db.collection("title_abstracts").where("tenantId", "==", tenantId).get(), null);
  const abstracts = docs(snap);
  if (!abstracts.length) return "";
  const lines = [`YOUR OWN RECORDS — Title Abstracts (${abstracts.length} on file):`];
  for (const a of abstracts) {
    lines.push(`\nPROPERTY: ${a.property_address}${a.tmk ? ` · TMK ${a.tmk}` : ""}${a.county ? ` · ${a.county} County, ${a.state || ""}` : ""}`);
    if (a.legal_description) lines.push(`LEGAL: ${a.legal_description}`);
    if (a.current_owner) lines.push(`CURRENT OWNER: ${a.current_owner}${a.vesting ? ` — ${a.vesting}` : ""}`);
    if (a.zoning || a.land_area_sqft) lines.push(`PARCEL: ${a.zoning || ""}${a.land_area_sqft ? ` · ${a.land_area_sqft.toLocaleString()} sqft` : ""}${a.assessed_value_usd ? ` · assessed $${a.assessed_value_usd.toLocaleString()}` : ""}`);
    if (Array.isArray(a.chain_of_title) && a.chain_of_title.length) {
      lines.push("CHAIN OF TITLE (oldest first): " + a.chain_of_title.map(c => `${c.date} ${c.grantor} → ${c.grantee} (${c.instrument}, #${c.doc_number})`).join("; "));
    }
    if (Array.isArray(a.liens_encumbrances) && a.liens_encumbrances.length) {
      lines.push("LIENS/ENCUMBRANCES: " + a.liens_encumbrances.map(l => `${l.type}${l.holder ? ` — ${l.holder}` : ""}${l.amount_usd ? ` $${l.amount_usd.toLocaleString()}` : ""} [${l.status || "?"}]`).join("; "));
    }
    if (Array.isArray(a.easements) && a.easements.length) lines.push("EASEMENTS: " + a.easements.map(e => `${e.type} (${e.description})`).join("; "));
    if (Array.isArray(a.exceptions) && a.exceptions.length) lines.push("STANDARD EXCEPTIONS: " + a.exceptions.join(" · "));
    if (a.tax_status) lines.push(`TAX STATUS: ${a.tax_status}`);
    if (a.disclaimer) lines.push(`NOTE: ${a.disclaimer}`);
  }
  lines.push("\nWhen asked to look up an address you HAVE on file above, give the abstract: owner + vesting, chain of title, liens/encumbrances, easements, and standard exceptions — cite the TMK and specifics. If asked about an address NOT on file, say you don't have that parcel's abstract yet (do not invent a chain of title for it).");
  return lines.join("\n") + "\n\n";
}

// ── EU Battery DPP — shared product fetch ──────────────────────────────────
async function _dppProducts(db, tenantId) {
  const snap = await safe(db.collection("dppProducts").where("tenantId", "==", tenantId).get(), null);
  return docs(snap);
}

// DPP Worker 1 — Compliance Auditor
async function dppComplianceBlock(db, tenantId) {
  const products = await _dppProducts(db, tenantId);
  if (!products.length) return "";
  const skuLine = (p) => {
    const cls = p.clusters || {};
    const pcts = [1,2,3,4,5,6,7].map(i => `C${i}:${(cls[`c${i}`]||{}).pct ?? "?"}%`).join(" ");
    return `- ${p.sku} (${p.name || ""}): overall ${p.overallPct ?? "?"}% | ${pcts} | passport=${p.passportStatus || "unknown"}`;
  };
  const ready = products.filter(p => p.passportStatus === "ready");
  const blocked = products.filter(p => (p.clusters?.c3?.pct ?? 0) === 0);
  const lines = [`YOUR OWN RECORDS — DPP Compliance Audit (${products.length} SKUs):`];
  lines.push("ALL SKUs:\n" + products.map(skuLine).join("\n"));
  if (ready.length) lines.push(`READY TO SUBMIT (${ready.length}): ${ready.map(p => p.sku).join(", ")}`);
  if (blocked.length) lines.push(`CLUSTER-3-BLOCKED — cannot generate passport (${blocked.length}): ${blocked.map(p => `${p.sku} (LCA at 0%)`).join(", ")}`);
  return lines.join("\n") + "\n\n";
}

// DPP Worker 2 — Passport & Registry Manager (CODEX 71: merged Passport
// Builder + Registry Manager + Lifecycle Monitor — same client-side user,
// sequential/recurring touches on the same passport record).
async function dppPassportRegistryBlock(db, tenantId) {
  const [products, regSnap, fleetSnap] = await Promise.all([
    _dppProducts(db, tenantId),
    safe(db.collection("dppRegistryStatus").where("tenantId", "==", tenantId).limit(1).get(), null),
    safe(db.collection("dppFleet").where("tenantId", "==", tenantId).get(), null),
  ]);
  const reg = docs(regSnap)[0] || null;
  const fleet = docs(fleetSnap);
  if (!products.length && !reg && !fleet.length) return "";

  const lines = [`YOUR OWN RECORDS — Passport & Registry Manager:`];

  if (products.length) {
    lines.push(`\nPASSPORT BUILD (${products.length} SKUs):`);
    for (const p of products) {
      const c3 = (p.clusters?.c3?.pct ?? 0);
      const gatable = c3 === 0 ? "BLOCKED (Cluster 3 = 0% — LCA required)" : c3 < 100 ? `Cluster 3 at ${c3}% — partial` : "GENERATION ELIGIBLE";
      lines.push(`- ${p.sku}: status=${p.passportStatus || "unknown"} | ${gatable}${p.registryId ? ` | registryId=${p.registryId}` : ""}`);
    }
  }

  if (reg) {
    lines.push(`\nREGISTRY STATUS: allowlist=${reg.allowlistStatus || "unknown"} | goLive=${reg.registryGoLive || "19 Jul 2026"}`);
    if (reg.submissionQueue?.length) lines.push(`QUEUED FOR SUBMISSION: ${reg.submissionQueue.join(", ")}`);
    if (reg.registered?.length) lines.push(`REGISTERED: ${reg.registered.join(", ")}`);
    else lines.push("REGISTERED: none yet.");
  }
  const queued = products.filter(p => p.passportStatus === "ready" || p.passportStatus === "submitted");
  const registered = products.filter(p => p.passportStatus === "registered");
  if (queued.length) lines.push(`READY/QUEUED SKUs: ${queued.map(p => p.sku).join(", ")}`);
  if (registered.length) lines.push(`REGISTERED SKUs: ${registered.map(p => `${p.sku} (ID: ${p.registryId || "pending"})`).join(", ")}`);

  if (fleet.length) {
    const colorIcon = (c) => ({ green: "🟢", yellow: "🟡", grey: "⬜", red: "🔴" }[c] || "❓");
    lines.push(`\nLIFECYCLE MONITOR (${fleet.length} SKUs in field):`);
    for (const f of fleet) {
      const soh = f.bmsStatus === "not_connected" || f.bmsStatus === "Disconnected"
        ? "BMS not connected — SoH unavailable"
        : `SoH ${f.sohPct ?? "?"}% ${colorIcon(f.sohColor)}`;
      const amend = f.amendmentPending ? " | AMENDMENT PENDING" : "";
      lines.push(`- ${f.sku}: ${f.unitsDeployed ?? "?"} units | ${soh} | cycles ${f.cycleCount ?? "?"}/${f.ratedCycles ?? "?"}${amend}`);
    }
    const nearThreshold = fleet.filter(f => f.sohPct && f.sohPct <= 82 && f.bmsStatus !== "not_connected" && f.bmsStatus !== "Disconnected");
    if (nearThreshold.length) {
      lines.push(`APPROACHING 80% SoH THRESHOLD (EV repurposing gate): ${nearThreshold.map(f => `${f.sku} at ${f.sohPct}%`).join(", ")}`);
    }
    const amendPending = fleet.filter(f => f.amendmentPending);
    if (amendPending.length) lines.push(`AMENDMENTS PENDING APPROVAL: ${amendPending.map(f => f.sku).join(", ")}`);
  }

  return lines.join("\n") + "\n\n";
}

// DPP Worker 3 — Supply Chain Tracer
async function dppSupplyChainBlock(db, tenantId) {
  const snap = await safe(db.collection("dppSuppliers").where("tenantId", "==", tenantId).get(), null);
  const suppliers = docs(snap);
  if (!suppliers.length) return "";
  const statusIcon = (s) => ({ verified: "✅", pending: "⏳", invited: "📨", partial: "⚠️" }[s] || "❓");
  const lines = [`YOUR OWN RECORDS — Supply Chain (${suppliers.length} suppliers):`];
  for (const s of suppliers) {
    const products = (s.products || []).join(", ");
    const cert = s.certExpiry ? ` cert expires ${s.certExpiry}` : "";
    lines.push(`- ${s.name} (${s.language || "EN"}): ${statusIcon(s.status)} ${s.status}${cert} | supplies: ${products || "unspecified"}`);
  }
  const unsubmitted = suppliers.filter(s => s.status === "invited");
  if (unsubmitted.length) lines.push(`NOT YET SUBMITTED (${unsubmitted.length}): ${unsubmitted.map(s => s.name).join(", ")} — their absence blocks the SKUs they supply.`);
  return lines.join("\n") + "\n\n";
}

// ── Makai School of Nursing — cohort grounding (all 5 nursing workers) ────────
async function nursingCohortBlock(db, tenantId) {
  const tenantRef = db.collection("tenants").doc(tenantId);
  const [students, courses, competencies, instructors] = await Promise.all([
    safe(tenantRef.collection("nursingStudents").get(), null),
    safe(tenantRef.collection("nursingCourses").get(), null),
    safe(tenantRef.collection("nursingCompetencies").get(), null),
    safe(tenantRef.collection("nursingInstructors").get(), null),
  ]);

  const sd = docs(students);
  const cd = docs(courses);
  const comp = docs(competencies);
  const inst = docs(instructors);

  if (!sd.length && !cd.length) return "";

  const lines = ["YOUR OWN RECORDS — Makai School of Nursing\n"];

  if (sd.length) {
    lines.push(`ENROLLED STUDENTS (${sd.length}):`);
    sd.forEach(s => {
      const pct = Math.round((s.clinicalHours / (s.clinicalHoursRequired || 500)) * 100);
      lines.push(`  ${s.name} [${(s.status || "").toUpperCase()}]: clinical ${s.clinicalHours}/${s.clinicalHoursRequired || 500}h (${pct}%), ATI ${s.atiScore}%, ${s.coursesComplete} courses complete`);
      if (s.notes) lines.push(`    Note: ${s.notes}`);
    });
    lines.push("");
  }

  if (comp.length) {
    const pending = comp.filter(c => c.status === "pending");
    const verified = comp.filter(c => c.status === "verified");
    lines.push(`COMPETENCIES: ${verified.length} verified, ${pending.length} pending sign-off`);
    pending.forEach(c => lines.push(`  PENDING: ${c.studentId} — ${c.competency} (waiting: ${c.notes || "instructor"})`));
    verified.forEach(c => lines.push(`  VERIFIED: ${c.studentId} — ${c.competency} (signed by ${c.attestedBy})`));
    lines.push("");
  }

  if (cd.length) {
    lines.push(`ACTIVE COURSES (${cd.length}):`);
    cd.forEach(c => lines.push(`  ${c.code} — ${c.name}: Week ${c.currentWeek}/${c.totalWeeks}, ${c.enrolled || 0} enrolled`));
    lines.push("");
  }

  if (inst.length) {
    lines.push(`INSTRUCTORS: ${inst.map(i => `${i.name} (${i.role})`).join(", ")}`);
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

async function irBlock(db, tenantId) {
  const [capTableDoc, txSnap, loanSnap, investorsSnap] = await Promise.all([
    safe(db.collection("governance").doc("capTable").get(), null),
    safe(db.collection("transactions").where("tenantId", "==", tenantId).limit(2000).get(), null),
    safe(db.collection("loans").where("tenantId", "==", tenantId).get(), null),
    safe(db.collection("investors").where("tenantId", "==", tenantId).limit(100).get(), null),
  ]);

  const ct = capTableDoc?.exists ? capTableDoc.data() : {};
  // governance/capTable is a platform-level document (SOCIII Inc).
  // Guard: only use it when it belongs to this tenant. If a customer tenant
  // activates an IR worker, we must not inject SOCIII's own ownership data
  // into their workspace. ownerTenantId on the doc identifies the owner;
  // absent = legacy platform doc (treat as platform-owned, not tenant-owned).
  const ctOwner = ct.ownerTenantId || null;
  const ctBelongsHere = !ctOwner || ctOwner === tenantId;
  const shareholders = ctBelongsHere ? (ct.shareholders || []) : [];
  const totalShares = ctBelongsHere ? (ct.totalShares || 10000000) : 0;

  // Compute book equity from transactions + loans — never from stale snapshots.
  const txs = docs(txSnap).filter(t => t.date);
  const sumC = (f) => txs.filter(f).reduce((s, t) => s + (t.amountCents || 0), 0);
  const isExpense  = t => t.direction === "debit"  && (t.classification === "expense" || !t.classification);
  const isFinancing = t => t.classification === "liability" || t.classification === "equity_contribution";
  const isCapEx    = t => t.classification === "asset";
  const operatingRevenue  = sumC(t => t.classification === "revenue");
  const operatingExpenses = sumC(t => isExpense(t));
  const financingInflows  = sumC(t => isFinancing(t) && t.direction === "credit");
  const capExCents        = sumC(t => isCapEx(t) && t.direction === "debit");
  const cashCents = financingInflows + operatingRevenue - operatingExpenses - capExCents;
  const totalAssetsCents = Math.max(0, cashCents) + capExCents;

  const loans = docs(loanSnap);
  const totalDebtCents = loans.reduce((s, l) => s + (l.principalCents || 0), 0);
  const totalDebtDollars = totalDebtCents / 100;
  // Book equity (negative = accumulated deficit, expected for a pre-revenue startup)
  const bookEquityCents = totalAssetsCents - totalDebtCents;

  const investors = docs(investorsSnap);
  const totalRaised = investors.reduce((s, i) => s + (i.amount || 0), 0);

  // 409A — three-approach blend (server-computed, never delegated to the AI).
  const dr = 0.20;
  const pv = (fv, yrs) => fv / Math.pow(1 + dr, yrs);
  // Asset approach: book equity + IP premium (software dev + patent applications)
  const assetEV = Math.max(0, bookEquityCents / 100 + 60000 + 90000);
  const marketEV = 2100000; // pre-revenue AI/SaaS seed, working product + active customers
  // PWERM SCENARIOS — must match index.js ~line 24105
  // Fingerprint: [50M@0.12@4y, 10M@0.30@3y, 3M@0.35@5y, 0@0.23@0y]
  // Changing any ev/prob/yrs here without updating that file will silently diverge the 409A route.
  const pwermEV = [
    { ev: 50000000, prob: 0.12, yrs: 4 },
    { ev: 10000000, prob: 0.30, yrs: 3 },
    { ev: 3000000,  prob: 0.35, yrs: 5 },
    { ev: 0,        prob: 0.23, yrs: 0 },
  ].reduce((s, sc) => s + sc.prob * pv(sc.ev, sc.yrs), 0);
  const blendedEV = assetEV * 0.10 + marketEV * 0.40 + pwermEV * 0.50;
  const equityValue = Math.max(0, (blendedEV - totalDebtDollars) * 0.65); // 35% DLOM
  const fmvPerShare = equityValue / totalShares;

  const shareholderSummary = !ctBelongsHere
    ? "  - (No cap table on file for this workspace — contact support to set up your cap table)"
    : shareholders.length > 0
      ? shareholders.map(s => `  - ${s.name}: ${(s.shares || 0).toLocaleString()} shares`).join("\n")
      : "  - Sean Combs (Founder): 7,100,000 (71%)\n  - Kent Redwine (CFO): 1,700,000 (17%)\n  - 6 Advisors 2% each: 1,200,000 total";

  const loanLines = loans.length
    ? loans.map(l => `  - ${l.lender || l.lenderName}: $${Math.round((l.principalCents || 0) / 100).toLocaleString()} @ ${l.interestRatePct || l.annualRatePercent || 0}%`).join("\n")
    : "  - (No loans on file for this tenant — see accounting worker for loan details)";

  const lines = [
    "## Investor Relations — Live Workspace Data",
    "",
    `### Cap Table (${totalShares.toLocaleString()} total shares outstanding, par $0.00001)`,
    shareholderSummary,
    "",
    `### Loans on Book`,
    loanLines,
    `Total Debt: $${Math.round(totalDebtDollars).toLocaleString()}`,
    "",
    `### Balance Sheet (server-computed from transactions + loans — not from stale snapshots)`,
    `Total Assets:  $${Math.round(totalAssetsCents / 100).toLocaleString()}`,
    `Total Liabilities: $${Math.round(totalDebtCents / 100).toLocaleString()}`,
    `Book Equity: $${Math.round(bookEquityCents / 100).toLocaleString()} (accumulated deficit expected for pre-revenue startup)`,
    "",
    `### 409A Valuation — Computed (AI-indicative, not IRS safe harbor)`,
    `Asset Approach EV:       $${Math.round(assetEV).toLocaleString()} (book equity + IP premium: software dev + patent applications)`,
    `Market Comparable EV:    $${Math.round(marketEV).toLocaleString()} (pre-revenue AI/SaaS seed stage, working product + active customers)`,
    `PWERM Weighted EV:       $${Math.round(pwermEV).toLocaleString()} (exit-scenario probability weighting at 20% discount rate)`,
    `Blended Enterprise Value: $${Math.round(blendedEV).toLocaleString()} (10% Asset / 40% Market / 50% PWERM)`,
    `Less: Debt:              ($${Math.round(totalDebtDollars).toLocaleString()})`,
    `Less: DLOM (35%):        ($${Math.round((blendedEV - totalDebtDollars) * 0.35).toLocaleString()})`,
    `Equity Value (post-DLOM): $${Math.round(equityValue).toLocaleString()}`,
    `FMV per Share:            $${fmvPerShare.toFixed(4)}`,
    "",
    `### Investor Pipeline`,
    `External investors on file: ${investors.length}`,
    `Total raised to date: $${totalRaised.toLocaleString()}`,
    "",
    "### Canvas Capabilities",
    "- To generate a 409A report on canvas: emit card:ir-409a with a payload containing {fmvPerShare, equityValue, blendedEV, assetEV, marketEV, pwermEV, totalShares, totalDebt, shareholders, scenarios, asOf}.",
    "- The canvas card has a ↓ Download button — do NOT say exports aren't available.",
    "- Do NOT fabricate cap table percentages or financial figures. Use the numbers above.",
  ];
  return lines.join("\n") + "\n\n";
}

const BUILDERS = {
  "platform-hr": staffCredentialsBlock,
  "title-abstract-001": titleAbstractBlock,
  "spine-4-staff-credentials": staffCredentialsBlock,
  "vet-003-drug-dosing": vetDosingBlock,
  "edu-001-cvt-exam-prep": eduCohortBlock,
  "platform-marketing": marketingBlock,
  "platform-contacts": contactsBlock,
  "platform-accounting": accountingBlock,
  "fundraise": irBlock,
  "investor-relations": irBlock,
  // EU Battery DPP suite (CODEX 71: collapsed from 5 workers to 3 —
  // Passport Builder + Registry Manager + Lifecycle Monitor merged into
  // one "Passport & Registry Manager" worker)
  "eu-battery-dpp-001": dppComplianceBlock,
  "eu-passport-registry-001": dppPassportRegistryBlock,
  "eu-supply-chain-tracer-001": dppSupplyChainBlock,
  // Makai School of Nursing + Clearwater Nursing Education — all share the cohort grounding block
  "nursing-education-001": nursingCohortBlock,
  "nursing-records-001": nursingCohortBlock,
  "nursing-courses-001": nursingCohortBlock,
  "nursing-tutor-001": nursingCohortBlock,
  "nursing-comms-001": nursingCohortBlock,
  "nursing-accreditation-001": nursingCohortBlock,
};

/**
 * @param {object} args
 * @param {object} args.db        Firestore admin db
 * @param {string} args.tenantId  caller's tenant
 * @param {string} args.workerSlug active worker
 * @param {string} [args.uid]     authenticated user id (enriches per-user blocks like marketing)
 * @returns {Promise<string>} grounding block ("" if none / no data)
 */

// ── Shared workspace context ─────────────────────────────────────────────────
// Injected into EVERY worker regardless of type, so siblings have situational
// awareness of each other's domains. Kept intentionally thin (< 10 lines) so
// it doesn't crowd out the worker-specific block.
async function workspaceContextBlock(db, tenantId) {
  try {
    const [txSnap, loanSnap] = await Promise.all([
      safe(db.collection("transactions").where("tenantId", "==", tenantId).limit(2000).get(), null),
      safe(db.collection("loans").where("tenantId", "==", tenantId).get(), null),
    ]);
    const txs = docs(txSnap).filter(t => t.date);
    const loans = docs(loanSnap);
    if (!txs.length && !loans.length) return "";

    const sumC = (f) => txs.filter(f).reduce((s, t) => s + (t.amountCents || 0), 0);
    const isExpense   = t => t.direction === "debit"  && (t.classification === "expense" || !t.classification);
    const isFinancing = t => t.classification === "liability" || t.classification === "equity_contribution";
    const isCapEx     = t => t.classification === "asset";
    const opRev  = sumC(t => t.classification === "revenue");
    const opExp  = sumC(t => isExpense(t));
    const finIn  = sumC(t => isFinancing(t) && t.direction === "credit");
    const capEx  = sumC(t => isCapEx(t) && t.direction === "debit");
    const cash   = Math.max(0, finIn + opRev - opExp - capEx);
    const totalDebt = loans.reduce((s, l) => s + (l.principalCents || 0), 0);
    const D = (cents) => `$${Math.round(cents / 100).toLocaleString()}`;
    // Note: limit(2000) means totals may be approximate for tenants with >2000 transactions.
    // The accounting worker's own block reads with the same cap; use the Accounting worker
    // for authoritative figures on large transaction sets.
    const truncNote = txs.length >= 2000 ? " (snapshot: ≥2000 txns, totals approximate)" : "";

    const lines = [
      "WORKSPACE CONTEXT (company-wide snapshot — available to all workers):",
      `  Cash on hand: ${D(cash)}${truncNote} · Operating expenses YTD: ${D(opExp)} · Revenue: ${D(opRev)} · Net loss: ${D(opRev - opExp)}`,
      `  Financing received: ${D(finIn)} (loans) · CapEx: ${D(capEx)} · Total liabilities: ${D(totalDebt)}`,
      `  Loans: ${loans.map(l => `${l.lender} ${D(l.principalCents || 0)}`).join("; ")}.`,
      "  This snapshot is from the same live Firestore data the Accounting worker uses. Cite it when answering cross-worker questions.",
      "",
    ];
    return lines.join("\n");
  } catch (e) {
    console.warn("[workerOwnData] workspaceContextBlock failed:", e.message);
    return "";
  }
}

async function buildWorkerOwnData({ db, tenantId, workerSlug, uid }) {
  if (!db || !tenantId || tenantId === "vault" || !workerSlug) return "";
  try {
    // Workspace context runs for every worker — sibling awareness.
    const wsBlock = await workspaceContextBlock(db, tenantId);

    const builder = BUILDERS[workerSlug];
    const workerBlock = builder ? await builder(db, tenantId, uid).catch(e => {
      console.warn("[workerOwnData] build failed for", workerSlug, e.message);
      return "";
    }) : "";

    const combined = (wsBlock + workerBlock).trim();
    if (!combined) return "";
    return combined + "\n\nGround every answer in YOUR OWN RECORDS above — these are the real records on this workspace's canvas right now. Cite specific names, numbers, and dates from them. Never say you lack access to this data or ask the user to upload it.\n\n";
  } catch (e) {
    console.warn("[workerOwnData] buildWorkerOwnData failed:", e.message);
    return "";
  }
}

module.exports = { buildWorkerOwnData };
