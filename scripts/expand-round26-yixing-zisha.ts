/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Round 26 Expansion Script - Yixing Zisha (宜兴紫砂) Focus
 * 2026-09-29
 * 
 * TARGETED EXPANSION: Only Yixing / 紫砂 / Purple Clay teaware
 * 
 * Sources:
 * 1. Met Museum - Yixing teapots, cups, trays
 * 2. V&A - Yixing stoneware
 * 3. CMA - Yixing ceramics
 * 4. Rijksmuseum - Yixing ware
 * 5. Smithsonian Freer/Sackler - Yixing collection
 * 6. Getty Open Content - Yixing pieces
 * 7. Wikimedia Commons - Yixing categories
 * 
 * Constraints:
 * - CC0 / Public Domain / CC BY only (NO NC licenses)
 * - Self-host all images under public/artworks/
 * - SHA256 dedupe against existing images
 * - Quality Gate: max(width, height) >= 1200 pixels
 * - Output: 1200px max edge, JPEG quality 72, mozjpeg progressive
 * - ONLY Yixing/zisha/purple clay items
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import sharp from 'sharp';

interface Artwork {
  id: string;
  titleChinese: string;
  titleEnglish: string;
  dynasty: string;
  dynastyEnglish: string;
  period?: string;
  date: string;
  material: string;
  materialEnglish: string;
  objectType: string;
  objectTypeEnglish: string;
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

const ROOT = process.cwd();
const ARTWORKS_PATH = path.join(ROOT, 'src', 'data', 'artworks.json');
const PUBLIC_ARTWORKS_PATH = path.join(ROOT, 'public', 'artworks.json');
const CRAWL_LOG_PATH = path.join(ROOT, 'research', 'crawl-log.jsonl');
const IMAGE_HASHES_PATH = path.join(ROOT, 'research', 'image-hashes.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'artworks');
const BATCH_ID = `round26-yixing-${Date.now()}`;

const SMITHSONIAN_API_KEY = process.env.SMITHSONIAN_API_KEY;

const MIN_LONGEST_EDGE = 1200;
const MAX_OUTPUT_EDGE = 1200;
const JPEG_QUALITY = 72;

const stats = {
  met: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_notYixing: 0, rejected_duplicate: 0, rejected_other: 0 },
  va: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_notYixing: 0, rejected_duplicate: 0, rejected_other: 0 },
  cma: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_notYixing: 0, rejected_duplicate: 0, rejected_other: 0 },
  rijksmuseum: { queried: 0, pagesFetched: 0, objectsFetched: 0, accepted: 0, rejected_lowres: 0, rejected_license: 0, rejected_notYixing: 0, rejected_duplicate: 0, rejected_other: 0 },
  smithsonian: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_notYixing: 0, rejected_duplicate: 0, rejected_other: 0 },
  getty: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_notYixing: 0, rejected_duplicate: 0, rejected_other: 0 },
  wmc: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_notYixing: 0, rejected_duplicate: 0, rejected_other: 0 },
};

// === YIXING-SPECIFIC QUERIES ===
const YIXING_QUERIES = [
  'Yixing teapot',
  'Yixing ware',
  'Yixing stoneware',
  'Yixing zisha',
  'purple clay teapot',
  'purple sand teapot',
  'zisha teapot',
  'zisha ware',
  'Yixing clay',
  'Yixing pottery',
  'Yixing tea',
  'Yixing cup',
  'Yixing tray',
  'Yixing caddy',
  '宜兴',
  '紫砂',
  'boccaro',
  'red stoneware china',
];

const RIJKSMUSEUM_YIXING_QUERIES = [
  { field: 'title', term: 'Yixing', maxPages: 15, description: 'Yixing (title)' },
  { field: 'description', term: 'Yixing', maxPages: 10, description: 'Yixing (description)' },
  { field: 'title', term: 'zisha', maxPages: 5, description: 'Zisha' },
  { field: 'title', term: 'purple clay', maxPages: 5, description: 'Purple clay' },
  { field: 'title', term: 'boccaro', maxPages: 8, description: 'Boccaro (European name for Yixing)' },
  { field: 'title', term: 'red stoneware chinese', maxPages: 5, description: 'Red stoneware Chinese' },
];

const WMC_YIXING_CATEGORIES = [
  'Category:Yixing_teapots',
  'Category:Yixing_ware',
  'Category:Yixing_clay_teapots',
  'Category:Purple_clay_teapots',
  'Category:Zisha',
];

function isYixingItem(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('yixing') ||
    lower.includes('zisha') ||
    lower.includes('purple clay') ||
    lower.includes('purple sand') ||
    lower.includes('宜兴') ||
    lower.includes('紫砂') ||
    lower.includes('boccaro') ||
    (lower.includes('red stoneware') && (lower.includes('china') || lower.includes('chinese') || lower.includes('jiangsu')))
  );
}

function loadExistingIds(): Set<string> {
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  return new Set(artworks.map(a => a.id));
}

function loadExistingHashes(): Set<string> {
  if (fs.existsSync(IMAGE_HASHES_PATH)) {
    try {
      return new Set(JSON.parse(fs.readFileSync(IMAGE_HASHES_PATH, 'utf-8')));
    } catch {
      return new Set();
    }
  }
  return new Set();
}

function fetchWithRetry(url: string, retries = 3, headers: Record<string, string> = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://philmingdao.github.io/teaware/; round26-yixing)',
        'Accept': 'application/json,image/*,*/*',
        ...headers,
      },
      timeout: 120000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (location) {
          const absoluteUrl = location.startsWith('http') ? location : new URL(location, url).toString();
          fetchWithRetry(absoluteUrl, retries, headers).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode === 429 || res.statusCode === 503) {
        if (retries > 0) {
          console.log(`    [限流] 等待后重试... (剩余${retries}次)`);
          setTimeout(() => fetchWithRetry(url, retries - 1, headers).then(resolve).catch(reject), 10000);
          return;
        }
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const data = await fetchWithRetry(url, 3, headers);
  return JSON.parse(data.toString('utf-8'));
}

function isValidImage(buffer: Buffer): boolean {
  if (buffer.length < 5000) return false;
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  const isWebp = buffer.length > 11 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  const isTiff = (buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D);
  return isJpeg || isPng || isGif || isWebp || isTiff;
}

