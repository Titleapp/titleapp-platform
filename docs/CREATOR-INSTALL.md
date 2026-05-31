# Welcome to SOCIII — Install Guide

This is your setup walkthrough. About **30 minutes start to finish** if nothing surprises you. You don't need to be a developer. You do need to be willing to type a few commands into a terminal window. Each step is explained.

We'll get you to the point where you can:

1. Open Claude Code on your laptop and start a conversation with an AI pair programmer who can read our whole codebase
2. Make changes inside *your own* fork of the SOCIII platform — safely, without touching the underlying code
3. Build a Digital Worker that you can list in the SOCIII marketplace and earn from

---

## What you're going to install (briefly, so you know)

| Tool | What it is | Why you need it |
|---|---|---|
| **Node.js** | The runtime that JavaScript-based tools use | Claude Code needs it |
| **Git** | The system for tracking code changes | How you save and share your work |
| **Claude Code** | An AI pair programmer that runs in your terminal | This is what you'll actually use day-to-day |
| **A GitHub account** | A place to store your code online | Where your worker lives |

You'll also need an **Anthropic account** — Sean will invite you to the SOCIII Anthropic Team, which gives you a free seat for Claude Code. Watch for that invite email.

---

## Before you start

**On a Mac?** You have everything you need built-in. Open the **Terminal** app (find it via Spotlight search — Cmd+Space, type "Terminal").

**On Windows?** Open **Windows Terminal** or **PowerShell** (built into Windows 11). If you don't have Windows Terminal, install it from the Microsoft Store — it's free and takes 2 minutes.

**Don't panic about the terminal.** It looks scary if you've never used one, but you only need to copy/paste a few commands and read what it tells you. If something breaks, screenshot it and text Sean. We'll get unstuck in two minutes.

---

## Step 1 — Install Node.js (5 minutes)

Node.js is what powers Claude Code. We need version 20 or higher.

