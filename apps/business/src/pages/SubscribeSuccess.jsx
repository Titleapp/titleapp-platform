import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { doc, getDoc, getFirestore } from "firebase/firestore";

// 49.32 — Reused for credit-pack success too. Reads ?type=credits&amount=N
// to render a credit-specific confirmation, polls the user doc until the
// webhook lands, then redirects.
export default function SubscribeSuccess() {
  const params = new URLSearchParams(window.location.search);
  const workerId = params.get("workerId");
  const type = params.get("type");
  const amount = params.get("amount");
  const isCredits = type === "credits";

  const [creditsAdded, setCreditsAdded] = useState(false);
  const [balance, setBalance] = useState(null);

  // For credits: poll the user doc up to ~12s waiting for the webhook to credit the pack.
  useEffect(() => {
    if (!isCredits) return;
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      try {
        const u = auth.currentUser;
        if (!u) return;
        const snap = await getDoc(doc(getFirestore(), "users", u.uid));
        if (!cancelled && snap.exists()) {
          const d = snap.data();
          const bal = d.prepaidCredits ?? d.billing?.prepaidCredits ?? 0;
          setBalance(bal);
          // Stamp localStorage so BillingPage shows the new total.
          localStorage.setItem("CREDITS_REMAINING", String(bal));
          if (amount && bal >= Number(amount)) {
            setCreditsAdded(true);
            return; // stop polling once credits visible
          }
        }
      } catch { /* ignore */ }
      if (!cancelled && attempts < 6) {
        attempts++;
        setTimeout(poll, 2000);
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [isCredits, amount]);

  // Redirect after 4s — billing for credits, worker home for subs.
  useEffect(() => {
    // App.jsx reads `ta_redirect_page` from sessionStorage in AdminShell's
    // initial section. Land on /dashboard so the app resolves to the in-app
    // view (currentView="app") instead of bouncing to the hub.
    if (isCredits) sessionStorage.setItem("ta_redirect_page", "billing");
    const dest = isCredits ? "/dashboard" : (workerId ? `/?worker=${encodeURIComponent(workerId)}` : "/");
    const timer = setTimeout(() => { window.location.href = dest; }, isCredits ? 4500 : 3000);
    return () => clearTimeout(timer);
  }, [isCredits, workerId]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ textAlign: "center", padding: "40px", maxWidth: 480 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        {isCredits ? (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
              {creditsAdded ? "Credits added." : "Processing your purchase..."}
            </div>
            <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
              {amount && (creditsAdded
                ? `+${Number(amount).toLocaleString()} credits are now on your account. Taking you back to billing.`
                : `Your ${Number(amount).toLocaleString()}-credit pack is being added to your balance. This usually takes a few seconds.`
              )}
            </div>
            {balance != null && (
              <div style={{ marginTop: 18, padding: "14px 16px", background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#5b21b6", borderRadius: 10, fontSize: 14, fontWeight: 600 }}>
                Current balance: {Number(balance).toLocaleString()} credits
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>You're in.</div>
            <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>Your worker is active and ready. Taking you there now.</div>
          </>
        )}
      </div>
    </div>
  );
}
