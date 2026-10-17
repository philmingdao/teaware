// Probe: print titles of NMAA CC0 items that are NOT duplicates and don't admit by native title.
import {classifyTeaware, isSpoonLikeTeaware, normalizedSourceUrl} from './teaware-policy.mjs';
const read = async p => JSON.parse(await (await import('node:fs/promises')).readFile(p, 'utf8'));
const API_KEY = process.env.SMITHSONIAN_API_KEY;
const active = await read('src/data/artworks.json');
const ids = new Set(active.map(x => x.id));
const seen = new Set();
const QUERIES = ['tea bowl', 'teapot', 'tea caddy', 'chawan', 'chaire', 'mizusashi', 'natsume', 'kyusu', 'tea ceremony', 'tea-leaf storage', 'gaiwan', 'Raku bowl', 'Hagi bowl', 'Karatsu bowl', 'Mino bowl', 'Shino bowl', 'Oribe bowl', 'Bizen bowl', 'Satsuma bowl', 'Jian bowl', 'tenmoku', 'qingbai bowl', 'Yixing', 'Longquan bowl', 'celadon bowl', 'Korean bowl', 'Joseon bowl', 'buncheong', 'Goryeo celadon', 'Vietnamese bowl', 'covered bowl', 'bowl stand', 'ewer', 'jar', 'kettle', 'tray'];
const notAdmit = [];
for (const q of QUERIES) {
  for (let start = 0; start < 400; start += 100) {
    const url = `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(q)}&api_key=${API_KEY}&rows=100&start=${start}&online_media_type=images`;
    let data;
    try { data = await (await fetch(url, {headers: {'User-Agent': 'TeawareGallery/1.0'}})).json(); } catch (e) { break; }
    const rows = data.response?.rows || [];
    if (!rows.length) break;
    for (const row of rows) {
      const d = row.content?.descriptiveNonRepeating;
      if (!d || d.unit_code !== 'NMAA' || d.metadata_usage?.access !== 'CC0') continue;
      const rid = d.record_ID;
      if (!rid || seen.has(rid)) continue;
      seen.add(rid);
      const aid = 'si-' + rid.replace(/_/g, '-');
      if (ids.has(aid)) continue;
      const om = d.online_media;
      if (!om?.media?.length) continue;
      let hasHires = false;
      for (const m of om.media) {
        if (m.usage?.access !== 'CC0') continue;
        if ((m.resources || []).some(r => r.label === 'High-resolution JPEG' && r.width && r.height && Math.max(r.width, r.height) >= 1200)) { hasHires = true; break; }
      }
      if (!hasHires) continue;
      const title = (d.title?.content || '').replace(/\s+/g, ' ').trim();
      const probe = {id: aid, titleEnglish: title, titleOriginal: title, materialEnglish: '', objectTypeEnglish: title, sourceUrl: d.record_link};
      const spoon = isSpoonLikeTeaware(probe);
      const dec = classifyTeaware({...probe, titleEnglish: title});
      notAdmit.push({id: aid, rid, title, spoon, decision: dec.decision, reason: dec.reason, sourceUrl: d.record_link});
    }
    if (start + 100 >= (data.response?.rowCount || 0)) break;
    await new Promise(r => setTimeout(r, 300));
  }
}
console.log('non-duplicate NMAA CC0 hires items:', notAdmit.length);
for (const x of notAdmit) console.log(JSON.stringify(x));
