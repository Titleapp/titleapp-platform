> **Version 1.1 — effective 2026-05-31.** This is the click-through Creator Agreement for SOCIII's Marketplace tier (75/25 split, no equity, no @sociii.ai mailbox). Fellow tier advisors use the separate `advisor.md` Agreement. Cofounder relationships use a bespoke Cofounder Advisor Agreement. Material amendments are announced per Section 18(b) with at least thirty (30) days' notice.

## SOCIII Marketplace Creator Agreement

This Marketplace Creator Agreement (this "Agreement") governs your participation as a Creator on the SOCIII Digital Worker marketplace operated by SOCIII, Inc., a Delaware corporation with its principal place of business at 1810 E Sahara Avenue, Suite 75942, Las Vegas, NV 89104 (the "Company," "SOCIII," "we," "us," or "our"). The individual or entity accepting this Agreement is the "Creator" or "you."

This Agreement is accepted electronically by clicking "I Agree" or an equivalent affirmative action during your Creator onboarding flow. Your acceptance is captured with a timestamp, your IP address, the user agent string of the device you used, and the specific version of this Agreement you accepted. That capture record is the binding evidence of your assent.

By accepting this Agreement, you also confirm that (i) you have completed identity verification through the platform's identity verification provider (currently Stripe Identity); (ii) the legal name and contact information associated with your verified identity are accurate; (iii) you are at least eighteen (18) years of age; and (iv) you have the authority to enter into this Agreement on your own behalf or on behalf of the entity you represent.

## 1. What This Agreement Covers

(a) **Marketplace Tier.** This Agreement applies to Creators publishing Digital Workers to the SOCIII marketplace at app.sociii.ai (the "Marketplace") under SOCIII's standard 75% creator / 25% platform revenue split (the "Marketplace Tier"). Economic detail — including worked examples, payout cadence, and how SOCIII handles tax forms — is described in the document maintained at `docs/CREATOR-EARNINGS.md` (the "Earnings Document"), which is incorporated by reference. In the event of any conflict between the Earnings Document and this Agreement, this Agreement controls.

(b) **Other Tiers.** This Agreement does NOT apply to:
- **Open-Fork creators** who use the SOCIII open-source SDK (Apache 2.0) without listing on the Marketplace — no Agreement is required, but Apache 2.0 license terms govern code use;
- **Fellow tier advisors** — separate Advisor Agreement applies (with equity grant + warrants);
- **Enterprise self-host** — separate Enterprise License Agreement applies (negotiated case-by-case).

(c) **Effective Date.** This Agreement becomes effective on the date you accept it electronically (the "Effective Date") and continues until terminated in accordance with Section 8.

## 2. Definitions

For purposes of this Agreement:

(a) **"Worker"** means a Digital Worker authored by you and listed on the Marketplace under your Creator profile, including all configuration files, code, prompts, ruleset bindings, sample data, evaluation assertions, and other artifacts that together define how the Worker behaves.

(b) **"Customer"** means any individual or entity that subscribes to, pays for, or uses your Worker through the Marketplace.

(c) **"Gross Customer Revenue"** means the gross amounts paid by Customers for your Worker, including subscription fees, per-use fees, per-event data fees, and other charges originated through the Marketplace, before any deductions.

(d) **"Net Revenue"** means Gross Customer Revenue minus, in this order: (i) **Payment Processor Fees** (Stripe's then-standard rates, currently approximately 2.9% + $0.30 per transaction, plus international card surcharges and dispute fees, passed through at cost); (ii) **Refunds and Chargebacks** (any amounts refunded to a Customer or charged back by a Customer's card issuer, including any associated fees imposed by the payment processor); (iii) **Sales Tax / VAT** (any sales tax, value-added tax, or similar transactional tax SOCIII is required to collect and remit on Gross Customer Revenue, which is removed from the calculation before the revenue split); (iv) **Third-Party API Costs** (any cost incurred by your Worker's calls to third-party services on behalf of a Customer — for example Apollo, ATTOM, First American, OpenAI direct calls, or other paid third-party services — netted out at cost or at the markup you have configured in your Worker's pricing definition).

(e) **"Creator Share"** means seventy-five percent (75%) of Net Revenue.

(f) **"Platform Share"** means twenty-five percent (25%) of Net Revenue.

(g) **"Worker Brand Assets"** means: the Worker's name, the Worker's logo (if any), the Worker's tagline (if any), the Worker's public-facing description text, the Worker's domain expertise positioning, and any Worker-specific URLs, social handles, or content archives that you create and that are not Marks of SOCIII.

(h) **"Marketplace Origination"** means any Customer who first became aware of your Worker through the Marketplace itself (Marketplace browsing, Marketplace search, Marketplace-featured placement, Marketplace customer emails, Marketplace promotional channels, or SOCIII-driven content marketing referencing your Worker). A Customer that you already had a documented relationship with prior to publishing your Worker on the Marketplace is NOT a Marketplace Origination, provided you can substantiate the pre-existing relationship.

## 3. Marketplace Tier Economics

(a) **Revenue Split.** For each Customer subscription, per-use payment, or other billable event originated through the Marketplace, you are entitled to the Creator Share (75% of Net Revenue) and SOCIII is entitled to the Platform Share (25% of Net Revenue).

