# Creator install — quick reference

This is the repo-root cheat sheet. The full walk-through lives at **[sociii.ai/docs/install](https://sociii.ai/docs/install)**.

## Three accounts to sign up for

1. **Anthropic Claude** — [claude.ai](https://claude.ai). One sign-up covers both Claude Chat (browser) and Claude Code (terminal).
2. **Claude Code** — [docs.claude.com/en/docs/claude-code/setup](https://docs.claude.com/en/docs/claude-code/setup). Runs in your terminal.
3. **GitHub** — [github.com/signup](https://github.com/signup). Where your worker lives.

## Quick start

```
# 1. Clone the repo
git clone https://github.com/sociii/sociii.git
cd sociii

# 2. Start Claude Code
claude

# 3. Tell it what you're building
# (Claude Code reads CLAUDE.md and walks you through the rest)
```

## Verify install

```
claude --version
git --version
node --version
```

All three must print version numbers.

## When stuck

Paste a screenshot of the error into [claude.ai](https://claude.ai). It will explain what's happening.

## Full docs

**[sociii.ai/docs/install →](https://sociii.ai/docs/install)** has the troubleshooting matrix, common-error fixes, and platform-by-platform install notes.

**[sociii.ai/docs/your-first-worker →](https://sociii.ai/docs/your-first-worker)** walks you through end-to-end build conversation with Claude Code.
