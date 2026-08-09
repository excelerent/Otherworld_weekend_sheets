import { parseBlock, generateCsv, Encounter } from './generate_party_paths';

describe('Party Path Parser', () => {
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
