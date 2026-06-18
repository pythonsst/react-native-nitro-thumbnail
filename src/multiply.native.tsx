import { NitroModules } from 'react-native-nitro-modules';
import type { NitroThumbnail } from './NitroThumbnail.nitro';

const NitroThumbnailHybridObject =
  NitroModules.createHybridObject<NitroThumbnail>('NitroThumbnail');

export function multiply(a: number, b: number): number {
  return NitroThumbnailHybridObject.multiply(a, b);
}
