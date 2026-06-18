# Android Local Thumbnails Implementation Plan (Plan 2 — M2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Android side of `react-native-nitro-thumbnail` in pure Kotlin so `createThumbnail()` generates a thumbnail from a **local** video file, matching the iOS behaviour and the existing TypeScript contract.

**Architecture:** The public TS `createThumbnail()` (Plan 1) already validates/normalizes options and calls the Nitro `Thumbnail` HybridObject. This plan replaces the generated Android stub (`HybridThumbnail.kt`, which currently rejects with "not implemented") with a real `MediaMetadataRetriever`-based implementation, plus pure Kotlin sizing/encoding helpers. Tasks 2–5 of Plan 1 (TS types, errors, spec, `createThumbnail`, web stub) are reused unchanged. Remote URLs + headers (M3) and cache dedup/LRU (M4) remain stubbed/deferred.

**Tech Stack:** Kotlin, react-native-nitro-modules + nitrogen (Promise, coroutines), `android.media.MediaMetadataRetriever`, `android.graphics.Bitmap`, JUnit, Gradle, Android emulator (API ≥ 24).

**Scope of this plan (M2 from the spec):** Android local thumbnails only. Reuses Plan 1's JS unchanged. Remote+headers (M3), caching `cacheName`/`dirSize` LRU (M4), web (M5), Expo (M6), hardening/docs (M7–M8) are separate plans; this plan lays the `cacheName` filename groundwork but does **not** implement dedup/eviction.

## Global Constraints

Copied verbatim from the spec — every task implicitly includes these:

- React Native **0.75+**; must work on **both** Old and New architecture.
- Android **minSdk 24**, **compileSdk 34+** (generator chose 36), **NDK 27+**, **Kotlin**.
- Peer dependency: **`react-native-nitro-modules`**. License: **MIT**. Package: **`react-native-nitro-thumbnail`**.
- **Drop-in compatibility:** option names, result field names, and defaults match `react-native-create-thumbnail`. Defaults (applied in TS, Plan 1): `timeStamp=0`, `format='jpeg'`, `maxWidth=512`, `maxHeight=512`, `dirSize=100`, `timeToleranceMs=2000`, `onlySyncedFrames=true`. Additive `quality` (0..1, default `0.9`, ignored for PNG).
- Result shape: `{ path: string; size: number; mime: string; width: number; height: number }`. The native (Nitro) types are `NativeThumbnailOptions`/`NativeThumbnailResult` (generated; numbers are Kotlin `Double`).
- **Error contract:** Nitro surfaces only the thrown error's **message** string to JS (no `code` field). Plan 1 established the convention: throw with a `"[CODE] message"` prefix; the TS `toThumbnailError` parses the leading `[CODE]`. Reuse this exactly — codes from the spec: `INVALID_URL`, `FILE_NOT_FOUND`, `REMOTE_FETCH_FAILED`, `DECODE_FAILED`, `UNSUPPORTED_FORMAT`, `WRITE_FAILED`, `UNKNOWN`.

## Facts established from the generated code (do not re-derive)

- Kotlin spec to implement: `abstract class HybridThumbnailSpec : HybridObject()` with `abstract fun create(options: NativeThumbnailOptions): Promise<NativeThumbnailResult>` in package `com.margelo.nitro.nitrothumbnail`.
- `NativeThumbnailResult(path: String, size: Double, mime: String, width: Double, height: Double)` — data class, positional constructor.
- `NativeThumbnailOptions` fields: `url: String, timeStamp: Double, format: String, maxWidth: Double, maxHeight: Double, dirSize: Double, cacheName: String?, headers: Map<String,String>?, timeToleranceMs: Double, onlySyncedFrames: Bool, quality: Double`.
- Implementation class per `nitro.json` autolinking: `HybridThumbnail` (both platforms).
- Android `Context` for the cache dir: `com.margelo.nitro.NitroModules.applicationContext` (a `ReactApplicationContext?`); use `.cacheDir`.
- `com.margelo.nitro.core.Promise<T>` API: `Promise.async { ... }` (suspending), `Promise.rejected(Throwable)`, `Promise.resolved(T)`.
- Library Gradle: `android/build.gradle`, namespace `com.margelo.nitro.nitrothumbnail`, minSdk 24, compileSdk 36, `dependencies { }` block present (no unit-test deps yet).
- The example app (`example/src/App.tsx`, Plan 1 Task 7) is cross-platform and auto-runs `createThumbnail` against a bundled `sample.mp4` resolved to a local file via `@dr.pogodin/react-native-fs` (which provides `CachesDirectoryPath` on Android too). It is the Android end-to-end harness — no new example code needed.

