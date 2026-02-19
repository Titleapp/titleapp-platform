# Real Estate — Data Model
# Path: raas/real-estate/data-model.md

---

## Core Entities

### Contacts
The universal entity. Every person in the system is a contact with a type.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| firstName | string | Yes | |
| lastName | string | Yes | |
| email | string | No | Primary email |
| phone | string | No | Primary phone |
| address | object | No | Current address |
| type | enum | Yes | buyer, seller, tenant, owner, vendor, agent, lender, inspector, attorney, other |
| subtype | string | No | buyer-lead, buyer-active, buyer-past, seller-prospect, seller-listed, tenant-applicant, tenant-current, tenant-past, owner-active, owner-prospect |
| source | enum | No | sphere, referral, zillow, realtor.com, web, sign_call, open_house, cold_call, social_media, mls, other |
| assignedTo | string | No | Agent/manager assigned |
| aiAssigned | boolean | No | Whether AI is handling this contact |
| tags | array | No | Flexible tagging |
| notes | string | No | Free-text notes |
| lastContact | timestamp | No | Date of last communication |
| nextAction | object | No | { action: string, dueDate: timestamp } |
| createdAt | timestamp | Yes | |
| source_tag | string | No | "sample" for demo data, "import" for imported, "manual" for created |

### Properties
Any real property — for sale, for rent, or managed.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| address | object | Yes | street, city, state, zip, county |
| type | enum | Yes | single_family, condo, townhome, duplex, triplex, fourplex, apartment, commercial, land, multi_family |
| subtype | string | No | For commercial: office, retail, industrial, mixed_use, warehouse |
| beds | number | No | |
| baths | number | No | |
| sqft | number | No | Living area |
| lotSize | number | No | In acres or sqft |
| yearBuilt | number | No | |
| garage | string | No | |
| pool | boolean | No | |
| hoa | object | No | { name, fee, frequency, contact } |
| features | array | No | Notable features |
| taxAssessedValue | number | No | |
| annualTaxes | number | No | |
| zoning | string | No | |
| floodZone | string | No | |
| status | enum | Yes | For sale: active, pending, under_contract, sold, withdrawn, expired. For rent: available, leased, occupied, maintenance, off_market |
| purpose | enum | Yes | sale, rental, both |

### Listings (for sale)
A property actively listed for sale.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| propertyId | string | Yes | Reference to property |
| sellerId | string | Yes | Reference to contact (seller) |
| agentId | string | Yes | Listing agent |
| listPrice | number | Yes | Current asking price |
| originalPrice | number | Yes | Initial list price |
| priceHistory | array | No | Array of { price, date, reason } |
| mlsNumber | string | No | MLS ID |
| listDate | timestamp | Yes | Date listed |
| expirationDate | timestamp | No | Listing agreement expiration |
| dom | number | Computed | Days on market |
| showingInstructions | string | No | Lockbox, appointment, etc. |
| commissionRate | number | No | Total commission % |
| coopRate | number | No | Buyer's agent commission % |
| listingAgreementType | enum | No | exclusive_right, exclusive_agency, open |
| virtualTourUrl | string | No | |
| photos | array | No | |
| description | string | No | MLS remarks |
| status | enum | Yes | active, pending, under_contract, sold, withdrawn, expired, coming_soon |

### Transactions
A deal in progress — can be a sale, purchase, or lease.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| type | enum | Yes | sale, purchase, lease |
| propertyId | string | Yes | |
| listingId | string | No | If linked to a listing |
| buyerId | string | No | Contact reference |
| sellerId | string | No | Contact reference |
| agentId | string | Yes | Primary agent |
| coAgentId | string | No | Co-operating agent |
| contractPrice | number | Yes | Agreed price |
| earnestMoney | number | No | Deposit amount |
| escrowAgent | string | No | Title company / escrow |
| lenderId | string | No | Buyer's lender contact |
| stage | enum | Yes | offer_submitted, under_contract, inspection, appraisal, title_review, clear_to_close, closing, closed, fell_through |
| dates | object | Yes | See Deadline Tracking below |
| commissionAmount | number | Computed | |
| notes | array | No | Transaction notes/timeline |

