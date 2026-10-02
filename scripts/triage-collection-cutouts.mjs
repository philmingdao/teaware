// Risk triage only; neither a hole nor a low-risk score grants approval.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const root = process.argv[2] ?? 'output/collection-cutouts';
const records = JSON.parse(await fs.readFile(`${root}/results.json`, 'utf8'));
const inventory = JSON.parse(await fs.readFile(`${root}/inventory.json`, 'utf8'));
const artworks = new Map(JSON.parse(await fs.readFile('src/data/artworks.json', 'utf8')).map(row => [row.id, row]));
const inputs = new Map(inventory.map(row => [row.id, row]));
const risks = [];
const visualIssues = JSON.parse(await fs.readFile(`${root}/visual-issues.json`, 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '[]';
  throw error;
}));
const visual = new Map(visualIssues.map(row => [row.id, row.notes]));
for (const row of records.filter(row => artworks.has(row.id))) {
  const artwork = artworks.get(row.id);
  const reasons = [...(row.qa?.flags ?? [])];
  if (visual.has(row.id)) reasons.push('visual-review: ' + visual.get(row.id));
  if (!row.candidatePath) { risks.push({ id: row.id, reasons: ['missing-candidate'] }); continue; }
  const { data, info } = await sharp(row.candidatePath).resize(240,240).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width, height = info.height;
  const clear = new Uint8Array(width * height), seen = new Uint8Array(clear.length);
  for (let p = 0; p < clear.length; p++) clear[p] = data[p * 4 + 3] < 16 ? 1 : 0;
  let enclosed = 0, largest = 0;
  let centerHole = 0;
  const opaquePositions = [];
  for (let p = 0; p < clear.length; p++) if (!clear[p]) opaquePositions.push(p);
  const minX = Math.min(...opaquePositions.map(p => p % width)), maxX = Math.max(...opaquePositions.map(p => p % width));
  const minY = Math.min(...opaquePositions.map(p => Math.floor(p / width))), maxY = Math.max(...opaquePositions.map(p => Math.floor(p / width)));
  for (let p = 0; p < clear.length; p++) {
    if (!clear[p] || seen[p]) continue;
    const queue = [p]; seen[p] = 1;
    let border = false;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const pos = queue[cursor], x = pos % width, y = Math.floor(pos / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) border = true;
      for (const next of [x ? pos - 1 : -1, x < width - 1 ? pos + 1 : -1, y ? pos - width : -1, y < height - 1 ? pos + width : -1]) {
        if (next >= 0 && clear[next] && !seen[next]) { seen[next] = 1; queue.push(next); }
      }
    }
    if (!border) {
      enclosed += queue.length; largest = Math.max(largest, queue.length);
      const x = queue.reduce((sum,p) => sum + p % width, 0) / queue.length;
      const y = queue.reduce((sum,p) => sum + Math.floor(p / width), 0) / queue.length;
      if (x > minX + .22 * (maxX - minX) && x < minX + .78 * (maxX - minX) && y > minY + .25 * (maxY - minY)) centerHole = Math.max(centerHole, queue.length);
    }
  }
  if (centerHole / clear.length > .003) reasons.push('substantial-central-transparent-region');
  if (/\bglass\b/i.test(artwork.materialEnglish ?? '')) reasons.push('glass-or-composite-material');
  if (reasons.length) risks.push({ id: row.id, reasons, enclosedRatio: enclosed / clear.length, largestHoleRatio: largest / clear.length });
}
await fs.writeFile(`${root}/segmentation-risks.json`, JSON.stringify(risks, null, 2) + '\n');
await fs.writeFile(`${root}/high-precision-inputs.json`, JSON.stringify(risks.map(row => inputs.get(row.id)).filter(Boolean), null, 2) + '\n');
console.log(`Risk triage: ${risks.length}/${records.filter(row => artworks.has(row.id)).length} candidates need closer inspection or a high-precision comparison.`);
