# North Star — Three Principles That Never Change

These three principles govern every build prompt, every feature, every line of code. If a feature violates any of these — it is a bug.

---

## 1. THE SPOTIFY MODEL — Worker opens first. Always.

No auth, no email, no form before the worker opens. Anonymous UID is enough to start. Lead captured softly after the worker opens. Checkout after the demo, never before.

**If any feature gates the worker before the user sees it — it violates this principle and must be fixed.**

---

## 2. THE THREE LAYERS — Account, Library, Store. Always in that order.

- **Account** is always accessible via the avatar in the top right.
- **Library** (My Stuff) is what the user owns and uses.
- **Store** is where they discover and purchase.

These three layers never collapse into each other. The store does not live inside the library. The account does not live inside the store.

---

## 3. THE SINGLE SOURCE OF TRUTH — One registry for everything.

Verticals are defined once. Worker slugs are defined once. Subscription status values are defined once.

**If the same concept is defined in more than one place — that is a bug, not a feature.**

The nightly sync enforces this automatically.

---

*Reference: [PLATFORM_ARCHITECTURE_v1.0.md](PLATFORM_ARCHITECTURE_v1.0.md)*
