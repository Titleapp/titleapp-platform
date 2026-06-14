// ----------------------------------------------------------------------------
// Chat Canary — synthetic monitor for the baseline AI chat
// ----------------------------------------------------------------------------
// Sean's rule: "Nothing is worse than coming in and baseline AI chat doesn't
// work." This runs every 15 min, sends synthetic messages through the REAL
// chat endpoint (end-to-end via the Cloudflare frontdoor, so it also catches
// routing/CORS/deploy failures), and asserts a non-empty reply.
//
// What it does when it finds chat broken:
//   1. DETECT  — classify the failure (HTTP error / timeout / empty reply).
//   2. RECORD  — write status to config/chatHealth + append chatHealthEvents
//                (so we have history + the exact failing payload to fix fast).
//   3. ALERT   — on a GREEN→RED transition, TEXT + EMAIL every recipient in
//                config/chatHealth.alertRecipients (Sean + an advisor). Stays
//                quiet while still red (re-pings every 6h so it isn't forgotten),
//                and sends an "✅ back up" text on RED→GREEN recovery.
// It does NOT auto-edit code — a human/Claude fixes; the canary's job is to make
// sure we hear about it within ~15 min instead of from a customer.
// ----------------------------------------------------------------------------

const admin = require("firebase-admin");

const FRONTDOOR = "https://titleapp-frontdoor.titleapp-core.workers.dev";
const CHAT_URL = `${FRONTDOOR}/api?path=/v1/chat:message`;
const HEALTH_DOC = "config/chatHealth";
const REALERT_AFTER_MS = 6 * 60 * 60 * 1000; // re-text every 6h while still down

// Default alert recipients — overridden by config/chatHealth.alertRecipients.
const DEFAULT_RECIPIENTS = [
  { name: "Sean", phone: "+13104300780", email: "seanlcombs@gmail.com" },
];

// Synthetic scenarios. Each exercises a real code path end-to-end.
const SCENARIOS = [
  {
    key: "landing_baseline",
    label: "Landing — fresh visitor says hi",
    seedSession: null,
    body: { userInput: "hi", surface: "landing" },
  },
  {
    key: "dashboard_sticky_dev",
    label: "Workspace — session stuck at dev_discovery says hello (the bug we fixed)",
    // Plant a session whose step is stuck at dev_discovery (the exact failure
    // mode that broke Sean's Chief-of-Staff chat), then send a dashboard
    // message. A healthy system clears the sticky step and still replies.
    seedSession: { state: { step: "dev_discovery" }, surface: "landing" },
    body: { userInput: "hello?", context: { currentSection: "dashboard" } },
  },
];

async function runOneScenario(db, scn, nowMs) {
  const sessionId = `cs_canary_${scn.key}_${nowMs}`;
  // Seed a session doc if the scenario needs a specific prior state.
  if (scn.seedSession) {
    try {
      await db.collection("chatSessions").doc(sessionId).set({
        ...scn.seedSession,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        _canary: true,
      });
    } catch (e) {
      return { key: scn.key, label: scn.label, pass: false, reason: `seed_failed: ${e.message}` };
    }
  }

  const payload = { sessionId, ...scn.body };
  const startedAt = Date.now();
  let httpStatus = 0, raw = "", json = null, reason = null, pass = false, responseLen = 0, fieldUsed = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    httpStatus = resp.status;
    raw = await resp.text();
    if (!resp.ok) {
      reason = `http_${httpStatus}`;
    } else {
      try { json = JSON.parse(raw); } catch { reason = "non_json_response"; }
      if (json) {
        const txt = (json.response || json.message || "").toString();
        responseLen = txt.length;
        fieldUsed = json.response ? "response" : (json.message ? "message" : null);
        if (json.ok === false) reason = `ok_false: ${json.error || "(no error field)"}`;
        else if (responseLen === 0) reason = "empty_reply"; // the "No response received" bug
        else pass = true;
      }
    }
  } catch (e) {
    reason = e.name === "AbortError" ? "timeout_30s" : `fetch_error: ${e.message}`;
  }
  const latencyMs = Date.now() - startedAt;

  // Clean up the synthetic session (ephemeral test data, safe to delete).
  if (scn.seedSession || pass || reason) {
    try { await db.collection("chatSessions").doc(sessionId).delete(); } catch { /* ignore */ }
  }

  return { key: scn.key, label: scn.label, pass, reason, httpStatus, latencyMs, responseLen, fieldUsed,
    preview: pass && json ? (json.response || json.message || "").toString().slice(0, 100) : null };
}

