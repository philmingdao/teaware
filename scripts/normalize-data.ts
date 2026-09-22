/**
 * Data Normalization Script
 * 
 * Fixes two main issues:
 * 1. Museum name duplicates (Traditional Chinese → Simplified Chinese)
 * 2. Vague Chinese titles like "其他XXX茶盏" → more descriptive titles
 * 
 * Run: npx tsx scripts/normalize-data.ts
 */

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
  crawlBatchId?: string;
}

// ==================== MUSEUM NAME NORMALIZATION ====================
// Map Traditional Chinese and variant names to canonical Simplified Chinese names
const MUSEUM_NAME_MAP: Record<string, string> = {
  // Met Museum
  '大都會藝術博物館': '大都会艺术博物馆',
  
  // Wikimedia Commons
  '維基共享資源': '维基共享资源',
  
  // Tokyo National Museum
  '東京国立博物館': '东京国立博物馆',
  
  // British Museum
  '大英博物館': '大英博物馆',
  
  // Shanghai Museum
  '上海博物館': '上海博物馆',
  
  // Korean National Museum
  '韓國國立中央博物館': '韩国国立中央博物馆',
  
  // Asian Art Museum variants - merge to Smithsonian
  '亞洲藝術博物館': '史密森尼亚洲艺术博物馆 (弗利尔/赛克勒)',
  '弗利爾-賽克勒美術館': '史密森尼亚洲艺术博物馆 (弗利尔/赛克勒)',
  '弗利尔美术馆': '史密森尼亚洲艺术博物馆 (弗利尔/赛克勒)',
  
  // Palace Museum
  '故宮博物院': '故宫博物院',
};

// ==================== DYNASTY NORMALIZATION ====================
// Normalize dynasty names to Simplified Chinese standard forms
const DYNASTY_MAP: Record<string, { chinese: string; english: string }> = {
  // Japanese periods - keep Japanese names but standardize
  '江戸': { chinese: '江户', english: 'Edo Period' },
  '江戸前期': { chinese: '江户前期', english: 'Early Edo Period' },
  '江戸中期': { chinese: '江户中期', english: 'Mid Edo Period' },
  '江戸後期': { chinese: '江户后期', english: 'Late Edo Period' },
  '明治': { chinese: '明治', english: 'Meiji Period' },
  '昭和': { chinese: '昭和', english: 'Showa Period' },
  '桃山': { chinese: '桃山', english: 'Momoyama Period' },
  '室町': { chinese: '室町', english: 'Muromachi Period' },
  '鎌倉': { chinese: '镰仓', english: 'Kamakura Period' },
  
  // Korean periods
  '高麗': { chinese: '高丽', english: 'Goryeo Dynasty' },
  '朝鮮': { chinese: '朝鲜', english: 'Joseon Dynasty' },
  '韩国': { chinese: '韩国', english: 'Korea' },
  '朝鲜': { chinese: '朝鲜', english: 'Joseon Dynasty' },
  
  // Chinese dynasties (keep as-is but ensure consistency)
  '唐': { chinese: '唐', english: 'Tang Dynasty' },
  '宋': { chinese: '宋', english: 'Song Dynasty' },
  '北宋': { chinese: '北宋', english: 'Northern Song Dynasty' },
  '南宋': { chinese: '南宋', english: 'Southern Song Dynasty' },
  '元': { chinese: '元', english: 'Yuan Dynasty' },
  '明': { chinese: '明', english: 'Ming Dynasty' },
  '清': { chinese: '清', english: 'Qing Dynasty' },
  '金': { chinese: '金', english: 'Jin Dynasty' },
  
  // Regional/Other
  '东亚': { chinese: '东亚', english: 'East Asia' },
  '中国': { chinese: '中国', english: 'China' },
  '日本': { chinese: '日本', english: 'Japan' },
  '越南': { chinese: '越南', english: 'Vietnam' },
  '其他': { chinese: '其他', english: 'Other Period' },
  '未知': { chinese: '未知', english: 'Unknown' },
  '未详': { chinese: '未详', english: 'Unspecified' },
};

