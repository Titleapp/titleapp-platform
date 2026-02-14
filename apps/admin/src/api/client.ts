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

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getIdToken(),
      "X-Session-Id": sessionId,
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
}) {
  return httpJson("POST", "/v1/logbook:append", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: params.entry,
  });
}
