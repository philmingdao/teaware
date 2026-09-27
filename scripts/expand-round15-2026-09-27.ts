/**
 * Round 15 Expansion Script - 2026-09-27
 * 
 * Target: Add ~100+ net-new quality teaware pieces
 * 
 * Key-free sources (priority):
 * - Met Museum Open Access API
 * - Cleveland Museum of Art Open Access API  
 * - Smithsonian Open Access (SMITHSONIAN_API_KEY available)
 * 
 * Constraints:
 * - CC0 / Public Domain / CC BY only (no NC licenses)
 * - Self-host all images (download + compress via sharp)
 * - SHA256 dedupe against existing images
 * - Focus on Chinese/Asian ceramics & tea ware
 * - Clear 简体 Chinese labels
 * 
 * Quality Gate (2026-09-27):
 * - REQUIRED: max(width, height) >= 1200 pixels (source image before compression)
 * - Images below this threshold are rejected regardless of other quality factors
 * - This gate was introduced to ensure gallery images are sharp on high-DPI displays
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
const BATCH_ID = `round15-expansion-${Date.now()}`;

const SMITHSONIAN_API_KEY = process.env.SMITHSONIAN_API_KEY;

// Quality gate: reject source images with longest edge < 1200px
const MIN_LONGEST_EDGE = 1200;

// New queries not yet tried (based on crawl-log analysis)
const MET_QUERIES = [
  // Glaze types not yet queried
  'iron rust glaze China',
  'mirror black glaze',
  'clair de lune glaze',
  'apple green glaze China',
  'lavender glaze China',
  'turquoise glaze China porcelain',
  'lemon yellow glaze',
  'imperial yellow glaze',
  
  // Specific forms
  'conical bowl China',
  'wine pot China',
  'warming bowl China',
  'spouted bowl China',
  'lotus bowl China',
  'chrysanthemum bowl China',
  
  // Reign marks
  'Hongzhi porcelain',
  'Zhengde porcelain',
  'Tianqi porcelain',
  'Chongzhen porcelain',
  'Tongzhi porcelain',
  'Xianfeng porcelain',
  
  // Export ware
  'Kraak porcelain',
  'Swatow ware',
  'Transitional porcelain Ming Qing',
  
  // Japanese tea ceremony
  'Raku tea bowl black',
  'Raku tea bowl red',
  'Mino ware tea bowl',
  'Iga ware',
  'Tamba ware',
  
  // Korean
  'Buncheong ware',
  'moon jar Korea',
  'punchong',
  
  // Special decorations
  'dragon bowl China',
  'phoenix cup China',
  'lotus petal bowl',
  'peony bowl China',
  'prunus vase China',
];

const CMA_QUERIES = [
  // Specific glazes
  'iron glaze',
  'ash glaze Asian',
  'slip decorated',
  
  // Forms
  'ewer Asian',
  'wine vessel Asian',
  'covered box Asian',
  'brush pot Chinese',
  
  // Japanese
  'Mino ware',
  'Iga ware',
  'Tamba ware',
  'Tokoname',
  
  // Korean  
  'moon jar',
  'punchong',
  
  // Decorations
  'dragon Chinese',
  'phoenix Chinese',
  'landscape Chinese porcelain',
  'scholar Chinese',
];

const SMITHSONIAN_QUERIES = [
  // Tea specific
  'tea ceremony Japan',
  'tea utensil',
  'sencha tea',
  
  // Glazes
  'copper red glaze',
  'iron glaze ceramic',
  'ash glaze',
  
  // Forms
  'incense burner Asian',
  'brush washer',
  'water dropper Asian',
  
  // Regional
  'Cizhou ware',
  'Jingdezhen porcelain',
  'Fujian ceramic',
  
  // Periods
  'Song dynasty ceramic',
  'Yuan dynasty porcelain',
  'Ming export',
  
  // Japanese
  'Seto ware',
  'Mino tea',
  'Kyoto ceramic',
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
    } catch { /* ignore parse errors */ }
  }
  return completed;
}