---

## File Structure

- `android/src/main/java/com/margelo/nitro/nitrothumbnail/ThumbnailEncoderKt.kt` — pure helpers: target-size math (aspect-fit, never upscale), format→mime, `Bitmap`→`ByteArray` encode. Mirrors iOS `ThumbnailEncoder.swift`.
- `android/src/main/java/com/margelo/nitro/nitrothumbnail/HybridThumbnail.kt` — **modify** (replace stub): `MediaMetadataRetriever` impl of `create()`.
- `android/src/test/java/com/margelo/nitro/nitrothumbnail/ThumbnailSizeTest.kt` — JUnit unit test for the pure target-size math.
- `android/build.gradle` — **modify**: add `testImplementation "junit:junit:4.13.2"` so the unit test runs.
- (No JS changes. No new example code — `example/src/App.tsx` already exercises Android.)

---

### Task 1: Pure Kotlin sizing/encoding helpers (TDD)

The sizing math is pure JVM (no Android framework) so it is unit-testable off-device with plain JUnit — the Android-runtime pieces (`Bitmap`, `MediaMetadataRetriever`) are validated end-to-end on the emulator in Task 3, exactly as iOS validated the real pipeline on the simulator.

**Files:**
- Create: `android/src/main/java/com/margelo/nitro/nitrothumbnail/ThumbnailEncoderKt.kt`
- Create: `android/src/test/java/com/margelo/nitro/nitrothumbnail/ThumbnailSizeTest.kt`
- Modify: `android/build.gradle`

**Interfaces:**
- Produces:
  - `object ThumbnailEncoderKt`
  - `fun targetSize(naturalW: Int, naturalH: Int, maxW: Int, maxH: Int): Pair<Int, Int>` — aspect-fit inside `maxW × maxH`, never upscale; returns `(width, height)`. Returns `(naturalW, naturalH)` if either natural dim ≤ 0.
  - `fun mimeFor(format: String): String` — `"png"` → `"image/png"`, else `"image/jpeg"`.
  - `fun encode(bitmap: Bitmap, format: String, quality: Double): ByteArray?` — PNG or JPEG (`quality` 0..1 → 0..100); `null` for unsupported formats. (Consumed by Task 2; exercised on-device in Task 3.)

- [ ] **Step 1: Add the JUnit test dependency**

In `android/build.gradle`, inside the existing top-level `dependencies { }` block (the one near the end of the file, not the `buildscript` one), add:
```gradle
  testImplementation "junit:junit:4.13.2"
```

- [ ] **Step 2: Write the failing unit test**

`android/src/test/java/com/margelo/nitro/nitrothumbnail/ThumbnailSizeTest.kt`:
```kotlin
package com.margelo.nitro.nitrothumbnail

import org.junit.Assert.assertEquals
import org.junit.Test

class ThumbnailSizeTest {
  @Test fun fitsWithinBoundsPreservingAspect() {
    val (w, h) = ThumbnailEncoderKt.targetSize(1920, 1080, 512, 512)
    assertEquals(512, w)
    assertEquals(288, h) // 1080 * (512/1920)
  }

  @Test fun neverUpscales() {
    val (w, h) = ThumbnailEncoderKt.targetSize(100, 100, 512, 512)
    assertEquals(100, w)
    assertEquals(100, h)
  }

  @Test fun mimeMapping() {
    assertEquals("image/png", ThumbnailEncoderKt.mimeFor("png"))
    assertEquals("image/jpeg", ThumbnailEncoderKt.mimeFor("jpeg"))
  }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run (from repo root):
```bash
cd example/android && ./gradlew :react-native-nitro-thumbnail:testDebugUnitTest --tests "com.margelo.nitro.nitrothumbnail.ThumbnailSizeTest" 2>&1 | tail -25
```
Expected: FAIL — `ThumbnailEncoderKt` is unresolved / does not compile.

(If the module path `:react-native-nitro-thumbnail` differs, list modules with `./gradlew projects` and use the matching name. Record the actual task path.)

- [ ] **Step 4: Implement the helpers**

`android/src/main/java/com/margelo/nitro/nitrothumbnail/ThumbnailEncoderKt.kt`:
```kotlin
package com.margelo.nitro.nitrothumbnail

