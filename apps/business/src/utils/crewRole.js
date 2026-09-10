// S52.71 Step 1 — single source of truth for crew-role <-> aviation worker
// slug mapping, shared by App.jsx (redirect resolution) and Sidebar.jsx
// (RoleSwitcher) so the two never drift apart.
export const CREW_ROLE_TO_WORKER_SLUG = {
  pilot: "av-copilot-001",
  mx: "av-mx-001",
  dispatch: "av-dispatch-001",
};

export const WORKER_SLUG_TO_CREW_ROLE = Object.fromEntries(
  Object.entries(CREW_ROLE_TO_WORKER_SLUG).map(([role, slug]) => [slug, role])
);

export const CREW_ROLE_LABELS = {
  pilot: "Pilot",
  mx: "Maintenance Tech",
  dispatch: "Dispatch Team Member",
};
