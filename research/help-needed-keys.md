# API Keys Needed for Future Expansion

This document lists museum APIs that require authentication keys to access their collections. These sources have significant Chinese tea ware collections that would greatly expand the gallery.

**Last updated: 2026-09-19** (Asia-focus expansion batch)

---

## Priority 1: High-Value Asian Museum Sources

### 1. National Palace Museum, Taipei (台北故宮博物院)
- **API Documentation**: https://openapi.npm.gov.tw/ (Chinese/English)
- **Key Registration**: https://openapi.npm.gov.tw/ (requires account, free)
- **Key Type**: API Key (free)
- **Environment Variable**: `NPM_TAIWAN_API_KEY`
- **Collection Value**: Houses the imperial Chinese collection from the Forbidden City. Premier source for:
  - Ming/Qing imperial tea ware
  - Rare Chenghua chicken cups (成化鸡缸杯)
  - Xuande blue-and-white (宣德青花)
  - Imperial Ru/Guan/Jun ware (汝窑、官窑、钧窑)
  - Imperial Yixing zisha (宜兴紫砂)
- **License**: CC0/CC-BY for digital archive images
- **Estimated Yield**: 300-500 premium imperial tea ware
- **2026-09-19 Wikimedia Commons Scan**: Only 0 CC0/PD images found in NPM-related categories. API access is **essential** for this collection.

### 2. Smithsonian Open Access (Freer-Sackler Gallery / 弗利尔-赛克勒美术馆)
- **API Documentation**: https://api.si.edu/openaccess/api/v1.0/
- **Key Registration**: https://api.data.gov/signup/ (free, instant)
- **Key Type**: API Key (free)
- **Environment Variable**: `SMITHSONIAN_API_KEY`
- **Collection Value**: The Freer Gallery and Arthur M. Sackler Gallery house one of the world's finest collections of Asian art:
  - Exceptional Chinese ceramics (Song through Qing dynasties)
  - Important Korean celadon and Japanese tea ware
  - Charles Lang Freer's historic collection
- **License**: CC0 for most objects
- **Estimated Yield**: 500+ tea-related items
- **2026-09-19 Wikimedia Commons Scan**: Found 10 items via Commons Freer Gallery categories. Direct API would yield 50x more.

---

## Priority 2: Asian Supplementary Sources

### 3. Tokyo National Museum (東京国立博物館) / ColBase
- **API Documentation**: https://colbase.nich.go.jp/about_api (Japanese)
- **Key Registration**: Registration required
- **Key Type**: API access (may require institutional agreement)
- **Environment Variable**: `COLBASE_API_KEY`
- **Collection Value**: Japan's premier museum for tea ceremony ware:
  - Important Japanese chawan (茶碗) collection
  - Raku, Seto, Mino, Oribe, Shigaraki, Karatsu wares
  - Korean Goryeo celadon from Japanese collections
  - Chinese tea ware with Japanese tea ceremony provenance
- **License**: Varies; check individual items
- **Estimated Yield**: 200-300 tea ceremony items
- **2026-09-19 Wikimedia Commons Scan**: Found 12 items via TNM categories on Commons. Many more in the actual collection.

### 4. National Museum of Korea (국립중앙박물관)
- **API Documentation**: https://www.museum.go.kr/openapi/ (Korean)
- **Key Registration**: https://www.museum.go.kr/openapi/register (requires Korean phone verification)
- **Key Type**: API Key (free, but verification challenging for non-Korean users)
- **Environment Variable**: `NMK_API_KEY`
- **Collection Value**: Korea's national collection:
  - Goryeo celadon (高麗青瓷) - world's finest
  - Buncheong ware (粉青沙器) tea bowls
  - Joseon white porcelain (朝鮮白瓷)
  - Korean tea culture artifacts
- **License**: Government Open License (similar to CC-BY)
- **Estimated Yield**: 150-250 Korean tea ware
- **2026-09-19 Wikimedia Commons Scan**: Found 10 items via NMK categories on Commons. Direct API would yield much more, especially Goryeo celadon.

### 5. Kyoto National Museum (京都国立博物館)
- **API Documentation**: Via ColBase (shared with Tokyo National Museum)
- **Collection Value**: Tea ceremony capital of Japan:
  - Historical tea ceremony ware from Kyoto temples
  - Important chawan and chaire collections
  - Sen no Rikyu lineage tea ware
- **Estimated Yield**: 100-200 tea ceremony items
- **2026-09-19 Wikimedia Commons Scan**: 0 items found in Kyoto NM categories.

### 6. Rijksmuseum
- **API Documentation**: https://data.rijksmuseum.nl/object-metadata/api/
- **Key Registration**: https://data.rijksmuseum.nl/ (free account)
- **Key Type**: API Key (free)
- **Environment Variable**: `RIJKSMUSEUM_API_KEY`
- **Collection Value**: Dutch Golden Age trade-era Chinese export porcelain, including tea services made for European markets.
- **License**: CC0 for many objects
- **Estimated Yield**: 100-200 export tea ware

### 7. Harvard Art Museums (Arthur M. Sackler Museum)
- **API Documentation**: https://github.com/harvardartmuseums/api-docs
- **Key Registration**: https://harvardartmuseums.org/collections/api
- **Key Type**: API Key (free)
- **Environment Variable**: `HARVARD_API_KEY`
- **Collection Value**: Scholarly collection with detailed provenance and research notes; Sackler Asian collection.
- **License**: CC-BY-NC (more restrictive - requires attribution, non-commercial)
- **Estimated Yield**: 50-100 items
- **Note**: License is more restrictive than CC0; may need attribution display.

