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
    name: "list_workers",
    capabilityId: null, // public catalog — no tenant gate
    description: "List all publicly available SOCIII Digital Workers. Each worker is a governed AI agent for a specific business vertical (real estate, aviation, healthcare, accounting, HR, marketing, legal, etc.). Returns slug, name, vertical, description, and pricing tier.",
    inputSchema: {
      type: "object",
      properties: {
        vertical: { type: "string", description: "Optional filter by vertical: 'real-estate', 'aviation', 'healthcare', 'accounting', 'hr', 'marketing', 'legal', 'contacts', or 'platform'." },
        suite: { type: "string", description: "Optional filter by business suite: 'platform', 're', 'aviation', 'healthcare'." },
      },
      required: [],
    },
  },
  {
    name: "get_worker_info",
    capabilityId: null, // public catalog — no tenant gate
    description: "Get detailed information about a specific SOCIII Digital Worker by slug. Returns its capabilities, what data sources it reads, what outputs it produces, and how to subscribe.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The worker slug, e.g. 'platform-accounting', 'av-copilot', 're-title-ca'." },
      },
      required: ["slug"],
    },
  },
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

// Public worker catalog — surfaced via list_workers and get_worker_info MCP tools.
// This is the AEO/GEO layer: LLMs can discover what SOCIII workers exist and what
// they do without needing a SOCIII account.
const WORKER_CATALOG = [
  { slug: "platform-accounting", name: "Accounting Worker", vertical: "accounting", suite: "platform", description: "Real-time P&L, cash flow, and balance sheet from live Shopify + bank transactions. Generates PDF reports. Answers questions like 'Am I profitable this month?'", pricing: "free_trial" },
  { slug: "platform-hr", name: "HR Worker", vertical: "hr", suite: "platform", description: "Employee management, scheduling, PTO tracking, and compliance. Reads Google Drive for HR documents. Covers W-9/W-4, shift scheduling, and employment records.", pricing: "free_trial" },
  { slug: "platform-marketing", name: "Marketing Worker", vertical: "marketing", suite: "platform", description: "AI-powered campaign creation, content drafts, and direct publishing to X/Twitter, YouTube, and TikTok. Tracks campaign performance and manages draft approval workflows.", pricing: "free_trial" },
  { slug: "platform-contacts", name: "Contacts Worker", vertical: "contacts", suite: "platform", description: "Customer and vendor relationship management. Tracks interactions, follow-ups, and deal pipeline. Syncs with Gmail.", pricing: "free_trial" },
  { slug: "platform-control-center-pro", name: "Control Center Pro", vertical: "platform", suite: "platform", description: "Executive dashboard — KPIs, alerts, and cross-worker business health at a glance.", pricing: "free_trial" },
  { slug: "re-title-ca", name: "Real Estate Title Worker (CA)", vertical: "real-estate", suite: "re", description: "California parcel research, title chain analysis, ownership history, lien search, and property reports via ATTOM data. For title agents, escrow officers, and RE attorneys.", pricing: "professional" },
  { slug: "re-title-nv", name: "Real Estate Title Worker (NV)", vertical: "real-estate", suite: "re", description: "Nevada parcel research and title abstract. Full property data via ATTOM — APN lookup, ownership, deed chain, and encumbrances.", pricing: "professional" },
  { slug: "re-ce-nevada-001", name: "Nevada CE Courses Worker", vertical: "real-estate", suite: "re", description: "Nevada real estate continuing education tracker. Manages CE requirements, course completions, and license renewal deadlines.", pricing: "free" },
  { slug: "av-copilot", name: "Aviation CoPilot Worker", vertical: "aviation", suite: "aviation", description: "Flight planning assistant: live weather (METAR/TAF), NOTAMs, fuel planning, weight-and-balance, and route optimization. For Part 91 and charter operators.", pricing: "professional" },
  { slug: "av-mx", name: "Aviation MX Worker", vertical: "aviation", suite: "aviation", description: "Aircraft maintenance tracking: airworthiness directives, 100-hour/annual inspection schedules, logbook entries, and squawk management.", pricing: "professional" },
  { slug: "av-dispatch", name: "Aviation Dispatch Worker", vertical: "aviation", suite: "aviation", description: "Flight dispatch and crew scheduling. Weather releases, weight-and-balance sign-offs, and ATIS/clearance lookups.", pricing: "professional" },
  { slug: "platform-investor-relations", name: "Investor Relations Worker", vertical: "legal", suite: "platform", description: "SAFE/equity management, cap table tracking, 83(b) deadline monitoring, and investor update drafting. Integrates with Atlas/Stripe.", pricing: "professional" },
  { slug: "platform-real-estate-ca", name: "Property Research Worker (CA)", vertical: "real-estate", suite: "platform", description: "Residential property research for buyers and homeowners. APN lookup, recent sales, tax history, and neighborhood data via ATTOM.", pricing: "free_trial" },
];

function catalogBySlug(slug) { return WORKER_CATALOG.find(w => w.slug === slug) || null; }

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

  // Public catalog tools — no auth or tenant gate required.
  if (name === "list_workers") {
    let workers = WORKER_CATALOG;
    if (args.vertical) workers = workers.filter(w => w.vertical === args.vertical);
    if (args.suite) workers = workers.filter(w => w.suite === args.suite);
    return jsonResult(id, toolText({
      workers,
      count: workers.length,
      note: "Subscribe to any worker at https://sociii.ai/c/{slug}. To invoke a worker programmatically, connect via the SOCIII API with your tenant credentials.",
    }));
  }

  if (name === "get_worker_info") {
    if (!args.slug) return jsonResult(id, toolErr("Missing required argument: slug"));
    const worker = catalogBySlug(args.slug);
    if (!worker) return jsonResult(id, toolErr(`Worker '${args.slug}' not found. Call list_workers to see available workers.`));
    return jsonResult(id, toolText({
      ...worker,
      subscribeUrl: `https://sociii.ai/c/${worker.slug}`,
      apiPath: `/v1/worker:chat`,
      apiNote: "Workers are invoked via POST /v1/worker:chat with your SOCIII bearer token and x-tenant-id header. The worker responds with governed, rules-validated output.",
      mcpNote: "SOCIII is itself an MCP server — connect Claude or another LLM client to https://titleapp-frontdoor.titleapp-core.workers.dev/api with your SOCIII auth token.",
    }));
  }

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
