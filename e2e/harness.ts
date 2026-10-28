import { BrushMode, attachRefineBrush, createBackgroundRemover, maskIoU } from '../src/index';
import type { CutResult } from '../src/index';

const FIXTURES = ['fingertips', 'couple-full', 'jimmy1', 'jimmy2', 'jimmy'];
const RGBA_STRIDE = 4;
const ERASE_RADIUS = 12;
const HALF = 2;

export interface CaseReport {
  name: string;
  iou: number;
  elapsedMs: number;
  backend: string;
  pngBytes: number;
}

export interface HarnessReport {
  cases: CaseReport[];
  refineErased: boolean;
}

async function loadMask(name: string): Promise<Uint8ClampedArray> {
  const bitmap = await createImageBitmap(await (await fetch(`/fixtures/${name}.mask.png`)).blob());
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2d context unavailable');
  }
  context.drawImage(bitmap, 0, 0);
  const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  return Uint8ClampedArray.from({ length: bitmap.width * bitmap.height }, (_, pixel) => rgba[pixel * RGBA_STRIDE] ?? 0);
}

function eraseAtCentre(result: CutResult): boolean {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const detach = attachRefineBrush(canvas, { mask: result.mask, image: result.image, getMode: () => BrushMode.Erase, getRadius: () => ERASE_RADIUS });
  const rect = canvas.getBoundingClientRect();
  const init = { clientX: rect.left + rect.width / HALF, clientY: rect.top + rect.height / HALF, pointerId: 1, bubbles: true };
  canvas.dispatchEvent(new PointerEvent('pointerdown', init));
  canvas.dispatchEvent(new PointerEvent('pointerup', init));
  detach();
  const centre = Math.floor(result.mask.height / HALF) * result.mask.width + Math.floor(result.mask.width / HALF);
  return result.mask.data[centre] === 0;
}

async function runHarness(): Promise<HarnessReport> {
  const remover = createBackgroundRemover({
    modelUrl: '/models/modnet.onnx',
    runtimeBaseUrl: '/ort/',
    createWorker: () => new Worker('/worker.js', { type: 'module' }),
  });
  const cases: CaseReport[] = [];
  let last: CutResult | undefined;
  for (const name of FIXTURES) {
    const photo = await (await fetch(`/fixtures/${name}.jpg`)).blob();
    last = await remover.removeBackground(photo);
    const iou = maskIoU(last.mask.data, await loadMask(name));
    cases.push({ name, iou, elapsedMs: last.elapsedMs, backend: last.backend, pngBytes: last.png.size });
  }
  remover.dispose();
  return { cases, refineErased: last !== undefined && eraseAtCentre(last) };
}

(window as unknown as { runHarness: typeof runHarness }).runHarness = runHarness;
