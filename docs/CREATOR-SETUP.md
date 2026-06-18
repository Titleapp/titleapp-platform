# SOCIII Creator Setup — your AI walks you through it

**You do not need to know how to code. You need about 15 minutes and an AI to hold your hand.**

This document is designed to be **pasted into an AI assistant**, which will then guide you, one step at a time, from a blank computer to building your Digital Worker. You don't read this and follow it yourself — you hand it to the AI and let the AI be your guide.

---

## How to use this (read just this part — it's the only part for you)

**Before anything else — set up your screen so you can see both windows at once.** You'll be going back and forth between your **web browser** (your AI guide) and the **Terminal** (where you run commands). Put them **side by side on the same screen** — browser on one half, Terminal on the other. Do **not** stack them so you have to flip between full-screen windows; that's the #1 way people get lost. On a Mac you can drag each window to a side, or hover the green ⬤ button to tile it left/right.

1. Open **chatgpt.com** or **claude.ai** in your web browser. (Free. No install. This is your *guide* until your own tools are set up.)
2. **Copy this entire document** and paste it as your first message.
3. Then type one line: **"I'm on a Mac"** or **"I'm on Windows"** and **"please walk me through it one step at a time."**
4. The assistant will give you **one small step at a time.** When it asks you to run a command, copy the command, paste it into your **Terminal**, press Enter, then **paste back exactly what you see** — even if it looks like an error. That back-and-forth is the entire process.
5. Don't skip ahead. Don't run commands it hasn't given you. If you get lost, paste what's on your screen and say "I'm stuck."

When you reach the end, your own AI (Claude Code) takes over and the browser assistant's job is done.

---

## INSTRUCTIONS TO THE AI ASSISTANT READING THIS

You are onboarding a **non-technical creator** (a nurse, a pilot, a teacher — not an engineer) so they can build a "Digital Worker" on the SOCIII platform. Your job is to be the patient human-in-the-loop that walks them through installing the tools and getting into the codebase. Follow these rules strictly:

- **First, fix their screen layout.** Before any commands, confirm they have the **browser and Terminal side by side on one screen** (not stacked, not flipping between full-screen windows). People who can't see both at once get lost copying between them. This is step zero — don't skip it.
- **One step at a time. Never dump the whole list.** Give a single command or a single action, then wait for them to paste back what happened before continuing.
- **Always ask them to paste the exact output** before you move on. Do not assume a step worked.
- **Plain language, no jargon.** Define every term the first time (Terminal, repo, fork, clone). No "simply," no "just."
- **Detect their OS first** (Mac vs Windows) and follow the matching path below. The **Mac path is fully tested** — trust it. For Windows, adapt using official Claude Code docs and flag where you're less certain rather than guessing.
- **Apply the Known Gotchas** below proactively — these are real failures a previous creator hit. When you see the matching symptom, you already know the fix.
- **Success is defined precisely** (see Success Check). You are not done until they are *inside Claude Code, in the repo, and it has answered a question about their own worker.* Then hand off and stop.
- **Encourage.** This is intimidating for them. Celebrate each green checkmark.

---

## THE CANONICAL PATH — macOS (tested, gold standard)

Give these to the creator **one at a time**, waiting for output each time.

**Step 1 — Open the Terminal.**
Press `Cmd + Space`, type `Terminal`, press Enter. A window with text and a blinking cursor opens. That's the Terminal — where they'll paste commands.

**Step 2 — Check for git (the tool that downloads code).**
```
git --version
```
- If it prints a version (e.g. `git version 2.50.1`) → good, continue.
- If a **popup** appears offering to install "command line developer tools" → click **Install**, wait for it to finish (a few minutes), then run `git --version` again. **They do NOT need Homebrew for this.** (See Gotchas.)

**Step 3 — Tell git who they are.** (Use their real name and the email on their GitHub account.)
```
git config --global user.name "Their Full Name"
git config --global user.email "their@email.com"
```
(No visible output = success.)

**Step 4 — Install Claude Code (their AI coding assistant).**
```
curl -fsSL https://claude.ai/install.sh | bash
```
Wait for it to finish. It installs to `~/.local/bin`.

**Step 5 — Open a BRAND-NEW Terminal window** (`Cmd + N`), then:
```
claude --version
```
- If it prints a version → continue to Step 6.
- If it says `command not found` → see Gotcha A (PATH). Don't panic; this is the most common bump and the fix is one line.

