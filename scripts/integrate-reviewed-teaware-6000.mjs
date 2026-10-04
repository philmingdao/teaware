// Six-thousand-object release: no image reaches production without a hash-bound
// source check and an explicit visual approval. Default is a non-mutating dry run.
import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';import sharp from 'sharp';
import {physicalObjectKey} from './teaware-identity.mjs';import {classifyTeaware,normalizedSourceUrl} from './teaware-policy.mjs';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const baseline=await read('src/data/artworks.json'),before=await read('src/data/collection-cutouts.json');assert.equal(baseline.length,4000,'Expected verified 4000-object baseline; do not run twice');
const admissions=await read('research/teaware-admissions.json'),exclusions=await read('research/teaware-exclusions.json'),aliases=await read('research/teaware-duplicate-aliases.json');
const roots=['dimu-legacy','dimu-a','dimu-b','dimu-c','finna','emuseum'].map(x=>'output/round31-'+x),pool=[],rejected=[],allAdmissions={...admissions};
for(const root of roots){
 try{await fs.access(root+'/cutouts/approvals.json');}catch(e){if(e.code==='ENOENT')continue;throw e;}
 const source=await read(root+'/downloaded.json'),downloads=new Map(source.selected.map(x=>[x.artwork.id,x])),records=new Map((await read(root+'/cutouts/results.json')).map(x=>[x.id,x]));
 let reviewed={};try{reviewed=await read(root+'/admissions.json');}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const decision of await read(root+'/cutouts/approvals.json')){
  const item=downloads.get(decision.id),record=records.get(decision.id);assert(item&&record,'Approval has no matching staged source');
  assert.equal(record.cacheKey,decision.cacheKey);assert.equal(record.candidateSha256,decision.candidateSha256);
  if(decision.decision!=='approve'){rejected.push({id:decision.id,sourceUrl:item.artwork.sourceUrl,reason:decision.notes});continue;}
  assert(record.alphaLossless&&record.rgbUnchangedBeforeResize&&decision.notes,'Missing image-integrity proof');
  assert.equal(hash(await fs.readFile(record.candidatePath)),decision.candidateSha256);assert.equal(hash(await fs.readFile(item.inputPath)),record.sourceSha256);assert.equal(item.sourceSha256,record.sourceSha256);
  assert.equal(hash(Buffer.from(JSON.stringify(item.raw))),item.rawMetadataSha256);assert.equal(classifyTeaware(item.artwork,reviewed).decision,'admit');assert(physicalObjectKey(item.artwork));
  pool.push({...item,record,decision,root,admission:reviewed[item.artwork.id]});
 }
}
const rank=x=>x.artwork.id.startsWith('emuseum-')?0:x.artwork.id.startsWith('nmk-')?1:x.artwork.id.startsWith('dimu-')&&/Kina|Japan|Korea/i.test(x.artwork.period)?2:x.artwork.id.startsWith('nationalmuseum-')?3:x.artwork.id.startsWith('finna-')?4:5;
// Within a source, prioritize vessels; supplementary utensils fill later slots.
const accessory=x=>/Spoon|Strainer|Scoop|Infuser/.test(x.artwork.objectTypeEnglish)?1:0;
pool.sort((a,b)=>rank(a)-rank(b)||accessory(a)-accessory(b)||a.artwork.id.localeCompare(b.artwork.id));
const ids=new Set(baseline.map(x=>x.id)),urls=new Set(baseline.map(x=>normalizedSourceUrl(x.sourceUrl))),keys=new Set(baseline.map(physicalObjectKey).filter(Boolean)),hashes=new Set(Object.values(before.assets).map(x=>x.sourceSha256));
const blockedIds=new Set([...exclusions.entries,...aliases.entries].map(x=>x.id)),blockedUrls=new Set([...exclusions.entries,...aliases.entries].map(x=>normalizedSourceUrl(x.sourceUrl)));
const candidates=[],collisions=[];
for(const x of pool){const a=x.artwork,key=physicalObjectKey(a),url=normalizedSourceUrl(a.sourceUrl);
 if(ids.has(a.id)||urls.has(url)||keys.has(key)||hashes.has(x.sourceSha256)||blockedIds.has(a.id)||blockedUrls.has(url)){collisions.push({id:a.id,sourceUrl:url,key,reason:'cross-source-duplicate-or-previously-excluded'});continue;}
 ids.add(a.id);urls.add(url);keys.add(key);hashes.add(x.sourceSha256);candidates.push(x);
}
const selected=candidates.slice(0,2000),reserve=candidates.slice(2000);assert.equal(selected.length,2000,`Only ${candidates.length} approved distinct additions`);
for(const x of selected){
 const {data,info}=await sharp(x.record.candidatePath).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert(info.width===1200&&info.height===1200);let clear=0,opaque=0;
 for(let y=0;y<1200;y++)for(let xx=0;xx<1200;xx++){const alpha=data[(y*1200+xx)*4+3];if(!alpha)clear++;if(alpha>=244)opaque++;if(y===0||xx===0||y===1199||xx===1199)assert.equal(alpha,0,'Non-transparent perimeter');}
 assert(clear>0&&opaque>0);assert(!JSON.stringify(x.artwork).includes('[object Object]'),'Malformed museum metadata');
 if(x.admission)allAdmissions[x.artwork.id]=x.admission;
}
const byMuseum={};for(const x of selected)byMuseum[x.artwork.sourceMuseumEnglish]=(byMuseum[x.artwork.sourceMuseumEnglish]||0)+1;
const summary={date:'2026-10-04',baseline:4000,target:6000,added:2000,finalTotal:6000,byMuseum,rejected:rejected.length,approvedReserve:reserve.length,collisions};
await write('output/round31/final-integration-plan.json',summary);console.log(JSON.stringify(summary,null,2));if(!process.argv.includes('--publish'))process.exit(0);
const assets={...before.assets};
for(const x of selected){const a=x.artwork,r=x.record,url='/collection-cutouts/'+r.cacheKey+'.webp';await fs.copyFile(x.inputPath,'public'+a.imageUrl);await fs.copyFile(r.candidatePath,'public'+url);
 assets[a.id]={url,sourceSha256:r.sourceSha256,qaStatus:'reviewed',candidateSha256:r.candidateSha256,shadowBaselinePercent:r.shadowBaselinePercent,shadowContactCenterPercent:r.shadowContactCenterPercent,shadowContactWidthPercent:r.shadowContactWidthPercent,shadowCastCenterPercent:r.shadowCastCenterPercent,shadowCastWidthPercent:r.shadowCastWidthPercent,shadowEnabled:!/^Tea (?:Spoon|Scoop|Strainer|Infuser)$/i.test(a.objectTypeEnglish)&&r.qa.substantialComponents===1};
}
const catalogue=[...baseline,...selected.map(x=>x.artwork)],assetUrls=[...new Set(Object.values(assets).map(x=>x.url))];assert.equal(assetUrls.length,6000);
let bytes=0;for(const u of assetUrls)bytes+=(await fs.stat('public'+u)).size;assert(bytes<800*1024**2,'Image package budget exceeded');
await write('src/data/artworks.json',catalogue);await write('public/artworks.json',catalogue);await write('research/teaware-admissions.json',allAdmissions);await fs.writeFile('src/data/collection-cutouts.json',JSON.stringify({version:1,total:6000,uniqueAssets:6000,bytes,assets})+'\n');
const report={...summary,transparentAssets:6000,transparentBytes:bytes,selection:'Tea-use evidence from museum native names or explicit catalogue descriptions; full institution/accession identity; source-specific permissive image licenses, with missing production dates explicitly marked as not recorded. East Asian objects prioritized. No new flat art, textile, fragments, display supports, reflected backgrounds, grouped views or duplicates knowingly admitted.',imageProcess:'Local BiRefNet full; original RGB preserved before resize; 1200px lossless-alpha WebP; 10% margin; every accepted image visually checked against its original on black and white.',rejected,reserve:reserve.map(x=>({id:x.artwork.id,sourceUrl:x.artwork.sourceUrl,review:x.decision})),accepted:selected.map(x=>({id:x.artwork.id,museum:x.artwork.sourceMuseumEnglish,accessionNumber:x.artwork.accessionNumber,sourceUrl:x.artwork.sourceUrl,imageSource:x.imageSource,license:x.artwork.license,creditLine:x.artwork.creditLine,retrievedAt:x.retrievedAt,rawMetadataSha256:x.rawMetadataSha256,rawImageSha256:x.rawSha256,sourceSha256:x.sourceSha256,sourceDimensions:[x.width,x.height],candidateSha256:x.record.candidateSha256,cacheKey:x.record.cacheKey,modelSha256:x.record.settings.modelSha256,review:x.decision,teaAdmission:x.admission}))};
await write('research/teaware-expansion-6000-2026-10-04.json',report);
await write('research/teaware-source-evidence-6000-2026-10-04.json',selected.map(x=>({id:x.artwork.id,raw:x.raw,rawMetadataSha256:x.rawMetadataSha256})));
const md=`# 6,000 件茶器扩充审核\n\n2026-10-04；正式库由 4,000 增至 6,000 件，新增 2,000 件。\n\n全部 6,000 件使用逐图审核通过的透明图，文件总计 ${(bytes/1024**2).toFixed(1)} MiB。\n\n| 馆藏来源 | 本次新增 |\n|---|---:|\n${Object.entries(byMuseum).map(([m,c])=>'| '+m+' | '+c+' |').join('\n')}\n\n沿用茶器准入标准；馆方原名、完整馆藏编号、原图与透明图哈希、许可和署名见同名 JSON。每张入选图片已检查黑白底；不重绘器物颜色和纹样。发现断边、标签、展架、拼图、重复视角或不明确茶用途的记录均不入库。\n\nDigitaltMuseum 保留 API 原始许可代码，不擅自补写许可版本；CC BY-SA 的透明衍生图继续按相同许可共享。\n\n正式构建和线上验证结果另行记录。\n`;
await fs.writeFile('research/teaware-expansion-6000-2026-10-04.md',md);
const readme=await fs.readFile('README.md','utf8');await fs.writeFile('README.md',readme.replaceAll('4,000','6,000'));
console.log(`Installed 2000 additions; 6000 unique transparent assets; ${(bytes/1024**2).toFixed(1)} MiB.`);
