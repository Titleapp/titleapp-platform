# CODEX 51.15 — IR Worker Phase 2 Brief

**Scope:** Advisor signing flow + native office-hours booker.
**Predecessor:** Phase 1 (CODEX 51.14 §IR Worker — investor flow). All Phase 1 scaffolding (Stripe Identity, Dropbox Sign role routing, magic-link auth, Vault stash, capability registry) is in place and the advisor flow can reuse most of it.
**Status:** Spec — ready for one-click agent launch when Sean approves.
**Not yet:** Code build, env var setup, deploy.

---

## What Phase 2 must deliver

### A. Advisor signing flow (mirrors investor flow with a different template)

The vast majority of Phase 1's `services/ir/investorFlow.js` orchestrator works for advisors — same magic-link, same Stripe Identity ID-only, same Vault-stash pattern. What changes:

- New role-keyed entry in `sendSignaturePacket({role: "advisor"})` — already handled mechanically; just needs the env var.
- New orchestrator file `services/ir/advisorFlow.js` paralleling `investorFlow.js`. Different metadata: instead of `{ commitment_amount, valuationCap, sharesIssued }`, advisors get `{ advisoryRole, equityGrantPct, vestingScheduleId, kentReleaseClause }`.
- Equity grant calculation: 2% baseline cap per CODEX 51.13's advisor deck iteration. Worker reads this from a new config constant `ADVISOR_EQUITY_DEFAULT_PCT = 0.02` so it can be overridden per advisor when needed.
- **TitleApp LLC release clause:** every legacy advisor (Scott Eschelman, anyone with a prior TitleApp LLC relationship) gets a mutual-release section appended to their warrant. The Dropbox Sign template should have this as a conditional/optional section, controlled by a template field `include_legacy_release: bool`. Default false; set true for the small advisor list Sean identifies.
- New HTTP routes: `POST /v1/ir:advisor:initiate`, `POST /v1/ir:advisor:step`, `GET /v1/ir:advisor:status`.
- New capability registry entries: `ir.advisor.initiate_v1`, `step_v1`, `status_v1`.

### B. Native office-hours booker

This is the bigger new build. Stops being a Cal.com stopgap.

**Architecture:**

- New collection `officeHoursAvailability/{userId}` — declares the user's availability windows. Shape:
  ```js
  {
    userId: "kent-uid" | "sean-uid",
    timezone: "America/Los_Angeles" | "America/New_York",
    windows: [
      { dayOfWeek: 2, startTime: "15:00", endTime: "17:00" }, // Tuesday 3-5pm
      { dayOfWeek: 4, startTime: "10:00", endTime: "12:00" }, // Thursday 10am-12pm
    ],
    slotMinutes: 30,
    bufferMinutes: 15,
    googleCalendarId: "sean@sociii.ai",
    isActive: true,
  }
  ```
- New collection `officeHoursBookings/{bookingId}` — booked slots:
  ```js
  {
    bookerEmail: "investor@example.com",
    bookerName: "Jane Investor",
    bookerRole: "investor" | "advisor" | "creator" | "other",
    hostUserId: "sean-uid" | "kent-uid",
    startsAt: Timestamp,
    endsAt: Timestamp,
    googleCalendarEventId: "...",
    status: "confirmed" | "cancelled" | "completed",
    createdAt, updatedAt,
  }
  ```

**Endpoints:**

- `GET /v1/officeHours:availability?hostUserId=...` — returns the next N open slots from now (default N=10), free-busy filtered against the host's Google Calendar (reads via the existing connector).
- `POST /v1/officeHours:book` — `{ hostUserId, startsAt, bookerEmail, bookerName, bookerRole, note? }` → writes the booking, dual-writes a Google Calendar event on both host and booker calendars (the latter only if booker has connected their Google Workspace), sends a confirmation email with .ics attachment.
- `POST /v1/officeHours:cancel` — `{ bookingId }` → cancels event on both calendars, marks booking cancelled.

**UI surface:**

- New canvas card `OfficeHoursCard.jsx` rendered in the post-signing confirmation screen + in the investor/advisor's Vault. Shows the host (Sean or Kent), next 5-10 open slots, "Book this slot" buttons.
- Integration point: Phase 1's `services/ir/investorConfirmationEmail.js` currently embeds `OFFICE_HOURS_BOOKING_URL` (Cal.com link). Replace with a link to `https://app.sociii.ai/office-hours?hostUserId=...&role=investor` route that renders the same OfficeHoursCard outside of chat.

### C. Default availability windows (seed data)

The Phase 2 build should seed sensible defaults so the booker works on first deploy:

- **Sean (sean@sociii.ai):** Tuesdays 3-5pm PT, Thursdays 10am-12pm PT. 30-min slots, 15-min buffer.
- **Kent:** TBD — Sean to ask Kent. Default to Tuesdays + Thursdays 10am-12pm ET until Kent specifies.

Sean can override via Settings → Office Hours UI (also part of Phase 2 deliverable — small surface).

### D. Quarterly call event seeding

While we're touching calendars: seed a recurring placeholder event "SOCIII Quarterly Shareholder Update" on Sean's calendar:

- First event: Wed 2026-09-16 5:00pm PT (Q3 2026)
- Recurrence: every 13 weeks
- Auto-invite: every user where `tenants/{id}.vertical ∈ ["investor", "advisor"]` AND `status === "closed"`
- Update Phase 1's confirmation email template — replace "Q3 2026 — date TBA" with the actual date once seeded

---

## Hard constraints — DO NOT

- Do NOT touch Phase 1's investor flow code. Reuse the orchestrator pattern; don't refactor it.
- Do NOT live-call Google Calendar API from the agent (no secrets in agent env). Code the integration to spec; Sean tests after deploy.
- Do NOT send test emails or events. SendGrid still bouncing until DNS lands; calendar event writes will fail without OAuth tokens. Code correctly; Sean smoke-tests.
- Do NOT modify the Cal.com stopgap until Phase 2's native booker passes Sean's review — keep the stopgap working in parallel until the native version replaces it.

---

## What to deliver

1. New files: `services/ir/advisorFlow.js`, `services/officeHours/availability.js`, `services/officeHours/booking.js`, `services/officeHours/calendarSync.js`, `apps/business/src/components/canvas/OfficeHoursCard.jsx`, `apps/business/src/sections/OfficeHours.jsx` (settings UI)
2. Files modified: `functions/index.js` (6 new routes), `contracts/capabilities.json` (6 new capabilities)
3. New env vars (if any) listed in delivery report
4. New collections + Firestore writes listed
5. `npm run build` clean
6. Manual smoke-test plan (≤12 steps)
7. Stubbed/deferred items called out

---

## When to launch

Wait until **after** Sean has done the Phase 1 verification (#286): SAFE template uploaded, env vars set, deploy completed, end-to-end investor flow tested. That tells us the Phase 1 pattern actually works in production before we extend it to advisors. If Phase 1 reveals issues in the orchestrator pattern, we fix them once before Phase 2 inherits them.

---

*Filed 2026-05-24 evening as background prep work. Ready to launch agent on Sean's signal.*
