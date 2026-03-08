"use strict";

/**
 * TitleApp Creator Agreement v1.0
 *
 * This is a scaffold — sections marked [LEGAL_REVIEW_REQUIRED] need attorney review
 * before going live. The agreement is served via GET /v1/legal:creator-agreement
 * and accepted via POST /v1/creator:accept-agreement.
 */

const AGREEMENT_VERSION = "1.0";

const AGREEMENT_TEXT = `
TITLEAPP CREATOR AGREEMENT
Version ${AGREEMENT_VERSION} — Effective Date: [LEGAL_REVIEW_REQUIRED]

This Creator Agreement ("Agreement") is between you ("Creator") and TitleApp AI, Inc. ("TitleApp," "we," "us"). By publishing a Digital Worker on the TitleApp platform, you agree to the following terms.

1. DEFINITIONS

"Digital Worker" means an AI-powered agent built on the TitleApp platform that performs specific tasks for subscribers using rules, compliance logic, and AI models.

"Subscriber" means any person or entity that subscribes to or uses a Digital Worker you have published.

"Platform" means the TitleApp infrastructure, including the rules engine, compliance engine, AI models, vault, audit trail, and marketplace.

"RAAS" means Rules + AI-as-a-Service, the underlying technology that powers Digital Workers.

2. CREATOR RESPONSIBILITIES

2.1 You are the publisher of your Digital Worker. You are responsible for the accuracy, completeness, and compliance of the rules, prompts, and configurations you create.

2.2 You will not publish Digital Workers that violate applicable laws, regulations, or the TitleApp Terms of Service.

2.3 You will not publish Digital Workers that impersonate licensed professionals (attorneys, doctors, CPAs, etc.) unless you hold the relevant license and have verified your credentials on the platform.

2.4 You will maintain the accuracy of your Digital Worker's rules and configurations. If regulations change in your worker's jurisdiction, you are responsible for updating the worker accordingly.

2.5 You will respond to subscriber feedback and admin review requests within 14 days.

3. REVENUE SHARE

3.1 TitleApp operates a 75/25 revenue split on subscription revenue. You receive 75% of each subscriber's monthly payment. TitleApp retains 25%.

3.2 Inference credit overage revenue is split 80/20 (platform/creator). You receive 20% of the margin on credits consumed beyond the subscriber's included allotment.

3.3 Data pass-through fees (external API costs) are platform revenue. You receive 0% of data pass-through margins.

3.4 Audit trail fees ($0.005/record) are platform revenue. You receive 0% of audit trail revenue.

3.5 Payouts are processed monthly via Stripe Connect. Minimum payout threshold is $0.50. [LEGAL_REVIEW_REQUIRED — confirm payout terms with Stripe agreement]

3.6 TitleApp reserves the right to adjust revenue share percentages with 90 days written notice. Changes apply to new subscriptions only; existing subscriptions are grandfathered for 12 months.

4. INTELLECTUAL PROPERTY

4.1 You retain ownership of the original rules, configurations, and prompts you create for your Digital Worker.

4.2 TitleApp retains ownership of the platform, the rules engine, the AI models, the vault, and all underlying infrastructure.

4.3 You grant TitleApp a non-exclusive, worldwide license to host, distribute, and display your Digital Worker on the platform for the purpose of serving subscribers.

4.4 TitleApp does not claim ownership of your Digital Worker's output. Output ownership follows the subscriber's terms of service. [LEGAL_REVIEW_REQUIRED]

5. LIABILITY AND DISCLAIMERS

5.1 TitleApp provides the platform and compliance engine. TitleApp does not guarantee the correctness of creator-configured rules, prompts, or worker behavior.

5.2 You acknowledge that AI systems can produce errors. You are responsible for testing your Digital Worker before publication and monitoring its performance after publication.

5.3 TitleApp is not liable for losses, damages, or claims arising from your Digital Worker's outputs or subscriber's reliance on those outputs.

5.4 You agree to indemnify TitleApp against claims arising from your Digital Worker's configuration, rules, or outputs. [LEGAL_REVIEW_REQUIRED — indemnification scope]

6. WORKER VERSIONING AND UPDATES

6.1 When you publish an update, all subscribers receive it immediately.

6.2 Material changes (jurisdiction, compliance rules, suite changes) require admin review before going live.

6.3 Subscribers are notified of significant updates.

7. DEPRECATION AND ABANDONMENT

7.1 If you do not log in for 90 consecutive days and your account is in arrears, TitleApp may transfer your Digital Worker to TitleApp ownership to protect subscribers.

7.2 You will receive a 30-day warning via email and SMS before any transfer.

7.3 You may reclaim ownership within 12 months by reactivating your account and resolving any outstanding balance.

7.4 During the abandoned period, TitleApp receives the full creator revenue share.

8. TERMINATION

8.1 You may unpublish your Digital Worker at any time. Existing subscribers will be given 30 days notice before the worker is removed.

8.2 TitleApp may remove your Digital Worker if it violates this Agreement, the Terms of Service, or applicable law.

8.3 Upon termination, your right to receive future revenue ceases. Earned but unpaid revenue will be paid within 30 days. [LEGAL_REVIEW_REQUIRED]

9. CONFLICT OF INTEREST

9.1 TitleApp will not build Digital Workers that directly compete with creator-built workers in the same vertical and specific use case.

9.2 TitleApp may build template or starter workers to seed verticals before creators fill them.

9.3 TitleApp retains the right to build platform-level workers (Alex, vault management, admin tools).

10. DISPUTE RESOLUTION

10.1 Disputes will be resolved through binding arbitration in [LEGAL_REVIEW_REQUIRED — jurisdiction]. [LEGAL_REVIEW_REQUIRED — full arbitration clause]

11. MODIFICATIONS

11.1 TitleApp may modify this Agreement with 30 days written notice. Continued use of the platform after the notice period constitutes acceptance.

11.2 Material changes to revenue share terms require 90 days notice (see Section 3.6).

---

By clicking "Accept" or publishing a Digital Worker, you agree to the terms of this Agreement.

TitleApp AI, Inc.
[LEGAL_REVIEW_REQUIRED — signatory and address]
`.trim();

module.exports = {
  AGREEMENT_VERSION,
  AGREEMENT_TEXT,
};
