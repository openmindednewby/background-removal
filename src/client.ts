import type { Backend } from './Backend';
import { absoluteUrl } from './assetUrls';
import { ModelKind } from './ModelKind';
import type { CutRequest, CutResponse, DownloadProgress, WorkerConfig, WorkerMessage } from './protocol';
import type { MaskBuffer } from './types';

export interface BackgroundRemoverOptions {
  modelUrl: string;
  runtimeBaseUrl: string;
  model?: ModelKind;
  preferWebGpu?: boolean;
  runtimeWasmUrl?: string;
  downloadBytes?: number;
  createWorker: () => Worker;
}

export interface CutOptions {
  onProgress?: (progress: DownloadProgress) => void;
}

export interface CutResult {
  png: Blob;
  mask: MaskBuffer;
  image: Uint8ClampedArray<ArrayBuffer>;
  backend: Backend;
  elapsedMs: number;
}

export interface BackgroundRemover {
  removeBackground(image: Blob | ImageBitmap, options?: CutOptions): Promise<CutResult>;
  dispose(): void;
}

interface Pending {
  resolve: (result: CutResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: DownloadProgress) => void;
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
    modelUrl: absoluteUrl(options.modelUrl),
    runtimeBaseUrl: absoluteUrl(options.runtimeBaseUrl),
    runtimeWasmUrl: options.runtimeWasmUrl === undefined ? undefined : absoluteUrl(options.runtimeWasmUrl),
    downloadBytes: options.downloadBytes,
    model: options.model ?? ModelKind.Modnet,
    preferWebGpu: options.preferWebGpu ?? true,
  };
  const worker = options.createWorker();
  const pending = new Map<number, Pending>();
  let nextId = 0;
  worker.onmessage = (event: MessageEvent<WorkerMessage>): void => {
    const message = event.data;
    if ('loadedBytes' in message) {
      pending.get(message.id)?.onProgress?.({ loadedBytes: message.loadedBytes, totalBytes: message.totalBytes });
      return;
    }
    settle(pending, message);
  };
  const rejectAll = (reason: string): void => {
    pending.forEach((waiter) => waiter.reject(new Error(reason)));
    pending.clear();
  };
  worker.onerror = (event: ErrorEvent): void => rejectAll(`background remover worker crashed: ${event.message}`);
  worker.onmessageerror = (): void => rejectAll('background remover worker sent an unreadable reply');
  return {
    removeBackground(image: Blob | ImageBitmap, cutOptions: CutOptions = {}): Promise<CutResult> {
      nextId += 1;
      const request: CutRequest = { id: nextId, config, image };
      return new Promise<CutResult>((resolve, reject) => {
        pending.set(request.id, { resolve, reject, onProgress: cutOptions.onProgress });
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
