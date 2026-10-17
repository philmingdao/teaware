import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {classifyTeaware, isSpoonLikeTeaware, normalizedSourceUrl} from './teaware-policy.mjs';
import {physicalObjectKey} from './teaware-identity.mjs';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ROOT=process.env.TEAWARE_STAGE_ROOT||'output/dimu-expansion-2026-10-17';
const DISCOVERY=process.env.DIMU_DISCOVERY||'output/dimu-discovery/index.json';
await fs.mkdir(ROOT+'/originals',{recursive:true});
await fs.mkdir(ROOT+'/cache',{recursive:true});
const active=await read('src/data/artworks.json');
const cutouts=await read('src/data/collection-cutouts.json');
const exclusions=(await read('research/teaware-exclusions.json')).entries;
const aliases=(await read('research/teaware-duplicate-aliases.json')).entries;
let prior=[]; try{prior=(await read('research/teaware-expansion-2026-10-03.json')).rejected;}catch(e){if(e.code!=='ENOENT')throw e;}
const blocked=[...active,...exclusions,...aliases,...prior];
const ids=new Set(blocked.map(x=>x.id));
const urls=new Set(blocked.filter(x=>x.sourceUrl).map(x=>normalizedSourceUrl(x.sourceUrl)));
const keys=new Set(active.map(physicalObjectKey).filter(Boolean));
const existingSourceHashes=new Set(Object.values(cutouts.assets).map(x=>x.sourceSha256));
const existingDimu=new Set(active.filter(x=>x.id.startsWith('dimu-')).map(x=>x.id));
const docs=await read(DISCOVERY);
const allowed=new Set(['by','by-sa','CC0 1.0','pdm','zero']);
const types=[
  [/Skål til tekopp|\b(?:tefat|teefat|tekoppsfat)\b/i,['茶托','Tea Saucer']],
  [/\b(?:tekanna|tekanne|teekanne)\b/i,['茶壶','Teapot']],
  [/\b(?:tekopp|teetasse|tekrus|temugg)\b/i,['茶杯','Tea Cup']],
  [/\b(?:tedosa|teburk|teedose|theburk|tedåse|teboks|te-boks)\b/i,['茶罐','Tea Caddy']],
  [/\b(?:chawan|teskål|teeskål|teeschale)\b/iu,['茶碗','Tea Bowl']],
  [/\b(?:teurne|samovar)\b/i,['茶炉','Tea Urn']],
  [/\b(?:tekjele|tekittel)\b/i,['煮茶壶','Tea Kettle']],
  [/\b(?:teebrett|tebrett)\b/i,['茶盘','Tea Tray']],
];
const eastAsia=/Kina|Japan|Korea/i;
const vesselRe=/tekanna|tekanne|teekanne|tekopp|tedosa|teburk|teedose|theburk|tedåse|teboks|te-boks|chawan|teskål|teeskål|teeschale|teetasse|tekrus|temugg/i;
const candidates=[];
for(const r of docs){
  const id='dimu-'+r['artifact.uniqueId'];
  if(existingDimu.has(id))continue;
  const lic=r['artifact.ingress.license'];
  if(!Array.isArray(lic))continue;
  if(!/CC by|CC by-sa|CC CC0 1\.0/.test(JSON.stringify(lic)))continue;
  const dim=String(r['artifact.defaultPictureDimension']||'0x0').split('x').map(Number);
  if(dim.length!==2||Math.max(dim[0],dim[1])<1200)continue;
  candidates.push(r);
}
candidates.sort((a,b)=>{
  const ae=eastAsia.test(JSON.stringify(a)),be=eastAsia.test(JSON.stringify(b));
  if(ae!==be)return ae?-1:1;
  const av=vesselRe.test(JSON.stringify(a['artifact.ingress.names']||a['artifact.ingress.title']||''));
  const bv=vesselRe.test(JSON.stringify(b['artifact.ingress.names']||b['artifact.ingress.title']||''));
  if(av!==bv)return av?-1:1;
  return (a['artifact.uniqueId']||'').localeCompare(b['artifact.uniqueId']||'');
});
console.log('discovered:',docs.length,'candidates:',candidates.length);
const selected=[],imageRejections=[],stats={byReason:{}};
const reject=(id,reason)=>{imageRejections.push({id,reason});stats.byReason[reason]=(stats.byReason[reason]||0)+1;};
async function fetchBuf(url,retries=3){
  for(let attempt=0;attempt<=retries;attempt++){
    try{
      const res=await fetch(url,{headers:{'User-Agent':'TeawareGallery/1.0 (dimu-expansion)'},signal:AbortSignal.timeout(60000)});
      if(res.status===429||res.status===503){if(attempt===retries)throw new Error('HTTP '+res.status);await sleep(6000);continue;}
      if(!res.ok)throw new Error('HTTP '+res.status);
      return Buffer.from(await res.arrayBuffer());
    }catch(e){if(attempt===retries)throw e;await sleep(2000*(attempt+1));}
  }
}
async function processOne(r){
  const uid=r['artifact.uniqueId'],id='dimu-'+uid;
  if(ids.has(id)){reject(id,'duplicate-id');return;}
  let x;
  try{x=JSON.parse((await fetchBuf('https://api.dimu.org/artifact/uuid/'+r['artifact.uuid'])).toString('utf8'));}
  catch(e){reject(id,'record-fetch-failed:'+e.message);return;}
  const recordLicenses=x.licenses||[];
  if(!recordLicenses.length||recordLicenses.some(l=>l.system!=='CC'||!allowed.has(l.code))){reject(id,'record-rights-excluded');return;}
  if(x.artifactType!=='Thing'){reject(id,'not-thing');return;}
  if(!x.identifier?.id){reject(id,'no-identifier');return;}
  const museum=x.partOfCollection?.owner?.name;
  if(!museum){reject(id,'no-museum');return;}
  const pics=x.media?.pictures||[];
  const im=pics.find(p=>p.identifier===r['artifact.defaultMediaIdentifier'])||pics[0];
  if(!im){reject(id,'no-image');return;}
  if(Math.max(im.width||0,im.height||0)<1200){reject(id,'image-below-1200');return;}
  const override=im.licenses||[];
  const rights=override.length?override:recordLicenses;
  if(!rights.length||[...rights,...recordLicenses].some(l=>l.system!=='CC'||!allowed.has(l.code))){reject(id,'image-rights-excluded');return;}
  const native=[x.title,...(x.names||[]).map(n=>n.name)].filter(Boolean).join('; ');
  if(!native){reject(id,'no-native-name');return;}
  if(/fragment|leketøy|leksak|dockservis|del av dock|dukke|dukkehus|leksaks|lock till|ritning|fotografi|avbildning/i.test(native+' '+(x.description||''))){reject(id,'non-independent-or-toy');return;}
  const type=types.find(([re])=>re.test(native))?.[1];
  if(!type){reject(id,'no-tea-vessel-type');return;}
  const probe={id,titleEnglish:type[1],titleOriginal:native,materialEnglish:(x.material?.materials||[]).map(m=>m.material).join('; '),objectTypeEnglish:type[1],sourceUrl:'https://digitaltmuseum.org/'+uid};
  if(isSpoonLikeTeaware(probe)){reject(id,'spoon-like');return;}
  if(classifyTeaware({...probe,titleEnglish:native}).decision!=='admit'){reject(id,'native-tea-use-unverified');return;}
  const sourceUrl='https://digitaltmuseum.org/'+uid;
  if(urls.has(normalizedSourceUrl(sourceUrl))){reject(id,'duplicate-url');return;}
  const imageSource='https://ems.dimu.org/image/'+im.identifier+'?dimension=1200x1200';
  let raw;
  try{raw=await fetchBuf(imageSource);}catch(e){reject(id,'image-download-failed:'+e.message);return;}
  if(raw.length<5000){reject(id,'tiny-image');return;}
  const rawSha256=digest(raw);
  if(existingSourceHashes.has(rawSha256)){reject(id,'duplicate-raw-hash');return;}
  const cachePath=ROOT+'/cache/'+digest(Buffer.from(imageSource))+'.bin';
  try{await fs.access(cachePath);reject(id,'cache-collision');return;}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.writeFile(cachePath,raw);
  let meta;
  try{meta=await sharp(raw).metadata();}catch(e){reject(id,'sharp-failed');return;}
  if(Math.max(meta.width,meta.height)<1200){reject(id,'decoded-below-1200');return;}
  const normalized=await sharp(raw).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:95,mozjpeg:true}).toBuffer();
  const sourceSha256=digest(normalized);
  if(existingSourceHashes.has(sourceSha256)){reject(id,'duplicate-normalized-hash');return;}
  const inputPath=ROOT+'/originals/'+id+'.jpg';
  try{await fs.access(inputPath);reject(id,'output-collision');return;}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.writeFile(inputPath,normalized);
  const prod=x.eventWrap?.production||{},span=prod.timespan||{};
  if(prod.description?.includes('2. halvdel')&&span.toYear%100===49){reject(id,'contradictory-date');return;}
  const materialOriginal=(x.material?.materials||[]).map(m=>m.material).join('; ')||x.material?.comment||'Unspecified';
  let material='未详';
  for(const[re,zh]of[[/nysølv|nysilver/i,'镍银'],[/flintgods|fajans/i,'陶'],[/porselen|porslin/i,'瓷'],[/stengods/i,'炻器'],[/keramik/i,'陶瓷'],[/sølv|silver/i,'银'],[/messing|mässing/i,'黄铜'],[/kobber|koppar/i,'铜'],[/tinn|tenn/i,'锡'],[/glass|glas/i,'玻璃'],[/jern|järn/i,'铁'],[/tre|trä/i,'木']])if(re.test(materialOriginal)){material=zh;break;}
  const places=(prod.relatedPlaces||[]).flatMap(p=>p.fields||[]).map(f=>f.value).filter(Boolean).join(', ');
  const makers=(prod.relatedPersons||[]).filter(p=>/10P/.test(p.role?.code||'')).map(p=>p.name+(p.role?.status==='usikker'?' (uncertain)':'')).join('; ');
  const date=(span.fromYear||span.toYear)?String(span.fromYear||span.toYear)+(span.fromYear&&span.toYear&&span.fromYear!==span.toYear?'–'+span.toYear:'')+(span.comment?' ('+span.comment+')':''):(span.comment||'馆方未注明制作年代 / Date not recorded');
  const license=[...new Set(rights.map(l=>l.code==='by'?'CC BY':l.code==='by-sa'?'CC BY-SA':l.code==='pdm'?'Public Domain':l.code==='zero'?'CC0':l.code))].join('; ');
  const museumZh={'Norsk Folkemuseum':'挪威民俗博物馆','Kulturen':'隆德文化历史博物馆','Skansen':'斯堪森博物馆','Jönköpings läns museum':'延雪平省博物馆','Vänersborgs museum':'维纳什堡博物馆'}[museum]||museum;
  const artwork={id,titleChinese:(material==='未详'?'':material)+type[0],titleEnglish:type[1],titleOriginal:native,dynasty:'未详',dynastyEnglish:'Unspecified',date,period:places||'馆方未详',material,materialEnglish:materialOriginal,objectType:type[0],objectTypeEnglish:type[1],dimensions:(x.measures||[]).map(m=>[m.type||m.name,m.measure??m.value,m.unit,m.comment].filter(Boolean).join(' ')).join('; '),description:`${type[0]}。馆方原名：${native}。馆方编目制作年代：${date}。${places?'制作地点：'+places+'。':''}${makers?'制作者：'+makers+'。':''}${x.description?'馆方说明：'+x.description:''}`,sourceMuseum:museumZh,sourceMuseumEnglish:museum,accessionNumber:x.identifier.id,sourceUrl,imageUrl:`/artworks/${id}.jpg`,imageAlt:native,license:license+' (DigitaltMuseum source record; version not specified in API)',creditLine:`${im.photographer?'Photo: '+im.photographer+' / ':''}${museum}. ${x.identifier.id}. ${license}. License details: ${sourceUrl}. Background removed and cropped by Teaware.${license.includes('BY-SA')?' This transparent derivative is shared under the same CC BY-SA license as the source image.':''}`,crawlBatchId:'dimu-expansion-2026-10-17'};
  const key=physicalObjectKey(artwork);
  if(!key){reject(id,'no-physical-key');return;}
  if(keys.has(key)){reject(id,'duplicate-physical-key');return;}
  const rawMeta={raw:x,index:r,imageSource,sha256:rawSha256,effectiveImageLicenses:rights,licenseOrigin:override.length?'image-override':'record-license'};
  const rawMetadataSha256=digest(Buffer.from(JSON.stringify(rawMeta)));
  const item={artwork,raw:rawMeta,imageSource,retrievedAt:new Date().toISOString(),rawMetadataSha256,inputPath,sourceSha256,rawSha256,width:meta.width,height:meta.height};
  selected.push(item);
  ids.add(id);urls.add(normalizedSourceUrl(sourceUrl));keys.add(key);existingSourceHashes.add(sourceSha256);
  console.log('  +',id,native.slice(0,60));
}
const LIMIT=Number(process.env.DIMU_STAGE_LIMIT||99999);
for(let i=0;i<candidates.length&&selected.length<LIMIT;i++){
  try{await processOne(candidates[i]);}catch(e){reject('dimu-'+candidates[i]['artifact.uniqueId'],'process-error:'+e.message);}
  if(i%20===19)await sleep(500);
}
await write(ROOT+'/downloaded.json',{selected,imageRejections});
await write(ROOT+'/metadata.json',selected.map(x=>x.artwork));
await write(ROOT+'/inputs.json',selected.map(x=>({id:x.artwork.id,inputPath:x.inputPath,sourceSha256:x.sourceSha256,title:x.artwork.titleChinese,museum:x.artwork.sourceMuseum,kind:'object'})));
await write(ROOT+'/admissions.json',{});
console.log(JSON.stringify({selected:selected.length,rejected:imageRejections.length,stats},null,2));
