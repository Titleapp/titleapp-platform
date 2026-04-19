TitleApp Engineering Protocol
v1.2 — Mandatory Pre-Flight + Batch Approval
Document
TitleApp Engineering Protocol v1.2
Location
docs/ENGINEERING_PROTOCOL.md in repo
Supersedes
v1.1 — April 2026
Changes in v1.2
Added: Mandatory pre-flight rule, batch issue approval, contributor escalation path
Red-teamed
Yes — incorporated before publication
Author
Sean Combs / TitleApp

WHAT CHANGED IN v1.2
v1.1 defined the multi-contributor model. v1.2 adds the behavioral rules that make it safe.

The pre-flight check became mandatory after Phase A1 of CODEX 49.1, where T1 caught a W-041 ID collision, a JSON format mismatch, and three other issues before touching any file. That behavior is now required for every contributor on every phase.

Batch approval replaces stop-and-report. Contributors compile all issues found in pre-flight and present them as a single list. One approval decision, not one per issue.

All v1.0 and v1.1 rules remain in force. Nothing was removed.

The Mandatory Pre-Flight Rule (NEW in v1.2)
THE RULE
Before touching any file in any phase, every contributor must run a pre-flight check.
This applies to Sean, Ruthie, Kent, contractors, and any future engineers.
There are no exceptions. Not even for obvious fixes. Not even for one-line changes.

The pre-flight that caught the W-041 collision in CODEX 49.1 Phase A1 is the model.
That behavior is now required, not optional.

What the pre-flight checks
ID collisions — does the ID I am about to create already exist?
Format mismatches — does the format in the CODEX match the actual file format?
Existing files — which files already exist that I will be modifying?
Pattern differences — does the CODEX spec match the pattern used in the real codebase?
Dependency conflicts — does anything I am adding collide with something already live?

How it works in practice
Step 1: Read the full phase instructions before doing anything.
Step 2: Run research commands (grep, find, read) to check for the five issue types above.
Step 3: Compile all issues found into a single list.
Step 4: If issues found — present the batch list and wait for approval.
Step 5: If no issues found — state that clearly and proceed.
Step 6: Never proceed past pre-flight without either a clean bill of health or explicit approval on each batched issue.

Batch approval — not stop-and-report
The old pattern was: find an issue, stop, report to Sean, wait, continue, find another issue, stop again. That pattern is replaced.
The new pattern: find all issues in one pass, compile them into a numbered list, present once, get one approval decision. Sean approves all, rejects all, or decides per item. Then execution begins.
Example of correct batch reporting:
// Pre-flight found 3 issues before starting:
// 1. W-041 already exists as Vendor & Contract Management.
//    Recommend using PLAT-005 instead.
// 2. capabilities.json uses JSON format, not YAML.
//    Will convert to match existing format.
// 3. CanvasComponentMap uses static imports, not dynamic.
//    Will follow existing pattern.
// Awaiting approval to proceed with these resolutions.

Escalation path
If something unexpected happens during execution (not pre-flight), the contributor stops and reports to the Claude.ai chat — not to Sean directly.
The Claude.ai chat is the coordination layer. It decides if the issue can be resolved without Sean or if Sean needs to be pulled in. Sean is a last resort, not a first call.
If Claude.ai cannot resolve it either, then and only then does Sean get notified. This protects Sean's time and keeps the contributor unblocked for other work while waiting.

GitHub Branch Protection — Gate Before Contributors Start (NEW in v1.2)
No contributor gets repo access until GitHub branch protection is confirmed active on main.
Required settings on the main branch:
Require pull request before merging
Require at least 1 approval
Dismiss stale reviews when new commits pushed
Require status checks to pass
Do not allow bypassing — including admins

This is a one-time setup in GitHub Settings → Branches → Branch protection rules. Until it is done, the contributor model in v1.1 cannot safely be activated.

Parts 1 through 9 — Unchanged from v1.1
Working model, branch discipline, contributor setup, bus protocol, SDK path, 24-hour coverage model, mechanical gates, codebase audit, and limits sections are all unchanged.
See Engineering Protocol v1.1 for full content of those sections.

Summary of All Version Changes
Version
Date
What changed
v1.0
April 2026
Working model, 5 mechanical gates, codebase audit checklist, limits section
v1.1
April 2026
Branch discipline, contributor setup, bus protocol, SDK path, 24-hour coverage model
v1.2
April 2026
Mandatory pre-flight rule, batch issue approval, escalation path, GitHub branch protection gate