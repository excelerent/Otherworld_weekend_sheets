interface PartyInfo {
    Party: string;
    StaffMemberName: string;
    CompanionName: string;
    BackgroundColor: string;
    TableColor: string;
    TextColor: string;
}

interface Encounter {
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

// EM Dashboard Spreadsheet ID (Replace with actual ID)
const DASHBOARD_SPREADSHEET_ID = '1E3qwC06aYhplPwexQSHPnLtMXFlekN26EmGM1rytjog';

function createTrackerSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const PARTIES_DATA = getPartiesData();
    const PATHS_DATA = getPathsData();
    const CHARGES_DATA = getChargesData();
    const MONSTER_DATA = getMonsterData();

    // Clear existing named ranges that we manage
    const namedRanges = ss.getNamedRanges();
    namedRanges.forEach(nr => {
        const name = nr.getName();
        if (name.startsWith('Combat_') || name.startsWith('Path_') || name.startsWith('Charge_')) {
            nr.remove();
        }
    });

    // 0. Export Sheet (Hidden)
    let exportSheet = ss.getSheetByName('Export');
    if (!exportSheet) {
        exportSheet = ss.insertSheet('Export');
        exportSheet.hideSheet();
    } else {
        exportSheet.clear();
    }
    exportSheet.getRange('A1').setValue('This sheet is used for data export to the EM Dashboard.').setFontWeight('bold');

    // 1. Combat Sheet
    let combatSheet = ss.getSheetByName('Combat');
    if (!combatSheet) {
        combatSheet = ss.insertSheet('Combat');
        ss.moveActiveSheet(1); // Make it the first sheet
    } else {
        combatSheet.clear();
    }
    
    const parties = PARTIES_DATA.Parties;
    const encounters = PATHS_DATA;
    const charges = CHARGES_DATA.Charges;

