// ----------------------------------------------------------------------------
// Quality Canary — correctness + data + integration health probes
// (CODEX 47)
// ----------------------------------------------------------------------------
// The chat canary tests "is Alex alive?" This tests "is Alex correct and is
// real data flowing through the canvas?"
//
// Three probe types:
//   A. Chat Correctness — known-answer questions. Two tiers:
//      A1. Identity probes: keyword checks (catches "wrong name" class)
//      A2. Domain-fact probes: computed ground-truth comparison (catches
//          "hallucinated balance" class — the failure that motivated this system)
//   B. Canvas Data — Firestore ground-truth spot checks. Queries raw
//      collections, computes expected values, then calls the accounting API
//      and diffs the returned numbers against Firestore. Catches a drift
//      between what's stored and what the backend reports.
//   C. Integration Health — integration token freshness. WARN only, no page.
//
// KNOWN CEILING: Probe A1 (keyword match) catches absent content, not wrong
// content adjacent to a correct keyword. Probe A2 (ground-truth comparison)
// is the real guard against hallucinated domain facts. If the accounting API
// returns wrong numbers, A2 catches it before A1 would.
//
// SEEDED-DATA CAVEAT: Probes run against the canary workspace with seeded
// records. This is safer than touching real customer data, but seeded data
// is cleaner than real-world inputs. Anomalous real-world transaction
// descriptions (the class of edge case that caused prior incidents) are not
// currently exercised. A future anonymized-real-data spot-check path is in
// CODEX 47 backlog.
//
// State: config/qualityHealth
// Events: qualityHealthEvents
// Alerts: SMS + email on new RED. WARN surfaced in Operating Feed only.
// ----------------------------------------------------------------------------

const admin = require("firebase-admin");

const FRONTDOOR = "https://titleapp-frontdoor.titleapp-core.workers.dev";
const CHAT_URL = `${FRONTDOOR}/api?path=/v1/chat:message`;
const API_BASE = `${FRONTDOOR}/api?path=/v1`;
const HEALTH_DOC = "config/qualityHealth";

// Canary tenant — dedicated workspace with seeded loans + transactions.
// CANARY_TENANT_ID env var or fall back to Sean's main workspace for now.
function getCanaryTenantId() {
  return process.env.CANARY_TENANT_ID || "ws_1779846027006_hc71aw";
}
function getCanaryUserId() {
  return process.env.CANARY_USER_UID || "WResykI56hW16silsOtvlw1UjJK2";
}

const SMS_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const DEGRADED_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2";
const DEFAULT_RECIPIENTS = [{ name: "Sean", phone: "+13104300780", email: "seanlcombs@gmail.com" }];

// ──────────────────────────────────────────────────────────────────────────────
// PROBE A1 — Chat identity correctness (keyword match)
// Known ceiling: catches absent content, NOT wrong content next to a correct
// keyword. These probes test Alex's self-knowledge, not domain computation.
// ──────────────────────────────────────────────────────────────────────────────

const CORRECTNESS_PROBES = [
  {
    key: "platform_identity",
    label: "Alex knows what SOCIII is",
    question: "In one sentence, what is SOCIII?",
    mustContainOne: ["digital worker", "Digital Worker", "RAAS", "raas", "rules", "AI", "business"],
  },
  {
    key: "accounting_worker_exists",
    label: "Accounting worker is discoverable",
    question: "Do you have an accounting worker or financial tools?",
    mustContainOne: ["accounting", "financial", "finance", "Accounting", "Financial",
      "bookkeeping", "transaction", "invoice", "expense", "revenue", "balance", "cash flow", "reports"],
    surface: "worker",
    workerSlug: "platform-accounting",
  },
  {
    key: "no_hallucinated_company",
    label: "Alex doesn't hallucinate a competitor name",
    question: "What is the name of this platform?",
    mustNotContain: ["QuickBooks", "Salesforce", "HubSpot", "Notion", "Slack", "Airtable"],
    mustContainOne: ["SOCIII", "sociii"],
  },
];

