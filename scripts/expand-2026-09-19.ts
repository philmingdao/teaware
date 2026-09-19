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
const BATCH_ID = `expansion-${Date.now()}`;

const MET_TEAPOT_QUERIES = [
  'porcelain teapot China',
  'earthenware teapot China',
  'stoneware teapot China',
  'melon teapot',
  'peach teapot',
  'bamboo teapot',
  'squash teapot',
  'pumpkin teapot',
  'enameled teapot China',
  'armorial teapot China',
  'imari teapot',
  'kraak teapot',
];

const MET_TEA_CADDY_QUERIES = [
  'tea canister China',
  'tea container China',
  'tea storage China',
  'ginger jar tea',
  'covered jar tea China',
  'tea box porcelain',
];

const MET_GAIWAN_QUERIES = [
  'covered cup China',
  'lidded bowl China',
  'covered tea bowl',
  'cup with cover China',
  'cup and saucer China',
];

const MET_EWER_QUERIES = [
  'ewer porcelain China',
  'wine ewer China',
  'pouring vessel China',
  'kettle porcelain China',
  'chocolate pot China',
];

const MET_BOWL_QUERIES = [
  'conical tea bowl',
  'fluted tea bowl',
  'raku bowl',
  'Seto tea bowl',
  'Shino tea bowl',
  'Shigaraki tea bowl',
  'Bizen tea bowl',
  'Hagi tea bowl',
  'Oribe tea bowl',
  'Korean punch bowl',
  'Vietnamese tea bowl',
];

const CMA_TEAPOT_QUERIES = [
  'Yixing teapot',
  'purple clay teapot',
  'zisha teapot',
  'enamel teapot',
  'stoneware teapot',
  'pewter teapot',
];

const CMA_TEA_CADDY_QUERIES = [
  'tea canister',
  'tea container',
  'natsume',
  'chaire tea',
];

const CMA_MISC_QUERIES = [
  'water dropper Chinese',
  'tea scoop',
  'tea whisk',
  'ewer Asian',
  'wine pot Chinese',
];

const WIKIMEDIA_CATEGORIES = [
  'Category:Chinese_teapots',
  'Category:Yixing_clay_teapots',
  'Category:Teapots_in_the_Metropolitan_Museum_of_Art',
  'Category:Teapots_in_the_Victoria_and_Albert_Museum',
  'Category:Teapots_in_the_British_Museum',
  'Category:Tea_caddies',
  'Category:Gaiwan',
  'Category:Chinese_porcelain_teapots',
  'Category:Dehua_porcelain',
  'Category:Chinese_ceramics_in_the_Asian_Art_Museum',
  'Category:Song_dynasty_ceramics',
  'Category:Temmoku_ware',
];

