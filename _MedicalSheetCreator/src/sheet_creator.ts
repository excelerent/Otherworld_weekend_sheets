function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Medical Tracker')
    .addItem('Create New Incident', 'showCreateIncidentPopup')
    .addItem('Show Sidebar (Extend)', 'showSidebar')
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
  if (!summarySheet) {
    summarySheet = ss.insertSheet('Summary', 0);
  } else {
    summarySheet.clear();
  }
  
  const headers = ["Person Involved", "Party", "Role", "Chief Complaint", "Last Update", "Status", "Sheet Link"];
  summarySheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#efefef');
  
  summarySheet.setFrozenRows(1);
  summarySheet.setColumnWidth(1, 150);
  summarySheet.setColumnWidth(2, 100);
  summarySheet.setColumnWidth(3, 100);
  summarySheet.setColumnWidth(4, 250);
  summarySheet.setColumnWidth(5, 150);
  summarySheet.setColumnWidth(6, 100);
  summarySheet.setColumnWidth(7, 200);
  
  ss.toast("Spreadsheet initialized.", "Medical Tracker");
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
    for (let i = 1; i < summaryData.length; i++) {
      const existingName = summaryData[i][0];
      const existingParty = summaryData[i][1];
      const existingRole = summaryData[i][2];
      const status = summaryData[i][5];
      
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
    sheetName = `${data.party}-${data.role}`;
  }
  
  // Ensure unique sheet name by adding timestamp if needed (though duplicate check should prevent this)
  const baseName = sheetName.substring(0, 25);
  sheetName = `${baseName} (${new Date().getTime()})`.substring(0, 31);
  const sheet = ss.insertSheet(sheetName);
  
  // Header Info
  sheet.getRange('A1').setValue('Name:').setFontWeight('bold');
  sheet.getRange('B1').setValue(data.personName);
  
  sheet.getRange('A2').setValue('Party:').setFontWeight('bold');
  sheet.getRange('B2').setValue(data.party || 'N/A');
  
  sheet.getRange('C2').setValue('Role:').setFontWeight('bold');
  sheet.getRange('D2').setValue(data.role || 'N/A');
  
  sheet.getRange('A3').setValue('Chief Complaint:').setFontWeight('bold');
  sheet.getRange('B3').setValue(data.chiefComplaint);
  
  // Action Log Table
  const logStartRow = 5;
  const headers = ["Presided", "Time", "Situation", "Actions Taken", "Future Recommendations"];
  sheet.getRange(logStartRow, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#d9d9d9')
    .setBorder(true, true, true, true, true, true);
  
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 300);
  
  // Add first entry if provided
  if (data.presided && (data.situation || data.actionsTaken)) {
    addEntryToIncident(sheetName, {
      presided: data.presided,
      situation: data.situation,
      actionsTaken: data.actionsTaken,
      recommendations: data.recommendations
    });
  }
  
  // Update Summary
  updateSummary(data.personName, data.party, data.role, data.chiefComplaint, sheetName);
  
  return sheetName;
}

/**
 * Adds an entry to an existing incident sheet.
 */
function addEntryToIncident(sheetName: string, entryData: EntryData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  
  const lastRow = sheet.getLastRow();
  const nextRow = Math.max(lastRow + 1, 6);
  
  const timestamp = new Date();
  const values = [
    [entryData.presided, timestamp, entryData.situation, entryData.actionsTaken, entryData.recommendations]
  ];
  
  sheet.getRange(nextRow, 1, 1, 5).setValues(values).setVerticalAlignment('top').setWrap(true);
  sheet.getRange(nextRow, 1, 1, 5).setBorder(true, true, true, true, true, true);
  
  // Data validation for "Who presided"
  const staff = getStaffData();
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(staff).build();
  sheet.getRange(nextRow, 1).setDataValidation(rule);
  
  // Update Summary Timestamp
  const summarySheet = ss.getSheetByName('Summary');
  if (summarySheet) {
    const data = summarySheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][6].indexOf(sheetName) !== -1 || (data[i][6].formula && data[i][6].formula.indexOf(sheetName) !== -1)) {
        summarySheet.getRange(i + 1, 5).setValue(timestamp);
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

  const nextRow = summarySheet.getLastRow() + 1;
  const sheetUrl = `#gid=${targetSheet.getSheetId()}`;
  const hyperlink = `=HYPERLINK("${sheetUrl}", "${sheetName}")`;
  
  summarySheet.getRange(nextRow, 1, 1, 7).setValues([[
    name, party, role, complaint, new Date(), "Active", hyperlink
  ]]);
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
  for (let i = 1; i < data.length; i++) {
    const link = data[i][6]; // Sheet Link column
    if (link && link.toString().indexOf(name) !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * Gets parties and staff for the form.
 */
function getFormData() {
  return {
    parties: getPartiesData().Parties.map(p => p.Party),
    staff: getStaffData()
  };
}
