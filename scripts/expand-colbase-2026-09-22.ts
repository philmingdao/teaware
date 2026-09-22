/**
 * ColBase Open Data Expansion Script - 2026-09-22
 * 
 * Target: Add ~50-150 net-new quality tea ceremony ceramics from ColBase
 * Sources: Tokyo National Museum (TNM), Kyoto National Museum, Kyushu National Museum, Nara National Museum
 * 
 * Key constraints:
 * - CC BY license (as specified by ColBase opendata.tsv コンテンツの権利区分 = ccby)
 * - Internet-accessible images (コンテンツの公開状況 = internet)
 * - Compress images to max 1400px long edge, JPEG q80
 * - SHA256 dedupe against existing images
 * - Update crawl log for deduplication
 * 
 * ColBase data source: https://colbase.nich.go.jp/opendata.tsv (TSV format)
 * Terms: https://colbase.nich.go.jp/pages/term?locale=en - cite source; respect third-party rights
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

interface ColBaseRow {
  jpsId: string;
  url: string;
  accessionNumber: string;
  culturalPropertyDesignation: string;
  genre: string;
  titleJa: string;
  titleKana: string;
  quantity: string;
  artist: string;
  countryOrigin: string;
  excavationSite: string;
  periodCentury: string;
  material: string;
  size: string;
  inscriptions: string;
  donor: string;
  holder: string;
  description: string;
  imageUrl: string;
  museumId: string;
  collectionKey: string;
  collectionItemId: string;
  id: string;
  contentStatus: string;
  contentRights: string;
  category: string;
  titleEn: string;
  genreEn: string;
  materialEn: string;
  sizeEn: string;
  holderEn: string;
  descriptionEn: string;
  earliestPeriod: string;
  latestPeriod: string;
}

const ROOT = process.cwd();
const ARTWORKS_PATH = path.join(ROOT, 'src', 'data', 'artworks.json');
const PUBLIC_ARTWORKS_PATH = path.join(ROOT, 'public', 'artworks.json');
const CRAWL_LOG_PATH = path.join(ROOT, 'research', 'crawl-log.jsonl');
const IMAGE_HASHES_PATH = path.join(ROOT, 'research', 'image-hashes.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'artworks');
const TSV_PATH = '/tmp/colbase-opendata.tsv';
const BATCH_ID = `colbase-expansion-${Date.now()}`;

// Target keywords for tea-related ceramics
const TEA_KEYWORDS = [
  '茶碗', '茶入', '茶壺', '茶器', '茶杓', '茶盌',
  '天目', '楽焼', '楽茶碗', '萩焼', '萩茶碗', '織部',
  '備前', '信楽', '唐津', '青磁茶碗', '瀬戸茶碗', '美濃茶碗',
  '志野', '黄瀬戸', '御本', '高麗茶碗', '井戸茶碗',
  'chawan', 'tea bowl', 'tea caddy', 'tenmoku',
  'Raku', 'Hagi', 'Oribe', 'Bizen', 'Shigaraki', 'Karatsu'
];

// Museum name mappings
const MUSEUM_NAMES: Record<string, { zh: string; en: string }> = {
  '東京国立博物館': { zh: '东京国立博物馆', en: 'Tokyo National Museum' },
  '京都国立博物館 Kyoto National Museum': { zh: '京都国立博物馆', en: 'Kyoto National Museum' },
  '九州国立博物館': { zh: '九州国立博物馆', en: 'Kyushu National Museum' },
  '奈良国立博物館': { zh: '奈良国立博物馆', en: 'Nara National Museum' },
};

function loadExistingIds(): Set<string> {
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  return new Set(artworks.map(a => a.id));
}

function loadExistingAccessions(): Set<string> {
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  return new Set(artworks.filter(a => a.accessionNumber).map(a => a.accessionNumber.toLowerCase()));
}

function loadExistingSourceUrls(): Set<string> {
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  return new Set(artworks.filter(a => a.sourceUrl).map(a => a.sourceUrl.toLowerCase()));
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

function fetch(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://philmingdao.github.io/teaware/; colbase-expansion)',
        'Accept': 'image/*,*/*',
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

