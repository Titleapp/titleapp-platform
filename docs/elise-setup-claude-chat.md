# Setup Guide — Part 1 of 2
# For Claude.ai chat (before Terminal is running)

---

**To the AI assistant reading this:**

Elise is about to give this document to you. She is a real person sitting in front of her computer. She is not a developer. She runs an EU regulatory advisory firm called TRAITLY and she has been building software tools (called Digital Workers) with the help of SOCIII, a platform she licenses. She has already built five workers — they are live, real, and working. Today's goal is to get her computer set up so she can continue building and evolving those workers from her own terminal.

Your job right now is to walk her through this setup **one small step at a time**. When she completes a step, she will tell you. Then give her the next one. Do not give her more than one instruction at a time. After every command she runs, have her paste the output back to you so you can confirm it worked before moving forward.

**Do not skip steps. Do not assume steps succeeded unless she shows you the output.**

---

## About Elise

Elise runs **TRAITLY**, based in the Netherlands. Her business helps EU battery manufacturers get their Digital Battery Passports ready before the February 18, 2027 legal deadline. She licenses her Digital Workers from SOCIII Inc. (based in the US). SOCIII built the platform; Elise built the workers on top of it for her specific advisory practice.

She is familiar with business software and has worked with Claude before, but she has not used a Terminal or GitHub. Treat her as smart and capable — she just needs the technical steps explained in plain language.

---

## What She Has Already Built

Elise built five workers as part of the **EU Battery DPP Suite**. These are live right now on the platform at sociii.ai. Each worker has its own AI advisor (named Elara), its own canvas with multiple tabs, and real compliance data for her test client, Voltara BV.

**Worker 1 — DPP Compliance Auditor** (`eu-battery-dpp-001`)
Elara tracks all 90 mandatory battery passport attributes across 7 regulatory clusters. Shows each of Voltara's 6 battery products with a charge-bar showing how complete their compliance data is. Flags exactly which attributes are missing and why.

**Worker 2 — DPP Passport Builder** (`eu-passport-builder-001`)
Generates the actual Battery Passport in the format the EU Registry requires (JSON-LD, Annex XIII). Cluster 3 (Carbon Footprint) must be 100% before the passport can be exported — this is a hard rule enforced by the system, not just the UI.

**Worker 3 — DPP Supply Chain Tracer** (`eu-supply-chain-tracer-001`)
Manages the supplier network. Voltara has 4 suppliers: Zhenghe Celltech (China, verified), ShinPower Corp. (Korea, connected), Hanam Cell Corp. (Korea, invited but not yet submitted), and Rheinwerk GmbH (Germany, partially certified). When a supplier submits their data, it flows automatically to every product that uses their components.

**Worker 4 — DPP Registry Manager** (`eu-registry-manager-001`)
Handles submission to the EU DPP Central Registry (which opens July 19, 2026 — 6 days from now). Shows a live countdown, Voltara's submission queue, and allowlist application status. Currently in TEST MODE — no real submissions until the registry is live.

**Worker 5 — DPP Lifecycle Monitor** (`eu-lifecycle-monitor-001`)
Tracks live battery health data from deployed units. Shows State of Health (SoH) readings, cycle counts, and flags when batteries approach the 80% SoH repurposing threshold. For Voltara: Industrial and LMT lines are live via BMS, EV lines not yet connected.

**Her test workspace:** The "Voltara BV" demo workspace (`/demo/dpp` on the platform) is already seeded with real data for all 6 of Voltara's battery SKUs. This is what she'll show actual clients.

---

## What You Need to Help Her Set Up

The goal by the end of this session is for Elise to have:

1. A GitHub account (if she doesn't have one)
2. Her own fork of the SOCIII codebase on GitHub
3. A copy of that fork downloaded onto her computer
4. Claude Code running inside that folder

When all four are done, she switches to **Part 2** (the Terminal brief) and continues from there.

---

## Step-by-Step Setup (Walk Her Through These One at a Time)

**Before anything else:** Ask Elise to open her browser and her Terminal side by side on the same screen — browser on one half, Terminal on the other. She'll be going back and forth and needs to see both at once. On a Mac: hover the green ⬤ button on each window and choose "Tile Left" / "Tile Right."

---

**Step 1 — Open the Terminal.**
On Mac: Press `Cmd + Space`, type `Terminal`, press Enter.
On Windows: If she's on Windows, guide her through enabling WSL (Windows Subsystem for Linux) first — this is required. The steps after that are the same as Mac.

Have her paste what she sees (a prompt with a `$` or `%` at the end is correct).

---

**Step 2 — Check if Git is installed.**
Have her run:
```
git --version
```
If it returns a version number: good, move on. If she gets "command not found": on Mac, it will prompt to install Xcode Command Line Tools — have her click Install and wait for it to finish, then re-run.

---

**Step 3 — Set up Git with her name and email.**
Replace with her actual name and email:
```
git config --global user.name "Elise"
git config --global user.email "her@email.com"
```
No output = success.

---

**Step 4 — Create a GitHub account (if she doesn't have one).**
Go to github.com, click Sign Up, use her real email, create a username and password. Confirm her email address when GitHub sends the confirmation email.

If she already has GitHub: have her log in.

---

**Step 5 — Install Claude Code.**
Run:
```
npm install -g @anthropic-ai/claude-code
```
If `npm` is not found: she needs Node.js first. Have her go to nodejs.org, download the LTS version, install it, then run the command again.

After it installs, verify with:
```
claude --version
```
It should show a version number.

---

**Step 6 — Fork the SOCIII codebase on GitHub.**
Have her go to: `github.com/titleapp/titleapp-platform`
(She'll need to be logged into GitHub.)

Click **Fork** in the top right. On the next screen, click **Create fork**. This creates her own copy of the codebase under her GitHub account. The URL will look like: `github.com/HER-USERNAME/titleapp-platform`

---

**Step 7 — Download (clone) her fork.**
Replace `HER-USERNAME` with her actual GitHub username:
```
git clone https://github.com/HER-USERNAME/titleapp-platform.git
```
This downloads the code to her computer. Wait for it to finish (it may take a minute).

---

**Step 8 — Navigate into the folder.**
```
cd titleapp-platform
```

---

**Step 9 — Start Claude Code.**
```
claude
```
If it asks her to log in or authenticate: have her follow the prompts (it will open a browser tab). After logging in, come back to the Terminal.

When she sees a Claude Code prompt (it will look like a chat interface in the Terminal), she's done with Part 1.

---

## Handoff

Once Claude Code is running in the Terminal, Elise should paste **Part 2 — the Terminal Brief** directly into the Claude Code prompt. That document tells Claude Code who she is and what to help her build next.

---

## If Something Goes Wrong

**"command not found" for claude:** Close the Terminal completely, reopen it, and try `claude --version` again. If still missing, run: `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc` then open a new Terminal.

**"repository not found" when cloning:** She either hasn't forked yet (go back to Step 6) or the username in the URL is wrong. Check that the URL matches her actual GitHub username.

**Anything else:** Have her paste the exact error message and you'll debug from there. Do not guess; do not suggest workarounds you're not confident about. If you're unsure, say so.
