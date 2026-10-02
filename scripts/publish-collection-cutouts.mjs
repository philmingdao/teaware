// Publish only explicitly reviewed candidates. Full coverage is mandatory.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { verifyTeaware } from './verify-teaware.mjs';

const root = process.argv[2] ?? 'output/collection-cutouts';
const artworks = await verifyTeaware();
const records = new Map(JSON.parse(await fs.readFile(`${root}/results.json`, 'utf8')).map(item => [item.id, item]));
const decisions = new Map(JSON.parse(await fs.readFile(`${root}/approvals.json`, 'utf8')).map(item => [item.id, item]));
const failures = [];
const approved = [];
for (const artwork of artworks) {
  const record = records.get(artwork.id), decision = decisions.get(artwork.id);
  if (!record?.candidatePath || record.state === 'error' || decision?.decision !== 'approve' || decision.cacheKey !== record.cacheKey || decision.candidateSha256 !== record.candidateSha256 || !decision.notes) {
    failures.push(`${artwork.id}: missing/current visual approval`);
    continue;
  }
  const source = await fs.readFile(`public${artwork.imageUrl}`);
  if (crypto.createHash('sha256').update(source).digest('hex') !== record.sourceSha256) {
    failures.push(`${artwork.id}: source changed`); continue;
  }
  const candidate = await fs.readFile(record.candidatePath);
  if (crypto.createHash('sha256').update(candidate).digest('hex') !== record.candidateSha256) {
    failures.push(`${artwork.id}: candidate changed since review`); continue;
  }
  const { data, info } = await sharp(candidate).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let clear = 0, opaque = 0, border = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = data[(y * info.width + x) * 4 + 3];
    if (a === 0) clear++;
    if (a >= 244) opaque++;
    if ((x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) && a) border++;
  }
  if (info.width !== 1200 || info.height !== 1200 || !clear || !opaque || border || !record.alphaLossless || !record.rgbUnchangedBeforeResize) {
    failures.push(`${artwork.id}: alpha/size/fidelity gate failed`); continue;
  }
  approved.push({ artwork, record });
}
if (failures.length) {
  await fs.writeFile(`${root}/publication-blockers.json`, JSON.stringify(failures, null, 2));
  throw new Error(`Publication blocked: ${failures.length}/${artworks.length} artworks require review or repair. No production files changed.`);
}
const assets = {};
const unique = new Map(approved.map(item => [item.record.cacheKey, item.record]));
const totalBytes = [...unique.values()].reduce((sum, item) => sum + item.bytes, 0);
if (totalBytes > 800 * 1024 * 1024) throw new Error('Transparent assets exceed the 800 MiB publication budget; re-encode candidates and re-review.');
await fs.mkdir('public/collection-cutouts', { recursive: true });
let bytes = 0;
const written = new Set();
for (const { artwork, record } of approved) {
  const url = `/collection-cutouts/${record.cacheKey}.webp`;
  if (!written.has(url)) {
    await fs.copyFile(record.candidatePath, `public${url}`);
    bytes += record.bytes;
    written.add(url);
  }
  assets[artwork.id] = { url, sourceSha256: record.sourceSha256, qaStatus: 'reviewed',
    candidateSha256: record.candidateSha256,
    shadowBaselinePercent: record.shadowBaselinePercent,
    shadowContactCenterPercent: record.shadowContactCenterPercent,
    shadowContactWidthPercent: record.shadowContactWidthPercent,
    shadowCastCenterPercent: record.shadowCastCenterPercent,
    shadowCastWidthPercent: record.shadowCastWidthPercent,
    shadowEnabled: !/^Tea (?:Spoon|Scoop|Strainer|Infuser)$/i.test(artwork.objectTypeEnglish) &&
      (record.repair?.shadowEnabled ?? (record.kind === 'object' && record.qa.substantialComponents === 1)) };
}
const manifest = { version: 1, total: artworks.length, uniqueAssets: written.size, bytes, assets };
await fs.writeFile('src/data/collection-cutouts.json.tmp', JSON.stringify(manifest) + '\n');
await fs.rename('src/data/collection-cutouts.json.tmp', 'src/data/collection-cutouts.json');
console.log(`Published ${artworks.length} reviewed artwork mappings, ${written.size} assets, ${(bytes / 1024 ** 2).toFixed(1)} MiB.`);
