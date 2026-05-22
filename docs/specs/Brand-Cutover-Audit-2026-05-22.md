# Brand Cutover Audit — TitleApp → SOCIII

**Date:** 2026-05-22
**Target cutover:** Sat 2026-05-23 (after SVG export) or Sun 2026-05-24
**Hard deadline:** Tue 2026-05-26 23:59 (last work day before Wed soft tease)

This document inventories all customer-facing TitleApp / titleapp.ai references and provides a substitution map for the brand cutover. Aim is to make Saturday's work a 30-min execution, not a half-day search.

---

## Current State (2026-05-22)

### brandConfig.js — Single Source of Truth ✓ Updated

`apps/business/src/config/brandConfig.js` now has the correct SOCIII brand object (canonical palette, "SOCIII" all-caps, full strapline). `ACTIVE_BRAND = "titleapp"` until the cutover flip.

**The flip itself is one line:** change `export const ACTIVE_BRAND = "titleapp";` to `export const ACTIVE_BRAND = "sociii";`

**However**, ~70 files contain hard-coded `TitleApp` / `titleapp.ai` strings that DO NOT pull from brandConfig. These will retain the legacy brand after the flip unless updated.

---

## File Density (Top 25 by reference count)

| File | TitleApp refs | Customer-facing? |
|------|----------------|---------------------|
| `App.jsx` | 34 | Yes — main app shell |
| `components/DistributionKit.jsx` | 28 | Yes — share/embed kits |
| `components/PublishPreflight.jsx` | 23 | Yes — worker publish flow |
| `pages/campaigns/CampaignPage.jsx` | 20 | Yes — paid campaign landing |
| `components/LandingPage.jsx` | 12 | Yes — primary landing page |
| `pages/campaigns/Web3Campaign.jsx` | 9 | Yes — Web3 vertical landing |
| `components/OnboardingWizard.jsx` | 9 | Yes — new user onboarding |
| `components/ChatPanel.jsx` | 8 | Yes — main chat interface |
| `sections/InvestorDataRoom.jsx` | 7 | Yes — investor surface (high stakes) |
| `pages/MarketplaceListing.jsx` | 7 | Yes — marketplace |
| `pages/landing/AutoLanding.jsx` | 6 | Yes — auto-dealer landing |
| `pages/landing/LandingPage.jsx` | 5 | Yes — generic landing |
| `components/Onboarding.tsx` | 5 | Yes — onboarding |
| `pages/landing/TitleEscrowLanding.jsx` | 4 | Yes — title/escrow vertical |
| `pages/LegalPage.jsx` | 3 | Yes — legal — needs entity update |
| ... | ... | ~50 more files with 1-3 refs each |

Total customer-facing references: estimated 250-350 string instances across ~65 files.

---

## Substitution Map

When pattern X appears in source, substitute with Y:

### Brand name strings (in JSX, copy, alt text, etc.)

| Pattern | Substitute |
|---------|-------------|
| `"TitleApp"` (display) | `brand.name` from brandConfig — renders as `"SOCIII"` after flip |
| `"TitleApp LLC"` (legal entity, copyright) | `brand.legalEntity` — `"SOCIII Inc."` |
| `"Title App"` (with space) | `brand.name` — `"SOCIII"` |
| `"Digital Workers for Modern Business"` (legacy tagline) | `brand.tagline` — `"Collaborative Intelligence · Participation"` |

### Domain references

| Pattern | Substitute |
|---------|-------------|
| `"https://titleapp.ai"` | `\`https://${brand.domain}\`` — `"https://sociii.ai"` |
| `"https://app.titleapp.ai"` | `\`https://app.${brand.domain}\`` — `"https://app.sociii.ai"` |
| `"titleapp.ai"` (bare domain in copy) | `brand.domain` |

### Email addresses

| Pattern | Substitute |
|---------|-------------|
| `"sean@titleapp.ai"` (cold sender) | `brand.senderEmail` — `"sean@sociii.ai"` once SendGrid auth completes |
| `"support@titleapp.ai"` | `brand.supportEmail` — `"support@sociii.ai"` |
| `"hello@titleapp.ai"` | `brand.helloEmail` (TO ADD to brandConfig) — `"hello@sociii.ai"` |
| `"privacy@titleapp.ai"` | `brand.privacyEmail` (TO ADD) — `"privacy@sociii.ai"` |

### Internal references (DO NOT substitute)

The following should NOT change — they are internal infrastructure identifiers and changing them would break data integrity:

- Firestore collection names (`raasCatalog`, `raasPackages`, etc.) — internal architecture name, never user-facing
- API endpoint paths (`/v1/raas:*`) — public API contract, breaking change requires versioning
- `titleapp.core@gmail.com` — Sean's private admin Google account
- `titleapp-platform` repo name — internal until GitHub migration
- `titleapp-frontdoor.titleapp-core.workers.dev` — Cloudflare Worker URL (separately migrate to `sociii-frontdoor` subdomain when ready)
- `title-app-alpha` — Firebase project ID (cannot be renamed; create new project for SOCIII if needed)

---

## Recommended Execution Plan (Sat 2026-05-23)

### Phase 1 — Verify brandConfig (5 min)
1. Open `apps/business/src/config/brandConfig.js`
2. Confirm sociii brand object matches canonical brand system
3. Add missing email fields (`helloEmail`, `privacyEmail`) if needed
4. **Do not flip ACTIVE_BRAND yet**

