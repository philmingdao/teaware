/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Round 20 Expansion Script - 2026-09-27
 * 
 * Target: Add +800 to +1,500 net-new quality teaware pieces
 * Baseline: 6,628 artworks after Round 19 / PR #44
 * Goal toward Phil's ~10,000 target
 * 
 * Sources prioritized (key-free first):
 * - Victoria & Albert Museum (V&A) - key-free API, fresh queries
 * - Smithsonian Freer/Sackler - with SMITHSONIAN_API_KEY
 * - Wikimedia Commons - new categories not in Round 19
 * - Met Museum - only for net-new items
 * 
 * Skipped sources:
 * - AIC IIIF (Cloudflare 403)
 * - CMA web API (usually ~900px, fails quality gate)
 * - Harvard (CC-BY-NC license - not open)
 * - Rijksmuseum (needs API key - RIJKSMUSEUM_API_KEY not available)
 * - NPM Taiwan (needs API key - NPM_TAIWAN_API_KEY not available)
 * 
 * Constraints:
 * - CC0 / Public Domain / CC BY only (no NC licenses)
 * - Self-host all images (download + compress via sharp)
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
const BATCH_ID = `round20-expansion-${Date.now()}`;

const SMITHSONIAN_API_KEY = process.env.SMITHSONIAN_API_KEY;

const MIN_LONGEST_EDGE = 1200;
const MAX_OUTPUT_EDGE = 1200;
const JPEG_QUALITY = 72;

const stats = {
  va: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
  smithsonian: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
  wikimedia: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
  met: { queried: 0, accepted: 0, rejected_lowres: 0, rejected_other: 0 },
};

// === ROUND 20 V&A QUERIES (fresh queries not used in Round 19) ===
const VA_QUERIES_R20 = [
  // Chinese imperial and palace ware
  'imperial porcelain Qing',
  'palace ware Chinese',
  'tribute porcelain',
  'altar vessels Chinese',
  'ritual vessels porcelain',
  
  // Chinese export porcelain
  'Chinese export ware',
  'Canton enamel',
  'Rose Medallion',
  'armorial porcelain',
  'tobacco leaf porcelain',
  'Fitzhugh pattern',
  'Mandarin palette',
  'Chinese European market',
  
  // Scholar's studio items
  'brush washer celadon',
  'water pot Chinese',
  'scholar rock ceramics',
  'seal paste box',
  'ink stone stand',
  'pen holder Chinese',
  
  // Specific form variations
  'lotus bowl Chinese',
  'chrysanthemum dish',
  'peony vase',
  'dragon dish porcelain',
  'phoenix bowl',
  'fish bowl Chinese',
  'garden seat porcelain',
  'pillow ceramics Chinese',
  
  // Regional variations
  'Fujian porcelain',
  'Guangdong porcelain',
  'Henan ceramics',
  'Zhejiang ceramics',
  'Jiangsu porcelain',
  'Shanxi ceramics',
  
  // More Japanese tea wares
  'sencha Japanese',
  'kyusu teapot',
  'dobin teapot',
  'yuzamashi',
  'hohin teapot',
  'shiboridashi',
  'houhin Japan',
  'Banko ware',
  'Tokoname teapot',
  'Echizen ceramics',
  
  // Japanese regional
  'Kyushu ceramics',
  'Hizen porcelain',
  'Fukuoka ceramics',
  'Saga ceramics',
  'Yamaguchi ceramics',
  'Okayama ceramics',
  
  // Korean specific
  'Joseon tea bowl',
  'Korean celadon inlay',
  'Buncheong mishima',
  'Korean hakeme',
  'Korean punch ong',
  'Koryo celadon',
  
  // Southeast Asian
  'Annam blue white',
  'Sukhothai ceramics',
  'Sangkhalok ware',
  'Si Satchanalai',
  'Burmese ceramics',
  'Cambodian ceramics',
  'Philippine ceramics',
];

// === ROUND 20 SMITHSONIAN QUERIES (fresh queries) ===
const SMITHSONIAN_QUERIES_R20 = [
  // More specific Chinese queries
  'Chinese vessel Freer',
  'Asian ceramics bowl',
  'Asian porcelain dish',
  'Asian tea ware',
  'Eastern ceramics',
  
  // Imperial ware
  'imperial kiln',
  'court porcelain',
  'palace ceramics',
  'tribute ceramics',
  'altar set ceramic',
  
  // Special glazes expanded
  'apple green glaze',
  'lime green Chinese',
  'sky blue glaze',
  'clair de lune glaze',
  'moon white glaze',
  'ivory glaze Chinese',
  'cream glaze Chinese',
  'brown glaze Chinese',
  'black glaze Chinese',
  'mirror black Chinese',
  
  // Decorative motifs
  'dragon phoenix porcelain',
  'hundred boys porcelain',
  'eight treasures porcelain',
  'hundred antiques',
  'landscape porcelain',
  'figure porcelain Chinese',
  'immortals porcelain',
  'scholar sage porcelain',
  
  // Special techniques
  'incised decoration Chinese',
  'carved porcelain',
  'molded porcelain',
  'pierced porcelain',
  'openwork porcelain',
  'reticulated porcelain',
  'applied decoration ceramic',
  
  // More Japanese
  'Japanese stoneware',
  'Japanese earthenware',
  'Japanese ash glaze',
  'Japanese iron glaze',
  'wood fired Japanese',
  'salt glaze Japanese',
  'Momoyama ceramics',
  'Edo ceramics',
  'Meiji ceramics',
  
  // More Korean
  'Korean stoneware',
  'Korean iron decoration',
  'Korean slip decoration',
  'Korean white slip',
  'Goryeo bowl',
  'Joseon jar',
  'Joseon dish',
  
  // More Southeast Asian
  'Vietnamese underglaze',
  'Vietnamese iron brown',
  'Chu Dau ceramics',
  'Thai brown glaze',
  'Khmer brown glaze',
  'Khmer stoneware',
];

// === ROUND 20 WIKIMEDIA CATEGORIES (new categories) ===
const WIKIMEDIA_CATEGORIES_R20 = [
  // Museum collections not yet queried
  'Category:Chinese_ceramics_in_the_Museum_für_Ostasiatische_Kunst_Cologne',
  'Category:Chinese_ceramics_in_the_Musée_Guimet',
  'Category:Chinese_ceramics_in_the_Rijksmuseum',
  'Category:Chinese_ceramics_in_the_Peabody_Essex_Museum',
  'Category:Asian_art_in_the_Honolulu_Museum_of_Art',
  'Category:Asian_art_in_the_Asian_Art_Museum_of_San_Francisco',
  'Category:Asian_art_in_the_Museum_of_Fine_Arts,_Boston',
  'Category:Chinese_art_in_the_Philadelphia_Museum_of_Art',
  'Category:Japanese_ceramics_in_the_British_Museum',
  'Category:Korean_ceramics_in_the_British_Museum',
  
  // More specific ware types
  'Category:Chinese_blue_and_white_porcelain',
  'Category:Chinese_famille_rose_porcelain',
  'Category:Chinese_celadon',
  'Category:Chinese_monochrome_porcelain',
  'Category:Chinese_overglaze_enamel',
  'Category:Chinese_underglaze_decoration',
  'Category:Chinese_Qingbai_ware',
  'Category:Chinese_sancai',
  
  // Dynasty-specific
  'Category:Tang_dynasty_ceramics',
  'Category:Song_dynasty_ceramics',
  'Category:Yuan_dynasty_ceramics',
  'Category:Ming_dynasty_ceramics',
  'Category:Ming_dynasty_porcelain',
  'Category:Qing_dynasty_ceramics',
  'Category:Qing_dynasty_porcelain',
  
  // Japanese tea ceremony
  'Category:Japanese_tea_ceremony_equipment',
  'Category:Japanese_tea_bowls',
  'Category:Japanese_tea_caddies',
  'Category:Japanese_water_containers',
  'Category:Japanese_flower_vases',
  'Category:Japanese_incense_containers',
  
  // Japanese kilns not yet queried
  'Category:Koishiwara_ware',
  'Category:Onta_ware',
  'Category:Hasami_ware',
  'Category:Tobe_ware',
  'Category:Mashiko_pottery',
  'Category:Kasama_ware',
  'Category:Otani_ware',
  
  // Korean specific
  'Category:Korean_pottery',
  'Category:Korean_porcelain',
  'Category:Goryeo_celadon',
  'Category:Joseon_white_porcelain',
  'Category:Korean_buncheong',
  
  // Vietnamese
  'Category:Vietnamese_pottery',
  'Category:Vietnamese_porcelain',
  'Category:Bat_Trang_ceramics',
  
  // Object types
  'Category:Chinese_vases',
  'Category:Chinese_bowls',
  'Category:Chinese_dishes',
  'Category:Chinese_jars',
  'Category:Chinese_ewers',
  'Category:Chinese_censers',
  'Category:Japanese_vases',
  'Category:Japanese_bowls',
  'Category:Korean_vases',
  'Category:Korean_bowls',
];

