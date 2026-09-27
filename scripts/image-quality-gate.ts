/**
 * Image Quality Gate for Teaware Gallery
 * 
 * Rule: An artwork may only enter the gallery if its source image's
 * longest edge (max(width, height) in pixels) is >= MIN_LONGEST_EDGE.
 * 
 * This module provides utilities to enforce this quality gate during
 * image download/processing in expand scripts.
 * 
 * Established: 2026-09-27 (Phil confirmed)
 * Updated: 2026-09-27 - Reduced output size for GitHub Pages compliance
 *   - Max edge: 1400 → 1200 (matches quality gate minimum)
 *   - Quality: 80 → 72 (mozjpeg progressive)
 *   - Artifact target: <900 MB (GitHub Pages limit is 950 MB)
 */

import sharp from 'sharp';

export const MIN_LONGEST_EDGE = 1200;
export const MAX_OUTPUT_EDGE = 1200;
export const JPEG_QUALITY = 72;

export interface ImageDimensions {
  width: number;
  height: number;
  longestEdge: number;
}

export interface QualityCheckResult {
  passes: boolean;
  dimensions: ImageDimensions | null;
  reason?: string;
}

/**
 * Check if an image buffer passes the quality gate.
 * Returns dimensions and pass/fail status.
 */
export async function checkImageQuality(imageData: Buffer): Promise<QualityCheckResult> {
  try {
    const metadata = await sharp(imageData).metadata();
    
    if (!metadata.width || !metadata.height) {
      return {
        passes: false,
        dimensions: null,
        reason: 'Unable to read image dimensions',
      };
    }
    
    const dimensions: ImageDimensions = {
      width: metadata.width,
      height: metadata.height,
      longestEdge: Math.max(metadata.width, metadata.height),
    };
    
    if (dimensions.longestEdge < MIN_LONGEST_EDGE) {
      return {
        passes: false,
        dimensions,
        reason: `Longest edge ${dimensions.longestEdge}px < ${MIN_LONGEST_EDGE}px minimum`,
      };
    }
    
    return {
      passes: true,
      dimensions,
    };
  } catch (e) {
    return {
      passes: false,
      dimensions: null,
      reason: `Image processing error: ${(e as Error).message}`,
    };
  }
}

/**
 * Compress an image for gallery use if it passes the quality gate.
 * Returns true if successful, false if rejected or failed.
 * 
 * @param imageData - Raw image buffer from download
 * @param outputPath - Path to save compressed JPEG
 * @param verbose - Log rejection reason (default: true)
 */
export async function compressImageWithQualityGate(
  imageData: Buffer,
  outputPath: string,
  verbose = true
): Promise<boolean> {
  const check = await checkImageQuality(imageData);
  
  if (!check.passes) {
    if (verbose && check.reason) {
      console.log(`    ❌ 质量门槛未通过: ${check.reason}`);
    }
    return false;
  }
  
  try {
    await sharp(imageData)
      .resize(MAX_OUTPUT_EDGE, MAX_OUTPUT_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toFile(outputPath);
    return true;
  } catch (e) {
    if (verbose) {
      console.log(`    压缩失败: ${(e as Error).message}`);
    }
    return false;
  }
}