function isValidImage(buffer: Buffer): boolean {
  if (buffer.length < 10000) return false; // Minimum size for quality
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  return isJpeg || isPng;
}

function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parsePeriod(periodJa: string, periodEn: string): { dynasty: string; dynastyEnglish: string; period: string } {
  const combined = `${periodJa} ${periodEn}`.toLowerCase();
  
  // Japanese periods
  if (combined.includes('江戸') || combined.includes('edo')) {
    if (combined.includes('17世紀') || combined.includes('17th')) return { dynasty: '江戸前期', dynastyEnglish: 'Edo Period (Early)', period: periodJa || periodEn };
    if (combined.includes('18世紀') || combined.includes('18th')) return { dynasty: '江戸中期', dynastyEnglish: 'Edo Period (Middle)', period: periodJa || periodEn };
    if (combined.includes('19世紀') || combined.includes('19th')) return { dynasty: '江戸後期', dynastyEnglish: 'Edo Period (Late)', period: periodJa || periodEn };
    return { dynasty: '江戸', dynastyEnglish: 'Edo Period', period: periodJa || periodEn };
  }
  if (combined.includes('桃山') || combined.includes('momoyama')) return { dynasty: '桃山', dynastyEnglish: 'Momoyama Period', period: periodJa || periodEn };
  if (combined.includes('室町') || combined.includes('muromachi')) return { dynasty: '室町', dynastyEnglish: 'Muromachi Period', period: periodJa || periodEn };
  if (combined.includes('鎌倉') || combined.includes('kamakura')) return { dynasty: '鎌倉', dynastyEnglish: 'Kamakura Period', period: periodJa || periodEn };
  if (combined.includes('平安') || combined.includes('heian')) return { dynasty: '平安', dynastyEnglish: 'Heian Period', period: periodJa || periodEn };
  if (combined.includes('明治') || combined.includes('meiji')) return { dynasty: '明治', dynastyEnglish: 'Meiji Period', period: periodJa || periodEn };
  if (combined.includes('大正') || combined.includes('taisho')) return { dynasty: '大正', dynastyEnglish: 'Taisho Period', period: periodJa || periodEn };
  if (combined.includes('昭和') || combined.includes('showa')) return { dynasty: '昭和', dynastyEnglish: 'Showa Period', period: periodJa || periodEn };
  
  // Korean periods
  if (combined.includes('朝鮮') || combined.includes('joseon') || combined.includes('choson') || combined.includes('yi dynasty')) {
    return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)', period: periodJa || periodEn };
  }
  if (combined.includes('高麗') || combined.includes('goryeo') || combined.includes('koryo')) {
    return { dynasty: '高麗', dynastyEnglish: 'Goryeo Dynasty (Korea)', period: periodJa || periodEn };
  }
  
  // Chinese periods
  if (combined.includes('唐') || combined.includes('tang')) return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty', period: periodJa || periodEn };
  if (combined.includes('宋') || combined.includes('song')) {
    if (combined.includes('北宋') || combined.includes('northern')) return { dynasty: '北宋', dynastyEnglish: 'Northern Song', period: periodJa || periodEn };
    if (combined.includes('南宋') || combined.includes('southern')) return { dynasty: '南宋', dynastyEnglish: 'Southern Song', period: periodJa || periodEn };
    return { dynasty: '宋', dynastyEnglish: 'Song Dynasty', period: periodJa || periodEn };
  }
  if (combined.includes('元') || combined.includes('yuan')) return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty', period: periodJa || periodEn };
  if (combined.includes('明') || combined.includes('ming')) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty', period: periodJa || periodEn };
  if (combined.includes('清') || combined.includes('qing')) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty', period: periodJa || periodEn };
  
  // Default to Japanese if from Japanese museum
  return { dynasty: '日本', dynastyEnglish: 'Japan', period: periodJa || periodEn };
}

