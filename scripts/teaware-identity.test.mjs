import assert from 'node:assert/strict';
import {physicalObjectKey,rijksObjectNumber,linkedArtNotation} from './teaware-identity.mjs';
const base={sourceMuseumEnglish:'Rijksmuseum',accessionNumber:'AK-MAK-105'};
assert.equal(physicalObjectKey(base),physicalObjectKey({...base,id:'wiki-mirror',sourceUrl:'https://commons.wikimedia.org/'}));
assert.notEqual(physicalObjectKey(base),physicalObjectKey({...base,accessionNumber:'AK-MAK-105-1'}));
assert.notEqual(physicalObjectKey(base),physicalObjectKey({...base,sourceMuseumEnglish:'Different museum'}));
assert.equal(physicalObjectKey({...base,accessionNumber:'1'}),undefined);
assert.equal(physicalObjectKey({...base,sourceMuseumEnglish:'Wikimedia Commons'}),undefined);
assert.equal(rijksObjectNumber({identified_by:[{type:'Identifier',content:'1'},{type:'Identifier',content:'AK-MAK-105',classified_as:[{id:'https://id.rijksmuseum.nl/22015218'}]}]}),'AK-MAK-105');
assert.notEqual(physicalObjectKey({sourceMuseumEnglish:'The Metropolitan Museum of Art',accessionNumber:'49.18.24'}),physicalObjectKey({sourceMuseumEnglish:'The Metropolitan Museum of Art',accessionNumber:'49.18.25'}));
console.log('PASS physical-object identity, full multipart suffix, invalid identifiers, top-level Rijks extraction, independent shared-photo records');

assert.equal(linkedArtNotation({notation:{"@value":"porcelain","@language":"en"}}),"porcelain");
assert.equal(linkedArtNotation({notation:[{"@value":"porselein","@language":"nl"},{"@value":"porcelain","@language":"en"}]}),"porcelain");
