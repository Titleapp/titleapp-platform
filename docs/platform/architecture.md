# TitleApp Platform Architecture

**Last updated: Session 28 (March 2026)**

## Four-Tier Rules Stack

| Tier | Source | Mutability | Example |
|------|--------|------------|---------|
| Tier 0 | Platform | Immutable | AI disclosure, PII masking, append-only audit |
| Tier 1 | Regulatory | Locked (platform-researched) | State board rules, HIPAA, FAR compliance |
| Tier 2 | Best Practices | Editable (creator can modify) | Industry standards, common protocols |
| Tier 3 | User SOPs | Fully customizable | Company policies, employer procedures |

Lower tiers override higher tiers. Tier 0 cannot be overridden by anyone.

## Three-Layer System

```
[Frontend (Door 1)]  →  [Cloudflare Worker "Frontdoor"]  →  [Firebase Functions → Cloud Run]
```

1. **Frontend (Door 1):** React + Vite app. Firebase Auth. Bearer tokens on all requests.
2. **Edge Router (Frontdoor):** Cloudflare Worker. CORS, route normalization, Firebase ID token verification.
3. **Backend API:** Single Firebase Function `exports.api` in `functions/functions/index.js`. All routing via `getRoute(req)`.

## Vault
- Consumer: `/vault/{username}`
- Business: `/biz/{bizname}`
- Append-only Firestore. Records never overwritten. State computed from event history.

## RAAS Engine (Rules + AI-as-a-Service)
- Business logic lives in rule definitions, not prompts
- AI agents are stateless executors — agents propose, rules engine validates, events append
- Model-agnostic: OpenAI, Claude, Gemini interchangeable
- User-facing name: "Digital Workers"

## Key Collections
- `tenants/`, `memberships/`, `users/`
- `raasCatalog/{worker_id}` — worker registry
- `raasPackages/{packageId}` — execution instances
- `digitalWorkers/{marketplace-slug}` — synced marketplace data
- `usage_events/` — immutable execution log (23-field schema)
