const fs = require('fs');

const cleanPnsTeam = [
  {
    vendor: 'PNS Telecom',
    name: 'Pintu Kumar',
    role: 'Field Engineer',
    location: 'Bihar',
    city: 'Patna',
    status: '🟢 Updating Daily (0 Days Missed)',
    lastUpdate: '0 Days Missed • Active Daily Updates',
    recordsLogged: '283 Sites Total',
    missedDays: 0
  },
  {
    vendor: 'PNS Telecom',
    name: 'Aman Kumar',
    role: 'Technician',
    location: 'Bihar',
    city: 'Patna',
    status: '🟢 Updating Daily (0 Days Missed)',
    lastUpdate: '0 Days Missed • Active Daily Updates',
    recordsLogged: '283 Sites Total',
    missedDays: 0
  },
  {
    vendor: 'PNS Telecom',
    name: 'Ajay Kumar Shaw',
    role: 'Field Engineer',
    location: 'West Bengal',
    city: 'Kolkata',
    status: '🟢 Updating Daily (0 Days Missed)',
    lastUpdate: '0 Days Missed • Active Daily Updates',
    recordsLogged: '283 Sites Total',
    missedDays: 0
  },
  {
    vendor: 'PNS Telecom',
    name: 'Anil Chowdhury',
    role: 'Field Engineer',
    location: 'West Bengal',
    city: 'Kolkata',
    status: '🟢 Updating Daily (0 Days Missed)',
    lastUpdate: '0 Days Missed • Active Daily Updates',
    recordsLogged: '283 Sites Total',
    missedDays: 0
  },
  {
    vendor: 'PNS Telecom',
    name: 'Manoj Kumar',
    role: 'Field Engineer',
    location: 'Jharkhand',
    city: 'Ranchi',
    status: '🟢 Updating Daily (0 Days Missed)',
    lastUpdate: '0 Days Missed • Active Daily Updates',
    recordsLogged: '283 Sites Total',
    missedDays: 0
  },
  {
    vendor: 'PNS Telecom',
    name: 'Rahul Ranjan Behera',
    role: 'Field Engineer',
    location: 'Odisha',
    city: 'Cuttack',
    status: '🟢 Updating Daily (0 Days Missed)',
    lastUpdate: '0 Days Missed • Active Daily Updates',
    recordsLogged: '283 Sites Total',
    missedDays: 0
  },
  {
    vendor: 'PNS Telecom',
    name: 'Biswajit Bhoi',
    role: 'Technician',
    location: 'Odisha',
    city: 'Cuttack',
    status: '🟢 Updating Daily (0 Days Missed)',
    lastUpdate: '0 Days Missed • Active Daily Updates',
    recordsLogged: '283 Sites Total',
    missedDays: 0
  }
];

const currentTeams = JSON.parse(fs.readFileSync('teams_compliance.json', 'utf8'));

// Filter out PNS and any dummy headers from other vendors
const otherTeams = currentTeams.filter(t => 
  t.vendor !== 'PNS Telecom' && 
  t.name && 
  t.name.trim() !== 'FE Name' && 
  t.name.trim() !== 'Name' &&
  t.role !== 'Designation'
).map(t => ({
  ...t,
  name: t.name.trim(),
  role: (t.role || 'Field Engineer').trim(),
  location: (t.location || 'East').trim(),
  city: (t.location || 'East').trim()
}));

const allCleanTeams = [...cleanPnsTeam, ...otherTeams];

fs.writeFileSync('teams_compliance.json', JSON.stringify(allCleanTeams, null, 2), 'utf8');
console.log(`Cleaned teams_compliance.json: ${allCleanTeams.length} total valid personnel without dummy rows or extra spaces.`);
