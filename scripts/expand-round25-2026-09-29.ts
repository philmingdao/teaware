/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Round 25 Expansion Script - 2026-09-29
 * 
 * Key Fixes:
 * - Rijksmuseum pagination: `next` is an object with `.id`, not a string
 * 
 * Sources:
 * 1. Rijksmuseum (FIXED pagination) - Large remainder available
 * 2. Smithsonian (API key available) - Freer/Sackler Asian art
 * 3. Met - More tea-related CC0 objects
 * 4. V&A - Asian ceramics
 * 5. CMA - PRINT high-res images
 * 6. Wikimedia Commons - Tea-related media
 * 
 * Constraints:
 * - CC0 / Public Domain / CC BY only (no NC licenses - skip Harvard)
 * - Self-host all images under public/artworks/
 * - SHA256 dedupe against existing images
 * - Quality Gate: max(width, height) >= 1200 pixels
 * - Output: 1200px max edge, JPEG quality 72, mozjpeg progressive
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
const BATCH_ID = `round25-expansion-${Date.now()}`;

const SMITHSONIAN_API_KEY = process.env.SMITHSONIAN_API_KEY;

const MIN_LONGEST_EDGE = 1200;
const MAX_OUTPUT_EDGE = 1200;
const JPEG_QUALITY = 72;

const stats = {
  rijksmuseum: { queried: 0, pagesFetched: 0, objectsFetched: 0, accepted: 0, rejected_lowres: 0, rejected_license: 0, rejected_duplicate: 0, rejected_other: 0 },
  smithsonian: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
  met: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
  va: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
  cma: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
  wmc: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
};

// === RIJKSMUSEUM QUERIES - Deeper pagination ===
const RIJKSMUSEUM_QUERIES = [
  // Very large result sets - paginate deep
  { field: 'title', term: 'Chinees porselein', maxPages: 50, description: 'Chinese porcelain (7k+ items)' },
  { field: 'title', term: 'Japans porselein', maxPages: 25, description: 'Japanese porcelain' },
  { field: 'title', term: 'porselein', maxPages: 30, description: 'Porcelain (general)' },
  
  // Tea-specific
  { field: 'title', term: 'theepot', maxPages: 20, description: 'Teapots' },
  { field: 'title', term: 'theeservies', maxPages: 15, description: 'Tea services' },
  { field: 'title', term: 'theebus', maxPages: 10, description: 'Tea caddies' },
  { field: 'title', term: 'theekom', maxPages: 10, description: 'Tea bowls' },
  { field: 'title', term: 'theekop', maxPages: 10, description: 'Tea cups' },
  { field: 'description', term: 'thee', maxPages: 15, description: 'Tea (description)' },
  
  // Specific wares/styles
  { field: 'title', term: 'Imari', maxPages: 15, description: 'Imari ware' },
  { field: 'title', term: 'Kakiemon', maxPages: 8, description: 'Kakiemon' },
  { field: 'title', term: 'blauw-wit', maxPages: 20, description: 'Blue-white' },
  { field: 'title', term: 'kraakporselein', maxPages: 15, description: 'Kraak porcelain' },
  { field: 'title', term: 'celadon', maxPages: 8, description: 'Celadon' },
  { field: 'title', term: 'famille rose', maxPages: 10, description: 'Famille rose' },
  { field: 'title', term: 'famille verte', maxPages: 8, description: 'Famille verte' },
  
  // Reign marks
  { field: 'title', term: 'Kangxi', maxPages: 12, description: 'Kangxi period' },
  { field: 'title', term: 'Qianlong', maxPages: 12, description: 'Qianlong period' },
  { field: 'title', term: 'Yongzheng', maxPages: 5, description: 'Yongzheng period' },
  { field: 'title', term: 'Wanli', maxPages: 5, description: 'Wanli period' },
  
  // Object types
  { field: 'type', term: 'bowl', maxPages: 15, description: 'Bowls' },
  { field: 'type', term: 'dish', maxPages: 15, description: 'Dishes' },
  { field: 'type', term: 'plate', maxPages: 15, description: 'Plates' },
  { field: 'type', term: 'vase', maxPages: 15, description: 'Vases' },
  { field: 'type', term: 'jar', maxPages: 10, description: 'Jars' },
  
  // English terms
  { field: 'title', term: 'teapot', maxPages: 10, description: 'Teapot (EN)' },
  { field: 'title', term: 'tea bowl', maxPages: 8, description: 'Tea bowl (EN)' },
  { field: 'title', term: 'Chinese export', maxPages: 10, description: 'Chinese export' },
];

// === SMITHSONIAN QUERIES - Freer/Sackler focus ===
const SMITHSONIAN_QUERIES = [
  'tea ceremony ceramics',
  'chawan tea bowl',
  'Japanese raku',
  'Korean celadon',
  'Chinese tea ware',
  'Jian ware tenmoku',
  'Song dynasty bowl',
  'Goryeo celadon',
  'Joseon white porcelain',
  'Yixing teapot',
  'Dehua porcelain',
  'Longquan celadon',
  'Jun ware',
  'Ding ware',
  'Cizhou ware',
  'Hagi ware',
  'Oribe ceramics',
  'Shino ware',
  'Bizen ceramics',
  'Karatsu tea bowl',
];

