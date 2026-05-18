import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useAccounting from "../hooks/useAccounting";
import useDocuments from "../hooks/useDocuments";
import SuggestImprovementButton from "../components/SuggestImprovementButton";

const TABS = [
  { id: "dashboard",   label: "Dashboard" },
  { id: "accounts",    label: "Connected Accounts" },
  { id: "transactions",label: "Transactions" },
  { id: "coa",         label: "Chart of Accounts" },
  { id: "approvals",   label: "Approvals" },
  { id: "invoices",    label: "Invoices & Bills" },
  { id: "reports",     label: "Reports" },
  { id: "tax",         label: "Tax & Filing" },
];

// Setup checklist — persistent, never blocking. Sean's call 2026-05-13:
// accounting onboarding is async; users start, leave, return. Each step is
// independently completable in any order. Stays visible until dismissed.
const SETUP_STEPS = [
  { id: "connect-bank",     label: "Connect at least one bank account",      goTab: "accounts" },
  { id: "pick-coa",         label: "Pick a Chart of Accounts template",      goTab: "coa" },
  { id: "categorize-30",    label: "Categorize your first 30 transactions",  goTab: "transactions" },
  { id: "fiscal-year",      label: "Set fiscal year start date",             goTab: "dashboard" },
  { id: "upload-history",   label: "Upload 6 months of historical statements (optional)", goTab: "accounts" },
  { id: "first-recurring",  label: "Tag your first recurring vendor",        goTab: "transactions" },
];

const CLASSIFICATION_LABEL = {
  expense: "Expense",
  revenue: "Revenue",
  internal_transfer: "Transfer",
  refund: "Refund",
  fee: "Fee",
};
const CLASSIFICATION_COLOR = {
  expense:           { bg: "#fee2e2", fg: "#991b1b" },
  revenue:           { bg: "#dcfce7", fg: "#166534" },
  internal_transfer: { bg: "#e0e7ff", fg: "#3730a3" },
  refund:            { bg: "#dbeafe", fg: "#1e40af" },
  fee:               { bg: "#fef3c7", fg: "#92400e" },
};

const ACCOUNT_TYPES = [
  { id: "checking",    label: "Checking" },
  { id: "savings",     label: "Savings" },
  { id: "credit_card", label: "Credit Card" },
  { id: "stripe",      label: "Stripe (Payments + Payouts)" },
  { id: "paypal",      label: "PayPal Business" },
  { id: "merchant",    label: "Other Merchant / Processor (Square, etc.)" },
  { id: "payroll",     label: "Payroll (Gusto, ADP)" },
  { id: "other",       label: "Other" },
];

function workspaceLabel() {
  const id = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
  if (!id) return "Personal Vault";
  const display = localStorage.getItem("TENANT_NAME") || localStorage.getItem("WORKSPACE_NAME");
  return display || id;
}

function formatCurrency(n, ccy = "USD") {
  if (n === null || n === undefined || isNaN(n)) return "—";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(n); }
  catch { return `$${n.toFixed(2)}`; }
}

