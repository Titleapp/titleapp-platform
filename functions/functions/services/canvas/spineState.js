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
  "platform-control-center-pro": {
    label: "Control Center Pro",
    kpis: {
      "Active Workers": 6,
      "Customer Growth": "18%",
      "Tasks Due": 7,
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
      employeesSnap,
      tenantSnap, subsSnap,
    ] = await Promise.all([
      safe(db.collection("coaAccounts").where("tenantId", "==", tenantId).get()),
      safe(db.collection("transactions").where("tenantId", "==", tenantId).limit(2000).get()),
      safe(db.collection("connectedAccounts").where("tenantId", "==", tenantId).get()),

      safe(db.collection("contacts").where("tenantId", "==", tenantId).limit(2000).get()),

      safe(db.collection("marketingDrafts").where("tenantId", "==", tenantId).limit(500).get()),
      safe(db.collection("socialPosts").where("tenantId", "==", tenantId).limit(500).get()),
      safe(db.collection("messageQueue").where("tenantId", "==", tenantId).limit(500).get()),
      // emailCampaigns + emailLists are userId-scoped today, not tenant-scoped.
      // Fall back to userId when present; otherwise skip.
      uid ? safe(db.collection("emailCampaigns").where("userId", "==", uid).limit(200).get()) : Promise.resolve(empty),
      uid ? safe(db.collection("emailLists").where("userId", "==", uid).limit(200).get()) : Promise.resolve(empty),

      safe(db.collection("employees").where("tenantId", "==", tenantId).limit(500).get()),

      safe(db.collection("tenants").doc(tenantId).get()),
      safe(db.collection("subscriptions").where("tenantId", "==", tenantId).where("status", "==", "active").get()),
    ]);

    const live = {};

    // ── Accounting ──
    const coa = coaSnap.docs.map(d => d.data()).filter(a => a.status !== "archived");
    const txs = txSnap.docs.map(d => d.data());
    const conns = connSnap.docs.map(d => d.data()).filter(a => a.status !== "deleted");
    const mtdTxs = txs.filter(t => t.date && t.date >= monthStart);
    const revenueMtd = mtdTxs.filter(t => t.direction === "credit").reduce((s, t) => s + (t.amountCents || 0), 0) / 100;
    const expensesMtd = mtdTxs.filter(t => t.direction === "debit").reduce((s, t) => s + (t.amountCents || 0), 0) / 100;
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
        "Invoices (AR)": "none on file — invoice module not yet populated",
        "Bills (AP)": "none on file — bills module not yet populated",
      },
      recentTransactions: recentTxs,
    };

    // ── Contacts ──
    const contacts = contactsSnap.docs.map(d => d.data());
    if (contacts.length > 0) {
      const customers = contacts.filter(c => (c.lifecycleStage || "").toLowerCase() === "customer").length;
      const newThisMonth = contacts.filter(c => {
        const ms = c.createdAt?._seconds ? c.createdAt._seconds * 1000 : c.createdAt?.toMillis?.();
        return ms && ms >= new Date(monthStart).getTime();
      }).length;
      live["platform-contacts"] = {
        label: "Contacts",
        kpis: {
          "Total Contacts": contacts.length,
          "Customers":      customers || 0,
          "New This Month": newThisMonth || 0,
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
    const hasAnyMarketing = drafts.length || socialPosts.length || campaigns.length || queued || lists;
    live["platform-marketing"] = {
      label: "Marketing & Content",
      kpis: hasAnyMarketing ? {
        "Drafts (last 7d)":     drafts7d,
        "Social posts (7d)":    social7d,
        "Email campaigns sent (30d)": sent30d,
        "Contact lists":        lists,
        "Queued messages":      queued,
      } : { "Note": "no campaigns, drafts, or contact lists yet" },
    };

    // ── HR & People ──
    const employees = employeesSnap.docs.map(d => d.data());
    if (employees.length > 0) {
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

    // ── Control Center Pro ── rollup. Reads workspace mode + active subs.
    const tenantData = tenantSnap.exists ? tenantSnap.data() : {};
    const activeSubs = (subsSnap.docs || []).length;
    live["platform-control-center-pro"] = {
      label: "Control Center Pro",
      kpis: {
        "Workspace mode":       tenantData.mode || "operations",
        "Workspace name":       tenantData.name || tenantId,
        "Active subscriptions": activeSubs,
        "Spine workers configured": Object.keys(live).length, // updated below after all sections added
      },
    };

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
    if (spine.complianceFlags != null) {
      live["platform-control-center-pro"] = {
        label: "Control Center Pro",
        kpis: {
          "Compliance Flags": spine.complianceFlags,
          "Active Workers": spine.activeWorkers,
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
Do not quote numbers for sibling workers. If the user asks about Accounting, Marketing, HR, Contacts, or Control Center metrics, say you don't have a current reading and ask them what they want to look at first.

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
