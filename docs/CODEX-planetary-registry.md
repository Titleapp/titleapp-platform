# CODEX: SOCIII Planetary Registry

**Status:** Parked — file for future build. Do not begin implementation until RE/education/aviation demos and WeFunder RegCF are complete.  
**Working product name:** SOCIII Planetary Registry  
**Historical IP name:** Interplanetary Title Registry (preserve for patent lineage, prior art, white papers)  
**Initial deployment target:** The Moon  
**Expansion targets:** Mars, Phobos, Deimos, near-Earth asteroids, other celestial bodies  
**Architecture lineage:** Title App Interplanetary Title Registry patent filing + Digital Title Certificate architecture + append-only Firestore event store  

---

## 1. Executive Summary

SOCIII will build a complete digital spatial and activity registry of the Moon using publicly available planetary imagery, elevation data, geological data, mission records, and other authoritative scientific sources.

The initial product organizes the lunar surface into persistent geographic units called **Planetary Reference Cells (PRCs)**. Each PRC is a stable spatial reference — not a parcel, not a deed, not a claim. It records what exists at a location, what has occurred there, what is proposed, who made each assertion, and what external authorizations have been issued.

The central design principle:

> **The registry records geography, activity, evidence, assertions, agreements, external authorizations, and adjudications. Registration alone does not create sovereignty or ownership.**

Where a legally recognizable interest is eventually created under an applicable legal framework, it may be represented through SOCIII's existing Digital Title Certificate architecture. That pathway is strictly gated — a project registration, scientific observation, or unilateral claim must never automatically create a DTC.

---

## 2. IP Lineage

This is not a new concept. It is an implementation of concepts previously described through:

