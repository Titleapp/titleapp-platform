"use strict";

/**
 * spineState.js (49.32 — 5.2 cross-worker attribution)
 *
 * Builds a compact "sibling worker state" snapshot that gets injected into
 * every worker's system prompt. With this, the model can cite real numbers
 * from sibling Spine workers ("Your Accounting worker shows revenue of
 * $47,500 MTD") instead of hallucinating, refusing, or telling the user to
 * switch workers.
 *
 * Source priority:
 *   1. Live aggregates from briefings/{uid} (populated by the daily digest
 *      cron) when the user has real data.
 *   2. Demo defaults (mirroring apps/business/src/components/canvas/sampleData.js)
 *      when in demo mode or when briefings is empty.
 *
 * The snapshot is short — 5 workers × ~4 KPIs each — so prompt cost stays
 * bounded.
 */

// Mirror of apps/business/src/components/canvas/sampleData.js WORKER_SAMPLES.
// Keep these in sync if the frontend numbers change.
const DEMO_WORKER_SAMPLES = {
  "platform-accounting": {
    label: "Accounting",
    kpis: {
      "Revenue (MTD)": "$47,500",
      "Expenses (MTD)": "$31,200",
      "Net Income (MTD)": "$16,300",
      "Cash Flow (MTD)": "$22,400",
    },
  },
  "platform-marketing": {
    label: "Marketing & Content",
    kpis: {
      "Active Leads": 87,
      "Email Open Rate": "38%",
      "Social Reach (30d)": "12,400",
      "Campaign ROI": "142%",
    },
  },
  "platform-hr": {
    label: "HR & People",
    kpis: {
      "Team Size": 14,
      "Open Positions": 2,
      "Reviews Due (30d)": 5,
      "Compliance Score": "92%",
    },
  },
  "platform-contacts": {
    label: "Contacts",
    kpis: {
      "Total Contacts": 312,
      "Active Clients": 24,
      "Followups Due": 9,
      "New This Month": 18,
    },
  },
};

/**
 * Build a live snapshot from a tenant's actual Firestore state. Reads coaAccounts,
 * transactions, contacts, connectedAccounts, marketingDrafts, socialPosts,
 * emailCampaigns, employees — the same data the section UIs show.
 * Returns null when there's no tenant context. This is the path used by Business
 * workspaces; Personal Vault falls through to the briefings path below.
 */
