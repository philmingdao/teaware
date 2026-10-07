import assert from 'node:assert/strict';
export function assertDmaGettyEvidence(item) {
  const {artwork:a,raw:r,imageSource}=item;
  if(a.id.startsWith('dma-')) {
    const o=r.object,c=r.selectedCanvas;
    assert.equal(o.copyright?.type,'Public domain');
    assert.equal(r.policy.title,'Notice on Open Access and Collection Research');
    assert(r.policy.body.includes('All public domain works are freely available for downloading, sharing, repurposing, and remixing without restriction.'));
    assert.equal(a.sourceMuseumEnglish,'Dallas Museum of Art');
    assert.equal(a.sourceUrl,r.manifest.rendering['@id']);
    assert.equal(a.sourceUrl,'https://dma.org/art/collection/object/'+o.id);
    assert.equal(a.accessionNumber,o.number);
    assert.equal(a.titleOriginal,o.title+'; work type: '+o.object_name);
    assert.equal(a.date,o.dated);assert.equal(a.materialEnglish,o.medium);assert.equal(a.dimensions,o.dimensions);
    assert.equal(c['@id'],o.id+'_'+o.primary_image+'-canvas');
    assert(r.manifest.sequences[0].canvases.some(x=>JSON.stringify(x)===JSON.stringify(c)));
    assert.equal(imageSource,c.images[0].resource['@id']);
    assert(/^https:\/\/image\.dma\.org\/iiif\/2\//.test(imageSource));
    assert.equal(item.rawSha256,r.imageSha256);
    assert.equal(a.license,'Public Domain (Dallas Museum of Art Open Access)');
    assert(a.creditLine.includes(o.credit_line)&&a.creditLine.includes(o.copyright.credit_line));
  } else {
    const o=r.object,m=r.manifest;
    assert(a.id.startsWith('getty-'));assert.equal(a.sourceMuseumEnglish,'J. Paul Getty Museum');
    assert.equal(o.rights_statement_id,'http://creativecommons.org/publicdomain/zero/1.0/');
    assert.equal(m.rights,o.rights_statement_id);assert.equal(o.manifest.license,m.rights);
    assert.equal(a.sourceUrl,'https://www.getty.edu/art/collection'+o.slug_with_path);
    assert.equal(a.accessionNumber,o.accession_number);assert.equal(a.titleOriginal,o.primary_name);
    assert.equal(a.date,o.date_created);assert.equal(a.materialEnglish,o.materials);assert.equal(a.dimensions,o.dimensions.join('; '));
    assert.equal(imageSource,m.items[0].items[0].items[0].body.id);
    assert(/^https:\/\/media\.getty\.edu\/iiif\/image\//.test(imageSource));
    assert.equal(a.license,'CC0 1.0 (Getty Open Content image); CC BY 4.0 (source text)');
    assert(a.creditLine.includes(o.public_credit_line));
  }
  assert(a.creditLine.includes('Background removed and cropped by Teaware.'));
}
