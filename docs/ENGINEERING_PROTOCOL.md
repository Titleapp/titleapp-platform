# TitleApp Engineering Protocol

## TDZ Prevention Rules

1. **Never compute from `WORKER_ROUTES` at module level.** Always use `useMemo` inside the component function.
2. **Declaration order matters inside function bodies.** IIFEs execute immediately — any `const` they reference must be declared above them.
3. **Shared data arrays must live in standalone files with zero imports.** See `src/data/workerRoutes.js`.

## Pre-Deploy Checklist

1. `npm run build` — must succeed with zero errors (chunk size warnings are OK)
2. Verify no module-level computations reference lazily-loaded exports
3. `firebase deploy --only hosting`
4. Smoke test: click a worker from the home page — confirm no blank page

## TDZ Fixes Applied (48.7a–48.7d)

| Commit | File | Fix |
|--------|------|-----|
| `89b4c533` | ChatPanel.jsx | `WORKER_SUITES` moved from module-level const to `useMemo` inside component |
| `53c52dff` | RAASStore.jsx | `ALL_SUITES` moved from module-level const to `useMemo` inside component |
| `31bc8c6e` | Sidebar.jsx | `selectedWorkerName` moved below `workerList` declaration |
| `f496059a` | Sidebar.jsx | `workerList` + `selectedWorkerName` moved above `brandLabel` IIFE |

## Root Cause

Vite/Rolldown bundles all modules into a single file. ES module evaluation order is not guaranteed to match import order. When module A's top-level code references module B's export before B's declaration executes, the minified bundle throws "Cannot access 'X' before initialization" (TDZ crash). The fix is to defer all cross-module computations to render time (`useMemo`) or extract shared data to zero-dependency modules.

## Error Boundary

`AppErrorBoundary` in `App.jsx` wraps all `AdminShell` renders. Catches render crashes and displays a recovery UI instead of a blank page. Added as a safety net during the 48.7 TDZ investigation.

## Deployment Commands

```bash
# Platform (frontend)
cd ~/titleapp-platform/apps/business && npm run build
cd ~/titleapp-platform && firebase deploy --only hosting

# Backend (functions)
cd ~/titleapp-platform && firebase deploy --only functions

# Landing page (Cloudflare Worker)
cd ~/titleapp-landing && npx wrangler deploy
```

## Commit Convention

- Prefix: `{codex}.{patch}{letter}` (e.g., `48.7d`)
- Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Commit message describes the fix, not the symptom
