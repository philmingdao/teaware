import fs from 'node:fs/promises';
import sharp from 'sharp';

// Measure silhouettes, never change the approved photographs. Reuse measurements
// for shared images, and regenerate on build when the catalogue changes.
const manifest = JSON.parse(await fs.readFile('src/data/collection-cutouts.json', 'utf8'));
const bounds = {};
const urls = [...new Set(Object.values(manifest.assets).map(asset => asset.url))].sort();
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < urls.length) {
    const url = urls[next++];
    const { data, info } = await sharp(`public${url}`).ensureAlpha().extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
    let left = info.width, top = info.height, right = 0, bottom = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[y * info.width + x] < 8) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      }
    }
    if (right <= left || bottom <= top) throw new Error(`Empty exhibit silhouette: ${url}`);
    bounds[url] = [left / info.width, top / info.height, right / info.width, bottom / info.height].map(n => Number(n.toFixed(5)));
  }
}));
const sorted = Object.fromEntries(urls.map(url => [url, bounds[url]]));
await fs.writeFile('src/data/exhibit-layout.json', JSON.stringify(sorted) + '\n');
console.log(`Measured ${urls.length} exhibit silhouettes for a consistent display surface.`);
