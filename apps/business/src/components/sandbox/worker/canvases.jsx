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
  uploadFile,
  generateWorkerImage,
  generateCreatorBio,
  generateWorkerDeck,
} from "../../../api/sandboxWorkerApi";
import RealEstateWorkerCanvas from "../../canvas/RealEstateWorkerCanvas";

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
// Green = "advance / I'm done with this step." Distinct from purple (actions).
const successBtn = {
  background: "#16A34A",
  color: "#FFFFFF",
  border: "none",
  borderRadius: 6,
  padding: "11px 18px",
  fontSize: 14,
  fontWeight: 700,
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

// Shared "advance to next step" control. Green + an explicit prompt so it's
// obvious this confirms the step rather than labelling its status.
function StepComplete({ onClick, disabled, label = "Mark complete", prompt, disabledHint }) {
  const text = disabled
    ? (disabledHint || "Complete the required fields above to continue.")
    : (prompt || "Are you done with this step?");
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 12, color: disabled ? "#B45309" : "#64748B", marginBottom: 6 }}>{text}</div>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{ ...successBtn, opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {label} →
      </button>
    </div>
  );
}

// Small copy-to-clipboard button with transient "Copied" feedback.
function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch { /* clipboard blocked — no-op */ }
  }
  return (
    <button onClick={copy} style={{ ...ghostBtn, padding: "5px 10px", fontSize: 12 }}>
      {done ? "Copied ✓" : label}
    </button>
  );
}

// Trigger a client-side download of a text/html blob.
function downloadBlob(filename, content, type = "text/html") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Build a self-contained, presentable HTML deck from generated slides.
function buildDeckHtml(slides, spec) {
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const title = esc(spec?.name || "Digital Worker");
  const slideHtml = (slides || []).map((s) => `
    <section class="s">
      <h2>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : ""}
      ${(s.bullets && s.bullets.length) ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
    </section>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title} — Pitch Deck</title>
<style>:root{--p:#6B46C1}*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%;background:#0b0b14;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
#d{height:100vh;width:100vw;overflow:hidden;position:relative}.s{position:absolute;inset:0;display:none;flex-direction:column;justify-content:center;padding:8vh 9vw}.s.on{display:flex}
h2{font-size:clamp(28px,5vw,64px);font-weight:850;letter-spacing:-.02em;line-height:1.05}.sub{color:#cbd5e1;font-size:clamp(16px,2.2vw,28px);margin-top:18px;font-weight:500}
ul{margin-top:28px;list-style:none}li{font-size:clamp(16px,2.1vw,28px);line-height:1.5;color:#e2e8f0;margin:14px 0;padding-left:32px;position:relative}li::before{content:"→";position:absolute;left:0;color:var(--p);font-weight:800}
.bar{position:absolute;top:0;left:0;height:4px;background:var(--p)}.ft{position:absolute;bottom:24px;left:9vw;right:9vw;display:flex;justify-content:space-between;color:#475569;font-size:13px}.bd{font-weight:900}.bd b{color:var(--p)}</style></head>
<body><div id="d"><div class="bar" id="bar"></div>${slideHtml}<div class="ft"><span class="bd">SOC<b>III</b></span><span id="c"></span></div></div>
<script>var S=[...document.querySelectorAll('.s')],i=0,c=document.getElementById('c'),bar=document.getElementById('bar');function g(n){i=Math.max(0,Math.min(S.length-1,n));S.forEach((s,k)=>s.classList.toggle('on',k===i));c.textContent=(i+1)+' / '+S.length;bar.style.width=((i+1)/S.length*100)+'%'}document.addEventListener('keydown',e=>{if(['ArrowRight',' ','PageDown'].includes(e.key))g(i+1);else if(['ArrowLeft','PageUp'].includes(e.key))g(i-1)});document.getElementById('d').addEventListener('click',e=>{e.clientX>innerWidth/2?g(i+1):g(i-1)});g(0)</script></body></html>`;
}

// ─── Step 1 — Define ────────────────────────────────────────────────────────

export function DefineCanvas({ session, onComplete }) {
  const spec = session?.spec || {};
  const [name, setName] = useState(spec.name || "");
  const [vertical, setVertical] = useState(spec.category || "");
  const [audience, setAudience] = useState(spec.targetAudience || "");
  const [job, setJob] = useState(spec.problemSolves || "");
  // Your bio — the expert behind the worker. This IS the trust signal in the
  // marketplace ("Built by X, who has done Y"). Anchored on LinkedIn so it's
  // easy: paste your profile, generate a bio you can edit, grab a headshot.
  const [creatorName, setCreatorName] = useState(spec.creatorName || "");
  const [creatorBio, setCreatorBio] = useState(spec.creatorBio || "");
  const [linkedinUrl, setLinkedinUrl] = useState(spec.creatorLinkedin || "");
  const [aboutText, setAboutText] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState(spec.creatorHeadshotUrl || "");
  const [bioBusy, setBioBusy] = useState(false);
  const [bioErr, setBioErr] = useState(null);
  const [bioNote, setBioNote] = useState("");
  const headshotRef = useRef(null);

  async function generateBio() {
    setBioBusy(true); setBioErr(null); setBioNote("");
    const r = await generateCreatorBio({
      name: creatorName, source: aboutText, linkedinUrl,
      workerName: name, vertical,
    });
    setBioBusy(false);
    if (!r.ok) { setBioErr(r.error || "Couldn't generate a bio — write one below, or try again."); return; }
    if (r.bio) setCreatorBio(r.bio);
    if (r.headshotUrl && !headshotUrl) setHeadshotUrl(r.headshotUrl);
    setBioNote(r.fetched
      ? (r.headshotUrl ? "Pulled your headline + photo from LinkedIn." : "Pulled details from LinkedIn.")
      : "LinkedIn was private to us — drafted from what you typed. Edit freely.");
  }

  async function handleHeadshotUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBioBusy(true); setBioErr(null);
    const r = await uploadFile(file);
    setBioBusy(false);
    if (headshotRef.current) headshotRef.current.value = "";
    if (!r.ok) { setBioErr(r.error || "Upload failed"); return; }
    const u = r.url || r.fileUrl || r.downloadUrl;
    if (u) setHeadshotUrl(u);
  }

  // Chat-drives-canvas: when Alex extracts the spec from the conversation, the
  // prefilled fields flow in via session.spec and update the form live.
  useEffect(() => {
    const sp = session?.spec || {};
    if (sp.name) setName(sp.name);
    if (sp.category) setVertical(sp.category);
    if (sp.targetAudience) setAudience(sp.targetAudience);
    if (sp.problemSolves) setJob(sp.problemSolves);
    if (sp.creatorBio) setCreatorBio(sp.creatorBio);
    if (sp.creatorName) setCreatorName(sp.creatorName);
  }, [session?.spec?.name, session?.spec?.category, session?.spec?.targetAudience, session?.spec?.problemSolves, session?.spec?.creatorBio, session?.spec?.creatorName]);

  function ready() { return name && vertical && audience && job; }

  return (
    <CanvasShell
      title="Define your worker"
      subtitle="What does it do, who uses it, what job does it perform — and who are you?"
    >
      <StepHero kind="define" />
      <div style={card}>
        <div style={label}>Worker name</div>
        <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ruthie — Pharmacology CoPilot" />
        <div style={label}>Vertical</div>
        <input style={input} value={vertical} onChange={e => setVertical(e.target.value)} placeholder="e.g. healthcare" />
        <div style={label}>Audience</div>
        <input style={input} value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who uses this?" />
        <div style={label}>Job it performs</div>
        <textarea style={textarea} value={job} onChange={e => setJob(e.target.value)} placeholder="The core problem it solves" />
      </div>

      {/* Your bio — the expert behind it (LinkedIn-anchored) */}
      <div style={card}>
        <div style={label}>Your bio — the expert behind it</div>
        <div style={sub}>Subscribers trust a worker because they trust you. Paste your LinkedIn and we'll draft a bio you can edit.</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <input style={input} value={creatorName} onChange={e => setCreatorName(e.target.value)} placeholder="Your name (e.g. Sean Combs)" />
            <input style={input} value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="LinkedIn URL (e.g. linkedin.com/in/you)" />
            <textarea style={{ ...textarea, minHeight: 56 }} value={aboutText} onChange={e => setAboutText(e.target.value)} placeholder="Optional: a few words about yourself (or paste your LinkedIn About) — helps if LinkedIn is private." />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={generateBio} disabled={bioBusy} style={{ ...primaryBtn, opacity: bioBusy ? 0.4 : 1 }}>{bioBusy ? "Working…" : "Generate bio"}</button>
              <button onClick={() => headshotRef.current?.click()} disabled={bioBusy} style={ghostBtn}>Upload headshot</button>
              <input ref={headshotRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleHeadshotUpload} style={{ display: "none" }} />
            </div>
            {bioErr && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 6 }}>{bioErr}</div>}
            {bioNote && !bioErr && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>{bioNote}</div>}
          </div>
          <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: "50%", border: "1px solid #E2E8F0", background: "#F8FAFC", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {headshotUrl
              ? <img src={headshotUrl} alt="Headshot" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", padding: 4 }}>headshot</span>}
          </div>
        </div>
        <textarea style={{ ...textarea, marginTop: 8 }} value={creatorBio} onChange={e => setCreatorBio(e.target.value)} placeholder="Your bio appears here — edit it freely. (e.g. NV-licensed broker, 18 yrs, qualified CE instructor.)" />
      </div>

      <StepComplete
        disabled={!ready()}
        disabledHint={`Add ${[
          !name && "a worker name",
          !vertical && "a vertical",
          !audience && "an audience",
          !job && "the job it performs",
        ].filter(Boolean).join(", ")} up top to continue. (Chatting with Alex doesn't fill these in yet — type them into the fields above.)`}
        onClick={() => onComplete({
          spec: {
            name, category: vertical, targetAudience: audience, problemSolves: job,
            creatorName: creatorName.trim(), creatorBio: creatorBio.trim(),
            creatorLinkedin: linkedinUrl.trim(), creatorHeadshotUrl: headshotUrl || null,
          },
        })}
      />

      {/* Live worker card preview */}
      <div style={{ ...card, borderLeft: `4px solid ${PURPLE}`, marginTop: 12 }}>
        <div style={label}>Preview</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginTop: 6 }}>{name || "Untitled Worker"}</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{vertical || "—"} · {audience || "audience tbd"}</div>
        {job && <div style={{ fontSize: 13, color: "#1a1a2e", marginTop: 8 }}>{job}</div>}
        {(creatorName || creatorBio || headshotUrl) && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, alignItems: "flex-start" }}>
            {headshotUrl && <img src={headshotUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>Built by {creatorName || "you"}</div>
              {creatorBio && <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{creatorBio}</div>}
            </div>
          </div>
        )}
      </div>
    </CanvasShell>
  );
}

