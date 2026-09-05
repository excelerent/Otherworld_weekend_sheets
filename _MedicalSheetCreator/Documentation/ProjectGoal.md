# Project Goal: Medical Sheet Creator (Google Sheets)

Our goal is to build a Google Sheets-based medical event tracking system to capture medical incidents occurring during the weekend. This tool will serve as a digital version of the "Misadventure Report" used by medical staff, providing a central database for all incidents.

## Output
A Google Spreadsheet that acts as a database and incident log. The script will be written in TypeScript and deployed using `clasp`.

## Spreadsheet Structure

### Database Summary
(To be defined in detail later, but will serve as a summary of all incidents).

### Incident Sheets
Each incident will have its own dedicated tab, formatted with the following information:
*   **Person Involved:** Name of the individual.
*   **Participant Info:** If applicable, their Party and Role.
*   **Chief Complaint:** A short description (1-5 words) of the initial problem.
*   **Action Log:** A table recording all actions taken:
    *   **Presided:** Dropdown to select the staff member who handled the entry.
    *   **Time:** Autopopulated timestamp.
    *   **Situation:** Description of the current state.
    *   **Actions Taken:** A list of specific actions performed.
    *   **Future Recommendations:** Notes on follow-up care or precautions.

## Web Interface (Sidebar Form)
A custom web interface will be provided within a Google Sheets sidebar to facilitate data entry, mimicking the paper "Misadventure Report".

### Features:
*   **Menu Item:** A custom menu in Google Sheets to launch the Medical Form.
*   **Create New Incident:** A form to start a new incident record (creating a new tab).
*   **Extend Existing Incident:** A "plus" button or similar interface on the sidebar to add a new log entry to the currently active or selected incident sheet.
*   **Side Panel Integration:** The form will open in the Google Sheets side panel for easy access while viewing the spreadsheet.

## Dashboard Integration
*   Incidents will be automatically summarized and forwarded to the **EM Dashboard** (a separate spreadsheet).
*   The exact format for the summary export will be defined at a later stage.

## Technical Requirements
*   **Google Apps Script:** Uses the Spreadsheet service and HTML service for the sidebar.
*   **TypeScript:** Source code in `src/` compiled to `dist/`.
*   **Clasp:** For pushing code to the Apps Script project.
*   **Triggers:** May use `onOpen` for the menu and other triggers for automated summary updates.