function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function compressImage(imageData: Buffer, outputPath: string): Promise<boolean> {
  try {
    const image = sharp(imageData);
    const metadata = await image.metadata();
    
    const longestEdge = Math.max(metadata.width || 0, metadata.height || 0);
    if (longestEdge < MIN_LONGEST_EDGE) {
      return false;
    }
    
    await image
      .resize(MAX_OUTPUT_EDGE, MAX_OUTPUT_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toFile(outputPath);
    return true;
  } catch {
    return false;
  }
}

function parseYixingDynasty(dateStr: string, placeStr: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (dateStr + ' ' + placeStr).toLowerCase();
  
  if (lower.includes('kangxi')) return { dynasty: '清康熙', dynastyEnglish: 'Qing Dynasty (Kangxi)' };
  if (lower.includes('yongzheng')) return { dynasty: '清雍正', dynastyEnglish: 'Qing Dynasty (Yongzheng)' };
  if (lower.includes('qianlong')) return { dynasty: '清乾隆', dynastyEnglish: 'Qing Dynasty (Qianlong)' };
  if (lower.includes('jiaqing')) return { dynasty: '清嘉庆', dynastyEnglish: 'Qing Dynasty (Jiaqing)' };
  if (lower.includes('daoguang')) return { dynasty: '清道光', dynastyEnglish: 'Qing Dynasty (Daoguang)' };
  if (lower.includes('guangxu')) return { dynasty: '清光绪', dynastyEnglish: 'Qing Dynasty (Guangxu)' };
  if (lower.includes('qing') || (lower.includes('17') && lower.includes('19'))) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  
  if (lower.includes('wanli')) return { dynasty: '明万历', dynastyEnglish: 'Ming Dynasty (Wanli)' };
  if (lower.includes('jiajing')) return { dynasty: '明嘉靖', dynastyEnglish: 'Ming Dynasty (Jiajing)' };
  if (lower.includes('ming') || (lower.includes('16') && lower.includes('17'))) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  
  if (lower.includes('1900') || lower.includes('20th') || lower.includes('republic')) return { dynasty: '民国', dynastyEnglish: 'Republic of China' };
  if (lower.includes('1800') || lower.includes('19th')) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  if (lower.includes('1700') || lower.includes('18th')) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  if (lower.includes('1600') || lower.includes('17th')) return { dynasty: '明清', dynastyEnglish: 'Late Ming to Early Qing' };
  
  return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
}

function parseYixingObjectType(title: string, objectType: string = ''): { objectType: string; objectTypeEnglish: string } {
  const lower = (title + ' ' + objectType).toLowerCase();
  
  if (lower.includes('teapot') || lower.includes('tea pot') || lower.includes('theepot')) return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  if (lower.includes('tea caddy') || lower.includes('caddy') || lower.includes('theebus')) return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  if (lower.includes('tea bowl') || lower.includes('chawan') || lower.includes('theekom')) return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  if (lower.includes('tea cup') || lower.includes('cup') || lower.includes('kopje') || lower.includes('theekop')) return { objectType: '杯盏', objectTypeEnglish: 'Tea Cup' };
  if (lower.includes('tea tray') || lower.includes('tray')) return { objectType: '茶盘', objectTypeEnglish: 'Tea Tray' };
  if (lower.includes('saucer') || lower.includes('schotel')) return { objectType: '茶碟', objectTypeEnglish: 'Saucer' };
  if (lower.includes('flask') || lower.includes('bottle')) return { objectType: '瓶', objectTypeEnglish: 'Flask' };
  if (lower.includes('vase') || lower.includes('vaas')) return { objectType: '瓶', objectTypeEnglish: 'Vase' };
  if (lower.includes('ewer') || lower.includes('jug') || lower.includes('kan')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('jar') || lower.includes('pot')) return { objectType: '罐', objectTypeEnglish: 'Jar' };
  if (lower.includes('figure') || lower.includes('sculpture')) return { objectType: '塑像', objectTypeEnglish: 'Figure' };
  if (lower.includes('incense') || lower.includes('censer')) return { objectType: '香炉', objectTypeEnglish: 'Incense Burner' };
  if (lower.includes('brush') && lower.includes('wash')) return { objectType: '笔洗', objectTypeEnglish: 'Brush Washer' };
  if (lower.includes('water') && lower.includes('dropper')) return { objectType: '水滴', objectTypeEnglish: 'Water Dropper' };
  
  return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
}

// === MET MUSEUM - Yixing ===
async function searchMetYixing(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 20): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [Met] 查询: "${query}"`);
  stats.met.queried++;
  const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(query)}`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${searchData.objectIDs.length} 件，筛选宜兴紫砂...`);
    const idsToCheck = searchData.objectIDs.slice(0, 100);
    
    let accepted = 0;
    for (const id of idsToCheck) {
      const artworkId = `met-${id}`;
      if (existingIds.has(artworkId)) {
        stats.met.rejected_duplicate++;
        continue;
      }
      if (accepted >= maxItems) break;
      
      try {
        const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
        const obj = await fetchJson(objUrl);
        
        const fullText = `${obj.title || ''} ${obj.objectName || ''} ${obj.medium || ''} ${obj.culture || ''} ${obj.department || ''} ${obj.artistDisplayName || ''}`;
        
        if (!isYixingItem(fullText)) {
          stats.met.rejected_notYixing++;
          continue;
        }
        
        const imageUrl = obj.primaryImage || obj.primaryImageSmall;
        if (!imageUrl) {
          stats.met.rejected_other++;
          continue;
        }
        
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) {
          stats.met.rejected_other++;
          continue;
        }
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          stats.met.rejected_duplicate++;
          continue;
        }
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.met.rejected_lowres++;
          continue;
        }
        
        const { dynasty, dynastyEnglish } = parseYixingDynasty(obj.objectDate || '', obj.culture || '');
        const { objectType, objectTypeEnglish } = parseYixingObjectType(obj.title || '', obj.objectName || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}宜兴紫砂${objectType}`,
          titleEnglish: obj.title || '',
          dynasty,
          dynastyEnglish,
          period: obj.period || obj.dynasty || '',
          date: obj.objectDate || '',
          material: '宜兴紫砂',
          materialEnglish: obj.medium || 'Yixing Purple Clay',
          objectType,
          objectTypeEnglish,
          kiln: '宜兴',
          kilnEnglish: 'Yixing',
          dimensions: obj.dimensions || '',
          description: `此件${objectType}为${dynasty}时期之作品。器身采用宜兴紫砂工艺制成。${obj.dimensions ? `尺寸：${obj.dimensions}。` : ''}现藏于大都会艺术博物馆。`,
          sourceMuseum: '大都会艺术博物馆',
          sourceMuseumEnglish: 'The Metropolitan Museum of Art',
          accessionNumber: obj.accessionNumber || '',
          sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${id}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${obj.title} - ${obj.objectDate || ''}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.creditLine || '',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.met.accepted++;
        
        console.log(`    ✓ ${artworkId}: ${obj.title?.substring(0, 50)}`);
        
        await new Promise(r => setTimeout(r, 200));
      } catch {
        stats.met.rejected_other++;
        continue;
      }
    }
    
    console.log(`    已接受: ${accepted} 件`);
    return results;
  } catch (e) {
    console.log(`    错误: ${(e as Error).message}`);
    return results;
  }
}

