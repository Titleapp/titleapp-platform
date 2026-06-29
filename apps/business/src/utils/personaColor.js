// personaColor.js — ONE source of truth for per-persona colors, so every place a
// persona or its workers are shown (sidebar header, nav worker rows, dashboard
// grid, canvas) uses the exact same color. Vault is always emerald ("yours");
// each business workspace gets a deterministic color from its id.

export const PERSONA_PALETTE = [
  ["#0ea5e9", "#2563eb"], ["#f59e0b", "#ea580c"], ["#8b5cf6", "#7c3aed"],
  ["#ec4899", "#db2777"], ["#14b8a6", "#0d9488"], ["#6366f1", "#4f46e5"],
  ["#ef4444", "#dc2626"],
];

export function isPersonalTenant(tenantId) {
  return !tenantId || tenantId === "vault" || tenantId === "personal" || String(tenantId).startsWith("guest-");
}

// Returns a [from, to] gradient pair for a persona. Same seed → same color.
export function personaTintFor(seed, isPersonal) {
  if (isPersonal || isPersonalTenant(seed)) return ["#10b981", "#059669"];
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PERSONA_PALETTE[h % PERSONA_PALETTE.length];
}

// The active persona's tint, read from the current tenant in localStorage.
export function currentPersonaTint() {
  let t = null;
  try { t = localStorage.getItem("TENANT_ID"); } catch { /* SSR / blocked */ }
  return personaTintFor(t, isPersonalTenant(t));
}

export function gradient(tint) {
  return `linear-gradient(135deg, ${tint[0]} 0%, ${tint[1]} 100%)`;
}