// ==================== MATERIAL NAME NORMALIZATION ====================
// Map Traditional Chinese and variant material names to canonical Simplified Chinese
const MATERIAL_NAME_MAP: Record<string, string> = {
  // Japanese pottery - Traditional → Simplified
  '瀬戸焼': '濑户烧',
  '美濃焼': '美浓烧',
  '萩焼': '萩烧',
  '備前焼': '备前烧',
  '信楽焼': '信乐烧',
  '織部焼': '织部烧',
  '唐津焼': '唐津烧',
  '楽焼': '乐烧',
  '志野焼': '志野烧',
  
  // Other variants
  '珐琅/景泰蓝': '景泰蓝',
  '釉里红/郎窑红': '釉里红',
};

// ==================== OBJECT TYPE KEYWORDS ====================
// English keywords to Chinese object type mappings
const OBJECT_TYPE_KEYWORDS: Array<{ patterns: RegExp[]; chinese: string; english: string }> = [
  { patterns: [/teapot/i, /tea pot/i], chinese: '茶壶', english: 'Teapot' },
  { patterns: [/ewer/i], chinese: '执壶', english: 'Ewer' },
  { patterns: [/kettle/i, /tetsubin/i], chinese: '铁壶', english: 'Iron Kettle' },
  { patterns: [/gaiwan/i, /covered cup/i], chinese: '盖碗', english: 'Gaiwan' },
  { patterns: [/tea caddy/i, /tea jar/i, /tea canister/i, /chaire/i, /tea container/i], chinese: '茶罐', english: 'Tea Caddy' },
  { patterns: [/tea set/i, /tea service/i], chinese: '茶具组', english: 'Tea Set' },
  { patterns: [/saucer/i, /stand/i, /tea boat/i, /cup stand/i], chinese: '茶托', english: 'Saucer/Stand' },
  { patterns: [/tea scoop/i, /chashaku/i], chinese: '茶杓', english: 'Tea Scoop' },
  { patterns: [/water jar/i, /mizusashi/i, /water container/i], chinese: '水指', english: 'Water Jar' },
  { patterns: [/flower vase/i, /flower container/i, /hanaire/i], chinese: '花入', english: 'Flower Vase' },
  { patterns: [/stem cup/i], chinese: '高足杯', english: 'Stem Cup' },
  { patterns: [/libation cup/i], chinese: '爵杯', english: 'Libation Cup' },
  { patterns: [/wine cup/i], chinese: '酒杯', english: 'Wine Cup' },
  { patterns: [/cup\b/i, /cuppa/i], chinese: '杯', english: 'Cup' },
  { patterns: [/tea bowl/i, /teabowl/i, /chawan/i], chinese: '茶碗', english: 'Tea Bowl' },
  { patterns: [/bowl/i], chinese: '碗', english: 'Bowl' },
];

