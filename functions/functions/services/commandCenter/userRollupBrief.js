"use strict";
/**
 * userRollupBrief.js — Command Center v2 (Sean's spec, 2026-05-13).
 *
 * One email per USER (not per workspace). The email rolls up across every
 * workspace the user is a member of, sectioned by workspace, with per-workspace
 * content selected by `tenants/{id}.mode`:
 *
 *   mode = "launch"      → launchAdapter (marketing pulse, worker traction,
 *                          sandbox, customer growth, Alex-noticed)
 *   mode = "operations"  → operationsAdapter (cash, AR/AP, compliance, team)
 *   mode = "dormant"     → skip this workspace entirely
 *   mode unset           → default to "operations"
 *
 * Hard rule: if every workspace section has no real signal, skip the email
 * altogether. Zeros DURING launch ARE the story; missing data is not.
 */

const admin = require("firebase-admin");

function db() { return admin.firestore(); }

const DAY_MS = 86400000;

// ─────────────────────────────────────────────────────────────
// Launch-mode adapter
// ─────────────────────────────────────────────────────────────

async function launchAdapter(tenantId) {
  const now = Date.now();
  const since24h = new Date(now - DAY_MS);
  const since7d = new Date(now - 7 * DAY_MS);

  const [
    tenantSnap,
    subsSnap,
    msgQueueSnap,
    marketingDraftsSnap,
    socialPostsSnap,
    digitalWorkersSnap,
    sandboxSessionsSnap,
    holdingsSnap,
    kycSnap,
    investorContactsSnap,
    messageEvents24hSnap,
    improvementOpenSnap,
    contactsSnap,
    accountsSnap,
  ] = await Promise.all([
    db().collection("tenants").doc(tenantId).get(),
    db().collection("subscriptions").where("tenantId", "==", tenantId).where("status", "==", "active").get().catch(() => ({ size: 0, docs: [] })),
    db().collection("messageQueue").where("tenantId", "==", tenantId).where("createdAt", ">=", since7d).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("marketingDrafts").where("tenantId", "==", tenantId).where("createdAt", ">=", since7d).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("socialPosts").where("tenantId", "==", tenantId).where("createdAt", ">=", since7d).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("digitalWorkers").limit(500).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("sandboxSessions").where("createdAt", ">=", since7d).get().catch(() => ({ size: 0, docs: [] })),
    // 50.27 — Investor Outreach inputs. holdings + kycRecords + contacts
    // segmented as investors. All best-effort — failures yield empty docs
    // and the launch card surfaces "—" without breaking the brief.
    db().collection("holdings").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("kycRecords").where("tenantId", "==", tenantId).where("createdAt", ">=", since7d).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("contacts").where("tenantId", "==", tenantId).where("segments", "array-contains", "titleapp_ai_investors").get().catch(() => ({ size: 0, docs: [] })),
    // 50.27 — Worker Health inputs. messageEvents are tenant-scoped so we
    // can compute per-workspace session traffic. improvementRequests don't
    // carry tenantId today so the open count is global — still meaningful
    // for the platform-owner workspace; defer scoping until the schema is
    // extended.
    db().collection("messageEvents").where("tenantId", "==", tenantId).where("createdAt", ">=", since24h).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("improvementRequests").where("status", "==", "open").get().catch(() => ({ size: 0, docs: [] })),
    // 50.27 — Setup Progress inputs: surface contacts and connected-accounts
    // counts on the launch-mode response too so the Setup Progress card can
    // render without a second roundtrip.
    db().collection("contacts").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("connectedAccounts").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0, docs: [] })),
  ]);
  const contactsCount = contactsSnap.size;
  const accountsCount = accountsSnap.docs.filter(d => d.data().status !== "deleted").length;

  // Marketing pulse — count 24h and 7d sends/drafts
  let sends24h = 0, sends7d = 0;
  for (const d of msgQueueSnap.docs) {
    const x = d.data();
    const at = x.sentAt?.toDate?.() || x.createdAt?.toDate?.();
    if (!at) continue;
    if (x.status === "sent" || x.status === "delivered") {
      if (at.getTime() > now - DAY_MS) sends24h++;
      sends7d++;
    }
  }
  const drafts7d = marketingDraftsSnap.size;
  const socialPosts7d = socialPostsSnap.size;

  // Customer growth — active paying tenants for THIS workspace's product (if applicable)
  // For TitleApp itself, this is platform-wide active subscriptions.
  let platformSubs = 0;
  try {
    const ps = await db().collection("subscriptions").where("status", "==", "active").get();
    platformSubs = ps.size;
  } catch (e) { /* best-effort */ }

  // Worker traction — global counters used as launch-product signal
  // 50.27 — also bucket by vertical so the Status by Category card has the
  // per-vertical breakdown the operator needs to prioritize.
  let totalWorkers = 0, liveWorkers = 0;
  const byVertical = {}; // vertical -> { total, live, waitlist, planned }
  for (const d of digitalWorkersSnap.docs) {
    const x = d.data();
    totalWorkers++;
    if (x.status === "live") liveWorkers++;
    const v = (x.vertical || x.industry || "uncategorized").toString().toLowerCase();
    if (!byVertical[v]) byVertical[v] = { total: 0, live: 0, waitlist: 0, planned: 0, draft: 0 };
    byVertical[v].total += 1;
    if (x.status === "live") byVertical[v].live += 1;
    else if (x.status === "waitlist") byVertical[v].waitlist += 1;
    else if (x.status === "planned") byVertical[v].planned += 1;
    else byVertical[v].draft += 1;
  }
  const statusByCategory = Object.entries(byVertical)
    .map(([vertical, c]) => ({ vertical, ...c, livePct: c.total > 0 ? Math.round((c.live / c.total) * 100) : 0 }))
    .sort((a, b) => b.live - a.live);

  // Sandbox health — sessions in the last 7 days, by status
  let sandbox7d = 0, sandboxShipped7d = 0, sandboxInProgress = 0;
  for (const d of sandboxSessionsSnap.docs) {
    const x = d.data();
    sandbox7d++;
    if (x.status === "worker_shipped" || x.status === "completed") sandboxShipped7d++;
    if (x.status === "worker_build_in_progress") sandboxInProgress++;
  }

  // 50.27 — Investor Outreach metrics.
  // Investors on cap table = distinct holders. Holdings docs carry holder
  // identity in one of (holderContactId | holderName | holderEmail).
  const holderKeys = new Set();
  let softCommitsUsd = 0;
  for (const d of holdingsSnap.docs) {
    const x = d.data();
    if (x.status === "deleted" || x.status === "void") continue;
    const key = x.holderContactId || x.holderEmail || x.holderName;
    if (key) holderKeys.add(String(key).toLowerCase());
    if (typeof x.softCommitUsd === "number") softCommitsUsd += x.softCommitUsd;
  }
  const investorsOnCapTable = holderKeys.size;
  const kycStarts7d = kycSnap.size;
  const investorContacts = investorContactsSnap.size;
  // Apollo outreach queue: a contact "queued" is in the investor segment but
  // has no engagement yet. Cheap proxy: investorContacts minus those marked
  // contacted. Doc-level engagement flag may not exist on all rows; treat
  // missing as queued.
  let apolloQueued = 0;
  for (const d of investorContactsSnap.docs) {
    const x = d.data();
    const hasEngagement = Array.isArray(x.engagement) ? x.engagement.length > 0 : !!x.last_contacted_at;
    if (!hasEngagement) apolloQueued++;
  }

  // 50.27 — Campaign Detail. The operator wants to see per-campaign AI activity,
  // not just total drafts. We map each marketingDraft to its lifecycle markers:
  // (1) AI issued creative (the draft itself); (2) AI sent to channel
  // (matching messageQueue row with same campaignId); (3) AI monitored response
  // (replies seen on the draft); (4) AI made a recommendation
  // (recommendationNotes field set).
  const campaigns = [];
  for (const d of marketingDraftsSnap.docs) {
    const x = d.data();
    campaigns.push({
      id: d.id,
      name: x.name || x.title || x.subject || `Draft ${d.id.slice(0, 6)}`,
      channel: x.channel || "email",
      status: x.status || "draft",
      createdAt: x.createdAt?.toMillis?.() || null,
      aiCreativeIssued: !!(x.body || x.copy || x.html || x.subject),
      sendsCount: typeof x.sendsCount === "number" ? x.sendsCount : null,
      repliesCount: typeof x.repliesCount === "number" ? x.repliesCount : null,
      aiMonitoring: !!x.monitoringEnabled || (Array.isArray(x.events) && x.events.length > 0),
      aiRecommendation: x.recommendationNotes || x.aiRecommendation || null,
      audienceCount: typeof x.audienceCount === "number" ? x.audienceCount : null,
    });
  }
  campaigns.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // 50.27 — Launch Milestones. Status pulled from the tenant document's
  // `launchMilestones` map (admin-editable). Default to pending so the UI
  // still shows the checklist even before any milestone is recorded.
  // Each milestone has a default owner (the "QB"). Admin can override via
  // tenants/{id}.launchMilestones.{id}.owner.
  const tenantData = tenantSnap.exists ? (tenantSnap.data() || {}) : {};
  const milestoneState = tenantData.launchMilestones || {};
  const launchMilestones = [
    { id: "books_reconciled",      target: "2026-06-01", label: "Books reconciled",                              defaultOwner: "Kent (CFO)" },
    { id: "tax_1065_filed",        target: "2026-06-15", label: "2024 + 2025 Form 1065s filed",                  defaultOwner: "Kent (CFO)" },
    { id: "ccorp_conversion_underway", target: "2026-06-01", label: "Delaware C-corp conversion underway",       defaultOwner: "Kent (CFO)" },
    { id: "hom_dao_snapshot_vote", target: "2026-06-01", label: "HOM DAO Snapshot vote scheduled",               defaultOwner: "Sean (founder)" },
    { id: "provisional_patents",   target: "2026-06-01", label: "Provisional patents filed",                     defaultOwner: "Sean (founder)" },
    { id: "reg_d_ppm_drafted",     target: "2026-06-01", label: "Reg D 506(c) PPM drafted",                      defaultOwner: "Kent (CFO) + counsel" },
    { id: "conversion_counsel",    target: "2026-07-01", label: "Outside conversion counsel engaged",            defaultOwner: "Kent (CFO)" },
    { id: "ccorp_conversion_done", target: "2026-07-01", label: "Conversion to C-corp complete",                 defaultOwner: "Kent (CFO)" },
    { id: "storyhouse_concluded",  target: "2026-07-01", label: "Storyhouse meeting concluded",                  defaultOwner: "Sean (founder)" },
    { id: "warm_conversations_10", target: "2026-07-01", label: "5–10 warm investor conversations completed",    defaultOwner: "Kent (CFO)" },
    { id: "soft_commits_250k",     target: "2026-08-01", label: "$250K of soft commitments documented",          defaultOwner: "Kent (CFO)" },
    { id: "first_wire",            target: "2026-09-01", label: "First wire received",                           defaultOwner: "Kent (CFO)" },
    { id: "raise_target_500k",     target: "2026-10-01", label: "$250K cleared + $500K soft-committed",          defaultOwner: "Sean + Kent" },
  ].map(m => ({
    ...m,
    owner: milestoneState[m.id]?.owner || m.defaultOwner,
    status: milestoneState[m.id]?.status || "pending", // pending | in_progress | done
    completedAt: milestoneState[m.id]?.completedAt || null,
    note: milestoneState[m.id]?.note || null,
  }));

  // 50.27 — Development Milestones. Same shape as launch milestones but
  // tracks product/build roadmap rather than fundraise. Editable per
  // tenant via tenants/{id}.developmentMilestones.{id}.status. Defaults
  // are a sane starter set for the TitleApp AI workspace; other workspaces
  // get an empty list (no opinion) until the admin authors them.
  const devMilestoneState = tenantData.developmentMilestones || {};
  const defaultDevMilestones = tenantId === "ws_1778652045795_vk4sz1" ? [
    { id: "week_may_18_sandbox",   target: "2026-05-18", label: "Sandbox polish — workflow + grading",        defaultOwner: "Sean" },
    { id: "week_may_18_control",   target: "2026-05-18", label: "Control Center v2 — accountability layer",   defaultOwner: "Sean" },
    { id: "week_may_25_re_av",     target: "2026-05-25", label: "Real Estate + Aviation worker polish",       defaultOwner: "Sean" },
    { id: "week_may_25_marketing", target: "2026-05-25", label: "Marketing worker — AI lifecycle wiring",     defaultOwner: "Sean" },
    { id: "week_jun_01_spine",     target: "2026-06-01", label: "Spine workers audit + bug bash",             defaultOwner: "Sean" },
    { id: "week_jun_08_demo_pol",  target: "2026-06-08", label: "Investor demo polish",                       defaultOwner: "Sean" },
    { id: "week_jun_15_ga_polish", target: "2026-06-15", label: "GA-quality polish on top 25 workers",        defaultOwner: "Sean" },
  ] : Object.keys(devMilestoneState).map(id => ({ id, target: null, label: id, defaultOwner: null }));

  const developmentMilestones = defaultDevMilestones.map(m => ({
    ...m,
    owner: devMilestoneState[m.id]?.owner || m.defaultOwner,
    status: devMilestoneState[m.id]?.status || "pending",
    completedAt: devMilestoneState[m.id]?.completedAt || null,
    note: devMilestoneState[m.id]?.note || null,
  }));

  // "Alex noticed" — template-based v1. Pick the first signal that fires.
  const noticed = [];
  if (sends24h === 0 && sends7d === 0 && drafts7d === 0) noticed.push("No marketing activity in 7 days. Launch is stalled — the campaign brief is in Drive.");
  if (sandboxInProgress >= 5 && sandboxShipped7d === 0) noticed.push(`${sandboxInProgress} sandbox sessions stuck in 'in progress' — none shipped this week. Worth a triage.`);
  if (platformSubs > 0 && totalWorkers > 0 && liveWorkers / totalWorkers < 0.5) noticed.push(`Only ${liveWorkers}/${totalWorkers} workers are live. Backfill catalog status before paid traffic lights up.`);
  if (apolloQueued >= 50 && sends7d === 0) noticed.push(`${apolloQueued} investor contacts queued but no outreach sends in 7 days. Light the cold-email worker.`);
  const alexNoticed = noticed[0] || null;

  // Signal check — does this workspace have any real launch signal worth reporting?
  const hasSignal = sends7d > 0 || drafts7d > 0 || socialPosts7d > 0 || sandbox7d > 0 || platformSubs > 0 || totalWorkers > 0 || investorsOnCapTable > 0;

  return {
    mode: "launch",
    hasSignal,
    marketingPulse: { sends24h, sends7d, drafts7d, socialPosts7d },
    workerTraction: { totalWorkers, liveWorkers },
    sandbox: { sessions7d: sandbox7d, shipped7d: sandboxShipped7d, inProgress: sandboxInProgress },
    customers: { activeSubs: platformSubs },
    investorOutreach: {
      investorsOnCapTable,
      kycStarts7d,
      investorContacts,
      apolloQueued,
      softCommitsUsd,
    },
    statusByCategory,
    campaigns,
    launchMilestones,
    developmentMilestones,
    setupState: {
      contactsCount,
      accountsCount,
      milestonesFlipped: launchMilestones.filter(m => m.status !== "pending").length,
      hasOpenAlexNoticed: !!alexNoticed,
    },
    alexNoticed,
    workspaceName: tenantSnap.exists ? (tenantSnap.data().name || tenantId) : tenantId,
  };
}