    // Design Combat Sheet Grid
    combatSheet.getRange('A1').setValue('').setFontWeight('bold');
    const partyNames = parties.map(p => p.Party);
    const getHexColor = (colorStr: string) => {
        const colorMatch = colorStr.match(/#([A-Fa-f0-9]{6})/);
        return colorMatch ? colorMatch[0] : '#ffffff';
    };

    const headerRange = combatSheet.getRange(1, 2, 1, partyNames.length);
    headerRange.setValues([partyNames]).setFontWeight('bold').setHorizontalAlignment('center');
    
    // Set party colors for header
    parties.forEach((party, index) => {
        const bgColor = getHexColor(party.BackgroundColor);
        const textColor = getHexColor(party.TextColor);
        headerRange.getCell(1, index + 1).setBackground(bgColor).setFontColor(textColor);
    });
    
    const monsterNames = MONSTER_DATA.Monsters;
    const monsterGroupValues = monsterNames.map(g => [g]);
    combatSheet.getRange(2, 1, monsterNames.length, 1).setValues(monsterGroupValues).setFontWeight('bold');
    
    // Color monster rows
    const monsterColors: { [key: string]: string } = {
        'Chitter': '#d0e0e3',
        'Skeever': '#fce5cd',
        'Worlog': '#e6b8af',
        'Wolven': '#efefef',
        'Creeper': '#d9ead3'
    };

    const notesColumnIndex = partyNames.length + 2;

    monsterNames.forEach((name, index) => {
        let baseColor = '#ffffff';
        for (const type in monsterColors) {
            if (name.includes(type)) {
                baseColor = monsterColors[type];
                break;
            }
        }
        
        let finalColor = baseColor;
        if (index % 2 === 1) {
            finalColor = darkenColor(baseColor, 0.1);
        }
        
        // Color the monster name cell, checkbox cells, and the notes cell
        combatSheet.getRange(index + 2, 1, 1, notesColumnIndex).setBackground(finalColor);
    });
    
    // Add checkboxes for the grid
    combatSheet.getRange(2, 2, monsterNames.length, partyNames.length).insertCheckboxes();
    
    // Styling for Combat Sheet
    combatSheet.setFrozenRows(1);
    combatSheet.setFrozenColumns(1);
    
    // Column Widths and Alignment
    combatSheet.setColumnWidth(1, 110);
    combatSheet.getRange(2, 1, monsterNames.length, 1).setHorizontalAlignment('center');
    
    for (let i = 0; i < monsterNames.length; i++) {
        combatSheet.setRowHeight(i + 2, 25);
    }
    
    for (let i = 0; i < partyNames.length; i++) {
        combatSheet.setColumnWidth(i + 2, 60);
        // Create named range for each party column in Combat tab
        const partyName = partyNames[i];
        const range = combatSheet.getRange(2, i + 2, monsterNames.length, 1);
        ss.setNamedRange(`Combat_${partyName.replace(/[^a-zA-Z0-9]/g, '_')}`, range);
    }
    
    combatSheet.getRange(1, notesColumnIndex).setValue('Notes').setFontWeight('bold').setHorizontalAlignment('center');
    combatSheet.setColumnWidth(notesColumnIndex, 600);

    // 2. Party Sheets

    for (const party of parties) {
        let sheet = ss.getSheetByName(party.Party);
        if (!sheet) {
            sheet = ss.insertSheet(party.Party);
        } else {
            sheet.clear();
        }
        
        // Tab Color
        const partyColor = getHexColor(party.BackgroundColor);
        const partyTableColor = getHexColor(party.TableColor);
        const partyTextColor = getHexColor(party.TextColor);
        sheet.setTabColor(partyColor);

        // Header Section
        sheet.getRange('1:1').setBackground(partyColor).setFontColor(partyTextColor).setFontWeight('bold').setFontSize(27);
        sheet.getRange('A1').setValue(party.Party.toUpperCase()).setHorizontalAlignment('center');
        sheet.getRange('C1').setValue(`${party.CompanionName} (${party.StaffMemberName})`).setHorizontalAlignment('center');
        sheet.setFrozenRows(1);
        
        sheet.setRowHeight(1, 40); // Added to accommodate larger font size if needed, though 27pt might need more than default
        
        // Column Widths
        sheet.setColumnWidth(1, 200); // A
        sheet.setColumnWidth(2, 90);  // B
        sheet.setColumnWidth(3, 600); // C
        sheet.setColumnWidth(4, 20);  // D (flags, hidden)
        sheet.setColumnWidth(5, 20);  // E (spacing)
        sheet.setColumnWidth(6, 120); // F
        sheet.setColumnWidth(7, 150); // G
        sheet.setColumnWidth(8, 250); // H

        // Character Info Section (Top Right)
        const roles = ['Caster', 'Keeper', 'Maker', 'Ranger', 'Seeker', 'Traveler'];
        const charHeaderRange = sheet.getRange('F3:H3');
        charHeaderRange.setFontWeight('bold').setFontSize(10);
        sheet.getRange('G3').setValue('Name');
        sheet.getRange('H3').setValue('Description');
        
        const rolesRange = sheet.getRange('F4:F9');
        rolesRange.setValues(roles.map(r => [r])).setBackground(partyTableColor).setFontColor(partyTextColor);
        
        const dataRange = sheet.getRange('G4:H9');
        // Alternating colors for Name/Description cells
        for (let i = 0; i < roles.length; i++) {
            const rowColor = (i % 2 === 0) ? '#ffffff' : '#efefef';
            sheet.getRange(4 + i, 7, 1, 2).setBackground(rowColor);
        }
        
        // Border around the entire Character Info Table (excluding title row)
        sheet.getRange('F4:H9').setBorder(true, true, true, true, false, false);

        // Party Path Table
        sheet.getRange('A3').setValue('PARTY PATH').setFontWeight('bold').setFontSize(14);
        sheet.getRange('A4:C4').setBackground(partyTableColor).setFontColor(partyTextColor).setFontWeight('bold').setBorder(true, true, true, true, null, null);
        sheet.getRange('A4').setValue('Character');
        sheet.getRange('B4').setValue('Gave Item/Info');
        sheet.getRange('C4').setValue('Notes');

        const partyEncounters = encounters.filter(e => e.party === party.Party);
        const partyPathStartRow = 5;
        let currentRow = partyPathStartRow;
        if (partyEncounters.length > 0) {
            const values = partyEncounters.map(e => [e.staff, false, '']);
            const flagValues = partyEncounters.map(e => {
                let flags = '';
                if (e.PathItem) flags += 'p';
                if (e.Insight) flags += 'i';
                if (e.Riddle) flags += 'r';
                return [flags];
            });
            const tableRange = sheet.getRange(currentRow, 1, values.length, 3);
            tableRange.setValues(values);
            
            // Populate hidden flags in Column D
            sheet.getRange(currentRow, 4, flagValues.length, 1).setValues(flagValues);
            sheet.hideColumns(4);

            // Add checkboxes
            const checkboxRange = sheet.getRange(currentRow, 2, values.length, 1);
            checkboxRange.insertCheckboxes();
            
            // Named range for party path (Includes flags in Column D)
            const exportRange = sheet.getRange(currentRow, 1, values.length, 4);
            ss.setNamedRange(`Path_${party.Party.replace(/[^a-zA-Z0-9]/g, '_')}`, exportRange);

            // Grey out Character name when checkbox is checked
            const rule = SpreadsheetApp.newConditionalFormatRule()
                .whenFormulaSatisfied(`=$B${currentRow}`)
                .setFontColor('#999999')
                .setRanges([sheet.getRange(currentRow, 1, values.length, 1)])
                .build();
            const rules = sheet.getConditionalFormatRules();
            rules.push(rule);
            sheet.setConditionalFormatRules(rules);
            
            // Alternating colors for Party Path Table
            for (let i = 0; i < values.length; i++) {
                const rowColor = (i % 2 === 0) ? '#ffffff' : '#efefef'; // White and light gray
                sheet.getRange(currentRow + i, 1, 1, 4).setBackground(rowColor);
            }
            
            currentRow += values.length;
        }
        // Border around the entire Party Path Table (but NOT individual cells)
        sheet.getRange(4, 1, currentRow - 4, 3).setBorder(true, true, true, true, false, false);

        // Charge Info Table
        currentRow += 1; // 1 row between tables
        const partyCharges = charges.find(c => c.Party === party.Party);
        const chargeCharacterName = partyCharges && partyCharges.Groups.length > 0 && partyCharges.Groups[0].Characters.length > 0 ? partyCharges.Groups[0].Characters[0].CharacterName : "";
        
        const chargeTitleRow = currentRow;
        sheet.getRange(chargeTitleRow, 1).setValue('CHARGE INFO').setFontWeight('bold').setFontSize(14);
        sheet.getRange(chargeTitleRow, 2).setValue(`(${chargeCharacterName})`).setFontWeight('bold').setFontSize(14);
        currentRow++;
        
        const chargeHeaderRow = currentRow;
        sheet.getRange(chargeHeaderRow, 1, 1, 3).setBackground(partyTableColor).setFontColor(partyTextColor).setFontWeight('bold').setBorder(true, true, true, true, null, null);
        sheet.getRange(chargeHeaderRow, 1).setValue('Character');
        sheet.getRange(chargeHeaderRow, 2).setValue('Gave Info');
        sheet.getRange(chargeHeaderRow, 3).setValue('Notes');
        
        const chargeDataStartRow = currentRow + 1;
        if (partyCharges) {
            const chargeValues: any[][] = [];
            partyCharges.Groups.forEach(group => {
                group.Characters.forEach(char => {
                    chargeValues.push([char.CharacterName, false, '']); // Notes should be empty
                });
            });
            if (chargeValues.length > 0) {
                const chargeDataStartRow = currentRow + 1;
                currentRow++;
                const tableRange = sheet.getRange(currentRow, 1, chargeValues.length, 3);
                tableRange.setValues(chargeValues);
                const checkboxRange = sheet.getRange(currentRow, 2, chargeValues.length, 1);
                checkboxRange.insertCheckboxes();
                
                // Named range for charge info
                ss.setNamedRange(`Charge_${party.Party.replace(/[^a-zA-Z0-9]/g, '_')}`, tableRange);

                // Grey out Character name when checkbox is checked
                const rule = SpreadsheetApp.newConditionalFormatRule()
                    .whenFormulaSatisfied(`=$B${chargeDataStartRow}`)
                    .setFontColor('#999999')
                    .setRanges([sheet.getRange(chargeDataStartRow, 1, chargeValues.length, 1)])
                    .build();
                const rules = sheet.getConditionalFormatRules();
                rules.push(rule);
                sheet.setConditionalFormatRules(rules);

                // Alternating colors for Charge Info Table
                for (let i = 0; i < chargeValues.length; i++) {
                    const rowColor = (i % 2 === 0) ? '#ffffff' : '#efefef';
                    sheet.getRange(currentRow + i, 1, 1, 3).setBackground(rowColor);
                }
                
                currentRow += chargeValues.length;
            }
        }
        // Border around the entire Charge Info Table (but NOT individual cells)
        sheet.getRange(chargeHeaderRow, 1, currentRow - chargeHeaderRow, 3).setBorder(true, true, true, true, false, false);

        // General Notes
        currentRow += 2;
        sheet.getRange(currentRow, 1).setValue('General Notes').setFontWeight('bold');
        const notesStartRow = currentRow + 1;
        sheet.getRange(notesStartRow, 1, 35, 3).mergeAcross().setBorder(true, true, true, true, false, false);
        
        // Alternating colors for General Notes
        for (let i = 0; i < 35; i++) {
            const rowColor = (i % 2 === 0) ? '#ffffff' : '#efefef';
            sheet.getRange(notesStartRow + i, 1, 1, 3).setBackground(rowColor);
        }

        sheet.showColumns(4); // Ensure it's not hidden before push (though not strictly necessary for getValues)
        // Hidden column D will be included in the Export sheet via pushToDashboard(party.Party)
        // after createTrackerSheet finishes, but we should hide it here for the UI.
        sheet.hideColumns(4);
        
        // Final layout adjustments
        sheet.setColumnWidth(4, 20); // Column D
        sheet.setColumnWidth(5, 20); // Column E
    }
}

/**
 * Helper function to darken a hex color by a given factor (0 to 1).
 */
function darkenColor(hex: string, factor: number): string {
    // Remove hash if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Darken
    r = Math.floor(r * (1 - factor));
    g = Math.floor(g * (1 - factor));
    b = Math.floor(b * (1 - factor));
    
    // Convert back to hex
    const toHex = (c: number) => {
        const h = c.toString(16);
        return h.length === 1 ? '0' + h : h;
    };
    
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Trigger function that runs when the spreadsheet is opened.
 * Adds a custom menu to the spreadsheet.
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Party Tracker Debug')
        .addItem('Sync All to Dashboard', 'syncAllToDashboard')
        .addSeparator()
        .addItem('Run test_onEdit', 'test_onEdit')
        .addItem('Setup Installable Trigger', 'setupInstallableTrigger')
        .addToUi();
}

/**
 * Syncs all relevant sheets (Combat and all Party sheets) to the EM Dashboard.
 * Useful for initial setup or force-refreshing all data.
 */
function syncAllToDashboard() {
    const PARTIES_DATA = getPartiesData();
    const sheetsToSync = ['Combat', ...PARTIES_DATA.Parties.map(p => p.Party)];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    ss.toast("Starting full sync to EM Dashboard...", "Party Tracker");
    
    let successCount = 0;
    let errorCount = 0;

    sheetsToSync.forEach(sheetName => {
        try {
            pushToDashboard(sheetName);
            successCount++;
        } catch (err) {
            console.error(`Failed to sync ${sheetName}:`, err);
            errorCount++;
        }
    });

    if (errorCount === 0) {
        ss.toast(`Successfully synced ${successCount} sheets to EM Dashboard.`, "Party Tracker");
    } else {
        SpreadsheetApp.getUi().alert("Sync Completed with Errors", `Synced: ${successCount}\nFailed: ${errorCount}\nCheck execution logs for details.`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
}

/**
 * Trigger function that runs on every edit in the spreadsheet.
 * NOTE: This is named handleOnEdit to avoid being treated as a Simple Trigger.
 * It MUST be set up as an installable trigger to access other spreadsheets.
 */
function handleOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
    if (!e) return;
    
    const PARTIES_DATA = getPartiesData();
    const range = e.range;
    const sheet = range.getSheet();
    const sheetName = sheet.getName();
    
    // We only care about edits in Combat or Party sheets
    const isPartySheet = PARTIES_DATA.Parties.some(p => p.Party === sheetName);
    const isCombatSheet = sheetName === 'Combat';
    
    if (!isPartySheet && !isCombatSheet) return;

    // Log auth mode and trigger info for debugging
    console.log(`handleOnEdit triggered. AuthMode: ${e.authMode}, TriggerUid: ${e.triggerUid}`);

    // Toast message for visual feedback
    try {
        SpreadsheetApp.getActiveSpreadsheet().toast(`Syncing ${sheetName} to EM Dashboard...`, 'Party Tracker');
    } catch (e) {
        // Should work fine in installable trigger
    }

    try {
        pushToDashboard(sheetName);
    } catch (err: any) {
        console.error('Failed to push data to dashboard:', err);
        const errorMessage = err?.message || String(err);
        SpreadsheetApp.getUi().alert("Sync Error", errorMessage, SpreadsheetApp.getUi().ButtonSet.OK);
    }
}

/**
 * Creates an installable trigger for handleOnEdit if it doesn't exist.
 * Run this function once from the Apps Script editor to set up the sync correctly.
 */
function setupInstallableTrigger() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check if trigger already exists and remove it to ensure fresh authorization with new scopes
    const triggers = ScriptApp.getProjectTriggers();
    console.log(`Found ${triggers.length} existing triggers.`);
    triggers.forEach(t => {
        console.log(`Checking trigger: ${t.getHandlerFunction()}, Type: ${t.getEventType()}`);
        if (t.getHandlerFunction() === 'handleOnEdit' || t.getHandlerFunction() === 'onEdit') {
            console.log(`Deleting existing trigger: ${t.getHandlerFunction()}`);
            ScriptApp.deleteTrigger(t);
        }
    });
    
    // Create new trigger
    ScriptApp.newTrigger('handleOnEdit')
        .forSpreadsheet(ss)
        .onEdit()
        .create();
    
    ss.toast("Installable handleOnEdit trigger created successfully.", "Setup");
}

/**
 * Pushes the entire content of a sheet to the corresponding import sheet in the EM Dashboard.
 */
function pushToDashboard(sourceSheetName: string) {
    const sourceSs = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = sourceSs.getSheetByName(sourceSheetName);
    if (!sourceSheet) return;

    const sourceData = sourceSheet.getDataRange().getValues();
    if (sourceData.length === 0) return;

    const dashboardSs = SpreadsheetApp.openById(DASHBOARD_SPREADSHEET_ID);
    const targetSheetName = sourceSheetName === 'Combat' ? 'Combat_Import' : `${sourceSheetName}_Import`;
    
    let targetSheet = dashboardSs.getSheetByName(targetSheetName);
    if (!targetSheet) {
        targetSheet = dashboardSs.insertSheet(targetSheetName);
        targetSheet.hideSheet()
    }

    // Optimization: Only update if dimensions changed or to avoid full clear if possible
    // For now, clear and set is safest for data integrity, but we can minimize calls
    targetSheet.clearContents(); // clearContents is often faster than clear() which clears formatting too
    targetSheet.getRange(1, 1, sourceData.length, sourceData[0].length).setValues(sourceData);
}

/**
 * Test function for onEdit to verify functionality and debug edge cases.
 */
function test_onEdit() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const combatSheet = ss.getSheetByName('Combat');
    const ardenSheet = ss.getSheetByName('Arden');
    const dummySheet = ss.getSheetByName('Dummy') || ss.insertSheet('Dummy');

