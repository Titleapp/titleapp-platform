# CODEX 57 — SOCIII Mobile App (Capacitor → App Store + Google Play)
# Status: IN PROGRESS — Submit iOS Jul 28, Google Play Jul 29
# Task: #57

---

## Objective

Ship SOCIII as a native mobile app on iOS (App Store) and Android (Google Play) by August 15, 2026. Wrapper approach using Capacitor over the existing React app — no rewrite. Mobile app is a strong part of the RegCF raise narrative ("infrastructure is built, live on iOS and Android") but not a hard prerequisite — the RegCF raise proceeds on its own timeline if Apple review runs long. See Contingency in the Review Timeline section for the explicit Aug 10 decision point.

---

## Why Capacitor (not React Native, not just PWA)

- **No rewrite.** The existing React 19 app at `apps/business/` ships as-is. Capacitor wraps the web build into a native container.
- **App Store listing.** A PWA can be added to home screen, but it does NOT appear in App Store search. Native listing is required for organic discovery.
- **Native APIs.** Capacitor gives access to camera (QR codes, document upload), Face ID / Touch ID, push notifications, and local storage — all needed for the full SOCIII mobile experience.
- **Single codebase.** One React app, two platforms. No divergence.

---

## Technical Decisions (Locked)

| Decision | Choice | Rationale |
|---|---|---|
| App ID | `ai.sociii.app` | Matches brand domain |
| App Name | `SOCIII` | Brand name, not "SOCIII Inc." |
| Web Dir | `dist` | Vite output |
| Android scheme | `https` | Required for Firebase Auth |
| iOS content inset | `automatic` | Handles notch + home indicator |
| Splash screen | 1500ms, white bg | Fast, clean, matches brand |
| Status bar | Default (light) | White background |

---

## Files Created / Modified

| File | Status | Purpose |
|---|---|---|
| `apps/business/capacitor.config.json` | CREATED | Capacitor configuration (JSON, not TS — TypeScript 7 incompatible with Capacitor CLI ts-node) |
| `apps/business/package.json` | UPDATED | Added `cap:sync`, `cap:ios`, `cap:android` scripts |
| `apps/business/index.html` | EXISTING | Already has correct mobile meta tags, PWA manifest, apple-touch-icon |

---

## Build + Submit Workflow

### 1. Build + Sync (run before any platform-specific step)
```bash
cd apps/business
npm run cap:sync
```
This runs `vite build` then `npx cap sync` — copies dist/ into iOS and Android native projects and syncs plugins.