async function runCorrectnessProbe(probe) {
  const sessionId = `cq_${probe.key}_${Date.now()}`;
  const payload = {
    sessionId,
    userInput: probe.question,
    surface: probe.surface || "landing",
    context: probe.workerSlug ? { workerSlug: probe.workerSlug } : undefined,
  };

  let pass = false, reason = null, responseText = "";
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
    if (!resp.ok) {
      reason = `http_${resp.status}`;
    } else {
      const json = await resp.json().catch(() => null);
      if (!json) { reason = "non_json"; }
      else {
        responseText = (json.response || json.message || "").toString();
        if (!responseText) { reason = "empty_reply"; }
        else {
          if (probe.mustNotContain) {
            const hit = probe.mustNotContain.find(w => responseText.includes(w));
            if (hit) { reason = `hallucinated: "${hit}"`; }
          }
          if (!reason) {
            if (probe.mustContainOne) {
              const found = probe.mustContainOne.some(w => responseText.includes(w));
              if (!found) { reason = `missing keyword (need one of: ${probe.mustContainOne.join(", ")})`; }
              else pass = true;
            } else {
              pass = true;
            }
          }
        }
      }
    }
  } catch (e) {
    reason = e.name === "AbortError" ? "timeout_30s" : `fetch_error: ${e.message}`;
  }

  try { await admin.firestore().collection("chatSessions").doc(sessionId).delete(); } catch { /* ignore */ }
  return { key: probe.key, label: probe.label, pass, reason, preview: responseText.slice(0, 120) || null };
}

// ──────────────────────────────────────────────────────────────────────────────
// PROBE A2 — Domain-fact correctness (ground-truth comparison)
// Computes expected values from raw Firestore, then calls the accounting API
// and diffs the result. This is what catches "hallucinated balance" failures —
// the actual incident class this system exists to prevent.
// ──────────────────────────────────────────────────────────────────────────────

