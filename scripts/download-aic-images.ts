import * as fs from 'fs';
import * as path from 'path';
import artworksData from '../src/data/artworks.json';

interface Artwork {
  id: string;
  titleChinese: string;
  imageUrl: string;
  sourceMuseum: string;
  [key: string]: unknown;
}

const ARTWORKS_DIR = path.join(process.cwd(), 'public', 'artworks');
const ARTWORKS_JSON_PATH = path.join(process.cwd(), 'src', 'data', 'artworks.json');
const CONCURRENT_DOWNLOADS = 10;
const RETRY_ATTEMPTS = 3;
const TIMEOUT_MS = 30000;

async function downloadImage(url: string, destPath: string, retries = RETRY_ATTEMPTS): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.artic.edu/',
        }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        console.log(`  Attempt ${attempt}: HTTP ${response.status} for ${url}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        return false;
      }
      
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      return true;
    } catch (err) {
      const error = err as Error;
      console.log(`  Attempt ${attempt}: ${error.message}`);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
  return false;
}

async function downloadFromAPI(artworkId: string, destPath: string): Promise<boolean> {
  const numericId = artworkId.replace('aic-', '');
  const apiUrl = `https://api.artic.edu/api/v1/artworks/${numericId}?fields=id,image_id`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return false;
    
    const data = await response.json();
    const imageId = data.data?.image_id;
    if (!imageId) return false;
    
    const iiifUrl = `https://www.artic.edu/iiif/2/${imageId}/full/1686,/0/default.jpg`;
    return await downloadImage(iiifUrl, destPath);
  } catch {
    return false;
  }
}

async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, idx) => processor(item, i + idx))
    );
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return results;
}

async function main() {
  console.log('=== AIC 图片下载脚本 ===\n');
  
  if (!fs.existsSync(ARTWORKS_DIR)) {
    fs.mkdirSync(ARTWORKS_DIR, { recursive: true });
    console.log(`Created directory: ${ARTWORKS_DIR}\n`);
  }
  
  const artworks = artworksData as Artwork[];
  const aicArtworks = artworks.filter(a => a.sourceMuseum === '芝加哥艺术博物馆');
  
  console.log(`Total artworks: ${artworks.length}`);
  console.log(`AIC artworks to download: ${aicArtworks.length}\n`);
  
  let downloaded = 0;
  let failed = 0;
  const failedIds: string[] = [];
  
  const results = await processInBatches(aicArtworks, CONCURRENT_DOWNLOADS, async (artwork, index) => {
    const filename = `${artwork.id}.jpg`;
    const destPath = path.join(ARTWORKS_DIR, filename);
    
    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      if (stats.size > 1000) {
        console.log(`[${index + 1}/${aicArtworks.length}] ${artwork.id}: Already exists (${(stats.size / 1024).toFixed(1)}KB)`);
        return { success: true, id: artwork.id };
      }
    }
    
    console.log(`[${index + 1}/${aicArtworks.length}] ${artwork.id}: Downloading...`);
    
    let success = await downloadImage(artwork.imageUrl, destPath);
    
    if (!success) {
      console.log(`  Trying API fallback for ${artwork.id}...`);
      success = await downloadFromAPI(artwork.id, destPath);
    }
    
    if (success) {
      const stats = fs.statSync(destPath);
      console.log(`  ✓ Downloaded (${(stats.size / 1024).toFixed(1)}KB)`);
    } else {
      console.log(`  ✗ Failed`);
    }
    
    return { success, id: artwork.id };
  });
  
  results.forEach(r => {
    if (r.success) downloaded++;
    else {
      failed++;
      failedIds.push(r.id);
    }
  });
  
  console.log('\n=== 下载完成 ===');
  console.log(`成功: ${downloaded}/${aicArtworks.length}`);
  console.log(`失败: ${failed}/${aicArtworks.length}`);
  
  if (failedIds.length > 0) {
    console.log('\n失败的 ID:');
    failedIds.forEach(id => console.log(`  - ${id}`));
  }
  
  console.log('\n正在更新 artworks.json...');
  
  const updatedArtworks = artworks.map(artwork => {
    if (artwork.sourceMuseum === '芝加哥艺术博物馆') {
      const localPath = `/teaware/artworks/${artwork.id}.jpg`;
      const fullPath = path.join(ARTWORKS_DIR, `${artwork.id}.jpg`);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.size > 1000) {
          return { ...artwork, imageUrl: localPath };
        }
      }
    }
    return artwork;
  });
  
  fs.writeFileSync(ARTWORKS_JSON_PATH, JSON.stringify(updatedArtworks, null, 2));
  console.log('✓ artworks.json 已更新\n');
  
  const localCount = updatedArtworks.filter(a => a.imageUrl.startsWith('/teaware/')).length;
  console.log(`本地图片路径: ${localCount} 个`);
  console.log(`远程图片路径: ${artworks.length - localCount} 个`);
}

main().catch(console.error);
