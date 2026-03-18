import React, { useState, useEffect } from "react";
import WorkerIcon, { SUITE_COLORS } from "../utils/workerIcons";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  nav: { padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" },
  logo: { fontSize: 18, fontWeight: 700, color: "#7c3aed", textDecoration: "none", cursor: "pointer" },
  back: { fontSize: 13, color: "#6b7280", textDecoration: "none", cursor: "pointer", background: "none", border: "none" },
  hero: { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", padding: "64px 32px", textAlign: "center", color: "white" },
  heroTitle: { fontSize: 36, fontWeight: 700, marginBottom: 12, maxWidth: 700, margin: "0 auto 12px" },
  heroSub: { fontSize: 18, opacity: 0.9, maxWidth: 560, margin: "0 auto" },
  badge: { display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.2)", marginBottom: 16 },
  main: { maxWidth: 800, margin: "0 auto", padding: "48px 24px" },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 24 },
  steps: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20, marginBottom: 48 },
  step: { padding: 20, background: "white", borderRadius: 12, border: "1px solid #e5e7eb" },
  stepNum: { width: 28, height: 28, borderRadius: 14, background: "#7c3aed", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, marginBottom: 10 },
  stepTitle: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 4 },
  stepDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.5 },
  bridge: { background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: 16, padding: 32, marginBottom: 48, color: "white" },
  bridgeTitle: { fontSize: 20, fontWeight: 700, marginBottom: 12 },
  bridgeText: { fontSize: 14, lineHeight: 1.6, opacity: 0.9 },
  props: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 48 },
  prop: { padding: 16, background: "white", borderRadius: 10, border: "1px solid #e5e7eb" },
  propLabel: { fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 },
  propValue: { fontSize: 13, color: "#6b7280" },
  pricing: { textAlign: "center", padding: "32px 0", marginBottom: 48 },
  priceTag: { fontSize: 36, fontWeight: 700, color: "#111827" },
  priceNote: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  cta: { display: "inline-block", marginTop: 16, padding: "12px 32px", background: "#7c3aed", color: "white", borderRadius: 10, fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", textDecoration: "none" },
  faq: { marginBottom: 48 },
  faqItem: { padding: "16px 0", borderBottom: "1px solid #e5e7eb" },
  faqQ: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 6 },
  faqA: { fontSize: 14, color: "#6b7280", lineHeight: 1.5 },
  footer: { textAlign: "center", padding: "24px 32px", borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: 13, marginTop: 40 },
};