import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

/** Pure sizing/encoding helpers, kept separate from the HybridObject for unit testing. */
object ThumbnailEncoderKt {
  /** Aspect-fit (naturalW, naturalH) inside (maxW, maxH), never upscaling. */
  fun targetSize(naturalW: Int, naturalH: Int, maxW: Int, maxH: Int): Pair<Int, Int> {
    if (naturalW <= 0 || naturalH <= 0) return naturalW to naturalH
    val scale = minOf(
      maxW.toDouble() / naturalW,
      maxH.toDouble() / naturalH,
      1.0, // never upscale
    )
    return (naturalW * scale).roundToInt() to (naturalH * scale).roundToInt()
  }

  fun mimeFor(format: String): String = if (format == "png") "image/png" else "image/jpeg"

  /** Encode a Bitmap to PNG or JPEG bytes. Returns null for unsupported formats. */
  fun encode(bitmap: Bitmap, format: String, quality: Double): ByteArray? {
    val fmt = when (format) {
      "png" -> Bitmap.CompressFormat.PNG
      "jpeg" -> Bitmap.CompressFormat.JPEG
      else -> return null
    }
    val q = (quality * 100).roundToInt().coerceIn(0, 100)
    val out = ByteArrayOutputStream()
    return if (bitmap.compress(fmt, q, out)) out.toByteArray() else null
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run the same command as Step 3.
Expected: PASS (3 tests). (`targetSize`/`mimeFor` are pure JVM; `encode` is compiled but exercised on-device in Task 3.)

- [ ] **Step 6: Commit**

```bash
git add android/src/main/java/com/margelo/nitro/nitrothumbnail/ThumbnailEncoderKt.kt \
        android/src/test/java/com/margelo/nitro/nitrothumbnail/ThumbnailSizeTest.kt \
        android/build.gradle
git commit -m "feat(android): add tested thumbnail size + encode helpers"
```

---

### Task 2: Kotlin `HybridThumbnail` — local thumbnail extraction

**Files:**
- Modify (replace stub body): `android/src/main/java/com/margelo/nitro/nitrothumbnail/HybridThumbnail.kt`

**Interfaces:**
- Consumes: generated `HybridThumbnailSpec`, `NativeThumbnailOptions`, `NativeThumbnailResult`; `ThumbnailEncoderKt` (Task 1); `com.margelo.nitro.core.Promise`; `com.margelo.nitro.NitroModules.applicationContext`.
- Produces: `class HybridThumbnail : HybridThumbnailSpec()` whose `create(options)` returns a `Promise<NativeThumbnailResult>` for local `file://`/absolute paths (remote handled in M3).

- [ ] **Step 1: Replace the stub implementation**

`android/src/main/java/com/margelo/nitro/nitrothumbnail/HybridThumbnail.kt` (full file):
```kotlin
package com.margelo.nitro.nitrothumbnail

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.util.UUID

@DoNotStrip
class HybridThumbnail : HybridThumbnailSpec() {
  override fun create(options: NativeThumbnailOptions): Promise<NativeThumbnailResult> {
    return Promise.async {
      val file = resolveLocalFile(options.url) // local only this plan
      val retriever = MediaMetadataRetriever()
      try {
        try {
          retriever.setDataSource(file.absolutePath)
        } catch (e: Exception) {
          throw err("DECODE_FAILED", "Could not open video: ${e.message}")
        }

        val maxW = options.maxWidth.toInt()
        val maxH = options.maxHeight.toInt()
        val timeUs = (options.timeStamp * 1000L).toLong() // ms -> microseconds
        val sync = if (options.onlySyncedFrames)
          MediaMetadataRetriever.OPTION_CLOSEST_SYNC
        else
          MediaMetadataRetriever.OPTION_CLOSEST

        val frame: Bitmap = extractFrame(retriever, timeUs, sync, maxW, maxH)
          ?: throw err("DECODE_FAILED", "Could not extract a frame at ${options.timeStamp}ms")

        val bytes = ThumbnailEncoderKt.encode(frame, options.format, options.quality)
          ?: throw err("UNSUPPORTED_FORMAT", "Cannot encode as ${options.format}")

        val out = outputFile(options.format, options.cacheName)
        try {
          out.writeBytes(bytes)
        } catch (e: Exception) {
          throw err("WRITE_FAILED", e.message ?: "write failed")
        }

        NativeThumbnailResult(
          path = Uri.fromFile(out).toString(),
          size = bytes.size.toDouble(),
          mime = ThumbnailEncoderKt.mimeFor(options.format),
          width = frame.width.toDouble(),
          height = frame.height.toDouble(),
        )
      } finally {
        retriever.release()
      }
    }
  }

  // MARK: helpers

  /** Nitro surfaces only the error message to JS, so encode the code as a "[CODE] message" prefix. */
  private fun err(code: String, message: String) = RuntimeException("[$code] $message")

  private fun resolveLocalFile(raw: String): File {
    val path = when {
      raw.startsWith("file://") -> Uri.parse(raw).path ?: raw.removePrefix("file://")
      raw.startsWith("/") -> raw
      raw.startsWith("http://") || raw.startsWith("https://") ->
        throw err("INVALID_URL", "Only local file URLs are supported in this build: $raw")
      else -> throw err("INVALID_URL", "Unsupported URL: $raw")
    }
    val file = File(path)
    if (!file.exists()) throw err("FILE_NOT_FOUND", "No file at $path")
    return file
  }

  private fun extractFrame(
    retriever: MediaMetadataRetriever,
    timeUs: Long,
    option: Int,
    maxW: Int,
    maxH: Int,
  ): Bitmap? {
    if (Build.VERSION.SDK_INT >= 27) {
      retriever.getScaledFrameAtTime(timeUs, option, maxW, maxH)?.let { return it }
    }
    // Pre-27 (or null result): full frame then scale down preserving aspect.
    val full = retriever.getFrameAtTime(timeUs, option) ?: return null
    val (w, h) = ThumbnailEncoderKt.targetSize(full.width, full.height, maxW, maxH)
    if (w == full.width && h == full.height) return full
    val scaled = Bitmap.createScaledBitmap(full, w.coerceAtLeast(1), h.coerceAtLeast(1), true)
    if (scaled != full) full.recycle()
    return scaled
  }

  private fun outputFile(format: String, cacheName: String?): File {
    val ctx = NitroModules.applicationContext
      ?: throw err("WRITE_FAILED", "No Android context available")
    val dir = File(ctx.cacheDir, "thumbnails").apply { mkdirs() }
    val ext = if (format == "png") "png" else "jpg"
    val base = if (!cacheName.isNullOrEmpty()) cacheName else "thumb-${UUID.randomUUID()}"
    return File(dir, "$base.$ext")
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add android/src/main/java/com/margelo/nitro/nitrothumbnail/HybridThumbnail.kt
git commit -m "feat(android): generate local video thumbnails via MediaMetadataRetriever"
```

(Build verification is Task 3 — a Kotlin compile error there sends you back here.)

---

### Task 3: Build + run the example on an Android emulator (end-to-end verification)

**Files:** none (verification only). Uses the existing `example/src/App.tsx`.

**Interfaces:** Consumes `createThumbnail` end-to-end through the Nitro JS↔Kotlin bridge.

- [ ] **Step 1: Regenerate nitrogen + assemble the debug APK**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail
yarn nitrogen
cd example/android && ./gradlew assembleDebug 2>&1 | tail -25
```
Expected: `BUILD SUCCESSFUL`. (A Kotlin compile error → return to Task 2.)

- [ ] **Step 2: Boot an emulator and start Metro**

Run (pick an installed AVD from `emulator -list-avds`, e.g. `Pixel_9_Pro_XL`):
```bash
$ANDROID_HOME/emulator/emulator -avd Pixel_9_Pro_XL -no-snapshot -no-boot-anim &
$ANDROID_HOME/platform-tools/adb wait-for-device
# in the repo: start metro
cd /Users/shiv/react-native-nitro-thumbnail/example && yarn start &
```

- [ ] **Step 3: Install, launch, and verify the success path**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail/example
yarn android   # builds (if needed), installs, launches on the emulator
# allow the JS bundle + auto-run to complete, then screenshot:
$ANDROID_HOME/platform-tools/adb exec-out screencap -p > /tmp/android_thumb.png
```
Expected on screen: the thumbnail image renders and the JSON shows `mime: "image/jpeg"`, non-zero `size`, and `width`/`height` ≤ 512 preserving aspect (the bundled `sample.mp4` is 640×360 → 512×288). Inspect `/tmp/android_thumb.png`.

- [ ] **Step 4: Verify the error path**

Temporarily edit `example/src/App.tsx` `run()` to call `createThumbnail({ url: 'file:///does/not/exist.mp4', timeStamp: 1000 })`; reload the app (`adb shell input text "RR"` via dev menu, or relaunch). Expected on screen: `FILE_NOT_FOUND: No file at /does/not/exist.mp4` — confirming the `[CODE]` error crosses the bridge and `toThumbnailError` parses it. **Revert the temporary change.**

- [ ] **Step 5: No commit** (verification only; any reverted edits leave the tree clean).

---

### Task 4: Confirm CI covers Android + finalize

**Files:**
- Verify/Modify: `.github/workflows/ci.yml`

**Interfaces:** none.

- [ ] **Step 1: Confirm the Android CI job builds the example**

The generated `ci.yml` already has a `build-android` job that runs `yarn nitrogen` then `yarn turbo run build:android` (gradle `assembleDebug`). Confirm it is present and unchanged. If the library unit test (Task 1) is not covered by any job, add a step to the `build-android` job after nitrogen:
```yaml
      - name: Run Android unit tests
        run: cd example/android && ./gradlew :react-native-nitro-thumbnail:testDebugUnitTest
```
(Only add if absent; use the actual module task path confirmed in Task 1.)

- [ ] **Step 2: Full local JS gate (regression check)**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail
yarn lint && yarn typecheck && yarn test --ci && yarn prepare
```
Expected: all pass (Plan 1's JS is untouched; this guards against accidental drift).

- [ ] **Step 3: Commit (only if ci.yml changed)**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run Android unit tests"
```

---

## Self-Review

**1. Spec coverage (M2):**
- Android `MediaMetadataRetriever.setDataSource` + `getScaledFrameAtTime(timeUs, option, maxW, maxH)` with `OPTION_CLOSEST_SYNC`/`OPTION_CLOSEST` and a pre-27 `getFrameAtTime` + `createScaledBitmap` fallback → Task 2. ✅
- `Bitmap.compress(JPEG quality | PNG)` → write to `cacheDir/thumbnails` → Tasks 1 (encode) + 2 (write). ✅
- Runs in a coroutine, bridged via `Promise.async` → Task 2. ✅
- Typed error model via native→JS `[CODE]` mapping (reuses Plan 1's `toThumbnailError`) → Task 2. ✅
- Result shape + Double types + drop-in defaults (applied in TS) → reused from Plan 1, honored by `NativeThumbnailResult`. ✅
- Testing: pure sizing math via JUnit (Task 1); full pipeline via emulator end-to-end (Task 3); gradle build (Task 3); CI (Task 4). Robolectric is intentionally **not** used — it cannot decode a real video frame, so the emulator is the authoritative pipeline test (mirrors iOS using the simulator, not a heavy XCTest target). Flagged, not silently dropped.

**2. Placeholder scan:** No TBD/TODO. Task 1 Step 3 and Task 4 Step 1 contain "confirm the actual module task path / job presence" guard rails (not placeholders — generated Gradle module names are only knowable at execution).

**3. Type consistency:** `targetSize`/`mimeFor`/`encode` signatures identical across Task 1 (definition) and Task 2 (use). `NativeThumbnailResult(path,size,mime,width,height)` positional args match the generated data class. `err(code,message)` produces the same `"[CODE] message"` format Plan 1's `toThumbnailError` parses. `create` signature matches the generated `HybridThumbnailSpec`.

---

## Notes for the next plans

- **Plan 3 (M3, remote + headers):** in `resolveLocalFile`/iOS `resolveURL`, accept `http(s)` and pass `headers` — Android `retriever.setDataSource(url, headers)`, iOS `AVURLAsset(url:options:[AVURLAssetHTTPHeaderFieldsKey: headers])`; map network failures to `REMOTE_FETCH_FAILED`; web `fetch`→blob.
- **Plan 4 (M4, caching):** implement `cacheName` dedup (return the existing file if present) + `dirSize` LRU eviction (delete oldest by last-modified until total ≤ cap) in shared semantics, per-platform impl + tests. Task 2 already lays the `cacheName` filename groundwork.
