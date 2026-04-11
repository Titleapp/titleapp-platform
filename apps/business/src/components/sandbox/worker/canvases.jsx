// CODEX 47.4 Phase B (T2) — Worker Sandbox canvases (reference implementation).
//
// One canvas per build step. The Knowledge and Test canvases are real
// (they hit the backend). The other canvases are scaffolds that demonstrate
// the contract: they read from the workerSteps state, write back via
// onCommit({stepId, data}), and emit a "complete" action when the creator
// confirms. They are deliberately minimal — Swiss tone, flat UI, no decoration.
//
// The point of this file is to show how each step's data flows from canvas →
// backend → Build Log, not to ship a polished UX. T3+ will replace these with
// real wireframes / live previews / etc.

import React, { useEffect, useState, useRef } from "react";
import { UX_TYPES, RAAS_TIERS, PURPLE } from "./workerSteps";
import {
  ingestDocument,
  listDocuments,
  setDocumentTier,
  deleteDocument,
  getTestQuestions,
  recordTestRun,
} from "../../../api/sandboxWorkerApi";

// ─── Shared styles ──────────────────────────────────────────────────────────

const card = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
};

const label = { fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.4 };
const heading = { fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 };
const sub = { fontSize: 13, color: "#64748B", marginBottom: 12 };
const input = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #CBD5E1",
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "inherit",
  marginBottom: 8,
  boxSizing: "border-box",
};
const textarea = { ...input, minHeight: 80, resize: "vertical" };
const primaryBtn = {
  background: PURPLE,
  color: "#FFFFFF",
  border: "none",
  borderRadius: 6,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
const ghostBtn = {
  background: "#FFFFFF",
  color: "#1a1a2e",
  border: "1px solid #CBD5E1",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

function CanvasShell({ title, subtitle, children }) {
  return (
    <div style={{ padding: 20 }}>
      <div style={heading}>{title}</div>
      {subtitle && <div style={sub}>{subtitle}</div>}
      {children}
    </div>
  );
}

// ─── Step 1 — Define ────────────────────────────────────────────────────────

export function DefineCanvas({ session, onComplete }) {
  const spec = session?.spec || {};
  const [name, setName] = useState(spec.name || "");
  const [vertical, setVertical] = useState(spec.category || "");
  const [audience, setAudience] = useState(spec.targetAudience || "");
  const [job, setJob] = useState(spec.problemSolves || "");

  function ready() { return name && vertical && audience && job; }

  return (
    <CanvasShell
      title="Define your worker"
      subtitle="What does it do, who uses it, what job does it perform?"
    >
      <div style={card}>
        <div style={label}>Worker name</div>
        <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ruthie — Pharmacology CoPilot" />
        <div style={label}>Vertical</div>
        <input style={input} value={vertical} onChange={e => setVertical(e.target.value)} placeholder="e.g. healthcare" />
        <div style={label}>Audience</div>
        <input style={input} value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who uses this?" />
        <div style={label}>Job it performs</div>
        <textarea style={textarea} value={job} onChange={e => setJob(e.target.value)} placeholder="The core problem it solves" />
        <button
          style={{ ...primaryBtn, opacity: ready() ? 1 : 0.4 }}
          disabled={!ready()}
          onClick={() => onComplete({
            spec: { name, category: vertical, targetAudience: audience, problemSolves: job },
          })}
        >
          Define complete
        </button>
      </div>

      {/* Live worker card preview */}
      <div style={{ ...card, borderLeft: `4px solid ${PURPLE}` }}>
        <div style={label}>Preview</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginTop: 6 }}>{name || "Untitled Worker"}</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{vertical || "—"} · {audience || "audience tbd"}</div>
        {job && <div style={{ fontSize: 13, color: "#1a1a2e", marginTop: 8 }}>{job}</div>}
      </div>
    </CanvasShell>
  );
}

// ─── Step 2 — Design ────────────────────────────────────────────────────────

