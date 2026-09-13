/**
 * Collection Expansion Script
 * 
 * This script reads existing crawl-log.jsonl to avoid re-crawling,
 * then runs NEW queries to expand the collection toward 1000 artworks.
 * 
 * Run with: npx tsx scripts/expand-collection.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface CuratedArtwork {
  id: string;
  titleChinese: string;
  titleEnglish: string;
  dynasty: string;
  dynastyEnglish: string;
  period?: string;
  date: string;
  material: string;
  materialEnglish: string;
  objectType: '茶壶' | '杯盏' | '茶具组' | '茶罐' | '执壶';
  objectTypeEnglish: 'Teapot' | 'Tea Bowl/Cup' | 'Tea Set' | 'Tea Caddy' | 'Ewer';
  kiln?: string;
  kilnEnglish?: string;
  dimensions?: string;
  description: string;
  sourceMuseum: string;
  sourceMuseumEnglish: string;
  accessionNumber: string;
  sourceUrl: string;
  imageUrl: string;
  imageAlt: string;
  license: string;
  creditLine?: string;
  crawlBatchId: string;
}

interface CrawlLogEntry {
  timestamp: string;
  source: string;
  query: string;
  totalResults: number;
  idsAccepted: number;
  idsRejected: number;
  crawlBatchId: string;
  durationMs: number;
}

// Globals
const CRAWL_BATCH_ID = `expansion-${Date.now()}`;
const existingArtworks: CuratedArtwork[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'artworks.json'), 'utf-8')
);
const seenObjectIds = new Set<string>(existingArtworks.map(a => a.id));
const seenAccessionNumbers = new Set<string>(existingArtworks.map(a => a.accessionNumber));
const newArtworks: CuratedArtwork[] = [];
const crawlLogs: CrawlLogEntry[] = [];

// Load completed queries from crawl log
const crawlLogPath = path.join(__dirname, '..', 'research', 'crawl-log.jsonl');
const completedQueries = new Set<string>();
if (fs.existsSync(crawlLogPath)) {
  const lines = fs.readFileSync(crawlLogPath, 'utf-8').split('\n').filter(l => l.trim());
  for (const line of lines) {
    const entry = JSON.parse(line);
    completedQueries.add(`${entry.source}:${entry.query}`);
  }
}

console.log(`📊 Loaded ${existingArtworks.length} existing artworks`);
console.log(`📝 Found ${completedQueries.size} completed query+source pairs`);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (response.ok) return response;
      if (response.status === 429) { await delay(5000 * (i + 1)); continue; }
    } catch { if (i < retries - 1) await delay(2000 * (i + 1)); }
  }
  return null;
}

// Mappings
const dynastyMap: Record<string, { chinese: string; english: string }> = {
  'tang': { chinese: '唐', english: 'Tang Dynasty' },
  'song': { chinese: '宋', english: 'Song Dynasty' },
  'northern song': { chinese: '北宋', english: 'Northern Song Dynasty' },
  'southern song': { chinese: '南宋', english: 'Southern Song Dynasty' },
  'yuan': { chinese: '元', english: 'Yuan Dynasty' },
  'ming': { chinese: '明', english: 'Ming Dynasty' },
  'qing': { chinese: '清', english: 'Qing Dynasty' },
  'kangxi': { chinese: '清康熙', english: 'Qing Dynasty, Kangxi' },
  'yongzheng': { chinese: '清雍正', english: 'Qing Dynasty, Yongzheng' },
  'qianlong': { chinese: '清乾隆', english: 'Qing Dynasty, Qianlong' },
};

const materialMap: Record<string, { chinese: string; english: string }> = {
  'blue and white': { chinese: '青花瓷', english: 'Blue and White' },
  'famille rose': { chinese: '粉彩', english: 'Famille Rose' },
  'celadon': { chinese: '青瓷', english: 'Celadon' },
  'longquan': { chinese: '龙泉青瓷', english: 'Longquan Celadon' },
  'jian': { chinese: '建盏', english: 'Jian Ware' },
  'tenmoku': { chinese: '天目', english: 'Tenmoku' },
  'yixing': { chinese: '宜兴紫砂', english: 'Yixing Purple Clay' },
  'zisha': { chinese: '紫砂', english: 'Purple Clay' },
  'stoneware': { chinese: '陶器', english: 'Stoneware' },
  'porcelain': { chinese: '瓷器', english: 'Porcelain' },
  'dehua': { chinese: '德化白瓷', english: 'Dehua' },
  'jun': { chinese: '钧瓷', english: 'Jun Ware' },
  'ding': { chinese: '定瓷', english: 'Ding Ware' },
};

const kilnMap: Record<string, { chinese: string; english: string }> = {
  'jingdezhen': { chinese: '景德镇窑', english: 'Jingdezhen' },
  'longquan': { chinese: '龙泉窑', english: 'Longquan' },
  'jian': { chinese: '建窑', english: 'Jian Kilns' },
  'yixing': { chinese: '宜兴', english: 'Yixing' },
  'dehua': { chinese: '德化窑', english: 'Dehua' },
  'jun': { chinese: '钧窑', english: 'Jun' },
  'ding': { chinese: '定窑', english: 'Ding' },
};

function detectDynasty(text: string): { chinese: string; english: string } | null {
  const lt = text.toLowerCase();
  for (const [k, v] of Object.entries(dynastyMap).sort((a, b) => b[0].length - a[0].length)) {
    if (lt.includes(k)) return v;
  }
  return null;
}

function detectMaterial(text: string): { chinese: string; english: string } | null {
  const lt = text.toLowerCase();
  for (const [k, v] of Object.entries(materialMap)) {
    if (lt.includes(k)) return v;
  }
  return null;
}

function detectKiln(text: string): { chinese: string; english: string } | null {
  const lt = text.toLowerCase();
  for (const [k, v] of Object.entries(kilnMap)) {
    if (lt.includes(k)) return v;
  }
  return null;
}

type ObjType = '茶壶' | '杯盏' | '茶具组' | '茶罐' | '执壶';
type ObjTypeEn = 'Teapot' | 'Tea Bowl/Cup' | 'Tea Set' | 'Tea Caddy' | 'Ewer';

function detectObjectType(text: string): { chinese: ObjType; english: ObjTypeEn } {
  const lt = text.toLowerCase();
  if (lt.includes('teapot') || lt.includes('tea pot')) return { chinese: '茶壶', english: 'Teapot' };
  if (lt.includes('ewer')) return { chinese: '执壶', english: 'Ewer' };
  if (lt.includes('caddy') || lt.includes('tea jar')) return { chinese: '茶罐', english: 'Tea Caddy' };
  if (lt.includes('set') || lt.includes('service')) return { chinese: '茶具组', english: 'Tea Set' };
  return { chinese: '杯盏', english: 'Tea Bowl/Cup' };
}

function generateChineseTitle(title: string, dynasty: string, material: string): string {
  const lt = title.toLowerCase();
  const d = dynasty || '';
  const m = material || '';
  if (lt.includes('teapot')) return `${d}${m}茶壶`;
  if (lt.includes('tea bowl') || lt.includes('teabowl')) return `${d}${m}茶盏`;
  if (lt.includes('cup')) return `${d}${m}杯盏`;
  if (lt.includes('bowl')) return `${d}${m}茶盏`;
  if (lt.includes('ewer')) return `${d}${m}执壶`;
  return `${d}${m}茶器`;
}

function generateDescription(a: Partial<CuratedArtwork>): string {
  const parts: string[] = [];
  if (a.dynasty) parts.push(`此件${a.objectType || '茶器'}为${a.dynasty}时期之作品。`);
  if (a.material) parts.push(`器身采用${a.material}工艺制成。`);
  if (a.kiln) parts.push(`出自${a.kiln}。`);
  if (a.dimensions) parts.push(`尺寸：${a.dimensions}。`);
  parts.push(`现藏于${a.sourceMuseum || '博物馆'}。`);
  return parts.join('');
}

// Tea ware filtering
const EXCLUDE_KEYWORDS = ['sugar bowl', 'punch bowl', 'slop bowl', 'cream pot', 'chocolate pot', 'coffee',
  'milk pot', 'sauce boat', 'tureen', 'platter', 'plate', 'dish', 'saucer', 'snuff bottle', 'flower', 
  'incense', 'brush pot', 'figurine', 'statue', 'lamp', 'box', 'vase'];

const CHINA_KEYWORDS = ['china', 'chinese', 'jingdezhen', 'dehua', 'yixing', 'longquan', 'fujian', 'jiangxi',
  'song dynasty', 'ming dynasty', 'qing dynasty', 'yuan dynasty', 'tang dynasty', 'kangxi', 'qianlong',
  'famille rose', 'famille verte', 'blue and white', 'celadon', 'tenmoku', 'jian ware', 'jun ware', 'ding ware'];

function isAcceptable(text: string): boolean {
  const lt = text.toLowerCase();
  for (const ex of EXCLUDE_KEYWORDS) { if (lt.includes(ex)) return false; }
  let isChinese = false;
  for (const kw of CHINA_KEYWORDS) { if (lt.includes(kw)) { isChinese = true; break; } }
  if (!isChinese) return false;
  const isVessel = lt.includes('teapot') || lt.includes('tea pot') || lt.includes('tea bowl') || 
    lt.includes('cup') || lt.includes('bowl') || lt.includes('ewer') || lt.includes('wine') ||
    lt.includes('caddy') || lt.includes('stem cup') || lt.includes('libation') || lt.includes('covered');
  return isVessel;
}

// ============== MET MUSEUM ==============

async function fetchMetIds(query: string): Promise<number[]> {
  const url = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`;
  const res = await fetchWithRetry(url);
  if (!res) return [];
  try { const data = await res.json(); return data.objectIDs || []; } catch { return []; }
}

async function fetchMetObject(id: number): Promise<any | null> {
  const url = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

async function crawlMet(queries: string[], maxPerQuery: number = 300): Promise<number> {
  let accepted = 0;
  for (const query of queries) {
    const key = `met:${query}`;
    if (completedQueries.has(key)) {
      console.log(`[Met] Skipping "${query}" (already crawled)`);
      continue;
    }
    const startTime = Date.now();
    let qAccepted = 0, qRejected = 0;
    console.log(`[Met] "${query}"...`);
    const ids = await fetchMetIds(query);
    console.log(`[Met] Found ${ids.length} results`);
    const toProcess = ids.slice(0, Math.min(ids.length, maxPerQuery));
    
    for (const objId of toProcess) {
      const id = `met-${objId}`;
      if (seenObjectIds.has(id)) { qRejected++; continue; }
      await delay(80);
      const obj = await fetchMetObject(objId);
      if (!obj || !obj.isPublicDomain || !obj.primaryImage) { qRejected++; continue; }
      const combined = `${obj.title} ${obj.objectName || ''} ${obj.classification || ''} ${obj.culture || ''} ${obj.country || ''} ${obj.medium || ''} ${obj.period || ''} ${obj.dynasty || ''}`;
      if (!isAcceptable(combined)) { qRejected++; continue; }
      if (seenAccessionNumbers.has(obj.accessionNumber)) { qRejected++; continue; }
      
      const dynasty = detectDynasty(combined);
      const material = detectMaterial(combined);
      const kiln = detectKiln(combined);
      const objectType = detectObjectType(obj.title);
      
      const artwork: CuratedArtwork = {
        id,
        titleChinese: generateChineseTitle(obj.title, dynasty?.chinese || '', material?.chinese || ''),
        titleEnglish: obj.title,
        dynasty: dynasty?.chinese || '未知',
        dynastyEnglish: dynasty?.english || obj.dynasty || obj.period || 'Unknown',
        period: obj.period || undefined,
        date: obj.objectDate || 'Date unknown',
        material: material?.chinese || '瓷器',
        materialEnglish: material?.english || obj.medium || 'Porcelain',
        objectType: objectType.chinese,
        objectTypeEnglish: objectType.english,
        kiln: kiln?.chinese,
        kilnEnglish: kiln?.english,
        dimensions: obj.dimensions || undefined,
        description: '',
        sourceMuseum: '大都会艺术博物馆',
        sourceMuseumEnglish: 'The Metropolitan Museum of Art',
        accessionNumber: obj.accessionNumber,
        sourceUrl: obj.objectURL,
        imageUrl: obj.primaryImage,
        imageAlt: `${obj.title} - ${obj.objectDate || ''}`,
        license: 'CC0 / Public Domain',
        creditLine: obj.creditLine,
        crawlBatchId: CRAWL_BATCH_ID,
      };
      artwork.description = generateDescription(artwork);
      newArtworks.push(artwork);
      seenObjectIds.add(id);
      seenAccessionNumbers.add(obj.accessionNumber);
      qAccepted++;
      accepted++;
      if (qAccepted % 10 === 0) console.log(`[Met] ...${qAccepted} accepted, total new: ${newArtworks.length}`);
    }
    
    crawlLogs.push({
      timestamp: new Date().toISOString(), source: 'met', query,
      totalResults: ids.length, idsAccepted: qAccepted, idsRejected: qRejected,
      crawlBatchId: CRAWL_BATCH_ID, durationMs: Date.now() - startTime,
    });
    console.log(`[Met] "${query}": +${qAccepted}`);
    await delay(500);
  }
  return accepted;
}

// ============== CMA ==============

async function fetchCMA(query: string, skip: number = 0): Promise<{ data: any[]; total: number }> {
  const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&limit=100&skip=${skip}`;
  const res = await fetchWithRetry(url);
  if (!res) return { data: [], total: 0 };
  try { const d = await res.json(); return { data: d.data || [], total: d.info?.total || 0 }; } catch { return { data: [], total: 0 }; }
}

async function crawlCMA(queries: string[]): Promise<number> {
  let accepted = 0;
  for (const query of queries) {
    const key = `cma:${query}`;
    if (completedQueries.has(key)) {
      console.log(`[CMA] Skipping "${query}" (already crawled)`);
      continue;
    }
    const startTime = Date.now();
    let qAccepted = 0, qRejected = 0, total = 0;
    console.log(`[CMA] "${query}"...`);
    
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, total: t } = await fetchCMA(query, skip);
      if (skip === 0) { total = t; console.log(`[CMA] Found ${total} results`); }
      if (data.length === 0) break;
      
      for (const obj of data) {
        const id = `cma-${obj.id}`;
        if (seenObjectIds.has(id)) { qRejected++; continue; }
        if (!obj.images?.web?.url || obj.share_license_status !== 'CC0') { qRejected++; continue; }
        const combined = `${obj.title} ${obj.type || ''} ${obj.department || ''} ${(obj.culture || []).join(' ')} ${obj.technique || ''}`;
        if (!isAcceptable(combined)) { qRejected++; continue; }
        if (seenAccessionNumbers.has(obj.accession_number)) { qRejected++; continue; }
        
        const dynasty = detectDynasty(combined);
        const material = detectMaterial(combined);
        const kiln = detectKiln(combined);
        const objectType = detectObjectType(obj.title);
        
        const artwork: CuratedArtwork = {
          id,
          titleChinese: generateChineseTitle(obj.title, dynasty?.chinese || '', material?.chinese || ''),
          titleEnglish: obj.title,
          dynasty: dynasty?.chinese || '未知',
          dynastyEnglish: dynasty?.english || 'Unknown',
          date: obj.creation_date || 'Date unknown',
          material: material?.chinese || '瓷器',
          materialEnglish: material?.english || obj.technique || 'Porcelain',
          objectType: objectType.chinese,
          objectTypeEnglish: objectType.english,
          kiln: kiln?.chinese,
          kilnEnglish: kiln?.english,
          dimensions: obj.measurements || undefined,
          description: '',
          sourceMuseum: '克利夫兰艺术博物馆',
          sourceMuseumEnglish: 'Cleveland Museum of Art',
          accessionNumber: obj.accession_number,
          sourceUrl: obj.url,
          imageUrl: obj.images.web.url,
          imageAlt: `${obj.title} - ${obj.creation_date || ''}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.creditline,
          crawlBatchId: CRAWL_BATCH_ID,
        };
        artwork.description = generateDescription(artwork);
        newArtworks.push(artwork);
        seenObjectIds.add(id);
        seenAccessionNumbers.add(obj.accession_number);
        qAccepted++;
        accepted++;
      }
      skip += data.length;
      hasMore = skip < total && data.length === 100;
      if (hasMore) await delay(1500);
    }
    
    crawlLogs.push({
      timestamp: new Date().toISOString(), source: 'cma', query,
      totalResults: total, idsAccepted: qAccepted, idsRejected: qRejected,
      crawlBatchId: CRAWL_BATCH_ID, durationMs: Date.now() - startTime,
    });
    console.log(`[CMA] "${query}": +${qAccepted}`);
    await delay(500);
  }
  return accepted;
}

// ============== AIC ==============

async function fetchAIC(query: string, page: number = 1): Promise<{ data: any[]; total: number }> {
  const fields = 'id,title,date_display,place_of_origin,medium_display,dimensions,credit_line,main_reference_number,is_public_domain,image_id,classification_title,department_title,style_title,culture_title';
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&fields=${fields}&limit=100&page=${page}`;
  const res = await fetchWithRetry(url);
  if (!res) return { data: [], total: 0 };
  try { const d = await res.json(); return { data: d.data || [], total: d.pagination?.total || 0 }; } catch { return { data: [], total: 0 }; }
}

async function crawlAIC(queries: string[]): Promise<number> {
  let accepted = 0;
  for (const query of queries) {
    const key = `aic:${query}`;
    if (completedQueries.has(key)) {
      console.log(`[AIC] Skipping "${query}" (already crawled)`);
      continue;
    }
    const startTime = Date.now();
    let qAccepted = 0, qRejected = 0, total = 0;
    console.log(`[AIC] "${query}"...`);
    
    let page = 1;
    let hasMore = true;
    const maxPages = 5;
    while (hasMore && page <= maxPages) {
      const { data, total: t } = await fetchAIC(query, page);
      if (page === 1) { total = t; console.log(`[AIC] Found ${total} results`); }
      if (data.length === 0) break;
      
      for (const obj of data) {
        const id = `aic-${obj.id}`;
        if (seenObjectIds.has(id) || !obj.is_public_domain || !obj.image_id) { qRejected++; continue; }
        const combined = `${obj.title} ${obj.place_of_origin || ''} ${obj.medium_display || ''} ${obj.classification_title || ''} ${obj.department_title || ''} ${obj.style_title || ''} ${obj.culture_title || ''}`;
        if (!isAcceptable(combined)) { qRejected++; continue; }
        if (obj.main_reference_number && seenAccessionNumbers.has(obj.main_reference_number)) { qRejected++; continue; }
        
        const dynasty = detectDynasty(combined);
        const material = detectMaterial(combined);
        const kiln = detectKiln(combined);
        const objectType = detectObjectType(obj.title);
        const imageUrl = `https://www.artic.edu/iiif/2/${obj.image_id}/full/843,/0/default.jpg`;
        
        const artwork: CuratedArtwork = {
          id,
          titleChinese: generateChineseTitle(obj.title, dynasty?.chinese || '', material?.chinese || ''),
          titleEnglish: obj.title,
          dynasty: dynasty?.chinese || '未知',
          dynastyEnglish: dynasty?.english || 'Unknown',
          date: obj.date_display || 'Date unknown',
          material: material?.chinese || '瓷器',
          materialEnglish: material?.english || obj.medium_display || 'Porcelain',
          objectType: objectType.chinese,
          objectTypeEnglish: objectType.english,
          kiln: kiln?.chinese,
          kilnEnglish: kiln?.english,
          dimensions: obj.dimensions || undefined,
          description: '',
          sourceMuseum: '芝加哥艺术博物馆',
          sourceMuseumEnglish: 'Art Institute of Chicago',
          accessionNumber: obj.main_reference_number || `aic-${obj.id}`,
          sourceUrl: `https://www.artic.edu/artworks/${obj.id}`,
          imageUrl,
          imageAlt: `${obj.title} - ${obj.date_display || ''}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.credit_line,
          crawlBatchId: CRAWL_BATCH_ID,
        };
        artwork.description = generateDescription(artwork);
        newArtworks.push(artwork);
        seenObjectIds.add(id);
        if (obj.main_reference_number) seenAccessionNumbers.add(obj.main_reference_number);
        qAccepted++;
        accepted++;
      }
      page++;
      hasMore = data.length === 100 && page <= maxPages;
      if (hasMore) await delay(300);
    }
    
    crawlLogs.push({
      timestamp: new Date().toISOString(), source: 'aic', query,
      totalResults: total, idsAccepted: qAccepted, idsRejected: qRejected,
      crawlBatchId: CRAWL_BATCH_ID, durationMs: Date.now() - startTime,
    });
    console.log(`[AIC] "${query}": +${qAccepted}`);
    await delay(500);
  }
  return accepted;
}

// ============== MAIN ==============

function saveCrawlLogs() {
  const lines = crawlLogs.map(l => JSON.stringify(l)).join('\n') + '\n';
  fs.appendFileSync(crawlLogPath, lines, 'utf-8');
}

function saveArtworks() {
  const allArtworks = [...existingArtworks, ...newArtworks];
  const dynastyOrder = ['唐', '五代', '北宋', '南宋', '宋', '辽', '金', '元', '明宣德', '明成化', '明嘉靖', '明万历', '明', '清康熙', '清雍正', '清乾隆', '清', '民国', '近现代', '未知'];
  allArtworks.sort((a, b) => {
    const ai = dynastyOrder.findIndex(d => a.dynasty.includes(d));
    const bi = dynastyOrder.findIndex(d => b.dynasty.includes(d));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const outPath = path.join(__dirname, '..', 'src', 'data', 'artworks.json');
  fs.writeFileSync(outPath, JSON.stringify(allArtworks, null, 2), 'utf-8');
  console.log(`\n✅ Saved ${allArtworks.length} total artworks (${newArtworks.length} new)`);
}

async function main() {
  console.log('🍵 Collection Expansion Script');
  console.log(`📦 Batch: ${CRAWL_BATCH_ID}`);
  console.log(`🎯 Target: 1000 artworks (need ${Math.max(0, 1000 - existingArtworks.length)} more)`);
  console.log('='.repeat(50));
  
  // New queries NOT in the previous crawl log
  const metQueries = [
    'covered bowl Chinese',
    'gaiwan Chinese',
    'tea caddy Chinese',
    'Longquan tea',
    'Dehua cup',
    'Dehua bowl',
    'dragon cup Chinese',
    'lotus cup Chinese',
    'chicken cup Chinese',
    'Jun ware bowl',
    'Ding ware bowl',
    'Ding ware cup',
    'libation cup Chinese',
    'ritual cup Chinese',
    'Yixing teapot',
    'tenmoku Chinese',
    'Qingbai bowl',
    'Qingbai cup',
  ];
  
  const cmaQueries = [
    'Song dynasty bowl',
    'Ming dynasty bowl',
    'Qing dynasty bowl',
    'Song dynasty cup',
    'Ming dynasty cup', 
    'Qing dynasty cup',
    'ewer Chinese',
    'stoneware Chinese',
    'Jun Chinese',
    'Longquan Chinese',
    'Dehua Chinese',
  ];
  
  const aicQueries = [
    'Yixing',
    'ewer Chinese',
    'tea caddy Chinese',
    'Longquan',
    'covered bowl Chinese',
    'Dehua',
    'Jun ware',
    'Ding ware',
    'stem cup Chinese',
  ];
  
  console.log('\n🏛️ Met Museum expansion...');
  await crawlMet(metQueries, 200);
  console.log(`\n📊 New artworks: ${newArtworks.length}`);
  
  console.log('\n🏛️ Cleveland Museum expansion...');
  await crawlCMA(cmaQueries);
  console.log(`\n📊 New artworks: ${newArtworks.length}`);
  
  console.log('\n🏛️ Art Institute of Chicago expansion...');
  await crawlAIC(aicQueries);
  console.log(`\n📊 New artworks: ${newArtworks.length}`);
  
  saveCrawlLogs();
  saveArtworks();
  
  const finalCount = existingArtworks.length + newArtworks.length;
  console.log('\n' + '='.repeat(50));
  console.log(`📊 FINAL TOTAL: ${finalCount} artworks`);
  console.log(`📈 Added: ${newArtworks.length} new items`);
  if (finalCount >= 1000) {
    console.log('🎉 TARGET REACHED!');
  } else {
    console.log(`📍 Gap remaining: ${1000 - finalCount}`);
  }
}

main().catch(console.error);
