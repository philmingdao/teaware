/**
 * Round 9 Expansion Script - 2026-09-22
 * 
 * Target: Add ≥15 net-new quality pieces focusing on:
 * - Painted enamel teapots (Canton enamel)
 * - Powder blue teapots
 * - Stem cups (Ming/Qing)
 * - Hare's fur / Jian ware bowls
 * - Oil spot / copper red / peachbloom glazes
 * - Wucai/Doucai cups and bowls
 * - Japanese tetsubin, chashaku, tea ware
 * - Korean celadon tea bowls
 * - Satsuma, Kutani, Kyoto ware
 * - Cloisonné teapots
 * 
 * Key constraints:
 * - Key-free sources ONLY: Met, CMA, Wikimedia Commons (CC0/PD)
 * - No AIC hotlinks (Cloudflare 403)
 * - Compress images (max 1400px, q80)
 * - SHA256 dedupe against existing images
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

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
const BATCH_ID = `round9-expansion-${Date.now()}`;

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

function loadCompletedQueries(): Set<string> {
  const completed = new Set<string>();
  if (!fs.existsSync(CRAWL_LOG_PATH)) return completed;
  
  const lines = fs.readFileSync(CRAWL_LOG_PATH, 'utf-8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.source && entry.query) {
        completed.add(`${entry.source}:${entry.query}`);
      }
    } catch {}
  }
  return completed;
}

// === Fresh Met Queries (from user's probed list, NOT in crawl-log) ===
const MET_QUERIES = [
  // Enamel teapots
  'painted enamel teapot China',
  'Canton enamel teapot',
  
  // Powder blue
  'powder blue teapot',
  'powder blue bowl China',
  
  // Stem cups by dynasty
  'stem cup Ming',
  'stem cup Qing',
  
  // Covered bowls
  'covered bowl China porcelain',
  
  // Blue and white tea
  'blue and white tea bowl China',
  
  // Blanc de Chine / Dehua
  'Blanc de Chine cup',
  'blanc de chine teapot',
  'Dehua cup China',
  
  // Hare's fur / Jian ware
  "hare's fur bowl",
  'Jian tea bowl China',
  'oil spot bowl China',
  
  // Copper red / peachbloom / sang de boeuf
  'copper red bowl China',
  'underglaze red cup China',
  'peachbloom bowl China',
  'sang de boeuf bowl',
  
  // Wucai / Doucai
  'Wucai cup China',
  'Wucai bowl China',
  'Doucai cup China',
  'Doucai bowl China',
  
  // Special cups
  'libation cup China',
  'rhinoceros horn cup China',
  'chicken cup China',
  
  // Japanese tea utensils
  'tetsubin',
  'iron kettle Japan',
  'chashaku',
  
  // Japanese regional wares
  'Kyoto ware bowl',
  'Satsuma bowl Japan',
  'Kutani cup Japan',
  
  // Korean
  'tea bowl Korea celadon',
  
  // Cloisonné and tea service items
  'cloisonne teapot China',
  'sugar bowl China porcelain',
  'milk jug China porcelain',
];

// === Fresh CMA Queries ===
const CMA_QUERIES = [
  'powder blue',
  'Ding ware',
  'Imari',
  'stem cup',
  'Jian ware',
  'Shino',
  'Yaozhou',
  'famille verte',
  'Blanc de Chine',
  'Wucai',
  'Oribe',
  'Hagi',
  'Bizen',
  'libation cup',
  'oil spot',
  'tea dust',
  'Thai ceramic',
];

// === Fresh Wikimedia Commons Categories ===
const WIKI_CATEGORIES = [
  'Category:Powder_blue_glaze',
  "Category:Hare's_fur_glaze",
  'Category:Stem_cups',
  'Category:Chinese_cloisonné',
  'Category:Tetsubin',
  'Category:Chashaku',
  'Category:Satsuma_ware',
  'Category:Kutani_ware',
  'Category:Imari_ware',
  'Category:Chinese_enamelware',
  'Category:Rhinoceros_horn_cups',
  'Category:Tea_bowls_of_Japan',
  'Category:Chinese_export_porcelain_teaware',
];

function fetch(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://github.com/philmingdao/teaware; round9-expansion)',
        'Accept': 'application/json,image/*,*/*',
      },
      timeout: 120000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (location) {
          const absoluteUrl = location.startsWith('http') ? location : new URL(location, url).toString();
          fetch(absoluteUrl, retries).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode === 429 || res.statusCode === 503) {
        if (retries > 0) {
          console.log(`    [限流] 等待后重试... (剩余${retries}次)`);
          setTimeout(() => fetch(url, retries - 1).then(resolve).catch(reject), 8000);
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

async function fetchJson(url: string): Promise<any> {
  const data = await fetch(url);
  return JSON.parse(data.toString('utf-8'));
}

function isValidImage(buffer: Buffer): boolean {
  if (buffer.length < 5000) return false;
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  return isJpeg || isPng;
}

function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseDynasty(date: string, culture: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture).toLowerCase();
  
  if (lower.includes('edo')) return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
  if (lower.includes('muromachi')) return { dynasty: '室町', dynastyEnglish: 'Muromachi Period (Japan)' };
  if (lower.includes('momoyama')) return { dynasty: '桃山', dynastyEnglish: 'Momoyama Period (Japan)' };
  if (lower.includes('meiji')) return { dynasty: '明治', dynastyEnglish: 'Meiji Period (Japan)' };
  if (lower.includes('joseon') || lower.includes('choson')) return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)' };
  if (lower.includes('goryeo') || lower.includes('koryo')) return { dynasty: '高麗', dynastyEnglish: 'Goryeo Dynasty (Korea)' };
  if (lower.includes('vietnam') || lower.includes('annamese')) return { dynasty: '越南', dynastyEnglish: 'Vietnam' };
  if (lower.includes('tang') || lower.includes('618') || lower.includes('907')) return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty' };
  if (lower.includes('five dynasties') || lower.includes('ten kingdoms')) return { dynasty: '五代', dynastyEnglish: 'Five Dynasties' };
  if (lower.includes('northern song')) return { dynasty: '北宋', dynastyEnglish: 'Northern Song Dynasty' };
  if (lower.includes('southern song')) return { dynasty: '南宋', dynastyEnglish: 'Southern Song Dynasty' };
  if (lower.includes('song') || lower.includes('960') || lower.includes('1279')) return { dynasty: '宋', dynastyEnglish: 'Song Dynasty' };
  if (lower.includes('liao')) return { dynasty: '遼', dynastyEnglish: 'Liao Dynasty' };
  if (lower.includes('jin') && !lower.includes('qing')) return { dynasty: '金', dynastyEnglish: 'Jin Dynasty' };
  if (lower.includes('yuan') || lower.includes('1271') || lower.includes('1368')) return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty' };
  if (lower.includes('yongle')) return { dynasty: '明永乐', dynastyEnglish: 'Ming Dynasty (Yongle)' };
  if (lower.includes('xuande')) return { dynasty: '明宣德', dynastyEnglish: 'Ming Dynasty (Xuande)' };
  if (lower.includes('chenghua')) return { dynasty: '明成化', dynastyEnglish: 'Ming Dynasty (Chenghua)' };
  if (lower.includes('jiajing')) return { dynasty: '明嘉靖', dynastyEnglish: 'Ming Dynasty (Jiajing)' };
  if (lower.includes('wanli')) return { dynasty: '明万历', dynastyEnglish: 'Ming Dynasty (Wanli)' };
  if (lower.includes('ming') || lower.includes('1368') || lower.includes('1644')) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  if (lower.includes('kangxi')) return { dynasty: '清康熙', dynastyEnglish: 'Qing Dynasty (Kangxi)' };
  if (lower.includes('yongzheng')) return { dynasty: '清雍正', dynastyEnglish: 'Qing Dynasty (Yongzheng)' };
  if (lower.includes('qianlong')) return { dynasty: '清乾隆', dynastyEnglish: 'Qing Dynasty (Qianlong)' };
  if (lower.includes('jiaqing')) return { dynasty: '清嘉庆', dynastyEnglish: 'Qing Dynasty (Jiaqing)' };
  if (lower.includes('daoguang')) return { dynasty: '清道光', dynastyEnglish: 'Qing Dynasty (Daoguang)' };
  if (lower.includes('guangxu')) return { dynasty: '清光绪', dynastyEnglish: 'Qing Dynasty (Guangxu)' };
  if (lower.includes('qing') || lower.includes('1644') || lower.includes('1911')) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  if (lower.includes('republic') || lower.includes('民国')) return { dynasty: '民国', dynastyEnglish: 'Republic of China' };
  if (lower.includes('china') || lower.includes('chinese')) return { dynasty: '中国', dynastyEnglish: 'China' };
  if (lower.includes('japan')) return { dynasty: '日本', dynastyEnglish: 'Japan' };
  if (lower.includes('korea')) return { dynasty: '韩国', dynastyEnglish: 'Korea' };
  return { dynasty: '东亚', dynastyEnglish: 'East Asia' };
}

