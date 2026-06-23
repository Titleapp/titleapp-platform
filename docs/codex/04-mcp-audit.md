# CODEX Surface 4 — MCP + Audit Trail (the moat / sale memo)

**Status:** 🟡 anchoring REAL & on cron; capability-audit + MCP hollow · **Owner:** Sean · 2026-06-22
**Why it matters:** the append-only owned record + rules engine + **AUDIT trail on
tool/capability invocations** is the patent, the moat, and the sale memo. MCP is the *port*
(interop/distribution), not the moat. "TitleApp is like MCP but already built" — this surface is
where we make that literally true, and claim only what's real (red-team P2).

---

## Objective
Every governed action (capability/tool invocation) records **who** did **what**, under **which
rule verdict**, append-only and tamper-evident — and SOCIII exposes its workers/Vault as a
**real MCP server** so Claude can connect + act under the rules engine.

## What's built vs. the gap (audit 2026-06-22)
**REAL — lead with this:**
- 🟢 **Bitcoin/Merkle anchoring, on a cron.** `services/anchor/hashAnchor.js` (SHA-256 canonical
  serialization) + `services/anchor/dailyBatchAnchor.js` (RFC-6962 Merkle → OpenTimestamps) +
  `exports.dailyDtcAnchorBatch` scheduled `0 2 * * *`; `confirmOpentimestampsReceipts` every 6h.
  Crossmint on-chain mint pipeline built + scheduled (env-gated).
- 🟢 **Append-only Vault logbook.** `services/vault/vaultWriter.js` — "mint once, append forever,"
  `createdByWorker` provenance, `vault_writes` permission gating. Used by the live nursing path.
- 🟢 **Chat rules-verdict persisted** to `messageEvents.enforcement` (`index.js:1415`).

**HOLLOW — do NOT claim until wired:**
- 🔴 `contracts/capabilities.json` (54 caps with `emitsEvent`/`writesAudit` flags) is **never read
  at runtime** — zero references. The "permission matrix is source of truth" is unenforced.
- 🔴 `auditLedger` (the one schema that matches "capability invocation audit") is written by
  **exactly one test stub** — `index.js:12060`, `isTestAnchor:true`. No production path writes it.
- 🔴 Worker + analyst rules-verdicts are **discarded** (console.warn, no persist). `callAIWithEnforcement`
  has **zero prod callers**.
- 🔴 **No MCP server exists** (zero `modelcontextprotocol` hits).
- 🟠 Tamper hole: `dtc:refresh-value` mutates hashed `metadata` without re-hashing (`index.js:20821`).
- 🟠 Append-only is convention, not rule-enforced (no immutability rule on `dtcs`/`logbookEntries`/`auditLedger`).

## Turn-on tasks
- [ ] **T1 — Capability dispatcher reads `capabilities.json`.** One choke-point that, per
      capability, enforces `allowedCallers/requiredKyc/requiredRoles` before execution. (Makes the
      "source of truth" real — task #44.)
- [ ] **T2 — Write every invocation to `auditLedger`** (production, not the test stub): actor uid,
      tenantId, capability id+version, inputHash, outputHash, rules verdict + which rule fired, ts.
- [ ] **T3 — Persist worker + analyst verdicts** (stop discarding `workerEnforcement`).
- [ ] **T4 — Immutability rules** for `dtcs`/`logbookEntries`/`auditLedger` (`allow update/delete: if false`).
- [ ] **T5 — Close the tamper hole:** re-hash on any path that mutates hashed fields, or move
      mutable fields (e.g. value) out of the hashed set + into appended events.
- [ ] **T6 — Minimal real MCP server.** Claude connects, reads a real Vault record, invokes ONE
      worker capability under the rules engine, and the invocation lands in `auditLedger` (T2). Small
      but genuine — the credibility artifact for Anthropic / acquirers (task #78 overlaps).

## RED TEAM
- 🔴 **RT1 — Claiming MCP/audit before it's wired = becoming the hype we mock** (P2). The one
  audience that can tell (Anthropic) will tell. **Mitigation:** claim ONLY T1–T6 as they land;
  until then the public claim is the *anchoring + append-only Vault* (which is real).
- 🟠 **RT2 — A real dispatcher reading capabilities.json could break 54 existing flows** that
  currently run ungoverned. **Mitigation:** ship T1 in shadow/log-only mode first (record what it
  *would* block), then enforce.
- 🟠 **RT3 — auditLedger becomes write-amplification / cost** at scale. **Mitigation:** Tier-1
  volumes are modest; batch-anchor already exists; index deliberately.
- 🟠 **RT4 — Fragmented audit stores** (`auditTrail`, `auditLedger`, `messageEvents`, `logbookEntries`,
  `ledger`, per-deal `auditLog`) = no single query surface for diligence. **Mitigation:** define one
  canonical audit read-view; T2 standardizes the schema.
- 🟡 **RT5 — Patent vs. trade-secret tension.** Disclosing the audit/anchor design in a provisional
  vs. keeping it secret. **Mitigation:** Surface 8 — patent the novel claims, keep implementation
  detail as trade secret; few strong claims (P6).

## Sign-off gate
Public "MCP + audit trail" claim only after T1+T2+T6 demonstrably work (Claude connects, invokes a
capability, the invocation + verdict is in `auditLedger`, the record anchors). Anchoring +
append-only Vault may be claimed today.