function parseMaterial(titleJa: string, materialJa: string, materialEn: string): { material: string; materialEnglish: string; kiln?: string; kilnEnglish?: string } {
  const combined = `${titleJa} ${materialJa} ${materialEn}`.toLowerCase();
  
  // Tea ceremony wares
  if (combined.includes('楽') || combined.includes('raku')) {
    return { material: '乐烧', materialEnglish: 'Raku Ware', kiln: '楽焼', kilnEnglish: 'Raku' };
  }
  if (combined.includes('萩') || combined.includes('hagi')) {
    return { material: '萩烧', materialEnglish: 'Hagi Ware', kiln: '萩', kilnEnglish: 'Hagi' };
  }
  if (combined.includes('織部') || combined.includes('oribe')) {
    return { material: '织部烧', materialEnglish: 'Oribe Ware', kiln: '織部', kilnEnglish: 'Oribe' };
  }
  if (combined.includes('備前') || combined.includes('bizen')) {
    return { material: '备前烧', materialEnglish: 'Bizen Ware', kiln: '備前', kilnEnglish: 'Bizen' };
  }
  if (combined.includes('信楽') || combined.includes('shigaraki')) {
    return { material: '信乐烧', materialEnglish: 'Shigaraki Ware', kiln: '信楽', kilnEnglish: 'Shigaraki' };
  }
  if (combined.includes('唐津') || combined.includes('karatsu')) {
    return { material: '唐津烧', materialEnglish: 'Karatsu Ware', kiln: '唐津', kilnEnglish: 'Karatsu' };
  }
  if (combined.includes('志野') || combined.includes('shino')) {
    return { material: '志野烧', materialEnglish: 'Shino Ware', kiln: '志野', kilnEnglish: 'Shino' };
  }
  if (combined.includes('瀬戸') || combined.includes('seto')) {
    return { material: '濑户烧', materialEnglish: 'Seto Ware', kiln: '瀬戸', kilnEnglish: 'Seto' };
  }
  if (combined.includes('美濃') || combined.includes('mino')) {
    return { material: '美浓烧', materialEnglish: 'Mino Ware', kiln: '美濃', kilnEnglish: 'Mino' };
  }
  if (combined.includes('京') || combined.includes('kyoto')) {
    return { material: '京烧', materialEnglish: 'Kyoto Ware', kiln: '京焼', kilnEnglish: 'Kyoto' };
  }
  if (combined.includes('黄瀬戸') || combined.includes('ki-seto')) {
    return { material: '黄濑户', materialEnglish: 'Ki-Seto Ware', kiln: '黄瀬戸', kilnEnglish: 'Ki-Seto' };
  }
  
  // Chinese ceramics
  if (combined.includes('天目') || combined.includes('tenmoku')) {
    return { material: '天目', materialEnglish: 'Tenmoku', kiln: '建窑', kilnEnglish: 'Jian Kilns' };
  }
  if (combined.includes('青磁') || combined.includes('celadon')) {
    return { material: '青瓷', materialEnglish: 'Celadon' };
  }
  if (combined.includes('染付') || combined.includes('blue and white') || combined.includes('sometsuke')) {
    return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  }
  if (combined.includes('色絵') || combined.includes('overglaze') || combined.includes('iro-e')) {
    return { material: '彩绘瓷', materialEnglish: 'Overglaze Enamel' };
  }
  if (combined.includes('白磁') || combined.includes('white porcelain')) {
    return { material: '白瓷', materialEnglish: 'White Porcelain' };
  }
  
  // Korean
  if (combined.includes('御本') || combined.includes('gohon')) {
    return { material: '御本', materialEnglish: 'Gohon Ware (Korea)' };
  }
  if (combined.includes('井戸') || combined.includes('ido')) {
    return { material: '井户茶碗', materialEnglish: 'Ido Tea Bowl (Korea)' };
  }
  if (combined.includes('高麗') || combined.includes('goryeo') || combined.includes('koryo')) {
    return { material: '高丽瓷', materialEnglish: 'Goryeo Celadon' };
  }
  
  // Generic
  if (combined.includes('陶器') || combined.includes('stoneware') || combined.includes('earthenware')) {
    return { material: '陶器', materialEnglish: 'Stoneware' };
  }
  if (combined.includes('磁器') || combined.includes('porcelain')) {
    return { material: '瓷器', materialEnglish: 'Porcelain' };
  }
  
  return { material: '陶瓷', materialEnglish: 'Ceramics' };
}

