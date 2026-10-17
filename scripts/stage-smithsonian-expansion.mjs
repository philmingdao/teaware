// Stage CC0 tea-vessel objects from Smithsonian Open Access (NMAA / Freer-Sackler).
// Staged-pool contract verified by scripts/verify-staged-teaware.mjs (si- branch).
// Visual approval and publication are separate downstream steps.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {classifyTeaware, isSpoonLikeTeaware, normalizedSourceUrl} from './teaware-policy.mjs';
import {physicalObjectKey} from './teaware-identity.mjs';

const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const write = async (p, x) => fs.writeFile(p, JSON.stringify(x, null, 2) + '\n');
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const API_KEY = process.env.SMITHSONIAN_API_KEY;
if (!API_KEY) { console.error('SMITHSONIAN_API_KEY missing'); process.exit(1); }
const ROOT = process.env.TEAWARE_STAGE_ROOT || 'output/smithsonian-expansion-2026-10-17';
await fs.mkdir(ROOT + '/originals', {recursive: true});
await fs.mkdir(ROOT + '/cache', {recursive: true});

const active = await read('src/data/artworks.json');
const cutouts = await read('src/data/collection-cutouts.json');
const exclusions = (await read('research/teaware-exclusions.json')).entries;
const aliases = (await read('research/teaware-duplicate-aliases.json')).entries;
let prior = [];
try { prior = (await read('research/teaware-expansion-2026-10-03.json')).rejected; } catch (e) { if (e.code !== 'ENOENT') throw e; }
const blocked = [...active, ...exclusions, ...aliases, ...prior];
const ids = new Set(blocked.map(x => x.id));
const urls = new Set(blocked.filter(x => x.sourceUrl).map(x => normalizedSourceUrl(x.sourceUrl)));
const keys = new Set(active.map(physicalObjectKey).filter(Boolean));
const existingSourceHashes = new Set(Object.values(cutouts.assets).map(x => x.sourceSha256));

const QUERIES = [
  'tea bowl', 'teapot', 'tea caddy', 'tea cup', 'tea jar', 'chawan', 'chaire',
  'mizusashi', 'natsume', 'kyusu', 'tea ceremony water jar', 'tea-leaf storage jar',
  'gaiwan', 'tetsubin', 'tea kettle', 'Yixing teapot', 'Yixing tea',
  'Raku tea bowl', 'Hagi tea bowl', 'Karatsu tea bowl', 'Mino tea bowl',
  'Shino tea bowl', 'Oribe tea bowl', 'Bizen tea bowl', 'Satsuma tea bowl',
  'Arita tea bowl', 'Kutani tea bowl', 'Longquan tea', 'celadon tea bowl',
  'celadon teapot', 'Jian tea bowl', 'Jian ware tea', 'tenmoku tea bowl',
  'qingbai tea bowl', 'qingbai cup', 'blue and white teapot',
  'blue and white tea caddy', 'famille rose tea', 'famille verte tea',
  'dehua tea', 'blanc de chine tea', 'covered tea bowl', 'tea bowl with cover',
  'tea bowl stand', 'bowl stand tea', 'Korean tea bowl', 'Joseon tea bowl',
  'buncheong tea bowl', 'Goryeo celadon tea', 'Goryeo tea bowl',
  'Vietnamese tea bowl', 'Annamese tea bowl', 'tea pourer', 'ewer tea caddy',
  'tea dust glaze', 'stoneware tea bowl', 'porcelain tea bowl',
  'porcelain teapot', 'lacquer tea bowl', 'lacquer tea caddy', 'bamboo tea',
  'tea tray', 'tea canister', 'tea container',
];

const seenRecordIds = new Set();
const selected = [];
const imageRejections = [];
const stats = {queries: 0, rows: 0, byReason: {}};
const reject = (id, reason) => { imageRejections.push({id, reason}); stats.byReason[reason] = (stats.byReason[reason] || 0) + 1; };