**Easiest path:** download the installer from [nodejs.org](https://nodejs.org). Click the big green button that says "20 LTS" or higher. Download, double-click, follow the prompts. Done.

**To check it worked:** in your terminal, type:

```
node --version
```

You should see something like `v20.something`. If you see that, you're good.

If you see `command not found`, the installer didn't finish or didn't restart your terminal. Quit Terminal, reopen it, try again.

---

## Step 2 — Install Git (5 minutes, maybe already there)

Git tracks your code changes.

**On Mac:** in your terminal type:

```
git --version
```

If you see a version number, you already have it. Done. If you see something asking you to install command-line tools, click "Install" and wait a few minutes for it to finish.

**On Windows:** download from [git-scm.com](https://git-scm.com/download/win). Click "64-bit Git for Windows Setup." Run the installer. Accept all the defaults — they're correct.

**To check it worked:** type `git --version` in your terminal. Look for a version number.

---

## Step 3 — Create a GitHub account (3 minutes, if you don't have one)

Go to [github.com](https://github.com) and sign up. Use your personal email — the one you check.

**Important:** this is *your* GitHub. It's where *your* code lives. SOCIII doesn't own your fork, you do.

After signing up, set up SSH keys so your computer can push code without typing your password every time. GitHub has a [walkthrough here](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) — it takes about 5 minutes. If this part feels intimidating, skip it for now; you can push code using your password + a personal access token instead, and SSH later.

---

## Step 4 — Install Claude Code (2 minutes)

In your terminal, type this and hit enter:

```
npm install -g @anthropic-ai/claude-code
```

The first time you do this it takes 30-60 seconds. You'll see a lot of text scroll by. Wait until it's done and you get your prompt back (the line with `$` or `>` at the end).

**To check it worked:** type:

```
claude --version
```

You should see a version number. If you see `command not found`, restart your terminal and try again.

---

## Step 5 — Log in to Claude Code (2 minutes)

This connects your Claude Code installation to your Anthropic Team seat (the one Sean invited you to — make sure you've accepted that invite first).

In your terminal:

```
claude /login
```

Your browser opens. Click "Continue with Google" (or whichever option matches your account). Authorize. Browser shows a success screen. Come back to your terminal — you'll see "Logged in."

You can also just type `claude` and it'll prompt you to log in automatically if you haven't yet.

---

## Step 6 — Fork the SOCIII repo to your account (2 minutes)

Go to https://github.com/Titleapp/titleapp-platform (this becomes `github.com/sociii-Inc/sociii-platform` soon — same place).

Click the **Fork** button in the top right of the page. GitHub asks where to fork it; choose your personal account. Wait 10 seconds.

You now have your own copy at `github.com/<your-username>/titleapp-platform`. **This is YOUR copy.** You can change anything you want in it. Sean's "main" copy stays untouched no matter what you do.

---

## Step 7 — Clone your fork to your laptop (3 minutes)

"Cloning" means downloading your fork to your computer so you can edit it.

In your terminal, navigate to where you want the code to live. A good spot is your home folder:

```
cd ~
```

(That `~` means "my home folder.")

Now clone:

```
git clone https://github.com/<your-username>/titleapp-platform.git
```

(Replace `<your-username>` with your actual GitHub username.)

This takes 20-30 seconds. When it's done, you have a folder called `titleapp-platform` containing the entire codebase.

Step into it:

```
cd titleapp-platform
```

---

## Step 8 — Open Claude Code in the project (1 minute)

This is the moment. Type:

```
claude
```

Claude Code starts. It reads the project's instructions automatically (a file called `CLAUDE.md` at the top of the repo). It now understands the whole codebase.

Your first prompt — copy this in:

> Hi. I'm new to this project. I'm a [your profession] and I want to build a Digital Worker that does [one-sentence description of what you want to build]. Read docs/CREATOR-WORKER-BUILD.md and walk me through what we'll do, in plain language.

Claude will read the doc, summarize it back to you, and tell you what to do next. You're now collaborating with it the same way Sean does.

---

## What you can and can't change

**You can change anything in your own creator directory:**

```
creators/<your-handle>/
```

That's your workspace. Anything goes there. New worker, new files, new ideas — it's your sandbox.

**You can't push changes to the platform itself.** The folders below are protected and require Sean's review before anything merges into the main branch:

- `apps/` — the React app
- `functions/` — the backend API
- `raas/` — the rules engine
- `contracts/` — the capability registry
- `docs/` (except `docs/creators/`) — the platform docs
- Root config files (`package.json`, `firebase.json`, etc.)

If you fork the repo and modify these in your fork, that's fine — but when you open a Pull Request back to the main repo, the change won't merge without Sean's sign-off. This is by design. The platform is the moat, and we keep it tight.

**If you have an idea for the platform itself** — a new feature, a bug fix in `functions/`, anything outside your creator directory — open a GitHub Discussion first. Sean will weigh in. If the idea is solid, he'll either implement it himself or invite you to PR it under his guidance.

---

## When you get stuck

**At any install step:** screenshot the error message and send to Sean. Don't fight it.

**Once Claude Code is running:** ask it. It can read every file in the project. It knows the patterns. It can debug what's going wrong. Examples:

- "I'm confused about the canvas-tabs.json schema. Show me an example and explain each field."
- "How does the StudentJourney component get the student's data?"
- "I want to add a tab for `parent-communication`. What files do I need to create or change?"
- "I think I broke something. Read the git diff and tell me what I changed that I shouldn't have."

Claude Code is a real pair programmer. Use it like you'd use a smart colleague who already knows this codebase.

**Bigger questions about the SOCIII platform or business model:** read `docs/CREATOR-ONBOARDING.md` (the 90-minute deep dive) and `docs/CREATOR-WORKER-BUILD.md` (the worker authoring pattern).

---

## What's next once you're set up

1. **Build your first worker.** Copy `creators/_template/` to `creators/<your-handle>/<your-worker-slug>/`. Edit the five files. Use Claude Code to fill them in conversationally.
2. **Test it locally.** Run `npm run preview-worker -- --worker=<your-handle>/<your-worker-slug>` to see your worker in a browser.
3. **Push to your fork.** When you're ready, commit your changes and push to your GitHub.
4. **Open a Pull Request** to the upstream SOCIII repo. Sean reviews. If it passes the Worker DoD (definition-of-done) checks, it merges and your worker goes live in the marketplace.
5. **Get paid.** When customers subscribe to your worker, you get 75% of net revenue, paid monthly.

That's the loop. Welcome aboard.

— Sean