(b) **Worked Example.** A Customer pays $99 for one month of your Worker. Stripe charges approximately $3.17 in payment processing fees. No refund or third-party API cost is incurred. Net Revenue is $95.83. Your Creator Share is $71.87 (75% × $95.83). SOCIII's Platform Share is $23.96 (25% × $95.83).

(c) **Payout Cadence and Threshold.** Payouts are made monthly on or about the fifth (5th) day of the calendar month for the previous calendar month's earnings. The minimum payout threshold is twenty-five dollars ($25); amounts below the threshold accrue to the following month. Payouts are made by ACH (US Creators) or international wire (non-US Creators) to the payout method you configure in your Creator dashboard.

(d) **Tax Forms.** SOCIII will issue an IRS Form 1099-NEC for each US Creator whose annual payouts exceed $600 in any calendar year. SOCIII does not withhold tax. You are solely responsible for income tax, self-employment tax, and any other tax obligations on your earnings. Non-US Creators are solely responsible for tax obligations in their jurisdictions; SOCIII provides annual earnings statements but does not withhold.

(e) **Right to Audit.** You may, with at least thirty (30) days' prior written notice and no more often than once per twelve (12) month period, audit the calculation of Net Revenue for your Worker for the prior twelve-month period through a mutually agreeable third-party auditor at your expense. If the audit shows an underpayment by SOCIII of more than five percent (5%) of the audited period's Creator Share, SOCIII shall reimburse your reasonable audit costs and pay the underpayment within thirty (30) days.

## 4. Customer Ownership and Data

(a) **Platform-of-Record.** SOCIII is the platform-of-record for the Customer relationship. The Customer's account, payment relationship, and account-level data reside with SOCIII. You do NOT acquire ownership of the Customer relationship by virtue of authoring the Worker the Customer subscribes to.

(b) **Your Access.** SOCIII will provide you with reasonable access to Customer interaction data necessary for you to operate and improve your Worker, including: aggregated usage metrics, anonymized interaction logs (where the Customer's identity is masked), and direct Customer feedback submitted through Marketplace channels. You may also receive Customer-identifying contact information where the Customer has affirmatively consented to such disclosure through the Marketplace UI.

(c) **What You May Not Do.** You may not, without the Customer's express prior consent through a SOCIII-controlled UI: (i) extract, export, or download SOCIII's Customer list or Customer-identifying data; (ii) directly contact Customers outside of SOCIII-provided communication channels (in-Marketplace messaging, SOCIII-mediated email); (iii) solicit Customers to move their business off the Marketplace; (iv) use Customer data for any purpose other than operating your Worker through the Marketplace. The Non-Circumvention restriction in Section 5 reinforces this.

(d) **Customer Communication.** Communications between you and a Customer about your Worker should flow through SOCIII-provided channels. If a Customer initiates direct contact with you outside the platform (for example, by emailing you on social media), you may respond, but you may not use that direct channel to solicit, negotiate, or process payment for services that displace the Marketplace.

(e) **Data Retention.** Upon termination of this Agreement, SOCIII may retain Customer interaction data for the purposes of: (i) maintaining the historical record required for audit and compliance; (ii) handling customer support inquiries about past use of your Worker; (iii) supporting the Customer's continuity if your Worker is migrated to a substitute Worker. Customer-identifying data will be handled in accordance with SOCIII's then-current Privacy Policy.

## 5. Non-Circumvention

(a) **Restriction.** For twelve (12) months following the termination of this Agreement, you shall not (and shall not assist or encourage any third party to): (i) provide, sell, license, or otherwise offer a substantially similar Digital Worker or service to any Marketplace-Originated Customer outside the Marketplace; (ii) attempt to convince any Marketplace-Originated Customer to move their existing engagement with your Worker off the Marketplace; (iii) use any Customer-identifying information obtained through the Marketplace to solicit Marketplace-Originated Customers for off-Marketplace business.

(b) **Pre-Existing Relationships Carveout.** This Section 5 does NOT restrict you from continuing or expanding a documented commercial relationship with a Customer that existed prior to your acceptance of this Agreement, provided that you can substantiate the relationship through written records dated before your Effective Date. The burden of substantiation is on you. SOCIII will, in good faith and with reasonable inquiry, accept clear pre-Marketplace records.

(c) **What This Does NOT Restrict.** Section 5 does NOT prevent you from: (i) operating any other unrelated business; (ii) authoring other Digital Workers on the Marketplace or elsewhere; (iii) using the SOCIII open-source SDK to build workers you run on your own infrastructure for non-Marketplace-Originated customers; (iv) participating in any unrelated industry, profession, or marketplace; (v) competing with SOCIII on the merits of distinct services for distinct customer relationships.

(d) **Enforcement.** A violation of this Section 5 entitles SOCIII to: (i) injunctive relief without bond; (ii) disgorgement of profits earned in violation; (iii) liquidated damages equal to twelve (12) months of the Platform Share that would have been earned on the diverted Customer's projected revenue (calculated based on the trailing twelve-month average of the Customer's spend); (iv) recovery of reasonable attorneys' fees.

## 6. Creator's Relationship to SOCIII

(a) **Independent Contractor — Not an Employee.** You are an independent contractor. You are NOT, and shall not be construed to be, an employee, partner, joint venturer, agent, fiduciary, representative, or affiliate of SOCIII. Nothing in this Agreement creates an employment, partnership, joint-venture, or agency relationship between you and SOCIII. You acknowledge that SOCIII does not provide you with employee benefits, health insurance, retirement plans, paid time off, workers' compensation, unemployment insurance, or any other employee benefit (except as required by applicable law).

