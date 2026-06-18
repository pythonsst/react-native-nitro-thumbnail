const mockCreate = jest.fn();
jest.mock('../src/native', () => ({
  getThumbnailNative: () => ({ create: mockCreate }),
}));

import CreateThumbnail, { createThumbnail } from '../src/index';

const OK = {
  path: 'file:///t.jpg',
  size: 10,
  mime: 'image/jpeg',
  width: 1,
  height: 1,
};
beforeEach(() => {
  mockCreate.mockReset();
  mockCreate.mockResolvedValue(OK);
});

test('applies defaults and forwards normalized options to native', async () => {
  await createThumbnail({ url: 'file:///v.mp4' });
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      url: 'file:///v.mp4',
      timeStamp: 0,
      format: 'jpeg',
      maxWidth: 512,
      maxHeight: 512,
      dirSize: 100,
      timeToleranceMs: 2000,
      onlySyncedFrames: true,
      quality: 0.9,
    })
  );
});

test('rejects empty url with INVALID_URL (native not called)', async () => {
  await expect(createThumbnail({ url: '' })).rejects.toMatchObject({
    name: 'ThumbnailError',
    code: 'INVALID_URL',
  });
  expect(mockCreate).not.toHaveBeenCalled();
});

test('rejects unsupported format with UNSUPPORTED_FORMAT', async () => {
  await expect(
    createThumbnail({ url: 'file:///v.mp4', format: 'webp' as any })
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' });
  expect(mockCreate).not.toHaveBeenCalled();
});

test('clamps quality into 0..1', async () => {
  await createThumbnail({ url: 'file:///v.mp4', quality: 5 });
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ quality: 1 })
  );
});

test('maps a native error code to ThumbnailError', async () => {
  mockCreate.mockRejectedValue({ code: 'DECODE_FAILED', message: 'bad frame' });
  await expect(createThumbnail({ url: 'file:///v.mp4' })).rejects.toMatchObject(
    { code: 'DECODE_FAILED', message: 'bad frame' }
  );
});

test('returns the native result unchanged', async () => {
  await expect(createThumbnail({ url: 'file:///v.mp4' })).resolves.toEqual(OK);
});

test('forwards http(s) url and headers to native unchanged', async () => {
  const headers = { 'Authorization': 'Bearer x', 'X-Test': '1' };
  await createThumbnail({ url: 'https://host/v.mp4', headers });
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://host/v.mp4', headers })
  );
});

test('is drop-in: works via both named and default import', async () => {
  expect(typeof createThumbnail).toBe('function');
  expect(CreateThumbnail.createThumbnail).toBe(createThumbnail);
  await expect(
    CreateThumbnail.createThumbnail({ url: 'file:///v.mp4' })
  ).resolves.toEqual(OK);
});