#### Deadline Tracking (dates object)
```json
{
  "offerDate": "timestamp",
  "acceptanceDate": "timestamp",
  "effectiveDate": "timestamp",
  "inspectionDeadline": "timestamp",
  "inspectionResolutionDeadline": "timestamp",
  "appraisalDeadline": "timestamp",
  "financingContingencyDeadline": "timestamp",
  "titleCommitmentDeadline": "timestamp",
  "closingDate": "timestamp",
  "possessionDate": "timestamp",
  "optionPeriodEnd": "timestamp (TX only)",
  "contingencyRemovalDeadline": "timestamp (CA)",
  "walkthrough": "timestamp",
  "extensionDates": []
}
```

### Units (property management)
Individual rentable units within a property.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| propertyId | string | Yes | Parent property |
| unitNumber | string | Yes | Unit identifier (A, B, 101, etc.) |
| beds | number | Yes | |
| baths | number | Yes | |
| sqft | number | No | |
| rent | number | Yes | Current monthly rent |
| marketRent | number | No | Estimated market rate |
| status | enum | Yes | occupied, vacant, maintenance, off_market |
| tenantId | string | No | Current tenant contact |
| leaseId | string | No | Current lease |
| lastTurnDate | timestamp | No | Last time unit was turned |
| amenities | array | No | Unit-specific features |
| notes | string | No | |

### Leases
Active or historical lease agreements.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| unitId | string | Yes | |
| propertyId | string | Yes | |
| tenants | array | Yes | Array of contact IDs |
| leaseType | enum | Yes | fixed, month_to_month, corporate, student, section_8 |
| startDate | timestamp | Yes | |
| endDate | timestamp | Yes (if fixed) | |
| monthlyRent | number | Yes | |
| securityDeposit | number | Yes | |
| petDeposit | number | No | |
| monthlyPetRent | number | No | |
| lateFeeAmount | number | Yes | |
| lateFeeGraceDays | number | Yes | |
| renewalTerms | object | No | { offered, newRent, newEndDate, status } |
| moveInDate | timestamp | No | |
| moveOutDate | timestamp | No | |
| status | enum | Yes | active, expired, terminated, renewed, pending |
| documents | array | No | Uploaded lease docs |

### Maintenance Requests
Work orders for property maintenance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| propertyId | string | Yes | |
| unitId | string | No | |
| tenantId | string | No | Who reported it |
| category | enum | Yes | plumbing, electrical, hvac, appliance, structural, pest, landscaping, cleaning, safety, general |
| priority | enum | Yes | emergency, high, medium, low |
| description | string | Yes | |
| photos | array | No | |
| status | enum | Yes | submitted, acknowledged, vendor_assigned, scheduled, in_progress, parts_ordered, completed, closed, cancelled |
| vendorId | string | No | Assigned vendor contact |
| estimatedCost | number | No | |
| actualCost | number | No | |
| scheduledDate | timestamp | No | |
| completedDate | timestamp | No | |
| ownerApproval | object | No | { required: boolean, approved: boolean, threshold: number } |
| notes | array | No | Work log entries |

### Vendors
Service providers for maintenance and operations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| contactId | string | Yes | Reference to contact |
| company | string | Yes | |
| specialty | array | Yes | plumbing, electrical, hvac, general, etc. |
| hourlyRate | number | No | |
| serviceArea | string | No | |
| insuranceExpiration | timestamp | No | |
| licenseNumber | string | No | |
| rating | number | No | Internal rating 1-5 |
| responseTime | string | No | avg response time |
| preferredFor | array | No | Properties where this vendor is preferred |

### Financial Records
Rent payments, expenses, owner distributions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| type | enum | Yes | rent_payment, late_fee, security_deposit, deposit_refund, maintenance_expense, management_fee, owner_distribution, other_income, other_expense |
| propertyId | string | Yes | |
| unitId | string | No | |
| contactId | string | No | Tenant or vendor |
| amount | number | Yes | |
| date | timestamp | Yes | |
| status | enum | Yes | pending, completed, failed, refunded |
| description | string | No | |
| category | string | No | For expenses: repairs, utilities, insurance, taxes, etc. |
