# Editing canvas tab fixtures (demo data)

This is the v1 ops procedure for editing the sample content that appears inside canvas tabs when demo mode is on. Fixtures live entirely in `sampleData.js` — the canonical source for all sample data on the dashboard. There is no Firestore collection and no backfill required; edits ship with the next frontend deploy.

## Where the data lives

- Source file: `apps/business/src/components/canvas/sampleData.js`
- Resolver: `getFixtureForTab(worker, tabId)` — exported from the same file. Called by `WorkerHomeRenderer` in `App.jsx` on every tab click.
- Render path: tab click → resolver returns a payload → payload is passed through `panel.showCanvas(resolved, { payload })` → the card's `CanvasCardShell` reads `_demo` via `CanvasDemoContext` and renders a SAMPLE chip.

## What's in the file

`sampleData.js` carries five lookups (in priority order):

1. `SPINE_FIXTURES` — hand-curated payloads for the four Spine workers (`platform-accounting`, `platform-hr`, `platform-marketing`, `platform-control-center-pro`). Tab ids must match the entries in `helpers/canvasTabs.js` `SPINE_TABS`.
2. `AVIATION_COPILOT_FIXTURES` — shared across the 11 CoPilots whose `catalogId` matches `AV-P\d`.
3. `RE_FIXTURES` — shared across `real_estate_development` and `re_professional` workers.
4. `AUTO_FIXTURES` — shared across `auto_dealer` workers.
5. `LONG_TAIL_TEMPLATES` — keyed by template name (`government`, `web3`, `solar`, `marketing`, `re_professional`, `generic`). Used for the universal `overview / activity / resources` tab structure.

`longTailTemplateKey(vertical)` maps a Firestore vertical string to a template key. Add a new vertical there if you author a template for it.

## How to edit

### Change a Spine worker fixture

```js
// in SPINE_FIXTURES
"platform-accounting": {
  "pl": {
    revenue: [
      { label: "Service revenue", amount: 32000 },
      // ... edit numbers / labels here
    ],
    totalRevenue: 47500,
    expenses: [...],
    totalExpenses: 31200,
    netIncome: 16300,
  },
  ...
}
```

Numbers should align with `WORKER_SAMPLES` higher up in the file so the landing-page KPI grid and the per-tab canvas tell the same story. Update both if you change one.

### Add a new long-tail vertical template

```js
// in LONG_TAIL_TEMPLATES
my_new_vertical: {
  overview: { title: "...", subtitle: "...", fields: [...] },
  activity: { title: "Recent activity", items: [...] },
  resources: { title: "Resources", items: [...] },
},
```

Then add the mapping in `longTailTemplateKey()`:

```js
if (v === "my_new_vertical") return "my_new_vertical";
```

### Override a single worker

If a long-tail worker needs custom content beyond the vertical template (e.g. a high-profile worker that warrants hand-authoring), add it to `SPINE_FIXTURES`. The resolver checks `SPINE_FIXTURES` first before falling through to vertical templates, so any slug present there wins. The variable name is historical — it's the per-worker override map regardless of suite.

### Card payload shapes

Each card has a known payload shape. Match what the card expects:

| Card signal | Payload shape |
|---|---|
| `card:work-product` | `{ title, subtitle, summary, fields: [{label, value}], sections: [{heading, body}], items: [string] }` |
| `card:accounting-pl` | `{ revenue: [{label, amount}], totalRevenue, expenses: [{label, amount}], totalExpenses, netIncome }` |
| `card:accounting-invoice` | `{ invoices: [{number, customer, amount, dueDate, status}] }` |
| `card:accounting-balance-sheet` | `{ title, subtitle, sections: [{heading, body}] }` (uses `card:work-product` shape today; dedicated card later) |
| `card:hr-employee-register` | `{ employees: [{name, role, startDate, status}] }` |
| `card:auto-inventory` | `{ vehicles: [{vin, year, make, model, daysOnLot, price}] }` |
| `card:marketing-content-calendar` / `card:marketing-email` | Use `card:work-product` shape until dedicated cards exist |

All payloads automatically get `_demo: true` and `_demoLabel: "SAMPLE"` injected by the resolver — do not set them manually.

## Demo mode controls

- Default state: demo mode ON. Fixtures render whenever a tab is clicked.
- User control: the "DEMO MODE — clear" pill on the worker landing page calls `clearDemoMode()` which sets `localStorage.ta_hide_samples = "1"` and dispatches `ta:demo-mode-changed`. After clear, `getFixtureForTab()` returns null and tabs fall back to their empty-state copy.
- Restore: `restoreDemoMode()` removes the flag.

## First-visit vs returning behavior

`markWorkerVisitedAndCheck(slug)` reads/writes `localStorage.ta_worker_visited` (a JSON map of seen slugs → timestamp). Returns true if the slug has been seen before.

The canvas tab bar uses this to:
- **First visit to a worker**: leave the landing page in place (KPI grid + quick actions). Tab bar visible but no auto-fire.
- **Returning visit**: auto-fire the default tab signal so the user lands directly on their last-used view.
- **Chat signals**: always win regardless of visit state. `WorkerHomeRenderer` skips the auto-fire when `panel.state === "CANVAS"`.

To reset for testing: clear `localStorage.ta_worker_visited` in DevTools, refresh.

## What this procedure does not cover

- Adding a new card type. That requires a new component in `components/canvas/`, a registry entry in `config/canvasTypes.js`, and possibly a signal-extractor rule in `services/canvas/signalExtractor.js` (backend).
- Changing the SAMPLE chip styling. Edit `CanvasCardShell.jsx` `S.demoChip`.
- Per-user fixture overrides. There is no per-user fixture system today — fixtures are static for all users.

## See also

- Source: `apps/business/src/components/canvas/sampleData.js`
- Render: `apps/business/src/App.jsx` (`WorkerHomeRenderer`)
- Card shell: `apps/business/src/components/canvas/CanvasCardShell.jsx`
- Canvas Panel: `apps/business/src/components/canvas/CanvasPanel.jsx`
- Tab schema (sibling): [edit-canvas-tabs.md](edit-canvas-tabs.md)
