import * as fs from 'fs';
import pdf from 'pdf-parse';

interface Encounter {
    party: string;
    staff: string;
    time: string;
    item: string;
    PathItem?: boolean;
    Insight?: boolean;
    Riddle?: boolean;
}

function toAscii(str: string): string {
    return str
        .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
        .replace(/\u2013/g, "-") // En dash
        .replace(/\u2014/g, "--") // Em dash
        .replace(/\u2026/g, "...") // Ellipsis
        .replace(/\u00A0/g, " ") // Non-breaking space
        .replace(/\u00E1/g, "a") // á
        .replace(/\u00E9/g, "e") // é
        .replace(/\u00ED/g, "i") // í
        .replace(/\u00F3/g, "o") // ó
        .replace(/\u00FA/g, "u") // ú
        .replace(/\u00F1/g, "n") // ñ
        .replace(/\u00C1/g, "A") // Á
        .replace(/\u00C9/g, "E") // É
        .replace(/\u00CD/g, "I") // Í
        .replace(/\u00D3/g, "O") // Ó
        .replace(/\u00DA/g, "U") // Ú
        .replace(/\u00D1/g, "N") // Ñ
        .replace(/[^\x00-\x7F]/g, ""); // Remove anything else non-ASCII
}

interface Party {
    name: string;
    lines: string[];
}

async function processHandbook(filePath: string, outputCsv: string, outputJson: string): Promise<void> {
    const dataBuffer = fs.readFileSync(filePath);
    try {
        console.log(`Parsing ${filePath}...`);
        const data = await pdf(dataBuffer);
        const text = data.text;
        
        const parties = parseParties(text);
        
        // Generate CSV
        const csvContent = generateCsv(parties);
        fs.writeFileSync(outputCsv, csvContent);
        console.log(`Successfully generated ${outputCsv}`);

        // Generate JSON
        const flatEncounters = parties.flat();
        fs.writeFileSync(outputJson, JSON.stringify(flatEncounters, null, 2));
        console.log(`Successfully generated ${outputJson}`);
    } catch (error) {
        console.error('Error processing handbook:', error);
    }
}

