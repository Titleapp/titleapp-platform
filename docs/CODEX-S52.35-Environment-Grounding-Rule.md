# CODEX S52.35 — Environment-Grounding Rule + the 7-Role Four-Way Loop

**Date:** 2026-06-06
**Status:** Codifies TC-067 architectural lesson + extends the four-way authoring loop to 7 role-axes
**Resume point:** post-S52.34 (Site Recon Step 9 SHIPPED) — locks the lesson before the next creator worker build
**Source TC entries:** TC-067 in `docs/QA-001-TEST-CORPUS.md`; also closes the meta-pattern across TC-063 / TC-065 / TC-066
**Source memory:** `project_tc067_alex_environment_state_assumption.md`

---

## Why this CODEX exists

SITE-RECON-001 Step 9 closing surfaced a failure class that didn't fit the existing anti-fabrication guard. Web-Alex confidently recommended:

```
! gcloud auth application-default login
```

to unblock the workerSync trigger. Sean ran the keystroke. The command errored at `command not found` (gcloud was not installed on Sean's Mac). No Application Default Credentials file landed. Alex had no visibility — generated the "Sean is unblocked, finish Step 9" handoff anyway. Code caught the silent failure by ATTEMPTING TO USE the (nonexistent) credentials and reporting back:

> "The credentials mystery, solved: gcloud is not installed on this Mac — so your `gcloud auth application-default login` couldn't have run."

The original anti-fabrication guard (CODEX S52.33, S52.34) protects against CONTENT grounding failures: Alex citing wrong rule numbers (TC-062), fabricating rule content under real IDs (TC-063), quoting URLs that drifted (TC-065), or quoting addresses that never existed (TC-066). None of those cover what happened here: Alex assumed a STANDARD developer environment without verifying Sean's actual machine state.

This is a new layer of ground truth — **environment-state grounding** — that needs its own rule.

---

## The rule

> **Environment-state grounding belongs to Code, not Alex.**
>
> If Alex (web or T1 or any surface) recommends a terminal command that depends on installed tooling, language interpreters, system services, or specific filesystem state, that recommendation MUST either:
>
> 1. **Wrap the command with an availability check** that fails LOUDLY if the precondition isn't met, OR
> 2. **Defer path-picking to Code** by describing the desired OUTCOME and letting Code choose the command sequence that works in the user's actual environment.
>
> Alex describes outcomes. Code picks paths.

Why this rule and not "Alex should pre-check installed tooling": Alex has no read access to the user's machine. Pre-checking is impossible from Alex's side. Code is the only loop participant with terminal access. The architectural fix is to push environment-dependent decisions to the participant who can see the environment.

---

## The 7-role four-way loop architecture

The four-way authoring loop (Sean + Web-Alex + Platform-Alex/T1 + Code) has historically been framed as four participants. Each TC class surfaced during the SITE-RECON-001 build revealed an additional GROUND-TRUTH ROLE-AXIS where one participant assumed another's state without verification:

| # | Role-axis | Who reads it | TC class that surfaced it |
|---|---|---|---|
| 1 | Sean — judgment, voice, intent | Sean | (baseline) |
| 2 | Web-Alex — drafting, framing | Web-Alex | (baseline) |
| 3 | Platform-Alex / T1 — translation, memory, codex authoring | T1 | (baseline) |
| 4 | Claude Code — build, cross-check, live verification | Code | (baseline) |
| 5 | **External service AT BUILD TIME** (live URL / API response) | Code's live probe | **TC-065** (URL drift over time) |
| 6 | **External service AT SPEC-AUTHORING TIME** (canonical sample inputs) | Code's live probe during spec authoring | **TC-066** (sample fabricated at origin) |
| 7 | **LOCAL MACHINE / ENVIRONMENT STATE** (installed tooling, paths, services) | Code's terminal | **TC-067** (environment-state assumption) |

Each axis carries ground truth that the other participants cannot see directly. The pattern lock that emerges:

> **Every recommendation should declare which role-axis IS the ground truth, and the recommendation flows from that role outward.**

For environment state: only the user's machine knows. Code is the role with read access. Therefore environment-dependent recommendations must be issued by Code or pre-checked before reaching the user.

---

## Pattern lock for Alex system prompts (web + T1 + every surface)

Add the following to every Alex authoring/coaching surface system prompt (`/creators/journey` intercept, `getCreatorAuthoringSystemPrompt`, the master Alex prompt, every worker's chat system prompt):

> **Environment-state grounding rule (S52.35):** You don't have read access to the user's machine. If you recommend a terminal command that depends on installed tooling (`gcloud`, `gh`, `brew`, `kubectl`, `docker`, `firebase`, `npm`, language interpreters not in `/usr/bin/`, etc.) or specific filesystem state, you MUST either:
>
> 1. Wrap the command with an availability check (`command -v X >/dev/null 2>&1 || <install or fail loudly>`), OR
> 2. Defer path-picking to Code by describing the desired outcome and instructing the user to tell Code: "We need <outcome>. Pick the path that works on my machine."
>
> Do NOT issue bare terminal commands depending on installed tooling. The failure mode is silent (the keystroke errors at `command not found`, you don't see it, you generate the "you're unblocked" handoff anyway). This is TC-067 — codified after Sean ran `gcloud auth application-default login` on a Mac without gcloud installed during Site Recon Step 9.

This pattern lock pairs with the existing anti-fabrication guard (S52.33/34). Anti-fabrication covers CONTENT; this covers ENVIRONMENT.

---

## Worked examples — wrong vs right framing

### Example A — Cloud credentials

**Wrong (TC-067 risk):**
> Alex: "Run `gcloud auth application-default login` to unblock the sync."

**Right (availability check):**
> Alex: "Paste this into Code:
> ```bash
> command -v gcloud >/dev/null 2>&1 || { echo 'gcloud not installed — install with: brew install --cask google-cloud-sdk'; exit 1; }
> gcloud auth application-default login
> ```"

**Right (defer to Code):**
> Alex: "We need application-default credentials for Google Cloud so Code can trigger the sync from your local. Tell Code: 'We need ADC for Google Cloud — pick the path that works on my machine.' Code will install gcloud if needed and walk you through the interactive login."

### Example B — Git operations

**Wrong:**
> Alex: "Run `gh pr create` to open the pull request."

**Right:**
> Alex: "Tell Code: 'Open a PR for this branch.' Code will use `gh` if installed, the GitHub web flow if not, and either way confirm the PR is open before saying done."

### Example C — Build/deploy commands

**Wrong:**
> Alex: "Run `firebase deploy --only functions` to ship the changes."

**Right:**
> Alex: "Tell Code: 'Deploy the functions changes to production.' Code will verify firebase-tools is installed, pick the right project, handle any auth prompts, and confirm the deploy succeeded."

The pattern: **outcome-oriented instruction to Code beats command-oriented instruction to Sean** any time the environment is non-deterministic.

---

## Lint specs for QA-001 platform family

The lint enforcement that makes this rule durable (proposed entries for `scripts/qa-001/checks/`):

### PLAT-ENV-01 — Alex bare-command lint
- **Scope:** every Alex system prompt + every Alex-emitted response that contains a triple-backtick code block tagged `bash`, `sh`, `zsh`, or untagged.
- **Rule:** scan for terminal commands depending on non-POSIX tooling. Maintain an allowlist of POSIX builtins + known-installed-by-default tools (`ls`, `cat`, `grep`, `sed`, `awk`, `find`, `git`, `curl`, `python3` on macOS, `node` if `.nvmrc` exists in repo).
- **Fail signal:** a bare command using a non-allowlist tool WITHOUT an availability-check wrapper AND WITHOUT a "tell Code:" defer.
- **Severity:** P1 (silent failure mode for creators).

### PLAT-ENV-02 — Code system prompt covers environment-grounding role
- **Scope:** Code's system prompt (in `CLAUDE.md` at repo root + any `.claude/` config that wraps Code).
- **Rule:** prompt must include explicit guidance that Code is the source-of-truth for environment-state questions, AND that Code should pre-check installed tooling before executing Alex-handed commands.
- **Fail signal:** Code's system prompt silent on environment-grounding role.
- **Severity:** P2.

### PLAT-ENV-03 — Creator install docs explain environment dependencies
- **Scope:** `docs/CREATOR-INSTALL.md`
- **Rule:** docs section must explain "Code knows what's installed on your machine; Alex doesn't. When Alex tells you to run a terminal command, paste it to Code first."
- **Fail signal:** docs missing the section, or section absent the "let Code run the command" framing.
- **Severity:** P1 (creator-onboarding survival, pairs with [[project-creator-install-explain-code-terminal-jargon]]).

---

## Implementation queue

### Immediate (post-test, before next creator worker build)
1. **Web-Alex `/creators/journey` system prompt** — add the environment-state grounding rule. File: `functions/functions/index.js` near the `getCreatorAuthoringSystemPrompt` builder (or wherever the S52.29e creator-journey intercept lives).
2. **Platform-Alex (T1) master prompt** — same addition. File: `functions/functions/prompts/core.js` or wherever the master Alex prompt is composed.
3. **Every worker's chat system prompt** — same addition, propagated through whatever shared layer the worker prompts inherit from.
4. **`docs/CREATOR-INSTALL.md`** — add "Code knows your environment, Alex doesn't" section (compounds with task #451's "Reading Claude Code's output" expansion per [[project-creator-install-explain-code-terminal-jargon]]).

### Spec v1.2 + worker template
5. Add `creators/_template/intent.md` "How this worker handles environment-state" section to the template, so future creator workers carry the rule.
6. Spec v1.2 corrigendum for SITE-RECON-001 (separate v1.2 pass, queued post-test) carries the rule explicitly.

### QA-001 enforcement
7. Build PLAT-ENV-01 lint script (`scripts/qa-001/checks/plat-env-01-bare-command-lint.js`).
8. Build PLAT-ENV-02 check (Code system prompt audit).
9. Build PLAT-ENV-03 check (CREATOR-INSTALL.md content audit).

### Memory + cross-ref durability
10. Update `MEMORY.md` index entry for TC-067 to reference this CODEX (already done in Track 1 commit per S52.34 corrigendum).

---

## Why this rule generalizes beyond gcloud

The TC-067 incident was specifically about gcloud, but the failure mode is environment-state. The same silent-failure shape applies to:

- Language runtimes (Python 2 vs 3 vs venv vs pyenv; Node version mismatches; Ruby/Bundler/rbenv)
- Build tooling (`make`, `cmake`, `bazel`, `gradle`, `maven`) — assumed present, can be missing
- Container runtime (`docker`, `podman`, `nerdctl`) — one shop has docker, another has podman, another has Docker Desktop disabled
- Cloud CLIs (`aws`, `az`, `gcloud`, `gh`, `kubectl`, `helm`) — none are POSIX
- Editor integrations (`code`, `vim`, `nvim`, `subl`) — recommending these as commands assumes the binary is on PATH
- Package managers (`brew` on macOS, `apt` on Debian/Ubuntu, `dnf` on Fedora, `pacman` on Arch, `apk` on Alpine, `choco`/`scoop` on Windows-via-WSL)
- Network operations on flaky links (TC-067's deploy-retry sibling discovery; `curl` with no `-C -` is a TC-067 cousin)

The lint enforcement should accumulate as the platform grows — every new "assumed standard environment" failure becomes a PLAT-ENV-XX entry.

---

## How this rule de-risks the marketplace

SITE-RECON-001 was Sean's build, and Sean is a senior practitioner who could pattern-match the failure ("oh — Code says gcloud isn't installed, that explains why the credentials didn't land"). A first-time creator without that pattern-matching depth would:

1. Hear Alex say "run this command"
2. Type it into the terminal
3. See `command not found` scroll past (or worse — see nothing if the terminal is auto-scrolling)
4. Tell Alex "ok done" because they trust Alex
5. Be confused when downstream steps fail
6. Conclude "this is too technical for me" and abandon Step 6 onward
7. Never tell Alex why they quit, leaving the four-way loop with no signal

Survival of the loop depends on this rule. Without it, every creator with a non-standard environment (i.e., most creators) hits a silent-failure cliff at the first env-dependent command Alex emits.

---

## Related

- `docs/QA-001-TEST-CORPUS.md` — TC-061 / TC-062 / TC-063 / TC-064 / TC-065 / TC-066 / **TC-067** (this CODEX is TC-067's pattern-lock companion)
- `docs/CODEX-S52.33-Site-Recon-Step8-Prompt.md` — first instance of the anti-fabrication guard (CONTENT grounding)
- `docs/CODEX-S52.34-Site-Recon-Step9-Prompt.md` (+ corrigendum) — second instance + TC-065/066/067 surfacing
- `docs/CREATOR-INSTALL.md` — gets the creator-facing translation of this rule (task #451 expansion)
- Memory `project_tc067_alex_environment_state_assumption.md` — the lesson source
- Memory `project_step9_gis_url_corrections_inverse_tc063.md` — TC-065 sibling
- Memory `project_tc066_locked_spec_fabricated_at_origin.md` — TC-066 sibling
- Memory `project_four_way_authoring_loop_with_code.md` — the loop now has 7 role-axes
- Memory `project_creator_install_explain_code_terminal_jargon.md` — pairs with this CODEX in the creator install docs

---

## After this CODEX commits

The four-way loop's architecture is no longer a four-participant model; it is a 7-role-axis ground-truth-routing model. Every future creator worker build inherits:

- The anti-fabrication guard (S52.33/34) for content grounding
- The environment-grounding rule (this CODEX) for machine-state grounding
- The pin-step protocol (S52.34 corrigendum) for external-service ground truth at build time
- The sample-verify-at-spec-time rule (TC-066 lesson) for external-service ground truth at spec authoring time

When the LAW-LANDUSE-001 build kicks off (next on the build queue per [[project-worker-dependency-clarity-emerges-from-real-builds]]), all four guards travel with it.
