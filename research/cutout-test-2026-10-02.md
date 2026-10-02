# Transparent cutout pilot · 2026-10-02

## Scope

20 existing catalog photographs from the Metropolitan Museum of Art, Cleveland Museum of Art and Minneapolis Institute of Art. Selected samples include dark stoneware, white porcelain, celadon, Yixing clay, silver, cloisonné, loop handles, pierced stands and museum case backgrounds. Titles and descriptions reuse the previously reviewed hero and Round 27 museum metadata; every sample links to its official object record. No originals are replaced.

## Batch pipeline prepared

The proposed scalable route generates a foreground alpha mask using BiRefNet General Lite, applies that mask to the original RGB pixels, then normalizes the crop. It does not synthesize a new photograph. This segmentation route is a prepared proposal, not the executed pilot. The optional route question did not receive a reply, so the default built-in imagegen route was used for this preview. No segmentation benchmark or pixel-preservation claim is made for these images.

- Official model: https://github.com/ZhengPeng7/BiRefNet (MIT).
- ONNX export: https://github.com/danielgatis/rembg/blob/main/rembg/sessions/birefnet_general_lite.py
- Model download: https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx
- Size: 224,005,088 bytes. Verified upstream MD5: 4fab47adc4ff364be1713e97b7e66334.
- Preprocessing: upstream rembg BiRefNet mean/std normalization at 1024 square; apply sigmoid to logits, normalize and resize mask to original dimensions.
- Model loaded once per batch, CPU threading configurable; mask results cached for review and subsequent exports.
- Alpha <=12 is cleared; alpha >=244 is opaque. Use alpha >=16 to identify a foreground bounding box.
- Longest side occupies 80% of a 1200px square. Center on both axes, keep at least 10% margin, preserve aspect ratio.
- Lossless WebP export; original full-size RGBA intermediates retained locally for detailed review.
- Verify RGB pixels are unchanged before resizing, transparent perimeter, crop centering and source metadata. Model masks still require visual review for thin handles, perforations, reflections and cast shadows.

## Preview

Route: /cutout-gallery/. Warm-white, dark-gray and checker surfaces; original/transparent/side-by-side views; adjustable CSS projection with contact shadow and restrained hover lift. Reduced-motion mode disables animations. Review by comparing original decoration and silhouette, then switch to checker/dark surfaces to identify edge halos and residual background. 20 processed assets are the pilot; do not claim all 11,456 images are processed.

## Reproduce the preview packaging

Sample manifest: research/cutout-test-inputs.json. Original high-resolution museum references live under output/hero-originals; obtain them from the cited museum records if absent. Extracted alpha PNGs are local intermediate assets: output/hero-cutouts/<id>.png for the reused ten, output/cutout-test/generated/<id>.png for the new ten. Exact imagegen prompt and IDs are stored in research/cutout-test-prompt.json. Original source photos are retained; the public comparison WebPs are resized copies.

After extraction, run:

    node scripts/normalize-cutout-samples.mjs

Models and full-resolution intermediate images are not committed. Public originals and normalized cutouts are at public/cutout-test/originals and public/cutout-test/objects.

## Executed pilot and limitations

- 10 existing imagegen hero cutouts were reused; 10 additional Mia images were processed separately with the built-in imagegen tool, transparent_background=true.
- Exact prompt and source IDs: research/cutout-test-prompt.json.
- All 20 were normalized with scripts/normalize-cutout-samples.mjs.
- All 20 have alpha, fully transparent perimeter, centered foreground and at least 10% margin; dimensions 1200 x 1200.
- Final cutouts total 12,278,562 bytes; comparison originals total 2,319,906 bytes.
- Warm and dark contact sheets reviewed; handles and external openings have no obvious residual photographic backdrop at gallery scale.
- Generative background extraction can change decoration, glaze highlights or proportions. These are presentation samples, not documentary substitutes. The page explicitly marks AI samples and keeps official-source comparisons.
- The dedicated BiRefNet batch route was not executed: local dependency downloads timed out and the optional route choice remained unanswered. Do not present this pilot as validation of that model or estimate its throughput from imagegen.
- Full catalog processing remains out of scope for this pilot. Proposed next step: select the mask route, benchmark the same 20 original photos, compare RGB fidelity and silhouettes, then batch in stages with cached masks and a review queue for difficult backgrounds.

## Validation

Alpha/crop checks: research/cutout-test-asset-checks.json. Targeted ESLint and Next static production build passed. Local browser confirmed 20 articles, 20 images in cutout view, 40 images in comparison view, dark/checker surfaces, keyboard projection toggle and a 390px mobile layout without horizontal overflow. Projection animates for 600ms; after the transition completes all cutout filters are none when switched off. Live asset checks are saved locally at output/cutout-test/live-checks.json after deployment.
