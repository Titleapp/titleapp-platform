type Json = any;

function getIdToken(): string {
  const t = localStorage.getItem("ID_TOKEN");
  if (!t) throw new Error("Missing ID_TOKEN in localStorage. Please sign in.");
  return t;
}

function getSessionId(): string {
  let id = localStorage.getItem("SESSION_ID");
  if (!id) {
    const cryptoAny = (globalThis as any).crypto;
    if (cryptoAny && typeof cryptoAny.randomUUID === "function") {
      id = cryptoAny.randomUUID();
    } else {
      id = "sess_" + Math.random().toString(16).slice(2) + "_" + Date.now();
    }
    localStorage.setItem("SESSION_ID", id);
  }
  return id;
}

function apiBase(): string {
  const base = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (!base) throw new Error("Missing VITE_API_BASE");
  return base.replace(/\/+$/, "");
}

/**
 * Frontdoor contract:
 * Always call: POST/GET  <VITE_API_BASE>/api?path=<backendPath>
 * Example: /api?path=/v1/health
 */
async function httpJson(
  method: string,
  backendPath: string,
  opts: { vertical: string; jurisdiction: string; body?: any }
): Promise<Json> {
  const sessionId = getSessionId();

  // Build: https://<frontdoor>/api?path=/v1/...
  const url = new URL(apiBase() + "/api");
  url.searchParams.set("path", backendPath);

  const tenantId = localStorage.getItem("TENANT_ID") || "public";

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getIdToken(),
      "X-Session-Id": sessionId,
      "X-Tenant-Id": tenantId,
      "X-Vertical": opts.vertical,
      "X-Jurisdiction": opts.jurisdiction,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.reason || ("HTTP " + res.status));
  }
  return data;
}

export async function getWorkflows(params: { vertical: string; jurisdiction: string }) {
  // Cloudflare -> backend: GET /v1/raas:workflows?vertical=...&jurisdiction=...
  const backendPath =
    "/v1/raas:workflows?vertical=" +
    encodeURIComponent(params.vertical) +
    "&jurisdiction=" +
    encodeURIComponent(params.jurisdiction);

  return httpJson("GET", backendPath, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function chatMessage(params: { vertical: string; jurisdiction: string; message: string }) {
  // Cloudflare -> backend: /v1/chat:message
  return httpJson("POST", "/v1/chat:message", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { message: params.message },
  });
}

export async function getReportStatus(params: { vertical: string; jurisdiction: string; jobId: string }) {
  // Cloudflare -> backend: /v1/report:status?jobId=...
  const p = "/v1/report:status?jobId=" + encodeURIComponent(params.jobId);
  return httpJson("GET", p, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

// ----------------------------
// DTCs (Digital Title Certificates)
// ----------------------------

export async function getDTCs(params: { vertical: string; jurisdiction: string; type?: string }) {
  let path = "/v1/dtc:list";
  if (params.type) path += `?type=${encodeURIComponent(params.type)}`;

  return httpJson("GET", path, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function createDTC(params: {
  vertical: string;
  jurisdiction: string;
  dtc: { type: string; metadata: any; fileIds?: string[]; blockchainProof?: any };
}) {
  return httpJson("POST", "/v1/dtc:create", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.dtc,
  });
}

export async function refreshDTCValue(params: {
  vertical: string;
  jurisdiction: string;
  dtcId: string;
}) {
  return httpJson("POST", "/v1/dtc:refresh-value", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { dtcId: params.dtcId },
  });
}

// ----------------------------
// Logbooks
// ----------------------------

export async function getLogbooks(params: { vertical: string; jurisdiction: string; dtcId?: string }) {
  let path = "/v1/logbook:list";
  if (params.dtcId) path += `?dtcId=${encodeURIComponent(params.dtcId)}`;

  return httpJson("GET", path, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function appendLogbook(params: {
  vertical: string;
  jurisdiction: string;
  entry: { dtcId: string; entryType: string; data: any; files?: string[] };
  file?: { name: string; type: string; data: string };
}) {
  return httpJson("POST", "/v1/logbook:append", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { ...params.entry, ...(params.file ? { file: params.file } : {}) },
  });
}

// ----------------------------
// Inventory
// ----------------------------

export async function getInventory(params: { vertical: string; jurisdiction: string; type?: string }) {
  let path = "/v1/inventory:list";
  if (params.type) path += `?type=${encodeURIComponent(params.type)}`;

  return httpJson("GET", path, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function createInventoryItem(params: {
  vertical: string;
  jurisdiction: string;
  item: { type: string; status: string; metadata: any; price: number; cost: number; fileIds?: string[] };
}) {
  return httpJson("POST", "/v1/inventory:create", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.item,
  });
}

export async function updateInventoryItem(params: {
  vertical: string;
  jurisdiction: string;
  id: string;
  item: { type?: string; status?: string; metadata?: any; price?: number; cost?: number };
}) {
  return httpJson("PUT", "/v1/inventory:update", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.id, ...params.item },
  });
}

export async function deleteInventoryItem(params: {
  vertical: string;
  jurisdiction: string;
  id: string;
}) {
  return httpJson("DELETE", "/v1/inventory:delete", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.id },
  });
}

export async function attestInventoryItem(params: {
  vertical: string;
  jurisdiction: string;
  dtcId: string;
}) {
  return httpJson("POST", "/v1/inventory:attest", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { dtcId: params.dtcId },
  });
}

// ----------------------------
// Customers
// ----------------------------

export async function getCustomers(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/customers:list", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function createCustomer(params: {
  vertical: string;
  jurisdiction: string;
  customer: { firstName: string; lastName: string; email: string; phone?: string; tags?: string[]; notes?: string };
}) {
  return httpJson("POST", "/v1/customers:create", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.customer,
  });
}