function parseMaterial(medium: string): { material: string; materialEnglish: string } {
  const lower = medium.toLowerCase();
  if (lower.includes('famille verte')) return { material: '五彩瓷', materialEnglish: 'Famille Verte Porcelain' };
  if (lower.includes('famille rose')) return { material: '粉彩瓷', materialEnglish: 'Famille Rose Porcelain' };
  if (lower.includes('doucai')) return { material: '斗彩瓷', materialEnglish: 'Doucai Porcelain' };
  if (lower.includes('wucai')) return { material: '五彩瓷', materialEnglish: 'Wucai Porcelain' };
  if (lower.includes('blue and white') || lower.includes('blue-and-white')) return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  if (lower.includes('celadon')) return { material: '青瓷', materialEnglish: 'Celadon' };
  if (lower.includes('blanc de chine') || lower.includes('dehua')) return { material: '德化白瓷', materialEnglish: 'Blanc de Chine (Dehua)' };
  if (lower.includes('yixing') || lower.includes('zisha')) return { material: '宜兴紫砂', materialEnglish: 'Yixing Zisha' };
  if (lower.includes('jun') || lower.includes('chün')) return { material: '钧瓷', materialEnglish: 'Jun Ware' };
  if (lower.includes('ding')) return { material: '定瓷', materialEnglish: 'Ding Ware' };
  if (lower.includes('ge') && lower.includes('ware')) return { material: '哥窑', materialEnglish: 'Ge Ware' };
  if (lower.includes('ru') && lower.includes('ware')) return { material: '汝窑', materialEnglish: 'Ru Ware' };
  if (lower.includes('guan')) return { material: '官窑', materialEnglish: 'Guan Ware' };
  if (lower.includes('longquan')) return { material: '龙泉青瓷', materialEnglish: 'Longquan Celadon' };
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes("hare's fur") || lower.includes('oil spot')) return { material: '建盏', materialEnglish: 'Jian Ware' };
  if (lower.includes('qingbai')) return { material: '青白瓷', materialEnglish: 'Qingbai Ware' };
  if (lower.includes('lacquer')) return { material: '漆器', materialEnglish: 'Lacquerware' };
  if (lower.includes('sancai')) return { material: '三彩', materialEnglish: 'Sancai' };
  if (lower.includes('copper red') || lower.includes('sang de boeuf') || lower.includes('ox blood') || lower.includes('peachbloom')) return { material: '釉里红/郎窑红', materialEnglish: 'Copper Red Glaze' };
  if (lower.includes('flambe') || lower.includes('flambé')) return { material: '窑变釉', materialEnglish: 'Flambé Glaze' };
  if (lower.includes('powder blue')) return { material: '洒蓝釉', materialEnglish: 'Powder Blue Glaze' };
  if (lower.includes('cloisonne') || lower.includes('cloisonné') || lower.includes('enamel')) return { material: '珐琅/景泰蓝', materialEnglish: 'Cloisonné/Enamel' };
  if (lower.includes('iron')) return { material: '铁器', materialEnglish: 'Iron' };
  if (lower.includes('satsuma')) return { material: '萨摩烧', materialEnglish: 'Satsuma Ware' };
  if (lower.includes('kutani')) return { material: '九谷烧', materialEnglish: 'Kutani Ware' };
  if (lower.includes('imari')) return { material: '伊万里烧', materialEnglish: 'Imari Ware' };
  if (lower.includes('rhinoceros') || lower.includes('horn')) return { material: '犀角', materialEnglish: 'Rhinoceros Horn' };
  if (lower.includes('porcelain') || lower.includes('ceramic')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  if (lower.includes('stoneware')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('earthenware')) return { material: '陶器', materialEnglish: 'Earthenware' };
  if (lower.includes('bamboo')) return { material: '竹', materialEnglish: 'Bamboo' };
  return { material: '瓷器', materialEnglish: 'Ceramics' };
}

