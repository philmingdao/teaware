/** Round 27: public-domain Chinese tea ware from Mia. Discovery and download
 * are staged in output/round27; publication requires reviewed metadata.
 * References: github.com/artsmia/collection-elasticsearch and
 * new.artsmia.org/copyright-and-image-access (checked 2026-10-02).
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const sharp = require('sharp');
const directory = path.resolve('output/round27');
const queries = ['teapot', 'tea bowl', 'tea cup', 'tea caddy', 'tea set', 'Yixing', 'tea container'];
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
async function fetchBuffer(url) {
  const { stdout } = await execFile('curl', ['-L', '--fail', '--silent', '--show-error', '--retry', '2', '--max-time', '60', url], { encoding: 'buffer', maxBuffer: 30 * 1024 * 1024 });
  return stdout;
}
async function main() {
  fs.mkdirSync(directory, { recursive: true });
  const seen = new Map();
  const searches = [];
  for (const query of queries) {
    const url = `https://search.artsmia.org/${encodeURIComponent(query + ' country:"China"')}?size=200`;
    const result = JSON.parse(await fetchBuffer(url));
    searches.push({ query, url, total: result.hits.total, returned: result.hits.hits.length });
    for (const hit of result.hits.hits) seen.set(hit._source.id, hit._source);
    console.log(query, result.hits.hits.length);
  }
  const source = [...seen.values()];
  fs.writeFileSync(path.join(directory, 'discovery.json'), JSON.stringify({ retrievedAt: new Date().toISOString(), searches, records: source }, null, 2));
  const eligible = source.filter(x => x.country === 'China' && x.rights_type === 'Public Domain' && x.public_access === 1 && x.image === 'valid' && x.Rights_Image_Display === 'Full' && x.Cache_Location && x.Primary_RenditionNumber && /tea.?pot|tea.?bowl|tea.?cup|tea.?caddy|tea.?set|tea.?container|tea service/i.test(x.title + ' ' + x.object_name));
  const hashes = new Set(JSON.parse(fs.readFileSync('research/image-hashes.json')));
  const existing = JSON.parse(fs.readFileSync('src/data/artworks.json'));
  const ids = new Set(existing.map(x => x.id));
  const urls = new Set(existing.map(x => x.sourceUrl.replace(/\/$/, '')));
  const accepted = [], rejected = [];
  for (const x of eligible) {
    const id = `mia-${x.id}`;
    const sourceUrl = `https://collections.artsmia.org/art/${x.id}`;
    if (ids.has(id) || urls.has(sourceUrl)) { rejected.push({ id, reason: 'existing object' }); continue; }
    const imageSource = `https://img.artsmia.org/web_objects_cache/${x.Cache_Location.replaceAll('\\', '/')}/${x.Primary_RenditionNumber.replace(/\.jpg$/i, '_full.jpg')}`;
    try {
      const raw = await fetchBuffer(imageSource);
      const rawHash = digest(raw);
      if (hashes.has(rawHash)) { rejected.push({ id, reason: 'duplicate source image' }); continue; }
      const metadata = await sharp(raw).metadata();
      if (Math.max(metadata.width || 0, metadata.height || 0) < 1200) { rejected.push({ id, reason: 'image below 1200px' }); continue; }
      const image = await sharp(raw).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      const imageHash = digest(image);
      if (hashes.has(imageHash)) { rejected.push({ id, reason: 'duplicate normalized image' }); continue; }
      const filename = path.join(directory, id + '.jpg');
      fs.writeFileSync(filename, image);
      accepted.push({ ...x, catalogId: id, sourceUrl, imageSource, originalWidth: metadata.width, originalHeight: metadata.height, rawHash, imageHash, imageBytes: image.length });
      hashes.add(rawHash); hashes.add(imageHash);
      console.log('downloaded', id, x.title, metadata.width, metadata.height);
    } catch (error) { rejected.push({ id, reason: error.message }); console.log('rejected', id, error.message); }
  }
  if (accepted.length) {
    const full = await fetchBuffer('https://search.artsmia.org/ids/' + accepted.map(x => x.id).join(','));
    fs.writeFileSync(path.join(directory, 'full-records.json'), full);
  }
  fs.writeFileSync(path.join(directory, 'candidates.json'), JSON.stringify({ retrievedAt: new Date().toISOString(), searches, discovered: source.length, eligible: eligible.length, accepted, rejected }, null, 2));
  console.log(JSON.stringify({ discovered: source.length, eligible: eligible.length, downloaded: accepted.length, rejected: rejected.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
