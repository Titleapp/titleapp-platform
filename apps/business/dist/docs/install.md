# Install the tools

Three free accounts. Most creators set them up in one focused sitting (45–90 minutes if you've never opened a terminal before; 15 minutes if you have).

> **If you've never used a terminal or coded before — this page is written for you.** Every step assumes nothing. We'll cover *how* to open the apps, *how* to arrange them on your screen, *how* to take a screenshot and paste it into Claude Chat when you get stuck. The first time is the only hard time.

---

## The big picture — what you're setting up

You're going to end up with **three windows open at the same time**, laid out side by side on your screen:

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│                      │                      │                      │
│   Claude Chat        │   Terminal           │   sociii.ai          │
│   (browser tab)      │   (Mac or Windows)   │   (browser tab)      │
│                      │                      │                      │
│   Where you ask      │   Where Claude Code  │   Where your worker  │
│   "what does this    │   actually edits     │   lives once it's    │
│   error mean?" and   │   your files and     │   built. Where you   │
│   paste screenshots  │   runs commands.     │   see how it looks   │
│                      │                      │   to a customer.     │
│                      │                      │                      │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

That's the workspace. Once you have those three windows arranged, you're set.

---

## The tools, in plain language

| Tool | What it is | What you'll do with it |
|---|---|---|
| **Anthropic Claude account** | A free account at claude.ai | One sign-in covers both Claude Chat (browser) and Claude Code (terminal) |
| **Claude Code** | A program that runs in your computer's terminal | Talk to it about your worker. It edits files and runs commands for you. |
| **GitHub account** | Free service that stores code | Where your worker lives once it's built. The SOCIII platform reads from here. |

No databases. No servers. No API keys. The platform handles all of it.

---

## Step 1 — Sign up at claude.ai

1. Open a web browser (Chrome, Safari, Firefox, whichever you use)
2. Type `claude.ai` in the address bar and press Enter
3. Click **"Sign up"** and create an account using your email
4. Verify the email when the verification message arrives

The **free tier** is enough to start a worker. Most creators upgrade to **Claude Pro** ($20/mo) once they're using Claude Code regularly, because the paid plan gives much more daily usage. You can start free and upgrade when you hit a usage limit.

### What's the difference between Claude Chat and Claude Code?

- **Claude Chat** = the chat interface in your browser at claude.ai. You'll keep this open as your *always-on helper*. Got an error? Paste a screenshot here. Got a question? Type it here.
- **Claude Code** = a program that lives in your computer's terminal. Same Claude underneath, different surface. Claude Code can *do things* — edit files, run commands, build your worker. Claude Chat *talks* about things.

You'll use both, side by side.

---

## Step 2 — Open your Terminal (the app)

> **If you've never opened a terminal in your life, this is the step that scares people the most. Don't let it. A terminal is just a text-based way to talk to your computer. That's all.**

### On Mac

1. Press **`Command + Space`** at the same time. A search bar pops up in the middle of your screen.
2. Type **`Terminal`** and press Enter.
3. A black-and-white window opens. That's your Terminal. It's now waiting for you to type.

You can leave it open. We'll come back to it.

> **Tip:** Drag the Terminal icon from your Dock (or right-click in the Dock → Keep in Dock) so you don't have to search for it every time.

### On Windows

1. Click **Start** (the Windows icon, bottom-left corner of your screen)
2. Type **`Terminal`** in the search bar and press Enter
3. A window opens. That's it.

> If "Terminal" doesn't show up, search for **`Windows Terminal`** in the Microsoft Store and install it (it's free). Older versions of Windows use Command Prompt or PowerShell — either works, but Windows Terminal is the best experience.

### What now?

Just leave it open. You haven't typed anything yet — that's fine. Next step.

---

## Step 3 — Install Claude Code

This is the only step that involves typing commands.

