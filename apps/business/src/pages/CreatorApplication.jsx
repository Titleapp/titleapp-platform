import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" },
  card: { background: "white", borderRadius: 16, padding: "48px 40px", maxWidth: 560, width: "100%", border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" },
  logo: { fontSize: 20, fontWeight: 700, color: "#7c3aed", textAlign: "center", marginBottom: 32, cursor: "pointer" },
  title: { fontSize: 24, fontWeight: 700, color: "#111827", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#6b7280", textAlign: "center", marginBottom: 32, lineHeight: 1.6 },
  field: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none" },
  textarea: { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", minHeight: 80, resize: "vertical", fontFamily: "inherit" },
  select: { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", background: "white" },
  checkbox: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24, marginTop: 24 },
  checkLabel: { fontSize: 13, color: "#6b7280", lineHeight: 1.5 },
  btn: { width: "100%", padding: "14px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "14px 24px", background: "#d1d5db", color: "#9ca3af", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "not-allowed" },
  success: { textAlign: "center", padding: "20px 0" },
  successTitle: { fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 12 },
  successText: { fontSize: 14, color: "#6b7280", lineHeight: 1.6 },
};

export default function CreatorApplication() {
  const [form, setForm] = useState({ name: "", email: "", linkedin: "", expertise: "", description: "", audience: "" });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const canSubmit = form.name && form.email && form.linkedin && form.expertise && form.description && form.audience && agreed && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api?path=/v1/creator:apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (data.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.logo} onClick={() => window.location.href = "/"}>TitleApp</div>
          <div style={S.success}>
            <div style={S.successTitle}>Application received</div>
            <div style={S.successText}>
              We review applications within 48 hours. We're looking for domain expertise, a clear use case, and an audience to serve.
              <br /><br />
              We'll email you at <strong>{form.email}</strong> with next steps.
              <br /><br />
              In the meantime, keep building. Your Digital Worker will be ready to go live the moment you're approved.
            </div>
            <button style={{ ...S.btn, marginTop: 24, maxWidth: 240 }} onClick={() => window.location.href = "/sandbox"}>Back to Sandbox</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo} onClick={() => window.location.href = "/"}>TitleApp</div>
        <div style={S.title}>Apply to Publish on TitleApp</div>
        <div style={S.subtitle}>Share your expertise with the world. Earn 75% of every subscription.</div>
        <form onSubmit={handleSubmit}>
          <div style={S.field}>
            <label style={S.label}>Full name</label>
            <input style={S.input} value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
          </div>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
          </div>
          <div style={S.field}>
            <label style={S.label}>LinkedIn profile</label>
            <input style={S.input} value={form.linkedin} onChange={(e) => updateField("linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." required />
          </div>
          <div style={S.field}>
            <label style={S.label}>Area of expertise</label>
            <select style={S.select} value={form.expertise} onChange={(e) => updateField("expertise", e.target.value)} required>
              <option value="">Select...</option>
              <option value="auto">Auto Dealers</option>
              <option value="aviation">Aviation</option>
              <option value="real-estate">Real Estate</option>
              <option value="mortgage">Mortgage</option>
              <option value="healthcare">Healthcare</option>
              <option value="tax">Tax</option>
              <option value="legal">Legal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>What Digital Worker are you publishing?</label>
            <textarea style={S.textarea} value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Describe the problem it solves in 2-3 sentences..." required />
          </div>
          <div style={S.field}>
            <label style={S.label}>Who is your audience?</label>
            <textarea style={S.textarea} value={form.audience} onChange={(e) => updateField("audience", e.target.value)} placeholder="Who would hire this Digital Worker? How will you reach them?" required />
          </div>
          <div style={S.checkbox}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={S.checkLabel}>I agree to the $49/year creator license fee, billed after my application is accepted.</span>
          </div>
          {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" style={canSubmit ? S.btn : S.btnDisabled} disabled={!canSubmit}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
