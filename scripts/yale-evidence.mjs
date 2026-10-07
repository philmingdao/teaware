import assert from 'node:assert/strict';
export const yaleField=(r,label)=>(r.metadata||[]).find(x=>x.label?.en?.includes(label))?.value?.en?.join('; ')||'';
export function assertYaleEvidence(item){
 const {artwork:a,raw:r,imageSource}=item,m=r.manifest,c=m.items[0],body=c.items[0].items[0].body;
 assert.equal(m.id,r.manifestUrl);assert.equal(m.id,'https://manifests.collections.yale.edu/yuag/obj/'+a.id.slice(5));
 assert.equal(m.rights,'https://creativecommons.org/publicdomain/zero/1.0/','Yale metadata CC0');
 assert.equal(yaleField(m,'Copyright Statement'),'Public domain','Yale work rights');
 assert.equal(yaleField(c,'Image Use Rights'),'No Copyright - United States','Yale selected image rights');
 assert.equal(a.sourceMuseumEnglish,'Yale University Art Gallery');assert.equal(yaleField(m,'Institution'),a.sourceMuseumEnglish);
 assert.equal(a.sourceUrl,m.homepage[0].id);assert.equal(a.accessionNumber,yaleField(m,'Object Number'));
 assert.equal(a.titleOriginal,yaleField(m,'Title'));assert.equal(a.date,yaleField(m,'Date'));assert.equal(a.materialEnglish,yaleField(m,'Medium'));assert.equal(a.dimensions,yaleField(m,'Dimensions'));
 assert.equal(imageSource,c.rendering?.[0]?.id||body.id);assert.equal(item.rawSha256,r.imageSha256);
 assert(Math.max(body.width,body.height)>=1200);
 assert.equal(r.imagePolicy.url,'https://artgallery.yale.edu/using-collection/using-images');
 assert.equal(r.imagePolicy.quote,'without further application, authorization, or fees due to the Gallery or to Yale.');
 assert.equal(a.license,'CC0 1.0 (metadata); Public Domain (Yale open-access image; No Copyright - United States)');
 assert(a.creditLine.includes(yaleField(m,'Creditline'))&&a.creditLine.includes('Background removed and cropped by Teaware.'));
}