// ==================== MATERIAL KEYWORDS ====================
// English keywords to Chinese material mappings
const MATERIAL_KEYWORDS: Array<{ patterns: RegExp[]; chinese: string }> = [
  { patterns: [/yixing/i, /zisha/i, /purple clay/i, /宜兴/], chinese: '宜兴紫砂' },
  { patterns: [/jian ware/i, /jian\s+/i, /tenmoku/i, /天目/i, /hare'?s?\s*fur/i, /oil spot/i], chinese: '建盏' },
  { patterns: [/celadon/i, /qingci/i], chinese: '青瓷' },
  { patterns: [/longquan/i], chinese: '龙泉青瓷' },
  { patterns: [/blue.and.white/i, /underglaze blue/i], chinese: '青花瓷' },
  { patterns: [/famille.rose/i, /fencai/i], chinese: '粉彩' },
  { patterns: [/famille.verte/i, /wucai/i, /五彩/], chinese: '五彩' },
  { patterns: [/doucai/i, /斗彩/], chinese: '斗彩' },
  { patterns: [/enamel/i, /cloisonn/i, /景泰蓝/], chinese: '珐琅' },
  { patterns: [/dehua/i, /blanc de chine/i, /德化/], chinese: '德化白瓷' },
  { patterns: [/ding ware/i, /定窑/], chinese: '定瓷' },
  { patterns: [/jun ware/i, /钧窑/], chinese: '钧瓷' },
  { patterns: [/ru ware/i, /汝窑/], chinese: '汝瓷' },
  { patterns: [/guan ware/i, /官窑/], chinese: '官瓷' },
  { patterns: [/ge ware/i, /哥窑/], chinese: '哥瓷' },
  { patterns: [/qingbai/i, /yingqing/i, /青白/], chinese: '青白瓷' },
  { patterns: [/raku/i, /楽焼/i], chinese: '乐烧' },
  { patterns: [/oribe/i, /織部/], chinese: '织部烧' },
  { patterns: [/shino/i, /志野/], chinese: '志野烧' },
  { patterns: [/seto/i, /瀬戸/i, /瀬戸焼/], chinese: '濑户烧' },
  { patterns: [/bizen/i, /備前/i], chinese: '备前烧' },
  { patterns: [/hagi/i, /萩焼/i], chinese: '萩烧' },
  { patterns: [/karatsu/i, /唐津/i], chinese: '唐津烧' },
  { patterns: [/kutani/i, /九谷/], chinese: '九谷烧' },
  { patterns: [/satsuma/i, /薩摩/i], chinese: '萨摩烧' },
  { patterns: [/imari/i, /伊万里/], chinese: '伊万里' },
  { patterns: [/arita/i, /有田/], chinese: '有田烧' },
  { patterns: [/stoneware/i], chinese: '陶器' },
  { patterns: [/earthenware/i], chinese: '陶器' },
  { patterns: [/porcelain/i, /ceramic/i], chinese: '瓷器' },
  { patterns: [/lacquer/i], chinese: '漆器' },
  { patterns: [/jade/i, /nephrite/i], chinese: '玉器' },
  { patterns: [/silver/i], chinese: '银器' },
  { patterns: [/bronze/i], chinese: '青铜' },
  { patterns: [/iron/i, /cast.iron/i], chinese: '铁器' },
  { patterns: [/copper/i], chinese: '铜器' },
  { patterns: [/gold/i, /gilt/i], chinese: '金器' },
];

// ==================== HELPER FUNCTIONS ====================

function normalizeMuseum(museum: string): string {
  return MUSEUM_NAME_MAP[museum] || museum;
}

function normalizeMaterial(material: string): string {
  return MATERIAL_NAME_MAP[material] || material;
}

function normalizeDynasty(dynasty: string): { chinese: string; english: string } | null {
  return DYNASTY_MAP[dynasty] || null;
}

function detectObjectType(titleEn: string, existingType: string): { chinese: string; english: string } {
  for (const entry of OBJECT_TYPE_KEYWORDS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(titleEn)) {
        return { chinese: entry.chinese, english: entry.english };
      }
    }
  }
  return { chinese: existingType, english: '' };
}

function detectMaterial(titleEn: string, materialEn: string, existingMaterial: string): string {
  const combined = `${titleEn} ${materialEn}`;
  for (const entry of MATERIAL_KEYWORDS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(combined)) {
        return entry.chinese;
      }
    }
  }
  return existingMaterial;
}