export function DesignCanvas({ session, onComplete }) {
  const initial = session?.workerSteps?.design?.data || {};
  const [uxType, setUxType] = useState(initial.uxType || null);
  const [animation, setAnimation] = useState(!!initial.animationFlagged);
  const [rationale, setRationale] = useState(initial.rationale || "");

  return (
    <CanvasShell
      title="Design your worker"
      subtitle="Pick the UX pattern your subscribers will see when they open it."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {UX_TYPES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setUxType(t.id)}
            style={{
              ...card,
              marginBottom: 0,
              cursor: "pointer",
              borderColor: uxType === t.id ? PURPLE : "#E2E8F0",
              borderWidth: uxType === t.id ? 2 : 1,
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{t.label}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{t.primary}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{t.best}</div>
          </button>
        ))}
      </div>

      <div style={card}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1a1a2e" }}>
          <input type="checkbox" checked={animation} onChange={e => setAnimation(e.target.checked)} />
          Enable animation (v1.1 — flagged for later)
        </label>
        {animation && (
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, paddingLeft: 22 }}>
            Animation is on my roadmap. When it is available, your selection will be applied automatically.
          </div>
        )}
      </div>

      <div style={card}>
        <div style={label}>Why this design</div>
        <textarea style={textarea} value={rationale} onChange={e => setRationale(e.target.value)} placeholder="A line for the Build Log" />
      </div>

      <button
        style={{ ...primaryBtn, opacity: uxType ? 1 : 0.4 }}
        disabled={!uxType}
        onClick={() => onComplete({
          stepData: { uxType, animationFlagged: animation, rationale },
        })}
      >
        Design complete
      </button>
    </CanvasShell>
  );
}

// ─── Step 3 — Knowledge (real ingestion) ───────────────────────────────────

export function KnowledgeCanvas({ session, workerId, onComplete }) {
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlName, setUrlName] = useState("");
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function refresh() {
    const r = await listDocuments(workerId);
    if (r.ok) setDocs(r.documents || []);
  }

  useEffect(() => { refresh(); }, [workerId]); // eslint-disable-line

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const ext = file.name.toLowerCase().split(".").pop();
    let sourceType = "auto";
    if (ext === "pdf") sourceType = "pdf";
    else if (ext === "docx") sourceType = "docx";
    else if (["txt", "md", "csv"].includes(ext)) sourceType = "text";
    else if (ext === "pptx") sourceType = "pptx";
    const r = await ingestDocument({ workerId, name: file.name, sourceType, file });
    if (!r.ok) setError(r.error || "Ingest failed");
    await refresh();
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePaste() {
    if (!pasteText.trim() || !pasteName.trim()) return;
    setBusy(true);
    setError(null);
    const r = await ingestDocument({ workerId, name: pasteName, sourceType: "paste", text: pasteText });
    if (!r.ok) setError(r.error || "Ingest failed");
    setPasteText("");
    setPasteName("");
    await refresh();
    setBusy(false);
  }

  async function handleUrl() {
    if (!urlInput.trim() || !urlName.trim()) return;
    setBusy(true);
    setError(null);
    const r = await ingestDocument({ workerId, name: urlName, sourceType: "url", url: urlInput });
    if (!r.ok) setError(r.error || "Ingest failed");
    setUrlInput("");
    setUrlName("");
    await refresh();
    setBusy(false);
  }

  async function changeTier(docId, tier) {
    await setDocumentTier({ workerId, docId, tier });
    refresh();
  }

  async function removeDoc(docId) {
    await deleteDocument({ workerId, docId });
    refresh();
  }

  const docCount = docs.length;
  const totalChars = docs.reduce((acc, d) => acc + (d.charCount || 0), 0);

  return (
    <CanvasShell
      title="Knowledge — Studio Locker"
      subtitle="The most important step. Everything your worker knows lives here."
    >
      <div style={card}>
        <div style={label}>Upload a file (PDF, DOCX, TXT, MD, CSV)</div>
        <input ref={fileRef} type="file" onChange={handleFile} accept=".pdf,.docx,.txt,.md,.csv" />
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
          PPTX is not yet supported — paste the text directly for now.
        </div>
      </div>

      <div style={card}>
        <div style={label}>Paste text</div>
        <input style={input} value={pasteName} onChange={e => setPasteName(e.target.value)} placeholder="Name (e.g. Drug Class Notes)" />
        <textarea style={textarea} value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste content here" />
        <button style={ghostBtn} onClick={handlePaste} disabled={busy}>Add paste</button>
      </div>

      <div style={card}>
        <div style={label}>From URL</div>
        <input style={input} value={urlName} onChange={e => setUrlName(e.target.value)} placeholder="Name (e.g. FDA Black Box Warnings)" />
        <input style={input} value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..." />
        <button style={ghostBtn} onClick={handleUrl} disabled={busy}>Fetch and ingest</button>
      </div>

      {error && <div style={{ ...card, borderColor: "#DC2626", color: "#DC2626" }}>{error}</div>}

      <div style={card}>
        <div style={label}>Studio Locker · {docCount} document{docCount === 1 ? "" : "s"} · {totalChars.toLocaleString()} chars</div>
        {docs.length === 0 && <div style={{ ...sub, marginTop: 8 }}>Empty. Upload your first document above.</div>}
        {docs.map(d => (
          <div key={d.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: "1px solid #F1F5F9",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>
                {d.sourceType} · {(d.confidence * 100).toFixed(0)}% confidence · {d.ingestionStatus}
                {d.pageCount ? ` · ${d.pageCount} pages` : ""}
              </div>
            </div>
            <select value={d.tier} onChange={e => changeTier(d.id, parseInt(e.target.value, 10))}
              style={{ padding: "4px 8px", border: "1px solid #CBD5E1", borderRadius: 4, fontSize: 12 }}>
              <option value={1}>Tier 1</option>
              <option value={2}>Tier 2</option>
              <option value={3}>Tier 3</option>
            </select>
            <button onClick={() => removeDoc(d.id)} style={{ ...ghostBtn, padding: "4px 8px", fontSize: 11 }}>Remove</button>
          </div>
        ))}
      </div>

      <button
        style={{ ...primaryBtn, opacity: docCount > 0 ? 1 : 0.4 }}
        disabled={docCount === 0}
        onClick={() => onComplete({
          stepData: { documentCount: docCount, totalChars },
        })}
      >
        Knowledge complete
      </button>
    </CanvasShell>
  );
}

