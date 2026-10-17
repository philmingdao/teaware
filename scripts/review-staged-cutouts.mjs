// Generate original/cutout comparison sheets for a staged pool (items not yet in catalogue).
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root = process.argv[2] || 'output/dimu-expansion-2026-10-17/cutouts';
const poolPath = process.argv[3] || path.join(path.dirname(root), 'downloaded.json');
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const records = await read(`${root}/results.json`);
const pool = await read(poolPath);
const byId = new Map(pool.selected.map(x => [x.artwork.id, x.artwork]));
const review = `${root}/review`;
await fs.mkdir(review, {recursive: true});
const escape = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards = [];
for (const item of records) {
  const art = byId.get(item.id);
  if (!item.candidatePath) { cards.push(`<article><h2>${escape(item.id)}</h2><p>${escape(item.error || 'no candidate')}</p></article>`); continue; }
  const original = path.resolve(item.inputPath);
  const cutout = path.resolve(item.candidatePath);
  const flags = (item.qa?.flags || []).join(', ') || 'clean';
  cards.push(`<article data-state="${escape(item.state)}"><h2>${escape(art?.titleChinese || item.id)} — ${escape(art?.titleOriginal || '')}</h2><p>${escape(item.id)} | ${escape(flags)} | coverage ${item.qa?.coverage} | components ${item.qa?.substantialComponents} | RMSE ${item.rgbEncodingRMSE}</p><div class="pair"><img src="${escape(path.relative(path.resolve(review), original))}" alt="original"><img src="${escape(path.relative(path.resolve(review), cutout))}" alt="cutout"></div><p>${escape(item.cacheKey)}</p></article>`);
}
const html = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>Staged cutout review</title><style>body{font:14px system-ui;background:white;color:#222;margin:24px}article{padding:24px 0;border-bottom:1px solid #aaa}.pair{display:grid;grid-template-columns:1fr 1fr;max-width:1000px}.pair img{width:100%;aspect-ratio:1;object-fit:contain;background:#f0f0f0}p{overflow-wrap:anywhere}</style><p>Left: source original; Right: transparent cutout candidate. Verify silhouette, handles, foot, decoration, background residue. ${records.length} items.</p>${cards.join('')}</html>`;
await fs.writeFile(`${review}/staged-review.html`, html);
console.log(`Wrote ${review}/staged-review.html for ${records.length} items.`);
