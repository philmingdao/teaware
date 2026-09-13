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

const ARTWORKS_JSON_PATH = path.join(process.cwd(), 'src', 'data', 'artworks.json');
const BACKUP_PATH = path.join(process.cwd(), 'src', 'data', 'artworks-full-backup.json');

async function testUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const artworks = artworksData as Artwork[];
  
  console.log('=== 图片可用性筛选 ===\n');
  console.log(`原始藏品数: ${artworks.length}`);
  
  // Backup original data
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(artworks, null, 2));
    console.log(`✓ 已备份原始数据到 ${BACKUP_PATH}\n`);
  }
  
  // Count by museum
  const byMuseum: Record<string, number> = {};
  artworks.forEach(a => {
    byMuseum[a.sourceMuseum] = (byMuseum[a.sourceMuseum] || 0) + 1;
  });
  
  console.log('按博物馆统计:');
  Object.entries(byMuseum).forEach(([museum, count]) => {
    console.log(`  ${museum}: ${count}`);
  });
  
  // Test a sample from AIC to confirm they're blocked
  const aicSample = artworks.filter(a => a.sourceMuseum === '芝加哥艺术博物馆').slice(0, 5);
  console.log('\n测试 AIC 图片样本...');
  
  let aicWorking = 0;
  for (const artwork of aicSample) {
    const works = await testUrl(artwork.imageUrl);
    if (works) aicWorking++;
    console.log(`  ${artwork.id}: ${works ? '✓' : '✗'}`);
  }
  
  console.log(`\nAIC 样本结果: ${aicWorking}/5 可用`);
  
  if (aicWorking === 0) {
    console.log('\n⚠ AIC 图片全部被阻止，将从数据集中移除...');
    
    // Filter out AIC artworks
    const filteredArtworks = artworks.filter(a => a.sourceMuseum !== '芝加哥艺术博物馆');
    
    console.log(`\n筛选后藏品数: ${filteredArtworks.length}`);
    console.log(`移除: ${artworks.length - filteredArtworks.length} 件 AIC 藏品`);
    
    // Test samples from remaining museums
    console.log('\n验证剩余图片...');
    
    const metSample = filteredArtworks.filter(a => a.sourceMuseum === '大都会艺术博物馆').slice(0, 10);
    const cmaSample = filteredArtworks.filter(a => a.sourceMuseum === '克利夫兰艺术博物馆').slice(0, 10);
    
    let metWorking = 0;
    let cmaWorking = 0;
    
    for (const artwork of metSample) {
      const works = await testUrl(artwork.imageUrl);
      if (works) metWorking++;
    }
    
    for (const artwork of cmaSample) {
      const works = await testUrl(artwork.imageUrl);
      if (works) cmaWorking++;
    }
    
    console.log(`  大都会艺术博物馆: ${metWorking}/10 可用`);
    console.log(`  克利夫兰艺术博物馆: ${cmaWorking}/10 可用`);
    
    // Save filtered data
    fs.writeFileSync(ARTWORKS_JSON_PATH, JSON.stringify(filteredArtworks, null, 2));
    console.log(`\n✓ 已保存筛选后的数据`);
    
    // Final counts
    const finalByMuseum: Record<string, number> = {};
    filteredArtworks.forEach(a => {
      finalByMuseum[a.sourceMuseum] = (finalByMuseum[a.sourceMuseum] || 0) + 1;
    });
    
    console.log('\n=== 最终统计 ===');
    console.log(`总藏品数: ${filteredArtworks.length}`);
    Object.entries(finalByMuseum).forEach(([museum, count]) => {
      console.log(`  ${museum}: ${count}`);
    });
    
    console.log('\n注意: AIC 藏品已备份到 artworks-full-backup.json');
    console.log('如需恢复，可从备份文件还原。');
  } else {
    console.log('\n✓ AIC 图片部分可用，保留数据不变');
  }
}

main().catch(console.error);