// === ROUND 20 MET QUERIES (fresh queries) ===
const MET_QUERIES_R20 = [
  // Specific dynasties deep dive
  'Shang dynasty pottery',
  'Zhou dynasty vessel',
  'Han tomb pottery',
  'Six Dynasties ceramics',
  'Sui dynasty ceramics',
  'Five Dynasties ceramic',
  'Liao dynasty pottery',
  'Jin dynasty ceramic',
  'Western Xia ceramic',
  
  // More specific forms
  'brush pot porcelain',
  'water coupe Chinese',
  'narcissus basin',
  'flower pot Chinese',
  'jardiniere Chinese',
  'garden seat Chinese',
  'pillow ceramic Chinese',
  'figure group Chinese',
  
  // Imperial marks expanded
  'mark period Xuande',
  'mark period Chenghua', 
  'mark period Jiajing',
  'mark period Wanli',
  'mark period Kangxi',
  'mark period Yongzheng',
  'mark period Qianlong',
  'apocryphal mark',
  
  // Special collections
  'Augustus Strong',
  'Morgan collection Chinese',
  'Altman collection Asian',
  'Havemeyer collection Asian',
  
  // Techniques
  'gilt porcelain Chinese',
  'gold decorated porcelain',
  'silver mounted Chinese',
  'ormolu mounted Chinese',
  'European mounted Chinese',
  
  // Regional Japan
  'Arita export',
  'Imari export',
  'Kutani export',
  'Satsuma export',
  'Hirado figure',
  'Kyoto Satsuma',
  
  // Tea ceremony specific
  'chanoyu utensil',
  'tea ceremony Korean',
  'tea ceremony Vietnam',
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

function loadCompletedQueries(): Set<string> {
  const completed = new Set<string>();
  if (!fs.existsSync(CRAWL_LOG_PATH)) return completed;
  
  const lines = fs.readFileSync(CRAWL_LOG_PATH, 'utf-8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.source && entry.query) {
        completed.add(`${entry.source}:${entry.query}`);
      }
    } catch { /* ignore */ }
  }
  return completed;
}

