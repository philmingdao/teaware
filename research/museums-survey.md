# Museum Open Access Survey for Chinese Tea Ware

Last updated: 2026-09-24 (Round 12 Fresh Queries Batch)  
Purpose: Document worldwide museum collections with Chinese/East Asian tea ware and open access image policies for the 器·茶 gallery project.

## Current Collection Status

| Source | Artworks | Images | Status |
|--------|----------|--------|--------|
| Metropolitan Museum of Art | 1,699 | ✅ Self-hosted | Active |
| Cleveland Museum of Art | 607 | ✅ Self-hosted | Active |
| ColBase (Japanese Museums) | 339 | ✅ Self-hosted | Active |
| Wikimedia Commons | 330 | ✅ Self-hosted | Active |
| Smithsonian (Freer/Sackler) | 175 | ✅ Self-hosted | Active |
| **Total** | **3,150** | **All local** | - |

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

## Expansion Round 3 (2026-09-17)

**New Total: 1,175 artworks** (+123 from previous 1,052)

### Sources and Queries

| Source | New Items | Queries Used |
|--------|-----------|--------------|
| Metropolitan Museum of Art | 61 | blue and white teapot Chinese, Dehua porcelain cup, Korean tea bowl, tea jar Chinese, tea caddy porcelain, underglaze blue teapot |
| Cleveland Museum of Art | 62 | teapot, chawan, famille rose, celadon bowl, Longquan, Dehua, export porcelain, tea jar, covered cup |
| **Total** | **123** | 31 queries attempted |

### Content Breakdown by Type

| Object Type | Count |
|-------------|-------|
| Tea Bowl/Cup | 45 |
| Tea Caddy | 36 |
| Teapot | 26 |
| Gaiwan / Covered Cup | 9 |
| Tea Set | 7 |

### Notes
- All images self-hosted as JPEG under `public/artworks/`
- Japanese and Korean tea ware included (chawan, tea jars from Shigaraki/Seto)
- Expanded Dehua blanc de chine representation
- Met API returned 403 for "dragon teapot Chinese" query (rate limiting)
- famille rose teapot yielded 0 results (mostly rights-restricted at Met)
- Longquan celadon bowl yielded 0 from Met (no matching public domain items)

## Round 4 Expansion (2026-09-18)

**+81 new artworks from Met** (total now 1,256)

### New Queries Explored

| Query | Source | Results | Accepted |
|-------|--------|---------|----------|
| tea ceremony Japanese | Met | 130 | 15 |
| Korean tea bowl | Met | 38 | 4 |
| Korean celadon bowl | Met | 54 | 7 |
| water pot Chinese | Met | 355 | 15 |
| export porcelain tea | Met | 1047 | 15 |
| lidded cup Chinese | Met | 1083 | 9 |
| Japanese tea bowl | Met | 156 | 15 |
| Ge ware bowl | Met | 12 | 1 |

### Content Additions
- Japanese tea ceremony apparatus (water jars, utensils, tea caddies)
- Korean celadon ewers and bowls (Goryeo dynasty)
- Chinese export porcelain teapots and tea services
- Chinese water pots for scholar's desk / tea ceremonies
- Japanese tea gathering dishes (mukōzuke)

### Technical Notes
- CMA API returned arrays for culture field (not strings) - requires fix for future runs
- Met API occasionally returns HTML errors (rate limiting) - handled gracefully
- All 81 new images verified as valid JPEG with reasonable dimensions (>5KB)

## Round 5 Expansion (2026-09-19)

**+193 new artworks** (total now **1,449**)

### Expansion Goals
- Focus on underrepresented types: teapots, tea caddies, ewers, gaiwan
- Mine untapped queries from Met, CMA, and Wikimedia Commons
- All images self-hosted under `public/artworks/`

### Sources and Queries

| Source | New Items | Sample Queries |
|--------|-----------|----------------|
| Metropolitan Museum of Art | 147 | porcelain teapot China, enameled teapot China, armorial teapot China, tea container China, covered jar tea China, covered cup China, ewer porcelain China, wine ewer China, Seto/Shigaraki/Oribe tea bowl |
| Cleveland Museum of Art | 27 | enamel teapot, tea container, chaire tea, water dropper Chinese, ewer Asian |
| Wikimedia Commons | 19 | Category:Tea_caddies, Category:Gaiwan, Category:Dehua_porcelain |
| **Total** | **193** | 56 queries attempted |