// ─── Step 2 — Design the canvas (Round 6) ────────────────────────────────────
// People like pictures, not words — the worker opens to a PICTURE. Design that
// picture BEFORE building it: the one headline outcome, the tabs (one cognitive
// job each), the visual floor, and a real mockup (generated from the creator's
// own answers, or uploaded). This is the foundational step — everything
// downstream renders into the canvas designed here.

const VISUAL_FLOORS = [
  "a Bloomberg terminal",
  "an MLS listing",
  "an Avvo profile",
  "a Garmin / Whoop cockpit",
  "a Netflix tile wall",
  "a MyChart summary",
];

// ── Picture-first pickers ───────────────────────────────────────────────────
// People like pictures, not words — so the pickers should BE pictures. These
// are tiny self-contained mockups (no images to load) so a creator SEES what a
// dashboard / map / Netflix tile wall actually looks like instead of reading
// the word for it.
const _frame = { borderRadius: 6, overflow: "hidden", border: "1px solid #E2E8F0" };

function ShapeThumb({ id }) {
  const base = { height: 54, padding: 6, display: "flex", flexDirection: "column", gap: 4, ..._frame, background: "#E6EBF2", border: "1px solid #B9C2CF" };
  switch (id) {
    case "dashboard": return <div style={base}>
      <div style={{ display: "flex", gap: 4, height: 15 }}>{["#c7d2fe", "#bbf7d0", "#fde68a"].map((c, i) => <div key={i} style={{ flex: 1, borderRadius: 4, background: c }} />)}</div>
      <div style={{ flex: 1, borderRadius: 4, background: "#eef2ff", display: "flex", alignItems: "flex-end", gap: 3, padding: 3 }}>{[7, 12, 5, 11, 15].map((h, i) => <div key={i} style={{ flex: 1, height: h, background: "#818cf8", borderRadius: 2 }} />)}</div>
    </div>;
    case "checklist": return <div style={base}>{[0, 1, 2].map(i => <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 10, height: 10, borderRadius: 3, background: i < 2 ? "#22c55e" : "#cbd5e1" }} /><div style={{ flex: 1, height: 6, borderRadius: 3, background: "#e2e8f0" }} /></div>)}</div>;
    case "wizard": return <div style={{ ...base, justifyContent: "center", alignItems: "center" }}><div style={{ width: "70%", height: 6, borderRadius: 3, background: "#e2e8f0" }}><div style={{ width: "55%", height: 6, borderRadius: 3, background: "#7c3aed" }} /></div><div style={{ display: "flex", gap: 6, marginTop: 6 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 1 ? "#7c3aed" : "#cbd5e1" }} />)}</div></div>;
    case "document": return <div style={{ ...base, background: "#fff" }}><div style={{ height: 8, width: "50%", background: "#475569", borderRadius: 2 }} />{[100, 92, 96, 78].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: "#e2e8f0", borderRadius: 2 }} />)}</div>;
    case "conversation": return <div style={{ ...base, justifyContent: "center", gap: 5 }}><div style={{ alignSelf: "flex-start", width: "60%", height: 12, borderRadius: 8, background: "#e2e8f0" }} /><div style={{ alignSelf: "flex-end", width: "55%", height: 12, borderRadius: 8, background: "#ddd6fe" }} /></div>;
    case "map": return <div style={{ ...base, background: "linear-gradient(135deg,#dcfce7,#bfdbfe)", position: "relative" }}><span style={{ position: "absolute", top: 6, left: "28%", fontSize: 15 }}>📍</span><span style={{ position: "absolute", bottom: 4, right: "24%", fontSize: 15 }}>📍</span></div>;
    case "calendar": return <div style={{ ...base, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>{Array.from({ length: 14 }).map((unused, i) => <div key={i} style={{ borderRadius: 2, background: i === 8 ? "#7c3aed" : "#e2e8f0" }} />)}</div>;
    case "course": return <div style={base}>{[70, 40, 90].map((w, i) => <div key={i} style={{ height: 9, borderRadius: 4, background: "#eef2ff", overflow: "hidden" }}><div style={{ width: `${w}%`, height: "100%", background: "#818cf8" }} /></div>)}</div>;
    case "reference": return <div style={base}><div style={{ height: 12, borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0" }} />{[0, 1].map(i => <div key={i} style={{ height: 6, borderRadius: 3, background: "#e2e8f0" }} />)}</div>;
    default: return <div style={{ ...base, alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", color: "#94a3b8", fontSize: 18 }}>+</div>;
  }
}

function FloorThumb({ name }) {
  const base = { height: 50, padding: 6, display: "flex", flexDirection: "column", gap: 3, ..._frame, background: "#fff" };
  if (name.includes("Bloomberg")) return <div style={{ ...base, background: "#0b0e14", justifyContent: "center", gap: 4 }}>{[["#22c55e", "70%"], ["#ef4444", "55%"], ["#22c55e", "85%"]].map(([c, w], i) => <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}><div style={{ width: 14, height: 5, background: "#64748b", borderRadius: 2 }} /><div style={{ width: w, height: 5, background: c, borderRadius: 2 }} /></div>)}</div>;
  if (name.includes("MLS")) return <div style={base}><div style={{ height: 22, borderRadius: 4, background: "linear-gradient(135deg,#93c5fd,#a7f3d0)" }} /><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ width: "50%", height: 5, background: "#e2e8f0", borderRadius: 2 }} /><div style={{ width: 26, height: 8, background: "#22c55e", borderRadius: 3 }} /></div></div>;
  if (name.includes("Avvo")) return <div style={{ ...base, flexDirection: "row", alignItems: "center", gap: 6 }}><div style={{ width: 22, height: 22, borderRadius: "50%", background: "#c7d2fe", flexShrink: 0 }} /><div style={{ flex: 1 }}><div style={{ color: "#f59e0b", fontSize: 9, letterSpacing: 1 }}>★★★★★</div><div style={{ height: 4, width: "80%", background: "#e2e8f0", borderRadius: 2, marginTop: 3 }} /></div></div>;
  if (name.includes("Garmin")) return <div style={{ ...base, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>{["#22c55e", "#3b82f6", "#ef4444"].map((c, i) => <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", border: `4px solid ${c}`, borderRightColor: "#e2e8f0" }} />)}</div>;
  if (name.includes("Netflix")) return <div style={{ ...base, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3 }}>{["#ef4444", "#f59e0b", "#8b5cf6", "#3b82f6", "#ec4899", "#10b981", "#6366f1", "#f43f5e"].map((c, i) => <div key={i} style={{ borderRadius: 3, background: c }} />)}</div>;
  if (name.includes("MyChart")) return <div style={base}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ width: "40%", height: 5, background: "#0ea5e9", borderRadius: 2 }} /><div style={{ fontSize: 11, fontWeight: 800, color: "#0ea5e9" }}>98%</div></div>{[0, 1].map(i => <div key={i} style={{ height: 5, borderRadius: 2, background: "#e2e8f0" }} />)}</div>;
  return <div style={{ ...base, alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 18 }}>🖼️</div>;
}

// Visual lead for each step — we dogfood our own rule: open with a PICTURE,
// not a form. Swiss, not Disney: a restrained white card + hairline border, a
// custom monoline SVG mark in a muted step accent, one quiet line of "what &
// why." (Swap the SVG for fine illustration later without touching callers.)
const STEP_META = {
  define:     { fg: "#4f46e5", title: "What it does — and why anyone should care" },
  design:     { fg: "#7c3aed", title: "The picture your worker opens to" },
  knowledge:  { fg: "#0e7490", title: "Your worker's brain — everything it knows" },
  rules:      { fg: "#b45309", title: "The laws it follows + the guardrails it lives by" },
  tools:      { fg: "#2563eb", title: "Give it abilities — data, maps, images, and more" },
  test:       { fg: "#be123c", title: "Stress-test it before your subscribers do" },
  preflight:  { fg: "#15803d", title: "Clear the gates — you're almost ready to launch" },
  distribute: { fg: "#0891b2", title: "Get it out there — link, QR, post, email" },
  grow:       { fg: "#4f46e5", title: "Launch & grow — your subscribers and revenue" },
};

function StepIcon({ kind, color }) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  const svg = (children) => <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
  switch (kind) {
    case "define": return svg(<><circle cx="12" cy="12" r="8.5" {...p} /><circle cx="12" cy="12" r="4" {...p} /><circle cx="12" cy="12" r="1.1" fill={color} stroke="none" /></>);
    case "design": return svg(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" {...p} /><line x1="3.5" y1="9" x2="20.5" y2="9" {...p} /><rect x="6" y="11.5" width="6" height="5.5" rx="1" {...p} /><line x1="14" y1="12.5" x2="18" y2="12.5" {...p} /><line x1="14" y1="15.5" x2="18" y2="15.5" {...p} /></>);
    case "knowledge": return svg(<><path d="M12 6.4c-1.3-1.5-3.8-1.2-4.6.6-1.6.2-2.4 2.1-1.3 3.4-.9 1.2-.2 3 1.4 3.2.3 1.6 2.3 2.3 3.5 1.1" {...p} /><path d="M12 6.4c1.3-1.5 3.8-1.2 4.6.6 1.6.2 2.4 2.1 1.3 3.4.9 1.2.2 3-1.4 3.2-.3 1.6-2.3 2.3-3.5 1.1" {...p} /><line x1="12" y1="6.4" x2="12" y2="16.5" {...p} /></>);
    case "rules": return svg(<><line x1="12" y1="4.5" x2="12" y2="19" {...p} /><line x1="6.5" y1="7" x2="17.5" y2="7" {...p} /><path d="M6.5 7l-2.3 4.6h4.6z" {...p} /><path d="M17.5 7l-2.3 4.6h4.6z" {...p} /><line x1="8.5" y1="19" x2="15.5" y2="19" {...p} /></>);
    case "tools": return svg(<><path d="M14.6 6.6a3.4 3.4 0 0 0-4.6 4.2l-4.5 4.5a1.5 1.5 0 0 0 2.1 2.1l4.5-4.5a3.4 3.4 0 0 0 4.2-4.6l-2 2-1.7-1.7z" {...p} /></>);
    case "test": return svg(<><path d="M12 4l6 2v5c0 3.9-2.5 6.5-6 7.9-3.5-1.4-6-4-6-7.9V6z" {...p} /><path d="M9.5 12l1.8 1.8 3.3-3.5" {...p} /></>);
    case "preflight": return svg(<><circle cx="12" cy="12" r="8" {...p} /><path d="M8.5 12.2l2.3 2.3 4.7-4.9" {...p} /></>);
    case "distribute": return svg(<><path d="M20 4L3.6 11l6 2 2 6z" {...p} /><line x1="20" y1="4" x2="9.6" y2="13" {...p} /></>);
    case "grow": return svg(<><polyline points="4,17 9,12 13,14 20,6" {...p} /><polyline points="15,6 20,6 20,11" {...p} /></>);
    default: return null;
  }
}

function StepHero({ kind }) {
  const m = STEP_META[kind];
  const [imgOk, setImgOk] = useState(true);
  if (!m) return null;
  return (
    <div style={{ display: "flex", alignItems: "stretch", minHeight: 104, borderRadius: 14, marginBottom: 16, background: "#FFFFFF", border: "1px solid #E8ECF2", overflow: "hidden" }}>
      <div style={{ width: 150, flexShrink: 0, background: "#F4F6FA", borderRight: "1px solid #EEF1F6", display: "grid", placeItems: "center" }}>
        {imgOk
          ? <img src={`/hero/${kind}.png?v=3`} alt="" onError={() => setImgOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <StepIcon kind={kind} color={m.fg} />}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "16px 20px" }}>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.35 }}>{m.title}</div>
      </div>
    </div>
  );
}

