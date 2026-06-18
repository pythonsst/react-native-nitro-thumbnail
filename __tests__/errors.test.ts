import { ThumbnailError, toThumbnailError } from '../src/errors';

test('ThumbnailError carries code and name', () => {
  const err = new ThumbnailError('DECODE_FAILED', 'could not decode');
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe('ThumbnailError');
  expect(err.code).toBe('DECODE_FAILED');
  expect(err.message).toBe('could not decode');
});

test('toThumbnailError maps a known native code', () => {
  const err = toThumbnailError({ code: 'WRITE_FAILED', message: 'disk full' });
  expect(err.code).toBe('WRITE_FAILED');
  expect(err.message).toBe('disk full');
});

test('toThumbnailError defaults unknown shapes to UNKNOWN', () => {
  const err = toThumbnailError(new Error('boom'));
  expect(err.code).toBe('UNKNOWN');
  expect(err.message).toBe('boom');
});

test('toThumbnailError passes through an existing ThumbnailError', () => {
  const original = new ThumbnailError('INVALID_URL', 'bad url');
  expect(toThumbnailError(original)).toBe(original);
});
