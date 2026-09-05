# Project Goal: EM Dashboard Sheet Creator (Google Sheets)

Our goal is to create a central monitoring dashboard for Event Managers (EMs) to track party progress, meal participation, combat status, and open issues during the event. This tool generates a Google Sheet using Google Apps Script.

## Inputs
We take in information from the following JSON files (sourced from `src/data.ts`):
* `PartyPaths.json`: Encounter flags for each party (PathItem, Riddle, Insight).
* `ChargeTable.json`: Charge summaries and character requirements.
* `Parties.json`: General party info (Companion, Staff, Colors).
* Imported Data: Data is automatically pushed from individual Party Trackers to `_Import` sheets in this dashboard.

## Output
A Google Sheet created via Google Apps Script. The script is written in TypeScript and deployed using `clasp`.

## Sheet Structure

### Dashboard Sheet
The main hub for event oversight.
* **Frozen Rows:** First two rows are frozen.
* **Saturday/Sunday tracking:** Checkboxes for Breakfast, Vision, Lunch, and Dinner.
* **Party Path Progress:** Calculated as `X/8` based on completed steps in imported party sheets that have the `PathItem` flag.
* **Cup of Insight / Got Riddle?:** Displays "Yes!" or "No" based on whether any completed steps in the party sheet have the `Insight` or `Riddle` flags.
* **Combat:** Counts the number of successful combats from the `Combat_Import` sheet.
* **Open Issues:** Counts unresolved issues for each party from the `Participants-Parties` tracking sheet.
* **Formatting:**
  * Each party row is colored using its `BackgroundColor` and `TextColor`.
  * "Yes!" cells in Insight and Riddle columns are highlighted in bright green (`#00ff00`).

### Party Sheets
Individual sheets for each party (named `{PartyName}_Party Sheet`).
* **Header:** Displays Party Name, Charge title, Companion, and dream/riddle placeholders.
* **Character Info Table (F2:H8):** Pulls Role, Name, and Description from imported tracker data.
* **Party Path Table (Column A:9):** Displays "Yes!/No" status for encounters, staff name, time, and items.
* **Charge Table (Column F:9):** Groups charge characters, shows completion status, and highlights if "Need" requirements are met.
* **Comments Section:** Aggregates all notes and comments from the party tracker.
* **Formatting:**
  * Tables (Character Info, Party Path, Charge, Comments) have a solid thick black border (2pt) around data rows.
  * Headers are bold and centered.
  * Conditional formatting highlights completed steps in green and missing requirements in red.

### Tracking Sheets
Centralized logs for issues and medical entries.
* **Participants-Parties:** Tracks participant issues (Opened Day/Time, Party, Job, Status, Priority, Situation, Medical Log, Type).
* **Staff/Camp:** Tracks staff-related issues.
* **Formatting:**
  * Row heights are set to 80px for readability.
  * Conditional formatting for "High" priority (Red), "Hopefully fixed" status (Grey), and long text in Situation/Medical Log (Orange).
  * Situation and Medical Log columns have standard borders.

## Script Functions & Menu
The tool adds an **EM Dashboard** menu to the spreadsheet:
* **Rebuild All Sheets:** Performs a full reconstruction of all dashboard, party, and tracking sheets.
* **Rebuild Dashboard Tab ONLY:** Refreshes only the main Dashboard summary without touching other sheets.
* **Setup Tracking Sheets:** Dedicated options to format and validate the `Participants-Parties` and `Staff/Camp` sheets.
* **Automation:** The dashboard relies on data imported via hidden `_Import` sheets, which are populated by the Party Trackers' export routine.