function parseDynasty(s) {
  s = s.toLowerCase();
  if (/edo/.test(s)) return ['江戸', 'Edo Period (Japan)'];
  if (/momoyama/.test(s)) return ['桃山', 'Momoyama Period (Japan)'];
  if (/muromachi/.test(s)) return ['室町', 'Muromachi Period (Japan)'];
  if (/meiji/.test(s)) return ['明治', 'Meiji Period (Japan)'];
  if (/joseon|choson|yi dynasty/.test(s)) return ['朝鮮', 'Joseon Dynasty (Korea)'];
  if (/goryeo|koryo/.test(s)) return ['高麗', 'Goryeo Dynasty (Korea)'];
  if (/vietnam|annamese/.test(s)) return ['越南', 'Vietnam'];
  if (/northern song/.test(s)) return ['北宋', 'Northern Song Dynasty'];
  if (/southern song/.test(s)) return ['南宋', 'Southern Song Dynasty'];
  if (/song/.test(s)) return ['宋', 'Song Dynasty'];
  if (/liao/.test(s)) return ['遼', 'Liao Dynasty'];
  if (/yuan/.test(s)) return ['元', 'Yuan Dynasty'];
  if (/yongle/.test(s)) return ['明永乐', 'Ming Dynasty (Yongle)'];
  if (/xuande/.test(s)) return ['明宣德', 'Ming Dynasty (Xuande)'];
  if (/chenghua/.test(s)) return ['明成化', 'Ming Dynasty (Chenghua)'];
  if (/jiajing/.test(s)) return ['明嘉靖', 'Ming Dynasty (Jiajing)'];
  if (/wanli/.test(s)) return ['明万历', 'Ming Dynasty (Wanli)'];
  if (/ming/.test(s)) return ['明', 'Ming Dynasty'];
  if (/kangxi/.test(s)) return ['清康熙', 'Qing Dynasty (Kangxi)'];
  if (/yongzheng/.test(s)) return ['清雍正', 'Qing Dynasty (Yongzheng)'];
  if (/qianlong/.test(s)) return ['清乾隆', 'Qing Dynasty (Qianlong)'];
  if (/jiaqing/.test(s)) return ['清嘉庆', 'Qing Dynasty (Jiaqing)'];
  if (/daoguang/.test(s)) return ['清道光', 'Qing Dynasty (Daoguang)'];
  if (/guangxu/.test(s)) return ['清光绪', 'Qing Dynasty (Guangxu)'];
  if (/qing/.test(s)) return ['清', 'Qing Dynasty'];
  if (/tang/.test(s)) return ['唐', 'Tang Dynasty'];
  if (/china|chinese/.test(s)) return ['中国', 'China'];
  if (/japan|kyoto|tokyo/.test(s)) return ['日本', 'Japan'];
  if (/korea/.test(s)) return ['韩国', 'Korea'];
  return ['东亚', 'East Asia'];
}

