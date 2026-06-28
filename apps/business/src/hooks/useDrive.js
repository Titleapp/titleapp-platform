/**
 * useDrive.js — Frontend hook for the Google Drive connector.
 *
 * Backend routes (all exist in index.js since 34.7-T2):
 *   GET  /v1/drive:authUrl        — { ok, authUrl }
 *   POST /v1/drive:exchangeCode   — finalize after popup postMessage
 *   GET  /v1/drive:status         — { connected, email, connectedAt }
 *   POST /v1/drive:disconnect     — revoke + delete
 *
 * Redirect URI: https://titleapp.ai/auth/google-drive-callback (static HTML,
 * already deployed — handles drive/calendar/youtube flows by scope detection).
 */

import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

async function driveApi(action, method = "GET", body = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const url = `${API_BASE}/v1/drive:${action}`;
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `drive:${action} failed (${res.status})`);
  }
  return res.json();
}

export function useDriveStatus() {
  const [status, setStatus] = useState({ connected: false, email: null, loading: true });

  const refresh = useCallback(async () => {
    setStatus(s => ({ ...s, loading: true }));
    try {
      const res = await driveApi("status");
      setStatus({
        connected: !!res.connected,
        email: res.email || null,
        connectedAt: res.connectedAt || null,
        loading: false,
      });
    } catch {
      setStatus({ connected: false, email: null, loading: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, refresh };
}

export async function connectDrive() {
  const res = await driveApi("authUrl");
  if (!res.ok || !res.authUrl) throw new Error(res.error || "Failed to start Google Drive connection");

  const popup = window.open(res.authUrl, "google-drive-auth", "width=600,height=700");
  if (!popup) throw new Error("Popup blocked. Allow popups for this site and try again.");

  return new Promise((resolve, reject) => {
    let resolved = false;
    const handler = async (event) => {
      if (!event.data || event.data.type !== "google-drive-auth-code") return;
      if (!event.data.code) return;
      window.removeEventListener("message", handler);
      resolved = true;
      try {
        const exchangeRes = await driveApi("exchangeCode", "POST", { code: event.data.code });
        if (exchangeRes.ok) resolve(exchangeRes);
        else reject(new Error(exchangeRes.error || "Exchange failed"));
      } catch (e) {
        reject(e);
      }
    };
    window.addEventListener("message", handler);

    const pollClose = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(pollClose);
          if (!resolved) {
            window.removeEventListener("message", handler);
            reject(new Error("Connection cancelled."));
          }
        }
      } catch {}
    }, 500);
  });
}

export async function disconnectDrive() {
  return await driveApi("disconnect", "POST", {});
}

export default { useDriveStatus, connectDrive, disconnectDrive };
