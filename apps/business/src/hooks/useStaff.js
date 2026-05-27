import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, method = "GET", body = null) {
  const token = localStorage.getItem("ID_TOKEN");
  const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || "vault";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function useStaff() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const list = useCallback(async () => {
    setLoading(true); setError(null);
    try { return await apiFetch("/v1/staff:list"); }
    catch (e) { setError(e.message); return { ok: false, staff: [] }; }
    finally { setLoading(false); }
  }, []);

  const create = useCallback(async (payload) => {
    try { return await apiFetch("/v1/staff:create", "POST", payload); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const update = useCallback(async (id, payload) => {
    try { return await apiFetch("/v1/staff:update", "PUT", { id, ...payload }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const remove = useCallback(async (id) => {
    try { return await apiFetch("/v1/staff:delete", "DELETE", { id }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  return { loading, error, list, create, update, remove };
}
