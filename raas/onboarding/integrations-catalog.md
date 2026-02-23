# Integrations Catalog

Status: All integrations are passive toggles (preference recording only). No OAuth or live connections yet.

## Auto Dealership

| ID | Name | Category | API Status |
|----|------|----------|-----------|
| cdk | CDK Global | DMS | Coming Soon |
| reynolds | Reynolds & Reynolds | DMS | Coming Soon |
| dealertrack | Dealertrack | DMS | Coming Soon |
| vauto | vAuto | Pricing | Coming Soon |
| autotrader | AutoTrader | Marketplace | Coming Soon |
| cargurus | CarGurus | Marketplace | Coming Soon |
| carfax | CARFAX | History Reports | Coming Soon |
| kbb | Kelley Blue Book | Valuation | Coming Soon |
| quickbooks | QuickBooks | Accounting | Coming Soon |
| salesforce | Salesforce | CRM | Coming Soon |

Data mapping: DMS connectors will sync inventory (VIN, stock number, pricing, days on lot), customer records, deal jackets, and service history. Marketplace connectors will push listings and pull leads.

## Real Estate

| ID | Name | Category | API Status |
|----|------|----------|-----------|
| mls | MLS / IDX Feed | Listings | Coming Soon |
| zillow | Zillow Premier | Marketplace | Coming Soon |
| dotloop | Dotloop | Transactions | Coming Soon |
| skyslope | SkySlope | Transactions | Coming Soon |
| appfolio | AppFolio | Property Mgmt | Coming Soon |
| buildium | Buildium | Property Mgmt | Coming Soon |
| quickbooks | QuickBooks | Accounting | Coming Soon |
| docusign | DocuSign | E-Sign | Coming Soon |
| canva | Canva | Marketing | Coming Soon |

Data mapping: MLS/IDX feeds sync listings (address, price, DOM, photos). Transaction tools sync deal timelines, document status, and closing checklists. PM tools sync units, tenants, leases, and maintenance.

## Investment / Analyst

| ID | Name | Category | API Status |
|----|------|----------|-----------|
| bloomberg | Bloomberg Terminal | Data | Coming Soon |
| pitchbook | PitchBook | Data | Coming Soon |
| capital-iq | S&P Capital IQ | Data | Coming Soon |
| preqin | Preqin | LP Data | Coming Soon |
| factset | FactSet | Analytics | Coming Soon |
| salesforce | Salesforce | CRM | Coming Soon |
| quickbooks | QuickBooks | Accounting | Coming Soon |
| docusign | DocuSign | E-Sign | Coming Soon |

Data mapping: Terminal feeds sync market data, company financials, and deal comps. LP data tools sync investor records and capital commitments. CRM syncs relationship tracking.

## Implementation Priority

1. QuickBooks (shared across all verticals)
2. MLS / IDX (real estate -- highest customer demand)
3. CDK Global (auto -- largest DMS market share)
4. PitchBook (analyst -- most common data source)

Each integration requires: OAuth flow, webhook registration, field mapping configuration, and sync schedule.
