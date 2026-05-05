/**
 * ImageCard.jsx (49.32) — Renders a generated image on the canvas.
 * Signal: card:image
 * Payload: { imageUrl: string, prompt?: string, title?: string, alt?: string }
 *
 * Sean asked: image generation should land on the canvas, not inline in chat.
 * The chat reply still describes what was generated; this card displays it.
 */

import React, { useState } from "react";
import CanvasCardShell from "./CanvasCardShell";
import CanvasFallbackView from "./CanvasFallbackView";

const S = {
  imageWrap: { display: "flex", justifyContent: "center", padding: 4 },
  image: { maxWidth: "100%", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "block" },
  prompt: { fontSize: 12, color: "rgba(0,0,0,0.55)", fontStyle: "italic", marginTop: 12, lineHeight: 1.5 },
  actions: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  btn: { fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", background: "white", color: "#1e293b", cursor: "pointer", textDecoration: "none", fontFamily: "inherit" },
  btnPrimary: { fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 6, border: "none", background: "#7c3aed", color: "white", cursor: "pointer", textDecoration: "none", fontFamily: "inherit" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "rgba(0,0,0,0.4)", fontSize: 13 },
  error: { color: "#dc2626", fontSize: 12, marginTop: 8 },
};

export default function ImageCard({ resolved, context, onDismiss }) {
  const payload = context?.payload || {};
  const imageUrl = payload.imageUrl || payload.url;
  const title = payload.title || resolved?._title || "Generated Image";
  const prompt = payload.prompt;
  const alt = payload.alt || prompt || title;
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <CanvasCardShell
      title={title}
      emptyPrompt={resolved?.emptyPrompt || "Ask any worker to generate an image to see it here."}
      onDismiss={onDismiss}
    >
      {imageUrl ? (
        <>
          <div style={S.imageWrap}>
            {!loaded && !errored && <div style={S.loading}>Loading image...</div>}
            <img
              src={imageUrl}
              alt={alt}
              style={{ ...S.image, display: errored ? "none" : (loaded ? "block" : "none") }}
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
            />
          </div>
          {errored && <div style={S.error}>Image failed to load. The link may have expired.</div>}
          {prompt && <div style={S.prompt}>"{prompt}"</div>}
          <div style={S.actions}>
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" style={S.btn}>Open full size</a>
            <a href={imageUrl} download style={S.btnPrimary}>Download</a>
          </div>
        </>
      ) : (
        <CanvasFallbackView payload={payload} />
      )}
    </CanvasCardShell>
  );
}
