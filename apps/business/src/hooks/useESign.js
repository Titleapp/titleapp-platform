/**
 * useESign.js — Google eSignature connector hook
 *
 * Backend routes:
 *   GET  /v1/esign:authUrl        → { ok, authUrl }
 *   POST /v1/esign:exchangeCode   → finalize after popup postMessage
 *   GET  /v1/esign:status         → { connected, email, connectedAt }
 *   POST /v1/esign:disconnect     → revoke + delete
 *   POST /v1/esign:send           → upload doc to Drive + share with signers
 *   GET  /v1/esign:requests       → list recent signing requests
 *
 * Redirect URI: same google-drive-callback.html, detected via "|esign" state suffix.
 * Message type: "google-esign-auth-code"
 */

import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

async function esignApi(action, method = "GET", body = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const tenantId = localStorage.getItem("CURRENT_TENANT_ID") || localStorage.getItem("TENANT_ID") || "";
  const opts = {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(tenantId ? { "x-tenant-id": tenantId } : {}) },
  };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}/v1/esign:${action}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `esign:${action} failed (${res.status})`);
  }
  return res.json();
}

export function useESignStatus() {
  const [status, setStatus] = useState({ connected: false, email: null, loading: true });

  const refresh = useCallback(async () => {
    setStatus(s => ({ ...s, loading: true }));
    try {
      const res = await esignApi("status");
      setStatus({ connected: !!res.connected, email: res.email || null, connectedAt: res.connectedAt || null, loading: false });
    } catch {
      setStatus({ connected: false, email: null, loading: false });
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);
  return { status, refresh };
}

export async function connectESign() {
  const popup = window.open("about:blank", "google-esign-auth", "width=600,height=700");
  if (!popup) throw new Error("Popup blocked. Allow popups for this site and try again.");

  let res;
  try {
    res = await esignApi("authUrl");
  } catch (e) {
    popup.close();
    throw e;
  }
  if (!res.ok || !res.authUrl) {
    popup.close();
    throw new Error(res.error || "Failed to start Google eSign connection");
  }
  popup.location.href = res.authUrl;

  return new Promise((resolve, reject) => {
    let resolved = false;

    function cleanup() {
      window.removeEventListener("message", handler);
      clearInterval(pollClose);
      clearTimeout(timeout);
    }

    const handler = async (event) => {
      if (!event.data || event.data.type !== "google-esign-auth-code") return;
      if (!event.data.code) return;
      cleanup();
      resolved = true;
      try {
        const exchangeRes = await esignApi("exchangeCode", "POST", { code: event.data.code });
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
          cleanup();
          if (!resolved) reject(new Error("Connection cancelled."));
        }
      } catch { /* ignore */ }
    }, 500);

    const timeout = setTimeout(() => {
      if (!resolved) {
        cleanup();
        try { popup.close(); } catch { /* ignore */ }
        reject(new Error("Connection timed out. Allow popups and try again."));
      }
    }, 180000);
  });
}

export async function disconnectESign() {
  return esignApi("disconnect", "POST", {});
}

export async function sendForSignature({ title, signers, message, fileBase64, mimeType, metadata }) {
  return esignApi("send", "POST", { title, signers, message, fileBase64, mimeType, metadata });
}

export async function listESignRequests() {
  return esignApi("requests");
}

export default { useESignStatus, connectESign, disconnectESign, sendForSignature };
