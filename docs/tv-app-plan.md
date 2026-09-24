# 「器 · 茶」TV App — technical plan (locked path)

**Locked 2026-09-24:** Native dual clients; **Android TV (Compose for TV) first**, then **Apple tvOS (SwiftUI)**. Web (Next.js / GitHub Pages) stays for discovery & SEO. Shared `catalog.v1.json`.

**Live site:** https://philmingdao.github.io/teaware/  
**Repo:** https://github.com/philmingdao/teaware

---

## Phase 0 — Product freeze (before code)

### MVP screens
1. Home rows: Dynasty / Kiln / Museum / Featured
2. Horizontal focus browse (10-foot covers)
3. Fullscreen slow slideshow (D-pad L/R, autoplay, ZH/EN captions)
4. Artwork detail (material, museum, license, credit; source URL as QR)
5. Settings: language, autoplay interval, BGM on/off (default dark)

### Out of MVP
Accounts, social, commerce, Top Shelf, screensaver, Favorites sync.

### Acceptance
Must be usable with a real Bluetooth / TV remote (not only touch emulator).

---

## Phase 1 — Catalog contract + monorepo skeleton

### Target layout
```
teaware/
  apps/web/                 # existing Next app (may stay at repo root initially)
  apps/android-tv/          # new Kotlin + Compose for TV
  apps/tvos/                # later SwiftUI
  packages/catalog/
    schema/catalog.v1.schema.json
    README.md
  scripts/                  # existing museum expand pipelines
  docs/tv-app-plan.md       # this plan (copy into repo when PR opens)
```

*Pragmatic start:* keep Next at repo root; add `apps/android-tv/` + `packages/catalog/` without a full turborepo move until needed.

### `catalog.v1.json` (derived from `Artwork`)
Required fields (stable):
- `id`, `titleChinese`, `titleEnglish`
- `dynasty`, `dynastyEnglish`, `date`
- `material`, `materialEnglish`, `objectType`, `objectTypeEnglish`
- `sourceMuseum`, `sourceMuseumEnglish`, `accessionNumber`, `sourceUrl`
- `imageUrl`, `imageAlt`, `license`, `creditLine?`
- `thumbUrl`, `posterUrl` (build-time derivatives if missing)
- `catalogVersion` (semver or ISO date on the root object)

Root shape:
```json
{
  "catalogVersion": "2026-09-24",
  "generatedAt": "…",
  "itemCount": 3150,
  "items": [ /* Artwork+ */ ]
}
```

Hosted at e.g. `https://philmingdao.github.io/teaware/catalog.v1.json` (or CDN twin). App never embeds full image bytes.

### Analytics mapping
`tv_open` · `row_open` · `slide_view` · `detail_open` · `settings_change` (GA4 or debug log first)

---

## First PR scope (Android TV)

**PR title idea:** `feat(tv): Android TV Compose scaffold + catalog.v1 consumer`

### In
1. `packages/catalog` schema doc + export script from existing `src/data` → `catalog.v1.json`
2. Publish JSON with web build (or dedicated workflow artifact)
3. `apps/android-tv` Gradle project:
   - `minSdk` / TV leanback feature flag / landscape
   - Compose for TV dependencies
   - Home screen with 1–2 mocked rows from live catalog URL
   - Slideshow screen: focus L/R, preload ±5 images (Coil)
   - Detail screen with license + QR for `sourceUrl`
   - Settings placeholders
4. README: how to run on emulator (`tv_1080p`) and sideload

### Out
- Play Store listing
- BGM wiring (follow-up)
- tvOS
- Moving entire Next tree into `apps/web`

### Done when
Emulator: open app → browse a row → enter slideshow → open detail → see license text. Cold start < 3s on mid Android TV emulator with cached index.

---

## Phase 2 — Android TV depth (4–6 weeks after PR1)
- All home rows from real facets
- Resilient image failures
- Autoplay + interval setting
- Optional BGM (reuse site CC0 track policy)
- Crash/ANR basics; ProGuard
- Internal testing track on Play (TV form factor)

## Phase 3 — tvOS (3–5 weeks)
- SwiftUI + Focus Engine
- Same catalog URL
- Parity MVP screens; platform-native chrome

## Phase 4 — Stores
Apple Developer + Privacy Nutrition; Play TV screenshots/banner; optional Fire TV.

---

## Immediate next action
Open PR1: catalog export + Android TV scaffold (no Store yet).
