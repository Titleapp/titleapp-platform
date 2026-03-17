import React, { useState, useEffect } from "react";

const TEAL = "#0B7A6E";
const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function isTestMode() {
  return window.location.pathname.includes("/sandbox") || window.location.search.includes("testMode=true");
}

export default function CartDrawer({ isOpen, onClose }) {
  const [cart, setCart] = useState([]);
  const [checking, setChecking] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);

  const bogoUsed = localStorage.getItem("ta_bogo_used") === "true";

  useEffect(() => {
    function refresh() {
      try { setCart(JSON.parse(localStorage.getItem("ta_cart") || "[]")); } catch { setCart([]); }
    }
    refresh();
    window.addEventListener("ta:cart-updated", refresh);
    return () => window.removeEventListener("ta:cart-updated", refresh);
  }, [isOpen]);

  function removeItem(slug) {
    const next = cart.filter(item => item.slug !== slug);
    localStorage.setItem("ta_cart", JSON.stringify(next));
    setCart(next);
    window.dispatchEvent(new CustomEvent("ta:cart-updated"));
  }

  // BOGO discount logic
  const bogoItems = cart.filter(item => item.bogoEligible);
  const bogoApplied = !bogoUsed && bogoItems.length >= 2;
  let discountedSlug = null;
  if (bogoApplied) {
    const sorted = [...bogoItems].sort((a, b) => a.price - b.price);
    discountedSlug = sorted[0].slug;
  }
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const discount = bogoApplied ? cart.find(item => item.slug === discountedSlug)?.price || 0 : 0;
  const total = subtotal - discount;

  async function handleCheckout() {
    setChecking(true);
    try {
      if (isTestMode()) {
        localStorage.setItem("ta_bogo_used", "true");
        localStorage.setItem("ta_cart", "[]");
        setCart([]);
        setCheckoutDone(true);
        window.dispatchEvent(new CustomEvent("ta:cart-updated"));
      } else {
        const token = localStorage.getItem("ID_TOKEN");
        const tenantId = localStorage.getItem("TENANT_ID");
        const res = await fetch(`${API_BASE}/api?path=/v1/worker:bogoCheckout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Tenant-Id": tenantId,
            "X-Vertical": "developer",
            "X-Jurisdiction": "GLOBAL",
          },
          body: JSON.stringify({
            items: cart.map(item => ({ slug: item.slug, price: item.price, bogoEligible: item.bogoEligible })),
            bogoDiscount: bogoApplied,
          }),
        });
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        localStorage.setItem("ta_bogo_used", "true");
        localStorage.setItem("ta_cart", "[]");
        setCart([]);
        setCheckoutDone(true);
        window.dispatchEvent(new CustomEvent("ta:cart-updated"));
      }
    } catch {
      if (isTestMode()) {
        localStorage.setItem("ta_bogo_used", "true");
        localStorage.setItem("ta_cart", "[]");
        setCart([]);
        setCheckoutDone(true);
        window.dispatchEvent(new CustomEvent("ta:cart-updated"));
      }
    }
    setChecking(false);
  }

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 380, maxWidth: "90vw", background: "white", zIndex: 9999, boxShadow: "-4px 0 20px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Cart ({cart.length})</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", padding: 4 }}>{"\u2715"}</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {checkoutDone ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{"\u2713"}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEAL, marginBottom: 8 }}>Subscriptions activated</div>
              <div style={{ fontSize: 14, color: "#64748b" }}>Your workers are ready in your Vault.</div>
              <button onClick={() => { setCheckoutDone(false); onClose(); }} style={{ marginTop: 20, padding: "10px 24px", background: TEAL, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Done
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{"\uD83D\uDED2"}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#64748b" }}>Your cart is empty</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Browse workers to get started.</div>
            </div>
          ) : (
            <>
              {/* BOGO upsell banner */}
              {!bogoUsed && bogoItems.length === 1 && (
                <div style={{ background: "rgba(11,122,110,0.06)", border: "1px solid rgba(11,122,110,0.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEAL }}>Add another worker to activate your free worker</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>BOGO: buy one, get one of equal or lesser value free.</div>
                </div>
              )}

              {/* Cart items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cart.map(item => {
                  const isFree = item.slug === discountedSlug;
                  return (
                    <div key={item.slug} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: isFree ? "rgba(11,122,110,0.04)" : "#fafbfc", borderRadius: 10, border: `1px solid ${isFree ? "rgba(11,122,110,0.2)" : "#f1f5f9"}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{item.suite}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {isFree ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, color: "#94a3b8", textDecoration: "line-through" }}>${item.price / 100}/mo</span>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: TEAL, color: "white" }}>FREE</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>${item.price / 100}/mo</span>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.slug)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: "0 4px" }}>{"\u2715"}</button>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                  <span>Subtotal</span>
                  <span>${subtotal / 100}/mo</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TEAL, fontWeight: 600, marginBottom: 4 }}>
                    <span>BOGO Discount</span>
                    <span>-${discount / 100}/mo</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "#1e293b", marginTop: 8 }}>
                  <span>Total</span>
                  <span>${total / 100}/mo</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && !checkoutDone && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={handleCheckout}
              disabled={checking}
              style={{ width: "100%", padding: "14px 24px", background: checking ? "#94A3B8" : TEAL, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: checking ? "default" : "pointer" }}
            >
              {checking ? "Processing..." : `Checkout — $${total / 100}/mo`}
            </button>
            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>14-day free trial on all subscriptions.</div>
          </div>
        )}
      </div>
    </>
  );
}
