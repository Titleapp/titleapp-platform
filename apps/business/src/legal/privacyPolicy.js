// SOCIII Privacy Policy — rendered inline as HTML by LegalPage.jsx.
//
// Previously this page only embedded /legal/privacy-policy.pdf in a
// PDF.js iframe, so the actual policy text was never present in the page's
// DOM. That's what Google's OAuth branding-verification crawler flagged
// as "does not have sufficient content" on 2026-09-19 — it isn't a
// content-quality issue, the policy itself (source PDF) is a real,
// substantive 5-page document; it just wasn't crawlable. This HTML is the
// verbatim text of that same PDF (effective August 28, 2026), reformatted
// as semantic markup so it renders as real page content. Keep this in
// sync with the PDF if counsel updates one — they should stay identical.
// See project_repo_identity and the wider CODEX 94 Google Ads brand
// verification thread for context.

export const PRIVACY_POLICY_HTML = `
<p class="lead">sociii.ai Platform · Effective August 28, 2026</p>

<h2>1. Who We Are</h2>
<p>SOCIII, Inc. ("SOCIII," "we," "us," or "our") operates the SOCIII AI Digital Worker platform at sociii.ai. We are incorporated in Delaware, USA. Our data controller contact is: <a href="mailto:privacy@sociii.ai">privacy@sociii.ai</a>. Postal: 1810 E Sahara Ave, STE 75942, Las Vegas, NV 89104.</p>
<p>For EEA/UK users: SOCIII acts as the data controller for information collected directly from you. Where SOCIII processes data on behalf of enterprise or institutional clients, it acts as a data processor under a separate Data Processing Agreement (DPA).</p>

<h2>2. Scope</h2>
<p>This Privacy Policy applies to:</p>
<ul>
  <li>All visitors to sociii.ai and any subdomain (app.sociii.ai, api.sociii.ai, etc.)</li>
  <li>All registered users: platform creators, subscribers, administrators, and API partners</li>
  <li>All SOCIII AI Digital Workers and services accessed through the platform</li>
  <li>All jurisdictions globally, with jurisdiction-specific supplements in Section 13</li>
</ul>

<h2>3. Information We Collect</h2>
<h3>3.1 Information You Provide</h3>
<ul>
  <li>Account registration: name, email address, password (hashed), role (creator/subscriber/admin)</li>
  <li>Profile information: professional credentials, company/institution name, job title</li>
  <li>Payment information: billing address, VAT/tax ID (raw card data held by Stripe, not SOCIII)</li>
  <li>Content you create: worker configurations, RAAS rules, prompts, uploaded documents</li>
  <li>Communications: support tickets, feedback, emails to legal@sociii.ai</li>
  <li>Identity verification: for creators, government-issued ID verification via Stripe Identity</li>
</ul>
<h3>3.2 Information Collected Automatically</h3>
<ul>
  <li>Log data: IP address, browser type, pages visited, timestamps, referring URL</li>
  <li>Device data: operating system, screen resolution, hardware identifiers</li>
  <li>Usage data: feature interactions, session duration, worker invocations, API call counts</li>
  <li>Cookies and similar technologies: see Section 7</li>
</ul>
<h3>3.3 Information from Third Parties</h3>
<ul>
  <li>Stripe: payment status, payout status, tax form completion status, Connect account status</li>
  <li>Dropbox Sign: signature completion status, signed document references</li>
  <li>ATTOM Data: property data records for Real Estate workers (no personal data from ATTOM)</li>
  <li>Firebase Authentication: authentication tokens, sign-in method</li>
  <li>Google Workspace: if you authenticate via Google SSO</li>
</ul>

<h2>4. How We Use Your Information</h2>
<h3>4.1 To Provide and Operate the Platform</h3>
<ul>
  <li>Create and maintain your account</li>
  <li>Process payments, subscriptions, and creator payouts via Stripe</li>
  <li>Deliver AI Digital Worker functionality</li>
  <li>Enforce the four-tier RAAS rules stack (Tier 0–3)</li>
  <li>Maintain audit trails and compliance records</li>
</ul>
<h3>4.2 To Improve and Develop</h3>
<ul>
  <li>Analyze aggregate usage patterns to improve platform performance</li>
  <li>Refine RAAS rules using anonymized/aggregated data only — no personally identifiable content is used for model training without explicit opt-in consent</li>
  <li>Conduct internal research on platform reliability and security</li>
</ul>
<h3>4.3 To Communicate</h3>
<ul>
  <li>Transactional emails: account confirmations, receipts, trial expiration notices</li>
  <li>Platform notifications: worker status changes, payout confirmations</li>
  <li>Marketing communications if you have opted in (opt-out available at any time)</li>
</ul>
<h3>4.4 Legal Bases for Processing (GDPR / UK GDPR)</h3>
<ul>
  <li>Contract performance: processing necessary to deliver the service you subscribed to</li>
  <li>Legitimate interests: security, fraud prevention, platform analytics</li>
  <li>Legal obligation: tax records, regulatory compliance, law enforcement requests</li>
  <li>Consent: marketing emails, non-essential cookies, AI training opt-in</li>
</ul>

<h2>5. Data Sharing and Disclosure</h2>
<p>We do not sell personal data. We share data only as described below.</p>
<h3>5.1 Service Providers (Processors)</h3>
<ul>
  <li>Stripe, Inc. — payment processing, identity verification, tax compliance</li>
  <li>Dropbox, Inc. (Dropbox Sign) — electronic signature workflows</li>
  <li>Google LLC — Firebase (database, authentication, cloud functions), Google Workspace</li>
  <li>Cloudflare, Inc. — CDN and DDoS protection for sociii.ai</li>
  <li>ATTOM Data Solutions — property data API (no personal data transferred to ATTOM)</li>
  <li>Anthropic, PBC and OpenAI, L.L.C. — AI inference for Digital Worker responses</li>
</ul>
<p>All service providers are bound by data processing agreements prohibiting use of your data for their own purposes, including model training.</p>
<h3>5.2 Business Transfers</h3>
<p>If SOCIII is acquired, merged, or undergoes a change of control, personal data may be transferred as part of that transaction. We will notify you before your data is subject to a materially different privacy policy.</p>
<h3>5.3 Legal Requirements</h3>
<p>We may disclose personal data in response to valid legal process (subpoena, court order, law enforcement request) or to protect SOCIII, its users, or the public from harm. Where permitted, we will notify you before disclosure.</p>
<h3>5.4 Aggregated / De-Identified Data</h3>
<p>We may share aggregated, de-identified statistics (e.g., "SOCIII has 5,000 active creators") that cannot reasonably identify you.</p>

<h2>6. Data Retention</h2>
<ul>
  <li>Active accounts: retained for the duration of your account plus 3 years after closure</li>
  <li>Subscription and payment records: 7 years (US tax law requirement; may vary by jurisdiction)</li>
  <li>Audit trail records: 7 years (immutable; required for regulated-vertical compliance)</li>
  <li>Signed BAA documents: 6 years from execution (HIPAA minimum)</li>
  <li>Worker session logs: 90 days rolling, then anonymized</li>
  <li>Marketing data: until opt-out, then deleted within 30 days</li>
  <li>Deleted account data: purged within 90 days except where legal holds apply</li>
</ul>

<h2>7. Cookies and Tracking</h2>
<ul>
  <li>Strictly necessary: authentication session tokens, CSRF protection, Stripe fraud signals — cannot be disabled</li>
  <li>Functional: UI preferences, language settings — disabled via browser settings</li>
  <li>Analytics: aggregated usage via Firebase Analytics — opt-out available in account settings</li>
  <li>Marketing: none on the core platform. If opt-in marketing emails are clicked, we may track opens/clicks</li>
</ul>
<p>You can manage cookies via your browser settings or our cookie preference center at sociii.ai/privacy#cookies.</p>

<h2>8. Security</h2>
<p>SOCIII implements technical and organizational measures including:</p>
<ul>
  <li>Encryption in transit (TLS 1.2+) and at rest (AES-256 via Firebase/GCP)</li>
  <li>Role-based access control (RBAC) for all platform data</li>
  <li>Immutable, append-only audit trail for all regulated worker actions</li>
  <li>Stripe-hosted payment collection — SOCIII never stores raw card numbers</li>
  <li>Regular internal security reviews</li>
</ul>
<p>No system is perfectly secure. In the event of a data breach affecting your rights, we will notify you and relevant supervisory authorities within the timeframes required by applicable law (72 hours under GDPR; CCPA/CPRA breach notification as required). See our Security Policy for further detail.</p>

<h2>9. Your Rights</h2>
<h3>9.1 All Users (Global Baseline)</h3>
<ul>
  <li>Access: request a copy of the personal data we hold about you</li>
  <li>Correction: request correction of inaccurate data</li>
  <li>Deletion: request deletion of your data (subject to legal retention requirements)</li>
  <li>Portability: receive your data in a machine-readable format</li>
  <li>Opt-out: withdraw consent for marketing communications at any time</li>
</ul>
<h3>9.2 EEA / UK Users (GDPR / UK GDPR)</h3>
<ul>
  <li>Right to restrict processing</li>
  <li>Right to object to processing based on legitimate interests</li>
  <li>Right not to be subject to solely automated decision-making with significant effects</li>
  <li>Right to lodge a complaint with your national supervisory authority (e.g., ICO in the UK)</li>
</ul>
<p>EU Representative: SOCIII will designate an EU representative under Article 27 GDPR upon reaching the applicable threshold. Contact: legal@sociii.ai</p>
<h3>9.3 California Users (CCPA / CPRA)</h3>
<ul>
  <li>Right to know the categories and specific pieces of personal information collected</li>
  <li>Right to delete personal information</li>
  <li>Right to correct inaccurate personal information</li>
  <li>Right to opt out of the sale or sharing of personal information — we do not sell or share personal information</li>
  <li>Right to limit use of sensitive personal information</li>
  <li>Right to non-discrimination for exercising privacy rights</li>
</ul>
<p>To submit a CCPA request: email privacy@sociii.ai with "CCPA Request" in the subject line. We will respond within 45 days.</p>
<h3>9.4 Canadian Users (PIPEDA / Bill C-27)</h3>
<p>Right to access and challenge the accuracy of your personal information. Consent may be withdrawn for non-essential processing. Contact our privacy officer at privacy@sociii.ai.</p>
<h3>9.5 Australian Users (Privacy Act 1988 — APPs)</h3>
<p>Right to access and correct personal information. Right to complain to the Office of the Australian Information Commissioner (OAIC).</p>
<p>To exercise any right, contact privacy@sociii.ai. We will respond within 30 days (45 days for complex CCPA requests). We will verify your identity before processing requests.</p>

<h2>10. International Transfers</h2>
<p>SOCIII is based in the United States. If you access the platform from outside the US, your data may be transferred to and processed in the US, which may have different data protection laws than your country.</p>
<p>For transfers from the EEA/UK: we rely on the EU-US Data Privacy Framework (DPF) where applicable, Standard Contractual Clauses (SCCs) approved by the European Commission, or UK International Data Transfer Agreements (IDTAs) for UK transfers. For transfers from other jurisdictions: we implement equivalent safeguards under applicable local law. Contact legal@sociii.ai for copies of relevant transfer mechanisms.</p>

<h2>11. Children's Privacy</h2>
<p>SOCIII is intended for users 18 years of age or older, except where accessed by enrolled students through an institutional agreement with their school. We do not knowingly collect personal data from children under 13 (US COPPA), under 16 (GDPR default for digital services), or the applicable minimum age in your jurisdiction, outside of such an institutional arrangement. If you believe a child has provided us personal data outside of an authorized institutional context, contact privacy@sociii.ai immediately and we will delete it.</p>

<h2>12. Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. We will notify you of material changes by email (to your registered address) and by posting a prominent notice on the platform at least 30 days before changes take effect. The "Effective Date" at the top of this document indicates when the current version was last updated. Continued use of the platform after the effective date constitutes acceptance of the updated policy.</p>

<h2>13. Jurisdiction-Specific Supplements</h2>
<h3>13.1 European Economic Area / UK</h3>
<p>Data controller: SOCIII, Inc., 1810 E Sahara Ave, STE 75942, Las Vegas, NV 89104. Supervisory authority: users may contact their local EU data protection authority. Standard Contractual Clauses are available on request.</p>
<h3>13.2 Brazil (LGPD)</h3>
<p>Brazilian users have rights under Lei Geral de Proteção de Dados (LGPD) including confirmation of processing, access, correction, anonymization, portability, deletion, and information about sharing. Contact privacy@sociii.ai. Our legal basis for processing is primarily contract performance and legitimate interests.</p>
<h3>13.3 Japan (APPI)</h3>
<p>We comply with Japan's Act on the Protection of Personal Information (APPI). Personal information is not provided to third parties without your consent except as required by law or for service delivery.</p>
<h3>13.4 Additional Jurisdictions</h3>
<p>SOCIII is committed to compliance with applicable privacy laws in all jurisdictions where it operates. If you have jurisdiction-specific questions, contact legal@sociii.ai.</p>

<h2>14. Contact Us</h2>
<ul>
  <li>Privacy questions: <a href="mailto:privacy@sociii.ai">privacy@sociii.ai</a></li>
  <li>Legal / compliance: <a href="mailto:legal@sociii.ai">legal@sociii.ai</a></li>
  <li>Postal: SOCIII, Inc., 1810 E Sahara Ave, STE 75942, Las Vegas, NV 89104</li>
</ul>
<p>Response time: 5 business days for general inquiries; 30 days for data subject requests.</p>
`;
