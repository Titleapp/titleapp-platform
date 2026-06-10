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

  function ready() { return name && vertical && audience && job; }

  return (
    <CanvasShell
      title="Define your worker"
      subtitle="What does it do, who uses it, what job does it perform — and who are you?"
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

      <button
        style={{ ...primaryBtn, opacity: ready() ? 1 : 0.4 }}
        disabled={!ready()}
        onClick={() => onComplete({
          spec: {
            name, category: vertical, targetAudience: audience, problemSolves: job,
            creatorName: creatorName.trim(), creatorBio: creatorBio.trim(),
            creatorLinkedin: linkedinUrl.trim(), creatorHeadshotUrl: headshotUrl || null,
          },
        })}
      >
        Define complete
      </button>

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
// People don't read (Trump Rule). The worker opens to a PICTURE. Design that
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
      </div>

      {/* (c) Visual floor — the Trump Rule */}
      <div style={card}>
        <div style={label}>Visual floor — the Trump Rule</div>
        <div style={sub}>"This should look as good as ___." Set the bar before you build to it.</div>
        <input style={input} value={visualFloor} onChange={e => setVisualFloor(e.target.value)} placeholder="as good as…" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {VISUAL_FLOORS.map(v => (
            <button key={v} type="button" onClick={() => setVisualFloor(v)}
              style={{ ...ghostBtn, padding: "4px 8px", fontSize: 11, borderColor: visualFloor === v ? PURPLE : "#CBD5E1", background: visualFloor === v ? "#F3F0FF" : "#FFFFFF" }}>{v}</button>
          ))}
        </div>
      </div>

      {/* The shape (UX pattern) */}
      <div style={card}>
        <div style={label}>The shape</div>
        <div style={sub}>The overall pattern your canvas fills.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {UX_TYPES.map(t => (
            <button key={t.id} type="button" onClick={() => setUxType(t.id)}
              style={{ ...card, marginBottom: 0, cursor: "pointer", borderColor: uxType === t.id ? PURPLE : "#E2E8F0", borderWidth: uxType === t.id ? 2 : 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{t.label}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{t.primary}</div>
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

      <button
        style={{ ...primaryBtn, opacity: ready ? 1 : 0.4 }}
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
      >
        Canvas designed
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

      <button style={primaryBtn} onClick={() => onComplete({ stepData: { launchedAt: new Date().toISOString(), shareUrl: url, deckSlides: deck.length } })}>
        First share complete
      </button>
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

      <button
        style={primaryBtn}
        onClick={() => onComplete({ stepData: { launchChecklistDone: done, launchChecklistTotal: LAUNCH_CHECKLIST.length } })}
      >
        I've started my launch
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
