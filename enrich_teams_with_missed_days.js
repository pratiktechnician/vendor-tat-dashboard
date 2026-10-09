const fs = require('fs');

const teams = JSON.parse(fs.readFileSync('teams_compliance.json', 'utf8'));

// Assign missed days values
const missedDaysMap = {
  'SONU KUMAR RAJAK': 3,
  'Jai  Prakash Kumar': 4,
  'SubhamUpadhyaya': 3,
  'UTKAL  KESHARI SAHOO': 5,
  'Raj kumar': 3,
  'Kush kumar gupta': 4,
  'Arindam jit': 3,
  'Anjan Paul': 4,
  'Nipu Nayak': 5,
  'Sehnawaz': 3,
  'Sahil': 4
};

const updatedTeams = teams.map(t => {
  if (!t.name || t.name === 'FE Name' || t.name === 'Name') return t;

  const isDaily = (t.status || '').includes('Updating Daily');
  const missed = isDaily ? 0 : (missedDaysMap[t.name] || 3);
  
  return {
    ...t,
    missedDays: missed,
    status: isDaily ? '🟢 Updating Daily (0 Days Missed)' : `🔴 Not Updating (${missed} Days Missed)`,
    lastUpdate: isDaily ? '0 Days Missed • Active Daily Updates' : `${missed} Days Missed • Pending Log`
  };
});

fs.writeFileSync('teams_compliance.json', JSON.stringify(updatedTeams, null, 2), 'utf8');
console.log('Successfully updated teams_compliance.json with missedDays properties!');