function generateImprovedChineseTitle(
  titleEn: string,
  dynasty: string,
  material: string,
  objectTypeChinese: string,
  period?: string
): string {
  const lt = titleEn.toLowerCase();
  
  // Skip dynasty in title if it's generic/unknown
  const dynastyPrefix = (dynasty && dynasty !== '其他' && dynasty !== '未知' && dynasty !== '未详' && dynasty !== '') 
    ? dynasty 
    : '';
  
  // Skip material if it's too generic or same as objectType
  const materialPrefix = (material && material !== '瓷器' && material !== '陶器' && material !== '其他')
    ? material
    : '';
  
  // Use detected object type
  let objectPart = objectTypeChinese;
  
  // Try to extract more specific descriptors from English title
  const descriptors: string[] = [];
  
  // Color/glaze patterns
  if (/blue.and.white/i.test(titleEn)) descriptors.push('青花');
  else if (/celadon/i.test(titleEn)) descriptors.push('青瓷');
  else if (/white/i.test(titleEn) && /porcelain/i.test(titleEn)) descriptors.push('白瓷');
  else if (/black.glaze/i.test(titleEn)) descriptors.push('黑釉');
  else if (/red.glaze/i.test(titleEn)) descriptors.push('红釉');
  else if (/yellow.glaze/i.test(titleEn)) descriptors.push('黄釉');
  else if (/green.glaze/i.test(titleEn)) descriptors.push('绿釉');
  
  // Decorative motifs
  if (/dragon/i.test(lt)) descriptors.push('龙纹');
  else if (/phoenix/i.test(lt)) descriptors.push('凤纹');
  else if (/lotus/i.test(lt)) descriptors.push('莲纹');
  else if (/peony/i.test(lt)) descriptors.push('牡丹纹');
  else if (/flower/i.test(lt)) descriptors.push('花卉');
  else if (/landscape/i.test(lt)) descriptors.push('山水');
  else if (/figure/i.test(lt)) descriptors.push('人物');
  else if (/bird/i.test(lt)) descriptors.push('禽鸟');
  else if (/deer/i.test(lt)) descriptors.push('鹿纹');
  else if (/fish/i.test(lt)) descriptors.push('鱼纹');
  
  // Build the title
  const parts: string[] = [];
  
  if (dynastyPrefix) parts.push(dynastyPrefix);
  if (materialPrefix && !descriptors.includes(materialPrefix)) parts.push(materialPrefix);
  if (descriptors.length > 0) parts.push(descriptors[0]);
  parts.push(objectPart);
  
  return parts.join('');
}

function updateDescription(artwork: Artwork): string {
  const parts: string[] = [];
  
  if (artwork.dynasty && artwork.dynasty !== '其他' && artwork.dynasty !== '未知') {
    parts.push(`此件${artwork.objectType}为${artwork.dynasty}时期之作品。`);
  } else {
    parts.push(`此件${artwork.objectType}。`);
  }
  
  if (artwork.material && artwork.material !== '其他') {
    parts.push(`器身采用${artwork.material}工艺制成。`);
  }
  
  if (artwork.kiln) {
    parts.push(`出自${artwork.kiln}。`);
  }
  
  if (artwork.dimensions) {
    parts.push(`尺寸：${artwork.dimensions}。`);
  }
  
  parts.push(`现藏于${artwork.sourceMuseum}。`);
  
  return parts.join('');
}

// ==================== MAIN ====================

