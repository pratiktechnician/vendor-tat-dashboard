const fs=require('fs'),path=require('path');const CFG=require('../lib/config'),N=require('../lib/normalize');
const dir=process.argv[2]||'data/mock';let all=[];
for(const v of CFG.vendors){const t=fs.readFileSync(path.join(dir,v.key+'.csv'),'utf8');const {records,meta}=N.normalizeVendorCsv(t,v);all=all.concat(records);
 const cnt=(f)=>{const m={};records.forEach(r=>{const k=f(r);m[k]=(m[k]||0)+1});return m};
 console.log('\n=====',v.name,meta.rows,'rows');console.log('cols',JSON.stringify(meta.columns));console.log('unmapped',meta.unmappedFields.join(','));console.log('lastActivity',meta.lastActivityDate);
 console.log('stage',JSON.stringify(cnt(r=>r.stage)));console.log('status raw',JSON.stringify(cnt(r=>r.statusRaw)).slice(0,400));
 console.log('sla',JSON.stringify(cnt(r=>r.sla)),'targetSource',JSON.stringify(cnt(r=>r.targetSource)));
 console.log('months',JSON.stringify(cnt(r=>r.month)));console.log('issues',JSON.stringify(cnt(r=>r.issues.join('|')||'ok')).slice(0,500));
 console.log('wo',JSON.stringify(cnt(r=>r.woRaw+'→'+r.woState)).slice(0,300));
 const tats=records.map(r=>r.tat).filter(x=>x!=null);console.log('tat n',tats.length,'avg',(tats.reduce((a,b)=>a+b,0)/tats.length).toFixed(2),'max',Math.max(...tats));
}
