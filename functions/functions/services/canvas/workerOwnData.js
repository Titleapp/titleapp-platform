"use strict";

/**
 * workerOwnData.js — per-worker "YOUR OWN RECORDS" grounding block.
 *
 * The sibling-state snapshot (spineState.js) only models the 5 Spine workers
 * (accounting/marketing/hr/contacts/control-center) and only as KPI COUNTS.
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

// ── Marketing campaigns (detail on top of spineState's counts) ──
async function marketingBlock(db, tenantId) {
  const snap = await safe(db.collection("campaigns").where("tenantId", "==", tenantId).get(), null);
  let campaigns = docs(snap);
  if (!campaigns.length) return "";
  campaigns = campaigns.map(c => {
    const ctr = c.impressions ? Math.round((c.clicks / c.impressions) * 1000) / 10 : 0;
    const cpl = c.conversions ? Math.round((c.spend || 0) / c.conversions) : null;
    return { ...c, ctr, cpl };
  }).sort((a, b) => (b.conversions || 0) - (a.conversions || 0) || (b.ctr - a.ctr));
  const fmt = (c) => `${c.name}${c.channel ? ` (${c.channel})` : ""} — ${c.conversions || 0} leads, ${c.ctr}% CTR, ${(c.impressions || 0).toLocaleString()} impressions, $${c.spend || 0} spend${c.cpl != null ? `, $${c.cpl}/lead` : ""}`;
  const lines = [`YOUR OWN RECORDS — Marketing campaigns (${campaigns.length} active):`];
  lines.push(`TOP PERFORMER: ${fmt(campaigns[0])}`);
  lines.push("ALL CAMPAIGNS (best first):\n" + campaigns.map(c => `- ${fmt(c)}`).join("\n"));
  return lines.join("\n") + "\n\n";
}

// ── Accounting (real YTD + MTD totals, so chat matches the dashboard) ──
// spineState's own-state only gives MTD; without YTD the model extrapolates
// ("April $98k, May $98k…") and contradicts the canvas's $588.6k YTD. Compute
// the same figures the canvas does, straight from the transactions.
async function accountingBlock(db, tenantId) {
  const snap = await safe(db.collection("transactions").where("tenantId", "==", tenantId).limit(2000).get(), null);
  const txs = docs(snap).filter(t => t.date);
  if (!txs.length) return "";
  const dollars = (cents) => `$${Math.round((cents || 0) / 100).toLocaleString()}`;
  const sumC = (f) => txs.filter(f).reduce((s, t) => s + (t.amountCents || 0), 0);
  const ytdRev = sumC(t => t.direction === "credit");
  const ytdExp = sumC(t => t.direction === "debit");
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const mRev = sumC(t => t.direction === "credit" && t.date >= monthStart);
  const mExp = sumC(t => t.direction === "debit" && t.date >= monthStart);
  // Per-month revenue/expense so chat can answer "show me each month" with real
  // figures instead of repeating MTD across every month.
  const byMonth = {};
  for (const t of txs) {
    const m = String(t.date).slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { rev: 0, exp: 0 };
    byMonth[m][t.direction === "credit" ? "rev" : "exp"] += (t.amountCents || 0);
  }
  const months = Object.keys(byMonth).sort();
  const lines = [`YOUR OWN RECORDS — Accounting (${txs.length} transactions, ${months[0]} → ${months[months.length - 1]}):`];
  lines.push(`YEAR-TO-DATE: revenue ${dollars(ytdRev)}, expenses ${dollars(ytdExp)}, net income ${dollars(ytdRev - ytdExp)}.`);
  lines.push(`THIS MONTH (MTD): revenue ${dollars(mRev)}, expenses ${dollars(mExp)}, net ${dollars(mRev - mExp)}.`);
  lines.push("BY MONTH (revenue / expenses): " + months.map(m => `${m} ${dollars(byMonth[m].rev)}/${dollars(byMonth[m].exp)}`).join("; ") + ".");
  lines.push("These YTD totals are authoritative and match the Accounting dashboard — never extrapolate or repeat the monthly figure across months.");
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

const BUILDERS = {
  "platform-hr": staffCredentialsBlock,
  "title-abstract-001": titleAbstractBlock,
  "spine-4-staff-credentials": staffCredentialsBlock,
  "vet-003-drug-dosing": vetDosingBlock,
  "edu-001-cvt-exam-prep": eduCohortBlock,
  "platform-marketing": marketingBlock,
  "platform-contacts": contactsBlock,
  "platform-accounting": accountingBlock,
};

/**
 * @param {object} args
 * @param {object} args.db        Firestore admin db
 * @param {string} args.tenantId  caller's tenant
 * @param {string} args.workerSlug active worker
 * @returns {Promise<string>} grounding block ("" if none / no data)
 */
async function buildWorkerOwnData({ db, tenantId, workerSlug }) {
  if (!db || !tenantId || tenantId === "vault" || !workerSlug) return "";
  const builder = BUILDERS[workerSlug];
  if (!builder) return "";
  try {
    const block = await builder(db, tenantId);
    if (!block) return "";
    return block + "Ground every answer in YOUR OWN RECORDS above — these are the real records on this workspace's canvas right now. Cite specific names, numbers, and dates from them. Never say you lack access to this data or ask the user to upload it.\n\n";
  } catch (e) {
    console.warn("[workerOwnData] build failed for", workerSlug, e.message);
    return "";
  }
}

module.exports = { buildWorkerOwnData };
