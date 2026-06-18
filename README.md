# react-native-nitro-thumbnail

[![npm](https://img.shields.io/npm/v/react-native-nitro-thumbnail.svg)](https://www.npmjs.com/package/react-native-nitro-thumbnail)
[![license](https://img.shields.io/npm/l/react-native-nitro-thumbnail.svg)](./LICENSE)

Generate an image thumbnail from a **local or remote video** in React Native — one
async call, the same API on **iOS, Android, and Web**.

Powered by [Nitro Modules](https://nitro.margelo.com/): pure **Swift** & **Kotlin**,
New Architecture only, no Objective‑C/Java bridge glue.

```ts
import { createThumbnail } from 'react-native-nitro-thumbnail';

const thumb = await createThumbnail({ url: 'file:///path/to/video.mp4' });
// → { path: 'file:///…/thumb-xyz.jpg', size: 19856, mime: 'image/jpeg', width: 512, height: 288 }
```

## Why

- **Cross‑platform, one API.** iOS (AVFoundation), Android (`MediaMetadataRetriever`),
  and Web (`<video>` + `<canvas>`) behind a single TypeScript function.
- **Local & remote.** Pass a `file://` path or an `http(s)` URL — remote videos are
  streamed and decoded directly, no manual download step. Custom request `headers`
  are supported.
- **Drop‑in compatible** with [`react-native-create-thumbnail`](https://www.npmjs.com/package/react-native-create-thumbnail):
  the option names, result fields, and defaults match, so migrating is usually just
  changing the import. The only addition is a `quality` option.
- **Typed errors.** Failures reject with a `ThumbnailError` carrying a typed `.code`
  (e.g. `FILE_NOT_FOUND`, `REMOTE_FETCH_FAILED`) instead of opaque strings.
- **Built‑in caching.** Deterministic filenames (`cacheName`) skip re‑decoding, and a
  size cap (`dirSize`) evicts old thumbnails (LRU).

## Platform support

| Platform | Engine | Minimum |
|---|---|---|
| iOS | `AVAssetImageGenerator` (async `image(at:)` on iOS 16+) | iOS 13 |
| Android | `MediaMetadataRetriever.getScaledFrameAtTime` (fallback below API 27) | minSdk 24 |
| Web | `<video>` seek → `<canvas>` → `toBlob` | modern browsers |

Requires React Native **0.75+** with the **New Architecture** enabled.

## Installation

```sh
npm install react-native-nitro-thumbnail react-native-nitro-modules
# or: yarn add react-native-nitro-thumbnail react-native-nitro-modules
```

`react-native-nitro-modules` is a required peer dependency (it provides the Nitro runtime).

**iOS** — install pods:

```sh
cd ios && pod install
```

**Expo** — this is a native module, so it needs an **Expo dev build** (it does **not**
run in Expo Go). No config plugin is required:

```sh
npx expo install react-native-nitro-thumbnail react-native-nitro-modules
npx expo prebuild && npx expo run:ios   # or run:android
```

## Quick start

```ts
import { createThumbnail, ThumbnailError } from 'react-native-nitro-thumbnail';

async function makeThumb(videoUri: string) {
  try {
    const thumb = await createThumbnail({
      url: videoUri,     // 'file:///…' or 'https://…'
      timeStamp: 1000,   // grab the frame at 1.0s
      format: 'jpeg',    // 'jpeg' | 'png'
      maxWidth: 512,     // fit within 512×512, aspect preserved, never upscaled
      maxHeight: 512,
      quality: 0.9,      // jpeg quality 0..1 (ignored for png)
    });

    return thumb.path;   // e.g. <Image source={{ uri: thumb.path }} />
  } catch (e) {
    if (e instanceof ThumbnailError) {
      console.warn(`thumbnail failed [${e.code}]: ${e.message}`);
    }
    throw e;
  }
}
```

## API

### `createThumbnail(options): Promise<Thumbnail>`

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | **required** | Local `file://`/absolute path, or an `http(s)` URL. |
| `timeStamp` | `number` | `0` | Time in **milliseconds** to capture the frame at. |
| `format` | `'jpeg' \| 'png'` | `'jpeg'` | Output image format. |
| `maxWidth` | `number` | `512` | Max width. Aspect ratio preserved; never upscaled. |
| `maxHeight` | `number` | `512` | Max height. Aspect ratio preserved; never upscaled. |
| `quality` | `number` | `0.9` | JPEG quality, `0..1` (clamped). Ignored for PNG. **Additive option.** |
| `cacheName` | `string` | — | Deterministic output filename. If the file already exists it is returned **without re‑decoding**. |
| `dirSize` | `number` | `100` | Thumbnail cache cap in **MB**. After each write, oldest thumbnails are evicted (LRU) until under the cap. |
| `headers` | `Record<string, string>` | — | HTTP headers sent when fetching a remote video. |
| `timeToleranceMs` | `number` | `2000` | How far from `timeStamp` the decoder may pick a frame. |
| `onlySyncedFrames` | `boolean` | `true` | Prefer the closest keyframe (faster, less exact). |

> `cacheName` and `dirSize` are **no‑ops on Web** (no persistent disk cache).

#### Result — `Thumbnail`

```ts
interface Thumbnail {
  path: string;   // native: file:// URL · web: object URL
  size: number;   // file size in bytes
  mime: string;   // 'image/jpeg' | 'image/png'
  width: number;  // actual thumbnail width
  height: number; // actual thumbnail height
}
```

On native, thumbnails are written to the app cache directory under `thumbnails/`.
On web, `path` is an object URL — call `URL.revokeObjectURL(path)` when you're done.

### `ThumbnailError`

Every failure rejects with a `ThumbnailError extends Error` whose `.code` is one of:

| Code | Meaning |
|---|---|
| `INVALID_URL` | URL missing, malformed, or an unsupported scheme. |
| `FILE_NOT_FOUND` | Local file does not exist. |
| `REMOTE_FETCH_FAILED` | Network/HTTP failure fetching a remote video. |
| `DECODE_FAILED` | Could not decode the video / extract a frame. |
| `UNSUPPORTED_FORMAT` | Unsupported output format. |
| `WRITE_FAILED` | Could not write the thumbnail to disk. |
| `UNKNOWN` | Anything else. |

## Examples

**Remote video with auth headers**

```ts
const thumb = await createThumbnail({
  url: 'https://media.example.com/clips/abc.mp4',
  headers: { Authorization: `Bearer ${token}` },
  timeStamp: 2000,
});
```

**PNG output**

```ts
const thumb = await createThumbnail({ url, format: 'png' }); // quality is ignored
```

**Deterministic cache (reuse instead of re‑decoding)**

```ts
// First call decodes and writes <cache>/thumbnails/poster-42.jpg
await createThumbnail({ url, cacheName: 'poster-42' });
// Subsequent calls return the existing file immediately
const cached = await createThumbnail({ url, cacheName: 'poster-42' });
```

## Caching

- Thumbnails live in a `thumbnails/` folder inside the platform cache directory
  (iOS Caches, Android `cacheDir`).
- **`cacheName`** gives a stable filename; if it already exists, that file's metadata
  is returned without touching the decoder.
- **`dirSize`** (MB) caps the folder. After writing a new thumbnail, the oldest files
  (by last‑modified time) are deleted until the total is under the cap.

## How it works

The public `createThumbnail()` lives in TypeScript: it validates options, applies the
defaults above, and calls a Nitro `HybridObject` whose `create()` method is implemented
natively — Swift on iOS, Kotlin on Android — and in plain DOM APIs on Web. Native errors
are mapped back into a typed `ThumbnailError`.

See the [`example/`](./example) app for a runnable demo (local + remote, on a button tap).

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
