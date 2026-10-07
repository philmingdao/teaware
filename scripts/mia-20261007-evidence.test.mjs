import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {assertMia20261007} from './mia-20261007-evidence.mjs';
const fixture=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/mia-20261007.json',import.meta.url)));
test('Mia requires museum native object name and separate metadata/image evidence',()=>assertMia20261007(fixture()));
test('Mia rejects restricted images, wrong source photo, truncated accession and generated tea title',()=>{for(const change of [x=>x.raw.object.rights_type='In Copyright',x=>x.raw.object.Rights_Image_Display='Restricted',x=>x.imageSource+='?different',x=>x.artwork.accessionNumber='2015',x=>x.artwork.titleOriginal='Generated Tea Vessel']){const x=fixture();change(x);assert.throws(()=>assertMia20261007(x));}});
