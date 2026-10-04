// Discover only museum-provided controlled tea categories. Preserve native
// metadata and selected-image CC0 statements; processing is not admission.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFile as callback} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
import {physicalObjectKey} from './teaware-identity.mjs';
import {normalizedSourceUrl} from './teaware-policy.mjs';
const execFile=promisify(callback), root=process.env.PARIS_IIIF_ONLY==='1'?'output/round29-paris-iiif':'output/round29-paris';
const host='https://www.parismuseescollections.paris.fr';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.mkdir(root+'/cache',{recursive:true});await fs.mkdir(root+'/originals',{recursive:true});
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const active=await read('src/data/artworks.json');
const excluded=[...(await read('research/teaware-exclusions.json')).entries,...(await read('research/teaware-duplicate-aliases.json')).entries];
const urls=new Set([...active,...excluded].filter(x=>x.sourceUrl).map(x=>normalizedSourceUrl(x.sourceUrl)));
const keys=new Set(active.map(physicalObjectKey).filter(Boolean));
const hashes=new Set(Object.values((await read('src/data/collection-cutouts.json')).assets).map(x=>x.sourceSha256));
const decode=s=>s.replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,hex,n)=>String.fromCodePoint(parseInt(hex||n,hex?16:10))).replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,key)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[key]);
const clean=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
function field(html,name) {
  const index=html.indexOf('field-name-'+name+' ');if(index<0)return '';
  const start=html.lastIndexOf('<div',index),tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start;
  let depth=0,end=start;for(let match;(match=tags.exec(html));){depth+=match[0].startsWith('</')?-1:1;if(depth===0){end=tags.lastIndex;break;}}
  const block=html.slice(start,end),items=block.indexOf('class="field-items"');return clean(items<0?block:block.slice(block.indexOf('>',items)+1));
}
async function get(url,binary=false) {
  const cache=root+'/cache/'+hash(Buffer.from(url))+(binary?'.bin':'.html');
  try{return await fs.readFile(cache,binary?undefined:'utf8');}catch{/* ordinary public download */}
  const {stdout}=await execFile('curl',['--noproxy','*','--location','--fail','--silent','--show-error','--max-time','45',url],{encoding:binary?'buffer':'utf8',maxBuffer:32*1024*1024});
  await fs.writeFile(cache,stdout);return stdout;
}
const searchPages=[host+'/fr/recherche/type/oeuvre/ET/denominations/th%C3%A9i%C3%A8re-167146',host+'/fr/recherche/type/oeuvre/ET/denominations/bol%20%C3%A0%20th%C3%A9-167317'];
const searches=[],objects=new Set(),searchSeen=new Set();
if(process.env.PARIS_IIIF_ONLY==='1'){searchPages.length=0;for(const item of (await read('output/round29-paris/downloaded.json')).imageRejections.filter(x=>x.reason.includes('1200')))objects.add(item.sourceUrl);}
while(searchPages.length){const url=searchPages.shift();if(searchSeen.has(url))continue;searchSeen.add(url);const html=await get(url);searches.push(url);console.log('Paris search',searches.length,url);
  for(const match of html.matchAll(/href="([^"]+)"/g)){
    const href=decode(match[1]);if(/^\/fr\/[^/]+\/oeuvres\//.test(href))objects.add(new URL(href,host).href);
    if(/page=\d+/.test(href)&&href.startsWith('/fr/recherche/')&&/denominations\/(?:th%C3%A9i%C3%A8re-167146|bol%20%C3%A0%20th%C3%A9-167317)/i.test(href))searchPages.push(new URL(href,host).href);
  }
}
await fs.writeFile(root+'/object-urls.json',JSON.stringify([...objects],null,2));
const selected=[],rejected=[];let cursor=0;const queue=[...objects];
async function save(){await fs.writeFile(root+'/downloaded.json',JSON.stringify({retrievedAt:new Date().toISOString(),searches,selected,imageRejections:rejected},null,2));}
await Promise.all(Array.from({length:2},async()=>{while(cursor<queue.length){const sourceUrl=queue[cursor++];try{
  if(urls.has(normalizedSourceUrl(sourceUrl)))continue;
  const html=await get(sourceUrl), title=clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
  if(/^couvercle\b|fragment|tesson|dessin|étude/i.test(title))throw Error('Incomplete object or depiction');
  const accession=field(html,'field-oeuvre-num-inventaire'),material=field(html,'field-materiaux-technique'),date=field(html,'field-oeuvre-siecle'),type=field(html,'field-oeuvre-types-objet'),origin=field(html,'field-oeuvre-lieux-productions');
  if(!accession||!/théière|bol à thé/i.test(title)||/papier|peinture|dessin|estampe|gravure|photographie/i.test(material+' '+type))throw Error('No explicit physical tea-object identity or flat-media source');
  const photos=[...html.matchAll(/<span class="droits">([\s\S]*?)<\/span>[\s\S]*?data-fullscreen-img="([^"]+)"/g)].map(x=>({credit:clean(x[1]),url:decode(x[2])}));
  let image=photos.find(x=>/^CC0\b/i.test(x.credit));if(!image)throw Error('No selected-image CC0 statement');
  let iiifManifest;
  if(process.env.PARIS_IIIF_ONLY==='1'){
    const manifestUrl=html.match(/https:\/\/apicollections\.parismusees\.paris\.fr\/iiif\/\d+\/manifest/)?.[0];
    if(!manifestUrl)throw Error('No official IIIF manifest link');
    iiifManifest=JSON.parse(await get(manifestUrl));
    const filename=new URL(image.url).pathname.split('/').pop().replace(/\.jpg$/i,'').toLowerCase();
    const canvas=iiifManifest.sequences?.[0]?.canvases?.find(c=>c.label.toLowerCase()===filename);
    const cc0=canvas?.metadata?.find(m=>m.label==='Droits'&&/^CC0\b/.test(m.value));
    const full=canvas?.images?.[0]?.resource?.['@id'];
    if(!cc0||!full)throw Error('No matching CC0 full-resolution primary image');
    image={credit:cc0.value,url:full};
  }
  const museumSlug=sourceUrl.split('/')[4],museumNames={'musee-cernuschi':['Musée Cernuschi','赛努奇博物馆'],'petit-palais':['Petit Palais','巴黎小皇宫博物馆'],'musee-carnavalet':['Musée Carnavalet','卡纳瓦雷博物馆'],'musee-de-la-vie-romantique':['Musée de la Vie romantique','巴黎浪漫生活博物馆']};
  const museum=museumNames[museumSlug];if(!museum)throw Error('Unresolved collecting institution');
  const nodeId=html.match(/data-node-id="(\d+)"/)?.[1];if(!nodeId)throw Error('No museum object node identity');
  const id='paris-'+museumSlug+'-'+nodeId,objectType=/bol à thé/i.test(title)?['茶碗','Tea Bowl']:['茶壶','Teapot'];
  const raw={title,accession,material,date,type,origin,selectedImage:image,iiifManifest,htmlSha256:hash(Buffer.from(html))};
  const artwork={id,titleChinese:objectType[0],titleEnglish:title,titleOriginal:title,dynasty:'未详',dynastyEnglish:'Unspecified',period:date,date,material:/porcelaine/i.test(material)?'瓷':/bronze/i.test(material)?'青铜':/argent/i.test(material)?'银':'未核实',materialEnglish:material,objectType:objectType[0],objectTypeEnglish:objectType[1],dimensions:'',description:`${title}。馆方年代：${date||'未详'}。馆方材质：${material||'未详'}。现藏于${museum[1]}。`,sourceMuseum:museum[1],sourceMuseumEnglish:museum[0],accessionNumber:accession,sourceUrl,imageUrl:`/artworks/${id}.jpg`,imageAlt:title,license:'CC0 (Paris Musées; selected image statement)',creditLine:image.credit+'. Background removed and cropped by Teaware.',crawlBatchId:'reviewed-teaware-2026-10-04'};
  const key=physicalObjectKey(artwork);if(!key||keys.has(key))throw Error('Duplicate or missing physical accession');
  const bytes=await get(image.url,true),metadata=await sharp(bytes).metadata();if(Math.max(metadata.width||0,metadata.height||0)<1200)throw Error('Native image below 1200px');
  const normalized=await sharp(bytes).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:95,mozjpeg:true}).toBuffer();
  const sourceSha256=hash(normalized),rawSha256=hash(bytes);if(hashes.has(sourceSha256)||hashes.has(rawSha256))throw Error('Duplicate image');
  hashes.add(sourceSha256);hashes.add(rawSha256);keys.add(key);urls.add(normalizedSourceUrl(sourceUrl));const inputPath=root+'/originals/'+id+'.jpg';await fs.writeFile(inputPath,normalized);
  selected.push({artwork,raw,imageSource:image.url,imageLicenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',retrievedAt:new Date().toISOString(),rawMetadataSha256:hash(Buffer.from(JSON.stringify(raw))),inputPath,sourceSha256,rawSha256,width:metadata.width,height:metadata.height});
}catch(e){rejected.push({sourceUrl,reason:String(e).slice(-250)});}
if(cursor%20===0){await save();console.log('Paris processed',cursor,'/',queue.length,'eligible',selected.length);}
}}));
selected.sort((a,b)=>a.artwork.id.localeCompare(b.artwork.id));await save();
await fs.writeFile(root+'/metadata.json',JSON.stringify(selected.map(x=>x.artwork),null,2));await fs.writeFile(root+'/inputs.json',JSON.stringify(selected.map(x=>({id:x.artwork.id,inputPath:x.inputPath,sourceSha256:x.sourceSha256,kind:'object',title:x.artwork.titleChinese,museum:x.artwork.sourceMuseum})),null,2));
console.log('Paris image eligible',selected.length,'rejected',rejected.length,'discovered',queue.length);
