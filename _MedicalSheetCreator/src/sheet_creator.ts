function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Otherworld')
    .addItem('Create New Incident', 'showCreateIncidentPopup')
    .addItem('Show Sidebar', 'showSidebar')
    .addItem('Initialize Spreadsheet', 'initializeSpreadsheet')
    .addSeparator()
    .addItem('Setup Installable Trigger', 'setupInstallableTrigger')
    .addToUi();
  
  // Automatically show sidebar on open
  showSidebar();
}

/**
 * Opens the popup to create a new incident.
 */
function showCreateIncidentPopup() {
  const html = HtmlService.createHtmlOutputFromFile('create_incident')
    .setTitle('Create New Incident')
    .setWidth(400)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'New Misadventure Report');
}

/**
 * Opens the sidebar with the medical form.
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('Extend Incident')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Initializes the spreadsheet with the Summary sheet.
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let summarySheet = ss.getSheetByName('Summary');
  
  const template = ss.getSheetByName('summarytemplate');
  if (!template) {
    throw new Error("summarytemplate sheet not found. Please create a sheet named 'summarytemplate'.");
  }

  if (summarySheet) {
    ss.deleteSheet(summarySheet);
  }
  summarySheet = template.copyTo(ss).setName('Summary');
  summarySheet.showSheet();
  ss.setActiveSheet(summarySheet);
  ss.moveActiveSheet(1);
  
  summarySheet.setFrozenRows(2);
  
  ss.toast("Summary sheet initialized from template.", "Medical Tracker");
}

interface IncidentData {
  personName: string;
  party: string;
  role: string;
  chiefComplaint: string;
  presided: string;
  situation: string;
  actionsTaken: string;
  recommendations: string;
}

interface EntryData {
  presided: string;
  offeredTransport: string;
  transportWhy: string;
  situation: string;
  actionsTaken: string;
  recommendations: string;
}

/**
 * Creates a new incident sheet and updates the summary.
 */
function createNewIncident(data: IncidentData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summarySheet = ss.getSheetByName('Summary');
  
  if (summarySheet) {
    const summaryData = summarySheet.getDataRange().getValues();
    for (let i = 2; i < summaryData.length; i++) {
      const existingName = summaryData[i][0];
      const existingParty = summaryData[i][1];
      const existingRole = summaryData[i][2];
      const status = summaryData[i][4]; // Index 4 (Column 5) is status
      
      if (status === "Active") {
        if (data.party === 'Staff' && data.role === 'Staff') {
          if (existingName === data.personName && existingParty === 'Staff' && existingRole === 'Staff') {
            throw new Error(`An active incident already exists for staff member: ${data.personName}`);
          }
        } else {
          if (existingParty === data.party && existingRole === data.role && existingParty !== 'Staff') {
            throw new Error(`An active incident already exists for ${data.party} - ${data.role}`);
          }
        }
      }
    }
  }

  let sheetName = '';
  if (data.party === 'Staff' && data.role === 'Staff') {
    sheetName = `${data.personName}: Staff`;
  } else {
    sheetName = `${data.personName}: ${data.party}-${data.role}`;
  }
  
  // Ensure unique sheet name
  let finalSheetName = sheetName;
  let counter = 1;
  while (ss.getSheetByName(finalSheetName)) {
    finalSheetName = `${sheetName} ${++counter}`;
  }
  
  const templateSheet = ss.getSheetByName('Template');
  let sheet: GoogleAppsScript.Spreadsheet.Sheet;
  
  if (templateSheet) {
    sheet = templateSheet.copyTo(ss).setName(finalSheetName);
    sheet.showSheet();
  } else {
    throw new Error("Template sheet not found. Please create a sheet named 'Template'.");
  }
  
  // Header Info
  sheet.getRange('B1').setValue(data.personName);
  sheet.getRange('B2').setValue(data.party || 'N/A');
  sheet.getRange('D2').setValue(data.role || 'N/A');
  sheet.getRange('B3').setValue(data.chiefComplaint);
  
  // Format the table (Rows 5-34)
  const medicalStaff = getMedicalStaffData();
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(medicalStaff).build();
  
  for (let i = 0; i < 30; i++) {
    const row = 5 + i;
    const rowRange = sheet.getRange(row, 1, 1, 8);
    
    // Alternating background colors
    if (i % 2 === 0) {
      rowRange.setBackground('#ffffff'); // Light
    } else {
      rowRange.setBackground('#f3f3f3'); // Slightly darker
    }
    
    // Dropdown for "Presided" in Column A
    sheet.getRange(row, 1).setDataValidation(rule);
  }

  // Add first entry if provided
  if (data.presided && (data.situation || data.actionsTaken)) {
    addEntryToIncident(finalSheetName, {
      presided: data.presided,
      offeredTransport: '',
      transportWhy: '',
      situation: data.situation,
      actionsTaken: data.actionsTaken,
      recommendations: data.recommendations
    });
  }
  
  // Update Summary
  updateSummary(data.personName, data.party, data.role, data.chiefComplaint, finalSheetName);
  
  // Push to Dashboard
  pushSummaryToDashboard();

  return finalSheetName;
}

