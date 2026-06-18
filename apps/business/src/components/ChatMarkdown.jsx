// ChatMarkdown.jsx — S52.46
// Renders assistant chat content as real markdown (bold, lists, tables, code,
// headings) instead of a raw string with literal ** asterisks. react-markdown +
// remark-gfm are already in package.json; this is the first place we actually use
// them. Typography is tuned to read like a chat reply, not a .md file dump.

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export default function ChatMarkdown({ children }) {
  if (typeof children !== "string") return children || null;
  return (
    <div className="chat-md">
      <ReactMarkdown
        // remark-gfm: tables/strikethrough/autolinks. remark-breaks: a single
        // newline becomes a real line break, so when Alex puts each idea or
        // sub-point on its own line they don't collapse together into one
        // run-on paragraph (CommonMark treats a lone \n as a space). Fenced
        // code blocks are unaffected.
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // open links in a new tab, never navigate the SPA away
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
