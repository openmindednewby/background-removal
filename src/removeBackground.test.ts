import { Backend } from './Backend';
import { isBackgroundRemovalDownloaded, removeBackground } from './removeBackground';
import type { CutRequest, WorkerMessage } from './protocol';

jest.mock('./buildInfo', () => ({
  buildInfo: () => ({ packageVersion: '1.0.0', runtimeVersion: '2.0.0', downloadBytes: 100 }),
}));

const BASE = 'https://host.test/cut/';
const MODEL_URL = 'https://host.test/cut/1.0.0/modnet.onnx';
const WASM_URL = 'https://host.test/cut/ort/2.0.0/ort-wasm-simd-threaded.jsep.wasm';

class FakeWorker {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  posted: CutRequest[] = [];
  terminate = jest.fn();

  postMessage(request: CutRequest): void {
    this.posted.push(request);
  }

  reply(message: WorkerMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerMessage>);
  }
}

function succeed(worker: FakeWorker, png: Blob): void {
  worker.reply({ id: 1, ok: true, png, mask: new Uint8ClampedArray(1), image: new Uint8ClampedArray(4), width: 1, height: 1, backend: Backend.Wasm, elapsedMs: 1 });
}

function cachedUrls(urls: string[]): void {
  Object.assign(globalThis, { caches: { open: () => Promise.resolve({ match: (url: string) => Promise.resolve(urls.includes(url) ? new Response('x') : undefined) }) } });
}

afterEach(() => {
  delete (globalThis as { caches?: unknown }).caches;
});

describe('removeBackground', () => {
  it('with an asset base URL, asks the worker for the versioned assets and the first-download size', async () => {
    const worker = new FakeWorker();
    const pending = removeBackground(new Blob(), { assetBaseUrl: BASE, createWorker: () => worker as unknown as Worker });

    succeed(worker, new Blob(['cut']));
    await pending;

    expect(worker.posted[0]?.config).toMatchObject({ modelUrl: MODEL_URL, runtimeWasmUrl: WASM_URL, downloadBytes: 100 });
  });

  it('when the worker answers, returns the cut-out and stops the worker', async () => {
    const worker = new FakeWorker();
    const png = new Blob(['cut']);
    const pending = removeBackground(new Blob(), { assetBaseUrl: BASE, createWorker: () => worker as unknown as Worker });

    succeed(worker, png);
    const result = await pending;

    expect(result).toBe(png);
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('while the assets download, forwards each progress message', async () => {
    const worker = new FakeWorker();
    const onProgress = jest.fn();
    const pending = removeBackground(new Blob(), { assetBaseUrl: BASE, onProgress, createWorker: () => worker as unknown as Worker });

    worker.reply({ id: 1, loadedBytes: 40, totalBytes: 100 });
    succeed(worker, new Blob());
    await pending;

    expect(onProgress).toHaveBeenCalledWith({ loadedBytes: 40, totalBytes: 100 });
  });

  it('when aborted mid-way, stops the worker and rejects', async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    const pending = removeBackground(new Blob(), { assetBaseUrl: BASE, signal: controller.signal, createWorker: () => worker as unknown as Worker });

    controller.abort();

    await expect(pending).rejects.toThrow('disposed');
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('when already aborted, never starts a worker', async () => {
    const createWorker = jest.fn();
    const signal = AbortSignal.abort();

    const pending = removeBackground(new Blob(), { assetBaseUrl: BASE, signal, createWorker });

    await expect(pending).rejects.toThrow('aborted');
    expect(createWorker).not.toHaveBeenCalled();
  });
});

describe('isBackgroundRemovalDownloaded', () => {
  it('with the model and the runtime cached, is true', async () => {
    cachedUrls([MODEL_URL, WASM_URL]);

    const downloaded = await isBackgroundRemovalDownloaded({ assetBaseUrl: BASE });

    expect(downloaded).toBe(true);
  });

  it('with only the model cached, is false', async () => {
    cachedUrls([MODEL_URL]);

    const downloaded = await isBackgroundRemovalDownloaded({ assetBaseUrl: BASE });

    expect(downloaded).toBe(false);
  });

  it('when the cache cannot be read, is false', async () => {
    Object.assign(globalThis, { caches: { open: () => Promise.resolve({ match: () => Promise.reject(new Error('blocked')) }) } });

    const downloaded = await isBackgroundRemovalDownloaded({ assetBaseUrl: BASE });

    expect(downloaded).toBe(false);
  });
});
