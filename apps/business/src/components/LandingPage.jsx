import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";

// ── TitleApp Landing Page ─────────────────────────────────────────
// White premium aesthetic. Chat bar hero. Industry carousel. No auth — that happens on /login.

const VERTICALS = [
  { label: "Real Estate", desc: "Title search, closing coordination, compliance monitoring. 8 development phases.", param: "real-estate", count: "67 workers" },
  { label: "Construction", desc: "Permitting, inspections, lien tracking, project compliance.", param: "construction", count: "12 workers" },
  { label: "Mortgage", desc: "Loan origination, underwriting support, disclosure compliance.", param: "mortgage", count: "10 workers" },
  { label: "Aviation", desc: "CoPilots for PC12-NG, King Air, Caravan. Logbook, currency, training.", param: "aviation", count: "56 workers" },
  { label: "Auto Dealer", desc: "F&I, deal jacket, inventory, compliance. Every phase of the deal lifecycle.", param: "auto-dealer", count: "29 workers" },
  { label: "Government", desc: "DMV & Title, permitting, inspections, recording services, operations.", param: "government", count: "58 workers" },
  { label: "Legal", desc: "Contract review, compliance tracking, regulatory filing.", param: "legal", count: "8 workers" },
  { label: "Healthcare", desc: "Patient records compliance, billing, credentialing.", param: "healthcare", count: "10 workers" },
  { label: "Health & EMS", desc: "EMS protocols, training compliance, certification tracking.", param: "health-ems-education", count: "42 workers" },
  { label: "Solar", desc: "Proposal generation, permitting, interconnection compliance.", param: "solar", count: "8 workers" },
  { label: "Investment", desc: "Portfolio analysis, deal screening, evidence-first diligence.", param: "investment", count: "6 workers" },
  { label: "Relocation", desc: "Move management, corporate relocation, vendor coordination.", param: "relocation", count: "4 workers" },
  { label: "Title & Escrow", desc: "Title search, escrow closing, settlement compliance.", param: "title-escrow", count: "12 workers" },
  { label: "Platform", desc: "Business in a Box — accounting, HR, marketing, control center.", param: "platform", count: "4 workers" },
];

const STATS = [
  { num: "1,000+", label: "Digital Workers" },
  { num: "14", label: "Industries" },
  { num: "20+", label: "Languages" },
  { num: "24/7", label: "Always On" },
];

const LANGUAGES = [
  { code: "en", native: "English" },
  { code: "es", native: "Español" },
  { code: "fr", native: "Français" },
  { code: "de", native: "Deutsch" },
  { code: "pt", native: "Português" },
  { code: "it", native: "Italiano" },
  { code: "nl", native: "Nederlands" },
  { code: "pl", native: "Polski" },
  { code: "sv", native: "Svenska" },
  { code: "no", native: "Norsk" },
  { code: "da", native: "Dansk" },
  { code: "fi", native: "Suomi" },
  { code: "ja", native: "日本語" },
  { code: "ko", native: "한국어" },
  { code: "zh", native: "中文" },
  { code: "ar", native: "عربي" },
  { code: "hi", native: "हिन्दी" },
  { code: "tr", native: "Türkçe" },
  { code: "th", native: "ไทย" },
  { code: "vi", native: "Tiếng Việt" },
  { code: "id", native: "Bahasa Indonesia" },
];

/* TODO: wire to Firestore before public launch — digitalWorkers collection, sort by sessionCount desc, limit 10 */
const TOP_WORKERS = [
  { name: "Business Accounting", vertical: "Platform", rating: "4.9", sessions: "14,203" },
  { name: "PC12-NG CoPilot", vertical: "Aviation", rating: "5.0", sessions: "11,847" },
  { name: "Title Search Pro", vertical: "Real Estate", rating: "4.9", sessions: "9,634" },
  { name: "F&I Compliance", vertical: "Auto Dealer", rating: "4.9", sessions: "8,291" },
  { name: "Solar Proposal Builder", vertical: "Solar", rating: "5.0", sessions: "7,158" },
  { name: "Portfolio Analyst", vertical: "Investment", rating: "4.8", sessions: "6,442" },
  { name: "HR & People", vertical: "Platform", rating: "4.8", sessions: "5,891" },
  { name: "Marketing & Content", vertical: "Platform", rating: "4.9", sessions: "5,203" },
  { name: "Currency & Medical", vertical: "Aviation", rating: "4.9", sessions: "4,967" },
  { name: "Control Center Pro", vertical: "Platform", rating: "5.0", sessions: "4,412" },
];

