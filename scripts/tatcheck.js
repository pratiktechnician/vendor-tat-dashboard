const fs=require('fs'),path=require('path');const CFG=require('../lib/config'),N=require('../lib/normalize');
const dd=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
for(const v of CFG.vendors){const t=fs.readFileSync('data/mock/'+v.key+'.csv','utf8');const {records}=N.normalizeVendorCsv(t,v);
 let n=0,eqA=0,eqP=0,eqA1=0,neq=[];
 for(const r of records){if(!r.completed||r.tat==null||!r.assignedDate||!r.completedDate)continue;n++;const a=dd(r.assignedDate,r.completedDate);const p=r.permDate?dd(r.permDate,r.completedDate):null;
  if(a===r.tat)eqA++;else if(Math.abs(a-r.tat)<=1)eqA1++;else if(p===r.tat)eqP++;else neq.push([r.siteId,r.assignedDate,r.permDate,r.completedDate,r.tat,a]);}
 console.log(v.name,'n',n,'tat==completed-assigned',eqA,'±1',eqA1,'==completed-perm',eqP,'other',neq.length);console.log(neq.slice(0,6).map(x=>x.join(' ')).join('\n'));}
// RIPL negatives
const v=CFG.vendors[2];const {records}=N.normalizeVendorCsv(fs.readFileSync('data/mock/ripl.csv','utf8'),v);
console.log('RIPL neg completed:');records.filter(r=>r.issues.includes('negative_tat')&&r.completed).slice(0,6).forEach(r=>console.log(r.siteId,r.assignedDate,r.completedDate,r.statusRaw,r.row));
