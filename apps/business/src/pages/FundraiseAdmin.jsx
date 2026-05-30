// Founder-side admin surface for fundraise materials.
//
// Route: /fundraise/admin
// Lists fundraises the signed-in user can admin (via /v1/fundraise-admin:list)
// and lets them set per-fundraise materials URLs (whitepaper / deck / data
// room / office hours) that drive the investor-side materials cards.
//
// Replaces the chat-message + manual-script backfill loop. Now founders can
// configure materials end-to-end without sending URLs to support.

import { useCallback, useEffect, useState } from "react";
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

const FIELDS = [
  { key: "whitepaperUrl",  label: "Whitepaper URL",      placeholder: "https://app.titleapp.ai/whitepaper",  hint: "Renders as the SOCIII whitepaper card." },
  { key: "deckUrl",        label: "Investor deck URL",   placeholder: "https://app.titleapp.ai/data-room/...pptx", hint: "Direct download or hosted-viewer link." },
  { key: "dataRoomUrl",    label: "Data room URL",       placeholder: "https://app.titleapp.ai/data-room",   hint: "Page listing all canonical docs." },
  { key: "officeHoursUrl", label: "Office hours URL",    placeholder: "https://cal.com/sean/sociii (or leave blank)", hint: "Calendly / Cal.com link. Leave blank for 'share directly'." },
];

