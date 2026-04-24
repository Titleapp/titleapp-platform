/**
 * useDocuments — CODEX 49.5 Phase D
 * Upload, download, list documents via storage service.
 */

import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, method = "GET", body = null) {
  const token = localStorage.getItem("ID_TOKEN");
  const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(path)}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function useDocuments() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Upload a file (from File object or base64 string).
   */
  const uploadFile = useCallback(async ({ file, filename, content, mimeType, scope, orgId, subdir, workerSlug, projectId, tags }) => {
    setUploading(true);
    setError(null);
    try {
      let base64Content = content;
      if (file && !content) {
        // Convert File to base64
        base64Content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        filename = filename || file.name;
        mimeType = mimeType || file.type;
      }

      const result = await apiFetch("/v1/storage:upload", "POST", {
        filename,
        content: base64Content,
        mimeType: mimeType || "application/octet-stream",
        scope: scope || "personal",
        orgId,
        subdir: subdir || "documents",
        workerSlug,
        projectId,
        tags: tags || [],
      });

      if (!result.ok) throw new Error(result.error || "Upload failed");
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setUploading(false);
    }
  }, []);

  /**
   * Get a download URL for an object.
   */
  const downloadFile = useCallback(async (objectId) => {
    try {
      const result = await apiFetch(`/v1/storage:download?objectId=${objectId}`);
      if (result.ok && result.downloadUrl) {
        window.open(result.downloadUrl, "_blank");
      }
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    }
  }, []);

  /**
   * List documents.
   */
  const listDocuments = useCallback(async ({ scope, projectId, limit } = {}) => {
    try {
      const params = new URLSearchParams();
      if (scope) params.set("scope", scope);
      if (projectId) params.set("projectId", projectId);
      if (limit) params.set("limit", String(limit));
      const result = await apiFetch(`/v1/storage:list?${params.toString()}`);
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, objects: [] };
    }
  }, []);

  /**
   * Delete a document.
   */
  const deleteDocument = useCallback(async (objectId) => {
    try {
      return await apiFetch("/v1/storage:delete", "POST", { objectId });
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    }
  }, []);

  /**
   * Generate a document via pipeline.
   */
  const generateDocument = useCallback(async ({ type, context, workerSlug, projectId }) => {
    setUploading(true);
    setError(null);
    try {
      const result = await apiFetch("/v1/documents:pipeline", "POST", {
        type, context, workerSlug, projectId,
      });
      if (!result.ok) throw new Error(result.error || "Generation failed");
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploadFile,
    downloadFile,
    listDocuments,
    deleteDocument,
    generateDocument,
    uploading,
    error,
    clearError: () => setError(null),
  };
}
