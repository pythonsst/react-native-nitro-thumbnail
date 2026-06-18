# API Reference

The entire public surface is **one function, one result type, and one error
class**. That's the whole API.

```ts
import { createThumbnail, ThumbnailError } from 'react-native-nitro-thumbnail';
import type { CreateThumbnailOptions, Thumbnail, ThumbnailErrorCode } from 'react-native-nitro-thumbnail';
```

| Export | Kind | Summary |
|---|---|---|
| `createThumbnail` | function | Generate a thumbnail. Returns `Promise<Thumbnail>`. |
| `ThumbnailError` | class | Typed error (`extends Error`) with a `.code`. |
| `CreateThumbnailOptions` | type | The options object you pass in. |
| `Thumbnail` | type | The result object you get back. |
| `ThumbnailErrorCode` | type | Union of the seven possible error codes. |
| *default export* | object | `{ createThumbnail }` — for [drop-in compatibility](./migration.md). |

---

## `createThumbnail(options)`

```ts
function createThumbnail(options: CreateThumbnailOptions): Promise<Thumbnail>;
```

Extracts a single frame from a local or remote video, scales it to fit your
bounds, encodes it to JPEG or PNG, writes it to the platform cache directory, and
resolves with metadata about the file.

### Options

```ts
interface CreateThumbnailOptions {
  url: string;
  timeStamp?: number;
  format?: 'jpeg' | 'png';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  cacheName?: string;
  dirSize?: number;
  headers?: Record<string, string>;
  timeToleranceMs?: number;
  onlySyncedFrames?: boolean;
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | **required** | A local `file://` URL, an absolute path (`/…`), or a remote `http(s)://` URL. |
| `timeStamp` | `number` | `0` | The frame to capture, in **milliseconds**. `1000` = the frame at 1.0 s. |
| `format` | `'jpeg' \| 'png'` | `'jpeg'` | Output encoding. |
| `maxWidth` | `number` | `512` | Upper bound on output width. Aspect ratio preserved; **never upscaled**. |
| `maxHeight` | `number` | `512` | Upper bound on output height. Aspect ratio preserved; **never upscaled**. |
| `quality` | `number` | `0.9` | JPEG quality in `0..1` (clamped). **Ignored for PNG** (lossless). |
| `cacheName` | `string` | — | Deterministic output filename. If a file with this name already exists, it's returned **without re-decoding**. See [caching](./caching.md). |
| `dirSize` | `number` | `100` | Cache cap in **MB**. After each write, oldest thumbnails are evicted (LRU) until the folder is under the cap. |
| `headers` | `Record<string, string>` | — | HTTP headers sent when fetching a remote video (e.g. `Authorization`). Values **must be strings**. |
| `timeToleranceMs` | `number` | `2000` | How far from `timeStamp` the decoder may pick a frame. Larger = faster, less exact. |
| `onlySyncedFrames` | `boolean` | `true` | Prefer the nearest keyframe (faster decode, slightly less precise timestamp). |

> **Platform note:** `cacheName` and `dirSize` are **no-ops on Web** — browsers
> have no persistent disk cache the library can manage, so each call produces a
> fresh in-memory object URL.

#### How sizing works

`maxWidth` and `maxHeight` define a **box**. The frame is scaled down to fit
inside that box while preserving its aspect ratio, and it is never enlarged:

```
scale = min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1)
```

A 1280×720 frame with the default 512×512 box becomes **512×288**. A 320×240
frame with the same box stays **320×240** (it already fits — no upscaling). The
`width`/`height` in the result are the **actual** output dimensions.

### Result — `Thumbnail`

```ts
interface Thumbnail {
  path: string;   // native: file:// URL · web: blob: object URL
  size: number;   // file size in bytes
  mime: string;   // 'image/jpeg' | 'image/png'
  width: number;  // actual output width  (≤ maxWidth)
  height: number; // actual output height (≤ maxHeight)
}
```

| Field | Type | Notes |
|---|---|---|
| `path` | `string` | On **native**, a `file://` URL inside the app's cache directory (`thumbnails/`). On **web**, an object URL — call `URL.revokeObjectURL(path)` when done to free memory. |
| `size` | `number` | Encoded file size in bytes. |
| `mime` | `string` | `'image/jpeg'` or `'image/png'`. |
| `width` | `number` | Actual width of the produced image. |
| `height` | `number` | Actual height of the produced image. |

Use it directly as an image source:

```tsx
const thumb = await createThumbnail({ url });
<Image source={{ uri: thumb.path }} style={{ width: thumb.width, height: thumb.height }} />
```

---

## `ThumbnailError`

```ts
class ThumbnailError extends Error {
  code: ThumbnailErrorCode;
}
```

Every rejection from `createThumbnail` is a `ThumbnailError`. Because it extends
the built-in `Error`, existing `try/catch` and error-logging code keeps working —
you just *also* get a typed `.code` to branch on.

```ts
try {
  await createThumbnail({ url });
} catch (e) {
  if (e instanceof ThumbnailError) {
    switch (e.code) {
      case 'FILE_NOT_FOUND':      /* show "video missing" */ break;
      case 'REMOTE_FETCH_FAILED': /* offer retry */          break;
      default:                    /* log e.message */
    }
  }
}
```

The seven codes and what they mean are documented in
**[Error handling → The error codes](./error-handling.md#the-error-codes)**.

---

## Quick recipes

**Capture at a specific time, as PNG**

```ts
await createThumbnail({ url, timeStamp: 2500, format: 'png' });
```

**Remote video behind auth**

```ts
await createThumbnail({
  url: 'https://media.example.com/clip.mp4',
  headers: { Authorization: `Bearer ${token}` },
});
```

**Small avatar-sized JPEG with aggressive compression**

```ts
await createThumbnail({ url, maxWidth: 96, maxHeight: 96, quality: 0.6 });
```

**Stable, reusable poster (decode once, reuse forever)**

```ts
await createThumbnail({ url, cacheName: `poster-${videoId}` });
```

More end-to-end examples live in the [README](../README.md#examples) and the
runnable [`example/`](../example) app.
