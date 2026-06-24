# CODEX Surface 10 — Personas, Connectors & Enterprise Onboarding

**Status:** 🟡 model LOCKED 2026-06-24 · mostly forward-looking (capture-to-prevent-drift) · **Owner:** Sean
**Source:** 2026-06-24 working session (Sean) — stress-tested by his real life: SOCIII=Google, Life Flight Network=Microsoft 365 + Workday, Personal=Google + iCloud Photos. This codex pins the decisions so they don't drift as we build email/Drive/e-sign connectors.

---

## Objective
One person, many contexts, many providers — with **zero data bleed between them** and a UX where you always know which context you're in. SOCIII = a **provider-agnostic, governed connector hub**, not a Google-Drive-specific tool.

## The locked mental model
- **ONE you. ONE Vault.** The Vault is always yours, cross-context — your permanent personal records (`tenantId="vault"` + uid). **Singular and personal.**
- **MANY personas = workspaces** (Personal, SOCIII, Life Flight, side-hustle). Each is a **silo** with its OWN data, connectors, and workers. **Plural and per-persona.**
- Crisp rule: **Vault is singular & personal; everything else (Drive, data, workers, connectors) is plural & per-persona.**

## A persona is a BUNDLE OF CONNECTORS (multi-provider)
Storage is just one connector type. So are email, calendar, and enterprise systems-of-record. Each persona attaches the connectors *its* real-world context uses:

| Persona | Storage | Comms | System of record |
|---|---|---|---|
| Personal | personal Google Drive · iCloud Photos | personal Gmail | — |
| SOCIII | Google Workspace Drive | Gmail | (own) |
| Life Flight | Microsoft OneDrive / SharePoint | Outlook | **Workday** (HR/payroll) |

**Never hardcode "Drive = Google."** The connector layer is pluggable + per-persona.

### Connector difficulty tiers (honest — don't overpromise)
1. **CLEAN** — Google Workspace, Microsoft 365. OAuth + MCP/Graph. **Build first.**
2. **ENTERPRISE-GATED** — Workday (and peers). Has APIs, but the **employer's IT must provision access**; an individual employee cannot self-connect. Data is the employer's, governed by their policy. SOCIII's per-persona **isolation + audit respecting that boundary is the enterprise selling point.**
3. **WALLED GARDEN / HARD** — Apple iCloud Photos. Almost no clean third-party/server API. Manual-export or out-of-scope. **Do not promise it.**

## Who gets which workers — by relationship (the provisioning rule)
A persona = a tenant; your **membership role** determines how its worker stack is populated. The spine (5 spine workers + Alex) comes with a workspace you **OWN**, NOT with every relationship:

