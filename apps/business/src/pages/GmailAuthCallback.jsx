/**
 * GmailAuthCallback.jsx — OAuth redirect landing page for Gmail.
 *
 * Google redirects here after user grants consent:
 *   https://sociii.ai/auth/gmail-callback?code=...&state=...
 *
 * This page reads the code from the URL, postMessages it to the opener
 * (the main app that launched the popup via connectGmail()), then closes.
 *
 * Must be registered in App.jsx at path="/auth/gmail-callback".
 * Must be added to Google Cloud Console as an authorized redirect URI:
 *   https://sociii.ai/auth/gmail-callback
 */

import { useEffect } from "react";

export default function GmailAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      window.opener?.postMessage({ type: "google-gmail-auth-error", error }, "*");
      window.close();
      return;
    }

    if (code && window.opener) {
      window.opener.postMessage({ type: "google-gmail-auth-code", code }, "*");
      window.close();
    }
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#374151",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>Connecting Gmail…</div>
        <div style={{ fontSize: 14, color: "#6b7280" }}>This window will close automatically.</div>
      </div>
    </div>
  );
}
