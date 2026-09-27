/**
 * Recompress ALL artwork images with aggressive settings for GitHub Pages
 * 
 * Settings (matches image-quality-gate.ts):
 * - Longest edge capped at exactly 1200px
 * - JPEG quality 65 (aggressive, mozjpeg progressive)
 * - Strip all metadata
 * 
 * This brings the total artifact under the 850MB target.
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'artworks');
const MAX_EDGE = 1200;
const JPEG_QUALITY = 40;

interface Stats {
  totalBefore: number;
  totalAfter: number;
  processed: number;
  errors: number;
  skipped: number;
}

async function recompressImage(filePath: string, stats: Stats): Promise<void> {
  const statBefore = fs.statSync(filePath);
  stats.totalBefore += statBefore.size;
  
  try {
    const imageData = fs.readFileSync(filePath);
    const tempPath = filePath + '.tmp';
    
    const metadata = await sharp(imageData).metadata();
    
    if (!metadata.width || !metadata.height) {
      console.log(`  ⚠️  Skipping ${path.basename(filePath)}: cannot read dimensions`);
      stats.totalAfter += statBefore.size;
      stats.skipped++;
      return;
    }
    
    const longestEdge = Math.max(metadata.width, metadata.height);
    
    if (longestEdge < 1200) {
      console.log(`  ⚠️  Warning: ${path.basename(filePath)} has longest edge ${longestEdge}px (below 1200px threshold)`);
    }
    
    await sharp(imageData)
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ 
        quality: JPEG_QUALITY, 
        progressive: true,
        mozjpeg: true
      })
      .toFile(tempPath);
    
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
    
    const statAfter = fs.statSync(filePath);
    stats.totalAfter += statAfter.size;
    stats.processed++;
    
  } catch (e) {
    console.error(`  ❌ Error processing ${path.basename(filePath)}: ${(e as Error).message}`);
    stats.totalAfter += statBefore.size;
    stats.errors++;
  }
}

async function main() {
  console.log('========================================');
  console.log('Recompressing ALL artwork images');
  console.log('========================================');
  console.log(`Settings: max edge ${MAX_EDGE}px, JPEG quality ${JPEG_QUALITY}, mozjpeg progressive`);
  console.log(`Directory: ${IMAGES_DIR}\n`);
  
  const files = fs.readdirSync(IMAGES_DIR)
    .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
    .map(f => path.join(IMAGES_DIR, f));
  
  console.log(`Found ${files.length} images to process\n`);
  
  const stats: Stats = {
    totalBefore: 0,
    totalAfter: 0,
    processed: 0,
    errors: 0,
    skipped: 0,
  };
  
  const startTime = Date.now();
  
  for (let i = 0; i < files.length; i++) {
    await recompressImage(files[i], stats);
    
    if ((i + 1) % 500 === 0 || i === files.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const savedSoFar = (stats.totalBefore - stats.totalAfter) / (1024 * 1024);
      console.log(`  Progress: ${i + 1}/${files.length} (${elapsed}s, saved ${savedSoFar.toFixed(1)}MB so far)`);
    }
  }
  
  const beforeMB = stats.totalBefore / (1024 * 1024);
  const afterMB = stats.totalAfter / (1024 * 1024);
  const savedMB = beforeMB - afterMB;
  const savePct = beforeMB > 0 ? ((savedMB / beforeMB) * 100).toFixed(1) : '0';
  
  console.log(`\n========================================`);
  console.log(`Recompression Complete`);
  console.log(`========================================`);
  console.log(`Images processed: ${stats.processed}`);
  console.log(`Images skipped:   ${stats.skipped}`);
  console.log(`Errors:           ${stats.errors}`);
  console.log(`----------------------------------------`);
  console.log(`Before: ${beforeMB.toFixed(2)} MB`);
  console.log(`After:  ${afterMB.toFixed(2)} MB`);
  console.log(`Saved:  ${savedMB.toFixed(2)} MB (${savePct}%)`);
  console.log(`========================================`);
  
  if (stats.errors > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
