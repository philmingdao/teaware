/**
 * Expansion Script to reach 2,000 artworks milestone
 * 
 * Target: Add ~220+ net-new artworks to reach 2,000 total
 * Key-free sources: Met, CMA, Wikimedia Commons
 * 
 * Strategy:
 * 1. Fresh Met queries not covered in previous rounds
 * 2. Deep dive into CMA with broader searches
 * 3. Wikimedia Commons categories for Asian museums
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

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
const CRAWL_LOG_PATH = path.join(ROOT, 'research', 'crawl-log.jsonl');
const IMAGES_DIR = path.join(ROOT, 'public', 'artworks');
const BATCH_ID = `expand-to-2000-${Date.now()}`;

// Met queries targeting underexplored areas
const MET_QUERIES = [
  // Chinese tea ware - new variations
  'porcelain tea ware China',
  'ceramic drinking vessel China',
  'glazed bowl China',
  'glazed cup China',
  'saucer China porcelain',
  'cup stand China',
  'tea service China',
  'drinking bowl China',
  'wine bowl China porcelain',
  'punch bowl China',
  'handleless cup China',
  'small bowl China porcelain',
  
  // Dynasty + object combinations not heavily mined
  'Five Dynasties bowl',
  'Five Dynasties cup',
  'Liao dynasty bowl',
  'Liao dynasty cup',
  'Jin dynasty bowl',
  'Jin dynasty cup',
  'Southern Song cup',
  'Northern Song cup',
  'Yuan dynasty porcelain bowl',
  
  // Ware types
  'Longquan ware bowl',
  'Longquan ware cup',
  'Ding ware cup',
  'Cizhou ware cup',
  'Qingbai ware bowl',
  'Qingbai ware cup',
  'black glazed bowl China',
  'brown glazed bowl China',
  'white glazed bowl China',
  'green glazed bowl China',
  'overglaze enamel cup China',
  'doucai cup',
  'doucai bowl',
  
  // Regional/Export
  'Jingdezhen porcelain bowl',
  'Jingdezhen porcelain cup',
  'Canton porcelain cup',
  'Swatow porcelain bowl',
  'kraak porcelain bowl',
  'export ware bowl China',
  'trade porcelain bowl',
  
  // Japanese tea ceremony
  'Mino ware tea bowl',
  'Seto ware bowl',
  'Karatsu ware bowl',
  'Iga ware',
  'tea ceremony utensil Japan',
  'matcha bowl Japan',
  'mizusashi Japan',
  'futaoki Japan',
  
  // Korean
  'Joseon porcelain cup',
  'Joseon dynasty bowl',
  'Korean white porcelain cup',
  'Korean blue white bowl',
  
  // Vietnamese
  'Vietnamese ceramics bowl',
  'Annamese ceramics',
];

// CMA queries with broader terms
const CMA_QUERIES = [
  'Asian ceramics bowl',
  'Asian ceramics cup',
  'East Asian porcelain',
  'Chinese export',
  'Korea ceramics',
  'Japan ceramics bowl',
  'drinking vessel',
  'tea service',
  'Song dynasty',
  'Ming dynasty',
  'Qing dynasty bowl',
  'Kangxi porcelain',
  'Qianlong porcelain',
  'Yongzheng porcelain',
  'underglaze blue',
  'overglaze enamel',
  'green glaze',
  'black glaze',
  'white porcelain',
  'stoneware Chinese',
  'celadon ware',
  'Jian ware',
];

// Wikimedia categories focusing on museum collections
const WIKI_CATEGORIES = [
  // Museum collections
  'Category:Chinese_ceramics_in_the_Metropolitan_Museum_of_Art',
  'Category:Chinese_ceramics_in_the_British_Museum',
  'Category:Chinese_ceramics_in_the_Victoria_and_Albert_Museum',
  'Category:Chinese_ceramics_in_the_Rijksmuseum',
  'Category:Chinese_ceramics_in_the_Freer_Gallery_of_Art',
  'Category:Chinese_ceramics_in_the_Asian_Art_Museum_of_San_Francisco',
  'Category:Chinese_ceramics_in_the_Walters_Art_Museum',
  'Category:Chinese_ceramics_in_the_Los_Angeles_County_Museum_of_Art',
  'Category:Chinese_ceramics_in_the_Musée_Guimet',
  
  // Type categories
  'Category:Chinese_bowls',
  'Category:Chinese_cups',
  'Category:Porcelain_bowls',
  'Category:Porcelain_cups',
  'Category:Asian_bowls',
  'Category:Ceramic_bowls',
  
  // Ware and kiln categories
  'Category:Longquan_ware',
  'Category:Jingdezhen_porcelain',
  'Category:Qingbai_ware',
  'Category:Cizhou_ware',
  'Category:Chinese_blue_and_white_porcelain',
  'Category:Famille_rose_porcelain',
  'Category:Famille_verte_porcelain',
  'Category:Doucai_porcelain',
  
  // Korean
  'Category:Korean_ceramics_in_the_Metropolitan_Museum_of_Art',
  'Category:Korean_ceramics_in_the_British_Museum',
  'Category:Joseon_white_porcelain',
  
  // Japanese
  'Category:Japanese_ceramics_in_the_Metropolitan_Museum_of_Art',
  'Category:Japanese_tea_bowls',
  'Category:Arita_porcelain',
  'Category:Mino_ware',
  'Category:Karatsu_ware',
];

// Helper functions
function fetch(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://github.com/philmingdao/teaware; contact@philmingdao.com)',
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
  if (buffer.length < 3000) return false;
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  return isJpeg || isPng;
}

function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseDynasty(date: string, culture: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture).toLowerCase();
  
  if (lower.includes('edo') || (lower.includes('japan') && (lower.includes('17') || lower.includes('18') || lower.includes('16')))) {
    return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
  }
  if (lower.includes('muromachi')) {
    return { dynasty: '室町', dynastyEnglish: 'Muromachi Period (Japan)' };
  }
  if (lower.includes('momoyama')) {
    return { dynasty: '桃山', dynastyEnglish: 'Momoyama Period (Japan)' };
  }
  if (lower.includes('meiji')) {
    return { dynasty: '明治', dynastyEnglish: 'Meiji Period (Japan)' };
  }
  if (lower.includes('joseon') || lower.includes('choson') || lower.includes('yi dynasty')) {
    return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)' };
  }
  if (lower.includes('goryeo') || lower.includes('koryo')) {
    return { dynasty: '高麗', dynastyEnglish: 'Goryeo Dynasty (Korea)' };
  }
  if (lower.includes('vietnam') || lower.includes('annamese') || lower.includes('dai viet')) {
    return { dynasty: '越南', dynastyEnglish: 'Vietnam' };
  }
  if (lower.includes('tang') || (lower.includes('618') && lower.includes('907'))) {
    return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty' };
  }
  if (lower.includes('five dynasties') || lower.includes('five dynasty')) {
    return { dynasty: '五代', dynastyEnglish: 'Five Dynasties' };
  }
  if (lower.includes('liao')) {
    return { dynasty: '辽', dynastyEnglish: 'Liao Dynasty' };
  }
  if (lower.includes('jin') && !lower.includes('jing')) {
    return { dynasty: '金', dynastyEnglish: 'Jin Dynasty' };
  }
  if (lower.includes('song') || (lower.includes('960') && lower.includes('1279'))) {
    if (lower.includes('northern')) return { dynasty: '北宋', dynastyEnglish: 'Northern Song Dynasty' };
    if (lower.includes('southern')) return { dynasty: '南宋', dynastyEnglish: 'Southern Song Dynasty' };
    return { dynasty: '宋', dynastyEnglish: 'Song Dynasty' };
  }
  if (lower.includes('yuan') || (lower.includes('1271') && lower.includes('1368'))) {
    return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty' };
  }
  if (lower.includes('ming') || (lower.includes('1368') && lower.includes('1644'))) {
    return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  }
  if (lower.includes('qing') || lower.includes('1644') || lower.includes('1912') ||
      lower.includes('kangxi') || lower.includes('yongzheng') || lower.includes('qianlong') ||
      lower.includes('jiaqing') || lower.includes('daoguang') || lower.includes('guangxu')) {
    return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  }
  
  return { dynasty: '其他', dynastyEnglish: 'Other Period' };
}

function parseMaterial(medium: string): { material: string; materialEnglish: string } {
  const lower = medium.toLowerCase();
  
  if (lower.includes('yixing') || lower.includes('zisha') || lower.includes('purple clay')) {
    return { material: '紫砂', materialEnglish: 'Yixing Clay' };
  }
  if (lower.includes('blue and white') || lower.includes('underglaze blue') || lower.includes('青花')) {
    return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  }
  if (lower.includes('doucai') || lower.includes('斗彩')) {
    return { material: '斗彩', materialEnglish: 'Doucai' };
  }
  if (lower.includes('famille rose') || lower.includes('fencai') || lower.includes('粉彩')) {
    return { material: '粉彩', materialEnglish: 'Famille Rose' };
  }
  if (lower.includes('famille verte') || lower.includes('wucai') || lower.includes('五彩')) {
    return { material: '五彩', materialEnglish: 'Famille Verte' };
  }
  if (lower.includes('celadon') || lower.includes('qingci') || lower.includes('青瓷')) {
    if (lower.includes('longquan') || lower.includes('龙泉')) {
      return { material: '龙泉青瓷', materialEnglish: 'Longquan Celadon' };
    }
    return { material: '青瓷', materialEnglish: 'Celadon' };
  }
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes('hare') || lower.includes('oil spot')) {
    return { material: '建盏', materialEnglish: 'Jian Ware' };
  }
  if (lower.includes('qingbai') || lower.includes('影青')) {
    return { material: '青白瓷', materialEnglish: 'Qingbai Ware' };
  }
  if (lower.includes('dehua') || lower.includes('blanc de chine')) {
    return { material: '德化白瓷', materialEnglish: 'Dehua Blanc de Chine' };
  }
  if (lower.includes('goryeo') || lower.includes('korean celadon')) {
    return { material: '高麗青瓷', materialEnglish: 'Goryeo Celadon' };
  }
  if (lower.includes('black glaze') || lower.includes('黑釉')) {
    return { material: '黑釉', materialEnglish: 'Black Glaze' };
  }
  if (lower.includes('brown glaze') || lower.includes('酱釉')) {
    return { material: '酱釉', materialEnglish: 'Brown Glaze' };
  }
  if (lower.includes('white') && lower.includes('porcelain')) {
    return { material: '白瓷', materialEnglish: 'White Porcelain' };
  }
  if (lower.includes('stoneware')) {
    return { material: '陶器', materialEnglish: 'Stoneware' };
  }
  if (lower.includes('earthenware')) {
    return { material: '陶器', materialEnglish: 'Earthenware' };
  }
  if (lower.includes('porcelain')) {
    return { material: '瓷器', materialEnglish: 'Porcelain' };
  }
  
  return { material: '瓷器', materialEnglish: 'Porcelain' };
}

function parseObjectType(title: string, objectName?: string): { objectType: string; objectTypeEnglish: string } {
  const lower = ((title || '') + ' ' + (objectName || '')).toLowerCase();
  
  if (lower.includes('teapot') || lower.includes('tea pot')) {
    return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  }
  if (lower.includes('ewer')) {
    return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  }
  if (lower.includes('caddy') || lower.includes('tea jar') || lower.includes('tea container') ||
      lower.includes('chaire') || lower.includes('natsume')) {
    return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  }
  if (lower.includes('gaiwan') || lower.includes('covered cup') || lower.includes('covered bowl') ||
      lower.includes('lidded cup') || lower.includes('cup with cover')) {
    return { objectType: '盖碗', objectTypeEnglish: 'Gaiwan / Covered Cup' };
  }
  if (lower.includes('chawan') || lower.includes('茶碗') || lower.includes('matcha bowl')) {
    return { objectType: '茶碗', objectTypeEnglish: 'Chawan (Tea Bowl)' };
  }
  if (lower.includes('saucer')) {
    return { objectType: '茶托', objectTypeEnglish: 'Saucer' };
  }
  if (lower.includes('cup stand')) {
    return { objectType: '杯托', objectTypeEnglish: 'Cup Stand' };
  }
  
  return { objectType: '杯盏', objectTypeEnglish: 'Tea Bowl/Cup' };
}

function isValidTeaware(title: string, objectName: string, medium: string, department: string): boolean {
  const lower = (title + ' ' + objectName + ' ' + medium + ' ' + department).toLowerCase();
  
  const teaTerms = ['tea', 'teapot', 'tea pot', 'tea bowl', 'chawan', 'gaiwan', 
    'covered cup', 'tea cup', 'tea caddy', 'tea jar', 'chaire', 'natsume', 'tenmoku',
    'ewer', 'wine cup', 'wine pot', 'sake cup', 'wine vessel', 'bowl', 'cup',
    'covered bowl', 'lidded cup', 'celadon', 'yixing', 'saucer', 'cup stand',
    'drinking', 'punch bowl', 'small bowl'];
  
  const excludeTerms = ['snuff', 'incense', 'incense burner', 'censer', 'brush', 'brush pot',
    'vase', 'bottle', 'plate', 'dish', 'figure', 'statue', 'sculpture', 'painting', 
    'scroll', 'textile', 'furniture', 'basin', 'pillow', 'tile', 'roof', 'architectural',
    'sword', 'armor', 'weapon', 'mask', 'netsuke', 'inro', 'pendant', 'ornament', 'jar'];
  
  const isExcluded = excludeTerms.some(t => lower.includes(t) && !lower.includes('tea'));
  if (isExcluded) return false;
  
  const isTea = teaTerms.some(t => lower.includes(t));
  const isCeramics = lower.includes('ceramic') || lower.includes('porcelain') || 
                     lower.includes('stoneware') || lower.includes('earthenware') ||
                     lower.includes('pottery') || lower.includes('ware');
  const isAsianArt = lower.includes('asian') || lower.includes('chinese') || 
                     lower.includes('japanese') || lower.includes('korean') ||
                     lower.includes('vietnamese');
  
  return isTea || (isCeramics && (isAsianArt || lower.includes('bowl') || lower.includes('cup')));
}

async function downloadAndSaveImage(url: string, id: string, existingHashes: Set<string>): Promise<string | null> {
  try {
    const buffer = await fetch(url);
    
    if (!isValidImage(buffer)) {
      return null;
    }
    
    const hash = hashBuffer(buffer);
    if (existingHashes.has(hash)) {
      return null;
    }
    
    const imagePath = path.join(IMAGES_DIR, `${id}.jpg`);
    fs.writeFileSync(imagePath, buffer);
    existingHashes.add(hash);
    
    return `/artworks/${id}.jpg`;
  } catch (err) {
    return null;
  }
}

// Met Museum fetcher
async function fetchMetArtworks(
  query: string, 
  existingIds: Set<string>, 
  existingAccessions: Set<string>,
  existingHashes: Set<string>,
  maxResults: number = 15
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  try {
    await new Promise(r => setTimeout(r, 200));
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true&isPublicDomain=true`;
    const searchData = await fetchJson(searchUrl);
    
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      console.log(`  [Met] "${query}": 无结果`);
      return results;
    }
    
    console.log(`  [Met] "${query}": ${searchData.objectIDs.length} 候选`);
    
    const ids = searchData.objectIDs.slice(0, 100);
    
    for (const id of ids) {
      if (results.length >= maxResults) break;
      
      const artId = `met-${id}`;
      if (existingIds.has(artId)) continue;
      
      try {
        await new Promise(r => setTimeout(r, 120));
        
        const obj = await fetchJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        
        if (!obj.isPublicDomain || !obj.primaryImage) continue;
        if (existingAccessions.has(obj.accessionNumber)) continue;
        
        const culture = (obj.culture || '').toLowerCase();
        const title = (obj.title || '').toLowerCase();
        const origin = (obj.country || '').toLowerCase();
        const dept = (obj.department || '').toLowerCase();
        
        const isAsian = culture.includes('chin') || culture.includes('japan') || culture.includes('korea') ||
                        culture.includes('vietnam') || origin.includes('chin') || origin.includes('japan') || 
                        origin.includes('korea') || origin.includes('vietnam') || dept.includes('asian');
        if (!isAsian) continue;
        
        if (!isValidTeaware(obj.title || '', obj.objectName || '', obj.medium || '', obj.department || '')) continue;
        
        const localImageUrl = await downloadAndSaveImage(obj.primaryImage, artId, existingHashes);
        if (!localImageUrl) continue;
        
        const { dynasty, dynastyEnglish } = parseDynasty(obj.objectDate || '', obj.culture || '');
        const { material, materialEnglish } = parseMaterial(obj.medium || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.objectName || '');
        
        const artwork: Artwork = {
          id: artId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: obj.title || 'Untitled',
          dynasty,
          dynastyEnglish,
          period: obj.period || undefined,
          date: obj.objectDate || 'Unknown',
          material,
          materialEnglish: obj.medium || materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: obj.dimensions || undefined,
          description: `此件${objectType}为${dynastyEnglish}时期之作品。${obj.medium ? `材质：${obj.medium}。` : ''}现藏于大都会艺术博物馆。`,
          sourceMuseum: '大都会艺术博物馆',
          sourceMuseumEnglish: 'The Metropolitan Museum of Art',
          accessionNumber: obj.accessionNumber || '',
          sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${id}`,
          imageUrl: localImageUrl,
          imageAlt: `${obj.title || 'Artwork'} - ${obj.objectDate || 'Unknown date'}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.creditLine || undefined,
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artId);
        existingAccessions.add(obj.accessionNumber);
        
        console.log(`    ✓ ${artId}: ${obj.title?.substring(0, 50)}`);
        
      } catch (err) {
        continue;
      }
    }
    
    console.log(`  → 采纳: ${results.length}`);
    
  } catch (err) {
    console.error(`Met 查询 "${query}" 失败:`, err);
  }
  
  return results;
}

// CMA fetcher
async function fetchCmaArtworks(
  query: string, 
  existingIds: Set<string>, 
  existingAccessions: Set<string>,
  existingHashes: Set<string>,
  maxResults: number = 12
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  try {
    await new Promise(r => setTimeout(r, 150));
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=100`;
    const data = await fetchJson(url);
    
    if (!data.data || data.data.length === 0) {
      console.log(`  [CMA] "${query}": 无结果`);
      return results;
    }
    
    console.log(`  [CMA] "${query}": ${data.data.length} 候选`);
    
    for (const obj of data.data) {
      if (results.length >= maxResults) break;
      
      const artId = `cma-${obj.id}`;
      if (existingIds.has(artId)) continue;
      
      const accession = obj.accession_number || '';
      if (accession && existingAccessions.has(accession)) continue;
      
      const culture = Array.isArray(obj.culture) ? obj.culture.join(' ').toLowerCase() : (obj.culture || '').toLowerCase();
      const title = (obj.title || '').toLowerCase();
      const dept = (obj.department || '').toLowerCase();
      
      const isAsian = culture.includes('chin') || culture.includes('japan') || culture.includes('korea') ||
                      culture.includes('vietnam') || dept.includes('asian');
      if (!isAsian) continue;
      
      if (!isValidTeaware(obj.title || '', obj.type || '', obj.technique || '', obj.department || '')) continue;
      
      const imageUrl = obj.images?.web?.url;
      if (!imageUrl) continue;
      
      const localImageUrl = await downloadAndSaveImage(imageUrl, artId, existingHashes);
      if (!localImageUrl) continue;
      
      const { dynasty, dynastyEnglish } = parseDynasty(obj.creation_date || '', culture);
      const { material, materialEnglish } = parseMaterial(obj.technique || obj.type || '');
      const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.type || '');
      
      const artwork: Artwork = {
        id: artId,
        titleChinese: `${dynasty}${material}${objectType}`,
        titleEnglish: obj.title || 'Untitled',
        dynasty,
        dynastyEnglish,
        date: obj.creation_date || 'Unknown',
        material,
        materialEnglish: obj.technique || materialEnglish,
        objectType,
        objectTypeEnglish,
        dimensions: obj.measurements || undefined,
        description: `此件${objectType}为${dynastyEnglish}时期之作品。${obj.technique ? `材质：${obj.technique}。` : ''}现藏于克利夫兰艺术博物馆。`,
        sourceMuseum: '克利夫兰艺术博物馆',
        sourceMuseumEnglish: 'Cleveland Museum of Art',
        accessionNumber: accession,
        sourceUrl: `https://www.clevelandart.org/art/${accession || obj.id}`,
        imageUrl: localImageUrl,
        imageAlt: `${obj.title || 'Artwork'} - ${obj.creation_date || 'Unknown date'}`,
        license: 'CC0 / Public Domain',
        creditLine: obj.creditline || undefined,
        crawlBatchId: BATCH_ID,
      };
      
      results.push(artwork);
      existingIds.add(artId);
      if (accession) existingAccessions.add(accession);
      
      console.log(`    ✓ ${artId}: ${obj.title?.substring(0, 50)}`);
      
      await new Promise(r => setTimeout(r, 80));
    }
    
    console.log(`  → 采纳: ${results.length}`);
    
  } catch (err) {
    console.error(`CMA 查询 "${query}" 失败:`, err);
  }
  
  return results;
}

// Wikimedia fetcher
function isPublicDomainOrCC0(license: string): boolean {
  const lower = license.toLowerCase();
  return lower.includes('cc0') || 
         lower.includes('public domain') || 
         lower.includes('pd') ||
         lower.includes('cc-pd');
}

async function fetchWikimediaCategory(
  category: string,
  existingIds: Set<string>,
  existingHashes: Set<string>,
  maxResults: number = 12
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  try {
    await new Promise(r => setTimeout(r, 400));
    
    const cleanCategory = category.replace('Category:', '');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:${encodeURIComponent(cleanCategory)}&gcmtype=file&gcmlimit=100&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=2000&format=json`;
    
    const response = await fetch(url);
    const data = JSON.parse(response.toString('utf-8'));
    
    if (!data.query?.pages) {
      console.log(`  [Wiki] "${cleanCategory}": 无结果`);
      return results;
    }
    
    const files: any[] = Object.values(data.query.pages);
    
    const publicDomainFiles = files.filter(f => {
      const license = f.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || '';
      return isPublicDomainOrCC0(license);
    });
    
    console.log(`  [Wiki] "${cleanCategory}": ${files.length} 文件, ${publicDomainFiles.length} CC0/PD`);
    
    for (const file of publicDomainFiles) {
      if (results.length >= maxResults) break;
      
      const id = `wiki-${file.pageid}`;
      if (existingIds.has(id)) continue;
      
      const info = file.imageinfo?.[0];
      if (!info?.url || info.width < 500 || info.height < 400) continue;
      
      const imageUrl = info.thumburl || info.url;
      
      const localImageUrl = await downloadAndSaveImage(imageUrl, id, existingHashes);
      if (!localImageUrl) continue;
      
      const meta = info.extmetadata || {};
      const title = file.title.replace(/^File:/, '').replace(/\.[^.]+$/, '');
      const description = meta.ImageDescription?.value || '';
      const credit = meta.Credit?.value || meta.Artist?.value || '';
      const categories = meta.Categories?.value || '';
      const license = meta.LicenseShortName?.value || 'CC0 / Public Domain';
      
      const combined = `${title} ${description} ${categories}`.toLowerCase();
      
      const { dynasty, dynastyEnglish } = parseDynasty(combined, combined);
      const { material, materialEnglish } = parseMaterial(combined);
      const { objectType, objectTypeEnglish } = parseObjectType(combined, '');
      
      const artwork: Artwork = {
        id,
        titleChinese: `${dynasty}${material}${objectType}`,
        titleEnglish: title,
        dynasty,
        dynastyEnglish,
        date: meta.DateTimeOriginal?.value || 'Unknown',
        material,
        materialEnglish,
        objectType,
        objectTypeEnglish,
        dimensions: `${info.width}x${info.height}px`,
        description: `此件${objectType}来自维基共享资源。采用${material}工艺。`,
        sourceMuseum: '维基共享资源',
        sourceMuseumEnglish: 'Wikimedia Commons',
        accessionNumber: `Commons:${file.pageid}`,
        sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${file.title}`,
        imageUrl: localImageUrl,
        imageAlt: title,
        license: license.includes('CC0') || license.includes('Public') ? 'CC0 / Public Domain' : license,
        creditLine: credit || undefined,
        crawlBatchId: BATCH_ID,
      };
      
      results.push(artwork);
      existingIds.add(id);
      
      console.log(`    ✓ ${id}: ${title.substring(0, 50)}`);
    }
    
    console.log(`  → 采纳: ${results.length}`);
    
  } catch (err) {
    console.error(`Wiki 分类 "${category}" 失败:`, err);
  }
  
  return results;
}

function appendToCrawlLog(entry: object) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(CRAWL_LOG_PATH, line);
}

function computeExistingHashes(artworks: Artwork[]): Set<string> {
  const hashes = new Set<string>();
  let checked = 0;
  for (const art of artworks) {
    const imgPath = path.join(ROOT, 'public', art.imageUrl.replace(/^\//, ''));
    if (fs.existsSync(imgPath)) {
      try {
        const buffer = fs.readFileSync(imgPath);
        if (buffer.length > 1000) {
          hashes.add(hashBuffer(buffer));
          checked++;
        }
      } catch {}
    }
  }
  console.log(`已检查 ${checked} 个现有图片`);
  return hashes;
}

async function main() {
  console.log('=== 器·茶 扩展至 2000 件目标 ===\n');
  console.log(`批次ID: ${BATCH_ID}\n`);
  
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const existingIds = new Set(artworks.map(a => a.id));
  const existingAccessions = new Set(artworks.map(a => a.accessionNumber).filter(Boolean));
  
  const currentCount = artworks.length;
  const targetCount = 2000;
  const needed = targetCount - currentCount;
  
  console.log(`当前藏品数: ${currentCount}`);
  console.log(`目标藏品数: ${targetCount}`);
  console.log(`需要新增: ${needed}\n`);
  
  console.log('计算现有图片哈希以去重...');
  const existingHashes = computeExistingHashes(artworks);
  console.log(`已索引 ${existingHashes.size} 个图片哈希\n`);
  
  const newArtworks: Artwork[] = [];
  
  // Phase 1: Met Museum
  console.log('=== 第一阶段: Met Museum 新查询 ===\n');
  
  for (const query of MET_QUERIES) {
    if (newArtworks.length >= needed + 50) break;
    
    console.log(`查询: "${query}"`);
    const startTime = Date.now();
    const found = await fetchMetArtworks(query, existingIds, existingAccessions, existingHashes, 12);
    const duration = Date.now() - startTime;
    
    newArtworks.push(...found);
    
    appendToCrawlLog({
      timestamp: new Date().toISOString(),
      source: 'met',
      query,
      idsAccepted: found.length,
      crawlBatchId: BATCH_ID,
      durationMs: duration,
    });
    
    console.log(`  累计新增: ${newArtworks.length}\n`);
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Phase 2: CMA
  console.log('\n=== 第二阶段: Cleveland Museum 新查询 ===\n');
  
  for (const query of CMA_QUERIES) {
    if (newArtworks.length >= needed + 50) break;
    
    console.log(`查询: "${query}"`);
    const startTime = Date.now();
    const found = await fetchCmaArtworks(query, existingIds, existingAccessions, existingHashes, 10);
    const duration = Date.now() - startTime;
    
    newArtworks.push(...found);
    
    appendToCrawlLog({
      timestamp: new Date().toISOString(),
      source: 'cma',
      query,
      idsAccepted: found.length,
      crawlBatchId: BATCH_ID,
      durationMs: duration,
    });
    
    console.log(`  累计新增: ${newArtworks.length}\n`);
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Phase 3: Wikimedia Commons
  console.log('\n=== 第三阶段: Wikimedia Commons 博物馆藏品 ===\n');
  
  for (const category of WIKI_CATEGORIES) {
    if (newArtworks.length >= needed + 50) break;
    
    console.log(`分类: "${category}"`);
    const startTime = Date.now();
    const found = await fetchWikimediaCategory(category, existingIds, existingHashes, 10);
    const duration = Date.now() - startTime;
    
    newArtworks.push(...found);
    
    appendToCrawlLog({
      timestamp: new Date().toISOString(),
      source: 'wikimedia',
      query: category,
      idsAccepted: found.length,
      crawlBatchId: BATCH_ID,
      durationMs: duration,
    });
    
    console.log(`  累计新增: ${newArtworks.length}\n`);
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  console.log('\n=== 扩展结果 ===');
  console.log(`新增藏品: ${newArtworks.length}`);
  
  if (newArtworks.length > 0) {
    const allArtworks = [...artworks, ...newArtworks];
    const finalCount = allArtworks.length;
    
    console.log(`最终藏品数: ${finalCount}`);
    console.log(`目标达成: ${finalCount >= targetCount ? '✓ 是' : '✗ 否 (需继续挖掘)'}`);
    
    fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(allArtworks, null, 2) + '\n');
    console.log('\n✓ artworks.json 已更新');
    
    // Stats by source
    const metCount = newArtworks.filter(a => a.id.startsWith('met-')).length;
    const cmaCount = newArtworks.filter(a => a.id.startsWith('cma-')).length;
    const wikiCount = newArtworks.filter(a => a.id.startsWith('wiki-')).length;
    
    console.log('\n新增按来源:');
    console.log(`  Met Museum: ${metCount}`);
    console.log(`  Cleveland Museum: ${cmaCount}`);
    console.log(`  Wikimedia Commons: ${wikiCount}`);
    
    // By type
    const byType: Record<string, number> = {};
    newArtworks.forEach(a => {
      byType[a.objectTypeEnglish] = (byType[a.objectTypeEnglish] || 0) + 1;
    });
    
    console.log('\n新增按类型:');
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));
    
    // By dynasty
    const byDynasty: Record<string, number> = {};
    newArtworks.forEach(a => {
      byDynasty[a.dynastyEnglish] = (byDynasty[a.dynastyEnglish] || 0) + 1;
    });
    
    console.log('\n新增按朝代:');
    Object.entries(byDynasty).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => console.log(`  ${d}: ${c}`));
    
  } else {
    console.log('\n未找到新的合格藏品。');
  }
  
  console.log('\n完成。');
}

main().catch(console.error);
