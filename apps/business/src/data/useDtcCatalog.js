import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

// CODEX 50.13 Layer C — six-class asset taxonomy. Each Firestore DTC
// `type` value maps to one user-visible class. Future types added at
// worker registration extend this map (and ship as part of the worker's
// catalog entry).
export const ASSET_CLASS_OF = {
  vehicle: "Vehicles",
  aircraft: "Vehicles",
  aircraft_logbook: "Vehicles",
  vessel: "Vehicles",
  property: "Real Property",
  credential: "Credentials",
  art: "Personal Assets",
  watch: "Personal Assets",
  jewelry: "Personal Assets",
  collectible: "Personal Assets",
  personal_property: "Personal Assets",
  equity: "Personal Assets",
  // Health ("my health" pillar) — medical records, same DTC + logbook substrate.
  medical_record: "Health",
  medical_certificate: "Health",
  immunization: "Health",
  lab_result: "Health",
  prescription: "Health",
  health_visit: "Health",
  allergy: "Health",
  // Education ("my education" pillar) — degrees, training, courses, ratings.
  // Same learning-record substrate as the student use case (Sarah Kahele).
  education_record: "Education",
  degree: "Education",
  training_record: "Education",
  course: "Education",
  academic_record: "Education",
  pilot_currency: "Education",
  // Money ("my money" pillar) — accounts + liabilities feed the net-worth rollup.
  bank_account: "Money",
  investment_account: "Money",
  retirement_account: "Money",
  crypto_account: "Money",
  liability: "Money",
  lease: "Real Property",
  pet_health: "Health",
  // Business/company records (S52.53) — a title agency's E&O policy, license,
  // etc. are company obligations, not "my stuff" the way a watch or a car is.
  license: "Credentials", // e.g. a TDI title insurance license — a credential, same as a degree
  insurance: "Compliance", // e.g. an E&O policy — a regulatory/audit-facing obligation, not a personal belonging
  // Future types:
  // commercial_property: "Real Property", land: "Real Property",
  // commercial_fleet: "Vehicles",
  // entity_formation: "Business Records", operating_agreement: "Business Records",
  // inspection_report: "Compliance", audit_finding: "Compliance", permit: "Compliance",
};

export const ASSET_CLASSES = [
  "Real Property",
  "Vehicles",
  "Personal Assets",
  "Health",
  "Education",
  "Money",
  "Credentials",
  "Business Records",
  "Compliance",
];

function assetClassOf(type) {
  return ASSET_CLASS_OF[type] || "Personal Assets";
}

// Fetches via the existing /v1/dtc:list endpoint (auth-required, scoped
// to the user + active tenant). Re-fetches when TENANT_ID changes via
// the persona switcher.
// MY VAULT is "my stuff only" — ALWAYS the personal vault, never the active
// business persona/workspace. The user has multiple personas (business
// workspaces); the Vault is not one of them. So we pin tenant "vault"
// regardless of the workspace switcher — your health/stuff/money/education are
// always here, no matter which persona you're wearing.
const PERSONAL_VAULT_TENANT = "vault";

export function useDtcCatalog() {
  const [dtcs, setDtcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        headers["x-tenant-id"] = PERSONAL_VAULT_TENANT;
        const res = await fetch(`${API_BASE}/api?path=/v1/dtc:list`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (data?.ok && Array.isArray(data.dtcs)) {
          setDtcs(data.dtcs.map(d => ({ ...d, assetClass: assetClassOf(d.type) })));
        } else {
          setDtcs([]);
          if (data?.error) setError(data.error);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load DTCs");
          setDtcs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { dtcs, loading, error, tenantId: PERSONAL_VAULT_TENANT };
}

// S52.53 — business Vault query path. Unlike useDtcCatalog (always pinned to
// the personal "vault" tenant, unconditionally — see comment above), this
// queries whatever business tenantId is passed in, for the new business Vault
// view. Returns nothing (no fetch) when tenantId is missing/personal, since
// there's no business Vault to show outside a real business workspace.
export function useBusinessDtcCatalog(tenantId) {
  const [dtcs, setDtcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!tenantId || tenantId === PERSONAL_VAULT_TENANT || tenantId === "personal") {
      setDtcs([]); setLoading(false); setError(null);
      return;
    }
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        headers["x-tenant-id"] = tenantId;
        const res = await fetch(`${API_BASE}/api?path=/v1/dtc:list`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (data?.ok && Array.isArray(data.dtcs)) {
          setDtcs(data.dtcs.map(d => ({ ...d, assetClass: assetClassOf(d.type) })));
        } else {
          setDtcs([]);
          if (data?.error) setError(data.error);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load DTCs");
          setDtcs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tenantId]);

  return { dtcs, loading, error, tenantId };
}
