import type { HybridObject } from 'react-native-nitro-modules';

export interface NativeThumbnailOptions {
  url: string;
  timeStamp: number;
  format: string; // 'jpeg' | 'png' — validated in TS before crossing
  maxWidth: number;
  maxHeight: number;
  dirSize: number;
  cacheName?: string;
  headers?: Record<string, string>;
  timeToleranceMs: number;
  onlySyncedFrames: boolean;
  quality: number;
}

export interface NativeThumbnailResult {
  path: string;
  size: number;
  mime: string;
  width: number;
  height: number;
}

export interface Thumbnail
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  create(options: NativeThumbnailOptions): Promise<NativeThumbnailResult>;
}
