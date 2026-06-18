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
    .mockImplementation(
      (tag: string) =>
        (tag === 'video' ? new FakeVideo() : new FakeCanvas()) as any
    );
  (URL as any).createObjectURL = jest.fn(() => 'blob:fake');
  (URL as any).revokeObjectURL = jest.fn();
  (globalThis as any).fetch = jest.fn();
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
  (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('network'));
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
