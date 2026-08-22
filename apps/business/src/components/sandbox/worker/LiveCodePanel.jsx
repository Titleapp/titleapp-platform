import React, { useEffect, useRef, useState } from "react";

// LiveCodePanel — the "woo, I'm building this" view. As the creator talks to
// Alex, the worker spec the conversation produces is rendered here AS CODE,
// live — the real 7-file SOCIII SDK worker template (worker-spec.json,
// intent.md, rules.md, canvas-tabs.json, service.js, sample-data.js,
// tests/assertions.md — see github.com/SOCIII-Inc/sociii-sdk's template/
// folder and /docs/worker-anatomy) — so they watch their worker write
// itself. It reads the same session state the form fills from (no terminal
// yet — this surfaces the real artifacts we already derive). Two of the
// seven files (service.js, sample-data.js) need real endpoint/logic detail
// the guided flow doesn't collect, so those render as clearly-labeled
// scaffolds for the creator's terminal Claude Code session to fill in.

const TOK = { key: "#c4b5fd", str: "#86efac", com: "#64748b", text: "#e2e8f0" };

function toLines(v) {
  if (Array.isArray(v)) return v.filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === "string") return v.split("\n").map((s) => s.trim()).filter(Boolean);
  return [];
}

function slugify(v, fallback) {
  const s = String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return s || fallback;
}

const PRICING_MONTHLY = { 0: 0, 1: 29, 2: 49, 3: 79 };