---

## Priority 3: Regional Asian Museums (Exploration Needed)

### 8. Hong Kong Museum of Art (香港藝術館)
- **API Documentation**: Unknown (no public API documented)
- **Website**: https://hk.art.museum/
- **Collection Value**: Chinese export porcelain, Chater Collection tea ware
- **Status**: Needs investigation

### 9. Asian Art Museum San Francisco
- **API Documentation**: Unknown (no public API documented)
- **Website**: https://asianart.org/
- **Collection Value**: Brundage Collection Chinese ceramics, Japanese tea ware
- **2026-09-19 Wikimedia Commons Scan**: Found 9 items via AAM categories on Commons.
- **Status**: Needs investigation

### 10. Musée Guimet (法国吉美博物馆)
- **API Documentation**: Unknown
- **Website**: https://www.guimet.fr/
- **Collection Value**: Major French collection of Asian art; Chinese ceramics from Grandidier collection
- **Status**: Needs investigation

---

## Priority 4: Lower Priority Sources

### 11. Europeana
- **API Documentation**: https://pro.europeana.eu/page/apis
- **Key Registration**: https://pro.europeana.eu/page/get-api
- **Key Type**: API Key (free)
- **Environment Variable**: `EUROPEANA_API_KEY`
- **Collection Value**: Aggregates European museum collections; may find export porcelain from various European institutions.
- **License**: Varies by contributing institution
- **Estimated Yield**: Unknown - requires exploration

---

## How to Add Keys

If you have access to any of these API keys:

1. **For Local Development**:
   Create a `.env.local` file in the project root:
   ```
   NPM_TAIWAN_API_KEY=your_key_here
   SMITHSONIAN_API_KEY=your_key_here
   COLBASE_API_KEY=your_key_here
   NMK_API_KEY=your_key_here
   RIJKSMUSEUM_API_KEY=your_key_here
   ```

2. **For Cursor Cloud Agents**:
   Add secrets in the Cursor Dashboard under Cloud Agents > Secrets.

3. **Run Expansion Script**:
   ```bash
   npx tsx scripts/expand-with-keys.ts
   ```

---

## Sources That Don't Need Keys (Already Active)

These sources are already being crawled and don't require authentication:

| Source | Status | 2026-09-19 Yield | Notes |
|--------|--------|------------------|-------|
| Metropolitan Museum of Art | ✅ Active | +55 this batch | CC0, excellent collection, most Asian tea ware exhausted |
| Cleveland Museum of Art | ✅ Active | +38 this batch | CC0, good Korean/Japanese supplements |
| Wikimedia Commons | ✅ Active | +189 this batch | CC0/PD only, good for Asian museum uploads |
| Art Institute of Chicago | ⚠️ Partial | 0 | CC0, but IIIF blocked by Cloudflare |

---

## Asian Museums on Wikimedia Commons (2026-09-19 Scan Results)

The following Asian museums have images on Wikimedia Commons that were successfully harvested:

| Museum | Commons Yield | License | Notes |
|--------|---------------|---------|-------|
| Tokyo National Museum | 12 | PD | Good chawan/ceramics categories |
| Freer Gallery of Art | 10 | CC0/PD | Guan ware, tea caddies |
| National Museum of Korea | 10 | PD | Goryeo celadon |
| Asian Art Museum SF | 9 | CC0 | Jun ware, various |
| Shanghai Museum | 5 | PD | Guan ware, celadon |
| British Museum | 2 | PD | Limited PD tea ware |
| Palace Museum Beijing | 1 | PD | Very limited; most are restricted |

**Key finding**: Most major Asian museums (Palace Museum Beijing, Shanghai Museum, Taipei NPM) have very limited public domain images on Commons. API access is essential for expanding from these sources.

---

## Sources Without Public APIs (Limited via Commons)

These museums have excellent collections but no public APIs. Some items accessible via Wikimedia Commons uploads:

| Museum | API Status | Commons Status | Recommendation |
|--------|------------|----------------|----------------|
| Palace Museum Beijing (故宫博物院) | No API | 1 item found | Very restricted; focus on NPM Taiwan instead |
| Shanghai Museum (上海博物馆) | No API | 5 items found | Limited PD; most images restricted |
| British Museum | No API | 2 items found | CC-BY-NC-SA license (restrictive) |
| Victoria and Albert Museum | API unclear | Not scanned | API exists but image access unclear |
| Nanjing Museum (南京博物院) | No API | 0 items found | No PD images available |

---

## Registration Links Summary (Quick Reference)

| Source | Registration URL | Notes |
|--------|-----------------|-------|
| NPM Taiwan | https://openapi.npm.gov.tw/ | Free, Chinese interface |
| Smithsonian | https://api.data.gov/signup/ | Free, instant |
| ColBase (TNM/KNM) | https://colbase.nich.go.jp/about_api | Japanese, may need institutional |
| NMK Korea | https://www.museum.go.kr/openapi/register | Korean phone verification |
| Rijksmuseum | https://data.rijksmuseum.nl/ | Free, easy |
| Harvard | https://harvardartmuseums.org/collections/api | Free, CC-BY-NC license |

---

*Last updated: 2026-09-19*
