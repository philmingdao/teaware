import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { classifyTeaware, POLICY_VERSION } from './teaware-policy.mjs';

const artworks = JSON.parse(await fs.readFile('src/data/artworks.json', 'utf8'));
const reviews = JSON.parse(await fs.readFile('research/teaware-admissions.json', 'utf8'));
const rows = artworks.map(artwork => ({ id: artwork.id, titleEnglish: artwork.titleEnglish,
  objectTypeEnglish: artwork.objectTypeEnglish, materialEnglish: artwork.materialEnglish,
  sourceUrl: artwork.sourceUrl, imageUrl: artwork.imageUrl, ...classifyTeaware(artwork, reviews) }));
const summary = { policy: POLICY_VERSION, total: rows.length,
  decisions: Object.fromEntries(['admit', 'reject', 'review'].map(key => [key, rows.filter(row => row.decision === key).length])),
  reasons: Object.fromEntries([...new Set(rows.map(row => row.reason))].map(key => [key, rows.filter(row => row.reason === key).length])),
  catalogueSha256: crypto.createHash('sha256').update(JSON.stringify(artworks)).digest('hex') };
await fs.mkdir('output/collection-curation', { recursive: true });
await fs.writeFile('output/collection-curation/audit.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
