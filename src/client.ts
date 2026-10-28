import type { Backend } from './Backend';
import { createDefaultWorker } from './defaultWorker';
import { ModelKind } from './ModelKind';
import type { CutRequest, CutResponse, WorkerConfig } from './protocol';
import type { MaskBuffer } from './types';

export interface BackgroundRemoverOptions {
  modelUrl: string;
  runtimeBaseUrl: string;
  model?: ModelKind;
  preferWebGpu?: boolean;
  createWorker?: () => Worker;
}

export interface CutResult {
  png: Blob;
  mask: MaskBuffer;
  image: Uint8ClampedArray<ArrayBuffer>;
  backend: Backend;
  elapsedMs: number;
}

export interface BackgroundRemover {
  removeBackground(image: Blob | ImageBitmap): Promise<CutResult>;
  dispose(): void;
}

interface Pending {
  resolve: (result: CutResult) => void;
  reject: (error: Error) => void;
}

function absolute(url: string): string {
  return new URL(url, globalThis.location?.href).href;
}

function settle(pending: Map<number, Pending>, response: CutResponse): void {
  const waiter = pending.get(response.id);
  pending.delete(response.id);
  if (waiter === undefined) {
    return;
  }
  if (!response.ok) {
    waiter.reject(new Error(response.error));
    return;
  }
  const mask = { data: response.mask, width: response.width, height: response.height };
  waiter.resolve({ png: response.png, mask, image: response.image, backend: response.backend, elapsedMs: response.elapsedMs });
}

/** Starts a worker that cuts the background out of photos on this device; the model loads on the first cut. */
export function createBackgroundRemover(options: BackgroundRemoverOptions): BackgroundRemover {
  const config: WorkerConfig = {
    modelUrl: absolute(options.modelUrl),
    runtimeBaseUrl: absolute(options.runtimeBaseUrl),
    model: options.model ?? ModelKind.Modnet,
    preferWebGpu: options.preferWebGpu ?? true,
  };
  const worker = (options.createWorker ?? createDefaultWorker)();
  const pending = new Map<number, Pending>();
  let nextId = 0;
  worker.onmessage = (event: MessageEvent<CutResponse>): void => settle(pending, event.data);
  return {
    removeBackground(image: Blob | ImageBitmap): Promise<CutResult> {
      nextId += 1;
      const request: CutRequest = { id: nextId, config, image };
      return new Promise<CutResult>((resolve, reject) => {
        pending.set(request.id, { resolve, reject });
        worker.postMessage(request, image instanceof Blob ? [] : [image]);
      });
    },
    dispose(): void {
      worker.terminate();
      pending.forEach((waiter) => waiter.reject(new Error('background remover disposed')));
      pending.clear();
    },
  };
}
