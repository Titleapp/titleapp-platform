/**
 * OperatorUploadPrompt.jsx — Empty-state CTA for aviation cards that expect
 * operator-uploaded documents (Checklists, QRH, Performance tables, Weight &
 * Balance worksheets, Aircraft profile docs).
 *
 * Sean's call (2026-05-13): the AFM ships baseline procedures, but every
 * operator publishes their own version that differs in ways the AFM doesn't
 * capture. These tabs should always prompt for operator upload — even if an
 * AFM baseline exists — so the worker grounds in what the operator actually
 * requires the pilot to use.
 *
 * Uses the existing /v1/files:sign + /v1/files:finalize signed-URL flow
 * (same path ChatPanel uses for chat attachments). Tags the file with
 * worker:<slug> + category:<uploadCategory> so the worker can retrieve it
 * later from the Drive/Vault.
 */

import React, { useRef, useState } from "react";

const S = {
  wrap: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    height: "100%", padding: "24px", textAlign: "center", gap: 12,
  },
  icon: { fontSize: 32, marginBottom: 4, opacity: 0.7 },
  title: { fontSize: 15, fontWeight: 600, color: "var(--text-primary)" },
  hint: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, maxWidth: 360 },
  button: {
    marginTop: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600,
    background: "#7c3aed", color: "white", border: "none", borderRadius: 8,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
  },
  status: { fontSize: 12, color: "var(--text-muted)", marginTop: 8 },
  error: { fontSize: 12, color: "#dc2626", marginTop: 8 },
  ok: { fontSize: 13, color: "#15803d", marginTop: 8, fontWeight: 600 },
};

export default function OperatorUploadPrompt({
  title = "No content yet.",
  hint = "Upload your operator's document. PDFs preferred.",
  buttonLabel = "Upload document",
  workerSlug,
  uploadCategory = "operator",
  accept = ".pdf,application/pdf",
}) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(""); // "", "uploading", "ok", "error"
  const [errorMsg, setErrorMsg] = useState("");

  const onChoose = () => inputRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    try {
      const idToken = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || "vault";
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const tags = [
        workerSlug ? `worker:${workerSlug}` : null,
        `category:${uploadCategory}`,
        "source:canvas-upload",
      ].filter(Boolean);

      const signRes = await fetch(`${apiBase}/api?path=/v1/files:sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          purpose: "drive",
          tags,
          related: {
            workerSlug: workerSlug || null,
            category: uploadCategory,
            source: "canvas_upload",
          },
        }),
      });
      const sign = await signRes.json();
      if (!sign?.ok || !sign?.uploadUrl) throw new Error(sign?.error || "sign failed");

      const putRes = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`storage PUT failed (${putRes.status})`);

      const finRes = await fetch(`${apiBase}/api?path=/v1/files:finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          fileId: sign.fileId,
          storagePath: sign.storagePath,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      const fin = await finRes.json();
      if (!fin?.ok) throw new Error(fin?.error || "finalize failed");
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.message || String(err));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.icon}>↑</div>
      <div style={S.title}>{title}</div>
      <div style={S.hint}>{hint}</div>
      <button style={S.button} onClick={onChoose} disabled={status === "uploading"}>
        {status === "uploading" ? "Uploading…" : buttonLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={onFile}
      />
      {status === "ok" && (
        <div style={S.ok}>Uploaded. The worker can now reference this document.</div>
      )}
      {status === "error" && (
        <div style={S.error}>Upload failed: {errorMsg}</div>
      )}
    </div>
  );
}
