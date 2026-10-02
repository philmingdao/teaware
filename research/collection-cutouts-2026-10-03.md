# Full collection foreground processing

User approved local segmentation rather than generative background extraction on 2026-10-02/03. The required presentation is transparent imagery, centered with appropriate empty margin, white/black theme surfaces and short overhead floor/contact shadows. Cover, gallery cards and detail images share one approved asset registry. Source RGB is preserved; non-teaware catalogue rows and their canonical publication assets are removed by the separate tea-only curation.

## Inventory actually measured

`node scripts/inventory-cutouts.mjs` reads only the 11,456 canonical catalogue paths, verifies that each is a decodable photograph rather than a Git LFS pointer, and stores original SHA-256, dimensions, museum and catalogue ID. All 11,456 decoded successfully after `git lfs pull`. There are 11,369 unique source hashes and 87 exact duplicates. Canonical originals total 628,294,955 bytes (~599 MiB). Unrelated cloud-sync copies in the directory are excluded from processing.

## Pipeline and quality contract

1. Use the original RGB photograph and BiRefNet General Lite only to calculate alpha. No generative repainting, colour adjustment or texture synthesis. The full run uses the official ZhengPeng7/BiRefNet_lite safetensors revision `aa62cd87eafb9cc43056d08ef3615a14628b831d`, SHA-256 `4417d89795250e698c3cb0ae8df15743810065f646f48a694fdfa7ca052d0815`. It runs offline on Apple MPS with FP16. The independent rembg ONNX comparison model was verified against upstream MD5 `4fab47adc4ff364be1713e97b7e66334`. Runtime dependencies are pinned in `scripts/cutout-requirements.txt`.
2. Cache masks by source hash + model hash + preprocessing version. Cache exports by the same hashes plus canvas, margin and encoding settings. SQLite stores each catalogue ID independently. Commit a record after every image, checkpoint results every 50 images, and continue past errors. Re-running reuses successful candidates without inference.
3. Crop the alpha bounds, preserve aspect ratio, center on a 1200px transparent square and leave at least 10% margin. Never upscale a low-resolution crop to fake detail. Preserve source RGB exactly before resampling; keep source and original-resolution alpha so a lossless master can be reconstructed.
4. Encode WebP quality 88, adaptively raising to 92/96/100 when needed, with lossless alpha. Verify alpha byte-for-byte after decoding, transparent perimeter, real opaque foreground, and foreground RGB encoding RMSE. Images with large encoding error require repair. These metrics validate technical properties; they do not prove the silhouette is semantically correct.
5. Flag very small/large foreground masks, original-border contact, uncertain alpha, narrow subjects, multiple substantial components and low-resolution sources. Do not automatically delete components: disconnected cups, lids and accessories may belong to the work. Do not pretend a CSS shadow can recover a cropped foot or relight the source photograph. Disable the single floor shadow for multiple-component sets.
6. Generate sheets of 20 original/candidate pairs and full-size comparison HTML for visual review. Check the outline, thin handles, pierced openings, original decoration, bottom contact, pedestal/case remnants and light/dark edge halos. Automated checks cannot guarantee these; each candidate needs explicit review or repair before publication.
7. Approval pins catalogue ID, cache key and candidate SHA-256, with review notes. Publication verifies source/candidate hashes and alpha again. Missing, rejected or stale approvals block the complete release. No unreviewed candidate is silently presented as a finished artifact.

## Commands

    python -m venv output/collection-cutouts/runtime
    output/collection-cutouts/runtime/bin/python -m pip install -r scripts/cutout-requirements.txt
    node scripts/inventory-cutouts.mjs
    python scripts/process-collection-cutouts.py --model /path/to/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx --inputs output/collection-cutouts/pilot-inputs.json --output output/collection-cutouts/pilot
    node scripts/review-collection-cutouts.mjs output/collection-cutouts/pilot

Then process the complete inventory with the benchmarked provider/thread count. Do not estimate elapsed time from the old imagegen pilot. `progress.json`, `events.jsonl`, `state.sqlite`, `results.json`, masks and candidates live under ignored `output/collection-cutouts/`.

`approvals.json` entries have `id`, `cacheKey`, `candidateSha256`, `decision` (`approve`/`reject`) and `notes`. `node scripts/publish-collection-cutouts.mjs` requires all catalogue entries to have current approvals, then writes `src/data/collection-cutouts.json` and unique transparent WebPs under `public/collection-cutouts/`.

## Page integration and size budget

`withCollectionImage` resolves approved images for the shared catalogue and fetched detail data. `ArtifactImage` provides transparent stages and measured floor/contact shadows for the hero, cards and details. TV and slideshow consume the resolved catalogue; TV uses contain rather than cropping square normalized assets to a wide frame. Full collection publication requires complete coverage, not a partial success banner.

Keep originals in Git LFS and the local archive. Once the complete registry is approved, the build packager removes only the original-image directory from disposable `out/`, rewrites the served catalogue to transparent paths and checks that all expected transparent files exist. The publisher budgets at most 800 MiB for unique cutouts, leaving space for the rest of the site beneath the existing 950 MiB CI ceiling / GitHub Pages 1 GB limit. Source files are never deleted by packaging.

## Primary references

- BiRefNet official implementation and model variants: https://github.com/ZhengPeng7/BiRefNet
- Upstream preprocessing and ONNX download/checksum: https://github.com/danielgatis/rembg/blob/main/rembg/sessions/birefnet_general_lite.py
- Published site limit: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Measured execution and current status

Apple M5 / 24 GiB: the 20-image warm FP16 sample averages 0.58 seconds for inference and export, with lower throughput on broader batches. Batch size 1 is faster than batch size 4. CPU/FP16 minimum mask IoU was 0.998844; FP32/FP16 minimum IoU 0.999666. These comparisons verify numerical consistency, not silhouette correctness.

The 90-item stratified encoding sample averages 67.39 KiB at quality 88 with lossless alpha. Review found non-teaware media and artifacts mislabelled by old importers, plus genuine segmentation errors (e.g. white porcelain lid and pot interior). Those errors require repair and current visual approval.

The 11,456-image run was stopped after 191 local candidates, none published. Tea-only cleanup retains 1,451 entries (1,442 unique source images, 63,412,576 original bytes); see [curation](teaware-curation-2026-10-03.md). Generation resumes against that inventory. The registry remains unpublished until the entire remaining catalogue is reviewed. No full-collection transparent release is claimed at this checkpoint.
