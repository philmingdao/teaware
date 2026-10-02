// Museum/source names carry admission evidence. Generated Chinese labels and
// fallback objectTypeEnglish values never establish that an object is tea ware.
export const POLICY_VERSION = 'tea-only-2026-10-03';

const flatNames = /\b(?:print|painting|drawing|photograph|album|sketch|postcard|engraving|etching|lithograph|page|book|scroll|watercolou?r|poster|woodburytype|woodcut|woodblock|mezzotint|aquatint|photogravure|albumen|stereograph|cartoon|carte-de-visite)\b/i;
const flatMaterial = /\b(?:paper|parchment|photographic support|cardboard|canvas)\b/i;
const vesselMaterial = /\b(?:porcelain|stoneware|earthenware|ceramic|silver|bronze|copper|brass|pewter|glass|wood|bamboo|lacquer)\b/i;
const flatMedium = /\b(?:prints?|paintings?|drawing|photograph|woodcut|woodblock|woodburytype|albumen|ink|watercolou?r|gouache|lithograph|etching|canvas|photogravure)\b/i;
const textileNames = /\b(?:robe|textile|fabric|cloth|stole|coat|shawl|tapestry|rug|garment|kimono|costume|embroidery|embroidered|dress|silk panel)\b/i;
const textileMaterial = /\b(?:silk|cotton|wool|linen|textile|velvet|satin|brocade)\b/i;
const teaNames = /\b(?:tea[ -]?(?:pots?|bowls?|cups?|cadd(?:y|ies)|sets?|services?|containers?|canisters?|jars?|chests?|boxes?|utensils?|wares?|kettles?|trays?|scoops?|whisks?|strainers?|holders?|storage jars?|ceremony water jars?)|tea[- ]leaf storage jars?|tea and coffee (?:service|set)|chawan|chaire|mizusashi|chashaku|chasen|natsume|yunomi|kyusu|kyuusu|hōhin|hohin|theepot|theekom|theekop(?:je)?|theeservies|(?:stof)?theebus|teekanne|teeschale|teetasse|théière|teiera|tekanna)\b|茶碗|茶盌|茶入|茶壺|茶壶|茶杯|茶盏|茶道具|水指|茶筅|茶杓/i;
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
  return [artwork.titleEnglish, artwork.materialEnglish, filename].filter(Boolean).join(' | ').replace(/<[^>]*>/g, '').normalize('NFKC');
}

export function classifyTeaware(artwork, reviewed = {}) {
  const evidence = sourceEvidence(artwork);
  const names = [artwork.titleEnglish, artwork.materialEnglish, artwork.objectTypeEnglish].join(' ');
  // Material names in the V&A import are often the actual source object name.
  const primary = [artwork.titleEnglish, artwork.materialEnglish].join(' ');
  const tea = evidence.match(teaNames)?.[0];
  if (artwork.id === 'wiki-89869791' || flatNames.test(artwork.objectTypeEnglish ?? '') ||
    flatMedium.test(artwork.materialEnglish ?? '') ||
    (flatMaterial.test(artwork.materialEnglish ?? '') && !vesselMaterial.test(artwork.materialEnglish ?? '')) ||
    /lacquer on paper/i.test(artwork.materialEnglish ?? '') ||
    (!tea && flatNames.test(primary) && !vesselMaterial.test(artwork.materialEnglish ?? ''))) {
    return { decision: 'reject', reason: 'flat-artwork-or-publication', evidence };
  }
  if (textileNames.test(names.replace(/coat of arms/ig, '')) && (!tea || !vesselMaterial.test(artwork.materialEnglish ?? '')) ||
    (textileMaterial.test(artwork.materialEnglish ?? '') && !vesselMaterial.test(artwork.materialEnglish ?? '') && !tea)) {
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
  try { return decodeURIComponent(value).replace(/^http:/, 'https:').replace(/\/$/, ''); }
  catch { return String(value).replace(/\/$/, ''); }
}