(b) **No Authority to Bind SOCIII.** You have no authority to: (i) enter into contracts on behalf of SOCIII; (ii) represent yourself as authorized to speak for SOCIII to any third party; (iii) negotiate terms or commitments that bind SOCIII; (iv) hold yourself out as an officer, director, employee, agent, or representative of SOCIII. Any communication or agreement you make purporting to bind SOCIII in violation of this Section is void and unenforceable as against SOCIII, and you indemnify SOCIII for any resulting third-party claim.

(c) **Control of Means and Methods.** You control the means, methods, location, schedule, and manner in which you author your Worker. SOCIII does not direct your work product; SOCIII reviews and approves your Worker against the published Worker DoD (definition-of-done) and the SOCIII Platform Worker Standards before it is listed in the Marketplace.

(d) **Multiple Engagements.** You may work for other companies, build products on other platforms, and engage with competitors of SOCIII. Nothing in this Agreement requires exclusivity. You acknowledge, however, that confidentiality, IP assignment, Non-Circumvention, and brand restrictions in this Agreement survive your engagement with such third parties.

(e) **Public Conduct.** You shall not, in your public conduct, engage in: (i) representations that you are authorized to bind, speak for, or represent SOCIII or its principals in any capacity beyond your Marketplace listing; (ii) public statements or content that promotes violence against any group, incites unlawful action, or constitutes harassment of identifiable individuals; (iii) public statements that materially misrepresent SOCIII's product, finances, personnel, or strategy; (iv) public conduct that constitutes a crime, regulatory violation, or breach of professional licensing obligations material to your Worker's domain.

SOCIII may suspend or remove your Worker and terminate this Agreement based on conduct described in this Section 6(e). Where SOCIII reasonably determines the conduct is curable and is not a category that requires immediate action (for example, fraud, illegal activity, or imminent reputational harm), SOCIII will, where practicable, provide you with written notice describing the conduct and a reasonable opportunity (typically not more than fifteen (15) days) to cure or respond before taking action. SOCIII retains the right to suspend immediately and seek a written response in parallel where the conduct is of a type that would, in SOCIII's reasonable judgment, cause significant harm if not addressed promptly. Disagreement with SOCIII's product, leadership, or business decisions, expressed in ordinary good-faith terms, does not by itself constitute conduct under this Section 6(e).

## 7. Brand Use Restrictions

(a) **Permitted Representations.** You may publicly represent yourself as:
- "A Creator on SOCIII";
- "Building on the SOCIII platform";
- The author or maintainer of your specific Worker, by its Marketplace-listed name;
- A participant in the SOCIII open-source community (if you have contributed to public code).

(b) **Prohibited Representations.** You shall NOT publicly represent yourself as, and shall NOT permit any third party to represent you as:
- "A SOCIII employee," "SOCIII team member," "SOCIII staff," or any equivalent suggesting employment;
- "Affiliated with SOCIII" or "partnered with SOCIII" beyond your Marketplace listing;
- "Endorsed by SOCIII" or "endorsed by Sean Combs" beyond what SOCIII has expressly published;
- An officer, director, advisor, or fiduciary of SOCIII;
- The owner, operator, or controller of the SOCIII brand, mark, logo, or domain;
- Authorized to speak for SOCIII on any policy, roadmap, financial, or legal matter.

(c) **Use of SOCIII Marks.** You may use the SOCIII name and logo (the "Marks") solely to identify your Worker as listed on the Marketplace and only in the form provided in the SOCIII Brand Kit. You may not modify, distort, recolor, or rearrange the Marks. SOCIII grants you a limited, revocable, non-exclusive, non-transferable license to use the Marks solely for this purpose; this license terminates immediately upon termination of this Agreement. No SOCIII goodwill accrues to you from such use.

(d) **Email Address.** Marketplace Tier Creators do NOT receive an `@sociii.ai` email address. You use your own email address. Email addresses at `@sociii.ai` are reserved for SOCIII employees, independent contractors retained for SOCIII operations, and Fellow tier advisors.

(e) **SOCIII Anthropic Team Seat.** Marketplace Tier Creators do NOT receive a sponsored seat on the SOCIII Anthropic Team plan. You are expected to maintain your own Anthropic Claude subscription (or equivalent AI tooling subscription) and bear that cost as part of your independent business operations. Sponsored Team seats are reserved for SOCIII employees, contractors, and Fellow tier advisors.

(f) **Future Brand Changes.** SOCIII may update the SOCIII Brand Kit at any time with reasonable notice. You will conform your use of the Marks to the updated Brand Kit within thirty (30) days of notice.

## 8. Suspension, Removal, and Termination

(a) **SOCIII's Right to Suspend or Remove.** SOCIII may, at its discretion and subject to Section 6(e) where applicable, suspend or remove your Worker from the Marketplace, suspend or terminate your Creator account, withhold pending payouts pending investigation, or take other commercially reasonable action, at any time, for any of the following reasons: (i) any breach or suspected breach of this Agreement, the Worker Content Requirements, or the SOCIII Content Policy; (ii) any violation of applicable law; (iii) any claim of intellectual property infringement that SOCIII determines is colorable; (iv) reputational damage to SOCIII caused by your Worker, your Creator conduct, or your public statements (subject to Section 6(e)); (v) prolonged inactivity (no Worker updates or customer engagement for a sustained period); (vi) negative aggregate customer feedback or repeated quality issues; (vii) failure to maintain required identity verification; (viii) third-party action by an AI provider, payment processor, or other essential service that, in SOCIII's reasonable judgment, makes operation of your Worker on the Marketplace impracticable (see Section 9); (ix) reasons that in SOCIII's good-faith judgment make continuation of the relationship inconsistent with the platform's interests and values.

