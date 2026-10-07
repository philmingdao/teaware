import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import{assertYaleEvidence}from'./yale-evidence.mjs';
const fixture=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/yale-9022-evidence.json',import.meta.url)));
test('Yale requires distinct metadata, work and selected-image rights',()=>assertYaleEvidence(fixture()));
test('Yale rejects orphan work, wrong image rights, generated title, changed accession or download',()=>{
 for(const mutate of [r=>r.raw.manifest.metadata.find(x=>x.label.en.includes('Copyright Statement')).value.en=['Orphan work'],r=>r.raw.manifest.items[0].metadata[0].value.en=['In Copyright'],r=>r.artwork.titleOriginal='Generated Tea Bowl',r=>r.artwork.accessionNumber='1971.91',r=>r.imageSource+='?other']){const r=fixture();mutate(r);assert.throws(()=>assertYaleEvidence(r));}
});
