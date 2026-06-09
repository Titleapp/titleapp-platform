// ChatMarkdown.jsx — S52.46
// Renders assistant chat content as real markdown (bold, lists, tables, code,
// headings) instead of a raw string with literal ** asterisks. react-markdown +
// remark-gfm are already in package.json; this is the first place we actually use
// them. Typography is tuned to read like a chat reply, not a .md file dump.

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMarkdown({ children }) {
  if (typeof children !== "string") return children || null;
  return (
    <div className="chat-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // open links in a new tab, never navigate the SPA away
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
