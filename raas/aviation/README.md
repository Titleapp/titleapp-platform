# Aviation Vertical — RAAS

This vertical handles pilot credentials, flight training, and ongoing logbook records.

## Core Pattern: Pilot DTC + Flight Logbook

**Pilot DTC** (Digital Title Certificate):
- Immutable credential record
- Training history, certifications, type ratings
- Medical certificate, PRIA records
- Blockchain-anchored for verifiability
- Shareable with employers, insurance, charter operators

**Flight Logbook**:
- Ongoing flight entries (manual or API-sourced)
- Appends to DTC to keep totals current
- Tracks currency requirements (90-day, IFR, night, etc.)
- Integrates with ForeFlight, Jeppesen, Garmin Pilot

## Onboarding Flow

1. **Quick Start**: Just name and pilot certificate number
2. **Full Setup** (optional):
   - Upload certificates (PPL, IFR, Commercial, ATP, etc.)
   - Upload medical certificate
   - Upload logbook (PDF or CSV from ForeFlight)
   - Enter type ratings
   - Request PRIA records from FAA

3. **API Integrations** (optional):
   - ForeFlight sync for automatic logbook updates
   - Jeppesen integration
   - FAA Airmen Registry verification

## Workflows

- `create_pilot_dtc_v0` - Generate DTC from pilot credentials
- `verify_certificates_v0` - Cross-check against FAA Airmen Registry
- `calculate_currency_v0` - Check 90-day, IFR, night currency
- `pria_request_v0` - Generate PRIA records request
- `logbook_import_v0` - Parse ForeFlight/Jeppesen exports

## Rulesets

- `pilot_onboarding_v0` - Credential collection and validation
- `flight_entry_validation_v0` - Validate logbook entries
- `currency_enforcement_v0` - Flag expired currency

## Templates

- `pilot_dtc_v0` - Pilot credential DTC structure
- `flight_log_entry_v0` - Flight logbook entry structure
- `medical_certificate_v0` - Medical cert structure
- `pria_response_v0` - PRIA records format

## FAA Integration

Uses public FAA Airmen Registry API to verify:
- Certificate number validity
- Ratings held
- Medical class and expiration
- No revocations/suspensions

**API**: https://amsws.faa.gov/
