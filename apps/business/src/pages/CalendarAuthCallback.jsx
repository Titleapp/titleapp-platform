/**
 * CalendarAuthCallback.jsx — OAuth redirect landing page for Google Calendar.
 *
 * Google redirects here after user grants consent:
 *   https://sociii.ai/auth/calendar-callback?code=...&state=...
 *
 * Must be registered in App.jsx at path="/auth/calendar-callback".
 * Must be added to Google Cloud Console as an authorized redirect URI.
 * Backend GOOGLE_CALENDAR_REDIRECT_URI env var must match.
 */

import { useEffect } from "react";

export default function CalendarAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      window.opener?.postMessage({ type: "google-calendar-auth-error", error }, "*");
      window.close();
      return;
    }

    if (code && window.opener) {
      window.opener.postMessage({ type: "google-calendar-auth-code", code }, "*");
      window.close();
    }
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#374151",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>Connecting Calendar…</div>
        <div style={{ fontSize: 14, color: "#6b7280" }}>This window will close automatically.</div>
      </div>
    </div>
  );
}