function DocumentChecklist({ checklist, workerSlug }) {
  const [docStatus, setDocStatus] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`ta_worker_docs_${workerSlug}`) || "{}"); } catch { return {}; }
  });
  const [uploading, setUploading] = useState(null);
  const fileRef = React.useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  const requiredItems = checklist.filter(d => d.required);
  const requiredDone = requiredItems.filter(d => docStatus[d.docType]);
  const allRequiredDone = requiredDone.length === requiredItems.length;
  const missingRequired = requiredItems.filter(d => !docStatus[d.docType]);

  async function handleUpload(docType) {
    setUploadTarget(docType);
    fileRef.current?.click();
  }

  async function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    setUploading(uploadTarget);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const signRes = await fetch(`${apiBase}/api?path=/v1/files:sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size, purpose: "worker_document" }),
      });
      const signData = await signRes.json();
      if (!signData.uploadUrl) throw new Error("Sign failed");
      await fetch(signData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await fetch(`${apiBase}/api?path=/v1/files:finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileId: signData.fileId, storagePath: signData.storagePath, contentType: file.type, sizeBytes: file.size }),
      });
      const updated = { ...docStatus, [uploadTarget]: { fileId: signData.fileId, uploadedAt: new Date().toISOString() } };
      setDocStatus(updated);
      localStorage.setItem(`ta_worker_docs_${workerSlug}`, JSON.stringify(updated));
    } catch (err) { console.error("Doc upload failed:", err); }
    setUploading(null);
    setUploadTarget(null);
    e.target.value = "";
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={S.sectionTitle}>Document Checklist</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {allRequiredDone ? (
          <span style={{ fontSize: 14, fontWeight: 600, color: "#10b981" }}>Direct Mode ready</span>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b" }}>Partial capability {"\u2014"} {missingRequired.length} required doc{missingRequired.length !== 1 ? "s" : ""} missing</span>
        )}
      </div>
      {!allRequiredDone && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 16 }}>
          Some Direct Mode features are limited {"\u2014"} upload your {missingRequired.map(d => d.label).join(", ")} to unlock them.
        </div>
      )}
      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={onFileSelected} accept=".pdf,.doc,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg" />
      {checklist.map(item => (
        <div key={item.docType} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "white", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>
            {docStatus[item.docType] ? "\u2713" : item.required ? "\u26A0" : "\u2014"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>{item.label}</div>
            <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 8, marginTop: 2 }}>
              <span style={{ fontWeight: 600, color: item.required ? "#dc2626" : "#6b7280" }}>{item.required ? "Required" : "Recommended"}</span>
              {item.unlocksMode && <span>Unlocks {item.unlocksMode} mode</span>}
            </div>
          </div>
          {docStatus[item.docType] ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981" }}>Uploaded</span>
          ) : (
            <button onClick={() => handleUpload(item.docType)} disabled={uploading === item.docType} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "#7c3aed", color: "white", border: "none", borderRadius: 6, cursor: "pointer", opacity: uploading === item.docType ? 0.7 : 1 }}>
              {uploading === item.docType ? "Uploading..." : "Upload"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function WorkerDetailPage({ worker, content, onBack, onSubscribe }) {
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subError, setSubError] = useState(null);
  const [expiredTrial, setExpiredTrial] = useState(null); // { expiredAt, historyPreview[] }
  const [checkingTrial, setCheckingTrial] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const bogoUsed = localStorage.getItem("ta_bogo_used") === "true";
  const color = SUITE_COLORS[worker.suite] || "#7c3aed";

  function handleAddToCart() {
    const cart = JSON.parse(localStorage.getItem("ta_cart") || "[]");
    if (!cart.find(item => item.slug === worker.slug)) {
      cart.push({ slug: worker.slug, name: worker.name, price: worker.price, suite: worker.suite, bogoEligible: worker.bogoEligible });
      localStorage.setItem("ta_cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("ta:cart-updated"));
    }
    setAddedToCart(true);
  }

  // Check for expired trial on mount
  useEffect(() => {
    async function checkSubscription() {
      const token = localStorage.getItem("ID_TOKEN");
      if (!token || token === "undefined") return;
      setCheckingTrial(true);
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/worker:subscription-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ workerId: worker.id, slug: worker.slug }),
        });
        const data = await res.json();
        if (data.ok && data.status === "expired") {
          setExpiredTrial({
            expiredAt: data.expiredAt,
            historyPreview: data.historyPreview || [
              { role: "user", text: "Can you help me with..." },
              { role: "assistant", text: `Of course. Let me pull up the relevant ${worker.suite || "industry"} data and check compliance...` },
              { role: "user", text: "What about the deadline for..." },
              { role: "assistant", text: "Based on current regulations, the deadline is..." },
            ],
            daysRetained: data.daysRetained || 90,
          });
        } else if (data.ok && data.status === "active") {
          setSubscribed(true);
        }
      } catch {}
      setCheckingTrial(false);
    }
    checkSubscription();
  }, [worker.id]);

  async function handleSubscribe() {
    if (onSubscribe) { onSubscribe(worker); return; }
    setSubscribing(true);
    setSubError(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      if (!token) { window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname); return; }

      // Call purchaseWorker which creates Stripe checkout session
      const res = await fetch(`${API_BASE}/api?path=/v1/worker:subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workerId: worker.id, slug: worker.slug }),
      });
      const data = await res.json();
      if (data.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.ok && data.subscribed) {
        setSubscribed(true);
      } else {
        setSubError(data.error || "Something went wrong");
      }
    } catch {
      setSubError("Connection error. Try again.");
    }
    setSubscribing(false);
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <a href="/" style={S.logo}>TitleApp</a>
        <button onClick={onBack || (() => { window.location.href = "/workers"; })} style={S.back}>&larr; All Workers</button>
      </nav>

      <div style={S.hero}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WorkerIcon slug={worker.slug} size={32} color="#ffffff" />
          </div>
        </div>
        <div style={S.badge}>{worker.suite}</div>
        <h1 style={S.heroTitle}>{content.headline || worker.name}</h1>
        <p style={S.heroSub}>{content.subheadline || worker.description}</p>
      </div>

      {/* Expired trial re-entry screen */}
      {expiredTrial && !subscribed && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px" }}>
          <div style={{
            background: "white", borderRadius: 16, border: "1px solid #e5e7eb",
            overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                Your trial has expired
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Trial ended {expiredTrial.expiredAt ? new Date(expiredTrial.expiredAt).toLocaleDateString() : "recently"}.
                Your conversation history is retained for {expiredTrial.daysRetained} days.
              </div>
            </div>

            {/* Greyed-out conversation history preview */}
            <div style={{ padding: "16px 24px", background: "#f9fafb", maxHeight: 240, overflow: "hidden", position: "relative" }}>
              {expiredTrial.historyPreview.map((msg, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 8,
                }}>
                  <div style={{
                    padding: "8px 12px", borderRadius: 12, maxWidth: "80%", fontSize: 13, lineHeight: 1.5,
                    background: msg.role === "user" ? "#e5e7eb" : "#f3f4f6",
                    color: "#9ca3af",
                    filter: "blur(1px)",
                    userSelect: "none",
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {/* Fade overlay */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
                background: "linear-gradient(transparent, #f9fafb)",
              }} />
            </div>

            {/* Subscribe CTA */}
            <div style={{ padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                ${worker.price / 100}<span style={{ fontSize: 14, fontWeight: 400, color: "#6b7280" }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                Subscribe to pick up where you left off. Your full history will be restored.
              </div>
              <button
                style={{
                  width: "100%", padding: "14px 24px", background: "#7c3aed", color: "white",
                  border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer",
                  opacity: subscribing ? 0.7 : 1,
                }}
                onClick={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing ? "Processing..." : "Subscribe and Restore History"}
              </button>
              {subError && <div style={{ fontSize: 13, color: "#dc2626", marginTop: 8 }}>{subError}</div>}
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, lineHeight: 1.5 }}>
                History retained for {expiredTrial.daysRetained} days after trial expiry.
                After that, conversations are permanently deleted.
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={S.main}>
        {content.steps && content.steps.length > 0 && (
          <>
            <h2 style={S.sectionTitle}>How It Works</h2>
            <div style={S.steps}>
              {content.steps.map((step, i) => (
                <div key={i} style={S.step}>
                  <div style={S.stepNum}>{i + 1}</div>
                  <div style={S.stepTitle}>{step.title}</div>
                  <div style={S.stepDesc}>{step.description}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {content.bridge && (
          <div style={S.bridge}>
            <div style={S.bridgeTitle}>{content.bridge.title || "The Bridge"}</div>
            <div style={S.bridgeText}>{content.bridge.text}</div>
          </div>
        )}

        {content.valueProps && content.valueProps.length > 0 && (
          <>
            <h2 style={S.sectionTitle}>Why This Worker</h2>
            <div style={S.props}>
              {content.valueProps.map((prop, i) => (
                <div key={i} style={S.prop}>
                  <div style={S.propLabel}>{prop.label}</div>
                  <div style={S.propValue}>{prop.description}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {worker.documentChecklist && worker.documentChecklist.length > 0 && (
          <DocumentChecklist checklist={worker.documentChecklist} workerSlug={worker.slug} />
        )}

        <div style={S.pricing}>
          <div style={S.priceTag}>${worker.price / 100}<span style={{ fontSize: 16, fontWeight: 400, color: "#6b7280" }}>/mo</span></div>
          <div style={S.priceNote}>14-day free trial. No credit card required.</div>
          {subscribed ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>Subscribed</div>
              <button
                style={S.cta}
                onClick={() => { window.location.href = "/vault"; }}
              >
                Open in Vault
              </button>
            </div>
          ) : (
            <>
              <button
                style={{ ...S.cta, opacity: subscribing ? 0.7 : 1 }}
                onClick={handleSubscribe}
                disabled={subscribing}
                onMouseEnter={e => { if (!subscribing) e.currentTarget.style.background = "#6d28d9"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; }}
              >
                {subscribing ? "Processing..." : "Start Free Trial"}
              </button>
              {subError && <div style={{ fontSize: 13, color: "#dc2626", marginTop: 8 }}>{subError}</div>}
            </>
          )}
          {worker.blockchainEnabled && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>Blockchain-verified audit trail</div>
          )}
          {worker.bogoEligible && !bogoUsed && (
            <div style={{ background: "rgba(11,122,110,0.08)", border: "1px solid rgba(11,122,110,0.2)", borderRadius: 12, padding: "16px 20px", marginTop: 16, textAlign: "left", maxWidth: 500, margin: "16px auto 0" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0B7A6E", marginBottom: 4 }}>Buy One, Get One Free</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                Buy this worker and get one worker of equal or lesser value free. Add both to cart to apply.
              </div>
              <button
                onClick={handleAddToCart}
                disabled={addedToCart}
                style={{ marginTop: 12, padding: "10px 20px", background: addedToCart ? "#94A3B8" : "#0B7A6E", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: addedToCart ? "default" : "pointer" }}
              >
                {addedToCart ? "Added to Cart" : "Add to Cart"}
              </button>
            </div>
          )}
        </div>

        {content.faq && content.faq.length > 0 && (
          <div style={S.faq}>
            <h2 style={S.sectionTitle}>FAQ</h2>
            {content.faq.map((item, i) => (
              <div key={i} style={S.faqItem}>
                <div style={S.faqQ}>{item.q}</div>
                <div style={S.faqA}>{item.a}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={S.footer}>TitleApp -- Digital Workers for every industry</footer>
    </div>
  );
}
