import React, { useState, useRef, useEffect } from "react";
import { sendCourseChatMessage } from "../../api/educationApi";

// CODEX 70 Surface 2 — minimal standalone chat surface for the course tutor.
// Used both for the instructor's "preview your tutor" step (Step 4 of the
// wizard) and for the public /course/:slug student page. Deliberately small
// and self-contained rather than reusing the full ChatPanel.jsx (which is
// tightly coupled to the main authenticated app shell / worker catalog /
// onboarding state) — mirrors the same "keep it standalone" choice already
// made for the builder_interview chat path on the backend.

export default function CourseChat({ workerId, courseName, tutorName, description, seedMessage }) {
  const [messages, setMessages] = useState(() => (
    seedMessage ? [{ role: "assistant", content: seedMessage }] : []
  ));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const res = await sendCourseChatMessage({
        userInput: text,
        conversationHistory: nextMessages,
        workerId,
        courseName,
        tutorName,
        description,
      });
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
      } else {
        setError(res.error || "Something went wrong.");
      }
    } catch (e2) {
      setError(e2.message || "Connection error.");
    }
    setSending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 360 }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 4px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              background: m.role === "user" ? "#7c3aed" : "#f1f5f9",
              color: m.role === "user" ? "#fff" : "#0f172a",
            }}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: "flex-start", fontSize: 13, color: "#94a3b8" }}>{tutorName || "Tutor"} is thinking…</div>
        )}
      </div>
      {error && <div style={{ color: "#dc2626", fontSize: 12, padding: "0 4px 8px" }}>{error}</div>}
      <form onSubmit={handleSend} style={{ display: "flex", gap: 8, padding: "8px 4px 0", borderTop: "1px solid #e5e7eb" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${tutorName || "your tutor"} something…`}
          style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          style={{ padding: "10px 20px", background: input.trim() ? "#7c3aed" : "#d1d5db", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: input.trim() ? "pointer" : "not-allowed" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
