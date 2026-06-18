# Remote Videos + Headers Implementation Plan (Plan 3 — M3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `createThumbnail()` generate a thumbnail from a **remote** `http(s)` video URL (with optional request `headers`) on iOS and Android, streaming frames directly without a manual download step.

**Architecture:** The TS layer already forwards `url` + `headers` unchanged and does not reject `http(s)` (Plan 1). This plan only extends the two native resolve paths: iOS builds an `AVURLAsset` with `AVURLAssetHTTPHeaderFieldsKey`; Android calls `MediaMetadataRetriever.setDataSource(url, headers)`. Network failures map to the typed `REMOTE_FETCH_FAILED` code. Local-file behaviour (M1/M2) is unchanged.

**Tech Stack:** Swift/AVFoundation, Kotlin/MediaMetadataRetriever, Nitro Promise, Jest, xcodebuild, Gradle, iOS simulator + Android emulator.

**Scope (M3):** remote URL + headers for iOS + Android. Caching (M4), web (M5), Expo (M6) are later plans. Web remains the Plan 1 stub.

## Global Constraints

(Same as Plans 1–2 — copied essentials.)
- RN 0.75+, both architectures. iOS 13+, Android minSdk 24. License MIT. Peer `react-native-nitro-modules`.
- Drop-in option/result names + defaults from Plan 1 (applied in TS). Additive `quality`.
- Error codes: `INVALID_URL`, `FILE_NOT_FOUND`, `REMOTE_FETCH_FAILED`, `DECODE_FAILED`, `UNSUPPORTED_FORMAT`, `WRITE_FAILED`, `UNKNOWN`. Native throws `"[CODE] message"`; TS `toThumbnailError` parses it (established Plan 1).
- Remote videos stream frames directly (no manual download); the cache governs generated thumbnails only.

## Facts established (do not re-derive)

- TS `createThumbnail` (src/index.ts) validates only non-empty `url` + `format ∈ {jpeg,png}`; it forwards `headers` and `http(s)` URLs unchanged. **No TS validation change needed for remote.**
- iOS impl: `ios/HybridThumbnail.swift`, `create()` currently does `let url = try Self.resolveURL(options.url); let asset = AVURLAsset(url: url)`. `resolveURL` throws `INVALID_URL` for non-local. Error helper `Self.err(code,message)` → `RuntimeError("[CODE] message")`.
- Android impl: `android/.../HybridThumbnail.kt`, `create()` does `val file = resolveLocalFile(options.url); retriever.setDataSource(file.absolutePath)`. `resolveLocalFile` throws `INVALID_URL` for `http(s)`. Error helper `err(code,message)` → `RuntimeException("[CODE] message")`.
- Generated `NativeThumbnailOptions.headers` is `Dictionary<String,String>?` (Swift) / `Map<String,String>?` (Kotlin).
- Example (`example/src/App.tsx`) auto-runs a local thumbnail on mount and has a "Create thumbnail" button; uses `@dr.pogodin/react-native-fs`.
- Verification video (returns 200): `https://media.w3.org/2010/05/sintel/trailer.mp4`.

---

## File Structure

- `ios/HybridThumbnail.swift` — **modify**: replace `resolveURL` with `makeAsset(url, headers)`; remote error mapping.
- `android/.../HybridThumbnail.kt` — **modify**: replace `resolveLocalFile` + `setDataSource` with scheme-aware `setDataSource`; remote error mapping.
- `__tests__/createThumbnail.test.ts` — **modify**: add a test that `headers` + an `http(s)` url forward to native unchanged.
- `example/src/App.tsx` — **modify**: add a "Remote thumbnail" button calling the verification URL.

---

### Task 1: JS — confirm headers + remote URL forward to native (TDD)

**Files:** Modify `__tests__/createThumbnail.test.ts`

**Interfaces:** Consumes existing `createThumbnail`. No source change expected (guards the contract).

- [ ] **Step 1: Add the failing/forwarding test**

Append to `__tests__/createThumbnail.test.ts`:
```ts
test('forwards http(s) url and headers to native unchanged', async () => {
  const headers = { Authorization: 'Bearer x', 'X-Test': '1' };
  await createThumbnail({ url: 'https://host/v.mp4', headers });
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://host/v.mp4', headers })
  );
});
```

- [ ] **Step 2: Run it**

Run: `yarn jest createThumbnail`
Expected: PASS (the TS layer already forwards `url`/`headers`; this locks the contract). If it FAILS, fix `src/index.ts` to forward `headers` (it currently does). 7 tests total.

- [ ] **Step 3: Commit**

```bash
git add __tests__/createThumbnail.test.ts
git commit -m "test: lock that createThumbnail forwards remote url + headers"
```

---

### Task 2: iOS — remote `http(s)` + headers

