/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Round 23 Expansion Script - 2026-09-29
 * 
 * Focus: Keyless open APIs underused in previous rounds
 * 
 * PRIMARY SOURCE: Rijksmuseum (data.rijksmuseum.nl keyless API)
 * - Linked Art API, no API key needed
 * - Search: data.rijksmuseum.nl/search/collection
 * - Object → VisualItem → DigitalObject → IIIF image
 * - CC0 / Public Domain Mark
 * - Expected: 150-350 artworks
 * 
 * SECONDARY SOURCE: Getty Museum Open Content
 * - SPARQL endpoint: data.getty.edu/museum/collection/sparql
 * - Object records: data.getty.edu/museum/collection/object/<UUID>
 * - IIIF images: media.getty.edu/iiif/image/<ID>
 * - CC0 for Open Content
 * - Expected: 10-25 artworks
 * 
 * Constraints:
 * - CC0 / Public Domain / CC BY only (no NC licenses)
 * - Self-host all images under public/artworks/
 * - SHA256 dedupe against existing images
 * - Quality Gate: max(width, height) >= 1200 pixels
 * - Output: 1200px max edge, JPEG quality 72, mozjpeg progressive
 * - Clear 简体 Chinese labels
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
const BATCH_ID = `round23-expansion-${Date.now()}`;

const MIN_LONGEST_EDGE = 1200;
const MAX_OUTPUT_EDGE = 1200;
const JPEG_QUALITY = 72;

const stats = {
  rijksmuseum: { queried: 0, objectsFetched: 0, accepted: 0, rejected_lowres: 0, rejected_license: 0, rejected_other: 0 },
  getty: { queried: 0, objectsFetched: 0, accepted: 0, rejected_lowres: 0, rejected_license: 0, rejected_other: 0 },
};

// Rijksmuseum search queries (Dutch + English, tea-related)
const RIJKSMUSEUM_QUERIES = [
  // Dutch tea terms (primary)
  { field: 'title', term: 'theepot' },
  { field: 'title', term: 'theeservies' },
  { field: 'title', term: 'theebus' },
  { field: 'title', term: 'theekommetje' },
  { field: 'title', term: 'theekom' },
  { field: 'title', term: 'theekopje' },
  { field: 'title', term: 'theeschotel' },
  { field: 'description', term: 'thee' },
  
  // English tea terms
  { field: 'title', term: 'teapot' },
  { field: 'title', term: 'tea caddy' },
  { field: 'title', term: 'tea bowl' },
  { field: 'title', term: 'tea cup' },
  { field: 'title', term: 'tea service' },
  
  // Chinese export porcelain
  { field: 'title', term: 'Chinees porselein' },
  { field: 'title', term: 'Chinese porcelain' },
  { field: 'description', term: 'Chinees' },
  { field: 'title', term: 'Japans porselein' },
  { field: 'title', term: 'Japanese porcelain' },
  
  // Specific types/wares
  { field: 'title', term: 'Imari' },
  { field: 'title', term: 'Kakiemon' },
  { field: 'title', term: 'famille rose' },
  { field: 'title', term: 'famille verte' },
  { field: 'title', term: 'blauw-wit' },  // blue-white in Dutch
  { field: 'title', term: 'Kangxi' },
  { field: 'title', term: 'Qianlong' },
  { field: 'title', term: 'celadon' },
  { field: 'title', term: 'kraakporselein' },  // Kraak porcelain
  { field: 'title', term: 'Yixing' },
  
  // General Asian ceramics
  { field: 'type', term: 'teapot' },
  { field: 'type', term: 'bowl' },
  { field: 'type', term: 'cup' },
  { field: 'type', term: 'porcelain' },
];

