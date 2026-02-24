# TitleApp Milestone Celebrations
## raas/onboarding/milestones.md

---

## Overview

Milestone celebrations are confetti animations + chat messages that fire at key moments in the user's journey. They create emotional anchoring, reward engagement, and build stickiness. Each milestone fires ONCE per workspace (tracked in Firestore). Respects `prefers-reduced-motion` for accessibility.

## Celebration Levels

- **Big** — Full confetti burst (2 waves, 120 total particles). For major product moments.
- **Medium** — Medium burst (60 particles). For feature adoption moments.  
- **Subtle** — Small burst (30 particles). For engagement nudges.

All use TitleApp brand colors: #7c3aed (purple), #a78bfa (light purple), #c4b5fd (lavender), #fbbf24 (gold), #34d399 (green).

## Milestone Registry

### Onboarding
| Key | Level | Message | Trigger |
|-----|-------|---------|---------|
| `onboarding_complete` | BIG | 🎉 Your workspace is ready! | Magic moment screen loads |

### Data & Engagement
| Key | Level | Message | Trigger |
|-----|-------|---------|---------|
| `first_data_import` | MEDIUM | 🎉 First data imported! Alex is already analyzing it. | First CSV/file uploaded or integration connected |
| `first_csv_upload` | SUBTLE | 📊 Data uploaded! Let me take a look... | First CSV specifically |
| `first_rule_created` | MEDIUM | 🎯 First rule set! I'm now watching for this 24/7. | Rule saved in Settings |
| `tenth_chat_message` | SUBTLE | 💬 We're getting into a groove! | 10th user message in chat |
| `first_report_generated` | MEDIUM | 📄 First report generated! | Report created in Reports section |

### RAAS Creator Revenue
| Key | Level | Message | Trigger |
|-----|-------|---------|---------|
| `first_subscriber` | BIG | 🎉 You got your first subscriber! Someone is paying for your expertise. | Worker gets first paying subscriber |
| `first_revenue` | BIG | 💰 First revenue! Money in the bank. This is just the beginning. | First payout processed |
| `ten_subscribers` | BIG | 🔥 10 subscribers! Your AI service is gaining traction. | Worker reaches 10 subscribers |

### Vertical-Specific
| Key | Level | Message | Trigger |
|-----|-------|---------|---------|
| `first_deal_closed` | BIG | 🎉 First deal closed! Alex tracked it from lead to close. | Deal/transaction marked closed |
| `first_listing_sold` | BIG | 🎉 Listing sold! Alex managed the whole pipeline. | Listing marked sold (RE) |
| `first_investment_received` | BIG | 🎉 First investment received! Your raise is live. | First investor closes (Investor Relations) |

### Blockchain
| Key | Level | Message | Trigger |
|-----|-------|---------|---------|
| `first_title_minted` | MEDIUM | 🔗 Title minted on Polygon! Your AI service now has provenance on the blockchain. | First Worker title minted |

## Firestore Schema

```
workspace.celebratedMilestones: string[]
// Example: ['onboarding_complete', 'first_data_import', 'first_rule_created']
```

## Implementation

Source: `apps/business/src/utils/celebrations.js`

```javascript
import { checkMilestone } from '../utils/celebrations';

// At any trigger point:
const msg = await checkMilestone('milestone_key', workspaceRef);
if (msg) pushChatMessage(msg);
```

## Adding New Milestones

1. Add entry to `MILESTONES` in `celebrations.js`
2. Add entry to this document
3. Hook `checkMilestone()` at the trigger point
4. Test: clear `celebratedMilestones` array in Firestore to re-trigger

## Design Principles

- **Fire once** — Never repeat. Tracked in Firestore, not sessionStorage.
- **Chat-first** — The confetti is the garnish. The chat message is the content.
- **Aim at the chat** — Confetti origin targets the chat panel to draw the eye.
- **Premium feel** — Short bursts (< 1 second), not a 10-second shower.
- **Accessible** — `disableForReducedMotion: true` on all confetti calls.
- **Brand colors** — Always use TitleApp purples, gold, and green.
- **Meaningful** — Every celebration marks a real accomplishment, not just a click.
