# Wearable Glasses Integration — Architecture Stub

**STATUS: STUB ONLY — DO NOT BUILD API**

This document reserves the architecture for wearable AR/MR glasses integration with the aviation Digital Worker vertical. No code should be written against this spec until the three open questions below are resolved with Ron Palmeri.

---

## Reserved Endpoint

```
POST /api/wearable/v1/visual-query
```

This endpoint is reserved in the API namespace but not implemented. Any request to this path should return `501 Not Implemented` with a JSON body:

```json
{
  "error": "wearable_api_not_available",
  "message": "The wearable integration API is not yet available. Contact support for timeline information.",
  "stub_version": "2026-03-05"
}
```

## Interface Contract

### Request

```json
{
  "frame_b64": "<base64-encoded image frame from glasses camera>",
  "gps_lat": 39.8561,
  "gps_lon": -104.6737,
  "worker_context": "av-004",
  "session_token": "<authenticated session token>"
}
```

| Field | Type | Description |
|---|---|---|
| frame_b64 | string | Base64-encoded image frame captured by the glasses camera. Target resolution: 1280x720 minimum. |
| gps_lat | number | Latitude of the wearer at time of capture. |
| gps_lon | number | Longitude of the wearer at time of capture. |
| worker_context | string | The worker ID that should process the visual query (e.g., "av-004" for aircraft status, "av-034" for LZ intel). Determines which Vault data and RAAS rules are applied to the response. |
| session_token | string | Authenticated session token. Must map to a valid tenant and user with access to the specified worker. |

### Response

```json
{
  "raas_tier_cleared": "tier_2",
  "vault_context": {
    "aircraft_tail": "N123AB",
    "mel_status": "1 active deferral — Category C, 6 days remaining",
    "next_inspection": "47.2 hours remaining"
  },
  "hud_output": {
    "overlay_type": "status_card",
    "title": "N123AB — Airworthy with MEL",
    "color": "yellow",
    "lines": [
      "MEL: ADF inoperative — Cat C — 6 days remaining",
      "Next 100-hour: 47.2 hrs",
      "AD status: All current"
    ]
  },
  "requires_human_approval": false,
  "audit_id": "wearable_query_abc123"
}
```

| Field | Type | Description |
|---|---|---|
| raas_tier_cleared | string | The highest RAAS tier that cleared for this response. Indicates which compliance layers were evaluated. |
| vault_context | object | Relevant Vault data retrieved for the visual query. Contents vary by worker_context. |
| hud_output | object | Formatted output for the heads-up display. Includes overlay_type, title, color coding, and text lines sized for HUD readability. |
| requires_human_approval | boolean | If true, the HUD displays a confirmation prompt before any action is taken. Enforces P0.AV2 (Workers advise, Humans approve). |
| audit_id | string | Unique identifier for this query in the audit trail. Every wearable query is logged as an immutable Vault event. |

## Latency Target

**< 800ms end-to-end** from frame capture to HUD overlay display.

Latency budget breakdown:
- Frame capture and encoding: ~50ms
- Network transmission (cellular/Wi-Fi): ~100ms
- Image recognition and OCR: ~200ms
- Vault query and RAAS evaluation: ~150ms
- Response formatting: ~50ms
- Network return: ~100ms
- HUD rendering: ~50ms
- Buffer: ~100ms

This target assumes edge compute for image recognition. If all processing is cloud-based, the target relaxes to <1200ms.

## Use Cases

### AV-004: Preflight Aircraft Inspection
The pilot or mechanic wears glasses during the preflight walk-around. When they look at the aircraft tail number, OCR reads the registration and the HUD displays: current airworthiness status, active MEL deferrals, hours to next inspection, and any open squawks. If the aircraft is grounded or has an expired MEL, the HUD displays a red overlay with the hard stop reason.

### AV-006/AV-007: Maintenance Inspection (Future Workers)
A mechanic looks at a component serial number plate. OCR reads the serial, queries the Vault, and the HUD displays: component TSN/TSO, remaining life, applicable ADs, and last inspection date. If an AD is overdue for this serial number, the HUD displays a red alert.

### AV-034: LZ Intelligence (Future Worker)
A pilot or ground crew member at a landing zone looks at the environment. Visual AI analyzes the frame for hazards: obstacles (wires, trees, poles), surface condition, slope, approach path obstructions. The HUD overlays hazard markers on the real-world view with distance estimates. GPS coordinates are logged for LZ database updates.

### AV-029: Alex Voice Query
Hands-free Vault query through Alex. The pilot or manager speaks a query ("Alex, what's the status of November-one-two-three-alpha-bravo?") and receives the response as a HUD overlay and/or audio response. No visual frame needed for voice queries — the glasses serve as the I/O device.

## Hardware Preference

| Platform | Position | Rationale |
|---|---|---|
| **Apple Vision Pro (Enterprise)** | Preferred for aviation | Enterprise device management, privacy architecture compatible with regulated data, high-resolution passthrough for maintenance inspection, spatial computing for complex visualizations |
| **Google (Android ecosystem)** | Secondary option | Broader Android device ecosystem, potential for lighter-weight glasses form factor, Google Cloud AI integration |
| **Meta (Quest/Ray-Ban)** | Not recommended | Privacy architecture incompatible with regulated aviation data (HIPAA, PII, operational records). Meta's data practices create unacceptable compliance risk for Part 135 operators handling patient data and crew records. |

## First Demo Target

The first wearable demo should target **property inspection** (Layton/Eschelman use case in the real estate vertical), **NOT** aviation. Rationale:
- Lower regulatory burden (no HIPAA, no FAA oversight of the device)
- Simpler visual recognition task (property condition vs. aircraft components)
- Existing customer relationship for feedback
- Faster path to demonstrable value

Aviation wearable integration should follow after the property inspection demo validates the core visual query architecture.

## Three Questions for Ron Palmeri

1. **Form factor**: What physical glasses form factor is acceptable for aviation crews? Lightweight glasses vs. full headset? Must they be compatible with aviation headsets (David Clark, Bose A20)? Weight and balance considerations for extended wear during duty periods?

2. **Latency profile**: What is the minimum acceptable latency for a maintenance inspection use case vs. a real-time flight operation use case? Can the system be useful at >1 second latency, or is sub-second response truly required? Is offline/cached mode acceptable (pre-load aircraft data before walk-around)?

3. **Go-to-market intent**: Is wearable integration a near-term product differentiator (demo within 6 months) or a long-term vision (2+ years)? This determines whether we invest in the visual AI pipeline now or stub it for later. Does Ron have existing hardware relationships or prototype devices?
