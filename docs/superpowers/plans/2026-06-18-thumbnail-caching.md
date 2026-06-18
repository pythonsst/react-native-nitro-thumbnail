# Thumbnail Caching Implementation Plan (Plan 4 — M4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the two caching behaviours from the spec: `cacheName` deterministic-filename **dedup** (return an existing thumbnail without re-decoding) and `dirSize` (MB) **LRU eviction** of the `thumbnails/` cache, on iOS and Android.

**Architecture:** Both behaviours are native (the cache lives in the platform cache dir, already used by M1/M2). The eviction *decision* (which files to delete given sizes + modified-times + a byte cap) is pure logic extracted into the existing testable helper objects (`ThumbnailEncoder` / `ThumbnailEncoderKt`) and unit-tested off-device. The HybridObjects wire it up: on `cacheName` hit, return the existing file's metadata; after any new write, evict oldest files until total ≤ cap.

**Tech Stack:** Swift (CoreGraphics/ImageIO for reading existing dims), Kotlin (BitmapFactory bounds), Nitro Promise, SwiftPM + JUnit (pure helper tests), xcodebuild, Gradle, simulator/emulator.

**Scope (M4):** `cacheName` dedup + `dirSize` LRU. Web (M5), Expo (M6) later. Behaviour for local + remote (M1–M3) is unchanged except the new pre-decode dedup check and post-write eviction.

## Global Constraints

(Same as Plans 1–3.)
- Defaults (TS, Plan 1): `dirSize=100` (MB), `cacheName` optional. Result `{path,size,mime,width,height}` (Double numbers natively).
- Native throws `"[CODE] message"`; TS `toThumbnailError` parses it. Codes unchanged.
- Cache dir: `thumbnails/` under iOS Caches / Android `cacheDir` (already created by M1/M2).
- `cacheName` semantics: deterministic filename; if it already exists, return it immediately without re-decoding. `dirSize`: after writing, enforce the MB cap via LRU (delete oldest by last-modified until total ≤ cap).

## Facts established (do not re-derive)

- iOS `ios/HybridThumbnail.swift`: `outputURL(format:cacheName:)` already builds `<caches>/thumbnails/<base>.<ext>` where `base = cacheName ?? thumb-UUID`. `create()` returns `NativeThumbnailResult(path: outURL.absoluteString, size: Double(data.count), mime:..., width: Double(cg.width), height: Double(cg.height))`. Helper `ThumbnailEncoder` (pure) in `ios/ThumbnailEncoder.swift`. Error helper `Self.err(code,message)`.
- Android `android/.../HybridThumbnail.kt`: `outputFile(format,cacheName)` → `File(cacheDir/thumbnails, "<base>.<ext>")`. Returns `NativeThumbnailResult(path = Uri.fromFile(out).toString(), size = bytes.size.toDouble(), mime=..., width = frame.width.toDouble(), height=...)`. Helper `ThumbnailEncoderKt` (pure) in `ThumbnailEncoderKt.kt`. Context via `NitroModules.applicationContext`.
- `dirSize` reaches native as `options.dirSize: Double` (MB). 1 MB = 1024*1024 bytes.
- Pure-helper test harnesses already exist: iOS via SwiftPM symlinking `ios/ThumbnailEncoder.swift` (see Plan 1); Android via `android/src/test` JUnit (see Plan 2 `ThumbnailSizeTest`).

---

## File Structure

- `ios/ThumbnailEncoder.swift` — **modify**: add pure `filesToEvict(...)`.
- `android/.../ThumbnailEncoderKt.kt` — **modify**: add pure `filesToEvict(...)`.
- `android/src/test/.../ThumbnailEvictionTest.kt` — **create**: JUnit tests for `filesToEvict`.
- `ios/HybridThumbnail.swift` — **modify**: dedup on `cacheName` hit + evict after write; add `existingResult(...)` + `enforceLimit(...)`.
- `android/.../HybridThumbnail.kt` — **modify**: same in Kotlin.
- (iOS pure-helper test added to the SwiftPM harness during execution, mirroring Plan 1.)

---

### Task 1: Pure LRU eviction decision (TDD, both platforms)

**Files:**
- Modify: `ios/ThumbnailEncoder.swift`, `android/.../ThumbnailEncoderKt.kt`
- Create: `android/src/test/java/com/margelo/nitro/nitrothumbnail/ThumbnailEvictionTest.kt`