const TOP_GAMES = [
  { name: "DinoShare Learning Game", genre: "Education", audience: "Ages 6-10", plays: "1,247", cta: "Play free" },
  { name: "Dino Crew Survival", genre: "Adventure", audience: "Ages 8-12", plays: "891", cta: "Play free" },
  { name: "Coming Soon", genre: "", audience: "", plays: "", cta: null, comingSoon: true },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Pick a worker", desc: "Browse by industry. Every worker is trained on the rules of your field." },
  { step: "2", title: "Start free", desc: "14-day free trial. No credit card. Cancel anytime." },
  { step: "3", title: "Work gets done", desc: "Your Digital Worker handles the compliance-heavy work. You keep the audit trail." },
];

const PRICING_TIERS = [
  { tier: "Free", price: "$0", per: "", desc: "Alex + hundreds of free workers. Always free. No credit card." },
  { tier: "Standard", price: "$29", per: "/mo", desc: "Standard complexity workers and databases." },
  { tier: "Professional", price: "$49", per: "/mo", desc: "Advanced complexity workers and databases." },
  { tier: "Enterprise", price: "$79", per: "/mo", desc: "Maximum complexity workers and databases." },
];

export default function LandingPage() {
  const appBase = window.location.hostname === "localhost"
    ? ""
    : "https://app.titleapp.ai";

  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [fading, setFading] = useState(false);
  const [fadeVisible, setFadeVisible] = useState(false);
  const [scoreboardTab, setScoreboardTab] = useState("workers"); // mobile tab: "workers" | "games"
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const industryRef = useRef(null);
  const workersScrollRef = useRef(null);
  const gamesScrollRef = useRef(null);
  const workersHovered = useRef(false);
  const gamesHovered = useRef(false);

  const browserLang = useMemo(() => {
    try { return (navigator.language || "en").split("-")[0].toLowerCase(); }
    catch { return "en"; }
  }, []);

  const sortedLangs = useMemo(() =>
    [...LANGUAGES].sort((a, b) =>
      a.code === browserLang ? -1 : b.code === browserLang ? 1 : 0
    ), [browserLang]);

  // Auto-rotate scoreboards every 4 seconds, pause on hover
  useEffect(() => {
    function autoScroll(ref, hoveredRef) {
      const el = ref.current;
      if (!el || hoveredRef.current) return;
      const card = el.querySelector("[data-scard]");
      if (!card) return;
      const step = card.offsetWidth + 16;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }
    const id = setInterval(() => {
      autoScroll(workersScrollRef, workersHovered);
      autoScroll(gamesScrollRef, gamesHovered);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  function navigateWithFade(url) {
    setFading(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeVisible(true));
    });
    setTimeout(() => { window.location.href = url; }, 450);
  }

  function handleSubmit() {
    const text = query.trim();
    if (!text) return;
    navigateWithFade(`${appBase}/meet-alex?prompt=${encodeURIComponent(text)}`);
  }

  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  function scrollIndustry(dir) {
    const el = industryRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-vcard]")?.offsetWidth || 240;
    el.scrollBy({ left: dir * (cardWidth + 16), behavior: "smooth" });
  }

  return (
    <div style={S.page}>
      {/* Fade overlay */}
      {fading && (
        <div style={{
          position: "fixed", inset: 0, background: "#ffffff", zIndex: 9999,
          opacity: fadeVisible ? 1 : 0, transition: "opacity 400ms ease",
        }} />
      )}

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={S.logoWrap}>
          <div style={S.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <span style={S.logoText}>TitleApp</span>
          <span style={{ background: "#6B46C1", color: "white", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", letterSpacing: "0.08em", marginLeft: "8px", verticalAlign: "middle", textTransform: "uppercase" }}>BETA</span>
        </div>
        <div style={S.headerRight}>
          <a href={`${appBase}/meet-alex?action=signin`} style={S.headerLink}>Sign In</a>
          <a href={`${appBase}/sandbox`} style={S.headerLink}>Creators</a>
          <a href={`${appBase}/meet-alex`} style={S.headerCta}>Start Free</a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={{ marginBottom: "12px" }}>
            <span style={{ background: "#6B46C1", color: "white", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "999px", letterSpacing: "0.08em", textTransform: "uppercase" }}>BETA</span>
          </div>
          <div style={S.heroTag}>The Digital Worker Platform</div>
          <h1 style={S.heroH1}>Finally. AI that knows what it's talking about.</h1>
          <p style={S.heroSub}>Every Digital Worker is trained on your industry's rules and built by leading experts in your field.</p>

          {/* Chat bar */}
          <div style={S.chatBar}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Ask Alex anything..."
              style={S.chatInput}
            />
            <button onClick={toggleMic} style={{ ...S.chatBtn, color: listening ? "#7c3aed" : "#9ca3af" }} title="Voice input">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button onClick={handleSubmit} disabled={!query.trim()} style={{ ...S.chatBtn, color: query.trim() ? "#7c3aed" : "#d1d5db" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── Split Scoreboard: Workers + Games ── */}
      <section style={S.topWorkersSection}>
        <div style={{ ...S.sectionInner, maxWidth: 1100 }}>

          {/* Mobile tab switcher */}
          <div className="sb-tab-switcher" style={S.tabSwitcher}>
            <button
              onClick={() => setScoreboardTab("workers")}
              style={{ ...S.tabBtn, ...(scoreboardTab === "workers" ? S.tabBtnActiveWorkers : {}) }}
            >Workers</button>
            <button
              onClick={() => setScoreboardTab("games")}
              style={{ ...S.tabBtn, ...(scoreboardTab === "games" ? S.tabBtnActiveGames : {}) }}
            >Games</button>
          </div>

          <div className="sb-grid" style={S.scoreboardGrid}>
            {/* Left: Top Workers — purple accent */}
            <div className={scoreboardTab !== "workers" ? "sb-hide-mobile" : ""} style={S.scoreboardCol}>
              <div style={S.scoreboardHeader}>
                <span style={S.liveDot} />
                <span style={S.liveLabel}>Live</span>
              </div>
              <h2 style={S.scoreboardTitle}>Top Workers</h2>
              <p style={S.scoreboardSub}>Trusted by professionals across 14 industries.</p>
              <div
                ref={workersScrollRef}
                style={S.topWorkersScroll}
                onMouseEnter={() => { workersHovered.current = true; }}
                onMouseLeave={() => { workersHovered.current = false; }}
              >
                {TOP_WORKERS.map((w, i) => (
                  <a key={w.name} data-scard="" href="https://app.titleapp.ai" style={S.topWorkerCard}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#6B7280", marginBottom: 6 }}>#{i + 1}</div>
                    <div style={S.topWorkerName}>{w.name}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>{w.sessions} sessions</div>
                    <div style={S.topWorkerVertical}>{w.vertical}</div>
                    <div style={S.topWorkerRating}>&#11088; {w.rating}</div>
                    <div style={S.topWorkerCta}>Try it</div>
                  </a>
                ))}
              </div>
            </div>

            {/* Right: Games — compact "Coming Soon" teaser */}
            <div className={scoreboardTab !== "games" ? "sb-hide-mobile" : ""} style={S.gamesTeaser}>
              <div style={S.gamesTeaserInner}>
                <div style={S.gamesTeaserIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div style={S.gamesTeaserBadge}>Coming Soon</div>
                <h3 style={S.gamesTeaserTitle}>TitleApp Games</h3>
                <p style={S.gamesTeaserDesc}>Educational games for kids. Built on the same platform. Free to play.</p>
                <div style={S.gamesTeaserPreview}>
                  {TOP_GAMES.filter(g => !g.comingSoon).map((g, i) => (
                    <div key={g.name} style={S.gamesTeaserItem}>
                      <span style={S.gamesTeaserRank}>#{i + 1}</span>
                      <div>
                        <div style={S.gamesTeaserItemName}>{g.name}</div>
                        <div style={S.gamesTeaserItemMeta}>{g.genre} &middot; {g.audience}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={S.gamesTeaserNotify}>Notify me when games launch</div>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            @media (max-width: 768px) {
              .sb-tab-switcher { display: flex !important; }
              .sb-grid { flex-direction: column !important; }
              .sb-hide-mobile { display: none !important; }
            }
          `}</style>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section style={S.statsBar}>
        <div style={S.statsInner}>
          {STATS.map(s => (
            <div key={s.label} style={S.statItem}>
              <div style={S.statNum}>{s.num}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Language Pills ── */}
      <section style={S.langSection}>
        <div style={S.langLabel}>Every worker speaks your language</div>
        <div style={S.langPills}>
          {sortedLangs.map(l => (
            <span key={l.code} style={{
              ...S.langPill,
              ...(l.code === browserLang ? { fontWeight: 700, color: "#7c3aed", borderColor: "#7c3aed" } : {}),
            }}>{l.native}</span>
          ))}
        </div>
      </section>

      {/* ── Industry Carousel (dark) ── */}
      {/* TODO: wire worker counts to live Firestore counts before launch */}
      <section id="verticals" style={{ ...S.section, background: "#0A0A0A" }}>
        <div style={S.sectionInner}>
          <h2 style={{ ...S.sectionH2, color: "#ffffff" }}>Choose your industry.</h2>
          <p style={{ ...S.sectionSub, color: "#9CA3AF" }}>Every vertical has dedicated Digital Workers built by people who know the rules.</p>
          <div style={S.carouselWrap}>
            <button onClick={() => scrollIndustry(-1)} style={{ ...S.carouselArrow, left: -4 }} aria-label="Scroll left">&#8249;</button>
            <div ref={industryRef} style={S.carouselTrack}>
              {VERTICALS.map(v => (
                <a key={v.param} data-vcard="" href={`${appBase}/meet-alex?vertical=${v.param}&v=2`} style={S.verticalCard}>
                  <div style={S.verticalName}>{v.label}</div>
                  <div style={S.verticalDesc}>{v.desc}</div>
                  <div style={S.verticalFooter}>
                    <span style={S.verticalCount}>{v.count}</span>
                    <span style={S.verticalArrow}>&rarr;</span>
                  </div>
                </a>
              ))}
            </div>
            <button onClick={() => scrollIndustry(1)} style={{ ...S.carouselArrow, right: -4 }} aria-label="Scroll right">&#8250;</button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ ...S.section, background: "#f9fafb" }}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>Three steps. Under 60 seconds.</h2>
          <div style={S.stepsGrid}>
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} style={S.stepCard}>
                <div style={S.stepNum}>{h.step}</div>
                <div style={S.stepTitle}>{h.title}</div>
                <div style={S.stepDesc}>{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alex (dark) ── */}
      <section style={{ ...S.section, background: "#0A0A0A" }}>
        <div style={S.sectionInner}>
          <div style={S.alexCard}>
            <div style={S.alexAvatar}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div style={S.alexName}>Alex</div>
              <div style={S.alexRole}>Chief of Staff</div>
            </div>
            <div style={S.alexBody}>
              Alex is your first hire. Free on every account. She knows every worker in the marketplace,
              helps you pick the right ones for your field, and coordinates everything once they're on your team.
            </div>
            <a href={`${appBase}/meet-alex`} style={S.btnPrimary}>Talk to Alex</a>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ ...S.section, background: "#f8fafc" }}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>Simple pricing. No surprises.</h2>

          {/* Trust bar */}
          <div style={S.trustBar}>
            <span style={S.trustItem}>14-day free trial on everything.</span>
            <span style={S.trustItem}>60-day money back guarantee — no questions asked.</span>
            <span style={S.trustItem}>Cancel anytime. No unsubscribe hell.</span>
          </div>

          {/* Individual Plans */}
          <div style={S.pricingTrackLabel}>Individual Plans</div>
          <div style={S.pricingGrid}>
            {PRICING_TIERS.map(p => (
              <div key={p.tier} style={S.priceCard}>
                <div style={S.priceTier}>{p.tier}</div>
                <div style={S.priceAmount}>{p.price}{p.per && <span style={S.pricePer}>{p.per}</span>}</div>
                <div style={S.priceDesc}>{p.desc}</div>
                <a href="https://app.titleapp.ai" style={S.priceBtn}>
                  {p.tier === "Free" ? "Get Started" : "Start Free Trial"}
                </a>
              </div>
            ))}
          </div>

          {/* Business in a Box */}
          <div style={S.pricingTrackLabel}>Business in a Box</div>
          <div style={S.biabCard}>
            <div style={S.biabBadge}>Recommended</div>
            <div style={S.biabHeadline}>Your entire industry team.</div>
            <div style={S.biabPrice}>$99<span style={S.biabPer}>/mo</span></div>
            <div style={S.biabSub}>15-20 expert Digital Workers. Built for your industry. $3 a day.</div>
            <div style={S.biabData}>Need more data? No problem — charge it up just like your Claude or ChatGPT account.</div>
            <a href="https://app.titleapp.ai" style={S.biabCta}>Get Started</a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={S.finalCta}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Meet your team at TitleApp.</h2>
        <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 28 }}>Start free. No credit card. Workers ready in seconds.</p>
        <a href={`${appBase}/meet-alex`} style={{ ...S.btnPrimary, fontSize: 16, padding: "14px 36px" }}>Start Free</a>
      </section>

      {/* ── For Developers ── */}
      <section style={{ background: "#0f172a", padding: "64px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <span style={{ background: "#6B46C1", color: "white", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px", display: "inline-block" }}>BETA</span>
          <h2 style={{ color: "white", fontSize: "28px", fontWeight: "700", margin: "12px 0 8px" }}>For Developers</h2>
          <p style={{ color: "#94a3b8", fontSize: "16px", marginBottom: "32px", lineHeight: "1.6" }}>
            Build on TitleApp using our SDK and API. Install in 5 minutes and make your first API call.
          </p>
          <a href="/developers" style={{ display: "inline-block", background: "#6B46C1", color: "white", padding: "12px 28px", borderRadius: "8px", fontWeight: "600", fontSize: "15px", textDecoration: "none", marginBottom: "24px" }}>
            Get Started with the SDK →
          </a>
          <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", marginTop: "16px" }}>
            <a href="/developers" style={{ color: "#7c3aed", fontSize: "14px", textDecoration: "none" }}>SDK Documentation</a>
            <a href="/developers" style={{ color: "#7c3aed", fontSize: "14px", textDecoration: "none" }}>API Reference</a>
            <a href="/developers" style={{ color: "#7c3aed", fontSize: "14px", textDecoration: "none" }}>Contributor Guide</a>
          </div>
          <p style={{ color: "#475569", fontSize: "12px", marginTop: "24px" }}>
            TitleApp is in BETA. APIs and features subject to change. Spine endpoints (contacts, transactions, assets) coming in v0.2.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>
            <span style={{ fontWeight: 700, color: "#111827" }}>TitleApp</span>
            <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 8 }}>The Digital Worker Platform</span>
          </div>
          <div style={S.footerLinks}>
            <a href={`${appBase}/legal/privacy-policy`} style={S.footerLink}>Privacy</a>
            <a href={`${appBase}/legal/terms-of-service`} style={S.footerLink}>Terms</a>
            <a href={`${appBase}/meet-alex?prompt=I%20want%20to%20invest`} style={S.footerLink}>Investors</a>
            <a href={`${appBase}/sandbox`} style={S.footerLink}>Creators</a>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            The Title App LLC &middot; 1209 N Orange St, Wilmington DE 19801
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh", background: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#111827", overflowX: "hidden",
  },

  // Header
  header: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 32px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid #f0f0f0",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" },
  headerRight: { display: "flex", alignItems: "center", gap: 24 },
  headerLink: { fontSize: 14, color: "#6b7280", textDecoration: "none" },
  headerCta: {
    fontSize: 14, fontWeight: 600, color: "white", textDecoration: "none",
    padding: "8px 20px", borderRadius: 8, background: "#7c3aed",
  },

  // Hero
  hero: { paddingTop: 140, paddingBottom: 48, background: "#ffffff" },
  heroInner: { maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "0 24px" },
  heroTag: {
    fontSize: 13, fontWeight: 600, color: "#7c3aed", letterSpacing: "0.05em",
    textTransform: "uppercase", marginBottom: 20,
  },
  heroH1: { fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 12, color: "#111827", letterSpacing: "-1px" },
  heroSub: { fontSize: 22, color: "#6b7280", marginBottom: 28, fontWeight: 400 },

  // Chat bar
  chatBar: {
    display: "flex", alignItems: "center", gap: 0,
    maxWidth: 560, margin: "0 auto 16px", padding: "4px 4px 4px 20px",
    borderRadius: 16, border: "2px solid #e5e7eb", background: "#ffffff",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)", transition: "border-color 0.2s",
  },
  chatInput: {
    flex: 1, border: "none", outline: "none", fontSize: 16, color: "#111827",
    background: "transparent", padding: "12px 0", fontFamily: "inherit",
  },
  chatBtn: {
    width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "color 0.15s",
  },

  // Scoreboard (split: workers + games)
  topWorkersSection: { padding: "64px 24px", background: "#0A0A0A" },
  scoreboardGrid: {
    display: "flex", gap: 32,
  },
  scoreboardCol: { flex: 7, minWidth: 0 },
  scoreboardHideMobile: {},
  scoreboardHeader: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: "50%", background: "#22C55E",
    display: "inline-block", animation: "pulse-dot 2s infinite",
  },
  liveLabel: {
    fontSize: 11, fontWeight: 700, color: "#22C55E",
    letterSpacing: "0.1em", textTransform: "uppercase",
  },
  scoreboardTitle: {
    fontSize: 24, fontWeight: 800, color: "#ffffff", textAlign: "center", marginBottom: 4,
  },
  scoreboardSub: {
    fontSize: 13, color: "#9CA3AF", textAlign: "center", marginBottom: 20,
  },
  tabSwitcher: {
    display: "none", justifyContent: "center", gap: 0, marginBottom: 20,
    background: "#1A1A1A", borderRadius: 10, padding: 3, maxWidth: 260, margin: "0 auto 20px",
  },
  tabBtn: {
    flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, color: "#6B7280",
    background: "transparent", border: "none", borderRadius: 8, cursor: "pointer",
    transition: "all 0.2s",
  },
  tabBtnActiveWorkers: { background: "#7c3aed", color: "#ffffff" },
  tabBtnActiveGames: { background: "#16a34a", color: "#ffffff" },
  topWorkersScroll: {
    display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory",
    paddingBottom: 8, WebkitOverflowScrolling: "touch",
    msOverflowStyle: "none", scrollbarWidth: "none",
  },
  topWorkerCard: {
    flex: "0 0 160px", scrollSnapAlign: "start", padding: "18px 14px",
    borderRadius: 14, background: "#1A1A1A", border: "1px solid #2D2D2D",
    textDecoration: "none", textAlign: "center", transition: "border-color 0.2s, box-shadow 0.2s",
    cursor: "pointer",
  },
  topWorkerName: { fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 4 },
  topWorkerVertical: {
    display: "inline-block", fontSize: 10, fontWeight: 600, color: "#a78bfa",
    background: "rgba(167,139,250,0.12)", borderRadius: 12, padding: "2px 10px", marginBottom: 8,
  },
  topWorkerRating: { fontSize: 13, color: "#f59e0b", marginBottom: 10 },
  topWorkerCta: {
    fontSize: 12, fontWeight: 600, color: "#7c3aed",
    border: "1px solid #7c3aed", borderRadius: 8, padding: "5px 14px",
    display: "inline-block",
  },
  gameCtaBtn: {
    fontSize: 12, fontWeight: 600, color: "#16a34a",
    border: "1px solid #16a34a", borderRadius: 8, padding: "5px 14px",
    display: "inline-block",
  },
  gameCardComingSoon: {
    opacity: 0.4, cursor: "default",
  },
  gamesTeaser: {
    flex: 3, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center",
  },
  gamesTeaserInner: {
    width: "100%", padding: "28px 24px", borderRadius: 16,
    background: "#1A1A1A", border: "1px solid #2D2D2D", textAlign: "center",
  },
  gamesTeaserIcon: {
    width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px",
    background: "rgba(22,163,106,0.1)", border: "1px solid rgba(22,163,106,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  gamesTeaserBadge: {
    display: "inline-block", fontSize: 11, fontWeight: 700, color: "#16a34a",
    background: "rgba(22,163,106,0.1)", border: "1px solid rgba(22,163,106,0.2)",
    borderRadius: 20, padding: "3px 12px", marginBottom: 12,
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  gamesTeaserTitle: {
    fontSize: 20, fontWeight: 800, color: "#ffffff", marginBottom: 6,
  },
  gamesTeaserDesc: {
    fontSize: 13, color: "#9CA3AF", lineHeight: 1.6, marginBottom: 20,
  },
  gamesTeaserPreview: {
    display: "flex", flexDirection: "column", gap: 8, marginBottom: 20,
  },
  gamesTeaserItem: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
    background: "#111111", borderRadius: 10, textAlign: "left",
  },
  gamesTeaserRank: {
    fontSize: 12, fontWeight: 800, color: "#16a34a", flexShrink: 0,
  },
  gamesTeaserItemName: {
    fontSize: 13, fontWeight: 600, color: "#ffffff",
  },
  gamesTeaserItemMeta: {
    fontSize: 11, color: "#6B7280",
  },
  gamesTeaserNotify: {
    fontSize: 12, color: "#4B5563", fontStyle: "italic",
  },

  // Stats
  statsBar: { borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", marginTop: 20 },
  statsInner: {
    maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around",
    padding: "28px 24px", flexWrap: "wrap", gap: 16,
  },
  statItem: { textAlign: "center", minWidth: 100 },
  statNum: { fontSize: 28, fontWeight: 800, color: "#111827" },
  statLabel: { fontSize: 13, color: "#9ca3af", marginTop: 2 },

  // Language section
  langSection: { padding: "20px 24px 0", textAlign: "center" },
  langLabel: { fontSize: 14, fontWeight: 600, color: "#6b7280", marginBottom: 10 },
  langPills: {
    display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap",
    maxWidth: 640, margin: "0 auto",
  },
  langPill: {
    fontSize: 11, color: "#6b7280", background: "#f9fafb", border: "1px solid #e5e7eb",
    borderRadius: 12, padding: "3px 10px",
  },

  // Sections
  section: { padding: "72px 24px", background: "#ffffff" },
  sectionInner: { maxWidth: 960, margin: "0 auto" },
  sectionH2: { fontSize: 32, fontWeight: 800, color: "#111827", textAlign: "center", marginBottom: 8 },
  sectionSub: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 40 },

  // Industry carousel
  carouselWrap: { position: "relative", overflow: "hidden" },
  carouselTrack: {
    display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory",
    scrollBehavior: "smooth", paddingBottom: 8,
    WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none",
  },
  carouselArrow: {
    position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 5,
    width: 36, height: 36, borderRadius: "50%",
    background: "rgba(26,26,26,0.95)", border: "1px solid #2D2D2D",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24, color: "#9CA3AF", lineHeight: 1,
  },
  verticalCard: {
    flex: "0 0 calc(25% - 12px)", minWidth: 220, scrollSnapAlign: "start",
    display: "block", padding: "24px 20px", borderRadius: 14,
    background: "#1A1A1A", border: "1px solid #2D2D2D",
    textDecoration: "none", transition: "border-color 0.2s, box-shadow 0.2s",
    cursor: "pointer", boxSizing: "border-box",
  },
  verticalName: { fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 8 },
  verticalDesc: { fontSize: 13, color: "#9CA3AF", lineHeight: 1.6, marginBottom: 16 },
  verticalFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  verticalCount: { fontSize: 12, color: "#7c3aed", fontWeight: 600 },
  verticalArrow: { fontSize: 16, color: "#7c3aed" },

  // Steps
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 },
  stepCard: { padding: "28px 24px", borderRadius: 14, background: "#ffffff", border: "1px solid #e5e7eb" },
  stepNum: { fontSize: 32, fontWeight: 800, color: "#7c3aed", marginBottom: 12 },
  stepTitle: { fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 6 },
  stepDesc: { fontSize: 14, color: "#6b7280", lineHeight: 1.6 },

  // Alex
  alexCard: {
    maxWidth: 560, margin: "0 auto", padding: "32px 28px", borderRadius: 16,
    background: "#1A1A1A", border: "1px solid #2D2D2D",
    textAlign: "center",
  },
  alexAvatar: {
    width: 56, height: 56, borderRadius: "50%", margin: "0 auto 8px",
    background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  alexName: { fontSize: 18, fontWeight: 700, color: "#ffffff" },
  alexRole: { fontSize: 13, color: "#9CA3AF", marginBottom: 16 },
  alexBody: { fontSize: 14, color: "#9CA3AF", lineHeight: 1.7, marginBottom: 20 },

  // Pricing
  trustBar: {
    display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24,
    margin: "16px auto 40px", maxWidth: 800,
  },
  trustItem: { fontSize: 14, color: "#1e293b", fontWeight: 500 },
  pricingTrackLabel: {
    textAlign: "center", fontSize: 13, fontWeight: 600, color: "#64748b",
    textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16,
  },
  pricingGrid: {
    display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16,
    maxWidth: 960, margin: "0 auto 40px",
  },
  priceCard: {
    flex: "1 1 200px", maxWidth: 220, padding: "24px 20px", borderRadius: 14,
    background: "#ffffff", border: "1px solid #e5e7eb", textAlign: "center",
  },
  priceTier: { fontSize: 13, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  priceAmount: { fontSize: 28, fontWeight: 800, color: "#1e293b", marginBottom: 8 },
  pricePer: { fontSize: 14, fontWeight: 400, color: "#64748b" },
  priceDesc: { fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 16 },
  priceBtn: {
    display: "block", padding: 10, borderRadius: 8,
    border: "1px solid #7c3aed", color: "#7c3aed",
    fontWeight: 600, fontSize: 13, textDecoration: "none",
  },

  // Business in a Box
  biabCard: {
    maxWidth: 480, margin: "0 auto", borderRadius: 16, padding: 32,
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    border: "2px solid #7c3aed", textAlign: "center",
  },
  biabBadge: {
    display: "inline-block", fontSize: 11, fontWeight: 600, color: "#a78bfa",
    background: "rgba(167,139,250,0.15)", padding: "4px 12px", borderRadius: 20,
    marginBottom: 16, textTransform: "uppercase",
  },
  biabHeadline: { fontSize: 21, fontWeight: 700, color: "#ffffff", marginBottom: 8 },
  biabPrice: { fontSize: 40, fontWeight: 700, color: "#ffffff" },
  biabPer: { fontSize: 16, fontWeight: 400, color: "#a78bfa" },
  biabSub: { fontSize: 14, color: "#c4b5fd", margin: "12px 0" },
  biabData: { fontSize: 13, color: "#94a3b8", marginBottom: 20 },
  biabCta: {
    display: "inline-block", padding: "12px 32px", borderRadius: 8,
    background: "#7c3aed", color: "#ffffff", fontWeight: 600,
    fontSize: 14, textDecoration: "none",
  },

  // Final CTA
  finalCta: { padding: "72px 24px", textAlign: "center", background: "#faf5ff" },

  // Buttons
  btnPrimary: {
    display: "inline-block", padding: "12px 28px", fontSize: 15, fontWeight: 600,
    color: "white", background: "#7c3aed", borderRadius: 10, textDecoration: "none",
    transition: "transform 0.15s, box-shadow 0.15s",
  },

  // Footer
  footer: { padding: "32px 24px", borderTop: "1px solid #f0f0f0" },
  footerInner: {
    maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 12, textAlign: "center",
  },
  footerBrand: { fontSize: 15 },
  footerLinks: { display: "flex", gap: 20 },
  footerLink: { fontSize: 13, color: "#9ca3af", textDecoration: "none" },
};
