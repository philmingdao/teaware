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

Route: /cutout-gallery/. Transparent stages over a theme-following white/black page; original/transparent/side-by-side views; overhead floor projection with contact shadow and base-anchored hover zoom. Reduced-motion mode disables animations. Review by comparing original decoration and silhouette, then switch to checker/dark surfaces to identify edge halos and residual background. 20 processed assets are the pilot; do not claim all 11,456 images are processed.

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

## Revision: transparent stages and overhead grounding

The user's review removed the warm/dark/checker surface selector. Each image stage now has a transparent background, while the exhibition page follows the site's theme with white (#fff) or black (#000). Original comparisons remain available. The shared header inherits this page's theme locally.

Removed all outline drop shadows and hovering vertical lift. The revised lighting presentation approximates an overhead/front spotlight with a short floor footprint behind the foot and a darker, tighter contact shadow directly at the artifact's base. It does not relight the photograph or reconstruct a 3D artifact. On a pure black surface, black shadows naturally disappear; no white glow or lighter background is added.

Each cutout's opaque alpha geometry is measured by scripts/measure-cutout-grounding.mjs: the bottom contact band gives the actual baseline, foot width and horizontal center. The widest continuous body span gives the broad footprint, excluding detached handle spans. Foot anchoring also sets the hover scaling origin, keeping the artifact on the same plane. Normalization automatically remeasures grounding after producing new assets.

References consulted:

- ERCO, Light for sculptures: museum angle: https://www.erco.com/en_us/knowledge/culture/light-for-sculptures-museum-angle/ (overhead directional illumination and shadow modelling).
- Physically Based Rendering, Area Lights: https://pbr-book.org/4ed/Light_Sources/Area_Lights (soft penumbrae from extended light sources).

These references inform the 2D presentation; CSS ellipses are not a physically accurate shadow reconstruction from a single photograph. Cutout and original image bytes remain unchanged in this revision.

Revision validation: targeted ESLint and Next static build passed. Browser confirmed transparent backgrounds for every image stage, #fff/#000 theme surfaces, no outline filters on all 20 cutouts, 40 floor/contact shadow spans when enabled and zero when disabled, keyboard toggle, 40 images in comparison mode and no horizontal overflow at 390px. The mobile navigation icon also follows the page theme. SHA-256 checks confirmed that all 40 image files stayed unchanged.
