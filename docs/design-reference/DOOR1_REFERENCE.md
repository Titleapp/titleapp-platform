# Door 1 Design Reference

**Purpose:** Visual design reference for landing page and future UI work. Door 1 is the fallback dashboard — the landing page should match this visual language but lead with Door 2 (chat-first).

> **Note:** Live reference URLs may expire. Captured from `sales-demo-2` hosted instance.

---

## Live Reference URLs

| Page | URL |
|------|-----|
| Dashboard | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/dashboard |
| My Stuff (DTCs) | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/dtcs |
| My GPTs | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/gpts |
| Records | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/records |
| Escrow | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/escrow |
| Logbooks | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/logbooks |
| Reports | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/reports |
| Wallet | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/wallet |
| Profile | https://studio--sales-demo-2-35204758-8ebec.us-central1.hosted.app/profile |

---

## Design System Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#7C3AED` | Primary purple — buttons, active states, badges, links |
| `--accent2` | `#14B8A6` | Secondary teal — highlights, secondary actions |
| `--sidebar` | `#0B1020` | Dark sidebar top (gradient start) |
| `--sidebar2` | `#0A0F1C` | Dark sidebar bottom (gradient end) |
| `--bg` | `#F6F7FB` | Page background |
| `--card` | `#FFFFFF` | Card background |
| `--text` | `#0F172A` | Primary text |
| `--muted` | `#64748B` | Secondary / supporting text |
| `--line` | `#E8EBF3` | Borders and dividers |
| `--danger` | `#EF4444` | Error / destructive |
| `--green` | `#22C55E` | Success / positive values |
| `--cyan` | `#06B6D4` | Informational / processing |

### Derived Values

```css
--accent-dim:    rgba(124, 58, 237, 0.18)   /* purple tint background */
--accent-border: rgba(124, 58, 237, 0.35)   /* purple tint border */
--accent-light:  #C4B5FD                     /* light purple text on dark */
--shadow:        0 10px 24px rgba(15, 23, 42, 0.08)
--radius:        16px
```

### Typography

- **Font stack:** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Monospace:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **Heading weight:** 900 · letter-spacing: -0.04em (large), -0.02em (medium)
- **Label weight:** 800 · uppercase · letter-spacing: 0.06–0.08em
- **Body:** 14px / 1.5 · weight 400

---

## Card Component Pattern

Cards are the primary content unit throughout Door 1.

### Structure

```
┌──────────────────────────────────────┐
│  [Image header — full width]          │  ← optional, aspect ~16:9
├──────────────────────────────────────┤
│  Card Title          [Purple Badge]  │  ← badge top-right, category label
│  Subtitle / description              │
├──────────────────────────────────────┤
│  KEY          VALUE                  │  ← key-value metadata rows
│  KEY          VALUE                  │
│  KEY          VALUE                  │
├──────────────────────────────────────┤
│  [Purple Action Button]  [Ghost Btn] │  ← primary action is solid purple
└──────────────────────────────────────┘
```

### CSS Rules

```css
.card {
  background: var(--card);                        /* #FFFFFF */
  border: 1px solid var(--line);                  /* #E8EBF3 */
  border-radius: var(--radius);                   /* 16px */
  box-shadow: var(--shadow);                      /* 0 10px 24px rgba(15,23,42,0.08) */
}

/* Category badge (top-right of card header) */
.badge-purple {
  background: rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.35);
  color: #7C3AED;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 800;
}

/* Key-value rows */
.detail-key {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  font-weight: 700;
}

.detail-value {
  font-size: 14px;
  color: var(--text);
  font-weight: 600;
}

/* Primary action button */
.btn-primary {
  background: var(--accent);    /* #7C3AED */
  color: #fff;
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 700;
  font-size: 14px;
}
```

### Status Badge Colors

| Status | Background | Border | Text |
|--------|-----------|--------|------|
| Created / Active | `rgba(124,58,237,0.08)` | `rgba(124,58,237,0.35)` | `#7C3AED` |
| Processing | `rgba(6,182,212,0.08)` | `rgba(6,182,212,0.35)` | `#06B6D4` |
| Completed | `rgba(34,197,94,0.08)` | `rgba(34,197,94,0.35)` | `#22C55E` |
| Failed | `rgba(239,68,68,0.08)` | `rgba(239,68,68,0.35)` | `#EF4444` |

---

## Sidebar Pattern

- **Width:** 280px (desktop) · fixed overlay on mobile
- **Background:** `linear-gradient(180deg, #0B1020, #0A0F1C)`
- **Border:** `1px solid rgba(255,255,255,0.06)` on right
- **Active nav item:** `background: rgba(124,58,237,0.16)` · `border: 1px solid rgba(124,58,237,0.35)`
- **Hover nav item:** `background: rgba(255,255,255,0.05)`
- **Nav label:** 14px · color `#E5E7EB`

---

## Landing Page Directive

The landing page (`public/index.html`) should:

- **Match** this visual token system exactly (same colors, radius, shadows, typography)
- **Lead with Door 2** — hero is the chat conversation, not the dashboard
- **Not replicate** Door 1 dashboard UI (no sidebar, no KPI cards, no data tables)
- Use the dark sidebar gradient (`#0B1020 → #0A0F1C`) for the hero background
- Use `#F6F7FB` / white cards for content sections below the hero
- The structured object (Trade Summary card) rendered inline in the mock chat is the key visual

See: `docs/PRODUCT.md` for product philosophy and `CLAUDE.md` for architectural context.