// ─────────────────────────────────────────────────────────────
// Operations-mode adapter — wraps existing spine summary
// ─────────────────────────────────────────────────────────────

async function operationsAdapter(tenantId) {
  const [contactsSnap, txSnap, accountsSnap, tenantSnap] = await Promise.all([
    db().collection("contacts").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("transactions").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("connectedAccounts").where("tenantId", "==", tenantId).get().catch(() => ({ size: 0, docs: [] })),
    db().collection("tenants").doc(tenantId).get(),
  ]);

  const contacts = contactsSnap.size;
  const transactions = txSnap.size;
  const accounts = accountsSnap.docs.filter(d => d.data().status !== "deleted").length;
  const cashOnHand = accountsSnap.docs.reduce((sum, d) => {
    const b = d.data().balance;
    return sum + (typeof b === "number" ? b : 0);
  }, 0);

  const hasSignal = contacts > 0 || transactions > 0 || accounts > 0;

  return {
    mode: "operations",
    hasSignal,
    contacts,
    transactions,
    accounts,
    cashOnHand,
    workspaceName: tenantSnap.exists ? (tenantSnap.data().name || tenantId) : tenantId,
  };
}

// ─────────────────────────────────────────────────────────────
// Roll-up: one email per user across all their workspaces
// ─────────────────────────────────────────────────────────────

