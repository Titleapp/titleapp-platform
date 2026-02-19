# California Seller Disclosures
# Path: raas/real-estate/CA/disclosures.md

---

## California has the MOST extensive disclosure requirements in the US.

The AI must track delivery and receipt of ALL required disclosures. Missing a disclosure can void a transaction or create liability.

## Required Seller Disclosures

### Transfer Disclosure Statement (TDS)
- California Civil Code 1102-1102.17
- Seller's detailed disclosure of property condition
- Covers: structural, systems, environmental, neighborhood
- Must be delivered "as soon as practicable" — typically within 7 days of acceptance
- Buyer has 3 days to rescind after receiving TDS (5 days if mailed)

### Seller Property Questionnaire (SPQ)
- CAR form supplementing the TDS
- More detailed questions about property history, repairs, insurance claims
- Not legally required but industry standard

### Natural Hazard Disclosure (NHD)
- Required by law
- Usually obtained from a third-party NHD company ($75-$125)
- Covers: flood zones, earthquake fault zones, seismic hazard zones, fire hazard zones, dam inundation zones, tsunami zones
- AI auto-orders NHD report at listing

### Preliminary Title Report
- Not technically a "seller disclosure" but seller must provide
- Shows: liens, easements, CC&Rs, encumbrances
- Buyer reviews for title issues

### Lead-Based Paint Disclosure (federal)
- Pre-1978 homes
- Standard federal disclosure

### Megan's Law Disclosure
- California requires disclosure that the Megan's Law database exists
- Does NOT require disclosing whether a sex offender lives nearby
- Standard language included in purchase agreement

### Earthquake Safety Disclosures
- Residential Earthquake Hazards Report (for pre-1960 wood-frame homes)
- Earthquake fault zone notification (from NHD)
- Seismic hazard zone notification (from NHD)

### Fire Hazard Disclosures
- State Fire Responsibility Area (SRA)
- Very High Fire Hazard Severity Zone (VHFHSZ)
- Defensible space requirements
- AI flags: "This property is in a Very High Fire Hazard Severity Zone. Buyer should verify insurance availability and cost."

### Local Disclosures (vary by city/county)
- Some cities require additional disclosures: rent control status, seismic retrofit requirements, sewer lateral inspections
- San Francisco: extensive additional disclosures
- Los Angeles: additional retrofit and local ordinance disclosures
- AI loads city-specific disclosure requirements based on property location

### HOA Disclosures (if applicable)
- CC&Rs, bylaws, rules
- Financial statements, budget, reserves
- Pending assessments or litigation
- Minutes from recent board meetings
- Buyer has right to cancel within specified period after receiving HOA docs

### Water-Related Disclosures
- Well water notification
- Private sewage disposal system
- Water conserving plumbing fixtures
- Supplemental property tax notice

## AI Behavior for CA Disclosures
- Generate disclosure checklist at listing based on property characteristics
- Track delivery of each disclosure with timestamps
- Track buyer acknowledgment/receipt
- Calculate rescission periods after delivery
- Flag: any disclosure not yet delivered → "MISSING: TDS not yet delivered, 12 days since acceptance"
- This is ONE OF THE MOST CRITICAL AI functions in California real estate
