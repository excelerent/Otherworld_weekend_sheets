interface Party {
    Party: string;
    StaffMemberName: string;
    CompanionName: string;
    BackgroundColor: string;
    TableColor: string;
    TextColor: string;
}

interface PathEncounter {
    party: string;
    staff: string;
    time: string;
    item: string;
    PathItem?: boolean;
    Insight?: boolean;
    Riddle?: boolean;
}

interface Character {
    CharacterName: string;
    Conditions: string;
}

interface Group {
    Summary: string;
    CriticalAmount: string;
    Characters: Character[];
}

interface Charge {
    Title: string;
    Party: string;
    Groups: Group[];
}

declare function getPartiesData(): { Parties: Party[] };
declare function getPathsData(): PathEncounter[];
declare function getChargesData(): { Charges: Charge[] };
declare function getAllStaffData(): string[];

function createDashboardSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const PARTIES_DATA = getPartiesData();
    const PATHS_DATA = getPathsData();
    const CHARGES_DATA = getChargesData();

    // 1. Delete all existing sheets
    const sheets = ss.getSheets();
    
    // Create a temporary sheet to allow deleting others
    const tempSheet = ss.insertSheet('TempSheet');
    
    sheets.forEach(sheet => {
        const name = sheet.getName();
        if (name.endsWith('_Import') || name === 'Participants-Parties' || name === 'Staff/Camp') return;
        
        try {
            ss.deleteSheet(sheet);
        } catch (e) {
            console.error("Could not delete sheet: " + name, e);
        }
    });

    // Ensure tracking sheets exist
    setupParticipantsPartiesSheet();
    setupStaffCampSheet();

    // Create Dashboard sheet as the first sheet
    buildDashboardSheet(ss, PARTIES_DATA.Parties, PATHS_DATA);

    // Iterate through parties and build sheets
    PARTIES_DATA.Parties.forEach(party => {
        buildPartySheets(ss, party, PATHS_DATA, CHARGES_DATA);
    });

    // Create Combat_Import sheet if it doesn't exist
    if (!ss.getSheetByName('Combat_Import')) {
        ss.insertSheet('Combat_Import').hideSheet();
    }
    
    // Delete TempSheet
    ss.deleteSheet(tempSheet);
    
    ss.toast("Dashboard sheets rebuilt successfully.", "EM Dashboard");
}

/**
 * Rebuilds ONLY the Dashboard tab, without touching any other sheets.
 */
function rebuildDashboardOnly() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const PARTIES_DATA = getPartiesData();
    const PATHS_DATA = getPathsData();
    
    buildDashboardSheet(ss, PARTIES_DATA.Parties, PATHS_DATA);
    
    ss.toast("Dashboard tab rebuilt successfully.", "EM Dashboard");
}

function buildDashboardSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, parties: Party[], encounters: PathEncounter[]) {
    const sheetName = 'Dashboard';
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) {
        sheet.clear();
    } else {
        sheet = ss.insertSheet(sheetName, 0);
    }

    // Freeze header rows
    sheet.setFrozenRows(2);

    // Set Column Widths
    sheet.setColumnWidth(1, 150); // Party
    sheet.setColumnWidth(2, 80);  // Saturday Breakfast
    sheet.setColumnWidth(3, 80);  // Saturday Vision
    sheet.setColumnWidth(4, 80);  // Saturday Lunch
    sheet.setColumnWidth(5, 80);  // Saturday Dinner
    sheet.setColumnWidth(6, 80);  // Sunday Breakfast
    sheet.setColumnWidth(7, 80);  // Sunday Vision
    sheet.setColumnWidth(8, 100); // Party Path
    sheet.setColumnWidth(9, 100); // Cup of Insight
    sheet.setColumnWidth(10, 100); // Got Riddle?
    sheet.setColumnWidth(11, 80);  // Combat
    sheet.setColumnWidth(12, 100); // Open Issues
    sheet.setColumnWidth(13, 100); // Got Riddle Item

    // Row 1: Merge cells for Saturday and Sunday
    sheet.getRange("B1:E1").merge().setValue("Saturday").setHorizontalAlignment("center").setFontWeight("bold");
    sheet.getRange("F1:G1").merge().setValue("Sunday").setHorizontalAlignment("center").setFontWeight("bold");
    sheet.getRange("1:1").setFontWeight("bold");

    // Row 2: Headers
    const headers = [
        "Party", "Breakfast", "Vision", "Lunch", "Dinner", "Breakfast", "Vision", 
        "Party Path", "Cup of insight", "Got Riddle?", "Combat", "Open Issues", "Got Riddle Item"
    ];
    sheet.getRange(2, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setHorizontalAlignment("center");

    parties.forEach((party, index) => {
        const row = index + 3;
        const partyName = party.Party;
        const importSheetName = `${partyName}_Import`;
        const escapedImportSheetName = importSheetName.replace(/'/g, "''");
        const bgColor = getHexColor(party.BackgroundColor);
        const textColor = getHexColor(party.TextColor);

        // Party Row Formatting
        const rowRange = sheet.getRange(row, 1, 1, headers.length);
        rowRange.setBackground(bgColor).setFontColor(textColor);

        // Party Name
        sheet.getRange(row, 1).setValue(partyName).setFontWeight("bold");

        // Saturday/Sunday Checkboxes
        sheet.getRange(row, 2, 1, 6).insertCheckboxes();
        
        // Party Path (X/8)
        // look for any step that is completed (TRUE) and has a p in column D
        // In the import sheet for a given party, for each Party Path encounter - columns B tells you if the party has completed that step, and column D tells you what the step pertains to
        const partyEncounters = encounters.filter(e => e.party === partyName);
        const trackerDataStartRow = 5;
        const pIndices: number[] = [];
        const iIndices: number[] = [];
        const rIndices: number[] = [];

        partyEncounters.forEach((e, i) => {
            const rowIdx = trackerDataStartRow + i;
            if (e.PathItem) pIndices.push(rowIdx);
            if (e.Insight) iIndices.push(rowIdx);
            if (e.Riddle) rIndices.push(rowIdx);
        });

        const pFormula = pIndices.length > 0 ? pIndices.map(idx => `IF('${escapedImportSheetName}'!B${idx}, 1, 0)`).join("+") : "0";
        sheet.getRange(row, 8).setFormula(`=(${pFormula}) & "/8"`).setHorizontalAlignment("center");

        // Cup of Insight (Yes!/No)
        const iFormula = iIndices.length > 0 ? iIndices.map(idx => `IF('${escapedImportSheetName}'!B${idx}, 1, 0)`).join("+") : "0";
        sheet.getRange(row, 9).setFormula(`=IF((${iFormula})>0, "Yes!", "No")`).setHorizontalAlignment("center");

        // Got Riddle? (Yes!/No)
        const rFormula = rIndices.length > 0 ? rIndices.map(idx => `IF('${escapedImportSheetName}'!B${idx}, 1, 0)`).join("+") : "0";
        sheet.getRange(row, 10).setFormula(`=IF((${rFormula})>0, "Yes!", "No")`).setHorizontalAlignment("center");

        // Combat
        // In the import sheet for combat, for each party count the number of true (TRUE) in the parties column.
        const combatColIdx = index + 2; // Combat_Import: A=Monster, B=Party1...
        const combatColLetter = String.fromCharCode(64 + combatColIdx);
        sheet.getRange(row, 11).setFormula(`=COUNTIF('Combat_Import'!${combatColLetter}:${combatColLetter}, TRUE)`).setHorizontalAlignment("center");

        // Open Issues
        // This column should be a count of the number of issues in the Participants-Parties sheet that are not yet resolved for a party.
        sheet.getRange(row, 12).setFormula(`=COUNTIFS('Participants-Parties'!$C:$C, "${partyName}", 'Participants-Parties'!$E:$E, "<>Hopefully fixed")`).setHorizontalAlignment("center");

        // Got Riddle Item (Checkbox)
        sheet.getRange(row, 13).insertCheckboxes();
    });

    // Add conditional formatting for Cup of Insight and Got Riddle? columns
    const insightAndRiddleRange = sheet.getRange(3, 9, parties.length, 2);
    const rule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("Yes!")
        .setBackground("#00ff00")
        .setRanges([insightAndRiddleRange])
        .build();
    const rules = sheet.getConditionalFormatRules();
    rules.push(rule);
    sheet.setConditionalFormatRules(rules);
}

function buildPartySheets(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, party: Party, pathsData: PathEncounter[], chargesData: { Charges: Charge[] }) {
    const partyName = party.Party;
    const importSheetName = `${partyName}_Import`;
    const escapedImportSheetName = importSheetName.replace(/'/g, "''");
    const partySheetName = `${partyName}_Party Sheet`;

    // 2. Ensure Import Sheet exists
    let importSheet = ss.getSheetByName(importSheetName);
    if (!importSheet) {
        importSheet = ss.insertSheet(importSheetName);
        importSheet.hideSheet();
    }

    // 3. Create Party Sheet
    const sheet = ss.insertSheet(partySheetName);
    const bgColor = getHexColor(party.BackgroundColor);
    const tableColor = getHexColor(party.TableColor);
    const textColor = getHexColor(party.TextColor);

    // sheet.setTabColor(bgColor);

    // Column widths (Updated per ProjectGoal.md)
    sheet.setColumnWidth(1, 80);  // A
    sheet.setColumnWidth(2, 120); // B
    sheet.setColumnWidth(3, 120); // C
    sheet.setColumnWidth(4, 200); // D
    sheet.setColumnWidth(5, 20);  // E
    sheet.setColumnWidth(6, 80);  // F
    sheet.setColumnWidth(7, 120); // G
    sheet.setColumnWidth(8, 300); // H
    sheet.setColumnWidth(9, 80);  // I
    sheet.setColumnWidth(10, 1);  // J
    sheet.hideColumns(10);

    // Title Section
    const titleRange = sheet.getRange("1:1");
    titleRange.setFontColor("black").setFontSize(27).setFontWeight("bold");
    sheet.getRange("A1").setValue(partyName.toUpperCase());
    
    sheet.setFrozenRows(1);

    // Info Section (starting Row 2)
    const partyCharge = chargesData.Charges.find(c => c.Party === partyName);
    const chargeTitle = partyCharge ? partyCharge.Title : "N/A";

    sheet.getRange("A2").setValue(`Investigating the charge against: ${chargeTitle}`).setFontSize(10).setBackground("white").setFontColor("black");
    sheet.getRange("A3").setValue(`Companion: ${party.CompanionName} (${party.StaffMemberName})`).setFontSize(10).setBackground("white").setFontColor("black");
    sheet.getRange("A4").setValue(`Keepers Saturday Morning dream :{keeper saturday morning dream}`).setFontSize(10).setBackground("white").setFontColor("black");
    sheet.getRange("A5").setValue(`Riddle: {Riddle summary}`).setFontSize(10).setBackground("white").setFontColor("black");
    sheet.getRange("A6").setValue(`Keepers Sunday Afternoon dream: {keeper sunday morning dream}`).setFontSize(10).setBackground("white").setFontColor("black");

    // Character Info Section (Column F2-H8)
    const roles = ['Caster', 'Keeper', 'Maker', 'Ranger', 'Seeker', 'Traveler'];
    sheet.getRange("F2").setValue("Role").setFontWeight("bold");
    sheet.getRange("G2").setValue("Name").setFontWeight("bold");
    sheet.getRange("H2").setValue("Description").setFontWeight("bold");
    
    roles.forEach((role, i) => {
        const row = 3 + i;
        sheet.getRange(row, 6).setFormula(`='${escapedImportSheetName}'!F${4 + i}`);
        sheet.getRange(row, 7).setFormula(`='${escapedImportSheetName}'!G${4 + i}`);
        sheet.getRange(row, 8).setFormula(`='${escapedImportSheetName}'!H${4 + i}`);
    });
    // Border around the data rows (F3:H8) - solid 2pt (SOLID_THICK)
    sheet.getRange(3, 6, 6, 3).setBorder(true, true, true, true, false, false, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);

    // Party Path Table (Starts Row 9)
    const pathStartRow = 9;
    const pathHeader = ["Complete?", "Staff", "Time", "Items to Give"];
    const pathHeaderRange = sheet.getRange(pathStartRow, 1, 1, 4);
    pathHeaderRange.setValues([pathHeader]).setFontWeight("bold").setHorizontalAlignment("center");

    const partyEncounters = pathsData.filter(e => e.party === partyName);
    if (partyEncounters.length > 0) {
        const pathData = partyEncounters.map((e, i) => {
            const trackerDataStartRow = 5;
            const rowIdx = trackerDataStartRow + i;
            
            return [
                `=IF('${escapedImportSheetName}'!B${rowIdx}, "Yes!", "No")`,
                e.staff,
                e.time,
                e.item || "--"
            ];
        });
        const pathDataRange = sheet.getRange(pathStartRow + 1, 1, pathData.length, 4);
        // We use setValues for the whole row because only column 1 is a formula now
        // But setFormulas is also fine as long as the strings are just values
        pathDataRange.setValues(pathData);
        
        // Formatting Path Table
        // Title Row: bold and centered.
        pathHeaderRange.setFontWeight("bold").setHorizontalAlignment("center");

        // Complete column should be centered
        sheet.getRange(pathStartRow + 1, 1, pathData.length, 1).setHorizontalAlignment("center");
        
        // The entire table, save for the title row: should be surrounded by a black 2pt border.
        pathDataRange.setBorder(true, true, true, true, false, false, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);

        // Conditional formatting for Path Table
        const fullTableRange = sheet.getRange(pathStartRow + 1, 1, pathData.length, 4);
        
        const rules = sheet.getConditionalFormatRules();
        // If Complete is Yes!, the Yes! cell should be colored dark green (#6aa84f)
        rules.push(SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied(`=$A${pathStartRow + 1}="Yes!"`)
            .setBackground("#6aa84f")
            .setRanges([sheet.getRange(pathStartRow + 1, 1, pathData.length, 1)])
            .build());
        // If Complete is Yes!, the entire row should be colored green (#b7d7a8)
        rules.push(SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied(`=$A${pathStartRow + 1}="Yes!"`)
            .setBackground("#b7d7a8")
            .setRanges([fullTableRange])
            .build());
        // If Complete is No, the cell for Complete should be colored red (#f7a8a8), but the rest of the row should be white.
        rules.push(SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied(`=$A${pathStartRow + 1}="No"`)
            .setBackground("#f7a8a8")
            .setRanges([sheet.getRange(pathStartRow + 1, 1, pathData.length, 1)])
            .build());
        sheet.setConditionalFormatRules(rules);
    }

    // Charge Table (Column F, starting Row 9)
    const chargeStartRow = 9;
    const chargeHeader = ["Complete?", "Staff", "Info to Give", "Bloc Requirements"];
    const chargeHeaderRange = sheet.getRange(chargeStartRow, 6, 1, 4);
    chargeHeaderRange.setValues([chargeHeader]).setFontWeight("bold").setHorizontalAlignment("center");

    let totalChargeRows = 0;
    if (partyCharge) {
        let currentRow = chargeStartRow + 1;
        
        const trackerPathCount = partyEncounters.length;
        const trackerChargeDataStartRow = 5 + trackerPathCount + 3; 
        let trackerCurrentChargeRow = trackerChargeDataStartRow;

        partyCharge.Groups.forEach(group => {
            const groupSize = group.Characters.length;
            if (groupSize === 0) return;

            totalChargeRows += groupSize;
            const groupRange = sheet.getRange(currentRow, 6, groupSize, 4);
            
            // Fill data
            for (let i = 0; i < groupSize; i++) {
                const char = group.Characters[i];
                const row = currentRow + i;
                const trackerRow = trackerCurrentChargeRow + i;

                sheet.getRange(row, 6).setFormula(`=IF('${escapedImportSheetName}'!B${trackerRow}, "Yes!", "No")`).setHorizontalAlignment("center");
                sheet.getRange(row, 7).setValue(char.CharacterName).setFontWeight("bold");
            }

            // Merged Info to Give and Bloc Requirements
            const infoCell = sheet.getRange(currentRow, 8, groupSize, 1);
            const reqCell = sheet.getRange(currentRow, 9, groupSize, 1);
            infoCell.merge().setValue(group.Summary).setVerticalAlignment("top").setWrap(true);
            
            const critical = group.CriticalAmount || "1";
            const reqText = groupSize === 1 ? "Need" : `Need ${critical}`;
            reqCell.merge().setValue(reqText).setVerticalAlignment("top").setHorizontalAlignment("left").setWrap(true);

            // Auto-resize rows to fit merged text
            sheet.autoResizeRows(currentRow, groupSize);

            // Calculation Column J
            const calcCell = sheet.getRange(currentRow, 10);
            calcCell.setFormula(`=COUNTIF(F${currentRow}:F${currentRow + groupSize - 1}, "Yes!")`);

            // Conditional formatting for Charge Table
            const rules = sheet.getConditionalFormatRules();
            
            // Each row (Complete columns) should be colored dark green (#6aa84f) if the charge is complete
            rules.push(SpreadsheetApp.newConditionalFormatRule()
                .whenFormulaSatisfied(`=F${currentRow}="Yes!"`)
                .setBackground("#6aa84f")
                .setRanges([sheet.getRange(currentRow, 6, groupSize, 1)])
                .build());
            // Each row (Staff column) should be colored green (#b7d7a8) if the charge is complete
            rules.push(SpreadsheetApp.newConditionalFormatRule()
                .whenFormulaSatisfied(`=F${currentRow}="Yes!"`)
                .setBackground("#b7d7a8")
                .setRanges([sheet.getRange(currentRow, 7, groupSize, 1)])
                .build());
            // Each row (Complete and Staff columns) should be colored red (#e06666) if the charge is not complete
            rules.push(SpreadsheetApp.newConditionalFormatRule()
                .whenFormulaSatisfied(`=F${currentRow}="No"`)
                .setBackground("#e06666")
                .setRanges([sheet.getRange(currentRow, 6, groupSize, 2)])
                .build());

            // Merged Bloc Requirements AND the merged Info to Give column should be colored dark green (#6aa84f) if the party has enough information to give the charge.
            const mergedCells = sheet.getRange(currentRow, 8, groupSize, 2);
            rules.push(SpreadsheetApp.newConditionalFormatRule()
                .whenFormulaSatisfied(`=$J${currentRow}>=${critical}`)
                .setBackground("#6aa84f")
                .setRanges([mergedCells])
                .build());
            // The merged Bloc Requirements column should be colored red (#e06666) if the party does not have enough information to give the charge.
            rules.push(SpreadsheetApp.newConditionalFormatRule()
                .whenFormulaSatisfied(`=$J${currentRow}<${critical}`)
                .setBackground("#e06666")
                .setRanges([reqCell])
                .build());
                
            sheet.setConditionalFormatRules(rules);

            // There should be a black 2pt border around blocs of charge information.
            groupRange.setBorder(true, true, true, true, false, false, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);

            currentRow += groupSize;
            trackerCurrentChargeRow += groupSize;
        });
    }

    // Comments Section (after Path Table)
    const pathEncountersCount = partyEncounters.length;
    const commentsStartRow = pathStartRow + 1 + pathEncountersCount + 1;
    sheet.getRange(commentsStartRow, 1).setValue("Comments").setFontWeight("bold");
    
    // Merged cell for comments
    const commentRange = sheet.getRange(commentsStartRow + 1, 1, 10, 4);
    commentRange.mergeAcross().setBorder(true, true, true, true, false, false, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    
    // Take from the notes section of the Import Sheet.
    // Calculate dynamic ranges for the comments formula
    const pathNotesRange = `'${escapedImportSheetName}'!C5:C${5 + pathEncountersCount - 1}`;
    
    const trackerChargeDataStartRow = 5 + pathEncountersCount + 3;
    const chargeNotesRange = `'${escapedImportSheetName}'!C${trackerChargeDataStartRow}:C${trackerChargeDataStartRow + totalChargeRows - 1}`;
    
    const trackerGeneralNotesStartRow = trackerChargeDataStartRow + totalChargeRows + 2 + 1;
    const generalNotesRange = `'${escapedImportSheetName}'!A${trackerGeneralNotesStartRow}:A${trackerGeneralNotesStartRow + 35 - 1}`;

    const flattenArr = `{${pathNotesRange}; ${chargeNotesRange}; ${generalNotesRange}}`;
    const formula = `=IFERROR(FILTER(FLATTEN(${flattenArr}), FLATTEN(${flattenArr}) <> ""), "")`;
    sheet.getRange(commentsStartRow + 1, 1).setFormula(formula);
    
    // The comments section should be surrounded by a black 2pt border.
    sheet.getRange(commentsStartRow, 1, 11, 4).setBorder(true, true, true, true, false, false, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
}

function getHexColor(colorStr: string) {
    const colorMatch = colorStr.match(/#([A-Fa-f0-9]{6})/);
    return colorMatch ? colorMatch[0] : '#ffffff';
}

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('EM Dashboard')
        .addItem('Rebuild All Sheets', 'createDashboardSheets')
        .addItem('Rebuild Dashboard Tab ONLY', 'rebuildDashboardOnly')
        .addSeparator()
        .addItem('Build Arden Sheet Only', 'buildArdenSheetOnly')
        .addItem('Setup Participants-Parties Sheet', 'setupParticipantsPartiesSheet')
        .addItem('Setup Staff/Camp Sheet', 'setupStaffCampSheet')
        .addToUi();
}

/**
 * Sets up formatting and validation for the manually created Participants-Parties sheet.
 */
function setupParticipantsPartiesSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = 'Participants-Parties';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        const headers = ["Opened - Day", "Opened - Time", "Party", "Job", "Status", "Priority", "Situation", "Medical Log", "Type"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setHorizontalAlignment("center");
    }

    // Column widths
    sheet.setColumnWidth(1, 100); // Opened - Day
    sheet.setColumnWidth(2, 100); // Opened - Time
    sheet.setColumnWidth(3, 100); // Party
    sheet.setColumnWidth(4, 100); // Job
    sheet.setColumnWidth(5, 100); // Status
    sheet.setColumnWidth(6, 100); // Priority
    sheet.setColumnWidth(7, 400); // Situation
    sheet.setColumnWidth(8, 400); // Medical Log
    sheet.setColumnWidth(9, 100); // Type

    // Configure sheet rows and columns if necessary, but focus on the 70 rows
    const maxRows = sheet.getMaxRows();
    const targetRows = Math.min(maxRows, 70);

    // Row heights (80px) - apply to data rows
    sheet.setRowHeightsForced(2, targetRows - 1, 80);
    
    // Freeze the first row
    sheet.setFrozenRows(1);
    
    // Fresh rules for setup
    const rules = [];

    // Duplicate detection (Same Party + Job) - Red Border
    // Note: Apps Script ConditionalFormatRuleBuilder doesn't support setBorder directly.
    // We'll use a thick red background or other indicator if necessary, or leave it for now if it must be a border.
    // Re-reading: "there should be a red border around the row."
    // Since setBorder isn't in ConditionalFormatRuleBuilder, we might have to skip it or use a different visual.
    // However, I will try to use setFontColor or something else if border is impossible via CF.
    // For now, I'll remove the setBorder call to fix compilation.
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($C2<>"", $D2<>"", COUNTIFS($C$2:$C$70, $C2, $D$2:$D$70, $D2)>1)`)
        .setBackground("#ff0000") // Red background as fallback for "Red border"
        .setRanges([sheet.getRange(2, 1, targetRows - 1, 9)])
        .build());

    // Status: "Hopefully Fixed" (Grey out row)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$E2="Hopefully fixed"`)
        .setBackground("#efefef")
        .setFontColor("#999999")
        .setRanges([sheet.getRange(2, 1, targetRows - 1, 9)])
        .build());

    // Priority: "High" (Red, unless Hopefully Fixed)
    // Rule for Hopefully Fixed Priority Blue
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($F2="High", $E2="Hopefully fixed")`)
        .setBackground("#9fc5e8")
        .setRanges([sheet.getRange(2, 6, targetRows - 1, 1)])
        .build());
    // Rule for High Priority Red (only if NOT Hopefully fixed)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($F2="High", $E2<>"Hopefully fixed")`)
        .setBackground("#e06666")
        .setRanges([sheet.getRange(2, 6, targetRows - 1, 1)])
        .build());

    // Situation Color (Orange if too long)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=LEN($G2)>200`)
        .setBackground("#faa94d")
        .setRanges([sheet.getRange(2, 7, targetRows - 1, 1)])
        .build());

    // Medical Log Color (Orange if too long)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=LEN($H2)>200`)
        .setBackground("#faa94d")
        .setRanges([sheet.getRange(2, 8, targetRows - 1, 1)])
        .build());
    
    sheet.setConditionalFormatRules(rules);

    // Situation & Medical Log Border
    sheet.getRange(2, 7, targetRows - 1, 2).setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);

    ss.toast("Participants-Parties sheet formatted and validated.", "Setup");
}

