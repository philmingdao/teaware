# Museum Open Access Survey for Chinese Tea Ware

Last updated: 2026-09-13 (Round 2 Update)  
Purpose: Document worldwide museum collections with Chinese/East Asian tea ware and open access image policies for the 器·茶 gallery project.

## Current Collection Status

| Source | Artworks | Images | Status |
|--------|----------|--------|--------|
| Metropolitan Museum of Art | 693 | ✅ Self-hosted | Active |
| Cleveland Museum of Art | 307 | ✅ Self-hosted | Active |
| Wikimedia Commons | 52 | ✅ Self-hosted | Active |
| **Total** | **1,052** | **All local** | - |

All images have been downloaded and self-hosted under `public/artworks/{id}.jpg` (no external hotlinking).

---

## Round 1: Key-Free Sources (Active)

### 1. The Metropolitan Museum of Art (Met)
- **Country**: USA (New York)
- **Open Access Policy**: CC0 / Public Domain for `isPublicDomain: true` objects
- **API Documentation**: https://metmuseum.github.io/
- **API Endpoint**: `https://collectionapi.metmuseum.org/public/collection/v1/`
- **Authentication**: None required (fully open)
- **Tea Ware Relevance**: HIGH - Extensive Chinese ceramics collection including Song dynasty Jian ware, Yixing purple clay, Qing porcelain
- **Estimated Inventory (probed 2026-09-13)**:
  - `tea bowl China`: ~426 results
  - `tea cup China`: ~230 results
  - `porcelain bowl China`: ~1,278 results
  - `wine cup China`: ~436 results
  - `stoneware bowl China`: ~319 results
  - `Yixing`: ~130 results
  - `tenmoku`: ~129 results
  - `gaiwan`: ~128 results
  - `Song dynasty bowl`: ~959 results
  - `Ming dynasty cup`: ~2,169 results
  - `Qing dynasty teapot`: ~6,576 results
  - `Chinese ceramics bowl`: ~2,620 results
- **License Caveats**: Only `isPublicDomain: true` objects can be used; many objects are rights-restricted
- **Image Quality**: High-quality original images available via `primaryImage` field
- **Status**: ✅ ACTIVE - Used in Round 1
- **Notes**: Best single source for Song/Ming/Qing tea ware. Need to filter by `isPublicDomain` and `primaryImage` existence.

### 2. Cleveland Museum of Art (CMA)
- **Country**: USA (Ohio)
- **Open Access Policy**: CC0 / Public Domain for `share_license_status: "CC0"` objects
- **API Documentation**: https://openaccess-api.clevelandart.org/
- **API Endpoint**: `https://openaccess-api.clevelandart.org/api/artworks/`
- **Authentication**: None required (fully open)
- **Tea Ware Relevance**: MEDIUM-HIGH - Good Chinese ceramics collection, particularly Yixing ware
- **Estimated Inventory (probed 2026-09-13)**:
  - `teapot`: ~121 results
  - `tea bowl`: ~85 results
  - `Chinese ceramics`: ~981 results
- **License Caveats**: Check `share_license_status` field; prefer CC0
- **Image Quality**: Web-quality images via `images.web.url`
- **Status**: ✅ ACTIVE - Used in Round 1
- **Notes**: Good source for Yixing and export porcelain tea ware.

### 3. Art Institute of Chicago (AIC)
- **Country**: USA (Illinois)
- **Open Access Policy**: CC0 for data, CC-BY for descriptions
- **API Documentation**: https://api.artic.edu/docs/
- **API Endpoint**: `https://api.artic.edu/api/v1/artworks/`
- **Authentication**: None required (fully open)
- **Tea Ware Relevance**: HIGH - Strong East Asian collection with Chinese and Japanese tea ware
- **Estimated Inventory (probed 2026-09-13)**:
  - General teapot search: ~132,744 total (needs filtering)
  - Chinese tea bowl with `is_public_domain: true`: Several hundred
- **License Caveats**: Check `is_public_domain` field; IIIF images available
- **Image Quality**: IIIF images at `https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg`
- **Status**: ✅ ACTIVE - Used in Round 1
- **Notes**: Strong Japanese tea ware collection too. Use `place_of_origin` to filter Chinese items.

---

## Round 1: Needs API Key (Deferred)

