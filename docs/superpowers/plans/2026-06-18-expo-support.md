# Expo Support Implementation Plan (Plan 6 — M6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `react-native-nitro-thumbnail` usable from Expo projects and document how.

**Architecture / finding:** This is a pure Nitro native module. It declares **no** extra iOS `Info.plist` keys and **no** Android permissions (empty library `AndroidManifest.xml`), so Expo CNG (prebuild) + autolinking handle it with **no config plugin required**. The only Expo-specific fact users need: Nitro has native code, so it requires an **Expo dev build / prebuild** — it does **not** run in Expo Go. Shipping a no-op `app.plugin.js` would be misleading, so M6 is documentation only.

**Scope (M6):** Expo usage docs. No code/config changes (none are needed). Hardening/publish (M7–M8) later.

## Global Constraints

(Same as Plans 1–5.) No new dependencies. No native config.

## Facts established

- `android/src/main/AndroidManifest.xml` is empty (`<manifest/>`) — no permissions. Remote video uses the app's existing network access (Expo apps include `INTERNET`).
- No iOS `Info.plist` additions in the podspec/`ios/`. AVFoundation needs none for `https` remote or local files. (For plaintext `http`, iOS ATS applies — recommend `https`.)
- No `app.plugin.js` / `expo-module.config.json` present, and none is required.

---

### Task 1: Document Expo usage

**Files:** Modify `README.md` (add an "Expo" subsection under Platform notes).

- [ ] **Step 1: Add the Expo note**

Add to `README.md`, after the Platform notes:
```markdown
### Expo

This is a native module (Nitro), so it requires an **Expo dev build** — it does
**not** run in Expo Go. Install it, then create a dev build:

\```sh
npx expo install react-native-nitro-thumbnail react-native-nitro-modules
npx expo prebuild
npx expo run:ios   # or: npx expo run:android
\```

No config plugin is needed: the library adds no permissions or `Info.plist`
entries. For remote `http` (not `https`) videos on iOS you may need an ATS
exception in your app config.
```

- [ ] **Step 2: Verify + commit**

Run: `yarn lint` (markdown is not linted, but confirms the JS gate is unaffected).
```bash
git add README.md
git commit -m "docs(expo): document dev-build requirement (no config plugin needed)"
```

---

## Self-Review

**1. Spec coverage (M6):** "Expo support — documented clearly; the plugin wires any required iOS/Android config." → No config is required for this module; documented the dev-build requirement + the (absent) config-plugin rationale. ✅
**2. Placeholder scan:** None.
**3. Consistency:** No code changes; nothing to cross-check.

## Notes for the next plans

- **Plan 7 (M7, hardening):** prefer iOS async `image(at:)` (iOS 16+) with `copyCGImage` fallback for 13–15; revisit edge cases (zero-duration, timeStamp past end, huge frames).
- **Plan 8 (M8, publish):** finalize `package.json` metadata, `npm publish` dry-run, release workflow.
