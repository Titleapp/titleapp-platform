/**
 * useCalendar.js — Frontend hook for the Google Calendar connector.
 *
 * Mirrors the Drive integration pattern. Calendar is a connector that touches
 * every worker (Sean 2026-05-13) — events can be tagged with worker:<slug>
 * via the metadata block in the event description.
 *
 * Endpoints used:
 *   GET  /v1/calendar:status         — { connected, email, connectedAt }
 *   GET  /v1/calendar:authUrl        — { authUrl } — open in popup
 *   POST /v1/calendar:exchangeCode   — finalize after popup postMessage
 *   POST /v1/calendar:disconnect     — revoke + delete
 *   GET  /v1/calendar:events         — list upcoming
 *   POST /v1/calendar:events:create  — create event
 *   POST /v1/calendar:events:propose — worker-emitted draft (pending approval)
 */

import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

async function calendarApi(action, method = "GET", body = null) {
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
  const url = method === "GET" && body
    ? `${API_BASE}/v1/calendar:${action}?${new URLSearchParams(body).toString()}`
    : `${API_BASE}/v1/calendar:${action}`;
  const res = await fetch(url, opts);
  return res.json();
}

export function useCalendarStatus() {
  const [status, setStatus] = useState({ connected: false, email: null, loading: true });

  const refresh = useCallback(async () => {
    setStatus(s => ({ ...s, loading: true }));
    try {
      const res = await calendarApi("status");
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
 * Trigger the OAuth popup flow. Returns a Promise that resolves to the
 * exchange result once the user finishes the consent screen and the popup
 * postMessages the code back.
 */
export async function connectCalendar() {
  // Open a blank popup synchronously within the click handler so browsers don't
  // block it. We navigate it to the real OAuth URL once we have it.
  const popup = window.open("about:blank", "google-calendar-auth", "width=600,height=700");
  if (!popup) throw new Error("Popup blocked. Allow popups for this site in your browser settings and try again.");

  let res;
  try {
    res = await calendarApi("authUrl");
  } catch (e) {
    popup.close();
    throw e;
  }
  if (!res.ok || !res.authUrl) {
    popup.close();
    throw new Error(res.error || "Failed to start Google Calendar connection");
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
      if (!event.data || event.data.type !== "google-calendar-auth-code") return;
      if (!event.data.code) return;
      cleanup();
      resolved = true;
      try {
        const exchangeRes = await calendarApi("exchangeCode", "POST", { code: event.data.code });
        if (exchangeRes.ok) resolve(exchangeRes);
        else reject(new Error(exchangeRes.error || "Exchange failed"));
      } catch (e) {
        reject(e);
      }
    };
    window.addEventListener("message", handler);

    // Poll for popup close — if user dismisses without completing.
    const pollClose = setInterval(() => {
      try {
        if (popup.closed) {
          cleanup();
          if (!resolved) reject(new Error("Connection cancelled. Try again."));
        }
      } catch { /* ignore */ }
    }, 500);

    // Safety timeout — 3 minutes. Catches stuck popups (blocked by browser, cross-origin issues).
    const timeout = setTimeout(() => {
      if (!resolved) {
        cleanup();
        try { popup.close(); } catch { /* ignore */ }
        reject(new Error("Connection timed out. If your browser blocked a popup, allow popups for this site and try again."));
      }
    }, 180000);
  });
}

export async function disconnectCalendar() {
  return await calendarApi("disconnect", "POST", {});
}

/**
 * List upcoming events. `opts.days` = window size (default 7).
 * `opts.workerSlug` and `opts.projectId` filter on the embedded metadata block.
 */
export async function listEvents(opts = {}) {
  const params = {};
  if (opts.days)        params.days = String(opts.days);
  if (opts.maxResults)  params.maxResults = String(opts.maxResults);
  if (opts.workerSlug)  params.workerSlug = opts.workerSlug;
  if (opts.projectId)   params.projectId = opts.projectId;
  if (opts.calendarId)  params.calendarId = opts.calendarId;
  return await calendarApi("events", "GET", params);
}

export async function createEvent(event) {
  return await calendarApi("events:create", "POST", event);
}

export async function proposeEvent(event) {
  return await calendarApi("events:propose", "POST", event);
}

export default {
  useCalendarStatus,
  connectCalendar,
  disconnectCalendar,
  listEvents,
  createEvent,
  proposeEvent,
};
