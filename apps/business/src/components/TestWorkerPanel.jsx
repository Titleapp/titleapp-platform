import React, { useState, useRef, useEffect, useCallback } from "react";
import { auth as firebaseAuth } from "../firebase";
import { getFallbackPrompts } from "../constants/gameVerticals";
import GameEndScreen from "./sandbox/GameEndScreen";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Lightweight markdown renderer — handles **bold**, *italic*, `code`, - bullets, headers
function renderMarkdown(text) {
  if (!text) return null;
  return text.split("\n").map((line, li) => {
    const trimmed = line.trim();
    // Headers
    if (trimmed.startsWith("### ")) return <div key={li} style={{ fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 2 }}>{inlineFormat(trimmed.slice(4))}</div>;
    if (trimmed.startsWith("## ")) return <div key={li} style={{ fontWeight: 700, fontSize: 14, marginTop: 8, marginBottom: 2 }}>{inlineFormat(trimmed.slice(3))}</div>;
    if (trimmed.startsWith("# ")) return <div key={li} style={{ fontWeight: 700, fontSize: 15, marginTop: 8, marginBottom: 2 }}>{inlineFormat(trimmed.slice(2))}</div>;
    // Bullets
    if (/^[-*]\s/.test(trimmed)) return <div key={li} style={{ paddingLeft: 12, position: "relative" }}><span style={{ position: "absolute", left: 0 }}>&bull;</span>{inlineFormat(trimmed.slice(2))}</div>;
    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) return <div key={li} style={{ paddingLeft: 16 }}>{inlineFormat(trimmed)}</div>;
    // Empty line
    if (!trimmed) return <div key={li} style={{ height: 6 }} />;
    // Normal text
    return <div key={li}>{inlineFormat(line)}</div>;
  });
}

function inlineFormat(text) {
  // Split on **bold**, *italic*, `code` — simple regex approach
  const parts = [];
  let remaining = text;
  let key = 0;
  const rx = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  while ((match = rx.exec(remaining)) !== null) {
    if (match.index > lastIndex) parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
    if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={key++} style={{ background: "rgba(0,0,0,0.06)", padding: "1px 4px", borderRadius: 3, fontSize: "0.9em" }}>{match[4]}</code>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < remaining.length) parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
  return parts.length > 0 ? parts : text;
}

// CODEX 47.5 Fix 2 — robust Firebase ID token getter for the test panel.
//
// Bugs in the previous implementation:
//
//   1. The onAuthStateChanged fallback rejected on the FIRST callback when
//      user was null. Firebase emits a synchronous null callback before
//      reading the persisted session, so this rejected immediately for
//      legitimately authenticated users. The reject was then swallowed by
//      the outer empty `catch (_) {}`, falling through to localStorage
//      with a possibly-stale token.
//
//   2. getIdToken(true) was always force-refreshing. If the STS round-trip
//      transiently failed (cold tab, WiFi blip, Google rate limit), the
//      surrounding catch swallowed it and we again fell through to a
//      stale localStorage token.
//
// New behavior mirrors DeveloperSandbox.jsx getFreshToken (CODEX 47.5):
//   - waitForAuth resolves on the first NON-null user, ignoring synchronous
//     null callbacks.
//   - Cached getIdToken(false) preferred over force refresh.
//   - Errors logged, not swallowed.

let _authReadyPromise = null;
function waitForAuth(timeoutMs = 5000) {
  if (firebaseAuth?.currentUser) return Promise.resolve(firebaseAuth.currentUser);
  if (_authReadyPromise) return _authReadyPromise;
  _authReadyPromise = new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { unsub(); } catch (_) {}
      resolve(null);
    }, timeoutMs);
    const unsub = firebaseAuth.onAuthStateChanged((user) => {
      if (settled || !user) return; // skip null callbacks
      settled = true;
      clearTimeout(timer);
      try { unsub(); } catch (_) {}
      resolve(user);
    });
  });
  _authReadyPromise.finally(() => { _authReadyPromise = null; });
  return _authReadyPromise;
}

