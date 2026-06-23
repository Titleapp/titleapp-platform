"use strict";

/**
 * mcpServer.js — Surface 4 T6 (CODEX 2026-06-22): a real MCP server.
 *
 * Model Context Protocol (Anthropic's open standard) over Streamable-HTTP
 * JSON-RPC. This is the credibility artifact behind "TitleApp is like MCP but
 * already built": an external model (Claude) can connect, discover SOCIII's
 * governed tools, and invoke them — under the SAME rules engine + capability
 * registry + audit ledger as every other caller (Surface 4 T1/T2).
 *
 * The governance is the point: the MCP surface exposes only NON-consequential
 * governed actions — read an overlay, and PROPOSE a worker change (which is
 * pending until a human approves). Approve/reject are deliberately NOT exposed
 * to MCP — they are human-only. Every MCP invocation is membership-gated and
 * written to auditLedger with `via: "mcp"`.
 *
 * Minimal but real: initialize / tools/list / tools/call / ping.
 */

const { recordInvocation } = require("../capabilityAudit");
const { enforceRoleGate } = require("../../middleware/membershipCheck");
const { getWorkerOverlay, createChangeProposal } = require("../workerOverlay");

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "sociii", title: "SOCIII Digital Workers", version: "0.1.0" };

// MCP tools we expose — each maps to a governed capability. Read + propose only;
// approve/reject stay human-only and are intentionally absent.
const TOOLS = [
  {
    name: "get_worker_overlay",
    capabilityId: "workers.read_overlay_v1",
    description: "Read the current per-tenant overlay (custom rules/prompt/config) for a Digital Worker. Returns null if the tenant runs the unmodified base worker.",
    inputSchema: {
      type: "object",
      properties: {
        tenantId: { type: "string", description: "The SOCIII tenant id." },
        slug: { type: "string", description: "The worker slug." },
      },
      required: ["tenantId", "slug"],
    },
  },
  {
    name: "propose_worker_change",
    capabilityId: "workers.propose_change_v1",
    description: "Propose a change to a Digital Worker's behavior (rules, system prompt, name, description). This does NOT take effect — it creates a pending proposal that a human in the tenant must approve. Use this to suggest fixes; a person confirms before anything goes live.",
    inputSchema: {
      type: "object",
      properties: {
        tenantId: { type: "string", description: "The SOCIII tenant id." },
        slug: { type: "string", description: "The worker slug to change." },
        overlay: { type: "object", description: "The fields to change, e.g. { raas_tier_1: [\"...new rules...\"] } or { systemPrompt: \"...\" }. Identity/billing fields are ignored." },
        rationale: { type: "string", description: "Why this change is proposed (shown to the human approver)." },
      },
      required: ["tenantId", "slug", "overlay"],
    },
  },
];

function jsonResult(id, result) { return { jsonrpc: "2.0", id: id == null ? null : id, result }; }
function jsonError(id, code, message) { return { jsonrpc: "2.0", id: id == null ? null : id, error: { code, message } }; }
function toolText(obj) { return { content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }], isError: false }; }
function toolErr(msg) { return { content: [{ type: "text", text: msg }], isError: true }; }

/**
 * Handle one MCP JSON-RPC message. Returns the response object, or null for
 * notifications (no response). ctx = { uid, email }.
 */
async function handleMcpRequest(body, ctx) {
  const { id, method, params } = body || {};
  switch (method) {
    case "initialize":
      return jsonResult(id, { protocolVersion: PROTOCOL_VERSION, serverInfo: SERVER_INFO, capabilities: { tools: { listChanged: false } } });
    case "ping":
      return jsonResult(id, {});
    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notifications get no response
    case "tools/list":
      return jsonResult(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call":
      return await handleToolCall(id, params, ctx);
    default:
      return jsonError(id, -32601, `Method not found: ${method}`);
  }
}

async function handleToolCall(id, params, ctx) {
  const name = params && params.name;
  const args = (params && params.arguments) || {};
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return jsonError(id, -32602, `Unknown tool: ${name}`);

  const tenantId = args.tenantId;
  if (!tenantId) return jsonResult(id, toolErr("Missing required argument: tenantId"));
  if (!ctx || !ctx.uid) return jsonResult(id, toolErr("Not authenticated"));

  // Same membership gate as every other tenant action.
  const gate = await enforceRoleGate(ctx.uid, tenantId, "member");
  if (!gate.ok) return jsonResult(id, toolErr(`Not authorized for tenant ${tenantId} (${gate.error}).`));

  try {
    if (name === "get_worker_overlay") {
      if (!args.slug) return jsonResult(id, toolErr("Missing required argument: slug"));
      const overlay = await getWorkerOverlay(tenantId, args.slug);
      await recordInvocation({
        capabilityId: tool.capabilityId, tenantId, userId: ctx.uid, callerType: "chat",
        input: { slug: args.slug }, output: { hasOverlay: !!overlay }, extra: { via: "mcp" },
      });
      return jsonResult(id, toolText({ slug: args.slug, overlay: overlay || null, hasOverlay: !!overlay }));
    }

    if (name === "propose_worker_change") {
      if (!args.slug || !args.overlay || typeof args.overlay !== "object") {
        return jsonResult(id, toolErr("Missing required arguments: slug and overlay (object)"));
      }
      const r = await createChangeProposal({ tenantId, slug: args.slug, fields: args.overlay, rationale: args.rationale, byUid: ctx.uid, source: "mcp" });
      await recordInvocation({
        capabilityId: tool.capabilityId, tenantId, userId: ctx.uid, callerType: "chat",
        input: { slug: args.slug, overlay: args.overlay }, output: { proposalId: r.proposalId || null, created: r.created }, extra: { via: "mcp" },
      });
      if (!r.created) return jsonResult(id, toolErr("That change touched only protected fields (ownership/billing), so nothing was proposed."));
      return jsonResult(id, toolText({
        proposalId: r.proposalId,
        status: "pending",
        summary: r.summary,
        note: "Proposed only — a human in this tenant must approve it before it goes live. MCP cannot approve.",
      }));
    }

    return jsonError(id, -32602, `Tool not implemented: ${name}`);
  } catch (e) {
    return jsonResult(id, toolErr(`Tool error: ${e.message}`));
  }
}

module.exports = { handleMcpRequest, TOOLS, PROTOCOL_VERSION, SERVER_INFO };
