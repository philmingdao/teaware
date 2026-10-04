import test from 'node:test';import assert from 'node:assert/strict';import {npmDynasty} from './teaware-periods.mjs';
test('Museum named periods do not confuse Common Era with Yuan',()=>{
 for(const [input,expected] of [['清','Qing'],['清；西元1644-1911年','Qing'],['西元1644-1911年','Unspecified'],['明 永樂元年','Ming'],['元 至正年間','Yuan'],['日本 明治','Meiji'],['南宋','Southern Song'],['日本 江戶時代','Edo'],['','Unspecified']])assert.equal(npmDynasty(input)[1],expected,input);
});