(b) **Effect of Suspension, Removal, or Termination.** Upon suspension, removal, or termination:
- **Earned but unpaid revenue.** You remain entitled to revenue earned but unpaid through the effective date, paid on the next normal payout cycle in accordance with Section 3, subject to any offsets for chargebacks, refunds, or indemnification claims.
- **Active customer subscriptions.** SOCIII may, at its discretion, (i) wind down active subscriptions at the end of the current billing period; (ii) refund customers pro-rata for the unused portion of the billing period; (iii) migrate active subscriptions to a substitute Worker if available, with customer consent.
- **Apache 2.0 worker code.** Your Worker code that has been merged into the public SOCIII open-source repository remains there under Apache 2.0 license. You retain the right to fork and run that code on your own infrastructure or any other platform. SOCIII retains the right to maintain the code in its repository for continuity, documentation, or rollback purposes.
- **Worker portable artifacts.** Within thirty (30) days following termination, upon your written request, SOCIII will provide you with a portable export of: (i) your Worker's configuration files (canvas-tabs, ruleset bindings, sample-data, assertions); (ii) any Worker-specific prompts you authored that are not part of SOCIII's platform-wide RAAS rule library; (iii) any Worker-specific template content you authored. The export will be in commonly readable formats (JSON, Markdown, text). It does NOT include: SOCIII's platform-wide rule library, platform infrastructure code, audit-trail records, Customer-identifying data, or other Customer-side data.
- **Creator profile.** Your public Creator profile is removed from the Marketplace. Historical Customer reviews of your Worker may be retained for audit purposes.

