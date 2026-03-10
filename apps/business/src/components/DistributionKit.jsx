import React, { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
const QR_API_PNG = "https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&data=";
const QR_API_SVG = "https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=svg&data=";

export default function DistributionKit({ worker, workerCardData }) {
  const [copied, setCopied] = useState(null);
  const [showPaidOptions, setShowPaidOptions] = useState(false);
  const [deckGenerating, setDeckGenerating] = useState(false);
  const [deckFormat, setDeckFormat] = useState("pptx");
  const [deckError, setDeckError] = useState(null);
  const [embedWidth, setEmbedWidth] = useState("100%");
  const [embedHeight, setEmbedHeight] = useState("600");

  const slug = (worker?.slug || worker?.name || workerCardData?.name || "worker").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const workerUrl = `https://titleapp.ai/w/${slug}`;
  const embedCode = `<iframe src="${workerUrl}?embed=1" width="${embedWidth}" height="${embedHeight}" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;
  const qrPng = `${QR_API_PNG}${encodeURIComponent(workerUrl)}`;
  const qrSvg = `${QR_API_SVG}${encodeURIComponent(workerUrl)}`;

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

  const smsText = `Check out ${workerName} -- a Digital Worker I built on TitleApp. ${workerUrl}`;

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

  const deckSlides = [
    { title: workerName, body: `A Digital Worker for ${vertical || "your industry"}` },
    { title: "The Problem", body: workerCardData?.problemSolves || workerDesc },
    { title: "The Solution", body: `${workerName} automates this workflow with built-in compliance and audit trails.` },
    { title: "How It Works", body: "1. Subscribe and onboard in minutes\n2. Your worker follows industry-specific compliance rules\n3. Every output is validated before delivery\n4. Full audit trail on every interaction" },
    { title: "Built For", body: targetUser || "Professionals who need reliable, governed AI" },
    { title: "Compliance Built In", body: workerCardData?.complianceRules || "Standard platform compliance (Tier 0 + Tier 1)" },
    { title: "Pricing", body: `Starting at $${tierPrice}/mo\n14-day free trial included\nNo credit card required to start` },
    { title: "Market Context", body: `${vertical || "Industry"} professionals are spending hours on manual processes that ${workerName} handles in seconds.` },
    { title: "About the Creator", body: "Built by a verified creator on the TitleApp platform.\nEvery worker is reviewed before going live." },
    { title: "Get Started", body: `Try ${workerName} today\n${workerUrl}\n\nQuestions? Contact the creator directly through TitleApp.` },
  ];

  function generateClientDeck() {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${workerName} - Pitch Deck</title>
<style>@page{size:landscape;margin:0}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.slide{width:100vw;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;box-sizing:border-box;page-break-after:always}
.slide:nth-child(odd){background:#1a1a2e;color:white}.slide:nth-child(even){background:#f8f9fc;color:#1a1a2e}
h1{font-size:42px;margin-bottom:16px;text-align:center}p{font-size:22px;line-height:1.6;max-width:800px;text-align:center;white-space:pre-wrap}
.badge{display:inline-block;padding:6px 16px;background:#6B46C1;color:white;border-radius:20px;font-size:14px;margin-top:24px}</style></head><body>
${deckSlides.map((s, i) => `<div class="slide"><h1>${s.title}</h1><p>${s.body.replace(/\n/g, "<br>")}</p>${i === 0 ? '<div class="badge">TitleApp Digital Worker</div>' : ""}</div>`).join("")}
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-pitch-deck.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateDeck(format) {
    setDeckGenerating(true);
    setDeckFormat(format);
    setDeckError(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID");
      const res = await fetch(`${API_BASE}/api?path=/v1/docs:generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
        body: JSON.stringify({
          tenantId, templateId: "deck-standard", format,
          data: {
            title: workerName, description: workerDesc, targetUser, vertical,
            price: `$${tierPrice}/mo`, slug, workerUrl,
            problemSolves: workerCardData?.problemSolves || "",
            complianceRules: workerCardData?.complianceRules || "",
            jurisdiction: workerCardData?.jurisdiction || "National",
            slides: deckSlides.map((s, i) => ({
              title: s.title, body: s.body,
              type: i === 0 ? "title" : i === 6 ? "pricing" : i === 9 ? "cta" : "content",
            })),
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      } else {
        // Backend unavailable — generate client-side HTML deck
        generateClientDeck();
        setDeckError("Generated an HTML deck (open in browser, then File > Print > Save as PDF). Full PPTX/PDF generation available after launch.");
      }
    } catch {
      generateClientDeck();
      setDeckError("Generated an HTML deck (open in browser, then File > Print > Save as PDF). Full PPTX/PDF generation available after launch.");
    }
    setDeckGenerating(false);
  }

  const sectionStyle = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 16 };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, display: "block" };
  const copyBtnStyle = (key) => ({
    padding: "6px 14px", background: copied === key ? "#10b981" : "#F8F9FC",
    color: copied === key ? "white" : "#64748B", border: "1px solid #E2E8F0",
    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
  });

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Distribution Kit</div>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>
        Everything you need to market your worker. Copy and paste -- Alex wrote it all for you.
      </div>

      {/* Live URL */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Live worker URL</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "#F8F9FC", borderRadius: 6, border: "1px solid #E2E8F0", color: "#6B46C1", fontSize: 14, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workerUrl}</div>
          <button style={copyBtnStyle("url")} onClick={() => copyText("url", workerUrl)}>{copied === "url" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Embed code */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Embed code</span>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Add this to your website to embed your worker directly.</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 2 }}>Width</div>
            <input
              value={embedWidth} onChange={e => setEmbedWidth(e.target.value)}
              style={{ width: 80, padding: "6px 8px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 4, fontSize: 12, color: "#1a1a2e" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 2 }}>Height</div>
            <input
              value={embedHeight} onChange={e => setEmbedHeight(e.target.value)}
              style={{ width: 80, padding: "6px 8px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 4, fontSize: 12, color: "#1a1a2e" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "#F8F9FC", borderRadius: 6, border: "1px solid #E2E8F0", color: "#6B46C1", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.5 }}>{embedCode}</div>
          <button style={copyBtnStyle("embed")} onClick={() => copyText("embed", embedCode)}>{copied === "embed" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* QR Code */}
      <div style={sectionStyle}>
        <span style={labelStyle}>QR code</span>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>For conferences, classrooms, and lanyards. 300 DPI print-ready.</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ background: "white", padding: 8, borderRadius: 8, flexShrink: 0, border: "1px solid #E2E8F0" }}>
            <img src={qrPng} alt="QR Code" width={160} height={160} style={{ display: "block" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href={qrPng} download={`${slug}-qr-300dpi.png`} target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 16px", background: "#F8F9FC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center" }}
            >
              Download PNG (300 DPI)
            </a>
            <a
              href={qrSvg} download={`${slug}-qr.svg`} target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 16px", background: "#F8F9FC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center" }}
            >
              Download SVG
            </a>
            <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
              Print on badges, business cards, or posters. Anyone who scans it goes straight to your worker.
            </div>
          </div>
        </div>
      </div>

      {/* LinkedIn post */}
      <div style={sectionStyle}>
        <span style={labelStyle}>LinkedIn post</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#F8F9FC", borderRadius: 6, border: "1px solid #E2E8F0", color: "#1a1a2e", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{linkedinPost}</div>
          <button style={copyBtnStyle("linkedin")} onClick={() => copyText("linkedin", linkedinPost)}>{copied === "linkedin" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Tweet */}
      <div style={sectionStyle}>
        <span style={labelStyle}>X / Twitter</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#F8F9FC", borderRadius: 6, border: "1px solid #E2E8F0", color: "#1a1a2e", fontSize: 13, lineHeight: 1.6 }}>{tweet}</div>
          <button style={copyBtnStyle("tweet")} onClick={() => copyText("tweet", tweet)}>{copied === "tweet" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* SMS */}
      <div style={sectionStyle}>
        <span style={labelStyle}>SMS / Text message</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#F8F9FC", borderRadius: 6, border: "1px solid #E2E8F0", color: "#1a1a2e", fontSize: 13, lineHeight: 1.6 }}>{smsText}</div>
          <button style={copyBtnStyle("sms")} onClick={() => copyText("sms", smsText)}>{copied === "sms" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Email blast */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Email blast</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#F8F9FC", borderRadius: 6, border: "1px solid #E2E8F0", color: "#1a1a2e", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{emailBlast}</div>
          <button style={copyBtnStyle("email")} onClick={() => copyText("email", emailBlast)}>{copied === "email" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Outreach email (institutional) */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Outreach email — for decision-makers</span>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Personalized for medical directors, program directors, and department heads. Replace [Name] and send.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, padding: "12px 14px", background: "#F8F9FC", borderRadius: 6, border: "1px solid #E2E8F0", color: "#1a1a2e", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{outreachEmail}</div>
          <button style={copyBtnStyle("outreach")} onClick={() => copyText("outreach", outreachEmail)}>{copied === "outreach" ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* 10-Slide Pitch Deck */}
      <div style={sectionStyle}>
        <span style={labelStyle}>10-slide pitch deck</span>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
          Auto-generated from your Worker Card. Problem, solution, compliance, pricing, CTA — all branded.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ padding: "10px 20px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: deckGenerating ? 0.7 : 1 }}
            onClick={() => generateDeck("pptx")}
            disabled={deckGenerating}
          >
            {deckGenerating && deckFormat === "pptx" ? "Generating..." : "Download PPTX"}
          </button>
          <button
            style={{ padding: "10px 20px", background: "#FFFFFF", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: deckGenerating ? 0.7 : 1 }}
            onClick={() => generateDeck("pdf")}
            disabled={deckGenerating}
          >
            {deckGenerating && deckFormat === "pdf" ? "Generating..." : "Download PDF"}
          </button>
        </div>
        {deckError && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#92400E", background: "#FEF3C7", padding: "8px 12px", borderRadius: 6, lineHeight: 1.5 }}>{deckError}</div>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>
          10 slides: Title, Problem, Solution, How It Works, Audience, Compliance, Pricing, Market Context, Creator, CTA
        </div>
      </div>

      {/* Paid distribution options */}
      <div style={{ ...sectionStyle, borderColor: showPaidOptions ? "#6B46C1" : "#E2E8F0" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setShowPaidOptions(!showPaidOptions)}
        >
          <div>
            <span style={labelStyle}>Paid distribution options</span>
            <div style={{ fontSize: 12, color: "#64748B" }}>Boost your reach with featured placement and newsletter inclusion.</div>
          </div>
          <span style={{ fontSize: 18, color: "#94A3B8", transform: showPaidOptions ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>{"\u25BC"}</span>
        </div>

        {showPaidOptions && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 16, background: "#F8F9FC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>Featured marketplace placement</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6B46C1" }}>$99/mo</span>
              </div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
                Your worker appears in the "Popular right now" section on titleapp.ai. Estimated reach: 5,000-15,000 monthly visitors.
              </div>
              <button disabled title="Coming soon — available at launch" style={{ marginTop: 10, padding: "8px 16px", background: "#F8F9FC", color: "#CBD5E1", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "not-allowed" }}>
                Coming soon
              </button>
            </div>

            <div style={{ padding: 16, background: "#F8F9FC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>Vertical newsletter inclusion</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6B46C1" }}>$49/issue</span>
              </div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
                Featured in the next {vertical || "industry"} newsletter. Estimated reach: 2,000-8,000 subscribers in your vertical.
              </div>
              <button disabled title="Coming soon — available at launch" style={{ marginTop: 10, padding: "8px 16px", background: "#F8F9FC", color: "#CBD5E1", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "not-allowed" }}>
                Coming soon
              </button>
            </div>

            <div style={{ padding: 16, background: "#F8F9FC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>Co-marketing with institutional partners</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6B46C1" }}>Contact us</span>
              </div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
                Joint marketing campaigns with hospitals, EMS agencies, and education programs in your vertical.
              </div>
              <a href="mailto:sales@titleapp.ai?subject=Co-marketing%20inquiry%20—%20Digital%20Worker" style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: "#FFFFFF", color: "#6B46C1", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
                Contact sales
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
