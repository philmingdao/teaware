// One-time final image/title gate: replace shared service photographs with
// already reviewed, independently photographed reserve objects.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {physicalObjectKey} from './teaware-identity.mjs';
import {classifyTeaware} from './teaware-policy.mjs';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report=await read('research/teaware-expansion-2026-10-04.json');
assert(!report.sharedPhotographReplacements,'Already finalized');
const before=await read('src/data/artworks.json');
const manifest=await read('src/data/collection-cutouts.json');
const removeIds=new Set(['met-63748','met-63747','met-63745','met-63746','met-460667','met-460930','met-460931','met-210914','met-210901','met-461499','met-461264','met-461225','met-460875','met-461277','met-460932','met-461217']);
const removed=before.filter(x=>removeIds.has(x.id));assert.equal(removed.length,16);
const artworks=before.filter(x=>!removeIds.has(x.id));
const exclusion=await read('research/teaware-exclusions.json');
for(const row of removed){delete manifest.assets[row.id];exclusion.entries.push({id:row.id,sourceUrl:row.sourceUrl,titleEnglish:row.titleEnglish,reason:'single-object-record-illustrated-by-shared-service-or-group-photograph',evidence:'Visual comparison of original and transparent photographs; distinct museum inventory numbers retained in this exclusion archive.',accessionNumber:row.accessionNumber});}
const downloads=new Map((await read('output/round29-rijks/downloaded.json')).selected.map(x=>[x.artwork.id,x]));
const results=new Map((await read('output/round29-rijks/cutouts/results.json')).map(x=>[x.id,x]));
const approvals=new Map((await read('output/round29-rijks/cutouts/approvals.json')).map(x=>[x.id,x]));
const replacements=report.approvedReserve.slice(0,removed.length);
const identities=new Set(artworks.map(physicalObjectKey));
for(const {id} of replacements){
 const x=downloads.get(id),r=results.get(id),review=approvals.get(id),row=x.artwork;
 assert(review.decision==='approve'&&review.cacheKey===r.cacheKey&&review.candidateSha256===r.candidateSha256);
 assert.equal(hash(await fs.readFile(r.candidatePath)),review.candidateSha256);
 assert.equal(hash(await fs.readFile(x.inputPath)),r.sourceSha256);
 assert.equal(x.sourceSha256,r.sourceSha256);assert(r.alphaLossless&&r.rgbUnchangedBeforeResize);
 assert.equal(classifyTeaware(row).decision,'admit');const key=physicalObjectKey(row);assert(key&&!identities.has(key));identities.add(key);
 const {data,info}=await sharp(r.candidatePath).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert(info.width===1200&&info.height===1200);let opaque=0;
 for(let y=0;y<1200;y++)for(let z=0;z<1200;z++){const a=data[(y*1200+z)*4+3];if(a>=244)opaque++;if(!y||!z||y===1199||z===1199)assert.equal(a,0);}assert(opaque>0);
 row.titleOriginal ||= row.titleEnglish;row.imageAlt=row.titleEnglish;row.crawlBatchId='reviewed-teaware-2026-10-04';
 const url='/collection-cutouts/'+r.cacheKey+'.webp';await fs.copyFile(x.inputPath,'public'+row.imageUrl);await fs.copyFile(r.candidatePath,'public'+url);
 manifest.assets[id]={url,sourceSha256:r.sourceSha256,qaStatus:'reviewed',candidateSha256:r.candidateSha256,shadowBaselinePercent:r.shadowBaselinePercent,shadowContactCenterPercent:r.shadowContactCenterPercent,shadowContactWidthPercent:r.shadowContactWidthPercent,shadowCastCenterPercent:r.shadowCastCenterPercent,shadowCastWidthPercent:r.shadowCastWidthPercent,shadowEnabled:r.repair?.shadowEnabled??(r.kind==='object'&&r.qa.substantialComponents===1)};
 artworks.push(row);report.byMuseum[row.sourceMuseumEnglish]++;
 report.accepted.push({id,museum:row.sourceMuseumEnglish,accessionNumber:row.accessionNumber,sourceUrl:row.sourceUrl,imageSource:x.imageSource,imageLicenseUrl:x.imageLicenseUrl,license:row.license,creditLine:row.creditLine,retrievedAt:x.retrievedAt,rawMetadataSha256:x.rawMetadataSha256,rawImageSha256:x.rawSha256,sourceSha256:x.sourceSha256,sourceDimensions:[x.width,x.height],candidateSha256:r.candidateSha256,cacheKey:r.cacheKey,modelSha256:r.modelSha256,review});
}
assert.equal(artworks.length,3000);const urls=new Set(Object.values(manifest.assets).map(x=>x.url));assert.equal(urls.size,3000);
manifest.total=3000;manifest.uniqueAssets=urls.size;manifest.bytes=0;for(const url of urls)manifest.bytes+=(await fs.stat('public'+url)).size;
report.sharedPhotographReplacements={removed:removed.map(x=>({id:x.id,accessionNumber:x.accessionNumber,sourceUrl:x.sourceUrl,reason:'Shared group photograph does not illustrate one independently registered object'})),added:replacements.map(x=>x.id)};
report.retainedBaseline-=removed.length;report.added+=replacements.length;report.approvedReserve=report.approvedReserve.slice(replacements.length);report.transparentAssets=urls.size;report.transparentBytes=manifest.bytes;report.originalPublishedTotal=2000;report.totalBaselineRemoved=2000-report.retainedBaseline;
await write('src/data/artworks.json',artworks);await write('public/artworks.json',artworks);await fs.writeFile('src/data/collection-cutouts.json',JSON.stringify(manifest)+'\n');await write('research/teaware-exclusions.json',exclusion);await write('research/teaware-expansion-2026-10-04.json',report);
console.log({total:artworks.length,retained:report.retainedBaseline,added:report.added,removed:report.totalBaselineRemoved,uniqueTransparentImages:urls.size,reserve:report.approvedReserve.length});