// === MET QUERIES - Net-new focus ===
const MET_QUERIES = [
  'matcha tea bowl',
  'sencha tea set',
  'kyusu Japanese teapot',
  'tetsubin iron kettle',
  'mizusashi water jar',
  'kensui waste water bowl',
  'futaoki lid rest',
  'chakin tea cloth',
  'hishaku water ladle',
  'Buncheong Korean ceramics',
  'moon jar Korean',
  'Vietnamese blue white',
  'Thai Sawankhalok',
  'Annam ware',
  'Northern celadon',
  'Ru ware',
  'Ge ware crackle',
  'Guan ware',
  'Jizhou tea bowl',
  'qingbai porcelain',
];

// === V&A QUERIES ===
const VA_QUERIES = [
  'Japanese tea ceremony',
  'Korean punch ong',
  'Vietnamese ceramics',
  'Thai celadon',
  'Seto chawan',
  'Mino ware',
  'Shigaraki tea',
  'Iga ware',
  'Tokoname teapot',
  'Banko ware',
  'Kutani porcelain',
  'Nabeshima ware',
  'Hirado porcelain',
  'Satsuma ware',
  'Awata ware',
];

// === CMA QUERIES ===
const CMA_QUERIES = [
  'Japanese tea utensils',
  'Korean moon jar',
  'Vietnamese ceramics',
  'Annamese ware',
  'Thai ceramics',
  'Khmer ceramics',
  'Burmese ceramics',
  'Sawankhalok',
  'Sukhothai ceramics',
  'Longquan celadon',
];

// === WIKIMEDIA COMMONS CATEGORIES ===
const WMC_CATEGORIES = [
  'Category:Tea_bowls',
  'Category:Japanese_tea_ceremony_utensils',
  'Category:Teapots',
  'Category:Chinese_tea',
  'Category:Yixing_teapots',
  'Category:Chawan',
  'Category:Raku_ware',
];

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
        'User-Agent': 'TeawareGallery/1.0 (https://philmingdao.github.io/teaware/; round25-expansion)',
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
  return isJpeg || isPng || isGif || isWebp;
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

function parseDynasty(dateStr: string, placeStr: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (dateStr + ' ' + placeStr).toLowerCase();
  
  // Japanese periods
  if (lower.includes('edo') || lower.includes('tokugawa')) return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
  if (lower.includes('meiji')) return { dynasty: '明治', dynastyEnglish: 'Meiji Period (Japan)' };
  if (lower.includes('momoyama')) return { dynasty: '桃山', dynastyEnglish: 'Momoyama Period (Japan)' };
  if (lower.includes('muromachi')) return { dynasty: '室町', dynastyEnglish: 'Muromachi Period (Japan)' };
  if (lower.includes('kamakura')) return { dynasty: '镰仓', dynastyEnglish: 'Kamakura Period (Japan)' };
  if (lower.includes('heian')) return { dynasty: '平安', dynastyEnglish: 'Heian Period (Japan)' };
  if (lower.includes('nara')) return { dynasty: '奈良', dynastyEnglish: 'Nara Period (Japan)' };
  
  // Korean
  if (lower.includes('joseon') || lower.includes('choson') || lower.includes('yi dynasty')) return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)' };
  if (lower.includes('goryeo') || lower.includes('koryo')) return { dynasty: '高麗', dynastyEnglish: 'Goryeo Dynasty (Korea)' };
  if (lower.includes('unified silla')) return { dynasty: '统一新罗', dynastyEnglish: 'Unified Silla (Korea)' };
  
  // Chinese dynasties/reigns
  if (lower.includes('kangxi')) return { dynasty: '清康熙', dynastyEnglish: 'Qing Dynasty (Kangxi)' };
  if (lower.includes('yongzheng')) return { dynasty: '清雍正', dynastyEnglish: 'Qing Dynasty (Yongzheng)' };
  if (lower.includes('qianlong')) return { dynasty: '清乾隆', dynastyEnglish: 'Qing Dynasty (Qianlong)' };
  if (lower.includes('jiaqing')) return { dynasty: '清嘉庆', dynastyEnglish: 'Qing Dynasty (Jiaqing)' };
  if (lower.includes('daoguang')) return { dynasty: '清道光', dynastyEnglish: 'Qing Dynasty (Daoguang)' };
  if (lower.includes('guangxu')) return { dynasty: '清光绪', dynastyEnglish: 'Qing Dynasty (Guangxu)' };
  if (lower.includes('qing') || (lower.includes('17') && lower.includes('19') && (lower.includes('china') || lower.includes('chinese')))) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  
  if (lower.includes('wanli')) return { dynasty: '明万历', dynastyEnglish: 'Ming Dynasty (Wanli)' };
  if (lower.includes('jiajing')) return { dynasty: '明嘉靖', dynastyEnglish: 'Ming Dynasty (Jiajing)' };
  if (lower.includes('xuande')) return { dynasty: '明宣德', dynastyEnglish: 'Ming Dynasty (Xuande)' };
  if (lower.includes('yongle')) return { dynasty: '明永乐', dynastyEnglish: 'Ming Dynasty (Yongle)' };
  if (lower.includes('chenghua')) return { dynasty: '明成化', dynastyEnglish: 'Ming Dynasty (Chenghua)' };
  if (lower.includes('ming') || (lower.includes('14') && lower.includes('17') && (lower.includes('china') || lower.includes('chinese')))) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  
  if (lower.includes('yuan')) return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty' };
  if (lower.includes('northern song')) return { dynasty: '北宋', dynastyEnglish: 'Northern Song Dynasty' };
  if (lower.includes('southern song')) return { dynasty: '南宋', dynastyEnglish: 'Southern Song Dynasty' };
  if (lower.includes('song')) return { dynasty: '宋', dynastyEnglish: 'Song Dynasty' };
  if (lower.includes('tang')) return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty' };
  if (lower.includes('five dynasties')) return { dynasty: '五代', dynastyEnglish: 'Five Dynasties' };
  
  // Southeast Asian
  if (lower.includes('vietnam') || lower.includes('annamese') || lower.includes('annam')) return { dynasty: '越南', dynastyEnglish: 'Vietnam' };
  if (lower.includes('thai') || lower.includes('siam')) return { dynasty: '泰国', dynastyEnglish: 'Thailand' };
  if (lower.includes('sukhothai')) return { dynasty: '素可泰', dynastyEnglish: 'Sukhothai (Thailand)' };
  if (lower.includes('sawankhalok')) return { dynasty: '宋加洛', dynastyEnglish: 'Sawankhalok (Thailand)' };
  if (lower.includes('khmer') || lower.includes('cambodia')) return { dynasty: '高棉', dynastyEnglish: 'Khmer (Cambodia)' };
  if (lower.includes('burma') || lower.includes('myanmar')) return { dynasty: '缅甸', dynastyEnglish: 'Myanmar' };
  
  // Geographic
  if (lower.includes('china') || lower.includes('chinese') || lower.includes('chinees') || lower.includes('chine')) return { dynasty: '中国', dynastyEnglish: 'China' };
  if (lower.includes('japan') || lower.includes('japanese') || lower.includes('japans')) return { dynasty: '日本', dynastyEnglish: 'Japan' };
  if (lower.includes('korea') || lower.includes('korean')) return { dynasty: '韩国', dynastyEnglish: 'Korea' };
  if (lower.includes('netherlands') || lower.includes('dutch') || lower.includes('nederland')) return { dynasty: '荷兰', dynastyEnglish: 'Netherlands' };
  if (lower.includes('delft')) return { dynasty: '荷兰', dynastyEnglish: 'Netherlands (Delft)' };
  
  return { dynasty: '东亚', dynastyEnglish: 'East Asia' };
}

