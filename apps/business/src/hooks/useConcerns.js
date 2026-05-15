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

export default function useConcerns() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const list = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { return await apiFetch("/v1/concerns:list"); }
    catch (e) { setError(e.message); return { ok: false, concerns: [] }; }
    finally { setLoading(false); }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try { return await apiFetch("/v1/concerns:create", "POST", payload); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
    finally { setLoading(false); }
  }, []);

  const respond = useCallback(async ({ concernId, answers }) => {
    setLoading(true);
    setError(null);
    try { return await apiFetch("/v1/concerns:respond", "POST", { concernId, answers }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
    finally { setLoading(false); }
  }, []);

  const resolve = useCallback(async (concernId) => {
    try { return await apiFetch("/v1/concerns:resolve", "POST", { concernId }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const remove = useCallback(async (concernId) => {
    try { return await apiFetch("/v1/concerns:delete", "POST", { concernId }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const listTypes = useCallback(async () => {
    try { return await apiFetch("/v1/concerns:types"); }
    catch (e) { setError(e.message); return { ok: false, types: [] }; }
  }, []);

  return { list, create, respond, resolve, remove, listTypes, loading, error };
}
