import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// CODEX 50.13 Layer C — six-class asset taxonomy. Each Firestore DTC
// `type` value maps to one user-visible class. Future types added at
// worker registration extend this map (and ship as part of the worker's
// catalog entry).
export const ASSET_CLASS_OF = {
  vehicle: "Vehicles",
  property: "Real Property",
  credential: "Credentials",
  // Future types (not yet registered as live):
  // commercial_property: "Real Property", land: "Real Property", lease: "Real Property",
  // aircraft: "Vehicles", vessel: "Vehicles", commercial_fleet: "Vehicles",
  // art: "Personal Assets", collectibles: "Personal Assets", jewelry: "Personal Assets",
  // professional_license: "Credentials", certification: "Credentials",
  // entity_formation: "Business Records", operating_agreement: "Business Records",
  // inspection_report: "Compliance", audit_finding: "Compliance", permit: "Compliance",
};

export const ASSET_CLASSES = [
  "Real Property",
  "Vehicles",
  "Personal Assets",
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
export function useDtcCatalog() {
  const [dtcs, setDtcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantId, setTenantId] = useState(() => localStorage.getItem("TENANT_ID") || null);

  useEffect(() => {
    function onWorkspaceChange() {
      setTenantId(localStorage.getItem("TENANT_ID") || null);
    }
    window.addEventListener("ta:workspace-changed", onWorkspaceChange);
    return () => window.removeEventListener("ta:workspace-changed", onWorkspaceChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        if (tenantId) headers["x-tenant-id"] = tenantId;
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