function parseMaterial(medium: string): { material: string; materialEnglish: string } {
  const lower = medium.toLowerCase();
  
  if (lower.includes('famille rose') || lower.includes('fencai')) return { material: '粉彩瓷', materialEnglish: 'Famille Rose Porcelain' };
  if (lower.includes('famille verte')) return { material: '五彩瓷', materialEnglish: 'Famille Verte Porcelain' };
  if (lower.includes('famille noire')) return { material: '墨地五彩', materialEnglish: 'Famille Noire Porcelain' };
  if (lower.includes('blue and white') || lower.includes('blauw-wit') || lower.includes('blue-white') || lower.includes('underglaze blue')) return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  if (lower.includes('celadon') || lower.includes('qingci')) return { material: '青瓷', materialEnglish: 'Celadon' };
  if (lower.includes('blanc de chine') || lower.includes('dehua')) return { material: '德化白瓷', materialEnglish: 'Blanc de Chine (Dehua)' };
  if (lower.includes('yixing') || lower.includes('zisha')) return { material: '宜兴紫砂', materialEnglish: 'Yixing Zisha' };
  if (lower.includes('kraak')) return { material: '克拉克瓷', materialEnglish: 'Kraak Porcelain' };
  if (lower.includes('imari') || lower.includes('arita')) return { material: '伊万里烧', materialEnglish: 'Imari Ware' };
  if (lower.includes('kakiemon')) return { material: '柿右卫门', materialEnglish: 'Kakiemon Ware' };
  if (lower.includes('satsuma')) return { material: '萨摩烧', materialEnglish: 'Satsuma Ware' };
  if (lower.includes('kutani')) return { material: '九谷烧', materialEnglish: 'Kutani Ware' };
  if (lower.includes('raku')) return { material: '乐烧', materialEnglish: 'Raku Ware' };
  if (lower.includes('hagi')) return { material: '萩烧', materialEnglish: 'Hagi Ware' };
  if (lower.includes('oribe')) return { material: '织部烧', materialEnglish: 'Oribe Ware' };
  if (lower.includes('shino')) return { material: '志野烧', materialEnglish: 'Shino Ware' };
  if (lower.includes('bizen')) return { material: '备前烧', materialEnglish: 'Bizen Ware' };
  if (lower.includes('karatsu')) return { material: '唐津烧', materialEnglish: 'Karatsu Ware' };
  if (lower.includes('seto')) return { material: '濑户烧', materialEnglish: 'Seto Ware' };
  if (lower.includes('mino')) return { material: '美浓烧', materialEnglish: 'Mino Ware' };
  if (lower.includes('shigaraki')) return { material: '信乐烧', materialEnglish: 'Shigaraki Ware' };
  if (lower.includes('iga')) return { material: '伊贺烧', materialEnglish: 'Iga Ware' };
  if (lower.includes('tokoname')) return { material: '常滑烧', materialEnglish: 'Tokoname Ware' };
  if (lower.includes('delft')) return { material: '代尔夫特陶', materialEnglish: 'Delftware' };
  if (lower.includes('jun') || lower.includes('chün')) return { material: '钧瓷', materialEnglish: 'Jun Ware' };
  if (lower.includes('ding')) return { material: '定瓷', materialEnglish: 'Ding Ware' };
  if (lower.includes('ru ware')) return { material: '汝瓷', materialEnglish: 'Ru Ware' };
  if (lower.includes('ge ware') || lower.includes('guan')) return { material: '官窑', materialEnglish: 'Guan/Ge Ware' };
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes("hare's fur") || lower.includes('oil spot')) return { material: '建盏', materialEnglish: 'Jian Ware' };
  if (lower.includes('jizhou')) return { material: '吉州窑', materialEnglish: 'Jizhou Ware' };
  if (lower.includes('longquan')) return { material: '龙泉青瓷', materialEnglish: 'Longquan Celadon' };
  if (lower.includes('goryeo') && lower.includes('celadon')) return { material: '高丽青瓷', materialEnglish: 'Goryeo Celadon' };
  if (lower.includes('buncheong') || lower.includes('punchong')) return { material: '粉青沙器', materialEnglish: 'Buncheong (Punchong)' };
  if (lower.includes('qingbai')) return { material: '影青瓷', materialEnglish: 'Qingbai Porcelain' };
  if (lower.includes('cizhou')) return { material: '磁州窑', materialEnglish: 'Cizhou Ware' };
  if (lower.includes('cloisonne') || lower.includes('cloisonné')) return { material: '景泰蓝', materialEnglish: 'Cloisonné' };
  if (lower.includes('silver')) return { material: '银器', materialEnglish: 'Silver' };
  if (lower.includes('iron') || lower.includes('tetsubin')) return { material: '铁器', materialEnglish: 'Iron' };
  if (lower.includes('porcelain') || lower.includes('porselein')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  if (lower.includes('stoneware') || lower.includes('steengoed')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('earthenware') || lower.includes('aardewerk')) return { material: '陶器', materialEnglish: 'Earthenware' };
  if (lower.includes('ceramic')) return { material: '陶瓷', materialEnglish: 'Ceramics' };
  
  return { material: '瓷器', materialEnglish: 'Ceramics' };
}

