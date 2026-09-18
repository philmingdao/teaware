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
const BATCH_ID = 'expansion-2026-09-17';

const MET_QUERIES = [
  'famille rose teapot',
  'blue and white teapot Chinese',
  'blue white teapot',
  'Longquan celadon bowl',
  'Dehua porcelain cup',
  'Dehua blanc de chine',
  'covered teacup Chinese',
  'gaiwan',
  'chawan Japanese',
  'kyusu Japanese',
  'Korean tea bowl',
  'tea jar Chinese',
  'tea caddy porcelain',
  'export porcelain teapot',
  'overglaze teapot',
  'underglaze blue teapot',
  'chrysanthemum teapot',
  'dragon teapot Chinese',
  'prunus teapot',
  'lotus teapot',
];

const CMA_QUERIES = [
  'teapot',
  'tea pot',
  'chawan',
  'kyusu',
  'famille rose',
  'celadon bowl',
  'Longquan',
  'Dehua',
  'export porcelain',
  'tea jar',
  'covered cup',
];

function fetch(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://github.com/philmingdao/teaware)',
        'Accept': 'application/json,image/*,*/*',
      },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (location) {
          fetch(location).then(resolve).catch(reject);
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
  if (buffer.length < 10000) return false;
  const jpegMagic = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const jpegEnd = buffer[buffer.length - 2] === 0xFF && buffer[buffer.length - 1] === 0xD9;
  return jpegMagic && jpegEnd;
}

function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseDynasty(date: string, culture: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture).toLowerCase();
  
  if (lower.includes('edo') || (lower.includes('japan') && lower.includes('17'))) {
    return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
  }
  if (lower.includes('meiji')) {
    return { dynasty: '明治', dynastyEnglish: 'Meiji Period (Japan)' };
  }
  if (lower.includes('joseon') || lower.includes('choson') || lower.includes('korea')) {
    return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)' };
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
  if (lower.includes('ming') || lower.includes('1368') || lower.includes('1644')) {
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
  
  if (lower.includes('blue and white') || lower.includes('underglaze blue')) {
    return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  }
  if (lower.includes('famille rose') || lower.includes('fencai') || lower.includes('yangcai')) {
    return { material: '粉彩', materialEnglish: 'Famille Rose' };
  }
  if (lower.includes('famille verte') || lower.includes('wucai')) {
    return { material: '五彩', materialEnglish: 'Famille Verte' };
  }
  if (lower.includes('celadon') || lower.includes('qingci') || lower.includes('longquan')) {
    return { material: '青瓷', materialEnglish: 'Celadon' };
  }
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes('hare')) {
    return { material: '建盏', materialEnglish: 'Jian Ware' };
  }
  if (lower.includes('yixing') || lower.includes('zisha') || lower.includes('purple clay')) {
    return { material: '紫砂', materialEnglish: 'Yixing Clay' };
  }
  if (lower.includes('blanc de chine') || lower.includes('dehua')) {
    return { material: '德化白瓷', materialEnglish: 'Dehua Blanc de Chine' };
  }
  if (lower.includes('white') && lower.includes('porcelain')) {
    return { material: '白瓷', materialEnglish: 'White Porcelain' };
  }
  if (lower.includes('enamel') && !lower.includes('porcelain')) {
    return { material: '珐琅', materialEnglish: 'Enamel' };
  }
  if (lower.includes('stoneware')) {
    return { material: '陶器', materialEnglish: 'Stoneware' };
  }
  if (lower.includes('porcelain')) {
    return { material: '瓷器', materialEnglish: 'Porcelain' };
  }
  if (lower.includes('lacquer')) {
    return { material: '漆器', materialEnglish: 'Lacquer' };
  }
  if (lower.includes('jade') || lower.includes('nephrite')) {
    return { material: '玉器', materialEnglish: 'Jade' };
  }
  if (lower.includes('silver')) {
    return { material: '银器', materialEnglish: 'Silver' };
  }
  if (lower.includes('bronze')) {
    return { material: '青铜', materialEnglish: 'Bronze' };
  }
  
  return { material: '瓷器', materialEnglish: 'Porcelain' };
}

