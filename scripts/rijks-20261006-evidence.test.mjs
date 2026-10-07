import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {assertRijks20261006} from './rijks-20261006-evidence.mjs';
const fixture=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/rijks-20261006.json',import.meta.url)));
test('Rijks native record and advertised open image chain agree',()=>assertRijks20261006(fixture()));
test('Rijks rejects changed accession, generated native name, another view, or changed rights',()=>{
 for(const mutate of [r=>r.artwork.accessionNumber='BK-000',r=>r.artwork.titleOriginal='Teapot generated',r=>r.imageSource+='?other',r=>r.raw.visual.id+='-other',r=>r.raw.rights=[]]){const r=fixture();mutate(r);assert.throws(()=>assertRijks20261006(r));}
});
