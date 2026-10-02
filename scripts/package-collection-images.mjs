// Called after Next export. Archive originals remain in the repo; serve only
// the reviewed transparent collection once full coverage has been achieved.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const manifest = JSON.parse(await fs.readFile('src/data/collection-cutouts.json', 'utf8'));
const artworks = JSON.parse(await fs.readFile('src/data/artworks.json', 'utf8'));
const assets = manifest.assets;
await fs.rm('out/artworks 2.json', { force: true });
const activeOriginals = new Set(artworks.map(item => item.imageUrl.split('/').at(-1)));
if (!Object.keys(assets).length) {
  for (const name of await fs.readdir('out/artworks')) if (!activeOriginals.has(name)) await fs.rm(`out/artworks/${name}`, { force: true });
  console.log('Collection processing not published yet; retaining existing image package.');
} else {
  const missing = artworks.filter(item => assets[item.id]?.qaStatus !== 'reviewed');
  if (missing.length) throw new Error(`Incomplete transparent collection: ${missing.length} images missing approval.`);
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  for (const item of artworks) {
    const asset = assets[item.id];
    if (hash(await fs.readFile(`public${item.imageUrl}`)) !== asset.sourceSha256 ||
        hash(await fs.readFile(`public${asset.url}`)) !== asset.candidateSha256) {
      throw new Error(`Image changed since transparent review: ${item.id}`);
    }
  }
  const expected = new Set(Object.values(assets).map(asset => asset.url.split('/').at(-1)));
  for (const name of await fs.readdir('out/collection-cutouts')) {
    if (!expected.has(name)) await fs.rm(`out/collection-cutouts/${name}`);
  }
  for (const name of expected) await fs.access(`out/collection-cutouts/${name}`);
  await fs.writeFile('out/artworks.json', JSON.stringify(artworks.map(item => ({ ...item, imageUrl: assets[item.id].url }))));
  // out is disposable build output. No source photographs are removed.
  await fs.rm('out/artworks', { recursive: true, force: true });
  await fs.rm('out/artworks 2.json', { force: true });
  console.log(`Packaged ${artworks.length} artworks with ${expected.size} transparent assets.`);
}
