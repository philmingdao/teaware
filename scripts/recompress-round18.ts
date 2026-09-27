/**
 * Recompress Round 18 images with tighter settings for GitHub Pages size limit
 * 
 * Settings:
 * - Longest edge capped at exactly 1200px (not 1400)
 * - JPEG quality 70 (not 80)
 * - Strip all metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'artworks');
const MAX_EDGE = 1200;
const JPEG_QUALITY = 70;

async function main() {
  // Get list of Round 18 images from git
  const gitOutput = execSync('git diff --name-only HEAD~1 HEAD -- "public/artworks/*.jpg"', { encoding: 'utf-8' });
  const files = gitOutput.trim().split('\n').filter(Boolean);
  
  console.log(`Found ${files.length} Round 18 images to recompress`);
  console.log(`Settings: max edge ${MAX_EDGE}px, JPEG quality ${JPEG_QUALITY}, strip metadata\n`);
  
  let totalBefore = 0;
  let totalAfter = 0;
  let processed = 0;
  
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    
    const statBefore = fs.statSync(fullPath);
    totalBefore += statBefore.size;
    
    try {
      const imageData = fs.readFileSync(fullPath);
      const tempPath = fullPath + '.tmp';
      
      await sharp(imageData)
        .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ 
          quality: JPEG_QUALITY, 
          progressive: true,
          mozjpeg: true  // Better compression
        })
        .toFile(tempPath);
      
      // Replace original with recompressed version
      fs.unlinkSync(fullPath);
      fs.renameSync(tempPath, fullPath);
      
      const statAfter = fs.statSync(fullPath);
      totalAfter += statAfter.size;
      
      processed++;
      if (processed % 100 === 0) {
        console.log(`  Processed ${processed}/${files.length}...`);
      }
    } catch (e) {
      console.error(`  Error processing ${file}: ${(e as Error).message}`);
      totalAfter += statBefore.size; // Keep original size in count
    }
  }
  
  const savedMB = (totalBefore - totalAfter) / (1024 * 1024);
  const beforeMB = totalBefore / (1024 * 1024);
  const afterMB = totalAfter / (1024 * 1024);
  
  console.log(`\n========================================`);
  console.log(`Recompression Complete`);
  console.log(`========================================`);
  console.log(`Images processed: ${processed}`);
  console.log(`Before: ${beforeMB.toFixed(2)} MB`);
  console.log(`After: ${afterMB.toFixed(2)} MB`);
  console.log(`Saved: ${savedMB.toFixed(2)} MB (${((savedMB / beforeMB) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
