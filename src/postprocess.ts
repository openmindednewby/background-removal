import { ModelKind } from './ModelKind';
import type { Size } from './types';

const BYTE_MAX = 255;
const RGBA_STRIDE = 4;
const ALPHA_OFFSET = 3;
const HALF_PIXEL = 0.5;

/** Maps the raw model output to a 0..1 matte (MODNet clamps, U2-Netp rescales min..max). */
export function normalizeMatte(kind: ModelKind, raw: Float32Array): Float32Array {
  if (kind === ModelKind.Modnet) {
    return raw.map((value) => Math.min(1, Math.max(0, value)));
  }
  let min = Infinity;
  let max = -Infinity;
  raw.forEach((value) => {
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  const range = max - min;
  return raw.map((value) => (range > 0 ? (value - min) / range : 0));
}

function sourceCoordinate(target: number, scale: number, limit: number): number {
  return Math.min(limit - 1, Math.max(0, (target + HALF_PIXEL) * scale - HALF_PIXEL));
}

function lerp(from: number, to: number, weight: number): number {
  return from + (to - from) * weight;
}

function sampleBilinear(matte: Float32Array, from: Size, point: { x: number; y: number }): number {
  const x0 = Math.floor(point.x);
  const y0 = Math.floor(point.y);
  const x1 = Math.min(x0 + 1, from.width - 1);
  const y1 = Math.min(y0 + 1, from.height - 1);
  const at = (x: number, y: number): number => matte[y * from.width + x] ?? 0;
  const top = lerp(at(x0, y0), at(x1, y0), point.x - x0);
  const bottom = lerp(at(x0, y1), at(x1, y1), point.x - x0);
  return lerp(top, bottom, point.y - y0);
}

/** Bilinear-resizes a 0..1 matte to the photo size as one alpha byte per pixel. */
export function resizeMatte(matte: Float32Array, from: Size, to: Size): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(to.width * to.height);
  const scaleX = from.width / to.width;
  const scaleY = from.height / to.height;
  for (let y = 0; y < to.height; y += 1) {
    const sourceY = sourceCoordinate(y, scaleY, from.height);
    for (let x = 0; x < to.width; x += 1) {
      const sourceX = sourceCoordinate(x, scaleX, from.width);
      alpha[y * to.width + x] = Math.round(sampleBilinear(matte, from, { x: sourceX, y: sourceY }) * BYTE_MAX);
    }
  }
  return alpha;
}

/** Copies the RGBA pixels with their alpha channel replaced by the mask. */
export function applyAlpha(rgba: Uint8ClampedArray, alpha: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  if (rgba.length !== alpha.length * RGBA_STRIDE) {
    throw new RangeError('alpha length does not match the pixel count');
  }
  const out = new Uint8ClampedArray(rgba);
  alpha.forEach((value, pixel) => {
    out[pixel * RGBA_STRIDE + ALPHA_OFFSET] = value;
  });
  return out;
}
