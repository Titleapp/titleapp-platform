/**
 * ShopifyAuthCallback.jsx — OAuth redirect landing page for Shopify.
 *
 * Shopify redirects here after the merchant grants access:
 *   https://sociii.ai/auth/shopify-callback?code=...&shop=...&state=...&hmac=...
 *
 * This page forwards the params to the backend to exchange for a token,
 * then postMessages the result to the opener window and closes.
 *
 * Must be registered in App.jsx at path="/auth/shopify-callback".
 * Must be added as an Allowed redirection URL in the Shopify Partner app settings.
 */

import { useEffect, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

export default function ShopifyAuthCallback() {
  const [statusMsg, setStatusMsg] = useState("Connecting Shopify…");

  useEffect(() => {
    async function exchange() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const shop = params.get("shop");
      const state = params.get("state");
      const error = params.get("error");

      if (error) {
        window.opener?.postMessage({ type: "shopify-auth-result", ok: false, error }, "*");
        window.close();
        return;
      }

      if (!code || !shop) {
        setStatusMsg("Missing OAuth parameters.");
        window.opener?.postMessage({ type: "shopify-auth-result", ok: false, error: "Missing parameters" }, "*");
        setTimeout(() => window.close(), 2000);
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const token = await user.getIdToken();

        const qs = new URLSearchParams({ code, shop, state: state || "", hmac: params.get("hmac") || "" });
        const res = await fetch(`${API_BASE}/v1/shopify:callback?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (data.ok) {
          setStatusMsg(`Shopify connected: ${shop}`);
          window.opener?.postMessage({ type: "shopify-auth-result", ok: true, shop }, "*");
        } else {
          setStatusMsg(data.error || "Connection failed.");
          window.opener?.postMessage({ type: "shopify-auth-result", ok: false, error: data.error }, "*");
        }
      } catch (e) {
        setStatusMsg(e.message || "Unexpected error.");
        window.opener?.postMessage({ type: "shopify-auth-result", ok: false, error: e.message }, "*");
      }

      setTimeout(() => window.close(), 1500);
    }

    exchange();
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#374151",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>
          {statusMsg.includes("failed") || statusMsg.includes("error") ? "⚠" : "🛒"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{statusMsg}</div>
        <div style={{ fontSize: 14, color: "#6b7280" }}>This window will close automatically.</div>
      </div>
    </div>
  );
}