/**
 * Adds an entry to an existing incident sheet.
 */
function addEntryToIncident(sheetName: string, entryData: EntryData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  
  const valuesInSheet = sheet.getRange("A5:A").getValues();
  let nextRow = 5;
  for (let i = 0; i < valuesInSheet.length; i++) {
    if (!valuesInSheet[i][0]) {
      nextRow = 5 + i;
      break;
    }
    if (i === valuesInSheet.length - 1) {
      nextRow = 5 + valuesInSheet.length;
    }
  }
  
  const timestamp = new Date();
  const values = [
    [entryData.presided, timestamp, entryData.situation, entryData.actionsTaken, entryData.recommendations, entryData.offeredTransport, entryData.transportWhy, ""]
  ];
  
  const range = sheet.getRange(nextRow, 1, 1, 8);
  range.setValues(values);
  sheet.getRange(nextRow, 2).setNumberFormat("M/d/yyyy H:mm");
  
  // Data validation for "Who presided"
  const staff = getStaffData();
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(staff).build();
  sheet.getRange(nextRow, 1).setDataValidation(rule);
  
  // Update Summary Timestamp and Summary Log
  const summarySheet = ss.getSheetByName('Summary');
  if (summarySheet) {
    const data = summarySheet.getDataRange().getValues();
    for (let i = 2; i < data.length; i++) {
      // Hyperlink is now in Column 6 (index 5)
      if (data[i][5].indexOf(sheetName) !== -1 || (data[i][5].formula && data[i][5].formula.indexOf(sheetName) !== -1)) {
        // Timestamp is now in Column 4 (index 3)
        summarySheet.getRange(i + 1, 4).setValue(timestamp);
        
        // Update Summary Log column (Column 7)
        let currentLog = (data[i][6] || "").toString();
        const timeStr = Utilities.formatDate(timestamp, ss.getSpreadsheetTimeZone(), "M/d/yyyy H:mm");
        
        let entryParts = [];
        if (entryData.situation) entryParts.push(entryData.situation);
        
        // Handle Urgent Care Y/N: Only once in the first line
        let transportStr = "";
        if (entryData.offeredTransport === 'Yes') {
          transportStr = "Offer UC: Y";
        } else if (entryData.offeredTransport === 'No') {
          transportStr = "Offer UC: N";
          if (entryData.transportWhy) transportStr += " (Why: " + entryData.transportWhy + ")";
        }

        if (transportStr) {
          // Update the first line (Chief Complaint line)
          const lines = currentLog.split('\n');
          const firstLine = lines[0];
          
          // Remove any existing " | Offer UC: ..." from the first line
          let cleanedFirstLine = firstLine.split(" | Offer UC:")[0];
          // Also handle the old "Urgent Care:" prefix if it exists to clean it up
          cleanedFirstLine = cleanedFirstLine.split(" | Urgent Care:")[0];
          
          lines[0] = `${cleanedFirstLine} | ${transportStr}`;
          currentLog = lines.join('\n');
        }
        
        if (entryData.actionsTaken) entryParts.push("Actions: " + entryData.actionsTaken);
        if (entryData.recommendations) entryParts.push("Reccomendation: " + entryData.recommendations);
        
        const contentText = entryParts.join(" | ");
        const newEntryText = `${entryData.presided} at ${timeStr} - ${contentText}`;
        const updatedLog = currentLog + (currentLog ? "\n" : "") + newEntryText;
        summarySheet.getRange(i + 1, 7).setValue(updatedLog);
        
        // Push to Dashboard
        pushSummaryToDashboard();

        break;
      }
    }
  }
}

/**
 * Updates the summary sheet with new incident info.
 */
function updateSummary(name: string, party: string, role: string, complaint: string, sheetName: string) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summarySheet = ss.getSheetByName('Summary');
  if (!summarySheet) return;
  
  const targetSheet = ss.getSheetByName(sheetName);
  if (!targetSheet) return;

  const lastRow = summarySheet.getLastRow();
  const nextRow = Math.max(lastRow + 1, 3);
  const sheetUrl = `#gid=${targetSheet.getSheetId()}`;
  const hyperlink = `=HYPERLINK("${sheetUrl}", "${sheetName}")`;
  
  const range = summarySheet.getRange(nextRow, 1, 1, 7);
  range.setValues([[
    name, party, role, new Date(), "Active", hyperlink, `Chief Complaint: ${complaint}.`
  ]]);
  summarySheet.getRange(nextRow, 4).setNumberFormat("M/d/yyyy H:mm");
}

