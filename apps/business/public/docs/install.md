# Install the tools

Three free accounts. Most creators set them up in one focused sitting. The order matters — each step builds on the previous one.

## What you're installing and why

| Tool | What it is | What you'll do with it |
|---|---|---|
| **Anthropic Claude account** | Sign-up at claude.ai | Sign in to Claude Chat (browser) and Claude Code (terminal) — one account covers both |
| **Claude Code** | A program that runs in your computer's terminal | Talk to it about your worker. It edits the files. You focus on the domain. |
| **GitHub account** | Free service that stores code | Where your worker lives once it's built. The platform reads from here to list it. |

That's it. No databases to install, no servers to provision, no API keys to manage. The platform handles all of that.

## Step 1 — Sign up at claude.ai

Open [claude.ai](https://claude.ai) and create an account. The free tier is enough to start a worker. Many creators upgrade to a paid plan ($20/mo) once they're using Claude Code regularly because it gives you more daily usage.

**One account, two surfaces:**
- **Claude Chat** (browser, claude.ai) — your always-on helper. Paste screenshots, ask "what does this error mean," get unstuck.
- **Claude Code** (terminal, installed next) — your pair programmer. Edits files. Runs commands. Doesn't need you to know syntax.

## Step 2 — Install Claude Code

Open the official install page: [docs.claude.com/en/docs/claude-code/setup](https://docs.claude.com/en/docs/claude-code/setup)

The install assumes no prior coding experience. If you've never opened a terminal before:
- **Mac:** Press `Cmd+Space` to open Spotlight, type "Terminal", press Enter. A black-and-white window opens.
- **Windows:** Open the Microsoft Store, search for "Windows Terminal", install it.

Claude Code requires **Node.js** to be installed (the installer will tell you if it's missing). On Mac, the easiest path is `brew install node` if you have Homebrew. On Windows, download Node.js from [nodejs.org](https://nodejs.org).

Once Claude Code is installed, in your terminal type:
```
claude
```

The first time, it'll ask you to sign in with your Claude account from step 1. That's the link between the two — you'll never see two separate logins.

**Stuck?** Open Claude Chat in your browser, paste a screenshot of whatever's on your terminal, and ask "what should I do next?" — it'll walk you through.

## Step 3 — Sign up at github.com

Open [github.com/signup](https://github.com/signup) and create an account. GitHub is the world's place to store code. Your Worker will live there once it's built.

Important things to know:
- The account is **free**. You'll never write code directly on GitHub — Claude Code handles all of that.
- Use any email — doesn't have to match your Claude account.
- Pick a username that makes sense for your **public Creator Profile**. After your worker ships, your profile lives at `sociii.ai/c/<your-github-username>`. Keep it professional.

After signup, GitHub will offer you a tour. You can skip it. We don't use the GitHub web interface much — only to merge PRs and watch CI.

## Verifying it all works

In your terminal, run these three commands:

```
claude --version
git --version
node --version
```

If all three print version numbers (not "command not found"), you're ready to build your first worker. **[Continue to your first worker →](/docs/your-first-worker)**

## Common install problems

**"claude: command not found"** — Claude Code isn't on your PATH. Close and reopen the terminal. If still broken, re-run the installer.

**"node: command not found"** — Install Node.js from [nodejs.org](https://nodejs.org) (pick the LTS version). On Mac with Homebrew: `brew install node`.

**Permission denied on Mac during `claude` install** — Don't use `sudo`. Use the official installer or `brew install` instead.

**Windows: "execution of scripts is disabled"** — Open PowerShell as Administrator, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`, press Y.

When in doubt: paste the error message into Claude Chat. It will explain what's happening and what to do.
