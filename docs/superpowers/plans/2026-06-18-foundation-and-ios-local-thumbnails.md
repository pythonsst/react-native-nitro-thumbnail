# Foundation + iOS Local Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `react-native-nitro-thumbnail` library (Nitro Modules, both architectures) with its full TypeScript API + typed error model, and a working iOS implementation that generates a thumbnail from a **local** video file.

**Architecture:** A builder-bob TS monorepo. The public `createThumbnail()` lives in TS and does all validation/normalization, then calls a Nitro `HybridObject` (`Thumbnail`) whose `create()` method is implemented in pure Swift (iOS) using AVFoundation. Android/web/remote/cache come in later plans; this plan stubs them so the package builds everywhere.

**Tech Stack:** TypeScript, react-native-nitro-modules + nitrogen, react-native-builder-bob, Swift 5.9 + AVFoundation, Jest, XCTest, GitHub Actions.

**Scope of this plan (M0 + M1 from the spec):** scaffold + Nitro spec + TS public API/validation/errors + iOS local thumbnails + example wiring + CI skeleton. Android (M2), remote+headers (M3), caching (M4), web (M5), Expo (M6), hardening/docs (M7–M8) are separate plans.

## Global Constraints

Copied verbatim from the spec — every task implicitly includes these:

- React Native **0.75+**; must work on **both** Old and New architecture.
- iOS **13+**; Xcode **16.4+**; Swift **5.9+**.
- Android **minSdk 24**, **compileSdk 34**, **NDK 27+** (Android arrives in a later plan, but scaffold must honor these).
- Peer dependency: **`react-native-nitro-modules`**. License: **MIT**. Package name: **`react-native-nitro-thumbnail`**.
- **Drop-in compatibility:** public option names, result field names, and defaults match `react-native-create-thumbnail` exactly. Defaults: `timeStamp=0`, `format='jpeg'`, `maxWidth=512`, `maxHeight=512`, `dirSize=100`, `timeToleranceMs=2000`, `onlySyncedFrames=true`.
- **Only additive option:** `quality` (0..1, default `0.9`, ignored for PNG). No other API additions.
- Result shape: `{ path: string; size: number; mime: string; width: number; height: number }`.

---

## File Structure (created/locked in this plan)

- `package.json`, `tsconfig.json`, `babel.config.js`, `jest` config, `.eslintrc`, `react-native-builder-bob` config — from generator, then edited.
- `nitro.json` — Nitro autolinking config (maps spec `Thumbnail` → `HybridThumbnail` Swift/Kotlin).
- `react-native-nitro-thumbnail.podspec` — iOS pod (depends on NitroModules).
- `src/types.ts` — public `CreateThumbnailOptions`, `Thumbnail` (result), `ThumbnailErrorCode`.
- `src/errors.ts` — `ThumbnailError` class + code constants + native-error mapper.
- `src/specs/Thumbnail.nitro.ts` — Nitro `HybridObject` spec + native option/result interfaces.
- `src/native.ts` — accessor that creates the Nitro hybrid object.
- `src/index.ts` — public `createThumbnail()` (validation, defaults, error mapping).
- `src/index.web.ts` — web stub that rejects with `UNKNOWN` "not implemented yet" (real web in M5).
- `ios/HybridThumbnail.swift` — Swift impl of the generated spec (local videos this plan).
- `ios/ThumbnailEncoder.swift` — pure helpers (target-size math, UIImage→Data) for unit testing.
- `ios/Tests/ThumbnailEncoderTests.swift` — XCTest for the pure helpers.
- `__tests__/errors.test.ts`, `__tests__/createThumbnail.test.ts` — Jest.
- `example/` — RN app (New Arch ON) with a screen that calls `createThumbnail`.
- `.github/workflows/ci.yml` — lint, typecheck, jest, build iOS, build Android.

---

### Task 1: Scaffold the library and verify both platforms build (no-op)

This is a setup task (no red-green cycle): it produces the concrete project layout that every later task depends on, with build gates as its "test".

**Files:**
- Create: entire project skeleton via generator, then edit `package.json`, `nitro.json`.

**Interfaces:**
- Produces: the concrete file paths and the Nitro spec naming convention later tasks rely on — a TS spec interface named `Thumbnail` generates Swift/Kotlin protocol `HybridThumbnailSpec`, registered under the string id `"Thumbnail"`, obtained in JS via `NitroModules.createHybridObject<Thumbnail>('Thumbnail')`.

- [ ] **Step 1: Scaffold with a Nitro-aware generator**

