import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
import {npmDynasty} from './teaware-periods.mjs';
import {classifyTeaware,normalizedSourceUrl} from './teaware-policy.mjs';import {physicalObjectKey} from './teaware-identity.mjs';
const root='output/round30-npm',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.mkdir(root+'/cache',{recursive:true});await fs.mkdir(root+'/originals',{recursive:true});
const active=await read('src/data/artworks.json'),blocked=[...active,...(await read('research/teaware-exclusions.json')).entries,...(await read('research/teaware-duplicate-aliases.json')).entries];
const ids=new Set(blocked.map(x=>x.id)),urls=new Set(blocked.map(x=>normalizedSourceUrl(x.sourceUrl))),keys=new Set(active.map(physicalObjectKey).filter(Boolean)),hashes=new Set(Object.values((await read('src/data/collection-cutouts.json')).assets).map(x=>x.sourceSha256));
const reviews=await read('output/round30/npm-admissions.json'),selected=[],imageRejections=[],admissions={};
const explicitReject=new Set(['npm-2109','npm-76912','npm-76880','npm-77139']);
const types=[[/teapot|茶壺|紫砂壺|朱泥壺|多穆壺|pot|ewer/i,['茶壶','Teapot']],[/tea kettle|茶釜|風爐|燒水壺|kettle/i,['煮茶器','Tea Kettle']],[/tea caddy|茶罐|茶葉罐|茶棗|蓋罐|lidded jar|covered jar/i,['茶罐','Tea Caddy']],[/茶杓|茶則|scoop/i,['茶匙','Tea Scoop']],[/茶盤|tea tray|tray/i,['茶盘','Tea Tray']],[/茶托|盞托|杯托|碗托|saucer|bowl stand/i,['茶托','Tea Saucer']],[/碗|盌|盞|bowl/i,['茶碗','Tea Bowl']],[/杯|盃|鍾|鐘|cup/i,['茶杯','Tea Cup']],[/茶筅|whisk/i,['茶筅','Tea Whisk']]];
for(const sourceFolder of ['npm-candidates-0','npm-candidates-1','npm-candidates-2','npm-extra'])for(const raw of await read(`output/round30/${sourceFolder}/records.json`)){
 if(raw.status!=='downloaded')continue;
 const folder=`output/round30/${sourceFolder}/${raw.id}`,id='npm-'+raw.id,f=raw.fields,title=f['品名'][0],english=f['品名'][1]||title,date=(f['時代']||[]).join('；'),description=(f['說明']||[]).join(' ');
 const reject=reason=>imageRejections.push({id,sourceUrl:raw.sourceUrl,reason});
 if(explicitReject.has(id)||/煙|香合|硯盒|茶巾|藤墊|\b(?:lid|cover) for\b/i.test(title)){reject('not-an-independent-tea-vessel');continue;}
 const type=types.find(([re])=>re.test(title+' '+english))?.[1];if(!type){reject('object-type-unverified');continue;}
 let material=({'陶瓷器':'陶瓷','琺瑯器':'珐琅','玉石器':'玉石','漆器':'漆器','金屬器':'金属','竹木牙角器':'竹木牙角'})[(f['分類']||[])[0]]||(f['分類']||[])[0]||'未详',materialEnglish=(f['分類']||[]).join(' ');
 // Keep the museum's category rather than inferring a substrate from gilding,
 // simulated wood grain, or porcelain made to imitate carved lacquer.
 const [dynasty,dynastyEnglish]=npmDynasty((f['時代']||[])[0]||'');
 const artwork={id,titleChinese:title,titleEnglish:english,titleOriginal:title,dynasty,dynastyEnglish,date:date||'馆方未详',period:(f['時代']||[])[0]||'馆方未详',material,materialEnglish,objectType:type[0],objectTypeEnglish:type[1],dimensions:(f['尺寸']||[]).join(' '),description:description||`${title}。馆方年代：${date||'未详'}。现藏于台北国立故宫博物院。`,sourceMuseum:'台北国立故宫博物院',sourceMuseumEnglish:'National Palace Museum, Taipei',accessionNumber:(f['文物統一編號']||[])[0],sourceUrl:raw.sourceUrl,imageUrl:`/artworks/${id}.jpg`,imageAlt:title,license:'CC BY 4.0 (National Palace Museum Open Data)',creditLine:`${title}. The National Palace Museum, Taipei, CC BY 4.0 @ www.npm.gov.tw. Background removed and cropped by Teaware.`,crawlBatchId:'reviewed-teaware-4000-2026-10-04'};
 if(classifyTeaware(artwork,reviews).decision!=='admit'){reject('no-verified-tea-use');continue;}
 const key=physicalObjectKey(artwork);if(!key||ids.has(id)||keys.has(key)||urls.has(normalizedSourceUrl(raw.sourceUrl))){reject('duplicate-or-missing-physical-identity');continue;}
 try{
 const b=await fs.readFile(folder+'/source.jpg');if(hash(b)!==raw.imageSha256)throw Error('Source hash mismatch');const info=await sharp(b).metadata();if(Math.max(info.width,info.height)<1200)throw Error('Native resolution below 1200');
 const page=await fs.readFile(folder+'/page.html');if(hash(page)!==raw.pageSha256)throw Error('Page evidence changed');
 const normalized=await sharp(b).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:95,mozjpeg:true}).toBuffer(),sourceSha256=hash(normalized);if(hashes.has(sourceSha256)){reject('duplicate-source-photograph');continue;}
 const inputPath=root+'/originals/'+id+'.jpg';await fs.writeFile(inputPath,normalized);await fs.copyFile(folder+'/source.jpg',root+'/cache/'+hash(Buffer.from(raw.imageSource))+'.bin');await fs.copyFile(folder+'/page.html',root+'/cache/'+hash(Buffer.from(raw.sourceUrl))+'.html');
 const item={artwork,raw,imageSource:raw.imageSource,imageLicenseUrl:'https://creativecommons.org/licenses/by/4.0/',retrievedAt:raw.retrievedAt,rawMetadataSha256:hash(Buffer.from(JSON.stringify(raw))),inputPath,sourceSha256,rawSha256:hash(b),width:info.width,height:info.height};selected.push(item);if(reviews[id])admissions[id]=reviews[id];ids.add(id);keys.add(key);urls.add(normalizedSourceUrl(raw.sourceUrl));hashes.add(sourceSha256);
 }catch(e){reject(String(e));}
}
await fs.writeFile(root+'/downloaded.json',JSON.stringify({selected,imageRejections},null,2));await fs.writeFile(root+'/metadata.json',JSON.stringify(selected.map(x=>x.artwork),null,2));await fs.writeFile(root+'/admissions.json',JSON.stringify(admissions,null,2));await fs.writeFile(root+'/inputs.json',JSON.stringify(selected.map(x=>({id:x.artwork.id,inputPath:x.inputPath,sourceSha256:x.sourceSha256,title:x.artwork.titleChinese,museum:x.artwork.sourceMuseum,kind:'object'})),null,2));console.log({eligible:selected.length,rejected:imageRejections.length});
