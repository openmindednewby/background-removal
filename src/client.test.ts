import { Backend } from './Backend';
import { createBackgroundRemover } from './client';
import type { CutRequest, CutResponse } from './protocol';


class FakeWorker {
  onmessage: ((event: MessageEvent<CutResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  posted: CutRequest[] = [];

  postMessage(request: CutRequest): void {
    this.posted.push(request);
  }

  terminate(): void {}
}

function start(): { worker: FakeWorker; remover: ReturnType<typeof createBackgroundRemover> } {
  const worker = new FakeWorker();
  const remover = createBackgroundRemover({ modelUrl: 'https://host/m.onnx', runtimeBaseUrl: 'https://host/ort/', createWorker: () => worker as unknown as Worker });
  return { worker, remover };
}

function success(id: number): CutResponse {
  return { id, ok: true, png: new Blob(), mask: new Uint8ClampedArray(4), image: new Uint8ClampedArray(16), width: 2, height: 2, backend: Backend.Wasm, elapsedMs: 5 };
}

describe('createBackgroundRemover worker.onerror', () => {
  it('with two cuts pending when the worker crashes, rejects both with the crash message', async () => {
    const { worker, remover } = start();
    const first = remover.removeBackground(new Blob());
    const second = remover.removeBackground(new Blob());

    worker.onerror?.({ message: 'wasm trap' } as ErrorEvent);

    await expect(first).rejects.toThrow('wasm trap');
    await expect(second).rejects.toThrow('wasm trap');
  });
});

describe('createBackgroundRemover worker.onmessageerror', () => {
  it('with a cut pending when a reply cannot be deserialised, rejects the cut', async () => {
    const { worker, remover } = start();
    const cut = remover.removeBackground(new Blob());

    worker.onmessageerror?.({} as MessageEvent);

    await expect(cut).rejects.toThrow('unreadable');
  });
});

describe('createBackgroundRemover worker.onmessage', () => {
  it('with one cut failing and another succeeding, rejects only the failed cut and resolves the other', async () => {
    const { worker, remover } = start();
    const failed = remover.removeBackground(new Blob());
    const kept = remover.removeBackground(new Blob());

    worker.onmessage?.({ data: { id: 1, ok: false, error: 'bad image' } } as MessageEvent<CutResponse>);
    worker.onmessage?.({ data: success(2) } as MessageEvent<CutResponse>);

    await expect(failed).rejects.toThrow('bad image');
    await expect(kept).resolves.toMatchObject({ backend: Backend.Wasm, elapsedMs: 5 });
  });
});