export async function updateCustomer(params: {
  vertical: string;
  jurisdiction: string;
  id: string;
  customer: { firstName?: string; lastName?: string; email?: string; phone?: string; tags?: string[]; notes?: string };
}) {
  return httpJson("PUT", "/v1/customers:update", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.id, ...params.customer },
  });
}

export async function deleteCustomer(params: {
  vertical: string;
  jurisdiction: string;
  id: string;
}) {
  return httpJson("DELETE", "/v1/customers:delete", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.id },
  });
}

// ----------------------------
// Appointments
// ----------------------------

export async function getAppointments(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/appointments:list", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function createAppointment(params: {
  vertical: string;
  jurisdiction: string;
  appointment: { customerId: string; customerName: string; datetime: string; type: string; duration: number; notes?: string };
}) {
  return httpJson("POST", "/v1/appointments:create", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.appointment,
  });
}

export async function updateAppointment(params: {
  vertical: string;
  jurisdiction: string;
  id: string;
  appointment: {
    customerId?: string;
    customerName?: string;
    datetime?: string;
    type?: string;
    duration?: number;
    status?: string;
    notes?: string;
  };
}) {
  return httpJson("PUT", "/v1/appointments:update", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.id, ...params.appointment },
  });
}

export async function deleteAppointment(params: {
  vertical: string;
  jurisdiction: string;
  id: string;
}) {
  return httpJson("DELETE", "/v1/appointments:delete", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.id },
  });
}

// ----------------------------
// Staff
// ----------------------------

export async function getStaff(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/staff:list", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function createStaffMember(params: {
  vertical: string;
  jurisdiction: string;
  staff: {
    name: string;
    email: string;
    role: string;
    permissions: string[];
    phone?: string;
  };
}) {
  return httpJson("POST", "/v1/staff:create", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.staff,
  });
}

export async function updateStaffMember(params: {
  vertical: string;
  jurisdiction: string;
  id: string;
  staff: {
    name?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    status?: string;
    phone?: string;
  };
}) {
  return httpJson("PUT", "/v1/staff:update", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.id, ...params.staff },
  });
}

export async function deleteStaffMember(params: {
  vertical: string;
  jurisdiction: string;
  id: string;
}) {
  return httpJson("DELETE", "/v1/staff:delete", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.id },
  });
}

// ----------------------------
// AI Activity & Conversations
// ----------------------------

export async function getAIActivity(params: {
  vertical: string;
  jurisdiction: string;
  limit?: number;
}) {
  let path = "/v1/ai:activity";
  if (params.limit) path += `?limit=${params.limit}`;

  return httpJson("GET", path, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function getConversations(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/ai:conversations", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function getConversationReplay(params: {
  vertical: string;
  jurisdiction: string;
  conversationId: string;
}) {
  return httpJson("GET", `/v1/ai:conversation:replay?id=${params.conversationId}`, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

// ----------------------------
// Integrations & APIs
// ----------------------------

export async function getIntegrations(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/integrations:list", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function connectIntegration(params: {
  vertical: string;
  jurisdiction: string;
  integration: {
    name: string;
    type: string;
    credentials: any;
  };
}) {
  return httpJson("POST", "/v1/integrations:connect", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.integration,
  });
}

export async function disconnectIntegration(params: {
  vertical: string;
  jurisdiction: string;
  integrationId: string;
}) {
  return httpJson("POST", "/v1/integrations:disconnect", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.integrationId },
  });
}

export async function syncIntegration(params: {
  vertical: string;
  jurisdiction: string;
  integrationId: string;
}) {
  return httpJson("POST", "/v1/integrations:sync", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { id: params.integrationId },
  });
}

// ----------------------------
// Analyst RAAS
// ----------------------------

export async function analyzeDeal(params: {
  vertical: string;
  jurisdiction: string;
  deal: {
    companyName: string;
    industry?: string;
    askAmount?: string;
    dealType: string;
    summary: string;
  };
}) {
  return httpJson("POST", "/v1/analyst:analyze", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { deal: params.deal },
  });
}

export async function getAnalyzedDeals(params: {
  vertical: string;
  jurisdiction: string;
  limit?: number;
}) {
  const limitParam = params.limit ? `?limit=${params.limit}` : "";
  return httpJson("GET", `/v1/analyst:deals${limitParam}`, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function getAnalyzedDeal(params: {
  vertical: string;
  jurisdiction: string;
  dealId: string;
}) {
  return httpJson("GET", `/v1/analyst:deal?id=${params.dealId}`, {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

// ----------------------------
// User & Tenant Management
// ----------------------------

export async function getMemberships(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/me:memberships", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

// ----------------------------
// Wallet (Tokens & Cap Tables)
// ----------------------------

export async function getWalletAssets(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/wallet:assets", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function getTokens(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/wallet:tokens:list", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function createToken(params: {
  vertical: string;
  jurisdiction: string;
  token: { name: string; symbol: string; supply: string; network: string };
}) {
  return httpJson("POST", "/v1/wallet:token:create", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.token,
  });
}

export async function getCapTables(params: { vertical: string; jurisdiction: string }) {
  return httpJson("GET", "/v1/wallet:captables:list", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
  });
}

export async function createCapTable(params: {
  vertical: string;
  jurisdiction: string;
  capTable: {
    companyName: string;
    totalShares: number;
    shareholders: Array<{ name: string; shares: number; percentage: number }>;
  };
}) {
  return httpJson("POST", "/v1/wallet:captable:create", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.capTable,
  });
}
