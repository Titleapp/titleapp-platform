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
 * Build the SIBLING WORKER STATE prompt block. Returns "" if no usable state.
 *
 * @param {Object} args
 * @param {object} args.db - Firestore admin db
 * @param {string|null} args.uid - authenticated user id
 * @param {string} args.currentSlug - the active worker (excluded from the snapshot)
 * @param {boolean} args.demoMode - whether canvas demo mode is on
 */
async function buildSiblingStatePrompt({ db, uid, currentSlug, demoMode }) {
  let snapshot = null;
  let label = "DEMO";
  if (!demoMode) {
    snapshot = await buildLiveSnapshot(db, uid);
    if (snapshot) label = "LIVE";
  }
  if (!snapshot) snapshot = DEMO_WORKER_SAMPLES;

  const body = renderSnapshot(snapshot, currentSlug);
  if (!body) return "";

  return `SIBLING WORKER STATE (${label} — refresh on next session):
${body}

Cross-worker attribution rules:
- When the user asks about a metric or status above, cite it WITH the source worker name (e.g. "Your Accounting worker shows revenue of $47,500 this month").
- Do NOT invent numbers that are not in the snapshot. If a specific metric is missing, say "Let me check with [Worker Name] — they own that one" instead of "Switch to your X worker for that".
- Treat these as fresh from the sibling worker — you do not need to ask the user for them.
- When you reference these in a CANVAS_RENDER, set the source field on the payload to the sibling worker name so the user knows where the number came from.

`;
}

module.exports = { buildSiblingStatePrompt, DEMO_WORKER_SAMPLES };