    console.log('--- Starting onEdit Tests ---');

    // Case 1: Valid Edit in Combat Sheet
    if (combatSheet) {
        console.log('Testing Case 1: Combat Sheet edit');
        const eCombat = {
            range: combatSheet.getRange('B2'),
            source: ss,
            authMode: ScriptApp.AuthMode.FULL,
            triggerUid: 'test',
            user: 'user',
            value: 'TRUE',
            oldValue: 'FALSE'
        } as unknown as GoogleAppsScript.Events.SheetsOnEdit;
        handleOnEdit(eCombat);
    } else {
        console.warn('Combat sheet not found, skipping Case 1');
    }

    // Case 2: Valid Edit in a Party Sheet (Arden)
    if (ardenSheet) {
        console.log('Testing Case 2: Party Sheet (Arden) edit');
        const eParty = {
            range: ardenSheet.getRange('B5'),
            source: ss,
            authMode: ScriptApp.AuthMode.FULL,
            triggerUid: 'test',
            user: 'user',
            value: 'TRUE',
            oldValue: 'FALSE'
        } as unknown as GoogleAppsScript.Events.SheetsOnEdit;
        handleOnEdit(eParty);
    } else {
        console.warn('Arden sheet not found, skipping Case 2');
    }

    // Case 3: Invalid Edit in a non-tracked sheet (Dummy)
    console.log('Testing Case 3: Non-tracked sheet (Dummy) edit');
    const eDummy = {
        range: dummySheet.getRange('A1'),
        source: ss,
        authMode: ScriptApp.AuthMode.FULL,
        triggerUid: 'test',
        user: 'user',
        value: 'test',
        oldValue: ''
    } as unknown as GoogleAppsScript.Events.SheetsOnEdit;
    handleOnEdit(eDummy);

    // Case 4: Null/Undefined Event Object
    console.log('Testing Case 4: Null event object');
    handleOnEdit(null as any);

    console.log('--- onEdit Tests Completed ---');
}