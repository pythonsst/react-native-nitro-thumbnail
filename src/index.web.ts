import { ThumbnailError } from './errors';
import type { CreateThumbnailOptions, Thumbnail } from './types';

export * from './types';
export { ThumbnailError } from './errors';

export async function createThumbnail(
  _options: CreateThumbnailOptions
): Promise<Thumbnail> {
  throw new ThumbnailError(
    'UNKNOWN',
    'createThumbnail is not yet implemented on web (coming in a later release)'
  );
}
