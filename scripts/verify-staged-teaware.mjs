// Admission to image processing is provisional. Visual approval and publication
// are separate steps; this command never changes the public catalogue.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {classifyTeaware, normalizedSourceUrl} from './teaware-policy.mjs';
import {historicalCreatorEvidence} from './colbase-historical-creators.mjs';
import {physicalObjectKey, rijksObjectNumber} from './teaware-identity.mjs';
const poolPath=process.argv[2], inputsPath=process.argv[3];
assert(poolPath && inputsPath, 'Provide downloaded pool and input manifest');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const active=await read('src/data/artworks.json');
const exclusions=(await read('research/teaware-exclusions.json')).entries;
const aliases=(await read('research/teaware-duplicate-aliases.json')).entries;
const prior=(await read('research/teaware-expansion-2026-10-03.json')).rejected;
const ids=new Set([...active,...exclusions,...aliases,...prior].map(a=>a.id));
const urls=new Set([...active,...exclusions,...aliases,...prior].filter(a=>a.sourceUrl).map(a=>normalizedSourceUrl(a.sourceUrl)));
const keys=new Set(active.map(physicalObjectKey).filter(Boolean));
const pool=(await read(poolPath)).selected;
const inputs=await read(inputsPath);
const byId=new Map(pool.map(item=>[item.artwork.id,item]));
assert.equal(byId.size,pool.length,'Duplicate staging IDs');
const hashes=new Set();
for(const input of inputs) {
  const item=byId.get(input.id), row=item?.artwork;
  assert(row && input.kind==='object',`Unknown staged object ${input.id}`);
  assert(!ids.has(row.id),`Existing or rejected object ${row.id}`);
  assert(!urls.has(normalizedSourceUrl(row.sourceUrl)),`Existing source ${row.id}`);
  assert.equal(classifyTeaware(row).decision,'admit',`Tea-use evidence ${row.id}`);
  const key=physicalObjectKey(row);
  assert(key && !keys.has(key),`Missing or duplicate institution/accession ${row.id}`);
  assert.equal(item.rawMetadataSha256,digest(Buffer.from(JSON.stringify(item.raw))),`Metadata changed ${row.id}`);
  if(row.id.startsWith('met-')) assert(item.raw.isPublicDomain && item.raw.primaryImage===item.imageSource,'Met image-specific rights');
  else if(row.id.startsWith('mia-')) assert(item.raw.rights_type==='Public Domain' && item.raw.Rights_Image_Display==='Full','Mia image-specific rights');
  else if(row.id.startsWith('rks-')) {
    assert.equal(rijksObjectNumber(item.raw.object),row.accessionNumber,'Rijks full accession');
    const rights=(item.raw.visual.subject_to||[]).flatMap(s=>s.classified_as||[]).map(x=>x.id);
    assert(rights.some(r=>r.includes('publicdomain')||r.includes('zero/1.0')),'Rijks selected image rights');
  } else if(row.id.startsWith('colbase-')) {
    assert(['ccby','cc0','pd'].includes(item.raw['コンテンツの権利区分']),'ColBase record rights');
    assert.equal(item.raw['機関管理番号'],row.accessionNumber,'ColBase full accession');
    assert.equal(normalizedSourceUrl(item.raw.URL),normalizedSourceUrl(row.sourceUrl));
    assert.equal(item.imageSource,item.raw['代表画像URL'].replace('/image/slideshow_s/','/image/'));
    assert(row.creditLine.includes('Background removed and cropped by Teaware.'),'ColBase derivative credit');
    assert((item.raw['時代世紀'] || (historicalCreatorEvidence(item.raw) && JSON.stringify(item.historicalAttribution)===JSON.stringify(historicalCreatorEvidence(item.raw)))) && !/昭和|平成|令和|現代|modern|contemporary|20th century|20世紀/i.test(item.raw['時代世紀']),'ColBase uncertain or recent third-party rights');
  } else if(row.id.startsWith('paris-')) {
    assert(/^CC0\b/i.test(item.raw.selectedImage.credit),'Paris selected-image CC0 statement');
    assert.equal(item.raw.selectedImage.url,item.imageSource);
    assert.equal(item.raw.accession,row.accessionNumber);
    assert.equal(item.raw.title,row.titleOriginal);
    assert(!/^couvercle\b|fragment|tesson|dessin|étude/i.test(item.raw.title),'Paris complete physical tea object');
    const html=await fs.readFile(path.join(path.dirname(poolPath),'cache',digest(Buffer.from(row.sourceUrl))+'.html'));
    assert.equal(digest(html),item.raw.htmlSha256,'Paris source-page evidence unchanged');
  } else assert.fail(`Unverified staging source ${row.id}`);
  assert.equal(input.inputPath,item.inputPath,`Unexpected image path ${row.id}`);
  const relative=path.relative(path.dirname(poolPath),item.inputPath);
  assert(!relative.startsWith('..') && relative.startsWith('originals'+path.sep),'Image must stay in staging originals');
  const raw=await fs.readFile(path.join(path.dirname(poolPath),'cache',digest(Buffer.from(item.imageSource))+'.bin'));
  assert.equal(digest(raw),item.rawSha256,`Original image changed ${row.id}`);
  const metadata=await sharp(raw).metadata();
  assert.equal(metadata.width,item.width); assert.equal(metadata.height,item.height);
  assert(Math.max(metadata.width,metadata.height)>=1200,`Native source below 1200 ${row.id}`);
  const image=await fs.readFile(item.inputPath);
  const hash=digest(image);
  assert.equal(hash,item.sourceSha256); assert.equal(hash,input.sourceSha256);
  assert(!hashes.has(hash),`Duplicate staged image ${row.id}`);
  hashes.add(hash); ids.add(row.id); urls.add(normalizedSourceUrl(row.sourceUrl)); keys.add(key);
}
console.log(`PASS ${inputs.length} provisional tea objects: native pixels, source hashes, image rights, full accessions and exclusions`);
