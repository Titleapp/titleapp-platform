// ----------------------------------------------------------------------------
// Worker Health Canary — synthetic health check across all Digital Workers
// ----------------------------------------------------------------------------
// Sibling to the chat canary. Catches the bug CLASSES we keep hitting, before
// a customer does:
//   • RULES OFF (#42): a worker mapped to a ruleset whose rules fail to load →
//     it silently runs on generic DEFAULT_CHAT_RULES (compliance believed-on,
//     actually-off).
//   • RENDERS GENERIC (#37/#31): a catalog worker with no canvas source
//     (no canvasSpec, no canvasTabs, not a known fixture) → generic empty shell.
//   • BROKEN CATALOG ROW: missing status/vertical/name.
//
// On a NEW red, it texts + emails config/workerHealth.alertRecipients (same
// recipients model as chatCanary). Status in config/workerHealth, history in
// workerHealthEvents. On-demand: GET /v1/worker:health (?run=1).
// ----------------------------------------------------------------------------

const admin = require("firebase-admin");

const HEALTH_DOC = "config/workerHealth";
const REALERT_AFTER_MS = 12 * 60 * 60 * 1000; // workers change slowly; re-ping at 12h
const DEFAULT_RECIPIENTS = [{ name: "Sean", phone: "+13104300780", email: "seanlcombs@gmail.com" }];

const VALID_STATUSES = new Set([
  "live", "beta", "waitlist", "planned", "unlisted", "org", "draft", "deprecated", "coming_soon",
]);

// Slugs whose canvas is supplied by a frontend fixture (RE_CANVAS / learning),
// so "no canvasSpec/canvasTabs" is NOT a generic-render risk for them.
const FIXTURE_SLUGS = new Set([
  "title-abstract-001", "law-landuse-001", "zoning-001", "feasibility-001",
  "site-recon-001", "cre-analyst", "cre-deal-analyst", "student-eval-001",
  "nursing-education-001",
]);

function isValidCanvasSpec(spec) {
  return !!(spec && typeof spec === "object" && Array.isArray(spec.tabs) && spec.tabs.length > 0
    && spec.tabs.every((t) => t && Array.isArray(t.blocks)));
}

// ── Part A: rules health (the #42 guard) ──
function checkRulesHealth() {
  const findings = [];
  let map, loadChatRules;
  try {
    ({ WORKER_RULESET_MAP: map, loadChatRules } = require("../raas/raas.engine"));
  } catch (e) {
    return [{ severity: "red", scope: "rules", id: "engine", reason: `raas.engine failed to load: ${e.message}` }];
  }
  for (const slug of Object.keys(map || {})) {
    try {
      const rules = loadChatRules(slug);
      if (!rules) {
        findings.push({ severity: "red", scope: "rules", id: slug,
          reason: `compliance rules FAILED to load (ruleset "${map[slug]}") — worker runs on generic DEFAULT_CHAT_RULES` });
      }
    } catch (e) {
      findings.push({ severity: "red", scope: "rules", id: slug, reason: `loadChatRules threw: ${e.message}` });
    }
  }
  return findings;
}

// ── Part B: catalog health ──
async function checkCatalogHealth(db) {
  const findings = [];
  let snap;
  try {
    snap = await db.collection("digitalWorkers").get();
  } catch (e) {
    return { findings: [{ severity: "red", scope: "catalog", id: "digitalWorkers", reason: `catalog read failed: ${e.message}` }], total: 0 };
  }
  let total = 0;
  snap.forEach((doc) => {
    total++;
    const w = doc.data();
    const slug = doc.id;
    const name = w.display_name || w.name;
    const status = w.status;

    if (!status) findings.push({ severity: "red", scope: "catalog", id: slug, reason: "missing status" });
    else if (!VALID_STATUSES.has(status)) findings.push({ severity: "warn", scope: "catalog", id: slug, reason: `unknown status "${status}"` });

    if (!name) findings.push({ severity: "warn", scope: "catalog", id: slug, reason: "missing display_name/name" });
    if (!w.vertical) findings.push({ severity: "warn", scope: "catalog", id: slug, reason: "missing vertical (KPI/fixture routing may fall back)" });

    // Would it render its designed canvas, or the generic shell?
    const hasCanvas = isValidCanvasSpec(w.canvasSpec || w.canvas)
      || (Array.isArray(w.canvasTabs) && w.canvasTabs.length > 0)
      || FIXTURE_SLUGS.has(slug);
    // Only flag for statuses a user can actually open.
    if (!hasCanvas && ["live", "beta", "unlisted", "org"].includes(status)) {
      findings.push({ severity: "warn", scope: "catalog", id: slug, reason: "no canvasSpec/canvasTabs/fixture → renders the generic shell" });
    }
  });
  return { findings, total };
}

