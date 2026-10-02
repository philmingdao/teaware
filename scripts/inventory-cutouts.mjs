// Inventory only catalog-referenced images; cloud-sync duplicate files are excluded.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { verifyTeaware } from './verify-teaware.mjs';

const root = 'output/collection-cutouts';
await fs.mkdir(root, { recursive: true });
const artworks = await verifyTeaware();
const rows = [];
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < artworks.length) {
    const artwork = artworks[cursor++];
    const kind = 'object';
    const row = { id: artwork.id, inputPath: `public${artwork.imageUrl}`, sourceUrl: artwork.sourceUrl,
      title: artwork.titleChinese, museum: artwork.sourceMuseum, objectType: artwork.objectType, kind };
    try {
      const bytes = await fs.readFile(row.inputPath);
      if (bytes.subarray(0, 64).toString().includes('git-lfs.github.com')) throw new Error('LFS pointer: git lfs pull required');
      const metadata = await sharp(bytes).metadata();
      rows.push({ ...row, sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length, width: metadata.width, height: metadata.height });
    } catch (error) { rows.push({ ...row, error: String(error) }); }
  }
}));
rows.sort((a, b) => a.id.localeCompare(b.id));
const valid = rows.filter(row => !row.error);
const groups = new Map();
for (const row of valid) {
  const group = groups.get(row.sourceSha256) ?? [];
  group.push(row.id);
  groups.set(row.sourceSha256, group);
}
const summary = { total: rows.length, valid: valid.length, invalid: rows.length - valid.length,
  uniqueImages: groups.size, duplicateImages: valid.length - groups.size,
  sourceBytes: valid.reduce((sum, row) => sum + row.bytes, 0),
  kinds: Object.fromEntries(['object', 'flat-work', 'textile'].map(kind => [kind, rows.filter(row => row.kind === kind).length])),
  museums: Object.fromEntries([...new Set(rows.map(row => row.museum))].map(museum => [museum, rows.filter(row => row.museum === museum).length])) };
await fs.writeFile(`${root}/inventory.json`, JSON.stringify(rows, null, 2) + '\n');
await fs.writeFile(`${root}/inventory-summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (summary.invalid) process.exitCode = 1;
