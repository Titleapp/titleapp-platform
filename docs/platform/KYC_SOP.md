TitleApp KYC & Trust Verification SOP v1.1
(Including Token Creation & Governance Use Cases)
1. Purpose
This SOP defines when identity verification (KYC) is required across the TitleApp platform, including:
civilian (personal vault) usage,


tenant (business) usage, and


on-platform token creation for governance, utility, or other purposes.


The objective is to enable low-friction use while ensuring trust, auditability, and defensibility for actions that create value, authority, or systemic impact.

2. Core Principles
KYC is capability-based, not feature-based
 Verification is required when a user creates value, authority, or financial/governance impact — not merely by signing up.


One identity, reused across contexts
 A user who has completed KYC does not repeat verification for personal, tenant, or token-related actions unless verification expires.


Annual re-verification
 All KYC verifications expire after 12 months and must be refreshed to retain privileged access.


Least privilege by default
 Only users who can create binding records, tokens, or operational changes are required to verify identity.



3. KYC Levels (Conceptual)
KYC-0 — Unverified User
Email verified only.
Allowed:
Browse the platform


Create drafts


Store non-authoritative records


View data


Explore wallet features in read-only mode


Blocked:
Minting DTCs of value


Representing identity or credentials


Creating or deploying tokens


Operational automation


Financial or governance actions



KYC-1 — Individual Identity Verified
Identity verified for a natural person.
Allowed:
Mint Digital Title Certificates (DTCs) for assets of value


Mint DTCs representing identity or credentials


Create authoritative logbook entries


Create and deploy personal or tenant-scoped tokens


Use personal vault features fully


Participate in governance or voting systems backed by tokens


Blocked:
Business-wide automation


Tenant billing management


Worker deployment for business tenants



KYC-2 — Business / Operational Authority Verified
Identity verified and authority confirmed for a business tenant.
Allowed:
All KYC-1 permissions


Create and manage tenant-level tokens (governance, utility, HOA, legal workflows)


Update and approve Rules & Resources


Enable and manage AI workers


Configure lead automation


Manage billing and payments


Approve contracts, offers, escrows, and signatures


Represent the tenant in automated workflows



4. Civilian (Personal Vault) KYC Requirements
4.1 When KYC Is Required (Civilian)
KYC-1 is required when a civilian user attempts to:
Mint a Digital Title Certificate (DTC) for:


assets of value (property, vehicles, art, jewelry, equipment)


identity or credentials (pilot certificate, student ID, realtor license, professional licenses)


Create, deploy, or issue a token (including:


personal tokens


governance or voting tokens


utility tokens or memecoins)


Represent themselves as the authoritative holder or issuer of a record or token


Transfer, publish, or share a DTC or token with third parties


KYC is not required for:
Drafting records


Storing private notes


Viewing wallet functionality


Non-authoritative experimentation (no minting or issuance)



4.2 Token Creation Clarification (Civilian)
Token creation is treated as a high-trust action because it may:
represent value,


confer rights or governance power,


be shared externally,


or be relied upon by third parties.


Accordingly:
Any user creating a token must complete KYC-1


Token metadata must reference the verified identity of the issuer


Tokens created without KYC are not deployable or transferable


This applies even if the token is experimental, low-value, or not marketed.

4.3 Frequency
Identity verification is required once every 12 months


Previously verified users are not prompted again unless verification expires



5. Tenant (Business) KYC Requirements
5.1 Required Roles
KYC-2 is required for any user who can:
Act as Primary Admin


Create, deploy, or manage tenant-level tokens


Update or approve Rules & Resources


Approve contracts or operational documents


Enable AI workers or automation


Configure lead maturation systems


Arrange billing or make payments


Initiate escrows or financial workflows


Approve offers, contracts, or signatures


Typical roles requiring KYC-2:
Tenant owner


Managing broker


Dealer principal


HOA board administrator


Legal or compliance admin



5.2 Non-Privileged Roles
The following roles do not require KYC unless privileges escalate:
View-only users


Sales agents without approval authority


Draft-only users


Staff limited to read-only dashboards


If a user attempts a privileged action, KYC is triggered at the point of escalation.

6. KYC Trigger Model
KYC is triggered by intent and action, not by UI location.
Examples:
“Mint this DTC” → KYC-1


“Create a token” → KYC-1


“Create a tenant governance token” → KYC-2


“Approve this agreement” → KYC-2


“Enable lead automation” → KYC-2


“Create escrow” → KYC-1 (personal) or KYC-2 (business)


This ensures minimal friction with maximum trust.

7. Annual Re-Verification
All KYC verifications expire after 12 months


Upon expiration:


Users retain read-only access


Privileged actions are blocked


Re-verification restores prior permissions without altering historical records



8. Audit & Logging Requirements
Every KYC event must log:
user_id


tenant_id (if applicable)


KYC level achieved


verification provider


timestamp


expiration date


actions unlocked (e.g., token issuance, DTC minting)


KYC status must be queryable by:
Chat interface


Web UI


AI workers


Audit and compliance systems



9. Relationship to Other SOPs
This SOP governs:
Client Onboarding SOP


Rules & Resources SOP


AI Worker Creation SOP


Billing & Escrow SOP


Token & Wallet SOP


Lead Automation SOP


No endpoint may bypass the KYC requirements defined here.

10. Summary (Design Intent)
Token creation is a trust event and requires identity verification


Civilian users verify only when creating value or authority


Business tenants verify only those with real operational power


Previously completed KYC is reused across features


Verification refreshes annually


Automation, governance, and issuance are impossible without verified authority


This SOP defines who is trusted to issue, automate, and represent value on the TitleApp platform.

