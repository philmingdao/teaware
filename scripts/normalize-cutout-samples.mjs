// Package already extracted alpha assets into centered square images.
// This step crops/resizes; it does not remove backgrounds or repaint artifacts.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

async function normalize(input, output) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = (y * info.width + x) * 4 + 3;
      if (data[alpha] <= 12) data[alpha] = 0;
      if (data[alpha] >= 16) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0 || left === 0 && top === 0 && right === info.width-1 && bottom === info.height-1) {
    throw new Error(`Missing usable transparent background: ${input}`);
  }
  const size = 1200, available = 960;
  const width = right - left + 1, height = bottom - top + 1;
  const scale = available / Math.max(width, height);
  const resizedWidth = Math.round(width * scale), resizedHeight = Math.round(height * scale);
  const cropped = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left, top, width, height }).resize(resizedWidth, resizedHeight).png().toBuffer();
  const offsetX = Math.floor((size - resizedWidth) / 2), offsetY = Math.floor((size - resizedHeight) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: '#00000000' } })
    .composite([{ input: cropped, left: offsetX, top: offsetY }])
    .webp({ lossless: true, alphaQuality: 100 }).toFile(output);
  return {
    bounds: { left, top, width, height }, objectSize: [resizedWidth, resizedHeight],
    offset: [offsetX, offsetY],
  };
}

async function main() {
  const samples = JSON.parse(await fs.readFile('src/data/cutout-samples.json', 'utf8'));
  const result = [];
  await fs.mkdir('public/cutout-test/objects', { recursive: true });
  for (const sample of samples) {
    const input = sample.id.startsWith('mia-')
      ? `output/cutout-test/generated/${sample.id}.png`
      : `output/hero-cutouts/${sample.id}.png`;
    const destination = path.join('public', sample.cutoutUrl);
    const geometry = await normalize(input, destination);
    result.push({ id: sample.id, input, destination, ...geometry });
  }
  await fs.writeFile('src/data/cutout-samples.json', JSON.stringify(samples, null, 2) + '\n');
  await fs.writeFile('output/cutout-test/normalization.json', JSON.stringify(result, null, 2) + '\n');
  await import('./measure-cutout-grounding.mjs');
  console.log(`Normalized ${result.length} alpha assets into 1200px squares with at least 10% margins.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
