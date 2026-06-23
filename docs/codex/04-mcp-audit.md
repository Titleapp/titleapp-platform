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
- [~] **T1 — Registry consulted at runtime.** ✅ **BUILT + LIVE 2026-06-22** (shadow mode per RT2).
      `services/capabilityAudit.js` `checkCapability()` reads `capabilities.json` (now bundled with
      the function — `firebase.json` predeploy syncs the canonical repo-root copy into the package;
      root stays the single source of truth) and verifies `allowedCallers`. Currently **records**
      what it would block (e.g. a `chat` caller invoking `approve_change` → wouldBlock) without
      enforcing yet. ⏳ flip to enforce after shadow data confirms the matrix. Added 4 worker-change
      capabilities to the registry (now 58) — advances #44.
- [x] **T2 — Real `auditLedger` writes.** ✅ **BUILT + LIVE 2026-06-22.** `recordInvocation()` writes
      a production entry (`isTestAnchor:false`) per governed action: capabilityId, class, tenantId,
      userId, callerType, **SHA-256 inputHash + outputHash**, registry verdict, enforcementMode.
      Wired into all 5 worker-change actions (set_overlay / propose / fromChat / approve / reject).
      **Verified live: `scripts/test/s4CapabilityAudit.js` 9/9** — real entries, hashes, registry
      consulted, verdicts, not the stub.
- [ ] **T3 — Persist worker + analyst rules verdicts** (stop discarding `workerEnforcement`). ⏳
      remaining — pass the rules-engine verdict into `recordInvocation({rulesVerdict})` (the field
      already exists on the ledger schema; just needs the chat path to populate it).
- [~] **T4 — Immutability rules.** ✅ `auditLedger` now explicitly immutable + admin-read in
      `firestore.rules` (`create/update/delete: if false`). ⏳ `dtcs`/`logbookEntries` rule-level
      guards deferred (they're already server-only/append in code; lower priority).
- [ ] **T5 — Close the tamper hole** (`dtc:refresh-value` mutates hashed `metadata` w/o re-hash). ⏳ remaining.
- [x] **T6 — Real MCP server.** ✅ **BUILT + LIVE 2026-06-22.** `POST /v1/mcp` speaks MCP
      Streamable-HTTP JSON-RPC (`services/mcp/mcpServer.js`): `initialize` / `tools/list` /
      `tools/call` / `ping`. Exposes 2 governed tools — `get_worker_overlay` (read) and
      `propose_worker_change` (governed write → pending proposal). Every call is Firebase-bearer
      authed, membership-gated, and written to `auditLedger` with `via:"mcp"` (T2). **The governance
      is the story:** MCP can *propose* but exposes **no approve tool** — a human must approve before
      anything goes live; cross-tenant calls are rejected. **Verified live: `scripts/test/s4McpServer.js`
      9/9** — initialize → tools/list → propose-via-MCP (pending, audited, not applied) → human
      approve → live; cross-tenant → not authorized. This is the "MCP but already built" artifact.
      ⏳ next: OAuth (vs Firebase bearer) + more read tools + registry listing (Surface 7).

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