function buildFiles(session) {
  const spec = (session && session.spec) || {};
  const steps = (session && session.workerSteps) || {};
  const design = (steps.design && steps.design.data) || {};
  const rules = (steps.rules && steps.rules.data) || {};
  const tools = (steps.tools && steps.tools.data) || {};
  const test = (steps.test && steps.test.data) || {};
  const tabsIn = (Array.isArray(design.tabs) ? design.tabs : []).filter((t) => t && (t.label || t.name));

  const ph = (v, hint) => (v && String(v).trim() ? String(v).trim() : `// ${hint}`);
  const slug = slugify(spec.slug || spec.name, "your-worker");
  const tabIds = tabsIn.map((t, i) => slugify(t.id || t.label || t.name, `tab-${i + 1}`));

  // ── 1. worker-spec.json — the marketplace listing SOCIII reads to register the worker ──
  const canvasTabsForSpec = tabsIn.length
    ? tabsIn.map((t, i) => ({
        id: tabIds[i],
        label: t.label || t.name || `Tab ${i + 1}`,
        signal: "card:work-product",
        default: i === 0,
        order: i,
      }))
    : [{ id: "main", label: "TODO — design your canvas tabs in the Design step", signal: "card:work-product", default: true, order: 0 }];
  const workerSpecJson = JSON.stringify({
    "$schema": "https://sociii.ai/sdk/schema/1.0.0",
    "sociii-sdk-version": "1.0.0",
    id: (slug.toUpperCase().replace(/-/g, "_").slice(0, 20) || "WORKER") + "-001",
    name: spec.name || "Untitled Worker",
    ...(design.personaName ? { persona_name: design.personaName } : {}),
    slug,
    type: "standalone",
    status: "waitlist",
    description: spec.description || spec.problemSolves || "TODO — what your worker does, in one sentence",
    vertical: spec.category || spec.vertical || "TODO — your worker's vertical",
    phase: 0,
    pricing: { monthly: PRICING_MONTHLY[spec.pricingTier] ?? 29 },
    tags: [],
    capabilitySummary: spec.problemSolves || "TODO — 1-2 sentence capability summary",
    canvasTabs: canvasTabsForSpec,
    alexRegistration: { priority: "normal", acceptsTasks: true, briefingContribution: `${slug.replace(/-/g, "_")}_status` },
    temporalType: "always_on",
    vault_reads: [],
    vault_writes: [],
  }, null, 2);

  // ── 2. intent.md — the formal spec in plain language ──
  const intent = [
    `# Worker: ${slug}`,
    ``,
    `**Status:** Draft`,
    ``,
    `## What it does`,
    ph(design.headlineOutcome, "the one outcome — coming from your chat…"),
    ``,
    `## Who uses it`,
    ph(spec.targetAudience, "who uses this…"),
    ``,
    `## What success looks like`,
    "// the sandbox doesn't collect this yet — write 2-3 concrete, checkable outcomes here",
    ``,
    `## What this worker is NOT`,
    "// what it explicitly refuses to do — not collected yet, but your rules below (Rules step) are a starting point",
    ``,
    `## The problem it kills`,
    ph(spec.problemSolves, "the problem…"),
  ].join("\n");

  // ── 3. rules.md — identity, scope, evidence standard, tone, disclaimers ──
  // (the real SDK template uses .md here, not .yaml)
  const tier0 = toLines(rules.tier0);
  const tier1 = toLines(rules.tier1);
  const tier2 = toLines(rules.tier2);
  const tier3 = toLines(rules.tier3);
  const bullets = (arr, hint) => (arr.length ? arr.map((r) => `- ${r}`).join("\n") : `- // ${hint}`);
  const rulesMd = [
    `## Identity`,
    `You are ${design.personaName || ph(null, "your worker's name")}, a Digital Worker built on the SOCIII platform.`,
    `Your specialty: ${ph(spec.problemSolves, "what you specialize in…")}`,
    ``,
    `## Scope`,
    `You ONLY help with:`,
    bullets(tier1, "list what this worker is allowed to do (from your ALWAYS rules)"),
    ``,
    `You NEVER:`,
    bullets(tier2, "list what this worker must never do (from your NEVER rules)"),
    ``,
    `## Style (LAWS — never break)`,
    bullets(tier0, "tone/voice invariants"),
    ``,
    `## Escalate to a human`,
    bullets(tier3, "conditions where this worker must hand off to a person"),
    ``,
    `## Evidence Standard`,
    "// not collected yet — state what every claim/output must trace back to (user-provided data, a connected document, etc.)",
    ``,
    `## Disclaimer (required)`,
    `> "// the required disclaimer shown to every user of this worker"`,
  ].join("\n");

  // ── 4. canvas-tabs.json — what renders in the right panel ──
  const tabsJson = tabsIn.length
    ? JSON.stringify({
        workerSlug: slug,
        version: "0.1.0",
        canvasTabs: tabsIn.map((t, i) => ({
          id: tabIds[i],
          label: t.label || t.name || `Tab ${i + 1}`,
          signal: "card:work-product",
          order: i,
          default: i === 0,
          view: "operator",
        })),
      }, null, 2)
    : "// your tabs appear here as you design the canvas…";

  // ── 5. service.js — SCAFFOLD. The sandbox never collects real endpoint/logic ──
  // detail (that's discovered in the terminal build), so this renders as a
  // clearly-labeled starting point, not a finished file.
  const connectedTools = Array.isArray(tools.connectedTools) ? tools.connectedTools : [];
  const capabilityLines = connectedTools.length
    ? connectedTools.map((t) => `  // "${typeof t === "string" ? t : (t.name || "capability")}",`).join("\n")
    : `  // e.g. "notify.email_user_v1" — leave empty if you don't need one`;
  const proposeFnName = "propose" + slug.split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  const serviceJs = [
    `// SCAFFOLD — the sandbox doesn't collect endpoint/logic detail, so this is a`,
    `// starting point, not a finished file. Fill in real functions with Claude`,
    `// Code in your terminal session, using intent.md above as the spec.`,
    ``,
    `export const SERVICE_ID = "${slug}";`,
    ``,
    `// Capabilities this worker needs for real-world side effects (email, payment,`,
    `// chain anchor, etc.). Leave empty if this worker only reads/proposes data.`,
    `export const REQUIRED_CAPABILITIES = [`,
    capabilityLines,
    `];`,
    ``,
    `// TODO — replace with your worker's real function(s), one per action a user`,
    `// can take. Functions are PURE: validate input, return an event proposal —`,
    `// the platform's rules engine validates and commits it, you never mutate`,
    `// state directly.`,
    `export function ${proposeFnName}(input) {`,
    `  if (!input) return { error: "input is required" };`,
    `  return {`,
    `    type: "${slug.replace(/-/g, "_")}.actionProposed",`,
    `    payload: { ...input, proposed_at_iso: new Date().toISOString() },`,
    `    requires: ["operator_role", "active_subscription"],`,
    `  };`,
    `}`,
  ].join("\n");

  // ── 6. sample-data.js — SCAFFOLD fixtures, one per canvas tab id ──
  const sampleEntries = (tabIds.length ? tabIds : ["main"]).map((id, i) => {
    const label = (tabsIn[i] && (tabsIn[i].label || tabsIn[i].name)) || "Main";
    return `  "${id}": {\n    title: "${label} — sample",\n    subtitle: "Sample data · replace with a realistic fixture",\n    // TODO — same field names/shape your real service.js will return\n  },`;
  }).join("\n");
  const sampleDataJs = [
    `// SCAFFOLD — one entry per canvas tab id above, so first-time users see`,
    `// something real instead of an empty state. Fill in with Claude Code.`,
    ``,
    `export const SAMPLE_CANVAS_PAYLOADS = {`,
    sampleEntries,
    `};`,
  ].join("\n");

  // ── 7. tests/assertions.md — SCAFFOLD, seeded from Test-step data when present ──
  const issuesFound = Array.isArray(test.issuesFound) ? test.issuesFound : [];
  const questionsAsked = Array.isArray(test.questionsAsked) ? test.questionsAsked : [];
  const tabSections = (tabsIn.length ? tabsIn : [{ label: "Main" }])
    .map((t) => `### ${t.label || t.name}\n\n- TC-###: First-visit user sees the sample fixture, not an empty state\n- TC-###: // add an assertion specific to this tab`)
    .join("\n\n");
  const assertionsMd = [
    `# QA-001 Assertions — \`${slug}\``,
    ``,
    `Aim for at least 5. Better workers have 10-15.`,
    ``,
    tabSections,
    ``,
    `### Negative tests`,
    ``,
    `- TC-###: A non-operator user cannot take this worker's primary action`,
    ...(issuesFound.length ? issuesFound.map((i) => `- TC-###: regression check — ${i.title || "issue"} (${i.resolution || "resolved"})`) : []),
    ...(questionsAsked.length ? [``, `### From your Test-step red-teaming`, ``, ...questionsAsked.map((q) => `- TC-###: // turn "${q}" into a pass/fail assertion`)] : []),
  ].join("\n");

  return [
    { name: "worker-spec.json", body: workerSpecJson },
    { name: "intent.md", body: intent },
    { name: "rules.md", body: rulesMd },
    { name: "canvas-tabs.json", body: tabsJson },
    { name: "service.js", body: serviceJs },
    { name: "sample-data.js", body: sampleDataJs },
    { name: "tests/assertions.md", body: assertionsMd },
  ];
}

