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

const isCode = (s: string): s is ThumbnailErrorCode =>
  (THUMBNAIL_ERROR_CODES as string[]).includes(s);

export function toThumbnailError(e: unknown): ThumbnailError {
  if (e instanceof ThumbnailError) return e;
  const anyE = e as { code?: unknown; message?: unknown };
  let message = typeof anyE?.message === 'string' ? anyE.message : String(e);

  // Prefer an explicit `code` property when present (e.g. a bridge that
  // surfaces it, or a JS-side rejection).
  let code: ThumbnailErrorCode | undefined =
    typeof anyE?.code === 'string' && isCode(anyE.code) ? anyE.code : undefined;

  // Native (Nitro) only surfaces the error *message* string to JS, so the
  // Swift/Kotlin side encodes the code as a leading `[CODE] message` prefix
  // (optionally behind a `funcName: ` wrapper). Parse and strip it.
  if (!code) {
    const m = message.match(/^(?:[\w.]+:\s*)?\[([A-Z_]+)\]\s*([\s\S]*)$/);
    const matched = m?.[1];
    if (matched && isCode(matched)) {
      code = matched;
      message = m?.[2] ?? message;
    }
  }

  return new ThumbnailError(code ?? 'UNKNOWN', message);
}
