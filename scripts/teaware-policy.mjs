// Museum/source names carry admission evidence. Generated Chinese labels and
// fallback objectTypeEnglish values never establish that an object is tea ware.
export const POLICY_VERSION = 'tea-only-2026-10-03';
// These source images are visibly publication pages, despite their legacy
// imported object names. Image review takes precedence over the wrong labels.
const publicationImages = new Set(['va-O105017', 'va-O152809', 'va-O168455', 'mia-54323', 'colbase-tnm-125608', 'colbase-tnm-127326', 'colbase-tnm-130718', 'rks-200341097']);
const nonObjectImages = new Map([
  ['colbase-kyohaku-172865', 'source-tea-name-mismatch-paper-confectionery-dish'],
  ['colbase-kyohaku-173794', 'partial-detail-and-multiple-object-photo'],
  ['colbase-tnm-147837', 'multiple-object-photo-instead-of-individual-caddy'],
  ['rks-20084210', 'fragment-photograph'],
  ['va-O91953', 'textile-image'],
  ...['rks-20083849', 'rks-20083850', 'rks-20083851'].map(id => [id, 'textile-image']),
  ['mia-28559', 'display-case-or-shelf-photo'],
  ...['rks-200113720', 'rks-200113721', 'rks-200113724', 'rks-200113725', 'rks-200113726'].map(id => [id, 'non-tea-ensemble-member-photo']),
  ['wiki-82172364', 'publication-illustration'],
  ...['wiki-66320513', 'wiki-66320532', 'wiki-66320579', 'wiki-66320697', 'wiki-66320741',
    'wmc-66320513', 'wmc-66320532', 'wmc-66320579', 'wmc-66320697', 'wmc-66320741',
    'wmc-55348970', 'wmc-55348973'].map(id => [id, 'display-case-or-shelf-photo']),
  ...['wiki-36831786', 'wmc-27254420', 'wmc-157970436', 'wmc-157970466'].map(id => [id, 'partial-detail-photograph']),
]);

const flatNames = /\b(?:print|painting|drawing|photograph|album|sketch|postcard|engraving|etching|lithograph|page|book|scroll|watercolou?r|poster|woodburytype|woodcut|woodblock|mezzotint|aquatint|photogravure|albumen|stereograph|cartoon|carte-de-visite)\b/i;
const flatMaterial = /\b(?:paper|parchment|photographic support|cardboard|canvas)\b/i;
const vesselMaterial = /\b(?:porcelain|stoneware|earthenware|ceramic|silver|bronze|copper|brass|pewter|glass|wood|bamboo|lacquer)\b/i;
const flatMedium = /\b(?:prints?|paintings?|drawing|photograph|woodcut|woodblock|woodburytype|albumen|ink|watercolou?r|gouache|lithograph|etching|canvas|photogravure)\b/i;
const textileNames = /\b(?:robe|textile|fabric|cloth|stole|coat|shawl|tapestry|rug|garment|kimono|costume|embroidery|embroidered|dress|silk panel)\b/i;
const textileMaterial = /\b(?:silk|cotton|wool|linen|textile|velvet|satin|brocade)\b/i;
const teaNames = /\b(?:tea[ -]?(?:pots?|bowls?|cups?|cadd(?:y|ies)|sets?|services?|containers?|canisters?|jars?|chests?|boxes?|utensils?|wares?|kettles?|trays?|scoops?|spoons?|urns?|infusers?|whisks?|strainers?|holders?|storage jars?|ceremony water jars?)|tea[- ]leaf storage jars?|tea and coffee (?:service|set)|chawan|chaire|mizusashi|chashaku|chasen|natsume|yunomi|kyusu|kyuusu|hōhin|hohin|theepot|theekom|theekop(?:je)?|theeservies|(?:stof)?theebus|teekanne|teeschale|teetasse|teekännchen|teekessel|teedose|teebüchse|teelöffel|teesieb|théière|bol à thé|theelepel|theezeef|theeblad|teiera|tekanna|teekannu|teepannu|teekuppi|tekopp|teekulho|teerasia|teepurkki|teburk|teesiivilä|teelusikka)\b|茶碗|茶盌|茶埦|茶器|茶入|茶壺|茶壶|茶杯|茶盏|茶盞|茶盃|茶鍾|茶鐘|茶棗|茶葉罐|茶道具|水指|急須|湯呑|茶筅|茶杓|다완|찻잔|찻주전자|차주전자|찻통|차호|다호|차통|다관|찻숟가락/i;
// Unicode boundaries retain Finnish ä and Korean source object names.
const nativeTeaNames = /(?<![\p{L}])(?:teekeitin|teevati|teesiivilä|teekuppipari|teskål|tedosa|tesil|tesked|tesilssked|tekjele|tekittel|teebrett|tebrett|teeskål|teefat|teeske|tefat|tekanne|teskje|다완|찻잔|차주전자|다관|찻숟가락|차솥)(?![\p{L}])/iu;
const nonTeaNames = /\b(?:epitaph|tomb|burial|funerary|snuff|tobacco|wine|libation|ritual|sacrificial|food vessel|grain serving|brush[- ]?(?:pot|washer|rest)|water dropper|inkstone|cosmetic|pillow|jardini[eè]re|flower ?pot|candlestick|candle ?holder|lamp|statue|figurine|sculpture|pendant|bracelet|ornament|necklace|earring|belt|weapon|sword|arrowhead|tile|roof|brick|seal paste|soup|tureen|sauce boat|mustard|punch bowl|finger bowl|custard|chocolate pot|chest with print)\b/i;
const nonTeaType = /\b(?:vase|figure|buddha|snuff|brush|pillow|wine|libation|ritual|tile|jardiniere|seal|sculpture|jewellery|weapon|dish|plate|platter)\b/i;