// Getty SPARQL queries for tea/ceramics
const GETTY_SEARCH_TERMS = [
  'teapot',
  'tea caddy',
  'tea bowl',
  'tea service',
  'Chinese porcelain',
  'Japanese porcelain',
  'ceramic bowl',
  'celadon',
  'famille rose',
  'blue and white porcelain',
  'Imari',
  'Kakiemon',
  'Kangxi',
  'Qianlong',
  'stoneware teapot',
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
        'User-Agent': 'TeawareGallery/1.0 (https://philmingdao.github.io/teaware/; round23-expansion)',
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
      console.log(`    ❌ 质量门槛未通过: ${metadata.width}x${metadata.height} (最长边=${longestEdge}px < ${MIN_LONGEST_EDGE}px)`);
      return false;
    }
    
    await image
      .resize(MAX_OUTPUT_EDGE, MAX_OUTPUT_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toFile(outputPath);
    return true;
  } catch (e) {
    console.log(`    压缩失败: ${(e as Error).message}`);
    return false;
  }
}

function parseDynasty(dateStr: string, placeStr: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (dateStr + ' ' + placeStr).toLowerCase();
  
  // Japanese periods
  if (lower.includes('edo') || lower.includes('tokugawa')) return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
  if (lower.includes('meiji')) return { dynasty: '明治', dynastyEnglish: 'Meiji Period (Japan)' };
  if (lower.includes('momoyama')) return { dynasty: '桃山', dynastyEnglish: 'Momoyama Period (Japan)' };
  
  // Korean
  if (lower.includes('joseon') || lower.includes('choson')) return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)' };
  if (lower.includes('goryeo') || lower.includes('koryo')) return { dynasty: '高麗', dynastyEnglish: 'Goryeo Dynasty (Korea)' };
  
  // Chinese dynasties/reigns
  if (lower.includes('kangxi')) return { dynasty: '清康熙', dynastyEnglish: 'Qing Dynasty (Kangxi)' };
  if (lower.includes('yongzheng')) return { dynasty: '清雍正', dynastyEnglish: 'Qing Dynasty (Yongzheng)' };
  if (lower.includes('qianlong')) return { dynasty: '清乾隆', dynastyEnglish: 'Qing Dynasty (Qianlong)' };
  if (lower.includes('jiaqing')) return { dynasty: '清嘉庆', dynastyEnglish: 'Qing Dynasty (Jiaqing)' };
  if (lower.includes('daoguang')) return { dynasty: '清道光', dynastyEnglish: 'Qing Dynasty (Daoguang)' };
  if (lower.includes('guangxu')) return { dynasty: '清光绪', dynastyEnglish: 'Qing Dynasty (Guangxu)' };
  if (lower.includes('qing') || (lower.includes('17') && lower.includes('19'))) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  
  if (lower.includes('wanli')) return { dynasty: '明万历', dynastyEnglish: 'Ming Dynasty (Wanli)' };
  if (lower.includes('jiajing')) return { dynasty: '明嘉靖', dynastyEnglish: 'Ming Dynasty (Jiajing)' };
  if (lower.includes('xuande')) return { dynasty: '明宣德', dynastyEnglish: 'Ming Dynasty (Xuande)' };
  if (lower.includes('yongle')) return { dynasty: '明永乐', dynastyEnglish: 'Ming Dynasty (Yongle)' };
  if (lower.includes('ming') || (lower.includes('14') && lower.includes('17'))) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  
  if (lower.includes('yuan')) return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty' };
  if (lower.includes('song')) return { dynasty: '宋', dynastyEnglish: 'Song Dynasty' };
  if (lower.includes('tang')) return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty' };
  
  // Geographic
  if (lower.includes('china') || lower.includes('chinese') || lower.includes('chinees') || lower.includes('chine')) return { dynasty: '中国', dynastyEnglish: 'China' };
  if (lower.includes('japan') || lower.includes('japanese') || lower.includes('japans')) return { dynasty: '日本', dynastyEnglish: 'Japan' };
  if (lower.includes('korea') || lower.includes('korean')) return { dynasty: '韩国', dynastyEnglish: 'Korea' };
  if (lower.includes('vietnam') || lower.includes('annamese')) return { dynasty: '越南', dynastyEnglish: 'Vietnam' };
  if (lower.includes('netherlands') || lower.includes('dutch') || lower.includes('nederland')) return { dynasty: '荷兰', dynastyEnglish: 'Netherlands' };
  if (lower.includes('delft')) return { dynasty: '荷兰', dynastyEnglish: 'Netherlands (Delft)' };
  
  return { dynasty: '东亚', dynastyEnglish: 'East Asia' };
}

