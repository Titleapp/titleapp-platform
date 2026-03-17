import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";

const API_BASE = "https://api-feyfibglbq-uc.a.run.app/v1";

async function apiCall(route, method = "GET", body = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const opts = {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}/copilot:pc12:${route}`, opts);
  return res.json();
}

// Dark EFB color palette
const C = {
  bg: "#0A0F1A",
  panel: "#111827",
  card: "#1F2937",
  border: "#374151",
  teal: "#0B7A6E",
  tealLight: "#14B8A6",
  green: "#22C55E",
  yellow: "#EAB308",
  red: "#EF4444",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  textDim: "#6B7280",
};

function statusColor(status) {
  if (status === "GO" || status === "OK") return C.green;
  if (status === "EXPIRING" || status === "CAUTION") return C.yellow;
  return C.red;
}

export default function CoPilotEFB() {
  const [tab, setTab] = useState("status");
  const [status, setStatus] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [examinerMode, setExaminerMode] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function loadData() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        apiCall("status"),
        apiCall("currency"),
      ]);
      if (s.ok) setStatus(s);
      if (c.ok) setCurrency(c);
    } catch (e) {
      console.error("CoPilot load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(route, file) {
    setUploadMsg("Uploading...");
    try {
      const base64 = await fileToBase64(file);
      const body = { fileData: base64, fileName: file.name, mimeType: file.type };
      if (route === "uploadDoc") body.docType = detectDocType(file.name);
      const result = await apiCall(route, "POST", body);
      setUploadMsg(result.ok ? `Imported successfully` : result.error);
      loadData();
    } catch (e) {
      setUploadMsg("Upload failed: " + e.message);
    }
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const result = await apiCall("chat", "POST", {
        message: msg,
        conversationHistory: chatMessages,
        examinerMode,
      });
      if (result.ok) {
        setChatMessages(prev => [...prev, { role: "assistant", content: result.message }]);
        if (result.examinerMode) setExaminerMode(true);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Error: " + e.message }]);
    } finally {
      setChatLoading(false);
    }
  }

  const tabs = [
    { id: "status", label: "Status" },
    { id: "logbook", label: "Logbook" },
    { id: "currency", label: "Currency" },
    { id: "duty", label: "Duty" },
    { id: "training", label: "Training" },
    { id: "copilot", label: "CoPilot" },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: C.tealLight, fontWeight: 700, fontSize: 18 }}>PC12-47E CoPilot</span>
          <span style={{ color: C.textDim, fontSize: 13 }}>LFN Medevac</span>
        </div>
        {currency?.summary && (
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <span style={{ color: C.green }}>{currency.summary.go} GO</span>
            {currency.summary.expiring > 0 && <span style={{ color: C.yellow }}>{currency.summary.expiring} EXPIRING</span>}
            {currency.summary.noGo > 0 && <span style={{ color: C.red }}>{currency.summary.noGo} NO-GO</span>}
            <span style={{ color: statusColor(currency.summary.overall), fontWeight: 700 }}>
              {currency.summary.overall}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 0, paddingLeft: 24 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", color: tab === t.id ? C.tealLight : C.textDim,
              padding: "10px 20px", fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? `2px solid ${C.tealLight}` : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        {loading ? (
          <div style={{ color: C.textMuted, padding: 40, textAlign: "center" }}>Loading...</div>
        ) : (
          <>
            {tab === "status" && <StatusTab status={status} currency={currency} />}
            {tab === "logbook" && <LogbookTab onUpload={handleFileUpload} uploadMsg={uploadMsg} />}
            {tab === "currency" && <CurrencyTab currency={currency} />}
            {tab === "duty" && <DutyTab />}
            {tab === "training" && <TrainingTab />}
            {tab === "copilot" && (
              <ChatTab
                messages={chatMessages} input={chatInput} onInput={setChatInput}
                onSend={sendChat} loading={chatLoading} examinerMode={examinerMode}
                chatEndRef={chatEndRef}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Tab Components ---

function StatusTab({ status, currency }) {
  if (!status) return <div style={{ color: C.textMuted }}>No status data</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card title="Profile">
        <Row label="Aircraft" value={status.profile?.aircraftType || "PC-12/47E"} />
        <Row label="Operator" value={status.profile?.operator || "LFN"} />
        <Row label="Medical" value={`Class ${status.profile?.medicalClass || "?"}`} />
        <Row label="Medical Expiry" value={status.profile?.medicalExpiry || "Not set"} />
      </Card>
      <Card title="Counts">
        <Row label="Logbook Entries" value={status.counts?.logbookEntries || 0} />
        <Row label="Ground Training" value={status.counts?.groundTraining || 0} />
        <Row label="Endorsements" value={status.counts?.endorsements || 0} />
        <Row label="Vault Docs" value={status.counts?.vaultDocs || 0} />
      </Card>
      <Card title="Readiness" span={2}>
        <CheckItem label="Profile complete" ok={status.readiness?.profileComplete} />
        <CheckItem label="Logbook entries" ok={status.readiness?.hasLogbookEntries} />
        <CheckItem label="Ground training" ok={status.readiness?.hasGroundTraining} />
        <CheckItem label="Operator docs uploaded" ok={status.readiness?.hasOperatorDocs} />
      </Card>
      {currency && (
        <Card title="Currency Summary" span={2}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {currency.currency?.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <span style={{ color: statusColor(c.status), fontWeight: 700, fontSize: 12, minWidth: 60 }}>[{c.status}]</span>
                <span style={{ color: C.text, fontSize: 13 }}>{c.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function LogbookTab({ onUpload, uploadMsg }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <UploadCard title="ForeFlight CSV" accept=".csv" onUpload={f => onUpload("uploadLogbook", f)} />
      <UploadCard title="FVO Report" accept=".csv,.pdf" onUpload={f => onUpload("uploadFVO", f)} />
      <UploadCard title="Operator Doc" accept=".pdf,.txt" onUpload={f => onUpload("uploadDoc", f)} />
      {uploadMsg && (
        <div style={{ gridColumn: "1 / -1", color: C.tealLight, fontSize: 13, padding: "8px 0" }}>
          {uploadMsg}
        </div>
      )}
      <Card title="Manual Entry" span={3}>
        <ManualEntryForm />
      </Card>
    </div>
  );
}

function CurrencyTab({ currency }) {
  if (!currency) return <div style={{ color: C.textMuted }}>No currency data</div>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {currency.currency?.map(c => (
        <div key={c.id} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16,
          borderLeft: `4px solid ${statusColor(c.status)}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div>
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{c.detail}</div>
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>{c.requirement}</div>
            </div>
            <div style={{ color: statusColor(c.status), fontWeight: 700, fontSize: 16 }}>{c.status}</div>
          </div>
          {c.daysRemaining !== undefined && c.daysRemaining !== null && (
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 6 }}>
              {c.daysRemaining >= 0 ? `${c.daysRemaining} days remaining` : `Expired ${Math.abs(c.daysRemaining)} days ago`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DutyTab() {
  const [dutyStatus, setDutyStatus] = useState(null);
  const [actionMsg, setActionMsg] = useState("");

  async function recordEvent(eventType) {
    setActionMsg("Recording...");
    try {
      const result = await apiCall("dutyEvent", "POST", { eventType, timestamp: new Date().toISOString() });
      setActionMsg(result.ok ? `${eventType} recorded` : result.error);
    } catch (e) {
      setActionMsg("Error: " + e.message);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Duty Actions">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <EFBButton label="Duty On" onClick={() => recordEvent("duty_on")} color={C.green} />
          <EFBButton label="Block Out" onClick={() => recordEvent("block_out")} color={C.tealLight} />
          <EFBButton label="Block In" onClick={() => recordEvent("block_in")} color={C.tealLight} />
          <EFBButton label="Duty Off" onClick={() => recordEvent("duty_off")} color={C.red} />
        </div>
        {actionMsg && <div style={{ color: C.tealLight, fontSize: 13, marginTop: 8 }}>{actionMsg}</div>}
      </Card>
      <Card title="FAR 135 Limits">
        <div style={{ color: C.textMuted, fontSize: 13 }}>
          Load currency tab for computed limits, or use CoPilot chat to ask about your current duty status.
        </div>
      </Card>
    </div>
  );
}

function TrainingTab() {
  const [form, setForm] = useState({ date: "", type: "", subject: "", hours: "", instructorName: "" });
  const [msg, setMsg] = useState("");

  async function addTraining() {
    if (!form.date || !form.type) { setMsg("Date and type required"); return; }
    try {
      const result = await apiCall("addGroundTraining", "POST", { ...form, hours: Number(form.hours) || 0 });
      setMsg(result.ok ? "Training record added" : result.error);
      if (result.ok) setForm({ date: "", type: "", subject: "", hours: "", instructorName: "" });
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Add Ground Training">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <EFBInput label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
          <EFBSelect label="Type" value={form.type} onChange={v => setForm({ ...form, type: v })}
            options={["BFR", "flight_review", "135.293", "135.297", "instrument_proficiency", "recurrent", "initial", "differences", "other"]} />
          <EFBInput label="Subject" value={form.subject} onChange={v => setForm({ ...form, subject: v })} />
          <EFBInput label="Hours" type="number" value={form.hours} onChange={v => setForm({ ...form, hours: v })} />
          <EFBInput label="Instructor" value={form.instructorName} onChange={v => setForm({ ...form, instructorName: v })} span={2} />
        </div>
        <div style={{ marginTop: 12 }}>
          <EFBButton label="Add Training Record" onClick={addTraining} color={C.tealLight} />
        </div>
        {msg && <div style={{ color: C.tealLight, fontSize: 13, marginTop: 8 }}>{msg}</div>}
      </Card>
      <Card title="Add Endorsement">
        <EndorsementForm />
      </Card>
    </div>
  );
}

function ChatTab({ messages, input, onInput, onSend, loading, examinerMode, chatEndRef }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      {examinerMode && (
        <div style={{ background: C.yellow + "22", border: `1px solid ${C.yellow}`, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: C.yellow }}>
          Examiner Mode Active — DPE oral simulation in progress
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
        {messages.length === 0 && (
          <div style={{ color: C.textDim, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 15, marginBottom: 8 }}>PC12-47E CoPilot</div>
            <div style={{ fontSize: 13 }}>Ask about aircraft systems, check currency, review duty limits, or start a checkride oral prep.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {["Check my currency", "Am I legal to fly tonight?", "Start 135.293 prep", "What are the PC12 Vne limits?"].map(q => (
                <button key={q} onClick={() => { onInput(q); }}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "80%", padding: "10px 14px", borderRadius: 8, fontSize: 13, lineHeight: 1.5,
            background: m.role === "user" ? C.teal : C.card,
            color: C.text, whiteSpace: "pre-wrap",
          }}>{m.content}</div>
        ))}
        {loading && <div style={{ color: C.textDim, fontSize: 13, padding: 8 }}>Thinking...</div>}
        <div ref={chatEndRef} />
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <input
          value={input}
          onChange={e => onInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Ask CoPilot..."
          style={{
            flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.text, padding: "10px 14px", fontSize: 13, outline: "none",
          }}
        />
        <button onClick={onSend} disabled={loading}
          style={{
            background: C.teal, border: "none", borderRadius: 6, color: C.text,
            padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            opacity: loading ? 0.5 : 1,
          }}>Send</button>
      </div>
    </div>
  );
}

// --- Reusable EFB Components ---

function Card({ title, children, span }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16,
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      {title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: C.text }}>{title}</div>}
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
      <span style={{ color: C.textMuted }}>{label}</span>
      <span style={{ color: C.text }}>{value}</span>
    </div>
  );
}

function CheckItem({ label, ok }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
      <span style={{ color: ok ? C.green : C.red, fontSize: 16 }}>{ok ? "\u2713" : "\u2717"}</span>
      <span style={{ color: C.text }}>{label}</span>
    </div>
  );
}

function EFBButton({ label, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: color || C.teal, border: "none", borderRadius: 6, color: "#fff",
      padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    }}>{label}</button>
  );
}

