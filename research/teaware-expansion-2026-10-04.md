# Teaware collection expansion — 2026-10-04

The collection contains **3,000 museum records with 3,000 distinct reviewed transparent images**. From the prior 2,000-record release, this round retains 1,927, adds 1,073, and removes 73; net growth is 1,000.

## Sources added

| Museum | Added |
| --- | ---: |
| Rijksmuseum | 424 |
| Kyoto National Museum | 76 |
| Kyushu National Museum | 20 |
| Nara National Museum | 7 |
| Tokyo National Museum | 382 |
| Musée Cernuschi | 96 |
| The Metropolitan Museum of Art | 46 |
| Minneapolis Institute of Art | 1 |
| Musée de la Vie romantique | 13 |
| Petit Palais | 8 |

## Admission and image review

- Museum title, original-language name and material evidence must establish tea use. Prints, pages, textiles, display scenes, support stands, fragments and explicitly non-tea objects are excluded.
- Full museum accession numbers and source URLs identify objects. This round resolves 55 mirror, assembly or aggregate overlaps; excludes two explicitly non-tea records; and withdraws 16 old single-object records illustrated by shared service/group photographs.
- Every addition has source metadata and original-image SHA-256 evidence, an image-specific public-domain/CC0/CC BY record, and a native source dimension of at least 1,200 pixels on its longest edge. Permissions remain per record; the collection is not uniformly CC0.
- ColBase credits retain attribution and identify background removal/cropping. Undated objects admitted on documented historical-maker evidence keep their date unknown.
- Local BiRefNet predicts only the alpha mask. Original RGB is retained before resizing; export uses a centered 1,200 × 1,200 transparent WebP canvas with margin. No generative repainting is used.
- Review decisions are pinned to the exact candidate hash. Final checks cover alpha presence, clear borders, original/candidate hashes, source identity, tea admission and exclusions. Selected masks are visually reviewed against their originals; rejected imagery and uncertain candidates are withheld.
- One approved object remains in reserve. No reserve contributes to the published count.

## Verification

- Tea-use and object-identity tests: 9 passing tests.
- Final catalogue admission: 3,000 records passed.
- Changed JavaScript tools: ESLint passed.
- Production build and TypeScript checks: see the release workflow for the exact published commit. Local validation uses webpack because the shared dependency directory is outside this checkout; CI uses the standard project build.
- The static package must contain exactly 3,000 approved WebP references and real image bytes, exclude original-photo output, and remain below the GitHub Pages artifact limit.

The machine-readable audit is [teaware-expansion-2026-10-04.json](./teaware-expansion-2026-10-04.json). Earlier baseline and alias/exclusion reports preserve the removed records and reasons. Staging files and full-resolution source downloads remain local under ignored output/round29-* directories.