**Interfaces:**
- Produces (Android): `fun filesToEvict(entries: List<Triple<String, Long, Long>>, capBytes: Long): List<String>` where each entry is `(path, sizeBytes, modifiedMillis)`. Returns paths to delete: if total ≤ cap, empty; else delete oldest (smallest `modifiedMillis`) first until total ≤ cap.
- Produces (iOS): `static func filesToEvict(_ entries: [(path: String, size: Int, modified: Double)], capBytes: Int) -> [String]` (same semantics; `modified` = seconds).

- [ ] **Step 1: Write the failing Android JUnit test**

`android/src/test/java/com/margelo/nitro/nitrothumbnail/ThumbnailEvictionTest.kt`:
```kotlin
package com.margelo.nitro.nitrothumbnail

import org.junit.Assert.assertEquals
import org.junit.Test

class ThumbnailEvictionTest {
  @Test fun underCapEvictsNothing() {
    val entries = listOf(Triple("a", 10L, 1L), Triple("b", 20L, 2L))
    assertEquals(emptyList<String>(), ThumbnailEncoderKt.filesToEvict(entries, 100L))
  }

  @Test fun overCapEvictsOldestFirst() {
    // total 60, cap 25 -> must drop oldest until <=25: drop a(1),b(2)=30>25 drop c(3)=... 
    val entries = listOf(
      Triple("a", 20L, 1L), // oldest
      Triple("b", 20L, 2L),
      Triple("c", 20L, 3L), // newest
    )
    // total 60 -> drop a (40) -> drop b (20) <=25 -> keep c
    assertEquals(listOf("a", "b"), ThumbnailEncoderKt.filesToEvict(entries, 25L))
  }

  @Test fun exactlyAtCapEvictsNothing() {
    val entries = listOf(Triple("a", 50L, 1L), Triple("b", 50L, 2L))
    assertEquals(emptyList<String>(), ThumbnailEncoderKt.filesToEvict(entries, 100L))
  }
}
```

- [ ] **Step 2: Run it (Android) to verify it fails**

Run: `cd example/android && ./gradlew :react-native-nitro-thumbnail:testDebugUnitTest --tests "*ThumbnailEvictionTest" 2>&1 | tail -20`
Expected: FAIL — `filesToEvict` unresolved.

- [ ] **Step 3: Implement `filesToEvict` (Android)**

Append to `object ThumbnailEncoderKt` in `ThumbnailEncoderKt.kt`:
```kotlin
  /**
   * Given (path, sizeBytes, modifiedMillis) entries and a byte cap, return the
   * paths to delete (oldest first) so the remaining total is <= cap.
   */
  fun filesToEvict(
    entries: List<Triple<String, Long, Long>>,
    capBytes: Long,
  ): List<String> {
    var running = entries.sumOf { it.second }
    if (running <= capBytes) return emptyList()
    val oldestFirst = entries.sortedBy { it.third }
    val toDelete = mutableListOf<String>()
    for (e in oldestFirst) {
      if (running <= capBytes) break
      toDelete.add(e.first)
      running -= e.second
    }
    return toDelete
  }
```

- [ ] **Step 4: Run it (Android) to verify it passes**

Run the same command as Step 2. Expected: PASS (3 tests).

- [ ] **Step 5: Implement `filesToEvict` (iOS) + mirror the test in the SwiftPM harness**

Append to `enum ThumbnailEncoder` in `ios/ThumbnailEncoder.swift`:
```swift
  /// Given (path, size, modified-seconds) entries and a byte cap, return paths
  /// to delete (oldest first) so the remaining total is <= cap.
  static func filesToEvict(
    _ entries: [(path: String, size: Int, modified: Double)], capBytes: Int
  ) -> [String] {
    var running = entries.reduce(0) { $0 + $1.size }
    if running <= capBytes { return [] }
    let oldestFirst = entries.sorted { $0.modified < $1.modified }
    var toDelete: [String] = []
    for e in oldestFirst {
      if running <= capBytes { break }
      toDelete.append(e.path)
      running -= e.size
    }
    return toDelete
  }
```

