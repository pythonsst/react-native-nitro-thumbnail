import { getThumbnailNative } from './native';
import { ThumbnailError, toThumbnailError } from './errors';
import type { CreateThumbnailOptions, Thumbnail } from './types';
import type { NativeThumbnailOptions } from './specs/Thumbnail.nitro';

export * from './types';
export { ThumbnailError } from './errors';

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

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
  };

  try {
    return await getThumbnailNative().create(normalized);
  } catch (e) {
    throw toThumbnailError(e);
  }
}
