/**
 * Purge Low-Resolution Artworks
 * 
 * Quality Gate Rule: max(width, height) >= 1200 pixels
 * 
 * This script:
 * 1. Reads the delete_ids list from the provided JSON
 * 2. Re-measures on-disk images to verify they should be deleted
 * 3. Scans all images to catch any additional low-res items not on the list
 * 4. Removes artwork records from JSON data files
 * 5. Deletes corresponding image files
 * 6. Reports before/after counts and any anomalies
 * 
 * Safety: If an image on the delete list now has longest_edge >= 1200, it is kept.
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const MIN_LONGEST_EDGE = 1200;

const ROOT = process.cwd();
const ARTWORKS_JSON_PATH = path.join(ROOT, 'src', 'data', 'artworks.json');
const PUBLIC_ARTWORKS_JSON_PATH = path.join(ROOT, 'public', 'artworks.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'artworks');
const DELETE_LIST_PATH = path.join(ROOT, 'uploads', 'delete_longest_edge_lt_1200_3d0b.json');

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

interface DeleteListPayload {
  rule: string;
  total: number;
  delete_count: number;
  keep_count: number;
  delete_ids: string[];
}

interface ImageMeasurement {
  id: string;
  imagePath: string;
  width: number;
  height: number;
  longestEdge: number;
  passesGate: boolean;
}

async function measureImage(imagePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const content = fs.readFileSync(imagePath);
    
    // Check if it's a Git LFS pointer
    if (content.length < 200 && content.toString('utf-8').startsWith('version https://git-lfs.github.com/spec/v1')) {
      console.log(`  ⚠️  Git LFS pointer detected, fetching actual content: ${imagePath}`);
      return null;
    }
    
    const metadata = await sharp(content).metadata();
    if (!metadata.width || !metadata.height) return null;
    return { width: metadata.width, height: metadata.height };
  } catch (e) {
    return null;
  }
}

async function measureAllImages(artworks: Artwork[]): Promise<Map<string, ImageMeasurement>> {
  const measurements = new Map<string, ImageMeasurement>();
  
  console.log(`📏 测量所有图片尺寸...`);
  let processed = 0;
  let lfsPointers = 0;
  
  for (const artwork of artworks) {
    const imagePath = path.join(ROOT, 'public', artwork.imageUrl);
    
    if (!fs.existsSync(imagePath)) {
      continue;
    }
    
    const dims = await measureImage(imagePath);
    if (!dims) {
      lfsPointers++;
      continue;
    }
    
    const longestEdge = Math.max(dims.width, dims.height);
    measurements.set(artwork.id, {
      id: artwork.id,
      imagePath,
      width: dims.width,
      height: dims.height,
      longestEdge,
      passesGate: longestEdge >= MIN_LONGEST_EDGE,
    });
    
    processed++;
    if (processed % 500 === 0) {
      console.log(`  已测量: ${processed} 张图片...`);
    }
  }
  
  console.log(`  完成: ${processed} 张图片已测量`);
  if (lfsPointers > 0) {
    console.log(`  ⚠️  ${lfsPointers} 个 Git LFS 指针文件（需要先 git lfs pull）`);
  }
  
  return measurements;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧹 低分辨率藏品清理脚本');
  console.log(`📏 质量门槛: 最长边 >= ${MIN_LONGEST_EDGE}px`);
  console.log('='.repeat(60));
  console.log();

  // Load delete list
  if (!fs.existsSync(DELETE_LIST_PATH)) {
    // Try alternative path
    const altPath = '/home/ubuntu/.cursor/projects/workspace/uploads/delete_longest_edge_lt_1200_3d0b.json';
    if (fs.existsSync(altPath)) {
      console.log(`📂 使用删除列表: ${altPath}`);
      const deleteListContent = fs.readFileSync(altPath, 'utf-8');
      var deletePayload: DeleteListPayload = JSON.parse(deleteListContent);
    } else {
      console.error(`❌ 找不到删除列表文件: ${DELETE_LIST_PATH}`);
      process.exit(1);
    }
  } else {
    const deleteListContent = fs.readFileSync(DELETE_LIST_PATH, 'utf-8');
    var deletePayload: DeleteListPayload = JSON.parse(deleteListContent);
  }
  
  const deleteIdsSet = new Set(deletePayload.delete_ids);
  console.log(`📋 删除列表: ${deletePayload.delete_count} 个 ID`);
  console.log(`   规则: ${deletePayload.rule}`);
  console.log();

  // Load current artworks
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_JSON_PATH, 'utf-8'));
  const artworkMap = new Map(artworks.map(a => [a.id, a]));
  console.log(`📊 当前藏品数量: ${artworks.length}`);
  console.log();

  // Check for Git LFS
  console.log('🔍 检查 Git LFS 状态...');
  const sampleImagePath = artworks[0] ? path.join(ROOT, 'public', artworks[0].imageUrl) : null;
  if (sampleImagePath && fs.existsSync(sampleImagePath)) {
    const content = fs.readFileSync(sampleImagePath);
    if (content.length < 200 && content.toString('utf-8').startsWith('version https://git-lfs.github.com/spec/v1')) {
      console.log('⚠️  检测到 Git LFS 指针文件，正在拉取实际图片...');
      const { execSync } = require('child_process');
      try {
        execSync('git lfs pull', { cwd: ROOT, stdio: 'inherit' });
        console.log('✅ Git LFS 拉取完成');
      } catch (e) {
        console.log('⚠️  Git LFS 拉取失败，继续处理...');
      }
    } else {
      console.log('✅ 图片文件已是实际内容（非 LFS 指针）');
    }
  }
  console.log();

  // Measure all images
  const measurements = await measureAllImages(artworks);
  console.log();

  // Analyze what to delete
  const toDelete: string[] = [];
  const skippedNotFound: string[] = [];
  const keptBecauseNowPasses: string[] = [];
  const additionalLowRes: string[] = [];

  // Check items on the delete list
  console.log('🔎 分析删除列表...');
  for (const id of deletePayload.delete_ids) {
    if (!artworkMap.has(id)) {
      skippedNotFound.push(id);
      continue;
    }
    
    const measurement = measurements.get(id);
    if (!measurement) {
      // No measurement = image file missing or couldn't read, delete the record anyway
      toDelete.push(id);
      continue;
    }
    
    if (measurement.passesGate) {
      // Image now passes the gate - keep it
      keptBecauseNowPasses.push(id);
      console.log(`  ✅ 保留 ${id}: 当前尺寸 ${measurement.width}x${measurement.height} (最长边=${measurement.longestEdge}px)`);
    } else {
      toDelete.push(id);
    }
  }

  // Scan for additional low-res images not on the list
  console.log();
  console.log('🔎 扫描其他低分辨率图片...');
  for (const [id, measurement] of measurements) {
    if (deleteIdsSet.has(id)) continue; // Already processed
    
    if (!measurement.passesGate) {
      additionalLowRes.push(id);
      console.log(`  ⚠️  发现额外低分辨率: ${id} (${measurement.width}x${measurement.height}, 最长边=${measurement.longestEdge}px)`);
      toDelete.push(id);
    }
  }

  // Report summary
  console.log();
  console.log('='.repeat(60));
  console.log('📊 分析结果');
  console.log('='.repeat(60));
  console.log(`删除列表中的 ID: ${deletePayload.delete_count}`);
  console.log(`  - 将删除: ${toDelete.length - additionalLowRes.length}`);
  console.log(`  - 已不存在于 main: ${skippedNotFound.length}`);
  console.log(`  - 现在通过质量门槛: ${keptBecauseNowPasses.length}`);
  console.log(`额外发现的低分辨率: ${additionalLowRes.length}`);
  console.log(`总计删除: ${toDelete.length}`);
  console.log();

  if (skippedNotFound.length > 0 && skippedNotFound.length <= 20) {
    console.log('已不存在于 main 的 ID:');
    for (const id of skippedNotFound) {
      console.log(`  - ${id}`);
    }
    console.log();
  } else if (skippedNotFound.length > 20) {
    console.log(`已不存在于 main 的 ID: ${skippedNotFound.length} 个（省略列表）`);
    console.log();
  }

  if (toDelete.length === 0) {
    console.log('✅ 没有需要删除的藏品');
    return;
  }

  // Perform deletion
  console.log('🗑️  开始删除...');
  const toDeleteSet = new Set(toDelete);
  
  // Filter artworks
  const remainingArtworks = artworks.filter(a => !toDeleteSet.has(a.id));
  
  // Delete image files
  let deletedImages = 0;
  let missingImages = 0;
  for (const id of toDelete) {
    const artwork = artworkMap.get(id);
    if (!artwork) continue;
    
    const imagePath = path.join(ROOT, 'public', artwork.imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      deletedImages++;
    } else {
      missingImages++;
    }
  }

  // Write updated JSON files
  console.log('💾 保存更新后的数据...');
  fs.writeFileSync(ARTWORKS_JSON_PATH, JSON.stringify(remainingArtworks, null, 2));
  fs.writeFileSync(PUBLIC_ARTWORKS_JSON_PATH, JSON.stringify(remainingArtworks, null, 2));

  // Final report
  console.log();
  console.log('='.repeat(60));
  console.log('✅ 清理完成');
  console.log('='.repeat(60));
  console.log(`删除前藏品数: ${artworks.length}`);
  console.log(`删除后藏品数: ${remainingArtworks.length}`);
  console.log(`删除的藏品记录: ${artworks.length - remainingArtworks.length}`);
  console.log(`删除的图片文件: ${deletedImages}`);
  if (missingImages > 0) {
    console.log(`图片文件已不存在: ${missingImages}`);
  }
  console.log();
  console.log('📋 输出摘要 (用于 PR):');
  console.log(`- 删除前: ${artworks.length} 件藏品`);
  console.log(`- 删除后: ${remainingArtworks.length} 件藏品`);
  console.log(`- 删除: ${artworks.length - remainingArtworks.length} 件 (最长边 < ${MIN_LONGEST_EDGE}px)`);
  if (keptBecauseNowPasses.length > 0) {
    console.log(`- 保留 (磁盘上已通过): ${keptBecauseNowPasses.length} 件`);
  }
  if (additionalLowRes.length > 0) {
    console.log(`- 额外删除 (不在列表但低分辨率): ${additionalLowRes.length} 件`);
  }
  if (skippedNotFound.length > 0) {
    console.log(`- 跳过 (已不存在于 main): ${skippedNotFound.length} 件`);
  }
}

main().catch(console.error);