### Content Breakdown by Type

| Object Type | Count |
|-------------|-------|
| Tea Bowl/Cup | 67 |
| Tea Caddy | 47 |
| Teapot | 37 |
| Ewer | 29 |
| Tea Set | 4 |
| Gaiwan / Covered Cup | 3 |
| Kettle | 2 |
| Water Dropper | 2 |
| Other | 2 |

### Content Breakdown by Dynasty

| Dynasty | Count |
|---------|-------|
| Edo Period (Japan) | 88 |
| Other Period | 80 |
| Unknown | 13 |
| Qing Dynasty | 5 |
| Yuan Dynasty | 4 |
| Vietnam | 3 |

### Highlights
- Significant expansion of Japanese tea ceremony ware (Seto, Shigaraki, Oribe, Shino styles)
- New Chinese export porcelain teapots with armorial designs
- Enameled and blue-and-white teapots from Met collection
- Tea caddies (chaire, natsume) from Japanese collections
- Korean ceramics and Vietnamese tea bowls
- Dehua porcelain additions from Wikimedia Commons

### Technical Notes
- Met API returned 403 for "kraak teapot" query (rate limiting) - handled gracefully
- Some Wikimedia images rejected for being too small (<5KB)
- SHA256 hash deduplication prevented any duplicate images
- All 193 new images validated as proper JPEG binaries

## Round 6 Expansion - Asia Focus (2026-09-19)

**+331 new artworks** (total now **1,780**)

### Expansion Goals
- Focus on **Asian museum sources** via Wikimedia Commons
- Prioritize underrepresented Chinese kilns/types (汝窑、官窑、钧窑、哥窑、定窑、建盏、吉州、磁州)
- Add Korean and Japanese tea ware from Asian museum collections
- Strengthen provenance from Asian institutions

### Sources and Museum Breakdown

| Source Museum | New Items | Notes |
|---------------|-----------|-------|
| Wikimedia Commons (general) | 189 | Yixing, Jian, Korean, Japanese wares |
| Metropolitan Museum of Art | 55 | Asian kiln queries (Guan, Cizhou, Changsha, etc.) |
| Cleveland Museum of Art | 38 | Korean, Japanese supplementary |
| Tokyo National Museum | 12 | Via Commons categories |
| Freer Gallery of Art | 10 | Guan ware, tea caddies |
| National Museum of Korea | 10 | Goryeo celadon |
| Asian Art Museum | 9 | Jun ware, various |
| Shanghai Museum | 5 | Guan ware, celadon |
| British Museum | 2 | Limited PD tea ware |
| Palace Museum Beijing | 1 | Very limited CC0/PD |
| **Total** | **331** | - |

### Content Breakdown by Object Type

| Object Type | Count |
|-------------|-------|
| Tea Bowl/Cup | 269 |
| Ewer | 22 |
| Chawan (Tea Bowl) | 14 |
| Tea Caddy | 13 |
| Tea Set | 7 |
| Teapot | 5 |
| Kettle | 1 |

### Content Breakdown by Dynasty/Period

| Dynasty/Period | Count |
|----------------|-------|
| Song Dynasty | 89 |
| Other Period | 76 |
| Edo Period (Japan) | 52 |
| Goryeo Dynasty (Korea) | 28 |
| Joseon Dynasty (Korea) | 22 |
| Northern Song | 19 |
| Southern Song | 18 |
| Yuan Dynasty | 12 |
| Momoyama Period (Japan) | 8 |
| Ming Dynasty | 4 |
| Qing Dynasty | 3 |

### Content Breakdown by Material/Kiln