function fetch(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://philmingdao.github.io/teaware/; round15-expansion)',
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

async function compressImage(imageData: Buffer, outputPath: string): Promise<boolean> {
  try {
    const image = sharp(imageData);
    const metadata = await image.metadata();
    
    // Quality gate: reject if longest edge < MIN_LONGEST_EDGE
    const longestEdge = Math.max(metadata.width || 0, metadata.height || 0);
    if (longestEdge < MIN_LONGEST_EDGE) {
      console.log(`    ❌ 质量门槛未通过: ${metadata.width}x${metadata.height} (最长边=${longestEdge}px < ${MIN_LONGEST_EDGE}px)`);
      return false;
    }
    
    await image
      .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(outputPath);
    return true;
  } catch (e) {
    console.log(`    压缩失败: ${(e as Error).message}`);
    return false;
  }
}

function parseDynasty(date: string, culture: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture).toLowerCase();
  
  if (lower.includes('edo')) return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
  if (lower.includes('muromachi')) return { dynasty: '室町', dynastyEnglish: 'Muromachi Period (Japan)' };
  if (lower.includes('momoyama')) return { dynasty: '桃山', dynastyEnglish: 'Momoyama Period (Japan)' };
  if (lower.includes('meiji')) return { dynasty: '明治', dynastyEnglish: 'Meiji Period (Japan)' };
  if (lower.includes('joseon') || lower.includes('choson') || lower.includes('yi dynasty')) return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)' };
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
  if (lower.includes('hongzhi')) return { dynasty: '明弘治', dynastyEnglish: 'Ming Dynasty (Hongzhi)' };
  if (lower.includes('zhengde')) return { dynasty: '明正德', dynastyEnglish: 'Ming Dynasty (Zhengde)' };
  if (lower.includes('jiajing')) return { dynasty: '明嘉靖', dynastyEnglish: 'Ming Dynasty (Jiajing)' };
  if (lower.includes('wanli')) return { dynasty: '明万历', dynastyEnglish: 'Ming Dynasty (Wanli)' };
  if (lower.includes('tianqi')) return { dynasty: '明天启', dynastyEnglish: 'Ming Dynasty (Tianqi)' };
  if (lower.includes('chongzhen')) return { dynasty: '明崇祯', dynastyEnglish: 'Ming Dynasty (Chongzhen)' };
  if (lower.includes('transitional')) return { dynasty: '明末清初', dynastyEnglish: 'Transitional Period' };
  if (lower.includes('ming') || lower.includes('1368') || lower.includes('1644')) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  if (lower.includes('kangxi')) return { dynasty: '清康熙', dynastyEnglish: 'Qing Dynasty (Kangxi)' };
  if (lower.includes('yongzheng')) return { dynasty: '清雍正', dynastyEnglish: 'Qing Dynasty (Yongzheng)' };
  if (lower.includes('qianlong')) return { dynasty: '清乾隆', dynastyEnglish: 'Qing Dynasty (Qianlong)' };
  if (lower.includes('jiaqing')) return { dynasty: '清嘉庆', dynastyEnglish: 'Qing Dynasty (Jiaqing)' };
  if (lower.includes('daoguang')) return { dynasty: '清道光', dynastyEnglish: 'Qing Dynasty (Daoguang)' };
  if (lower.includes('xianfeng')) return { dynasty: '清咸丰', dynastyEnglish: 'Qing Dynasty (Xianfeng)' };
  if (lower.includes('tongzhi')) return { dynasty: '清同治', dynastyEnglish: 'Qing Dynasty (Tongzhi)' };
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
  if (lower.includes('cizhou')) return { material: '磁州窑', materialEnglish: 'Cizhou Ware' };
  if (lower.includes('ge') && lower.includes('ware')) return { material: '哥窑', materialEnglish: 'Ge Ware' };
  if (lower.includes('ru') && lower.includes('ware')) return { material: '汝窑', materialEnglish: 'Ru Ware' };
  if (lower.includes('guan')) return { material: '官窑', materialEnglish: 'Guan Ware' };
  if (lower.includes('longquan')) return { material: '龙泉青瓷', materialEnglish: 'Longquan Celadon' };
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes("hare's fur") || lower.includes('oil spot')) return { material: '建盏', materialEnglish: 'Jian Ware' };
  if (lower.includes('qingbai')) return { material: '青白瓷', materialEnglish: 'Qingbai Ware' };
  if (lower.includes('kraak')) return { material: '克拉克瓷', materialEnglish: 'Kraak Porcelain' };
  if (lower.includes('swatow')) return { material: '汕头瓷', materialEnglish: 'Swatow Ware' };
  if (lower.includes('lacquer')) return { material: '漆器', materialEnglish: 'Lacquerware' };
  if (lower.includes('sancai')) return { material: '三彩', materialEnglish: 'Sancai' };
  if (lower.includes('copper red') || lower.includes('sang de boeuf') || lower.includes('ox blood') || lower.includes('peachbloom')) return { material: '釉里红/郎窑红', materialEnglish: 'Copper Red Glaze' };
  if (lower.includes('flambe') || lower.includes('flambé')) return { material: '窑变釉', materialEnglish: 'Flambé Glaze' };
  if (lower.includes('powder blue')) return { material: '洒蓝釉', materialEnglish: 'Powder Blue Glaze' };
  if (lower.includes('mirror black')) return { material: '乌金釉', materialEnglish: 'Mirror Black Glaze' };
  if (lower.includes('clair de lune') || lower.includes('moonlight')) return { material: '月白釉', materialEnglish: 'Clair de Lune Glaze' };
  if (lower.includes('apple green')) return { material: '苹果绿釉', materialEnglish: 'Apple Green Glaze' };
  if (lower.includes('imperial yellow') || lower.includes('lemon yellow')) return { material: '黄釉', materialEnglish: 'Imperial Yellow Glaze' };
  if (lower.includes('turquoise')) return { material: '孔雀蓝釉', materialEnglish: 'Turquoise Glaze' };
  if (lower.includes('lavender')) return { material: '淡紫釉', materialEnglish: 'Lavender Glaze' };
  if (lower.includes('iron rust') || lower.includes('rust')) return { material: '铁锈釉', materialEnglish: 'Iron Rust Glaze' };
  if (lower.includes('cloisonne') || lower.includes('cloisonné') || lower.includes('enamel')) return { material: '珐琅/景泰蓝', materialEnglish: 'Cloisonné/Enamel' };
  if (lower.includes('iron')) return { material: '铁器', materialEnglish: 'Iron' };
  if (lower.includes('raku')) return { material: '乐烧', materialEnglish: 'Raku Ware' };
  if (lower.includes('satsuma')) return { material: '萨摩烧', materialEnglish: 'Satsuma Ware' };
  if (lower.includes('kutani')) return { material: '九谷烧', materialEnglish: 'Kutani Ware' };
  if (lower.includes('imari') || lower.includes('arita')) return { material: '伊万里烧', materialEnglish: 'Imari Ware' };
  if (lower.includes('hagi')) return { material: '萩烧', materialEnglish: 'Hagi Ware' };
  if (lower.includes('karatsu')) return { material: '唐津烧', materialEnglish: 'Karatsu Ware' };
  if (lower.includes('oribe')) return { material: '织部烧', materialEnglish: 'Oribe Ware' };
  if (lower.includes('bizen')) return { material: '备前烧', materialEnglish: 'Bizen Ware' };
  if (lower.includes('shigaraki')) return { material: '信乐烧', materialEnglish: 'Shigaraki Ware' };
  if (lower.includes('mino')) return { material: '美浓烧', materialEnglish: 'Mino Ware' };
  if (lower.includes('iga')) return { material: '伊贺烧', materialEnglish: 'Iga Ware' };
  if (lower.includes('tamba')) return { material: '丹波烧', materialEnglish: 'Tamba Ware' };
  if (lower.includes('seto')) return { material: '濑户烧', materialEnglish: 'Seto Ware' };
  if (lower.includes('buncheong') || lower.includes('punchong')) return { material: '粉青沙器', materialEnglish: 'Buncheong (Punchong)' };
  if (lower.includes('porcelain') || lower.includes('ceramic')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  if (lower.includes('stoneware')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('earthenware')) return { material: '陶器', materialEnglish: 'Earthenware' };
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
  if (lower.includes('wine pot') || lower.includes('wine ewer')) return { objectType: '酒壶', objectTypeEnglish: 'Wine Pot' };
  if (lower.includes('wine cup')) return { objectType: '酒杯', objectTypeEnglish: 'Wine Cup' };
  if (lower.includes('cup')) return { objectType: '杯盏', objectTypeEnglish: 'Cup' };
  if (lower.includes('ewer')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('moon jar')) return { objectType: '月亮罐', objectTypeEnglish: 'Moon Jar' };
  if (lower.includes('conical bowl')) return { objectType: '斗笠碗', objectTypeEnglish: 'Conical Bowl' };
  if (lower.includes('warming bowl')) return { objectType: '温碗', objectTypeEnglish: 'Warming Bowl' };
  if (lower.includes('bowl')) return { objectType: '碗', objectTypeEnglish: 'Bowl' };
  if (lower.includes('saucer')) return { objectType: '碟', objectTypeEnglish: 'Saucer' };
  if (lower.includes('dish') || lower.includes('plate')) return { objectType: '盘', objectTypeEnglish: 'Dish/Plate' };
  if (lower.includes('vase')) return { objectType: '瓶', objectTypeEnglish: 'Vase' };
  if (lower.includes('jar')) return { objectType: '罐', objectTypeEnglish: 'Jar' };
  if (lower.includes('incense') || lower.includes('censer')) return { objectType: '香炉', objectTypeEnglish: 'Incense Burner' };
  if (lower.includes('brush pot') || lower.includes('brush holder')) return { objectType: '笔筒', objectTypeEnglish: 'Brush Pot' };
  if (lower.includes('water dropper')) return { objectType: '水滴', objectTypeEnglish: 'Water Dropper' };
  if (lower.includes('brush washer')) return { objectType: '笔洗', objectTypeEnglish: 'Brush Washer' };
  return { objectType: '器物', objectTypeEnglish: 'Object' };
}

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
    const idsToCheck = searchData.objectIDs.slice(0, 60);
    
    let accepted = 0;
    for (const id of idsToCheck) {
      const artworkId = `met-${id}`;
      if (existingIds.has(artworkId)) continue;
      
      try {
        const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
        const obj = await fetchJson(objUrl);
        
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
          searchText.includes('china') ||
          searchText.includes('chinese') ||
          searchText.includes('japan') ||
          searchText.includes('korea') ||
          searchText.includes('asian') ||
          searchText.includes('enamel') ||
          searchText.includes('glaze') ||
          searchText.includes('vase') ||
          searchText.includes('jar') ||
          searchText.includes('dish') ||
          searchText.includes('incense') ||
          searchText.includes('censer');
        
        if (!isRelevant) continue;
        
        const imageUrl = obj.primaryImage || obj.primaryImageSmall;
        if (!imageUrl) continue;
        
        const imageData = await fetch(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) continue;
        
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
        
        if (accepted >= 10) break;
        
        await new Promise(r => setTimeout(r, 300));
      } catch {
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
      
      const searchText = `${obj.title} ${obj.type} ${obj.technique} ${obj.culture}`.toLowerCase();
      const isRelevant = 
        searchText.includes('tea') ||
        searchText.includes('cup') ||
        searchText.includes('bowl') ||
        searchText.includes('teapot') ||
        searchText.includes('ewer') ||
        searchText.includes('ceramics') ||
        searchText.includes('porcelain') ||
        searchText.includes('china') ||
        searchText.includes('chinese') ||
        searchText.includes('japan') ||
        searchText.includes('korea') ||
        searchText.includes('asian') ||
        searchText.includes('glaze') ||
        searchText.includes('vase') ||
        searchText.includes('jar');
      
      if (!isRelevant) continue;
      
      const imageUrl = obj.images?.web?.url;
      if (!imageUrl) continue;
      
      try {
        const imageData = await fetch(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) continue;
        
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
        
        if (accepted >= 8) break;
        
        await new Promise(r => setTimeout(r, 250));
      } catch {
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

async function searchSmithsonian(query: string, existingIds: Set<string>, existingHashes: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  if (!SMITHSONIAN_API_KEY) {
    console.log(`  [Smithsonian] 跳过: API key 未配置`);
    return results;
  }
  
  console.log(`  [Smithsonian] 查询: "${query}"`);
  const searchUrl = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&api_key=${SMITHSONIAN_API_KEY}&rows=50&online_media_type=images`;
  
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
      
      // Check for CC0 license
      const metadataAccess = item.content?.descriptiveNonRepeating?.metadata_usage?.access;
      if (metadataAccess !== 'CC0') continue;
      
      const onlineMedia = item.content?.descriptiveNonRepeating?.online_media;
      if (!onlineMedia || onlineMedia.mediaCount === 0) continue;
      
      const hasCC0Media = onlineMedia.media.some((m: any) => m.usage?.access === 'CC0');
      if (!hasCC0Media) continue;
      
      // Prioritize Asian Art museums
      const unit = item.unitCode;
      const isAsianArt = unit === 'NMAA' || unit === 'FSG' || recordId.startsWith('fsg_') || recordId.startsWith('sg_');
      if (!isAsianArt) continue;
      
      try {
        const mediaItem = onlineMedia.media[0];
        const idsId = mediaItem.idsId;
        if (!idsId) continue;
        
        const imageUrl = `https://ids.si.edu/ids/deliveryService?id=${idsId}`;
        const imageData = await fetch(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) continue;
        
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
        console.log(`    + ${artworkId}: ${item.title?.substring(0, 50)}`);
        
        if (accepted >= 10) break;
        
        await new Promise(r => setTimeout(r, 400));
      } catch {
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
  console.log('====================================');
  console.log('Round 15 茶器收藏扩展 - 2026-09-27');
  console.log(`批次ID: ${BATCH_ID}`);
  console.log('====================================\n');
  
  const existingIds = loadExistingIds();
  const existingAccessions = loadExistingAccessions();
  const existingHashes = loadExistingHashes();
  const completedQueries = loadCompletedQueries();
  
  const startingCount = existingIds.size;
  console.log(`现有藏品: ${startingCount} 件`);
  console.log(`已完成查询: ${completedQueries.size} 个`);
  console.log(`Smithsonian API Key: ${SMITHSONIAN_API_KEY ? '✓ 已配置' : '✗ 未配置'}`);
  console.log(`Rijksmuseum API Key: ✗ 未配置 (跳过)`);
  console.log(`NPM Taiwan API Key: ✗ 未配置 (跳过)\n`);
  
  const newArtworks: Artwork[] = [];
  
  // Met Museum queries
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
    
    await new Promise(r => setTimeout(r, 500));
    
    if (newArtworks.length >= 120) break;
  }
  
  // CMA queries
  if (newArtworks.length < 120) {
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
      
      await new Promise(r => setTimeout(r, 400));
      
      if (newArtworks.length >= 120) break;
    }
  }
  
  // Smithsonian queries
  if (newArtworks.length < 120 && SMITHSONIAN_API_KEY) {
    console.log('\n=== 史密森尼博物馆查询 ===');
    for (const query of SMITHSONIAN_QUERIES) {
      if (completedQueries.has(`smithsonian:${query}`)) {
        console.log(`  [跳过] smithsonian:${query} (已完成)`);
        continue;
      }
      
      const results = await searchSmithsonian(query, existingIds, existingHashes);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'smithsonian',
        query,
        totalResults: results.length,
        idsAccepted: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 600));
      
      if (newArtworks.length >= 120) break;
    }
  }
  
  console.log('\n====================================');
  console.log(`总计新增: ${newArtworks.length} 件`);
  console.log(`起始数量: ${startingCount}`);
  console.log(`结束数量: ${startingCount + newArtworks.length}`);
  console.log('====================================\n');
  
  if (newArtworks.length === 0) {
    console.log('没有新作品添加');
    return;
  }
  
  // Load existing artworks and merge
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const mergedArtworks = [...artworks, ...newArtworks];
  
  // Sort by dynasty (chronological)
  const dynastyOrder: Record<string, number> = {
    '唐': 1, '五代': 2, '北宋': 3, '南宋': 4, '宋': 5, '遼': 6, '金': 7,
    '元': 8, '明': 9, '明永乐': 10, '明宣德': 11, '明成化': 12, '明弘治': 13, '明正德': 14,
    '明嘉靖': 15, '明万历': 16, '明天启': 17, '明崇祯': 18, '明末清初': 19,
    '清': 20, '清康熙': 21, '清雍正': 22, '清乾隆': 23, '清嘉庆': 24, '清道光': 25,
    '清咸丰': 26, '清同治': 27, '清光绪': 28,
    '民国': 29, '高麗': 30, '朝鮮': 31, '室町': 40, '桃山': 41, '江戸': 42, '明治': 43,
    '日本': 44, '韩国': 45, '越南': 50, '中国': 60, '东亚': 100,
  };
  
  mergedArtworks.sort((a, b) => {
    const orderA = dynastyOrder[a.dynasty] || 100;
    const orderB = dynastyOrder[b.dynasty] || 100;
    return orderA - orderB;
  });
  
  // Save updated artworks
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(mergedArtworks, null, 2));
  
  // Sync public/artworks.json
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
  const siCount = newArtworks.filter(a => a.id.startsWith('si-')).length;
  
  console.log('\n=== 来源分布 ===');
  console.log(`  大都会博物馆 (Met): ${metCount}`);
  console.log(`  克利夫兰艺术博物馆 (CMA): ${cmaCount}`);
  console.log(`  史密森尼博物馆: ${siCount}`);
  
  // Log summary
  logCrawl({
    source: 'round15-summary',
    query: 'Round 15 Expansion Complete',
    totalResults: newArtworks.length,
    idsAccepted: newArtworks.length,
    crawlBatchId: 'round15-summary',
    breakdown: { met: metCount, cma: cmaCount, smithsonian: siCount },
    note: `Round 15 expansion: ${startingCount} → ${mergedArtworks.length} (+${newArtworks.length}). Key-free sources only.`,
  });
}

main().catch(console.error);
