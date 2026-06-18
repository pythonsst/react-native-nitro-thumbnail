import { THUMBNAIL_ERROR_CODES, type ThumbnailErrorCode } from './types';

export class ThumbnailError extends Error {
  code: ThumbnailErrorCode;
  constructor(code: ThumbnailErrorCode, message: string) {
    super(message);
    this.name = 'ThumbnailError';
    this.code = code;
    Object.setPrototypeOf(this, ThumbnailError.prototype);
  }
}

export function toThumbnailError(e: unknown): ThumbnailError {
  if (e instanceof ThumbnailError) return e;
  const anyE = e as { code?: unknown; message?: unknown };
  const code =
    typeof anyE?.code === 'string' &&
    (THUMBNAIL_ERROR_CODES as string[]).includes(anyE.code)
      ? (anyE.code as ThumbnailErrorCode)
      : 'UNKNOWN';
  const message = typeof anyE?.message === 'string' ? anyE.message : String(e);
  return new ThumbnailError(code, message);
}