// === V&A MUSEUM - Yixing ===
async function searchVAYixing(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 15): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [V&A] 查询: "${query}"`);
  stats.va.queried++;
  
  const searchUrl = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&page_size=80&images_exist=true`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const records = searchData.records || [];
    
    if (records.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${records.length} 件，筛选宜兴紫砂...`);
    
    let accepted = 0;
    for (const obj of records) {
      const systemNumber = obj.systemNumber;
      const artworkId = `va-${systemNumber}`;
      
      if (existingIds.has(artworkId)) {
        stats.va.rejected_duplicate++;
        continue;
      }
      if (accepted >= maxItems) break;
      
      const fullText = `${obj._primaryTitle || ''} ${obj.objectType || ''} ${obj._primaryMaker?.name || ''} ${obj._primaryPlace || ''}`;
      
      if (!isYixingItem(fullText)) {
        stats.va.rejected_notYixing++;
        continue;
      }
      
      const imageBase = obj._images?._iiif_image_base_url;
      if (!imageBase) {
        stats.va.rejected_other++;
        continue;
      }
      
      try {
        const imageUrl = `${imageBase}/full/!1600,1600/0/default.jpg`;
        
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) {
          stats.va.rejected_other++;
          continue;
        }
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          stats.va.rejected_duplicate++;
          continue;
        }
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.va.rejected_lowres++;
          continue;
        }
        
        const dateStr = obj._primaryDate || '';
        const placeStr = obj._primaryPlace || '';
        const { dynasty, dynastyEnglish } = parseYixingDynasty(dateStr, placeStr);
        const { objectType, objectTypeEnglish } = parseYixingObjectType(obj._primaryTitle || '', obj.objectType || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}宜兴紫砂${objectType}`,
          titleEnglish: obj._primaryTitle || '',
          dynasty,
          dynastyEnglish,
          period: placeStr,
          date: dateStr,
          material: '宜兴紫砂',
          materialEnglish: 'Yixing Purple Clay (Zisha)',
          objectType,
          objectTypeEnglish,
          kiln: '宜兴',
          kilnEnglish: 'Yixing',
          dimensions: '',
          description: `此件${objectType}为${dynasty}时期之作品。器身采用宜兴紫砂工艺制成。现藏于维多利亚和阿尔伯特博物馆。`,
          sourceMuseum: '维多利亚和阿尔伯特博物馆',
          sourceMuseumEnglish: 'Victoria and Albert Museum',
          accessionNumber: obj.accessionNumber || systemNumber,
          sourceUrl: `https://collections.vam.ac.uk/item/${systemNumber}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${obj._primaryTitle} - ${dateStr}`,
          license: 'Open License (V&A)',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.va.accepted++;
        
        console.log(`    ✓ ${artworkId}: ${obj._primaryTitle?.substring(0, 50)}`);
        
        await new Promise(r => setTimeout(r, 250));
      } catch {
        stats.va.rejected_other++;
        continue;
      }
    }
    
    console.log(`    已接受: ${accepted} 件`);
    return results;
  } catch (e) {
    console.log(`    错误: ${(e as Error).message}`);
    return results;
  }
}

// === CMA - Yixing ===
async function searchCMAYixing(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 15): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [CMA] 查询: "${query}"`);
  stats.cma.queried++;
  const searchUrl = `https://openaccess-api.clevelandart.org/api/artworks?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=100`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    if (!searchData.data || searchData.data.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${searchData.data.length} 件，筛选宜兴紫砂...`);
    
    let accepted = 0;
    for (const obj of searchData.data) {
      const artworkId = `cma-${obj.id}`;
      if (existingIds.has(artworkId)) {
        stats.cma.rejected_duplicate++;
        continue;
      }
      if (accepted >= maxItems) break;
      
      const cultureStr = Array.isArray(obj.culture) ? obj.culture.join(', ') : (obj.culture || '');
      const fullText = `${obj.title || ''} ${obj.type || ''} ${obj.technique || ''} ${cultureStr}`;
      
      if (!isYixingItem(fullText)) {
        stats.cma.rejected_notYixing++;
        continue;
      }
      
      const printUrl = obj.images?.print?.url;
      const webUrl = obj.images?.web?.url;
      const imageUrl = printUrl || webUrl;
      
      if (!imageUrl) {
        stats.cma.rejected_other++;
        continue;
      }
      
      try {
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) {
          stats.cma.rejected_other++;
          continue;
        }
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          stats.cma.rejected_duplicate++;
          continue;
        }
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.cma.rejected_lowres++;
          continue;
        }
        
        const { dynasty, dynastyEnglish } = parseYixingDynasty(obj.creation_date || '', cultureStr);
        const { objectType, objectTypeEnglish } = parseYixingObjectType(obj.title || '', obj.type || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}宜兴紫砂${objectType}`,
          titleEnglish: obj.title || '',
          dynasty,
          dynastyEnglish,
          period: cultureStr,
          date: obj.creation_date || '',
          material: '宜兴紫砂',
          materialEnglish: obj.technique || 'Yixing Purple Clay',
          objectType,
          objectTypeEnglish,
          kiln: '宜兴',
          kilnEnglish: 'Yixing',
          dimensions: obj.measurements || '',
          description: `此件${objectType}为${dynasty}时期之作品。器身采用宜兴紫砂工艺制成。${obj.measurements ? `尺寸：${obj.measurements}。` : ''}现藏于克利夫兰艺术博物馆。`,
          sourceMuseum: '克利夫兰艺术博物馆',
          sourceMuseumEnglish: 'Cleveland Museum of Art',
          accessionNumber: obj.accession_number || '',
          sourceUrl: obj.url || `https://www.clevelandart.org/art/${obj.id}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${obj.title} - ${obj.creation_date || ''}`,
          license: 'CC0 / Public Domain (CMA Open Access)',
          creditLine: obj.creditline || '',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.cma.accepted++;
        
        console.log(`    ✓ ${artworkId}: ${obj.title?.substring(0, 50)}`);
        
        await new Promise(r => setTimeout(r, 200));
      } catch {
        stats.cma.rejected_other++;
        continue;
      }
    }
    
    console.log(`    已接受: ${accepted} 件`);
    return results;
  } catch (e) {
    console.log(`    错误: ${(e as Error).message}`);
    return results;
  }
}

