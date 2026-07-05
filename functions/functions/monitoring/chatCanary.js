// ----------------------------------------------------------------------------
// Chat Canary — synthetic monitor for the baseline AI chat
// ----------------------------------------------------------------------------
// Sean's rule: "Nothing is worse than coming in and baseline AI chat doesn't
// work." This runs every 15 min, sends synthetic messages through the REAL
// chat endpoint (end-to-end via the Cloudflare frontdoor, so it also catches
// routing/CORS/deploy failures), and asserts a non-empty reply.
//
// State machine (CODEX 19 H1):
//   HEALTHY      → any scenario fails           → ALERTING   (SMS+email via gate)
//   ALERTING     → all pass                     → RECOVERING (start 30-min timer)
//   ALERTING     → still failing ≥30 min        → SUSTAINED  (SMS-only via gate)
//   SUSTAINED    → all pass                     → RECOVERING
//   RECOVERING   → 30 min green elapsed         → HEALTHY    (recovery SMS, gate exempt)
//   RECOVERING   → any scenario fails           → ALERTING   (gate still in effect)
//
// lastSmsAt gate: applied to EVERY SMS-eligible transition (not just first-alert).
// SMS is suppressed if now - lastSmsAt < 2 hours. Recovery SMS is ALWAYS sent.
//
// Operating Feed: RED alert pushed on ALERTING, auto-resolved on HEALTHY.
// Recipients: read from config/chatHealth.alertRecipients; empty [] falls back
// to DEFAULT_RECIPIENTS (treat empty same as missing — never silently drop Sean).
// ----------------------------------------------------------------------------

const admin = require("firebase-admin");

const FRONTDOOR = "https://titleapp-frontdoor.titleapp-core.workers.dev";
const CHAT_URL = `${FRONTDOOR}/api?path=/v1/chat:message`;
const HEALTH_DOC = "config/chatHealth";

const SMS_COOLDOWN_MS = 2 * 60 * 60 * 1000;    // 2h between any two SMSes
const SUSTAINED_THRESHOLD_MS = 30 * 60 * 1000;  // 30 min in ALERTING → SUSTAINED
const RECOVERING_THRESHOLD_MS = 30 * 60 * 1000; // 30 min green → HEALTHY

// SEAN_UID must match the uid that owns the primary Operating Feed alertFeed doc.
// Canary alerts always go to Sean's feed regardless of which workspace is down.
const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2";

const DEFAULT_RECIPIENTS = [
  { name: "Sean", phone: "+13104300780", email: "seanlcombs@gmail.com" },
];

// Three independent scenarios per pass. ANY failure = ALERTING (H5: partial-outage detection).
const SCENARIOS = [
  {
    key: "landing_baseline",
    label: "Landing — fresh visitor says hi",
    seedSession: null,
    body: { userInput: "hi", surface: "landing" },
  },
  {
    key: "dashboard_sticky_dev",
    label: "Workspace — session stuck at dev_discovery (regression guard for the bug we fixed)",
    seedSession: { state: { step: "dev_discovery" }, surface: "landing" },
    body: { userInput: "hello?", context: { currentSection: "dashboard" } },
  },
  {
    key: "worker_chat_baseline",
    label: "Worker chat — quick question to a spine worker",
    seedSession: null,
    body: { userInput: "what can you help me with?", surface: "worker", context: { workerSlug: "platform-accounting" } },
  },
];

async function runOneScenario(db, scn, nowMs) {
  const sessionId = `cs_canary_${scn.key}_${nowMs}`;
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
        else if (responseLen === 0) reason = "empty_reply";
        else pass = true;
      }
    }
  } catch (e) {
    reason = e.name === "AbortError" ? "timeout_30s" : `fetch_error: ${e.message}`;
  }
  const latencyMs = Date.now() - startedAt;

  if (scn.seedSession || pass || reason) {
    try { await db.collection("chatSessions").doc(sessionId).delete(); } catch { /* ignore */ }
  }

  return { key: scn.key, label: scn.label, pass, reason, httpStatus, latencyMs, responseLen, fieldUsed,
    preview: pass && json ? (json.response || json.message || "").toString().slice(0, 100) : null };
}