Verify with the SwiftPM harness used in Plan 1 (symlink `ios/ThumbnailEncoder.swift` into a temp package), adding a test:
```swift
func testFilesToEvictOldestFirst() {
  let e = [("a", 20, 1.0), ("b", 20, 2.0), ("c", 20, 3.0)]
    .map { (path: $0.0, size: $0.1, modified: $0.2) }
  XCTAssertEqual(ThumbnailEncoder.filesToEvict(e, capBytes: 25), ["a", "b"])
  XCTAssertEqual(ThumbnailEncoder.filesToEvict(e, capBytes: 100), [])
}
```
Run `swift test` in the harness. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ios/ThumbnailEncoder.swift android/src/main/java/com/margelo/nitro/nitrothumbnail/ThumbnailEncoderKt.kt \
        android/src/test/java/com/margelo/nitro/nitrothumbnail/ThumbnailEvictionTest.kt
git commit -m "feat: add tested pure LRU eviction decision helper (iOS + Android)"
```

---

### Task 2: iOS — cacheName dedup + dirSize eviction

**Files:** Modify `ios/HybridThumbnail.swift`

**Interfaces:** Produces `existingResult(at:format:) -> NativeThumbnailResult?` and `enforceLimit(dir:capBytes:)`. Consumes `ThumbnailEncoder.filesToEvict`.

- [ ] **Step 1: Dedup before decoding**

In `create()`, immediately after computing the output URL (move `outputURL` up to before asset/decoding when `cacheName` is set), add: if `cacheName` is non-empty and the file exists, return its metadata without decoding.

Concretely, near the top of the `Promise.async` body (before building the asset):
```swift
      if let name = options.cacheName, !name.isEmpty {
        let candidate = try Self.outputURL(format: options.format, cacheName: name)
        if let hit = Self.existingResult(at: candidate, format: options.format) {
          return hit
        }
      }
```

- [ ] **Step 2: Evict after writing**

Right after the successful `data.write(to: outURL...)`, add:
```swift
      Self.enforceLimit(
        dir: outURL.deletingLastPathComponent(),
        capBytes: Int(options.dirSize * 1024 * 1024))
```

- [ ] **Step 3: Add the helpers**

Add to the `// MARK: helpers` section:
```swift
  private static func existingResult(
    at url: URL, format: String
  ) -> NativeThumbnailResult? {
    let fm = FileManager.default
    guard fm.fileExists(atPath: url.path),
          let attrs = try? fm.attributesOfItem(atPath: url.path),
          let size = attrs[.size] as? Int,
          let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
          let w = props[kCGImagePropertyPixelWidth] as? Double,
          let h = props[kCGImagePropertyPixelHeight] as? Double
    else { return nil }
    return NativeThumbnailResult(
      path: url.absoluteString,
      size: Double(size),
      mime: format == "png" ? "image/png" : "image/jpeg",
      width: w, height: h)
  }

  private static func enforceLimit(dir: URL, capBytes: Int) {
    guard capBytes > 0 else { return }
    let fm = FileManager.default
    guard let urls = try? fm.contentsOfDirectory(
      at: dir, includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey])
    else { return }
    let entries = urls.compactMap { u -> (path: String, size: Int, modified: Double)? in
      guard let v = try? u.resourceValues(
        forKeys: [.fileSizeKey, .contentModificationDateKey]),
        let size = v.fileSize, let date = v.contentModificationDate else { return nil }
      return (u.path, size, date.timeIntervalSince1970)
    }
    for path in ThumbnailEncoder.filesToEvict(entries, capBytes: capBytes) {
      try? fm.removeItem(atPath: path)
    }
  }
```
Add `import ImageIO` at the top if not already present (it is needed for `CGImageSource`).

- [ ] **Step 4: Build**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail && yarn nitrogen
cd example/ios && xcodebuild -workspace NitroThumbnailExample.xcworkspace -scheme NitroThumbnail \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO 2>&1 | tail -8
```
Expected: `BUILD SUCCEEDED`.

- [ ] **Step 5: Commit**

```bash
git add ios/HybridThumbnail.swift
git commit -m "feat(ios): cacheName dedup + dirSize LRU eviction"
```

---

### Task 3: Android — cacheName dedup + dirSize eviction

**Files:** Modify `android/.../HybridThumbnail.kt`

**Interfaces:** Produces `existingResult(file, format): NativeThumbnailResult?` and `enforceLimit(dir, capBytes)`. Consumes `ThumbnailEncoderKt.filesToEvict`.

- [ ] **Step 1: Dedup before decoding**

In `create()`, at the start of the `Promise.async` body (before `MediaMetadataRetriever()`), add:
```kotlin
      if (!options.cacheName.isNullOrEmpty()) {
        val candidate = outputFile(options.format, options.cacheName)
        existingResult(candidate, options.format)?.let { return@async it }
      }