const S = {
  page:    { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", color: "#1a202c" },
  header:  { borderBottom: "1px solid #e2e8f0", padding: "16px 24px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" },
  brand:   { color: "#7c3aed", fontWeight: 700, fontSize: 18, textDecoration: "none" },
  scope:   { fontSize: 12, color: "#64748b" },
  body:    { maxWidth: 800, margin: "0 auto", padding: "32px 24px 64px" },
  h1:      { fontSize: 24, fontWeight: 800, color: "#1a202c", marginBottom: 6 },
  lead:    { fontSize: 14, color: "#475569", marginBottom: 28, lineHeight: 1.6 },
  card:    { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, marginBottom: 16 },
  frTitle: { fontSize: 16, fontWeight: 700, color: "#1a202c" },
  frMeta:  { fontSize: 12, color: "#64748b", marginTop: 4 },
  divider: { height: 1, background: "#e2e8f0", margin: "16px 0" },
  field:   { marginBottom: 14 },
  label:   { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" },
  input:   { width: "100%", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" },
  hint:    { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  row:     { display: "flex", gap: 8, marginTop: 16 },
  btnPrim: { background: "#7c3aed", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" },
  btnDis:  { background: "#cbd5e1", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "not-allowed" },
  status:  { fontSize: 12, alignSelf: "center" },
  ok:      { color: "#16a34a" },
  err:     { color: "#dc2626" },
  empty:   { padding: 40, textAlign: "center", color: "#64748b", fontSize: 14 },
  loading: { padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 },
};

function FundraiseCard({ fundraise, onSaved }) {
  const [values, setValues] = useState({
    whitepaperUrl:  fundraise.materials?.whitepaperUrl  || "",
    deckUrl:        fundraise.materials?.deckUrl        || "",
    dataRoomUrl:    fundraise.materials?.dataRoomUrl    || "",
    officeHoursUrl: fundraise.materials?.officeHoursUrl || "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  function handleChange(key, v) {
    setValues(prev => ({ ...prev, [key]: v }));
    setStatus(null);
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiFetch("/v1/fundraise-admin:set-materials", {
        method: "POST",
        body: JSON.stringify({ fundraiseId: fundraise.fundraiseId, materials: values }),
      });
      if (res.ok) {
        setStatus({ kind: "ok", msg: "Saved." });
        if (onSaved) onSaved(fundraise.fundraiseId, res.materials);
      } else {
        setStatus({ kind: "err", msg: res.error || "Save failed." });
      }
    } catch (e) {
      setStatus({ kind: "err", msg: e.message || "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.card}>
      <div style={S.frTitle}>{fundraise.name || "Untitled fundraise"}</div>
      <div style={S.frMeta}>
        {fundraise.fundraiseId} · tenant {fundraise.tenantId || "—"}
      </div>
      <div style={S.divider} />
      {FIELDS.map(f => (
        <div key={f.key} style={S.field}>
          <label style={S.label}>{f.label}</label>
          <input
            style={S.input}
            type="url"
            placeholder={f.placeholder}
            value={values[f.key]}
            onChange={e => handleChange(f.key, e.target.value)}
          />
          <div style={S.hint}>{f.hint}</div>
        </div>
      ))}
      <div style={S.row}>
        <button
          style={saving ? S.btnDis : S.btnPrim}
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save materials"}
        </button>
        {status && (
          <span style={{ ...S.status, ...(status.kind === "ok" ? S.ok : S.err) }}>{status.msg}</span>
        )}
      </div>
    </div>
  );
}

function NoticeComposerPanel({ fundraiseId }) {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("kickoff");
  const [subject, setSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [recipientMode, setRecipientMode] = useState("entitled");
  const [manualEmails, setManualEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [recentNotices, setRecentNotices] = useState([]);

  useEffect(() => {
    apiFetch("/v1/ir:notice-templates").then(r => {
      if (r?.ok) setTemplates(r.templates || []);
    });
    apiFetch(`/v1/ir:notices:list?fundraiseId=${encodeURIComponent(fundraiseId)}`).then(r => {
      if (r?.ok) setRecentNotices(r.notices || []);
    });
  }, [fundraiseId]);

  useEffect(() => {
    const t = templates.find(x => x.id === templateId);
    if (t?.defaultSubject) setSubject(t.defaultSubject);
  }, [templateId, templates]);

  async function send() {
    setSending(true); setStatus(null);
    try {
      const payload = { fundraiseId, templateId, subject };
      if (recipientMode === "entitled") {
        payload.recipientGroup = "entitled-investors";
      } else {
        payload.recipients = manualEmails
          .split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
          .map(email => ({ email }));
        if (payload.recipients.length === 0) {
          setStatus({ kind: "err", msg: "No valid emails." });
          setSending(false);
          return;
        }
      }
      if (templateId === "custom") payload.body = customBody;
      const res = await apiFetch("/v1/ir:send-notice", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus({ kind: "ok", msg: `Sent ${res.okCount}/${res.okCount + res.failCount}` });
        // Refresh recent list
        apiFetch(`/v1/ir:notices:list?fundraiseId=${encodeURIComponent(fundraiseId)}`).then(r => {
          if (r?.ok) setRecentNotices(r.notices || []);
        });
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
    <div style={{ ...S.card, marginBottom: 16, borderColor: "#a78bfa" }}>
      <div style={S.frTitle}>Notice composer · {fundraiseId}</div>
      <div style={S.frMeta}>Send a kickoff letter or custom message to entitled investors. Logs to the audit trail; tracks opens + clicks via SendGrid.</div>
      <div style={S.divider} />
      <div style={S.field}>
        <label style={S.label}>Template</label>
        <select style={S.input} value={templateId} onChange={e => setTemplateId(e.target.value)}>
          {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div style={S.field}>
        <label style={S.label}>Subject</label>
        <input style={S.input} value={subject} onChange={e => setSubject(e.target.value)} />
      </div>
      {templateId === "custom" && (
        <div style={S.field}>
          <label style={S.label}>HTML body</label>
          <textarea
            style={{ ...S.input, minHeight: 120, fontFamily: "monospace", fontSize: 12 }}
            value={customBody}
            onChange={e => setCustomBody(e.target.value)}
            placeholder="<p>Hi {firstName}, ...</p>"
          />
          <div style={S.hint}>Plain HTML. Available variables on the server: {`{firstName}`}, {`{name}`}, {`{email}`} (sub by hand for now).</div>
        </div>
      )}
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
      </div>
      <div style={S.row}>
        <button style={sending ? S.btnDis : S.btnPrim} disabled={sending} onClick={send}>
          {sending ? "Sending…" : "Send notice"}
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

function SmsTestPanel() {
  const [phone, setPhone] = useState("+13104300780");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  async function fire() {
    setSending(true); setStatus(null);
    try {
      const res = await apiFetch("/v1/sms:test", {
        method: "POST",
        body: JSON.stringify({ phone, message: "SOCIII — Twilio test. If you got this, the SMS primitive is live. Reply STOP to opt out." }),
      });
      if (res.ok) setStatus({ kind: "ok", msg: `Sent to ${res.to}. Check your phone.` });
      else setStatus({ kind: "err", msg: res.error || "Send failed." });
    } catch (e) {
      setStatus({ kind: "err", msg: e.message || "Network error." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ ...S.card, marginBottom: 32, borderColor: "#a78bfa" }}>
      <div style={S.frTitle}>SMS smoke test</div>
      <div style={S.frMeta}>Sends a one-line test message through Twilio. Validates A2P 10DLC + integration.</div>
      <div style={S.divider} />
      <div style={S.field}>
        <label style={S.label}>To (E.164)</label>
        <input style={S.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+13104300780" />
        <div style={S.hint}>Include country code. Defaults to Sean's number.</div>
      </div>
      <div style={S.row}>
        <button style={sending ? S.btnDis : S.btnPrim} disabled={sending} onClick={fire}>
          {sending ? "Sending…" : "Send test SMS"}
        </button>
        {status && (
          <span style={{ ...S.status, ...(status.kind === "ok" ? S.ok : S.err) }}>{status.msg}</span>
        )}
      </div>
    </div>
  );
}

export default function FundraiseAdmin() {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("/v1/fundraise-admin:list");
      if (data?.ok) setList(data.fundraises || []);
      else setError(data?.error || "Unable to load fundraises.");
    } catch (e) {
      setError(e.message || "Network error.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <a href="/" style={S.brand}>SOCIII</a>
        <div style={S.scope}>Fundraise admin · materials config</div>
      </div>
      <div style={S.body}>
        <div style={S.h1}>Fundraise materials</div>
        <p style={S.lead}>
          Set the URLs that power the investor-side materials cards. URLs save
          immediately and appear to entitled investors on next page load. Leave
          a field blank to render the "Sean will share directly" placeholder.
        </p>
        <SmsTestPanel />
        {error && <div style={S.empty}>{error}</div>}
        {!error && list === null && <div style={S.loading}>Loading…</div>}
        {!error && list !== null && list.length === 0 && (
          <div style={S.empty}>
            No fundraises found for your account. Confirm you're signed in as the
            founder and a member of the fundraise's tenant.
          </div>
        )}
        {!error && list !== null && list.map(fr => (
          <div key={fr.fundraiseId}>
            <FundraiseCard fundraise={fr} />
            <NoticeComposerPanel fundraiseId={fr.fundraiseId} />
          </div>
        ))}
      </div>
    </div>
  );
}
