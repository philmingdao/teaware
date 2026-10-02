// Apply a reviewable, source-based catalogue cleanup. Originals are recoverable
// through Git LFS history; a full local metadata snapshot precedes any change.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { classifyTeaware, POLICY_VERSION } from './teaware-policy.mjs';

const dry = !process.argv.includes('--apply');
const old = JSON.parse(await fs.readFile('src/data/artworks.json', 'utf8'));
const reviews = JSON.parse(await fs.readFile('research/teaware-admissions.json', 'utf8'));
const beforeHash = crypto.createHash('sha256').update(JSON.stringify(old)).digest('hex');
const decisions = old.map(artwork => ({ artwork, result: classifyTeaware(artwork, reviews) }));
const keep = decisions.filter(row => row.result.decision === 'admit').map(row => row.artwork);
const removed = decisions.filter(row => row.result.decision !== 'admit');
const paths = new Set(keep.map(row => row.imageUrl));
for (const { artwork } of removed) {
  if (artwork.imageUrl !== `/artworks/${artwork.id}.jpg` || !/^[\p{L}\p{N}_.-]+$/u.test(artwork.id)) throw new Error('Noncanonical deletion path: ' + artwork.id);
}
const summary = { policy: POLICY_VERSION, before: old.length, kept: keep.length, removed: removed.length,
  confirmedOutOfScope: removed.filter(row => row.result.decision === 'reject').length,
  teaUseUnverified: removed.filter(row => row.result.decision === 'review').length };
console.log(JSON.stringify({ ...summary, dryRun: dry }, null, 2));
if (dry) process.exit(0);
await fs.mkdir('output/collection-curation', { recursive: true });
await fs.writeFile(`output/collection-curation/artworks-before-${beforeHash}.json`, JSON.stringify(old, null, 2) + '\n');
const prior = JSON.parse(await fs.readFile('research/teaware-exclusions.json', 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '{"entries":[]}';
  throw error;
}));
const entries = new Map(prior.entries.map(row => [row.id, row]));
for (const { artwork, result } of removed) {
  const bytes = await fs.readFile(`public${artwork.imageUrl}`);
  entries.set(artwork.id, { id: artwork.id, titleEnglish: artwork.titleEnglish,
    objectTypeEnglish: artwork.objectTypeEnglish, materialEnglish: artwork.materialEnglish,
    sourceUrl: artwork.sourceUrl, sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    reason: result.reason, evidence: result.evidence });
}
await fs.writeFile('research/teaware-exclusions.json', JSON.stringify({ version: 1, ...summary,
  beforeCatalogueSha256: beforeHash, entries: [...entries.values()] }, null, 2) + '\n');
const serialized = JSON.stringify(keep, null, 2) + '\n';
await fs.writeFile('src/data/artworks.json', serialized);
await fs.writeFile('public/artworks.json', serialized);
for (const { artwork } of removed) if (!paths.has(artwork.imageUrl)) await fs.unlink(`public${artwork.imageUrl}`);
// Remove stale approved mappings as well as catalogue rows.
const registry = JSON.parse(await fs.readFile('src/data/collection-cutouts.json', 'utf8'));
const ids = new Set(keep.map(row => row.id));
registry.assets = Object.fromEntries(Object.entries(registry.assets).filter(([id]) => ids.has(id)));
await fs.writeFile('src/data/collection-cutouts.json', JSON.stringify(registry) + '\n');
