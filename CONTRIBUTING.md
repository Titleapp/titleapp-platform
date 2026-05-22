# Contributing to SOCIII

Thank you for your interest in the SOCIII platform.

This document outlines the contribution flow for code, documentation, and rule-set updates.

---

## Current Status

SOCIII is in active pre-launch development with sole-founder contribution (Sean Lee Combs). External contributions are not currently accepted as the platform stabilizes and the open-source licensing strategy is finalized.

When external contributions open (anticipated post-launch, mid-2026), this document will be updated with the full contribution flow.

---

## For Future External Contributors

### Code Contributions

1. **Fork the repository** at the org level (URL to be published when SOCIII Inc. open-source release is finalized).
2. **Create a branch** from `main` with a descriptive name (`feature/your-feature`, `fix/bug-description`).
3. **Develop and test locally** using Firebase emulators (`firebase emulators:start`). See `README.md` for setup.
4. **Submit a pull request** describing:
   - What the change does
   - Why the change is needed
   - How you tested it
5. **Code review** will be performed by SOCIII Inc. maintainers.
6. **Merge** occurs once review is complete and CI passes.

### Rule-Set Contributions (Tier 2 Vertical Baselines)

The platform's vertical baseline rule sets (real estate, aviation, automotive, securities, healthcare, etc.) are anticipated to be open-source contributions in the medium term. Domain experts in regulated industries will be invited to propose rule updates through a structured review process:

1. Open an Issue describing the rule update with citations to the underlying regulation
2. Submit a pull request modifying the appropriate rule definitions in `raas/<vertical>/<jurisdiction>/`
3. Rule updates are reviewed by SOCIII Inc. for safety and platform-invariant compatibility
4. Approved updates are versioned and published to the rule registry

### Documentation Contributions

Documentation improvements are welcomed once external contribution opens. Documentation lives in:
- `README.md` — project overview
- `CLAUDE.md` — architecture conventions
- `docs/specs/` — design specifications
- `docs/patents/` — IP family overview

---

## Code of Conduct

All contributors are expected to maintain professional, respectful interaction. Specifics will be published with the open-source release.

---

## Reporting Security Issues

Please report security vulnerabilities responsibly. Send details to security@sociii.ai (mailbox to be activated with brand cutover) or sean@titleapp.ai during the transition period. Do not file public Issues for security vulnerabilities.

---

## Contact

- Product or general questions: hello@titleapp.ai (transitioning to hello@sociii.ai)
- Engineering: alex@sociii.ai (brand account, monitored)
- Direct founder contact: sean@titleapp.ai

---

*Last updated: 2026-05-22. This document will be substantially expanded when external contributions open.*