function parseObjectType(titleJa: string, titleEn: string): { objectType: string; objectTypeEnglish: string } {
  const combined = `${titleJa} ${titleEn}`.toLowerCase();
  
  if (combined.includes('茶碗') || combined.includes('tea bowl') || combined.includes('chawan')) {
    return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  }
  if (combined.includes('茶入') || combined.includes('tea caddy') || combined.includes('chaire')) {
    return { objectType: '茶入', objectTypeEnglish: 'Tea Caddy (Chaire)' };
  }
  if (combined.includes('茶壺') || combined.includes('tea jar') || combined.includes('chatsubo')) {
    return { objectType: '茶壺', objectTypeEnglish: 'Tea Jar' };
  }
  if (combined.includes('水指') || combined.includes('water jar') || combined.includes('mizusashi')) {
    return { objectType: '水指', objectTypeEnglish: 'Water Jar (Mizusashi)' };
  }
  if (combined.includes('茶杓') || combined.includes('tea scoop') || combined.includes('chashaku')) {
    return { objectType: '茶杓', objectTypeEnglish: 'Tea Scoop (Chashaku)' };
  }
  if (combined.includes('蓋物') || combined.includes('lidded')) {
    return { objectType: '盖物', objectTypeEnglish: 'Lidded Container' };
  }
  if (combined.includes('香炉') || combined.includes('incense burner')) {
    return { objectType: '香炉', objectTypeEnglish: 'Incense Burner' };
  }
  if (combined.includes('花入') || combined.includes('flower vase')) {
    return { objectType: '花入', objectTypeEnglish: 'Flower Vase' };
  }
  if (combined.includes('天目台') || combined.includes('tea bowl stand')) {
    return { objectType: '天目台', objectTypeEnglish: 'Tea Bowl Stand' };
  }
  if (combined.includes('天目')) {
    return { objectType: '天目茶碗', objectTypeEnglish: 'Tenmoku Tea Bowl' };
  }
  
  // Fallback to tea bowl for tea ceremony items
  return { objectType: '茶器', objectTypeEnglish: 'Tea Utensil' };
}

function getFullResImageUrl(thumbnailUrl: string): string {
  // Convert: /media/tnm/G-14/image/slideshow_s/G-14_C0021850.jpg
  // To:      /media/tnm/G-14/image/G-14_C0021850.jpg
  return thumbnailUrl.replace('/slideshow_s/', '/');
}