export function DesignCanvas({ session, workerId, onComplete }) {
  const initial = session?.workerSteps?.design?.data || {};
  const spec = session?.spec || {};
  const [uxType, setUxType] = useState(initial.uxType || null);
  const [headline, setHeadline] = useState(initial.headlineOutcome || "");
  const [tabs, setTabs] = useState(
    Array.isArray(initial.tabs) && initial.tabs.length ? initial.tabs : [{ name: "", job: "" }]
  );
  const [visualFloor, setVisualFloor] = useState(initial.visualFloor || "");
  const [rationale, setRationale] = useState(initial.rationale || "");
  const [mockupUrl, setMockupUrl] = useState(initial.mockupUrl || "");
  const [mockupSource, setMockupSource] = useState(initial.mockupSource || "");
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState(null);
  const mockRef = useRef(null);
  // Logo / app-store icon — the worker's visual identity.
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl || "");
  const [logoSource, setLogoSource] = useState(initial.logoSource || "");
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErr, setLogoErr] = useState(null);
  const logoRef = useRef(null);

  function updateTab(i, key, val) { setTabs(prev => prev.map((t, idx) => idx === i ? { ...t, [key]: val } : t)); }
  function addTab() { if (tabs.length < 5) setTabs([...tabs, { name: "", job: "" }]); }
  function removeTab(i) { setTabs(tabs.filter((_, idx) => idx !== i)); }

  // Build a Trump-Rule-floor image prompt from the creator's OWN answers.
  function buildMockupPrompt() {
    const uxLabel = (UX_TYPES.find(u => u.id === uxType) || {}).label || "dashboard";
    const tabNames = tabs.map(t => t.name).filter(Boolean).join(", ");
    return [
      `Clean modern ${uxLabel} app screen, UI mockup for "${spec.name || "a digital worker"}".`,
      headline ? `Default view shows one headline: ${headline}.` : "",
      tabNames ? `Tabs: ${tabNames}.` : "",
      visualFloor ? `As polished as ${visualFloor}.` : "",
      "Flat design, high information density, legible labels, professional.",
    ].filter(Boolean).join(" ").slice(0, 500);
  }

  async function generateMockup() {
    setGenBusy(true); setGenErr(null);
    const r = await generateWorkerImage({ workerId, prompt: buildMockupPrompt(), style: "minimal", size: "landscape_4_3" });
    setGenBusy(false);
    if (!r.ok) { setGenErr(r.error || "Generation failed — you can upload a mockup instead."); return; }
    const u = r.imageUrl || r.url;
    if (!u) { setGenErr("No image returned — try again or upload a mockup."); return; }
    setMockupUrl(u); setMockupSource("generated");
  }

  async function handleMockUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGenBusy(true); setGenErr(null);
    const r = await uploadFile(file);
    setGenBusy(false);
    if (mockRef.current) mockRef.current.value = "";
    if (!r.ok) { setGenErr(r.error || "Upload failed"); return; }
    const u = r.url || r.fileUrl || r.downloadUrl;
    if (!u) { setGenErr("Upload returned no URL"); return; }
    setMockupUrl(u); setMockupSource("uploaded");
  }

  function buildLogoPrompt() {
    return [
      `App store icon logo for "${spec.name || "a digital worker"}"`,
      spec.category ? `, ${spec.category}.` : ".",
      "Single bold memorable symbol, flat vector, centered, solid background, no text, no words.",
    ].join("").slice(0, 500);
  }

  async function generateLogo() {
    setLogoBusy(true); setLogoErr(null);
    const r = await generateWorkerImage({ workerId, prompt: buildLogoPrompt(), style: "minimal", size: "square" });
    setLogoBusy(false);
    if (!r.ok) { setLogoErr(r.error || "Generation failed — you can upload a logo instead."); return; }
    const u = r.imageUrl || r.url;
    if (!u) { setLogoErr("No image returned — try again or upload a logo."); return; }
    setLogoUrl(u); setLogoSource("generated");
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true); setLogoErr(null);
    const r = await uploadFile(file);
    setLogoBusy(false);
    if (logoRef.current) logoRef.current.value = "";
    if (!r.ok) { setLogoErr(r.error || "Upload failed"); return; }
    const u = r.url || r.fileUrl || r.downloadUrl;
    if (!u) { setLogoErr("Upload returned no URL"); return; }
    setLogoUrl(u); setLogoSource("uploaded");
  }

  const ready = uxType && headline.trim() && tabs.some(t => t.name.trim());

  return (
    <CanvasShell
      title="Design the canvas"
      subtitle="People don't read — your worker opens to a picture. Design that picture now, before you build. Everything downstream renders into it."
    >
      <StepHero kind="design" />
      {/* (a) Headline outcome */}
      <div style={card}>
        <div style={label}>The headline outcome</div>
        <div style={sub}>When a subscriber opens this, the ONE thing they must see — one number, one verdict, or one visual.</div>
        <input style={{ ...input, marginBottom: 0 }} value={headline} onChange={e => setHeadline(e.target.value)} placeholder='e.g. "22 of 36 CE hrs · 12 of 18 LIVE · renew in 47 days"' />
      </div>

      {/* (b) Tabs — one cognitive job each */}
      <div style={card}>
        <div style={label}>Tabs — one cognitive job each (2–4 is ideal)</div>
        <div style={sub}>The first tab is the default view (the headline above). Every other tab does exactly one job.</div>
        {tabs.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <div style={{ width: 56, fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>{i === 0 ? "Default" : `Tab ${i + 1}`}</div>
            <input style={{ ...input, marginBottom: 0, flex: "0 0 140px" }} value={t.name} onChange={e => updateTab(i, "name", e.target.value)} placeholder="Tab name" />
            <input style={{ ...input, marginBottom: 0, flex: 1 }} value={t.job} onChange={e => updateTab(i, "job", e.target.value)} placeholder="The one job this tab does" />
            {tabs.length > 1 && <button onClick={() => removeTab(i)} style={{ ...ghostBtn, padding: "6px 9px", fontSize: 13 }}>×</button>}
          </div>
        ))}
        {tabs.length < 5 && <button onClick={addTab} style={ghostBtn}>+ Add tab</button>}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>What tabs look like:</div>
          <div style={{ ..._frame, background: "#F8FAFC", padding: 6 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
              {["Readiness", "Coursework", "Record"].map((t, i) => (
                <div key={i} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 999, background: i === 0 ? PURPLE : "#fff", color: i === 0 ? "#fff" : "#64748b", border: "1px solid #e2e8f0" }}>{t}</div>
              ))}
            </div>
            <div style={{ height: 26, borderRadius: 4, background: "#eef2ff" }} />
          </div>
        </div>
      </div>

      {/* (c) Visual floor — set the bar (show the references, don't name-drop) */}
      <div style={card}>
        <div style={label}>Visual floor — set the bar</div>
        <div style={sub}>People like pictures, not words. Pick what yours should look as good as — tap one to set the bar.</div>
        <input style={input} value={visualFloor} onChange={e => setVisualFloor(e.target.value)} placeholder="as good as…" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {VISUAL_FLOORS.map(v => {
            const sel = visualFloor === v;
            return (
              <button key={v} type="button" onClick={() => setVisualFloor(v)}
                style={{ ...card, marginBottom: 0, padding: 6, cursor: "pointer", textAlign: "center", borderColor: sel ? PURPLE : "#E2E8F0", borderWidth: sel ? 2 : 1 }}>
                <FloorThumb name={v} />
                <div style={{ fontSize: 10.5, color: sel ? PURPLE : "#64748B", marginTop: 5, fontWeight: sel ? 700 : 500 }}>{v.replace(/^an? /, "")}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* The shape (UX pattern) — show each layout as a picture */}
      <div style={card}>
        <div style={label}>The shape</div>
        <div style={sub}>The overall pattern your canvas fills. Each one's a little preview — pick the look that fits.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {UX_TYPES.map(t => (
            <button key={t.id} type="button" onClick={() => setUxType(t.id)}
              style={{ ...card, marginBottom: 0, cursor: "pointer", borderColor: uxType === t.id ? PURPLE : "#E2E8F0", borderWidth: uxType === t.id ? 2 : 1, textAlign: "left" }}>
              <ShapeThumb id={t.id} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginTop: 6 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{t.primary}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Logo / app-store icon — visual identity */}
      <div style={card}>
        <div style={label}>Logo — app-store icon</div>
        <div style={sub}>The face of your worker in the marketplace. Generate one from its name + vertical, or upload your own.</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <button onClick={generateLogo} disabled={logoBusy} style={{ ...primaryBtn, opacity: logoBusy ? 0.4 : 1 }}>{logoBusy ? "Working…" : "Generate logo"}</button>
              <button onClick={() => logoRef.current?.click()} disabled={logoBusy} style={ghostBtn}>Upload a logo</button>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} style={{ display: "none" }} />
            </div>
            {logoErr && <div style={{ fontSize: 12, color: "#DC2626" }}>{logoErr}</div>}
            {logoUrl && <div style={{ fontSize: 11, color: "#94A3B8" }}>{logoSource === "generated" ? "AI-generated logo" : "Uploaded logo"}</div>}
          </div>
          <div style={{ width: 88, height: 88, flexShrink: 0, borderRadius: 18, border: "1px solid #E2E8F0", background: "#F8FAFC", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {logoUrl
              ? <img src={logoUrl} alt="Worker logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", padding: 6 }}>icon preview</span>}
          </div>
        </div>
      </div>

      {/* (d) Mockup — generate or upload */}
      <div style={card}>
        <div style={label}>The mockup</div>
        <div style={sub}>Make the picture real. Generate one from your answers above, or upload your own (Claude / Figma / a screenshot).</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <button onClick={generateMockup} disabled={genBusy || !ready} style={{ ...primaryBtn, opacity: (genBusy || !ready) ? 0.4 : 1 }}>{genBusy ? "Working…" : "Generate mockup"}</button>
          <button onClick={() => mockRef.current?.click()} disabled={genBusy} style={ghostBtn}>Upload a mockup</button>
          <input ref={mockRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleMockUpload} style={{ display: "none" }} />
        </div>
        {!ready && <div style={{ fontSize: 11, color: "#94A3B8" }}>Fill in the headline, at least one tab, and a shape to generate.</div>}
        {genErr && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>{genErr}</div>}
        {mockupUrl && (
          <div style={{ marginTop: 10 }}>
            <img src={mockupUrl} alt="Canvas mockup" style={{ width: "100%", borderRadius: 8, border: "1px solid #E2E8F0" }} />
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
              {mockupSource === "generated" ? "AI-generated mockup" : "Uploaded mockup"} · a reference for the build, not the final canvas
            </div>
          </div>
        )}
      </div>

      {/* Rationale */}
      <div style={card}>
        <div style={label}>Why this design (Build Log)</div>
        <textarea style={textarea} value={rationale} onChange={e => setRationale(e.target.value)} placeholder="One line on why this canvas fits the job" />
      </div>

      <StepComplete
        disabled={!ready}
        onClick={() => onComplete({
          stepData: {
            uxType,
            headlineOutcome: headline.trim(),
            tabs: tabs.filter(t => t.name.trim()).map(t => ({ name: t.name.trim(), job: t.job.trim() })),
            visualFloor: visualFloor.trim(),
            logoUrl: logoUrl || null,
            logoSource: logoSource || null,
            mockupUrl: mockupUrl || null,
            mockupSource: mockupSource || null,
            rationale: rationale.trim(),
          },
        })}
      />
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
      <StepHero kind="knowledge" />
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

      <StepComplete
        disabled={docCount === 0}
        onClick={() => onComplete({
          stepData: { documentCount: docCount, totalChars },
        })}
      />
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
      title="Rules — what governs your worker"
      subtitle="Layer 1 is the law of your industry. Then what your worker always does, never does, and when to escalate."
    >
      <StepHero kind="rules" />
      <div style={{ ...card, background: "#F8FAFC", borderLeft: "4px solid #CBD5E1" }}>
        <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.5 }}>🎙️ <strong>Tone is set for you.</strong> Your worker speaks in SOCIII's clear, trusted default voice — you don't configure it here. (Letting each worker redefine its own tone is what sends the chat off the rails.)</div>
      </div>

      {RAAS_TIERS.map(t => (
        <div key={t.id} style={{ ...card, borderLeft: `4px solid ${t.color}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{t.label}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>{t.description}</div>
          <textarea
            style={textarea}
            value={tiers[t.id]}
            onChange={e => update(t.id, e.target.value)}
            placeholder={t.id === "tier0" ? "One law, license, or regulation per line — e.g. \"HI real estate license (HRS §467)\"" : "One rule per line"}
          />
        </div>
      ))}

      <div style={card}>
        <div style={label}>Your SOP — how you personally do it</div>
        <div style={sub}>The judgment and practices that make you the expert — what you'd add on top of the regulations above. This is your standard operating procedure.</div>
        <textarea style={textarea} value={reasoning} onChange={e => setReasoning(e.target.value)} placeholder='e.g. "I re-check pediatric dosage math twice; I never sign off a chart without the preceptor present."' />
      </div>

      <StepComplete
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
      />
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
      title="Tools — what your worker can do"
      subtitle="Beyond chat: does it need to pull data or take action? Tell us the capability — you don't need to know the brand."
    >
      <StepHero kind="tools" />
      <div style={card}>
        <div style={label}>Need any abilities?</div>
        <div style={sub}>Tap what your worker should be able to do — we wire the right provider behind it. Pick what fits, or describe your own.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
          {["Live maps", "Property data", "Make images", "Make videos", "Send email", "Send texts", "Take payments", "Scheduling", "Web search"].map(cap => (
            <button key={cap} type="button" onClick={() => setNewTool(cap)}
              style={{ ...ghostBtn, padding: "5px 10px", fontSize: 12, borderColor: newTool === cap ? PURPLE : "#CBD5E1", background: newTool === cap ? "#F3F0FF" : "#FFFFFF" }}>{cap}</button>
          ))}
        </div>
        <input style={input} value={newTool} onChange={e => setNewTool(e.target.value)} placeholder="Or describe an ability — e.g. pull flood-zone data, generate a PDF" />
        <input style={input} value={enables} onChange={e => setEnables(e.target.value)} placeholder="What would it let your worker do? (optional)" />
        <button style={ghostBtn} onClick={add}>Add ability</button>
      </div>

      <div style={card}>
        <div style={label}>Abilities added · {tools.length}</div>
        {tools.length === 0 && <div style={{ ...sub, marginTop: 8 }}>No extra abilities yet — plenty of workers ship on knowledge alone.</div>}
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

      <StepComplete
        prompt="Tools are optional — done here?"
        onClick={() => onComplete({ stepData: { connectedTools: tools } })}
      />
    </CanvasShell>
  );
}

// ─── Step 6 — Test (real red team) ──────────────────────────────────────────

// ─── S52.50 (#33) — LIVE worker preview ──────────────────────────────────────
// Renders the creator's ACTUAL worker from their in-progress build, via the
// same data-driven RealEstateWorkerCanvas an end-user sees. Closes Sean's gap:
// "the worker itself never renders in any of the sandbox elements." The tab
// structure + headline are the creator's; block data is placeholder until the
// worker pulls live data.
function buildPreviewSpec(session) {
  const spec = (session && (session.spec || session)) || {};
  const design = (session && session.design) || spec || {};
  const name = spec.name || design.name || "Your Worker";
  const vertical = spec.category || spec.vertical || "";
  const headline = design.headlineOutcome || spec.headlineOutcome || "";
  const tabsIn = (design.tabs || spec.tabs || []).filter((t) => t && t.name && String(t.name).trim());
  const tabs = (tabsIn.length ? tabsIn : [{ name: "Overview", job: "the default view" }]).map((t, i) => {
    const blocks = [];
    if (i === 0 && headline) {
      blocks.push({ type: "heroes", items: [{ band: "GREEN", title: headline, detail: "The one outcome users see first" }] });
    }
    blocks.push({ type: "prose", items: [{ band: "BLUE", title: String(t.name).trim(), body: (t.job && String(t.job).trim() ? String(t.job).trim() : "This tab does one job.") + " — live data renders here once your worker runs." }] });
    return { id: "t" + i, label: String(t.name).trim(), blocks };
  });
  return {
    title: name,
    subtitle: vertical ? "Preview · " + vertical : "Preview",
    disclaimer: "Live preview of YOUR worker — the shape users will see. Data fills in once connected.",
    cas: { RED: 0, YELLOW: 0, BLUE: tabs.length, WHITE: 0, GREEN: headline ? 1 : 0 },
    tabs,
  };
}

export function WorkerPreview({ session }) {
  const spec = buildPreviewSpec(session);
  if (!spec.tabs.length) return null;
  return (
    <div style={{ ...card, padding: 12, marginBottom: 12, background: "#FCFCFD" }}>
      <div style={{ ...label, marginBottom: 8, color: PURPLE }}>▸ Live preview — this is your worker</div>
      <RealEstateWorkerCanvas worker={{ slug: "__preview__", workerId: "__preview__", canvasSpec: spec }} />
    </div>
  );
}

export function TestCanvas({ session, sessionId, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [classifications, setClassifications] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastSummary, setLastSummary] = useState(null);
  const [lastRun, setLastRun] = useState(null);

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
    setLastSummary(summary);
    setLastRun(r.run || null);
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
      <StepHero kind="test" />
      <WorkerPreview session={session} />
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

      {/* If the red team flagged issues, you're not stuck — refine + re-run, or
          proceed and resolve before launch (so a failing test isn't a dead-end). */}
      {(() => {
        if (!submitted || !lastSummary) return null;
        const fails = (lastSummary.flagged || 0) + (lastSummary.escalated || 0) + (lastSummary.failed || 0);
        if (fails === 0) return null;
        const parts = [
          lastSummary.failed ? `${lastSummary.failed} failed` : null,
          lastSummary.escalated ? `${lastSummary.escalated} escalated` : null,
          lastSummary.flagged ? `${lastSummary.flagged} flagged` : null,
        ].filter(Boolean).join(", ");
        return (
          <StepComplete
            prompt={`Red team flagged ${parts}. Tighten your Rules / Knowledge and re-run, or proceed and resolve before launch.`}
            label="Proceed anyway"
            onClick={() => onComplete({ stepData: { lastSummary, runs: lastRun ? [lastRun] : [], proceededWithFailures: true } })}
          />
        );
      })()}
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

const VISIBILITY_OPTIONS = [
  { id: "public", label: "Public", desc: "Listed in the marketplace — anyone can find and subscribe." },
  { id: "unlisted", label: "Unlisted", desc: "Hidden from the marketplace. Only people with the link can reach it." },
  { id: "organization", label: "Organization-only", desc: "Confidential. Only members of your organization can use it — for internal SOPs and private data." },
];

export function PreflightCanvas({ session, onComplete }) {
  const [checked, setChecked] = useState(new Set());
  const [visibility, setVisibility] = useState("public");
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
      <StepHero kind="preflight" />
      <WorkerPreview session={session} />
      <div style={card}>
        {PREFLIGHT_GATES.map((g, i) => (
          <label key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < PREFLIGHT_GATES.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}>
            <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
            <span style={{ fontSize: 14, color: "#1a1a2e" }}>{g}</span>
          </label>
        ))}
      </div>

      {/* Visibility — who can find and use this worker */}
      <div style={card}>
        <div style={label}>Visibility — who can find and use this worker</div>
        <div style={sub}>Many workers are built for confidential use inside one organization. Choose how this one is shared.</div>
        {VISIBILITY_OPTIONS.map(o => (
          <label key={o.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #F1F5F9", cursor: "pointer", alignItems: "flex-start" }}>
            <input type="radio" name="visibility" checked={visibility === o.id} onChange={() => setVisibility(o.id)} style={{ marginTop: 3 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{o.label}</div>
              <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 1 }}>{o.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <StepComplete
        disabled={!all}
        onClick={() => onComplete({ stepData: { gatesPassed: PREFLIGHT_GATES.length, visibility, internal_only: visibility !== "public" } })}
      />
    </CanvasShell>
  );
}

// ─── Step 8 — Distribute ────────────────────────────────────────────────────

export function DistributeCanvas({ session, onComplete }) {
  const spec = session?.spec || {};
  const slug = (spec.name || "your-worker").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url = `https://app.sociii.ai/preview/${slug}`;
  const [deck, setDeck] = useState([]);
  const [deckBusy, setDeckBusy] = useState(false);
  const [deckErr, setDeckErr] = useState(null);

  async function generateDeck() {
    setDeckBusy(true); setDeckErr(null);
    const r = await generateWorkerDeck(spec);
    setDeckBusy(false);
    if (!r.ok) { setDeckErr(r.error || "Couldn't generate the deck — try again."); return; }
    if (!r.slides || !r.slides.length) { setDeckErr("No slides came back — try again."); return; }
    setDeck(r.slides);
  }

  const name = spec.name || "my Digital Worker";
  const job = spec.problemSolves || "";
  const audience = spec.targetAudience || "";
  const creator = spec.creatorName || "me";

  // Real, copy-able share kit generated from the worker's own spec.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  const social = `I built a Digital Worker: ${name}.${job ? ` It ${job.charAt(0).toLowerCase() + job.slice(1)}.` : ""}${audience ? ` If you're ${audience}, this is for you.` : ""}\n\nTry it 👇\n${url}`;
  const emailSubject = `Introducing ${name}`;
  const emailBody = `Hi —\n\nI built something I think you'll find useful: ${name}, a Digital Worker that ${job ? job.charAt(0).toLowerCase() + job.slice(1) : "helps with " + (spec.category || "your work")}.\n\n${audience ? `If you're ${audience}, ` : ""}you can try it here:\n${url}\n\n— ${creator}`;
  const embed = `<iframe src="${url}" width="420" height="640" style="border:1px solid #e2e8f0;border-radius:12px"></iframe>`;

  const fieldRow = { display: "flex", gap: 8, alignItems: "flex-start" };

  return (
    <CanvasShell
      title="Distribute"
      subtitle="Your worker is live. Here's a ready-to-use share kit — built from your worker, copy and go."
    >
      <StepHero kind="distribute" />
      <div style={card}>
        <div style={label}>Share link</div>
        <div style={fieldRow}>
          <input style={{ ...input, marginBottom: 0 }} readOnly value={url} />
          <CopyButton text={url} />
        </div>
      </div>

      <div style={card}>
        <div style={label}>QR code</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={qrSrc} alt="QR code to your worker" width={120} height={120} style={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
          <div style={{ fontSize: 12, color: "#64748B" }}>Drop this on a slide, a flyer, or a business card. It points straight to your worker.</div>
        </div>
      </div>

      <div style={card}>
        <div style={label}>Social post</div>
        <textarea style={{ ...textarea, minHeight: 92 }} readOnly value={social} />
        <CopyButton text={social} label="Copy post" />
      </div>

      <div style={card}>
        <div style={label}>Email</div>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Subject: {emailSubject}</div>
        <textarea style={{ ...textarea, minHeight: 120 }} readOnly value={emailBody} />
        <div style={{ display: "flex", gap: 8 }}>
          <CopyButton text={emailSubject} label="Copy subject" />
          <CopyButton text={emailBody} label="Copy body" />
        </div>
      </div>

      <div style={card}>
        <div style={label}>Embed on your site</div>
        <textarea style={{ ...textarea, minHeight: 60, fontFamily: "monospace", fontSize: 12 }} readOnly value={embed} />
        <CopyButton text={embed} label="Copy embed" />
      </div>

      {/* Pitch deck — explains what it is, what it does, and why a subscriber should care */}
      <div style={card}>
        <div style={label}>Pitch deck</div>
        <div style={sub}>A 10-slide deck that explains your worker to anyone — what it is, what it does, and why they should care. Generated from your worker, downloadable to present.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={generateDeck} disabled={deckBusy} style={{ ...primaryBtn, opacity: deckBusy ? 0.4 : 1 }}>{deckBusy ? "Writing…" : (deck.length ? "Regenerate deck" : "Generate 10-slide deck")}</button>
          {deck.length > 0 && (
            <button onClick={() => downloadBlob(`${slug}-pitch-deck.html`, buildDeckHtml(deck, spec))} style={ghostBtn}>Download deck</button>
          )}
        </div>
        {deckErr && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 6 }}>{deckErr}</div>}
        {deck.length > 0 && (
          <ol style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 13, color: "#1a1a2e", lineHeight: 1.7 }}>
            {deck.map((s, i) => (
              <li key={i}><span style={{ fontWeight: 600 }}>{s.title}</span>{s.subtitle ? <span style={{ color: "#64748B" }}> — {s.subtitle}</span> : null}</li>
            ))}
          </ol>
        )}
      </div>

      <StepComplete
        prompt="Shared it / grabbed your kit? Mark this step done."
        onClick={() => onComplete({ stepData: { launchedAt: new Date().toISOString(), shareUrl: url, deckSlides: deck.length } })}
      />
    </CanvasShell>
  );
}

// ─── Step 9 — Grow & Revise ─────────────────────────────────────────────────

const LAUNCH_CHECKLIST = [
  "Tell 10 people you trust — not 10,000 strangers, 10 who already believe in your expertise.",
  "Post it once to your network (LinkedIn / X) with the social copy from Distribute.",
  "Email your list with the template from Distribute.",
  "Ask 3 early users for honest feedback in week one.",
  "Set yourself a reminder to revise it in 30 days based on what you learned.",
];

export function GrowCanvas({ onComplete }) {
  const [checked, setChecked] = useState(new Set());
  function toggle(i) {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i); else next.add(i);
    setChecked(next);
  }
  const done = checked.size;

  return (
    <CanvasShell
      title="Grow & Update"
      subtitle="Your network trusts you more than any ad we could run. This is your launch — start here."
    >
      <StepHero kind="grow" />
      <div style={card}>
        <div style={label}>Launch checklist · {done} of {LAUNCH_CHECKLIST.length}</div>
        {LAUNCH_CHECKLIST.map((item, i) => (
          <label key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < LAUNCH_CHECKLIST.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", alignItems: "flex-start" }}>
            <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13, color: "#1a1a2e", lineHeight: 1.5, textDecoration: checked.has(i) ? "line-through" : "none", opacity: checked.has(i) ? 0.55 : 1 }}>{item}</span>
          </label>
        ))}
      </div>

      <div style={{ ...card, background: "#F8FAFC" }}>
        <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>
          Your real subscriber count and earnings live on your <strong>Creator Dashboard</strong> once the worker is published —
          they update as people use it. This step is about getting those first people in the door.
        </div>
      </div>

      <StepComplete
        prompt="Started your launch? Mark this step done."
        onClick={() => onComplete({ stepData: { launchChecklistDone: done, launchChecklistTotal: LAUNCH_CHECKLIST.length } })}
      />
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
