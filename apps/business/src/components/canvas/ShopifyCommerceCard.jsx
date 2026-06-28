/**
 * ShopifyCommerceCard.jsx — Shopify store snapshot in the worker canvas.
 * Signal: card:shopify-commerce   Data: live from /shopify:revenue + /shopify:orders
 *
 * Trump Rule: numbers first — KPI tiles lead, then the recent-orders list.
 * Shows a connect-CTA when the store isn't linked yet.
 */

import React, { useState, useEffect, useCallback } from "react";
import CanvasCardShell from "./CanvasCardShell";
import { useShopifyStatus, getShopifyRevenue, getShopifyOrders, connectShopify } from "../../hooks/useShopify";

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Number(n).toFixed(2)}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_COLOR = {
  paid: "#16a34a",
  partially_paid: "#d97706",
  pending: "#64748b",
  refunded: "#dc2626",
  voided: "#94a3b8",
};

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || "#94a3b8";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color, background: `${color}14`,
      border: `1px solid ${color}30`, borderRadius: 20, padding: "1px 7px",
      textTransform: "uppercase", letterSpacing: 0.4,
    }}>{status || "unknown"}</span>
  );
}

function KpiTile({ label, value, sub }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ConnectPrompt({ onConnect }) {
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function handleConnect() {
    const s = shop.trim();
    if (!s) { setErr("Enter your store domain"); return; }
    setLoading(true); setErr(null);
    try {
      await onConnect(s);
    } catch (e) {
      setErr(e.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px 0", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🛍</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Connect your Shopify store</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>
        Link your store so workers can surface revenue, orders, and customer insights here.
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <input
          value={shop}
          onChange={e => setShop(e.target.value)}
          placeholder="mystore.myshopify.com"
          style={{
            padding: "8px 12px", fontSize: 13, borderRadius: 8,
            border: "1px solid #e2e8f0", outline: "none", width: 220,
          }}
          onKeyDown={e => e.key === "Enter" && handleConnect()}
        />
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 700,
            background: "#7c3aed", color: "#fff", border: "none",
            borderRadius: 8, cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Connecting…" : "Connect"}
        </button>
      </div>
      {err && <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626" }}>{err}</div>}
    </div>
  );
}

export default function ShopifyCommerceCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const days = p.days || 30;

  const { status, refresh: refreshStatus } = useShopifyStatus();
  const [revenue, setRevenue] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, ord] = await Promise.all([
        getShopifyRevenue({ days }),
        getShopifyOrders({ limit: 8 }),
      ]);
      setRevenue(rev);
      setOrders(Array.isArray(ord.orders) ? ord.orders : []);
    } catch {
      // not connected or network error — status hook handles it
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (status.connected) load();
    else setLoading(status.loading);
  }, [status.connected, status.loading, load]);

  async function handleConnect(shop) {
    await connectShopify(shop);
    await refreshStatus();
    await load();
  }

  const title = p.title || (status.shop ? `${status.shop.replace(".myshopify.com", "")} · Shopify` : "Shopify Store");

  return (
    <CanvasCardShell title={title} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss} loading={loading && status.connected}>
      {!status.loading && !status.connected ? (
        <ConnectPrompt onConnect={handleConnect} />
      ) : (
        <>
          {/* KPI row */}
          {revenue && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
              <KpiTile label={`Revenue (${days}d)`} value={fmt(revenue.total_revenue)} />
              <KpiTile label="Orders" value={String(revenue.order_count)} />
              <KpiTile label="Avg order" value={fmt(revenue.avg_order_value)} />
            </div>
          )}

          {/* Top products */}
          {revenue?.top_products?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Top products</div>
              {revenue.top_products.map((tp, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                  <span style={{ color: "#1e293b", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tp.title}</span>
                  <span style={{ color: "#7c3aed", fontWeight: 700, marginLeft: 12, flexShrink: 0 }}>{tp.quantity} sold</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent orders */}
          {orders.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Recent orders</div>
              {orders.map((o, i) => (
                <div key={o.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                    #{o.order_number}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {o.customer_name || "Guest"}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(o.created_at)} · {o.line_item_count} item{o.line_item_count !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{fmt(o.total_price)}</div>
                    <StatusBadge status={o.financial_status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !revenue && orders.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
              No orders yet — your store is connected and ready.
            </div>
          )}
        </>
      )}
    </CanvasCardShell>
  );
}