async function gatherUserSections(userId) {
  // Memberships are the canonical source of workspace access for a user.
  const memb = await db().collection("memberships")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .get();

  const sections = [];
  for (const m of memb.docs) {
    const md = m.data();
    const tenantId = md.tenantId;
    if (!tenantId) continue;
    const tenantSnap = await db().collection("tenants").doc(tenantId).get();
    const mode = tenantSnap.exists ? (tenantSnap.data().mode || "operations") : "operations";

    // 50.27 — hidden workspaces still appear in `sections` so they show up
    // in the mode-controls panel (otherwise the user has no way to un-hide
    // them from the UI). They just don't get a launch/operations brief.
    if (mode === "dormant") {
      const t = tenantSnap.exists ? tenantSnap.data() : {};
      sections.push({
        tenantId,
        workspaceName: t.name || tenantId,
        mode: "dormant",
        hasSignal: false,
      });
      continue;
    }

    let section;
    if (mode === "launch") section = await launchAdapter(tenantId);
    else section = await operationsAdapter(tenantId);
    section.tenantId = tenantId;
    sections.push(section);
  }
  return sections;
}

function buildPlainText(userName, today, sections) {
  const live = sections.filter(s => s.hasSignal);
  if (live.length === 0) return null; // hard rule: no signal, no email

  const lines = [];
  lines.push(`TitleApp Command Center — ${today}`);
  lines.push("");
  lines.push(`Good morning${userName ? ", " + userName : ""}.`);
  lines.push("");

  // Top-line roll-up
  const alerts = live.flatMap(s => s.alexNoticed ? [`[${s.workspaceName}] ${s.alexNoticed}`] : []);
  if (alerts.length > 0) {
    lines.push(`ALEX NOTICED (${alerts.length}):`);
    alerts.forEach(a => lines.push(`  • ${a}`));
    lines.push("");
  }

  // Per-workspace sections
  for (const s of live) {
    lines.push(`▼ ${s.workspaceName}`);
    if (s.mode === "launch") {
      const mp = s.marketingPulse;
      lines.push(`  Marketing · ${mp.sends24h} sends in 24h, ${mp.sends7d} in 7d, ${mp.drafts7d} drafts queued, ${mp.socialPosts7d} social posts`);
      lines.push(`  Workers · ${s.workerTraction.liveWorkers}/${s.workerTraction.totalWorkers} live in catalog`);
      lines.push(`  Sandbox · ${s.sandbox.sessions7d} sessions in 7d (${s.sandbox.shipped7d} shipped, ${s.sandbox.inProgress} in progress)`);
      lines.push(`  Customers · ${s.customers.activeSubs} active paying subscriptions`);
    } else {
      lines.push(`  Contacts · ${s.contacts}`);
      lines.push(`  Transactions · ${s.transactions}`);
      lines.push(`  Connected accounts · ${s.accounts} (cash on hand: $${s.cashOnHand.toLocaleString()})`);
    }
    lines.push("");
  }

  lines.push("— Alex");
  return lines.join("\n");
}

