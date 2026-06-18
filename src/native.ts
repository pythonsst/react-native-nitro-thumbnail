import { NitroModules } from 'react-native-nitro-modules';
import type { Thumbnail } from './specs/Thumbnail.nitro';

let cached: Thumbnail | undefined;
export function getThumbnailNative(): Thumbnail {
  if (!cached) cached = NitroModules.createHybridObject<Thumbnail>('Thumbnail');
  return cached;
}