function parseMaterial(s) {
  s = s.toLowerCase();
  if (/famille verte/.test(s)) return ['五彩瓷', 'Famille Verte Porcelain'];
  if (/famille rose/.test(s)) return ['粉彩瓷', 'Famille Rose Porcelain'];
  if (/doucai/.test(s)) return ['斗彩瓷', 'Doucai Porcelain'];
  if (/wucai/.test(s)) return ['五彩瓷', 'Wucai Porcelain'];
  if (/blue and white|blue-and-white/.test(s)) return ['青花瓷', 'Blue and White Porcelain'];
  if (/celadon/.test(s)) return ['青瓷', 'Celadon'];
  if (/blanc de chine|dehua/.test(s)) return ['德化白瓷', 'Blanc de Chine (Dehua)'];
  if (/yixing|zisha/.test(s)) return ['宜兴紫砂', 'Yixing Zisha'];
  if (/longquan/.test(s)) return ['龙泉青瓷', 'Longquan Celadon'];
  if (/jian|tenmoku|hare.?s fur|oil spot/.test(s)) return ['建盏', 'Jian Ware'];
  if (/qingbai/.test(s)) return ['青白瓷', 'Qingbai Ware'];
  if (/lacquer/.test(s)) return ['漆器', 'Lacquerware'];
  if (/sancai/.test(s)) return ['三彩', 'Sancai'];
  if (/copper red|sang de boeuf|ox blood|peachbloom/.test(s)) return ['釉里红', 'Copper Red Glaze'];
  if (/cloisonne|cloisonné|enamel/.test(s)) return ['珐琅', 'Cloisonné/Enamel'];
  if (/iron/.test(s)) return ['铁器', 'Iron'];
  if (/raku/.test(s)) return ['乐烧', 'Raku Ware'];
  if (/satsuma/.test(s)) return ['萨摩烧', 'Satsuma Ware'];
  if (/kutani/.test(s)) return ['九谷烧', 'Kutani Ware'];
  if (/imari|arita/.test(s)) return ['伊万里烧', 'Imari Ware'];
  if (/hagi/.test(s)) return ['萩烧', 'Hagi Ware'];
  if (/karatsu/.test(s)) return ['唐津烧', 'Karatsu Ware'];
  if (/oribe/.test(s)) return ['织部烧', 'Oribe Ware'];
  if (/bizen/.test(s)) return ['备前烧', 'Bizen Ware'];
  if (/shigaraki/.test(s)) return ['信乐烧', 'Shigaraki Ware'];
  if (/porcelain/.test(s)) return ['瓷器', 'Porcelain'];
  if (/stoneware/.test(s)) return ['炻器', 'Stoneware'];
  if (/earthenware/.test(s)) return ['陶器', 'Earthenware'];
  if (/ceramic/.test(s)) return ['陶瓷', 'Ceramics'];
  if (/bamboo/.test(s)) return ['竹', 'Bamboo'];
  if (/wood/.test(s)) return ['木', 'Wood'];
  if (/silver/.test(s)) return ['银', 'Silver'];
  if (/bronze/.test(s)) return ['青铜', 'Bronze'];
  return ['未详', 'Unspecified'];
}

function parseObjectType(t) {
  t = t.toLowerCase();
  if (/teapot|tea pot/.test(t)) return ['茶壶', 'Teapot'];
  if (/tetsubin|iron kettle/.test(t)) return ['铁壶', 'Tea Kettle'];
  if (/tea ceremony water jar|mizusashi/.test(t)) return ['水指', 'Mizusashi'];
  if (/tea-leaf storage jar|tea leaf storage/.test(t)) return ['茶罐', 'Tea Caddy'];
  if (/tea caddy|tea canister|tea container|chaire|natsume/.test(t)) return ['茶罐', 'Tea Caddy'];
  if (/gaiwan|covered tea/.test(t)) return ['盖碗', 'Gaiwan'];
  if (/chawan|tea bowl/.test(t)) return ['茶碗', 'Tea Bowl'];
  if (/tea cup/.test(t)) return ['茶杯', 'Tea Cup'];
  if (/tea tray/.test(t)) return ['茶盘', 'Tea Tray'];
  if (/bowl stand|stand for tea/.test(t)) return ['盏托', 'Cup/Bowl Stand'];
  if (/tea kettle|kettle/.test(t)) return ['茶壶', 'Tea Kettle'];
  if (/tea jar|jar/.test(t)) return ['茶罐', 'Tea Caddy'];
  return ['茶器', 'Tea Ware'];
}

async function fetchUrl(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {headers: {'User-Agent': 'TeawareGallery/1.0 (smithsonian-expansion)'}, signal: AbortSignal.timeout(120000)});
      if (res.status === 429 || res.status === 503) { if (attempt === retries) throw new Error(`HTTP ${res.status}`); await sleep(8000); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) { if (attempt === retries) throw e; await sleep(2000 * (attempt + 1)); }
  }
}