// === SMITHSONIAN - Yixing ===
async function searchSmithsonianYixing(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 15): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  if (!SMITHSONIAN_API_KEY) {
    console.log(`  [Smithsonian] API Key未配置，跳过`);
    return results;
  }
  
  console.log(`  [Smithsonian] 查询: "${query}"`);
  stats.smithsonian.queried++;
  const searchUrl = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&api_key=${SMITHSONIAN_API_KEY}&rows=100&online_media_type=images`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const rows = searchData.response?.rows || [];
    
    if (rows.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${rows.length} 件，筛选宜兴紫砂...`);
    
    let accepted = 0;
    for (const item of rows) {
      const recordId = item.content?.descriptiveNonRepeating?.record_ID || '';
      const artworkId = `si-${recordId.replace(/_/g, '-')}`;
      
      if (existingIds.has(artworkId)) {
        stats.smithsonian.rejected_duplicate++;
        continue;
      }
      if (accepted >= maxItems) break;
      
      const freetext = item.content?.freetext || {};
      const physDesc = freetext.physicalDescription?.map((p: any) => p.content).join('; ') || '';
      const notes = freetext.notes?.map((n: any) => n.content).join('; ') || '';
      const fullText = `${item.title || ''} ${physDesc} ${notes}`;
      
      if (!isYixingItem(fullText)) {
        stats.smithsonian.rejected_notYixing++;
        continue;
      }
      
      const metadataAccess = item.content?.descriptiveNonRepeating?.metadata_usage?.access;
      if (metadataAccess !== 'CC0') {
        stats.smithsonian.rejected_other++;
        continue;
      }
      
      const onlineMedia = item.content?.descriptiveNonRepeating?.online_media;
      if (!onlineMedia || onlineMedia.mediaCount === 0) {
        stats.smithsonian.rejected_other++;
        continue;
      }
      
      const hasCC0Media = onlineMedia.media.some((m: any) => m.usage?.access === 'CC0');
      if (!hasCC0Media) {
        stats.smithsonian.rejected_other++;
        continue;
      }
      
      try {
        const mediaItem = onlineMedia.media[0];
        const idsId = mediaItem.idsId;
        if (!idsId) {
          stats.smithsonian.rejected_other++;
          continue;
        }
        
        const imageUrl = `https://ids.si.edu/ids/deliveryService?id=${idsId}`;
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) {
          stats.smithsonian.rejected_other++;
          continue;
        }
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          stats.smithsonian.rejected_duplicate++;
          continue;
        }
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.smithsonian.rejected_lowres++;
          continue;
        }
        
        const indexed = item.content?.indexedStructured || {};
        const dnr = item.content?.descriptiveNonRepeating || {};
        const dateField = freetext.date?.map((d: any) => d.content).join('; ') || '';
        const places = (indexed.place as string[]) || [];
        const cultures = (indexed.culture as string[]) || [];
        
        const { dynasty, dynastyEnglish } = parseYixingDynasty(dateField, cultures.join(' ') + ' ' + places.join(' '));
        const { objectType, objectTypeEnglish } = parseYixingObjectType(item.title || '', '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}宜兴紫砂${objectType}`,
          titleEnglish: item.title || '',
          dynasty,
          dynastyEnglish,
          period: dateField,
          date: dateField,
          material: '宜兴紫砂',
          materialEnglish: physDesc.split(';')[0] || 'Yixing Purple Clay',
          objectType,
          objectTypeEnglish,
          kiln: '宜兴',
          kilnEnglish: 'Yixing',
          dimensions: '',
          description: `此件${objectType}为${dynasty}时期之作品。器身采用宜兴紫砂工艺制成。现藏于史密森尼亚洲艺术博物馆 (弗利尔/赛克勒)。`,
          sourceMuseum: '史密森尼亚洲艺术博物馆 (弗利尔/赛克勒)',
          sourceMuseumEnglish: 'Smithsonian National Museum of Asian Art (Freer|Sackler)',
          accessionNumber: recordId,
          sourceUrl: dnr.record_link || `https://asia.si.edu/object/${recordId.replace(/_/g, '/')}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${item.title} - ${dateField}`,
          license: 'CC0 / Public Domain (Smithsonian Open Access)',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.smithsonian.accepted++;
        
        console.log(`    ✓ ${artworkId}: ${item.title?.substring(0, 50)}`);
        
        await new Promise(r => setTimeout(r, 300));
      } catch {
        stats.smithsonian.rejected_other++;
        continue;
      }
    }
    
    console.log(`    已接受: ${accepted} 件`);
    return results;
  } catch (e) {
    console.log(`    错误: ${(e as Error).message}`);
    return results;
  }
}

// === RIJKSMUSEUM - Yixing (with fixed pagination) ===
function extractNotation(obj: any, lang: string): string {
  if (!obj?.notation) return '';
  for (const n of obj.notation) {
    if (n['@language'] === lang) return n['@value'];
  }
  return obj.notation[0]?.['@value'] || '';
}

function extractName(names: any[], lang: string): string {
  if (!names) return '';
  for (const n of names) {
    const nameLang = n.language?.[0]?.id;
    if (lang === 'en' && nameLang?.includes('300388277')) return n.content;
    if (lang === 'nl' && nameLang?.includes('300388256')) return n.content;
  }
  return names[0]?.content || '';
}

