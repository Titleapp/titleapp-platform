/**
 * useSpineData.js — Minimal data-fetching hook for Spine canvas cards (49.1-C)
 *
 * Usage:
 *   const { data, loading, error } = useSpineData("/v1/workspaces/{wsId}/contacts");
 *
 * Reads workspace ID from localStorage WORKSPACE_ID.
 * Authenticates via Bearer token from localStorage ID_TOKEN.
 * Routes through Cloudflare frontdoor.
 */

import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function useSpineData(pathTemplate) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("ID_TOKEN");
    const wsId = localStorage.getItem("WORKSPACE_ID") || "vault";

    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const path = pathTemplate.replace("{wsId}", wsId);

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(path)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error?.message || body.reason || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) setData(json.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pathTemplate]);

  return { data, loading, error };
}
