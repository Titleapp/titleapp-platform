import React, { useState } from "react";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=";

export default function DistributionKit({ worker, workerCardData }) {
  const [copied, setCopied] = useState(null);
  const [showPaidOptions, setShowPaidOptions] = useState(false);

  const slug = (worker?.name || workerCardData?.name || "worker").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const workerUrl = `https://titleapp.ai/workers/${slug}`;
  const embedCode = `<iframe src="${workerUrl}?embed=1" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;
  const qrUrl = `${QR_API}${encodeURIComponent(workerUrl)}`;

  const workerName = workerCardData?.name || worker?.name || "Your Worker";
  const workerDesc = workerCardData?.description || worker?.description || "";
  const targetUser = workerCardData?.targetUser || "";
  const vertical = workerCardData?.vertical || worker?.intake?.vertical || "";
  const tierPrice = workerCardData?.pricingTier === 3 ? 79 : workerCardData?.pricingTier === 1 ? 29 : 49;

  // Pre-written social copy
  const linkedinPost = `I just published "${workerName}" on TitleApp -- a Digital Worker that ${workerDesc.toLowerCase().replace(/\.$/, "")}.

${targetUser ? `Built for ${targetUser.toLowerCase()}.` : ""} Every output is validated by a compliance engine before delivery. No hallucinations. No guessing.

Try it: ${workerUrl}

#DigitalWorkers #AI #TitleApp${vertical ? ` #${vertical.replace(/[^a-zA-Z]/g, "")}` : ""}`;

  const tweet = `Just launched "${workerName}" on @TitleApp -- an AI worker with built-in compliance rules. ${workerUrl}`;

  const emailBlast = `Subject: ${workerName} is live on TitleApp

Hi,

I built a Digital Worker called "${workerName}" on TitleApp.

${workerDesc}

${targetUser ? `It's built for ${targetUser.toLowerCase()}.` : ""} Every output is validated against compliance rules before delivery -- so you get reliable, governed AI that follows the rules of your industry.

Try it here: ${workerUrl}

Subscriptions start at $${tierPrice}/mo. You can test it before subscribing.

Let me know what you think.`;

  const outreachEmail = `Subject: AI-powered ${workerName.toLowerCase()} for your team

Hi [Name],

I wanted to share something I built that might be useful for your ${targetUser ? targetUser.toLowerCase() : "team"}.

"${workerName}" is a Digital Worker on TitleApp that ${workerDesc.toLowerCase().replace(/\.$/, "")}. It runs on a compliance engine that validates every output against ${vertical ? vertical + " " : ""}regulatory rules before delivery.

${workerCardData?.mdGateRequired ? "It has been co-signed by a Medical Director for clinical accuracy." : ""}

A few things that make it different:
- Every output is compliance-checked before delivery
- Full audit trail on every interaction
- Jurisdiction-specific rules built in

I'd be happy to walk you through a demo or set up a trial for your team. You can also see it live here: ${workerUrl}

Best regards`;

  function copyText(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const sectionStyle = { background: "#16161e", border: "1px solid #2a2a3a", borderRadius: 12, padding: 20, marginBottom: 16 };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, display: "block" };
  const copyBtnStyle = (key) => ({
    padding: "6px 14px", background: copied === key ? "#10b981" : "#2a2a3a",
    color: copied === key ? "white" : "#94a3b8", border: "1px solid #3a3a4a",
    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
  });

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Distribution Kit</div>
      <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>
        Everything you need to market your worker. Copy and paste -- Alex wrote it all for you.
      </div>

      {/* Live URL */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Live worker URL</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#7c3aed", fontSize: 14, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workerUrl}</div>
          <button style={copyBtnStyle("url")} onClick={() => copyText("url", workerUrl)}>{copied === "url" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Embed code */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Embed code</span>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Add this to your website to embed your worker directly.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#7c3aed", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.5 }}>{embedCode}</div>
          <button style={copyBtnStyle("embed")} onClick={() => copyText("embed", embedCode)}>{copied === "embed" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* QR Code */}
      <div style={sectionStyle}>
        <span style={labelStyle}>QR code</span>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>For conferences, classrooms, and lanyards.</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ background: "white", padding: 8, borderRadius: 8, flexShrink: 0 }}>
            <img src={qrUrl} alt="QR Code" width={160} height={160} style={{ display: "block" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href={qrUrl} download={`${slug}-qr.png`} target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 16px", background: "#2a2a3a", color: "#94a3b8", border: "1px solid #3a3a4a", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center" }}
            >
              Download PNG
            </a>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
              Print this on your badge, business card, or poster. Anyone who scans it goes straight to your worker.
            </div>
          </div>
        </div>
      </div>

      {/* LinkedIn post */}
      <div style={sectionStyle}>
        <span style={labelStyle}>LinkedIn post</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{linkedinPost}</div>
          <button style={copyBtnStyle("linkedin")} onClick={() => copyText("linkedin", linkedinPost)}>{copied === "linkedin" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Tweet */}
      <div style={sectionStyle}>
        <span style={labelStyle}>X / Twitter</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 13, lineHeight: 1.6 }}>{tweet}</div>
          <button style={copyBtnStyle("tweet")} onClick={() => copyText("tweet", tweet)}>{copied === "tweet" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Email blast */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Email blast</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{emailBlast}</div>
          <button style={copyBtnStyle("email")} onClick={() => copyText("email", emailBlast)}>{copied === "email" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Outreach email (institutional) */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Outreach email — for decision-makers</span>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Personalized for medical directors, program directors, and department heads. Replace [Name] and send.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#0f0f14", borderRadius: 6, border: "1px solid #2a2a3a", color: "#e2e8f0", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{outreachEmail}</div>
          <button style={copyBtnStyle("outreach")} onClick={() => copyText("outreach", outreachEmail)}>{copied === "outreach" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* One-pager download */}
      <div style={sectionStyle}>
        <span style={labelStyle}>One-pager pitch deck</span>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>Auto-generated from your Worker Card. Share with decision-makers.</div>
        <button
          style={{ padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onClick={() => {
            // Generate one-pager via document engine
            const token = localStorage.getItem("ID_TOKEN");
            const tenantId = localStorage.getItem("TENANT_ID");
            fetch(`${import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev"}/api?path=/v1/docs:generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
              body: JSON.stringify({
                tenantId, templateId: "one-pager",
                data: { title: workerName, description: workerDesc, targetUser, vertical, price: `$${tierPrice}/mo` },
              }),
            }).then(r => r.json()).then(d => {
              if (d.ok && d.downloadUrl) window.open(d.downloadUrl, "_blank");
            }).catch(() => {});
          }}
        >
          Generate and download one-pager
        </button>
      </div>

      {/* Paid distribution options */}
      <div style={{ ...sectionStyle, borderColor: showPaidOptions ? "#7c3aed" : "#2a2a3a" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setShowPaidOptions(!showPaidOptions)}
        >
          <div>
            <span style={labelStyle}>Paid distribution options</span>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Boost your reach with featured placement and newsletter inclusion.</div>
          </div>
          <span style={{ fontSize: 18, color: "#64748b", transform: showPaidOptions ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>{"\u25BC"}</span>
        </div>

        {showPaidOptions && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 16, background: "#0f0f14", borderRadius: 8, border: "1px solid #2a2a3a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Featured marketplace placement</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>$99/mo</span>
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                Your worker appears in the "Popular right now" section on titleapp.ai. Estimated reach: 5,000-15,000 monthly visitors.
              </div>
              <button style={{ marginTop: 10, padding: "8px 16px", background: "#2a2a3a", color: "#94a3b8", border: "1px solid #3a3a4a", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Learn more
              </button>
            </div>

            <div style={{ padding: 16, background: "#0f0f14", borderRadius: 8, border: "1px solid #2a2a3a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Vertical newsletter inclusion</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>$49/issue</span>
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                Featured in the next {vertical || "industry"} newsletter. Estimated reach: 2,000-8,000 subscribers in your vertical.
              </div>
              <button style={{ marginTop: 10, padding: "8px 16px", background: "#2a2a3a", color: "#94a3b8", border: "1px solid #3a3a4a", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Learn more
              </button>
            </div>

            <div style={{ padding: 16, background: "#0f0f14", borderRadius: 8, border: "1px solid #2a2a3a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Co-marketing with institutional partners</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>Contact us</span>
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                Joint marketing campaigns with hospitals, EMS agencies, and education programs in your vertical.
              </div>
              <button style={{ marginTop: 10, padding: "8px 16px", background: "#2a2a3a", color: "#94a3b8", border: "1px solid #3a3a4a", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Contact sales
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
