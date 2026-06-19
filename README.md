<div align="center">

<br/>

# 🎬 react-native-nitro-thumbnail

### Generate a thumbnail from **any video** — local or remote — with one async call.

**The same API on iOS, Android & Web.** Powered by [Nitro](https://nitro.margelo.com/):
pure Swift & Kotlin, New Architecture, no bridge.

<br/>

[![npm version](https://img.shields.io/npm/v/react-native-nitro-thumbnail.svg?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/react-native-nitro-thumbnail)
[![npm downloads](https://img.shields.io/npm/dm/react-native-nitro-thumbnail.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/react-native-nitro-thumbnail)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-native-nitro-thumbnail?style=flat-square&color=8b5cf6&label=min%2Bgzip)](https://bundlephobia.com/package/react-native-nitro-thumbnail)
[![license](https://img.shields.io/npm/l/react-native-nitro-thumbnail.svg?style=flat-square&color=2563eb)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](./src/types.ts)

[![platforms](https://img.shields.io/badge/platforms-iOS%20·%20Android%20·%20Web-16a34a?style=flat-square)](#-platform-support)
[![New Architecture](https://img.shields.io/badge/RN-New%20Architecture-61dafb?style=flat-square&logo=react)](https://reactnative.dev/architecture/landing-page)
[![powered by Nitro](https://img.shields.io/badge/powered%20by-Nitro%20Modules-e0218a?style=flat-square)](https://nitro.margelo.com/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-16a34a?style=flat-square)](./CONTRIBUTING.md)

<br/>

### [📖 **Read the Docs**](https://react-native-nitro-thumbnail.vercel.app) &nbsp;·&nbsp; [🚀 Quick Start](https://react-native-nitro-thumbnail.vercel.app/getting-started/quick-start) &nbsp;·&nbsp; [🧰 API](https://react-native-nitro-thumbnail.vercel.app/guides/api-reference) &nbsp;·&nbsp; [🔀 Migrate](https://react-native-nitro-thumbnail.vercel.app/guides/migration) &nbsp;·&nbsp; [🛡️ Issues Solved](https://react-native-nitro-thumbnail.vercel.app/guides/comparison)

</div>

<br/>

```ts
import { createThumbnail } from 'react-native-nitro-thumbnail';

const thumb = await createThumbnail({ url: 'https://media.example.com/clip.mp4' });
// → { path: 'file:///…/thumb.jpg', size: 19856, mime: 'image/jpeg', width: 512, height: 288 }

<Image source={{ uri: thumb.path }} />
```

That's the whole API. **One function.** It works the same whether the video is a
`file://` on disk or an `https://` URL behind auth headers — and whether you're on an
iPhone, an Android tablet, or in a browser.

---

## 🎥 See it in action

<div align="center">

<video src="https://raw.githubusercontent.com/pythonsst/react-native-nitro-thumbnail/main/example/assets/sample.mp4" poster="https://raw.githubusercontent.com/pythonsst/react-native-nitro-thumbnail/main/docs/assets/demo-thumbnail.jpg" controls muted loop width="640"></video>

<table>
<tr>
<td align="center" width="62%">

**The frame `createThumbnail()` extracts** — `{ timeStamp: 2000, maxWidth: 1280 }`

<img src="https://raw.githubusercontent.com/pythonsst/react-native-nitro-thumbnail/main/docs/assets/demo-thumbnail.jpg" alt="Thumbnail produced by createThumbnail()" width="100%" />

</td>
<td align="center" width="38%">

**Running on iOS** &nbsp;[▶︎ clip](https://raw.githubusercontent.com/pythonsst/react-native-nitro-thumbnail/main/docs/assets/demo-ios.mp4)

<a href="https://raw.githubusercontent.com/pythonsst/react-native-nitro-thumbnail/main/docs/assets/demo-ios.mp4"><img src="https://raw.githubusercontent.com/pythonsst/react-native-nitro-thumbnail/main/docs/assets/demo-ios-poster.jpg" alt="The example app generating a thumbnail on iOS" width="100%" /></a>

</td>
</tr>
</table>

<sub>Demo clip: <a href="https://www.sintel.org">Sintel</a> © Blender Foundation, CC-BY 3.0.</sub>

</div>

---

## ✨ Features

|  |  |
|---|---|
| 🧩 **One API, three engines** | iOS (`AVFoundation`), Android (`MediaMetadataRetriever`), Web (`<video>`+`<canvas>`) behind one typed function. |
| 🌐 **Local & remote** | `file://`, absolute paths, `content://` (Android), or `http(s)` URLs — streamed and decoded directly, no manual download. Custom `headers` supported. |
| ⚡ **Built on Nitro** | Pure Swift & Kotlin over JSI — no Obj-C/Java bridge, no JSON marshalling. The native contract is generated from one TS spec. |
| 🧵 **Off the main thread** | Every call runs async on a background thread, so batch generation never janks your UI. |
| 🎯 **Typed errors** | Failures reject with a `ThumbnailError` carrying a typed `.code` (`FILE_NOT_FOUND`, `REMOTE_FETCH_FAILED`, …). |
| 💾 **Built-in caching** | Deterministic filenames skip re-decoding; a size cap evicts old thumbnails (LRU). Writes to the cache dir — never your gallery. |
| 🔀 **Drop-in replacement** | Matches [`react-native-create-thumbnail`](https://www.npmjs.com/package/react-native-create-thumbnail) — usually a one-line import change. |
| 🛡️ **Solves the known issues** | Built to avoid the [reported failure modes](https://react-native-nitro-thumbnail.vercel.app/guides/comparison) of older wrappers. |

---

## 🗺️ How it works

One TypeScript function validates your input and applies defaults, then calls a Nitro
`HybridObject` implemented natively per platform. **The box labelled "your app" never
changes — only the engine behind it does.**

<div align="center">
<img src="https://raw.githubusercontent.com/pythonsst/react-native-nitro-thumbnail/main/docs/assets/architecture.png" alt="Architecture: one createThumbnail() call decoded natively on iOS, Android, and Web" width="100%" />
</div>

> 📖 The complete request lifecycle — cache check, decode, encode, write, evict — with
> sequence diagrams, lives in the [Architecture guide](https://react-native-nitro-thumbnail.vercel.app/guides/architecture).

---

## 📦 Installation

```sh
npm install react-native-nitro-thumbnail react-native-nitro-modules
# or: yarn add react-native-nitro-thumbnail react-native-nitro-modules
```

`react-native-nitro-modules` is a **required peer dependency** (the Nitro runtime).

**iOS** — install pods:

```sh
cd ios && pod install
```

**Expo** — needs an [Expo dev build](https://docs.expo.dev/develop/development-builds/introduction/)
(not Expo Go). No config plugin required:

```sh
npx expo install react-native-nitro-thumbnail react-native-nitro-modules
npx expo prebuild && npx expo run:ios   # or run:android
```

> Requires **React Native 0.75+** with the **New Architecture** enabled.

---

## 🚀 Quick start

```ts
import { createThumbnail, ThumbnailError } from 'react-native-nitro-thumbnail';

async function makeThumb(videoUri: string) {
  try {
    const thumb = await createThumbnail({
      url: videoUri,     // 'file:///…', 'content://…' (Android), or 'https://…'
      timeStamp: 1000,   // grab the frame at 1.0s (milliseconds)
      format: 'jpeg',    // 'jpeg' | 'png'
      maxWidth: 512,     // fit within 512×512, aspect preserved, never upscaled
      maxHeight: 512,
      quality: 0.9,      // jpeg quality 0..1 (ignored for png)
    });

    return thumb.path;   // → <Image source={{ uri: thumb.path }} />
  } catch (e) {
    if (e instanceof ThumbnailError) {
      console.warn(`thumbnail failed [${e.code}]: ${e.message}`);
    }
    throw e;
  }
}
```

---

## 📱 Platform support

| Platform | Engine | Minimum | Notes |
|---|---|---|---|
| 🍎 **iOS** | `AVAssetImageGenerator` | iOS 13 | async `image(at:)` on iOS 16+, `copyCGImage` fallback below |
| 🤖 **Android** | `MediaMetadataRetriever` | minSdk 24 | `getScaledFrameAtTime` on API 27+, scale-after fallback below |
| 🌐 **Web** | `<video>` → `<canvas>` → `toBlob` | modern browsers | resolved automatically via `index.web.ts` |

---

## 🧰 API

`createThumbnail(options: CreateThumbnailOptions): Promise<Thumbnail>`

<details open>
<summary><b>Options</b></summary>

<br/>

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | **required** | Local `file://`/absolute path, `content://` (Android), or `http(s)` URL. |
| `timeStamp` | `number` | `0` | Frame time in **milliseconds**. |
| `format` | `'jpeg' \| 'png'` | `'jpeg'` | Output format. |
| `maxWidth` | `number` | `512` | Max width — aspect preserved, never upscaled. |
| `maxHeight` | `number` | `512` | Max height — aspect preserved, never upscaled. |
| `quality` | `number` | `0.9` | JPEG quality `0..1` (clamped). Ignored for PNG. |
| `cacheName` | `string` | — | Deterministic filename; existing file returned **without re-decoding**. |
| `dirSize` | `number` | `100` | Cache cap in **MB** (LRU eviction). |
| `headers` | `Record<string,string>` | — | HTTP headers for remote fetches. |
| `timeToleranceMs` | `number` | `2000` | How far from `timeStamp` a frame may be picked (`0` = exact). |
| `onlySyncedFrames` | `boolean` | `true` | Prefer the nearest keyframe (faster). |

</details>

<details>
<summary><b>Result — <code>Thumbnail</code></b></summary>

<br/>

```ts
interface Thumbnail {
  path: string;   // native: file:// URL · web: blob: object URL
  size: number;   // file size in bytes
  mime: string;   // 'image/jpeg' | 'image/png'
  width: number;  // actual output width  (≤ maxWidth)
  height: number; // actual output height (≤ maxHeight)
}
```

On native, `path` is a `file://` URL in the app cache dir. On web it's an object URL —
call `URL.revokeObjectURL(path)` when done.

</details>

<details>
<summary><b>Errors — <code>ThumbnailError.code</code></b></summary>

<br/>

`INVALID_URL` · `FILE_NOT_FOUND` · `REMOTE_FETCH_FAILED` · `DECODE_FAILED` ·
`UNSUPPORTED_FORMAT` · `WRITE_FAILED` · `UNKNOWN`

Every failure is a typed `ThumbnailError extends Error`. Full descriptions in the
[Error Handling guide](https://react-native-nitro-thumbnail.vercel.app/guides/error-handling).

</details>

📖 Full reference with recipes → **[API docs](https://react-native-nitro-thumbnail.vercel.app/guides/api-reference)**

---

## 🛡️ Built to solve the known issues

This library was written knowing the common failure modes of video-thumbnail wrappers.
The pain points reported against older libraries are **solved by design**:

- ✅ **No Android build breakage** — Kotlin (no checked-`IOException`), modern AGP, no jcenter, no Apache Commons.
- ✅ **Remote URLs never crash** — network failures reject with a typed `REMOTE_FETCH_FAILED`.
- ✅ **No UI jank** — decoding runs off the main thread via Nitro `Promise.async`.
- ✅ **`content://` gallery videos work** on Android.
- ✅ **No gallery pollution** — thumbnails go to the cache dir, not MediaStore.
- ✅ **Typed errors, never a silent `null`.**

📖 See the full issue-by-issue breakdown → **[Issues Solved](https://react-native-nitro-thumbnail.vercel.app/guides/comparison)**

---

## 💡 Examples

<details>
<summary><b>Remote video with auth headers</b></summary>

<br/>

```ts
const thumb = await createThumbnail({
  url: 'https://media.example.com/clips/abc.mp4',
  headers: { Authorization: `Bearer ${token}` },
  timeStamp: 2000,
});
```

</details>

<details>
<summary><b>Deterministic cache — decode once, reuse forever</b></summary>

<br/>

```ts
// First call decodes and writes thumbnails/poster-42.jpg
await createThumbnail({ url, cacheName: 'poster-42' });
// Subsequent calls (even after restart) return it instantly — no decode
const cached = await createThumbnail({ url, cacheName: 'poster-42' });
```

</details>

<details>
<summary><b>Typed error handling</b></summary>

<br/>

```ts
try {
  await createThumbnail({ url });
} catch (e) {
  if (e instanceof ThumbnailError && e.code === 'REMOTE_FETCH_FAILED') {
    // offer a retry
  }
}
```

</details>

There's a runnable demo (local + remote, on a button tap) in [`example/`](./example).

---

## 📚 Documentation

Everything lives on the **[documentation site →](https://react-native-nitro-thumbnail.vercel.app)**

| | | |
|---|---|---|
| [🏛️ Architecture](https://react-native-nitro-thumbnail.vercel.app/guides/architecture) | [📖 API Reference](https://react-native-nitro-thumbnail.vercel.app/guides/api-reference) | [⚠️ Error Handling](https://react-native-nitro-thumbnail.vercel.app/guides/error-handling) |
| [💾 Caching](https://react-native-nitro-thumbnail.vercel.app/guides/caching) | [🧑‍🍳 Recipes](https://react-native-nitro-thumbnail.vercel.app/guides/recipes) | [🔀 Migration](https://react-native-nitro-thumbnail.vercel.app/guides/migration) |
| [🛡️ Issues Solved](https://react-native-nitro-thumbnail.vercel.app/guides/comparison) | [🍎 iOS](https://react-native-nitro-thumbnail.vercel.app/platforms/ios) | [🤖 Android](https://react-native-nitro-thumbnail.vercel.app/platforms/android) |
| [🌐 Web](https://react-native-nitro-thumbnail.vercel.app/platforms/web) | | |

---

## 🤝 Contributing

PRs of every size are welcome — a great first one is improving a doc you found confusing.

- 🛠️ [How the project is built & how to make a change](https://react-native-nitro-thumbnail.vercel.app/contributing)
- 📋 [Development workflow](./CONTRIBUTING.md) · 🤗 [Code of conduct](./CODE_OF_CONDUCT.md) · 🐛 [Open an issue](https://github.com/pythonsst/react-native-nitro-thumbnail/issues)

```sh
yarn            # install (Yarn 4 workspaces)
yarn nitrogen   # regenerate native specs after editing *.nitro.ts
yarn test       # Jest (TypeScript layer)
```

If this saved you time, a ⭐ on the repo helps others find it.

---

## 📄 License

[MIT](./LICENSE) © contributors

<div align="center">
<sub>Built with <a href="https://nitro.margelo.com/">Nitro Modules</a> · docs powered by <a href="https://nextra.site/">Nextra</a></sub>
</div>
