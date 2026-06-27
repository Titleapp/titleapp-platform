# Ruthie — Keep Your Fork Updated (Terminal / Claude Code instructions)

**Hand this whole file to your Claude Code in the terminal.** It will run the steps for you.
Your fork: `ruthie-lgtm/titleapp-platform` · Upstream (the live platform): `Titleapp/titleapp-platform`

> Plain-English version of what this does: your copy of the platform ("your fork") drifts out of date as Sean's team ships new code to the main project ("upstream"). These steps pull the newest code into your copy so you're building on current code, not a stale snapshot.

---

## A. One-time setup (only the first time, on this computer)

```bash
# Go to your local clone (adjust the path if yours is elsewhere)
cd ~/titleapp-platform

# Point at the live platform as "upstream" (one time only)
git remote add upstream https://github.com/Titleapp/titleapp-platform.git

# Confirm you now have BOTH remotes:
#   origin   = your fork (ruthie-lgtm/titleapp-platform)
#   upstream = the live platform (Titleapp/titleapp-platform)
git remote -v
```

If you do NOT have a local clone yet, do this once instead of the above:
```bash
cd ~
gh repo clone ruthie-lgtm/titleapp-platform
cd titleapp-platform
git remote add upstream https://github.com/Titleapp/titleapp-platform.git
```

---

## B. Update the fork (run this at the START of every work session)

```bash
cd ~/titleapp-platform

# 1. Save any work-in-progress so nothing is lost (safe even if there's nothing to save)
git stash

# 2. Get the latest from the live platform
git fetch upstream

# 3. Move onto your main branch and fast-forward it to match upstream
git checkout main
git merge --ff-only upstream/main

# 4. Push the freshened main up to YOUR fork on GitHub
git push origin main

# 5. Bring your work-in-progress back (only does something if step 1 saved anything)
git stash pop || true
```

That's it — you're now on current platform code.

**Even simpler (no local clone needed):** update the fork on GitHub directly:
```bash
gh repo sync ruthie-lgtm/titleapp-platform --branch main
```
…or open your fork in the browser and click **"Sync fork" → "Update branch."**

---

## C. Do YOUR nursing work on a branch (so updating stays painless)

Build on a branch, not directly on `main`. Then `main` always fast-forwards cleanly when you update.

```bash
# Make (or switch to) your working branch
git checkout -b nursing-lms      # first time
# git checkout nursing-lms       # after that

# ...do your work, then commit it...
git add -A
git commit -m "describe what you changed"
git push origin nursing-lms
```

When you want the latest platform code *on top of* your work:
```bash
git fetch upstream
git rebase upstream/main          # replays your nursing-lms commits on top of the newest platform code
git push --force-with-lease origin nursing-lms
```

---

## D. Sanity checks (ask Code to run these any time)

```bash
# How far behind upstream am I? (0 behind = fully current)
git fetch upstream
git rev-list --count main..upstream/main   # commits on upstream that you don't have yet → want 0

# What branch am I on right now?
git branch --show-current

# Did anything I forgot to commit get left behind?
git status
```

---

## E. If something looks scary

- **"merge conflict" or `--ff-only` refuses:** you committed something directly on `main`. Don't force it — tell Sean, or move your commits to a branch first (`git branch nursing-lms` then `git reset --hard upstream/main` on main). When unsure, **stop and ask** rather than `git push --force` on `main`.
- **Lost work after `git stash`:** run `git stash list` then `git stash pop` — it's still there.
- **Anything else:** paste the exact terminal output to your Claude Code and ask it to explain before you run the next command.

---

## Why staying current matters here

The platform ships fast. Recent additions you'll want under your nursing build: the **data-driven canvas renderer** (worker specs actually draw real UI), the **staff-credentials roster card** (a good model for a competency/roster card), **per-worker chat grounding** (anti-fabrication), and the **learning-record substrate** (`docs/learning-record-substrate.md`). After updating, also read `docs/NURSING-LMS-BRIEF.md` — that's your build direction.