| Material/Kiln | Count |
|---------------|-------|
| Celadon (general) | 42 |
| Porcelain | 39 |
| Mino Ware | 23 |
| Jian Ware (建盏) | 22 |
| Seto Ware (瀬戸焼) | 15 |
| Bizen Ware (備前焼) | 11 |
| Yixing Clay (紫砂) | 10 |
| Longquan Celadon (龙泉) | 10 |
| Jun Ware (钧窑) | 10 |
| Ding Ware (定窑) | 10 |
| Shigaraki Ware (信楽焼) | 10 |
| Karatsu Ware (唐津焼) | 10 |
| Guan Ware (官窑) | 8 |
| Hagi Ware (萩焼) | 7 |
| Raku Ware (楽焼) | 6 |
| Ru Ware (汝窑) | 5 |
| Goryeo Celadon (高麗青瓷) | 6 |
| Blue and White | 4 |

### Key Wikimedia Commons Categories Scanned

Chinese museums/kilns:
- `Category:Yixing_ware` - 13 CC0/PD, 10 accepted
- `Category:Jian_ware` - 30 CC0/PD, 10 accepted
- `Category:Longquan_celadon` - 19 CC0/PD, 10 accepted
- `Category:Chinese_celadon` - 27 CC0/PD, 10 accepted
- `Category:Ru_ware` - 7 CC0/PD, 6 accepted
- `Category:Guan_ware` - 11 CC0/PD, 10 accepted
- `Category:Jun_ware` - 17 CC0/PD, 10 accepted
- `Category:Ding_ware` - 39 CC0/PD, 10 accepted
- `Category:Ge_ware` - 1 CC0/PD, 1 accepted
- `Category:Dehua_porcelain` - 11 CC0/PD, limited unique

Korean categories:
- `Category:Korean_celadon` - 42 CC0/PD, 10 accepted
- `Category:Goryeo_celadon` - 51 CC0/PD, 10 accepted
- `Category:Buncheong` - 12 CC0/PD, 6 accepted

Japanese categories:
- `Category:Chawan` - 49 CC0/PD, 10 accepted
- `Category:Raku_ware` - 20 CC0/PD, 6 accepted
- `Category:Seto_ware` - 55 CC0/PD, 10 accepted
- `Category:Mino_ware` - 14 CC0/PD, 10 accepted
- `Category:Oribe_ware` - 36 CC0/PD, 10 accepted
- `Category:Shino_ware` - 39 CC0/PD, 10 accepted
- `Category:Bizen_ware` - 29 CC0/PD, 10 accepted
- `Category:Hagi_ware` - 8 CC0/PD, 7 accepted
- `Category:Shigaraki_ware` - 27 CC0/PD, 10 accepted
- `Category:Karatsu_ware` - 30 CC0/PD, 10 accepted

### Key Findings - Asian Museums on Commons

| Museum | CC0/PD Images | Accepted | Notes |
|--------|---------------|----------|-------|
| Tokyo National Museum | 12 total | 12 | Good chawan/ceramics |
| Freer Gallery of Art | 15+ | 10 | Guan ware, tea caddies |
| National Museum of Korea | 15+ | 10 | Goryeo celadon |
| Asian Art Museum SF | 12+ | 9 | Jun ware, various |
| Shanghai Museum | 6 | 5 | Guan ware, celadon |
| Palace Museum Beijing | 2 | 1 | Very limited CC0/PD |

**Critical finding**: Most major Asian museums (故宫博物院, 上海博物馆, 台北故宮) have **very limited** public domain images on Wikimedia Commons. API access is **essential** for meaningful expansion from these premier collections.

### Technical Notes
- SHA256 hash deduplication prevented duplicate images
- All 331 new images validated as proper image binaries
- Rate limiting encountered on some Wikimedia requests (handled with retries)
- Some museum Commons categories were empty or had no CC0/PD content

## Round 7 Expansion - 2000 Milestone (2026-09-19)

**+272 new artworks** (total now **2,052** - **milestone achieved!**)

### Expansion Goals
- **Primary target**: Reach 2,000 total artworks from key-free sources
- Focus on fresh Met/CMA queries not heavily mined in previous rounds
- Continue broadening dynasty and ware type coverage

### Sources Breakdown