async function processRow(row) {
  const d = row.content?.descriptiveNonRepeating;
  if (!d) return;
  if (d.unit_code !== 'NMAA') { reject(row.id, 'not-asian-art'); return; }
  if (!d.record_link) { reject(row.id, 'no-record-link'); return; }
  if (d.metadata_usage?.access !== 'CC0') { reject(row.id, 'metadata-not-cc0'); return; }
  const om = d.online_media;
  if (!om?.media?.length) { reject(row.id, 'no-online-media'); return; }
  let chosenMedia = null, chosenRes = null;
  for (const m of om.media) {
    if (m.usage?.access !== 'CC0') continue;
    const res = (m.resources || []).find(r => r.label === 'High-resolution JPEG' && r.url && r.width && r.height && Math.max(r.width, r.height) >= 1200);
    if (res) { chosenMedia = m; chosenRes = res; break; }
  }
  if (!chosenMedia) { reject(row.id, 'no-cc0-hires-jpeg'); return; }
  const title = clean(d.title?.content || '');
  if (!title) { reject(row.id, 'no-title'); return; }
  const freetext = row.content?.freetext || {};
  const medium = (freetext.physicalDescription || []).filter(x => x.label === 'Medium').map(x => x.content).join('; ');
  const probe = {id: 'probe', titleEnglish: title, titleOriginal: title, materialEnglish: medium, objectTypeEnglish: title, sourceUrl: d.record_link};
  if (isSpoonLikeTeaware(probe)) { reject(row.id, 'spoon-like'); return; }
  const decision = classifyTeaware({...probe, titleEnglish: title});
  if (decision.decision !== 'admit') { reject(row.id, 'native-title-not-admit:' + decision.decision); return; }
  const idLabel = d.unit_code === 'NMAH' ? 'ID Number' : (['SAAM','NMAAHC','NMAI'].includes(d.unit_code) ? 'Object number' : 'Accession Number');
  const accession = (freetext.identifier || []).find(x => x.label === idLabel)?.content;
  if (!accession) { reject(row.id, 'no-accession'); return; }
  const artworkId = 'si-' + d.record_ID.replace(/_/g, '-');
  if (ids.has(artworkId)) { reject(row.id, 'duplicate-id'); return; }
  const sourceUrl = d.record_link;
  if (urls.has(normalizedSourceUrl(sourceUrl))) { reject(row.id, 'duplicate-url'); return; }
  const creditLineRaw = clean((freetext.creditLine || []).map(x => x.content).join('; '));
  const dateStr = clean((freetext.date || []).map(x => x.content).join('; '));
  const periodStr = (freetext.date || []).find(x => x.label === 'Period')?.content || '';
  const places = (row.content?.indexedStructured?.place || []).join('; ');
  const cultures = (row.content?.indexedStructured?.culture || []).join('; ');
  const topics = row.content?.indexedStructured?.topic || [];
  const [dynasty, dynastyEnglish] = parseDynasty([dateStr, periodStr, cultures, places].join(' '));
  const [material, materialEnglish] = parseMaterial(medium + ' ' + topics.join(' '));
  const [objectType, objectTypeEnglish] = parseObjectType(title);
  const dimensions = (freetext.physicalDescription || []).find(x => x.label === 'Dimensions')?.content || '';
  const artwork = {
    id: artworkId, titleChinese: dynasty + (material === '未详' ? '' : material) + objectType,
    titleEnglish: title, titleOriginal: title, dynasty, dynastyEnglish,
    period: periodStr || dateStr, date: dateStr || '馆方未注明制作年代 / Date not recorded',
    material, materialEnglish: medium || materialEnglish, objectType, objectTypeEnglish,
    dimensions, description: `此件${objectType}为${dynasty}时期之作品。馆方原名：${title}。${dateStr ? '年代：' + dateStr + '。' : ''}${places ? '产地：' + places + '。' : ''}${medium ? '材质：' + medium + '。' : ''}${dimensions ? '尺寸：' + dimensions + '。' : ''}现藏于史密森尼亚洲艺术博物馆 (弗利尔/赛克勒)。`,
    sourceMuseum: '史密森尼亚洲艺术博物馆 (弗利尔/赛克勒)',
    sourceMuseumEnglish: d.data_source, accessionNumber: accession, sourceUrl,
    imageUrl: '/artworks/' + artworkId + '.jpg', imageAlt: title + ' - ' + dateStr,
    license: 'CC0 / Public Domain (Smithsonian Open Access)',
    creditLine: [creditLineRaw, 'Smithsonian National Museum of Asian Art, CC0. Background removed and cropped by Teaware.'].filter(Boolean).join('; '),
    crawlBatchId: 'smithsonian-expansion-2026-10-17',
  };
  const key = physicalObjectKey(artwork);
  if (!key) { reject(row.id, 'no-physical-key'); return; }
  if (keys.has(key)) { reject(row.id, 'duplicate-physical-key'); return; }
  // Download raw high-res JPEG.
  let raw;
  try { raw = await fetchUrl(chosenRes.url); } catch (e) { reject(row.id, 'download-failed:' + e.message); return; }
  if (raw.length < 5000) { reject(row.id, 'tiny-image'); return; }
  const rawSha256 = digest(raw);
  if (existingSourceHashes.has(rawSha256)) { reject(row.id, 'duplicate-raw-hash'); return; }
  const cachePath = ROOT + '/cache/' + digest(Buffer.from(chosenRes.url)) + '.bin';
  try { await fs.access(cachePath); reject(row.id, 'cache-collision'); return; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await fs.writeFile(cachePath, raw);
  let meta;
  try { meta = await sharp(raw).metadata(); } catch (e) { reject(row.id, 'sharp-metadata-failed'); return; }
  if (Math.max(meta.width, meta.height) < 1200) { reject(row.id, 'below-1200-after-decode'); return; }
  const normalized = await sharp(raw).rotate().resize({width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true}).jpeg({quality: 95, mozjpeg: true}).toBuffer();
  const sourceSha256 = digest(normalized);
  if (existingSourceHashes.has(sourceSha256)) { reject(row.id, 'duplicate-normalized-hash'); return; }
  const inputPath = ROOT + '/originals/' + artworkId + '.jpg';
  try { await fs.access(inputPath); reject(row.id, 'output-collision'); return; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await fs.writeFile(inputPath, normalized);
  const source = {sourceUrl, imageSource: chosenRes.url, imageSha256: rawSha256, image: {id: chosenMedia.id}, raw: {content: row.content}};
  const rawMetadataSha256 = digest(Buffer.from(JSON.stringify(source)));
  const item = {artwork, raw: source, imageSource: chosenRes.url, imageLicenseUrl: 'https://www.si.edu/openaccess', downloadEvidence: {id: artworkId, sourceUrl, imageSource: chosenRes.url, sha256: rawSha256, retrievedAt: new Date().toISOString()}, retrievedAt: new Date().toISOString(), rawMetadataSha256, inputPath, sourceSha256, rawSha256, width: meta.width, height: meta.height};
  selected.push(item);
  ids.add(artworkId); urls.add(normalizedSourceUrl(sourceUrl)); keys.add(key);
  existingSourceHashes.add(sourceSha256);
  console.log('  +', artworkId, title.slice(0, 60));
  return {selected: item};
}

async function searchQuery(query) {
  for (let start = 0; start < 1000; start += 100) {
    const url = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&api_key=${API_KEY}&rows=100&start=${start}&online_media_type=images`;
    let data;
    try { data = JSON.parse((await fetchUrl(url)).toString('utf8')); } catch (e) { console.error(`  query "${query}" start ${start} failed: ${e.message}`); break; }
    const rows = data.response?.rows || [];
    stats.queries++; stats.rows += rows.length;
    if (rows.length === 0) break;
    for (const row of rows) {
      const recordId = row.content?.descriptiveNonRepeating?.record_ID || '';
      if (!recordId || seenRecordIds.has(recordId)) continue;
      seenRecordIds.add(recordId);
      try { await processRow(row); } catch (e) { reject(row.id, 'process-error:' + e.message); }
    }
    const total = data.response?.rowCount || 0;
    if (start + 100 >= total) break;
    await sleep(400);
  }
}

console.log('Smithsonian staging ->', ROOT);
console.log('Existing catalog:', active.length, '| exclusions:', exclusions.length, '| aliases:', aliases.length);
for (const q of QUERIES) {
  process.stdout.write(`[query] ${q}\n`);
  await searchQuery(q);
  await sleep(500);
}
await write(ROOT + '/downloaded.json', {selected, imageRejections});
await write(ROOT + '/metadata.json', selected.map(x => x.artwork));
await write(ROOT + '/inputs.json', selected.map(x => ({id: x.artwork.id, inputPath: x.inputPath, sourceSha256: x.sourceSha256, title: x.artwork.titleChinese, museum: x.artwork.sourceMuseum, kind: 'object'})));
await write(ROOT + '/admissions.json', {});
console.log(JSON.stringify({selected: selected.length, rejected: imageRejections.length, stats}, null, 2));