/**
 * Sets up formatting and validation for the manually created Staff/Camp sheet.
 */
function setupStaffCampSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = 'Staff/Camp';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        const headers = ["Opened - Day", "Opened - Time", "Staff", "Status", "Priority", "Situation", "Medical Log", "Type"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setHorizontalAlignment("center");
    }

    // Column widths
    sheet.setColumnWidth(1, 100); // Opened - Day
    sheet.setColumnWidth(2, 100); // Opened - Time
    sheet.setColumnWidth(3, 100); // Staff
    sheet.setColumnWidth(4, 100); // Status
    sheet.setColumnWidth(5, 100); // Priority
    sheet.setColumnWidth(6, 400); // Situation
    sheet.setColumnWidth(7, 400); // Medical Log
    sheet.setColumnWidth(8, 100); // Type
    sheet.setColumnWidth(9, 20);  // Spacer
    sheet.setColumnWidth(10, 150); // Staff List (Column J)

    const maxRows = sheet.getMaxRows();
    const targetRows = Math.min(maxRows, 70);

    // Row heights (80px)
    sheet.setRowHeightsForced(2, targetRows - 1, 80);
    
    // Freeze first row
    sheet.setFrozenRows(1);
    
    // Populate Staff List in Column J
    const allStaff = getAllStaffData();
    if (allStaff.length > 0) {
        const staffValues = allStaff.map(name => [name]);
        sheet.getRange(2, 10, staffValues.length, 1).setValues(staffValues);
    }
    
    // Conditional Formatting
    const rules = [];

    // Status: "Hopefully Fixed" (Grey out row)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$D2="Hopefully fixed"`)
        .setBackground("#efefef")
        .setFontColor("#999999")
        .setRanges([sheet.getRange(2, 1, targetRows - 1, 8)])
        .build());

    // Priority: "High" (Red, unless Hopefully Fixed)
    // Rule for Hopefully Fixed Priority Blue
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($E2="High", $D2="Hopefully fixed")`)
        .setBackground("#9fc5e8")
        .setRanges([sheet.getRange(2, 5, targetRows - 1, 1)])
        .build());
    // Rule for High Priority Red (only if NOT Hopefully fixed)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND($E2="High", $D2<>"Hopefully fixed")`)
        .setBackground("#e06666")
        .setRanges([sheet.getRange(2, 5, targetRows - 1, 1)])
        .build());

    // Situation Color (Orange if too long)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=LEN($F2)>60`)
        .setBackground("#f7a8a8")
        .setRanges([sheet.getRange(2, 6, targetRows - 1, 1)])
        .build());

    // Medical Log Color (Orange if too long)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=LEN($G2)>60`)
        .setBackground("#f7a8a8")
        .setRanges([sheet.getRange(2, 7, targetRows - 1, 1)])
        .build());

    sheet.setConditionalFormatRules(rules);

    // Situation & Medical Log Border
    sheet.getRange(2, 6, targetRows - 1, 2).setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);

    // Data validation for Staff column (Column C)
    const staffValidation = SpreadsheetApp.newDataValidation().requireValueInList(allStaff).build();
    sheet.getRange(2, 3, targetRows - 1, 1).setDataValidation(staffValidation);

    ss.toast("Staff/Camp sheet formatted and validated.", "Setup");
}

/**
 * Specifically builds the Arden party sheet for testing.
 */
function buildArdenSheetOnly() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const PARTIES_DATA = getPartiesData();
    const PATHS_DATA = getPathsData();
    const CHARGES_DATA = getChargesData();

    const ardenParty = PARTIES_DATA.Parties.find(p => p.Party === 'Arden');

    if (!ardenParty) {
        ss.toast("Could not find Arden party data.", "Error");
        return;
    }

    // Delete existing Arden party sheet if it exists
    const ardenPartySheet = ss.getSheetByName('Arden_Party Sheet');
    if (ardenPartySheet) ss.deleteSheet(ardenPartySheet);

    buildPartySheets(ss, ardenParty, PATHS_DATA, CHARGES_DATA);

    ss.toast("Arden sheets built successfully.", "EM Dashboard");
}