async function getToken() {
  const user = await waitForAuth();
  if (user) {
    try {
      const token = await user.getIdToken(false);
      if (token) {
        localStorage.setItem("ID_TOKEN", token);
        return token;
      }
    } catch (e) {
      console.warn("[TestWorkerPanel.getToken] cached getIdToken failed, retrying with force refresh:", e?.message);
    }
    try {
      const token = await user.getIdToken(true);
      if (token) {
        localStorage.setItem("ID_TOKEN", token);
        return token;
      }
    } catch (e) {
      console.error("[TestWorkerPanel.getToken] forced getIdToken failed:", e?.message);
    }
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

export default function TestWorkerPanel({ worker, workerCardData, sessionId, onExchange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [testSessionId, setTestSessionId] = useState(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [edgeCases, setEdgeCases] = useState([]);
  const [authError, setAuthError] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [starterPromptsVisible, setStarterPromptsVisible] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);

  // Interface preference
  const [interfacePref, setInterfacePref] = useState(null);
  const [mobileView, setMobileView] = useState(false);

  const [pendingFiles, setPendingFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // BUG-005: Auto-expand test chat input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  const workerName = workerCardData?.name || worker?.name || "Your Worker";
  const workerDesc = workerCardData?.description || worker?.description || "";

  function getWorkerIntro() {
    if (workerCardData?.welcomeMessage) return workerCardData.welcomeMessage;
    // Use problemSolves (polished "what it does") over raw description
    const problemSolves = workerCardData?.problemSolves || "";
    const target = workerCardData?.targetUser || "";
    // Clean: take first sentence, strip filler, cap at 80 chars
    const rawDesc = problemSolves || workerDesc || "";
    const cleanDesc = rawDesc.split(/[.!?]/)[0].trim().replace(/^(I |We |It |This |The worker )/i, "").substring(0, 80);

    let greeting = `Hi, I'm ${workerName}.`;
    if (target && cleanDesc && target !== "General audience") {
      greeting += ` I help ${target.toLowerCase()} ${cleanDesc.toLowerCase().startsWith("with") ? "" : "with "}${cleanDesc.toLowerCase()}.`;
    } else if (cleanDesc) {
      greeting += ` I ${cleanDesc.toLowerCase()}.`;
    }
    greeting += "\n\nTo get started, describe what you're working on and I'll take it from there.";
    return greeting;
  }

  function getStarterPrompts() {
    if (workerCardData?.starterPrompts?.length > 0) return workerCardData.starterPrompts.slice(0, 3);
    const desc = (workerCardData?.description || workerDesc || "").split(".")[0].toLowerCase();
    const prompts = [];
    if (desc) prompts.push(`Walk me through how you handle ${desc}`);
    prompts.push("What do you need from me to get started?");
    prompts.push("Show me an example of your output");
    return prompts.slice(0, 3);
  }

  function handleInterfaceChoice(pref) {
    setInterfacePref(pref);
    setMobileView(pref === "mobile");
    setMessages([{ role: "assistant", text: getWorkerIntro() }]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setSending(true);
    setAuthError(false);
    setStarterPromptsVisible(false);

    try {
      const token = await getToken();
      if (!token) {
        setAuthError(true);
        setSending(false);
        return;
      }

      const tenantId = localStorage.getItem("TENANT_ID");
      const res = await fetch(`${API_BASE}/api?path=/v1/worker:test:chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": tenantId,
          "X-Vertical": "developer",
          "X-Jurisdiction": "GLOBAL",
        },
        body: JSON.stringify({
          tenantId,
          workerId: worker?.id,
          userMessage: text,
          testSessionId,
          workerSpec: {
            name: workerName,
            description: workerDesc,
            targetUser: workerCardData?.targetUser || "",
            complianceRules: workerCardData?.complianceRules || "",
            raasRules: workerCardData?.raasRules || "",
          },
        }),
      });

      if (res.status === 401) {
        const freshToken = await getToken();
        if (freshToken) {
          const retry = await fetch(`${API_BASE}/api?path=/v1/worker:test:chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${freshToken}`,
              "X-Tenant-Id": tenantId,
              "X-Vertical": "developer",
              "X-Jurisdiction": "GLOBAL",
            },
            body: JSON.stringify({ tenantId, workerId: worker?.id, userMessage: text, testSessionId, workerSpec: {
              name: workerName, description: workerDesc,
              targetUser: workerCardData?.targetUser || "",
              complianceRules: workerCardData?.complianceRules || "",
              raasRules: workerCardData?.raasRules || "",
            } }),
          });
          const retryData = await retry.json();
          if (retryData.ok) {
            handleSuccessResponse(retryData);
            return;
          }
        }
        setAuthError(true);
        setSending(false);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        handleSuccessResponse(data);
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: data.error || "Something went wrong. Try again." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Try again." }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSuccessResponse(data) {
    setMessages(prev => [...prev, { role: "assistant", text: data.workerResponse }]);
    if (data.testSessionId) setTestSessionId(data.testSessionId);
    const newCount = data.exchangeCount || (exchangeCount + 1);
    setExchangeCount(newCount);
    if (onExchange) onExchange(newCount);

    if (data.suggestedEdgeCases && data.suggestedEdgeCases.length > 0) {
      setEdgeCases(data.suggestedEdgeCases);
    } else if (edgeCases.length === 0) {
      const vertical = workerCardData?.vertical || worker?.vertical;
      const raasMode = workerCardData?.gameConfig?.raasMode;
      setEdgeCases(getFallbackPrompts(vertical, raasMode));
    }
    if (data.gameResult) {
      setGameResult(data.gameResult);
    }
  }

  function handleAuthRefresh() {
    setAuthError(false);
    window.location.reload();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleEdgeCaseClick(text) {
    setInput(text);
    inputRef.current?.focus();
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  }

  function processFiles(files) {
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) return; // 10MB limit
      const reader = new FileReader();
      reader.onload = () => {
        setPendingFiles(prev => [...prev, { name: file.name, type: file.type, base64: reader.result.split(",")[1], mediaType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  }

  const S = {
    panel: { display: "flex", flexDirection: "column", height: "100%" },
    vaultBar: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px 12px 0 0", marginBottom: 0, flexShrink: 0 },
    vaultTitle: { fontSize: 14, fontWeight: 600, color: "#64748B" },
    vaultTab: { padding: "6px 14px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", borderRadius: 6, fontSize: 13, fontWeight: 600 },
    testBadge: { padding: "3px 8px", background: "rgba(16,185,129,0.1)", color: "#10b981", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" },
    chatArea: { flex: 1, minHeight: 0, overflowY: "auto", background: "#FFFFFF", border: "1px solid #E2E8F0", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 },
    msgUser: { alignSelf: "flex-end", background: "#6B46C1", color: "white", padding: "8px 12px", borderRadius: "12px 12px 4px 12px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5 },
    msgAssistant: { alignSelf: "flex-start", background: "#F4F4F8", color: "#1a1a2e", padding: "8px 12px", borderRadius: "12px 12px 12px 4px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5 },
    msgSystem: { alignSelf: "center", color: "#64748B", fontSize: 12, textAlign: "center", padding: "6px 12px", background: "rgba(100,116,139,0.06)", borderRadius: 8, maxWidth: "90%" },
    inputLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4, flexShrink: 0 },
    inputWrap: { display: "flex", gap: 8, marginBottom: 16, flexShrink: 0 },
    input: { flex: 1, padding: "10px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 13, outline: "none", resize: "none" },
    sendBtn: { padding: "10px 16px", background: "#10b981", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
    edgeCaseWrap: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, flexShrink: 0 },
    edgeCaseChip: { padding: "6px 12px", background: "rgba(107,70,193,0.06)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500 },
  };

  // Game end screen — shown when backend returns gameResult
  if (gameResult) {
    return <GameEndScreen gameResult={gameResult} workerSlug={worker?.slug || worker?.id} />;
  }

  // Interface preference chooser — shown before test begins
  if (!interfacePref) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>How will most of your subscribers use this worker?</div>
        <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>This sets up the right test environment.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { value: "mobile", icon: "\uD83D\uDCF1", label: "Mobile", desc: "Phone or tablet" },
            { value: "desktop", icon: "\uD83D\uDCBB", label: "Desktop", desc: "Browser or app" },
            { value: "both", icon: "\u2194\uFE0F", label: "Both", desc: "Desktop default, toggle to mobile" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => handleInterfaceChoice(opt.value)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
                background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10,
                cursor: "pointer", textAlign: "left", transition: "border-color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#6B46C1"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
            >
              <span style={{ fontSize: 24 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Phone frame wrapper for mobile view
  const phoneFrame = mobileView ? {
    width: 390, maxWidth: "100%", margin: "0 auto",
    border: "8px solid #1a1a2e", borderRadius: 32,
    padding: "8px 0", background: "#1a1a2e", overflow: "hidden",
    height: "min(85vh, 700px)",
  } : {};

  // Simulated Vault nav (left column)
  const vaultNav = (
    <div style={{ width: mobileView ? 0 : 200, flexShrink: 0, background: "#2D1B69", display: mobileView ? "none" : "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>My Vault</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Test Workspace</div>
      </div>
      <div style={{ padding: "10px 8px", flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px", marginBottom: 4 }}>Workers</div>
        <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 6, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>&#9733;</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Alex (Chief of Staff)</span>
        </div>
        <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.12)", borderRadius: 6, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "#10b981", flexShrink: 0 }}></span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>{workerName}</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px", marginTop: 12, marginBottom: 4 }}>My Work</div>
        {["Dashboard", "Documents", "Signatures", "Reports", "Clients & Contacts"].map(item => (
          <div key={item} style={{ padding: "6px 10px", fontSize: 12, color: "rgba(255,255,255,0.3)", cursor: "default" }}>{item}</div>
        ))}
      </div>
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Browse Marketplace</div>
      </div>
    </div>
  );

  // Chat column (center)
  const chatColumn = (
    <div style={S.panel}>
      {/* Test mode header */}
      <div style={S.vaultBar}>
        {mobileView && (
          <button onClick={() => setMobileNavOpen(true)}
            style={{ background: "none", border: "none", fontSize: 18, color: "#6B46C1", cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>
            &#9776;
          </button>
        )}
        <span style={S.testBadge}>Test Mode</span>
        <span style={S.vaultTab}>{workerName}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {mobileView && (
            <button onClick={() => setMobileWorkspaceOpen(true)}
              style={{ background: "none", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 6, fontSize: 11, color: "#6B46C1", cursor: "pointer", padding: "4px 8px", fontWeight: 600 }}>
              Workspace
            </button>
          )}
          {interfacePref === "both" && (
            <button onClick={() => setMobileView(!mobileView)}
              style={{ padding: "4px 10px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {mobileView ? "Desktop view" : "Mobile view"}
            </button>
          )}
        </div>
      </div>
      <div style={S.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? S.msgUser : msg.role === "system" ? S.msgSystem : S.msgAssistant}>
            {msg.role === "assistant" ? renderMarkdown(msg.text) : msg.text}
          </div>
        ))}
        {starterPromptsVisible && messages.length === 1 && !sending && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {getStarterPrompts().map((prompt, i) => (
              <button key={i} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                style={{ alignSelf: "flex-start", padding: "8px 14px", background: "rgba(107,70,193,0.06)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500, textAlign: "left" }}>
                {prompt}
              </button>
            ))}
          </div>
        )}
        {sending && (
          <>
            <style>{`@keyframes thinkBounce { 0%, 60%, 100% { transform: translateY(0) } 30% { transform: translateY(-4px) } }`}</style>
            <div style={{ alignSelf: "flex-start", background: "#F4F4F8", padding: "10px 14px", borderRadius: "12px 12px 12px 4px", display: "flex", alignItems: "center", gap: 3 }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <span key={i} style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#94A3B8", animation: `thinkBounce 1.2s ease-in-out ${d}s infinite` }} />
              ))}
            </div>
          </>
        )}
        {authError && (
          <div style={{ alignSelf: "center", padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, color: "#1a1a2e", textAlign: "center" }}>
            Having trouble connecting —{" "}
            <span onClick={handleAuthRefresh} style={{ color: "#6B46C1", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>click here to refresh</span>.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {edgeCases.length > 0 && (
        <div style={S.edgeCaseWrap}>
          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, alignSelf: "center" }}>Try:</span>
          {edgeCases.map((ec, i) => (
            <button key={i} style={S.edgeCaseChip} onClick={() => handleEdgeCaseClick(ec)}>{ec}</button>
          ))}
        </div>
      )}
      <div style={S.inputLabel}>You're testing as a subscriber. Ask it anything.</div>
      {pendingFiles.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "4px 0", flexShrink: 0 }}>
          {pendingFiles.map((f, i) => (
            <span key={i} style={{ fontSize: 11, padding: "3px 8px", background: "rgba(107,70,193,0.08)", borderRadius: 12, color: "#6B46C1", display: "flex", alignItems: "center", gap: 4 }}>
              {f.name.substring(0, 20)}{f.name.length > 20 ? "..." : ""}
              <span onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} style={{ cursor: "pointer", fontWeight: 700 }}>&times;</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ ...S.inputWrap, ...(dragOver ? { outline: "2px dashed #6B46C1", outlineOffset: -2, borderRadius: 8 } : {}) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} multiple onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />
        <button onClick={() => fileInputRef.current?.click()}
          style={{ background: "none", border: "none", fontSize: 18, color: "#94A3B8", cursor: "pointer", padding: "4px 6px", flexShrink: 0 }}
          title="Attach file">&#128206;</button>
        <textarea ref={inputRef} style={{ ...S.input, overflowY: "auto", minHeight: 44 }} value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Ask your worker something..." rows={2} />
        <button style={S.sendBtn} onClick={handleSend} disabled={sending}>Send</button>
      </div>
    </div>
  );

  // Workspace column (right) — simulated worker dashboard
  const workspaceColumn = (
    <div style={{ width: mobileView ? 0 : 260, flexShrink: 0, background: "#FAFBFC", borderLeft: "1px solid #E2E8F0", display: mobileView ? "none" : "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Workspace</div>
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{workerName}</div>
      </div>
      <div style={{ padding: 14, flex: 1, overflowY: "auto" }}>
        {/* Sample data cards */}
        {[
          { title: "Recent Activity", items: ["Waiting for first interaction..."] },
          { title: "Quick Stats", items: ["Conversations: 0", "Tasks completed: 0", "Compliance checks: 0"] },
          { title: "Documents", items: ["No documents generated yet"] },
        ].map((card, ci) => (
          <div key={ci} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{card.title}</div>
            {card.items.map((item, ii) => (
              <div key={ii} style={{ fontSize: 12, color: "#CBD5E1", padding: "3px 0", fontStyle: "italic" }}>{item}</div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: 10, color: "#CBD5E1", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
          Sample data — will populate from subscriber inputs
        </div>
      </div>
    </div>
  );

  // Three-column Vault layout
  const vaultLayout = (
    <div style={{ display: "flex", height: mobileView ? "100%" : "min(85vh, 700px)", background: "#FFFFFF", border: mobileView ? "none" : "1px solid #E2E8F0", borderRadius: mobileView ? 0 : 12, overflow: "hidden" }}>
      {vaultNav}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {chatColumn}
      </div>
      {workspaceColumn}
    </div>
  );

  if (mobileView) {
    return (
      <div style={phoneFrame}>
        <div style={{ background: "#F8F9FC", borderRadius: 24, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
          {chatColumn}
          {/* Mobile nav drawer */}
          {mobileNavOpen && (
            <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex" }}>
              <div style={{ width: 240, background: "#2D1B69", height: "100%", display: "flex", flexDirection: "column", borderRadius: "24px 0 0 24px" }}>
                <div style={{ padding: "16px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>My Vault</span>
                  <button onClick={() => setMobileNavOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 18, cursor: "pointer" }}>&times;</button>
                </div>
                <div style={{ padding: "8px", flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", padding: "4px 8px", marginBottom: 4 }}>Workers</div>
                  <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Alex (Chief of Staff)</span>
                  </div>
                  <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.12)", borderRadius: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>{workerName}</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", padding: "4px 8px", marginTop: 12, marginBottom: 4 }}>My Work</div>
                  {["Dashboard", "Documents", "Signatures", "Reports"].map(item => (
                    <div key={item} style={{ padding: "6px 10px", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{item}</div>
                  ))}
                </div>
              </div>
              <div onClick={() => setMobileNavOpen(false)} style={{ flex: 1, background: "rgba(0,0,0,0.3)" }} />
            </div>
          )}
          {/* Mobile workspace drawer */}
          {mobileWorkspaceOpen && (
            <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "row-reverse" }}>
              <div style={{ width: 260, background: "#FAFBFC", height: "100%", display: "flex", flexDirection: "column", borderRadius: "0 24px 24px 0", borderLeft: "1px solid #E2E8F0" }}>
                <div style={{ padding: "16px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Workspace</span>
                  <button onClick={() => setMobileWorkspaceOpen(false)} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 18, cursor: "pointer" }}>&times;</button>
                </div>
                <div style={{ padding: 14, flex: 1, overflowY: "auto" }}>
                  {[{ title: "Recent Activity", items: ["Waiting for first interaction..."] }, { title: "Quick Stats", items: ["Conversations: 0", "Tasks completed: 0"] }, { title: "Documents", items: ["No documents yet"] }].map((card, ci) => (
                    <div key={ci} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>{card.title}</div>
                      {card.items.map((item, ii) => (<div key={ii} style={{ fontSize: 12, color: "#CBD5E1", fontStyle: "italic" }}>{item}</div>))}
                    </div>
                  ))}
                </div>
              </div>
              <div onClick={() => setMobileWorkspaceOpen(false)} style={{ flex: 1, background: "rgba(0,0,0,0.3)" }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return vaultLayout;
}