function fetch(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://github.com/philmingdao/teaware)',
        'Accept': 'application/json,image/*,*/*',
      },
      timeout: 60000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (location) {
          fetch(location, retries).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode === 429 || res.statusCode === 503) {
        if (retries > 0) {
          setTimeout(() => fetch(url, retries - 1).then(resolve).catch(reject), 3000);
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

function isValidJpeg(buffer: Buffer): boolean {
  if (buffer.length < 5000) return false;
  const jpegMagic = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  return jpegMagic;
}

function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseDynasty(date: string, culture: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture).toLowerCase();
  
  if (lower.includes('edo') || (lower.includes('japan') && (lower.includes('17') || lower.includes('18')))) {
    return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
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
  if (lower.includes('vietnam') || lower.includes('annamese')) {
    return { dynasty: '越南', dynastyEnglish: 'Vietnam' };
  }
  if (lower.includes('tang') || lower.includes('618') || lower.includes('907')) {
    return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty' };
  }
  if (lower.includes('song') || lower.includes('960') || lower.includes('1279')) {
    if (lower.includes('northern')) return { dynasty: '北宋', dynastyEnglish: 'Northern Song Dynasty' };
    if (lower.includes('southern')) return { dynasty: '南宋', dynastyEnglish: 'Southern Song Dynasty' };
    return { dynasty: '宋', dynastyEnglish: 'Song Dynasty' };
  }
  if (lower.includes('yuan') || lower.includes('1271') || lower.includes('1368')) {
    return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty' };
  }
  if (lower.includes('ming') || (lower.includes('1368') && lower.includes('1644'))) {
    return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  }
  if (lower.includes('qing') || lower.includes('1644') || lower.includes('1912') ||
      lower.includes('kangxi') || lower.includes('yongzheng') || lower.includes('qianlong') ||
      lower.includes('jiaqing') || lower.includes('daoguang') || lower.includes('guangxu') ||
      lower.includes('tongzhi') || lower.includes('xianfeng')) {
    return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  }
  if (lower.includes('republic') || lower.includes('民国')) {
    return { dynasty: '民国', dynastyEnglish: 'Republic of China' };
  }
  
  return { dynasty: '其他', dynastyEnglish: 'Other Period' };
}

function parseMaterial(medium: string): { material: string; materialEnglish: string } {
  const lower = medium.toLowerCase();
  
  if (lower.includes('yixing') || lower.includes('zisha') || lower.includes('purple clay') || lower.includes('boccaro')) {
    return { material: '紫砂', materialEnglish: 'Yixing Clay' };
  }
  if (lower.includes('blue and white') || lower.includes('underglaze blue') || lower.includes('青花')) {
    return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  }
  if (lower.includes('famille rose') || lower.includes('fencai') || lower.includes('yangcai') || lower.includes('粉彩')) {
    return { material: '粉彩', materialEnglish: 'Famille Rose' };
  }
  if (lower.includes('famille verte') || lower.includes('wucai') || lower.includes('五彩')) {
    return { material: '五彩', materialEnglish: 'Famille Verte' };
  }
  if (lower.includes('celadon') || lower.includes('qingci') || lower.includes('longquan') || lower.includes('青瓷')) {
    return { material: '青瓷', materialEnglish: 'Celadon' };
  }
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes('hare') || lower.includes('oil spot') || lower.includes('建盏')) {
    return { material: '建盏', materialEnglish: 'Jian Ware' };
  }
  if (lower.includes('blanc de chine') || lower.includes('dehua') || lower.includes('德化')) {
    return { material: '德化白瓷', materialEnglish: 'Dehua Blanc de Chine' };
  }
  if (lower.includes('imari') || lower.includes('伊万里')) {
    return { material: '伊万里', materialEnglish: 'Imari' };
  }
  if (lower.includes('raku') || lower.includes('楽焼')) {
    return { material: '楽焼', materialEnglish: 'Raku Ware' };
  }
  if (lower.includes('seto') || lower.includes('瀬戸')) {
    return { material: '瀬戸焼', materialEnglish: 'Seto Ware' };
  }
  if (lower.includes('hagi') || lower.includes('萩')) {
    return { material: '萩焼', materialEnglish: 'Hagi Ware' };
  }
  if (lower.includes('bizen') || lower.includes('備前')) {
    return { material: '備前焼', materialEnglish: 'Bizen Ware' };
  }
  if (lower.includes('oribe') || lower.includes('織部')) {
    return { material: '織部焼', materialEnglish: 'Oribe Ware' };
  }
  if (lower.includes('shigaraki') || lower.includes('信楽')) {
    return { material: '信楽焼', materialEnglish: 'Shigaraki Ware' };
  }
  if (lower.includes('enamel') && !lower.includes('porcelain')) {
    return { material: '珐琅', materialEnglish: 'Enamel' };
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
  if (lower.includes('lacquer')) {
    return { material: '漆器', materialEnglish: 'Lacquer' };
  }
  if (lower.includes('pewter') || lower.includes('tin')) {
    return { material: '锡器', materialEnglish: 'Pewter' };
  }
  if (lower.includes('silver')) {
    return { material: '银器', materialEnglish: 'Silver' };
  }
  if (lower.includes('bronze') || lower.includes('copper')) {
    return { material: '铜器', materialEnglish: 'Bronze/Copper' };
  }
  
  return { material: '瓷器', materialEnglish: 'Porcelain' };
}

function parseObjectType(title: string, objectName?: string): { objectType: string; objectTypeEnglish: string } {
  const lower = ((title || '') + ' ' + (objectName || '')).toLowerCase();
  
  if (lower.includes('teapot') || lower.includes('tea pot')) {
    return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  }
  if (lower.includes('kettle')) {
    return { objectType: '水壶', objectTypeEnglish: 'Kettle' };
  }
  if (lower.includes('ewer') || lower.includes('wine pot')) {
    return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  }
  if (lower.includes('caddy') || lower.includes('tea jar') || lower.includes('tea container') || lower.includes('canister') ||
      lower.includes('chaire') || lower.includes('natsume') || lower.includes('tea storage')) {
    return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  }
  if (lower.includes('gaiwan') || lower.includes('covered cup') || lower.includes('covered bowl') ||
      lower.includes('lidded cup') || lower.includes('cup with cover') || lower.includes('lidded bowl')) {
    return { objectType: '盖碗', objectTypeEnglish: 'Gaiwan / Covered Cup' };
  }
  if (lower.includes('set') && lower.includes('tea')) {
    return { objectType: '茶具组', objectTypeEnglish: 'Tea Set' };
  }
  if (lower.includes('chawan')) {
    return { objectType: '茶碗', objectTypeEnglish: 'Chawan (Tea Bowl)' };
  }
  if (lower.includes('kyusu')) {
    return { objectType: '急须', objectTypeEnglish: 'Kyusu (Side-handle Pot)' };
  }
  if (lower.includes('cup and saucer') || lower.includes('cup with saucer')) {
    return { objectType: '杯碟', objectTypeEnglish: 'Cup and Saucer' };
  }
  if (lower.includes('water dropper') || lower.includes('water pot')) {
    return { objectType: '水注', objectTypeEnglish: 'Water Dropper' };
  }
  if (lower.includes('scoop')) {
    return { objectType: '茶则', objectTypeEnglish: 'Tea Scoop' };
  }
  
  return { objectType: '杯盏', objectTypeEnglish: 'Tea Bowl/Cup' };
}

function isValidTeaware(title: string, objectName: string, medium: string, department: string): boolean {
  const lower = (title + ' ' + objectName + ' ' + medium + ' ' + department).toLowerCase();
  
  const teaTerms = ['tea', 'teapot', 'tea pot', 'tea bowl', 'chawan', 'kyusu', 'gaiwan', 
    'covered cup', 'tea cup', 'tea caddy', 'tea jar', 'chaire', 'natsume', 'tenmoku',
    'ewer', 'wine cup', 'wine pot', 'sake cup', 'wine vessel', 'bowl', 'cup',
    'covered bowl', 'lidded cup', 'water dropper', 'kettle'];
  
  const excludeTerms = ['snuff', 'incense', 'incense burner', 'censer', 'brush', 'brush pot',
    'vase', 'bottle', 'plate', 'dish', 'figure', 'statue', 'sculpture', 'painting', 
    'scroll', 'textile', 'furniture', 'basin', 'pillow', 'tile', 'roof', 'architectural',
    'sword', 'armor', 'weapon', 'mask', 'netsuke', 'inro', 'pendant', 'ornament',
    'musical', 'mirror', 'box', 'screen', 'panel'];
  
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
    
    if (!isValidJpeg(buffer)) {
      console.log(`    [跳过] ${id}: 无效的JPEG格式或太小`);
      return null;
    }
    
    const hash = hashBuffer(buffer);
    if (existingHashes.has(hash)) {
      console.log(`    [跳过] ${id}: 重复图片 (SHA256匹配)`);
      return null;
    }
    
    const imagePath = path.join(IMAGES_DIR, `${id}.jpg`);
    fs.writeFileSync(imagePath, buffer);
    existingHashes.add(hash);
    
    return `/artworks/${id}.jpg`;
  } catch (err) {
    console.log(`    [跳过] ${id}: 图片下载失败 - ${err}`);
    return null;
  }
}

async function fetchMetArtworks(
  query: string, 
  existingIds: Set<string>, 
  existingAccessions: Set<string>,
  existingHashes: Set<string>,
  maxResults: number = 20
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  let accepted = 0;
  let rejected = 0;
  
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
      if (existingIds.has(artId)) {
        rejected++;
        continue;
      }
      
      try {
        await new Promise(r => setTimeout(r, 150));
        
        const obj = await fetchJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        
        if (!obj.isPublicDomain || !obj.primaryImage) {
          rejected++;
          continue;
        }
        
        if (existingAccessions.has(obj.accessionNumber)) {
          rejected++;
          continue;
        }
        
        const culture = (obj.culture || '').toLowerCase();
        const title = (obj.title || '').toLowerCase();
        const origin = (obj.country || '').toLowerCase();
        const dept = (obj.department || '').toLowerCase();
        
        const isAsian = culture.includes('chin') || culture.includes('japan') || culture.includes('korea') ||
                        culture.includes('vietnam') || origin.includes('chin') || origin.includes('japan') || 
                        origin.includes('korea') || origin.includes('vietnam') ||
                        dept.includes('asian');
        if (!isAsian) {
          rejected++;
          continue;
        }
        
        if (!isValidTeaware(obj.title || '', obj.objectName || '', obj.medium || '', obj.department || '')) {
          rejected++;
          continue;
        }
        
        const localImageUrl = await downloadAndSaveImage(obj.primaryImage, artId, existingHashes);
        if (!localImageUrl) {
          rejected++;
          continue;
        }
        
        const { dynasty, dynastyEnglish } = parseDynasty(obj.objectDate || '', obj.culture || '');
        const { material, materialEnglish } = parseMaterial(obj.medium || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.objectName || '');
        
        const titleZh = `${dynasty}${material}${objectType}`;
        
        const artwork: Artwork = {
          id: artId,
          titleChinese: titleZh,
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
          description: `此件${objectType}为${dynastyEnglish}时期之作品。${obj.medium ? `材质：${obj.medium}。` : ''}${obj.dimensions ? `尺寸：${obj.dimensions}。` : ''}现藏于大都会艺术博物馆。`,
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
        accepted++;
        
        console.log(`    ✓ ${artId}: ${obj.title?.substring(0, 50)}`);
        
      } catch (err) {
        rejected++;
        continue;
      }
    }
    
    console.log(`  → 采纳: ${accepted}, 排除: ${rejected}`);
    
  } catch (err) {
    console.error(`Met 查询 "${query}" 失败:`, err);
  }
  
  return results;
}

