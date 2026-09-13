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
const BATCH_ID = `expansion-round2-${Date.now()}`;

const MORE_MET_QUERIES = [
  'drinking vessel Chinese',
  'libation cup jade',
  'wine vessel Chinese',
  'ritual vessel Chinese',
  'chrysanthemum bowl Chinese',
  'lotus bowl Chinese',
  'dragon bowl Chinese',
  'peony bowl Chinese',
  'phoenix bowl Chinese',
  'bird bowl Chinese',
  'fish bowl Chinese',
  'landscape bowl Chinese',
  'scholar cup Chinese',
  'imperial cup Chinese',
  'palace bowl Chinese',
  'stem bowl Chinese',
  'footed bowl Chinese',
  'incised bowl Chinese',
  'carved bowl Chinese',
  'painted bowl Chinese',
  'overglaze bowl Chinese',
  'underglaze bowl Chinese',
  'moulded bowl Chinese',
  'floral bowl Chinese',
];

const MORE_CMA_QUERIES = [
  'wine vessel',
  'ritual vessel Chinese',
  'drinking vessel',
  'footed bowl',
  'stem bowl',
  'carved bowl',
  'incised bowl',
  'lotus bowl',
  'dragon bowl',
  'floral bowl',
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
  if (lower.includes('tang')) return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty' };
  if (lower.includes('northern song')) return { dynasty: '北宋', dynastyEnglish: 'Northern Song Dynasty' };
  if (lower.includes('southern song')) return { dynasty: '南宋', dynastyEnglish: 'Southern Song Dynasty' };
  if (lower.includes('song')) return { dynasty: '宋', dynastyEnglish: 'Song Dynasty' };
  if (lower.includes('yuan')) return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty' };
  if (lower.includes('ming')) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  if (lower.includes('qing') || lower.includes('kangxi') || lower.includes('yongzheng') || lower.includes('qianlong')) {
    return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  }
  return { dynasty: '其他', dynastyEnglish: 'Other Period' };
}