async function buildTenantLiveSnapshot(db, tenantId, uid) {
  if (!tenantId || tenantId === "vault") return null;

  // Window for "recent" activity — last 30 days. Used for sends-30d,
  // drafts-7d, etc. Keep the window short so the snapshot reflects what's
  // happening NOW, not historical state.
  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

  // Defensive — every query has its own catch so one missing collection or
  // missing index doesn't kill the whole snapshot. The empty fallback is an
  // empty `docs` array so .map() / .filter() still work downstream.
  const empty = { docs: [] };
  const safe = (p) => p.catch(err => { console.warn("[spineState] query failed:", err.message); return empty; });

  try {
    const [
      coaSnap, txSnap, connSnap,
      contactsSnap,
      draftsSnap, socialSnap, msgQSnap, campaignsSnap, listsSnap,
      employeesSnap, staffCredsSnap,
      tenantSnap, subsSnap,
      emailProposalsSnap, emailSendsSnap,
    ] = await Promise.all([
      safe(db.collection("coaAccounts").where("tenantId", "==", tenantId).get()),
      safe(db.collection("transactions").where("tenantId", "==", tenantId).limit(2000).get()),
      safe(db.collection("connectedAccounts").where("tenantId", "==", tenantId).get()),

      safe(db.collection("contacts").where("tenantId", "==", tenantId).limit(2000).get()),

      safe(db.collection("marketingDrafts").where("tenantId", "==", tenantId).limit(500).get()),
      safe(db.collection("socialPosts").where("tenantId", "==", tenantId).limit(500).get()),
      safe(db.collection("messageQueue").where("tenantId", "==", tenantId).limit(500).get()),
      // Campaigns: the Marketing canvas (and demo seed) write the tenant-scoped
      // `campaigns` collection — chat must read the SAME source so it never says
      // "no campaigns" while the canvas shows six (Sean, 2026-06-25).
      safe(db.collection("campaigns").where("tenantId", "==", tenantId).limit(500).get()),
      uid ? safe(db.collection("emailLists").where("userId", "==", uid).limit(200).get()) : Promise.resolve(empty),

      safe(db.collection("employees").where("tenantId", "==", tenantId).limit(500).get()),
      // staff_credentials is the canonical roster the HR + Credentials canvases
      // read. The legacy `employees` collection is empty for real tenants, so the
      // chat used to claim "zero employees" while the canvas showed five.
      safe(db.collection("staff_credentials").where("tenantId", "==", tenantId).limit(500).get()),

      safe(db.collection("tenants").doc(tenantId).get()),
      safe(db.collection("subscriptions").where("tenantId", "==", tenantId).where("status", "==", "active").get()),

      // Investor email outreach — owner-scoped, NOT tenant-scoped. Without these,
      // Alex reports "no campaigns" while 3 batches of 25 emails have been sent.
      uid ? safe(db.collection("emailCampaignProposals").where("ownerUid", "==", uid).limit(50).get()) : Promise.resolve(empty),
      uid ? safe(db.collection("emailCampaignSends").where("ownerUid", "==", uid).limit(500).get()) : Promise.resolve(empty),
    ]);

    const live = {};

    // ── Accounting ──
    const coa = coaSnap.docs.map(d => d.data()).filter(a => a.status !== "archived");
    const txs = txSnap.docs.map(d => d.data());
    const conns = connSnap.docs.map(d => d.data()).filter(a => a.status !== "deleted");
    const mtdTxs = txs.filter(t => t.date && t.date >= monthStart);
    // Use classification, not direction, to avoid counting loan inflows as revenue.
    const revenueMtd  = mtdTxs.filter(t => t.classification === "revenue").reduce((s, t) => s + (t.amountCents || 0), 0) / 100;
    const expensesMtd = mtdTxs.filter(t => t.direction === "debit" && (t.classification === "expense" || !t.classification)).reduce((s, t) => s + (t.amountCents || 0), 0) / 100;
    // Forward expense projection from CoA monthly caps — gives the chat
    // enough context to answer "estimate next month's burn" without needing
    // to walk every transaction. Categories with no cap fall through.
    const expenseCaps = coa
      .filter(a => (a.type || "").toLowerCase() === "expense" && Number.isFinite(Number(a.monthlyCapCents)))
      .map(a => ({ name: a.name, monthlyCap: Number(a.monthlyCapCents) / 100 }));
    const projectedMonthlyExpense = expenseCaps.reduce((s, c) => s + c.monthlyCap, 0);
    const topCaps = expenseCaps
      .sort((a, b) => b.monthlyCap - a.monthlyCap)
      .slice(0, 8)
      .map(c => `${c.name} $${c.monthlyCap.toLocaleString()}`)
      .join(", ");
    // 51.1 Phase 2i — surface recent transactions so chat can answer specific
    // questions ("did I pay X?", "what was the largest expense in May?") without
    // hallucinating. Capped at 40 to keep prompt cost bounded.
    const recentTxs = [...txs]
      .filter(t => t.date)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 40)
      .map(t => {
        const amt = `$${((t.amountCents || 0) / 100).toLocaleString()}`;
        const desc = (t.description || "").slice(0, 60);
        const cat = t.classification?.category || t.categoryHint || "uncategorized";
        return `${t.date} | ${t.direction === "debit" ? "−" : "+"}${amt} | ${cat} | ${desc}`;
      });
    // Shopify revenue (non-blocking — skip if disconnected or API times out)
    let shopifyKpi = null;
    if (uid) {
      try {
        const shopifyIntSnap = await db.doc(`users/${uid}/integrations/shopify`).get().catch(() => null);
        if (shopifyIntSnap && shopifyIntSnap.exists && shopifyIntSnap.data().accessToken) {
          const shopify = require("../shopify/shopify");
          const revData = await Promise.race([
            shopify.getRevenueSummary(uid, { days: 30 }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
          ]);
          if (revData && revData.total_revenue != null) {
            shopifyKpi = `$${Number(revData.total_revenue).toFixed(2)} (${revData.order_count || 0} orders, 30d)`;
          }
        }
      } catch (shopifyErr) {
        console.warn("[spineState] Shopify revenue fetch skipped:", shopifyErr.message);
      }
    }

    live["platform-accounting"] = {
      label: "Accounting",
      kpis: {
        "CoA categories":      coa.length || 0,
        "Connected accounts":  conns.length || 0,
        "Transactions on file": txs.length || 0,
        "Revenue (MTD)":  txs.length ? `$${revenueMtd.toLocaleString()}` : "no data yet",
        "Expenses (MTD)": txs.length ? `$${expensesMtd.toLocaleString()}` : "no data yet",
        "Net (MTD)":      txs.length ? `$${(revenueMtd - expensesMtd).toLocaleString()}` : "no data yet",
        "Projected monthly expense (from CoA caps)": expenseCaps.length ? `$${projectedMonthlyExpense.toLocaleString()}` : "no caps set",
        "Top expense caps": topCaps || "none",
        ...(shopifyKpi ? { "Shopify Revenue (30d)": shopifyKpi } : {}),
        "Invoices (AR)": "none on file — invoice module not yet populated",
        "Bills (AP)": "none on file — bills module not yet populated",
      },
      recentTransactions: recentTxs,
    };

    // ── Contacts ──
    // Fall back to ownerUid if tenantId returned nothing (contacts may live in a
    // different workspace — cross-workspace COS access, codex 19 Phase 1.5 bridge).
    let _contactDocs = contactsSnap.docs;
    if (_contactDocs.length === 0 && uid) {
      const _fallbackContacts = await safe(db.collection("contacts").where("ownerUid", "==", uid).limit(2000).get());
      _contactDocs = _fallbackContacts.docs;
    }
    const contacts = _contactDocs.map(d => d.data());
    if (contacts.length > 0) {
      const customers = contacts.filter(c => (c.lifecycleStage || "").toLowerCase() === "customer").length;
      const newThisMonth = contacts.filter(c => {
        const ms = c.createdAt?._seconds ? c.createdAt._seconds * 1000 : c.createdAt?.toMillis?.();
        return ms && ms >= new Date(monthStart).getTime();
      }).length;

      // Aggregate tags across all contacts (spine_v2: personas[].tags[], legacy: tags[])
      const tagCounts = {};
      for (const c of contacts) {
        const allTags = [];
        if (Array.isArray(c.tags)) allTags.push(...c.tags);
        if (Array.isArray(c.personas)) {
          for (const p of c.personas) {
            if (Array.isArray(p.tags)) allTags.push(...p.tags);
          }
        }
        for (const t of allTags) {
          if (t) tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
      const tagSummary = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => `${tag} (${count})`)
        .join(", ");

      live["platform-contacts"] = {
        label: "Contacts",
        kpis: {
          "Total Contacts": contacts.length,
          "Customers":      customers || 0,
          "New This Month": newThisMonth || 0,
          ...(tagSummary ? { "Tags": tagSummary } : {}),
          ...(!tagSummary ? { "Tags": "none yet" } : {}),
        },
      };
    } else {
      live["platform-contacts"] = {
        label: "Contacts",
        kpis: { "Total Contacts": 0, "Note": "no contacts imported yet" },
      };
    }

    // ── Marketing ──
    const drafts = draftsSnap.docs.map(d => d.data());
    const drafts7d = drafts.filter(d => {
      const ms = d.createdAt?._seconds ? d.createdAt._seconds * 1000 : d.createdAt?.toMillis?.();
      return ms && ms >= since7d.getTime();
    }).length;
    const socialPosts = socialSnap.docs.map(d => d.data());
    const social7d = socialPosts.filter(p => {
      const ms = p.createdAt?._seconds ? p.createdAt._seconds * 1000 : p.createdAt?.toMillis?.();
      return ms && ms >= since7d.getTime();
    }).length;
    const campaigns = campaignsSnap.docs.map(d => d.data());
    const sent30d = campaigns.filter(c => {
      const ms = c.createdAt?._seconds ? c.createdAt._seconds * 1000 : c.createdAt?.toMillis?.();
      return ms && ms >= since30d.getTime() && c.status === "sent";
    }).length;
    const queued = msgQSnap.docs.map(d => d.data()).filter(m => m.status === "pending").length;
    const lists = listsSnap.docs.length;

    // Investor outreach — emailCampaignProposals/Sends are owner-scoped (ownerUid),
    // not tenant-scoped, so they weren't in `campaigns`. Without this, Alex would
    // report "no campaigns" while batches had already been sent (Sean, 2026-07-03).
    const emailProposals = emailProposalsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
    const emailSends = emailSendsSnap.docs.map(d => d.data());
    const sentBatches = emailProposals.filter(p => p.status === "sent" || p.status === "completed").length;
    const sentIndividual = emailSends.length;
    const pendingBatches = emailProposals.filter(p => p.status === "proposed" || p.status === "sending").length;
    const topEmailBatches = emailProposals.slice(0, 5).map(p =>
      `[id:${p.id}] ${p.segment || "All"} → ${p.contactCount || "?"} contacts · ${p.status === "sent" ? "✓ sent" : p.status === "sending" ? "sending" : "pending"}`
      + (p.subject ? ` · subj: ${p.subject.slice(0, 40)}` : ""));

    const hasAnyMarketing = drafts.length || socialPosts.length || campaigns.length || queued || lists || emailProposals.length;
    const topCampaigns = campaigns
      .slice(0, 6)
      .map(c => `${c.name || c.title || "Campaign"}${c.channel ? ` (${c.channel})` : ""}${c.ctr != null ? ` · ${c.ctr}% CTR` : ""}${c.leads != null ? ` · ${c.leads} leads` : ""}`);
    live["platform-marketing"] = {
      label: "Marketing & Content",
      kpis: hasAnyMarketing ? {
        "Active campaigns":     campaigns.length,
        "Drafts (last 7d)":     drafts7d,
        "Social posts (7d)":    social7d,
        "Email campaigns sent (30d)": sent30d,
        "Contact lists":        lists,
        "Queued messages":      queued,
        ...(emailProposals.length ? {
          "Investor email batches": emailProposals.length,
          "Batches sent":           sentBatches,
          "Individual sends":       sentIndividual,
          "Batches pending":        pendingBatches || 0,
        } : {}),
      } : { "Note": "no campaigns, drafts, or contact lists yet" },
      ...(topCampaigns.length ? { campaigns: topCampaigns } : {}),
      ...(topEmailBatches.length ? { investorBatches: topEmailBatches } : {}),
    };

    // ── HR & People ── prefer the canonical staff_credentials roster (the same
    // source the HR + Credentials canvases use); fall back to legacy employees.
    const employees = employeesSnap.docs.map(d => d.data());
    const staffCreds = staffCredsSnap.docs.map(d => d.data());
    if (staffCreds.length > 0) {
      const overdue = staffCreds.reduce((n, s) => n + ((s.credentials || []).filter(c => c.status === "overdue").length), 0);
      const expiringSoon = staffCreds.reduce((n, s) => n + ((s.credentials || []).filter(c => c.status === "expiring_soon").length), 0);
      const roster = staffCreds.slice(0, 12).map(s => `${s.full_name || s.staff_id}${s.role ? ` — ${s.role}` : ""}`);
      live["platform-hr"] = {
        label: "HR & People",
        kpis: {
          "Clinical staff":          staffCreds.length,
          "Credentials overdue":     overdue,
          "Credentials expiring soon": expiringSoon,
        },
        roster,
      };
    } else if (employees.length > 0) {
      const active = employees.filter(e => (e.status || "active") === "active").length;
      const openings = employees.filter(e => (e.role || "").toLowerCase().includes("open")).length;
      live["platform-hr"] = {
        label: "HR & People",
        kpis: {
          "Team size":         active,
          "Open positions":    openings || 0,
          "Total on roster":   employees.length,
        },
      };
    } else {
      live["platform-hr"] = {
        label: "HR & People",
        kpis: { "Team size": 0, "Note": "no employees on file yet" },
      };
    }

    return Object.keys(live).length ? live : null;
  } catch (err) {
    console.warn("[spineState] tenant live snapshot failed:", err.message);
    return null;
  }
}

/**
 * Build the live snapshot from briefings/{uid}.
 * Returns null if briefings doesn't exist or is too sparse to be useful.
 */
async function buildLiveSnapshot(db, uid) {
  if (!uid) return null;
  try {
    const snap = await db.collection("briefings").doc(uid).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    const spine = data.spine || data.spineSummary || null;
    if (!spine || typeof spine !== "object") return null;

    const live = {};
    if (spine.transactions) {
      live["platform-accounting"] = {
        label: "Accounting",
        kpis: {
          "Revenue (MTD)": spine.transactions.revenueMtd != null ? `$${Number(spine.transactions.revenueMtd).toLocaleString()}` : null,
          "Expenses (MTD)": spine.transactions.expensesMtd != null ? `$${Number(spine.transactions.expensesMtd).toLocaleString()}` : null,
          "Net Income (MTD)": spine.transactions.netIncomeMtd != null ? `$${Number(spine.transactions.netIncomeMtd).toLocaleString()}` : null,
        },
      };
    }
    if (spine.marketing) {
      live["platform-marketing"] = {
        label: "Marketing & Content",
        kpis: {
          "Active Drafts": spine.marketing.draftsCount,
          "Scheduled Sends": spine.marketing.scheduledCount,
          "Sent (30d)": spine.marketing.sent30d,
        },
      };
    }
    if (spine.contacts) {
      live["platform-contacts"] = {
        label: "Contacts",
        kpis: {
          "Total Contacts": spine.contacts.total,
          "Followups Due": spine.contacts.followupsDue,
          "New This Month": spine.contacts.newThisMonth,
        },
      };
    }
    if (spine.employees) {
      live["platform-hr"] = {
        label: "HR & People",
        kpis: {
          "Team Size": spine.employees.total,
          "Open Positions": spine.employees.openPositions,
          "Reviews Due (30d)": spine.employees.reviewsDue,
        },
      };
    }
    // If we only have stubs, fall back to demo so the prompt has something concrete.
    const totalKpis = Object.values(live).reduce((sum, w) => sum + Object.values(w.kpis || {}).filter(v => v != null).length, 0);
    if (totalKpis < 3) return null;
    return live;
  } catch (err) {
    console.warn("[spineState] live snapshot failed:", err.message);
    return null;
  }
}

/**
 * Render a snapshot map into a prompt-ready text block.
 */
function renderSnapshot(snapshot, currentSlug) {
  const lines = [];
  for (const [slug, w] of Object.entries(snapshot)) {
    if (slug === currentSlug) continue; // Don't tell a worker about itself.
    const kpiPairs = Object.entries(w.kpis || {})
      .filter(([_, v]) => v != null && v !== "")
      .map(([k, v]) => `${k}: ${v}`);
    if (kpiPairs.length === 0) continue;
    lines.push(`- ${w.label}: ${kpiPairs.join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * 51.1 Phase 2i — Build "YOUR OWN LIVE DATA" block for the active worker.
 * Sibling state excludes the current slug, which means the Accounting worker
 * never sees its own transactions/CoA in chat context. This function returns
 * the active worker's own snapshot (KPIs + recentTransactions when available)
 * so the chat can answer detail questions ground-truthed against real data.
 */
function renderOwnState(snapshot, currentSlug) {
  if (!snapshot || !snapshot[currentSlug]) return "";
  const w = snapshot[currentSlug];
  const lines = [`YOUR OWN LIVE DATA (${w.label}):`];
  const kpiPairs = Object.entries(w.kpis || {})
    .filter(([_, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${v}`);
  if (kpiPairs.length) lines.push(kpiPairs.map(p => `- ${p}`).join("\n"));
  if (Array.isArray(w.recentTransactions) && w.recentTransactions.length) {
    lines.push(`\nRECENT TRANSACTIONS (most recent 40, date | direction+amount | category | description):`);
    lines.push(w.recentTransactions.join("\n"));
  }
  return lines.join("\n") + "\n";
}

const AVIATION_SLUGS = new Set(["av-copilot-001", "av-mx-001", "av-dispatch-001", "av-pc12-ng", "av-dispatch-board", "av-digital-logbook"]);

/**
 * Real aviation sibling-worker snapshot — CoPilot's currency/duty, MX's
 * per-tail airworthiness, Dispatch's most recent trip request.
 *
 * Replaces AVIATION_DEMO_SAMPLES, a hardcoded object (Alex Rivera ATP,
 * N704AA airworthy, a $7,627.70 trip) that was injected as "current readings
 * from the sibling aviation worker" into EVERY session for EVERY user,
 * regardless of demoMode — the exact "cross-worker synthesis" that looked
 * like a real data join but was static text (flagged 2026-08). Reads the
 * same real per-user collections the CoPilot/MX/Dispatch chat injections in
 * index.js now read, so the sibling-state block and the worker's own answer
 * can never contradict each other.
 */
async function buildAviationLiveSnapshot(db, uid, tenantId) {
  if (!uid) return null;
  try {
    // Logbook/duty are per-pilot (this pilot's own record); fleet/dispatch are
    // shared across a charter operator's tenant when one is present — same
    // scopeId resolution as services/mx/aircraftRecords.js and
    // services/dispatch/tripRequests.js.
    const fleetScopeId = tenantId || uid;
    const [entriesSnap, gtSnap, dutySnap, fleetSnap, tripSnap] = await Promise.all([
      db.collection("logbooks").doc(uid).collection("entries").get(),
      db.collection("logbooks").doc(uid).collection("groundTraining").get(),
      db.collection("dutyPeriods").doc(uid).collection("periods").orderBy("dutyStartZulu", "desc").limit(50).get(),
      db.collection("aircraftRecords").doc(fleetScopeId).collection("aircraft").get(),
      db.collection("dispatchTripRequests").doc(fleetScopeId).collection("requests").orderBy("createdAt", "desc").limit(1).get(),
    ]);

    const live = {};

    // CoPilot — currency + duty
    const entries = entriesSnap.docs.map(d => d.data());
    if (entries.length) {
      const groundTraining = gtSnap.docs.map(d => d.data());
      const dutyPeriods = dutySnap.docs.map(d => d.data());
      const activeDuty = dutyPeriods.find(p => !p.dutyEndZulu) || null;
      const { computeCurrency } = require("../copilot/logic/currencyTracker");
      const { computeDutyStatus } = require("../copilot/logic/dutyTimeTracker");
      const currency = computeCurrency({}, entries, groundTraining);
      const dutyStatus = computeDutyStatus(dutyPeriods, entries, activeDuty);
      const currencyItems = Array.isArray(currency) ? currency : [];
      const kpis = {};
      for (const item of currencyItems.slice(0, 4)) kpis[item.label || item.id] = item.status;
      kpis["On duty"] = dutyStatus?.currentDuty?.onDuty ? "YES" : "NO";
      if (dutyStatus?.alerts?.length) kpis["Duty alerts"] = `${dutyStatus.alerts.length} active`;
      live["av-copilot-001"] = { label: "CoPilot", kpis };
    }

    // MX — per-tail airworthiness
    if (!fleetSnap.empty) {
      const { computeAirworthiness } = require("../mx/airworthinessTracker");
      const fleet = await Promise.all(fleetSnap.docs.map(async (d) => {
        const squawksSnap = await d.ref.collection("squawks").get();
        const squawks = squawksSnap.docs.map(s => ({ id: s.id, ...s.data() }));
        return computeAirworthiness(d.data(), squawks);
      }));
      const kpis = {};
      for (const a of fleet.slice(0, 4)) kpis[`${a.tailNumber} status`] = a.status;
      live["av-mx-001"] = { label: "Aircraft Record", kpis };
    }

    // Dispatch — most recent trip request
    if (!tripSnap.empty) {
      const trip = tripSnap.docs[0].data();
      live["av-dispatch-001"] = {
        label: "Trip Release",
        kpis: {
          "Last trip request": `${trip.departure || "?"} → ${trip.destination || "?"}`,
          "Status": trip.status,
          "Client": trip.client,
        },
      };
    }

    if (!Object.keys(live).length) return null;
    return live;
  } catch (err) {
    console.warn("[spineState] aviation live snapshot failed:", err.message);
    return null;
  }
}

/**
 * Build the SIBLING WORKER STATE prompt block. Returns "" if no usable state.
 *
 * @param {Object} args
 * @param {object} args.db - Firestore admin db
 * @param {string|null} args.uid - authenticated user id
 * @param {string} args.currentSlug - the active worker (excluded from the snapshot)
 * @param {boolean} args.demoMode - whether canvas demo mode is on
 */
async function buildSiblingStatePrompt({ db, uid, currentSlug, demoMode, tenantId }) {
  // Aviation workers get their own cross-worker sibling set (CoPilot ↔ MX ↔ Dispatch).
  // They do not receive spine worker (accounting/marketing/HR/contacts) sibling state,
  // and spine workers do not receive aviation state — the domains don't overlap.
  if (AVIATION_SLUGS.has(currentSlug)) {
    const aviationSnapshot = await buildAviationLiveSnapshot(db, uid, tenantId);
    if (!aviationSnapshot) {
      return `SIBLING WORKER STATE: empty — no cross-worker aviation data on file yet (no logbook entries, aircraft records, or trip requests for this pilot).
Do not quote numbers for CoPilot, MX, or Dispatch. If the user asks about a sibling worker's status, say you don't have a current reading and ask what they want to look at first.

`;
    }
    const body = renderSnapshot(aviationSnapshot, currentSlug);
    if (!body) return "";
    return `SIBLING WORKER STATE (LIVE — aviation suite, computed just now from real Firestore records):
${body}

Cross-worker attribution rules:
- Cite the source worker by name when referencing these numbers (e.g. "Your Aircraft Record shows N704AA is airworthy").
- Do NOT invent figures not in the snapshot. If a specific detail is missing, say "Let me check with the [Worker] — they own that one."
- Treat these as current readings from the sibling aviation worker.

`;
  }

  let snapshot = null;
  let label = "DEMO";
  if (!demoMode) {
    // Prefer tenant-scoped live read when we're in a real workspace; fall back
    // to the per-user briefings doc for Personal Vault. NEVER fall back to demo
    // when demoMode is off — that's how phantom numbers leaked into chat.
    snapshot = await buildTenantLiveSnapshot(db, tenantId, uid);
    if (!snapshot) snapshot = await buildLiveSnapshot(db, uid);
    if (snapshot) label = "LIVE";
  }
  if (!snapshot && demoMode) snapshot = DEMO_WORKER_SAMPLES;
  if (!snapshot) {
    // No tenant data yet, no briefings, not in demo mode — say so plainly.
    // The worker should ask the user instead of inventing numbers.
    return `SIBLING WORKER STATE: empty — no cross-worker data on file for this workspace yet.
Do not quote numbers for sibling workers. If the user asks about Accounting, Marketing, HR, or Contacts metrics, say you don't have a current reading and ask them what they want to look at first.

`;
  }

  const body = renderSnapshot(snapshot, currentSlug);
  const ownState = renderOwnState(snapshot, currentSlug);
  if (!body && !ownState) return "";

  const ownBlock = ownState ? `${ownState}\n` : "";
  const siblingBlock = body
    ? `SIBLING WORKER STATE (${label} — refresh on next session):
${body}

Cross-worker attribution rules:
- When the user asks about a metric or status above, cite it WITH the source worker name (e.g. "Your Accounting worker shows revenue of $47,500 this month").
- Do NOT invent numbers that are not in the snapshot. If a specific metric is missing, say "Let me check with [Worker Name] — they own that one" instead of "Switch to your X worker for that".
- Treat these as fresh from the sibling worker — you do not need to ask the user for them.
- When you reference these in a CANVAS_RENDER, set the source field on the payload to the sibling worker name so the user knows where the number came from.

`
    : "";

  return ownBlock + siblingBlock;
}

module.exports = { buildSiblingStatePrompt, DEMO_WORKER_SAMPLES };
