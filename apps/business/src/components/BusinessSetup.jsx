/**
 * BusinessSetup.jsx — 3-step business setup wizard (49.4)
 * Collects business info, industry, and data connection preferences.
 * Under 5 minutes to complete. Triggers worker activation on finish.
 */

import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const INDUSTRIES = [
  { value: "auto-dealer", label: "Auto Dealer" },
  { value: "real-estate", label: "Real Estate" },
  { value: "aviation", label: "Aviation" },
  { value: "healthcare", label: "Healthcare & EMS" },
  { value: "professional-services", label: "Professional Services" },
  { value: "legal", label: "Legal" },
  { value: "construction", label: "Construction" },
  { value: "government", label: "Government" },
  { value: "solar", label: "Solar Energy" },
  { value: "web3", label: "Web3 / Blockchain" },
  { value: "other", label: "Other" },
];

const TEAM_SIZES = [
  { value: "just-me", label: "Just me" },
  { value: "2-5", label: "2-5 people" },
  { value: "6-20", label: "6-20 people" },
  { value: "21-50", label: "21-50 people" },
  { value: "50+", label: "50+ people" },
];

const DATA_SOURCES = [
  { id: "documents", label: "Upload business documents", description: "Licenses, contracts, financial statements" },
  { id: "contacts-csv", label: "Import contacts from CSV", description: "Customer and vendor lists" },
  { id: "social", label: "Connect social accounts", description: "LinkedIn, Twitter, Google Business" },
  { id: "email", label: "Connect email", description: "Extract contacts and signatures" },
];

const S = {
  container: {
    maxWidth: 560, margin: "0 auto", padding: "40px 24px",
  },
  header: { textAlign: "center", marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#64748b" },
  steps: { display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 },
  stepDot: {
    width: 32, height: 4, borderRadius: 2, background: "#e2e8f0", transition: "background 0.2s",
  },
  stepDotActive: {
    width: 32, height: 4, borderRadius: 2, background: "#6B46C1", transition: "background 0.2s",
  },
  field: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e2e8f0",
    borderRadius: 8, background: "#fff", boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e2e8f0",
    borderRadius: 8, background: "#fff", appearance: "auto", boxSizing: "border-box",
  },
  optionCard: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
    marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s",
  },
  optionCardSelected: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    background: "#faf5ff", border: "1px solid #6B46C1", borderRadius: 10,
    marginBottom: 8, cursor: "pointer",
  },
  optionLabel: { fontSize: 14, fontWeight: 600, color: "#1e293b" },
  optionDesc: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  checkbox: { width: 18, height: 18, accentColor: "#6B46C1", flexShrink: 0 },
  nav: { display: "flex", justifyContent: "space-between", marginTop: 32 },
  backBtn: {
    padding: "10px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8,
    border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer",
  },
  nextBtn: {
    padding: "10px 28px", fontSize: 14, fontWeight: 600, borderRadius: 8,
    border: "none", background: "#6B46C1", color: "#fff", cursor: "pointer",
  },
  nextBtnDisabled: {
    padding: "10px 28px", fontSize: 14, fontWeight: 600, borderRadius: 8,
    border: "none", background: "#cbd5e1", color: "#fff", cursor: "default",
  },
  error: { padding: 12, background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 16 },
};

export default function BusinessSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    name: "",
    industry: "",
    size: "just-me",
    email: "",
    website: "",
    dataSources: [],
  });

  function update(field, value) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  function toggleDataSource(id) {
    setData(prev => ({
      ...prev,
      dataSources: prev.dataSources.includes(id)
        ? prev.dataSources.filter(d => d !== id)
        : [...prev.dataSources, id],
    }));
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/onboarding:setupBusiness")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Setup failed");

      // Store industry for worker recommendations
      if (data.industry) localStorage.setItem("INDUSTRY", data.industry);
      if (data.name) localStorage.setItem("BUSINESS_NAME", data.name);

      if (onComplete) onComplete(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const canProceed = step === 1
    ? data.name.trim().length > 0
    : step === 2
      ? data.industry.length > 0
      : true;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.title}>
          {step === 1 ? "Tell us about your business" : step === 2 ? "What industry are you in?" : "Connect your data"}
        </div>
        <div style={S.subtitle}>
          {step === 1 ? "This takes about 2 minutes" : step === 2 ? "We'll recommend the right Digital Workers" : "Skip anything you're not ready for"}
        </div>
      </div>

      <div style={S.steps}>
        {[1, 2, 3].map(s => (
          <div key={s} style={s <= step ? S.stepDotActive : S.stepDot} />
        ))}
      </div>

      {error && <div style={S.error}>{error}</div>}

      {step === 1 && (
        <>
          <div style={S.field}>
            <label style={S.label}>Business name</label>
            <input
              style={S.input}
              placeholder="Acme Corp"
              value={data.name}
              onChange={e => update("name", e.target.value)}
              autoFocus
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Business email</label>
            <input
              style={S.input}
              type="email"
              placeholder="you@company.com"
              value={data.email}
              onChange={e => update("email", e.target.value)}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Website (optional)</label>
            <input
              style={S.input}
              placeholder="https://yourcompany.com"
              value={data.website}
              onChange={e => update("website", e.target.value)}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Team size</label>
            <select style={S.select} value={data.size} onChange={e => update("size", e.target.value)}>
              {TEAM_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </>
      )}

      {step === 2 && (
        <div style={S.field}>
          <label style={S.label}>Select your industry</label>
          {INDUSTRIES.map(ind => (
            <div
              key={ind.value}
              style={data.industry === ind.value ? S.optionCardSelected : S.optionCard}
              onClick={() => update("industry", ind.value)}
            >
              <input
                type="radio"
                name="industry"
                checked={data.industry === ind.value}
                onChange={() => update("industry", ind.value)}
                style={S.checkbox}
              />
              <span style={S.optionLabel}>{ind.label}</span>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div style={S.field}>
          <label style={S.label}>What would you like to connect? (optional)</label>
          {DATA_SOURCES.map(ds => (
            <div
              key={ds.id}
              style={data.dataSources.includes(ds.id) ? S.optionCardSelected : S.optionCard}
              onClick={() => toggleDataSource(ds.id)}
            >
              <input
                type="checkbox"
                checked={data.dataSources.includes(ds.id)}
                onChange={() => toggleDataSource(ds.id)}
                style={S.checkbox}
              />
              <div>
                <div style={S.optionLabel}>{ds.label}</div>
                <div style={S.optionDesc}>{ds.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={S.nav}>
        {step > 1 ? (
          <button style={S.backBtn} onClick={() => setStep(s => s - 1)}>Back</button>
        ) : <div />}
        {step < 3 ? (
          <button
            style={canProceed ? S.nextBtn : S.nextBtnDisabled}
            onClick={() => canProceed && setStep(s => s + 1)}
            disabled={!canProceed}
          >
            Continue
          </button>
        ) : (
          <button
            style={S.nextBtn}
            onClick={handleFinish}
            disabled={saving}
          >
            {saving ? "Setting up..." : "Start Using TitleApp"}
          </button>
        )}
      </div>
    </div>
  );
}
