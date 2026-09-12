function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Medical Tracker')
    .addItem('Create New Incident', 'showCreateIncidentPopup')
    .addItem('Show Sidebar', 'showSidebar')
    .addItem('Initialize Spreadsheet', 'initializeSpreadsheet')
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
    sheetName = `Staff - ${data.personName}`;
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
  } else {
    throw new Error("Template sheet not found. Please create a sheet named 'Template'.");
  }
  
  // Header Info
  sheet.getRange('B1').setValue(data.personName);
  sheet.getRange('B2').setValue(data.party || 'N/A');
  sheet.getRange('D2').setValue(data.role || 'N/A');
  sheet.getRange('B3').setValue(data.chiefComplaint);
  
  // Add first entry if provided
  if (data.presided && (data.situation || data.actionsTaken)) {
    addEntryToIncident(finalSheetName, {
      presided: data.presided,
      situation: data.situation,
      actionsTaken: data.actionsTaken,
      recommendations: data.recommendations
    });
  }
  
  // Update Summary
  updateSummary(data.personName, data.party, data.role, data.chiefComplaint, finalSheetName);
  
  return finalSheetName;
}

/**
 * Adds an entry to an existing incident sheet.
 */
function addEntryToIncident(sheetName: string, entryData: EntryData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  
  const lastRow = sheet.getLastRow();
  const nextRow = Math.max(lastRow + 1, 5);
  
  const timestamp = new Date();
  const values = [
    [entryData.presided, timestamp, entryData.situation, entryData.actionsTaken, entryData.recommendations]
  ];
  
  const range = sheet.getRange(nextRow, 1, 1, 5);
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
        const currentLog = data[i][6] || "";
        const timeStr = Utilities.formatDate(timestamp, ss.getSpreadsheetTimeZone(), "M/d/yyyy H:mm");
        
        let entryParts = [];
        if (entryData.situation) entryParts.push(entryData.situation);
        if (entryData.actionsTaken) entryParts.push("Actions: " + entryData.actionsTaken);
        if (entryData.recommendations) entryParts.push("Reccomendation: " + entryData.recommendations);
        
        const newEntryText = entryParts.join(" | ");
        const updatedLog = currentLog + (currentLog ? "\n" : "") + newEntryText;
        summarySheet.getRange(i + 1, 7).setValue(updatedLog);
        
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
    name, party, role, new Date(), "Active", hyperlink, `Cheif Complaint: ${complaint}.`
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
      situation: 'Incident Closed.',
      actionsTaken: 'Final Remark: ' + remark,
      recommendations: ''
    });
  }

  return getIncidentsData();
}
