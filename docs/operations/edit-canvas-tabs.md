# Editing canvas tabs on a worker

This is the v1 ops procedure for changing the right-panel tab strip on any worker. There is no admin UI yet — edits go directly through Firestore using the schema and validator from `functions/functions/helpers/canvasTabs.js`.

## Where the data lives

Every worker doc at `digitalWorkers/{slug}` carries a `canvasTabs` array. The frontend reads it via the `/v1/catalog:byVertical` projection (`functions/functions/index.js`) and renders it in `apps/business/src/components/canvas/CanvasTabBar.jsx`. The default tabs were seeded by `scripts/backfillCanvasTabs.js` based on the rules in `helpers/canvasTabs.js`.

A provenance record at `workerOnboarding/{slug}` is written by the backfill so we can tell auto-generated tabs from authored ones (`canvasTabsSource: "auto-generator-v1"`).

## Schema

```jsonc
{
  "canvasTabs": [
    {
      "id": "overview",         // required — kebab-case, unique within the worker
      "label": "Overview",      // required — shown on the tab
      "signal": "card:work-product",  // required — must resolve via lookupSignal()
      "default": true,          // exactly one tab in the array must have this
      "order": 0                // required — 0-based, ascending = left-to-right
      // "icon": "lucide-name"  // optional, not yet rendered
    },
    { "id": "activity",  "label": "Activity",  "signal": "card:work-product", "order": 1 },
    { "id": "resources", "label": "Resources", "signal": "card:work-product", "order": 2 }
  ]
}
```

## Validation rules

Enforced by `validateCanvasTabs(tabs, vertical)` in `helpers/canvasTabs.js`:

- `2 ≤ length ≤ 6` for every vertical except aviation, which allows up to 7 (mirrors the 7-tab `CoPilotEFB.jsx` structure).
- Each tab must have `id`, `label` (non-empty), `signal` (string), and numeric `order`.
- `id` must match `/^[a-z0-9-]+$/` and be unique within the array.
- Exactly one tab must have `default: true`. The default tab is selected on first paint and after a worker switch.
- The `signal` value is *not* validated against the registry at write time today — invalid signals render an empty card. Run `lookupSignal(signal)` from `apps/business/src/config/canvasTypes.js` before editing if you're unsure.

## Editing a worker's tabs

The repo's local Firebase Admin credentials are at `~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json`. Use `GOOGLE_APPLICATION_CREDENTIALS=...` plus a one-off Node script:

```js
const admin = require("./functions/functions/node_modules/firebase-admin");
const { validateCanvasTabs } = require("./functions/functions/helpers/canvasTabs");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const slug = "platform-accounting";
const tabs = [
  { id: "overview",      label: "Overview",      signal: "card:work-product",            default: true,  order: 0 },
  { id: "pl",            label: "P&L",           signal: "card:accounting-pl",           order: 1 },
  { id: "balance-sheet", label: "Balance Sheet", signal: "card:accounting-balance-sheet",order: 2 },
  { id: "cash-flow",     label: "Cash Flow",     signal: "card:accounting-cashflow",     order: 3 },
  { id: "invoices",      label: "Invoices",      signal: "card:accounting-invoice",      order: 4 },
  { id: "tax",           label: "Tax",           signal: "card:work-product",            order: 5 },
];

(async () => {
  const worker = (await db.collection("digitalWorkers").doc(slug).get()).data();
  validateCanvasTabs(tabs, worker.vertical);  // throws if invalid
  await db.collection("digitalWorkers").doc(slug).update({ canvasTabs: tabs });
  await db.collection("workerOnboarding").doc(slug).set({
    canvasTabsSource: "authored",
    canvasTabsAuthoredAt: admin.firestore.FieldValue.serverTimestamp(),
    canvasTabIds: tabs.map(t => t.id),
  }, { merge: true });
  console.log("ok");
  process.exit(0);
})();
```

Always set `canvasTabsSource: "authored"` on `workerOnboarding/{slug}` after a hand-edit — the backfill script's idempotency check uses `canvasTabsSource` to skip authored workers.

## Idempotency

`scripts/backfillCanvasTabs.js` is safe to re-run. It skips any worker whose existing `canvasTabs` validates. Pass `--force` to overwrite (use sparingly — it clobbers authored tabs). Pass `--dry` to preview decisions without writing.

When a new worker is created via the registration pipeline, run the backfill once with no flags to seed the new doc. The script touches only workers without valid tabs.

## What changes after an edit

Frontend reads `canvasTabs` from `/v1/catalog:byVertical`. The endpoint is cached for 5 minutes via the worker discovery layer. A user-triggered worker switch on the dashboard refetches; existing sessions can hard-refresh to pick up changes immediately.

## What this procedure does not cover

- **Per-tab card content.** Each tab today binds a *signal* that resolves to a card type from the existing `CANVAS_TYPES` registry. Adding a new card type (e.g. for a vertical-specific view) is a separate change in `apps/business/src/config/canvasTypes.js` plus a corresponding component in `components/canvas/`.
- **Demo data inside tabs.** Tabs render their card's empty state when no conversation data is available. Demo fixtures (T4) populate the tabs with seed content; that work is separate from this procedure.
- **Authoring UI.** A worker-builder UI for editing tabs without writing code is on the roadmap but not in v1. Direct Firestore edits remain the v1 mechanism.

## See also

- Schema and generator: `functions/functions/helpers/canvasTabs.js`
- Render layer: `apps/business/src/components/canvas/CanvasTabBar.jsx`, `apps/business/src/components/RightPanel/RightPanel.jsx`
- Signal registry: `apps/business/src/config/canvasTypes.js`
- Audit script: `/tmp/auditWorkerDoD.js`
- Backfill script: `/tmp/backfillCanvasTabs.js`