**Files:** Modify `ios/HybridThumbnail.swift`

**Interfaces:** Produces `makeAsset(_ raw: String, headers: [String:String]?) throws -> AVURLAsset`; replaces `resolveURL`. Remote decode/network failures map to `REMOTE_FETCH_FAILED`, others `DECODE_FAILED`.

- [ ] **Step 1: Replace `resolveURL` usage with `makeAsset`**

In `create()`, replace:
```swift
      let url = try Self.resolveURL(options.url)              // local only this plan
      let asset = AVURLAsset(url: url)
```
with:
```swift
      let (asset, isRemote) = try Self.makeAsset(options.url, headers: options.headers)
```

Replace the `do/catch` around `copyCGImage` with remote-aware error mapping:
```swift
      let cg: CGImage
      do {
        cg = try gen.copyCGImage(at: time, actualTime: nil)
      } catch {
        let ns = error as NSError
        if isRemote && ns.domain == NSURLErrorDomain {
          throw Self.err("REMOTE_FETCH_FAILED",
                         "Could not fetch remote video: \(error.localizedDescription)")
        }
        throw Self.err("DECODE_FAILED",
                       "Could not extract frame: \(error.localizedDescription)")
      }
```

- [ ] **Step 2: Replace the `resolveURL` helper with `makeAsset`**

Replace the whole `private static func resolveURL(...) -> URL { ... }` with:
```swift
  /// Build an AVURLAsset for a local file path or a remote http(s) URL (with headers).
  private static func makeAsset(
    _ raw: String, headers: [String: String]?
  ) throws -> (AVURLAsset, Bool) {
    if raw.hasPrefix("http://") || raw.hasPrefix("https://") {
      guard let u = URL(string: raw) else {
        throw err("INVALID_URL", "Malformed URL: \(raw)")
      }
      var options: [String: Any] = [:]
      if let headers = headers, !headers.isEmpty {
        options["AVURLAssetHTTPHeaderFieldsKey"] = headers
      }
      return (AVURLAsset(url: u, options: options), true)
    }
    if raw.hasPrefix("file://"), let u = URL(string: raw) {
      guard FileManager.default.fileExists(atPath: u.path) else {
        throw err("FILE_NOT_FOUND", "No file at \(u.path)")
      }
      return (AVURLAsset(url: u), false)
    }
    if raw.hasPrefix("/") {
      guard FileManager.default.fileExists(atPath: raw) else {
        throw err("FILE_NOT_FOUND", "No file at \(raw)")
      }
      return (AVURLAsset(url: URL(fileURLWithPath: raw)), false)
    }
    throw err("INVALID_URL", "Unsupported URL: \(raw)")
  }
```

(`AVURLAssetHTTPHeaderFieldsKey` is a `String` constant; using the literal key avoids an extra import and is API-stable.)

