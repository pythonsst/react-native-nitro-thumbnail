import { ThumbnailError } from './errors';
import type { CreateThumbnailOptions, Thumbnail } from './types';

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
    return await extractFrame(
      src,
      timeStamp,
      maxWidth,
      maxHeight,
      mime,
      quality
    );
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
              reject(
                new ThumbnailError('WRITE_FAILED', 'canvas.toBlob failed')
              );
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