| Relationship | DB shape | Worker stack | Spine? |
|---|---|---|---|
| **Account holder / owner** (you sign up, create a workspace) | membership role `owner`/`admin` on your tenant | you self-subscribe; auto-provisioned spine | ✅ yes (scoped to that tenant's data) |
| **Employee** | membership role `member` on the org's tenant | org admin provisions a **role-based** stack (Workday-chiclet idea) | ❌ not automatically — only what the role needs |
| **Customer of a business** (Meadow Vet) | membership role `customer`/`client` on the business's tenant | only the **customer-facing workers the business exposes** + a Vault link | ❌ no — you aren't running a business |

Key consequences:
- Even between two OWNED workspaces, spine instances are **separate** — your SOCIII Accounting (SOCIII's books) ≠ your Personal Accounting (your money). Same worker TYPE, different DATA, different tenant.
- **Today's code rule "every workspace gets the 5 spine + Alex" must become relationship-aware:** fire spine auto-provision on **owned-workspace creation only**, NEVER on a customer membership. A customer membership = `role: customer` + Vault link + granted customer workers, no spine.
- The **Vault** is the cross-cutting bridge for ALL relationships: a customer with no spine still gets a Vault so the business's workers can push records (vet records, invoices) into it with consent.

## Workers: portable by TYPE, siloed by DATA
- The worker **type** is portable — add an Accounting (or Tax) worker to any persona.
- Every **instance operates ONLY inside that persona's silo** (R2 isolation — hardened in Surface 1). Personal worker never sees work data; work worker never sees personal data.
- The **only bridge is the Vault**, and pulling a Vault doc into a workspace task is **explicit + consent-gated** — never automatic.
- "Use my personal worker on work data" is not a gap — isolation **forbids** the bleed by design; portability of the type is the feature.

## Drive-into-a-worker = a connector action, NOT a nav trip
- **Browse/manage** your Drive → the left-nav "Drive" page (leaves the worker — fine, different task).
- **Use a doc in a worker** → happens **inside the worker** via an import/attach affordance (the `DriveImportModal`, already built + used in Vault) or chat drop. You never leave the worker.
- Already real: the Accounting worker has an in-worker **"Upload statement (PDF/XLSX)"** → `accounting:statements:parse` → Claude extracts + categorizes against the CoA → review → `:commit`. Gap = wire `DriveImportModal` so it can pull from the connected Drive (not just desktop upload).

## Enterprise onboarding (Business-in-a-Box for orgs)
- **Org adopts → org admin/IT connects org-level connectors ONCE** (Workday, M365) → **every member's persona inherits them, permission-scoped.** A pilot inherits the Workday *connector* but sees only their own records + entitled folders — not company payroll. The org connects the pipe; each user's access flows through their role.
- **Alex walks IT through the integration — like a worker build.** Connecting Workday = credentials + field mapping + permission scoping. Alex + Claude + Code guide the admin conversationally; for systems without a clean connector it **becomes a custom integration worker**.
- **Enterprise IT learns to build workers** (via the SDK) — they become the org's internal worker-builders, extending SOCIII for their own systems. The creator model, pointed inward → the enterprise scales itself.

## The PARALLEL-SYSTEM case = the bottom-up wedge (super critical — Sean 2026-06-24)
Real case: **Ruthie at University of Hawaii does her work in her own GDrive, parallel to the university's official system.** This is the norm, not the exception — practitioners run their real day-to-day in personal/departmental tools alongside the slow, IT-gated system of record. **This parallel reality is SOCIII's way in, not a problem to solve.**

Two motions:
1. **BOTTOM-UP (the parallel GDrive) — works today, ZERO institutional IT.** The practitioner connects *her own* Google account to *her* SOCIII persona; SOCIII operates on her parallel workspace immediately. No provisioning, no committee. This is the CLEAN-tier self-serve connector and the **land** motion (how Dropbox/Notion/Slack entered orgs — via individuals before IT signed off).
2. **TOP-DOWN (the institution's SIS/LMS) — later, if the org adopts.** Business-in-a-Box → IT provisions the connector to the real system of record → members inherit, permission-scoped. The **expand** motion; it can wait.

**The governance kicker (the actual pitch):** the practitioner's parallel work currently sits ungoverned in a raw personal Drive — e.g., student educational records outside the SIS = a **FERPA exposure**. SOCIII doesn't fight the shadow work; it **brings audit + governance to it** (immutable, attested, consent-scoped via the Vault/DTC substrate — see [[learning-record-substrate]]) AND provides a clean path to **promote/reconcile** it into the official SoR when the institution integrates. So SOCIII makes the shadow work *more* compliant than the status quo and becomes **the bridge between the practitioner's parallel reality and the institution's official record** — never blocked waiting for the org's IT.

## Persona clarity (UX — safety-critical)
When data, Drive, AND workers all swap with the persona, the active persona must be **unmistakable** (prominent name + per-workspace color/tint, not a subtle dropdown). Ambiguity here is the **same failure class as the cross-pollination leak** — getting it wrong shows the wrong context's data. **Pre-film quick win.**

## Cross-worker lane discipline + recommend-the-unowned (2026-06-24)
- Specialized workers **stay in their lane** (deflect cross-domain to the right worker). Only **COS Alex** has the global cross-domain view. (Enforced via the CROSS-WORKER ROUTING rule + own-domain carve-out, Surface "chat fixes" 2026-06-24.)
- **COS Alex must know the FULL catalog** to **recommend a worker the user does NOT own** ("you'd want the X worker — want me to add it?"), not say "not available." Ties to one-click-subscribe marketplace (task #68).

---

## Turn-on tasks (build order, post-video)
- [ ] **T1 — Per-persona connector model in code.** A persona owns a set of connectors; provisioned per-workspace (not per-user-global). Storage already scopes by workspace (`storageObjects.orgId`, `users/{uid}/business/{tenant}/...`).
- [ ] **T2 — Google connector (Drive + Gmail + Calendar)** — CLEAN tier, #1. Unlocks email, Drive-pull-into-worker, and e-sign pickup (one connector, three wins — see Surface "e-sign").
- [ ] **T3 — `DriveImportModal` into the Accounting worker** — pull a statement from the connected Drive, in-context.
- [ ] **T4 — Microsoft 365 connector** (OneDrive/Outlook) — CLEAN tier, fast-follow for M365 orgs.
- [ ] **T5 — Org-level provisioning + inheritance (permission-scoped)** — the Business-in-a-Box enterprise flow.
- [ ] **T6 — Workday (and enterprise SoR) connector** — guided, Alex-assisted, IT-provisioned. Possibly a custom integration worker.
- [ ] **T7 — Persona-clarity UX** — unmistakable active-persona indicator. *(Pre-film candidate.)*
- [ ] **T8 — COS recommend-the-unowned-worker** rule + one-click add (#68).

## RED TEAM
- 🟡 **RT1 — Cross-persona data bleed.** The whole point. Mitigation: R2 isolation (hardened Surface 1) + Vault-only bridge with consent gate + persona-clarity UX. Any connector that can read across personas is a bug.
- 🟡 **RT2 — Overpromising connectors.** iCloud has no clean API; Workday is employer-gated. Mitigation: the difficulty tiers above; never demo a connector we can't actually provision.
- 🟡 **RT3 — Employee pipes employer data into a personal tool without authorization.** Mitigation: enterprise connectors are org-provisioned + permission-scoped + audited; the employer governs. Sell the boundary, don't bypass it.
- 🟡 **RT4 — "Connect everything" scope creep buries the films.** Mitigation: this whole surface is POST-VIDEO. Pre-film, only T7 (persona clarity) is a candidate.

## Sign-off gate
A user with 3 personas (Personal/Google+iCloud, SOCIII/Google, Life Flight/Microsoft+Workday) operates each with its own connectors + workers, **zero cross-bleed**, always knowing which persona they're in — and an org admin can connect once and have members inherit, permission-scoped. None of it required for the 2026-06-24 films except T7.
