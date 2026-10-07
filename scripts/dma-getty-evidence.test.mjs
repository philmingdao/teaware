import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDmaGettyEvidence} from './dma-getty-evidence.mjs';
const fixture=p=>JSON.parse(fs.readFileSync(new URL('./fixtures/'+p+'open-evidence.json',import.meta.url)));
test('DMA accepts exact public-domain primary image and full accession',()=>assertDmaGettyEvidence(fixture('dma-')));
test('DMA rejects a changed image, copyright status, policy, or accession',()=>{
  for(const mutate of [r=>r.raw.object.copyright.type='No known copyright restrictions',r=>r.imageSource+='?other',r=>r.raw.policy.body='',r=>r.artwork.accessionNumber='1991.412.32']) {
    const r=fixture('dma-');mutate(r);assert.throws(()=>assertDmaGettyEvidence(r));
  }
});
test('Getty accepts matching object and selected-image CC0 statements',()=>assertDmaGettyEvidence(fixture('getty-')));
test('Getty rejects object/image rights disagreement and changed accession',()=>{
  for(const mutate of [r=>r.raw.manifest.rights='https://rightsstatements.org/vocab/InC/1.0/',r=>r.artwork.accessionNumber='2001',r=>r.imageSource+='?other']) {
    const r=fixture('getty-');mutate(r);assert.throws(()=>assertDmaGettyEvidence(r));
  }
});
