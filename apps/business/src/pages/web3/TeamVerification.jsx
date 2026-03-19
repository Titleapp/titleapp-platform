import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const ROLES = ["Developer", "Community Manager", "Social Media", "Legal Advisor", "Marketing", "Operations", "Finance", "Other"];

const S = {
  page: { maxWidth: 640, margin: "0 auto", padding: "48px 24px" },
  title: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 32, lineHeight: 1.5 },
  card: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 24 },
  stepLabel: { fontSize: 12, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  stepTitle: { fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 },
  checkRow: { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  checkLabel: { fontSize: 14, color: "#374151", lineHeight: 1.5 },
  btn: { padding: "12px 28px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 16 },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  input: { width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 12 },
  select: { width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 12 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 16 },
  th: { textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 12px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f1f5f9" },
  statusPending: { color: "#f59e0b", fontWeight: 600, fontSize: 12 },
  statusVerified: { color: "#10b981", fontWeight: 600, fontSize: 12 },
  done: { textAlign: "center", padding: "32px 0" },
  doneIcon: { width: 48, height: 48, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
};

export default function TeamVerification() {
  const [step, setStep] = useState(1); // 1: attestation, 2: identity, 3: roster
  const [checks, setChecks] = useState([false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const [entityName, setEntityName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Developer");
  const [members, setMembers] = useState([]);

  const allChecked = checks.every(Boolean);

  async function submitAttestation() {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      await fetch(`${API_BASE}/api?path=/v1/web3:submitAttestation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ attestations: ["no_financial_returns", "collectibles_utility", "legal_review"] }),
      });
      setStep(2);
    } catch {}
    setSubmitting(false);
  }

  async function submitIdentity() {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      await fetch(`${API_BASE}/api?path=/v1/web3:submitOwnerIdentity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entityName, jurisdiction }),
      });
      setStep(3);
    } catch {}
    setSubmitting(false);
  }

  async function inviteMember() {
    if (!memberEmail.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      await fetch(`${API_BASE}/api?path=/v1/web3:inviteTeamMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: memberEmail.trim(), role: memberRole }),
      });
      setMembers(prev => [...prev, { email: memberEmail.trim(), role: memberRole, status: "Pending", date: null }]);
      setMemberEmail("");
    } catch {}
    setSubmitting(false);
  }

  return (
    <div style={S.page}>
      <div style={S.title}>Web3 Suite — Team Verification</div>
      <div style={S.subtitle}>TitleApp requires identity verification for all Web3 project teams. Complete each step to activate your workers.</div>

      {/* Step 1: Attestation */}
      <div style={{ ...S.card, opacity: step >= 1 ? 1 : 0.5 }}>
        <div style={S.stepLabel}>Step 1</div>
        <div style={S.stepTitle}>Project Attestation</div>
        {[
          "This project does not promise financial returns to holders",
          "Tokens and NFTs are collectibles/utility items, not investment contracts",
          "I have reviewed TitleApp Web3 Terms with qualified legal counsel",
        ].map((text, i) => (
          <div key={i} style={S.checkRow}>
            <input type="checkbox" checked={checks[i]} onChange={() => { const c = [...checks]; c[i] = !c[i]; setChecks(c); }} style={{ marginTop: 2, accentColor: "#7c3aed" }} disabled={step !== 1} />
            <span style={S.checkLabel}>{text}</span>
          </div>
        ))}
        {step === 1 && (
          <button style={{ ...S.btn, ...((!allChecked || submitting) ? S.btnDisabled : {}) }} onClick={submitAttestation} disabled={!allChecked || submitting}>
            {submitting ? "Submitting..." : "I Agree — Continue to Identity Verification"}
          </button>
        )}
        {step > 1 && <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600, marginTop: 12 }}>Attestation complete</div>}
      </div>

      {/* Step 2: Identity */}
      <div style={{ ...S.card, opacity: step >= 2 ? 1 : 0.5 }}>
        <div style={S.stepLabel}>Step 2</div>
        <div style={S.stepTitle}>Owner Identity Verification</div>
        {step === 2 ? (
          <>
            <input style={S.input} type="text" placeholder="Legal entity name" value={entityName} onChange={e => setEntityName(e.target.value)} />
            <input style={S.input} type="text" placeholder="Jurisdiction of incorporation" value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} />
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Stripe Identity will verify your government-issued ID. Takes about 60 seconds.</div>
            <button style={{ ...S.btn, ...(submitting ? S.btnDisabled : {}) }} onClick={submitIdentity} disabled={submitting}>
              {submitting ? "Verifying..." : "Verify My Identity"}
            </button>
          </>
        ) : step > 2 ? (
          <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>Identity verified</div>
        ) : (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Complete Step 1 first</div>
        )}
      </div>

      {/* Step 3: Team Roster */}
      <div style={{ ...S.card, opacity: step >= 3 ? 1 : 0.5 }}>
        <div style={S.stepLabel}>Step 3</div>
        <div style={S.stepTitle}>Team Roster</div>
        {step === 3 ? (
          <>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Add your team members. Each will receive an email with a verification link. Workers activate once they verify.</div>
            <input style={S.input} type="email" placeholder="team@example.com" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} />
            <select style={S.select} value={memberRole} onChange={e => setMemberRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button style={{ ...S.btn, ...(submitting ? S.btnDisabled : {}) }} onClick={inviteMember} disabled={submitting || !memberEmail.trim()}>
              {submitting ? "Sending..." : "Send Verification Invite"}
            </button>

            {members.length > 0 && (
              <table style={S.table}>
                <thead>
                  <tr><th style={S.th}>Email</th><th style={S.th}>Role</th><th style={S.th}>Status</th></tr>
                </thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr key={i}>
                      <td style={S.td}>{m.email}</td>
                      <td style={S.td}>{m.role}</td>
                      <td style={S.td}><span style={m.status === "Verified" ? S.statusVerified : S.statusPending}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Complete Step 2 first</div>
        )}
      </div>
    </div>
  );
}