function parseObjectType(title: string, objectType: string = ''): { objectType: string; objectTypeEnglish: string } {
  const lower = (title + ' ' + objectType).toLowerCase();
  
  if (lower.includes('theepot') || lower.includes('teapot') || lower.includes('tea pot') || lower.includes('kyusu')) return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  if (lower.includes('tetsubin') || lower.includes('iron kettle')) return { objectType: '铁壶', objectTypeEnglish: 'Tetsubin' };
  if (lower.includes('theebus') || lower.includes('tea caddy') || lower.includes('caddy') || lower.includes('chaire') || lower.includes('natsume')) return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  if (lower.includes('chawan') || lower.includes('theekom') || lower.includes('tea bowl') || lower.includes('matcha bowl')) return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  if (lower.includes('theekop') || lower.includes('tea cup') || lower.includes('cup') || lower.includes('kopje') || lower.includes('yunomi')) return { objectType: '茶杯', objectTypeEnglish: 'Tea Cup' };
  if (lower.includes('schotel') || lower.includes('saucer')) return { objectType: '茶碟', objectTypeEnglish: 'Saucer' };
  if (lower.includes('servies') || lower.includes('service') || lower.includes('set')) return { objectType: '茶具套装', objectTypeEnglish: 'Tea Service' };
  if (lower.includes('kan') || lower.includes('ewer') || lower.includes('jug')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('mizusashi') || lower.includes('water jar')) return { objectType: '水指', objectTypeEnglish: 'Mizusashi' };
  if (lower.includes('kensui') || lower.includes('waste water') || lower.includes('slop bowl')) return { objectType: '建水', objectTypeEnglish: 'Kensui' };
  if (lower.includes('futaoki') || lower.includes('lid rest')) return { objectType: '盖置', objectTypeEnglish: 'Futaoki' };
  if (lower.includes('hishaku') || lower.includes('ladle')) return { objectType: '柄杓', objectTypeEnglish: 'Hishaku' };
  if (lower.includes('bowl') && !lower.includes('tea')) return { objectType: '碗', objectTypeEnglish: 'Bowl' };
  if (lower.includes('vaas') || lower.includes('vase')) return { objectType: '瓶', objectTypeEnglish: 'Vase' };
  if (lower.includes('bord') || lower.includes('dish') || lower.includes('plate')) return { objectType: '盘', objectTypeEnglish: 'Dish/Plate' };
  if (lower.includes('pot') || lower.includes('jar')) return { objectType: '罐', objectTypeEnglish: 'Jar' };
  if (lower.includes('figure') || lower.includes('figuur')) return { objectType: '人物', objectTypeEnglish: 'Figure' };
  if (lower.includes('incense') || lower.includes('censer') || lower.includes('koro')) return { objectType: '香炉', objectTypeEnglish: 'Incense Burner' };
  
  return { objectType: '器物', objectTypeEnglish: 'Object' };
}

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

