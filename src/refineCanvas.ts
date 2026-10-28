import type { BrushMode } from './BrushMode';
import { applyAlpha } from './postprocess';
import { paintDab, paintStroke, toMaskPoint } from './refine';
import type { MaskBuffer, Point } from './types';

export interface RefineBrushOptions {
  mask: MaskBuffer;
  image: Uint8ClampedArray;
  getMode: () => BrushMode;
  getRadius: () => number;
  onChange?: (mask: MaskBuffer) => void;
}

function context2d(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (context === null) {
    throw new Error('2d context unavailable');
  }
  return context;
}

/** Lets the user paint keep / erase on a canvas that previews the cut-out; returns a detach function. */
export function attachRefineBrush(canvas: HTMLCanvasElement, options: RefineBrushOptions): () => void {
  const { mask } = options;
  const context = context2d(canvas);
  canvas.width = mask.width;
  canvas.height = mask.height;
  canvas.style.touchAction = 'none';
  const render = (): void => context.putImageData(new ImageData(applyAlpha(options.image, mask.data), mask.width, mask.height), 0, 0);
  const pointAt = (event: PointerEvent): Point => toMaskPoint({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect(), mask);
  let last: Point | undefined;
  const down = (event: PointerEvent): void => {
    canvas.setPointerCapture?.(event.pointerId);
    last = pointAt(event);
    paintDab(mask, last, options.getRadius(), options.getMode());
    render();
  };
  const move = (event: PointerEvent): void => {
    if (last === undefined) {
      return;
    }
    const next = pointAt(event);
    paintStroke(mask, last, next, { radius: options.getRadius(), mode: options.getMode() });
    last = next;
    render();
  };
  const up = (): void => {
    if (last === undefined) {
      return;
    }
    last = undefined;
    options.onChange?.(mask);
  };
  const listeners: Array<[string, (event: PointerEvent) => void]> = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up]];
  listeners.forEach(([name, handler]) => canvas.addEventListener(name, handler as EventListener));
  render();
  return () => listeners.forEach(([name, handler]) => canvas.removeEventListener(name, handler as EventListener));
}

/** Encodes the photo with the (refined) mask as a transparent PNG. */
export function encodeCutout(image: Uint8ClampedArray, mask: MaskBuffer): Promise<Blob> {
  const canvas = new OffscreenCanvas(mask.width, mask.height);
  context2d(canvas).putImageData(new ImageData(applyAlpha(image, mask.data), mask.width, mask.height), 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}
