import React, { useState } from "react";

/**
 * SuggestImprovementButton — CODEX 50.11 Layer C.
 *
 * Drop-in button + modal for filing an improvement request against a
 * worker. Domain experts (Kent — finance, Ruthie — healthcare) and
 * subscribers can use this to flag issues, suggest changes, or escalate
 * regulatory concerns. Submits to /v1/improvementRequests:create.
 *
 * Usage:
 *   <SuggestImprovementButton workerSlug={slug} />
 *
 * The button is intentionally low-key — a small text link rather than
 * a primary CTA — so it doesn't dominate the worker page UI but is
 * available on every worker for power users to find.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const SEVERITIES = [
  { value: "my_opinion",                 label: "My opinion",            hint: "Suggestion or preference. No urgency." },
  { value: "important",                  label: "Important",             hint: "Should be addressed but not blocking." },
  { value: "urgent_regulatory_or_safety", label: "Urgent — safety/legal", hint: "Compliance, safety, or regulatory issue. Needs prompt attention." },
];

const S = {
  trigger: {
    background: "none", border: "none", padding: "6px 10px", cursor: "pointer",
    fontSize: 12, color: "#7c3aed", fontWeight: 600, textDecoration: "underline",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20,
  },
  modal: {
    background: "#fff", borderRadius: 16, maxWidth: 560, width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)", padding: 28, maxHeight: "90vh", overflowY: "auto",
  },
  header: { fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 },
  subhead: { fontSize: 14, color: "#64748b", marginBottom: 20, lineHeight: 1.5 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8,
    border: "1px solid #cbd5e1", outline: "none", background: "#fff",
    color: "#1e293b", boxSizing: "border-box", marginBottom: 16,
  },
  textarea: {
    width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8,
    border: "1px solid #cbd5e1", outline: "none", background: "#fff",
    color: "#1e293b", boxSizing: "border-box", marginBottom: 16,
    resize: "vertical", minHeight: 100, fontFamily: "inherit",
  },
  severityRow: {
    display: "flex", flexDirection: "column", gap: 8, marginBottom: 16,
  },
  severityOption: {
    border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 14px", cursor: "pointer",
    background: "#fff", display: "flex", flexDirection: "column", gap: 2,
  },
  severityOptionActive: {
    border: "1px solid #7c3aed", background: "#faf5ff",
  },
  footer: {
    display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8,
  },
  btnSecondary: {
    padding: "10px 18px", fontSize: 14, fontWeight: 600, borderRadius: 8,
    border: "1px solid #cbd5e1", background: "#fff", color: "#475569", cursor: "pointer",
  },
  btnPrimary: {
    padding: "10px 22px", fontSize: 14, fontWeight: 700, borderRadius: 8,
    border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", cursor: "pointer",
  },
  errMsg: {
    padding: "10px 12px", background: "#fee2e2", border: "1px solid #fecaca",
    borderRadius: 8, color: "#991b1b", fontSize: 13, marginBottom: 16,
  },
  successMsg: {
    padding: "20px 12px", textAlign: "center", color: "#166534",
    fontSize: 15, lineHeight: 1.5,
  },
};

export default function SuggestImprovementButton({ workerSlug, label = "Suggest improvement" }) {
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState("my_opinion");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setTitle(""); setDescription(""); setSeverity("my_opinion");
    setError(null); setSubmitted(false); setSubmitting(false);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  async function submit() {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || null;
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      if (tenantId) headers["x-tenant-id"] = tenantId;
      const res = await fetch(`${API_BASE}/api?path=/v1/improvementRequests:create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ workerSlug, severity, title, description }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSubmitted(true);
    } catch (e) {
      setError(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!workerSlug) return null;

  return (
    <>
      <button style={S.trigger} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div style={S.overlay} onClick={close}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            {submitted ? (
              <>
                <div style={S.header}>Thanks — your request was filed</div>
                <div style={S.successMsg}>
                  The worker owner will see your suggestion in their queue.
                  Domain experts and high-severity items are prioritized.
                </div>
                <div style={S.footer}>
                  <button style={S.btnPrimary} onClick={close}>Done</button>
                </div>
              </>
            ) : (
              <>
                <div style={S.header}>Suggest an improvement</div>
                <div style={S.subhead}>
                  Tell the worker owner what could be better. Use this for accuracy issues,
                  missing capability, regulatory or safety concerns, or specific suggestions.
                </div>

                {error && <div style={S.errMsg}>{error}</div>}

                <label style={S.label}>Severity</label>
                <div style={S.severityRow}>
                  {SEVERITIES.map((s) => (
                    <div
                      key={s.value}
                      onClick={() => setSeverity(s.value)}
                      style={severity === s.value
                        ? { ...S.severityOption, ...S.severityOptionActive }
                        : S.severityOption}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{s.hint}</div>
                    </div>
                  ))}
                </div>

                <label style={S.label}>Title</label>
                <input
                  style={S.input}
                  type="text"
                  placeholder="Short summary of the issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />

                <label style={S.label}>What should change?</label>
                <textarea
                  style={S.textarea}
                  placeholder="Describe the issue and what good looks like. Include rule citations, examples, or specific cases when useful."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={4000}
                />

                <div style={S.footer}>
                  <button style={S.btnSecondary} onClick={close}>Cancel</button>
                  <button
                    style={submitting ? { ...S.btnPrimary, opacity: 0.6, cursor: "wait" } : S.btnPrimary}
                    onClick={submit}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