| Source | New Items | Notes |
|--------|-----------|-------|
| Metropolitan Museum of Art | 201 | Fresh queries: glazed bowls/cups, saucers, cup stands, ware types |
| Cleveland Museum of Art | 71 | Dynasty-specific queries, Kangxi/Qing porcelain |
| **Total** | **272** | - |

### Content Breakdown by Object Type

| Object Type | Count |
|-------------|-------|
| Tea Bowl/Cup | 225 |
| Saucer | 29 |
| Ewer | 6 |
| Tea Caddy | 6 |
| Cup Stand | 5 |
| Chawan | 1 |

### Content Breakdown by Dynasty/Period

| Dynasty/Period | Count |
|----------------|-------|
| Other Period | 155 |
| Edo Period (Japan) | 78 |
| Qing Dynasty | 18 |
| Goryeo Dynasty (Korea) | 16 |
| Joseon Dynasty (Korea) | 3 |
| Vietnam | 1 |
| Ming Dynasty | 1 |

### Key Queries Used

Met Museum (201 new):
- `glazed bowl China` - 10 items
- `glazed cup China` - 12 items
- `overglaze enamel cup China` - 12 items
- `saucer China porcelain` - 12 items
- `black glazed bowl China` - 3 items
- `brown glazed bowl China` - 7 items
- `green glazed bowl China` - 7 items
- `Qingbai ware bowl` - 7 items
- Dynasty queries (Five Dynasties, Liao, Jin, Yuan) - 26 items

Cleveland Museum (71 new):
- `Qing dynasty bowl` - 9 items
- `Kangxi porcelain` - 10 items
- `Japan ceramics bowl` - 10 items
- `Korea ceramics` - 10 items
- `underglaze blue` - 4 items

### Technical Notes
- All images self-hosted as JPEG under `public/artworks/`
- SHA256 hash deduplication prevented duplicate images
- Build successful with 2,061 static pages generated
- No remote imageUrl for any new items

---

## Round 9 Expansion - Key-Free Batch (2026-09-22)

**+272 new artworks** (total now **2,354**)

### Expansion Goals
- Key-free sources ONLY: Met Museum, CMA, Wikimedia Commons
- Focus on underrepresented types: enamel teapots, powder blue, stem cups, Jian ware, copper red glazes
- Japanese tea utensils: tetsubin, chashaku, Satsuma, Kutani, Kyoto ware
- Korean celadon tea bowls
- Cloisonné teapots
- Tea service items: sugar bowls, milk jugs

### Sources Breakdown

| Source | New Items | Notes |
|--------|-----------|-------|
| Metropolitan Museum of Art | 272 | Enamel teapots, stem cups, Jian ware, copper red, Japanese wares |
| Cleveland Museum of Art | 0 | (Met queries hit target before CMA) |
| Wikimedia Commons | 0 | (Met queries hit target before Wiki) |
| **Total** | **272** | - |

### Key Queries Used (Met Museum)

| Query | Accepted | Notes |
|-------|----------|-------|
| painted enamel teapot China | 12 | Canton/Beijing enamel teapots |
| Canton enamel teapot | 12 | Export enamelware |
| powder blue teapot | 12 | Powder blue glaze teapots |
| powder blue bowl China | 12 | Powder blue bowls |
| stem cup Ming | 12 | Ming dynasty stem cups |
| stem cup Qing | 12 | Qing dynasty stem cups |
| covered bowl China porcelain | 12 | Covered bowls |
| blue and white tea bowl China | 12 | Blue and white tea bowls |
| Blanc de Chine cup | 12 | Dehua white porcelain |
| hare's fur bowl | 12 | Jian ware tea bowls |
| Jian tea bowl China | 12 | Jian kiln tenmoku |
| copper red bowl China | 12 | Underglaze red |
| underglaze red cup China | 12 | Copper red cups |
| peachbloom bowl China | 12 | Peachbloom glaze |
| iron kettle Japan | 12 | Tetsubin iron kettles |
| Kyoto ware bowl | 12 | Kyoto ceramics |
| Satsuma bowl Japan | 12 | Satsuma ware |
| Kutani cup Japan | 12 | Kutani porcelain |
| cloisonne teapot China | 12 | Cloisonné enamel |
| sugar bowl China porcelain | 12 | Tea service items |
| milk jug China porcelain | 12 | Tea service items |
| + other queries | 32 | Various tea-related items |

