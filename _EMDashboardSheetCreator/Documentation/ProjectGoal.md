# Project Goal: EM Dashboard Sheet Creator (Google Sheets)

Our goal is to create a central hub for EM's and other staff to use during the event to get a bird's eye view of party progress. This tool will generate a Google Sheet using Google Apps Script.

## Inputs
We will take in information from the following JSON files:
* `Parties.json`: General information about each party (Companion, Staff Member, Background Color, Table Color, Text Color).
* `PartyPaths.json`: Encounter steps for each party.
* `ChargeTable.json`: Charge information for each party.

## Output
A Google Sheet created via Google Apps Script.
When rebuilding the sheets, all created sheets should be deleted, and the script should rebuild them.

## Sheet Structure

### Dashboard Sheet
* First sheet in the workbook.
* Party colors should be:
  * Arden #b6d7a8
  * Clairia #ffffff
  * Dolorón #ff9b9b
  * Elsewhich #cccccc
  * Glendeep #b7e1cd
  * Keer #c9daf8
  * Noctara #b4a7d6
  * P'loa #d0e0e3
  * Sythwan #fff2cc
  * Uri-Kesh #f4cccc
  * Waylon #fce5cd
* Central table showing Saturday/Sunday meal/vision status (checkboxes).
* Progress tracking:
    * **Party Path**: Shows "X/8" completed steps.
    * **Cup of Insight / Got Riddle?**: Shows "Yes!" or "No".
    * **Combat**: Counts completed monster groups.
    * **Open Issues**: Counts unresolved issues from the `Participants-Parties` sheet.

### Party Sheets
* One sheet per party.
* **Header**: Large party name and companion info.
* **Character Info Section (F2:H8)**:
    * Table starting at F2 with headers: Role, Name, Description.
    * Pushes character information (Caster, Keeper, etc.) from the imported tracker data.
    * Formatting: No border around the title row, no internal borders, but a solid 2pt border around the rest of the table (data rows F3:H8).
* **Party Path Table**: Starts at Row 9, Column A.
* **Charge Table**: Starts at Row 9, Column F.
* **Comments**: Aggregate notes from path, charge, and general notes sections.

### Tracking Sheets (Participants-Parties & Staff/Camp)
* Manually managed tables for issue tracking with automated formatting (conditional highlighting for long text, status-based coloring, etc.).
