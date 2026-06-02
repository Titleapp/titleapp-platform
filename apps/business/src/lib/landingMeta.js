// Per-vertical SEO meta + JSON-LD for landing pages.
// Called from LandingPage.jsx — keeps the SEO config in one file.

const META = {
  auto: {
    title: "SOCIII for Auto Dealers — AI Workers for Service & Sales",
    description: "AI Digital Workers built for auto dealers — turn every RO into a trade-in opportunity, recover $180K–$420K per rooftop. Integrates with DMS, no extra work for advisors. Audit-trail governed.",
    path: "/auto",
    serviceName: "SOCIII Digital Workers for Auto Dealers",
    serviceCategory: "Auto dealership operations automation",
  },
  pilot: {
    title: "SOCIII Aviation — Digital Copilot, Free Logbook, FAA Library",
    description: "Your digital copilot. Blockchain-verified logbook. ForeFlight integrated. Currency tracking, medical alerts, FAA handbook library — all current, always free for pilots. Built for Part 91 + Part 135.",
    path: "/pilot",
    serviceName: "SOCIII Digital Workers for Aviation",
    serviceCategory: "Aviation operations + logbook + compliance",
  },
  "property-management": {
    title: "SOCIII for Property Management — AI Workers for Operations",
    description: "AI Digital Workers built for property managers — tenant communication, lease compliance, maintenance dispatch, rent collection workflows. Audit trail on every action. Compliance-aware.",
    path: "/property-management",
    serviceName: "SOCIII Digital Workers for Property Management",
    serviceCategory: "Property management operations automation",
  },
  "title-escrow": {
    title: "SOCIII for Title & Escrow — AI Workers for Closing Operations",
    description: "AI Digital Workers built for title agents and escrow officers — chain-of-title rebuild from event log, automated commitment letter drafts, document workflow tied to parcel records.",
    path: "/title-escrow",
    serviceName: "SOCIII Digital Workers for Title & Escrow",
    serviceCategory: "Title and escrow workflow automation",
  },
};

function setMetaTag(selector, attr, value, createWith) {
  let el = document.querySelector(selector);
  if (!el && createWith) {
    el = document.createElement(createWith.tag);
    Object.entries(createWith.attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  if (el) el.setAttribute(attr, value);
}

export function applyLandingMeta(vertical) {
  const cfg = META[vertical];
  if (!cfg) return;
  const canonical = `https://sociii.ai${cfg.path}`;

  document.title = cfg.title;
  setMetaTag('meta[name="description"]', "content", cfg.description, { tag: "meta", attrs: { name: "description" } });
  setMetaTag('meta[property="og:title"]', "content", cfg.title, { tag: "meta", attrs: { property: "og:title" } });
  setMetaTag('meta[property="og:description"]', "content", cfg.description, { tag: "meta", attrs: { property: "og:description" } });
  setMetaTag('meta[property="og:url"]', "content", canonical, { tag: "meta", attrs: { property: "og:url" } });
  setMetaTag('meta[property="og:type"]', "content", "website", { tag: "meta", attrs: { property: "og:type" } });
  setMetaTag('meta[property="og:image"]', "content", "https://sociii.ai/logo.png", { tag: "meta", attrs: { property: "og:image" } });
  setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image", { tag: "meta", attrs: { name: "twitter:card" } });
  setMetaTag('meta[name="twitter:title"]', "content", cfg.title, { tag: "meta", attrs: { name: "twitter:title" } });
  setMetaTag('meta[name="twitter:description"]', "content", cfg.description, { tag: "meta", attrs: { name: "twitter:description" } });
  setMetaTag('link[rel="canonical"]', "href", canonical, { tag: "link", attrs: { rel: "canonical" } });

  // Service JSON-LD per vertical
  let ld = document.querySelector('script[type="application/ld+json"][data-landing="1"]');
  if (!ld) {
    ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.setAttribute("data-landing", "1");
    document.head.appendChild(ld);
  }
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Service",
    name: cfg.serviceName,
    serviceType: cfg.serviceCategory,
    description: cfg.description,
    provider: { "@type": "Organization", name: "SOCIII Inc.", url: "https://sociii.ai", logo: "https://sociii.ai/logo.png" },
    areaServed: { "@type": "Country", name: "United States" },
    url: canonical,
  });
}