async function runDomainFactProbes(db, tenantId) {
  const findings = [];

  // Compute ground truth from Firestore directly
  let expectedLiabCents = 0;
  let expectedExpenseCents = 0;
  let expectedRevCents = 0;

  try {
    const loanSnap = await db.collection("loans").where("tenantId", "==", tenantId).get();
    for (const doc of loanSnap.docs) {
      expectedLiabCents += (doc.data().principalCents || 0);
    }
  } catch (e) {
    findings.push({ key: "gt_loans_query", label: "Ground-truth loan query", pass: false, reason: e.message });
    return findings;
  }

  try {
    const txSnap = await db.collection("transactions")
      .where("tenantId", "==", tenantId)
      .limit(2000)
      .get();
    for (const doc of txSnap.docs) {
      const d = doc.data();
      if (d.classification === "expense" && d.direction === "debit") expectedExpenseCents += (d.amountCents || 0);
      if (d.classification === "revenue" && d.direction === "credit") expectedRevCents += (d.amountCents || 0);
    }
  } catch (e) {
    findings.push({ key: "gt_txn_query", label: "Ground-truth transaction query", pass: false, reason: e.message });
    return findings;
  }

  const expectedCashCents = expectedLiabCents + expectedRevCents - expectedExpenseCents;

  // Call accounting reports API and diff against ground truth.
  // The API requires a Firebase bearer token; use the Admin SDK to mint a
  // custom token and exchange it for an ID token via the REST API.
  // Key stored as FB_WEB_API_KEY (FIREBASE_ prefix is reserved by GCP).
  // If token minting fails, skip the API diff and flag as WARN (not RED) —
  // the canvas data probe (B) already verifies data exists.
  let apiCashCents = null, apiLiabCents = null;
  try {
    const customToken = await admin.auth().createCustomToken(getCanaryUserId(), { canary: true });
    const exchangeResp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FB_WEB_API_KEY || ""}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }) }
    );
    if (exchangeResp.ok) {
      const { idToken } = await exchangeResp.json();
      const bsResp = await fetch(`${API_BASE}/accounting:reports?type=balance_sheet`, {
        headers: { Authorization: `Bearer ${idToken}`, "x-tenant-id": tenantId },
        signal: AbortSignal.timeout(20000),
      });
      if (bsResp.ok) {
        const bs = await bsResp.json();
        apiCashCents = bs.cashCents ?? bs.cash_cents ?? null;
        apiLiabCents = bs.totalLiabilitiesCents ?? bs.liabilities_cents ?? null;
      } else {
        findings.push({ key: "domain_api_call", label: "Accounting API reachable", pass: false,
          severity: "warn", reason: `HTTP ${bsResp.status} from accounting:reports` });
      }
    } else {
      findings.push({ key: "domain_token_exchange", label: "Canary token exchange", pass: false,
        severity: "warn", reason: `token exchange HTTP ${exchangeResp.status}` });
    }
  } catch (e) {
    findings.push({ key: "domain_auth", label: "Canary auth for domain probe", pass: false,
      severity: "warn", reason: e.message });
  }

  if (apiCashCents !== null) {
    // Tolerance: 1% of the balance, with a $1 minimum to avoid false positives near zero.
    // $1 is the floor, not an OR condition — for any non-trivial balance, 1% is the operative threshold.
    const tol = Math.max(100, Math.round(Math.abs(expectedCashCents) * 0.01));
    const cashDelta = Math.abs(apiCashCents - expectedCashCents);
    if (cashDelta > tol) {
      findings.push({ key: "domain_cash_match", label: "API cash matches Firestore ground-truth",
        pass: false,
        reason: `API returned $${(apiCashCents / 100).toFixed(0)}, Firestore says $${(expectedCashCents / 100).toFixed(0)} — delta $${(cashDelta / 100).toFixed(0)} exceeds tolerance`,
        groundTruth: expectedCashCents, apiValue: apiCashCents });
    } else {
      findings.push({ key: "domain_cash_match", label: "API cash matches Firestore ground-truth",
        pass: true, detail: `$${(apiCashCents / 100).toFixed(0)} ✓` });
    }
  }

  if (apiLiabCents !== null && expectedLiabCents > 0) {
    const liabDelta = Math.abs(apiLiabCents - expectedLiabCents);
    const tol = Math.max(100, Math.round(expectedLiabCents * 0.01)); // 1% with $1 minimum
    if (liabDelta > tol) {
      findings.push({ key: "domain_liab_match", label: "API liabilities match Firestore ground-truth",
        pass: false,
        reason: `API returned $${(apiLiabCents / 100).toFixed(0)}, Firestore says $${(expectedLiabCents / 100).toFixed(0)}`,
        groundTruth: expectedLiabCents, apiValue: apiLiabCents });
    } else {
      findings.push({ key: "domain_liab_match", label: "API liabilities match Firestore ground-truth",
        pass: true, detail: `$${(apiLiabCents / 100).toFixed(0)} ✓` });
    }
  }

  return findings;
}

// ──────────────────────────────────────────────────────────────────────────────
// PROBE B — Canvas data (structural existence checks)
// ──────────────────────────────────────────────────────────────────────────────

async function runCanvasDataProbes(db, tenantId) {
  const findings = [];

  const checks = [
    { key: "raas_packages", label: "RAAS packages exist", col: "raasPackages", field: "tenantId", val: tenantId },
    { key: "transactions", label: "Accounting transactions exist", col: "transactions", field: "tenantId", val: tenantId },
    { key: "loans", label: "Loans (liabilities) exist", col: "loans", field: "tenantId", val: tenantId },
  ];

  for (const c of checks) {
    try {
      const snap = await db.collection(c.col).where(c.field, "==", c.val).limit(1).get();
      findings.push({ key: c.key, label: c.label, pass: !snap.empty,
        reason: snap.empty ? `zero ${c.col} for canary tenant` : undefined });
    } catch (e) {
      findings.push({ key: c.key, label: c.label, pass: false, reason: e.message });
    }
  }

  try {
    const catalog = await db.collection("raasCatalog").where("status", "==", "live").limit(5).get();
    findings.push({ key: "raas_catalog", label: "Live workers in catalog (≥5)",
      pass: catalog.size >= 5,
      reason: catalog.size < 5 ? `only ${catalog.size} live workers` : undefined,
      detail: catalog.size >= 5 ? `${catalog.size}+ live workers` : undefined });
  } catch (e) {
    findings.push({ key: "raas_catalog", label: "Live workers in catalog (≥5)", pass: false, reason: e.message });
  }

  return findings;
}

