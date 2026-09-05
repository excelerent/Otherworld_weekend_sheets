const fs = require('fs');
const dirs = ['_PartyTrackerSheetCreator', '_EMDashboardSheetCreator'];

dirs.forEach(dir => {
    const jsonPath = dir + '/Input/PartyPaths.json';
    const dataPath = dir + '/src/data.ts';
    
    if (fs.existsSync(jsonPath) && fs.existsSync(dataPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        let tsContent = fs.readFileSync(dataPath, 'utf8');
        
        const newFunc = 'function getPathsData() {\n  return ' + JSON.stringify(jsonData, null, 2) + ';\n}';
        tsContent = tsContent.replace(/function getPathsData\(\) \{[\s\S]*?\n\}/, newFunc);
        
        fs.writeFileSync(dataPath, tsContent);
        console.log('Updated ' + dataPath);
    }
});