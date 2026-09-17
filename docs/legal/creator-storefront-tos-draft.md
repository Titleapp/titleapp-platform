# Draft: Strengthened Indemnification + Creator Storefront Terms

**Status: DRAFT for attorney review. Not legal advice. Do not publish to `public/terms.html` until counsel has reviewed and approved this language.** Written to match the existing ToS's structure and tone (`public/terms.html`, last updated 2026-02-14) and to operationalize the decisions in CODEX 93 (`docs/codex/93-worker-bundle-app-taxonomy-and-creator-publishing-boundary.md`), specifically #7 (indemnification), #8 (discretionary suspension), and #4 (disclosure requirements).

The current §10 Indemnification is one generic sentence ("arising from your use of the service or violation of these Terms") and has no creator-specific language at all — no mention of creators, third-party content, or the revenue-share/storefront relationship. This draft strengthens §10 and adds a new section for creator storefronts specifically.

---

## Replacement for existing §10 (Indemnification) — strengthened, not creator-specific

> **10. Indemnification**
>
> You agree to indemnify, defend, and hold harmless SOCIII, Inc., its officers, directors, employees, contractors, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with: (a) your access to or use of the Service; (b) your violation of these Terms; (c) your violation of any applicable law or the rights of any third party; (d) any content, information, or advice you submit, post, or make available through the Service; and (e), if applicable, your operation of a Creator Storefront as described in Section [X] below. This obligation survives termination of your account and these Terms.

*Change from current language:* adds "defend" (not just indemnify/hold harmless — this obligates the indemnifying party to actually handle the defense, not just cover costs after the fact, which is meaningfully stronger); explicitly extends to third-party rights violations, not just ToS violations; names officers/directors/employees/contractors/agents rather than just the corporate entity; states survival past termination. This is the "most teeth" version of a standard SaaS indemnification clause — counsel should confirm it isn't overreaching for the jurisdictions SOCIII actually operates in.

---

## New section: Creator Storefronts

> **[X]. Creator Storefronts**
>
> **Eligibility and Role.** SOCIII may permit certain users ("Creators") to publish their own AI worker under their own name or brand through SOCIII's platform ("Creator Storefront"). A Creator Storefront operates on SOCIII's infrastructure but is authored, operated, and controlled by the Creator, not by SOCIII. SOCIII provides the platform; the Creator is solely responsible for the content, advice, and conduct of their Creator Storefront.
>
> **Creator's Sole Responsibility for Content.** The Creator is solely and exclusively responsible for all content generated, transmitted, or made available through their Creator Storefront, including but not limited to any medical, legal, financial, or other professional or quasi-professional advice or information. SOCIII does not review, endorse, verify, or vouch for the accuracy, safety, legality, or appropriateness of any Creator Storefront's content. **SOCIII's review, if any, is limited to the technical scope of what a Creator Storefront is permitted to do on SOCIII's systems (which capabilities it may invoke) and does not extend to the correctness or safety of what the Creator Storefront says.**
>
> **Required Disclosures.** Every Creator Storefront must, at all times: (a) clearly and conspicuously disclose to end users that they are interacting with an AI system and not a human professional, unless and to the extent a human is actually and verifiably in the loop; and (b) make the Creator's own identity and relevant credentials immediately visible to the end user before or at the point of engagement, not require the user to search for them. SOCIII may require additional or more prominent disclosures for any Creator Storefront whose content SOCIII's systems flag as touching medical, legal, financial, or similarly regulated subject matter.
>
> **Creator Indemnification.** In addition to Section 10 above, the Creator specifically agrees to indemnify, defend, and hold harmless SOCIII from any claim arising from: (a) the substance, accuracy, or safety of any advice or content provided through the Creator's Storefront; (b) any claim that the Creator is not licensed, qualified, or authorized to provide the advice or services their Storefront offers; (c) any claim that the Creator's name, brand, or credentials as displayed are false, misleading, or infringe a third party's rights; and (d) any regulatory action or investigation arising from the Creator's Storefront's content or conduct.
>
> **Suspension.** SOCIII may suspend, restrict, or remove a Creator Storefront at any time, with or without notice, for a violation of these Terms **or for any other reason SOCIII determines, in its sole discretion, to be appropriate.** SOCIII is under no obligation to provide advance notice, a hearing, or an appeal process before suspending a Creator Storefront, though SOCIII may choose to do so. This right exists independent of, and in addition to, SOCIII's general termination rights under Section 7.
>
> **Revenue Share and Native Applications.** Creator Storefronts operating through SOCIII's platform (web-based) are subject to SOCIII's then-current revenue-share terms, provided separately. **If a Creator elects to publish their own native mobile application (through Apple's App Store, Google Play, or similar) based on or derived from their Creator Storefront, SOCIII's role ends at that point of publication.** SOCIII does not operate, maintain, receive revenue from, or bear responsibility for any such independently-published native application, and this Agreement's Creator Storefront-specific provisions (including the disclosure and indemnification obligations above, to the extent they depend on SOCIII's operation of the underlying platform) do not extend to that independent application once published. The Creator's use of any SOCIII-provided starter code or technical materials to build such an application remains subject to Section 4 (User Content and Ownership) and does not grant the Creator rights to SOCIII's underlying platform, rules engine, or other users' data.

---

## Notes for the actual drafting conversation with counsel

1. **"Defend" is a meaningfully different (stronger) obligation than "indemnify and hold harmless" alone** — it means the Creator's insurer/counsel actually steps in to handle the litigation, not just reimburse SOCIII afterward. Counsel should confirm SOCIII actually wants this from creators who, realistically, may have no ability to fund a real defense — an indemnification clause with no one able to pay it may not be worth much practically. Worth discussing whether some minimum insurance or bonding requirement for creators touching regulated content should pair with this.
2. **The suspension language deliberately provides zero due-process obligation** (no notice, no hearing, no appeal) per Sean's explicit direction. Confirm this is enforceable as written in every jurisdiction where Creators are expected to be located, not just the jurisdiction named in §11 (Governing Law).
3. **The native-app "SOCIII's role ends" language is new and untested** — this is the first time this platform's ToS would describe a scenario where SOCIII actively disclaims responsibility for something built with its own starter materials. Counsel should sanity-check that disclaiming responsibility this cleanly is actually effective, especially if a dispute arises about whether the "independent application" is meaningfully different from SOCIII's own platform in the eyes of an end user who doesn't know or care about the corporate structure behind it.
4. **This draft does not attempt to resolve CODEX 93's Open Decision #10** (EU data controller/processor determination) — that's a separate, deferred question and shouldn't be assumed solved by anything in this draft.
