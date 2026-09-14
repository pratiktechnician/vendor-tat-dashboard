const fs = require('fs');
const data = JSON.parse(fs.readFileSync('new_vendors_analysis_clean.json', 'utf8'));

console.log('--- Malfonic Summary ---');
const malfonic = data.malfonic;
console.log('Vendor Name:', malfonic.vendorName);
console.log('Total Records:', malfonic.totalRecords);
console.log('Completed:', malfonic.completed);
console.log('WIP:', malfonic.wip);
console.log('Pending:', malfonic.pending);
console.log('Avg TAT:', malfonic.avgPnsTat);
console.log('Avg Target TAT:', malfonic.avgTargetTat);
console.log('In TAT Count:', malfonic.inTatCount);
console.log('Outside TAT Count:', malfonic.outsideTatCount);
console.log('SLA Percent:', malfonic.slaPercent);
console.log('July Regularity:', malfonic.julyUpdateRegularity);
console.log('State Dist:', malfonic.stateDist);
console.log('July Timeline:', malfonic.julyTimeline);

console.log('\n--- Malfonic Team (First 5) ---');
console.log(malfonic.team.slice(0, 5));

console.log('\n--- Malfonic Activities (First 5) ---');
console.log(malfonic.activities.slice(0, 5));
