/**
 * Download and Mirror Artwork Images
 * 
 * Downloads all artwork images to public/artworks/{id}.jpg
 * Verifies image integrity and updates artworks.json with local paths
 * 
 * Run: npx tsx scripts/download-mirror-images.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Artwork {
  id: string;
  titleEnglish: string;
  imageUrl: string;
  [key: string]: string | undefined;
}

const ARTWORKS_PATH = path.join(__dirname, '..', 'src', 'data', 'artworks.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'artworks');
const LOG_PATH = path.join(__dirname, '..', 'research', 'image-mirror-log.jsonl');

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

interface DownloadResult {
  id: string;
  success: boolean;
  originalUrl: string;
  localPath?: string;
  error?: string;
  fileSize?: number;
  dimensions?: string;
}

async function downloadImage(
  url: string, 
  outputPath: string,
  retries: number = 3
): Promise<{ success: boolean; error?: string; fileSize?: number }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TeawareGallery/1.0 (Educational Project; https://github.com/philmingdao/teaware)',
          'Accept': 'image/*',
        },
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          return { success: false, error: `HTTP ${response.status} - Access denied` };
        }
        if (response.status === 404) {
          return { success: false, error: 'HTTP 404 - Not found' };
        }
        if (attempt < retries - 1) {
          await delay(2000 * (attempt + 1));
          continue;
        }
        return { success: false, error: `HTTP ${response.status}` };
      }

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Verify it's actually an image (check magic bytes)
      if (bytes.length < 100) {
        return { success: false, error: 'File too small' };
      }
      
      // Check for JPEG magic bytes (FFD8FF) or PNG (89504E47)
      const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
      
      if (!isJpeg && !isPng) {
        // Check if it's HTML (Cloudflare block page)
        const text = new TextDecoder().decode(bytes.slice(0, 500));
        if (text.includes('<html') || text.includes('<!DOCTYPE')) {
          return { success: false, error: 'Received HTML instead of image (likely blocked)' };
        }
        return { success: false, error: 'Not a valid JPEG/PNG image' };
      }

      fs.writeFileSync(outputPath, Buffer.from(bytes));
      return { success: true, fileSize: bytes.length };
      
    } catch (e: unknown) {
      if (attempt < retries - 1) {
        await delay(2000 * (attempt + 1));
        continue;
      }
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

function getImageDimensions(filePath: string): string | null {
  try {
    // Use file command to get basic info
    const result = execSync(`file "${filePath}"`, { encoding: 'utf-8' });
    const match = result.match(/(\d+)\s*x\s*(\d+)/);
    if (match) {
      return `${match[1]}x${match[2]}`;
    }
    return null;
  } catch {
    return null;
  }
}

function appendLog(entry: Record<string, unknown>) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf-8');
}

async function main() {
  console.log('🖼️  Image Mirror Script');
  console.log('='.repeat(50));
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load artworks
  const artworks: Artwork[] = JSON.parse(fs.readFileSync(ARTWORKS_PATH, 'utf-8'));
  console.log(`📦 Loaded ${artworks.length} artworks`);

  // Track stats
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  const failed: DownloadResult[] = [];

  // Process each artwork
  for (let i = 0; i < artworks.length; i++) {
    const artwork = artworks[i];
    const localFilename = `${artwork.id}.jpg`;
    const localPath = path.join(OUTPUT_DIR, localFilename);
    const relativePath = `/artworks/${localFilename}`;

    // Skip if already downloaded and valid
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      if (stats.size > 1000) {
        // Already have a valid-looking file
        if (!artwork.imageUrl.startsWith('/artworks/')) {
          artwork.imageUrl = relativePath;
        }
        skippedCount++;
        if (skippedCount % 100 === 0) {
          console.log(`⏭️  Skipped ${skippedCount} (already downloaded)`);
        }
        continue;
      }
    }

    // Skip already-local URLs
    if (artwork.imageUrl.startsWith('/artworks/')) {
      skippedCount++;
      continue;
    }

    // Download
    console.log(`[${i + 1}/${artworks.length}] ${artwork.id}: ${artwork.titleEnglish.slice(0, 40)}...`);
    
    const result = await downloadImage(artwork.imageUrl, localPath);
    
    const logEntry: DownloadResult = {
      id: artwork.id,
      success: result.success,
      originalUrl: artwork.imageUrl,
    };

    if (result.success) {
      successCount++;
      artwork.imageUrl = relativePath;
      logEntry.localPath = relativePath;
      logEntry.fileSize = result.fileSize;
      logEntry.dimensions = getImageDimensions(localPath) || undefined;
      
      if (successCount % 50 === 0) {
        console.log(`✅ Downloaded ${successCount} images`);
      }
    } else {
      failCount++;
      logEntry.error = result.error;
      failed.push(logEntry);
      console.log(`❌ Failed: ${result.error}`);
    }

    appendLog({ timestamp: new Date().toISOString(), ...logEntry });

    // Rate limiting
    await delay(100);
  }

  // Filter out failed artworks (remove from collection)
  const validArtworks = artworks.filter(a => 
    a.imageUrl.startsWith('/artworks/') && 
    fs.existsSync(path.join(OUTPUT_DIR, `${a.id}.jpg`))
  );

  // Save updated artworks
  fs.writeFileSync(ARTWORKS_PATH, JSON.stringify(validArtworks, null, 2), 'utf-8');

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  ✅ Downloaded: ${successCount}`);
  console.log(`  ⏭️  Skipped (existing): ${skippedCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📦 Final count: ${validArtworks.length} artworks with local images`);

  if (failed.length > 0) {
    console.log('\n❌ Failed downloads:');
    const byError: Record<string, number> = {};
    for (const f of failed) {
      byError[f.error || 'unknown'] = (byError[f.error || 'unknown'] || 0) + 1;
    }
    for (const [err, count] of Object.entries(byError).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${err}: ${count}`);
    }
  }
}

main().catch(console.error);
