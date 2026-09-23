// ChatMarkdown.jsx — S52.46
// Renders assistant chat content as real markdown (bold, lists, tables, code,
// headings) instead of a raw string with literal ** asterisks. react-markdown +
// remark-gfm are already in package.json; this is the first place we actually use
// them. Typography is tuned to read like a chat reply, not a .md file dump.

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        position: "absolute", top: 8, right: 8,
        background: copied ? "#22c55e" : "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 4, color: copied ? "#fff" : "#94a3b8",
        fontSize: 11, fontWeight: 600, padding: "2px 8px",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ inline, className, children, ...props }) {
  const code = String(children).replace(/\n$/, "");
  if (inline) return <code className={className} {...props}>{children}</code>;
  return (
    <div style={{ position: "relative" }}>
      <pre style={{ margin: 0 }}>
        <code className={className} {...props}>{children}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

export default function ChatMarkdown({ children }) {
  if (typeof children !== "string") return children || null;
  // 2026-09-23 — found in worker QA: Skye Dispatch's chat responses
  // sometimes rendered as raw, unformatted markdown (literal ##, |, ---
  // showing as plain text) instead of real headers/tables/bold, while
  // CoPilot's identical-shaped responses rendered correctly through this
  // same component. remark-gfm requires headers and table rows to each be
  // on their own real line to recognize the syntax at all — a string
  // carrying literal "\n" escape sequences (surviving a JSON round-trip
  // somewhere upstream, e.g. a tool-result re-stringified once too many
  // times on a verification-heavy path, similar in shape to the
  // SSE-response-shape bug found in Max/Accounting) would run every
  // "line" together as one, and the whole block falls back to plain text.
  // Normalizing here is defensive and a no-op when there's nothing to fix.
  const normalized = children.includes("\\n") ? children.replace(/\\n/g, "\n") : children;
  return (
    <div className="chat-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ node: _node, ...props }) => ( // eslint-disable-line no-unused-vars
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          code: CodeBlock,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
