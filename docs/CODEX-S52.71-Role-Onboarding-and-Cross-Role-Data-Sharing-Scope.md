# CODEX S52.71 — Role-Based Onboarding + Cross-Role Data Sharing: Scope

**Status:** Scoping only (2026-09-09) — no code written yet. Grounded in direct code checks (cited below), not assumption.
**Why this exists:** Two things converged in the same conversation: (1) `CODEX-S52.69`'s top-priority, still-unbuilt item — a first-run "are you a pilot, maintenance tech, or dispatch" question driving three distinct home screens — and (2) Sean's explicit ask that a Dispatch team member needs to see much of what a Pilot sees, and a Pilot needs to see several things that today live only in MX's world (aircraft logbook/CAN, squawks, fleet operational status, aircraft operational status, aircraft MX history). This doc scopes both together, since routing a user to the right role only matters if that role's screen actually has the cross-role visibility a real Part 135 operation needs.

---

## Part 1 — Role-based onboarding + routing

### What exists today (checked directly, not assumed)
- **No role selection exists at all.** `apps/business/src/main.jsx` hardcodes every native aviation launch to `sessionStorage.setItem("ta_redirect_page", "av-copilot-001")` unconditionally — every user, every launch, lands on Pilot. There is no MX or Dispatch landing path today, not even a manual one.
- **No `RoleSwitcher` component exists.** S52.69 referenced it as a concept ("the RoleSwitcher... all converge into one thing"); it was never built. Confirmed via a repo-wide filename search.
- **Worker switching (Pilot/MX/Dispatch as distinct RaaS workers) already exists at the plumbing level** — `Sidebar.jsx`'s `activeWorkers` array (persisted to `localStorage` as `ACTIVE_WORKERS`, tenant-scoped) already lists `av-copilot-001`/`av-mx-001`/`av-dispatch-001` for Sean's tenant, with a `WORKER_DISPLAY_NAMES` map and generic worker-select UI. **This is real, working infrastructure for switching between workers in general** — it's not aviation-specific, and it's not currently exposed as a purpose-built "which crew role am I" picker, but it means role-switching isn't new plumbing, it's a new UI layer over plumbing that already works.
- **No per-person job-role field exists in the data model.** Every `membership.role` value found in the codebase (`functions/functions/index.js`, ~10 call sites) is an org-permission role (`owner`/`admin`/member-tier), not a crew job role. There is nowhere today that stores "this person is a pilot" vs. "this person is a mechanic."

### The data-model decision this scoping needs to make
Sean's own requirement — "easy switching afterward for the shared-device case" (one company iPad passed between a pilot, a mechanic, and a dispatcher) — means this can't be a pure per-account setting; it also can't be pure device-local state, or it won't personalize onboarding for someone who logs in on a different device. Recommended hybrid, following the existing pattern (`activeWorkers` is tenant+device localStorage; membership docs are the durable per-person record):

