// QA-001 check: tool-inventory
// Verifies that key COS tool definitions and their handlers exist in index.js.
// Catches the class of bug where a tool is defined but the handler branch is
// missing (or vice versa), or where a shipped feature's tool was accidentally
// removed. Add an entry here whenever a new tool is shipped.

const fs = require("fs");
const path = require("path");

const INDEX = path.resolve(__dirname, "../../../functions/functions/index.js");

// Each entry: { tool, definition, handler, description }
// definition: string that must appear in the tool definitions array
// handler:    string that must appear in the tool handler switch/if chain
const REQUIRED_TOOLS = [
  { tool: "push_alert",            definition: 'name: "push_alert"',            handler: "_cosToolBlock.name === 'push_alert'",            description: "Operating Feed — push alert" },
  { tool: "resolve_alert",         definition: 'name: "resolve_alert"',         handler: "_cosToolBlock.name === 'resolve_alert'",         description: "Operating Feed — resolve alert" },
  { tool: "snooze_alert",          definition: 'name: "snooze_alert"',          handler: "_cosToolBlock.name === 'snooze_alert'",          description: "Operating Feed — snooze alert" },
  { tool: "get_campaigns",         definition: 'name: "get_campaigns"',         handler: "_cosToolBlock.name === 'get_campaigns'",         description: "Cross-worker: list marketing campaigns" },
  { tool: "get_shopify_orders",    definition: 'name: "get_shopify_orders"',    handler: "_cosToolBlock.name === 'get_shopify_orders'",    description: "Shopify: fetch recent orders on demand" },
  { tool: "get_shopify_products",  definition: 'name: "get_shopify_products"',  handler: "_cosToolBlock.name === 'get_shopify_products'",  description: "Shopify: fetch product catalog + DPP lookup" },
  { tool: "campaign_report",       definition: 'name: "campaign_report"',       handler: "_cosToolBlock.name === 'campaign_report'",       description: "Cross-worker: campaign open-rate report" },
  { tool: "propose_email_campaign",definition: 'name: "propose_email_campaign"',handler: "_cosToolBlock.name === 'propose_email_campaign'",description: "Cross-worker: propose batch email campaign" },
  { tool: "query_contacts",        definition: 'name: "query_contacts"',        handler: "_cosToolBlock.name === 'query_contacts'",        description: "Cross-worker: query contacts" },
  { tool: "recall_notes",          definition: 'name: "recall_notes"',          handler: "_cosToolBlock.name === 'recall_notes'",          description: "Alex memory: recall notes" },
  { tool: "save_note",             definition: 'name: "save_note"',             handler: "_cosToolBlock.name === 'save_note'",             description: "Alex memory: save note" },
  { tool: "propose_calendar_event",definition: 'name: "propose_calendar_event"',handler: "_cosToolBlock.name === 'propose_calendar_event'",description: "Calendar: propose event" },
  { tool: "propose_email",         definition: 'name: "propose_email"',         handler: "_cosToolBlock.name === 'propose_email'",         description: "Email: propose individual email" },
  { tool: "read_inbox",            definition: 'name: "read_inbox"',            handler: "_cosToolBlock.name === 'read_inbox'",            description: "Gmail: read inbox" },
];

module.exports = {
  id: "tool-inventory",
  title: "COS tool definitions and handlers are both present",
  severity: "p0",
  async run() {
    const findings = [];

    let src;
    try { src = fs.readFileSync(INDEX, "utf8"); }
    catch (e) { return { ok: false, findings: [{ check: "tool-inventory", severity: "p0", title: "Could not read index.js", detail: e.message, evidence: {} }] }; }

    for (const entry of REQUIRED_TOOLS) {
      const hasDefinition = src.includes(entry.definition);
      const hasHandler = src.includes(entry.handler);

      if (!hasDefinition) {
        findings.push({
          check: "tool-inventory",
          severity: "p0",
          title: `Tool definition missing: ${entry.tool}`,
          detail: `${entry.description} — tool definition not found in _cosTools array. Alex cannot call this tool.`,
          evidence: { tool: entry.tool, missing: "definition" },
        });
      }
      if (!hasHandler) {
        findings.push({
          check: "tool-inventory",
          severity: "p0",
          title: `Tool handler missing: ${entry.tool}`,
          detail: `${entry.description} — handler branch not found in COS while loop. Tool calls will silently do nothing.`,
          evidence: { tool: entry.tool, missing: "handler" },
        });
      }
    }

    // Also verify morningScanner scheduled function exists
    if (!src.includes("exports.morningScanner")) {
      findings.push({
        check: "tool-inventory",
        severity: "p1",
        title: "morningScanner scheduled function missing",
        detail: "The 7am HST Operating Feed scanner was not found in exports. Morning feed auto-population will not run.",
        evidence: { symbol: "exports.morningScanner" },
      });
    }

    // Verify alertFeed Firestore rule exists
    const RULES = path.resolve(__dirname, "../../../firestore.rules");
    try {
      const rules = fs.readFileSync(RULES, "utf8");
      if (!rules.includes("alertFeed")) {
        findings.push({
          check: "tool-inventory",
          severity: "p0",
          title: "alertFeed Firestore security rule missing",
          detail: "No rule for alertFeed collection in firestore.rules — Operating Feed reads will be denied in production.",
          evidence: { missing: "alertFeed rule" },
        });
      }
    } catch { /* rules file not readable, skip */ }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
