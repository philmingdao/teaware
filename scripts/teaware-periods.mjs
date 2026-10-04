// Use the museum's named period, never era words in the numerical date line.
export function npmDynasty(period) {
 const names = new Map([['江戸',['江户','Edo']],['江戶',['江户','Edo']],['江户',['江户','Edo']],['桃山',['桃山','Momoyama']],['室町',['室町','Muromachi']],['明治',['明治','Meiji']],['大正',['大正','Taisho']],['昭和',['昭和','Showa']],['民國',['民国','Republic of China']],['民国',['民国','Republic of China']],['南宋',['南宋','Southern Song']],['北宋',['北宋','Northern Song']],['宋',['宋','Song']],['唐',['唐','Tang']],['元',['元','Yuan']],['明',['明','Ming']],['清',['清','Qing']]]);
 const namedPeriod=String(period).replace(/西元|公元|紀元|纪元/g,'');
 const match=namedPeriod.match(new RegExp([...names.keys()].join('|')))?.[0];
 return names.get(match)||['未详','Unspecified'];
}
