import React, { useState } from "react";
import { auth } from "../firebase";

// CODEX 50.10-T2 — Invite Member modal.
//
// Triggered from the workspace settings (or the persona switcher) when a
// workspace admin wants to add a teammate. Sends a single invite to one
// email at a time. Multi-invite, resend, and revoke are deferred to v2.
export default function InviteMemberModal({ tenantId, workspaceName, onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setResult({ kind: "error", message: "Please enter an email address." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${apiBase}/api?path=/v1/workspace:invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
        },
        body: JSON.stringify({ tenantId, email: trimmed, role }),
      });
      const data = await res.json();
      if (data && data.ok) {
        setResult({ kind: "success", message: `Invitation sent to ${trimmed}.`, inviteUrl: data.inviteUrl });
        setEmail("");
      } else if (data && data.error === "EMAIL_SEND_FAILED" && data.inviteUrl) {
        // Email failed but invite was created — show the URL so the admin
        // can send manually.
        setResult({
          kind: "warning",
          message: "Invite created, but the email didn't go through. Copy this link and send it directly:",
          inviteUrl: data.inviteUrl,
        });
        setEmail("");
      } else {
        setResult({ kind: "error", message: errorMessage(data?.error) });
      }
    } catch {
      setResult({ kind: "error", message: "Could not send invite. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Styles ───────────────────────────────────────────────────
  const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 24,
  };
  const card = {
    background: "#ffffff",
    borderRadius: 12,
    padding: 28,
    maxWidth: 480,
    width: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  };
  const label = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6, marginTop: 16 };
  const input = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
  };
  const select = { ...input, background: "#ffffff" };
  const primary = {
    padding: "10px 20px",
    background: "#7c3aed",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: submitting ? "default" : "pointer",
    opacity: submitting ? 0.6 : 1,
  };
  const secondary = {
    padding: "10px 20px",
    background: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    marginRight: 8,
  };

  const roleHelp = {
    admin: "Full access — can invite, edit billing, manage workers.",
    member: "Use workers, send messages, run reports.",
    viewer: "Read-only — sees canvases and reports, cannot send messages.",
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Invite a member</div>
        <div style={{ fontSize: 14, color: "#6b7280" }}>
          to <strong>{workspaceName || "this workspace"}</strong>
        </div>

        <label style={label}>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          style={input}
          autoFocus
          disabled={submitting}
        />

        <label style={label}>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={select} disabled={submitting}>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{roleHelp[role]}</div>

        {result && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 14,
              background: result.kind === "success" ? "#ecfdf5" : result.kind === "warning" ? "#fef3c7" : "#fef2f2",
              color: result.kind === "success" ? "#065f46" : result.kind === "warning" ? "#92400e" : "#991b1b",
              border: `1px solid ${result.kind === "success" ? "#a7f3d0" : result.kind === "warning" ? "#fcd34d" : "#fecaca"}`,
            }}
          >
            <div>{result.message}</div>
            {result.inviteUrl && (
              <div style={{ marginTop: 8, fontSize: 12, wordBreak: "break-all" }}>
                <a href={result.inviteUrl} target="_blank" rel="noreferrer" style={{ color: "#7c3aed" }}>
                  {result.inviteUrl}
                </a>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondary} disabled={submitting}>
            {result?.kind === "success" ? "Done" : "Cancel"}
          </button>
          <button onClick={handleSubmit} style={primary} disabled={submitting}>
            {submitting ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function errorMessage(code) {
  switch (code) {
    case "ALREADY_MEMBER": return "That person is already in this workspace.";
    case "SELF_INVITE_REJECTED": return "You can't invite yourself.";
    case "INVALID_EMAIL": return "Please enter a valid email address.";
    case "INVALID_ROLE": return "Please pick a role.";
    case "NOT_ADMIN": return "Only workspace admins can invite members.";
    case "TENANT_NOT_FOUND": return "We couldn't find this workspace. Refresh and try again.";
    case "MISSING_TENANT_ID": return "No workspace selected. Switch to a workspace and try again.";
    default: return "Something went wrong. Try again.";
  }
}
