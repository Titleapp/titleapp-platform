// Reusable IR notice composer — used by /fundraise/admin (full-page) AND
// inline inside the Fundraise worker's Notices canvas tab (founder side).
//
// Renders template picker + recipients (entitled investors / manual list /
// cold list) + subject + optional HTML body + send. Calls /v1/ir:send-notice
// or /v1/ir:send-cold-invite or /v1/ir:send-safe depending on template.

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

const SAFE_RECIPIENT_LIMIT = 1; // SAFE is per-investor; multi-send disabled to prevent footgun

export default function NoticeComposerPanel({ fundraiseId, compact = false }) {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("kickoff");
  const [subject, setSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [recipientMode, setRecipientMode] = useState("entitled");
  const [manualEmails, setManualEmails] = useState("");
  // SAFE-specific fields
  const [safeName, setSafeName] = useState("");
  const [safeEmail, setSafeEmail] = useState("");
  const [safeAmount, setSafeAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [recentNotices, setRecentNotices] = useState([]);

  const loadRecent = useCallback(() => {
    apiFetch(`/v1/ir:notices:list?fundraiseId=${encodeURIComponent(fundraiseId)}`).then(r => {
      if (r?.ok) setRecentNotices(r.notices || []);
    });
  }, [fundraiseId]);

  useEffect(() => {
    apiFetch("/v1/ir:notice-templates").then(r => {
      if (r?.ok) setTemplates(r.templates || []);
    });
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    const t = templates.find(x => x.id === templateId);
    if (t?.defaultSubject) setSubject(t.defaultSubject);
  }, [templateId, templates]);

  const isCustom = templateId === "custom";
  const isSafe = templateId === "safe";
  const isColdInvite = templateId === "cold_invite";

  async function send() {
    setSending(true); setStatus(null);
    try {
      let res;
      if (isSafe) {
        if (!safeName || !safeEmail) {
          setStatus({ kind: "err", msg: "Investor name + email required." });
          setSending(false); return;
        }
        res = await apiFetch("/v1/ir:send-safe", {
          method: "POST",
          body: JSON.stringify({
            fundraiseId,
            recipientEmail: safeEmail,
            recipientName: safeName,
            investmentAmount: safeAmount ? Number(safeAmount.replace(/[^\d.]/g, "")) : null,
          }),
        });
      } else {
        const payload = { fundraiseId, templateId, subject };
        if (recipientMode === "entitled") {
          payload.recipientGroup = "entitled-investors";
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
        const endpoint = isColdInvite ? "/v1/ir:send-cold-invite" : "/v1/ir:send-notice";
        res = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        const sentMsg = isSafe
          ? "SAFE sent for signature. Investor will receive DBX Sign email."
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

  return (
    <div style={S.card}>
      {!compact && (
        <>
          <div style={S.frTitle}>Notice composer · {fundraiseId}</div>
          <div style={S.frMeta}>Email, cold-invite, or SAFE signature requests. Logs audit + tracks opens/clicks via SendGrid; SAFE goes through DBX Sign.</div>
          <div style={S.divider} />
        </>
      )}

      <div style={S.field}>
        <label style={S.label}>Template</label>
        <select style={S.input} value={templateId} onChange={e => setTemplateId(e.target.value)}>
          {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {!isSafe && (
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

      {isSafe ? (
        <>
          <div style={S.field}>
            <label style={S.label}>Investor name</label>
            <input style={S.input} value={safeName} onChange={e => setSafeName(e.target.value)} placeholder="Jane Investor" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Investor email</label>
            <input style={S.input} type="email" value={safeEmail} onChange={e => setSafeEmail(e.target.value)} placeholder="jane@fund.com" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Investment amount (USD)</label>
            <input style={S.input} value={safeAmount} onChange={e => setSafeAmount(e.target.value)} placeholder="100000" />
            <div style={S.hint}>Optional. Will be merged into the SAFE document as the commitment amount.</div>
          </div>
        </>
      ) : (
        <div style={S.field}>
          <label style={S.label}>Recipients</label>
          <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 6 }}>
            <label><input type="radio" name="rm" value="entitled" checked={recipientMode === "entitled"} onChange={() => setRecipientMode("entitled")} /> All entitled investors</label>
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
          {isColdInvite && (
            <div style={S.hint}>
              Cold invite includes a magic link to /onboard/investor — KYC + accreditation,
              then auto-grants data-room access.
            </div>
          )}
        </div>
      )}

      <div style={S.row}>
        <button style={sending ? S.btnDis : S.btnPrim} disabled={sending} onClick={send}>
          {sending ? "Sending…" : (isSafe ? "Send SAFE for signature" : isColdInvite ? "Send cold invite" : "Send notice")}
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
