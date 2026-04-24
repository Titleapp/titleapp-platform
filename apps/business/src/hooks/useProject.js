/**
 * useProject — CODEX 49.5 Phase D
 * Subscribes to active project and canvas events via Firestore onSnapshot.
 * Returns { project, documents, milestones, events, loading, error }
 */

import { useState, useEffect, useCallback } from "react";

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

export default function useProject(workerSlug) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load projects for current worker
  const loadProjects = useCallback(async () => {
    if (!workerSlug) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = workerSlug ? `&workerSlug=${workerSlug}` : "";
      const result = await apiFetch(`/v1/projects:list?status=active${params}`);
      setProjects(result.projects || []);
      if (result.projects?.length > 0) {
        setActiveProject(result.projects[0]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workerSlug]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Load documents for active project
  const loadDocuments = useCallback(async () => {
    if (!activeProject) { setDocuments([]); return; }
    try {
      const result = await apiFetch(`/v1/storage:list?projectId=${activeProject.projectId}`);
      setDocuments(result.objects || []);
    } catch (e) {
      console.warn("Failed to load project documents:", e.message);
    }
  }, [activeProject]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  // Create a new project
  const createProject = useCallback(async (title) => {
    try {
      const result = await apiFetch("/v1/projects:create", "POST", { title, workerSlug });
      if (result.ok) {
        await loadProjects();
        return result;
      }
    } catch (e) {
      setError(e.message);
    }
    return { ok: false };
  }, [workerSlug, loadProjects]);

  // Add milestone
  const addMilestone = useCallback(async (label, documentId) => {
    if (!activeProject) return { ok: false };
    try {
      return await apiFetch("/v1/projects:addMilestone", "POST", {
        projectId: activeProject.projectId, label, documentId,
      });
    } catch (e) {
      setError(e.message);
      return { ok: false };
    }
  }, [activeProject]);

  return {
    projects,
    activeProject,
    setActiveProject,
    documents,
    milestones: activeProject?.milestones || [],
    loading,
    error,
    createProject,
    addMilestone,
    refresh: loadProjects,
    refreshDocuments: loadDocuments,
  };
}
