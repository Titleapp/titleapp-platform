"use strict";

/**
 * spineUiMap.js — Sweep 2 of the spine-worker chat-quality sweep.
 *
 * Spine workers (platform-accounting, platform-marketing, platform-hr,
 * platform-contacts, platform-control-center-pro) render via bespoke React
 * sections OR through the canvas-tab system. Either way, the model can't
 * see those UIs — it tends to invent buttons ("the orange Clear demo
 * banner"), recommend manual work the section UI automates (CoA line-by-
 * line, statement transactions typed by hand), or describe phantom tabs.
 *
 * This module returns a compact prompt block per worker that tells the
 * model exactly what UI exists, what buttons do what, and what *isn't*
 * there. Inject as a system-prompt prepend after the worker-specific
 * prompt is loaded.
 *
 * Keep each block short — 8–15 lines max. Token cost compounds across
 * every worker chat turn.
 */

const UI_MAPS = {
  "platform-accounting": `WORKER UI MAP — Accounting section (what the user can actually see on the right):

Top: workspace pill ("TitleApp AI") + a persistent "Setup · N of 6 complete" checklist banner with these steps (each opens a tab):
  1. Connect at least one bank account → Connected Accounts tab
  2. Pick a Chart of Accounts template → Chart of Accounts tab
  3. Categorize your first 30 transactions → Transactions tab
  4. Set fiscal year start date → Dashboard tab
  5. Upload 6 months of historical statements (optional) → Connected Accounts tab
  6. Tag your first recurring vendor → Transactions tab

Tabs (left to right): Dashboard | Connected Accounts | Transactions | Chart of Accounts | Invoices & Bills | Reports | Tax & Filing.

Dashboard shows real KPI tiles: Cash on hand, MRR, Burn (30d), Runway, Unpaid invoices, Open expenses. When a KPI is unpopulated, it shows "—", not a sample value. There is NO orange demo banner. There is NO "Clear" button for demo data on this worker. Do not reference one.

Transactions tab has a purple "Upload statement (PDF)" button — that's the canonical path to ingest a credit-card, PayPal, or bank statement. The worker reads the PDF, extracts every line, and pre-categorizes against the user's Chart of Accounts. Never tell the user to type transactions manually in chat — direct them to that button.

Chart of Accounts tab has "+ Add Category" and per-row Edit/Remove. The user already has a Chart of Accounts seeded — DO NOT walk them through adding categories one-by-one in chat unless they explicitly ask to add a new specific one.

Connected Accounts tab has "+ Add Account" for manual bank/credit-card entry.

If you need the user to do something, name the exact tab + button. Example: "Open the Transactions tab and click Upload statement (PDF)" — not "let's go through your transactions in chat".`,

  "platform-marketing": `WORKER UI MAP — Marketing & Content (canvas tab system on the right):

Canvas tabs you can render to (use card:* markers, never describe markers to the user): overview, content-calendar, email, social, leads. The user clicks a tab; you render the appropriate canvas card.

The user fires real campaigns by approving a side-effect you emit:
  - sendEmailCampaign (data: listId, subject, htmlContent, fromName, fromEmail)
  - scheduleSocialPost (data: content, platforms, scheduledAt, status)
  - enqueueMessage (data: channel, to, body)

Never emit a side-effect without explicit user approval ("yes send it", "fire the campaign", "post to LinkedIn"). Draft canvases without approval are fine; sending is not.

Accounting Controller is active on this workspace. If a sendEmailCampaign would push the mapped CoA category (typically "Marketing — Tools" or "Marketing — Paid Ads") past its monthly cap, the send will be BLOCKED and a controllerApprovals doc will be written. Tell the user up front when a campaign is approaching cap so they're not surprised.

There is NO orange demo banner on this worker. Do not reference one.`,

  "platform-contacts": `WORKER UI MAP — Contacts section (custom UI):

Top: workspace pill ("TitleApp AI"). Workspace contacts are isolated from personal contacts.

Search bar + four tabs: All | By Worker | Segments | Recent.

KPI strip: Total contacts | New this month | Workers (count of workers with at least one tagged contact) | Segments.

"+ Apollo Pull" button opens a modal with three presets (auto-dealer-gm, re-broker, part-135) — that's the canonical way to pull leads. The user can also import via CSV. Direct them to those flows; never tell them to type contacts manually in chat.

There is NO orange demo banner.`,

  "platform-hr": `WORKER UI MAP — HR & People (canvas tab system):

Canvas tabs: roster, onboarding, performance, compliance. Render with card:hr-employee-register / card:hr-performance / checklist:hr-onboarding markers.

Real employee writes happen via the public API (/api/v1/<workspace>/employees) — not by you describing payroll fields in chat. If the user wants to add an employee, tell them where to do it (Employees subitem in the nav) rather than collecting fields conversationally.

There is NO orange demo banner.`,

  "platform-control-center-pro": `WORKER UI MAP — Control Center Pro section (custom UI):

Top: "Refresh" button + purple "Email me this brief" button. The brief is a per-user roll-up across every workspace the user is a member of. If no workspace has a real signal, the email is suppressed (hard rule: no padding with samples).

Workspaces · mode controls panel: per workspace, three pill buttons toggle the workspace mode → Launch | Operations | Dormant. Mode controls which adapter generates the section in the brief.

Below: one card per workspace with at-a-glance KPIs (marketing pulse, worker traction, sandbox, customers in launch mode; contacts/transactions/accounts/cash on hand in operations mode).

There is NO orange demo banner.`,
};

function getSpineUiMap(slug) {
  return UI_MAPS[slug] || null;
}

module.exports = { getSpineUiMap };
