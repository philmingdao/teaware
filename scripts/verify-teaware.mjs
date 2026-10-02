// This is the final admission boundary, including for old crawlers that bypass
// the current importer. A contaminated catalogue cannot build or publish.
import fs from 'node:fs/promises';
import { classifyTeaware, normalizedSourceUrl } from './teaware-policy.mjs';

export async function verifyTeaware() {
  const catalogue = JSON.parse(await fs.readFile('src/data/artworks.json', 'utf8'));
  const served = JSON.parse(await fs.readFile('public/artworks.json', 'utf8'));
  if (JSON.stringify(catalogue) !== JSON.stringify(served)) throw new Error('Source/public catalogues disagree');
  const exclusions = JSON.parse(await fs.readFile('research/teaware-exclusions.json', 'utf8'));
  const reviews = JSON.parse(await fs.readFile('research/teaware-admissions.json', 'utf8'));
  const aliases = JSON.parse(await fs.readFile('research/teaware-duplicate-aliases.json', 'utf8'));
  const duplicateIds = new Set(aliases.entries.map(row => row.id));
  const blockedIds = new Set(exclusions.entries.map(row => row.id));
  const blockedUrls = new Set(exclusions.entries.map(row => normalizedSourceUrl(row.sourceUrl)));
  const ids = new Set(), sources = new Set(), failures = [];
  for (const item of catalogue) {
    if (ids.has(item.id)) failures.push(`${item.id}: duplicate ID`);
    ids.add(item.id);
    const source = normalizedSourceUrl(item.sourceUrl);
    if (sources.has(source)) failures.push(`${item.id}: duplicate source object`);
    sources.add(source);
    if (duplicateIds.has(item.id)) failures.push(`${item.id}: removed duplicate alias reintroduced`);
    if (blockedIds.has(item.id) || blockedUrls.has(normalizedSourceUrl(item.sourceUrl))) failures.push(`${item.id}: excluded collection record reintroduced`);
    const result = classifyTeaware(item, reviews);
    if (result.decision !== 'admit') failures.push(`${item.id}: ${result.reason}`);
    const reviewed = reviews[item.id];
    if (reviewed && normalizedSourceUrl(reviewed.sourceUrl).replace('://www.', '://') !== normalizedSourceUrl(item.sourceUrl).replace('://www.', '://')) failures.push(`${item.id}: tea-use review belongs to a different source`);
  }
  if (failures.length) throw new Error(`Tea-only admission failed (${failures.length}):\n${failures.slice(0,30).join('\n')}`);
  if (!catalogue.length) throw new Error('Empty collection');
  const heroText = await fs.readFile('src/data/hero-artworks.ts', 'utf8');
  const hero = JSON.parse(heroText.slice(heroText.indexOf('['), heroText.lastIndexOf(']') + 1));
  const samples = JSON.parse(await fs.readFile('src/data/cutout-samples.json', 'utf8'));
  for (const item of [...hero, ...samples]) if (!ids.has(item.id)) throw new Error(`Removed artwork still shown in hero or sample gallery: ${item.id}`);
  console.log(`Tea-only admission passed: ${catalogue.length} records, ${exclusions.entries.length} exclusions.`);
  return catalogue;
}

if (process.argv[1]?.endsWith('/verify-teaware.mjs')) await verifyTeaware();