async function fetchCmaArtworks(
  query: string, 
  existingIds: Set<string>, 
  existingAccessions: Set<string>,
  existingHashes: Set<string>,
  maxResults: number = 15
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  let accepted = 0;
  let rejected = 0;
  
  try {
    await new Promise(r => setTimeout(r, 100));
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
      if (existingIds.has(artId)) {
        rejected++;
        continue;
      }
      
      const accession = obj.accession_number || '';
      if (accession && existingAccessions.has(accession)) {
        rejected++;
        continue;
      }
      
      const culture = Array.isArray(obj.culture) ? obj.culture.join(' ').toLowerCase() : (obj.culture || '').toLowerCase();
      const title = (obj.title || '').toLowerCase();
      const dept = (obj.department || '').toLowerCase();
      const type = (obj.type || '').toLowerCase();
      
      const isAsian = culture.includes('chin') || culture.includes('japan') || culture.includes('korea') ||
                      culture.includes('vietnam') || dept.includes('asian') || 
                      title.includes('chin') || title.includes('japan');
      if (!isAsian) {
        rejected++;
        continue;
      }
      
      if (!isValidTeaware(obj.title || '', obj.type || '', obj.technique || '', obj.department || '')) {
        rejected++;
        continue;
      }
      
      const imageUrl = obj.images?.web?.url;
      if (!imageUrl) {
        rejected++;
        continue;
      }
      
      const localImageUrl = await downloadAndSaveImage(imageUrl, artId, existingHashes);
      if (!localImageUrl) {
        rejected++;
        continue;
      }
      
      const { dynasty, dynastyEnglish } = parseDynasty(obj.creation_date || '', culture);
      const { material, materialEnglish } = parseMaterial(obj.technique || obj.type || '');
      const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.type || '');
      
      const titleZh = `${dynasty}${material}${objectType}`;
      
      const artwork: Artwork = {
        id: artId,
        titleChinese: titleZh,
        titleEnglish: obj.title || 'Untitled',
        dynasty,
        dynastyEnglish,
        date: obj.creation_date || 'Unknown',
        material,
        materialEnglish: obj.technique || materialEnglish,
        objectType,
        objectTypeEnglish,
        dimensions: obj.measurements || undefined,
        description: `此件${objectType}为${dynastyEnglish}时期之作品。${obj.technique ? `材质：${obj.technique}。` : ''}${obj.measurements ? `尺寸：${obj.measurements}。` : ''}现藏于克利夫兰艺术博物馆。`,
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
      accepted++;
      
      console.log(`    ✓ ${artId}: ${obj.title?.substring(0, 50)}`);
      
      await new Promise(r => setTimeout(r, 50));
    }
    
    console.log(`  → 采纳: ${accepted}, 排除: ${rejected}`);
    
  } catch (err) {
    console.error(`CMA 查询 "${query}" 失败:`, err);
  }
  
  return results;
}

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
      ObjectName?: { value: string };
    };
  }>;
}

