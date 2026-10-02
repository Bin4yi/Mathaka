import { decode as decodeJpegRaw } from 'jpeg-js';
import type { RGBAImage } from './image';

// Image bytes <-> pixels, with no Node Buffer (React Native has none).

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_INDEX = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64_INDEX[clean.charCodeAt(i)]!;
    const b = B64_INDEX[clean.charCodeAt(i + 1)]!;
    const c = i + 2 < clean.length ? B64_INDEX[clean.charCodeAt(i + 2)]! : 0;
    const d = i + 3 < clean.length ? B64_INDEX[clean.charCodeAt(i + 3)]! : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    s += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    s += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '=';
    s += i + 2 < bytes.length ? B64[n & 63]! : '=';
  }
  return s;
}

export function decodeJpeg(bytes: Uint8Array): RGBAImage {
  const img = decodeJpegRaw(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 256 });
  return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.byteLength) };
}

/** 24-bit BMP. Big but trivial, and readable by Android, browsers and llama.cpp (stb_image). */
export function encodeBmp(img: RGBAImage): Uint8Array {
  const rowSize = Math.ceil((img.width * 3) / 4) * 4;
  const size = 54 + rowSize * img.height;
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  dv.setUint32(2, size, true);
  dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, img.width, true);
  dv.setInt32(22, img.height, true); // bottom-up rows
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true);
  dv.setUint32(34, rowSize * img.height, true);
  for (let y = 0; y < img.height; y++) {
    const row = 54 + (img.height - 1 - y) * rowSize;
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      out[row + x * 3] = img.data[i + 2]!;
      out[row + x * 3 + 1] = img.data[i + 1]!;
      out[row + x * 3 + 2] = img.data[i]!;
    }
  }
  return out;
}

export function bmpDataUri(img: RGBAImage): string {
  return `data:image/bmp;base64,${bytesToBase64(encodeBmp(img))}`;
}

/** Cut a rectangle out of an image (clamped to the image). */
export function cropImage(img: RGBAImage, box: { x: number; y: number; w: number; h: number }): RGBAImage {
  const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y));
  const w = Math.max(1, Math.min(img.width - x0, Math.floor(box.w)));
  const h = Math.max(1, Math.min(img.height - y0, Math.floor(box.h)));
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    data.set(img.data.subarray(((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x0 + w) * 4), y * w * 4);
  }
  return { width: w, height: h, data };
}