export function sourceEvidence(artwork) {
  let filename = '';
  try {
    const url = decodeURIComponent(artwork.sourceUrl ?? '');
    // A Commons filename can supply its native-language object name; a URL
    // host/path or numeric museum ID supplies no tea-use evidence.
    filename = url.includes('File:') ? url.split('File:')[1].replace(/[_]/g, ' ') : '';
  } catch { /* malformed URLs provide no evidence */ }
  return [artwork.titleEnglish, artwork.titleOriginal, artwork.materialEnglish, filename].filter(Boolean).join(' | ').replace(/<[^>]*>/g, '').normalize('NFKC');
}

export function classifyTeaware(artwork, reviewed = {}) {
  const evidence = sourceEvidence(artwork);
  if (nonObjectImages.has(artwork.id)) return { decision: 'reject', reason: nonObjectImages.get(artwork.id), evidence: 'Visual review: unsuitable primary collection image. ' + evidence };
  if (publicationImages.has(artwork.id)) return { decision: 'reject', reason: 'publication-page-image', evidence: 'Visual source-image review: printed book/catalogue page. ' + evidence };
  const names = [artwork.titleEnglish, artwork.titleOriginal, artwork.materialEnglish, artwork.objectTypeEnglish].join(' ');
  // Material names in the V&A import are often the actual source object name.
  const primary = [artwork.titleEnglish, artwork.titleOriginal, artwork.materialEnglish].join(' ');
  const tea = (evidence.match(teaNames) || evidence.match(nativeTeaNames))?.[0];
  if(/^(?:Japanese )?rice bowl\b|^sake (?:bottle|flask)\b|^tokkuri\b/i.test(artwork.titleEnglish||''))return {decision:'reject',reason:'explicit-non-tea-function',evidence};
  if (/分記|絵巻|図譜|画帖|書状|文書|手紙|消息|書付|墨蹟|書跡/.test(primary)) {
    return { decision: 'reject', reason: 'flat-artwork-or-publication', evidence };
  }
  if (/緞子|金襴(?!手)|仕覆|茶巾|袱紗|服紗|袈裟|織物/.test(primary) && !/\bnamed\b/i.test(primary)) {
    return { decision: 'reject', reason: 'textile-or-garment', evidence };
  }
  if (artwork.id === 'wiki-89869791' || flatNames.test(artwork.objectTypeEnglish ?? '') ||
    flatMedium.test(artwork.materialEnglish ?? '') ||
    (flatMaterial.test(artwork.materialEnglish ?? '') && !vesselMaterial.test(artwork.materialEnglish ?? '')) ||
    /lacquer on paper/i.test(artwork.materialEnglish ?? '') ||
    (!tea && flatNames.test(primary) && !vesselMaterial.test(artwork.materialEnglish ?? ''))) {
    return { decision: 'reject', reason: 'flat-artwork-or-publication', evidence };
  }
  if (textileNames.test(names.replace(/coat of arms/ig, '')) && (!tea || !vesselMaterial.test(artwork.materialEnglish ?? '')) ||
    (textileMaterial.test(artwork.materialEnglish ?? '') && !vesselMaterial.test(artwork.materialEnglish ?? ''))) {
    return { decision: 'reject', reason: 'textile-or-garment', evidence };
  }
  if (nonTeaNames.test(primary) && !tea) return { decision: 'reject', reason: 'non-tea-function', evidence };
  if (/^coffee ?pot$|^cake plate$/i.test(artwork.objectTypeEnglish ?? '')) return { decision: 'reject', reason: 'non-tea-function', evidence };
  if (reviewed[artwork.id]) return { decision: 'admit', reason: 'reviewed-tea-use', evidence, review: reviewed[artwork.id] };
  if (tea) return { decision: 'admit', reason: 'explicit-source-tea-name', evidence, match: tea };
  if (nonTeaType.test(names)) return { decision: 'reject', reason: 'non-tea-object-type', evidence };
  return { decision: 'review', reason: 'tea-use-unverified', evidence };
}

export function normalizedSourceUrl(value) {
  try {
    const decoded=decodeURIComponent(value).replace(/^http:/, 'https:').replace(/\/$/, '');
    return decoded.includes('commons.wikimedia.org/wiki/File:') ? decoded.replaceAll('_', ' ') : decoded;
  }
  catch { return String(value).replace(/\/$/, ''); }
}
