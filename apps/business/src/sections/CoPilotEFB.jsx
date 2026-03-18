import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "../firebase";
import DriveImportModal from "../components/DriveImportModal";

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
  const [showDriveImport, setShowDriveImport] = useState(false);
  const [activeImportJobId, setActiveImportJobId] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [acknowledged, setAcknowledged] = useState(() => localStorage.getItem("copilot_ack") === "true");
  const [showDocBanner, setShowDocBanner] = useState(true);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [documents, setDocuments] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => { loadData(); loadDocuments(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function loadDocuments() {
    try {
      const result = await apiCall("status");
      if (result.ok && result.documents) setDocuments(result.documents);
      if (result.ok && !result.readiness?.hasOperatorDocs) setShowDocBanner(true);
      else setShowDocBanner(false);
    } catch { /* ignore */ }
  }

  // Poll import job progress
  useEffect(() => {
    if (!activeImportJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/vault:importStatus?jobId=${activeImportJobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          setImportProgress(data);
          if (data.status === "completed" || data.status === "completed_with_errors" || data.status === "failed") {
            setActiveImportJobId(null);
            loadDocuments();
          }
        }
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeImportJobId]);

  const handleImportStarted = useCallback((jobId) => {
    setActiveImportJobId(jobId);
    setShowDriveImport(false);
  }, []);

  async function handleAcknowledge() {
    try {
      await apiCall("acknowledge", "POST", { acknowledged: true });
    } catch { /* proceed anyway */ }
    localStorage.setItem("copilot_ack", "true");
    setAcknowledged(true);
  }

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
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: result.message,
          mode: result.mode || null,
          citation: result.citation || null,
          sourceType: result.sourceType || null,
        }]);
        if (result.mode) setActiveMode(result.mode);
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
    { id: "documents", label: "Documents" },
    { id: "copilot", label: "CoPilot" },
  ];

  // ── High-risk acknowledgment modal (TASK 3) ──
  if (!acknowledged) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AcknowledgmentModal onAccept={handleAcknowledge} />
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Mode info sheet */}
      {showModeInfo && <ModeInfoSheet onClose={() => setShowModeInfo(false)} onForceMode={(m) => { setActiveMode(m); setShowModeInfo(false); }} />}
      {/* Top bar */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: C.tealLight, fontWeight: 700, fontSize: 18 }}>PC12-47E CoPilot</span>
          <span style={{ color: C.textDim, fontSize: 13 }}>LFN Medevac</span>
          {activeMode === "direct" && (
            <button onClick={() => setShowModeInfo(!showModeInfo)} style={{
              background: "#7c3aed22", border: "1px solid #7c3aed", borderRadius: 4, padding: "2px 8px",
              color: "#a78bfa", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              letterSpacing: "0.05em",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
              DIRECT
            </button>
          )}
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
            {tab === "documents" && <DocumentsTab documents={documents} onUpload={handleFileUpload} uploadMsg={uploadMsg} onReload={loadDocuments} onOpenDriveImport={() => setShowDriveImport(true)} importProgress={importProgress} />}
            {tab === "copilot" && (
              <ChatTab
                messages={chatMessages} input={chatInput} onInput={setChatInput}
                onSend={sendChat} loading={chatLoading} examinerMode={examinerMode}
                chatEndRef={chatEndRef} showDocBanner={showDocBanner}
                onDismissBanner={() => setShowDocBanner(false)} onGoToDocuments={() => setTab("documents")}
              />
            )}
          </>
        )}
      </div>

      {showDriveImport && (
        <DriveImportModal
          dark
          workerId="copilot-pc12"
          onClose={() => setShowDriveImport(false)}
          onImportStarted={handleImportStarted}
        />
      )}
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

