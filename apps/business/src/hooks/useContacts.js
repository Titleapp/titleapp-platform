import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

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

export default function useContacts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const listContacts = useCallback(async ({ q, workerSlug, segment, limit, cursor, stats } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (workerSlug) params.set("workerSlug", workerSlug);
      if (segment) params.set("segment", segment);
      if (limit) params.set("limit", String(limit));
      if (cursor) params.set("cursor", cursor);
      // Pass stats=0 on Load-More follow-ups so we don't re-run the count()
      // aggregate every page. Default is on (matches server default).
      if (stats === false) params.set("stats", "0");
      const path = `/v1/contacts:list${params.toString() ? `?${params.toString()}` : ""}`;
      const result = await apiFetch(path);
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, contacts: [], stats: {}, hasMore: false, nextCursor: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const apolloPull = useCallback(async ({ criteria, contact_tier = "prospect", source_sub = null } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/v1/apollo:search", "POST", {
        criteria,
        write_to_contacts: true,
        contact_tier,
        source_sub,
      });
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Single manual add. Intent shapes the default persona (sales_lead, investor,
  // media, creator, vendor, partner, advisor, regulator, professional_services,
  // employee, manual). UI passes whatever the user picked from the intent
  // selector; backend fills sensible persona/tier/segment defaults.
  const addContact = useCallback(async (fields) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/v1/contacts:add", "POST", fields);
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Bulk CSV import. rows = [{ first_name, last_name, email, company, title,
  // linkedin_url, phone }]. intent + segment come from the upload modal.
  const bulkImportContacts = useCallback(async ({ rows, intent, segment, source }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/v1/contacts:bulkImport", "POST", { rows, intent, segment, source });
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Soft-delete one or more contacts. Caller must pass confirm:true; we
  // mirror that on the body so the user sees the same gate everywhere.
  const bulkDeleteContacts = useCallback(async ({ ids, segment, source, dryRun = false }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/v1/contacts:bulkDelete", "POST", { ids, segment, source, confirm: true, dryRun });
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Patch a single contact. fields supports name/email/phone/company/title/
  // notes/tags/segments/source plus a personas_patch array.
  const updateContact = useCallback(async ({ id, fields }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/v1/contacts:update", "POST", { id, fields });
      return result;
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Server-side persona heuristics propose segment buckets so the user
  // doesn't have to filter one-by-one. Returns { ok, scanned, breakdown:
  // [{ slug, label, description, count, ids[] }] }.
  const proposeSegments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await apiFetch("/v1/contacts:proposeSegments");
    } catch (e) {
      setError(e.message);
      return { ok: false, breakdown: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Bulk Apollo enrichment for a set of contact ids. Backend hard-caps
  // each call at 100 ids; UI loops if the user wants more. Each enriched
  // contact records a paid data fee.
  const enrichContacts = useCallback(async ({ ids, maxPerCall = 100 }) => {
    setLoading(true);
    setError(null);
    try {
      return await apiFetch("/v1/contacts:enrich", "POST", { ids, maxPerCall, confirm: true });
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply a segment tag to a list of contact IDs (idempotent on the server).
  const applySegment = useCallback(async ({ segment, ids }) => {
    setLoading(true);
    setError(null);
    try {
      return await apiFetch("/v1/contacts:applySegment", "POST", { segment, ids, confirm: true });
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    listContacts, apolloPull,
    addContact, bulkImportContacts, bulkDeleteContacts, updateContact,
    proposeSegments, applySegment, enrichContacts,
    loading, error,
  };
}
