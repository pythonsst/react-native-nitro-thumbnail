import { createThumbnail } from '../src/index.web';

test('web stub rejects with a clear not-implemented ThumbnailError', async () => {
  await expect(
    createThumbnail({ url: 'http://x/v.mp4' })
  ).rejects.toMatchObject({
    name: 'ThumbnailError',
    code: 'UNKNOWN',
  });
});
