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
        {children}
      </ReactMarkdown>
    </div>
  );
}
