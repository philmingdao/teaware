# API Keys Needed for Future Expansion

This document lists museum APIs that require authentication keys to access their collections. These sources have significant Chinese tea ware collections that would greatly expand the gallery.

---

## Priority 1: High-Value Sources

### 1. Smithsonian Open Access (Freer-Sackler Gallery)
- **API Documentation**: https://api.si.edu/openaccess/api/v1.0/
- **Key Registration**: https://api.data.gov/signup/
- **Key Type**: API Key (free)
- **Environment Variable**: `SMITHSONIAN_API_KEY`
- **Collection Value**: The Freer Gallery and Arthur M. Sackler Gallery house one of the world's finest collections of Asian art, including exceptional Chinese ceramics and tea ware from Song through Qing dynasties.
- **License**: CC0 for most objects
- **Estimated Yield**: 500+ tea-related items

### 2. National Palace Museum, Taipei (台北故宫博物院)
- **API Documentation**: https://openapi.npm.gov.tw/ (Chinese)
- **Key Registration**: https://openapi.npm.gov.tw/ (requires account)
- **Key Type**: API Key (free)
- **Environment Variable**: `NPM_TAIWAN_API_KEY`
- **Collection Value**: Houses the imperial Chinese collection from the Forbidden City. Premier source for Ming/Qing imperial tea ware including rare Chenghua chicken cups, Xuande blue-and-white, and imperial Yixing.
- **License**: CC0/CC-BY for digital archive images
- **Estimated Yield**: 300+ premium imperial tea ware

---

## Priority 2: Good Supplementary Sources

### 3. Rijksmuseum
- **API Documentation**: https://data.rijksmuseum.nl/object-metadata/api/
- **Key Registration**: https://data.rijksmuseum.nl/ (free account)
- **Key Type**: API Key (free)
- **Environment Variable**: `RIJKSMUSEUM_API_KEY`
- **Collection Value**: Dutch Golden Age trade-era Chinese export porcelain, including tea services made for European markets.
- **License**: CC0 for many objects
- **Estimated Yield**: 100-200 export tea ware

### 4. Harvard Art Museums
- **API Documentation**: https://github.com/harvardartmuseums/api-docs
- **Key Registration**: https://harvardartmuseums.org/collections/api
- **Key Type**: API Key (free)
- **Environment Variable**: `HARVARD_API_KEY`
- **Collection Value**: Scholarly collection with detailed provenance and research notes.
- **License**: CC-BY-NC (more restrictive - requires attribution, non-commercial)
- **Estimated Yield**: 50-100 items
- **Note**: License is more restrictive than CC0; may need attribution display.

---

## Priority 3: Would Be Nice

### 5. Europeana
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
   SMITHSONIAN_API_KEY=your_key_here
   NPM_TAIWAN_API_KEY=your_key_here
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

| Source | Status | Notes |
|--------|--------|-------|
| Metropolitan Museum of Art | ✅ Active | CC0, excellent collection |
| Cleveland Museum of Art | ✅ Active | CC0, good Yixing collection |
| Art Institute of Chicago | ⚠️ Partial | CC0, but IIIF blocked by Cloudflare |

---

## Sources Without Public APIs (Manual Curation Needed)

These museums have excellent collections but no public APIs:

- **Palace Museum Beijing (故宫博物院)** - Ultimate imperial collection, no API
- **Shanghai Museum (上海博物馆)** - Premier ceramics, no API  
- **British Museum** - Great collection, no API (CC-BY-NC-SA license)
- **Victoria and Albert Museum** - API exists but image access unclear
- **Tokyo National Museum** - ColBase aggregator, language barrier

For these sources, consider manual curation of public domain images from Wikimedia Commons.

---

*Last updated: 2026-09-13*