export default function Accounting() {
  const [tab, setTab] = useState("dashboard");
  // Fiscal year filter — defaults to current calendar year. "all" shows
  // everything. Wired to ReportsPane today; other panes pick it up next pass.
  // Named selectedYear to avoid colliding with useAccounting().setFiscalYear
  // which is the setup-step endpoint setter.
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [setupState, setSetupState] = useState({ steps: {}, dismissed: false });
  const [accounts, setAccounts] = useState([]);
  const [coa, setCoa] = useState([]);
  const [coaTemplates, setCoaTemplates] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showFiscalYear, setShowFiscalYear] = useState(false);
  const {
    getSetupState, updateSetupStep,
    getFiscalYear, setFiscalYear,
    listAccounts, createAccount, deleteAccount,
    listCoaTemplates, listCoa, applyCoaTemplate, createCoa, updateCoa, deleteCoa,
    listTransactions: listTransactionsTop,
    getDashboardSummary,
    loading,
  } = useAccounting();

  const refreshSetup = useCallback(async () => {
    const r = await getSetupState();
    if (r?.ok || r?.steps) setSetupState({ steps: r.steps || {}, dismissed: !!r.dismissed });
  }, [getSetupState]);

  const refreshAccounts = useCallback(async () => {
    const r = await listAccounts();
    if (r?.ok) setAccounts(r.accounts || []);
  }, [listAccounts]);

  const refreshCoa = useCallback(async () => {
    const r = await listCoa();
    if (r?.ok) setCoa(r.accounts || []);
  }, [listCoa]);

  const refreshCoaTemplates = useCallback(async () => {
    const r = await listCoaTemplates();
    if (r?.ok) setCoaTemplates(r.templates || []);
  }, [listCoaTemplates]);

  const refreshAllTransactions = useCallback(async () => {
    const r = await listTransactionsTop({ status: "all", limit: 500 });
    if (r?.ok) setAllTransactions(r.transactions || []);
  }, [listTransactionsTop]);

  useEffect(() => { refreshSetup(); refreshAccounts(); refreshCoa(); refreshCoaTemplates(); refreshAllTransactions(); }, [refreshSetup, refreshAccounts, refreshCoa, refreshCoaTemplates, refreshAllTransactions]);
  useEffect(() => {
    const onWorkspace = () => { refreshSetup(); refreshAccounts(); refreshCoa(); refreshAllTransactions(); };
    // Any committed mutation (statement commit, CoA edit, account change, recurring tag)
    // fires "ta:accounting-changed". Re-fetch setup state + transactions so the
    // banner and dashboard reflect truth instead of stale snapshots.
    const onChanged = () => { refreshSetup(); refreshAllTransactions(); };
    window.addEventListener("ta:workspace-changed", onWorkspace);
    window.addEventListener("ta:accounting-changed", onChanged);
    return () => {
      window.removeEventListener("ta:workspace-changed", onWorkspace);
      window.removeEventListener("ta:accounting-changed", onChanged);
    };
  }, [refreshSetup, refreshAccounts, refreshCoa, refreshAllTransactions]);

  const completedSteps = useMemo(() => {
    return SETUP_STEPS.filter(s => setupState.steps?.[s.id]).length;
  }, [setupState]);

  const toggleStep = async (stepId) => {
    const done = !setupState.steps?.[stepId];
    setSetupState(prev => ({ ...prev, steps: { ...prev.steps, [stepId]: done } }));
    await updateSetupStep({ stepId, done });
  };

  const dismissBanner = async () => {
    setSetupState(prev => ({ ...prev, dismissed: true }));
    await updateSetupStep({ dismissed: true });
  };

  return (
    <div>
      {/* Top bar */}
      <div className="pageHeader" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <h1 className="h1" style={{ margin: 0 }}>Accounting</h1>
          <span
            title="Active workspace — accounting data is isolated per workspace"
            style={{
              padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: "#ede9fe", color: "#6d28d9", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
            {workspaceLabel()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
          <SuggestImprovementButton workerSlug="platform-accounting" />
        </div>
      </div>

      {/* Setup complete celebration — shows once when user hits 6/6.
          Stays visible until dismissed so the milestone gets acknowledged
          instead of the banner just silently vanishing. */}
      {!setupState.dismissed && completedSteps === SETUP_STEPS.length && (
        <div
          className="card"
          style={{
            padding: 18,
            marginBottom: 16,
            background: "linear-gradient(120deg, #ede9fe 0%, #dbeafe 60%, #dcfce7 100%)",
            border: "1px solid #c4b5fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 999,
                background: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 18px rgba(124, 58, 237, 0.25)",
                fontSize: 24,
              }}
              aria-hidden
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Setup complete — you're live.</div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                Your Accounting worker is fully wired. Upload statements anytime; the chat will produce P&L, Cash Flow, and variance reports on demand and save them to your Drive.
              </div>
            </div>
          </div>
          <button
            onClick={dismissBanner}
            style={{ fontSize: 12, color: "#6d28d9", background: "white", border: "1px solid #c4b5fd", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Got it
          </button>
        </div>
      )}

      {/* Setup checklist banner — persistent, dismissible, never modal */}
      {!setupState.dismissed && completedSteps < SETUP_STEPS.length && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "#faf5ff", border: "1px solid #e9d5ff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6d28d9" }}>
                Setup · {completedSteps} of {SETUP_STEPS.length} complete
              </div>
              <div style={{ width: 140, height: 6, borderRadius: 999, background: "#e9d5ff", overflow: "hidden" }}>
                <div style={{ width: `${(completedSteps / SETUP_STEPS.length) * 100}%`, height: "100%", background: "#7c3aed", transition: "width 0.3s ease" }} />
              </div>
            </div>
            <button onClick={dismissBanner} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
              Dismiss
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
            {SETUP_STEPS.map(step => {
              const done = !!setupState.steps?.[step.id];
              return (
                <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "white" }}>
                  <input type="checkbox" checked={done} onChange={() => toggleStep(step.id)} style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: 13, color: done ? "#94a3b8" : "#1e293b", textDecoration: done ? "line-through" : "none", flex: 1 }}>
                    {step.label}
                  </span>
                  {!done && (
                    <button
                      onClick={() => {
                        if (step.id === "fiscal-year") setShowFiscalYear(true);
                        else setTab(step.goTab);
                      }}
                      style={{ fontSize: 11, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                    >
                      Open →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fiscal year selector — last 3 fiscal years + All time. Auto-computed
          from the current year; will respect fiscalYearStart once tied in. */}
      <FiscalYearBar value={selectedYear} onChange={setSelectedYear} />

      {/* Tabs — wrap to second row instead of horizontal scroll. Sean called
          out the scrollbar as suboptimal 2026-05-14. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent",
              color: tab === t.id ? "#7c3aed" : "#64748b", cursor: "pointer", marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      {tab === "dashboard" && <DashboardPane accounts={accounts} transactions={allTransactions} getDashboardSummary={getDashboardSummary} />}
      {tab === "accounts" && (
        <AccountsPane
          accounts={accounts}
          loading={loading}
          onAdd={() => setShowAddAccount(true)}
          onDelete={async (id) => {
            await deleteAccount(id);
            refreshAccounts();
            window.dispatchEvent(new Event("ta:accounting-changed"));
          }}
        />
      )}
      {tab === "transactions" && (
        <TransactionsPane coa={coa} />
      )}
      {tab === "approvals" && <ApprovalsPane />}
      {tab === "coa" && (
        <ChartOfAccountsPane
          coa={coa}
          templates={coaTemplates}
          loading={loading}
          onApplyTemplate={async (templateId, replaceExisting) => {
            const r = await applyCoaTemplate({ templateId, replaceExisting });
            if (r?.ok) { refreshCoa(); window.dispatchEvent(new Event("ta:accounting-changed")); }
            return r;
          }}
          onCreate={async (payload) => { const r = await createCoa(payload); if (r?.ok) { refreshCoa(); window.dispatchEvent(new Event("ta:accounting-changed")); } return r; }}
          onUpdate={async (payload) => { const r = await updateCoa(payload); if (r?.ok) { refreshCoa(); window.dispatchEvent(new Event("ta:accounting-changed")); } return r; }}
          onDelete={async (id) => { const r = await deleteCoa(id); if (r?.ok) { refreshCoa(); window.dispatchEvent(new Event("ta:accounting-changed")); } return r; }}
        />
      )}
      {tab === "invoices" && <ComingSoonPane title="Invoices & Bills" body="Two-pane view: invoices you've issued (AR) on one side, bills you owe (AP) on the other. Coming after Transactions." />}
      {tab === "reports" && <ReportsPane fiscalYear={selectedYear} />}
      {tab === "tax" && <ComingSoonPane title="Tax & Filing" body="1099 prep, quarterly estimates, accountant handoff packet. Ships once categorized transactions exist." />}

      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onSubmit={async (payload) => {
            const r = await createAccount(payload);
            if (r?.ok) {
              setShowAddAccount(false);
              refreshAccounts();
              window.dispatchEvent(new Event("ta:accounting-changed"));
            }
            return r;
          }}
        />
      )}

      {showFiscalYear && (
        <FiscalYearModal
          getFiscalYear={getFiscalYear}
          onClose={() => setShowFiscalYear(false)}
          onSubmit={async ({ month, day }) => {
            const r = await setFiscalYear({ month, day });
            if (r?.ok) {
              setShowFiscalYear(false);
              window.dispatchEvent(new Event("ta:accounting-changed"));
            }
            return r;
          }}
        />
      )}
    </div>
  );
}

function FiscalYearModal({ getFiscalYear, onClose, onSubmit }) {
  // Most US businesses pick January 1 — let it be the default but expose the
  // full month/day picker for fiscal-year offsets (Apple = Oct, Govt = Oct,
  // Stripe = Dec, etc.).
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => {
    (async () => {
      const r = await getFiscalYear();
      if (r?.fiscalYearStart) {
        const [mm, dd] = r.fiscalYearStart.split("-").map(s => parseInt(s, 10));
        if (mm) setMonth(mm);
        if (dd) setDay(dd);
      }
    })();
  }, [getFiscalYear]);
  const submit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setErr(null);
    const r = await onSubmit({ month, day });
    setSaving(false);
    if (!r?.ok) setErr(r?.error || "Failed to save");
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 12, padding: 24, width: 440, maxWidth: "92vw", boxShadow: "0 20px 50px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>Fiscal year start date</h2>
        <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
          Pick the first day of your fiscal year. Most US businesses use January 1. Reports and tax filings will key off this date.
        </p>
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
              Month
              <select value={month} onChange={e => setMonth(parseInt(e.target.value, 10))} style={{ ...inputStyle, marginTop: 4 }}>
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
              Day
              <input type="number" min={1} max={31} value={day} onChange={e => setDay(parseInt(e.target.value, 10) || 1)} style={{ ...inputStyle, marginTop: 4 }} />
            </label>
          </div>
          {err && <div style={{ color: "#dc2626", fontSize: 12 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 14px", background: "white", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#64748b" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: "8px 16px", background: "#7c3aed", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              {saving ? "Saving…" : "Save fiscal year"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardPane({ accounts, getDashboardSummary }) {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const load = useCallback(async () => {
    setLoadingSummary(true);
    const r = await getDashboardSummary?.();
    if (r?.ok) setSummary(r);
    setLoadingSummary(false);
  }, [getDashboardSummary]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("ta:accounting-changed", refresh);
    return () => window.removeEventListener("ta:accounting-changed", refresh);
  }, [load]);

  const fromCents = (c) => typeof c === "number" ? formatCurrency(c / 100) : "—";
  const cashCents = summary?.cashOnHand?.cents;
  const cashHint = summary?.cashOnHand?.source === "balanceSnapshot"
    ? "From imported balance sheet"
    : summary?.cashOnHand?.source === "connectedAccounts"
    ? "Sum across connected accounts"
    : "No connected accounts or balance sheet yet";

  const burn30Hint = summary?.burn30d?.transactionCount
    ? `${summary.burn30d.transactionCount} transactions in last 30 days`
    : "No transactions in last 30 days";

  const avgBurnLabel = summary?.avgMonthlyBurn?.cents ? "Avg monthly burn" : "Avg monthly burn";
  const avgBurnHint = summary?.avgMonthlyBurn?.cents
    ? `${summary.avgMonthlyBurn.monthsObserved}-month rolling average`
    : "Need 12 months of categorized data";

  const runwayValue = summary?.runway?.months != null
    ? (summary.runway.months >= 1
        ? `${summary.runway.months.toFixed(1)} mo`
        : `${Math.round(summary.runway.months * 30)} days`)
    : "—";
  const runwayHint = summary?.runway?.hint || "Cash ÷ burn — needs both inputs";

  const forwardRateValue = summary?.forwardRunRate?.cents
    ? fromCents(summary.forwardRunRate.cents) + "/mo"
    : "—";
  const forwardRateHint = summary?.forwardRunRate?.cents
    ? `From ${summary.forwardRunRate.year || "imported"} forward budget`
    : "Import a forward budget";

  const liabilitiesValue = summary?.totalLiabilities?.cents != null
    ? fromCents(summary.totalLiabilities.cents)
    : "—";
  const liabilitiesHint = summary?.totalLiabilities?.cents != null
    ? "From imported balance sheet"
    : "No balance sheet on file";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      <KPI label="Cash on hand" value={loadingSummary ? "…" : fromCents(cashCents)} hint={cashHint} />
      <KPI label="Burn (30d)" value={loadingSummary ? "…" : fromCents(summary?.burn30d?.cents)} hint={burn30Hint} />
      <KPI label={avgBurnLabel} value={loadingSummary ? "…" : fromCents(summary?.avgMonthlyBurn?.cents)} hint={avgBurnHint} />
      <KPI label="Forward run rate" value={loadingSummary ? "…" : forwardRateValue} hint={forwardRateHint} />
      <KPI label="Runway" value={loadingSummary ? "…" : runwayValue} hint={runwayHint} />
      <KPI label="Total liabilities" value={loadingSummary ? "…" : liabilitiesValue} hint={liabilitiesHint} />
      <KPI label="MRR" value="—" hint="Connect Stripe to populate" />
      <KPI label="Unpaid invoices" value="—" hint="No invoices feature yet" />
    </div>
  );
}

function KPI({ label, value, hint }) {
  return (
    <div className="card" style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function AccountsPane({ accounts, loading, onAdd, onDelete }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          {accounts.length} connected account{accounts.length === 1 ? "" : "s"}. Plaid auto-sync ships this week — for now, add accounts manually so other tabs can see them.
        </div>
        <button
          onClick={onAdd}
          className="iconBtn"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          + Add Account
        </button>
      </div>
      {loading && <div className="card" style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Loading…</div>}
      {!loading && accounts.length === 0 && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="13" rx="2"></rect>
              <path d="M2 10h20"></path>
              <path d="M6 14h4"></path>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>No connected accounts yet</div>
          <div style={{ fontSize: 14, color: "#64748b", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Connect your operating bank, credit card, Stripe, or payroll provider. Add manually now; full Plaid integration ships this week.
          </div>
          <button onClick={onAdd} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 10, cursor: "pointer" }}>
            Add your first account
          </button>
        </div>
      )}
      {!loading && accounts.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(180px, 1.4fr) minmax(120px, 1fr) minmax(80px, 0.6fr) minmax(120px, 1fr) 80px",
            padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
            fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4,
          }}>
            <div>Name</div><div>Type</div><div>•••• </div><div style={{ textAlign: "right" }}>Balance</div><div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {accounts.map(a => (
            <div key={a.id} style={{
              display: "grid", gridTemplateColumns: "minmax(180px, 1.4fr) minmax(120px, 1fr) minmax(80px, 0.6fr) minmax(120px, 1fr) 80px",
              padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#1e293b" }}>{a.name}</div>
                {a.institution && <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.institution}</div>}
              </div>
              <div style={{ color: "#475569" }}>{ACCOUNT_TYPES.find(t => t.id === a.type)?.label || a.type}</div>
              <div style={{ color: "#94a3b8", fontFamily: "monospace" }}>{a.last4 ? `••${a.last4}` : "—"}</div>
              <div style={{ textAlign: "right", color: "#1e293b", fontWeight: 600 }}>{typeof a.balance === "number" ? formatCurrency(a.balance, a.currency) : "—"}</div>
              <div style={{ textAlign: "right" }}>
                <button onClick={() => onDelete(a.id)} style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Reports tab — lists accounting reports auto-archived to Drive by the chat
// (canvasArchive mirrors every card:accounting-* payload to a markdown file
// under accounting/reports/ on the workspace's storageObjects). This is the
// "where do my Cash Flow / P&L / Balance Sheet artifacts live" surface the
// chat keeps referring to.
function ReportsPane({ fiscalYear = "all" }) {
  const { listDocuments, downloadFile, deleteDocument } = useDocuments();
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [openContent, setOpenContent] = useState("");
  const [openUrl, setOpenUrl] = useState("");
  const [openFormat, setOpenFormat] = useState("");
  const [openLoading, setOpenLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Match Drive's call signature — orgId-only (no scope filter) — to use
    // the indexed query path. Filter accounting-specific objects client-side
    // from the workspace-wide result.
    const r = await listDocuments({ limit: 200 });
    const all = Array.isArray(r?.objects) ? r.objects : [];
    // Accounting reports are now written as .xlsx (P&L, Cash Flow, Balance
    // Sheet, CoA) or .pdf (invoices) by canvasArchive. Legacy .md files
    // from before that migration are filtered OUT here — they were plain
    // text snapshots with no formulas and are functionally orphaned in the
    // new flow. Users only see downloadable Excel + PDF artifacts.
    let filtered = all.filter(o => {
      // Suppress superseded reports (dedup pattern in canvasArchive).
      if (o.status && o.status !== "active") return false;
      const name = (o.filename || "").toLowerCase();
      const mime = (o.mimeType || "").toLowerCase();
      const tags = Array.isArray(o.tags) ? o.tags.map(t => String(t).toLowerCase()) : [];
      // Hide legacy markdown reports — they predate the .xlsx/.pdf rewrite
      // and provide no actionable artifact to the user.
      if (name.endsWith(".md") || mime.includes("markdown")) return false;
      if (tags.includes("accounting")) return true;
      if (/^(pl|balance-sheet|cashflow|invoice|coa)-/.test(name)) return true;
      return false;
    });
    // Fiscal year filter — prefer the structured reportPeriodYear field set by
    // canvasArchive. Fall back to filename year parsing for legacy reports
    // that pre-date the metadata patch.
    if (fiscalYear && fiscalYear !== "all") {
      filtered = filtered.filter(o => {
        if (o.reportPeriodYear) return String(o.reportPeriodYear) === String(fiscalYear);
        const m = (o.filename || "").match(/-(\d{4})-\d{2}-\d{2}/);
        if (!m) return true;
        return m[1] === String(fiscalYear);
      });
    }
    // Map storage's objectId → id so the rest of the component can use a
    // consistent field name.
    const normalized = filtered.map(o => ({ ...o, id: o.objectId || o.id }));
    normalized.sort((a, b) => {
      const at = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const bt = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return bt - at;
    });
    console.log("[ReportsPane] storage:list returned", all.length, "objects;", filtered.length, "matched accounting filter (fiscalYear=" + fiscalYear + ")");
    setReports(normalized);
    setLoading(false);
  }, [listDocuments, fiscalYear]);

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener("ta:accounting-changed", onChanged);
    return () => window.removeEventListener("ta:accounting-changed", onChanged);
  }, [refresh]);

  // Detect the file's display format. Prefer the structured reportFormat
  // metadata canvasArchive writes; fall back to the filename extension so
  // legacy .md reports still preview correctly.
  const formatOf = (obj = {}) => {
    if (obj.reportFormat) return String(obj.reportFormat).toLowerCase();
    const m = String(obj.filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : "";
  };

  const openReport = async (obj) => {
    if (openId === obj.id) { setOpenId(null); setOpenContent(""); setOpenUrl(""); setOpenFormat(""); return; }
    const fmt = formatOf(obj);
    setOpenId(obj.id);
    setOpenContent("");
    setOpenUrl("");
    setOpenFormat(fmt);
    setOpenLoading(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || "vault";
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const meta = await fetch(`${apiBase}/v1/storage:download?objectId=${obj.id}`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
      }).then(r => r.json());
      if (!meta?.ok || !meta?.downloadUrl) {
        setOpenContent(meta?.error || "Could not load report.");
        return;
      }
      setOpenUrl(meta.downloadUrl);
      // .md preview keeps the inline markdown renderer for legacy reports.
      // .pdf renders inline via <iframe>. .xlsx can't preview in-browser —
      // we surface a Download button only.
      if (fmt === "md") {
        const txt = await fetch(meta.downloadUrl).then(r => r.text());
        setOpenContent(txt);
      }
    } catch (e) {
      setOpenContent(`Error: ${e.message}`);
    } finally {
      setOpenLoading(false);
    }
  };

  const reportTypeLabel = (filename = "") => {
    const f = filename.toLowerCase();
    if (f.startsWith("cashflow-")) return "Cash Flow";
    if (f.startsWith("pl-")) return "Profit & Loss";
    if (f.startsWith("balance-sheet-")) return "Balance Sheet";
    if (f.startsWith("invoice-")) return "Invoice";
    if (f.startsWith("coa-")) return "Chart of Accounts";
    return "Report";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Reports</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Cash Flow, P&L, Balance Sheet, and other reports the chat generates are saved here automatically.
          </div>
        </div>
        <button onClick={refresh} style={{ fontSize: 12, color: "#7c3aed", background: "white", border: "1px solid #c4b5fd", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
          Refresh
        </button>
      </div>
      {loading && <div style={{ fontSize: 13, color: "#64748b" }}>Loading reports…</div>}
      {!loading && reports.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#475569", marginBottom: 8, fontWeight: 600 }}>No reports yet</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Ask the Accounting chat for a Cash Flow projection, P&L, or Balance Sheet — it will be saved here automatically.
          </div>
        </div>
      )}
      {!loading && reports.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {reports.map((r, i) => {
            const created = r.createdAt?._seconds ? new Date(r.createdAt._seconds * 1000) : (r.createdAtMs ? new Date(r.createdAtMs) : null);
            const dateStr = created ? created.toLocaleDateString() : "—";
            const isOpen = openId === r.id;
            return (
              <div key={r.id} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 60px 110px 110px", padding: "12px 16px", alignItems: "center", fontSize: 13, gap: 12 }}>
                  <div style={{ fontWeight: 600, color: "#7c3aed" }}>{reportTypeLabel(r.filename || r.name)}</div>
                  <div style={{ color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {/* Prefer the structured displayTitle set by canvasArchive
                        ("P&L · Q1 2026 · projection"). Fall back to filename
                        for legacy reports archived before the metadata patch. */}
                    {r.displayTitle || r.filename || r.name || "—"}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {(formatOf(r) || "—").toUpperCase()}
                  </div>
                  <div style={{ color: "#64748b" }}>{dateStr}</div>
                  <div style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={() => openReport(r)} style={{ fontSize: 12, color: "#7c3aed", background: "none", border: "1px solid #c4b5fd", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                      {isOpen ? "Hide" : "Open"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(r)}
                      title="Delete this report"
                      style={{ fontSize: 12, color: "#dc2626", background: "none", border: "1px solid #fecaca", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: "16px 24px 24px", background: "white", borderTop: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                      <button
                        onClick={() => downloadFile(r.objectId || r.id)}
                        style={{ fontSize: 12, color: "white", background: "#7c3aed", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                      >
                        Download {openFormat ? `.${openFormat}` : ""}
                      </button>
                    </div>
                    {openLoading && <div style={{ fontSize: 13, color: "#64748b" }}>Loading…</div>}
                    {!openLoading && openFormat === "md" && <RenderedMarkdown source={openContent} />}
                    {!openLoading && openFormat === "pdf" && openUrl && (
                      <iframe
                        title={r.displayTitle || r.filename || "report"}
                        src={openUrl}
                        style={{ width: "100%", height: 640, border: "1px solid #e2e8f0", borderRadius: 6, background: "white" }}
                      />
                    )}
                    {!openLoading && openFormat === "xlsx" && (
                      <div style={{ fontSize: 13, color: "#475569", padding: "8px 0" }}>
                        Spreadsheet reports open in Excel, Numbers, or Google Sheets. Use the Download button above to save a copy.
                      </div>
                    )}
                    {!openLoading && openContent && openFormat !== "md" && (
                      <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{openContent}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation — soft-deletes the storage object so the row
          drops out of the list immediately. Storage.deleteObject handles the
          GCS hard-delete; Firestore row is marked status:"deleted" which the
          list filter already drops. */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: 440, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Delete this report?</div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.5 }}>
              <strong>{confirmDelete.displayTitle || confirmDelete.filename}</strong>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>This removes the file from Drive. You can always re-generate it by asking Accounting chat.</div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
              <button
                onClick={async () => {
                  const id = confirmDelete.objectId || confirmDelete.id;
                  setDeletingId(id);
                  try {
                    const r = await deleteDocument(id);
                    if (r?.ok) {
                      setReports(prev => prev.filter(x => (x.objectId || x.id) !== id));
                      if (openId === id) { setOpenId(null); setOpenContent(""); setOpenUrl(""); setOpenFormat(""); }
                    }
                  } finally {
                    setDeletingId(null);
                    setConfirmDelete(null);
                  }
                }}
                disabled={deletingId === (confirmDelete.objectId || confirmDelete.id)}
                style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "#dc2626", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                {deletingId === (confirmDelete.objectId || confirmDelete.id) ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal markdown renderer for the subset canvasArchive produces:
// # / ## / ### headings, **bold**, *italic*, GitHub-flavored tables with
// alignment, bulleted lists, and paragraphs. Avoids a full dep on marked/
// react-markdown for ~3KB of JSON instead of ~40KB of library.
function RenderedMarkdown({ source = "" }) {
  const lines = String(source).split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    // Table: header row | --- separator | body rows
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const header = line.split("|").map(c => c.trim()).filter(Boolean);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(c => c !== undefined && c !== ""));
        i++;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^(#+)/)[1].length;
      blocks.push({ kind: "h", level, text: line.replace(/^#+\s+/, "") });
      i++;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    blocks.push({ kind: "p", text: line });
    i++;
  }

  const inline = (text) =>
    String(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");

  return (
    <div style={{ fontSize: 14, lineHeight: 1.55, color: "#1e293b" }}>
      {blocks.map((b, idx) => {
        if (b.kind === "h") {
          const sizes = { 1: 22, 2: 18, 3: 15 };
          return <div key={idx} style={{ fontSize: sizes[b.level], fontWeight: 700, color: "#0f172a", marginTop: idx === 0 ? 0 : 18, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: inline(b.text) }} />;
        }
        if (b.kind === "ul") {
          return (
            <ul key={idx} style={{ margin: "8px 0 12px", paddingLeft: 20 }}>
              {b.items.map((it, j) => <li key={j} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: inline(it) }} />)}
            </ul>
          );
        }
        if (b.kind === "table") {
          return (
            <div key={idx} style={{ marginBottom: 16, overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    {b.header.map((h, j) => (
                      <th key={j} style={{ background: "#faf5ff", color: "#6d28d9", textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e9d5ff", fontWeight: 700 }} dangerouslySetInnerHTML={{ __html: inline(h) }} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {r.map((c, cIdx) => {
                        const isNumeric = /^\*?\*?[-+]?\$?[0-9,.]+\*?\*?$/.test(c.trim());
                        return (
                          <td key={cIdx} style={{ padding: "8px 12px", textAlign: isNumeric ? "right" : "left", fontVariantNumeric: isNumeric ? "tabular-nums" : "normal" }} dangerouslySetInnerHTML={{ __html: inline(c) }} />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={idx} style={{ margin: "8px 0" }} dangerouslySetInnerHTML={{ __html: inline(b.text) }} />;
      })}
    </div>
  );
}

// FiscalYearBar — pill-row selector for the last 3 fiscal years + "All time".
// Computed from current calendar year (will read tenants.fiscalYearStart in a
// later pass to handle non-Jan-1 fiscal years).
function FiscalYearBar({ value, onChange }) {
  const thisYear = new Date().getFullYear();
  const years = [String(thisYear), String(thisYear - 1), String(thisYear - 2)];
  const opts = [...years, "all"];
  const label = (y) => y === "all" ? "All time" : `FY ${y}`;
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600, marginRight: 4 }}>Fiscal year</span>
      {opts.map(y => (
        <button
          key={y}
          onClick={() => onChange(y)}
          style={{
            padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 999,
            border: value === y ? "1px solid #7c3aed" : "1px solid #e2e8f0",
            background: value === y ? "#ede9fe" : "white",
            color: value === y ? "#6d28d9" : "#475569",
            cursor: "pointer",
          }}
        >
          {label(y)}
        </button>
      ))}
    </div>
  );
}

function ComingSoonPane({ title, body }) {
  return (
    <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#64748b", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

function TransactionsPane({ coa }) {
  const [staged, setStaged] = useState(null); // { fileId, fileName, institution, accountLast4, transactions: [...] }
  const [prebuiltStaged, setPrebuiltStaged] = useState(null); // { fileId, fileName, sheets, rollup }
  const [committed, setCommitted] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const fileInputRef = useRef(null);
  const { parseStatement, commitStatement, commitPrebuilt, resetPrebuilt, getDashboardSummary, listTransactions, tagTransaction } = useAccounting();
  const { uploadFile } = useDocuments();

  const refreshTransactions = useCallback(async () => {
    const r = await listTransactions({ status: "all", limit: 200 });
    if (r?.ok) setCommitted(r.transactions || []);
  }, [listTransactions]);

  useEffect(() => { refreshTransactions(); }, [refreshTransactions]);

  const expenseCoa = useMemo(() => coa.filter(c => ["expense", "revenue"].includes(c.type)), [coa]);

  const handleFile = async (file) => {
    setError(null);
    if (!file) return;
    const isPdf = file.type.includes("pdf") || (file.name || "").toLowerCase().endsWith(".pdf");
    const isXlsx = file.type.includes("spreadsheet") || (file.name || "").toLowerCase().endsWith(".xlsx");
    if (!isPdf && !isXlsx) {
      setError("Supported formats: PDF bank statements, XLSX pre-built financials.");
      return;
    }
    // CoA is required for PDF statement categorization. XLSX pre-built
    // financials carry their own categorization in the sheet structure
    // and don't need the tenant CoA to be populated first.
    if (isPdf && coa.length === 0) {
      setError("Add a Chart of Accounts first — the parser categorizes transactions against your categories.");
      return;
    }
    setParsing(true);
    setProgress("Uploading statement…");
    try {
      const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || "vault";
      const uploadResult = await uploadFile({
        file,
        scope: tenantId && tenantId !== "vault" ? "org" : "personal",
        orgId: tenantId && tenantId !== "vault" ? tenantId : undefined,
        subdir: "statements",
        tags: ["statement"],
      });
      if (!uploadResult?.ok) throw new Error(uploadResult?.error || "Upload failed");
      setProgress(isXlsx
        ? "Reading workbook sheet by sheet…"
        : "Reading statement with Claude (this can take 30–60 seconds for multi-page PDFs)…");
      const parsed = await parseStatement(uploadResult.objectId);
      if (!parsed?.ok) throw new Error(parsed?.error || "Parse failed");

      // Pre-built financials xlsx: render the parse plan, not the PDF
      // transaction-review table.
      if (parsed.kind === "prebuilt") {
        setPrebuiltStaged({
          fileId: uploadResult.objectId,
          fileName: file.name,
          sheets: parsed.sheets || [],
          rollup: parsed.rollup || {},
        });
        return;
      }

      setStaged({
        fileId: uploadResult.objectId,
        fileName: file.name,
        institution: parsed.institution,
        accountLast4: parsed.accountLast4,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        truncated: parsed.truncated,
        // Default selection: only auto-select expense/revenue rows. Internal
        // transfers and refunds are unselected by default because they should
        // be reviewed (or filtered out entirely from P&L).
        transactions: (parsed.transactions || []).map(t => ({
          ...t,
          _selected: ["expense", "revenue"].includes(t.classification || "expense"),
        })),
        showAll: false,
      });
    } catch (e) {
      setError(e.message || "Failed to process statement");
    } finally {
      setParsing(false);
      setProgress(null);
    }
  };

  const commitStaged = async () => {
    if (!staged) return;
    const toCommit = staged.transactions.filter(t => t._selected).map(t => ({
      date: t.date, description: t.description, amountCents: t.amountCents,
      direction: t.direction, coaAccountId: t.coaAccountId || null, coaConfidence: t.coaConfidence,
    }));
    if (toCommit.length === 0) { setError("Select at least one transaction to commit."); return; }
    setParsing(true);
    setError(null);
    try {
      const r = await commitStatement({
        fileId: staged.fileId,
        fileName: staged.fileName,
        institution: staged.institution,
        accountLast4: staged.accountLast4,
        transactions: toCommit,
      });
      if (!r?.ok) throw new Error(r?.error || "Commit failed");
      setStaged(null);
      refreshTransactions();
      window.dispatchEvent(new Event("ta:accounting-changed"));
    } catch (e) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  // Toggle a sheet's include/exclude in the prebuilt parse plan.
  const togglePrebuiltSheet = (sheetName, defaultIncluded) => {
    setPrebuiltStaged(s => {
      const current = s.sheetActions || {};
      // If the user hasn't touched this sheet yet, its default is the
      // action's polarity. First click flips that.
      const wasIncluded = current[sheetName] != null ? current[sheetName] : defaultIncluded;
      return { ...s, sheetActions: { ...current, [sheetName]: !wasIncluded } };
    });
  };

  const confirmPrebuiltImport = async () => {
    if (!prebuiltStaged) return;
    setPrebuiltStaged(s => ({ ...s, committing: true, commitError: null }));
    const plan = { sheets: prebuiltStaged.sheets, rollup: prebuiltStaged.rollup };
    const r = await commitPrebuilt({
      fileId: prebuiltStaged.fileId,
      fileName: prebuiltStaged.fileName,
      plan,
      sheetActions: prebuiltStaged.sheetActions || {},
    });
    if (!r?.ok) {
      setPrebuiltStaged(s => ({ ...s, committing: false, commitError: r?.error || "Commit failed" }));
      return;
    }
    if (r.skipped) {
      setPrebuiltStaged(s => ({ ...s, committing: false, commitError: r.message || "This file was already imported." }));
      return;
    }
    setPrebuiltStaged(s => ({ ...s, committing: false, commitResult: r.written || {} }));
    refreshTransactions();
    window.dispatchEvent(new Event("ta:accounting-changed"));
  };

  // Pre-built financials review — announce-and-confirm surface. Per-sheet
  // toggles let the user override the auto-classification; Confirm import
  // writes to Firestore (transactions, balanceSnapshots, forwardBudgets).
  if (prebuiltStaged) {
    const { sheets, rollup, fileName, sheetActions = {}, committing, commitResult, commitError } = prebuiltStaged;
    const usd = (n) => (typeof n === "number" ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : String(n ?? ""));
    const actionLabel = (a) => ({
      "import-transactions": "Import as P&L line items",
      "import-balance": "Import as balance-sheet snapshot",
      "import-budget": "Import as forward budget",
      "skip": "Skip — not imported",
    }[a] || a);
    const actionColor = (a) => a === "skip" ? "#94a3b8" : "#7c3aed";

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Pre-built financials — parse review</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{fileName} · {sheets.length} sheet{sheets.length === 1 ? "" : "s"}</div>
          </div>
          <button onClick={() => setPrebuiltStaged(null)} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>Discard</button>
        </div>

        <div style={{ background: "#ecfdf5", border: "1px solid #34d399", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "#065f46" }}>
          <strong>Deterministic parse.</strong> Numbers below are read cell-by-cell from your file. Review the per-sheet plan, then click <strong>Confirm import</strong> to write transactions, the balance-sheet snapshot, and forward budgets to your books. Append-only — same file can't be imported twice.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
          {rollup.totalBusinessOpex != null && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Business OPEX (multi-year)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginTop: 6 }}>{usd(rollup.totalBusinessOpex)}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{rollup.totalTransactions} transactions across {Object.keys(rollup.opexByYear || {}).length} year{Object.keys(rollup.opexByYear || {}).length === 1 ? "" : "s"}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
                {Object.entries(rollup.opexByYear || {}).sort().map(([yr, amt]) => (
                  <div key={yr}>{yr}: {usd(amt)}</div>
                ))}
              </div>
            </div>
          )}

          {rollup.balanceSummary && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Balance sheet</div>
              {["assets", "liabilities", "equity"].map(k => {
                const s = rollup.balanceSummary[k];
                if (!s) return null;
                return (
                  <div key={k} style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", textTransform: "capitalize" }}>{k}</div>
                    <div style={{ fontSize: 14, color: "#1e293b" }}>{usd(s.knownTotal)} <span style={{ color: "#64748b", fontSize: 12 }}>{s.hasTBD ? "(+ TBD items)" : ""}</span></div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{s.items.length} line item{s.items.length === 1 ? "" : "s"}</div>
                  </div>
                );
              })}
            </div>
          )}

          {rollup.budgetSummary && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{rollup.budgetSummary.year || ""} Budget</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginTop: 6 }}>{usd(rollup.budgetSummary.monthlyRunRate)}<span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>/mo</span></div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>Period total: {usd(rollup.budgetSummary.periodTotal)}</div>
              <div style={{ fontSize: 13, color: "#475569" }}>Annualized: {usd(rollup.budgetSummary.annualTotal)}</div>
            </div>
          )}
        </div>

        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1e293b", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Sheet-by-sheet plan</span>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>Uncheck any sheet to exclude it from the import</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", fontSize: 12, color: "#64748b" }}>
                <th style={{ textAlign: "center", padding: "8px 14px", fontWeight: 500, width: 44 }}>Import</th>
                <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 500 }}>Sheet</th>
                <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 500 }}>Action</th>
                <th style={{ textAlign: "right", padding: "8px 14px", fontWeight: 500 }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map(s => {
                const defaultIncluded = s.action !== "skip";
                const userOverride = sheetActions[s.name];
                const included = userOverride != null ? userOverride : defaultIncluded;
                const detail =
                  s.action === "import-transactions" ? `${s.data?.transactionCount ?? 0} txns · ${usd(s.data?.grandTotal)}` :
                  s.action === "import-balance" ? `${(s.data?.lines || []).length} line items` :
                  s.action === "import-budget" ? `${(s.data?.lineItems || []).length} line items` :
                  s.reason || "—";
                const rowStyle = included
                  ? { borderTop: "1px solid #f1f5f9", fontSize: 13 }
                  : { borderTop: "1px solid #f1f5f9", fontSize: 13, opacity: 0.5, background: "#fafafa" };
                return (
                  <tr key={s.name} style={rowStyle}>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => togglePrebuiltSheet(s.name, defaultIncluded)}
                        disabled={s.action === "skip" || committing}
                        style={{ cursor: s.action === "skip" ? "not-allowed" : "pointer" }}
                        title={s.action === "skip" ? "Always skipped — informational sheet" : "Toggle import"}
                      />
                    </td>
                    <td style={{ padding: "10px 14px", color: "#1e293b", fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: "10px 14px", color: actionColor(s.action), fontWeight: 500 }}>{actionLabel(s.action)}</td>
                    <td style={{ padding: "10px 14px", color: "#475569", textAlign: "right" }}>{detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {commitError && (
          <div style={{ marginTop: 16, padding: 12, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, color: "#991b1b", fontSize: 13 }}>
            {commitError}
          </div>
        )}

        {commitResult ? (
          <div style={{ marginTop: 16, padding: 14, background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 6, color: "#166534" }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Import committed.</div>
            <div style={{ fontSize: 13 }}>
              {commitResult.transactions || 0} transactions · {commitResult.balanceSnapshots || 0} balance snapshot · {commitResult.forwardBudgets || 0} forward budget
              {commitResult.skipped?.length ? ` · ${commitResult.skipped.length} sheet${commitResult.skipped.length === 1 ? "" : "s"} skipped` : ""}
            </div>
            <button onClick={() => setPrebuiltStaged(null)} style={{ marginTop: 10, padding: "6px 12px", background: "#16a34a", color: "white", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={confirmPrebuiltImport}
              disabled={committing}
              style={{ padding: "10px 18px", background: committing ? "#a78bfa" : "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: committing ? "wait" : "pointer" }}
            >
              {committing ? "Writing to Firestore…" : "Confirm import"}
            </button>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Append-only. Re-uploading the same file will be detected and refused.
            </span>
          </div>
        )}
      </div>
    );
  }

  // Staged review state
  if (staged) {
    const classify = (cl) => cl || "expense";
    const counts = staged.transactions.reduce((a, t) => {
      const c = classify(t.classification);
      a[c] = (a[c] || 0) + 1;
      return a;
    }, {});
    const highConfRows = staged.transactions.filter(t => (t.coaConfidence || 0) >= 0.85 && classify(t.classification) !== "internal_transfer");
    const reviewRows   = staged.transactions.filter(t => (t.coaConfidence || 0) <  0.85 || !t.coaAccountId);
    const visibleRows  = staged.showAll ? staged.transactions : reviewRows;

    const bulkSet = (predicate, patch) => {
      setStaged(s => ({
        ...s,
        transactions: s.transactions.map(t => predicate(t) ? { ...t, ...patch } : t),
      }));
    };

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {staged.transactions.length} transactions extracted
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {staged.institution || "Unknown institution"}
              {staged.accountLast4 ? ` · ••${staged.accountLast4}` : ""}
              {staged.periodStart ? ` · ${staged.periodStart} → ${staged.periodEnd}` : ""}
              {" · "}{staged.fileName}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {Object.entries(counts).map(([c, n]) => (
                <span key={c} style={{
                  padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: CLASSIFICATION_COLOR[c]?.bg || "#f1f5f9",
                  color:      CLASSIFICATION_COLOR[c]?.fg || "#475569",
                }}>{CLASSIFICATION_LABEL[c] || c}: {n}</span>
              ))}
              {highConfRows.length > 0 && (
                <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "#ecfdf5", color: "#047857" }}>
                  {highConfRows.length} auto-categorized (≥0.85)
                </span>
              )}
              {reviewRows.length > 0 && (
                <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "#fff7ed", color: "#c2410c" }}>
                  {reviewRows.length} need review
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setStaged(null)} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>Discard all</button>
            <button
              onClick={() => bulkSet(t => classify(t.classification) === "internal_transfer", { _selected: false })}
              className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}
              title="Deselect every internal transfer — they shouldn't be in P&L"
            >Skip transfers</button>
            <button
              onClick={() => bulkSet(t => (t.coaConfidence || 0) >= 0.85 && classify(t.classification) !== "internal_transfer", { _selected: true })}
              className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}
            >Select auto-categorized</button>
            <button onClick={commitStaged} disabled={parsing} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: parsing ? 0.6 : 1 }}>
              {parsing ? "Saving…" : `Commit ${staged.transactions.filter(t => t._selected).length} selected`}
            </button>
          </div>
        </div>
        {error && <div className="card" style={{ padding: 12, marginBottom: 12, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>{error}</div>}
        {staged.truncated && (
          <div className="card" style={{ padding: 12, marginBottom: 12, background: "#fffbeb", color: "#92400e", fontSize: 13, border: "1px solid #fde68a" }}>
            ⚠ The statement was long and the parser may have stopped before the end. Commit what's here, then split the original PDF into single-month files and upload them one at a time to catch the rest.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12, color: "#64748b" }}>
          <div>
            Showing {visibleRows.length} of {staged.transactions.length} — {staged.showAll ? "all" : "needs-review only"}
          </div>
          <button
            onClick={() => setStaged(s => ({ ...s, showAll: !s.showAll }))}
            style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer", fontSize: 12 }}
          >{staged.showAll ? "Show needs-review only" : "Show all transactions"} →</button>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "40px 100px 1.4fr 90px 100px 200px",
            padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
            fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4,
          }}>
            <div></div><div>Date</div><div>Description</div><div>Type</div><div style={{ textAlign: "right" }}>Amount</div><div>Category</div>
          </div>
          {visibleRows.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "#64748b", fontSize: 13 }}>
              All rows are auto-categorized at high confidence. Nothing to review. Click <strong>Select auto-categorized</strong> then <strong>Commit</strong>.
            </div>
          )}
          {visibleRows.map((t) => {
            const origIdx = staged.transactions.indexOf(t);
            const cl = classify(t.classification);
            const conf = t.coaConfidence;
            const color = CLASSIFICATION_COLOR[cl] || CLASSIFICATION_COLOR.expense;
            return (
              <div key={origIdx} style={{
                display: "grid", gridTemplateColumns: "40px 100px 1.4fr 90px 100px 200px",
                padding: "10px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13,
                background: cl === "internal_transfer" ? "#f8fafc" : "white",
              }}>
                <input
                  type="checkbox" checked={!!t._selected}
                  onChange={() => setStaged(s => ({
                    ...s,
                    transactions: s.transactions.map((x, j) => j === origIdx ? { ...x, _selected: !x._selected } : x),
                  }))}
                />
                <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>{t.date || "—"}</div>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1e293b" }}>
                    {t.description || "—"}
                  </div>
                  {t.reviewNote && (
                    <div style={{ fontSize: 11, color: "#c2410c", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      ⚠ {t.reviewNote}
                    </div>
                  )}
                </div>
                <div>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: color.bg, color: color.fg, whiteSpace: "nowrap" }}>
                    {CLASSIFICATION_LABEL[cl] || cl}
                  </span>
                  {typeof conf === "number" && (
                    <div style={{ fontSize: 10, color: conf < 0.5 ? "#dc2626" : conf < 0.85 ? "#c2410c" : "#16a34a", marginTop: 2 }}>
                      {Math.round(conf * 100)}%
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", color: t.direction === "credit" ? "#16a34a" : "#1e293b", fontWeight: 600 }}>
                  {t.direction === "credit" ? "+" : "−"}
                  {formatCurrency(Math.abs(t.amountCents || 0) / 100)}
                </div>
                <div>
                  <select
                    value={t.coaAccountId || ""}
                    onChange={e => setStaged(s => ({
                      ...s,
                      transactions: s.transactions.map((x, j) => j === origIdx ? { ...x, coaAccountId: e.target.value || null } : x),
                    }))}
                    style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
                    disabled={cl === "internal_transfer"}
                  >
                    <option value="">{cl === "internal_transfer" ? "(no category — transfer)" : "Uncategorized"}</option>
                    {expenseCoa.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Empty / list state
  const doResetPrebuilt = async () => {
    const ok = window.confirm(
      "Delete ALL pre-built financial imports?\n\n" +
      "This removes every transaction, balance snapshot, and forward budget where source=import_prebuilt.\n\n" +
      "PDF-imported transactions are NOT affected. This action is logged in importEvents."
    );
    if (!ok) return;
    const r = await resetPrebuilt();
    if (!r?.ok) {
      setError(r?.error || "Reset failed");
      return;
    }
    refreshTransactions();
    window.dispatchEvent(new Event("ta:accounting-changed"));
    setError(null);
    window.alert(`Reset complete. Removed ${r.deleted?.transactions || 0} transactions, ${r.deleted?.balanceSnapshots || 0} balance snapshots, ${r.deleted?.forwardBudgets || 0} forward budgets.`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, color: "#64748b", flex: 1, minWidth: 240 }}>
          {committed.length} transaction{committed.length === 1 ? "" : "s"} on file. Drop a credit-card, PayPal, or bank PDF statement —
          or an XLSX with pre-built financials — and the worker reads it deterministically.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={doResetPrebuilt}
            className="iconBtn"
            title="Delete all pre-built financial imports (transactions, balance snapshots, forward budgets where source=import_prebuilt). PDF-imported data is not touched."
            style={{ background: "white", color: "#991b1b", border: "1px solid #fecaca", fontSize: 13 }}
          >
            Reset pre-built imports
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="iconBtn"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: parsing ? 0.6 : 1 }}
          >
            {parsing ? "Processing…" : "Upload statement (PDF or XLSX)"}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="application/pdf,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>
      {progress && (
        <div className="card" style={{ padding: 12, marginBottom: 12, background: "#faf5ff", color: "#6d28d9", fontSize: 13 }}>
          {progress}
        </div>
      )}
      {error && (
        <div className="card" style={{ padding: 12, marginBottom: 12, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}
      {committed.length === 0 && !parsing && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>No transactions yet</div>
          <div style={{ fontSize: 14, color: "#64748b", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            Upload your last month of credit-card statements to get started. The worker reads the PDF, extracts every line,
            and picks a category from your Chart of Accounts. You review and commit.
          </div>
        </div>
      )}
      {committed.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "100px 1.4fr 100px 160px 120px",
            padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
            fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4,
          }}>
            <div>Date</div><div>Description</div><div style={{ textAlign: "right" }}>Amount</div><div>Category</div><div style={{ textAlign: "right" }}>Recurring</div>
          </div>
          {committed.map(t => {
            const cat = coa.find(c => c.id === t.coaAccountId);
            return (
              <div key={t.id} style={{
                display: "grid", gridTemplateColumns: "100px 1.4fr 100px 160px 120px",
                padding: "10px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13,
              }}>
                <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>{t.date || "—"}</div>
                <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1e293b" }}>
                  {t.description || "—"}
                  {t.institution && <span style={{ marginLeft: 8, fontSize: 11, color: "#94a3b8" }}>{t.institution}{t.accountLast4 ? ` ••${t.accountLast4}` : ""}</span>}
                </div>
                <div style={{ textAlign: "right", color: t.direction === "credit" ? "#16a34a" : "#1e293b", fontWeight: 600 }}>
                  {t.direction === "credit" ? "+" : "−"}
                  {formatCurrency(Math.abs(t.amountCents || 0) / 100)}
                </div>
                <div style={{ color: cat ? "#475569" : "#94a3b8", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat?.name || "Uncategorized"}</div>
                <div style={{ textAlign: "right" }}>
                  <RecurringToggle
                    transaction={t}
                    onToggle={async (next) => {
                      await tagTransaction({ id: t.id, recurring: next.recurring, expectedNextDate: next.expectedNextDate, cadence: next.cadence });
                      refreshTransactions();
                      window.dispatchEvent(new Event("ta:accounting-changed"));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecurringToggle({ transaction, onToggle }) {
  // One-click: clicking "Mark recurring" commits with monthly + next-month
  // estimated date immediately. The cell width is too narrow for an inline
  // picker, and 90% of recurring vendors are monthly anyway. The persisted
  // badge below lets the user clear or refine cadence later (× to unset,
  // click cadence text to cycle through monthly → quarterly → annual).
  if (transaction.recurring) {
    const cycleCadence = () => {
      const order = ["monthly", "quarterly", "annual", "weekly"];
      const i = order.indexOf(transaction.cadence || "monthly");
      const next = order[(i + 1) % order.length];
      onToggle({ recurring: true, cadence: next, expectedNextDate: guessNextDate(transaction.date, next) });
    };
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#7c3aed" }} />
        <button
          onClick={cycleCadence}
          style={{ background: "none", border: "none", color: "#7c3aed", fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 600, textDecoration: "underline dotted" }}
          title="Click to change cadence"
        >
          {transaction.cadence || "monthly"}
        </button>
        <button
          onClick={() => onToggle({ recurring: false, expectedNextDate: null, cadence: null })}
          style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}
          title="Clear recurring flag"
        >×</button>
      </span>
    );
  }
  return (
    <button
      onClick={() => onToggle({ recurring: true, cadence: "monthly", expectedNextDate: guessNextDate(transaction.date, "monthly") })}
      style={{ fontSize: 11, color: "white", background: "#7c3aed", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
    >
      Mark recurring
    </button>
  );
}

function guessNextDate(lastDate, cadence) {
  if (!lastDate) return "";
  const d = new Date(lastDate);
  if (isNaN(d.getTime())) return "";
  if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else if (cadence === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (cadence === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1); // monthly default
  return d.toISOString().slice(0, 10);
}

function ApprovalsPane() {
  const [filter, setFilter] = useState("pending");
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decideBusy, setDecideBusy] = useState(null);
  const { listApprovals, decideApproval } = useAccounting();

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await listApprovals({ status: filter, limit: 100 });
    if (r?.ok) setApprovals(r.approvals || []);
    setLoading(false);
  }, [filter, listApprovals]);

  useEffect(() => { refresh(); }, [refresh]);

  const onDecide = async (approvalId, decision) => {
    setDecideBusy(approvalId);
    await decideApproval({ approvalId, decision });
    setDecideBusy(null);
    refresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          When the Marketing worker (or any cost-bearing action) hits a budget cap, the request lands here for explicit approval.
          Approve to re-fire the action with an override; reject to kill it. Every decision is audit-logged.
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["pending", "approved", "rejected", "all"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: filter === s ? "1px solid #7c3aed" : "1px solid #e2e8f0",
                background: filter === s ? "#ede9fe" : "white",
                color: filter === s ? "#6d28d9" : "#64748b",
              }}
            >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading && <div className="card" style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Loading…</div>}
      {!loading && approvals.length === 0 && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
            {filter === "pending" ? "No pending approvals" : `No ${filter} approvals`}
          </div>
          <div style={{ fontSize: 14, color: "#64748b", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            This is good. It means nothing is trying to spend beyond your monthly caps right now.
          </div>
        </div>
      )}

      {!loading && approvals.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {approvals.map(a => {
            const check = a.check || {};
            const estimated = formatCurrency((check.estimatedCents || 0) / 100);
            const spent = formatCurrency((check.spentMtdCents || 0) / 100);
            const cap = check.capCents ? formatCurrency(check.capCents / 100) : "no cap";
            const projected = formatCurrency(((check.spentMtdCents || 0) + (check.estimatedCents || 0)) / 100);
            return (
              <div key={a.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: a.status === "pending" ? "#fef3c7" : a.status === "approved" ? "#dcfce7" : "#fee2e2",
                        color: a.status === "pending" ? "#92400e" : a.status === "approved" ? "#166534" : "#991b1b",
                        textTransform: "uppercase", letterSpacing: 0.4,
                      }}>{a.status}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{actionLabel(a.action)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      {actionSummary(a.action, a.data)}
                    </div>
                  </div>
                  {a.status === "pending" && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => onDecide(a.id, "reject")}
                        disabled={decideBusy === a.id}
                        className="iconBtn"
                        style={{ background: "white", color: "#dc2626", border: "1px solid #fecaca", opacity: decideBusy === a.id ? 0.6 : 1 }}
                      >Reject</button>
                      <button
                        onClick={() => onDecide(a.id, "approve")}
                        disabled={decideBusy === a.id}
                        className="iconBtn"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: decideBusy === a.id ? 0.6 : 1 }}
                      >{decideBusy === a.id ? "…" : "Approve override"}</button>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, fontSize: 12 }}>
                  <Kv label="Estimated cost" value={estimated} />
                  <Kv label="Category"       value={check.category?.name || "—"} />
                  <Kv label="Spent (MTD)"    value={spent} />
                  <Kv label="Projected"      value={projected} highlight={check.reason === "cap_exceeded"} />
                  <Kv label="Monthly cap"    value={cap} />
                  <Kv label="Reason"         value={(check.reason || "").replace(/_/g, " ")} />
                </div>
                {a.executionResult && a.executionResult.error && (
                  <div style={{ marginTop: 10, padding: 10, fontSize: 12, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>
                    Approve failed: {a.executionResult.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kv({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, color: highlight ? "#dc2626" : "#1e293b", fontWeight: 600, marginTop: 1 }}>{value}</div>
    </div>
  );
}

function actionLabel(action) {
  switch (action) {
    case "sendEmailCampaign":  return "Send email campaign";
    case "scheduleSocialPost": return "Schedule social post (boost)";
    case "enqueueMessage":     return "Queue message";
    case "scheduleAdsBuy":     return "Ads buy";
    default: return action || "—";
  }
}

function actionSummary(action, data = {}) {
  if (action === "sendEmailCampaign") {
    const r = data.recipientCount || data.contacts?.length;
    return `"${data.subject || "(no subject)"}" → ${r ? r + " recipients" : "list " + (data.listId || "—")}`;
  }
  if (action === "scheduleSocialPost") {
    const platforms = (data.platforms || []).join(", ");
    return `${platforms || "social"} · ${data.boostBudgetCents ? `$${(data.boostBudgetCents/100).toFixed(2)} boost · ` : ""}${(data.content || "").slice(0, 100)}${data.content?.length > 100 ? "…" : ""}`;
  }
  if (action === "enqueueMessage") {
    return `${data.channel || "email"} → ${data.to || "—"} · ${(data.subject || data.body || "").slice(0, 80)}`;
  }
  return JSON.stringify(data).slice(0, 120);
}

const TYPE_LABELS = {
  revenue: "Revenue",
  expense: "Expense",
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
};
const TYPE_COLORS = {
  revenue:   { bg: "#dcfce7", fg: "#166534" },
  expense:   { bg: "#fee2e2", fg: "#991b1b" },
  asset:     { bg: "#dbeafe", fg: "#1e40af" },
  liability: { bg: "#fef3c7", fg: "#92400e" },
  equity:    { bg: "#ede9fe", fg: "#6d28d9" },
};

function ChartOfAccountsPane({ coa, templates, loading, onApplyTemplate, onCreate, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name, code, monthlyCapCents }

  // Empty state — template picker
  if (!loading && coa.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Pick a Chart of Accounts to get started. Templates seed standard categories with sensible monthly budget caps —
          edit anything afterward. Budget caps are how the Accounting worker enforces spend control on outbound campaigns
          (Marketing sends, ads buys) once Phase C ships.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {templates.map(tpl => (
            <div key={tpl.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{tpl.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, flex: 1 }}>{tpl.description}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{tpl.accountCount} accounts</div>
              <button
                onClick={async () => {
                  if (!confirm(`Apply "${tpl.name}" template? ${tpl.accountCount} categories will be added.`)) return;
                  await onApplyTemplate(tpl.id, false);
                }}
                className="iconBtn"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", marginTop: 4 }}
              >
                Apply template
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          {coa.length} {coa.length === 1 ? "category" : "categories"}. Monthly caps power the Controller pattern —
          when a worker tries to spend past a cap, it gets blocked until you approve.
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="iconBtn"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          + Add Category
        </button>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "60px 1.6fr 100px 140px 80px",
          padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
          fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4,
        }}>
          <div>Code</div><div>Name</div><div>Type</div><div style={{ textAlign: "right" }}>Monthly cap</div><div style={{ textAlign: "right" }}>Actions</div>
        </div>
        {coa.map(c => {
          const color = TYPE_COLORS[c.type] || TYPE_COLORS.expense;
          return (
            <div key={c.id} style={{
              display: "grid", gridTemplateColumns: "60px 1.6fr 100px 140px 80px",
              padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13,
            }}>
              <div style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 12 }}>{c.code || "—"}</div>
              <div style={{ color: "#1e293b", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div>
                <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: color.bg, color: color.fg }}>
                  {TYPE_LABELS[c.type] || c.type}
                </span>
              </div>
              <div style={{ textAlign: "right", color: c.monthlyCapCents ? "#1e293b" : "#94a3b8", fontWeight: 600 }}>
                {c.monthlyCapCents ? formatCurrency(c.monthlyCapCents / 100) : "—"}
              </div>
              <div style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => setEditing(c)} style={{ fontSize: 12, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Edit</button>
                <button onClick={async () => { if (confirm(`Archive "${c.name}"?`)) await onDelete(c.id); }} style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <CoaCategoryModal
          mode="create"
          onClose={() => setShowAdd(false)}
          onSubmit={async (payload) => {
            const r = await onCreate(payload);
            if (r?.ok) setShowAdd(false);
            return r;
          }}
        />
      )}
      {editing && (
        <CoaCategoryModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            const r = await onUpdate({ id: editing.id, ...payload });
            if (r?.ok) setEditing(null);
            return r;
          }}
        />
      )}
    </div>
  );
}

function CoaCategoryModal({ mode, initial, onClose, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [code, setCode] = useState(initial?.code || "");
  const [type, setType] = useState(initial?.type || "expense");
  const [capDollars, setCapDollars] = useState(
    initial?.monthlyCapCents != null ? String(initial.monthlyCapCents / 100) : ""
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e?.preventDefault?.();
    setErr(null);
    if (!name.trim()) { setErr("Name is required"); return; }
    const capCents = capDollars === "" ? null : Math.round(Number(capDollars) * 100);
    if (capDollars !== "" && (isNaN(capCents) || capCents < 0)) { setErr("Monthly cap must be a positive number"); return; }
    setBusy(true);
    const r = await onSubmit({ name: name.trim(), code: code.trim() || null, type, monthlyCapCents: capCents });
    setBusy(false);
    if (!r?.ok) setErr(r?.error || "Failed to save");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <form className="card" onClick={e => e.stopPropagation()} onSubmit={submit} style={{ width: "min(480px, 92vw)", padding: 24, background: "white" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>
          {mode === "edit" ? "Edit category" : "Add category"}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name *">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Marketing — Paid Ads" required style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Code">
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="5200" style={inputStyle} />
            </Field>
            <Field label="Type">
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Monthly cap (USD, optional)">
            <input
              type="number" step="0.01" min="0" value={capDollars}
              onChange={e => setCapDollars(e.target.value)}
              placeholder="5000.00"
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Leave blank for no cap. Caps gate outbound spend in Phase C.
            </div>
          </Field>
        </div>
        {err && <div style={{ marginTop: 10, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>Cancel</button>
          <button type="submit" disabled={busy} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddAccountModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [institution, setInstitution] = useState("");
  const [last4, setLast4] = useState("");
  const [balance, setBalance] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e?.preventDefault?.();
    setErr(null);
    if (!name) { setErr("Name is required"); return; }
    setBusy(true);
    const payload = {
      name: name.trim(),
      type,
      institution: institution.trim() || null,
      last4: (last4.match(/\d/g) || []).join("").slice(-4) || null,
      balance: balance === "" ? null : Number(balance),
    };
    const r = await onSubmit(payload);
    setBusy(false);
    if (!r?.ok) setErr(r?.error || "Failed to save");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <form className="card" onClick={e => e.stopPropagation()} onSubmit={submit} style={{ width: "min(480px, 92vw)", padding: 24, background: "white" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Add a connected account</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>Manual entry — Plaid auto-sync ships this week.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name *">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Mercury Operating, AmEx Platinum, Stripe…" required style={inputStyle} />
          </Field>
          <Field label="Type">
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              {ACCOUNT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Institution">
            <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Mercury, AmEx, Stripe…" style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Last 4 digits">
              <input type="text" inputMode="numeric" value={last4} onChange={e => setLast4(e.target.value)} placeholder="1234" maxLength={4} style={inputStyle} />
            </Field>
            <Field label="Current balance">
              <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" style={inputStyle} />
            </Field>
          </div>
        </div>
        {err && <div style={{ marginTop: 10, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>Cancel</button>
          <button type="submit" disabled={busy} className="iconBtn" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 12px", fontSize: 14,
  border: "1px solid #e2e8f0", borderRadius: 8, background: "white", outline: "none",
};

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