function parseObjectType(title: string, objectName: string): { objectType: string; objectTypeEnglish: string } {
  const lower = (title + ' ' + objectName).toLowerCase();
  if (lower.includes('teapot') || lower.includes('tea pot')) return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  if (lower.includes('tetsubin') || lower.includes('iron kettle')) return { objectType: '铁壶', objectTypeEnglish: 'Tetsubin' };
  if (lower.includes('tea caddy') || lower.includes('tea canister') || lower.includes('tea jar')) return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  if (lower.includes('gaiwan') || lower.includes('covered tea')) return { objectType: '盖碗', objectTypeEnglish: 'Gaiwan' };
  if (lower.includes('chawan') || lower.includes('tea bowl')) return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  if (lower.includes('chashaku') || lower.includes('tea scoop')) return { objectType: '茶杓', objectTypeEnglish: 'Chashaku' };
  if (lower.includes('tea tray')) return { objectType: '茶盘', objectTypeEnglish: 'Tea Tray' };
  if (lower.includes('cup stand')) return { objectType: '盏托', objectTypeEnglish: 'Cup Stand' };
  if (lower.includes('stem cup')) return { objectType: '高足杯', objectTypeEnglish: 'Stem Cup' };
  if (lower.includes('libation cup')) return { objectType: '爵杯', objectTypeEnglish: 'Libation Cup' };
  if (lower.includes('wine cup')) return { objectType: '酒杯', objectTypeEnglish: 'Wine Cup' };
  if (lower.includes('cup')) return { objectType: '杯盏', objectTypeEnglish: 'Cup' };
  if (lower.includes('ewer')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('bowl')) return { objectType: '碗', objectTypeEnglish: 'Bowl' };
  if (lower.includes('saucer')) return { objectType: '碟', objectTypeEnglish: 'Saucer' };
  if (lower.includes('sugar')) return { objectType: '糖碗', objectTypeEnglish: 'Sugar Bowl' };
  if (lower.includes('milk') || lower.includes('jug') || lower.includes('creamer')) return { objectType: '奶壶', objectTypeEnglish: 'Milk Jug' };
  return { objectType: '茶器', objectTypeEnglish: 'Tea Ware' };
}