// ─── Step 4 — Rules ─────────────────────────────────────────────────────────

export function RulesCanvas({ session, onComplete }) {
  const initial = session?.workerSteps?.rules?.data?.raasTiers || {};
  const [tiers, setTiers] = useState({
    tier0: (initial.tier0 || []).join("\n"),
    tier1: (initial.tier1 || []).join("\n"),
    tier2: (initial.tier2 || []).join("\n"),
    tier3: (initial.tier3 || []).join("\n"),
  });
  const [reasoning, setReasoning] = useState(session?.workerSteps?.rules?.data?.reasoning || "");

  function update(tierId, val) { setTiers(prev => ({ ...prev, [tierId]: val })); }

  const hasContent = Object.values(tiers).some(t => t.trim().length > 0);

  return (
    <CanvasShell
      title="Rules — RAAS Library"
      subtitle="What your worker always does, never does, and when to escalate."
    >
      {RAAS_TIERS.map(t => (
        <div key={t.id} style={{ ...card, borderLeft: `4px solid ${t.color}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{t.label}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>{t.description}</div>
          <textarea
            style={textarea}
            value={tiers[t.id]}
            onChange={e => update(t.id, e.target.value)}
            placeholder="One rule per line"
          />
        </div>
      ))}

      <div style={card}>
        <div style={label}>Reasoning behind key decisions</div>
        <textarea style={textarea} value={reasoning} onChange={e => setReasoning(e.target.value)} />
      </div>

      <button
        style={{ ...primaryBtn, opacity: hasContent ? 1 : 0.4 }}
        disabled={!hasContent}
        onClick={() => onComplete({
          stepData: {
            raasTiers: {
              tier0: tiers.tier0.split("\n").map(s => s.trim()).filter(Boolean),
              tier1: tiers.tier1.split("\n").map(s => s.trim()).filter(Boolean),
              tier2: tiers.tier2.split("\n").map(s => s.trim()).filter(Boolean),
              tier3: tiers.tier3.split("\n").map(s => s.trim()).filter(Boolean),
            },
            reasoning,
          },
        })}
      >
        Rules locked
      </button>
    </CanvasShell>
  );
}

// ─── Step 5 — Tools ─────────────────────────────────────────────────────────

export function ToolsCanvas({ session, onComplete }) {
  const initial = session?.workerSteps?.tools?.data?.connectedTools || [];
  const [tools, setTools] = useState(initial);
  const [newTool, setNewTool] = useState("");
  const [enables, setEnables] = useState("");

  function add() {
    if (!newTool.trim()) return;
    setTools([...tools, { name: newTool, status: "connected", enables }]);
    setNewTool("");
    setEnables("");
  }
  function remove(i) { setTools(tools.filter((_, idx) => idx !== i)); }

  return (
    <CanvasShell
      title="Tools — Integrations"
      subtitle="Connect APIs your worker can act through, not just advise about."
    >
      <div style={card}>
        <div style={label}>Add a tool</div>
        <input style={input} value={newTool} onChange={e => setNewTool(e.target.value)} placeholder="Tool name (e.g. Stripe, SendGrid, Google Calendar)" />
        <input style={input} value={enables} onChange={e => setEnables(e.target.value)} placeholder="What does it enable? (optional)" />
        <button style={ghostBtn} onClick={add}>Add tool</button>
      </div>

      <div style={card}>
        <div style={label}>Connected tools · {tools.length}</div>
        {tools.length === 0 && <div style={{ ...sub, marginTop: 8 }}>No tools yet. Workers can ship without integrations — many do.</div>}
        {tools.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "#16A34A" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
              {t.enables && <div style={{ fontSize: 11, color: "#64748B" }}>{t.enables}</div>}
            </div>
            <button onClick={() => remove(i)} style={{ ...ghostBtn, padding: "4px 8px", fontSize: 11 }}>Remove</button>
          </div>
        ))}
      </div>

      <button
        style={primaryBtn}
        onClick={() => onComplete({ stepData: { connectedTools: tools } })}
      >
        Tools complete
      </button>
    </CanvasShell>
  );
}

// ─── Step 6 — Test (real red team) ──────────────────────────────────────────

export function TestCanvas({ session, sessionId, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [classifications, setClassifications] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await getTestQuestions(sessionId);
      if (cancelled) return;
      if (r.ok) setQuestions(r.questions || []);
      else setError(r.error || "Could not load test questions");
    }
    if (sessionId) load();
    return () => { cancelled = true; };
  }, [sessionId]);

  function setResponse(qid, val) { setResponses(prev => ({ ...prev, [qid]: val })); }
  function setClass(qid, val)    { setClassifications(prev => ({ ...prev, [qid]: val })); }

  const allAnswered = questions.length > 0 && questions.every(q => responses[q.id] && classifications[q.id]);

  async function submit() {
    setBusy(true);
    setError(null);
    const payload = questions.map(q => ({
      questionId: q.id,
      response: responses[q.id] || "",
      classification: classifications[q.id] || "failed",
    }));
    const r = await recordTestRun({ sessionId, responses: payload });
    setBusy(false);
    if (!r.ok) {
      setError(r.error || "Test run failed");
      return;
    }
    setSubmitted(true);
    const summary = r.run?.summary || {};
    const allClean = (summary.flagged || 0) === 0 && (summary.escalated || 0) === 0 && (summary.failed || 0) === 0;
    if (allClean) {
      onComplete({ stepData: { lastSummary: summary, runs: [r.run] } });
    }
  }

  return (
    <CanvasShell
      title="Test — Red team"
      subtitle="Alex stress tests your worker. This is the AHA moment."
    >
      <div style={{ ...card, background: "#F8FAFC" }}>
        <div style={{ fontSize: 13, color: "#1a1a2e", lineHeight: 1.5 }}>
          Let me stress test this before your subscribers do. I am going to push on it hard — that is how you know it is ready.
        </div>
      </div>

      {error && <div style={{ ...card, borderColor: "#DC2626", color: "#DC2626" }}>{error}</div>}

      {questions.map((q, i) => (
        <div key={q.id} style={card}>
          <div style={label}>Question {i + 1} · {q.category}</div>
          <div style={{ fontSize: 14, color: "#1a1a2e", marginTop: 6, marginBottom: 8 }}>{q.question}</div>
          <textarea
            style={textarea}
            value={responses[q.id] || ""}
            onChange={e => setResponse(q.id, e.target.value)}
            placeholder="Worker's response"
          />
          <div style={{ display: "flex", gap: 6 }}>
            {["clean", "flagged", "escalated", "failed"].map(c => (
              <button
                key={c}
                onClick={() => setClass(q.id, c)}
                style={{
                  ...ghostBtn,
                  padding: "4px 10px",
                  fontSize: 11,
                  borderColor: classifications[q.id] === c ? PURPLE : "#CBD5E1",
                  background: classifications[q.id] === c ? "#F3F0FF" : "#FFFFFF",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        style={{ ...primaryBtn, opacity: allAnswered && !busy ? 1 : 0.4 }}
        disabled={!allAnswered || busy}
        onClick={submit}
      >
        {submitted ? "Re-run test" : "Record test run"}
      </button>
    </CanvasShell>
  );
}

// ─── Step 7 — Preflight ─────────────────────────────────────────────────────

const PREFLIGHT_GATES = [
  "Creator agreement signed",
  "Identity verified",
  "Payout account connected",
  "Tax forms on file",
  "Worker spec reviewed",
  "Knowledge base passes minimum threshold",
  "Admin review approved",
];

export function PreflightCanvas({ session, onComplete }) {
  const [checked, setChecked] = useState(new Set());
  function toggle(i) {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i); else next.add(i);
    setChecked(next);
  }
  const all = checked.size === PREFLIGHT_GATES.length;

  return (
    <CanvasShell
      title="Preflight — 7 gates"
      subtitle="A lot of creators stall here. Push through the paperwork."
    >
      <div style={card}>
        {PREFLIGHT_GATES.map((g, i) => (
          <label key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < PREFLIGHT_GATES.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}>
            <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
            <span style={{ fontSize: 14, color: "#1a1a2e" }}>{g}</span>
          </label>
        ))}
      </div>
      <button
        style={{ ...primaryBtn, opacity: all ? 1 : 0.4 }}
        disabled={!all}
        onClick={() => onComplete({ stepData: { gatesPassed: PREFLIGHT_GATES.length } })}
      >
        Preflight complete
      </button>
    </CanvasShell>
  );
}

// ─── Step 8 — Distribute ────────────────────────────────────────────────────

export function DistributeCanvas({ session, onComplete }) {
  const spec = session?.spec || {};
  const slug = (spec.name || "your-worker").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url = `https://app.titleapp.ai/preview/${slug}`;

  return (
    <CanvasShell
      title="Distribute"
      subtitle="Your worker is live. Get it in front of the people who need it most."
    >
      <div style={card}>
        <div style={label}>Share link</div>
        <input style={input} readOnly value={url} />
      </div>
      <div style={card}>
        <div style={label}>Distribution kit</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#1a1a2e", lineHeight: 1.8 }}>
          <li>Private link (above)</li>
          <li>QR code (auto-generated)</li>
          <li>Embed snippet</li>
          <li>Social copy (worker-aware)</li>
          <li>Email blast template</li>
        </ul>
      </div>
      <button style={primaryBtn} onClick={() => onComplete({ stepData: { launchedAt: new Date().toISOString(), shareUrl: url } })}>
        First share complete
      </button>
    </CanvasShell>
  );
}

// ─── Step 9 — Grow & Revise ─────────────────────────────────────────────────

export function GrowCanvas({ session, onComplete }) {
  return (
    <CanvasShell
      title="Grow & Revise"
      subtitle="Expert network activation. Ongoing professional practice."
    >
      <div style={card}>
        <div style={{ fontSize: 14, color: "#1a1a2e", lineHeight: 1.6 }}>
          You are a recognized expert. Your network trusts you more than any ad TitleApp could ever run.
          The most powerful thing you can do right now is tell 10 people you trust that this exists —
          not 10,000 strangers, 10 people who already believe in your expertise. That is your launch. Start there.
        </div>
      </div>
      <div style={card}>
        <div style={label}>Subscribers</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e" }}>0</div>
      </div>
      <div style={card}>
        <div style={label}>Earnings</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e" }}>$0</div>
      </div>
      <button
        style={primaryBtn}
        onClick={() => onComplete({ stepData: { firstSubscriber: null, subscribers: 0, earnings: 0 } })}
      >
        Mark first subscriber moment
      </button>
    </CanvasShell>
  );
}

// ─── Canvas selector ────────────────────────────────────────────────────────

export const CANVAS_BY_STEP = {
  define: DefineCanvas,
  design: DesignCanvas,
  knowledge: KnowledgeCanvas,
  rules: RulesCanvas,
  tools: ToolsCanvas,
  test: TestCanvas,
  preflight: PreflightCanvas,
  distribute: DistributeCanvas,
  grow: GrowCanvas,
};
