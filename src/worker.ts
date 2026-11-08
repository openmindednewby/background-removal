import * as ort from 'onnxruntime-web';
import { evictOtherAssets, loadAsset } from './assetStore';
import { Backend } from './Backend';
import { applyAlpha, normalizeMatte, resizeMatte } from './postprocess';
import { modelInputSize, toInputTensor } from './preprocess';
import type { CutRequest, CutResponse, WorkerConfig, WorkerMessage } from './protocol';
import type { Size } from './types';

const RGB_CHANNELS = 3;
const PROGRESS_STEP_BYTES = 524_288;

interface WorkerScope {
  onmessage: ((event: MessageEvent<CutRequest>) => void) | null;
  postMessage(message: WorkerMessage, transfer?: Transferable[]): void;
  navigator: { gpu?: unknown };
}

interface LoadedSession {
  session: ort.InferenceSession;
  backend: Backend;
}

const scope = self as unknown as WorkerScope;
let loaded: Promise<LoadedSession> | undefined;

async function createWasmSession(model: Uint8Array): Promise<LoadedSession> {
  const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
  return { session, backend: Backend.Wasm };
}

async function loadAssets(config: WorkerConfig, id: number): Promise<Uint8Array<ArrayBuffer>> {
  let loadedBytes = 0;
  let reportedBytes = 0;
  const onBytes = (count: number): void => {
    loadedBytes += count;
    if (loadedBytes - reportedBytes >= PROGRESS_STEP_BYTES) {
      reportedBytes = loadedBytes;
      scope.postMessage({ id, loadedBytes, totalBytes: config.downloadBytes });
    }
  };
  const model = await loadAsset(config.modelUrl, onBytes);
  if (config.runtimeWasmUrl !== undefined) {
    ort.env.wasm.wasmBinary = await loadAsset(config.runtimeWasmUrl, onBytes);
  }
  if (loadedBytes > 0) {
    await evictOtherAssets(config.runtimeWasmUrl === undefined ? [config.modelUrl] : [config.modelUrl, config.runtimeWasmUrl]).catch(() => undefined);
    scope.postMessage({ id, loadedBytes, totalBytes: loadedBytes });
  }
  return model;
}

async function createSession(config: WorkerConfig, id: number): Promise<LoadedSession> {
  ort.env.wasm.wasmPaths = config.runtimeBaseUrl;
  const model = await loadAssets(config, id);
  if (config.preferWebGpu && scope.navigator.gpu !== undefined) {
    try {
      const session = await ort.InferenceSession.create(model, { executionProviders: ['webgpu'] });
      return { session, backend: Backend.WebGpu };
    } catch {
      return createWasmSession(model);
    }
  }
  return createWasmSession(model);
}

function drawPixels(bitmap: ImageBitmap, size: Size): Uint8ClampedArray<ArrayBuffer> {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2d context unavailable');
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return context.getImageData(0, 0, size.width, size.height).data;
}

async function encodePng(rgba: Uint8ClampedArray<ArrayBuffer>, size: Size): Promise<Blob> {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2d context unavailable');
  }
  context.putImageData(new ImageData(rgba, size.width, size.height), 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

async function predictMask(loadedSession: LoadedSession, config: WorkerConfig, bitmap: ImageBitmap): Promise<Uint8ClampedArray> {
  const { session } = loadedSession;
  const size = { width: bitmap.width, height: bitmap.height };
  const inputSize = modelInputSize(config.model, size);
  const input = toInputTensor(config.model, drawPixels(bitmap, inputSize), inputSize);
  const tensor = new ort.Tensor('float32', input, [1, RGB_CHANNELS, inputSize.height, inputSize.width]);
  const outputs = await session.run({ [session.inputNames[0] ?? 'input']: tensor });
  const output = outputs[session.outputNames[0] ?? 'output'];
  if (output === undefined) {
    throw new Error('model returned no output');
  }
  return resizeMatte(normalizeMatte(config.model, output.data as Float32Array), inputSize, size);
}

async function cut(request: CutRequest): Promise<CutResponse> {
  const started = performance.now();
  loaded ??= createSession(request.config, request.id);
  const loadedSession = await loaded;
  const bitmap = request.image instanceof Blob ? await createImageBitmap(request.image) : request.image;
  const size = { width: bitmap.width, height: bitmap.height };
  const mask = new Uint8ClampedArray(await predictMask(loadedSession, request.config, bitmap));
  const image = drawPixels(bitmap, size);
  const png = await encodePng(applyAlpha(image, mask), size);
  bitmap.close();
  const elapsedMs = performance.now() - started;
  return { id: request.id, ok: true, png, mask, image, ...size, backend: loadedSession.backend, elapsedMs };
}

scope.onmessage = (event: MessageEvent<CutRequest>): void => {
  cut(event.data).then(
    (response) => scope.postMessage(response, response.ok ? [response.mask.buffer, response.image.buffer] : []),
    (error: unknown) => {
      loaded = undefined;
      scope.postMessage({ id: event.data.id, ok: false, error: error instanceof Error ? error.message : String(error) });
    },
  );
};