function parseParties(text: string): Encounter[][] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const colorRegex = /^(.+?)[’']s color is/i;
    const partyBlocks: Party[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const colorMatch = line.match(colorRegex);
        if (colorMatch) {
            let name = colorMatch[1]!;
            if (i > 0) {
                const prevLine = lines[i - 1]!;
                if (prevLine.length < 20 && prevLine.includes(name)) {
                    name = prevLine.trim().replace(/[’']s.*/, '');
                }
            }
            
            partyBlocks.push({ name: name, lines: [] });
        }
        if (partyBlocks.length > 0) {
            partyBlocks[partyBlocks.length - 1]!.lines.push(line);
        }
    }

    const results: Encounter[][] = [];
    for (const block of partyBlocks) {
        results.push(parseBlock(block.name, block.lines));
    }
    
    return results;
}

function parseBlock(partyName: string, lines: string[]): Encounter[] {
    const encounters: Encounter[] = [];
    const text = lines.join('\n');
    
    // Find item list
    let itemList: string[] = [];
    const goalsMatch = text.match(/Activity\/Goals:\s*([^\n]+)/gi);
    if (goalsMatch) {
        for (const goalLine of goalsMatch) {
            const listMatch = goalLine.match(/list of items \(([^)]+)\)/i);
            if (listMatch && listMatch[1]) {
                const items = listMatch[1].split(',').map(i => i.trim().toLowerCase());
                itemList.push(...items);
            } else {
                const altMatch = goalLine.match(/list of items.*? \(([^)]+)\)/i);
                if (altMatch && altMatch[1]) {
                    const items = altMatch[1].split(',').map(i => i.trim().toLowerCase());
                    itemList.push(...items);
                }
            }
        }
    }

    const addEncounter = (enc: Encounter) => {
        enc.party = toAscii(enc.party);
        enc.staff = toAscii(enc.staff);
        enc.time = toAscii(enc.time);
        enc.item = toAscii(enc.item);

        const cleanItem = enc.item.toLowerCase();
        const cleanStaff = enc.staff.toLowerCase();

        // PathItem logic: Saturday encounters that give a specific item (not "none until tomorrow")
        const isSaturday = enc.time.toLowerCase().includes('saturday') || enc.time.includes('-') || (enc.time.includes(':') && !enc.time.toLowerCase().includes('sunday'));
        
        if (isSaturday) {
            if (enc.item && enc.item !== '--' && !cleanItem.includes('none until tomorrow') && !cleanItem.includes('list of items')) {
                enc.PathItem = true;
            }
        }

        if (cleanItem.includes('riddle') || cleanStaff.includes('riddle')) {
            enc.Riddle = true;
        }

        encounters.push(enc);
    };
    
    // 1. Contact
    const contactMatch = text.match(/Contact:\s*(.+)/i);
    if (contactMatch && contactMatch[1]) {
        addEncounter({ party: partyName, staff: contactMatch[1].trim(), time: 'Contact', item: '--' });
    }
    
    // 2. Friday Encounters
    const fri2 = text.match(/2nd Friday night encounter:\s*(.+)/i);
    if (fri2 && fri2[1]) addEncounter({ party: partyName, staff: fri2[1].trim(), time: '2nd Friday', item: '--' });
    
    const fri3 = text.match(/3rd Friday night encounter:\s*(.+)/i);
    if (fri3 && fri3[1]) addEncounter({ party: partyName, staff: fri3[1].trim(), time: '3rd Friday', item: '--' });
    
    const fri4 = text.match(/4th Friday night encounter:\s*(.+)/i);
    if (fri4 && fri4[1]) {
        addEncounter({ party: partyName, staff: fri4[1].trim(), time: '4th Friday', item: 'list of items' });
    }
    
    // 3. Saturday 1st
    const sat1 = text.match(/1st Saturday morning encounter:\s*(.+)/i);
    if (sat1 && sat1[1]) {
        let item = '--';
        let insight = false;
        const parts = text.split(sat1[0]);
        if (parts.length > 1) {
            const blockAfter = parts[1];
            if (blockAfter) {
                const itemMatch = blockAfter.match(/Item:\s*(.+)/i);
                if (itemMatch && itemMatch[1]) item = itemMatch[1].trim();
                
                const goalsMatch = blockAfter.match(/Activity\/Goals:\s*([^\n]+)/i);
                if (goalsMatch && goalsMatch[1] && goalsMatch[1].toLowerCase().includes('cup of insight')) {
                    insight = true;
                }
            }
        }
        addEncounter({ party: partyName, staff: sat1[1].trim(), time: '1st Saturday', item: item, Insight: insight || undefined });
    }
    
    // Saturday Unscheduled
    const satUnscheduledRegex = /Saturday unscheduled encounter:\s*([^\n]+)(?:[\s\S]*?)Item:\s*([^\n]+)(?:[\s\S]*?)Times available \(roughly\):\s*([^\n]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = satUnscheduledRegex.exec(text)) !== null) {
        if (match[1] && match[2] && match[3]) {
            let staff = match[1].trim();
            let item = match[2].trim();
            const time = match[3].trim();
            
            if (staff.startsWith('(')) staff = staff.replace(/^\([^)]+\)\s*/, '');
            
            if (item.toLowerCase().includes('tomorrow') || (item.toLowerCase().startsWith('none') && item.toLowerCase().includes('sunday'))) {
                 item = 'none until tomorrow';
            }
            
            let insight = false;
            // Find the Activity/Goals section for this encounter
            const blockStart = match.index;
            const searchArea = text.substring(blockStart, blockStart + 500);
            const goalsMatch = searchArea.match(/Activity\/Goals:\s*([^\n]+)/i);
            if (goalsMatch && goalsMatch[1] && goalsMatch[1].toLowerCase().includes('cup of insight')) {
                insight = true;
            }
            
            addEncounter({ party: partyName, staff: staff, time: time, item: item, Insight: insight || undefined });
        }
    }
    
    // 5. Sunday
    const sunPen = text.match(/Sunday morning penultimate step:\s*(?:meeting up with\s*)?([^\n,]+)/i);
    const sunPenTime = text.match(/Scheduled for:\s*(\d+(?::\d+)?\s*[ap]m)\s*Sunday/i);
    
    if (sunPen && sunPen[1]) {
        let staff = sunPen[1].trim().replace(/wearing the Shadow Ward.*/, '').trim();
        staff = staff.replace(/getting the .* from /i, '').trim();
        const time = sunPenTime && sunPenTime[1] ? sunPenTime[1] + ' Sunday' : 'Sunday';
        
        let item = '--';
        const itemPromiseMatch = text.match(/none\s*\([^)]*give them the ([^)]+) in the tavern at [^)]*Sunday\)/i);
        if (itemPromiseMatch && itemPromiseMatch[1]) {
            item = itemPromiseMatch[1].trim();
        } else {
             const sunSectionParts = text.split(/Sunday morning penultimate step:/i);
             const sunSection = sunSectionParts.length > 1 ? sunSectionParts[1] : null;
             if (sunSection) {
                 const itemMatch = sunSection.match(/Item:\s*([^\n]+)/i);
                 if (itemMatch && itemMatch[1]) item = itemMatch[1].trim();
             }
        }

        addEncounter({ party: partyName, staff: staff, time: time, item: item });
    }

    const sunFinal = text.match(/Sunday morning final step:\s*(.+)/i);
    const sunFinalTimeMatch = text.match(/Scheduled for:\s*(\d+(?::\d+)?\s*[ap]m)\s*Sunday/gi);
    if (sunFinal && sunFinal[1]) {
        const staff = sunFinal[1].trim().split('(')[0]!.trim();
        let time = 'Sunday';
        if (sunFinalTimeMatch && sunFinalTimeMatch.length > 1) {
            const timeStr = sunFinalTimeMatch[1];
            if (timeStr) {
                time = timeStr.replace(/Scheduled for:\s*/i, '').trim();
            }
        }
        
        let item = '--';
        const sunFinalSectionParts = text.split(/Sunday morning final step:/i);
        const sunFinalSection = sunFinalSectionParts.length > 1 ? sunFinalSectionParts[1] : null;
        if (sunFinalSection) {
            const itemMatch = sunFinalSection.match(/Item:\s*([^\n]+)/i);
            if (itemMatch && itemMatch[1]) {
                item = itemMatch[1].trim();
            } else {
                const goalsMatch = sunFinalSection.match(/Activity\/Goals:\s*([^\n]+)/i);
                if (goalsMatch && goalsMatch[1]) {
                    const goals = goalsMatch[1].toLowerCase();
                    if (goals.includes('summoning the staff')) item = 'the staff!';
                    else if (goals.includes('sconce of the wood')) item = 'Sconce of the Wood';
                }
            }
        }

        addEncounter({ party: partyName, staff: staff, time: time, item: item });
    }
    
    // 6. Riddle items
    const riddleRegex = /Endymion’s TOTALLY OPTIONAL Riddle:(?:[\s\S]*?)Location to which party is directed:\s*([^\n]+)/gi;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = riddleRegex.exec(text)) !== null) {
        addEncounter({ party: partyName, staff: 'riddle item found?', time: '--', item: '--' });
    }
    
    if (!encounters.some(e => e.staff === 'riddle item found?')) {
        addEncounter({ party: partyName, staff: 'riddle item found?', time: '--', item: '--' });
    }

    return encounters;
}

function generateCsv(parties: Encounter[][]): string {
    let csv = 'Party,Staff Member,Time,Item to Give\n';
    for (const party of parties) {
        for (const e of party) {
            const row = [e.party, e.staff, e.time, e.item].map(field => {
                const cleanField = field.replace(/"/g, '""');
                if (cleanField.includes(',') || cleanField.includes('"') || cleanField.includes('\n')) return `"${cleanField}"`;
                return cleanField;
            }).join(',');
            csv += row + '\n';
        }
    }
    return csv;
}

// Export for testing
export { parseParties, parseBlock, generateCsv, Encounter, Party };

// Execute if run directly
if (require.main === module) {
    const handbookPath = 'Handbook/2026-only-party-paths.pdf';
    const outputCsv = 'Output/PartyPaths.csv';
    const outputJson = 'Output/PartyPaths.json';
    
    // Ensure output directory exists
    const outputDir = 'Output';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    processHandbook(handbookPath, outputCsv, outputJson);
}
