import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

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

interface OutputFormat {
  Charges: Charge[];
}

function parseCritical(value: any): string {
  if (!value) return "";
  const str = String(value).trim();
  if (str.toLowerCase() === 'yes') return '1';
  const match = str.match(/at least (\d+)/i);
  if (match) return match[1];
  return str;
}

function processExcel(filePath: string): OutputFormat {
  const workbook = XLSX.readFile(filePath);
  const result: OutputFormat = { Charges: [] };

  const ignoredSheets = ['ALL', 'TEMPLATE', 'General Plot Info'];

  for (const sheetName of workbook.SheetNames) {
    if (ignoredSheets.includes(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    if (data.length === 0) continue;

    // Based on example, Title and Party might be in the first row
    // Row 0: [, Arden, Kullis Toolforger charged with Theft, ]
    const firstRow = data[0];
    const party = firstRow[1] ? String(firstRow[1]).trim() : sheetName;
    const title = firstRow[2] ? String(firstRow[2]).trim() : "";

    const groups: Group[] = [];
    
    // Find header row "Conditions (if any)", "Character", "Summary", "Critical?"
    let headerRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].some(cell => String(cell).toLowerCase().includes('conditions'))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) continue;

    let currentGroup: Group | null = null;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      const conditions = row[0] ? String(row[0]).trim() : "";
      const character = row[1] ? String(row[1]).trim() : "";
      const summary = row[2] ? String(row[2]).trim() : "";
      const criticalRaw = row[3] ? String(row[3]).trim() : "";

      // Check if we hit "Going into the trial"
      if (conditions.toLowerCase().includes("going into the trial") || 
          character.toLowerCase().includes("going into the trial")) {
        break;
      }

      if (!character && !summary && !conditions && !criticalRaw) continue;

      const critical = parseCritical(criticalRaw);

      // Grouping logic: "The cell in question will be merged over all the members of the group."
      // Usually in Excel, a merged cell for "Critical" or "Summary" applies to all rows next to it.
      // If we have a summary or a critical value, it might start a new group or be part of a group.
      // Based on the example, multiple characters share the same Summary and Critical value.
      
      if (summary || critical) {
        currentGroup = {
          Summary: summary,
          CriticalAmount: critical,
          Characters: []
        };
        groups.push(currentGroup);
      }

      if (currentGroup && character) {
        currentGroup.Characters.push({
          CharacterName: character,
          Conditions: conditions
        });
      } else if (!currentGroup && character) {
          // Fallback if character appears before any summary/critical
          currentGroup = {
              Summary: summary,
              CriticalAmount: critical,
              Characters: [{
                  CharacterName: character,
                  Conditions: conditions
              }]
          };
          groups.push(currentGroup);
      }
    }

    result.Charges.push({
      Title: title,
      Party: party,
      Groups: groups
    });
  }

  return result;
}

const inputDir = path.join(__dirname, 'Input');
const outputDir = path.join(__dirname, 'Output');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const excelFiles = fs.readdirSync(inputDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

if (excelFiles.length === 0) {
  console.log('No Excel files found in Input folder.');
} else {
  const allCharges: OutputFormat = { Charges: [] };
  for (const file of excelFiles) {
    const filePath = path.join(inputDir, file);
    console.log(`Processing ${file}...`);
    const data = processExcel(filePath);
    allCharges.Charges.push(...data.Charges);
  }

  const outputPath = path.join(outputDir, 'ChargeTable.json');
  fs.writeFileSync(outputPath, JSON.stringify(allCharges, null, 2));
  console.log(`Exported to ${outputPath}`);
}
