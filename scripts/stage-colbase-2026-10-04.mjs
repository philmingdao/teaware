// The full image path is verified in ColBase's visible PhotoSwipe viewer.
// TSV representative images are mapped to that published full-image route;
// failed downloads are rejected, never replaced with guessed alternatives.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFile as callback} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
import {classifyTeaware,normalizedSourceUrl} from './teaware-policy.mjs';
import {historicalCreatorEvidence} from './colbase-historical-creators.mjs';
import {physicalObjectKey} from './teaware-identity.mjs';
const execFile=promisify(callback),root=process.env.TEAWARE_STAGE_ROOT||'output/round29-colbase';
await fs.mkdir(root+'/cache',{recursive:true});await fs.mkdir(root+'/originals',{recursive:true});
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const active=await read('src/data/artworks.json');
const blocked=[...active,...(await read('research/teaware-exclusions.json')).entries,...(await read('research/teaware-duplicate-aliases.json')).entries,...(await read('research/teaware-expansion-2026-10-03.json')).rejected];
const urls=new Set(blocked.filter(x=>x.sourceUrl).map(x=>normalizedSourceUrl(x.sourceUrl)));
const keys=new Set(active.map(physicalObjectKey).filter(Boolean));
if(process.env.COLBASE_EXTRA==='1')for(const row of await read('output/round29-colbase/metadata.json')){keys.add(physicalObjectKey(row));urls.add(normalizedSourceUrl(row.sourceUrl));}
const hashes=new Set(Object.values((await read('src/data/collection-cutouts.json')).assets).map(a=>a.sourceSha256));
const museums={tnm:['Tokyo National Museum','东京国立博物馆'],kyohaku:['Kyoto National Museum','京都国立博物馆'],narahaku:['Nara National Museum','奈良国立博物馆'],kyuhaku:['Kyushu National Museum','九州国立博物馆']};
const types=[[/茶碗|茶盌|tea bowl|chawan/i,['茶碗','Tea Bowl']],[/茶杓|tea scoop|chashaku/i,['茶匙','Tea Scoop']],[/茶筅|tea whisk|chasen/i,['茶筅','Tea Whisk']],[/茶入|natsume|tea caddy/i,['茶罐','Tea Caddy']],[/茶壺|急須|tea.?pot/i,['茶壶','Teapot']],[/tea cup/i,['茶杯','Tea Cup']],[/mizusashi|水指/i,['茶道水指','Mizusashi']],[/tea.*kettle/i,['煮茶釜','Tea Kettle']],[/湯呑|yunomi/i,['茶杯','Tea Cup']]];
const selected=[],imageRejections=[],candidates=[];
for(const raw of await read((process.env.COLBASE_EXTRA==='1'||process.env.COLBASE_UNDATED==='1')?'output/round29/colbase-full-records.json':'output/round29/colbase-screened.json')) {
  const museum=museums[raw['機関識別子']],title=raw['Title of work']||raw['作品名'];
  const date=raw['時代世紀']||'';
  const historicalAttribution=historicalCreatorEvidence(raw);
  if(process.env.COLBASE_UNDATED==='1'&&(date||!historicalAttribution))continue;
  // Uncertain dates and recent works need individual rights research.
  const years=(date.match(/(?:1[0-9]{3}|20[0-9]{2})/g)||[]).map(Number);
  if(!museum||(!date&&!(process.env.COLBASE_UNDATED==='1'&&historicalAttribution))||years.some(year=>year>1920)||/昭和|平成|令和|現代|modern|contemporary|20th century|20世紀/i.test(date)) {imageRejections.push({sourceUrl:raw.URL,reason:'date-or-third-party-rights-needs-review'});continue;}
  if(!['ccby','cc0','pd'].includes(raw['コンテンツの権利区分'])) continue;
  const type=types.find(([re])=>re.test(title+' '+raw['作品名']))?.[1];
  if(!type||/fragment|sherd|欠片|残欠|破片|断片|茶碗形|茶壺形|香炉|香合|紅板|ceramic sherd/i.test(title+' '+raw['作品名'])) continue;
  const id=`colbase-${raw['機関識別子']}-${raw.JPS_ID}`;
  const material=raw.Material||raw['品質形状']||'';
  const artwork={id,titleChinese:type[0],titleEnglish:title,titleOriginal:raw['作品名'],dynasty:'未详',dynastyEnglish:'Unspecified',period:date||'馆方未详',date:date||'馆方未详',material:'未核实',materialEnglish:material,objectType:type[0],objectTypeEnglish:type[1],dimensions:raw['法量']||'',description:`${raw['作品名']}。馆方年代：${date||'未详'}。${raw['作者']?'馆方作者署名：'+raw['作者']+'。':''}现藏于${museum[1]}。`,sourceMuseum:museum[1],sourceMuseumEnglish:museum[0],accessionNumber:raw['機関管理番号'],sourceUrl:raw.URL,imageUrl:`/artworks/${id}.jpg`,imageAlt:title,license:'CC BY 4.0 (ColBase terms; source record rights)',creditLine:`Source: ColBase (${museum[0]}), ${raw.URL}. Background removed and cropped by Teaware.`,crawlBatchId:'reviewed-teaware-2026-10-04'};
  const key=physicalObjectKey(artwork);
  if(!key||keys.has(key)||urls.has(normalizedSourceUrl(raw.URL))||classifyTeaware(artwork).decision!=='admit')continue;
  const imageSource=raw['代表画像URL'].replace('/image/slideshow_s/','/image/');
  if(!imageSource.startsWith('https://colbase.nich.go.jp/media/'))continue;
  candidates.push({artwork,raw,historicalAttribution:date?undefined:historicalAttribution,imageSource,retrievedAt:new Date().toISOString(),rawMetadataSha256:hash(Buffer.from(JSON.stringify(raw))),imageLicenseUrl:'https://colbase.nich.go.jp/pages/term?locale=en'});
  keys.add(key);urls.add(normalizedSourceUrl(raw.URL));
}
await fs.writeFile(root+'/discovery.json',JSON.stringify({candidates,imageRejections},null,2));
let cursor=0;
async function save(){await fs.writeFile(root+'/downloaded.json',JSON.stringify({selected,imageRejections},null,2));}
await Promise.all(Array.from({length:2},async()=>{while(cursor<candidates.length){const item=candidates[cursor++];try{
  const cache=root+'/cache/'+hash(Buffer.from(item.imageSource))+'.bin';
  let bytes;try{bytes=await fs.readFile(cache);}catch{bytes=(await execFile('curl',['--noproxy','*','--location','--fail','--silent','--show-error','--max-time','45',item.imageSource],{encoding:'buffer',maxBuffer:32*1024*1024})).stdout;await fs.writeFile(cache,bytes);}
  const metadata=await sharp(bytes).metadata();if(Math.max(metadata.width||0,metadata.height||0)<1200)throw Error('native source below 1200 pixels');
  const normalized=await sharp(bytes).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:95,mozjpeg:true}).toBuffer();
  const sourceSha256=hash(normalized),rawSha256=hash(bytes);if(hashes.has(sourceSha256)||hashes.has(rawSha256))throw Error('duplicate source image');hashes.add(sourceSha256);hashes.add(rawSha256);
  const inputPath=root+'/originals/'+item.artwork.id+'.jpg';await fs.writeFile(inputPath,normalized);selected.push({...item,inputPath,sourceSha256,rawSha256,width:metadata.width,height:metadata.height});
}catch(e){imageRejections.push({id:item.artwork.id,sourceUrl:item.artwork.sourceUrl,reason:String(e).slice(-220)});}
if(cursor%20===0){await save();console.log('ColBase processed',cursor,'/',candidates.length,'eligible',selected.length);}
}}));
selected.sort((a,b)=>a.artwork.id.localeCompare(b.artwork.id));await save();
await fs.writeFile(root+'/metadata.json',JSON.stringify(selected.map(x=>x.artwork),null,2));
await fs.writeFile(root+'/inputs.json',JSON.stringify(selected.map(x=>({id:x.artwork.id,inputPath:x.inputPath,sourceSha256:x.sourceSha256,title:x.artwork.titleChinese,museum:x.artwork.sourceMuseum,kind:'object'})),null,2));
console.log('ColBase image-eligible',selected.length,'rejections',imageRejections.length);
