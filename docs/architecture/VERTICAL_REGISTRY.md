# Vertical Registry

Human-readable reference for all platform verticals. The canonical machine-readable source is `/functions/functions/config/verticals.js`.

---

## Live Verticals

| ID | Label | Prefix | Catalog File | Nav Items |
|----|-------|--------|-------------|-----------|
| `aviation` | Aviation | `av-` | aviation.json | CoPilot EFB, Dispatch, Fleet Status, Crew, Safety |
| `real-estate` | Real Estate | `w-` | real-estate-development.json | Deal Pipeline, Properties, Title & Escrow |
| `auto-dealer` | Auto Dealer | `ad-` | auto-dealer.json | Inventory, F&I, Service |
| `solar` | Solar | `sol-` | solar-energy.json | Leads, Permits, Monitoring |
| `web3` | Web3 | `w3-` | web3.json | Tokens, Smart Contracts, Wallets |

## Future Verticals

| ID | Label | Prefix | Status |
|----|-------|--------|--------|
| `nursing` | Nursing | `nu-` | In development |
| `games` | Games | `gm-` | In development |
| `government` | Government | `gov-` | Planned |

## Legacy Aliases

These aliases exist in historical data and are normalized to canonical IDs by `normalizeVertical()`:

| Legacy Value | Normalizes To |
|-------------|---------------|
| `auto_dealer` | `auto-dealer` |
| `auto dealer` | `auto-dealer` |
| `analyst` | `real-estate` |
| `real_estate` | `real-estate` |
| `real estate` | `real-estate` |
| `real-estate-development` | `real-estate` |
| `Real Estate Development` | `real-estate` |
| `web3-projects` | `web3` |
| `solar-energy` | `solar` |
| `health-ems` | `nursing` |
| `health_ems` | `nursing` |
| `game-light` | `games` |
| `game-regulated` | `games` |

## Rules

1. Every vertical is defined **once** in `/functions/functions/config/verticals.js`
2. All other files import from that registry — no hardcoding
3. Worker slugs must start with their vertical's `firestorePrefix`
4. `normalizeVertical()` handles all legacy aliases transparently

---

*Reference: [PLATFORM_ARCHITECTURE_v1.0.md](PLATFORM_ARCHITECTURE_v1.0.md) Section 3.1*
