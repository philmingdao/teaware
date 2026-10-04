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
let stagedReviews={};try{stagedReviews=await read(path.join(path.dirname(poolPath),'admissions.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
const hashes=new Set();
for(const input of inputs) {
  const item=byId.get(input.id), row=item?.artwork;
  assert(row && input.kind==='object',`Unknown staged object ${input.id}`);
  assert(!ids.has(row.id),`Existing or rejected object ${row.id}`);
  assert(!urls.has(normalizedSourceUrl(row.sourceUrl)),`Existing source ${row.id}`);
  assert.equal(classifyTeaware(row,stagedReviews).decision,'admit',`Tea-use evidence ${row.id}`);
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
   } else if(row.id.startsWith('npm-')) {
    assert.equal(item.raw.fields['文物統一編號'][0],row.accessionNumber);
    assert.equal(item.raw.fields['品名'][0],row.titleOriginal);
    assert.equal(item.raw.sourceUrl,row.sourceUrl);
    assert.equal(item.raw.imageSource,item.imageSource);
    assert(item.imageSource.startsWith('https://iiifod.npm.gov.tw/iiif/2/'));
    const page=await fs.readFile(path.join(path.dirname(poolPath),'cache',digest(Buffer.from(row.sourceUrl))+'.html'));
    assert.equal(digest(page),item.raw.pageSha256);
    assert(page.toString().includes('CC BY 4.0')&&page.toString().includes('不限用途'),'NPM explicit adaptation license');
    assert(row.creditLine.includes('The National Palace Museum, Taipei, CC BY 4.0 @ www.npm.gov.tw')&&row.creditLine.includes('Background removed and cropped by Teaware.'));
    if(stagedReviews[row.id]) {
      const desc=(item.raw.fields['說明']||[]).join(' '), review=stagedReviews[row.id];
      assert.equal(review.sourceUrl,row.sourceUrl);assert.equal(review.descriptionSha256,digest(Buffer.from(desc)));
      assert((desc+' '+item.raw.fields['品名'].join(' ')).includes(review.sourceQuote),'Tea-use quotation missing');
    }
   } else if(row.id.startsWith('finna-')) {
    const im=item.raw.imagesExtended[0],rights=im.rights;
    assert(['CC BY 4.0','CC BY 3.0','CC BY 2.0','CC0','PDM','Public Domain'].includes(rights.copyright),'Finna primary-image license');
    assert.equal(item.raw.identifierString,row.accessionNumber);
    assert.equal(item.raw.title,row.titleOriginal);
    assert.equal(classifyTeaware({...row,titleEnglish:item.raw.title}).decision,'admit','Native source name must establish tea use');
    assert.equal(row.sourceUrl,'https://www.finna.fi/Record/'+item.raw.id);
    assert.equal(item.imageSource,new URL(im.urls.master||im.urls.large,'https://api.finna.fi').href);
    assert.equal(item.rawSha256,item.downloadEvidence.sha256);
    const end=Number(item.raw.creationDateRange?.split('/')[1]?.slice(0,4));assert(end>0&&end<=1920);
    assert(row.creditLine.includes(rights.copyright)&&row.creditLine.includes('Background removed and cropped by Teaware.'));
  } else if(row.id.startsWith('nmk-')) {
    assert.equal(item.raw.fields['소장품번호'],row.accessionNumber);assert(!row.accessionNumber.startsWith('건판'));
    assert.equal(item.raw.sourceUrl,row.sourceUrl);assert.equal(item.raw.imageSource,item.imageSource);
    assert.equal(item.raw.imageSha256,item.rawSha256);assert.equal(item.raw.licenseUrl,'https://www.kogl.or.kr/info/licenseType1.do');
    const page=await fs.readFile(path.join(path.dirname(poolPath),'cache',digest(Buffer.from(row.sourceUrl))+'.html'));
    assert.equal(digest(page),item.raw.pageSha256);assert(page.toString().includes('new_img_opencode1.jpg'));
    assert(item.imageSource.startsWith('https://www.museum.go.kr/relic_image/'));
    assert.equal(classifyTeaware({...row,titleEnglish:row.titleOriginal}).decision,'admit');
    assert(row.creditLine.includes('KOGL Type 1')&&row.creditLine.includes('Background removed and cropped by Teaware.'));
  } else if(row.id.startsWith('nationalmuseum-')) {
    assert.equal(item.raw.fields.licens,'Public Domain');assert.equal(item.raw.fields.inventarienummer.join('; '),row.accessionNumber);
    assert.equal(item.raw.fields.titel.join('; '),row.titleOriginal);
    assert.equal(row.sourceUrl,'https://media.nationalmuseum.se/search/all/media/'+item.raw.raw.id);
    const advertised=[...item.raw.raw.downloadables,item.raw.raw.previews.preview].map(x=>new URL(x.url,'https://media.nationalmuseum.se').href);
    assert(advertised.includes(item.imageSource));assert.equal(item.raw.sha256,item.rawSha256);
    assert.equal(classifyTeaware({...row,titleEnglish:row.titleOriginal}).decision,'admit');
    assert(row.creditLine.includes('Background removed and cropped by Teaware.'));
  } else if(row.id.startsWith('museumdigital-')) {
    const x=item.raw.raw;assert.equal(x.object_inventory_number,row.accessionNumber);assert.equal(x.object_name,row.titleOriginal);assert.equal(x.object_institution.institution_name,row.sourceMuseumEnglish);
    assert.equal(row.sourceUrl,'https://global.museum-digital.org/object/'+x.object_id);assert.equal(item.imageSource,item.raw.imageSource);assert.equal(item.raw.sha256,item.rawSha256);
    assert(['CC BY','CC BY-SA','CC0','Public Domain Mark'].includes(item.raw.image.rights));
    assert(/^https:\/\/creativecommons.org\/(licenses\/by(?:-sa)?\/|publicdomain\/(?:mark|zero)\/)/.test(item.raw.licenseUrl));
    const page=await fs.readFile(path.join(path.dirname(poolPath),'cache',digest(Buffer.from(row.sourceUrl))+'.html'));
    const imagePage=await fs.readFile(path.join(path.dirname(poolPath),'cache',digest(Buffer.from(item.raw.imagePage))+'.html'));
    assert.equal(digest(page),item.raw.pageSha256);assert.equal(digest(imagePage),item.raw.imagePageSha256);assert(imagePage.toString().includes(item.raw.licenseUrl));
    const originalLink=imagePage.toString().match(/<figure id="singleMainImage"><a href="([^"]+)"/)[1].replaceAll('&amp;','&');assert.equal(new URL(originalLink,item.raw.imagePage).href,item.imageSource);
    const times=x.object_events.filter(e=>e.event_type_name==='Created').map(e=>e.time).filter(t=>t.time_end);assert(times.length&&times.every(t=>Number(t.time_end)>0&&Number(t.time_end)<=1920));
    assert.equal(classifyTeaware({...row,titleEnglish:row.titleOriginal}).decision,'admit');assert(row.creditLine.includes('Background removed and cropped by Teaware.'));
  } else if(row.id.startsWith('dimu-')) {
    const x=item.raw.raw,im=x.media.pictures.find(p=>p.identifier===item.raw.index['artifact.defaultMediaIdentifier']);
    assert.equal(x.artifactType,'Thing');assert.equal(x.identifier.id,row.accessionNumber);
    assert.equal(x.partOfCollection.owner.name,row.sourceMuseumEnglish);
    assert.equal(row.sourceUrl,'https://digitaltmuseum.org/'+x.uniqueId);
    assert.equal(item.imageSource,'https://ems.dimu.org/image/'+im.identifier+'?dimension=1200x1200');
    const rights=im.licenses?.length?im.licenses:x.licenses,allowed=new Set(['by','by-sa','CC0 1.0','pdm','zero']);
    assert(rights.length&&x.licenses.length&&[...rights,...x.licenses].every(l=>l.system==='CC'&&allowed.has(l.code)));
    assert.deepEqual(rights,item.raw.effectiveImageLicenses);
    assert.equal(item.raw.sha256,item.rawSha256);assert(Math.max(im.width,im.height)>=1200);
    const span=x.eventWrap?.production?.timespan||{};assert(!span.toYear||span.toYear<=1920);if(!span.fromYear&&!span.toYear)assert.equal(row.date,span.comment||'馆方未注明制作年代 / Date not recorded');
    assert.equal(classifyTeaware({...row,titleEnglish:row.titleOriginal}).decision,'admit');
    assert(row.creditLine.includes('Background removed and cropped by Teaware.'));
    if(rights.some(l=>l.code==='by-sa'))assert(row.creditLine.includes('same CC BY-SA license'));
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