function ChatTab({ messages, input, onInput, onSend, loading, examinerMode, chatEndRef, showDocBanner, onDismissBanner, onGoToDocuments }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      {/* Document upload reminder banner (TASK 3) */}
      {showDocBanner && (
        <div style={{ background: C.yellow + "18", border: `1px solid ${C.yellow}44`, borderRadius: 6, padding: "10px 14px", marginBottom: 12, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ color: C.yellow, flex: 1 }}>For the most accurate Direct Mode answers, upload your PC12-NG POH and QRH in Settings. I'll use generic reference docs until then.</div>
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <button onClick={onDismissBanner} style={{ background: "none", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer" }}>Got it</button>
            <button onClick={onGoToDocuments} style={{ background: "none", border: "none", color: C.tealLight, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Upload Documents &rarr;</button>
          </div>
        </div>
      )}
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
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            {/* Direct Mode label (TASK 1) */}
            {m.mode === "direct" && m.role === "assistant" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, paddingLeft: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#a78bfa"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase" }}>Direct Mode</span>
              </div>
            )}
            {/* Message bubble */}
            <div style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 13, lineHeight: 1.5,
              background: m.role === "user" ? C.teal : (m.mode === "direct" ? "#1a1033" : C.card),
              border: m.mode === "direct" && m.role === "assistant" ? "1px solid #7c3aed44" : undefined,
              color: C.text, whiteSpace: "pre-wrap",
            }}>{m.content}</div>
            {/* Citation (TASK 5) */}
            {m.mode === "direct" && m.role === "assistant" && (
              <div style={{
                marginTop: 4, paddingLeft: 4, fontSize: 11, fontStyle: "italic", lineHeight: 1.4,
                color: m.sourceType === "generic" ? "#d97706" : C.textDim,
              }}>
                {m.citation
                  ? `Source: ${m.citation}`
                  : m.sourceType === "generic"
                    ? "Source: PC12-NG General Reference (generic) \u00b7 Upload your POH for aircraft-specific answers"
                    : null
                }
              </div>
            )}
          </div>
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

// --- TASK 3: High-Risk Acknowledgment Modal ---

function AcknowledgmentModal({ onAccept }) {
  const [scrolled, setScrolled] = useState(false);
  const contentRef = useRef(null);

  function handleScroll() {
    const el = contentRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true);
  }

  return (
    <div style={{ maxWidth: 520, width: "100%", margin: "0 24px" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "24px 24px 0", fontWeight: 700, fontSize: 18, color: C.text }}>Before you start</div>
        <div ref={contentRef} onScroll={handleScroll} style={{
          padding: "16px 24px", maxHeight: 400, overflowY: "auto", fontSize: 13, lineHeight: 1.7, color: C.textMuted,
        }}>
          <p style={{ marginBottom: 12 }}>This CoPilot is a <strong style={{ color: C.text }}>ground-use reference tool only</strong>. It is not certified for in-flight use and must never be used as a primary source during flight operations.</p>
          <p style={{ marginBottom: 12 }}>Always cross-check CoPilot responses against your approved paper or electronic documents — POH, QRH, GOM, MEL, and OpSpecs. The AI can make mistakes, misinterpret questions, or return outdated information.</p>
          <p style={{ marginBottom: 12 }}>Direct Mode responses are sourced from documents you upload. If you upload the wrong document, the wrong revision, or a document for a different serial number, the answers will be wrong. <strong style={{ color: C.text }}>You are responsible for verifying your uploads.</strong></p>
          <p style={{ marginBottom: 12 }}>No AI output from this tool should ever override pilot judgment, company SOPs, or regulatory requirements. <strong style={{ color: C.text }}>Your judgment is the final authority.</strong></p>
          <p>By continuing, you acknowledge that you understand these limitations and accept full responsibility for how you use the information provided.</p>
        </div>
        <div style={{ padding: "16px 24px" }}>
          <button onClick={onAccept} disabled={!scrolled} style={{
            width: "100%", background: scrolled ? C.teal : C.border, border: "none", borderRadius: 6,
            color: scrolled ? "#fff" : C.textDim, padding: "12px", fontSize: 14, fontWeight: 600,
            cursor: scrolled ? "pointer" : "not-allowed", transition: "all 0.2s",
          }}>I understand — let's go</button>
        </div>
      </div>
    </div>
  );
}

// --- TASK 2: Mode Info Sheet ---

function ModeInfoSheet({ onClose, onForceMode }) {
  const modes = [
    { id: "direct", label: "Direct", desc: "Returns verbatim text from your uploaded documents with source citations. Used for limitations, checklists, and emergency procedures." },
    { id: "operational", label: "Operational", desc: "Applies FARs, OpSpecs, and regulatory requirements to your specific question. Cited but not verbatim." },
    { id: "training", label: "Training", desc: "Socratic study mode for checkride prep, scenario-based learning, and knowledge gap identification." },
    { id: "advisory", label: "Advisory", desc: "General guidance and reasoning. The default mode for questions that don't require source documents." },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, maxWidth: 400, width: "100%", margin: "0 24px", padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: C.text }}>CoPilot Modes</div>
        {modes.map(m => (
          <div key={m.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: m.id === "direct" ? "#a78bfa" : C.text }}>{m.label}</span>
              <button onClick={() => onForceMode(m.id)} style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textDim,
                padding: "2px 8px", fontSize: 11, cursor: "pointer",
              }}>Force</button>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>{m.desc}</div>
          </div>
        ))}
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "8px", fontSize: 13, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// --- TASK 4: Document Upload Tab ---

