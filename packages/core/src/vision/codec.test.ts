import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base64ToBytes, bytesToBase64, cropImage, encodeBmp } from './codec';
import { createImage } from './image';

test('base64 round trip matches Node', () => {
  for (const len of [0, 1, 2, 3, 4, 5, 100]) {
    const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 255);
    const b64 = bytesToBase64(bytes);
    assert.equal(b64, Buffer.from(bytes).toString('base64'));
    assert.deepEqual(base64ToBytes(b64), bytes);
  }
  assert.deepEqual(base64ToBytes('data:image/jpeg;base64,AAEC'), Uint8Array.from([0, 1, 2]));
});

test('BMP header and pixel order', () => {
  const img = createImage(3, 2, [10, 20, 30]);
  const bmp = encodeBmp(img);
  assert.equal(String.fromCharCode(bmp[0]!, bmp[1]!), 'BM');
  assert.equal(bmp.length, 54 + 12 * 2); // rows padded to 4 bytes
  assert.deepEqual([...bmp.subarray(54, 57)], [30, 20, 10]); // BGR
});

test('crop is clamped to the image', () => {
  const c = cropImage(createImage(10, 10), { x: 8, y: -3, w: 5, h: 5 });
  assert.deepEqual([c.width, c.height], [2, 5]);
});
