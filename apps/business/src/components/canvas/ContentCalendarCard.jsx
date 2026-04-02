/**
 * ContentCalendarCard.jsx — Content calendar canvas card (44.9)
 * Signal: card:marketing-content-calendar
 * Data source: conversation context
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  day: { marginBottom: 14 },
  dayLabel: { fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  post: {
    display: "flex", gap: 8, padding: "8px 10px", background: "#f8fafc",
    borderRadius: 8, marginBottom: 4, border: "1px solid #f1f5f9",
  },
  platform: {
    fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
    background: "#e0e7ff", color: "#4338ca", flexShrink: 0, alignSelf: "flex-start",
  },
  postContent: { flex: 1, fontSize: 12, color: "#1e293b", lineHeight: 1.4 },
  time: { fontSize: 10, color: "#9ca3af", flexShrink: 0 },
};

const PLATFORM_COLORS = {
  instagram: { bg: "#fce7f3", color: "#be185d" },
  twitter: { bg: "#e0f2fe", color: "#0369a1" },
  linkedin: { bg: "#e0e7ff", color: "#4338ca" },
  facebook: { bg: "#dbeafe", color: "#1d4ed8" },
  email: { bg: "#fef3c7", color: "#92400e" },
};

export default function ContentCalendarCard({ resolved, context, onDismiss }) {
  const calendar = context?.contentCalendar || null;

  return (
    <CanvasCardShell
      title="Content Calendar"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex to plan your content to see it here."}
      onDismiss={onDismiss}
    >
      {calendar && calendar.length > 0 && calendar.map((day, i) => (
        <div key={i} style={S.day}>
          <div style={S.dayLabel}>{day.date || day.day}</div>
          {(day.posts || []).map((post, j) => {
            const pc = PLATFORM_COLORS[post.platform?.toLowerCase()] || PLATFORM_COLORS.linkedin;
            return (
              <div key={j} style={S.post}>
                <span style={{ ...S.platform, background: pc.bg, color: pc.color }}>{post.platform || "Post"}</span>
                <div style={S.postContent}>{post.content || post.title || ""}</div>
                {post.time && <span style={S.time}>{post.time}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </CanvasCardShell>
  );
}
