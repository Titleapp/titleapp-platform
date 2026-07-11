# CODEX 27 — Picture-First Input: Visual Evidence as Platform Standard

**Principle established:** 2026-07-09  
**Scope:** All workflows across all verticals — RE maintenance, aviation MX, Vault/DTC, logbook entries, HR, and any field-work-facing surface.

---

## The Principle

Visual evidence is a **first-class audit artifact**, not an attachment. A photo of a leaking sink
timestamped and appended to a maintenance record is as load-bearing as the text description.
A Hobbs meter photo in an aviation logbook entry IS the Hobbs reading — not a supplement to it.

The append-only Firestore model + timestamped Storage reference = the same immutable chain you
have for text records, now applied to visual evidence. This is the same moat, wider.

**Every record type that documents a real-world condition should have typed photo slots:**
- `photo_before` / `photo_after` — for any work order or MX event
- `photo_evidence` — for any DTC or claim
- `photo_reading` — for any instrument or meter reading (Hobbs, odometer, oil level)
- `photo_signature` — for any sign-off or attestation (A&P stamp, inspector approval)

---

## MX Ticket Lifecycle Schema (Universal Pattern)

This is the canonical maintenance workflow. Use this for RE, aviation, home, and any asset
where physical work occurs. The ticket IS a logbook entry.

```js
{
  // Identity
  id: "mx_" + timestamp + "_" + random,
  asset_id: string,           // building, aircraft, vehicle, home, etc.
  unit_id: string | null,     // unit 214, N-number, VIN, parcel — granular anchor
  
  // Stage 1: Report
  status: "open",
  reported_at: Timestamp,
  reported_by: string,        // tenant, pilot, owner, staff
  description: string,
  category: string,           // "hvac", "plumbing", "structural", "avionics", "cosmetic", etc.
  severity_reported: "low" | "medium" | "high" | "emergency",
  photos_issue: string[],     // Firebase Storage URLs — photos at time of report
  
  // Stage 2: AI Review
  ai_review: {
    severity: "low" | "medium" | "high" | "emergency",
    recommendation: string,   // "assign to HVAC tech within 24hr", "tenant health risk", etc.
    suggested_assignee: string | null,
    reviewed_at: Timestamp,
    model: string,            // which AI model reviewed the photo
  } | null,
  
  // Stage 3: Assignment
  assigned_to: string,
  assigned_by: string,
  assigned_at: Timestamp,
  target_resolution_date: Timestamp,
  
  // Stage 4: Work Completed
  resolution_description: string,
  photos_resolution: string[],  // Firebase Storage URLs — photos of fix
  completed_at: Timestamp,
  completed_by: string,
  parts_used: string[] | null,
  cost_estimate: number | null,
  
  // Stage 5: Review + Sign-Off
  reviewed_by: string,
  signed_off_by: string,
  signed_off_at: Timestamp,
  photo_signoff: string | null,   // inspector/A&P approval photo if required
  
  // Audit
  demo: boolean,
  created_at: Timestamp,
  updated_at: Timestamp,
}
```

**Collection path:** `tenants/{tenantId}/maintenanceTickets/{ticketId}`  
For aviation: `tenants/{tenantId}/aircraft/{aircraftId}/logbook/{entryId}`  
For Vault: `tenants/vault/assets/{assetId}/logbook/{entryId}`

---

## AI Review Step

When a photo is submitted with a new ticket, Alex reviews it:
1. Assess severity (is this an emergency? health hazard? cosmetic?)
2. Recommend assignee and SLA
3. Flag regulatory issues (mold = habitability risk = 24hr response law in CA; HVAC in summer = health ordinance)
4. Draft the tenant-facing acknowledgment message

This is the CODEX 80 image governance flow applied to maintenance intake.

**Backend tool:** `review_maintenance_photo(photo_url, description, asset_type)` — calls
the AI with the image, returns structured assessment.

**RAAS rule:** If severity = "emergency" (water intrusion, gas leak, no heat/AC in extreme
weather), auto-escalate to Scott and trigger immediate vendor contact — no approval gate needed.

---

## Vertical Implementations

### RE Maintenance (Creekwood Commons Demo)

The 5 demo tickets (HVAC 214, roof 308, sink 4E, refrigerator 512, turnover 116) must each have:
- `photos_issue`: Fal.ai-generated images of the actual problem (see below)
- `ai_review`: pre-seeded assessment matching the severity
- Assigned to the correct MPG maintenance staff member
- Status appropriate to the demo timeline

**Fal.ai images to generate for demo:**
1. HVAC unit — frosted evaporator coils, condensate pan overflowing (unit 214)
2. Ceiling water stain — visible ring stain on drywall, slight bulge (unit 308)
3. Kitchen drain — standing water in sink, visible slow drain (unit 4E)
4. Refrigerator — door gasket gap, condensation on contents (unit 512)
5. Unit turnover — scuffed baseboards, worn carpet at entryway (unit 116 before state)
6. Unit turnover resolution — fresh paint, new carpet installed (unit 116 after state)

Store at: `demo/re/maintenance/{ticket_id}_{issue|resolution}.jpg`

### Aviation MX (for when #54 aviation overhaul ships)

