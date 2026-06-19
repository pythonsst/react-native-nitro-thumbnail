# Issues this library solves

`react-native-nitro-thumbnail` was built knowing the common failure modes of
video-thumbnail wrappers. This page maps the real, reported issues against
[`react-native-create-thumbnail`](https://github.com/souvik-ghosh/react-native-create-thumbnail/issues)
to how this library handles each one — most are solved **by design** (Kotlin +
Nitro + the New Architecture), not by patching symptoms.

> Issue numbers below reference the
> [react-native-create-thumbnail issue tracker](https://github.com/souvik-ghosh/react-native-create-thumbnail/issues).

## Android build & compilation

The single largest cluster of reports. All structural, all gone here.

| Reported problem | Issues | How nitro-thumbnail avoids it |
|---|---|---|
| `Unreported exception IOException` from `retriever.release()` on SDK 33+ | #69, #87, #96, #98 | Written in **Kotlin**, which has no checked exceptions — `release()` in a `finally` block just compiles. |
| `package org.apache.commons.io … does not exist` / `LastModifiedFileComparator` missing | #29, #31 | **No Apache Commons dependency.** LRU eviction is a tiny pure-Kotlin helper (`filesToEvict`), unit-tested. |
| jcenter / Maven resolution timeouts | #78, #68 | Uses only **`google()` + `mavenCentral()`** — jcenter is dead and never referenced. |
| AGP 8 / Gradle 9 / RN 0.71+ compatibility | #147, #136, #60 | Fresh New-Architecture scaffold: **AGP 8.7.2**, Kotlin 2.0.21, Java 17, CMake + prefab. |

## Remote URLs & network failures

| Reported problem | Issues | How nitro-thumbnail handles it |
|---|---|---|
| App **crashes** on a remote video URL (socket / `getExceptionHandler`) | #131, #80 | Remote `setDataSource(url, headers)` (Android) and `AVURLAsset` (iOS) are wrapped — a network failure **rejects** with a typed `REMOTE_FETCH_FAILED`, it never crashes the app. |
| `setDataSource failed` for YouTube links | #62 | A YouTube *page* URL isn't a direct media stream — no library can decode it. We fail cleanly with `REMOTE_FETCH_FAILED` and document that `url` must point at an actual video file/stream. |
| Custom auth needed for protected videos | — | First-class `headers` option, forwarded to `AVURLAssetHTTPHeaderFieldsKey` (iOS) and `setDataSource(url, headers)` (Android). |

## UI-thread blocking & performance

| Reported problem | Issues | How nitro-thumbnail handles it |
|---|---|---|
| Animations stutter / JS frame rate drops while generating | #24, #48 | Every call runs inside Nitro's **`Promise.async`** on a background thread on *both* platforms. Decoding never touches the UI/JS thread, so batch generation doesn't jank the UI. |

## Local files, gallery & `content://` URIs

| Reported problem | Issues | How nitro-thumbnail handles it |
|---|---|---|
| `setDataSource failed: status = 0x80000000` for gallery / `content://` videos | #27 | **`content://` URIs are supported** on Android — opened via `setDataSource(context, uri)`, the correct path for Storage Access Framework / picker results. |
| "File doesn't exist or not supported" for a valid URI | #26 | Clear separation: a missing local file is `FILE_NOT_FOUND`; an unreadable/undecodable one is `DECODE_FAILED` — you can tell *which* went wrong. |
| Thumbnails saved into the device **gallery** | #9 | Output is written to the app **cache directory** (`cacheDir/thumbnails/`), which MediaStore does not scan. No gallery pollution. |

## iOS-specific

| Reported problem | Issues | How nitro-thumbnail handles it |
|---|---|---|
| `AVFoundationErrorDomain` -11832 / -11800 "cannot be used" crashes | #56, #117 | Frame extraction is wrapped; an undecodable asset becomes a typed `DECODE_FAILED` (or `REMOTE_FETCH_FAILED` for network), surfaced to JS — not an unhandled native error. |
| Thumbnail returns **0 width / 0 height** | #7 | `width`/`height` are read from the actual decoded `CGImage`, so they're always the real output dimensions. |
| Wrong orientation | — | `appliesPreferredTrackTransform = true` honors the video's rotation metadata, so portrait clips come out upright. |

## API, modules & ergonomics

| Reported problem | Issues | How nitro-thumbnail handles it |
|---|---|---|
| `null is not an object (CreateThumbnail.create)` in Expo | #72 | Nitro autolinks the HybridObject; documented to need an **Expo dev build** (not Expo Go). |
| Peer-dependency range too strict | #45 | `react` and `react-native` peers are unconstrained (`*`); only `react-native-nitro-modules` is pinned. |
| Configurable JPEG/PNG **quality** | #148 (added late upstream) | First-class `quality` option (`0..1`) from day one. |
| Precise frame **time tolerance** | #142 (added late upstream) | First-class `timeToleranceMs` option (set `0` for an exact seek). |
| Opaque `Error: null` | #16 | Every failure is a typed `ThumbnailError` with a `.code` — never a silent `null`. |

## Honest limitations

This library is not magic. A few things no thumbnail library can or should do:

- **YouTube / streaming-page URLs** (`youtube.com/watch?v=…`) are not direct media
  and won't decode. Pass a real video file or stream URL.
- **iOS Photos `ph://` / `assets-library://` URIs** aren't opened directly — resolve
  them to a `file://` path first (most image pickers already hand you one). Android
  `content://` *is* supported.
- **DRM-protected** media can't be decoded by `AVFoundation` /
  `MediaMetadataRetriever`.

When something genuinely can't be done, you get a typed
[`ThumbnailError`](./error-handling.md) — not a crash.

## Summary

| Theme | Status |
|---|---|
| Android build/compile breakage | ✅ Solved by Kotlin + modern AGP, no jcenter, no Apache Commons |
| Remote-URL crashes | ✅ Typed `REMOTE_FETCH_FAILED`, never crashes |
| UI-thread jank | ✅ Off-thread via Nitro `Promise.async` |
| `content://` / gallery videos | ✅ Supported |
| Gallery pollution | ✅ Writes to cache dir only |
| iOS decode/0-dimension/orientation | ✅ Typed errors, real dimensions, correct orientation |
| Opaque/null errors | ✅ Typed `ThumbnailError.code` everywhere |

Switching over? See the [Migration guide](./migration.md) — it's usually a one-line
import change.