async function fetchWikimediaCategory(
  category: string,
  existingIds: Set<string>,
  existingHashes: Set<string>,
  maxResults: number = 10
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  try {
    await new Promise(r => setTimeout(r, 300));
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(category)}&gcmtype=file&gcmlimit=50&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=2000&format=json`;
    
    const response = await fetch(url);
    const data = JSON.parse(response.toString('utf-8'));
    
    if (!data.query?.pages) {
      console.log(`  [Wiki] "${category}": 无结果`);
      return results;
    }
    
    const files: WikimediaFile[] = Object.values(data.query.pages);
    const publicDomainFiles = files.filter(f => {
      const license = f.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value?.toLowerCase() || '';
      return license.includes('cc0') || license.includes('public domain') || license.includes('pd');
    });
    
    console.log(`  [Wiki] "${category}": ${files.length} 文件, ${publicDomainFiles.length} 公共领域`);
    
    for (const file of publicDomainFiles) {
      if (results.length >= maxResults) break;
      
      const id = `wiki-${file.pageid}`;
      if (existingIds.has(id)) continue;
      
      const info = file.imageinfo?.[0];
      if (!info?.url || info.width < 800 || info.height < 600) continue;
      
      const localImageUrl = await downloadAndSaveImage(info.url, id, existingHashes);
      if (!localImageUrl) continue;
      
      const meta = info.extmetadata || {};
      const title = file.title.replace(/^File:/, '').replace(/\.[^.]+$/, '');
      const description = meta.ImageDescription?.value || '';
      const credit = meta.Credit?.value || meta.Artist?.value || '';
      
      const combined = `${title} ${description}`.toLowerCase();
      let dynasty = '未知';
      let dynastyEn = 'Unknown';
      let material = '瓷器';
      let materialEn = 'Porcelain';
      let objectType = '杯盏';
      let objectTypeEn = 'Tea Bowl/Cup';
      
      if (combined.includes('yixing') || combined.includes('zisha') || combined.includes('purple clay')) {
        material = '紫砂'; materialEn = 'Yixing Clay';
      } else if (combined.includes('jian') || combined.includes('tenmoku') || combined.includes('hare')) {
        material = '建盏'; materialEn = 'Jian Ware';
      } else if (combined.includes('celadon') || combined.includes('longquan')) {
        material = '青瓷'; materialEn = 'Celadon';
      } else if (combined.includes('blue and white') || combined.includes('blue-and-white')) {
        material = '青花瓷'; materialEn = 'Blue and White';
      } else if (combined.includes('dehua') || combined.includes('blanc de chine')) {
        material = '德化白瓷'; materialEn = 'Dehua Blanc de Chine';
      }
      
      if (combined.includes('teapot') || combined.includes('tea pot')) {
        objectType = '茶壶'; objectTypeEn = 'Teapot';
      } else if (combined.includes('gaiwan') || combined.includes('covered')) {
        objectType = '盖碗'; objectTypeEn = 'Gaiwan';
      } else if (combined.includes('caddy') || combined.includes('chaire') || combined.includes('natsume')) {
        objectType = '茶罐'; objectTypeEn = 'Tea Caddy';
      } else if (combined.includes('ewer')) {
        objectType = '执壶'; objectTypeEn = 'Ewer';
      }
      
      if (combined.includes('song')) { dynasty = '宋'; dynastyEn = 'Song Dynasty'; }
      else if (combined.includes('ming')) { dynasty = '明'; dynastyEn = 'Ming Dynasty'; }
      else if (combined.includes('qing')) { dynasty = '清'; dynastyEn = 'Qing Dynasty'; }
      else if (combined.includes('tang')) { dynasty = '唐'; dynastyEn = 'Tang Dynasty'; }
      else if (combined.includes('yuan')) { dynasty = '元'; dynastyEn = 'Yuan Dynasty'; }
      
      const artwork: Artwork = {
        id,
        titleChinese: `${dynasty}${material}${objectType}`,
        titleEnglish: title,
        dynasty,
        dynastyEnglish: dynastyEn,
        date: meta.DateTimeOriginal?.value || 'Unknown',
        material,
        materialEnglish: materialEn,
        objectType,
        objectTypeEnglish: objectTypeEn,
        dimensions: `${info.width}x${info.height}px`,
        description: `此件${objectType}藏品图片来自维基共享资源。采用${material}工艺。`,
        sourceMuseum: '维基共享资源',
        sourceMuseumEnglish: 'Wikimedia Commons',
        accessionNumber: `Commons:${file.pageid}`,
        sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${file.title}`,
        imageUrl: localImageUrl,
        imageAlt: title,
        license: 'CC0 / Public Domain',
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
  return hashes;
}

