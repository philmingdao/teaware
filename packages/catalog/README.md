# Catalog Package

This package defines the stable **catalog.v1** format consumed by TV clients (Android TV, tvOS).

## Schema

The catalog schema is defined in [`schema/catalog.v1.schema.json`](./schema/catalog.v1.schema.json).

### Root Object

| Field | Type | Description |
|-------|------|-------------|
| `catalogVersion` | string | Schema version (ISO date, e.g. "2026-09-24") |
| `generatedAt` | string | ISO 8601 timestamp of generation |
| `itemCount` | integer | Total items in catalog |
| `items` | array | Array of CatalogItem objects |

### CatalogItem Fields

Core fields from `Artwork` type plus TV-specific URLs:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Stable unique identifier (e.g., `met-44807`) |
| `titleChinese` | Yes | Chinese title |
| `titleEnglish` | Yes | English title |
| `dynasty` | Yes | Dynasty in Chinese |
| `dynastyEnglish` | Yes | Dynasty in English |
| `period` | No | Specific period if available |
| `date` | Yes | Date or date range |
| `material` | Yes | Material in Chinese |
| `materialEnglish` | Yes | Material in English |
| `objectType` | Yes | Object type in Chinese |
| `objectTypeEnglish` | Yes | Object type in English |
| `kiln` | No | Kiln name in Chinese |
| `kilnEnglish` | No | Kiln name in English |
| `dimensions` | No | Dimensions string |
| `description` | No | Full description |
| `sourceMuseum` | Yes | Museum name in Chinese |
| `sourceMuseumEnglish` | Yes | Museum name in English |
| `accessionNumber` | Yes | Museum accession number |
| `sourceUrl` | Yes | URL to original source |
| `imageUrl` | Yes | Primary image URL (relative to site root) |
| `imageAlt` | Yes | Alt text |
| `license` | Yes | License info |
| `creditLine` | No | Museum credit line |
| `thumbUrl` | Yes | Thumbnail URL for list views |
| `posterUrl` | Yes | Poster URL for detail/slideshow views |

> **Note**: In Phase 1, `thumbUrl` and `posterUrl` equal `imageUrl`. Phase 2 may generate real derivatives.

## Regenerating the Catalog

The catalog is auto-generated at build time. To regenerate manually:

```bash
# From repo root
npm run export-catalog
```

This reads `src/data/artworks.json` and writes `public/catalog.v1.json`.

## Published URL

After deployment to GitHub Pages:

```
https://philmingdao.github.io/teaware/catalog.v1.json
```

## Using in TV Clients

```kotlin
// Android TV example
val catalogUrl = "https://philmingdao.github.io/teaware/catalog.v1.json"

// Fetch and parse
val catalog: CatalogV1 = httpClient.get(catalogUrl).body()

// Access items
catalog.items.forEach { item ->
    // item.titleChinese, item.imageUrl, etc.
}
```

```swift
// tvOS example
let catalogURL = URL(string: "https://philmingdao.github.io/teaware/catalog.v1.json")!

let (data, _) = try await URLSession.shared.data(from: catalogURL)
let catalog = try JSONDecoder().decode(CatalogV1.self, from: data)
```
