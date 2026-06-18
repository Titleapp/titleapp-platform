import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

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
  // Future types (not yet registered as live):
  // commercial_property: "Real Property", land: "Real Property", lease: "Real Property",
  // commercial_fleet: "Vehicles",
  // professional_license: "Credentials", certification: "Credentials",
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