function parseObjectType(title: string, objectName?: string): { objectType: string; objectTypeEnglish: string } {
  const lower = ((title || '') + ' ' + (objectName || '')).toLowerCase();
  
  if (lower.includes('teapot') || lower.includes('tea pot') || lower.includes('kyusu')) {
    return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  }
  if (lower.includes('ewer')) {
    return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  }
  if (lower.includes('caddy') || lower.includes('tea jar') || lower.includes('tea container')) {
    return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  }
  if (lower.includes('gaiwan') || lower.includes('covered cup') || lower.includes('covered bowl')) {
    return { objectType: '盖碗', objectTypeEnglish: 'Gaiwan / Covered Cup' };
  }
  if (lower.includes('set') && lower.includes('tea')) {
    return { objectType: '茶具组', objectTypeEnglish: 'Tea Set' };
  }
  if (lower.includes('chawan')) {
    return { objectType: '茶碗', objectTypeEnglish: 'Chawan (Tea Bowl)' };
  }
  
  return { objectType: '杯盏', objectTypeEnglish: 'Tea Bowl/Cup' };
}

function isTrueTeaVessel(title: string, objectName: string, medium: string, query: string): boolean {
  const lower = (title + ' ' + objectName + ' ' + medium).toLowerCase();
  
  const teaTerms = ['tea', 'teapot', 'tea pot', 'tea bowl', 'chawan', 'kyusu', 'gaiwan', 
    'covered cup', 'tea cup', 'tea caddy', 'tea jar'];
  const drinkingVessels = ['cup', 'bowl', 'saucer', 'stand'];
  
  const isTea = teaTerms.some(t => lower.includes(t));
  const isDrinking = drinkingVessels.some(t => lower.includes(t));
  
  const excludeTerms = ['snuff', 'incense', 'brush', 'vase', 'jar', 'bottle', 'plate', 'dish', 
    'figure', 'statue', 'painting', 'scroll', 'textile', 'furniture', 'basin', 'box'];
  const isExcluded = excludeTerms.some(t => lower.includes(t) && !lower.includes('tea'));
  
  if (isExcluded && !isTea) return false;
  
  if (query.toLowerCase().includes('teapot') && !lower.includes('teapot') && !lower.includes('tea pot')) {
    return false;
  }
  
  return isTea || isDrinking;
}

