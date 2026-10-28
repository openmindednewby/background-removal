import { ModelKind } from './ModelKind';
import { modelInputSize } from './preprocess';
import type { CutRequest, CutResponse } from './protocol';

const mockCreate = jest.fn();

jest.mock('onnxruntime-web', () => ({
  env: { wasm: {} },
  InferenceSession: { create: (...args: unknown[]) => mockCreate(...args) },
  Tensor: class {},
}));

interface TestScope {
  onmessage: ((event: MessageEvent<CutRequest>) => void) | null;
  postMessage: (message: CutResponse) => void;
  navigator: { gpu?: unknown };
}

class FakeCanvas {
  constructor(public width: number, public height: number) {}

  getContext(): unknown {
    return { drawImage: (): void => {}, putImageData: (): void => {}, getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  }

  convertToBlob(): Promise<Blob> {
    return Promise.resolve(new Blob());
  }
}

const IMAGE = { width: 8, height: 8 };
const INPUT = modelInputSize(ModelKind.Modnet, IMAGE);
const session = { inputNames: ['input'], outputNames: ['output'], run: async () => ({ output: { data: new Float32Array(INPUT.width * INPUT.height) } }) };

function send(scope: TestScope, id: number): Promise<CutResponse> {
  const config = { modelUrl: 'https://host/m.onnx', runtimeBaseUrl: 'https://host/ort/', model: ModelKind.Modnet, preferWebGpu: true };
  const image = { ...IMAGE, close: (): void => {} } as unknown as ImageBitmap;
  return new Promise((resolve) => {
    scope.postMessage = resolve;
    scope.onmessage?.({ data: { id, config, image } } as MessageEvent<CutRequest>);
  });
}

describe('worker onmessage', () => {
  it('with WebGPU failing and WASM loading, downloads the model once across two cuts', async () => {
    const scope: TestScope = { onmessage: null, postMessage: () => {}, navigator: { gpu: {} } };
    const fetchModel = jest.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }));
    Object.assign(globalThis, { self: scope, fetch: fetchModel, OffscreenCanvas: FakeCanvas, ImageData: class {} });
    mockCreate.mockImplementation((_model: unknown, options: { executionProviders: string[] }) =>
      options.executionProviders[0] === 'webgpu' ? Promise.reject(new Error('no adapter')) : Promise.resolve(session));
    jest.isolateModules(() => require('./worker'));
    await send(scope, 1);

    const second = await send(scope, 2);

    expect(second.ok).toBe(true);
    expect(fetchModel).toHaveBeenCalledTimes(1);
  });
});
