// Merge only hash-pinned visual approvals. Run without --publish for a dry run.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {physicalObjectKey, normalizedAccession} from './teaware-identity.mjs';
import {classifyTeaware, normalizedSourceUrl} from './teaware-policy.mjs';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const roots=['met-full','mia','rijks','colbase','rijks-extra','colbase-extra','colbase-historical','rijks-accessories','paris','paris-iiif'].map(x=>'output/round29-'+x);
const baseline=await read('src/data/artworks.json');
assert(baseline.length<3000,'Already integrated; do not run twice');
const previousManifest=await read('src/data/collection-cutouts.json');
const aliases=await read('research/teaware-duplicate-aliases.json');
const exclusions=await read('research/teaware-exclusions.json');
const pool=[],reviews=[],rejected=[];
for(const root of roots){
 const downloads=new Map((await read(root+'/downloaded.json')).selected.map(x=>[x.artwork.id,x]));
 const records=new Map((await read(root+'/cutouts/results.json')).map(x=>[x.id,x]));
 const decisions=await read(root+'/cutouts/approvals.json');
 for(const decision of decisions){
  const item=downloads.get(decision.id),record=records.get(decision.id);
  assert(item&&record,'Missing source or processing record');
  assert.equal(record.cacheKey,decision.cacheKey);assert.equal(record.candidateSha256,decision.candidateSha256);
  if(decision.decision!=='approve'){rejected.push({id:decision.id,sourceUrl:item.artwork.sourceUrl,reason:decision.notes});continue;}
  assert(decision.notes&&record.alphaLossless&&record.rgbUnchangedBeforeResize,'Missing quality approval');
  assert.equal(hash(await fs.readFile(record.candidatePath)),decision.candidateSha256,'Candidate changed after review');
  assert.equal(hash(await fs.readFile(item.inputPath)),record.sourceSha256,'Original changed after review');
  assert.equal(item.sourceSha256,record.sourceSha256);
  assert.equal(classifyTeaware(item.artwork).decision,'admit','Source tea-use evidence missing');
  assert(physicalObjectKey(item.artwork),'No full museum object identity');
  pool.push({...item,record,decision,root});reviews.push({...decision,root});
 }
}
// Official museum numbers embedded in mirror filenames refer to the same
// physical objects. Prefer approved museum-source records over their mirrors.
const officialRijks=new Map([...baseline,...pool.map(x=>x.artwork)].filter(x=>x.sourceMuseumEnglish==='Rijksmuseum').map(x=>[normalizedAccession(x.accessionNumber),x]));
const removals=new Map();
for(const row of baseline){
 if(row.sourceMuseumEnglish!=='Wikimedia Commons')continue;
 const filename=decodeURIComponent(row.sourceUrl).split('File:')[1]||'';
 const accession=filename.match(/(?:AK|BK|NG)-(?:[A-Z0-9]+-)*[A-Z0-9]+/i)?.[0];
 const canonical=officialRijks.get(normalizedAccession(accession));
 if(canonical)removals.set(row.id,{id:row.id,canonicalId:canonical.id,sourceUrl:row.sourceUrl,reason:'museum-mirror-full-accession-match',institution:'Rijksmuseum',accessionNumber:canonical.accessionNumber,evidenceUrl:canonical.sourceUrl});
}
for(const id of ['wmc-27254409','wmc-27254411','wmc-27254415']){
 const row=baseline.find(x=>x.id===id);assert(row&&row.titleEnglish.includes('LACMA M.2009.16a-c'));
 removals.set(id,{id,canonicalId:'wmc-27254404',sourceUrl:row.sourceUrl,reason:'same-LACMA-object-alternate-view-confirmed-by-full-accession-and-image-review',institution:'Los Angeles County Museum of Art',accessionNumber:'M.2009.16a-c'});
}
const furisode=baseline.find(x=>x.id==='wmc-57536149');
if(furisode)removals.set(furisode.id,{id:furisode.id,canonicalId:'colbase-tnm-G-5749',sourceUrl:furisode.sourceUrl,reason:'same-named-Furisode-bowl-confirmed-by-rim-foot-and-decoration-comparison',institution:'Tokyo National Museum',accessionNumber:'G-5749',evidenceUrl:'https://colbase.nich.go.jp/collection_items/tnm/G-5749'});
const kept=baseline.filter(x=>!removals.has(x.id));
const lacma=kept.find(x=>x.id==='wmc-27254404');
Object.assign(lacma,{sourceMuseum:'洛杉矶郡艺术博物馆',sourceMuseumEnglish:'Los Angeles County Museum of Art',accessionNumber:'M.2009.16a-c'});
const ids=new Set(kept.map(x=>x.id)),sources=new Set(kept.map(x=>normalizedSourceUrl(x.sourceUrl))),keys=new Set(kept.map(physicalObjectKey).filter(Boolean));
const imageHashes=new Set(kept.map(x=>previousManifest.assets[x.id].sourceSha256));
const blockedIds=new Set([...aliases.entries,...exclusions.entries].map(x=>x.id));
const blockedUrls=new Set(exclusions.entries.map(x=>normalizedSourceUrl(x.sourceUrl)));
const mustKeep=new Set([...removals.values()].map(x=>x.canonicalId));
// Preserve all baseline objects; prioritize their official replacements, then
// East Asian museum objects and direct open-image records for the new slots.
const rank=x=>mustKeep.has(x.artwork.id)?0:x.artwork.id.startsWith('colbase-')?1:x.artwork.id.startsWith('paris-musee-cernuschi-')?2:3;
pool.sort((a,b)=>rank(a)-rank(b)||a.artwork.id.localeCompare(b.artwork.id));
const candidates=[],collisions=[];
for(const x of pool){
 const row=x.artwork,key=physicalObjectKey(row),url=normalizedSourceUrl(row.sourceUrl);
 if(ids.has(row.id)||sources.has(url)||keys.has(key)||imageHashes.has(x.sourceSha256)||blockedIds.has(row.id)||blockedUrls.has(url)){
  collisions.push({id:row.id,key,sourceUrl:row.sourceUrl,reason:'cross-pool-or-baseline-duplicate-or-blocked'});continue;
 }
 ids.add(row.id);sources.add(url);keys.add(key);imageHashes.add(x.sourceSha256);candidates.push(x);
}
const target=3000,selected=candidates.slice(0,target-kept.length),reserve=candidates.slice(target-kept.length);
assert.equal(kept.length+selected.length,target,`Insufficient approved unique objects: ${kept.length+candidates.length}`);
const finalIds=new Set([...kept,...selected.map(x=>x.artwork)].map(x=>x.id));
for(const id of mustKeep)assert(finalIds.has(id),`Mirror replacement missing: ${id}`);
const decode=s=>String(s||'').replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,h,n)=>String.fromCodePoint(parseInt(h||n,h?16:10))).replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,k)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[k]).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
for(const {artwork:row,raw} of selected){
 for(const key of ['titleEnglish','titleOriginal','materialEnglish','description','date','period','dimensions'])if(row[key])row[key]=decode(row[key]);
 row.titleOriginal ||= row.titleEnglish;
 row.imageAlt=row.titleEnglish;
 row.crawlBatchId='reviewed-teaware-2026-10-04';
 if(row.id.startsWith('colbase-')){
  row.titleOriginal=decode(raw['作品名']);
  if(/磁製|porcelain/i.test(row.materialEnglish))row.material='瓷';else if(/stoneware/i.test(row.materialEnglish))row.material='炻器';else if(/陶製|earthenware/i.test(row.materialEnglish))row.material='陶';else if(/鉄製|iron/i.test(row.materialEnglish))row.material='铁';
  if(row.material!=='未核实')row.titleChinese=row.material+row.objectType;
  for(const [text,zh,en]of [['安土桃山','安土桃山','Azuchi–Momoyama'],['江戸','江户','Edo'],['桃山','桃山','Momoyama'],['室町','室町','Muromachi'],['鎌倉','镰仓','Kamakura'],['明治','明治','Meiji'],['南宋','南宋','Southern Song'],['宋','宋','Song'],['清','清','Qing'],['明','明','Ming']])if(row.date.includes(text)){row.dynasty=zh;row.dynastyEnglish=en;break;}
 }
}
// Validate real pixels before changing any production data.
const checkCandidate=async record=>{
 const {data,info}=await sharp(record.candidatePath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert(info.width===1200&&info.height===1200,'Unexpected export size');let clear=0,opaque=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3];if(!a)clear++;if(a>=244)opaque++;
  if(x===0||y===0||x===info.width-1||y===info.height-1)assert.equal(a,0,'Non-transparent image perimeter');
 }assert(clear>0&&opaque>0,'Invalid alpha');
};
const repairs=await read('output/round29-base-repairs/cutouts/results.json');
const repairApprovals=new Map((await read('output/round29-base-repairs/cutouts/approvals.json')).map(x=>[x.id,x]));
for(const record of repairs){const approval=repairApprovals.get(record.id);assert(approval?.decision==='approve'&&approval.cacheKey===record.cacheKey&&approval.candidateSha256===record.candidateSha256);assert.equal(hash(await fs.readFile(record.candidatePath)),approval.candidateSha256);assert(kept.some(x=>x.id===record.id));}
for(const x of selected)await checkCandidate(x.record);
for(const r of repairs)await checkCandidate(r);
const counts={};for(const x of selected)counts[x.artwork.sourceMuseumEnglish]=(counts[x.artwork.sourceMuseumEnglish]||0)+1;
const summary={date:'2026-10-04',target,baselineAtIntegration:baseline.length,additionalDuplicatesRemoved:removals.size,retainedBaseline:kept.length,added:selected.length,finalTotal:target,approvedReserve:reserve.length,byMuseum:counts,crossPoolCollisions:collisions};
await write('output/round29/final-integration-plan.json',summary);console.log(JSON.stringify(summary,null,2));
if(!process.argv.includes('--publish'))process.exit(0);
const assets={};for(const row of kept)assets[row.id]=previousManifest.assets[row.id];
const install=async(row,record)=>{
 const url='/collection-cutouts/'+record.cacheKey+'.webp';await fs.copyFile(record.candidatePath,'public'+url);
 assets[row.id]={url,sourceSha256:record.sourceSha256,qaStatus:'reviewed',candidateSha256:record.candidateSha256,shadowBaselinePercent:record.shadowBaselinePercent,shadowContactCenterPercent:record.shadowContactCenterPercent,shadowContactWidthPercent:record.shadowContactWidthPercent,shadowCastCenterPercent:record.shadowCastCenterPercent,shadowCastWidthPercent:record.shadowCastWidthPercent,shadowEnabled:!/^Tea (?:Spoon|Scoop|Strainer|Infuser)$/i.test(row.objectTypeEnglish)&&(record.repair?.shadowEnabled??(record.kind==='object'&&record.qa.substantialComponents===1))};
};
for(const x of selected){await fs.copyFile(x.inputPath,'public'+x.artwork.imageUrl);await install(x.artwork,x.record);}
for(const r of repairs)await install(kept.find(x=>x.id===r.id),r);
const catalogue=[...kept,...selected.map(x=>x.artwork)],urls=[...new Set(Object.values(assets).map(x=>x.url))];
let bytes=0;for(const url of urls)bytes+=(await fs.stat('public'+url)).size;
assert(bytes<800*1024**2,'Transparent publication budget exceeded');
await write('src/data/artworks.json',catalogue);await write('public/artworks.json',catalogue);
await fs.writeFile('src/data/collection-cutouts.json',JSON.stringify({version:1,total:catalogue.length,uniqueAssets:urls.length,bytes,assets})+'\n');
aliases.entries.push(...removals.values());aliases.date='2026-10-04';await write('research/teaware-duplicate-aliases.json',aliases);
const report={...summary,transparentAssets:urls.length,transparentBytes:bytes,admission:'Explicit museum tea use; no flat artwork, textile, display-scene, stand, isolated fragment or duplicate physical object knowingly admitted.',imageProcess:'Local BiRefNet full MPS FP16; original RGB retained before resizing; 1200px transparent WebP canvas with 10% margin; approvals bound to candidate SHA256.',removedAliases:[...removals.values()],repaired:repairs.map(x=>({id:x.id,sourceSha256:x.sourceSha256,candidateSha256:x.candidateSha256,approval:repairApprovals.get(x.id)})),rejected,approvedReserve:reserve.map(x=>({id:x.artwork.id,sourceUrl:x.artwork.sourceUrl,approval:x.decision})),accepted:selected.map(x=>({id:x.artwork.id,museum:x.artwork.sourceMuseumEnglish,accessionNumber:x.artwork.accessionNumber,sourceUrl:x.artwork.sourceUrl,imageSource:x.imageSource,imageLicenseUrl:x.imageLicenseUrl,license:x.artwork.license,creditLine:x.artwork.creditLine,retrievedAt:x.retrievedAt,rawMetadataSha256:x.rawMetadataSha256,rawImageSha256:x.rawSha256,sourceSha256:x.sourceSha256,sourceDimensions:[x.width,x.height],candidateSha256:x.record.candidateSha256,cacheKey:x.record.cacheKey,modelSha256:x.record.modelSha256,review:x.decision,historicalAttribution:x.historicalAttribution}))};
await write('research/teaware-expansion-2026-10-04.json',report);
const readme=await fs.readFile('README.md','utf8');await fs.writeFile('README.md',readme.replaceAll('2,000','3,000'));
console.log(`Installed ${selected.length} additions; ${catalogue.length} catalogue records; ${urls.length} transparent assets; ${(bytes/1024**2).toFixed(1)} MiB.`);