function extractMuseumId(url: string): string {
  // Extract museum ID from URL like https://colbase.nich.go.jp/collection_items/tnm/G-14
  const match = url.match(/collection_items\/([^/]+)\//);
  return match ? match[1] : 'colbase';
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

function parseColBaseTSV(tsvPath: string): ColBaseRow[] {
  const content = fs.readFileSync(tsvPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const header = lines[0].split('\t');
  
  // Map header indices
  const idx: Record<string, number> = {};
  header.forEach((h, i) => idx[h] = i);
  
  const rows: ColBaseRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split('\t');
    
    const row: ColBaseRow = {
      jpsId: cols[idx['JPS_ID']] || '',
      url: cols[idx['URL']] || '',
      accessionNumber: cols[idx['機関管理番号']] || '',
      culturalPropertyDesignation: cols[idx['文化財指定']] || '',
      genre: cols[idx['分類']] || '',
      titleJa: cols[idx['作品名']] || '',
      titleKana: cols[idx['作品名かな']] || '',
      quantity: cols[idx['員数']] || '',
      artist: cols[idx['作者']] || '',
      countryOrigin: cols[idx['制作地']] || '',
      excavationSite: cols[idx['出土地']] || '',
      periodCentury: cols[idx['時代世紀']] || '',
      material: cols[idx['品質形状']] || '',
      size: cols[idx['法量']] || '',
      inscriptions: cols[idx['銘文等']] || '',
      donor: cols[idx['寄贈者']] || '',
      holder: cols[idx['所蔵者']] || '',
      description: cols[idx['解説']] || '',
      imageUrl: cols[idx['代表画像URL']] || '',
      museumId: cols[idx['機関識別子']] || '',
      collectionKey: cols[idx['コレクションキー']] || '',
      collectionItemId: cols[idx['コレクション内ID']] || '',
      id: cols[idx['ID']] || '',
      contentStatus: cols[idx['コンテンツの公開状況']] || '',
      contentRights: cols[idx['コンテンツの権利区分']] || '',
      category: cols[idx['種別']] || '',
      titleEn: cols[idx['Title of work']] || '',
      genreEn: cols[idx['Genre']] || '',
      materialEn: cols[idx['Material']] || '',
      sizeEn: cols[idx['Size']] || '',
      holderEn: cols[idx['Holder']] || '',
      descriptionEn: cols[idx['Description']] || '',
      earliestPeriod: cols[idx['Earliest Period']] || '',
      latestPeriod: cols[idx['Latest Period']] || '',
    };
    
    rows.push(row);
  }
  
  return rows;
}

function matchesTeaKeywords(row: ColBaseRow): boolean {
  const searchText = `${row.titleJa} ${row.titleEn} ${row.genre} ${row.genreEn} ${row.description} ${row.descriptionEn}`;
  return TEA_KEYWORDS.some(kw => searchText.toLowerCase().includes(kw.toLowerCase()));
}

function isCeramicItem(row: ColBaseRow): boolean {
  const combined = `${row.genre} ${row.genreEn} ${row.material} ${row.materialEn}`.toLowerCase();
  return combined.includes('陶磁') || combined.includes('ceramic') || combined.includes('porcelain') || 
         combined.includes('stoneware') || combined.includes('陶器') || combined.includes('磁器');
}

function hasValidLicense(row: ColBaseRow): boolean {
  return row.contentStatus === 'internet' && 
         (row.contentRights === 'ccby' || row.contentRights === 'cc0' || row.contentRights === 'pd');
}

async function main() {
  console.log('\n========================================');
  console.log(' ColBase 開放数据茶器扩展');
  console.log(' ColBase Open Data Teaware Expansion');
  console.log('========================================\n');
  
  console.log(`批次ID: ${BATCH_ID}`);
  console.log(`数据源: ColBase TSV (https://colbase.nich.go.jp/opendata.tsv)`);
  console.log(`许可证: CC BY (需标注来源)\n`);
  
  // Check if TSV exists
  if (!fs.existsSync(TSV_PATH)) {
    console.error(`ERROR: TSV file not found at ${TSV_PATH}`);
    console.error('Please download the ColBase opendata.tsv first:');
    console.error('  curl -L -o /tmp/colbase-opendata.tsv "https://colbase.nich.go.jp/opendata.tsv"');
    process.exit(1);
  }
  
  // Load existing data for deduplication
  const existingIds = loadExistingIds();
  const existingAccessions = loadExistingAccessions();
  const existingSourceUrls = loadExistingSourceUrls();
  const existingHashes = loadExistingHashes();
  
  console.log(`现有作品: ${existingIds.size} 件`);
  console.log(`现有哈希: ${existingHashes.size} 个\n`);
  
  // Parse TSV
  console.log('解析 ColBase TSV 数据...');
  const allRows = parseColBaseTSV(TSV_PATH);
  console.log(`总记录数: ${allRows.length.toLocaleString()} 条\n`);
  
  // Filter for tea-related ceramic items with valid licenses
  console.log('筛选茶器陶瓷作品...');
  const candidateRows = allRows.filter(row => 
    matchesTeaKeywords(row) && 
    isCeramicItem(row) && 
    hasValidLicense(row) &&
    row.imageUrl
  );
  
  console.log(`符合条件的候选作品: ${candidateRows.length} 件\n`);
  
  // Group by museum for reporting
  const byMuseum: Record<string, ColBaseRow[]> = {};
  for (const row of candidateRows) {
    const museum = row.holder || 'Unknown';
    if (!byMuseum[museum]) byMuseum[museum] = [];
    byMuseum[museum].push(row);
  }
  
  console.log('来源博物馆分布:');
  for (const [museum, rows] of Object.entries(byMuseum)) {
    console.log(`  - ${museum}: ${rows.length} 件`);
  }
  console.log('');
  
  // Process candidates (limit to ~100 for this batch)
  const TARGET_COUNT = 100;
  const allNewArtworks: Artwork[] = [];
  const processedUrls = new Set<string>();
  
  // Shuffle candidates to get variety across museums
  const shuffled = [...candidateRows].sort(() => Math.random() - 0.5);
  
  console.log(`开始处理 (目标: ${TARGET_COUNT} 件)...\n`);
  
  for (const row of shuffled) {
    if (allNewArtworks.length >= TARGET_COUNT) break;
    
    // Skip duplicates
    const museumId = extractMuseumId(row.url);
    const artworkId = `colbase-${museumId}-${row.accessionNumber.replace(/[^\w-]/g, '-')}`;
    
    if (existingIds.has(artworkId)) {
      continue;
    }
    if (existingAccessions.has(row.accessionNumber.toLowerCase())) {
      continue;
    }
    if (existingSourceUrls.has(row.url.toLowerCase())) {
      continue;
    }
    if (processedUrls.has(row.url)) {
      continue;
    }
    
    processedUrls.add(row.url);
    
    try {
      // Get full-res image URL
      const fullResUrl = getFullResImageUrl(row.imageUrl);
      
      console.log(`  [${allNewArtworks.length + 1}/${TARGET_COUNT}] ${row.titleJa || row.titleEn}`);
      console.log(`    ID: ${artworkId}`);
      console.log(`    Image: ${fullResUrl.substring(0, 80)}...`);
      
      // Download image
      const imageData = await fetch(fullResUrl);
      
      if (!isValidImage(imageData)) {
        console.log(`    跳过: 无效图像`);
        continue;
      }
      
      // Check hash for duplicate
      const hash = hashBuffer(imageData);
      if (existingHashes.has(hash)) {
        console.log(`    跳过: 重复图像 (哈希)`);
        continue;
      }
      
      // Save temporarily and compress
      const tempPath = path.join('/tmp', `${artworkId}-temp.jpg`);
      const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
      
      fs.writeFileSync(tempPath, imageData);
      
      const compressed = await compressImage(tempPath, finalPath);
      if (!compressed) {
        console.log(`    跳过: 压缩失败`);
        fs.unlinkSync(tempPath);
        continue;
      }
      fs.unlinkSync(tempPath);
      
      // Parse metadata
      const { dynasty, dynastyEnglish, period } = parsePeriod(row.periodCentury, row.earliestPeriod || '');
      const { material, materialEnglish, kiln, kilnEnglish } = parseMaterial(row.titleJa, row.material, row.materialEn);
      const { objectType, objectTypeEnglish } = parseObjectType(row.titleJa, row.titleEn);
      
      const museumInfo = MUSEUM_NAMES[row.holder] || { zh: row.holder, en: row.holderEn || row.holder };
      
      // Build description
      let desc = row.description || row.descriptionEn || '';
      desc = desc.replace(/<[^>]+>/g, '').trim(); // Remove HTML tags
      if (!desc) {
        desc = `此件${objectType}为${dynasty}时期之作品。${material ? `采用${material}工艺制成。` : ''}${row.size ? `尺寸：${row.size}。` : ''}现藏于${museumInfo.zh}。`;
      }
      
      const artwork: Artwork = {
        id: artworkId,
        titleChinese: `${dynasty}${material}${objectType}`,
        titleEnglish: row.titleEn || row.titleJa,
        dynasty,
        dynastyEnglish,
        period,
        date: row.periodCentury || period,
        material,
        materialEnglish: row.materialEn || materialEnglish,
        objectType,
        objectTypeEnglish,
        kiln,
        kilnEnglish,
        dimensions: row.size || row.sizeEn,
        description: desc,
        sourceMuseum: museumInfo.zh,
        sourceMuseumEnglish: museumInfo.en,
        accessionNumber: row.accessionNumber,
        sourceUrl: row.url,
        imageUrl: `/artworks/${artworkId}.jpg`,
        imageAlt: `${row.titleEn || row.titleJa} - ${row.periodCentury || dynasty}`,
        license: 'CC BY (ColBase)',
        creditLine: `Source: ColBase (${row.holder}). Licensed under CC BY.`,
        crawlBatchId: BATCH_ID,
      };
      
      allNewArtworks.push(artwork);
      existingIds.add(artworkId);
      existingAccessions.add(row.accessionNumber.toLowerCase());
      existingHashes.add(hash);
      
      console.log(`    ✓ 添加成功\n`);
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`    错误: ${(e as Error).message}\n`);
      continue;
    }
  }
  
  console.log(`\n总计新增: ${allNewArtworks.length} 件作品`);
  
  if (allNewArtworks.length === 0) {
    console.log('没有新作品添加');
    return;
  }
  
  // Load and update artworks.json
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  artworks.push(...allNewArtworks);
  
  // Sort by dynasty
  const dynastyOrder: Record<string, number> = {
    '唐': 1, '五代': 2, '北宋': 3, '南宋': 4, '宋': 3, '遼': 3, '金': 4,
    '元': 5, '明': 6, '清': 7,
    '高麗': 8, '朝鮮': 9,
    '平安': 10, '鎌倉': 11, '室町': 12, '桃山': 13, '江戸': 14, '江戸前期': 14, '江戸中期': 14, '江戸後期': 14,
    '明治': 15, '大正': 16, '昭和': 17,
    '日本': 20, '韩国': 21, '中国': 22, '东亚': 30,
  };
  
  artworks.sort((a, b) => (dynastyOrder[a.dynasty] || 99) - (dynastyOrder[b.dynasty] || 99));
  
  // Save
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(artworks, null, 2));
  fs.writeFileSync(PUBLIC_ARTWORKS_PATH, JSON.stringify(artworks, null, 2));
  
  // Update image hashes
  const allHashes = Array.from(existingHashes);
  fs.writeFileSync(IMAGE_HASHES_PATH, JSON.stringify(allHashes, null, 2));
  
  // Log to crawl log
  const logEntry = {
    timestamp: new Date().toISOString(),
    source: 'colbase',
    query: 'tea ceramics (茶碗/茶入/天目/楽/萩/織部/備前/信楽/唐津)',
    totalResults: candidateRows.length,
    idsAccepted: allNewArtworks.length,
    idsRejected: candidateRows.length - allNewArtworks.length,
    crawlBatchId: BATCH_ID,
    museums: Object.keys(byMuseum),
    note: 'ColBase opendata.tsv expansion - Japanese national museum teaware',
  };
  fs.appendFileSync(CRAWL_LOG_PATH, JSON.stringify(logEntry) + '\n');
  
  console.log('\n========================================');
  console.log(' 扩展完成 / Expansion Complete');
  console.log('========================================');
  console.log(`新增作品: ${allNewArtworks.length} 件`);
  console.log(`总作品数: ${artworks.length} 件`);
  console.log(`批次ID: ${BATCH_ID}`);
  
  // Print summary by museum
  const newByMuseum: Record<string, number> = {};
  for (const a of allNewArtworks) {
    newByMuseum[a.sourceMuseum] = (newByMuseum[a.sourceMuseum] || 0) + 1;
  }
  
  console.log(`\n新增作品来源分布:`);
  for (const [museum, count] of Object.entries(newByMuseum).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${museum}: ${count} 件`);
  }
  
  // Print sample highlights
  console.log(`\n精选作品预览:`);
  const highlights = allNewArtworks.slice(0, 5);
  for (const h of highlights) {
    console.log(`  • ${h.titleEnglish}`);
    console.log(`    ${h.dynasty} / ${h.material} / ${h.sourceMuseumEnglish}`);
  }
}

main().catch(console.error);
