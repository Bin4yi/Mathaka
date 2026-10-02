// Small image + colour helpers. Pure TS so it runs on phone, web and Node (eval).

export type RGBAImage = { width: number; height: number; data: Uint8ClampedArray };

export function createImage(width: number, height: number, fill?: [number, number, number]): RGBAImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill?.[0] ?? 0;
    data[i * 4 + 1] = fill?.[1] ?? 0;
    data[i * 4 + 2] = fill?.[2] ?? 0;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Bilinear sample (clamped). */
export function sample(img: RGBAImage, x: number, y: number): [number, number, number] {
  const { width: w, height: h, data } = img;
  const fx = Math.min(Math.max(x, 0), w - 1.001);
  const fy = Math.min(Math.max(y, 0), h - 1.001);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const ax = fx - x0;
  const ay = fy - y0;
  const out: [number, number, number] = [0, 0, 0];
  const i00 = (y0 * w + x0) * 4;
  const i10 = i00 + 4;
  const i01 = i00 + w * 4;
  const i11 = i01 + 4;
  for (let c = 0; c < 3; c++) {
    const top = data[i00 + c]! * (1 - ax) + data[i10 + c]! * ax;
    const bot = data[i01 + c]! * (1 - ax) + data[i11 + c]! * ax;
    out[c] = top * (1 - ay) + bot * ay;
  }
  return out;
}

/** Box downscale so the longest side is at most `maxSide`. */
export function downscale(img: RGBAImage, maxSide: number): RGBAImage {
  const scale = Math.max(img.width, img.height) / maxSide;
  if (scale <= 1) return img;
  const w = Math.round(img.width / scale);
  const h = Math.round(img.height / scale);
  const out = createImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx0 = Math.floor(x * scale);
      const sy0 = Math.floor(y * scale);
      const sx1 = Math.min(img.width, Math.floor((x + 1) * scale));
      const sy1 = Math.min(img.height, Math.floor((y + 1) * scale));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = sy0; yy < sy1; yy++) {
        for (let xx = sx0; xx < sx1; xx++) {
          const i = (yy * img.width + xx) * 4;
          r += img.data[i]!;
          g += img.data[i + 1]!;
          b += img.data[i + 2]!;
          n++;
        }
      }
      const o = (y * w + x) * 4;
      out.data[o] = r / n;
      out.data[o + 1] = g / n;
      out.data[o + 2] = b / n;
    }
  }
  return out;
}

// ---- CIE Lab (D65) ----

const LIN = Float64Array.from({ length: 256 }, (_, c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
});
/** sRGB channel (0-255, may be fractional) to linear light; table lookup for speed on phones. */
function lin(c: number): number {
  const i = Math.max(0, Math.min(255, Math.round(c)));
  return LIN[i]!;
}
function f(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
}

export type Lab = [number, number, number];

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 colour difference (simple, good enough for naming pill colours). */
export function deltaE(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