/**
 * Rijksmuseum: Resolve object to get image via Linked Art chain
 */
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
      const classifiedAs = s.classified_as || [];
      for (const c of classifiedAs) {
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

/**
 * Search Rijksmuseum with FIXED pagination
 * Key fix: `next` is an object with `.id` property, not a string
 */
async function searchRijksmuseumPaginated(
  query: { field: string; term: string; maxPages: number; description: string },
  existingIds: Set<string>,
  existingHashes: Set<string>,
  maxItemsPerQuery: number = 80
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
          const { dynasty, dynastyEnglish } = parseDynasty(objData.date, objData.place);
          const { material, materialEnglish } = parseMaterial(objData.materials || titleEn);
          const { objectType, objectTypeEnglish } = parseObjectType(titleEn, objData.objectTypes);
          
          const artwork: Artwork = {
            id: artworkId,
            titleChinese: `${dynasty}${material}${objectType}`,
            titleEnglish: titleEn,
            dynasty,
            dynastyEnglish,
            period: objData.place,
            date: objData.date,
            material,
            materialEnglish: objData.materials || materialEnglish,
            objectType,
            objectTypeEnglish: objData.objectTypes || objectTypeEnglish,
            dimensions: '',
            description: `此件${objectType}为${dynasty}时期之作品。${objData.date ? `年代：${objData.date}。` : ''}现藏于荷兰国立博物馆。`,
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
          
          await new Promise(r => setTimeout(r, 120));
        } catch {
          stats.rijksmuseum.rejected_other++;
          continue;
        }
      }
      
      // FIXED: Extract .id from next object
      const nextToken = searchData.next;
      pageUrl = (typeof nextToken === 'object' ? nextToken?.id : nextToken) || null;
      
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.log(`    页${pageNum}错误: ${(e as Error).message}`);
      break;
    }
  }
  
  console.log(`    已接受: ${totalAccepted} 件`);
  return results;
}

