/**
 * VideoCard.jsx — Renders video content on the canvas.
 * Signal: card:video
 * Payload: { videoUrl: string, title?: string, description?: string, thumbnail?: string, aspectRatio?: "16:9" | "9:16" | "4:3" | "1:1" }
 *
 * Supports:
 *   - YouTube URLs (youtube.com/watch?v=..., youtu.be/..., shorts/..., embed/...)
 *   - Direct mp4/webm/ogv URLs (rendered as <video> tag)
 *
 * Privacy: uses youtube-nocookie.com for YouTube embeds.
 * Sean's directive 2026-06-04: video is the difference between
 * "people are scared of this shit" and "people get it instantly."
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import CanvasFallbackView from "./CanvasFallbackView";

const S = {
  videoWrap: { position: "relative", width: "100%", borderRadius: 10, overflow: "hidden", background: "#000", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  aspect16x9: { paddingBottom: "56.25%" },
  aspect9x16: { paddingBottom: "177.78%" },
  aspect4x3: { paddingBottom: "75%" },
  aspect1x1: { paddingBottom: "100%" },
  embed: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" },
  description: { fontSize: 13, color: "#475569", lineHeight: 1.6, marginTop: 12 },
  fallbackLink: { fontSize: 12, color: "#7c3aed", textDecoration: "none", marginTop: 8, display: "inline-block" },
};

const ASPECT_STYLE = {
  "16:9": S.aspect16x9,
  "9:16": S.aspect9x16,
  "4:3": S.aspect4x3,
  "1:1": S.aspect1x1,
};

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
];

const DIRECT_VIDEO_EXTS = [".mp4", ".webm", ".ogv", ".mov"];

function extractYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  for (const pattern of YOUTUBE_PATTERNS) {
    const m = url.match(pattern);
    if (m && m[1]) return m[1];
  }
  return null;
}

function isDirectVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase().split("?")[0];
  return DIRECT_VIDEO_EXTS.some(ext => lower.endsWith(ext));
}

function buildYouTubeEmbedUrl(videoId, { autoplay = false, mute = false, controls = true, modestBranding = true } = {}) {
  const params = new URLSearchParams();
  if (modestBranding) params.set("modestbranding", "1");
  if (!controls) params.set("controls", "0");
  if (autoplay) params.set("autoplay", "1");
  if (mute) params.set("mute", "1");
  params.set("rel", "0");
  const qs = params.toString();
  return `https://www.youtube-nocookie.com/embed/${videoId}${qs ? `?${qs}` : ""}`;
}

export default function VideoCard({ resolved, context, onDismiss }) {
  const payload = context?.payload || {};
  const videoUrl = payload.videoUrl || payload.url;
  const title = payload.title || resolved?._title || "Video";
  const description = payload.description;
  const aspectRatio = payload.aspectRatio || "16:9";
  const aspectStyle = ASPECT_STYLE[aspectRatio] || S.aspect16x9;

  if (!videoUrl) {
    return (
      <CanvasCardShell title={title} emptyPrompt={resolved?.emptyPrompt || "Provide a video URL or YouTube link to see it here."} onDismiss={onDismiss}>
        <CanvasFallbackView payload={payload} />
      </CanvasCardShell>
    );
  }

  const youtubeId = extractYouTubeId(videoUrl);

  if (youtubeId) {
    const embedUrl = buildYouTubeEmbedUrl(youtubeId, {
      autoplay: payload.autoplay === true,
      mute: payload.autoplay === true,
      controls: payload.controls !== false,
    });
    return (
      <CanvasCardShell title={title} onDismiss={onDismiss}>
        <div style={S.videoWrap}>
          <div style={aspectStyle} />
          <iframe
            style={S.embed}
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        {description && <div style={S.description}>{description}</div>}
        <a href={`https://www.youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noopener noreferrer" style={S.fallbackLink}>
          Open on YouTube ↗
        </a>
      </CanvasCardShell>
    );
  }

  if (isDirectVideoUrl(videoUrl)) {
    return (
      <CanvasCardShell title={title} onDismiss={onDismiss}>
        <div style={S.videoWrap}>
          <div style={aspectStyle} />
          <video
            style={S.embed}
            src={videoUrl}
            controls={payload.controls !== false}
            autoPlay={payload.autoplay === true}
            muted={payload.autoplay === true}
            playsInline
            preload="metadata"
            poster={payload.thumbnail || undefined}
          />
        </div>
        {description && <div style={S.description}>{description}</div>}
      </CanvasCardShell>
    );
  }

  return (
    <CanvasCardShell title={title} onDismiss={onDismiss}>
      <div style={{ padding: 16, color: "#64748b", fontSize: 13 }}>
        Unrecognized video URL format. Supported: YouTube URLs (youtube.com / youtu.be / shorts) and direct video files (.mp4, .webm, .ogv, .mov).
      </div>
      <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={S.fallbackLink}>
        Open in new tab ↗
      </a>
    </CanvasCardShell>
  );
}
