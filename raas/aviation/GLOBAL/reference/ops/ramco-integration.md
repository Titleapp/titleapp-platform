# RAMCO Aviation Maintenance Software -- Operational Integration Guide

> Part 135 Reference Template -- White-labeled for generic operator use.
> Source knowledge derived from RAMCO v5.8 initial training materials.
> This guide covers pilot/crew daily interaction with RAMCO, NOT maintenance department administration.

---

## 1. Login and Access

### Desktop Access

- Launch RAMCO via the desktop shortcut or navigate to the RAMCO web application URL provided by your IT/maintenance department.
- Log in with your operator-assigned credentials.

### iPad / Tablet Access

- Open the **RAMCO APP** on the iPad (labeled "Ramco" in the app library).
- Log in with the same credentials used for desktop access.
- RAMCO v5.8 is the current version as of this writing.

> **Note (iPad):** Some reports (particularly the Aircraft Maintenance Due Report) may display a "Server Error" message when accessed through the iPad app. **Workaround:** Use the browser's "Request Desktop Site" option, then select **HTML & View** as the output format. This bypasses the app rendering issue and displays the report correctly.

---

## 2. Initial Setup -- Application Preferences

### First-Time Configuration

Complete these steps once after your first login. Settings persist across sessions and devices.

1. Navigate to **Setup > Application Preferences** (or equivalent menu path).
2. Launch the **Preference WIZARD**.
3. Set the Wizard mode to **Favorites** -- this configures RAMCO to show your most-used pages on the home screen for fast access.

### Recommended Favorites

Create a Favorites group and add the following pages:

| Page | Purpose |
|------|---------|
| **Aircraft Maintenance Due Report** | Shows upcoming scheduled maintenance for your assigned aircraft |
| **View Discrepancy** (MEL page) | Displays open discrepancies and MEL items for your aircraft |
| **Create Journey Log** | Opens a new journey log entry for flight recording |
| **Amend Journey Log** | Edit or correct a previously entered journey log |

### Personalizing Page Layouts

On any RAMCO data page (tables, reports, lists), you can customize the display:

- **Remove or add columns** -- Right-click column headers (or use the column configuration menu) to show/hide fields relevant to your needs.
- **Adjust column widths** -- Drag column borders to resize.
- **Set up once** -- Your personalization carries across all devices logged into your account. You do not need to re-configure on each device.
- Recommended: Personalize the **Fleet Operations Hub** and **Journey Log** pages first, as these are your most frequently used views.

---

## 3. Fleet Operations Hub

### Navigation

**Flight Operations > Flight Log > Fleet Operations Hub**

The Fleet Operations Hub is your primary daily interface in RAMCO. It provides a consolidated view of all aircraft in the fleet with key status information.

### Hub Features

- **Aircraft list** with tail numbers, current flight hours, cycles, and engine hours.
- **Search bar** -- Quickly locate a specific aircraft by tail number.
- **Quick Links** for each aircraft -- Access Due List, Discrepancies, Journey Logs, and other aircraft-specific pages with one click.
- **Status indicators** -- At-a-glance view of aircraft maintenance status, open discrepancies, and MEL items.

---

## 4. Daily Duties -- Pilot/Crew RAMCO Checks

Complete the following four checks at the beginning of every duty period (before accepting any flights):

### Check 1: Confirm Aircraft Data

- Compare the **paper logbook** (aircraft journey logbook) against RAMCO for the assigned aircraft.
- Verify that the following values match between paper and digital:
  - **Total flight hours** (airframe)
  - **Total cycles** (landings)
  - **Engine hours** (total time, time since overhaul if tracked)
- If discrepancies exist between paper and RAMCO, investigate and resolve before flight. Notify maintenance if the discrepancy cannot be resolved at the crew level.

### Check 2: Confirm Next Maintenance Due

- Open the **Aircraft Maintenance Due Report** (from Favorites or Fleet Operations Hub > Quick Links > Due List).
- Review the next scheduled maintenance event, including:
  - Type of maintenance (inspection, component replacement, AD compliance, etc.)
  - Due date or due hours/cycles
  - Estimated time until due based on current utilization
- If maintenance is due before your planned flights, coordinate with maintenance scheduling.

### Check 3: Confirm No Open Discrepancies

- Open the **Discrepancies** page for your aircraft (Fleet Operations Hub > click the Discrepancies column link for your aircraft).
- Review all open discrepancies. Verify:
  - Each discrepancy has a corresponding corrective action or deferral.
  - No new discrepancies have been entered since your last check.
  - Any discrepancies that were corrected are properly closed in RAMCO.

### Check 4: Confirm MEL Status

- From the Discrepancies page, filter by **Record Status > Deferred** to view all active MEL (Minimum Equipment List) items.
- Verify:
  - All active MEL items are correctly documented in both RAMCO and the paper logbook.
  - MEL expiration dates/intervals are current (no expired MELs).
  - Operating limitations associated with each MEL item are understood and will be followed for today's flights.

---

## 5. Common Errors

The following errors occur frequently and lead to discrepancies between paper logbooks and RAMCO. Be aware of these pitfalls:

### MELs Not Carried Forward in Paper Logbook

- When a new paper logbook is started (either at a maintenance event or when the old logbook is full), active MEL items must be **manually carried forward** into the new logbook.
- Failure to carry forward MELs means the paper logbook shows the aircraft as having no MEL items, while RAMCO correctly shows active MELs. This creates a dangerous discrepancy where a crew member relying only on the paper logbook may not be aware of operating limitations.

### MELs Not on the Due List

