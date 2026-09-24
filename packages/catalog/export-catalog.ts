#!/usr/bin/env npx tsx
/**
 * Catalog Export Script
 *
 * Reads the existing artwork dataset from src/data/artworks.json and generates
 * catalog.v1.json for TV clients (Android TV, tvOS).
 *
 * Usage:
 *   npx tsx packages/catalog/export-catalog.ts
 *
 * Output:
 *   public/catalog.v1.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface Artwork {
  id: string;
  titleChinese: string;
  titleEnglish: string;
  dynasty: string;
  dynastyEnglish: string;
  period?: string;
  date: string;
  material: string;
  materialEnglish: string;
  objectType: string;
  objectTypeEnglish: string;
  kiln?: string;
  kilnEnglish?: string;
  dimensions?: string;
  description: string;
  sourceMuseum: string;
  sourceMuseumEnglish: string;
  accessionNumber: string;
  sourceUrl: string;
  imageUrl: string;
  imageAlt: string;
  license: string;
  creditLine?: string;
  crawlBatchId?: string;
}

interface CatalogItem extends Omit<Artwork, 'crawlBatchId'> {
  thumbUrl: string;
  posterUrl: string;
}

interface CatalogV1 {
  catalogVersion: string;
  generatedAt: string;
  itemCount: number;
  items: CatalogItem[];
}

const CATALOG_VERSION = '2026-09-24';

function main() {
  const repoRoot = path.resolve(__dirname, '../..');
  const artworksPath = path.join(repoRoot, 'src/data/artworks.json');
  const outputPath = path.join(repoRoot, 'public/catalog.v1.json');

  console.log(`Reading artworks from: ${artworksPath}`);

  if (!fs.existsSync(artworksPath)) {
    console.error(`Error: Artworks file not found at ${artworksPath}`);
    process.exit(1);
  }

  const artworksRaw = fs.readFileSync(artworksPath, 'utf-8');
  const artworks: Artwork[] = JSON.parse(artworksRaw);

  console.log(`Found ${artworks.length} artworks`);

  const catalogItems: CatalogItem[] = artworks.map((artwork) => {
    const { crawlBatchId, ...rest } = artwork;

    return {
      ...rest,
      thumbUrl: artwork.imageUrl,
      posterUrl: artwork.imageUrl,
    };
  });

  const catalog: CatalogV1 = {
    catalogVersion: CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    itemCount: catalogItems.length,
    items: catalogItems,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf-8');

  console.log(`Catalog written to: ${outputPath}`);
  console.log(`  - Version: ${catalog.catalogVersion}`);
  console.log(`  - Items: ${catalog.itemCount}`);
  console.log(`  - Generated at: ${catalog.generatedAt}`);

  const stats = fs.statSync(outputPath);
  console.log(`  - File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

main();
