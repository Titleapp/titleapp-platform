const express = require("express");
const cors = require("cors");
const path = require("path");
const { validateApiKey } = require("./middleware/auth");

// Route modules
const workspacesRouter = require("./routes/workspaces");
const dashboardRouter = require("./routes/dashboard");
const aiRouter = require("./routes/ai");
const listingsRouter = require("./routes/listings");
const buyersRouter = require("./routes/buyers");
const transactionsRouter = require("./routes/transactions");
const propertiesRouter = require("./routes/properties");
const tenantsRouter = require("./routes/tenants");
const maintenanceRouter = require("./routes/maintenance");
const inventoryRouter = require("./routes/inventory");
const customersRouter = require("./routes/customers");
const dealsRouter = require("./routes/deals");
const serviceRouter = require("./routes/service");
const portfolioRouter = require("./routes/portfolio");
const researchRouter = require("./routes/research");
const lpsRouter = require("./routes/lps");
const assetsRouter = require("./routes/assets");
const documentsRouter = require("./routes/documents");
const deadlinesRouter = require("./routes/deadlines");
const inboundRouter = require("./routes/inbound");
const webhooksRouter = require("./routes/webhooks");

const app = express();

// Global middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Health check (no auth required)
app.get("/v1/health", (req, res) => {
  res.json({
    ok: true,
    service: "titleapp-public-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API documentation (no auth required)
app.get("/v1/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "docs.html"));
});

// API key validation on all /v1/ routes except health
app.use("/v1", validateApiKey);

// Phase 1 — Core
app.use("/v1/workspaces", workspacesRouter);
app.use("/v1/workspaces", dashboardRouter);   // /:workspace_id/dashboard, /:workspace_id/insights
app.use("/v1/workspaces", aiRouter);           // /:workspace_id/chat, /draft, /tasks, /activity, /reports

// Phase 2 — Real Estate
app.use("/v1/workspaces", listingsRouter);     // /:workspace_id/listings
app.use("/v1/workspaces", buyersRouter);       // /:workspace_id/buyers
app.use("/v1/workspaces", transactionsRouter); // /:workspace_id/transactions
app.use("/v1/workspaces", propertiesRouter);   // /:workspace_id/properties
app.use("/v1/workspaces", tenantsRouter);      // /:workspace_id/tenants
app.use("/v1/workspaces", maintenanceRouter);  // /:workspace_id/maintenance

// Phase 3 — Auto
app.use("/v1/workspaces", inventoryRouter);    // /:workspace_id/inventory
app.use("/v1/workspaces", customersRouter);    // /:workspace_id/customers
app.use("/v1/workspaces", dealsRouter);        // /:workspace_id/deals
app.use("/v1/workspaces", serviceRouter);      // /:workspace_id/service

// Phase 4 — Analyst
app.use("/v1/workspaces", portfolioRouter);    // /:workspace_id/portfolio
app.use("/v1/workspaces", researchRouter);     // /:workspace_id/research
app.use("/v1/workspaces", lpsRouter);          // /:workspace_id/lps

// Phase 5 — Vault
app.use("/v1/workspaces", assetsRouter);       // /:workspace_id/assets
app.use("/v1/workspaces", documentsRouter);    // /:workspace_id/documents
app.use("/v1/workspaces", deadlinesRouter);    // /:workspace_id/deadlines

// Phase 6 — Universal Inbound
app.use("/v1/workspaces", inboundRouter);      // /:workspace_id/inbound

// Phase 7 — Webhooks
app.use("/v1/webhooks", webhooksRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({
    error: { code: "not_found", message: `No route for ${req.method} ${req.path}`, status: 404 },
  });
});

module.exports = app;
