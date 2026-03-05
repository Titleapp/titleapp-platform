import React from "react";

/**
 * VerificationPending — shown while verification is under review.
 * Displays status, allows re-verification and self-reported graduation/departure.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiCall(endpoint, body = {}) {
  const token = localStorage.getItem("ID_TOKEN");
  const res = await fetch(`${API_BASE}/api?path=/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function VerificationPending({ type = "student", status, expiresAt, onAction }) {
  const [acting, setActing] = React.useState(false);

  const isStudent = type === "student";
  const tierName = isStudent ? "Pilot Pro" : "Pilot Pro+";
  const price = isStudent ? "$29/mo" : "$49/mo";

  const statusLabel = {
    pending_review: "Under Review",
    cert_verified: "Verified",
    manual_review: "Under Review",
    approved: "Verified",
    rejected: "Not Verified",
  }[status] || status;

  const statusColor = {
    pending_review: "#f59e0b",
    cert_verified: "#10b981",
    manual_review: "#f59e0b",
    approved: "#10b981",
    rejected: "#ef4444",
  }[status] || "var(--muted)";

  const expiresDate = expiresAt ? new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }) : null;

  async function handleGraduate() {
    if (!confirm(isStudent
      ? "Report graduation? You'll get 3 free months, then $29/mo."
      : "Report academy departure? You'll get 3 free months of Pilot Pro, then $29/mo."
    )) return;
    setActing(true);
    try {
      const endpoint = isStudent ? "verify:student:graduated" : "verify:cfi:departed";
      const result = await apiCall(endpoint);
      onAction?.(isStudent ? "graduated" : "departed", result);
    } catch (e) {
      console.error(e);
    }
    setActing(false);
  }

  async function handleRenew() {
    setActing(true);
    try {
      const endpoint = isStudent ? "verify:student:renew" : "verify:cfi:renew";
      const result = await apiCall(endpoint);
      onAction?.("renewed", result);
    } catch (e) {
      console.error(e);
    }
    setActing(false);
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="cardHeader">
        <div className="cardTitle">
          {isStudent ? "Student Pilot" : "CFI/CFII"} Verification
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Status badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
          padding: "10px 14px", borderRadius: 8,
          background: `${statusColor}11`, border: `1px solid ${statusColor}33`,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: statusColor,
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: statusColor }}>
            {statusLabel}
          </span>
        </div>

        {/* Details */}
        <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.6, marginBottom: 16 }}>
          {(status === "approved" || status === "cert_verified") && (
            <p>{tierName} is active — free while you're {isStudent ? "enrolled" : "on academy staff"}.</p>
          )}
          {(status === "pending_review" || status === "manual_review") && (
            <p>We're reviewing your {isStudent ? "enrollment" : "credentials"}. This usually takes less than 24 hours. You have full access in the meantime.</p>
          )}
          {status === "rejected" && (
            <p>We couldn't verify your {isStudent ? "enrollment" : "academy employment"}. Reply to your notification email if you think this is an error.</p>
          )}
        </div>

        {expiresDate && (status === "approved" || status === "cert_verified") && (
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
            Free access renews: {expiresDate}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(status === "approved" || status === "cert_verified") && (
            <>
              <button
                className="iconBtn"
                onClick={handleRenew}
                disabled={acting}
                style={{
                  background: "var(--accent)", color: "white",
                  borderColor: "var(--accent)", opacity: acting ? 0.7 : 1,
                }}
              >
                Re-Verify Now
              </button>
              <button
                className="iconBtn"
                onClick={handleGraduate}
                disabled={acting}
              >
                {isStudent ? "I've Graduated" : "I've Left the Academy"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
