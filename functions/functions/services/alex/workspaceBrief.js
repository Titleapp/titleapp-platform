"use strict";

/**
 * workspaceBrief.js — the Chief-of-Staff brain (2026-06-23).
 *
 * Aggregates REAL workspace data into a compact text block that gets injected
 * into Alex's system prompt, so "what's my day like / how's the company doing"
 * gets a grounded answer with actual numbers and dates — not a generic pitch.
 *
 * Two tenant scopes (important): business data (accounting, staff credentials)
 * lives under the workspace tenantId; the personal Vault (DTC deadlines, net
 * worth) lives under tenantId="vault" + the user's uid. We query both.
 *
 * Every section is independent + non-fatal — if a source is empty or errors,
 * that section is simply omitted (Alex is told to say it doesn't have it).
 */

const admin = require("firebase-admin");

function db() { return admin.firestore(); }
const usd = (cents) => "$" + Math.round((Number(cents) || 0) / 100).toLocaleString();
const usdPlain = (n) => "$" + Math.round(Number(n) || 0).toLocaleString();
function daysUntil(dateStr) {
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}

async function buildWorkspaceBrief({ uid, tenantId }) {
  const sections = [];

  // 1) Finances — P&L MTD + cash + runway (business tenant).
  if (tenantId) {
    try {
      const { computeSummary } = require("../accounting/dashboardSummary");
      const s = await computeSummary({ tenantId });
      // dashboardSummary returns nested { cents } objects, e.g. cashOnHand:{cents}.
      const cents = (x) => x && typeof x.cents === "number" ? x.cents : 0;
      if (s && (s.revenueMtd || s.cashOnHand)) {
        let line = `FINANCES (month-to-date): revenue ${usd(cents(s.revenueMtd))}, expenses ${usd(cents(s.expensesMtd))}, net ${usd(cents(s.netIncomeMtd))}. Cash on hand ${usd(cents(s.cashOnHand))}.`;
        if (s.runway && s.runway.months != null) line += ` Runway ≈ ${Math.round(s.runway.months)} months.`;
        sections.push(line);
      }
    } catch (e) { /* omit */ }
  }

  // 2) Filing / tax obligations (business tenant).
  if (tenantId) {
    try {
      const { listObligations } = require("../accounting/obligations");
      const o = await listObligations({ tenantId, userId: uid });
      const urgent = (o && Array.isArray(o.obligations) ? o.obligations : [])
        .filter((x) => x.severity === "red" || x.severity === "amber")
        .sort((a, b) => (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999))
        .slice(0, 5);
      if (urgent.length) {
        sections.push("FILINGS / OBLIGATIONS:\n" + urgent.map((x) => {
          const d = x.dueDate ? ` — due ${String(x.dueDate).slice(0, 10)}` : "";
          const n = x.daysUntilDue != null ? (x.daysUntilDue < 0 ? ` (${-x.daysUntilDue}d OVERDUE)` : ` (in ${x.daysUntilDue}d)`) : "";
          return `- ${x.label}${d}${n} [${x.severity}]`;
        }).join("\n"));
      }
    } catch (e) { /* omit */ }
  }

  // 3) Vault — expiring/overdue records + net worth (tenant="vault" + uid).
  if (uid) {
    try {
      const snap = await db().collection("dtcs").where("userId", "==", uid).where("tenantId", "==", "vault").get();
      const dtcs = snap.docs.map((d) => d.data());
      const deadlines = [];
      let assets = 0, liabilities = 0;
      for (const d of dtcs) {
        const m = d.metadata || {};
        const due = m.expires || m.nextDue;
        if (due) {
          const days = daysUntil(due);
          if (days != null && days <= 45) deadlines.push({ title: m.title || d.type, due: String(due).slice(0, 10), days });
        }
        const v = m.valueUsd;
        if (typeof v === "number") { if (d.type === "liability") liabilities += v; else assets += v; }
      }
      deadlines.sort((a, b) => a.days - b.days);
      if (deadlines.length) {
        sections.push("VAULT — EXPIRING / OVERDUE:\n" + deadlines.slice(0, 6).map((x) =>
          `- ${x.title} — ${x.days < 0 ? `OVERDUE by ${-x.days}d` : `due in ${x.days}d`} (${x.due})`).join("\n"));
      }
      if (assets || liabilities) {
        sections.push(`NET WORTH: ≈ ${usdPlain(assets - liabilities)} (assets ${usdPlain(assets)} − liabilities ${usdPlain(liabilities)}).`);
      }
    } catch (e) { /* omit */ }
  }

  // 4) Staff credentials needing attention (business tenant).
  if (tenantId) {
    try {
      // Canonical collection is staff_credentials (underscore); each doc holds a
      // credentials[] array, not a flat status. Walk the array for overdue /
      // expiring_soon items (the same data the HR + Credentials canvases show).
      const snap = await db().collection("staff_credentials").where("tenantId", "==", tenantId).get();
      const flagged = [];
      snap.docs.map((d) => d.data()).forEach((s) => {
        (s.credentials || []).forEach((c) => {
          if (c.status === "overdue" || c.status === "expiring_soon") {
            flagged.push({ name: s.full_name || s.staff_id, role: s.role, cred: c.credential_name, status: c.status, days: c.days_remaining });
          }
        });
      });
      flagged.sort((a, b) => (a.status === "overdue" ? 0 : 1) - (b.status === "overdue" ? 0 : 1));
      if (flagged.length) {
        sections.push("STAFF CREDENTIALS NEEDING ATTENTION:\n" + flagged.slice(0, 6).map((s) =>
          `- ${s.name}${s.role ? ` (${s.role})` : ""}: ${s.cred} — ${String(s.status).toUpperCase().replace("_", " ")}${s.days != null ? ` (${s.days}d)` : ""}`).join("\n"));
      }
    } catch (e) { /* omit */ }
  }

  if (!sections.length) return null;
  return sections.join("\n\n");
}

module.exports = { buildWorkspaceBrief };
