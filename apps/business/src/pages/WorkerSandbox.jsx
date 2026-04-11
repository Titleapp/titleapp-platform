// CODEX 47.4 Phase B (T2) — Worker Sandbox page (reference implementation).
//
// Parallel surface to DeveloperSandbox. Drives the 9-step worker build flow
// against the Phase A backend. Layout:
//
//   ┌─────────────────────────────────────────────────────────┐
//   │  StepStatusBar (9 worker steps, purple accent)          │
//   ├─────────────────────────┬───────────────────────────────┤
//   │  Alex chat              │  Active step canvas           │
//   │  + completion moments   │  (from canvases.jsx)          │
//   └─────────────────────────┴───────────────────────────────┘
//
// Session state is loaded from /sandbox:worker:state on mount and refreshed
// after every advance. localStorage holds the active sessionId so reload
// resumes mid-flow. The Build Log link in the top bar opens
// /sandbox/worker/buildlog.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";
import StepStatusBar from "../components/sandbox/StepStatusBar";
import FileUploadBar, { classifyFile, validateFiles, ACCEPT_STRING } from "../components/sandbox/FileUploadBar";
import {
  initWorkerFlow,
  advanceWorkerStep,
  getWorkerFlowState,
  waitForAuth,
  encodeFilesForChat,
} from "../api/sandboxWorkerApi";
import { WORKER_STEPS, STEP_BY_ID, buildBarSteps, PURPLE } from "../components/sandbox/worker/workerSteps";
import { CANVAS_BY_STEP } from "../components/sandbox/worker/canvases";
import CompletionMoment from "../components/sandbox/worker/CompletionMoment";

const SESSION_KEY = "ta_worker_sandbox_session";
const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// ─── Chat panel ─────────────────────────────────────────────────────────────

