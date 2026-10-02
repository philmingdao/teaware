// Stage net-new, explicitly named tea ware from official open collections.
// Nothing enters the published catalogue until source and silhouette review.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { classifyTeaware, normalizedSourceUrl } from './teaware-policy.mjs';

const execFile = promisify(execFileCallback);
const root = 'output/round28';
await fs.mkdir(`${root}/cache`, { recursive: true });
await fs.mkdir(`${root}/originals`, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const active = JSON.parse(await fs.readFile('src/data/artworks.json', 'utf8'));
const exclusions = JSON.parse(await fs.readFile('research/teaware-exclusions.json', 'utf8')).entries;
const knownIds = new Set([...active, ...exclusions].map(a => a.id));
for (const row of JSON.parse(await fs.readFile('research/teaware-duplicate-aliases.json','utf8')).entries) knownIds.add(row.id);
const knownUrls = new Set([...active, ...exclusions].map(a => normalizedSourceUrl(a.sourceUrl)));
const knownAccessions = new Set(active.filter(a => a.accessionNumber).map(a => `${a.sourceMuseumEnglish}|${a.accessionNumber.toLowerCase().replace(/\s/g, '')}`));
const knownHashes = new Set(JSON.parse(await fs.readFile('src/data/collection-cutouts.json', 'utf8')).assets ? Object.values(JSON.parse(await fs.readFile('src/data/collection-cutouts.json', 'utf8')).assets).map(a => a.sourceSha256) : []);
const candidates = new Map();
const rejected = [];
const searches = [];
async function get(url, json = true) {
  const filename = `${root}/cache/${hash(Buffer.from(url))}.${json ? 'json' : 'bin'}`;
  try { const bytes = await fs.readFile(filename); return json ? JSON.parse(bytes) : bytes; }
  catch { /* missing cache */ }
  const { stdout } = await execFile('curl', ['--location', '--fail', '--silent', '--show-error', '--retry', '2', '--max-time', '60', '-H', json ? 'Accept: application/json' : 'Accept: image/*', url], { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 });
  const parsed = json ? JSON.parse(stdout) : stdout;
  await fs.writeFile(filename, stdout);
  return parsed;
}
const clean = value => String(value ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
function objectLabel(title) {
  if (/tea.*whisk holder/i.test(title)) return ['茶筅架', 'Tea Whisk Holder'];
  if (/canteen.*tea.*utensil/i.test(title)) return ['茶具盒', 'Tea Utensil Case'];
  if (/tea.*(?:chest|box)/i.test(title)) return ['茶箱', 'Tea Chest'];
  if (/tea.*(?:scoop|spoon)|^teaspoon/i.test(title)) return ['茶匙', 'Tea Spoon'];
  if (/tea.*(?:strainer|infuser)/i.test(title)) return ['茶滤', 'Tea Strainer'];
  if (/tea.*urn/i.test(title)) return ['茶水器', 'Tea Urn'];
  if (/tea.*tray|theeblad/i.test(title)) return ['茶盘', 'Tea Tray'];
  if (/tea.?caddy.*stand/i.test(title)) return ['茶罐托', 'Tea Caddy Stand'];
  if (/tea.?bowl.*saucer/i.test(title)) return ['茶碗与茶碟', 'Tea Bowl and Saucer'];
  if (/^(?:cup|kop)\b.*(?:tea|theeservies)/i.test(title)) return /saucer/i.test(title) ? ['茶杯与杯托', 'Tea Cup and Saucer'] : ['茶杯', 'Tea Cup'];
  if (/^(?:large )?saucer\b.*tea|^schotel\b.*theeservies/i.test(title)) return ['茶碟', 'Saucer from Tea Service'];
  if (/(?:cream jug|creamer|milk jug|melkkan).*tea/i.test(title)) return ['茶具乳壶', 'Creamer from Tea Service'];
  if (/(?:sugar basin|suikerpot).*tea|^suikerpot.*theeservies/i.test(title)) return ['茶具糖碗', 'Sugar Bowl from Tea Service'];
  if (/^(?:waste|slop) bowl.*tea/i.test(title)) return ['茶具渣碗', 'Waste Bowl from Tea Service'];
  if (/kettle.*tea/i.test(title)) return ['茶具热水壶', 'Kettle from Tea Service'];
  if (/^(?:serving plate|round dish).*tea/i.test(title)) return ['茶具盘', 'Dish from Tea Service'];
  if (/^(?:oval tray|oblong spoon tray).*tea|^blad.*theeservies/i.test(title)) return ['茶具托盘', 'Tray from Tea Service'];
  if (/komfoor.*theeservies/i.test(title)) return ['茶具保温炉', 'Warmer from Tea Service'];
  if (/tea.*utensil.*basket|teiran/i.test(title)) return ['茶具篮', 'Tea Utensil Basket'];
  if (/hot water pitcher.*tea/i.test(title)) return ['茶具热水壶', 'Hot Water Pitcher from Tea Service'];
  if (/^saucer.*tea/i.test(title)) return ['茶碟', 'Saucer from Tea Service'];
  if (/^bowl.*tea.*(?:service|set)/i.test(title)) return ['茶具碗', 'Bowl from Tea Service'];
  if (/tea and coffee (?:service|set)/i.test(title)) return ['茶与咖啡用具组合', 'Tea and Coffee Service'];
  if (/teapot and milk jug/i.test(title)) return ['茶壶与乳壶', 'Tea Service'];
  if (/tea.?bowl and stand/i.test(title)) return ['茶碗与盏托', 'Tea Bowl and Stand'];
  if (/^stand.*tea.?pot|^tea.?pot stand/i.test(title)) return ['茶壶托', 'Teapot Stand'];
  if (/tea.?pot.*stand/i.test(title)) return ['茶壶与壶托', 'Teapot and Stand'];
  if (/tea.?bowl.*(?:stand)|tea.?cup.*(?:stand)/i.test(title)) return ['茶盏托', 'Tea Bowl Stand'];
  if (/^(?:lid|cover)\b.*tea.?pot|^tea.?pot (?:lid|cover)\b/i.test(title)) return ['茶壶盖', 'Teapot Lid'];
  if (/tea.?cup.*saucer/i.test(title)) return ['茶杯与杯托', 'Tea Cup and Saucer'];
  if (/tea.*(?:scoop)|chashaku/i.test(title)) return ['茶匙', 'Tea Scoop'];
  if (/tea.*(?:whisk)|chasen/i.test(title)) return ['茶筅', 'Tea Whisk'];
  if (/mizusashi|tea.*water jar/i.test(title)) return ['茶道水指', 'Mizusashi'];
  if (/tea.?cadd|theebus|tea.*(?:container|storage|chest)|chaire|natsume/i.test(title)) return ['茶罐', 'Tea Caddy'];
  if (/tea.?pot|theepot|kyusu|théière/i.test(title)) return ['茶壶', 'Teapot'];
  if (/tea.?bowl|chawan/i.test(title)) return ['茶碗', 'Tea Bowl'];
  if (/tea.?cup|theekop|yunomi/i.test(title)) return ['茶杯', 'Tea Cup'];
  if (/tea.*kettle/i.test(title)) return ['煮茶壶', 'Tea Kettle'];
  if (/tea.*(?:stand|tray)|theeblad/i.test(title)) return ['茶托', 'Tea Stand'];
  if (/creamer/i.test(title)) return ['茶具乳壶', 'Creamer from Tea Service'];
  if (/sugar.*bowl/i.test(title)) return ['茶具糖碗', 'Sugar Bowl from Tea Service'];
  if (/tongs/i.test(title)) return ['茶具糖夹', 'Sugar Tongs from Tea Service'];
  return ['茶具组合', 'Tea Service'];
}
function materialLabel(material) {
  // Glaze pigments are not solid gold/copper/tin components.
  for (const [re,label] of [[/porcelain|porselein/i,'瓷'],[/stoneware|steengoed/i,'炻器'],[/earthenware|aardewerk/i,'陶'],[/ceramic|pottery/i,'陶瓷']]) if (re.test(material)) return label;
  if (/nickel silver/i.test(material)) return /silver[- ]?plat/i.test(material) ? '镀银白铜' : '白铜';
  if (/gold[- ]?plat/i.test(material) && /silver/i.test(material)) return '镀金银';
  if (/silver/i.test(material) && /gilt|gild/i.test(material)) return '鎏金银';
  if (/silver[- ]?plat/i.test(material) && /copper alloy/i.test(material)) return '镀银铜合金';
  if (/painted enamel/i.test(material)) return '珐琅';
  const labels = [];
  for (const [re, label] of [[/silver|zilver/i, /silver[- ]?plat|silver plate|verzilverd/i.test(material) ? '镀银' : '银'], [/pewter|tin\b/i, '锡'], [/copper|koper/i, '铜'], [/brass/i, '黄铜'], [/glass|glas/i, '玻璃'], [/wood|hout/i, '木'], [/bamboo/i, '竹'], [/lacquer|lakwerk/i, '漆'], [/gold|goud/i, '金']]) if (re.test(material)) labels.push(label);
  return labels.join('、') || '未核实';
}
function periodLabel(date, origin) {
  const source = clean([date,origin].join(' | '));
  const named = source.match(/\b(?:Northern Song|Southern Song|Song|Ming|Qing|Tang|Yuan|Joseon|Edo|Meiji|Momoyama|Muromachi)\b/i)?.[0];
  const periods = {'northern song':['北宋','Northern Song'],'southern song':['南宋','Southern Song'],song:['宋','Song'],ming:['明','Ming'],qing:['清','Qing'],tang:['唐','Tang'],yuan:['元','Yuan'],joseon:['朝鲜','Joseon'],edo:['江户','Edo'],meiji:['明治','Meiji'],momoyama:['桃山','Momoyama'],muromachi:['室町','Muromachi']};
  if (named) return periods[named.toLowerCase()];
  if (/China|Chinese|Hong Kong|中国|Chinees/i.test(origin)) return ['中国', 'China'];
  if (/Japan|Japanese|日本|Japans/i.test(origin)) return ['日本', 'Japan'];
  if (/Korea|Korean/i.test(origin)) return ['韩国', 'Korea'];
  if (/United States|USA|U\.S\.A\./i.test(origin)) return ['美国', 'United States'];
  if (/England|France|Germany|Netherlands|Denmark|Italy|Scotland|Europe|Holland|Dutch|Britain|Delft|Meissen|Sèvres|Londen|Amsterdam/i.test(origin)) return ['欧洲', 'Europe'];
  return ['未详', 'Unspecified'];
}
function record({id,title,material,date,origin,museum,museumZh,accession,sourceUrl,imageSource,license,dimensions,credit,raw}) {
  // Select complete tea objects, not isolated parts or kiln waste.
  if (/bakafval|\bfragment\b|^(?:deksel|oor|tuit)\b|^(?:lid|cover|handle|spout)\b.*tea.?pot|^tea.?pot (?:lid|cover)\b|^(?:coffee|chocolate) ?pot\b/i.test(title)) {
    rejected.push({id,reason:'incomplete-object-or-separate-non-tea-pot',sourceUrl}); return;
  }
  const [objectType, objectTypeEnglish] = objectLabel(title);
  const [dynasty, dynastyEnglish] = periodLabel(date, origin);
  const materialZh = materialLabel(material);
  const row = {id,titleChinese:(materialZh === '未核实' ? '' : materialZh)+objectType,titleEnglish:clean(title),dynasty,dynastyEnglish,period:clean(origin),date:clean(date)||'馆方未详',material:materialZh,materialEnglish:clean(material),objectType,objectTypeEnglish,dimensions:clean(dimensions),description:`${clean(title)}。馆方年代：${clean(date)||'未详'}。${origin ? `产地／文化：${clean(origin)}。` : ''}材质：${clean(material)||'未详'}。现藏于${museumZh}。`,sourceMuseum:museumZh,sourceMuseumEnglish:museum,accessionNumber:clean(accession),sourceUrl,imageUrl:`/artworks/${id}.jpg`,imageAlt:clean(title),license,creditLine:clean(credit),crawlBatchId:'reviewed-teaware-2026-10-03'};
  const decision = classifyTeaware(row);
  const accessionKey = `${museum}|${row.accessionNumber.toLowerCase().replace(/\s/g, '')}`;
  if (knownIds.has(id) || knownUrls.has(normalizedSourceUrl(sourceUrl)) || (row.accessionNumber && knownAccessions.has(accessionKey))) return;
  if (decision.decision !== 'admit') { rejected.push({id,reason:decision.reason,sourceUrl}); return; }
  candidates.set(id, {artwork:row,imageSource,evidence:decision,raw});
}
async function mia() {
  for (const query of ['tea','teapot','chawan','mizusashi','chaire','yunomi','teacup','teaspoon','tea strainer','tea urn','chashaku','chasen','natsume','kyusu']) {
  const data = await get(`https://search.artsmia.org/${encodeURIComponent(query)}?size=1000`);
  searches.push({source:'mia',query,total:data.hits.total});
  for (const hit of data.hits.hits) {
    const x = hit._source;
    if (/print|painting|drawing|photograph|textile|book/i.test(x.classification||'')) continue;
    if (x.rights_type !== 'Public Domain' || x.public_access !== 1 || x.image !== 'valid' || x.Rights_Image_Display !== 'Full' || !x.Cache_Location || !x.Primary_RenditionNumber) continue;
    record({id:`mia-${x.id}`,title:x.title,material:x.medium,date:x.dated,origin:x.country,museum:'Minneapolis Institute of Art',museumZh:'明尼阿波利斯艺术博物馆',accession:x.accession_number,sourceUrl:`https://collections.artsmia.org/art/${x.id}`,imageSource:`https://img.artsmia.org/web_objects_cache/${x.Cache_Location.replaceAll('\\','/')}/${x.Primary_RenditionNumber.replace(/\.jpg$/i,'_full.jpg')}`,license:'Public Domain (Mia; CC PDM)',dimensions:x.dimension,credit:x.creditline,raw:x});
  }
  }
  console.log('Mia staged:', [...candidates.keys()].filter(id=>id.startsWith('mia-')).length);
}
async function smithsonian() {
  for (const filename of (await fs.readdir(root)).filter(x=>/^smithsonian-.*\.json$/.test(x))) {
  const data=JSON.parse(await fs.readFile(`${root}/${filename}`,'utf8'));
  for(const x of data.response.rows) {
    if(!['CHNDM','NMAH','FSG','NMAA'].includes(x.unitCode)) continue;
    const d=x.content.descriptiveNonRepeating, f=x.content.freetext;
    const media=(d.online_media?.media||[]).find(m=>m.type==='Images' && m.usage?.access==='CC0' && m.resources?.some(r=>r.label==='High-resolution JPEG'));
    if(!media || d.metadata_usage?.access && d.metadata_usage.access!=='CC0') continue;
    const field=(name,label)=>clean((f[name]||[]).filter(x=>!label||x.label.toLowerCase()===label.toLowerCase()).map(x=>x.content).join('; '));
    const overall=(f.physicalDescription||[]).filter(x=>/\(overall material\)/i.test(x.content));
    const material=field('physicalDescription','Medium')||clean(overall.map(x=>x.content.replace(/\s*\(overall material\)/i,'')).join('; '));
    const accession=x.unitCode==='NMAH' ? field('identifier','ID Number')||field('identifier','catalog number') : field('identifier','Accession Number');
    const origin=field('place','place made')||field('place','made in')||clean((f.place||[]).filter(x=>!/owned|used/i.test(x.label)).map(x=>x.content).join('; '));
    const museum=d.data_source;
    const museumZh=x.unitCode==='CHNDM'?'库珀休伊特史密森尼设计博物馆':x.unitCode==='NMAH'?'史密森尼美国历史博物馆':'史密森尼亚洲艺术博物馆';
    record({id:'si-'+d.record_ID.replaceAll('_','-'),title:x.title,material,date:field('date'),origin,museum,museumZh,accession,sourceUrl:d.record_link||d.guid,imageSource:media.resources.find(r=>r.label==='High-resolution JPEG').url,license:'CC0 (Smithsonian Open Access; item image usage CC0)',dimensions:field('physicalDescription','Dimensions')||field('physicalDescription','Measurements'),credit:field('creditLine'),raw:x});
  }
  }
  console.log('Smithsonian CC0 candidates:',candidates.size);
}
async function walters() {
  const rows=JSON.parse(await fs.readFile(`${root}/walters-joined.json`,'utf8'));
  const mirrors=[];
  if (process.argv.includes('--walters-mirror-only')) {
    for(const filename of (await fs.readdir(root)).filter(x=>/^walters-commons(?:-\d+)?\.json$/.test(x))) {
      const data=JSON.parse(await fs.readFile(`${root}/${filename}`,'utf8'));
      mirrors.push(...Object.values(data.query?.pages||{}));
    }
  }
  // Commons mirrors can use accession numbers without punctuation.
  const mirrored=new Set([...active,...exclusions].flatMap(x=>[...JSON.stringify(x).matchAll(/Walters[ _-]*(\d{4,})/ig)].map(m=>m[1])));
  for(const row of rows) {
    const x=row.object;
    if(mirrored.has(x.AccessionNumber.replace(/\D/g,''))) continue;
    const eligible=mirrors.filter(m=>m.title.match(/Walters[ _-]*(\d{4,})/i)?.[1]===x.AccessionNumber.replace(/\D/g,'')&&!/detail|interior|bottom|base|reverse|back view/i.test(m.title)&&/public domain|CC0/i.test(m.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value||''));
    const mirror=eligible.sort((a,b)=>Number(/profile|front/i.test(b.title))-Number(/profile|front/i.test(a.title))||a.title.length-b.title.length)[0];
    if(process.argv.includes('--walters-mirror-only')&&!mirror)continue;
    const imageSource=mirror?mirror.imageinfo[0].url:row.image.ImageURL;
    record({id:`walters-${x.ObjectID}`,title:x.Title,material:x.Medium,date:x.DateText,origin:[x.Culture,x.Dynasty,x.Period].filter(Boolean).join('; '),museum:'The Walters Art Museum',museumZh:'沃尔特斯艺术博物馆',accession:x.AccessionNumber,sourceUrl:x.ResourceURL,imageSource,license:'CC0 (Walters Art Museum Open Data)',dimensions:x.Dimensions,credit:x.CreditLine,raw:{...row,mirror:mirror?{pageId:mirror.pageid,title:mirror.title,metadata:mirror.imageinfo[0].extmetadata}:undefined}});
  }
  searches.push({source:'walters',dataset:'https://github.com/WaltersArtMuseum/api-thewalters-org',total:rows.length});
  console.log('Walters candidates:',candidates.size);
}
async function artic() {
  const fields='id,title,image_id,is_public_domain,date_display,medium_display,place_of_origin,main_reference_number,dimensions,artist_display,artwork_type_title,credit_line';
  const query={bool:{must:[{term:{is_public_domain:true}},{match:{title:{query:'tea teapot chawan mizusashi',operator:'or'}}}]}};
  for (let page=1;page<=5;page++) {
    const params=encodeURIComponent(JSON.stringify({query,fields:fields.split(','),limit:100,page}));
    const data=await get(`https://api.artic.edu/api/v1/artworks/search?params=${params}`);
    searches.push({source:'artic',page,total:data.pagination.total});
    for (const x of data.data) if (x.is_public_domain && x.image_id) record({id:`artic-${x.id}`,title:x.title,material:x.medium_display,date:x.date_display,origin:[x.place_of_origin,x.artist_display].filter(Boolean).join('; '),museum:'Art Institute of Chicago',museumZh:'芝加哥艺术博物馆',accession:x.main_reference_number,sourceUrl:`https://www.artic.edu/artworks/${x.id}`,imageSource:`${data.config.iiif_url}/${x.image_id}/full/843,/0/default.jpg`,license:'CC0 (Art Institute of Chicago Open Access)',dimensions:x.dimensions,credit:x.credit_line,raw:x});
    if (page>=data.pagination.total_pages) break;
  }
  console.log('Art Institute staged:', [...candidates.keys()].filter(id=>id.startsWith('artic-')).length);
}
async function met() {
  if (process.argv.includes('--reuse-met')) {
    const previous=JSON.parse(await fs.readFile(`${root}/discovery.json`,'utf8'));
    for(const x of previous.candidates.filter(x=>x.artwork.id.startsWith('met-') && !knownIds.has(x.artwork.id))) candidates.set(x.artwork.id,x);
    console.log('Met metadata reused from official response cache.');
    return;
  }
  const ids=new Set();
  for (const q of process.argv.includes('--met-extra-only') ? ['tea','chawan','mizusashi','yunomi','chaire','natsume','teacup','teaspoon','tea urn','tea infuser','tea strainer','tea caddy spoon'] : ['teapot','tea bowl','tea cup','tea caddy','tea service','tea kettle']) {
    for (let offset=0;offset<1000;offset+=500) {
      const url=`https://collectionapi.metmuseum.org/public/collection/v1.1/search?hasImages=true&title=true&q=${encodeURIComponent(q)}&limit=500&offset=${offset}`;
      const data=await get(url);searches.push({source:'met',q,offset,total:data.total});
      for (const id of data.objectIDs||[]) if (!knownIds.has(`met-${id}`)) ids.add(id);
      if (offset+500>=data.total) break;
    }
  }
  let cursor=0;const queue=[...ids];
  await Promise.all(Array.from({length:3},async()=>{
    while(cursor<queue.length) {
      const id=queue[cursor++];
      try {
        const x=await get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        if (!x.isPublicDomain||!x.primaryImage) continue;
        record({id:`met-${id}`,title:x.title,material:x.medium,date:x.objectDate,origin:[x.culture,x.country,x.period,x.dynasty].filter(Boolean).join('; '),museum:'The Metropolitan Museum of Art',museumZh:'大都会艺术博物馆',accession:x.accessionNumber,sourceUrl:x.objectURL||`https://www.metmuseum.org/art/collection/search/${id}`,imageSource:x.primaryImage,license:'CC0 (The Metropolitan Museum of Art Open Access)',dimensions:x.dimensions,credit:x.creditLine,raw:x});
      } catch(e) { rejected.push({id:`met-${id}`,reason:String(e).slice(0,200)}); }
      if (cursor%50===0) console.log('Met resolved',cursor,'/',queue.length);
    }
  }));
  console.log('Met staged:', [...candidates.keys()].filter(id=>id.startsWith('met-')).length);
}
function notation(entity) {
  const terms = entity?.notation || [];
  const names = (entity?.identified_by || []).filter(x => x.type === 'Name');
  const term = terms.find(x => x['@language'] === 'en') || terms[0];
  const name = names.find(x => x.language?.some(l => l.id.includes('300388277'))) || names[0];
  return clean(entity?._label || term?.['@value'] || term?.content || name?.content);
}
async function rijks() {
  const ids=new Set();
  for (const term of process.argv.includes('--rijks-extra-only') ? ['theekom','chawan','mizusashi','tea','theeketel'] : ['theepot','theekop','theebus','theeservies']) {
    let url=`https://data.rijksmuseum.nl/search/collection?title=${term}&imageAvailable=true`;
    for (let page=0;url&&page<12;page++) {
      const data=await get(url);searches.push({source:'rijks',term,page,total:data.partOf.totalItems});
      for (const x of data.orderedItems) if (!knownIds.has(`rks-${x.id.split('/').pop()}`)) ids.add(x.id);
      url=data.next?.id;
    }
  }
  const resolveLimit=Number(process.argv.find(x=>x.startsWith('--rijks-resolve='))?.split('=')[1]||260);
  let cursor=0;const queue=[...ids].slice(0,resolveLimit);
  await Promise.all(Array.from({length:3},async()=>{
    while(cursor<queue.length) {
      const url=queue[cursor++],id=`rks-${url.split('/').pop()}`;
      try {
        const x=await get(url);
        const names=(x.identified_by||[]).filter(x=>x.type==='Name');
        const title=names.find(x=>x.language?.some(l=>l.id.includes('300388277')))?.content||names.find(x=>x.language?.some(l=>l.id.includes('300388256')))?.content||names[0]?.content||x._label;
        const material=(x.made_of||[]).map(notation).filter(Boolean).join(', ');
        const date=notation(x.produced_by?.timespan);
        const origin=(x.produced_by?.part||[]).flatMap(x=>(x.took_place_at||[]).map(notation)).filter(Boolean).join('; ');
        const accession=(x.identified_by||[]).find(x=>x.type==='Identifier' && x.classified_as?.some(t=>t.id.endsWith('/22015218')||t.id.endsWith('/300312355')))?.content;
        const sourceUrl=(x.subject_of||[]).flatMap(s=>s.digitally_carried_by||[]).flatMap(d=>d.access_point||[])[0]?.id||url;
        const probe={titleEnglish:title,materialEnglish:material,id,sourceUrl};
        if (classifyTeaware(probe).decision!=='admit') continue;
        if (!x.shows?.[0]?.id) continue;
        const visual=await get(x.shows[0].id);
        const rights=(visual.subject_to||[]).flatMap(s=>s.classified_as||[]).map(x=>x.id).filter(Boolean);
        if (!rights.some(r=>r.includes('publicdomain')||r.includes('zero/1.0'))) continue;
        const digital=await get(visual.digitally_shown_by[0].id);
        let imageSource=digital.access_point?.[0]?.id;
        if (!imageSource) continue;
        imageSource=imageSource.replace('/full/max/','/full/!1600,1600/');
        record({id,title,material,date,origin,museum:'Rijksmuseum',museumZh:'荷兰国立博物馆',accession,sourceUrl,imageSource,license:'Public Domain (Rijksmuseum Open Access)',dimensions:(x.dimension||[]).map(notation).filter(Boolean).join('; '),raw:{object:x,rights}});
      } catch(e) { rejected.push({id,reason:String(e).slice(0,200)}); }
      if (cursor%50===0) console.log('Rijks resolved',cursor,'/',queue.length);
    }
  }));
  console.log('Rijks staged:', [...candidates.keys()].filter(id=>id.startsWith('rks-')).length);
}
if (process.argv.includes('--relabel-pool')) {
  const pool=JSON.parse(await fs.readFile(`${root}/pool.json`,'utf8'));
  for (const item of pool) {
    const row=item.artwork;
    [row.objectType,row.objectTypeEnglish]=objectLabel(row.titleEnglish);
    row.material=materialLabel(row.materialEnglish);
    [row.dynasty,row.dynastyEnglish]=periodLabel(row.date,row.period);
    row.titleChinese=(row.material==='未核实'?'':row.material)+row.objectType;
    if (!/\d/.test(row.dimensions)) row.dimensions='';
  }
  await fs.writeFile(`${root}/pool.json`,JSON.stringify(pool,null,2));
  process.exit(0);
}
const discoveryPath=`${root}/${process.argv.includes('--smithsonian-only')?'discovery-si':process.argv.includes('--mia-only')?'discovery-mia':process.argv.includes('--walters-only')?'discovery-walters':process.argv.includes('--rijks-extra-only')?'discovery-rijks-extra':process.argv.includes('--met-extra-only')?'discovery-met-extra':'discovery'}.json`;
if (!process.argv.includes('--download-only')) {
  const status=await Promise.allSettled(process.argv.includes('--smithsonian-only')?[smithsonian()]:process.argv.includes('--mia-only')?[mia()]:process.argv.includes('--walters-only')?[walters()]:process.argv.includes('--rijks-extra-only')?[rijks()]:process.argv.includes('--met-extra-only')?[met()]:[mia(),artic(),met(),rijks()]);
  for (const [i,result] of status.entries()) if(result.status==='rejected') rejected.push({source:['mia','artic','met','rijks'][i],reason:String(result.reason)});
  await fs.writeFile(discoveryPath,JSON.stringify({retrievedAt:new Date().toISOString(),searches,candidates:[...candidates.values()],rejected},null,2));
} else {
  const saved=JSON.parse(await fs.readFile(discoveryPath,'utf8'));
  for(const x of saved.candidates) candidates.set(x.artwork.id,x);
}
if (process.argv.includes('--discover-only')) { console.log('Discovery complete:',candidates.size); process.exit(0); }
const selected=[],imageRejections=[];
for (const item of candidates.values()) {
  const [objectType, objectTypeEnglish] = objectLabel(item.artwork.titleEnglish);
  item.artwork.objectType = objectType;
  item.artwork.objectTypeEnglish = objectTypeEnglish;
  item.artwork.material = materialLabel(item.artwork.materialEnglish);
  item.artwork.titleChinese = (item.artwork.material === '未核实' ? '' : item.artwork.material) + objectType;
  if (!/\d/.test(item.artwork.dimensions)) item.artwork.dimensions = '';
}
// Prefer Asian objects and multiple collections; each entry remains a unique museum object.
const queue=[...candidates.values()].sort((a,b)=>Number(/China|Japan|Korea|Hong Kong|Chinees|Japans/i.test(b.artwork.period))-Number(/China|Japan|Korea|Hong Kong|Chinees|Japans/i.test(a.artwork.period)) || ({'mia':0,'artic':1,'met':2,'rks':3}[a.artwork.id.split('-')[0]]-{'mia':0,'artic':1,'met':2,'rks':3}[b.artwork.id.split('-')[0]]) || a.artwork.id.localeCompare(b.artwork.id));
const target=Number(process.argv.find(x=>x.startsWith('--candidates='))?.split('=')[1]||720);
let checkpoint = Promise.resolve();
function saveDownloads() {
  const text=JSON.stringify({selected,imageRejections},null,2);
  checkpoint=checkpoint.then(()=>fs.writeFile(`${root}/downloaded.tmp`,text)).then(()=>fs.rename(`${root}/downloaded.tmp`,`${root}/downloaded.json`));
  return checkpoint;
}
async function download(item) {
  try {
    const bytes=await get(item.imageSource,false);
    const rawSha256=hash(bytes);
    if(knownHashes.has(rawSha256)) throw new Error('duplicate image');
    const metadata=await sharp(bytes).metadata();
    if(Math.max(metadata.width||0,metadata.height||0)<800) throw new Error('source below 800 pixels');
    const normalized=await sharp(bytes).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:95,mozjpeg:true}).toBuffer();
    const sourceSha256=hash(normalized);
    if(knownHashes.has(sourceSha256)) throw new Error('duplicate normalized image');
    knownHashes.add(rawSha256);knownHashes.add(sourceSha256);
    const inputPath=`${root}/originals/${item.artwork.id}.jpg`;
    await fs.writeFile(inputPath,normalized);
    selected.push({...item,inputPath,rawSha256,sourceSha256,width:metadata.width,height:metadata.height});
    if(selected.length%20===0) console.log('Downloaded eligible originals:',selected.length);
  } catch(e) {imageRejections.push({id:item.artwork.id,reason:String(e).slice(-240),code:e.code,stderr:e.stderr?.toString().slice(-200)});}
  if(item.artwork.id.startsWith('artic-')) await new Promise(resolve=>setTimeout(resolve,1000));
  if(selected.length%20===0) await saveDownloads();
}
await Promise.all(['mia','artic','met','rks','si','walters'].map(async prefix=>{
  if (prefix==='artic' && process.argv.includes('--skip-artic')) return;
  const bucket=queue.filter(x=>x.artwork.id.startsWith(prefix+'-'));
  let cursor=0;
  // AIC explicitly requests one image at a time; the other museums use two.
  await Promise.all(Array.from({length:prefix==='artic'?1:2},async()=>{
    while(cursor<bucket.length && selected.length<target) await download(bucket[cursor++]);
  }));
}));
selected.sort((a,b)=>a.artwork.id.localeCompare(b.artwork.id));
await saveDownloads();
await fs.writeFile(`${root}/metadata.json`,JSON.stringify(selected.map(x=>x.artwork),null,2));
await fs.writeFile(`${root}/inputs.json`,JSON.stringify(selected.map(x=>({id:x.artwork.id,inputPath:x.inputPath,sourceSha256:x.sourceSha256,title:x.artwork.titleChinese,museum:x.artwork.sourceMuseum,kind:'object'})),null,2));
console.log('Downloaded candidate objects:',selected.length,'rejected images:',imageRejections.length);