function EFBInput({ label, value, onChange, type = "text", span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
          color: C.text, padding: "6px 10px", fontSize: 13, outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function EFBSelect({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
          color: C.text, padding: "6px 10px", fontSize: 13, outline: "none",
        }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function UploadCard({ title, accept, onUpload }) {
  const ref = useRef(null);
  return (
    <Card title={title}>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0]); }} />
      <button onClick={() => ref.current?.click()} style={{
        width: "100%", background: C.panel, border: `1px dashed ${C.border}`, borderRadius: 6,
        color: C.textMuted, padding: "24px 16px", fontSize: 13, cursor: "pointer", textAlign: "center",
      }}>
        Click to upload {accept}
      </button>
    </Card>
  );
}

function ManualEntryForm() {
  const [form, setForm] = useState({ date: "", departure: "", destination: "", totalTime: "", picTime: "", sicTime: "" });
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!form.date || !form.totalTime) { setMsg("Date and total time required"); return; }
    try {
      const result = await apiCall("addLogEntry", "POST", {
        ...form,
        totalTime: Number(form.totalTime) || 0,
        picTime: Number(form.picTime) || 0,
        sicTime: Number(form.sicTime) || 0,
      });
      setMsg(result.ok ? "Entry added" : result.error);
      if (result.ok) setForm({ date: "", departure: "", destination: "", totalTime: "", picTime: "", sicTime: "" });
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <EFBInput label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
        <EFBInput label="From (ICAO)" value={form.departure} onChange={v => setForm({ ...form, departure: v })} />
        <EFBInput label="To (ICAO)" value={form.destination} onChange={v => setForm({ ...form, destination: v })} />
        <EFBInput label="Total Time" type="number" value={form.totalTime} onChange={v => setForm({ ...form, totalTime: v })} />
        <EFBInput label="PIC Time" type="number" value={form.picTime} onChange={v => setForm({ ...form, picTime: v })} />
        <EFBInput label="SIC Time" type="number" value={form.sicTime} onChange={v => setForm({ ...form, sicTime: v })} />
      </div>
      <div style={{ marginTop: 12 }}>
        <EFBButton label="Add Entry" onClick={submit} color={C.tealLight} />
      </div>
      {msg && <div style={{ color: C.tealLight, fontSize: 13, marginTop: 8 }}>{msg}</div>}
    </>
  );
}

