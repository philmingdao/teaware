/**
 * Script to fetch Chinese tea ware artworks from museum open access APIs
 * Sources: The Metropolitan Museum of Art, Cleveland Museum of Art
 * 
 * Run with: npx tsx scripts/fetch-artworks.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface MetObject {
  objectID: number;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  title: string;
  culture: string;
  period: string;
  dynasty: string;
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
}

interface CMAObject {
  id: number;
  title: string;
  creation_date: string;
  culture: string[];
  technique: string;
  measurements: string;
  accession_number: string;
  creditline: string;
  url: string;
  images: {
    web?: { url: string };
    print?: { url: string };
  };
  share_license_status: string;
  department: string;
  type: string;
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
  objectType: '茶壶' | '杯盏' | '茶具组';
  objectTypeEnglish: 'Teapot' | 'Tea Bowl/Cup' | 'Tea Set';
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
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Dynasty mapping for Chinese translations
const dynastyMap: Record<string, { chinese: string; english: string }> = {
  'tang': { chinese: '唐', english: 'Tang Dynasty' },
  'song': { chinese: '宋', english: 'Song Dynasty' },
  'northern song': { chinese: '宋', english: 'Northern Song Dynasty' },
  'southern song': { chinese: '宋', english: 'Southern Song Dynasty' },
  'yuan': { chinese: '元', english: 'Yuan Dynasty' },
  'ming': { chinese: '明', english: 'Ming Dynasty' },
  'qing': { chinese: '清', english: 'Qing Dynasty' },
  'qianlong': { chinese: '清', english: 'Qing Dynasty (Qianlong Period)' },
  'yongzheng': { chinese: '清', english: 'Qing Dynasty (Yongzheng Period)' },
  'kangxi': { chinese: '清', english: 'Qing Dynasty (Kangxi Period)' },
  'jiaqing': { chinese: '清', english: 'Qing Dynasty (Jiaqing Period)' },
  'daoguang': { chinese: '清', english: 'Qing Dynasty (Daoguang Period)' },
  'republic': { chinese: '近现代', english: 'Republic Period' },
  'modern': { chinese: '近现代', english: 'Modern' },
};

// Material mapping
const materialMap: Record<string, { chinese: string; english: string; category: string }> = {
  'blue and white': { chinese: '青花瓷', english: 'Blue and White Porcelain', category: '青花瓷' },
  'blue-and-white': { chinese: '青花瓷', english: 'Blue and White Porcelain', category: '青花瓷' },
  'famille rose': { chinese: '粉彩', english: 'Famille Rose Porcelain', category: '粉彩' },
  'famille verte': { chinese: '五彩', english: 'Famille Verte Porcelain', category: '粉彩' },
  'enamel': { chinese: '珐琅彩', english: 'Enamel', category: '珐琅彩' },
  'cloisonné': { chinese: '景泰蓝', english: 'Cloisonné Enamel', category: '珐琅' },
  'cloisonne': { chinese: '景泰蓝', english: 'Cloisonné Enamel', category: '珐琅' },
  'celadon': { chinese: '青瓷', english: 'Celadon', category: '青瓷' },
  'longquan': { chinese: '龙泉青瓷', english: 'Longquan Celadon', category: '青瓷' },
  'jian': { chinese: '建盏', english: 'Jian Ware', category: '建盏' },
  'tenmoku': { chinese: '建盏', english: 'Tenmoku', category: '建盏' },
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
};

// Kiln mapping
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
};

function detectDynasty(text: string): { chinese: string; english: string } | null {
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(dynastyMap)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }
  return null;
}

function detectMaterial(text: string): { chinese: string; english: string; category: string } | null {
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(materialMap)) {
    if (lowerText.includes(key)) {
      return value;
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

function detectObjectType(text: string): { chinese: '茶壶' | '杯盏' | '茶具组'; english: 'Teapot' | 'Tea Bowl/Cup' | 'Tea Set' } {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('teapot') || lowerText.includes('pot') || lowerText.includes('ewer')) {
    return { chinese: '茶壶', english: 'Teapot' };
  }
  if (lowerText.includes('set') || lowerText.includes('service')) {
    return { chinese: '茶具组', english: 'Tea Set' };
  }
  return { chinese: '杯盏', english: 'Tea Bowl/Cup' };
}

function generateChineseTitle(englishTitle: string, dynasty: string, material: string, objectType: string): string {
  const dynastyStr = dynasty || '';
  const materialStr = material || '';
  
  // Create a meaningful Chinese title based on available information
  if (englishTitle.toLowerCase().includes('teapot')) {
    return `${dynastyStr}${materialStr}茶壶`;
  }
  if (englishTitle.toLowerCase().includes('tea bowl') || englishTitle.toLowerCase().includes('teabowl')) {
    return `${dynastyStr}${materialStr}茶盏`;
  }
  if (englishTitle.toLowerCase().includes('cup')) {
    return `${dynastyStr}${materialStr}茶杯`;
  }
  if (englishTitle.toLowerCase().includes('ewer')) {
    return `${dynastyStr}${materialStr}执壶`;
  }
  return `${dynastyStr}${materialStr}${objectType}`;
}

function generateDescription(artwork: Partial<CuratedArtwork>): string {
  const parts: string[] = [];
  
  if (artwork.dynasty && artwork.date) {
    parts.push(`此件${artwork.objectType || '茶器'}为${artwork.dynasty}时期（${artwork.date}）之作品。`);
  } else if (artwork.dynasty) {
    parts.push(`此件${artwork.objectType || '茶器'}为${artwork.dynasty}时期之作品。`);
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

async function fetchMetSearchResults(query: string): Promise<number[]> {
  try {
    const url = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&geoLocation=China&hasImages=true`;
    console.log(`Fetching Met search: ${query}`);
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
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching Met object ${objectId}:`, error);
    return null;
  }
}

async function fetchCMASearchResults(query: string): Promise<CMAObject[]> {
  try {
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&limit=50`;
    console.log(`Fetching CMA search: ${query}`);
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching CMA search for ${query}:`, error);
    return [];
  }
}

function isChineseTeaWare(obj: MetObject): boolean {
  const searchText = `${obj.title} ${obj.culture} ${obj.objectName} ${obj.classification} ${obj.country}`.toLowerCase();
  const isTeaRelated = searchText.includes('tea') || searchText.includes('teapot') || 
                       searchText.includes('cup') || searchText.includes('bowl') ||
                       searchText.includes('ewer') || searchText.includes('wine');
  const isChinese = searchText.includes('china') || searchText.includes('chinese');
  return isTeaRelated && isChinese;
}

function isCMAChineseTeaWare(obj: CMAObject): boolean {
  const searchText = `${obj.title} ${obj.culture?.join(' ') || ''} ${obj.type} ${obj.department}`.toLowerCase();
  const isTeaRelated = searchText.includes('tea') || searchText.includes('teapot') || 
                       searchText.includes('cup') || searchText.includes('bowl') ||
                       searchText.includes('ewer');
  const isChinese = searchText.includes('china') || searchText.includes('chinese');
  return isTeaRelated && isChinese;
}

async function fetchFromMet(): Promise<CuratedArtwork[]> {
  const artworks: CuratedArtwork[] = [];
  const seenIds = new Set<number>();
  
  const queries = [
    'teapot China',
    'tea bowl China',
    'Yixing teapot',
    'Jian ware',
    'celadon cup',
    'blue white teapot',
    'porcelain teapot China',
    'tea cup China',
    'wine cup China',
    'ewer China',
    'famille rose teapot',
    'dehua porcelain',
  ];
  
  for (const query of queries) {
    const objectIds = await fetchMetSearchResults(query);
    console.log(`Found ${objectIds.length} results for "${query}"`);
    
    for (const objectId of objectIds.slice(0, 20)) {
      if (seenIds.has(objectId)) continue;
      seenIds.add(objectId);
      
      await delay(100); // Rate limiting
      const obj = await fetchMetObject(objectId);
      
      if (!obj || !obj.isPublicDomain || !obj.primaryImage) {
        continue;
      }
      
      if (!isChineseTeaWare(obj)) {
        continue;
      }
      
      const combinedText = `${obj.title} ${obj.medium} ${obj.period} ${obj.dynasty}`;
      const dynasty = detectDynasty(combinedText);
      const material = detectMaterial(combinedText);
      const kiln = detectKiln(combinedText);
      const objectType = detectObjectType(obj.title);
      
      const artwork: CuratedArtwork = {
        id: `met-${obj.objectID}`,
        titleChinese: generateChineseTitle(obj.title, dynasty?.chinese || '', material?.chinese || '', objectType.chinese),
        titleEnglish: obj.title,
        dynasty: dynasty?.chinese || '未知',
        dynastyEnglish: dynasty?.english || obj.dynasty || obj.period || 'Unknown Period',
        period: obj.period || undefined,
        date: obj.objectDate || 'Date unknown',
        material: material?.chinese || '瓷器',
        materialEnglish: material?.english || obj.medium,
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
        imageAlt: `${obj.title} - ${obj.objectDate}`,
        license: 'CC0 / Public Domain',
        creditLine: obj.creditLine,
      };
      
      artwork.description = generateDescription(artwork);
      artworks.push(artwork);
      
      console.log(`Added: ${artwork.titleEnglish} (${artwork.dynasty})`);
      
      if (artworks.length >= 30) break;
    }
    
    if (artworks.length >= 30) break;
    await delay(500);
  }
  
  return artworks;
}

async function fetchFromCMA(): Promise<CuratedArtwork[]> {
  const artworks: CuratedArtwork[] = [];
  const seenIds = new Set<number>();
  
  const queries = [
    'teapot Chinese',
    'tea bowl Chinese',
    'Yixing',
    'celadon',
    'porcelain cup Chinese',
    'wine cup Chinese',
  ];
  
  for (const query of queries) {
    const results = await fetchCMASearchResults(query);
    console.log(`CMA found ${results.length} results for "${query}"`);
    
    for (const obj of results) {
      if (seenIds.has(obj.id)) continue;
      seenIds.add(obj.id);
      
      if (!obj.images?.web?.url) {
        continue;
      }
      
      if (obj.share_license_status !== 'CC0') {
        continue;
      }
      
      if (!isCMAChineseTeaWare(obj)) {
        continue;
      }
      
      const combinedText = `${obj.title} ${obj.technique || ''} ${obj.creation_date || ''}`;
      const dynasty = detectDynasty(combinedText);
      const material = detectMaterial(combinedText);
      const kiln = detectKiln(combinedText);
      const objectType = detectObjectType(obj.title);
      
      const artwork: CuratedArtwork = {
        id: `cma-${obj.id}`,
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
        imageUrl: obj.images.web!.url,
        imageAlt: `${obj.title} - ${obj.creation_date}`,
        license: 'CC0 / Public Domain',
        creditLine: obj.creditline,
      };
      
      artwork.description = generateDescription(artwork);
      artworks.push(artwork);
      
      console.log(`Added from CMA: ${artwork.titleEnglish} (${artwork.dynasty})`);
      
      if (artworks.length >= 15) break;
    }
    
    if (artworks.length >= 15) break;
    await delay(500);
  }
  
  return artworks;
}

async function main() {
  console.log('🍵 Fetching Chinese tea ware artworks...\n');
  
  const metArtworks = await fetchFromMet();
  console.log(`\n✅ Fetched ${metArtworks.length} artworks from Met\n`);
  
  const cmaArtworks = await fetchFromCMA();
  console.log(`\n✅ Fetched ${cmaArtworks.length} artworks from CMA\n`);
  
  const allArtworks = [...metArtworks, ...cmaArtworks];
  
  // Sort by dynasty order
  const dynastyOrder = ['唐', '宋', '元', '明', '清', '近现代', '未知'];
  allArtworks.sort((a, b) => {
    const aIndex = dynastyOrder.indexOf(a.dynasty);
    const bIndex = dynastyOrder.indexOf(b.dynasty);
    return aIndex - bIndex;
  });
  
  // Write to JSON file
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'artworks.json');
  fs.writeFileSync(outputPath, JSON.stringify(allArtworks, null, 2), 'utf-8');
  
  console.log(`\n🎉 Successfully saved ${allArtworks.length} artworks to ${outputPath}`);
  
  // Print summary by dynasty
  console.log('\n📊 Summary by dynasty:');
  const dynastyCounts: Record<string, number> = {};
  for (const artwork of allArtworks) {
    dynastyCounts[artwork.dynasty] = (dynastyCounts[artwork.dynasty] || 0) + 1;
  }
  for (const [dynasty, count] of Object.entries(dynastyCounts)) {
    console.log(`  ${dynasty}: ${count}`);
  }
}

main().catch(console.error);