- The **Interplanetary Title Registry** terminology and 2020 white paper
- Patent filings that explicitly state the registry applies "on earth or any planet or celestial object (meteor and such)"
- The Digital Title Certificate (DTC) parent-child record architecture
- The append-only event store (SOCIII's core architectural invariant)
- Geospatial registry and provenance systems already in production for terrestrial RE workers

**Preserve the phrase "Interplanetary Title Registry"** when referring to the historical Title App concept, patent claims, prior art, and archived white papers. The current public-facing product is "SOCIII Planetary Registry."

Recommended public language: *SOCIII's Planetary Registry builds upon the Interplanetary Title Registry concepts originally documented by Title App in 2020 and incorporated into its intellectual-property filings.*

---

## 3. The Misappropriation Risk

The biggest non-technical risk: this concept is one bad actor away from becoming a "buy land on Mars" scam that SOCIII gets associated with by proximity.

Guards that must be in place before any public launch:

1. **No transaction layer in the MVP.** The registry must not have a "buy," "reserve," or "claim" button at launch. It is a read layer + project-registration layer only.
2. **Explicit public language.** Every public surface must say: "Registration does not create ownership. SOCIII does not sell, transfer, or recognize territorial rights on any celestial body."
3. **Verification levels are public.** The 0–7 verification model (see §11) must be visible so users understand the difference between an unverified assertion and an external legal determination.
4. **No anonymous unlimited registration.** Actors must be identified; registration volume must be metered. This prevents land-rush behavior.
5. **Legal review before launch.** The Outer Space Treaty (1967) and US Commercial Space Launch Competitiveness Act (2015) govern resource extraction rights. The registry must be reviewed by space law counsel before any commercial launch.

The product positioning is: **pre-settlement infrastructure, not a claims marketplace.**

---

## 4. Architecture (maps to existing SOCIII stack)

```
Celestial Body
    ↓
Planetary Reference Cell (PRC)  ←→  Firestore collection: planetaryPRCs/{prcId}
    ↓
Observations, Events, Projects, Resources, Assertions  ←→  append-only subcollections
    ↓
Provenance chain (SOCIII append-only event store)
    ↓
Digital Title Certificate — only where a legally cognizable interest exists
```

### 4.1 Planetary Reference Cell (PRC)

A PRC identifies a persistent geographic area on a celestial body. It answers: **Where?**

A PRC does NOT represent ownership, title, sovereignty, a lease, a license, a mining right, an exclusive claim, or a Digital Title Certificate.

Each PRC should contain:
- Globally unique identifier: `MOON-PRC-L04-8F3A9C71`
- Celestial body, resolution level, polygon geometry, centroid, bounding box, area
- Elevation statistics (from LOLA or equivalent)
- Imagery references (LROC or equivalent)
- Source provenance (source name, authority, URL, version, retrieved_at, hash)
- Append-only event history reference
- Computed activity status

PRCs support hierarchical subdivision. A large PRC can be divided into smaller ones without invalidating prior history. Historical records attached to a parent PRC remain discoverable after subdivision.

### 4.2 Event (append-only)

An event is an immutable record of something asserted, observed, documented, or externally determined to have occurred. Examples: imagery acquired, mission landed, rover entered a PRC, sample collected, project proposed, objection filed, authorization issued, DTC created.

Events are append-only. Corrections create new events; prior records are never overwritten.

### 4.3 Project

A proposed, registered, approved, active, paused, completed, or abandoned activity associated with one or more PRCs. Examples: scientific survey, landing mission, rover traverse, habitat construction, mining exploration, heritage preservation, environmental monitoring.

A project is a first-class object — not a note attached to a map. A project does not automatically create a DTC or property right.

### 4.4 Digital Title Certificate (DTC)

A DTC is created only where there is an actual legally cognizable interest: recognized ownership under an applicable authority, an enforceable lease, a government-issued license, an adjudicated right, or a contractual interest supported by evidence.

A project registration, safety zone, scientific observation, or unilateral claim must NOT automatically create a DTC.

---

## 5. Verification Model (0–7)

Every registered item has a verification level:

| Level | Name | Description |
|-------|------|-------------|
| 0 | Unverified Assertion | Submitted without independent support |
| 1 | Documentary Support | Published documents, mission plans, gov records |
| 2 | Remote Observation | Remote sensing, orbital imagery, telemetry |
| 3 | Physical Presence | Verified spacecraft, rover, or person reached the location |
| 4 | Active Operation | Project is operating, producing current telemetry |
| 5 | Resource or Material Event | Physical sample collected, processed, or extracted |
| 6 | External Authorization | Government, treaty body, court, or regulator issued a determination |
| 7 | Digital Title Certificate | Legally cognizable interest represented through a DTC with provenance |

Verification level does not determine sovereignty. Higher levels mean better evidence, not broader international recognition.

---

## 6. Activity Layers

A PRC may have multiple overlapping layers — the system must not collapse all activity into one concept called "ownership":

- **Surface Activity:** habitat, roads, landing pads, equipment, solar, storage, rover operations
- **Subsurface Activity:** drilling, tunneling, extraction, lava-tube use, buried infrastructure
- **Mineral and Material:** water ice, regolith, metals, oxygen extraction, extraction assertions + licenses
- **Trajectory and Operational Volume:** ascent/descent corridors, ejecta zones, dust-plume impact, overflight risks (3D/4D geometries)
- **Communications and Spectrum:** radio frequencies, directional transmission zones, interference risk, relay coverage
- **Energy:** solar exposure, power-generation sites, nuclear installations, transmission corridors
- **Scientific:** protected geology, control areas, sampling restrictions, radio-quiet zones
- **Heritage:** Apollo landing sites, Luna sites, historic tracks, early robotic landers, human artifacts
- **Water:** detected/predicted deposits, sampling, extraction assertions, government authorizations
- **Legal Interest (DTC layer):** ownership recognized by applicable authority, lease, concession, operating license — only via DTC pathway

---

## 7. Data Sources (MVP priority — all public)

- NASA LRO / LROC imagery and metadata
- LOLA elevation data
- Apollo mission archives and landing records
- USGS Astrogeology datasets
- Luna, Chang'e, Chandrayaan, SLIM mission records
- ESA, JAXA, ISRO datasets
- IAU accepted lunar nomenclature (feature names)
- Official mission manifests and government-issued licenses where public

Every imported record must retain source provenance: `source_name`, `source_authority`, `source_url`, `source_dataset_id`, `source_version`, `retrieved_at`, `hash`.

SOCIII must not replace planetary science platforms. It adds the operational layer (PRC identifiers, AUDI-equivalent provenance, project registration, conflict analysis, AI reasoning) that connects these datasets to persistent locations and time-stamped activity.

---

## 8. Spatial Model (decision deferred)

The lunar surface must be divided using a hierarchical global grid. Options to evaluate when implementation begins:

- **S2 cells** adapted to lunar geometry
- **H3-like hierarchical indexing**
- **HEALPix** (used in astronomy — natural UH Hilo connection)
- **IAU-compatible planetary tessellation**
- **Custom equal-area planetary grid**

Requirements: deterministic cell identifiers, parent-child traversal, neighbor lookup, polygon intersection, variable resolution, polar stability, compatibility with standard GIS tools. The first release should not invent a new geodetic standard if an existing astronomical grid can be used.

**HEALPix is the leading candidate** given UH Hilo astronomy department connection (Mauna Kea observatories use it) and existing open-source tooling.

Recommended first PRC identifier format: `MOON-PRC-L04-8F3A9C71` (celestial body + resolution level + spatial index hash, no mutable legal status encoded).

---

## 9. MVP Product Goal (deferred)

A navigable, searchable, machine-readable map of the Moon divided into persistent PRCs, with publicly known lunar activity registered against the relevant cells.

User capabilities at launch:
- Navigate the lunar surface, select any PRC
- Inspect location, elevation, imagery, and known attributes
- View all missions and recorded activity associated with that PRC
- Register a proposed project (with identified actor, defined activity, supporting documentation)
- Identify overlapping projects before deployment
- Query through AI workers and public APIs

**Non-goals for initial release:**
- Sell lunar land
- Issue speculative deeds
- Create fee-simple ownership
- Assert sovereign jurisdiction
- Guarantee legal ownership
- Create speculative NFT parcels
- Allow anonymous unlimited registration
- Replace NASA, USGS, ESA, JAXA, ISRO, or other scientific archives
- Assign mineral ownership without an external legal basis

---

## 10. Go-to-Market Entry Point

**University of Hawaii, Institute for Astronomy (Hilo campus)** — natural first institutional partner. Sean operates out of Hilo flight base; UH operates Mauna Kea observatory complex. HEALPix is an astronomical standard they already use.

Proposed approach: demo a single seeded PRC (Apollo 11 landing site, Sea of Tranquility, 0.67°N 23.47°E) showing the canvas, mission history, assets, and verification model. Walk in with that. If they respond with "we want to register our observational data here," that is the validation signal to begin the full build.

**Demo PRC to build when ready:** `MOON-PRC-L04-TRANQUILITY-001`  
Canvas tabs: Map (LROC imagery), Mission History (Apollo 11 chain), Assets (LM, ALSEP, sample cache locations), Verification (Level 3 — physical presence confirmed 1969-07-20).

---

## 11. When to Resume

Resume this project when:
1. All five musketeers (Ruthie, Scott, Kimi, Elise, Sean) have working demo spaces
2. WeFunder RegCF application is filed and live
3. At least one of the five has a paid live deployment

At that point: write the demo PRC canvas, schedule UH Hilo meeting, commission space law review of the registry framing before any public announcement.
