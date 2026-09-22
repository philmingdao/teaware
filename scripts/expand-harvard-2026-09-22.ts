/**
 * Harvard Art Museums Open Access Expansion Script - 2026-09-22
 * 
 * Target: Add open-license Asian teaware and ceramics from Harvard Art Museums
 * 
 * CRITICAL LICENSE POLICY:
 * - Harvard items are often CC-BY-NC. This gallery must NOT ingest NC-only works.
 * - ONLY include works where:
 *   1. imagepermissionlevel = 0 (open access images)
 *   2. copyright = null (artwork is public domain - old enough or released)
 *   3. Images are available via nrs.harvard.edu
 * - When imagepermissionlevel=0 and object copyright is null, Harvard's Open Access
 *   policy allows free use: "Harvard Art Museums allow free use of images of works
 *   in their collection that the museums believe to be in the public domain."
 * 
 * Key constraints:
 * - Compress images (max 1400px, q80)
 * - SHA256 dedupe against existing images
 * - Update crawl log for deduplication
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

interface HarvardImage {
  imageid: number;
  baseimageurl: string;
  width: number;
  height: number;
  copyright?: string;
}

interface HarvardRecord {
  id: number;
  objectid: number;
  title: string;
  dated: string;
  classification: string;
  medium: string;
  technique: string;
  period: string;
  culture: string;
  dimensions: string;
  copyright: string | null;
  creditline: string;
  imagepermissionlevel: number;
  url: string;
  images: HarvardImage[];
  primaryimageurl: string;
  accessionyear: number;
  division: string;
  accessionmethod: string;
}

const ROOT = process.cwd();
const ARTWORKS_PATH = path.join(ROOT, 'src', 'data', 'artworks.json');
const PUBLIC_ARTWORKS_PATH = path.join(ROOT, 'public', 'artworks.json');
const CRAWL_LOG_PATH = path.join(ROOT, 'research', 'crawl-log.jsonl');
const IMAGE_HASHES_PATH = path.join(ROOT, 'research', 'image-hashes.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'artworks');
const BATCH_ID = `harvard-expansion-${Date.now()}`;

const HARVARD_API_KEY = process.env.HARVARD_API_KEY;

if (!HARVARD_API_KEY) {
  console.error('ERROR: HARVARD_API_KEY environment variable is not set');
  process.exit(1);
}

console.log('✓ HARVARD_API_KEY is available (not printing value)');

// Stats tracking
const stats = {
  totalCandidates: 0,
  rejectedNoImage: 0,
  rejectedRestrictedLicense: 0,
  rejectedCopyrightNotNull: 0,
  rejectedNonAsian: 0,
  rejectedDuplicateId: 0,
  rejectedDuplicateAccession: 0,
  rejectedDuplicateHash: 0,
  rejectedBadImage: 0,
  rejectedNotTeaRelated: 0,
  accepted: 0,
};

// Search queries focused on Asian tea ceramics
const SEARCH_QUERIES = [
  // Chinese tea bowls and Jian ware (famous Song dynasty tea bowls)
  'Jian+ware',
  'tea+bowl+Chinese',
  "hare's+fur+bowl",
  'oil+spot+bowl',
  'temmoku',
  
  // Chinese ceramics
  'Longquan+celadon',
  'Jun+ware',
  'Ding+ware',
  'Qingbai',
  'blue+white+porcelain+Chinese',
  'famille+rose+Chinese',
  'porcelain+bowl+Chinese',
  'porcelain+cup+Chinese',
  'ewer+Chinese',
  'Dehua+porcelain',
  
  // Japanese tea ceramics
  'chawan',
  'Raku+ware',
  'Hagi+ware',
  'Oribe+ware',
  'Bizen+ware',
  'Shigaraki+ware',
  'Karatsu+ware',
  'Seto+ware',
  'matcha+bowl',
  
  // Korean ceramics
  'Korean+celadon',
  'Goryeo+celadon',
  'buncheong',
  'Korean+porcelain',
  
  // Tea-related items
  'tea+caddy+Asian',
  'teapot+Chinese',
  'teapot+Japanese',
  'sake+cup',
  'wine+cup+Chinese',
];

// Cultures we're interested in
const ASIAN_CULTURES = [
  'chinese', 'japanese', 'korean', 'vietnamese', 'thai', 
  'southeast asian', 'east asian', 'asian'
];

// Tea-related keywords
const TEA_KEYWORDS = [
  'tea', 'chawan', 'temmoku', 'jian', 'celadon', 'porcelain', 'bowl', 'cup',
  'ewer', 'caddy', 'sake', 'wine cup', 'raku', 'hagi', 'oribe', 'bizen',
  'shigaraki', 'karatsu', 'seto', 'longquan', 'jun', 'ding', 'qingbai',
  'famille', 'dehua', 'blanc de chine', 'goryeo', 'buncheong', 'yixing',
  'stoneware', 'ceramic', 'glaze', 'vessel'
];

function loadExistingIds(): Set<string> {
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  return new Set(artworks.map(a => a.id));
}

function loadExistingAccessions(): Set<string> {
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  return new Set(artworks.filter(a => a.accessionNumber).map(a => a.accessionNumber.toLowerCase()));
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetch(url: string, retries = 5, baseDelay = 15000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://github.com/philmingdao/teaware; harvard-expansion; contact: philmingdao@github)',
        'Accept': 'application/json,image/*,*/*',
      },
      timeout: 120000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (location) {
          const absoluteUrl = location.startsWith('http') ? location : new URL(location, url).toString();
          fetch(absoluteUrl, retries, baseDelay).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode === 429 || res.statusCode === 503) {
        if (retries > 0) {
          const delay = baseDelay * Math.pow(2, 5 - retries); // Exponential backoff: 15s, 30s, 60s, 120s, 240s
          console.log(`    [限流] 等待 ${Math.round(delay/1000)}s 后重试... (剩余${retries}次)`);
          sleep(delay).then(() => fetch(url, retries - 1, baseDelay).then(resolve).catch(reject));
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

async function fetchJson(url: string): Promise<Record<string, unknown>> {
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

function isAsianCulture(culture: string | null): boolean {
  if (!culture) return false;
  const lower = culture.toLowerCase();
  return ASIAN_CULTURES.some(c => lower.includes(c));
}

function isTeaRelated(title: string, medium: string, classification: string): boolean {
  const combined = `${title} ${medium} ${classification}`.toLowerCase();
  return TEA_KEYWORDS.some(kw => combined.includes(kw));
}

function parseDynasty(date: string, culture: string, period: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture + ' ' + (period || '')).toLowerCase();
  
  // Japanese periods
  if (lower.includes('edo')) return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
  if (lower.includes('muromachi')) return { dynasty: '室町', dynastyEnglish: 'Muromachi Period (Japan)' };
  if (lower.includes('momoyama')) return { dynasty: '桃山', dynastyEnglish: 'Momoyama Period (Japan)' };
  if (lower.includes('meiji')) return { dynasty: '明治', dynastyEnglish: 'Meiji Period (Japan)' };
  if (lower.includes('taisho') || lower.includes('taishō')) return { dynasty: '大正', dynastyEnglish: 'Taisho Period (Japan)' };
  if (lower.includes('showa') || lower.includes('shōwa')) return { dynasty: '昭和', dynastyEnglish: 'Showa Period (Japan)' };
  if (lower.includes('heisei')) return { dynasty: '平成', dynastyEnglish: 'Heisei Period (Japan)' };
  if (lower.includes('kamakura')) return { dynasty: '鎌倉', dynastyEnglish: 'Kamakura Period (Japan)' };
  if (lower.includes('heian')) return { dynasty: '平安', dynastyEnglish: 'Heian Period (Japan)' };
  if (lower.includes('nara')) return { dynasty: '奈良', dynastyEnglish: 'Nara Period (Japan)' };
  
  // Korean periods
  if (lower.includes('joseon') || lower.includes('choson') || lower.includes('yi dynasty')) return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)' };
  if (lower.includes('goryeo') || lower.includes('koryo')) return { dynasty: '高麗', dynastyEnglish: 'Goryeo Dynasty (Korea)' };
  if (lower.includes('unified silla')) return { dynasty: '統一新羅', dynastyEnglish: 'Unified Silla (Korea)' };
  
  // Chinese dynasties
  if (lower.includes('tang') || lower.match(/\b618\b.*\b907\b/)) return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty' };
  if (lower.includes('five dynasties') || lower.includes('ten kingdoms')) return { dynasty: '五代', dynastyEnglish: 'Five Dynasties' };
  if (lower.includes('northern song')) return { dynasty: '北宋', dynastyEnglish: 'Northern Song Dynasty' };
  if (lower.includes('southern song')) return { dynasty: '南宋', dynastyEnglish: 'Southern Song Dynasty' };
  if (lower.includes('song') || lower.match(/\b960\b.*\b1279\b/) || lower.match(/12th.*13th.*century/)) return { dynasty: '宋', dynastyEnglish: 'Song Dynasty' };
  if (lower.includes('liao')) return { dynasty: '遼', dynastyEnglish: 'Liao Dynasty' };
  if (lower.includes('jin') && !lower.includes('qing')) return { dynasty: '金', dynastyEnglish: 'Jin Dynasty' };
  if (lower.includes('yuan') || lower.match(/\b1271\b.*\b1368\b/) || lower.match(/13th.*14th.*century/)) return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty' };
  if (lower.includes('yongle')) return { dynasty: '明永乐', dynastyEnglish: 'Ming Dynasty (Yongle)' };
  if (lower.includes('xuande')) return { dynasty: '明宣德', dynastyEnglish: 'Ming Dynasty (Xuande)' };
  if (lower.includes('chenghua')) return { dynasty: '明成化', dynastyEnglish: 'Ming Dynasty (Chenghua)' };
  if (lower.includes('jiajing')) return { dynasty: '明嘉靖', dynastyEnglish: 'Ming Dynasty (Jiajing)' };
  if (lower.includes('wanli')) return { dynasty: '明万历', dynastyEnglish: 'Ming Dynasty (Wanli)' };
  if (lower.includes('ming') || lower.match(/\b1368\b.*\b1644\b/) || lower.match(/14th.*17th.*century/)) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  if (lower.includes('kangxi')) return { dynasty: '清康熙', dynastyEnglish: 'Qing Dynasty (Kangxi)' };
  if (lower.includes('yongzheng')) return { dynasty: '清雍正', dynastyEnglish: 'Qing Dynasty (Yongzheng)' };
  if (lower.includes('qianlong')) return { dynasty: '清乾隆', dynastyEnglish: 'Qing Dynasty (Qianlong)' };
  if (lower.includes('jiaqing')) return { dynasty: '清嘉庆', dynastyEnglish: 'Qing Dynasty (Jiaqing)' };
  if (lower.includes('daoguang')) return { dynasty: '清道光', dynastyEnglish: 'Qing Dynasty (Daoguang)' };
  if (lower.includes('guangxu')) return { dynasty: '清光绪', dynastyEnglish: 'Qing Dynasty (Guangxu)' };
  if (lower.includes('qing') || lower.match(/\b1644\b.*\b1911\b/) || lower.match(/17th.*19th.*century/)) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  if (lower.includes('republic') || lower.includes('民国')) return { dynasty: '民国', dynastyEnglish: 'Republic of China' };
  
  // Generic culture fallback
  if (lower.includes('china') || lower.includes('chinese')) return { dynasty: '中国', dynastyEnglish: 'China' };
  if (lower.includes('japan') || lower.includes('japanese')) return { dynasty: '日本', dynastyEnglish: 'Japan' };
  if (lower.includes('korea') || lower.includes('korean')) return { dynasty: '韩国', dynastyEnglish: 'Korea' };
  if (lower.includes('vietnam')) return { dynasty: '越南', dynastyEnglish: 'Vietnam' };
  
  return { dynasty: '东亚', dynastyEnglish: 'East Asia' };
}

function parseMaterial(medium: string, title: string): { material: string; materialEnglish: string } {
  const lower = (medium + ' ' + title).toLowerCase();
  
  // Specific wares
  if (lower.includes('jian') || lower.includes('temmoku') || lower.includes("hare's fur") || lower.includes('hares fur') || lower.includes('oil spot')) return { material: '建盏', materialEnglish: 'Jian Ware' };
  if (lower.includes('longquan')) return { material: '龙泉青瓷', materialEnglish: 'Longquan Celadon' };
  if (lower.includes('jun') && lower.includes('ware')) return { material: '钧瓷', materialEnglish: 'Jun Ware' };
  if (lower.includes('ding') && lower.includes('ware')) return { material: '定瓷', materialEnglish: 'Ding Ware' };
  if (lower.includes('ge') && lower.includes('ware')) return { material: '哥窑', materialEnglish: 'Ge Ware' };
  if (lower.includes('ru') && lower.includes('ware')) return { material: '汝窑', materialEnglish: 'Ru Ware' };
  if (lower.includes('guan') && (lower.includes('ware') || lower.includes('official'))) return { material: '官窑', materialEnglish: 'Guan Ware' };
  if (lower.includes('qingbai')) return { material: '青白瓷', materialEnglish: 'Qingbai Ware' };
  if (lower.includes('yixing') || lower.includes('zisha')) return { material: '宜兴紫砂', materialEnglish: 'Yixing Zisha' };
  if (lower.includes('blanc de chine') || lower.includes('dehua')) return { material: '德化白瓷', materialEnglish: 'Blanc de Chine (Dehua)' };
  
  // Glazes and decorations
  if (lower.includes('famille verte')) return { material: '五彩瓷', materialEnglish: 'Famille Verte Porcelain' };
  if (lower.includes('famille rose')) return { material: '粉彩瓷', materialEnglish: 'Famille Rose Porcelain' };
  if (lower.includes('doucai')) return { material: '斗彩瓷', materialEnglish: 'Doucai Porcelain' };
  if (lower.includes('wucai')) return { material: '五彩瓷', materialEnglish: 'Wucai Porcelain' };
  if (lower.includes('blue and white') || lower.includes('blue-and-white')) return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  if (lower.includes('celadon')) return { material: '青瓷', materialEnglish: 'Celadon' };
  if (lower.includes('sancai')) return { material: '三彩', materialEnglish: 'Sancai' };
  if (lower.includes('copper red') || lower.includes('sang de boeuf') || lower.includes('ox blood') || lower.includes('peachbloom')) return { material: '釉里红', materialEnglish: 'Copper Red Glaze' };
  if (lower.includes('flambe') || lower.includes('flambé')) return { material: '窑变釉', materialEnglish: 'Flambé Glaze' };
  
  // Japanese wares
  if (lower.includes('raku')) return { material: '乐烧', materialEnglish: 'Raku Ware' };
  if (lower.includes('satsuma')) return { material: '萨摩烧', materialEnglish: 'Satsuma Ware' };
  if (lower.includes('kutani')) return { material: '九谷烧', materialEnglish: 'Kutani Ware' };
  if (lower.includes('imari') || lower.includes('arita')) return { material: '伊万里烧', materialEnglish: 'Imari Ware' };
  if (lower.includes('hagi')) return { material: '萩烧', materialEnglish: 'Hagi Ware' };
  if (lower.includes('karatsu')) return { material: '唐津烧', materialEnglish: 'Karatsu Ware' };
  if (lower.includes('oribe')) return { material: '织部烧', materialEnglish: 'Oribe Ware' };
  if (lower.includes('bizen')) return { material: '备前烧', materialEnglish: 'Bizen Ware' };
  if (lower.includes('shigaraki')) return { material: '信乐烧', materialEnglish: 'Shigaraki Ware' };
  if (lower.includes('seto')) return { material: '瀬户烧', materialEnglish: 'Seto Ware' };
  if (lower.includes('kyoto') || lower.includes('kyo-yaki')) return { material: '京烧', materialEnglish: 'Kyoto Ware' };
  
  // Korean wares
  if (lower.includes('goryeo') && lower.includes('celadon')) return { material: '高丽青瓷', materialEnglish: 'Goryeo Celadon' };
  if (lower.includes('buncheong')) return { material: '粉青沙器', materialEnglish: 'Buncheong Ware' };
  
  // Generic types
  if (lower.includes('porcelain')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  if (lower.includes('stoneware')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('earthenware')) return { material: '陶器', materialEnglish: 'Earthenware' };
  if (lower.includes('ceramic')) return { material: '陶瓷', materialEnglish: 'Ceramics' };
  if (lower.includes('lacquer')) return { material: '漆器', materialEnglish: 'Lacquerware' };
  if (lower.includes('iron')) return { material: '铁器', materialEnglish: 'Iron' };
  if (lower.includes('bamboo')) return { material: '竹', materialEnglish: 'Bamboo' };
  
  return { material: '器物', materialEnglish: 'Object' };
}

function parseObjectType(title: string, classification: string): { objectType: string; objectTypeEnglish: string } {
  const lower = (title + ' ' + classification).toLowerCase();
  
  if (lower.includes('teapot') || lower.includes('tea pot')) return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  if (lower.includes('tea caddy') || lower.includes('tea canister') || lower.includes('tea jar')) return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  if (lower.includes('chawan') || lower.includes('tea bowl') || lower.includes('teabowl')) return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  if (lower.includes('gaiwan') || lower.includes('covered tea')) return { objectType: '盖碗', objectTypeEnglish: 'Gaiwan' };
  if (lower.includes('stem cup')) return { objectType: '高足杯', objectTypeEnglish: 'Stem Cup' };
  if (lower.includes('wine cup')) return { objectType: '酒杯', objectTypeEnglish: 'Wine Cup' };
  if (lower.includes('sake cup') || lower.includes('sake')) return { objectType: '酒杯', objectTypeEnglish: 'Sake Cup' };
  if (lower.includes('cup')) return { objectType: '杯盏', objectTypeEnglish: 'Cup' };
  if (lower.includes('ewer')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('bowl')) return { objectType: '碗', objectTypeEnglish: 'Bowl' };
  if (lower.includes('saucer')) return { objectType: '碟', objectTypeEnglish: 'Saucer' };
  if (lower.includes('vase')) return { objectType: '瓶', objectTypeEnglish: 'Vase' };
  if (lower.includes('jar')) return { objectType: '罐', objectTypeEnglish: 'Jar' };
  if (lower.includes('dish') || lower.includes('plate')) return { objectType: '盘', objectTypeEnglish: 'Dish/Plate' };
  if (lower.includes('vessel')) return { objectType: '器皿', objectTypeEnglish: 'Vessel' };
  
  return { objectType: '器物', objectTypeEnglish: 'Object' };
}

async function compressImage(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    execSync(`convert "${inputPath}" -resize "1400x1400>" -strip -quality 80 -sampling-factor 4:2:0 -interlace JPEG "${outputPath}"`, {
      stdio: 'pipe'
    });
    return true;
  } catch {
    return false;
  }
}

async function searchHarvard(
  query: string,
  existingIds: Set<string>,
  existingAccessions: Set<string>,
  existingHashes: Set<string>,
  processedObjectIds: Set<number>
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  const queryDecoded = query.replace(/\+/g, ' ');
  
  console.log(`  [Harvard] 查询: "${queryDecoded}"`);
  
  // Search with open access images - use smaller page size to reduce load
  const searchUrl = `https://api.harvardartmuseums.org/object?apikey=${HARVARD_API_KEY}&size=50&hasimage=1&imagepermissionlevel=0&q=${query}&fields=objectid,title,dated,classification,medium,technique,period,culture,dimensions,copyright,creditline,imagepermissionlevel,url,images,primaryimageurl,accessionyear,division,accessionmethod`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const info = searchData.info as { totalrecords: number };
    const records: HarvardRecord[] = searchData.records as HarvardRecord[] || [];
    
    if (records.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${info.totalrecords} 件 (筛选前 ${records.length} 件)`);
    stats.totalCandidates += records.length;
    
    let accepted = 0;
    for (const item of records) {
      if (accepted >= 10) break; // Limit per query to ensure diversity
      
      // Skip if already processed in this run
      if (processedObjectIds.has(item.objectid)) {
        continue;
      }
      
      // LICENSE CHECK 1: imagepermissionlevel must be 0
      if (item.imagepermissionlevel !== 0) {
        stats.rejectedRestrictedLicense++;
        continue;
      }
      
      // LICENSE CHECK 2: copyright must be null (public domain artwork)
      if (item.copyright !== null && item.copyright !== undefined) {
        stats.rejectedCopyrightNotNull++;
        continue;
      }
      
      // Must have image URL
      if (!item.primaryimageurl || item.images.length === 0) {
        stats.rejectedNoImage++;
        continue;
      }
      
      // Must be Asian culture
      if (!isAsianCulture(item.culture)) {
        stats.rejectedNonAsian++;
        continue;
      }
      
      // Must be tea/ceramic related
      if (!isTeaRelated(item.title, item.medium || '', item.classification || '')) {
        stats.rejectedNotTeaRelated++;
        continue;
      }
      
      const artworkId = `harvard-${item.objectid}`;
      
      // Check for duplicate ID
      if (existingIds.has(artworkId)) {
        stats.rejectedDuplicateId++;
        continue;
      }
      
      // Check accession from URL or generate one
      const accessionNumber = `HAM-${item.objectid}`;
      if (existingAccessions.has(accessionNumber.toLowerCase())) {
        stats.rejectedDuplicateAccession++;
        continue;
      }
      
      try {
        // Download image
        const imageUrl = item.primaryimageurl;
        const imageData = await fetch(imageUrl);
        
        if (!isValidImage(imageData)) {
          stats.rejectedBadImage++;
          continue;
        }
        
        // Check hash for duplicate
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          stats.rejectedDuplicateHash++;
          continue;
        }
        
        // Save temporarily and compress
        const tempPath = path.join('/tmp', `${artworkId}-temp.jpg`);
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        
        fs.writeFileSync(tempPath, imageData);
        
        const compressed = await compressImage(tempPath, finalPath);
        if (!compressed) {
          fs.unlinkSync(tempPath);
          stats.rejectedBadImage++;
          continue;
        }
        fs.unlinkSync(tempPath);
        
        // Parse metadata
        const { dynasty, dynastyEnglish } = parseDynasty(item.dated || '', item.culture || '', item.period || '');
        const { material, materialEnglish } = parseMaterial(item.medium || '', item.title || '');
        const { objectType, objectTypeEnglish } = parseObjectType(item.title || '', item.classification || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: item.title || '',
          dynasty,
          dynastyEnglish,
          period: item.period || item.dated,
          date: item.dated || '',
          material,
          materialEnglish: item.medium || materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: item.dimensions || '',
          description: `此件${objectType}为${dynasty}时期之作品。${item.dimensions ? `尺寸：${item.dimensions}。` : ''}哈佛艺术博物馆藏品。`,
          sourceMuseum: '哈佛艺术博物馆',
          sourceMuseumEnglish: 'Harvard Art Museums',
          accessionNumber,
          sourceUrl: item.url || `https://www.harvardartmuseums.org/collections/object/${item.objectid}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${item.title} - ${item.dated || dynasty}`,
          license: 'Public Domain (Harvard Art Museums Open Access)',
          creditLine: item.creditline || undefined,
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingAccessions.add(accessionNumber.toLowerCase());
        existingHashes.add(hash);
        processedObjectIds.add(item.objectid);
        accepted++;
        stats.accepted++;
        
        console.log(`    + ${artworkId}: ${item.title?.substring(0, 50)}`);
        
        // Rate limiting - Harvard NRS server is heavily rate-limited
        // Use 8 second delay between successful downloads
        await sleep(8000);
      } catch (e) {
        console.log(`    ! Error processing ${item.objectid}: ${(e as Error).message}`);
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

async function main() {
  console.log('\n========================================');
  console.log(' 哈佛艺术博物馆开放获取数据扩展');
  console.log(' Harvard Art Museums Open Access Expansion');
  console.log('========================================\n');
  
  console.log(`批次ID: ${BATCH_ID}`);
  console.log(`目标: Asian teaware with open licenses\n`);
  
  // Wait 90 seconds initially to let any previous rate limits cool down
  console.log('等待90秒以重置速率限制...');
  await sleep(90000);
  console.log('继续执行...\n');
  
  // Load existing data
  const existingIds = loadExistingIds();
  const existingAccessions = loadExistingAccessions();
  const existingHashes = loadExistingHashes();
  const completedQueries = loadCompletedQueries();
  const processedObjectIds = new Set<number>();
  
  console.log(`现有作品: ${existingIds.size} 件`);
  console.log(`现有哈希: ${existingHashes.size} 个`);
  console.log(`已完成查询: ${completedQueries.size} 个\n`);
  
  const allNewArtworks: Artwork[] = [];
  
  // Process queries
  for (const query of SEARCH_QUERIES) {
    const queryKey = `harvard:${query}`;
    if (completedQueries.has(queryKey)) {
      console.log(`  [跳过] 已完成: ${query}`);
      continue;
    }
    
    const newArtworks = await searchHarvard(query, existingIds, existingAccessions, existingHashes, processedObjectIds);
    allNewArtworks.push(...newArtworks);
    
    // Log to crawl log
    const logEntry = {
      timestamp: new Date().toISOString(),
      source: 'harvard',
      query: query.replace(/\+/g, ' '),
      idsAccepted: newArtworks.length,
      crawlBatchId: BATCH_ID,
    };
    fs.appendFileSync(CRAWL_LOG_PATH, JSON.stringify(logEntry) + '\n');
    
    // Rate limit between queries - use 3 second delay
    await sleep(3000);
  }
  
  console.log(`\n总计新增: ${allNewArtworks.length} 件作品`);
  
  // Print license filter statistics
  console.log('\n========================================');
  console.log(' 许可证筛选统计 / License Filter Stats');
  console.log('========================================');
  console.log(`总候选数: ${stats.totalCandidates}`);
  console.log(`被拒绝 - 无图片: ${stats.rejectedNoImage}`);
  console.log(`被拒绝 - 受限许可 (imagepermissionlevel!=0): ${stats.rejectedRestrictedLicense}`);
  console.log(`被拒绝 - 版权非空 (copyright!=null): ${stats.rejectedCopyrightNotNull}`);
  console.log(`被拒绝 - 非亚洲文化: ${stats.rejectedNonAsian}`);
  console.log(`被拒绝 - 非茶器相关: ${stats.rejectedNotTeaRelated}`);
  console.log(`被拒绝 - 重复ID: ${stats.rejectedDuplicateId}`);
  console.log(`被拒绝 - 重复入藏号: ${stats.rejectedDuplicateAccession}`);
  console.log(`被拒绝 - 重复图片哈希: ${stats.rejectedDuplicateHash}`);
  console.log(`被拒绝 - 图片无效: ${stats.rejectedBadImage}`);
  console.log(`最终接受: ${stats.accepted}`);
  
  if (allNewArtworks.length === 0) {
    console.log('\n没有新作品添加');
    return;
  }
  
  // Load and update artworks.json
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  artworks.push(...allNewArtworks);
  
  // Sort by dynasty (roughly chronological)
  const dynastyOrder: Record<string, number> = {
    '唐': 1, '五代': 2, '北宋': 3, '南宋': 4, '宋': 3, '遼': 3, '金': 4,
    '元': 5, '明': 6, '明永乐': 6, '明宣德': 6, '明成化': 6, '明嘉靖': 6, '明万历': 6,
    '清': 7, '清康熙': 7, '清雍正': 7, '清乾隆': 7, '清嘉庆': 7, '清道光': 7, '清光绪': 7,
    '民国': 8, '中国': 9, '日本': 10, '平安': 10, '鎌倉': 10, '室町': 10, '桃山': 10, 
    '江戸': 10, '明治': 10, '大正': 10, '昭和': 10, '平成': 10,
    '高麗': 11, '朝鮮': 12, '韩国': 12, '越南': 13, '东亚': 20,
  };
  
  artworks.sort((a, b) => (dynastyOrder[a.dynasty] || 99) - (dynastyOrder[b.dynasty] || 99));
  
  // Save
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(artworks, null, 2));
  fs.writeFileSync(PUBLIC_ARTWORKS_PATH, JSON.stringify(artworks, null, 2));
  
  // Update image hashes
  const allHashes = Array.from(existingHashes);
  fs.writeFileSync(IMAGE_HASHES_PATH, JSON.stringify(allHashes, null, 2));
  
  console.log('\n========================================');
  console.log(' 扩展完成 / Expansion Complete');
  console.log('========================================');
  console.log(`新增作品: ${allNewArtworks.length} 件`);
  console.log(`总作品数: ${artworks.length} 件`);
  console.log(`批次ID: ${BATCH_ID}`);
  
  // Print summary by culture
  const cultureCount: Record<string, number> = {};
  for (const a of allNewArtworks) {
    const key = a.dynastyEnglish.includes('Japan') ? 'Japanese' : 
                a.dynastyEnglish.includes('Korea') ? 'Korean' : 'Chinese';
    cultureCount[key] = (cultureCount[key] || 0) + 1;
  }
  
  console.log(`\n文化分布:`);
  for (const [culture, count] of Object.entries(cultureCount)) {
    console.log(`  - ${culture}: ${count} 件`);
  }
}

main().catch(console.error);
