/**
 * Sample data for `<your-worker-slug>` worker.
 *
 * The platform renders this fixture for first-visit users so they see
 * a populated workspace, not an empty state. Sample data should look
 * like real data — same field names, realistic values, plausible scale.
 *
 * After the first action a user takes, the worker switches to live data.
 *
 * RULES:
 *  - One entry in `SAMPLE_CANVAS_PAYLOADS` per `canvasTab.id`
 *  - Use realistic strings; avoid lorem ipsum
 *  - Subtitle should include the word "Sample" so the SAMPLE chip renders
 *  - Counts should match the items list (don't say "Open: 3" if you list 5)
 */

export const DEMO_THINGS = [
  {
    id: "thing_1",
    name: "First sample thing",
    status: "active",
    createdISO: "2026-05-15",
  },
  {
    id: "thing_2",
    name: "Second sample thing",
    status: "active",
    createdISO: "2026-05-20",
    flag: "Optional flag explaining a status badge",
  },
  {
    id: "thing_3",
    name: "Third sample thing",
    status: "archived",
    createdISO: "2026-04-30",
  },
];

export const AUDIT_TRAIL_SAMPLE = [
  {
    tsISO: "2026-05-15T16:42:00Z",
    actor: "Operator Name (verified)",
    action: "thing.proposed",
    target: "First sample thing",
    chainAnchorHash: null,
    verified: true,
  },
  {
    tsISO: "2026-05-15T16:42:01Z",
    actor: "Operator Name (verified)",
    action: "thing.locked",
    target: "First sample thing",
    chainAnchorHash: "0x7a3f...e91c",
    verified: true,
  },
  {
    tsISO: "2026-05-15T16:43:11Z",
    actor: "Operator Name (verified)",
    action: "thing.unlock_attempted",
    target: "First sample thing",
    chainAnchorHash: null,
    verified: false,
    rejectReason: "Locked records are immutable. Audit log entry preserved.",
  },
];

export const SAMPLE_CANVAS_PAYLOADS = {
  "main": {
    title: "Things — your active list",
    subtitle: `Sample data · ${DEMO_THINGS.filter(t => t.status === "active").length} active`,
    fields: [
      { label: "Active",   value: String(DEMO_THINGS.filter(t => t.status === "active").length) },
      { label: "Archived", value: String(DEMO_THINGS.filter(t => t.status === "archived").length) },
    ],
    things: DEMO_THINGS,
  },
  "activity": {
    title: "Activity",
    subtitle: "Sample data · recent events",
    items: [
      "Sample event 1 — what happened",
      "Sample event 2 — what happened",
      "Sample event 3 — what happened",
    ],
  },
  "audit": {
    title: "Audit Trail",
    subtitle: "Sample data · every action timestamped, identity-verified, chain-anchored where applicable",
    entries: AUDIT_TRAIL_SAMPLE,
  },
  "settings": {
    title: "Settings",
    subtitle: "Sample data · admin configuration",
    fields: [
      { label: "Worker version", value: "0.1.0" },
      { label: "Active",         value: "Yes" },
    ],
  },
};
