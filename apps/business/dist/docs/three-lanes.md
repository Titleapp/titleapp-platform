# The three lanes

Not every Digital Worker on SOCIII goes into the same marketplace. The platform separates workers into three lanes — each with different distribution, review, and revenue posture. You pick the lane for your worker in your `catalog.json`.

## The lanes

### Lane 1 — Open Apache fork

**For:** Hackers, students, indie devs. People who want to build for fun or for portfolio.

**What you get:**
- Your worker lives in the open-source repo
- Forkable by anyone under Apache 2.0
- Listed in the open registry (sociii.ai/open) but **not** in the curated Marketplace
- No revenue split — no money flows
- No SOCIII brand association

**What's required:**
- Worker structurally valid (passes QA-001 v1 structural family)
- README + license

**Review:** Automated PR review only. No human gate. **No quality control by SOCIII** beyond the structural check.

### Lane 2 — Marketplace 75/25

**For:** Domain experts who want to earn from their worker. The default lane.

**What you get:**
- Listed in the curated SOCIII Marketplace at sociii.ai/marketplace
- Full SOCIII brand association
- Subscription billing handled by the platform
- **75% of net revenue paid monthly** ([see Earnings →](/docs/earnings))
- Public Creator Profile at sociii.ai/c/&lt;your-handle&gt;
- Forge Reviews subscription on day 1 ([see Review cycle →](/docs/review-cycle))

**What's required:**
- Complete Intent Spec with assertions
- QA-001 passes (Structural + Behavioral + Edge-case)
- Pricing set in catalog
- Creator Agreement signed

**Review:** Tiered — automated AI reviewer (70%) + peer review (20%) + founder review (10% sample). Most PRs merge automatically; flagged PRs go to peer/founder.

### Lane 3 — Experimental

**For:** Workers that aren't ready for primetime but the creator wants real-world feedback. Or workers in regulated spaces where SOCIII isn't yet ready to fully attest.

**What you get:**
- Listed in the Marketplace but **tagged "Experimental"**
- Marketing push: none (no SOCIII promotion)
- Subscription billing handled by the platform
- Reduced revenue split OR no marketing push (specific terms TBD per worker)
- "Experimental" disclosure visible to every customer

**What's required:**
- Intent Spec with assertions
- Structural QA-001 passes
- Experimental Disclosure acknowledged

**Review:** Automated AI reviewer only. **No human review.** Lower bar to ship, higher disclosure burden.

## Picking your lane

Decision tree:

1. **Are you doing this for fun / portfolio, not money?** → Lane 1 (Open Apache).
2. **Are you ready for QA-001 + Creator Agreement + the marketplace bar?** → Lane 2 (Marketplace).
3. **Do you want real-world feedback faster than Marketplace-grade review allows?** → Lane 3 (Experimental).

You can move between lanes. A creator starting in Lane 3 (Experimental) can graduate to Lane 2 (Marketplace) when QA-001 assertions are strong + review is clean. A Lane 2 worker that fails review can downgrade to Lane 3 while the creator iterates.

You **cannot** move from Lane 1 (Open) to Lane 2 (Marketplace) without re-authoring under Creator Agreement.

## Why three lanes (not one)

The radical-developer-vs-quality tension. If we required Marketplace-grade quality for every worker on day 1, we'd have no early adopters. If we let everything in the Marketplace, customers can't trust it.

Three lanes solve it:
- Lane 1 fuels developer enthusiasm (the NanoClaw equivalent)
- Lane 2 protects the customer trust signal
- Lane 3 buffers the gap — workers that are real but not yet trustworthy at scale

The QC isn't the gate; **marketplace access is**.

## What customers see

In the SOCIII app sidebar:
- **Marketplace** — Lane 2 workers only. Curated. Quality bar.
- **Marketplace → Experimental** — Lane 3 workers with disclosure
- **Open** — Lane 1 workers, separate surface, opt-in to browse

Most users only ever see Marketplace. Power users explore Experimental and Open.

## What comes next

**[→ Earnings & payouts](/docs/earnings)** — the 75/25 split, monthly cycle, refunds
**[→ Creator Agreement](/docs/creator-agreement)** — what Lane 2 requires you to sign
**[→ Review cycle](/docs/review-cycle)** — Forge Reviews, peer review, founder review