/**
 * Server-side helper to get current sheet name for extension.
 */
function getCurrentSheetName() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();
}

/**
 * Server-side helper to check if current sheet is an incident sheet.
 */
function isIncidentSheet(name: string) {
  // Check if it matches "Staff - " or has a dash in it (for Party-Role)
  // or use the Summary sheet to verify if this sheet name is linked.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summarySheet = ss.getSheetByName('Summary');
  if (!summarySheet) return name.startsWith('Staff - ') || name.includes('-');
  
  const data = summarySheet.getDataRange().getValues();
  for (let i = 2; i < data.length; i++) {
    const linkFormula = summarySheet.getRange(i + 1, 6).getFormula(); // Column 6 (index 5) is hyperlink
    if (linkFormula && linkFormula.indexOf(`"${name}"`) !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * Activates a sheet by name.
 */
function selectSheet(sheetName: string) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    sheet.activate();
  }
}

/**
 * Gets parties and staff for the form.
 */
function getFormData() {
  return {
    parties: getPartiesData().Parties.map(p => p.Party),
    staff: getStaffData(),
    medicalStaff: getMedicalStaffData(),
    incidents: getIncidentsData()
  };
}

/**
 * Gets the list of incidents from the Summary sheet.
 */
function getIncidentsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const summarySheet = ss.getSheetByName('Summary');
    if (!summarySheet) return [];
    
    const data = summarySheet.getDataRange().getValues();
    const incidents = [];
    
    for (let i = 2; i < data.length; i++) {
      const name = data[i][0];
      const party = data[i][1];
      const role = data[i][2];
      const status = data[i][4]; // Index 4 (Column 5) is now status
      const linkFormula = summarySheet.getRange(i + 1, 6).getFormula(); // Column 6 (index 5) is hyperlink
      
      // Extract sheet name from HYPERLINK formula: =HYPERLINK("#gid=...", "SheetName")
      let sheetName = "";
      if (linkFormula) {
        const match = linkFormula.match(/",\s*"([^"]+)"\)/);
        if (match) {
          sheetName = match[1];
        }
      }
      
      if (!sheetName) {
        // Fallback to value if no formula or no match
        sheetName = data[i][5] ? data[i][5].toString() : ""; // Index 5 (Column 6)
      }
      
      if (sheetName) {
        incidents.push({
          name: name,
          party: party,
          role: role,
          status: status,
          sheetName: sheetName
        });
      }
    }
    return incidents;
  } catch (e: any) {
    console.error("Error in getIncidentsData: " + e.toString());
    return [];
  }
}

/**
 * Closes an incident.
 */
function toggleIncidentStatus(sheetName: string, newStatus: string, remark?: string) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summarySheet = ss.getSheetByName('Summary');
  if (!summarySheet) return;
  
  const data = summarySheet.getDataRange().getValues();
  for (let i = 2; i < data.length; i++) {
    const linkFormula = summarySheet.getRange(i + 1, 6).getFormula(); // Column 6 (index 5) is hyperlink
    if (linkFormula.indexOf(`"${sheetName}"`) !== -1) {
      summarySheet.getRange(i + 1, 5).setValue(newStatus); // Column 5 (index 4) is status
      break;
    }
  }
  
  if (newStatus === 'Closed' && remark) {
    addEntryToIncident(sheetName, {
      presided: 'System',
      offeredTransport: '',
      transportWhy: '',
      situation: 'Incident Closed.',
      actionsTaken: 'Final Remark: ' + remark,
      recommendations: ''
    });
  }

  return getIncidentsData();
}

/**
 * Syncs the Summary sheet to the EM Dashboard.
 * MUST be set up as an installable trigger to access other spreadsheets.
 */
function handleOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (!e) return;
  
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  
  // Check if it's an incident sheet
  if (isIncidentSheet(sheetName)) {
    const row = range.getRow();
    const col = range.getColumn();
    
    // Only process edits in the entry area (Rows 5+)
    if (row >= 5 && col <= 8) {
      // 1. If Column A (Presided) is changed and Column B (Time) is empty, fill Column B
      if (col === 1) {
        const presidedValue = range.getValue();
        const timeRange = sheet.getRange(row, 2);
        if (presidedValue && !timeRange.getValue()) {
          const now = new Date();
          timeRange.setValue(now);
          timeRange.setNumberFormat("M/d/yyyy H:mm");
        }
      }
      
      // 2. Rerun summary and dashboard push for ANY edit in A-G
      try {
        rebuildSummaryForSheet(sheetName);
        pushSummaryToDashboard();
      } catch (err: any) {
        console.error('Failed to update summary or push to dashboard:', err);
      }
    }
  } else if (sheetName === 'Summary') {
    // If Summary itself is edited, push to dashboard
    try {
      pushSummaryToDashboard();
    } catch (err: any) {
      console.error('Failed to push summary to dashboard:', err);
    }
  }
}

