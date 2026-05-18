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

export default function useCommandCenter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const previewBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { return await apiFetch("/v1/commandCenter:previewBrief"); }
    catch (e) { setError(e.message); return { ok: false, error: e.message, sections: [] }; }
    finally { setLoading(false); }
  }, []);

  const sendBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { return await apiFetch("/v1/commandCenter:sendBrief", "POST", {}); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
    finally { setLoading(false); }
  }, []);

  const setWorkspaceMode = useCallback(async ({ tenantId, mode }) => {
    setLoading(true);
    setError(null);
    try { return await apiFetch("/v1/commandCenter:setWorkspaceMode", "POST", { tenantId, mode }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
    finally { setLoading(false); }
  }, []);

  const setMilestoneStatus = useCallback(async ({ milestoneId, status, kind, note }) => {
    try { return await apiFetch("/v1/commandCenter:setMilestoneStatus", "POST", { milestoneId, status, kind, note }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  return { previewBrief, sendBrief, setWorkspaceMode, setMilestoneStatus, loading, error };
}