async function sendAlerts(db, recipients, smsText, emailSubject, emailHtml) {
  const results = { sms: [], email: [] };
  // SMS via the shared Twilio helper.
  let sendSMSDirect = null;
  try { ({ sendSMSDirect } = require("../communications/twilioHelper")); } catch { /* not available */ }
  for (const r of recipients) {
    if (r.phone && sendSMSDirect) {
      try { const x = await sendSMSDirect(r.phone, smsText); results.sms.push({ to: r.phone, sid: x.sid || null }); }
      catch (e) { results.sms.push({ to: r.phone, error: e.message }); }
    }
    if (r.email && process.env.SENDGRID_API_KEY) {
      try {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: r.email }] }],
            from: { email: "alex@titleapp.ai", name: "SOCIII Chat Canary" },
            subject: emailSubject,
            content: [{ type: "text/html", value: emailHtml }],
          }),
        });
        results.email.push({ to: r.email });
      } catch (e) { results.email.push({ to: r.email, error: e.message }); }
    }
  }
  return results;
}

async function runChatCanary(opts = {}) {
  const db = admin.firestore();
  const nowMs = Date.now();

  // 1. DETECT — run every scenario.
  const scenarios = [];
  for (const scn of SCENARIOS) scenarios.push(await runOneScenario(db, scn, nowMs));
  const failures = scenarios.filter(s => !s.pass);
  const healthy = failures.length === 0;
  const status = healthy ? "green" : "red";

  // Load prior state for transition + dedupe logic.
  const healthRef = db.doc(HEALTH_DOC);
  const prevSnap = await healthRef.get();
  const prev = prevSnap.exists ? prevSnap.data() : {};
  const prevStatus = prev.status || "green";
  const recipients = (Array.isArray(prev.alertRecipients) && prev.alertRecipients.length)
    ? prev.alertRecipients : DEFAULT_RECIPIENTS;
  const lastAlertAt = prev.lastAlertAtMs || 0;

  // 2. RECORD — status doc + append-only event.
  await healthRef.set({
    status,
    healthy,
    lastCheckedMs: nowMs,
    lastChecked: admin.firestore.FieldValue.serverTimestamp(),
    scenarios,
    failureCount: failures.length,
    ...(healthy ? { lastGreenMs: nowMs } : {}),
    ...(prevSnap.exists ? {} : { alertRecipients: DEFAULT_RECIPIENTS }),
  }, { merge: true });
  await db.collection("chatHealthEvents").add({
    status, healthy, failureCount: failures.length, scenarios,
    at: admin.firestore.FieldValue.serverTimestamp(), atMs: nowMs,
  });

  // 3. ALERT — decide whether to notify.
  let alerted = null, alertReason = "none";
  const failText = failures.map(f => `• ${f.label}: ${f.reason}`).join("\n");
  if (!healthy && prevStatus === "green") {
    alertReason = "green_to_red";
  } else if (!healthy && prevStatus === "red" && (nowMs - lastAlertAt) > REALERT_AFTER_MS) {
    alertReason = "still_red_6h";
  } else if (healthy && prevStatus === "red") {
    alertReason = "recovery";
  }

  if (alertReason !== "none" && !opts.noAlerts) {
    if (alertReason === "recovery") {
      const sms = `✅ SOCIII chat is back UP. (was down, now passing all canary checks)`;
      alerted = await sendAlerts(db, recipients, sms, "✅ SOCIII chat recovered",
        `<p>SOCIII baseline chat is <b>back up</b> — all canary scenarios passing.</p>`);
    } else {
      const sms = `🔴 SOCIII chat is DOWN.\n${failText}\nCanary will keep watching. Check sociii.ai/vault.`.slice(0, 1500);
      alerted = await sendAlerts(db, recipients, sms, "🔴 SOCIII chat DOWN — canary alert",
        `<p><b>SOCIII baseline chat failed canary checks.</b></p><pre>${failText}</pre>
         <p>Full scenario detail in Firestore <code>config/chatHealth</code>.</p>`);
    }
    await healthRef.set({ lastAlertAtMs: nowMs, lastAlertReason: alertReason }, { merge: true });
  }

  const summary = { status, healthy, failureCount: failures.length, alertReason, scenarios };
  console.log("[chatCanary]", JSON.stringify(summary));
  return { ...summary, alerted };
}

module.exports = { runChatCanary, SCENARIOS };