// Cheap "syntax" coloring: comments gray, # headings purple, "quoted" green.
function colorize(line) {
  if (/^\s*\/\//.test(line) || /none yet/.test(line)) return <span style={{ color: TOK.com }}>{line || " "}</span>;
  if (/^#/.test(line)) return <span style={{ color: TOK.key, fontWeight: 700 }}>{line}</span>;
  if (/^[A-Z][A-Z ()]+:/.test(line)) return <span style={{ color: TOK.key }}>{line}</span>;
  const parts = line.split(/("[^"]*")/g);
  return parts.map((p, j) => (/^"/.test(p) ? <span key={j} style={{ color: TOK.str }}>{p}</span> : <span key={j} style={{ color: TOK.text }}>{p}</span>));
}

export default function LiveCodePanel({ session }) {
  const files = buildFiles(session);
  const sig = files.map((f) => f.body).join("");
  const [writing, setWriting] = useState(false);
  const prev = useRef("");

  useEffect(() => {
    if (prev.current === "") { prev.current = sig; return undefined; }
    if (sig === prev.current) return undefined;
    prev.current = sig;
    // Brief "writing…" pulse whenever the derived spec changes. Deliberate
    // setState-on-change; not a cascading render (guarded by the equality check).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWriting(true);
    const t = setTimeout(() => setWriting(false), 1400);
    return () => clearTimeout(t);
  }, [sig]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#0b1220", borderLeft: "1px solid #1e293b" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #1e293b", color: "#e2e8f0" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: writing ? "#4ade80" : "#475569", transition: "background .2s" }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>Live code</span>
        <span style={{ fontSize: 11, color: writing ? "#4ade80" : "#64748b", marginLeft: 2 }}>
          {writing ? "writing…" : "written as you talk"}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 24px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5, lineHeight: 1.65 }}>
        {files.map((f) => (
          <div key={f.name} style={{ marginBottom: 6 }}>
            <div style={{ padding: "6px 14px", color: "#94a3b8", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, background: "#0f172a", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
              ↳ creators/your-worker/{f.name}
            </div>
            <pre style={{ margin: 0, padding: "8px 14px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {f.body.split("\n").map((ln, i) => (
                <div key={i}>{colorize(ln)}</div>
              ))}
            </pre>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 14px", borderTop: "1px solid #1e293b", color: "#64748b", fontSize: 10.5 }}>
        This is your worker's real spec, taking shape as you talk. To take it further, you edit these files in code.
      </div>
    </div>
  );
}
