import { parseParties, parseBlock, generateCsv, Encounter } from './generate_party_paths';

describe('Party Path Parser', () => {
    test('parseParties should find parties with special characters', () => {
        const text = `
Dolorón
Dolorón's color is Red
Contact: Staff 1
2nd Friday night encounter: Staff 2

P’loa
P’loa’s color is Blue
Contact: Staff 3

Uri-Kesh
Uri-Kesh's color is Green
Contact: Staff 4
        `;
        const result = parseParties(text);
        expect(result.length).toBe(3);
        expect(result[0]![0]!.party).toBe('Dolorón');
        expect(result[1]![0]!.party).toBe("P'loa");
        expect(result[2]![0]!.party).toBe('Uri-Kesh');
    });

    test('parseBlock should identify PathItem, Insight, and Riddle', () => {
        const lines = [
            'Arden',
            "Arden's color is green",
            '4th Friday night encounter: Isaiah Cooke',
            'Activity/Goals: gives the party their list of items (locus root, cowry shell, citrine shards)',
            '1st Saturday morning encounter: Kiko Truthspeaker',
            'Challenge: doing the Cup of Insight challenge',
            'Item: locus root',
            'Saturday unscheduled encounter: Moxie',
            'Item: riddle to argentum heart',
            'Times available (roughly): 10am-5pm'
        ];
        const result = parseBlock('Arden', lines);
        
        const sat1 = result.find(e => e.time === '1st Saturday');
        expect(sat1?.item).toBe('locus root');
        expect(sat1?.PathItem).toBe(true);
        expect(sat1?.Insight).toBe(true);
        
        const moxie = result.find(e => e.staff === 'Moxie');
        expect(moxie?.item).toBe('riddle to argentum heart');
        expect(moxie?.Riddle).toBe(true);
        expect(moxie?.PathItem).toBe(true); // Now identifies as path item because it's a Saturday unscheduled encounter giving something
    });

    test('parseBlock should extract contact encounter', () => {
        const lines = [
            'Arden',
            "Arden's color is green",
            'Contact: Aria Morgan',
            '2nd Friday night encounter: Ursula Smirch'
        ];
        const result = parseBlock('Arden', lines);
        expect(result).toContainEqual({
            party: 'Arden',
            staff: 'Aria Morgan',
            time: 'Contact',
            item: '--'
        });
    });

    test('generateCsv should format encounters correctly', () => {
        const encounters: Encounter[][] = [[
            { party: 'Arden', staff: 'Aria Morgan', time: 'Contact', item: '--' },
            { party: 'Arden', staff: 'Buzzkill', time: '11am-6pm', item: 'none until tomorrow' }
        ]];
        const csv = generateCsv(encounters);
        expect(csv).toContain('Party,Staff Member,Time,Item to Give');
        expect(csv).toContain('Arden,Aria Morgan,Contact,--');
        expect(csv).toContain('Arden,Buzzkill,11am-6pm,none until tomorrow');
    });

    test('parseBlock should handle Sunday penultimate step with promised item', () => {
        const lines = [
            'Arden',
            'Saturday unscheduled encounter: Denison Bannister',
            "Item: none (he'll give them the argentum heart in the tavern at 9:45am Sunday)",
            'Times available (roughly): 12pm-7:15pm',
            'Sunday morning penultimate step: Denison Bannister',
            'Scheduled for: 9:45am Sunday'
        ];
        const result = parseBlock('Arden', lines);
        const sunPen = result.find(e => e.time === '9:45am Sunday');
        expect(sunPen).toBeDefined();
        expect(sunPen?.item).toBe('argentum heart');
    });
});
