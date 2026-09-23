"use strict";

/**
 * workerTeamDigest.js — the "Worker Team" section of Alex's existing
 * twice-daily digest (cosScheduler.js). This is the cheap, buildable
 * version of "Alex as meeting chair" (CODEX 101's Option B, chosen over
 * building genuinely new shared-session chat infrastructure): no new
 * architecture, just three things that already exist as of this week
 * pulled into the digest Sean already reads — commitment track records,
 * Dev's current findings, and Ivy's task-canary result.
 *
 * SOCIII-INTERNAL ONLY, DELIBERATELY: this reads SOCIII's own back-office
 * data (its own tenant's commitments, its own Dev findings). cosScheduler
 * sends this same digest to every paid subscriber across the whole
 * platform — showing this section to a customer would leak SOCIII's own
 * internal operational data into a client's inbox. Gated by SEAN_UID at
 * the call site in cosScheduler.js, same pattern chatCanary.js/
 * qualityCanary.js already use for "this is Sean's own alerting, not a
 * per-tenant feature."
 *
 * Deterministic facts only, narrated by fixed labels — no LLM judgment,
 * same discipline as CODEX 100's Dev.
 */

const admin = require("firebase-admin");

const SOCIII_TENANT_ID = "ws_1779846027006_hc71aw";
// The personas with a granted alias today — see personaEmailIdentities.js.
const ACTIVE_WORKER_SLUGS = ["platform-marketing", "platform-accounting", "platform-hr"];
const WORKER_DISPLAY_NAMES = { "platform-marketing": "Ivy", "platform-accounting": "Max", "platform-hr": "Jordan" };

async function gatherWorkerTeamData() {
  const db = admin.firestore();
  const { getWorkerTrackRecord } = require("../worker-team/commitmentLedger");

  const [devHealthSnap, taskCanarySnap] = await Promise.all([
    db.doc("config/devHealth").get(),
    db.doc("personaTaskCanaryStatus/platform-marketing").get(),
  ]);

  const devHealth = devHealthSnap.exists ? devHealthSnap.data() : null;
  const taskCanary = taskCanarySnap.exists ? taskCanarySnap.data() : null;

  const trackRecords = [];
  for (const slug of ACTIVE_WORKER_SLUGS) {
    try {
      const tr = await getWorkerTrackRecord(slug, SOCIII_TENANT_ID);
      trackRecords.push({ slug, name: WORKER_DISPLAY_NAMES[slug] || slug, ...tr });
    } catch (e) {
      trackRecords.push({ slug, name: WORKER_DISPLAY_NAMES[slug] || slug, error: e.message });
    }
  }

  return {
    dev: devHealth ? { ownStatus: devHealth.ownStatus || "green", ownReds: devHealth.ownReds || [], lastCheckedMs: devHealth.lastCheckedMs || null } : null,
    taskCanary: taskCanary ? { allPass: !!taskCanary.allPass, checkedAtMs: taskCanary.checkedAt && taskCanary.checkedAt.toMillis ? taskCanary.checkedAt.toMillis() : null } : null,
    trackRecords,
  };
}

function hoursAgo(ms) {
  if (!ms) return null;
  return (Date.now() - ms) / (1000 * 60 * 60);
}

/** @param {ReturnType<typeof gatherWorkerTeamData> extends Promise<infer T> ? T : never} data */
function buildWorkerTeamHtmlSection(data, styles) {
  const { s, h, r } = styles;
  const dot = (level) => `<span style="color:${{ green: "#16a34a", yellow: "#ca8a04", red: "#dc2626", gray: "#6b7280" }[level] || "#6b7280"}">●</span>`;

  const rows = [];

  // Dev — read-only IT/ops watcher.
  if (data.dev) {
    const age = hoursAgo(data.dev.lastCheckedMs);
    if (age !== null && age > 1.5) {
      rows.push(`<p ${r}>${dot("yellow")} Dev hasn't reported in ${age.toFixed(1)}h — check it's still running</p>`);
    } else if (data.dev.ownStatus === "red") {
      rows.push(`<p ${r}>${dot("red")} Dev: ${data.dev.ownReds.length} finding${data.dev.ownReds.length === 1 ? "" : "s"} needs attention</p>`);
    } else {
      rows.push(`<p ${r}>${dot("green")} Dev: all systems checked, nothing needs attention</p>`);
    }
  } else {
    rows.push(`<p ${r}>${dot("gray")} Dev: no report yet</p>`);
  }

  // Task canary (Ivy).
  if (data.taskCanary) {
    rows.push(`<p ${r}>${dot(data.taskCanary.allPass ? "green" : "red")} Ivy's task canary: ${data.taskCanary.allPass ? "passing" : "failing"}</p>`);
  }

  // Per-worker commitment track record.
  for (const tr of data.trackRecords) {
    if (tr.error || tr.total === 0) continue; // nothing to report yet — don't clutter the digest with empty rows
    const openCommitments = tr.open + tr.in_progress + tr.blocked + tr.pending_verification;
    const pct = tr.reliabilityRate != null ? Math.round(tr.reliabilityRate * 100) : null;
    rows.push(`<p ${r}>${dot(tr.expired > 0 ? "yellow" : "green")} ${tr.name}: ${openCommitments} open commitment${openCommitments === 1 ? "" : "s"}${pct != null ? `, ${pct}% delivered on record` : ""}</p>`);
  }

  if (rows.length === 0) return "";
  return `
    <div ${s}>
      <p ${h}>WORKER TEAM</p>
      ${rows.join("\n      ")}
    </div>`;
}

function buildWorkerTeamPlainSection(data) {
  const lines = [];
  if (data.dev) {
    lines.push(`Dev: ${data.dev.ownStatus === "red" ? `${data.dev.ownReds.length} finding(s) need attention` : "all clear"}`);
  }
  if (data.taskCanary) {
    lines.push(`Ivy's task canary: ${data.taskCanary.allPass ? "passing" : "failing"}`);
  }
  for (const tr of data.trackRecords) {
    if (tr.error || tr.total === 0) continue;
    const openCommitments = tr.open + tr.in_progress + tr.blocked + tr.pending_verification;
    lines.push(`${tr.name}: ${openCommitments} open commitment(s)`);
  }
  return lines.length ? `\nWORKER TEAM:\n${lines.join("\n")}` : "";
}

module.exports = { gatherWorkerTeamData, buildWorkerTeamHtmlSection, buildWorkerTeamPlainSection, SOCIII_TENANT_ID };
