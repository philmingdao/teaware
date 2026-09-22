/**
 * Smithsonian Open Access Expansion Script - 2026-09-22
 * 
 * Target: Add ~50-150 net-new quality tea/ceramic pieces from Smithsonian Institution
 * Focus: Freer Gallery of Art / Arthur M. Sackler Gallery / National Museum of Asian Art (NMAA, FSG)
 * 
 * Key constraints:
 * - CC0 / Open Access only
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

interface SmithsonianItem {
  id: string;
  title: string;
  unitCode: string;
  content: {
    freetext: Record<string, Array<{ label: string; content: string }>>;
    indexedStructured: Record<string, unknown>;
    descriptiveNonRepeating: {
      record_ID: string;
      data_source: string;
      record_link?: string;
      guid?: string;
      online_media?: {
        media: Array<{
          idsId: string;
          type: string;
          usage: { access: string };
          content: string;
          resources?: Array<{
            label: string;
            url: string;
            width?: number;
            height?: number;
          }>;
        }>;
        mediaCount: number;
      };
      metadata_usage?: { access: string };
    };
  };
}

const ROOT = process.cwd();
const ARTWORKS_PATH = path.join(ROOT, 'src', 'data', 'artworks.json');
const PUBLIC_ARTWORKS_PATH = path.join(ROOT, 'public', 'artworks.json');
const CRAWL_LOG_PATH = path.join(ROOT, 'research', 'crawl-log.jsonl');
const IMAGE_HASHES_PATH = path.join(ROOT, 'research', 'image-hashes.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'artworks');
const BATCH_ID = `smithsonian-expansion-${Date.now()}`;

const SMITHSONIAN_API_KEY = process.env.SMITHSONIAN_API_KEY;

if (!SMITHSONIAN_API_KEY) {
  console.error('ERROR: SMITHSONIAN_API_KEY environment variable is not set');
  process.exit(1);
}

console.log('✓ SMITHSONIAN_API_KEY is available');

// Target queries for tea/ceramic related items from Asian Art museums
const SEARCH_QUERIES = [
  // Tea-specific queries
  'tea bowl Freer',
  'tea bowl China',
  'tea bowl Japan',
  'tea bowl Korea',
  'teapot Chinese',
  'teapot Japanese',
  'tea caddy',
  'chawan',
  'gaiwan',
  
  // Ceramic type queries
  'celadon bowl',
  'celadon vase',
  'porcelain cup China',
  'porcelain bowl China',
  'stoneware bowl China',
  'blue white porcelain',
  'famille rose',
  'Yixing teapot',
  'Jian ware',
  'Raku tea',
  'Jun ware',
  'Ding ware',
  'Longquan',
  'Dehua porcelain',
  
  // Dynasty/period specific
  'Song dynasty bowl',
  'Ming dynasty cup',
  'Qing dynasty teapot',
  'Tang dynasty cup',
  'Edo period tea',
  
  // Museum-specific
  'Freer ceramics',
  'Sackler ceramics',
  'Asian Art ceramics bowl',
  'Asian Art tea',
  
  // Japanese tea culture
  'tetsubin',
  'iron kettle Japan',
  'chashaku bamboo',
  'Kyoto ware',
  'Satsuma tea',
  'Hagi ware',
  'Oribe ware',
  'Bizen ware',
  'Shigaraki',
  
  // Korean ceramics
  'Goryeo celadon',
  'buncheong',
  
  // Enamel and cloisonné
  'cloisonne teapot',
  'Canton enamel',
  'painted enamel China',
  
  // Special glazes
  'hare fur bowl',
  'oil spot glaze',
  'copper red bowl',
  'sang de boeuf',
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

function fetch(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://github.com/philmingdao/teaware; smithsonian-expansion)',
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

function parseDynasty(date: string, culture: string, place: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture + ' ' + place).toLowerCase();
  
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
  if (lower.includes('japan') || lower.includes('kyoto') || lower.includes('tokyo')) return { dynasty: '日本', dynastyEnglish: 'Japan' };
  if (lower.includes('korea')) return { dynasty: '韩国', dynastyEnglish: 'Korea' };
  return { dynasty: '东亚', dynastyEnglish: 'East Asia' };
}

function parseMaterial(medium: string, topics: string[]): { material: string; materialEnglish: string } {
  const lower = (medium + ' ' + topics.join(' ')).toLowerCase();
  
  if (lower.includes('famille verte')) return { material: '五彩瓷', materialEnglish: 'Famille Verte Porcelain' };
  if (lower.includes('famille rose')) return { material: '粉彩瓷', materialEnglish: 'Famille Rose Porcelain' };
  if (lower.includes('doucai')) return { material: '斗彩瓷', materialEnglish: 'Doucai Porcelain' };
  if (lower.includes('wucai')) return { material: '五彩瓷', materialEnglish: 'Wucai Porcelain' };
  if (lower.includes('blue and white') || lower.includes('blue-and-white')) return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  if (lower.includes('celadon')) return { material: '青瓷', materialEnglish: 'Celadon' };
  if (lower.includes('blanc de chine') || lower.includes('dehua')) return { material: '德化白瓷', materialEnglish: 'Blanc de Chine (Dehua)' };
  if (lower.includes('yixing') || lower.includes('zisha')) return { material: '宜兴紫砂', materialEnglish: 'Yixing Zisha' };
  if (lower.includes('jun') || lower.includes('chün')) return { material: '钧瓷', materialEnglish: 'Jun Ware' };
  if (lower.includes('ding ware') || (lower.includes('ding') && lower.includes('ware'))) return { material: '定瓷', materialEnglish: 'Ding Ware' };
  if (lower.includes('ge') && lower.includes('ware')) return { material: '哥窑', materialEnglish: 'Ge Ware' };
  if (lower.includes('ru') && lower.includes('ware')) return { material: '汝窑', materialEnglish: 'Ru Ware' };
  if (lower.includes('guan ware') || (lower.includes('guan') && lower.includes('official'))) return { material: '官窑', materialEnglish: 'Guan Ware' };
  if (lower.includes('longquan')) return { material: '龙泉青瓷', materialEnglish: 'Longquan Celadon' };
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes("hare's fur") || lower.includes('hares fur') || lower.includes('oil spot')) return { material: '建盏', materialEnglish: 'Jian Ware' };
  if (lower.includes('qingbai')) return { material: '青白瓷', materialEnglish: 'Qingbai Ware' };
  if (lower.includes('lacquer')) return { material: '漆器', materialEnglish: 'Lacquerware' };
  if (lower.includes('sancai')) return { material: '三彩', materialEnglish: 'Sancai' };
  if (lower.includes('copper red') || lower.includes('sang de boeuf') || lower.includes('ox blood') || lower.includes('peachbloom')) return { material: '釉里红/郎窑红', materialEnglish: 'Copper Red Glaze' };
  if (lower.includes('flambe') || lower.includes('flambé')) return { material: '窑变釉', materialEnglish: 'Flambé Glaze' };
  if (lower.includes('powder blue')) return { material: '洒蓝釉', materialEnglish: 'Powder Blue Glaze' };
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
  if (lower.includes('kyoto')) return { material: '京烧', materialEnglish: 'Kyoto Ware' };
  if (lower.includes('rhinoceros') || lower.includes('horn')) return { material: '犀角', materialEnglish: 'Rhinoceros Horn' };
  if (lower.includes('porcelain')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  if (lower.includes('stoneware')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('earthenware')) return { material: '陶器', materialEnglish: 'Earthenware' };
  if (lower.includes('ceramic')) return { material: '陶瓷', materialEnglish: 'Ceramics' };
  if (lower.includes('bamboo')) return { material: '竹', materialEnglish: 'Bamboo' };
  return { material: '器物', materialEnglish: 'Object' };
}

function parseObjectType(title: string, objectTypes: string[]): { objectType: string; objectTypeEnglish: string } {
  const lower = (title + ' ' + objectTypes.join(' ')).toLowerCase();
  
  if (lower.includes('teapot') || lower.includes('tea pot')) return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  if (lower.includes('tetsubin') || lower.includes('iron kettle')) return { objectType: '铁壶', objectTypeEnglish: 'Tetsubin' };
  if (lower.includes('tea caddy') || lower.includes('tea canister') || lower.includes('tea jar')) return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  if (lower.includes('gaiwan') || lower.includes('covered tea')) return { objectType: '盖碗', objectTypeEnglish: 'Gaiwan' };
  if (lower.includes('chawan') || lower.includes('tea bowl')) return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  if (lower.includes('chashaku') || lower.includes('tea scoop')) return { objectType: '茶杓', objectTypeEnglish: 'Chashaku' };
  if (lower.includes('tea tray')) return { objectType: '茶盘', objectTypeEnglish: 'Tea Tray' };
  if (lower.includes('cup stand') || lower.includes('bowl stand')) return { objectType: '盏托', objectTypeEnglish: 'Cup/Bowl Stand' };
  if (lower.includes('stem cup')) return { objectType: '高足杯', objectTypeEnglish: 'Stem Cup' };
  if (lower.includes('libation cup')) return { objectType: '爵杯', objectTypeEnglish: 'Libation Cup' };
  if (lower.includes('wine cup')) return { objectType: '酒杯', objectTypeEnglish: 'Wine Cup' };
  if (lower.includes('cup')) return { objectType: '杯盏', objectTypeEnglish: 'Cup' };
  if (lower.includes('ewer')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('bowl')) return { objectType: '碗', objectTypeEnglish: 'Bowl' };
  if (lower.includes('saucer')) return { objectType: '碟', objectTypeEnglish: 'Saucer' };
  if (lower.includes('vase')) return { objectType: '瓶', objectTypeEnglish: 'Vase' };
  if (lower.includes('jar')) return { objectType: '罐', objectTypeEnglish: 'Jar' };
  if (lower.includes('dish') || lower.includes('plate')) return { objectType: '盘', objectTypeEnglish: 'Dish/Plate' };
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

function getMuseumNames(dataSource: string): { sourceMuseum: string; sourceMuseumEnglish: string } {
  const lower = dataSource.toLowerCase();
  if (lower.includes('asian art') || lower.includes('freer') || lower.includes('sackler')) {
    return {
      sourceMuseum: '史密森尼亚洲艺术博物馆 (弗利尔/赛克勒)',
      sourceMuseumEnglish: 'Smithsonian National Museum of Asian Art (Freer|Sackler)'
    };
  }
  if (lower.includes('american history')) {
    return {
      sourceMuseum: '史密森尼美国历史博物馆',
      sourceMuseumEnglish: 'Smithsonian National Museum of American History'
    };
  }
  return {
    sourceMuseum: '史密森尼学会',
    sourceMuseumEnglish: 'Smithsonian Institution'
  };
}

function extractFreetextField(freetext: Record<string, Array<{ content: string }>>, field: string): string {
  const arr = freetext[field];
  if (!arr || arr.length === 0) return '';
  return arr.map(f => f.content).join('; ');
}

async function searchSmithsonian(
  query: string,
  existingIds: Set<string>,
  existingAccessions: Set<string>,
  existingHashes: Set<string>,
  processedRecordIds: Set<string>
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [Smithsonian] 查询: "${query}"`);
  
  // Search with images filter and prioritize NMAA/FSG (Asian Art)
  const searchUrl = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&api_key=${SMITHSONIAN_API_KEY}&rows=100&online_media_type=images`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const rows: SmithsonianItem[] = searchData.response?.rows || [];
    const totalCount = searchData.response?.rowCount || 0;
    
    if (rows.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${totalCount} 件，筛选前 ${rows.length} 件...`);
    
    // Filter for relevant items (prioritize Asian Art museums)
    const relevantRows = rows.filter(item => {
      const unit = item.unitCode;
      const ds = item.content?.descriptiveNonRepeating?.data_source || '';
      const title = item.title || '';
      const recordId = item.content?.descriptiveNonRepeating?.record_ID || '';
      
      // Skip library/archive records
      if (recordId.startsWith('siris_sil') || ds.includes('Librar') || ds.includes('Archiv')) {
        return false;
      }
      
      // Skip if already processed in this run
      if (processedRecordIds.has(recordId)) {
        return false;
      }
      
      // Must have online media
      const onlineMedia = item.content?.descriptiveNonRepeating?.online_media;
      if (!onlineMedia || onlineMedia.mediaCount === 0) {
        return false;
      }
      
      // Check for CC0 license
      const metadataAccess = item.content?.descriptiveNonRepeating?.metadata_usage?.access;
      if (metadataAccess !== 'CC0') {
        return false;
      }
      
      // Check media is CC0
      const hasCC0Media = onlineMedia.media.some(m => m.usage?.access === 'CC0');
      if (!hasCC0Media) {
        return false;
      }
      
      // Prioritize Asian Art (NMAA, FSG) and relevant NMAH items
      const isAsianArt = unit === 'NMAA' || unit === 'FSG' || recordId.startsWith('fsg_') || recordId.startsWith('sg_');
      const isNMAH = unit === 'NMAH';
      
      // For NMAH, check if it's actually Asian tea-related
      if (isNMAH) {
        const titleLower = title.toLowerCase();
        const hasTeaKeyword = titleLower.includes('tea') || titleLower.includes('china') || 
                             titleLower.includes('chinese') || titleLower.includes('porcelain') ||
                             titleLower.includes('ceramic') || titleLower.includes('japan');
        if (!hasTeaKeyword) return false;
      }
      
      return isAsianArt || isNMAH;
    });
    
    console.log(`    筛选后: ${relevantRows.length} 件符合条件`);
    
    let accepted = 0;
    for (const item of relevantRows) {
      if (accepted >= 15) break; // Limit per query
      
      const recordId = item.content?.descriptiveNonRepeating?.record_ID || '';
      const artworkId = `si-${recordId.replace(/_/g, '-')}`;
      
      // Check for duplicate ID
      if (existingIds.has(artworkId)) {
        continue;
      }
      
      // Check accession number for duplicate
      const identifiers = item.content?.freetext?.identifier || [];
      const accessionEntry = identifiers.find(i => i.label.toLowerCase().includes('accession'));
      const accessionNumber = accessionEntry?.content || recordId;
      
      if (existingAccessions.has(accessionNumber.toLowerCase())) {
        continue;
      }
      
      try {
        // Get image URL from online_media
        const onlineMedia = item.content?.descriptiveNonRepeating?.online_media;
        if (!onlineMedia || !onlineMedia.media || onlineMedia.media.length === 0) {
          continue;
        }
        
        const mediaItem = onlineMedia.media[0];
        const idsId = mediaItem.idsId;
        if (!idsId) continue;
        
        // Use the delivery service URL for images
        const imageUrl = `https://ids.si.edu/ids/deliveryService?id=${idsId}`;
        
        // Download and validate image
        const imageData = await fetch(imageUrl);
        if (!isValidImage(imageData)) {
          continue;
        }
        
        // Check hash for duplicate
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          continue;
        }
        
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
        
        // Extract metadata
        const freetext = item.content?.freetext || {};
        const indexed = item.content?.indexedStructured || {};
        const dnr = item.content?.descriptiveNonRepeating || {};
        
        const dateField = extractFreetextField(freetext, 'date');
        const period = freetext.date?.find(d => d.label === 'Period')?.content || '';
        const places = (indexed.place as string[]) || [];
        const cultures = (indexed.culture as string[]) || [];
        const topics = (indexed.topic as string[]) || [];
        const objectTypes = (indexed.object_type as string[]) || [];
        const physDesc = extractFreetextField(freetext, 'physicalDescription');
        const creditLine = extractFreetextField(freetext, 'creditLine');
        const description = freetext.notes?.find(n => n.label === 'Description')?.content || '';
        
        const { dynasty, dynastyEnglish } = parseDynasty(dateField + ' ' + period, cultures.join(' '), places.join(' '));
        const { material, materialEnglish } = parseMaterial(physDesc, topics);
        const { objectType, objectTypeEnglish } = parseObjectType(item.title, objectTypes);
        const { sourceMuseum, sourceMuseumEnglish } = getMuseumNames(dnr.data_source || '');
        
        // Get dimensions from physical description
        const dimMatch = physDesc.match(/(\d+(?:\.\d+)?\s*(?:x\s*\d+(?:\.\d+)?)*\s*(?:cm|in|mm)[^;,]*)/i);
        const dimensions = dimMatch ? dimMatch[1] : '';
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: item.title || '',
          dynasty,
          dynastyEnglish,
          period: period || dateField,
          date: dateField,
          material,
          materialEnglish: physDesc.split(';')[0] || materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions,
          description: description || `此件${objectType}为${dynasty}时期之作品。${dimensions ? `尺寸：${dimensions}。` : ''}${sourceMuseum}藏品。`,
          sourceMuseum,
          sourceMuseumEnglish,
          accessionNumber,
          sourceUrl: dnr.record_link || `https://collections.si.edu/search/detail/${encodeURIComponent('edanmdm:' + recordId)}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${item.title} - ${dateField}`,
          license: 'CC0 / Public Domain (Smithsonian Open Access)',
          creditLine: creditLine || undefined,
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingAccessions.add(accessionNumber.toLowerCase());
        existingHashes.add(hash);
        processedRecordIds.add(recordId);
        accepted++;
        
        console.log(`    + ${artworkId}: ${item.title?.substring(0, 50)}`);
        
        // Rate limiting
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

async function main() {
  console.log('\n========================================');
  console.log(' 史密森尼开放获取数据扩展');
  console.log(' Smithsonian Open Access Expansion');
  console.log('========================================\n');
  
  console.log(`批次ID: ${BATCH_ID}`);
  console.log(`目标: Smithsonian NMAA/FSG (亚洲艺术博物馆)\n`);
  
  // Load existing data
  const existingIds = loadExistingIds();
  const existingAccessions = loadExistingAccessions();
  const existingHashes = loadExistingHashes();
  const completedQueries = loadCompletedQueries();
  const processedRecordIds = new Set<string>();
  
  console.log(`现有作品: ${existingIds.size} 件`);
  console.log(`现有哈希: ${existingHashes.size} 个`);
  console.log(`已完成查询: ${completedQueries.size} 个\n`);
  
  const allNewArtworks: Artwork[] = [];
  
  // Process queries
  for (const query of SEARCH_QUERIES) {
    const queryKey = `smithsonian:${query}`;
    if (completedQueries.has(queryKey)) {
      console.log(`  [跳过] 已完成: ${query}`);
      continue;
    }
    
    const newArtworks = await searchSmithsonian(query, existingIds, existingAccessions, existingHashes, processedRecordIds);
    allNewArtworks.push(...newArtworks);
    
    // Log to crawl log
    const logEntry = {
      timestamp: new Date().toISOString(),
      source: 'smithsonian',
      query,
      idsAccepted: newArtworks.length,
      crawlBatchId: BATCH_ID,
    };
    fs.appendFileSync(CRAWL_LOG_PATH, JSON.stringify(logEntry) + '\n');
    
    // Rate limit between queries
    await new Promise(r => setTimeout(r, 800));
  }
  
  console.log(`\n总计新增: ${allNewArtworks.length} 件作品`);
  
  if (allNewArtworks.length === 0) {
    console.log('没有新作品添加');
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
    '民国': 8, '中国': 9, '日本': 10, '高麗': 11, '朝鮮': 12, '韩国': 12, '越南': 13,
    '室町': 10, '桃山': 10, '江戸': 10, '明治': 10, '东亚': 20,
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
  
  // Print summary by source
  const asianArtCount = allNewArtworks.filter(a => 
    a.sourceMuseumEnglish.includes('Asian Art') || a.sourceMuseumEnglish.includes('Freer')
  ).length;
  const nmahCount = allNewArtworks.filter(a => 
    a.sourceMuseumEnglish.includes('American History')
  ).length;
  
  console.log(`\n来源分布:`);
  console.log(`  - 亚洲艺术博物馆 (Freer/Sackler): ${asianArtCount} 件`);
  console.log(`  - 美国历史博物馆: ${nmahCount} 件`);
}

main().catch(console.error);
