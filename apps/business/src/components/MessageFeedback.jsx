import React, { useState } from "react";

/**
 * MessageFeedback — CODEX 50.11 Layer B per-message thumbs + comment.
 *
 * Renders below each assistant message in ChatPanel. Click 👍/👎 to
 * file a feedback event to /v1/chat:feedback. 👎 expands a comment
 * input for qualitative signal. Optimistic UI; sets state to hide
 * the affordance after submit.
 *
 * messageId is `${sessionId}#${idx}` — sessionId is stable per session,
 * idx is the message's position in the in-memory chat array. v1.1 may
 * promote this to a server-generated messageEvent doc id once that's
 * surfaced to the client.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function getSessionId() {
  try { return localStorage.getItem("ta_chat_session_id") || null; } catch { return null; }
}

const S = {
  row: { display: "flex", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 6 },
  thumb: {
    background: "none", border: "1px solid transparent", borderRadius: 6,
    padding: "3px 8px", cursor: "pointer", fontSize: 14, color: "#94a3b8",
    transition: "color 0.15s, border-color 0.15s, background 0.15s",
    lineHeight: 1,
  },
  thumbActive: {
    color: "#7c3aed", borderColor: "#e9d5ff", background: "#faf5ff",
  },
  thanks: { fontSize: 11, color: "#16a34a", fontWeight: 600 },
  expand: {
    marginTop: 4, display: "flex", flexDirection: "column", gap: 6, maxWidth: 380,
  },
  textarea: {
    width: "100%", padding: "6px 10px", fontSize: 12, borderRadius: 6,
    border: "1px solid #e2e8f0", outline: "none", background: "#fff",
    color: "#1e293b", boxSizing: "border-box", resize: "vertical", minHeight: 50,
    fontFamily: "inherit",
  },
  commentBtns: { display: "flex", gap: 6 },
  btnSubmit: {
    padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6,
    border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer",
  },
  btnSkip: {
    padding: "5px 10px", fontSize: 11, fontWeight: 500, borderRadius: 6,
    border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer",
  },
};

export default function MessageFeedback({ messageIndex, workerSlug }) {
  const [submitted, setSubmitted] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(type, opts = {}) {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const sessionId = getSessionId();
      const messageId = sessionId ? `${sessionId}#${messageIndex}` : null;
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || null;
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      if (tenantId) headers["x-tenant-id"] = tenantId;
      const res = await fetch(`${API_BASE}/api?path=/v1/chat:feedback`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type,
          scope: "chat_message",
          messageId,
          sessionId,
          workerSlug: workerSlug || null,
          comment: opts.comment || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSubmitted(true);
      setShowComment(false);
    } catch (e) {
      // Quiet failure — feedback is opt-in, don't block the user.
      console.warn("[MessageFeedback] submit failed:", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function onThumbDown() {
    if (submitted) return;
    setPendingType("thumbs_down");
    setShowComment(true);
  }
  function submitWithComment() {
    submit("thumbs_down", { comment: comment.trim() || null });
  }
  function skipComment() {
    submit("thumbs_down");
  }

  if (submitted) {
    return <div style={S.row}><span style={S.thanks}>Thanks for the signal.</span></div>;
  }

  return (
    <div>
      <div style={S.row}>
        <button
          style={pendingType === "thumbs_up" ? { ...S.thumb, ...S.thumbActive } : S.thumb}
          onClick={() => submit("thumbs_up")}
          disabled={submitting}
          title="Helpful"
          aria-label="Thumbs up"
        >👍</button>
        <button
          style={pendingType === "thumbs_down" ? { ...S.thumb, ...S.thumbActive } : S.thumb}
          onClick={onThumbDown}
          disabled={submitting}
          title="Not helpful"
          aria-label="Thumbs down"
        >👎</button>
      </div>
      {showComment && (
        <div style={S.expand}>
          <textarea
            style={S.textarea}
            placeholder="What was off? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            autoFocus
          />
          <div style={S.commentBtns}>
            <button style={S.btnSubmit} onClick={submitWithComment} disabled={submitting}>
              {submitting ? "Sending…" : "Send"}
            </button>
            <button style={S.btnSkip} onClick={skipComment} disabled={submitting}>
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