1. **Add an optional `preferredCrewRole` field to the `memberships` doc** (`pilot` | `mx` | `dispatch`, nullable) — a durable, cross-device default for that specific person on that specific tenant. Set once on first-run, editable later in account settings.
2. **A lightweight, always-visible role switcher** (the never-built `RoleSwitcher` S52.69 named) — not gated behind settings, since the shared-device case means the *current* person may not match the *stored* default. Switching here only changes which worker/home-screen is shown for the current session; it does not silently overwrite the membership's stored preference unless the user explicitly says "make this my default."
3. **First-run logic**: if `preferredCrewRole` is unset on the membership AND no role has been chosen this device-session, show the onboarding question ("are you a pilot, maintenance tech, or dispatch team member?" — professional wording per Sean's note, not "MX" as an internal abbreviation). Answering sets both the membership default and the current session's active role.

This reuses the existing `activeWorkers`/worker-select machinery for the actual screen-switching mechanics — the new work is the first-run prompt, the membership field, and a purpose-built switcher UI (visually distinct from the generic worker library, since this is meant to feel like "who are you," not "pick a tool").

### Home-screen content per role
Already fully specced in `CODEX-S52.69` (not repeated here) — Pilot: map + New Flight prominent; MX and Dispatch: a half-report/half-chat hybrid (Skye greets by name with a today/this-week summary, then quick access to fleet status + an asset-location map). That spec doesn't need rework, just implementation once the routing above exists.

### Technical touchpoints (for whoever scopes the actual build ticket)
- `apps/business/src/main.jsx` — replace the hardcoded `ta_redirect_page` set with a check against membership's `preferredCrewRole` (needs a Firestore read before the redirect, which today's synchronous sessionStorage-based handshake doesn't do — this is the one piece of real new complexity, not just a UI addition)
- New membership field: `preferredCrewRole` — read/write via a new small endpoint, following the same `requireMembershipIfNeeded` gating pattern already used elsewhere (e.g. `crewRosterCurrency`)
- New onboarding component (first-run question) + new `RoleSwitcher` component (persistent, lightweight)
- Three home-screen components/layouts per `CODEX-S52.69`'s spec — largely new UI, reusing existing real data sources (Map, Duty-tab reference design, fleet status)

---

## Part 2 — Cross-role data sharing

### The pattern already exists — twice — just narrowly applied
Checked directly: this is not a new architectural concept for this codebase.
- **Pilot already reads MX's data read-only.** The Pilot canvas's "Aircraft Logbook" tab calls `GET /v1/mx:logbook:list` — the exact same real endpoint MX uses to maintain the aircraft/CAN logbook — rendered read-only in Pilot's canvas.
- **Dispatch already reads MX's data read-only.** Dispatch's "Aircraft Status" tab calls `GET /v1/mx:listAircraft` (the `computeAirworthiness()` result) — the same real airworthiness computation MX's own Aircraft tab uses.

So the mechanism for "share role A's real data into role B's canvas, read-only" is proven and working in two places already. What Sean's asking for is applying that same mechanism more completely, not inventing new architecture.

### Pilot → needs read access into MX's world

| What Sean named | Backend reality (checked) | Gap |
|---|---|---|
| CAN (aircraft logbook) | Already real and already shared — `GET /v1/mx:logbook:list`, Pilot's existing Aircraft Logbook tab | **No gap** — already built |
| Squawks | Real backend exists (`case "listSquawks"`, `functions/functions/index.js:35336`, backs MX's Unscheduled MX/MEL tabs) but not exposed anywhere in Pilot's canvas today | **Real gap** — needs a new Pilot-facing tab or panel, scoped to the pilot's assigned aircraft (not the whole fleet) |
| Fleet operational status | Real backend exists (`mx:listAircraft`, same data Dispatch's Aircraft Status tab already reads) | **Real gap for Pilot specifically** — the read-only pattern exists for Dispatch, just needs the same wiring added to Pilot's canvas |
| AC (aircraft) operational status | Same `mx:listAircraft` airworthiness computation, scoped to one tail instead of the fleet | **Real gap** — narrower version of the fleet-status gap above; likely the same new tab, just filtered to the pilot's assigned/next aircraft |
| AC MX history | Scheduled MX / Unscheduled MX / Inspections / ADs&SBs / Warranty — all real MX tabs, all backed by `aircraftRecords.js` | **Real gap** — no Pilot-facing history view exists; likely a single consolidated "Aircraft History" panel rather than 5 separate tabs ported wholesale (worth a UX call, not just a data-wiring one) |

**Recommendation:** don't port all 5-6 MX tabs into Pilot's canvas verbatim — that recreates MX's tab sprawl inside Pilot's UI. Better: one new "My Aircraft" panel in Pilot's canvas (or inside the Full EFB), scoped to the pilot's assigned tail, that pulls from `mx:listAircraft` + `mx:listSquawks` and presents operational status / open squawks / upcoming MX / history as sections of one view — same underlying real data, one coherent read-only surface instead of MX's full multi-tab authoring UI.

### Dispatch → needs read access into Pilot's world

| What's needed | Backend reality (checked) | Gap |
|---|---|---|
| Crew currency/qualifications | `crewRosterCurrency` — real, already Dispatch-facing (confirmed and corrected this session) | **No gap** — already built |
| W&B / TOLD figures for release decision | `PerformanceCalculator.jsx` + W&B calculator are **already mounted in Dispatch's own `ReleaseFlightModal`** (confirmed during the red-team pass) | **No gap** — this is already architecturally Dispatch-side, not something that needs to be "shared in" from Pilot |
| Weather/NOTAMs for the specific filed trip | Dispatch has real `aviation:weather`/`aviation:notams` tabs, but both are **hardcoded to a fixed Hawaii ICAO list**, not derived from any actual filed trip | **Real gap — but it's the same gap already flagged in `CODEX-S52.70`**, not a new one. Fixing "NOTAMs/weather should follow the filed trip, not a hardcoded list" solves this for Dispatch automatically once done |
| Route / flight plan itself | Pilot's `Flight` tab is 100% hardcoded fixture data today (`CODEX-S52.69`'s highest-priority rebuild target) | **Blocked on an already-known gap**, not a new one — there's nothing real yet for Dispatch to read even if the sharing pattern were wired, because the Pilot-side data itself doesn't exist yet |

**Key finding: most of "Dispatch needs Pilot visibility" isn't a new sharing feature to build — it's automatically solved by two fixes already on record** (make the Flight tab real; make weather/NOTAMs trip-scoped instead of hardcoded). The one piece that's genuinely Dispatch-side already (release-flight performance numbers) is already there. This significantly narrows new work for the Dispatch direction compared to the Pilot→MX direction, which has real, unbuilt gaps.

### Open permission-model questions (Sean's call, not an engineering default)
1. **Should every pilot see every aircraft's full squawk/MX history, or only their currently-assigned tail's?** The existing precedent (Dispatch's Aircraft Status) is fleet-wide, gated only by tenant membership, not by role-sensitivity — but a pilot seeing another aircraft's full MX history is a different sensitivity question than a dispatcher seeing fleet-wide airworthiness for scheduling. Recommend scoping Pilot's new "My Aircraft" panel to assigned/recent aircraft by default, with an explicit fleet-wide view only if Sean wants it.
2. **Should any of this be gated like `crewRosterCurrency` (owner/admin only), or open to any tenant member** (the pattern Aircraft Logbook/Aircraft Status already use)? Crew *currency* was gated because it's personnel data; aircraft squawks/MX history is asset data, arguably less sensitive — but worth Sean confirming rather than assuming.

---

## Sequencing recommendation

1. **Membership `preferredCrewRole` field + first-run onboarding question + RoleSwitcher UI** — the routing layer everything else depends on; without it, three role-tailored home screens have no way to know which one to show.
2. **Pilot's "My Aircraft" panel** (squawks + fleet/aircraft status + MX history, scoped to assigned tail) — the clearest, most self-contained new build; reuses existing real endpoints, no new backend work required, just new frontend wiring + the assigned-aircraft scoping decision from the open question above.
3. **Generalize weather/NOTAMs beyond the hardcoded Hawaii list** — already on record as a gap in S52.70; doing it here automatically improves Dispatch's cross-role visibility as a side effect, not a separate project.
4. **The three role-tailored home screens themselves** (per S52.69's spec) — biggest UI lift, but has no new data dependencies once #1-#3 above exist.
