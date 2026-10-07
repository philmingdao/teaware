import test from 'node:test';import assert from 'node:assert/strict';import{historicalCreatorEvidence}from'./colbase-historical-creators.mjs';
test('Exact museum-verified historical maker attributions retain source and unspecified object date',()=>{
 assert.equal(historicalCreatorEvidence({'作者':'仁阿弥道八'}).deathYear,1855);assert.equal(historicalCreatorEvidence({'作者':'伝本阿弥光悦作'}).deathYear,1637);
});
test('Generational names, copies and compound makers do not inherit a historical identity',()=>{
 for(const creator of ['高橋道八','仁阿弥道八写','仁阿弥道八・松村景文','本阿弥光悦写','永楽善五郎作'])assert.equal(historicalCreatorEvidence({'作者':creator}),undefined);
});

test('Museum-native Mokubei attribution alias requires the exact named historical maker',()=>{assert.equal(historicalCreatorEvidence({'作者':'木米作'}).deathYear,1833);assert.equal(historicalCreatorEvidence({'作者':'木米他作'}),undefined);assert.equal(historicalCreatorEvidence({'作者':'木米風'}),undefined);});
