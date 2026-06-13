// SOCIII for Education — published legal content (S52.64).
// Rendered inline as HTML by LegalPage.jsx (no PDF needed). Pricing + the
// student-data-plan model are reflected here. Sean directed these go live
// 2026-06-13 (Option A). Counsel may still version-bump the wording; bump the
// `updated` date in LEGAL_DOCS when they do.

export const EDUCATION_TERMS_HTML = `
<p class="lead">These terms govern <strong>SOCIII for Education</strong> — the plan for schools, colleges, and universities. By clicking “I accept,” signing an order, or using the Services, the Institution agrees to these Terms. The individual accepting represents they are authorized to bind the Institution. These Terms incorporate the <a href="/legal/education-dpa">Data Processing &amp; FERPA Addendum</a>.</p>

<h2>1. The Services</h2>
<p>SOCIII provides the Institution access to build and operate <strong>Digital Workers</strong> (rule-governed AI services whose outputs are validated and logged) and to maintain student <strong>Academic Records</strong> in the Vault, with admin controls, scoped access grants, and an append-only audit trail.</p>

<h2>2. Plan &amp; Fees — “Business in a Box for Schools”</h2>
<ul>
  <li><strong>Base: $99 / month</strong> per Institution workspace — unlimited workers built by the Institution’s faculty, the Academic Record substrate, admin console, FERPA dual-control, and audit trail.</li>
  <li><strong>$5 / month per active student</strong> (a student whose record is maintained that month), or <strong>$50 / student / year</strong> prepaid annually. Active-student billing only — graduated or inactive students are not charged.</li>
  <li><strong>Included data allowance.</strong> Each active student includes a reasonable monthly allowance of AI/data usage.</li>
  <li><strong>Usage beyond the allowance is metered</strong> at substrate cost plus markup. Overage may be carried by the <strong>student’s own data plan</strong> (the student tops up their own credits) or funded from an Institution pool, as configured by the Institution. This keeps the Institution’s base bill predictable.</li>
  <li><strong>Enterprise.</strong> Above <strong>1,000 active students</strong>, pricing moves to a flat negotiated site license — contact SOCIII.</li>
</ul>
<p>Fees are billed in advance, auto-renew, and are exclusive of taxes. Cancel anytime, effective at the end of the current period.</p>

<h2>3. Acceptable Use &amp; Institution Responsibilities</h2>
<p>The Institution is responsible for its authorized users (faculty, staff, students), account security, lawful use, and obtaining any student or parent consents and providing required notices for records it places in the Services. FERPA roles are described in the <a href="/legal/education-dpa">DPA</a>.</p>

<h2>4. Data Protection</h2>
<p>All processing of student and personal data is governed by the <a href="/legal/education-dpa">Data Processing &amp; FERPA Addendum</a>, incorporated into these Terms. On any conflict regarding data protection, the Addendum controls.</p>

<h2>5. Intellectual Property</h2>
<ul>
  <li><strong>Platform</strong> — SOCIII owns the Services and all related intellectual property.</li>
  <li><strong>Records</strong> — the <strong>student owns</strong> their Academic Record; the <strong>Institution retains</strong> its education records. SOCIII receives only the limited license needed to provide the Services.</li>
  <li><strong>Feedback</strong> — SOCIII may use Institution feedback to improve the Services (no personal data).</li>
</ul>

<h2>6. Warranties &amp; Disclaimers</h2>
<p><strong>Not a system of record; not certified.</strong> Digital Worker outputs are not official, certified, or authoritative. The Institution will not rely on outputs for grading of record, licensure, accreditation, or financial-aid decisions without its own verification.</p>
<p><strong>AS-IS.</strong> Except as expressly stated, the Services are provided “as is” and “as available,” without warranties of any kind, including merchantability, fitness for a particular purpose, accuracy, and non-infringement, to the maximum extent permitted by law.</p>

<h2>7. Limitation of Liability</h2>
<p>To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, or consequential damages. Each party’s aggregate liability is limited to the fees paid in the 12 months before the claim.</p>

<h2>8. Term &amp; Termination</h2>
<p>Month-to-month (or the annual term if prepaid); either party may cancel effective at the end of the current billing period. On termination, data export and deletion follow the DPA; student-owned records the student elects to keep remain in the student’s Vault.</p>

<h2>9. Changes; Governing Law</h2>
<p>SOCIII may update these Terms with reasonable notice of material changes; continued use after the effective date is acceptance. Governing law: the State of Hawai‘i. These Terms and the DPA are the entire agreement on the Services.</p>
`;