### Content Breakdown by Type

| Object Type | Count |
|-------------|-------|
| Teapot | 68 |
| Bowl | 82 |
| Cup | 56 |
| Tea Bowl | 24 |
| Sugar Bowl | 12 |
| Milk Jug | 12 |
| Stem Cup | 10 |
| Other | 8 |

### Technical Notes
- All images self-hosted as JPEG under `public/artworks/`
- Images compressed to max 1400px, quality 80 via ImageMagick
- SHA256 hash deduplication prevented duplicate images
- Git LFS tracking maintained for `public/artworks/*.jpg`
- No remote imageUrl for any new items

---

## Round 10 Expansion - Extra Key-Free Batch (2026-09-22)

**+20 new artworks** (total now **2,374**)

### Expansion Goals
- Extra user-requested expansion beyond weekday routine
- Key-free sources ONLY: Met Museum, CMA, Wikimedia Commons
- Focus on underrepresented glazes and vessel types

### Sources Breakdown

| Source | New Items | Notes |
|--------|-----------|-------|
| Metropolitan Museum of Art | 20 | New glaze types, export wares, Japanese ceramics |
| Cleveland Museum of Art | 0 | (Target reached from Met queries) |
| Wikimedia Commons | 0 | (Target reached from Met queries) |
| **Total** | **20** | - |

### Key Queries Used (Met Museum)

| Query | Accepted | Notes |
|-------|----------|-------|
| moonflask China porcelain | 2 | Entwined dragon vase, ceremonial jar |
| garlic head vase China | 2 | Archaic bronze vessel shape |
| ritual vessel China bronze | 1 | Jiaodou spouted tripod |
| robin's egg glaze | 3 | Water pot, butterfly washer, deer vessel |
| mirror black glaze | 2 | Saucer, covered teapot |
| clair de lune glaze | 1 | Beaker |
| Chinese export cream jug | 1 | Tea service |
| Chinese export slop bowl | 1 | Slop bowl |
| Chinese Imari bowl | 6 | Sake bottle, bowls in Imari style |
| European market teapot China | 1 | Export teapot |

### Content Breakdown by Type

| Object Type | Count |
|-------------|-------|
| Bowl | 10 |
| Vase/Vessel | 6 |
| Teapot | 2 |
| Saucer | 1 |
| Tea Service | 1 |

### Technical Notes
- All images self-hosted as JPEG under `public/artworks/`
- Images compressed to max 1500px, JPEG quality 80 via Pillow
- SHA256 hash deduplication prevented duplicate images
- Git LFS tracking maintained for `public/artworks/*.jpg`
- Total image size for new batch: ~2.1 MB (LFS uploaded)

---

## Round 11 Expansion - ColBase Batch 2 (2026-09-23)

**+89 new artworks** (total now **2,738**)

### Expansion Goals
- Continue ColBase opendata.tsv mining for Japanese tea ceramics
- Focus on tea bowls, tea caddies, incense containers, water jars
- Tokyo/Kyoto/Kyushu/Nara National Museums

### Sources Breakdown

| Source | New Items | Notes |
|--------|-----------|-------|
| Tokyo National Museum | 71 | Tea bowls, chaires, incense containers |
| Kyoto National Museum | 15 | Tea bowls, water jars, lacquer ware |
| Nara National Museum | 2 | Shino ware tea bowls |
| Kyushu National Museum | 1 | Karatsu ware |
| **Total** | **89** | - |

### Content Breakdown by Object Type

| Object Type | Count |
|-------------|-------|
| 茶碗 (Tea Bowl) | 28 |
| 茶器 (Tea Utensil) | 19 |
| 香合 (Incense Container) | 17 |
| 茶入 (Tea Caddy) | 9 |
| 水指 (Water Jar) | 6 |
| 花入 (Flower Vase) | 4 |
| 茶杓 (Tea Scoop) | 2 |
| Other | 4 |

### Key Wares and Kilns

