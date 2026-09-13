/**
 * Fetch Teaware Images from Wikimedia Commons
 * 
 * Searches for CC0/Public Domain Chinese teaware images on Wikimedia Commons
 * Downloads HD images and adds them to the collection
 * 
 * Run: npx tsx scripts/fetch-wikimedia-teaware.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface WikimediaFile {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    url: string;
    descriptionurl: string;
    width: number;
    height: number;
    extmetadata?: {
      LicenseShortName?: { value: string };
      Artist?: { value: string };
      ImageDescription?: { value: string };
      DateTimeOriginal?: { value: string };
      Credit?: { value: string };
    };
  }>;
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

const ARTWORKS_PATH = path.join(__dirname, '..', 'src', 'data', 'artworks.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'artworks');
const CRAWL_LOG_PATH = path.join(__dirname, '..', 'research', 'crawl-log.jsonl');

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const SEARCH_CATEGORIES = [
  'Chinese_teapots',
  'Yixing_ware',
  'Chinese_tea_bowls',
  'Jian_ware',
  'Chinese_celadon',
  'Song_dynasty_ceramics',
  'Ming_dynasty_ceramics',
  'Qing_dynasty_ceramics',
  'Chinese_porcelain_in_the_Metropolitan_Museum_of_Art',
  'Chinese_porcelain_in_the_British_Museum',
  'Chinese_ceramics_in_the_Victoria_and_Albert_Museum',
  'Tea_ware',
  'Gaiwan',
  'Blue_and_white_Chinese_porcelain',
  'Famille_rose_porcelain',
];

const SEARCH_QUERIES = [
  'Chinese teapot',
  'Chinese tea bowl',
  'Yixing teapot',
  'Jian ware',
  'Song dynasty bowl',
  'Ming dynasty cup',
  'Qing dynasty teapot',
  'Chinese celadon bowl',
  'Blue and white Chinese porcelain cup',
  'Gaiwan',
];

async function searchWikimediaCategory(category: string): Promise<WikimediaFile[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:${encodeURIComponent(category)}&gcmtype=file&gcmlimit=100&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=2000&format=json`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TeawareGallery/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const pages = data.query?.pages || {};
    return Object.values(pages) as WikimediaFile[];
  } catch {
    return [];
  }
}

async function searchWikimediaText(query: string): Promise<WikimediaFile[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=50&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=2000&format=json`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TeawareGallery/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const pages = data.query?.pages || {};
    return Object.values(pages) as WikimediaFile[];
  } catch {
    return [];
  }
}

function isPublicDomain(file: WikimediaFile): boolean {
  const license = file.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value?.toLowerCase() || '';
  return license.includes('cc0') || 
         license.includes('public domain') || 
         license.includes('pd') ||
         license.includes('cc-pd');
}

function isSuitableImage(file: WikimediaFile): boolean {
  const info = file.imageinfo?.[0];
  if (!info) return false;
  
  // Must be reasonably high resolution
  const minDim = Math.min(info.width, info.height);
  if (minDim < 800) return false;
  
  // Must have a URL
  if (!info.url) return false;
  
  return true;
}

function extractMetadata(file: WikimediaFile): Partial<CuratedArtwork> {
  const info = file.imageinfo?.[0];
  const meta = info?.extmetadata || {};
  
  const title = file.title.replace(/^File:/, '').replace(/\.[^.]+$/, '');
  const description = meta.ImageDescription?.value || '';
  const credit = meta.Credit?.value || '';
  const artist = meta.Artist?.value || '';
  
  // Try to detect dynasty from title/description
  const combined = `${title} ${description}`.toLowerCase();
  let dynasty = '未知';
  let dynastyEn = 'Unknown';
  
  if (combined.includes('song')) { dynasty = '宋'; dynastyEn = 'Song Dynasty'; }
  else if (combined.includes('ming')) { dynasty = '明'; dynastyEn = 'Ming Dynasty'; }
  else if (combined.includes('qing')) { dynasty = '清'; dynastyEn = 'Qing Dynasty'; }
  else if (combined.includes('yuan')) { dynasty = '元'; dynastyEn = 'Yuan Dynasty'; }
  else if (combined.includes('tang')) { dynasty = '唐'; dynastyEn = 'Tang Dynasty'; }
  
  // Detect object type
  let objectType = '杯盏';
  let objectTypeEn = 'Tea Bowl/Cup';
  
  if (combined.includes('teapot') || combined.includes('tea pot')) {
    objectType = '茶壶';
    objectTypeEn = 'Teapot';
  } else if (combined.includes('ewer')) {
    objectType = '执壶';
    objectTypeEn = 'Ewer';
  } else if (combined.includes('gaiwan')) {
    objectType = '盖碗';
    objectTypeEn = 'Gaiwan';
  }
  
  // Detect material
  let material = '瓷器';
  let materialEn = 'Porcelain';
  
  if (combined.includes('yixing') || combined.includes('zisha')) {
    material = '宜兴紫砂';
    materialEn = 'Yixing Purple Clay';
  } else if (combined.includes('jian') || combined.includes('tenmoku')) {
    material = '建盏';
    materialEn = 'Jian Ware';
  } else if (combined.includes('celadon')) {
    material = '青瓷';
    materialEn = 'Celadon';
  } else if (combined.includes('blue and white') || combined.includes('blue-and-white')) {
    material = '青花瓷';
    materialEn = 'Blue and White';
  }
  
  return {
    titleChinese: `${dynasty}${material}${objectType}`,
    titleEnglish: title,
    dynasty,
    dynastyEnglish: dynastyEn,
    material,
    materialEnglish: materialEn,
    objectType,
    objectTypeEnglish: objectTypeEn,
    date: meta.DateTimeOriginal?.value || 'Unknown',
    creditLine: credit || artist || undefined,
  };
}

async function downloadImage(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TeawareGallery/1.0' },
      signal: AbortSignal.timeout(120000),
    });
    
    if (!response.ok) return false;
    
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    if (bytes.length < 1000) return false;
    
    // Check magic bytes
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    
    if (!isJpeg && !isPng) return false;
    
    fs.writeFileSync(outputPath, Buffer.from(bytes));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🖼️  Wikimedia Commons Teaware Fetcher');
  console.log('='.repeat(50));
  
  // Load existing artworks to avoid duplicates
  const existingArtworks: CuratedArtwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const existingIds = new Set(existingArtworks.map(a => a.id));
  const existingTitles = new Set(existingArtworks.map(a => a.titleEnglish.toLowerCase()));
  
  console.log(`📦 Loaded ${existingArtworks.length} existing artworks`);
  
  const allFiles: WikimediaFile[] = [];
  const seenPageIds = new Set<number>();
  
  // Search categories
  console.log('\n🔍 Searching categories...');
  for (const category of SEARCH_CATEGORIES) {
    console.log(`  Category: ${category}`);
    const files = await searchWikimediaCategory(category);
    for (const f of files) {
      if (!seenPageIds.has(f.pageid)) {
        seenPageIds.add(f.pageid);
        allFiles.push(f);
      }
    }
    await delay(500);
  }
  
  // Search text queries
  console.log('\n🔍 Searching text queries...');
  for (const query of SEARCH_QUERIES) {
    console.log(`  Query: ${query}`);
    const files = await searchWikimediaText(query);
    for (const f of files) {
      if (!seenPageIds.has(f.pageid)) {
        seenPageIds.add(f.pageid);
        allFiles.push(f);
      }
    }
    await delay(500);
  }
  
  console.log(`\n📊 Found ${allFiles.length} unique files`);
  
  // Filter for public domain and suitable images
  const suitable = allFiles.filter(f => isPublicDomain(f) && isSuitableImage(f));
  console.log(`📊 ${suitable.length} are public domain with suitable resolution`);
  
  // Download and add new artworks
  const newArtworks: CuratedArtwork[] = [];
  let downloaded = 0;
  let skipped = 0;
  
  for (const file of suitable) {
    const id = `wiki-${file.pageid}`;
    
    if (existingIds.has(id)) {
      skipped++;
      continue;
    }
    
    const title = file.title.replace(/^File:/, '').replace(/\.[^.]+$/, '');
    if (existingTitles.has(title.toLowerCase())) {
      skipped++;
      continue;
    }
    
    const info = file.imageinfo?.[0];
    if (!info?.url) continue;
    
    const localPath = path.join(OUTPUT_DIR, `${id}.jpg`);
    const relativePath = `/artworks/${id}.jpg`;
    
    // Skip if already downloaded
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      if (stats.size > 1000) {
        skipped++;
        continue;
      }
    }
    
    console.log(`[${downloaded + 1}] ${title.slice(0, 50)}...`);
    
    const success = await downloadImage(info.url, localPath);
    if (!success) {
      console.log(`  ❌ Download failed`);
      continue;
    }
    
    const metadata = extractMetadata(file);
    
    const artwork: CuratedArtwork = {
      id,
      titleChinese: metadata.titleChinese || title,
      titleEnglish: title,
      dynasty: metadata.dynasty || '未知',
      dynastyEnglish: metadata.dynastyEnglish || 'Unknown',
      date: metadata.date || 'Unknown',
      material: metadata.material || '瓷器',
      materialEnglish: metadata.materialEnglish || 'Porcelain',
      objectType: metadata.objectType || '杯盏',
      objectTypeEnglish: metadata.objectTypeEnglish || 'Tea Bowl/Cup',
      dimensions: `${info.width}x${info.height}px`,
      description: `此件${metadata.objectType}藏品图片来自维基共享资源。采用${metadata.material}工艺。`,
      sourceMuseum: '维基共享资源',
      sourceMuseumEnglish: 'Wikimedia Commons',
      accessionNumber: `wiki-${file.pageid}`,
      sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${file.title}`,
      imageUrl: relativePath,
      imageAlt: title,
      license: 'CC0 / Public Domain',
      creditLine: metadata.creditLine,
      crawlBatchId: `wikimedia-${Date.now()}`,
    };
    
    newArtworks.push(artwork);
    existingIds.add(id);
    existingTitles.add(title.toLowerCase());
    downloaded++;
    
    if (downloaded >= 200) {
      console.log('Reached limit of 200 new items');
      break;
    }
    
    await delay(300);
  }
  
  // Merge and save
  const allArtworks = [...existingArtworks, ...newArtworks];
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(allArtworks, null, 2), 'utf-8');
  
  // Log the crawl
  const logEntry = {
    timestamp: new Date().toISOString(),
    source: 'wikimedia',
    query: 'categories+text_search',
    totalResults: allFiles.length,
    idsAccepted: downloaded,
    idsRejected: skipped,
    crawlBatchId: `wikimedia-${Date.now()}`,
  };
  fs.appendFileSync(CRAWL_LOG_PATH, JSON.stringify(logEntry) + '\n', 'utf-8');
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  ✅ Downloaded: ${downloaded}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📦 Total artworks: ${allArtworks.length}`);
}

main().catch(console.error);
