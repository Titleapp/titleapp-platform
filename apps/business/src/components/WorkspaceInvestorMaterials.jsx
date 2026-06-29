import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, opts = {}) {
  let token = null;
  try {
    if (auth.currentUser) token = await auth.currentUser.getIdToken();
  } catch { /* ignore */ }
  if (!token) token = localStorage.getItem("ID_TOKEN");
  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

// Materials catalog. Items render when their `url` resolves to a truthy value.
// If url is null/undefined the item still renders with a "shared directly"
// placeholder so the investor knows the material exists.
// Material URLs that aren't set show "Sean will share directly" rather than a
// broken link. The office hours URL was originally hardcoded to a phantom
// cal.com path that 404'd — investors got a "Page does not exist" page when
// they clicked. URLs now ship in only when known-good. The right long-term
// fix is reading these from the fundraise's tenant config so each round can
// override.
// Key names MUST match the fundraises/{id}.materials field suffixes:
// deckUrl / whitepaperUrl / dataRoomUrl / officeHoursUrl. The merge in `items`
// computes cfg[key + "Url"], so the key here = field-name minus "Url".
const MATERIAL_DEFAULTS = {
  deck:        { title: "Pre-seed deck",          subtitle: "12-slide thesis + traction",               icon: "📊" },
  whitepaper:  { title: "SOCIII whitepaper",      subtitle: "Architecture, patents, vertical roll-out", icon: "📄", url: "https://sociii.ai/whitepaper" },
  dataRoom:    { title: "Data room",              subtitle: "Financials, cap table, formation docs",    icon: "🗂" },
  officeHours: { title: "Office hours with Sean", subtitle: "30 min, async OK",                         icon: "📅" },
};

export default function WorkspaceInvestorMaterials() {
  const [loading, setLoading] = useState(true);
  const [investorInvite, setInvestorInvite] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const [materialsConfig, setMaterialsConfig] = useState(null);

  const load = useCallback(async () => {
    try {
      // Investor materials surface — render when the user has either
      // (a) an active investor invite with verify-identity completed
      //     (still in onboarding but past KYC), or
      // (b) an active investor_portal entitlement (signed + entitled).
      // Materials URLs come from /v1/investor:materials which reads from
      // the fundraise doc's materials.{deck,whitepaper,dataRoom,office} —
      // per-fundraise overrides instead of platform-wide defaults. Falls
      // back to null (renders as "Sean will share directly" placeholder)
      // when no URL is set.
      const [invitesData, matData] = await Promise.all([
        apiFetch("/v1/invites:all", { method: "GET" }),
        apiFetch("/v1/investor:materials", { method: "GET" }),
      ]);
      if (!mountedRef.current) return;
      const invites = Array.isArray(invitesData?.invites) ? invitesData.invites : [];
      const inv = invites.find(i =>
        i.role === "investor" &&
        Array.isArray(i.pendingObligations) &&
        i.pendingObligations.some(o => o.id === "verify-identity" && o.completedAt)
      );
      const mats = Array.isArray(matData?.materials) ? matData.materials : [];
      // Only count GENUINE investor access. The /investor:materials endpoint
      // also returns a founder/admin's own fundraises via an admin bypass
      // (tagged viaAdmin:true) so they can preview the data room — but that
      // must NOT bolt the investor "Your access" banner onto the founder's
      // Vault/Dashboard. Filter those out: the banner shows for a real
      // investor invite (a) or a non-admin entitlement (b) only.
      const investorMats = mats.filter((m) => !m.viaAdmin);
      setInvestorInvite(inv || (investorMats.length > 0 ? { role: "investor", _viaEntitlement: true } : null));
      setMaterialsConfig(investorMats[0] || null);
    } catch {
      if (mountedRef.current) { setInvestorInvite(null); setMaterialsConfig(null); }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => {
    if (!investorInvite) return [];
    // Materials URLs are now configurable per-fundraise. Fall back to
    // MATERIAL_DEFAULTS where the fundraise hasn't set one. URLs that
    // remain null show as "Sean will share directly" placeholders.
    const cfg = materialsConfig || {};
    return Object.entries(MATERIAL_DEFAULTS).map(([key, m]) => ({
      key,
      ...m,
      url: cfg[key + "Url"] || m.url || null,
    }));
  }, [investorInvite, materialsConfig]);

  if (dismissed) return null;
  if (loading) return null;
  if (!investorInvite) return null;

  const S = {
    wrap: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, margin: "12px 16px 0" },
    head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    eyebrow: { color: "#0686D4", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
    title: { fontSize: 16, fontWeight: 700, color: "#1a202c", marginTop: 2 },
    sub: { fontSize: 13, color: "#475569", lineHeight: 1.5, marginTop: 4 },
    dismiss: { background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, padding: 4 },
    grid: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 },
    card: { padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, textDecoration: "none", color: "#1a202c", display: "flex", flexDirection: "column", gap: 2 },
    cardLink: { cursor: "pointer" },
    cardPlaceholder: { background: "#fff", borderStyle: "dashed", color: "#64748b", cursor: "default" },
    icon: { fontSize: 22, marginBottom: 6 },
    itemTitle: { fontSize: 14, fontWeight: 600 },
    itemSub: { fontSize: 12, color: "#64748b" },
    itemNote: { fontSize: 11, color: "#94a3b8", marginTop: 4, fontStyle: "italic" },
  };

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <div style={S.eyebrow}>Investor materials · SOCIII pre-seed</div>
          <div style={S.title}>Your access</div>
          <div style={S.sub}>Everything you need to evaluate the round, in one place.</div>
        </div>
        <button style={S.dismiss} onClick={() => setDismissed(true)} title="Hide for now">×</button>
      </div>
      <div style={S.grid}>
        {items.map(item => {
          const hasUrl = !!item.url;
          const cardStyle = hasUrl
            ? { ...S.card, ...S.cardLink }
            : { ...S.card, ...S.cardPlaceholder };
          const Wrapper = hasUrl ? "a" : "div";
          const wrapperProps = hasUrl ? { href: item.url, target: "_blank", rel: "noopener noreferrer" } : {};
          return (
            <Wrapper key={item.key} style={cardStyle} {...wrapperProps}>
              <div style={S.icon}>{item.icon}</div>
              <div style={S.itemTitle}>{item.title}</div>
              <div style={S.itemSub}>{item.subtitle}</div>
              {!hasUrl && <div style={S.itemNote}>Sean will share directly</div>}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
