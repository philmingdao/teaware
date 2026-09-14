/** Verify every gallery image resolves to a non-pointer local binary. */
import { closeSync, existsSync, openSync, readSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import artworks from '../src/data/artworks.json';

const publicDir = resolve(process.cwd(), 'public');
const errors: string[] = [];
const ids = new Set<string>();
const accessions = new Set<string>();
const sources = new Map<string, number>();

for (const artwork of artworks) {
  if (ids.has(artwork.id)) errors.push(`${artwork.id}: duplicate id`);
  ids.add(artwork.id);
  if (artwork.accessionNumber && !artwork.accessionNumber.startsWith('Commons:')) {
    const key = `${artwork.sourceMuseumEnglish}:${artwork.accessionNumber}`;
    if (accessions.has(key)) errors.push(`${artwork.id}: duplicate source accession ${key}`);
    accessions.add(key);
  }
  sources.set(artwork.sourceMuseumEnglish, (sources.get(artwork.sourceMuseumEnglish) ?? 0) + 1);
  if (!artwork.imageUrl.startsWith('/artworks/')) {
    errors.push(`${artwork.id}: imageUrl is not self-hosted`);
    continue;
  }
  const path = resolve(publicDir, artwork.imageUrl.slice(1));
  if (!path.startsWith(publicDir + sep) || !existsSync(path)) {
    errors.push(`${artwork.id}: missing image ${artwork.imageUrl}`);
    continue;
  }
  const size = statSync(path).size;
  if (size < 1_024) {
    errors.push(`${artwork.id}: image too small or an LFS pointer (${size} bytes)`);
    continue;
  }
  const header = Buffer.alloc(16);
  const fd = openSync(path, 'r');
  try {
    readSync(fd, header, 0, 16, 0);
  } finally {
    closeSync(fd);
  }
  const jpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const png = header.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const webp = header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
  if (!(jpeg || png || webp)) errors.push(`${artwork.id}: unrecognized image binary`);
}

console.log(`Checked ${artworks.length} artworks, ${ids.size} unique ids, ${sources.size} sources.`);
for (const [source, count] of [...sources].sort((a, b) => b[1] - a[1])) {
  console.log(`${source}: ${count}`);
}
if (errors.length) {
  console.error(`${errors.length} validation errors:\n${errors.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('All artwork paths resolve to local image binaries.');
}