async function sendAlerts(recipients, smsText, emailSubject, emailHtml) {
  let sendSMSDirect = null;
  try { ({ sendSMSDirect } = require("../communications/twilioHelper")); } catch { /* unavailable */ }
  for (const r of recipients) {
    if (r.phone && sendSMSDirect) { try { await sendSMSDirect(r.phone, smsText); } catch (e) { console.warn("[workerCanary] sms fail", e.message); } }
    if (r.email && process.env.SENDGRID_API_KEY) {
      try {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: r.email }] }],
            from: { email: "alex@titleapp.ai", name: "SOCIII Worker Canary" },
            subject: emailSubject, content: [{ type: "text/html", value: emailHtml }],
          }),
        });
      } catch (e) { console.warn("[workerCanary] email fail", e.message); }
    }
  }
}

async function runWorkerCanary(opts = {}) {
  const db = admin.firestore();
  const nowMs = Date.now();

  const rulesFindings = checkRulesHealth();
  const { findings: catalogFindings, total } = await checkCatalogHealth(db);
  const findings = [...rulesFindings, ...catalogFindings];
  const reds = findings.filter((f) => f.severity === "red");
  const warns = findings.filter((f) => f.severity === "warn");
  const status = reds.length ? "red" : (warns.length ? "yellow" : "green");

  const healthRef = db.doc(HEALTH_DOC);
  const prevSnap = await healthRef.get();
  const prev = prevSnap.exists ? prevSnap.data() : {};
  const prevStatus = prev.status || "green";
  const prevRedKeys = new Set((prev.reds || []).map((r) => `${r.scope}:${r.id}`));
  const recipients = (Array.isArray(prev.alertRecipients) && prev.alertRecipients.length) ? prev.alertRecipients : DEFAULT_RECIPIENTS;
  const lastAlertAt = prev.lastAlertAtMs || 0;

  await healthRef.set({
    status, workersChecked: total,
    redCount: reds.length, warnCount: warns.length,
    reds, warns,
    lastCheckedMs: nowMs, lastChecked: admin.firestore.FieldValue.serverTimestamp(),
    ...(prevSnap.exists ? {} : { alertRecipients: DEFAULT_RECIPIENTS }),
  }, { merge: true });
  await db.collection("workerHealthEvents").add({
    status, workersChecked: total, redCount: reds.length, warnCount: warns.length,
    reds, warns: warns.slice(0, 50), atMs: nowMs, at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Alert on a NEW red (red key not seen last run), or re-ping if still red after 12h.
  const newReds = reds.filter((r) => !prevRedKeys.has(`${r.scope}:${r.id}`));
  let alertReason = "none";
  if (newReds.length) alertReason = "new_red";
  else if (reds.length && (nowMs - lastAlertAt) > REALERT_AFTER_MS) alertReason = "still_red_12h";
  else if (!reds.length && prevStatus === "red") alertReason = "recovery";

  if (alertReason !== "none" && !opts.noAlerts) {
    if (alertReason === "recovery") {
      await sendAlerts(recipients, "✅ SOCIII workers: all red issues cleared.", "✅ SOCIII workers recovered",
        "<p>All worker-health red issues cleared.</p>");
    } else {
      const lines = reds.map((r) => `• [${r.scope}] ${r.id}: ${r.reason}`).join("\n");
      await sendAlerts(recipients,
        `🔴 SOCIII worker health: ${reds.length} red.\n${lines}`.slice(0, 1400),
        `🔴 SOCIII worker health — ${reds.length} red`,
        `<p><b>${reds.length} worker(s) RED</b> of ${total} checked.</p><pre>${reds.map((r) => `[${r.scope}] ${r.id}: ${r.reason}`).join("\n")}</pre>`);
    }
    await healthRef.set({ lastAlertAtMs: nowMs, lastAlertReason: alertReason }, { merge: true });
  }

  const summary = { status, workersChecked: total, redCount: reds.length, warnCount: warns.length, alertReason };
  console.log("[workerCanary]", JSON.stringify(summary));
  return { ...summary, reds, warns: warns.slice(0, 50) };
}

module.exports = { runWorkerCanary };
