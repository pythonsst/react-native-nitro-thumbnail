export interface CreateThumbnailOptions {
  url: string;
  timeStamp?: number;
  format?: 'jpeg' | 'png';
  maxWidth?: number;
  maxHeight?: number;
  dirSize?: number;
  cacheName?: string;
  headers?: Record<string, string>;
  timeToleranceMs?: number;
  onlySyncedFrames?: boolean;
  quality?: number;
}

export interface Thumbnail {
  path: string;
  size: number;
  mime: string;
  width: number;
  height: number;
}

export type ThumbnailErrorCode =
  | 'INVALID_URL'
  | 'FILE_NOT_FOUND'
  | 'REMOTE_FETCH_FAILED'
  | 'DECODE_FAILED'
  | 'UNSUPPORTED_FORMAT'
  | 'WRITE_FAILED'
  | 'UNKNOWN';

export const THUMBNAIL_ERROR_CODES: ThumbnailErrorCode[] = [
  'INVALID_URL',
  'FILE_NOT_FOUND',
  'REMOTE_FETCH_FAILED',
  'DECODE_FAILED',
  'UNSUPPORTED_FORMAT',
  'WRITE_FAILED',
  'UNKNOWN',
];
