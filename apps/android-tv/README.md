# 器 · 茶 Android TV

Android TV application for browsing the Chinese Tea Ware Gallery collection.

## Features

- **Home Screen**: Browse teaware by Featured, Dynasty (Song/Ming/Qing) rows
- **Slideshow**: Fullscreen image viewing with D-pad navigation
- **Detail Screen**: Artwork metadata, license info, QR code for source
- **Settings**: Language/autoplay/BGM placeholders

## Requirements

- Android Studio Ladybug (2024.2+) or newer
- JDK 17+
- Android SDK with API level 34 (compile) and 21+ (min)

## Quick Start

### 1. Open in Android Studio

```bash
# From repo root
cd apps/android-tv
```

Open this directory in Android Studio via **File → Open**.

### 2. Create TV Emulator

1. **Tools → Device Manager → Create Device**
2. Select **TV → Android TV (1080p)** or **Android TV (4K)**
3. Download system image (API 34 recommended)
4. Finish wizard

### 3. Run

1. Select the TV emulator from the device dropdown
2. Click **Run** (▶️) or press `Shift+F10`

The app will:
1. Fetch `catalog.v1.json` from `https://philmingdao.github.io/teaware/`
2. Display home screen with categorized teaware rows
3. Navigate using D-pad or keyboard arrows

## Navigation

| Key | Action |
|-----|--------|
| Arrow keys | Focus navigation |
| Enter/OK | Select item / Enter slideshow |
| Left/Right | Navigate slideshow |
| Back | Go back / Exit slideshow |

## Sideloading to Physical TV

### Via ADB

```bash
# Enable Developer Options + USB Debugging on TV
# Connect via USB or network

# Network connection
adb connect <TV_IP>:5555

# Build release APK
./gradlew assembleRelease

# Install
adb install app/build/outputs/apk/release/app-release.apk
```

### Via USB Drive

1. Build APK: `./gradlew assembleRelease`
2. Copy `app/build/outputs/apk/release/app-release.apk` to USB
3. Use file manager app on TV to install

## Configuration

### Catalog URL Override

For development/testing with a different catalog source:

```kotlin
// In app/build.gradle.kts
buildConfigField(
    "String",
    "CATALOG_BASE_URL",
    "\"http://10.0.2.2:3000\""  // Emulator localhost
)
```

Or for local Next.js dev server (from emulator):
```
http://10.0.2.2:3000/teaware
```

## Project Structure

```
apps/android-tv/
├── app/
│   └── src/main/
│       ├── java/io/github/philmingdao/teaware/
│       │   ├── MainActivity.kt          # Entry point + ViewModel
│       │   ├── data/
│       │   │   ├── CatalogModels.kt      # Data classes
│       │   │   └── CatalogRepository.kt  # API client
│       │   ├── navigation/
│       │   │   └── Navigation.kt         # NavHost setup
│       │   └── ui/
│       │       ├── components/           # Shared composables
│       │       ├── home/HomeScreen.kt
│       │       ├── slideshow/SlideshowScreen.kt
│       │       ├── detail/DetailScreen.kt
│       │       ├── settings/SettingsScreen.kt
│       │       └── theme/                # Colors, theme
│       ├── res/
│       │   ├── values/strings.xml
│       │   ├── values/themes.xml
│       │   └── drawable/
│       └── AndroidManifest.xml
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/libs.versions.toml
```

## Dependencies

- **Compose for TV** (`androidx.tv:tv-foundation`, `tv-material`)
- **Coil** for image loading with preloading
- **Ktor** for HTTP client
- **ZXing** for QR code generation
- **Navigation Compose** for screen navigation

## Build Verification

This project was scaffolded without a local Gradle/Android SDK environment.
To verify the build compiles:

```bash
cd apps/android-tv
./gradlew assembleDebug
```

If Gradle wrapper is missing:
```bash
gradle wrapper --gradle-version 8.9
```

## Known Limitations (Phase 1)

- Settings are not persisted (in-memory only)
- BGM is not implemented
- No autoplay timer yet
- Thumbnail/poster use same URL as main image (no derivatives)

## Next Steps (Phase 2)

- [ ] Persist settings to DataStore
- [ ] Implement autoplay with configurable interval
- [ ] Add BGM support
- [ ] Real thumbnail/poster derivatives
- [ ] Internal testing track on Play Console