### 4. Rijksmuseum
- **Country**: Netherlands (Amsterdam)
- **Open Access Policy**: CC0 for many Dutch Golden Age works; varies for Asian art
- **API Documentation**: https://data.rijksmuseum.nl/object-metadata/api/
- **API Endpoint**: `https://www.rijksmuseum.nl/api/en/collection`
- **Authentication**: Free API key required (register at https://data.rijksmuseum.nl/)
- **Tea Ware Relevance**: MEDIUM - Some Chinese export porcelain and tea ware
- **Estimated Inventory**: Unknown - needs key to probe
- **License Caveats**: Check rights per object
- **Status**: 🔑 NEEDS_KEY - No key in environment
- **Notes**: Good for Dutch trade-era Chinese export porcelain tea sets.

### 5. Smithsonian Open Access (Freer/Sackler)
- **Country**: USA (Washington DC)
- **Open Access Policy**: CC0 for many objects
- **API Documentation**: https://api.si.edu/openaccess/api/v1.0/
- **API Endpoint**: `https://api.si.edu/openaccess/api/v1.0/search`
- **Authentication**: API key required from api.data.gov
- **Tea Ware Relevance**: HIGH - Freer/Sackler has excellent Chinese ceramics collection
- **Estimated Inventory**: Thousands of Chinese ceramics expected
- **License Caveats**: Check `freeAccess` field
- **Status**: 🔑 NEEDS_KEY - No key in environment
- **Notes**: Would be excellent source for high-quality Chinese tea ware once key obtained.

### 6. Harvard Art Museums
- **Country**: USA (Massachusetts)
- **Open Access Policy**: CC-BY-NC for images with waiver for some
- **API Documentation**: https://github.com/harvardartmuseums/api-docs
- **API Endpoint**: `https://api.harvardartmuseums.org/`
- **Authentication**: API key required (free registration)
- **Tea Ware Relevance**: MEDIUM - Some Chinese ceramics in collection
- **Estimated Inventory**: Unknown - needs key to probe
- **License Caveats**: CC-BY-NC requires attribution
- **Status**: 🔑 NEEDS_KEY - No key in environment
- **Notes**: Good scholarly metadata; license more restrictive than CC0.

### 7. National Palace Museum (台北故宫)
- **Country**: Taiwan (Taipei)
- **Open Access Policy**: CC0/CC-BY for digital archive images
- **API Documentation**: https://openapi.npm.gov.tw/ (Chinese)
- **API Endpoint**: `https://openapi.npm.gov.tw/`
- **Authentication**: API key required (register at openapi.npm.gov.tw)
- **Tea Ware Relevance**: VERY HIGH - Premier collection of imperial Chinese tea ware
- **Estimated Inventory**: Hundreds of imperial tea ware pieces
- **License Caveats**: Check license per image; some CC0, some CC-BY
- **Status**: 🔑 NEEDS_KEY - No key in environment
- **Notes**: Would be priority source for imperial Ming/Qing tea ware if key obtained.

---

## Surveyed But Deferred (No Key-Free API or Complex Access)

### 8. British Museum
- **Country**: UK (London)
- **Open Access Policy**: CC-BY-NC-SA 4.0 for most images
- **API Documentation**: https://www.britishmuseum.org/collection (no public API)
- **Tea Ware Relevance**: HIGH - Major Chinese ceramics collection
- **Status**: ⏸️ DEFERRED - No public API; would need web scraping
- **Notes**: Excellent collection but requires manual curation or scraping. License is CC-BY-NC-SA (non-commercial, share-alike).

### 9. Victoria and Albert Museum (V&A)
- **Country**: UK (London)
- **Open Access Policy**: Varies by object; many CC-BY-NC
- **API Documentation**: https://api.vam.ac.uk/
- **Tea Ware Relevance**: HIGH - Strong Chinese ceramics collection
- **Status**: ⏸️ DEFERRED - API exists but image access unclear
- **Notes**: API provides metadata; image download rights need verification.

### 10. Minneapolis Institute of Art
- **Country**: USA (Minnesota)
- **Open Access Policy**: CC0 for public domain works
- **API Documentation**: https://github.com/artsmia/collection-elasticsearch
- **Tea Ware Relevance**: MEDIUM - Some Chinese ceramics
- **Status**: ⏸️ DEFERRED - API less documented; lower priority
- **Notes**: Could be explored in future rounds.

### 11. Walters Art Museum
- **Country**: USA (Maryland)
- **Open Access Policy**: CC0 for many works
- **API Documentation**: https://api.thewalters.org/
- **Tea Ware Relevance**: MEDIUM - Some Chinese objects
- **Status**: ⏸️ DEFERRED - Lower priority
- **Notes**: Smaller Chinese collection; could add a few pieces.

### 12. Tokyo National Museum
- **Country**: Japan (Tokyo)
- **Open Access Policy**: Varies; many restricted
- **API Documentation**: ColBase (Japanese cultural heritage aggregator)
- **Tea Ware Relevance**: HIGH - Excellent Japanese tea ceremony ware, some Chinese
- **Status**: ⏸️ DEFERRED - Complex access, language barrier
- **Notes**: Great for Japanese tea bowls (raku, etc.) but access challenging.

### 13. Kyoto National Museum
- **Country**: Japan (Kyoto)
- **Open Access Policy**: Varies
- **Tea Ware Relevance**: HIGH - Tea ceremony ceramics
- **Status**: ⏸️ DEFERRED - Similar to Tokyo National Museum
- **Notes**: Would be valuable for Momoyama/Edo tea ware.

### 14. Shanghai Museum
- **Country**: China (Shanghai)
- **Open Access Policy**: No open API
- **Tea Ware Relevance**: VERY HIGH - Premier Chinese ceramics collection
- **Status**: ⏸️ DEFERRED - No public API
- **Notes**: Would be incredible source but no API access.

### 15. Palace Museum Beijing (故宫博物院)
- **Country**: China (Beijing)
- **Open Access Policy**: Limited digital access
- **API Documentation**: https://www.dpm.org.cn/ (no public API)
- **Tea Ware Relevance**: VERY HIGH - Imperial collection
- **Status**: ⏸️ DEFERRED - No public API
- **Notes**: Ultimate source for imperial tea ware but no API.

### 16. Europeana
- **Country**: EU (Aggregator)
- **Open Access Policy**: Varies by contributing institution
- **API Documentation**: https://pro.europeana.eu/page/apis
- **Tea Ware Relevance**: LOW-MEDIUM - Aggregates European museum data
- **Status**: ⏸️ DEFERRED - Requires API key; mixed relevance
- **Notes**: Could find export porcelain from European collections.

### 17. Wikimedia Commons
- **Country**: Global
- **Open Access Policy**: CC-BY-SA, CC-BY, CC0 (varies)
- **API Documentation**: MediaWiki API
- **Tea Ware Relevance**: MEDIUM - User-uploaded museum photos
- **Status**: ✅ ACTIVE - 52 local images in collection (49 added in the 2026-09-15 batch)
- **Notes**: File-page licenses are checked per item; the latest batch uses CC0 or public-domain images and downloads local JPEG copies.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Active (key-free) | 3 (Met, CMA, Wikimedia) |
| Partial (blocked) | 1 (AIC - Cloudflare 403) |
| Needs API key | 4 (Rijksmuseum, Smithsonian, Harvard, NPM Taiwan) |
| Deferred (no API/complex) | 9 |
| **Total Surveyed** | **17** |

## Round 2 Actual Yield (2026-09-13)

**Total Collection: 1,003 artworks with self-hosted images**

| Source | Count | Notes |
|--------|-------|-------|
| Metropolitan Museum of Art | 693 | CC0, high-quality originals |
| Cleveland Museum of Art | 307 | CC0, web-quality images |
| Wikimedia Commons | 3 | CC0 only, many blocked |
| Art Institute of Chicago | 0 | IIIF blocked by Cloudflare |

All images downloaded to `public/artworks/{id}.jpg` (1600-2400px long edge where available).

## Curated Commons Expansion (2026-09-15)

The collection now contains **1,052** self-hosted artworks: 693 Met, 307 Cleveland, and 52 acquired through Commons file pages (49 in this batch). The new batch contains **30 CC0** and **19 public-domain** images. All 49 are JPEG binaries under `public/artworks/`, with file-page provenance, museum credit where documented, and individual license labels in `src/data/artworks.json`.

The accepted files came from `Yixing_ware`, `Jian_ware`, `Gaiwan`, `Teapots_from_China`, `Chinese_teaware`, and `Ceramic_tea_bowls`. Category membership alone was insufficient: review removed alternate views of the same object, label-only photographs, uncertain jade bowls, English and Korean bowls filed under tea categories, unrelated ceramics, and group photographs where no single tea object could be identified. One British Museum file title said “Southern Song,” while its description documented Northern Song; the collection follows the description.

The 2026-09-14 Met/Commons exploratory crawl was aborted before retaining any artworks or images. Its log rows are marked `aborted-before-import`; this batch's 49 accepted files are recorded separately as `commons-curated-2026-09-15`.

For the next expansion, continue with smaller, visually reviewed groups and check the originating museum's object record when a Commons filename conflicts with its description. The API image URL is a download source, never a production hotlink.

## Future Expansion Recommendations

1. **Priority 1**: Obtain API keys for Smithsonian (Freer/Sackler) and National Palace Museum Taiwan
2. **Priority 2**: Obtain Rijksmuseum key for Chinese export porcelain
3. **Priority 3**: Explore V&A API for image access
4. **Priority 4**: Manual curation from British Museum (CC-BY-NC-SA acceptable?)

---

*This survey is maintained as part of the 器·茶 gallery research documentation. Future crawls should consult this document and `crawl-log.jsonl` before executing queries to avoid duplicate work.*
