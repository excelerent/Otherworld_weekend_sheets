import * as fs from 'fs';
import pdf from 'pdf-parse';

interface Encounter {
    party: string;
    staff: string;
    time: string;
    item: string;
}

interface Party {
    name: string;
    lines: string[];
}

async function processHandbook(filePath: string, outputCsv: string): Promise<void> {
    const dataBuffer = fs.readFileSync(filePath);
    try {
        console.log(`Parsing ${filePath}...`);
        const data = await pdf(dataBuffer);
        const text = data.text;
        
        const parties = parseParties(text);
        const csvContent = generateCsv(parties);
        
        fs.writeFileSync(outputCsv, csvContent);
        console.log(`Successfully generated ${outputCsv}`);
    } catch (error) {
        console.error('Error processing handbook:', error);
    }
}

function parseParties(text: string): Encounter[][] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const colorRegex = /^([A-Z][a-z]+)[’']s color is/i;
    const partyBlocks: Party[] = [];

    for (let i = 0; i < lines.length; i++) {
        const colorMatch = lines[i].match(colorRegex);
        if (colorMatch) {
            let name = colorMatch[1];
            if (i > 0 && lines[i-1].length < 20 && lines[i-1].includes(name)) {
                 name = lines[i-1].trim().replace(/[’']s.*/, '');
            }
            
            partyBlocks.push({ name: name, lines: [] });
        }
        if (partyBlocks.length > 0) {
            partyBlocks[partyBlocks.length - 1].lines.push(lines[i]);
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
    
    // 1. Contact
    const contactMatch = text.match(/Contact:\s*(.+)/i);
    if (contactMatch) {
        encounters.push({ party: partyName, staff: contactMatch[1].trim(), time: 'Contact', item: '--' });
    }
    
    // 2. Friday Encounters
    const fri2 = text.match(/2nd Friday night encounter:\s*(.+)/i);
    if (fri2) encounters.push({ party: partyName, staff: fri2[1].trim(), time: '2nd Friday', item: '--' });
    
    const fri3 = text.match(/3rd Friday night encounter:\s*(.+)/i);
    if (fri3) encounters.push({ party: partyName, staff: fri3[1].trim(), time: '3rd Friday', item: '--' });
    
    const fri4 = text.match(/4th Friday night encounter:\s*(.+)/i);
    if (fri4) {
        encounters.push({ party: partyName, staff: fri4[1].trim(), time: '4th Friday', item: 'list of items' });
    }
    
    // 3. Saturday 1st
    const sat1 = text.match(/1st Saturday morning encounter:\s*(.+)/i);
    if (sat1) {
        let item = '--';
        const parts = text.split(sat1[0]);
        if (parts.length > 1) {
            const blockAfter = parts[1];
            const itemMatch = blockAfter.match(/Item:\s*(.+)/i);
            if (itemMatch) item = itemMatch[1].trim();
        }
        encounters.push({ party: partyName, staff: sat1[1].trim(), time: '1st Saturday', item: item });
    }
    
    // 4. Saturday Unscheduled
    const satUnscheduledRegex = /Saturday unscheduled encounter:\s*([^\n]+)(?:[\s\S]*?)Item:\s*([^\n]+)(?:[\s\S]*?)Times available \(roughly\):\s*([^\n]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = satUnscheduledRegex.exec(text)) !== null) {
        let staff = match[1].trim();
        let item = match[2].trim();
        const time = match[3].trim();
        
        if (staff.startsWith('(')) staff = staff.replace(/^\([^)]+\)\s*/, '');
        
        if (item.toLowerCase().startsWith('none') && item.includes('tomorrow')) {
             item = 'none until tomorrow';
        }
        
        encounters.push({ party: partyName, staff: staff, time: time, item: item });
    }
    
    // 5. Sunday
    const sunPen = text.match(/Sunday morning penultimate step:\s*(?:meeting up with\s*)?([^\n,]+)/i);
    const sunPenTime = text.match(/Scheduled for:\s*(\d+(?::\d+)?\s*[ap]m)\s*Sunday/i);
    
    if (sunPen) {
        const staff = sunPen[1].trim().replace(/wearing the Shadow Ward.*/, '').trim();
        const time = sunPenTime ? sunPenTime[1] + ' Sunday' : 'Sunday';
        
        let item = '--';
        const itemPromiseMatch = text.match(/none\s*\([^)]*give them the ([^)]+) in the tavern at [^)]*Sunday\)/i);
        if (itemPromiseMatch) {
            item = itemPromiseMatch[1].trim();
        } else {
             const sunSectionParts = text.split(/Sunday morning penultimate step:/i);
             const sunSection = sunSectionParts.length > 1 ? sunSectionParts[1] : null;
             const itemMatch = sunSection ? sunSection.match(/Item:\s*([^\n]+)/i) : null;
             if (itemMatch) item = itemMatch[1].trim();
        }

        encounters.push({ party: partyName, staff: staff, time: time, item: item });
    }

    const sunFinal = text.match(/Sunday morning final step:\s*(.+)/i);
    const sunFinalTimeMatch = text.match(/Scheduled for:\s*(\d+(?::\d+)?\s*[ap]m)\s*Sunday/gi);
    if (sunFinal) {
        const staff = sunFinal[1].trim().split('(')[0].trim();
        let time = 'Sunday';
        if (sunFinalTimeMatch && sunFinalTimeMatch.length > 1) {
            time = sunFinalTimeMatch[1].replace(/Scheduled for:\s*/i, '').trim();
        }
        
        let item = '--';
        const sunFinalSectionParts = text.split(/Sunday morning final step:/i);
        const sunFinalSection = sunFinalSectionParts.length > 1 ? sunFinalSectionParts[1] : null;
        const itemMatch = sunFinalSection ? sunFinalSection.match(/Item:\s*([^\n]+)/i) : null;
        if (itemMatch) {
            item = itemMatch[1].trim();
        } else if (sunFinalSection) {
            const goalsMatch = sunFinalSection.match(/Activity\/Goals:\s*([^\n]+)/i);
            if (goalsMatch) {
                const goals = goalsMatch[1].toLowerCase();
                if (goals.includes('summoning the staff')) item = 'the staff!';
                else if (goals.includes('sconce of the wood')) item = 'Sconce of the Wood';
            }
        }

        encounters.push({ party: partyName, staff: staff, time: time, item: item });
    }
    
    // 6. Riddle items
    const riddleRegex = /Endymion’s TOTALLY OPTIONAL Riddle:(?:[\s\S]*?)Location to which party is directed:\s*([^\n]+)/gi;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = riddleRegex.exec(text)) !== null) {
        encounters.push({ party: partyName, staff: 'riddle item found?', time: '--', item: '--' });
    }
    
    if (!encounters.some(e => e.staff === 'riddle item found?')) {
        encounters.push({ party: partyName, staff: 'riddle item found?', time: '--', item: '--' });
    }

    return encounters;
}

function generateCsv(parties: Encounter[][]): string {
    let csv = 'Party,Staff Member,Time,Item to Give\n';
    for (const party of parties) {
        for (const e of party) {
            const row = [e.party, e.staff, e.time, e.item].map(field => {
                if (field.includes(',')) return `"${field}"`;
                return field;
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
    const handbookPath = 'PartyPath/Handbook/2026-staff-handbook.pdf';
    processHandbook(handbookPath, 'PartyPaths.csv');
}