Every logbook entry should support:
- `photo_reading`: Hobbs meter reading photo, tach reading, oil level dipstick
- `photo_defect`: squawk item — what the pilot or A&P found
- `photo_repair`: what was replaced or fixed
- `photo_signoff`: A&P logbook endorsement (photo of paper logbook entry with stamp)

The aviation MX worker's "add squawk" flow should prompt: "Attach a photo of what you found."

### Vault / DTC (Home, Vehicle, Medical)

DTC records should support a `photos` array with typed roles:
- `acquisition`: photo at time of purchase (receipt, item condition, serial number)
- `condition`: periodic condition documentation
- `damage`: photo at time of damage event or claim
- `repair`: photo after repair or restoration
- `disposal`: photo at time of sale or disposal

The Vault logbook entry flow should have a camera/upload CTA as step 1, not an afterthought.

### Medical (Vault / FERPA-adjacent)

- Prescription label photo → AI reads the drug name, dosage, refill date, pharmacy
- Test result scan → AI extracts key values (A1C, cholesterol panel, etc.) into structured fields
- Procedure documentation → timestamp + provider attestation photo

---

## Canvas Display Requirements

Any canvas tab that shows MX records, logbook entries, or DTC items must display photo thumbnails:

```
[ Ticket card ]
  [ Photo thumbnail (issue) ]  ← tappable, opens full-size
  Title: HVAC not cooling — Unit 214
  Status: In Progress · Assigned: Ray Estevez · Day 4
  AI review: High severity · 24hr SLA · health risk in summer heat
  [ Photo thumbnail (resolution) ]  ← blank until resolved
```

If no photo: show a camera icon placeholder with "Add photo" CTA — never a blank gap.

---

## Storage Path Conventions

```
tenants/{tenantId}/maintenance/{ticketId}/issue_{n}.jpg      — report photos
tenants/{tenantId}/maintenance/{ticketId}/resolution_{n}.jpg — completion photos
tenants/{tenantId}/maintenance/{ticketId}/signoff.jpg        — sign-off photo
tenants/{tenantId}/vault/{assetId}/{role}_{timestamp}.jpg    — Vault DTC photos
tenants/{tenantId}/aircraft/{aircraftId}/logbook/{entryId}/{role}.jpg — aviation
demo/re/maintenance/{ticket_id}_{role}.jpg                   — demo seeded images
```

---

## Build Prerequisites

Before this pattern can be implemented:
1. Firebase Storage upload UI (camera + file picker) — must work in both web and mobile
2. Storage URLs must be saved to Firestore records on upload (not local-only)
3. AI image review tool in the backend (`review_maintenance_photo`)
4. Canvas thumbnail component (reusable across all verticals — not RE-specific)
5. Fal.ai image generation for demo maintenance photos (RE demo seed)

---

## Wearable + Sensor Input (Near-Term Stub, Long-Term Moat)

Picture-first input is the bridge to wearable and IoT sensor input — the same pipeline, a
different capture device. The architecture doesn't change; the submission method does.

**The pattern is identical:**
- Phone camera → photo → Storage URL → AI review → Firestore record
- Smart watch camera (Apple Vision, Ray-Ban Meta) → photo/video → same pipeline
- IoT sensor (Hobbs transponder, smart thermostat, leak detector) → reading → same record format

**Why this matters more than a talking point:**
- Maintenance MX: a smart leak sensor in apartment 308 fires when it detects moisture. The alert
  creates a maintenance ticket automatically — same schema, same lifecycle — with the sensor
  reading as `photo_evidence` (or `sensor_reading` typed field). Ray Estevez gets assigned before
  the tenant even notices the ceiling stain.
- Aviation: an EFB or ForeFlight integration pipes Hobbs time automatically into the logbook entry.
  The pilot takes a photo to confirm — but the Hobbs reading isn't manual handwriting anymore.
- Vault: a home security camera or Ring doorbell captures a delivery event; it can mint a DTC
  entry for a delivered package (tracking + condition at time of delivery). Same model.

**Stub to add to capabilities.json (not yet built, but reserve the capability IDs):**
```json
{ "id": "platform.submit_sensor_reading_v1", "description": "Submit a sensor reading (IoT, wearable) as a Firestore record with the standard evidence schema" },
{ "id": "platform.submit_photo_evidence_v1", "description": "Submit a photo as typed evidence attached to any record (MX ticket, DTC, logbook entry)" },
{ "id": "platform.ai_review_visual_evidence_v1", "description": "Run AI review on a submitted image — returns severity, structured assessment, suggested action" }
```

These capability IDs make the wearable story concrete in demos: "the system already has the
capability slot for Apple Watch camera input — we're not hand-waving, we're showing you where
the wire goes."

## Forward References

- RE demo maintenance tickets: CODEX 25 (seed `maintenanceTickets` collection with photos)
- Aviation MX logbook photo slots: CODEX 54 (aviation overhaul, when shipped)
- Vault DTC photo slots: extend the DTC model (existing `files` array → typed `photos` map)
- RAAS image governance: CODEX 80 (rules already written, need to wire to this intake flow)
- Wearable/IoT sensor input: capability stubs above; build as part of CODEX 54 (aviation) or a future CODEX 28
