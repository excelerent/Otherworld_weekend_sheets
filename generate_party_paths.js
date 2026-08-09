const fs = require('fs');
const pdf = require('pdf-parse');

async function processHandbook(filePath, outputCsv) {
    let dataBuffer = fs.readFileSync(filePath);
    try {
        console.log(`Parsing ${filePath}...`);
        const data = await pdf(dataBuffer);
        const text = data.text;
        
        // Split text into pages or sections. 
        // Based on the example, "Party Paths - [Page]" or "[Page] - Party Paths" is a marker.
        // Also "Party Paths Heading" or just "Party Paths" followed by party names.
        
        const parties = parseParties(text);
        const csvContent = generateCsv(parties);
        
        fs.writeFileSync(outputCsv, csvContent);
        console.log(`Successfully generated ${outputCsv}`);
    } catch (error) {
        console.error('Error processing handbook:', error);
    }
}

function parseParties(text) {
    // The handbook has 11 parties.
    // Each party section starts with a Party Name.
    // We need to identify the party names.
    // In Glendeep example, it starts with "Glendeep" after "Party Paths - 631".
    
    // Let's look for the "Party Paths" section.
    const sections = text.split(/(?=\d{3}\s+-\s+Party\s+Paths|Party\s+Paths\s+-\s+\d{3})/i);
    
    let allPartyData = [];
    
    // We need to know all 11 party names to be sure. 
    // Usually they are listed in the handbook.
    // Based on ProjectGoal.txt examples: Arden, Claria are two of them.
    
    // For now, let's try to detect party headers.
    // A party header seems to be a single word (or two) followed by a description.
    
    let currentParty = null;
    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let partyData = [];
    
    // Improved approach: Identify the "Party Paths" start and then look for party blocks.
    // Each party block starts with the Party Name.
    
    // Based on the example:
    // Glendeep
    // Glendeep’s color is ...
    // Investigating the charge against: ...
    // Companion: ...
    // ...
    // Contact: ...
    // 2nd Friday...
    
    // We can use the known party names if we had them, or detect them.
    // Let's try to detect them by looking for "Companion: " which seems to be near the start.
    
    let currentPartyName = "";
    let partyBlocks = [];
    
    // Heuristic: A party name is followed by "[PartyName]'s color is"
    const partyNameRegex = /^([A-Z][a-z]+)\s*$/;
    const colorRegex = /^([A-Z][a-z]+)[’']s color is/i;

    for (let i = 0; i < lines.length; i++) {
        // Fix for Glendeep being at the end of a line or similar
        const colorMatch = lines[i].match(colorRegex);
        if (colorMatch) {
            let name = colorMatch[1];
            // If the current line is NOT just the name, maybe the name was on the previous line
            if (i > 0 && lines[i-1].length < 20 && lines[i-1].includes(name)) {
                 name = lines[i-1].trim().replace(/[’']s.*/, '');
            }
            
            currentPartyName = name;
            partyBlocks.push({ name: currentPartyName, lines: [] });
        }
        if (partyBlocks.length > 0) {
            partyBlocks[partyBlocks.length - 1].lines.push(lines[i]);
        }
    }

    const results = [];
    for (const block of partyBlocks) {
        results.push(parseBlock(block.name, block.lines));
    }
    
    return results;
}

function parseBlock(partyName, lines) {
    let encounters = [];
    let text = lines.join('\n');
    
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
        // Item for 4th Friday is usually "list of items"
        encounters.push({ party: partyName, staff: fri4[1].trim(), time: '4th Friday', item: 'list of items' });
    }
    
    // 3. Saturday 1st
    const sat1 = text.match(/1st Saturday morning encounter:\s*(.+)/i);
    if (sat1) {
        // Find item for 1st Saturday
        let item = '--';
        const blockAfter = text.split(sat1[0])[1];
        const itemMatch = blockAfter.match(/Item:\s*(.+)/i);
        if (itemMatch) item = itemMatch[1].trim();
        encounters.push({ party: partyName, staff: sat1[1].trim(), time: '1st Saturday', item: item });
    }
    
    // 4. Saturday Unscheduled
    // These appear multiple times
    const satUnscheduledRegex = /Saturday unscheduled encounter:\s*([^\n]+)(?:[\s\S]*?)Item:\s*([^\n]+)(?:[\s\S]*?)Times available \(roughly\):\s*([^\n]+)/gi;
    let match;
    while ((match = satUnscheduledRegex.exec(text)) !== null) {
        let staff = match[1].trim();
        let item = match[2].trim();
        let time = match[3].trim();
        
        // Clean up staff name (sometimes it has challenges)
        if (staff.startsWith('(')) staff = staff.replace(/^\([^)]+\)\s*/, '');
        
        // Special case: "none until tomorrow" or similar
        // ProjectGoal says: Arden,Buzzkill,11am-6pm,none until tomorrow
        if (item.toLowerCase().startsWith('none') && item.includes('tomorrow')) {
             item = 'none until tomorrow';
        }
        
        encounters.push({ party: partyName, staff: staff, time: time, item: item });
    }
    
    // 5. Sunday
    const sunPen = text.match(/Sunday morning penultimate step:\s*(?:meeting up with\s*)?([^\n,]+)/i);
    const sunPenTime = text.match(/Scheduled for:\s*(\d+(?::\d+)?\s*[ap]m)\s*Sunday/i);
    
    if (sunPen) {
        let staff = sunPen[1].trim().replace(/wearing the Shadow Ward.*/, '').trim();
        let time = sunPenTime ? sunPenTime[1] + ' Sunday' : 'Sunday';
        
        let item = '--';
        // Try to find the item in the previous Saturday unscheduled encounter if it says "none (he'll give them the X in the tavern at ... Sunday)"
        const itemPromiseMatch = text.match(/none\s*\([^)]*give them the ([^)]+) in the tavern at [^)]*Sunday\)/i);
        if (itemPromiseMatch) {
            item = itemPromiseMatch[1].trim();
        } else {
             // Fallback: look for Item: near the Sunday section
             const sunSection = text.split(/Sunday morning penultimate step:/i)[1];
             const itemMatch = sunSection ? sunSection.match(/Item:\s*([^\n]+)/i) : null;
             if (itemMatch) item = itemMatch[1].trim();
        }

        encounters.push({ party: partyName, staff: staff, time: time, item: item });
    }

    const sunFinal = text.match(/Sunday morning final step:\s*(.+)/i);
    const sunFinalTime = text.match(/Scheduled for:\s*(\d+(?::\d+)?\s*[ap]m)\s*Sunday/gi);
    if (sunFinal) {
        let staff = sunFinal[1].trim().split('(')[0].trim();
        let time = 'Sunday';
        if (sunFinalTime && sunFinalTime.length > 1) {
            time = sunFinalTime[1].replace(/Scheduled for:\s*/i, '').trim();
        }
        
        let item = '--';
        const sunFinalSection = text.split(/Sunday morning final step:/i)[1];
        const itemMatch = sunFinalSection ? sunFinalSection.match(/Item:\s*([^\n]+)/i) : null;
        if (itemMatch) {
            item = itemMatch[1].trim();
        } else {
            // Check Activity/Goals for clues about the item
            const goalsMatch = sunFinalSection ? sunFinalSection.match(/Activity\/Goals:\s*([^\n]+)/i) : null;
            if (goalsMatch) {
                const goals = goalsMatch[1].toLowerCase();
                if (goals.includes('summoning the staff')) item = 'the staff!';
                else if (goals.includes('sconce of the wood')) item = 'Sconce of the Wood';
            }
        }

        encounters.push({ party: partyName, staff: staff, time: time, item: item });
    }
    
    // 6. Riddle items
    // According to ProjectGoal.txt, each party has a row for each riddle item they find.
    // Example Arden has Arden,riddle item found?,--,--
    // But we should also check if there are actual riddles in the text.
    const riddleRegex = /Endymion’s TOTALLY OPTIONAL Riddle:(?:[\s\S]*?)Location to which party is directed:\s*([^\n]+)/gi;
    let rMatch;
    while ((rMatch = riddleRegex.exec(text)) !== null) {
        encounters.push({ party: partyName, staff: 'riddle item found?', time: '--', item: '--' });
    }
    
    // Ensure at least one riddle item found row if specified
    if (!encounters.some(e => e.staff === 'riddle item found?')) {
        encounters.push({ party: partyName, staff: 'riddle item found?', time: '--', item: '--' });
    }

    return encounters;
}

function generateCsv(parties) {
    let csv = 'Party,Staff Member,Time,Item to Give\n';
    for (const party of parties) {
        for (const e of party) {
            // Escape commas in fields
            const row = [e.party, e.staff, e.time, e.item].map(field => {
                if (field.includes(',')) return `"${field}"`;
                return field;
            }).join(',');
            csv += row + '\n';
        }
    }
    return csv;
}

const handbookPath = 'PartyPath/Handbook/2026-staff-handbook.pdf';
processHandbook(handbookPath, 'PartyPaths.csv');