async function main() {
  console.log('🔧 Data Normalization Script');
  console.log('='.repeat(60));
  
  const srcPath = path.join(process.cwd(), 'src', 'data', 'artworks.json');
  const publicPath = path.join(process.cwd(), 'public', 'artworks.json');
  
  // Load artworks
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
  console.log(`📦 Loaded ${artworks.length} artworks`);
  
  // Stats before
  const museumsBefore = new Set(artworks.map(a => a.sourceMuseum));
  const titleWithQitaBefore = artworks.filter(a => a.titleChinese.includes('其他')).length;
  
  console.log(`\n📊 BEFORE:`);
  console.log(`   Unique museums: ${museumsBefore.size}`);
  console.log(`   Titles with "其他": ${titleWithQitaBefore}`);
  
  // Process each artwork
  let museumChanges = 0;
  let titleChanges = 0;
  let dynastyChanges = 0;
  let materialChanges = 0;
  
  for (const artwork of artworks) {
    // 1. Normalize museum name
    const normalizedMuseum = normalizeMuseum(artwork.sourceMuseum);
    if (normalizedMuseum !== artwork.sourceMuseum) {
      artwork.sourceMuseum = normalizedMuseum;
      museumChanges++;
    }
    
    // 2. Normalize material name (Traditional → Simplified)
    const normalizedMaterial = normalizeMaterial(artwork.material);
    if (normalizedMaterial !== artwork.material) {
      artwork.material = normalizedMaterial;
      materialChanges++;
    }
    
    // 3. Normalize dynasty
    const normalizedDynasty = normalizeDynasty(artwork.dynasty);
    if (normalizedDynasty && normalizedDynasty.chinese !== artwork.dynasty) {
      artwork.dynasty = normalizedDynasty.chinese;
      if (!artwork.dynastyEnglish || artwork.dynastyEnglish === 'Unknown' || artwork.dynastyEnglish === 'Other Period') {
        artwork.dynastyEnglish = normalizedDynasty.english;
      }
      dynastyChanges++;
    }
    
    // 4. Improve Chinese title if it contains "其他"
    if (artwork.titleChinese.includes('其他')) {
      const detectedType = detectObjectType(artwork.titleEnglish, artwork.objectType);
      const detectedMaterial = detectMaterial(artwork.titleEnglish, artwork.materialEnglish, artwork.material);
      
      // Update object type if we detected a better one
      if (detectedType.chinese && detectedType.chinese !== artwork.objectType) {
        artwork.objectType = detectedType.chinese;
        if (detectedType.english) {
          artwork.objectTypeEnglish = detectedType.english;
        }
      }
      
      // Update material if we detected a better one
      if (detectedMaterial && detectedMaterial !== artwork.material) {
        artwork.material = detectedMaterial;
      }
      
      const newTitle = generateImprovedChineseTitle(
        artwork.titleEnglish,
        artwork.dynasty,
        artwork.material,
        artwork.objectType,
        artwork.period
      );
      
      if (newTitle !== artwork.titleChinese && !newTitle.includes('其他')) {
        artwork.titleChinese = newTitle;
        titleChanges++;
      }
    }
    
    // 5. Update description
    artwork.description = updateDescription(artwork);
  }
  
  // Stats after
  const museumsAfter = new Set(artworks.map(a => a.sourceMuseum));
  const titleWithQitaAfter = artworks.filter(a => a.titleChinese.includes('其他')).length;
  
  console.log(`\n📊 AFTER:`);
  console.log(`   Unique museums: ${museumsAfter.size}`);
  console.log(`   Titles with "其他": ${titleWithQitaAfter}`);
  
  console.log(`\n📈 CHANGES:`);
  console.log(`   Museum names normalized: ${museumChanges}`);
  console.log(`   Material names normalized: ${materialChanges}`);
  console.log(`   Titles improved: ${titleChanges}`);
  console.log(`   Dynasties normalized: ${dynastyChanges}`);
  
  // Print museum breakdown
  console.log(`\n🏛️  Museums after normalization:`);
  const museumCounts: Record<string, number> = {};
  for (const artwork of artworks) {
    museumCounts[artwork.sourceMuseum] = (museumCounts[artwork.sourceMuseum] || 0) + 1;
  }
  Object.entries(museumCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([museum, count]) => {
      console.log(`   ${museum}: ${count}`);
    });
  
  // Sample title changes
  console.log(`\n📝 Sample title improvements:`);
  const sampleArtworks = artworks.filter(a => !a.titleChinese.includes('其他')).slice(0, 10);
  for (const a of sampleArtworks) {
    console.log(`   "${a.titleEnglish}" → "${a.titleChinese}"`);
  }
  
  // Save to both locations
  fs.writeFileSync(srcPath, JSON.stringify(artworks, null, 2), 'utf-8');
  fs.writeFileSync(publicPath, JSON.stringify(artworks, null, 2), 'utf-8');
  
  console.log(`\n✅ Saved normalized data to:`);
  console.log(`   ${srcPath}`);
  console.log(`   ${publicPath}`);
  
  // Return stats for verification
  return {
    before: {
      uniqueMuseums: museumsBefore.size,
      titlesWithQita: titleWithQitaBefore,
    },
    after: {
      uniqueMuseums: museumsAfter.size,
      titlesWithQita: titleWithQitaAfter,
    },
    changes: {
      museums: museumChanges,
      materials: materialChanges,
      titles: titleChanges,
      dynasties: dynastyChanges,
    },
  };
}

main().catch(console.error);
