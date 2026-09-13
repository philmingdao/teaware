/**
 * Comprehensive Museum Tea Ware Fetcher v2
 * 
 * This script fetches Chinese tea ware from multiple museum APIs:
 * - The Metropolitan Museum of Art (Met)
 * - Cleveland Museum of Art (CMA)
 * - Art Institute of Chicago (AIC)
 * 
 * Features:
 * - Reads sources.json for query configuration
 * - Logs all crawl operations to crawl-log.jsonl
 * - Deduplicates by museum object ID and image URL
 * - Filters for tea-related objects with public domain images
 * - Generates bilingual (Chinese/English) metadata
 * 
 * Run with: npx tsx scripts/fetch-artworks-v2.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

interface MetObject {
  objectID: number;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  title: string;
  culture: string;
  period: string;
  dynasty: string;
  reign: string;
  objectDate: string;
  medium: string;
  dimensions: string;
  creditLine: string;
  accessionNumber: string;
  objectURL: string;
  classification: string;
  objectName: string;
  country: string;
  region: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  department: string;
}

interface CMAObject {
  id: number;
  title: string;
  creation_date: string;
  creation_date_earliest: number;
  creation_date_latest: number;
  culture: string[];
  technique: string;
  measurements: string;
  accession_number: string;
  creditline: string;
  url: string;
  images: {
    web?: { url: string; width: number; height: number };
    print?: { url: string };
  };
  share_license_status: string;
  department: string;
  type: string;
  description: string;
}

interface AICObject {
  id: number;
  title: string;
  date_display: string;
  date_start: number;
  date_end: number;
  place_of_origin: string;
  medium_display: string;
  dimensions: string;
  credit_line: string;
  main_reference_number: string;
  is_public_domain: boolean;
  image_id: string;
  classification_title: string;
  artwork_type_title: string;
  artist_display: string;
  department_title: string;
  style_title: string;
  culture_title: string;
}

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
  endpoint: string;
  query: string;
  filters: Record<string, unknown>;
  pagesFetched: number;
  totalResults: number;
  idsAccepted: string[];
  idsRejected: { id: string; reason: string }[];
  crawlBatchId: string;
  durationMs: number;
}

interface SourceConfig {
  id: string;
  name: string;
  nameZh: string;
  status: string;
  queries: { query: string; status: string }[];
}

// ============================================================================
// Globals
// ============================================================================

const CRAWL_BATCH_ID = `batch-${Date.now()}`;
const seenObjectIds = new Set<string>();
const seenImageUrls = new Set<string>();
const seenAccessionNumbers = new Set<string>();
const allArtworks: CuratedArtwork[] = [];
const crawlLogs: CrawlLogEntry[] = [];

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Mapping Tables
// ============================================================================

const dynastyMap: Record<string, { chinese: string; english: string }> = {
  'tang': { chinese: '唐', english: 'Tang Dynasty (618–907)' },
  'five dynasties': { chinese: '五代', english: 'Five Dynasties (907–960)' },
  'song': { chinese: '宋', english: 'Song Dynasty (960–1279)' },
  'northern song': { chinese: '北宋', english: 'Northern Song Dynasty (960–1127)' },
  'southern song': { chinese: '南宋', english: 'Southern Song Dynasty (1127–1279)' },
  'liao': { chinese: '辽', english: 'Liao Dynasty (916–1125)' },
  'jin': { chinese: '金', english: 'Jin Dynasty (1115–1234)' },
  'yuan': { chinese: '元', english: 'Yuan Dynasty (1271–1368)' },
  'ming': { chinese: '明', english: 'Ming Dynasty (1368–1644)' },
  'hongwu': { chinese: '明洪武', english: 'Ming Dynasty, Hongwu Period' },
  'yongle': { chinese: '明永乐', english: 'Ming Dynasty, Yongle Period' },
  'xuande': { chinese: '明宣德', english: 'Ming Dynasty, Xuande Period' },
  'chenghua': { chinese: '明成化', english: 'Ming Dynasty, Chenghua Period' },
  'jiajing': { chinese: '明嘉靖', english: 'Ming Dynasty, Jiajing Period' },
  'wanli': { chinese: '明万历', english: 'Ming Dynasty, Wanli Period' },
  'tianqi': { chinese: '明天启', english: 'Ming Dynasty, Tianqi Period' },
  'qing': { chinese: '清', english: 'Qing Dynasty (1644–1911)' },
  'shunzhi': { chinese: '清顺治', english: 'Qing Dynasty, Shunzhi Period' },
  'kangxi': { chinese: '清康熙', english: 'Qing Dynasty, Kangxi Period' },
  'yongzheng': { chinese: '清雍正', english: 'Qing Dynasty, Yongzheng Period' },
  'qianlong': { chinese: '清乾隆', english: 'Qing Dynasty, Qianlong Period' },
  'jiaqing': { chinese: '清嘉庆', english: 'Qing Dynasty, Jiaqing Period' },
  'daoguang': { chinese: '清道光', english: 'Qing Dynasty, Daoguang Period' },
  'xianfeng': { chinese: '清咸丰', english: 'Qing Dynasty, Xianfeng Period' },
  'tongzhi': { chinese: '清同治', english: 'Qing Dynasty, Tongzhi Period' },
  'guangxu': { chinese: '清光绪', english: 'Qing Dynasty, Guangxu Period' },
  'republic': { chinese: '民国', english: 'Republic of China (1912–1949)' },
  'modern': { chinese: '近现代', english: 'Modern' },
  '20th century': { chinese: '近现代', english: '20th Century' },
  '19th century': { chinese: '清', english: '19th Century' },
  '18th century': { chinese: '清', english: '18th Century' },
  '17th century': { chinese: '明清', english: '17th Century' },
  '16th century': { chinese: '明', english: '16th Century' },
  '15th century': { chinese: '明', english: '15th Century' },
  '14th century': { chinese: '元明', english: '14th Century' },
  '13th century': { chinese: '宋元', english: '13th Century' },
  '12th century': { chinese: '宋', english: '12th Century' },
  '11th century': { chinese: '宋', english: '11th Century' },
  '10th century': { chinese: '五代宋', english: '10th Century' },
};

const materialMap: Record<string, { chinese: string; english: string; category: string }> = {
  'blue and white': { chinese: '青花瓷', english: 'Blue and White Porcelain', category: '青花瓷' },
  'blue-and-white': { chinese: '青花瓷', english: 'Blue and White Porcelain', category: '青花瓷' },
  'underglaze blue': { chinese: '青花', english: 'Underglaze Blue', category: '青花瓷' },
  'famille rose': { chinese: '粉彩', english: 'Famille Rose Porcelain', category: '粉彩' },
  'famille verte': { chinese: '五彩', english: 'Famille Verte Porcelain', category: '五彩' },
  'famille jaune': { chinese: '素三彩', english: 'Famille Jaune', category: '粉彩' },
  'famille noire': { chinese: '墨地三彩', english: 'Famille Noire', category: '粉彩' },
  'doucai': { chinese: '斗彩', english: 'Doucai (Contrasting Colors)', category: '五彩' },
  'wucai': { chinese: '五彩', english: 'Wucai (Five Colors)', category: '五彩' },
  'enamel': { chinese: '珐琅彩', english: 'Enamel', category: '珐琅彩' },
  'cloisonné': { chinese: '景泰蓝', english: 'Cloisonné Enamel', category: '珐琅' },
  'cloisonne': { chinese: '景泰蓝', english: 'Cloisonné Enamel', category: '珐琅' },
  'celadon': { chinese: '青瓷', english: 'Celadon', category: '青瓷' },
  'longquan': { chinese: '龙泉青瓷', english: 'Longquan Celadon', category: '青瓷' },
  'jian': { chinese: '建盏', english: 'Jian Ware', category: '建盏' },
  'tenmoku': { chinese: '天目', english: 'Tenmoku', category: '建盏' },
  'hare\'s fur': { chinese: '兔毫盏', english: 'Hare\'s Fur Glaze', category: '建盏' },
  'oil spot': { chinese: '油滴盏', english: 'Oil Spot Glaze', category: '建盏' },
  'yixing': { chinese: '宜兴紫砂', english: 'Yixing Purple Clay', category: '紫砂' },
  'zisha': { chinese: '紫砂', english: 'Purple Clay (Zisha)', category: '紫砂' },
  'stoneware': { chinese: '陶器', english: 'Stoneware', category: '紫砂' },
  'white porcelain': { chinese: '白瓷', english: 'White Porcelain', category: '白瓷' },
  'blanc de chine': { chinese: '德化白瓷', english: 'Blanc de Chine', category: '白瓷' },
  'dehua': { chinese: '德化白瓷', english: 'Dehua White Porcelain', category: '白瓷' },
  'porcelain': { chinese: '瓷器', english: 'Porcelain', category: '其他' },
  'overglaze': { chinese: '釉上彩', english: 'Overglaze Enamel', category: '珐琅彩' },
  'underglaze': { chinese: '釉下彩', english: 'Underglaze Decoration', category: '青花瓷' },
  'monochrome': { chinese: '单色釉', english: 'Monochrome Glaze', category: '其他' },
  'iron oxide': { chinese: '铁锈花', english: 'Iron Oxide Decoration', category: '其他' },
  'copper red': { chinese: '釉里红', english: 'Underglaze Copper Red', category: '其他' },
  'sang de boeuf': { chinese: '郎窑红', english: 'Oxblood Glaze', category: '其他' },
  'peachbloom': { chinese: '豇豆红', english: 'Peachbloom Glaze', category: '其他' },
  'flambe': { chinese: '窑变釉', english: 'Flambé Glaze', category: '其他' },
  'lacquer': { chinese: '漆器', english: 'Lacquer', category: '其他' },
  'silver': { chinese: '银器', english: 'Silver', category: '其他' },
  'pewter': { chinese: '锡器', english: 'Pewter', category: '其他' },
};

const kilnMap: Record<string, { chinese: string; english: string }> = {
  'jingdezhen': { chinese: '景德镇窑', english: 'Jingdezhen Kilns' },
  'longquan': { chinese: '龙泉窑', english: 'Longquan Kilns' },
  'jian': { chinese: '建窑', english: 'Jian Kilns' },
  'yixing': { chinese: '宜兴', english: 'Yixing' },
  'dehua': { chinese: '德化窑', english: 'Dehua Kilns' },
  'ding': { chinese: '定窑', english: 'Ding Kilns' },
  'ru': { chinese: '汝窑', english: 'Ru Kilns' },
  'jun': { chinese: '钧窑', english: 'Jun Kilns' },
  'ge': { chinese: '哥窑', english: 'Ge Kilns' },
  'guan': { chinese: '官窑', english: 'Guan Kilns' },
  'cizhou': { chinese: '磁州窑', english: 'Cizhou Kilns' },
  'yaozhou': { chinese: '耀州窑', english: 'Yaozhou Kilns' },
  'jizhou': { chinese: '吉州窑', english: 'Jizhou Kilns' },
  'fujian': { chinese: '福建窑', english: 'Fujian Kilns' },
  'guangdong': { chinese: '广东窑', english: 'Guangdong Kilns' },
  'zhejiang': { chinese: '浙江窑', english: 'Zhejiang Kilns' },
};

// ============================================================================
// Detection Functions
// ============================================================================

function detectDynasty(text: string): { chinese: string; english: string } | null {
  const lowerText = text.toLowerCase();
  
  // Try more specific matches first
  const orderedKeys = Object.keys(dynastyMap).sort((a, b) => b.length - a.length);
  for (const key of orderedKeys) {
    if (lowerText.includes(key)) {
      return dynastyMap[key];
    }
  }
  
  // Try to extract century from dates
  const centuryMatch = lowerText.match(/(\d{1,2})(?:th|st|nd|rd)\s*century/i);
  if (centuryMatch) {
    const century = parseInt(centuryMatch[1]);
    if (century >= 7 && century <= 10) return { chinese: '唐', english: `${century}th Century (Tang Era)` };
    if (century >= 10 && century <= 13) return { chinese: '宋', english: `${century}th Century (Song Era)` };
    if (century === 14) return { chinese: '元明', english: '14th Century (Yuan-Ming)' };
    if (century >= 15 && century <= 17) return { chinese: '明', english: `${century}th Century (Ming Era)` };
    if (century >= 17 && century <= 19) return { chinese: '清', english: `${century}th Century (Qing Era)` };
    if (century === 20) return { chinese: '近现代', english: '20th Century' };
  }
  
  return null;
}

function detectMaterial(text: string): { chinese: string; english: string; category: string } | null {
  const lowerText = text.toLowerCase();
  const orderedKeys = Object.keys(materialMap).sort((a, b) => b.length - a.length);
  for (const key of orderedKeys) {
    if (lowerText.includes(key)) {
      return materialMap[key];
    }
  }
  return null;
}

function detectKiln(text: string): { chinese: string; english: string } | null {
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(kilnMap)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }
  return null;
}

type ObjectTypeChinese = '茶壶' | '杯盏' | '茶具组' | '茶罐' | '执壶';
type ObjectTypeEnglish = 'Teapot' | 'Tea Bowl/Cup' | 'Tea Set' | 'Tea Caddy' | 'Ewer';

function detectObjectType(text: string): { chinese: ObjectTypeChinese; english: ObjectTypeEnglish } {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('teapot') || lowerText.includes('tea pot')) {
    return { chinese: '茶壶', english: 'Teapot' };
  }
  if (lowerText.includes('ewer') || lowerText.includes('wine pot')) {
    return { chinese: '执壶', english: 'Ewer' };
  }
  if (lowerText.includes('tea caddy') || lowerText.includes('tea jar') || lowerText.includes('tea canister')) {
    return { chinese: '茶罐', english: 'Tea Caddy' };
  }
  if (lowerText.includes('set') || lowerText.includes('service')) {
    return { chinese: '茶具组', english: 'Tea Set' };
  }
  // Default: bowls, cups, etc.
  return { chinese: '杯盏', english: 'Tea Bowl/Cup' };
}

function generateChineseTitle(englishTitle: string, dynasty: string, material: string, objectType: string): string {
  const dynastyStr = dynasty || '';
  const materialStr = material || '';
  
  if (englishTitle.toLowerCase().includes('teapot') || englishTitle.toLowerCase().includes('tea pot')) {
    return `${dynastyStr}${materialStr}茶壶`;
  }
  if (englishTitle.toLowerCase().includes('tea bowl') || englishTitle.toLowerCase().includes('teabowl')) {
    return `${dynastyStr}${materialStr}茶盏`;
  }
  if (englishTitle.toLowerCase().includes('cup') && englishTitle.toLowerCase().includes('tea')) {
    return `${dynastyStr}${materialStr}茶杯`;
  }
  if (englishTitle.toLowerCase().includes('cup')) {
    return `${dynastyStr}${materialStr}杯盏`;
  }
  if (englishTitle.toLowerCase().includes('bowl')) {
    return `${dynastyStr}${materialStr}茶盏`;
  }
  if (englishTitle.toLowerCase().includes('ewer')) {
    return `${dynastyStr}${materialStr}执壶`;
  }
  if (englishTitle.toLowerCase().includes('caddy') || englishTitle.toLowerCase().includes('jar')) {
    return `${dynastyStr}${materialStr}茶罐`;
  }
  return `${dynastyStr}${materialStr}${objectType}`;
}

function generateDescription(artwork: Partial<CuratedArtwork>): string {
  const parts: string[] = [];
  
  if (artwork.dynasty && artwork.date) {
    parts.push(`此件${artwork.objectType || '茶器'}为${artwork.dynasty}时期（${artwork.date}）之作品。`);
  } else if (artwork.dynasty) {
    parts.push(`此件${artwork.objectType || '茶器'}为${artwork.dynasty}时期之作品。`);
  } else if (artwork.date) {
    parts.push(`此件${artwork.objectType || '茶器'}创作于${artwork.date}。`);
  }
  
  if (artwork.material) {
    parts.push(`器身采用${artwork.material}工艺制成。`);
  }
  
  if (artwork.kiln) {
    parts.push(`出自${artwork.kiln}。`);
  }
  
  if (artwork.dimensions) {
    parts.push(`尺寸：${artwork.dimensions}。`);
  }
  
  parts.push(`现藏于${artwork.sourceMuseum || '博物馆'}。`);
  
  return parts.join('');
}

// ============================================================================
// Tea Ware Detection
// ============================================================================

const TEA_KEYWORDS = [
  'tea', 'teapot', 'tea pot', 'teabowl', 'tea bowl', 'tea cup', 'teacup',
  'gaiwan', 'yixing', 'zisha', 'tenmoku', 'jian ware', 'chawan',
  'wine cup', 'wine bowl', 'libation cup', 'stem cup', 'footed cup',
  'ewer', 'tea caddy', 'tea jar', 'tea canister', 'tea set', 'tea service',
  'sake', 'drinking', 'ceremonial cup', 'ritual cup',
];

const CHINA_KEYWORDS = [
  'china', 'chinese', 'jingdezhen', 'dehua', 'yixing', 'longquan',
  'fujian', 'jiangxi', 'zhejiang', 'guangdong', 'henan', 'hebei',
  'song dynasty', 'ming dynasty', 'qing dynasty', 'yuan dynasty', 'tang dynasty',
  'kangxi', 'qianlong', 'yongzheng', 'xuande', 'chenghua', 'wanli',
];

const EXCLUDE_KEYWORDS = [
  'sugar bowl', 'punch bowl', 'slop bowl', 'waste bowl', 'finger bowl',
  'cream pot', 'mustard pot', 'chocolate pot', 'coffee pot', 'coffeepot',
  'milk pot', 'hot water pot', 'sauce boat', 'tureen', 'platter',
  'snuff bottle', 'vase', 'flower', 'incense', 'brush pot', 'water dropper',
];

function isTeaWare(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for exclusions first
  for (const exclude of EXCLUDE_KEYWORDS) {
    if (lowerText.includes(exclude)) {
      return false;
    }
  }
  
  // Check for tea-related keywords
  for (const keyword of TEA_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

function isChineseOrigin(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const keyword of CHINA_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Deduplication
// ============================================================================

function isDuplicate(id: string, imageUrl: string, accessionNumber: string): { isDupe: boolean; reason?: string } {
  if (seenObjectIds.has(id)) {
    return { isDupe: true, reason: 'duplicate_object_id' };
  }
  if (imageUrl && seenImageUrls.has(imageUrl)) {
    return { isDupe: true, reason: 'duplicate_image_url' };
  }
  if (accessionNumber && seenAccessionNumbers.has(accessionNumber)) {
    return { isDupe: true, reason: 'duplicate_accession' };
  }
  return { isDupe: false };
}

function markAsSeen(id: string, imageUrl: string, accessionNumber: string) {
  seenObjectIds.add(id);
  if (imageUrl) seenImageUrls.add(imageUrl);
  if (accessionNumber) seenAccessionNumbers.add(accessionNumber);
}

// ============================================================================
// Met Museum API
// ============================================================================

async function fetchMetSearchResults(query: string): Promise<number[]> {
  try {
    const url = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`;
    const response = await fetch(url);
    const data = await response.json();
    return data.objectIDs || [];
  } catch (error) {
    console.error(`Error fetching Met search for ${query}:`, error);
    return [];
  }
}

async function fetchMetObject(objectId: number): Promise<MetObject | null> {
  try {
    const url = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching Met object ${objectId}:`, error);
    return null;
  }
}

async function crawlMet(queries: string[]): Promise<CuratedArtwork[]> {
  const artworks: CuratedArtwork[] = [];
  
  for (const query of queries) {
    const startTime = Date.now();
    const acceptedIds: string[] = [];
    const rejectedIds: { id: string; reason: string }[] = [];
    
    console.log(`\n[Met] Searching: "${query}"...`);
    const objectIds = await fetchMetSearchResults(query);
    console.log(`[Met] Found ${objectIds.length} results for "${query}"`);
    
    let processed = 0;
    for (const objectId of objectIds) {
      const id = `met-${objectId}`;
      
      // Check for duplicate before fetching
      if (seenObjectIds.has(id)) {
        rejectedIds.push({ id, reason: 'duplicate_object_id' });
        continue;
      }
      
      await delay(50); // Rate limiting
      const obj = await fetchMetObject(objectId);
      
      if (!obj) {
        rejectedIds.push({ id, reason: 'fetch_failed' });
        continue;
      }
      
      if (!obj.isPublicDomain) {
        rejectedIds.push({ id, reason: 'not_public_domain' });
        continue;
      }
      
      if (!obj.primaryImage) {
        rejectedIds.push({ id, reason: 'no_image' });
        continue;
      }
      
      const combinedText = `${obj.title} ${obj.objectName} ${obj.classification} ${obj.culture} ${obj.country} ${obj.region} ${obj.medium} ${obj.period} ${obj.dynasty}`;
      
      if (!isTeaWare(combinedText)) {
        rejectedIds.push({ id, reason: 'not_tea_ware' });
        continue;
      }
      
      if (!isChineseOrigin(combinedText)) {
        rejectedIds.push({ id, reason: 'not_chinese' });
        continue;
      }
      
      const dupeCheck = isDuplicate(id, obj.primaryImage, obj.accessionNumber);
      if (dupeCheck.isDupe) {
        rejectedIds.push({ id, reason: dupeCheck.reason! });
        continue;
      }
      
      // Create artwork record
      const dynasty = detectDynasty(combinedText);
      const material = detectMaterial(combinedText);
      const kiln = detectKiln(combinedText);
      const objectType = detectObjectType(obj.title);
      
      const artwork: CuratedArtwork = {
        id,
        titleChinese: generateChineseTitle(obj.title, dynasty?.chinese || '', material?.chinese || '', objectType.chinese),
        titleEnglish: obj.title,
        dynasty: dynasty?.chinese || '未知',
        dynastyEnglish: dynasty?.english || obj.dynasty || obj.period || 'Unknown Period',
        period: obj.period || obj.reign || undefined,
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
        imageAlt: `${obj.title} - ${obj.objectDate || 'Chinese tea ware'}`,
        license: 'CC0 / Public Domain',
        creditLine: obj.creditLine,
        crawlBatchId: CRAWL_BATCH_ID,
      };
      
      artwork.description = generateDescription(artwork);
      artworks.push(artwork);
      markAsSeen(id, obj.primaryImage, obj.accessionNumber);
      acceptedIds.push(id);
      
      processed++;
      if (processed % 50 === 0) {
        console.log(`[Met] Processed ${processed} objects, accepted ${acceptedIds.length}...`);
      }
    }
    
    // Log this crawl
    crawlLogs.push({
      timestamp: new Date().toISOString(),
      source: 'met',
      endpoint: 'https://collectionapi.metmuseum.org/public/collection/v1/search',
      query,
      filters: { hasImages: true, isPublicDomain: true },
      pagesFetched: 1,
      totalResults: objectIds.length,
      idsAccepted: acceptedIds,
      idsRejected: rejectedIds,
      crawlBatchId: CRAWL_BATCH_ID,
      durationMs: Date.now() - startTime,
    });
    
    console.log(`[Met] Query "${query}": ${acceptedIds.length} accepted, ${rejectedIds.length} rejected`);
    await delay(500); // Pause between queries
  }
  
  return artworks;
}

// ============================================================================
// Cleveland Museum of Art API
// ============================================================================

async function fetchCMASearchResults(query: string, skip: number = 0): Promise<{ data: CMAObject[]; total: number }> {
  try {
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&limit=100&skip=${skip}`;
    const response = await fetch(url);
    const data = await response.json();
    return { data: data.data || [], total: data.info?.total || 0 };
  } catch (error) {
    console.error(`Error fetching CMA search for ${query}:`, error);
    return { data: [], total: 0 };
  }
}

async function crawlCMA(queries: string[]): Promise<CuratedArtwork[]> {
  const artworks: CuratedArtwork[] = [];
  
  for (const query of queries) {
    const startTime = Date.now();
    const acceptedIds: string[] = [];
    const rejectedIds: { id: string; reason: string }[] = [];
    let pagesFetched = 0;
    let totalResults = 0;
    
    console.log(`\n[CMA] Searching: "${query}"...`);
    
    let skip = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data: results, total } = await fetchCMASearchResults(query, skip);
      if (skip === 0) {
        totalResults = total;
        console.log(`[CMA] Found ${total} total results for "${query}"`);
      }
      
      pagesFetched++;
      
      if (results.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const obj of results) {
        const id = `cma-${obj.id}`;
        
        if (seenObjectIds.has(id)) {
          rejectedIds.push({ id, reason: 'duplicate_object_id' });
          continue;
        }
        
        if (!obj.images?.web?.url) {
          rejectedIds.push({ id, reason: 'no_image' });
          continue;
        }
        
        if (obj.share_license_status !== 'CC0') {
          rejectedIds.push({ id, reason: 'not_cc0' });
          continue;
        }
        
        const combinedText = `${obj.title} ${obj.type} ${obj.department} ${obj.culture?.join(' ') || ''} ${obj.technique || ''} ${obj.description || ''}`;
        
        if (!isTeaWare(combinedText)) {
          rejectedIds.push({ id, reason: 'not_tea_ware' });
          continue;
        }
        
        if (!isChineseOrigin(combinedText)) {
          rejectedIds.push({ id, reason: 'not_chinese' });
          continue;
        }
        
        const dupeCheck = isDuplicate(id, obj.images.web.url, obj.accession_number);
        if (dupeCheck.isDupe) {
          rejectedIds.push({ id, reason: dupeCheck.reason! });
          continue;
        }
        
        // Create artwork record
        const dynasty = detectDynasty(combinedText);
        const material = detectMaterial(combinedText);
        const kiln = detectKiln(combinedText);
        const objectType = detectObjectType(obj.title);
        
        const artwork: CuratedArtwork = {
          id,
          titleChinese: generateChineseTitle(obj.title, dynasty?.chinese || '', material?.chinese || '', objectType.chinese),
          titleEnglish: obj.title,
          dynasty: dynasty?.chinese || '未知',
          dynastyEnglish: dynasty?.english || 'Unknown Period',
          period: undefined,
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
          imageAlt: `${obj.title} - ${obj.creation_date || 'Chinese tea ware'}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.creditline,
          crawlBatchId: CRAWL_BATCH_ID,
        };
        
        artwork.description = generateDescription(artwork);
        artworks.push(artwork);
        markAsSeen(id, obj.images.web.url, obj.accession_number);
        acceptedIds.push(id);
      }
      
      skip += results.length;
      hasMore = skip < total && results.length === 100;
      
      if (hasMore) {
        console.log(`[CMA] Fetched page ${pagesFetched}, ${acceptedIds.length} accepted so far...`);
        await delay(1000); // Rate limiting
      }
    }
    
    // Log this crawl
    crawlLogs.push({
      timestamp: new Date().toISOString(),
      source: 'cma',
      endpoint: 'https://openaccess-api.clevelandart.org/api/artworks/',
      query,
      filters: { has_image: 1, share_license_status: 'CC0' },
      pagesFetched,
      totalResults,
      idsAccepted: acceptedIds,
      idsRejected: rejectedIds,
      crawlBatchId: CRAWL_BATCH_ID,
      durationMs: Date.now() - startTime,
    });
    
    console.log(`[CMA] Query "${query}": ${acceptedIds.length} accepted, ${rejectedIds.length} rejected`);
    await delay(500);
  }
  
  return artworks;
}

// ============================================================================
// Art Institute of Chicago API
// ============================================================================

async function fetchAICSearchResults(query: string, page: number = 1): Promise<{ data: AICObject[]; total: number }> {
  try {
    const fields = 'id,title,date_display,date_start,date_end,place_of_origin,medium_display,dimensions,credit_line,main_reference_number,is_public_domain,image_id,classification_title,artwork_type_title,artist_display,department_title,style_title,culture_title';
    const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&fields=${fields}&limit=100&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    return { data: data.data || [], total: data.pagination?.total || 0 };
  } catch (error) {
    console.error(`Error fetching AIC search for ${query}:`, error);
    return { data: [], total: 0 };
  }
}

function getAICImageUrl(imageId: string): string {
  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

async function crawlAIC(queries: string[]): Promise<CuratedArtwork[]> {
  const artworks: CuratedArtwork[] = [];
  
  for (const query of queries) {
    const startTime = Date.now();
    const acceptedIds: string[] = [];
    const rejectedIds: { id: string; reason: string }[] = [];
    let pagesFetched = 0;
    let totalResults = 0;
    
    console.log(`\n[AIC] Searching: "${query}"...`);
    
    let page = 1;
    let hasMore = true;
    const maxPages = 10; // Limit pages to avoid excessive crawling
    
    while (hasMore && page <= maxPages) {
      const { data: results, total } = await fetchAICSearchResults(query, page);
      if (page === 1) {
        totalResults = total;
        console.log(`[AIC] Found ${total} total results for "${query}"`);
      }
      
      pagesFetched++;
      
      if (results.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const obj of results) {
        const id = `aic-${obj.id}`;
        
        if (seenObjectIds.has(id)) {
          rejectedIds.push({ id, reason: 'duplicate_object_id' });
          continue;
        }
        
        if (!obj.is_public_domain) {
          rejectedIds.push({ id, reason: 'not_public_domain' });
          continue;
        }
        
        if (!obj.image_id) {
          rejectedIds.push({ id, reason: 'no_image' });
          continue;
        }
        
        const combinedText = `${obj.title} ${obj.place_of_origin || ''} ${obj.medium_display || ''} ${obj.classification_title || ''} ${obj.artwork_type_title || ''} ${obj.department_title || ''} ${obj.style_title || ''} ${obj.culture_title || ''}`;
        
        if (!isTeaWare(combinedText)) {
          rejectedIds.push({ id, reason: 'not_tea_ware' });
          continue;
        }
        
        if (!isChineseOrigin(combinedText)) {
          rejectedIds.push({ id, reason: 'not_chinese' });
          continue;
        }
        
        const imageUrl = getAICImageUrl(obj.image_id);
        const dupeCheck = isDuplicate(id, imageUrl, obj.main_reference_number);
        if (dupeCheck.isDupe) {
          rejectedIds.push({ id, reason: dupeCheck.reason! });
          continue;
        }
        
        // Create artwork record
        const dynasty = detectDynasty(combinedText);
        const material = detectMaterial(combinedText);
        const kiln = detectKiln(combinedText);
        const objectType = detectObjectType(obj.title);
        
        const artwork: CuratedArtwork = {
          id,
          titleChinese: generateChineseTitle(obj.title, dynasty?.chinese || '', material?.chinese || '', objectType.chinese),
          titleEnglish: obj.title,
          dynasty: dynasty?.chinese || '未知',
          dynastyEnglish: dynasty?.english || 'Unknown Period',
          period: undefined,
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
          accessionNumber: obj.main_reference_number,
          sourceUrl: `https://www.artic.edu/artworks/${obj.id}`,
          imageUrl,
          imageAlt: `${obj.title} - ${obj.date_display || 'Chinese tea ware'}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.credit_line,
          crawlBatchId: CRAWL_BATCH_ID,
        };
        
        artwork.description = generateDescription(artwork);
        artworks.push(artwork);
        markAsSeen(id, imageUrl, obj.main_reference_number);
        acceptedIds.push(id);
      }
      
      page++;
      hasMore = results.length === 100 && page <= maxPages;
      
      if (hasMore) {
        console.log(`[AIC] Fetched page ${pagesFetched}, ${acceptedIds.length} accepted so far...`);
        await delay(200); // Rate limiting
      }
    }
    
    // Log this crawl
    crawlLogs.push({
      timestamp: new Date().toISOString(),
      source: 'aic',
      endpoint: 'https://api.artic.edu/api/v1/artworks/search',
      query,
      filters: { is_public_domain: true, has_image_id: true },
      pagesFetched,
      totalResults,
      idsAccepted: acceptedIds,
      idsRejected: rejectedIds,
      crawlBatchId: CRAWL_BATCH_ID,
      durationMs: Date.now() - startTime,
    });
    
    console.log(`[AIC] Query "${query}": ${acceptedIds.length} accepted, ${rejectedIds.length} rejected`);
    await delay(500);
  }
  
  return artworks;
}

// ============================================================================
// File I/O
// ============================================================================

function appendCrawlLogs() {
  const logPath = path.join(__dirname, '..', 'research', 'crawl-log.jsonl');
  const logLines = crawlLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
  fs.appendFileSync(logPath, logLines, 'utf-8');
  console.log(`\n📝 Appended ${crawlLogs.length} crawl log entries to ${logPath}`);
}

function saveArtworks() {
  // Sort by dynasty order then by museum
  const dynastyOrder = ['唐', '五代', '北宋', '南宋', '宋', '辽', '金', '元', '明洪武', '明永乐', '明宣德', '明成化', '明嘉靖', '明万历', '明天启', '明', '清顺治', '清康熙', '清雍正', '清乾隆', '清嘉庆', '清道光', '清', '民国', '近现代', '未知'];
  
  allArtworks.sort((a, b) => {
    const aIndex = dynastyOrder.findIndex(d => a.dynasty.includes(d));
    const bIndex = dynastyOrder.findIndex(d => b.dynasty.includes(d));
    const aDynasty = aIndex === -1 ? 999 : aIndex;
    const bDynasty = bIndex === -1 ? 999 : bIndex;
    if (aDynasty !== bDynasty) return aDynasty - bDynasty;
    return a.sourceMuseum.localeCompare(b.sourceMuseum);
  });
  
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'artworks.json');
  fs.writeFileSync(outputPath, JSON.stringify(allArtworks, null, 2), 'utf-8');
  console.log(`\n🎉 Saved ${allArtworks.length} artworks to ${outputPath}`);
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CRAWL SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\nTotal artworks collected: ${allArtworks.length}`);
  console.log(`Crawl batch ID: ${CRAWL_BATCH_ID}`);
  
  // By source
  const bySrc: Record<string, number> = {};
  for (const art of allArtworks) {
    bySrc[art.sourceMuseumEnglish] = (bySrc[art.sourceMuseumEnglish] || 0) + 1;
  }
  console.log('\nBy Museum:');
  for (const [museum, count] of Object.entries(bySrc).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${museum}: ${count}`);
  }
  
  // By dynasty
  const byDynasty: Record<string, number> = {};
  for (const art of allArtworks) {
    byDynasty[art.dynasty] = (byDynasty[art.dynasty] || 0) + 1;
  }
  console.log('\nBy Dynasty:');
  for (const [dynasty, count] of Object.entries(byDynasty).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dynasty}: ${count}`);
  }
  
  // By object type
  const byType: Record<string, number> = {};
  for (const art of allArtworks) {
    byType[art.objectType] = (byType[art.objectType] || 0) + 1;
  }
  console.log('\nBy Object Type:');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
  
  // By material
  const byMaterial: Record<string, number> = {};
  for (const art of allArtworks) {
    byMaterial[art.material] = (byMaterial[art.material] || 0) + 1;
  }
  console.log('\nBy Material:');
  for (const [material, count] of Object.entries(byMaterial).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${material}: ${count}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🍵 Chinese Tea Ware Gallery - Comprehensive Museum Crawl');
  console.log(`📦 Batch ID: ${CRAWL_BATCH_ID}`);
  console.log('='.repeat(60));
  
  // Met queries - comprehensive list for tea ware
  const metQueries = [
    'tea bowl China',
    'tea cup China',
    'teapot China',
    'teapot Chinese',
    'Yixing teapot',
    'Yixing',
    'tenmoku',
    'Jian ware bowl',
    'gaiwan',
    'wine cup China',
    'wine cup Chinese',
    'wine bowl China',
    'stoneware bowl China',
    'porcelain cup China',
    'porcelain bowl China',
    'celadon bowl',
    'celadon cup',
    'Longquan celadon',
    'famille rose teapot',
    'famille rose cup',
    'blue white teapot China',
    'blue white cup China',
    'Dehua porcelain cup',
    'tea caddy China',
    'Song dynasty tea bowl',
    'Song dynasty bowl',
    'Ming dynasty cup',
    'Ming dynasty teapot',
    'Qing dynasty teapot',
    'Qing dynasty cup',
    'Kangxi teapot',
    'Kangxi cup',
    'Qianlong teapot',
    'Qianlong cup',
    'Yongzheng cup',
    'Chinese ewer',
    'stem cup China',
    'libation cup China',
  ];
  
  // CMA queries
  const cmaQueries = [
    'teapot Chinese',
    'tea bowl Chinese',
    'tea cup Chinese',
    'Yixing',
    'celadon Chinese',
    'porcelain cup Chinese',
    'wine cup Chinese',
    'Chinese ceramics tea',
    'Chinese ceramics bowl',
    'Chinese ceramics cup',
  ];
  
  // AIC queries
  const aicQueries = [
    'teapot Chinese',
    'teapot China',
    'tea bowl Chinese',
    'tea bowl China',
    'Yixing teapot',
    'celadon bowl China',
    'porcelain cup China',
    'Song dynasty ceramics',
    'Ming dynasty porcelain cup',
    'Qing dynasty teapot',
    'Jingdezhen porcelain tea',
    'Chinese wine cup',
  ];
  
  // Crawl all sources
  console.log('\n🏛️ Starting Met Museum crawl...');
  const metArtworks = await crawlMet(metQueries);
  allArtworks.push(...metArtworks);
  console.log(`\n✅ Met: ${metArtworks.length} artworks collected`);
  
  console.log('\n🏛️ Starting Cleveland Museum crawl...');
  const cmaArtworks = await crawlCMA(cmaQueries);
  allArtworks.push(...cmaArtworks);
  console.log(`\n✅ CMA: ${cmaArtworks.length} artworks collected`);
  
  console.log('\n🏛️ Starting Art Institute of Chicago crawl...');
  const aicArtworks = await crawlAIC(aicQueries);
  allArtworks.push(...aicArtworks);
  console.log(`\n✅ AIC: ${aicArtworks.length} artworks collected`);
  
  // Save results
  appendCrawlLogs();
  saveArtworks();
  printSummary();
}

main().catch(console.error);