```

- [ ] **Step 2: Evict after writing**

Right after `out.writeBytes(bytes)` succeeds (before constructing the result), add:
```kotlin
        enforceLimit(out.parentFile, (options.dirSize * 1024 * 1024).toLong())
```

- [ ] **Step 3: Add the helpers + imports**

Add `import android.graphics.BitmapFactory` at the top. Add to the helpers section:
```kotlin
  private fun existingResult(file: File, format: String): NativeThumbnailResult? {
    if (!file.exists()) return null
    val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, opts)
    if (opts.outWidth <= 0 || opts.outHeight <= 0) return null
    return NativeThumbnailResult(
      path = Uri.fromFile(file).toString(),
      size = file.length().toDouble(),
      mime = ThumbnailEncoderKt.mimeFor(format),
      width = opts.outWidth.toDouble(),
      height = opts.outHeight.toDouble(),
    )
  }

  private fun enforceLimit(dir: File?, capBytes: Long) {
    if (dir == null || capBytes <= 0) return
    val files = dir.listFiles() ?: return
    val entries = files.filter { it.isFile }
      .map { Triple(it.absolutePath, it.length(), it.lastModified()) }
    for (path in ThumbnailEncoderKt.filesToEvict(entries, capBytes)) {
      File(path).delete()
    }
  }
```

- [ ] **Step 4: Build**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail && yarn nitrogen
cd example/android && ./gradlew assembleDebug 2>&1 | tail -8
```
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/src/main/java/com/margelo/nitro/nitrothumbnail/HybridThumbnail.kt
git commit -m "feat(android): cacheName dedup + dirSize LRU eviction"
```

---

### Task 4: End-to-end verification (Android, capture-independent)

**Files:** none (verification only).

- [ ] **Step 1: Dedup returns the same path without a new file**

Temporarily set the example mount auto-run to call `createThumbnail({ url: <local>, cacheName: 'demo', timeStamp: 1000 })` twice and `console.log` both results. Reload on the emulator. Expected (via logcat): both `THUMB_OK` results have `path` ending `thumbnails/demo.jpg`; the file count for `demo.jpg` is 1 (run-as ls). The second call returns the existing file (dedup).

- [ ] **Step 2: dirSize eviction prunes the cache**

Temporarily generate several unique thumbnails (no cacheName) with a tiny `dirSize` (e.g. `0.02` MB ≈ 20 KB, ~2 thumbnails) in a loop. Reload. Expected: `run-as ls cache/thumbnails | wc -l` stays bounded (oldest evicted), confirming LRU. Revert temporary changes.

- [ ] **Step 3: No commit** (verification only; revert leaves the tree clean).

---

### Task 5: Full regression gate

- [ ] **Step 1:** `yarn lint && yarn typecheck && yarn test --ci && yarn prepare` — all pass (no JS change; guards drift).
- [ ] **Step 2:** No commit. CI `build-ios`/`build-android` + the new `ThumbnailEvictionTest` (run by the Android unit-test CI step) cover the native changes.

---

## Self-Review

**1. Spec coverage (M4):**
- `cacheName` dedup (return existing without re-decoding) → Tasks 2/3 Step 1 + `existingResult`. ✅
- `dirSize` LRU eviction (delete oldest by last-modified until ≤ cap) → Task 1 pure helper + Tasks 2/3 `enforceLimit`. ✅
- Shared semantics, per-platform impl + tests → pure helper unit-tested on both (Task 1); wiring per platform. ✅
- Cache dir unchanged (`thumbnails/`). ✅

**2. Placeholder scan:** None. Task 4 verification uses logcat/`run-as ls` (per the emulator-render limitation documented in Plan 2).

**3. Type consistency:** `filesToEvict` signatures match between definition (Task 1) and use (`enforceLimit`, Tasks 2/3). `existingResult` returns `NativeThumbnailResult?` consumed via early-return. `NativeThumbnailResult(path,size,mime,width,height)` positional/named args match the generated structs. `dirSize` Double→bytes Int/Long. Error helpers unchanged.

---

## Notes for the next plans

- **Plan 5 (M5, web):** real `src/index.web.ts` via `<video>`+`<canvas>` (`fetch` for headers/CORS); `cacheName`/`dirSize` are best-effort no-ops on web (document it).
- **Plan 6 (M6, Expo):** config plugin; document bare vs Expo Go.
