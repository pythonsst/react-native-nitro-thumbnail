# CLAUDE.md

Guidance for AI agents (and humans) working in this repo. Keep it accurate — update
it when conventions change.

## What this is

`react-native-nitro-thumbnail` — generate a thumbnail from a local or remote video with
one async call, the same API on **iOS, Android, and Web**. Built on
[Nitro Modules](https://nitro.margelo.com/) (pure Swift & Kotlin over JSI), **New
Architecture only**.

## Mental model (read this first)

There is **one** public function, `createThumbnail(options)`, written in TypeScript. It
**validates input and applies defaults**, then calls a Nitro `HybridObject` whose
`create()` method is implemented natively per platform. Native code is "dumb": it
receives a fully-normalized struct and just decodes → encodes → writes → returns.

```
createThumbnail()  →  [TS: validate + defaults]  →  [iOS Swift | Android Kotlin | Web DOM]  →  Thumbnail
```

The single source of truth for the JS↔native boundary is
[`src/specs/Thumbnail.nitro.ts`](src/specs/Thumbnail.nitro.ts). Change it → run
`yarn nitrogen` → both native sides get a regenerated, compile-checked spec.

## Repo map

| Path | What |
|---|---|
| `src/index.ts` | Public `createThumbnail` (native platforms): validation, defaults, error mapping |
| `src/index.web.ts` | Public `createThumbnail` for **web** (pure DOM; bundler picks this on web) |
| `src/specs/Thumbnail.nitro.ts` | Nitro spec — the JS↔native contract (nitrogen input) |
| `src/types.ts` | `CreateThumbnailOptions`, `Thumbnail`, `ThumbnailErrorCode` |
| `src/errors.ts` | `ThumbnailError` + `toThumbnailError` (parses the `[CODE]` prefix) |
| `ios/HybridThumbnail.swift` | iOS impl (`AVAssetImageGenerator`) |
| `ios/ThumbnailEncoder.swift` | Pure iOS helpers (sizing/encode/eviction), XCTest-covered |
| `android/.../HybridThumbnail.kt` | Android impl (`MediaMetadataRetriever`) |
| `android/.../ThumbnailEncoderKt.kt` | Pure Android helpers, JUnit-covered |
| `__tests__/` | Jest (node + jsdom) for the TS layer |
| `website/` | **The docs** — Nextra (Next.js) site, MDX in `website/pages/`. Self-contained (not in the Yarn workspaces) → deployed on Vercel. Single source of truth. |
| `docs/assets/` | Media referenced by the README + site (diagram, demo thumbnail/video). `docs/` holds no prose — docs live in `website/`. |
| `nitrogen/`, `lib/` | **Generated** (gitignored). Never hand-edit. |

## Commands

```sh
yarn               # install — Yarn 4 workspaces (do NOT use npm for dev)
yarn nitrogen      # regenerate native specs after editing *.nitro.ts
yarn test          # Jest (TypeScript layer)
yarn typecheck     # tsc, no emit
yarn lint          # eslint (website/ is ignored)
yarn example ios   # run the example app (or: android)
```

Docs site: `cd website && npm install && npm run dev` (it's a separate npm project).

## Conventions (hold PRs to these)

- **Validate in TS, act dumbly in native.** All "is this input sane / what's the
  default" logic lives in `src/index.ts` (+ `src/index.web.ts`). Native receives a
  complete struct and must not branch on missing values.
- **Keep pure logic pure.** Sizing math and LRU eviction live in the `*Encoder*`
  helpers (and `fitSize` on web), free of I/O, so they're unit-testable without a device.
- **Never upscale.** Output is always ≤ `maxWidth × maxHeight`; `width`/`height` in the
  result are the *actual* output dimensions.
- **One typed error per failure.** Every failure maps to one of seven
  `ThumbnailErrorCode`s. Add a code to **both** the union *and* the
  `THUMBNAIL_ERROR_CODES` array in `src/types.ts`.
- **Match surrounding style.** Run `yarn lint --fix` before committing.

## The `[CODE]` error bridge (non-obvious — don't break it)

Nitro only sends an error **message string** to JS. So native throws
`RuntimeError("[CODE] message")` via the `err(...)` helper, and `toThumbnailError`
parses that prefix back into a typed `ThumbnailError.code`. If you add native errors,
use the existing `err()` helper. See the [Error Handling guide](https://react-native-nitro-thumbnail.vercel.app/guides/error-handling).

## How to add an option (the dev loop)

1. Add it to `CreateThumbnailOptions` (`src/types.ts`) and `NativeThumbnailOptions`
   (`src/specs/Thumbnail.nitro.ts`).
2. Normalize/default it in `src/index.ts` **and** `src/index.web.ts`.
3. `yarn nitrogen` to regenerate native specs.
4. Implement it in `HybridThumbnail.swift`, `HybridThumbnail.kt`, and the web path.
5. Add Jest tests (+ native helper tests if it touches pure logic).
6. Verify in the example app.
7. Update docs (`docs/` + the matching `website/pages/**`).

## Gotchas

- **New Architecture only.** Needs RN 0.75+ and `react-native-nitro-modules` as a peer dep.
- **`yarn nitrogen` is required** after any `*.nitro.ts` change, and on first build
  (generated files are gitignored).
- **URL schemes handled by native:** `http(s)://`, `file://`, absolute `/path`, and
  (Android) `content://`. iOS Photos `ph://` is **not** opened directly — resolve to a
  `file://` path first.
- **Android emulator** on some machines can't render the RN Fabric UI (blank screen).
  Verify Android via the written file (`adb`/`run-as … cat`) + logcat, not screenshots.
- **Web has no Nitro layer** — `index.web.ts` is resolved by the bundler's platform
  extension. Keep its `createThumbnail` signature identical to `index.ts`.
- **Don't commit** `docs/superpowers/`, `.claude/`, `lib/`, `nitrogen/` (all gitignored).

## Publishing

```sh
npm version patch         # bump (also tag: git tag vX.Y.Z)
npm publish --access public --otp=<6-digit>   # account requires 2FA
```

npm only re-renders the README **on publish**. `yarn prepare` (bob build) runs
automatically and regenerates `lib/` + `nitrogen/`.

## Docs site & deploy

`website/` is a Nextra (Next.js) app deployed on **Vercel** with *Root Directory =
`website`*; it auto-deploys on push to `main`. Content mirrors `docs/`. Live at
`react-native-nitro-thumbnail.vercel.app`. The production URL for SEO lives in
`website/theme.config.tsx` (`SITE_URL`).
