// Build contact sheets and an original/cutout review page from the current batch.
// Explicit decisions are keyed by id + cacheKey; no automatic approval is emitted.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.argv[2] ?? 'output/collection-cutouts';
const artworks = new Map(JSON.parse(await fs.readFile('src/data/artworks.json', 'utf8')).map(a => [a.id, a]));
const records = JSON.parse(await fs.readFile(`${root}/results.json`, 'utf8')).filter(row => artworks.has(row.id));
const review = `${root}/review`;
await fs.mkdir(review, { recursive: true });
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pages = [];
for (let start = 0; start < records.length; start += 20) {
  const batch = records.slice(start, start + 20);
  const layers = [];
  const cards = [];
  for (const [index, item] of batch.entries()) {
    const artwork = artworks.get(item.id);
    const x = (index % 4) * 320, y = Math.floor(index / 4) * 186;
    const label = `${item.id} ${item.qa?.flags?.join(', ') ?? item.error ?? ''}`;
    layers.push({ input: Buffer.from(`<svg width="320" height="26"><text x="5" y="17" font-size="11" fill="#777">${escape(label)}</text></svg>`), left: x, top: y + 160 });
    const original = path.resolve(item.inputPath ?? `public${artwork.imageUrl}`);
    if (item.candidatePath) {
      const cutout = path.resolve(item.candidatePath);
      for (const [file, dx] of [[original, 0], [cutout, 160]]) {
        const input = await sharp(file).resize(160, 160, { fit: 'contain', background: '#ffffff00' }).png().toBuffer();
        layers.push({ input, left: x + dx, top: y });
      }
      cards.push(`<article data-state="${escape(item.state)}"><h2>${escape(artwork?.titleChinese ?? item.id)}</h2><p>${escape(label)}</p><div class="pair"><img src="${escape(path.relative(path.resolve(review), original))}" alt="馆藏原图"><img src="${escape(path.relative(path.resolve(review), cutout))}" alt="透明候选图"></div><p>${escape(item.cacheKey)}<br>RGB encoding RMSE: ${item.rgbEncodingRMSE}</p></article>`);
    } else cards.push(`<article><h2>${escape(item.id)}</h2><p>${escape(item.error)}</p></article>`);
  }
  const filename = `sheet-${String(start / 20 + 1).padStart(4, '0')}.jpg`;
  await sharp({ create: { width: 1280, height: Math.ceil(batch.length / 4) * 186, channels: 4, background: '#fff' } }).composite(layers).jpeg({ quality: 95 }).toFile(`${review}/${filename}`);
  const htmlName = filename.replace('.jpg', '.html');
  await fs.writeFile(`${review}/${htmlName}`, `<!doctype html><html lang="zh"><meta charset="utf-8"><title>透明资源复核 ${start / 20 + 1}</title><style>body{font:14px system-ui;background:white;color:#222;margin:24px}article{padding:24px 0;border-bottom:1px solid #aaa}.pair{display:grid;grid-template-columns:1fr 1fr;max-width:1000px}.pair img{width:100%;aspect-ratio:1;object-fit:contain}p{overflow-wrap:anywhere}@media(prefers-color-scheme:dark){body{background:black;color:#ddd}}</style><p>左：馆藏原图；右：仅添加蒙版的候选图。核对轮廓、把手孔洞、底足、纹样及背景残留。任何疑问都不批准发布。</p>${cards.join('')}</html>`);
  pages.push({ sheet: filename, page: htmlName, ids: batch.map(item => item.id) });
}
await fs.writeFile(`${review}/index.json`, JSON.stringify(pages, null, 2));
console.log(`Created ${pages.length} review sheets for ${records.length} items.`);