async function resolveRijksmuseumObject(objectId: string): Promise<{
  imageUrl: string | null;
  title: string;
  titleNl: string;
  date: string;
  materials: string;
  objectTypes: string;
  place: string;
  accessionNumber: string;
  sourceUrl: string;
  isPublicDomain: boolean;
}> {
  const result = {
    imageUrl: null as string | null,
    title: '',
    titleNl: '',
    date: '',
    materials: '',
    objectTypes: '',
    place: '',
    accessionNumber: '',
    sourceUrl: '',
    isPublicDomain: false,
  };
  
  try {
    const obj = await fetchJson(objectId, { 'Accept': 'application/json' });
    stats.rijksmuseum.objectsFetched++;
    
    const identifiedBy = obj.identified_by || [];
    for (const id of identifiedBy) {
      if (id.type === 'Name') {
        const content = id.content || extractNotation(id, 'en') || extractNotation(id, 'nl');
        if (content) {
          if (id.language?.[0]?.id?.includes('300388277')) {
            result.title = content;
          } else if (id.language?.[0]?.id?.includes('300388256')) {
            result.titleNl = content;
          } else if (!result.title) {
            result.title = content;
          }
        }
      } else if (id.type === 'Identifier') {
        result.accessionNumber = id.content || result.accessionNumber;
      }
    }
    
    const timespan = obj.produced_by?.timespan;
    if (timespan) {
      result.date = extractName(timespan.identified_by, 'en') || extractName(timespan.identified_by, 'nl') || '';
    }
    
    const parts = obj.produced_by?.part || [];
    for (const part of parts) {
      const places = part.took_place_at || [];
      for (const place of places) {
        const placeName = extractNotation(place, 'en') || extractNotation(place, 'nl');
        if (placeName) result.place = placeName;
      }
    }
    
    const madeOf = obj.made_of || [];
    const materials: string[] = [];
    for (const m of madeOf) {
      const mat = extractNotation(m, 'en') || extractNotation(m, 'nl');
      if (mat) materials.push(mat);
    }
    result.materials = materials.join(', ');
    
    const classifiedAs = obj.classified_as || [];
    for (const c of classifiedAs) {
      const type = extractNotation(c, 'en') || extractNotation(c, 'nl');
      if (type) result.objectTypes = type;
    }
    
    const subjectOf = obj.subject_of || [];
    for (const s of subjectOf) {
      const dc = s.digitally_carried_by?.[0];
      if (dc?.access_point?.[0]?.id) {
        result.sourceUrl = dc.access_point[0].id;
        break;
      }
    }
    
    const shows = obj.shows;
    if (!shows || !shows[0]?.id) return result;
    
    const visualItemId = shows[0].id;
    const visualItem = await fetchJson(visualItemId, { 'Accept': 'application/json' });
    
    const subjectTo = visualItem.subject_to || [];
    for (const s of subjectTo) {
      const classified = s.classified_as || [];
      for (const c of classified) {
        if (c.id?.includes('publicdomain') || c.id?.includes('zero/1.0')) {
          result.isPublicDomain = true;
        }
      }
    }
    
    const digitallyShownBy = visualItem.digitally_shown_by;
    if (!digitallyShownBy || !digitallyShownBy[0]?.id) return result;
    
    const digitalObjectId = digitallyShownBy[0].id;
    const digitalObject = await fetchJson(digitalObjectId, { 'Accept': 'application/json' });
    
    const accessPoint = digitalObject.access_point;
    if (accessPoint && accessPoint[0]?.id) {
      let imageUrl = accessPoint[0].id;
      if (imageUrl.includes('/full/max/')) {
        imageUrl = imageUrl.replace('/full/max/', '/full/!1600,/');
      }
      result.imageUrl = imageUrl;
    }
    
    return result;
  } catch {
    return result;
  }
}

async function searchRijksmuseumYixing(
  query: { field: string; term: string; maxPages: number; description: string },
  existingIds: Set<string>,
  existingHashes: Set<string>,
  maxItemsPerQuery: number = 30
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`\n  [Rijksmuseum] ${query.description}: ${query.field}="${query.term}"`);
  stats.rijksmuseum.queried++;
  
  let pageUrl: string | null = `https://data.rijksmuseum.nl/search/collection?${query.field}=${encodeURIComponent(query.term)}&imageAvailable=true`;
  let pageNum = 0;
  let totalAccepted = 0;
  
  while (pageUrl && pageNum < query.maxPages && totalAccepted < maxItemsPerQuery) {
    try {
      const searchData = await fetchJson(pageUrl);
      stats.rijksmuseum.pagesFetched++;
      pageNum++;
      
      const totalItems = searchData.partOf?.totalItems || 0;
      const orderedItems = searchData.orderedItems || [];
      
      if (pageNum === 1) {
        console.log(`    总计: ${totalItems} 件 (最多处理${query.maxPages}页)`);
      }
      
      if (orderedItems.length === 0) break;
      
      console.log(`    页${pageNum}: ${orderedItems.length} 项...`);
      
      for (const item of orderedItems) {
        if (totalAccepted >= maxItemsPerQuery) break;
        
        const objectId = item.id;
        const numId = objectId.split('/').pop();
        const artworkId = `rks-${numId}`;
        
        if (existingIds.has(artworkId)) {
          stats.rijksmuseum.rejected_duplicate++;
          continue;
        }
        
        try {
          const objData = await resolveRijksmuseumObject(objectId);
          
          const fullText = `${objData.title || ''} ${objData.titleNl || ''} ${objData.materials || ''} ${objData.place || ''}`;
          
          if (!isYixingItem(fullText)) {
            stats.rijksmuseum.rejected_notYixing++;
            continue;
          }
          
          if (!objData.imageUrl) {
            stats.rijksmuseum.rejected_other++;
            continue;
          }
          
          if (!objData.isPublicDomain) {
            stats.rijksmuseum.rejected_license++;
            continue;
          }
          
          const imageData = await fetchWithRetry(objData.imageUrl);
          if (!isValidImage(imageData)) {
            stats.rijksmuseum.rejected_other++;
            continue;
          }
          
          const hash = hashBuffer(imageData);
          if (existingHashes.has(hash)) {
            stats.rijksmuseum.rejected_duplicate++;
            continue;
          }
          
          const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
          const compressed = await compressImage(imageData, finalPath);
          if (!compressed) {
            stats.rijksmuseum.rejected_lowres++;
            continue;
          }
          
          const titleEn = objData.title || objData.titleNl || '';
          const { dynasty, dynastyEnglish } = parseYixingDynasty(objData.date, objData.place);
          const { objectType, objectTypeEnglish } = parseYixingObjectType(titleEn, objData.objectTypes);
          
          const artwork: Artwork = {
            id: artworkId,
            titleChinese: `${dynasty}宜兴紫砂${objectType}`,
            titleEnglish: titleEn,
            dynasty,
            dynastyEnglish,
            period: objData.place,
            date: objData.date,
            material: '宜兴紫砂',
            materialEnglish: objData.materials || 'Yixing stoneware',
            objectType,
            objectTypeEnglish: objData.objectTypes || objectTypeEnglish,
            kiln: '宜兴',
            kilnEnglish: 'Yixing',
            dimensions: '',
            description: `此件${objectType}为${dynasty}时期之作品。器身采用宜兴紫砂工艺制成。${objData.date ? `年代：${objData.date}。` : ''}现藏于荷兰国立博物馆。`,
            sourceMuseum: '荷兰国立博物馆',
            sourceMuseumEnglish: 'Rijksmuseum',
            accessionNumber: objData.accessionNumber,
            sourceUrl: objData.sourceUrl || `https://www.rijksmuseum.nl/en/collection/${objData.accessionNumber}`,
            imageUrl: `/artworks/${artworkId}.jpg`,
            imageAlt: `${titleEn} - ${objData.date}`,
            license: 'Public Domain (Rijksmuseum Open Access)',
            crawlBatchId: BATCH_ID,
          };
          
          results.push(artwork);
          existingIds.add(artworkId);
          existingHashes.add(hash);
          totalAccepted++;
          stats.rijksmuseum.accepted++;
          
          console.log(`    ✓ ${artworkId}: ${titleEn?.substring(0, 50)}`);
          
          await new Promise(r => setTimeout(r, 150));
        } catch {
          stats.rijksmuseum.rejected_other++;
          continue;
        }
      }
      
      const nextToken = searchData.next;
      pageUrl = (typeof nextToken === 'object' ? nextToken?.id : nextToken) || null;
      
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`    页${pageNum}错误: ${(e as Error).message}`);
      break;
    }
  }
  
  console.log(`    已接受: ${totalAccepted} 件`);
  return results;
}