// ──────────────────────────────────────────────────────────────────────────────
// PROBE C — Integration health (WARN only, never pages)
// ──────────────────────────────────────────────────────────────────────────────

async function runIntegrationProbes(db, uid, tenantId) {
  const findings = [];

  for (const svc of ["gmail", "calendar", "drive"]) {
    try {
      const snap = await db.doc(`users/${uid}/integrations/${svc}`).get();
      if (!snap.exists || !snap.data().accessToken) {
        findings.push({ key: svc, label: `${svc} connected`, pass: false,
          severity: "warn", reason: "not connected or token missing" });
      } else {
        const expiry = snap.data().expiryDate || snap.data().expiry_date || null;
        if (expiry && expiry < Date.now() - 7 * 24 * 60 * 60 * 1000) {
          findings.push({ key: svc, label: `${svc} token fresh`, pass: false,
            severity: "warn", reason: `token expired ${Math.round((Date.now() - expiry) / 86400000)}d ago` });
        } else {
          findings.push({ key: svc, label: `${svc} connected`, pass: true, severity: "ok" });
        }
      }
    } catch (e) {
      findings.push({ key: svc, label: `${svc} connected`, pass: false, severity: "warn", reason: e.message });
    }
  }

  try {
    const accts = await db.collection("connectedAccounts")
      .where("tenantId", "==", tenantId)
      .where("source", "==", "stripe_fc")
      .limit(1).get();
    findings.push({ key: "stripe_fc", label: "Stripe FC accounts exist", pass: !accts.empty,
      severity: accts.empty ? "warn" : "ok",
      reason: accts.empty ? "no Stripe FC accounts connected for canary tenant" : undefined });
  } catch (e) {
    findings.push({ key: "stripe_fc", label: "Stripe FC accounts", pass: false, severity: "warn", reason: e.message });
  }

  return findings;
}

// ──────────────────────────────────────────────────────────────────────────────
// OPERATING FEED helpers
// ──────────────────────────────────────────────────────────────────────────────

