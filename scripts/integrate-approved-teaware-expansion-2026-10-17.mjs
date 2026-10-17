// Integrate approved dimu-expansion-2026-10-17 cutouts into the published catalogue.
// Strict: verifies hashes, policy admission, dedup, and asset integrity. Dry run by default.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {physicalObjectKey} from './teaware-identity.mjs';
import {classifyTeaware, isSpoonLikeTeaware, normalizedSourceUrl} from './teaware-policy.mjs';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const POOL='output/dimu-expansion-2026-10-17';
const base=await read('src/data/artworks.json');
const before=await read('src/data/collection-cutouts.json');
const approvals=await read(POOL+'/cutouts/approvals.json');
const results=await read(POOL+'/cutouts/results.json');
const downloaded=await read(POOL+'/downloaded.json');
const byId=new Map(downloaded.selected.map(x=>[x.artwork.id,x]));
const resultById=new Map(results.map(x=>[x.id,x]));
assert.equal(base.length,5302,'baseline catalogue must be 5302');
const blocked=[...(await read('research/teaware-exclusions.json')).entries,...(await read('research/teaware-duplicate-aliases.json')).entries];
const ids=new Set([...base,...blocked].map(x=>x.id));
const urls=new Set([...base,...blocked].filter(x=>x.sourceUrl).map(x=>normalizedSourceUrl(x.sourceUrl)));
const keys=new Set(base.map(physicalObjectKey).filter(Boolean));
const sourceHashes=new Set(Object.values(before.assets).map(x=>x.sourceSha256));
const candidateHashes=new Set(Object.values(before.assets).map(x=>x.candidateSha256));
const assets={...before.assets};
const selected=[];
let bytes=before.bytes;
for(const ap of approvals){
  if(ap.decision!=='approve')continue;
  const item=byId.get(ap.id);
  const r=resultById.get(ap.id);
  assert(item&&r,`Missing item/result for ${ap.id}`);
  const a=item.artwork;
  assert.equal(r.cacheKey,ap.cacheKey,`cacheKey mismatch ${ap.id}`);
  assert.equal(r.candidateSha256,ap.candidateSha256,`candidateSha mismatch ${ap.id}`);
  assert.equal(r.sourceSha256,ap.sourceSha256,`sourceSha mismatch ${ap.id}`);
  assert.equal(r.qa.flags.length,0,`QA flags present ${ap.id}`);
  assert(r.alphaLossless&&r.rgbUnchangedBeforeResize,`alpha/rgb gate ${ap.id}`);
  assert(!isSpoonLikeTeaware(a),`spoon-like ${ap.id}`);
  assert.equal(classifyTeaware({...a,titleEnglish:a.titleOriginal},{}).decision,'admit',`policy admit ${ap.id}`);
  const key=physicalObjectKey(a);
  const url=normalizedSourceUrl(a.sourceUrl);
  assert(key&&!ids.has(a.id)&&!urls.has(url)&&!keys.has(key)&&!sourceHashes.has(r.sourceSha256)&&!candidateHashes.has(r.candidateSha256),`Duplicate ${ap.id}`);
  ids.add(a.id);urls.add(url);keys.add(key);sourceHashes.add(r.sourceSha256);candidateHashes.add(r.candidateSha256);
  const assetURL='/collection-cutouts/'+r.cacheKey+'.webp';
  const original='public'+a.imageUrl;
  const cutout='public'+assetURL;
  for(const p of [original,cutout]){try{await fs.access(p);throw Error('Destination exists: '+p);}catch(e){if(e.code!=='ENOENT')throw e;}}
  bytes+=(await fs.stat(r.candidatePath)).size;
  assets[a.id]={url:assetURL,sourceSha256:r.sourceSha256,qaStatus:'reviewed',candidateSha256:r.candidateSha256,shadowBaselinePercent:r.shadowBaselinePercent,shadowContactCenterPercent:r.shadowContactCenterPercent,shadowContactWidthPercent:r.shadowContactWidthPercent,shadowCastCenterPercent:r.shadowCastCenterPercent,shadowCastWidthPercent:r.shadowCastWidthPercent,shadowEnabled:!/^Tea (?:Spoon|Scoop|Strainer|Infuser)$/i.test(a.objectTypeEnglish)&&r.qa.substantialComponents===1};
  selected.push({ap,item,r,a});
}
const catalogue=[...base,...selected.map(x=>x.a)];
const total=catalogue.length;
assert.equal(Object.keys(assets).length,total,`asset count mismatch ${total}`);
assert.equal(new Set(Object.values(assets).map(x=>x.url)).size,total,`unique asset urls ${total}`);
assert(bytes<800*1024**2,`bytes budget ${bytes}`);
const summary={baseline:5302,added:selected.length,total,transparentBytes:bytes,remainingTo6000:6000-total,baseCommit:'(this round)',source:'dimu-expansion-2026-10-17'};
console.log(JSON.stringify(summary,null,2));
if(!process.argv.includes('--apply')){console.log('Dry run; pass --apply to publish.');process.exit(0);}
for(const x of selected){
  await fs.copyFile(x.r.inputPath,'public'+x.a.imageUrl);
  await fs.copyFile(x.r.candidatePath,'public'+assets[x.a.id].url);
}
await write('src/data/artworks.json',catalogue);
await write('public/artworks.json',catalogue);
await write('src/data/collection-cutouts.json',{...before,total,uniqueAssets:total,bytes,assets});
await write('research/teaware-expansion-2026-10-17.json',{...summary,authorization:'Cursor cloud-agent staged, cut out with BiRefNet ONNX, and visually reviewed approved additions on 2026-10-17. Smithsonian (available API key) confirmed exhausted for tea-named NMAA CC0 items; dimu net-new yield limited by license restrictions.',sourceEvidence:selected.map(({ap,item,r,a})=>({id:ap.id,artwork:a,raw:item.raw,imageSource:item.imageSource,rawMetadataSha256:item.rawMetadataSha256,rawImageSha256:item.rawSha256,nativeDimensions:[item.width,item.height],sourceSha256:r.sourceSha256,candidateSha256:r.candidateSha256,cacheKey:r.cacheKey,modelSha256:r.settings.modelSha256,review:ap,admission:null,pool:'dimu-expansion-2026-10-17'}))});
console.log('PUBLISHED',summary);