function AlexChat({ messages, completionContext, nextStepLabel, onContinueAfterCompletion, onDismissCompletion, onSend, sending, pendingFiles, onFilesSelected, onFileRemove, onFilesClear, fileInputRef }) {
  const [input, setInput] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);
  const endRef = React.useRef(null);
  const hasFiles = pendingFiles && pendingFiles.length > 0;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit() {
    const text = input.trim();
    if (!text && !hasFiles) return;
    if (sending) return;
    setInput("");
    if (onSend) onSend(text);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer?.files?.length && onFilesSelected) {
      onFilesSelected(e.dataTransfer.files);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: "flex", flexDirection: "column", height: "100%",
        background: "#FFFFFF", borderRight: "1px solid #E2E8F0",
        position: "relative",
      }}
    >
      {/* Drop overlay */}
      {dragOver && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          background: "rgba(107,70,193,0.08)",
          border: "2px dashed #6B46C1",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#6B46C1" }}>
            Drop files here
          </div>
        </div>
      )}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid #E2E8F0",
        fontSize: 14, fontWeight: 700, color: "#1a1a2e",
      }}>
        Alex · Chief of Staff
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 16,
            fontSize: 14,
            color: "#1a1a2e",
            lineHeight: 1.55,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#94A3B8",
              textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4,
            }}>
              {m.role === "user" ? "You" : "Alex"}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}

        {completionContext && (
          <CompletionMoment
            context={completionContext}
            nextStepLabel={nextStepLabel}
            onContinue={onContinueAfterCompletion}
            onDismiss={onDismissCompletion}
          />
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0" }}>
        {/* CODEX 47.10 — File upload bar */}
        <FileUploadBar
          files={pendingFiles || []}
          onRemove={onFileRemove}
          onClear={onFilesClear}
          disabled={sending}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button
            type="button"
            onClick={() => fileInputRef?.current?.click()}
            disabled={sending}
            style={{
              background: "none", border: "1px solid #E2E8F0", borderRadius: 8,
              padding: "8px 10px", cursor: sending ? "default" : "pointer",
              color: "#64748B", fontSize: 16, flexShrink: 0, lineHeight: 1,
              minHeight: 44, display: "flex", alignItems: "center",
            }}
            title="Attach files (PDF, DOCX, images, video)"
          >
            +
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_STRING}
            style={{ display: "none" }}
            onChange={e => { if (onFilesSelected) onFilesSelected(e.target.files); e.target.value = ""; }}
          />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Ask Alex about your worker..."
            rows={2}
            style={{
              flex: 1, padding: "10px 12px", border: "1px solid #E2E8F0",
              borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "none",
              outline: "none", lineHeight: 1.4, minHeight: 44,
            }}
            onFocus={e => { e.target.style.borderColor = PURPLE; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"; }}
            onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
          />
          <button
            onClick={handleSubmit}
            disabled={sending || (!input.trim() && !hasFiles)}
            style={{
              padding: "10px 16px",
              background: (input.trim() || hasFiles) ? PURPLE : "#E2E8F0",
              color: (input.trim() || hasFiles) ? "white" : "#94A3B8",
              border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 600,
              cursor: (input.trim() || hasFiles) ? "pointer" : "default",
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Top bar ────────────────────────────────────────────────────────────────

function TopBar({ workerName, onOpenBuildLog, onResetSession }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "12px 20px",
      background: "#FFFFFF", borderBottom: "1px solid #E2E8F0",
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: PURPLE }}>TitleApp</div>
      <div style={{ flex: 1, fontSize: 14, color: "#64748B" }}>
        Worker Sandbox · {workerName || "untitled"}
      </div>
      <button onClick={onOpenBuildLog} style={{
        background: "#FFFFFF", color: "#1a1a2e",
        border: "1px solid #CBD5E1", borderRadius: 6,
        padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}>Build Log</button>
      <button onClick={onResetSession} style={{
        background: "transparent", color: "#94A3B8",
        border: "none", fontSize: 12, cursor: "pointer",
      }}>Start over</button>
    </div>
  );
}

// ─── Inline signup ──────────────────────────────────────────────────────────
//
// Anonymous users who land at /sandbox/worker (e.g. via the Worker chip
// redirect at /sandbox) need to be able to create a free account in place
// rather than being bounced to the marketing landing page. This mirrors the
// existing handleInlineSignup pattern in DeveloperSandbox.jsx — same backend
// route (/v1/auth:signup), same custom-token sign-in, same tenant claim.

function InlineSignup({ onSignupComplete }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api?path=/v1/auth:signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          surface: "sandbox",
          ...(sessionStorage.getItem("ta_utm") ? { utmAttribution: JSON.parse(sessionStorage.getItem("ta_utm")) } : {}),
        }),
      });
      const result = await resp.json();
      if (!result.ok || !result.token) {
        setError(result.error || "Signup didn't go through. Try a different email.");
        setBusy(false);
        return;
      }

      // Custom token → real Firebase session. onAuthStateChanged will fire
      // with the new user, which the parent useEffect picks up and boots
      // the worker session.
      let idToken = result.token;
      try {
        const userCred = await signInWithCustomToken(firebaseAuth, result.token);
        idToken = await userCred.user.getIdToken();
      } catch (authErr) {
        console.error("[WorkerSandbox.signup] signInWithCustomToken failed:", authErr);
      }
      localStorage.setItem("ID_TOKEN", idToken);
      if (result.uid) localStorage.setItem("USER_ID", result.uid);

      // Claim a tenant if we don't have one yet — required for downstream
      // routes that demand X-Tenant-Id.
      if (!localStorage.getItem("TENANT_ID")) {
        try {
          const claimRes = await fetch(`${API_BASE}/api?path=/v1/onboarding:claimTenant`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ name: name.trim(), surface: "sandbox" }),
          });
          const claimData = await claimRes.json();
          if (claimData.ok && claimData.tenantId) {
            localStorage.setItem("TENANT_ID", claimData.tenantId);
          }
        } catch (claimErr) {
          console.error("[WorkerSandbox.signup] tenant claim failed:", claimErr);
        }
      }

      if (onSignupComplete) onSignupComplete();
    } catch (err) {
      console.error("[WorkerSandbox.signup] failed:", err);
      setError("Could not reach the signup server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F8FAFC", fontFamily: "system-ui, -apple-system, sans-serif", padding: 20,
    }}>
      <div style={{
        background: "#FFFFFF", border: `2px solid ${PURPLE}`, borderRadius: 16,
        padding: "32px 28px", maxWidth: 420, width: "100%",
        boxShadow: `0 4px 32px color-mix(in srgb, ${PURPLE} 12%, transparent)`,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: PURPLE, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
          Worker Sandbox
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>
          Create your workspace
        </div>
        <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.55, marginBottom: 20 }}>
          Your worker needs a home. This creates your free creator account and drops you straight into the build flow.
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
            style={{ padding: "12px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: "12px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
          {error && (
            <div style={{ fontSize: 13, color: "#DC2626", padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !name.trim() || !email.trim()}
            style={{
              padding: "12px 20px", background: PURPLE, color: "#FFFFFF",
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: busy ? "wait" : "pointer", opacity: (busy || !name.trim() || !email.trim()) ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {busy ? "Creating your workspace…" : "Sign up and start building"}
          </button>
        </form>
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 14, lineHeight: 1.5, textAlign: "center" }}>
          By signing up you agree to TitleApp's{" "}
          <a href="/legal/terms-of-service" target="_blank" rel="noreferrer" style={{ color: PURPLE }}>Terms of Service</a>.
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function WorkerSandbox() {
  const [sessionId, setSessionId] = useState(null);
  const [state, setState] = useState(null);
  const [activeStepId, setActiveStepId] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "alex",
      text: "Welcome. I'm Alex, your Chief of Staff. We're going to build your first worker together — nine steps, your pace. I'll be here the whole way through. When you're ready, start with Define.",
    },
  ]);
  const [completionContext, setCompletionContext] = useState(null);
  const [nextStepLabel, setNextStepLabel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [bootError, setBootError] = useState(null);
  // CODEX 47.10 — File upload state
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = useRef(null);
  // Phase C-0 fix — gate boot() on Firebase auth resolution. We previously
  // fired the first API call from useEffect on mount, which raced the
  // onAuthStateChanged callback and produced a 401 because the API client
  // fell through to a stale localStorage token.
  const [authReady, setAuthReady] = useState(false);
  const [authedUser, setAuthedUser] = useState(null);

  // ── Boot: load or create session ─────────────────────────────────────────

  const refresh = useCallback(async (sid) => {
    const r = await getWorkerFlowState(sid);
    if (r.ok) {
      setState(r.state);
      if (r.state?.workerStepPhase && r.state.workerStepPhase !== "complete") {
        setActiveStepId(r.state.workerStepPhase);
      }
    }
  }, []);

  // CODEX 47.7 follow-up — replace the /login redirect with an inline
  // signup. Rationale: anonymous users who land here via the Worker chip
  // at /sandbox should be able to create a free account in place rather
  // than being dumped at the marketing landing page (which is what /login
  // actually is — there is no separate sign-in form there).
  //
  // Two effects working together:
  //
  //   1. waitForAuth handles the cold-mount race (Firebase IndexedDB hasn't
  //      hydrated currentUser yet on first paint).
  //   2. onAuthStateChanged subscribes for the lifetime of the page so
  //      post-signup transitions (signInWithCustomToken → user populated)
  //      are picked up automatically and trigger boot.

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await waitForAuth();
      if (cancelled) return;
      setAuthedUser(user);
      setAuthReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      // Update on every change. The first callback may be null while
      // Firebase hydrates, but waitForAuth above already handles that
      // race — this listener exists primarily to catch the post-signup
      // transition.
      if (user) {
        setAuthedUser(user);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!authedUser) {
      // Anonymous user. The render path will show <InlineSignup /> below.
      // Do NOT redirect — that previously dumped users at the marketing
      // landing page, which is a UX dead end.
      return;
    }

    let cancelled = false;
    async function boot() {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const r = await getWorkerFlowState(stored);
        if (cancelled) return;
        if (r.ok) {
          setSessionId(stored);
          setState(r.state);
          if (r.state?.workerStepPhase && r.state.workerStepPhase !== "complete") {
            setActiveStepId(r.state.workerStepPhase);
          }
          return;
        }
        // Stale session — fall through to init
        localStorage.removeItem(SESSION_KEY);
      }

      const init = await initWorkerFlow({});
      if (cancelled) return;
      if (!init.ok || !init.sessionId) {
        setBootError(init.error || "Could not start a worker session");
        return;
      }
      localStorage.setItem(SESSION_KEY, init.sessionId);
      setSessionId(init.sessionId);
      setState(init.state);
      setActiveStepId(init.state?.workerStepPhase || "define");
    }
    boot();
    return () => { cancelled = true; };
  }, [authReady, authedUser]);

  // ── Step completion ──────────────────────────────────────────────────────

  async function handleStepComplete({ stepId, payload }) {
    if (!sessionId) return;
    setBusy(true);

    // Capture the user's commit as an inline chat message for context
    setMessages(prev => [...prev, {
      role: "user",
      text: `Marked ${STEP_BY_ID[stepId]?.label || stepId} complete.`,
    }]);

    const r = await advanceWorkerStep({
      sessionId, stepId, action: "complete", data: payload?.stepData || {},
      // For Define, we ALSO push the spec fields up so the backend has them
      // for the completion message + Build Log header. Backend currently
      // accepts spec via the same data bag and merges into workerSteps.define.data
      // — the actual top-level spec will be wired in T3 when Define lives in
      // its own intake flow.
    });

    setBusy(false);
    if (!r.ok) {
      setMessages(prev => [...prev, { role: "alex", text: `Something went wrong: ${r.error}. Try again.` }]);
      return;
    }

    // Optimistically write spec fields locally for Define so the canvas/header
    // renders the new name immediately. Backend persistence of top-level spec
    // is intentionally limited in Phase A.
    if (stepId === "define" && payload?.spec) {
      setState(prev => ({
        ...(prev || {}),
        spec: { ...(prev?.spec || {}), ...payload.spec },
      }));
    }

    if (r.state) setState(r.state);
    if (r.completionMessageContext) {
      setCompletionContext(r.completionMessageContext);
      setNextStepLabel(r.nextStepId ? STEP_BY_ID[r.nextStepId]?.label : null);
    }
  }

  function continueAfterCompletion() {
    setCompletionContext(null);
    setNextStepLabel(null);
    if (state?.workerStepPhase && state.workerStepPhase !== "complete") {
      setActiveStepId(state.workerStepPhase);
    }
  }

  function dismissCompletion() {
    setCompletionContext(null);
    setNextStepLabel(null);
  }

  function openBuildLog() {
    if (sessionId) {
      window.location.href = `/sandbox/worker/buildlog?sessionId=${encodeURIComponent(sessionId)}`;
    }
  }

  async function resetSession() {
    if (!confirm("Start a new worker build? Your current draft stays in the Vault.")) return;
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setState(null);
    setActiveStepId(null);
    setCompletionContext(null);
    const init = await initWorkerFlow({});
    if (init.ok && init.sessionId) {
      localStorage.setItem(SESSION_KEY, init.sessionId);
      setSessionId(init.sessionId);
      setState(init.state);
      setActiveStepId(init.state?.workerStepPhase || "define");
    }
  }

  // ── CODEX 47.10 — File upload helpers ────────────────────────────────
  function handleFilesSelected(fileList) {
    const { valid, rejected } = validateFiles(fileList);
    if (rejected.length) {
      const names = rejected.map(r => `${r.name} (${r.reason})`).join(", ");
      setMessages(prev => [...prev, { role: "alex", text: `Some files were skipped: ${names}` }]);
    }
    const newFiles = valid.map(f => ({
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file: f, name: f.name, size: f.size, type: classifyFile(f),
      status: "pending", progress: 0, error: null,
    }));
    setPendingFiles(prev => [...prev, ...newFiles]);
  }
  function handleFileRemove(id) { setPendingFiles(prev => prev.filter(f => f.id !== id)); }
  function handleFilesClear() { setPendingFiles([]); }

  // ── Chat with Alex ─────────────────────────────────────────────────────
  async function handleChatSend(text) {
    const fileNote = pendingFiles.length > 0
      ? `\n[Attached: ${pendingFiles.map(f => f.name).join(", ")}]`
      : "";
    setMessages(prev => [...prev, { role: "user", text: text ? text + fileNote : fileNote.trim() }]);
    setChatSending(true);

    // CODEX 47.10 — Encode attached files for inline chat upload
    let chatFiles = null;
    const filesToUpload = [...pendingFiles];
    if (filesToUpload.length > 0) {
      setPendingFiles([]);
      try {
        chatFiles = await encodeFilesForChat(filesToUpload.map(pf => pf.file));
      } catch (err) {
        console.error("[WorkerSandbox] File encoding failed:", err);
        setMessages(prev => [...prev, { role: "alex", text: "Could not process attached files. Try again." }]);
      }
    }

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const headers = { "Content-Type": "application/json" };
      if (token && token !== "undefined" && token !== "null") headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId: sessionId || "",
          surface: "sandbox",
          userInput: text,
          flowStep: 1,
          vertical: state?.spec?.vertical || "",
          ...(chatFiles && chatFiles.length > 0 ? { files: chatFiles } : {}),
          // Pass creator name so Alex doesn't keep asking
          ...(authedUser?.displayName ? { creatorName: authedUser.displayName } : {}),
        }),
      });
      const result = await resp.json();
      const reply = result.message || result.reply;
      if (result.ok && reply) {
        setMessages(prev => [...prev, { role: "alex", text: reply }]);
      } else {
        setMessages(prev => [...prev, { role: "alex", text: reply || "Something went wrong. Try again." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "alex", text: "Could not reach the server. Try again in a moment." }]);
    } finally {
      setChatSending(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (bootError) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 16, color: "#DC2626", marginBottom: 12 }}>{bootError}</div>
        <button onClick={() => window.location.reload()} style={{
          background: PURPLE, color: "#FFFFFF", border: "none",
          borderRadius: 6, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>Reload</button>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif", color: "#64748B" }}>
        Signing you in…
      </div>
    );
  }

  // Anon user — render inline signup. The onAuthStateChanged listener
  // above will pick up the post-signup user and re-trigger this render
  // path with authedUser populated, which then drops into the boot path.
  if (!authedUser) {
    return <InlineSignup onSignupComplete={() => { /* state updates via onAuthStateChanged */ }} />;
  }

  if (!state || !activeStepId) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif", color: "#64748B" }}>
        Starting your worker session…
      </div>
    );
  }

  const barSteps = buildBarSteps(state.workerSteps || {});
  const Canvas = CANVAS_BY_STEP[activeStepId];
  const workerId = sessionId; // Until a worker is published, sessionId IS the workerId in Studio Locker
  const workerName = state.spec?.name || null;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: "#F8FAFC",
      "--accent": PURPLE,
    }}>
      <TopBar workerName={workerName} onOpenBuildLog={openBuildLog} onResetSession={resetSession} />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Nav panel — matches Creator Studio nav from game sandbox */}
        <div style={{
          width: 200, flexShrink: 0, background: "#0f172a", color: "#e5e7eb",
          display: "flex", flexDirection: "column", overflowY: "auto",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: PURPLE }}>Creator Studio</div>
            <div style={{ fontSize: 11, color: "rgba(226,232,240,0.55)", marginTop: 2 }}>TitleApp</div>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Dashboard</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>0</div>
                <div style={{ fontSize: 10, color: "rgba(226,232,240,0.45)" }}>Workers Live</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>0</div>
                <div style={{ fontSize: 10, color: "rgba(226,232,240,0.45)" }}>Subscribers</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>$0</div>
                <div style={{ fontSize: 10, color: "rgba(226,232,240,0.45)" }}>This Month</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>&mdash;</div>
                <div style={{ fontSize: 10, color: "rgba(226,232,240,0.45)" }}>Trend</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(226,232,240,0.45)", marginTop: 8, lineHeight: 1.5 }}>Launch your first worker to start earning.</div>
          </div>
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>My Workers</div>
            {workerName ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", padding: "6px 10px", background: "rgba(107,70,193,0.2)", border: "1px solid rgba(107,70,193,0.35)", borderRadius: 6 }}>
                {workerName}
                <div style={{ fontSize: 11, color: "rgba(226,232,240,0.45)", marginTop: 2 }}>Draft — Building</div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)" }}>No workers yet.</div>
            )}
          </div>
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>My Games</div>
            <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)" }}>No games yet.</div>
          </div>
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>My Audience</div>
            <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)", lineHeight: 1.5 }}>Your subscribers will appear here once you launch.</div>
          </div>
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Vault</div>
            <div style={{ fontSize: 12, color: "rgba(226,232,240,0.45)", lineHeight: 1.5 }}>Your files, conversations, and versions live here.</div>
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ width: 380, flexShrink: 0 }}>
          <AlexChat
            messages={messages}
            completionContext={completionContext}
            nextStepLabel={nextStepLabel}
            onContinueAfterCompletion={continueAfterCompletion}
            onDismissCompletion={dismissCompletion}
            onSend={handleChatSend}
            sending={chatSending}
            pendingFiles={pendingFiles}
            onFilesSelected={handleFilesSelected}
            onFileRemove={handleFileRemove}
            onFilesClear={handleFilesClear}
            fileInputRef={fileInputRef}
          />
        </div>

        {/* Canvas — step status bar + active canvas */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <StepStatusBar
            steps={barSteps}
            activeStep={activeStepId}
            accent={PURPLE}
            onStepClick={(id) => {
              const target = barSteps.find(s => s.id === id);
              if (target && (target.state === "warm" || target.state === "hot")) {
                setActiveStepId(id);
                setCompletionContext(null);
              }
            }}
          />
          <div style={{ flex: 1, overflowY: "auto", background: "#F8FAFC", opacity: busy ? 0.6 : 1 }}>
            {Canvas ? (
              <Canvas
                session={state}
                sessionId={sessionId}
                workerId={workerId}
                onComplete={(payload) => handleStepComplete({ stepId: activeStepId, payload })}
              />
            ) : (
              <div style={{ padding: 40, color: "#64748B" }}>No canvas registered for {activeStepId}.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
