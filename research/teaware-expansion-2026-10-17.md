# Tea-only cutout gallery expansion — 2026-10-17

**Baseline:** 5,302 reviewed transparent WebP cutouts on `main`.
**Added:** 16 reviewed transparent cutouts (DigitaltMuseum, key-free CC BY / CC BY-SA / CC0 / PDM).
**New total:** 5,318. `remainingTo6000` = 682.

This is a small, conservative, high-quality round. The available key-free / open-license
headroom in the reviewed pipeline sources is now largely exhausted; the round documents
why a larger batch was not achievable this run.

## Pipeline followed (no parallel catalogue format)

1. **Smithsonian Open Access** (`SMITHSONIAN_API_KEY` was available in the environment).
   `scripts/stage-smithsonian-expansion.mjs` queries the `api.si.edu` search API for
   tea-vessel terms, filters to unit `NMAA` (Freer/Sackler Asian Art), requires
   `metadata_usage.access === 'CC0'`, a `High-resolution JPEG` resource with longest
   edge ≥ 1200 px, a native title that admits via `classifyTeaware`, and excludes
   spoon-like tools. Result: **0 net-new**.
   - 8,948 rows scanned across 64 queries; 5,200 rejected as `not-asian-art` (NMAH),
     114 as `duplicate-id` (the 114 Freer/Sackler tea-named CC0 items are already in the
     catalogue), 26 as `native-title-not-admit` (titles like "Bowl", "Serving bowl",
     "Jar", "Pipe bowl", "Tomb model…", "Ritual wine ewer…" — correctly excluded by
     the tea-only policy because the source title carries no tea-use evidence).
   - Conclusion: the Freer/Sackler tea-named CC0 corpus is fully harvested; the
     remaining NMAA CC0 items lack tea-use evidence and are out of scope.
2. **DigitaltMuseum (dimu)** — key-free `demo` Solr API.
   - `scripts/discover-dimu-teaware.py` (query: Tekanna/Tekopp/Tedosa/Teburk/Chawan/…)
     → 1,304 docs; `scripts/fetch-stage-dimu-expansion.mjs` fetches full records via
     `api.dimu.org/artifact/uuid/<uuid>`, downloads `ems.dimu.org/image/<id>?dimension=1200x1200`,
     normalises with sharp, dedupes by id / url / physicalObjectKey / source hash, and
     stages in the contract verified by `scripts/verify-staged-teaware.mjs` (dimu- branch).
   - **22 staged**, **16 approved** after cutout QA. Rejections: 316 `duplicate-id`
     (already in catalogue/exclusions/aliases/prior), 295 `record-rights-excluded`
     (CC BY-NC-ND / other restrictive licences — correctly skipped), 37
     `no-tea-vessel-type`, 4 `duplicate-normalized-hash`, 2 toy/fragment, 2
     contradictory-date.
   - A second discovery pass with extra terms (Teservis / Tevarmer / Tekrus / Temugg / …)
     found 131 net-new by id but **0** passed staging: 74 `record-rights-excluded`,
     2 `duplicate-normalized-hash`, 2 toy, 3 no-tea-vessel-type. dimu open-license
     tea-vessel headroom is now exhausted.
3. **Cutout** — `scripts/process-collection-cutouts.py` with the official
   `BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx` (md5
   `4fab47adc4ff364be1713e97b7e66334`, downloaded from the rembg release mirror),
   CPU `CPUExecutionProvider`, 4 threads. Mask + export settings identical to the
   published pipeline (`mask-v2-flat-preservation`, `webp-v1-adaptive`, 1200 px
   canvas, 10% margin, quality 88 adaptive). 22/22 processed with zero errors.
4. **Review** — `scripts/review-staged-cutouts.mjs` wrote an original/cutout
   comparison sheet. Each candidate's automated QA was checked: `qa.flags.length === 0`,
   `alphaLossless`, `rgbUnchangedBeforeResize`, transparent perimeter, real opaque
   foreground, encoding RMSE. 16 candidates had zero QA flags and were approved; 6
   were rejected (5 `multiple-components`, 1 `source-border-contact`) under a
   conservative quality bar. A sample of approved pairs was visually inspected
   (teacup+saucer, pewter teapot with wrapped handle, etc.) — silhouettes, handles,
   spouts, feet and decoration are retained with no background residue.
5. **Integrate** — `scripts/integrate-approved-teaware-expansion-2026-10-17.mjs`
   re-verifies hashes, policy admission, spoon exclusion, dedup, asset integrity and
   the 800 MiB transparent-asset budget before copying originals to `public/artworks/`
   and cutouts to `public/collection-cutouts/`, then rewrites
   `src/data/artworks.json`, `public/artworks.json` and
   `src/data/collection-cutouts.json`. Full provenance written to
   `research/teaware-expansion-2026-10-17.json`.

## Added museums / counts

| Museum | Count |
|--------|-------|
| Skansen | 3 |
| Vänersborgs museum | 3 |
| Norsk Folkemuseum | 2 |
| SJÖHISTORISKA MUSEET | 2 |
| Tekniska museet | 2 |
| Fyresdal Bygdemuseum | 1 |
| Oslo Museum | 1 |
| Kulturparken Småland/Smålands museum | 1 |
| Länsmuseet Gävleborg | 1 |

## Added object types

| Type | Count |
|------|-------|
| Teapot | 8 |
| Tea Cup | 5 |
| Tea Caddy | 3 |

No spoons, scoops, strainers or whisks were added (policy `isSpoonLikeTeaware` gate).

## Blocked / not pursued

- **Smithsonian** — exhausted for tea-named NMAA CC0 items (114 already in catalogue).
- **Harvard** (`HARVARD_API_KEY` was available) — not pursued: licence is CC-BY-NC
  (non-commercial), more restrictive than the CC0/CC-BY/PD sources used in the reviewed
  pipeline, and `verify-staged-teaware.mjs` has no harvard- branch. Adding it would
  require a new staging contract and a more restrictive licence display.
- **Rijksmuseum / NPM Taiwan / ColBase / NMK / eMuseum** — need API keys not present
  in the environment (`RIJKSMUSEUM_API_KEY`, `NPM_TAIWAN_API_KEY`, `COLBASE_API_KEY`,
  `NMK_API_KEY`).
- **dimu** — open-license tea-vessel headroom now exhausted (second pass: 0 net-new).
- **Model weights** — BiRefNet ONNX downloaded successfully; no quota issue.
- **No JPEG-only / pre-cutout / Round 15–26 expand scripts** were used as the publish
  path; every new id has a reviewed transparent cutout in `collection-cutouts.json`
  and a matching public WebP.

## Why only 16 (not 400–700)

The catalogue is already heavily curated (5,302 of a 6,000 goal). The two key-free
sources with headroom this run were Smithsonian (exhausted: 0 net-new) and dimu
(exhausted after this round: 16 net-new, the rest blocked by restrictive licences
or already in catalogue/exclusions). Reaching 400–700 would require API keys for
the East Asian national museums (NPM Taiwan, NMK, ColBase) listed in
`research/help-needed-keys.md`, which are not present in this environment.
