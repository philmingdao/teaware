import * as fs from 'fs';
import * as path from 'path';

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

const ARTWORKS_PATH = path.join(process.cwd(), 'src', 'data', 'artworks.json');
const CRAWL_LOG_PATH = path.join(process.cwd(), 'research', 'crawl-log.jsonl');

const TARGET_COUNT = 1000;
const BATCH_ID = `expansion-${Date.now()}`;

const NEW_MET_QUERIES = [
  'porcelain bowl Chinese',
  'stoneware cup Chinese',
  'glazed bowl Chinese',
  'Tang dynasty cup',
  'Tang dynasty bowl',
  'Northern Song bowl',
  'Southern Song bowl',
  'Yuan dynasty bowl',
  'Yuan dynasty cup',
  'ceramic cup Chinese',
  'ceramic bowl Chinese',
  'lacquer cup Chinese',
  'gilt cup Chinese',
  'silver cup Chinese',
  'jade cup Chinese',
  'rhinoceros cup Chinese',
  'bronze cup Chinese',
  'cloisonne cup Chinese',
  'enamel cup Chinese',
  'saucer Chinese',
  'cup stand Chinese',
  'covered cup Chinese',
  'flared bowl Chinese',
  'conical bowl Chinese',
  'lobed bowl Chinese',
  'foliate bowl Chinese',
  'petal bowl Chinese',
];

const NEW_CMA_QUERIES = [
  'porcelain bowl',
  'stoneware bowl',
  'ceramic cup',
  'glazed bowl',
  'Tang ceramic',
  'Song ceramic',
  'Yuan ceramic', 
  'Ming ceramic',
  'Qing ceramic',
  'lacquer Chinese',
  'jade Chinese cup',
  'silver Chinese',
  'bronze Chinese cup',
  'enamel Chinese',
];

async function testImageUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

function parseDynasty(date: string, culture: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture).toLowerCase();
  
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
      lower.includes('kangxi') || lower.includes('yongzheng') || lower.includes('qianlong')) {
    return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  }
  
  return { dynasty: '其他', dynastyEnglish: 'Other Period' };
}

function parseMaterial(medium: string): { material: string; materialEnglish: string } {
  const lower = medium.toLowerCase();
  
  if (lower.includes('blue and white') || lower.includes('underglaze blue')) {
    return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  }
  if (lower.includes('famille rose') || lower.includes('fencai')) {
    return { material: '粉彩', materialEnglish: 'Famille Rose' };
  }
  if (lower.includes('celadon') || lower.includes('qingci')) {
    return { material: '青瓷', materialEnglish: 'Celadon' };
  }
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes('hare')) {
    return { material: '建盏', materialEnglish: 'Jian Ware' };
  }
  if (lower.includes('yixing') || lower.includes('zisha')) {
    return { material: '紫砂', materialEnglish: 'Yixing Clay' };
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
  
  return { material: '其他', materialEnglish: 'Other' };
}

function parseObjectType(title: string, objectName?: string): { objectType: string; objectTypeEnglish: string } {
  const lower = ((title || '') + ' ' + (objectName || '')).toLowerCase();
  
  if (lower.includes('teapot') || lower.includes('tea pot')) {
    return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  }
  if (lower.includes('ewer')) {
    return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  }
  if (lower.includes('caddy') || lower.includes('tea jar') || lower.includes('tea container')) {
    return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  }
  if (lower.includes('set') && lower.includes('tea')) {
    return { objectType: '茶具组', objectTypeEnglish: 'Tea Set' };
  }
  if (lower.includes('cup') || lower.includes('bowl') || lower.includes('saucer') || lower.includes('stand')) {
    return { objectType: '杯盏', objectTypeEnglish: 'Tea Bowl/Cup' };
  }
  
  return { objectType: '杯盏', objectTypeEnglish: 'Tea Bowl/Cup' };
}

