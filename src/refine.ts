import { BrushMode } from './BrushMode';
import type { MaskBuffer, Point, Rect, Size } from './types';

export interface Brush {
  radius: number;
  mode: BrushMode;
}

const KEEP_VALUE = 255;
const ERASE_VALUE = 0;
const MIN_STEP = 1;
const STEP_FRACTION = 0.5;

/** Paints one round dab of keep (255) or erase (0) into the mask. */
export function paintDab(mask: MaskBuffer, center: Point, radius: number, mode: BrushMode): void {
  const value = mode === BrushMode.Keep ? KEEP_VALUE : ERASE_VALUE;
  const radiusSquared = radius * radius;
  const minX = Math.max(0, Math.floor(center.x - radius));
  const maxX = Math.min(mask.width - 1, Math.ceil(center.x + radius));
  const minY = Math.max(0, Math.floor(center.y - radius));
  const maxY = Math.min(mask.height - 1, Math.ceil(center.y + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - center.x;
      const dy = y - center.y;
      if (dx * dx + dy * dy <= radiusSquared) {
        mask.data[y * mask.width + x] = value;
      }
    }
  }
}

/** Paints dabs along a drag from one point to the next so fast strokes leave no gaps. */
export function paintStroke(mask: MaskBuffer, from: Point, to: Point, brush: Brush): void {
  const { radius, mode } = brush;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const step = Math.max(MIN_STEP, radius * STEP_FRACTION);
  const steps = Math.max(1, Math.ceil(distance / step));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    paintDab(mask, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, radius, mode);
  }
}

/** Maps a client (CSS pixel) point on a scaled canvas to mask pixel coordinates. */
export function toMaskPoint(client: Point, rect: Rect, mask: Size): Point {
  return {
    x: ((client.x - rect.left) * mask.width) / rect.width,
    y: ((client.y - rect.top) * mask.height) / rect.height,
  };
}