/**
 * Rebuilds the summary log for a specific incident sheet by reading all its entries.
 */
function rebuildSummaryForSheet(sheetName: string) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const summarySheet = ss.getSheetByName('Summary');
  if (!summarySheet) return;

  // Find the row in Summary for this sheet
  const summaryData = summarySheet.getDataRange().getValues();
  let summaryRowIndex = -1;
  for (let i = 2; i < summaryData.length; i++) {
    const linkFormula = summarySheet.getRange(i + 1, 6).getFormula();
    if (linkFormula && linkFormula.indexOf(`"${sheetName}"`) !== -1) {
      summaryRowIndex = i + 1;
      break;
    }
  }
  
  if (summaryRowIndex === -1) return;

  // Get incident data from header
  const complaint = sheet.getRange('B3').getValue();
  
  // Get all entries from Rows 5+
  const entriesRange = sheet.getRange(5, 1, Math.max(sheet.getLastRow() - 4, 1), 8);
  const entries = entriesRange.getValues();
  
  let logText = `Chief Complaint: ${complaint}.`;
  let latestTimestamp: Date | string = "";
  let transportInfo = "";

  for (let i = 0; i < entries.length; i++) {
    const presided = entries[i][0];
    const time = entries[i][1];
    const situation = entries[i][2];
    const actions = entries[i][3];
    const recs = entries[i][4];
    const offeredUC = entries[i][5];
    const whyUC = entries[i][6];

    if (!presided && !situation && !actions) continue;

    const timeStr = time instanceof Date ? Utilities.formatDate(time, ss.getSpreadsheetTimeZone(), "M/d/yyyy H:mm") : time;
    if (time instanceof Date) {
      if (!latestTimestamp || time > latestTimestamp) {
        latestTimestamp = time;
      }
    }

    // Capture transport info from the first entry that has it, or update it
    if (!transportInfo && offeredUC) {
      if (offeredUC === 'Yes') {
        transportInfo = "Offer UC: Y";
      } else if (offeredUC === 'No') {
        transportInfo = "Offer UC: N";
        if (whyUC) transportInfo += ` (Why: ${whyUC})`;
      }
    }

    let entryParts = [];
    if (situation) entryParts.push(situation);
    if (actions) entryParts.push("Actions: " + actions);
    if (recs) entryParts.push("Reccomendation: " + recs);
    
    const contentText = entryParts.join(" | ");
    const newEntryText = `${presided} at ${timeStr} - ${contentText}`;
    logText += "\n" + newEntryText;
  }

  if (transportInfo) {
    logText = logText.replace(`Chief Complaint: ${complaint}.`, `Chief Complaint: ${complaint}. | ${transportInfo}`);
  }

  summarySheet.getRange(summaryRowIndex, 7).setValue(logText);
  if (latestTimestamp) {
    summarySheet.getRange(summaryRowIndex, 4).setValue(latestTimestamp);
  }
}

/**
 * Creates an installable trigger for handleOnEdit if it doesn't exist.
 */
function setupInstallableTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'handleOnEdit') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  ScriptApp.newTrigger('handleOnEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  
  ss.toast("Installable handleOnEdit trigger created successfully.", "Setup");
}

const DASHBOARD_SPREADSHEET_ID = '1mrUuGQ3NBbI1rGQ9wPOo0kxs5Btk512mrlMW79rU5d0';

/**
 * Pushes the Summary sheet to the EM Dashboard.
 */
function pushSummaryToDashboard() {
  const sourceSs = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = sourceSs.getSheetByName('Summary');
  if (!sourceSheet) return;

  const sourceData = sourceSheet.getDataRange().getValues();
  if (sourceData.length === 0) return;

  const dashboardSs = SpreadsheetApp.openById(DASHBOARD_SPREADSHEET_ID);
  const targetSheetName = 'Medical_Import';
  
  let targetSheet = dashboardSs.getSheetByName(targetSheetName);
  if (!targetSheet) {
    targetSheet = dashboardSs.insertSheet(targetSheetName);
    targetSheet.hideSheet();
  }

  targetSheet.clearContents();
  targetSheet.getRange(1, 1, sourceData.length, sourceData[0].length).setValues(sourceData);
}
