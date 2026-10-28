import { ModelKind } from './ModelKind';
import type { Size } from './types';

const MODNET_REFERENCE_SIDE = 512;
const MODNET_STRIDE = 32;
const U2NETP_SIDE = 320;
const RGB_CHANNELS = 3;
const RGBA_STRIDE = 4;
const BYTE_MAX = 255;
const MODNET_CENTER = 0.5;
const IMAGENET_MEAN: readonly number[] = [0.485, 0.456, 0.406];
const IMAGENET_STD: readonly number[] = [0.229, 0.224, 0.225];

function snapToStride(value: number): number {
  return Math.max(MODNET_STRIDE, Math.floor(Math.floor(value) / MODNET_STRIDE) * MODNET_STRIDE);
}

/** Size the photo is resized to before it enters the model. */
export function modelInputSize(kind: ModelKind, source: Size): Size {
  if (kind === ModelKind.U2netp) {
    return { width: U2NETP_SIDE, height: U2NETP_SIDE };
  }
  const shortSide = Math.min(source.width, source.height);
  const longSide = Math.max(source.width, source.height);
  const needsScale = longSide > MODNET_REFERENCE_SIDE || shortSide < MODNET_REFERENCE_SIDE;
  const ratio = needsScale ? MODNET_REFERENCE_SIDE / shortSide : 1;
  return { width: snapToStride(source.width * ratio), height: snapToStride(source.height * ratio) };
}

function brightestChannel(rgba: Uint8ClampedArray): number {
  let max = 0;
  for (let index = 0; index < rgba.length; index += 1) {
    if (index % RGBA_STRIDE !== RGB_CHANNELS) {
      max = Math.max(max, rgba[index] ?? 0);
    }
  }
  return max > 0 ? max : 1;
}

function normalizeChannel(kind: ModelKind, value: number, channel: number): number {
  if (kind === ModelKind.U2netp) {
    return (value - (IMAGENET_MEAN[channel] ?? 0)) / (IMAGENET_STD[channel] ?? 1);
  }
  return (value - MODNET_CENTER) / MODNET_CENTER;
}

/** Turns model-sized RGBA pixels into the normalised CHW float tensor the model expects. */
export function toInputTensor(kind: ModelKind, rgba: Uint8ClampedArray, size: Size): Float32Array {
  const plane = size.width * size.height;
  if (rgba.length !== plane * RGBA_STRIDE) {
    throw new RangeError('rgba length does not match the size');
  }
  const scale = kind === ModelKind.U2netp ? brightestChannel(rgba) : BYTE_MAX;
  const tensor = new Float32Array(plane * RGB_CHANNELS);
  for (let pixel = 0; pixel < plane; pixel += 1) {
    for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
      const value = (rgba[pixel * RGBA_STRIDE + channel] ?? 0) / scale;
      tensor[channel * plane + pixel] = normalizeChannel(kind, value, channel);
    }
  }
  return tensor;
}
