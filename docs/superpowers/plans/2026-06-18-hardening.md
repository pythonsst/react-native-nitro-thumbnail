# Hardening Implementation Plan (Plan 7 — M7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address the concrete spec-defined hardening item deferred from M1: iOS should prefer the modern async `AVAssetImageGenerator.image(at:)` (iOS 16+) and fall back to `copyCGImage(at:actualTime:)` for iOS 13–15.

**Architecture:** `create()` already runs inside `Promise.async { ... }` (a Swift `async` context), so we can `await gen.image(at:)` directly behind an `#available` check, keeping the existing remote/decode error mapping. No API or behaviour change for callers; this removes a deprecation and uses the supported async path on modern iOS.

**Scope (M7):** iOS async frame extraction only. (Android `getScaledFrameAtTime` is already the modern API.) Publish prep (M8) is a separate plan and is **not** executed autonomously.

## Global Constraints

(Same as Plans 1–6.) iOS 13+. No new deps. Error codes unchanged; remote network failures still map to `REMOTE_FETCH_FAILED`, other extraction failures to `DECODE_FAILED`.

## Facts established

- `ios/HybridThumbnail.swift` `create()` currently does:
  ```swift
  let cg: CGImage
  do {
    cg = try gen.copyCGImage(at: time, actualTime: nil)
  } catch {
    let ns = error as NSError
    if isRemote && ns.domain == NSURLErrorDomain { throw Self.err("REMOTE_FETCH_FAILED", ...) }
    throw Self.err("DECODE_FAILED", ...)
  }
  ```
- `AVAssetImageGenerator.image(at:)` (iOS 16+) is `async throws` and returns `(image: CGImage, actualTime: CMTime)`.
- The closure passed to `Promise.async` is `async throws`, so `await` is allowed.

---

### Task 1: iOS async frame extraction with fallback

**Files:** Modify `ios/HybridThumbnail.swift`

- [ ] **Step 1: Replace the extraction block**

Replace:
```swift
      let cg: CGImage
      do {
        cg = try gen.copyCGImage(at: time, actualTime: nil)
      } catch {
```
with:
```swift
      let cg: CGImage
      do {
        if #available(iOS 16.0, *) {
          cg = try await gen.image(at: time).image
        } else {
          cg = try gen.copyCGImage(at: time, actualTime: nil)
        }
      } catch {
```
(The `catch` body — remote/decode mapping — stays unchanged.)

- [ ] **Step 2: Build to verify it compiles**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail && yarn nitrogen
cd example/ios && xcodebuild -workspace NitroThumbnailExample.xcworkspace -scheme NitroThumbnail \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO 2>&1 | tail -8
```
Expected: `BUILD SUCCEEDED`.

- [ ] **Step 3: Runtime re-verify (iOS 16+ async path) on the simulator**

Rebuild the example app, install, launch on a modern simulator (iPhone 17 ⇒ exercises the `image(at:)` branch). Confirm the local thumbnail still renders with `mime: image/jpeg`, non-zero `size`, `512×288` (the existing example auto-runs on mount). Screenshot.

- [ ] **Step 4: Commit**

```bash
git add ios/HybridThumbnail.swift
git commit -m "perf(ios): use async image(at:) on iOS 16+, copyCGImage fallback for 13-15"
```

---

### Task 2: Full JS regression gate

- [ ] **Step 1:** `yarn lint && yarn typecheck && yarn test --ci && yarn prepare` — all pass (no JS change; guards drift).

---

## Self-Review

**1. Spec coverage:** "prefer async `image(at:)` (iOS 16+) with a `copyCGImage(at:actualTime:)` fallback for iOS 13–15" → Task 1. ✅
**2. Placeholder scan:** None.
**3. Consistency:** `cg` is still assigned a `CGImage`; downstream encode/write unchanged; error mapping unchanged.

## Notes for the next plan

- **Plan 8 (M8, publish):** finalize `package.json` (keywords, files), `npm pack`/publish dry-run, release workflow + CHANGELOG. **Publishing is an outward-facing action — do not run `npm publish` without explicit user authorization.**
