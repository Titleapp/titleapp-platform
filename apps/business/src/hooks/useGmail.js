/**
 * useGmail.js — Frontend hook for the Gmail connector.
 *
 * Mirrors the useCalendar pattern exactly. Gmail unlocks:
 *  - Contact sync (People API + sent-mail addresses → contacts collection)
 *  - Email search for worker context
 *  - Send email through user's Gmail from any worker
 *
 * Endpoints used:
 *   GET  /v1/gmail:authUrl        — { authUrl } — open in popup
 *   POST /v1/gmail:exchangeCode   — finalize after popup postMessage
 *   GET  /v1/gmail:status         — { connected, email, connectedAt }
 *   POST /v1/gmail:disconnect     — revoke + delete
 *   POST /v1/gmail:syncContacts   — pull contacts from Gmail → Firestore
 *   POST /v1/gmail:send           — send email through connected Gmail
 */

import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

async function gmailApi(action, method = "GET", body = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const tenantId = localStorage.getItem("CURRENT_TENANT_ID") || localStorage.getItem("TENANT_ID") || "";
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
  };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const url = `${API_BASE}/v1/gmail:${action}`;
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `gmail:${action} failed (${res.status})`);
  }
  return res.json();
}

export function useGmailStatus() {
  const [status, setStatus] = useState({ connected: false, email: null, loading: true });

  const refresh = useCallback(async () => {
    setStatus(s => ({ ...s, loading: true }));
    try {
      const res = await gmailApi("status");
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  return { status, refresh };
}

/**
 * Open the Google OAuth popup for Gmail consent.
 * Listens for a postMessage from GmailAuthCallback.jsx with the auth code,
 * then exchanges it for tokens via /v1/gmail:exchangeCode.
 */
export async function connectGmail() {
  // Open blank popup synchronously (within the user gesture) so browsers don't block it.
  const popup = window.open("about:blank", "google-gmail-auth", "width=600,height=700");
  if (!popup) throw new Error("Popup blocked. Allow popups for this site in your browser settings and try again.");

  let res;
  try {
    res = await gmailApi("authUrl");
  } catch (e) {
    popup.close();
    throw e;
  }
  if (!res.ok || !res.authUrl) {
    popup.close();
    throw new Error(res.error || "Failed to start Gmail connection");
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
      if (!event.data || event.data.type !== "google-gmail-auth-code") return;
      if (!event.data.code) return;
      cleanup();
      resolved = true;
      try {
        const exchangeRes = await gmailApi("exchangeCode", "POST", { code: event.data.code });
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
          if (!resolved) reject(new Error("Connection cancelled. Try again."));
        }
      } catch { /* ignore */ }
    }, 500);

    const timeout = setTimeout(() => {
      if (!resolved) {
        cleanup();
        try { popup.close(); } catch { /* ignore */ }
        reject(new Error("Connection timed out. If your browser blocked a popup, allow popups for this site and try again."));
      }
    }, 180000);
  });
}

export async function disconnectGmail() {
  return await gmailApi("disconnect", "POST", {});
}

export async function syncGmailContacts(opts = {}) {
  return await gmailApi("syncContacts", "POST", opts);
}

export async function sendViaGmail({ to, subject, body, htmlBody, cc, replyTo }) {
  return await gmailApi("send", "POST", { to, subject, body, htmlBody, cc, replyTo });
}

export default { useGmailStatus, connectGmail, disconnectGmail, syncGmailContacts, sendViaGmail };
