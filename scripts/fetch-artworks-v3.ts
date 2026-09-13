/**
 * Tea Ware Fetcher v3 - Streamlined and Efficient
 * 
 * Key improvements:
 * - Relaxed filtering: Chinese ceramic bowls/cups are broadly accepted (tea culture)
 * - Targeted queries with deduplication
 * - Better error handling with retries
 * - Faster processing with batch requests where possible
 * 
 * Run with: npx tsx scripts/fetch-artworks-v3.ts
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
const CRAWL_BATCH_ID = `batch-${Date.now()}`;
const seenObjectIds = new Set<string>();
const seenAccessionNumbers = new Set<string>();
const allArtworks: CuratedArtwork[] = [];
const crawlLogs: CrawlLogEntry[] = [];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry fetch with exponential backoff
async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(30000)
      });
      if (response.ok) return response;
      if (response.status === 429) {
        await delay(5000 * (i + 1));
        continue;
      }
    } catch (e) {
      if (i < retries - 1) {
        await delay(2000 * (i + 1));
      }
    }
  }
  return null;
}

// Dynasty mapping
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
  'xuande': { chinese: '明宣德', english: 'Ming Dynasty, Xuande' },
  'chenghua': { chinese: '明成化', english: 'Ming Dynasty, Chenghua' },
  'jiajing': { chinese: '明嘉靖', english: 'Ming Dynasty, Jiajing' },
  'wanli': { chinese: '明万历', english: 'Ming Dynasty, Wanli' },
};

const materialMap: Record<string, { chinese: string; english: string }> = {
  'blue and white': { chinese: '青花瓷', english: 'Blue and White' },
  'blue-and-white': { chinese: '青花瓷', english: 'Blue and White' },
  'famille rose': { chinese: '粉彩', english: 'Famille Rose' },
  'famille verte': { chinese: '五彩', english: 'Famille Verte' },
  'enamel': { chinese: '珐琅彩', english: 'Enamel' },
  'celadon': { chinese: '青瓷', english: 'Celadon' },
  'longquan': { chinese: '龙泉青瓷', english: 'Longquan Celadon' },
  'jian': { chinese: '建盏', english: 'Jian Ware' },
  'tenmoku': { chinese: '天目', english: 'Tenmoku' },
  'yixing': { chinese: '宜兴紫砂', english: 'Yixing Purple Clay' },
  'zisha': { chinese: '紫砂', english: 'Purple Clay' },
  'stoneware': { chinese: '陶器', english: 'Stoneware' },
  'porcelain': { chinese: '瓷器', english: 'Porcelain' },
  'blanc de chine': { chinese: '德化白瓷', english: 'Blanc de Chine' },
  'dehua': { chinese: '德化白瓷', english: 'Dehua' },
  'doucai': { chinese: '斗彩', english: 'Doucai' },
  'overglaze': { chinese: '釉上彩', english: 'Overglaze' },
  'underglaze': { chinese: '釉下彩', english: 'Underglaze' },
};

const kilnMap: Record<string, { chinese: string; english: string }> = {
  'jingdezhen': { chinese: '景德镇窑', english: 'Jingdezhen' },
  'longquan': { chinese: '龙泉窑', english: 'Longquan' },
  'jian': { chinese: '建窑', english: 'Jian Kilns' },
  'yixing': { chinese: '宜兴', english: 'Yixing' },
  'dehua': { chinese: '德化窑', english: 'Dehua' },
  'ding': { chinese: '定窑', english: 'Ding' },
  'jun': { chinese: '钧窑', english: 'Jun' },
  'ge': { chinese: '哥窑', english: 'Ge' },
  'cizhou': { chinese: '磁州窑', english: 'Cizhou' },
};

function detectDynasty(text: string): { chinese: string; english: string } | null {
  const lowerText = text.toLowerCase();
  const orderedKeys = Object.keys(dynastyMap).sort((a, b) => b.length - a.length);
  for (const key of orderedKeys) {
    if (lowerText.includes(key)) return dynastyMap[key];
  }
  
  // Century detection
  const centuryMatch = lowerText.match(/(\d{1,2})(?:th|st|nd|rd)\s*century/i);
  if (centuryMatch) {
    const c = parseInt(centuryMatch[1]);
    if (c >= 10 && c <= 13) return { chinese: '宋', english: `${c}th Century (Song Era)` };
    if (c >= 14 && c <= 17) return { chinese: '明', english: `${c}th Century (Ming Era)` };
    if (c >= 17 && c <= 20) return { chinese: '清', english: `${c}th Century (Qing Era)` };
  }
  return null;
}

function detectMaterial(text: string): { chinese: string; english: string } | null {
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(materialMap)) {
    if (lowerText.includes(key)) return value;
  }
  return null;
}

function detectKiln(text: string): { chinese: string; english: string } | null {
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(kilnMap)) {
    if (lowerText.includes(key)) return value;
  }
  return null;
}

type ObjType = '茶壶' | '杯盏' | '茶具组' | '茶罐' | '执壶';
type ObjTypeEn = 'Teapot' | 'Tea Bowl/Cup' | 'Tea Set' | 'Tea Caddy' | 'Ewer';

function detectObjectType(text: string): { chinese: ObjType; english: ObjTypeEn } {
  const lt = text.toLowerCase();
  if (lt.includes('teapot') || lt.includes('tea pot')) return { chinese: '茶壶', english: 'Teapot' };
  if (lt.includes('ewer')) return { chinese: '执壶', english: 'Ewer' };
  if (lt.includes('caddy') || lt.includes('tea jar') || lt.includes('canister')) return { chinese: '茶罐', english: 'Tea Caddy' };
  if (lt.includes('set') || lt.includes('service')) return { chinese: '茶具组', english: 'Tea Set' };
  return { chinese: '杯盏', english: 'Tea Bowl/Cup' };
}

function generateChineseTitle(title: string, dynasty: string, material: string): string {
  const lt = title.toLowerCase();
  const d = dynasty || '';
  const m = material || '';
  
  if (lt.includes('teapot')) return `${d}${m}茶壶`;
  if (lt.includes('tea bowl') || lt.includes('teabowl')) return `${d}${m}茶盏`;
  if (lt.includes('cup') && lt.includes('tea')) return `${d}${m}茶杯`;
  if (lt.includes('wine cup') || lt.includes('stem cup') || lt.includes('libation')) return `${d}${m}杯盏`;
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

// Relaxed filtering - accept Chinese ceramic drinking vessels broadly
const EXCLUDE_KEYWORDS = [
  'sugar bowl', 'punch bowl', 'slop bowl', 'waste bowl', 'finger bowl',
  'cream pot', 'mustard pot', 'chocolate pot', 'coffee pot', 'coffeepot',
  'milk pot', 'sauce boat', 'tureen', 'platter', 'plate', 'dish', 'saucer',
  'snuff bottle', 'flower', 'incense', 'brush pot', 'water dropper',
  'figurine', 'statue', 'lamp', 'candlestick', 'box',
];

const CHINA_KEYWORDS = [
  'china', 'chinese', 'jingdezhen', 'dehua', 'yixing', 'longquan',
  'fujian', 'jiangxi', 'zhejiang', 'guangdong', 'henan', 'hebei',
  'song dynasty', 'ming dynasty', 'qing dynasty', 'yuan dynasty', 'tang dynasty',
  'kangxi', 'qianlong', 'yongzheng', 'xuande', 'chenghua', 'wanli',
  'famille rose', 'famille verte', 'blue and white', 'celadon',
  'tenmoku', 'jian ware', 'jun ware', 'ding ware',
];

function isAcceptable(text: string): boolean {
  const lt = text.toLowerCase();
  
  // Exclude non-drinking vessels
  for (const ex of EXCLUDE_KEYWORDS) {
    if (lt.includes(ex)) return false;
  }
  
  // Must be Chinese
  let isChinese = false;
  for (const kw of CHINA_KEYWORDS) {
    if (lt.includes(kw)) { isChinese = true; break; }
  }
  if (!isChinese) return false;
  
  // Must be a drinking vessel type
  const isVessel = lt.includes('teapot') || lt.includes('tea pot') || 
    lt.includes('tea bowl') || lt.includes('teabowl') ||
    lt.includes('cup') || lt.includes('bowl') ||
    lt.includes('ewer') || lt.includes('wine') ||
    lt.includes('caddy') || lt.includes('chawan') ||
    lt.includes('stem cup') || lt.includes('libation');
  
  return isVessel;
}

// ============== MET MUSEUM ==============

async function fetchMetIds(query: string): Promise<number[]> {
  const url = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`;
  const res = await fetchWithRetry(url);
  if (!res) return [];
  try {
    const data = await res.json();
    return data.objectIDs || [];
  } catch { return []; }
}

async function fetchMetObject(id: number): Promise<any | null> {
  const url = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  try {
    return await res.json();
  } catch { return null; }
}

async function crawlMet(queries: string[], maxPerQuery: number = 300): Promise<number> {
  let accepted = 0;
  
  for (const query of queries) {
    const startTime = Date.now();
    let qAccepted = 0, qRejected = 0;
    
    console.log(`[Met] "${query}"...`);
    const ids = await fetchMetIds(query);
    console.log(`[Met] Found ${ids.length} results`);
    
    // Process up to maxPerQuery per query to avoid excessive API calls
    const toProcess = ids.slice(0, Math.min(ids.length, maxPerQuery));
    
    for (let i = 0; i < toProcess.length; i++) {
      const objId = toProcess[i];
      const id = `met-${objId}`;
      
      if (seenObjectIds.has(id)) { qRejected++; continue; }
      
      await delay(80); // Rate limit
      const obj = await fetchMetObject(objId);
      
      if (!obj) { qRejected++; continue; }
      if (!obj.isPublicDomain) { qRejected++; continue; }
      if (!obj.primaryImage) { qRejected++; continue; }
      
      const combined = `${obj.title} ${obj.objectName || ''} ${obj.classification || ''} ${obj.culture || ''} ${obj.country || ''} ${obj.medium || ''} ${obj.period || ''} ${obj.dynasty || ''}`;
      
      if (!isAcceptable(combined)) { qRejected++; continue; }
      
      if (seenAccessionNumbers.has(obj.accessionNumber)) { qRejected++; continue; }
      
      // Accept!
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
      allArtworks.push(artwork);
      seenObjectIds.add(id);
      seenAccessionNumbers.add(obj.accessionNumber);
      qAccepted++;
      accepted++;
      
      if (qAccepted % 20 === 0) {
        console.log(`[Met] ...${qAccepted} accepted, total ${allArtworks.length}`);
      }
    }
    
    crawlLogs.push({
      timestamp: new Date().toISOString(),
      source: 'met',
      query,
      totalResults: ids.length,
      idsAccepted: qAccepted,
      idsRejected: qRejected,
      crawlBatchId: CRAWL_BATCH_ID,
      durationMs: Date.now() - startTime,
    });
    
    console.log(`[Met] "${query}": +${qAccepted} (rejected ${qRejected})`);
    await delay(500);
  }
  
  return accepted;
}

// ============== CLEVELAND MUSEUM ==============

async function fetchCMA(query: string, skip: number = 0): Promise<{ data: any[]; total: number }> {
  const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&limit=100&skip=${skip}`;
  const res = await fetchWithRetry(url);
  if (!res) return { data: [], total: 0 };
  try {
    const d = await res.json();
    return { data: d.data || [], total: d.info?.total || 0 };
  } catch { return { data: [], total: 0 }; }
}

async function crawlCMA(queries: string[]): Promise<number> {
  let accepted = 0;
  
  for (const query of queries) {
    const startTime = Date.now();
    let qAccepted = 0, qRejected = 0;
    
    console.log(`[CMA] "${query}"...`);
    
    let skip = 0;
    let hasMore = true;
    let total = 0;
    
    while (hasMore) {
      const { data, total: t } = await fetchCMA(query, skip);
      if (skip === 0) {
        total = t;
        console.log(`[CMA] Found ${total} results`);
      }
      
      if (data.length === 0) break;
      
      for (const obj of data) {
        const id = `cma-${obj.id}`;
        
        if (seenObjectIds.has(id)) { qRejected++; continue; }
        if (!obj.images?.web?.url) { qRejected++; continue; }
        if (obj.share_license_status !== 'CC0') { qRejected++; continue; }
        
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
        allArtworks.push(artwork);
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
      timestamp: new Date().toISOString(),
      source: 'cma',
      query,
      totalResults: total,
      idsAccepted: qAccepted,
      idsRejected: qRejected,
      crawlBatchId: CRAWL_BATCH_ID,
      durationMs: Date.now() - startTime,
    });
    
    console.log(`[CMA] "${query}": +${qAccepted}`);
    await delay(500);
  }
  
  return accepted;
}

// ============== ART INSTITUTE OF CHICAGO ==============

async function fetchAIC(query: string, page: number = 1): Promise<{ data: any[]; total: number }> {
  const fields = 'id,title,date_display,place_of_origin,medium_display,dimensions,credit_line,main_reference_number,is_public_domain,image_id,classification_title,department_title,style_title,culture_title';
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&fields=${fields}&limit=100&page=${page}`;
  const res = await fetchWithRetry(url);
  if (!res) return { data: [], total: 0 };
  try {
    const d = await res.json();
    return { data: d.data || [], total: d.pagination?.total || 0 };
  } catch { return { data: [], total: 0 }; }
}

async function crawlAIC(queries: string[]): Promise<number> {
  let accepted = 0;
  
  for (const query of queries) {
    const startTime = Date.now();
    let qAccepted = 0, qRejected = 0;
    
    console.log(`[AIC] "${query}"...`);
    
    let page = 1;
    let hasMore = true;
    let total = 0;
    const maxPages = 5;
    
    while (hasMore && page <= maxPages) {
      const { data, total: t } = await fetchAIC(query, page);
      if (page === 1) {
        total = t;
        console.log(`[AIC] Found ${total} results`);
      }
      
      if (data.length === 0) break;
      
      for (const obj of data) {
        const id = `aic-${obj.id}`;
        
        if (seenObjectIds.has(id)) { qRejected++; continue; }
        if (!obj.is_public_domain) { qRejected++; continue; }
        if (!obj.image_id) { qRejected++; continue; }
        
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
        allArtworks.push(artwork);
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
      timestamp: new Date().toISOString(),
      source: 'aic',
      query,
      totalResults: total,
      idsAccepted: qAccepted,
      idsRejected: qRejected,
      crawlBatchId: CRAWL_BATCH_ID,
      durationMs: Date.now() - startTime,
    });
    
    console.log(`[AIC] "${query}": +${qAccepted}`);
    await delay(500);
  }
  
  return accepted;
}

// ============== MAIN ==============

function saveCrawlLogs() {
  const logPath = path.join(__dirname, '..', 'research', 'crawl-log.jsonl');
  const lines = crawlLogs.map(l => JSON.stringify(l)).join('\n') + '\n';
  fs.appendFileSync(logPath, lines, 'utf-8');
}

function saveArtworks() {
  const dynastyOrder = ['唐', '五代', '北宋', '南宋', '宋', '辽', '金', '元', '明宣德', '明成化', '明嘉靖', '明万历', '明', '清康熙', '清雍正', '清乾隆', '清', '民国', '近现代', '未知'];
  
  allArtworks.sort((a, b) => {
    const ai = dynastyOrder.findIndex(d => a.dynasty.includes(d));
    const bi = dynastyOrder.findIndex(d => b.dynasty.includes(d));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  
  const outPath = path.join(__dirname, '..', 'src', 'data', 'artworks.json');
  fs.writeFileSync(outPath, JSON.stringify(allArtworks, null, 2), 'utf-8');
  console.log(`\n✅ Saved ${allArtworks.length} artworks to ${outPath}`);
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${allArtworks.length} artworks`);
  
  const byMuseum: Record<string, number> = {};
  const byDynasty: Record<string, number> = {};
  const byType: Record<string, number> = {};
  
  for (const a of allArtworks) {
    byMuseum[a.sourceMuseumEnglish] = (byMuseum[a.sourceMuseumEnglish] || 0) + 1;
    byDynasty[a.dynasty] = (byDynasty[a.dynasty] || 0) + 1;
    byType[a.objectType] = (byType[a.objectType] || 0) + 1;
  }
  
  console.log('\nBy Museum:');
  Object.entries(byMuseum).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  
  console.log('\nBy Dynasty:');
  Object.entries(byDynasty).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  
  console.log('\nBy Type:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

async function main() {
  console.log('🍵 Tea Ware Gallery Crawler v3');
  console.log(`📦 Batch: ${CRAWL_BATCH_ID}`);
  console.log('='.repeat(50));
  
  // More focused queries - accepting Chinese ceramic bowls/cups broadly
  const metQueries = [
    'tea bowl Chinese',
    'teapot Chinese',
    'wine cup Chinese',
    'stem cup Chinese',
    'bowl Chinese Song',
    'bowl Chinese Ming',
    'bowl Chinese Qing',
    'cup Chinese Ming',
    'cup Chinese Qing',
    'Jian ware',
    'tenmoku bowl',
    'celadon bowl Chinese',
    'blue white bowl Chinese',
    'blue white cup Chinese',
    'famille rose bowl',
    'famille rose cup',
    'Yixing',
    'ewer Chinese',
    'Kangxi cup',
    'Qianlong cup',
    'porcelain cup Chinese',
  ];
  
  const cmaQueries = [
    'tea Chinese',
    'teapot Chinese',
    'bowl Chinese',
    'cup Chinese',
    'Yixing',
    'celadon Chinese',
    'blue white Chinese',
    'famille rose',
  ];
  
  const aicQueries = [
    'teapot Chinese',
    'tea bowl Chinese',
    'bowl Chinese porcelain',
    'cup Chinese porcelain',
    'wine cup Chinese',
    'celadon Chinese',
    'blue white Chinese',
    'Jingdezhen',
    'Song dynasty ceramics',
    'Ming dynasty ceramics',
    'Qing dynasty ceramics',
  ];
  
  console.log('\n🏛️ Met Museum...');
  await crawlMet(metQueries, 400);
  console.log(`\n📊 Running total: ${allArtworks.length}`);
  
  console.log('\n🏛️ Cleveland Museum...');
  await crawlCMA(cmaQueries);
  console.log(`\n📊 Running total: ${allArtworks.length}`);
  
  console.log('\n🏛️ Art Institute of Chicago...');
  await crawlAIC(aicQueries);
  console.log(`\n📊 Running total: ${allArtworks.length}`);
  
  saveCrawlLogs();
  saveArtworks();
  printSummary();
}

main().catch(console.error);
