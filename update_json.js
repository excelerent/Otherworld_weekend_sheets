const fs = require('fs');
const files = ['_PartyTrackerSheetCreator/Input/PartyPaths.json', '_EMDashboardSheetCreator/Input/PartyPaths.json'];

files.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log('File not found: ' + file);
        return;
    }
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // 1. Replace 'riddle item found?' with 'RiddleFound'
    data.forEach(enc => {
        if (enc.staff === 'riddle item found?') {
            enc.staff = 'RiddleFound';
        }
    });

    // Get unique parties
    const parties = [...new Set(data.map(enc => enc.party))];

    // 2. Add Endymion encounter for each party
    parties.forEach(party => {
        data.push({
            'party': party,
            'staff': 'Endymion',
            'time': '9am-5:30pm',
            'item': 'Riddle',
            'Riddle': true
        });
    });

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('Updated ' + file);
});