async function main() {
  console.log('=== 器·茶 藏品扩展 2026-09-19 ===\n');
  console.log(`批次ID: ${BATCH_ID}\n`);
  
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const existingIds = new Set(artworks.map(a => a.id));
  const existingAccessions = new Set(artworks.map(a => a.accessionNumber).filter(Boolean));
  
  console.log(`当前藏品数: ${artworks.length}`);
  console.log('计算现有图片哈希以去重...');
  const existingHashes = computeExistingHashes(artworks);
  console.log(`已索引 ${existingHashes.size} 个图片哈希\n`);
  
  const newArtworks: Artwork[] = [];
  
  console.log('=== 第一阶段: Met Museum 茶壶查询 ===\n');
  for (const query of MET_TEAPOT_QUERIES) {
    console.log(`查询: "${query}"`);
    const startTime = Date.now();
    const found = await fetchMetArtworks(query, existingIds, existingAccessions, existingHashes, 15);
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
    
    console.log('');
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n=== 第二阶段: Met Museum 茶叶罐查询 ===\n');
  for (const query of MET_TEA_CADDY_QUERIES) {
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
    
    console.log('');
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n=== 第三阶段: Met Museum 盖碗/执壶查询 ===\n');
  const gaiwanEwerQueries = [...MET_GAIWAN_QUERIES, ...MET_EWER_QUERIES];
  for (const query of gaiwanEwerQueries) {
    console.log(`查询: "${query}"`);
    const startTime = Date.now();
    const found = await fetchMetArtworks(query, existingIds, existingAccessions, existingHashes, 10);
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
    
    console.log('');
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n=== 第四阶段: Met Museum 茶碗补充 ===\n');
  for (const query of MET_BOWL_QUERIES) {
    console.log(`查询: "${query}"`);
    const startTime = Date.now();
    const found = await fetchMetArtworks(query, existingIds, existingAccessions, existingHashes, 8);
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
    
    console.log('');
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n=== 第五阶段: Cleveland Museum 茶壶/茶罐查询 ===\n');
  const cmaQueries = [...CMA_TEAPOT_QUERIES, ...CMA_TEA_CADDY_QUERIES, ...CMA_MISC_QUERIES];
  for (const query of cmaQueries) {
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
    
    console.log('');
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n=== 第六阶段: Wikimedia Commons 分类 ===\n');
  for (const category of WIKIMEDIA_CATEGORIES) {
    console.log(`分类: "${category}"`);
    const startTime = Date.now();
    const found = await fetchWikimediaCategory(category, existingIds, existingHashes, 8);
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
    
    console.log('');
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n=== 扩展结果 ===');
  console.log(`新增藏品: ${newArtworks.length}`);
  
  if (newArtworks.length > 0) {
    const allArtworks = [...artworks, ...newArtworks];
    console.log(`总藏品数: ${allArtworks.length}`);
    
    fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(allArtworks, null, 2) + '\n');
    console.log('\n✓ artworks.json 已更新');
    
    const bySource: Record<string, number> = {};
    newArtworks.forEach(a => {
      bySource[a.sourceMuseumEnglish] = (bySource[a.sourceMuseumEnglish] || 0) + 1;
    });
    
    console.log('\n新增按来源:');
    Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([m, c]) => console.log(`  ${m}: ${c}`));
    
    const byType: Record<string, number> = {};
    newArtworks.forEach(a => {
      byType[a.objectTypeEnglish] = (byType[a.objectTypeEnglish] || 0) + 1;
    });
    
    console.log('\n新增按类型:');
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));
    
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