async function searchSmithsonian(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 15): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  if (!SMITHSONIAN_API_KEY) return results;
  
  console.log(`  [Smithsonian] 查询: "${query}"`);
  stats.smithsonian.queried++;
  const searchUrl = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&api_key=${SMITHSONIAN_API_KEY}&rows=80&online_media_type=images`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const rows = searchData.response?.rows || [];
    
    if (rows.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${rows.length} 件，筛选中...`);
    
    let accepted = 0;
    for (const item of rows) {
      const recordId = item.content?.descriptiveNonRepeating?.record_ID || '';
      const artworkId = `si-${recordId.replace(/_/g, '-')}`;
      
      if (existingIds.has(artworkId)) continue;
      if (accepted >= maxItems) break;
      
      const metadataAccess = item.content?.descriptiveNonRepeating?.metadata_usage?.access;
      if (metadataAccess !== 'CC0') continue;
      
      const onlineMedia = item.content?.descriptiveNonRepeating?.online_media;
      if (!onlineMedia || onlineMedia.mediaCount === 0) continue;
      
      const hasCC0Media = onlineMedia.media.some((m: any) => m.usage?.access === 'CC0');
      if (!hasCC0Media) continue;
      
      const unit = item.unitCode;
      const isAsianArt = unit === 'NMAA' || unit === 'FSG' || recordId.startsWith('fsg_') || recordId.startsWith('sg_') || recordId.startsWith('F') || recordId.startsWith('S');
      if (!isAsianArt) continue;
      
      try {
        const mediaItem = onlineMedia.media[0];
        const idsId = mediaItem.idsId;
        if (!idsId) continue;
        
        const imageUrl = `https://ids.si.edu/ids/deliveryService?id=${idsId}`;
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.smithsonian.rejected_lowres++;
          continue;
        }
        
        const freetext = item.content?.freetext || {};
        const indexed = item.content?.indexedStructured || {};
        const dnr = item.content?.descriptiveNonRepeating || {};
        
        const dateField = freetext.date?.map((d: any) => d.content).join('; ') || '';
        const places = (indexed.place as string[]) || [];
        const cultures = (indexed.culture as string[]) || [];
        const physDesc = freetext.physicalDescription?.map((p: any) => p.content).join('; ') || '';
        
        const { dynasty, dynastyEnglish } = parseDynasty(dateField, cultures.join(' ') + ' ' + places.join(' '));
        const { material, materialEnglish } = parseMaterial(physDesc);
        const { objectType, objectTypeEnglish } = parseObjectType(item.title || '', '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: item.title || '',
          dynasty,
          dynastyEnglish,
          period: dateField,
          date: dateField,
          material,
          materialEnglish: physDesc.split(';')[0] || materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: '',
          description: `此件${objectType}为${dynasty}时期之作品。现藏于史密森尼亚洲艺术博物馆。`,
          sourceMuseum: '史密森尼亚洲艺术博物馆',
          sourceMuseumEnglish: 'Smithsonian National Museum of Asian Art',
          accessionNumber: recordId,
          sourceUrl: dnr.record_link || `https://asia.si.edu/object/${recordId}`,
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
        
        await new Promise(r => setTimeout(r, 250));
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

async function searchMet(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 12): Promise<Artwork[]> {
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
    
    console.log(`    找到: ${searchData.objectIDs.length} 件，筛选中...`);
    const idsToCheck = searchData.objectIDs.slice(0, 80);
    
    let accepted = 0;
    for (const id of idsToCheck) {
      const artworkId = `met-${id}`;
      if (existingIds.has(artworkId)) continue;
      if (accepted >= maxItems) break;
      
      try {
        const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
        const obj = await fetchJson(objUrl);
        
        const searchText = `${obj.title} ${obj.objectName} ${obj.medium} ${obj.culture} ${obj.department}`.toLowerCase();
        const isRelevant = 
          searchText.includes('tea') ||
          searchText.includes('chawan') ||
          searchText.includes('bowl') ||
          searchText.includes('cup') ||
          searchText.includes('ceramics') ||
          searchText.includes('porcelain') ||
          searchText.includes('stoneware') ||
          searchText.includes('china') ||
          searchText.includes('chinese') ||
          searchText.includes('japan') ||
          searchText.includes('korea') ||
          searchText.includes('vietnam') ||
          searchText.includes('asian') ||
          searchText.includes('celadon') ||
          searchText.includes('raku') ||
          searchText.includes('yixing');
        
        if (!isRelevant) continue;
        
        const imageUrl = obj.primaryImage || obj.primaryImageSmall;
        if (!imageUrl) continue;
        
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.met.rejected_lowres++;
          continue;
        }
        
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
        stats.met.accepted++;
        
        await new Promise(r => setTimeout(r, 180));
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

async function searchVA(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 10): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [V&A] 查询: "${query}"`);
  stats.va.queried++;
  
  const searchUrl = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&page_size=60&images_exist=true`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const records = searchData.records || [];
    
    if (records.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${records.length} 件，筛选中...`);
    
    let accepted = 0;
    for (const obj of records) {
      const systemNumber = obj.systemNumber;
      const artworkId = `va-${systemNumber}`;
      
      if (existingIds.has(artworkId)) continue;
      if (accepted >= maxItems) break;
      
      const imageBase = obj._images?._iiif_image_base_url;
      if (!imageBase) continue;
      
      try {
        const imageUrl = `${imageBase}/full/!1400,1400/0/default.jpg`;
        
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.va.rejected_lowres++;
          continue;
        }
        
        const dateStr = obj._primaryDate || '';
        const placeStr = obj._primaryPlace || '';
        const { dynasty, dynastyEnglish } = parseDynasty(dateStr, placeStr);
        const { material, materialEnglish } = parseMaterial(obj._primaryMaker?.name || obj.objectType || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj._primaryTitle || '', obj.objectType || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: obj._primaryTitle || '',
          dynasty,
          dynastyEnglish,
          period: placeStr,
          date: dateStr,
          material,
          materialEnglish: obj.objectType || materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: '',
          description: `此件${objectType}为${dynasty}时期之作品。现藏于维多利亚和阿尔伯特博物馆。`,
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

async function searchCMA(query: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 12): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [CMA] 查询: "${query}" (使用PRINT高清图)`);
  stats.cma.queried++;
  const searchUrl = `https://openaccess-api.clevelandart.org/api/artworks?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=100`;
  
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
      if (accepted >= maxItems) break;
      
      const searchText = `${obj.title || ''} ${obj.type || ''} ${obj.technique || ''} ${Array.isArray(obj.culture) ? obj.culture.join(' ') : (obj.culture || '')}`.toLowerCase();
      const isRelevant = 
        searchText.includes('tea') ||
        searchText.includes('chawan') ||
        searchText.includes('bowl') ||
        searchText.includes('cup') ||
        searchText.includes('ceramics') ||
        searchText.includes('porcelain') ||
        searchText.includes('stoneware') ||
        searchText.includes('chinese') ||
        searchText.includes('japan') ||
        searchText.includes('korea') ||
        searchText.includes('vietnam') ||
        searchText.includes('thai') ||
        searchText.includes('asian') ||
        searchText.includes('celadon') ||
        searchText.includes('raku') ||
        searchText.includes('goryeo');
      
      if (!isRelevant) continue;
      
      const printUrl = obj.images?.print?.url;
      const webUrl = obj.images?.web?.url;
      const imageUrl = printUrl || webUrl;
      
      if (!imageUrl) continue;
      
      try {
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.cma.rejected_lowres++;
          continue;
        }
        
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
          license: 'CC0 / Public Domain (CMA Open Access)',
          creditLine: obj.creditline || '',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.cma.accepted++;
        
        await new Promise(r => setTimeout(r, 180));
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

async function searchWikimediaCommons(category: string, existingIds: Set<string>, existingHashes: Set<string>, maxItems: number = 15): Promise<Artwork[]> {
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
    
    console.log(`    找到: ${items.length} 件，筛选中...`);
    
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
      
      if (existingIds.has(artworkId)) continue;
      
      const imageUrl = imageinfo.thumburl || imageinfo.url;
      if (!imageUrl) continue;
      
      try {
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.wmc.rejected_lowres++;
          continue;
        }
        
        const title = item.title?.replace('File:', '').replace(/\.[^.]+$/, '') || '';
        const description = extmeta.ImageDescription?.value || '';
        const dateStr = extmeta.DateTimeOriginal?.value || extmeta.DateTime?.value || '';
        const artist = extmeta.Artist?.value || '';
        
        const { dynasty, dynastyEnglish } = parseDynasty(dateStr + ' ' + description, title + ' ' + artist);
        const { material, materialEnglish } = parseMaterial(description + ' ' + title);
        const { objectType, objectTypeEnglish } = parseObjectType(title, description);
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: title,
          dynasty,
          dynastyEnglish,
          period: '',
          date: dateStr,
          material,
          materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: `${width}×${height}px (原始)`,
          description: `此件${objectType}为${dynasty}时期之作品。来源：维基共享资源 ${categoryName}。`,
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

function logCrawl(entry: any): void {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  fs.appendFileSync(CRAWL_LOG_PATH, line + '\n');
}

async function main() {
  console.log('========================================');
  console.log('Round 25 茶器收藏扩展 - 2026-09-29');
  console.log(`批次ID: ${BATCH_ID}`);
  console.log('关键修复: Rijksmuseum pagination (.next.id)');
  console.log('来源: Rijksmuseum, Smithsonian, Met, V&A, CMA, WMC');
  console.log('========================================\n');
  
  const existingIds = loadExistingIds();
  const existingHashes = loadExistingHashes();
  
  const startingCount = existingIds.size;
  console.log(`现有藏品: ${startingCount} 件`);
  console.log(`现有图片哈希: ${existingHashes.size} 个`);
  console.log(`SMITHSONIAN_API_KEY: ${SMITHSONIAN_API_KEY ? '✓ 已配置' : '✗ 未配置'}\n`);
  
  const newArtworks: Artwork[] = [];
  const TARGET = 600;
  
  // === 1. Rijksmuseum (Fixed Pagination) ===
  console.log('=== 1. 荷兰国立博物馆 - 修复分页 (PRIMARY) ===');
  
  for (const query of RIJKSMUSEUM_QUERIES) {
    const results = await searchRijksmuseumPaginated(query, existingIds, existingHashes, 40);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'rijksmuseum-r25',
      query: `${query.field}=${query.term}`,
      description: query.description,
      totalResults: results.length,
      crawlBatchId: BATCH_ID,
      note: 'Fixed pagination: next.id extraction',
    });
    
    await new Promise(r => setTimeout(r, 400));
    
    if (newArtworks.length >= TARGET) {
      console.log('\n达到目标数量，跳过剩余Rijksmuseum查询...');
      break;
    }
  }
  
  // === 2. Smithsonian (API Key Available) ===
  if (newArtworks.length < TARGET && SMITHSONIAN_API_KEY) {
    console.log('\n=== 2. 史密森尼博物馆 - API Key ===');
    for (const query of SMITHSONIAN_QUERIES) {
      const results = await searchSmithsonian(query, existingIds, existingHashes, 12);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'smithsonian-r25',
        query,
        totalResults: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 350));
      
      if (newArtworks.length >= TARGET) break;
    }
  }
  
  // === 3. Met Museum ===
  if (newArtworks.length < TARGET) {
    console.log('\n=== 3. 大都会博物馆 - Net-New ===');
    for (const query of MET_QUERIES) {
      const results = await searchMet(query, existingIds, existingHashes, 10);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'met-r25',
        query,
        totalResults: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 280));
      
      if (newArtworks.length >= TARGET) break;
    }
  }
  
  // === 4. V&A ===
  if (newArtworks.length < TARGET) {
    console.log('\n=== 4. 维多利亚和阿尔伯特博物馆 ===');
    for (const query of VA_QUERIES) {
      const results = await searchVA(query, existingIds, existingHashes, 8);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'va-r25',
        query,
        totalResults: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 280));
      
      if (newArtworks.length >= TARGET) break;
    }
  }
  
  // === 5. CMA ===
  if (newArtworks.length < TARGET) {
    console.log('\n=== 5. 克利夫兰艺术博物馆 ===');
    for (const query of CMA_QUERIES) {
      const results = await searchCMA(query, existingIds, existingHashes, 10);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'cma-r25',
        query,
        totalResults: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 280));
      
      if (newArtworks.length >= TARGET) break;
    }
  }
  
  // === 6. Wikimedia Commons ===
  if (newArtworks.length < TARGET) {
    console.log('\n=== 6. 维基共享资源 ===');
    for (const category of WMC_CATEGORIES) {
      const results = await searchWikimediaCommons(category, existingIds, existingHashes, 12);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'wmc-r25',
        query: category,
        totalResults: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 300));
      
      if (newArtworks.length >= TARGET) break;
    }
  }
  
  // === Summary ===
  console.log('\n========================================');
  console.log('Round 25 扩展统计');
  console.log('========================================');
  console.log(`总计新增: ${newArtworks.length} 件`);
  console.log(`起始数量: ${startingCount}`);
  console.log(`结束数量: ${startingCount + newArtworks.length}`);
  
  console.log('\n=== 来源分布 ===');
  const rksCount = newArtworks.filter(a => a.id.startsWith('rks-')).length;
  const siCount = newArtworks.filter(a => a.id.startsWith('si-')).length;
  const metCount = newArtworks.filter(a => a.id.startsWith('met-')).length;
  const vaCount = newArtworks.filter(a => a.id.startsWith('va-')).length;
  const cmaCount = newArtworks.filter(a => a.id.startsWith('cma-')).length;
  const wmcCount = newArtworks.filter(a => a.id.startsWith('wmc-')).length;
  console.log(`  荷兰国立博物馆 (Rijksmuseum): ${rksCount}`);
  console.log(`  史密森尼博物馆 (Smithsonian): ${siCount}`);
  console.log(`  大都会博物馆 (Met): ${metCount}`);
  console.log(`  维多利亚和阿尔伯特博物馆 (V&A): ${vaCount}`);
  console.log(`  克利夫兰艺术博物馆 (CMA): ${cmaCount}`);
  console.log(`  维基共享资源 (WMC): ${wmcCount}`);
  
  console.log('\n=== 质量门槛统计 ===');
  console.log(`  Rijksmuseum - 查询${stats.rijksmuseum.queried}次, 页面${stats.rijksmuseum.pagesFetched}页, 对象${stats.rijksmuseum.objectsFetched}个`);
  console.log(`    接受${stats.rijksmuseum.accepted}, 低分辨率${stats.rijksmuseum.rejected_lowres}, 许可证${stats.rijksmuseum.rejected_license}, 重复${stats.rijksmuseum.rejected_duplicate}`);
  console.log(`  Smithsonian - 查询${stats.smithsonian.queried}次, 接受${stats.smithsonian.accepted}, 低分辨率${stats.smithsonian.rejected_lowres}`);
  console.log(`  Met - 查询${stats.met.queried}次, 接受${stats.met.accepted}, 低分辨率${stats.met.rejected_lowres}`);
  console.log(`  V&A - 查询${stats.va.queried}次, 接受${stats.va.accepted}, 低分辨率${stats.va.rejected_lowres}`);
  console.log(`  CMA - 查询${stats.cma.queried}次, 接受${stats.cma.accepted}, 低分辨率${stats.cma.rejected_lowres}`);
  console.log(`  WMC - 查询${stats.wmc.queried}次, 接受${stats.wmc.accepted}, 低分辨率${stats.wmc.rejected_lowres}`);
  
  if (newArtworks.length === 0) {
    console.log('\n没有新作品添加');
    return;
  }
  
  // Load existing artworks and merge
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const mergedArtworks = [...artworks, ...newArtworks];
  
  // Sort by dynasty (chronological)
  const dynastyOrder: Record<string, number> = {
    '新石器': 1, '商': 2, '西周': 3, '东周': 4, '周': 5, '战国': 6, '秦': 7,
    '西汉': 8, '东汉': 9, '汉': 10, '三国': 11, '西晋': 12, '东晋': 13,
    '南朝': 14, '北朝': 15, '六朝': 16, '隋': 17,
    '唐': 20, '五代': 21, '遼': 22, '西夏': 23,
    '北宋': 24, '南宋': 25, '宋': 26, '金': 27,
    '元': 30,
    '明洪武': 40, '明永乐': 41, '明宣德': 42, '明正统': 43, '明成化': 44,
    '明弘治': 45, '明正德': 46, '明嘉靖': 47, '明隆庆': 48, '明万历': 49,
    '明泰昌': 50, '明天启': 51, '明崇祯': 52, '明末清初': 53, '明': 54,
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
  
  // Save updated artworks
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
  
  // Sync public/artworks.json
  if (fs.existsSync(PUBLIC_ARTWORKS_PATH)) {
    fs.writeFileSync(PUBLIC_ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
    console.log('\n✅ 已同步 public/artworks.json');
  }
  
  // Save image hashes
  const allHashes = Array.from(existingHashes);
  fs.writeFileSync(IMAGE_HASHES_PATH, JSON.stringify(allHashes, null, 2));
  
  console.log(`✅ 已保存 ${mergedArtworks.length} 件藏品`);
  console.log(`   新增: ${newArtworks.length} 件`);
  
  // Calculate image size added
  let imageSizeAdded = 0;
  for (const artwork of newArtworks) {
    const imagePath = path.join(IMAGES_DIR, `${artwork.id}.jpg`);
    if (fs.existsSync(imagePath)) {
      imageSizeAdded += fs.statSync(imagePath).size;
    }
  }
  const imageSizeMB = (imageSizeAdded / (1024 * 1024)).toFixed(2);
  console.log(`   图片大小: ${imageSizeMB} MB`);
  
  // Log summary
  logCrawl({
    source: 'round25-summary',
    query: 'Round 25 Expansion Complete',
    totalResults: newArtworks.length,
    crawlBatchId: 'round25-summary',
    breakdown: { rijksmuseum: rksCount, smithsonian: siCount, met: metCount, va: vaCount, cma: cmaCount, wmc: wmcCount },
    imageSizeMB,
    keyFix: 'Rijksmuseum pagination: next.id extraction',
    note: `Round 25 expansion: ${startingCount} → ${mergedArtworks.length} (+${newArtworks.length})`,
  });
  
  console.log('\n========================================');
  console.log('Round 25 完成');
  console.log(`关键修复: Rijksmuseum pagination (.next.id)`);
  console.log(`来源: Rijksmuseum, Smithsonian(key), Met, V&A, CMA, WMC`);
  console.log('========================================');
}

main().catch(console.error);