function EndorsementForm() {
  const [form, setForm] = useState({ date: "", type: "", endorsementText: "", instructorName: "" });
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!form.date || !form.type) { setMsg("Date and type required"); return; }
    try {
      const result = await apiCall("addEndorsement", "POST", form);
      setMsg(result.ok ? "Endorsement added" : result.error);
      if (result.ok) setForm({ date: "", type: "", endorsementText: "", instructorName: "" });
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <EFBInput label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
        <EFBInput label="Type" value={form.type} onChange={v => setForm({ ...form, type: v })} />
        <EFBInput label="Instructor" value={form.instructorName} onChange={v => setForm({ ...form, instructorName: v })} />
        <EFBInput label="Endorsement Text" value={form.endorsementText} onChange={v => setForm({ ...form, endorsementText: v })} />
      </div>
      <div style={{ marginTop: 12 }}>
        <EFBButton label="Add Endorsement" onClick={submit} color={C.tealLight} />
      </div>
      {msg && <div style={{ color: C.tealLight, fontSize: 13, marginTop: 8 }}>{msg}</div>}
    </>
  );
}

// --- Helpers ---

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function detectDocType(fileName) {
  const lower = (fileName || "").toLowerCase();
  if (lower.includes("gom")) return "gom";
  if (lower.includes("sop")) return "sop";
  if (lower.includes("mmel")) return "mmel";
  if (lower.includes("oph") || lower.includes("opspec")) return "oph";
  if (lower.includes("afm") || lower.includes("poh")) return "afm";
  return "other";
}
