import React, { useEffect, useRef, useState } from "react";

// LiveCodePanel — the "woo, I'm building this" view. As the creator talks to
// Alex, the worker spec the conversation produces is rendered here AS CODE,
// live — intent.md, canvas-tabs.json, and the rules — so they watch their
// worker write itself. It reads the same session state the form fills from
// (no terminal yet — this surfaces the real artifacts we already derive).

const TOK = { key: "#c4b5fd", str: "#86efac", com: "#64748b", punct: "#94a3b8", text: "#e2e8f0" };

function toLines(v) {
  if (Array.isArray(v)) return v.filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === "string") return v.split("\n").map((s) => s.trim()).filter(Boolean);
  return [];
}

function buildFiles(session) {
  const spec = (session && session.spec) || {};
  const steps = (session && session.workerSteps) || {};
  const design = (steps.design && steps.design.data) || {};
  const rules = (steps.rules && steps.rules.data) || {};
  const tabs = Array.isArray(design.tabs) ? design.tabs : [];

  const ph = (v, hint) => (v && String(v).trim() ? String(v).trim() : `// ${hint}`);

  const intent = [
    `# ${spec.name || "Untitled Worker"}`,
    ``,
    `## What it does`,
    ph(design.headlineOutcome, "the one outcome — coming from your chat…"),
    ``,
    `## Who it's for`,
    ph(spec.targetAudience, "who uses this…"),
    ``,
    `## The problem it kills`,
    ph(spec.problemSolves, "the problem…"),
    ``,
    `## Field`,
    ph(spec.category || spec.vertical, "vertical…"),
  ].join("\n");

  const tabsJson = tabs.length
    ? "[\n" + tabs.map((t) => `  { "label": ${JSON.stringify(t.label || "")}, "job": ${JSON.stringify(t.job || t.headline || "")} }`).join(",\n") + "\n]"
    : "// your tabs appear here as you design the canvas…";

  const ruleBlock = (title, arr) => (arr.length ? `${title}:\n` + arr.map((r) => `  - ${r}`).join("\n") : `${title}:\n  // none yet`);
  const rulesTxt = [
    ruleBlock("LAWS (never break)", toLines(rules.tier0)),
    ruleBlock("ALWAYS", toLines(rules.tier1)),
    ruleBlock("NEVER", toLines(rules.tier2)),
    ruleBlock("ESCALATE to a human", toLines(rules.tier3)),
  ].join("\n\n");

  return [
    { name: "intent.md", body: intent },
    { name: "canvas-tabs.json", body: tabsJson },
    { name: "rules.yaml", body: rulesTxt },
  ];
}

// Cheap "syntax" coloring: comments gray, # headings purple, "quoted" green.
function colorize(line, i) {
  if (/^\s*\/\//.test(line) || /none yet/.test(line)) return <span style={{ color: TOK.com }}>{line || " "}</span>;
  if (/^#/.test(line)) return <span style={{ color: TOK.key, fontWeight: 700 }}>{line}</span>;
  if (/^[A-Z][A-Z ()]+:/.test(line)) return <span style={{ color: TOK.key }}>{line}</span>;
  const parts = line.split(/("[^"]*")/g);
  return parts.map((p, j) => /^"/.test(p) ? <span key={j} style={{ color: TOK.str }}>{p}</span> : <span key={j} style={{ color: TOK.text }}>{p}</span>);
}

export default function LiveCodePanel({ session }) {
  const files = buildFiles(session);
  const [writing, setWriting] = useState(false);
  const prev = useRef("");

  useEffect(() => {
    const sig = files.map((f) => f.body).join("");
    if (prev.current && sig !== prev.current) {
      setWriting(true);
      const t = setTimeout(() => setWriting(false), 1400);
      prev.current = sig;
      return () => clearTimeout(t);
    }
    prev.current = sig;
  }); // run every render; cheap string compare

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
                <div key={i}>{colorize(ln, i)}</div>
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