- [ ] **Step 3: Build to verify it compiles**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail && yarn nitrogen
cd example/ios && xcodebuild -workspace NitroThumbnailExample.xcworkspace -scheme NitroThumbnail \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO 2>&1 | tail -8
```
Expected: `BUILD SUCCEEDED`.

- [ ] **Step 4: Commit**

```bash
git add ios/HybridThumbnail.swift
git commit -m "feat(ios): support remote http(s) videos + request headers"
```

---

### Task 3: Android — remote `http(s)` + headers

**Files:** Modify `android/src/main/java/com/margelo/nitro/nitrothumbnail/HybridThumbnail.kt`

**Interfaces:** Produces `setSource(retriever, url, headers)`; replaces `resolveLocalFile` + the local-only `setDataSource`. Network failures map to `REMOTE_FETCH_FAILED`.

- [ ] **Step 1: Replace the data-source setup in `create()`**

Replace:
```kotlin
      val file = resolveLocalFile(options.url) // local only this plan
      val retriever = MediaMetadataRetriever()
      try {
        try {
          retriever.setDataSource(file.absolutePath)
        } catch (e: Exception) {
          throw err("DECODE_FAILED", "Could not open video: ${e.message}")
        }
```
with:
```kotlin
      val retriever = MediaMetadataRetriever()
      try {
        setSource(retriever, options.url, options.headers)
```

- [ ] **Step 2: Replace `resolveLocalFile` with `setSource`**

Replace the whole `private fun resolveLocalFile(raw: String): File { ... }` with:
```kotlin
  /** Point the retriever at a local file or a remote http(s) URL (with headers). */
  private fun setSource(
    retriever: MediaMetadataRetriever,
    raw: String,
    headers: Map<String, String>?,
  ) {
    when {
      raw.startsWith("http://") || raw.startsWith("https://") -> {
        try {
          retriever.setDataSource(raw, headers ?: emptyMap())
        } catch (e: Exception) {
          throw err("REMOTE_FETCH_FAILED", "Could not fetch remote video: ${e.message}")
        }
      }
      else -> {
        val path = when {
          raw.startsWith("file://") -> Uri.parse(raw).path ?: raw.removePrefix("file://")
          raw.startsWith("/") -> raw
          else -> throw err("INVALID_URL", "Unsupported URL: $raw")
        }
        val file = File(path)
        if (!file.exists()) throw err("FILE_NOT_FOUND", "No file at $path")
        try {
          retriever.setDataSource(file.absolutePath)
        } catch (e: Exception) {
          throw err("DECODE_FAILED", "Could not open video: ${e.message}")
        }
      }
    }
  }
```

(Keep the existing `import java.io.File`, `android.net.Uri`. `File` import is still used here.)

- [ ] **Step 3: Build to verify it compiles**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail && yarn nitrogen
cd example/android && ./gradlew assembleDebug 2>&1 | tail -8
```
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Commit**

```bash
git add android/src/main/java/com/margelo/nitro/nitrothumbnail/HybridThumbnail.kt
git commit -m "feat(android): support remote http(s) videos + request headers"
```

---

### Task 4: Example "Remote" demo + end-to-end verification (iOS + Android)

**Files:** Modify `example/src/App.tsx`

**Interfaces:** Consumes `createThumbnail` with a remote URL.

- [ ] **Step 1: Add a Remote button**

In `example/src/App.tsx`, refactor `run` to take an optional url and add a second button. Minimal change: add a `runRemote` callback that calls
`createThumbnail({ url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', timeStamp: 2000 })`
and a `<Button title="Remote thumbnail" onPress={runRemote} />` below the existing button. Reuse the same `setThumb`/`setErr` state.

- [ ] **Step 2: Verify on iOS simulator**

Build/run the example on the simulator (per Plan 1 Task 7 flow). Trigger the remote path (tap the button, or temporarily point the mount auto-run at the remote URL). Confirm a thumbnail renders and the result JSON shows `mime: image/jpeg`, non-zero `size`, and `width`/`height` ≤ 512. (The Sintel trailer is 1280×544 → fits to 512×218.)

- [ ] **Step 3: Verify on Android emulator**

Build/run on the emulator. Trigger the remote path. Confirm the generated thumbnail (pull `cache/thumbnails/*.jpg` via `run-as`, or screenshot) is a real frame at the constrained size. Confirm `THUMB_OK`-style result via logcat if the emulator UI cannot render.

- [ ] **Step 4: Verify the error path (bad host → REMOTE_FETCH_FAILED)**

Temporarily call `createThumbnail({ url: 'https://nonexistent.invalid/v.mp4' })`; expect code `REMOTE_FETCH_FAILED` (Android) / `REMOTE_FETCH_FAILED` or `DECODE_FAILED` (iOS, depending on the AVFoundation error domain). Revert temporary changes.

- [ ] **Step 5: Commit**

```bash
git add example/src/App.tsx
git commit -m "feat(example): add remote thumbnail demo"
```

---

### Task 5: Full regression gate

- [ ] **Step 1: JS gate**

Run: `yarn lint && yarn typecheck && yarn test --ci && yarn prepare`
Expected: all pass (now 7 createThumbnail tests + others).

- [ ] **Step 2: No commit** (verification only; CI unchanged — `build-ios`/`build-android` already compile the native changes).

---

## Self-Review

**1. Spec coverage (M3):**
- iOS `AVURLAsset` + `AVURLAssetHTTPHeaderFieldsKey` for remote + headers → Task 2. ✅
- Android `setDataSource(url, headers)` for remote + headers → Task 3. ✅
- Stream frames directly, no manual download → both use the existing extract path unchanged. ✅
- Network failure → `REMOTE_FETCH_FAILED` → Tasks 2 (NSURLErrorDomain check) + 3 (setDataSource catch). ✅
- TS forwards url/headers unchanged → Task 1 locks it. ✅
- Web remains the Plan 1 stub (M5). Flagged. ✅

**2. Placeholder scan:** None. Task 4 verification adapts to the emulator-render limitation (documented in Plan 2) via file-pull/logcat.

**3. Type consistency:** `makeAsset` returns `(AVURLAsset, Bool)`; the `isRemote` flag is consumed in the catch. `setSource` returns Unit and is called before the frame extraction. `headers` types match the generated `Dictionary`/`Map`. `err(...)` unchanged. No JS API change.

---

## Notes for the next plans

- **Plan 4 (M4, caching):** `cacheName` dedup (return existing file) + `dirSize` LRU eviction; shared semantics, per-platform + tests.
- **Plan 5 (M5, web):** real `<video>`/`<canvas>` impl in `src/index.web.ts`; `fetch(url,{headers})`→blob for CORS; document object-URL/no-disk-cache limits.