function parseMaterial(medium: string): { material: string; materialEnglish: string } {
  const lower = medium.toLowerCase();
  if (lower.includes('blue and white')) return { material: '青花瓷', materialEnglish: 'Blue and White' };
  if (lower.includes('famille rose')) return { material: '粉彩', materialEnglish: 'Famille Rose' };
  if (lower.includes('celadon')) return { material: '青瓷', materialEnglish: 'Celadon' };
  if (lower.includes('jade')) return { material: '玉器', materialEnglish: 'Jade' };
  if (lower.includes('lacquer')) return { material: '漆器', materialEnglish: 'Lacquer' };
  if (lower.includes('enamel')) return { material: '珐琅', materialEnglish: 'Enamel' };
  if (lower.includes('bronze')) return { material: '青铜', materialEnglish: 'Bronze' };
  if (lower.includes('silver')) return { material: '银器', materialEnglish: 'Silver' };
  if (lower.includes('stoneware')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('porcelain')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  return { material: '其他', materialEnglish: 'Other' };
}

async function fetchMetArtworks(query: string, existingIds: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  try {
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return results;
    const searchData = await searchRes.json();
    if (!searchData.objectIDs) return results;
    
    const ids = searchData.objectIDs.slice(0, 80);
    
    for (const id of ids) {
      const artId = `met-${id}`;
      if (existingIds.has(artId)) continue;
      
      try {
        const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        if (!objRes.ok) continue;
        const obj = await objRes.json();
        
        if (!obj.isPublicDomain || !obj.primaryImage) continue;
        
        const culture = (obj.culture || '').toLowerCase();
        const title = (obj.title || '').toLowerCase();
        if (!culture.includes('chin') && !title.includes('chin') && !culture.includes('asia')) continue;
        
        const isTea = title.includes('tea') || title.includes('cup') || title.includes('bowl') ||
                      title.includes('ewer') || title.includes('pot') || title.includes('vessel') ||
                      title.includes('libation') || title.includes('wine');
        if (!isTea) continue;
        
        const imageWorks = await testImageUrl(obj.primaryImage);
        if (!imageWorks) continue;
        
        const { dynasty, dynastyEnglish } = parseDynasty(obj.objectDate || '', obj.culture || '');
        const { material, materialEnglish } = parseMaterial(obj.medium || '');
        
        results.push({
          id: artId,
          titleChinese: `${dynasty}${material}杯盏`,
          titleEnglish: obj.title || 'Untitled',
          dynasty, dynastyEnglish,
          period: obj.period,
          date: obj.objectDate || 'Unknown',
          material, materialEnglish: obj.medium || materialEnglish,
          objectType: '杯盏', objectTypeEnglish: 'Tea Bowl/Cup',
          dimensions: obj.dimensions,
          description: `此件杯盏为${dynastyEnglish.replace(' Dynasty', '')}时期之作品。现藏于大都会艺术博物馆。`,
          sourceMuseum: '大都会艺术博物馆',
          sourceMuseumEnglish: 'The Metropolitan Museum of Art',
          accessionNumber: obj.accessionNumber || '',
          sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${id}`,
          imageUrl: obj.primaryImage,
          imageAlt: `${obj.title} - ${obj.objectDate}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.creditLine,
          crawlBatchId: BATCH_ID,
        });
        
        existingIds.add(artId);
        if (results.length >= 30) break;
        await new Promise(r => setTimeout(r, 80));
      } catch { continue; }
    }
  } catch { /* skip */ }
  return results;
}

async function fetchCmaArtworks(query: string, existingIds: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  try {
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&cc0=1&limit=80`;
    const res = await fetch(url);
    if (!res.ok) return results;
    const data = await res.json();
    if (!data.data) return results;
    
    for (const obj of data.data) {
      const artId = `cma-${obj.id}`;
      if (existingIds.has(artId)) continue;
      
      const culture = (obj.culture?.[0] || '').toLowerCase();
      const title = (obj.title || '').toLowerCase();
      const dept = (obj.department || '').toLowerCase();
      
      if (!culture.includes('chin') && !title.includes('chin') && !dept.includes('asian')) continue;
      
      const isTea = title.includes('tea') || title.includes('cup') || title.includes('bowl') ||
                    title.includes('ewer') || title.includes('vessel') || title.includes('wine');
      if (!isTea) continue;
      
      const imageUrl = obj.images?.web?.url;
      if (!imageUrl) continue;
      
      const imageWorks = await testImageUrl(imageUrl);
      if (!imageWorks) continue;
      
      const { dynasty, dynastyEnglish } = parseDynasty(obj.creation_date || '', culture);
      const { material, materialEnglish } = parseMaterial(obj.technique || '');
      
      results.push({
        id: artId,
        titleChinese: `${dynasty}${material}杯盏`,
        titleEnglish: obj.title || 'Untitled',
        dynasty, dynastyEnglish,
        date: obj.creation_date || 'Unknown',
        material, materialEnglish: obj.technique || materialEnglish,
        objectType: '杯盏', objectTypeEnglish: 'Tea Bowl/Cup',
        dimensions: obj.measurements,
        description: `此件杯盏为${dynastyEnglish.replace(' Dynasty', '')}时期之作品。现藏于克利夫兰艺术博物馆。`,
        sourceMuseum: '克利夫兰艺术博物馆',
        sourceMuseumEnglish: 'Cleveland Museum of Art',
        accessionNumber: obj.accession_number || '',
        sourceUrl: `https://clevelandart.org/art/${obj.accession_number || obj.id}`,
        imageUrl,
        imageAlt: `${obj.title} - ${obj.creation_date}`,
        license: 'CC0 / Public Domain',
        creditLine: obj.creditline,
        crawlBatchId: BATCH_ID,
      });
      
      existingIds.add(artId);
      if (results.length >= 20) break;
      await new Promise(r => setTimeout(r, 50));
    }
  } catch { /* skip */ }
  return results;
}

async function main() {
  console.log('=== 藏品扩展 Round 2 ===\n');
  
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  const existingIds = new Set(artworks.map(a => a.id));
  
  console.log(`当前: ${artworks.length}, 目标: ${TARGET_COUNT}\n`);
  
  const newArtworks: Artwork[] = [];
  
  for (const query of MORE_MET_QUERIES) {
    if (artworks.length + newArtworks.length >= TARGET_COUNT) break;
    console.log(`Met: "${query}"...`);
    const found = await fetchMetArtworks(query, existingIds);
    console.log(`  +${found.length}`);
    newArtworks.push(...found);
    
    fs.appendFileSync(CRAWL_LOG_PATH, JSON.stringify({
      timestamp: new Date().toISOString(), source: 'met', query, idsAccepted: found.length, crawlBatchId: BATCH_ID
    }) + '\n');
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  for (const query of MORE_CMA_QUERIES) {
    if (artworks.length + newArtworks.length >= TARGET_COUNT) break;
    console.log(`CMA: "${query}"...`);
    const found = await fetchCmaArtworks(query, existingIds);
    console.log(`  +${found.length}`);
    newArtworks.push(...found);
    
    fs.appendFileSync(CRAWL_LOG_PATH, JSON.stringify({
      timestamp: new Date().toISOString(), source: 'cma', query, idsAccepted: found.length, crawlBatchId: BATCH_ID
    }) + '\n');
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  const all = [...artworks, ...newArtworks];
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(all, null, 2));
  
  console.log(`\n新增: ${newArtworks.length}, 总计: ${all.length}`);
  
  const byMuseum: Record<string, number> = {};
  all.forEach(a => byMuseum[a.sourceMuseum] = (byMuseum[a.sourceMuseum] || 0) + 1);
  Object.entries(byMuseum).forEach(([m, c]) => console.log(`  ${m}: ${c}`));
}

main().catch(console.error);
