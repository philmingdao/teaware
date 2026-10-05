// Institution + full museum object number identifies a physical object across
// official records and licensed mirrors. Keep all part suffixes and separators.
const institutions = new Map([
  ['Hallwylska museet', 'hallwyl'],
  ['Hallwylska Museum', 'hallwyl'],
  ['Rijksmuseum', 'rijksmuseum'],
  ['The Metropolitan Museum of Art', 'met'],
  ['Metropolitan Museum of Art', 'met'],
  ['Cleveland Museum of Art', 'cma'],
  ['The Cleveland Museum of Art', 'cma'],
  ['Minneapolis Institute of Art', 'mia'],
  ['Art Institute of Chicago', 'aic'],
  ['Cooper Hewitt, Smithsonian Design Museum', 'cooper-hewitt'],
  ['National Museum of American History', 'nmah'],
  ['Smithsonian National Museum of Asian Art', 'smithsonian-nmaa'],
  ['Smithsonian National Museum of Asian Art (Freer|Sackler)', 'smithsonian-nmaa'],
  ['Freer Gallery of Art', 'smithsonian-nmaa'],
  ['Arthur M. Sackler Gallery', 'smithsonian-nmaa'],
]);
export function canonicalInstitution(row) {
  const name = String(row.sourceMuseumEnglish || '').normalize('NFKC').trim();
  // Commons is a media host, not a collecting institution. Unknown identities
  // must be resolved from source evidence instead of assigning one Commons key.
  if (!name || name === 'Wikimedia Commons') return undefined;
  return institutions.get(name) || `museum:${name.toLowerCase()}`;
}
export function normalizedAccession(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, '').toUpperCase();
}
export function physicalObjectKey(row) {
  const institution = canonicalInstitution(row);
  let accession = normalizedAccession(row.accessionNumber);
  // Older catalog rows prefixed Freer/Sackler accession numbers with `fsg_`.
  // That prefix is a source-system namespace, not part of the museum number.
  if (institution === 'smithsonian-nmaa') accession = accession.replace(/^FSG[_-]?/, '');
  if (!institution || !accession) return undefined;
  if (institution === 'rijksmuseum' && !/^[A-Z]+(?:-[A-Z0-9]+)+$/.test(accession)) return undefined;
  return `${institution}|${accession}`;
}
export function rijksObjectNumber(object) {
  return (object.identified_by || []).find(item => item.type === 'Identifier' && item.classified_as?.some(type => ['https://id.rijksmuseum.nl/22015218', 'http://vocab.getty.edu/aat/300312355'].includes(type.id)))?.content;
}
export function linkedArtNotation(entity) {
  const terms = entity?.notation ? (Array.isArray(entity.notation) ? entity.notation : [entity.notation]) : [];
  const names = (entity?.identified_by || []).filter(item => item.type === 'Name');
  const term = terms.find(item => item['@language'] === 'en') || terms[0];
  const name = names.find(item => item.language?.some(language => language.id?.includes('300388277'))) || names[0];
  return String(entity?._label || term?.['@value'] || term?.content || name?.content || '');
}
