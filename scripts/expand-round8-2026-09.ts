/**
 * Round 8 Expansion Script - 2026-09
 * 
 * Target: Add ≥15 net-new quality pieces focusing on:
 * - Famille verte teapots/cups (Met/CMA)
 * - Blanc de Chine (Dehua) pieces
 * - Wucai/Doucai pieces
 * - Kangxi/Yongzheng/Qianlong teapots
 * - Tea trays and lacquer tea caddies
 * - Vietnamese ceramics tea-related
 * - Wikimedia Commons fresh categories
 * 
 * Key constraints:
 * - No API keys required
 * - No AIC hotlinks
 * - Compress images (max 1400px, q80) before commit
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
const IMAGES_DIR = path.join(ROOT, 'public', 'artworks');
const BATCH_ID = `round8-expansion-${Date.now()}`;

// Load existing artwork IDs for deduplication
function loadExistingIds(): Set<string> {
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  return new Set(artworks.map(a => a.id));
}

// Load existing image hashes for dedupe
function loadExistingHashes(): Set<string> {
  const hashFile = path.join(ROOT, 'research', 'image-hashes.json');
  if (fs.existsSync(hashFile)) {
    return new Set(JSON.parse(fs.readFileSync(hashFile, 'utf-8')));
  }
  return new Set();
}

// Check crawl log for completed queries
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

// === Fresh Met Queries (NOT in crawl-log) ===
const MET_QUERIES = [
  // Famille verte - fresh
  'famille verte teapot',
  'famille verte cup',
  'famille verte bowl',
  
  // Wucai - fresh
  'wucai cup China',
  'wucai bowl China',
  'wucai teapot',
  'wucai porcelain',
  
  // Kangxi/Yongzheng/Qianlong teapots - fresh
  'Kangxi teapot',
  'Yongzheng teapot',
  'Qianlong teapot',
  
  // Tea tray - fresh
  'tea tray China',
  'tea tray porcelain',
  
  // Lacquer tea caddy - fresh
  'lacquer tea caddy',
  'lacquer tea caddy Japan',
  'lacquer tea caddy China',
  
  // Sancai - fresh
  'sancai cup',
  'sancai bowl',
  'sancai teapot',
  
  // Other fresh queries
  'Zhangzhou porcelain bowl',
  'Swatow ware bowl',
  'kraak porcelain cup',
  'copper red bowl China',
  'copper red cup China',
  'celadon teapot China',
  'eggshell porcelain cup',
  'iron rust glaze bowl',
  'flambe glaze bowl',
  'Jun ware cup',
  'peach bloom cup',
  'peach bloom bowl',
  'ox blood glaze bowl',
  'sang de boeuf bowl',
  'monochrome glaze cup',
  'monochrome bowl China',
  'blanc de chine teapot',
  'blanc de chine cup',
  'Dehua white porcelain',
];

// === Fresh CMA Queries ===
const CMA_QUERIES = [
  'famille verte',
  'wucai',
  'wucai porcelain',
  'cup stand',
  'cup stand Chinese',
  'Vietnamese tea',
  'Vietnamese porcelain bowl',
  'Vietnamese cup',
  'blanc de Chine',
  'Dehua white',
  'Kangxi bowl',
  'Yongzheng bowl',
  'Qianlong bowl',
  'sancai',
  'copper red',
  'flambe',
  'monochrome glaze',
  'tea tray',
  'lacquer tea',
];

// === Wikimedia Commons Fresh Categories ===
const WIKI_CATEGORIES = [
  'Category:Famille_verte_porcelain',
  'Category:Famille_rose_porcelain',
  'Category:Doucai_porcelain',
  'Category:Wucai',
  'Category:Blue_and_white_porcelain_from_China',
  'Category:Chinese_lacquerware',
  'Category:Tea_caddies_in_museums',
  'Category:Chinese_porcelain_in_the_Walters_Art_Museum',
  'Category:Chinese_ceramics_in_the_Freer_Gallery_of_Art',
  'Category:Tea_in_Asian_art',
  'Category:Blanc_de_Chine',
  'Category:Dehua_ware',
  'Category:Vietnamese_ceramics',
  'Category:Vietnamese_porcelain',
  'Category:Copper_red_glaze',
];

// === Helper Functions ===

function fetch(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://github.com/philmingdao/teaware; round8-expansion)',
        'Accept': 'application/json,image/*,*/*',
      },
      timeout: 90000,
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
          setTimeout(() => fetch(url, retries - 1).then(resolve).catch(reject), 5000);
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
  if (lower.includes('jian')) return { material: '建盏', materialEnglish: 'Jian Ware' };
  if (lower.includes('qingbai')) return { material: '青白瓷', materialEnglish: 'Qingbai Ware' };
  if (lower.includes('lacquer')) return { material: '漆器', materialEnglish: 'Lacquerware' };
  if (lower.includes('sancai')) return { material: '三彩', materialEnglish: 'Sancai' };
  if (lower.includes('copper red') || lower.includes('sang de boeuf') || lower.includes('ox blood')) return { material: '釉里红/郎窑红', materialEnglish: 'Copper Red Glaze' };
  if (lower.includes('flambe') || lower.includes('flambé')) return { material: '窑变釉', materialEnglish: 'Flambé Glaze' };
  if (lower.includes('porcelain') || lower.includes('ceramic')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  if (lower.includes('stoneware')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('earthenware')) return { material: '陶器', materialEnglish: 'Earthenware' };
  return { material: '瓷器', materialEnglish: 'Ceramics' };
}