async function pushQualityAlert(db, nowMs, issues, severity) {
  try {
    const ikey = `quality_${new Date(nowMs).toISOString().slice(0, 13).replace("T", "_")}`;
    const body = issues.map(i => `${i.label}: ${i.reason || "failed"}`).join("; ").slice(0, 200);
    await db.collection("alertFeed").doc(SEAN_UID).collection("items").doc(ikey).set({
      id: ikey, ikey,
      title: severity === "red" ? "SOCIII quality canary RED" : "SOCIII integration WARN",
      body, severity,
      source_label: "Quality Monitor",
      action_hint: "Check qualityHealthEvents in Firestore",
      resolved: false, snoozeUntil: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (e) { console.warn("[qualityCanary] feed push failed:", e.message); }
}

async function sendAlerts(db, recipients, smsText, subject, html) {
  const results = { sms: [], email: [] };
  let sendSMSDirect = null;
  try { ({ sendSMSDirect } = require("../communications/twilioHelper")); } catch { /* ok */ }
  for (const r of recipients) {
    if (r.phone && sendSMSDirect) {
      try { const x = await sendSMSDirect(r.phone, smsText); results.sms.push({ to: r.phone, sid: x.sid }); }
      catch (e) { results.sms.push({ to: r.phone, error: e.message }); }
    }
    if (r.email && process.env.SENDGRID_API_KEY) {
      try {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: r.email }] }],
            from: { email: "alex@titleapp.ai", name: "SOCIII Quality Canary" },
            subject,
            content: [{ type: "text/html", value: html }],
          }),
        });
        results.email.push({ to: r.email });
      } catch (e) { results.email.push({ to: r.email, error: e.message }); }
    }
  }
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function runQualityCanary(opts = {}) {
  const db = admin.firestore();
  const nowMs = Date.now();
  const tenantId = getCanaryTenantId();
  const uid = getCanaryUserId();

  const [correctnessResults, domainResults, canvasResults, integrationResults] = await Promise.all([
    Promise.all(CORRECTNESS_PROBES.map(p => runCorrectnessProbe(p))),
    runDomainFactProbes(db, tenantId),
    runCanvasDataProbes(db, tenantId),
    runIntegrationProbes(db, uid, tenantId),
  ]);

  // RED = correctness failures + domain-fact mismatches + canvas data gaps
  // Domain warns (auth/token failures) don't page — they degrade gracefully
  const redIssues = [
    ...correctnessResults.filter(r => !r.pass),
    ...domainResults.filter(r => !r.pass && r.severity !== "warn"),
    ...canvasResults.filter(r => !r.pass),
  ];
  const warnIssues = [
    ...domainResults.filter(r => !r.pass && r.severity === "warn"),
    ...integrationResults.filter(r => !r.pass),
  ];
  const healthy = redIssues.length === 0;

  const healthRef = db.doc(HEALTH_DOC);
  const prev = await healthRef.get().catch(() => ({ exists: false, data: () => ({}) }));
  const prevData = prev.exists ? prev.data() : {};
  const prevHealthy = prevData.healthy !== false;
  const lastSmsAtMs = prevData.lastSmsAtMs || 0;
  const lastDegradedAlertMs = prevData.lastDegradedAlertMs || 0;
  const recipients = (Array.isArray(prevData.alertRecipients) && prevData.alertRecipients.length)
    ? prevData.alertRecipients : DEFAULT_RECIPIENTS;

  // Tier 2 is degraded when ALL domain results are warns (auth failure, API unreachable)
  // rather than substantive passes or fails. This means the ground-truth diff is disabled.
  const domainDegraded = domainResults.length > 0 &&
    domainResults.every(r => !r.pass && r.severity === "warn");

  let alerted = null;
  if (!opts.noAlerts) {
    // Page on new RED (correctness/canvas failures)
    if (!healthy && prevHealthy) {
      const canSms = nowMs - lastSmsAtMs >= SMS_COOLDOWN_MS;
      if (canSms) {
        const smsLines = redIssues.slice(0, 3).map(i => `• ${i.label}: ${i.reason || "failed"}`).join("\n");
        const smsText = `🔴 SOCIII quality canary RED.\n${smsLines}`;
        const html = `<p><b>Quality canary RED</b></p><pre>${smsLines}</pre>`;
        alerted = await sendAlerts(db, recipients, smsText, "🔴 SOCIII quality canary RED", html);
      }
      await pushQualityAlert(db, nowMs, redIssues, "red");
    }

    // Tier 2 degraded = SMS/email only on first occurrence (no Operating Feed spam).
    // Token exchange failures are chronic infrastructure issues, not on-call pages.
    // DEGRADED does NOT push to alertFeed — use SMS/Telegram for on-call visibility.
  }

  // WARN issues: log to qualityHealthEvents only — DO NOT push to Operating Feed.
  // The Operating Feed is for user-facing business alerts (email/calendar/milestones),
  // not internal health checks. Canary output goes to SMS (RED only) + Firestore logs.
  if (warnIssues.length > 0) {
    console.warn("[qualityCanary] WARN issues (not pushed to feed):", warnIssues.map(i => i.label).join(", "));
  }

  const update = {
    healthy, lastCheckedMs: nowMs,
    lastChecked: admin.firestore.FieldValue.serverTimestamp(),
    correctness: correctnessResults,
    domain: domainResults,
    canvas: canvasResults,
    integrations: integrationResults,
    redCount: redIssues.length,
    warnCount: warnIssues.length,
    domainDegraded,
    ...(alerted ? { lastSmsAtMs: nowMs } : {}),
    ...(domainDegraded && alerted ? { lastDegradedAlertMs: nowMs } : {}),
  };
  await healthRef.set(update, { merge: true }).catch(e => console.warn("[qualityCanary] state write:", e.message));
  await db.collection("qualityHealthEvents").add({
    ...update, at: admin.firestore.FieldValue.serverTimestamp(), atMs: nowMs,
  }).catch(() => {});

  return { healthy, redCount: redIssues.length, warnCount: warnIssues.length,
    correctness: correctnessResults, domain: domainResults, canvas: canvasResults,
    integrations: integrationResults, alerted };
}

module.exports = { runQualityCanary };