function fetchWithRetry(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'TeawareGallery/1.0 (https://philmingdao.github.io/teaware/; round20-expansion)',
        'Accept': 'application/json,image/*,*/*',
      },
      timeout: 120000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (location) {
          const absoluteUrl = location.startsWith('http') ? location : new URL(location, url).toString();
          fetchWithRetry(absoluteUrl, retries).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode === 429 || res.statusCode === 503) {
        if (retries > 0) {
          console.log(`    [限流] 等待后重试... (剩余${retries}次)`);
          setTimeout(() => fetchWithRetry(url, retries - 1).then(resolve).catch(reject), 10000);
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
  const data = await fetchWithRetry(url);
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

function parseDynasty(date: string, culture: string): { dynasty: string; dynastyEnglish: string } {
  const lower = (date + ' ' + culture).toLowerCase();
  
  // Japanese periods
  if (lower.includes('jomon')) return { dynasty: '绳文', dynastyEnglish: 'Jōmon Period (Japan)' };
  if (lower.includes('yayoi')) return { dynasty: '弥生', dynastyEnglish: 'Yayoi Period (Japan)' };
  if (lower.includes('kofun')) return { dynasty: '古坟', dynastyEnglish: 'Kofun Period (Japan)' };
  if (lower.includes('nara')) return { dynasty: '奈良', dynastyEnglish: 'Nara Period (Japan)' };
  if (lower.includes('heian')) return { dynasty: '平安', dynastyEnglish: 'Heian Period (Japan)' };
  if (lower.includes('kamakura')) return { dynasty: '镰仓', dynastyEnglish: 'Kamakura Period (Japan)' };
  if (lower.includes('muromachi')) return { dynasty: '室町', dynastyEnglish: 'Muromachi Period (Japan)' };
  if (lower.includes('momoyama') || lower.includes('azuchi')) return { dynasty: '桃山', dynastyEnglish: 'Momoyama Period (Japan)' };
  if (lower.includes('edo') || lower.includes('tokugawa')) return { dynasty: '江戸', dynastyEnglish: 'Edo Period (Japan)' };
  if (lower.includes('meiji')) return { dynasty: '明治', dynastyEnglish: 'Meiji Period (Japan)' };
  if (lower.includes('taisho')) return { dynasty: '大正', dynastyEnglish: 'Taishō Period (Japan)' };
  if (lower.includes('showa')) return { dynasty: '昭和', dynastyEnglish: 'Shōwa Period (Japan)' };
  
  // Korean dynasties
  if (lower.includes('three kingdoms') && lower.includes('korea')) return { dynasty: '三国', dynastyEnglish: 'Three Kingdoms (Korea)' };
  if (lower.includes('unified silla') || (lower.includes('silla') && !lower.includes('goryeo'))) return { dynasty: '新罗', dynastyEnglish: 'Silla Dynasty (Korea)' };
  if (lower.includes('baekje')) return { dynasty: '百济', dynastyEnglish: 'Baekje Dynasty (Korea)' };
  if (lower.includes('goryeo') || lower.includes('koryo')) return { dynasty: '高麗', dynastyEnglish: 'Goryeo Dynasty (Korea)' };
  if (lower.includes('joseon') || lower.includes('choson') || lower.includes('yi dynasty')) return { dynasty: '朝鮮', dynastyEnglish: 'Joseon Dynasty (Korea)' };
  
  // Vietnamese
  if (lower.includes('vietnam') || lower.includes('annamese') || lower.includes('dai viet')) return { dynasty: '越南', dynastyEnglish: 'Vietnam' };
  if (lower.includes('chu dau') || lower.includes('chu đậu')) return { dynasty: '越南朱豆', dynastyEnglish: 'Chu Đậu (Vietnam)' };
  
  // Thai/Southeast Asian
  if (lower.includes('thai') || lower.includes('siam')) return { dynasty: '泰国', dynastyEnglish: 'Thailand' };
  if (lower.includes('sukhothai')) return { dynasty: '素可泰', dynastyEnglish: 'Sukhothai (Thailand)' };
  if (lower.includes('sawankhalok')) return { dynasty: '沙旺卡洛', dynastyEnglish: 'Sawankhalok (Thailand)' };
  if (lower.includes('khmer') || lower.includes('cambodia')) return { dynasty: '高棉', dynastyEnglish: 'Khmer (Cambodia)' };
  if (lower.includes('myanmar') || lower.includes('burma')) return { dynasty: '缅甸', dynastyEnglish: 'Myanmar' };
  
  // Chinese dynasties (chronological)
  if (lower.includes('neolithic')) return { dynasty: '新石器', dynastyEnglish: 'Neolithic China' };
  if (lower.includes('shang')) return { dynasty: '商', dynastyEnglish: 'Shang Dynasty' };
  if (lower.includes('western zhou')) return { dynasty: '西周', dynastyEnglish: 'Western Zhou Dynasty' };
  if (lower.includes('eastern zhou')) return { dynasty: '东周', dynastyEnglish: 'Eastern Zhou Dynasty' };
  if (lower.includes('zhou') && !lower.includes('cizhou')) return { dynasty: '周', dynastyEnglish: 'Zhou Dynasty' };
  if (lower.includes('warring states')) return { dynasty: '战国', dynastyEnglish: 'Warring States' };
  if (lower.includes('qin') && !lower.includes('qing')) return { dynasty: '秦', dynastyEnglish: 'Qin Dynasty' };
  if (lower.includes('western han')) return { dynasty: '西汉', dynastyEnglish: 'Western Han Dynasty' };
  if (lower.includes('eastern han')) return { dynasty: '东汉', dynastyEnglish: 'Eastern Han Dynasty' };
  if (lower.includes('han dynasty') || (lower.includes('han') && (lower.includes('206') || lower.includes('220')))) return { dynasty: '汉', dynastyEnglish: 'Han Dynasty' };
  if (lower.includes('three kingdoms')) return { dynasty: '三国', dynastyEnglish: 'Three Kingdoms' };
  if (lower.includes('western jin')) return { dynasty: '西晋', dynastyEnglish: 'Western Jin Dynasty' };
  if (lower.includes('eastern jin')) return { dynasty: '东晋', dynastyEnglish: 'Eastern Jin Dynasty' };
  if (lower.includes('southern dynasties')) return { dynasty: '南朝', dynastyEnglish: 'Southern Dynasties' };
  if (lower.includes('northern dynasties')) return { dynasty: '北朝', dynastyEnglish: 'Northern Dynasties' };
  if (lower.includes('six dynasties')) return { dynasty: '六朝', dynastyEnglish: 'Six Dynasties' };
  if (lower.includes('sui')) return { dynasty: '隋', dynastyEnglish: 'Sui Dynasty' };
  if (lower.includes('tang') || lower.includes('618') || lower.includes('907')) return { dynasty: '唐', dynastyEnglish: 'Tang Dynasty' };
  if (lower.includes('five dynasties') || lower.includes('ten kingdoms')) return { dynasty: '五代', dynastyEnglish: 'Five Dynasties' };
  if (lower.includes('liao')) return { dynasty: '遼', dynastyEnglish: 'Liao Dynasty' };
  if (lower.includes('western xia')) return { dynasty: '西夏', dynastyEnglish: 'Western Xia Dynasty' };
  if (lower.includes('northern song')) return { dynasty: '北宋', dynastyEnglish: 'Northern Song Dynasty' };
  if (lower.includes('southern song')) return { dynasty: '南宋', dynastyEnglish: 'Southern Song Dynasty' };
  if (lower.includes('song') || lower.includes('960') || lower.includes('1279')) return { dynasty: '宋', dynastyEnglish: 'Song Dynasty' };
  if (lower.includes('jin') && !lower.includes('qing') && !lower.includes('jingdezhen')) return { dynasty: '金', dynastyEnglish: 'Jin Dynasty' };
  if (lower.includes('yuan') || lower.includes('1271') || lower.includes('1368') || lower.includes('mongol')) return { dynasty: '元', dynastyEnglish: 'Yuan Dynasty' };
  
  // Ming reign periods
  if (lower.includes('hongwu')) return { dynasty: '明洪武', dynastyEnglish: 'Ming Dynasty (Hongwu)' };
  if (lower.includes('yongle')) return { dynasty: '明永乐', dynastyEnglish: 'Ming Dynasty (Yongle)' };
  if (lower.includes('xuande')) return { dynasty: '明宣德', dynastyEnglish: 'Ming Dynasty (Xuande)' };
  if (lower.includes('zhengtong')) return { dynasty: '明正统', dynastyEnglish: 'Ming Dynasty (Zhengtong)' };
  if (lower.includes('chenghua')) return { dynasty: '明成化', dynastyEnglish: 'Ming Dynasty (Chenghua)' };
  if (lower.includes('hongzhi')) return { dynasty: '明弘治', dynastyEnglish: 'Ming Dynasty (Hongzhi)' };
  if (lower.includes('zhengde')) return { dynasty: '明正德', dynastyEnglish: 'Ming Dynasty (Zhengde)' };
  if (lower.includes('jiajing')) return { dynasty: '明嘉靖', dynastyEnglish: 'Ming Dynasty (Jiajing)' };
  if (lower.includes('longqing')) return { dynasty: '明隆庆', dynastyEnglish: 'Ming Dynasty (Longqing)' };
  if (lower.includes('wanli')) return { dynasty: '明万历', dynastyEnglish: 'Ming Dynasty (Wanli)' };
  if (lower.includes('taichang')) return { dynasty: '明泰昌', dynastyEnglish: 'Ming Dynasty (Taichang)' };
  if (lower.includes('tianqi')) return { dynasty: '明天启', dynastyEnglish: 'Ming Dynasty (Tianqi)' };
  if (lower.includes('chongzhen')) return { dynasty: '明崇祯', dynastyEnglish: 'Ming Dynasty (Chongzhen)' };
  if (lower.includes('transitional')) return { dynasty: '明末清初', dynastyEnglish: 'Transitional Period' };
  if (lower.includes('ming') || lower.includes('1368') || lower.includes('1644')) return { dynasty: '明', dynastyEnglish: 'Ming Dynasty' };
  
  // Qing reign periods
  if (lower.includes('shunzhi')) return { dynasty: '清顺治', dynastyEnglish: 'Qing Dynasty (Shunzhi)' };
  if (lower.includes('kangxi')) return { dynasty: '清康熙', dynastyEnglish: 'Qing Dynasty (Kangxi)' };
  if (lower.includes('yongzheng')) return { dynasty: '清雍正', dynastyEnglish: 'Qing Dynasty (Yongzheng)' };
  if (lower.includes('qianlong')) return { dynasty: '清乾隆', dynastyEnglish: 'Qing Dynasty (Qianlong)' };
  if (lower.includes('jiaqing')) return { dynasty: '清嘉庆', dynastyEnglish: 'Qing Dynasty (Jiaqing)' };
  if (lower.includes('daoguang')) return { dynasty: '清道光', dynastyEnglish: 'Qing Dynasty (Daoguang)' };
  if (lower.includes('xianfeng')) return { dynasty: '清咸丰', dynastyEnglish: 'Qing Dynasty (Xianfeng)' };
  if (lower.includes('tongzhi')) return { dynasty: '清同治', dynastyEnglish: 'Qing Dynasty (Tongzhi)' };
  if (lower.includes('guangxu')) return { dynasty: '清光绪', dynastyEnglish: 'Qing Dynasty (Guangxu)' };
  if (lower.includes('xuantong')) return { dynasty: '清宣统', dynastyEnglish: 'Qing Dynasty (Xuantong)' };
  if (lower.includes('qing') || lower.includes('1644') || lower.includes('1911')) return { dynasty: '清', dynastyEnglish: 'Qing Dynasty' };
  
  if (lower.includes('republic') || lower.includes('民国')) return { dynasty: '民国', dynastyEnglish: 'Republic of China' };
  if (lower.includes('china') || lower.includes('chinese')) return { dynasty: '中国', dynastyEnglish: 'China' };
  if (lower.includes('japan')) return { dynasty: '日本', dynastyEnglish: 'Japan' };
  if (lower.includes('korea')) return { dynasty: '韩国', dynastyEnglish: 'Korea' };
  return { dynasty: '东亚', dynastyEnglish: 'East Asia' };
}

function parseMaterial(medium: string): { material: string; materialEnglish: string } {
  const lower = medium.toLowerCase();
  
  // Chinese ware types
  if (lower.includes('famille verte')) return { material: '五彩瓷', materialEnglish: 'Famille Verte Porcelain' };
  if (lower.includes('famille rose') || lower.includes('fencai')) return { material: '粉彩瓷', materialEnglish: 'Famille Rose Porcelain' };
  if (lower.includes('famille noire')) return { material: '墨地五彩', materialEnglish: 'Famille Noire Porcelain' };
  if (lower.includes('famille jaune')) return { material: '黄地五彩', materialEnglish: 'Famille Jaune Porcelain' };
  if (lower.includes('doucai')) return { material: '斗彩瓷', materialEnglish: 'Doucai Porcelain' };
  if (lower.includes('wucai')) return { material: '五彩瓷', materialEnglish: 'Wucai Porcelain' };
  if (lower.includes('susancai')) return { material: '素三彩', materialEnglish: 'Susancai Porcelain' };
  if (lower.includes('fahua')) return { material: '法华彩', materialEnglish: 'Fahua Ware' };
  if (lower.includes('falangcai')) return { material: '珐琅彩', materialEnglish: 'Falangcai Enamel' };
  if (lower.includes('blue and white') || lower.includes('blue-and-white') || lower.includes('qinghua')) return { material: '青花瓷', materialEnglish: 'Blue and White Porcelain' };
  if (lower.includes('underglaze red') || lower.includes('youlihuang')) return { material: '釉里红', materialEnglish: 'Underglaze Red Porcelain' };
  if (lower.includes('celadon')) return { material: '青瓷', materialEnglish: 'Celadon' };
  if (lower.includes('blanc de chine') || lower.includes('dehua')) return { material: '德化白瓷', materialEnglish: 'Blanc de Chine (Dehua)' };
  if (lower.includes('yixing') || lower.includes('zisha')) return { material: '宜兴紫砂', materialEnglish: 'Yixing Zisha' };
  
  // Song dynasty wares
  if (lower.includes('jun') || lower.includes('chün')) return { material: '钧瓷', materialEnglish: 'Jun Ware' };
  if (lower.includes('ding')) return { material: '定瓷', materialEnglish: 'Ding Ware' };
  if (lower.includes('cizhou')) return { material: '磁州窑', materialEnglish: 'Cizhou Ware' };
  if (lower.includes('ge') && lower.includes('ware')) return { material: '哥窑', materialEnglish: 'Ge Ware' };
  if (lower.includes('ru') && lower.includes('ware')) return { material: '汝窑', materialEnglish: 'Ru Ware' };
  if (lower.includes('guan')) return { material: '官窑', materialEnglish: 'Guan Ware' };
  if (lower.includes('longquan')) return { material: '龙泉青瓷', materialEnglish: 'Longquan Celadon' };
  if (lower.includes('yaozhou')) return { material: '耀州窑', materialEnglish: 'Yaozhou Ware' };
  if (lower.includes('yue')) return { material: '越窑', materialEnglish: 'Yue Ware' };
  if (lower.includes('jizhou')) return { material: '吉州窑', materialEnglish: 'Jizhou Ware' };
  if (lower.includes('jian') || lower.includes('tenmoku') || lower.includes("hare's fur") || lower.includes('oil spot')) return { material: '建盏', materialEnglish: 'Jian Ware' };
  if (lower.includes('qingbai') || lower.includes('shadow blue') || lower.includes('yingqing')) return { material: '青白瓷', materialEnglish: 'Qingbai Ware' };
  if (lower.includes('xing')) return { material: '邢窑', materialEnglish: 'Xing Ware' };
  if (lower.includes('changsha')) return { material: '长沙窑', materialEnglish: 'Changsha Ware' };
  if (lower.includes('shiwan')) return { material: '石湾窑', materialEnglish: 'Shiwan Ware' };
  
  // Export ware
  if (lower.includes('kraak')) return { material: '克拉克瓷', materialEnglish: 'Kraak Porcelain' };
  if (lower.includes('swatow')) return { material: '汕头瓷', materialEnglish: 'Swatow Ware' };
  if (lower.includes('zhangzhou')) return { material: '漳州窑', materialEnglish: 'Zhangzhou Ware' };
  if (lower.includes('export')) return { material: '外销瓷', materialEnglish: 'Export Porcelain' };
  
  // Glazes
  if (lower.includes('sancai')) return { material: '三彩', materialEnglish: 'Sancai' };
  if (lower.includes('copper red') || lower.includes('sang de boeuf') || lower.includes('ox blood') || lower.includes('langyao')) return { material: '郎窑红', materialEnglish: 'Copper Red Glaze' };
  if (lower.includes('peachbloom') || lower.includes('peach bloom')) return { material: '豇豆红', materialEnglish: 'Peachbloom Glaze' };
  if (lower.includes('flambe') || lower.includes('flambé') || lower.includes('transmutation')) return { material: '窑变釉', materialEnglish: 'Flambé Glaze' };
  if (lower.includes('powder blue') || lower.includes('clair de lune')) return { material: '洒蓝釉', materialEnglish: 'Powder Blue Glaze' };
  if (lower.includes('mirror black') || lower.includes('wujin')) return { material: '乌金釉', materialEnglish: 'Mirror Black Glaze' };
  if (lower.includes('tea dust') || lower.includes('chaiye')) return { material: '茶叶末釉', materialEnglish: 'Tea Dust Glaze' };
  if (lower.includes('robin egg') || lower.includes('robin\'s egg')) return { material: '蛋壳青', materialEnglish: "Robin's Egg Blue" };
  if (lower.includes('imperial yellow') || lower.includes('lemon yellow')) return { material: '黄釉', materialEnglish: 'Imperial Yellow Glaze' };
  if (lower.includes('coral red')) return { material: '珊瑚红', materialEnglish: 'Coral Red Glaze' };
  if (lower.includes('aubergine')) return { material: '茄皮紫', materialEnglish: 'Aubergine Glaze' };
  if (lower.includes('turquoise')) return { material: '孔雀蓝釉', materialEnglish: 'Turquoise Glaze' };
  if (lower.includes('lavender')) return { material: '淡紫釉', materialEnglish: 'Lavender Glaze' };
  if (lower.includes('iron rust') || lower.includes('rust')) return { material: '铁锈釉', materialEnglish: 'Iron Rust Glaze' };
  if (lower.includes('sacrificial red')) return { material: '祭红', materialEnglish: 'Sacrificial Red' };
  if (lower.includes('sacrificial blue')) return { material: '祭蓝', materialEnglish: 'Sacrificial Blue' };
  
  // Other materials
  if (lower.includes('cloisonne') || lower.includes('cloisonné')) return { material: '景泰蓝', materialEnglish: 'Cloisonné' };
  if (lower.includes('enamel') && lower.includes('painted')) return { material: '珐琅彩', materialEnglish: 'Painted Enamel' };
  if (lower.includes('enamel') && lower.includes('canton')) return { material: '广彩珐琅', materialEnglish: 'Canton Enamel' };
  if (lower.includes('enamel')) return { material: '珐琅', materialEnglish: 'Enamel' };
  if (lower.includes('lacquer')) return { material: '漆器', materialEnglish: 'Lacquerware' };
  if (lower.includes('iron')) return { material: '铁器', materialEnglish: 'Iron' };
  if (lower.includes('silver')) return { material: '银器', materialEnglish: 'Silver' };
  if (lower.includes('bronze') || lower.includes('copper')) return { material: '铜器', materialEnglish: 'Bronze' };
  if (lower.includes('pewter')) return { material: '锡器', materialEnglish: 'Pewter' };
  
  // Japanese wares
  if (lower.includes('raku')) return { material: '乐烧', materialEnglish: 'Raku Ware' };
  if (lower.includes('satsuma')) return { material: '萨摩烧', materialEnglish: 'Satsuma Ware' };
  if (lower.includes('kutani')) return { material: '九谷烧', materialEnglish: 'Kutani Ware' };
  if (lower.includes('imari') || lower.includes('arita')) return { material: '伊万里烧', materialEnglish: 'Imari Ware' };
  if (lower.includes('kakiemon')) return { material: '柿右卫门', materialEnglish: 'Kakiemon Ware' };
  if (lower.includes('nabeshima')) return { material: '锅岛烧', materialEnglish: 'Nabeshima Ware' };
  if (lower.includes('hagi')) return { material: '萩烧', materialEnglish: 'Hagi Ware' };
  if (lower.includes('karatsu')) return { material: '唐津烧', materialEnglish: 'Karatsu Ware' };
  if (lower.includes('oribe')) return { material: '织部烧', materialEnglish: 'Oribe Ware' };
  if (lower.includes('shino')) return { material: '志野烧', materialEnglish: 'Shino Ware' };
  if (lower.includes('bizen')) return { material: '备前烧', materialEnglish: 'Bizen Ware' };
  if (lower.includes('shigaraki')) return { material: '信乐烧', materialEnglish: 'Shigaraki Ware' };
  if (lower.includes('mino')) return { material: '美浓烧', materialEnglish: 'Mino Ware' };
  if (lower.includes('iga')) return { material: '伊贺烧', materialEnglish: 'Iga Ware' };
  if (lower.includes('tamba')) return { material: '丹波烧', materialEnglish: 'Tamba Ware' };
  if (lower.includes('seto')) return { material: '濑户烧', materialEnglish: 'Seto Ware' };
  if (lower.includes('tokoname')) return { material: '常滑烧', materialEnglish: 'Tokoname Ware' };
  if (lower.includes('echizen')) return { material: '越前烧', materialEnglish: 'Echizen Ware' };
  if (lower.includes('mashiko')) return { material: '益子烧', materialEnglish: 'Mashiko Ware' };
  if (lower.includes('kyoto') && lower.includes('ware')) return { material: '京烧', materialEnglish: 'Kyoto Ware' };
  if (lower.includes('kiyomizu')) return { material: '清水烧', materialEnglish: 'Kiyomizu Ware' };
  if (lower.includes('hirado')) return { material: '平户烧', materialEnglish: 'Hirado Ware' };
  if (lower.includes('takatori')) return { material: '高取烧', materialEnglish: 'Takatori Ware' };
  if (lower.includes('agano')) return { material: '上野烧', materialEnglish: 'Agano Ware' };
  if (lower.includes('banko')) return { material: '万古烧', materialEnglish: 'Banko Ware' };
  
  // Korean wares
  if (lower.includes('buncheong') || lower.includes('punchong') || lower.includes("punch'ong")) return { material: '粉青沙器', materialEnglish: 'Buncheong (Punchong)' };
  if (lower.includes('joseon white') || (lower.includes('joseon') && lower.includes('white'))) return { material: '朝鲜白瓷', materialEnglish: 'Joseon White Porcelain' };
  if (lower.includes('goryeo celadon') || (lower.includes('goryeo') && lower.includes('celadon'))) return { material: '高丽青瓷', materialEnglish: 'Goryeo Celadon' };
  
  // Generic
  if (lower.includes('porcelain') || lower.includes('ceramic')) return { material: '瓷器', materialEnglish: 'Porcelain' };
  if (lower.includes('stoneware')) return { material: '陶器', materialEnglish: 'Stoneware' };
  if (lower.includes('earthenware')) return { material: '陶器', materialEnglish: 'Earthenware' };
  if (lower.includes('pottery')) return { material: '陶器', materialEnglish: 'Pottery' };
  return { material: '瓷器', materialEnglish: 'Ceramics' };
}

function parseObjectType(title: string, objectName: string): { objectType: string; objectTypeEnglish: string } {
  const lower = (title + ' ' + objectName).toLowerCase();
  
  // Tea ware
  if (lower.includes('teapot') || lower.includes('tea pot')) return { objectType: '茶壶', objectTypeEnglish: 'Teapot' };
  if (lower.includes('kyusu')) return { objectType: '急须', objectTypeEnglish: 'Kyusu' };
  if (lower.includes('dobin')) return { objectType: '土瓶', objectTypeEnglish: 'Dobin' };
  if (lower.includes('tetsubin') || lower.includes('iron kettle')) return { objectType: '铁壶', objectTypeEnglish: 'Tetsubin' };
  if (lower.includes('tea caddy') || lower.includes('tea canister') || lower.includes('tea jar') || lower.includes('chaire')) return { objectType: '茶罐', objectTypeEnglish: 'Tea Caddy' };
  if (lower.includes('gaiwan') || lower.includes('covered tea')) return { objectType: '盖碗', objectTypeEnglish: 'Gaiwan' };
  if (lower.includes('chawan') || lower.includes('tea bowl')) return { objectType: '茶碗', objectTypeEnglish: 'Tea Bowl' };
  if (lower.includes('chashaku') || lower.includes('tea scoop')) return { objectType: '茶杓', objectTypeEnglish: 'Chashaku' };
  if (lower.includes('chasen') || lower.includes('tea whisk')) return { objectType: '茶筅', objectTypeEnglish: 'Chasen' };
  if (lower.includes('tea tray')) return { objectType: '茶盘', objectTypeEnglish: 'Tea Tray' };
  if (lower.includes('cup stand') || lower.includes('saucer stand')) return { objectType: '盏托', objectTypeEnglish: 'Cup Stand' };
  if (lower.includes('mizusashi') || lower.includes('water jar')) return { objectType: '水指', objectTypeEnglish: 'Mizusashi' };
  if (lower.includes('kensui') || lower.includes('waste water')) return { objectType: '建水', objectTypeEnglish: 'Kensui' };
  if (lower.includes('futaoki') || lower.includes('lid rest')) return { objectType: '盖置', objectTypeEnglish: 'Futaoki' };
  if (lower.includes('natsume') || lower.includes('thin tea')) return { objectType: '枣', objectTypeEnglish: 'Natsume' };
  if (lower.includes('hishaku')) return { objectType: '柄杓', objectTypeEnglish: 'Hishaku' };
  if (lower.includes('yuzamashi')) return { objectType: '汤冷', objectTypeEnglish: 'Yuzamashi' };
  if (lower.includes('hohin') || lower.includes('houhin')) return { objectType: '宝瓶', objectTypeEnglish: 'Hohin' };
  if (lower.includes('shiboridashi')) return { objectType: '绞出', objectTypeEnglish: 'Shiboridashi' };
  
  // Cups
  if (lower.includes('stem cup')) return { objectType: '高足杯', objectTypeEnglish: 'Stem Cup' };
  if (lower.includes('libation cup')) return { objectType: '爵杯', objectTypeEnglish: 'Libation Cup' };
  if (lower.includes('wine cup') || lower.includes('sake cup')) return { objectType: '酒杯', objectTypeEnglish: 'Wine Cup' };
  if (lower.includes('cup')) return { objectType: '杯盏', objectTypeEnglish: 'Cup' };
  
  // Bowls
  if (lower.includes('conical bowl')) return { objectType: '斗笠碗', objectTypeEnglish: 'Conical Bowl' };
  if (lower.includes('warming bowl')) return { objectType: '温碗', objectTypeEnglish: 'Warming Bowl' };
  if (lower.includes('rice bowl')) return { objectType: '饭碗', objectTypeEnglish: 'Rice Bowl' };
  if (lower.includes('lotus bowl')) return { objectType: '莲瓣碗', objectTypeEnglish: 'Lotus Bowl' };
  if (lower.includes('footed bowl') || lower.includes('stem bowl')) return { objectType: '高足碗', objectTypeEnglish: 'Footed Bowl' };
  if (lower.includes('matcha bowl')) return { objectType: '抹茶碗', objectTypeEnglish: 'Matcha Bowl' };
  if (lower.includes('bowl')) return { objectType: '碗', objectTypeEnglish: 'Bowl' };
  
  // Vases
  if (lower.includes('meiping') || lower.includes('mei ping') || lower.includes('mei-ping')) return { objectType: '梅瓶', objectTypeEnglish: 'Meiping Vase' };
  if (lower.includes('garlic') && lower.includes('vase')) return { objectType: '蒜头瓶', objectTypeEnglish: 'Garlic-Head Vase' };
  if (lower.includes('double gourd') || lower.includes('huluping')) return { objectType: '葫芦瓶', objectTypeEnglish: 'Double Gourd Vase' };
  if (lower.includes('moon flask') || lower.includes('pilgrim flask')) return { objectType: '抱月瓶', objectTypeEnglish: 'Moon Flask' };
  if (lower.includes('pear-shaped') || lower.includes('yuhuchun')) return { objectType: '玉壶春瓶', objectTypeEnglish: 'Pear-Shaped Vase' };
  if (lower.includes('trumpet') && lower.includes('vase')) return { objectType: '花觚', objectTypeEnglish: 'Trumpet Vase' };
  if (lower.includes('bottle vase') || lower.includes('globular vase')) return { objectType: '瓶', objectTypeEnglish: 'Bottle Vase' };
  if (lower.includes('baluster')) return { objectType: '将军罐', objectTypeEnglish: 'Baluster Vase' };
  if (lower.includes('rouleau') || lower.includes('bangchuiping')) return { objectType: '棒槌瓶', objectTypeEnglish: 'Rouleau Vase' };
  if (lower.includes('yen yen') || lower.includes('yan yan')) return { objectType: '凤尾瓶', objectTypeEnglish: 'Yen-Yen Vase' };
  if (lower.includes('sleeve')) return { objectType: '筒瓶', objectTypeEnglish: 'Sleeve Vase' };
  if (lower.includes('arrow')) return { objectType: '箭筒', objectTypeEnglish: 'Arrow Vase' };
  if (lower.includes('wall vase')) return { objectType: '壁瓶', objectTypeEnglish: 'Wall Vase' };
  if (lower.includes('cong')) return { objectType: '琮式瓶', objectTypeEnglish: 'Cong Vase' };
  if (lower.includes('fanghu')) return { objectType: '方壶', objectTypeEnglish: 'Fanghu Vase' };
  if (lower.includes('tianqiuping')) return { objectType: '天球瓶', objectTypeEnglish: 'Tianqiuping Vase' };
  if (lower.includes('vase')) return { objectType: '瓶', objectTypeEnglish: 'Vase' };
  
  // Planters and garden items
  if (lower.includes('jardiniere') || lower.includes('jardinière')) return { objectType: '花盆', objectTypeEnglish: 'Jardiniere' };
  if (lower.includes('flower pot') || lower.includes('flowerpot')) return { objectType: '花盆', objectTypeEnglish: 'Flower Pot' };
  if (lower.includes('garden seat')) return { objectType: '瓷凳', objectTypeEnglish: 'Garden Seat' };
  if (lower.includes('narcissus basin') || lower.includes('narcissus bowl')) return { objectType: '水仙盆', objectTypeEnglish: 'Narcissus Basin' };
  
  // Ancient vessels
  if (lower.includes('zun')) return { objectType: '尊', objectTypeEnglish: 'Zun Vessel' };
  if (lower.includes('hu vessel') || (lower.includes('hu') && lower.includes('vessel'))) return { objectType: '壶', objectTypeEnglish: 'Hu Vessel' };
  if (lower.includes('gui vessel') || (lower.includes('gui') && lower.includes('vessel'))) return { objectType: '簋', objectTypeEnglish: 'Gui Vessel' };
  if (lower.includes('ding vessel') || (lower.includes('ding') && lower.includes('vessel'))) return { objectType: '鼎', objectTypeEnglish: 'Ding Vessel' };
  if (lower.includes('lei vessel')) return { objectType: '罍', objectTypeEnglish: 'Lei Vessel' };
  if (lower.includes('yan vessel')) return { objectType: '甗', objectTypeEnglish: 'Yan Vessel' };
  if (lower.includes('dou vessel')) return { objectType: '豆', objectTypeEnglish: 'Dou Vessel' };
  if (lower.includes('zhi vessel')) return { objectType: '觯', objectTypeEnglish: 'Zhi Vessel' };
  if (lower.includes('jue vessel') || lower.includes('jue cup')) return { objectType: '爵', objectTypeEnglish: 'Jue Vessel' };
  if (lower.includes('gu vessel')) return { objectType: '觚', objectTypeEnglish: 'Gu Vessel' };
  if (lower.includes('gong vessel')) return { objectType: '觥', objectTypeEnglish: 'Gong Vessel' };
  
  // Other vessels
  if (lower.includes('wine pot') || lower.includes('wine ewer')) return { objectType: '酒壶', objectTypeEnglish: 'Wine Pot' };
  if (lower.includes('ewer')) return { objectType: '执壶', objectTypeEnglish: 'Ewer' };
  if (lower.includes('moon jar')) return { objectType: '月亮罐', objectTypeEnglish: 'Moon Jar' };
  if (lower.includes('guan jar')) return { objectType: '罐', objectTypeEnglish: 'Guan Jar' };
  if (lower.includes('saucer')) return { objectType: '碟', objectTypeEnglish: 'Saucer' };
  if (lower.includes('dish') || lower.includes('plate')) return { objectType: '盘', objectTypeEnglish: 'Dish/Plate' };
  if (lower.includes('jar')) return { objectType: '罐', objectTypeEnglish: 'Jar' };
  
  // Scholar's objects
  if (lower.includes('incense') || lower.includes('censer') || lower.includes('koro')) return { objectType: '香炉', objectTypeEnglish: 'Incense Burner' };
  if (lower.includes('kogo') || lower.includes('incense container') || lower.includes('incense box')) return { objectType: '香合', objectTypeEnglish: 'Kogo' };
  if (lower.includes('brush pot') || lower.includes('brush holder')) return { objectType: '笔筒', objectTypeEnglish: 'Brush Pot' };
  if (lower.includes('water dropper')) return { objectType: '水滴', objectTypeEnglish: 'Water Dropper' };
  if (lower.includes('brush washer')) return { objectType: '笔洗', objectTypeEnglish: 'Brush Washer' };
  if (lower.includes('brush rest')) return { objectType: '笔架', objectTypeEnglish: 'Brush Rest' };
  if (lower.includes('seal paste') || lower.includes('ink box')) return { objectType: '印泥盒', objectTypeEnglish: 'Seal Paste Box' };
  if (lower.includes('covered box') || lower.includes('cosmetic box')) return { objectType: '盖盒', objectTypeEnglish: 'Covered Box' };
  if (lower.includes('water coupe') || lower.includes('water pot')) return { objectType: '水丞', objectTypeEnglish: 'Water Coupe' };
  
  // Flower vessels
  if (lower.includes('flower') && lower.includes('container')) return { objectType: '花入', objectTypeEnglish: 'Flower Vase' };
  if (lower.includes('hanaire')) return { objectType: '花入', objectTypeEnglish: 'Hanaire' };
  
  // Figures
  if (lower.includes('figure') || lower.includes('figurine')) return { objectType: '人物', objectTypeEnglish: 'Figure' };
  if (lower.includes('buddha') || lower.includes('bodhisattva')) return { objectType: '佛像', objectTypeEnglish: 'Buddha Figure' };
  if (lower.includes('guanyin') || lower.includes('kannon')) return { objectType: '观音像', objectTypeEnglish: 'Guanyin Figure' };
  
  // Pillow
  if (lower.includes('pillow')) return { objectType: '瓷枕', objectTypeEnglish: 'Pillow' };
  
  // Snuff bottles
  if (lower.includes('snuff bottle')) return { objectType: '鼻烟壶', objectTypeEnglish: 'Snuff Bottle' };
  
  return { objectType: '器物', objectTypeEnglish: 'Object' };
}

async function searchVA(query: string, existingIds: Set<string>, existingHashes: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [V&A] 查询: "${query}"`);
  stats.va.queried++;
  
  const searchUrl = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&page_size=60&images_exist=true`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const records = searchData.records || [];
    
    if (records.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${records.length} 件，筛选中...`);
    
    let accepted = 0;
    for (const obj of records) {
      const systemNumber = obj.systemNumber;
      const artworkId = `va-${systemNumber}`;
      
      if (existingIds.has(artworkId)) continue;
      
      const imageBase = obj._images?._iiif_image_base_url;
      if (!imageBase) continue;
      
      try {
        const imageUrl = `${imageBase}/full/!1400,1400/0/default.jpg`;
        
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.va.rejected_lowres++;
          continue;
        }
        
        const dateStr = obj._primaryDate || '';
        const placeStr = obj._primaryPlace || '';
        const { dynasty, dynastyEnglish } = parseDynasty(dateStr, placeStr);
        const { material, materialEnglish } = parseMaterial(obj._primaryMaker?.name || obj.objectType || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj._primaryTitle || '', obj.objectType || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: obj._primaryTitle || '',
          dynasty,
          dynastyEnglish,
          period: placeStr,
          date: dateStr,
          material,
          materialEnglish: obj.objectType || materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: '',
          description: `此件${objectType}为${dynasty}时期之作品。现藏于维多利亚和阿尔伯特博物馆。`,
          sourceMuseum: '维多利亚和阿尔伯特博物馆',
          sourceMuseumEnglish: 'Victoria and Albert Museum',
          accessionNumber: obj.accessionNumber || systemNumber,
          sourceUrl: `https://collections.vam.ac.uk/item/${systemNumber}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${obj._primaryTitle} - ${dateStr}`,
          license: 'Open License (V&A)',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.va.accepted++;
        console.log(`    + ${artworkId}: ${obj._primaryTitle?.substring(0, 50)}`);
        
        if (accepted >= 15) break;
        
        await new Promise(r => setTimeout(r, 300));
      } catch {
        stats.va.rejected_other++;
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

async function searchSmithsonian(query: string, existingIds: Set<string>, existingHashes: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  if (!SMITHSONIAN_API_KEY) {
    return results;
  }
  
  console.log(`  [Smithsonian] 查询: "${query}"`);
  stats.smithsonian.queried++;
  const searchUrl = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&api_key=${SMITHSONIAN_API_KEY}&rows=80&online_media_type=images`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    const rows = searchData.response?.rows || [];
    
    if (rows.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${rows.length} 件，筛选中...`);
    
    let accepted = 0;
    for (const item of rows) {
      const recordId = item.content?.descriptiveNonRepeating?.record_ID || '';
      const artworkId = `si-${recordId.replace(/_/g, '-')}`;
      
      if (existingIds.has(artworkId)) continue;
      
      const metadataAccess = item.content?.descriptiveNonRepeating?.metadata_usage?.access;
      if (metadataAccess !== 'CC0') continue;
      
      const onlineMedia = item.content?.descriptiveNonRepeating?.online_media;
      if (!onlineMedia || onlineMedia.mediaCount === 0) continue;
      
      const hasCC0Media = onlineMedia.media.some((m: any) => m.usage?.access === 'CC0');
      if (!hasCC0Media) continue;
      
      const unit = item.unitCode;
      const isAsianArt = unit === 'NMAA' || unit === 'FSG' || recordId.startsWith('fsg_') || recordId.startsWith('sg_');
      if (!isAsianArt) continue;
      
      try {
        const mediaItem = onlineMedia.media[0];
        const idsId = mediaItem.idsId;
        if (!idsId) continue;
        
        const imageUrl = `https://ids.si.edu/ids/deliveryService?id=${idsId}`;
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.smithsonian.rejected_lowres++;
          continue;
        }
        
        const freetext = item.content?.freetext || {};
        const indexed = item.content?.indexedStructured || {};
        const dnr = item.content?.descriptiveNonRepeating || {};
        
        const dateField = freetext.date?.map((d: any) => d.content).join('; ') || '';
        const places = (indexed.place as string[]) || [];
        const cultures = (indexed.culture as string[]) || [];
        const physDesc = freetext.physicalDescription?.map((p: any) => p.content).join('; ') || '';
        
        const { dynasty, dynastyEnglish } = parseDynasty(dateField, cultures.join(' ') + ' ' + places.join(' '));
        const { material, materialEnglish } = parseMaterial(physDesc);
        const { objectType, objectTypeEnglish } = parseObjectType(item.title || '', '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: item.title || '',
          dynasty,
          dynastyEnglish,
          period: dateField,
          date: dateField,
          material,
          materialEnglish: physDesc.split(';')[0] || materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: '',
          description: `此件${objectType}为${dynasty}时期之作品。现藏于史密森尼亚洲艺术博物馆。`,
          sourceMuseum: '史密森尼亚洲艺术博物馆',
          sourceMuseumEnglish: 'Smithsonian National Museum of Asian Art',
          accessionNumber: recordId,
          sourceUrl: dnr.record_link || `https://asia.si.edu/object/${recordId}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${item.title} - ${dateField}`,
          license: 'CC0 / Public Domain (Smithsonian Open Access)',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.smithsonian.accepted++;
        console.log(`    + ${artworkId}: ${item.title?.substring(0, 50)}`);
        
        if (accepted >= 15) break;
        
        await new Promise(r => setTimeout(r, 300));
      } catch {
        stats.smithsonian.rejected_other++;
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

async function searchWikimediaCategory(category: string, existingIds: Set<string>, existingHashes: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  const categoryName = category.replace('Category:', '');
  console.log(`  [Wikimedia] 分类: "${categoryName}"`);
  stats.wikimedia.queried++;
  
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmtype=file&cmlimit=60&format=json`;
  
  try {
    const data = await fetchJson(apiUrl);
    const members = data.query?.categorymembers || [];
    
    if (members.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${members.length} 个文件，筛选中...`);
    
    let accepted = 0;
    for (const member of members) {
      const pageTitle = member.title;
      if (!pageTitle.match(/\.(jpg|jpeg|png)$/i)) continue;
      
      const pageId = member.pageid;
      const artworkId = `wmc-${pageId}`;
      
      if (existingIds.has(artworkId)) continue;
      
      try {
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=2000&format=json`;
        const infoData = await fetchJson(infoUrl);
        const pages = infoData.query?.pages || {};
        const page = Object.values(pages)[0] as any;
        const imageInfo = page?.imageinfo?.[0];
        
        if (!imageInfo) continue;
        
        const extMeta = imageInfo.extmetadata || {};
        const license = extMeta.LicenseShortName?.value || '';
        const isOpenLicense = license.toLowerCase().includes('cc0') || 
                             license.toLowerCase().includes('public domain') ||
                             license.toLowerCase().includes('pd') ||
                             license.toLowerCase().includes('cc-by-sa') ||
                             license.toLowerCase().includes('cc by');
        
        if (!isOpenLicense) continue;
        
        const imageUrl = imageInfo.thumburl || imageInfo.url;
        if (!imageUrl) continue;
        
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.wikimedia.rejected_lowres++;
          continue;
        }
        
        const desc = extMeta.ImageDescription?.value || '';
        const dateStr = extMeta.DateTimeOriginal?.value || extMeta.DateTime?.value || '';
        const source = extMeta.Credit?.value || '';
        
        const { dynasty, dynastyEnglish } = parseDynasty(dateStr, categoryName + ' ' + desc);
        const { material, materialEnglish } = parseMaterial(categoryName + ' ' + desc);
        const { objectType, objectTypeEnglish } = parseObjectType(pageTitle, categoryName);
        
        const cleanTitle = pageTitle.replace('File:', '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: cleanTitle,
          dynasty,
          dynastyEnglish,
          period: '',
          date: dateStr,
          material,
          materialEnglish,
          objectType,
          objectTypeEnglish,
          dimensions: '',
          description: `此件${objectType}为${dynasty}时期之作品。图片来源：维基共享资源。`,
          sourceMuseum: '维基共享资源',
          sourceMuseumEnglish: 'Wikimedia Commons',
          accessionNumber: pageTitle,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(pageTitle)}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: cleanTitle,
          license: license || 'Open License',
          creditLine: source.replace(/<[^>]*>/g, '').substring(0, 200),
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.wikimedia.accepted++;
        console.log(`    + ${artworkId}: ${cleanTitle.substring(0, 50)}`);
        
        if (accepted >= 12) break;
        
        await new Promise(r => setTimeout(r, 300));
      } catch {
        stats.wikimedia.rejected_other++;
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

async function searchMet(query: string, existingIds: Set<string>, existingHashes: Set<string>): Promise<Artwork[]> {
  const results: Artwork[] = [];
  
  console.log(`  [Met] 查询: "${query}"`);
  stats.met.queried++;
  const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(query)}`;
  
  try {
    const searchData = await fetchJson(searchUrl);
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      console.log(`    结果: 0 件`);
      return results;
    }
    
    console.log(`    找到: ${searchData.objectIDs.length} 件，筛选中...`);
    const idsToCheck = searchData.objectIDs.slice(0, 100);
    
    let accepted = 0;
    for (const id of idsToCheck) {
      const artworkId = `met-${id}`;
      if (existingIds.has(artworkId)) continue;
      
      try {
        const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
        const obj = await fetchJson(objUrl);
        
        const searchText = `${obj.title} ${obj.objectName} ${obj.medium} ${obj.culture} ${obj.department}`.toLowerCase();
        const isRelevant = 
          searchText.includes('tea') ||
          searchText.includes('cup') ||
          searchText.includes('bowl') ||
          searchText.includes('saucer') ||
          searchText.includes('teapot') ||
          searchText.includes('ewer') ||
          searchText.includes('caddy') ||
          searchText.includes('ceramics') ||
          searchText.includes('porcelain') ||
          searchText.includes('stoneware') ||
          searchText.includes('pottery') ||
          searchText.includes('china') ||
          searchText.includes('chinese') ||
          searchText.includes('japan') ||
          searchText.includes('korea') ||
          searchText.includes('asian') ||
          searchText.includes('enamel') ||
          searchText.includes('glaze') ||
          searchText.includes('vase') ||
          searchText.includes('jar') ||
          searchText.includes('dish') ||
          searchText.includes('plate') ||
          searchText.includes('incense') ||
          searchText.includes('censer') ||
          searchText.includes('cloisonne') ||
          searchText.includes('snuff');
        
        if (!isRelevant) continue;
        
        const imageUrl = obj.primaryImage || obj.primaryImageSmall;
        if (!imageUrl) continue;
        
        const imageData = await fetchWithRetry(imageUrl);
        if (!isValidImage(imageData)) continue;
        
        const hash = hashBuffer(imageData);
        if (existingHashes.has(hash)) continue;
        
        const finalPath = path.join(IMAGES_DIR, `${artworkId}.jpg`);
        const compressed = await compressImage(imageData, finalPath);
        if (!compressed) {
          stats.met.rejected_lowres++;
          continue;
        }
        
        const { dynasty, dynastyEnglish } = parseDynasty(obj.objectDate || '', obj.culture || '');
        const { material, materialEnglish } = parseMaterial(obj.medium || '');
        const { objectType, objectTypeEnglish } = parseObjectType(obj.title || '', obj.objectName || '');
        
        const artwork: Artwork = {
          id: artworkId,
          titleChinese: `${dynasty}${material}${objectType}`,
          titleEnglish: obj.title || '',
          dynasty,
          dynastyEnglish,
          period: obj.period || obj.dynasty || '',
          date: obj.objectDate || '',
          material,
          materialEnglish: obj.medium || '',
          objectType,
          objectTypeEnglish,
          dimensions: obj.dimensions || '',
          description: `此件${objectType}为${dynasty}时期之作品。${obj.dimensions ? `尺寸：${obj.dimensions}。` : ''}现藏于大都会艺术博物馆。`,
          sourceMuseum: '大都会艺术博物馆',
          sourceMuseumEnglish: 'The Metropolitan Museum of Art',
          accessionNumber: obj.accessionNumber || '',
          sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${id}`,
          imageUrl: `/artworks/${artworkId}.jpg`,
          imageAlt: `${obj.title} - ${obj.objectDate || ''}`,
          license: 'CC0 / Public Domain',
          creditLine: obj.creditLine || '',
          crawlBatchId: BATCH_ID,
        };
        
        results.push(artwork);
        existingIds.add(artworkId);
        existingHashes.add(hash);
        accepted++;
        stats.met.accepted++;
        console.log(`    + ${artworkId}: ${obj.title?.substring(0, 50)}`);
        
        if (accepted >= 12) break;
        
        await new Promise(r => setTimeout(r, 200));
      } catch {
        stats.met.rejected_other++;
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
  console.log('Round 20 茶器收藏扩展 - 2026-09-27');
  console.log(`批次ID: ${BATCH_ID}`);
  console.log('目标: +800 to +1,500 件高质量茶器');
  console.log('========================================\n');
  
  const existingIds = loadExistingIds();
  const existingHashes = loadExistingHashes();
  const completedQueries = loadCompletedQueries();
  
  const startingCount = existingIds.size;
  console.log(`现有藏品: ${startingCount} 件`);
  console.log(`已完成查询: ${completedQueries.size} 个`);
  console.log(`Smithsonian API Key: ${SMITHSONIAN_API_KEY ? '✓ 已配置' : '✗ 未配置'}`);
  console.log(`跳过来源: AIC IIIF (Cloudflare 403), CMA (~900px 低分辨率)`);
  console.log(`许可证跳过: Harvard (CC-BY-NC)\n`);
  
  const newArtworks: Artwork[] = [];
  const TARGET = 1200;
  
  // === V&A MUSEUM (Priority 1 - key-free, underused, high-res) ===
  console.log('=== 维多利亚和阿尔伯特博物馆查询 (优先) ===');
  for (const query of VA_QUERIES_R20) {
    if (completedQueries.has(`va:${query}`)) continue;
    
    const results = await searchVA(query, existingIds, existingHashes);
    newArtworks.push(...results);
    
    logCrawl({
      source: 'va',
      query,
      totalResults: results.length,
      idsAccepted: results.length,
      crawlBatchId: BATCH_ID,
    });
    
    await new Promise(r => setTimeout(r, 400));
    
    if (newArtworks.length >= TARGET) break;
  }
  
  // === SMITHSONIAN (Priority 2 - with API key) ===
  if (newArtworks.length < TARGET && SMITHSONIAN_API_KEY) {
    console.log('\n=== 史密森尼博物馆查询 ===');
    for (const query of SMITHSONIAN_QUERIES_R20) {
      if (completedQueries.has(`smithsonian:${query}`)) continue;
      
      const results = await searchSmithsonian(query, existingIds, existingHashes);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'smithsonian',
        query,
        totalResults: results.length,
        idsAccepted: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 400));
      
      if (newArtworks.length >= TARGET) break;
    }
  }
  
  // === WIKIMEDIA COMMONS (Priority 3) ===
  if (newArtworks.length < TARGET) {
    console.log('\n=== 维基共享资源查询 ===');
    for (const category of WIKIMEDIA_CATEGORIES_R20) {
      if (completedQueries.has(`wikimedia:${category}`)) continue;
      
      const results = await searchWikimediaCategory(category, existingIds, existingHashes);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'wikimedia',
        query: category,
        totalResults: results.length,
        idsAccepted: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      if (newArtworks.length >= TARGET) break;
    }
  }
  
  // === MET MUSEUM (Priority 4 - filling gaps) ===
  if (newArtworks.length < TARGET) {
    console.log('\n=== 大都会博物馆查询 (补充) ===');
    for (const query of MET_QUERIES_R20) {
      if (completedQueries.has(`met:${query}`)) continue;
      
      const results = await searchMet(query, existingIds, existingHashes);
      newArtworks.push(...results);
      
      logCrawl({
        source: 'met',
        query,
        totalResults: results.length,
        idsAccepted: results.length,
        crawlBatchId: BATCH_ID,
      });
      
      await new Promise(r => setTimeout(r, 400));
      
      if (newArtworks.length >= TARGET) break;
    }
  }
  
  console.log('\n========================================');
  console.log('扩展统计');
  console.log('========================================');
  console.log(`总计新增: ${newArtworks.length} 件`);
  console.log(`起始数量: ${startingCount}`);
  console.log(`结束数量: ${startingCount + newArtworks.length}`);
  console.log(`距离10,000目标: ${10000 - (startingCount + newArtworks.length)} 件\n`);
  
  console.log('=== 来源分布 ===');
  const vaCount = newArtworks.filter(a => a.id.startsWith('va-')).length;
  const siCount = newArtworks.filter(a => a.id.startsWith('si-')).length;
  const wmcCount = newArtworks.filter(a => a.id.startsWith('wmc-')).length;
  const metCount = newArtworks.filter(a => a.id.startsWith('met-')).length;
  console.log(`  维多利亚和阿尔伯特博物馆 (V&A): ${vaCount}`);
  console.log(`  史密森尼博物馆: ${siCount}`);
  console.log(`  维基共享资源: ${wmcCount}`);
  console.log(`  大都会博物馆 (Met): ${metCount}`);
  
  console.log('\n=== 质量门槛统计 ===');
  console.log(`  V&A - 查询${stats.va.queried}次, 接受${stats.va.accepted}, 低分辨率拒绝${stats.va.rejected_lowres}`);
  console.log(`  Smithsonian - 查询${stats.smithsonian.queried}次, 接受${stats.smithsonian.accepted}, 低分辨率拒绝${stats.smithsonian.rejected_lowres}`);
  console.log(`  Wikimedia - 查询${stats.wikimedia.queried}次, 接受${stats.wikimedia.accepted}, 低分辨率拒绝${stats.wikimedia.rejected_lowres}`);
  console.log(`  Met - 查询${stats.met.queried}次, 接受${stats.met.accepted}, 低分辨率拒绝${stats.met.rejected_lowres}`);
  
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
  
  // Log summary
  logCrawl({
    source: 'round20-summary',
    query: 'Round 20 Expansion Complete',
    totalResults: newArtworks.length,
    idsAccepted: newArtworks.length,
    crawlBatchId: 'round20-summary',
    breakdown: { va: vaCount, smithsonian: siCount, wikimedia: wmcCount, met: metCount },
    note: `Round 20 expansion: ${startingCount} → ${mergedArtworks.length} (+${newArtworks.length}). Target: 10,000. Remaining: ${10000 - mergedArtworks.length}.`,
    keysNeeded: ['RIJKSMUSEUM_API_KEY', 'NPM_TAIWAN_API_KEY'],
    keysSkipped: ['HARVARD_API_KEY (CC-BY-NC license)', 'AIC IIIF (Cloudflare 403)', 'CMA (~900px)'],
  });
  
  console.log('\n========================================');
  console.log('仍需要的 API Keys (未来扩展):');
  console.log('  - RIJKSMUSEUM_API_KEY (荷兰国立博物馆)');
  console.log('  - NPM_TAIWAN_API_KEY (台北故宫博物院)');
  console.log('跳过的来源:');
  console.log('  - HARVARD_API_KEY (CC-BY-NC 非开放许可)');
  console.log('  - AIC IIIF (Cloudflare 403 错误)');
  console.log('  - CMA (~900px 通常不满足质量门槛)');
  console.log('========================================');
}

main().catch(console.error);
