import { useState } from "react";

interface UseFileUploadOptions {
  purpose: string;
}

interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<string | null>;
  uploading: boolean;
  uploaded: boolean;
  fileId: string | null;
  error: string | null;
  reset: () => void;
}

export default function useFileUpload({ purpose }: UseFileUploadOptions): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setUploading(false);
    setUploaded(false);
    setFileId(null);
    setError(null);
  }

  async function uploadFile(file: File): Promise<string | null> {
    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const vertical = localStorage.getItem("VERTICAL") || "auto";
      const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";
      const tenantId = localStorage.getItem("TENANT_ID") || "";
      const apiBase = (import.meta as any).env?.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      // Step 1: Request signed upload URL
      const signResponse = await fetch(`${apiBase}/api?path=/v1/files:sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Vertical": vertical,
          "X-Jurisdiction": jurisdiction,
          ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          purpose,
        }),
      });

      const signData = await signResponse.json();
      if (!signResponse.ok || !signData.ok) {
        throw new Error(signData.error || "Failed to get upload URL");
      }

      // Step 2: Upload directly to Cloud Storage
      const uploadResult = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error("Upload to storage failed");
      }

      // Step 3: Finalize
      await fetch(`${apiBase}/api?path=/v1/files:finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Vertical": vertical,
          "X-Jurisdiction": jurisdiction,
          ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
        },
        body: JSON.stringify({
          fileId: signData.fileId,
          storagePath: signData.storagePath,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });

      setFileId(signData.fileId);
      setUploaded(true);
      setUploading(false);
      return signData.fileId;
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setUploading(false);
      return null;
    }
  }

  return { uploadFile, uploading, uploaded, fileId, error, reset };
}