async function sendAlerts(db, recipients, smsText, emailSubject, emailHtml) {
  const results = { sms: [], email: [] };
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

async function pushOperatingFeedAlert(db, nowMs, failing) {
  try {
    const dateHour = new Date(nowMs).toISOString().slice(0, 13).replace("T", "_");
    const ikey = `canary_${dateHour}`;
    const failSummary = failing.map(f => `${f.label}: ${f.reason}`).join("; ");
    await db.collection("alertFeed").doc(SEAN_UID).collection("items").doc(ikey).set({
      id: ikey, ikey,
      title: "SOCIII chat canary ALERTING",
      body: failSummary.slice(0, 200),
      severity: "red",
      source_label: "System Health",
      action_hint: "Check Cloudflare Worker + Firebase Functions logs",
      resolved: false,
      snoozeUntil: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (e) { console.warn("[chatCanary] Operating Feed alert failed:", e.message); }
}

async function resolveOperatingFeedAlert(db, nowMs, downSince) {
  try {
    const dateHour = new Date(nowMs).toISOString().slice(0, 13).replace("T", "_");
    const ikey = `canary_${dateHour}`;
    const downMin = downSince ? Math.round((nowMs - downSince) / 60000) : null;
    const evidence = downMin ? `Recovered after ${downMin} min` : "Recovered";
    await db.collection("alertFeed").doc(SEAN_UID).collection("items").doc(ikey).set({
      resolved: true,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      resolvedBy: "canary_auto",
      resolvedEvidence: evidence,
    }, { merge: true });
  } catch (e) { console.warn("[chatCanary] Operating Feed resolve failed:", e.message); }
}

async function runChatCanary(opts = {}) {
  const db = admin.firestore();
  const nowMs = Date.now();

  // 1. DETECT — run all 3 scenarios; any failure = alerting.
  const scenarios = [];
  for (const scn of SCENARIOS) scenarios.push(await runOneScenario(db, scn, nowMs));
  const failures = scenarios.filter(s => !s.pass);
  const healthy = failures.length === 0;

  // 2. Load prior state.
  const healthRef = db.doc(HEALTH_DOC);
  const prevSnap = await healthRef.get();
  const prev = prevSnap.exists ? prevSnap.data() : {};

  const prevState = prev.state || "HEALTHY";      // HEALTHY|ALERTING|SUSTAINED|RECOVERING
  const lastSmsAt = prev.lastSmsAtMs || 0;
  const alertingStartMs = prev.alertingStartMs || 0;
  const recoveringStartMs = prev.recoveringStartMs || 0;
  const alertingDownSince = prev.alertingDownSince || 0;

  // Recipients: empty array treated same as missing — never silently drop Sean.
  const recipients = (Array.isArray(prev.alertRecipients) && prev.alertRecipients.length > 0)
    ? prev.alertRecipients : DEFAULT_RECIPIENTS;

  // 3. Compute new state.
  let newState = prevState;
  let smsText = null, emailSubject = null, emailHtml = null, smsIsRecovery = false;
  let newAlertingStartMs = alertingStartMs;
  let newRecoveringStartMs = recoveringStartMs;
  let newAlertingDownSince = alertingDownSince;
  let alertReason = "none";

  if (prevState === "HEALTHY") {
    if (!healthy) {
      newState = "ALERTING";
      newAlertingStartMs = nowMs;
      newAlertingDownSince = nowMs;
      alertReason = "healthy_to_alerting";
      const failText = failures.map(f => `• ${f.label}: ${f.reason}`).join("\n");
      smsText = `🔴 SOCIII chat is DOWN.\n${failText}\nChecking every 15 min.`.slice(0, 1500);
      emailSubject = "🔴 SOCIII chat DOWN — canary alert";
      emailHtml = `<p><b>SOCIII baseline chat failed canary checks.</b></p><pre>${failText}</pre><p>Detail in Firestore config/chatHealth.</p>`;
    }
    // else stays HEALTHY, no action

  } else if (prevState === "ALERTING") {
    if (healthy) {
      newState = "RECOVERING";
      newRecoveringStartMs = nowMs;
      alertReason = "alerting_to_recovering";
    } else if (nowMs - alertingStartMs >= SUSTAINED_THRESHOLD_MS) {
      newState = "SUSTAINED";
      const downMin = Math.round((nowMs - alertingDownSince) / 60000);
      alertReason = "alerting_to_sustained";
      smsText = `🔴 SOCIII chat still DOWN — ${downMin} min. Monitoring.`.slice(0, 1500);
    }
    // else stays ALERTING, Operating Feed alert updated below

  } else if (prevState === "SUSTAINED") {
    if (healthy) {
      newState = "RECOVERING";
      newRecoveringStartMs = nowMs;
      alertReason = "sustained_to_recovering";
    }
    // else stays SUSTAINED

  } else if (prevState === "RECOVERING") {
    if (!healthy) {
      newState = "ALERTING";
      newAlertingStartMs = nowMs;
      // Down-since keeps the original episode start for duration tracking
      newAlertingDownSince = alertingDownSince || nowMs;
      alertReason = "recovering_to_alerting";
      const failText = failures.map(f => `• ${f.label}: ${f.reason}`).join("\n");
      smsText = `🔴 SOCIII chat DOWN again.\n${failText}`.slice(0, 1500);
      emailSubject = "🔴 SOCIII chat DOWN again";
      emailHtml = `<p><b>SOCIII chat failed again after appearing to recover.</b></p><pre>${failText}</pre>`;
    } else if (nowMs - recoveringStartMs >= RECOVERING_THRESHOLD_MS) {
      newState = "HEALTHY";
      const downMin = alertingDownSince ? Math.round((nowMs - alertingDownSince) / 60000) : null;
      alertReason = "recovering_to_healthy";
      smsText = `✅ SOCIII chat recovered${downMin ? ` — was down ${downMin} min` : ""}.`;
      smsIsRecovery = true;
      // Resolve Operating Feed alert
      await resolveOperatingFeedAlert(db, nowMs, alertingDownSince);
    }
    // else stays RECOVERING
  }

  // 4. Operating Feed — push/update RED alert whenever not HEALTHY (never suppressed).
  if (newState === "ALERTING" || newState === "SUSTAINED" || prevState === "ALERTING" || prevState === "SUSTAINED") {
    await pushOperatingFeedAlert(db, nowMs, failures.length ? failures : scenarios.filter(s => !s.pass));
  }

  // 5. SMS gate — lastSmsAt gate applies to ALL SMS except recovery.
  let alerted = null;
  if (smsText && !opts.noAlerts) {
    const canSms = smsIsRecovery || (nowMs - lastSmsAt >= SMS_COOLDOWN_MS);
    if (canSms) {
      alerted = await sendAlerts(db, recipients, smsText, emailSubject || "SOCIII canary", emailHtml || `<p>${smsText}</p>`);
    } else {
      console.log(`[chatCanary] SMS suppressed — lastSmsAt ${Math.round((nowMs - lastSmsAt) / 60000)}min ago (gate: 2h). State: ${newState}.`);
    }
  }

  // 6. RECORD — persist new state.
  const stateUpdate = {
    state: newState,
    healthy,
    lastCheckedMs: nowMs,
    lastChecked: admin.firestore.FieldValue.serverTimestamp(),
    scenarios,
    failureCount: failures.length,
    alertReason,
    ...(healthy ? { lastGreenMs: nowMs } : {}),
    ...(newState === "ALERTING" ? { alertingStartMs: newAlertingStartMs, alertingDownSince: newAlertingDownSince } : {}),
    ...(newState === "RECOVERING" ? { recoveringStartMs: newRecoveringStartMs } : {}),
    ...(newState === "HEALTHY" ? { alertingStartMs: 0, alertingDownSince: 0, recoveringStartMs: 0 } : {}),
    ...(alerted ? { lastSmsAtMs: nowMs } : {}),
    ...(!prevSnap.exists ? { alertRecipients: DEFAULT_RECIPIENTS } : {}),
  };
  await healthRef.set(stateUpdate, { merge: true });
  await db.collection("chatHealthEvents").add({
    state: newState, prevState, healthy, failureCount: failures.length,
    scenarios, alertReason,
    at: admin.firestore.FieldValue.serverTimestamp(), atMs: nowMs,
  });

  const summary = { state: newState, prevState, healthy, failureCount: failures.length, alertReason, scenarios };
  console.log("[chatCanary]", JSON.stringify(summary));
  return { ...summary, alerted };
}

module.exports = { runChatCanary, SCENARIOS };