function parseObjectType(title: string, objectName: string): { objectType: string; objectTypeEnglish: string } {
  const lower = (title + ' ' + objectName).toLowerCase();
  if (lower.includes('teapot') || lower.includes('tea pot')) return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  if (lower.includes('tea caddy') || lower.includes('tea canister') || lower.includes('tea jar')) return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  if (lower.includes('gaiwan') || lower.includes('covered tea')) return { objectType: '盖碗', objectTypeEnglish: 'Gaiwan' };
  if (lower.includes('chawan') || lower.includes('tea bowl')) return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  if (lower.includes('tea tray')) return { objectType: '茶盘', objectTypeEnglish: 'Tea Tray' };
  if (lower.includes('cup stand')) return { objectType: '盏托', objectTypeEnglish: 'Cup Stand' };
  if (lower.includes('stem cup')) return { objectType: '高足杯', objectTypeEnglish: 'Stem Cup' };
  if (lower.includes('wine cup')) return { objectType: '酒杯', objectTypeEnglish: 'Wine Cup' };
  if (lower.includes('cup')) return { objectType: '杯盏', objectTypeEnglish: 'Cup' };
  if (lower.includes('ewer')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('bowl')) return { objectType: '碗', objectTypeEnglish: 'Bowl' };
  if (lower.includes('saucer')) return { objectType: '碟', objectTypeEnglish: 'Saucer' };
  return { objectType: '茶器', objectTypeEnglish: 'Tea Ware' };
}

// Compress image using ImageMagick
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
    const idsToCheck = searchData.objectIDs.slice(0, 100); // Limit to first 100
    
    let accepted = 0;
    for (const id of idsToCheck) {
      const artworkId = `met-${id}`;
      if (existingIds.has(artworkId)) continue;
      
      try {
        const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
        const obj = await fetchJson(objUrl);
        
        // Check relevance
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
          searchText.includes('famille') ||
          searchText.includes('wucai') ||
          searchText.includes('doucai') ||
          searchText.includes('celadon') ||
          searchText.includes('lacquer');
        
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
        
        // Determine file extension and save temporarily
        const tempPath = path.join('/tmp', `${artworkId}-temp.jpg`);
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        
        fs.writeFileSync(tempPath, imageData);
        
        // Compress image
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
        console.log(`    + ${artworkId}: ${obj.title}`);
        
        if (accepted >= 15) break; // Limit per query
        
        await new Promise(r => setTimeout(r, 300)); // Rate limit
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
        searchText.includes('famille') ||
        searchText.includes('wucai') ||
        searchText.includes('celadon') ||
        searchText.includes('lacquer') ||
        searchText.includes('china') ||
        searchText.includes('chinese') ||
        searchText.includes('japan') ||
        searchText.includes('korea') ||
        searchText.includes('vietnam');
      
      if (!isRelevant) continue;
      
      // Check for valid image
      const imageUrl = obj.images?.web?.url;
      if (!imageUrl) continue;
      
      try {
        // Download and validate image
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
        const { dynasty, dynastyEnglish } = parseDynasty(obj.creation_date || '', obj.culture || '');
        const { material, materialEnglish } = parseMaterial(obj.technique || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.type || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: obj.title || '',
          dynasty,
          dynastyEnglish,
          period: obj.culture || '',
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
        console.log(`    + ${artworkId}: ${obj.title}`);
        
        if (accepted >= 10) break; // Limit per query
        
        await new Promise(r => setTimeout(r, 200)); // Rate limit
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
        
        // Check license
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
        console.log(`    + ${artworkId}: ${title}`);
        
        if (accepted >= 8) break; // Limit per category
        
        await new Promise(r => setTimeout(r, 200)); // Rate limit
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

// Log crawl entry
function logCrawl(entry: any): void {
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  fs.appendFileSync(CRAWL_LOG_PATH, line + '\n');
}

// === Main ===
async function main() {
  console.log('====================================');
  console.log('Round 8 茶器收藏扩展');
  console.log(`批次ID: ${BATCH_ID}`);
  console.log('====================================\n');
  
  const existingIds = loadExistingIds();
  const existingHashes = loadExistingHashes();
  const completedQueries = loadCompletedQueries();
  
  console.log(`现有藏品: ${existingIds.size} 件`);
  console.log(`已完成查询: ${completedQueries.size} 个\n`);
  
  const newArtworks: Artwork[] = [];
  
  // Run Met queries (skip completed ones)
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
      idsAccepted: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    if (newArtworks.length >= 30) break; // Early exit if we have enough
  }
  
  // Run CMA queries
  if (newArtworks.length < 30) {
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
        idsAccepted: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 400));
      
      if (newArtworks.length >= 30) break;
    }
  }
  
  // Run Wikimedia queries
  if (newArtworks.length < 30) {
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
        idsAccepted: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 300));
      
      if (newArtworks.length >= 30) break;
    }
  }
  
  console.log('\n====================================');
  console.log(`总计新增: ${newArtworks.length} 件`);
  console.log('====================================\n');
  
  if (newArtworks.length < 15) {
    console.log('⚠️  新增数量不足 15 件，不创建 PR');
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
    '越南': 50, '中国': 60, '东亚': 100,
  };
  
  mergedArtworks.sort((a, b) => {
    const orderA = dynastyOrder[a.dynasty] || 100;
    const orderB = dynastyOrder[b.dynasty] || 100;
    return orderA - orderB;
  });
  
  // Save updated artworks
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
  fs.writeFileSync(PUBLIC_ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
  
  // Save image hashes
  const allHashes = Array.from(existingHashes);
  fs.writeFileSync(path.join(ROOT, 'research', 'image-hashes.json'), JSON.stringify(allHashes, null, 2));
  
  console.log(`✅ 已保存 ${mergedArtworks.length} 件藏品`);
  console.log(`   src/data/artworks.json 和 public/artworks.json 已同步`);
}

main().catch(console.error);
