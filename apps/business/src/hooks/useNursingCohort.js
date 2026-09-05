import { useState, useCallback } from "react";

// Real, tenant-scoped data for the nursing-education-001 instructor
// dashboard. Fixed 2026-09-05 alongside the backend routes (same session,
// same bug class as the "cross-student data bleed" fix): /v1/nursing:cohort,
// /v1/nursing:student, /v1/nursing:competency:attest, and
// /v1/demo/ati-score-event used to be hardcoded to tenantId
// "demo-makai-nursing" server-side regardless of caller — now they're scoped
// to the caller's own tenant (x-tenant-id header) and gated to an
// admin/owner ("instructor") membership on that tenant, mirroring
// /v1/education:students:list.
const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

async function apiFetch(path, method = "GET", body = null) {
  const token = localStorage.getItem("ID_TOKEN");
  const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || "vault";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function useNursingCohort() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCohort = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/v1/nursing:cohort");
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudent = useCallback(async (studentId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/v1/nursing:student?id=${encodeURIComponent(studentId)}`);
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const attestCompetency = useCallback(async (studentId, competencyId, notes) => {
    try {
      const result = await apiFetch("/v1/nursing:competency:attest", "POST", { studentId, competencyId, notes });
      return result;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  return { loading, error, fetchCohort, fetchStudent, attestCompetency };
}