export const EDUCATION_DPA_HTML = `
<p class="lead">This <strong>Data Processing &amp; FERPA Addendum</strong> (“DPA”) governs SOCIII’s processing of student and personal data on behalf of the Institution under <strong>SOCIII for Education</strong>. It is accepted together with, and incorporated into, the <a href="/legal/education-terms">SOCIII for Education Terms of Service</a>. It follows the standard, accept-to-use pattern of major education-software providers.</p>

<h2>1. Roles &amp; Instructions</h2>
<p>The <strong>Institution is the controller</strong> of its data; <strong>SOCIII is the processor</strong>, processing only on the Institution’s documented instructions (these terms and the admin-console configuration). SOCIII does not process the data for its own purposes and <strong>does not use student personal data to train or fine-tune any AI model</strong>.</p>

<h2>2. FERPA — “School Official”</h2>
<p>To the extent SOCIII accesses education records, the Institution designates SOCIII as a <strong>“school official”</strong> with a <strong>“legitimate educational interest”</strong> under 34 CFR § 99.31(a)(1)(i)(B). SOCIII (a) performs an institutional service the Institution would otherwise use employees for; (b) is under the <strong>direct control</strong> of the Institution as to the use and maintenance of education records; and (c) <strong>will not re-disclose</strong> education records except as authorized by the Institution or required by law.</p>
<p><strong>Dual control.</strong> Access is jointly controlled: the <strong>student</strong> controls sharing of their own Academic Record; the <strong>Institution</strong> controls institution-level access. Grants are scoped, revocable, and logged.</p>

<h2>3. Security Measures</h2>
<p>SOCIII maintains: encryption in transit and at rest; <strong>hashing</strong> of records; scoped, revocable, audited access control; data minimization; personnel under confidentiality; PII minimized/scrubbed before any model call; and an append-only audit trail of every read, write, and attestation.</p>

<h2>4. Subprocessors</h2>
<p>The Institution authorizes the subprocessors below. SOCIII gives notice before adding a subprocessor that processes Institution data and binds each to obligations no less protective than this DPA. No subprocessor uses student personal data to train models.</p>
<ul>
  <li><strong>Google Cloud / Firebase</strong> — hosting and datastore (US)</li>
  <li><strong>Anthropic</strong> — model inference, PII-minimized (US)</li>
  <li><strong>OpenAI</strong> — model inference, PII-minimized (US)</li>
  <li><strong>Stripe</strong> — billing (no education records)</li>
</ul>

<h2>5. Data Incidents</h2>
<p>SOCIII will notify the Institution without undue delay and no later than <strong>72 hours</strong> after confirming a data incident affecting Institution data, with the information reasonably available, and will cooperate on remediation and any required notices.</p>

<h2>6. Return &amp; Deletion</h2>
<p>On termination or request, SOCIII will return and/or <strong>delete</strong> Institution data within <strong>30 days</strong> and certify deletion — except student-owned records the student elects to retain in their own Vault.</p>

<h2>7. Student Rights &amp; State Privacy Laws</h2>
<p>SOCIII will assist the Institution in responding to student/parent requests to access, correct, or delete records consistent with FERPA. Where applicable, SOCIII acts as a <strong>service provider / processor</strong> under state privacy laws (e.g., CCPA/CPRA) and will not “sell” or “share” Institution data or use it outside providing the Services.</p>

<h2>8. Term &amp; Precedence</h2>
<p>This DPA lasts as long as SOCIII processes Institution data. On any conflict regarding data protection, this DPA prevails over the Terms of Service.</p>
`;
