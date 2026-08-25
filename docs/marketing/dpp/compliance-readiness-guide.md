# The Battery Digital Product Passport Readiness Guide

*A practical, cluster-by-cluster checklist for manufacturers preparing for the EU Battery Regulation's Digital Product Passport requirement — published by SOCIII.*

**Who this is for:** manufacturers of EV batteries, LMT batteries (e-bikes, e-scooters), and industrial batteries over 2kWh who sell into the EU. If you make or import batteries in these categories, this deadline applies to you regardless of company size.

---

## The deadline, stated plainly

**18 February 2027** — EV, LMT, and industrial (&gt;2kWh) batteries all become Digital Product Passport-mandatory on this single date. There is no separate, later date for any of the three categories. This is roughly six months away as of this guide's publication.

The requirement comes from **Regulation (EU) 2023/1542** (the EU Battery Regulation), specifically the Annex XIII data requirements. The **EU DPP Central Registry** — the directory that resolves a product's identifier to where its passport data actually lives — went live for real submissions on **20 July 2026**.

One thing worth understanding early: **the registry is a directory, not a data host.** Submitting to it doesn't mean uploading your passport data to the EU — it means registering *where* your passport is hosted (with you, or with a platform like SOCIII) so the registry can point to it. Getting this backwards is a common early misunderstanding.

---

## The seven clusters, and what's actually in each

A complete battery passport covers 90 data attributes, organized into seven clusters. Most manufacturers already have most of this data somewhere — the real work is consolidating it, not generating it from nothing.

### Cluster 1 — General battery & manufacturer information (12 attributes)
The baseline identification data: manufacturer name and address, battery model, GTIN or other unique identifier, battery category (EV/LMT/industrial), place of manufacture, and date of manufacture. **Typically already on hand** — this is close to what's on an existing spec sheet or nameplate.

### Cluster 2 — Compliance, labels & certifications (8 attributes)
CE marking status, applicable harmonized standards, declaration of conformity references, and any existing certifications. **Source internally** — usually sits with whoever handles regulatory affairs or quality assurance today.

### Cluster 3 — Battery carbon footprint / LCA (15 attributes) — the hard gate
Life-cycle carbon footprint data, typically requiring a **third-party-verified LCA (Life Cycle Assessment)** from an accredited assessor (e.g., TÜV, Bureau Veritas, SGS). **This is the cluster to start first, not last** — it's the single most common bottleneck, since third-party LCA assessment takes real calendar time to schedule and complete, and a passport cannot be finalized without it. If you haven't engaged an LCA assessor yet, that's the first call to make.

### Cluster 4 — Supply chain due diligence (18 attributes)
Sourcing information for critical raw materials (cobalt, lithium, nickel, natural graphite), including due-diligence documentation under the Battery Regulation's Articles 52–54. **This is the cluster that depends on someone other than you** — your cell or material suppliers. Start this conversation with suppliers now; response time is usually the long pole here, not the data itself.

### Cluster 5 — Battery materials & composition (14 attributes)
Chemical composition, hazardous substance content, and material breakdown by weight. **Usually available from your cell/pack supplier's technical datasheet** — cross-check against what Cluster 4 gathers, since the two overlap in practice.

### Cluster 6 — Circularity & resource efficiency (10 attributes)
Recycled content percentages, recyclability design information, and end-of-life handling instructions. **Often the least-prepared cluster** for manufacturers who haven't previously had to report on circularity — budget extra time here if this is new territory.

### Cluster 7 — Performance & durability (State of Health) (13 attributes)
Rated capacity, expected cycle life, and (for in-service tracking) State of Health data from battery management system (BMS) telemetry where available. For batteries not yet in service, this is largely spec data; for a fleet already deployed, real BMS connectivity matters — SoH figures without a live BMS connection are estimates, not measured data, and should be labeled as such.

---

## A realistic sequencing plan

1. **Start Cluster 3 (LCA) today, if you haven't.** It has the longest external lead time and blocks everything downstream.
2. **In parallel, reach out to suppliers for Clusters 4 and 5.** Their response time, not your own data entry, is usually the critical path.
3. **Consolidate Clusters 1, 2, and 6 internally** — these rarely require outside parties and can move fast once someone owns the task.
4. **Cluster 7 last**, unless you already have BMS telemetry flowing — spec-level data is enough to start, live data can be added once available.
5. **Confirm your GS1 GTIN is current** before generating any passport — the passport's public QR code (a GS1 Digital Link) resolves against your existing GTIN, not a new identifier. If you don't have a GS1 membership yet, that's a separate, earlier step to complete — most manufacturers already have this for retail barcoding, but it's worth confirming rather than assuming.

---

## What "done" looks like

A passport is genuinely export-ready only once Cluster 3 reaches 100% completion — every other cluster can be partially populated and iterated, but the carbon-footprint gate is a hard requirement, not a formality. Once complete, an export-ready passport is eligible for registration with the EU DPP Central Registry, at which point it receives a real registry ID and a scannable, GS1 Digital Link-compliant QR code.

---

*This guide reflects the authors' understanding of the EU Battery Regulation and EU DPP Central Registry as of August 2026 and is provided for general informational purposes — it is not legal advice. Confirm current requirements with qualified counsel before making compliance decisions.*

*Published by SOCIII, Inc. — [sociii.ai](https://sociii.ai)*
