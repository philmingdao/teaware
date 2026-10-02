// Resolve the official Linked Art -> VisualItem -> DigitalObject -> IIIF chain.
// Crop museum high-resolution pixels using the already reviewed subject bounds.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
const run = promisify(execFile);
const root = 'output/collection-cutouts/rijksmuseum-refresh';
await fs.mkdir(root, { recursive: true });
const artworks = new Map(JSON.parse(await fs.readFile('src/data/artworks.json','utf8')).map(row => [row.id,row]));
const records = new Map(JSON.parse(await fs.readFile('output/collection-cutouts/results.json','utf8')).map(row => [row.id,row]));
const small = JSON.parse(await fs.readFile('output/collection-cutouts/small-source-crops.json','utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function fetchBytes(url) {
  if (!url.startsWith('https://')) throw new Error('Only HTTPS museum resources are accepted');
  const {stdout} = await run('curl',['-L','--fail','--silent','--show-error','--retry','2','--max-time','90','-H','Accept: application/json',url],{encoding:'buffer',maxBuffer:50*1024*1024});
  return stdout;
}
async function json(url) { return JSON.parse(await fetchBytes(url)); }
const outcomes = [];
for (const row of small) {
  if (!/^rks-\d+$/.test(row.id) || !artworks.has(row.id)) throw new Error('Unreviewed source selection');
  try {
    const artwork = artworks.get(row.id), record = records.get(row.id);
    const original = await fs.readFile(`public${artwork.imageUrl}`);
    if (sha(original) !== record.sourceSha256) throw new Error('Original changed since review');
    const old = await sharp(original).metadata();
    const object = await json(`https://id.rijksmuseum.nl/${row.id.slice(4)}`);
    const visual = await json(object.shows[0].id);
    const licence = JSON.stringify(visual.subject_to ?? []);
    if (!/publicdomain|zero\/1\.0/i.test(licence)) throw new Error('Public-domain rights not confirmed');
    const digital = await json(visual.digitally_shown_by[0].id);
    const accessPoint = digital.access_point[0].id;
    const base = accessPoint.split('/full/')[0];
    if (base === accessPoint) throw new Error('Unrecognized IIIF image URL');
    const info = await json(`${base}/info.json`);
    if (Math.abs(info.width/info.height-old.width/old.height)>.01) throw new Error('Different museum view; old bounds cannot be reused');
    const sx = info.width/old.width, sy = info.height/old.height;
    const [x0,y0,x1,y1] = record.bounds;
    if (Math.max((x1-x0)*sx,(y1-y0)*sy)<600) throw new Error('Museum master still lacks sufficient object detail');
    const pad = .2*Math.max((x1-x0)*sx,(y1-y0)*sy);
    const x = Math.max(0,Math.floor(x0*sx-pad)), y = Math.max(0,Math.floor(y0*sy-pad));
    const width = Math.min(info.width-x,Math.ceil((x1-x0)*sx+pad*2));
    const height = Math.min(info.height-y,Math.ceil((y1-y0)*sy+pad*2));
    const edge = Math.min(1600,Math.max(width,height));
    const imageSource = `${base}/${x},${y},${width},${height}/!${edge},${edge}/0/default.jpg`;
    const downloaded = await fetchBytes(imageSource);
    const metadata = await sharp(downloaded).metadata();
    if (!metadata.width || !metadata.height || Math.max(metadata.width,metadata.height)<600) throw new Error('Bad museum crop');
    await fs.writeFile(`${root}/${row.id}-before.jpg`,original);
    await fs.writeFile(`${root}/${row.id}-museum.jpg`,downloaded);
    const image = await sharp(downloaded).rotate().jpeg({quality:96,mozjpeg:true}).toBuffer();
    await fs.writeFile(`public${artwork.imageUrl}`,image);
    outcomes.push({id:row.id,state:'refreshed',objectSource:object.id,imageSource,rights:visual.subject_to,
      museumWidth:info.width,museumHeight:info.height,width:metadata.width,height:metadata.height,
      previousSourceSha256:record.sourceSha256,museumCropSha256:sha(downloaded),sourceSha256:sha(image)});
    console.log(row.id,metadata.width,metadata.height);
  } catch(error) { outcomes.push({id:row.id,state:'error',error:String(error)}); console.log(row.id,String(error)); }
  await fs.writeFile(`${root}/results.json`,JSON.stringify(outcomes,null,2)+'\n');
}
if (outcomes.some(row=>row.state==='error')) process.exitCode=1;