1. **Open the official install page** in your browser: [docs.claude.com/en/docs/claude-code/setup](https://docs.claude.com/en/docs/claude-code/setup)
2. **Follow the instructions for your operating system** (Mac or Windows). Anthropic keeps these instructions current; if our docs and their docs ever disagree, trust theirs.

### Before you install Claude Code, you need Node.js

Claude Code is built on Node.js. If you don't have Node.js installed, Claude Code's installer will tell you.

**On Mac:**
- If you have Homebrew (a package manager many developers install), open Terminal and type: `brew install node`
- If you don't have Homebrew or don't know what it is, go to [nodejs.org](https://nodejs.org), click the green **LTS** button to download the installer, and run it.

**On Windows:**
- Go to [nodejs.org](https://nodejs.org)
- Click the green **LTS** button
- Run the downloaded installer (it walks you through it)

> "LTS" means Long Term Support. It's the stable version. Always pick LTS unless you have a reason not to.

### Installing Claude Code itself

After Node.js is installed, the Anthropic install page tells you what command to run. As of today (subject to change — trust the official page), it's typically a single line you paste into Terminal that downloads and installs it for you.

### Starting Claude Code for the first time

Once installed, in your terminal type **just one word**:

```
claude
```

Press Enter. Claude Code starts up. The first time, it asks you to sign in with your Claude account from Step 1. After that, it remembers.

When Claude Code is running, your terminal looks different — there's a chat-like prompt at the bottom where you type. That's where you talk to it.

---

## Step 4 — Sign up at github.com

1. Open a new browser tab
2. Go to [github.com/signup](https://github.com/signup)
3. Create a free account with your email and pick a username

### Picking your username carefully

This matters more than you might think. After your worker ships on the SOCIII marketplace, your public Creator Profile lives at `sociii.ai/c/<your-github-username>`. So if your GitHub username is `jane-the-nurse-2026`, your profile is `sociii.ai/c/jane-the-nurse-2026`.

Pick something:
- Professional (you'll print this on your bio someday)
- Short (people will type it)
- That makes sense as both a code account and a public profile

You can't easily change it later, so think about it before you commit.

After signup, GitHub offers you a tour. **You can skip it.** You'll almost never use the GitHub website — Claude Code handles all the code interaction. You'll only come back to GitHub.com to merge a pull request (the platform tells you when).

---

## Step 5 — Set up your workspace

Now you arrange the three windows so they're all visible at once.

### On Mac

The cleanest setup uses **Split View** or just dragging windows by their title bars:

1. Open your browser. Inside it, make sure you have **two tabs**: one on `claude.ai`, one on `sociii.ai`. (You'll add a third tab on `github.com` when needed, but it's secondary.)
2. Drag the browser window to occupy the **left half** of your screen.
3. Drag your Terminal window to occupy the **right half** of your screen.
4. On the browser side, you can split between two side-by-side tabs by either using a split-tab browser feature, or just keeping `claude.ai` and `sociii.ai` open as two tabs you switch between with `Cmd+1`, `Cmd+2`, etc.

Alternatively, drag windows to the corners of your screen — Mac has snap-to-corner gestures if you hold the green maximize button down for a moment.

### On Windows

Windows has built-in window snapping:

1. Drag your browser window to the **left edge** of your screen until you see a snap indicator, then release. The browser fills the left half.
2. Drag your Terminal window to the **right edge** until it snaps. Terminal fills the right half.
3. Use `Win + Arrow Keys` (`Win + Left Arrow`, `Win + Right Arrow`) to fine-tune.

### What this looks like in practice

```
┌──────────────────────────────────┬──────────────────────────────────┐
│                                  │                                  │
│   Browser                        │   Terminal                       │
│   ┌──────────┬──────────┐       │                                  │
│   │claude.ai │sociii.ai │       │   claude code                    │
│   ├──────────┴──────────┤       │   > Build a worker for nurses    │
│   │                     │       │     doing patient evaluations    │
│   │   (whichever tab    │       │   ...                            │
│   │   is active)        │       │                                  │
│   │                     │       │                                  │
│   └─────────────────────┘       │                                  │
│                                  │                                  │
└──────────────────────────────────┴──────────────────────────────────┘
```

When you're stuck in Terminal — switch to the browser, paste a screenshot of Terminal into Claude Chat, ask "what does this mean?". When something works in the platform — switch to sociii.ai in the browser to see what it looks like to a customer.

---

## Step 6 — Learn the screenshot + paste workflow

This is the single most important skill for a non-coder using Claude Code: **when you don't know what's happening, show Claude what you're seeing.**

### How to take a screenshot on Mac

- **Whole screen:** `Command + Shift + 3`
- **Selected area** (you drag a box): `Command + Shift + 4` — much more useful, lets you grab just the part you want
- The screenshot saves to your Desktop by default and **also goes onto your clipboard automatically**. You can paste it directly into Claude Chat.

### How to take a screenshot on Windows

- **Whole screen:** `Windows + Print Screen` — saves to Pictures/Screenshots folder
- **Selected area:** `Windows + Shift + S` — pops up the Snip & Sketch tool, lets you drag a box. The selected area goes to your clipboard.

### How to paste a screenshot into Claude Chat

1. Open your Claude Chat tab (`claude.ai`)
2. Click into the message box at the bottom
3. Paste — `Command + V` on Mac or `Ctrl + V` on Windows
4. The screenshot uploads. Type your question next to it ("what does this error mean?", "what should I click here?", "how do I fix this?")
5. Send.

Claude reads the screenshot like a human reading it. You don't have to transcribe error messages or describe what you see — paste the picture, ask the question.

### When to use this workflow

- Terminal shows red text or an error — screenshot, paste, ask
- The SOCIII platform shows something you don't recognize — screenshot, paste, ask
- A doc on the install page is confusing — screenshot the confusing part, paste, ask
- You can't tell if you did something right — screenshot the result, paste, ask "is this right?"

This is the loop. **Look → Screenshot → Paste → Ask → Try.** You'll do this dozens of times when you're starting out. That's normal. It's not failure; it's how learning happens.

---

## Verifying it all works

In your Terminal (the right-hand window), type these three commands one at a time, pressing Enter after each:

```
claude --version
git --version
node --version
```

Each should print a version number (something like `1.4.2` or `v22.11.0`). If all three print a version, you're done. Skip to your first worker.

If any of them prints **"command not found"** — paste a screenshot of your terminal into Claude Chat, ask "what should I install next?" — it'll walk you through it.

**[→ Continue to: Your first worker](/docs/your-first-worker)**

---

## Common install problems (and what to do)

**"`claude: command not found`"** — Claude Code didn't install cleanly, or it's not on your PATH. Close your terminal window completely, open a new one, try again. If still broken — paste a screenshot of the error into Claude Chat, ask what's happening.

**"`node: command not found`"** — Install Node.js first. On Mac with Homebrew: type `brew install node` in Terminal. Otherwise, download from [nodejs.org](https://nodejs.org) and run the installer.

**Permission denied on Mac** — Don't use `sudo`. Re-install via the official installer or via `brew install`.

**Windows: "execution of scripts is disabled"** — Open PowerShell as Administrator (right-click Start, choose "Windows PowerShell (Admin)"), type:
```
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Press Enter, then `Y` to confirm. Close that PowerShell, open your regular terminal, try again.

**"How do I know if I have Homebrew?"** — In Terminal, type `brew --version`. If it prints a number, you have it. If it says "command not found," you don't, but you can install it from [brew.sh](https://brew.sh) — or just skip Homebrew and download Node.js directly from nodejs.org.

**When in doubt, screenshot it.** Paste the error or the confusing screen into Claude Chat. Ask "what should I do?". Repeat until working.