function parseMaterial(medium: string): { material: string; materialEnglish: string } {
  const lower = medium.toLowerCase();
  
  if (lower.includes('famille rose') || lower.includes('fencai')) return { material: '粉彩瓷', materialEnglish: 'Famille Rose Porcelain' };
  if (lower.includes('famille verte')) return { material: '五彩瓷', materialEnglish: 'Famille Verte Porcelain' };
  if (lower.includes('blue and white') || lower.includes('blauw-wit') || lower.includes('blue-white')) return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  if (lower.includes('celadon')) return { material: '青瓷', materialEnglish: 'Celadon' };
  if (lower.includes('blanc de chine') || lower.includes('dehua')) return { material: '德化白瓷', materialEnglish: 'Blanc de Chine (Dehua)' };
  if (lower.includes('yixing') || lower.includes('zisha')) return { material: '宜兴紫砂', materialEnglish: 'Yixing Zisha' };
  if (lower.includes('kraak')) return { material: '克拉克瓷', materialEnglish: 'Kraak Porcelain' };
  if (lower.includes('imari') || lower.includes('arita')) return { material: '伊万里烧', materialEnglish: 'Imari Ware' };
  if (lower.includes('kakiemon')) return { material: '柿右卫门', materialEnglish: 'Kakiemon Ware' };
  if (lower.includes('satsuma')) return { material: '萨摩烧', materialEnglish: 'Satsuma Ware' };
  if (lower.includes('kutani')) return { material: '九谷烧', materialEnglish: 'Kutani Ware' };
  if (lower.includes('raku')) return { material: '乐烧', materialEnglish: 'Raku Ware' };
  if (lower.includes('delft')) return { material: '代尔夫特陶', materialEnglish: 'Delftware' };
  if (lower.includes('enamel') && lower.includes('copper')) return { material: '铜胎珐琅', materialEnglish: 'Enamel on Copper' };
  if (lower.includes('cloisonne') || lower.includes('cloisonné')) return { material: '景泰蓝', materialEnglish: 'Cloisonné' };
  if (lower.includes('silver')) return { material: '银器', materialEnglish: 'Silver' };
  if (lower.includes('porcelain') || lower.includes('porselein')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  if (lower.includes('stoneware') || lower.includes('steengoed')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('earthenware') || lower.includes('aardewerk')) return { material: '陶器', materialEnglish: 'Earthenware' };
  if (lower.includes('ceramic')) return { material: '陶瓷', materialEnglish: 'Ceramics' };
  
  return { material: '瓷器', materialEnglish: 'Ceramics' };
}

function parseObjectType(title: string, objectType: string = ''): { objectType: string; objectTypeEnglish: string } {
  const lower = (title + ' ' + objectType).toLowerCase();
  
  if (lower.includes('theepot') || lower.includes('teapot') || lower.includes('tea pot')) return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  if (lower.includes('theebus') || lower.includes('tea caddy') || lower.includes('caddy')) return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  if (lower.includes('theekom') || lower.includes('tea bowl') || lower.includes('bowl')) return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  if (lower.includes('theekop') || lower.includes('tea cup') || lower.includes('cup') || lower.includes('kopje')) return { objectType: '茶杯', objectTypeEnglish: 'Tea Cup' };
  if (lower.includes('schotel') || lower.includes('saucer')) return { objectType: '茶碟', objectTypeEnglish: 'Saucer' };
  if (lower.includes('servies') || lower.includes('service') || lower.includes('set')) return { objectType: '茶具套装', objectTypeEnglish: 'Tea Service' };
  if (lower.includes('kan') || lower.includes('ewer') || lower.includes('jug')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('suikerpot') || lower.includes('sugar')) return { objectType: '糖罐', objectTypeEnglish: 'Sugar Pot' };
  if (lower.includes('melkkan') || lower.includes('milk') || lower.includes('cream')) return { objectType: '奶罐', objectTypeEnglish: 'Milk Jug' };
  if (lower.includes('vaas') || lower.includes('vase')) return { objectType: '瓶', objectTypeEnglish: 'Vase' };
  if (lower.includes('bord') || lower.includes('dish') || lower.includes('plate')) return { objectType: '盘', objectTypeEnglish: 'Dish/Plate' };
  if (lower.includes('pot') || lower.includes('jar')) return { objectType: '罐', objectTypeEnglish: 'Jar' };
  if (lower.includes('figure') || lower.includes('figuur')) return { objectType: '人物', objectTypeEnglish: 'Figure' };
  if (lower.includes('incense') || lower.includes('censer') || lower.includes('wierook')) return { objectType: '香炉', objectTypeEnglish: 'Incense Burner' };
  
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
 * Object → shows → VisualItem → digitally_shown_by → DigitalObject → access_point
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
    // Step 1: Get object
    const obj = await fetchJson(objectId, { 'Accept': 'application/json' });
    stats.rijksmuseum.objectsFetched++;
    
    // Extract title from identified_by
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
    
    // Extract date from produced_by
    const timespan = obj.produced_by?.timespan;
    if (timespan) {
      result.date = extractName(timespan.identified_by, 'en') || extractName(timespan.identified_by, 'nl') || '';
    }
    
    // Extract place from produced_by
    const parts = obj.produced_by?.part || [];
    for (const part of parts) {
      const places = part.took_place_at || [];
      for (const place of places) {
        const placeName = extractNotation(place, 'en') || extractNotation(place, 'nl');
        if (placeName) result.place = placeName;
      }
    }
    
    // Extract materials from made_of
    const madeOf = obj.made_of || [];
    const materials: string[] = [];
    for (const m of madeOf) {
      const mat = extractNotation(m, 'en') || extractNotation(m, 'nl');
      if (mat) materials.push(mat);
    }
    result.materials = materials.join(', ');
    
    // Extract object types from classified_as
    const classifiedAs = obj.classified_as || [];
    for (const c of classifiedAs) {
      const type = extractNotation(c, 'en') || extractNotation(c, 'nl');
      if (type) result.objectTypes = type;
    }
    
    // Extract source URL from subject_of
    const subjectOf = obj.subject_of || [];
    for (const s of subjectOf) {
      const dc = s.digitally_carried_by?.[0];
      if (dc?.access_point?.[0]?.id) {
        result.sourceUrl = dc.access_point[0].id;
        break;
      }
    }
    
    // Step 2: Get VisualItem from shows
    const shows = obj.shows;
    if (!shows || !shows[0]?.id) return result;
    
    const visualItemId = shows[0].id;
    const visualItem = await fetchJson(visualItemId, { 'Accept': 'application/json' });
    
    // Check license from VisualItem subject_to
    const subjectTo = visualItem.subject_to || [];
    for (const s of subjectTo) {
      const classifiedAs = s.classified_as || [];
      for (const c of classifiedAs) {
        if (c.id?.includes('publicdomain') || c.id?.includes('zero/1.0')) {
          result.isPublicDomain = true;
        }
      }
    }
    
    // Step 3: Get DigitalObject from digitally_shown_by
    const digitallyShownBy = visualItem.digitally_shown_by;
    if (!digitallyShownBy || !digitallyShownBy[0]?.id) return result;
    
    const digitalObjectId = digitallyShownBy[0].id;
    const digitalObject = await fetchJson(digitalObjectId, { 'Accept': 'application/json' });
    
    // Step 4: Get image URL from access_point
    const accessPoint = digitalObject.access_point;
    if (accessPoint && accessPoint[0]?.id) {
      // Convert to reasonable size IIIF URL
      let imageUrl = accessPoint[0].id;
      // Replace /full/max/ with /full/!1600,/ for more reasonable size
      if (imageUrl.includes('/full/max/')) {
        imageUrl = imageUrl.replace('/full/max/', '/full/!1600,/');
      }
      result.imageUrl = imageUrl;
    }
    
    return result;
  } catch (e) {
    console.log(`      解析失败: ${(e as Error).message}`);
    return result;
  }
}

