# Auto Dealer — Sample Data Files

These files are used during onboarding when a prospect selects "Explore with sample data."

## Files:
- **dealer_inventory.pdf** — 30 vehicles (15 new Toyota/Honda, 15 used multi-brand). Includes 7 aging units (90+ days) to trigger AI insights.
- **customer_list.pdf** — 20 customers. Mix of lease, finance, web leads, expired leases, service overdue. Designed to trigger AI outreach recommendations.
- **service_schedule.pdf** — 17 appointments across one week. Includes upsell opportunities, recalls, and trade-up candidates.
- **fi_rate_sheet.pdf** — Finance rates by lender/tier (TMCC, Honda Financial, Ally, Capital One, Westlake) and full F&I product menu with retail/cost/gross.
- **sales_process_playbook.pdf** — 8-step sales process SOP with AI behavior notes. Pricing policies, aging inventory policy, lead response standards, communication rules. This demonstrates the "Business Playbooks" feature in the Rules page.

## Sample Business:
- Name: Sunshine Toyota Honda
- Location: Jacksonville, FL
- Type: Dual-franchise Toyota + Honda new car dealer with used car operations

## How they're used:
1. Prospect selects "Explore with sample data" during workspace creation
2. Platform loads these files and parses them into Firestore records tagged `source: "sample"`
3. AI delivers first-value insights based on the sample data
4. Prospect can clear sample data anytime via Settings or chat command "start fresh"