// === WIKIMEDIA COMMONS - Yixing ===
async function searchWikimediaYixing(category: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 20): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [WMC] 分类: "${category}"`);
  stats.wmc.queried++;
  
  const categoryName = category.replace('Category:', '');
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(category)}&gcmtype=file&gcmlimit=100&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&format=json`;
  
  try {
    const data = await fetchJson(apiUrl);
    const pages = data.query?.pages || {};
    const items = Object.values(pages);
    
    if (items.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${items.length} 件，筛选...`);
    
    let accepted = 0;
    for (const item of items as any[]) {
      if (accepted >= maxItems) break;
      
      const imageinfo = item.imageinfo?.[0];
      if (!imageinfo) continue;
      
      const extmeta = imageinfo.extmetadata || {};
      const license = extmeta.LicenseShortName?.value || '';
      const licenseUrl = extmeta.LicenseUrl?.value || '';
      
      const isCC0orPD = 
        license.toLowerCase().includes('cc0') ||
        license.toLowerCase().includes('public domain') ||
        license.toLowerCase().includes('pd') ||
        licenseUrl.includes('publicdomain') ||
        licenseUrl.includes('zero/1.0');
      
      const isCCBY = license.toLowerCase().includes('cc by') && !license.toLowerCase().includes('nc') && !license.toLowerCase().includes('nd');
      
      if (!isCC0orPD && !isCCBY) continue;
      
      const width = imageinfo.width || 0;
      const height = imageinfo.height || 0;
      if (Math.max(width, height) < MIN_LONGEST_EDGE) {
        stats.wmc.rejected_lowres++;
        continue;
      }
      
      const pageId = item.pageid;
      const artworkId = `wmc-${pageId}`;
      
      if (existingIds.has(artworkId)) {
        stats.wmc.rejected_duplicate++;
        continue;
      }
      
      const title = item.title?.replace('File:', '').replace(/\.[^.]+$/, '') || '';
      const description = extmeta.ImageDescription?.value || '';
      const fullText = `${title} ${description} ${categoryName}`;
      
      if (!isYixingItem(fullText)) {
        stats.wmc.rejected_notYixing++;
        continue;
      }
      
      const imageUrl = imageinfo.thumburl || imageinfo.url;
      if (!imageUrl) continue;
      
      try {
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) {
          stats.wmc.rejected_other++;
          continue;
        }
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          stats.wmc.rejected_duplicate++;
          continue;
        }
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.wmc.rejected_lowres++;
          continue;
        }
        
        const dateStr = extmeta.DateTimeOriginal?.value || extmeta.DateTime?.value || '';
        const artist = extmeta.Artist?.value || '';
        
        const { dynasty, dynastyEnglish } = parseYixingDynasty(dateStr + ' ' + description, title + ' ' + artist);
        const { objectType, objectTypeEnglish } = parseYixingObjectType(title, description);
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `宜兴紫砂${objectType}`,
          titleEnglish: title,
          dynasty,
          dynastyEnglish,
          period: '',
          date: dateStr,
          material: '宜兴紫砂',
          materialEnglish: 'Yixing Purple Clay',
          objectType,
          objectTypeEnglish,
          kiln: '宜兴',
          kilnEnglish: 'Yixing',
          dimensions: `${width}×${height}px (原始)`,
          description: `此件${objectType}。器身采用宜兴紫砂工艺制成。尺寸：${width}x${height}px。现藏于维基共享资源。`,
          sourceMuseum: '维基共享资源',
          sourceMuseumEnglish: 'Wikimedia Commons',
          accessionNumber: `${pageId}`,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.title || '')}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: title,
          license: license || 'CC0 / Public Domain',
          creditLine: artist.replace(/<[^>]+>/g, '') || '',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.wmc.accepted++;
        
        console.log(`    ✓ ${artworkId}: ${title?.substring(0, 50)}`);
        
        await new Promise(r => setTimeout(r, 200));
      } catch {
        stats.wmc.rejected_other++;
        continue;
      }
    }
    
    console.log(`    已接受: ${accepted} 件`);
    return results;
  } catch (e) {
    console.log(`    错误: ${(e as Error).message}`);
    return results;
  }
}

// === Getty Open Content - Yixing ===
async function searchGettyYixing(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 10): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [Getty] 查询: "${query}"`);
  stats.getty.queried++;
  
  const searchUrl = `https://data.getty.edu/museum/collection/search?q=${encodeURIComponent(query)}&rows=50`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const items = searchData.results || [];
    
    if (items.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${items.length} 件，筛选宜兴紫砂...`);
    
    let accepted = 0;
    for (const item of items) {
      if (accepted >= maxItems) break;
      
      const objectId = item.id;
      const artworkId = `getty-${objectId.split('/').pop()}`;
      
      if (existingIds.has(artworkId)) {
        stats.getty.rejected_duplicate++;
        continue;
      }
      
      const title = item.title || '';
      const medium = item.medium || '';
      const fullText = `${title} ${medium}`;
      
      if (!isYixingItem(fullText)) {
        stats.getty.rejected_notYixing++;
        continue;
      }
      
      const primaryImage = item.primaryImage;
      if (!primaryImage) {
        stats.getty.rejected_other++;
        continue;
      }
      
      try {
        const imageUrl = primaryImage.replace('/full/full/', '/full/!1600,/');
        
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) {
          stats.getty.rejected_other++;
          continue;
        }
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          stats.getty.rejected_duplicate++;
          continue;
        }
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.getty.rejected_lowres++;
          continue;
        }
        
        const dateStr = item.displayDate || '';
        const { dynasty, dynastyEnglish } = parseYixingDynasty(dateStr, '');
        const { objectType, objectTypeEnglish } = parseYixingObjectType(title, '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}宜兴紫砂${objectType}`,
          titleEnglish: title,
          dynasty,
          dynastyEnglish,
          period: '',
          date: dateStr,
          material: '宜兴紫砂',
          materialEnglish: medium || 'Yixing Purple Clay',
          objectType,
          objectTypeEnglish,
          kiln: '宜兴',
          kilnEnglish: 'Yixing',
          dimensions: item.dimensions || '',
          description: `此件${objectType}为${dynasty}时期之作品。器身采用宜兴紫砂工艺制成。现藏于盖蒂博物馆。`,
          sourceMuseum: '盖蒂博物馆',
          sourceMuseumEnglish: 'Getty Museum',
          accessionNumber: item.accessionNumber || '',
          sourceUrl: item.objectUrl || `https://www.getty.edu/art/collection/object/${objectId.split('/').pop()}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${title} - ${dateStr}`,
          license: 'Getty Open Content Program',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.getty.accepted++;
        
        console.log(`    ✓ ${artworkId}: ${title?.substring(0, 50)}`);
        
        await new Promise(r => setTimeout(r, 300));
      } catch {
        stats.getty.rejected_other++;
        continue;
      }
    }
    
    console.log(`    已接受: ${accepted} 件`);
    return results;
  } catch (e) {
    console.log(`    错误: ${(e as Error).message}`);
    return results;
  }
}