async function searchRijksmuseum(
  query: { field: string; term: string },
  existingIds: Set<string>,
  existingHashes: Set<string>,
  maxPerQuery: number = 20
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [Rijksmuseum] ${query.field}="${query.term}"`);
  stats.rijksmuseum.queried++;
  
  // Build search URL
  const searchUrl = `https://data.rijksmuseum.nl/search/collection?${query.field}=${encodeURIComponent(query.term)}&imageAvailable=true`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const totalItems = searchData.partOf?.totalItems || 0;
    const orderedItems = searchData.orderedItems || [];
    
    if (orderedItems.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${totalItems} 件 (页面: ${orderedItems.length})，处理中...`);
    
    let accepted = 0;
    for (const item of orderedItems) {
      if (accepted >= maxPerQuery) break;
      
      const objectId = item.id;
      const numId = objectId.split('/').pop();
      const artworkId = `rks-${numId}`;
      
      if (existingIds.has(artworkId)) continue;
      
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
        
        // Download image
        const imageData = await fetchWithRetry(objData.imageUrl);
        if (!isValidImage(imageData)) {
          stats.rijksmuseum.rejected_other++;
          continue;
        }
        
        // Check hash for deduplication
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          continue;
        }
        
        // Apply quality gate and compress
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.rijksmuseum.rejected_lowres++;
          continue;
        }
        
        // Parse metadata
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
        accepted++;
        stats.rijksmuseum.accepted++;
        console.log(`    + ${artworkId}: ${titleEn.substring(0, 50)}`);
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        stats.rijksmuseum.rejected_other++;
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

async function searchGetty(
  searchTerm: string,
  existingIds: Set<string>,
  existingHashes: Set<string>,
  maxPerQuery: number = 5
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [Getty] SPARQL: "${searchTerm}"`);
  stats.getty.queried++;
  
  // Build SPARQL query
  const sparqlQuery = `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?obj ?label WHERE {
  ?obj a crm:E22_Human-Made_Object .
  ?obj rdfs:label ?label .
  FILTER(CONTAINS(LCASE(?label), "${searchTerm.toLowerCase()}"))
} LIMIT 30
  `.trim();
  
  const sparqlUrl = `https://data.getty.edu/museum/collection/sparql?query=${encodeURIComponent(sparqlQuery)}`;
  
  try {
    const searchData = await fetchJson(sparqlUrl, { 'Accept': 'application/json' });
    const bindings = searchData.results?.bindings || [];
    
    if (bindings.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${bindings.length} 件，处理中...`);
    
    let accepted = 0;
    for (const binding of bindings) {
      if (accepted >= maxPerQuery) break;
      
      const objectUrl = binding.obj?.value;
      const label = binding.label?.value;
      
      if (!objectUrl) continue;
      
      // Extract UUID from URL
      const uuid = objectUrl.split('/').pop();
      const artworkId = `getty-${uuid?.substring(0, 8)}`;
      
      if (existingIds.has(artworkId)) continue;
      
      try {
        // Fetch full object
        stats.getty.objectsFetched++;
        const obj = await fetchJson(objectUrl, { 'Accept': 'application/json' });
        
        // Check license from subject_to
        const subjectTo = obj.subject_to || [];
        let isCC0 = false;
        for (const s of subjectTo) {
          const classifiedAs = s.classified_as || [];
          for (const c of classifiedAs) {
            if (c.id?.includes('creativecommons.org/publicdomain/zero') ||
                c._label?.includes('CC0') ||
                c._label?.includes('Public Domain')) {
              isCC0 = true;
            }
          }
        }
        
        if (!isCC0) {
          stats.getty.rejected_license++;
          continue;
        }
        
        // Get image from representation
        const representation = obj.representation;
        if (!representation || !representation[0]?.id) {
          stats.getty.rejected_other++;
          continue;
        }
        
        // Build high-res IIIF URL
        let imageUrl = representation[0].id;
        if (imageUrl.includes('/full/full/')) {
          imageUrl = imageUrl.replace('/full/full/', '/full/max/');
        }
        
        // Download image
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) {
          stats.getty.rejected_other++;
          continue;
        }
        
        // Check hash
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) {
          continue;
        }
        
        // Quality gate
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.getty.rejected_lowres++;
          continue;
        }
        
        // Extract metadata
        const title = obj._label || label || '';
        const identifiedBy = obj.identified_by || [];
        let accessionNumber = '';
        let preferredTitle = '';
        for (const id of identifiedBy) {
          if (id._label?.includes('Accession')) {
            accessionNumber = id.content || '';
          }
          if (id._label?.includes('Preferred Title')) {
            preferredTitle = id.content || '';
          }
        }
        
        // Extract date from produced_by
        let dateStr = '';
        const producedBy = obj.produced_by;
        if (producedBy?.timespan?.identified_by) {
          for (const ts of producedBy.timespan.identified_by) {
            if (ts.content) dateStr = ts.content;
          }
        }
        
        // Extract medium
        let medium = '';
        const referredToBy = obj.referred_to_by || [];
        for (const ref of referredToBy) {
          if (ref._label?.includes('Medium') || ref._label?.includes('Materials')) {
            medium = ref.content || '';
          }
        }
        
        const { dynasty, dynastyEnglish } = parseDynasty(dateStr, title);
        const { material, materialEnglish } = parseMaterial(medium || title);
        const { objectType, objectTypeEnglish } = parseObjectType(preferredTitle || title, '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: preferredTitle || title.split('(')[0].trim(),
          dynasty,
          dynastyEnglish,
          period: '',
          date: dateStr,
          material,
          materialEnglish: medium || materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: '',
          description: `此件${objectType}为${dynasty}时期之作品。${dateStr ? `年代：${dateStr}。` : ''}现藏于盖蒂博物馆。`,
          sourceMuseum: '盖蒂博物馆',
          sourceMuseumEnglish: 'J. Paul Getty Museum',
          accessionNumber,
          sourceUrl: obj.subject_of?.[0]?.id || `https://www.getty.edu/art/collection/object/${uuid}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${preferredTitle || title} - ${dateStr}`,
          license: 'CC0 / Public Domain (Getty Open Content)',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.getty.accepted++;
        console.log(`    + ${artworkId}: ${(preferredTitle || title).substring(0, 50)}`);
        
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
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
  console.log('Round 23 茶器收藏扩展 - 2026-09-29');
  console.log(`批次ID: ${BATCH_ID}`);
  console.log('主要来源: Rijksmuseum (无密钥 data.rijksmuseum.nl API)');
  console.log('次要来源: Getty Museum (Open Content SPARQL API)');
  console.log('========================================\n');
  
  const existingIds = loadExistingIds();
  const existingHashes = loadExistingHashes();
  
  const startingCount = existingIds.size;
  console.log(`现有藏品: ${startingCount} 件`);
  console.log(`现有图片哈希: ${existingHashes.size} 个\n`);
  
  const newArtworks: Artwork[] = [];
  
  // === Rijksmuseum (Primary Source) ===
  console.log('=== 荷兰国立博物馆 (Rijksmuseum) - 无密钥 Linked Art API ===\n');
  
  for (const query of RIJKSMUSEUM_QUERIES) {
    const results = await searchRijksmuseum(query, existingIds, existingHashes, 15);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'rijksmuseum-r23',
      query: `${query.field}=${query.term}`,
      totalResults: results.length,
      idsAccepted: results.length,
      crawlBatchId: BATCH_ID,
      note: 'Keyless data.rijksmuseum.nl Linked Art API',
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Progress check
    if (newArtworks.length >= 350) {
      console.log('\n达到目标数量，跳过剩余查询...');
      break;
    }
  }
  
  // === Getty (Secondary Source) ===
  console.log('\n=== 盖蒂博物馆 (Getty) - Open Content SPARQL API ===\n');
  
  for (const term of GETTY_SEARCH_TERMS) {
    const results = await searchGetty(term, existingIds, existingHashes, 4);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'getty-r23',
      query: term,
      totalResults: results.length,
      idsAccepted: results.length,
      crawlBatchId: BATCH_ID,
      note: 'Getty Open Content SPARQL + IIIF',
    });
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  // === Summary ===
  console.log('\n========================================');
  console.log('扩展统计');
  console.log('========================================');
  console.log(`总计新增: ${newArtworks.length} 件`);
  console.log(`起始数量: ${startingCount}`);
  console.log(`结束数量: ${startingCount + newArtworks.length}`);
  
  console.log('\n=== 来源分布 ===');
  const rksCount = newArtworks.filter(a => a.id.startsWith('rks-')).length;
  const gettyCount = newArtworks.filter(a => a.id.startsWith('getty-')).length;
  console.log(`  荷兰国立博物馆 (Rijksmuseum): ${rksCount}`);
  console.log(`  盖蒂博物馆 (Getty): ${gettyCount}`);
  
  console.log('\n=== 质量门槛统计 ===');
  console.log(`  Rijksmuseum - 查询${stats.rijksmuseum.queried}次, 对象${stats.rijksmuseum.objectsFetched}个, 接受${stats.rijksmuseum.accepted}, 低分辨率${stats.rijksmuseum.rejected_lowres}, 许可证${stats.rijksmuseum.rejected_license}, 其他${stats.rijksmuseum.rejected_other}`);
  console.log(`  Getty - 查询${stats.getty.queried}次, 对象${stats.getty.objectsFetched}个, 接受${stats.getty.accepted}, 低分辨率${stats.getty.rejected_lowres}, 许可证${stats.getty.rejected_license}, 其他${stats.getty.rejected_other}`);
  
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
    '百济': 90, '高麗': 91, '新罗': 92, '朝鮮': 93,
    '绳文': 100, '弥生': 101, '古坟': 102, '奈良': 103, '平安': 104, '镰仓': 105,
    '室町': 106, '桃山': 107, '江戸': 108, '明治': 109, '大正': 110, '昭和': 111,
    '日本': 112, '韩国': 113,
    '越南': 120, '越南朱豆': 121, '泰国': 122, '素可泰': 123, '沙旺卡洛': 124, '高棉': 125, '缅甸': 126,
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
    source: 'round23-summary',
    query: 'Round 23 Expansion Complete',
    totalResults: newArtworks.length,
    idsAccepted: newArtworks.length,
    crawlBatchId: 'round23-summary',
    breakdown: { rijksmuseum: rksCount, getty: gettyCount },
    imageSizeMB,
    note: `Round 23 expansion: ${startingCount} → ${mergedArtworks.length} (+${newArtworks.length}). Primary: Rijksmuseum keyless (data.rijksmuseum.nl). Secondary: Getty Open Content.`,
  });
  
  console.log('\n========================================');
  console.log('Round 23 完成');
  console.log(`主要突破: Rijksmuseum 无密钥 API (data.rijksmuseum.nl)`);
  console.log(`次要来源: Getty Museum Open Content`);
  console.log('========================================');
}

main().catch(console.error);