- Raku ware (楽焼) - black and red tea bowls
- Oribe ware (織部焼) - green-glazed tea bowls, lids
- Shino ware (志野焼) - cream-glazed tea bowls
- Karatsu ware (唐津焼) - Korean-style tea bowls
- Tenmoku (天目) - oil-spot and hare's fur glazes
- Seto ware (瀬戸焼) - various tea utensils

### Technical Notes
- All images self-hosted as JPEG under `public/artworks/`
- Images compressed to max 1400px, JPEG quality 80 via Pillow
- SHA256 hash deduplication prevented duplicate images
- 11 non-tea items (swords, textiles, pottery) filtered out post-download
- Git LFS tracking maintained for `public/artworks/*.jpg`

---

## Round 12 Expansion - Fresh Queries (2026-09-24)

**+130 new artworks** (total now **3,150**)

### Expansion Goals
- Fresh niche queries not heavily used in prior rounds
- Focus on underrepresented ware types: famille verte, peachbloom, Shino, Thai ceramics
- Key-free sources only: Met Museum, Cleveland Museum of Art

### Sources Breakdown

| Source | New Items | Notes |
|--------|-----------|-------|
| Metropolitan Museum of Art | 80 | Famille verte, peachbloom, tea trays, Shino ware |
| Cleveland Museum of Art | 50 | Famille verte, wucai, Thai, Kangxi porcelain |
| **Total** | **130** | - |

### Key Queries Used

Met Museum (80 new):
- `famille verte teapot/cup` - 17 items (Qing enamel ware, figures)
- `peachbloom bowl China` - 17 items (Kangxi water coupes)
- `tea tray China` - 24 items (trays, sugar bowls, lacquer)
- `tea table China porcelain` - 9 items (scenes, screens)
- `Shino tea bowl` - 10 items (Mino ware dishes)

Cleveland Museum (50 new):
- `famille verte Chinese` - 16 items (bottle coolers, dishes)
- `wucai Chinese porcelain` - 6 items (Ming jars, boxes)
- `Thai ceramics` - 3 items (Sawankhalok fruit jars)
- `Kangxi porcelain` - 25 items (peachbloom bottles, lions)

### Content Highlights
- Famille Verte polychrome enamel dishes, vases, Guanyin figures
- Kangxi peachbloom glaze water coupes (scholar's desk items)
- Tea service export porcelain: sugar bowls, trays, caddies
- Japanese Shino ware and Negoro lacquer trays
- Thai Sawankhalok fruit-shaped jars

### Technical Notes
- All images self-hosted as JPEG under `public/artworks/`
- Images compressed to max 1400px, JPEG quality 80 via Pillow
- SHA256 hash deduplication prevented duplicate images
- Git LFS tracking maintained for `public/artworks/*.jpg`

---

## Current Collection Summary

| Category | Count |
|----------|-------|
| Total Artworks | 3,150 |
| Met Museum | 1,699 |
| Cleveland Museum | 607 |
| ColBase | 339 |
| Wikimedia Commons | 330 |
| Smithsonian | 175 |

## Future Expansion Recommendations

### Priority 1: Asian Museum APIs (High Value)
1. **National Palace Museum Taiwan (台北故宮)** - Premier imperial collection; API key registration at https://openapi.npm.gov.tw/
2. **Smithsonian (Freer/Sackler)** - Excellent Chinese ceramics; API key at https://api.data.gov/signup/

### Priority 2: Asian Museum APIs (Supplementary)
3. **Tokyo National Museum / ColBase** - Japanese tea ceremony ware; complex registration
4. **National Museum of Korea** - Goryeo celadon; Korean phone verification required
5. **Rijksmuseum** - Chinese export porcelain for European markets

### Priority 3: Further Commons Mining
6. Continue scanning specific museum-in-Commons categories as new uploads appear
7. Target specific kiln categories not yet exhausted

### Priority 4: Investigation Needed
8. **V&A Museum API** - Verify image access terms
9. **Asian Art Museum SF** - Check for undocumented API
10. **Musée Guimet** - French Asian art collection

---

*This survey is maintained as part of the 器·茶 gallery research documentation. Future crawls should consult this document and `crawl-log.jsonl` before executing queries to avoid duplicate work.*