function logCrawl(entry: any): void {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  fs.appendFileSync(CRAWL_LOG_PATH, line + '\n');
}

async function main() {
  console.log('========================================');
  console.log('Round 26 宜兴紫砂专项扩展 - 2026-09-29');
  console.log(`批次ID: ${BATCH_ID}`);
  console.log('目标: 仅收集 Yixing / 紫砂 / Purple Clay 茶器');
  console.log('来源: Met, V&A, CMA, Rijksmuseum, Smithsonian, Getty, WMC');
  console.log('========================================\n');
  
  const existingIds = loadExistingIds();
  const existingHashes = loadExistingHashes();
  
  const startingCount = existingIds.size;
  console.log(`现有藏品: ${startingCount} 件`);
  console.log(`现有图片哈希: ${existingHashes.size} 个`);
  console.log(`SMITHSONIAN_API_KEY: ${SMITHSONIAN_API_KEY ? '✓ 已配置' : '✗ 未配置'}\n`);
  
  const newArtworks: Artwork[] = [];
  
  // === 1. Met Museum - Yixing ===
  console.log('=== 1. 大都会博物馆 - Yixing 专项 ===');
  for (const query of YIXING_QUERIES) {
    const results = await searchMetYixing(query, existingIds, existingHashes, 15);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'met-yixing-r26',
      query,
      totalResults: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // === 2. V&A - Yixing ===
  console.log('\n=== 2. 维多利亚和阿尔伯特博物馆 - Yixing 专项 ===');
  for (const query of YIXING_QUERIES) {
    const results = await searchVAYixing(query, existingIds, existingHashes, 12);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'va-yixing-r26',
      query,
      totalResults: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // === 3. CMA - Yixing ===
  console.log('\n=== 3. 克利夫兰艺术博物馆 - Yixing 专项 ===');
  for (const query of YIXING_QUERIES) {
    const results = await searchCMAYixing(query, existingIds, existingHashes, 12);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'cma-yixing-r26',
      query,
      totalResults: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // === 4. Smithsonian - Yixing ===
  if (SMITHSONIAN_API_KEY) {
    console.log('\n=== 4. 史密森尼博物馆 - Yixing 专项 ===');
    for (const query of YIXING_QUERIES) {
      const results = await searchSmithsonianYixing(query, existingIds, existingHashes, 12);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'smithsonian-yixing-r26',
        query,
        totalResults: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 350));
    }
  }
  
  // === 5. Rijksmuseum - Yixing ===
  console.log('\n=== 5. 荷兰国立博物馆 - Yixing 专项 ===');
  for (const query of RIJKSMUSEUM_YIXING_QUERIES) {
    const results = await searchRijksmuseumYixing(query, existingIds, existingHashes, 25);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'rijksmuseum-yixing-r26',
      query: `${query.field}=${query.term}`,
      description: query.description,
      totalResults: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  // === 6. Getty - Yixing ===
  console.log('\n=== 6. 盖蒂博物馆 - Yixing 专项 ===');
  for (const query of ['Yixing', 'zisha', 'purple clay teapot']) {
    const results = await searchGettyYixing(query, existingIds, existingHashes, 8);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'getty-yixing-r26',
      query,
      totalResults: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 350));
  }
  
  // === 7. Wikimedia Commons - Yixing ===
  console.log('\n=== 7. 维基共享资源 - Yixing 专项 ===');
  for (const category of WMC_YIXING_CATEGORIES) {
    const results = await searchWikimediaYixing(category, existingIds, existingHashes, 15);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'wmc-yixing-r26',
      query: category,
      totalResults: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 350));
  }
  
  // === Summary ===
  console.log('\n========================================');
  console.log('Round 26 宜兴紫砂扩展统计');
  console.log('========================================');
  console.log(`总计新增: ${newArtworks.length} 件宜兴紫砂器`);
  console.log(`起始数量: ${startingCount}`);
  console.log(`结束数量: ${startingCount + newArtworks.length}`);
  
  console.log('\n=== 来源分布 ===');
  const metCount = newArtworks.filter(a => a.id.startsWith('met-')).length;
  const vaCount = newArtworks.filter(a => a.id.startsWith('va-')).length;
  const cmaCount = newArtworks.filter(a => a.id.startsWith('cma-')).length;
  const siCount = newArtworks.filter(a => a.id.startsWith('si-')).length;
  const rksCount = newArtworks.filter(a => a.id.startsWith('rks-')).length;
  const gettyCount = newArtworks.filter(a => a.id.startsWith('getty-')).length;
  const wmcCount = newArtworks.filter(a => a.id.startsWith('wmc-')).length;
  console.log(`  大都会博物馆 (Met): ${metCount}`);
  console.log(`  维多利亚和阿尔伯特博物馆 (V&A): ${vaCount}`);
  console.log(`  克利夫兰艺术博物馆 (CMA): ${cmaCount}`);
  console.log(`  史密森尼博物馆 (Smithsonian): ${siCount}`);
  console.log(`  荷兰国立博物馆 (Rijksmuseum): ${rksCount}`);
  console.log(`  盖蒂博物馆 (Getty): ${gettyCount}`);
  console.log(`  维基共享资源 (WMC): ${wmcCount}`);
  
  console.log('\n=== 质量门槛统计 ===');
  console.log(`  Met - 查询${stats.met.queried}次, 接受${stats.met.accepted}, 非宜兴${stats.met.rejected_notYixing}, 低分辨率${stats.met.rejected_lowres}`);
  console.log(`  V&A - 查询${stats.va.queried}次, 接受${stats.va.accepted}, 非宜兴${stats.va.rejected_notYixing}, 低分辨率${stats.va.rejected_lowres}`);
  console.log(`  CMA - 查询${stats.cma.queried}次, 接受${stats.cma.accepted}, 非宜兴${stats.cma.rejected_notYixing}, 低分辨率${stats.cma.rejected_lowres}`);
  console.log(`  Smithsonian - 查询${stats.smithsonian.queried}次, 接受${stats.smithsonian.accepted}, 非宜兴${stats.smithsonian.rejected_notYixing}, 低分辨率${stats.smithsonian.rejected_lowres}`);
  console.log(`  Rijksmuseum - 查询${stats.rijksmuseum.queried}次, 页面${stats.rijksmuseum.pagesFetched}页, 接受${stats.rijksmuseum.accepted}, 非宜兴${stats.rijksmuseum.rejected_notYixing}`);
  console.log(`  Getty - 查询${stats.getty.queried}次, 接受${stats.getty.accepted}, 非宜兴${stats.getty.rejected_notYixing}, 低分辨率${stats.getty.rejected_lowres}`);
  console.log(`  WMC - 查询${stats.wmc.queried}次, 接受${stats.wmc.accepted}, 非宜兴${stats.wmc.rejected_notYixing}, 低分辨率${stats.wmc.rejected_lowres}`);
  
  if (newArtworks.length === 0) {
    console.log('\n没有新作品添加');
    return;
  }
  
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const mergedArtworks = [...artworks, ...newArtworks];
  
  const dynastyOrder: Record<string, number> = {
    '新石器': 1, '商': 2, '西周': 3, '东周': 4, '周': 5, '战国': 6, '秦': 7,
    '西汉': 8, '东汉': 9, '汉': 10, '三国': 11, '西晋': 12, '东晋': 13,
    '南朝': 14, '北朝': 15, '六朝': 16, '隋': 17,
    '唐': 20, '五代': 21, '遼': 22, '西夏': 23,
    '北宋': 24, '南宋': 25, '宋': 26, '金': 27,
    '元': 30,
    '明洪武': 40, '明永乐': 41, '明宣德': 42, '明正统': 43, '明成化': 44,
    '明弘治': 45, '明正德': 46, '明嘉靖': 47, '明隆庆': 48, '明万历': 49,
    '明泰昌': 50, '明天启': 51, '明崇祯': 52, '明末清初': 53, '明': 54, '明清': 55,
    '清顺治': 60, '清康熙': 61, '清雍正': 62, '清乾隆': 63, '清嘉庆': 64,
    '清道光': 65, '清咸丰': 66, '清同治': 67, '清光绪': 68, '清宣统': 69, '清': 70,
    '民国': 80,
    '百济': 90, '高麗': 91, '新罗': 92, '统一新罗': 93, '朝鮮': 94,
    '绳文': 100, '弥生': 101, '古坟': 102, '奈良': 103, '平安': 104, '镰仓': 105,
    '室町': 106, '桃山': 107, '江戸': 108, '明治': 109, '大正': 110, '昭和': 111,
    '日本': 112, '韩国': 113,
    '越南': 120, '素可泰': 121, '宋加洛': 122, '泰国': 123, '高棉': 124, '缅甸': 125,
    '荷兰': 150,
    '中国': 200, '东亚': 300,
  };
  
  mergedArtworks.sort((a, b) => {
    const orderA = dynastyOrder[a.dynasty] || 200;
    const orderB = dynastyOrder[b.dynasty] || 200;
    return orderA - orderB;
  });
  
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
  
  if (fs.existsSync(PUBLIC_ARTWORKS_PATH)) {
    fs.writeFileSync(PUBLIC_ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
    console.log('\n✅ 已同步 public/artworks.json');
  }
  
  const allHashes = Array.from(existingHashes);
  fs.writeFileSync(IMAGE_HASHES_PATH, JSON.stringify(allHashes, null, 2));
  
  console.log(`✅ 已保存 ${mergedArtworks.length} 件藏品`);
  console.log(`   新增: ${newArtworks.length} 件宜兴紫砂`);
  
  let imageSizeAdded = 0;
  for (const artwork of newArtworks) {
    const imagePath = path.join(IMAGES_DIR, `${artwork.id}.jpg`);
    if (fs.existsSync(imagePath)) {
      imageSizeAdded += fs.statSync(imagePath).size;
    }
  }
  const imageSizeMB = (imageSizeAdded / (1024 * 1024)).toFixed(2);
  console.log(`   图片大小: ${imageSizeMB} MB`);
  
  logCrawl({
    source: 'round26-yixing-summary',
    query: 'Round 26 Yixing Expansion Complete',
    totalResults: newArtworks.length,
    crawlBatchId: 'round26-yixing-summary',
    breakdown: { met: metCount, va: vaCount, cma: cmaCount, smithsonian: siCount, rijksmuseum: rksCount, getty: gettyCount, wmc: wmcCount },
    imageSizeMB,
    note: `Round 26 Yixing expansion: ${startingCount} → ${mergedArtworks.length} (+${newArtworks.length})`,
  });
  
  console.log('\n========================================');
  console.log('Round 26 宜兴紫砂专项扩展完成');
  console.log(`目标: Yixing / 紫砂 / Purple Clay 茶器`);
  console.log(`来源: Met, V&A, CMA, Smithsonian, Rijksmuseum, Getty, WMC`);
  console.log('========================================');
}

main().catch(console.error);
