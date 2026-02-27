# TitleApp Digital Worker Catalog

## Source of Truth
`TitleApp_Digital_Worker_Catalog.xlsx` is the master inventory for all Digital Workers.
The JSON file (`src/data/digitalWorkerCatalog.json`) is generated from this spreadsheet
and serves the landing page.

## Current Stats
- **354 Digital Workers** in the catalog
- **12 Suites**: Title & Escrow, Real Estate, Aviation Ops, Aviation Training,
  Part 91, EMS/Healthcare, Investment, Auto Dealer, Relocation, Mortgage,
  Construction, Legal
- **50 state coverage** for RE, Mortgage, and Construction
- **Clone potential**: 500+ from existing templates

## How Workers Get Added
1. **Manual (spreadsheet)**: Edit the xlsx, commit, regenerate JSON
2. **Automatic (Sandbox)**: When a developer publishes a Digital Worker through the
   Sandbox, a Firestore trigger updates the catalog collection and the Command Center
   inventory dashboard.

## Naming Convention
Worker IDs: `{suite}-{category}-{state}` in kebab-case
- `re-disclosure-ca` — Real Estate Disclosure, California
- `flight-crew-scheduler` — Aviation, national
- `mortgage-broker-fl` — Mortgage Broker, Florida
- `contract-review` — Legal, national

## Updating the Catalog
1. Edit spreadsheet → commit: `catalog: add [suite] workers`
2. Regenerate JSON: `node scripts/generateCatalogJSON.js`
3. Commit JSON: `catalog: regenerate landing page JSON`

## Price Ranges by Suite
| Suite | Range | Avg |
|-------|-------|-----|
| Title & Escrow | $19-49/mo | $32/mo |
| Real Estate | $9-19/mo | $14/mo |
| Aviation | $9-39/mo | $23/mo |
| Healthcare | $14-29/mo | $18/mo |
| Investment | $14-29/mo | $21/mo |
| Auto Dealer | $9-19/mo | $15/mo |
| Relocation | $9/mo | $9/mo |
| Mortgage | $29-39/mo | $33/mo |
| Construction | $19-79/mo | $38/mo |
| Legal | $9-39/mo | $25/mo |
| Platform | $19/mo | $19/mo |
