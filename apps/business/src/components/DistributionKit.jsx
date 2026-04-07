import React, { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
const QR_API_PNG = "https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&data=";
const QR_API_SVG = "https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=svg&data=";

export default function DistributionKit({ worker, workerCardData, hasUpdatedSinceLaunch, canvasAssets = [] }) {
  // CODEX 47.1 Fix 7 — game vs worker pitch deck routing
  const isGame = !!workerCardData?.gameConfig?.isGame;
  const accentColor = isGame ? "#16A34A" : "#6B46C1";
  const [copied, setCopied] = useState(null);
  const [showPaidOptions, setShowPaidOptions] = useState(false);
  const [deckGenerating, setDeckGenerating] = useState(false);
  const [deckFormat, setDeckFormat] = useState("pptx");
  const [deckError, setDeckError] = useState(null);
  const [embedWidth, setEmbedWidth] = useState("100%");
  const [embedHeight, setEmbedHeight] = useState("600");
  // CODEX 47.1 Fix 8 — QR loading state
  const [qrFailed, setQrFailed] = useState(false);
  const [qrAttempt, setQrAttempt] = useState(0);

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

  const tweet = `Just launched "${workerName}" on @TitleApp -- a Digital Worker with built-in compliance rules. ${workerUrl}`;

  const smsText = `Check out ${workerName} -- a Digital Worker I built on TitleApp. ${workerUrl}`;

  const emailBlast = `Subject: ${workerName} is live on TitleApp

Hi,

I built a Digital Worker called "${workerName}" on TitleApp.

${workerDesc}

${targetUser ? `It's built for ${targetUser.toLowerCase()}.` : ""} Every output is validated against compliance rules before delivery -- so you get reliable, governed Digital Workers that follow the rules of your industry.

Try it here: ${workerUrl}

Subscriptions start at $${tierPrice}/mo. You can test it before subscribing.

Let me know what you think.`;

  const outreachEmail = `Subject: ${workerName} — a Digital Worker for your team

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

  async function downloadFile(url, filename) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open in new tab if fetch fails (CORS)
      window.open(url, "_blank");
    }
  }

  const deckSlides = [
    { title: workerName, body: `A Digital Worker for ${vertical || "your industry"}` },
    { title: "The Problem", body: workerCardData?.problemSolves || workerDesc },
    { title: "The Solution", body: `${workerName} automates this workflow with built-in compliance and audit trails.` },
    { title: "How It Works", body: "1. Subscribe and onboard in minutes\n2. Your worker follows industry-specific compliance rules\n3. Every output is validated before delivery\n4. Full audit trail on every interaction" },
    { title: "Built For", body: targetUser || "Professionals who need reliable, governed Digital Workers" },
    { title: "Compliance Built In", body: workerCardData?.complianceRules || "Standard platform compliance (Tier 0 + Tier 1)" },
    { title: "Pricing", body: `Starting at $${tierPrice}/mo\n14-day free trial included\nNo credit card required to start` },
    { title: "Market Context", body: `${vertical || "Industry"} professionals are spending hours on manual processes that ${workerName} handles in seconds.` },
    { title: "About the Creator", body: "Built by a verified creator on the TitleApp platform.\nEvery worker is reviewed before going live." },
    { title: "Subscribe", body: `Try ${workerName} today\n${workerUrl}\n\nQuestions? Contact the creator directly through TitleApp.` },
  ];

  // CODEX 47.1 Fix 7 — Game pitch deck template + assets
  const gameRules = workerCardData?.gameRules || {};
  const characterAssets = (canvasAssets || []).filter(a => a.useAs === "character");
  const backgroundAssets = (canvasAssets || []).filter(a => a.useAs === "background");
  const gameTagline = workerCardData?.tagline || workerCardData?.description || `A new game on TitleApp`;
  const gameplayBody = [
    gameRules.turnMechanic   ? `Turn mechanic: ${gameRules.turnMechanic}`     : null,
    gameRules.winLoseConditions ? `Win/lose: ${gameRules.winLoseConditions}` : null,
    gameRules.scoring        ? `Scoring: ${gameRules.scoring}`                 : null,
  ].filter(Boolean).join("\n") || "Tap to play. Score points. Beat your high score.";
  const safetyBody = [
    gameRules.safetyCompliance ? gameRules.safetyCompliance : null,
    workerCardData?.ageRange ? `Age range: ${workerCardData.ageRange}` : null,
    "RAAS Tier 0 — platform safety always on",
  ].filter(Boolean).join("\n");
  const learningBody = workerCardData?.learningOutcome
    || workerCardData?.purpose
    || "Players learn through play. Every session reinforces the core mechanic and rewards skill over luck.";

  const gameDeckSlides = [
    { title: workerName, body: gameTagline },
    { title: "The Game", body: workerDesc || `${workerName} — fast, fun, and built to share.${targetUser ? `\n\nFor ${targetUser.toLowerCase()}.` : ""}` },
    { title: "Gameplay", body: gameplayBody },
    { title: "Characters & World", body: `Original artwork built right inside TitleApp.${characterAssets.length ? `\n\n${characterAssets.length} character${characterAssets.length === 1 ? "" : "s"} ready to play.` : ""}` },
    { title: "Learning & Purpose", body: learningBody },
    { title: "Safety & Compliance", body: safetyBody },
    { title: "Pricing", body: `Starting at $${tierPrice}/mo\n14-day free trial included\nNo credit card required to start` },
    { title: "About the Creator", body: "Built by a verified creator on the TitleApp platform.\nEvery game ships with safety rules baked in." },
    { title: "Distribution", body: `Play here: ${workerUrl}\n\nScan the QR code or tap the link.` },
    { title: "Play Now", body: `Try ${workerName} today\n${workerUrl}` },
  ];

  function generateClientDeck() {
    // CODEX 47.1 Fix 7 — branch to game deck if this is a game
    if (isGame) {
      generateGameClientDeck();
      return;
    }
    const iconImg = workerCardData?.iconDataUrl ? `<img src="${workerCardData.iconDataUrl}" style="width:80px;height:80px;border-radius:16px;margin-bottom:24px" />` : "";
    const footer = `<div style="position:absolute;bottom:24px;left:40px;right:40px;display:flex;justify-content:space-between;font-size:10px;color:#94A3B8;font-family:Calibri,sans-serif">
      <span>titleapp.ai</span><span>${vertical || "Digital Workers"}</span><span>alex@titleapp.ai</span></div>`;
    const darkSlide = (content) => `<div style="width:100vw;height:100vh;background:#1E1E2E;color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;box-sizing:border-box;page-break-after:always;position:relative;font-family:Calibri,sans-serif">${content}</div>`;
    const lightSlide = (title, body) => `<div style="width:100vw;height:100vh;background:#F8F8F8;color:#1E1E2E;display:flex;flex-direction:column;justify-content:flex-start;padding:60px;box-sizing:border-box;page-break-after:always;position:relative;font-family:Calibri,sans-serif">
      <div style="font-size:12px;font-weight:700;color:#6B46C1;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">TitleApp</div>
      <h2 style="font-size:36px;font-weight:700;color:#1E1E2E;margin:0 0 24px 0;border-bottom:3px solid #6B46C1;padding-bottom:12px;display:inline-block">${title}</h2>
      <div style="font-size:16px;line-height:1.8;color:#333;max-width:800px;white-space:pre-wrap">${body}</div>${footer}</div>`;
    const complianceRules = (workerCardData?.complianceRules || "Standard platform compliance").split(/[.;]/).filter(s => s.trim().length > 5).slice(0, 4);

    const slides = [
      // Slide 1 — Title (dark)
      darkSlide(`${iconImg}
        <div style="font-size:12px;font-weight:600;color:#6B46C1;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">TitleApp Digital Worker</div>
        <h1 style="font-size:48px;font-weight:700;margin:0 0 12px 0;text-align:center">${workerName}</h1>
        <p style="font-size:20px;color:rgba(255,255,255,0.6);margin:0;text-align:center">A Digital Worker for ${vertical || "your industry"}</p>
        <div style="position:absolute;bottom:24px;left:40px;font-size:10px;color:#94A3B8">${vertical || ""} ${workerCardData?.jurisdiction || ""}</div>
        <div style="position:absolute;bottom:24px;right:40px;font-size:10px;color:#94A3B8">titleapp.ai</div>`),
      // Slide 2 — Problem
      lightSlide("The Problem", deckSlides[1].body),
      // Slide 3 — Solution
      lightSlide("The Solution", deckSlides[2].body),
      // Slide 4 — How It Works
      lightSlide("How It Works", deckSlides[3].body),
      // Slide 5 — Built For
      lightSlide("Built For", deckSlides[4].body),
      // Slide 6 — Compliance
      lightSlide("Compliance Built In", `<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
        ${[{t:"Tier 0 — Platform Safety",c:"#64748B",s:"Always on"},{t:"Tier 1 — Industry Rules",c:"#dc2626",s:"Baked in during Build"},{t:"Tier 2 — Creator Rules",c:"#f59e0b",s:"Configured by you"},{t:"Tier 3 — Subscriber Preferences",c:"#10b981",s:"Set per subscriber"}]
        .map(r => `<div style="display:flex;align-items:center;gap:10px"><div style="width:8px;height:8px;border-radius:4px;background:${r.c}"></div><span style="font-weight:600;color:${r.c}">${r.t}</span><span style="color:#94A3B8;font-size:12px">(${r.s})</span></div>`).join("")}</div>
        <div style="font-size:14px;font-weight:600;color:#1E1E2E;margin-bottom:8px">Key Tier 1 Regulations:</div>
        ${complianceRules.map(r => `<div style="padding:4px 0 4px 12px;border-left:2px solid #dc2626;font-size:14px;color:#333">${r.trim()}</div>`).join("")}`),
      // Slide 7 — Pricing
      lightSlide("Pricing", `<div style="display:flex;gap:16px;margin-top:12px">
        ${[{p:"$29/mo",n:"Starter",cr:"500 credits"},{p:"$49/mo",n:"Professional",cr:"1,500 credits"},{p:"$79/mo",n:"Enterprise",cr:"3,000 credits"}]
        .map(t => `<div style="flex:1;background:white;border:1px solid #E2E8F0;border-radius:12px;padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#6B46C1">${t.p}</div>
          <div style="font-size:14px;font-weight:600;color:#1E1E2E;margin-top:4px">${t.n}</div>
          <div style="font-size:12px;color:#94A3B8;margin-top:4px">${t.cr}</div></div>`).join("")}</div>
        <div style="margin-top:16px;font-size:14px;color:#94A3B8">14-day free trial included. No credit card required to start.</div>`),
      // Slide 8 — Market Context
      lightSlide("Market Context", deckSlides[7].body),
      // Slide 9 — Creator
      lightSlide("About the Creator", deckSlides[8].body),
      // Slide 10 — CTA (dark)
      darkSlide(`${iconImg}
        <h1 style="font-size:42px;font-weight:700;margin:0 0 16px 0;text-align:center">Subscribe to ${workerName}</h1>
        <div style="display:flex;gap:12px;margin-bottom:24px">
          <div style="padding:8px 20px;background:#6B46C1;color:white;border-radius:8px;font-size:14px;font-weight:600">14-Day Free Trial</div>
          <div style="padding:8px 20px;background:rgba(255,255,255,0.1);color:white;border-radius:8px;font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,0.2)">Compliance Guaranteed</div>
        </div>
        <p style="font-size:18px;color:rgba(255,255,255,0.7);margin:0 0 8px 0">${workerUrl}</p>
        <img src="${qrPng}" style="width:120px;height:120px;border-radius:8px;margin-top:12px" />
        <div style="position:absolute;bottom:24px;left:40px;right:40px;display:flex;justify-content:space-between;font-size:10px;color:#94A3B8">
          <span>alex@titleapp.ai</span><span>titleapp.ai</span></div>`),
    ];

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${workerName} - Pitch Deck</title>
<style>@page{size:landscape;margin:0}body{margin:0}*{box-sizing:border-box}</style></head><body>${slides.join("")}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-pitch-deck.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // CODEX 47.1 Fix 7 — Game-specific client-side deck (10 slides, embeds canvas artwork)
  function generateGameClientDeck() {
    const accent = "#16A34A"; // green for games
    const heroBg = backgroundAssets[0]?.imageUrl || null;
    const footer = `<div style="position:absolute;bottom:24px;left:40px;right:40px;display:flex;justify-content:space-between;font-size:10px;color:#94A3B8;font-family:Calibri,sans-serif">
      <span>titleapp.ai</span><span>Game</span><span>alex@titleapp.ai</span></div>`;
    const darkSlide = (content, bgUrl) => {
      const bg = bgUrl
        ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('${bgUrl}') center/cover`
        : "#0F172A";
      return `<div style="width:100vw;height:100vh;background:${bg};color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;box-sizing:border-box;page-break-after:always;position:relative;font-family:Calibri,sans-serif">${content}</div>`;
    };
    const lightSlide = (title, body) => `<div style="width:100vw;height:100vh;background:#F8FAFC;color:#0F172A;display:flex;flex-direction:column;justify-content:flex-start;padding:60px;box-sizing:border-box;page-break-after:always;position:relative;font-family:Calibri,sans-serif">
      <div style="font-size:12px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">TitleApp Game</div>
      <h2 style="font-size:36px;font-weight:700;color:#0F172A;margin:0 0 24px 0;border-bottom:3px solid ${accent};padding-bottom:12px;display:inline-block">${title}</h2>
      <div style="font-size:16px;line-height:1.8;color:#1E293B;max-width:800px;white-space:pre-wrap">${body}</div>${footer}</div>`;

    // Build the character/world image strip — up to 4 character thumbs
    const charStrip = characterAssets.slice(0, 4).map(a =>
      `<div style="background:white;border-radius:12px;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15)">
        <img src="${a.imageUrl}" style="width:160px;height:160px;object-fit:contain;display:block;border-radius:6px" />
       </div>`
    ).join("");
    const bgStrip = backgroundAssets.slice(0, 2).map(a =>
      `<img src="${a.imageUrl}" style="width:280px;height:160px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15)" />`
    ).join("");

    const slides = [
      // Slide 1 — Title (hero with background art if available)
      darkSlide(`
        <div style="font-size:12px;font-weight:600;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">TitleApp Game</div>
        <h1 style="font-size:56px;font-weight:800;margin:0 0 16px 0;text-align:center;text-shadow:0 4px 16px rgba(0,0,0,0.5)">${workerName}</h1>
        <p style="font-size:20px;color:rgba(255,255,255,0.85);margin:0;text-align:center;max-width:800px">${gameTagline}</p>
        <div style="position:absolute;bottom:24px;left:40px;font-size:10px;color:rgba(255,255,255,0.6)">${vertical || "Game"}</div>
        <div style="position:absolute;bottom:24px;right:40px;font-size:10px;color:rgba(255,255,255,0.6)">titleapp.ai</div>`, heroBg),
      // Slide 2 — The Game
      lightSlide("The Game", gameDeckSlides[1].body),
      // Slide 3 — Gameplay
      lightSlide("Gameplay", gameDeckSlides[2].body),
      // Slide 4 — Characters & World (with art)
      `<div style="width:100vw;height:100vh;background:#F8FAFC;color:#0F172A;display:flex;flex-direction:column;justify-content:flex-start;padding:60px;box-sizing:border-box;page-break-after:always;position:relative;font-family:Calibri,sans-serif">
        <div style="font-size:12px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">TitleApp Game</div>
        <h2 style="font-size:36px;font-weight:700;color:#0F172A;margin:0 0 24px 0;border-bottom:3px solid ${accent};padding-bottom:12px;display:inline-block">Characters &amp; World</h2>
        <div style="font-size:16px;line-height:1.8;color:#1E293B;max-width:800px;margin-bottom:24px">${gameDeckSlides[3].body}</div>
        ${charStrip ? `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">${charStrip}</div>` : ""}
        ${bgStrip ? `<div style="display:flex;gap:16px;flex-wrap:wrap">${bgStrip}</div>` : ""}
        ${footer}</div>`,
      // Slide 5 — Learning & Purpose
      lightSlide("Learning &amp; Purpose", gameDeckSlides[4].body),
      // Slide 6 — Safety & Compliance
      lightSlide("Safety &amp; Compliance", gameDeckSlides[5].body),
      // Slide 7 — Pricing
      lightSlide("Pricing", `<div style="display:flex;gap:16px;margin-top:12px">
        ${[{p:"$29/mo",n:"Starter",cr:"500 credits"},{p:"$49/mo",n:"Professional",cr:"1,500 credits"},{p:"$79/mo",n:"Enterprise",cr:"3,000 credits"}]
        .map(t => `<div style="flex:1;background:white;border:1px solid #E2E8F0;border-radius:12px;padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:${accent}">${t.p}</div>
          <div style="font-size:14px;font-weight:600;color:#0F172A;margin-top:4px">${t.n}</div>
          <div style="font-size:12px;color:#94A3B8;margin-top:4px">${t.cr}</div></div>`).join("")}</div>
        <div style="margin-top:16px;font-size:14px;color:#94A3B8">14-day free trial included. No credit card required to start.</div>`),
      // Slide 8 — Creator
      lightSlide("About the Creator", gameDeckSlides[7].body),
      // Slide 9 — Distribution (QR + link)
      `<div style="width:100vw;height:100vh;background:#F8FAFC;color:#0F172A;display:flex;flex-direction:column;justify-content:flex-start;padding:60px;box-sizing:border-box;page-break-after:always;position:relative;font-family:Calibri,sans-serif">
        <div style="font-size:12px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">TitleApp Game</div>
        <h2 style="font-size:36px;font-weight:700;color:#0F172A;margin:0 0 24px 0;border-bottom:3px solid ${accent};padding-bottom:12px;display:inline-block">Distribution</h2>
        <div style="display:flex;gap:32px;align-items:center;margin-top:12px">
          <img src="${qrPng}" style="width:200px;height:200px;border-radius:12px;border:1px solid #E2E8F0" />
          <div>
            <div style="font-size:14px;color:#64748B;margin-bottom:8px">Scan to play, or visit:</div>
            <div style="font-size:18px;font-family:monospace;color:${accent};font-weight:600">${workerUrl}</div>
            <div style="font-size:13px;color:#94A3B8;margin-top:16px;max-width:340px;line-height:1.5">Share via SMS, social, QR on a business card, or embed directly into your site.</div>
          </div>
        </div>${footer}</div>`,
      // Slide 10 — CTA (dark, hero style)
      darkSlide(`
        <h1 style="font-size:48px;font-weight:800;margin:0 0 16px 0;text-align:center;text-shadow:0 4px 16px rgba(0,0,0,0.5)">Play ${workerName}</h1>
        <div style="display:flex;gap:12px;margin-bottom:24px">
          <div style="padding:8px 20px;background:${accent};color:white;border-radius:8px;font-size:14px;font-weight:600">14-Day Free Trial</div>
          <div style="padding:8px 20px;background:rgba(255,255,255,0.1);color:white;border-radius:8px;font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,0.2)">No download required</div>
        </div>
        <p style="font-size:18px;color:rgba(255,255,255,0.85);margin:0 0 8px 0">${workerUrl}</p>
        <img src="${qrPng}" style="width:140px;height:140px;border-radius:8px;margin-top:12px" />
        <div style="position:absolute;bottom:24px;left:40px;right:40px;display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.6)">
          <span>alex@titleapp.ai</span><span>titleapp.ai</span></div>`, heroBg),
    ];

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${workerName} - Game Pitch Deck</title>
<style>@page{size:landscape;margin:0}body{margin:0}*{box-sizing:border-box}</style></head><body>${slides.join("")}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-game-pitch-deck.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function generateDeck(format) {
    setDeckGenerating(true);
    setDeckFormat(format);
    setDeckError(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID");
      // CODEX 47.1 Fix 7 — pick the right slide set + template
      const activeSlides = isGame ? gameDeckSlides : deckSlides;
      const templateId = isGame ? "deck-game" : "deck-standard";
      const res = await fetch(`${API_BASE}/api?path=/v1/docs:generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
        body: JSON.stringify({
          tenantId, templateId, format,
          data: {
            title: workerName, description: workerDesc, targetUser, vertical,
            price: `$${tierPrice}/mo`, slug, workerUrl, isGame,
            problemSolves: workerCardData?.problemSolves || "",
            complianceRules: workerCardData?.complianceRules || "",
            jurisdiction: workerCardData?.jurisdiction || "National",
            gameRules: isGame ? gameRules : undefined,
            characterImageUrls: isGame ? characterAssets.slice(0, 4).map(a => a.imageUrl) : undefined,
            backgroundImageUrls: isGame ? backgroundAssets.slice(0, 2).map(a => a.imageUrl) : undefined,
            slides: activeSlides.map((s, i) => ({
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
        Everything you need to share your {workerCardData?.gameConfig?.isGame ? "game" : "worker"}. Copy and paste — Alex wrote it all for you.
      </div>

      {/* Start Small */}
      <div style={{ ...sectionStyle, background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)", border: "1px solid #e9d5ff" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6B46C1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Start Small First</div>
        <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.6, marginBottom: 12 }}>
          Share with 3-5 people you trust before you go wide.<br />
          Ask them: What's confusing? What's missing?<br />
          Their feedback makes v2 much stronger.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.7)", borderRadius: 6, border: "1px solid #e9d5ff", color: "#6B46C1", fontSize: 14, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workerUrl}</div>
          <button style={copyBtnStyle("private-url")} onClick={() => copyText("private-url", workerUrl)}>{copied === "private-url" ? "Copied" : "Copy your private link"}</button>
        </div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 12, lineHeight: 1.6, fontStyle: "italic" }}>
          The first people to use your {workerCardData?.gameConfig?.isGame ? "game" : "worker"} shape what it becomes. They're not beta testers. They're founding members.
        </div>
      </div>

      {/* Go Wide — only after first update */}
      {hasUpdatedSinceLaunch && (
        <div style={{ ...sectionStyle, background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", border: "1px solid #a7f3d0", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#065f46", marginBottom: 8 }}>Ready to share with everyone?</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.7)", borderRadius: 6, border: "1px solid #a7f3d0", color: "#6B46C1", fontSize: 14, fontFamily: "monospace" }}>{workerUrl}</div>
            <button style={copyBtnStyle("go-wide")} onClick={() => copyText("go-wide", workerUrl)}>{copied === "go-wide" ? "Copied" : "Copy"}</button>
          </div>
        </div>
      )}

      {/* Live URL */}
      <div style={sectionStyle}>
        <span style={labelStyle}>{hasUpdatedSinceLaunch ? "Your live link" : "Your private link"}</span>
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

      {/* Worker Icon */}
      {workerCardData?.iconDataUrl && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Worker icon</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={workerCardData.iconDataUrl} alt="Worker icon" style={{ width: 80, height: 80, borderRadius: 16, objectFit: "cover", border: "1px solid #E2E8F0" }} />
            <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
              Your worker icon appears in the marketplace, client deck, and share pages. You can change it anytime in the Build step.
            </div>
          </div>
        </div>
      )}

      {/* QR Code — CODEX 47.1 Fix 8: error handling + plain link fallback */}
      <div style={sectionStyle}>
        <span style={labelStyle}>QR code</span>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>For conferences, classrooms, and lanyards. 300 DPI print-ready.</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ background: "white", padding: 8, borderRadius: 8, flexShrink: 0, border: "1px solid #E2E8F0", width: 176, height: 176, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {qrFailed ? (
              <div style={{ textAlign: "center", padding: 8 }}>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6, lineHeight: 1.4 }}>
                  QR image didn't load.
                </div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: accentColor, wordBreak: "break-all", marginBottom: 8 }}>
                  {workerUrl}
                </div>
                <button
                  onClick={() => { setQrFailed(false); setQrAttempt(a => a + 1); }}
                  style={{ padding: "4px 10px", background: accentColor, color: "white", border: "none", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <img
                key={qrAttempt}
                src={qrPng}
                alt="QR Code"
                width={160}
                height={160}
                style={{ display: "block" }}
                onError={() => setQrFailed(true)}
              />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => downloadFile(qrPng, `${slug}-qr.png`)}
              style={{ padding: "8px 16px", background: "#F8F9FC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}
            >
              Download PNG (300 DPI)
            </button>
            <button
              onClick={() => downloadFile(qrSvg, `${slug}-qr.svg`)}
              style={{ padding: "8px 16px", background: "#F8F9FC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}
            >
              Download SVG
            </button>
            <button
              onClick={() => copyText("qr-url", workerUrl)}
              style={{ padding: "8px 16px", background: "#F8F9FC", color: copied === "qr-url" ? "#10b981" : "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}
            >
              {copied === "qr-url" ? "Copied" : "Copy plain link"}
            </button>
            <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
              Print on badges, business cards, or posters. Anyone who scans it goes straight to your {isGame ? "game" : "worker"}.
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
          {isGame
            ? "Auto-generated from your game. Gameplay, characters, safety, pricing, CTA — with your real artwork embedded."
            : "Auto-generated from your Worker Card. Problem, solution, compliance, pricing, CTA — all branded."}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ padding: "10px 20px", background: accentColor, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: deckGenerating ? 0.7 : 1 }}
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
          {isGame
            ? "10 slides: Title, The Game, Gameplay, Characters & World, Learning & Purpose, Safety & Compliance, Pricing, Creator, Distribution, Play Now"
            : "10 slides: Title, Problem, Solution, How It Works, Audience, Compliance, Pricing, Market Context, Creator, CTA"}
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
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6B46C1" }}>$79/mo</span>
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
