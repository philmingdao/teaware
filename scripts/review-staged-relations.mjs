import fs from 'node:fs/promises';
import sharp from 'sharp';
const active=JSON.parse(await fs.readFile('src/data/artworks.json','utf8'));
const manifest=JSON.parse(await fs.readFile('src/data/collection-cutouts.json','utf8'));
const pool=JSON.parse(await fs.readFile('output/round29-rijks/downloaded.json','utf8')).selected;
const byId=new Map(pool.map(item=>[item.artwork.id,item]));
const rows=new Map([...active,...pool.map(item=>item.artwork)].map(row=>[row.id,row]));
const groups=new Map();
for(const item of pool) for(const parent of item.raw.object.part_of||[]) {
  const parentId='rks-'+parent.id?.split('/').pop();
  if(parent.type!=='HumanMadeObject'||!rows.has(parentId)) continue;
  if(!groups.has(parentId))groups.set(parentId,{parentId,parent:rows.get(parentId),children:[]});
  groups.get(parentId).children.push(item.artwork);
}
const list=[...groups.values()];
await fs.writeFile('output/round29/staged-relations.json',JSON.stringify(list,null,2));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
for(let start=0;start<list.length;start+=8) {
  const layers=[]; let i=0;
  for(const group of list.slice(start,start+8))for(const row of [group.children[0],group.parent]) {
    const input=byId.get(row.id)?.inputPath||'/Users/apple/Documents/Codex Projects/teaware/public'+manifest.assets[row.id].url;
    const image=await sharp(input).resize(280,200,{fit:'contain',background:'#dedad3'}).png().toBuffer();
    const label=Buffer.from(`<svg width="280" height="56"><rect width="280" height="56" fill="white"/><text x="5" y="13" font-size="10">${row.id} ${escape(row.accessionNumber)}</text><text x="5" y="28" font-size="9">${escape(row.titleEnglish.slice(0,52))}</text><text x="5" y="43" font-size="9">${group.children.length} recorded children</text></svg>`);
    layers.push({input:image,left:(i%4)*280,top:Math.floor(i/4)*256},{input:label,left:(i%4)*280,top:Math.floor(i/4)*256+200}); i++;
  }
  await sharp({create:{width:1120,height:Math.ceil(i/4)*256,channels:3,background:'#fff'}}).composite(layers).png().toFile(`output/round29/staged-relations-${start/8}.png`);
}
console.log('Review parent groups',list.length);