Run (from `/Users/shiv`, the project dir `react-native-nitro-thumbnail` already exists with the `docs/` spec + git history — scaffold *into* it):

```bash
cd /Users/shiv
npx create-react-native-library@latest react-native-nitro-thumbnail
# When prompted: type = "Nitro module"; languages = Swift (iOS) + Kotlin (Android);
# package name = react-native-nitro-thumbnail; example = Vanilla (New Arch enabled).
```

If the generator refuses a non-empty dir, scaffold to a temp dir and copy everything except `docs/` and `.git/` into the project, preserving git history.

Expected: a working library skeleton with `src/`, `ios/`, `android/`, `example/`, `nitro.json`, a `*.nitro.ts` example spec, and builder-bob config.

- [ ] **Step 2: Confirm the generated Nitro naming**

Open the generated example spec and the generated Swift/Kotlin to confirm conventions: spec interface `X` → `HybridXSpec` protocol + `createHybridObject<X>('X')`. Note the actual `cxxNamespace`/module name the generator chose in `nitro.json`. If naming differs from the convention above, record the actual names — later tasks reference `HybridThumbnailSpec` and id `"Thumbnail"`; adjust if the generator differs.

- [ ] **Step 3: Set package identity**

Edit `package.json`: `"name": "react-native-nitro-thumbnail"`, `"version": "0.1.0"`, `"license": "MIT"`, add `"react-native-nitro-modules"` to `peerDependencies` and `devDependencies`, ensure `"react-native": ">=0.75.0"` peer range. Confirm builder-bob `source`/`output` and `react-native`/`main`/`module`/`types` fields point at `src` / `lib`.

- [ ] **Step 4: Install + generate**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail
yarn install
yarn nitrogen        # or: npx nitro-codegen — whichever the generator wired into package.json
cd example && yarn install && cd ios && pod install && cd ../..
```
Expected: nitrogen generates without error; `pod install` succeeds and reports Nitro pods.

- [ ] **Step 5: Build both platforms (no-op example)**

Run:
```bash
# iOS
cd example && yarn ios --simulator "iPhone 15" ; cd ..
# Android
cd example && yarn android ; cd ..
```
Expected: example app launches on both an iOS simulator and an Android emulator with the generated default screen. (This proves the Nitro toolchain + New Arch are wired correctly before we write any logic.)

- [ ] **Step 6: Commit**

```bash
cd /Users/shiv/react-native-nitro-thumbnail
git add -A
git commit -m "chore: scaffold react-native-nitro-thumbnail (Nitro module, both arch)"
```

---

### Task 2: Public types and error model (TDD)

**Files:**
- Create: `src/types.ts`, `src/errors.ts`
- Test: `__tests__/errors.test.ts`

**Interfaces:**
- Produces:
  - `CreateThumbnailOptions` (public input — see Global Constraints for fields/defaults), `Thumbnail` (result `{ path; size; mime; width; height }`).
  - `type ThumbnailErrorCode = 'INVALID_URL' | 'FILE_NOT_FOUND' | 'REMOTE_FETCH_FAILED' | 'DECODE_FAILED' | 'UNSUPPORTED_FORMAT' | 'WRITE_FAILED' | 'UNKNOWN'`.
  - `class ThumbnailError extends Error { code: ThumbnailErrorCode }`.
  - `function toThumbnailError(e: unknown): ThumbnailError` — maps a native/thrown error (with optional `.code`/`.message`) to a `ThumbnailError`, defaulting unknown codes to `'UNKNOWN'`.

- [ ] **Step 1: Write the failing test**

`__tests__/errors.test.ts`:
```ts
import { ThumbnailError, toThumbnailError } from '../src/errors'

test('ThumbnailError carries code and name', () => {
  const err = new ThumbnailError('DECODE_FAILED', 'could not decode')
  expect(err).toBeInstanceOf(Error)
  expect(err.name).toBe('ThumbnailError')
  expect(err.code).toBe('DECODE_FAILED')
  expect(err.message).toBe('could not decode')
})

test('toThumbnailError maps a known native code', () => {
  const err = toThumbnailError({ code: 'WRITE_FAILED', message: 'disk full' })
  expect(err.code).toBe('WRITE_FAILED')
  expect(err.message).toBe('disk full')
})

test('toThumbnailError defaults unknown shapes to UNKNOWN', () => {
  const err = toThumbnailError(new Error('boom'))
  expect(err.code).toBe('UNKNOWN')
  expect(err.message).toBe('boom')
})

