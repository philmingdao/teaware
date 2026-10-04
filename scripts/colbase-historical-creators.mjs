// Historical maker identities checked against museum sources on 2026-10-04.
// This establishes a historical attribution, never an invented object date.
export function historicalCreatorEvidence(raw) {
  const creator=raw['作者']||'';
  const raku='https://www.raku-yaki.or.jp/history/successive.html';
  const records=[
    [/^(?:伝)?乾山$/,1743,raku], [/^伝長次郎$/,1589,raku],
    [/^伝道入作$/,1656,raku], [/^(?:伝一入作|樂一入)$/,1696,raku],
    [/^(?:伝了入作|樂了入)$/,1834,raku], [/^樂長入$/,1770,raku],
    [/^樂旦入$/,1854,raku], [/^樂慶入$/,1902,raku],
    [/^青木木米$/,1833,'https://emuseum.nich.go.jp/detail?content_base_id=100323&content_part_id=000&content_pict_id=0&langId=en','2026-10-05'],
    [/^永楽保全$/,1854,'https://www.metmuseum.org/art/collection/search/49089'],
  ];
  const record=records.find(([re])=>re.test(creator));
  return record?{creator,deathYear:record[1],source:record[2],checkedAt:record[3]||'2026-10-04',note:'Museum attribution retained as recorded; object date remains unspecified.'}:undefined;
}
