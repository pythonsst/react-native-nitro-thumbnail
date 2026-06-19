export * from './types';
export { ThumbnailError } from './errors';
export { createThumbnail } from './createThumbnail';
export { VideoThumbnail } from './VideoThumbnail';
export type { VideoThumbnailProps } from './VideoThumbnail';

import { createThumbnail } from './createThumbnail';

// Default export for drop-in compatibility with `react-native-create-thumbnail`,
// which exposes both a named `createThumbnail` and a default object.
export default { createThumbnail };
