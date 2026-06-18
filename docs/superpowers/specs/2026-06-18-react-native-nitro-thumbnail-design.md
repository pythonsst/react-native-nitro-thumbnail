# react-native-nitro-thumbnail — Design Spec

- **Date:** 2026-06-18
- **Status:** Approved (design); pending implementation plan
- **Package:** `react-native-nitro-thumbnail` (npm name verified available 2026-06-18)
- **Inspired by:** [`react-native-create-thumbnail`](https://github.com/souvik-ghosh/react-native-create-thumbnail) (v2.2.0, Obj-C/Java)

## 1. Summary & Positioning

A new, standalone, open-source React Native library that generates a thumbnail image
from a local or remote video. It is a **drop-in API-compatible** successor to
`react-native-create-thumbnail`, rebuilt as a modern, **New-Architecture-first** module
written in **pure Swift and Kotlin** via **Nitro Modules**, plus a **web** implementation.

Goals:
- Drop-in: existing `createThumbnail(...)` call sites work unchanged.
- World-class quality: thorough types, tests, CI, docs, example app.
- Modern foundation: pure Swift/Kotlin (no Obj-C/Java glue), backward-compatible across
  Old + New architecture, fast JSI calls.
- Cross-platform: iOS, Android, and Web behind one unified TypeScript API.

Non-goals (v1): video metadata extraction, multi-frame/sprite generation, GIF previews,
macOS/visionOS. These are explicitly out of scope (YAGNI) and may be considered post-v1.

## 2. Module System Decision (Nitro Modules)

- **Mobile (iOS + Android):** Nitro Modules. Rationale: first-class **pure Swift & Kotlin**
  (the standard TurboModule path forces Objective-C++ shims around Swift), works on **both**
  Old and New architecture (Nitro *Modules* — not Views — support both), ~16× faster JSI
  calls than TurboModules, async via Swift `async/await` and Kotlin coroutines, proven in
  production (mmkv, vision-camera, etc.).
- **Web:** independent `.web.ts` implementation using browser APIs. Web cannot use native
  code regardless of module system, so the Nitro choice does not constrain web.
- **Costs accepted:** higher toolchain floor (RN 0.75+, Xcode 16.4+, NDK 27+) and a
  `react-native-nitro-modules` peer dependency. Acceptable for a New-Arch-first 2026 library.

Sources: Nitro minimum-requirements, "What is Nitro", npm react-native-nitro-modules,
Callstack bridgeless-native-development.

## 3. Public API

Single primary export, drop-in compatible with the original.

```ts
import { createThumbnail, ThumbnailError } from 'react-native-nitro-thumbnail'

export interface CreateThumbnailOptions {
  url: string                       // file:// | http(s):// | content:// | bundled asset
  timeStamp?: number                // ms        (default 0)
  format?: 'jpeg' | 'png'           //           (default 'jpeg')
  maxWidth?: number                 // px         (default 512)
  maxHeight?: number                // px         (default 512)
  dirSize?: number                  // thumbnail cache cap, MB (default 100)
  cacheName?: string                // dedup key; if present and cached, returns cached file
  headers?: Record<string, string>  // HTTP headers for remote videos (e.g. Authorization)
  timeToleranceMs?: number          // iOS frame tolerance (default 2000)
  onlySyncedFrames?: boolean        // Android: closest sync frame only (default true)
  quality?: number                  // ADDITIVE: 0..1 JPEG quality (default 0.9); ignored for png
}

export interface Thumbnail {
  path: string                      // file path (mobile) / object URL (web)
  size: number                      // bytes
  mime: string                      // 'image/jpeg' | 'image/png'
  width: number                     // actual px
  height: number                    // actual px
}

export function createThumbnail(options: CreateThumbnailOptions): Promise<Thumbnail>
```

- **Field names and defaults preserved exactly** from the original for drop-in compatibility.
- `quality` is the only additive option (approved). Everything else matches the original.
- Validation/normalization (defaults, range clamps, format check) lives in `src/index.ts`
  before crossing into native, so all platforms share one validation path.

## 4. Repository Structure (builder-bob monorepo)

```
react-native-nitro-thumbnail/
  package.json
  src/
    index.ts                 # public API: validation, defaults, error mapping
    index.web.ts             # web implementation (video + canvas)
    specs/Thumbnail.nitro.ts # Nitro HybridObject spec (1 method: create)
    types.ts                 # CreateThumbnailOptions, Thumbnail, error codes
    errors.ts                # ThumbnailError class + code constants
  nitrogen/                  # nitrogen-generated C++/Swift/Kotlin glue (generated)
  ios/
    HybridThumbnail.swift    # AVFoundation implementation
  android/
    src/main/java/com/nitrothumbnail/HybridThumbnail.kt  # MediaMetadataRetriever impl
    build.gradle
  cpp/                       # autolinking glue (generated)
  example/                   # RN example app, New Architecture ON
  plugin/                    # Expo config plugin (app.plugin.js entry)
  .github/workflows/ci.yml
  nitro.json
  react-native-nitro-thumbnail.podspec
  babel.config.js · tsconfig.json · jest config · eslint/prettier
  README.md · docs/          # docs + migration guide
```

## 5. Nitro Spec

`src/specs/Thumbnail.nitro.ts` declares a `HybridObject<{ ios: 'swift', android: 'kotlin' }>`
with a single async method:

```ts
interface Thumbnail extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  create(options: NativeThumbnailOptions): Promise<NativeThumbnailResult>
}
```

`NativeThumbnailOptions`/`NativeThumbnailResult` are plain interfaces (Nitro structs).
`headers` is passed as `Record<string, string>`. `nitrogen` generates the Swift protocol
(`HybridThumbnailSpec`) and Kotlin spec; we implement those in `ios/` and `android/`.

## 6. Native Implementation

### iOS (Swift, AVFoundation)
- Build `AVURLAsset`; for remote URLs pass `headers` via
  `AVURLAssetHTTPHeaderFieldsKey` option.
- `AVAssetImageGenerator`: `appliesPreferredTrackTransform = true`,
  `maximumSize = CGSize(maxWidth, maxHeight)`,
  `requestedTimeToleranceBefore/After = CMTime(timeToleranceMs)`.
- Extract frame at `CMTime(timeStamp ms)`; prefer async `image(at:)` (iOS 16+) with a
  `copyCGImage(at:actualTime:)` fallback for iOS 13–15.
- Encode to JPEG (`quality`) or PNG via ImageIO; write to Caches subfolder.
- Runs on a background context; bridged to JS via `Promise.async`.

### Android (Kotlin, MediaMetadataRetriever)
- `MediaMetadataRetriever.setDataSource(url, headers)` (headers map for remote).
- `getScaledFrameAtTime(timeUs, option, maxWidth, maxHeight)` where
  `option = OPTION_CLOSEST_SYNC` if `onlySyncedFrames` else `OPTION_CLOSEST`.
  Fallback below API 27: `getFrameAtTime` + `Bitmap.createScaledBitmap`.
- `Bitmap.compress(JPEG quality | PNG)` → write to `cacheDir/thumbnails`.
- Runs in a coroutine; bridged via `Promise.async`.

### Web (TypeScript)
- `fetch(url, { headers })` → blob → object URL (lets `headers` work under CORS), or use a
  direct URL when no headers.
- Create an `<video>`, seek to `timeStamp / 1000`s, draw current frame to a `<canvas>`
  sized to fit within `maxWidth × maxHeight` (preserve aspect), `canvas.toBlob(format,
  quality)`.
- Return an object URL as `path`. Document limitations: subject to CORS; no persistent disk
  cache (in-memory/object-URL only); `cacheName`/`dirSize` are best-effort no-ops on web.

**Remote videos:** no manual download step — AVURLAsset (iOS) and MediaMetadataRetriever
(Android) stream frames directly from the URL. The cache governs **generated thumbnails**,
matching the original library's semantics.

## 7. Caching (mobile)

- Cache dir: a `thumbnails/` subfolder under the platform cache dir (iOS Caches, Android
  `cacheDir`).
- `cacheName`: when provided, produces a deterministic filename. If that file already
  exists, return it immediately without re-decoding.
- `dirSize` (MB): after writing, enforce the cap via **LRU eviction** — delete oldest
  thumbnails (by last-modified) until total size ≤ cap.

## 8. Error Handling

Reject the Promise with a `ThumbnailError` (subclass of `Error`) carrying a typed `.code`:

| Code | Meaning |
|---|---|
| `INVALID_URL` | URL missing/malformed/unsupported scheme |
| `FILE_NOT_FOUND` | Local file does not exist |
| `REMOTE_FETCH_FAILED` | Network/HTTP failure fetching remote video |
| `DECODE_FAILED` | Could not decode video / extract frame |
| `UNSUPPORTED_FORMAT` | Unsupported codec/container/output format |
| `WRITE_FAILED` | Could not write thumbnail to disk |
| `UNKNOWN` | Anything else |

Native layers throw structured errors (code + message); the TS wrapper maps them to
`ThumbnailError`. This is an improvement over the original's stringly-typed errors while
remaining non-breaking (it still rejects the Promise).

## 9. Testing Strategy

- **JS/TS (Jest):** option validation & defaults, error mapping, web implementation
  (jsdom + mocked `<video>`/`<canvas>`).
- **iOS (XCTest):** option→generator mapping, JPEG/PNG encoding, cache filename + LRU
  eviction.
- **Android (JUnit/Robolectric):** option→retriever mapping, scaling fallback path, cache
  eviction.
- **Example app:** New Architecture ON; exercises local + remote, jpeg + png, varied
  sizes/timestamps, headers.
- **CI (GitHub Actions):** eslint + prettier, `tsc` typecheck, builder-bob build,
  `xcodebuild` (iOS), gradle `assemble` (Android), JS tests, native tests.

## 10. Expo Support

- Ship an **Expo config plugin** (`plugin/`, exposed via `app.plugin.js`) so the library
  works with Expo prebuild / dev client. It is a native module, so it will **not** run in
  Expo Go — documented clearly. The plugin wires any required iOS/Android config.

## 11. Compatibility Floors

| | Minimum |
|---|---|
| React Native | 0.75+ (both Old + New architecture) |
| iOS | 13+ (async image API on 16+, fallback below) |
| Xcode / Swift | 16.4+ / 5.9+ |
| Android | minSdk 24, compileSdk 34 |
| NDK | 27+ |
| Peer dep | `react-native-nitro-modules` |

Not compatible with Expo Go. License: MIT.

## 12. Build Approach

Scaffold with an established Nitro-aware generator (`create-react-native-library` Nitro
template / Margelo Nitro starter) to get correct both-arch wiring, `nitrogen` codegen,
builder-bob TS build, example app, and CI conventions. Then implement the real
Swift/Kotlin/Web logic. The exact generator is selected at the start of implementation and
its output is verified to build (no-op) before any logic is written.

## 13. Milestones (feed the implementation plan)

- **M0** Scaffold + Nitro spec; both platform builds green (no-op create).
- **M1** iOS Swift local thumbnail (core options) + example wired.
- **M2** Android Kotlin local thumbnail (core options).
- **M3** Remote videos + `headers` (both platforms).
- **M4** Caching: `cacheName` dedup + `dirSize` LRU eviction (both).
- **M5** Web implementation (video + canvas).
- **M6** Expo config plugin.
- **M7** Error hardening + full test suite + CI green.
- **M8** README + migration guide + docs site; publish **v1.0.0**.

(Web is in v1; docs site lands at M8/post-v1.)

## 14. Open Questions / Assumptions

- Assumed approval of: the additive `quality` option, Android `minSdk 24`, and the
  iOS→Android→remote→cache→web→Expo milestone order (user said "Let's do it").
- Generator choice (create-react-native-library vs Margelo starter) finalized at M0.
- Web `path` returned as an object URL (caller is responsible for revoking) — to confirm
  during web milestone.
