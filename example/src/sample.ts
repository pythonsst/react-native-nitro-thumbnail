import { Image } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';

// Bundled test clip: a ~7s 2K (2048x872) excerpt of Sintel (CC-BY, Blender
// Foundation). Metro serves it over http in dev and bundles it in release.
export const SAMPLE = require('../assets/sample.mp4');

// A public remote video to demo streaming-thumbnail extraction (no download step).
export const REMOTE_SAMPLE = 'https://media.w3.org/2010/05/sintel/trailer.mp4';

// A public still image standing in for "a thumbnail your server already returns".
export const SERVER_THUMBNAIL = 'https://picsum.photos/id/1043/640/360';

// A deliberately broken URL to show graceful failure (no crash).
export const BAD_VIDEO = 'https://example.invalid/missing-video.mp4';

/**
 * createThumbnail needs a real on-device path for the bundled asset, so resolve
 * it to a `file://` URL first (download from Metro in dev, copy from the bundle
 * in release).
 */
export async function resolveBundledSampleToFile(): Promise<string> {
  const dest = `${RNFS.CachesDirectoryPath}/sample.mp4`;
  const src = Image.resolveAssetSource(SAMPLE);
  if (src?.uri?.startsWith('http')) {
    await RNFS.downloadFile({ fromUrl: src.uri, toFile: dest }).promise;
  } else if (src?.uri) {
    const from = src.uri.replace(/^file:\/\//, '');
    if (from !== dest) {
      if (await RNFS.exists(dest)) await RNFS.unlink(dest);
      await RNFS.copyFile(from, dest);
    }
  }
  return `file://${dest}`;
}