### 2. iOS (Xcode required)
```bash
npm run cap:ios
```
This opens Xcode. Then:
- Select a signing team (Sean's Apple Developer account)
- Set deployment target: iOS 16.0+
- Archive: Product → Archive
- Upload to App Store Connect: Distribute App → App Store Connect → Upload

### 3. Android (Android Studio optional — can use CLI)
```bash
npm run cap:android
# Or for CLI build:
cd android && ./gradlew assembleRelease
```

---

## App Store Setup Checklist

### Apple App Store Connect
- [ ] Apple Developer account enrolled ($99/year) — **confirm ACTIVE by Jul 26** (enrollment processing = 2–3 days; unconfirmed active status makes Jul 28 deadline unreachable)
- [ ] Bundle ID `ai.sociii.app` registered in App Store Connect
- [ ] App created in App Store Connect
- [ ] Screenshots: 6.7" iPhone (required), 12.9" iPad (required)
- [ ] App preview video (optional but strong for conversion)
- [ ] Privacy policy URL: `https://sociii.ai/privacy`
- [ ] Support URL: `https://sociii.ai`
- [ ] Category: Business (primary), Productivity (secondary)
- [ ] Age rating: 4+ — **confirm against current App Store guidelines before submission**; app links to an active securities offering, which may trigger closer financial-app review or require a different rating
- [ ] App description (see below)

### Google Play Console
- [ ] Developer account enrolled ($25 one-time) — **confirm active by Jul 26** (Google is typically faster than Apple, but confirm before iOS submit so both platforms are clear)
- [ ] App created in Play Console
- [ ] Package name: `ai.sociii.app`
- [ ] Content rating: Everyone
- [ ] Target audience: Adults (business users)
- [ ] Screenshots: Phone (required), 7" tablet (recommended)
- [ ] Feature graphic: 1024×500px

---

## App Store Description

> ⚠️ LEGAL REVIEW REQUIRED before submission. The prior version of this copy made absolute compliance claims ("no hallucinations that slip past compliance," "hard stops prevent non-compliant outputs") that are falsifiable, and that conflict with the platform's own documented incident history. Absolute present-tense compliance guarantees in App Store copy are also potentially actionable consumer protection claims. The version below softens to design-intent language. Do not revert to the absolute version without counsel sign-off — especially in the same week as a securities raise announcement.

---

**SOCIII — AI Workers for Regulated Industries**

SOCIII puts an AI Chief of Staff in your pocket. Governed Digital Workers handle the compliance-heavy work in your field — with an audit trail on every output and explicit approval before anything is shared.

**Built for:**
- Pilots — logbook, currency tracking, NOTAM briefing, fleet airworthiness
- Real estate professionals — title search, chain of ownership, lien detection
- Nursing educators — clinical evaluation, competency tracking, student records
- Business founders — cap table, 409A valuation, investor pipeline, Reg CF raise

**Why SOCIII is different:**
Every Digital Worker passes through a four-tier rules engine before any output reaches you. Hard stops are designed to block non-compliant outputs. Soft flags get logged. The rules engine is deterministic enforcement, not optional guardrails — and every action produces an immutable audit trail in your personal Vault.

Governed to reduce compliance risk. Built for industries where AI outputs need to be defensible.

Free to start · 14-day trial · Cancel anytime

---

## Mobile-Responsive Issues to Fix (Before Submit)

The following are known viewport issues on 390px screens that must be resolved before submission:

### P0 — Blocks usability
**These must be closed before submission. Owner: Claude Code. Deadline: Jul 27 (day before submit). No assignee = not done.**
- [ ] Tab bar: canvas tabs overflow horizontally on mobile → add `overflow-x: auto; -webkit-overflow-scrolling: touch`
- [ ] Chat panel: input field keyboard pushes layout on iOS → Capacitor Keyboard plugin `resize: body` (already in config)
- [ ] Modal dialogs: full-width on mobile, not fixed 400px → check all `width: 400px` modals

### P1 — Degrades experience
- [ ] Sidebar nav: collapses to hamburger on mobile → verify collapse behavior
- [ ] KPI cards: 4-column grid → 2-column on mobile (`grid-template-columns: 1fr 1fr`)
- [ ] Data tables: horizontal scroll on mobile (cap table, pipeline) → add scroll wrapper
- [ ] Button padding: 8px 16px minimum touch target → verify 44px height on key buttons

### P2 — Polish
- [ ] Safe area insets: content not obscured by home indicator → `padding-bottom: env(safe-area-inset-bottom)`
- [ ] Font sizes: minimum 13px for body text on mobile
- [ ] Chat bubbles: max-width 85% on mobile (not 70%)

---

## Phase 2 — Native Features (Post-Launch)

After initial launch, add Capacitor plugins for:

| Plugin | Purpose |
|---|---|
| `@capacitor/push-notifications` | Investor updates, worker completions, 83(b) deadline alerts |
| `@capacitor/local-notifications` | Offline reminders (NOTAM currency, vesting events) |
| `@capacitor/camera` | Document upload (logbook, title docs) via camera |
| `@capacitor/biometrics` | Face ID / Touch ID for Vault access |
| `@capacitor/haptics` | Confirmation feedback on approval actions |
| `@capacitor/share` | Share worker outputs, investor materials |

---

## Review Timeline Expectations

| Platform | Typical First Review | Expedited Option |
|---|---|---|
| Apple App Store | 1–7 days (average 1-3 for business apps) | Request via App Store Connect (legitimate reasons only) |
| Google Play | 1–3 days | No formal expedite; usually faster |

**Submit Jul 28–29 → target Aug 7–14 approval → Aug 15 announce.**

If Apple rejects: most first rejections are metadata issues (privacy labels, description, screenshots). Fix same day and resubmit. Second review typically 24–48 hours.

**Contingency — if not approved by Aug 10:**
The Aug 12 press release ships without the "live on iOS and Android" claim. Replace with "available on web + mobile browser, native app submission under review." Mobile App Store announcement follows as a separate release once approved. Do not hold the RegCF announcement for the app listing — they are independent events that happen to share a target date, not a single launch with a shared dependency.

---

## RegCF Connection

> ⚠️ COUNSEL REVIEW REQUIRED. Directing users from an App Store listing to a live Reg CF offering is not a pure marketing/timing decision. It has regulatory texture: (1) Apple's financial-app review guidelines may scrutinize apps that link to active securities offerings; (2) the SEC's general-solicitation rules for Reg CF govern how and where a raise can be advertised. Do not include the Wefunder URL in app metadata, screenshots, or description copy without confirming both of these with counsel first.

The mobile app is part of the raise narrative: "SOCIII is live on iOS and Android — regulated AI in your pocket." Both app listings are intended to link to the Wefunder raise page and announce simultaneously with RegCF launch (Press Release #2, target Aug 12) — pending the above review.
