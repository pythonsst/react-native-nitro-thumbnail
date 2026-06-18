# react-native-nitro-thumbnail

Generate thumbnails from local or remote videos. Nitro-powered, pure Swift & Kotlin, New Architecture, iOS + Android + Web.

## Installation

```sh
npm install react-native-nitro-thumbnail react-native-nitro-modules
```

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/). On iOS, run `pod install`.

## Usage

```ts
import { createThumbnail } from 'react-native-nitro-thumbnail';

const thumb = await createThumbnail({
  url: 'file:///path/to/video.mp4', // local file path, or an http(s) URL
  timeStamp: 1000, // ms into the video
  format: 'jpeg', // 'jpeg' | 'png'
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.9, // 0..1, ignored for png
});

// { path, size, mime, width, height }
console.log(thumb.path);
```

It is a drop-in replacement for `react-native-create-thumbnail`: option names, result
fields, and defaults match, plus one additive option — `quality`.

### Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `url` | `string` | — | Required. Local `file://`/absolute path, or `http(s)` URL. |
| `timeStamp` | `number` | `0` | Milliseconds into the video. |
| `format` | `'jpeg' \| 'png'` | `'jpeg'` | Output image format. |
| `maxWidth` | `number` | `512` | Max width; aspect preserved, never upscaled. |
| `maxHeight` | `number` | `512` | Max height; aspect preserved, never upscaled. |
| `quality` | `number` | `0.9` | JPEG quality `0..1` (ignored for PNG). **Additive.** |
| `cacheName` | `string` | — | Deterministic filename; if it already exists it is returned without re-decoding. |
| `dirSize` | `number` | `100` | Thumbnail cache cap in MB (LRU eviction). |
| `headers` | `Record<string,string>` | — | Sent when fetching a remote video. |
| `timeToleranceMs` | `number` | `2000` | Frame-seek tolerance. |
| `onlySyncedFrames` | `boolean` | `true` | Prefer the closest sync frame. |

### Result

```ts
interface Thumbnail {
  path: string; // file:// URL (native) or object URL (web)
  size: number; // bytes
  mime: string; // 'image/jpeg' | 'image/png'
  width: number;
  height: number;
}
```

### Errors

Rejects with a `ThumbnailError` carrying a typed `.code`:
`INVALID_URL`, `FILE_NOT_FOUND`, `REMOTE_FETCH_FAILED`, `DECODE_FAILED`,
`UNSUPPORTED_FORMAT`, `WRITE_FAILED`, `UNKNOWN`.

```ts
import { createThumbnail, ThumbnailError } from 'react-native-nitro-thumbnail';

try {
  await createThumbnail({ url });
} catch (e) {
  if (e instanceof ThumbnailError) console.warn(e.code, e.message);
}
```

## Platform notes

- **iOS** (AVFoundation) and **Android** (`MediaMetadataRetriever`): local + remote
  videos stream directly (no manual download). Thumbnails are written to the app
  cache directory under `thumbnails/`.
- **Web** (`<video>` + `<canvas>`): subject to **CORS** — pass `headers` to fetch a
  cross-origin video where allowed. `path` is an **object URL**; call
  `URL.revokeObjectURL(path)` when you are done with it. There is no persistent disk
  cache on web, so **`cacheName` and `dirSize` are no-ops**.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
