/**
 * Recompress all artwork JPEGs for GitHub Pages artifact size compliance.
 * 
 * Target: Reduce artifact from ~1012MB to <900MB
 * 
 * Strategy:
 * - Longest edge capped at 1200px (quality gate minimum, no loss of compliant images)
 * - JPEG quality 72 (mozjpeg progressive)
 * - Strip EXIF metadata
 * 
 * Run: npx tsx scripts/recompress-artworks.ts
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ARTWORK_DIR = './public/artworks';
const MAX_LONGEST_EDGE = 1200;
const JPEG_QUALITY = 72;

interface Stats {
  totalFiles: number;
  originalSize: number;
  newSize: number;
  resized: number;
  skipped: number;
  errors: string[];
}

async function recompressAll(): Promise<Stats> {
  const stats: Stats = {
    totalFiles: 0,
    originalSize: 0,
    newSize: 0,
    resized: 0,
    skipped: 0,
    errors: [],
  };

  const files = fs.readdirSync(ARTWORK_DIR).filter(f => f.endsWith('.jpg'));
  stats.totalFiles = files.length;

  console.log(`\n📦 Recompressing ${files.length} artwork files...`);
  console.log(`   Target: max ${MAX_LONGEST_EDGE}px longest edge, quality ${JPEG_QUALITY}\n`);

  let processed = 0;
  const startTime = Date.now();

  for (const file of files) {
    const filePath = path.join(ARTWORK_DIR, file);
    
    try {
      const originalBuffer = fs.readFileSync(filePath);
      stats.originalSize += originalBuffer.length;

      const metadata = await sharp(originalBuffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const longestEdge = Math.max(width, height);

      // Build the sharp pipeline
      let pipeline = sharp(originalBuffer);

      // Resize if needed (only downscale, never upscale)
      if (longestEdge > MAX_LONGEST_EDGE) {
        pipeline = pipeline.resize(MAX_LONGEST_EDGE, MAX_LONGEST_EDGE, {
          fit: 'inside',
          withoutEnlargement: true,
        });
        stats.resized++;
      }

      // Compress with mozjpeg settings, strip metadata
      const newBuffer = await pipeline
        .jpeg({
          quality: JPEG_QUALITY,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();

      stats.newSize += newBuffer.length;

      // Only write if we actually saved space or changed dimensions
      if (newBuffer.length < originalBuffer.length || longestEdge > MAX_LONGEST_EDGE) {
        fs.writeFileSync(filePath, newBuffer);
      } else {
        stats.skipped++;
        stats.newSize = stats.newSize - newBuffer.length + originalBuffer.length;
      }

    } catch (e) {
      stats.errors.push(`${file}: ${(e as Error).message}`);
    }

    processed++;
    if (processed % 500 === 0 || processed === files.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const pct = ((processed / files.length) * 100).toFixed(1);
      console.log(`   ${processed}/${files.length} (${pct}%) - ${elapsed}s elapsed`);
    }
  }

  return stats;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  Teaware Gallery: Artwork Recompression');
  console.log('═'.repeat(60));

  const stats = await recompressAll();

  const originalMB = (stats.originalSize / 1024 / 1024).toFixed(2);
  const newMB = (stats.newSize / 1024 / 1024).toFixed(2);
  const savedMB = ((stats.originalSize - stats.newSize) / 1024 / 1024).toFixed(2);
  const savedPct = ((1 - stats.newSize / stats.originalSize) * 100).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  console.log('  Results');
  console.log('═'.repeat(60));
  console.log(`  Total files:     ${stats.totalFiles}`);
  console.log(`  Resized:         ${stats.resized} (had longest edge > ${MAX_LONGEST_EDGE}px)`);
  console.log(`  Skipped:         ${stats.skipped} (already smaller at original settings)`);
  console.log(`  Errors:          ${stats.errors.length}`);
  console.log('');
  console.log(`  Original size:   ${originalMB} MB`);
  console.log(`  New size:        ${newMB} MB`);
  console.log(`  Saved:           ${savedMB} MB (${savedPct}%)`);
  console.log('═'.repeat(60));

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach(e => console.log(`  - ${e}`));
  }

  // Verify final size
  console.log('\nVerifying final folder size...');
  const { execSync } = await import('child_process');
  const actualSize = execSync(`du -sh ${ARTWORK_DIR}`).toString().trim();
  console.log(`  ${actualSize}`);
}

main().catch(console.error);
