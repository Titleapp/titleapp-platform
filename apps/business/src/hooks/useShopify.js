/**
 * useShopify.js — Frontend hook for the Shopify connector.
 *
 * Endpoints used:
 *   POST /v1/shopify:authUrl    { shop } → { ok, authUrl }
 *   GET  /v1/shopify:callback   (redirect target — handled by ShopifyAuthCallback)
 *   GET  /v1/shopify:status     → { connected, shop, connectedAt }
 *   POST /v1/shopify:disconnect → { ok, disconnected }
 *   GET  /v1/shopify:orders     → { ok, orders }
 *   GET  /v1/shopify:revenue    → { ok, total_revenue, order_count, ... }
 *   GET  /v1/shopify:customers  → { ok, customers }
 */

import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

async function shopifyApi(action, method = "GET", body = null, qs = "") {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const tenantId = localStorage.getItem("CURRENT_TENANT_ID") || localStorage.getItem("TENANT_ID") || "";
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
  };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const url = `${API_BASE}/v1/shopify:${action}${qs}`;
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `shopify:${action} failed (${res.status})`);
  }
  return res.json();
}

export function useShopifyStatus() {
  const [status, setStatus] = useState({ connected: false, shop: null, loading: true });

  const refresh = useCallback(async () => {
    setStatus(s => ({ ...s, loading: true }));
    try {
      const res = await shopifyApi("status");
      setStatus({
        connected: !!res.connected,
        shop: res.shop || null,
        connectedAt: res.connectedAt || null,
        loading: false,
      });
    } catch {
      setStatus({ connected: false, shop: null, loading: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, refresh };
}

/**
 * Open the Shopify OAuth popup.
 * shop: "mystore.myshopify.com" (or with/without https://)
 * Listens for postMessage from ShopifyAuthCallback with success/error.
 */
export async function connectShopify(shop) {
  const res = await shopifyApi("authUrl", "POST", { shop });
  if (!res.ok || !res.authUrl) throw new Error(res.error || "Failed to start Shopify connection");

  const popup = window.open(res.authUrl, "shopify-auth", "width=700,height=800");
  if (!popup) throw new Error("Popup blocked. Allow popups for this site and try again.");

  return new Promise((resolve, reject) => {
    let resolved = false;
    const handler = (event) => {
      if (!event.data || event.data.type !== "shopify-auth-result") return;
      window.removeEventListener("message", handler);
      resolved = true;
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.error || "Shopify connection failed"));
    };
    window.addEventListener("message", handler);

    const pollClose = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(pollClose);
          if (!resolved) {
            window.removeEventListener("message", handler);
            reject(new Error("Connection cancelled."));
          }
        }
      } catch {}
    }, 500);
  });
}

export async function disconnectShopify() {
  return await shopifyApi("disconnect", "POST", {});
}

export async function getShopifyOrders(opts = {}) {
  const qs = `?limit=${opts.limit || 20}${opts.since ? `&since=${opts.since}` : ""}`;
  return await shopifyApi("orders", "GET", null, qs);
}

export async function getShopifyRevenue(opts = {}) {
  const qs = `?days=${opts.days || 30}`;
  return await shopifyApi("revenue", "GET", null, qs);
}

export async function getShopifyCustomers(opts = {}) {
  const qs = `?limit=${opts.limit || 50}`;
  return await shopifyApi("customers", "GET", null, qs);
}
