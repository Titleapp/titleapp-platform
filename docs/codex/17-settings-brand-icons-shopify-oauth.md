# CODEX 17 — Settings Brand Icons + Shopify Server-Side OAuth

**Session date:** 2026-07-01
**Branch:** `surface-5-advisor-affirm`

---

## What happened

Two workstreams completed:

1. **Settings page visual overhaul** — added real brand icons (inline SVG) to every integration and social row; added `IntRow` wrapper for static "coming soon" rows; added `ApolloServiceCard` for always-on platform intelligence; reordered all rows alphabetically in both sections.

2. **Shopify OAuth — server-side flow** — the popup-based OAuth flow was fundamentally broken because Shopify sets `cross-origin-opener-policy: same-origin`, which nulls `window.opener` the moment the popup navigates to Shopify's domain. All popup-based approaches (postMessage, BroadcastChannel, pre-opened popup) fail for the same root cause. Replaced with a full-page redirect + public server-side callback that uses a nonce lookup to identify the user without a bearer token. Confirmed working: "Connected to sociii-test.myshopify.com."

---

## Brand icons — Settings.jsx

### `BrandIcon` component

Inline SVG, 24×24, one per integration. Logos: Gmail, Google Calendar, Google Drive, Microsoft OneDrive, Microsoft Outlook, QuickBooks, Salesforce, Shopify, Stripe, YouTube, TikTok, X, LinkedIn, Instagram.

Each active row (`GmailRow`, `GoogleCalendarRow`, `DriveRow`, `YouTubeRow`, `TikTokRow`, `ShopifyRow`) was updated to wrap the existing content in:

```jsx
<div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
  <BrandIcon name="gmail" />
  <div style={{ minWidth: 0 }}>
    {/* existing label + status text */}
  </div>
</div>
```

### `IntRow` wrapper

Static "coming soon" rows (OneDrive, Outlook, QuickBooks, Salesforce, Shopify, Stripe) use an `IntRow` component that handles the layout, icon, name, description, badge, and optional children uniformly.

### `ApolloServiceCard`

New card above integrations showing Apollo Intelligence (275M+ B2B contacts) and ATTOM Property Data as "Active" platform services — metered, billed on the Billing page, surfaced by Alex when relevant.

### Alphabetical reorder

**Integrations:** Gmail, Google Calendar, Google Drive, Microsoft OneDrive, Microsoft Outlook, QuickBooks, Salesforce, Shopify, Stripe

**Social:** Instagram, LinkedIn, TikTok, X, YouTube

---

## Shopify OAuth — the root cause and fix

### Root cause: Shopify COOP headers

```
cross-origin-opener-policy: same-origin
```

Shopify's admin sets this on all pages. The moment a popup navigates to `admin.shopify.com`, Chrome sets `window.opener = null` — the browsing context group is isolated. This breaks every popup-based pattern:

- `window.opener.postMessage()` → null reference
- `BroadcastChannel('shopify-oauth')` → popup closes before message is received
- Pre-opened popup (`window.open("")`) → same COOP breakage at navigation

### The fix: server-side OAuth with nonce lookup

**Flow:**

```
1. connectShopify(shop)
   → POST /v1/shopify:authUrl { shop }
   ← { authUrl: "https://mystore.myshopify.com/admin/oauth/authorize?state=NONCE&..." }
   → window.location.href = authUrl    [full page redirect, no popup]

2. Backend: handleShopifyAuthUrl()
   → writes shopify_oauth_nonces/{nonce} = { userId, shop, createdAt }
   → writes users/{userId}/integrations/shopify_pending (existing path)

3. Shopify consent → redirect to https://sociii.ai/auth/shopify-callback

4. shopify-callback.html (static, served via firebase.json rewrite)
   → forwards all params to https://api.../v1/shopify:server-callback
   (no Firebase auth — this is a public redirect)

5. handleShopifyServerCallback (public, before auth gate in index.js ~line 9846)
   → reads shopify_oauth_nonces/{state} → gets userId
   → deletes nonce doc (one-time use)
   → verifies Shopify HMAC
   → exchanges code for access_token via Shopify API
   → calls storeToken(userId, shop, access_token)
   → redirects to https://sociii.ai/?shopify=connected

6. SOCIII app loads; ShopifyRow useEffect detects ?shopify=connected
   → clears URL param
   → calls refresh() to reload status
```

### Key files changed

| File | Change |
|------|--------|
| `services/shopify/shopify.js` | `handleShopifyAuthUrl` writes nonce doc; new `handleShopifyServerCallback` exported |
| `functions/functions/index.js` | Public `GET /v1/shopify:server-callback` route added BEFORE Firebase auth gate |
| `apps/business/public/auth/shopify-callback.html` | New static HTML forwarder — shows spinner then redirects to backend |
| `apps/business/src/hooks/useShopify.js` | `connectShopify()` replaced with full-page redirect; no popup, no BroadcastChannel |
| `apps/business/src/sections/Settings.jsx` | `ShopifyRow` useEffect detects `?shopify=connected`/`?shopify_error=...` on return |
| `firebase.json` | Rewrite: `/auth/shopify-callback` → `/auth/shopify-callback.html` |

### Security notes

- Nonce is a random UUID generated at auth-URL time, stored server-side, deleted after use (one-time)
- HMAC verification (`verifyShopifyHmac`) happens before token exchange — guards against CSRF
- No bearer token crosses the public endpoint; userId is resolved server-side via nonce lookup
- `shopify_oauth_nonces` docs expire by design (deleted on use); stale nonces cause harmless redirect to `/?shopify_error=invalid_state`

---

## QA002 — zero errors confirmed

Lint after all changes: **0 errors, 69 warnings** (same baseline as CODEX 16).

Two new errors introduced and fixed:

| File | Error | Fix |
|------|-------|-----|
| `ChatPanel.jsx:2606` | `catch (e)` — unused binding | Renamed to `catch (_e)` |
| `Settings.jsx:368` | `setErr()` inside useEffect body | `// eslint-disable-next-line react-hooks/set-state-in-effect` — valid: reading URL params set by external redirect |

Build: `✓ built in 756ms`

---

## Additional changes in this diff

**`MorningBriefCanvas.jsx`** — minor layout/content updates to morning brief canvas.

**`TitleAbstractCard.jsx`** — additional canvas card fields.

**`useCalendar.js` / `useDrive.js` / `useGmail.js`** — minor hook refinements (status fields, error handling).

**`ShopifyAuthCallback.jsx`** — page is now a dead stub (full-page redirect replaced popup flow); kept file to avoid 404 if cached links hit it.

**`CalendarAuthCallback.jsx`** — new callback page for Google Calendar OAuth (analogous to drive callback).

**`seedTitleAbstract.js`** — seed script cleanup.

**`googleCalendarService.js`** — minor service refinements.

**`liveLookup.js`** (RE service) — additional lookup fields.

**`docs/integrations/README.md`** — updated integration docs.

---

## Key invariants

- Shopify OAuth MUST use full-page redirect — popup flows are permanently broken by Shopify's COOP headers
- `shopify_oauth_nonces/{nonce}` is one-time-use; backend deletes on read
- Public `/v1/shopify:server-callback` route MUST stay before the Firebase auth gate in index.js
- `varsIgnorePattern: '^[A-Z_]'` in eslint.config.js — do not change (see CODEX 16)