- The RAMCO **Due List** shows forecasted maintenance based on flight activity. The Due List does **NOT** automatically display:
  - Open discrepancies
  - MEL items that fall outside the forecasted date range
- Crews must check **both** the Due List (for scheduled maintenance) and the Discrepancy/MEL page (for active deferrals) during daily checks. Checking only the Due List will miss MEL items.

### New Logbooks Missing Carry-Forward Information

- Similar to the MEL carry-forward issue: when a new paper logbook is started, all current aircraft status information (flight hours, cycles, engine hours, configuration, installed equipment) must be accurately transcribed from the old logbook or from RAMCO.
- Missing or incorrect carry-forward data can cascade into maintenance tracking errors.

### Aircraft Swaps To/From Maintenance

- When an aircraft goes into or comes out of maintenance, the crew at the receiving base must verify that RAMCO reflects the current status:
  - Were any discrepancies corrected during maintenance?
  - Were any new discrepancies opened?
  - Were any MELs resolved or new MELs created?
  - Do the flight hours, cycles, and engine hours in RAMCO match the paper logbook that comes with the aircraft?
- Aircraft swaps are a high-error-rate event. Take extra time to verify data accuracy.

### Steps Done on Paper But Not in RAMCO (or Vice Versa)

- All entries must be made in **both** the paper logbook and RAMCO. An entry in one system but not the other creates a discrepancy that may not be caught until the next audit or daily check.
- Best practice: Complete the paper logbook entry first (per company SOP), then immediately enter the same data in RAMCO. Do not defer RAMCO entries.

---

## 6. Due List -- Detailed Procedure

### What the Due List Shows

The Due List is a **forecasted maintenance report** that projects upcoming maintenance events based on:

- Current aircraft flight hours, cycles, and calendar time
- Average daily utilization rate
- Scheduled inspection and component replacement intervals

### What the Due List Does NOT Show

- **Open discrepancies** (these are on the Discrepancy page, not the Due List)
- **MEL items outside the forecast range** (MELs that expire beyond the Due List date range will not appear)

### Generating a Due List

1. Navigate to the **Fleet Operations Hub**.
2. Locate your aircraft using the **search bar** (enter tail number).
3. Click **Quick Links > Due List** for your aircraft.
4. Click **Generate Due List** (or equivalent "Generate" / "Run Report" button).
5. The system will calculate and display forecasted maintenance items.
6. **Adjust the date range** as needed -- the default range may not capture all relevant items. Extend the range to at least 30 days (or per operator policy) to ensure no upcoming maintenance is missed.
7. Review all items on the Due List. Flag any items that will come due during your planned duty period.

---

## 7. Discrepancies -- Detailed Procedure

### Accessing Discrepancies

1. Navigate to the **Fleet Operations Hub**.
2. Locate your aircraft.
3. Click the **Discrepancies column link** for your aircraft (the number in the Discrepancies column is a clickable link).

### Reading the Discrepancy Page

- The Discrepancy page shows **all past discrepancies** for the aircraft, from oldest to most recent.
- By default, the list may be sorted oldest-first. **Sort the Date column in descending order** (newest first) to see the most recent discrepancies at the top.
- Each discrepancy entry includes:
  - Date reported
  - Description of the discrepancy
  - Record status (Open, Deferred, Closed)
  - Corrective action (if completed)
  - Deferral information (if deferred under MEL)

### Filtering for MELs

- From the Discrepancy page, use the **Record Status filter** and select **"Deferred"** to display only active MEL items.
- This filtered view shows all items that have been deferred under the Minimum Equipment List and are currently active.
- Review each deferred item for:
  - MEL category (A, B, C, D) and corresponding time limitation
  - Expiration date
  - Operating limitations and crew requirements
  - Whether the item has been carried forward in the paper logbook

---

## 8. Journey Logs

### Creating a Journey Log

1. From Favorites or the main menu, open **Create Journey Log**.
2. Enter the flight data:
   - Aircraft tail number
   - Date and time (departure and arrival, UTC or local per operator SOP)
   - Departure and arrival airports (ICAO identifiers)
   - Flight hours (hobbs or tach, per operator policy)
   - Cycles (landings)
   - Engine hours
   - Fuel (uplift and remaining, if tracked)
   - Flight type / mission code
3. Submit the journey log entry.

### Amending a Journey Log

- If an error is discovered in a previously submitted journey log, open **Amend Journey Log** from Favorites.
- Locate the entry to be corrected (by date, tail number, or flight number).
- Make the correction and submit. RAMCO maintains an audit trail of amendments.
- Notify maintenance scheduling if the amendment changes flight hours, cycles, or engine hours, as this may affect maintenance forecasting.

---

## 9. Best Practices

- **Paper and digital must agree.** Every entry in the paper logbook must have a corresponding entry in RAMCO, and vice versa. Discrepancies between the two systems are the single most common source of maintenance tracking errors.
- **Check RAMCO at the start of every duty period.** Do not rely solely on crew changeover briefings. Verify the data yourself.
- **When in doubt, call maintenance.** If anything in RAMCO does not match the paper logbook, or if a discrepancy or MEL item is unclear, contact the maintenance department before accepting the aircraft for flight.
- **Set up your Favorites and personalization once.** The initial 10 minutes of configuration saves significant time on every subsequent login.
- **Use the iPad workaround for Due Reports.** If you encounter a "Server Error" on the iPad, switch to Request Desktop Site and select HTML & View. This is a known issue with the current RAMCO version.

---

*This document is a white-labeled reference template. Operators must customize login URLs, form references, and fleet-specific procedures to match their own RAMCO installation and company SOPs before use.*
