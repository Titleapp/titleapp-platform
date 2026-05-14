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

export default function useAccounting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSetupState = useCallback(async () => {
    try { return await apiFetch("/v1/accounting:setupState"); }
    catch (e) { setError(e.message); return { ok: false, steps: {}, dismissed: false }; }
  }, []);

  const updateSetupStep = useCallback(async ({ stepId, done, dismissed } = {}) => {
    try { return await apiFetch("/v1/accounting:setupState", "POST", { stepId, done, dismissed }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const getFiscalYear = useCallback(async () => {
    try { return await apiFetch("/v1/accounting:fiscalYear"); }
    catch (e) { setError(e.message); return { ok: false, fiscalYearStart: null }; }
  }, []);

  const setFiscalYear = useCallback(async ({ month, day }) => {
    try { return await apiFetch("/v1/accounting:fiscalYear", "POST", { month, day }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const listAccounts = useCallback(async () => {
    setLoading(true);
    try { return await apiFetch("/v1/accounting:accounts:list"); }
    catch (e) { setError(e.message); return { ok: false, accounts: [] }; }
    finally { setLoading(false); }
  }, []);

  const createAccount = useCallback(async (payload) => {
    setLoading(true);
    try { return await apiFetch("/v1/accounting:accounts:create", "POST", payload); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
    finally { setLoading(false); }
  }, []);

  const deleteAccount = useCallback(async (id) => {
    try { return await apiFetch("/v1/accounting:accounts:delete", "POST", { id }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  // Chart of Accounts
  const listCoaTemplates = useCallback(async () => {
    try { return await apiFetch("/v1/accounting:coa:templates"); }
    catch (e) { setError(e.message); return { ok: false, templates: [] }; }
  }, []);

  const listCoa = useCallback(async () => {
    setLoading(true);
    try { return await apiFetch("/v1/accounting:coa:list"); }
    catch (e) { setError(e.message); return { ok: false, accounts: [] }; }
    finally { setLoading(false); }
  }, []);

  const applyCoaTemplate = useCallback(async ({ templateId, replaceExisting = false }) => {
    setLoading(true);
    try { return await apiFetch("/v1/accounting:coa:applyTemplate", "POST", { templateId, replaceExisting }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
    finally { setLoading(false); }
  }, []);

  const createCoa = useCallback(async (payload) => {
    try { return await apiFetch("/v1/accounting:coa:create", "POST", payload); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const updateCoa = useCallback(async (payload) => {
    try { return await apiFetch("/v1/accounting:coa:update", "POST", payload); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const deleteCoa = useCallback(async (id) => {
    try { return await apiFetch("/v1/accounting:coa:delete", "POST", { id }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  // Statements & transactions
  const parseStatement = useCallback(async (fileId) => {
    setLoading(true);
    // Client-side watchdog — give the parser 4 minutes (longer than the
    // worst-case multi-page Claude call) before we surface an error. Without
    // this the UI sits on a spinner forever if the request stalls.
    const controller = new AbortController();
    const watchdog = setTimeout(() => controller.abort(), 4 * 60 * 1000);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || "vault";
      const res = await fetch(`${API_BASE}/v1/accounting:statements:parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ fileId }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (e) {
      const msg = e.name === "AbortError"
        ? "Parser took longer than 4 minutes — try a single-month PDF instead of a multi-month statement."
        : e.message;
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      clearTimeout(watchdog);
      setLoading(false);
    }
  }, []);

  const commitStatement = useCallback(async (payload) => {
    setLoading(true);
    try { return await apiFetch("/v1/accounting:statements:commit", "POST", payload); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
    finally { setLoading(false); }
  }, []);

  const listTransactions = useCallback(async ({ status = "all", limit = 200 } = {}) => {
    try { return await apiFetch(`/v1/accounting:transactions:list?status=${status}&limit=${limit}`); }
    catch (e) { setError(e.message); return { ok: false, transactions: [] }; }
  }, []);

  const tagTransaction = useCallback(async (payload) => {
    try { return await apiFetch("/v1/accounting:transactions:tag", "POST", payload); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  const listApprovals = useCallback(async ({ status = "pending", limit = 100 } = {}) => {
    try { return await apiFetch(`/v1/accounting:controller:approvals?status=${status}&limit=${limit}`); }
    catch (e) { setError(e.message); return { ok: false, approvals: [] }; }
  }, []);

  const decideApproval = useCallback(async ({ approvalId, decision, reason } = {}) => {
    try { return await apiFetch("/v1/accounting:controller:decide", "POST", { approvalId, decision, reason }); }
    catch (e) { setError(e.message); return { ok: false, error: e.message }; }
  }, []);

  return {
    getSetupState, updateSetupStep,
    getFiscalYear, setFiscalYear,
    listAccounts, createAccount, deleteAccount,
    listCoaTemplates, listCoa, applyCoaTemplate, createCoa, updateCoa, deleteCoa,
    parseStatement, commitStatement, listTransactions, tagTransaction,
    listApprovals, decideApproval,
    loading, error,
  };
}