async function downloadAndSaveImage(url: string, id: string, existingHashes: Set<string>): Promise<string | null> {
  try {
    const buffer = await fetch(url);
    
    if (!isValidJpeg(buffer)) {
      console.log(`    [跳过] ${id}: 无效的JPEG格式`);
      return null;
    }
    
    const hash = hashBuffer(buffer);
    if (existingHashes.has(hash)) {
      console.log(`    [跳过] ${id}: 重复图片`);
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
  existingHashes: Set<string>
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  let accepted = 0;
  let rejected = 0;
  
  try {
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true&isPublicDomain=true`;
    const searchData = await fetchJson(searchUrl);
    
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      console.log(`  [Met] "${query}": 无结果`);
      return results;
    }
    
    console.log(`  [Met] "${query}": ${searchData.objectIDs.length} 候选`);
    
    const ids = searchData.objectIDs.slice(0, 150);
    
    for (const id of ids) {
      const artId = `met-${id}`;
      if (existingIds.has(artId)) {
        rejected++;
        continue;
      }
      
      try {
        await new Promise(r => setTimeout(r, 100));
        
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
        
        const isAsian = culture.includes('chin') || culture.includes('japan') || culture.includes('korea') ||
                        origin.includes('chin') || origin.includes('japan') || origin.includes('korea') ||
                        title.includes('chin') || title.includes('japan') || title.includes('korea');
        if (!isAsian) {
          rejected++;
          continue;
        }
        
        if (!isTrueTeaVessel(obj.title || '', obj.objectName || '', obj.medium || '', query)) {
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
          description: `此件${objectType}为${dynastyEnglish.replace(' Dynasty', '').replace(' Period (Japan)', '').replace(' Period (Korea)', '')}时期之作品。${obj.medium ? `材质：${obj.medium}。` : ''}${obj.dimensions ? `尺寸：${obj.dimensions}。` : ''}现藏于大都会艺术博物馆。`,
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
        
        if (results.length >= 15) break;
        
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
  existingHashes: Set<string>
): Promise<Artwork[]> {
  const results: Artwork[] = [];
  let accepted = 0;
  let rejected = 0;
  
  try {
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=100`;
    const data = await fetchJson(url);
    
    if (!data.data || data.data.length === 0) {
      console.log(`  [CMA] "${query}": 无结果`);
      return results;
    }
    
    console.log(`  [CMA] "${query}": ${data.data.length} 候选`);
    
    for (const obj of data.data) {
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
      
      const culture = (obj.culture?.[0] || '').toLowerCase();
      const title = (obj.title || '').toLowerCase();
      const dept = (obj.department || '').toLowerCase();
      
      const isAsian = culture.includes('chin') || culture.includes('japan') || culture.includes('korea') ||
                      dept.includes('asian') || title.includes('chin') || title.includes('japan');
      if (!isAsian) {
        rejected++;
        continue;
      }
      
      if (!isTrueTeaVessel(obj.title || '', obj.type || '', obj.technique || '', query)) {
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
        description: `此件${objectType}为${dynastyEnglish.replace(' Dynasty', '').replace(' Period (Japan)', '').replace(' Period (Korea)', '')}时期之作品。${obj.technique ? `材质：${obj.technique}。` : ''}${obj.measurements ? `尺寸：${obj.measurements}。` : ''}现藏于克利夫兰艺术博物馆。`,
        sourceMuseum: '克利夫兰艺术博物馆',
        sourceMuseumEnglish: 'Cleveland Museum of Art',
        accessionNumber: accession,
        sourceUrl: `https://clevelandart.org/art/${accession || obj.id}`,
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
      
      if (results.length >= 10) break;
      
      await new Promise(r => setTimeout(r, 50));
    }
    
    console.log(`  → 采纳: ${accepted}, 排除: ${rejected}`);
    
  } catch (err) {
    console.error(`CMA 查询 "${query}" 失败:`, err);
  }
  
  return results;
}

function appendToCrawlLog(entry: object) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(CRAWL_LOG_PATH, line);
}

function computeExistingHashes(artworks: Artwork[]): Set<string> {
  const hashes = new Set<string>();
  for (const art of artworks) {
    const imgPath = path.join(ROOT, 'public', art.imageUrl.replace(/^\//, ''));
    if (fs.existsSync(imgPath)) {
      try {
        const buffer = fs.readFileSync(imgPath);
        hashes.add(hashBuffer(buffer));
      } catch {}
    }
  }
  return hashes;
}

async function main() {
  console.log('=== 器·茶 藏品扩展 2026-09-17 ===\n');
  
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const existingIds = new Set(artworks.map(a => a.id));
  const existingAccessions = new Set(artworks.map(a => a.accessionNumber).filter(Boolean));
  
  console.log(`当前藏品数: ${artworks.length}`);
  console.log('计算现有图片哈希以去重...');
  const existingHashes = computeExistingHashes(artworks);
  console.log(`已索引 ${existingHashes.size} 个图片哈希\n`);
  
  const newArtworks: Artwork[] = [];
  
  console.log('=== Met Museum 新查询 ===\n');
  for (const query of MET_QUERIES) {
    console.log(`查询: "${query}"`);
    const startTime = Date.now();
    const found = await fetchMetArtworks(query, existingIds, existingAccessions, existingHashes);
    const duration = Date.now() - startTime;
    
    newArtworks.push(...found);
    
    appendToCrawlLog({
      timestamp: new Date().toISOString(),
      source: 'met',
      query,
      totalResults: found.length,
      idsAccepted: found.length,
      crawlBatchId: BATCH_ID,
      durationMs: duration,
    });
    
    console.log('');
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n=== Cleveland Museum 新查询 ===\n');
  for (const query of CMA_QUERIES) {
    console.log(`查询: "${query}"`);
    const startTime = Date.now();
    const found = await fetchCmaArtworks(query, existingIds, existingAccessions, existingHashes);
    const duration = Date.now() - startTime;
    
    newArtworks.push(...found);
    
    appendToCrawlLog({
      timestamp: new Date().toISOString(),
      source: 'cma',
      query,
      totalResults: found.length,
      idsAccepted: found.length,
      crawlBatchId: BATCH_ID,
      durationMs: duration,
    });
    
    console.log('');
    await new Promise(r => setTimeout(r, 200));
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
    Object.entries(bySource).forEach(([m, c]) => console.log(`  ${m}: ${c}`));
    
    const byType: Record<string, number> = {};
    newArtworks.forEach(a => {
      byType[a.objectTypeEnglish] = (byType[a.objectTypeEnglish] || 0) + 1;
    });
    
    console.log('\n新增按类型:');
    Object.entries(byType).forEach(([t, c]) => console.log(`  ${t}: ${c}`));
  } else {
    console.log('\n未找到新的合格藏品。');
  }
  
  console.log('\n完成。');
}

main().catch(console.error);
