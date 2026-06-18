# Web Implementation Plan (Plan 5 — M5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web stub with a real `createThumbnail()` that extracts a video frame in the browser via `<video>` + `<canvas>`, returning an object-URL thumbnail — matching the same public API/result shape and `ThumbnailError` model.

**Architecture:** `src/index.web.ts` (picked by Metro/bundlers for web) validates options like the native `src/index.ts`, optionally `fetch`es the video with `headers` into a blob object-URL (so custom headers work under CORS), loads it into a `<video>`, seeks to `timeStamp`, draws the current frame onto a `<canvas>` fitted within `maxWidth × maxHeight`, and `canvas.toBlob(mime, quality)` → object URL as `path`. Verified with Jest + jsdom and mocked `<video>`/`<canvas>`/`fetch` (the spec's stated web test strategy).

**Tech Stack:** TypeScript, DOM (`HTMLVideoElement`/`HTMLCanvasElement`/`fetch`/`URL.createObjectURL`), Jest + jest-environment-jsdom.

**Scope (M5):** real web `createThumbnail`. `cacheName`/`dirSize` are best-effort **no-ops** on web (object-URL/in-memory only — no persistent disk cache); document it. Expo (M6), hardening/docs (M7–M8) later.

## Global Constraints

(Same as Plans 1–4.)
- Public API + drop-in defaults from Plan 1: `timeStamp=0`, `format='jpeg'`, `maxWidth=512`, `maxHeight=512`, `quality=0.9` (clamped 0..1). Result `{path,size,mime,width,height}`.
- Errors: `ThumbnailError` with codes `INVALID_URL`, `REMOTE_FETCH_FAILED`, `DECODE_FAILED`, `UNSUPPORTED_FORMAT`, `WRITE_FAILED`, `UNKNOWN`.
- Web limitations to document: subject to CORS; no persistent disk cache (`cacheName`/`dirSize` are no-ops); `path` is an object URL (caller should `URL.revokeObjectURL` when done).

## Facts established (do not re-derive)

- `src/index.web.ts` currently: validates nothing, just `throw new ThumbnailError('UNKNOWN', 'not yet implemented on web ...')`. `__tests__/web.test.ts` asserts that stub. Both will be replaced.
- `src/errors.ts` exports `ThumbnailError`. `src/types.ts` exports `CreateThumbnailOptions`, `Thumbnail`.
- `jest.config.js`: `testEnvironment: 'node'`, `testMatch: ['**/__tests__/**/*.test.(ts|tsx)']`. Per-file `@jest-environment jsdom` docblock overrides the env for the web test (needs `jest-environment-jsdom`, not yet installed).
- Native `src/index.ts` validation pattern (mirror it): empty url → `INVALID_URL`; format ∉ {jpeg,png} → `UNSUPPORTED_FORMAT`; clamp quality.

---

## File Structure

- `src/index.web.ts` — **replace**: real web `createThumbnail` + a pure `fitSize` helper.
- `__tests__/web.test.ts` — **replace**: jsdom + mocked `<video>`/`<canvas>`/`fetch` tests.
- `package.json` — **modify**: add `jest-environment-jsdom` devDep.
- `README.md` — **modify** (Step in Task 3): document web limitations (or add if missing).

---

### Task 1: jsdom test env + pure `fitSize` (TDD)

**Files:**
- Modify: `package.json` (devDep)
- Create (temporarily exercised): pure `fitSize` lives in `src/index.web.ts` (Task 2). This task adds the env + a failing test scaffold.

**Interfaces:**
- Produces: `jest-environment-jsdom` available; `__tests__/web.test.ts` runs under jsdom.

- [ ] **Step 1: Add jest-environment-jsdom**

Run:
```bash
cd /Users/shiv/react-native-nitro-thumbnail
yarn add -D jest-environment-jsdom@^29.7.0
```
Expected: resolves to a 29.x version matching jest 29.7.

- [ ] **Step 2: Confirm it resolves**

Run: `node -e "require.resolve('jest-environment-jsdom'); console.log('ok')"`
Expected: `ok`.

(No commit yet — committed with Task 2.)

---

### Task 2: Real web `createThumbnail` (TDD)

**Files:**
- Replace: `src/index.web.ts`
- Replace: `__tests__/web.test.ts`

**Interfaces:**
- Produces: `createThumbnail(options): Promise<Thumbnail>` (web). Re-exports types + `ThumbnailError`. Internal pure `fitSize(naturalW, naturalH, maxW, maxH): { width, height }` (aspect-fit, never upscale).

- [ ] **Step 1: Write the failing tests**

Replace `__tests__/web.test.ts` with (jsdom + mocks):
```ts
/**
 * @jest-environment jsdom
 */
import { createThumbnail } from '../src/index.web';

// --- Mocks for the DOM bits jsdom does not implement -------------------------
const FRAME = { videoWidth: 1280, videoHeight: 720, duration: 10 };

class FakeVideo {
  preload = '';
  muted = false;
  crossOrigin: string | null = null;
  currentTime = 0;
  videoWidth = FRAME.videoWidth;
  videoHeight = FRAME.videoHeight;
  duration = FRAME.duration;
  onloadedmetadata: (() => void) | null = null;
  onseeked: (() => void) | null = null;
  onerror: (() => void) | null = null;
  removeAttribute() {}
  load() {}
  set src(_v: string) {
    // simulate async metadata load -> seek -> seeked
    setTimeout(() => {
      this.onloadedmetadata?.();
      setTimeout(() => this.onseeked?.(), 0);
    }, 0);
  }
}

class FakeCanvas {
  width = 0;
  height = 0;
  getContext() {
    return { drawImage() {} };
  }
  toBlob(cb: (b: Blob | null) => void, type: string) {
    cb(new Blob(['x'.repeat(123)], { type }));
  }
}

beforeEach(() => {
  jest
    .spyOn(document, 'createElement')
    .mockImplementation((tag: string) =>
      (tag === 'video' ? new FakeVideo() : new FakeCanvas()) as any
    );
  (URL as any).createObjectURL = jest.fn(() => 'blob:fake');
  (URL as any).revokeObjectURL = jest.fn();
  (global as any).fetch = jest.fn();
});
afterEach(() => jest.restoreAllMocks());

test('extracts a frame and returns a fitted jpeg object URL', async () => {
  const r = await createThumbnail({ url: 'https://x/v.mp4', timeStamp: 1000 });
  expect(r.path).toBe('blob:fake');
  expect(r.mime).toBe('image/jpeg');
  expect(r.width).toBe(512); // 1280x720 fit to 512 box
  expect(r.height).toBe(288);
  expect(r.size).toBe(123);
});

test('rejects empty url with INVALID_URL', async () => {
  await expect(createThumbnail({ url: '' })).rejects.toMatchObject({
    name: 'ThumbnailError',
    code: 'INVALID_URL',
  });
});

test('rejects unsupported format', async () => {
  await expect(
    createThumbnail({ url: 'https://x/v.mp4', format: 'webp' as any })
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' });
});

test('with headers, fetches the video and maps fetch failure to REMOTE_FETCH_FAILED', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('network'));
  await expect(
    createThumbnail({ url: 'https://x/v.mp4', headers: { A: 'b' } })
  ).rejects.toMatchObject({ code: 'REMOTE_FETCH_FAILED' });
});

test('maps a video load error to DECODE_FAILED', async () => {
  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'video') {
      const v: any = new FakeVideo();
      Object.defineProperty(v, 'src', {
        set() {
          setTimeout(() => v.onerror?.(), 0);
        },
      });
      return v;
    }
    return new FakeCanvas() as any;
  });
  await expect(
    createThumbnail({ url: 'https://x/v.mp4' })
  ).rejects.toMatchObject({ code: 'DECODE_FAILED' });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn jest web`
Expected: FAIL — current stub rejects everything with `UNKNOWN` (or assertions don't match).

- [ ] **Step 3: Implement the web impl**

Replace `src/index.web.ts` with:
```ts
import { ThumbnailError } from './errors';
import type { CreateThumbnailOptions, Thumbnail } from './types';

export * from './types';
export { ThumbnailError } from './errors';

/** Aspect-fit (naturalW, naturalH) within (maxW, maxH), never upscaling. */
export function fitSize(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number
): { width: number; height: number } {
  if (naturalW <= 0 || naturalH <= 0) {
    return { width: naturalW, height: naturalH };
  }
  const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
  return {
    width: Math.round(naturalW * scale),
    height: Math.round(naturalH * scale),
  };
}

export async function createThumbnail(
  options: CreateThumbnailOptions
): Promise<Thumbnail> {
  if (!options?.url || typeof options.url !== 'string') {
    throw new ThumbnailError('INVALID_URL', 'A non-empty `url` is required');
  }
  const format = options.format ?? 'jpeg';
  if (format !== 'jpeg' && format !== 'png') {
    throw new ThumbnailError(
      'UNSUPPORTED_FORMAT',
      `format must be 'jpeg' or 'png', got '${format}'`
    );
  }
  const maxWidth = options.maxWidth ?? 512;
  const maxHeight = options.maxHeight ?? 512;
  const quality = Math.min(1, Math.max(0, options.quality ?? 0.9));
  const timeStamp = options.timeStamp ?? 0;
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';

  // Custom headers require fetching the bytes ourselves (then a blob URL).
  let src = options.url;
  let fetchedUrl: string | undefined;
  if (options.headers && Object.keys(options.headers).length > 0) {
    let resp: Response;
    try {
      resp = await fetch(options.url, { headers: options.headers });
    } catch (e) {
      throw new ThumbnailError(
        'REMOTE_FETCH_FAILED',
        `Failed to fetch video: ${(e as Error).message}`
      );
    }
    if (!resp.ok) {
      throw new ThumbnailError(
        'REMOTE_FETCH_FAILED',
        `HTTP ${resp.status} fetching video`
      );
    }
    const blob = await resp.blob();
    fetchedUrl = URL.createObjectURL(blob);
    src = fetchedUrl;
  }

  try {
    return await extractFrame(src, timeStamp, maxWidth, maxHeight, mime, quality);
  } finally {
    if (fetchedUrl) URL.revokeObjectURL(fetchedUrl);
  }
}

function extractFrame(
  src: string,
  timeStampMs: number,
  maxWidth: number,
  maxHeight: number,
  mime: string,
  quality: number
): Promise<Thumbnail> {
  return new Promise<Thumbnail>((resolve, reject) => {
    const video = document.createElement('video') as HTMLVideoElement;
    video.preload = 'auto';
    video.muted = true;
    video.crossOrigin = 'anonymous';

    const cleanup = () => {
      try {
        video.removeAttribute('src');
        video.load();
      } catch {
        /* noop */
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new ThumbnailError('DECODE_FAILED', 'Could not load video'));
    };

    video.onloadedmetadata = () => {
      const dur = video.duration || timeStampMs / 1000;
      video.currentTime = Math.min(timeStampMs / 1000, dur);
    };

    video.onseeked = () => {
      try {
        const { width, height } = fitSize(
          video.videoWidth,
          video.videoHeight,
          maxWidth,
          maxHeight
        );
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new ThumbnailError('DECODE_FAILED', 'No 2D canvas context');
        }
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              reject(new ThumbnailError('WRITE_FAILED', 'canvas.toBlob failed'));
              return;
            }
            resolve({
              path: URL.createObjectURL(blob),
              size: blob.size,
              mime,
              width,
              height,
            });
          },
          mime,
          quality
        );
      } catch (e) {
        cleanup();
        reject(
          e instanceof ThumbnailError
            ? e
            : new ThumbnailError('DECODE_FAILED', String(e))
        );
      }
    };

    video.src = src;
    video.load();
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `yarn jest web`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full JS gate**

Run: `yarn lint && yarn typecheck && yarn test --ci`
Expected: all pass (typecheck: the web file uses DOM types — `tsconfig` has `lib: ["ESNext"]`; if `document`/`HTMLVideoElement` are unresolved, add `"DOM"` to `compilerOptions.lib`). If a typecheck error appears for DOM globals, add `"DOM"` to `lib` in `tsconfig.json` and re-run.

- [ ] **Step 6: Commit**

```bash
git add src/index.web.ts __tests__/web.test.ts package.json yarn.lock tsconfig.json
git commit -m "feat(web): real createThumbnail via video+canvas (jsdom-tested)"
```

---

### Task 3: Document web limitations

**Files:** Modify `README.md` (create a short "Web" note if README lacks one).

- [ ] **Step 1: Add a Web limitations note**

Add a short section documenting: web uses `<video>`+`<canvas>`; subject to CORS (use `headers` to fetch cross-origin where allowed); `path` is an object URL the caller should `URL.revokeObjectURL` when done; `cacheName`/`dirSize` are no-ops on web.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: note web platform limitations"
```

---

## Self-Review

**1. Spec coverage (M5):**
- `fetch(url,{headers})`→blob→object URL when headers present; direct URL otherwise → Task 2. ✅
- `<video>` seek to `timeStamp/1000`s, draw to `<canvas>` fit within max box, `toBlob(format,quality)` → object URL `path` → Task 2. ✅
- Document CORS + no-disk-cache + `cacheName`/`dirSize` no-ops → Task 3. ✅
- Same `ThumbnailError` model + validation (INVALID_URL/UNSUPPORTED_FORMAT/REMOTE_FETCH_FAILED/DECODE_FAILED/WRITE_FAILED) → Task 2. ✅
- jsdom + mocked video/canvas tests → Task 2. ✅

**2. Placeholder scan:** None. Task 2 Step 5 has a conditional `lib: ["DOM"]` guard (only knowable when typecheck runs).

**3. Type consistency:** `createThumbnail` returns `Thumbnail` (same shape). `fitSize` signature consistent between impl + use. `ThumbnailError` codes match the shared union. No native types involved (web is standalone).

---

## Notes for the next plans

- **Plan 6 (M6, Expo):** config plugin (if any native config needed) + docs for bare vs Expo Go; Nitro requires a dev build (not Expo Go) — document clearly.
- **Plan 7–8 (M7–M8):** hardening (edge cases, perf), API docs/README, publish workflow.