async function compressImage(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    execSync(`convert "${inputPath}" -resize "1400x1400>" -strip -quality 80 -sampling-factor 4:2:0 -interlace JPEG "${outputPath}"`, {
      stdio: 'pipe'
    });
    return true;
  } catch (e) {
    return false;
  }
}

// === Met Museum API ===
async function searchMet(query: string, existingIds: Set<string>, existingHashes: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [Met] 查询: "${query}"`);
  const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(query)}`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${searchData.objectIDs.length} 件，筛选中...`);
    const idsToCheck = searchData.objectIDs.slice(0, 80);
    
    let accepted = 0;
    for (const id of idsToCheck) {
      const artworkId = `met-${id}`;
      if (existingIds.has(artworkId)) continue;
      
      try {
        const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
        const obj = await fetchJson(objUrl);
        
        // Check relevance - must be tea/cup/bowl/ceramic related
        const searchText = `${obj.title} ${obj.objectName} ${obj.medium} ${obj.culture} ${obj.department}`.toLowerCase();
        const isRelevant = 
          searchText.includes('tea') ||
          searchText.includes('cup') ||
          searchText.includes('bowl') ||
          searchText.includes('saucer') ||
          searchText.includes('teapot') ||
          searchText.includes('ewer') ||
          searchText.includes('caddy') ||
          searchText.includes('ceramics') ||
          searchText.includes('porcelain') ||
          searchText.includes('enamel') ||
          searchText.includes('cloisonne') ||
          searchText.includes('tetsubin') ||
          searchText.includes('kettle') ||
          searchText.includes('chashaku') ||
          searchText.includes('libation') ||
          searchText.includes('stem cup') ||
          searchText.includes('rhinoceros');
        
        if (!isRelevant) continue;
        
        // Check for valid image
        const imageUrl = obj.primaryImage || obj.primaryImageSmall;
        if (!imageUrl) continue;
        
        // Download and validate image
        const imageData = await fetch(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        // Check hash for duplicate
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        // Save temporarily and compress
        const tempPath = path.join('/tmp', `${artworkId}-temp.jpg`);
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        
        fs.writeFileSync(tempPath, imageData);
        
        const compressed = await compressImage(tempPath, finalPath);
        if (!compressed) {
          fs.unlinkSync(tempPath);
          continue;
        }
        fs.unlinkSync(tempPath);
        
        // Parse metadata
        const { dynasty, dynastyEnglish } = parseDynasty(obj.objectDate || '', obj.culture || '');
        const { material, materialEnglish } = parseMaterial(obj.medium || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.objectName || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: obj.title || '',
          dynasty,
          dynastyEnglish,
          period: obj.period || obj.dynasty || '',
          date: obj.objectDate || '',
          material,
          materialEnglish: obj.medium || '',
          objectType,
          objectTypeEnglish,
          dimensions: obj.dimensions || '',
          description: `此件${objectType}为${dynasty}时期之作品。${obj.dimensions ? `尺寸：${obj.dimensions}。` : ''}现藏于大都会艺术博物馆。`,
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
        console.log(`    + ${artworkId}: ${obj.title?.substring(0, 50)}`);
        
        if (accepted >= 12) break;
        
        await new Promise(r => setTimeout(r, 350));
      } catch (e) {
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

// === Cleveland Museum of Art API ===
async function searchCMA(query: string, existingIds: Set<string>, existingHashes: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [CMA] 查询: "${query}"`);
  const searchUrl = `https://openaccess-api.clevelandart.org/api/artworks?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=50`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    if (!searchData.data || searchData.data.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${searchData.data.length} 件，筛选中...`);
    
    let accepted = 0;
    for (const obj of searchData.data) {
      const artworkId = `cma-${obj.id}`;
      if (existingIds.has(artworkId)) continue;
      
      // Check for relevant object
      const searchText = `${obj.title} ${obj.type} ${obj.technique} ${obj.culture}`.toLowerCase();
      const isRelevant = 
        searchText.includes('tea') ||
        searchText.includes('cup') ||
        searchText.includes('bowl') ||
        searchText.includes('saucer') ||
        searchText.includes('teapot') ||
        searchText.includes('ewer') ||
        searchText.includes('caddy') ||
        searchText.includes('ceramics') ||
        searchText.includes('porcelain') ||
        searchText.includes('enamel') ||
        searchText.includes('china') ||
        searchText.includes('chinese') ||
        searchText.includes('japan') ||
        searchText.includes('korea') ||
        searchText.includes('vietnam') ||
        searchText.includes('asian') ||
        searchText.includes('stem cup') ||
        searchText.includes('libation');
      
      if (!isRelevant) continue;
      
      // Check for valid image
      const imageUrl = obj.images?.web?.url;
      if (!imageUrl) continue;
      
      try {
        const imageData = await fetch(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        // Check hash for duplicate
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        // Save and compress
        const tempPath = path.join('/tmp', `${artworkId}-temp.jpg`);
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        
        fs.writeFileSync(tempPath, imageData);
        
        const compressed = await compressImage(tempPath, finalPath);
        if (!compressed) {
          fs.unlinkSync(tempPath);
          continue;
        }
        fs.unlinkSync(tempPath);
        
        // Parse metadata
        const cultureStr = Array.isArray(obj.culture) ? obj.culture.join(', ') : (obj.culture || '');
        const { dynasty, dynastyEnglish } = parseDynasty(obj.creation_date || '', cultureStr);
        const { material, materialEnglish } = parseMaterial(obj.technique || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.type || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: obj.title || '',
          dynasty,
          dynastyEnglish,
          period: cultureStr,
          date: obj.creation_date || '',
          material,
          materialEnglish: obj.technique || '',
          objectType,
          objectTypeEnglish,
          dimensions: obj.measurements || '',
          description: `此件${objectType}为${dynasty}时期之作品。${obj.measurements ? `尺寸：${obj.measurements}。` : ''}现藏于克利夫兰艺术博物馆。`,
          sourceMuseum: '克利夫兰艺术博物馆',
          sourceMuseumEnglish: 'Cleveland Museum of Art',
          accessionNumber: obj.accession_number || '',
          sourceUrl: obj.url || `https://www.clevelandart.org/art/${obj.id}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${obj.title} - ${obj.creation_date || ''}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.creditline || '',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        console.log(`    + ${artworkId}: ${obj.title?.substring(0, 50)}`);
        
        if (accepted >= 10) break;
        
        await new Promise(r => setTimeout(r, 250));
      } catch (e) {
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

// === Wikimedia Commons API ===
async function searchWikimedia(category: string, existingIds: Set<string>, existingHashes: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [Wiki] 类别: "${category}"`);
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtype=file&cmtitle=${encodeURIComponent(category)}&cmlimit=50&format=json`;
  
  try {
    const data = await fetchJson(apiUrl);
    if (!data.query?.categorymembers || data.query.categorymembers.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    const files = data.query.categorymembers;
    console.log(`    找到: ${files.length} 个文件，筛选中...`);
    
    let accepted = 0;
    for (const file of files) {
      const pageId = file.pageid;
      const artworkId = `wiki-${pageId}`;
      if (existingIds.has(artworkId)) continue;
      
      // Only process jpg/jpeg/png files
      const fileName = file.title || '';
      if (!fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/)) continue;
      
      try {
        // Get file info including URL and license
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&pageids=${pageId}&prop=imageinfo&iiprop=url|extmetadata&format=json`;
        const infoData = await fetchJson(infoUrl);
        const page = infoData.query?.pages?.[pageId];
        const imageInfo = page?.imageinfo?.[0];
        
        if (!imageInfo?.url) continue;
        
        // Check license - ONLY CC0 or Public Domain
        const license = imageInfo.extmetadata?.LicenseShortName?.value || '';
        const isFreeLicense = license.toLowerCase().includes('cc0') || 
                             license.toLowerCase().includes('public domain') ||
                             license.toLowerCase().includes('pd');
        if (!isFreeLicense) continue;
        
        // Download and validate image
        const imageData = await fetch(imageInfo.url);
        if (!isValidImage(imageData)) continue;
        
        // Check hash for duplicate
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        // Save and compress
        const tempPath = path.join('/tmp', `${artworkId}-temp.jpg`);
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        
        fs.writeFileSync(tempPath, imageData);
        
        const compressed = await compressImage(tempPath, finalPath);
        if (!compressed) {
          fs.unlinkSync(tempPath);
          continue;
        }
        fs.unlinkSync(tempPath);
        
        // Extract metadata
        const meta = imageInfo.extmetadata || {};
        const title = meta.ObjectName?.value || fileName.replace(/^File:/, '').replace(/\.[^.]+$/, '');
        const date = meta.DateTimeOriginal?.value || meta.DateTime?.value || '';
        const description = meta.ImageDescription?.value || '';
        
        // Parse metadata
        const { dynasty, dynastyEnglish } = parseDynasty(date + ' ' + title + ' ' + description, description);
        const { material, materialEnglish } = parseMaterial(title + ' ' + description);
        const { objectType, objectTypeEnglish } = parseObjectType(title, '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: title,
          dynasty,
          dynastyEnglish,
          period: '',
          date: date,
          material,
          materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: '',
          description: `此件${objectType}${dynasty !== '东亚' ? `为${dynasty}时期之作品` : ''}。来源：维基共享资源。`,
          sourceMuseum: '维基共享资源',
          sourceMuseumEnglish: 'Wikimedia Commons',
          accessionNumber: '',
          sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replace('File:', ''))}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: title,
          license: license || 'Public Domain',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        console.log(`    + ${artworkId}: ${title.substring(0, 50)}`);
        
        if (accepted >= 8) break;
        
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
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
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  fs.appendFileSync(CRAWL_LOG_PATH, line + '\n');
}

async function main() {
  console.log('====================================');
  console.log('Round 9 茶器收藏扩展 - 2026-09-22');
  console.log(`批次ID: ${BATCH_ID}`);
  console.log('====================================\n');
  
  const existingIds = loadExistingIds();
  const existingHashes = loadExistingHashes();
  const completedQueries = loadCompletedQueries();
  
  const startingCount = existingIds.size;
  console.log(`现有藏品: ${startingCount} 件`);
  console.log(`已完成查询: ${completedQueries.size} 个\n`);
  
  const newArtworks: Artwork[] = [];
  
  // Run Met queries
  console.log('=== 大都会博物馆查询 ===');
  for (const query of MET_QUERIES) {
    if (completedQueries.has(`met:${query}`)) {
      console.log(`  [跳过] met:${query} (已完成)`);
      continue;
    }
    
    const results = await searchMet(query, existingIds, existingHashes);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'met',
      query,
      totalResults: results.length,
      idsAccepted: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 600));
    
    if (newArtworks.length >= 40) break;
  }
  
  // Run CMA queries
  if (newArtworks.length < 40) {
    console.log('\n=== 克利夫兰艺术博物馆查询 ===');
    for (const query of CMA_QUERIES) {
      if (completedQueries.has(`cma:${query}`)) {
        console.log(`  [跳过] cma:${query} (已完成)`);
        continue;
      }
      
      const results = await searchCMA(query, existingIds, existingHashes);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'cma',
        query,
        totalResults: results.length,
        idsAccepted: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      if (newArtworks.length >= 40) break;
    }
  }
  
  // Run Wikimedia queries
  if (newArtworks.length < 40) {
    console.log('\n=== 维基共享资源查询 ===');
    for (const category of WIKI_CATEGORIES) {
      if (completedQueries.has(`wikimedia:${category}`)) {
        console.log(`  [跳过] wikimedia:${category} (已完成)`);
        continue;
      }
      
      const results = await searchWikimedia(category, existingIds, existingHashes);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'wikimedia',
        query: category,
        totalResults: results.length,
        idsAccepted: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 400));
      
      if (newArtworks.length >= 40) break;
    }
  }
  
  console.log('\n====================================');
  console.log(`总计新增: ${newArtworks.length} 件`);
  console.log(`起始数量: ${startingCount}`);
  console.log(`结束数量: ${startingCount + newArtworks.length}`);
  console.log('====================================\n');
  
  if (newArtworks.length < 10) {
    console.log('⚠️  新增数量不足 10 件，不创建 PR');
    console.log('已更新 crawl-log.jsonl');
    return;
  }
  
  // Load existing artworks and merge
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const mergedArtworks = [...artworks, ...newArtworks];
  
  // Sort by dynasty (chronological)
  const dynastyOrder: Record<string, number> = {
    '唐': 1, '五代': 2, '北宋': 3, '南宋': 4, '宋': 5, '遼': 6, '金': 7,
    '元': 8, '明': 9, '明永乐': 10, '明宣德': 11, '明成化': 12, '明嘉靖': 13, '明万历': 14,
    '清': 15, '清康熙': 16, '清雍正': 17, '清乾隆': 18, '清嘉庆': 19, '清道光': 20, '清光绪': 21,
    '民国': 22, '高麗': 30, '朝鮮': 31, '室町': 40, '桃山': 41, '江戸': 42, '明治': 43,
    '日本': 44, '韩国': 45, '越南': 50, '中国': 60, '东亚': 100,
  };
  
  mergedArtworks.sort((a, b) => {
    const orderA = dynastyOrder[a.dynasty] || 100;
    const orderB = dynastyOrder[b.dynasty] || 100;
    return orderA - orderB;
  });
  
  // Save updated artworks
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
  
  // Check if public/artworks.json exists and sync it
  if (fs.existsSync(PUBLIC_ARTWORKS_PATH)) {
    fs.writeFileSync(PUBLIC_ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
    console.log('✅ 已同步 public/artworks.json');
  }
  
  // Save image hashes
  const allHashes = Array.from(existingHashes);
  fs.writeFileSync(IMAGE_HASHES_PATH, JSON.stringify(allHashes, null, 2));
  
  console.log(`✅ 已保存 ${mergedArtworks.length} 件藏品`);
  console.log(`   新增: ${newArtworks.length} 件`);
  
  // Print summary by source
  const metCount = newArtworks.filter(a => a.id.startsWith('met-')).length;
  const cmaCount = newArtworks.filter(a => a.id.startsWith('cma-')).length;
  const wikiCount = newArtworks.filter(a => a.id.startsWith('wiki-')).length;
  
  console.log('\n=== 来源分布 ===');
  console.log(`  Met Museum: ${metCount}`);
  console.log(`  Cleveland Museum: ${cmaCount}`);
  console.log(`  Wikimedia: ${wikiCount}`);
}

main().catch(console.error);
