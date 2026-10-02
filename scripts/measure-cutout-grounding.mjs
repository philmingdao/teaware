// Measure alpha geometry only; photographs are not modified.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const manifest = 'src/data/cutout-samples.json';
const samples = JSON.parse(await fs.readFile(manifest, 'utf8'));
const percent = (pixel, dimension) => Number((pixel / dimension * 100).toFixed(3));

for (const sample of samples) {
  const { data, info } = await sharp(`public${sample.cutoutUrl}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = 0; y < info.height; y++) {
    let runStart = -1, longest = null, first = -1, last = -1;
    for (let x = 0; x <= info.width; x++) {
      const opaque = x < info.width && data[(y * info.width + x) * 4 + 3] >= 96;
      if (opaque) {
        if (first < 0) first = x;
        last = x;
        if (runStart < 0) runStart = x;
      } else if (runStart >= 0) {
        if (!longest || x - runStart > longest.width) longest = { start: runStart, width: x - runStart };
        runStart = -1;
      }
    }
    if (longest) rows.push({ y, first, last, ...longest });
  }
  if (!rows.length) throw new Error(`No opaque artifact: ${sample.id}`);
  const top = rows[0].y, bottom = rows.at(-1).y, height = bottom - top + 1;
  const footRows = rows.filter(row => row.y >= bottom - Math.max(2, height * .018));
  const footLeft = Math.min(...footRows.map(row => row.first));
  const footRight = Math.max(...footRows.map(row => row.last));
  const bodyRows = rows.filter(row => row.y >= top + height * .2 && row.y <= top + height * .7);
  const widestBody = bodyRows.reduce((best, row) => row.width > best.width ? row : best, bodyRows[0] ?? rows[0]);
  delete sample.contactBottomPercent;
  delete sample.contactWidthPercent;
  sample.shadowBaselinePercent = percent(bottom + 1, info.height);
  sample.shadowContactCenterPercent = percent((footLeft + footRight + 1) / 2, info.width);
  sample.shadowContactWidthPercent = percent(footRight - footLeft + 1, info.width);
  sample.shadowCastCenterPercent = percent(widestBody.start + widestBody.width / 2, info.width);
  sample.shadowCastWidthPercent = percent(widestBody.width * .96, info.width);
}

await fs.writeFile(manifest, JSON.stringify(samples, null, 2) + '\n');
console.log(`Measured contact position and overhead footprint for ${samples.length} unchanged cutouts.`);