const DOC_TYPES = [
  { id: "poh", label: "POH (Pilot Operating Handbook)", ext: ".pdf" },
  { id: "qrh", label: "QRH (Quick Reference Handbook)", ext: ".pdf" },
  { id: "gom", label: "GOM (General Operations Manual)", ext: ".pdf" },
  { id: "mel", label: "MEL (Minimum Equipment List)", ext: ".pdf" },
  { id: "opspecs", label: "OpSpecs (Operations Specifications)", ext: ".pdf" },
  { id: "wb", label: "W&B (Weight & Balance)", ext: ".pdf" },
];

function DocumentsTab({ documents, onUpload, uploadMsg, onReload, onOpenDriveImport, importProgress }) {
  const [uploading, setUploading] = useState(null);
  const [uploadForm, setUploadForm] = useState({ docType: "", revision: "", effectiveDate: "", confirmed: false });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  function getDocStatus(docTypeId) {
    return (documents || []).find(d => d.docType === docTypeId);
  }

  async function handleSubmitUpload() {
    if (!selectedFile || !uploadForm.confirmed) return;
    setUploading(uploadForm.docType);
    try {
      const base64 = await fileToBase64(selectedFile);
      await apiCall("uploadDoc", "POST", {
        fileData: base64, fileName: selectedFile.name, mimeType: selectedFile.type,
        docType: uploadForm.docType, revisionNumber: uploadForm.revision, effectiveDate: uploadForm.effectiveDate,
      });
      setUploading(null);
      setSelectedFile(null);
      setUploadForm({ docType: "", revision: "", effectiveDate: "", confirmed: false });
      onReload();
    } catch (e) {
      setUploading(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Operator Documents">
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
          Upload your aircraft-specific documents for accurate Direct Mode responses. Generic references are used until you upload.
        </div>
        {DOC_TYPES.map(dt => {
          const existing = getDocStatus(dt.id);
          return (
            <div key={dt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: existing ? C.green : "#d97706", fontSize: 14 }}>{existing ? "\u2713" : "\u2014"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{dt.label}</div>
                  {existing && (
                    <div style={{ fontSize: 11, color: C.textDim }}>
                      {existing.fileName} &middot; Rev {existing.revisionNumber || "?"} &middot; {existing.effectiveDate || "No date"} &middot; Uploaded {existing.uploadDate || ""}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => {
                setUploadForm({ docType: dt.id, revision: "", effectiveDate: "", confirmed: false });
                setSelectedFile(null);
                fileRef.current?.click();
              }} style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 4, color: existing ? C.textDim : C.tealLight,
                padding: "4px 10px", fontSize: 11, cursor: "pointer",
              }}>{existing ? "Replace" : "Upload"}</button>
            </div>
          );
        })}
        <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={e => {
          if (e.target.files[0]) setSelectedFile(e.target.files[0]);
          e.target.value = "";
        }} />
      </Card>
      {selectedFile && uploadForm.docType && (
        <Card title={`Upload: ${DOC_TYPES.find(d => d.id === uploadForm.docType)?.label || uploadForm.docType}`}>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>File: {selectedFile.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <EFBInput label="Revision Number" value={uploadForm.revision} onChange={v => setUploadForm(f => ({ ...f, revision: v }))} />
            <EFBInput label="Effective Date" type="date" value={uploadForm.effectiveDate} onChange={v => setUploadForm(f => ({ ...f, effectiveDate: v }))} />
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 12 }}>
            <input type="checkbox" checked={uploadForm.confirmed} onChange={e => setUploadForm(f => ({ ...f, confirmed: e.target.checked }))}
              style={{ marginTop: 3 }} />
            <span style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
              I confirm this is the correct document for my specific aircraft, current approved revision, and I accept responsibility for incorrect uploads.
            </span>
          </label>
          <EFBButton label={uploading ? "Uploading..." : "Upload Document"} onClick={handleSubmitUpload} color={uploadForm.confirmed ? C.teal : C.border} />
        </Card>
      )}
      <Card title="Import from Cloud Storage">
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
          Import documents directly from your cloud storage. Files are processed server-side — no size limits.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onOpenDriveImport} style={{
            background: C.teal, border: "none", borderRadius: 6, color: "#fff",
            padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 87.3 78" fill="none"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/><path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 52.35c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l6.1 10.6 7.6 13.2z" fill="#EA4335"/><path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.85 0H34.45c-1.65 0-3.2.45-4.55 1.2L43.65 25z" fill="#00832D"/><path d="M59.85 53H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.55 1.2h50.3c1.65 0 3.2-.45 4.55-1.2L59.85 53z" fill="#2684FC"/><path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.2 28h27.45c0-1.55-.4-3.1-1.2-4.5l-12.7-22z" fill="#FFBA00"/></svg>
            Google Drive
          </button>
          <button disabled style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim,
            padding: "8px 16px", fontSize: 13, cursor: "not-allowed", opacity: 0.5,
          }}>Dropbox &middot; Coming soon</button>
          <button disabled style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim,
            padding: "8px 16px", fontSize: 13, cursor: "not-allowed", opacity: 0.5,
          }}>OneDrive &middot; Coming soon</button>
        </div>
      </Card>

      {importProgress && (importProgress.status === "processing" || importProgress.status === "completed" || importProgress.status === "completed_with_errors" || importProgress.status === "failed") && (
        <Card title="Import Progress">
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
            {importProgress.status === "processing" && `Processing ${importProgress.completedFiles || 0} of ${importProgress.totalFiles} files...`}
            {importProgress.status === "completed" && `All ${importProgress.totalFiles} files imported successfully.`}
            {importProgress.status === "completed_with_errors" && `Imported ${importProgress.completedFiles} of ${importProgress.totalFiles} files. ${importProgress.failedFiles} failed.`}
            {importProgress.status === "failed" && "Import failed."}
          </div>
          {(importProgress.fileStatuses || []).map((fs, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: fs.status === "completed" ? C.green : fs.status === "failed" ? C.red : C.yellow, width: 18, textAlign: "center" }}>
                {fs.status === "completed" ? "\u2713" : fs.status === "failed" ? "\u2717" : "\u25CF"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.text }}>{fs.fileName}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>{fs.status}{fs.error ? ` — ${fs.error}` : ""}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {uploadMsg && <div style={{ color: C.tealLight, fontSize: 13 }}>{uploadMsg}</div>}
    </div>
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