**Step 6 — Create a GitHub account** (if they don't have one). In the browser: **github.com → Sign up.** A Google sign-in (SSO) is fine. Have them note their **username** — they'll need it in Step 8.

**Step 7 — Fork the SOCIII repo** (make their own copy). In the browser, logged into GitHub:
- Go to **github.com/Titleapp/titleapp-platform**
- Click **Fork** (top-right) → on the next screen click the green **Create fork**.
- Wait a few seconds. This lands them on **github.com/THEIR-USERNAME/titleapp-platform** — their personal copy. This repo is **public**, so no special access is needed.

**Step 8 — Download (clone) their fork.** Back in the Terminal (replace `THEIR-USERNAME`):
```
git clone https://github.com/THEIR-USERNAME/titleapp-platform.git
```
This downloads ~16,000 files. Takes a moment. If it errors, see Gotcha B (404 / could-not-read-Username).

**Step 9 — Go into the folder and launch Claude Code.**
```
cd titleapp-platform
claude
```
On first launch, Claude Code will ask them to **log in** (it opens a browser to authenticate). That's expected — have them complete it.

**Step 10 — The handoff (this is the finish line).** Once Claude Code is running *inside the repo*, the browser assistant is done. Tell the creator to type this to Claude Code:
```
Read the folder creators/ and find my worker, then explain in plain
English what it does and one thing I could improve. I'm not a coder.
```
When Claude Code answers about *their* worker, they're in. 🎉

---

## THE CANONICAL PATH — Windows (less-tested; adapt carefully)

The Mac path is the proven one. On Windows, the reliable route is **WSL (Windows Subsystem for Linux)** or following the official installer at **docs.claude.com / claude.ai/install** for Windows. AI assistant: walk them through enabling WSL (or the supported Windows install), then the **git config → GitHub account → fork → clone → `cd` → `claude`** sequence is identical to Mac Steps 3 and 6–10. Be honest where you're unsure; have them paste output and adjust. Do not invent Windows-specific commands you're not confident about.

---

## KNOWN GOTCHAS / TROUBLESHOOTING (real failures, real fixes)

**A. `claude: command not found` after installing.**
The tool installed fine; the Terminal just doesn't know where it is yet.
1. First, **fully quit and reopen Terminal** (`Cmd + Q`, then reopen) and try `claude --version` again.
2. If still missing, run this one line, then retry:
   ```
   export PATH="$HOME/.local/bin:$PATH"
   ```
   To make it permanent: `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc` then open a new Terminal.
3. Confirm the binary exists: `ls -l ~/.local/bin/claude` (should show the file).

**B. `git clone` fails with `Repository not found` / `404` / `could not read Username for 'https://github.com'`.**
This almost always means one of three things:
1. **They haven't forked yet** — go back to Step 7 and create the fork first.
2. **Wrong username in the URL** — the URL must contain *their own* GitHub username, not "Titleapp" and not a guess. Have them confirm their username at github.com (top-right avatar).
3. **A typo** in the repo name. It is exactly `titleapp-platform`.
Note: they are cloning a **public** repo, so it should never ask for a password. If it asks for a username/password, the URL is pointing at something private or nonexistent — recheck the fork.

**C. "Should I install Homebrew?" — No.**
Homebrew is a different package manager. For this setup it is **not needed** and wastes 10–20 minutes. git comes with Apple's developer tools (Step 2) and Claude Code comes from its own installer (Step 4). Skip any suggestion to install Homebrew.

**D. `command not found: git` and no popup appears.**
Run `xcode-select --install` to trigger the developer-tools installer, accept the popup, wait, then retry `git --version`.

**E. They pasted a command and "nothing happened."**
No output is often *success* (git config, cd). Have them run the next step. If unsure, `pwd` shows the current folder and `ls` lists what's in it.

**F. They closed the Terminal and lost their place.**
Reopen Terminal, then `cd titleapp-platform` and `claude` to get right back in. The download from Step 8 is saved on their computer — they don't repeat it.

---

## SUCCESS CHECK (AI assistant: you are done only when ALL are true)

- [ ] `git --version` and `claude --version` both print a version.
- [ ] `git config --global user.name` / `user.email` are set.
- [ ] They have a GitHub account and **forked** Titleapp/titleapp-platform.
- [ ] They cloned their fork and are inside the `titleapp-platform` folder.
- [ ] `claude` launches and they completed login.
- [ ] **Claude Code answered a question about their own worker** (Step 10).

When all six are checked: congratulate them, tell them the browser assistant's job is finished, and that from here they talk to **Claude Code** in the Terminal to build. Stop.

---

*If you're a creator and any of this breaks in a way the assistant can't solve, that's a bug on our side — tell your SOCIII contact what your screen says and we'll fix the document, not just your machine.*
