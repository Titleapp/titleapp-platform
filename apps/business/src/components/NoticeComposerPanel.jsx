// Reusable notice composer — used by IR (fundraise worker, /fundraise/admin)
// AND HR (platform-hr worker). Kind prop swaps the endpoint set + templates;
// shell renders identical UX both sides.
//
// Props:
//   kind: "ir" | "hr"           which endpoint set + recipient group to use
//   fundraiseId: string         (ir mode) required
//   tenantId: string            (hr mode) required
//   compact?: boolean           hide header/divider when embedded in worker

import React, { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, opts = {}) {
  let token = null;
  try { if (auth.currentUser) token = await auth.currentUser.getIdToken(); } catch (_) {}
  if (!token) token = localStorage.getItem("ID_TOKEN");
  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

// Per-kind endpoint configs. Adding a new worker = drop another entry here.
const KIND_CONFIG = {
  ir: {
    title: "Notice composer",
    blurb: "Email, cold-invite, or SAFE signature requests. Logs audit + tracks opens/clicks via SendGrid; SAFE goes through DBX Sign.",
    templatesEndpoint: "/v1/ir:notice-templates",
    listEndpoint: (id) => `/v1/ir:notices:list?fundraiseId=${encodeURIComponent(id)}`,
    sendEndpoint: "/v1/ir:send-notice",
    coldInviteEndpoint: "/v1/ir:send-cold-invite",
    coldInviteTemplateId: "cold_invite",
    signatureEndpoint: "/v1/ir:send-safe",
    signatureTemplateId: "safe",
    signatureLabel: "Send SAFE for signature",
    entityIdField: "fundraiseId",
    entitledGroup: "entitled-investors",
    entitledLabel: "All entitled investors",
    signatureFields: [
      { key: "name",    label: "Investor name",            placeholder: "Jane Investor" },
      { key: "email",   label: "Investor email",           placeholder: "jane@fund.com", type: "email" },
      { key: "amount",  label: "Investment amount (USD)",  placeholder: "100000", hint: "Optional. Merged into the SAFE as commitment amount." },
    ],
  },
  hr: {
    title: "HR notice composer",
    blurb: "Advisor welcome, cold invites, or Advisor Agreement signature requests. SendGrid for email; DBX Sign for the HOMMIE Warrant.",
    templatesEndpoint: "/v1/hr:notice-templates",
    listEndpoint: (id) => `/v1/hr:notices:list?tenantId=${encodeURIComponent(id)}`,
    sendEndpoint: "/v1/hr:send-notice",
    coldInviteEndpoint: "/v1/hr:send-advisor-invite",
    coldInviteTemplateId: "advisor_cold_invite",
    signatureEndpoint: "/v1/hr:send-advisor-agreement",
    signatureTemplateId: "advisor_agreement",
    signatureLabel: "Send Advisor Agreement for signature",
    entityIdField: "tenantId",
    entitledGroup: "entitled-advisors",
    entitledLabel: "All entitled advisors",
    signatureFields: [
      { key: "name",   label: "Advisor name",   placeholder: "Jane Advisor" },
      { key: "email",  label: "Advisor email",  placeholder: "jane@example.com", type: "email" },
    ],
  },
};

const S = {
  card:        { background: "#fff", border: "1px solid #a78bfa", borderRadius: 12, padding: 24, margin: "16px 0" },
  frTitle:     { fontSize: 16, fontWeight: 700, color: "#1a202c" },
  frMeta:      { fontSize: 12, color: "#64748b", marginTop: 4 },
  divider:     { height: 1, background: "#e2e8f0", margin: "16px 0" },
  field:       { marginBottom: 14 },
  label:       { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" },
  input:       { width: "100%", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" },
  hint:        { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  row:         { display: "flex", gap: 8, marginTop: 16, alignItems: "center" },
  btnPrim:     { background: "#7c3aed", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" },
  btnDis:      { background: "#cbd5e1", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "not-allowed" },
  status:      { fontSize: 12 },
  ok:          { color: "#16a34a" },
  err:         { color: "#dc2626" },
};

export default function NoticeComposerPanel({ kind = "ir", fundraiseId, tenantId, compact = false }) {
  const cfg = KIND_CONFIG[kind] || KIND_CONFIG.ir;
  const entityId = kind === "hr" ? tenantId : fundraiseId;

  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(""); // set once templates load
  const [subject, setSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [recipientMode, setRecipientMode] = useState("entitled");
  const [manualEmails, setManualEmails] = useState("");
  // Cold-invite mode — rich per-recipient rows with optional personalized
  // deck PDF attachment. Each row is its own send; PDFs are base64-encoded
  // client-side and threaded through the SendGrid attachments field.
  const [richRecipients, setRichRecipients] = useState([
    { name: "", email: "", firstName: "", deckBase64: "", deckFilename: "", customBodyHtml: "" },
  ]);
  // CC list — defaults to Sean for visibility on every cold-invite send so
  // he sees what landed in advisors' inboxes. Post-rebrand the working address
  // is sean@sociii.ai; the @titleapp.ai address still routes but lands in the
  // legacy inbox.
  const [ccList, setCcList] = useState("sean@sociii.ai");
  // Signature-specific fields (SAFE for IR, Advisor Agreement for HR)
  const [sigName, setSigName] = useState("");
  const [sigEmail, setSigEmail] = useState("");
  const [sigAmount, setSigAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [recentNotices, setRecentNotices] = useState([]);

  function updateRichRecipient(idx, field, value) {
    setRichRecipients(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }
  function addRichRecipient() {
    setRichRecipients(prev => [...prev, { name: "", email: "", firstName: "", deckBase64: "", deckFilename: "", customBodyHtml: "" }]);
  }
  function removeRichRecipient(idx) {
    setRichRecipients(prev => prev.filter((_, i) => i !== idx));
  }
  async function handleDeckFile(idx, file) {
    if (!file) {
      updateRichRecipient(idx, "deckBase64", "");
      updateRichRecipient(idx, "deckFilename", "");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setStatus({ kind: "err", msg: `File ${file.name} is ${(file.size/1024/1024).toFixed(1)}MB. Keep under 15MB.` });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1] || "";
      setRichRecipients(prev => prev.map((r, i) => i === idx
        ? { ...r, deckBase64: base64, deckFilename: file.name }
        : r));
    };
    reader.readAsDataURL(file);
  }

  const loadRecent = useCallback(() => {
    if (!entityId) return;
    apiFetch(cfg.listEndpoint(entityId)).then(r => {
      if (r?.ok) setRecentNotices(r.notices || []);
    });
  }, [cfg, entityId]);

  useEffect(() => {
    apiFetch(cfg.templatesEndpoint).then(r => {
      if (r?.ok) {
        setTemplates(r.templates || []);
        if (r.templates?.length > 0 && !templateId) setTemplateId(r.templates[0].id);
      }
    });
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.templatesEndpoint, loadRecent]);

  useEffect(() => {
    const t = templates.find(x => x.id === templateId);
    if (t?.defaultSubject) setSubject(t.defaultSubject);
  }, [templateId, templates]);

  const isCustom = templateId === "custom";
  const isSignature = templateId === cfg.signatureTemplateId;
  const isColdInvite = templateId === cfg.coldInviteTemplateId;

  async function send() {
    setSending(true); setStatus(null);
    try {
      let res;
      if (isSignature) {
        if (!sigName || !sigEmail) {
          setStatus({ kind: "err", msg: "Name + email required." });
          setSending(false); return;
        }
        const payload = {
          [cfg.entityIdField]: entityId,
          recipientEmail: sigEmail,
          recipientName: sigName,
        };
        if (kind === "ir" && sigAmount) {
          payload.investmentAmount = Number(sigAmount.replace(/[^\d.]/g, ""));
        }
        res = await apiFetch(cfg.signatureEndpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        const payload = {
          [cfg.entityIdField]: entityId,
          templateId,
          subject,
        };
        // Cold invite uses rich recipient rows (per-row deck PDF + CC).
        // Other templates use the simpler entitled-group / manual list flow.
        if (isColdInvite) {
          const rows = richRecipients
            .filter(r => r.email && r.email.includes("@"))
            .map(r => ({
              email: r.email.trim(),
              name: r.name?.trim() || null,
              firstName: r.firstName?.trim() || (r.name || "").trim().split(/\s+/)[0] || null,
              deckBase64: r.deckBase64 || null,
              deckFilename: r.deckFilename || null,
              customBodyHtml: r.customBodyHtml?.trim() || null,
            }));
          if (rows.length === 0) {
            setStatus({ kind: "err", msg: "Need at least one recipient with a valid email." });
            setSending(false); return;
          }
          payload.recipients = rows;
          const ccs = ccList.split(/[\s,;]+/).map(s => s.trim()).filter(s => s.includes("@"));
          if (ccs.length) payload.cc = ccs;
        } else if (recipientMode === "entitled") {
          payload.recipientGroup = cfg.entitledGroup;
        } else {
          payload.recipients = manualEmails
            .split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
            .map(email => ({ email }));
          if (payload.recipients.length === 0) {
            setStatus({ kind: "err", msg: "No valid emails." });
            setSending(false); return;
          }
        }
        if (isCustom) payload.body = customBody;
        const endpoint = isColdInvite ? cfg.coldInviteEndpoint : cfg.sendEndpoint;
        res = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
      }
      if (res.ok) {
        const sentMsg = isSignature
          ? `${cfg.signatureLabel.replace("Send ", "")} sent. Recipient gets DBX Sign email.`
          : `Sent ${res.okCount}/${res.okCount + res.failCount}`;
        setStatus({ kind: "ok", msg: sentMsg });
        loadRecent();
      } else {
        setStatus({ kind: "err", msg: res.error || "Send failed" });
      }
    } catch (e) {
      setStatus({ kind: "err", msg: e.message });
    } finally {
      setSending(false);
    }
  }

  if (!entityId) {
    return <div style={{ ...S.card, color: "#94a3b8", fontSize: 13 }}>No {cfg.entityIdField} provided.</div>;
  }

  return (
    <div style={S.card}>
      {!compact && (
        <>
          <div style={S.frTitle}>{cfg.title} · {entityId}</div>
          <div style={S.frMeta}>{cfg.blurb}</div>
          <div style={S.divider} />
        </>
      )}

      <div style={S.field}>
        <label style={S.label}>Template</label>
        <select style={S.input} value={templateId} onChange={e => setTemplateId(e.target.value)}>
          {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {!isSignature && (
        <div style={S.field}>
          <label style={S.label}>Subject</label>
          <input style={S.input} value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
      )}

      {isCustom && (
        <div style={S.field}>
          <label style={S.label}>HTML body</label>
          <textarea
            style={{ ...S.input, minHeight: 120, fontFamily: "monospace", fontSize: 12 }}
            value={customBody}
            onChange={e => setCustomBody(e.target.value)}
            placeholder="<p>Hi {firstName}, ...</p>"
          />
          <div style={S.hint}>Plain HTML. Variables substituted server-side.</div>
        </div>
      )}

      {isSignature ? (
        <>
          <div style={S.field}>
            <label style={S.label}>{cfg.signatureFields[0].label}</label>
            <input style={S.input} value={sigName} onChange={e => setSigName(e.target.value)} placeholder={cfg.signatureFields[0].placeholder} />
          </div>
          <div style={S.field}>
            <label style={S.label}>{cfg.signatureFields[1].label}</label>
            <input style={S.input} type="email" value={sigEmail} onChange={e => setSigEmail(e.target.value)} placeholder={cfg.signatureFields[1].placeholder} />
          </div>
          {cfg.signatureFields[2] && (
            <div style={S.field}>
              <label style={S.label}>{cfg.signatureFields[2].label}</label>
              <input style={S.input} value={sigAmount} onChange={e => setSigAmount(e.target.value)} placeholder={cfg.signatureFields[2].placeholder} />
              {cfg.signatureFields[2].hint && <div style={S.hint}>{cfg.signatureFields[2].hint}</div>}
            </div>
          )}
        </>
      ) : isColdInvite ? (
        <>
          <div style={S.field}>
            <label style={S.label}>CC (every send is BCC'd here)</label>
            <input
              style={S.input}
              value={ccList}
              onChange={e => setCcList(e.target.value)}
              placeholder="sean@sociii.ai"
            />
            <div style={S.hint}>Comma-separated. Defaults to sean@sociii.ai so you see what landed in each advisor's inbox.</div>
          </div>
          <div style={S.field}>
            <label style={S.label}>Recipients · personalized deck per row</label>
            {richRecipients.map((r, idx) => (
              <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    style={{ ...S.input, flex: 1 }}
                    value={r.name}
                    onChange={e => updateRichRecipient(idx, "name", e.target.value)}
                    placeholder="Full name (e.g. Jane Doe)"
                  />
                  <input
                    style={{ ...S.input, flex: 1 }}
                    type="email"
                    value={r.email}
                    onChange={e => updateRichRecipient(idx, "email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ ...S.input, flex: 1, fontSize: 12 }}
                    value={r.firstName}
                    onChange={e => updateRichRecipient(idx, "firstName", e.target.value)}
                    placeholder="First name for greeting (optional)"
                  />
                  {richRecipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRichRecipient(idx)}
                      style={{ background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
                    >Remove</button>
                  )}
                </div>
                <label
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    marginTop: 8,
                    fontSize: 13, fontWeight: 500,
                    color: r.deckFilename ? "#15803d" : "#7c3aed",
                    cursor: "pointer",
                    padding: "10px 14px",
                    border: r.deckFilename ? "2px solid #86efac" : "2px dashed #c4b5fd",
                    borderRadius: 8,
                    background: r.deckFilename ? "#f0fdf4" : "#faf5ff",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{r.deckFilename ? "✓" : "📎"}</span>
                  {r.deckFilename
                    ? <span>Attached: <strong>{r.deckFilename}</strong> · click to replace</span>
                    : <span>Attach personalized deck (PDF) for this recipient</span>}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: "none" }}
                    onChange={e => handleDeckFile(idx, e.target.files?.[0])}
                  />
                </label>
                <div style={{ marginTop: 8 }}>
                  <textarea
                    style={{ ...S.input, minHeight: 60, fontSize: 12, fontFamily: "monospace" }}
                    value={r.customBodyHtml}
                    onChange={e => updateRichRecipient(idx, "customBodyHtml", e.target.value)}
                    placeholder="Optional custom message — overrides the template body for THIS recipient only. Plain text or HTML. Leave blank to use the standard cold-invite copy."
                  />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    Optional. Use {"{firstName}"} as a placeholder. If set, the template body is replaced entirely for this row.
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addRichRecipient}
              style={{ background: "#fff", color: "#7c3aed", border: "1px dashed #c4b5fd", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >+ Add recipient</button>
          </div>
        </>
      ) : (
        <div style={S.field}>
          <label style={S.label}>Recipients</label>
          <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 6 }}>
            <label><input type="radio" name="rm" value="entitled" checked={recipientMode === "entitled"} onChange={() => setRecipientMode("entitled")} /> {cfg.entitledLabel}</label>
            <label><input type="radio" name="rm" value="manual" checked={recipientMode === "manual"} onChange={() => setRecipientMode("manual")} /> Manual list</label>
          </div>
          {recipientMode === "manual" && (
            <textarea
              style={{ ...S.input, minHeight: 60, fontSize: 12 }}
              value={manualEmails}
              onChange={e => setManualEmails(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
            />
          )}
        </div>
      )}

      <div style={S.row}>
        <button style={sending ? S.btnDis : S.btnPrim} disabled={sending} onClick={send}>
          {sending ? "Sending…" : (isSignature ? cfg.signatureLabel : isColdInvite ? "Send cold invite" : "Send notice")}
        </button>
        {status && <span style={{ ...S.status, ...(status.kind === "ok" ? S.ok : S.err) }}>{status.msg}</span>}
      </div>

      {recentNotices.length > 0 && (
        <>
          <div style={S.divider} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Recent notices</div>
          {recentNotices.slice(0, 5).map(n => (
            <div key={n.noticeId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ color: "#1a202c", fontWeight: 500 }}>{n.subject}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{n.templateLabel} · {n.recipientCount} recipient{n.recipientCount === 1 ? "" : "s"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div>{n.okCount}/{n.recipientCount} sent</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{n.sentAt ? new Date(n.sentAt).toLocaleString() : ""}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