async function fetchMetArtworks(query: string, existingIds: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  try {
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      return results;
    }
    
    const ids = searchData.objectIDs.slice(0, 100);
    
    for (const id of ids) {
      const artId = `met-${id}`;
      if (existingIds.has(artId)) continue;
      
      try {
        const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        const obj = await objRes.json();
        
        if (!obj.isPublicDomain || !obj.primaryImage) continue;
        
        const culture = (obj.culture || '').toLowerCase();
        const title = (obj.title || '').toLowerCase();
        
        if (!culture.includes('chin') && !title.includes('chin') && 
            !culture.includes('asia') && !title.includes('asia')) continue;
        
        const isTea = title.includes('tea') || title.includes('cup') || title.includes('bowl') ||
                      title.includes('ewer') || title.includes('pot') || title.includes('saucer') ||
                      title.includes('caddy') || title.includes('stand');
        if (!isTea) continue;
        
        const imageWorks = await testImageUrl(obj.primaryImage);
        if (!imageWorks) continue;
        
        const { dynasty, dynastyEnglish } = parseDynasty(obj.objectDate || '', obj.culture || '');
        const { material, materialEnglish } = parseMaterial(obj.medium || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.objectName || '');
        
        const artwork: Artwork = {
          id: artId,
          titleChinese: `${dynasty}${material}${objectType === '杯盏' ? '茶盏' : objectType}`,
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
          description: `此件${objectType}为${dynastyEnglish.replace(' Dynasty', '')}时期之作品。${obj.dimensions ? `尺寸：${obj.dimensions}。` : ''}现藏于大都会艺术博物馆。`,
          sourceMuseum: '大都会艺术博物馆',
          sourceMuseumEnglish: 'The Metropolitan Museum of Art',
          accessionNumber: obj.accessionNumber || '',
          sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${id}`,
          imageUrl: obj.primaryImage,
          imageAlt: `${obj.title || 'Artwork'} - ${obj.objectDate || 'Unknown date'}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.creditLine || undefined,
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artId);
        
        if (results.length >= 50) break;
        
        await new Promise(r => setTimeout(r, 100));
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error(`Met query "${query}" failed:`, err);
  }
  
  return results;
}

async function fetchCmaArtworks(query: string, existingIds: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  try {
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=100`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.data || data.data.length === 0) {
      return results;
    }
    
    for (const obj of data.data) {
      const artId = `cma-${obj.id}`;
      if (existingIds.has(artId)) continue;
      
      const culture = (obj.culture?.[0] || '').toLowerCase();
      const title = (obj.title || '').toLowerCase();
      const dept = (obj.department || '').toLowerCase();
      
      const isChina = culture.includes('chin') || title.includes('chin') || 
                      dept.includes('asian') || dept.includes('chinese');
      if (!isChina) continue;
      
      const isTea = title.includes('tea') || title.includes('cup') || title.includes('bowl') ||
                    title.includes('ewer') || title.includes('pot') || title.includes('saucer') ||
                    title.includes('caddy') || title.includes('stand');
      if (!isTea) continue;
      
      const imageUrl = obj.images?.web?.url;
      if (!imageUrl) continue;
      
      const imageWorks = await testImageUrl(imageUrl);
      if (!imageWorks) continue;
      
      const { dynasty, dynastyEnglish } = parseDynasty(obj.creation_date || '', culture);
      const { material, materialEnglish } = parseMaterial(obj.technique || obj.type || '');
      const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.type || '');
      
      const artwork: Artwork = {
        id: artId,
        titleChinese: `${dynasty}${material}${objectType === '杯盏' ? '茶盏' : objectType}`,
        titleEnglish: obj.title || 'Untitled',
        dynasty,
        dynastyEnglish,
        date: obj.creation_date || 'Unknown',
        material,
        materialEnglish: obj.technique || materialEnglish,
        objectType,
        objectTypeEnglish,
        dimensions: obj.measurements || undefined,
        description: `此件${objectType}为${dynastyEnglish.replace(' Dynasty', '')}时期之作品。${obj.measurements ? `尺寸：${obj.measurements}。` : ''}现藏于克利夫兰艺术博物馆。`,
        sourceMuseum: '克利夫兰艺术博物馆',
        sourceMuseumEnglish: 'Cleveland Museum of Art',
        accessionNumber: obj.accession_number || '',
        sourceUrl: `https://clevelandart.org/art/${obj.accession_number || obj.id}`,
        imageUrl,
        imageAlt: `${obj.title || 'Artwork'} - ${obj.creation_date || 'Unknown date'}`,
        license: 'CC0 / Public Domain',
        creditLine: obj.creditline || undefined,
        crawlBatchId: BATCH_ID,
      };
      
      results.push(artwork);
      existingIds.add(artId);
      
      if (results.length >= 30) break;
      
      await new Promise(r => setTimeout(r, 50));
    }
  } catch (err) {
    console.error(`CMA query "${query}" failed:`, err);
  }
  
  return results;
}

function appendToCrawlLog(entry: object) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(CRAWL_LOG_PATH, line);
}

async function main() {
  console.log('=== 藏品扩展脚本 v2 ===\n');
  
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const existingIds = new Set(artworks.map(a => a.id));
  
  console.log(`当前藏品数: ${artworks.length}`);
  console.log(`目标藏品数: ${TARGET_COUNT}`);
  console.log(`需要新增: ${Math.max(0, TARGET_COUNT - artworks.length)}\n`);
  
  const newArtworks: Artwork[] = [];
  
  console.log('--- Met Museum 扩展 ---');
  for (const query of NEW_MET_QUERIES) {
    if (artworks.length + newArtworks.length >= TARGET_COUNT) break;
    
    console.log(`查询: "${query}"...`);
    const startTime = Date.now();
    const found = await fetchMetArtworks(query, existingIds);
    const duration = Date.now() - startTime;
    
    console.log(`  找到: ${found.length} 件`);
    newArtworks.push(...found);
    
    appendToCrawlLog({
      timestamp: new Date().toISOString(),
      source: 'met',
      query,
      idsAccepted: found.length,
      crawlBatchId: BATCH_ID,
      durationMs: duration,
    });
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n--- Cleveland Museum 扩展 ---');
  for (const query of NEW_CMA_QUERIES) {
    if (artworks.length + newArtworks.length >= TARGET_COUNT) break;
    
    console.log(`查询: "${query}"...`);
    const startTime = Date.now();
    const found = await fetchCmaArtworks(query, existingIds);
    const duration = Date.now() - startTime;
    
    console.log(`  找到: ${found.length} 件`);
    newArtworks.push(...found);
    
    appendToCrawlLog({
      timestamp: new Date().toISOString(),
      source: 'cma',
      query,
      idsAccepted: found.length,
      crawlBatchId: BATCH_ID,
      durationMs: duration,
    });
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n=== 扩展结果 ===');
  console.log(`新增藏品: ${newArtworks.length}`);
  
  const allArtworks = [...artworks, ...newArtworks];
  console.log(`总藏品数: ${allArtworks.length}`);
  
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(allArtworks, null, 2));
  console.log('\n✓ artworks.json 已更新');
  
  const byMuseum: Record<string, number> = {};
  allArtworks.forEach(a => {
    byMuseum[a.sourceMuseum] = (byMuseum[a.sourceMuseum] || 0) + 1;
  });
  
  console.log('\n按博物馆统计:');
  Object.entries(byMuseum).forEach(([m, c]) => console.log(`  ${m}: ${c}`));
}

main().catch(console.error);
