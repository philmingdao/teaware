import assert from 'node:assert/strict';
import {rijksObjectNumber,linkedArtNotation} from './teaware-identity.mjs';
export const rijksNativeTitle=o=>{const names=(o.identified_by||[]).filter(x=>x.type==='Name');return names.find(x=>x.language?.some(l=>l.id.includes('300388277')))?.content||names[0]?.content||o._label;};
export const rijksDimensions=o=>(o.dimension||[]).map(d=>[...(d.classified_as||[]).map(linkedArtNotation),d.value,linkedArtNotation(d.unit)].filter(Boolean).join(' ')).join('; ');
export function assertRijks20261006(item){
 const {artwork:a,raw:r,imageSource}=item,o=r.object;
 assert.equal(a.sourceMuseumEnglish,'Rijksmuseum');assert.equal(a.accessionNumber,rijksObjectNumber(o));assert.equal(a.titleOriginal,rijksNativeTitle(o));
 assert.equal(a.date,linkedArtNotation(o.produced_by?.timespan));assert.equal(a.materialEnglish,(o.made_of||[]).map(linkedArtNotation).filter(Boolean).join(', '));assert.equal(a.dimensions,rijksDimensions(o));
 assert.equal(r.metadataPolicy.url,'https://data.rijksmuseum.nl/policy/information-and-data-policy');
 assert.equal(r.metadataPolicy.quote,'does not claim copyright on associated metadata to these collection objects.');
 assert.equal(o.shows[0].id,r.visual.id);assert.equal(r.visual.digitally_shown_by[0].id,r.digital.id);
 const rights=(r.visual.subject_to||[]).flatMap(s=>s.classified_as||[]).map(x=>x.id).filter(Boolean);
 assert(rights.some(x=>x.includes('publicdomain')||x.includes('zero/1.0')));assert.deepEqual(rights,r.rights);
 assert.equal(imageSource,r.digital.access_point[0].id.replace('/full/max/','/full/!1600,1600/'));
 assert.equal(item.rawSha256,r.imageSha256);assert(Math.max(r.info.width,r.info.height)>=1200);
 assert.equal(a.sourceUrl,r.sourceUrl);assert.equal(a.license,'Public Domain (Rijksmuseum Open Access; selected-image rights: '+rights.join(', ')+')');
 assert(a.creditLine.includes(a.accessionNumber)&&a.creditLine.includes('Background removed and cropped by Teaware.'));
}
