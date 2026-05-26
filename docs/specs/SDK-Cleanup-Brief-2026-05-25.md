# SDK Cleanup Brief — `@titleapp/sdk` → `@sociii/sdk`

**Survey date:** 2026-05-25
**Status:** Ready for agent build when Sean greenlights
**Time estimate:** 30-60 min agent run, single bounded task

---

## Current state

- Package: `packages/sdk/`
- Name: `@titleapp/sdk`
- Version: `0.1.0` (BETA)
- Modules: `workers`, `vault`, `marketplace`
- Source: 2 files (`src/index.js` + `src/index.d.ts`)
- Build: esbuild → ESM + CJS + types in `dist/`
- README: ~50 lines

## What changes for v0.2.0 (the SOCIII cut)

### Package rename
- `@titleapp/sdk` → `@sociii/sdk`
- Update `package.json` (name, description, keywords, author, repository.url)
- Author email: `hello@titleapp.ai` → `hello@sociii.ai`
- Repo URL: stays `Titleapp/titleapp-platform` for now (GitHub org migration is a separate task — #260)

### Class rename
- `TitleApp` → `Sociii`
- `TitleAppError` → `SociiiError`
- `TitleAppOptions` → `SociiiOptions`
- Keep backward-compat aliases for one minor version: `export const TitleApp = Sociii;` with a deprecation comment.

### New module: `ir`
Phase 1 endpoints land in the SDK:
- `client.ir.investor.initiate({ email, name, investmentAmount })`
- `client.ir.investor.step({ investorId, action, ... })`
- `client.ir.investor.status({ investorId })`

### README rewrite
- Strip TitleApp references
- New tagline: "JavaScript SDK for the SOCIII Digital Worker platform"
- Add IR module section
- Add Hamilton v Che / Alex Sociii reference (lightweight — "Creative module coming in v0.3" with link to the worker spec)
- Update API base URL example to sociii.ai domain

### Brand assets in SDK docs
README should reference SOCIII icon (the small icon variant from `apps/business/src/assets/sociii-brand/icon/sociii-icon-mark-200.png`) in a header. Optional polish.

### npm publish
- `npm version 0.2.0`
- `npm publish --access public`
- Sean's call on when to actually publish (probably after the platform deploys cleanly)

---

## Order of operations for the cleanup agent

1. Update `package.json` (name, description, author, keywords)
2. Refactor `src/index.js`: rename classes, add `ir` module, preserve back-compat alias
3. Refactor `src/index.d.ts`: rename type exports, add IR types
4. Run `npm run build` — verify clean
5. Rewrite `README.md`
6. Add a `CHANGELOG.md` with v0.2.0 entry
7. Do NOT publish. Sean publishes manually after review.

---

## Risk

- Low. Two files, bounded scope, no external integrations changing.
- Back-compat alias prevents breaking any existing consumer (none known in production, but the alias is cheap insurance).

---

## When to do it

Sean's call. Recommended Sunday afternoon after the platform deploys cleanly — gives the developer-credibility signal for Kent's Monday outbound + Thursday Storyhouse.