test('toThumbnailError passes through an existing ThumbnailError', () => {
  const original = new ThumbnailError('INVALID_URL', 'bad url')
  expect(toThumbnailError(original)).toBe(original)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest errors`
Expected: FAIL — cannot find module `../src/errors`.

- [ ] **Step 3: Write minimal implementation**

`src/types.ts`:
```ts
export interface CreateThumbnailOptions {
  url: string
  timeStamp?: number
  format?: 'jpeg' | 'png'
  maxWidth?: number
  maxHeight?: number
  dirSize?: number
  cacheName?: string
  headers?: Record<string, string>
  timeToleranceMs?: number
  onlySyncedFrames?: boolean
  quality?: number
}

export interface Thumbnail {
  path: string
  size: number
  mime: string
  width: number
  height: number
}

export type ThumbnailErrorCode =
  | 'INVALID_URL'
  | 'FILE_NOT_FOUND'
  | 'REMOTE_FETCH_FAILED'
  | 'DECODE_FAILED'
  | 'UNSUPPORTED_FORMAT'
  | 'WRITE_FAILED'
  | 'UNKNOWN'

export const THUMBNAIL_ERROR_CODES: ThumbnailErrorCode[] = [
  'INVALID_URL', 'FILE_NOT_FOUND', 'REMOTE_FETCH_FAILED',
  'DECODE_FAILED', 'UNSUPPORTED_FORMAT', 'WRITE_FAILED', 'UNKNOWN',
]
```

`src/errors.ts`:
```ts
import { THUMBNAIL_ERROR_CODES, type ThumbnailErrorCode } from './types'

export class ThumbnailError extends Error {
  code: ThumbnailErrorCode
  constructor(code: ThumbnailErrorCode, message: string) {
    super(message)
    this.name = 'ThumbnailError'
    this.code = code
    Object.setPrototypeOf(this, ThumbnailError.prototype)
  }
}

export function toThumbnailError(e: unknown): ThumbnailError {
  if (e instanceof ThumbnailError) return e
  const anyE = e as { code?: unknown; message?: unknown }
  const code = (typeof anyE?.code === 'string' &&
    (THUMBNAIL_ERROR_CODES as string[]).includes(anyE.code))
      ? (anyE.code as ThumbnailErrorCode)
      : 'UNKNOWN'
  const message = typeof anyE?.message === 'string' ? anyE.message : String(e)
  return new ThumbnailError(code, message)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest errors`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/errors.ts __tests__/errors.test.ts
git commit -m "feat: add public types and ThumbnailError model"
```

---

### Task 3: Nitro spec + native accessor

**Files:**
- Create: `src/specs/Thumbnail.nitro.ts`, `src/native.ts`
- Modify: `nitro.json` (autolinking map)

**Interfaces:**
- Produces:
  - `NativeThumbnailOptions` — fully-normalized options crossing into native: `{ url: string; timeStamp: number; format: string; maxWidth: number; maxHeight: number; dirSize: number; cacheName?: string; headers?: Record<string,string>; timeToleranceMs: number; onlySyncedFrames: boolean; quality: number }`.
  - `NativeThumbnailResult` = `{ path: string; size: number; mime: string; width: number; height: number }`.
  - `interface Thumbnail extends HybridObject<{ios:'swift';android:'kotlin'}> { create(options: NativeThumbnailOptions): Promise<NativeThumbnailResult> }`.
  - `getThumbnailNative(): Thumbnail` from `src/native.ts`.

- [ ] **Step 1: Write the spec**

`src/specs/Thumbnail.nitro.ts`:
```ts
import type { HybridObject } from 'react-native-nitro-modules'

export interface NativeThumbnailOptions {
  url: string
  timeStamp: number
  format: string            // 'jpeg' | 'png' — validated in TS before crossing
  maxWidth: number
  maxHeight: number
  dirSize: number
  cacheName?: string
  headers?: Record<string, string>
  timeToleranceMs: number
  onlySyncedFrames: boolean
  quality: number
}

export interface NativeThumbnailResult {
  path: string
  size: number
  mime: string
  width: number
  height: number
}

export interface Thumbnail
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  create(options: NativeThumbnailOptions): Promise<NativeThumbnailResult>
}
```

- [ ] **Step 2: Add the native accessor**

`src/native.ts`:
```ts
import { NitroModules } from 'react-native-nitro-modules'
import type { Thumbnail } from './specs/Thumbnail.nitro'

let cached: Thumbnail | undefined
export function getThumbnailNative(): Thumbnail {
  if (!cached) cached = NitroModules.createHybridObject<Thumbnail>('Thumbnail')
  return cached
}
```

- [ ] **Step 3: Map autolinking in `nitro.json`**

Ensure `nitro.json` contains (merge with generated values; keep the generator's `cxxNamespace`/module names):
```json
{
  "autolinking": {
    "Thumbnail": { "swift": "HybridThumbnail", "kotlin": "HybridThumbnail" }
  }
}
```

- [ ] **Step 4: Run codegen to verify the spec compiles**

Run: `yarn nitrogen` (or the wired `nitro-codegen` script)
Expected: generates `HybridThumbnailSpec` (Swift) and a Kotlin spec without errors. Confirm the generated Swift protocol name is `HybridThumbnailSpec` (used in Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/specs/Thumbnail.nitro.ts src/native.ts nitro.json
git commit -m "feat: add Nitro Thumbnail spec and native accessor"
```

---

### Task 4: Public `createThumbnail` — validation, defaults, error mapping (TDD)

**Files:**
- Create: `src/index.ts`
- Test: `__tests__/createThumbnail.test.ts`

**Interfaces:**
- Consumes: `getThumbnailNative()` (Task 3), `CreateThumbnailOptions`/`Thumbnail` (Task 2), `ThumbnailError`/`toThumbnailError` (Task 2).
- Produces: `export async function createThumbnail(options: CreateThumbnailOptions): Promise<Thumbnail>` and re-exports `ThumbnailError`, types.

- [ ] **Step 1: Write the failing test**

`__tests__/createThumbnail.test.ts` (mock the native module so this is a pure TS unit test):
```ts
const create = jest.fn()
jest.mock('../src/native', () => ({ getThumbnailNative: () => ({ create }) }))

import { createThumbnail } from '../src/index'
import { ThumbnailError } from '../src/errors'

const OK = { path: 'file:///t.jpg', size: 10, mime: 'image/jpeg', width: 1, height: 1 }
beforeEach(() => { create.mockReset(); create.mockResolvedValue(OK) })

test('applies defaults and forwards normalized options to native', async () => {
  await createThumbnail({ url: 'file:///v.mp4' })
  expect(create).toHaveBeenCalledWith(expect.objectContaining({
    url: 'file:///v.mp4', timeStamp: 0, format: 'jpeg',
    maxWidth: 512, maxHeight: 512, dirSize: 100,
    timeToleranceMs: 2000, onlySyncedFrames: true, quality: 0.9,
  }))
})

test('rejects empty url with INVALID_URL (native not called)', async () => {
  await expect(createThumbnail({ url: '' })).rejects.toMatchObject({
    name: 'ThumbnailError', code: 'INVALID_URL',
  })
  expect(create).not.toHaveBeenCalled()
})

test('rejects unsupported format with UNSUPPORTED_FORMAT', async () => {
  await expect(
    createThumbnail({ url: 'file:///v.mp4', format: 'webp' as any })
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' })
  expect(create).not.toHaveBeenCalled()
})

test('clamps quality into 0..1', async () => {
  await createThumbnail({ url: 'file:///v.mp4', quality: 5 })
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ quality: 1 }))
})

test('maps a native error code to ThumbnailError', async () => {
  create.mockRejectedValue({ code: 'DECODE_FAILED', message: 'bad frame' })
  await expect(createThumbnail({ url: 'file:///v.mp4' }))
    .rejects.toMatchObject({ code: 'DECODE_FAILED', message: 'bad frame' })
})

test('returns the native result unchanged', async () => {
  await expect(createThumbnail({ url: 'file:///v.mp4' })).resolves.toEqual(OK)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest createThumbnail`
Expected: FAIL — cannot find module `../src/index` (or `createThumbnail` undefined).

- [ ] **Step 3: Write minimal implementation**

`src/index.ts`:
```ts
import { getThumbnailNative } from './native'
import { ThumbnailError, toThumbnailError } from './errors'
import type { CreateThumbnailOptions, Thumbnail } from './types'
import type { NativeThumbnailOptions } from './specs/Thumbnail.nitro'

export * from './types'
export { ThumbnailError } from './errors'

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export async function createThumbnail(
  options: CreateThumbnailOptions
): Promise<Thumbnail> {
  if (!options?.url || typeof options.url !== 'string') {
    throw new ThumbnailError('INVALID_URL', 'A non-empty `url` is required')
  }
  const format = options.format ?? 'jpeg'
  if (format !== 'jpeg' && format !== 'png') {
    throw new ThumbnailError(
      'UNSUPPORTED_FORMAT', `format must be 'jpeg' or 'png', got '${format}'`
    )
  }

  const normalized: NativeThumbnailOptions = {
    url: options.url,
    timeStamp: options.timeStamp ?? 0,
    format,
    maxWidth: options.maxWidth ?? 512,
    maxHeight: options.maxHeight ?? 512,
    dirSize: options.dirSize ?? 100,
    cacheName: options.cacheName,
    headers: options.headers,
    timeToleranceMs: options.timeToleranceMs ?? 2000,
    onlySyncedFrames: options.onlySyncedFrames ?? true,
    quality: clamp(options.quality ?? 0.9, 0, 1),
  }

  try {
    return await getThumbnailNative().create(normalized)
  } catch (e) {
    throw toThumbnailError(e)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest createThumbnail`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/index.ts __tests__/createThumbnail.test.ts
git commit -m "feat: add public createThumbnail with validation, defaults, error mapping"
```

---

### Task 5: Web stub so the package builds on web (TDD)

**Files:**
- Create: `src/index.web.ts`
- Test: `__tests__/web.test.ts`

**Interfaces:**
- Produces: a web-platform `createThumbnail` with the same signature that rejects with `ThumbnailError('UNKNOWN', ...)` until the real web impl (M5).

- [ ] **Step 1: Write the failing test**

`__tests__/web.test.ts`:
```ts
import { createThumbnail } from '../src/index.web'

test('web stub rejects with a clear not-implemented ThumbnailError', async () => {
  await expect(createThumbnail({ url: 'http://x/v.mp4' })).rejects.toMatchObject({
    name: 'ThumbnailError', code: 'UNKNOWN',
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest web`
Expected: FAIL — cannot find module `../src/index.web`.

- [ ] **Step 3: Write minimal implementation**

`src/index.web.ts`:
```ts
import { ThumbnailError } from './errors'
import type { CreateThumbnailOptions, Thumbnail } from './types'

export * from './types'
export { ThumbnailError } from './errors'

export async function createThumbnail(
  _options: CreateThumbnailOptions
): Promise<Thumbnail> {
  throw new ThumbnailError(
    'UNKNOWN',
    'createThumbnail is not yet implemented on web (coming in a later release)'
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.web.ts __tests__/web.test.ts
git commit -m "feat: add web stub for createThumbnail"
```

---

### Task 6: iOS Swift — local thumbnail extraction

**Files:**
- Create: `ios/ThumbnailEncoder.swift` (pure, testable helpers), `ios/HybridThumbnail.swift` (Nitro spec impl)
- Create: `ios/Tests/ThumbnailEncoderTests.swift`
- Modify: `react-native-nitro-thumbnail.podspec` (ensure `ios/**/*.swift` is in `source_files`; add a test spec if using a podspec test target, otherwise tests run via the example workspace scheme)

**Interfaces:**
- Consumes: generated `HybridThumbnailSpec` protocol + generated Swift structs `NativeThumbnailOptions` / `NativeThumbnailResult` (from Task 3 codegen).
- Produces: `class HybridThumbnail: HybridThumbnailSpec` implementing `create(options:) -> Promise<NativeThumbnailResult>` for local `file://` URLs (remote handled in a later plan).
- Pure helpers (unit-tested): `ThumbnailEncoder.targetSize(natural:maxWidth:maxHeight:) -> CGSize` (aspect-fit, never upscale) and `ThumbnailEncoder.encode(_ image:CGImage, format:String, quality:Double) -> Data?`.

- [ ] **Step 1: Write the failing XCTest for the pure helpers**

`ios/Tests/ThumbnailEncoderTests.swift`:
```swift
import XCTest
@testable import NitroThumbnail  // use the module name from nitro.json (Task 1, Step 2)

final class ThumbnailEncoderTests: XCTestCase {
  func testTargetSizeFitsWithinBoundsPreservingAspect() {
    let s = ThumbnailEncoder.targetSize(
      natural: CGSize(width: 1920, height: 1080), maxWidth: 512, maxHeight: 512)
    XCTAssertEqual(s.width, 512, accuracy: 0.5)
    XCTAssertEqual(s.height, 288, accuracy: 1.0)  // 1080 * (512/1920)
  }

  func testTargetSizeNeverUpscales() {
    let s = ThumbnailEncoder.targetSize(
      natural: CGSize(width: 100, height: 100), maxWidth: 512, maxHeight: 512)
    XCTAssertEqual(s.width, 100, accuracy: 0.5)
    XCTAssertEqual(s.height, 100, accuracy: 0.5)
  }

  func testEncodeProducesNonEmptyJpegAndPng() {
    let ctx = CGContext(data: nil, width: 4, height: 4, bitsPerComponent: 8,
      bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let img = ctx.makeImage()!
    XCTAssertNotNil(ThumbnailEncoder.encode(img, format: "jpeg", quality: 0.9))
    XCTAssertNotNil(ThumbnailEncoder.encode(img, format: "png", quality: 0.9))
    XCTAssertNil(ThumbnailEncoder.encode(img, format: "webp", quality: 0.9))
  }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run (use the example workspace; the lib's Swift compiles into it):
```bash
cd example/ios && xcodebuild test \
  -workspace *.xcworkspace -scheme <ExampleScheme> \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -only-testing:.../ThumbnailEncoderTests 2>&1 | tail -20
```
Expected: FAIL — `ThumbnailEncoder` is undefined / does not compile.

(If wiring a unit-test target proves heavy, instead add the helpers + an in-app assertion path and gate via the example app; record the decision in the commit. Prefer XCTest.)

- [ ] **Step 3: Implement the pure helpers**

`ios/ThumbnailEncoder.swift`:
```swift
import CoreGraphics
import ImageIO
import MobileCoreServices
import UniformTypeIdentifiers

enum ThumbnailEncoder {
  static func targetSize(natural: CGSize, maxWidth: Double, maxHeight: Double) -> CGSize {
    guard natural.width > 0, natural.height > 0 else { return natural }
    let scale = min(maxWidth / Double(natural.width),
                    maxHeight / Double(natural.height), 1.0)  // never upscale
    return CGSize(width: Double(natural.width) * scale,
                  height: Double(natural.height) * scale)
  }

  static func encode(_ image: CGImage, format: String, quality: Double) -> Data? {
    let isPng = format == "png"
    let uti: CFString = isPng ? UTType.png.identifier as CFString
                              : UTType.jpeg.identifier as CFString
    guard isPng || format == "jpeg" else { return nil }
    let data = NSMutableData()
    guard let dest = CGImageDestinationCreateWithData(
      data, uti, 1, nil) else { return nil }
    let props: [CFString: Any] = isPng ? [:]
      : [kCGImageDestinationLossyCompressionQuality: quality]
    CGImageDestinationAddImage(dest, image, props as CFDictionary)
    return CGImageDestinationFinalize(dest) ? (data as Data) : nil
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run the same `xcodebuild test` command from Step 2.
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add ios/ThumbnailEncoder.swift ios/Tests/ThumbnailEncoderTests.swift react-native-nitro-thumbnail.podspec
git commit -m "feat(ios): add tested thumbnail target-size + encode helpers"
```

- [ ] **Step 6: Implement the Nitro spec (local videos)**

`ios/HybridThumbnail.swift`:
```swift
import AVFoundation
import Foundation
import NitroModules

final class HybridThumbnail: HybridThumbnailSpec {
  func create(options: NativeThumbnailOptions) throws -> Promise<NativeThumbnailResult> {
    return Promise.async {
      let url = try Self.resolveURL(options.url)              // local only this plan
      let asset = AVURLAsset(url: url)

      let gen = AVAssetImageGenerator(asset: asset)
      gen.appliesPreferredTrackTransform = true
      gen.maximumSize = CGSize(width: options.maxWidth, height: options.maxHeight)
      let tol = CMTime(value: CMTimeValue(options.timeToleranceMs),
                       timescale: 1000)
      gen.requestedTimeToleranceBefore = tol
      gen.requestedTimeToleranceAfter = tol

      let time = CMTime(value: CMTimeValue(options.timeStamp), timescale: 1000)
      let cg: CGImage
      do {
        cg = try gen.copyCGImage(at: time, actualTime: nil)
      } catch {
        throw NitroError(code: "DECODE_FAILED",
                         message: "Could not extract frame: \(error.localizedDescription)")
      }

      guard let data = ThumbnailEncoder.encode(
        cg, format: options.format, quality: options.quality) else {
        throw NitroError(code: "UNSUPPORTED_FORMAT",
                         message: "Cannot encode as \(options.format)")
      }

      let outURL = try Self.outputURL(format: options.format,
                                      cacheName: options.cacheName)
      do { try data.write(to: outURL, options: .atomic) }
      catch { throw NitroError(code: "WRITE_FAILED", message: error.localizedDescription) }

      return NativeThumbnailResult(
        path: outURL.absoluteString,
        size: Double(data.count),
        mime: options.format == "png" ? "image/png" : "image/jpeg",
        width: Double(cg.width),
        height: Double(cg.height))
    }
  }

  // MARK: helpers
  private static func resolveURL(_ raw: String) throws -> URL {
    if raw.hasPrefix("file://"), let u = URL(string: raw) {
      guard FileManager.default.fileExists(atPath: u.path) else {
        throw NitroError(code: "FILE_NOT_FOUND", message: "No file at \(u.path)")
      }
      return u
    }
    if raw.hasPrefix("/") {
      guard FileManager.default.fileExists(atPath: raw) else {
        throw NitroError(code: "FILE_NOT_FOUND", message: "No file at \(raw)")
      }
      return URL(fileURLWithPath: raw)
    }
    // remote (http/https) handled in a later plan
    throw NitroError(code: "INVALID_URL",
                     message: "Only local file URLs are supported in this build: \(raw)")
  }

  private static func outputURL(format: String, cacheName: String?) throws -> URL {
    let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("thumbnails", isDirectory: true)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let ext = format == "png" ? "png" : "jpg"
    let base = cacheName?.isEmpty == false
      ? cacheName!
      : "thumb-\(UUID().uuidString)"
    return dir.appendingPathComponent("\(base).\(ext)")
  }
}

/// Minimal typed error carrier mapped to ThumbnailError in JS.
struct NitroError: Error {
  let code: String
  let message: String
  var localizedDescription: String { message }
}
```

Note: confirm the exact NitroModules error-throwing idiom from the generated example (some Nitro versions surface `code` via `RuntimeError`/`NSError userInfo`). If `NitroError` doesn't propagate a `code` readable by `toThumbnailError`, throw an `NSError(domain:code:userInfo:[NSLocalizedDescriptionKey, "code"])` instead so JS sees `.code`. Verify by asserting in Task 7.

- [ ] **Step 7: Build to verify it compiles**

Run: `cd example/ios && xcodebuild -workspace *.xcworkspace -scheme <ExampleScheme> -destination 'platform=iOS Simulator,name=iPhone 15' build 2>&1 | tail -20`
Expected: BUILD SUCCEEDED.

- [ ] **Step 8: Commit**

```bash
git add ios/HybridThumbnail.swift
git commit -m "feat(ios): generate local video thumbnails via AVAssetImageGenerator"
```

---

### Task 7: Wire the example app + verify a real local thumbnail (iOS)

**Files:**
- Modify: `example/src/App.tsx` (call `createThumbnail`, render the image)
- Create: `example/assets/sample.mp4` (a few-second test clip bundled with the app)

**Interfaces:**
- Consumes: `createThumbnail` from the library (`react-native-nitro-thumbnail`).

- [ ] **Step 1: Add a sample video + thumbnail screen**

Place a short `sample.mp4` in `example/assets/`. Replace `example/src/App.tsx` with a screen that copies the bundled asset to a local file path, calls `createThumbnail({ url: <localPath>, timeStamp: 1000 })`, and renders `<Image source={{ uri: result.path }}>` plus the result JSON. Show any `ThumbnailError.code` on failure.

```tsx
import * as React from 'react'
import { SafeAreaView, Button, Image, Text, View } from 'react-native'
import { createThumbnail, type Thumbnail } from 'react-native-nitro-thumbnail'
// use a file-system lib already in the example, or RN's require-resolved asset path

export default function App() {
  const [thumb, setThumb] = React.useState<Thumbnail | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const run = async () => {
    try {
      setErr(null)
      const localPath = await resolveBundledSampleToFile() // copies assets/sample.mp4 → file://
      setThumb(await createThumbnail({ url: localPath, timeStamp: 1000 }))
    } catch (e: any) { setErr(`${e.code ?? 'ERR'}: ${e.message}`) }
  }
  return (
    <SafeAreaView>
      <Button title="Create thumbnail" onPress={run} />
      {err && <Text>{err}</Text>}
      {thumb && (
        <View>
          <Image source={{ uri: thumb.path }} style={{ width: 256, height: 256 }} />
          <Text>{JSON.stringify(thumb, null, 2)}</Text>
        </View>
      )}
    </SafeAreaView>
  )
}
```
(Implement `resolveBundledSampleToFile` with whatever asset/file approach the example already supports; the key requirement is passing a real local `file://`/path to `createThumbnail`.)

- [ ] **Step 2: Run on iOS simulator and verify**

Run: `cd example && yarn ios --simulator "iPhone 15"`
Tap "Create thumbnail". Expected: an image renders and the JSON shows `mime: 'image/jpeg'`, non-zero `size`, and `width`/`height` ≤ 512 preserving aspect.

- [ ] **Step 3: Verify the error path**

Temporarily call `createThumbnail({ url: 'file:///nope.mp4' })`; expected on-screen: `FILE_NOT_FOUND: ...`. Revert the temporary change.

- [ ] **Step 4: Commit**

```bash
git add example/src/App.tsx example/assets/sample.mp4
git commit -m "feat(example): demo local iOS thumbnail generation"
```

---

### Task 8: CI skeleton (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: package scripts (`lint`, `typecheck`/`tsc`, `test`, `nitrogen`) — add any missing to `package.json`.

- [ ] **Step 1: Ensure package scripts exist**

In `package.json` `scripts`, ensure: `"lint": "eslint \"**/*.{ts,tsx}\""`, `"typecheck": "tsc --noEmit"`, `"test": "jest"`, and the builder-bob `"prepare": "bob build"`. Add the nitrogen script name the generator used (e.g. `"nitrogen": "nitro-codegen"`).

- [ ] **Step 2: Write the workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'yarn' }
      - run: yarn install --frozen-lockfile
      - run: yarn nitrogen
      - run: yarn lint
      - run: yarn typecheck
      - run: yarn test --ci
      - run: yarn prepare
  ios:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'yarn' }
      - run: yarn install --frozen-lockfile
      - run: yarn nitrogen
      - run: cd example && yarn install --frozen-lockfile
      - run: cd example/ios && pod install
      - run: cd example/ios && xcodebuild -workspace *.xcworkspace -scheme "$(xcodebuild -list -json | python3 -c 'import sys,json;print(json.load(sys.stdin)["workspace"]["schemes"][0])')" -destination 'platform=iOS Simulator,name=iPhone 15' build CODE_SIGNING_ALLOWED=NO
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'yarn' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - run: yarn install --frozen-lockfile
      - run: yarn nitrogen
      - run: cd example && yarn install --frozen-lockfile
      - run: cd example/android && ./gradlew assembleDebug
```

- [ ] **Step 3: Validate locally what you can**

Run: `yarn lint && yarn typecheck && yarn test --ci && yarn prepare`
Expected: all pass. (iOS/Android CI jobs validate on push.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml package.json
git commit -m "ci: add lint/typecheck/test + iOS/Android build workflow"
```

---

## Self-Review

**1. Spec coverage (for this plan's scope, M0–M1):**
- Public API + drop-in defaults + additive `quality` → Tasks 2, 4. ✅
- Nitro spec / both-arch scaffold → Tasks 1, 3. ✅
- iOS local thumbnail (AVAssetImageGenerator, max size, tolerance, jpeg/png, write to Caches) → Task 6. ✅
- Typed error model + native→JS mapping → Tasks 2, 4, 6. ✅
- Web present but stubbed → Task 5 (real impl deferred to M5 plan, per spec phasing). ✅
- Example app + CI → Tasks 7, 8. ✅
- Deferred by design (other plans): Android (M2), remote+headers (M3), caching dirSize/cacheName LRU (M4 — Task 6 lays the cacheName filename groundwork but **does not** implement dedup/eviction), Expo (M6), docs/publish (M8). Flagged, not silently dropped.

**2. Placeholder scan:** No TBD/TODO. Task 1 and Task 6-Step 6 contain explicit "confirm against generated output" verification steps (not placeholders — they're guard rails because generated names/idioms are only knowable post-scaffold).

**3. Type consistency:** `NativeThumbnailOptions`/`NativeThumbnailResult` field names + types identical across spec (Task 3), TS normalizer (Task 4), and Swift impl (Task 6). `ThumbnailError`/`toThumbnailError` signatures consistent (Tasks 2, 4, 5). `getThumbnailNative()` defined in Task 3, consumed in Task 4. Result uses `Double` on the Swift side (Nitro maps JS `number`→Swift `Double`) — consistent with the `number` result fields.

---

## Notes for the next plans

- **Plan 2 (Android, M2):** mirror Task 6 in Kotlin (`HybridThumbnail.kt`, `MediaMetadataRetriever`, `getScaledFrameAtTime` + pre-27 fallback), reuse Tasks 2–5 unchanged.
- **Plan 3 (M3):** add remote URL + `headers` to `resolveURL` (iOS `AVURLAssetHTTPHeaderFieldsKey`; Android `setDataSource(url, headers)`); web `fetch`→blob.
- **Plan 4 (M4):** implement `cacheName` dedup (return existing file) + `dirSize` LRU eviction; shared semantics, per-platform impl + tests.
