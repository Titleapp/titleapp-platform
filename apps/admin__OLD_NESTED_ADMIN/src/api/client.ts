type Json = any;

function getIdToken(): string {
  const t = localStorage.getItem("ID_TOKEN");
  if (!t) throw new Error("Missing ID_TOKEN in localStorage. Please sign in.");
  return t;
}

function getSessionId(): string {
  let id = localStorage.getItem("SESSION_ID");
  if (!id) {
    id =
      (globalThis.crypto && "randomUUID" in globalThis.crypto && globalThis.crypto.randomUUID()) ||
      `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    localStorage.setItem("SESSION_ID", id);
  }
  return id;
}

function getApiBase(): string {
  const base = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (!base) {
    throw new Error(
      "Missing VITE_API_BASE. Create apps/admin/apps/admin/.env.local with: VITE_API_BASE=https://<EDGE_BASE>"
    );
  }
  return base.replace(/\/+$/, "");
}

async function httpJson(
  method: string,
  path: string,
  opts: {
    vertical: string;
    jurisdiction: string;
    body?: any;
  }
): Promise<Json> {
  const base = getApiBase();
  const token = getIdToken();
  const sessionId = getSessionId();

  const url = new URL(base + path);

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Session-Id": sessionId,
      "X-Vertical": opts.vertical,
      "X-Jurisdiction": opts.jurisdiction,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
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
    const msg =
      (data && (data.error || data.message || data.reason)) ||
      `HTTP ${res.status} ${res.statusText} calling ${url.toString()}`;
    throw new Error(msg);
  }

  return data;
}

// IMPORTANT: Worker expects POST /workflows (not GET)
export async function getWorkflows(params: {
  vertical: string;
  jurisdiction: string;
}): Promise<Json> {
  return httpJson("POST", "/workflows", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { vertical: params.vertical, jurisdiction: params.jurisdiction },
  });
}

export async function chatMessage(params: {
  vertical: string;
  jurisdiction: string;
  message: string;
}): Promise<Json> {
  return httpJson("POST", "/chat", {
    vertical: params.vertical,
    jurisdiction: params.jurisdiction,
    body: { message: params.message },
  });
}

export async function getReportStatus(params: {
  vertical: string;
  jurisdiction: string;
  jobId: string;
}): Promise<Json> {
  const base = getApiBase();
  const url = new URL(base + "/reportStatus");
  url.searchParams.set("jobId", params.jobId);

  const token = getIdToken();
  const sessionId = getSessionId();

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Session-Id": sessionId,
      "X-Vertical": params.vertical,
      "X-Jurisdiction": params.jurisdiction,
    },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message || data.reason)) ||
      `HTTP ${res.status} ${res.statusText} calling ${url.toString()}`;
    throw new Error(msg);
  }

  return data;
}
