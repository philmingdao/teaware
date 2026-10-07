import assert from 'node:assert/strict';
export const miaFullImage=o=>'https://img.artsmia.org/web_objects_cache/'+o.Cache_Location.replaceAll('\\','/')+'/'+o.Primary_RenditionNumber.replace(/\.jpg$/i,'_full.jpg');
export function assertMia20261007(item){
 const {artwork:a,raw:r,imageSource}=item,o=r.object;
 assert.equal(o.rights_type,'Public Domain');assert.equal(o.Rights_Image_Display,'Full');assert.equal(o.image,'valid');assert.equal(o.public_access,1);
 assert.equal(a.sourceMuseumEnglish,'Minneapolis Institute of Art');assert.equal(a.sourceUrl,'https://collections.artsmia.org/art/'+o.id);assert.equal(a.accessionNumber,o.accession_number);
 assert.equal(a.titleOriginal,o.title+'; work type: '+o.object_name);assert.equal(a.date,o.dated);assert.equal(a.materialEnglish,o.medium);assert.equal(a.dimensions,o.dimension);
 assert.equal(imageSource,miaFullImage(o));assert.equal(item.rawSha256,r.imageSha256);
 assert.equal(r.metadataPolicy.url,'https://github.com/artsmia/collection');assert.equal(r.metadataPolicy.license,'CC0 1.0');
 assert.equal(r.imagePolicy.url,'https://new.artsmia.org/copyright-and-image-access');assert.equal(r.imagePolicy.quote,'You can copy, modify, distribute and perform the works, even for commercial purposes');
 assert.equal(a.license,'CC0 1.0 (metadata); Public Domain Mark 1.0 (Mia image access policy)');
 assert(a.creditLine.includes(o.creditline)&&a.creditLine.includes('Background removed and cropped by Teaware.'));
}
