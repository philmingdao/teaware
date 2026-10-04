import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile),root='output/round29';await fs.mkdir(`${root}/cache`,{recursive:true});
const rows=JSON.parse(await fs.readFile('src/data/artworks.json','utf8'));
const numeric=rows.filter(x=>x.id.startsWith('rks-')&&/^\d+$/.test(x.accessionNumber));
const groups=new Map();for(const row of rows){if(row.sourceMuseumEnglish!=='Rijksmuseum'||!row.accessionNumber||/^\d+$/.test(row.accessionNumber))continue;const key=row.accessionNumber.toUpperCase().replace(/\s/g,'');groups.set(key,[...(groups.get(key)||[]),row]);}
const pairs=[...groups].filter(([,v])=>v.length>1);const ids=new Set([...numeric.map(x=>x.id),...pairs.flatMap(([,v])=>v.filter(x=>x.id.startsWith('rks-')).map(x=>x.id))]);
const official=new Map(),failures=[];
for(const id of ids){const url=`https://id.rijksmuseum.nl/${id.slice(4)}`,file=`${root}/cache/${id}.json`;try{let bytes;try{bytes=await fs.readFile(file)}catch{({stdout:bytes}=await run('curl',['--noproxy','*','-L','--fail','--silent','--show-error','--max-time','30','-H','Accept: application/ld+json',url],{encoding:'buffer',maxBuffer:8*1024*1024}));await fs.writeFile(file,bytes)}const obj=JSON.parse(bytes);const accession=(obj.identified_by||[]).find(i=>i.type==='Identifier'&&i.classified_as?.some(c=>['https://id.rijksmuseum.nl/22015218','http://vocab.getty.edu/aat/300312355'].includes(c.id)))?.content;official.set(id,{id,url,accession,title:obj._label,identifiers:obj.identified_by?.filter(i=>i.type==='Identifier'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});console.log(id,accession)}catch(e){failures.push({id,error:String(e)})}}
const repairs=numeric.map(r=>({id:r.id,old:r.accessionNumber,...official.get(r.id)}));const duplicates=pairs.map(([accession,rs])=>({accession,rows:rs.map(r=>({id:r.id,title:r.titleEnglish,sourceUrl:r.sourceUrl,accession:r.accessionNumber})),official:rs.filter(r=>r.id.startsWith('rks-')).map(r=>official.get(r.id))}));await fs.writeFile(`${root}/baseline-review.json`,JSON.stringify({retrievedAt:new Date().toISOString(),total:rows.length,repairs,duplicates,failures},null,2));console.log('COMPLETE',JSON.stringify({repairs:repairs.length,pairs:duplicates.length,failures:failures.length}));