(c) **Your Right to Terminate.** You may terminate this Agreement and remove your Worker from the Marketplace at any time by submitting a termination request through your Creator dashboard. Termination by you becomes effective at the end of the current monthly billing cycle. Active customer subscriptions wind down at end-of-period (or are refunded pro-rata, at SOCIII's discretion).

(d) **No Cause Required for Non-6(e) Reasons.** SOCIII may exercise its rights under Section 8(a) without prior notice and without articulating a specific cause for reasons (i), (ii), (iii), (v), (vi), (vii), and (viii). SOCIII commits as a matter of policy (not legal obligation) to provide written notice and a brief explanation when reasonably possible, but is not contractually obligated to do so for these categories. Reasons (iv) and (ix), to the extent based on conduct, are subject to the notice and cure provisions of Section 6(e) where applicable.

(e) **Survival.** Sections 2 (Definitions), 5 (Non-Circumvention, for its stated period), 6 (Creator's Relationship to SOCIII, the disclaimer parts), 7(b)-(c) (Brand Restrictions surviving), 9 (AI Provider Dependency), 10 (Worker Brand Ownership), 12 (Indemnification), 13 (Intellectual Property), 14 (Confidentiality), 15 (Creator Death or Incapacity), 16 (Limitation of Liability), 17 (Dispute Resolution), 18 (Miscellaneous, including governing law), and any other provisions that by their nature should survive, shall survive any termination or expiration of this Agreement.

## 9. AI Provider Dependency

(a) **Dependency Acknowledgment.** You acknowledge that the SOCIII Marketplace and your Worker depend on third-party services that are not controlled by SOCIII, including without limitation: AI inference providers (such as Anthropic, OpenAI, and Google); payment processors (such as Stripe); cloud infrastructure providers (such as Google Cloud and Firebase); identity verification providers (such as Stripe Identity); audit anchoring providers (such as Crossmint); communication providers (such as SendGrid and Twilio); and others as listed from time to time in SOCIII's published infrastructure documentation (each, a "Third-Party Provider").

(b) **SOCIII Is Not Responsible for Third-Party Provider Decisions.** SOCIII is not liable for, and you bear sole risk of, any decision, action, or inaction by a Third-Party Provider that affects your Worker, including without limitation: (i) a Third-Party Provider's decision to restrict, block, deprioritize, terminate, or otherwise change service to your Worker, to its Customers, or to SOCIII; (ii) outages, latency, or degradation of a Third-Party Provider's service; (iii) pricing changes by a Third-Party Provider; (iv) policy changes by a Third-Party Provider that require changes to your Worker; (v) data loss or security incidents originating with a Third-Party Provider.

(c) **SOCIII's Reasonable Efforts.** SOCIII will make commercially reasonable efforts to (i) maintain multi-provider redundancy where practicable; (ii) communicate material Third-Party Provider changes to Creators in advance where SOCIII has reasonable notice; (iii) work with Creators in good faith to adapt to Third-Party Provider changes that materially affect a Worker.

## 10. Worker Brand Ownership

(a) **You Own Your Worker Brand Assets.** You own the Worker Brand Assets, as defined in Section 2(g). This includes the Worker's name (subject to Section 10(b)), the Worker's logo, the Worker's tagline, the Worker's public-facing description, the Worker's domain expertise positioning, and any Worker-specific URLs, social handles, or content archives that you create.

(b) **Limits on Worker Brand Assets.**
- The Worker's name shall not (i) be confusingly similar to the SOCIII brand, the names of SOCIII's officers, or other registered marks; (ii) include "SOCIII" or any colorable variation; (iii) infringe a third party's trademark.
- The Worker's logo and visual identity shall not be confusingly similar to the SOCIII Marks, the Marks of any Fellow advisor, or the logos of any unrelated third party.
- The Worker's tagline shall not represent the Worker as an "official" SOCIII product, an SOCIII-team-member product, or otherwise misrepresent the relationship.

(c) **SOCIII's License to Use Worker Brand Assets in the Marketplace.** During the term of this Agreement and any wind-down period after termination, you grant SOCIII a non-exclusive, worldwide, royalty-free, sublicensable license to use the Worker Brand Assets solely for the purpose of: (i) listing, presenting, and marketing your Worker on the Marketplace; (ii) including your Worker in Marketplace-wide promotional materials (with attribution to you as Creator); (iii) operating Marketplace-wide search, comparison, and discovery features that reference your Worker by name and visual identity.

(d) **Worker-Specific Domain, Social, and Content.** If you operate a Worker-specific domain, social account, or content archive, you own those assets and may continue operating them after termination of this Agreement, subject only to Section 5 (Non-Circumvention) and your obligation under Section 7 not to misrepresent your relationship with SOCIII.

(e) **What SOCIII Owns Relating to the Marketplace Presentation.** SOCIII owns: (i) the Marketplace presentation layer itself (the listing page design, the search index, the discovery surfaces); (ii) the SOCIII Marks; (iii) aggregate Marketplace data and analytics; (iv) Customer reviews of your Worker (as user-generated content posted to the Marketplace); (v) all SOCIII platform infrastructure as described in Section 13(b).

## 11. Worker Content and Conduct Requirements

(a) **Lawful Content Only.** Your Worker, all content it generates or distributes, and your conduct as a Creator shall comply with all applicable laws, including without limitation: U.S. federal and state laws, securities laws, consumer protection laws, intellectual property laws, anti-discrimination laws, export control laws, sanctions laws (OFAC), and the laws of the jurisdictions in which your Worker's Customers are located.

(b) **Insurance — Reserved.** SOCIII may, at its discretion and upon reasonable prior written notice (typically not less than ninety (90) days), require Creators of Workers operating in certain regulated or high-risk domains — including without limitation legal, medical, aviation, financial advisory, real estate, and insurance — to maintain commercially reasonable coverage including errors-and-omissions insurance, professional liability insurance, or cyber liability insurance, with minimum coverage limits to be specified at the time of the requirement. The requirement, if imposed, will be set out in a Worker Category Policy published on the Marketplace. Compliance with such a requirement is a condition of continued Marketplace listing for the affected Worker categories.

(c) **Professional Standards.** If your Worker operates in a regulated profession, you represent that you are appropriately credentialed in that profession OR that your Worker is designed for use by an appropriately credentialed user and does not hold itself out as the substitute for licensed professional judgment. You bear sole responsibility for your Worker's compliance with profession-specific licensing and ethics rules in any jurisdiction where it is used.

(d) **No Harmful Content.** Your Worker shall NOT generate, facilitate, or distribute: child sexual abuse material, content promoting violence against any group, content designed to evade detection systems (jailbreak workers), content that facilitates fraud or identity theft, malware, content that infringes any third party's IP rights, or any content prohibited by SOCIII's then-current Content Policy.

(e) **No Misrepresentation.** Your Worker shall not misrepresent its capabilities, the credentials of its Creator, the source of its outputs, or the consequences of its actions to users.

## 12. Indemnification

(a) **Your Indemnification of SOCIII.** You shall defend, indemnify, and hold harmless SOCIII, its officers, directors, employees, agents, affiliates, successors, and assigns from and against any and all third-party claims, actions, proceedings, suits, damages, losses, settlements, judgments, awards, costs, and expenses (including reasonable attorneys' fees and court costs) arising out of or related to: (i) your Worker, including its design, code, content, outputs, marketing, or use; (ii) your breach of any representation, warranty, covenant, or other provision of this Agreement; (iii) your violation of any law, regulation, or third-party right; (iv) your representations or statements about SOCIII, including any unauthorized representation that you are authorized to bind or speak for SOCIII; (v) your public conduct; (vi) any tax, withholding, or governmental obligation related to your compensation under this Agreement.

(b) **SOCIII's Limited Indemnification of You.** SOCIII shall defend you against any third-party claim alleging that the SOCIII platform itself (excluding your Worker, your code, and your modifications) infringes that third party's U.S. patent, copyright, or trademark, and shall pay any final judgment or settlement entered into by SOCIII for such claim, provided that you (1) promptly notify SOCIII of the claim in writing; (2) give SOCIII sole control of the defense and any settlement; (3) cooperate fully with SOCIII at SOCIII's expense. SOCIII's liability under this Section is capped per Section 16(c).

(c) **Procedure.** The party seeking indemnification shall promptly notify the indemnifying party of any claim. The indemnifying party shall have sole control of the defense and any settlement of indemnified claims, provided that no settlement may impose any non-monetary obligation on the indemnified party without that party's prior written consent (not to be unreasonably withheld).

## 13. Intellectual Property

(a) **Your Worker is Yours.** You retain ownership of the intellectual property in the Worker code, content, configuration, and creative work you author, subject only to the licenses you grant in this Agreement and the limitations in Section 10 (Worker Brand Ownership).

(b) **SOCIII Platform Code.** All SOCIII platform code, infrastructure, services, brand assets, documentation, and the SOCIII open-source SDK itself (collectively, the "SOCIII Platform IP") remains the sole property of SOCIII or its licensors, regardless of any modifications or contributions you make.

(c) **Open Source License Grant.** When you contribute Worker code to the SOCIII open-source repository, you grant SOCIII and the world an Apache 2.0 license to that code. This includes the right of SOCIII and any other person to use, modify, distribute, and create derivative works from your contribution, subject to the Apache 2.0 terms.

(d) **Marketplace License Grant.** You grant SOCIII a worldwide, royalty-free, non-exclusive, sublicensable license to host, display, distribute, market, and execute your Worker on the Marketplace, for the duration of your Marketplace listing and for a reasonable wind-down period after termination.

(e) **Customer License.** Customers who subscribe to your Worker receive a license to use your Worker through the Marketplace, governed by SOCIII's then-current Marketplace Customer Terms. You do not grant any Customer a right to redistribute, sublicense, reverse-engineer, or extract your Worker outside of permitted Marketplace use.

(f) **No Implied License from SOCIII.** Nothing in this Agreement grants you any license to use SOCIII Platform IP outside of building, listing, and maintaining your Worker on the Marketplace.

(g) **Feedback.** Any feedback, suggestions, or improvement ideas you provide to SOCIII regarding the platform, the SDK, the documentation, or anything else become SOCIII's property, freely usable without obligation to you. (You may continue to use your own ideas; this just confirms SOCIII can incorporate them.)

## 14. Confidentiality

(a) **Confidential Information.** "Confidential Information" means non-public information that SOCIII identifies as confidential or that a reasonable person would understand to be confidential under the circumstances, including without limitation: roadmap and product plans, unpublished Customer data, financial information, technical architecture not in the public SDK, contractual relationships with third parties, and information about other Creators or Fellow advisors. Confidential Information does NOT include the SOCIII open-source SDK or other publicly available information.

(b) **Obligations.** You shall (i) hold all Confidential Information in strict confidence; (ii) not disclose any Confidential Information to any third party without SOCIII's prior written consent; (iii) not use any Confidential Information for any purpose other than authoring and maintaining your Worker; (iv) protect Confidential Information using at least the same degree of care you use to protect your own confidential information of similar importance (and in no event less than reasonable care).

(c) **Survival.** Your obligations under this Section 14 shall survive the termination or expiration of this Agreement for a period of three (3) years; provided, however, that with respect to any Confidential Information that constitutes a trade secret under applicable law, your obligations shall continue for so long as such information remains a trade secret.

## 15. Creator Death or Incapacity

(a) **Effect on Revenue.** In the event of your death or permanent incapacity, accrued and earned but unpaid revenue shall be paid to your estate, designated beneficiary, or legal representative in accordance with applicable law, upon receipt by SOCIII of reasonable documentation of the death or incapacity and of the recipient's authority. Ongoing Marketplace earnings on your Worker that continue to be generated after your death or incapacity shall likewise be paid to the estate, designated beneficiary, or legal representative for so long as the Worker remains listed.

(b) **Worker Continuity.** SOCIII may, at its discretion: (i) continue to operate your Worker on the Marketplace as long as the Worker continues to function and to meet the Platform Worker Standards; (ii) wind down the Worker if it becomes unsupportable due to platform changes, AI provider changes, or quality issues that you cannot address; (iii) work with your estate or representative on a reasonable transition or transfer to a designated successor Creator (if any).

(c) **Designated Successor.** You may designate a successor Creator in your Creator dashboard, who shall be entitled to take over operation and ownership of your Worker upon your death or permanent incapacity, subject to the successor's acceptance of this Agreement and successful Stripe Identity verification. If no successor is designated and your Worker becomes unsupported, SOCIII will follow Section 15(b)(ii).

(d) **No Personal Guarantee.** Nothing in this Section 15 creates personal liability of SOCIII's officers, directors, or affiliates for SOCIII's obligations to your estate.

## 16. Limitation of Liability

(a) **Disclaimer of Warranties.** THE SOCIII PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING OR USAGE OF TRADE. SOCIII DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.

(b) **No Consequential Damages.** TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, NEITHER PARTY SHALL BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES (INCLUDING WITHOUT LIMITATION LOST PROFITS, LOST REVENUE, LOST BUSINESS OPPORTUNITY, OR LOSS OF DATA), REGARDLESS OF THE FORM OF ACTION (CONTRACT, TORT, OR OTHERWISE), EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

(c) **Aggregate Cap.** SOCIII'S AGGREGATE LIABILITY UNDER THIS AGREEMENT, REGARDLESS OF THE BASIS OF THE CLAIM, SHALL NOT EXCEED THE GREATER OF (i) TWELVE (12) MONTHS OF YOUR PRIOR CREATOR SHARE EARNINGS UNDER THIS AGREEMENT, OR (ii) ONE THOUSAND DOLLARS ($1,000).

(d) **Carveouts.** The limitations in Sections 16(b) and 16(c) do NOT apply to: your indemnification obligations under Section 12(a); breach of Section 5 (Non-Circumvention) by you; breach of Section 10 (Worker Brand Ownership limits) by either party; breach of Section 13 (IP) by either party; breach of Section 14 (Confidentiality) by either party; fraud or willful misconduct.

## 17. Dispute Resolution

(a) **Good-Faith Negotiation.** The Parties shall attempt in good faith to resolve any dispute, claim, or controversy arising out of or relating to this Agreement (each, a "Dispute") through informal negotiation between the Parties for thirty (30) days following written notice of the Dispute. Either Party may give the other Party written notice of a Dispute by emailing `disputes@sociii.ai` or by physical mail to the address listed at the head of this Agreement.

(b) **Binding Arbitration.** If the Parties cannot resolve a Dispute through informal negotiation, the Dispute shall be resolved by binding arbitration administered by JAMS in accordance with its Streamlined Arbitration Rules, before a single arbitrator selected in accordance with those Rules. Arbitration shall take place in Las Vegas, Nevada (or by videoconference, if the arbitrator approves). The arbitrator's award shall be final and binding. Either Party may enforce the award in any court of competent jurisdiction.

(c) **Class Action Waiver.** TO THE FULLEST EXTENT PERMITTED BY LAW, THE PARTIES WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION, COLLECTIVE ACTION, OR REPRESENTATIVE PROCEEDING. Disputes shall be resolved on an individual basis only.

(d) **Carveouts.** Notwithstanding the foregoing, either Party may seek injunctive or equitable relief in any court of competent jurisdiction for (i) breach of Section 5 (Non-Circumvention); (ii) breach of Section 14 (Confidentiality); (iii) infringement of intellectual property rights; (iv) violation of Section 7 (Brand Restrictions). The Parties consent to the personal jurisdiction of the federal and state courts located in Clark County, Nevada for such proceedings.

## 18. Miscellaneous

(a) **Entire Agreement.** This Agreement, together with the Earnings Document (as referenced in Section 1(a)) and the SOCIII Brand Kit (as referenced in Section 7(c)), constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior agreements and communications.

(b) **Amendments.** SOCIII may amend this Agreement from time to time. Material amendments will be communicated to you by email and posted on the Marketplace, with at least thirty (30) days' notice before they take effect. Your continued participation in the Marketplace after the effective date of an amendment constitutes acceptance. If you do not accept an amendment, your sole remedy is to terminate this Agreement under Section 8(c).

(c) **Assignment; Change of Control.** You may not assign this Agreement or any of your rights or obligations under it without SOCIII's prior written consent (which may be withheld at SOCIII's discretion). SOCIII may assign this Agreement, including in connection with a merger, acquisition, consolidation, sale of substantially all assets, or other change-of-control transaction, without your consent, provided that the assignee assumes SOCIII's obligations. In a change-of-control transaction in which the assignee materially decreases the Creator Share, materially adjusts the economic terms to your detriment, or materially expands the obligations under Section 5 (Non-Circumvention) without commensurate consideration, you may, within ninety (90) days following written notice of the closing of the transaction, terminate this Agreement under Section 8(c) without becoming subject to a Non-Circumvention period that was not in effect prior to the change of control.

(d) **Severability.** If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction or arbitrator, such provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable, and the remaining provisions shall remain in full force and effect.

(e) **Waiver.** No waiver of any provision of this Agreement is effective unless in writing and signed by the waiving Party. The failure of either Party to enforce any right or provision of this Agreement does not constitute a waiver of that right or provision.

(f) **Force Majeure.** Neither Party is liable for any failure or delay in performance caused by events beyond the Party's reasonable control, including natural disasters, war, civil unrest, government action, labor dispute, internet outage, third-party service outage (including outages of Firebase, Google Cloud, Anthropic, Stripe, or other essential infrastructure), and pandemic.

(g) **Notices.** Notices to SOCIII shall be sent by email to `legal@sociii.ai` and physical mail to the address at the head of this Agreement. Notices to you shall be sent to the email address associated with your Creator account.

(h) **Electronic Signature; Click-Through.** The Parties agree that this Agreement may be accepted by electronic action (click-through) and that an electronic acceptance has the same legal effect as a manually executed signature. The capture record (timestamp, IP address, user agent, agreement version) maintained by SOCIII is conclusive evidence of acceptance.

(i) **Governing Law.** This Agreement is governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict-of-laws principles. For matters not subject to arbitration under Section 17, exclusive venue is in the federal or state courts located in Clark County, Nevada.

(j) **Headings.** Section headings are for convenience only and shall not affect the interpretation of this Agreement.

(k) **Counterparts.** This Agreement may be accepted in counterparts, each of which (whether electronic or hardcopy) shall be deemed an original and all of which together shall constitute one and the same instrument.

---

**Agreement Version:** v1.1
**Effective on Acceptance:** The version date specified at the top of the click-through acceptance flow
**Document hash:** [populated at publish time]

---

## Notes for Sean (not part of the executed agreement)

### What changed in v1.1 vs v1.0
Direct response to OpenAI's 10-point review:

1. **Definitions section (Section 2) + Marketplace Economics detail (Section 3) — ADDED.** The revenue math is now binding contract language, not just an Earnings Document reference. Gross / Net / Stripe pass-through / refunds / chargebacks / sales tax / third-party API costs all defined. Worked example in 3(b). Audit right in 3(e).

2. **Customer Ownership (Section 4) — ADDED.** Platform-of-record model is now explicit: SOCIII owns the customer relationship, creator gets reasonable access, creator may NOT extract customer data or move customers off-Marketplace.

3. **Non-Circumvention (Section 5) — ADDED.** 12-month restriction post-termination. Carveout for pre-existing relationships (creator's burden of substantiation). Liquidated damages = 12 months of Platform Share on diverted revenue. Carve-out language clarifies what creators CAN still do (other workers, other businesses, separate competing services).

4. **AI Provider Dependency (Section 9) — ADDED.** SOCIII not responsible for Anthropic / OpenAI / Google / Stripe / Crossmint / etc. decisions. Reciprocal good-faith effort to maintain redundancy and communicate changes.

5. **Worker Brand Ownership (Section 10) — ADDED.** Creator owns the Worker's name, logo, tagline, public description, social handles, content archives. SOCIII owns the Marketplace presentation layer, the SOCIII Marks, aggregate analytics, Customer reviews-as-UGC. Limits on Worker name (no "SOCIII" or colorable variations, no infringement).

6. **Public Conduct (Section 6(e)) — TIGHTENED, NOT GUTTED.** OpenAI was right that "SOCIII's good-faith determination is final" was too unilateral. New language: (i) specific named-conduct categories (no binding-SOCIII representations, no violence-promoting / inciting content, no material misrepresentation, no crimes); (ii) "where reasonable" notice + 15-day cure for non-emergency cases; (iii) SOCIII retains immediate-suspension power for fraud, illegal activity, or imminent reputational harm; (iv) explicit carveout that "disagreement with SOCIII's product, leadership, or business decisions, expressed in ordinary good-faith terms" does NOT trigger removal. This is the right balance — preserves your removal power for actual problems, removes the Twitter-criticism-fear that would scare off legit creators.

7. **Insurance (Section 11(b)) — ADDED AS RESERVED RIGHT, NOT IMMEDIATE REQUIREMENT.** SOCIII may require E&O / professional liability / cyber for regulated categories (legal, medical, aviation, financial, RE, insurance) with 90-day notice. Not required for v1, but the right is reserved. Avoid having to amend later when you spin up the Legal worker.

8. **Worker Portable Artifacts on Exit (Section 8(b)) — EXPANDED.** Original v1.0 only covered Apache code. New language: within 30 days post-termination, on written request, SOCIII provides portable export of Worker configuration files, Worker-specific prompts, Worker-specific templates. Explicit exclusions: SOCIII's platform-wide rule library, infrastructure code, audit-trail records, Customer-identifying data.

9. **Creator Death or Incapacity (Section 15) — ADDED.** Accrued revenue to estate. SOCIII discretion to continue, wind down, or migrate Worker. Creator can designate a successor in dashboard (who must accept this Agreement and verify identity). No personal guarantee from SOCIII's principals.

10. **Change of Control (Section 18(c)) — STRENGTHENED.** Original 13(c) had standard assignment language. New language: if a change-of-control transaction materially worsens Creator Share, economic terms, or Non-Circumvention scope, Creator has 90-day opt-out without triggering a Non-Circumvention period that didn't exist before.

### What I deliberately did NOT do per OpenAI's suggestions

- **Did not gut the public conduct clause.** Tightened with specifics + cure where reasonable, but preserved the immediate-suspension power. The "good-faith determination is final" framing now lives only in 8(d) for non-conduct removal categories. The conduct framework is calibrated, not subjective. OpenAI's right that pure subjectivity is bad; gone too far the other way invites "but I criticized SOCIII fairly" lawsuits.
- **Did not require insurance at v1.** Reserved the right with 90-day notice. Don't deter v1 creators with insurance requirements they may not yet have.

### What still needs counsel attention

- The $1,000 liability floor — counsel may want this higher; you may want it lower; defensible at $1,000 floor / 12mo earnings cap.
- The 30-day amendment notice (some marketplace TOS use 7-15 days; 30 is generous).
- The arbitration carveouts (4 items now: non-circumvention, confidentiality, IP, brand).
- "Where reasonable" / "where practicable" qualifiers in 6(e) and 9(c) — counsel will want to look at these for ambiguity.
- Liquidated damages calculation in 5(d) — counsel will want to confirm enforceability under Delaware law.
- Section 8(b) Worker-export-on-exit list — make sure the engineering team can actually produce this export within 30 days at scale.
- Section 15(c) Designated Successor — needs corresponding UI in Creator dashboard before this clause is actually executable.
- Section 18(c) change-of-control opt-out window of 90 days — typical M&A clauses use 30-60; 90 is creator-friendly.

### Implementation work that follows from v1.1

When you wire the click-through flow:
- Section 2 definitions should be displayed (collapsible) in the onboarding UI
- Section 3 worked example should appear in the earnings preview
- Section 4(c) "do not extract" should align with what your dashboard actually allows (don't expose a download-customer-list button)
- Section 5 substantiation: capture creator's claimed pre-existing relationships in onboarding form (optional field)
- Section 8(b) Worker portable export: needs a `creator:export-worker` capability + endpoint
- Section 11(b) insurance requirement: needs a "Worker Category Policy" doc to live somewhere (Marketplace public page)
- Section 15(c) designated successor: needs a `successor_creator_id` field on creator record + a designation UI

---

*v1.1 effective 2026-05-31. Counsel review may produce amendments per Section 18(b). Click-through capture pattern wired in `apps/business/src/pages/CreatorOnboard.jsx` (or wherever the marketplace onboarding flow lives).*