### Phase 2 — Hard-coded reference cleanup (60-90 min)
For each file in the Top 25 list, replace hard-coded `"TitleApp"` and `"titleapp.ai"` strings with `brand.name` / `brand.domain` references.

Pattern in code:
```jsx
// Before:
<h1>Welcome to TitleApp</h1>
<a href="https://titleapp.ai">Learn more</a>

// After:
import { brand } from '../config/brandConfig';

<h1>Welcome to {brand.name}</h1>
<a href={`https://${brand.domain}`}>Learn more</a>
```

Strategy: import brandConfig at the top of each file, then do find-replace with the variable. Test after each top-10 file is updated to catch any breaks.

### Phase 3 — Legal entity references (15 min)
`pages/LegalPage.jsx` and the Terms & Conditions component reference `TitleApp LLC` as the legal entity. These must change to `SOCIII Inc.` and the legal documents themselves should be reviewed (Sean's legal counsel + revised T&C URL).

### Phase 4 — Email migration (gated on SendGrid)
Once SendGrid domain authentication completes (multi-day clock started Fri 5/22), update:
- Outbound emails to use `sean@sociii.ai`
- Footer + signature links
- Email templates referenced from `functions/functions/emailService/`

Do NOT switch outbound senders before SendGrid auth completes or deliverability craters.

### Phase 5 — Asset swap (gated on Sean's SVG export)
Drop new SOCIII SVGs into `apps/business/src/assets/sociii-brand/`. Update `BrandLoader.jsx` to use the new logos in the sociii palette.

Required SVGs:
- Mark only (purple+green interlocking hex)
- Wordmark only ("SOCIII")
- Horizontal lockup (mark + wordmark)
- Favicon-sized
- Optional: dark-mode variant

### Phase 6 — DNS + Auth flip (gated on Fri AM DNS work)
This is separate from the brand cutover but blocks the customer experience:
- `sociii.ai` DNS → Firebase Hosting (24h propagation)
- Firebase Auth → authorized domain whitelist
- Google OAuth → authorized origins + redirect URIs

Once DNS resolves, can flip `ACTIVE_BRAND = "sociii"` and deploy. Until then, the brandConfig flip ships but users still see titleapp.ai in the URL bar.

### Phase 7 — Verification pass
After cutover deploy:
1. Visit landing page, every vertical landing, sandbox, onboarding wizard — confirm brand appears as SOCIII
2. Check footer copyright on every page
3. Open Privacy and Terms pages — verify SOCIII Inc. legal entity
4. Open Investor Data Room — confirm SOCIII branding (this is the highest-stakes surface for the Storyhouse demo)
5. Trigger an outbound email — verify it sends from `sean@sociii.ai` (post-SendGrid)
6. Open Chat — verify the AI doesn't refer to "TitleApp" in responses (the chat tone strip + canonical prompts should already handle this, but verify)

### Phase 8 — titleapp.ai → sociii.ai redirect (Sun or Mon)
After SOCIII cutover ships and stabilizes:
1. Update `~/titleapp-landing/worker.js` to 301-redirect all paths to `sociii.ai`
2. Deploy via wrangler
3. SEO juice transfers; old links keep working

---

## Files With Highest Risk if Missed

These surfaces have the highest probability of being seen by the Storyhouse demo or an investor follow-up. Prioritize these if time-constrained:

1. **`components/LandingPage.jsx`** + **`pages/landing/*.jsx`** — first impression
2. **`pages/LegalPage.jsx`** + **`components/TermsAndConditions.tsx`** — legal entity must match SOCIII Inc.
3. **`sections/InvestorDataRoom.jsx`** — directly investor-facing
4. **`components/OnboardingWizard.jsx`** + **`components/Onboarding.tsx`** — new user impression
5. **`components/ChatPanel.jsx`** — primary product surface
6. **`pages/campaigns/CampaignPage.jsx`** — paid campaign landing pages
7. **`components/PublishPreflight.jsx`** + **`components/DistributionKit.jsx`** — creator-facing
8. **`config/brandConfig.js`** — single point of leverage (already updated)

---

## What's Already Updated (2026-05-22)

- `apps/business/src/config/brandConfig.js` — sociii brand object updated with canonical palette, "SOCIII" all-caps, full strapline
- `apps/business/src/assets/sociii-brand/raw/` — JPG brand references stored (waiting on SVG export)

---

## What Remains for Sean

- SVG export from Figma → `apps/business/src/assets/sociii-brand/`
- Execute Phases 2-8 above on Saturday
- Coordinate DNS, Firebase Auth, Google OAuth flips (gated on DNS propagation)
- Review and approve legal entity update (Terms & Conditions, Privacy, etc.)
- Coordinate SendGrid sender migration

---

## Cutover Day Smoke Test (5 minutes after deploy)

A quick visual sweep to catch the most likely failures:

1. `sociii.ai` loads with SOCIII logo and palette ✓
2. Open `/legal` — see "SOCIII Inc." not "TitleApp LLC" ✓
3. Open `/meet-alex` — chat works, no "TitleApp" in AI responses ✓
4. Open `/marketplace` — workers display correctly ✓
5. Sign in flow — no auth errors ✓
6. Try opening Accounting worker — Setup checklist appears ✓
7. Open the Storyhouse demo path end-to-end (separately documented)

If any step fails, the cutover did not succeed and immediate rollback to `ACTIVE_BRAND = "titleapp"` is the safest move. Roll forward only after the failing surface is identified and fixed.

---

*Audit produced 2026-05-22 by Claude during Sean's flight shift. Reviewed and executed Saturday by Sean.*
