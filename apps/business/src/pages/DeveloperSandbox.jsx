import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// ── Styles ────────────────────────────────────────────────────
const S = {
  root: { display: "flex", height: "100vh", overflow: "hidden", background: "#0f0f14", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#e2e8f0" },
  // Left panel — chat
  chatPanel: { width: "35%", minWidth: 320, maxWidth: 520, display: "flex", flexDirection: "column", borderRight: "1px solid #1e1e2e", background: "#16161e" },
  chatHeader: { padding: "16px 20px", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", gap: 10 },
  chatLogo: { fontSize: 14, fontWeight: 700, color: "#7c3aed" },
  chatName: { fontSize: 13, fontWeight: 600, color: "#94a3b8" },
  chatMessages: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 },
  chatInputWrap: { padding: "12px 16px", borderTop: "1px solid #1e1e2e" },
  chatInput: { width: "100%", padding: "12px 16px", background: "#1e1e2e", border: "1px solid #2a2a3a", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", resize: "none" },
  msgUser: { alignSelf: "flex-end", background: "#7c3aed", color: "white", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", maxWidth: "85%", fontSize: 14, lineHeight: 1.5 },
  msgAssistant: { alignSelf: "flex-start", background: "#1e1e2e", color: "#e2e8f0", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", maxWidth: "85%", fontSize: 14, lineHeight: 1.5 },
  typing: { alignSelf: "flex-start", color: "#64748b", fontSize: 13, padding: "8px 0" },
  // Right panel — workspace
  workPanel: { flex: 1, display: "flex", flexDirection: "column", background: "#0f0f14" },
  tabBar: { display: "flex", gap: 0, borderBottom: "1px solid #1e1e2e", padding: "0 16px", background: "#16161e", overflowX: "auto" },
  tab: (active) => ({ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: active ? "#7c3aed" : "#64748b", borderBottom: active ? "2px solid #7c3aed" : "2px solid transparent", cursor: "pointer", background: "none", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: active ? "#7c3aed" : "transparent", transition: "all 0.2s", whiteSpace: "nowrap" }),
  tabContent: { flex: 1, overflowY: "auto", padding: 24 },
  statusBar: { padding: "8px 20px", borderTop: "1px solid #1e1e2e", background: "#16161e", display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#64748b" },
  statusDot: (color) => ({ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }),
  // Cards
  workerCard: { background: "#1e1e2e", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.2s", border: "1px solid #2a2a3a" },
  workerCardHeader: { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", padding: "20px 16px", textAlign: "center" },
  badge: (color, bg) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, color, background: bg }),
  // Onboarding overlay
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  overlayCard: { background: "#1e1e2e", borderRadius: 16, padding: "48px 40px", maxWidth: 480, textAlign: "center", border: "1px solid #2a2a3a" },
  overlayTitle: { fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 },
  overlaySub: { fontSize: 15, color: "#94a3b8", lineHeight: 1.6, marginBottom: 8 },
  overlayBtn: { marginTop: 24, padding: "12px 32px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  // Empty state
  empty: { textAlign: "center", padding: "60px 20px", color: "#64748b" },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "#94a3b8", marginBottom: 8 },
  emptyDesc: { fontSize: 14, lineHeight: 1.6 },
  // Buttons
  btnPrimary: { padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 20px", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  // Grow tab
  growCard: { background: "#16161e", borderRadius: 10, padding: 20, border: "1px solid #2a2a3a", marginBottom: 16 },
  growLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" },
  copyBtn: { padding: "6px 14px", background: "#2a2a3a", color: "#94a3b8", border: "1px solid #3a3a4a", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  checklist: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#1e1e2e", borderRadius: 8, marginBottom: 6, border: "1px solid #2a2a3a" },
  checkDone: { width: 18, height: 18, borderRadius: 4, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  checkPending: { width: 18, height: 18, borderRadius: 4, border: "2px solid #3a3a4a", flexShrink: 0 },
};

const TABS = ["My Digital Workers", "Builder", "Rules", "Test Console", "Marketplace", "Grow"];
const STEPS = ["Define", "Rules", "Build", "Test", "Publish", "Grow"];

// ── Main Component ────────────────────────────────────────────
export default function DeveloperSandbox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("sandboxOnboardingComplete"));
  const [testInput, setTestInput] = useState("");
  const [testResults, setTestResults] = useState(null);
  const [testRunning, setTestRunning] = useState(false);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Initialize session ID
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem("ta_platform_sid");
    if (existing) return existing;
    const id = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 8);
    sessionStorage.setItem("ta_sandbox_sid", id);
    return id;
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Load workers on mount
  useEffect(() => {
    loadWorkers();
  }, []);

  // Initial greeting
  useEffect(() => {
    if (!showOnboarding) {
      const userName = localStorage.getItem("DISPLAY_NAME") || "";
      const first = userName ? userName.split(" ")[0] : "";
      if (first) {
        addAssistantMessage("Welcome back, " + first + ". Your Digital Workers are on the right. What do you want to work on?");
      } else {
        addAssistantMessage("This is your sandbox. Describe what you want to build, and I'll help you create it. What kind of AI service are you thinking about?");
      }
    }
  }, [showOnboarding]);

  async function loadWorkers() {
    setLoadingWorkers(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID");
      if (!token || !tenantId) { setLoadingWorkers(false); return; }
      const res = await fetch(`${API_BASE}/api?path=/v1/workers:list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": tenantId,
          "X-Vertical": "developer",
          "X-Jurisdiction": "GLOBAL",
        },
      });
      const data = await res.json();
      if (data.ok && data.workers) {
        setWorkers(data.workers);
        if (data.workers.length > 0 && !selectedWorker) {
          setSelectedWorker(data.workers[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load workers:", e);
    } finally {
      setLoadingWorkers(false);
    }
  }

  function addAssistantMessage(text) {
    setMessages((prev) => [...prev, { role: "assistant", text }]);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, surface: "sandbox", userInput: text }),
      });
      const result = await resp.json();
      const reply = result.message || result.reply;
      if (result.ok && reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: reply, cards: result.cards }]);
        // If a Digital Worker was created, refresh the list
        if (result.buildAnimation || result.cards?.some((c) => c.type === "workerCard")) {
          setTimeout(() => loadWorkers(), 500);
        }
      } else {
        addAssistantMessage(reply || "Something went wrong. Try again.");
      }
    } catch (e) {
      console.error("Chat error:", e);
      addAssistantMessage("Connection error. Please try again.");
    } finally {
      setSending(false);
      chatInputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function runTest() {
    if (!selectedWorker || testRunning) return;
    setTestRunning(true);
    setTestResults(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID");
      let parsedData = {};
      try { parsedData = JSON.parse(testInput || "{}"); } catch { parsedData = { raw: testInput }; }
      const resp = await fetch(`${API_BASE}/api?path=/v1/workers:test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": tenantId,
          "X-Vertical": "developer",
          "X-Jurisdiction": "GLOBAL",
        },
        body: JSON.stringify({ tenantId, workerId: selectedWorker.id, testData: parsedData }),
      });
      const data = await resp.json();
      setTestResults(data);
    } catch (e) {
      setTestResults({ ok: false, error: e.message });
    } finally {
      setTestRunning(false);
    }
  }

  function handleOnboardingDismiss() {
    localStorage.setItem("sandboxOnboardingComplete", "true");
    setShowOnboarding(false);
    const userName = localStorage.getItem("DISPLAY_NAME") || "";
    const first = userName ? userName.split(" ")[0] : "";
    if (first) {
      addAssistantMessage("Welcome back, " + first + ". What do you want to build?");
    } else {
      addAssistantMessage("This is your sandbox. Describe what you want to build, and I'll help you create it. What kind of AI service are you thinking about?");
    }
  }

  function selectWorkerAndTab(worker, tab) {
    setSelectedWorker(worker);
    if (typeof tab === "number") setActiveTab(tab);
  }

  // Compute build step for status bar
  function getBuildStep(w) {
    if (!w) return 0;
    if (w.published) return 6;
    if (w.status === "registered" || w.status === "tested") return 5;
    if (w.rulesCount > 0) return 3;
    return 1;
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={S.root}>
      {/* Onboarding overlay */}
      {showOnboarding && (
        <div style={S.overlay}>
          <div style={S.overlayCard}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#7c3aed", marginBottom: 24 }}>TitleApp</div>
            <div style={S.overlayTitle}>Welcome to Your Developer Sandbox</div>
            <div style={S.overlaySub}>Talk on the left. Watch it build on the right.</div>
            <div style={S.overlaySub}>Describe what you want — Alex builds it live.</div>
            <button style={S.overlayBtn} onClick={handleOnboardingDismiss}>Let's Go</button>
          </div>
        </div>
      )}

      {/* Left: Chat Panel */}
      <div style={S.chatPanel}>
        <div style={S.chatHeader}>
          <span style={S.chatLogo}>TitleApp</span>
          <span style={S.chatName}>Alex — Developer AI</span>
        </div>
        <div style={S.chatMessages}>
          {messages.map((msg, i) => (
            <div key={i}>
              <div style={msg.role === "user" ? S.msgUser : S.msgAssistant}>
                {msg.text}
              </div>
              {msg.cards && msg.cards.map((card, ci) => (
                card.type === "workerCard" && (
                  <div key={ci} style={{ margin: "8px 0" }}>
                    <WorkerMiniCard data={card.data} onClick={() => {
                      const found = workers.find((w) => w.id === card.data.workerId);
                      if (found) selectWorkerAndTab(found, 0);
                      else loadWorkers();
                    }} />
                  </div>
                )
              ))}
            </div>
          ))}
          {sending && <div style={S.typing}>Alex is typing...</div>}
          <div ref={messagesEndRef} />
        </div>
        <div style={S.chatInputWrap}>
          <textarea
            ref={chatInputRef}
            style={S.chatInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            rows={1}
          />
        </div>
      </div>

      {/* Right: Workspace */}
      <div style={S.workPanel}>
        <div style={S.tabBar}>
          {TABS.map((tab, i) => (
            <button key={tab} style={S.tab(i === activeTab)} onClick={() => setActiveTab(i)}>
              {tab}
            </button>
          ))}
        </div>
        <div style={S.tabContent}>
          {activeTab === 0 && <MyWorkersTab workers={workers} loading={loadingWorkers} selected={selectedWorker} onSelect={(w) => setSelectedWorker(w)} onCreateNew={() => { chatInputRef.current?.focus(); }} />}
          {activeTab === 1 && <BuilderTab worker={selectedWorker} />}
          {activeTab === 2 && <RulesTab worker={selectedWorker} onAddRule={() => { setInput("I want to add a rule: "); chatInputRef.current?.focus(); }} />}
          {activeTab === 3 && <TestConsoleTab worker={selectedWorker} testInput={testInput} setTestInput={setTestInput} testResults={testResults} testRunning={testRunning} onRunTest={runTest} />}
          {activeTab === 4 && <MarketplaceTab worker={selectedWorker} />}
          {activeTab === 5 && <GrowTab worker={selectedWorker} onAskAlex={(msg) => { setInput(msg); chatInputRef.current?.focus(); }} />}
        </div>
        {/* Status Bar with 6-step progress */}
        <div style={S.statusBar}>
          {selectedWorker ? (
            <>
              <span style={S.statusDot(selectedWorker.status === "registered" ? "#10b981" : "#f59e0b")} />
              <span style={{ fontWeight: 600, color: "#94a3b8" }}>{selectedWorker.name}</span>
              <span>{selectedWorker.rulesCount || 0} rules</span>
              <span>Step {getBuildStep(selectedWorker)} of 6: {STEPS[Math.max(0, getBuildStep(selectedWorker) - 1)] || "Define"}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                {STEPS.map((s, i) => (
                  <span key={s} style={{ width: 24, height: 4, borderRadius: 2, background: i < getBuildStep(selectedWorker) ? "#7c3aed" : "#2a2a3a" }} />
                ))}
              </span>
            </>
          ) : (
            <span>No Digital Worker selected</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-Components ────────────────────────────────────────────

function WorkerMiniCard({ data, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: "#2a2a3a", borderRadius: 8, padding: "10px 12px", cursor: "pointer", transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#3a3a4a"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#2a2a3a"; }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{data.name || "Digital Worker"}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{data.rulesCount || 0} rules — {data.status || "draft"}</div>
    </div>
  );
}

function MyWorkersTab({ workers, loading, selected, onSelect, onCreateNew }) {
  if (loading) {
    return <div style={S.empty}><div style={S.emptyTitle}>Loading Digital Workers...</div></div>;
  }
  if (workers.length === 0) {
    return (
      <div style={S.empty}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>+</div>
        <div style={S.emptyTitle}>No Digital Workers yet</div>
        <div style={S.emptyDesc}>Describe what you want to build in the chat on the left.<br />Alex will help you create your first Digital Worker.</div>
        <button style={{ ...S.btnPrimary, marginTop: 20 }} onClick={onCreateNew}>Start building</button>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {workers.map((w) => (
        <div
          key={w.id}
          style={{ ...S.workerCard, borderColor: selected?.id === w.id ? "#7c3aed" : "#2a2a3a" }}
          onClick={() => onSelect(w)}
        >
          <div style={S.workerCardHeader}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{w.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{w.category || "custom"}</div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>{w.description || "No description"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={S.badge(w.status === "registered" ? "#065f46" : "#92400e", w.status === "registered" ? "#d1fae5" : "#fef3c7")}>
                {w.status === "registered" ? "Live" : w.status || "Draft"}
              </span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{w.rulesCount || 0} rules</span>
            </div>
          </div>
        </div>
      ))}
      <div
        style={{ ...S.workerCard, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180, cursor: "pointer", borderStyle: "dashed" }}
        onClick={onCreateNew}
      >
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>New Digital Worker</div>
        </div>
      </div>
    </div>
  );
}

function BuilderTab({ worker }) {
  if (!worker) {
    return <div style={S.empty}><div style={S.emptyTitle}>Select a Digital Worker to see its structure</div></div>;
  }
  const rules = worker.rules || [];
  const structure = [
    { name: worker.name || "Digital Worker", type: "root", children: [
      { name: "Inputs", type: "folder", children: [
        { name: "User Request", type: "file" },
        { name: "Context Data", type: "file" },
      ]},
      { name: "Rules", type: "folder", children: rules.map((r) => ({ name: r.substring(0, 50) + (r.length > 50 ? "..." : ""), type: "rule" })) },
      { name: "Templates", type: "folder", children: [
        { name: "Response Template", type: "file" },
      ]},
      { name: "Outputs", type: "folder", children: [
        { name: "Validated Response", type: "file" },
        { name: "Audit Trail", type: "file" },
      ]},
    ]},
  ];

  function renderTree(nodes, depth = 0) {
    return nodes.map((node, i) => (
      <div key={i} style={{ paddingLeft: depth * 20, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: depth === 0 ? "transparent" : "rgba(124,58,237,0.05)" }}>
          <span style={{ fontSize: 14, opacity: 0.7 }}>
            {node.type === "root" ? "\u{1F4E6}" : node.type === "folder" ? "\u{1F4C2}" : node.type === "rule" ? "\u{1F6D1}" : "\u{1F4C4}"}
          </span>
          <span style={{ fontSize: 13, color: node.type === "rule" ? "#f87171" : "#e2e8f0", fontWeight: depth === 0 ? 600 : 400 }}>{node.name}</span>
        </div>
        {node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  }

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Digital Worker Structure</div>
      <div style={{ background: "#16161e", borderRadius: 10, padding: 16, border: "1px solid #2a2a3a", fontFamily: "monospace" }}>
        {renderTree(structure)}
      </div>
    </div>
  );
}

function RulesTab({ worker, onAddRule }) {
  if (!worker) {
    return <div style={S.empty}><div style={S.emptyTitle}>Select a Digital Worker to see its rules</div></div>;
  }
  const rules = worker.rules || [];
  if (rules.length === 0) {
    return (
      <div style={S.empty}>
        <div style={S.emptyTitle}>No rules defined</div>
        <div style={S.emptyDesc}>Rules are the enforcement logic for your Digital Worker. Tell Alex what should never be allowed.</div>
        <button style={{ ...S.btnPrimary, marginTop: 16 }} onClick={onAddRule}>Add a rule</button>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0" }}>Enforcement Rules ({rules.length})</div>
        <button style={S.btnSecondary} onClick={onAddRule}>+ Add rule</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rules.map((rule, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "#16161e", borderRadius: 8, border: "1px solid #2a2a3a" }}>
            <span style={{ color: "#f87171", fontSize: 16, marginTop: 1 }}>{"\u{1F6D1}"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{rule}</div>
            </div>
            <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>Rule {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestConsoleTab({ worker, testInput, setTestInput, testResults, testRunning, onRunTest }) {
  if (!worker) {
    return <div style={S.empty}><div style={S.emptyTitle}>Select a Digital Worker to test</div></div>;
  }
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Test Console — {worker.name}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Input */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Test Data (JSON)</div>
          <textarea
            style={{ width: "100%", minHeight: 200, padding: 12, background: "#16161e", border: "1px solid #2a2a3a", borderRadius: 8, color: "#e2e8f0", fontSize: 13, fontFamily: "monospace", outline: "none", resize: "vertical" }}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder='{\n  "data": "your test input here"\n}'
          />
          <button style={{ ...S.btnPrimary, marginTop: 12, width: "100%" }} onClick={onRunTest} disabled={testRunning}>
            {testRunning ? "Running..." : "Run Test"}
          </button>
        </div>
        {/* Results */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Results</div>
          <div style={{ minHeight: 200, padding: 12, background: "#16161e", border: "1px solid #2a2a3a", borderRadius: 8, fontFamily: "monospace", fontSize: 13 }}>
            {!testResults && <div style={{ color: "#64748b" }}>Run a test to see results here.</div>}
            {testResults && testResults.ok && (
              <div>
                <div style={{ color: testResults.passed ? "#10b981" : "#f87171", fontWeight: 600, marginBottom: 12 }}>
                  {testResults.passed ? "PASS" : "FAIL"} — {testResults.rulesCount} rules evaluated
                </div>
                {(testResults.results || []).map((r, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #2a2a3a", color: r.passed ? "#10b981" : "#f87171" }}>
                    {r.passed ? "PASS" : "FAIL"}: {r.rule?.substring(0, 60)}
                  </div>
                ))}
              </div>
            )}
            {testResults && !testResults.ok && (
              <div style={{ color: "#f87171" }}>Error: {testResults.error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketplaceTab({ worker }) {
  if (!worker) {
    return <div style={S.empty}><div style={S.emptyTitle}>Select a Digital Worker to publish</div></div>;
  }
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Marketplace Listing</div>
      <div style={{ background: "#16161e", borderRadius: 10, padding: 24, border: "1px solid #2a2a3a", maxWidth: 560 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</label>
          <div style={{ padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 14 }}>{worker.name}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</label>
          <div style={{ padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 14, lineHeight: 1.5 }}>{worker.description || "No description"}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Category</label>
          <div style={{ padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 14 }}>{worker.category || "custom"}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rules</label>
          <div style={{ padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 14 }}>{worker.rulesCount || 0} enforcement rules</div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Revenue Split</label>
          <div style={{ padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#10b981", fontSize: 14, fontWeight: 600 }}>You earn 75% of revenue. $9/mo per hire.</div>
        </div>
        <div style={{ display: "flex", gap: 12, borderTop: "1px solid #2a2a3a", paddingTop: 20 }}>
          <button style={{ ...S.btnPrimary, flex: 1 }} onClick={() => window.open('/apply', '_blank')}>Apply to Publish</button>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 12, textAlign: "center" }}>Publishing will be available once your Digital Worker passes all tests and you have a creator license.</div>
      </div>
    </div>
  );
}

// ── Grow Tab — Distribution Concierge ─────────────────────────

function GrowTab({ worker, onAskAlex }) {
  const [copied, setCopied] = useState(null);

  if (!worker) {
    return <div style={S.empty}><div style={S.emptyTitle}>Select a Digital Worker to grow</div><div style={S.emptyDesc}>Build and publish a Digital Worker first, then come here to launch it.</div></div>;
  }

  const slug = (worker.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const marketplaceUrl = `https://title-app-alpha.web.app/marketplace/${slug}`;
  const embedCode = `<iframe src="${marketplaceUrl}?embed=1" width="100%" height="600" frameborder="0"></iframe>`;

  const socialPosts = {
    twitter: `Just launched "${worker.name}" on TitleApp Marketplace -- an AI service with built-in rules enforcement. Every output is validated before delivery. Try it: ${marketplaceUrl}`,
    linkedin: `Excited to share my new Digital Worker on TitleApp: "${worker.name}"\n\n${worker.description || "An AI service with deterministic rules enforcement."}\n\nDigital Workers are AI services with built-in rules enforcement. You define the rules, AI operates within them, and every output is validated by an enforcement engine.\n\n${marketplaceUrl}`,
    email: `Subject: Check out ${worker.name} on TitleApp\n\nHi,\n\nI built a Digital Worker called "${worker.name}" on TitleApp.\n\n${worker.description || "It uses rules enforcement to validate every AI output before delivery."}\n\nYou can try it here: ${marketplaceUrl}\n\nLet me know what you think.`,
  };

  const checklist = [
    { id: "rules", label: "Define enforcement rules", done: (worker.rulesCount || 0) > 0 },
    { id: "test", label: "Run test data through rules engine", done: worker.status === "tested" || worker.status === "registered" },
    { id: "publish", label: "Publish to marketplace", done: !!worker.published },
    { id: "share", label: "Share marketplace link", done: false },
    { id: "first_sub", label: "Get first subscriber", done: (worker.subscribers || 0) > 0 },
  ];

  function copyText(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Grow: {worker.name}</div>
      <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>Get your first subscribers. Alex can help with any of these -- just ask in the chat.</div>

      {/* Launch Checklist */}
      <div style={S.growCard}>
        <span style={S.growLabel}>Launch Checklist</span>
        {checklist.map((item) => (
          <div key={item.id} style={S.checklist}>
            {item.done ? (
              <span style={S.checkDone}>&#10003;</span>
            ) : (
              <span style={S.checkPending} />
            )}
            <span style={{ fontSize: 13, color: item.done ? "#94a3b8" : "#e2e8f0", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
          {checklist.filter(c => c.done).length} of {checklist.length} complete
        </div>
      </div>

      {/* Marketplace Link */}
      <div style={S.growCard}>
        <span style={S.growLabel}>Marketplace Link</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#7c3aed", fontSize: 13, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{marketplaceUrl}</div>
          <button style={S.copyBtn} onClick={() => copyText("url", marketplaceUrl)}>{copied === "url" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Social Media Posts */}
      <div style={S.growCard}>
        <span style={S.growLabel}>Social Media Posts</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { key: "twitter", label: "X / Twitter", text: socialPosts.twitter },
            { key: "linkedin", label: "LinkedIn", text: socialPosts.linkedin },
          ].map(({ key, label, text }) => (
            <div key={key}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>{label}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1, padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{text}</div>
                <button style={{ ...S.copyBtn, alignSelf: "flex-start" }} onClick={() => copyText(key, text)}>{copied === key ? "Copied" : "Copy"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Template */}
      <div style={S.growCard}>
        <span style={S.growLabel}>Email Template</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{socialPosts.email}</div>
          <button style={{ ...S.copyBtn, alignSelf: "flex-start" }} onClick={() => copyText("email", socialPosts.email)}>{copied === "email" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Embed Widget */}
      <div style={S.growCard}>
        <span style={S.growLabel}>Embed Widget</span>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Add this to your website to embed your Digital Worker directly.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#7c3aed", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>{embedCode}</div>
          <button style={{ ...S.copyBtn, alignSelf: "flex-start" }} onClick={() => copyText("embed", embedCode)}>{copied === "embed" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Stats placeholder */}
      <div style={S.growCard}>
        <span style={S.growLabel}>Performance</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Subscribers", value: worker.subscribers || 0 },
            { label: "API Calls (30d)", value: worker.apiCalls30d || 0 },
            { label: "Revenue (30d)", value: "$" + ((worker.revenue30d || 0) / 100).toFixed(2) },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center", padding: "16px 8px", background: "#0f0f14", borderRadius: 8, border: "1px solid #2a2a3a" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0" }}>{value}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ask Alex CTA */}
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <button style={S.btnSecondary} onClick={() => onAskAlex("Help me grow " + worker.name + " -- what should I do next?")}>
          Ask Alex for growth advice
        </button>
      </div>
    </div>
  );
}