function buildHtml(userName, today, sections) {
  const live = sections.filter(s => s.hasSignal);
  if (live.length === 0) return null;

  const sectionStyle = `style="padding:16px 24px;border-bottom:1px solid #e5e7eb"`;
  const headerStyle = `style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#6b7280;margin:0 0 8px 0;text-transform:uppercase"`;
  const titleStyle = `style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 12px 0"`;
  const rowStyle = `style="font-size:14px;line-height:1.8;margin:0;color:#334155"`;
  const labelStyle = `style="color:#64748b"`;
  const valueStyle = `style="color:#0f172a;font-weight:600"`;

  const alerts = live.flatMap(s => s.alexNoticed ? [{ ws: s.workspaceName, note: s.alexNoticed }] : []);
  const alertsHtml = alerts.length > 0
    ? `<div ${sectionStyle}>
        <p ${headerStyle}>Alex noticed (${alerts.length})</p>
        ${alerts.map(a => `<p ${rowStyle}><span ${labelStyle}>[${a.ws}]</span> ${a.note}</p>`).join("")}
      </div>`
    : "";

  const sectionsHtml = live.map(s => {
    if (s.mode === "launch") {
      const mp = s.marketingPulse;
      return `<div ${sectionStyle}>
        <p ${titleStyle}>${s.workspaceName} <span style="font-size:11px;font-weight:500;color:#7c3aed;background:#ede9fe;padding:2px 8px;border-radius:999px;margin-left:8px">LAUNCH</span></p>
        <p ${rowStyle}><span ${labelStyle}>Marketing pulse:</span> <span ${valueStyle}>${mp.sends24h}</span> sends 24h · <span ${valueStyle}>${mp.sends7d}</span> sends 7d · <span ${valueStyle}>${mp.drafts7d}</span> drafts · <span ${valueStyle}>${mp.socialPosts7d}</span> social posts</p>
        <p ${rowStyle}><span ${labelStyle}>Worker traction:</span> <span ${valueStyle}>${s.workerTraction.liveWorkers}</span> / ${s.workerTraction.totalWorkers} workers live</p>
        <p ${rowStyle}><span ${labelStyle}>Sandbox:</span> <span ${valueStyle}>${s.sandbox.sessions7d}</span> sessions 7d · ${s.sandbox.shipped7d} shipped · ${s.sandbox.inProgress} in progress</p>
        <p ${rowStyle}><span ${labelStyle}>Customers:</span> <span ${valueStyle}>${s.customers.activeSubs}</span> active subscriptions</p>
      </div>`;
    } else {
      return `<div ${sectionStyle}>
        <p ${titleStyle}>${s.workspaceName}</p>
        <p ${rowStyle}><span ${labelStyle}>Contacts:</span> <span ${valueStyle}>${s.contacts}</span></p>
        <p ${rowStyle}><span ${labelStyle}>Transactions:</span> <span ${valueStyle}>${s.transactions}</span></p>
        <p ${rowStyle}><span ${labelStyle}>Accounts:</span> <span ${valueStyle}>${s.accounts}</span> · cash: $${s.cashOnHand.toLocaleString()}</p>
      </div>`;
    }
  }).join("");

  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="padding:24px 24px 8px">
        <p style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#7c3aed;margin:0;text-transform:uppercase">Command Center</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#0f172a">${today}</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#475569">Good morning${userName ? ", " + userName : ""}.</p>
      </div>
      ${alertsHtml}
      ${sectionsHtml}
      <div style="padding:16px 24px;text-align:center;color:#94a3b8;font-size:12px">— Alex</div>
    </div>
  </body></html>`;
}

async function generateUserRollupBrief(userId, { dryRun = true } = {}) {
  const userSnap = await db().collection("users").doc(userId).get();
  if (!userSnap.exists) throw new Error("user not found");
  const userData = userSnap.data();
  const today = new Date().toISOString().slice(0, 10);

  const sections = await gatherUserSections(userId);
  const plainText = buildPlainText(userData.displayName || userData.name || "", today, sections);
  const html = buildHtml(userData.displayName || userData.name || "", today, sections);

  if (!plainText) {
    return { ok: true, skipped: true, reason: "no_signal", sections };
  }

  await db().collection("briefings").doc(userId).set({
    date: today,
    runType: "rollup_v2",
    sections,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  let emailed = false;
  if (!dryRun && process.env.SENDGRID_API_KEY && userData.email) {
    try {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: userData.email }] }],
          from: { email: "alex@titleapp.ai", name: "Alex — Command Center" },
          reply_to: { email: "alex@titleapp.ai", name: "Alex — Command Center" },
          subject: `Command Center — ${today}`,
          content: [
            { type: "text/plain", value: plainText },
            { type: "text/html", value: html },
          ],
        }),
      });
      emailed = true;
    } catch (e) {
      console.error("[commandCenter] email failed:", e.message);
    }
  }

  return { ok: true, sections, plainText, html, emailed, dryRun };
}

module.exports = { generateUserRollupBrief, launchAdapter, operationsAdapter };
